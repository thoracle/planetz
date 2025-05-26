// THREE is handled dynamically in constructor
import { DockingInterface } from '../ui/DockingInterface.js';
import { HelpInterface } from '../ui/HelpInterface.js';
import DockingSystemManager from '../ship/DockingSystemManager.js';
import { getSystemDisplayName } from '../ship/System.js';
// SimplifiedDamageControl removed - damage control integrated into ship systems HUD

export class StarfieldManager {
    constructor(scene, camera, viewManager, threeModule = null) {
        this.scene = scene;
        this.camera = camera;
        this.viewManager = viewManager;
        
        // Handle THREE.js - use passed module or fall back to global
        this.THREE = threeModule || window.THREE;
        if (!this.THREE) {
            console.error('THREE.js not available. Checking available options:', {
                threeModule: !!threeModule,
                windowTHREE: !!window.THREE,
                globalTHREE: typeof THREE !== 'undefined' ? !!THREE : false,
                documentReadyState: document.readyState,
                timestamp: new Date().toISOString()
            });
            
            // Try to wait a bit and retry if document is still loading
            if (document.readyState === 'loading') {
                console.warn('Document still loading, THREE.js might not be available yet');
            }
            
            throw new Error('THREE.js not available. Please ensure THREE.js is loaded either as a module or globally.');
        }
        
        console.log('StarfieldManager initialized with THREE.js:', {
            source: threeModule ? 'module parameter' : 'window.THREE',
            version: this.THREE.REVISION,
            timestamp: new Date().toISOString()
        });
        
        // Get Ship instance from ViewManager for direct access to ship systems
        this.ship = this.viewManager.getShip();
        
        this.targetSpeed = 0;
        this.currentSpeed = 0;
        this.maxSpeed = 9;
        this.acceleration = 0.02; // Much slower acceleration
        this.deceleration = 0.03; // Slightly faster deceleration than acceleration
        this.decelerating = false; // New flag for tracking deceleration state
        this.velocity = new this.THREE.Vector3();
        this.rotationSpeed = 2.0; // Radians per second
        this.cameraDirection = new this.THREE.Vector3();
        this.cameraRight = new this.THREE.Vector3();
        this.cameraUp = new this.THREE.Vector3();
        this.mouseSensitivity = 0.002;
        this.mouseRotation = new this.THREE.Vector2();
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
        
        // Add button state logging throttling
        this.lastButtonStateLog = null;
        
        // Smooth rotation state
        this.rotationVelocity = { x: 0, y: 0 };
        this.rotationAcceleration = 0.0008; // How quickly rotation speeds up
        this.rotationDeceleration = 0.0012; // How quickly rotation slows down
        this.maxRotationSpeed = 0.025; // Maximum rotation speed
        
        // Create starfield with quintuple density
        this.starCount = 40000;  // Increased from 8000 to 40000
        this.starfield = this.createStarfield();
        this.scene.add(this.starfield);
        
        // Create speed indicator
        this.createSpeedIndicator();
        
        // Create ship systems HUD (initially hidden)
        this.createShipSystemsHUD();
        this.shipSystemsHUD.style.display = 'none'; // Hide by default
        this.damageControlVisible = false; // Track damage control visibility
        
        // Create target computer HUD
        this.createTargetComputerHUD();
        
        // Add intel state
        this.intelVisible = false;
        this.intelAvailable = false;
        this.intelRange = 50; // Extended range to 50km for better visibility
        this.previousTarget = null; // Track previous target for intel dismissal
        
        // Create intel HUD
        this.createIntelHUD();
        
        // Create docking interface and system manager
        this.dockingInterface = new DockingInterface(this);
        this.dockingSystemManager = new DockingSystemManager();
        
        // Create help interface
        this.helpInterface = new HelpInterface(this);
        
        // Damage control is now integrated into ship systems HUD
        // No separate interface needed
        
        // Bind keyboard events
        this.bindKeyEvents();
        // Bind mouse events
        this.bindMouseEvents();

        // Audio setup
        this.listener = new this.THREE.AudioListener();
        if (!this.camera) {
            console.error('No camera available for audio listener');
            return;
        }
        console.log('Adding audio listener to camera');
        this.camera.add(this.listener);

        // Ensure AudioContext is running
        this.ensureAudioContextRunning();

        this.audioLoader = new this.THREE.AudioLoader();
        this.engineSound = new this.THREE.Audio(this.listener);
        this.commandSound = new this.THREE.Audio(this.listener);
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
        
        // Target dummy ships for sub-targeting practice
        this.targetDummyShips = [];
        this.dummyShipMeshes = [];
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

            const geometry = new this.THREE.BufferGeometry();
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
            
            const sprite = new this.THREE.Texture(canvas);
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
                
                geometry.setAttribute('position', new this.THREE.BufferAttribute(trimmedPositions, 3));
                geometry.setAttribute('color', new this.THREE.BufferAttribute(trimmedColors, 3));
                geometry.setAttribute('size', new this.THREE.BufferAttribute(trimmedSizes, 1));
            } else {
                geometry.setAttribute('position', new this.THREE.BufferAttribute(positions, 3));
                geometry.setAttribute('color', new this.THREE.BufferAttribute(colors, 3));
                geometry.setAttribute('size', new this.THREE.BufferAttribute(sizes, 1));
            }
            
            // Verify geometry before creating mesh
            geometry.computeBoundingSphere();
            if (!geometry.boundingSphere || isNaN(geometry.boundingSphere.radius)) {
                throw new Error('Failed to compute valid bounding sphere');
            }
            
            const material = new this.THREE.PointsMaterial({
                size: 1,
                vertexColors: true,
                transparent: true,
                opacity: 1,
                sizeAttenuation: true,
                blending: this.THREE.AdditiveBlending,
                map: sprite,
                depthWrite: false
            });
            
