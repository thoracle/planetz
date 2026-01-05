/**
 * StarChartsObjectRenderer
 *
 * Extracted from StarChartsUI to reduce file size.
 * Handles rendering of objects (planets, moons, stations, beacons, ship) on the Star Charts.
 *
 * Features:
 * - Orbit line rendering (planets and moons)
 * - Object rendering with appropriate shapes/colors
 * - Hit box generation for clickable elements
 * - Hover effects and animations
 * - Waypoint rendering
 * - Ship position indicator
 */

import { debug } from '../../debug.js';

export class StarChartsObjectRenderer {
    /**
     * Create a StarChartsObjectRenderer
     * @param {Object} starChartsUI - Reference to parent StarChartsUI
     */
    constructor(starChartsUI) {
        this.ui = starChartsUI;
    }

    /**
     * Render orbital paths for all celestial bodies
     * @param {Array} objects - Array of objects to render orbits for
     */
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
        this.ui.renderBeaconRingIfNeeded();
    }

    /**
     * Render planet orbit around the star
     * @param {Object} planet - Planet object
     */
    renderPlanetOrbit(planet) {
        // Render planet orbit around the star (match LRS exactly)

        // Use the same orbit radius calculation as LRS: 100 + (index * 150)
        // Find planet index from display model
        const planetIndex = this.ui.displayModel.planetOrder.indexOf(planet.id);
        if (planetIndex === -1) return; // Planet not in display model

        const orbitRadius = this.ui.displayModel.ringRadii[planetIndex];
        if (!orbitRadius) return;

        // Create orbit circle centered on star (0,0) like LRS
        const orbit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        orbit.setAttribute('cx', '0');
        orbit.setAttribute('cy', '0');
        orbit.setAttribute('r', String(orbitRadius));
        orbit.setAttribute('class', 'scanner-orbit'); // Use same CSS class as LRS
        orbit.style.pointerEvents = 'none'; // Prevent click events

        this.ui.svg.appendChild(orbit);
    }

    /**
     * Render moon orbit around its parent planet
     * @param {Object} moon - Moon object
     * @param {Array} allObjects - All objects for finding parent
     */
    renderMoonOrbit(moon, allObjects) {
        // Render moon orbit around its parent planet (match LRS exactly)

        if (!moon.orbit || !moon.orbit.parent) return;

        // Find the parent planet
        const parentPlanet = allObjects.find(obj => obj.id === moon.orbit.parent);
        if (!parentPlanet) return;

        // Get parent planet position
        const parentPos = this.ui.getDisplayPosition(parentPlanet);

        // Calculate moon orbit radius (use display model if available, otherwise fallback)
        let moonOrbitRadius = 30; // Default like LRS
        if (this.ui.displayModel.moonOffsets.has(moon.id)) {
            moonOrbitRadius = this.ui.displayModel.moonOffsets.get(moon.id);
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

        this.ui.svg.appendChild(moonOrbit);

        // Add orbit highlight element for hover effects (like LRS)
        const moonOrbitHighlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        moonOrbitHighlight.setAttribute('cx', String(parentPos.x));
        moonOrbitHighlight.setAttribute('cy', String(parentPos.y));
        moonOrbitHighlight.setAttribute('r', String(moonOrbitRadius));
        moonOrbitHighlight.setAttribute('class', 'scanner-orbit-highlight'); // Use same CSS class as LRS
        moonOrbitHighlight.style.pointerEvents = 'none'; // Prevent click events

        this.ui.svg.appendChild(moonOrbitHighlight);
    }

    /**
     * Render undiscovered object as "?" with unknown faction color
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {Object} object - Optional object data
     */
    renderUndiscoveredObject(x, y, object = null) {
        // Render undiscovered objects as "?" with unknown faction color (cyan)

        // Calculate zoom-scaled font size - ensure minimum readability even at max zoom
        const baseFontSize = 32; // Increased from 28 for better readability
        const zoomFactor = Math.sqrt(this.ui.currentZoomLevel);
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
        const strokeWidth = Math.max(0.5, 1.2 / Math.sqrt(this.ui.currentZoomLevel)); // Minimum 0.5px, increased base
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
            let objectAtPosition = this.ui.getObjectAtPosition(x, y);

            // If not found at exact position, try a wider search area
            if (!objectAtPosition) {
                objectAtPosition = this.ui.getObjectAtPosition(x, y, 50); // Increase tolerance to 50 pixels
            }

            if (objectAtPosition) {

                // Try to select the object for targeting (same as discovered objects)
                this.ui.selectObject(objectAtPosition);
            } else {
                // Fallback: just zoom to the location
                this.ui.zoomToLocation(x, y);
                debug('STAR_CHARTS', `🖱️ Clicked unknown object at (${x}, ${y}), no object data found - zooming only`);

            }
        });

        // Add blinking effect for current targeting CPU target (same logic as discovered objects)
        if (object) {
            const currentTarget = this.ui.starChartsManager.targetComputerManager?.currentTarget;
            const isCurrentTarget = this.ui.matchesCurrentTarget(object);

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
        this.ui.svg.appendChild(hitBox);
        this.ui.svg.appendChild(questionMark);
    }

    /**
     * Render ship position icon on star chart
     */
    renderShipPosition() {
        const playerPos = this.ui.starChartsManager.getPlayerPosition();

        if (!playerPos || !Array.isArray(playerPos) || playerPos.length < 3) {

            return; // No valid ship position
        }

        // Remove existing ship icon and label if they exist
        const existingIcon = this.ui.svg.querySelector('.ship-position-icon');
        const existingLabel = this.ui.svg.querySelector('.ship-position-label');
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

        const pos = this.ui.getDisplayPosition(shipObject);
        const x = pos.x;
        const z = pos.y; // getDisplayPosition returns {x, y} where y is the Z coordinate

        // Calculate zoom-scaled size
        const baseSize = 20;
        const zoomFactor = Math.sqrt(this.ui.currentZoomLevel);
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
            this.ui.zoomToLocation(x, z); // Zoom to ship's location like other objects
            debug('STAR_CHARTS', `🚀 Ship icon clicked - zooming to ship location (${x.toFixed(1)}, ${z.toFixed(1)})`);
        });

        this.ui.svg.appendChild(shipIcon);

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

        this.ui.svg.appendChild(shipLabel);

        // Verify the ship icon is actually in the DOM
        setTimeout(() => {
            const verifyIcon = this.ui.svg.querySelector('.ship-position-icon');
            if (verifyIcon) {

                // Check SVG properties

                // Check if ship icon is within viewBox (for future debugging if needed)
                const viewBox = this.ui.svg.getAttribute('viewBox');
            } else {

            }
        }, 100);
    }

    /**
     * Render a single object
     * @param {Object} object - Object to render
     */
    renderObject(object) {
        const pos = this.ui.getDisplayPosition(object);
        const x = pos.x;
        const y = pos.y; // Use Z as Y for top-down view

        // Handle undiscovered objects - render as "?" with unknown faction color
        if (object._isUndiscovered) {
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
        if (this.ui.lastClickedObject && this.ui.lastClickedObject.id === object.id) {
            element.setAttribute('stroke', '#ffff00');
            element.setAttribute('stroke-width', '2');
            if (element.style) {
                element.style.filter = 'brightness(1.3)';
            }
        }

        // Add blinking effect for current targeting CPU target
        const currentTarget = this.ui.starChartsManager.targetComputerManager?.currentTarget;
        const isCurrentTarget = this.ui.matchesCurrentTarget(object);

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
        this.ui.svg.appendChild(element);

        // Add hit box BEFORE visual element so it's behind
        this.ui.svg.insertBefore(hitBox, element);

        // Labels removed - tooltips now provide object names on hover (match LRS)
    }

    /**
     * Get display radius for object based on type and zoom
     * @param {Object} object - Object to get radius for
     * @returns {number} Display radius
     */
    getObjectDisplayRadius(object) {
        const baseRadius = object.visualRadius || 1;
        const zoomFactor = Math.max(0.5, this.ui.currentZoomLevel / 2);

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

    /**
     * Get larger hit box radius for better clickability
     * @param {Object} object - Object to get hit box radius for
     * @returns {number} Hit box radius
     */
    getObjectHitBoxRadius(object) {
        const baseRadius = object.visualRadius || 1;
        // Improved zoom factor: more responsive to zoom level changes
        const zoomFactor = Math.max(1.0, 4.0 / this.ui.currentZoomLevel);

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

    /**
     * Get color for object based on type and faction/diplomacy
     * @param {Object} object - Object to get color for
     * @returns {string} CSS color string
     */
    getObjectColor(object) {
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

    /**
     * Find an object by ID in the current sector data
     * @param {string} objectId - Object ID to find
     * @returns {Object|null} Found object or null
     */
    findObjectById(objectId) {
        const sectorData = this.ui.starChartsManager.objectDatabase?.sectors[this.ui.starChartsManager.getCurrentSector()];
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

    /**
     * Get stroke color for object
     * @param {Object} object - Object to get stroke color for
     * @returns {string} CSS color string
     */
    getObjectStrokeColor(object) {
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

    /**
     * Render mission waypoints from the waypoint system
     */
    renderVirtualWaypoints() {
        if (!window.waypointManager) return;

        const activeWaypoints = window.waypointManager.activeWaypoints;
        if (!activeWaypoints || activeWaypoints.size === 0) return;

        // Initialize Star Charts center if undefined (needed for coordinate conversion)
        if (this.ui.centerX === undefined) this.ui.centerX = 0;
        if (this.ui.centerY === undefined) this.ui.centerY = 0;
        if (this.ui.currentZoomLevel === undefined) this.ui.currentZoomLevel = 1;

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
                    if (this.ui.centerX === 0 && this.ui.centerY === 0) {
                        debug('WAYPOINTS', `🎯 Auto-centering Star Charts on active waypoint: ${waypoint.name}`);
                        this.ui.centerX = waypoint.position[0];
                        this.ui.centerY = waypoint.position[2]; // Use Z as Y for 2D display
                        this.ui.currentZoomLevel = 2.0; // Good zoom level for waypoint visibility
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

    /**
     * Convert 3D world coordinates to 2D screen coordinates for waypoint display
     * @param {number} worldX - World X coordinate
     * @param {number} worldZ - World Z coordinate (used as Y in 2D display)
     * @returns {Object|null} Screen coordinates {x, y} or null if invalid
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

        this.ui.svg.appendChild(waypointGroup);
    }

    /**
     * Render interrupted waypoint marker with special styling
     * @param {Object} waypoint - Interrupted waypoint object
     */
    renderInterruptedWaypointMarker(waypoint) {
        if (!waypoint.position || waypoint.position.length < 3) return;

        const [x, y, z] = waypoint.position;
        const screenPos = this.convertToScreenCoordinates(x, z);
        if (!screenPos) return;

        // Create waypoint marker group with interrupted styling
        const waypointGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        waypointGroup.setAttribute('class', 'waypoint-marker interrupted');
        waypointGroup.setAttribute('data-waypoint-id', waypoint.id);

        // Use orange color for interrupted waypoints
        const color = '#ff6600';

        // Create dashed circle for interrupted state
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', screenPos.x);
        circle.setAttribute('cy', screenPos.y);
        circle.setAttribute('r', '6');
        circle.setAttribute('fill', 'none');
        circle.setAttribute('stroke', color);
        circle.setAttribute('stroke-width', '2');
        circle.setAttribute('stroke-dasharray', '3,3');
        circle.setAttribute('opacity', '0.7');

        // Create label
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', screenPos.x);
        label.setAttribute('y', screenPos.y - 12);
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-family', 'VT323, monospace');
        label.setAttribute('font-size', '10');
        label.setAttribute('fill', color);
        label.setAttribute('opacity', '0.7');
        label.textContent = `[${waypoint.name || 'Waypoint'}]`;

        waypointGroup.appendChild(circle);
        waypointGroup.appendChild(label);

        // Add click handler
        waypointGroup.style.cursor = 'pointer';
        waypointGroup.addEventListener('click', (event) => {
            event.stopPropagation();
            this.handleWaypointClick(waypoint);
        });

        this.ui.svg.appendChild(waypointGroup);
    }

    /**
     * Get waypoint color based on type and status
     * @param {Object} waypoint - Waypoint object
     * @returns {string} CSS color string
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
     * @returns {boolean} True if waypoint is targeted
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
            setTimeout(() => this.ui.updateCurrentTargetDisplay(), 100);
        } else {
            debug('P1', '❌ Star Charts: Failed to target waypoint:', waypoint.name);
        }
    }

    /**
     * Center Star Charts on a waypoint and zoom appropriately
     * @param {Object} waypoint - Waypoint to center on
     */
    centerOnWaypoint(waypoint) {
        if (!waypoint.position || waypoint.position.length < 3) {
            debug('P1', '❌ Star Charts: Invalid waypoint position for centering:', waypoint.position);
            return;
        }

        const [x, y, z] = waypoint.position;

        // Initialize center if undefined
        if (this.ui.centerX === undefined) this.ui.centerX = 0;
        if (this.ui.centerY === undefined) this.ui.centerY = 0;
        if (this.ui.currentZoomLevel === undefined) this.ui.currentZoomLevel = 1;

        // Set center position to waypoint location
        this.ui.centerX = x;
        this.ui.centerY = z; // Use Z as Y for 2D display

        // Set appropriate zoom level for waypoint viewing
        this.ui.currentZoomLevel = 3.0; // Good detail level for waypoints

        // Re-render with new center and zoom
        this.ui.render();

        debug('WAYPOINTS', `🎯 Star Charts: Centered on waypoint ${waypoint.name} at [${x}, ${z}] with zoom ${this.ui.currentZoomLevel}x`);
    }

    /**
     * Find object by name in current sector data
     * @param {string} name - Object name to find
     * @returns {Object|null} Found object or null
     */
    findObjectByName(name) {
        const discoveredObjects = this.ui.getDiscoveredObjectsForRender();
        return discoveredObjects.find(obj => obj.name === name) || null;
    }

    /**
     * Find the star of the current solar system
     * @returns {Object|null} Star object or null
     */
    findCurrentSystemStar() {
        const discoveredObjects = this.ui.getDiscoveredObjectsForRender();
        return discoveredObjects.find(obj => obj.type === 'star') || null;
    }

    /**
     * Add LRS-style hover effects: pointer cursor + scale animation
     * @param {SVGElement} element - SVG element to add effects to
     * @param {Object} object - Object data
     */
    addHoverEffects(element, object) {
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

    /**
     * Dispose of resources
     */
    dispose() {
        this.ui = null;
    }
}
