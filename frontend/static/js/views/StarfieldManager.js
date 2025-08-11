// THREE is handled dynamically in constructor
import { DockingInterface } from '../ui/DockingInterface.js';
import { HelpInterface } from '../ui/HelpInterface.js';
import DockingSystemManager from '../ship/DockingSystemManager.js';
import { getSystemDisplayName } from '../ship/System.js';
import DamageControlHUD from '../ui/DamageControlHUD.js';
import { WeaponEffectsManager } from '../ship/systems/WeaponEffectsManager.js';
import { WeaponSlot } from '../ship/systems/WeaponSlot.js';
import SimplifiedDamageControl from '../ui/SimplifiedDamageControl.js';
import DockingModal from '../ui/DockingModal.js';
import { StarfieldAudioManager } from './StarfieldAudioManager.js';
import { StarfieldRenderer } from './StarfieldRenderer.js';
import { TargetComputerManager } from './TargetComputerManager.js';
import { ProximityDetector3D } from '../ui/ProximityDetector3D.js';
import { EnemyAIManager } from '../ai/EnemyAIManager.js';
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
        
        // Get Ship instance from ViewManager for direct access to ship systems
        this.ship = this.viewManager.getShip();
        
        // Set StarfieldManager reference on ship for HUD error display
        if (this.ship && typeof this.ship.setStarfieldManager === 'function') {
            this.ship.setStarfieldManager(this);
        }
        
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
        
        // Create starfield renderer with quintuple density
        this.starCount = 40000;  // Increased from 8000 to 40000
        this.starfieldRenderer = new StarfieldRenderer(this.scene, this.THREE, this.starCount);
        this.starfield = this.starfieldRenderer.initialize();
        
        // Create speed indicator
        this.createSpeedIndicator();
        
        // Create ship systems HUD (initially hidden)
        this.createShipSystemsHUD();
        this.shipSystemsHUD.style.display = 'none'; // Hide by default
        this.damageControlVisible = false; // Track damage control visibility
        this.isDamageControlOpen = false; // Track if damage control is currently open
        this.shouldUpdateDamageControl = false; // Flag to control when to update
        
        // Create target computer manager
        this.targetComputerManager = new TargetComputerManager(
            this.scene, this.camera, this.viewManager, this.THREE, this.solarSystemManager
        );
        this.targetComputerManager.initialize();
        
        // Create radar HUD
        this.proximityDetector3D = new ProximityDetector3D(this, document.body);
        console.log('🎯 StarfieldManager: 3D Proximity Detector initialized');
        
        // Add intel state
        this.intelVisible = false;
        this.intelAvailable = false;
        this.intelRange = 50; // Extended range to 50km for better visibility
        this.previousTarget = null; // Track previous target for intel dismissal
        
        // Create intel HUD
        this.createIntelHUD();
        
        // Create weapon HUD
        this.createWeaponHUD();
        
        // Weapon HUD connection state
        this.weaponHUDConnected = false;
        
        // Create docking interface and system manager
        this.dockingInterface = new DockingInterface(this);
        this.dockingSystemManager = new DockingSystemManager();
        
        // Create docking modal for popup-based docking
        this.dockingModal = new DockingModal(this);
        
        // Create help interface
        this.helpInterface = new HelpInterface(this);
        
        // Create enemy AI manager
        this.enemyAIManager = new EnemyAIManager(this.scene, this.camera, this);
        
        // Create clean damage control HUD
        this.damageControlContainer = document.createElement('div');
        document.body.appendChild(this.damageControlContainer);
        this.damageControlHUD = new DamageControlHUD(this.ship, this.damageControlContainer);
        
        // Bind keyboard events
        this.bindKeyEvents();
        // Bind mouse events
        this.bindMouseEvents();

        // Audio setup - using new StarfieldAudioManager
        this.listener = new this.THREE.AudioListener();
        if (!this.camera) {
            console.error('No camera available for audio listener');
            return;
        }
        this.camera.add(this.listener);

        // Initialize audio manager
        this.audioManager = new StarfieldAudioManager(this.THREE, this.listener);

        // Make this instance globally available for button click handlers
        window.starfieldManager = this;
        
        // Make audio manager globally accessible for other audio systems
        window.starfieldAudioManager = this.audioManager;

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
        
        // WeaponEffectsManager initialization state
        this.weaponEffectsInitialized = false;
        this.weaponEffectsManager = null;
        this.weaponEffectsInitFailed = false;
        this.weaponEffectsRetryCount = 0;
        this.maxWeaponEffectsRetries = 5; // Limit retries to prevent infinite loops
        
        // Try to initialize WeaponEffectsManager after a short delay
        // This ensures THREE.js is fully loaded and available
        setTimeout(() => {
            this.initializeWeaponEffectsManager();
            this.initializeAIManager();
        }, 100);

        // Debug mode for weapon hit detection (independent of damage control)
        this.debugMode = false; // Toggled with Ctrl-O
        
        // Target outline system
        this.outlineEnabled = false; // Main outline toggle
        this.targetOutline = null; // 3D outline mesh in the world
        this.targetOutlineObject = null; // Track which object is being outlined
        this.outlineDisabledUntilManualCycle = false; // Prevents auto-outline after destruction
        this.lastOutlineUpdate = 0; // Throttling for outline updates
    }
    
    /**
     * Initialize the enemy AI manager
     */
    async initializeAIManager() {
        try {
            if (this.enemyAIManager) {
                await this.enemyAIManager.initialize();
                console.log('🤖 Enemy AI system ready');
            }
        } catch (error) {
            console.error('❌ Failed to initialize AI manager:', error);
        }
    }
    
    /**
     * Initialize WeaponEffectsManager for weapon visual and audio effects (lazy initialization)
     */
    initializeWeaponEffectsManager() {
        try {
            // Check if already failed or exceeded retry limit
            if (this.weaponEffectsInitFailed || this.weaponEffectsRetryCount >= this.maxWeaponEffectsRetries) {
                return false;
            }
            
            // Check if THREE.js is available
            if (!this.THREE) {
                console.warn(`WeaponEffectsManager initialization attempt ${this.weaponEffectsRetryCount + 1}/${this.maxWeaponEffectsRetries}: THREE.js not available yet`);
                this.weaponEffectsRetryCount++;
                if (this.weaponEffectsRetryCount >= this.maxWeaponEffectsRetries) {
                    console.error('WeaponEffectsManager initialization failed: THREE.js not available after maximum retries');
                    this.weaponEffectsInitFailed = true;
                }
                return false;
            }
            
            // Check if already initialized
            if (this.weaponEffectsInitialized) {
                return true;
            }
            
            // Import WeaponEffectsManager if not already available
            if (typeof WeaponEffectsManager === 'undefined') {
                console.warn('WeaponEffectsManager class not available, deferring initialization');
                this.weaponEffectsRetryCount++;
                return false;
            }
            
            // Get AudioContext from the existing audio listener
            const audioContext = this.listener && this.listener.context ? this.listener.context : null;
            
            // Create WeaponEffectsManager instance
            this.weaponEffectsManager = new WeaponEffectsManager(
                this.scene,
                this.camera,
                audioContext
            );
            
            // Connect WeaponEffectsManager to the ship
            if (this.ship) {
                this.ship.weaponEffectsManager = this.weaponEffectsManager;
                
                // Initialize ship position if not already set
                if (!this.ship.position) {
                    this.ship.position = new this.THREE.Vector3(0, 0, 0);
                }
                
                console.log('WeaponEffectsManager connected to ship');
            } else {
                console.warn('Ship not available, WeaponEffectsManager connection deferred');
            }
            
            this.weaponEffectsInitialized = true;
            this.weaponEffectsRetryCount = 0; // Reset retry count on success
            console.log('WeaponEffectsManager initialized successfully');
            return true;
            
        } catch (error) {
            console.error(`WeaponEffectsManager initialization failed (attempt ${this.weaponEffectsRetryCount + 1}):`, error);
            this.weaponEffectsRetryCount++;
            
            if (this.weaponEffectsRetryCount >= this.maxWeaponEffectsRetries) {
                console.error('WeaponEffectsManager initialization permanently failed after maximum retries');
                this.weaponEffectsInitFailed = true;
            }
            
            return false;
        }
    }
    
    /**
     * Ensure WeaponEffectsManager is initialized (lazy initialization with retry limits)
     */
    ensureWeaponEffectsManager() {
        // If permanently failed, don't retry
        if (this.weaponEffectsInitFailed) {
            return null;
        }
        
        // If not initialized and haven't exceeded retries, try to initialize
        if (!this.weaponEffectsInitialized && this.weaponEffectsRetryCount < this.maxWeaponEffectsRetries) {
            this.initializeWeaponEffectsManager();
        }
        
        return this.weaponEffectsManager;
    }

    ensureAudioContextRunning() {
        if (this.listener && this.listener.context) {
            if (this.listener.context.state === 'suspended') {
                this.listener.context.resume().catch(error => {
                    console.error('Failed to resume AudioContext:', error);
                });
            }
        }
    }

    // Starfield creation methods now delegated to StarfieldRenderer
    createStarfield() {
        // Delegate to starfield renderer
        return this.starfieldRenderer.createStarfield();
    }

    createFallbackStarfield() {
        // Delegate to starfield renderer
        return this.starfieldRenderer.createFallbackStarfield();
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
            width: 540px;
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
        // Get ship status using card filtering (only show systems for installed cards)
        const shipStatus = this.ship.getCardFilteredStatus();
        
        // Clear existing display
        this.systemsList.innerHTML = '';
        
        // Use the new DamageControlHUD system instead of deprecated method
        // The damage control display is now handled by the DamageControlHUD component
    }

    /**
     * Legacy damage control display - DEPRECATED
     * This method is kept for compatibility but the new DamageControlHUD is preferred
     */
    updateDamageControlDisplay(shipStatus) {
        // This method is now deprecated in favor of the new DamageControlHUD
        // Keeping it for backward compatibility but it's no longer used
        console.warn('updateDamageControlDisplay is deprecated - using new DamageControlHUD');
        return;
    }

    /**
     * Update manual repair system progress
     */
    updateManualRepairSystem() {
        if (!this.manualRepairSystem || !this.manualRepairSystem.isRepairing) {
            return;
        }

        const elapsed = Date.now() - this.manualRepairSystem.repairStartTime;
        const progress = Math.min(elapsed / this.manualRepairSystem.repairDuration, 1.0);
        
        // Update progress bar
        if (this.manualRepairSystem.cooldownElement) {
            this.manualRepairSystem.cooldownElement.progress.style.width = `${progress * 100}%`;
        }

        // Check if repair is complete
        if (progress >= 1.0) {
            this.completeManualRepair();
        }
    }

    /**
     * Start manual repair for a system
     * @param {string} systemName - Name of the system to repair
     */
    startManualRepair(systemName) {
        console.log(`🔧 startManualRepair called for: ${systemName}`);
        
        if (this.manualRepairSystem.isRepairing) {
            console.log(`🔧 Manual repair system already repairing: ${this.manualRepairSystem.repairTarget}`);
            return;
        }

        // Check if system exists and is damaged
        const system = this.ship.getSystem(systemName);
        if (!system) {
            console.error('🚫 REPAIR: System not found:', systemName);
            return;
        }

        console.log(`🔧 System found: ${systemName}, health: ${system.currentHealth}/${system.maxHealth}, healthPercentage: ${system.healthPercentage}`);

        if (system.healthPercentage >= 100) {
            console.log(`🔧 System ${systemName} is already fully repaired (${system.healthPercentage}%)`);
            return;
        }

        console.log(`🔧 Starting repair for ${systemName} (${system.healthPercentage}% health)`);
        
        this.manualRepairSystem.isRepairing = true;
        this.manualRepairSystem.repairTarget = systemName;
        this.manualRepairSystem.repairStartTime = Date.now();

        // Update cooldown display
        if (this.manualRepairSystem.cooldownElement) {
            this.manualRepairSystem.cooldownElement.label.textContent = `Repairing ${systemName}...`;
            this.manualRepairSystem.cooldownElement.progress.style.backgroundColor = '#00aa00';
        }

        // Disable all repair buttons without recreating the entire display
        this.updateRepairButtonStates();
    }

    /**
     * Complete manual repair
     */
    completeManualRepair() {
        if (!this.manualRepairSystem.isRepairing) {
            return;
        }

        const systemName = this.manualRepairSystem.repairTarget;
        const system = this.ship.getSystem(systemName);
        
        if (system) {
            // Repair the system to full health
            system.currentHealth = system.maxHealth;
        }

        // Reset repair system state
        this.manualRepairSystem.isRepairing = false;
        this.manualRepairSystem.repairTarget = null;
        this.manualRepairSystem.repairStartTime = 0;

        // Update cooldown display
        if (this.manualRepairSystem.cooldownElement) {
            this.manualRepairSystem.cooldownElement.label.textContent = 'Manual Repair System';
            this.manualRepairSystem.cooldownElement.progress.style.backgroundColor = '#555';
            this.manualRepairSystem.cooldownElement.progress.style.width = '0%';
        }

        // Re-enable repair buttons for damaged systems without recreating entire display
        this.updateRepairButtonStates();

        // Only refresh display if damage control is visible to show updated health
        if (this.damageControlVisible) {
            this.shouldUpdateDamageControl = true; // Mark for update instead of immediate update
        }
    }

    /**
     * Update repair button states (enable/disable based on repair status)
     */
    updateRepairButtonStates() {
        const repairButtons = this.systemsList.querySelectorAll('.repair-button');
        const isRepairing = this.manualRepairSystem.isRepairing;
        
        repairButtons.forEach(button => {
            button.disabled = isRepairing;
            button.style.opacity = isRepairing ? '0.5' : '1';
            button.style.cursor = isRepairing ? 'not-allowed' : 'pointer';
        });
    }

    /**
     * Display individual weapons from the weapons system
     * @param {Object} weaponsSystemData - The weapons system data
     * @param {Object} autoRepair - Auto-repair system
     * @returns {number} Number of weapons displayed
     */
    displayIndividualWeapons(weaponsSystemData, autoRepair) {
        let weaponsShown = 0;
        
        if (!this.ship.weaponSystem || !this.ship.weaponSystem.weaponSlots) {
            return this.displayRegularSystem('weapons', weaponsSystemData, autoRepair);
        }

        // Display each equipped weapon individually
        for (const weaponSlot of this.ship.weaponSystem.weaponSlots) {
            if (!weaponSlot.isEmpty && weaponSlot.equippedWeapon) {
                const weapon = weaponSlot.equippedWeapon;
                
                const weaponDiv = document.createElement('div');
                weaponDiv.setAttribute('data-system', `weapon_slot_${weaponSlot.slotIndex}`);
                weaponDiv.style.cssText = `
                    margin-bottom: 8px;
                    padding: 8px;
                    border: 1px solid #444;
                    border-radius: 4px;
                    background-color: rgba(0, 0, 0, 0.3);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                `;

                // Left side - weapon info
                const weaponInfo = document.createElement('div');
                weaponInfo.style.cssText = `
                    flex: 1;
                `;

                // Weapon name and status
                const nameDiv = document.createElement('div');
                nameDiv.style.cssText = `
                    font-weight: bold;
                    margin-bottom: 4px;
                `;
                
                const displayName = weapon.name || `Slot ${weaponSlot.slotIndex + 1} Weapon`;
                // Convert decimal health (0.0-1.0) to percentage (0-100)
                const healthPercentage = Math.round(weaponsSystemData.health * 100);
                const isOperational = weaponsSystemData.canBeActivated && !weaponSlot.isInCooldown();
                const isDamaged = healthPercentage < 100;
                const statusColor = isDamaged ? '#ff6b6b' : 
                                   isOperational ? '#00ff41' : '#ffaa00';
                
                nameDiv.innerHTML = `<span style="color: ${statusColor}">${displayName}</span>`;
                weaponInfo.appendChild(nameDiv);

                // Weapon details
                const detailsDiv = document.createElement('div');
                detailsDiv.style.cssText = `
                    font-size: 12px;
                    color: #aaa;
                    margin-bottom: 4px;
                `;
                
                let statusText = isOperational ? 'OPERATIONAL' : 'OFFLINE';
                if (isDamaged) statusText = 'DAMAGED';
                
                detailsDiv.innerHTML = `
                    Status: <span style="color: ${statusColor}">${statusText}</span><br>
                    Health: ${healthPercentage}%<br>
                    Type: ${weapon.weaponType || 'Unknown'}
                `;
                weaponInfo.appendChild(detailsDiv);

                // Auto-repair progress if weapons system is damaged
                if (isDamaged && autoRepair.repairQueue.some(repair => repair.systemName === 'weapons')) {
                    const repair = autoRepair.repairQueue.find(repair => repair.systemName === 'weapons');
                    const progressDiv = document.createElement('div');
                    progressDiv.style.cssText = `
                        font-size: 11px;
                        color: #00aa00;
                        margin-top: 4px;
                    `;
                    const progress = Math.round((repair.timeElapsed / repair.repairTime) * 100);
                    progressDiv.textContent = `Auto-repair: ${progress}% complete`;
                    weaponInfo.appendChild(progressDiv);
                }

                weaponDiv.appendChild(weaponInfo);

                // Right side - repair button for individual weapon
                const weaponSlotName = `weapon_slot_${weaponSlot.slotIndex}`;
                const repairButton = this.createRepairButton(weaponSlotName, isDamaged, healthPercentage);
                weaponDiv.appendChild(repairButton);

                this.systemsList.appendChild(weaponDiv);
                weaponsShown++;
            }
        }

        // If no weapons are equipped, show the unified weapons system
        if (weaponsShown === 0) {
            return this.displayRegularSystem('weapons', weaponsSystemData, autoRepair);
        }

        return weaponsShown;
    }

    /**
     * Display a regular (non-weapons) system
     * @param {string} systemName - Name of the system
     * @param {Object} systemData - System data
     * @param {Object} autoRepair - Auto-repair system
     * @returns {number} Number of systems displayed (always 1)
     */
    displayRegularSystem(systemName, systemData, autoRepair) {
        const systemDiv = document.createElement('div');
        systemDiv.setAttribute('data-system', systemName);
        systemDiv.style.cssText = `
            margin-bottom: 8px;
            padding: 8px;
            border: 1px solid #444;
            border-radius: 4px;
            background-color: rgba(0, 0, 0, 0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        // Left side - system info
        const systemInfo = document.createElement('div');
        systemInfo.style.cssText = `
            flex: 1;
        `;

        // System name and status
        const nameDiv = document.createElement('div');
        nameDiv.style.cssText = `
            font-weight: bold;
            margin-bottom: 4px;
        `;
        
        const displayName = this.formatSystemName(systemName);
        // Convert decimal health (0.0-1.0) to percentage (0-100)
        const healthPercentage = Math.round(systemData.health * 100);
        const isDamaged = healthPercentage < 100;
        const isOperational = systemData.canBeActivated;
        const statusColor = isDamaged ? '#ff6b6b' : 
                           isOperational ? '#00ff41' : '#ffaa00';
        
        nameDiv.innerHTML = `<span style="color: ${statusColor}">${displayName}</span>`;
        systemInfo.appendChild(nameDiv);

        // System details - properly format health as percentage
        const detailsDiv = document.createElement('div');
        detailsDiv.style.cssText = `
            font-size: 12px;
            color: #aaa;
            margin-bottom: 4px;
        `;
        
        let statusText = isOperational ? 'OPERATIONAL' : 'OFFLINE';
        if (isDamaged) statusText = 'DAMAGED';
        
        detailsDiv.innerHTML = `
            Status: <span style="color: ${statusColor}">${statusText}</span><br>
            Health: ${healthPercentage}%<br>
            Energy: ${systemData.energyConsumption || 0}/sec
        `;
        systemInfo.appendChild(detailsDiv);

        // Auto-repair progress if system is damaged
        if (isDamaged && autoRepair.repairQueue.some(repair => repair.systemName === systemName)) {
            const repair = autoRepair.repairQueue.find(repair => repair.systemName === systemName);
            const progressDiv = document.createElement('div');
            progressDiv.style.cssText = `
                font-size: 11px;
                color: #00aa00;
                margin-top: 4px;
            `;
            const progress = Math.round((repair.timeElapsed / repair.repairTime) * 100);
            progressDiv.textContent = `Auto-repair: ${progress}% complete`;
            systemInfo.appendChild(progressDiv);
        }

        systemDiv.appendChild(systemInfo);

        // Right side - repair button
        const repairButton = this.createRepairButton(systemName, isDamaged, healthPercentage);
        systemDiv.appendChild(repairButton);

        this.systemsList.appendChild(systemDiv);
        return 1;
    }

    /**
     * Create a repair button for a system
     * @param {string} systemName - Name of the system (or weapon_slot_X for individual weapons)
     * @param {boolean} isDamaged - Whether the system is damaged
     * @param {number} health - System health percentage
     * @returns {HTMLElement} Repair button element
     */
    createRepairButton(systemName, isDamaged, health) {
        const repairButton = document.createElement('button');
        repairButton.className = 'repair-button';
        repairButton.setAttribute('data-system-name', systemName); // Add this for event delegation
        repairButton.style.cssText = `
            padding: 6px 12px;
            border: 1px solid #555;
            border-radius: 3px;
            background-color: ${isDamaged ? '#2a4a2a' : '#4a4a4a'};
            color: ${isDamaged ? '#00ff41' : '#bbb'};
            font-size: 11px;
            cursor: ${isDamaged ? 'pointer' : 'default'};
            opacity: ${isDamaged ? '1' : '1'};
            transition: all 0.2s ease;
            min-width: 50px;
        `;
        
        repairButton.textContent = isDamaged ? 'REPAIR' : 'OK';
        repairButton.disabled = !isDamaged || this.manualRepairSystem?.isRepairing;
        
        // Only add hover effects for damaged, enabled buttons
        if (isDamaged && !repairButton.disabled) {
            repairButton.addEventListener('mouseenter', () => {
                repairButton.style.backgroundColor = '#3a5a3a';
                repairButton.style.borderColor = '#00ff41';
            });
            
            repairButton.addEventListener('mouseleave', () => {
                repairButton.style.backgroundColor = '#2a4a2a';
                repairButton.style.borderColor = '#555';
            });
        }

        // Update button state if repair system is active
        if (this.manualRepairSystem?.isRepairing) {
            repairButton.disabled = true;
            repairButton.style.opacity = '0.6';
            repairButton.style.cursor = 'not-allowed';
            repairButton.style.backgroundColor = '#333';
            repairButton.style.color = '#888';
        }

        return repairButton;
    }

    formatSystemName(systemName) {
        // Special handling for weapons - get the actual weapon type
        if (systemName === 'weapons' && this.ship) {
            const weaponsSystem = this.ship.getSystem('weapons');
            if (weaponsSystem && weaponsSystem.levelStats && weaponsSystem.level) {
                const levelStats = weaponsSystem.levelStats[weaponsSystem.level];
                if (levelStats && levelStats.weaponType) {
                    return levelStats.weaponType.toUpperCase();
                }
            }
        }
        
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





    createIntelHUD() {
        // Create intel HUD container - match targeting CPU screen exactly and cover all panels
        this.intelHUD = document.createElement('div');
        this.intelHUD.className = 'intel-hud';
        this.intelHUD.style.cssText = `
            position: fixed;
            bottom: 80px;
            left: 10px;
            width: 200px;
            height: 280px;
            border: 2px solid #00ff41;
            background: rgba(0, 0, 0, 0.95);
            color: #00ff41;
            font-family: "Courier New", monospace;
            font-size: 14px;
            padding: 10px;
            display: none;
            pointer-events: auto;
            z-index: 1500;
            overflow-y: auto;
            transition: border-color 0.3s ease;
            box-sizing: border-box;
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
            
            /* Custom scrollbar for intel HUD - positioned on left side */
            .intel-hud {
                direction: rtl; /* Right-to-left to move scrollbar to left */
            }
            .intel-hud > * {
                direction: ltr; /* Reset content direction to normal */
            }
            .intel-hud::-webkit-scrollbar {
                width: 8px;
            }
            .intel-hud::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.3);
                border-radius: 4px;
            }
            .intel-hud::-webkit-scrollbar-thumb {
                background: #00ff41;
                border-radius: 4px;
                border: 1px solid rgba(0, 255, 65, 0.3);
            }
            .intel-hud::-webkit-scrollbar-thumb:hover {
                background: #00aa41;
            }
        `;
        document.head.appendChild(style);
        
        document.body.appendChild(this.intelHUD);
    }

    createWeaponHUD() {
        // Import and initialize WeaponHUD
        console.log('🔫 StarfieldManager: Starting WeaponHUD creation...');
        import('../ui/WeaponHUD.js').then(({ WeaponHUD }) => {
            console.log('🔫 StarfieldManager: WeaponHUD module loaded, creating instance...');
            this.weaponHUD = new WeaponHUD(document.body);
            
            // Initialize weapon slots display
            this.weaponHUD.initializeWeaponSlots(4);
            console.log('🔫 StarfieldManager: WeaponHUD created and initialized');
            
            // Connect to weapon system if available
            this.connectWeaponHUDToSystem();
            
            // Set up retry mechanism for connection
            this.setupWeaponHUDConnectionRetry();
            
        }).catch(error => {
            console.error('❌ StarfieldManager: Failed to initialize WeaponHUD:', error);
        });
    }
    
    /**
     * Set up retry mechanism for WeaponHUD connection
     */
    setupWeaponHUDConnectionRetry() {
        // Retry connection every 500ms for up to 30 seconds
        this.weaponHUDRetryCount = 0;
        this.maxWeaponHUDRetries = 60; // 30 seconds at 500ms intervals
        
        this.weaponHUDRetryInterval = setInterval(() => {
            this.weaponHUDRetryCount++;
            
            // Try to connect
            this.connectWeaponHUDToSystem();
            
            // If connected or max retries reached, stop trying
            if (this.weaponHUDConnected || this.weaponHUDRetryCount >= this.maxWeaponHUDRetries) {
                clearInterval(this.weaponHUDRetryInterval);
                this.weaponHUDRetryInterval = null;
                
                if (this.weaponHUDConnected) {
                    console.log(`✅ WeaponHUD connected after ${this.weaponHUDRetryCount} attempts`);
                } else {
                    console.log(`🔍 WeaponHUD connection will retry later (${this.maxWeaponHUDRetries} attempts completed)`);
                }
            }
        }, 500);
    }
    
    /**
     * Connect WeaponHUD to WeaponSystemCore
     */
    connectWeaponHUDToSystem() {
        const ship = this.viewManager?.getShip();
        
        console.log('🔗 Attempting to connect WeaponHUD to WeaponSystemCore...');
        console.log('  - Ship available:', !!ship);
        console.log('  - Ship weaponSystem available:', !!(ship?.weaponSystem));
        console.log('  - WeaponHUD available:', !!this.weaponHUD);
        
        if (ship && ship.weaponSystem && this.weaponHUD) {
            // Set HUD reference in weapon system
            ship.weaponSystem.setWeaponHUD(this.weaponHUD);
            
            // Update weapon slots display
            this.weaponHUD.updateWeaponSlotsDisplay(ship.weaponSystem.weaponSlots, ship.weaponSystem.activeSlotIndex);
            
            this.weaponHUDConnected = true;
            console.log('✅ WeaponHUD successfully connected to WeaponSystemCore');
        } else {
            this.weaponHUDConnected = false;
            // Use debug logging instead of warnings during startup
            console.log('🔍 WeaponHUD connection pending:');
            if (!ship) console.log('  - Ship initializing...');
            if (!ship?.weaponSystem) console.log('  - WeaponSystem initializing...');
            if (!this.weaponHUD) console.log('  - WeaponHUD initializing...');
        }
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
            
                    // Debug mode toggle (Ctrl-O) for weapon hit detection
        if (event.ctrlKey && event.key.toLowerCase() === 'o') {
                event.preventDefault();
                
                console.log(`🎮 CTRL+O PRESSED: Toggling debug mode...`);
                
                // Toggle weapon debug mode
                this.toggleDebugMode();
                
                // Toggle physics debug visualization
                if (window.physicsManager && window.physicsManager.initialized) {
                    console.log(`🔧 PhysicsManager Status: Initialized and ready`);
                    console.log(`   • Current debug mode: ${window.physicsManager.debugMode ? 'ENABLED' : 'DISABLED'}`);
                    
                    const physicsDebugEnabled = window.physicsManager.toggleDebugMode(this.scene);
                    console.log(`🔍 Physics debug visualization ${physicsDebugEnabled ? 'ENABLED' : 'DISABLED'}`);
                    
                    // If enabling debug mode, sync all physics body positions first
                    if (physicsDebugEnabled) {
                        window.physicsManager.updateAllRigidBodyPositions();
                        console.log(`👁️ PHYSICS DEBUG WIREFRAMES NOW VISIBLE:`);
                        console.log(`   • Enemy ships: MAGENTA wireframes`);
                        console.log(`   • Celestial bodies: CYAN wireframes`);
                        console.log(`   • Unknown objects: YELLOW wireframes`);
                        console.log(`   • Look for bright colored wireframe outlines around objects`);
                        console.log(`💡 TIP: Fire torpedoes to see their bright collision shapes in motion!`);
                        console.log(`💡 TIP: Press Ctrl+Shift+P to enhance wireframe visibility if you can't see them`);
                    } else {
                        console.log(`🧹 Physics debug disabled - debug wireframes hidden`);
                    }
                } else {
                    console.warn(`⚠️ PhysicsManager not available for debug visualization`);
                    if (window.physicsManager) {
                        console.warn(`   • PhysicsManager exists but not initialized: ${window.physicsManager.initialized}`);
                    } else {
                        console.warn(`   • PhysicsManager is not loaded`);
                    }
                }
                
                console.log(`✅ CTRL+O DEBUG TOGGLE COMPLETE`);
            }
            
            // Enhanced wireframe visibility toggle (Ctrl-Shift-P) for debugging wireframe issues
            if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'p') {
                event.preventDefault();
                
                console.log(`🎮 CTRL+SHIFT+P PRESSED: Enhancing wireframe visibility...`);
                
                if (window.physicsManager && window.physicsManager.initialized && window.physicsManager.debugMode) {
                    window.physicsManager.enhanceWireframeVisibility();
                } else {
                    console.log(`❌ Cannot enhance wireframes - debug mode not active or physics manager not available`);
                    console.log(`💡 Press Ctrl+P first to enable debug mode`);
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
                        // Check if the requested speed exceeds the engine's maximum capability
                        const maxSpeed = impulseEngines.getMaxImpulseSpeed();
                        
                        if (requestedSpeed > maxSpeed) {
                            // Requested speed exceeds engine capability - play command failed sound and abort
                            this.playCommandFailedSound();
                            return; // Abort without changing speed
                        }
                        
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
                    const sounds = this.audioManager.areSoundsLoaded();
                    if (sounds.engine) {
                        if (this.audioManager.getEngineState() === 'stopped') {
                            this.audioManager.playEngineStartup();
                        } else if (this.audioManager.getEngineState() === 'running') {
                            this.audioManager.updateEngineVolume(actualSpeed, this.maxSpeed);
                        }
                    }
                }
            }
            
            // AI Debug Commands (Cmd+Shift combinations for Mac)
            if (event.metaKey && event.shiftKey) {
                const key = event.key.toLowerCase();
                switch (key) {
                    case 'a':
                        // Toggle AI debug mode
                        event.preventDefault();
                        if (this.enemyAIManager) {
                            this.enemyAIManager.setDebugMode(!this.enemyAIManager.debugMode);
                            console.log(`🤖 AI Debug Mode: ${this.enemyAIManager.debugMode ? 'ON' : 'OFF'}`);
                        }
                        return;
                    case 'e':
                        // Force all AIs to engage state
                        event.preventDefault();
                        if (this.enemyAIManager) {
                            this.enemyAIManager.forceAllAIState('engage');
                            console.log('🤖 All AIs forced to ENGAGE state');
                        }
                        return;
                    case 'i':
                        // Force all AIs to idle state
                        event.preventDefault();
                        if (this.enemyAIManager) {
                            this.enemyAIManager.forceAllAIState('idle');
                            console.log('🤖 All AIs forced to IDLE state');
                        }
                        return;
                    case 's':
                        // Show AI statistics
                        event.preventDefault();
                        if (this.enemyAIManager) {
                            const stats = this.enemyAIManager.getAIStats();
                            console.log('🤖 AI Statistics:', stats);
                        }
                        return;
                    case 'f':
                        // Force all AIs to flee state
                        event.preventDefault();
                        if (this.enemyAIManager) {
                            this.enemyAIManager.forceAllAIState('flee');
                            console.log('🤖 All AIs forced to FLEE state');
                        }
                        return;
                    case 'v':
                        // Create V-Formation with all AI ships
                        event.preventDefault();
                        if (this.enemyAIManager && this.targetDummyShips) {
                            this.enemyAIManager.createFormation(this.targetDummyShips, 'v_formation');
                            console.log('🎯 Created V-Formation with all AI ships');
                        }
                        return;
                    case 'c':
                        // Create Column formation with all AI ships
                        event.preventDefault();
                        if (this.enemyAIManager && this.targetDummyShips) {
                            this.enemyAIManager.createFormation(this.targetDummyShips, 'column');
                            console.log('🎯 Created Column formation with all AI ships');
                        }
                        return;
                    case 'l':
                        // Create Line Abreast formation with all AI ships
                        event.preventDefault();
                        if (this.enemyAIManager && this.targetDummyShips) {
                            this.enemyAIManager.createFormation(this.targetDummyShips, 'line_abreast');
                            console.log('🎯 Created Line Abreast formation with all AI ships');
                        }
                        return;
                    case 'b':
                        // Show flocking statistics
                        event.preventDefault();
                        if (this.enemyAIManager) {
                            const stats = this.enemyAIManager.getFlockingStats();
                            console.log('🐦 Flocking Statistics:', stats);
                        }
                        return;
                }
            }
            
            // Handle Tab key for cycling targets
            if (event.key === 'Tab') {
                event.preventDefault(); // Prevent Tab from changing focus
                // Removed target cycling key press log to prevent console spam
                // console.log('🎯 TAB key pressed for target cycling');
                
                // Block target cycling when docked
                if (this.isDocked) {
                    this.playCommandFailedSound();
                    this.showHUDError(
                        'TARGET CYCLING UNAVAILABLE',
                        'Targeting systems offline while docked'
                    );
                    return;
                }
                
                // Check for undock cooldown with proper user feedback
                if (this.undockCooldown && Date.now() < this.undockCooldown) {
                    const remainingSeconds = Math.ceil((this.undockCooldown - Date.now()) / 1000);
                    this.playCommandFailedSound();
                    this.showHUDError(
                        'TARGETING SYSTEMS WARMING UP',
                        `Systems initializing after launch - ${remainingSeconds}s remaining`
                    );
                    return;
                }
                
                // Check if target computer system is operational
                const ship = this.viewManager?.getShip();
                if (ship) {
                    const targetComputer = ship.getSystem('target_computer');
                    const energyReactor = ship.getSystem('energy_reactor');
                    
                    if (targetComputer && targetComputer.canActivate(ship) && this.targetComputerEnabled) {
                        // Target computer is operational and activated - allow cycling
                        // Removed target cycling call log to prevent console spam
                        // console.log('🎯 Cycling target from TAB key press');
                        this.cycleTarget();
                        this.playCommandSound();
                    } else {
                        // Target computer cannot function - provide specific feedback
                        this.playCommandFailedSound();
                        
                        if (!targetComputer) {
                            this.showHUDError(
                                'TARGET CYCLING UNAVAILABLE',
                                'No Target Computer card installed in ship slots'
                            );
                        } else if (!targetComputer.isOperational()) {
                            this.showHUDError(
                                'TARGET CYCLING OFFLINE',
                                `Target Computer damaged (${Math.round(targetComputer.healthPercentage * 100)}% health) - repair required`
                            );
                        } else if (!ship.hasSystemCardsSync('target_computer')) {
                            this.showHUDError(
                                'TARGET CYCLING UNAVAILABLE',
                                'No Target Computer card installed in ship slots'
                            );
                        } else if (!this.targetComputerEnabled) {
                            this.showHUDError(
                                'TARGET CYCLING DISABLED',
                                'Activate Target Computer (T key) first'
                            );
                        } else if (!energyReactor || !energyReactor.isOperational()) {
                            // Energy reactor is the problem
                            if (!energyReactor) {
                                this.showHUDError(
                                    'TARGET CYCLING FAILURE',
                                    'No Energy Reactor installed - cannot power systems'
                                );
                            } else {
                                this.showHUDError(
                                    'TARGET CYCLING FAILURE',
                                    `Energy Reactor disabled (${Math.round(energyReactor.healthPercentage * 100)}% health) - repair immediately`
                                );
                            }
                        } else {
                            // Target cycling should not require energy - removed the energy check
                            // Generic fallback
                            this.showHUDError(
                                'TARGET CYCLING FAILURE',
                                'System requirements not met - check power and repair status'
                            );
                        }
                    }
                } else {
                    this.playCommandFailedSound();
                    this.showHUDError(
                        'TARGET CYCLING UNAVAILABLE',
                        'No ship systems available'
                    );
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
                // DISABLED - handled by ViewManager to avoid conflicts
                // ViewManager properly activates/deactivates galactic chart system
                
                /* DISABLED - avoid duplicate handler conflicts
                // Block galactic chart when docked
                if (!this.isDocked) {
                    // Check if galactic chart system can be activated
                    const ship = this.viewManager?.getShip();
                    if (ship) {
                        const galacticChart = ship.getSystem('galactic_chart');
                        
                        if (galacticChart && galacticChart.canActivate(ship)) {
                            this.playCommandSound();
                            this.setView('GALACTIC');
                        } else {
                            // System can't be activated - provide specific error message
                            if (!galacticChart) {
                                this.showHUDError(
                                    'GALACTIC CHART UNAVAILABLE',
                                    'System not installed on this ship'
                                );
                            } else if (!galacticChart.isOperational()) {
                                this.showHUDError(
                                    'GALACTIC CHART DAMAGED',
                                    'Repair system to enable navigation'
                                );
                            } else if (!ship.hasSystemCardsSync('galactic_chart')) {
                                this.showHUDError(
                                    'GALACTIC CHART MISSING',
                                    'Install galactic chart card to enable navigation'
                                );
                            } else if (!ship.hasEnergy(15)) {
                                this.showHUDError(
                                    'INSUFFICIENT ENERGY',
                                    'Need 15 energy units to activate galactic chart'
                                );
                            } else {
                                this.showHUDError(
                                    'GALACTIC CHART ERROR',
                                    'System cannot be activated'
                                );
                            }
                            this.playCommandFailedSound();
                        }
                    }
                }
                */
            } else if (commandKey === 'l') {
                // DISABLED - handled by ViewManager to avoid conflicts  
                // ViewManager properly activates/deactivates long range scanner system
                
                /* DISABLED - avoid duplicate handler conflicts
                // Block long range scanner when docked
                if (!this.isDocked) {
                    // Check if long range scanner system can be activated
                    const ship = this.viewManager?.getShip();
                    if (ship) {
                        const scanner = ship.getSystem('long_range_scanner');
                        if (scanner && scanner.canActivate(ship)) {
                            this.playCommandSound();
                            this.setView('SCANNER');
                        } else {
                            // System can't be activated - provide specific error message
                            if (!scanner) {
                                this.showHUDError(
                                    'LONG RANGE SCANNER UNAVAILABLE',
                                    'No Long Range Scanner card installed in ship slots'
                                );
                            } else if (!scanner.isOperational()) {
                                this.showHUDError(
                                    'LONG RANGE SCANNER OFFLINE',
                                    'System damaged or offline - repair required'
                                );
                            } else if (!ship.hasSystemCardsSync('long_range_scanner')) {
                                this.showHUDError(
                                    'LONG RANGE SCANNER UNAVAILABLE',
                                    'No Long Range Scanner card installed in ship slots'
                                );
                            } else {
                                this.showHUDError(
                                    'LONG RANGE SCANNER ACTIVATION FAILED',
                                    'Insufficient energy for scanning operations'
                                );
                            }
                        }
                    } else {
                        this.playCommandFailedSound();
                    }
                } else {
                    this.showHUDError(
                        'LONG RANGE SCANNER UNAVAILABLE',
                        'Scanner systems offline while docked'
                    );
                }
                */
            } else if (commandKey === 't') {
                // Block target computer when docked
                if (!this.isDocked) {
                    // Check if target computer system can be activated
                    const ship = this.viewManager?.getShip();
                    if (ship) {
                        const targetComputer = ship.getSystem('target_computer');
                        const energyReactor = ship.getSystem('energy_reactor');
                        
                        if (targetComputer && targetComputer.canActivate(ship)) {
                            this.playCommandSound();
                            this.toggleTargetComputer();
                        } else {
                            // System can't be activated - provide specific error message
                            this.playCommandFailedSound();
                            
                            if (!targetComputer) {
                                this.showHUDError(
                                    'TARGET COMPUTER UNAVAILABLE',
                                    'No Target Computer card installed in ship slots'
                                );
                            } else if (!targetComputer.isOperational()) {
                                this.showHUDError(
                                    'TARGET COMPUTER OFFLINE',
                                    `System damaged (${Math.round(targetComputer.healthPercentage * 100)}% health) - repair required`
                                );
                            } else if (!ship.hasSystemCardsSync('target_computer')) {
                                this.showHUDError(
                                    'TARGET COMPUTER UNAVAILABLE',
                                    'No Target Computer card installed in ship slots'
                                );
                            } else if (!energyReactor || !energyReactor.isOperational()) {
                                // Energy reactor is the problem
                                if (!energyReactor) {
                                    this.showHUDError(
                                        'POWER FAILURE',
                                        'No Energy Reactor installed - cannot power systems'
                                    );
                                } else {
                                    this.showHUDError(
                                        'POWER FAILURE',
                                        `Energy Reactor disabled (${Math.round(energyReactor.healthPercentage * 100)}% health) - repair immediately`
                                    );
                                }
                            } else if (ship.currentEnergy < targetComputer.getEnergyConsumptionRate()) {
                                // Insufficient energy
                                const required = targetComputer.getEnergyConsumptionRate();
                                const available = Math.round(ship.currentEnergy);
                                this.showHUDError(
                                    'INSUFFICIENT ENERGY',
                                    `Need ${required}/sec energy. Available: ${available} units`
                                );
                            } else {
                                // Generic fallback
                                this.showHUDError(
                                    'TARGET COMPUTER ACTIVATION FAILED',
                                    'System requirements not met - check power and repair status'
                                );
                            }
                        }
                    } else {
                        this.playCommandFailedSound();
                        this.showHUDError(
                            'SHIP SYSTEMS OFFLINE',
                            'No ship systems available'
                        );
                    }
                } else {
                    this.showHUDError(
                        'TARGET COMPUTER UNAVAILABLE',
                        'Targeting systems offline while docked'
                    );
                }
            }

            // Add Intel key binding
            if (commandKey === 'i') {
                // Block intel when docked
                if (this.isDocked) {
                    this.playCommandFailedSound();
                    this.showHUDError(
                        'INTEL UNAVAILABLE',
                        'Intelligence systems offline while docked'
                    );
                    return;
                }
                
                // Check if intel can be activated (requires target computer and scanner)
                const ship = this.viewManager?.getShip();
                if (!ship) {
                    this.playCommandFailedSound();
                    this.showHUDError(
                        'INTEL UNAVAILABLE',
                        'No ship systems available'
                    );
                    return;
                }
                
                const targetComputer = ship.getSystem('target_computer');
                const scanner = ship.getSystem('long_range_scanner');
                const energyReactor = ship.getSystem('energy_reactor');
                
                // Check all requirements for Intel functionality
                if (targetComputer && targetComputer.canActivate(ship) && targetComputer.hasIntelCapabilities() &&
                    scanner && scanner.canActivate(ship) && 
                    this.intelAvailable && this.targetComputerEnabled && this.currentTarget) {
                    // All requirements met - activate Intel
                    this.playCommandSound();
                    this.toggleIntel();
                } else {
                    // Intel can't be activated - provide specific error messages
                    this.playCommandFailedSound();
                    
                    // Priority order: Target Computer issues first (most critical)
                    if (!targetComputer) {
                        this.showHUDError(
                            'INTEL UNAVAILABLE',
                            'No Target Computer card installed in ship slots'
                        );
                    } else if (!targetComputer.isOperational()) {
                        this.showHUDError(
                            'INTEL UNAVAILABLE',
                            `Target Computer damaged (${Math.round(targetComputer.healthPercentage * 100)}% health) - repair required`
                        );
                    } else if (!ship.hasSystemCardsSync('target_computer')) {
                        this.showHUDError(
                            'INTEL UNAVAILABLE',
                            'No Target Computer card installed in ship slots'
                        );
                    } else if (!this.targetComputerEnabled) {
                        this.showHUDError(
                            'INTEL UNAVAILABLE',
                            'Activate Target Computer (T key) first'
                        );
                    } else if (!energyReactor || !energyReactor.isOperational()) {
                        // Energy reactor issues
                        if (!energyReactor) {
                            this.showHUDError(
                                'INTEL UNAVAILABLE',
                                'No Energy Reactor installed - cannot power systems'
                            );
                        } else {
                            this.showHUDError(
                                'INTEL UNAVAILABLE',
                                `Energy Reactor disabled (${Math.round(energyReactor.healthPercentage * 100)}% health) - repair immediately`
                            );
                        }
                    } else if (ship.currentEnergy < (targetComputer.getEnergyConsumptionRate() + (scanner?.getEnergyConsumptionRate() || 0))) {
                        // Insufficient energy for both systems
                        const required = targetComputer.getEnergyConsumptionRate() + (scanner?.getEnergyConsumptionRate() || 0);
                        const available = Math.round(ship.currentEnergy);
                        this.showHUDError(
                            'INTEL UNAVAILABLE',
                            `Insufficient energy - need ${required}/sec for intel operations. Available: ${available} units`
                        );
                    } else if (!targetComputer.hasIntelCapabilities()) {
                        this.showHUDError(
                            'INTEL UNAVAILABLE',
                            'Requires Level 3+ Target Computer with intel capabilities'
                        );
                    } else if (!scanner) {
                        this.showHUDError(
                            'INTEL UNAVAILABLE',
                            'No Long Range Scanner card installed - required for detailed analysis'
                        );
                    } else if (!scanner.isOperational()) {
                        this.showHUDError(
                            'INTEL UNAVAILABLE',
                            `Long Range Scanner damaged (${Math.round(scanner.healthPercentage * 100)}% health) - repair required`
                        );
                    } else if (!ship.hasSystemCardsSync('long_range_scanner')) {
                        this.showHUDError(
                            'INTEL UNAVAILABLE',
                            'No Long Range Scanner card installed - required for detailed analysis'
                        );
                    } else if (!this.currentTarget) {
                        this.showHUDError(
                            'INTEL UNAVAILABLE',
                            'No target selected - activate Target Computer and select target first'
                        );
                    } else if (!this.intelAvailable) {
                        this.showHUDError(
                            'INTEL UNAVAILABLE',
                            'Target out of scanner range or intel data not available'
                        );
                    } else {
                        // Generic fallback
                        this.showHUDError(
                            'INTEL UNAVAILABLE',
                            'System requirements not met - check power and repair status'
                        );
                    }
                }
            }

            // Add Proximity Detector key binding (P)
            if (commandKey === 'p') {
                // Block proximity detector when docked
                if (!this.isDocked) {
                    // Check if ship has radar cards installed
                    const ship = this.viewManager?.getShip();
                    if (ship && ship.hasSystemCardsSync('radar')) {
                        // Toggle 3D proximity detector display
                        this.playCommandSound();
                        this.toggleProximityDetector();
                    } else {
                        // No radar cards installed
                        this.playCommandFailedSound();
                        this.showHUDError(
                            'PROXIMITY DETECTOR UNAVAILABLE',
                            'No Proximity Detector card installed in ship slots'
                        );
                    }
                } else {
                    this.playCommandFailedSound();
                    this.showHUDError(
                        'PROXIMITY DETECTOR UNAVAILABLE',
                        'Proximity Detector offline while docked'
                    );
                }
            }

            // Add Proximity Detector Zoom In key binding (= key, which is + without shift)
            if (event.key === '=' || event.key === '+') {
                // Only allow zoom when not docked and proximity detector is visible
                if (!this.isDocked && this.proximityDetector3D && this.proximityDetector3D.isVisible) {
                    // Zoom in (closer range) - + should zoom IN
                    if (this.proximityDetector3D.zoomIn()) {
                        this.playCommandSound();
                    } else {
                        this.playCommandFailedSound();
                    }
                } else if (this.isDocked) {
                    this.playCommandFailedSound();
                    this.showHUDError(
                        'PROXIMITY DETECTOR ZOOM UNAVAILABLE',
                        'Proximity Detector offline while docked'
                    );
                } else {
                    this.playCommandFailedSound();
                    this.showHUDError(
                        'PROXIMITY DETECTOR ZOOM UNAVAILABLE',
                        'Proximity Detector not active (press P to enable)'
                    );
                }
            }

            // Add Proximity Detector Zoom Out key binding (- key)
            if (event.key === '-' || event.key === '_') {
                // Only allow zoom when not docked and proximity detector is visible
                if (!this.isDocked && this.proximityDetector3D && this.proximityDetector3D.isVisible) {
                    // Zoom out (farther range) - - should zoom OUT  
                    if (this.proximityDetector3D.zoomOut()) {
                        this.playCommandSound();
                    } else {
                        this.playCommandFailedSound();
                    }
                } else if (this.isDocked) {
                    this.playCommandFailedSound();
                    this.showHUDError(
                        'PROXIMITY DETECTOR ZOOM UNAVAILABLE',
                        'Proximity Detector offline while docked'
                    );
                } else {
                    this.playCommandFailedSound();
                    this.showHUDError(
                        'PROXIMITY DETECTOR ZOOM UNAVAILABLE',
                        'Proximity Detector not active (press P to enable)'
                    );
                }
            }

            // Add Proximity Detector View Mode Toggle key binding (\\ key)
            if (event.key === '\\') {
                // Only allow view mode toggle when not docked and proximity detector is visible
                if (!this.isDocked && this.proximityDetector3D && this.proximityDetector3D.isVisible) {
                    // Toggle between 3D and top-down view modes
                    if (this.proximityDetector3D.toggleViewMode()) {
                        this.playCommandSound();
                    } else {
                        this.playCommandFailedSound();
                    }
                } else if (this.isDocked) {
                    this.playCommandFailedSound();
                    this.showHUDError(
                        'PROXIMITY DETECTOR VIEW TOGGLE UNAVAILABLE',
                        'Proximity Detector offline while docked'
                    );
                } else {
                    this.playCommandFailedSound();
                    this.showHUDError(
                        'PROXIMITY DETECTOR VIEW TOGGLE UNAVAILABLE',
                        'Proximity Detector not active (press P to enable)'
                    );
                }
            }

            // Add Shields key binding (S)
            if (commandKey === 's') {
                // Block shields when docked
                if (!this.isDocked) {
                    // Check if shields system can be activated
                    const ship = this.viewManager?.getShip();
                    if (ship) {
                        const shields = ship.getSystem('shields');
                        
                        // DEBUG: Add comprehensive shield debugging
                        console.log('🛡️ SHIELD DEBUG - Analyzing shield system state:');
                        console.log('  • Shields system object:', shields);
                        console.log('  • Ship has cardSystemIntegration:', !!ship.cardSystemIntegration);
                        
                        if (ship.cardSystemIntegration) {
                            const installedCards = Array.from(ship.cardSystemIntegration.installedCards.values());
                            console.log('  • Total installed cards:', installedCards.length);
                            console.log('  • Installed card types:', installedCards.map(card => `${card.cardType} (L${card.level})`));
                            
                            const shieldCards = installedCards.filter(card => card.cardType === 'shields');
                            console.log('  • Shield cards found:', shieldCards.length, shieldCards);
                            
                            const hasSystemCardsResult = ship.cardSystemIntegration.hasSystemCardsSync('shields');
                            console.log('  • hasSystemCardsSync result:', hasSystemCardsResult);
                            
                            const shipHasSystemCards = ship.hasSystemCardsSync('shields', true);
                            console.log('  • ship.hasSystemCardsSync result:', shipHasSystemCards);
                        }
                        
                        if (shields && shields.canActivate(ship)) {
                            this.playCommandSound();
                            shields.toggleShields();
                        } else {
                            // System can't be activated - provide specific error message
                            if (!shields) {
                                console.log('🛡️ SHIELD DEBUG: No shields system found');
                                this.showHUDError(
                                    'SHIELDS UNAVAILABLE',
                                    'System not installed on this ship'
                                );
                            } else if (!shields.isOperational()) {
                                console.log('🛡️ SHIELD DEBUG: Shields system not operational');
                                this.showHUDError(
                                    'SHIELDS DAMAGED',
                                    'Repair system to enable shield protection'
                                );
                            } else if (!ship.hasSystemCardsSync('shields', true)) {
                                console.log('🛡️ SHIELD DEBUG: Missing shield cards - this is the problem!');
                                this.showHUDError(
                                    'SHIELDS MISSING',
                                    'Install shield card to enable protection'
                                );
                            } else if (!ship.hasEnergy(25)) {
                                console.log('🛡️ SHIELD DEBUG: Insufficient energy');
                                this.showHUDError(
                                    'INSUFFICIENT ENERGY',
                                    'Need 25 energy units to activate shields'
                                );
                            } else {
                                this.showHUDError(
                                    'SHIELDS ERROR',
                                    'System cannot be activated'
                                );
                            }
                            this.playCommandFailedSound();
                        }
                    }
                }
            }

            // Add Subspace Radio key binding (R) - Note: SubspaceRadio has its own R key handler
            // This is a fallback for when the system doesn't exist
            if (commandKey === 'r') {
                // DISABLED - handled by SubspaceRadio UI class to avoid conflicts
                // SubspaceRadio class properly handles R key activation and UI
                
                /* DISABLED - avoid duplicate handler conflicts
                // Block subspace radio when docked
                if (!this.isDocked) {
                    // Check if subspace radio system exists and can be activated
                    const ship = this.viewManager?.getShip();
                    if (ship) {
                        const radio = ship.getSystem('subspace_radio');
                        
                        if (!radio) {
                            // System doesn't exist (starter ship case)
                            this.showHUDError(
                                'SUBSPACE RADIO UNAVAILABLE',
                                'Install subspace radio card to enable communications'
                            );
                            this.playCommandFailedSound();
                        } else if (!radio.canActivate(ship)) {
                            // System exists but can't activate
                            if (!radio.isOperational()) {
                                this.showHUDError(
                                    'SUBSPACE RADIO DAMAGED',
                                    'Repair system to enable communications'
                                );
                            } else if (!ship.hasSystemCardsSync('subspace_radio')) {
                                this.showHUDError(
                                    'SUBSPACE RADIO MISSING',
                                    'Install subspace radio card to enable communications'
                                );
                            } else if (!ship.hasEnergy(15)) {
                                this.showHUDError(
                                    'INSUFFICIENT ENERGY',
                                    'Need 15 energy units to activate radio'
                                );
                            } else {
                                this.showHUDError(
                                    'SUBSPACE RADIO ERROR',
                                    'System cannot be activated'
                                );
                            }
                            this.playCommandFailedSound();
                        }
                        // If system exists and can activate, let the SubspaceRadio UI handle it
                    }
                }
                */
            }

            // Sub-targeting key bindings (< and > keys)
            if (event.key === '<' || event.key === ',') {
                // Previous sub-target
                this.handleSubTargetingKey('previous');
            } else if (event.key === '>' || event.key === '.') {
                // Next sub-target
                this.handleSubTargetingKey('next');
            }

            // Weapon key bindings
            if (event.key === 'z' || event.key === 'Z') {
                // Previous weapon selection
                if (!this.isDocked) {
                    const ship = this.viewManager?.getShip();
                    if (ship && ship.weaponSystem) {
                        if (ship.weaponSystem.selectPreviousWeapon()) {
                            this.playCommandSound();
                        }
                    }
                }
            } else if (event.key === 'x' || event.key === 'X') {
                // Next weapon selection
                if (!this.isDocked) {
                    const ship = this.viewManager?.getShip();
                    if (ship && ship.weaponSystem) {
                        if (ship.weaponSystem.selectNextWeapon()) {
                            this.playCommandSound();
                        }
                    }
                }
            } else if (event.key === ' ') {
                // Fire active weapon
                if (!this.isDocked) {
                    const ship = this.viewManager?.getShip();
                    if (ship && ship.weaponSystem) {
                        if (ship.weaponSystem.fireActiveWeapon()) {
                            // Weapon fired successfully - no command sound needed, weapon plays its own audio
                            // this.playCommandSound(); // REMOVED - weapons play their own sounds
                        } else {
                            this.playCommandFailedSound();
                        }
                    }
                }
            } else if (event.key === 'c' || event.key === 'C') {
                // Toggle autofire
                if (!this.isDocked) {
                    const ship = this.viewManager?.getShip();
                    if (ship && ship.weaponSystem) {
                        const autofireSuccess = ship.weaponSystem.toggleAutofire();
                        if (autofireSuccess) {
                            this.playCommandSound();
                        } else {
                            this.playCommandFailedSound();
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

            // Spawn target dummy ships (Q key) for weapons testing
            if (commandKey === 'q') {
                if (!this.isDocked) {
                    this.playCommandSound();
                    console.log('🎯 Spawning target dummy ships: 1 at 60km, 2 within 25km...');
                    this.createTargetDummyShips(3);
                    
                    // Clear targeting cache to prevent stale crosshair results after spawning targets
                    if (window.targetingService) {
                        window.targetingService.clearCache();
                    }
                } else {
                    this.playCommandFailedSound();
                    this.showHUDError(
                        'TARGET SPAWNING UNAVAILABLE',
                        'Cannot spawn targets while docked'
                    );
                }
            }

            // Toggle 3D target outlines (O key)
            if (commandKey === 'o') {
                if (!this.isDocked) {
                    this.playCommandSound();
                    this.toggleTargetOutline();
                } else {
                    this.playCommandFailedSound();
                    this.showHUDError(
                        'OUTLINE TOGGLE UNAVAILABLE',
                        'Outline controls disabled while docked'
                    );
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
        // Delegate to target computer manager
        this.targetComputerManager.toggleTargetComputer();
        
        // Update local state to match
        this.targetComputerEnabled = this.targetComputerManager.targetComputerEnabled;
        this.currentTarget = this.targetComputerManager.currentTarget;
        this.targetIndex = this.targetComputerManager.targetIndex;
        this.targetObjects = this.targetComputerManager.targetObjects;
        
        // Handle intel visibility
        if (!this.targetComputerEnabled) {
            if (this.intelVisible) {
                this.intelVisible = false;
                this.intelHUD.style.display = 'none';
            }
            this.updateIntelIconDisplay();
        }
    }

    toggleDamageControl() {
        this.damageControlVisible = !this.damageControlVisible;
        
        if (this.damageControlVisible) {
            // Store the previous view before switching to damage control
            this.previousView = this.view;
            this.view = 'DAMAGE';
            this.isDamageControlOpen = true; // Set the state flag
            
            // CRITICAL: Force refresh ship systems before showing damage control
            const ship = this.viewManager?.getShip();
            if (ship && ship.cardSystemIntegration) {
                console.log('🔧 Refreshing ship systems before showing damage control...');
                // Force reload cards and refresh systems
                ship.cardSystemIntegration.loadCards().then(() => {
                    ship.cardSystemIntegration.createSystemsFromCards().then(() => {
                        // Show the damage control HUD after systems are refreshed
                        this.damageControlHUD.show();
                        console.log('🔧 Damage control HUD shown with refreshed systems');
                    });
                });
            } else {
                // Fallback: show immediately if no card system integration
                this.damageControlHUD.show();
            }
            
            this.updateSpeedIndicator(); // Update the view indicator
        } else {
            // Restore the previous view when closing damage control
            this.view = this.previousView || 'FORE';
            this.isDamageControlOpen = false; // Clear the state flag
            
            // Clean up all debug hit spheres when damage control is turned off
            WeaponSlot.cleanupAllDebugSpheres(this);
            
            // Hide the damage control HUD
            this.damageControlHUD.hide();
            
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
        console.log(`🎯 StarfieldManager.updateTargetList() called`);
        const targetBeforeUpdate = this.targetComputerManager.currentTarget;
        const indexBeforeUpdate = this.targetComputerManager.targetIndex;
        
        // Delegate to target computer manager
        this.targetComputerManager.updateTargetList();
        
        const targetAfterUpdate = this.targetComputerManager.currentTarget;
        const indexAfterUpdate = this.targetComputerManager.targetIndex;
        
        if (targetBeforeUpdate !== targetAfterUpdate || indexBeforeUpdate !== indexAfterUpdate) {
            console.log(`🎯 WARNING: Target changed during updateTargetList!`);
            console.log(`🎯   Before: target=${targetBeforeUpdate?.userData?.ship?.shipName || 'unknown'}, index=${indexBeforeUpdate}`);
            console.log(`🎯   After: target=${targetAfterUpdate?.userData?.ship?.shipName || 'unknown'}, index=${indexAfterUpdate}`);
        }
        
        // Update local state to match
        this.targetObjects = this.targetComputerManager.targetObjects;
        
        // Clear targeting cache when target list changes to prevent stale crosshair results
        if (window.targetingService) {
            window.targetingService.clearCache();
        }
    }

    cycleTarget(isManualCycle = true) {
        // Delegate to target computer manager
        this.targetComputerManager.cycleTarget(isManualCycle);
        
        // Update local state to match
        this.currentTarget = this.targetComputerManager.currentTarget;
        this.targetIndex = this.targetComputerManager.targetIndex;
        this.targetObjects = this.targetComputerManager.targetObjects;
        
        // Handle outline suppression logic
        if (this.currentTarget && this.outlineEnabled && (isManualCycle || !this.outlineDisabledUntilManualCycle)) {
            this.updateTargetOutline(this.currentTarget, 0);
        }
        
        if (isManualCycle) {
            this.outlineDisabledUntilManualCycle = false;
            console.log('🎯 Manual target cycle - outline suppression cleared');
        } else {
            console.log('🔄 Automatic target cycle - outline suppression maintained');
        }

        // Update weapon system target
        const ship = this.viewManager?.getShip();
        if (ship && ship.weaponSystem) {
            ship.weaponSystem.setLockedTarget(this.currentTarget);
        }
    }

    setSolarSystemManager(manager) {
        this.solarSystemManager = manager;
        // Update target computer manager with new solar system manager
        if (this.targetComputerManager) {
            this.targetComputerManager.solarSystemManager = manager;
        }
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
            if (this.audioManager.getEngineState() === 'running') {
                const volume = this.currentSpeed / this.maxSpeed;
                if (volume < 0.01) {
                    this.audioManager.playEngineShutdown();
                } else {
                    this.audioManager.updateEngineVolume(this.currentSpeed, this.maxSpeed);
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
        
        // Only update ship systems display when damage control is open
        // and when systems have actually changed (not every frame)
        if (this.isDamageControlOpen && this.shouldUpdateDamageControl) {
            this.updateShipSystemsDisplay();
            this.shouldUpdateDamageControl = false;
        }
        
        // Update weapon effects manager for visual effects animation
        const weaponEffectsManager = this.ensureWeaponEffectsManager();
        if (weaponEffectsManager) {
            weaponEffectsManager.update(deltaTime);
        }

        // Ensure weapon effects manager is connected to ship
        this.ensureWeaponEffectsConnection();

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
            
            // Calculate speed multiplier with reduced speeds for impulse 1, 2, 3, and 4
            let speedMultiplier = this.currentSpeed * 0.3; // Base multiplier
            
            // Apply speed reductions for lower impulse levels
            if (this.currentSpeed <= 3) {
                // Exponential reduction for impulse 1-3
                const reductionFactor = Math.pow(0.15, 4 - this.currentSpeed); // Changed from 0.3 to 0.15 to reduce impulse 1 speed by 50%
                speedMultiplier *= reductionFactor;
            } else if (this.currentSpeed === 4) {
                // Impulse 4: 25% faster than impulse 3 (reduced from previous speed)
                const impulse3Speed = 3 * 0.3 * 0.15; // 0.135
                const targetSpeed = impulse3Speed * 1.25; // 25% faster = 0.16875
                speedMultiplier = targetSpeed;
            }
            
            // Calculate actual movement based on current speed
            const forwardVector = new this.THREE.Vector3(0, 0, -speedMultiplier * moveDirection);
            forwardVector.applyQuaternion(this.camera.quaternion);
            
            // Apply movement
            this.camera.position.add(forwardVector);
            this.camera.updateMatrixWorld();
            
            // Update ship position for weapon effects
            if (this.ship && this.ship.position) {
                this.ship.position.copy(this.camera.position);
            }
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

        // Update target display whenever target computer is enabled
        if (this.targetComputerEnabled) {
            this.updateTargetDisplay();
            
            // If we have a current target, verify it's still valid and update sub-targets
            if (this.currentTarget) {
                // Verify the current target is still valid
                const targetData = this.getCurrentTargetData();
                if (targetData && targetData.object === this.currentTarget) {
                    // Update sub-targets for targeting computer if it has sub-targeting capability
                    const ship = this.viewManager?.getShip();
                    const targetComputer = ship?.getSystem('target_computer');
                    if (targetComputer && targetComputer.hasSubTargeting()) {
                        // Update sub-targets periodically (this is handled in TargetComputer.update)
                        // but we need to refresh the display when sub-targets change
                        targetComputer.updateSubTargets();
                    }
                } else {
                    // Target mismatch, clear current target
                    this.currentTarget = null;
                    this.targetIndex = -1;
                }
            }
        }
        
        // Update target computer manager (handles wireframe rendering, reticles, etc.)
        if (this.targetComputerEnabled) {
            this.targetComputerManager.update(deltaTime);
        }

        // Update 3D world outline if target computer is enabled and we have a target
        if (this.targetComputerEnabled && this.currentTarget && this.outlineEnabled) {
            // Throttle outline updates to prevent continuous recreation (max 10 FPS for outline updates)
            const now = Date.now();
            if (now - this.lastOutlineUpdate > 100) {
                this.updateTargetOutline(this.currentTarget, deltaTime);
                this.lastOutlineUpdate = now;
            }
        }

        // Update direction arrow after updating target display
        if (this.targetComputerEnabled && this.currentTarget) {
            this.updateDirectionArrow();
        } else {
            // Hide all arrows - delegate to target computer manager
            this.targetComputerManager.hideAllDirectionArrows();
        }
        
        // Update weapon system
        const ship = this.viewManager?.getShip();
        if (ship && ship.weaponSystem) {
            // Ensure WeaponHUD is connected (retry if needed)
            if (this.weaponHUD && !this.weaponHUDConnected) {
                console.log('🔗 Attempting WeaponHUD connection during game loop...');
                this.connectWeaponHUDToSystem();
            }
            
            ship.weaponSystem.updateAutofire(deltaTime);
            
            // Update weapon HUD if available
            if (this.weaponHUD && this.weaponHUDConnected) {
                // Update the weapon slots display with current weapon system state
                this.weaponHUD.updateWeaponSlotsDisplay(ship.weaponSystem.weaponSlots, ship.weaponSystem.activeSlotIndex);
                
                // Ensure the highlighting is correct
                this.weaponHUD.updateActiveWeaponHighlight(ship.weaponSystem.activeSlotIndex);
            }
            
            // Update crosshair display to reflect active weapon range and target status
            if (this.viewManager && typeof this.viewManager.updateCrosshairDisplay === 'function') {
                this.viewManager.updateCrosshairDisplay();
            }
        }

        // Update 3D proximity detector
        if (this.proximityDetector3D) {
            this.proximityDetector3D.update(deltaTime);
        }
        
        // Update enemy AI manager
        if (this.enemyAIManager) {
            this.enemyAIManager.update(deltaTime);
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
                this.targetComputerManager.hideTargetHUD();
                this.targetComputerManager.hideTargetReticle();
                
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
        
        return sector;
    }

    // Debug methods for testing damage and repair functionality
    debugDamageRandomSystems() {
        const ship = this.viewManager?.getShip();
        if (!ship) {
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
        systemsToDamage.forEach(systemName => {
            const system = this.ship.getSystem(systemName);
            if (system && system.takeDamage) {
                const damageAmount = (0.3 + Math.random() * 0.5) * system.maxHealth; // 30-80% damage
                system.takeDamage(damageAmount);
            }
        });

        // Notify damage control HUD to update
        if (this.damageControlHUD) {
            this.damageControlHUD.markForUpdate();
        }

        this.updateShipSystemsDisplay();
    }

    debugDamageHull() {
        const ship = this.viewManager?.getShip();
        if (!ship) {
            return;
        }

        // Damage hull to 30-70%
        const damagePercent = Math.random() * 0.4 + 0.3; // 30-70%
        const newHull = Math.floor(ship.maxHull * (1 - damagePercent));
        ship.currentHull = Math.max(1, newHull); // Ensure at least 1 hull
        
        
        // Update the damage control display if it's currently visible
        if (this.damageControlVisible) {
            this.updateShipSystemsDisplay();
        }
    }

    debugDrainEnergy() {
        const ship = this.viewManager?.getShip();
        if (!ship) {
            return;
        }
        
        const drainAmount = 0.3 + Math.random() * 0.5; // 30-80% energy drain
        const originalEnergy = ship.currentEnergy;
        ship.currentEnergy = Math.max(0, ship.currentEnergy - (ship.maxEnergy * drainAmount));
        
        const actualDrain = originalEnergy - ship.currentEnergy;
        const drainPercentage = (actualDrain / ship.maxEnergy) * 100;
        
        
        // Update the damage control display if it's currently visible
        if (this.damageControlVisible) {
            this.updateShipSystemsDisplay();
        }
    }

    debugRepairAllSystems() {
        const ship = this.viewManager?.getShip();
        if (!ship) {
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
        
        
        // Update the damage control display if it's currently visible
        if (this.damageControlVisible) {
            this.updateShipSystemsDisplay();
        }
    }

    dispose() {
        console.log('⚡ StarfieldManager disposal started...');
        
        // Clean up docking modal
        if (this.dockingModal) {
            this.dockingModal.destroy();
            this.dockingModal = null;
        }
        
        // Clean up damage control HUD
        if (this.damageControlHUD) {
            this.damageControlHUD.dispose();
        }
        if (this.damageControlContainer && this.damageControlContainer.parentNode) {
            this.damageControlContainer.parentNode.removeChild(this.damageControlContainer);
        }

        // Clean up repair system interval
        if (this.repairUpdateInterval) {
            clearInterval(this.repairUpdateInterval);
            this.repairUpdateInterval = null;
        }
        
        // Clean up WeaponHUD retry interval
        if (this.weaponHUDRetryInterval) {
            clearInterval(this.weaponHUDRetryInterval);
            this.weaponHUDRetryInterval = null;
        }

        // Clean up target dummy ships
        this.clearTargetDummyShips();

        // Clean up starfield renderer
        if (this.starfieldRenderer) {
            this.starfieldRenderer.dispose();
        }

        // Clean up wireframe and renderer
        if (this.wireframeRenderer) {
            this.wireframeRenderer.dispose();
        }
        
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
        }

        // Clean up audio manager
        if (this.audioManager) {
            this.audioManager.dispose();
        }
        
        // Remove global references
        if (window.starfieldManager === this) {
            delete window.starfieldManager;
        }
        if (window.starfieldAudioManager === this.audioManager) {
            delete window.starfieldAudioManager;
        }
        
        this.ship = null;

        this.updateShipSystemsDisplay();
    }

    // Star sprite creation delegated to StarfieldRenderer
    createStarSprite() {
        // Delegate to starfield renderer
        return this.starfieldRenderer.createStarSprite();
    }

    /**
     * Create a star-shaped geometry for wireframe display
     * @param {number} radius - The radius of the star
     * @returns {THREE.BufferGeometry} - The star geometry
     */
    createStarGeometry(radius) {
        // Delegate to starfield renderer
        return this.starfieldRenderer.createStarGeometry(radius);
    }

    /**
     * Create visual indicators for sub-targeting on the wireframe
     * @param {number} radius - The radius of the target object
     * @param {number} baseColor - The base color of the wireframe
     */
    createSubTargetIndicators(radius, baseColor) {
        // Delegate to target computer manager
        this.targetComputerManager.createSubTargetIndicators(radius, baseColor);
    }

    /**
     * Update sub-target visual indicators based on current selection
     */
    updateSubTargetIndicators() {
        // Delegate to target computer manager
        this.targetComputerManager.updateSubTargetIndicators();
    }

    // Update the setView method to handle view changes
    setView(viewType) {
        // Hide damage control UI when switching to any other view
        if (this.damageControlVisible && viewType !== 'DAMAGE') {
            this.damageControlVisible = false;
            if (this.shipSystemsHUD) {
                this.shipSystemsHUD.style.display = 'none';
            }
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
        // Delegate to starfield renderer
        this.starfieldRenderer.resetStar(star);
    }

    /**
     * Clear target computer state completely - removes all target data and UI elements
     */
    clearTargetComputer() {
        // Reset ALL target state variables
        this.currentTarget = null;
        this.previousTarget = null;
        this.targetedObject = null;
        this.lastTargetedObjectId = null;
        this.targetIndex = -1;
        this.targetObjects = [];
        this.validTargets = [];
        this.lastTargetCycleTime = 0;
        
        // Clear target computer system state if available
        const ship = this.viewManager?.getShip();
        const targetComputerSystem = ship?.getSystem('target_computer');
        if (targetComputerSystem) {
            targetComputerSystem.clearTarget();
            targetComputerSystem.deactivate();
        }
        
        // Hide intel when target computer is cleared
        if (this.intelVisible) {
            this.intelVisible = false;
            this.intelHUD.style.display = 'none';
        }
        this.updateIntelIconDisplay();
        
        // Hide HUD elements
        this.targetComputerManager.hideTargetHUD();
        this.targetComputerManager.hideTargetReticle();
        
        // Clear wireframe
        this.targetComputerManager.clearTargetWireframe();
        
        // Clear 3D outline
        this.clearTargetOutline();
        
        // Clear any targeting displays
        if (this.updateTargetingDisplay) {
            this.updateTargetingDisplay();
        }
        
        // Disable target computer
        this.targetComputerEnabled = false;
        
        console.log('🎯 Target computer completely cleared - all state reset');
    }

    playEngineStartup(targetVolume) {
        // Delegate to audio manager
        this.audioManager.playEngineStartup();
    }

    playEngineShutdown() {
        // Delegate to audio manager
        this.audioManager.playEngineShutdown();
    }

    playCommandSound() {
        // Delegate to audio manager
        if (this.audioManager) {
            this.audioManager.playCommandSound();
        } else {
            // Fallback if audio manager is not available
            this.generateCommandSuccessBeep();
        }
    }

    generateCommandSuccessBeep() {
        try {
            // Ensure AudioContext is running
            this.ensureAudioContextRunning();
            
            if (!this.listener || !this.listener.context) {
                console.warn('No audio context available for command success beep');
                return;
            }
            
            const audioContext = this.listener.context;
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // Connect oscillator to gain to destination
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Configure the beep - higher frequency for success
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // High frequency
            oscillator.type = 'sine'; // Smooth sine wave for pleasant sound
            
            // Configure volume envelope - quick attack, moderate decay
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01); // Quick attack
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15); // Moderate decay
            
            // Play the beep for 0.15 seconds
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
            
            
        } catch (error) {
            console.error('Failed to generate command success beep:', error);
        }
    }

    playCommandFailedSound() {
        // Delegate to audio manager
        this.audioManager.playCommandFailedSound();
    }

    generateCommandFailedBeep() {
        try {
            // Ensure AudioContext is running
            this.ensureAudioContextRunning();
            
            if (!this.listener || !this.listener.context) {
                console.warn('No audio context available for command failed beep');
                return;
            }
            
            const audioContext = this.listener.context;
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // Connect oscillator to gain to destination
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Configure the beep - lower frequency than success sound
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime); // Low frequency
            oscillator.type = 'square'; // Harsh square wave for error sound
            
            // Configure volume envelope - quick attack, quick decay
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01); // Quick attack
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2); // Quick decay
            
            // Play the beep for 0.2 seconds
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            
            
        } catch (error) {
            console.error('Failed to generate command failed beep:', error);
        }
    }

    // Function to recreate the starfield with new density
    recreateStarfield() {
        // Update starfield renderer's star count and recreate
        this.starfieldRenderer.setStarCount(this.starCount);
        this.starfield = this.starfieldRenderer.getStarfield();
    }

    toggleIntel() {
        this.intelVisible = !this.intelVisible;
        
        // Hide/show target panels when intel is toggled
        if (this.targetComputerManager && this.targetComputerManager.targetHUD) {
            if (this.intelVisible) {
                // Hide target panels when intel is visible
                this.targetComputerManager.targetHUD.style.visibility = 'hidden';
            } else {
                // Show target panels when intel is hidden
                this.targetComputerManager.targetHUD.style.visibility = 'visible';
            }
        }
        
        // Update intel display and icon visibility
        this.updateIntelDisplay();
        this.updateIntelIconDisplay();
    }

    /**
     * Toggle proximity detector display
     */
    toggleProximityDetector() {
        if (this.proximityDetector3D) {
            this.proximityDetector3D.toggle();
            console.log('🎯 StarfieldManager: 3D Proximity Detector toggled');
        }
    }

    updateIntelDisplay() {
        if (!this.intelVisible || !this.currentTarget || !this.intelAvailable) {
            this.intelHUD.style.display = 'none';
            // Show target panels when intel is hidden
            if (this.targetComputerManager && this.targetComputerManager.targetHUD) {
                this.targetComputerManager.targetHUD.style.visibility = 'visible';
            }
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
            diplomacyColor = '#ff8888'; // Enemy ships are brighter red for better visibility
        } else if (info?.type === 'star') {
            diplomacyColor = '#ffff00'; // Stars are neutral yellow
        } else if (info?.diplomacy?.toLowerCase() === 'enemy') {
            diplomacyColor = '#ff8888'; // Brighter red for better visibility
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
        
        // Check if ship has required systems for intel
        const ship = this.viewManager?.getShip();
        if (!ship) {
            return;
        }
        
        // Intel requires a level 3+ target computer with intel capabilities
        const targetComputer = ship.getSystem('target_computer');
        if (!targetComputer || !targetComputer.hasIntelCapabilities()) {
            return;
        }
        
        // Check if long range scanner is operational and get its scan range
        const longRangeScanner = ship.getSystem('long_range_scanner');
        let effectiveScanRange = this.intelRange; // Default 50km
        
        if (longRangeScanner && longRangeScanner.isOperational()) {
            // Use scanner's current range, but scale it down for intel detection
            // Scanner range is much larger (1000km base), so use a fraction for intel
            const scannerRange = longRangeScanner.getCurrentScanRange();
            effectiveScanRange = Math.max(this.intelRange, scannerRange * 0.02); // 2% of scanner range, minimum 50km
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
                diplomacyColor = '#ff3333'; // Enemy ships are darker neon red
            } else if (info?.type === 'star') {
                diplomacyColor = '#ffff00'; // Stars are neutral yellow
            } else if (info?.diplomacy?.toLowerCase() === 'enemy') {
                diplomacyColor = '#ff3333'; // Darker neon red
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
            // Docking should not cost energy - docks are for refueling!
            // Energy cost removed to allow docking when low on power
            console.log('🚀 Docking procedures initiated - no energy cost');
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
            this.shutdownAllSystems();
            
            // Power down target computer UI (system is already powered down in shutdownAllSystems)
            if (this.targetComputerEnabled) {
                this.targetComputerEnabled = false;
                this.targetComputerManager.hideTargetHUD();
                this.targetComputerManager.hideTargetReticle();
                
                // Clear wireframe through target computer manager
                this.targetComputerManager.clearTargetWireframe();
            }
            
            // Close galactic chart if open
            if (this.viewManager.galacticChart && this.viewManager.galacticChart.isVisible()) {
                this.viewManager.galacticChart.hide(false);
            }
            
            // Close long range scanner if open
            if (this.viewManager.longRangeScanner && this.viewManager.longRangeScanner.isVisible()) {
                this.viewManager.longRangeScanner.hide(false);
            }
            
            // Hide subspace radio UI during docking
            if (this.viewManager.subspaceRadio && this.viewManager.subspaceRadio.isVisible) {
                this.viewManager.subspaceRadio.hide();
            }
            
            // Hide damage control HUD when docking since systems are powered down
            if (this.damageControlVisible) {
                this.damageControlVisible = false;
                this.damageControlHUD.hide();
                // Restore the previous view
                this.view = this.previousView || 'FORE';
                console.log('🚪 Damage Control HUD dismissed during docking');
            }
            
            // Hide weapon HUD when docking since weapon systems are powered down
            if (this.weaponHUD && this.weaponHUD.weaponSlotsDisplay) {
                this.weaponHUD.weaponSlotsDisplay.style.display = 'none';
                this.weaponHUD.autofireIndicator.style.display = 'none';
                this.weaponHUD.targetLockIndicator.style.display = 'none';
                this.weaponHUD.unifiedDisplay.style.display = 'none';
                console.log('🚪 Weapon HUD hidden during docking');
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
            
            // Launch should not cost energy - players should be able to leave even when low on power
            console.log('🚀 Launch procedures initiated - no energy cost');
        }

        // Store the target we're launching from before clearing it
        const launchTarget = this.dockedTo;

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
        
        // NEW: Calculate safe launch distance to avoid nearby dockable objects
        const safeDistance = this.calculateSafeLaunchDistance(launchTarget);
        const targetPos = this.camera.position.clone().add(forward.multiplyScalar(safeDistance));
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
        this.undockCooldown = Date.now() + 10000; // 10 second cooldown
        
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
            
            // Initialize all ship systems for the current ship (whatever ship we're launching in)
            this.initializeShipSystems().catch(error => {
                console.error('Failed to initialize ship systems during launch:', error);
            });
            
            // Restore weapon HUD after systems are initialized
            if (this.weaponHUD && this.weaponHUD.weaponSlotsDisplay) {
                this.weaponHUD.weaponSlotsDisplay.style.display = 'flex';
                this.weaponHUD.autofireIndicator.style.display = 'none'; // Will be shown if autofire is on
                this.weaponHUD.targetLockIndicator.style.display = 'none'; // Will be shown if locked
                this.weaponHUD.unifiedDisplay.style.display = 'none'; // Will be shown when needed
                console.log('🚀 Weapon HUD restored after launch');
                
                // Update weapon HUD with current weapon system state
                const ship = this.viewManager?.getShip();
                if (ship && ship.weaponSystem) {
                    this.weaponHUD.updateWeaponSlotsDisplay(ship.weaponSystem.weaponSlots, ship.weaponSystem.activeSlotIndex);
                }
            }
            
            // Remove flawed subspace radio state restoration - systems will be properly initialized above
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
        }
        return result;
    }

    undockWithDebug() {
        if (!this.isDocked) {
            return;
        }
        this.undock();
    }

    // Add new method to handle dock button clicks (launch is handled by docking interface)
    handleDockButtonClick(isDocked, targetName) {
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
    shutdownAllSystems() {
        console.log('🛑 Shutting down all ship systems for docking');
        
        const ship = this.viewManager?.getShip();
        if (!ship) {
            console.warn('No ship available for system shutdown');
            return;
        }
        
        // Simply power down all systems without saving state
        for (const [systemName, system] of ship.systems) {
            try {
                if (systemName === 'shields' && system.isShieldsUp) {
                    system.deactivateShields();
                    console.log(`  🛡️ Shields deactivated`);
                } else if (systemName === 'long_range_scanner' && system.isScanning) {
                    system.stopScan();
                    console.log(`  📡 Scanner stopped`);
                } else if (systemName === 'target_computer' && system.isTargeting) {
                    system.deactivate();
                    console.log(`  🎯 Targeting computer deactivated`);
                } else if (systemName === 'subspace_radio') {
                    if (system.isRadioActive) {
                        system.deactivateRadio();
                    }
                    if (system.isChartActive) {
                        system.deactivateChart();
                    }
                    console.log(`  📻 Subspace radio deactivated`);
                } else if (systemName === 'impulse_engines') {
                    system.setImpulseSpeed(0);
                    system.setMovingForward(false);
                    console.log(`  🚀 Impulse engines stopped`);
                } else if (system.isActive) {
                    system.deactivate();
                    console.log(`  ⚡ ${systemName} deactivated`);
                }
            } catch (error) {
                console.warn(`Failed to shutdown system ${systemName}:`, error);
            }
        }
        
        console.log('🛑 All ship systems shutdown complete');
    }
    
    /**
     * Restore all ship systems to their pre-docking state when undocking
     */
    async restoreAllSystems() {
        console.log('🔧 Restoring all ship systems after undocking');
        
        // Use this.ship instead of getting from viewManager since it's already set in constructor
        if (!this.ship) {
            console.warn('No ship available for system restoration');
            return;
        }
        
        // Check if ship has equipment property
        if (!this.ship.equipment) {
            console.warn('Ship does not have equipment property - skipping system restoration');
            return;
        }
        
        // Restore power management
        if (this.ship.equipment.powerManagement) {
            this.powerManagementEnabled = true;
            console.log('⚡ Power management restored and enabled');
        }
        
        // Restore navigation computer
        if (this.ship.equipment.navigationComputer) {
            this.navigationComputerEnabled = true;
            console.log('🧭 Navigation computer restored and enabled');
        }
        
        // Target computer should remain INACTIVE after launch - user must manually enable it
        if (this.ship.equipment.targetComputer) {
            this.targetComputerEnabled = false;  // Start inactive
            console.log('🎯 Target computer available but inactive - manual activation required');
            this.updateTargetDisplay();
        }
        
        // Restore defensive systems
        if (this.ship.equipment.defensiveSystems) {
            this.defensiveSystemsEnabled = true;
            console.log('🛡️ Defensive systems restored and enabled');
        }
        
        // Restore ship status display
        if (this.ship.equipment.shipStatusDisplay) {
            this.shipStatusDisplayEnabled = true;
            console.log('📊 Ship status display restored and enabled');
        }
    }

    /**
     * Create target dummy ships for sub-targeting practice
     * @param {number} count - Number of dummy ships to create
     */
    async createTargetDummyShips(count = 3) {
        console.log(`🎯 Creating ${count} target dummy ships...`);
        
        // Store current target information for restoration BEFORE any changes
        const previousTarget = this.targetComputerManager.currentTarget;
        const previousTargetIndex = this.targetComputerManager.targetIndex;
        const previousTargetData = this.targetComputerManager.getCurrentTargetData();
        
        // Store identifying characteristics to find the target after update
        const targetIdentifier = previousTargetData ? {
            name: previousTargetData.name,
            type: previousTargetData.type,
            shipName: previousTargetData.ship?.shipName,
            position: previousTarget?.position ? {
                x: Math.round(previousTarget.position.x * 1000) / 1000,
                y: Math.round(previousTarget.position.y * 1000) / 1000, 
                z: Math.round(previousTarget.position.z * 1000) / 1000
            } : null
        } : null;
        
        // Enable flag to prevent automatic target changes during dummy creation
        this.targetComputerManager.preventTargetChanges = true;
        
        // Force complete wireframe cleanup before any target list changes
        if (this.targetOutline) {
            this.scene.remove(this.targetOutline);
            if (this.targetOutline.geometry) this.targetOutline.geometry.dispose();
            if (this.targetOutline.material) this.targetOutline.material.dispose();
            this.targetOutline = null;
            this.targetOutlineObject = null;
        }
        
        if (this.targetComputerManager.targetWireframe) {
            this.targetComputerManager.wireframeScene.remove(this.targetComputerManager.targetWireframe);
            if (this.targetComputerManager.targetWireframe.geometry) {
                this.targetComputerManager.targetWireframe.geometry.dispose();
            }
            if (this.targetComputerManager.targetWireframe.material) {
                if (Array.isArray(this.targetComputerManager.targetWireframe.material)) {
                    this.targetComputerManager.targetWireframe.material.forEach(material => material.dispose());
                } else {
                    this.targetComputerManager.targetWireframe.material.dispose();
                }
            }
            this.targetComputerManager.targetWireframe = null;
        }
        
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
                
                // Mark as target dummy for classification purposes
                dummyShip.isTargetDummy = true;
                
                // Set all target dummies as enemies for combat training
                dummyShip.diplomacy = 'enemy'; // All target dummies are enemies (red crosshairs)
                
                // Add some random damage to systems for testing
                this.addRandomDamageToShip(dummyShip);
                
                // Create 3D mesh for the dummy ship
                const shipMesh = this.createDummyShipMesh(i);
                
                // Position the ship relative to player
                let angle, distance, height;
                
                // Get player's current heading from camera rotation
                const playerRotation = new THREE.Euler().setFromQuaternion(this.camera.quaternion);
                const playerHeading = playerRotation.y; // Y rotation is heading in THREE.js
                
                if (i === 0) {
                    // First dummy: place in VERY HIGH altitude bucket (>1000m above)
                    angle = playerHeading + (Math.PI * 0.1); // 18° to the right of player heading
                    distance = 80; // 80km away - using game units (1 unit = 1 km)
                    height = 1.2; // 1.2km above player (very_high bucket: y=0.7, threshold=1000m)
                    // console.log(`🎯 Target Dummy 1: VERY HIGH bucket - ${height*1000}m altitude, ${distance}km distance`);
                } else if (i === 1) {
                    // Second dummy: place in VERY LOW altitude bucket (<-1000m below)
                    const relativeAngle = Math.PI * 0.6; // 108° to the left-back
                    angle = playerHeading + relativeAngle;
                    distance = 55; // 55km away - using game units (1 unit = 1 km)
                    height = -1.5; // 1.5km below player (very_low bucket: y=-0.7, threshold=-Infinity)
                    // console.log(`🎯 Target Dummy 2: VERY LOW bucket - ${height*1000}m altitude, ${distance}km distance`);
                } else {
                    // Third dummy: place in SOMEWHAT HIGH altitude bucket (100-500m above)
                    const relativeAngle = -Math.PI * 0.4; // 72° to the left of player heading
                    angle = playerHeading + relativeAngle;
                    distance = 30; // 30km away - using game units (1 unit = 1 km)
                    height = 0.3; // 300m above player (somewhat_high bucket: y=0.25, threshold=100m)
                    // console.log(`🎯 Target Dummy 3: SOMEWHAT HIGH bucket - ${height*1000}m altitude, ${distance}km distance`);
                }
                
                shipMesh.position.set(
                    this.camera.position.x + Math.sin(angle) * distance,
                    this.camera.position.y + height,
                    this.camera.position.z + Math.cos(angle) * distance
                );
                
                // Enhanced debug logging with full 3D coordinates
                const targetPosition = shipMesh.position;
                const playerPosition = this.camera.position;
                const actualDistance = playerPosition.distanceTo(targetPosition);
                const altitudeDifference = targetPosition.y - playerPosition.y;
                
                // DEBUG INFO (DISABLED to reduce console spam)
                // console.log(`🎯 Target Dummy ${i + 1} FULL DEBUG INFO:`);
                // console.log(`   Player Position: (${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)})`);
                // console.log(`   Target Position: (${targetPosition.x.toFixed(1)}, ${targetPosition.y.toFixed(1)}, ${targetPosition.z.toFixed(1)})`);
                // console.log(`   Altitude Difference: ${(altitudeDifference*1000).toFixed(0)}m`);
                // console.log(`   3D Distance: ${(actualDistance/1000).toFixed(1)}km`);
                // console.log(`   Horizontal Distance: ${(distance/1000).toFixed(1)}km`);
                // console.log(`   Expected Radar Bucket: ${i === 0 ? 'very_high (y=0.7)' : i === 1 ? 'very_low (y=-0.7)' : 'somewhat_high (y=0.25)'}`);
                
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
                
                // Add physics body for the ship (static body for target practice)
                if (window.physicsManager && window.physicsManagerReady) {
                    // Calculate actual mesh size: 2.0m base * 1.5 scale = 3.0m
                    const baseMeshSize = 1.0; // REDUCED: 50% smaller target dummies (was 2.0)
                    const meshScale = 1.5; // From createDummyShipMesh()
                    const actualMeshSize = baseMeshSize * meshScale; // 1.5m visual size (was 3.0m)
                    
                    // Use collision size that matches visual mesh (what you see is what you get)
                    const useRealistic = window.useRealisticCollision !== false; // Default to realistic
                    const collisionSize = useRealistic ? actualMeshSize : 4.0; // Match visual or weapon-friendly
                    
                    const physicsBody = window.physicsManager.createShipRigidBody(shipMesh, {
                        mass: 1000, // Dynamic body with mass for better collision detection (was 0)
                        width: collisionSize,  // Match actual visual mesh size (3.0m) for honest hit detection
                        height: collisionSize,
                        depth: collisionSize,
                        entityType: 'enemy_ship',
                        entityId: `target_dummy_${i + 1}`,
                        health: dummyShip.currentHull || 100,
                        damping: 0.99 // High damping to keep ships mostly stationary despite having mass
                    });
                    
                    console.log(`🎯 Target dummy collision: Visual=${actualMeshSize}m, Physics=${collisionSize}m (what you see is what you get, realistic=${useRealistic})`);
                    
                    if (physicsBody) {
                        console.log(`🚀 Physics body created for Target Dummy ${i + 1}`);
                        // Store physics body reference in mesh userData
                        shipMesh.userData.physicsBody = physicsBody;
                    } else {
                        console.warn(`❌ Failed to create physics body for Target Dummy ${i + 1}`);
                    }
                } else {
                    console.warn('⚠️ PhysicsManager not ready - skipping physics body creation for ships');
                }
                
                // Additional debug log with intended vs calculated distance
                const calculatedDistance = playerPosition.distanceTo(shipMesh.position);
                // Position debug info (DISABLED to reduce console spam)
                // console.log(`🎯 Target ${i + 1} positioned at ${(calculatedDistance / 1000).toFixed(1)}km (world coords: ${shipMesh.position.x.toFixed(1)}, ${shipMesh.position.y.toFixed(1)}, ${shipMesh.position.z.toFixed(1)})`);
                // console.log(`🎯   Player position: (${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)})`);
                // console.log(`🎯   Intended distance: ${(distance/1000).toFixed(1)}km, angle: ${(angle * 180 / Math.PI).toFixed(1)}°, height: ${(height*1000).toFixed(0)}m`);
                // console.log(`🎯   Calculated distance: ${(calculatedDistance/1000).toFixed(1)}km`);
                
                // CRITICAL: Update physics body position to match mesh position
                if (window.physicsManager && window.physicsManager.initialized) {
                    try {
                        // Try transform update first
                        window.physicsManager.updateRigidBodyPosition(shipMesh);
                        console.log(`🔄 Synced physics body position for Target Dummy ${i + 1}`);
                    } catch (error) {
                        console.warn(`Transform update failed for Target Dummy ${i + 1}, trying recreation:`, error);
                        // Fallback: recreate physics body at new position  
                        window.physicsManager.recreateRigidBodyAtPosition(shipMesh);
                        console.log(`🔄 Recreated physics body for Target Dummy ${i + 1}`);
                    }
                }
                
            } catch (error) {
                console.error(`Failed to create target dummy ${i + 1}:`, error);
            }
        }
        
        // Update target list to include dummy ships
        this.updateTargetList();
        
        // Try to restore previous target using the identifier or fallback methods
        let foundIndex = -1;
        let foundTarget = null;
        
        if (targetIdentifier) {
            // Find target by identifying characteristics
            for (let i = 0; i < this.targetComputerManager.targetObjects.length; i++) {
                const targetData = this.targetComputerManager.targetObjects[i];
                const target = targetData.object;
                
                // Match by name first (most reliable)
                if (targetData.name === targetIdentifier.name) {
                    // For ships, also check ship name if available
                    if (targetIdentifier.shipName && targetData.ship?.shipName) {
                        if (targetData.ship.shipName === targetIdentifier.shipName) {
                            foundIndex = i;
                            foundTarget = target;
                            break;
                        }
                    } else {
                        // For celestial bodies or when ship name not available, use position check
                        if (targetIdentifier.position && target?.position) {
                            const posMatch = (
                                Math.abs(target.position.x - targetIdentifier.position.x) < 0.01 &&
                                Math.abs(target.position.y - targetIdentifier.position.y) < 0.01 &&
                                Math.abs(target.position.z - targetIdentifier.position.z) < 0.01
                            );
                            if (posMatch) {
                                foundIndex = i;
                                foundTarget = target;
                                break;
                            }
                        } else {
                            // Fallback to name match only
                            foundIndex = i;
                            foundTarget = target;
                            break;
                        }
                    }
                }
            }
        }
        
        if (foundIndex >= 0 && foundTarget) {
            this.targetComputerManager.targetIndex = foundIndex;
            this.targetComputerManager.currentTarget = foundTarget;
            
            // Recreate wireframes for the restored target
            this.targetComputerManager.createTargetWireframe();
            this.targetComputerManager.updateTargetDisplay();
            
            // Force StarfieldManager outline recreation  
            const currentTargetData = this.targetComputerManager.getCurrentTargetData();
            if (currentTargetData) {
                this.createTargetOutline(foundTarget, '#00ff41', currentTargetData);
            }
        }
        
        // Clear the flag to allow normal target changes again
        this.targetComputerManager.preventTargetChanges = false;
        
        console.log(`✅ Target dummy ships created successfully - target preserved`);
    }

    /**
     * Create a visual mesh for a target dummy ship - simple wireframe cube
     * 
     * Visual Size: 1.0m base geometry × 1.5 scale = 1.5m × 1.5m × 1.5m final size
     * Physics Collision: 1.5m (matches visual mesh exactly - what you see is what you get)
     * 
     * @param {number} index - Ship index for color variation
     * @returns {THREE.Mesh} Simple wireframe cube mesh (1.5m actual size)
     */
    createDummyShipMesh(index) {
        // Create simple cube geometry - 50% smaller than before
        const cubeGeometry = new this.THREE.BoxGeometry(1.0, 1.0, 1.0);
        
        // Use bright, vibrant colors that stand out in space
        const cubeColors = [
            0x9932cc, // Bright purple (was red)
            0x00ff00, // Bright green
            0x0080ff, // Bright blue
            0xffff00, // Bright yellow
            0xff00ff, // Bright magenta
            0x00ffff, // Bright cyan
            0xff8000, // Bright orange
            0x8000ff, // Bright purple
        ];
        
        const cubeColor = cubeColors[index % cubeColors.length];
        
        const cubeMaterial = new this.THREE.MeshBasicMaterial({ 
            color: cubeColor,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });
        
        const cube = new this.THREE.Mesh(cubeGeometry, cubeMaterial);
        
        // Add slight random rotation for variation
        cube.rotation.y = (index * 0.7) + (Math.random() * 0.4 - 0.2);
        cube.rotation.x = (Math.random() * 0.2 - 0.1);
        cube.rotation.z = (Math.random() * 0.2 - 0.1);
        
        // Scale the cube to match collision box size: 2.0m base * 1.5 scale = 3.0m final size
        cube.scale.setScalar(1.5);
        
        return cube;
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
            
            // Remove physics body if it exists
            if (mesh.userData?.physicsBody && window.physicsManager) {
                window.physicsManager.removeRigidBody(mesh);
                console.log('🧹 Physics body removed for target dummy ship');
            }
            
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
        
    }

    /**
     * Get target dummy ship by mesh
     * @param {THREE.Object3D} mesh - Ship mesh
     * @returns {Ship|null} Ship instance or null
     */
    getTargetDummyShip(mesh) {
        return mesh.userData?.ship || null;
    }

    /**
     * Show a temporary error message in the HUD
     * @param {string} title - Error title
     * @param {string} message - Error message
     * @param {number} duration - Duration in milliseconds (default 3000)
     */
    showHUDError(title, message, duration = 3000) {
        // Create error message element if it doesn't exist
        if (!this.hudErrorElement) {
            this.hudErrorElement = document.createElement('div');
            this.hudErrorElement.style.cssText = `
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, rgba(40, 40, 40, 0.95), rgba(20, 20, 20, 0.95));
                color: #ffffff;
                padding: 16px 24px;
                border: 2px solid #ff6600;
                border-radius: 12px;
                font-family: "Courier New", monospace;
                font-size: 14px;
                font-weight: bold;
                text-align: center;
                z-index: 10000;
                box-shadow: 0 4px 20px rgba(255, 102, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(8px);
                min-width: 300px;
                max-width: 500px;
                display: none;
                animation: slideInFromTop 0.3s ease-out;
            `;
            
            // Add animation keyframes
            if (!document.getElementById('hud-error-animations')) {
                const style = document.createElement('style');
                style.id = 'hud-error-animations';
                style.textContent = `
                    @keyframes slideInFromTop {
                        0% {
                            opacity: 0;
                            transform: translateX(-50%) translateY(-20px);
                        }
                        100% {
                            opacity: 1;
                            transform: translateX(-50%) translateY(0);
                        }
                    }
                    
                    @keyframes slideOutToTop {
                        0% {
                            opacity: 1;
                            transform: translateX(-50%) translateY(0);
                        }
                        100% {
                            opacity: 0;
                            transform: translateX(-50%) translateY(-20px);
                        }
                    }
                `;
                document.head.appendChild(style);
            }
            
            document.body.appendChild(this.hudErrorElement);
        }
        
        // Set error content with improved styling
        this.hudErrorElement.innerHTML = `
            <div style="
                font-size: 16px; 
                margin-bottom: 8px; 
                color: #ffaa00;
                text-shadow: 0 0 4px rgba(255, 170, 0, 0.5);
                letter-spacing: 1px;
            ">⚠ ${title}</div>
            <div style="
                color: #e0e0e0;
                font-size: 13px;
                line-height: 1.4;
                text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            ">${message}</div>
        `;
        
        // Show the error with animation
        this.hudErrorElement.style.display = 'block';
        this.hudErrorElement.style.animation = 'slideInFromTop 0.3s ease-out';
        
        // Hide after duration with animation
        setTimeout(() => {
            if (this.hudErrorElement) {
                this.hudErrorElement.style.animation = 'slideOutToTop 0.3s ease-in';
                setTimeout(() => {
                    if (this.hudErrorElement) {
                        this.hudErrorElement.style.display = 'none';
                    }
                }, 300);
            }
        }, duration);
        
        // Play error sound
        this.playCommandFailedSound();
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
            this.targetComputerManager.hideTargetHUD();
            this.targetComputerManager.hideTargetReticle();
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
            this.targetComputerManager.hideTargetHUD();
            return;
        }

        // Keep target HUD visible as long as targeting is enabled
        this.targetComputerManager.showTargetHUD();

        // Handle case where there's no current target
        if (!this.currentTarget) {
            this.targetComputerManager.hideTargetReticle();
            // Clear any existing action buttons to prevent stale dock buttons
            this.targetComputerManager.clearActionButtons();
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
            this.targetComputerManager.hideTargetReticle();
            // Clear any existing action buttons to prevent stale dock buttons
            this.targetComputerManager.clearActionButtons();
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
            diplomacyColor = '#ff3333'; // Enemy ships are darker neon red
        } else if (info?.type === 'star') {
            diplomacyColor = '#ffff00'; // Stars are neutral yellow
        } else if (info?.diplomacy?.toLowerCase() === 'enemy') {
            diplomacyColor = '#ff3333'; // Darker neon red
        } else if (info?.diplomacy?.toLowerCase() === 'neutral') {
            diplomacyColor = '#ffff00';
        } else if (info?.diplomacy?.toLowerCase() === 'friendly') {
            diplomacyColor = '#00ff41';
        }
        this.targetComputerManager.setTargetHUDBorderColor(diplomacyColor);
        
        // Update wireframe container border color to match
        if (this.wireframeContainer) {
            this.wireframeContainer.style.borderColor = diplomacyColor;
        }

        // Get sub-target information from targeting computer
        const ship = this.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');
        let subTargetHTML = '';
        
        // Enhanced sub-targeting display with weapon and level compatibility
        // Only update sub-targets if we're not preventing target changes (like during dummy creation)
        if (!this.targetComputerManager?.preventTargetChanges) {
            const subTargetAvailability = this.getSubTargetAvailability(ship, targetComputer, isEnemyShip, currentTargetData);
            subTargetHTML = subTargetAvailability.html;
        }

        // Update target information display with colored background and black text
        let typeDisplay = info?.type || 'Unknown';
        if (isEnemyShip) {
            // Remove redundant "(Enemy Ship)" text since faction colors already indicate hostility
            typeDisplay = info.shipType;
        }
        
        // Format distance with proper commas
        const formattedDistance = this.formatDistance(distance);
        
        // Prepare hull health display for enemy ships - integrate into main target info
        let hullHealthSection = '';
        if (isEnemyShip && currentTargetData.ship) {
            const currentHull = currentTargetData.ship.currentHull || 0;
            const maxHull = currentTargetData.ship.maxHull || 1;
            const hullPercentage = maxHull > 0 ? (currentHull / maxHull) * 100 : 0;
            
            // More accurate hull percentage display - don't round to 0% unless actually 0
            let displayPercentage;
            if (hullPercentage === 0) {
                displayPercentage = 0;
            } else if (hullPercentage < 1) {
                displayPercentage = Math.ceil(hullPercentage); // Always show at least 1% if hull > 0
            } else {
                displayPercentage = Math.round(hullPercentage);
            }
            
            hullHealthSection = `
                <div style="margin-top: 8px; padding: 4px 0;">
                    <div style="color: white; font-weight: bold; font-size: 11px; margin-bottom: 2px;">HULL: ${displayPercentage}%</div>
                    <div style="background-color: #333; border: 1px solid #666; height: 8px; border-radius: 2px; overflow: hidden;">
                        <div style="background-color: white; height: 100%; width: ${hullPercentage}%; transition: width 0.3s ease;"></div>
                    </div>
                </div>`;
        }
        
        // Determine text and background colors based on target type
        let textColor, backgroundColor;
        if (isEnemyShip) {
            // White text on solid red background for hostile enemies
            textColor = 'white';
            backgroundColor = '#ff0000'; // Bright red background for hostile enemies
        } else {
            // Keep existing styling for non-hostile targets (black text on colored background)
            textColor = 'black';
            backgroundColor = diplomacyColor;
        }
        
        this.targetComputerManager.updateTargetInfoDisplay(`
            <div style="background-color: ${backgroundColor}; color: ${textColor}; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
                <div style="font-weight: bold; font-size: 12px;">${info?.name || 'Unknown Target'}</div>
                <div style="font-size: 10px;">${typeDisplay}</div>
                <div style="font-size: 10px;">${formattedDistance}</div>
                ${hullHealthSection}
            </div>
            ${subTargetHTML}
        `);

        // Update status icons with diplomacy color
        this.updateStatusIcons(distance, diplomacyColor, isEnemyShip, info);

        // Update action buttons based on target type  
        this.updateActionButtons(currentTargetData, info);

        // Display the reticle if we have a valid target
        this.targetComputerManager.showTargetReticle();
        this.updateReticlePosition();
    }

    updateReticlePosition() {
        if (!this.currentTarget || !this.targetComputerEnabled) {
            this.targetComputerManager.hideTargetReticle();
            if (this.targetNameDisplay) {
                this.targetNameDisplay.style.display = 'none';
            }
            if (this.targetDistanceDisplay) {
                this.targetDistanceDisplay.style.display = 'none';
            }
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
            
            if (isBehindCamera) {
                this.targetComputerManager.hideTargetReticle();
                if (this.targetNameDisplay) {
                    this.targetNameDisplay.style.display = 'none';
                }
                if (this.targetDistanceDisplay) {
                    this.targetDistanceDisplay.style.display = 'none';
                }
            } else {
                // RESTORED: Direct reticle positioning like original backup version
                this.targetComputerManager.showTargetReticle();
                const targetReticle = this.targetComputerManager.targetReticle;
                if (targetReticle) {
                    targetReticle.style.left = `${x}px`;
                    targetReticle.style.top = `${y}px`;
                }
                
                // Update target information displays if reticle is visible
                this.updateReticleTargetInfo();
            }
        } else {
            this.targetComputerManager.hideTargetReticle();
            if (this.targetNameDisplay) {
                this.targetNameDisplay.style.display = 'none';
            }
            if (this.targetDistanceDisplay) {
                this.targetDistanceDisplay.style.display = 'none';
            }
        }
    }

    updateReticleTargetInfo() {
        if (!this.currentTarget || !this.targetNameDisplay || !this.targetDistanceDisplay) {
            return;
        }

        // Get current target data
        const currentTargetData = this.getCurrentTargetData();
        if (!currentTargetData) {
            return;
        }

        // Calculate distance to target
        const distance = this.calculateDistance(this.camera.position, this.currentTarget.position);
        
        // Get target info for diplomacy status and display
        let info = null;
        let isEnemyShip = false;
        let targetName = 'Unknown Target';
        
        // Check if this is an enemy ship
        if (currentTargetData.isShip && currentTargetData.ship) {
            isEnemyShip = true;
            info = {
                type: 'enemy_ship',
                diplomacy: currentTargetData.ship.diplomacy || 'enemy',
                name: currentTargetData.ship.shipName,
                shipType: currentTargetData.ship.shipType
            };
            targetName = info.name || 'Enemy Ship';
        } else {
            // Get celestial body info
            info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
            targetName = info?.name || 'Unknown Target';
        }
        
        // Determine reticle color based on diplomacy using faction color rules
        let reticleColor = '#D0D0D0'; // Default gray
        if (isEnemyShip) {
            reticleColor = '#ff0000'; // Enemy ships are bright red
        } else if (info?.type === 'star') {
            reticleColor = '#ffff00'; // Stars are neutral yellow
        } else if (info?.diplomacy?.toLowerCase() === 'enemy') {
            reticleColor = '#ff0000'; // Enemy territories are bright red
        } else if (info?.diplomacy?.toLowerCase() === 'neutral') {
            reticleColor = '#ffff00'; // Neutral territories are yellow
        } else if (info?.diplomacy?.toLowerCase() === 'friendly') {
            reticleColor = '#00ff41'; // Friendly territories are green
        } else if (info?.diplomacy?.toLowerCase() === 'unknown') {
            reticleColor = '#44ffff'; // Unknown territories are cyan
        }

        // Update reticle corner colors
        const corners = this.targetComputerManager.getTargetReticleCorners();
        for (const corner of corners) {
            corner.style.borderColor = reticleColor;
            corner.style.boxShadow = `0 0 2px ${reticleColor}`;
        }

        // Format distance display
        const formattedDistance = this.formatDistance(distance);

        // Update target name display
        this.targetNameDisplay.textContent = targetName;
        this.targetNameDisplay.style.color = reticleColor;
        this.targetNameDisplay.style.textShadow = `0 0 4px ${reticleColor}`;
        this.targetNameDisplay.style.display = 'block';

        // Update target distance display
        this.targetDistanceDisplay.textContent = formattedDistance;
        this.targetDistanceDisplay.style.color = reticleColor;
        this.targetDistanceDisplay.style.textShadow = `0 0 4px ${reticleColor}`;
        this.targetDistanceDisplay.style.display = 'block';
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
        // Delegate to target computer manager
        this.targetComputerManager.updateDirectionArrow();
    }

    /**
     * Mark that damage control display needs updating
     */
    markDamageControlForUpdate() {
        this.shouldUpdateDamageControl = true;
    }

    /**
     * Ensure WeaponEffectsManager is connected to the ship
     */
    ensureWeaponEffectsConnection() {
        // Only try to connect if we have both WeaponEffectsManager and ship
        if (this.weaponEffectsManager && !this.weaponEffectsManager.fallbackMode) {
            // Get current ship reference (it might have been set after WeaponEffectsManager initialization)
            if (!this.ship) {
                this.ship = this.viewManager?.getShip();
            }
            
            if (this.ship && !this.ship.weaponEffectsManager) {
                this.ship.weaponEffectsManager = this.weaponEffectsManager;
                
                // Initialize ship position if not already set
                if (!this.ship.position) {
                    this.ship.position = new this.THREE.Vector3(0, 0, 0);
                }
                
                console.log('🎆 WeaponEffectsManager connected to ship');
                return true;
            }
        }
        return false;
    }

    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        
        if (this.debugMode) {
            this.playCommandSound();
            console.log('🐛 DEBUG MODE ENABLED - Weapon hit detection spheres will be shown');
            this.showHUDError(
                'DEBUG MODE ENABLED',
                'Weapon hit detection spheres will be visible'
            );
        } else {
            this.playCommandSound();
            console.log('🐛 DEBUG MODE DISABLED - Cleaning up debug spheres');
            this.showHUDError(
                'DEBUG MODE DISABLED',
                'Debug spheres cleared'
            );
            
            // Clean up all existing debug spheres
            WeaponSlot.cleanupAllDebugSpheres(this);
        }
    }

    /**
     * Refresh the current target and its wireframe
     */
    refreshCurrentTarget() {
        if (this.currentTarget && this.targetComputerEnabled) {
            // Update the wireframe display without cycling
            this.updateTargetDisplay();
        }
    }
    
    /**
     * Create a 3D outline around the targeted object in the world
     * @param {Object3D} targetObject - The object to outline
     * @param {string} outlineColor - Hex color for the outline
     */
    createTargetOutline(targetObject, outlineColor = '#00ff41', targetData = null) {
        if (!this.outlineEnabled || !targetObject) return;
        
        // Prevent continuous recreation - check if we already have an outline for this object
        if (this.targetOutline && this.targetOutlineObject === targetObject) {
            return; // Already have outline for this object
        }
        
        // Use provided targetData or fetch it if not provided
        const currentTargetData = targetData || this.getCurrentTargetData();
        if (!currentTargetData || !currentTargetData.name || currentTargetData.name === 'unknown') {
            console.log('🎯 Skipping outline creation - invalid target data:', {
                hasTargetData: !!currentTargetData,
                targetName: currentTargetData?.name,
                targetType: currentTargetData?.type,
                wasProvided: !!targetData
            });
            return;
        }
        
        try {
            // Clear any existing outline
            this.clearTargetOutline();
            
            // Store reference to the object being outlined
            this.targetOutlineObject = targetObject;
            
            console.log(`🎯 Creating 3D outline for target: ${currentTargetData.name}`);
            
            // Create outline material with slightly larger scale
            const outlineMaterial = new this.THREE.MeshBasicMaterial({
                color: new this.THREE.Color(outlineColor),
                transparent: true,
                opacity: 0.4,
                side: this.THREE.BackSide, // Render back faces to create outline effect
                depthWrite: false
            });
            
            // Create outline mesh by cloning the target's geometry
            let outlineGeometry = null;
            
            if (targetObject.geometry) {
                // Direct geometry clone
                outlineGeometry = targetObject.geometry.clone();
            } else if (targetObject.children && targetObject.children.length > 0) {
                // For grouped objects (like ships), create a bounding box outline
                const box = new this.THREE.Box3().setFromObject(targetObject);
                const size = box.getSize(new this.THREE.Vector3());
                const center = box.getCenter(new this.THREE.Vector3());
                
                // Create a box geometry that encompasses the object
                outlineGeometry = new this.THREE.BoxGeometry(size.x * 1.2, size.y * 1.2, size.z * 1.2);
                
                // Adjust position to match the bounding box center
                const offset = center.clone().sub(targetObject.position);
                outlineGeometry.translate(offset.x, offset.y, offset.z);
            } else {
                // Fallback: create a simple sphere outline
                outlineGeometry = new this.THREE.SphereGeometry(2, 16, 12);
            }
            
            if (outlineGeometry) {
                this.targetOutline = new this.THREE.Mesh(outlineGeometry, outlineMaterial);
                
                // Position the outline to match the target
                this.targetOutline.position.copy(targetObject.position);
                this.targetOutline.rotation.copy(targetObject.rotation);
                this.targetOutline.scale.copy(targetObject.scale).multiplyScalar(1.05); // Slightly larger
                
                // Add to scene
                this.scene.add(this.targetOutline);
                
                console.log(`🎯 Created 3D outline for target: ${currentTargetData.name}`);
            }
            
        } catch (error) {
            console.warn('Failed to create target outline:', error);
        }
    }
    
    /**
     * Update the outline position and animation
     * @param {Object3D} targetObject - The current target object
     * @param {number} deltaTime - Time delta for animations
     */
    updateTargetOutline(targetObject, deltaTime) {
        // CRITICAL: Prevent outline creation when no targets exist
        if (!this.targets || this.targets.length === 0) {
            console.log('🚫 updateTargetOutline: No targets available - clearing outline');
            if (this.targetOutline) {
                this.clearTargetOutline();
            }
            return;
        }
        
        // Check if outlines are enabled and not suppressed
        if (!this.outlineEnabled || this.outlineDisabledUntilManualCycle) {
            if (this.targetOutline) {
                this.clearTargetOutline();
            }
            return;
        }
        
        // CRITICAL: Check if we have a valid current target
        if (!this.currentTarget) {
            console.log('🚫 updateTargetOutline: No current target - clearing outline');
            if (this.targetOutline) {
                this.clearTargetOutline();
            }
            return;
        }
        
        // Validate target data before proceeding
        const targetData = this.getCurrentTargetData();
        if (!targetData || !targetData.name || targetData.name === 'unknown') {
            console.log('🚫 updateTargetOutline: Invalid target data - clearing outline');
            // Clear outline for invalid targets
            if (this.targetOutline) {
                this.clearTargetOutline();
            }
            return;
        }
        
        // Additional check: Ensure targetObject is valid and exists in scene
        if (!targetObject || !targetObject.position) {
            console.log('🚫 updateTargetOutline: Invalid target object - clearing outline');
            if (this.targetOutline) {
                this.clearTargetOutline();
            }
            return;
        }
        
        // Check if outline needs to be created or recreated
        if (!this.targetOutline || this.targetOutlineObject !== targetObject) {
            const outlineColor = this.getOutlineColorForTarget(targetData);
            // Pass the validated target data to prevent race condition
            this.createTargetOutline(targetObject, outlineColor, targetData);
        }
        
        // Update outline position and rotation to match target
        if (this.targetOutline && targetObject) {
            this.targetOutline.position.copy(targetObject.position);
            this.targetOutline.rotation.copy(targetObject.rotation);
            
            // Add subtle pulsing animation
            if (deltaTime) {
                const time = Date.now() * 0.002;
                const pulseScale = 1.0 + Math.sin(time) * 0.02;
                this.targetOutline.scale.setScalar(pulseScale);
            }
        }
    }
    
    /**
     * Clear the current 3D outline
     */
    clearTargetOutline() {
        // More thorough clearing with detailed logging
        console.log('🎯 clearTargetOutline called');
        console.log(`   • targetOutline exists: ${!!this.targetOutline}`);
        console.log(`   • targetOutlineObject exists: ${!!this.targetOutlineObject}`);
        
        if (!this.targetOutline && !this.targetOutlineObject) {
            console.log('🎯 No outline objects to clear');
            return;
        }
        
        try {
            // Clear the 3D outline from scene
            if (this.targetOutline) {
                console.log('🗑️ Removing targetOutline from scene');
                this.scene.remove(this.targetOutline);
                
                // Dispose of geometry and material to free memory
                if (this.targetOutline.geometry) {
                    this.targetOutline.geometry.dispose();
                    console.log('🗑️ Disposed targetOutline geometry');
                }
                if (this.targetOutline.material) {
                    this.targetOutline.material.dispose();
                    console.log('🗑️ Disposed targetOutline material');
                }
            }
            
            // Force clear both properties
            this.targetOutline = null;
            this.targetOutlineObject = null;
            
            console.log('✅ Target outline completely cleared');
            
        } catch (error) {
            console.warn('❌ Error clearing target outline:', error);
            // Force clear even if there was an error
            this.targetOutline = null;
            this.targetOutlineObject = null;
            console.log('🔧 Force-cleared outline properties after error');
        }
        
        // Double-check that they're actually cleared
        if (this.targetOutline || this.targetOutlineObject) {
            console.error('⚠️ WARNING: Outline properties still exist after clearing!');
            console.log(`   • targetOutline: ${this.targetOutline}`);
            console.log(`   • targetOutlineObject: ${this.targetOutlineObject}`);
        }
    }
    
    /**
     * Toggle the outline system on/off
     */
    toggleTargetOutline() {
        this.outlineEnabled = !this.outlineEnabled;
        
        // Clear any destruction suppression when manually toggling
        this.outlineDisabledUntilManualCycle = false;
        
        if (!this.outlineEnabled) {
            this.clearTargetOutline();
        } else if (this.currentTarget) {
            // Recreate outline for current target using validated method with target data
            const targetData = this.getCurrentTargetData();
            if (targetData && targetData.name && targetData.name !== 'unknown') {
                this.updateTargetOutline(this.currentTarget, 0);
            }
        }
        
        console.log(`🎯 Target outline ${this.outlineEnabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Get the appropriate outline color based on target type
     * @param {Object} targetData - Target data from getCurrentTargetData()
     * @returns {string} Hex color string
     */
    getOutlineColorForTarget(targetData) {
        if (!targetData) return '#808080'; // Gray for unknown
        
        if (targetData.isShip) {
            return '#ff3333'; // Red for enemy ships
        } else if (targetData.diplomacy?.toLowerCase() === 'friendly') {
            return '#00ff41'; // Green for friendlies
        } else if (targetData.diplomacy?.toLowerCase() === 'neutral') {
            return '#ffff00'; // Yellow for neutrals
        } else {
            return '#00ff41'; // Default green
        }
    }

    /**
     * Handle target destruction and synchronization across all targeting systems
     * @param {Object} destroyedShip - The ship that was destroyed
     */
    removeDestroyedTarget(destroyedShip) {
        if (!destroyedShip) return;
        
        console.log(`💥 removeDestroyedTarget called for: ${destroyedShip.shipName || 'unknown ship'}`);
        
        // First, physically remove the ship from the scene and arrays
        let shipMesh = null;
        
        // Find the mesh for this ship
        for (let i = this.dummyShipMeshes.length - 1; i >= 0; i--) {
            const mesh = this.dummyShipMeshes[i];
            if (mesh.userData.ship === destroyedShip) {
                shipMesh = mesh;
                
                // Remove from the scene
                console.log(`🗑️ Removing ${destroyedShip.shipName} mesh from scene`);
                this.scene.remove(mesh);
                
                // CRITICAL: Remove physics rigid body for destroyed ship
                if (window.physicsManager && typeof window.physicsManager.removeRigidBody === 'function') {
                    console.log(`🗑️ Removing ${destroyedShip.shipName} rigid body from physics world`);
                    window.physicsManager.removeRigidBody(mesh);
                } else {
                    console.warn(`⚠️ Physics manager not available - rigid body for ${destroyedShip.shipName} not removed`);
                }
                
                // Clean up mesh resources
                if (mesh.geometry) {
                    mesh.geometry.dispose();
                }
                if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach(material => material.dispose());
                    } else {
                        mesh.material.dispose();
                    }
                }
                
                // Remove from dummyShipMeshes array
                this.dummyShipMeshes.splice(i, 1);
                console.log(`🗑️ Removed ${destroyedShip.shipName} from dummyShipMeshes array`);
                break;
            }
        }
        
        // Check if ANY targeting system was targeting the destroyed ship
        const ship = this.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');
        
        const hudTargetsDestroyed = this.currentTarget && 
            (this.currentTarget === shipMesh || 
             this.getCurrentTargetData()?.ship === destroyedShip);
        
        const weaponTargetsDestroyed = ship?.weaponSystem?.lockedTarget && 
            (ship.weaponSystem.lockedTarget === shipMesh || 
             ship.weaponSystem.lockedTarget === destroyedShip);
        
        const tcTargetsDestroyed = targetComputer?.currentTarget === destroyedShip;
        
        // IMPROVED: Check if outline is targeting destroyed ship
        const outlineTargetsDestroyed = this.targetOutlineObject && 
            (this.targetOutlineObject === shipMesh || 
             this.targetOutlineObject === destroyedShip ||
             this.targetOutlineObject === this.currentTarget);
        
        const anySystemTargeting = hudTargetsDestroyed || weaponTargetsDestroyed || tcTargetsDestroyed || outlineTargetsDestroyed;
        
        console.log(`🔍 Targeting analysis:`);
        console.log(`   • HUD targets destroyed ship: ${hudTargetsDestroyed}`);
        console.log(`   • Weapon targets destroyed ship: ${weaponTargetsDestroyed}`);
        console.log(`   • Target computer targets destroyed ship: ${tcTargetsDestroyed}`);
        console.log(`   • Outline targets destroyed ship: ${outlineTargetsDestroyed}`);
        console.log(`   • Any system targeting: ${anySystemTargeting}`);
        
        if (anySystemTargeting) {
            console.log('🗑️ Destroyed ship was targeted - performing full synchronization cleanup');
            
            // Clear ALL targeting system references
            this.currentTarget = null;
            this.targetIndex = -1;
            
            if (ship?.weaponSystem) {
                ship.weaponSystem.setLockedTarget(null);
                
                // Turn off autofire when main target is destroyed
                // This doesn't apply to sub-targets, only when the entire ship is destroyed
                if (ship.weaponSystem.isAutofireOn) {
                    ship.weaponSystem.isAutofireOn = false;
                    console.log('🎯 Autofire turned OFF - main target destroyed');
                    
                    // Update UI to reflect autofire is now off
                    if (ship.weaponSystem.weaponHUD) {
                        ship.weaponSystem.weaponHUD.updateAutofireStatus(false);
                    }
                    
                    // Show message to player
                    ship.weaponSystem.showMessage('Autofire disabled - target destroyed', 3000);
                }
            }
            
            if (targetComputer) {
                targetComputer.clearTarget();
                targetComputer.clearSubTarget();
            }
            
            // ALWAYS clear 3D outline when a targeted ship is destroyed
            console.log('🎯 Clearing 3D outline for destroyed target');
            this.clearTargetOutline();
            
            // Update target list to remove destroyed ship
            this.updateTargetList();
            
            // Select new target using proper cycling logic
            if (this.targetObjects && this.targetObjects.length > 0) {
                console.log(`🔄 Cycling to new target from ${this.targetObjects.length} available targets`);
                
                // Prevent outlines from appearing automatically after destruction
                this.outlineDisabledUntilManualCycle = true;
                
                // Cycle to next target without creating outline (automatic cycle)
                this.cycleTarget(false);
                
                console.log('🎯 Target cycled after destruction - outline disabled until next manual cycle');
            } else {
                console.log('📭 No targets remaining after destruction');
                
                // CRITICAL: Force clear outline again when no targets remain
                console.log('🎯 Force-clearing outline - no targets remaining');
                this.clearTargetOutline();
                
                // Clear wireframe and hide UI
                if (this.targetWireframe) {
                    this.wireframeScene.remove(this.targetWireframe);
                    this.targetWireframe.geometry.dispose();
                    this.targetWireframe.material.dispose();
                    this.targetWireframe = null;
                }
                
                if (this.targetComputerManager) {
                    this.targetComputerManager.hideTargetHUD();
                    this.targetComputerManager.hideTargetReticle();
                }
            }
            
        } else {
            console.log('🎯 Destroyed ship was not targeted by any system - minimal cleanup');
            
            // Check if autofire was targeting this ship even if not officially "targeted"
            if (ship?.weaponSystem?.isAutofireOn && ship.weaponSystem.lockedTarget) {
                // Check if the destroyed ship matches the autofire target
                const autofireTargetShip = ship.weaponSystem.lockedTarget.ship;
                if (autofireTargetShip === destroyedShip) {
                    ship.weaponSystem.isAutofireOn = false;
                    ship.weaponSystem.setLockedTarget(null);
                    console.log('🎯 Autofire turned OFF - autofire target destroyed');
                    
                    // Update UI to reflect autofire is now off
                    if (ship.weaponSystem.weaponHUD) {
                        ship.weaponSystem.weaponHUD.updateAutofireStatus(false);
                    }
                    
                    // Show message to player
                    ship.weaponSystem.showMessage('Autofire disabled - target destroyed', 3000);
                }
            }
            
            // ALWAYS clear 3D outline when any ship is destroyed
            // Even if not "targeted", the outline might still be showing it
            console.log('🎯 Force-clearing 3D outline for safety');
            this.clearTargetOutline();
            
            // Still refresh the target list to keep everything in sync
            this.updateTargetList();
            
            // Validate and refresh current target if needed
            if (this.targetObjects && this.targetObjects.length > 0 && this.targetIndex >= 0) {
                if (this.targetIndex >= this.targetObjects.length) {
                    this.targetIndex = 0;
                }
                // Refresh display and outline for current target
                this.updateTargetDisplay();
                if (this.currentTarget && this.outlineEnabled) {
                    // Use validated outline update instead of direct creation
                    this.updateTargetOutline(this.currentTarget, 0);
                }
            } else if (this.targetObjects && this.targetObjects.length === 0) {
                // No targets left, clear everything
                this.currentTarget = null;
                this.targetIndex = -1;
                this.clearTargetOutline();
                
                if (this.targetComputerManager) {
                    this.targetComputerManager.hideTargetHUD();
                    this.targetComputerManager.hideTargetReticle();
                }
            }
        }
        
        console.log(`✅ removeDestroyedTarget complete for: ${destroyedShip.shipName || 'unknown ship'}`);
    }

    adjustColorBrightness(color, factor) {
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return `#${Math.round(r * factor).toString(16).padStart(2, '0')}${Math.round(g * factor).toString(16).padStart(2, '0')}${Math.round(b * factor).toString(16).padStart(2, '0')}`;
    }

    updateStatusIcons(distance, diplomacyColor, isEnemyShip, info) {
        // Delegate status icon updates to target computer manager
        this.targetComputerManager.updateStatusIcons(distance, diplomacyColor, isEnemyShip, info);

        // Update intel icon display (this is still handled by StarfieldManager)
        this.updateIntelIconDisplay();
    }

    updateActionButtons(currentTargetData, info) {
        // Dock button removed - docking is now handled by the DockingModal
        // which shows when conditions are met (distance, speed, etc.)
        
        // Clear existing buttons since we no longer show dock button
        this.targetComputerManager.clearActionButtons();
        
        // Reset button state
        this.currentButtonState = {
            hasDockButton: false,
            isDocked: this.isDocked,
            hasScanButton: false,
            hasTradeButton: false
        };
    }

    setImpulseSpeed(requestedSpeed) {
        // Don't allow speed changes while docked
        if (this.isDocked) {
            return false;
        }
        
        // Update impulse engines with new speed setting (this will clamp the speed)
        const ship = this.viewManager?.getShip();
        let actualSpeed = requestedSpeed; // fallback
        
        if (ship) {
            const impulseEngines = ship.getSystem('impulse_engines');
            if (impulseEngines) {
                // Check if the requested speed exceeds the engine's maximum capability
                const maxSpeed = impulseEngines.getMaxImpulseSpeed();
                
                if (requestedSpeed > maxSpeed) {
                    // Requested speed exceeds engine capability - fail silently for modal
                    return false;
                }
                
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
        
        return true;
    }

    // NEW: Calculate safe launch distance to avoid nearby dockable objects
    calculateSafeLaunchDistance(launchTarget) {
        const minBaseDistance = this.orbitRadius * 2; // Minimum distance (original logic)
        let safeDistance = minBaseDistance;
        
        // Get all celestial bodies and filter for dockable objects (planets and moons)
        const celestialBodies = this.solarSystemManager?.getCelestialBodies();
        if (!celestialBodies) {
            console.log(`🚀 Launch distance calculated: ${safeDistance.toFixed(1)}km (no solar system manager)`);
            return safeDistance;
        }
        
        const dockableObjects = [];
        celestialBodies.forEach((body, bodyId) => {
            // Only consider planets and moons (skip star)
            if (bodyId.startsWith('planet_') || bodyId.startsWith('moon_')) {
                dockableObjects.push(body);
            }
        });
        
        // Check distance to all other dockable objects
        for (const obj of dockableObjects) {
            if (obj === launchTarget) continue; // Skip the object we're launching from
            
            const distanceToObject = this.camera.position.distanceTo(obj.position);
            const objectInfo = this.solarSystemManager.getCelestialBodyInfo(obj);
            
            // Get the docking range for this object
            let objectDockingRange = 1.5; // Default for moons
            if (objectInfo?.type === 'planet') {
                objectDockingRange = 4.0;
            }
            
            // If this object is close to our launch target, ensure we launch far enough
            // to be outside its docking range plus a safety buffer
            const safetyBuffer = 2.0; // 2km additional safety margin
            const requiredDistance = objectDockingRange + safetyBuffer;
            
            // If the object is within a dangerous proximity to our launch point
            if (distanceToObject < requiredDistance * 3) {
                // Calculate how far we need to launch to clear this object's docking range
                const neededDistance = requiredDistance + distanceToObject * 0.5;
                safeDistance = Math.max(safeDistance, neededDistance);
            }
        }
        
        // Ensure we don't launch too far (maximum of 20km)
        safeDistance = Math.min(safeDistance, 20.0);
        
        console.log(`🚀 Launch distance calculated: ${safeDistance.toFixed(1)}km (base: ${minBaseDistance.toFixed(1)}km)`);
        return safeDistance;
    }

    /**
     * Shutdown all ship systems when docking - properly power down without trying to save state
     */
    shutdownAllSystems() {
        console.log('🛑 Shutting down all ship systems for docking');
        
        const ship = this.viewManager?.getShip();
        if (!ship) {
            console.warn('No ship available for system shutdown');
            return;
        }
        
        // Simply power down all systems without saving state
        for (const [systemName, system] of ship.systems) {
            try {
                if (systemName === 'shields' && system.isShieldsUp) {
                    system.deactivateShields();
                    console.log(`  🛡️ Shields deactivated`);
                } else if (systemName === 'long_range_scanner' && system.isScanning) {
                    system.stopScan();
                    console.log(`  📡 Scanner stopped`);
                } else if (systemName === 'target_computer' && system.isTargeting) {
                    system.deactivate();
                    console.log(`  🎯 Targeting computer deactivated`);
                } else if (systemName === 'subspace_radio') {
                    if (system.isRadioActive) {
                        system.deactivateRadio();
                    }
                    if (system.isChartActive) {
                        system.deactivateChart();
                    }
                    console.log(`  📻 Subspace radio deactivated`);
                } else if (systemName === 'impulse_engines') {
                    system.setImpulseSpeed(0);
                    system.setMovingForward(false);
                    console.log(`  🚀 Impulse engines stopped`);
                } else if (system.isActive) {
                    system.deactivate();
                    console.log(`  ⚡ ${systemName} deactivated`);
                }
            } catch (error) {
                console.warn(`Failed to shutdown system ${systemName}:`, error);
            }
        }
        
        console.log('🛑 All ship systems shutdown complete');
    }
    
    /**
     * Initialize all ship systems for launch - fresh setup regardless of previous state
     * This is the unified method that should be used for ALL ship initialization scenarios
     */
    async initializeShipSystems() {
        console.log('🚀 Initializing ship systems for launch');
        
        const ship = this.viewManager?.getShip();
        if (!ship) {
            console.warn('No ship available for system initialization');
            return;
        }

        // CRITICAL: Force refresh ship systems from current card configuration
        // This ensures that any equipment changes made while docked are properly applied
        if (ship.cardSystemIntegration) {
            console.log('🔄 Refreshing ship systems from current card configuration...');
            try {
                // Force reload cards from the current ship configuration
                await ship.cardSystemIntegration.loadCards();
                
                // Recreate all systems from the refreshed card data
                await ship.cardSystemIntegration.createSystemsFromCards();
                
                console.log('✅ Ship systems refreshed from cards - equipment changes applied');
            } catch (error) {
                console.error('❌ Failed to refresh ship systems from cards:', error);
            }
        }
        
        // Initialize power management
        if (ship.equipment?.powerManagement) {
            this.powerManagementEnabled = true;
            console.log('  ⚡ Power management initialized and enabled');
        }
        
        // Initialize navigation computer
        if (ship.equipment?.navigationComputer) {
            this.navigationComputerEnabled = true;
            console.log('  🧭 Navigation computer initialized and enabled');
        }
        
        // CRITICAL: Properly initialize targeting computer with complete state reset
        const targetComputerSystem = ship.getSystem('target_computer');
        const hasTargetComputerCards = ship.hasSystemCardsSync('target_computer');
        
        if (targetComputerSystem && hasTargetComputerCards) {
            // STEP 1: Clear any previous target state completely
            this.currentTarget = null;
            this.targetedObject = null;
            this.lastTargetedObjectId = null;
            
            // STEP 2: Clear targeting display and outlines
            this.clearTargetOutline();
            if (this.updateTargetingDisplay) {
                this.updateTargetingDisplay();
            }
            
            // STEP 3: Reset target cycling state
            this.targetIndex = -1;
            this.validTargets = [];
            this.lastTargetCycleTime = 0;
            
            // STEP 4: Synchronize StarfieldManager state with system state
            // The system starts inactive after launch (requires manual activation)
            this.targetComputerEnabled = targetComputerSystem.isActive;
            
            // STEP 5: If system was somehow left active, ensure it works properly
            if (targetComputerSystem.isActive) {
                // Refresh targeting computer functionality
                if (targetComputerSystem.refreshTargeting) {
                    targetComputerSystem.refreshTargeting();
                }
                console.log('  🎯 Targeting computer initialized (ACTIVE) - state synchronized, targets cleared');
            } else {
                console.log('  🎯 Targeting computer initialized (INACTIVE) - ready for activation');
            }
            
            console.log(`  🎯 Target state cleared: currentTarget=${this.currentTarget}, targetIndex=${this.targetIndex}`);
        } else {
            this.targetComputerEnabled = false;
            // Still clear target state even without targeting computer
            this.currentTarget = null;
            this.targetedObject = null;
            this.clearTargetOutline();
            console.log('  🎯 No targeting computer available - target state cleared');
        }
        
        // Initialize shields
        const shieldSystem = ship.getSystem('shields');
        if (shieldSystem) {
            this.shieldsEnabled = shieldSystem.isActive;
            console.log(`  🛡️ Shields initialized: ${this.shieldsEnabled ? 'enabled' : 'disabled'}`);
        }
        
        // Initialize scanning systems
        const scannerSystem = ship.getSystem('scanners');
        if (scannerSystem) {
            this.scannersEnabled = scannerSystem.isActive;
            console.log(`  📡 Scanners initialized: ${this.scannersEnabled ? 'enabled' : 'disabled'}`);
        }
        
        // Initialize weapon systems using the unified approach
        await this.initializeWeaponSystems();
        
        // Initialize engine systems
        const engineSystem = ship.getSystem('impulse_engines');
        if (engineSystem) {
            this.enginesEnabled = engineSystem.isActive;
            console.log(`  🚀 Engines initialized: ${this.enginesEnabled ? 'enabled' : 'disabled'}`);
        }
        
        // Initialize communication systems
        const radioSystem = ship.getSystem('subspace_radio');
        if (radioSystem) {
            this.radioEnabled = radioSystem.isActive;
            console.log(`  📻 Radio initialized: ${this.radioEnabled ? 'enabled' : 'disabled'}`);
        }
        
        console.log('✅ Ship systems initialization complete - all states synchronized');
    }
    
    /**
     * Initialize weapon systems and ensure proper HUD connection
     * Critical for ensuring weapons are properly registered with the HUD
     */
    async initializeWeaponSystems() {
        console.log('  🔫 Initializing weapon systems and HUD integration...');
        
        try {
            const ship = this.viewManager?.getShip();
            if (!ship) {
                console.log('    🔍 Ship initializing - weapon system setup deferred');
                return;
            }

            // CRITICAL: Reinitialize the weapon system using WeaponSyncManager
            // This ensures weapons are properly loaded from the current card configuration
            if (ship.weaponSyncManager) {
                console.log('    🔄 Reinitializing weapon system from current card configuration...');
                
                // Force a complete weapon system refresh
                ship.weaponSystem = await ship.weaponSyncManager.initializeWeapons();
                
                console.log('    ✅ Weapon system reinitialized with current equipment');
            } else if (ship.initializeWeaponSystem) {
                // Fallback: use ship's built-in weapon system initialization
                await ship.initializeWeaponSystem();
                console.log('    ✅ Weapon system initialized using fallback method');
            }
            
            // Ensure weapon effects manager is initialized
            this.ensureWeaponEffectsManager();
            
            // Connect weapon HUD to ship systems
            this.connectWeaponHUDToSystem();
            
            // Update weapon selection UI to reflect current ship loadout
            await this.updateWeaponSelectionUI();
            
            console.log('  🔫 Weapon systems initialization complete');
        } catch (error) {
            console.error('  ❌ Failed to initialize weapon systems:', error);
        }
    }
    
    /**
     * Update weapon selection UI to reflect current ship loadout
     * Ensures weapon HUD shows correct weapon counts and types
     */
    async updateWeaponSelectionUI() {
        console.log('    🎯 Updating weapon selection UI...');
        
        const ship = this.viewManager?.getShip();
        if (!ship) {
            console.log('    🔍 Ship initializing - weapon UI updates deferred');
            return;
        }
        
        const weaponsSystem = ship.getSystem('weapons');
        if (!weaponsSystem) {
            console.log('    🔍 No weapons system installed - weapon UI updates skipped');
            return;
        }
        
        // Force refresh weapon inventory
        if (typeof weaponsSystem.refreshInventory === 'function') {
            weaponsSystem.refreshInventory();
        }
        
        // Update weapon HUD display properly
        if (this.weaponHUD && ship.weaponSystem) {
            // Update the weapon slots display with current weapon system state
            this.weaponHUD.updateWeaponSlotsDisplay(ship.weaponSystem.weaponSlots, ship.weaponSystem.activeSlotIndex);
            
            // Ensure the highlighting is correct
            this.weaponHUD.updateActiveWeaponHighlight(ship.weaponSystem.activeSlotIndex);
        }
        
        console.log('    🎯 Weapon selection UI updated');
    }

    /**
     * Get the requirements to dock with a target
     * @param {Object} target - Target object to dock with
     * @returns {Array} Array of requirement objects
     */
    getDockingRequirements() {
        return [
            { name: 'Within Docking Range', met: true },
            { name: 'Ship Systems Operational', met: true }
        ];
    }

    /**
     * Callback when weapon system is ready (called by Ship)
     */
    onWeaponSystemReady() {
        console.log('🔫 StarfieldManager: Weapon system ready notification received');
        
        // Try to connect WeaponHUD immediately
        if (this.weaponHUD && !this.weaponHUDConnected) {
            console.log('🔗 Attempting immediate WeaponHUD connection...');
            this.connectWeaponHUDToSystem();
            
            // If connection successful, clear the retry interval
            if (this.weaponHUDConnected && this.weaponHUDRetryInterval) {
                clearInterval(this.weaponHUDRetryInterval);
                this.weaponHUDRetryInterval = null;
                console.log('✅ WeaponHUD connected immediately, retry interval cleared');
            }
        }
    }

    /**
     * Get sub-targeting availability and display information
     * @param {Object} ship Current ship
     * @param {Object} targetComputer Target computer system
     * @param {boolean} isEnemyShip Whether target is an enemy ship
     * @param {Object} currentTargetData Current target data
     * @returns {Object} HTML and availability information
     */
    getSubTargetAvailability(ship, targetComputer, isEnemyShip, currentTargetData) {
        let html = '';
        
        // Check basic requirements
        if (!targetComputer) {
            return { 
                html: '',
                available: false,
                reason: 'No Target Computer'
            };
        }

        // Determine target type and faction color using same logic as main target display
        let diplomacyColor = '#D0D0D0'; // Default gray
        let isCelestialBody = false;
        
        if (isEnemyShip) {
            diplomacyColor = '#ff3333'; // Enemy ships are darker neon red
        } else {
            // Get celestial body info for non-ship targets
            const info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
            if (info) {
                isCelestialBody = true; // Mark as celestial body
                if (info.type === 'star') {
                    diplomacyColor = '#ffff00'; // Stars are neutral yellow
                } else if (info.diplomacy?.toLowerCase() === 'enemy') {
                    diplomacyColor = '#ff3333'; // Darker neon red
                } else if (info.diplomacy?.toLowerCase() === 'neutral') {
                    diplomacyColor = '#ffff00';
                } else if (info.diplomacy?.toLowerCase() === 'friendly') {
                    diplomacyColor = '#00ff41';
                }
            }
        }

        const currentWeapon = ship?.weaponSystem?.getActiveWeapon();
        const weaponCard = currentWeapon?.equippedWeapon;
        let weaponType = weaponCard?.weaponType;
        const weaponName = weaponCard?.name || 'No Weapon';
        const tcLevel = targetComputer.level;
        
        // Fallback: If weaponType is not set, look it up from weapon definitions
        if (!weaponType && weaponCard?.weaponId) {
            // Common scan-hit weapons
            const scanHitWeapons = ['laser_cannon', 'plasma_cannon', 'pulse_cannon', 'phaser_array', 'disruptor_cannon', 'particle_beam'];
            const splashDamageWeapons = ['standard_missile', 'homing_missile', 'photon_torpedo', 'proximity_mine'];
            
            if (scanHitWeapons.includes(weaponCard.weaponId)) {
                weaponType = 'scan-hit';
            } else if (splashDamageWeapons.includes(weaponCard.weaponId)) {
                weaponType = 'splash-damage';
            }
        }
        

        
        // Determine availability and reason
        let available = true;
        let reason = '';
        let statusColor = diplomacyColor; // Use faction color for available
        
        if (!targetComputer.hasSubTargeting()) {
            available = false;
            reason = `Target Computer Level ${tcLevel} (requires Level 3+)`;
            statusColor = '#ff3333';
        } else if (isCelestialBody) {
            available = false;
            reason = 'Celestial bodies don\'t have subsystems';
            statusColor = '#ff3333';
        } else if (!isEnemyShip || !currentTargetData.ship) {
            available = false;
            reason = 'Target must be a ship with subsystems';
            statusColor = '#ff3333';
        } else if (!currentWeapon || currentWeapon.isEmpty) {
            available = false;
            reason = 'No weapon selected';
            statusColor = '#ff3333';
        } else if (weaponType !== 'scan-hit') {
            available = false;
            if (weaponType === 'splash-damage') {
                reason = 'Projectile weapons don\'t support sub-targeting';
            } else {
                reason = 'Weapon type not compatible';
            }
            statusColor = '#ff3333';
        }
        
        // Build the HTML display
        if (available && targetComputer.hasSubTargeting() && isEnemyShip && currentTargetData.ship && !isCelestialBody) {
            // Set the enemy ship as the current target for the targeting computer
            targetComputer.currentTarget = currentTargetData.ship;
            // Only update sub-targets if we're not preventing target changes
            if (!this.targetComputerManager?.preventTargetChanges) {
                targetComputer.updateSubTargets();
            }
            
            if (targetComputer.currentSubTarget) {
                // Show active sub-targeting with current target
                const subTarget = targetComputer.currentSubTarget;
                const healthPercent = Math.round(subTarget.health * 100);
                
                // Get accuracy and damage bonuses
                const accuracyBonus = Math.round(targetComputer.getSubTargetAccuracyBonus() * 100);
                const damageBonus = Math.round(targetComputer.getSubTargetDamageBonus() * 100);
                
                // Create health bar display matching main hull health style
                const healthBarSection = `
                    <div style="margin-top: 8px; padding: 4px 0;">
                        <div style="color: white; font-weight: bold; font-size: 11px; margin-bottom: 2px;">${subTarget.displayName}: ${healthPercent}%</div>
                        <div style="background-color: #333; border: 1px solid #666; height: 8px; border-radius: 2px; overflow: hidden;">
                            <div style="background-color: white; height: 100%; width: ${healthPercent}%; transition: width 0.3s ease;"></div>
                        </div>
                    </div>`;
                
                // Determine text and background colors based on target faction
                let textColor, backgroundColor;
                if (isEnemyShip) {
                    // White text on faction color background for hostile enemies
                    textColor = 'white';
                    backgroundColor = diplomacyColor;
                } else {
                    // Black text on faction color background for non-hostile targets
                    textColor = 'black';
                    backgroundColor = diplomacyColor;
                }
                
                html = `
                    <div style="
                        background-color: ${backgroundColor}; 
                        color: ${textColor}; 
                        padding: 6px; 
                        border-radius: 4px; 
                        margin-top: 4px;
                        font-weight: bold;
                    ">
                        <div style="font-size: 12px; margin-bottom: 2px;">SYSTEM:</div>
                        ${healthBarSection}
                        <div style="font-size: 10px; opacity: 0.8; margin-top: 6px;">
                            <span>Acc:</span> <span>+${accuracyBonus}%</span> • 
                            <span>Dmg:</span> <span>+${damageBonus}%</span>
                        </div>
                        <div style="font-size: 9px; opacity: 0.8; margin-top: 2px; color: ${statusColor};">
                            ✓ &lt; &gt; to cycle sub-targets
                        </div>
                    </div>
                `;
            } else {
                // Show available sub-targets count
                const availableTargets = targetComputer.availableSubTargets.length;
                if (availableTargets > 0) {
                    // Use same faction-based color logic for available targets display
                    const textColor = isEnemyShip ? 'white' : 'black';
                    
                    html = `
                        <div style="
                            background-color: ${diplomacyColor}; 
                            color: ${textColor}; 
                            padding: 6px; 
                            border-radius: 4px; 
                            margin-top: 4px;
                            font-weight: bold;
                        ">
                            <div style="font-size: 12px; margin-bottom: 2px;">SYSTEM:</div>
                            <div style="font-size: 11px; opacity: 0.8;">
                                ${availableTargets} targetable systems detected
                            </div>
                            <div style="font-size: 9px; opacity: 0.8; margin-top: 2px; color: ${statusColor};">
                                ✓ &lt; &gt; to cycle sub-targets
                            </div>
                        </div>
                    `;
                }
            }
        } else {
            // Show unavailable status with reason using faction colors
            const textColor = isEnemyShip ? 'white' : 'black';
            
            html = `
                <div style="
                    background-color: ${diplomacyColor}; 
                    color: ${textColor}; 
                    padding: 6px; 
                    border-radius: 4px; 
                    margin-top: 4px;
                    font-weight: bold;
                    border: 1px solid ${diplomacyColor};
                ">
                    <div style="font-size: 12px; margin-bottom: 2px;">SUB-TARGETING:</div>
                    <div style="font-size: 10px; opacity: 0.8;">
                        ${available ? 'Available' : 'Unavailable'}
                    </div>
                    ${reason ? `<div style="font-size: 9px; opacity: 0.7; margin-top: 2px;">
                        ${reason}
                    </div>` : ''}
                    ${available ? `<div style="font-size: 9px; opacity: 0.6; margin-top: 2px;">
                        ✓ &lt; &gt; sub-targeting
                    </div>` : ''}
                </div>
            `;
        }
        
        return {
            html,
            available,
            reason
        };
    }

    /**
     * Enhanced sub-targeting key handler with weapon type validation
     * @param {string} direction 'previous' or 'next'
     */
    handleSubTargetingKey(direction) {
        // Hide intel panel when cycling targets with <,> keys
        if (this.intelVisible) {
            this.intelVisible = false;
            this.intelHUD.style.display = 'none';
            // Show target panels when intel is hidden
            if (this.targetComputerManager && this.targetComputerManager.targetHUD) {
                this.targetComputerManager.targetHUD.style.visibility = 'visible';
            }
        }
        
        // Basic requirements check
        if (this.isDocked || !this.targetComputerEnabled || !this.currentTarget) {
            this.playCommandFailedSound();
            return;
        }

        const ship = this.viewManager?.getShip();
        if (!ship) {
            this.playCommandFailedSound();
            return;
        }

        const targetComputer = ship.getSystem('target_computer');
        
        // Check if target computer exists and supports sub-targeting (Level 3+)
        if (!targetComputer) {
            this.playCommandFailedSound();
            ship.weaponSystem?.showMessage('No Target Computer Installed', 3000);
            return;
        }

        if (!targetComputer.hasSubTargeting()) {
            this.playCommandFailedSound();
            const tcLevel = targetComputer.level;
            ship.weaponSystem?.showMessage(`Target Computer Level ${tcLevel} - Sub-targeting requires Level 3+`, 4000);
            return;
        }

        // Check current weapon compatibility
        const currentWeapon = ship.weaponSystem?.getActiveWeapon();
        if (!currentWeapon || currentWeapon.isEmpty) {
            this.playCommandFailedSound();
            ship.weaponSystem?.showMessage('No Weapon Selected', 3000);
            return;
        }

        const weaponCard = currentWeapon.equippedWeapon;
        const weaponType = weaponCard?.weaponType;
        const weaponName = weaponCard?.name || 'Current Weapon';

        // Debug weapon information
        console.log(`🎯 Sub-targeting check for: ${weaponName}`);
        console.log(`🎯 Weapon type: ${weaponType}`);
        console.log(`🎯 Weapon card:`, weaponCard);

        // Check if current weapon supports sub-targeting (scan-hit weapons only)
        if (weaponType !== 'scan-hit') {
            this.playCommandFailedSound();
            
            if (weaponType === 'splash-damage') {
                ship.weaponSystem?.showMessage(`${weaponName}: Projectile weapons don't support sub-targeting`, 4000);
            } else {
                ship.weaponSystem?.showMessage(`${weaponName}: Sub-targeting not supported (type: ${weaponType})`, 4000);
            }
            return;
        }

        // All requirements met - proceed with sub-targeting
        if (targetComputer.availableSubTargets.length <= 1) {
            this.playCommandFailedSound();
            ship.weaponSystem?.showMessage('No Additional Sub-targets Available', 3000);
        } else {
            // Cycle sub-target in the requested direction
            let success = false;
            if (direction === 'previous') {
                success = targetComputer.cycleSubTargetPrevious();
            } else {
                success = targetComputer.cycleSubTargetNext();
            }

            if (success) {
                this.playCommandSound();
                this.updateTargetDisplay(); // Update HUD display
                
                // Show brief confirmation
                const subTargetName = targetComputer.currentSubTarget?.displayName || 'Unknown';
                ship.weaponSystem?.showMessage(`Targeting: ${subTargetName}`, 2000);
            } else {
                this.playCommandFailedSound();
            }
        }
    }

} 