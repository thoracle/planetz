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
        
        // Add intel state
        this.intelVisible = false;
        this.intelAvailable = false;
        this.intelRange = 10; // Changed from 5km to 10km
        
        // Create intel HUD
        this.createIntelHUD();
        
        // Bind keyboard events
        this.bindKeyEvents();
        // Bind mouse events
        this.bindMouseEvents();

        // Audio setup
        this.listener = new THREE.AudioListener();
        if (!this.camera) {
            console.error('No camera available for audio listener');
            return;
        }
        console.log('Adding audio listener to camera');
        this.camera.add(this.listener);

        this.audioLoader = new THREE.AudioLoader();
        this.engineSound = new THREE.Audio(this.listener);
        this.commandSound = new THREE.Audio(this.listener);
        this.soundLoaded = false;
        this.commandSoundLoaded = false;
        this.engineState = 'stopped'; // 'stopped', 'starting', 'running', 'stopping'

        // Load engine sound
        console.log('Loading engine sound...');
        this.audioLoader.load(
            '/audio/engines.wav',
            (buffer) => {
                console.log('Engine sound loaded successfully');
                this.engineSound.setBuffer(buffer);
                this.engineSound.setLoop(true);
                
                // Set loop points for the middle portion of the sound
                const duration = buffer.duration;
                console.log('Engine sound duration:', duration);
                const startupTime = duration * 0.25; // Increased from 15% to 25% to ensure we're at full volume
                const shutdownTime = duration * 0.70; // Keep at 70% to avoid end tapering
                
                // Ensure the loop points are at consistent volume points
                this.engineSound.setLoopStart(startupTime);
                this.engineSound.setLoopEnd(shutdownTime);
                
                // Store these times for later use
                this.engineTimes = {
                    startup: startupTime,
                    shutdown: shutdownTime,
                    total: duration
                };
                
                this.engineSound.setVolume(0.0);
                this.soundLoaded = true;
                console.log('Engine sound initialization complete');
            },
            (progress) => {
                console.log(`Loading engine sound: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
            },
            (error) => {
                console.error('Error loading engine sound:', error);
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack
                });
            }
        );

        // Load command sound
        console.log('Loading command sound...');
        this.audioLoader.load(
            '/audio/command.wav',
            (buffer) => {
                console.log('Command sound loaded successfully');
                this.commandSound.setBuffer(buffer);
                this.commandSound.setVolume(0.5); // Set a reasonable volume
                this.commandSoundLoaded = true;
                console.log('Command sound initialization complete');
            },
            (progress) => {
                console.log(`Loading command sound: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
            },
            (error) => {
                console.error('Error loading command sound:', error);
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack
                });
            }
        );
    }

    createStarfield() {
        try {
            // Validate star count before proceeding
            if (typeof this.starCount !== 'number' || isNaN(this.starCount)) {
                console.warn('Invalid starCount:', this.starCount, 'falling back to 5000');
                this.starCount = 5000;
            }

            // Ensure minimum and maximum values for star count
            const validStarCount = Math.max(5000, Math.min(500000, Math.floor(this.starCount)));
            if (validStarCount !== this.starCount) {
                console.log('Adjusted star count from', this.starCount, 'to', validStarCount);
                this.starCount = validStarCount;
            }

            const geometry = new THREE.BufferGeometry();
            const positions = new Float32Array(validStarCount * 3);
            const colors = new Float32Array(validStarCount * 3);
            const sizes = new Float32Array(validStarCount);
            
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

            let validVertices = 0;
            const minRadius = 100;
            const maxRadius = 1000;
            
            // Create all star positions
            for (let i = 0; i < validStarCount; i++) {
                try {
                    // Generate random spherical coordinates
                    const radius = minRadius + Math.random() * (maxRadius - minRadius);
                    const theta = Math.random() * Math.PI * 2;
                    const phi = Math.acos((Math.random() * 2) - 1);
                    
                    // Convert to Cartesian coordinates
                    const x = radius * Math.sin(phi) * Math.cos(theta);
                    const y = radius * Math.sin(phi) * Math.sin(theta);
                    const z = radius * Math.cos(phi);
                    
                    // Validate each coordinate
                    if (!isFinite(x) || !isFinite(y) || !isFinite(z) ||
                        isNaN(x) || isNaN(y) || isNaN(z)) {
                        throw new Error('Invalid coordinate calculation');
                    }
                    
                    // Store valid position
                    positions[validVertices * 3] = x;
                    positions[validVertices * 3 + 1] = y;
                    positions[validVertices * 3 + 2] = z;
                    
                    // Set color (brighter white with slight blue tint)
                    const brightness = 0.9 + Math.random() * 0.1;
                    colors[validVertices * 3] = brightness;
                    colors[validVertices * 3 + 1] = brightness;
                    colors[validVertices * 3 + 2] = brightness + 0.1;
                    
                    // Set size
                    sizes[validVertices] = (1 + Math.random() * 3) * 2;
                    
                    validVertices++;
                } catch (error) {
                    console.warn('Failed to create vertex', i, error);
                    continue;
                }
            }
            
            // If we have no valid vertices, throw error
            if (validVertices === 0) {
                throw new Error('No valid vertices created');
            }
            
            // Trim arrays to actual size if needed
            if (validVertices < validStarCount) {
                console.warn(`Created ${validVertices} valid stars out of ${validStarCount} attempted`);
                const trimmedPositions = new Float32Array(positions.buffer, 0, validVertices * 3);
                const trimmedColors = new Float32Array(colors.buffer, 0, validVertices * 3);
                const trimmedSizes = new Float32Array(sizes.buffer, 0, validVertices);
                
                geometry.setAttribute('position', new THREE.BufferAttribute(trimmedPositions, 3));
                geometry.setAttribute('color', new THREE.BufferAttribute(trimmedColors, 3));
                geometry.setAttribute('size', new THREE.BufferAttribute(trimmedSizes, 1));
            } else {
                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
                geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
            }
            
            // Verify geometry before creating mesh
            geometry.computeBoundingSphere();
            if (!geometry.boundingSphere || isNaN(geometry.boundingSphere.radius)) {
                throw new Error('Failed to compute valid bounding sphere');
            }
            
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
            
        } catch (error) {
            console.error('Error in createStarfield:', error);
            // Create a minimal fallback starfield
            return this.createFallbackStarfield();
        }
    }

    createFallbackStarfield() {
        console.log('Creating fallback starfield');
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(5000 * 3);
        const colors = new Float32Array(5000 * 3);
        const sizes = new Float32Array(5000);

        // Create a simple cube distribution of stars
        for (let i = 0; i < 5000; i++) {
            // Position stars in a cube formation (-500 to 500 on each axis)
            positions[i * 3] = (Math.random() - 0.5) * 1000;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 1000;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 1000;

            // White color
            colors[i * 3] = 1;
            colors[i * 3 + 1] = 1;
            colors[i * 3 + 2] = 1;

            // Uniform size
            sizes[i] = 2;
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
        this.energyBox.textContent = `Energy: ${this.viewManager.getShipEnergy()}`;
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
            el.classList.add('reticle-corner');  // Add class for easier updating
            el.style.cssText = `
                position: absolute;
                width: 10px;
                height: 10px;
                border: 2px solid #808080;  // Start with neutral gray
                box-shadow: 0 0 2px #808080;
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

        // Create intel icon
        this.intelIcon = document.createElement('div');
        this.intelIcon.style.cssText = `
            position: fixed;
            bottom: 230px;
            left: 20px;
            width: 30px;
            height: 30px;
            border: 2px solid #00ff41;
            background: rgba(0, 0, 0, 0.7);
            color: #00ff41;
            display: none;
            pointer-events: none;
            z-index: 1001;
            text-align: center;
            line-height: 30px;
            font-family: "Courier New", monospace;
            font-size: 16px;
            text-shadow: 0 0 5px #00ff41;
            box-shadow: 0 0 5px #00ff41;
            animation: pulse 2s infinite;
        `;

        // Add pulse animation style
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { box-shadow: 0 0 5px #00ff41; }
                50% { box-shadow: 0 0 15px #00ff41; }
                100% { box-shadow: 0 0 5px #00ff41; }
            }
        `;
        document.head.appendChild(style);

        // Add icon content (using a data icon)
        this.intelIcon.innerHTML = `
            <svg viewBox="0 0 24 24" style="width: 20px; height: 20px; margin-top: 5px;">
                <path fill="#00ff41" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
        `;
        
        document.body.appendChild(this.intelIcon);

        document.body.appendChild(this.targetHUD);
    }

    createIntelHUD() {
        // Create intel HUD container
        this.intelHUD = document.createElement('div');
        this.intelHUD.style.cssText = `
            position: fixed;
            bottom: 240px;
            left: 20px;
            width: 200px;
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
        
        document.body.appendChild(this.intelHUD);
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
                    if (this.engineState === 'running') {
                        this.playEngineShutdown();
                    }
                } else {
                    this.decelerating = false;
                    this.targetSpeed = speed;
                    // Start or adjust engine sound
                    if (this.soundLoaded) {
                        const volume = speed / this.maxSpeed;
                        if (this.engineState === 'stopped') {
                            this.playEngineStartup(volume);
                        } else if (this.engineState === 'running') {
                            this.engineSound.setVolume(volume);
                        }
                    }
                }
            }
            
            // Handle Tab key for cycling targets
            if (event.key === 'Tab') {
                event.preventDefault(); // Prevent Tab from changing focus
                if (this.targetComputerEnabled) {
                    this.cycleTarget();
                    this.playCommandSound(); // Play command sound when cycling targets
                }
                return; // Exit early to prevent further processing
            }
            
            // Play command sound for command keys
            const commandKey = event.key.toLowerCase();
            if (['a', 'f', 'g', 't', 'l'].includes(commandKey)) {
                this.playCommandSound();
            }

            // Handle view changes
            if (commandKey === 'f') {
                this.setView('FORE');
            } else if (commandKey === 'a') {
                this.setView('AFT');
            } else if (commandKey === 'g') {
                this.setView('GALACTIC');
            } else if (commandKey === 't') {
                this.toggleTargetComputer();
            }

            // Add Intel key binding
            if (event.key.toLowerCase() === 'i') {
                if (this.intelAvailable && this.targetComputerEnabled && this.currentTarget) {
                    this.toggleIntel();
                    this.playCommandSound();
                }
            }
        });

        document.addEventListener('keyup', (event) => {
            if (this.keys.hasOwnProperty(event.key)) {
                this.keys[event.key] = false;
            }
        });
    }

    toggleTargetComputer() {
        console.log('Toggling target computer. Current state:', this.targetComputerEnabled);
        this.targetComputerEnabled = !this.targetComputerEnabled;
        
        if (!this.targetComputerEnabled) {
            // When disabling targeting computer, hide everything
            this.targetHUD.style.display = 'none';
            this.targetReticle.style.display = 'none';
            this.intelHUD.style.display = 'none';
            this.intelIcon.style.display = 'none';
            this.intelVisible = false;
            this.intelAvailable = false;
            
            // Clean up wireframe
            if (this.targetWireframe) {
                this.wireframeScene.remove(this.targetWireframe);
                this.targetWireframe.geometry.dispose();
                this.targetWireframe.material.dispose();
                this.targetWireframe = null;
            }
            this.currentTarget = null;
            this.targetIndex = -1;
        } else {
            // When enabling targeting computer
            console.log('Target computer enabled, updating target list...');
            // Initialize or update target list
            this.updateTargetList();
            // Always start with the closest target (index 0) when enabling
            this.targetIndex = -1; // Will be incremented to 0 in cycleTarget
            this.cycleTarget();
        }
    }

    updateTargetList() {
        console.log('Updating target list...');
        if (!this.solarSystemManager) {
            console.error('No solarSystemManager reference available');
            return;
        }

        // Get celestial bodies from SolarSystemManager
        const bodies = this.solarSystemManager.getCelestialBodies();
        console.log('Retrieved celestial bodies:', bodies.size);
        
        const celestialBodies = Array.from(bodies.entries())
            .map(([key, body]) => {
                const info = this.solarSystemManager.getCelestialBodyInfo(body);
                console.log('Processing celestial body:', key, info);
                
                // Validate body position
                if (!body.position || 
                    isNaN(body.position.x) || 
                    isNaN(body.position.y) || 
                    isNaN(body.position.z)) {
                    console.warn('Invalid position detected for celestial body:', info.name);
                    return null;
                }
                
                return {
                    name: info.name,
                    type: info.type,
                    position: body.position.toArray(),
                    isMoon: key.startsWith('moon_'),
                    object: body  // Store the actual THREE.js object
                };
            })
            .filter(body => body !== null); // Remove any invalid bodies
        
        console.log('Processed celestial bodies:', celestialBodies.length);
        
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
        // Don't show anything if targeting is completely disabled
        if (!this.targetComputerEnabled) {
            this.targetReticle.style.display = 'none';
            this.intelAvailable = false;
            this.intelHUD.style.display = 'none';
            this.intelIcon.style.display = 'none';
            this.targetHUD.style.display = 'none';
            return;
        }

        // Handle galactic view
        const isGalacticView = this.viewManager.currentView === 'galactic';
        if (isGalacticView) {
            this.targetHUD.style.display = 'none';
            this.intelHUD.style.display = 'none';
            this.intelIcon.style.display = 'none';
            return;
        }

        // Keep target HUD visible as long as targeting is enabled
        this.targetHUD.style.display = 'block';

        // Handle case where there's no current target
        if (!this.currentTarget) {
            this.targetReticle.style.display = 'none';
            this.intelAvailable = false;
            this.intelHUD.style.display = 'none';
            this.intelIcon.style.display = 'none';
            return;
        }

        // Get the current target data
        const currentTargetData = this.getCurrentTargetData();
        if (!currentTargetData) {
            this.targetReticle.style.display = 'none';
            this.intelAvailable = false;
            this.intelHUD.style.display = 'none';
            this.intelIcon.style.display = 'none';
            return;
        }

        // Calculate distance to target
        const distance = this.calculateDistance(this.camera.position, this.currentTarget.position);
        const intelAvailable = distance <= this.intelRange;
        
        // Update intel availability and icon
        if (this.intelAvailable !== intelAvailable || !isGalacticView) {
            this.intelAvailable = intelAvailable;
            if (!intelAvailable) {
                // If we move out of range, hide both HUD and icon
                this.intelVisible = false;
                this.intelHUD.style.display = 'none';
                this.intelIcon.style.display = 'none';
            } else {
                // If we move into range or return from galactic view, show icon (unless intel HUD is visible)
                this.intelIcon.style.display = this.intelVisible ? 'none' : 'block';
                this.intelHUD.style.display = this.intelVisible ? 'block' : 'none';
            }
        }

        // Get target info for diplomacy status
        const info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
        
        // Set reticle and wireframe color based on diplomacy
        let targetColor = '#808080'; // Default to gray for unknown
        console.log('Target info:', info);
        
        // Case-insensitive comparison for diplomacy status
        const isEnemy = info?.diplomacy && /^enemy$/i.test(info.diplomacy);
        const isNeutral = info?.diplomacy && /^neutral$/i.test(info.diplomacy);
        const isFriendly = info?.diplomacy && /^friendly$/i.test(info.diplomacy);
        
        console.log('Processing diplomacy:', {
            original: info?.diplomacy,
            isEnemy, isNeutral, isFriendly
        });
        
        if (isEnemy) {
            targetColor = '#ff0000'; // Red for hostile
            console.log('Setting color to red for enemy');
        } else if (isNeutral) {
            targetColor = '#ffff00'; // Yellow for neutral
            console.log('Setting color to yellow for neutral');
        } else if (isFriendly) {
            targetColor = '#00ff41'; // Green for friendly
            console.log('Setting color to green for friendly');
        } else {
            console.log('Using default gray color');
        }
        console.log('Final target color:', targetColor);
        
        // Update reticle colors
        const corners = this.targetReticle.getElementsByClassName('reticle-corner');
        Array.from(corners).forEach(corner => {
            corner.style.borderColor = targetColor;
            corner.style.boxShadow = `0 0 2px ${targetColor}`;
        });

        // Update wireframe color if it exists
        if (this.targetWireframe && this.targetWireframe.material) {
            this.targetWireframe.material.color.setStyle(targetColor);
        }

        // Update the target information display
        this.targetInfoDisplay.innerHTML = `
            <div class="target-name">${currentTargetData.name}</div>
            <div class="target-type">${currentTargetData.type}${currentTargetData.isMoon ? ' (Moon)' : ''}</div>
            <div class="target-distance">Distance: ${this.formatDistance(distance)}</div>
        `;

        // Calculate target's screen position
        const screenPosition = this.currentTarget.position.clone().project(this.camera);
        
        const isOnScreen = Math.abs(screenPosition.x) <= 1 && Math.abs(screenPosition.y) <= 1;

        if (isOnScreen) {
            // Convert to screen coordinates
            const x = (screenPosition.x + 1) * window.innerWidth / 2;
            const y = (-screenPosition.y + 1) * window.innerHeight / 2;
            
            const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            const relativePos = this.currentTarget.position.clone().sub(this.camera.position);
            const dotProduct = relativePos.dot(cameraForward);
            
            // If dot product is negative, the target is behind the camera
            const isBehindCamera = dotProduct < 0;
            
            this.targetReticle.style.display = isBehindCamera ? 'none' : 'block';
            this.targetReticle.style.left = `${x}px`;
            this.targetReticle.style.top = `${y}px`;
        } else {
            this.targetReticle.style.display = 'none';
        }

        // Update direction arrows
        this.updateDirectionArrow();
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

        if (isOffScreen) {
            // Position arrow based on target position relative to camera
            let transform = '';
            let position = {};
            let edge = '';
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
                }
            }

            // Apply styles to arrow
            const styles = {
                display: 'block',
                transform: transform,
                ...position,
                ...extraStyles
            };

            Object.assign(this.directionArrow.style, styles);
            this.lastArrowState = { edge, transform };
        } else {
            this.directionArrow.style.display = 'none';
            this.lastArrowState = null;
        }
    }

    cycleTarget() {
        if (!this.targetComputerEnabled || this.targetObjects.length === 0) return;

        // Hide intel HUD and icon when switching targets
        this.intelVisible = false;
        this.intelAvailable = false;
        this.intelHUD.style.display = 'none';
        this.intelIcon.style.display = 'none';

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

        // Keep target HUD visible
        this.targetHUD.style.display = 'block';

        // Cycle to next target
        if (this.targetIndex === -1 || !this.currentTarget) {
            this.targetIndex = 0;
        } else {
            this.targetIndex = (this.targetIndex + 1) % this.targetObjects.length;
        }

        // Get the target object directly from our target list
        const targetData = this.targetObjects[this.targetIndex];
        this.currentTarget = targetData.object;

        // Create new wireframe in the HUD
        if (this.currentTarget) {
            try {
                const radius = this.currentTarget.geometry.boundingSphere?.radius || 1;
                let wireframeGeometry;
                
                // Get celestial body info
                const info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
                
                // Determine wireframe color based on diplomacy
                let wireframeColor = 0x808080; // Default gray for unknown
                
                // Case-insensitive comparison for diplomacy status
                const isEnemy = info?.diplomacy && /^enemy$/i.test(info.diplomacy);
                const isNeutral = info?.diplomacy && /^neutral$/i.test(info.diplomacy);
                const isFriendly = info?.diplomacy && /^friendly$/i.test(info.diplomacy);
                
                console.log('Processing wireframe diplomacy:', {
                    original: info?.diplomacy,
                    isEnemy, isNeutral, isFriendly
                });
                
                if (isEnemy) {
                    wireframeColor = 0xff0000; // Red for hostile
                    console.log('Setting wireframe to red');
                } else if (isNeutral) {
                    wireframeColor = 0xffff00; // Yellow for neutral
                    console.log('Setting wireframe to yellow');
                } else if (isFriendly) {
                    wireframeColor = 0x00ff41; // Green for friendly
                    console.log('Setting wireframe to green');
                } else {
                    console.log('Using default gray wireframe');
                }
                console.log('Final wireframe color:', wireframeColor.toString(16));
                
                if (info) {
                    // Create different shapes based on celestial body type
                    if (info.type === 'star' || (this.starSystem && info.name === this.starSystem.star_name)) {
                        // Star: Dodecahedron (12-sided) for medium complexity
                        wireframeGeometry = new THREE.DodecahedronGeometry(radius, 0);
                    } else if (targetData.isMoon) {
                        // Moon: Octahedron (8-sided) for simpler shape
                        wireframeGeometry = new THREE.OctahedronGeometry(radius, 0);
                    } else {
                        // Planet: Icosahedron (20-sided) for most complex shape
                        wireframeGeometry = new THREE.IcosahedronGeometry(radius, 0);
                    }
                } else {
                    // Fallback to basic shape if no info
                    wireframeGeometry = new THREE.IcosahedronGeometry(radius, 1);
                }

                const wireframeMaterial = new THREE.LineBasicMaterial({ 
                    color: wireframeColor,
                    linewidth: 1,
                    transparent: true,
                    opacity: 0.8
                });
                
                // Create edges geometry for cleaner lines
                const edgesGeometry = new THREE.EdgesGeometry(wireframeGeometry);
                this.targetWireframe = new THREE.LineSegments(edgesGeometry, wireframeMaterial);
                
                // Reset wireframe position and add to wireframe scene
                this.targetWireframe.position.set(0, 0, 0);
                this.wireframeScene.add(this.targetWireframe);
                
                // Position camera to fit the object
                this.wireframeCamera.position.z = radius * 3;
                
                // Set initial rotation
                this.targetWireframe.rotation.set(0.5, 0, 0.3);
            } catch (error) {
                console.warn('Failed to create wireframe for target:', error);
            }
        }

        // Update display after cycling target
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
            // Adjust engine sound volume during deceleration
            if (this.soundLoaded && this.engineState === 'running') {
                const volume = this.currentSpeed / this.maxSpeed;
                if (volume < 0.01) {
                    this.playEngineShutdown();
                } else {
                    this.engineSound.setVolume(volume);
                }
            }
        } else {
            // Handle acceleration and normal speed changes
            if (this.currentSpeed < this.targetSpeed) {
                this.currentSpeed = Math.min(this.targetSpeed, this.currentSpeed + this.acceleration);
            } else if (this.currentSpeed > this.targetSpeed) {
                this.currentSpeed = Math.max(this.targetSpeed, this.currentSpeed - this.deceleration);
            }
            
            // Adjust engine sound volume during speed changes
            if (this.soundLoaded) {
                const volume = this.currentSpeed / this.maxSpeed;
                if (this.engineState === 'stopped' && this.currentSpeed > 0) {
                    this.playEngineStartup(volume);
                } else if (this.engineState === 'running') {
                    this.engineSound.setVolume(volume);
                }
            }
        }
        
        this.updateSpeedIndicator();

        // Forward/backward movement based on view
        if (this.currentSpeed > 0) {
            const moveDirection = this.view === 'AFT' ? -1 : 1;
            
            // Calculate speed multiplier with reduced speeds for impulse 1, 2, and 3
            let speedMultiplier = this.currentSpeed * 0.2;
            
            // Apply speed reductions (fourth round)
            if (this.currentSpeed === 1) {
                speedMultiplier *= 0.0625; // 50% reduction four times = 6.25% of original speed
            } else if (this.currentSpeed === 2) {
                speedMultiplier *= 0.0625; // 50% reduction four times = 6.25% of original speed
            } else if (this.currentSpeed === 3) {
                speedMultiplier *= 0.20; // 33% reduction four times ≈ 20% of original speed
            }
            
            // Move in the direction the camera is facing
            const forwardVector = new THREE.Vector3(0, 0, -speedMultiplier * moveDirection);
            forwardVector.applyQuaternion(this.camera.quaternion);
            this.camera.position.add(forwardVector);
            this.camera.updateMatrixWorld();
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

                // Apply position based on view direction
                const moveDirection = this.view === 'AFT' ? -1 : 1;
                positions.array[i * 3] = this.camera.position.x + radius * Math.sin(phi) * Math.cos(theta) * moveDirection;
                positions.array[i * 3 + 1] = this.camera.position.y + radius * Math.sin(phi) * Math.sin(theta);
                positions.array[i * 3 + 2] = this.camera.position.z + radius * Math.cos(phi) * moveDirection;
            }
        }
        positions.needsUpdate = true;

        // Only update target display if we have a valid target and targeting is enabled
        if (this.targetComputerEnabled && this.currentTarget) {
            // Verify the current target is still valid
            const targetData = this.getCurrentTargetData();
            if (targetData && targetData.object === this.currentTarget) {
                this.updateTargetDisplay();
            } else {
                // Target mismatch, hide reticle
                this.targetReticle.style.display = 'none';
            }
        } else {
            // No valid target or targeting disabled
            this.targetReticle.style.display = 'none';
        }
        
        // Render wireframe if target computer is enabled and we have a target
        if (this.targetComputerEnabled && this.targetWireframe) {
            // Smooth rotation animation for wireframe
            this.targetWireframe.rotation.y += deltaTime * 0.3;
            this.targetWireframe.rotation.x = 0.5 + Math.sin(Date.now() * 0.001) * 0.1;
            
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
            // Reset target computer state before sector change
            if (this.targetComputerEnabled) {
                this.currentTarget = null;
                this.targetIndex = -1;
                this.targetHUD.style.display = 'none';
                this.targetReticle.style.display = 'none';
                
                // Clear any existing wireframe
                if (this.targetWireframe) {
                    this.wireframeScene.remove(this.targetWireframe);
                    this.targetWireframe.geometry.dispose();
                    this.targetWireframe.material.dispose();
                    this.targetWireframe = null;
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
        const SECTOR_SIZE = 100000; // Much larger sectors for vast space
        
        // Calculate grid coordinates
        // Adjust offsets to ensure (0,0,0) is in sector A0
        const x = Math.floor(pos.x / SECTOR_SIZE);
        const z = Math.floor(pos.z / SECTOR_SIZE);
        
        // Convert to sector notation (A0-J8)
        // Clamp x between 0-8 for sectors 0-8
        const col = Math.max(0, Math.min(8, x + 4)); // +4 to center around origin
        
        // Clamp z between 0-9 for sectors A-J
        const row = Math.max(0, Math.min(9, z + 5)); // +5 to center around origin
        const rowLetter = String.fromCharCode(65 + row); // 65 is ASCII for 'A'
        
        const sector = `${rowLetter}${col}`;
        
        console.log('Sector Calculation:', {
            position: pos.toArray(),
            rawGridX: x,
            rawGridZ: z,
            adjustedCol: col,
            adjustedRow: row,
            resultingSector: sector
        });
        
        return sector;
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
        if (this.intelHUD && this.intelHUD.parentNode) {
            this.intelHUD.parentNode.removeChild(this.intelHUD);
        }
        if (this.intelIcon && this.intelIcon.parentNode) {
            this.intelIcon.parentNode.removeChild(this.intelIcon);
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
        // Convert SCANNER to LONG RANGE for display
        this.view = viewType === 'SCANNER' ? 'LONG RANGE' : viewType.toUpperCase();
        
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

    /**
     * Clear target computer state
     */
    clearTargetComputer() {
        // Reset target state
        this.currentTarget = null;
        this.targetIndex = -1;
        this.targetObjects = [];
        
        // Hide HUD elements
        if (this.targetHUD) {
            this.targetHUD.style.display = 'none';
        }
        if (this.targetReticle) {
            this.targetReticle.style.display = 'none';
        }
        
        // Clear wireframe
        if (this.targetWireframe) {
            this.wireframeScene.remove(this.targetWireframe);
            this.targetWireframe.geometry.dispose();
            this.targetWireframe.material.dispose();
            this.targetWireframe = null;
        }
        
        // Disable target computer
        this.targetComputerEnabled = false;
    }

    playEngineStartup(targetVolume) {
        if (!this.soundLoaded) return;
        
        // Reset the sound to the beginning for startup sound
        this.engineSound.setLoop(false);
        this.engineSound.offset = 0;
        this.engineSound.setVolume(0); // Start silent
        this.engineSound.play();
        this.engineState = 'starting';
        
        // Gradually fade in during startup
        const startupDuration = this.engineTimes.startup * 1000; // Convert to milliseconds
        const fadeSteps = 20; // More steps for smoother transition
        const fadeInterval = startupDuration / fadeSteps;
        
        let step = 0;
        const fadeTimer = setInterval(() => {
            step++;
            if (step >= fadeSteps || this.engineState !== 'starting') {
                clearInterval(fadeTimer);
                if (this.engineState === 'starting') {
                    // Transition to looping portion
                    this.engineSound.stop();
                    this.engineSound.offset = this.engineTimes.startup;
                    this.engineSound.setLoop(true);
                    this.engineSound.play();
                    this.engineSound.setVolume(targetVolume);
                    this.engineState = 'running';
                }
            } else {
                // Smooth quadratic fade-in for more natural acceleration sound
                const progress = step / fadeSteps;
                const volume = targetVolume * (progress * progress);
                this.engineSound.setVolume(volume);
            }
        }, fadeInterval);
    }

    playEngineShutdown() {
        if (!this.soundLoaded || this.engineState === 'stopped') return;
        
        // Play the shutdown portion
        this.engineSound.setLoop(false);
        this.engineSound.offset = this.engineTimes.shutdown;
        this.engineState = 'stopping';
        
        // Gradually decrease volume during shutdown
        const shutdownDuration = (this.engineTimes.total - this.engineTimes.shutdown) * 1000;
        const startVolume = this.engineSound.getVolume();
        const fadeSteps = 10;
        const fadeInterval = shutdownDuration / fadeSteps;
        
        let step = 0;
        const fadeTimer = setInterval(() => {
            step++;
            if (step >= fadeSteps || this.engineState !== 'stopping') {
                clearInterval(fadeTimer);
                if (this.engineState === 'stopping') {
                    this.engineSound.stop();
                    this.engineState = 'stopped';
                }
            } else {
                const volume = startVolume * (1 - step / fadeSteps);
                this.engineSound.setVolume(volume);
            }
        }, fadeInterval);
    }

    playCommandSound() {
        if (this.commandSoundLoaded && !this.commandSound.isPlaying) {
            this.commandSound.play();
        }
    }

    // Function to recreate the starfield with new density
    recreateStarfield() {
        // Remove old starfield
        if (this.starfield) {
            this.scene.remove(this.starfield);
            if (this.starfield.geometry) {
                this.starfield.geometry.dispose();
            }
            if (this.starfield.material) {
                this.starfield.material.dispose();
            }
        }
        
        // Create new starfield with updated star count
        try {
            this.starfield = this.createStarfield();
            if (this.starfield) {
                this.scene.add(this.starfield);
                console.log('Successfully recreated starfield with', this.starCount, 'stars');
            }
        } catch (error) {
            console.error('Error recreating starfield:', error);
            // Fallback to minimum star count if there's an error
            this.starCount = 5000;
            this.starfield = this.createStarfield();
            this.scene.add(this.starfield);
        }
    }

    toggleIntel() {
        this.intelVisible = !this.intelVisible;
        
        // Toggle HUD and icon visibility
        this.intelHUD.style.display = this.intelVisible ? 'block' : 'none';
        // Only show icon when intel HUD is hidden AND we're in range
        this.intelIcon.style.display = (!this.intelVisible && this.intelAvailable) ? 'block' : 'none';
        
        this.updateIntelDisplay();
    }

    updateIntelDisplay() {
        if (!this.intelVisible || !this.currentTarget || !this.intelAvailable) {
            this.intelHUD.style.display = 'none';
            return;
        }

        const currentTargetData = this.getCurrentTargetData();
        if (!currentTargetData) {
            this.intelHUD.style.display = 'none';
            return;
        }

        // Get celestial body info from solar system manager
        const info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
        if (!info) {
            this.intelHUD.style.display = 'none';
            return;
        }
        
        // Format the intel information
        let intelHTML = `
            <div style="text-align: center; border-bottom: 1px solid #00ff41; padding-bottom: 5px; margin-bottom: 10px;">
                INTEL: ${currentTargetData.name}
            </div>
        `;

        // Check if it's a planet or moon by checking if diplomacy info exists
        if (info.diplomacy !== undefined) {
            // For planets and moons, show civilization data
            const diplomacyClass = info.diplomacy?.toLowerCase() === 'enemy' ? 'diplomacy-hostile' : 
                                 info.diplomacy?.toLowerCase() === 'friendly' ? 'diplomacy-friendly' :
                                 info.diplomacy?.toLowerCase() === 'neutral' ? 'diplomacy-neutral' :
                                 'diplomacy-unknown';
            
            intelHTML += `
                <div style="margin-bottom: 8px;">
                    <span style="color: #00aa41;">Diplomacy:</span> <span class="${diplomacyClass}">${info.diplomacy || 'Unknown'}</span>
                </div>
                <div style="margin-bottom: 8px;">
                    <span style="color: #00aa41;">Government:</span> ${info.government || 'Unknown'}
                </div>
                <div style="margin-bottom: 8px;">
                    <span style="color: #00aa41;">Economy:</span> ${info.economy || 'Unknown'}
                </div>
                <div style="margin-bottom: 8px;">
                    <span style="color: #00aa41;">Technology:</span> ${info.technology || 'Unknown'}
                </div>
            `;

            // Add population if available
            if (info.population) {
                intelHTML += `
                    <div style="margin-top: 12px; font-size: 0.9em; opacity: 0.8;">
                        Population: ${info.population}
                    </div>
                `;
            }
        } else {
            // For other celestial bodies (stars, asteroids, etc.)
            intelHTML += `
                <div style="margin-bottom: 5px;">Type: ${info.type || 'Unknown'}</div>
                <div style="margin-bottom: 5px;">Mass: ${info.mass || 'Unknown'}</div>
                <div style="margin-bottom: 5px;">Atmosphere: ${info.atmosphere || 'Unknown'}</div>
                <div style="margin-bottom: 5px;">Resources: ${info.resources || 'Unknown'}</div>
            `;
        }

        this.intelHUD.innerHTML = intelHTML;
        this.intelHUD.style.display = 'block';
    }
} 