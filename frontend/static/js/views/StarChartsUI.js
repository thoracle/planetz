import { debug } from '../debug.js';
import { StarChartsPanController } from './starcharts/StarChartsPanController.js';
import { StarChartsTooltipManager } from './starcharts/StarChartsTooltipManager.js';
import { StarChartsCoordinateSystem } from './starcharts/StarChartsCoordinateSystem.js';
import { StarChartsDisplayModel } from './starcharts/StarChartsDisplayModel.js';
import { StarChartsObjectRenderer } from './starcharts/StarChartsObjectRenderer.js';

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

        // Memory leak prevention: track event handlers for cleanup
        this._boundKeydownHandler = null;
        this._boundCloseHandler = null;
        this._boundSvgClickHandler = null;
        this._boundSvgMouseMoveHandler = null;
        this._boundSvgMouseLeaveHandler = null;

        // Pan controller (handles mouse/touch drag events)
        this.panController = null;

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

        // Initialize pan controller (must be after createInterface so svg exists)
        this.panController = new StarChartsPanController(this);

        // Initialize tooltip manager
        this.tooltipManager = new StarChartsTooltipManager(this);

        // Initialize coordinate system manager
        this.coordinateSystem = new StarChartsCoordinateSystem(this);

        // Initialize display model manager
        this.displayModelManager = new StarChartsDisplayModel(this);

        // Initialize object renderer
        this.objectRenderer = new StarChartsObjectRenderer(this);

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
        
        debug('UI', '✅ Star Charts tooltip element created');
        debug('UI', '🔧 TOOLTIP FIX VERSION LOADED - v2.0 with enhanced object data loading');
        
        // Add to document
        document.body.appendChild(this.container);
    }
    
    setupEventListeners() {
        // Setup event listeners for interaction (store handlers for cleanup)

        // Close button
        this._boundCloseHandler = () => {
            this.viewManager.restorePreviousView();
            this.hide(false);
        };
        this.closeButton.addEventListener('click', this._boundCloseHandler);

        // Keyboard controls (C key for Star Charts)
        this._boundKeydownHandler = (event) => {
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
        };
        document.addEventListener('keydown', this._boundKeydownHandler);

        // SVG click handling
        this._boundSvgClickHandler = (event) => {
            this.handleMapClick(event);
        };
        this.svg.addEventListener('click', this._boundSvgClickHandler);

        // Double-click behavior removed for new zoom model

        // Pan/drag functionality (delegated to controller)
        this.panController.setupPanControls();

        // Mouse move for tooltips
        this._boundSvgMouseMoveHandler = (event) => {
            this.handleMouseMove(event);
        };
        this.svg.addEventListener('mousemove', this._boundSvgMouseMoveHandler);

        this._boundSvgMouseLeaveHandler = () => {
            this.hideTooltip();
        };
        this.svg.addEventListener('mouseleave', this._boundSvgMouseLeaveHandler);
    }
    
    handleMapClick(event) {
        // Handle clicks on the map - match LRS click detection exactly

        // Don't process clicks if we just finished dragging
        if (this.panController && this.panController.isDragging()) {
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
                        this.hideTooltip();
                    }
                }
            }
        } else {
            // No interactive element found - hide tooltip
            this.hideTooltip();
        }
    }
    
    // ========================================
    // Pan Controller Delegation Methods
    // ========================================

    /**
     * Convert screen pixels to world units (delegated to panController)
     * @param {number} screenPixels - Screen pixels
     * @returns {number} World units
     */
    screenPixelsToWorldUnits(screenPixels) {
        return this.panController.screenPixelsToWorldUnits(screenPixels);
    }

    /**
     * Convert screen delta to world delta (delegated to panController)
     * @param {number} screenDeltaX - Screen X delta
     * @param {number} screenDeltaY - Screen Y delta
     * @returns {Object} World delta {x, y}
     */
    screenDeltaToWorldDelta(screenDeltaX, screenDeltaY) {
        return this.panController.screenDeltaToWorldDelta(screenDeltaX, screenDeltaY);
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

            debug('STAR_CHARTS', `🔍 DEBUG OBJECT: Object properties before adding:`, {
                name: object.name,
                type: object.type,
                _isUndiscovered: object._isUndiscovered,
                id: object.id
            });

            // Add the necessary properties directly to the object for undiscovered targeting
            object.discovered = false;
            object.diplomacy = 'unknown';
            object.faction = 'Unknown';

            debug('STAR_CHARTS', `🔍 DEBUG PROPERTIES: Set properties on object:`, {
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

    // ========================================
    // Coordinate system methods (delegated to StarChartsCoordinateSystem)
    // ========================================

    screenToWorld(screenX, screenY) {
        return this.coordinateSystem.screenToWorld(screenX, screenY);
    }

    getWorldSize() {
        return this.coordinateSystem.getWorldSize();
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
            debug('STAR_CHARTS', '🌟 Available objects for hover detection:', {
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
        return this.coordinateSystem.worldToScreen(object);
    }

    // ========================================
    // Tooltip methods (delegated to StarChartsTooltipManager)
    // ========================================

    ensureObjectDataLoaded() {
        return this.tooltipManager.ensureObjectDataLoaded();
    }

    ensureObjectHasName(object) {
        return this.tooltipManager.ensureObjectHasName(object);
    }

    showTooltip(screenX, screenY, object) {
        this.tooltipManager.showTooltip(screenX, screenY, object);
    }

    showObjectDetails(object) {
        this.tooltipManager.showObjectDetails(object);
    }

    hideTooltip() {
        this.tooltipManager.hideTooltip();
    }

    clearObjectDetails() {
        this.tooltipManager.clearObjectDetails();
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
            this.hideTooltip();

            // Remove target indicator when hiding
            this.removeTargetIndicator();
            
            // Clear manual navigation selection flag when user closes Star Charts
            // This allows the system to auto-select targets again when appropriate
            if (this.starChartsManager?.targetComputerManager) {
                this.starChartsManager.targetComputerManager.isManualNavigationSelection = false;
                debug('TARGETING', '🗺️ Star Charts closed - clearing manual navigation selection flag');
            }
            
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

    // ========================================
    // Display model methods (delegated to StarChartsDisplayModel)
    // ========================================

    buildDisplayModel() {
        this.displayModelManager.buildDisplayModel();
    }

    positionStationsWithCollisionDetection(stations, placePolar) {
        this.displayModelManager.positionStationsWithCollisionDetection(stations, placePolar);
    }

    snapToNearestRing(radiusDisplay, isStation = false) {
        return this.displayModelManager.snapToNearestRing(radiusDisplay, isStation);
    }

    getSolarSystemManagerRef() {
        return this.displayModelManager.getSolarSystemManagerRef();
    }

    findBodyByName(name) {
        return this.displayModelManager.findBodyByName(name);
    }

    getLiveAngleDegForPlanet(object) {
        return this.displayModelManager.getLiveAngleDegForPlanet(object);
    }

    getLiveAngleDegForMoon(object, parentId) {
        return this.displayModelManager.getLiveAngleDegForMoon(object, parentId);
    }

    getLiveAngleDegByName(name) {
        return this.displayModelManager.getLiveAngleDegByName(name);
    }

    getBeaconAngleDegByName(name) {
        return this.displayModelManager.getBeaconAngleDegByName(name);
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

    getDisplayPosition(object) {
        return this.coordinateSystem.getDisplayPosition(object);
    }

    getSectorStarDisplayPosition() {
        return this.coordinateSystem.getSectorStarDisplayPosition();
    }

    setupCoordinateSystem() {
        this.coordinateSystem.setupCoordinateSystem();
    }
    
    renderDiscoveredObjects() {
        // Render all discovered objects

        const discoveredObjects = this.getDiscoveredObjectsForRender();

        // DEBUG: Log undiscovered objects once per render cycle
        const undiscoveredCount = discoveredObjects.filter(obj => obj._isUndiscovered).length;
        if (!this._lastUndiscoveredCount || this._lastUndiscoveredCount !== undiscoveredCount) {
            this._lastUndiscoveredCount = undiscoveredCount;
        }

        // Render orbit lines first (behind objects) to match LRS
        this.objectRenderer.renderOrbitLines(discoveredObjects);

        // Render objects
        discoveredObjects.forEach(object => {
            this.objectRenderer.renderObject(object);
        });

        // Render ship position icon
        this.objectRenderer.renderShipPosition();
    }
    
    getDiscoveredObjectsForRender() {
        return this.displayModelManager.getDiscoveredObjectsForRender();
    }

    isTestModeEnabled() {
        return this.displayModelManager.isTestModeEnabled();
    }

    matchesTargetId(targetId, objectId) {
        return this.displayModelManager.matchesTargetId(targetId, objectId);
    }

    matchesCurrentTarget(object) {
        return this.displayModelManager.matchesCurrentTarget(object);
    }
    
    // Delegation methods to objectRenderer
    renderVirtualWaypoints() {
        this.objectRenderer.renderVirtualWaypoints();
    }

    findObjectById(objectId) {
        return this.objectRenderer.findObjectById(objectId);
    }

    findObjectByName(name) {
        return this.objectRenderer.findObjectByName(name);
    }

    findCurrentSystemStar() {
        return this.objectRenderer.findCurrentSystemStar();
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

    /**
     * Clean up all resources and event listeners
     */
    dispose() {
        debug('UI', '🧹 Disposing StarChartsUI...');

        // Dispose pan controller (handles its own event listener cleanup)
        if (this.panController) {
            this.panController.dispose();
            this.panController = null;
        }

        // Dispose tooltip manager
        if (this.tooltipManager) {
            this.tooltipManager.dispose();
            this.tooltipManager = null;
        }

        // Dispose coordinate system manager
        if (this.coordinateSystem) {
            this.coordinateSystem.dispose();
            this.coordinateSystem = null;
        }

        // Dispose display model manager
        if (this.displayModelManager) {
            this.displayModelManager.dispose();
            this.displayModelManager = null;
        }

        // Dispose object renderer
        if (this.objectRenderer) {
            this.objectRenderer.dispose();
            this.objectRenderer = null;
        }

        // Remove document-level event listeners
        if (this._boundKeydownHandler) {
            document.removeEventListener('keydown', this._boundKeydownHandler);
            this._boundKeydownHandler = null;
        }

        // Remove close button handler
        if (this._boundCloseHandler && this.closeButton) {
            this.closeButton.removeEventListener('click', this._boundCloseHandler);
            this._boundCloseHandler = null;
        }

        // Remove SVG event handlers
        if (this.svg) {
            if (this._boundSvgClickHandler) {
                this.svg.removeEventListener('click', this._boundSvgClickHandler);
                this._boundSvgClickHandler = null;
            }

            if (this._boundSvgMouseMoveHandler) {
                this.svg.removeEventListener('mousemove', this._boundSvgMouseMoveHandler);
                this._boundSvgMouseMoveHandler = null;
            }

            if (this._boundSvgMouseLeaveHandler) {
                this.svg.removeEventListener('mouseleave', this._boundSvgMouseLeaveHandler);
                this._boundSvgMouseLeaveHandler = null;
            }
        }

        // Remove container from DOM
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }

        // Remove tooltip from DOM
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }

        // Null out references
        this.container = null;
        this.closeButton = null;
        this.title = null;
        this.contentWrapper = null;
        this.mapContainer = null;
        this.svg = null;
        this.detailsPanel = null;
        this.statusBar = null;
        this.tooltip = null;
        this.viewManager = null;
        this.starChartsManager = null;
        this.displayModel = null;

        debug('UI', '🧹 StarChartsUI disposed');
    }

    /**
     * Alias for dispose() for consistency with other components
     */
    destroy() {
        this.dispose();
    }

}
