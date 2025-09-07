/**
 * StarChartsUI - User interface for the Star Charts discovery system
 * 
 * This class provides:
 * - Fog of war visualization with discovered objects
 * - Identical controls to Long Range Scanner for familiarity
 * - Object selection and targeting integration
 * - Zoom levels and navigation
 * - Discovery state visualization
 * 
 * Phase 0 Implementation: A0 sector with LRS-compatible interface
 */

import * as THREE from 'three';
import { VIEW_TYPES } from './ViewManager.js';

export class StarChartsUI {
    constructor(viewManager, starChartsManager) {
        this.viewManager = viewManager;
        this.starChartsManager = starChartsManager;
        this._isVisible = false;
        
        // Zoom and navigation state
        this.currentZoomLevel = 1;
        this.maxZoomLevel = 8; // Increased from 3 to 8 for more detailed exploration
        // Extended zoom levels for detailed exploration
        this.zoomLevels = {
            overview: 1,
            close: 2,
            detail: 3,
            fine: 4,
            micro: 5,
            ultra: 6,
            extreme: 7,
            maximum: 8
        };
        this.currentCenter = { x: 0, y: 0 };
        this.lastClickedObject = null;
        
        // Default view settings
        this.defaultViewBox = {
            width: 1000,
            height: 1000,
            x: -500,
            y: -500
        };
        
        // Create UI elements
        this.createInterface();
        this.setupEventListeners();
        
        console.log('🗺️  StarChartsUI: Interface created');
    }
    
    createInterface() {
        // Create the Star Charts interface elements
        
        // Create the modal container - reuse LRS classes and visibility behavior
        this.container = document.createElement('div');
        this.container.className = 'long-range-scanner star-charts-scanner';
        
        // Create the close button
        this.closeButton = document.createElement('div');
        this.closeButton.innerHTML = 'X';
        this.closeButton.className = 'close-button';
        // Styling inherited from shared CSS; keep minimal inline overrides only if needed
        this.container.appendChild(this.closeButton);
        
        // Create title
        this.title = document.createElement('div');
        this.title.className = 'star-charts-title';
        this.title.innerHTML = 'STAR CHARTS - NAVIGATION DATABASE';
        // Title follows shared container layout
        this.container.appendChild(this.title);
        
        // Create main content wrapper
        this.contentWrapper = document.createElement('div');
        this.contentWrapper.className = 'scanner-content-wrapper';
        this.container.appendChild(this.contentWrapper);
        
        // Create the scanner map container
        this.mapContainer = document.createElement('div');
        this.mapContainer.className = 'scanner-map-container';
        this.contentWrapper.appendChild(this.mapContainer);
        
        // Create SVG for rendering
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.style.cssText = `width: 100%; height: 100%; cursor: default;`; // Match LRS default cursor
        this.mapContainer.appendChild(this.svg);
        
        // Create details panel
        this.detailsPanel = document.createElement('div');
        this.detailsPanel.className = 'scanner-details';
        this.container.appendChild(this.detailsPanel);
        
        // Create status bar
        // Optional status bar is omitted in LRS; retain internally without layout impact
        this.statusBar = document.createElement('div');
        this.statusBar.className = 'star-charts-status';
        
        // Create tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'scanner-tooltip';
        this.tooltip.style.display = 'none';
        document.body.appendChild(this.tooltip);
        
        // Add to document
        document.body.appendChild(this.container);
    }
    
    setupEventListeners() {
        // Setup event listeners for interaction
        
        // Close button
        this.closeButton.addEventListener('click', () => {
            this.viewManager.restorePreviousView();
            this.hide(false);
        });
        
        // Keyboard controls (C key for Star Charts)
        document.addEventListener('keydown', (event) => {
            if (this.container.classList.contains('visible')) {
                const key = event.key.toLowerCase();
                if (key === 'c' || key === 'escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    this.viewManager.restorePreviousView();
                } else if (key === 'a') {
                    event.preventDefault();
                    event.stopPropagation();
                    this.viewManager.setView(VIEW_TYPES.AFT);
                } else if (key === 'f') {
                    event.preventDefault();
                    event.stopPropagation();
                    this.viewManager.setView(VIEW_TYPES.FORE);
                }
                // Removed B key behavior for new zoom model
            }
        });
        
        // Container click handling for debugging
        this.container.addEventListener('click', (event) => {
            console.log('🔥 CONTAINER CLICK DETECTED!', event.target);
        });
        
        // SVG click handling
        this.svg.addEventListener('click', (event) => {
            console.log('🔥 SVG CLICK DETECTED!', event);
            this.handleMapClick(event);
        });
        
        // Double-click behavior removed for new zoom model
        
        // Pan/drag functionality
        this.setupPanControls();
        
        // Mouse move for tooltips
        this.svg.addEventListener('mousemove', (event) => {
            this.handleMouseMove(event);
        });
        
        this.svg.addEventListener('mouseleave', () => {
            this.tooltip.style.display = 'none';
        });
    }
    
    handleMapClick(event) {
        // Handle clicks on the map - match LRS click detection exactly
        
        // Don't process clicks if we just finished dragging
        if (this.panState && this.panState.isDragging) {
            return;
        }
        
        // Add small delay to prevent double-click interference (match LRS)
        setTimeout(() => {
            const clickedElement = document.elementFromPoint(event.clientX, event.clientY);
            console.log(`🔍 Star Charts Click: element=${clickedElement?.tagName || 'null'}, classes=[${clickedElement?.className || 'none'}], zoomLevel=${this.currentZoomLevel}`);
            
            if (!clickedElement) {
                console.log(`🔍 Star Charts: No element found at click position`);
                return;
            }
            
            // Check if clicked element is interactive (match LRS logic)
            const isInteractiveElement = clickedElement !== this.svg && (
                clickedElement.hasAttribute('data-object-id') ||
                clickedElement.classList.contains('scanner-star') ||
                clickedElement.classList.contains('scanner-planet') ||
                clickedElement.classList.contains('scanner-moon') ||
                clickedElement.classList.contains('scanner-moon-hitbox') ||
                clickedElement.classList.contains('scanner-station') ||
                clickedElement.classList.contains('scanner-beacon') ||
                clickedElement.hasAttribute('data-name') // Any element with targeting data
            );
            
            console.log(`🔍 Star Charts: isInteractiveElement=${isInteractiveElement}`);
            
            if (isInteractiveElement) {
                const objectId = clickedElement.getAttribute('data-object-id') || 
                               clickedElement.getAttribute('data-name');
                console.log(`🔍 Star Charts: Found objectId=${objectId}`);
                
                if (objectId) {
                    const objectData = this.starChartsManager.getObjectData(objectId) || 
                                     this.findObjectByName(objectId);
                    console.log(`🔍 Star Charts: Found objectData:`, objectData?.name || 'null');
                    
                    if (objectData) {
                        console.log(`🔍 Star Charts: Clicked interactive element, selecting object ${objectData.name}`);
                        this.selectObject(objectData);
                    } else {
                        console.log(`🔍 Star Charts: No object data found for ID: ${objectId}`);
                    }
                } else {
                    console.log(`🔍 Star Charts: Interactive element has no object ID`);
                }
            } else {
                console.log(`🔍 Star Charts: Clicked empty space, zooming out`);
                this.zoomOut();
            }
        }, 50); // Match LRS delay
    }
    
    handleMouseMove(event) {
        // Handle mouse movement for tooltips
        
        const rect = this.svg.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const worldPos = this.screenToWorld(x, y);
        const hoveredObject = this.getObjectAtPosition(worldPos.x, worldPos.y);
        
        if (hoveredObject) {
            this.showTooltip(event.clientX, event.clientY, hoveredObject);
        } else {
            this.tooltip.style.display = 'none';
        }
    }
    
