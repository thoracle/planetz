import * as THREE from 'three';
import { VIEW_TYPES } from './ViewManager.js';

export class LongRangeScanner {
    constructor(viewManager) {
        this.viewManager = viewManager;
        this._isVisible = false;
        this.currentZoomLevel = 1;
        this.maxZoomLevel = 3;
        this.zoomFactor = 1.5;
        this.currentCenter = { x: 0, y: 0 };
        this.lastClickedBody = null; // Track last clicked celestial body
        
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

        // Initialize drag scrolling
        this.initDragScroll();
    }

    initDragScroll() {
        let isDragging = false;
        let startX, startY, scrollLeft, scrollTop;

        this.mapContainer.addEventListener('mousedown', (e) => {
            isDragging = true;
            this.mapContainer.style.cursor = 'grabbing';
            startX = e.pageX - this.mapContainer.offsetLeft;
            startY = e.pageY - this.mapContainer.offsetTop;
            scrollLeft = this.mapContainer.scrollLeft;
            scrollTop = this.mapContainer.scrollTop;
        });

        this.mapContainer.addEventListener('mouseleave', () => {
            isDragging = false;
            this.mapContainer.style.cursor = 'grab';
        });

        this.mapContainer.addEventListener('mouseup', () => {
            isDragging = false;
            this.mapContainer.style.cursor = 'grab';
        });

        this.mapContainer.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            const x = e.pageX - this.mapContainer.offsetLeft;
            const y = e.pageY - this.mapContainer.offsetTop;
            const moveX = (x - startX) * 2;  // Multiply by 2 for faster scrolling
            const moveY = (y - startY) * 2;
            this.mapContainer.scrollLeft = scrollLeft - moveX;
            this.mapContainer.scrollTop = scrollTop - moveY;
        });
    }

    show() {
        if (!this._isVisible) {
            this._isVisible = true;
            this.container.classList.add('visible');
            // Reset zoom when showing the scanner
            this.currentZoomLevel = 1;
            this.currentCenter = { x: 0, y: 0 };
            this.updateScannerMap();
        }
    }

    hide(shouldRestoreView = false) {
        if (this._isVisible) {
            this._isVisible = false;
            this.container.classList.remove('visible');
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

        const starSystem = solarSystemManager.starSystem;
        if (!starSystem) return;

        // Create the map SVG
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'scanner-map');
        svg.setAttribute('viewBox', `${-500/this.currentZoomLevel + this.currentCenter.x} ${-500/this.currentZoomLevel + this.currentCenter.y} ${1000/this.currentZoomLevel} ${1000/this.currentZoomLevel}`);
        this.mapContainer.appendChild(svg);

        // Add double-click handler for zoom
        svg.addEventListener('dblclick', (e) => {
            e.preventDefault(); // Prevent text selection on double click
            const rect = svg.getBoundingClientRect();
            const x = e.clientX;
            const y = e.clientY;
            
            // Find the celestial body under the cursor
            const element = document.elementFromPoint(x, y);
            
            if (element && (element.classList.contains('scanner-star') || 
                          element.classList.contains('scanner-planet') || 
                          element.classList.contains('scanner-moon'))) {
                // Zoom in on the clicked object if not at max zoom
                if (this.currentZoomLevel < this.maxZoomLevel) {
                    this.currentZoomLevel *= this.zoomFactor;
                    
                    // Get the clicked object's center in SVG coordinates
                    const cx = parseFloat(element.getAttribute('cx'));
                    const cy = parseFloat(element.getAttribute('cy'));
                    
                    // Store the clicked body for reference when zooming out
                    this.lastClickedBody = {
                        type: element.classList.contains('scanner-star') ? 'star' :
                              element.classList.contains('scanner-planet') ? 'planet' : 'moon',
                        x: cx,
                        y: cy,
                        parentX: element.classList.contains('scanner-moon') ? 
                                parseFloat(element.getAttribute('data-parent-x')) : null,
                        parentY: element.classList.contains('scanner-moon') ? 
                                parseFloat(element.getAttribute('data-parent-y')) : null
                    };
                    
                    // Update the center point for the zoom
                    this.currentCenter.x = cx;
                    this.currentCenter.y = cy;
                    
                    this.updateScannerMap();
                }
            } else {
                // Zoom out if clicked empty space and not at minimum zoom
                if (this.currentZoomLevel > 1) {
                    const previousZoom = this.currentZoomLevel;
                    this.currentZoomLevel /= this.zoomFactor;
                    
                    // If zooming all the way out, reset center
                    if (this.currentZoomLevel <= 1) {
                        this.currentZoomLevel = 1;
                        this.currentCenter = { x: 0, y: 0 };
                        this.lastClickedBody = null;
                    } else if (this.lastClickedBody) {
                        // If zooming out from a moon, center on its parent planet
                        if (this.lastClickedBody.type === 'moon' && previousZoom > 2) {
                            this.currentCenter = {
                                x: this.lastClickedBody.parentX,
                                y: this.lastClickedBody.parentY
                            };
                        }
                        // If zooming out from a planet, center on the star
                        else if (this.lastClickedBody.type === 'planet' && this.currentZoomLevel === 1) {
                            this.currentCenter = { x: 0, y: 0 };
                            this.lastClickedBody = null;
                        }
                    }
                    
                    this.updateScannerMap();
                }
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
                planetElement.setAttribute('r', String(planet.planet_size * 5));
                planetElement.setAttribute('class', `scanner-planet scanner-planet-${planet.diplomacy?.toLowerCase() || 'neutral'}`);
                planetElement.setAttribute('data-name', planet.planet_name);
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

                        // Draw moon (visual representation)
                        const moonElement = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                        moonElement.setAttribute('cx', String(moonX));
                        moonElement.setAttribute('cy', String(moonY));
                        moonElement.setAttribute('r', String(Math.max(moon.moon_size * 2 || 2, 3))); // Minimum visual size of 3
                        moonElement.setAttribute('class', `scanner-moon scanner-moon-${moon.diplomacy?.toLowerCase() || 'neutral'}`);
                        moonElement.setAttribute('data-name', moon.moon_name);
                        moonElement.setAttribute('data-parent', planet.planet_name);
                        moonElement.setAttribute('data-parent-x', String(x));
                        moonElement.setAttribute('data-parent-y', String(y));
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
        const celestialBodies = svg.querySelectorAll('.scanner-star, .scanner-planet, .scanner-moon');
        celestialBodies.forEach(body => {
            body.addEventListener('click', () => {
                this.showCelestialBodyDetails(body.getAttribute('data-name'));
            });
        });
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

        // Build the details HTML
        let detailsHTML = `
            <div class="scanner-details-header">
                <h2>${bodyInfo.name}</h2>
                <span class="body-type">${bodyInfo.type}</span>
            </div>
            <div class="scanner-details-content">`;

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
} 