import * as THREE from 'three';
import { VIEW_TYPES } from './ViewManager.js';

export class LongRangeScanner {
    constructor(viewManager) {
        this.viewManager = viewManager;
        this._isVisible = false;
        this.currentZoomLevel = 1;
        this.maxZoomLevel = 3;
        this.zoomLevels = {
            overview: 1,
            medium: 2,
            detail: 3
        };
        this.currentCenter = { x: 0, y: 0 };
        this.lastClickedBody = null;
        this.defaultViewBox = {
            width: 1000,
            height: 1000,
            x: -500,
            y: -500
        };
        
        // Create the modal container
        this.container = document.createElement('div');
        this.container.className = 'long-range-scanner';

        // Create the close button
        this.closeButton = document.createElement('div');
        this.closeButton.innerHTML = 'X';
        this.closeButton.className = 'close-button';
        this.container.appendChild(this.closeButton);

        // Create main content wrapper with scrolling
        this.contentWrapper = document.createElement('div');
        this.contentWrapper.className = 'scanner-content-wrapper';
        this.container.appendChild(this.contentWrapper);

        // Create the scanner map container
        this.mapContainer = document.createElement('div');
        this.mapContainer.className = 'scanner-map-container';
        this.contentWrapper.appendChild(this.mapContainer);

        // Create the details panel
        this.detailsPanel = document.createElement('div');
        this.detailsPanel.className = 'scanner-details';
        this.container.appendChild(this.detailsPanel);

        // Create tooltip element
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'scanner-tooltip';
        this.tooltip.style.display = 'none';
        document.body.appendChild(this.tooltip);

        // Add event listeners
        this.closeButton.addEventListener('click', () => {
            this.viewManager.restorePreviousView();
            this.hide(false);
        });
        
        document.addEventListener('keydown', (event) => {
            if (this.container.classList.contains('visible')) {
                const key = event.key.toLowerCase();
                if (key === 'l' || key === 'escape') {
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

        // Add to document
        document.body.appendChild(this.container);
    }

    show() {
        if (!this._isVisible) {
            this._isVisible = true;
            this.container.classList.add('visible');
            // Reset zoom when showing the scanner
            this.currentZoomLevel = 1;
            this.currentCenter = { x: 0, y: 0 };
            // Reset previous selection and clear stale details when opening
            this.lastClickedBody = null;
            if (this.detailsPanel) this.detailsPanel.innerHTML = '';
            // Update targeting-active class based on targeting computer state
            if (this.viewManager.starfieldManager?.targetComputerEnabled) {
                this.container.classList.add('targeting-active');
            } else {
                this.container.classList.remove('targeting-active');
            }
            this.updateScannerMap();
        }
    }

    hide(shouldRestoreView = false) {
        if (this._isVisible) {
            this._isVisible = false;
            this.container.classList.remove('visible');
            this.container.classList.remove('targeting-active');
            if (shouldRestoreView && this.viewManager) {
                this.viewManager.restorePreviousView();
            }
        }
    }

    isVisible() {
        return this._isVisible;
    }

    updateScannerMap() {
        // Clear existing map
        this.mapContainer.innerHTML = '';

        // Get the current solar system data
        const solarSystemManager = this.viewManager.getSolarSystemManager();
        if (!solarSystemManager) return;

        const rawStarSystem = solarSystemManager.starSystem;
        if (!rawStarSystem) return;

        // Get the Long Range Scanner system from the ship
        const ship = this.viewManager.getShip();
        const scannerSystem = ship ? ship.systems.get('long_range_scanner') : null;
        
        // Process scan data through the system (applies damage effects)
        let starSystem = rawStarSystem;
        if (scannerSystem && scannerSystem.isOperational()) {
            const processedData = scannerSystem.processScanData(rawStarSystem);
            if (processedData) {
                starSystem = processedData;
            }
        } else {
            // If scanner is non-operational, show very limited data
            console.warn('Long Range Scanner not operational - limited scan data available');
            starSystem = {
                star_name: rawStarSystem.star_name,
                star_size: rawStarSystem.star_size,
                planets: [] // No planet data when scanner is offline
            };
        }

        // Create the map SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'scanner-map');
        
        // Add damage effects to SVG if system is damaged
        if (scannerSystem) {
            const status = scannerSystem.getStatus();
            if (status.fogOfWarEnabled) {
                svg.style.filter = 'contrast(0.7) brightness(0.8) saturate(0.6)';
                svg.setAttribute('class', 'scanner-map damaged');
            }
            
            // Reduce scan range affects viewBox size
            const scanRange = status.currentScanRange;
            const maxRange = 1000; // Base scan range
            const rangeMultiplier = Math.max(0.3, scanRange / maxRange); // Minimum 30% range
            
            this.defaultViewBox = {
                width: 1000 * rangeMultiplier,
                height: 1000 * rangeMultiplier,
                x: -500 * rangeMultiplier,
                y: -500 * rangeMultiplier
            };
        }
        
        svg.style.cursor = 'default'; // Set default cursor instead of grab
        
        // Ensure valid zoom level
        if (isNaN(this.currentZoomLevel) || this.currentZoomLevel <= 0) {
            this.currentZoomLevel = 1;
        }

        // Ensure valid center coordinates
        if (!this.currentCenter || isNaN(this.currentCenter.x) || isNaN(this.currentCenter.y)) {
            this.currentCenter = { x: 0, y: 0 };
        }

        // Calculate viewBox dimensions
        const viewBoxWidth = this.defaultViewBox.width / this.currentZoomLevel;
        const viewBoxHeight = this.defaultViewBox.height / this.currentZoomLevel;
        
        // Calculate viewBox position ensuring the center point
        const viewBoxX = this.currentCenter.x - (viewBoxWidth / 2);
        const viewBoxY = this.currentCenter.y - (viewBoxHeight / 2);

        // Final validation of viewBox values
        const safeViewBox = {
            width: isNaN(viewBoxWidth) ? this.defaultViewBox.width : viewBoxWidth,
            height: isNaN(viewBoxHeight) ? this.defaultViewBox.height : viewBoxHeight,
            x: isNaN(viewBoxX) ? this.defaultViewBox.x : viewBoxX,
            y: isNaN(viewBoxY) ? this.defaultViewBox.y : viewBoxY
        };

        svg.setAttribute('viewBox', `${safeViewBox.x} ${safeViewBox.y} ${safeViewBox.width} ${safeViewBox.height}`);
        this.mapContainer.appendChild(svg);

        // Add click handler for empty space zoom out
        svg.addEventListener('click', (e) => {
            const clickedElement = document.elementFromPoint(e.clientX, e.clientY);
            // If clicked element is the SVG itself or a non-celestial body element, zoom out one level
            if (clickedElement === svg || 
                (clickedElement && !clickedElement.classList.contains('scanner-star') && 
                 !clickedElement.classList.contains('scanner-planet') && 
                 !clickedElement.classList.contains('scanner-moon') &&
                 !clickedElement.classList.contains('scanner-moon-hitbox'))) {
                
                if (this.currentZoomLevel > 1) {
                    // Step down zoom level by 1
                    this.currentZoomLevel--;
                    
                    // If we're zooming back to overview, reset center
                    if (this.currentZoomLevel === 1) {
                        this.currentCenter = { x: 0, y: 0 };
                        this.lastClickedBody = null;
                    }
                    
                    this.updateScannerMap();
                }
            }
        });

        // Add double-click handler for zoom out
        svg.addEventListener('dblclick', (e) => {
            e.preventDefault(); // Prevent text selection on double click
            
            // If we're zoomed in, zoom out to overview
            if (this.currentZoomLevel > 1) {
                this.currentZoomLevel = 1;
                this.currentCenter = { x: 0, y: 0 };
                this.lastClickedBody = null;
                this.updateScannerMap();
            }
        });

        // Add mouse move handler for tooltips
        svg.addEventListener('mousemove', (e) => {
            const rect = svg.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;
            
            // Find the celestial body under the cursor
            const element = document.elementFromPoint(x, y);
            if (element && element.hasAttribute('data-name')) {
                let tooltipText = element.getAttribute('data-name');
                // Add parent planet name for moons
                if (element.classList.contains('scanner-moon') && element.hasAttribute('data-parent')) {
                    tooltipText += ` (Moon of ${element.getAttribute('data-parent')})`;
                }
                this.tooltip.textContent = tooltipText;
                this.tooltip.style.display = 'block';
                this.tooltip.style.left = x + 'px';
                this.tooltip.style.top = y + 'px';
            } else {
                this.tooltip.style.display = 'none';
            }
        });

        // Hide tooltip when leaving the map
        svg.addEventListener('mouseleave', () => {
            this.tooltip.style.display = 'none';
        });

        // Add star
        const star = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        star.setAttribute('cx', '0');
        star.setAttribute('cy', '0');
        star.setAttribute('r', String(starSystem.star_size * 10));
        star.setAttribute('class', 'scanner-star');
        star.setAttribute('data-name', starSystem.star_name);
        star.setAttribute('data-original-r', String(starSystem.star_size * 10));
        this.addHoverEffects(star);
        svg.appendChild(star);

        // Add planets and their orbits
        if (starSystem.planets) {
            starSystem.planets.forEach((planet, index) => {
                const orbitRadius = 100 + (index * 150); // Spacing between orbits
                
                // Draw orbit
                const orbit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                orbit.setAttribute('cx', '0');
                orbit.setAttribute('cy', '0');
                orbit.setAttribute('r', String(orbitRadius));
                orbit.setAttribute('class', 'scanner-orbit');
                svg.appendChild(orbit);

                // Calculate planet position on orbit
                const planetBody = solarSystemManager.celestialBodies.get(`planet_${index}`);
                let angle = 0;
                if (planetBody) {
                    // Use actual planet position if available
                    const pos = planetBody.position;
                    angle = Math.atan2(pos.z, pos.x);
                } else {
                    angle = (Math.random() * Math.PI * 2);
                }
                const x = orbitRadius * Math.cos(angle);
                const y = orbitRadius * Math.sin(angle);

                // Draw planet
                const planetElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                planetElement.setAttribute('cx', String(x));
                planetElement.setAttribute('cy', String(y));
                const planetRadius = planet.planet_size * 5;
                planetElement.setAttribute('r', String(planetRadius));
                planetElement.setAttribute('data-original-r', String(planetRadius));
                planetElement.setAttribute('class', `scanner-planet scanner-planet-${planet.diplomacy?.toLowerCase() || 'neutral'}`);
                planetElement.setAttribute('data-name', planet.planet_name);
                this.addHoverEffects(planetElement);
                svg.appendChild(planetElement);

                // Add moons if any
                if (planet.moons) {
                    planet.moons.forEach((moon, moonIndex) => {
                        const moonOrbitRadius = 30 + (moonIndex * 15);
                        const moonBody = solarSystemManager.celestialBodies.get(`moon_${index}_${moonIndex}`);
                        let moonAngle = 0;
                        if (moonBody) {
                            // Calculate relative position to planet
                            const relativePos = moonBody.position.clone().sub(planetBody.position);
                            moonAngle = Math.atan2(relativePos.z, relativePos.x);
                        } else {
                            moonAngle = (Math.random() * Math.PI * 2);
                        }
                        const moonX = x + (moonOrbitRadius * Math.cos(moonAngle));
                        const moonY = y + (moonOrbitRadius * Math.sin(moonAngle));

                        // Draw moon orbit with highlight effect
                        const moonOrbit = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                        moonOrbit.setAttribute('cx', String(x));
                        moonOrbit.setAttribute('cy', String(y));
                        moonOrbit.setAttribute('r', String(moonOrbitRadius));
                        moonOrbit.setAttribute('class', 'scanner-orbit');
                        svg.appendChild(moonOrbit);

                        // Add orbit highlight element (for hover effect)
                        const moonOrbitHighlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                        moonOrbitHighlight.setAttribute('cx', String(x));
                        moonOrbitHighlight.setAttribute('cy', String(y));
                        moonOrbitHighlight.setAttribute('r', String(moonOrbitRadius));
                        moonOrbitHighlight.setAttribute('class', 'scanner-orbit-highlight');
                        svg.appendChild(moonOrbitHighlight);

                        // Add larger invisible hit area for the moon
                        const moonHitbox = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                        moonHitbox.setAttribute('cx', String(moonX));
                        moonHitbox.setAttribute('cy', String(moonY));
                        moonHitbox.setAttribute('r', '10'); // Larger clickable area
                        moonHitbox.setAttribute('class', 'scanner-moon-hitbox');
                        moonHitbox.setAttribute('data-name', moon.moon_name);
                        moonHitbox.setAttribute('data-parent', planet.planet_name);
                        moonHitbox.setAttribute('data-parent-x', String(x));
                        moonHitbox.setAttribute('data-parent-y', String(y));
                        svg.appendChild(moonHitbox);

                        // Draw moon
                        const moonElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                        moonElement.setAttribute('cx', String(moonX));
                        moonElement.setAttribute('cy', String(moonY));
                        let moonSize = moon.moon_size * 2 || 2;
                        // Increase moon size at higher zoom levels
                        if (this.currentZoomLevel > 2) {
                            moonSize *= 1.5;
                        }
                        if (this.currentZoomLevel > 3) {
                            moonSize *= 1.5;
                        }
                        moonSize = Math.max(moonSize, 3);
                        moonElement.setAttribute('r', String(moonSize));
                        moonElement.setAttribute('data-original-r', String(moonSize));
                        moonElement.setAttribute('class', `scanner-moon scanner-moon-${moon.diplomacy?.toLowerCase() || 'neutral'}`);
                        moonElement.setAttribute('data-name', moon.moon_name);
                        moonElement.setAttribute('data-parent', planet.planet_name);
                        moonElement.setAttribute('data-parent-x', String(x));
                        moonElement.setAttribute('data-parent-y', String(y));
                        this.addHoverEffects(moonElement);
                        svg.appendChild(moonElement);

                        // Add event listeners to both hitbox and moon
                        [moonHitbox, moonElement].forEach(element => {
                            // Click handler
                            element.addEventListener('click', () => {
                                this.showCelestialBodyDetails(moon.moon_name);
                            });

                            // Tooltip handler
                            element.addEventListener('mousemove', (e) => {
                                const rect = svg.getBoundingClientRect();
                                const x = e.clientX;
                                const y = e.clientY;
                                
                                this.tooltip.textContent = `${moon.moon_name} (Moon of ${planet.planet_name})`;
                                this.tooltip.style.display = 'block';
                                this.tooltip.style.left = x + 'px';
                                this.tooltip.style.top = y + 'px';
                            });

                            element.addEventListener('mouseleave', () => {
                                this.tooltip.style.display = 'none';
                            });
                        });
                    });
                }
            });
        }

        // Add space stations (exclude ships). Place them on nearest orbit at their actual angular position.
        (() => {
            const bodiesMap = solarSystemManager.celestialBodies;
            if (!bodiesMap || bodiesMap.size === 0) return;

            // Precompute orbit radii from planets drawn above
            const orbitRadii = [];
            if (starSystem.planets) {
                for (let i = 0; i < starSystem.planets.length; i++) {
                    orbitRadii.push(100 + (i * 150));
                }
            }

            bodiesMap.forEach((body, key) => {
                const info = solarSystemManager.getCelestialBodyInfo(body);
                if (!info) return;
                // Show stations only; skip ships and non-stations
                const isStation = info.type === 'station' || body.userData?.type === 'station' || body.userData?.isSpaceStation;
                const isShip = body.userData?.ship || info.type === 'ship' || info.isShip;
                if (!isStation || isShip) return;

                // Compute angle from star (origin)
                const pos = body.position;
                const angle = Math.atan2(pos.z, pos.x);

                // Choose nearest orbit radius for placement
                let r = 300; // default if no planets
                if (orbitRadii.length > 0) {
                    r = orbitRadii.reduce((best, candidate) => {
                        return (Math.abs(candidate - pos.length()) < Math.abs(best - pos.length())) ? candidate : best;
                    }, orbitRadii[0]);
                }

                const x = r * Math.cos(angle);
                const y = r * Math.sin(angle);

                // Draw station marker as a rotated square (diamond)
                const size = 8;
                const station = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                station.setAttribute('x', String(x - size / 2));
                station.setAttribute('y', String(y - size / 2));
                station.setAttribute('width', String(size));
                station.setAttribute('height', String(size));
                station.setAttribute('class', 'scanner-station');
                station.setAttribute('data-name', info.name || body.userData?.name || 'Station');
                station.setAttribute('data-original-r', String(size));
                station.setAttribute('transform', `rotate(45 ${x} ${y})`);
                station.setAttribute('fill', '#00aaff');
                station.setAttribute('stroke', '#ffffff');
                station.setAttribute('stroke-width', '1');
                // Consistent UI affordance: show pointer cursor like other bodies
                station.style.cursor = 'pointer';
                svg.appendChild(station);

                // Hover effects (scale via width/height)
                this.addHoverEffects(station);

                // Tooltip
                station.addEventListener('mousemove', (e) => {
                    const name = info.name || body.userData?.name || 'Station';
                    this.tooltip.textContent = name;
                    this.tooltip.style.display = 'block';
                    this.tooltip.style.left = e.clientX + 'px';
                    this.tooltip.style.top = e.clientY + 'px';
                });
                station.addEventListener('mouseleave', () => {
                    this.tooltip.style.display = 'none';
                });
                // Click → details
                station.addEventListener('click', () => {
                    this.showCelestialBodyDetails(info.name || body.userData?.name || 'Station');
                });
            });
        })();

        // Add ship position indicator
        const camera = this.viewManager.getCamera();
        if (camera) {
            // Calculate ship position relative to star (origin)
            const shipX = camera.position.x;
            const shipZ = camera.position.z;
            
            // Create pulsing circle for ship position
            const shipIndicator = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            shipIndicator.setAttribute('cx', String(shipX));
            shipIndicator.setAttribute('cy', String(shipZ));
            shipIndicator.setAttribute('class', 'scanner-ship-position');
            shipIndicator.setAttribute('data-name', 'Your Ship');
            svg.appendChild(shipIndicator);

            // Add center dot for ship
            const shipCenter = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            shipCenter.setAttribute('cx', String(shipX));
            shipCenter.setAttribute('cy', String(shipZ));
            shipCenter.setAttribute('class', 'scanner-ship-center');
            svg.appendChild(shipCenter);

            // Add direction indicator (small line pointing in ship's direction)
            const directionLength = 15;
            const shipRotation = new THREE.Euler().setFromQuaternion(camera.quaternion);
            const directionX = shipX + Math.cos(shipRotation.y) * directionLength;
            const directionZ = shipZ + Math.sin(shipRotation.y) * directionLength;
            
            const directionLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            directionLine.setAttribute('x1', String(shipX));
            directionLine.setAttribute('y1', String(shipZ));
            directionLine.setAttribute('x2', String(directionX));
            directionLine.setAttribute('y2', String(directionZ));
            directionLine.setAttribute('stroke', '#00ff41');
            directionLine.setAttribute('stroke-width', '2');
            svg.appendChild(directionLine);

            // Add ship position to tooltip handling
            [shipIndicator, shipCenter].forEach(element => {
                element.addEventListener('mousemove', (e) => {
                    const rect = svg.getBoundingClientRect();
                    const x = e.clientX;
                    const y = e.clientY;
                    
                    // Get current velocity if available
                    let velocityInfo = '';
                    if (this.viewManager.starfieldManager) {
                        const velocity = this.viewManager.starfieldManager.velocity || 0;
                        velocityInfo = `\nVelocity: ${velocity} metrons/sec`;
                    }
                    
                    this.tooltip.textContent = `Your Ship${velocityInfo}`;
                    this.tooltip.classList.add('ship-tooltip');
                    this.tooltip.style.display = 'block';
                    this.tooltip.style.left = x + 'px';
                    this.tooltip.style.top = y + 'px';
                });

                element.addEventListener('mouseleave', () => {
                    this.tooltip.classList.remove('ship-tooltip');
                    this.tooltip.style.display = 'none';
                });
            });
        }

        // Add click handlers for celestial bodies
        const celestialBodies = svg.querySelectorAll('.scanner-star, .scanner-planet, .scanner-moon, .scanner-station');
        celestialBodies.forEach(body => {
            body.addEventListener('click', () => {
                this.showCelestialBodyDetails(body.getAttribute('data-name'));
            });
        });

        // Default selection: star of current sector if nothing selected yet
        if (!this.lastClickedBody && starSystem.star_name) {
            this.showCelestialBodyDetails(starSystem.star_name);
        }
    }

    showCelestialBodyDetails(bodyName) {
        const solarSystemManager = this.viewManager.getSolarSystemManager();
        if (!solarSystemManager) return;

        // Find the body by name
        const bodies = solarSystemManager.getCelestialBodies();
        let targetBody = null;
        let bodyInfo = null;
        let parentPlanetInfo = null;

        // First try to find the star
        if (solarSystemManager.starSystem.star_name === bodyName) {
            targetBody = bodies.get('star');
        } else {
            // Look through planets and moons
            for (const [key, body] of bodies.entries()) {
                const info = solarSystemManager.getCelestialBodyInfo(body);
                if (info && info.name === bodyName) {
                    targetBody = body;
                    bodyInfo = info;
                    // If this is a moon, get its parent planet info
                    if (key.startsWith('moon_')) {
                        const [_, planetIndex] = key.split('_');
                        const planetKey = `planet_${planetIndex}`;
                        const parentPlanet = bodies.get(planetKey);
                        if (parentPlanet) {
                            parentPlanetInfo = solarSystemManager.getCelestialBodyInfo(parentPlanet);
                        }
                    }
                    break;
                }
            }
        }

        if (!targetBody) return;
        if (!bodyInfo) {
            bodyInfo = solarSystemManager.getCelestialBodyInfo(targetBody);
        }
        if (!bodyInfo) return;

        // Get the clicked element's position for zooming
        const svg = this.mapContainer.querySelector('svg');
        const clickedElement = svg.querySelector(`[data-name="${bodyName}"]`);
        if (clickedElement) {
            const cx = parseFloat(clickedElement.getAttribute('cx')) || 0;
            const cy = parseFloat(clickedElement.getAttribute('cy')) || 0;
            
            // Store the clicked body info
            this.lastClickedBody = {
                type: clickedElement.classList.contains('scanner-star') ? 'star' :
                      clickedElement.classList.contains('scanner-planet') ? 'planet' : 'moon',
                x: cx,
                y: cy,
                parentX: parseFloat(clickedElement.getAttribute('data-parent-x')) || null,
                parentY: parseFloat(clickedElement.getAttribute('data-parent-y')) || null
            };

            // Simple progressive zoom: go to next zoom level
            if (this.currentZoomLevel < this.maxZoomLevel) {
                this.currentZoomLevel++;
            }

            // Update center with validation
            this.currentCenter = { 
                x: isNaN(cx) ? 0 : cx,
                y: isNaN(cy) ? 0 : cy
            };
            
            this.updateScannerMap();
        }

        // If targeting computer is enabled, set this body as the target robustly
        const starfieldManager = this.viewManager.starfieldManager;
        if (starfieldManager && starfieldManager.targetComputerEnabled) {
            // Ensure TargetComputerManager exists and has a fresh list
            if (starfieldManager.targetComputerManager) {
                starfieldManager.targetComputerManager.updateTargetList();
                const tcm = starfieldManager.targetComputerManager;
                const idx = tcm.targetObjects.findIndex(t => (t.name === bodyName) || (t.object?.userData?.name === bodyName));
                if (idx !== -1) {
                    tcm.targetIndex = idx - 1; // cycleTarget will advance to idx
                    tcm.cycleTarget(false); // automatic cycle; avoids manual cooldown
                    // sync StarfieldManager reference for outline/reticle
                    starfieldManager.currentTarget = tcm.currentTarget?.object || tcm.currentTarget;
                    starfieldManager.targetIndex = tcm.targetIndex;
                    starfieldManager.targetObjects = tcm.targetObjects;
                }
            } else {
                // Fallback to previous behavior using SFManager list
                const targetIndex = starfieldManager.targetObjects.findIndex(obj => obj.name === bodyName);
                if (targetIndex !== -1) {
                    starfieldManager.targetIndex = targetIndex - 1;
                    starfieldManager.cycleTarget();
                }
            }
        }

        // Build the details HTML
        let detailsHTML = `
            <div class="scanner-details-header">
                <h2>${bodyInfo.name}</h2>
            </div>
            <div class="scanner-details-content">
                <div class="detail-row">
                    <span class="label">Type:</span>
                    <span class="value">${bodyInfo.type}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Class:</span>
                    <span class="value">${bodyInfo.classification}</span>
                </div>`;

        // Add parent planet info for moons
        if (parentPlanetInfo) {
            detailsHTML += `
                <div class="detail-row parent-planet">
                    <span class="label">Parent Planet:</span>
                    <span class="value">${parentPlanetInfo.name}</span>
                </div>`;
        }

        // Add standard details
        detailsHTML += `
                <div class="detail-row">
                    <span class="label">Diplomacy:</span>
                    <span class="value ${bodyInfo.diplomacy?.toLowerCase()}">${bodyInfo.diplomacy || 'Unknown'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Government:</span>
                    <span class="value">${bodyInfo.government || 'Unknown'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Economy:</span>
                    <span class="value">${bodyInfo.economy || 'Unknown'}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Technology:</span>
                    <span class="value">${bodyInfo.technology || 'Unknown'}</span>
                </div>
                ${bodyInfo.population ? `
                <div class="detail-row">
                    <span class="label">Population:</span>
                    <span class="value">${bodyInfo.population}</span>
                </div>
                ` : ''}
                
                <div class="detail-section">
                    <div class="detail-row description">
                        <span class="label">Description:</span>
                        <span class="value description-text">${bodyInfo.description || 'No description available.'}</span>
                    </div>
                </div>
                
                <div class="detail-section">
                    <div class="detail-row intel-brief">
                        <span class="label">Intel Brief:</span>
                        <span class="value intel-text">${bodyInfo.intel_brief || 'No intelligence data available.'}</span>
                    </div>
                </div>
            </div>`;

        this.detailsPanel.innerHTML = detailsHTML;
    }

    dispose() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
        if (this.tooltip && this.tooltip.parentNode) {
            this.tooltip.parentNode.removeChild(this.tooltip);
        }
    }

    addHoverEffects(element) {
        const growFactor = 1.3; // How much the object grows on hover
        const transitionDuration = 150; // Animation duration in milliseconds

        element.addEventListener('mouseenter', () => {
            const originalR = parseFloat(element.getAttribute('data-original-r'));
            element.style.transition = `r ${transitionDuration}ms ease-out`;
            element.setAttribute('r', String(originalR * growFactor));
        });

        element.addEventListener('mouseleave', () => {
            const originalR = element.getAttribute('data-original-r');
            element.style.transition = `r ${transitionDuration}ms ease-out`;
            element.setAttribute('r', originalR);
        });
    }
} 