    setupPanControls() {
        // Add pan/drag functionality for manual recentering
        
        // Pan state
        this.panState = {
            isDragging: false,
            isTouchDragging: false,
            lastMousePos: { x: 0, y: 0 },
            lastTouchCenter: { x: 0, y: 0 },
            startCenter: { x: 0, y: 0 }
        };
        
        // Mouse drag events
        this.svg.addEventListener('mousedown', (event) => {
            // Only start drag on primary button (left click)
            if (event.button === 0) {
                this.startMouseDrag(event);
            }
        });
        
        document.addEventListener('mousemove', (event) => {
            if (this.panState.isDragging) {
                this.handleMouseDrag(event);
            }
        });
        
        document.addEventListener('mouseup', (event) => {
            if (this.panState.isDragging) {
                this.endMouseDrag(event);
            }
        });
        
        // Touch drag events (two-finger drag)
        this.svg.addEventListener('touchstart', (event) => {
            if (event.touches.length === 2) {
                this.startTouchDrag(event);
            }
        });
        
        this.svg.addEventListener('touchmove', (event) => {
            if (this.panState.isTouchDragging && event.touches.length === 2) {
                this.handleTouchDrag(event);
            }
        });
        
        this.svg.addEventListener('touchend', (event) => {
            if (this.panState.isTouchDragging) {
                this.endTouchDrag(event);
            }
        });
        
        // Prevent default touch behaviors that might interfere
        this.svg.addEventListener('touchstart', (event) => {
            if (event.touches.length === 2) {
                event.preventDefault();
            }
        }, { passive: false });
        
        this.svg.addEventListener('touchmove', (event) => {
            if (event.touches.length === 2) {
                event.preventDefault();
            }
        }, { passive: false });
    }
    
    startMouseDrag(event) {
        // Start mouse drag operation
        this.panState.isDragging = true;
        this.panState.lastMousePos = { x: event.clientX, y: event.clientY };
        this.panState.startCenter = { ...this.currentCenter };
        
        // Change cursor to indicate dragging
        this.svg.style.cursor = 'grabbing';
        this.mapContainer.classList.add('dragging');
        
        // Prevent text selection during drag
        event.preventDefault();
        
        console.log('🖱️ Star Charts: Started mouse drag');
    }
    
    handleMouseDrag(event) {
        // Handle mouse drag movement
        if (!this.panState.isDragging) return;
        
        const deltaX = event.clientX - this.panState.lastMousePos.x;
        const deltaY = event.clientY - this.panState.lastMousePos.y;
        
        // Convert screen delta to world coordinates
        const worldDelta = this.screenDeltaToWorldDelta(deltaX, deltaY);
        
        // Update center (subtract because we're moving the view, not the content)
        this.currentCenter.x -= worldDelta.x;
        this.currentCenter.y -= worldDelta.y;
        
        // Update last position
        this.panState.lastMousePos = { x: event.clientX, y: event.clientY };
        
        // Re-render with new center
        this.setupCoordinateSystem();
        
        console.log(`🖱️ Star Charts: Dragging to center (${this.currentCenter.x.toFixed(1)}, ${this.currentCenter.y.toFixed(1)})`);
    }
    
    endMouseDrag(event) {
        // End mouse drag operation
        this.panState.isDragging = false;
        
        // Restore cursor
        this.svg.style.cursor = 'default';
        this.mapContainer.classList.remove('dragging');
        
        console.log('🖱️ Star Charts: Ended mouse drag');
    }
    
    startTouchDrag(event) {
        // Start two-finger touch drag
        if (event.touches.length !== 2) return;
        
        this.panState.isTouchDragging = true;
        
        // Calculate center point of two touches
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        
        this.panState.lastTouchCenter = { x: centerX, y: centerY };
        this.panState.startCenter = { ...this.currentCenter };
        
        console.log('👆 Star Charts: Started two-finger drag');
    }
    
    handleTouchDrag(event) {
        // Handle two-finger touch drag movement
        if (!this.panState.isTouchDragging || event.touches.length !== 2) return;
        
        // Calculate new center point of two touches
        const touch1 = event.touches[0];
        const touch2 = event.touches[1];
        const centerX = (touch1.clientX + touch2.clientX) / 2;
        const centerY = (touch1.clientY + touch2.clientY) / 2;
        
        const deltaX = centerX - this.panState.lastTouchCenter.x;
        const deltaY = centerY - this.panState.lastTouchCenter.y;
        
        // Convert screen delta to world coordinates
        const worldDelta = this.screenDeltaToWorldDelta(deltaX, deltaY);
        
        // Update center (subtract because we're moving the view, not the content)
        this.currentCenter.x -= worldDelta.x;
        this.currentCenter.y -= worldDelta.y;
        
        // Update last position
        this.panState.lastTouchCenter = { x: centerX, y: centerY };
        
        // Re-render with new center
        this.setupCoordinateSystem();
        
        console.log(`👆 Star Charts: Touch dragging to center (${this.currentCenter.x.toFixed(1)}, ${this.currentCenter.y.toFixed(1)})`);
    }
    
    endTouchDrag(event) {
        // End two-finger touch drag
        this.panState.isTouchDragging = false;
        
        console.log('👆 Star Charts: Ended two-finger drag');
    }
    
    screenDeltaToWorldDelta(screenDeltaX, screenDeltaY) {
        // Convert screen pixel delta to world coordinate delta
        
        // Get current viewBox dimensions
        const viewBox = this.svg.getAttribute('viewBox');
        if (!viewBox) return { x: 0, y: 0 };
        
        const [vbX, vbY, vbW, vbH] = viewBox.split(' ').map(Number);
        
        // Get SVG element dimensions
        const svgRect = this.svg.getBoundingClientRect();
        
        // Calculate world units per screen pixel
        const worldPerPixelX = vbW / svgRect.width;
        const worldPerPixelY = vbH / svgRect.height;
        
        return {
            x: screenDeltaX * worldPerPixelX,
            y: screenDeltaY * worldPerPixelY
        };
    }
    
    screenPixelsToWorldUnits(screenPixels) {
        // Convert screen pixels to world units (for tolerance calculations)
        
        // Get current viewBox dimensions
        const viewBox = this.svg.getAttribute('viewBox');
        if (!viewBox) return screenPixels;
        
        const [vbX, vbY, vbW, vbH] = viewBox.split(' ').map(Number);
        
        // Get SVG element dimensions
        const svgRect = this.svg.getBoundingClientRect();
        
        // Calculate world units per screen pixel (use average of X and Y)
        const worldPerPixelX = vbW / svgRect.width;
        const worldPerPixelY = vbH / svgRect.height;
        const worldPerPixel = (worldPerPixelX + worldPerPixelY) / 2;
        
        return screenPixels * worldPerPixel;
    }
    
    selectObject(object) {
        // NEW BEHAVIOR: Always center and zoom in to object unless at max zoom (then only center)
        
        console.log(`🔍 Star Charts: selectObject called - objectName: ${object.name}, currentZoom: ${this.currentZoomLevel}`);
        
        this.lastClickedObject = object;
        
        // Show object details
        this.showObjectDetails(object);
        
        // Always center on clicked object
        const pos = this.getDisplayPosition(object);
        this.currentCenter = { 
            x: isNaN(pos.x) ? 0 : pos.x,
            y: isNaN(pos.y) ? 0 : pos.y
        };
        
        // Zoom in unless already at max zoom
        if (this.currentZoomLevel < this.maxZoomLevel) {
            this.currentZoomLevel++;
            console.log(`🔍 Star Charts: Zoomed in to level ${this.currentZoomLevel}, centered on ${object.name} at (${this.currentCenter.x}, ${this.currentCenter.y})`);
        } else {
            console.log(`🔍 Star Charts: At max zoom (${this.currentZoomLevel}), only centering on ${object.name} at (${this.currentCenter.x}, ${this.currentCenter.y})`);
        }
        
        // Integrate with Target Computer
        console.log(`🎯 Star Charts: About to call selectObjectById for ${object.name} (${object.id})`);
        const targetingSuccess = this.starChartsManager.selectObjectById(object.id);
        console.log(`🎯 Star Charts: selectObjectById result: ${targetingSuccess} for ${object.name}`);
        
        if (targetingSuccess) {
            console.log(`🎯 Star Charts: Successfully selected ${object.name} for targeting`);
        } else {
            console.log(`🎯 Star Charts: Failed to select ${object.name} for targeting`);
        }
        
        this.render();
    }
    
