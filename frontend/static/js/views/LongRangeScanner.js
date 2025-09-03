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
            // Render immediately if data is ready, otherwise show placeholder and poll briefly
            const ssm = this.viewManager.getSolarSystemManager();
            if (!ssm || !ssm.starSystem) {
                this.mapContainer.innerHTML = '<div style="color:#888; padding:20px; text-align:center;">Scanning sector data...</div>';
                this._readyTries = 0;
                // Event-driven readiness (from SolarSystemManager)
                const onReady = () => {
                    window.removeEventListener('starSystemReady', onReady);
                    if (this._isVisible) this.updateScannerMap();
                };
                window.addEventListener('starSystemReady', onReady);
                // Fallback polling in case event is missed
                this._readyInterval = setInterval(() => {
                    this._readyTries += 1;
                    const readySsm = this.viewManager.getSolarSystemManager();
                    if (readySsm && readySsm.starSystem) {
                        clearInterval(this._readyInterval);
                        this._readyInterval = null;
                        window.removeEventListener('starSystemReady', onReady);
                        this.updateScannerMap();
                    } else if (this._readyTries > 50) { // ~10s
                        clearInterval(this._readyInterval);
                        this._readyInterval = null;
                        window.removeEventListener('starSystemReady', onReady);
                        this.mapContainer.innerHTML = '<div style="color:#888; padding:20px; text-align:center;">No sector data available</div>';
                    }
                }, 200);
            } else {
                this.updateScannerMap();
            }
        }
    }

    hide(shouldRestoreView = false) {
        if (this._isVisible) {
            this._isVisible = false;
            this.container.classList.remove('visible');
            this.container.classList.remove('targeting-active');
            if (this._readyInterval) {
                clearInterval(this._readyInterval);
                this._readyInterval = null;
            }
            // Note: onReady function is defined locally in show() method and cleaned up there
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
        
        // Ensure valid zoom level (allow zoom out to 0.4 for beacon ring view)
        if (isNaN(this.currentZoomLevel) || this.currentZoomLevel < 0.4) {
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
        // console.log(`🔍 LRS ViewBox: zoom=${this.currentZoomLevel}, viewBox="${safeViewBox.x} ${safeViewBox.y} ${safeViewBox.width} ${safeViewBox.height}", center=(${this.currentCenter.x}, ${this.currentCenter.y})`);
        this.mapContainer.appendChild(svg);

        // Add click handler for empty space zoom out
        svg.addEventListener('click', (e) => {
            // Add small delay to prevent double-click interference
            setTimeout(() => {
                const clickedElement = document.elementFromPoint(e.clientX, e.clientY);
                console.log(`🔍 LRS Click: element=${clickedElement.tagName}, classes=[${clickedElement.className}], zoomLevel=${this.currentZoomLevel}`);
                
                // If clicked element is the SVG itself or a non-interactive element, zoom out
                const isInteractiveElement = clickedElement !== svg && (
                    clickedElement.classList.contains('scanner-star') || 
                    clickedElement.classList.contains('scanner-planet') || 
                    clickedElement.classList.contains('scanner-moon') ||
                    clickedElement.classList.contains('scanner-moon-hitbox') ||
                    clickedElement.classList.contains('scanner-station') ||
                    clickedElement.classList.contains('scanner-beacon') || // Exclude beacon clicks from zoom out
                    clickedElement.hasAttribute('data-name') // Any element with targeting data
                );
                
                if (!isInteractiveElement) {
                console.log(`🔍 LRS: Empty space clicked, zooming out from level ${this.currentZoomLevel}`);
                
                // More aggressive approach: If we get two clicks at non-super-zoom levels, force super zoom
                if (!this.lastZoomClickTime) this.lastZoomClickTime = 0;
                const now = Date.now();
                const isQuickDoubleClick = (now - this.lastZoomClickTime) < 1000; // Within 1 second
                
                if (isQuickDoubleClick && this.currentZoomLevel >= 1) {
                    // Force super zoom on quick double click
                    this.currentZoomLevel = 0.4;
                    this.currentCenter = { x: 0, y: 0 };
                    this.lastClickedBody = null;
                    console.log(`🔍 LRS: FORCE SUPER ZOOM (double click) to level ${this.currentZoomLevel} to show beacon ring`);
                    console.log(`🔍 LRS: ViewBox will be ~${Math.round(1000/0.4)}x${Math.round(1000/0.4)} (beacons at radius 350 should be visible)`);
                    this.updateScannerMap();
                } else if (this.currentZoomLevel > 1) {
                    // Step down zoom level by 1
                    this.currentZoomLevel--;
                    console.log(`🔍 LRS: Zoomed to level ${this.currentZoomLevel}`);
                    
                    // If we're zooming back to overview, reset center
                    if (this.currentZoomLevel === 1) {
                        this.currentCenter = { x: 0, y: 0 };
                        this.lastClickedBody = null;
                    }
                    
                    this.updateScannerMap();
                } else if (this.currentZoomLevel === 1) {
                    // We're at zoom level 1, zoom out further to show the full beacon ring
                    this.currentZoomLevel = 0.4; // Zoom out to 40% to show beacons at radius 350 (viewBox becomes 2500x2500)
                    this.currentCenter = { x: 0, y: 0 };
                    this.lastClickedBody = null;
                    console.log(`🔍 LRS: Super zoomed out to level ${this.currentZoomLevel} to show beacon ring`);
                    console.log(`🔍 LRS: ViewBox will be ~${Math.round(1000/0.4)}x${Math.round(1000/0.4)} (beacons at radius 350 should be visible)`);
                    this.updateScannerMap();
                } else if (this.currentZoomLevel < 1) {
                    // Already at super zoom level, reset back to normal
                    this.currentZoomLevel = 1;
                    this.currentCenter = { x: 0, y: 0 };
                    this.lastClickedBody = null;
                    console.log(`🔍 LRS: Reset zoom back to level ${this.currentZoomLevel}`);
                    this.updateScannerMap();
                } else {
                    // Fallback case
                    console.log(`🔍 LRS: Fallback - forcing super zoom from level ${this.currentZoomLevel}`);
                    this.currentZoomLevel = 0.4;
                    this.currentCenter = { x: 0, y: 0 };
                    this.lastClickedBody = null;
                    this.updateScannerMap();
                }
                
                this.lastZoomClickTime = now;
            } else {
                console.log(`🔍 LRS: Clicked interactive element, not zooming`);
            }
            }, 50); // Small delay to let other events settle
        });

        // Add double-click handler for zoom out
        svg.addEventListener('dblclick', (e) => {
            e.preventDefault(); // Prevent text selection on double click
            
            // Double-click always forces super zoom to see beacon ring
            this.currentZoomLevel = 0.4;
            this.currentCenter = { x: 0, y: 0 };
            this.lastClickedBody = null;
            console.log(`🔍 LRS: DOUBLE-CLICK SUPER ZOOM to level ${this.currentZoomLevel} to show beacon ring`);
            console.log(`🔍 LRS: ViewBox will be ~${Math.round(1000/0.4)}x${Math.round(1000/0.4)} (beacons at radius 350 should be visible)`);
            this.updateScannerMap();
        });
        
        // Add keyboard shortcut for super zoom (B for Beacons)
        document.addEventListener('keydown', (e) => {
            if (this._isVisible && (e.key === 'b' || e.key === 'B')) {
                e.preventDefault();
                this.currentZoomLevel = 0.4;
                this.currentCenter = { x: 0, y: 0 };
                this.lastClickedBody = null;
                console.log(`🔍 LRS: KEYBOARD SUPER ZOOM (B key) to level ${this.currentZoomLevel} to show beacon ring`);
                console.log(`🔍 LRS: ViewBox will be ~${Math.round(1000/0.4)}x${Math.round(1000/0.4)} (beacons at radius 350 should be visible)`);
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

        // Add navigation beacons (from StarfieldManager.navigationBeacons)
        (() => {
            const starfieldManager = this.viewManager?.starfieldManager;
            const beacons = starfieldManager?.navigationBeacons || [];
            // console.log(`🔍 Long Range Scanner: Found ${beacons.length} navigation beacons`);
            // console.log(`🔍 Long Range Scanner: Current viewBox - width: ${this.defaultViewBox.width}, height: ${this.defaultViewBox.height}, x: ${this.defaultViewBox.x}, y: ${this.defaultViewBox.y}`);
            if (!beacons || beacons.length === 0) {
                console.log(`🔍 Long Range Scanner: No beacons to display - starfieldManager=${!!starfieldManager}, navigationBeacons=${!!starfieldManager?.navigationBeacons}`);
                return;
            }
            
            // console.log(`🔍 Long Range Scanner: Drawing ${beacons.length} beacons at zoom ${this.currentZoomLevel}`);

            // Beacons get their own dedicated ring at 175km distance from Sol
            // Calculate scanner radius based on beacon's actual distance from center
            const beaconDistanceFromSol = 175; // km - matches the beacon creation radius
            const beaconScannerRadius = 350; // Dedicated ring for beacons, further out than stations but within viewBox

            // Draw the beacon orbital ring (dotted circle)
            const beaconRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            beaconRing.setAttribute('cx', '0');
            beaconRing.setAttribute('cy', '0');
            beaconRing.setAttribute('r', String(beaconScannerRadius));
            beaconRing.setAttribute('fill', 'none');
            beaconRing.setAttribute('stroke', '#ffff44');
            beaconRing.setAttribute('stroke-width', '1');
            beaconRing.setAttribute('stroke-dasharray', '5,3'); // Dotted line
            beaconRing.setAttribute('opacity', '0.6');
            beaconRing.setAttribute('class', 'beacon-orbit-ring');
            svg.appendChild(beaconRing);

            beacons.forEach((beacon, idx) => {
                if (!beacon || !beacon.position) {
                    console.log(`🔍 Beacon ${idx + 1}: Invalid beacon or position`);
                    return;
                }
                const pos = beacon.position;
                const angle = Math.atan2(pos.z, pos.x);

                // Place beacons on their dedicated outer ring
                const x = beaconScannerRadius * Math.cos(angle);
                const y = beaconScannerRadius * Math.sin(angle);
                
                // console.log(`🔍 Beacon ${idx + 1}: Position (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}) -> Scanner (${x.toFixed(1)}, ${y.toFixed(1)}) at radius ${beaconScannerRadius}`);
                // console.log(`🔍 Beacon ${idx + 1}: Current ViewBox: ${this.currentZoomLevel}x zoom, center=(${this.currentCenter.x}, ${this.currentCenter.y})`);

                // Draw small triangle marker for beacon
                const size = 10;
                const points = [
                    `${x},${y - size / 1.2}`,
                    `${x - size / 2},${y + size / 2}`,
                    `${x + size / 2},${y + size / 2}`
                ].join(' ');

                const tri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
                tri.setAttribute('points', points);
                tri.setAttribute('class', 'scanner-beacon');
                tri.setAttribute('data-name', beacon.userData?.name || 'Navigation Beacon');
                tri.setAttribute('data-index', String(idx));
                tri.setAttribute('fill', '#ffff00');
                tri.setAttribute('stroke', '#ffffff');
                tri.setAttribute('stroke-width', '1');
                tri.style.cursor = 'pointer';
                svg.appendChild(tri);

                // Tooltip + click
                tri.addEventListener('mousemove', (e) => {
                    const name = beacon.userData?.name || 'Navigation Beacon';
                    this.tooltip.textContent = name;
                    this.tooltip.style.display = 'block';
                    this.tooltip.style.left = e.clientX + 'px';
                    this.tooltip.style.top = e.clientY + 'px';
                });
                tri.addEventListener('mouseleave', () => {
                    this.tooltip.style.display = 'none';
                });
                tri.addEventListener('click', () => {
                    this.showBeaconDetailsByIndex(idx);
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
        const celestialBodies = svg.querySelectorAll('.scanner-star, .scanner-planet, .scanner-moon, .scanner-station, .scanner-beacon');
        celestialBodies.forEach(body => {
            body.addEventListener('click', () => {
                const isBeacon = body.classList.contains('scanner-beacon');
                if (isBeacon) {
                    const idxStr = body.getAttribute('data-index');
                    const idx = typeof idxStr === 'string' ? parseInt(idxStr, 10) : -1;
                    if (!isNaN(idx) && idx >= 0) this.showBeaconDetailsByIndex(idx);
                } else {
                    this.showCelestialBodyDetails(body.getAttribute('data-name'));
                }
            });
        });

        // Default selection: star of current sector if nothing selected yet
        if (!this.lastClickedBody && starSystem.star_name) {
            this.showCelestialBodyDetails(starSystem.star_name, false); // false = don't set target, just show details
        }
    }

    showCelestialBodyDetails(bodyName, setAsTarget = true) {
        console.log(`🔍 LRS: showCelestialBodyDetails called - bodyName: ${bodyName}, setAsTarget: ${setAsTarget}`);
        
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

            // Progressive zoom: go to next zoom level, or center on object if at max zoom
            if (this.currentZoomLevel < this.maxZoomLevel) {
                this.currentZoomLevel++;
            }
            // Always center on the clicked object (whether zooming in or already at max zoom)
            this.currentCenter = { 
                x: isNaN(cx) ? 0 : cx,
                y: isNaN(cy) ? 0 : cy
            };
            
            this.updateScannerMap();
        }

        // If targeting computer is enabled and this is a user click, set this body as the target robustly
        const starfieldManager = this.viewManager.starfieldManager;
        console.log(`🔍 LRS: Target setting check - setAsTarget: ${setAsTarget}, starfieldManager: ${!!starfieldManager}, targetComputerEnabled: ${starfieldManager?.targetComputerEnabled}`);
        
        if (setAsTarget && starfieldManager && starfieldManager.targetComputerEnabled) {
            // Ensure TargetComputerManager exists and has a fresh list
            if (starfieldManager.targetComputerManager) {
                const tcm = starfieldManager.targetComputerManager;

                // Store current target information before updating list
                const currentTargetName = tcm.currentTarget?.name;
                const currentTargetIndex = tcm.targetIndex;

                console.log(`🔍 LRS: Updating target list before setting scanner target for ${bodyName}`);
                console.log(`🔍 LRS: Current target before update: ${currentTargetName} at index ${currentTargetIndex}`);

                starfieldManager.targetComputerManager.updateTargetList();

                // Try to restore the current target after list update
                if (currentTargetName && currentTargetIndex >= 0) {
                    const restoredIndex = tcm.targetObjects.findIndex(t => t.name === currentTargetName);
                    if (restoredIndex !== -1) {
                        console.log(`🔧 LRS: Restoring target index from ${currentTargetIndex} to ${restoredIndex} for ${currentTargetName}`);
                        tcm.targetIndex = restoredIndex;
                        // Ensure currentTarget points to the correct object in the updated list
                        tcm.currentTarget = tcm.targetObjects[restoredIndex];
                        console.log(`🔧 LRS: Updated currentTarget reference to match target list object`);
                    }
                }

                let idx = tcm.targetObjects.findIndex(t => (t.name === bodyName) || (t.object?.userData?.name === bodyName));
                console.log(`🔍 LRS: Found ${bodyName} at index ${idx} in target list (${tcm.targetObjects.length} total targets)`);

                // If body not found in range, force-add it as an out-of-range target
                if (idx === -1) {
                    console.log(`🔍 Long Range Scanner: Adding out-of-range celestial body ${bodyName} to target list`);
                    const distance = starfieldManager.camera.position.distanceTo(targetBody.position);
                    const outOfRangeTarget = {
                        name: bodyName,
                        type: bodyInfo.type,
                        position: targetBody.position.toArray(),
                        isMoon: bodyInfo.type === 'moon',
                        isSpaceStation: bodyInfo.type === 'station',
                        object: targetBody,
                        isShip: false,
                        distance: distance,
                        outOfRange: true, // Flag to indicate this is out of range
                        faction: bodyInfo.faction || 'Neutral',
                        diplomacy: bodyInfo.diplomacy || 'Neutral',
                        ...bodyInfo
                    };
                    tcm.targetObjects.push(outOfRangeTarget);
                    idx = tcm.targetObjects.length - 1;

                    // Ensure target computer can cycle through this new target
                    console.log(`🔍 LRS: Added out-of-range target at index ${idx}, ensuring cycling is possible`);
                } else {
                    // Target already exists - check if we need to update its data
                    const existingTarget = tcm.targetObjects[idx];
                    if (existingTarget.outOfRange && !existingTarget.object) {
                        // Update existing out-of-range target with current object reference
                        console.log(`🔍 LRS: Updating existing out-of-range target ${bodyName} with current object reference`);
                        existingTarget.object = targetBody;
                        existingTarget.distance = starfieldManager.camera.position.distanceTo(targetBody.position);
                    }
                }

                // Additional safeguard: ensure target index is valid
                if (idx >= 0 && idx < tcm.targetObjects.length) {
                    console.log(`🔍 LRS: Target index ${idx} is valid for target list of size ${tcm.targetObjects.length}`);
                } else {
                    console.warn(`🔍 LRS: Target index ${idx} is invalid for target list of size ${tcm.targetObjects.length}`);
                    idx = -1; // Reset to prevent errors
                }
                
                if (idx !== -1) {
                    // Use proper scanner target selection method
                    const targetData = tcm.targetObjects[idx];

                    // Always set the scanner target to ensure proper synchronization
                    // The previous condition was preventing updates when target list indices changed
                    console.log(`🔍 LRS: Setting scanner target: ${targetData.name} (index: ${idx})`);
                    console.log(`🔍 LRS: Target data details:`, {
                        name: targetData.name,
                        type: targetData.type,
                        hasObject: !!targetData.object,
                        outOfRange: targetData.outOfRange,
                        targetListSize: tcm.targetObjects.length
                    });

                    starfieldManager.setTargetFromScanner(targetData);
                }
            } else {
                // Fallback to previous behavior using SFManager list
                const targetIndex = starfieldManager.targetObjects.findIndex(obj => obj.name === bodyName);
                if (targetIndex !== -1) {
                    // Set target directly without off-by-one error
                    starfieldManager.targetIndex = targetIndex;
                    // Create a target data object similar to what TargetComputerManager expects
                    const fallbackTargetData = starfieldManager.targetObjects[targetIndex];
                    starfieldManager.setTargetFromScanner(fallbackTargetData);
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

    // Beacon-specific detail display and CPU sync
    showBeaconDetailsByIndex(index) {
        const starfieldManager = this.viewManager?.starfieldManager;
        const beacons = starfieldManager?.navigationBeacons || [];
        const beacon = beacons[index];
        if (!beacon) return;

        // Zoom to beacon angular position on nearest ring (reuse station logic approximations)
        const svg = this.mapContainer.querySelector('svg');
        if (svg && beacon.position) {
            const pos = beacon.position;
            const angle = Math.atan2(pos.z, pos.x);
            // Use middle ring radius for visibility
            const r = 300;
            const cx = r * Math.cos(angle);
            const cy = r * Math.sin(angle);
            // Progressive zoom: go to next zoom level, or center on beacon if at max zoom
            if (this.currentZoomLevel < this.maxZoomLevel) {
                this.currentZoomLevel++;
            }
            // Always center on the clicked beacon (whether zooming in or already at max zoom)
            this.currentCenter = { x: cx, y: cy };
            this.updateScannerMap();
        }

        // If targeting computer is enabled, set beacon as current target
        if (starfieldManager?.targetComputerEnabled && starfieldManager.targetComputerManager) {
            const tcm = starfieldManager.targetComputerManager;
            // Refresh list so beacon appears via physics entities if in range
            tcm.updateTargetList();
            let idx = tcm.targetObjects.findIndex(t => t.object === beacon || t.name === (beacon.userData?.name || 'Navigation Beacon'));
            
            // If beacon not found in range, force-add it as an out-of-range target
            if (idx === -1) {
                console.log(`🔍 Long Range Scanner: Adding out-of-range beacon ${beacon.userData?.name || 'Navigation Beacon'} to target list`);
                const distance = starfieldManager.camera.position.distanceTo(beacon.position);
                const outOfRangeTarget = {
                    name: beacon.userData?.name || 'Navigation Beacon',
                    type: 'beacon',
                    position: beacon.position.toArray(),
                    isMoon: false,
                    isSpaceStation: false,
                    object: beacon,
                    isShip: false,
                    distance: distance,
                    outOfRange: true, // Flag to indicate this is out of range
                    faction: 'Neutral',
                    description: 'A navigation marker for local traffic lanes',
                    intel_brief: 'Transmits local traffic advisories on subspace band',
                    diplomacy: 'Neutral'
                };
                tcm.targetObjects.push(outOfRangeTarget);
                idx = tcm.targetObjects.length - 1;
            } else {
                // Beacon already exists - update its position and distance if needed
                const existingTarget = tcm.targetObjects[idx];
                if (existingTarget.outOfRange) {
                    const distance = starfieldManager.camera.position.distanceTo(beacon.position);
                    console.log(`🔍 LRS: Updating existing out-of-range beacon ${beacon.userData?.name || 'Navigation Beacon'} (distance: ${distance.toFixed(1)}km)`);
                    existingTarget.position = beacon.position.toArray();
                    existingTarget.distance = distance;
                }
            }
            
            if (idx !== -1) {
                // Use proper scanner target selection method
                const targetData = tcm.targetObjects[idx];

                // Always set the scanner target to ensure proper synchronization
                // The previous condition was preventing updates when target list indices changed
                console.log(`🔍 LRS: Setting scanner target: ${targetData.name} (index: ${idx})`);
                starfieldManager.setTargetFromScanner(targetData);
            }
        }

        // Details panel for beacon
        const name = beacon.userData?.name || 'Navigation Beacon';
        const desc = 'A navigation marker for local traffic lanes';
        const intel = 'Transmits local traffic advisories on subspace band';
        const type = 'beacon';
        const diplomacy = 'Neutral';
        this.detailsPanel.innerHTML = `
            <div class="scanner-details-header">
                <h2>${name}</h2>
            </div>
            <div class="scanner-details-content">
                <div class="detail-row"><span class="label">Type:</span><span class="value">${type}</span></div>
                <div class="detail-row"><span class="label">Diplomacy:</span><span class="value neutral">${diplomacy}</span></div>
                <div class="detail-section">
                    <div class="detail-row description"><span class="label">Description:</span><span class="value description-text">${desc}</span></div>
                </div>
                <div class="detail-section">
                    <div class="detail-row intel-brief"><span class="label">Intel Brief:</span><span class="value intel-text">${intel}</span></div>
                </div>
            </div>
        `;
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