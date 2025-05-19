import * as THREE from 'three';

export class StarfieldManager {
    constructor(scene, camera, viewManager) {
        this.scene = scene;
        this.camera = camera;
        this.viewManager = viewManager;  // Store the viewManager
        this.targetSpeed = 0;
        this.currentSpeed = 0;
        this.maxSpeed = 9;
        this.acceleration = 0.02; // Much slower acceleration
        this.deceleration = 0.03; // Slightly faster deceleration than acceleration
        this.decelerating = false; // New flag for tracking deceleration state
        this.energy = 9999;
        this.velocity = new THREE.Vector3();
        this.rotationSpeed = 2.0; // Radians per second
        this.cameraDirection = new THREE.Vector3();
        this.cameraRight = new THREE.Vector3();
        this.cameraUp = new THREE.Vector3();
        this.mouseSensitivity = 0.002;
        this.mouseRotation = new THREE.Vector2();
        this.isMouseLookEnabled = false; // Disable mouse look to match thoralexander.com
        this.view = 'FORE'; // Initialize with FORE view
        this.solarSystemManager = null; // Will be set by setSolarSystemManager
        
        // Target computer state
        this.targetComputerEnabled = false;
        this.currentTarget = null;
        this.targetIndex = -1;
        this.targetObjects = [];
        this.targetWireframe = null;
        this.targetReticle = null;
        
        // Add sorting state
        this.lastSortTime = 0;
        this.sortInterval = 2000; // Sort every 2 seconds
        
        // Add arrow state tracking
        this.lastArrowState = null;
        
        // Create starfield with quintuple density
        this.starCount = 40000;  // Increased from 8000 to 40000
        this.starfield = this.createStarfield();
        this.scene.add(this.starfield);
        
        // Create speed indicator
        this.createSpeedIndicator();
        
        // Create target computer HUD
        this.createTargetComputerHUD();
        
        // Bind keyboard events
        this.bindKeyEvents();
        // Bind mouse events
        this.bindMouseEvents();
    }