    zoomOut() {
        // NEW BEHAVIOR: Zoom out one level maintaining center on previous object or star
        console.log(`🔍 Star Charts: Empty space clicked, zooming out from level ${this.currentZoomLevel}`);
        
        if (this.currentZoomLevel > 1) {
            // Step down zoom level by 1 (3→2→1)
            this.currentZoomLevel--;
            
            // Maintain center on the last clicked object, or fallback to star if no object
            let centerObject = this.lastClickedObject;
            if (!centerObject) {
                centerObject = this.findCurrentSystemStar();
            }
            
            if (centerObject) {
                const pos = this.getDisplayPosition(centerObject);
                this.currentCenter = { 
                    x: isNaN(pos.x) ? 0 : pos.x,
                    y: isNaN(pos.y) ? 0 : pos.y
                };
                console.log(`🔍 Star Charts: Zoomed out to level ${this.currentZoomLevel}, maintaining center on ${centerObject.name} at (${this.currentCenter.x}, ${this.currentCenter.y})`);
            } else {
                // Fallback to origin if no object found
                this.currentCenter = { x: 0, y: 0 };
                console.log(`🔍 Star Charts: Zoomed out to level ${this.currentZoomLevel}, centered at origin (no object to maintain center on)`);
            }
        } else {
            // At minimum zoom level - don't zoom out further
            console.log(`🔍 Star Charts: Already at minimum zoom level ${this.currentZoomLevel}, not zooming out further`);
        }
        
        this.render();
    }
    
    screenToWorld(screenX, screenY) {
        // Convert screen coordinates to world coordinates
        
        const rect = this.svg.getBoundingClientRect();
        const svgWidth = rect.width;
        const svgHeight = rect.height;
        
        // Calculate world bounds based on zoom level
        const worldSize = this.getWorldSize();
        const worldX = (screenX / svgWidth - 0.5) * worldSize + this.currentCenter.x;
        const worldY = (screenY / svgHeight - 0.5) * worldSize + this.currentCenter.y;
        
        return { x: worldX, y: worldY };
    }
    
    getWorldSize() {
        // Get world size based on zoom level
        
        // Mimic LRS scaling by adjusting base size from discovery range
        let baseSize = 1000;
        try {
            const range = this.starChartsManager.getDiscoveryRadius?.() || 150;
            const rangeMultiplier = Math.max(0.5, Math.min(2.0, range / 150));
            baseSize = 1000 * rangeMultiplier;
        } catch (e) {}
        return baseSize / this.currentZoomLevel;
    }
    
    getObjectAtPosition(worldX, worldY, screenTolerancePixels = 12) {
        // Get object at world position with zoom-aware tolerance
        
        const discoveredObjects = this.getDiscoveredObjectsForRender();
        
        // Convert screen tolerance to world coordinates based on current zoom
        const worldTolerance = this.screenPixelsToWorldUnits(screenTolerancePixels);
        
        for (const object of discoveredObjects) {
            const pos = this.getDisplayPosition(object);
            const dx = pos.x - worldX;
            const dy = pos.y - worldY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const objectRadius = this.getObjectDisplayRadius(object);
            if (distance <= objectRadius + worldTolerance) {
                return object;
            }
        }
        
        return null;
    }
    
    showTooltip(screenX, screenY, object) {
        // Show tooltip for hovered object - match LRS simple text format
        
        // Simple text tooltip like LRS (no HTML formatting)
        this.tooltip.textContent = object.name;
        
        // Position tooltip at cursor like LRS
        this.tooltip.style.left = screenX + 'px';
        this.tooltip.style.top = screenY + 'px';
        this.tooltip.style.display = 'block';
    }
    
    showObjectDetails(object) {
        // Show detailed information about selected object
        
        let detailsHTML = `
            <div class="object-details">
                <h3 style="color: #00ff00; margin-top: 0;">${object.name}</h3>
                <div><strong>Type:</strong> ${object.type}</div>
                <div><strong>Class:</strong> ${object.class || 'Unknown'}</div>
        `;
        
        // Add position info (robust for DB cartesian, polar, or normalized positions)
        try {
            let posBlock = '';
            if (Array.isArray(object.position) && object.position.length >= 3 &&
                typeof object.position[0] === 'number') {
                posBlock = `
                    X: ${object.position[0].toFixed(1)}<br>
                    Y: ${object.position[1].toFixed(1)}<br>
                    Z: ${object.position[2].toFixed(1)}
                `;
            } else if (Array.isArray(object.position) && object.position.length === 2 &&
                       typeof object.position[0] === 'number') {
                const radiusAU = object.position[0];
                const angleDeg = object.position[1];
                posBlock = `
                    Radius (AU): ${radiusAU.toFixed(3)}<br>
                    Angle: ${angleDeg.toFixed(1)}°
                `;
            } else {
                // Use normalized display position (top-down X/Z)
                const p = this.getDisplayPosition(object);
                posBlock = `
                    X: ${p.x.toFixed(1)}<br>
                    Z: ${p.y.toFixed(1)}
                `;
            }
            detailsHTML += `
                <div><strong>Position:</strong></div>
                <div style="margin-left: 10px;">${posBlock}</div>
            `;
        } catch (e) {}
        
        // Add orbit info for celestial bodies
        if (object.orbit) {
            detailsHTML += `
                <div><strong>Orbital Data:</strong></div>
                <div style="margin-left: 10px;">
                    Parent: ${object.orbit.parent}<br>
                    Radius: ${object.orbit.radius.toFixed(1)} km<br>
                    Period: ${object.orbit.period.toFixed(1)} days
                </div>
            `;
        }
        
        // Add station-specific info
        if (object.faction) {
            detailsHTML += `<div><strong>Faction:</strong> ${object.faction}</div>`;
        }
        
        if (object.services && object.services.length > 0) {
            detailsHTML += `
                <div><strong>Services:</strong></div>
                <div style="margin-left: 10px;">
                    ${object.services.join('<br>')}
                </div>
            `;
        }
        
        // Add description
        if (object.description) {
            detailsHTML += `
                <div style="margin-top: 10px;">
                    <strong>Description:</strong><br>
                    <em>${object.description}</em>
                </div>
            `;
        }
        
        // Add intel brief for stations
        if (object.intel_brief) {
            detailsHTML += `
                <div style="margin-top: 10px; color: #ffff00;">
                    <strong>Intel Brief:</strong><br>
                    <em>${object.intel_brief}</em>
                </div>
            `;
        }
        
        detailsHTML += '</div>';
        
        this.detailsPanel.innerHTML = detailsHTML;
    }
    
    show() {
        // Show the Star Charts interface
        
        if (!this._isVisible) {
            this._isVisible = true;
            this.container.classList.add('visible');
            
            // Open at zoom level 0.8 to ensure all beacons at radius 350 are visible
            this.currentZoomLevel = 0.8;
            
            // Find and center on the star of the current solar system
            const star = this.findCurrentSystemStar();
            if (star) {
                const starPos = this.getDisplayPosition(star);
                this.currentCenter = { 
                    x: isNaN(starPos.x) ? 0 : starPos.x, 
                    y: isNaN(starPos.y) ? 0 : starPos.y 
                };
                this.lastClickedObject = star; // Remember star as the initially selected object
                console.log(`🔍 Star Charts: Opening at zoom level ${this.currentZoomLevel}, centered on star ${star.name} at (${this.currentCenter.x}, ${this.currentCenter.y})`);
            } else {
                // Fallback if no star found
                this.currentCenter = { x: 0, y: 0 };
                this.lastClickedObject = null;
                console.log(`🔍 Star Charts: Opening at zoom level ${this.currentZoomLevel}, no star found - centered at origin`);
            }
            
            // Clear details panel
            this.detailsPanel.innerHTML = `
                <div style="text-align: center; color: #666; margin-top: 50px;">
                    <div>Click on discovered objects</div>
                    <div>to view details and target</div>
                    <br>
                    <div>Click empty space to zoom out</div>
                    <div>Double-click for beacon ring view</div>
                </div>
            `;
            
            // Update targeting-active class
            if (this.viewManager.starfieldManager?.targetComputerEnabled) {
                this.container.classList.add('targeting-active');
            } else {
                this.container.classList.remove('targeting-active');
            }
            
            // Render the map
            this.render();
            
            console.log('🗺️  Star Charts: Interface shown');
        }
    }
    
