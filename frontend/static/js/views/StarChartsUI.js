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
        this.maxZoomLevel = 3;
        this.zoomLevels = {
            overview: 1,
            medium: 2,
            detail: 3,
            beacon_ring: 0.4  // Special zoom for beacon ring
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
        
        // Create the modal container (identical to LRS)
        this.container = document.createElement('div');
        this.container.className = 'star-charts-scanner';
        
        // Add Star Charts specific styling
        this.container.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.95);
            z-index: 1000;
            display: none;
            font-family: 'Courier New', monospace;
            color: #00ff00;
        `;
        
        // Create the close button
        this.closeButton = document.createElement('div');
        this.closeButton.innerHTML = 'X';
        this.closeButton.className = 'close-button';
        this.closeButton.style.cssText = `
            position: absolute;
            top: 20px;
            right: 30px;
            font-size: 24px;
            color: #ff4444;
            cursor: pointer;
            z-index: 1001;
            user-select: none;
        `;
        this.container.appendChild(this.closeButton);
        
        // Create title
        this.title = document.createElement('div');
        this.title.className = 'star-charts-title';
        this.title.innerHTML = 'STAR CHARTS - NAVIGATION DATABASE';
        this.title.style.cssText = `
            position: absolute;
            top: 20px;
            left: 30px;
            font-size: 18px;
            color: #00ff00;
            font-weight: bold;
        `;
        this.container.appendChild(this.title);
        
        // Create main content wrapper
        this.contentWrapper = document.createElement('div');
        this.contentWrapper.className = 'star-charts-content-wrapper';
        this.contentWrapper.style.cssText = `
            position: absolute;
            top: 80px;
            left: 30px;
            right: 350px;
            bottom: 30px;
            overflow: hidden;
        `;
        this.container.appendChild(this.contentWrapper);
        
        // Create the scanner map container
        this.mapContainer = document.createElement('div');
        this.mapContainer.className = 'star-charts-map-container';
        this.mapContainer.style.cssText = `
            width: 100%;
            height: 100%;
            border: 2px solid #00ff00;
            background: #000;
            position: relative;
            overflow: hidden;
        `;
        this.contentWrapper.appendChild(this.mapContainer);
        
        // Create SVG for rendering
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.style.cssText = `
            width: 100%;
            height: 100%;
            cursor: crosshair;
        `;
        this.mapContainer.appendChild(this.svg);
        
        // Create details panel
        this.detailsPanel = document.createElement('div');
        this.detailsPanel.className = 'star-charts-details';
        this.detailsPanel.style.cssText = `
            position: absolute;
            top: 80px;
            right: 30px;
            width: 300px;
            bottom: 30px;
            border: 2px solid #00ff00;
            background: rgba(0, 0, 0, 0.8);
            padding: 15px;
            overflow-y: auto;
            font-size: 12px;
            line-height: 1.4;
        `;
        this.container.appendChild(this.detailsPanel);
        
        // Create status bar
        this.statusBar = document.createElement('div');
        this.statusBar.className = 'star-charts-status';
        this.statusBar.style.cssText = `
            position: absolute;
            bottom: 10px;
            left: 30px;
            right: 30px;
            height: 30px;
            color: #ffff00;
            font-size: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        this.container.appendChild(this.statusBar);
        
        // Create tooltip
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'star-charts-tooltip';
        this.tooltip.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.9);
            color: #ffff00;
            padding: 5px 10px;
            border: 1px solid #ffff00;
            font-size: 11px;
            pointer-events: none;
            z-index: 1002;
            display: none;
        `;
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
            if (this.container.style.display !== 'none') {
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
            }
        });
        
        // SVG click handling
        this.svg.addEventListener('click', (event) => {
            this.handleMapClick(event);
        });
        
        // SVG double-click for super zoom
        this.svg.addEventListener('dblclick', (event) => {
            event.preventDefault();
            this.currentZoomLevel = this.zoomLevels.beacon_ring;
            this.currentCenter = { x: 0, y: 0 };
            this.render();
        });
        
        // Mouse move for tooltips
        this.svg.addEventListener('mousemove', (event) => {
            this.handleMouseMove(event);
        });
        
        this.svg.addEventListener('mouseleave', () => {
            this.tooltip.style.display = 'none';
        });
    }
    
    handleMapClick(event) {
        // Handle clicks on the map
        
        const rect = this.svg.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Convert screen coordinates to world coordinates
        const worldPos = this.screenToWorld(x, y);
        
        // Check if click hit any object
        const clickedObject = this.getObjectAtPosition(worldPos.x, worldPos.y);
        
        if (clickedObject) {
            // Object clicked - select it
            this.selectObject(clickedObject);
        } else {
            // Empty space clicked - zoom out
            this.zoomOut();
        }
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
    
    selectObject(object) {
        // Select an object for targeting and details
        
        this.lastClickedObject = object;
        
        // Show object details
        this.showObjectDetails(object);
        
        // Integrate with Target Computer
        if (this.starChartsManager.selectObjectById(object.id)) {
            console.log(`🎯 Star Charts: Selected ${object.name} for targeting`);
        }
        
        // Zoom in on object if not at max zoom
        if (this.currentZoomLevel < this.maxZoomLevel) {
            this.currentZoomLevel = Math.min(this.maxZoomLevel, this.currentZoomLevel + 1);
            this.currentCenter = { x: object.position[0], y: object.position[2] };
            this.render();
        }
    }
    
    zoomOut() {
        // Zoom out one level
        
        if (this.currentZoomLevel > this.zoomLevels.beacon_ring) {
            this.currentZoomLevel = Math.max(this.zoomLevels.beacon_ring, this.currentZoomLevel - 1);
            
            // Reset center when zooming out to overview
            if (this.currentZoomLevel === this.zoomLevels.overview) {
                this.currentCenter = { x: 0, y: 0 };
            }
            
            this.render();
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
        
        const baseSize = 1000;
        return baseSize / this.currentZoomLevel;
    }
    
    getObjectAtPosition(worldX, worldY, tolerance = 20) {
        // Get object at world position
        
        const discoveredObjects = this.getDiscoveredObjectsForRender();
        
        for (const object of discoveredObjects) {
            const dx = object.position[0] - worldX;
            const dy = object.position[2] - worldY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const objectRadius = this.getObjectDisplayRadius(object);
            if (distance <= objectRadius + tolerance) {
                return object;
            }
        }
        
        return null;
    }
    
    showTooltip(screenX, screenY, object) {
        // Show tooltip for hovered object
        
        this.tooltip.innerHTML = `
            <div><strong>${object.name}</strong></div>
            <div>Type: ${object.type}</div>
            <div>Class: ${object.class || 'Unknown'}</div>
        `;
        
        this.tooltip.style.left = (screenX + 10) + 'px';
        this.tooltip.style.top = (screenY - 10) + 'px';
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
        
        // Add position info
        if (object.position) {
            detailsHTML += `
                <div><strong>Position:</strong></div>
                <div style="margin-left: 10px;">
                    X: ${object.position[0].toFixed(1)}<br>
                    Y: ${object.position[1].toFixed(1)}<br>
                    Z: ${object.position[2].toFixed(1)}
                </div>
            `;
        }
        
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
            this.container.style.display = 'block';
            
            // Reset zoom and center
            this.currentZoomLevel = this.zoomLevels.overview;
            this.currentCenter = { x: 0, y: 0 };
            this.lastClickedObject = null;
            
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
            this.container.style.display = 'none';
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
        
        // Set up coordinate system
        this.setupCoordinateSystem();
        
        // Render discovered objects
        this.renderDiscoveredObjects();
        
        // Render virtual waypoints
        this.renderVirtualWaypoints();
        
        // Update status bar
        this.updateStatusBar();
    }
    
    setupCoordinateSystem() {
        // Setup SVG coordinate system based on zoom level
        
        const worldSize = this.getWorldSize();
        const viewBox = `${this.currentCenter.x - worldSize/2} ${this.currentCenter.y - worldSize/2} ${worldSize} ${worldSize}`;
        this.svg.setAttribute('viewBox', viewBox);
    }
    
    renderDiscoveredObjects() {
        // Render all discovered objects
        
        const discoveredObjects = this.getDiscoveredObjectsForRender();
        
        // Render orbit lines first (behind objects)
        this.renderOrbitLines(discoveredObjects);
        
        // Render objects
        discoveredObjects.forEach(object => {
            this.renderObject(object);
        });
    }
    
    getDiscoveredObjectsForRender() {
        // Get all discovered objects for current sector
        
        const discoveredIds = this.starChartsManager.getDiscoveredObjects();
        const allObjects = [];
        
        // Get sector data
        const sectorData = this.starChartsManager.objectDatabase?.sectors[this.starChartsManager.getCurrentSector()];
        if (!sectorData) return allObjects;
        
        // Add discovered star
        if (sectorData.star && discoveredIds.includes(sectorData.star.id)) {
            allObjects.push(sectorData.star);
        }
        
        // Add discovered celestial objects
        sectorData.objects.forEach(obj => {
            if (discoveredIds.includes(obj.id)) {
                allObjects.push(obj);
            }
        });
        
        // Add discovered infrastructure
        if (sectorData.infrastructure) {
            sectorData.infrastructure.stations?.forEach(station => {
                if (discoveredIds.includes(station.id)) {
                    allObjects.push(station);
                }
            });
            
            sectorData.infrastructure.beacons?.forEach(beacon => {
                if (discoveredIds.includes(beacon.id)) {
                    allObjects.push(beacon);
                }
            });
        }
        
        return allObjects;
    }
    
    renderOrbitLines(objects) {
        // Render orbital paths for planets and moons
        
        objects.forEach(object => {
            if (object.orbit && object.type !== 'star') {
                this.renderOrbitLine(object);
            }
        });
    }
    
    renderOrbitLine(object) {
        // Render orbit line for an object
        
        if (!object.orbit) return;
        
        const orbitRadius = object.orbit.radius / 149.6; // Convert to AU for display
        
        // Create orbit circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', 0); // Orbits around system center
        circle.setAttribute('cy', 0);
        circle.setAttribute('r', orbitRadius);
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', '#444');
        circle.setAttribute('stroke-width', '0.5');
        circle.setAttribute('stroke-dasharray', '2,2');
        circle.setAttribute('opacity', '0.6');
        
        this.svg.appendChild(circle);
    }
    
    renderObject(object) {
        // Render a single object
        
        const x = object.position[0];
        const y = object.position[2]; // Use Z as Y for top-down view
        const radius = this.getObjectDisplayRadius(object);
        const color = this.getObjectColor(object);
        
        // Create object circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', x);
        circle.setAttribute('cy', y);
        circle.setAttribute('r', radius);
        circle.setAttribute('fill', color);
        circle.setAttribute('stroke', this.getObjectStrokeColor(object));
        circle.setAttribute('stroke-width', '1');
        circle.setAttribute('data-object-id', object.id);
        
        // Add selection highlight
        if (this.lastClickedObject && this.lastClickedObject.id === object.id) {
            circle.setAttribute('stroke', '#ffff00');
            circle.setAttribute('stroke-width', '2');
        }
        
        this.svg.appendChild(circle);
        
        // Add label if zoom level is high enough
        if (this.currentZoomLevel >= 2) {
            this.renderObjectLabel(object, x, y, radius);
        }
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
                return Math.max(2, baseRadius * 2 * zoomFactor);
            case 'space_station':
                return Math.max(3, (object.size || 1) * 3 * zoomFactor);
            case 'navigation_beacon':
                return Math.max(2, 2 * zoomFactor);
            default:
                return Math.max(2, baseRadius * zoomFactor);
        }
    }
    
    getObjectColor(object) {
        // Get color for object based on type
        
        if (object.color) {
            return object.color;
        }
        
        switch (object.type) {
            case 'star':
                return '#ffff00';
            case 'planet':
                return '#00ff00';
            case 'moon':
                return '#888888';
            case 'space_station':
                return '#00ffff';
            case 'navigation_beacon':
                return '#ffff44';
            default:
                return '#ffffff';
        }
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
    
    renderObjectLabel(object, x, y, radius) {
        // Render object label
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y + radius + 8);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#ffffff');
        text.setAttribute('font-size', '6');
        text.setAttribute('font-family', 'Courier New, monospace');
        text.textContent = object.name;
        
        this.svg.appendChild(text);
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
