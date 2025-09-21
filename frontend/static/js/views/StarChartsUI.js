import { debug } from '../debug.js';

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
        
debug('UI', 'StarChartsUI: Interface created');
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
        this.svg.setAttribute('class', 'starcharts-svg'); // Add class for debugging
        this.svg.style.cssText = `width: 100%; height: 100%; cursor: default;`; // Match LRS default cursor
        this.mapContainer.appendChild(this.svg);
        
        // Create details panel
        this.detailsPanel = document.createElement('div');
        this.detailsPanel.className = 'scanner-details';
        this.container.appendChild(this.detailsPanel);
        
        // Create status bar
        this.statusBar = document.createElement('div');
        this.statusBar.className = 'star-charts-status';
        this.container.appendChild(this.statusBar);
        
        // Create tooltip with unique ID to avoid conflicts with LRS
        this.tooltip = document.createElement('div');
        this.tooltip.id = 'star-charts-tooltip';
        this.tooltip.className = 'scanner-tooltip star-charts-tooltip';
        this.tooltip.style.display = 'none';
        document.body.appendChild(this.tooltip);
        
        console.log('✅ Star Charts tooltip element created:', this.tooltip);
        console.log('🔧 TOOLTIP FIX VERSION LOADED - v2.0 with enhanced object data loading');
        
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
        
        // SVG click handling
        this.svg.addEventListener('click', (event) => {
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
            // Improved click detection: try multiple points around the click for better precision
            const clickPoints = [
                { x: event.clientX, y: event.clientY }, // Original click point
                { x: event.clientX - 2, y: event.clientY }, // Slightly left
                { x: event.clientX + 2, y: event.clientY }, // Slightly right
                { x: event.clientX, y: event.clientY - 2 }, // Slightly up
                { x: event.clientX, y: event.clientY + 2 }, // Slightly down
            ];
            
            let clickedElement = null;
            for (const point of clickPoints) {
                clickedElement = document.elementFromPoint(point.x, point.y);
                if (clickedElement && clickedElement !== this.svg) {
                    break;
                }
            }
            
            debug('STAR_CHARTS', `🔍 Star Charts Click: element=${clickedElement?.tagName || 'null'}, classes=[${clickedElement?.className || 'none'}], zoomLevel=${this.currentZoomLevel}`);
            
            if (!clickedElement) {
                debug('STAR_CHARTS', `🔍 Star Charts: No element found at click position`);
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
                clickedElement.classList.contains('starchart-hitbox') || // New larger hit boxes
                clickedElement.classList.contains('ship-position-icon') || // Ship icon is clickable
                clickedElement.hasAttribute('data-name') // Any element with targeting data
            );
            
            // console.log(`🔍 Star Charts: isInteractiveElement=${isInteractiveElement}`);
            
            if (isInteractiveElement) {
                // Special handling for ship icon - it has its own click handler
                if (clickedElement.classList.contains('ship-position-icon')) {
                    // Ship icon click is handled by its own event listener, skip normal processing
                    return;
                }

                const objectId = clickedElement.getAttribute('data-object-id') ||
                               clickedElement.getAttribute('data-name');
                // console.log(`🔍 Star Charts: Found objectId=${objectId}`);

                if (objectId) {
                    const objectData = this.starChartsManager.getObjectData(objectId) ||
                                     this.findObjectByName(objectId);
                    // console.log(`🔍 Star Charts: Found objectData:`, objectData?.name || 'null');

                    if (objectData) {
                        // console.log(`🔍 Star Charts: Clicked interactive element, selecting object ${objectData.name}`);
                        this.selectObject(objectData);
                    } else {
                        // console.log(`🔍 Star Charts: No object data found for ID: ${objectId}`);
                    }
                } else {
                    // console.log(`🔍 Star Charts: Interactive element has no object ID`);
                }
            } else {
                // NEW BEHAVIOR: Any click zooms in, Shift+click zooms out
                if (event.shiftKey) {
                    this.zoomOut();
                } else {
                    this.zoomIn();
                }
            }
        }, 50); // Match LRS delay
    }
    
    handleMouseMove(event) {
        // Handle mouse movement for tooltips - USE LRS APPROACH (direct DOM detection)
        
        // Use global screen coordinates like LRS (not local SVG coordinates)
        const x = event.clientX;
        const y = event.clientY;
        
        // Find the element under the cursor using direct DOM query (LRS approach)
        const element = document.elementFromPoint(x, y);
        
        // Check if it's a Star Charts interactive element (visual element or hitbox)
        if (element && (element.hasAttribute('data-object-id') || element.hasAttribute('data-name'))) {
            const objectId = element.getAttribute('data-object-id') || element.getAttribute('data-name');
            
            // Special handling for player ship
            if (objectId === 'player_ship' || element.classList.contains('ship-position-icon')) {
                // Show "You are here" tooltip for ship
                this.tooltip.textContent = 'You are here';
                this.tooltip.style.left = x + 'px';
                this.tooltip.style.top = y + 'px';
                this.tooltip.style.display = 'block';
            } else {
                // Check if this is an unknown object (question mark)
                if (element.classList.contains('star-charts-undiscovered') || 
                    element.getAttribute('data-name') === 'Unknown') {
                    // Show "Unknown" tooltip for undiscovered objects
                    this.tooltip.textContent = 'Unknown';
                    this.tooltip.style.left = x + 'px';
                    this.tooltip.style.top = y + 'px';
                    this.tooltip.style.display = 'block';
                } else {
                    // Get the object data for tooltip (discovered objects)
                    const hoveredObject = this.starChartsManager.getObjectData(objectId) || 
                                        this.findObjectByName(objectId);
                    
                    if (hoveredObject) {
                        this.showTooltip(x, y, hoveredObject);
                    } else {
                        this.tooltip.style.display = 'none';
                    }
                }
            }
        } else {
            // No interactive element found - hide tooltip
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
        
        // console.log('🖱️ Star Charts: Started mouse drag');
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
        
        // console.log(`🖱️ Star Charts: Dragging to center (${this.currentCenter.x.toFixed(1)}, ${this.currentCenter.y.toFixed(1)})`);
    }
    
    endMouseDrag(event) {
        // End mouse drag operation
        this.panState.isDragging = false;
        
        // Restore cursor
        this.svg.style.cursor = 'default';
        this.mapContainer.classList.remove('dragging');
        
        // console.log('🖱️ Star Charts: Ended mouse drag');
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
        
        // console.log('👆 Star Charts: Started two-finger drag');
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
        
        // console.log(`👆 Star Charts: Touch dragging to center (${this.currentCenter.x.toFixed(1)}, ${this.currentCenter.y.toFixed(1)})`);
    }
    
    endTouchDrag(event) {
        // End two-finger touch drag
        this.panState.isTouchDragging = false;
        
        // console.log('👆 Star Charts: Ended two-finger drag');
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
        
        // console.log(`🔍 Star Charts: selectObject called - objectName: ${object.name}, currentZoom: ${this.currentZoomLevel}`);
        
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
            // console.log(`🔍 Star Charts: Zoomed in to level ${this.currentZoomLevel}, centered on ${object.name} at (${this.currentCenter.x}, ${this.currentCenter.y})`);
        } else {
            // console.log(`🔍 Star Charts: At max zoom (${this.currentZoomLevel}), only centering on ${object.name} at (${this.currentCenter.x}, ${this.currentCenter.y})`);
        }
        
        // Integrate with Target Computer
        // For undiscovered objects, ensure they're added to target computer first
        if (object._isUndiscovered) {

            console.log(`🔍 DEBUG OBJECT: Object properties before adding:`, {
                name: object.name,
                type: object.type,
                _isUndiscovered: object._isUndiscovered,
                id: object.id
            });
            
            // Add the necessary properties directly to the object for undiscovered targeting
            object.discovered = false;
            object.diplomacy = 'unknown';
            object.faction = 'Unknown';
            
            console.log(`🔍 DEBUG PROPERTIES: Set properties on object:`, {
                name: object.name,
                discovered: object.discovered,
                diplomacy: object.diplomacy,
                faction: object.faction,
                _isUndiscovered: object._isUndiscovered
            });
            
            // Debug: Check if beacon is already in target computer
            const targetComputerManager = this.starChartsManager?.targetComputerManager;
            if (targetComputerManager) {
                const existingIndex = targetComputerManager.targetObjects.findIndex(t => t.id === object.id);
                debug('TARGETING', `Beacon ${object.name} (${object.id}) in target list check:`, {
                    found: existingIndex !== -1,
                    index: existingIndex,
                    totalTargets: targetComputerManager.targetObjects.length
                });
                
                if (existingIndex !== -1) {
                    const existingTarget = targetComputerManager.targetObjects[existingIndex];
                    debug('TARGETING', `Existing target details:`, {
                        name: existingTarget.name,
                        id: existingTarget.id,
                        type: existingTarget.type,
                        discovered: existingTarget.discovered,
                        diplomacy: existingTarget.diplomacy
                    });
                }
            }
        }
        
        // console.log(`🎯 Star Charts: About to call selectObjectById for ${object.name} (${object.id})`);
        const targetingSuccess = this.starChartsManager.selectObjectById(object.id);
        // console.log(`🎯 Star Charts: selectObjectById result: ${targetingSuccess} for ${object.name}`);
        
        if (targetingSuccess) {
            // console.log(`🎯 Star Charts: Successfully selected ${object.name} for targeting`);
        } else {
debug('P1', `🎯 Star Charts: Failed to select ${object.name} for targeting`);
        }
        
        this.render();
    }
    
    zoomOut() {
        // NEW BEHAVIOR: Zoom out one level maintaining center on previous object or star
        // console.log(`🔍 Star Charts: Empty space clicked, zooming out from level ${this.currentZoomLevel}`);
        
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
                // console.log(`🔍 Star Charts: Zoomed out to level ${this.currentZoomLevel}, maintaining center on ${centerObject.name} at (${this.currentCenter.x}, ${this.currentCenter.y})`);
            } else {
                // Fallback to origin if no object found
                this.currentCenter = { x: 0, y: 0 };
                // console.log(`🔍 Star Charts: Zoomed out to level ${this.currentZoomLevel}, centered at origin (no object to maintain center on)`);
            }
        } else {
            // At minimum zoom level - don't zoom out further
            // console.log(`🔍 Star Charts: Already at minimum zoom level ${this.currentZoomLevel}, not zooming out further`);
        }
        
        this.render();
    }

    zoomIn() {
        // NEW BEHAVIOR: Zoom in one level, centering on current center
        // console.log(`🔍 Star Charts: Zooming in from level ${this.currentZoomLevel}`);

        if (this.currentZoomLevel < this.maxZoomLevel) {
            this.currentZoomLevel++;
            // console.log(`🔍 Star Charts: Zoomed in to level ${this.currentZoomLevel}, maintaining center at (${this.currentCenter.x}, ${this.currentCenter.y})`);
        } else {
            // Already at maximum zoom level
            // console.log(`🔍 Star Charts: Already at maximum zoom level ${this.currentZoomLevel}, not zooming in further`);
        }

        this.render();
    }

    zoomToLocation(x, y) {
        // Zoom to a specific location (used for unknown object clicks)
        this.currentCenter = { x: x, y: y };

        // Zoom in unless already at max zoom
        if (this.currentZoomLevel < this.maxZoomLevel) {
            this.currentZoomLevel++;
        }

        this.render();
        debug('STAR_CHARTS', `🔍 Zoomed to location (${x.toFixed(1)}, ${y.toFixed(1)}) at zoom level ${this.currentZoomLevel}`);
    }

    centerOnTarget(targetObject) {
        // Center the Star Charts view on a target object (used for TAB targeting)
        if (!targetObject) {
            debug('STAR_CHARTS', `🎯 centerOnTarget: No target object provided`);
            return;
        }

        // Get the display position of the target
        const pos = this.getDisplayPosition(targetObject);
        if (pos && !isNaN(pos.x) && !isNaN(pos.y)) {
            this.currentCenter = { 
                x: pos.x,
                y: pos.y
            };
            this.lastClickedObject = targetObject; // Remember this as the last selected object
            
            // Re-render with new center
            this.render();
            
            debug('STAR_CHARTS', `🎯 Centered on target: ${targetObject.name} at (${this.currentCenter.x.toFixed(1)}, ${this.currentCenter.y.toFixed(1)})`);
        } else {
            debug('STAR_CHARTS', `🎯 centerOnTarget: Could not get valid position for ${targetObject.name}`);
        }
    }

    createTargetIndicator(x, y, size = 30) {
        // Create the spinning green rectangle indicator (like Galactic Chart)
        const indicator = document.createElement('div');
        indicator.className = 'star-charts-target-indicator';
        
        // Position and size the indicator
        indicator.style.left = (x - size/2) + 'px';
        indicator.style.top = (y - size/2) + 'px';
        indicator.style.width = size + 'px';
        indicator.style.height = size + 'px';
        
        return indicator;
    }

    updateTargetIndicator() {
        // Update or create the spinning green rectangle for current target
        
        // Remove existing indicator
        this.removeTargetIndicator();
        
        // Get current target from Target Computer
        const targetComputerManager = this.viewManager?.starfieldManager?.targetComputerManager;
        const currentTarget = targetComputerManager?.currentTarget;
        
        if (!currentTarget || !currentTarget.name) {
            debug('STAR_CHARTS', `🎯 No current target for indicator`);
            return;
        }
        
        // Try to find the target object for positioning
        let targetObject = null;
        
        // First try to get it from Star Charts database
        if (currentTarget.id) {
            targetObject = this.starChartsManager.getObjectData(currentTarget.id);
        }
        
        // If not found, try to find by name
        if (!targetObject && currentTarget.name) {
            targetObject = this.findObjectByName(currentTarget.name);
        }
        
        if (!targetObject) {
            debug('STAR_CHARTS', `🎯 Target ${currentTarget.name} not found in Star Charts for indicator`);
            return;
        }
        
        // Get screen position of the target
        const screenPos = this.worldToScreen(targetObject);
        if (!screenPos || isNaN(screenPos.x) || isNaN(screenPos.y)) {
            debug('STAR_CHARTS', `🎯 Could not get screen position for target indicator`);
            return;
        }
        
        // Create and add the indicator
        const indicator = this.createTargetIndicator(screenPos.x, screenPos.y, 40);
        this.mapContainer.appendChild(indicator);
        
        debug('STAR_CHARTS', `🎯 Target indicator created for ${currentTarget.name} at (${screenPos.x.toFixed(1)}, ${screenPos.y.toFixed(1)})`);
    }

    removeTargetIndicator() {
        // Remove any existing target indicator
        const existingIndicator = this.mapContainer.querySelector('.star-charts-target-indicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
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
        // This searches ALL objects (both discovered and undiscovered)

        const allObjects = this.getDiscoveredObjectsForRender(); // This actually returns all objects

        // Convert screen tolerance to world coordinates based on current zoom
        const worldTolerance = this.screenPixelsToWorldUnits(screenTolerancePixels);

        for (const object of allObjects) {
            const pos = this.getDisplayPosition(object);
            const dx = pos.x - worldX;
            const dy = pos.y - worldY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const objectRadius = this.getObjectDisplayRadius(object);
            if (distance <= objectRadius + worldTolerance) {
                return object;
            }
        }

        // Check for ship icon
        const shipIcon = this.svg.querySelector('.ship-position-icon');
        if (shipIcon) {
            const points = shipIcon.getAttribute('points');
            if (points) {
                // Parse polygon points to get center position
                const pointArray = points.split(' ').map(p => p.split(','));
                if (pointArray.length >= 4) {
                    // Calculate center from polygon points
                    let centerX = 0, centerY = 0;
                    for (const point of pointArray) {
                        if (point.length === 2) {
                            centerX += parseFloat(point[0]);
                            centerY += parseFloat(point[1]);
                        }
                    }
                    centerX /= pointArray.length;
                    centerY /= pointArray.length;

                    // Convert screen coordinates to world coordinates for comparison
                    const rect = this.svg.getBoundingClientRect();
                    const svgWidth = rect.width;
                    const svgHeight = rect.height;
                    const worldSize = this.getWorldSize();

                    const shipWorldX = (centerX / svgWidth - 0.5) * worldSize + this.currentCenter.x;
                    const shipWorldY = (centerY / svgHeight - 0.5) * worldSize + this.currentCenter.y;

                    const dx = shipWorldX - worldX;
                    const dy = shipWorldY - worldY;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Ship icon radius (approximate) - convert to world units
                    const shipRadius = this.screenPixelsToWorldUnits(15); // 15 pixel radius
                    if (distance <= shipRadius + worldTolerance) {

                        return {
                            id: 'player_ship',
                            name: 'You are here',
                            type: 'ship',
                            _isShip: true
                        };
                    }
                }
            }
        }

        return null;
    }

    getObjectAtScreenPosition(screenX, screenY, pixelTolerance = 8) {
        // Get object at screen position with zoom-independent pixel tolerance
        // This searches ALL objects (both discovered and undiscovered)

        const allObjects = this.getDiscoveredObjectsForRender(); // This actually returns all objects
        
        // Debug: Log available objects occasionally
        if (Math.random() < 0.01) { // Only log 1% of the time
            console.log('🌟 Available objects for hover detection:', {
                count: allObjects.length,
                objects: allObjects.map(obj => ({
                    id: obj.id,
                    name: obj.name,
                    type: obj.type,
                    _isUndiscovered: obj._isUndiscovered
                }))
            });
        }

        // Convert screen position to world coordinates for object lookup
        const worldPos = this.screenToWorld(screenX, screenY);

        for (const object of allObjects) {
            // Get object's screen position
            const objectScreenPos = this.worldToScreen(object);

            if (objectScreenPos) {
                const dx = objectScreenPos.x - screenX;
                const dy = objectScreenPos.y - screenY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Debug: Log object positions and distances occasionally
                if (Math.random() < 0.01) { // Only log 1% of the time to reduce spam

                }

                    // Use fixed pixel tolerance - this doesn't change with zoom (increased for better detection)
                    if (distance <= pixelTolerance) {
                        // Ensure object has complete data including name
                        const completeObject = this.ensureObjectHasName(object);
                        return completeObject;
                }
            }
        }

        // Check for ship icon using screen coordinates
        const shipIcon = this.svg.querySelector('.ship-position-icon');
        if (shipIcon) {
            const points = shipIcon.getAttribute('points');
            if (points) {
                // Parse polygon points to get center position
                const pointArray = points.split(' ').map(p => p.split(','));
                if (pointArray.length >= 4) {
                    // Calculate center from polygon points
                    let centerX = 0, centerY = 0;
                    for (const point of pointArray) {
                        if (point.length === 2) {
                            centerX += parseFloat(point[0]);
                            centerY += parseFloat(point[1]);
                        }
                    }
                    centerX /= pointArray.length;
                    centerY /= pointArray.length;

                    // Calculate distance from mouse to ship center (both in screen coordinates)
                    const dx = centerX - screenX;
                    const dy = centerY - screenY;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    // Use fixed pixel tolerance for ship too
                    if (distance <= pixelTolerance + 5) { // Slightly larger for ship (diamond shape)

                        return {
                            id: 'player_ship',
                            name: 'You are here',
                            type: 'ship',
                            _isShip: true
                        };
                    }
                }
            }
        }

        return null;
    }

    worldToScreen(object) {
        // Convert world coordinates to screen coordinates for an object
        // This is the inverse of screenToWorld

        if (!object) return null;

        const pos = this.getDisplayPosition(object);
        if (!pos) return null;

        const rect = this.svg.getBoundingClientRect();
        const svgWidth = rect.width;
        const svgHeight = rect.height;
        const worldSize = this.getWorldSize();

        // Convert world coordinates back to screen coordinates
        const screenX = ((pos.x - this.currentCenter.x) / worldSize + 0.5) * svgWidth;
        const screenY = ((pos.y - this.currentCenter.y) / worldSize + 0.5) * svgHeight;

        return { x: screenX, y: screenY };
    }
    ensureObjectDataLoaded() {
        // Ensure object database is loaded before showing tooltips
        if (!this.starChartsManager.objectDatabase || !this.starChartsManager.isInitialized) {
            console.log('🖱️ Object database not ready for tooltips yet');
            return false;
        }
        return true;
    }
    
    ensureObjectHasName(object) {
        // Ensure object has a name, fetching from database if needed
        if (!object) return null;
        
        // If object already has a name, return it
        if (object.name && object.name !== 'undefined' && object.name.trim() !== '') {
            return object;
        }
        
        // If it's a ship, handle specially
        if (object._isShip) {
            return {
                ...object,
                name: 'Your Ship',
                type: 'ship'
            };
        }
        
        // Try to get complete data from database
        if (object.id && this.starChartsManager.objectDatabase) {
            const completeData = this.starChartsManager.getObjectData(object.id);
            if (completeData && completeData.name) {
                return {
                    ...object,
                    ...completeData
                };
            }
        }
        
        // Fallback: create a meaningful name from available data
        let fallbackName = 'Unknown Object';
        if (object.id) {
            // Try to extract meaningful name from ID
            const cleanId = object.id.replace(/^[A-Z]\d+_/, ''); // Remove sector prefix like "A0_"
            fallbackName = cleanId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        
        return {
            ...object,
            name: fallbackName,
            type: object.type || 'Unknown'
        };
    }
    
    
    
    showTooltip(screenX, screenY, object) {
        // Ensure object database is ready
        if (!this.ensureObjectDataLoaded()) {
            return;
        }
        
        // Ensure object has complete data including name
        const completeObject = this.ensureObjectHasName(object);
        if (!completeObject) {
            console.log('⚠️ Could not get complete object data for tooltip');
            return;
        }
        
        // For undiscovered objects, show "Unknown" instead of revealing the name
        // For ship, show "You are here"
        let tooltipText;
        if (completeObject._isShip) {
            tooltipText = 'You are here';
        } else if (completeObject._isUndiscovered) {
            tooltipText = 'Unknown';
        } else {
            // Use the name from the complete object
            tooltipText = completeObject.name || 'Unknown Object';
        }

        // Show tooltip for hovered object - match LRS simple text format

        // Simple text tooltip like LRS (no HTML formatting)
        if (!this.tooltip) {
            console.log('❌ Tooltip element not found!');
            return;
        }
        
        this.tooltip.textContent = tooltipText;

        // Position tooltip at cursor like LRS
        this.tooltip.style.left = screenX + 'px';
        this.tooltip.style.top = screenY + 'px';
        this.tooltip.style.display = 'block';
    }
    
    showObjectDetails(object) {
        // Show detailed information about selected object
        
        // For undiscovered objects, only show minimal info
        if (object._isUndiscovered) {
            const p = this.getDisplayPosition(object);
            const detailsHTML = `
                <div class="object-details">
                    <h3 style="color: #44ffff; margin-top: 0;">
                        Unknown Object
                    </h3>
                    <div><strong>Status:</strong> Undiscovered</div>
                    <div><strong>Position:</strong></div>
                    <div style="margin-left: 10px;">
                        X: ${p.x.toFixed(1)}<br>
                        Z: ${p.y.toFixed(1)}
                    </div>
                    <div style="margin-top: 10px; font-style: italic; color: #888;">
                        Move closer to discover more information
                    </div>
                </div>
            `;
            this.detailsPanel.innerHTML = detailsHTML;
            return;
        }
        
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
            
            // Open at zoom level 3.0 for detailed view
            this.currentZoomLevel = 3.0;
            
            // Priority 1: Center on current CPU target if one exists
            const targetComputerManager = this.viewManager?.starfieldManager?.targetComputerManager;
            const currentTarget = targetComputerManager?.currentTarget;
            let centeringCompleted = false;
            
            if (currentTarget && currentTarget.name) {
                // Try to find the target object in our database for positioning
                let targetObject = null;
                
                // First try to get it from Star Charts database
                if (currentTarget.id) {
                    targetObject = this.starChartsManager.getObjectData(currentTarget.id);
                }
                
                // If not found, try to find by name
                if (!targetObject && currentTarget.name) {
                    targetObject = this.findObjectByName(currentTarget.name);
                }
                
                // If we found the target object, center on it
                if (targetObject) {
                    const targetPos = this.getDisplayPosition(targetObject);
                    this.currentCenter = { 
                        x: isNaN(targetPos.x) ? 0 : targetPos.x, 
                        y: isNaN(targetPos.y) ? 0 : targetPos.y 
                    };
                    this.lastClickedObject = targetObject;
                    centeringCompleted = true;
                    debug('STAR_CHARTS', `🔍 Star Charts: Opening at zoom level ${this.currentZoomLevel}, centered on current target: ${currentTarget.name} at (${this.currentCenter.x.toFixed(1)}, ${this.currentCenter.y.toFixed(1)})`);
                } else {
                    debug('STAR_CHARTS', `🔍 Star Charts: Current target ${currentTarget.name} not found in Star Charts database, falling back to ship`);
                    // Fall through to ship centering
                }
            }
            
            // Priority 2: Center on the player ship position (if no target or target not found)
            if (!centeringCompleted) {
                const playerPos = this.starChartsManager.getPlayerPosition();
                if (playerPos && Array.isArray(playerPos) && playerPos.length >= 3) {
                    // Create a temporary ship object to use getDisplayPosition()
                    const shipObject = {
                        id: 'player_ship',
                        name: 'Your Ship',
                        type: 'ship',
                        position: playerPos
                    };
                    
                    const shipPos = this.getDisplayPosition(shipObject);
                    this.currentCenter = { 
                        x: isNaN(shipPos.x) ? 0 : shipPos.x, 
                        y: isNaN(shipPos.y) ? 0 : shipPos.y 
                    };
                    this.lastClickedObject = shipObject; // Remember ship as the initially selected object
                    debug('STAR_CHARTS', `🔍 Star Charts: Opening at zoom level ${this.currentZoomLevel}, centered on ship at (${this.currentCenter.x.toFixed(1)}, ${this.currentCenter.y.toFixed(1)})`);
                } else {
                    // Priority 3: Fallback to star if ship position not available
                    const star = this.findCurrentSystemStar();
                    if (star) {
                        const starPos = this.getDisplayPosition(star);
                        this.currentCenter = { 
                            x: isNaN(starPos.x) ? 0 : starPos.x, 
                            y: isNaN(starPos.y) ? 0 : starPos.y 
                        };
                        this.lastClickedObject = star; // Remember star as the initially selected object
                        debug('STAR_CHARTS', `🔍 Star Charts: Ship position unavailable, opening at zoom level ${this.currentZoomLevel}, centered on star ${star.name} at (${this.currentCenter.x.toFixed(1)}, ${this.currentCenter.y.toFixed(1)})`);
                    } else {
                        // Fallback if no star found
                        this.currentCenter = { x: 0, y: 0 };
                        this.lastClickedObject = null;
                        // console.log(`🔍 Star Charts: Opening at zoom level ${this.currentZoomLevel}, no star found - centered at origin`);
                    }
                }
            }
            
            // Show current target information instead of generic message
            this.updateCurrentTargetDisplay();
            
            // Update targeting-active class
            if (this.viewManager.starfieldManager?.targetComputerEnabled) {
                this.container.classList.add('targeting-active');
            } else {
                this.container.classList.remove('targeting-active');
            }
            
            // Debug: Log discovered objects when opening Star Charts
            if (this.starChartsManager && this.starChartsManager.discoveredObjects) {
                const discoveredCount = this.starChartsManager.discoveredObjects.size;
                if (discoveredCount > 0) {
                    const discoveredList = Array.from(this.starChartsManager.discoveredObjects).join(', ');
                    debug('STAR_CHARTS', `📋 Star Charts opened - Discovered objects (${discoveredCount}): ${discoveredList}`);
                } else {
                    debug('STAR_CHARTS', '📋 Star Charts opened - No objects discovered yet');
                }
            }
            
            // Render the map
            this.render();
            
debug('UI', 'Star Charts: Interface shown');
        }
    }
    
    hide(restoreView = true) {
        // Hide the Star Charts interface
        
        if (this._isVisible) {
            this._isVisible = false;
            this.container.classList.remove('visible');
            this.container.classList.remove('targeting-active');
            this.tooltip.style.display = 'none';
            
            // Remove target indicator when hiding
            this.removeTargetIndicator();
            
debug('UI', 'Star Charts: Interface hidden');
        }
    }
    
    render() {
        // Render the Star Charts map
        
        if (!this._isVisible || !this.starChartsManager.isEnabled()) {
            return;
        }
        
        // Clear SVG and ensure all blinking classes are removed
        this.svg.innerHTML = '';
        
        // Additional safety: Remove any lingering target-blink classes from the entire document
        // This handles edge cases where elements might persist outside the SVG
        const existingBlinkingElements = document.querySelectorAll('.target-blink');
        existingBlinkingElements.forEach(element => {
            element.classList.remove('target-blink');
            // Force style recalculation to ensure animation stops immediately
            element.offsetHeight; // Trigger reflow
        });
        
        debug('TARGETING', `🎯 RENDER: Cleared ${existingBlinkingElements.length} existing blinking elements and forced reflow`);
        
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
        
        // Update current target display in info panel
        this.updateCurrentTargetDisplay();
        
        // Update the spinning green rectangle target indicator
        this.updateTargetIndicator();
        
        debug('TARGETING', `🎯 RENDER: Star Charts render completed`);
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
            // console.log(`🎯 placePolar: Processing ${obj.name} (${obj.type})`);

            // Prefer live angle if available by matching body name to SSM
            const liveAngle = this.getLiveAngleDegByName(obj.name);
            // console.log(`🎯 placePolar: liveAngle for ${obj.name} = ${liveAngle}`);

            if (typeof liveAngle === 'number') {
                // console.log(`✅ Using live angle ${liveAngle}° for ${obj.name}`);
                // Snap to nearest ring or force beacon ring
                const isBeacon = (obj.type === 'navigation_beacon');
                const isStation = (obj.type === 'space_station');
                const rDisplayGuess = Array.isArray(obj.position) && obj.position.length === 2 ? (obj.position[0] * AU_TO_DISPLAY) : 300;
                const ring = isBeacon && this.displayModel.beaconRing ? this.displayModel.beaconRing : snapToNearestRing(rDisplayGuess, isStation);
                const rad = liveAngle * Math.PI / 180;
                const x = ring * Math.cos(rad);
                const y = ring * Math.sin(rad);
                // console.log(`📍 Final position for ${obj.name}: (${x.toFixed(1)}, ${y.toFixed(1)}) using ring ${ring}`);
                this.displayModel.positions.set(obj.id, { x, y });
                return;
            } else {
                // console.log(`❌ No live angle for ${obj.name}, falling back to static coordinates`);
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

                if (isBeacon) {
                    // console.log(`🎯 Beacon ${obj.name}: Using Y-based angle calculation`);
                    // console.log(`   Position: [${x3}, ${y3}, ${z3}]`);
                    // console.log(`   Old angle (z,x): ${(Math.atan2(z3, x3) * 180) / Math.PI}°`);
                    // console.log(`   New angle (y,x): ${angleDeg}°`);
                }

                const ring = isBeacon && this.displayModel.beaconRing ? this.displayModel.beaconRing : snapToNearestRing(300);
                const angleRad = angleDeg * Math.PI / 180;
                const x = ring * Math.cos(angleRad);
                const y = ring * Math.sin(angleRad);
                this.displayModel.positions.set(obj.id, { x, y });

                if (isBeacon) {
                    // console.log(`   Final position: (${x.toFixed(1)}, ${y.toFixed(1)})`);
                }
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
        // console.log(`🔧 Positioning ${beacons.length} beacons`);
        beacons.forEach(beacon => {
            // console.log(`🔧 Positioning beacon: ${beacon.name} (${beacon.id}) with position [${beacon.position}]`);
            placePolar(beacon);
            // const pos = this.displayModel.positions.get(beacon.id);
            // console.log(`🔧 Beacon ${beacon.name} positioned at:`, pos);
            // if (pos) {
            //     console.log(`🔧 Display model now has ${this.displayModel.positions.size} total positions`);
            // }
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
                // console.log(`🔧 Star Charts: Moved "${station.name}" from ${preferredAngle.toFixed(1)}° to ${finalAngle.toFixed(1)}° to avoid collision`);
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
            // For navigation beacons, use y coordinate (vertical) instead of z (depth)
            const isBeacon = name.includes('Navigation Beacon');
            const angleCoord = isBeacon ? pos.y : pos.z;
            // console.log(`📐 getLiveAngleDegByName: ${name} isBeacon=${isBeacon}, using ${isBeacon ? 'pos.y' : 'pos.z'} = ${angleCoord}`);
            return (Math.atan2(angleCoord, pos.x) * 180) / Math.PI;
        }
            // Fallback for navigation beacons (exist in StarfieldManager)
        try {
            const beacons = this.viewManager?.starfieldManager?.navigationBeacons || [];
            // console.log(`🔍 getLiveAngleDegByName: Looking for "${name}" in ${beacons.length} beacons`);
            const b = beacons.find(bc => (bc.userData?.name || 'Navigation Beacon') === name);
            if (b) {
                // console.log(`✅ Found beacon "${name}" at position (${b.position.x.toFixed(1)}, ${b.position.y.toFixed(1)}, ${b.position.z.toFixed(1)})`);
                // console.log(`📐 Calculated angle: ${(Math.atan2(b.position.y, b.position.x) * 180) / Math.PI}°`);
                return (Math.atan2(b.position.y, b.position.x) * 180) / Math.PI;
            } else {
                // console.log(`❌ Beacon "${name}" not found. Available beacons:`);
                // beacons.forEach((bc, i) => {
                //     console.log(`  ${i+1}. "${bc.userData?.name || 'Navigation Beacon'}"`);
                // });
            }
        } catch (e) {
            console.error('❌ Error in beacon angle lookup:', e);
        }
        return null;
    }

    // Explicit beacon angle getter (by name) used when building infra positions
    getBeaconAngleDegByName(name) {
        try {
            const beacons = this.viewManager?.starfieldManager?.navigationBeacons || [];
            const b = beacons.find(bc => (bc.userData?.name || 'Navigation Beacon') === name);
            if (b && b.position) {
                return (Math.atan2(b.position.y, b.position.x) * 180) / Math.PI;
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
debug('UI', `🎯 Beacon ${object.name}: Using display model position (${pos.x}, ${pos.y}) - found in model`);
            }
            return pos;
        } else if (object.type === 'navigation_beacon') {
debug('UI', `🎯 Beacon ${object.name}: Display model position NOT found, falling back to calculation`);
        }
        if (Array.isArray(object.position)) {
            if (object.position.length >= 3) {
                // Special handling for navigation beacons - they use [x, y, z] format
                // where y is the vertical coordinate, not z
                const pos = object.type === 'navigation_beacon'
                    ? { x: object.position[0], y: object.position[1] }
                    : { x: object.position[0], y: object.position[2] };

                if (object.type === 'navigation_beacon') {
debug('UI', `🎯 Beacon ${object.name}: Using beacon position [${object.position[0]}, ${object.position[1]}, ${object.position[2]}] -> display (${pos.x}, ${pos.y})`);
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
debug('UI', `🎯 Beacon ${object.name}: Using polar position [${radiusAU}, ${angleDeg}] -> display (${pos.x}, ${pos.y})`);
                }
                return pos;
            }
        }
        if (object.type === 'navigation_beacon') {
debug('UTILITY', `🎯 Beacon ${object.name}: No position data found, using (0,0)`);
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
        
        // console.log(`🔍 Star Charts ViewBox: zoom=${this.currentZoomLevel}, container=${containerWidth}x${containerHeight} (ratio=${aspectRatio.toFixed(2)}), viewBox="${viewBox}", center=(${this.currentCenter.x}, ${this.currentCenter.y})`);
    }
    
    renderDiscoveredObjects() {
        // Render all discovered objects
        
        const discoveredObjects = this.getDiscoveredObjectsForRender();
        
        // DEBUG: Log undiscovered objects once per render cycle
        const undiscoveredCount = discoveredObjects.filter(obj => obj._isUndiscovered).length;
        if (!this._lastUndiscoveredCount || this._lastUndiscoveredCount !== undiscoveredCount) {
            this._lastUndiscoveredCount = undiscoveredCount;
            if (undiscoveredCount > 0) {
                // console.log(`🔴 DEBUG: Found ${undiscoveredCount} undiscovered objects to render`);
                // discoveredObjects.filter(obj => obj._isUndiscovered).forEach((obj, i) => {
                //     console.log(`  ${i + 1}. ${obj.name || obj.id} (${obj.type}) - _isUndiscovered: ${obj._isUndiscovered}`);
                // });
            } else {

            }
        }
        
        // Render orbit lines first (behind objects) to match LRS
        this.renderOrbitLines(discoveredObjects);
        
        // Render objects
        discoveredObjects.forEach(object => {
            this.renderObject(object);
        });
        
        // Render ship position icon
        this.renderShipPosition();
    }
    
    getDiscoveredObjectsForRender() {
        // Get all objects for current sector - discovered objects show normally, undiscovered show as "?"
        // In test mode, all objects show normally

        // Get sector data
        const sectorData = this.starChartsManager.objectDatabase?.sectors[this.starChartsManager.getCurrentSector()];
        if (!sectorData) return [];

        // Check if test mode is enabled (show all objects normally)
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

        // Add star (discovered = normal, undiscovered = with ? flag)
        if (sectorData.star) {
            const discovered = isDiscovered(sectorData.star.id);
            
            // Ensure complete data by fetching from database
            const completeStarData = this.starChartsManager.getObjectData(sectorData.star.id) || sectorData.star;
            
            allObjects.push({
                ...sectorData.star,
                ...completeStarData, // Merge complete data
                _isUndiscovered: !discovered && !isTestMode
            });
        }

        // Helper function to normalize station types
        const normalizeStationType = (type) => {
            const stationTypes = [
                'Research Lab', 'Refinery', 'Research Outpost', 'Frontier Outpost',
                'Communications Array', 'Shipyard', 'Storage Depot', 'Factory',
                'Colony', 'Mining Station', 'Mining Complex', 'Research Station',
                'Defense Platform', 'space_station'
            ];
            return stationTypes.includes(type) ? 'space_station' : type;
        };

        // Add celestial objects (discovered = normal, undiscovered = with ? flag)
        sectorData.objects.forEach(obj => {
            const discovered = isDiscovered(obj.id);
            const normalizedType = normalizeStationType(obj.type);
            
            // Ensure complete data by fetching from database
            const completeObjectData = this.starChartsManager.getObjectData(obj.id) || obj;
            
            if (discovered || isTestMode) {
                allObjects.push({ 
                    ...obj, 
                    ...completeObjectData, // Merge complete data
                    type: normalizedType 
                });
            } else {
                // Add undiscovered object with special flag
                allObjects.push({
                    ...obj,
                    ...completeObjectData, // Merge complete data
                    type: normalizedType,
                    _isUndiscovered: true
                });
            }
        });

        // Add infrastructure
        if (sectorData.infrastructure) {
            sectorData.infrastructure.stations?.forEach(station => {
                const discovered = isDiscovered(station.id);
                
                // Ensure complete data by fetching from database
                const completeStationData = this.starChartsManager.getObjectData(station.id) || station;
                
                if (discovered || isTestMode) {
                    // Normalize station type to match LRS icon rules
                    allObjects.push({ 
                        ...station, 
                        ...completeStationData, // Merge complete data
                        type: 'space_station' 
                    });
                } else {
                    // Add undiscovered station with special flag
                    allObjects.push({
                        ...station,
                        ...completeStationData, // Merge complete data
                        type: 'space_station',
                        _isUndiscovered: true
                    });
                }
            });

            sectorData.infrastructure.beacons?.forEach(beacon => {
                const discovered = isDiscovered(beacon.id);
                
                // Ensure complete data by fetching from database
                const completeBeaconData = this.starChartsManager.getObjectData(beacon.id) || beacon;
                
                if (discovered || isTestMode) {
                    // Normalize beacon type to match LRS icon rules
                    const beaconData = { 
                        ...beacon, 
                        ...completeBeaconData, // Merge complete data
                        type: 'navigation_beacon' 
                    };
                    allObjects.push(beaconData);
                } else {
                    // Add undiscovered beacon with special flag
                    allObjects.push({
                        ...beacon,
                        ...completeBeaconData, // Merge complete data
                        type: 'navigation_beacon',
                        _isUndiscovered: true
                    });
                }
            });
        }
        
        if (isTestMode) {
            // console.log(`🧪 Star Charts TEST MODE: Showing all ${allObjects.length} objects in sector`);
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
    
    matchesTargetId(targetId, objectId) {
        // Helper to match target IDs with normalization
        if (!targetId || !objectId) return false;
        if (targetId === objectId) return true;
        
        // Try normalized versions
        const norm = (id) => (typeof id === 'string' ? id.replace(/^a0_/i, 'A0_') : id);
        return norm(targetId) === norm(objectId);
    }
    
    matchesCurrentTarget(object) {
        // Enhanced target matching that handles both ID and name matching
        const currentTarget = this.starChartsManager.targetComputerManager?.currentTarget;
        if (!currentTarget || !object) return false;
        
        // Try ID matching first
        if (this.matchesTargetId(currentTarget.id, object.id)) {
            return true;
        }
        
        // Try name matching as fallback
        if (currentTarget.name && object.name && currentTarget.name === object.name) {
            return true;
        }
        
        // Try to get target data from target computer and match by name
        const targetData = this.starChartsManager.targetComputerManager.getCurrentTargetData?.();
        if (targetData && targetData.name && object.name && targetData.name === object.name) {
            return true;
        }
        
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
        orbit.style.pointerEvents = 'none'; // Prevent click events

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
        moonOrbit.style.pointerEvents = 'none'; // Prevent click events

        this.svg.appendChild(moonOrbit);

        // Add orbit highlight element for hover effects (like LRS)
        const moonOrbitHighlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        moonOrbitHighlight.setAttribute('cx', String(parentPos.x));
        moonOrbitHighlight.setAttribute('cy', String(parentPos.y));
        moonOrbitHighlight.setAttribute('r', String(moonOrbitRadius));
        moonOrbitHighlight.setAttribute('class', 'scanner-orbit-highlight'); // Use same CSS class as LRS
        moonOrbitHighlight.style.pointerEvents = 'none'; // Prevent click events

        this.svg.appendChild(moonOrbitHighlight);
    }

    renderUndiscoveredObject(x, y, object = null) {
        // Render undiscovered objects as "?" with unknown faction color (cyan)
        // Debug logging removed to reduce spam

        // Calculate zoom-scaled font size - ensure minimum readability even at max zoom
        const baseFontSize = 32; // Increased from 28 for better readability
        const zoomFactor = Math.sqrt(this.currentZoomLevel);
        const scaledFontSize = Math.max(16, baseFontSize / zoomFactor); // Minimum 16px for readability

        // Create hit box for interaction (invisible, reasonably sized for usability)
        const hitBoxSize = Math.max(30, scaledFontSize * 1.5); // Reasonable minimum and multiplier for clickability
        const hitBox = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        hitBox.setAttribute('cx', x);
        hitBox.setAttribute('cy', y);
        hitBox.setAttribute('r', hitBoxSize / 2);
        
        hitBox.setAttribute('fill', 'transparent');
        hitBox.setAttribute('stroke', 'none');
        
        hitBox.style.pointerEvents = 'all';
        hitBox.style.cursor = 'pointer'; // Finger cursor for interaction

        // Create text element for "?" (must be created before setting attributes)
        const questionMark = document.createElementNS('http://www.w3.org/2000/svg', 'text');

        // Add required attributes for interaction detection
        if (object) {
            // Use actual object ID for proper targeting, but hide the name for discovery mechanic
            hitBox.setAttribute('data-object-id', object.id || 'unknown');
            hitBox.setAttribute('data-name', 'Unknown'); // Always show "Unknown" for undiscovered objects
            questionMark.setAttribute('data-object-id', object.id || 'unknown');
            questionMark.setAttribute('data-name', 'Unknown'); // Always show "Unknown" for undiscovered objects
        } else {
            // Fallback for legacy calls without object
            hitBox.setAttribute('data-name', 'Unknown');
        }
        hitBox.classList.add('starchart-hitbox'); // Required class for interactive elements
        hitBox.setAttribute('title', 'Unknown Object - Click to zoom'); // Browser tooltip
        hitBox.setAttribute('data-tooltip', 'Unknown Object - Click to zoom'); // Custom tooltip data
        questionMark.setAttribute('x', x);
        questionMark.setAttribute('y', y);
        questionMark.setAttribute('text-anchor', 'middle');
        questionMark.setAttribute('dominant-baseline', 'middle');
        questionMark.setAttribute('fill', '#44ffff'); // Unknown faction color (cyan)
        questionMark.setAttribute('font-size', `${scaledFontSize}px`);
        questionMark.setAttribute('font-family', 'Courier New, monospace');
        questionMark.setAttribute('font-weight', 'bold');
        questionMark.setAttribute('class', 'star-charts-undiscovered');
        questionMark.textContent = '?';

        // Add glow effect for better visibility (scaled with zoom, minimum thickness)
        questionMark.setAttribute('stroke', '#44ffff');
        const strokeWidth = Math.max(0.5, 1.2 / Math.sqrt(this.currentZoomLevel)); // Minimum 0.5px, increased base
        questionMark.setAttribute('stroke-width', `${strokeWidth}px`);

        // Add hover effects for interactivity feedback
        const originalFill = '#44ffff';
        const hoverFill = '#66ffff';

        // Hit box hover effects
        hitBox.addEventListener('mouseenter', () => {
            questionMark.setAttribute('fill', hoverFill);
            questionMark.setAttribute('stroke', hoverFill);
        });

        hitBox.addEventListener('mouseleave', () => {
            questionMark.setAttribute('fill', originalFill);
            questionMark.setAttribute('stroke', originalFill);
        });

        // Click handler for zoom interaction and targeting
        hitBox.addEventListener('click', (event) => {
            event.stopPropagation();
            
            // Try to find object at the exact rendered position first
            let objectAtPosition = this.getObjectAtPosition(x, y);
            
            // If not found at exact position, try a wider search area
            if (!objectAtPosition) {
                objectAtPosition = this.getObjectAtPosition(x, y, 50); // Increase tolerance to 50 pixels
            }
            
            if (objectAtPosition) {

                // Try to select the object for targeting (same as discovered objects)
                this.selectObject(objectAtPosition);
            } else {
                // Fallback: just zoom to the location
                this.zoomToLocation(x, y);
                debug('STAR_CHARTS', `🖱️ Clicked unknown object at (${x}, ${y}), no object data found - zooming only`);

            }
        });

        // Add blinking effect for current targeting CPU target (same logic as discovered objects)
        if (object) {
            const currentTarget = this.starChartsManager.targetComputerManager?.currentTarget;
            const isCurrentTarget = this.matchesCurrentTarget(object);
            
            debug('TARGETING', `🎯 UNKNOWN BLINKING CHECK: Object ${object.name} (ID: ${object.id}) vs Current Target ${currentTarget?.name || 'none'} (ID: ${currentTarget?.id || 'none'}) - Match: ${isCurrentTarget}`);
            
            if (isCurrentTarget) {
                debug('TARGETING', `🎯 UNKNOWN BLINKING: Adding blink to ${object.name} (ID: ${object.id})`);
                questionMark.classList.add('target-blink');
                // Add CSS animation for blinking (reuse existing style)
                if (!document.querySelector('#star-charts-target-blink-style')) {
                    const style = document.createElement('style');
                    style.id = 'star-charts-target-blink-style';
                    style.textContent = `
                        .target-blink {
                            animation: targetBlink 1.5s infinite;
                        }
                        @keyframes targetBlink {
                            0%, 50% { opacity: 1; }
                            51%, 100% { opacity: 0.3; }
                        }
                    `;
                    document.head.appendChild(style);
                }
            } else {
                // Remove blinking if this is not the current target
                questionMark.classList.remove('target-blink');
            }
        }

        // Add hit box first (behind), then question mark on top
        this.svg.appendChild(hitBox);
        this.svg.appendChild(questionMark);

        // Debug logging removed to reduce spam
    }
    
    renderShipPosition() {
        // Render ship position icon on star chart
        
        const playerPos = this.starChartsManager.getPlayerPosition();

        if (!playerPos || !Array.isArray(playerPos) || playerPos.length < 3) {

            return; // No valid ship position
        }
        
        // Remove existing ship icon and label if they exist
        const existingIcon = this.svg.querySelector('.ship-position-icon');
        const existingLabel = this.svg.querySelector('.ship-position-label');
        if (existingIcon) existingIcon.remove();
        if (existingLabel) existingLabel.remove();
        
        // Use the same coordinate system as other objects for consistency
        // Create a temporary ship object to use getDisplayPosition()
        const shipObject = {
            id: 'player_ship',
            name: 'Your Ship',
            type: 'ship',
            position: playerPos
        };
        
        const pos = this.getDisplayPosition(shipObject);
        const x = pos.x;
        const z = pos.y; // getDisplayPosition returns {x, y} where y is the Z coordinate
        
        // Calculate zoom-scaled size
        const baseSize = 20;
        const zoomFactor = Math.sqrt(this.currentZoomLevel);
        const scaledSize = Math.max(8, baseSize / zoomFactor);
        
        // Create ship icon (diamond shape)
        const shipIcon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        const halfSize = scaledSize / 2;
        const points = [
            `${x},${z - halfSize}`,      // Top
            `${x + halfSize},${z}`,      // Right
            `${x},${z + halfSize}`,      // Bottom
            `${x - halfSize},${z}`       // Left
        ].join(' ');
        
        shipIcon.setAttribute('points', points);
        shipIcon.setAttribute('fill', '#00ff00');
        shipIcon.setAttribute('stroke', '#ffffff');
        shipIcon.setAttribute('stroke-width', '1');
        shipIcon.setAttribute('class', 'ship-position-icon');
        
        // Add data attributes for tooltip detection
        shipIcon.setAttribute('data-object-id', 'player_ship');
        shipIcon.setAttribute('data-name', 'Your Ship');
        
        // Add glow effect
        shipIcon.setAttribute('filter', 'drop-shadow(0 0 3px #00ff00)');
        
        // Add cursor pointer for interaction
        shipIcon.style.cursor = 'pointer';

        // Add click handler for ship icon
        shipIcon.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent the SVG click handler from firing
            this.zoomToLocation(x, z); // Zoom to ship's location like other objects
            debug('STAR_CHARTS', `🚀 Ship icon clicked - zooming to ship location (${x.toFixed(1)}, ${z.toFixed(1)})`);
        });

        this.svg.appendChild(shipIcon);

        // Add ship label
        const shipLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        shipLabel.setAttribute('x', x);
        shipLabel.setAttribute('y', z + halfSize + 15);
        shipLabel.setAttribute('text-anchor', 'middle');
        shipLabel.setAttribute('fill', '#00ff00');
        shipLabel.setAttribute('font-size', `${Math.max(10, scaledSize * 0.6)}px`);
        shipLabel.setAttribute('font-family', 'Courier New, monospace');
        shipLabel.setAttribute('font-weight', 'bold');
        shipLabel.setAttribute('class', 'ship-position-label');
        shipLabel.textContent = 'SHIP';
        
        this.svg.appendChild(shipLabel);

        // Verify the ship icon is actually in the DOM
        setTimeout(() => {
            const verifyIcon = this.svg.querySelector('.ship-position-icon');
            if (verifyIcon) {

                // Check SVG properties

                // Check if ship icon is within viewBox
                const viewBox = this.svg.getAttribute('viewBox');
                if (viewBox) {
                    const [minX, minY, width, height] = viewBox.split(' ').map(Number);

                    console.log('📐 Ship position relative to viewBox:', {
                        x: x - minX,
                        y: z - minY,
                        withinBounds: x >= minX && x <= minX + width && z >= minY && z <= minY + height
                    });
                }
            } else {

            }
        }, 100);
    }

    renderObject(object) {
        // Render a single object

        const pos = this.getDisplayPosition(object);
        const x = pos.x;
        const y = pos.y; // Use Z as Y for top-down view

        // Handle undiscovered objects - render as "?" with unknown faction color
        if (object._isUndiscovered) {
            // Debug logging removed to reduce spam
            this.renderUndiscoveredObject(x, y, object);
            return; // Don't render the normal object
        }

        const radius = this.getObjectDisplayRadius(object);
        const color = this.getObjectColor(object);

        if (object.type === 'navigation_beacon') {
            // console.log(`🎯 Rendering beacon ${object.name} at (${x}, ${y})`);
        }

        // Create larger invisible hit box first (rendered behind visual element)
        const hitBoxRadius = this.getObjectHitBoxRadius(object);
        let hitBox = null;

        if (object.type === 'space_station') {
            // Station hit box: larger rotated square
            const hitBoxSize = Math.max(12, hitBoxRadius * 2.4);
            hitBox = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            hitBox.setAttribute('x', x - hitBoxSize / 2);
            hitBox.setAttribute('y', y - hitBoxSize / 2);
            hitBox.setAttribute('width', hitBoxSize);
            hitBox.setAttribute('height', hitBoxSize);
            hitBox.setAttribute('transform', `rotate(45 ${x} ${y})`);
            hitBox.setAttribute('fill', 'transparent');
            hitBox.setAttribute('stroke', 'none');
            hitBox.style.pointerEvents = 'all';
        } else if (object.type === 'navigation_beacon') {
            // Beacon hit box: larger triangle
            const hitBoxSize = Math.max(20, hitBoxRadius * 4);
            const points = [
                `${x},${y - hitBoxSize / 1.2}`,
                `${x - hitBoxSize / 2},${y + hitBoxSize / 2}`,
                `${x + hitBoxSize / 2},${y + hitBoxSize / 2}`
            ].join(' ');
            hitBox = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            hitBox.setAttribute('points', points);
            hitBox.setAttribute('fill', 'transparent');
            hitBox.setAttribute('stroke', 'none');
            hitBox.style.pointerEvents = 'all';
        } else {
            // Default hit box: larger circle
            hitBox = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            hitBox.setAttribute('cx', x);
            hitBox.setAttribute('cy', y);
            hitBox.setAttribute('r', hitBoxRadius);
            hitBox.setAttribute('fill', 'transparent');
            hitBox.setAttribute('stroke', 'none');
            hitBox.style.pointerEvents = 'all';
        }

        // Add hit box attributes
        hitBox.setAttribute('data-object-id', object.id);
        hitBox.setAttribute('data-name', object.name);
        hitBox.setAttribute('class', 'starchart-hitbox');
        hitBox.style.cursor = 'pointer';

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
        
        // Add blinking effect for current targeting CPU target
        const currentTarget = this.starChartsManager.targetComputerManager?.currentTarget;
        const isCurrentTarget = this.matchesCurrentTarget(object);
        
        debug('TARGETING', `🎯 BLINKING CHECK: Object ${object.name} (ID: ${object.id}) vs Current Target ${currentTarget?.name || 'none'} (ID: ${currentTarget?.id || 'none'}) - Match: ${isCurrentTarget}`);
        
        if (isCurrentTarget) {
            debug('TARGETING', `🎯 BLINKING: Adding blink to ${object.name} (ID: ${object.id})`);
            element.classList.add('target-blink');
            // Add CSS animation for blinking
            if (!document.querySelector('#star-charts-target-blink-style')) {
                const style = document.createElement('style');
                style.id = 'star-charts-target-blink-style';
                style.textContent = `
                    .target-blink {
                        animation: targetBlink 1.5s infinite;
                    }
                    @keyframes targetBlink {
                        0%, 50% { opacity: 1; }
                        51%, 100% { opacity: 0.3; }
                    }
                `;
                document.head.appendChild(style);
            }
        } else {
            // Remove blinking if this is not the current target
            element.classList.remove('target-blink');
        }

        // Add hover effects like LRS
        this.addHoverEffects(element, object);

        // Add visual element first
        this.svg.appendChild(element);

        // Add hit box BEFORE visual element so it's behind
        this.svg.insertBefore(hitBox, element);

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

    getObjectHitBoxRadius(object) {
        // Get larger hit box radius for better clickability, especially when zoomed out
        // Fixed: Better zoom scaling and more generous hitboxes

        const baseRadius = object.visualRadius || 1;
        // Improved zoom factor: more responsive to zoom level changes
        const zoomFactor = Math.max(1.0, 4.0 / this.currentZoomLevel);

        // Hit boxes are 1.5-2x larger than visual elements for easier clicking
        switch (object.type) {
            case 'star':
                return Math.max(15, baseRadius * 6 * zoomFactor); // 1.5x visual size
            case 'planet':
                return Math.max(12, baseRadius * 4.5 * zoomFactor); // 1.5x visual size
            case 'moon':
                return Math.max(10, baseRadius * 5 * zoomFactor); // 1.5x visual size
            case 'space_station':
                return Math.max(8, (object.size || 1) * 3 * zoomFactor); // 1.5x visual size
            case 'navigation_beacon':
                return Math.max(6, 3 * zoomFactor); // 1.5x visual size
            default:
                return Math.max(8, baseRadius * 1.5 * zoomFactor); // 1.5x visual size
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
                return '#ffff44';
            case 'planet':
                return '#00aa00';
            case 'moon':
                return '#666666';
            default:
                return '#666666';
        }
    }

    renderVirtualWaypoints() {
        // Render mission waypoints from the waypoint system
        
        if (!window.waypointManager) return;
        
        const activeWaypoints = window.waypointManager.activeWaypoints;
        if (!activeWaypoints || activeWaypoints.size === 0) return;
        
        // Initialize Star Charts center if undefined (needed for coordinate conversion)
        if (this.centerX === undefined) this.centerX = 0;
        if (this.centerY === undefined) this.centerY = 0;
        if (this.currentZoomLevel === undefined) this.currentZoomLevel = 1;
        
        // Get active missions to find currently active waypoint
        let currentActiveWaypointId = null;
        if (window.missionAPI && window.missionAPI.activeMissions) {
            for (const [missionId, mission] of window.missionAPI.activeMissions) {
                if (mission.objectives) {
                    const activeObjective = mission.objectives.find(obj => 
                        (obj.state === 'active' || obj.status === 'ACTIVE') && obj.waypointId
                    );
                    if (activeObjective) {
                        currentActiveWaypointId = activeObjective.waypointId;
                        break; // Only show one active waypoint at a time
                    }
                }
            }
        }
        
        // Only render the currently active waypoint
        if (currentActiveWaypointId) {
            const waypoint = activeWaypoints.get(currentActiveWaypointId);
            if (waypoint) {
                // Auto-center on the active waypoint if Star Charts center is at origin (0,0)
                if (waypoint.position && waypoint.position.length >= 3) {
                    if (this.centerX === 0 && this.centerY === 0) {
                        debug('WAYPOINTS', `🎯 Auto-centering Star Charts on active waypoint: ${waypoint.name}`);
                        this.centerX = waypoint.position[0];
                        this.centerY = waypoint.position[2]; // Use Z as Y for 2D display
                        this.currentZoomLevel = 2.0; // Good zoom level for waypoint visibility
                    }
                }
                this.renderWaypointMarker(waypoint);
            }
        }
        
        // Render interrupted waypoint with special styling
        if (window.targetComputerManager?.hasInterruptedWaypoint()) {
            const interruptedWaypoint = window.targetComputerManager.getInterruptedWaypoint();
            if (interruptedWaypoint && window.waypointManager.getWaypoint(interruptedWaypoint.id)) {
                this.renderInterruptedWaypointMarker(interruptedWaypoint);
            }
        }
    }
    
    updateStatusBar() {
        // Update the status bar with current information
        
        const discoveredCount = this.starChartsManager.getDiscoveredObjects().length;
        const currentSector = this.starChartsManager.getCurrentSector();
        const zoomText = `Zoom: ${this.currentZoomLevel.toFixed(2)}x`;
        
        this.statusBar.innerHTML = `
            <div>Sector: ${currentSector} | Discovered: ${discoveredCount} objects</div>
            <div>${zoomText} | Click objects to target | Click to zoom in | Shift+click to zoom out</div>
        `;
    }
    
    /**
     * Convert 3D world coordinates to 2D screen coordinates for waypoint display
     * @param {number} worldX - World X coordinate
     * @param {number} worldZ - World Z coordinate (used as Y in 2D display)
     * @returns {Object|null} - Screen coordinates {x, y} or null if invalid
     */
    convertToScreenCoordinates(worldX, worldZ) {
        // In Star Charts, world coordinates map directly to SVG coordinates
        // The viewBox handles the transformation based on center and zoom
        return {
            x: worldX,
            y: worldZ  // Use Z as Y for 2D display
        };
    }
    
    /**
     * Render a single waypoint marker on the Star Charts
     * @param {Object} waypoint - Waypoint object to render
     */
    renderWaypointMarker(waypoint) {
        if (!waypoint.position || waypoint.position.length < 3) return;
        
        const [x, y, z] = waypoint.position;
        
        // Convert 3D position to 2D screen coordinates
        const screenPos = this.convertToScreenCoordinates(x, z);
        if (!screenPos) return;
        
        
        // Create waypoint marker group
        const waypointGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        waypointGroup.setAttribute('class', 'waypoint-marker');
        waypointGroup.setAttribute('data-waypoint-id', waypoint.id);
        
        // Determine waypoint color based on type and status
        const color = this.getWaypointColor(waypoint);
        const isTargeted = this.isWaypointTargeted(waypoint);
        
        // Create main waypoint circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', screenPos.x);
        circle.setAttribute('cy', screenPos.y);
        circle.setAttribute('r', isTargeted ? '8' : '6');
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', color);
        circle.setAttribute('stroke-width', isTargeted ? '3' : '2');
        circle.setAttribute('opacity', '0.9');
        
        // Add pulsing animation for active waypoints
        if (waypoint.status === 'active' || waypoint.status === 'targeted') {
            circle.innerHTML = `
                <animate attributeName="r" values="${isTargeted ? '8;12;8' : '6;9;6'}" 
                         dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.9;0.6;0.9" 
                         dur="2s" repeatCount="indefinite"/>
            `;
        }
        
        // Create waypoint crosshair
        const crosshairSize = isTargeted ? 12 : 8;
        const crosshair1 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        crosshair1.setAttribute('x1', screenPos.x - crosshairSize);
        crosshair1.setAttribute('y1', screenPos.y);
        crosshair1.setAttribute('x2', screenPos.x + crosshairSize);
        crosshair1.setAttribute('y2', screenPos.y);
        crosshair1.setAttribute('stroke', color);
        crosshair1.setAttribute('stroke-width', '1');
        crosshair1.setAttribute('opacity', '0.8');
        
        const crosshair2 = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        crosshair2.setAttribute('x1', screenPos.x);
        crosshair2.setAttribute('y1', screenPos.y - crosshairSize);
        crosshair2.setAttribute('x2', screenPos.x);
        crosshair2.setAttribute('y2', screenPos.y + crosshairSize);
        crosshair2.setAttribute('stroke', color);
        crosshair2.setAttribute('stroke-width', '1');
        crosshair2.setAttribute('opacity', '0.8');
        
        // Create waypoint label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', screenPos.x);
        label.setAttribute('y', screenPos.y - (isTargeted ? 15 : 12));
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-family', 'VT323, monospace');
        label.setAttribute('font-size', isTargeted ? '12' : '10');
        label.setAttribute('fill', color);
        label.setAttribute('opacity', '0.9');
        label.textContent = waypoint.name || 'Waypoint';
        
        // Add elements to group
        waypointGroup.appendChild(circle);
        waypointGroup.appendChild(crosshair1);
        waypointGroup.appendChild(crosshair2);
        waypointGroup.appendChild(label);
        
        // Add click handler for waypoint targeting
        waypointGroup.style.cursor = 'pointer';
        waypointGroup.addEventListener('click', (event) => {
            event.stopPropagation();
            this.handleWaypointClick(waypoint);
        });
        
        this.svg.appendChild(waypointGroup);
    }
    
    /**
     * Get waypoint color based on type and status
     * @param {Object} waypoint - Waypoint object
     * @returns {string} - CSS color string
     */
    getWaypointColor(waypoint) {
        const status = waypoint.status?.toLowerCase() || 'active';
        
        // Status-based colors take precedence
        if (status === 'completed') return '#00aa00';
        if (status === 'interrupted') return '#ff6600';
        if (status === 'triggered') return '#ffff44';
        
        // All active waypoints use consistent magenta color (matches system-wide waypoint color)
        return '#ff44ff'; // Bright magenta - matches TargetComputerManager and WaypointIndicator
    }
    
    /**
     * Check if waypoint is currently targeted
     * @param {Object} waypoint - Waypoint object
     * @returns {boolean} - True if waypoint is targeted
     */
    isWaypointTargeted(waypoint) {
        if (!window.targetComputerManager) return false;
        
        const currentTarget = window.targetComputerManager.currentTarget;
        return currentTarget && 
               currentTarget.isVirtual && 
               currentTarget.id === waypoint.id;
    }
    
    /**
     * Handle waypoint click for targeting
     * @param {Object} waypoint - Clicked waypoint
     */
    handleWaypointClick(waypoint) {
        if (!window.targetComputerManager) return;
        
        debug('WAYPOINTS', `🎯 Star Charts: Waypoint clicked: ${waypoint.name}`);
        
        // Target the waypoint using waypoint ID (same as Mission HUD)
        let success = false;
        if (window.targetComputerManager.targetWaypointViaCycle) {
            success = window.targetComputerManager.targetWaypointViaCycle(waypoint.id);
        } else if (window.targetComputerManager.setVirtualTarget) {
            // Fallback for backward compatibility
            success = window.targetComputerManager.setVirtualTarget(waypoint);
        }
        
        if (success) {
            debug('WAYPOINTS', `✅ Star Charts: Waypoint targeted successfully: ${waypoint.name}`);
            
            // Center and zoom on the waypoint
            this.centerOnWaypoint(waypoint);
            
            // Update target display to show new target
            setTimeout(() => this.updateCurrentTargetDisplay(), 100);
        } else {
            console.error('❌ Star Charts: Failed to target waypoint:', waypoint.name);
        }
    }

    /**
     * Center Star Charts on a waypoint and zoom appropriately
     * @param {Object} waypoint - Waypoint to center on
     */
    centerOnWaypoint(waypoint) {
        if (!waypoint.position || waypoint.position.length < 3) {
            console.error('❌ Star Charts: Invalid waypoint position for centering:', waypoint.position);
            return;
        }
        
        const [x, y, z] = waypoint.position;
        
        // Initialize center if undefined
        if (this.centerX === undefined) this.centerX = 0;
        if (this.centerY === undefined) this.centerY = 0;
        if (this.currentZoomLevel === undefined) this.currentZoomLevel = 1;
        
        // Set center position to waypoint location
        this.centerX = x;
        this.centerY = z; // Use Z as Y for 2D display
        
        // Set appropriate zoom level for waypoint viewing
        this.currentZoomLevel = 3.0; // Good detail level for waypoints
        
        // Re-render with new center and zoom
        this.render();
        
        debug('WAYPOINTS', `🎯 Star Charts: Centered on waypoint ${waypoint.name} at [${x}, ${z}] with zoom ${this.currentZoomLevel}x`);
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
    
    updateCurrentTargetDisplay() {
        // Show current target information in the details panel
        if (!this.detailsPanel) return;
        
        // Get current target from target computer
        const currentTarget = window.targetComputerManager?.currentTarget;
        
        
        if (!currentTarget) {
            this.detailsPanel.innerHTML = `
                <div class="target-info" style="font-family: 'VT323', monospace; font-size: 14px; line-height: 1.4; color: #ccc;">
                    <h3 style="color: #ffff00; margin: 0 0 15px 0; font-size: 16px;">🎯 CURRENT TARGET</h3>
                    <div style="color: #888; font-style: italic;">
                        No target selected
                    </div>
                    <div style="margin-top: 15px; color: #666; font-size: 12px;">
                        • Click objects to target them<br>
                        • Use TAB to cycle targets<br>
                        • Click waypoint hyperlinks to target waypoints
                    </div>
                </div>
            `;
            return;
        }
        
        // DEBUG: Check target object properties
        console.log('🔍 TARGET DEBUG:');
        console.log('  Name:', currentTarget.name);
        console.log('  Type:', currentTarget.type);
        console.log('  _isUndiscovered:', currentTarget._isUndiscovered);
        console.log('  ID:', currentTarget.id);
        console.log('  All keys:', Object.keys(currentTarget));
        console.log('  Full object:', currentTarget);
        
        // Apply the same discovery logic as Star Charts tooltips
        // Process the target through the same system that determines tooltip text
        const processedTarget = this.ensureObjectHasName(currentTarget);
        
        // Check if this object should be treated as undiscovered
        // Use the same logic as Star Charts tooltip system
        let isUndiscovered = false;
        let displayName = processedTarget?.name || 'Unknown';
        
        // Check if object is undiscovered using discovery system
        let matchingDiscoveredId = null; // Declare in outer scope
        if (processedTarget && !processedTarget._isShip && currentTarget.type !== 'waypoint') {
            // Use the Star Charts discovery system to determine if object should be hidden
            // Check if this object is in the discovered objects list
            const discoveredObjects = this.starChartsManager?.getDiscoveredObjects() || [];
            
            // Discovered objects are string identifiers, check multiple possible matches
            const isDiscovered = discoveredObjects.some(discoveredId => {
                // Direct string match
                if (discoveredId === currentTarget.id) {
                    matchingDiscoveredId = discoveredId;
                    return true;
                }
                
                // Check if target has a string identifier that matches
                if (currentTarget.userData?.originalId === discoveredId) {
                    matchingDiscoveredId = discoveredId;
                    return true;
                }
                if (currentTarget.name === discoveredId) {
                    matchingDiscoveredId = discoveredId;
                    return true;
                }
                
                // Check if discovered ID contains target name (case insensitive)
                const targetName = currentTarget.name?.toLowerCase().replace(/\s+/g, '_');
                if (targetName && discoveredId.toLowerCase().includes(targetName)) {
                    matchingDiscoveredId = discoveredId;
                    return true;
                }
                
                return false;
            });
            
            
            // If not in discovered list, treat as undiscovered
            if (!isDiscovered) {
                isUndiscovered = true;
                displayName = 'Unknown';
            }
        }
        
        // Get rich object data from Star Charts manager using the correct discovered ID
        let richObject = currentTarget;
        let matchingId = matchingDiscoveredId || currentTarget.id;
        if (this.starChartsManager?.getObjectData) {
            const dbObject = this.starChartsManager.getObjectData(matchingId);
            if (dbObject) {
                richObject = dbObject;
            }
        }
        
        
        if (isUndiscovered) {
            // Show minimal info for undiscovered objects
            const targetHTML = `
                <div class="target-info" style="font-family: 'VT323', monospace; font-size: 14px; line-height: 1.4;">
                    <h3 style="color: #ffff00; margin: 0 0 15px 0; font-size: 16px;">🎯 CURRENT TARGET</h3>
                    
                    <div style="margin-bottom: 15px; padding: 8px; border-left: 3px solid #666; background: rgba(0,0,0,0.3);">
                        <div style="color: #666; font-weight: bold; font-size: 16px;">Undiscovered Object</div>
                        <div style="color: #888; margin-top: 5px; font-style: italic;">
                            Move closer to discover more information
                        </div>
                    </div>
                    
                    <div style="margin-top: 15px; color: #666; font-size: 12px;">
                        • Approach objects to discover them<br>
                        • Use TAB to cycle to next target<br>
                        • Target waypoints from Mission HUD
                    </div>
                </div>
            `;
            this.detailsPanel.innerHTML = targetHTML;
            return;
        }
        
        
        // Use the rich object details format from the original showObjectDetails method
        let detailsHTML = `
            <div class="object-details">
                <h3 style="color: #00ff00; margin-top: 0;">${richObject.name || currentTarget.name}</h3>
                <div><strong>Type:</strong> ${richObject.type || currentTarget.type}</div>
                <div><strong>Class:</strong> ${richObject.class || 'Unknown'}</div>
        `;
        
        // Add position info (robust for DB cartesian, polar, or normalized positions)
        try {
            let posBlock = '';
            if (Array.isArray(currentTarget.position) && currentTarget.position.length >= 3 &&
                typeof currentTarget.position[0] === 'number') {
                posBlock = `
                    X: ${currentTarget.position[0].toFixed(1)}<br>
                    Y: ${currentTarget.position[1].toFixed(1)}<br>
                    Z: ${currentTarget.position[2].toFixed(1)}
                `;
            } else if (Array.isArray(currentTarget.position) && currentTarget.position.length === 2 &&
                       typeof currentTarget.position[0] === 'number') {
                const radiusAU = currentTarget.position[0];
                const angleDeg = currentTarget.position[1];
                posBlock = `
                    Radius (AU): ${radiusAU.toFixed(3)}<br>
                    Angle: ${angleDeg.toFixed(1)}°
                `;
            } else if (currentTarget.position && typeof currentTarget.position === 'object') {
                // Handle Three.js Vector3 or object with x,y,z properties
                posBlock = `
                    X: ${(currentTarget.position.x || 0).toFixed(1)}<br>
                    Y: ${(currentTarget.position.y || 0).toFixed(1)}<br>
                    Z: ${(currentTarget.position.z || 0).toFixed(1)}
                `;
            } else {
                // Use normalized display position (top-down X/Z)
                const p = this.getDisplayPosition(currentTarget);
                if (p) {
                    posBlock = `
                        X: ${p.x.toFixed(1)}<br>
                        Z: ${p.y.toFixed(1)}
                    `;
                }
            }
            if (posBlock) {
                detailsHTML += `
                    <div><strong>Position:</strong></div>
                    <div style="margin-left: 10px;">${posBlock}</div>
                `;
            }
        } catch (e) {}
        
        // Add orbit info for celestial bodies
        if (richObject.orbit) {
            detailsHTML += `
                <div><strong>Orbital Data:</strong></div>
                <div style="margin-left: 10px;">
                    Parent: ${richObject.orbit.parent}<br>
                    Radius: ${richObject.orbit.radius.toFixed(1)} km<br>
                    Period: ${richObject.orbit.period.toFixed(1)} days
                </div>
            `;
        }
        
        // Add station-specific info
        if (richObject.faction) {
            detailsHTML += `<div><strong>Faction:</strong> ${richObject.faction}</div>`;
        }
        
        if (richObject.services && richObject.services.length > 0) {
            detailsHTML += `
                <div><strong>Services:</strong></div>
                <div style="margin-left: 10px;">
                    ${richObject.services.join('<br>')}
                </div>
            `;
        }
        
        // Add description
        if (richObject.description) {
            detailsHTML += `
                <div style="margin-top: 10px;">
                    <strong>Description:</strong><br>
                    <em>${richObject.description}</em>
                </div>
            `;
        }
        
        // Add intel brief for stations
        if (richObject.intel_brief) {
            detailsHTML += `
                <div style="margin-top: 10px; color: #ffff00;">
                    <strong>Intel Brief:</strong><br>
                    <em>${richObject.intel_brief}</em>
                </div>
            `;
        }
        
        detailsHTML += '</div>';
        
        const targetHTML = detailsHTML;
        
        this.detailsPanel.innerHTML = targetHTML;
    }
    
}