    hide(restoreView = true) {
        // Hide the Star Charts interface
        
        if (this._isVisible) {
            this._isVisible = false;
            this.container.classList.remove('visible');
            this.container.classList.remove('targeting-active');
            this.tooltip.style.display = 'none';
            
            console.log('🗺️  Star Charts: Interface hidden');
        }
    }
    
    render() {
        // Render the Star Charts map
        
        if (!this._isVisible || !this.starChartsManager.isEnabled()) {
            return;
        }
        
        // Clear SVG
        this.svg.innerHTML = '';
        
        // Build a display model that mirrors LRS ring layout (planets normalized to rings)
        this.buildDisplayModel();

        // Set up coordinate system
        this.setupCoordinateSystem();
        
        // Render discovered objects
        this.renderDiscoveredObjects();
        // Draw dedicated beacon ring like LRS when beacons exist
        this.renderBeaconRingIfNeeded();
        
        // Render virtual waypoints
        this.renderVirtualWaypoints();
        
        // Update status bar
        this.updateStatusBar();
    }

    // Build normalized ring model to match LRS visual layout
    buildDisplayModel() {
        this.displayModel = {
            planetOrder: [],
            ringRadii: [],
            positions: new Map(), // id -> {x,y}
            moonOffsets: new Map() // id -> radius
        };
        const ssm = this.getSolarSystemManagerRef();
        const sectorId = this.starChartsManager.getCurrentSector();
        const sectorData = this.starChartsManager.objectDatabase?.sectors[sectorId];
        if (!sectorData) return;

        // 0) Set star position at origin (0,0) - center of coordinate system
        if (sectorData.star) {
            this.displayModel.positions.set(sectorData.star.id, { x: 0, y: 0 });
        }

        // 1) Determine planet order by starSystem.planets order (matches LRS rings)
        const lrsPlanets = (ssm && ssm.starSystem && Array.isArray(ssm.starSystem.planets))
            ? ssm.starSystem.planets
            : [];

        // 2) Create ring radii like LRS (100, 250, 400, ...)
        const base = 100;
        const step = 150;
        lrsPlanets.forEach((p, i) => {
            const ring = base + i * step;
            this.displayModel.ringRadii.push(ring);
            // Find DB object to get ID for consistent selection/labels
            const planetDb = (sectorData.objects || []).find(o => o.type === 'planet' && o.name === p.planet_name) || null;
            const planetId = planetDb?.id || `planet_${i}`;
            this.displayModel.planetOrder.push(planetId);
            const angleDeg = (() => {
                if (ssm && ssm.celestialBodies) {
                    const body = ssm.celestialBodies.get(`planet_${i}`);
                    if (body && body.position) {
                        const pos = body.position;
                        return (Math.atan2(pos.z, pos.x) * 180) / Math.PI;
                    }
                }
                return this.getLiveAngleDegForPlanet(planetDb || p);
            })();
            const angleRad = angleDeg * Math.PI / 180;
            const x = ring * Math.cos(angleRad);
            const y = ring * Math.sin(angleRad);
            this.displayModel.positions.set(planetId, { x, y });
        });

        // 3) Moons: place around their parent planet using small local rings
        if (ssm && ssm.celestialBodies) {
            // For each planet index, place its moons by keys moon_i_j
            lrsPlanets.forEach((_, i) => {
                const parentId = this.displayModel.planetOrder[i] || `planet_${i}`;
                const parentPos = this.displayModel.positions.get(parentId) || { x: 0, y: 0 };
                
                // Find the actual planet object to get all possible IDs
                const planetDb = (sectorData.objects || []).find(o => o.type === 'planet' && o.name === lrsPlanets[i]?.planet_name);
                const possibleParentIds = [parentId];
                if (planetDb && planetDb.id !== parentId) {
                    possibleParentIds.push(planetDb.id);
                }
                
                // Collect moons for this planet from DB by parent id match (check all possible IDs)
                const dbMoons = (sectorData.objects || []).filter(o => 
                    o.type === 'moon' && 
                    o.orbit?.parent && 
                    possibleParentIds.includes(o.orbit.parent)
                );
                if (dbMoons.length > 0) {
                    dbMoons.sort((a, b) => (a.orbit?.radius || 0) - (b.orbit?.radius || 0));
                    dbMoons.forEach((m, idx) => {
                        const localR = 30 + idx * 15;
                        const angleDeg = this.getLiveAngleDegForMoon(m, parentId);
                        const angleRad = angleDeg * Math.PI / 180;
                        const x = parentPos.x + localR * Math.cos(angleRad);
                        const y = parentPos.y + localR * Math.sin(angleRad);
                        this.displayModel.positions.set(m.id, { x, y });
                        this.displayModel.moonOffsets.set(m.id, localR);
                    });
                } else {
                    // Fallback to SSM moon keys moon_i_j up to some count
                    for (let j = 0; j < 6; j++) {
                        const moonKey = `moon_${i}_${j}`;
                        const moonBody = ssm.celestialBodies.get(moonKey);
                        if (!moonBody) break;
                        const localR = 30 + j * 15;
                        const rel = moonBody.position.clone();
                        const parentBody = ssm.celestialBodies.get(`planet_${i}`);
                        if (parentBody) rel.sub(parentBody.position);
                        const angleDeg = (Math.atan2(rel.z, rel.x) * 180) / Math.PI;
                        const angleRad = angleDeg * Math.PI / 180;
                        const x = parentPos.x + localR * Math.cos(angleRad);
                        const y = parentPos.y + localR * Math.sin(angleRad);
                        const syntheticId = `${moonKey}`;
                        this.displayModel.positions.set(syntheticId, { x, y });
                        this.displayModel.moonOffsets.set(syntheticId, localR);
                    }
                }
            });
        }

        // 4) Infrastructure: snap to nearest planet ring by polar coords [AU, deg]
        const infra = sectorData.infrastructure || {};
        const stations = infra.stations || [];
        const beacons = infra.beacons || [];
        const AU_TO_DISPLAY = 149.6;
        const snapToNearestRing = (radiusDisplay, isStation = false) => {
            if (this.displayModel.ringRadii.length === 0) return radiusDisplay;
            const nearestRing = this.displayModel.ringRadii.reduce((best, r) => (
                Math.abs(r - radiusDisplay) < Math.abs(best - radiusDisplay) ? r : best
            ), this.displayModel.ringRadii[0]);
            
            // Add offset for stations to prevent overlap with planets
            if (isStation) {
                return nearestRing + 25; // Offset stations 25 units outward from planet ring
            }
            return nearestRing;
        };
        const placePolar = (obj) => {
            // Prefer live angle if available by matching body name to SSM
            const liveAngle = this.getLiveAngleDegByName(obj.name);
            if (typeof liveAngle === 'number') {
                // Snap to nearest ring or force beacon ring
                const isBeacon = (obj.type === 'navigation_beacon');
                const isStation = (obj.type === 'space_station');
                const rDisplayGuess = Array.isArray(obj.position) && obj.position.length === 2 ? (obj.position[0] * AU_TO_DISPLAY) : 300;
                const ring = isBeacon && this.displayModel.beaconRing ? this.displayModel.beaconRing : snapToNearestRing(rDisplayGuess, isStation);
                const rad = liveAngle * Math.PI / 180;
                const x = ring * Math.cos(rad);
                const y = ring * Math.sin(rad);
                this.displayModel.positions.set(obj.id, { x, y });
                return;
            }
            // Handle static/polar data
            const isBeacon = (obj.type === 'navigation_beacon');
            if (Array.isArray(obj.position) && obj.position.length === 2) {
                const rDisplay = isBeacon && this.displayModel.beaconRing ? this.displayModel.beaconRing : (obj.position[0] * AU_TO_DISPLAY);
                const angleDeg = obj.position[1];
                const ring = isBeacon && this.displayModel.beaconRing ? this.displayModel.beaconRing : snapToNearestRing(rDisplay);
                const angleRad = angleDeg * Math.PI / 180;
                const x = ring * Math.cos(angleRad);
                const y = ring * Math.sin(angleRad);
                this.displayModel.positions.set(obj.id, { x, y });
                return;
            }
            // Fallback for infrastructure with 3D coordinates [x, y, z] (e.g., beacons JSON)
            if (Array.isArray(obj.position) && obj.position.length === 3) {
                const x3 = obj.position[0];
                const y3 = obj.position[1]; // Use Y coordinate for beacons (they're positioned vertically)
                const z3 = obj.position[2];

                // For beacons, calculate angle using y,x (not z,x) since they're arranged in a circle
                const angleDeg = isBeacon
                    ? (Math.atan2(y3, x3) * 180) / Math.PI
                    : (Math.atan2(z3, x3) * 180) / Math.PI;

                const ring = isBeacon && this.displayModel.beaconRing ? this.displayModel.beaconRing : snapToNearestRing(300);
                const angleRad = angleDeg * Math.PI / 180;
                const x = ring * Math.cos(angleRad);
                const y = ring * Math.sin(angleRad);
                this.displayModel.positions.set(obj.id, { x, y });
                return;
            }
            // If no position information, skip
            return;
        };
        
        // 5) Set beacon ring radius BEFORE positioning beacons (stationary ring like LRS)
        this.displayModel.beaconRing = 350;
        
        // Position stations with collision detection
        this.positionStationsWithCollisionDetection(stations, placePolar);
        
        // Position beacons (they have their own dedicated ring, so less collision risk)
        console.log(`🔧 Positioning ${beacons.length} beacons`);
        beacons.forEach(beacon => {
            console.log(`🔧 Positioning beacon: ${beacon.name} (${beacon.id})`);
            placePolar(beacon);
            const pos = this.displayModel.positions.get(beacon.id);
            console.log(`🔧 Beacon ${beacon.name} positioned at:`, pos);
        });
    }
    
