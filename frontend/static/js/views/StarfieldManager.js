import * as THREE from 'three';

export class StarfieldManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.targetSpeed = 0;
        this.currentSpeed = 0;
        this.maxSpeed = 9;
        this.acceleration = 2.0; // Units per second
        this.deceleration = 1.5; // Units per second
        this.energy = 9999;
        this.velocity = new THREE.Vector3();
        this.rotationSpeed = 2.0; // Radians per second
        this.cameraDirection = new THREE.Vector3();
        this.cameraRight = new THREE.Vector3();
        this.cameraUp = new THREE.Vector3();
        this.mouseSensitivity = 0.002;
        this.mouseRotation = new THREE.Vector2();
        this.isMouseLookEnabled = true;
        this.view = 'FORE'; // Add view state - can be 'FORE' or 'AFT'
        
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
        
        // Create starfield with quadruple density
        this.starCount = 8000;  // Doubled again from 4000
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
        
        // Create target info container
        this.targetInfo = document.createElement('div');
        this.targetInfo.style.cssText = `
            width: 100%;
            text-align: left;
        `;
        
        this.targetHUD.appendChild(this.wireframeContainer);
        this.targetHUD.appendChild(this.targetInfo);
        document.body.appendChild(this.targetHUD);
    }

    bindKeyEvents() {
        // Track which keys are currently pressed
        this.keysPressed = {
            ArrowLeft: false,
            ArrowRight: false,
            ArrowUp: false,
            ArrowDown: false
        };

        document.addEventListener('keydown', (event) => {
            // Speed control (0-9)
            if (!event.ctrlKey && !event.metaKey && !event.altKey && /^[0-9]$/.test(event.key)) {
                this.targetSpeed = parseInt(event.key);
                return;
            }
            
            // Target computer toggle (T key)
            if (event.key.toLowerCase() === 't') {
                this.toggleTargetComputer();
                return;
            }

            // Tab key for cycling targets when target computer is enabled
            if (event.key === 'Tab' && this.targetComputerEnabled) {
                event.preventDefault();
                this.cycleTarget();
                return;
            }
            
            // Track arrow key states
            if (event.key in this.keysPressed) {
                this.keysPressed[event.key] = true;
                event.preventDefault();
            }
        });

        document.addEventListener('keyup', (event) => {
            // Update key states
            if (event.key in this.keysPressed) {
                this.keysPressed[event.key] = false;
                event.preventDefault();
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
        // Get targetable objects from solar system
        const targetableObjects = this.solarSystemManager.getCelestialBodies();
        
        // Calculate distances from camera
        this.targetObjects = targetableObjects.map(obj => {
            const sceneDistance = obj.position.distanceTo(this.camera.position);
            // Convert scene distance back to real distance in meters
            const realDistance = sceneDistance / (this.solarSystemManager.SCALE_FACTOR * this.solarSystemManager.VISUAL_SCALE);
            // Convert to kilometers for display
            const distanceInKm = realDistance / 1000;
            
            return {
                object: obj,
                distance: distanceInKm
            };
        });

        // Sort by distance
        this.targetObjects.sort((a, b) => a.distance - b.distance);
        
        // Reset target index if list was updated
        if (this.currentTargetIndex >= this.targetObjects.length) {
            this.currentTargetIndex = 0;
        }

        // Log sorted targets if target computer is enabled
        if (this.targetComputerEnabled) {
            console.log('Sorted targets by distance:', this.targetObjects.map(t => ({
                name: this.solarSystemManager.getCelestialBodyInfo(t.object).name,
                distance: this.formatDistance(t.distance)
            })));
        }
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
            return `${addCommas(distanceInKm.toFixed(2))} km`;
        }
    }

    updateTargetDisplay() {
        if (!this.currentTarget || !this.targetComputerEnabled) {
            this.targetHUD.style.display = 'none';
            if (this.targetReticle) {
                this.targetReticle.style.display = 'none';
            }
            return;
        }

        const targetInfo = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
        const sceneDistance = this.currentTarget.position.distanceTo(this.camera.position);
        // Convert scene distance back to real distance in meters
        const realDistance = sceneDistance / (this.solarSystemManager.SCALE_FACTOR * this.solarSystemManager.VISUAL_SCALE);
        // Convert to kilometers for display
        const distanceInKm = realDistance / 1000;

        // Update target info display
        this.targetInfo.innerHTML = `
            <div class="target-info">
                ${targetInfo.name}<br>
                Type: ${targetInfo.type}<br>
                Distance: ${this.formatDistance(distanceInKm)}
            </div>
        `;

        // Update reticle position
        const screenPosition = this.currentTarget.position.clone().project(this.camera);
        const isOnScreen = Math.abs(screenPosition.x) <= 1 && Math.abs(screenPosition.y) <= 1;
        
        if (isOnScreen) {
            // Convert to screen coordinates
            const x = (screenPosition.x + 1) * window.innerWidth / 2;
            const y = (-screenPosition.y + 1) * window.innerHeight / 2;
            
            this.targetReticle.style.display = 'block';
            this.targetReticle.style.left = `${x}px`;
            this.targetReticle.style.top = `${y}px`;
        } else {
            this.targetReticle.style.display = 'none';
        }

        // Always show HUD when target computer is enabled
        this.targetHUD.style.display = 'block';

        // Check if target is on screen and update direction arrow
        this.updateDirectionArrow();
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
        this.currentTarget = this.targetObjects[this.targetIndex].object;

        // Create new wireframe in the HUD
        if (this.currentTarget) {
            try {
                // Create wireframe from the target's geometry
                const wireframeGeometry = new THREE.WireframeGeometry(this.currentTarget.geometry);
                const wireframeMaterial = new THREE.LineBasicMaterial({ 
                    color: 0x00ff41,
                    linewidth: 1
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
                
                // Position camera to fit the object
                this.wireframeCamera.position.z = maxDim * 2;
                this.targetWireframe.position.sub(center);

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
        document.addEventListener('mousemove', (event) => {
            if (this.isMouseLookEnabled && event.buttons === 1) { // Left mouse button
                this.mouseRotation.x -= event.movementX * this.mouseSensitivity;
                this.mouseRotation.y -= event.movementY * this.mouseSensitivity;
                
                // Clamp vertical rotation
                this.mouseRotation.y = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.mouseRotation.y));
                
                // Apply rotation to camera
                const euler = new THREE.Euler(this.mouseRotation.y, this.mouseRotation.x, 0, 'YXZ');
                this.camera.quaternion.setFromEuler(euler);
            }
        });
    }

    update(deltaTime) {
        if (!deltaTime) deltaTime = 1/60;
        
        // Update speed with acceleration/deceleration
        if (this.currentSpeed < this.targetSpeed) {
            this.currentSpeed = Math.min(this.targetSpeed, this.currentSpeed + this.acceleration * deltaTime);
        } else if (this.currentSpeed > this.targetSpeed) {
            this.currentSpeed = Math.max(this.targetSpeed, this.currentSpeed - this.deceleration * deltaTime);
        }
        
        // Update speed indicator
        this.updateSpeedIndicator();
        
        // Update target computer display if enabled
        if (this.targetComputerEnabled && this.currentTarget) {
            this.updateTargetDisplay();
            
            // Rotate the wireframe model
            if (this.targetWireframe) {
                this.targetWireframe.rotation.y += deltaTime * 0.5;
                this.wireframeRenderer.render(this.wireframeScene, this.wireframeCamera);
            }
        }
        
        // Handle rotation based on arrow keys
        if (this.keysPressed.ArrowLeft) {
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationAxis(this.camera.up, this.rotationSpeed * deltaTime);
            this.camera.quaternion.premultiply(new THREE.Quaternion().setFromRotationMatrix(rotationMatrix));
        }
        if (this.keysPressed.ArrowRight) {
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationAxis(this.camera.up, -this.rotationSpeed * deltaTime);
            this.camera.quaternion.premultiply(new THREE.Quaternion().setFromRotationMatrix(rotationMatrix));
        }
        if (this.keysPressed.ArrowUp) {
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationAxis(right, -this.rotationSpeed * deltaTime);
            this.camera.quaternion.premultiply(new THREE.Quaternion().setFromRotationMatrix(rotationMatrix));
        }
        if (this.keysPressed.ArrowDown) {
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationAxis(right, this.rotationSpeed * deltaTime);
            this.camera.quaternion.premultiply(new THREE.Quaternion().setFromRotationMatrix(rotationMatrix));
        }

        // Get camera orientation vectors
        this.camera.getWorldDirection(this.cameraDirection);
        
        // Move based on current speed and view
        if (this.currentSpeed > 0) {
            // Calculate movement - direction based on view
            const moveDirection = this.view === 'AFT' ? -1 : 1;
            
            // Apply speed multipliers based on impulse level
            let speedMultiplier = 1;
            switch (Math.round(this.currentSpeed)) {
                case 9: speedMultiplier = 5.0; break;   // 5x faster
                case 8: speedMultiplier = 4.0; break;   // 4x faster
                case 7: speedMultiplier = 3.0; break;   // 3x faster
                case 6: speedMultiplier = 2.0; break;   // 2x faster
                case 5: speedMultiplier = 1.5; break;   // 1.5x faster
                case 4: speedMultiplier = 1.25; break;  // 1.25x faster
                default: speedMultiplier = 1.0;         // normal speed
            }
            
            this.velocity.copy(this.cameraDirection).multiplyScalar(this.currentSpeed * deltaTime * speedMultiplier * moveDirection);
            
            // Move camera
            this.camera.position.add(this.velocity);
            this.camera.updateMatrixWorld();
            
            // Update starfield
            const positions = this.starfield.geometry.attributes.position;
            const cameraPos = this.camera.position;
            
            for (let i = 0; i < this.starCount; i++) {
                const i3 = i * 3;
                const starPos = new THREE.Vector3(
                    positions.array[i3],
                    positions.array[i3 + 1],
                    positions.array[i3 + 2]
                );
                
                // If star is too far, reset it closer to the camera
                if (starPos.distanceTo(cameraPos) > 1000) {
                    // Reset star to a random position in a sphere around the camera
                    const radius = 100;
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos((Math.random() * 2) - 1);
                    
                    positions.array[i3] = cameraPos.x + radius * Math.sin(phi) * Math.cos(theta);
                    positions.array[i3 + 1] = cameraPos.y + radius * Math.sin(phi) * Math.sin(theta);
                    positions.array[i3 + 2] = cameraPos.z + radius * Math.cos(phi);
                }
                
                // Move star based on velocity (creates motion effect)
                positions.array[i3] -= this.velocity.x;
                positions.array[i3 + 1] -= this.velocity.y;
                positions.array[i3 + 2] -= this.velocity.z;
            }
            
            positions.needsUpdate = true;
            
            // Update star sizes based on speed
            const sizes = this.starfield.geometry.attributes.size;
            const speedFactor = this.currentSpeed / this.maxSpeed;
            for (let i = 0; i < this.starCount; i++) {
                sizes.array[i] = (1 + speedFactor * 2) * Math.random() * 2;
            }
            sizes.needsUpdate = true;
        }
    }

    dispose() {
        // Clean up UI elements
        if (this.speedBox && this.speedBox.parentNode) {
            this.speedBox.parentNode.removeChild(this.speedBox);
        }
        if (this.energyBox && this.energyBox.parentNode) {
            this.energyBox.parentNode.removeChild(this.energyBox);
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

    // Add method to update view state from ViewManager
    setView(viewType) {
        this.view = viewType.toUpperCase();
        this.updateSpeedIndicator();
    }
} 