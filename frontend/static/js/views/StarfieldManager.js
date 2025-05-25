import * as THREE from 'three';
import { DockingInterface } from '../ui/DockingInterface.js';

export class StarfieldManager {
    constructor(scene, camera, viewManager) {
        this.scene = scene;
        this.camera = camera;
        this.viewManager = viewManager;  // Store the viewManager
        
        // Get Ship instance from ViewManager for direct access to ship systems
        this.ship = this.viewManager.getShip();
        
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
        this.previousView = 'FORE'; // Add previous view tracking
        this.solarSystemManager = null; // Will be set by setSolarSystemManager
        
        // Docking state
        this.isDocked = false;
        this.dockedTo = null;
        this.orbitRadius = 1.5; // Changed from 5km to 1.5km orbit radius
        this.orbitAngle = 0;
        this.orbitSpeed = 0.001; // Radians per frame
        this.dockingRange = 1.5; // Changed from 20km to 1.5km docking range
        
        // Target computer state
        this.targetComputerEnabled = false;
        this.currentTarget = null;
        this.targetIndex = -1;
        this.targetObjects = [];
        this.targetWireframe = null;
        this.targetReticle = null;
        
        // Undocking cooldown to prevent immediate re-targeting
        this.undockCooldown = null;
        
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
        
        // Create docking interface
        this.dockingInterface = new DockingInterface(this);
        
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

        // Ensure AudioContext is running
        this.ensureAudioContextRunning();

        this.audioLoader = new THREE.AudioLoader();
        this.engineSound = new THREE.Audio(this.listener);
        this.commandSound = new THREE.Audio(this.listener);
        this.soundLoaded = false;
        this.commandSoundLoaded = false;
        this.engineState = 'stopped'; // 'stopped', 'starting', 'running', 'stopping'

        // Add visibility change listener
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.ensureAudioContextRunning();
            }
        });

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

        // Make this instance globally available for button click handlers
        window.starfieldManager = this;

        // Add CSS for dock button
        const style = document.createElement('style');
        style.textContent = `
            .dock-button {
                background: #00aa41;
                color: #000 !important;
                border: none;
                padding: 6px 15px;
                cursor: pointer;
                font-family: "Courier New", monospace;
                font-weight: bold;
                border-radius: 4px;
                transition: all 0.2s ease-in-out;
                pointer-events: auto;
                z-index: 1005;
                width: 100%;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                box-shadow: 0 0 10px rgba(0, 170, 65, 0.3);
                position: relative;
            }
            .dock-button:hover {
                filter: brightness(1.2);
                transform: scale(1.02);
                box-shadow: 0 0 15px rgba(0, 170, 65, 0.5);
            }
            .dock-button.launch {
                background: #aa4100;
                box-shadow: 0 0 10px rgba(170, 65, 0, 0.3);
            }
            .dock-button.launch:hover {
                background: #cc4f00;
                box-shadow: 0 0 15px rgba(170, 65, 0, 0.5);
            }
        `;
        document.head.appendChild(style);
        
        // Add button state tracking
        this.currentButtonState = {
            hasDockButton: false,
            isDocked: false,
            hasScanButton: false,
            hasTradeButton: false
        };
    }

    ensureAudioContextRunning() {
        if (this.listener && this.listener.context) {
            if (this.listener.context.state === 'suspended') {
                console.log('Resuming suspended AudioContext');
                this.listener.context.resume().catch(error => {
                    console.error('Failed to resume AudioContext:', error);
                });
            }
        }
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

        // Create ship systems status display
        this.createShipSystemsHUD();

        this.updateSpeedIndicator();
    }

    createShipSystemsHUD() {
        // Create ship systems status container
        this.shipSystemsHUD = document.createElement('div');
        this.shipSystemsHUD.style.cssText = `
            position: fixed;
            top: 60px;
            left: 10px;
            color: #00ff41;
            font-family: "Courier New", monospace;
            font-size: 14px;
            pointer-events: none;
            z-index: 1000;
            border: 1px solid #00ff41;
            padding: 8px 12px;
            background: rgba(0, 0, 0, 0.7);
            min-width: 200px;
        `;

        // Create systems list container
        this.systemsList = document.createElement('div');
        this.systemsList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 4px;
        `;

        this.shipSystemsHUD.appendChild(this.systemsList);
        document.body.appendChild(this.shipSystemsHUD);

        // Update the systems display
        this.updateShipSystemsDisplay();
    }

    updateShipSystemsDisplay() {
        if (!this.ship || !this.systemsList) {
            return;
        }

        // Clear existing system displays
        this.systemsList.innerHTML = '';

        // Get ship status
        const shipStatus = this.ship.getStatus();
        
        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            font-weight: bold;
            margin-bottom: 4px;
            border-bottom: 1px solid #00ff41;
            padding-bottom: 2px;
        `;
        header.textContent = 'SHIP SYSTEMS';
        this.systemsList.appendChild(header);

        // Add energy consumption rate
        const energyRate = this.ship.getEnergyConsumptionRate();
        const energyDisplay = document.createElement('div');
        energyDisplay.style.cssText = `font-size: 12px; color: #00aa41;`;
        energyDisplay.textContent = `Energy Usage: ${energyRate.toFixed(1)}/s`;
        this.systemsList.appendChild(energyDisplay);

        // Display each system
        for (const [systemName, systemInfo] of Object.entries(shipStatus.systems)) {
            const systemElement = document.createElement('div');
            systemElement.style.cssText = `
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 12px;
            `;

            // System name
            const nameSpan = document.createElement('span');
            nameSpan.textContent = this.formatSystemName(systemName);
            
            // System status (health + active state)
            const statusSpan = document.createElement('span');
            const health = Math.round(systemInfo.health * 100);
            const isActive = systemInfo.isActive;
            
            // Color code based on health and active state
            let color = '#00ff41'; // Green for healthy
            if (health < 75) color = '#ffaa00'; // Orange for damaged
            if (health < 25) color = '#ff4400'; // Red for critical
            if (!isActive && systemInfo.canBeActivated) color = '#888888'; // Gray for inactive
            
            statusSpan.style.color = color;
            statusSpan.textContent = `${health}% ${isActive ? 'ON' : 'OFF'}`;
            
            systemElement.appendChild(nameSpan);
            systemElement.appendChild(statusSpan);
            this.systemsList.appendChild(systemElement);
        }
    }

    formatSystemName(systemName) {
        // Convert system names to display format
        const nameMap = {
            'shields': 'SHIELDS',
            'impulse_engines': 'ENGINES',
            'warp_drive': 'WARP',
            'weapons': 'WEAPONS',
            'sensors': 'SENSORS',
            'life_support': 'LIFE SUP'
        };
        return nameMap[systemName] || systemName.toUpperCase();
    }

    updateSpeedIndicator() {
        // Convert speed to impulse format
        let speedText;
        
        if (this.isDocked) {
            speedText = "DOCKED";
        } else {
            const currentSpeedLevel = Math.round(this.currentSpeed);
            if (currentSpeedLevel === 0) {
                speedText = "Full Stop";
            } else {
                // Display the exact impulse number matching the key pressed
                speedText = `Impulse ${currentSpeedLevel}`;
            }
        }
        
        this.speedBox.textContent = `Speed: ${speedText}`;
        // Connect Ship energy to existing energy display (using ship directly)
        this.energyBox.textContent = `Energy: ${this.ship.currentEnergy.toFixed(2)}`;
        this.viewBox.textContent = `View: ${this.view}`;
        
        // Update ship systems display
        this.updateShipSystemsDisplay();
    }

    createTargetComputerHUD() {
        // Create target computer container
        this.targetHUD = document.createElement('div');
        this.targetHUD.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 20px;
            width: 200px;
            height: auto;
            border: 2px solid #00ff41;
            background: rgba(0, 0, 0, 0.7);
            color: #00ff41;
            font-family: "Courier New", monospace;
            font-size: 14px;
            padding: 10px;
            display: none;
            pointer-events: auto;
            z-index: 1000;
            transition: border-color 0.3s ease;
        `;

        // Create direction arrows (one for each edge)
        this.directionArrows = {
            left: document.createElement('div'),
            right: document.createElement('div'),
            top: document.createElement('div'),
            bottom: document.createElement('div')
        };

        // Style each arrow
        Object.entries(this.directionArrows).forEach(([position, arrow]) => {
            arrow.style.cssText = `
                position: absolute;
                width: 0;
                height: 0;
                display: none;
                pointer-events: none;
                z-index: 1001;
            `;
            document.body.appendChild(arrow); // Append to body, not HUD
        });

        // Create wireframe container with a renderer
        this.wireframeContainer = document.createElement('div');
        this.wireframeContainer.style.cssText = `
            width: 100%;
            height: 150px;
            border: 1px solid #00ff41;
            margin-bottom: 10px;
            position: relative;
            overflow: visible;
            pointer-events: none;
            z-index: 1001;
        `;

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
            margin-bottom: 10px;
            pointer-events: none;
            position: relative;
            z-index: 1002;
        `;

        // Create status icons container
        this.statusIconsContainer = document.createElement('div');
        this.statusIconsContainer.style.cssText = `
            width: 100%;
            text-align: center;
            margin-bottom: 10px;
            display: flex;
            justify-content: center;
            gap: 15px;
            font-size: 16px;
            position: relative;
            z-index: 1003;
        `;

        // Create icons with tooltips
        const createIcon = (symbol, tooltip) => {
            const icon = document.createElement('div');
            icon.style.cssText = `
                cursor: help;
                opacity: 0.8;
                transition: all 0.2s ease;
                position: relative;
                width: 24px;
                height: 24px;
                border: 1px solid #00ff41;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: "Courier New", monospace;
                font-size: 14px;
                text-shadow: 0 0 4px #00ff41;
                box-shadow: 0 0 4px rgba(0, 255, 65, 0.4);
            `;
            icon.innerHTML = symbol;
            icon.title = tooltip;
            
            // Add hover effects
            icon.addEventListener('mouseenter', () => {
                icon.style.opacity = '1';
                icon.style.transform = 'scale(1.1)';
                icon.style.boxShadow = '0 0 8px rgba(0, 255, 65, 0.6)';
            });
            
            icon.addEventListener('mouseleave', () => {
                icon.style.opacity = '0.8';
                icon.style.transform = 'scale(1)';
                icon.style.boxShadow = '0 0 4px rgba(0, 255, 65, 0.4)';
            });
            
            return icon;
        };

        // Create sci-fi style icons
        this.governmentIcon = createIcon('⬡', 'Government'); // Hexagon for government/structure
        this.economyIcon = createIcon('⬢', 'Economy');      // Filled hexagon for economy/resources
        this.technologyIcon = createIcon('⬨', 'Technology'); // Diamond with dot for technology/advancement

        this.statusIconsContainer.appendChild(this.governmentIcon);
        this.statusIconsContainer.appendChild(this.economyIcon);
        this.statusIconsContainer.appendChild(this.technologyIcon);

        // Create action buttons container
        this.actionButtonsContainer = document.createElement('div');
        this.actionButtonsContainer.style.cssText = `
            width: 100%;
            display: flex;
            justify-content: space-between;
            gap: 8px;
            position: relative;
            z-index: 1004;
        `;

        // Assemble the HUD
        this.targetHUD.appendChild(this.wireframeContainer);
        this.targetHUD.appendChild(this.targetInfoDisplay);
        this.targetHUD.appendChild(this.statusIconsContainer);
        this.targetHUD.appendChild(this.actionButtonsContainer);

        document.body.appendChild(this.targetHUD);

        // Create target reticle
        this.createTargetReticle();
    }

    createTargetReticle() {
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
            el.classList.add('reticle-corner');
            el.style.cssText = `
                position: absolute;
                width: 10px;
                height: 10px;
                border: 2px solid #D0D0D0;
                box-shadow: 0 0 2px #D0D0D0;
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
    }

    createIntelHUD() {
        // Create intel HUD container
        this.intelHUD = document.createElement('div');
        this.intelHUD.style.cssText = `
            position: fixed;
            bottom: 280px;
            left: 20px;
            width: 200px;
            border: 2px solid #00ff41;
            background: rgba(0, 0, 0, 0.7);
            color: #00ff41;
            font-family: "Courier New", monospace;
            font-size: 14px;
            padding: 10px;
            display: none;
            pointer-events: auto;
            z-index: 1000;
        `;
        
        // Add CSS for dock button
        const style = document.createElement('style');
        style.textContent = `
            .dock-button {
                background: #00aa41;
                color: #000 !important;
                border: none;
                padding: 8px 20px;
                cursor: pointer;
                font-family: "Courier New", monospace;
                font-weight: bold;
                border-radius: 4px;
                transition: all 0.2s ease-in-out;
                pointer-events: auto;
                z-index: 1001;
                width: 100%;
            }
            .dock-button:hover {
                filter: brightness(1.2);
                transform: scale(1.05);
            }
            .dock-button.launch {
                background: #aa4100;
            }
            .dock-button.launch:hover {
                background: #cc4f00;
            }
        `;
        document.head.appendChild(style);
        
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
            
            // Handle number keys for speed control - only if not docked
            if (/^[0-9]$/.test(event.key) && !this.isDocked) {
                const speed = parseInt(event.key);
                
                // Always set target speed first
                this.targetSpeed = speed;
                
                // Determine if we need to decelerate
                if (speed < this.currentSpeed) {
                    this.decelerating = true;
                    // Start engine shutdown if going to zero
                    if (speed === 0 && this.engineState === 'running') {
                        this.playEngineShutdown();
                    }
                } else {
                    this.decelerating = false;
                    // Handle engine sounds for acceleration
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
                // Only allow cycling targets if not docked and cooldown is not active
                if (this.targetComputerEnabled && !this.isDocked) {
                    // Check for undock cooldown
                    if (this.undockCooldown && Date.now() < this.undockCooldown) {
                        console.log('Target cycling disabled - undock cooldown active');
                        return;
                    }
                    this.cycleTarget();
                    this.playCommandSound(); // Play command sound when cycling targets
                }
                return; // Exit early to prevent further processing
            }
            
            const commandKey = event.key.toLowerCase();

            // Handle view changes - prevent fore/aft changes while docked
            if (!this.isDocked) {
                if (commandKey === 'f') {
                    this.playCommandSound();
                    this.setView('FORE');
                } else if (commandKey === 'a') {
                    this.playCommandSound();
                    this.setView('AFT');
                }
            }

            // Always allow galactic, scanner and target computer toggles
            if (commandKey === 'g') {
                // Block galactic chart when docked
                if (!this.isDocked) {
                    this.playCommandSound();
                    this.setView('GALACTIC');
                }
            } else if (commandKey === 'l') {
                // Block long range scanner when docked
                if (!this.isDocked) {
                    this.playCommandSound();
                    this.setView('SCANNER');
                }
            } else if (commandKey === 't') {
                // Block target computer when docked
                if (!this.isDocked) {
                    this.playCommandSound();
                    this.toggleTargetComputer();
                }
            }

            // Add Intel key binding
            if (commandKey === 'i') {
                // Block intel when docked or if conditions aren't met
                if (!this.isDocked && this.intelAvailable && this.targetComputerEnabled && this.currentTarget) {
                    this.playCommandSound();
                    this.toggleIntel();
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
        this.targetComputerEnabled = !this.targetComputerEnabled;
        
        console.log('Target computer toggled:', {
            enabled: this.targetComputerEnabled,
            hasTargets: this.targetObjects.length > 0
        });
        
        if (!this.targetComputerEnabled) {
            this.targetHUD.style.display = 'none';
            this.targetReticle.style.display = 'none';
            
            // Clear wireframe if it exists
            if (this.targetWireframe) {
                this.wireframeScene.remove(this.targetWireframe);
                this.targetWireframe.geometry.dispose();
                this.targetWireframe.material.dispose();
                this.targetWireframe = null;
            }
        } else {
            this.updateTargetList();
            // Only reset target index if we don't have a current target
            if (!this.currentTarget) {
                this.targetIndex = -1;
                this.cycleTarget();
            } else {
                // Just update the display with existing target
                this.updateTargetDisplay();
            }
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
            this.targetHUD.style.display = 'none';
            this.targetReticle.style.display = 'none';
            this.currentButtonState = {
                hasDockButton: false,
                isDocked: false,
                hasScanButton: false,
                hasTradeButton: false
            };
            return;
        }

        // Handle galactic view
        if (this.viewManager.currentView === 'galactic') {
            this.targetHUD.style.display = 'none';
            return;
        }

        // Keep target HUD visible as long as targeting is enabled
        this.targetHUD.style.display = 'block';

        // Handle case where there's no current target
        if (!this.currentTarget) {
            this.targetReticle.style.display = 'none';
            // Clear any existing action buttons to prevent stale dock buttons
            if (this.actionButtonsContainer) {
                this.actionButtonsContainer.innerHTML = '';
            }
            // Reset button state
            this.currentButtonState = {
                hasDockButton: false,
                isDocked: false,
                hasScanButton: false,
                hasTradeButton: false
            };
            return;
        }

        // Get the current target data
        const currentTargetData = this.getCurrentTargetData();
        if (!currentTargetData) {
            this.targetReticle.style.display = 'none';
            // Clear any existing action buttons to prevent stale dock buttons
            if (this.actionButtonsContainer) {
                this.actionButtonsContainer.innerHTML = '';
            }
            // Reset button state
            this.currentButtonState = {
                hasDockButton: false,
                isDocked: false,
                hasScanButton: false,
                hasTradeButton: false
            };
            return;
        }

        // Calculate distance to target
        const distance = this.calculateDistance(this.camera.position, this.currentTarget.position);
        
        // Get target info for diplomacy status and actions
        const info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
        
        // Update HUD border color based on diplomacy
        let diplomacyColor = '#D0D0D0'; // Default gray
        if (info?.type === 'star') {
            diplomacyColor = '#ffff00'; // Stars are neutral
        } else if (info?.diplomacy?.toLowerCase() === 'enemy') {
            diplomacyColor = '#ff0000';
        } else if (info?.diplomacy?.toLowerCase() === 'neutral') {
            diplomacyColor = '#ffff00';
        } else if (info?.diplomacy?.toLowerCase() === 'friendly') {
            diplomacyColor = '#00ff41';
        }
        this.targetHUD.style.borderColor = diplomacyColor;
        
        // Update wireframe container border color to match
        if (this.wireframeContainer) {
            this.wireframeContainer.style.borderColor = diplomacyColor;
        }

        // Update target information display with colored text
        this.targetInfoDisplay.innerHTML = `
            <div style="font-size: 16px; margin-bottom: 4px; color: ${diplomacyColor};">${currentTargetData.name}</div>
            <div style="font-size: 12px; opacity: 0.8;">
                <span style="color: ${diplomacyColor}">${this.formatDistance(distance)}</span> • 
                <span style="color: ${diplomacyColor}">${info?.type || 'Unknown'}</span>
            </div>
            ${info?.diplomacy ? `<div style="font-size: 12px; margin-top: 4px; color: ${diplomacyColor};">${info.diplomacy}</div>` : ''}
        `;

        // Update status icons with diplomacy color
        this.governmentIcon.style.display = info?.government ? 'block' : 'none';
        this.economyIcon.style.display = info?.economy ? 'block' : 'none';
        this.technologyIcon.style.display = info?.technology ? 'block' : 'none';

        // Update icon colors and borders to match diplomacy
        [this.governmentIcon, this.economyIcon, this.technologyIcon].forEach(icon => {
            if (icon.style.display !== 'none') {
                icon.style.borderColor = diplomacyColor;
                icon.style.color = diplomacyColor;
                icon.style.textShadow = `0 0 4px ${diplomacyColor}`;
                icon.style.boxShadow = `0 0 4px ${diplomacyColor.replace(')', ', 0.4)')}`;
            }
        });

        // Update tooltips with current info
        if (info?.government) {
            this.governmentIcon.title = `Government: ${info.government}`;
        }
        if (info?.economy) {
            this.economyIcon.title = `Economy: ${info.economy}`;
        }
        if (info?.technology) {
            this.technologyIcon.title = `Technology: ${info.technology}`;
        }

        // Calculate docking range based on body size
        let dockingRange = this.dockingRange; // Default 1.5 for moons
        if (info?.type === 'planet') {
            // For planets, use a fixed 4.0KM range
            dockingRange = 4.0;
        }

        // Calculate button state for docking (show dock button, but launch is handled by docking interface)
        const canDock = this.canDock(this.currentTarget);
        const isDocked = this.isDocked && this.dockedTo === this.currentTarget;
        const isHostile = info?.diplomacy?.toLowerCase() === 'enemy';

        // Add a small buffer to button display: only show button if distance is comfortably within range
        let showButton = false;
        if ((info?.type === 'planet' || info?.type === 'moon') && canDock && !isDocked && !isHostile) {
            // Add 0.3km buffer - only show button if we're well within docking range
            const currentDistance = this.camera.position.distanceTo(this.currentTarget.position);
            let buttonRange = this.dockingRange - 0.3; // Default 1.2 for moons
            if (info?.type === 'planet') {
                buttonRange = 3.7; // 3.7km for planets (was 4.0km)
            }
            showButton = currentDistance <= buttonRange;
        }

        // Debug hostile detection
        if (info?.diplomacy) {
            // console.log(`Target ${currentTargetData.name}: diplomacy="${info.diplomacy}", isHostile=${isHostile}`);
        }

        // Show dock button when in range and not docked, but launch is handled by docking interface
        const newButtonState = {
            hasDockButton: showButton,
            isDocked: this.isDocked,
            hasScanButton: false,
            hasTradeButton: false
        };

        // Only recreate buttons if state has changed
        const stateChanged = JSON.stringify(this.currentButtonState) !== JSON.stringify(newButtonState);
        
        // Debug button state for stars and other issues
        if (info?.type === 'star' && showButton) {
            console.log('ERROR: Dock button showing for star!', {
                targetName: currentTargetData.name,
                targetType: info?.type,
                showButton: showButton,
                canDock: canDock,
                isDocked: isDocked,
                isHostile: isHostile
            });
        }
        
        if (stateChanged) {
            console.log('Button state changed, recreating buttons', {
                targetName: currentTargetData.name,
                targetType: info?.type,
                oldState: this.currentButtonState,
                newState: newButtonState
            });
            this.currentButtonState = newButtonState;
            
            // Clear existing buttons
            this.actionButtonsContainer.innerHTML = '';

            // Add dock button if applicable (launch button is in docking interface)
            if (newButtonState.hasDockButton) {
                const dockButton = document.createElement('button');
                dockButton.className = 'dock-button';
                dockButton.textContent = 'DOCK';
                dockButton.addEventListener('click', () => this.handleDockButtonClick(false, currentTargetData.name));
                this.actionButtonsContainer.appendChild(dockButton);
            }
        }

        // Update reticle colors
        const corners = this.targetReticle.getElementsByClassName('reticle-corner');
        Array.from(corners).forEach(corner => {
            corner.style.borderColor = diplomacyColor;
            corner.style.boxShadow = `0 0 2px ${diplomacyColor}`;
        });

        // Update reticle position
        this.updateReticlePosition();
    }

    updateReticlePosition() {
        if (!this.currentTarget || !this.targetComputerEnabled) {
            this.targetReticle.style.display = 'none';
            return;
        }

        // Calculate target's screen position
        const screenPosition = this.currentTarget.position.clone().project(this.camera);
        const isOnScreen = Math.abs(screenPosition.x) <= 1 && Math.abs(screenPosition.y) <= 1;

        if (isOnScreen) {
            const x = (screenPosition.x + 1) * window.innerWidth / 2;
            const y = (-screenPosition.y + 1) * window.innerHeight / 2;
            
            const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            const relativePos = this.currentTarget.position.clone().sub(this.camera.position);
            const isBehindCamera = relativePos.dot(cameraForward) < 0;
            
            this.targetReticle.style.display = isBehindCamera ? 'none' : 'block';
            this.targetReticle.style.left = `${x}px`;
            this.targetReticle.style.top = `${y}px`;
        } else {
            this.targetReticle.style.display = 'none';
        }
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
        if (!this.currentTarget || !this.targetComputerEnabled || !this.directionArrows) {
            // Hide all arrows
            Object.values(this.directionArrows).forEach(arrow => {
                arrow.style.display = 'none';
            });
            return;
        }

        // Get target's world position relative to camera
        const targetPosition = this.currentTarget.position.clone();
        const screenPosition = targetPosition.clone().project(this.camera);
        
        // Check if target is off screen
        const isOffScreen = Math.abs(screenPosition.x) > 1 || Math.abs(screenPosition.y) > 1;

        if (isOffScreen) {
            // Get camera's view direction and relative position
            const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            const relativePosition = targetPosition.clone().sub(this.camera.position);
            
            // Get camera's right and up vectors
            const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
            
            // Project relative position onto camera's right and up vectors
            const rightComponent = relativePosition.dot(cameraRight);
            const upComponent = relativePosition.dot(cameraUp);

            // Get target info for color
            const info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
            let arrowColor = '#D0D0D0'; // Default gray
            if (info?.type === 'star') {
                arrowColor = '#ffff00'; // Stars are neutral
            } else if (info?.diplomacy?.toLowerCase() === 'enemy') {
                arrowColor = '#ff0000';
            } else if (info?.diplomacy?.toLowerCase() === 'neutral') {
                arrowColor = '#ffff00';
            } else if (info?.diplomacy?.toLowerCase() === 'friendly') {
                arrowColor = '#00ff41';
            }

            // Hide all arrows first
            Object.values(this.directionArrows).forEach(arrow => {
                arrow.style.display = 'none';
            });

            // Get HUD position
            const hudRect = this.targetHUD.getBoundingClientRect();

            // Show and position the appropriate arrow
            if (Math.abs(rightComponent) > Math.abs(upComponent)) {
                if (rightComponent > 0) {
                    // Right arrow
                    const arrow = this.directionArrows.right;
                    arrow.style.cssText = `
                        position: fixed;
                        left: ${hudRect.right + 5}px;
                        top: ${hudRect.top + hudRect.height / 2}px;
                        width: 0;
                        height: 0;
                        border-top: 8px solid transparent;
                        border-bottom: 8px solid transparent;
                        border-left: 12px solid ${arrowColor};
                        transform: translateY(-50%);
                        display: block;
                        pointer-events: none;
                        z-index: 1000;
                    `;
                } else {
                    // Left arrow
                    const arrow = this.directionArrows.left;
                    arrow.style.cssText = `
                        position: fixed;
                        left: ${hudRect.left - 17}px;
                        top: ${hudRect.top + hudRect.height / 2}px;
                        width: 0;
                        height: 0;
                        border-top: 8px solid transparent;
                        border-bottom: 8px solid transparent;
                        border-right: 12px solid ${arrowColor};
                        transform: translateY(-50%);
                        display: block;
                        pointer-events: none;
                        z-index: 1000;
                    `;
                }
            } else {
                if (upComponent > 0) {
                    // Top arrow
                    const arrow = this.directionArrows.top;
                    arrow.style.cssText = `
                        position: fixed;
                        left: ${hudRect.left + hudRect.width / 2}px;
                        top: ${hudRect.top - 17}px;
                        width: 0;
                        height: 0;
                        border-left: 8px solid transparent;
                        border-right: 8px solid transparent;
                        border-bottom: 12px solid ${arrowColor};
                        transform: translateX(-50%);
                        display: block;
                        pointer-events: none;
                        z-index: 1000;
                    `;
                } else {
                    // Bottom arrow
                    const arrow = this.directionArrows.bottom;
                    arrow.style.cssText = `
                        position: fixed;
                        left: ${hudRect.left + hudRect.width / 2}px;
                        top: ${hudRect.bottom + 5}px;
                        width: 0;
                        height: 0;
                        border-left: 8px solid transparent;
                        border-right: 8px solid transparent;
                        border-top: 12px solid ${arrowColor};
                        transform: translateX(-50%);
                        display: block;
                        pointer-events: none;
                        z-index: 1000;
                    `;
                }
            }
        } else {
            // Hide all arrows when target is on screen
            Object.values(this.directionArrows).forEach(arrow => {
                arrow.style.display = 'none';
            });
        }
    }

    cycleTarget() {
        // Prevent cycling targets while docked
        if (this.isDocked) {
            console.log('Cannot cycle targets while docked');
            return;
        }

        // Prevent cycling targets immediately after undocking
        if (this.undockCooldown && Date.now() < this.undockCooldown) {
            console.log('Cannot cycle targets - undock cooldown active');
            return;
        }

        console.log('Cycling target:', {
            targetComputerEnabled: this.targetComputerEnabled,
            targetObjectsLength: this.targetObjects.length,
            currentTargetIndex: this.targetIndex
        });

        if (!this.targetComputerEnabled || this.targetObjects.length === 0) return;

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

        console.log('New target index:', this.targetIndex);

        // Get the target object directly from our target list
        const targetData = this.targetObjects[this.targetIndex];
        this.currentTarget = targetData.object;

        console.log('New target selected:', {
            name: targetData.name,
            type: targetData.type,
            position: targetData.position
        });

        // Clean up existing wireframe before creating a new one
        if (this.targetWireframe) {
            this.wireframeScene.remove(this.targetWireframe);
            if (this.targetWireframe.geometry) {
                this.targetWireframe.geometry.dispose();
            }
            if (this.targetWireframe.material) {
                if (Array.isArray(this.targetWireframe.material)) {
                    this.targetWireframe.material.forEach(material => material.dispose());
                } else {
                    this.targetWireframe.material.dispose();
                }
            }
            this.targetWireframe = null;
        }

        // Create new wireframe in the HUD
        if (this.currentTarget) {
            try {
                const radius = this.currentTarget.geometry.boundingSphere?.radius || 1;
                let wireframeGeometry;
                
                // Get celestial body info
                const info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
                
                // Determine wireframe color based on diplomacy
                let wireframeColor = 0x808080; // Default gray for unknown
                
                if (info?.type === 'star' || (this.starSystem && info.name === this.starSystem.star_name)) {
                    wireframeColor = 0xffff00; // Stars are always yellow
                } else if (info?.diplomacy?.toLowerCase() === 'enemy') {
                    wireframeColor = 0xff0000;
                } else if (info?.diplomacy?.toLowerCase() === 'neutral') {
                    wireframeColor = 0xffff00;
                } else if (info?.diplomacy?.toLowerCase() === 'friendly') {
                    wireframeColor = 0x00ff41;
                }
                
                if (info) {
                    // Create different shapes based on celestial body type
                    if (info.type === 'star' || (this.starSystem && info.name === this.starSystem.star_name)) {
                        wireframeGeometry = new THREE.DodecahedronGeometry(radius, 0);
                    } else if (targetData.isMoon) {
                        wireframeGeometry = new THREE.OctahedronGeometry(radius, 0);
                    } else {
                        wireframeGeometry = new THREE.IcosahedronGeometry(radius, 0);
                    }
                } else {
                    wireframeGeometry = new THREE.IcosahedronGeometry(radius, 1);
                }

                const wireframeMaterial = new THREE.LineBasicMaterial({ 
                    color: wireframeColor,
                    linewidth: 1,
                    transparent: true,
                    opacity: 0.8
                });
                
                const edgesGeometry = new THREE.EdgesGeometry(wireframeGeometry);
                this.targetWireframe = new THREE.LineSegments(edgesGeometry, wireframeMaterial);
                
                // Clean up the temporary geometries
                wireframeGeometry.dispose();
                edgesGeometry.dispose();
                
                this.targetWireframe.position.set(0, 0, 0);
                this.wireframeScene.add(this.targetWireframe);
                
                this.wireframeCamera.position.z = radius * 3;
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

        // If docked, update orbit instead of normal movement
        if (this.isDocked) {
            this.updateOrbit(deltaTime);
            this.updateSpeedIndicator();
            return;
        }

        // Handle rotation from arrow keys (instead of movement)
        const rotationSpeed = 0.015;
        
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
            // Calculate deceleration rate based on current speed
            const baseDecelRate = this.deceleration;
            const speedDiff = this.currentSpeed - this.targetSpeed;
            const decelRate = baseDecelRate * (1 + (speedDiff / this.maxSpeed) * 2);
            
            // Apply deceleration
            const previousSpeed = this.currentSpeed;
            this.currentSpeed = Math.max(
                this.targetSpeed,
                this.currentSpeed - decelRate
            );
            
            // Check if we've reached target speed
            if (Math.abs(this.currentSpeed - this.targetSpeed) < 0.01) {
                this.currentSpeed = this.targetSpeed;
                this.decelerating = false;
            }
            
            // Update engine sound
            if (this.soundLoaded && this.engineState === 'running') {
                const volume = this.currentSpeed / this.maxSpeed;
                if (volume < 0.01) {
                    this.playEngineShutdown();
                } else {
                    this.engineSound.setVolume(volume);
                }
            }
        } else if (this.currentSpeed < this.targetSpeed) {
            // Only handle acceleration if we're not decelerating
            const previousSpeed = this.currentSpeed;
            const newSpeed = Math.min(
                this.targetSpeed,
                this.currentSpeed + this.acceleration
            );
            this.currentSpeed = newSpeed;
            
            // Update engine sound during acceleration
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
            let speedMultiplier = this.currentSpeed * 0.3; // Base multiplier
            
            // Apply speed reductions for lower impulse levels
            if (this.currentSpeed <= 3) {
                // Exponential reduction for impulse 1-3
                const reductionFactor = Math.pow(0.15, 4 - this.currentSpeed); // Changed from 0.3 to 0.15 to reduce impulse 1 speed by 50%
                speedMultiplier *= reductionFactor;
            }
            
            // Calculate actual movement based on current speed
            const forwardVector = new THREE.Vector3(0, 0, -speedMultiplier * moveDirection);
            forwardVector.applyQuaternion(this.camera.quaternion);
            
            // Apply movement
            this.camera.position.add(forwardVector);
            this.camera.updateMatrixWorld();
        }

        // Update starfield positions
        const positions = this.starfield.geometry.attributes.position;
        const maxDistance = 1000;
        const minDistance = 100;

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
        if (this.targetComputerEnabled && this.targetWireframe && this.wireframeScene && this.wireframeRenderer) {
            try {
                // Rotate wireframe continuously
                if (this.targetWireframe) {
                    this.targetWireframe.rotation.y += deltaTime * 0.5; // Increased rotation speed
                    this.targetWireframe.rotation.x = 0.5 + Math.sin(Date.now() * 0.001) * 0.2; // Increased oscillation
                }
                
                // Render the wireframe scene
                this.wireframeRenderer.render(this.wireframeScene, this.wireframeCamera);
            } catch (error) {
                console.warn('Error rendering wireframe:', error);
            }
        }

        // Update direction arrow after updating target display
        if (this.targetComputerEnabled && this.currentTarget) {
            this.updateDirectionArrow();
        } else {
            // Hide all arrows
            Object.values(this.directionArrows).forEach(arrow => {
                arrow.style.display = 'none';
            });
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
        if (this.energyBox && this.energyBox.parentNode) {
            this.energyBox.parentNode.removeChild(this.energyBox);
        }
        if (this.shipSystemsHUD && this.shipSystemsHUD.parentNode) {
            this.shipSystemsHUD.parentNode.removeChild(this.shipSystemsHUD);
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
        if (this.dockButtonContainer && this.dockButtonContainer.parentNode) {
            this.dockButtonContainer.parentNode.removeChild(this.dockButtonContainer);
        }

        // Clean up wireframe resources
        if (this.wireframeRenderer) {
            this.wireframeRenderer.dispose();
        }
        if (this.wireframeScene) {
            this.wireframeScene.traverse((object) => {
                if (object.geometry) {
                    object.geometry.dispose();
                }
                if (object.material) {
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
        }
        if (this.targetWireframe) {
            if (this.targetWireframe.geometry) {
                this.targetWireframe.geometry.dispose();
            }
            if (this.targetWireframe.material) {
                this.targetWireframe.material.dispose();
            }
        }

        // Clean up direction arrows
        if (this.directionArrows) {
            Object.values(this.directionArrows).forEach(arrow => {
                if (arrow && arrow.parentNode) {
                    arrow.parentNode.removeChild(arrow);
                }
            });
        }

        // Clean up docking interface
        if (this.dockingInterface) {
            this.dockingInterface.dispose();
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
        // Store previous view when switching to GALACTIC or SCANNER
        if (viewType === 'GALACTIC' || viewType === 'SCANNER') {
            // Only store previous view if it's not GALACTIC or SCANNER
            if (this.view !== 'GALACTIC' && this.view !== 'LONG RANGE') {
                this.previousView = this.view;
            }
        }

        // Don't allow view changes while docked (except for GALACTIC and SCANNER)
        if (this.isDocked && viewType !== 'GALACTIC' && viewType !== 'SCANNER' && viewType !== 'LONG RANGE') {
            return;
        }

        // When leaving GALACTIC or SCANNER view while docked, restore to previous view or force FORE
        if (this.isDocked && (this.view === 'GALACTIC' || this.view === 'LONG RANGE') && viewType !== 'GALACTIC' && viewType !== 'SCANNER') {
            // Use previous view if it exists and is valid (FORE or AFT), otherwise default to FORE
            const validView = this.previousView === 'FORE' || this.previousView === 'AFT' ? this.previousView : 'FORE';
            this.view = validView;
            this.camera.rotation.set(0, validView === 'AFT' ? Math.PI : 0, 0);
            
            // Always ensure crosshairs are hidden while docked
            if (this.viewManager) {
                this.viewManager.frontCrosshair.style.display = 'none';
                this.viewManager.aftCrosshair.style.display = 'none';
            }
            
            this.updateSpeedIndicator();
            return;
        }

        // Set the view type, converting SCANNER to LONG RANGE for display
        if (!this.isDocked) {
            this.view = viewType === 'SCANNER' ? 'LONG RANGE' : viewType.toUpperCase();
            
            // Update camera rotation based on view
            if (this.view === 'AFT') {
                this.camera.rotation.set(0, Math.PI, 0); // 180 degrees around Y axis
            } else if (this.view === 'FORE') {
                this.camera.rotation.set(0, 0, 0); // Reset to forward
            }
        } else {
            // If docked, only allow GALACTIC and SCANNER views
            if (viewType === 'GALACTIC' || viewType === 'SCANNER') {
                this.view = viewType === 'SCANNER' ? 'LONG RANGE' : viewType.toUpperCase();
            }
        }

        // Handle crosshair visibility
        if (this.viewManager) {
            // Hide crosshairs if docked or in non-flight views
            const showCrosshairs = !this.isDocked && this.view !== 'GALACTIC' && this.view !== 'LONG RANGE';
            this.viewManager.frontCrosshair.style.display = showCrosshairs && this.view === 'FORE' ? 'block' : 'none';
            this.viewManager.aftCrosshair.style.display = showCrosshairs && this.view === 'AFT' ? 'block' : 'none';
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
        
        // Ensure AudioContext is running before playing sounds
        this.ensureAudioContextRunning();
        
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
            // Ensure AudioContext is running before playing sounds
            this.ensureAudioContextRunning();
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

        // Add distance info if it's a planet or moon
        if (info.type === 'planet' || info.type === 'moon') {
            const distance = this.camera.position.distanceTo(this.currentTarget.position);
            intelHTML += `
                <div style="margin-bottom: 8px;">
                    <span style="color: #00aa41;">Distance:</span> ${distance.toFixed(2)} km
                </div>
            `;
        }

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

    // Add new docking methods
    canDock(target) {
        if (!target || !target.position) return false;
        
        // Get target info
        const info = this.solarSystemManager.getCelestialBodyInfo(target);
        
        // Check if target is hostile
        if (info?.diplomacy?.toLowerCase() === 'enemy') {
            return false;
        }
        
        // Calculate docking range based on body size
        let dockingRange = this.dockingRange; // Default 1.5 for moons
        if (info?.type === 'planet') {
            // For planets, use a fixed 4.0KM range
            dockingRange = 4.0;
        }
        
        // Check distance
        return this.camera.position.distanceTo(target.position) <= dockingRange;
    }

    dock(target) {
        if (!this.canDock(target)) {
            return false;
        }

        // Store the current view before docking
        this.previousView = this.view;

        // Stop engine sounds when docking
        if (this.engineState === 'running') {
            this.playEngineShutdown();
        }

        // Calculate initial position relative to target
        const relativePos = new THREE.Vector3().subVectors(this.camera.position, target.position);
        this.orbitAngle = Math.atan2(relativePos.z, relativePos.x);
        
        // Store initial state for transition
        this.dockingState = {
            startPos: this.camera.position.clone(),
            startRot: this.camera.quaternion.clone(),
            progress: 0,
            transitioning: true,
            target: target
        };

        // Get target info for orbit radius calculation
        const info = this.solarSystemManager.getCelestialBodyInfo(target);
        
        // Calculate orbit radius based on body size
        this.orbitRadius = this.dockingRange; // Default 1.5 for moons
        if (info?.type === 'planet') {
            // For planets, use a fixed 4.0KM orbit
            this.orbitRadius = 4.0;
        }

        // Calculate final orbit position
        const finalOrbitPos = new THREE.Vector3(
            target.position.x + Math.cos(this.orbitAngle) * this.orbitRadius,
            target.position.y,
            target.position.z + Math.sin(this.orbitAngle) * this.orbitRadius
        );
        this.dockingState.endPos = finalOrbitPos;

        // Calculate final rotation (looking at target)
        const targetRot = new THREE.Quaternion();
        const lookAtMatrix = new THREE.Matrix4();
        lookAtMatrix.lookAt(finalOrbitPos, target.position, new THREE.Vector3(0, 1, 0));
        targetRot.setFromRotationMatrix(lookAtMatrix);
        this.dockingState.endRot = targetRot;

        // Set docking state
        this.isDocked = true;
        this.dockedTo = target;
        this.targetSpeed = 0;
        this.currentSpeed = 0;
        this.decelerating = false;

        // Hide crosshairs when docked
        if (this.viewManager) {
            this.viewManager.frontCrosshair.style.display = 'none';
            this.viewManager.aftCrosshair.style.display = 'none';
            
            // Automatically power down all ship systems when docking to save energy
            const ship = this.viewManager.getShip();
            if (ship) {
                // Power down shields
                const shieldsSystem = ship.systems.get('shields');
                if (shieldsSystem && shieldsSystem.isShieldsUp) {
                    shieldsSystem.deactivateShields();
                    console.log('Shields automatically powered down during docking to conserve energy');
                }
            }
            
            // Power down target computer
            if (this.targetComputerEnabled) {
                this.toggleTargetComputer(); // This will disable it and clean up displays
                console.log('Target computer automatically powered down during docking');
            }
            
            // Close galactic chart if open
            if (this.viewManager.galacticChart && this.viewManager.galacticChart.isVisible()) {
                this.viewManager.galacticChart.hide(false);
                console.log('Galactic chart closed during docking');
            }
            
            // Close long range scanner if open
            if (this.viewManager.longRangeScanner && this.viewManager.longRangeScanner.isVisible()) {
                this.viewManager.longRangeScanner.hide(false);
                console.log('Long range scanner closed during docking');
            }
            
            // Restore view to FORE if in modal view
            if (this.viewManager.currentView === 'GALACTIC' || this.viewManager.currentView === 'SCANNER') {
                this.viewManager.restorePreviousView();
            }
        }

        // Play command sound for successful dock
        this.playCommandSound();

        // Show docking interface with services available at this location
        this.dockingInterface.show(target);

        // Update the dock button to show "LAUNCH"
        this.updateTargetDisplay();
        return true;
    }

    undock() {
        if (!this.isDocked) {
            return;
        }

        // Hide docking interface
        this.dockingInterface.hide();

        // Play command sound for successful launch
        this.playCommandSound();

        // Start engine sound at impulse 1
        if (this.soundLoaded && this.engineState === 'stopped') {
            this.playEngineStartup(1/this.maxSpeed); // Volume for impulse 1
        }

        // Store initial state for transition
        this.undockingState = {
            startPos: this.camera.position.clone(),
            startRot: this.camera.quaternion.clone(),
            progress: 0,
            transitioning: true
        };

        // Calculate undock position (move away from the body in the current direction)
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const targetPos = this.camera.position.clone().add(forward.multiplyScalar(this.orbitRadius * 2));
        this.undockingState.endPos = targetPos;

        // Reset to forward-facing rotation
        const targetRot = new THREE.Quaternion();
        this.undockingState.endRot = targetRot;

        this.isDocked = false;
        this.dockedTo = null;
        
        // Reset button state to prevent stale dock buttons after undocking
        this.currentButtonState = {
            hasDockButton: false,
            isDocked: false,
            hasScanButton: false,
            hasTradeButton: false
        };
        
        // Clear current target to prevent showing dock button for previously docked body
        this.currentTarget = null;
        this.targetIndex = -1;
        
        // Explicitly clear any existing action buttons to prevent stale dock buttons
        if (this.actionButtonsContainer) {
            this.actionButtonsContainer.innerHTML = '';
        }
        
        // Add a brief delay before target computer can be used again
        this.undockCooldown = Date.now() + 2000; // 2 second cooldown
        
        // Set speed to impulse 1 for a gentle launch
        this.targetSpeed = 1;
        this.currentSpeed = 1;
        this.decelerating = false;

        // Restore crosshairs based on previous view
        if (this.viewManager) {
            // Use the previous view that was stored when docking
            const viewToRestore = this.previousView === 'AFT' ? 'AFT' : 'FORE';
            this.view = viewToRestore;
            
            // Update camera rotation based on the restored view
            if (viewToRestore === 'AFT') {
                this.camera.rotation.set(0, Math.PI, 0); // 180 degrees around Y axis
            } else {
                this.camera.rotation.set(0, 0, 0); // Reset to forward
            }
            
            // Show appropriate crosshair
            this.viewManager.frontCrosshair.style.display = viewToRestore === 'FORE' ? 'block' : 'none';
            this.viewManager.aftCrosshair.style.display = viewToRestore === 'AFT' ? 'block' : 'none';
            
            // Remind player about shields after undocking
            console.log('Launch successful! Consider raising shields (S) for protection in open space');
            console.log('Ship systems now available: T (Target Computer), G (Galactic Chart), L (Long Range Scanner)');
        }
        
        // Update the dock button to show "DOCK"
        this.updateTargetDisplay();
        this.updateSpeedIndicator();
    }

    updateOrbit(deltaTime) {
        if (!this.isDocked || !this.dockedTo) return;

        // Handle docking transition
        if (this.dockingState && this.dockingState.transitioning) {
            // Update progress with smooth easing
            this.dockingState.progress = Math.min(1, this.dockingState.progress + deltaTime * 0.5);
            const smoothProgress = this.easeInOutCubic(this.dockingState.progress);
            
            // Move to final position and rotate to face target
            this.camera.position.lerp(this.dockingState.endPos, smoothProgress);
            this.camera.quaternion.slerp(this.dockingState.endRot, smoothProgress);
            
            if (this.dockingState.progress >= 1) {
                this.dockingState.transitioning = false;
            }
            return;
        }

        // Regular orbit update
        const targetPos = this.dockedTo.position;
        
        // Update orbit angle
        this.orbitAngle += this.orbitSpeed;
        if (this.orbitAngle > Math.PI * 2) this.orbitAngle -= Math.PI * 2;

        // Update position
        this.camera.position.x = targetPos.x + Math.cos(this.orbitAngle) * this.orbitRadius;
        this.camera.position.y = targetPos.y;
        this.camera.position.z = targetPos.z + Math.sin(this.orbitAngle) * this.orbitRadius;
        
        // Always look at target center
        this.camera.lookAt(targetPos);
        
        // Update target display to maintain button visibility
        this.updateTargetDisplay();
    }

    // Helper function for smooth easing
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // Add new debug methods for dock/undock
    dockWithDebug(target) {
        const result = this.dock(target);
        if (!result) {
            console.log('Docking failed - out of range or invalid target');
        }
        return result;
    }

    undockWithDebug() {
        if (!this.isDocked) {
            console.log('Cannot undock - not currently docked');
            return;
        }
        this.undock();
    }

    // Add new method to handle dock button clicks (launch is handled by docking interface)
    handleDockButtonClick(isDocked, targetName) {
        console.log('Dock button clicked:', {
            action: 'DOCK',
            targetName: targetName,
            isDocked: this.isDocked
        });
        
        if (!this.currentTarget) {
            console.warn('No current target available for docking');
            return;
        }

        // Use the canDock method for consistent logic
        if (this.canDock(this.currentTarget)) {
            this.dockWithDebug(this.currentTarget);
        } else {
            // Get target info to provide helpful feedback
            const info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
            const distance = this.camera.position.distanceTo(this.currentTarget.position);
            
            // Calculate docking range for display
            let dockingRange = this.dockingRange; // Default 1.5 for moons
            if (info?.type === 'planet') {
                dockingRange = 4.0;
            }
            
            if (info?.diplomacy?.toLowerCase() === 'enemy') {
                this.viewManager.warpFeedback.showWarning(
                    'Cannot Dock at Hostile Target',
                    'This planet or moon is hostile to your ship.',
                    () => {}
                );
            } else {
                console.warn(`Target is out of docking range: ${distance.toFixed(2)}km (max: ${dockingRange}km)`);
            }
        }
        
        // Update display after docking attempt
        this.updateTargetDisplay();
    }
} 