    positionStationsWithCollisionDetection(stations, placePolar) {
        // Position stations with collision detection to prevent overlaps
        
        const minSeparationAngle = 15; // Minimum degrees between stations on same ring
        const positionedStations = new Map(); // ring -> array of angles
        
        // Sort stations by priority (prefer live angles, then by name for consistency)
        const sortedStations = [...stations].sort((a, b) => {
            const aHasLive = typeof this.getLiveAngleDegByName(a.name) === 'number';
            const bHasLive = typeof this.getLiveAngleDegByName(b.name) === 'number';
            
            // Prioritize stations with live angles
            if (aHasLive && !bHasLive) return -1;
            if (!aHasLive && bHasLive) return 1;
            
            // Then sort by name for consistency
            return (a.name || a.id || '').localeCompare(b.name || b.id || '');
        });
        
        sortedStations.forEach(station => {
            // Calculate preferred position
            let preferredAngle = null;
            let ring = null;
            
            // Try to get live angle first
            const liveAngle = this.getLiveAngleDegByName(station.name);
            if (typeof liveAngle === 'number') {
                preferredAngle = liveAngle;
                const AU_TO_DISPLAY = 149.6;
                const rDisplayGuess = Array.isArray(station.position) && station.position.length === 2 ? 
                    (station.position[0] * AU_TO_DISPLAY) : 300;
                ring = this.snapToNearestRing(rDisplayGuess, true); // true = isStation
            } else if (Array.isArray(station.position) && station.position.length === 2) {
                preferredAngle = station.position[1]; // angle in degrees
                const AU_TO_DISPLAY = 149.6;
                ring = this.snapToNearestRing(station.position[0] * AU_TO_DISPLAY, true);
            }
            
            if (preferredAngle === null || ring === null) {
                // Fallback: use original placePolar logic
                placePolar(station);
                return;
            }
            
            // Normalize angle to 0-360 range
            preferredAngle = ((preferredAngle % 360) + 360) % 360;
            
            // Check for collisions on this ring
            if (!positionedStations.has(ring)) {
                positionedStations.set(ring, []);
            }
            
            const existingAngles = positionedStations.get(ring);
            let finalAngle = preferredAngle;
            
            // Find a collision-free angle
            let attempts = 0;
            const maxAttempts = 24; // 360/15 = 24 possible positions with 15° separation
            
            while (attempts < maxAttempts) {
                let hasCollision = false;
                
                for (const existingAngle of existingAngles) {
                    const angleDiff = Math.min(
                        Math.abs(finalAngle - existingAngle),
                        360 - Math.abs(finalAngle - existingAngle)
                    );
                    
                    if (angleDiff < minSeparationAngle) {
                        hasCollision = true;
                        break;
                    }
                }
                
                if (!hasCollision) {
                    // Found a good position
                    break;
                }
                
                // Try next position (alternate between + and - offsets)
                attempts++;
                const offset = Math.ceil(attempts / 2) * minSeparationAngle;
                finalAngle = attempts % 2 === 1 ? 
                    (preferredAngle + offset) % 360 : 
                    ((preferredAngle - offset) + 360) % 360;
            }
            
            // Record this position
            existingAngles.push(finalAngle);
            
            // Set the final position
            const angleRad = finalAngle * Math.PI / 180;
            const x = ring * Math.cos(angleRad);
            const y = ring * Math.sin(angleRad);
            this.displayModel.positions.set(station.id, { x, y });
            
            // Log collision resolution if we had to move the station
            if (Math.abs(finalAngle - preferredAngle) > 1) {
                console.log(`🔧 Star Charts: Moved "${station.name}" from ${preferredAngle.toFixed(1)}° to ${finalAngle.toFixed(1)}° to avoid collision`);
            }
        });
    }
    
    snapToNearestRing(radiusDisplay, isStation = false) {
        // Helper method to snap to nearest ring (extracted from buildDisplayModel)
        if (this.displayModel.ringRadii.length === 0) return radiusDisplay;
        const nearestRing = this.displayModel.ringRadii.reduce((best, r) => (
            Math.abs(r - radiusDisplay) < Math.abs(best - radiusDisplay) ? r : best
        ), this.displayModel.ringRadii[0]);
        
        // Add offset for stations to prevent overlap with planets
        if (isStation) {
            return nearestRing + 25; // Offset stations 25 units outward from planet ring
        }
        return nearestRing;
    }

    // Helper: get SolarSystemManager reference
    getSolarSystemManagerRef() {
        try {
            if (this.viewManager && typeof this.viewManager.getSolarSystemManager === 'function') {
                return this.viewManager.getSolarSystemManager();
            }
        } catch (e) {}
        return null;
    }

    // Helper: find body by display name using SolarSystemManager
    findBodyByName(name) {
        const ssm = this.getSolarSystemManagerRef();
        if (!ssm || typeof ssm.getCelestialBodies !== 'function' || typeof ssm.getCelestialBodyInfo !== 'function') return null;
        const bodies = ssm.getCelestialBodies();
        for (const [key, body] of bodies.entries()) {
            const info = ssm.getCelestialBodyInfo(body);
            if (info && info.name === name) return { key, body };
        }
        return null;
    }

    // Get live angle for planet based on absolute position in scene
    getLiveAngleDegForPlanet(object) {
        const ssm = this.getSolarSystemManagerRef();
        if (ssm) {
            const found = this.findBodyByName(object.name);
            if (found && found.body && found.body.position) {
                const pos = found.body.position;
                return (Math.atan2(pos.z, pos.x) * 180) / Math.PI;
            }
        }
        // fallback to data
        if (object.orbit && typeof object.orbit.angle === 'number') return object.orbit.angle;
        if (Array.isArray(object.position) && object.position.length >= 3) {
            return (Math.atan2(object.position[2], object.position[0]) * 180) / Math.PI;
        }
        return 0;
    }