            return new this.THREE.Points(geometry, material);
            
        } catch (error) {
            console.error('Error in createStarfield:', error);
            // Create a minimal fallback starfield
            return this.createFallbackStarfield();
        }
    }

    createFallbackStarfield() {
        console.log('Creating fallback starfield');
        const geometry = new this.THREE.BufferGeometry();
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

        geometry.setAttribute('position', new this.THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new this.THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new this.THREE.BufferAttribute(sizes, 1));

        const material = new this.THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            transparent: true,
            opacity: 1,
            sizeAttenuation: true,
            depthWrite: false
        });

        return new this.THREE.Points(geometry, material);
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

    /**
     * Create ship systems HUD with integrated damage control
     */
    createShipSystemsHUD() {
        // Create ship systems status container
        this.shipSystemsHUD = document.createElement('div');
        this.shipSystemsHUD.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #00ff41;
            font-family: "Courier New", monospace;
            font-size: 16px;
            pointer-events: auto;
            z-index: 1000;
            border: 2px solid #00ff41;
            padding: 12px 16px;
            background: rgba(0, 0, 0, 0.85);
            width: 600px;
            max-height: 70vh;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: #00ff41 #333;
        `;

        // Create the close button
        this.damageControlCloseButton = document.createElement('div');
        this.damageControlCloseButton.innerHTML = 'X';
        this.damageControlCloseButton.style.cssText = `
            position: absolute;
            top: 2px;
            right: 10px;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #00ff41;
            border: 1px solid #00ff41;
            cursor: pointer;
            transition: all 0.3s ease;
            background: rgba(0, 20, 0, 0.5);
            z-index: 1;
            pointer-events: auto;
        `;
        this.shipSystemsHUD.appendChild(this.damageControlCloseButton);

        // Add close button hover effect and click handler
        this.damageControlCloseButton.addEventListener('mouseenter', () => {
            this.damageControlCloseButton.style.background = '#00ff41';
            this.damageControlCloseButton.style.color = '#000';
        });
        
        this.damageControlCloseButton.addEventListener('mouseleave', () => {
            this.damageControlCloseButton.style.background = 'rgba(0, 20, 0, 0.5)';
            this.damageControlCloseButton.style.color = '#00ff41';
        });
        
        this.damageControlCloseButton.addEventListener('click', () => {
            this.toggleDamageControl();
        });

        // Add custom scrollbar styles for webkit browsers
        const style = document.createElement('style');
        style.textContent = `
            .damage-control-hud::-webkit-scrollbar {
                width: 8px;
            }
            .damage-control-hud::-webkit-scrollbar-track {
                background: #333;
                border-radius: 4px;
            }
            .damage-control-hud::-webkit-scrollbar-thumb {
                background: #00ff41;
                border-radius: 4px;
            }
            .damage-control-hud::-webkit-scrollbar-thumb:hover {
                background: #00cc33;
            }
        `;
        document.head.appendChild(style);
        this.shipSystemsHUD.className = 'damage-control-hud';

        // Create systems list container
        this.systemsList = document.createElement('div');
        this.systemsList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 6px;
            pointer-events: none;
        `;

        this.shipSystemsHUD.appendChild(this.systemsList);
        document.body.appendChild(this.shipSystemsHUD);

        // Update the systems display
        this.updateShipSystemsDisplay();
    }

    /**
     * Update ship systems display
     */
    updateShipSystemsDisplay() {
        if (!this.ship || !this.systemsList) {
            return;
        }

        // Clear existing system displays
        this.systemsList.innerHTML = '';

        // Get ship status
        const shipStatus = this.ship.getStatus();
        
        // Only show damage control view now (no more original systems view)
        this.updateDamageControlDisplay(shipStatus);
    }

    /**
     * Update damage control display
     */
    updateDamageControlDisplay(shipStatus) {
        // Create header
        const header = document.createElement('div');
        header.style.cssText = `
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 12px;
            border-bottom: 2px solid #00ff41;
            padding-bottom: 4px;
            text-align: center;
        `;
        header.textContent = 'DAMAGE CONTROL';
        this.systemsList.appendChild(header);

        // Get auto-repair system
        const autoRepair = this.ship.autoRepairSystem;
        if (!autoRepair) {
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = `color: #ff4400; font-size: 14px;`;
            errorDiv.textContent = 'Auto-repair system not available';
            this.systemsList.appendChild(errorDiv);
            return;
        }

        // Current repair status
        const statusDiv = document.createElement('div');
        statusDiv.style.cssText = `font-size: 14px; color: #00aa41; margin-bottom: 12px; text-align: center;`;
        const currentTarget = autoRepair.getCurrentRepairTarget();
        statusDiv.textContent = currentTarget ? 
            `Repairing: ${this.formatSystemName(currentTarget)}` : 
            'Auto-repair: Standby';
        this.systemsList.appendChild(statusDiv);

        // Priority sliders for each system
        for (const [systemName, systemInfo] of Object.entries(shipStatus.systems)) {
            const systemDiv = document.createElement('div');
            systemDiv.style.cssText = `
                margin-bottom: 10px;
                font-size: 14px;
                padding: 8px;
                border: 1px solid #333;
                border-radius: 4px;
                background: rgba(0, 0, 0, 0.3);
            `;

            // System name with status dot and health
            const nameDiv = document.createElement('div');
            nameDiv.style.cssText = `
                display: flex;
                align-items: center;
                margin-bottom: 6px;
            `;

            const nameWithDot = document.createElement('span');
            nameWithDot.style.cssText = `display: flex; align-items: center; font-size: 15px;`;
            
            const statusDot = document.createElement('span');
            statusDot.style.cssText = `
                width: 8px;
                height: 8px;
                border-radius: 50%;
                display: inline-block;
                margin-right: 8px;
                background-color: ${systemInfo.isActive ? '#00ff41' : '#666666'};
            `;
            
            const health = Math.round(systemInfo.health * 100);
            let healthColor = '#00ff41';
            if (health < 75) healthColor = '#ffaa00';
            if (health < 25) healthColor = '#ff4400';
            
            nameWithDot.appendChild(statusDot);
            nameWithDot.appendChild(document.createTextNode(`${this.formatSystemName(systemName)} (`));
            
            const healthSpan = document.createElement('span');
            healthSpan.style.color = healthColor;
            healthSpan.style.fontWeight = 'bold';
            healthSpan.textContent = `${health}%`;
            nameWithDot.appendChild(healthSpan);
            
            nameWithDot.appendChild(document.createTextNode(')'));

            nameDiv.appendChild(nameWithDot);

            // Priority slider
            const sliderDiv = document.createElement('div');
            sliderDiv.style.cssText = `
                display: flex;
                align-items: center;
                gap: 10px;
                pointer-events: auto;
            `;

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '0';
            slider.max = '10';
            slider.value = autoRepair.getPriority(systemName).toString();
            slider.style.cssText = `
                flex: 1;
                height: 6px;
                background: #333;
                outline: none;
                -webkit-appearance: none;
                appearance: none;
                border-radius: 3px;
            `;

            const valueSpan = document.createElement('span');
            valueSpan.style.cssText = `
                min-width: 30px;
                text-align: right;
                color: #00ff41;
                font-weight: bold;
                font-size: 14px;
            `;
            valueSpan.textContent = slider.value;

            // Update priority when slider changes with zero-sum behavior
            slider.addEventListener('input', (e) => {
                const newPriority = parseInt(e.target.value);
                const oldPriority = autoRepair.getPriority(systemName);
                const difference = newPriority - oldPriority;
                
                if (difference > 0) {
                    // Increasing priority - need to reduce others to maintain 100 total
                    const currentTotal = autoRepair.getTotalPriority();
                    const maxTotal = 100;
                    
                    if (currentTotal + difference > maxTotal) {
                        // Get all other systems and their current priorities
                        const otherSystems = Object.entries(autoRepair.priorities)
                            .filter(([name, priority]) => name !== systemName && priority > 0);
                        
                        if (otherSystems.length > 0) {
                            const excessPoints = (currentTotal + difference) - maxTotal;
                            const totalOtherPriority = otherSystems.reduce((sum, [name, priority]) => sum + priority, 0);
                            
                            // Reduce other systems proportionally
                            if (totalOtherPriority > 0) {
                                for (const [otherSystemName, otherPriority] of otherSystems) {
                                    const proportion = otherPriority / totalOtherPriority;
                                    const reduction = Math.min(otherPriority, Math.ceil(excessPoints * proportion));
                                    autoRepair.setPriority(otherSystemName, otherPriority - reduction);
                                }
                            }
                        }
                    }
                }
                
                // Set the new priority for this system
                autoRepair.setPriority(systemName, newPriority);
                valueSpan.textContent = newPriority.toString();
                
                // Update display to show all changes
                setTimeout(() => this.updateShipSystemsDisplay(), 50);
            });

            sliderDiv.appendChild(slider);
            sliderDiv.appendChild(valueSpan);

            systemDiv.appendChild(nameDiv);
            systemDiv.appendChild(sliderDiv);
            this.systemsList.appendChild(systemDiv);
        }


    }

    formatSystemName(systemName) {
        // Use the standardized display name function
        return getSystemDisplayName(systemName).toUpperCase();
    }

    updateSpeedIndicator() {
        // Convert speed to impulse format
        let speedText;
        
        if (this.isDocked) {
            speedText = "DOCKED";
        } else {
            // Get actual speed from impulse engines system (accounts for clamping)
            const ship = this.viewManager?.getShip();
            const impulseEngines = ship?.getSystem('impulse_engines');
            
            if (impulseEngines) {
                const actualSpeed = impulseEngines.getImpulseSpeed();
                if (actualSpeed === 0) {
                    speedText = "Full Stop";
                } else {
                    speedText = `Impulse ${actualSpeed}`;
                }
            } else {
                // Fallback to internal speed if no impulse engines found
                const currentSpeedLevel = Math.round(this.currentSpeed);
                if (currentSpeedLevel === 0) {
                    speedText = "Full Stop";
                } else {
                    speedText = `Impulse ${currentSpeedLevel}`;
                }
            }
        }
        
        this.speedBox.textContent = `Speed: ${speedText}`;
        // Connect Ship energy to existing energy display (using ship directly)
        this.energyBox.textContent = `Energy: ${this.ship.currentEnergy.toFixed(2)}`;
        this.viewBox.textContent = `View: ${this.view}`;
    }

    createTargetComputerHUD() {
        // Create target computer container
        this.targetHUD = document.createElement('div');
        this.targetHUD.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 10px;
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
        this.wireframeRenderer = new this.THREE.WebGLRenderer({ alpha: true });
        this.wireframeRenderer.setSize(200, 150);
        this.wireframeRenderer.setClearColor(0x000000, 0);
        
        // Create scene and camera for wireframe
        this.wireframeScene = new this.THREE.Scene();
        this.wireframeCamera = new this.THREE.PerspectiveCamera(45, 200/150, 0.1, 1000);
        this.wireframeCamera.position.z = 5;
        
        // Add lights to wireframe scene
        const wireframeLight = new this.THREE.DirectionalLight(0x00ff41, 1);
        wireframeLight.position.set(1, 1, 1);
        this.wireframeScene.add(wireframeLight);
        
        const wireframeAmbient = new this.THREE.AmbientLight(0x00ff41, 0.4);
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

        // Create intel icon (initially hidden)
        this.intelIcon = createIcon('ⓘ', 'Intel Available - Press I');
        this.intelIcon.style.display = 'none';
        this.intelIcon.style.cursor = 'pointer';
        this.intelIcon.style.animation = 'pulse 2s infinite';
        
        // Add click handler for intel icon
        this.intelIcon.addEventListener('click', () => {
            if (this.intelAvailable && this.targetComputerEnabled && this.currentTarget) {
                this.playCommandSound();
                this.toggleIntel();
            }
        });

        this.statusIconsContainer.appendChild(this.governmentIcon);
        this.statusIconsContainer.appendChild(this.economyIcon);
        this.statusIconsContainer.appendChild(this.technologyIcon);
        this.statusIconsContainer.appendChild(this.intelIcon);

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
        this.intelHUD.className = 'intel-hud';
        this.intelHUD.style.cssText = `
            position: fixed;
            bottom: 450px;
            left: 10px;
            width: 200px;
            max-height: 400px;
            border: 2px solid #00ff41;
            background: rgba(0, 0, 0, 0.7);
            color: #00ff41;
            font-family: "Courier New", monospace;
            font-size: 14px;
            padding: 10px;
            display: none;
            pointer-events: auto;
            z-index: 1000;
            overflow-y: auto;
        `;
        
        // Add CSS for dock button and intel scrollbar
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
            
            /* Custom scrollbar for intel HUD */
            div[style*="overflow-y: auto"]::-webkit-scrollbar {
                width: 8px;
            }
            div[style*="overflow-y: auto"]::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
            }
            div[style*="overflow-y: auto"]::-webkit-scrollbar-thumb {
                background: #00ff41;
                border-radius: 4px;
                border: 1px solid rgba(0, 255, 65, 0.3);
            }
            div[style*="overflow-y: auto"]::-webkit-scrollbar-thumb:hover {
                background: #00aa41;
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
    
            
            // Debug commands for testing damage (only in development)
            if (event.ctrlKey && event.shiftKey) {
                const key = event.key.toLowerCase();
                switch (key) {
                    case 'v':
                        // Damage random systems for testing
                        this.debugDamageRandomSystems();
                        event.preventDefault();
                        return;
                    case 'm':
                        // Damage hull for testing
                        this.debugDamageHull();
                        event.preventDefault();
                        return;
                    case 'n':
                        // Drain energy for testing
                        this.debugDrainEnergy();
                        event.preventDefault();
                        return;
                    case 'b':
                        // Repair all systems for testing
                        this.debugRepairAllSystems();
                        event.preventDefault();
                        return;
                }
            }
            
            if (this.keys.hasOwnProperty(event.key)) {
                this.keys[event.key] = true;
            }
            
            // Handle number keys for speed control - only if not docked
            if (/^[0-9]$/.test(event.key) && !this.isDocked) {
                const requestedSpeed = parseInt(event.key);
                
                // Update impulse engines with new speed setting (this will clamp the speed)
                const ship = this.viewManager?.getShip();
                let actualSpeed = requestedSpeed; // fallback
                
                if (ship) {
                    const impulseEngines = ship.getSystem('impulse_engines');
                    if (impulseEngines) {
                        impulseEngines.setImpulseSpeed(requestedSpeed);
                        // Get the actual clamped speed from the impulse engines
                        actualSpeed = impulseEngines.getImpulseSpeed();
                    }
                }
                
                // Set target speed to the actual clamped speed
                this.targetSpeed = actualSpeed;
                
                // Determine if we need to decelerate
                if (actualSpeed < this.currentSpeed) {
                    this.decelerating = true;
                    // Start engine shutdown if going to zero
                    if (actualSpeed === 0 && this.engineState === 'running') {
                        this.playEngineShutdown();
                    }
                } else {
                    this.decelerating = false;
                    // Handle engine sounds for acceleration
                    if (this.soundLoaded) {
                        const volume = actualSpeed / this.maxSpeed;
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

            // Sub-targeting key bindings (< and > keys)
            if (event.key === '<' || event.key === ',') {
                // Previous sub-target
                if (!this.isDocked && this.targetComputerEnabled && this.currentTarget) {
                    const ship = this.viewManager?.getShip();
                    if (ship) {
                        const targetComputer = ship.getSystem('target_computer');
                        if (targetComputer && targetComputer.hasSubTargeting()) {
                            if (targetComputer.cycleSubTargetPrevious()) {
                                this.playCommandSound();
                                this.updateTargetDisplay(); // Update HUD display
                            }
                        }
                    }
                }
            } else if (event.key === '>' || event.key === '.') {
                // Next sub-target
                if (!this.isDocked && this.targetComputerEnabled && this.currentTarget) {
                    const ship = this.viewManager?.getShip();
                    if (ship) {
                        const targetComputer = ship.getSystem('target_computer');
                        if (targetComputer && targetComputer.hasSubTargeting()) {
                            if (targetComputer.cycleSubTargetNext()) {
                                this.playCommandSound();
                                this.updateTargetDisplay(); // Update HUD display
                            }
                        }
                    }
                }
            }

            // Damage control key (D) - toggle damage control view
            if (commandKey === 'd') {
                this.playCommandSound();
                this.toggleDamageControl();
            }

            // Help key (H) - toggle help interface
            if (commandKey === 'h') {
                this.playCommandSound();
                this.toggleHelp();
            }

            // Spawn target dummy ships (X key)
            if (commandKey === 'x') {
                if (!this.isDocked) {
                    this.playCommandSound();
                    this.createTargetDummyShips(3);
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
        const ship = this.viewManager?.getShip();
        if (!ship) {
            console.warn('No ship available for target computer control');
            return;
        }
        
        const targetComputer = ship.getSystem('target_computer');
        if (!targetComputer) {
            console.warn('No target computer system found on ship');
            return;
        }
        
        // Toggle the target computer system
        if (targetComputer.isActive) {
            targetComputer.deactivate();
            this.targetComputerEnabled = false;
        } else {
            if (targetComputer.activate(ship)) {
                this.targetComputerEnabled = true;
            } else {
                this.targetComputerEnabled = false;
                console.warn('Failed to activate target computer - check system status and energy');
                return;
            }
        }
        

        
        if (!this.targetComputerEnabled) {
            this.targetHUD.style.display = 'none';
            this.targetReticle.style.display = 'none';
            
            // Hide intel when target computer is disabled
            if (this.intelVisible) {
                this.intelVisible = false;
                this.intelHUD.style.display = 'none';
            }
            this.updateIntelIconDisplay();
            
            // Clear wireframe if it exists
            if (this.targetWireframe) {
                this.wireframeScene.remove(this.targetWireframe);
                this.targetWireframe.geometry.dispose();
                this.targetWireframe.material.dispose();
                this.targetWireframe = null;
            }
        } else {
            // Show the HUD immediately when target computer is enabled
            this.targetHUD.style.display = 'block';
            
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

    toggleDamageControl() {
        this.damageControlVisible = !this.damageControlVisible;
        
        if (this.damageControlVisible) {
            // Store the previous view before switching to damage control
            this.previousView = this.view;
            this.view = 'DAMAGE';
            
            if (this.shipSystemsHUD) {
                this.shipSystemsHUD.style.display = 'block';
            }
            
            this.updateShipSystemsDisplay(); // Refresh the display
            this.updateSpeedIndicator(); // Update the view indicator
        } else {
            // Restore the previous view when closing damage control
            this.view = this.previousView || 'FORE';
            
            if (this.shipSystemsHUD) {
                this.shipSystemsHUD.style.display = 'none';
            }
            
            this.updateSpeedIndicator(); // Update the view indicator
        }
    }

    toggleHelp() {
        if (this.helpInterface.isVisible) {
            this.helpInterface.hide();
        } else {
            this.helpInterface.show();
        }
    }

    updateTargetList() {
        
        let allTargets = [];
        
        // Get celestial bodies from SolarSystemManager
        if (this.solarSystemManager) {
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
                        object: body,  // Store the actual THREE.js object
                        isShip: false
                    };
                })
                .filter(body => body !== null); // Remove any invalid bodies
            
            allTargets = allTargets.concat(celestialBodies);
            console.log('Processed celestial bodies:', celestialBodies.length);
        }
        
        // Add target dummy ships
        const dummyShipTargets = this.dummyShipMeshes.map(mesh => {
            const ship = mesh.userData.ship;
            return {
                name: ship.shipName,
                type: 'enemy_ship',
                position: mesh.position.toArray(),
                isMoon: false,
                object: mesh,  // Store the mesh as the target object
                isShip: true,
                ship: ship     // Store the ship instance for sub-targeting
            };
        });
        
        allTargets = allTargets.concat(dummyShipTargets);
        console.log('Added target dummy ships:', dummyShipTargets.length);
        
        // Update target list
        this.targetObjects = allTargets;
        
        // Sort targets by distance
        this.sortTargetsByDistance();
        
        // Update target display
        this.updateTargetDisplay();
        
        console.log('Total targets available:', this.targetObjects.length);
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
            // Hide intel when no target
            if (this.intelVisible) {
                this.intelVisible = false;
                this.intelHUD.style.display = 'none';
            }
            this.updateIntelIconDisplay();
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

        // Check if target has changed and dismiss intel if so
        if (this.previousTarget !== this.currentTarget) {
            if (this.intelVisible) {
                this.intelVisible = false;
                this.intelHUD.style.display = 'none';
            }
            this.previousTarget = this.currentTarget;
        }

        // Calculate distance to target
        const distance = this.calculateDistance(this.camera.position, this.currentTarget.position);
        
        // Check intel availability based on scan range and long range scanner
        this.updateIntelAvailability(distance);
        
        // Get target info for diplomacy status and actions
        let info = null;
        let isEnemyShip = false;
        
        // Check if this is an enemy ship
        if (currentTargetData.isShip && currentTargetData.ship) {
            isEnemyShip = true;
            info = {
                type: 'enemy_ship',
                diplomacy: currentTargetData.ship.diplomacy || 'enemy',
                name: currentTargetData.ship.shipName,
                shipType: currentTargetData.ship.shipType
            };
        } else {
            // Get celestial body info
            info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
        }
        
        // Update HUD border color based on diplomacy
        let diplomacyColor = '#D0D0D0'; // Default gray
        if (isEnemyShip) {
            diplomacyColor = '#ff0000'; // Enemy ships are red
        } else if (info?.type === 'star') {
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

        // Get sub-target information from targeting computer
        const ship = this.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');
        let subTargetHTML = '';
        
        // Add sub-target information if available
        if (targetComputer && targetComputer.hasSubTargeting()) {
            // For enemy ships, use actual sub-targeting
            if (isEnemyShip && currentTargetData.ship) {
                // Set the enemy ship as the current target for the targeting computer
                targetComputer.currentTarget = currentTargetData.ship;
                targetComputer.updateSubTargets();
                
                if (targetComputer.currentSubTarget) {
                    const subTarget = targetComputer.currentSubTarget;
                    const healthPercent = Math.round(subTarget.health * 100);
                    let healthColor = '#00ff41'; // Green for healthy
                    if (healthPercent < 75) healthColor = '#ffaa00'; // Orange for damaged
                    if (healthPercent < 25) healthColor = '#ff4400'; // Red for critical
                    
                    // Get accuracy and damage bonuses
                    const accuracyBonus = Math.round(targetComputer.getSubTargetAccuracyBonus() * 100);
                    const damageBonus = Math.round(targetComputer.getSubTargetDamageBonus() * 100);
                    
                    subTargetHTML = `
                        <div style="border-top: 1px solid ${diplomacyColor}; margin-top: 8px; padding-top: 6px;">
                            <div style="font-size: 12px; color: ${diplomacyColor}; margin-bottom: 2px;">SUB-TARGET:</div>
                            <div style="font-size: 14px; color: ${diplomacyColor}; margin-bottom: 2px;">${subTarget.displayName}</div>
                            <div style="font-size: 11px; margin-bottom: 2px;">
                                <span style="color: #888;">Health:</span> <span style="color: ${healthColor}; font-weight: bold;">${healthPercent}%</span>
                            </div>
                            <div style="font-size: 10px; opacity: 0.8;">
                                <span style="color: #888;">Acc:</span> <span style="color: #00ff41;">+${accuracyBonus}%</span> • 
                                <span style="color: #888;">Dmg:</span> <span style="color: #ff8800;">+${damageBonus}%</span>
                            </div>
                            <div style="font-size: 9px; opacity: 0.6; margin-top: 2px; color: #888;">
                                &lt; &gt; to cycle sub-targets
                            </div>
                        </div>
                    `;
                } else {
                    // Show available sub-targets count
                    const availableTargets = targetComputer.availableSubTargets.length;
                    if (availableTargets > 0) {
                        subTargetHTML = `
                            <div style="border-top: 1px solid ${diplomacyColor}; margin-top: 8px; padding-top: 6px;">
                                <div style="font-size: 12px; color: ${diplomacyColor}; margin-bottom: 2px;">SUB-TARGETING:</div>
                                <div style="font-size: 11px; opacity: 0.8;">
                                    ${availableTargets} targetable systems detected
                                </div>
                                <div style="font-size: 9px; opacity: 0.6; margin-top: 2px; color: #888;">
                                    &lt; &gt; to cycle sub-targets
                                </div>
                            </div>
                        `;
                    }
                }
            }
        }

        // Update target information display with colored text and sub-target info
        let typeDisplay = info?.type || 'Unknown';
        if (isEnemyShip) {
            typeDisplay = `${info.shipType} (Enemy Ship)`;
        }
        
        this.targetInfoDisplay.innerHTML = `
            <div style="font-size: 16px; margin-bottom: 4px; color: ${diplomacyColor};">${currentTargetData.name}</div>
            <div style="font-size: 12px; opacity: 0.8;">
                <span style="color: ${diplomacyColor}">${this.formatDistance(distance)}</span> • 
                <span style="color: ${diplomacyColor}">${typeDisplay}</span>
            </div>
            ${info?.diplomacy ? `<div style="font-size: 12px; margin-top: 4px; color: ${diplomacyColor};">${info.diplomacy}</div>` : ''}
            ${subTargetHTML}
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

        // Update intel icon display
        this.updateIntelIconDisplay();

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
            // Throttle button state change logging to prevent spam
            const now = Date.now();
            if (!this.lastButtonStateLog || now - this.lastButtonStateLog > 2000) { // Log at most every 2 seconds
                console.log('Button state changed, recreating buttons', {
                    targetName: currentTargetData.name,
                    targetType: info?.type,
                    oldState: this.currentButtonState,
                    newState: newButtonState
                });
                this.lastButtonStateLog = now;
            }
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
            
            const cameraForward = new this.THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
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
            const cameraDirection = new this.THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            const relativePosition = targetPosition.clone().sub(this.camera.position);
            
            // Get camera's right and up vectors
            const cameraRight = new this.THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            const cameraUp = new this.THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
            
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

        if (!this.targetComputerEnabled || this.targetObjects.length === 0) {
            console.log('Cannot cycle target - computer disabled or no targets available');
            return;
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
                // Get current target data to determine if it's a ship or celestial body
                const currentTargetData = this.getCurrentTargetData();
                let radius = 1;
                let wireframeColor = 0x808080; // Default gray for unknown
                let info = null;
                
                // Handle enemy ships differently from celestial bodies
                if (currentTargetData?.isShip) {
                    // For enemy ships, use a fixed radius and get info from ship data
                    radius = 2; // Fixed radius for ship wireframes
                    wireframeColor = 0xff0000; // Enemy ships are red
                    info = { type: 'enemy_ship' };
                } else {
                    // For celestial bodies, get radius from geometry
                    if (this.currentTarget.geometry?.boundingSphere) {
                        this.currentTarget.geometry.computeBoundingSphere();
                        radius = this.currentTarget.geometry.boundingSphere.radius || 1;
                    }
                    
                    // Get celestial body info
                    info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
                    
                    // Determine wireframe color based on diplomacy
                    if (info?.type === 'star' || (this.starSystem && info.name === this.starSystem.star_name)) {
                        wireframeColor = 0xffff00; // Stars are always yellow
                    } else if (info?.diplomacy?.toLowerCase() === 'enemy') {
                        wireframeColor = 0xff0000;
                    } else if (info?.diplomacy?.toLowerCase() === 'neutral') {
                        wireframeColor = 0xffff00;
                    } else if (info?.diplomacy?.toLowerCase() === 'friendly') {
                        wireframeColor = 0x00ff41;
                    }
                }
                
                const wireframeMaterial = new this.THREE.LineBasicMaterial({ 
                    color: wireframeColor,
                    linewidth: 1,
                    transparent: true,
                    opacity: 0.8
                });

                if (info && (info.type === 'star' || (this.starSystem && info.name === this.starSystem.star_name))) {
                    // For stars, use the custom star geometry directly (it's already a line geometry)
                    const starGeometry = this.createStarGeometry(radius);
                    this.targetWireframe = new this.THREE.LineSegments(starGeometry, wireframeMaterial);
                } else {
                    // For other objects, create standard wireframes using EdgesGeometry
                    let wireframeGeometry;
                    if (info) {
                        // Create different shapes based on object type
                        if (info.type === 'enemy_ship') {
                            // Use a distinctive shape for enemy ships
                            wireframeGeometry = new this.THREE.BoxGeometry(radius, radius * 0.5, radius * 2);
                        } else if (currentTargetData?.isMoon) {
                            wireframeGeometry = new this.THREE.OctahedronGeometry(radius, 0);
                        } else {
                            wireframeGeometry = new this.THREE.IcosahedronGeometry(radius, 0);
                        }
                    } else {
                        wireframeGeometry = new this.THREE.IcosahedronGeometry(radius, 1);
                    }
                    
                    const edgesGeometry = new this.THREE.EdgesGeometry(wireframeGeometry);
                    this.targetWireframe = new this.THREE.LineSegments(edgesGeometry, wireframeMaterial);
                    
                    // Clean up the temporary geometries
                    wireframeGeometry.dispose();
                    edgesGeometry.dispose();
                }
                
                // Add sub-target visual indicators only for enemy ships
                const targetData = this.getCurrentTargetData();
                const isEnemyShip = targetData?.isShip && targetData?.ship;
                if (isEnemyShip) {
                    this.createSubTargetIndicators(radius, wireframeColor);
                } else {
                    // Clear sub-target indicators for celestial bodies
                    this.createSubTargetIndicators(0, 0); // This will clear existing indicators
                }
                
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

    updateSmoothRotation(deltaTime) {
        // Determine target rotation velocities based on key states
        let targetRotationX = 0;
        let targetRotationY = 0;
        
        if (this.keys.ArrowLeft) {
            targetRotationY = this.maxRotationSpeed;
        }
        if (this.keys.ArrowRight) {
            targetRotationY = -this.maxRotationSpeed;
        }
        if (this.keys.ArrowUp) {
            targetRotationX = this.maxRotationSpeed;
        }
        if (this.keys.ArrowDown) {
            targetRotationX = -this.maxRotationSpeed;
        }
        
        // Smooth acceleration/deceleration for Y rotation (left/right)
        if (Math.abs(targetRotationY) > 0) {
            // Accelerate towards target rotation speed
            if (Math.abs(this.rotationVelocity.y) < Math.abs(targetRotationY)) {
                const direction = Math.sign(targetRotationY);
                this.rotationVelocity.y += direction * this.rotationAcceleration * deltaTime * 60;
                // Clamp to target speed
                if (Math.abs(this.rotationVelocity.y) > Math.abs(targetRotationY)) {
                    this.rotationVelocity.y = targetRotationY;
                }
            }
        } else {
            // Decelerate to zero
            if (Math.abs(this.rotationVelocity.y) > 0) {
                const direction = -Math.sign(this.rotationVelocity.y);
                this.rotationVelocity.y += direction * this.rotationDeceleration * deltaTime * 60;
                // Stop if we've crossed zero
                if (Math.sign(this.rotationVelocity.y) !== Math.sign(this.rotationVelocity.y + direction * this.rotationDeceleration * deltaTime * 60)) {
                    this.rotationVelocity.y = 0;
                }
            }
        }
        
        // Smooth acceleration/deceleration for X rotation (up/down)
        if (Math.abs(targetRotationX) > 0) {
            // Accelerate towards target rotation speed
            if (Math.abs(this.rotationVelocity.x) < Math.abs(targetRotationX)) {
                const direction = Math.sign(targetRotationX);
                this.rotationVelocity.x += direction * this.rotationAcceleration * deltaTime * 60;
                // Clamp to target speed
                if (Math.abs(this.rotationVelocity.x) > Math.abs(targetRotationX)) {
                    this.rotationVelocity.x = targetRotationX;
                }
            }
        } else {
            // Decelerate to zero
            if (Math.abs(this.rotationVelocity.x) > 0) {
                const direction = -Math.sign(this.rotationVelocity.x);
                this.rotationVelocity.x += direction * this.rotationDeceleration * deltaTime * 60;
                // Stop if we've crossed zero
                if (Math.sign(this.rotationVelocity.x) !== Math.sign(this.rotationVelocity.x + direction * this.rotationDeceleration * deltaTime * 60)) {
                    this.rotationVelocity.x = 0;
                }
            }
        }
        
        // Apply rotation to camera
        if (Math.abs(this.rotationVelocity.y) > 0.0001) {
            this.camera.rotateY(this.rotationVelocity.y * deltaTime * 60);
        }
        if (Math.abs(this.rotationVelocity.x) > 0.0001) {
            this.camera.rotateX(this.rotationVelocity.x * deltaTime * 60);
        }
        
        // Update impulse engines rotation state for energy consumption
        const ship = this.viewManager?.getShip();
        if (ship) {
            const impulseEngines = ship.getSystem('impulse_engines');
            if (impulseEngines) {
                const isRotating = Math.abs(this.rotationVelocity.x) > 0.0001 || Math.abs(this.rotationVelocity.y) > 0.0001;
                impulseEngines.setRotating(isRotating);
            }
        }
    }

    update(deltaTime) {
        if (!deltaTime) deltaTime = 1/60;

        // If docked, update orbit instead of normal movement
        if (this.isDocked) {
            this.updateOrbit(deltaTime);
            this.updateSpeedIndicator();
            return;
        }

        // Handle smooth rotation from arrow keys
        this.updateSmoothRotation(deltaTime);

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
        
        // Update ship systems display
        this.updateShipSystemsDisplay();

        // Forward/backward movement based on view
        if (this.currentSpeed > 0) {
            const moveDirection = this.view === 'AFT' ? -1 : 1;
            
            // Update impulse engines movement state
            const ship = this.viewManager?.getShip();
            if (ship) {
                const impulseEngines = ship.getSystem('impulse_engines');
                if (impulseEngines) {
                    impulseEngines.setMovingForward(true);
                }
            }
            
            // Calculate speed multiplier with reduced speeds for impulse 1, 2, and 3
            let speedMultiplier = this.currentSpeed * 0.3; // Base multiplier
            
            // Apply speed reductions for lower impulse levels
            if (this.currentSpeed <= 3) {
                // Exponential reduction for impulse 1-3
                const reductionFactor = Math.pow(0.15, 4 - this.currentSpeed); // Changed from 0.3 to 0.15 to reduce impulse 1 speed by 50%
                speedMultiplier *= reductionFactor;
            }
            
            // Calculate actual movement based on current speed
            const forwardVector = new this.THREE.Vector3(0, 0, -speedMultiplier * moveDirection);
            forwardVector.applyQuaternion(this.camera.quaternion);
            
            // Apply movement
            this.camera.position.add(forwardVector);
            this.camera.updateMatrixWorld();
        } else {
            // Update impulse engines movement state when not moving
            const ship = this.viewManager?.getShip();
            if (ship) {
                const impulseEngines = ship.getSystem('impulse_engines');
                if (impulseEngines) {
                    impulseEngines.setMovingForward(false);
                }
            }
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
            const starPos = new this.THREE.Vector3(x, y, z);
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
                
                // Update sub-targets for targeting computer if it has sub-targeting capability
                const ship = this.viewManager?.getShip();
                const targetComputer = ship?.getSystem('target_computer');
                if (targetComputer && targetComputer.hasSubTargeting()) {
                    // Update sub-targets periodically (this is handled in TargetComputer.update)
                    // but we need to refresh the display when sub-targets change
                    targetComputer.updateSubTargets();
                }
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
                
                // Update sub-target visual indicators
                this.updateSubTargetIndicators();
                
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

    // Debug methods for testing damage and repair functionality
    debugDamageRandomSystems() {
        const ship = this.viewManager?.getShip();
        if (!ship) {
            console.log('No ship available for damage testing');
            return;
        }

        const systemNames = Array.from(ship.systems.keys());
        
        // Damage 2-4 random systems
        const numToDamage = Math.floor(Math.random() * 3) + 2;
        const systemsToDamage = [];
        
        for (let i = 0; i < numToDamage && i < systemNames.length; i++) {
            const randomIndex = Math.floor(Math.random() * systemNames.length);
            const systemName = systemNames[randomIndex];
            if (!systemsToDamage.includes(systemName)) {
                systemsToDamage.push(systemName);
            }
        }
        
        // Apply damage to selected systems
        for (const systemName of systemsToDamage) {
            const system = ship.getSystem(systemName);
            if (system && system.takeDamage) {
                const damageAmount = (0.3 + Math.random() * 0.5) * system.maxHealth; // 30-80% damage
                system.takeDamage(damageAmount);
                console.log(`DEBUG: Damaged ${systemName} by ${((damageAmount / system.maxHealth) * 100).toFixed(1)}%`);
            }
        }
        
        console.log(`DEBUG: Damaged ${systemsToDamage.length} systems for repair testing`);
        console.log('Use Ctrl+Shift+M to damage hull, Ctrl+Shift+N to drain energy, Ctrl+Shift+B to repair all');
        

        
        // Update the damage control display if it's currently visible
        if (this.damageControlVisible) {
            console.log('Updating damage control display...');
            this.updateShipSystemsDisplay();
        } else {
            console.log('Damage control not visible, display not updated');
        }
    }

    debugDamageHull() {
        const ship = this.viewManager?.getShip();
        if (!ship) {
            console.log('No ship available for hull damage testing');
            return;
        }

        // Damage hull to 30-70%
        const damagePercent = Math.random() * 0.4 + 0.3; // 30-70%
        const newHull = Math.floor(ship.maxHull * (1 - damagePercent));
        ship.currentHull = Math.max(1, newHull); // Ensure at least 1 hull
        
        console.log(`DEBUG: Damaged hull to ${ship.currentHull}/${ship.maxHull} (${Math.floor(ship.currentHull/ship.maxHull*100)}%)`);
        
        // Update the damage control display if it's currently visible
        if (this.damageControlVisible) {
            this.updateShipSystemsDisplay();
        }
    }

    debugDrainEnergy() {
        const ship = this.viewManager?.getShip();
        if (!ship) {
            console.log('No ship available for energy drain testing');
            return;
        }
        
        const drainAmount = 0.3 + Math.random() * 0.5; // 30-80% energy drain
        const originalEnergy = ship.currentEnergy;
        ship.currentEnergy = Math.max(0, ship.currentEnergy - (ship.maxEnergy * drainAmount));
        
        const actualDrain = originalEnergy - ship.currentEnergy;
        const drainPercentage = (actualDrain / ship.maxEnergy) * 100;
        
        console.log(`DEBUG: Drained ${drainPercentage.toFixed(1)}% energy`);
        console.log(`Energy: ${ship.currentEnergy}/${ship.maxEnergy} (${((ship.currentEnergy/ship.maxEnergy)*100).toFixed(1)}%)`);
        
        // Update the damage control display if it's currently visible
        if (this.damageControlVisible) {
            this.updateShipSystemsDisplay();
        }
    }

    debugRepairAllSystems() {
        const ship = this.viewManager?.getShip();
        if (!ship) {
            console.log('No ship available for repair testing');
            return;
        }

        // Repair hull to full
        ship.currentHull = ship.maxHull;
        
        // Repair all systems to full health
        const systemNames = Array.from(ship.systems.keys());
        let repairedCount = 0;
        
        for (const systemName of systemNames) {
            const system = ship.getSystem(systemName);
            if (system && system.repair) {
                system.repair(1.0); // Full repair
                repairedCount++;
            }
        }
        
        // Recharge energy
        ship.currentEnergy = ship.maxEnergy;
        
        console.log(`DEBUG: Repaired hull, ${repairedCount} systems, and recharged energy`);
        
        // Update the damage control display if it's currently visible
        if (this.damageControlVisible) {
            this.updateShipSystemsDisplay();
        }
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

        // Clean up help interface
        if (this.helpInterface) {
            this.helpInterface.dispose();
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

    /**
     * Create a star-shaped geometry for wireframe display
     * @param {number} radius - The radius of the star
     * @returns {THREE.BufferGeometry} - The star geometry
     */
    createStarGeometry(radius) {
        const geometry = new this.THREE.BufferGeometry();
        const vertices = [];
        
        // Create a simpler 3D star with radiating lines from center
        const numPoints = 8; // Number of star points
        const center = [0, 0, 0];
        
        // Create star points radiating outward in multiple directions
        const directions = [
            // Primary axes
            [1, 0, 0], [-1, 0, 0],    // X axis
            [0, 1, 0], [0, -1, 0],    // Y axis  
            [0, 0, 1], [0, 0, -1],    // Z axis
            
            // Diagonal directions for more star-like appearance
            [0.707, 0.707, 0], [-0.707, -0.707, 0],     // XY diagonal
            [0.707, 0, 0.707], [-0.707, 0, -0.707],     // XZ diagonal
            [0, 0.707, 0.707], [0, -0.707, -0.707],     // YZ diagonal
            
            // Additional points for fuller star shape
            [0.577, 0.577, 0.577], [-0.577, -0.577, -0.577],  // 3D diagonals
            [0.577, -0.577, 0.577], [-0.577, 0.577, -0.577],
        ];
        
        // Create lines from center to each star point
        directions.forEach(direction => {
            // Line from center to outer point
            vertices.push(center[0], center[1], center[2]);
            vertices.push(
                direction[0] * radius,
                direction[1] * radius, 
                direction[2] * radius
            );
        });
        
        // Create some connecting lines between points for more complex star pattern
        const outerPoints = directions.map(dir => [
            dir[0] * radius,
            dir[1] * radius,
            dir[2] * radius
        ]);
        
        // Connect some outer points to create star pattern
        for (let i = 0; i < 6; i += 2) {
            // Connect opposite primary axis points
            vertices.push(outerPoints[i][0], outerPoints[i][1], outerPoints[i][2]);
            vertices.push(outerPoints[i + 1][0], outerPoints[i + 1][1], outerPoints[i + 1][2]);
        }
        
        // Convert vertices array to Float32Array and set as position attribute
        const vertexArray = new Float32Array(vertices);
        geometry.setAttribute('position', new this.THREE.BufferAttribute(vertexArray, 3));
        
        return geometry;
    }

    /**
     * Create visual indicators for sub-targeting on the wireframe
     * @param {number} radius - The radius of the target object
     * @param {number} baseColor - The base color of the wireframe
     */
    createSubTargetIndicators(radius, baseColor) {
        // Check if sub-targeting is available
        const ship = this.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');
        
        // Always clear existing indicators first
        if (this.subTargetIndicators) {
            this.subTargetIndicators.forEach(indicator => {
                this.wireframeScene.remove(indicator);
                if (indicator.geometry) indicator.geometry.dispose();
                if (indicator.material) indicator.material.dispose();
            });
        }
        this.subTargetIndicators = [];
        
        // Only create new indicators if sub-targeting is available
        if (!targetComputer || !targetComputer.hasSubTargeting()) {
            return;
        }

        // Create targetable area indicators (simulating different systems/areas)
        const targetableAreas = [
            { name: 'Command Center', position: [0, radius * 0.7, 0], color: 0xff4444 },
            { name: 'Power Core', position: [0, 0, 0], color: 0x44ff44 },
            { name: 'Communications', position: [radius * 0.6, 0, 0], color: 0x4444ff },
            { name: 'Defense Grid', position: [-radius * 0.6, 0, 0], color: 0xffff44 },
            { name: 'Sensor Array', position: [0, -radius * 0.7, 0], color: 0xff44ff },
            { name: 'Docking Bay', position: [0, 0, radius * 0.8], color: 0x44ffff }
        ];

        // Create indicators for each targetable area
        targetableAreas.forEach((area, index) => {
            // Create a small sphere to represent the targetable area
            const indicatorGeometry = new this.THREE.SphereGeometry(radius * 0.15, 8, 6);
            const indicatorMaterial = new this.THREE.MeshBasicMaterial({
                color: area.color,
                transparent: true,
                opacity: 0.6,
                wireframe: true
            });
            
            const indicator = new this.THREE.Mesh(indicatorGeometry, indicatorMaterial);
            indicator.position.set(area.position[0], area.position[1], area.position[2]);
            
            // Store area information for sub-targeting
            indicator.userData = {
                areaName: area.name,
                areaIndex: index,
                isTargetable: true
            };
            
            this.wireframeScene.add(indicator);
            this.subTargetIndicators.push(indicator);
        });

        // Store targetable areas for sub-targeting simulation
        this.targetableAreas = targetableAreas;
    }

    /**
     * Update sub-target visual indicators based on current selection
     */
    updateSubTargetIndicators() {
        if (!this.subTargetIndicators || !this.targetableAreas) {
            return;
        }

        const ship = this.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');
        
        if (!targetComputer || !targetComputer.hasSubTargeting()) {
            return;
        }

        // Get current sub-target index (simulate based on available areas)
        const currentSubTargetIndex = targetComputer.subTargetIndex || 0;
        const hasSubTarget = targetComputer.currentSubTarget !== null;

        // Update each indicator based on selection state
        this.subTargetIndicators.forEach((indicator, index) => {
            const isSelected = hasSubTarget && (index === currentSubTargetIndex % this.targetableAreas.length);
            
            if (isSelected) {
                // Highlight the selected sub-target
                indicator.scale.setScalar(1.3); // Make it larger
                
                // Add pulsing effect
                const time = Date.now() * 0.005;
                const pulse = 0.8 + Math.sin(time) * 0.2;
                indicator.material.opacity = pulse;
                
                // Make it brighter by setting color to white
                indicator.material.color.setHex(0xffffff);
            } else {
                // Normal state for non-selected indicators
                indicator.material.opacity = 0.6;
                indicator.scale.setScalar(1.0);
                
                // Restore original color from targetable areas
                const originalColor = this.targetableAreas[index]?.color || 0xffffff;
                indicator.material.color.setHex(originalColor);
            }
        });
    }

    // Update the setView method to handle view changes
    setView(viewType) {
        // Hide damage control UI when switching to any other view
        if (this.damageControlVisible && viewType !== 'DAMAGE') {
            this.damageControlVisible = false;
            if (this.shipSystemsHUD) {
                this.shipSystemsHUD.style.display = 'none';
            }
            console.log('Damage control view auto-hidden when switching to', viewType);
        }

        // Store previous view when switching to special views
        if (viewType === 'GALACTIC' || viewType === 'SCANNER') {
            // Only store previous view if it's not a special view
            if (this.view !== 'GALACTIC' && this.view !== 'LONG RANGE' && this.view !== 'DAMAGE') {
                this.previousView = this.view;
            }
        }

        // Don't allow view changes while docked (except for special views)
        if (this.isDocked && viewType !== 'GALACTIC' && viewType !== 'SCANNER' && viewType !== 'LONG RANGE') {
            return;
        }

        // When leaving special views while docked, restore to previous view or force FORE
        if (this.isDocked && (this.view === 'GALACTIC' || this.view === 'LONG RANGE') && 
            viewType !== 'GALACTIC' && viewType !== 'SCANNER') {
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
            
            // Update camera rotation based on view (only for flight views)
            if (this.view === 'AFT') {
                this.camera.rotation.set(0, Math.PI, 0); // 180 degrees around Y axis
            } else if (this.view === 'FORE') {
                this.camera.rotation.set(0, 0, 0); // Reset to forward
            }
        } else {
            // If docked, allow special views
            if (viewType === 'GALACTIC' || viewType === 'SCANNER') {
                this.view = viewType === 'SCANNER' ? 'LONG RANGE' : viewType.toUpperCase();
            }
        }

        // Handle crosshair visibility
        if (this.viewManager) {
            // Hide crosshairs if docked or in special views
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
        this.previousTarget = null; // Reset previous target tracking
        this.targetIndex = -1;
        this.targetObjects = [];
        
        // Hide intel when target computer is cleared
        if (this.intelVisible) {
            this.intelVisible = false;
            this.intelHUD.style.display = 'none';
        }
        this.updateIntelIconDisplay();
        
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
        
        // Update intel display and icon visibility
        this.updateIntelDisplay();
        this.updateIntelIconDisplay();
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

        // Determine faction color using same logic as target HUD
        let isEnemyShip = false;
        let diplomacyColor = '#D0D0D0'; // Default gray
        
        // Check if this is an enemy ship
        if (currentTargetData.isShip && currentTargetData.ship) {
            isEnemyShip = true;
            diplomacyColor = '#ff0000'; // Enemy ships are red
        } else if (info?.type === 'star') {
            diplomacyColor = '#ffff00'; // Stars are neutral yellow
        } else if (info?.diplomacy?.toLowerCase() === 'enemy') {
            diplomacyColor = '#ff0000';
        } else if (info?.diplomacy?.toLowerCase() === 'neutral') {
            diplomacyColor = '#ffff00';
        } else if (info?.diplomacy?.toLowerCase() === 'friendly') {
            diplomacyColor = '#00ff41';
        }
        
        // Update intel HUD border color to match faction
        this.intelHUD.style.borderColor = diplomacyColor;
        
        // Update scrollbar colors to match faction
        // Convert hex color to RGB for rgba usage
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        };
        
        const rgb = hexToRgb(diplomacyColor);
        if (rgb) {
            // Set CSS custom properties for scrollbar colors on the intel HUD and all child elements
            this.intelHUD.style.setProperty('--scrollbar-thumb-color', diplomacyColor);
            this.intelHUD.style.setProperty('--scrollbar-track-color', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`);
            
            // Also create a dynamic style element to ensure scrollbar colors are applied
            const styleId = 'intel-scrollbar-style';
            let existingStyle = document.getElementById(styleId);
            if (existingStyle) {
                existingStyle.remove();
            }
            
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .intel-hud::-webkit-scrollbar-thumb,
                .intel-hud *::-webkit-scrollbar-thumb,
                .intel-hud div[style*="overflow-y: auto"]::-webkit-scrollbar-thumb {
                    background-color: ${diplomacyColor} !important;
                }
                .intel-hud::-webkit-scrollbar-track,
                .intel-hud *::-webkit-scrollbar-track,
                .intel-hud div[style*="overflow-y: auto"]::-webkit-scrollbar-track {
                    background: rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1) !important;
                }
                .intel-hud,
                .intel-hud *,
                .intel-hud div[style*="overflow-y: auto"] {
                    scrollbar-color: ${diplomacyColor} rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1) !important;
                }
                .intel-hud div[style*="overflow-y: auto"]::-webkit-scrollbar {
                    width: 8px !important;
                }
            `;
            document.head.appendChild(style);
        }

        // Format the intel information
        let intelHTML = `
            <div style="text-align: center; border-bottom: 1px solid ${diplomacyColor}; padding-bottom: 5px; margin-bottom: 10px; color: ${diplomacyColor};">
                INTEL: ${currentTargetData.name}
            </div>
        `;

        // Add description section if available
        if (info.description && info.description.trim() !== '') {
            // Convert diplomacy color to rgba for border
            const borderColor = diplomacyColor.replace('#', '').match(/.{2}/g);
            const rgbaColor = `rgba(${parseInt(borderColor[0], 16)}, ${parseInt(borderColor[1], 16)}, ${parseInt(borderColor[2], 16)}, 0.3)`;
            
            intelHTML += `
                <div style="margin-bottom: 12px; padding: 8px; border: 1px solid ${rgbaColor}; border-radius: 4px;">
                    <div style="color: ${diplomacyColor}; font-weight: bold; margin-bottom: 6px;">DESCRIPTION:</div>
                    <div style="color: ${diplomacyColor}; font-style: italic; line-height: 1.4; font-size: 13px;">
                        ${info.description}
                    </div>
                </div>
            `;
        }

        // Add intel brief section if available
        if (info.intel_brief && info.intel_brief.trim() !== '') {
            // Convert diplomacy color to rgba for border
            const borderColor = diplomacyColor.replace('#', '').match(/.{2}/g);
            const rgbaColor = `rgba(${parseInt(borderColor[0], 16)}, ${parseInt(borderColor[1], 16)}, ${parseInt(borderColor[2], 16)}, 0.3)`;
            
            intelHTML += `
                <div style="margin-bottom: 12px; padding: 8px; border: 1px solid ${rgbaColor}; border-radius: 4px;">
                    <div style="color: ${diplomacyColor}; font-weight: bold; margin-bottom: 6px;">INTEL BRIEF:</div>
                    <div style="color: ${diplomacyColor}; font-style: italic; line-height: 1.4; font-size: 13px; max-height: 150px; overflow-y: auto; padding-right: 5px;">
                        ${info.intel_brief}
                    </div>
                </div>
            `;
        }

        // Check if it's a planet or moon by checking if diplomacy info exists
        if (info.diplomacy !== undefined) {
            // For planets and moons, only show population (diplomacy, government, economy, technology already shown in target computer)
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
                <div style="margin-bottom: 5px; color: ${diplomacyColor};">Type: ${info.type || 'Unknown'}</div>
                <div style="margin-bottom: 5px; color: ${diplomacyColor};">Mass: ${info.mass || 'Unknown'}</div>
                <div style="margin-bottom: 5px; color: ${diplomacyColor};">Atmosphere: ${info.atmosphere || 'Unknown'}</div>
                <div style="margin-bottom: 5px; color: ${diplomacyColor};">Resources: ${info.resources || 'Unknown'}</div>
            `;
        }

        this.intelHUD.innerHTML = intelHTML;
        this.intelHUD.style.display = 'block';
    }

    /**
     * Update intel availability based on distance and scanner status
     * @param {number} distance - Distance to current target
     */
    updateIntelAvailability(distance) {
        // Reset intel availability
        this.intelAvailable = false;
        
        // Check if we have a current target
        if (!this.currentTarget) {
            return;
        }
        
        // Check if target computer is enabled
        if (!this.targetComputerEnabled) {
            return;
        }
        
        // Get target info to check if it's a celestial body (not enemy ship)
        const currentTargetData = this.getCurrentTargetData();
        const isEnemyShip = currentTargetData?.isShip && currentTargetData?.ship;
        
        // Intel is only available for celestial bodies, not enemy ships
        if (isEnemyShip) {
            return;
        }
        
        // Get celestial body info to check if it has intel data
        const info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
        if (!info) {
            return;
        }
        
        // Intel is available for all celestial bodies (the display will handle showing what data exists)
        
        // Check if long range scanner is operational and get its scan range
        const ship = this.viewManager?.getShip();
        if (!ship) {
            return;
        }
        
        const longRangeScanner = ship.getSystem('long_range_scanner');
        let effectiveScanRange = this.intelRange; // Default 50km
        
        if (longRangeScanner && longRangeScanner.isOperational()) {
            // Use scanner's current range, but scale it down for intel detection
            // Scanner range is much larger (1000km base), so use a fraction for intel
            const scannerRange = longRangeScanner.getCurrentScanRange();
            effectiveScanRange = Math.max(this.intelRange, scannerRange * 0.02); // 2% of scanner range, minimum 10km
        }
        
        // Intel is available if we're within scan range
        this.intelAvailable = distance <= effectiveScanRange;
    }

    /**
     * Update intel icon display based on availability and current state
     */
    updateIntelIconDisplay() {
        if (!this.intelIcon) {
            return;
        }
        
        // Show intel icon if intel is available and intel HUD is not currently visible
        const shouldShowIcon = this.intelAvailable && !this.intelVisible && this.targetComputerEnabled && this.currentTarget;
        
        this.intelIcon.style.display = shouldShowIcon ? 'flex' : 'none';
        
        // Update icon color based on current target diplomacy if visible
        if (shouldShowIcon && this.currentTarget) {
            // Use the same faction color logic as the target HUD
            const currentTargetData = this.getCurrentTargetData();
            let info = null;
            let isEnemyShip = false;
            
            // Check if this is an enemy ship
            if (currentTargetData && currentTargetData.isShip && currentTargetData.ship) {
                isEnemyShip = true;
                info = {
                    type: 'enemy_ship',
                    diplomacy: currentTargetData.ship.diplomacy || 'enemy',
                    name: currentTargetData.ship.shipName,
                    shipType: currentTargetData.ship.shipType
                };
            } else {
                // Get celestial body info
                info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
            }
            
            // Determine diplomacy color using same logic as target HUD
            let diplomacyColor = '#D0D0D0'; // Default gray
            if (isEnemyShip) {
                diplomacyColor = '#ff0000'; // Enemy ships are red
            } else if (info?.type === 'star') {
                diplomacyColor = '#ffff00'; // Stars are neutral yellow
            } else if (info?.diplomacy?.toLowerCase() === 'enemy') {
                diplomacyColor = '#ff0000';
            } else if (info?.diplomacy?.toLowerCase() === 'neutral') {
                diplomacyColor = '#ffff00';
            } else if (info?.diplomacy?.toLowerCase() === 'friendly') {
                diplomacyColor = '#00ff41';
            }
            
            this.intelIcon.style.borderColor = diplomacyColor;
            this.intelIcon.style.color = diplomacyColor;
            this.intelIcon.style.textShadow = `0 0 4px ${diplomacyColor}`;
        }
    }

    // Add new docking methods
    canDock(target) {
        // Use the comprehensive DockingSystemManager for validation
        const ship = this.viewManager?.getShip();
        const validation = this.dockingSystemManager.validateDocking(ship, target, this);
        
        // Only log validation results when actively attempting to dock (not during continuous checks)
        // This prevents console spam during normal operation
        
        return validation.canDock;
    }
    
    // Method for getting docking validation with logging (used when player actively tries to dock)
    canDockWithLogging(target) {
        const ship = this.viewManager?.getShip();
        const validation = this.dockingSystemManager.validateDocking(ship, target, this);
        
        // Log detailed validation results only when explicitly requested
        if (!validation.canDock) {
            console.warn('Cannot dock:', validation.reasons.join(', '));
        }
        
        if (validation.warnings.length > 0) {
            console.log('Docking warnings:', validation.warnings.join(', '));
        }
        
        return validation.canDock;
    }

    dock(target) {
        if (!this.canDockWithLogging(target)) {
            return false;
        }

        // Get ship instance for docking procedures
        const ship = this.viewManager?.getShip();
        if (ship) {
            // Consume energy for docking procedures
            const dockingEnergyCost = 25;
            if (!ship.consumeEnergy(dockingEnergyCost)) {
                console.warn('Docking failed: Insufficient energy for docking procedures');
                return false;
            }
            console.log(`Docking procedures initiated. Energy consumed: ${dockingEnergyCost}`);
        }

        // Store the current view before docking
        this.previousView = this.view;

        // Stop engine sounds when docking
        if (this.engineState === 'running') {
            this.playEngineShutdown();
        }

        // Calculate initial position relative to target
        const relativePos = new this.THREE.Vector3().subVectors(this.camera.position, target.position);
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
        const finalOrbitPos = new this.THREE.Vector3(
            target.position.x + Math.cos(this.orbitAngle) * this.orbitRadius,
            target.position.y,
            target.position.z + Math.sin(this.orbitAngle) * this.orbitRadius
        );
        this.dockingState.endPos = finalOrbitPos;

        // Calculate final rotation (looking at target)
        const targetRot = new this.THREE.Quaternion();
        const lookAtMatrix = new this.THREE.Matrix4();
        lookAtMatrix.lookAt(finalOrbitPos, target.position, new this.THREE.Vector3(0, 1, 0));
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
            
            // Comprehensively power down all ship systems when docking to save energy
            this.powerDownAllSystems();
            
            // Power down target computer UI (system is already powered down in powerDownAllSystems)
            if (this.targetComputerEnabled) {
                this.targetComputerEnabled = false;
                this.targetHUD.style.display = 'none';
                this.targetReticle.style.display = 'none';
                
                // Clear wireframe if it exists
                if (this.targetWireframe) {
                    this.wireframeScene.remove(this.targetWireframe);
                    this.targetWireframe.geometry.dispose();
                    this.targetWireframe.material.dispose();
                    this.targetWireframe = null;
                }
                console.log('Target computer UI powered down during docking');
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
            
            // Hide subspace radio UI during docking
            if (this.viewManager.subspaceRadio && this.viewManager.subspaceRadio.isVisible) {
                this.viewManager.subspaceRadio.hide();
                console.log('Subspace radio UI hidden during docking');
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

        // Get ship instance for launch procedures
        const ship = this.viewManager?.getShip();
        if (ship) {
            // Use DockingSystemManager for comprehensive launch validation
            const launchValidation = this.dockingSystemManager.validateLaunch(ship);
            
            if (!launchValidation.canLaunch) {
                console.warn('Launch failed:', launchValidation.reasons.join(', '));
                // Show error in docking interface instead of hiding it
                return;
            }
            
            if (launchValidation.warnings.length > 0) {
                console.log('Launch warnings:', launchValidation.warnings.join(', '));
            }
            
            // Consume energy for launch procedures
            if (!ship.consumeEnergy(launchValidation.energyCost)) {
                console.warn('Launch failed: Insufficient energy for launch procedures');
                return;
            }
            console.log(`Launch procedures initiated. Energy consumed: ${launchValidation.energyCost}`);
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
        const forward = new this.THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const targetPos = this.camera.position.clone().add(forward.multiplyScalar(this.orbitRadius * 2));
        this.undockingState.endPos = targetPos;

        // Reset to forward-facing rotation
        const targetRot = new this.THREE.Quaternion();
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
            
            // Restore all ship systems to their pre-docking state
            this.restoreAllSystems();
            
            // Restore subspace radio UI if it was active before docking
            if (this.viewManager.subspaceRadio && this.preDockingSystemStates) {
                const radioState = this.preDockingSystemStates.get('subspace_radio');
                if (radioState && radioState.isRadioActive) {
                    // Check if the system can be activated
                    const ship = this.viewManager.getShip();
                    const radioSystem = ship.getSystem('subspace_radio');
                    if (radioSystem && radioSystem.isActive) {
                        this.viewManager.subspaceRadio.show();
                        console.log('Subspace radio UI restored after undocking');
                    }
                }
            }
            
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

        // Use the canDockWithLogging method for user-initiated docking attempts
        if (this.canDockWithLogging(this.currentTarget)) {
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
    
    /**
     * Get comprehensive docking status information
     * @returns {Object} Detailed docking status
     */
    getDockingStatus() {
        const ship = this.viewManager?.getShip();
        return this.dockingSystemManager.getDockingStatus(ship, this);
    }
    
    /**
     * Get docking requirements for UI display
     * @returns {Object} Docking requirements
     */
    getDockingRequirements() {
        return this.dockingSystemManager.getDockingRequirements();
    }
    
    /**
     * Power down all ship systems when docking to conserve energy
     */
    powerDownAllSystems() {
        const ship = this.viewManager?.getShip();
        if (!ship) {
            console.warn('No ship available for system power management');
            return;
        }
        
        // Store the current state of all systems before powering them down
        this.preDockingSystemStates = new Map();
        
        console.log('Powering down all ship systems for docking...');
        
        // Iterate through all ship systems and store their current state
        for (const [systemName, system] of ship.systems) {
            // Store the current active state
            this.preDockingSystemStates.set(systemName, {
                isActive: system.isActive,
                // Store additional system-specific states
                ...(systemName === 'shields' && system.isShieldsUp ? { isShieldsUp: true } : {}),
                ...(systemName === 'long_range_scanner' && system.isScanning ? { isScanning: true } : {}),
                ...(systemName === 'target_computer' && system.isTargeting ? { isTargeting: true } : {}),
                ...(systemName === 'subspace_radio' ? { 
                    isChartActive: system.isChartActive || false,
                    isRadioActive: system.isRadioActive || false
                } : {}),
                ...(systemName === 'impulse_engines' && system.currentImpulseSpeed > 0 ? { 
                    currentImpulseSpeed: system.currentImpulseSpeed,
                    isMovingForward: system.isMovingForward 
                } : {})
            });
            
            // Power down the system based on its type
            if (systemName === 'shields' && system.isShieldsUp) {
                system.deactivateShields();
                console.log(`  - Shields powered down (was active)`);
            } else if (systemName === 'long_range_scanner' && system.isScanning) {
                system.stopScan();
                console.log(`  - Long Range Scanner powered down (was scanning)`);
            } else if (systemName === 'target_computer' && system.isTargeting) {
                system.deactivate();
                console.log(`  - Target Computer powered down (was targeting)`);
            } else if (systemName === 'subspace_radio') {
                // Handle both radio and chart functionalities
                if (system.isRadioActive) {
                    system.deactivateRadio();
                    console.log(`  - Subspace Radio powered down (was active)`);
                }
                if (system.isChartActive) {
                    system.deactivateChart();
                    console.log(`  - Galactic Chart powered down (was active)`);
                }
            } else if (systemName === 'impulse_engines') {
                // Impulse engines are already stopped when docked, but ensure they're not active
                system.setImpulseSpeed(0);
                system.setMovingForward(false);
                console.log(`  - Impulse Engines powered down`);
            } else if (system.isActive) {
                // For other systems, simply deactivate them
                system.deactivate();
                console.log(`  - ${system.name} powered down (was active)`);
            }
        }
        
        console.log('All ship systems powered down. Energy consumption minimized for docking.');
        console.log('Systems will be restored to their previous state when undocking.');
    }
    
    /**
     * Restore all ship systems to their pre-docking state when undocking
     */
    restoreAllSystems() {
        const ship = this.viewManager?.getShip();
        if (!ship) {
            console.warn('No ship available for system power management');
            return;
        }
        
        if (!this.preDockingSystemStates) {
            console.log('No pre-docking system states found. Systems will remain in default state.');
            return;
        }
        
        console.log('Restoring ship systems to pre-docking state...');
        
        // Restore each system to its previous state
        for (const [systemName, system] of ship.systems) {
            const previousState = this.preDockingSystemStates.get(systemName);
            
            if (previousState) {
                // Restore system-specific states
                if (systemName === 'shields' && previousState.isShieldsUp) {
                    system.activateShields();
                    console.log(`  - Shields restored (reactivated)`);
                } else if (systemName === 'long_range_scanner' && previousState.isScanning) {
                    system.startScan(ship);
                    console.log(`  - Long Range Scanner restored (scanning resumed)`);
                } else if (systemName === 'target_computer' && previousState.isTargeting) {
                    system.activate(ship);
                    this.targetComputerEnabled = true; // Also restore UI state
                    console.log(`  - Target Computer restored (targeting resumed)`);
                } else if (systemName === 'subspace_radio') {
                    // Handle both radio and chart functionalities
                    if (previousState.isRadioActive && system.canActivate(ship)) {
                        system.activateRadio(ship);
                        console.log(`  - Subspace Radio restored (radio reactivated)`);
                    }
                    if (previousState.isChartActive && system.canActivate(ship)) {
                        system.activateChart(ship);
                        console.log(`  - Galactic Chart restored (chart reactivated)`);
                    }
                } else if (systemName === 'impulse_engines' && previousState.currentImpulseSpeed > 0) {
                    system.setImpulseSpeed(previousState.currentImpulseSpeed);
                    system.setMovingForward(previousState.isMovingForward);
                    console.log(`  - Impulse Engines restored (speed: ${previousState.currentImpulseSpeed})`);
                } else if (previousState.isActive && system.isOperational()) {
                    // For other systems, restore their active state
                    system.activate(ship);
                    console.log(`  - ${system.name} restored (reactivated)`);
                }
            }
        }
        
        // Clear the stored states
        this.preDockingSystemStates = null;
        
        console.log('All ship systems restored to pre-docking state.');
        console.log('Ship is ready for space operations.');
    }

    /**
     * Create target dummy ships for sub-targeting practice
     * @param {number} count - Number of dummy ships to create
     */
    async createTargetDummyShips(count = 3) {
        console.log(`Creating ${count} target dummy ships for sub-targeting practice...`);
        
        // Import EnemyShip class
        const { default: EnemyShip } = await import('../ship/EnemyShip.js');
        
        // Clear existing dummy ships
        this.clearTargetDummyShips();
        
        const enemyShipTypes = ['enemy_fighter', 'enemy_interceptor', 'enemy_gunship'];
        
        for (let i = 0; i < count; i++) {
            try {
                // Create enemy ship with simplified systems
                const enemyShipType = enemyShipTypes[i % enemyShipTypes.length];
                const dummyShip = new EnemyShip(enemyShipType);
                
                // Wait for systems to initialize
                await dummyShip.waitForSystemsInitialized();
                
                // Set ship name
                dummyShip.shipName = `Target Dummy ${i + 1}`;
                
                // Add some random damage to systems for testing
                this.addRandomDamageToShip(dummyShip);
                
                // Create 3D mesh for the dummy ship
                const shipMesh = this.createDummyShipMesh(i);
                
                // Position the ship relative to player
                const angle = (i / count) * Math.PI * 2;
                const distance = 15 + i * 5; // 15-25 km away
                const height = (Math.random() - 0.5) * 10; // Random height variation
                
                shipMesh.position.set(
                    this.camera.position.x + Math.cos(angle) * distance,
                    this.camera.position.y + height,
                    this.camera.position.z + Math.sin(angle) * distance
                );
                
                // Store ship data in mesh
                shipMesh.userData = {
                    ship: dummyShip,
                    shipType: enemyShipType,
                    isTargetDummy: true,
                    name: dummyShip.shipName
                };
                
                // Add to scene and tracking arrays
                this.scene.add(shipMesh);
                this.targetDummyShips.push(dummyShip);
                this.dummyShipMeshes.push(shipMesh);
                
                console.log(`Created target dummy: ${dummyShip.shipName} (${enemyShipType})`);
                
            } catch (error) {
                console.error(`Failed to create target dummy ${i + 1}:`, error);
            }
        }
        
        // Update target list to include dummy ships
        this.updateTargetList();
        
        console.log(`Successfully created ${this.targetDummyShips.length} target dummy ships`);
    }

    /**
     * Create a 3D mesh for a dummy ship
     * @param {number} index - Ship index for variation
     * @returns {THREE.Object3D} Ship mesh
     */
    createDummyShipMesh(index) {
        const group = new this.THREE.Group();
        
        // Create main hull (elongated box)
        const hullGeometry = new this.THREE.BoxGeometry(0.8, 0.3, 2.0);
        const hullMaterial = new this.THREE.MeshBasicMaterial({ 
            color: 0x666666,
            wireframe: false
        });
        const hull = new this.THREE.Mesh(hullGeometry, hullMaterial);
        group.add(hull);
        
        // Create engine nacelles
        const nacellGeometry = new this.THREE.CylinderGeometry(0.1, 0.1, 0.8);
        const nacellMaterial = new this.THREE.MeshBasicMaterial({ color: 0x444444 });
        
        const leftNacell = new this.THREE.Mesh(nacellGeometry, nacellMaterial);
        leftNacell.position.set(-0.5, 0, -0.5);
        leftNacell.rotation.z = Math.PI / 2;
        group.add(leftNacell);
        
        const rightNacell = new this.THREE.Mesh(nacellGeometry, nacellMaterial);
        rightNacell.position.set(0.5, 0, -0.5);
        rightNacell.rotation.z = Math.PI / 2;
        group.add(rightNacell);
        
        // Create weapon hardpoints
        const weaponGeometry = new this.THREE.SphereGeometry(0.08, 8, 6);
        const weaponMaterial = new this.THREE.MeshBasicMaterial({ color: 0xff4444 });
        
        const weapon1 = new this.THREE.Mesh(weaponGeometry, weaponMaterial);
        weapon1.position.set(-0.3, 0, 0.8);
        group.add(weapon1);
        
        const weapon2 = new this.THREE.Mesh(weaponGeometry, weaponMaterial);
        weapon2.position.set(0.3, 0, 0.8);
        group.add(weapon2);
        
        // Create shield emitters
        const shieldGeometry = new this.THREE.SphereGeometry(0.06, 6, 4);
        const shieldMaterial = new this.THREE.MeshBasicMaterial({ color: 0x4444ff });
        
        const shield1 = new this.THREE.Mesh(shieldGeometry, shieldMaterial);
        shield1.position.set(0, 0.2, 0);
        group.add(shield1);
        
        const shield2 = new this.THREE.Mesh(shieldGeometry, shieldMaterial);
        shield2.position.set(0, -0.2, 0);
        group.add(shield2);
        
        // Add some variation based on index
        const hue = (index * 0.3) % 1;
        hull.material.color.setHSL(hue, 0.3, 0.4);
        
        // Scale the ship
        group.scale.setScalar(2.0);
        
        return group;
    }

    /**
     * Add random damage to ship systems for testing
     * @param {EnemyShip} ship - Enemy ship to damage
     */
    addRandomDamageToShip(ship) {
        const systemNames = Array.from(ship.systems.keys());
        // Filter out core systems that shouldn't be damaged for testing
        const damageableSystemNames = systemNames.filter(name => 
            !['hull_plating', 'energy_reactor'].includes(name)
        );
        
        const numSystemsToDamage = Math.floor(Math.random() * 2) + 1; // 1-2 systems
        
        for (let i = 0; i < numSystemsToDamage; i++) {
            if (damageableSystemNames.length === 0) break;
            
            const randomSystem = damageableSystemNames[Math.floor(Math.random() * damageableSystemNames.length)];
            const system = ship.getSystem(randomSystem);
            
            if (system) {
                // Apply 10-50% damage (less than player ships for testing)
                const damagePercent = 0.1 + Math.random() * 0.4;
                const damage = system.maxHealth * damagePercent;
                system.takeDamage(damage);
                
                console.log(`  - Damaged ${randomSystem}: ${Math.round((1 - system.healthPercentage) * 100)}% damage`);
                
                // Remove from list to avoid damaging the same system twice
                const index = damageableSystemNames.indexOf(randomSystem);
                if (index > -1) {
                    damageableSystemNames.splice(index, 1);
                }
            }
        }
    }

    /**
     * Clear all target dummy ships
     */
    clearTargetDummyShips() {
        // Remove meshes from scene
        this.dummyShipMeshes.forEach(mesh => {
            this.scene.remove(mesh);
            
            // Dispose of geometries and materials
            mesh.traverse((child) => {
                if (child.geometry) {
                    child.geometry.dispose();
                }
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        });
        
        // Clear arrays
        this.targetDummyShips = [];
        this.dummyShipMeshes = [];
        
        console.log('Target dummy ships cleared');
    }

    /**
     * Get target dummy ship by mesh
     * @param {THREE.Object3D} mesh - Ship mesh
     * @returns {Ship|null} Ship instance or null
     */
    getTargetDummyShip(mesh) {
        return mesh.userData?.ship || null;
    }


} 