    createStarfield() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.starCount * 3);
        const colors = new Float32Array(this.starCount * 3);
        const sizes = new Float32Array(this.starCount);
        
        // Create sprite texture for stars
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        // Create radial gradient for glow effect
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);
        
        const sprite = new THREE.Texture(canvas);
        sprite.needsUpdate = true;
        
        for (let i = 0; i < this.starCount; i++) {
            // Random position in a large sphere around the camera
            const radius = 100 + Math.random() * 900; // Stars between 100 and 1000 units away
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi);
            
            // Brighter white colors with slight blue tint
            const brightness = 0.9 + Math.random() * 0.1; // Much brighter base
            colors[i * 3] = brightness;
            colors[i * 3 + 1] = brightness;
            colors[i * 3 + 2] = brightness + 0.1; // Slight blue tint
            
            // Larger, more varied sizes
            sizes[i] = (1 + Math.random() * 3) * 2;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            sizeAttenuation: true,
            blending: THREE.AdditiveBlending,
            map: sprite,
            depthWrite: false
        });
        
        return new THREE.Points(geometry, material);
    }

    createSpeedIndicator() {
        // Create individual boxes for each stat in the correct order: Energy, View, Speed
        const stats = ['Energy', 'View', 'Speed'].map((label, index) => {
            const box = document.createElement('div');
            box.style.cssText = `
                position: fixed;
                top: 10px;
                color: #00ff41;
                font-family: "Courier New", monospace;
                font-size: 20px;
                text-align: ${index === 0 ? 'left' : index === 1 ? 'center' : 'right'};
                pointer-events: none;
                z-index: 1000;
                ${index === 0 ? 'left: 10px;' : index === 1 ? 'left: 50%; transform: translateX(-50%);' : 'right: 10px;'}
                border: 1px solid #00ff41;
                padding: 5px 10px;
                min-width: 120px;
                background: rgba(0, 0, 0, 0.5);
            `;
            return box;
        });
        
        this.energyBox = stats[0];
        this.viewBox = stats[1];
        this.speedBox = stats[2];
        
        stats.forEach(box => document.body.appendChild(box));

        this.updateSpeedIndicator();
    }

    updateSpeedIndicator() {
        // Convert speed to impulse format
        let speedText;
        const currentSpeedLevel = Math.round(this.currentSpeed);
        
        if (currentSpeedLevel === 0) {
            speedText = "Full Stop";
        } else {
            // Display the exact impulse number matching the key pressed
            speedText = `Impulse ${currentSpeedLevel}`;
        }
        
        this.speedBox.textContent = `Speed: ${speedText}`;
        this.energyBox.textContent = `Energy: ${this.energy}`;
        this.viewBox.textContent = `View: ${this.view}`;
    }

    createTargetComputerHUD() {
        // Create target computer container
        this.targetHUD = document.createElement('div');
        this.targetHUD.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 200px;
            height: 200px;
            border: 2px solid #00ff41;
            background: rgba(0, 0, 0, 0.7);
            color: #00ff41;
            font-family: "Courier New", monospace;
            font-size: 14px;
            padding: 10px;
            display: none;
            pointer-events: none;
            z-index: 1000;
        `;
        
        // Create wireframe container with a renderer
        this.wireframeContainer = document.createElement('div');
        this.wireframeContainer.style.cssText = `
            width: 100%;
            height: 150px;
            border: 1px solid #00ff41;
            margin-bottom: 10px;
            position: relative;
            overflow: visible;
        `;
        
        // Create directional arrow
        this.directionArrow = document.createElement('div');
        this.directionArrow.style.cssText = `
            position: absolute;
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-bottom: 12px solid #00ff41;
            display: none;
            z-index: 1001;
            transform-origin: center center;
            pointer-events: none;
            filter: drop-shadow(0 0 2px #00ff41);
        `;
        this.wireframeContainer.appendChild(this.directionArrow);

        // Create target reticle corners
        this.targetReticle = document.createElement('div');
        this.targetReticle.style.cssText = `
            position: fixed;
            width: 40px;
            height: 40px;
            display: none;
            pointer-events: none;
            z-index: 999;
            transform: translate(-50%, -50%);
        `;

        // Create corner elements
        const corners = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
        corners.forEach(corner => {
            const el = document.createElement('div');
            el.style.cssText = `
                position: absolute;
                width: 10px;
                height: 10px;
                border: 2px solid #00ff41;
                box-shadow: 0 0 2px #00ff41;
            `;

            // Position and style each corner
            switch(corner) {
                case 'topLeft':
                    el.style.top = '0';
                    el.style.left = '0';
                    el.style.borderRight = 'none';
                    el.style.borderBottom = 'none';
                    break;
                case 'topRight':
                    el.style.top = '0';
                    el.style.right = '0';
                    el.style.borderLeft = 'none';
                    el.style.borderBottom = 'none';
                    break;
                case 'bottomLeft':
                    el.style.bottom = '0';
                    el.style.left = '0';
                    el.style.borderRight = 'none';
                    el.style.borderTop = 'none';
                    break;
                case 'bottomRight':
                    el.style.bottom = '0';
                    el.style.right = '0';
                    el.style.borderLeft = 'none';
                    el.style.borderTop = 'none';
                    break;
            }

            this.targetReticle.appendChild(el);
        });

        document.body.appendChild(this.targetReticle);

        // Create renderer for wireframe
        this.wireframeRenderer = new THREE.WebGLRenderer({ alpha: true });
        this.wireframeRenderer.setSize(200, 150);
        this.wireframeRenderer.setClearColor(0x000000, 0);
        
        // Create scene and camera for wireframe
        this.wireframeScene = new THREE.Scene();
        this.wireframeCamera = new THREE.PerspectiveCamera(45, 200/150, 0.1, 1000);
        this.wireframeCamera.position.z = 5;
        
        // Add lights to wireframe scene
        const wireframeLight = new THREE.DirectionalLight(0x00ff41, 1);
        wireframeLight.position.set(1, 1, 1);
        this.wireframeScene.add(wireframeLight);
        
        const wireframeAmbient = new THREE.AmbientLight(0x00ff41, 0.4);
        this.wireframeScene.add(wireframeAmbient);
        
        this.wireframeContainer.appendChild(this.wireframeRenderer.domElement);
        
        // Create target info display
        this.targetInfoDisplay = document.createElement('div');
        this.targetInfoDisplay.style.cssText = `
            width: 100%;
            text-align: left;
            margin-top: 10px;
        `;
        
        this.targetHUD.appendChild(this.wireframeContainer);
        this.targetHUD.appendChild(this.targetInfoDisplay);
        document.body.appendChild(this.targetHUD);
    }

    bindKeyEvents() {
        // Track key presses for speed control
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        };

        document.addEventListener('keydown', (event) => {
            if (this.keys.hasOwnProperty(event.key)) {
                this.keys[event.key] = true;
            }
            
            // Handle number keys for speed control
            if (/^[0-9]$/.test(event.key)) {
                const speed = parseInt(event.key);
                if (speed === 0) {
                    // Start deceleration and clear target speed
                    this.decelerating = true;
                    this.targetSpeed = 0;
                } else {
                    this.decelerating = false;
                    this.targetSpeed = speed;
                }
            }
            
            // Target computer toggle (T key)
            if (event.key.toLowerCase() === 't') {
                this.toggleTargetComputer();
            }

            // Tab key for cycling targets when target computer is enabled
            if (event.key === 'Tab' && this.targetComputerEnabled) {
                event.preventDefault();
                this.cycleTarget();
            }

            // Handle view changes
            if (event.key.toLowerCase() === 'f') {
                this.setView('FORE');
            } else if (event.key.toLowerCase() === 'a') {
                this.setView('AFT');
            }
        });

        document.addEventListener('keyup', (event) => {
            if (this.keys.hasOwnProperty(event.key)) {
                this.keys[event.key] = false;
            }
        });
    }

    toggleTargetComputer() {
        this.targetComputerEnabled = !this.targetComputerEnabled;
        this.targetHUD.style.display = this.targetComputerEnabled ? 'block' : 'none';
        
        if (!this.targetComputerEnabled) {
            if (this.targetReticle) {
                this.targetReticle.style.display = 'none';
            }
        }
        
        if (this.targetComputerEnabled) {
            // Initialize or update target list when enabling
            this.updateTargetList();
            // Always start with the closest target (index 0) when enabling
            this.targetIndex = -1; // Will be incremented to 0 in cycleTarget
            this.cycleTarget();
        } else {
            // Clean up when disabling
            if (this.targetWireframe) {
                this.wireframeScene.remove(this.targetWireframe);
                this.targetWireframe.geometry.dispose();
                this.targetWireframe.material.dispose();
                this.targetWireframe = null;
            }
            this.currentTarget = null;
            this.targetIndex = -1;
        }
    }

    updateTargetList() {
        // Get celestial bodies from SolarSystemManager
        const bodies = this.solarSystemManager.getCelestialBodies();
        const celestialBodies = Array.from(bodies.entries())
            .map(([key, body]) => {
                const info = this.solarSystemManager.getCelestialBodyInfo(body);
                return {
                    name: info.name,
                    type: info.type,
                    position: body.position.toArray(),
                    isMoon: key.startsWith('moon_')
                };
            });
        
        // Update target list
        this.targetObjects = celestialBodies;
        
        // Sort targets by distance
        this.sortTargetsByDistance();
        
        // Update target display
        this.updateTargetDisplay();
    }

    sortTargetsByDistance() {
        const cameraPosition = this.camera.position;
        
        this.targetObjects.sort((a, b) => {
            const distA = Math.sqrt(
                Math.pow(a.position[0] - cameraPosition.x, 2) +
                Math.pow(a.position[1] - cameraPosition.y, 2) +
                Math.pow(a.position[2] - cameraPosition.z, 2)
            );
            const distB = Math.sqrt(
                Math.pow(b.position[0] - cameraPosition.x, 2) +
                Math.pow(b.position[1] - cameraPosition.y, 2) +
                Math.pow(b.position[2] - cameraPosition.z, 2)
            );
            return distA - distB;
        });
        
        // Add distance to each target
        this.targetObjects = this.targetObjects.map(target => {
            const distance = Math.sqrt(
                Math.pow(target.position[0] - cameraPosition.x, 2) +
                Math.pow(target.position[1] - cameraPosition.y, 2) +
                Math.pow(target.position[2] - cameraPosition.z, 2)
            );
            return {
                ...target,
                distance: this.formatDistance(distance)
            };
        });
    }

    formatDistance(distanceInKm) {
        // Helper function to add commas to numbers
        const addCommas = (num) => {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        };

        if (distanceInKm >= 1e15) {
            // Convert to exameters (1 Em = 1e15 km)
            const distanceInEm = distanceInKm / 1e15;
            return `${addCommas(distanceInEm.toFixed(2))} Em`;
        } else if (distanceInKm >= 1e12) {
            // Convert to petameters (1 Pm = 1e12 km)
            const distanceInPm = distanceInKm / 1e12;
            return `${addCommas(distanceInPm.toFixed(2))} Pm`;
        } else if (distanceInKm >= 1e9) {
            // Convert to terameters (1 Tm = 1e9 km)
            const distanceInTm = distanceInKm / 1e9;
            return `${addCommas(distanceInTm.toFixed(2))} Tm`;
        } else if (distanceInKm >= 1e6) {
            // Convert to gigameters (1 Gm = 1e6 km)
            const distanceInGm = distanceInKm / 1e6;
            return `${addCommas(distanceInGm.toFixed(2))} Gm`;
        } else if (distanceInKm >= 1e3) {
            // Convert to megameters (1 Mm = 1e3 km)
            const distanceInMm = distanceInKm / 1e3;
            return `${addCommas(distanceInMm.toFixed(2))} Mm`;
        } else {
            return `${addCommas(distanceInKm.toFixed(2))} Km`;
        }
    }

    updateTargetDisplay() {
        if (!this.currentTarget) return;

        // Get the current target data
        const currentTargetData = this.getCurrentTargetData();
        if (!currentTargetData) return;

        // Calculate distance
        const distance = this.calculateDistance(this.camera.position, this.currentTarget.position);
        const formattedDistance = this.formatDistance(distance);

        // Update the target information display
        this.targetInfoDisplay.innerHTML = `
            <div class="target-name">${currentTargetData.name}</div>
            <div class="target-type">${currentTargetData.type}${currentTargetData.isMoon ? ' (Moon)' : ''}</div>
            <div class="target-distance">Distance: ${formattedDistance}</div>
        `;

        // Show/hide targeting reticle and HUD based on view
        const showTargeting = this.viewManager.currentView === 'front';
        this.targetReticle.style.display = showTargeting ? 'block' : 'none';
        this.targetHUD.style.display = showTargeting ? 'block' : 'none';
    }

    getCurrentTargetData() {
        if (!this.currentTarget || !this.targetObjects || this.targetIndex === -1) {
            return null;
        }
        return this.targetObjects[this.targetIndex];
    }

    calculateDistance(point1, point2) {
        // Calculate raw distance in world units
        const rawDistance = Math.sqrt(
            Math.pow(point2.x - point1.x, 2) +
            Math.pow(point2.y - point1.y, 2) +
            Math.pow(point2.z - point1.z, 2)
        );
        
        // Convert to kilometers (1 unit = 1 kilometer)
        return rawDistance;
    }

    getParentPlanetName(moon) {
        // Get all celestial bodies
        const bodies = this.solarSystemManager.getCelestialBodies();
        
        // Find the parent planet by checking which planet's position is closest to the moon
        let closestPlanet = null;
        let minDistance = Infinity;
        
        for (const [key, body] of bodies.entries()) {
            if (!key.startsWith('moon_')) {
                const distance = body.position.distanceTo(moon.position);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestPlanet = body;
                }
            }
        }
        
        if (closestPlanet) {
            const info = this.solarSystemManager.getCelestialBodyInfo(closestPlanet);
            return info.name;
        }
        
        return 'Unknown';
    }

    updateDirectionArrow() {
        // Only proceed if we have a target and the target computer is enabled
        if (!this.currentTarget || !this.targetComputerEnabled) {
            if (this.directionArrow.style.display !== 'none') {
                console.log('Arrow hidden - no target or targeting disabled');
                this.directionArrow.style.display = 'none';
                this.lastArrowState = null;
            }
            return;
        }

        // Get target's world position relative to camera
        const cameraPosition = this.camera.position;
        const targetPosition = this.currentTarget.position.clone();
        const relativePosition = targetPosition.clone().sub(cameraPosition);
        
        // Get camera's view direction
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(this.camera.quaternion);
        
        // Project target onto screen
        const screenPosition = targetPosition.clone().project(this.camera);
        
        // Check if target is off screen
        const isOffScreen = Math.abs(screenPosition.x) > 1 || Math.abs(screenPosition.y) > 1;

        // Only log position if it crosses the screen boundary
        const wasOffScreen = this.lastArrowState !== null;
        if (wasOffScreen !== isOffScreen) {
            console.log(`Target crossed screen boundary: (${screenPosition.x.toFixed(2)}, ${screenPosition.y.toFixed(2)}), isOffScreen: ${isOffScreen}`);
            console.log(`Camera direction: (${cameraDirection.x.toFixed(2)}, ${cameraDirection.y.toFixed(2)}, ${cameraDirection.z.toFixed(2)})`);
            console.log(`Relative position: (${relativePosition.x.toFixed(2)}, ${relativePosition.y.toFixed(2)}, ${relativePosition.z.toFixed(2)})`);
        }

        if (isOffScreen) {
            // Position arrow based on target position relative to camera
            let transform = '';
            let position = {};
            let edge = '';
            let expectedDirection = '';
            let extraStyles = {};

            // Get the angle between camera's view direction and relative position
            const angle = cameraDirection.angleTo(relativePosition);
            const isInFront = relativePosition.dot(cameraDirection) > 0;
            
            // Project relative position onto camera's XY plane
            const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
            
            const rightComponent = relativePosition.dot(cameraRight);
            const upComponent = relativePosition.dot(cameraUp);
            
            // Determine which edge to show the arrow on based on the strongest component
            if (Math.abs(rightComponent) > Math.abs(upComponent)) {
                if (rightComponent > 0) {
                    edge = 'right';
                    extraStyles = {
                        borderTop: '8px solid transparent',
                        borderBottom: '8px solid transparent',
                        borderLeft: '12px solid #00ff41',
                        borderRight: 'none'
                    };
                    transform = 'rotate(0deg)';
                    position = { 
                        right: '-12px', 
                        top: '50%', 
                        marginTop: '-8px',
                        left: 'auto',
                        bottom: 'auto'
                    };
                    expectedDirection = 'right';
                } else {
                    edge = 'left';
                    extraStyles = {
                        borderTop: '8px solid transparent',
                        borderBottom: '8px solid transparent',
                        borderRight: '12px solid #00ff41',
                        borderLeft: 'none'
                    };
                    transform = 'rotate(0deg)';
                    position = { 
                        left: '-12px', 
                        top: '50%', 
                        marginTop: '-8px',
                        right: 'auto',
                        bottom: 'auto'
                    };
                    expectedDirection = 'left';
                }
            } else {
                if (upComponent > 0) {
                    edge = 'top';
                    extraStyles = {
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderBottom: '12px solid #00ff41',
                        borderTop: 'none'
                    };
                    transform = 'rotate(0deg)';
                    position = { 
                        top: '-12px', 
                        left: '50%', 
                        marginLeft: '-8px',
                        right: 'auto',
                        bottom: 'auto'
                    };
                    expectedDirection = 'up';
                } else {
                    edge = 'bottom';
                    extraStyles = {
                        borderLeft: '8px solid transparent',
                        borderRight: '8px solid transparent',
                        borderTop: '12px solid #00ff41',
                        borderBottom: 'none'
                    };
                    transform = 'rotate(0deg)';
                    position = { 
                        bottom: '-12px', 
                        left: '50%', 
                        marginLeft: '-8px',
                        right: 'auto',
                        top: 'auto'
                    };
                    expectedDirection = 'down';
                }
            }

            // Create new state object
            const newState = {
                edge,
                transform,
                expectedDirection,
                display: 'block'
            };

            // Check if state has actually changed
            const hasChanged = !this.lastArrowState || 
                             this.lastArrowState.edge !== edge ||
                             this.lastArrowState.transform !== transform ||
                             this.lastArrowState.expectedDirection !== expectedDirection;

            // Apply styles to arrow and ensure all positions are explicitly set
            const styles = {
                display: 'block',
                transform: transform,
                ...position,
                ...extraStyles
            };

            // Apply styles and log them for debugging
            Object.assign(this.directionArrow.style, styles);
            
            // Log only if arrow state has changed
            if (hasChanged) {
                console.log(`Arrow changed to: ${edge} edge, ${expectedDirection} direction`);
                console.log(`Target relative to camera: ${isInFront ? 'in front' : 'behind'}, angle: ${(angle * 180 / Math.PI).toFixed(2)}°`);
                console.log('Applied styles:', styles);
                this.lastArrowState = newState;
            }
        } else {
            if (this.directionArrow.style.display !== 'none') {
                console.log('Arrow hidden - target is on screen');
                this.lastArrowState = null;
            }
            this.directionArrow.style.display = 'none';
        }
    }

    cycleTarget() {
        if (!this.targetComputerEnabled || this.targetObjects.length === 0) return;

        // Update target list first to ensure we have current distances
        this.updateTargetList();

        // Remove previous wireframe if it exists
        if (this.targetWireframe) {
            this.wireframeScene.remove(this.targetWireframe);
            this.targetWireframe.geometry.dispose();
            this.targetWireframe.material.dispose();
            this.targetWireframe = null;
        }

        // Hide reticle until new target is set
        if (this.targetReticle) {
            this.targetReticle.style.display = 'none';
        }

        // Cycle to next target
        if (this.targetIndex === -1 || !this.currentTarget) {
            this.targetIndex = 0;
        } else {
            this.targetIndex = (this.targetIndex + 1) % this.targetObjects.length;
        }

        // Get the target object from SolarSystemManager
        const targetData = this.targetObjects[this.targetIndex];
        const bodies = this.solarSystemManager.getCelestialBodies();
        
        // Find the matching celestial body
        for (const [key, body] of bodies.entries()) {
            const info = this.solarSystemManager.getCelestialBodyInfo(body);
            if (info.name === targetData.name && info.type === targetData.type) {
                this.currentTarget = body;
                break;
            }
        }

        // Create new wireframe in the HUD
        if (this.currentTarget) {
            try {
                // Create wireframe from the target's geometry
                const wireframeGeometry = new THREE.WireframeGeometry(this.currentTarget.geometry);
                const wireframeMaterial = new THREE.LineBasicMaterial({ 
                    color: 0x00ff41,
                    linewidth: 1,
                    transparent: true,
                    opacity: 0.8
                });
                this.targetWireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
                
                // Reset wireframe position and add to wireframe scene
                this.targetWireframe.position.set(0, 0, 0);
                this.wireframeScene.add(this.targetWireframe);
                
                // Auto-fit the wireframe to the view
                const bbox = new THREE.Box3().setFromObject(this.targetWireframe);
                const center = bbox.getCenter(new THREE.Vector3());
                const size = bbox.getSize(new THREE.Vector3());
                const maxDim = Math.max(size.x, size.y, size.z);
                
                // Position camera to fit the object with some padding
                this.wireframeCamera.position.z = maxDim * 2.5;
                this.targetWireframe.position.sub(center);
                
                // Set initial rotation
                this.targetWireframe.rotation.set(0.3, 0, 0);

                // Ensure HUD is visible
                this.targetHUD.style.display = 'block';
            } catch (error) {
                console.warn('Failed to create wireframe for target:', error);
                // Continue without wireframe
            }
        }

        this.updateTargetDisplay();
    }

    setSolarSystemManager(manager) {
        this.solarSystemManager = manager;
    }

    bindMouseEvents() {
        // Only handle clicks for weapons, no mouse look
        document.addEventListener('click', (event) => {
            // TODO: Implement weapons fire
        });
    }

    update(deltaTime) {
        if (!deltaTime) deltaTime = 1/60;

        // Handle rotation from arrow keys (instead of movement)
        const rotationSpeed = 0.015; // Reduced to match thoralexander.com's turning speed
        
        // Rotate camera based on arrow keys
        if (this.keys.ArrowLeft) {
            this.camera.rotateY(rotationSpeed);
        }
        if (this.keys.ArrowRight) {
            this.camera.rotateY(-rotationSpeed);
        }
        if (this.keys.ArrowUp) {
            this.camera.rotateX(rotationSpeed);
        }
        if (this.keys.ArrowDown) {
            this.camera.rotateX(-rotationSpeed);
        }

        // Handle speed changes with acceleration/deceleration
        if (this.decelerating) {
            // Continuously decelerate while in deceleration mode
            this.currentSpeed = Math.max(0, this.currentSpeed - this.deceleration);
            // Only clear deceleration flag if we press another speed
        } else if (this.currentSpeed < this.targetSpeed) {
            this.currentSpeed = Math.min(this.targetSpeed, this.currentSpeed + this.acceleration);
        } else if (this.currentSpeed > this.targetSpeed) {
            this.currentSpeed = Math.max(this.targetSpeed, this.currentSpeed - this.deceleration);
        }
        
        this.updateSpeedIndicator();

        // Forward/backward movement based on view
        if (this.currentSpeed > 0) {
            const moveDirection = this.view === 'AFT' ? -1 : 1;
            
            // Match thoralexander.com's speed scaling exactly
            const speedMultiplier = this.currentSpeed * 0.2;
            
            // Move in the direction the camera is facing
            const forwardVector = new THREE.Vector3(0, 0, -speedMultiplier);
            forwardVector.applyQuaternion(this.camera.quaternion);
            this.camera.position.add(forwardVector);
            this.camera.updateMatrixWorld();

            // Update current sector after movement
            this.updateCurrentSector();
        }

        // Update starfield
        const positions = this.starfield.geometry.attributes.position;
        const maxDistance = 1000; // Maximum distance from camera before respawning
        const minDistance = 100;  // Minimum spawn distance from camera

        for (let i = 0; i < positions.count; i++) {
            const x = positions.array[i * 3];
            const y = positions.array[i * 3 + 1];
            const z = positions.array[i * 3 + 2];

            // Calculate distance from camera
            const starPos = new THREE.Vector3(x, y, z);
            const distanceToCamera = starPos.distanceTo(this.camera.position);

            // If star is too far, respawn it closer to the camera
            if (distanceToCamera > maxDistance) {
                // Generate new position relative to camera
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos((Math.random() * 2) - 1);
                const radius = minDistance + Math.random() * (maxDistance - minDistance);

                positions.array[i * 3] = this.camera.position.x + radius * Math.sin(phi) * Math.cos(theta);
                positions.array[i * 3 + 1] = this.camera.position.y + radius * Math.sin(phi) * Math.sin(theta);
                positions.array[i * 3 + 2] = this.camera.position.z + radius * Math.cos(phi);
            }
        }
        positions.needsUpdate = true;

        // Update target computer display
        this.updateTargetDisplay();
        
        // Render wireframe if target computer is enabled and we have a target
        if (this.targetComputerEnabled && this.targetWireframe) {
            // Rotate wireframe for visual effect
            this.targetWireframe.rotation.y += deltaTime * 0.5;
            
            // Render the wireframe scene
            this.wireframeRenderer.render(this.wireframeScene, this.wireframeCamera);
        }
    }

    updateCurrentSector() {
        if (!this.solarSystemManager) return;

        // Calculate current sector based on position
        const currentSector = this.calculateCurrentSector();
        
        // Get the current sector from the solar system manager
        const currentSystemSector = this.solarSystemManager.currentSector;
        
        // Only update if we've moved to a new sector
        if (currentSector !== currentSystemSector) {
            console.log(`Moving from sector ${currentSystemSector} to ${currentSector}`);
            
            // Reset target computer state before sector change
            if (this.targetComputerEnabled) {
                this.currentTarget = null;
                this.targetIndex = -1;
                this.targetHUD.style.display = 'none';
                if (this.targetReticle) {
                    this.targetReticle.style.display = 'none';
                }
            }
            
            this.solarSystemManager.setCurrentSector(currentSector);
            // Generate new star system for the sector
            this.solarSystemManager.generateStarSystem(currentSector);
            
            // Update target list after sector change if target computer is enabled
            if (this.targetComputerEnabled) {
                setTimeout(() => {
                    this.updateTargetList();
                    this.cycleTarget();
                }, 100); // Small delay to ensure new system is fully generated
            }

            // Update galactic chart with new sector
            const galacticChart = this.viewManager.getGalacticChart();
            if (galacticChart) {
                // Convert sector to index (e.g., 'A0' -> 0, 'B1' -> 10, etc.)
                const row = currentSector.charCodeAt(0) - 65; // Convert A-J to 0-9
                const col = parseInt(currentSector[1]);
                const systemIndex = row * 9 + col;
                galacticChart.setShipLocation(systemIndex);
            }
        }
    }

    calculateCurrentSector() {
        if (!this.solarSystemManager) return 'A0';

        // Get camera position
        const pos = this.camera.position;
        
        // Define sector grid size (in game units)
        const SECTOR_SIZE = 1000; // Adjust this value based on your game scale
        
        // Calculate grid coordinates
        const x = Math.floor(pos.x / SECTOR_SIZE);
        const z = Math.floor(pos.z / SECTOR_SIZE);
        
        // Convert to sector notation (A0-J8)
        // Clamp x between 0-8 for sectors 0-8
        const col = Math.max(0, Math.min(8, x + 4)); // +4 to center around origin
        
        // Clamp z between 0-9 for sectors A-J
        const row = Math.max(0, Math.min(9, z + 5)); // +5 to center around origin
        const rowLetter = String.fromCharCode(65 + row); // 65 is ASCII for 'A'
        
        return `${rowLetter}${col}`;
    }

    dispose() {
        // Clean up UI elements
        if (this.speedBox && this.speedBox.parentNode) {
            this.speedBox.parentNode.removeChild(this.speedBox);
        }
        if (this.viewBox && this.viewBox.parentNode) {
            this.viewBox.parentNode.removeChild(this.viewBox);
        }
        if (this.targetHUD && this.targetHUD.parentNode) {
            this.targetHUD.parentNode.removeChild(this.targetHUD);
        }
        if (this.targetReticle && this.targetReticle.parentNode) {
            this.targetReticle.parentNode.removeChild(this.targetReticle);
        }
        if (this.starfield) {
            this.scene.remove(this.starfield);
            this.starfield.geometry.dispose();
            this.starfield.material.dispose();
        }
    }

    // Add this method to create the star sprite texture
    createStarSprite() {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        
        // Create radial gradient for glow effect
        const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.1, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.1)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 32, 32);
        
        return canvas;
    }

    // Update the setView method to handle view changes
    setView(viewType) {
        this.view = viewType.toUpperCase();
        // Update camera rotation based on view - instant 180° rotation
        if (this.view === 'AFT') {
            this.camera.rotation.set(0, Math.PI, 0); // 180 degrees around Y axis
        } else {
            this.camera.rotation.set(0, 0, 0); // Reset to forward
        }
        this.camera.updateMatrixWorld();
        this.updateSpeedIndicator();
    }

    resetStar(star) {
        // Reset star to a random position within the starfield radius
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const radius = 1000 * Math.random();

        star.position.x = radius * Math.sin(phi) * Math.cos(theta);
        star.position.y = radius * Math.sin(phi) * Math.sin(theta);
        star.position.z = radius * Math.cos(phi);
    }
} 