    // Get live angle for moon relative to its parent planet
    getLiveAngleDegForMoon(object, parentId) {
        const ssm = this.getSolarSystemManagerRef();
        if (ssm) {
            const child = this.findBodyByName(object.name);
            const parentObj = this.starChartsManager.getObjectData(parentId);
            const parent = parentObj ? this.findBodyByName(parentObj.name) : null;
            if (child && parent && child.body && parent.body) {
                const rel = child.body.position.clone().sub(parent.body.position);
                return (Math.atan2(rel.z, rel.x) * 180) / Math.PI;
            }
        }
        // fallback to data
        if (object.orbit && typeof object.orbit.angle === 'number') return object.orbit.angle;
        if (Array.isArray(object.position) && object.position.length >= 3) {
            return (Math.atan2(object.position[2], object.position[0]) * 180) / Math.PI;
        }
        return 0;
    }

    // Live angle by matching name (stations/beacons when present in scene)
    getLiveAngleDegByName(name) {
        const ssm = this.getSolarSystemManagerRef();
        if (!ssm) return null;
        const found = this.findBodyByName(name);
        if (found && found.body && found.body.position) {
            const pos = found.body.position;
            return (Math.atan2(pos.z, pos.x) * 180) / Math.PI;
        }
        // Fallback for navigation beacons (exist in StarfieldManager)
        try {
            const beacons = this.viewManager?.starfieldManager?.navigationBeacons || [];
            const b = beacons.find(bc => (bc.userData?.name || 'Navigation Beacon') === name);
            if (b && b.position) {
                return (Math.atan2(b.position.z, b.position.x) * 180) / Math.PI;
            }
        } catch (e) {}
        return null;
    }

    // Explicit beacon angle getter (by name) used when building infra positions
    getBeaconAngleDegByName(name) {
        try {
            const beacons = this.viewManager?.starfieldManager?.navigationBeacons || [];
            const b = beacons.find(bc => (bc.userData?.name || 'Navigation Beacon') === name);
            if (b && b.position) {
                return (Math.atan2(b.position.z, b.position.x) * 180) / Math.PI;
            }
        } catch (e) {}
        return null;
    }

    renderBeaconRingIfNeeded() {
        // Draw dedicated beacon orbit ring (radius 350) like LRS when any beacons exist
        const sectorData = this.starChartsManager.objectDatabase?.sectors[this.starChartsManager.getCurrentSector()];
        if (!sectorData || !sectorData.infrastructure) return;
        const beacons = sectorData.infrastructure.beacons || [];
        
        // Check if any beacons should be shown (test mode shows all, normal mode shows discovered)
        const isTestMode = this.isTestModeEnabled();
        let anyBeaconToShow = false;
        
        if (isTestMode) {
            anyBeaconToShow = beacons.length > 0;
        } else {
            const discoveredIds = this.starChartsManager.getDiscoveredObjects();
            anyBeaconToShow = beacons.some(b => discoveredIds.includes(b.id));
        }
        
        if (!anyBeaconToShow) return;

        const r = this.displayModel?.beaconRing || 350;
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        ring.setAttribute('cx', '0');
        ring.setAttribute('cy', '0');
        ring.setAttribute('r', String(r));
        ring.setAttribute('fill', 'none');
        ring.setAttribute('stroke', '#ffff44');
        ring.setAttribute('stroke-width', '1');
        ring.setAttribute('stroke-dasharray', '5,3');
        ring.setAttribute('opacity', '0.6');
        ring.setAttribute('class', 'beacon-orbit-ring');
        this.svg.appendChild(ring);
    }

    // Convert stored object position to top-down display coordinates (x,z)
    getDisplayPosition(object) {
        // Prefer normalized display position if model built
        if (this.displayModel && this.displayModel.positions.has(object.id)) {
            const pos = this.displayModel.positions.get(object.id);
            if (object.type === 'navigation_beacon') {
                console.log(`🎯 Beacon ${object.name}: Using display model position (${pos.x}, ${pos.y})`);
            }
            return pos;
        }
        if (Array.isArray(object.position)) {
            if (object.position.length >= 3) {
                // Special handling for navigation beacons - they use [x, y, z] format
                // where y is the vertical coordinate, not z
                const pos = object.type === 'navigation_beacon'
                    ? { x: object.position[0], y: object.position[1] }
                    : { x: object.position[0], y: object.position[2] };

                if (object.type === 'navigation_beacon') {
                    console.log(`🎯 Beacon ${object.name}: Using beacon position [${object.position[0]}, ${object.position[1]}, ${object.position[2]}] -> display (${pos.x}, ${pos.y})`);
                }
                return pos;
            }
            if (object.position.length === 2) {
                const radiusAU = object.position[0];
                const angleDeg = object.position[1];
                const angleRad = (angleDeg * Math.PI) / 180;
                const AU_TO_DISPLAY = 149.6; // Keep consistent with planet units
                const r = radiusAU * AU_TO_DISPLAY;
                const pos = { x: r * Math.cos(angleRad), y: r * Math.sin(angleRad) };
                if (object.type === 'navigation_beacon') {
                    console.log(`🎯 Beacon ${object.name}: Using polar position [${radiusAU}, ${angleDeg}] -> display (${pos.x}, ${pos.y})`);
                }
                return pos;
            }
        }
        if (object.type === 'navigation_beacon') {
            console.log(`🎯 Beacon ${object.name}: No position data found, using (0,0)`);
        }
        return { x: 0, y: 0 };
    }

    getSectorStarDisplayPosition() {
        try {
            const sectorData = this.starChartsManager.objectDatabase?.sectors[this.starChartsManager.getCurrentSector()];
            if (sectorData?.star) {
                return this.getDisplayPosition(sectorData.star);
            }
        } catch (e) {}
        return { x: 0, y: 0 };
    }
    
    setupCoordinateSystem() {
        // Setup SVG coordinate system - account for map container aspect ratio
        
        // Ensure valid zoom level (allow zoom out to 0.4 for beacon ring view)
        if (isNaN(this.currentZoomLevel) || this.currentZoomLevel < 0.4) {
            this.currentZoomLevel = 1;
        }

        // Ensure valid center coordinates
        if (!this.currentCenter || isNaN(this.currentCenter.x) || isNaN(this.currentCenter.y)) {
            this.currentCenter = { x: 0, y: 0 };
        }

        // Get actual map container dimensions to account for layout
        const mapRect = this.mapContainer.getBoundingClientRect();
        const containerWidth = mapRect.width || 400; // Fallback if not available
        const containerHeight = mapRect.height || 400;
        
        // Calculate aspect ratio of the actual container
        const aspectRatio = containerWidth / containerHeight;
        
        // Adjust viewBox to maintain proper centering based on container aspect ratio
        let baseViewBoxWidth = this.defaultViewBox.width / this.currentZoomLevel;
        let baseViewBoxHeight = this.defaultViewBox.height / this.currentZoomLevel;
        
        // If container is wider than square, adjust viewBox width to maintain centering
        if (aspectRatio > 1) {
            baseViewBoxWidth = baseViewBoxHeight * aspectRatio;
        } else if (aspectRatio < 1) {
            baseViewBoxHeight = baseViewBoxWidth / aspectRatio;
        }
        
        // Calculate viewBox position ensuring the center point
        const viewBoxX = this.currentCenter.x - (baseViewBoxWidth / 2);
        const viewBoxY = this.currentCenter.y - (baseViewBoxHeight / 2);

        // Final validation of viewBox values
        const safeViewBox = {
            width: isNaN(baseViewBoxWidth) ? this.defaultViewBox.width : baseViewBoxWidth,
            height: isNaN(baseViewBoxHeight) ? this.defaultViewBox.height : baseViewBoxHeight,
            x: isNaN(viewBoxX) ? this.defaultViewBox.x : viewBoxX,
            y: isNaN(viewBoxY) ? this.defaultViewBox.y : viewBoxY
        };

        const viewBox = `${safeViewBox.x} ${safeViewBox.y} ${safeViewBox.width} ${safeViewBox.height}`;
        this.svg.setAttribute('viewBox', viewBox);
        
        console.log(`🔍 Star Charts ViewBox: zoom=${this.currentZoomLevel}, container=${containerWidth}x${containerHeight} (ratio=${aspectRatio.toFixed(2)}), viewBox="${viewBox}", center=(${this.currentCenter.x}, ${this.currentCenter.y})`);
    }
    
