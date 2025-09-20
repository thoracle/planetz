// THREE is handled dynamically in constructor
import { DockingInterface } from '../ui/DockingInterface.js';
import { HelpInterface } from '../ui/HelpInterface.js';
import DockingSystemManager from '../ship/DockingSystemManager.js';
import SimpleDockingManager from '../SimpleDockingManager.js';
import { getSystemDisplayName } from '../ship/System.js';
import DamageControlHUD from '../ui/DamageControlHUD.js';
import { CommunicationHUD } from '../ui/CommunicationHUD.js';
import { MissionStatusHUD } from '../ui/MissionStatusHUD.js';
import { MissionCompletionUI } from '../ui/MissionCompletionUI.js';
import { MissionNotificationHandler } from '../ui/MissionNotificationHandler.js';
import { MissionAPIService } from '../services/MissionAPIService.js';
import { MissionEventService } from '../services/MissionEventService.js';
import { WeaponEffectsManager } from '../ship/systems/WeaponEffectsManager.js';
import { debug } from '../debug.js';
import { DistanceCalculator } from '../utils/DistanceCalculator.js';

// TESTING CONFIGURATION
const TESTING_CONFIG = {
    // Set to true for testing phase - clears all persistent data on game start
    NO_PERSISTENCE: true,
    
    // Future testing options:
    // RESET_PLAYER_PROGRESS: true,
    // RESET_SHIP_CONFIG: true,
    // RESET_CREDITS: true,
    // RESET_FACTION_STANDINGS: true
};
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
        
        // Expose target computer manager globally for waypoints integration
        window.targetComputerManager = this.targetComputerManager;
        
        // Initialize Waypoint HUD
        
        // Create radar HUD
        this.proximityDetector3D = new ProximityDetector3D(this, document.body);
        debug('UTILITY', 'StarfieldManager: 3D Proximity Detector initialized');
        
        // Initialize simple docking system (moved to app.js after spatial systems are ready)
        // if (!this._dockingInitTried) {
        //     this._dockingInitTried = true;
        //     this.initializeSimpleDocking();
        // }
        
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
        
        // Create station menu interface and system manager
        this.dockingInterface = new DockingInterface(this);
        this.dockingSystemManager = new DockingSystemManager();
        
        // Initialize physics-based docking manager (will be activated when physics is ready)
        this.physicsDockingManager = null;
        
        // Create docking modal for popup-based docking
        this.dockingModal = new DockingModal(this);
        
        // Create help interface
        this.helpInterface = new HelpInterface(this);
        
        // Create communication HUD for NPC interactions
        this.communicationHUD = new CommunicationHUD(this, document.body);
        
        // Create mission API service
        this.missionAPI = new MissionAPIService();
        
        // Expose mission API globally for waypoint system
        window.missionAPI = this.missionAPI;
        
        // Create mission event service for tracking game events
        this.missionEventService = new MissionEventService();
        
        // Create mission UI components
        this.missionStatusHUD = new MissionStatusHUD(this, null); // Mission manager to be integrated later
        this.missionCompletionUI = new MissionCompletionUI(this, null); // Mission manager to be integrated later
        this.missionNotificationHandler = new MissionNotificationHandler(this.communicationHUD, this);
        
        // Create enemy AI manager
        this.enemyAIManager = new EnemyAIManager(this.scene, this.camera, this);
        
        // Initialize mission system after a short delay to ensure all systems are ready
        setTimeout(() => {
            this.initializeMissionSystem();
        }, 2000);
        
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
     * Convert faction name to diplomacy status
     * @param {string} faction - Faction name
     * @returns {string} Diplomacy status ('friendly', 'neutral', 'enemy')
     */
    getFactionDiplomacy(faction) {
        if (!faction) return 'neutral';
        
        // Faction relationship mappings (matches AmbientShipManager.js)
        const factionRelations = {
            'Terran Republic Alliance': 'friendly',
            'Zephyrian Collective': 'friendly', 
            'Scientists Consortium': 'friendly',
            'Free Trader Consortium': 'neutral',
            'Nexus Corporate Syndicate': 'neutral',
            'Ethereal Wanderers': 'neutral',
            'Draconis Imperium': 'neutral',
            'Crimson Raider Clans': 'enemy',
            'Shadow Consortium': 'enemy',
            'Void Cult': 'enemy'
        };
        
        return factionRelations[faction] || 'neutral';
    }
    
    /**
     * Initialize the enemy AI manager
     */
    async initializeAIManager() {
        try {
            if (this.enemyAIManager) {
                await this.enemyAIManager.initialize();
                debug('UTILITY', 'Enemy AI system ready');
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
                
                debug('UTILITY', 'WeaponEffectsManager connected to ship');
            } else {
                console.warn('Ship not available, WeaponEffectsManager connection deferred');
            }
            
            this.weaponEffectsInitialized = true;
            this.weaponEffectsRetryCount = 0; // Reset retry count on success
            debug('UTILITY', 'WeaponEffectsManager initialized successfully');
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
        debug('UTILITY', `startManualRepair called for: ${systemName}`);
        
        if (this.manualRepairSystem.isRepairing) {
            debug('UTILITY', `Manual repair system already repairing: ${this.manualRepairSystem.repairTarget}`);
            return;
        }

        // Check if system exists and is damaged
        const system = this.ship.getSystem(systemName);
        if (!system) {
            console.error('🚫 REPAIR: System not found:', systemName);
            return;
        }

        debug('UTILITY', `System found: ${systemName}, health: ${system.currentHealth}/${system.maxHealth}, healthPercentage: ${system.healthPercentage}`);

        if (system.healthPercentage >= 100) {
            debug('UTILITY', `System ${systemName} is already fully repaired (${system.healthPercentage}%)`);
            return;
        }

        debug('UTILITY', `Starting repair for ${systemName} (${system.healthPercentage}% health)`);
        
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
        debug('UTILITY', 'StarfieldManager: Starting WeaponHUD creation...');
        import('../ui/WeaponHUD.js').then(({ WeaponHUD }) => {
            debug('UTILITY', 'StarfieldManager: WeaponHUD module loaded, creating instance...');
            this.weaponHUD = new WeaponHUD(document.body);
            
            // Initialize weapon slots display
            this.weaponHUD.initializeWeaponSlots(4);
            debug('UTILITY', 'StarfieldManager: WeaponHUD created and initialized');
            
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
                    debug('UTILITY', `WeaponHUD connected after ${this.weaponHUDRetryCount} attempts`);
                } else {
                    debug('UTILITY', `WeaponHUD connection will retry later (${this.maxWeaponHUDRetries} attempts completed)`);
                }
            }
        }, 500);
    }
    
    /**
     * Connect WeaponHUD to WeaponSystemCore
     */
    connectWeaponHUDToSystem() {
        const ship = this.viewManager?.getShip();

        if (ship && ship.weaponSystem && this.weaponHUD) {
            // Set HUD reference in weapon system
            ship.weaponSystem.setWeaponHUD(this.weaponHUD);
            
            // Update weapon slots display
            this.weaponHUD.updateWeaponSlotsDisplay(ship.weaponSystem.weaponSlots, ship.weaponSystem.activeSlotIndex);
            
            this.weaponHUDConnected = true;
            debug('UTILITY', 'WeaponHUD successfully connected to WeaponSystemCore');
        } else {
            this.weaponHUDConnected = false;
            // Use debug logging instead of warnings during startup

            // if (!ship) debug('INSPECTION', 'Ship initializing...');
            // if (!ship?.weaponSystem) debug('INSPECTION', 'WeaponSystem initializing...');
            // if (!this.weaponHUD) debug('INSPECTION', 'WeaponHUD initializing...');
        }
    }
    bindKeyEvents() {
        debug('TARGETING', `🎯 StarfieldManager.bindKeyEvents() called - setting up TAB handler`);
        
        // Track key presses for speed control
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false
        };

        document.addEventListener('keydown', (event) => {
            // Basic TAB detection test
            if (event.key === 'Tab') {
                debug('TARGETING', `🎯 RAW TAB detected in StarfieldManager keydown handler`);
            }

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
                
                debug('UTILITY', 'CTRL+O PRESSED: Toggling debug mode...');
                
                // Toggle weapon debug mode
                this.toggleDebugMode();
                
                // Toggle spatial debug visualization (placeholder for future implementation)
                if (window.spatialManager) {
                    debug('UTILITY', 'SpatialManager Status: Initialized and ready');
                    const stats = window.spatialManager.getStats();

                    // Future: Add debug visualization for spatial bounding volumes

                } else {
                    debug('P1', 'SpatialManager not available for debug visualization');
                }

                debug('UTILITY', 'CTRL+O DEBUG TOGGLE COMPLETE');
            }
            
            // Enhanced wireframe visibility toggle (Ctrl-Shift-P) for debugging wireframe issues
            if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'p') {
                event.preventDefault();
                
                debug('UTILITY', 'CTRL+SHIFT+P PRESSED: Enhancing wireframe visibility...');
                
                if (window.physicsManager && window.physicsManager.initialized && window.physicsManager.debugMode) {
                    window.physicsManager.enhanceWireframeVisibility();
                } else {
                    debug('P1', 'Cannot enhance wireframes - debug mode not active or physics manager not available');
                    debug('UTILITY', 'Press Ctrl+P first to enable debug mode');
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

                // Special debug for Impulse 4 transitions
                if (actualSpeed === 4) {

                }

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
                            debug('AI', `AI Debug Mode: ${this.enemyAIManager.debugMode ? 'ON' : 'OFF'}`);
                        }
                        return;
                    case 'e':
                        // Force all AIs to engage state
                        event.preventDefault();
                        if (this.enemyAIManager) {
                            this.enemyAIManager.forceAllAIState('engage');
                            debug('AI', 'All AIs forced to ENGAGE state');
                        }
                        return;
                    case 'i':
                        // Force all AIs to idle state
                        event.preventDefault();
                        if (this.enemyAIManager) {
                            this.enemyAIManager.forceAllAIState('idle');
                            debug('AI', 'All AIs forced to IDLE state');
                        }
                        return;
                    case 's':
                        // Show AI statistics
                        event.preventDefault();
                        if (this.enemyAIManager) {
                            const stats = this.enemyAIManager.getAIStats();
                            debug('AI', `AI Statistics: ${JSON.stringify(stats)}`);
                        }
                        return;
                    case 'f':
                        // Force all AIs to flee state
                        event.preventDefault();
                        if (this.enemyAIManager) {
                            this.enemyAIManager.forceAllAIState('flee');
                            debug('AI', 'All AIs forced to FLEE state');
                        }
                        return;
                    case 'v':
                        // Create V-Formation with all AI ships
                        event.preventDefault();
                        if (this.enemyAIManager && this.targetDummyShips) {
                            this.enemyAIManager.createFormation(this.targetDummyShips, 'v_formation');
                            debug('AI', 'Created V-Formation with all AI ships');
                        }
                        return;
                    case 'c':
                        // Create Column formation with all AI ships
                        event.preventDefault();
                        if (this.enemyAIManager && this.targetDummyShips) {
                            this.enemyAIManager.createFormation(this.targetDummyShips, 'column');
                            debug('AI', 'Created Column formation with all AI ships');
                        }
                        return;
                    case 'l':
                        // Create Line Abreast formation with all AI ships
                        event.preventDefault();
                        if (this.enemyAIManager && this.targetDummyShips) {
                            this.enemyAIManager.createFormation(this.targetDummyShips, 'line_abreast');
                            debug('AI', 'Created Line Abreast formation with all AI ships');
                        }
                        return;
                    case 'b':
                        // Show flocking statistics
                        event.preventDefault();
                        if (this.enemyAIManager) {
                            const stats = this.enemyAIManager.getFlockingStats();
                            debug('AI', `Flocking Statistics: ${JSON.stringify(stats)}`);
                        }
                        return;
                    case 't':
                        // Show detailed combat statistics
                        event.preventDefault();
                        if (this.enemyAIManager) {
                            const aiShips = Array.from(this.enemyAIManager.activeAIs);
                            debug('COMBAT', `Combat Statistics for ${aiShips.length} ships:`);
                            aiShips.forEach((ai, index) => {
                                const combatState = ai.getCombatState();
                                const debugInfo = ai.getDebugInfo();
                                debug('COMBAT', `Ship ${index + 1} (${combatState.state}): ${JSON.stringify(debugInfo)}`);
                            });
                        }
                        return;
                    case 'w':
                        // Show weapon targeting debug
                        event.preventDefault();
                        if (this.enemyAIManager) {
                            const aiShips = Array.from(this.enemyAIManager.activeAIs);
                            debug('COMBAT', `Weapon Targeting Debug for ${aiShips.length} ships:`);
                            aiShips.forEach((ai, index) => {
                                const targetingInfo = ai.weaponTargeting?.getDebugInfo() || {};
                                debug('COMBAT', `Ship ${index + 1}: ${JSON.stringify(targetingInfo)}`);
                            });
                        }
                        return;
                    case 'x':
                        // Force all AIs to engage player (if available)
                        event.preventDefault();
                        if (this.enemyAIManager && this.shipMesh) {
                            const aiShips = Array.from(this.enemyAIManager.activeAIs);
                            aiShips.forEach(ai => {
                                ai.setTarget(this.shipMesh);
                                ai.setState('engage');
                            });
                            debug('COMBAT', 'All AIs now targeting player ship');
                        }
                        return;
                    case 'p':
                        // Show performance statistics
                        event.preventDefault();
                        if (this.enemyAIManager) {
                            const perfStats = this.enemyAIManager.performanceManager.getPerformanceStats();
                            debug('AI', `AI Performance Statistics: ${JSON.stringify(perfStats)}`);
                        }
                        return;
                    case 'd':
                        // Toggle debug visualization options
                        event.preventDefault();
                        if (this.enemyAIManager) {
                            const visualizer = this.enemyAIManager.debugVisualizer;
                            // Cycle through different visualization modes
                            const currentSettings = visualizer.getDebugStats().settings;
                            const newSettings = {
                                showSensorRanges: !currentSettings.showSensorRanges,
                                showWeaponRanges: currentSettings.showWeaponRanges,
                                showTargetingLines: currentSettings.showTargetingLines,
                                showStateLabels: currentSettings.showStateLabels,
                                showVelocityVectors: currentSettings.showVelocityVectors,
                                showFlockingForces: currentSettings.showFlockingForces,
                                showThreatLevels: currentSettings.showThreatLevels
                            };
                            visualizer.configure(newSettings);
                        }
                        return;
                }
            }
            
            // Handle Tab key for cycling targets (Tab = forward, Shift+Tab = backward)
            if (event.key === 'Tab') {
                console.log('🎯 TAB DETECTED in StarfieldManager');
                event.preventDefault(); // Prevent Tab from changing focus
                const forward = !event.shiftKey; // Shift+Tab cycles backward
                debug('TARGETING', `🎯 TAB key pressed (forward=${forward})`);
                // console.log(`🎯 ${event.shiftKey ? 'Shift+' : ''}TAB key pressed for ${forward ? 'forward' : 'backward'} target cycling`);
                
                // Block target cycling when docked
                if (this.isDocked) {
                    console.log('🎯 TAB blocked - ship is docked');
                    this.playCommandFailedSound();
                    this.showHUDEphemeral(
                        'TARGET CYCLING UNAVAILABLE',
                        'Targeting systems offline while docked'
                    );
                    return;
                }
                
                // Check for undock cooldown with proper user feedback
                if (this.undockCooldown && Date.now() < this.undockCooldown) {
                    const remainingSeconds = Math.ceil((this.undockCooldown - Date.now()) / 1000);
                    console.log('🎯 TAB blocked - undock cooldown active');
                    this.playCommandFailedSound();
                    this.showHUDEphemeral(
                        'TARGETING SYSTEMS WARMING UP',
                        `Systems initializing after launch - ${remainingSeconds}s remaining`
                    );
                    return;
                }
                
                // Check if target computer system is operational
                const ship = this.viewManager?.getShip();
                console.log('🎯 TAB: Checking ship and target computer', {
                    hasShip: !!ship,
                    targetComputerEnabled: this.targetComputerEnabled
                });
                
                if (ship) {
                    const targetComputer = ship.getSystem('target_computer');
                    const energyReactor = ship.getSystem('energy_reactor');
                    
                    console.log('🎯 TAB: System check', {
                        hasTargetComputer: !!targetComputer,
                        canActivate: targetComputer?.canActivate(ship),
                        targetComputerEnabled: this.targetComputerEnabled,
                        hasEnergyReactor: !!energyReactor
                    });
                    
                    if (targetComputer && targetComputer.canActivate(ship) && this.targetComputerEnabled) {
                        // Target computer is operational and activated - allow cycling
                        console.log('🎯 TAB: All checks passed, calling cycleTarget');
                        debug('TARGETING', `🎯 TAB: Calling cycleTarget(${forward}) - target computer operational`);
                        // console.log(`🎯 Cycling target ${forward ? 'forward' : 'backward'} from ${event.shiftKey ? 'Shift+' : ''}TAB key press`);
                        this.cycleTarget(forward); // Manual cycle via TAB key
                        // Reset outline suppression for manual cycles
                        this.outlineDisabledUntilManualCycle = false;
                        this.playCommandSound();
                    } else {
                        // Target computer cannot function - provide specific feedback
                        this.playCommandFailedSound();
                        
                        if (!targetComputer) {
                            this.showHUDEphemeral(
                                'TARGET CYCLING UNAVAILABLE',
                                'No Target Computer card installed in ship slots'
                            );
                        } else if (!targetComputer.isOperational()) {
                            this.showHUDEphemeral(
                                'TARGET CYCLING OFFLINE',
                                `Target Computer damaged (${Math.round(targetComputer.healthPercentage * 100)}% health) - repair required`
                            );
                        } else if (!ship.hasSystemCardsSync('target_computer')) {
                            this.showHUDEphemeral(
                                'TARGET CYCLING UNAVAILABLE',
                                'No Target Computer card installed in ship slots'
                            );
                        } else if (!this.targetComputerEnabled) {
                            this.showHUDEphemeral(
                                'TARGET CYCLING DISABLED',
                                'Activate Target Computer (T key) first'
                            );
                        } else if (!energyReactor || !energyReactor.isOperational()) {
                            // Energy reactor is the problem
                            if (!energyReactor) {
                                this.showHUDEphemeral(
                                    'TARGET CYCLING FAILURE',
                                    'No Energy Reactor installed - cannot power systems'
                                );
                            } else {
                                this.showHUDEphemeral(
                                    'TARGET CYCLING FAILURE',
                                    `Energy Reactor disabled (${Math.round(energyReactor.healthPercentage * 100)}% health) - repair immediately`
                                );
                            }
                        } else {
                            // Target cycling should not require energy - removed the energy check
                            // Generic fallback
                            this.showHUDEphemeral(
                                'TARGET CYCLING FAILURE',
                                'System requirements not met - check power and repair status'
                            );
                        }
                    }
                } else {
                    this.playCommandFailedSound();
                    this.showHUDEphemeral(
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
                                this.showHUDEphemeral(
                                    'GALACTIC CHART UNAVAILABLE',
                                    'System not installed on this ship'
                                );
                            } else if (!galacticChart.isOperational()) {
                                this.showHUDEphemeral(
                                    'GALACTIC CHART DAMAGED',
                                    'Repair system to enable navigation'
                                );
                            } else if (!ship.hasSystemCardsSync('galactic_chart')) {
                                this.showHUDEphemeral(
                                    'GALACTIC CHART MISSING',
                                    'Install galactic chart card to enable navigation'
                                );
                            } else if (!ship.hasEnergy(15)) {
                                this.showHUDEphemeral(
                                    'INSUFFICIENT ENERGY',
                                    'Need 15 energy units to activate galactic chart'
                                );
                            } else {
                                this.showHUDEphemeral(
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
                                this.showHUDEphemeral(
                                    'LONG RANGE SCANNER UNAVAILABLE',
                                    'No Long Range Scanner card installed in ship slots'
                                );
                            } else if (!scanner.isOperational()) {
                                this.showHUDEphemeral(
                                    'LONG RANGE SCANNER OFFLINE',
                                    'System damaged or offline - repair required'
                                );
                            } else if (!ship.hasSystemCardsSync('long_range_scanner')) {
                                this.showHUDEphemeral(
                                    'LONG RANGE SCANNER UNAVAILABLE',
                                    'No Long Range Scanner card installed in ship slots'
                                );
                            } else {
                                this.showHUDEphemeral(
                                    'LONG RANGE SCANNER ACTIVATION FAILED',
                                    'Insufficient energy for scanning operations'
                                );
                            }
                        }
                    } else {
                        this.playCommandFailedSound();
                    }
                } else {
                    this.showHUDEphemeral(
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
                                this.showHUDEphemeral(
                                    'TARGET COMPUTER UNAVAILABLE',
                                    'No Target Computer card installed in ship slots'
                                );
                            } else if (!targetComputer.isOperational()) {
                                this.showHUDEphemeral(
                                    'TARGET COMPUTER OFFLINE',
                                    `System damaged (${Math.round(targetComputer.healthPercentage * 100)}% health) - repair required`
                                );
                            } else if (!ship.hasSystemCardsSync('target_computer')) {
                                this.showHUDEphemeral(
                                    'TARGET COMPUTER UNAVAILABLE',
                                    'No Target Computer card installed in ship slots'
                                );
                            } else if (!energyReactor || !energyReactor.isOperational()) {
                                // Energy reactor is the problem
                                if (!energyReactor) {
                                    this.showHUDEphemeral(
                                        'POWER FAILURE',
                                        'No Energy Reactor installed - cannot power systems'
                                    );
                                } else {
                                    this.showHUDEphemeral(
                                        'POWER FAILURE',
                                        `Energy Reactor disabled (${Math.round(energyReactor.healthPercentage * 100)}% health) - repair immediately`
                                    );
                                }
                            } else if (ship.currentEnergy < targetComputer.getEnergyConsumptionRate()) {
                                // Insufficient energy
                                const required = targetComputer.getEnergyConsumptionRate();
                                const available = Math.round(ship.currentEnergy);
                                this.showHUDEphemeral(
                                    'INSUFFICIENT ENERGY',
                                    `Need ${required}/sec energy. Available: ${available} units`
                                );
                            } else {
                                // Generic fallback
                                this.showHUDEphemeral(
                                    'TARGET COMPUTER ACTIVATION FAILED',
                                    'System requirements not met - check power and repair status'
                                );
                            }
                        }
                    } else {
                        this.playCommandFailedSound();
                        this.showHUDEphemeral(
                            'SHIP SYSTEMS OFFLINE',
                            'No ship systems available'
                        );
                    }
                } else {
                    this.showHUDEphemeral(
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
                    this.showHUDEphemeral(
                        'INTEL UNAVAILABLE',
                        'Intelligence systems offline while docked'
                    );
                    return;
                }
                
                // Check if intel can be activated (requires target computer and scanner)
                const ship = this.viewManager?.getShip();
                if (!ship) {
                    this.playCommandFailedSound();
                    this.showHUDEphemeral(
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
                        this.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            'No Target Computer card installed in ship slots'
                        );
                    } else if (!targetComputer.isOperational()) {
                        this.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            `Target Computer damaged (${Math.round(targetComputer.healthPercentage * 100)}% health) - repair required`
                        );
                    } else if (!ship.hasSystemCardsSync('target_computer')) {
                        this.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            'No Target Computer card installed in ship slots'
                        );
                    } else if (!this.targetComputerEnabled) {
                        this.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            'Activate Target Computer (T key) first'
                        );
                    } else if (!energyReactor || !energyReactor.isOperational()) {
                        // Energy reactor issues
                        if (!energyReactor) {
                            this.showHUDEphemeral(
                                'INTEL UNAVAILABLE',
                                'No Energy Reactor installed - cannot power systems'
                            );
                        } else {
                            this.showHUDEphemeral(
                                'INTEL UNAVAILABLE',
                                `Energy Reactor disabled (${Math.round(energyReactor.healthPercentage * 100)}% health) - repair immediately`
                            );
                        }
                    } else if (ship.currentEnergy < (targetComputer.getEnergyConsumptionRate() + (scanner?.getEnergyConsumptionRate() || 0))) {
                        // Insufficient energy for both systems
                        const required = targetComputer.getEnergyConsumptionRate() + (scanner?.getEnergyConsumptionRate() || 0);
                        const available = Math.round(ship.currentEnergy);
                        this.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            `Insufficient energy - need ${required}/sec for intel operations. Available: ${available} units`
                        );
                    } else if (!targetComputer.hasIntelCapabilities()) {
                        this.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            'Requires Level 3+ Target Computer with intel capabilities'
                        );
                    } else if (!scanner) {
                        this.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            'No Long Range Scanner card installed - required for detailed analysis'
                        );
                    } else if (!scanner.isOperational()) {
                        this.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            `Long Range Scanner damaged (${Math.round(scanner.healthPercentage * 100)}% health) - repair required`
                        );
                    } else if (!ship.hasSystemCardsSync('long_range_scanner')) {
                        this.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            'No Long Range Scanner card installed - required for detailed analysis'
                        );
                    } else if (!this.currentTarget) {
                        this.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            'No target selected - activate Target Computer and select target first'
                        );
                    } else if (!this.intelAvailable) {
                        this.showHUDEphemeral(
                            'INTEL UNAVAILABLE',
                            'Target out of scanner range or intel data not available'
                        );
                    } else {
                        // Generic fallback
                        this.showHUDEphemeral(
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
                    // Check radar system availability like other systems
                    const ship = this.viewManager?.getShip();
                    const radarSystem = ship?.getSystem('radar');
                    
                    if (!radarSystem) {
                        // No radar system exists (no cards installed)
                        this.playCommandFailedSound();
                        this.showHUDEphemeral(
                            'PROXIMITY DETECTOR UNAVAILABLE',
                            'No Proximity Detector card installed in ship slots'
                        );
                    } else if (!radarSystem.canActivate(ship)) {
                        // System exists but can't be activated
                        if (!radarSystem.isOperational()) {
                            this.showHUDEphemeral(
                                'PROXIMITY DETECTOR DAMAGED',
                                'Proximity Detector system requires repair'
                            );
                        } else {
                            this.showHUDEphemeral(
                                'INSUFFICIENT ENERGY',
                                'Need energy to activate proximity detector'
                            );
                        }
                        this.playCommandFailedSound();
                    } else {
                        // System available and operational - toggle it
                        this.playCommandSound();
                        this.toggleProximityDetector();
                    }
                } else {
                    this.playCommandFailedSound();
                    this.showHUDEphemeral(
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
                    this.showHUDEphemeral(
                        'PROXIMITY DETECTOR ZOOM UNAVAILABLE',
                        'Proximity Detector offline while docked'
                    );
                } else {
                    this.playCommandFailedSound();
                    this.showHUDEphemeral(
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
                    this.showHUDEphemeral(
                        'PROXIMITY DETECTOR ZOOM UNAVAILABLE',
                        'Proximity Detector offline while docked'
                    );
                } else {
                    this.playCommandFailedSound();
                    this.showHUDEphemeral(
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
                    this.showHUDEphemeral(
                        'PROXIMITY DETECTOR VIEW TOGGLE UNAVAILABLE',
                        'Proximity Detector offline while docked'
                    );
                } else {
                    this.playCommandFailedSound();
                    this.showHUDEphemeral(
                        'PROXIMITY DETECTOR VIEW TOGGLE UNAVAILABLE',
                        'Proximity Detector not active (press P to enable)'
                    );
                }
            }

            // Add Communication HUD Effects Toggle key binding (N key)
            if (commandKey === 'n') {
                // Communication HUD effects can be toggled anytime
                if (this.communicationHUD) {
                    if (!this.communicationHUD.visible) {
                        // If HUD is hidden, show it first
                        if (this.communicationHUD.toggle()) {
                            this.playCommandSound();
debug('UI', 'Communication HUD toggled: ON');
                        } else {
                            this.playCommandFailedSound();
                        }
                    } else {
                        // If HUD is visible, toggle enhanced effects (video tint + scan lines)
                        if (this.communicationHUD.toggleEffects()) {
debug('UI', 'Communication HUD effects:', this.communicationHUD.effectsEnabled ? 'ENHANCED (video tint + scan lines)' : 'MINIMAL (raw video, no scan lines)');
                        } else {
                            this.playCommandFailedSound();
                        }
                    }
                } else {
                    this.playCommandFailedSound();
                    this.showHUDEphemeral(
                        'COMMUNICATION HUD UNAVAILABLE',
                        'Communication system not initialized'
                    );
                }
            }

            // Add Mission Status HUD Toggle key binding (M key)
            if (commandKey === 'm') {
                // Toggle Mission Status HUD
                if (!this.isDocked) { // Don't show during docking
                    if (this.missionStatusHUD) {
                        // CRITICAL: Dismiss conflicting HUDs to prevent overlap
                        if (this.damageControlHUD && this.damageControlHUD.isVisible) {
                            this.damageControlHUD.hide();
debug('COMBAT', 'Damage Control HUD dismissed for Mission Status');
                        }
                        
                        // Also dismiss Galactic Chart and Long Range Scanner if open
                        if (this.viewManager) {
                            if (this.viewManager.galacticChart && this.viewManager.galacticChart.isVisible()) {
                                this.viewManager.galacticChart.hide();
debug('MISSIONS', 'Galactic Chart dismissed for Mission Status');
                            }
                            if (this.viewManager.longRangeScanner && this.viewManager.longRangeScanner.isVisible()) {
                                this.viewManager.longRangeScanner.hide();
debug('MISSIONS', '🔭 Long Range Scanner dismissed for Mission Status');
                            }
                        }
                        
                        if (this.missionStatusHUD.toggle()) {
                            this.playCommandSound();
debug('UI', 'Mission Status HUD toggled:', this.missionStatusHUD.visible ? 'ON' : 'OFF');
                        } else {
                            this.playCommandFailedSound();
                        }
                    } else {
                        this.playCommandFailedSound();
                        this.showHUDEphemeral(
                            'MISSION STATUS UNAVAILABLE',
                            'Mission system not initialized'
                        );
                    }
                } else {
                    this.playCommandFailedSound();
                    this.showHUDEphemeral(
                        'MISSION STATUS UNAVAILABLE', 
                        'Use Mission Board while docked'
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
debug('COMBAT', '  • Shields system object:', shields);
debug('UI', '  • Ship has cardSystemIntegration:', !!ship.cardSystemIntegration);
                        
                        if (ship.cardSystemIntegration) {
                            const installedCards = Array.from(ship.cardSystemIntegration.installedCards.values());
debug('UI', '  • Total installed cards:', installedCards.length);
debug('UI', '  • Installed card types:', installedCards.map(card => `${card.cardType} (L${card.level})`));
                            
                            const shieldCards = installedCards.filter(card => card.cardType === 'shields');
debug('COMBAT', '  • Shield cards found:', shieldCards.length, shieldCards);
                            
                            const hasSystemCardsResult = ship.cardSystemIntegration.hasSystemCardsSync('shields');
debug('UI', '  • hasSystemCardsSync result:', hasSystemCardsResult);
                            
                            const shipHasSystemCards = ship.hasSystemCardsSync('shields', true);
debug('UI', '  • ship.hasSystemCardsSync result:', shipHasSystemCards);
                        }
                        
                        if (shields && shields.canActivate(ship)) {
                            this.playCommandSound();
                            shields.toggleShields();
                        } else {
                            // System can't be activated - provide specific error message
                            if (!shields) {
debug('COMBAT', 'SHIELD DEBUG: No shields system found');
                                this.showHUDEphemeral(
                                    'SHIELDS UNAVAILABLE',
                                    'System not installed on this ship'
                                );
                            } else if (!shields.isOperational()) {
debug('COMBAT', 'SHIELD DEBUG: Shields system not operational');
                                this.showHUDEphemeral(
                                    'SHIELDS DAMAGED',
                                    'Repair system to enable shield protection'
                                );
                            } else if (!ship.hasSystemCardsSync('shields', true)) {
debug('COMBAT', 'SHIELD DEBUG: Missing shield cards - this is the problem!');
                                this.showHUDEphemeral(
                                    'SHIELDS MISSING',
                                    'Install shield card to enable protection'
                                );
                            } else if (!ship.hasEnergy(25)) {
debug('COMBAT', 'SHIELD DEBUG: Insufficient energy');
                                this.showHUDEphemeral(
                                    'INSUFFICIENT ENERGY',
                                    'Need 25 energy units to activate shields'
                                );
                            } else {
                                this.showHUDEphemeral(
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
                            this.showHUDEphemeral(
                                'SUBSPACE RADIO UNAVAILABLE',
                                'Install subspace radio card to enable communications'
                            );
                            this.playCommandFailedSound();
                        } else if (!radio.canActivate(ship)) {
                            // System exists but can't activate
                            if (!radio.isOperational()) {
                                this.showHUDEphemeral(
                                    'SUBSPACE RADIO DAMAGED',
                                    'Repair system to enable communications'
                                );
                            } else if (!ship.hasSystemCardsSync('subspace_radio')) {
                                this.showHUDEphemeral(
                                    'SUBSPACE RADIO MISSING',
                                    'Install subspace radio card to enable communications'
                                );
                            } else if (!ship.hasEnergy(15)) {
                                this.showHUDEphemeral(
                                    'INSUFFICIENT ENERGY',
                                    'Need 15 energy units to activate radio'
                                );
                            } else {
                                this.showHUDEphemeral(
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

            // Sub-targeting key bindings (moved to Z/X only)
            if (event.key === 'z' || event.key === 'Z') {
                // Previous sub-target (moved from , to z)
                this.handleSubTargetingKey('previous');
            } else if (event.key === 'x' || event.key === 'X') {
                // Next sub-target (moved from . to x)
                this.handleSubTargetingKey('next');
            }

            // Weapon key bindings (moved to ,/. and </> keys)
            if (event.key === ',' || event.key === '<') {
                // Previous weapon selection (moved from z to , and <)
                if (!this.isDocked) {
                    const ship = this.viewManager?.getShip();
                    if (ship && ship.weaponSystem) {
                        if (ship.weaponSystem.selectPreviousWeapon()) {
                            this.playCommandSound();
                        }
                    }
                }
            } else if (event.key === '.' || event.key === '>') {
                // Next weapon selection (moved from x to . and >)
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
            } else if (event.key === '/' || event.key === '?') {
                // Toggle autofire (moved from C key)
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
                // CRITICAL: Dismiss Mission Status HUD if open to prevent overlap
                if (this.missionStatusHUD && this.missionStatusHUD.visible) {
                    this.missionStatusHUD.hide();
debug('COMBAT', 'Mission Status HUD dismissed for Damage Control');
                }
                
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
debug('TARGETING', 'Spawning target dummy ships: 1 at 60km, 2 within 25km...');
                    this.createTargetDummyShips(3);
                    
                    // Clear targeting cache to prevent stale crosshair results after spawning targets
                    if (window.targetingService) {
                        window.targetingService.clearCache();
                    }
                } else {
                    this.playCommandFailedSound();
                    this.showHUDEphemeral(
                        'TARGET SPAWNING UNAVAILABLE',
                        'Cannot spawn targets while docked'
                    );
                }
            }

            // Waypoint Test Mission Creation (W key)
            if (commandKey === 'w') {
                // First, ensure target computer is enabled (like T key does) - waypoints require target computer
                if (!this.isDocked) {
                    const ship = this.viewManager?.getShip();
                    if (ship) {
                        const targetComputer = ship.getSystem('target_computer');
                        const energyReactor = ship.getSystem('energy_reactor');
                        
                        if (targetComputer && targetComputer.canActivate(ship)) {
                            // Enable target computer if it's not already enabled
                            if (!targetComputer.isActive) {
                                debug('WAYPOINTS', '🎯 W key: Enabling target computer for waypoint creation');
                                if (targetComputer.activate(ship)) {
                                    this.targetComputerEnabled = true;
                                    // Sync with TargetComputerManager
                                    if (this.targetComputerManager) {
                                        this.targetComputerManager.targetComputerEnabled = true;
                                    }
                                    this.playCommandSound();
                                } else {
                                    // Failed to activate - show error and return
                                    this.playCommandFailedSound();
                                    this.showHUDEphemeral('TARGET COMPUTER FAILED', 'Insufficient energy or system damaged');
                                    return;
                                }
                            }
                        } else {
                            // Target computer not available - show same error as T key and return
                            this.playCommandFailedSound();
                            if (!targetComputer) {
                                this.showHUDEphemeral(
                                    'TARGET COMPUTER UNAVAILABLE',
                                    'No Target Computer card installed in ship slots'
                                );
                            } else if (!targetComputer.isOperational()) {
                                this.showHUDEphemeral(
                                    'TARGET COMPUTER OFFLINE',
                                    `System damaged (${Math.round(targetComputer.healthPercentage * 100)}% health) - repair required`
                                );
                            } else if (!ship.hasSystemCardsSync('target_computer')) {
                                this.showHUDEphemeral(
                                    'TARGET COMPUTER UNAVAILABLE',
                                    'No Target Computer card installed in ship slots'
                                );
                            } else if (!energyReactor || !energyReactor.isOperational()) {
                                // Energy reactor is the problem
                                if (!energyReactor) {
                                    this.showHUDEphemeral(
                                        'POWER FAILURE',
                                        'No Energy Reactor installed - cannot power systems'
                                    );
                                } else {
                                    this.showHUDEphemeral(
                                        'POWER FAILURE',
                                        `Energy Reactor damaged (${Math.round(energyReactor.healthPercentage * 100)}% health) - repair required`
                                    );
                                }
                            } else {
                                this.showHUDEphemeral(
                                    'TARGET COMPUTER FAILED',
                                    'Insufficient energy for targeting systems'
                                );
                            }
                            return;
                        }
                    }
                }
                
                // Allow waypoint test mission creation anytime (even when docked for testing)
                this.handleWaypointCreationAsync();
            }

            // Toggle 3D target outlines (O key)
            if (commandKey === 'o') {
                if (!this.isDocked) {
                    this.playCommandSound();
                    this.toggleTargetOutline();
                } else {
                    this.playCommandFailedSound();
                    this.showHUDEphemeral(
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
debug('COMBAT', 'Refreshing ship systems before showing damage control...');
                // Force reload cards and refresh systems
                ship.cardSystemIntegration.loadCards().then(() => {
                    // Check if systems already exist to prevent duplicates
                    const existingSystemCount = ship.systems ? ship.systems.size : 0;
                    debug('SYSTEM_FLOW', `🔍 StarfieldManager damage control check: existing systems = ${existingSystemCount}`);

                    if (existingSystemCount === 0) {
                        debug('SYSTEM_FLOW', '🚀 StarfieldManager creating systems for damage control');
                        ship.cardSystemIntegration.createSystemsFromCards().then(() => {
                            // Re-initialize cargo holds from updated cards
                            if (ship.cargoHoldManager) {
                                ship.cargoHoldManager.initializeFromCards();
                            }

                            // Show the damage control HUD after systems are refreshed
                            this.damageControlHUD.show();
                            debug('COMBAT', 'Damage control HUD shown with refreshed systems');
                        });
                    } else {
                        debug('SYSTEM_FLOW', '⏭️ StarfieldManager skipping system creation for damage control - systems already exist');
                        // Still show damage control even if we didn't recreate systems
                        this.damageControlHUD.show();
                        debug('COMBAT', 'Damage control HUD shown (systems not recreated)');
                    }
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
        // console.log(`🎯 StarfieldManager.updateTargetList() called`); // Reduce spam
        const targetBeforeUpdate = this.targetComputerManager.currentTarget;
        const indexBeforeUpdate = this.targetComputerManager.targetIndex;
        
        // Delegate to target computer manager
        this.targetComputerManager.updateTargetList();
        
        const targetAfterUpdate = this.targetComputerManager.currentTarget;
        const indexAfterUpdate = this.targetComputerManager.targetIndex;
        
        if (targetBeforeUpdate !== targetAfterUpdate || indexBeforeUpdate !== indexAfterUpdate) {
debug('TARGETING', `🎯 WARNING: Target changed during updateTargetList!`);
debug('TARGETING', `🎯   Before: target=${targetBeforeUpdate?.userData?.ship?.shipName || 'unknown'}, index=${indexBeforeUpdate}`);
debug('TARGETING', `🎯   After: target=${targetAfterUpdate?.userData?.ship?.shipName || 'unknown'}, index=${indexAfterUpdate}`);
        }
        
        // Update local state to match
        this.targetObjects = this.targetComputerManager.targetObjects;
        this.targetIndex = this.targetComputerManager.targetIndex;
        this.currentTarget = this.targetComputerManager.currentTarget?.object || this.targetComputerManager.currentTarget;
        
        // Clear targeting cache when target list changes to prevent stale crosshair results
        if (window.targetingService) {
            window.targetingService.clearCache();
        }
    }

    cycleTarget(forward = true) {
        debug('TARGETING', `🎯 StarfieldManager.cycleTarget called (forward=${forward})`);
        
        if (!this.targetComputerManager) {
            debug('TARGETING', '🎯 ERROR: targetComputerManager is null/undefined');
            return;
        }
        if (!this.targetComputerManager.cycleTarget) {
            debug('TARGETING', '🎯 ERROR: targetComputerManager.cycleTarget method does not exist');
            return;
        }
        
        // Delegate to target computer manager
        debug('TARGETING', '🎯 StarfieldManager: Delegating to targetComputerManager.cycleTarget');
        this.targetComputerManager.cycleTarget(forward);
        debug('TARGETING', '🎯 StarfieldManager: Delegation complete');

        // Update local state to match
        this.currentTarget = this.targetComputerManager.currentTarget?.object || this.targetComputerManager.currentTarget;
        this.targetIndex = this.targetComputerManager.targetIndex;
        this.targetObjects = this.targetComputerManager.targetObjects;

        // DEBUG: Log target info for wireframe debugging
        setTimeout(() => {
            const currentTarget = this.targetComputerManager.currentTarget;
            debug('TARGETING', `Target object details: name=${currentTarget?.name}, id=${currentTarget?.id}, type=${currentTarget?.type}, hasObject=${!!currentTarget?.object}, objType=${currentTarget?.object?.type}, geometry=${currentTarget?.object?.geometry?.type}`);
        }, 100);
        
        // Update target display to reflect the new target in the UI
        if (this.targetComputerManager.updateTargetDisplay) {
            this.targetComputerManager.updateTargetDisplay();
        }
        
        // Handle outline suppression logic
        if (this.currentTarget && this.outlineEnabled && !this.outlineDisabledUntilManualCycle) {
            this.updateTargetOutline(this.currentTarget, 0);
        }

        // Update weapon system target
        const ship = this.viewManager?.getShip();
        if (ship && ship.weaponSystem) {
            ship.weaponSystem.setLockedTarget(this.currentTarget);
        }
    }

    /**
     * Set target from long-range scanner
     * @param {Object} targetData - Target data from long-range scanner
     */
    setTargetFromScanner(targetData) {
        // Delegate to target computer manager
        this.targetComputerManager.setTargetFromScanner(targetData);
        
        // Update local state to match
        this.currentTarget = this.targetComputerManager.currentTarget?.object || this.targetComputerManager.currentTarget;
        this.targetIndex = this.targetComputerManager.targetIndex;
        this.targetObjects = this.targetComputerManager.targetObjects;
        
        // Handle outline for scanner targets
        if (this.currentTarget && this.outlineEnabled) {
            this.updateTargetOutline(this.currentTarget, 0);
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
            // Calculate truly proportional deceleration rate to prevent oscillation near target
            const previousSpeed = this.currentSpeed;
            const speedDifference = this.currentSpeed - this.targetSpeed;

            // Truly proportional deceleration that scales with remaining distance
            // This prevents oscillation by ensuring deceleration decreases as we approach target
            const proportionalDecel = Math.min(this.deceleration, Math.max(0.001, speedDifference * 0.5));

            // Apply deceleration
            this.currentSpeed = Math.max(
                this.targetSpeed,
                this.currentSpeed - proportionalDecel
            );

            // Check if we've reached target speed
            const speedDiff = Math.abs(this.currentSpeed - this.targetSpeed);
            if (speedDiff < 0.01) {
                this.currentSpeed = this.targetSpeed;
                this.decelerating = false;

            }

            // Debug deceleration behavior
            const speedChange = Math.abs(this.currentSpeed - previousSpeed);

            // Check for oscillation (rapid changes near target)
            if (speedChange > 0.001 && speedDiff < 0.05) { // Small changes near target = potential oscillation

            }

            // Update engine sound during deceleration
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
            const speedDiff = this.targetSpeed - this.currentSpeed;

            // Truly proportional acceleration that scales with remaining distance
            // This prevents oscillation by ensuring acceleration decreases as we approach target
            const proportionalAccel = Math.min(this.acceleration, Math.max(0.001, speedDiff * 0.5));

            const newSpeed = Math.min(
                this.targetSpeed,
                this.currentSpeed + proportionalAccel
            );
            this.currentSpeed = newSpeed;

            // Debug acceleration behavior (commented out to reduce spam)
            // const accelSpeedDiff = Math.abs(this.currentSpeed - this.targetSpeed);

            // Check for oscillation (rapid changes near target)
            // const accelSpeedChange = Math.abs(this.currentSpeed - previousSpeed);
            // if (accelSpeedChange > 0.001 && accelSpeedDiff < 0.05) { // Small changes near target = potential oscillation

            // }

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
                // Impulse 4: Use consistent exponential formula like other speeds
                const reductionFactor = Math.pow(0.15, 4 - this.currentSpeed); // Same formula as impulse 1-3
                speedMultiplier *= reductionFactor;

            } else if (this.currentSpeed >= 5) {
                // Impulse 5+: Standard calculation without reduction

            }
            
            // Calculate actual movement based on current speed
            const forwardVector = new this.THREE.Vector3(0, 0, -speedMultiplier * moveDirection);
            forwardVector.applyQuaternion(this.camera.quaternion);

            // Debug speed vs movement correlation (commented out to reduce spam)
            // const movementMagnitude = forwardVector.length();

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

        // Update direction arrow after updating target display - delegate to target computer manager
        if (this.targetComputerManager) {
            // Sync the target computer enabled state only, not the current target
            this.targetComputerManager.targetComputerEnabled = this.targetComputerEnabled;
            
            if (this.targetComputerEnabled && this.currentTarget) {
                this.updateDirectionArrow();
            } else {
                // Hide all arrows - delegate to target computer manager
                this.targetComputerManager.hideAllDirectionArrows();
            }
        }
        
        // Update weapon system
        const ship = this.viewManager?.getShip();
        if (ship && ship.weaponSystem) {
            // Ensure WeaponHUD is connected (retry if needed)
            if (this.weaponHUD && !this.weaponHUDConnected) {
                // Throttle connection attempts to reduce console spam
                const now = Date.now();
                if (!this.lastWeaponHUDConnectionAttempt || (now - this.lastWeaponHUDConnectionAttempt) > 5000) {
debug('COMBAT', 'Attempting WeaponHUD connection during game loop...');
                    this.connectWeaponHUDToSystem();
                    this.lastWeaponHUDConnectionAttempt = now;
                }
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
debug('UTILITY', '⚡ StarfieldManager disposal started...');
        
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
debug('UTILITY', `🎯 StarfieldManager.setView('${viewType}') called`);
        console.trace('🎯 setView call stack');
        
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
        
debug('TARGETING', 'Target computer completely cleared - all state reset');
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
            // The proximity detector will handle its own validation
            const success = this.proximityDetector3D.toggle();
debug('UTILITY', 'StarfieldManager: 3D Proximity Detector toggle result:', success);
            return success;
        }
        return false;
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
        let diplomacyColor = '#44ffff'; // Default teal for unknown
        
        // Check if this is an enemy ship
        if (currentTargetData.isShip && currentTargetData.ship) {
            isEnemyShip = true;
            diplomacyColor = '#ff8888'; // Enemy ships are brighter red for better visibility
        } else if (info?.type === 'star') {
            diplomacyColor = '#ffff00'; // Stars are neutral yellow
        } else {
            // Convert faction to diplomacy if needed
            let diplomacy = info?.diplomacy?.toLowerCase();
            if (!diplomacy && info?.faction) {
                diplomacy = this.getFactionDiplomacy(info.faction).toLowerCase();
            }
            
            if (diplomacy === 'enemy') {
                diplomacyColor = '#ff8888'; // Enemy red (brighter for intel)
            } else if (diplomacy === 'neutral') {
                diplomacyColor = '#ffff00'; // Neutral yellow
            } else if (diplomacy === 'friendly') {
                diplomacyColor = '#00ff41'; // Friendly green
            }
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
            let diplomacyColor = '#44ffff'; // Default teal for unknown
            if (isEnemyShip) {
                diplomacyColor = '#ff3333'; // Enemy ships are darker neon red
            } else if (info?.type === 'star') {
                diplomacyColor = '#ffff00'; // Stars are neutral yellow
            } else {
                // Convert faction to diplomacy if needed
                let diplomacy = info?.diplomacy?.toLowerCase();
                if (!diplomacy && info?.faction) {
                    diplomacy = this.getFactionDiplomacy(info.faction).toLowerCase();
                }
                
                if (diplomacy === 'enemy') {
                    diplomacyColor = '#ff3333'; // Enemy red
                } else if (diplomacy === 'neutral') {
                    diplomacyColor = '#ffff00'; // Neutral yellow
                } else if (diplomacy === 'friendly') {
                    diplomacyColor = '#00ff41'; // Friendly green
                }
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

    /**
     * Initialize physics-based docking when physics system is ready
     */
    initializeSimpleDocking() {
        if (window.spatialManagerReady && window.collisionManagerReady && !this.simpleDockingManager) {
            this.simpleDockingManager = new SimpleDockingManager(
                this, 
                window.spatialManager, 
                window.collisionManager
            );
debug('UTILITY', 'Simple docking system initialized');
            
            // Start monitoring for docking opportunities
            this.simpleDockingManager.startDockingMonitoring();
        } else if (!this.simpleDockingManager) {
            console.warn('🚀 Cannot initialize SimpleDockingManager:', {
                spatialManagerReady: window.spatialManagerReady,
                collisionManagerReady: window.collisionManagerReady,
                spatialManager: !!window.spatialManager,
                collisionManager: !!window.collisionManager
            });
        }
    }

    /**
     * Show docking interface when docked to a station
     * @param {THREE.Object3D} target - The docked target (station/planet/moon)
     */
    showDockingInterface(target) {
        if (this.dockingInterface) {
debug('TARGETING', 'Showing docking interface for', target.name);
            this.dockingInterface.show(target);
        } else {
            console.warn('🚀 DockingInterface not available');
        }
    }

    /**
     * Safely get position from target object (handles different target structures)
     */
    getTargetPosition(target) {
        if (!target) return null;
        
        if (target.position && typeof target.position.clone === 'function') {
            // Three.js Vector3 object
            return target.position;
        } else if (target.object && target.object.position) {
            // Target has a nested object with position
            if (typeof target.object.position.clone === 'function') {
                // Already a Vector3
                return target.object.position;
            } else if (Array.isArray(target.object.position)) {
                // Position is stored as array [x, y, z]
                return new this.THREE.Vector3(...target.object.position);
            } else if (typeof target.object.position === 'object' && 
                       typeof target.object.position.x === 'number') {
                // Position is a plain object with x, y, z properties
                return new this.THREE.Vector3(target.object.position.x, target.object.position.y, target.object.position.z);
            } else {
                console.warn('🎯 Could not convert nested object position to Vector3:', target.object.position);
                return null;
            }
        } else if (target.position && Array.isArray(target.position)) {
            // Position is stored as array [x, y, z]
            if (!this.THREE || !this.THREE.Vector3) {
                console.error('🎯 THREE.js not available in StarfieldManager');
                return null;
            }
            return new this.THREE.Vector3(...target.position);
        } else if (target.position && typeof target.position === 'object' && 
                   typeof target.position.x === 'number') {
            // Position is a plain object with x, y, z properties
            if (!this.THREE || !this.THREE.Vector3) {
                console.error('🎯 THREE.js not available in StarfieldManager');
                return null;
            }
            return new this.THREE.Vector3(target.position.x, target.position.y, target.position.z);
        }
        
        console.warn('🎯 Could not extract position from target:', target);
        return null;
    }

    dock(target) {
        // Ensure guard flag exists
        if (typeof this._inPhysicsDocking !== 'boolean') {
            this._inPhysicsDocking = false;
        }
        // Initialize simple docking if not already done
        this.initializeSimpleDocking();

        // Use simple docking system for all targets
        const targetObject = target?.object || target;
        
        // DISABLED: This creates duplicate calls when SimpleDockingManager calls dock()
        // The unified docking system should handle everything
        // if (this.simpleDockingManager && !this._inPhysicsDocking) {
        //     // Avoid recursion: if docking path calls back into dock(), skip here
        //     this._inPhysicsDocking = true;
        //     const res = this.simpleDockingManager.initiateUnifiedDocking(targetObject);
        //     this._inPhysicsDocking = false;
        //     return res;
        // }

        // Fallback to original distance-based docking (planets/moons)
        if (!this.canDockWithLogging(target)) {
            return false;
        }

        // Get ship instance for docking procedures
        const ship = this.viewManager?.getShip();
        if (ship) {
            // Docking should not cost energy - docks are for refueling!
            // Energy cost removed to allow docking when low on power
debug('UTILITY', 'Docking procedures initiated - no energy cost');
        }

        // Store the current view before docking
        this.previousView = this.view;

        // Stop engine sounds and reduce speed immediately when docking starts
        if (this.audioManager && this.audioManager.getEngineState() === 'running') {
            this.playEngineShutdown();
debug('UTILITY', '🔇 Engine shutdown called during docking');
        } else {
debug('UTILITY', '🔇 Engine state check:', this.audioManager ? this.audioManager.getEngineState() : 'no audioManager');
        }
        
        // Immediately cut speed to 0 when docking initiates
        this.targetSpeed = 0;
        this.currentSpeed = 0;
        this.decelerating = false;

        // Calculate initial position relative to target
        const targetPosition = this.getTargetPosition(target);
        if (!targetPosition) {
            console.error('🚀 Cannot dock - invalid target position');
            return false;
        }
        
        const relativePos = new this.THREE.Vector3().subVectors(this.camera.position, targetPosition);
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
            targetPosition.x + Math.cos(this.orbitAngle) * this.orbitRadius,
            targetPosition.y,
            targetPosition.z + Math.sin(this.orbitAngle) * this.orbitRadius
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
            
            // Close galactic chart if open - navigation systems powered down when docked
            if (this.viewManager.galacticChart && this.viewManager.galacticChart.isVisible()) {
                this.viewManager.galacticChart.hide(false);

            }
            
            // Close long range scanner if open - scanner systems powered down when docked
            if (this.viewManager.longRangeScanner && this.viewManager.longRangeScanner.isVisible()) {
                this.viewManager.longRangeScanner.hide(false);
debug('UTILITY', '🚪 Long Range Scanner dismissed during docking - scanner systems powered down');
            }
            
            // Hide proximity detector if open - radar systems powered down when docked
            if (this.proximityDetector3D && this.proximityDetector3D.isVisible) {
                this.proximityDetector3D.isVisible = false;
                this.proximityDetector3D.detectorContainer.style.display = 'none';
debug('UTILITY', '🚪 Proximity Detector dismissed during docking - radar systems powered down');
            }
            
            // Hide subspace radio UI during docking
            if (this.viewManager.subspaceRadio && this.viewManager.subspaceRadio.isVisible) {
                this.viewManager.subspaceRadio.hide();
            }
            
            // Hide communication HUD during docking - stations have their own communication systems
            if (this.communicationHUD && this.communicationHUD.visible) {
                this.communicationHUD.hide();
debug('AI', '🚪 Communication HUD dismissed during docking - station communications available');
            }
            
            // Hide damage control HUD when docking since systems are powered down
            if (this.damageControlVisible) {
                this.damageControlVisible = false;
                this.damageControlHUD.hide();
                // Restore the previous view
                this.view = this.previousView || 'FORE';
debug('COMBAT', '🚪 Damage Control HUD dismissed during docking');
            }
            
            // Hide mission status HUD when docking - use station mission board instead
            if (this.missionStatusHUD && this.missionStatusHUD.visible) {
                this.missionStatusHUD.hide();
debug('UI', '🚪 Mission Status HUD dismissed during docking - use station Mission Board');
            }
            
            // Hide weapon HUD when docking since weapon systems are powered down
            if (this.weaponHUD && this.weaponHUD.weaponSlotsDisplay) {
                this.weaponHUD.weaponSlotsDisplay.style.display = 'none';
                this.weaponHUD.autofireIndicator.style.display = 'none';
                this.weaponHUD.targetLockIndicator.style.display = 'none';
                this.weaponHUD.unifiedDisplay.style.display = 'none';
debug('COMBAT', '🚪 Weapon HUD hidden during docking');
            }
            
            // Restore view to FORE if in modal view
            if (this.viewManager.currentView === 'GALACTIC' || this.viewManager.currentView === 'SCANNER') {
                this.viewManager.restorePreviousView();
            }
        }

        // Play command sound for successful dock
        this.playCommandSound();

        // Show station menu with services available at this location
        this.dockingInterface.show(target);

        // Update the dock button to show "LAUNCH"
        this.updateTargetDisplay();
        
        // Refresh missions for the docked station (cargo deliveries handled by physics docking for stations)
        if (target && target.userData && target.userData.name) {
            const stationKey = String(target.userData.name).toLowerCase().replace(/\s+/g, '_');
            
            // Refresh missions for the docked station
            setTimeout(() => {
                this.refreshStationMissions(stationKey);
            }, 1000);
        }
        
        return true;
    }

    /**
     * Check for cargo deliveries upon docking
     */
    async checkCargoDeliveries(stationKey) {
        try {
            const ship = this.viewManager?.getShip();
            if (!ship || !ship.cargoHoldManager) {
debug('AI', '🚛 No ship or cargo hold manager available for delivery check');
                return;
            }
            
            // Get all loaded cargo
            const loadedCargo = ship.cargoHoldManager.getLoadedCargo();
            if (!loadedCargo || loadedCargo.size === 0) {
debug('UTILITY', '🚛 No cargo loaded - skipping delivery check');
                return;
            }
            
debug('UTILITY', `🚛 Checking for cargo deliveries at ${stationKey} with ${loadedCargo.size} cargo items`);
            
            // Check each cargo item for delivery opportunities
            const cargoToRemove = [];
            
            for (const [cargoId, cargoItem] of loadedCargo.entries()) {
                if (cargoItem && cargoItem.commodityId) {
debug('UTILITY', `🚛 Attempting delivery of ${cargoItem.quantity} units of ${cargoItem.commodityId} to ${stationKey}`);
debug('TARGETING', `🚛 DEBUG: Original station name: "${stationKey}" (converted from docking target)`);
                    
                    // Trigger cargo delivery event
                    if (this.missionEventService) {
                        const result = await this.missionEventService.cargoDelivered(
                            cargoItem.commodityId,
                            cargoItem.quantity,
                            stationKey,
                            { 
                                playerShip: ship.shipType,
                                integrity: cargoItem.integrity || 1.0,
                                source: 'docking'  // Indicate this is auto-delivery on docking
                            }
                        );
                        
                        // If any missions were updated (cargo was delivered), calculate required quantity to remove
                        if (result && result.success && result.updated_missions.length > 0) {
debug('UTILITY', `🚛 Auto-delivery successful for ${cargoItem.commodityId}, calculating quantity to remove`);
                            
                            // Find the mission that was updated for this cargo type
                            let quantityToRemove = 0;
                            for (const mission of result.updated_missions) {
                                if (mission.mission_type === 'delivery' && 
                                    mission.custom_fields.cargo_type === cargoItem.commodityId &&
                                    mission.custom_fields.destination === stationKey) {
                                    
                                    const requiredQuantity = mission.custom_fields.cargo_amount || 50;
                                    const alreadyDelivered = mission.custom_fields.cargo_delivered || 0;
                                    
                                    // Calculate how much we need to remove (up to what we have in cargo)
                                    quantityToRemove = Math.min(requiredQuantity, cargoItem.quantity);
                                    
debug('AI', `🚛 Mission ${mission.id} requires ${requiredQuantity} units, delivered so far: ${alreadyDelivered}, removing: ${quantityToRemove} from available ${cargoItem.quantity}`);
                                    break;
                                }
                            }
                            
                            // Only remove if we found a valid quantity
                            if (quantityToRemove > 0) {
                                cargoToRemove.push({
                                    cargoId: cargoId,
                                    commodityId: cargoItem.commodityId,
                                    quantity: quantityToRemove
                                });
                            }
                        }
                    }
                }
            }
            
            // Remove delivered cargo from ship
            for (const cargo of cargoToRemove) {
                const removeResult = ship.cargoHoldManager.unloadCargo(cargo.cargoId, cargo.quantity);
                if (removeResult.success) {
debug('UTILITY', `🚛 Removed ${cargo.quantity} units of ${cargo.commodityId} from cargo hold (auto-delivery)`);
                } else {
                    console.error(`🚛 Failed to remove cargo ${cargo.commodityId}: ${removeResult.error}`);
                }
            }
            
            // Refresh cargo display if cargo was removed
            if (cargoToRemove.length > 0 && this.commodityExchange) {
                this.commodityExchange.refreshCargoDisplay();
            }
            
        } catch (error) {
            console.error('🚛 Error checking cargo deliveries:', error);
        }
    }

    /**
     * Complete docking for stations via physics path without re-entering routing logic
     */
    completeDockingStation(target) {
        // Set docking state
        this.isDocked = true;
        this.dockedTo = target;
        this.targetSpeed = 0;
        this.currentSpeed = 0;
        this.decelerating = false;

        // Hide crosshairs and power down systems similar to distance docking
        if (this.viewManager) {
            if (this.viewManager.frontCrosshair) this.viewManager.frontCrosshair.style.display = 'none';
            if (this.viewManager.aftCrosshair) this.viewManager.aftCrosshair.style.display = 'none';
            this.shutdownAllSystems();
            if (this.targetComputerEnabled && this.targetComputerManager) {
                this.targetComputerEnabled = false;
                this.targetComputerManager.hideTargetHUD();
                this.targetComputerManager.hideTargetReticle();
                this.targetComputerManager.clearTargetWireframe();
            }
            if (this.viewManager.galacticChart && this.viewManager.galacticChart.isVisible()) {
                this.viewManager.galacticChart.hide(false);
debug('UTILITY', '🚪 Galactic Chart dismissed during docking completion');
            }
            if (this.viewManager.longRangeScanner && this.viewManager.longRangeScanner.isVisible()) {
                this.viewManager.longRangeScanner.hide(false);
debug('UTILITY', '🚪 Long Range Scanner dismissed during docking completion');
            }
            if (this.proximityDetector3D && this.proximityDetector3D.isVisible) {
                this.proximityDetector3D.isVisible = false;
                this.proximityDetector3D.detectorContainer.style.display = 'none';
debug('UTILITY', '🚪 Proximity Detector dismissed during docking completion');
            }
            if (this.viewManager.subspaceRadio && this.viewManager.subspaceRadio.isVisible) {
                this.viewManager.subspaceRadio.hide();
            }
            if (this.communicationHUD && this.communicationHUD.visible) {
                this.communicationHUD.hide();
debug('UI', '🚪 Communication HUD dismissed during docking completion');
            }
            if (this.damageControlVisible && this.damageControlHUD) {
                this.damageControlVisible = false;
                this.damageControlHUD.hide();
                this.view = this.previousView || 'FORE';
            }
            if (this.weaponHUD && this.weaponHUD.weaponSlotsDisplay) {
                this.weaponHUD.weaponSlotsDisplay.style.display = 'none';
                this.weaponHUD.autofireIndicator.style.display = 'none';
                this.weaponHUD.targetLockIndicator.style.display = 'none';
                this.weaponHUD.unifiedDisplay.style.display = 'none';
            }
        }

        // Play feedback
        this.playCommandSound();
        return true;
    }
    undock() {
debug('UTILITY', 'StarfieldManager.undock() called');
debug('UTILITY', `🚀 this.isDocked: ${this.isDocked}`);
debug('UTILITY', `🚀 this.simpleDockingManager exists: ${!!this.simpleDockingManager}`);
debug('UTILITY', `🚀 this.simpleDockingManager.isDocked: ${this.simpleDockingManager?.isDocked}`);
        
        if (!this.isDocked) {
debug('UTILITY', 'Not docked - returning early');
            return;
        }

        // Use simple docking system launch if available
        if (this.simpleDockingManager && this.simpleDockingManager.isDocked) {
debug('UTILITY', 'Using SimpleDockingManager for launch - skipping old undock logic');
            const result = this.simpleDockingManager.launchFromStation();
debug('UTILITY', 'SimpleDockingManager.launchFromStation() returned:', result);
            return result;
        }
        
debug('AI', 'SimpleDockingManager not available or not docked - using old undock logic');
debug('UTILITY', `🚀 simpleDockingManager exists: ${!!this.simpleDockingManager}`);
debug('UTILITY', `🚀 simpleDockingManager.isDocked: ${this.simpleDockingManager?.isDocked}`);

        // Get ship instance for launch procedures
        const ship = this.viewManager?.getShip();
        if (ship) {
            // Use DockingSystemManager for comprehensive launch validation
            const launchValidation = this.dockingSystemManager.validateLaunch(ship);
            
            if (!launchValidation.canLaunch) {
                console.warn('Launch failed:', launchValidation.reasons.join(', '));
                // Show error in station menu instead of hiding it
                return;
            }
            
            if (launchValidation.warnings.length > 0) {
debug('UTILITY', 'Launch warnings:', launchValidation.warnings.join(', '));
            }
            
            // Launch should not cost energy - players should be able to leave even when low on power
debug('UTILITY', 'Launch procedures initiated - no energy cost');
        }

        // Store the target we're launching from before clearing it
        const launchTarget = this.dockedTo;

        // Hide station menu
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
debug('COMBAT', 'Weapon HUD restored after launch');
                
                // Update weapon HUD with current weapon system state
                const ship = this.viewManager?.getShip();
                if (ship && ship.weaponSystem) {
                    this.weaponHUD.updateWeaponSlotsDisplay(ship.weaponSystem.weaponSlots, ship.weaponSystem.activeSlotIndex);
                }
            }
            
            // Restore Mission Status HUD after launch (it was hidden during docking)
            if (this.missionStatusHUD && !this.missionStatusHUD.isVisible) {
                // Only show if there are active missions
                this.missionStatusHUD.refreshMissions().then(() => {
                    if (this.missionStatusHUD.activeMissions && this.missionStatusHUD.activeMissions.length > 0) {
                        this.missionStatusHUD.show();
debug('UI', 'Mission Status HUD restored after launch');
                    }
                }).catch(error => {
debug('UI', 'Mission Status HUD: No active missions to display after launch');
                });
            }
            
            // Remove flawed subspace radio state restoration - systems will be properly initialized above
        }
        
        // Ensure Target Computer leaves any power-up state on undock/launch
        if (this.targetComputerManager) {
            this.targetComputerManager.resetAfterUndock?.();
        }

        // Update the dock button to show "DOCK"
        this.updateTargetDisplay();
        this.updateSpeedIndicator();

        // Notify systems that launch has occurred to allow deferred notifications
        try {
            window.dispatchEvent(new CustomEvent('shipLaunched'));
        } catch (_) {}
    }

    /**
     * Launch from docked station (alias for undock)
     */
    launch() {
        return this.undock();
    }


    updateOrbit(deltaTime) {
        if (!this.isDocked || !this.dockedTo) return;
        
        // Debug: Log when orbit update is moving the camera
        if (Date.now() % 5000 < 100) { // Log every 5 seconds
debug('UTILITY', `🔄 updateOrbit() moving camera - isDocked: ${this.isDocked}, dockedTo: ${this.dockedTo?.name}`);
debug('UTILITY', `🔄 Camera position being set to orbit around: (${this.dockedTo.position.x.toFixed(2)}, ${this.dockedTo.position.y.toFixed(2)}, ${this.dockedTo.position.z.toFixed(2)})`);
        }

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
    async dockWithDebug(target) {
        // Ensure SimpleDockingManager is initialized
        if (!this.simpleDockingManager) {
debug('UTILITY', 'Initializing SimpleDockingManager for docking');
            this.initializeSimpleDocking();
        }
        
        // Use the new SimpleDockingManager for docking
        if (this.simpleDockingManager) {
debug('UTILITY', 'Using SimpleDockingManager for docking');
            const result = await this.simpleDockingManager.initiateUnifiedDocking(target);
            return result;
        } else {
            console.error('🚀 SimpleDockingManager could not be initialized - spatial/collision managers not ready');
            return false;
        }
    }

    undockWithDebug() {
        if (!this.isDocked) {
            return;
        }
        this.undock();
    }

    // Add new method to handle dock button clicks (launch is handled by station menu)
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
debug('UTILITY', '🛑 Shutting down all ship systems for docking');
        
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
debug('COMBAT', `  🛡️ Shields deactivated`);
                } else if (systemName === 'long_range_scanner' && system.isScanning) {
                    system.stopScan();
debug('UTILITY', `  📡 Scanner stopped`);
                } else if (systemName === 'target_computer' && system.isTargeting) {
                    system.deactivate();
debug('TARGETING', `  🎯 Targeting computer deactivated`);
                } else if (systemName === 'subspace_radio') {
                    if (system.isRadioActive) {
                        system.deactivateRadio();
                    }
                    if (system.isChartActive) {
                        system.deactivateChart();
                    }
debug('UTILITY', `  📻 Subspace radio deactivated`);
                } else if (systemName === 'impulse_engines') {
                    system.setImpulseSpeed(0);
                    system.setMovingForward(false);
debug('UTILITY', `  🚀 Impulse engines stopped`);
                } else if (system.isActive) {
                    system.deactivate();
debug('UTILITY', `  ⚡ ${systemName} deactivated`);
                }
            } catch (error) {
                console.warn(`Failed to shutdown system ${systemName}:`, error);
            }
        }
        
debug('UTILITY', '🛑 All ship systems shutdown complete');
    }
    
    /**
     * Restore all ship systems to their pre-docking state when undocking
     */
    async restoreAllSystems() {
debug('UTILITY', 'Restoring all ship systems after undocking');
        
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
debug('UTILITY', '⚡ Power management restored and enabled');
        }
        
        // Restore navigation computer
        if (this.ship.equipment.navigationComputer) {
            this.navigationComputerEnabled = true;

        }
        
        // Target computer should remain INACTIVE after launch - user must manually enable it
        if (this.ship.equipment.targetComputer) {
            this.targetComputerEnabled = false;  // Start inactive
debug('TARGETING', 'Target computer available but inactive - manual activation required');
            this.updateTargetDisplay();
        }
        
        // Restore defensive systems
        if (this.ship.equipment.defensiveSystems) {
            this.defensiveSystemsEnabled = true;
debug('UTILITY', 'Defensive systems restored and enabled');
        }
        
        // Restore ship status display
        if (this.ship.equipment.shipStatusDisplay) {
            this.shipStatusDisplayEnabled = true;
debug('UI', '📊 Ship status display restored and enabled');
        }
    }

    /**
     * Create target dummy ships for sub-targeting practice
     * @param {number} count - Number of dummy ships to create
     */
    async createTargetDummyShips(count = 3) {
debug('TARGETING', `🎯 Creating ${count} target dummy ships...`);
        
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
                
                // Add to spatial tracking for collision detection
                if (window.spatialManager && window.spatialManagerReady) {
                    // Calculate actual mesh size: 1.0m base * 1.5 scale = 1.5m
                    const baseMeshSize = 1.0; // REDUCED: 50% smaller target dummies (was 2.0)
                    const meshScale = 1.5; // From createDummyShipMesh()
                    const actualMeshSize = baseMeshSize * meshScale; // 1.5m visual size
                    
                    // Use collision size that matches visual mesh (what you see is what you get)
                    const useRealistic = window.useRealisticCollision !== false; // Default to realistic
                    const collisionSize = useRealistic ? actualMeshSize : 4.0; // Match visual or weapon-friendly
                    
                    window.spatialManager.addObject(shipMesh, {
                        type: 'enemy_ship',
                        name: `target_dummy_${i + 1}`,
                        radius: collisionSize / 2, // Convert diameter to radius
                        canCollide: true,
                        isTargetable: true,
                        layer: 'ships',
                        entityType: 'enemy_ship',
                        entityId: `target_dummy_${i + 1}`,
                        health: dummyShip.currentHull || 100,
                        ship: dummyShip
                    });
                    
                    // Also add to collision manager's ship layer
                    if (window.collisionManager) {
                        window.collisionManager.addObjectToLayer(shipMesh, 'ships');
                    }
                    
debug('TARGETING', `🎯 Target dummy added to spatial tracking: Visual=${actualMeshSize}m, Collision=${collisionSize}m (realistic=${useRealistic})`);
debug('TARGETING', `🚀 Spatial tracking created for Target Dummy ${i + 1}`);
                } else {
                    console.warn('⚠️ SpatialManager not ready - skipping spatial tracking for ships');
                }
                
                // Additional debug log with intended vs calculated distance
                const calculatedDistance = playerPosition.distanceTo(shipMesh.position);
                // Position debug info (DISABLED to reduce console spam)
                // console.log(`🎯 Target ${i + 1} positioned at ${(calculatedDistance / 1000).toFixed(1)}km (world coords: ${shipMesh.position.x.toFixed(1)}, ${shipMesh.position.y.toFixed(1)}, ${shipMesh.position.z.toFixed(1)})`);
                // console.log(`🎯   Player position: (${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)})`);
                // console.log(`🎯   Intended distance: ${(distance/1000).toFixed(1)}km, angle: ${(angle * 180 / Math.PI).toFixed(1)}°, height: ${(height*1000).toFixed(0)}m`);
                // console.log(`🎯   Calculated distance: ${(calculatedDistance/1000).toFixed(1)}km`);
                
                // Note: No physics body position sync needed with Three.js-based system
                // Spatial manager tracks objects directly by their Three.js positions
                
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
                        const targetPos = this.getTargetPosition(target);
                        if (targetIdentifier.position && targetPos) {
                            const posMatch = (
                                Math.abs(targetPos.x - targetIdentifier.position.x) < 0.01 &&
                                Math.abs(targetPos.y - targetIdentifier.position.y) < 0.01 &&
                                Math.abs(targetPos.z - targetIdentifier.position.z) < 0.01
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
        
debug('TARGETING', `✅ Target dummy ships created successfully - target preserved`);
    }

    /**
     * Handle waypoint creation asynchronously (called from keydown handler)
     */
    async handleWaypointCreationAsync() {
        try {
            await this.createWaypointTestMission();
        } catch (error) {
            console.error('❌ Error in handleWaypointCreationAsync:', error);
        }
    }

    /**
     * Create a waypoint test mission for development/testing
     */
    async createWaypointTestMission() {
        console.log('🎯 W key pressed - Creating waypoint test mission...');
        debug('WAYPOINTS', '🎯 W key pressed - Creating waypoint test mission...');
        
        // Check if waypoint manager is available
        console.log('🎯 Checking waypoint manager availability:', !!window.waypointManager);
        if (!window.waypointManager) {
            console.log('❌ Waypoint manager not available');
            this.playCommandFailedSound();
            this.showHUDEphemeral(
                'WAYPOINT SYSTEM UNAVAILABLE',
                'Waypoint manager not initialized'
            );
            return;
        }
        console.log('✅ Waypoint manager is available');
        
        try {
            // Create the test mission
            console.log('🎯 Calling waypointManager.createTestMission()...');
            const result = await window.waypointManager.createTestMission();
            console.log('🎯 createTestMission result:', result);
            
            if (result) {
                console.log('✅ Test mission created successfully');
                this.playCommandSound();
                this.showHUDEphemeral(
                    'TEST MISSION CREATED',
                    `${result.mission.title} - ${result.waypoints.length} waypoints added`
                );
                
                debug('WAYPOINTS', `✅ Test mission created: ${result.mission.title}`);
                
                // Show mission notification if available
                if (window.missionNotificationHandler && 
                    typeof window.missionNotificationHandler.showNotification === 'function') {
                    window.missionNotificationHandler.showNotification(
                        `Mission Available: ${result.mission.title}`,
                        'info'
                    );
                } else {
                    // Fallback notification using HUD
                    setTimeout(() => {
                        this.showHUDEphemeral(
                            'MISSION AVAILABLE',
                            `${result.mission.title} - Navigate to waypoints`
                        );
                    }, 2000);
                }
                
            } else {
                console.log('❌ Test mission creation returned null/false');
                this.playCommandFailedSound();
                this.showHUDEphemeral(
                    'MISSION CREATION FAILED',
                    'Unable to create waypoint test mission'
                );
            }
            
        } catch (error) {
            console.error('❌ Failed to create waypoint test mission:', error);
            console.error('❌ Error details:', error.stack);
            this.playCommandFailedSound();
            this.showHUDEphemeral(
                'MISSION CREATION ERROR',
                'System error during mission creation'
            );
        }
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
debug('TARGETING', '🧹 Physics body removed for target dummy ship');
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
     * Show a temporary ephemeral message in the HUD (errors, notifications, etc.)
     * @param {string} title - Message title
     * @param {string} message - Message content
     * @param {number} duration - Duration in milliseconds (default 3000)
     */
    showHUDEphemeral(title, message, duration = 3000) {
        // Create ephemeral message element if it doesn't exist
        if (!this.hudEphemeralElement) {
            this.hudEphemeralElement = document.createElement('div');
            this.hudEphemeralElement.style.cssText = `
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.9);
                color: #00ff00;
                padding: 12px 20px;
                border: 2px solid #00ff00;
                border-radius: 0;
                font-family: "Courier New", monospace;
                font-size: 14px;
                font-weight: bold;
                text-align: center;
                z-index: 10000;
                box-shadow: 0 0 10px #00ff00, inset 0 0 10px rgba(0, 255, 0, 0.1);
                text-shadow: 0 0 5px #00ff00;
                min-width: 300px;
                max-width: 500px;
                display: none;
                animation: slideInFromTop 0.3s ease-out;
                letter-spacing: 1px;
            `;
            
            // Add animation keyframes
            if (!document.getElementById('hud-ephemeral-animations')) {
                const style = document.createElement('style');
                style.id = 'hud-ephemeral-animations';
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
            
            document.body.appendChild(this.hudEphemeralElement);
        }
        
        // Set ephemeral message content with greenscreen terminal styling
        this.hudEphemeralElement.innerHTML = `
            <div style="
                font-size: 16px; 
                margin-bottom: 6px; 
                color: #00ff00;
                text-shadow: 0 0 8px #00ff00;
                letter-spacing: 2px;
                font-weight: bold;
            ">${title}</div>
            <div style="
                color: #00ff00;
                font-size: 12px;
                line-height: 1.3;
                text-shadow: 0 0 5px #00ff00;
                letter-spacing: 1px;
                opacity: 0.9;
            ">${message}</div>
        `;
        
        // Show the ephemeral message with animation
        this.hudEphemeralElement.style.display = 'block';
        this.hudEphemeralElement.style.animation = 'slideInFromTop 0.3s ease-out';
        
        // Hide after duration with animation
        setTimeout(() => {
            if (this.hudEphemeralElement) {
                this.hudEphemeralElement.style.animation = 'slideOutToTop 0.3s ease-in';
                setTimeout(() => {
                    if (this.hudEphemeralElement) {
                        this.hudEphemeralElement.style.display = 'none';
                    }
                }, 300);
            }
        }, duration);
        
        // Play error sound
        this.playCommandFailedSound();
    }

    /**
     * Show HUD error message (alias for showHUDEphemeral for backward compatibility)
     * @param {string} title - Error title
     * @param {string} message - Error message
     * @param {number} duration - Duration in milliseconds (default 3000)
     */
    showHUDError(title, message, duration = 3000) {
        // Delegate to showHUDEphemeral for consistent styling
        this.showHUDEphemeral(title, message, duration);
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
        let diplomacyColor = '#44ffff'; // Default teal for unknown
        if (isEnemyShip) {
            diplomacyColor = '#ff3333'; // Enemy ships are darker neon red
        } else if (info?.type === 'star') {
            diplomacyColor = '#ffff00'; // Stars are neutral yellow
        } else {
            // Convert faction to diplomacy if needed
            let diplomacy = info?.diplomacy?.toLowerCase();
            if (!diplomacy && info?.faction) {
                diplomacy = this.getFactionDiplomacy(info.faction).toLowerCase();
            }
            
            if (diplomacy === 'enemy') {
                diplomacyColor = '#ff3333'; // Enemy red
            } else if (diplomacy === 'neutral') {
                diplomacyColor = '#ffff00'; // Neutral yellow
            } else if (diplomacy === 'friendly') {
                diplomacyColor = '#00ff41'; // Friendly green
            }
        }
        this.targetComputerManager.setTargetHUDBorderColor(diplomacyColor);
        
        // Update wireframe container border color to match
        if (this.wireframeContainer) {
            this.wireframeContainer.style.borderColor = diplomacyColor;
        }

        // Delegate full Target CPU HUD rendering to TargetComputerManager to avoid double-rendering
        // and accidental overwrites (especially for space stations' sub-target UI)
        this.targetComputerManager.updateTargetDisplay();

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

        // Get target position using helper function
        const targetPosition = this.getTargetPosition(this.currentTarget);
        if (!targetPosition) {
            console.warn('🎯 Cannot update reticle - invalid target position');
            return;
        }

        // Ensure targetPosition is a Three.js Vector3 object
        if (typeof targetPosition.clone !== 'function') {
            console.error('🎯 targetPosition is not a Vector3 object:', targetPosition);
            console.error('🎯 currentTarget:', this.currentTarget);
            console.error('🎯 currentTarget.position:', this.currentTarget?.position);
            console.error('🎯 targetPosition type:', typeof targetPosition);
            console.error('🎯 targetPosition constructor:', targetPosition?.constructor?.name);
            return;
        }

        // Calculate target's screen position
        const screenPosition = targetPosition.clone().project(this.camera);
        const isOnScreen = Math.abs(screenPosition.x) <= 1 && Math.abs(screenPosition.y) <= 1;

        if (isOnScreen) {
            const x = (screenPosition.x + 1) * window.innerWidth / 2;
            const y = (-screenPosition.y + 1) * window.innerHeight / 2;
            
            const cameraForward = new this.THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            const relativePos = targetPosition.clone().sub(this.camera.position);
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
        const targetPos = this.getTargetPosition(this.currentTarget);
        const distance = targetPos ? this.calculateDistance(this.camera.position, targetPos) : 0;
        
        // Get target info for diplomacy status and display
        let info = null;
        let isEnemyShip = false;
        let targetName = 'Unknown Target';
        
        // Check if this is an enemy ship
        if (currentTargetData.isShip && currentTargetData.ship) {
            isEnemyShip = true;
            info = {
                type: 'enemy_ship',
                diplomacy: currentTargetData.diplomacy || currentTargetData.ship.diplomacy || 'enemy',
                faction: currentTargetData.faction || currentTargetData.ship.faction || currentTargetData.diplomacy || 'enemy',
                name: currentTargetData.ship.shipName,
                shipType: currentTargetData.ship.shipType
            };
            targetName = info.name || 'Enemy Ship';
            
            // Debug log for reticle color issue
debug('INSPECTION', `🎯 RETICLE DEBUG: Enemy ship detected - diplomacy: ${info.diplomacy}, faction: ${info.faction}, isEnemyShip: ${isEnemyShip}`);
            console.log(`🎯 RETICLE DEBUG: currentTargetData:`, {
                diplomacy: currentTargetData.diplomacy,
                faction: currentTargetData.faction,
                ship_diplomacy: currentTargetData.ship?.diplomacy,
                ship_faction: currentTargetData.ship?.faction,
                isShip: currentTargetData.isShip
            });
        } else {
            // Get celestial body info - need to pass the actual Three.js object
            const targetObject = this.currentTarget?.object || this.currentTarget;
            info = this.solarSystemManager.getCelestialBodyInfo(targetObject);
            
            // Fallback to target data name if celestial body info not found
            if (!info || !info.name) {
                const targetData = this.targetComputerManager.getCurrentTargetData();
                targetName = targetData?.name || 'Unknown Target';
            } else {
                targetName = info.name;
            }
        }
        
        // Determine reticle color based on diplomacy using faction color rules
        let reticleColor = '#44ffff'; // Default teal for unknown
        if (isEnemyShip) {
            reticleColor = '#ff0000'; // Enemy ships are bright red
        } else if (info?.type === 'star') {
            reticleColor = '#ffff00'; // Stars are neutral yellow
        } else {
            // Convert faction to diplomacy if needed
            let diplomacy = info?.diplomacy?.toLowerCase();
            if (!diplomacy && info?.faction) {
                diplomacy = this.getFactionDiplomacy(info.faction).toLowerCase();
            }
            
            if (diplomacy === 'enemy') {
                reticleColor = '#ff0000'; // Enemy territories are bright red
            } else if (diplomacy === 'neutral') {
                reticleColor = '#ffff00'; // Neutral territories are yellow
            } else if (diplomacy === 'friendly') {
                reticleColor = '#00ff41'; // Friendly territories are green
            } else if (diplomacy === 'unknown') {
                reticleColor = '#44ffff'; // Unknown territories are cyan
            }
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
        
        // Use the target data from TargetComputerManager which has the most up-to-date information
        const targetComputerData = this.targetComputerManager.getCurrentTargetData();
        if (targetComputerData) {
            return targetComputerData;
        }
        
        // Fallback to local target objects array
        return this.targetObjects[this.targetIndex];
    }

    calculateDistance(point1, point2) {
        // Use unified DistanceCalculator for consistent results across all systems
        return DistanceCalculator.calculate(point1, point2);
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
                
debug('COMBAT', '🎆 WeaponEffectsManager connected to ship');
                return true;
            }
        }
        return false;
    }

    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        
        if (this.debugMode) {
            this.playCommandSound();
debug('COMBAT', '🐛 DEBUG MODE ENABLED - Weapon hit detection spheres will be shown');
            this.showHUDEphemeral(
                'DEBUG MODE ENABLED',
                'Weapon hit detection spheres will be visible'
            );
        } else {
            this.playCommandSound();
debug('INSPECTION', '🐛 DEBUG MODE DISABLED - Cleaning up debug spheres');
            this.showHUDEphemeral(
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
            
debug('TARGETING', `🎯 Creating 3D outline for target: ${currentTargetData.name}`);
            
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
                
debug('TARGETING', `🎯 Created 3D outline for target: ${currentTargetData.name}`);
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
        if (!this.targetObjects || this.targetObjects.length === 0) {
            // Only log this message once per state change to avoid spam
            if (!this._noTargetsWarningLogged) {
                this._noTargetsWarningLogged = true;
            }
            if (this.targetOutline) {
                this.clearTargetOutline();
            }
            return;
        }
        
        // Reset warning flag when targets are available
        this._noTargetsWarningLogged = false;
        
        // Check if outlines are enabled and not suppressed
        if (!this.outlineEnabled || this.outlineDisabledUntilManualCycle) {
            if (this.targetOutline) {
                this.clearTargetOutline();
            }
            return;
        }
        
        // CRITICAL: Check if we have a valid current target
        if (!this.currentTarget) {
            if (this.targetOutline) {
                this.clearTargetOutline();
            }
            return;
        }
        
        // Validate target data before proceeding
        const targetData = this.getCurrentTargetData();
        if (!targetData || !targetData.name || targetData.name === 'unknown') {
            // Clear outline for invalid targets
            if (this.targetOutline) {
                this.clearTargetOutline();
            }
            return;
        }
        
        // Additional check: Ensure targetObject is valid and exists in scene
        if (!targetObject || !targetObject.position) {
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
debug('TARGETING', 'clearTargetOutline called');
debug('TARGETING', `   • targetOutline exists: ${!!this.targetOutline}`);
debug('TARGETING', `   • targetOutlineObject exists: ${!!this.targetOutlineObject}`);
        
        if (!this.targetOutline && !this.targetOutlineObject) {
debug('UTILITY', 'No outline objects to clear');
            return;
        }
        
        try {
            // Clear the 3D outline from scene
            if (this.targetOutline) {
debug('TARGETING', 'Removing targetOutline from scene');
                this.scene.remove(this.targetOutline);
                
                // Dispose of geometry and material to free memory
                if (this.targetOutline.geometry) {
                    this.targetOutline.geometry.dispose();
debug('TARGETING', 'Disposed targetOutline geometry');
                }
                if (this.targetOutline.material) {
                    this.targetOutline.material.dispose();
debug('TARGETING', 'Disposed targetOutline material');
                }
            }
            
            // Force clear both properties
            this.targetOutline = null;
            this.targetOutlineObject = null;
            
debug('TARGETING', '✅ Target outline completely cleared');
            
        } catch (error) {
            console.warn('❌ Error clearing target outline:', error);
            // Force clear even if there was an error
            this.targetOutline = null;
            this.targetOutlineObject = null;
debug('P1', 'Force-cleared outline properties after error');
        }
        
        // Double-check that they're actually cleared
        if (this.targetOutline || this.targetOutlineObject) {
            console.error('⚠️ WARNING: Outline properties still exist after clearing!');
debug('TARGETING', `   • targetOutline: ${this.targetOutline}`);
debug('TARGETING', `   • targetOutlineObject: ${this.targetOutlineObject}`);
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
        
debug('TARGETING', `🎯 Target outline ${this.outlineEnabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Get the appropriate outline color based on target type
     * @param {Object} targetData - Target data from getCurrentTargetData()
     * @returns {string} Hex color string
     */
    getOutlineColorForTarget(targetData) {
        if (!targetData) return '#44ffff'; // Teal for unknown
        
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
        
debug('TARGETING', `💥 removeDestroyedTarget called for: ${destroyedShip.shipName || 'unknown ship'}`);
        
        // Send mission event for enemy destruction
        this.sendEnemyDestroyedEvent(destroyedShip);
        
        // First, physically remove the ship from the scene and arrays
        let shipMesh = null;
        
        // Find the mesh for this ship
        for (let i = this.dummyShipMeshes.length - 1; i >= 0; i--) {
            const mesh = this.dummyShipMeshes[i];
            if (mesh.userData.ship === destroyedShip) {
                shipMesh = mesh;
                
                // Remove from the scene
debug('UTILITY', `🗑️ Removing ${destroyedShip.shipName} mesh from scene`);
                this.scene.remove(mesh);
                
                // CRITICAL: Remove physics rigid body for destroyed ship
                if (window.physicsManager && typeof window.physicsManager.removeRigidBody === 'function') {
debug('PHYSICS', `🗑️ Removing ${destroyedShip.shipName} rigid body from physics world`);
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
debug('UTILITY', `🗑️ Removed ${destroyedShip.shipName} from dummyShipMeshes array`);
                break;
            }
        }

        // Also support removing destroyed navigation beacons (by Three.js object)
        if (!shipMesh && this.navigationBeacons && destroyedShip.isBeacon) {
            for (let i = this.navigationBeacons.length - 1; i >= 0; i--) {
                const mesh = this.navigationBeacons[i];
                if (mesh === destroyedShip || mesh.userData === destroyedShip || mesh.userData?.isBeacon === true && mesh === destroyedShip) {

                    this.scene.remove(mesh);
                    if (window.physicsManager && typeof window.physicsManager.removeRigidBody === 'function') {
                        window.physicsManager.removeRigidBody(mesh);
                    }
                    if (mesh.geometry) mesh.geometry.dispose();
                    if (mesh.material) mesh.material.dispose();
                    this.navigationBeacons.splice(i, 1);
                    break;
                }
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
        
debug('TARGETING', `🔍 Targeting analysis:`);
debug('TARGETING', `   • HUD targets destroyed ship: ${hudTargetsDestroyed}`);
debug('TARGETING', `   • Weapon targets destroyed ship: ${weaponTargetsDestroyed}`);
debug('TARGETING', `   • Target computer targets destroyed ship: ${tcTargetsDestroyed}`);
debug('TARGETING', `   • Outline targets destroyed ship: ${outlineTargetsDestroyed}`);
debug('TARGETING', `   • Any system targeting: ${anySystemTargeting}`);
        
        if (anySystemTargeting) {
debug('TARGETING', 'Destroyed ship was targeted - performing full synchronization cleanup');
            
            // Clear ALL targeting system references
            this.currentTarget = null;
            this.targetIndex = -1;
            
            if (ship?.weaponSystem) {
                ship.weaponSystem.setLockedTarget(null);
                
                // Turn off autofire when main target is destroyed
                // This doesn't apply to sub-targets, only when the entire ship is destroyed
                if (ship.weaponSystem.isAutofireOn) {
                    ship.weaponSystem.isAutofireOn = false;
debug('TARGETING', 'Autofire turned OFF - main target destroyed');
                    
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
debug('TARGETING', 'Clearing 3D outline for destroyed target');
            this.clearTargetOutline();
            
            // Update target list to remove destroyed ship
            this.updateTargetList();
            
            // Select new target using proper cycling logic
            if (this.targetObjects && this.targetObjects.length > 0) {
debug('TARGETING', `🔄 Cycling to new target from ${this.targetObjects.length} available targets`);
                
                // Prevent outlines from appearing automatically after destruction
                this.outlineDisabledUntilManualCycle = true;
                
                // Cycle to next target without creating outline (automatic cycle)
                this.cycleTarget(false);
                
debug('TARGETING', 'Target cycled after destruction - outline disabled until next manual cycle');
            } else {
debug('TARGETING', '📭 No targets remaining after destruction');
                
                // CRITICAL: Force clear outline again when no targets remain
debug('TARGETING', 'Force-clearing outline - no targets remaining');
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
debug('TARGETING', 'Destroyed ship was not targeted by any system - minimal cleanup');
            
            // Check if autofire was targeting this ship even if not officially "targeted"
            if (ship?.weaponSystem?.isAutofireOn && ship.weaponSystem.lockedTarget) {
                // Check if the destroyed ship matches the autofire target
                const autofireTargetShip = ship.weaponSystem.lockedTarget.ship;
                if (autofireTargetShip === destroyedShip) {
                    ship.weaponSystem.isAutofireOn = false;
                    ship.weaponSystem.setLockedTarget(null);
debug('TARGETING', 'Autofire turned OFF - autofire target destroyed');
                    
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
debug('UTILITY', 'Force-clearing 3D outline for safety');
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
        
debug('TARGETING', `✅ removeDestroyedTarget complete for: ${destroyedShip.shipName || 'unknown ship'}`);
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

    // NEW: Calculate safe launch distance - simple 2x docking distance rule + object radius
    calculateSafeLaunchDistance(launchTarget) {
        // Get the docking range for the target we're launching from
        const targetInfo = this.solarSystemManager?.getCelestialBodyInfo(launchTarget);
        let dockingRange = 1.5; // Default for moons
        
        if (targetInfo?.type === 'planet') {
            dockingRange = 4.0; // Planets have 4km docking range
        } else if (targetInfo?.type === 'station') {
            // For stations, check if they have a custom docking range
            dockingRange = launchTarget.userData?.dockingRange || 2.0;
        }
        
        // Get the object's radius to ensure we launch from the surface, not the center
        const objectRadius = launchTarget.geometry?.parameters?.radius || 
                           launchTarget.userData?.radius || 
                           (targetInfo?.type === 'planet' ? 1.2 : 0.3); // Default radii
        
        // Launch distance = object radius + (2x docking range)
        // This ensures we're 2x docking range away from the surface, not the center
        const launchDistance = objectRadius + (dockingRange * 2.0);
        
debug('UTILITY', `🚀 Launch distance calculated: ${launchDistance.toFixed(1)}km (${objectRadius.toFixed(1)}km radius + 2x ${dockingRange.toFixed(1)}km docking range)`);
        return launchDistance;
    }

    /**
     * Shutdown all ship systems when docking - properly power down without trying to save state
     */
    shutdownAllSystems() {
debug('UTILITY', '🛑 Shutting down all ship systems for docking');
        
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
debug('COMBAT', `  🛡️ Shields deactivated`);
                } else if (systemName === 'long_range_scanner' && system.isScanning) {
                    system.stopScan();
debug('UTILITY', `  📡 Scanner stopped`);
                } else if (systemName === 'target_computer' && system.isTargeting) {
                    system.deactivate();
debug('TARGETING', `  🎯 Targeting computer deactivated`);
                } else if (systemName === 'subspace_radio') {
                    if (system.isRadioActive) {
                        system.deactivateRadio();
                    }
                    if (system.isChartActive) {
                        system.deactivateChart();
                    }
debug('UTILITY', `  📻 Subspace radio deactivated`);
                } else if (systemName === 'impulse_engines') {
                    system.setImpulseSpeed(0);
                    system.setMovingForward(false);
debug('UTILITY', `  🚀 Impulse engines stopped`);
                } else if (system.isActive) {
                    system.deactivate();
debug('UTILITY', `  ⚡ ${systemName} deactivated`);
                }
            } catch (error) {
                console.warn(`Failed to shutdown system ${systemName}:`, error);
            }
        }
        
debug('UTILITY', '🛑 All ship systems shutdown complete');
    }
    
    /**
     * Initialize all ship systems for launch - fresh setup regardless of previous state
     * This is the unified method that should be used for ALL ship initialization scenarios
     */
    async initializeShipSystems() {
debug('UTILITY', 'Initializing ship systems for launch');
        
        const ship = this.viewManager?.getShip();
        if (!ship) {
            console.warn('No ship available for system initialization');
            return;
        }

        // CRITICAL: Force refresh ship systems from current card configuration
        // This ensures that any equipment changes made while docked are properly applied
        if (ship.cardSystemIntegration) {
debug('UI', '🔄 Refreshing ship systems from current card configuration...');
            try {
                // Force reload cards from the current ship configuration
                await ship.cardSystemIntegration.loadCards();
                
                // Recreate all systems from the refreshed card data
                // Check if systems already exist to prevent duplicates
                const existingSystemCount = ship.systems ? ship.systems.size : 0;
                debug('SYSTEM_FLOW', `🔍 StarfieldManager check: existing systems = ${existingSystemCount}`);

                if (existingSystemCount === 0) {
                    debug('SYSTEM_FLOW', '🚀 StarfieldManager creating systems from cards');
                    await ship.cardSystemIntegration.createSystemsFromCards();
                } else {
                    debug('SYSTEM_FLOW', '⏭️ StarfieldManager skipping system creation - systems already exist');
                }
                
                // Re-initialize cargo holds from updated cards
                if (ship.cargoHoldManager) {
                    ship.cargoHoldManager.initializeFromCards();
                }
                
debug('UI', '✅ Ship systems refreshed from cards - equipment changes applied');
            } catch (error) {
                console.error('❌ Failed to refresh ship systems from cards:', error);
            }
        }
        
        // Initialize power management
        if (ship.equipment?.powerManagement) {
            this.powerManagementEnabled = true;
debug('UTILITY', '  ⚡ Power management initialized and enabled');
        }
        
        // Initialize navigation computer
        if (ship.equipment?.navigationComputer) {
            this.navigationComputerEnabled = true;

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
debug('TARGETING', '  🎯 Targeting computer initialized (ACTIVE) - state synchronized, targets cleared');
            } else {
debug('TARGETING', '  🎯 Targeting computer initialized (INACTIVE) - ready for activation');
            }
            
debug('TARGETING', `  🎯 Target state cleared: currentTarget=${this.currentTarget}, targetIndex=${this.targetIndex}`);
        } else {
            this.targetComputerEnabled = false;
            // Still clear target state even without targeting computer
            this.currentTarget = null;
            this.targetedObject = null;
            this.clearTargetOutline();
debug('TARGETING', '  🎯 No targeting computer available - target state cleared');
        }
        
        // Initialize shields
        const shieldSystem = ship.getSystem('shields');
        if (shieldSystem) {
            this.shieldsEnabled = shieldSystem.isActive;
debug('COMBAT', `  🛡️ Shields initialized: ${this.shieldsEnabled ? 'enabled' : 'disabled'}`);
        }
        
        // Initialize scanning systems
        const scannerSystem = ship.getSystem('scanners');
        if (scannerSystem) {
            this.scannersEnabled = scannerSystem.isActive;
debug('UTILITY', `  📡 Scanners initialized: ${this.scannersEnabled ? 'enabled' : 'disabled'}`);
        }
        
        // Initialize weapon systems using the unified approach
        await this.initializeWeaponSystems();
        
        // Initialize engine systems
        const engineSystem = ship.getSystem('impulse_engines');
        if (engineSystem) {
            this.enginesEnabled = engineSystem.isActive;
debug('UTILITY', `  🚀 Engines initialized: ${this.enginesEnabled ? 'enabled' : 'disabled'}`);
        }
        
        // Initialize communication systems
        const radioSystem = ship.getSystem('subspace_radio');
        if (radioSystem) {
            this.radioEnabled = radioSystem.isActive;
debug('UTILITY', `  📻 Radio initialized: ${this.radioEnabled ? 'enabled' : 'disabled'}`);
        }
        
debug('UTILITY', '✅ Ship systems initialization complete - all states synchronized');
    }
    
    /**
     * Initialize weapon systems and ensure proper HUD connection
     * Critical for ensuring weapons are properly registered with the HUD
     */
    async initializeWeaponSystems() {
debug('COMBAT', '  🔫 Initializing weapon systems and HUD integration...');
        
        try {
            const ship = this.viewManager?.getShip();
            if (!ship) {
debug('COMBAT', '    🔍 Ship initializing - weapon system setup deferred');
                return;
            }

            // CRITICAL: Reinitialize the weapon system using WeaponSyncManager
            // This ensures weapons are properly loaded from the current card configuration
            if (ship.weaponSyncManager) {
debug('COMBAT', '    🔄 Reinitializing weapon system from current card configuration...');
                
                // Force a complete weapon system refresh
                ship.weaponSystem = await ship.weaponSyncManager.initializeWeapons();
                
debug('COMBAT', '    ✅ Weapon system reinitialized with current equipment');
            } else if (ship.initializeWeaponSystem) {
                // Fallback: use ship's built-in weapon system initialization
                await ship.initializeWeaponSystem();
debug('COMBAT', '    ✅ Weapon system initialized using fallback method');
            }
            
            // Ensure weapon effects manager is initialized
            this.ensureWeaponEffectsManager();
            
            // Connect weapon HUD to ship systems
            this.connectWeaponHUDToSystem();
            
            // Update weapon selection UI to reflect current ship loadout
            await this.updateWeaponSelectionUI();
            
debug('COMBAT', '  🔫 Weapon systems initialization complete');
        } catch (error) {
            console.error('  ❌ Failed to initialize weapon systems:', error);
        }
    }
    
    /**
     * Update weapon selection UI to reflect current ship loadout
     * Ensures weapon HUD shows correct weapon counts and types
     */
    async updateWeaponSelectionUI() {
debug('COMBAT', '    🎯 Updating weapon selection UI...');
        
        const ship = this.viewManager?.getShip();
        if (!ship) {
            return;
        }
        
        const weaponsSystem = ship.getSystem('weapons');
        if (!weaponsSystem) {
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
debug('COMBAT', '🔫 StarfieldManager: Weapon system ready notification received');
        
        // Try to connect WeaponHUD immediately
        if (this.weaponHUD && !this.weaponHUDConnected) {
debug('COMBAT', 'Attempting immediate WeaponHUD connection...');
            this.connectWeaponHUDToSystem();
            
            // If connection successful, clear the retry interval
            if (this.weaponHUDConnected && this.weaponHUDRetryInterval) {
                clearInterval(this.weaponHUDRetryInterval);
                this.weaponHUDRetryInterval = null;
debug('COMBAT', '✅ WeaponHUD connected immediately, retry interval cleared');
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
        let diplomacyColor = '#44ffff'; // Default teal for unknown
        let isCelestialBody = false;
        let isSpaceStation = false;
        
        if (isEnemyShip) {
            diplomacyColor = '#ff3333'; // Enemy ships are darker neon red
        } else {
            // Get celestial body info for non-ship targets
            const info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
            if (info) {
                isCelestialBody = true; // Mark as celestial body
                
                // Check if it's a space station
                isSpaceStation = info.type === 'station' || 
                                 (currentTargetData && currentTargetData.isSpaceStation) ||
                                 (this.currentTarget && this.currentTarget.userData && this.currentTarget.userData.isSpaceStation);
                
                if (info.type === 'star') {
                    diplomacyColor = '#ffff00'; // Stars are neutral yellow
                } else {
                    // Convert faction to diplomacy if needed
                    let diplomacy = info?.diplomacy?.toLowerCase();
                    if (!diplomacy && info?.faction) {
                        diplomacy = this.getFactionDiplomacy(info.faction).toLowerCase();
                    }
                    
                    if (diplomacy === 'enemy') {
                        diplomacyColor = '#ff3333'; // Enemy red
                    } else if (diplomacy === 'neutral') {
                        diplomacyColor = '#ffff00'; // Neutral yellow
                    } else if (diplomacy === 'friendly') {
                        diplomacyColor = '#00ff41'; // Friendly green
                    }
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
        } else if (isCelestialBody && !isSpaceStation) {
            available = false;
            reason = 'Celestial bodies don\'t have subsystems';
            statusColor = '#ff3333';
        } else if (!isEnemyShip && !isSpaceStation) {
            available = false;
            reason = 'Target must be a ship or station with subsystems';
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
debug('TARGETING', `🎯 Sub-targeting check for: ${weaponName}`);
debug('COMBAT', `🎯 Weapon type: ${weaponType}`);
debug('COMBAT', `🎯 Weapon card:`, weaponCard);

        // Check if current weapon supports sub-targeting (scan-hit weapons only)
        const canActuallyTarget = (weaponType === 'scan-hit');
        
        if (!canActuallyTarget) {
            // Show message that projectiles can't target but allow scanning to continue
            if (weaponType === 'splash-damage') {
                ship.weaponSystem?.showMessage(`${weaponName}: Projectile weapons don't support sub-targeting`, 4000);
            } else {
                ship.weaponSystem?.showMessage(`${weaponName}: Sub-targeting not supported (type: ${weaponType})`, 4000);
            }
            // Don't return - allow scanning to continue
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
                this.updateTargetDisplay(); // Update main HUD display
                
                // Also update Target Computer Manager display for sub-targeting UI
                if (this.targetComputerManager) {
                    this.targetComputerManager.updateTargetDisplay();
                }
                
                // Show brief confirmation - different message based on weapon capability
                const subTargetName = targetComputer.currentSubTarget?.displayName || 'Unknown';
                
                if (canActuallyTarget) {
                    // Scan-hit weapons can actually target sub-systems
                    ship.weaponSystem?.showMessage(`Targeting: ${subTargetName}`, 2000);
                } else {
                    // Projectile weapons can only scan, not target
                    const weaponTypeName = weaponType === 'splash-damage' ? 'projectiles' : weaponType;
                    ship.weaponSystem?.showMessage(`System Targeting unavailable for ${weaponTypeName}`, 3000);
                }
            } else {
                this.playCommandFailedSound();
            }
        }
    }

    /**
     * Show communication message from mission or AI system
     * @param {string} npcName - Name of the NPC sending the message
     * @param {string} message - The message text
     * @param {Object} options - Optional settings (channel, signal strength, duration)
     */
    showCommunication(npcName, message, options = {}) {
        if (this.communicationHUD) {
            this.communicationHUD.showMessage(npcName, message, options);
            return true;
        }
        console.warn('🗣️ Communication HUD not available');
        return false;
    }

    /**
     * Hide communication HUD
     */
    hideCommunication() {
        if (this.communicationHUD) {
            this.communicationHUD.hide();
        }
    }

    /**
     * Check if communication HUD is visible
     */
    isCommunicationVisible() {
        return this.communicationHUD ? this.communicationHUD.visible : false;
    }

    /**
     * Show mission completion screen
     * @param {string} missionId - Mission identifier
     * @param {Object} completionData - Mission completion data with rewards
     */
    async showMissionComplete(missionId, completionData) {
        if (this.missionCompletionUI) {
            await this.missionCompletionUI.showMissionComplete(missionId, completionData);
            return true;
        }
        console.warn('🎯 Mission completion UI not available');
        return false;
    }

    /**
     * Pause game for mission completion (optional)
     */
    pauseForMissionComplete() {
        // Optional: pause game systems during mission completion
debug('MISSIONS', 'Game paused for mission completion');
    }

    /**
     * Resume game after mission completion
     */
    resumeFromMissionComplete() {
        // Resume game systems after mission completion
debug('MISSIONS', 'Game resumed from mission completion');
    }

    /**
     * Check if mission status HUD is visible
     */
    isMissionStatusVisible() {
        return this.missionStatusHUD ? this.missionStatusHUD.visible : false;
    }

    /**
     * Hide mission status HUD
     */
    hideMissionStatus() {
        if (this.missionStatusHUD) {
            this.missionStatusHUD.hide();
        }
    }

    /**
     * Show mission status HUD
     */
    showMissionStatus() {
        if (this.missionStatusHUD) {
            this.missionStatusHUD.show();
        }
    }

    /**
     * Send mission notification via Communication HUD
     * @param {string} npcName - Name of the NPC/organization sending the message
     * @param {string} message - The notification message
     * @param {Object} options - Notification options (channel, status, duration, etc.)
     */
    sendMissionNotification(npcName, message, options = {}) {
        if (this.missionNotificationHandler) {
            this.missionNotificationHandler.sendMissionNotification(npcName, message, options);
            return true;
        }
        console.warn('🎯 Mission notification handler not available');
        return false;
    }

    /**
     * Send mission briefing
     * @param {Object} mission - Mission data
     */
    sendMissionBriefing(mission) {
        if (this.missionNotificationHandler) {
            this.missionNotificationHandler.sendMissionBriefing(mission);
            return true;
        }
        console.warn('🎯 Mission notification handler not available');
        return false;
    }

    /**
     * Update mission system with current player data
     */
    updateMissionSystemPlayerData() {
        if (!this.ship) return;
        
        const playerData = {
            level: this.ship.level || 1,
            credits: this.ship.credits || 50000,
            ship_type: this.ship.shipType || 'starter_ship',
            faction_standings: this.ship.factionStandings || {
                'terran_republic_alliance': 0,
                'traders_guild': 0,
                'scientists_consortium': 0
            }
        };
        
        // Update all mission components with player data
        if (this.missionAPI) {
            this.missionAPI.updatePlayerData(playerData);
        }
        
        if (this.missionStatusHUD) {
            this.missionStatusHUD.updatePlayerData(playerData);
        }
        
    }
    
    /**
     * Update mission system with current player location
     */
    updateMissionSystemLocation(location) {
        if (this.missionAPI) {
            this.missionAPI.setPlayerLocation(location);
        }
        
        if (this.missionStatusHUD) {
            this.missionStatusHUD.setPlayerLocation(location);
        }
        
debug('MISSIONS', `🎯 StarfieldManager: Updated mission system location to ${location}`);
    }
    
    /**
     * Initialize mission system on game start
     * 
     * TESTING MODE: When TESTING_CONFIG.NO_PERSISTENCE is true,
     * all persistent data is cleared on startup to simulate
     * fresh sessions without any carry-over between game restarts.
     */
    async initializeMissionSystem() {
debug('MISSIONS', 'Initializing mission system...');
        
        try {
            // Update player data first
            this.updateMissionSystemPlayerData();
            
            // Test backend connection
            const isConnected = await this.missionAPI.testConnection();
            
            if (isConnected) {
debug('MISSIONS', 'Mission API connected, pre-populating stations...');
                
                // TESTING PHASE: Clear old data for fresh start (no persistence between sessions)
                if (TESTING_CONFIG.NO_PERSISTENCE) {
debug('UTILITY', 'TESTING MODE ACTIVE: Clearing all persistent data for fresh start...');
                    
                    const activeCount = await this.missionAPI.getActiveMissions();
                    if (activeCount.length > 0) {
debug('MISSIONS', `🧪 TESTING MODE: Found ${activeCount.length} old active missions, clearing...`);
                        await this.missionAPI.clearActiveMissions();
debug('MISSIONS', 'TESTING MODE: All old missions cleared');
                    } else {
debug('MISSIONS', 'TESTING MODE: No old missions found - clean start');
                    }
                    
                    // Clear other persistent data for fresh testing session
                    // - Player progress/stats
                    // - Ship configurations
                    // - Credits/inventory ✅ Implemented
                    // - Faction standings
                    
                    // Reset credits to starting amount
                    const { playerCredits } = await import('../utils/PlayerCredits.js');
                    playerCredits.reset();
debug('UTILITY', 'TESTING MODE: Credits reset to starting amount');
                    
debug('MISSIONS', 'TESTING MODE: Fresh session initialized - NO mission pre-population');
                } else {
                    // Only pre-populate missions when NOT in testing mode
                    await this.prePopulateStationMissions();
                }
            } else {
debug('AI', 'Mission API not available, missions will use fallback data');
            }
            
        } catch (error) {
            console.error('🎯 Failed to initialize mission system:', error);
        }
    }
    
    /**
     * Pre-populate all stations with appropriate missions
     */
    async prePopulateStationMissions() {
        const stations = this.getGameStations();
        
debug('MISSIONS', `🎯 Pre-populating ${stations.length} stations with missions...`);
        
        for (const station of stations) {
            try {
                await this.ensureStationHasMissions(station);
                // Small delay to avoid overwhelming the API
                await this.delay(500);
            } catch (error) {
                console.error(`🎯 Failed to populate missions for ${station.key}:`, error);
            }
        }
        
debug('MISSIONS', 'Station mission pre-population complete');
    }
    
    /**
     * Get all game stations that should have missions
     */
    getGameStations() {
        // Available templates: elimination, escort, exploration, delivery
        return [
            {
                key: 'terra_prime',
                name: 'Terra Prime',
                type: 'military_hub',
                faction: 'terran_republic_alliance',
                templates: ['elimination', 'escort'],
                minMissions: 3,
                maxMissions: 6
            },
            {
                key: 'europa_research_station',
                name: 'Europa Station',
                type: 'research_station',
                faction: 'scientists_consortium',
                templates: ['exploration', 'delivery'],
                minMissions: 2,
                maxMissions: 4
            },
            {
                key: 'ceres_outpost',
                name: 'Ceres Outpost',
                type: 'trade_hub',
                faction: 'traders_guild',
                templates: ['delivery', 'escort'],
                minMissions: 3,
                maxMissions: 5
            },
            {
                key: 'mars_base',
                name: 'Mars Base',
                type: 'military_base',
                faction: 'terran_republic_alliance',
                templates: ['elimination', 'escort'],
                minMissions: 2,
                maxMissions: 4
            },
            {
                key: 'luna_port',
                name: 'Luna Port',
                type: 'commercial_port',
                faction: 'traders_guild',
                templates: ['delivery', 'escort'],
                minMissions: 2,
                maxMissions: 3
            },
            {
                key: 'asteroid_mining_platform',
                name: 'Asteroid Mining Platform',
                type: 'industrial',
                faction: 'miners_union',
                templates: ['elimination', 'escort'],
                minMissions: 1,
                maxMissions: 3
            }
        ];
    }
    
    /**
     * Ensure a station has the right number of missions
     */
    async ensureStationHasMissions(station) {
        try {
            // Check current missions at this station
            const currentMissions = await this.missionAPI.getAvailableMissions(station.key);
            const currentCount = currentMissions.length;
            
debug('MISSIONS', `🎯 ${station.name}: ${currentCount} existing missions`);
            
            // Generate missions if below minimum
            if (currentCount < station.minMissions) {
                const missionsToGenerate = station.minMissions - currentCount;
debug('MISSIONS', `🎯 Generating ${missionsToGenerate} missions for ${station.name}`);
                
                for (let i = 0; i < missionsToGenerate; i++) {
                    // Select template based on station type
                    const template = this.selectStationTemplate(station);
                    
                    try {
                        const result = await this.missionAPI.generateMission(template, station.key);
                        
                        if (result.success) {
debug('MISSIONS', `🎯 Generated ${template} mission for ${station.name}: ${result.mission.title}`);
                        } else {
                            console.warn(`🎯 Failed to generate ${template} for ${station.name}: ${result.error}`);
                        }
                        
                        // Small delay between generations
                        await this.delay(200);
                        
                    } catch (error) {
                        console.error(`🎯 Error generating ${template} for ${station.name}:`, error);
                    }
                }
            } else {
debug('MISSIONS', `🎯 ${station.name} has sufficient missions (${currentCount}/${station.minMissions})`);
            }
            
        } catch (error) {
            console.error(`🎯 Failed to check missions for ${station.name}:`, error);
        }
    }
    
    /**
     * Select appropriate template for station
     */
    selectStationTemplate(station) {
        const templates = station.templates || ['delivery_template', 'elimination_template'];
        
        // Weight templates based on station type
        const weights = this.getTemplateWeights(station.type);
        
        // Weighted random selection
        const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const template of templates) {
            const weight = weights[template] || 1;
            random -= weight;
            if (random <= 0) {
                return template;
            }
        }
        
        // Fallback to random template
        return templates[Math.floor(Math.random() * templates.length)];
    }
    
    /**
     * Get template weights based on station type
     */
    getTemplateWeights(stationType) {
        // Only use available templates: elimination, escort, exploration, delivery
        const weights = {
            military_hub: {
                'elimination': 3,
                'escort': 2
            },
            research_station: {
                'exploration': 3,
                'delivery': 2
            },
            trade_hub: {
                'delivery': 3,
                'escort': 2
            },
            military_base: {
                'elimination': 3,
                'escort': 2
            },
            commercial_port: {
                'delivery': 3,
                'escort': 2
            },
            industrial: {
                'elimination': 2,
                'escort': 3
            }
        };
        
        return weights[stationType] || {
            'delivery': 2,
            'elimination': 2,
            'escort': 1
        };
    }
    
    /**
     * Refresh missions for a specific station
     */
    async refreshStationMissions(stationKey) {
        const station = this.getGameStations().find(s => s.key === stationKey);
        if (station) {
debug('MISSIONS', `🎯 Refreshing missions for ${station.name}...`);
            await this.ensureStationHasMissions(station);
        }
    }
    
    /**
     * Simple delay utility
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Test mission UI systems
     */
    testMissionUI() {
debug('UI', 'Testing mission UI systems...');
        
        // Update player data first
        this.updateMissionSystemPlayerData();
        
        // Test connection to backend
        if (this.missionAPI) {
            this.missionAPI.testConnection().then(connected => {
                if (connected) {
debug('MISSIONS', 'Mission API connection successful');
                    // Test with real data
                    this.missionAPI.refreshAllMissions();
                } else {
debug('AI', 'Mission API not available, using mock data');
                }
            });
        }
        
        // Test mission status HUD
        if (this.missionStatusHUD) {
debug('AI', 'Mission Status HUD available - press M to test');
        }
        
        // Test notifications
        if (this.missionNotificationHandler) {
            this.missionNotificationHandler.testNotifications();
        }
        
        // Test mission completion after 20 seconds
        setTimeout(() => {
            if (this.missionCompletionUI) {
debug('UI', 'Testing mission completion UI...');
                this.missionCompletionUI.testCompletion();
            }
        }, 20000);
        
debug('UI', 'Mission UI test sequence started');
    }
    
    
    /**
     * Send enemy destroyed event to mission system
     */
    async sendEnemyDestroyedEvent(destroyedShip) {
        if (!this.missionEventService || !destroyedShip) return;
        
        try {
            const playerContext = {
                location: this.getCurrentLocation(),
                playerShip: this.ship?.shipType || 'starter_ship'
            };
            
            const result = await this.missionEventService.enemyDestroyed(destroyedShip, playerContext);
            
            if (result && result.success && result.updated_missions && result.updated_missions.length > 0) {
debug('MISSIONS', `🎯 Enemy destruction updated ${result.updated_missions.length} missions`);
                
                // Refresh Mission Status HUD if visible
                if (this.missionStatusHUD && this.missionStatusHUD.visible) {
                    setTimeout(() => {
                        this.missionStatusHUD.refreshMissions();
                    }, 100);
                }
                
                // Show mission progress notification
                for (const mission of result.updated_missions) {
                    this.showMissionProgressNotification(mission, 'enemy_destroyed');
                }
            }
            
        } catch (error) {
            console.error('🎯 Failed to send enemy destroyed event:', error);
        }
    }
    
    /**
     * Send location reached event to mission system
     */
    async sendLocationReachedEvent(location) {
        if (!this.missionEventService || !location) return;
        
        try {
            const playerContext = {
                playerShip: this.ship?.shipType || 'starter_ship'
            };
            
            const result = await this.missionEventService.locationReached(location, playerContext);
            
            if (result && result.success && result.updated_missions && result.updated_missions.length > 0) {
debug('MISSIONS', `🎯 Location reached updated ${result.updated_missions.length} missions`);
                
                // Refresh Mission Status HUD if visible
                if (this.missionStatusHUD && this.missionStatusHUD.visible) {
                    setTimeout(() => {
                        this.missionStatusHUD.refreshMissions();
                    }, 100);
                }
                
                // Show mission progress notification
                for (const mission of result.updated_missions) {
                    this.showMissionProgressNotification(mission, 'location_reached');
                }
            }
            
        } catch (error) {
            console.error('🎯 Failed to send location reached event:', error);
        }
    }
    
    /**
     * Show mission progress notification
     */
    showMissionProgressNotification(mission, eventType) {
        if (!this.missionNotificationHandler) return;
        
        // Find completed objectives for progress message
        const completedObjectives = mission.objectives?.filter(obj => 
            obj.status === 'ACHIEVED' || obj.status === 'COMPLETED'
        ) || [];
        
        if (completedObjectives.length > 0) {
            const objective = completedObjectives[0];
            const message = `Objective completed: ${objective.description}`;
            
            this.missionNotificationHandler.sendObjectiveUpdate(
                mission.client || 'Mission Control',
                message,
                mission
            );
        } else {
            // Show progress update
            const message = this.getMissionProgressMessage(mission, eventType);
            if (message) {
                this.missionNotificationHandler.sendMissionUpdate(
                    mission.client || 'Mission Control',
                    message,
                    mission
                );
            }
        }
    }
    
    /**
     * Get appropriate progress message for mission event
     */
    getMissionProgressMessage(mission, eventType) {
        const killCount = mission.custom_fields?.kills_made || 0;
        const requiredKills = mission.custom_fields?.enemy_count || 0;
        
        switch (eventType) {
            case 'enemy_destroyed':
                if (requiredKills > 0) {
                    return `Enemy eliminated. Progress: ${killCount}/${requiredKills}`;
                }
                return 'Enemy eliminated';
                
            case 'location_reached':
                return 'Location objective updated';
                
            default:
                return 'Mission progress updated';
        }
    }
    
    /**
     * Get current player location for mission events
     */
    getCurrentLocation() {
        // Try to get location from current system or target
        if (this.solarSystemManager?.currentSystem) {
            return this.solarSystemManager.currentSystem.toLowerCase().replace(/\s+/g, '_');
        }
        
        if (this.currentTarget?.userData?.name) {
            return String(this.currentTarget.userData.name).toLowerCase().replace(/\s+/g, '_');
        }
        
        // Default fallback
        return 'unknown';
    }
    
    /**
     * Manual mission population for testing (console command)
     */
    async populateAllStations() {
debug('UTILITY', 'Manual station population requested...');
        await this.prePopulateStationMissions();
    }
    
    /**
     * Get mission summary for all stations (console command)
     */
    async getMissionSummary() {
debug('MISSIONS', 'Getting mission summary for all stations...');
        
        const stations = this.getGameStations();
        const summary = {};
        
        for (const station of stations) {
            try {
                const missions = await this.missionAPI.getAvailableMissions(station.key);
                summary[station.name] = {
                    count: missions.length,
                    missions: missions.map(m => ({ title: m.title, type: m.type }))
                };
            } catch (error) {
                summary[station.name] = { error: error.message };
            }
        }
        
        console.table(summary);
        return summary;
    }
    
    /**
     * Test mission event system (console command)
     */
    async testMissionEvents() {
debug('MISSIONS', 'Testing mission event system...');
        
        if (!this.missionEventService) {
            console.error('❌ MissionEventService not available');
            return;
        }
        
        // Test enemy destroyed event
debug('UTILITY', 'Testing enemy destroyed event...');
        const result = await this.missionEventService.testEnemyDestroyed();
debug('UTILITY', 'Enemy destroyed test result:', result);
        
        // Test location reached event
debug('UTILITY', 'Testing location reached event...');
        const locationResult = await this.missionEventService.locationReached('terra_prime', {
            playerShip: 'starter_ship'
        });
debug('UTILITY', 'Location reached test result:', locationResult);
        
        return { enemyDestroyed: result, locationReached: locationResult };
    }
    
    /**
     * Clear all active missions (console command)
     */
    async clearActiveMissions() {
debug('MISSIONS', 'Clearing all active missions...');
        
        try {
            const result = await this.missionAPI.clearActiveMissions();
            
            if (result.success) {
debug('MISSIONS', `✅ Successfully cleared ${result.cleared_count} active missions`);
                
                // Refresh Mission Status HUD if it's visible
                if (this.missionStatusHUD && this.missionStatusHUD.visible) {
                    this.missionStatusHUD.refreshMissions();
debug('UI', 'Mission Status HUD refreshed after clearing');
                }
                
                // Show notification
                this.showHUDMessage(
                    'MISSIONS CLEARED', 
                    `${result.cleared_count} active missions cleared`
                );
            } else {
                console.error('❌ Failed to clear active missions:', result.error);
                this.showHUDEphemeral(
                    'CLEAR FAILED',
                    result.error || 'Unknown error'
                );
            }
            
            return result;
            
        } catch (error) {
            console.error('🎯 Failed to clear active missions:', error);
            this.showHUDEphemeral(
                'CLEAR FAILED',
                'Connection error'
            );
            return { success: false, error: error.message };
        }
    }

} 