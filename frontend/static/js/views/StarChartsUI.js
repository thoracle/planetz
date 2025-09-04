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
        // Match LRS zoom semantics: overview (1x), medium (2x), detail (3x), beacon ring (0.4x)
        this.zoomLevels = {
            overview: 1,
            medium: 2,
            detail: 3,
            beacon_ring: 0.4
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
        this.svg.style.cssText = `width: 100%; height: 100%; cursor: crosshair;`;
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
                } else if (key === 'b') {
                    // Match LRS: show full beacon ring
                    event.preventDefault();
                    event.stopPropagation();
                    this.currentZoomLevel = this.zoomLevels.beacon_ring;
                    this.currentCenter = { x: 0, y: 0 };
                    this.lastClickedObject = null;
                    this.render();
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
        }
        // Always re-center on clicked object (use normalized display position)
        const pos = this.getDisplayPosition(object);
        this.currentCenter = { x: pos.x, y: pos.y };
        this.render();
    }
    
    zoomOut() {
        // Zoom out one level (down to beacon ring)
        if (this.currentZoomLevel > this.zoomLevels.beacon_ring) {
            this.currentZoomLevel = Math.max(this.zoomLevels.beacon_ring, this.currentZoomLevel - 1);
            // If returning to overview, center on origin
            if (this.currentZoomLevel === this.zoomLevels.overview) {
                this.currentCenter = { x: 0, y: 0 };
            }
            this.render();
        } else {
            // Toggle between beacon ring and overview if already at min (like LRS)
            this.currentZoomLevel = this.zoomLevels.overview;
            this.currentCenter = { x: 0, y: 0 };
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
        
        // Mimic LRS scaling by adjusting base size from discovery range
        let baseSize = 1000;
        try {
            const range = this.starChartsManager.getDiscoveryRadius?.() || 150;
            const rangeMultiplier = Math.max(0.5, Math.min(2.0, range / 150));
            baseSize = 1000 * rangeMultiplier;
        } catch (e) {}
        return baseSize / this.currentZoomLevel;
    }
    
    getObjectAtPosition(worldX, worldY, tolerance = 20) {
        // Get object at world position
        
        const discoveredObjects = this.getDiscoveredObjectsForRender();
        
        for (const object of discoveredObjects) {
            const pos = this.getDisplayPosition(object);
            const dx = pos.x - worldX;
            const dy = pos.y - worldY;
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
            
            // Reset zoom and center
            this.currentZoomLevel = this.zoomLevels.overview;
            // Center on sector star (match LRS initial centering)
            const starPos = this.getSectorStarDisplayPosition();
            this.currentCenter = starPos || { x: 0, y: 0 };
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
                // Collect moons for this planet from DB by parent id match; fallback to keys
                const dbMoons = (sectorData.objects || []).filter(o => o.type === 'moon' && o.orbit?.parent === parentId);
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
        const snapToNearestRing = (radiusDisplay) => {
            if (this.displayModel.ringRadii.length === 0) return radiusDisplay;
            return this.displayModel.ringRadii.reduce((best, r) => (
                Math.abs(r - radiusDisplay) < Math.abs(best - radiusDisplay) ? r : best
            ), this.displayModel.ringRadii[0]);
        };
        const placePolar = (obj) => {
            // Prefer live angle if available by matching body name to SSM
            const liveAngle = this.getLiveAngleDegByName(obj.name);
            if (typeof liveAngle === 'number') {
                // Snap to nearest ring or force beacon ring
                const isBeacon = (obj.type === 'navigation_beacon');
                const rDisplayGuess = Array.isArray(obj.position) && obj.position.length === 2 ? (obj.position[0] * AU_TO_DISPLAY) : 300;
                const ring = isBeacon && this.displayModel.beaconRing ? this.displayModel.beaconRing : snapToNearestRing(rDisplayGuess);
                const rad = liveAngle * Math.PI / 180;
                const x = ring * Math.cos(rad);
                const y = ring * Math.sin(rad);
                this.displayModel.positions.set(obj.id, { x, y });
                return;
            }
            if (!Array.isArray(obj.position) || obj.position.length !== 2) return;
            const isBeacon = (obj.type === 'navigation_beacon');
            const rDisplay = isBeacon && this.displayModel.beaconRing ? this.displayModel.beaconRing : (obj.position[0] * AU_TO_DISPLAY);
            const angleDeg = obj.position[1];
            const ring = isBeacon && this.displayModel.beaconRing ? this.displayModel.beaconRing : snapToNearestRing(rDisplay);
            const angleRad = angleDeg * Math.PI / 180;
            const x = ring * Math.cos(angleRad);
            const y = ring * Math.sin(angleRad);
            this.displayModel.positions.set(obj.id, { x, y });
        };
        stations.forEach(placePolar);
        beacons.forEach(placePolar);

        // 5) Beacons ring at fixed radius (match LRS 350)
        this.displayModel.beaconRing = 350;
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
        const discoveredIds = this.starChartsManager.getDiscoveredObjects();
        const anyDiscoveredBeacon = beacons.some(b => discoveredIds.includes(b.id));
        if (!anyDiscoveredBeacon) return;

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
            return this.displayModel.positions.get(object.id);
        }
        if (Array.isArray(object.position)) {
            if (object.position.length >= 3) {
                return { x: object.position[0], y: object.position[2] };
            }
            if (object.position.length === 2) {
                const radiusAU = object.position[0];
                const angleDeg = object.position[1];
                const angleRad = (angleDeg * Math.PI) / 180;
                const AU_TO_DISPLAY = 149.6; // Keep consistent with planet units
                const r = radiusAU * AU_TO_DISPLAY;
                return { x: r * Math.cos(angleRad), y: r * Math.sin(angleRad) };
            }
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
        // Setup SVG coordinate system based on zoom level
        
        const worldSize = this.getWorldSize();
        const viewBox = `${this.currentCenter.x - worldSize/2} ${this.currentCenter.y - worldSize/2} ${worldSize} ${worldSize}`;
        this.svg.setAttribute('viewBox', viewBox);
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
                    // Normalize station type to match LRS icon rules
                    allObjects.push({ ...station, type: 'space_station' });
                }
            });
            
            sectorData.infrastructure.beacons?.forEach(beacon => {
                if (discoveredIds.includes(beacon.id)) {
                    // Normalize beacon type to match LRS icon rules
                    allObjects.push({ ...beacon, type: 'navigation_beacon' });
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
        
        // If moon, use local offset; if planet, use normalized ring; else fallback
        let orbitRadius = object.orbit.radius;
        if (this.displayModel) {
            if (object.type === 'planet') {
                const idx = this.displayModel.planetOrder.indexOf(object.id);
                if (idx >= 0) orbitRadius = this.displayModel.ringRadii[idx];
            } else if (object.type === 'moon') {
                const local = this.displayModel.moonOffsets.get(object.id);
                if (typeof local === 'number') orbitRadius = local;
            }
        }
        
        // Create orbit circle centered on parent (star/planet) for top-down view
        let cx = 0;
        let cy = 0;
        const parentId = object.orbit.parent;
        if (parentId && this.starChartsManager && typeof this.starChartsManager.getObjectData === 'function') {
            const parentObj = this.starChartsManager.getObjectData(parentId);
            if (parentObj) {
                const parentPos = this.getDisplayPosition(parentObj);
                cx = parentPos.x;
                cy = parentPos.y;
            }
        }

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', cx);
        circle.setAttribute('cy', cy);
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
        
        const pos = this.getDisplayPosition(object);
        const x = pos.x;
        const y = pos.y; // Use Z as Y for top-down view
        const radius = this.getObjectDisplayRadius(object);
        const color = this.getObjectColor(object);
        
        // Match LRS iconography: star (circle), planet (circle), moon (small circle), station (diamond), beacon (triangle)
        let element = null;
        if (object.type === 'space_station') {
            const size = Math.max(6, radius * 1.5);
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x - size / 2);
            rect.setAttribute('y', y - size / 2);
            rect.setAttribute('width', size);
            rect.setAttribute('height', size);
            rect.setAttribute('transform', `rotate(45 ${x} ${y})`);
            rect.setAttribute('fill', '#00aaff');
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
            circle.setAttribute('fill', color);
            circle.setAttribute('stroke', this.getObjectStrokeColor(object));
            circle.setAttribute('stroke-width', '1');
            element = circle;
        }
        element.setAttribute('data-object-id', object.id);
        // Add selection highlight
        if (this.lastClickedObject && this.lastClickedObject.id === object.id) {
            element.setAttribute('stroke', '#ffff00');
            element.setAttribute('stroke-width', '2');
        }
        this.svg.appendChild(element);
        
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