    renderDiscoveredObjects() {
        // Render all discovered objects
        
        const discoveredObjects = this.getDiscoveredObjectsForRender();
        
        // Render orbit lines first (behind objects) to match LRS
        this.renderOrbitLines(discoveredObjects);
        
        // Render objects
        discoveredObjects.forEach(object => {
            this.renderObject(object);
        });
    }
    
    getDiscoveredObjectsForRender() {
        // Get all discovered objects for current sector (or all objects in test mode)
        
        // Get sector data
        const sectorData = this.starChartsManager.objectDatabase?.sectors[this.starChartsManager.getCurrentSector()];
        if (!sectorData) return [];
        
        // Check if test mode is enabled (show all objects)
        const isTestMode = this.isTestModeEnabled();
        const discoveredIds = isTestMode ? null : this.starChartsManager.getDiscoveredObjects();
        const norm = (id) => (typeof id === 'string' ? id.replace(/^a0_/i, 'A0_') : id);
        const isDiscovered = (id) => {
            if (isTestMode) return true;
            if (!Array.isArray(discoveredIds)) return false;
            const nid = norm(id);
            return discoveredIds.some(did => norm(did) === nid);
        };
        
        const allObjects = [];
        
        // Add star (always include if exists, or check discovery in normal mode)
        if (sectorData.star && isDiscovered(sectorData.star.id)) {
            allObjects.push(sectorData.star);
        }
        
        // Add celestial objects
        sectorData.objects.forEach(obj => {
            if (isDiscovered(obj.id)) {
                allObjects.push(obj);
            }
        });
        
        // Add infrastructure
        if (sectorData.infrastructure) {
            sectorData.infrastructure.stations?.forEach(station => {
                if (isDiscovered(station.id)) {
                    // Normalize station type to match LRS icon rules
                    allObjects.push({ ...station, type: 'space_station' });
                }
            });
            
            sectorData.infrastructure.beacons?.forEach(beacon => {
                const discovered = isDiscovered(beacon.id);
                console.log(`🔧 Beacon ${beacon.name} (${beacon.id}): discovered=${discovered}, position=(${beacon.position?.[0]}, ${beacon.position?.[1]}, ${beacon.position?.[2]})`);
                if (discovered) {
                    // Normalize beacon type to match LRS icon rules
                    const beaconData = { ...beacon, type: 'navigation_beacon' };
                    allObjects.push(beaconData);
                    console.log(`🔧 Added beacon ${beacon.name} to allObjects with type=${beaconData.type}, position=(${beaconData.position?.[0]}, ${beaconData.position?.[1]}, ${beaconData.position?.[2]})`);
                }
            });
        }
        
        if (isTestMode) {
            console.log(`🧪 Star Charts TEST MODE: Showing all ${allObjects.length} objects in sector`);
        }
        
        return allObjects;
    }
    
    isTestModeEnabled() {
        // Check if test mode is enabled (same logic as StarChartsManager)
        try {
            if (typeof window !== 'undefined' && window.STAR_CHARTS_DISCOVER_ALL === true) {
                return true;
            }
        } catch (e) {}
        try {
            const flag = localStorage.getItem('star_charts_test_discover_all');
            return String(flag).toLowerCase() === 'true' || flag === '1';
        } catch (e) {}
        return false;
    }
    
    renderOrbitLines(objects) {
        // Render orbital paths for all celestial bodies (match LRS exactly)
        
        // First, render planet orbits around the star
        const planets = objects.filter(obj => obj.type === 'planet');
        planets.forEach(planet => {
            this.renderPlanetOrbit(planet);
        });
        
        // Then, render moon orbits around their parent planets
        const moons = objects.filter(obj => obj.type === 'moon');
        moons.forEach(moon => {
            this.renderMoonOrbit(moon, objects);
        });
        
        // Render beacon ring if any beacons exist (like LRS)
        this.renderBeaconRingIfNeeded();
    }
    
    // Old renderOrbitLine method removed - replaced with specialized renderPlanetOrbit and renderMoonOrbit methods
    
    renderPlanetOrbit(planet) {
        // Render planet orbit around the star (match LRS exactly)
        
        // Use the same orbit radius calculation as LRS: 100 + (index * 150)
        // Find planet index from display model
        const planetIndex = this.displayModel.planetOrder.indexOf(planet.id);
        if (planetIndex === -1) return; // Planet not in display model
        
        const orbitRadius = this.displayModel.ringRadii[planetIndex];
        if (!orbitRadius) return;
        
        // Create orbit circle centered on star (0,0) like LRS
        const orbit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        orbit.setAttribute('cx', '0');
        orbit.setAttribute('cy', '0');
        orbit.setAttribute('r', String(orbitRadius));
        orbit.setAttribute('class', 'scanner-orbit'); // Use same CSS class as LRS
        
        this.svg.appendChild(orbit);
    }
    
    renderMoonOrbit(moon, allObjects) {
        // Render moon orbit around its parent planet (match LRS exactly)
        
        if (!moon.orbit || !moon.orbit.parent) return;
        
        // Find the parent planet
        const parentPlanet = allObjects.find(obj => obj.id === moon.orbit.parent);
        if (!parentPlanet) return;
        
        // Get parent planet position
        const parentPos = this.getDisplayPosition(parentPlanet);
        
        // Calculate moon orbit radius (use display model if available, otherwise fallback)
        let moonOrbitRadius = 30; // Default like LRS
        if (this.displayModel.moonOffsets.has(moon.id)) {
            moonOrbitRadius = this.displayModel.moonOffsets.get(moon.id);
        } else if (moon.orbit.radius) {
            // Scale the orbit radius to display coordinates
            moonOrbitRadius = Math.max(15, moon.orbit.radius * 0.1);
        }
        
        // Create moon orbit circle centered on parent planet like LRS
        const moonOrbit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        moonOrbit.setAttribute('cx', String(parentPos.x));
        moonOrbit.setAttribute('cy', String(parentPos.y));
        moonOrbit.setAttribute('r', String(moonOrbitRadius));
        moonOrbit.setAttribute('class', 'scanner-orbit'); // Use same CSS class as LRS
        
        this.svg.appendChild(moonOrbit);
        
        // Add orbit highlight element for hover effects (like LRS)
        const moonOrbitHighlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        moonOrbitHighlight.setAttribute('cx', String(parentPos.x));
        moonOrbitHighlight.setAttribute('cy', String(parentPos.y));
        moonOrbitHighlight.setAttribute('r', String(moonOrbitRadius));
        moonOrbitHighlight.setAttribute('class', 'scanner-orbit-highlight'); // Use same CSS class as LRS
        
        this.svg.appendChild(moonOrbitHighlight);
    }
    
    renderObject(object) {
        // Render a single object

        const pos = this.getDisplayPosition(object);
        const x = pos.x;
        const y = pos.y; // Use Z as Y for top-down view
        const radius = this.getObjectDisplayRadius(object);
        const color = this.getObjectColor(object);

        if (object.type === 'navigation_beacon') {
            console.log(`🎯 Rendering beacon ${object.name} at (${x}, ${y})`);
        }
        
        // Match LRS iconography: star (circle), planet (circle), moon (small circle), station (diamond), beacon (triangle)
        let element = null;
        if (object.type === 'space_station') {
            const size = Math.max(4, radius * 1.2); // Reduced from 6 * 1.5 to 4 * 1.2
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x - size / 2);
            rect.setAttribute('y', y - size / 2);
            rect.setAttribute('width', size);
            rect.setAttribute('height', size);
            rect.setAttribute('data-original-width', size); // Store original size for hover effects
            rect.setAttribute('data-original-height', size);
            rect.setAttribute('transform', `rotate(45 ${x} ${y})`);
            rect.setAttribute('fill', color);
            rect.setAttribute('stroke', '#ffffff');
            rect.setAttribute('stroke-width', '1');
            element = rect;
        } else if (object.type === 'navigation_beacon') {
            const size = Math.max(8, radius * 2);
            const points = [
                `${x},${y - size / 1.2}`,
                `${x - size / 2},${y + size / 2}`,
                `${x + size / 2},${y + size / 2}`
            ].join(' ');
            const tri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            tri.setAttribute('points', points);
            tri.setAttribute('fill', '#ffff00');
            tri.setAttribute('stroke', '#ffffff');
            tri.setAttribute('stroke-width', '1');
            element = tri;
        } else {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', x);
            circle.setAttribute('cy', y);
            circle.setAttribute('r', radius);
            circle.setAttribute('data-original-r', radius); // Store original radius for hover effects like LRS
            circle.setAttribute('fill', color);
            circle.setAttribute('stroke', this.getObjectStrokeColor(object));
            circle.setAttribute('stroke-width', '1');
            element = circle;
        }
        element.setAttribute('data-object-id', object.id);
        element.setAttribute('data-name', object.name); // For click detection compatibility
        
        // Add selection highlight like LRS
        if (this.lastClickedObject && this.lastClickedObject.id === object.id) {
            element.setAttribute('stroke', '#ffff00');
            element.setAttribute('stroke-width', '2');
            if (element.style) {
                element.style.filter = 'brightness(1.3)';
            }
        }
        
        // Add hover effects like LRS
        this.addHoverEffects(element, object);
        
        this.svg.appendChild(element);
        
        // Labels removed - tooltips now provide object names on hover (match LRS)
    }
    
    getObjectDisplayRadius(object) {
        // Get display radius for object based on type and zoom
        
        const baseRadius = object.visualRadius || 1;
        const zoomFactor = Math.max(0.5, this.currentZoomLevel / 2);
        
        switch (object.type) {
            case 'star':
                return Math.max(8, baseRadius * 4 * zoomFactor);
            case 'planet':
                return Math.max(4, baseRadius * 3 * zoomFactor);
            case 'moon':
                return Math.max(3, baseRadius * 3.5 * zoomFactor); // Increased from 2 * 2 to 3 * 3.5
            case 'space_station':
                return Math.max(2, (object.size || 1) * 2 * zoomFactor); // Decreased from 3 * 3 to 2 * 2
            case 'navigation_beacon':
                return Math.max(2, 2 * zoomFactor);
            default:
                return Math.max(2, baseRadius * zoomFactor);
        }
    }
    
    getObjectColor(object) {
        // Get color for object based on type and faction/diplomacy
        
        // Check for explicit color override
        if (object.color) {
            return object.color;
        }
        
        // Get diplomacy/faction for this object (with moon inheritance)
        let diplomacy = (object.diplomacy || object.faction || '').toLowerCase();
        
        // Special handling for moons: inherit from parent planet if no own diplomacy
        if (object.type === 'moon' && !diplomacy && object.orbit?.parent) {
            const parentPlanet = this.findObjectById(object.orbit.parent);
            if (parentPlanet) {
                diplomacy = (parentPlanet.diplomacy || parentPlanet.faction || '').toLowerCase();
            }
        }
        
        // Apply faction coloring (matches LRS system)
        if (diplomacy) {
            switch (diplomacy) {
                case 'enemy':
                case 'hostile':
                    return '#ff0000'; // Red
                case 'friendly':
                case 'allied':
                    return '#00ff41'; // Green
                case 'neutral':
                    return '#ffff00'; // Yellow
            }
        }
        
        // Fallback to type-based coloring
        switch (object.type) {
            case 'star':
                return '#ffff00'; // Yellow (like neutral)
            case 'planet':
                return '#00ff41'; // Green (default friendly)
            case 'moon':
                return '#888888'; // Gray (only if no faction data)
            case 'space_station':
                return '#00ffff'; // Cyan (default station color)
            case 'navigation_beacon':
                return '#ffff44'; // Light yellow
            default:
                return '#ffffff'; // White
        }
    }
    
    findObjectById(objectId) {
        // Find an object by ID in the current sector data
        const sectorData = this.starChartsManager.objectDatabase?.sectors[this.starChartsManager.getCurrentSector()];
        if (!sectorData) return null;
        
        // Check star
        if (sectorData.star && sectorData.star.id === objectId) {
            return sectorData.star;
        }
        
        // Check celestial objects (planets, moons, etc.)
        const celestialObject = sectorData.objects?.find(obj => obj.id === objectId);
        if (celestialObject) return celestialObject;
        
        // Check infrastructure
        if (sectorData.infrastructure) {
            const station = sectorData.infrastructure.stations?.find(s => s.id === objectId);
            if (station) return station;
            
            const beacon = sectorData.infrastructure.beacons?.find(b => b.id === objectId);
            if (beacon) return beacon;
        }
        
        return null;
    }
    
    getObjectStrokeColor(object) {
        // Get stroke color for object
        
        switch (object.type) {
            case 'star':
                return '#ffaa00';
            case 'planet':
                return '#00aa00';
            case 'moon':
                return '#666666';
            default:
                return '#666666';
        }
    }
    
    
    renderVirtualWaypoints() {
        // Render mission waypoints
        
        // TODO: Get waypoints from StarChartsManager
        // For now, this is a placeholder
    }
    
    updateStatusBar() {
        // Update the status bar with current information
        
        const discoveredCount = this.starChartsManager.getDiscoveredObjects().length;
        const currentSector = this.starChartsManager.getCurrentSector();
        const zoomText = `Zoom: ${this.currentZoomLevel}x`;
        
        this.statusBar.innerHTML = `
            <div>Sector: ${currentSector} | Discovered: ${discoveredCount} objects</div>
            <div>${zoomText} | Click objects to target | Click empty space to zoom out</div>
        `;
    }
    
    // Helper methods
    findObjectByName(name) {
        // Find object by name in current sector data
        const discoveredObjects = this.getDiscoveredObjectsForRender();
        return discoveredObjects.find(obj => obj.name === name) || null;
    }
    
    findCurrentSystemStar() {
        // Find the star of the current solar system
        const discoveredObjects = this.getDiscoveredObjectsForRender();
        return discoveredObjects.find(obj => obj.type === 'star') || null;
    }
    
    addHoverEffects(element, object) {
        // Add LRS-style hover effects: pointer cursor + scale animation
        const growFactor = 1.3; // Match LRS grow factor
        const transitionDuration = 150; // Match LRS transition duration
        
        // Set pointer cursor for interactive elements (match LRS)
        element.style.cursor = 'pointer';
        
        // Store original size for restoration - use data-original-* attributes like LRS
        const originalR = element.getAttribute('data-original-r');
        const originalWidth = element.getAttribute('data-original-width') || element.getAttribute('width');
        const originalHeight = element.getAttribute('data-original-height') || element.getAttribute('height');
        
        element.addEventListener('mouseenter', () => {
            if (originalR) {
                element.style.transition = `r ${transitionDuration}ms ease-out`;
                element.setAttribute('r', String(parseFloat(originalR) * growFactor));
            } else if (originalWidth && originalHeight) {
                element.style.transition = `all ${transitionDuration}ms ease-out`;
                element.setAttribute('width', String(parseFloat(originalWidth) * growFactor));
                element.setAttribute('height', String(parseFloat(originalHeight) * growFactor));
            }
        });
        
        element.addEventListener('mouseleave', () => {
            if (originalR) {
                element.style.transition = `r ${transitionDuration}ms ease-out`;
                element.setAttribute('r', originalR);
            } else if (originalWidth && originalHeight) {
                element.style.transition = `all ${transitionDuration}ms ease-out`;
                element.setAttribute('width', originalWidth);
                element.setAttribute('height', originalHeight);
            }
        });
    }
    
    // Public API
    isVisible() {
        return this._isVisible;
    }
    
    refresh() {
        // Refresh the display
        if (this._isVisible) {
            this.render();
        }
    }
}
