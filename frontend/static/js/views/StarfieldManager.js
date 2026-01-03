// THREE is handled dynamically in constructor
import { DockingInterface } from '../ui/DockingInterface.js';
import { HelpInterface } from '../ui/HelpInterface.js';
import DockingSystemManager from '../ship/DockingSystemManager.js';
import SimpleDockingManager from '../SimpleDockingManager.js';
import { getSystemDisplayName } from '../ship/System.js';
import DamageControlHUD from '../ui/DamageControlHUD.js';
import { CommunicationHUD } from '../ui/CommunicationHUD.js';
import DiplomacyHUD from '../ui/DiplomacyHUD.js';
import { MissionSystemCoordinator } from '../managers/MissionSystemCoordinator.js';
import { IntelDisplayManager } from '../managers/IntelDisplayManager.js';
import { DockingOperationsManager } from '../managers/DockingOperationsManager.js';
import { KeyboardInputManager } from '../managers/KeyboardInputManager.js';
import { ShipMovementController } from '../managers/ShipMovementController.js';
import { ShipSystemsHUDManager } from '../managers/ShipSystemsHUDManager.js';
import { TargetDummyManager } from '../managers/TargetDummyManager.js';
import { TargetOutlineManager } from '../managers/TargetOutlineManager.js';
import { DestroyedTargetHandler } from '../managers/DestroyedTargetHandler.js';
import { ReticleManager } from '../managers/ReticleManager.js';
import { SystemLifecycleManager } from '../managers/SystemLifecycleManager.js';
import { HUDMessageManager } from '../managers/HUDMessageManager.js';
import { CargoDeliveryHandler } from '../managers/CargoDeliveryHandler.js';
import { WeaponEffectsManager } from '../ship/systems/WeaponEffectsManager.js';
import { StarChartsManager } from './StarChartsManager.js';
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

// Constants
import { SHIP_MOVEMENT, DOCKING } from '../constants/ShipConstants.js';
import { TARGETING_TIMING } from '../constants/TargetingConstants.js';
import { STARFIELD } from '../constants/GameConstants.js';

// VERSION TRACKING
const STARFIELD_VERSION = '7.8.0-targeting-fixes';
const STARFIELD_BUILD_DATE = '2025-09-30T20:30:00Z';

export class StarfieldManager {
    constructor(scene, camera, viewManager, threeModule = null) {
        debug('UTILITY', `🌌 StarfieldManager v${STARFIELD_VERSION}`);
        this.scene = scene;
        this.camera = camera;
        this.viewManager = viewManager;
        
        // Handle THREE.js - use passed module or fall back to global
        this.THREE = threeModule || window.THREE;
        if (!this.THREE) {
            debug('P1', `THREE.js not available. threeModule: ${!!threeModule}, windowTHREE: ${!!window.THREE}, documentReadyState: ${document.readyState}`);
            
            // Try to wait a bit and retry if document is still loading
            if (document.readyState === 'loading') {
                debug('P1', 'Document still loading, THREE.js might not be available yet');
            }
            
            throw new Error('THREE.js not available. Please ensure THREE.js is loaded either as a module or globally.');
        }
        
        // Get Ship instance from ViewManager for direct access to ship systems
        this.ship = this.viewManager.getShip();
        
        // Set StarfieldManager reference on ship for HUD error display
        if (this.ship && typeof this.ship.setStarfieldManager === 'function') {
            this.ship.setStarfieldManager(this);
        }
        
        // Movement state is now managed by ShipMovementController
        // Keeping camera-related vectors here
        this.velocity = new this.THREE.Vector3();
        this.rotationSpeed = SHIP_MOVEMENT.ROTATION_SPEED;
        this.cameraDirection = new this.THREE.Vector3();
        this.cameraRight = new this.THREE.Vector3();
        this.cameraUp = new this.THREE.Vector3();
        this.mouseSensitivity = SHIP_MOVEMENT.MOUSE_SENSITIVITY;
        this.mouseRotation = new this.THREE.Vector2();
        this.isMouseLookEnabled = false; // Disable mouse look to match thoralexander.com
        this.view = 'FORE'; // Initialize with FORE view
        this.previousView = 'FORE'; // Add previous view tracking
        this.solarSystemManager = null; // Will be set by setSolarSystemManager

        // Initialize Docking Operations Manager
        this.dockingOperationsManager = new DockingOperationsManager(this);

        // Expose docking state for backwards compatibility
        Object.defineProperty(this, 'isDocked', {
            get: () => this.dockingOperationsManager.isDocked,
            set: (val) => { this.dockingOperationsManager.isDocked = val; }
        });
        Object.defineProperty(this, 'dockedTo', {
            get: () => this.dockingOperationsManager.dockedTo,
            set: (val) => { this.dockingOperationsManager.dockedTo = val; }
        });
        Object.defineProperty(this, 'orbitRadius', {
            get: () => this.dockingOperationsManager.orbitRadius,
            set: (val) => { this.dockingOperationsManager.orbitRadius = val; }
        });
        Object.defineProperty(this, 'orbitAngle', {
            get: () => this.dockingOperationsManager.orbitAngle,
            set: (val) => { this.dockingOperationsManager.orbitAngle = val; }
        });
        Object.defineProperty(this, 'orbitSpeed', {
            get: () => this.dockingOperationsManager.orbitSpeed,
            set: (val) => { this.dockingOperationsManager.orbitSpeed = val; }
        });
        Object.defineProperty(this, 'dockingRange', {
            get: () => this.dockingOperationsManager.dockingRange,
            set: (val) => { this.dockingOperationsManager.dockingRange = val; }
        });
        Object.defineProperty(this, 'undockCooldown', {
            get: () => this.dockingOperationsManager.undockCooldown,
            set: (val) => { this.dockingOperationsManager.undockCooldown = val; }
        });

        // Initialize Keyboard Input Manager
        this.keyboardInputManager = new KeyboardInputManager(this);

        // Expose keys state for backwards compatibility (used by updateSmoothRotation)
        Object.defineProperty(this, 'keys', {
            get: () => this.keyboardInputManager.keys,
            set: (val) => { this.keyboardInputManager.keys = val; }
        });

        // Initialize Ship Movement Controller
        this.shipMovementController = new ShipMovementController(this);

        // Expose movement state for backwards compatibility
        Object.defineProperty(this, 'targetSpeed', {
            get: () => this.shipMovementController.targetSpeed,
            set: (val) => { this.shipMovementController.targetSpeed = val; }
        });
        Object.defineProperty(this, 'currentSpeed', {
            get: () => this.shipMovementController.currentSpeed,
            set: (val) => { this.shipMovementController.currentSpeed = val; }
        });
        Object.defineProperty(this, 'maxSpeed', {
            get: () => this.shipMovementController.maxSpeed,
            set: (val) => { this.shipMovementController.maxSpeed = val; }
        });
        Object.defineProperty(this, 'acceleration', {
            get: () => this.shipMovementController.acceleration,
            set: (val) => { this.shipMovementController.acceleration = val; }
        });
        Object.defineProperty(this, 'deceleration', {
            get: () => this.shipMovementController.deceleration,
            set: (val) => { this.shipMovementController.deceleration = val; }
        });
        Object.defineProperty(this, 'decelerating', {
            get: () => this.shipMovementController.decelerating,
            set: (val) => { this.shipMovementController.decelerating = val; }
        });
        Object.defineProperty(this, 'rotationVelocity', {
            get: () => this.shipMovementController.rotationVelocity,
            set: (val) => { this.shipMovementController.rotationVelocity = val; }
        });
        Object.defineProperty(this, 'rotationAcceleration', {
            get: () => this.shipMovementController.rotationAcceleration,
            set: (val) => { this.shipMovementController.rotationAcceleration = val; }
        });
        Object.defineProperty(this, 'rotationDeceleration', {
            get: () => this.shipMovementController.rotationDeceleration,
            set: (val) => { this.shipMovementController.rotationDeceleration = val; }
        });
        Object.defineProperty(this, 'maxRotationSpeed', {
            get: () => this.shipMovementController.maxRotationSpeed,
            set: (val) => { this.shipMovementController.maxRotationSpeed = val; }
        });
        Object.defineProperty(this, 'shipHeading', {
            get: () => this.shipMovementController.shipHeading,
            set: (val) => { this.shipMovementController.shipHeading = val; }
        });

        // Target computer state
        this.targetComputerEnabled = false;
        this.currentTarget = null;
        this.targetIndex = -1;
        this.targetObjects = [];
        this.targetWireframe = null;
        this.targetReticle = null;
        
        // Add sorting state
        this.lastSortTime = 0;
        this.sortInterval = TARGETING_TIMING.SORT_INTERVAL_MS;

        // Add arrow state tracking
        this.lastArrowState = null;

        // Add button state logging throttling
        this.lastButtonStateLog = null;

        // Smooth rotation state is now managed by ShipMovementController

        // Initialize Ship Systems HUD Manager
        this.shipSystemsHUDManager = new ShipSystemsHUDManager(this);

        // Create starfield renderer with quintuple density
        this.starCount = STARFIELD.STAR_COUNT;
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
        
        // Create star charts manager
        this.starChartsManager = new StarChartsManager(
            this.scene, this.camera, this.viewManager, this.solarSystemManager, this.targetComputerManager
        );
        
        // Help screen controller will be initialized later in constructor

        // AbortController for centralized event listener cleanup
        this._abortController = new AbortController();

        // Track pending timeouts for cleanup on dispose
        this._pendingTimeouts = new Set();

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
        
        // Initialize Intel Display Manager
        this.intelDisplayManager = new IntelDisplayManager(this);

        // Expose intel state for backwards compatibility
        Object.defineProperty(this, 'intelVisible', {
            get: () => this.intelDisplayManager.intelVisible,
            set: (val) => { this.intelDisplayManager.intelVisible = val; }
        });
        Object.defineProperty(this, 'intelAvailable', {
            get: () => this.intelDisplayManager.intelAvailable,
            set: (val) => { this.intelDisplayManager.intelAvailable = val; }
        });
        Object.defineProperty(this, 'intelHUD', {
            get: () => this.intelDisplayManager.intelHUD
        });
        this.previousTarget = null; // Track previous target for intel dismissal
        
        // Create weapon HUD
debug('COMBAT', '🔫 StarfieldManager constructor: About to create weapon HUD...');
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
        try {
            this.helpInterface = new HelpInterface(this);
            debug('UI', 'HelpInterface created successfully');
        } catch (error) {
            debug('P1', `❌ Failed to create HelpInterface: ${error}`);
            this.helpInterface = null;
        }
        
        // Create communication HUD for NPC interactions
        this.communicationHUD = new CommunicationHUD(this, document.body);

        // Create mission system coordinator (handles all mission-related functionality)
        this.missionCoordinator = new MissionSystemCoordinator(this);

        // Expose mission components for backwards compatibility
        this.missionAPI = this.missionCoordinator.missionAPI;
        this.missionEventService = this.missionCoordinator.missionEventService;
        this.missionStatusHUD = this.missionCoordinator.missionStatusHUD;
        this.missionCompletionUI = this.missionCoordinator.missionCompletionUI;
        this.missionNotificationHandler = this.missionCoordinator.missionNotificationHandler;
        this.missionEventHandler = this.missionCoordinator.missionEventHandler;

        // Create enemy AI manager
        this.enemyAIManager = new EnemyAIManager(this.scene, this.camera, this);

        // Initialize mission system after a short delay to ensure all systems are ready
        this._setTimeout(() => {
            this.missionCoordinator.initializeMissionSystem();
        }, 2000);
        
        // Create clean damage control HUD
        this.damageControlContainer = document.createElement('div');
        document.body.appendChild(this.damageControlContainer);
        this.damageControlHUD = new DamageControlHUD(this.ship, this.damageControlContainer, this);

        // Create diplomacy HUD container
        this.diplomacyContainer = document.createElement('div');
        document.body.appendChild(this.diplomacyContainer);
        this.diplomacyHUD = new DiplomacyHUD(this, this.diplomacyContainer);
        
        // Bind keyboard events
        this.bindKeyEvents();
        // Bind mouse events
        this.bindMouseEvents();

        // Audio setup - using new StarfieldAudioManager
        this.listener = new this.THREE.AudioListener();
        if (!this.camera) {
            debug('P1', 'No camera available for audio listener');
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
        
        // Target dummy ships manager (extracted)
        this.targetDummyManager = new TargetDummyManager(this);
        // Expose arrays for backwards compatibility
        Object.defineProperty(this, 'targetDummyShips', {
            get: () => this.targetDummyManager.targetDummyShips,
            set: (val) => { this.targetDummyManager.targetDummyShips = val; }
        });
        Object.defineProperty(this, 'dummyShipMeshes', {
            get: () => this.targetDummyManager.dummyShipMeshes,
            set: (val) => { this.targetDummyManager.dummyShipMeshes = val; }
        });
        
        // WeaponEffectsManager initialization state
        this.weaponEffectsInitialized = false;
        this.weaponEffectsManager = null;
        this.weaponEffectsInitFailed = false;
        this.weaponEffectsRetryCount = 0;
        this.maxWeaponEffectsRetries = 5; // Limit retries to prevent infinite loops
        
        // Try to initialize WeaponEffectsManager after a short delay
        // This ensures THREE.js is fully loaded and available
        this._setTimeout(() => {
            this.initializeWeaponEffectsManager();
            this.initializeAIManager();
        }, 100);

        // Debug mode for weapon hit detection (independent of damage control)
        this.debugMode = false; // Toggled with Ctrl-O

        // Target outline manager (extracted)
        this.targetOutlineManager = new TargetOutlineManager(this);
        // Expose properties for backwards compatibility
        Object.defineProperty(this, 'outlineEnabled', {
            get: () => this.targetOutlineManager.outlineEnabled,
            set: (val) => { this.targetOutlineManager.outlineEnabled = val; }
        });
        Object.defineProperty(this, 'targetOutline', {
            get: () => this.targetOutlineManager.targetOutline,
            set: (val) => { this.targetOutlineManager.targetOutline = val; }
        });
        Object.defineProperty(this, 'targetOutlineObject', {
            get: () => this.targetOutlineManager.targetOutlineObject,
            set: (val) => { this.targetOutlineManager.targetOutlineObject = val; }
        });
        Object.defineProperty(this, 'outlineDisabledUntilManualCycle', {
            get: () => this.targetOutlineManager.outlineDisabledUntilManualCycle,
            set: (val) => { this.targetOutlineManager.outlineDisabledUntilManualCycle = val; }
        });
        this.lastOutlineUpdate = 0; // Throttling for outline updates

        // Destroyed target handler (extracted)
        this.destroyedTargetHandler = new DestroyedTargetHandler(this);

        // Reticle manager (extracted)
        this.reticleManager = new ReticleManager(this);

        // System lifecycle manager (extracted)
        this.systemLifecycleManager = new SystemLifecycleManager(this);

        // HUD message manager (extracted)
        this.hudMessageManager = new HUDMessageManager(this);

        // Cargo delivery handler (extracted)
        this.cargoDeliveryHandler = new CargoDeliveryHandler(this);
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
            debug('P1', `❌ Failed to initialize AI manager: ${error}`);
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
                debug('P1', `WeaponEffectsManager initialization attempt ${this.weaponEffectsRetryCount + 1}/${this.maxWeaponEffectsRetries}: THREE.js not available yet`);
                this.weaponEffectsRetryCount++;
                if (this.weaponEffectsRetryCount >= this.maxWeaponEffectsRetries) {
                    debug('P1', 'WeaponEffectsManager initialization failed: THREE.js not available after maximum retries');
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
                debug('P1', 'WeaponEffectsManager class not available, deferring initialization');
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
                debug('P1', 'Ship not available, WeaponEffectsManager connection deferred');
            }
            
            this.weaponEffectsInitialized = true;
            this.weaponEffectsRetryCount = 0; // Reset retry count on success
            debug('UTILITY', 'WeaponEffectsManager initialized successfully');
            return true;
            
        } catch (error) {
            debug('P1', `WeaponEffectsManager initialization failed (attempt ${this.weaponEffectsRetryCount + 1}): ${error}`);
            this.weaponEffectsRetryCount++;
            
            if (this.weaponEffectsRetryCount >= this.maxWeaponEffectsRetries) {
                debug('P1', 'WeaponEffectsManager initialization permanently failed after maximum retries');
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
                    debug('P1', `Failed to resume AudioContext: ${error}`);
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
     * Delegates to ShipSystemsHUDManager
     */
    createShipSystemsHUD() {
        this.shipSystemsHUDManager.createShipSystemsHUD();
    }

    /**
     * Update ship systems display
     * Delegates to ShipSystemsHUDManager
     */
    updateShipSystemsDisplay() {
        this.shipSystemsHUDManager.updateShipSystemsDisplay();
    }

    /**
     * Legacy damage control display - DEPRECATED
     * Delegates to ShipSystemsHUDManager
     */
    updateDamageControlDisplay(shipStatus) {
        this.shipSystemsHUDManager.updateDamageControlDisplay(shipStatus);
    }

    /**
     * Update manual repair system progress
     * Delegates to ShipSystemsHUDManager
     */
    updateManualRepairSystem() {
        this.shipSystemsHUDManager.updateManualRepairSystem();
    }

    /**
     * Start manual repair for a system
     * Delegates to ShipSystemsHUDManager
     * @param {string} systemName - Name of the system to repair
     */
    startManualRepair(systemName) {
        this.shipSystemsHUDManager.startManualRepair(systemName);
    }

    /**
     * Complete manual repair
     * Delegates to ShipSystemsHUDManager
     */
    completeManualRepair() {
        this.shipSystemsHUDManager.completeManualRepair();
    }

    /**
     * Update repair button states (enable/disable based on repair status)
     * Delegates to ShipSystemsHUDManager
     */
    updateRepairButtonStates() {
        this.shipSystemsHUDManager.updateRepairButtonStates();
    }
    /**
     * Display individual weapons from the weapons system
     * Delegates to ShipSystemsHUDManager
     * @param {Object} weaponsSystemData - The weapons system data
     * @param {Object} autoRepair - Auto-repair system
     * @returns {number} Number of weapons displayed
     */
    displayIndividualWeapons(weaponsSystemData, autoRepair) {
        return this.shipSystemsHUDManager.displayIndividualWeapons(weaponsSystemData, autoRepair);
    }

    /**
     * Display a regular (non-weapons) system
     * Delegates to ShipSystemsHUDManager
     * @param {string} systemName - Name of the system
     * @param {Object} systemData - System data
     * @param {Object} autoRepair - Auto-repair system
     * @returns {number} Number of systems displayed (always 1)
     */
    displayRegularSystem(systemName, systemData, autoRepair) {
        return this.shipSystemsHUDManager.displayRegularSystem(systemName, systemData, autoRepair);
    }

    /**
     * Create a repair button for a system
     * Delegates to ShipSystemsHUDManager
     * @param {string} systemName - Name of the system (or weapon_slot_X for individual weapons)
     * @param {boolean} isDamaged - Whether the system is damaged
     * @param {number} health - System health percentage
     * @returns {HTMLElement} Repair button element
     */
    createRepairButton(systemName, isDamaged, health) {
        return this.shipSystemsHUDManager.createRepairButton(systemName, isDamaged, health);
    }

    /**
     * Format system name for display
     * Delegates to ShipSystemsHUDManager
     * @param {string} systemName - Raw system name
     * @returns {string} Formatted display name
     */
    formatSystemName(systemName) {
        return this.shipSystemsHUDManager.formatSystemName(systemName);
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

    // ========================================
    // Intel Display Methods
    // (Implementation moved to IntelDisplayManager)
    // ========================================

    toggleIntel() {
        this.intelDisplayManager.toggleIntel();
    }

    updateIntelDisplay() {
        this.intelDisplayManager.updateIntelDisplay();
    }

    updateIntelAvailability(distance) {
        this.intelDisplayManager.updateIntelAvailability(distance);
    }

    updateIntelIconDisplay() {
        this.intelDisplayManager.updateIntelIconDisplay();
    }

    createWeaponHUD() {
        // Import and initialize WeaponHUD
        debug('COMBAT', '🔫 StarfieldManager: Starting WeaponHUD creation...');
        import('../ui/WeaponHUD.js').then(({ WeaponHUD }) => {
            debug('COMBAT', '🔫 StarfieldManager: WeaponHUD module loaded, creating instance...');
            this.weaponHUD = new WeaponHUD(document.body);
            
            // Initialize weapon slots display
            this.weaponHUD.initializeWeaponSlots(4);
            debug('COMBAT', '🔫 StarfieldManager: WeaponHUD created and initialized');
            debug('COMBAT', `🔫 WeaponHUD elements created: weaponSlotsDisplay=${!!this.weaponHUD.weaponSlotsDisplay}`);
            
            // Connect to weapon system if available
            this.connectWeaponHUDToSystem();
            
            // Set up retry mechanism for connection
            this.setupWeaponHUDConnectionRetry();
            
        }).catch(error => {
            debug('P1', `❌ StarfieldManager: Failed to initialize WeaponHUD: ${error}`);
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
        
        debug('COMBAT', `🔫 connectWeaponHUDToSystem: ship=${!!ship}, weaponSystem=${!!ship?.weaponSystem}, weaponHUD=${!!this.weaponHUD}`);

        if (ship && ship.weaponSystem && this.weaponHUD) {
            // Set HUD reference in weapon system
            ship.weaponSystem.setWeaponHUD(this.weaponHUD);
            
            // Update weapon slots display
            this.weaponHUD.updateWeaponSlotsDisplay(ship.weaponSystem.weaponSlots, ship.weaponSystem.activeSlotIndex);
            
            this.weaponHUDConnected = true;
            debug('COMBAT', '🔫 WeaponHUD successfully connected to WeaponSystemCore');
            debug('COMBAT', `🔫 Weapon slots: ${ship.weaponSystem.weaponSlots?.length}, active: ${ship.weaponSystem.activeSlotIndex}`);
        } else {
            this.weaponHUDConnected = false;
            debug('COMBAT', `🔫 WeaponHUD connection failed: ship=${!!ship}, weaponSystem=${!!ship?.weaponSystem}, weaponHUD=${!!this.weaponHUD}`);
        }
    }
    bindKeyEvents() {
        this.keyboardInputManager.bindKeyEvents();
    }

    // NOTE: The full keyboard event handling (~1250 lines) has been moved to KeyboardInputManager.js
    // The following methods remain here: toggleTargetComputer, toggleDamageControl, toggleHelp, etc.
    // These are called from KeyboardInputManager via sfm reference

    // Keyboard event handling moved to KeyboardInputManager.js
    toggleTargetComputer() {
        // Store the current state before toggling
        const wasEnabled = this.targetComputerEnabled;

        // Delegate to target computer manager
        this.targetComputerManager.toggleTargetComputer();

        // Update local state to match
        this.targetComputerEnabled = this.targetComputerManager.targetComputerEnabled;
        this.currentTarget = this.targetComputerManager.currentTarget;
        this.targetIndex = this.targetComputerManager.targetIndex;
        this.targetObjects = this.targetComputerManager.targetObjects;

        // Log the state change
        debug('TARGETING', `StarfieldManager target computer toggle: ${wasEnabled} → ${this.targetComputerEnabled}`);

        // Handle intel visibility
        if (!this.targetComputerEnabled) {
            if (this.intelVisible) {
                this.intelVisible = false;
                this.intelHUD.style.display = 'none';
            }
            this.updateIntelIconDisplay();
        }

        // If we were trying to enable but it's still disabled, the activation failed
        if (wasEnabled === false && this.targetComputerEnabled === false) {
            debug('P1', 'Target computer activation failed - staying disabled');
        }
    }

    toggleDamageControl() {
        this.damageControlVisible = !this.damageControlVisible;

        if (this.damageControlVisible) {
            // Operations HUD is an overlay, don't change the view
            this.isDamageControlOpen = true; // Set the state flag
            
            debug('COMBAT', 'Showing operations report HUD...');
            
            // SIMPLIFIED: Just show the HUD - no card system refresh needed
            // The ship systems should already be initialized from launch/undocking
            this.damageControlHUD.show();
            debug('COMBAT', 'Operations report HUD shown');
            
            this.updateSpeedIndicator(); // Update the view indicator
        } else {
            // Operations HUD is an overlay, don't change the view when closing
            this.isDamageControlOpen = false; // Clear the state flag
            
            // Clean up all debug hit spheres when operations report is turned off
            WeaponSlot.cleanupAllDebugSpheres(this);
            
            // Hide the operations report HUD
            this.damageControlHUD.hide();
            
            this.updateSpeedIndicator(); // Update the view indicator
        }
    }

    toggleHelp() {
        debug('P1', '🔄 toggleHelp() called - using HelpInterface');
        if (this.helpInterface) {
            try {
                if (this.helpInterface.isVisible) {
                    this.helpInterface.hide();
                    debug('P1', '✅ Help screen closed');
                } else {
                    this.helpInterface.show();
                    debug('P1', '✅ Help screen opened');
                }
            } catch (error) {
                debug('P1', `❌ Failed to toggle help screen: ${error}`);
            }
        } else {
            debug('P1', '❌ HelpInterface not available - cannot toggle help');
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
        this._setTimeout(() => {
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
        this.keyboardInputManager.bindMouseEvents();
    }

    updateSmoothRotation(deltaTime) {
        this.shipMovementController.updateSmoothRotation(deltaTime);
    }
    update(deltaTime) {
        if (!deltaTime) deltaTime = 1/60;

        // P1 DEBUG: Track camera position before any updates for intermittent camera shake debugging
        const cameraPosBefore = this.camera.position.clone();

        // If docked, update orbit instead of normal movement
        if (this.isDocked) {
            this.updateOrbit(deltaTime);
            this.updateSpeedIndicator();
            return;
        }
        
        // P1 DEBUG: Check for unexpected camera position changes during stationary flight
        const checkCameraMovement = () => {
            if (!this.isDocked && this.currentSpeed === 0) {
                const cameraMovement = this.camera.position.distanceTo(cameraPosBefore);
                if (cameraMovement > 0.001) { // Threshold for detecting movement
                    debug('P1', `🔍 CAMERA SHAKE DETECTED: Unexpected camera movement during stationary flight`);
                    debug('P1', `   Movement distance: ${cameraMovement.toFixed(6)} units`);
                    debug('P1', `   Before: (${cameraPosBefore.x.toFixed(3)}, ${cameraPosBefore.y.toFixed(3)}, ${cameraPosBefore.z.toFixed(3)})`);
                    debug('P1', `   After: (${this.camera.position.x.toFixed(3)}, ${this.camera.position.y.toFixed(3)}, ${this.camera.position.z.toFixed(3)})`);
                    debug('P1', `   isDocked: ${this.isDocked}, currentSpeed: ${this.currentSpeed}, dockedTo: ${this.dockedTo?.name || 'null'}`);
                    debug('P1', `   Call stack: ${new Error().stack.split('\n').slice(1, 4).join(' | ')}`);
                }
            }
        };

        // DEBUG: Log when isDocked is false but we're still getting camera shake
        // This will help identify if the issue is elsewhere
        // Using P1 channel to ensure visibility for intermittent camera shake bug
        if (!this.isDocked && this.currentSpeed === 0) {
            // Camera shake issue occurs when flying in space, not while docked
            // Debug logging removed to reduce console spam
        }

        // Handle smooth rotation from arrow keys
        this.updateSmoothRotation(deltaTime);

        // Handle speed changes with acceleration/deceleration
        this.shipMovementController.updateSpeedState(deltaTime);

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
        this.shipMovementController.applyMovement(deltaTime);

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
                
                // CRITICAL: Update cooldown displays (was missing!)
                this.weaponHUD.updateCooldownDisplay(ship.weaponSystem.weaponSlots);
                
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
            
            // CRITICAL FIX: Reset proximity radar state before sector change (like target computer)
            if (this.proximityDetector3D && this.proximityDetector3D.isVisible) {
                debug('UTILITY', '🎯 Sector change: Deactivating proximity radar');
                this.proximityDetector3D.toggle(); // Deactivate proximity radar
            }
            
            // CRITICAL FIX: Update Star Charts current sector before generating new system
            if (this.starChartsManager) {
                debug('UTILITY', `🗺️ Sector change: Updating Star Charts from ${this.starChartsManager.currentSector} to ${currentSector}`);
                this.starChartsManager.currentSector = currentSector;
            }
            
            this.solarSystemManager.setCurrentSector(currentSector);
            // Generate new star system for the sector
            this.solarSystemManager.generateStarSystem(currentSector);
            
            // Update target list after sector change if target computer is enabled
            if (this.targetComputerEnabled) {
                this._setTimeout(() => {
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

        // Abort all event listeners registered with AbortController
        if (this._abortController) {
            this._abortController.abort();
            this._abortController = null;
        }

        // Clean up TargetComputerManager
        if (this.targetComputerManager) {
            this.targetComputerManager.dispose();
            this.targetComputerManager = null;
        }

        // Clean up EnemyAIManager
        if (this.enemyAIManager) {
            if (typeof this.enemyAIManager.dispose === 'function') {
                this.enemyAIManager.dispose();
            }
            this.enemyAIManager = null;
        }

        // Clean up StarChartsManager
        if (this.starChartsManager) {
            if (typeof this.starChartsManager.dispose === 'function') {
                this.starChartsManager.dispose();
            }
            this.starChartsManager = null;
        }

        // Clean up ProximityDetector3D (radar)
        if (this.proximityDetector3D) {
            if (typeof this.proximityDetector3D.dispose === 'function') {
                this.proximityDetector3D.dispose();
            }
            this.proximityDetector3D = null;
        }

        // Clean up WeaponHUD
        if (this.weaponHUD) {
            if (typeof this.weaponHUD.dispose === 'function') {
                this.weaponHUD.dispose();
            }
            this.weaponHUD = null;
        }

        // Clean up HelpInterface
        if (this.helpInterface) {
            if (typeof this.helpInterface.dispose === 'function') {
                this.helpInterface.dispose();
            }
            this.helpInterface = null;
        }

        // Clean up MissionSystemCoordinator (handles all mission components)
        if (this.missionCoordinator) {
            this.missionCoordinator.dispose();
            this.missionCoordinator = null;
        }

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
            this.starfieldRenderer = null;
        }

        // Clean up wireframe and renderer
        if (this.wireframeRenderer) {
            this.wireframeRenderer.dispose();
            this.wireframeRenderer = null;
        }

        if (this.targetWireframe) {
            if (this.wireframeScene) {
                this.wireframeScene.remove(this.targetWireframe);
            }
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

        // Clean up audio manager
        if (this.audioManager) {
            this.audioManager.dispose();
            this.audioManager = null;
        }

        // Clean up UI elements
        if (this.shipSystemsHUD && this.shipSystemsHUD.parentNode) {
            this.shipSystemsHUD.parentNode.removeChild(this.shipSystemsHUD);
            this.shipSystemsHUD = null;
        }
        if (this.speedIndicator && this.speedIndicator.parentNode) {
            this.speedIndicator.parentNode.removeChild(this.speedIndicator);
            this.speedIndicator = null;
        }
        // Intel HUD cleanup delegated to IntelDisplayManager
        if (this.intelDisplayManager) {
            this.intelDisplayManager.destroy();
        }

        // Remove global references
        if (window.starfieldManager === this) {
            delete window.starfieldManager;
        }
        if (window.starfieldAudioManager === this.audioManager) {
            delete window.starfieldAudioManager;
        }
        if (window.targetComputerManager === this.targetComputerManager) {
            delete window.targetComputerManager;
        }

        // Clear all pending timeouts
        if (this._pendingTimeouts) {
            this._pendingTimeouts.forEach(id => clearTimeout(id));
            this._pendingTimeouts.clear();
            this._pendingTimeouts = null;
        }

        this.ship = null;
        this.scene = null;
        this.camera = null;
        this.viewManager = null;

        debug('UTILITY', '✅ StarfieldManager disposal complete');
    }

    /**
     * Wrapped setTimeout that tracks the timeout ID for cleanup on dispose
     * @param {Function} callback - The function to call after the delay
     * @param {number} delay - The delay in milliseconds
     * @returns {number} The timeout ID
     */
    _setTimeout(callback, delay) {
        const id = setTimeout(() => {
            if (this._pendingTimeouts) {
                this._pendingTimeouts.delete(id);
            }
            callback();
        }, delay);
        if (this._pendingTimeouts) {
            this._pendingTimeouts.add(id);
        }
        return id;
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
        debug('TARGETING', '🎯 setView call stack');
        
        // Operations HUD is now an overlay and doesn't interfere with view changes

        // Store previous view when switching to special views
        if (viewType === 'GALACTIC' || viewType === 'SCANNER') {
            // Only store previous view if it's not a special view
            if (this.view !== 'GALACTIC' && this.view !== 'LONG RANGE') {
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
        this.targetComputerManager.hideAllDirectionArrows();
        
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
                debug('P1', 'No audio context available for command success beep');
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
            debug('P1', `Failed to generate command success beep: ${error}`);
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
                debug('P1', 'No audio context available for command failed beep');
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
            debug('P1', `Failed to generate command failed beep: ${error}`);
        }
    }

    // Function to recreate the starfield with new density
    recreateStarfield() {
        // Update starfield renderer's star count and recreate
        this.starfieldRenderer.setStarCount(this.starCount);
        this.starfield = this.starfieldRenderer.getStarfield();
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

    // ========================================
    // Docking Operations Methods
    // (Implementation moved to DockingOperationsManager)
    // ========================================

    canDock(target) {
        return this.dockingOperationsManager.canDock(target);
    }

    canDockWithLogging(target) {
        return this.dockingOperationsManager.canDockWithLogging(target);
    }

    initializeSimpleDocking() {
        this.dockingOperationsManager.initializeSimpleDocking();
    }

    showDockingInterface(target) {
        this.dockingOperationsManager.showDockingInterface(target);
    }

    getTargetPosition(target) {
        return this.dockingOperationsManager.getTargetPosition(target);
    }

    dock(target) {
        return this.dockingOperationsManager.dock(target);
    }

    /**
     * Check for cargo deliveries upon docking
     * Delegated to CargoDeliveryHandler
     * @param {string} stationKey - The station key/name where docking occurred
     */
    async checkCargoDeliveries(stationKey) {
        return this.cargoDeliveryHandler.checkCargoDeliveries(stationKey);
    }

    completeDockingStation(target) {
        return this.dockingOperationsManager.completeDockingStation(target);
    }

    undock() {
        return this.dockingOperationsManager.undock();
    }

    launch() {
        return this.dockingOperationsManager.launch();
    }

    updateOrbit(deltaTime) {
        this.dockingOperationsManager.updateOrbit(deltaTime);
    }

    easeInOutCubic(t) {
        return this.dockingOperationsManager.easeInOutCubic(t);
    }

    async dockWithDebug(target) {
        return this.dockingOperationsManager.dockWithDebug(target);
    }

    undockWithDebug() {
        this.dockingOperationsManager.undockWithDebug();
    }

    handleDockButtonClick(isDocked, targetName) {
        this.dockingOperationsManager.handleDockButtonClick(isDocked, targetName);
    }

    getDockingStatus() {
        return this.dockingOperationsManager.getDockingStatus();
    }

    getDockingRequirements() {
        return this.dockingOperationsManager.getDockingRequirements();
    }

    calculateSafeLaunchDistance(launchTarget) {
        return this.dockingOperationsManager.calculateSafeLaunchDistance(launchTarget);
    }

    // ========================================
    // System Lifecycle Methods
    // (Implementation moved to SystemLifecycleManager)
    // ========================================

    /**
     * Power down all ship systems when docking to conserve energy
     * Delegated to SystemLifecycleManager
     */
    shutdownAllSystems() {
        this.systemLifecycleManager.shutdownAllSystems();
    }

    /**
     * Restore all ship systems to their pre-docking state when undocking
     * Delegated to SystemLifecycleManager
     */
    async restoreAllSystems() {
        return this.systemLifecycleManager.restoreAllSystems();
    }

    /**
     * Create target dummy ships for sub-targeting practice
     * Delegated to TargetDummyManager
     * @param {number} count - Number of dummy ships to create
     */
    async createTargetDummyShips(count = 3) {
        return this.targetDummyManager.createTargetDummyShips(count);
    }

    /**
     * Handle waypoint creation asynchronously (called from keydown handler)
     */
    async handleWaypointCreationAsync() {
        try {
            await this.createWaypointTestMission();
        } catch (error) {
            debug('P1', `❌ Error in handleWaypointCreationAsync: ${error}`);
        }
    }

    /**
     * Create a waypoint test mission for development/testing
     */
    async createWaypointTestMission() {
        debug('WAYPOINTS', '🎯 W key pressed - Creating waypoint test mission...');

        // Check if waypoint manager is available
        debug('WAYPOINTS', `🎯 Checking waypoint manager availability: ${!!window.waypointManager}`);
        if (!window.waypointManager) {
            debug('P1', '❌ Waypoint manager not available');
            this.playCommandFailedSound();
            this.showHUDEphemeral(
                'WAYPOINT SYSTEM UNAVAILABLE',
                'Waypoint manager not initialized'
            );
            return;
        }
        debug('WAYPOINTS', '✅ Waypoint manager is available');

        try {
            // Create the test mission
            debug('WAYPOINTS', '🎯 Calling waypointManager.createTestMission()...');
            const result = await window.waypointManager.createTestMission();
            debug('WAYPOINTS', `🎯 createTestMission result: ${result ? 'success' : 'null/false'}`);

            if (result) {
                debug('WAYPOINTS', '✅ Test mission created successfully');
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
                    this._setTimeout(() => {
                        this.showHUDEphemeral(
                            'MISSION AVAILABLE',
                            `${result.mission.title} - Navigate to waypoints`
                        );
                    }, 2000);
                }

            } else {
                debug('P1', '❌ Test mission creation returned null/false');
                this.playCommandFailedSound();
                this.showHUDEphemeral(
                    'MISSION CREATION FAILED',
                    'Unable to create waypoint test mission'
                );
            }

        } catch (error) {
            debug('P1', `❌ Failed to create waypoint test mission: ${error}`);
            this.playCommandFailedSound();
            this.showHUDEphemeral(
                'MISSION CREATION ERROR',
                'System error during mission creation'
            );
        }
    }

    /**
     * Create a visual mesh for a target dummy ship
     * Delegated to TargetDummyManager
     * @param {number} index - Ship index for color variation
     * @returns {THREE.Mesh} Simple wireframe cube mesh
     */
    createDummyShipMesh(index) {
        return this.targetDummyManager.createDummyShipMesh(index, this.THREE);
    }

    /**
     * Add random damage to ship systems for testing
     * Delegated to TargetDummyManager
     * @param {EnemyShip} ship - Enemy ship to damage
     */
    addRandomDamageToShip(ship) {
        this.targetDummyManager.addRandomDamageToShip(ship);
    }

    /**
     * Clear all target dummy ships
     * Delegated to TargetDummyManager
     */
    clearTargetDummyShips() {
        this.targetDummyManager.clearTargetDummyShips();
    }

    /**
     * Get target dummy ship by mesh
     * Delegated to TargetDummyManager
     * @param {THREE.Object3D} mesh - Ship mesh
     * @returns {Ship|null} Ship instance or null
     */
    getTargetDummyShip(mesh) {
        return this.targetDummyManager.getTargetDummyShip(mesh);
    }

    // ========================================
    // HUD Message Methods
    // (Implementation moved to HUDMessageManager)
    // ========================================

    /**
     * Show a temporary ephemeral message in the HUD (errors, notifications, etc.)
     * Delegated to HUDMessageManager
     * @param {string} title - Message title
     * @param {string} message - Message content
     * @param {number} duration - Duration in milliseconds (default 5000)
     */
    showHUDEphemeral(title, message, duration = 5000) {
        this.hudMessageManager.showHUDEphemeral(title, message, duration);
    }

    /**
     * Show HUD error message (alias for showHUDEphemeral for backward compatibility)
     * Delegated to HUDMessageManager
     * @param {string} title - Error title
     * @param {string} message - Error message
     * @param {number} duration - Duration in milliseconds (default 3000)
     */
    showHUDError(title, message, duration = 3000) {
        this.hudMessageManager.showHUDError(title, message, duration);
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

    /**
     * Update reticle position based on current target
     * Delegated to ReticleManager
     */
    updateReticlePosition() {
        this.reticleManager.updateReticlePosition();
    }

    /**
     * Update reticle target information (name, distance, colors)
     * Delegated to ReticleManager
     */
    updateReticleTargetInfo() {
        this.reticleManager.updateReticleTargetInfo();
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
     * Delegated to TargetOutlineManager
     * @param {Object3D} targetObject - The object to outline
     * @param {string} outlineColor - Hex color for the outline
     * @param {Object} targetData - Optional target data
     */
    createTargetOutline(targetObject, outlineColor = '#00ff41', targetData = null) {
        this.targetOutlineManager.createTargetOutline(targetObject, outlineColor, targetData);
    }

    /**
     * Update the outline position and animation
     * Delegated to TargetOutlineManager
     * @param {Object3D} targetObject - The current target object
     * @param {number} deltaTime - Time delta for animations
     */
    updateTargetOutline(targetObject, deltaTime) {
        this.targetOutlineManager.updateTargetOutline(targetObject, deltaTime);
    }

    /**
     * Clear the current 3D outline
     * Delegated to TargetOutlineManager
     */
    clearTargetOutline() {
        this.targetOutlineManager.clearTargetOutline();
    }

    /**
     * Toggle the outline system on/off
     * Delegated to TargetOutlineManager
     */
    toggleTargetOutline() {
        this.targetOutlineManager.toggleTargetOutline();
    }

    /**
     * Get the appropriate outline color based on target type
     * Delegated to TargetOutlineManager
     * @param {Object} targetData - Target data from getCurrentTargetData()
     * @returns {string} Hex color string
     */
    getOutlineColorForTarget(targetData) {
        return this.targetOutlineManager.getOutlineColorForTarget(targetData);
    }

    /**
     * Handle target destruction and synchronization across all targeting systems
     * Delegated to DestroyedTargetHandler
     * @param {Object} destroyedShip - The ship that was destroyed
     */
    removeDestroyedTarget(destroyedShip) {
        this.destroyedTargetHandler.removeDestroyedTarget(destroyedShip);
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

    /**
     * Initialize all ship systems for launch - fresh setup regardless of previous state
     * This is the unified method that should be used for ALL ship initialization scenarios
     * Delegated to SystemLifecycleManager
     */
    async initializeShipSystems() {
        return this.systemLifecycleManager.initializeShipSystems();
    }

    /**
     * Initialize weapon systems and ensure proper HUD connection
     * Critical for ensuring weapons are properly registered with the HUD
     * Delegated to SystemLifecycleManager
     */
    async initializeWeaponSystems() {
        return this.systemLifecycleManager.initializeWeaponSystems();
    }

    /**
     * Update weapon selection UI to reflect current ship loadout
     * Ensures weapon HUD shows correct weapon counts and types
     * Delegated to SystemLifecycleManager
     */
    async updateWeaponSelectionUI() {
        return this.systemLifecycleManager.updateWeaponSelectionUI();
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
                // Handle both decimal (0-1) and percentage (0-100) health formats
                let healthPercent;
                if (subTarget.health <= 1) {
                    // Decimal format (0-1), multiply by 100
                    healthPercent = Math.round(subTarget.health * 100);
                } else {
                    // Already percentage format (0-100), use as-is
                    healthPercent = Math.round(subTarget.health);
                }
                // Ensure it's within valid range
                healthPercent = Math.max(0, Math.min(100, healthPercent));
                
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

    handleSubTargetingKey(direction) {
        this.keyboardInputManager.handleSubTargetingKey(direction);
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
        debug('P1', '🗣️ Communication HUD not available');
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

    // ========================================
    // Mission System Delegation Methods
    // (Implementation moved to MissionSystemCoordinator)
    // ========================================

    async showMissionComplete(missionId, completionData) {
        return this.missionCoordinator.showMissionComplete(missionId, completionData);
    }

    pauseForMissionComplete() {
        return this.missionCoordinator.pauseForMissionComplete();
    }

    resumeFromMissionComplete() {
        return this.missionCoordinator.resumeFromMissionComplete();
    }

    isMissionStatusVisible() {
        return this.missionCoordinator.isMissionStatusVisible();
    }

    hideMissionStatus() {
        return this.missionCoordinator.hideMissionStatus();
    }

    showMissionStatus() {
        return this.missionCoordinator.showMissionStatus();
    }

    sendMissionNotification(npcName, message, options = {}) {
        return this.missionCoordinator.sendMissionNotification(npcName, message, options);
    }

    sendMissionBriefing(mission) {
        return this.missionCoordinator.sendMissionBriefing(mission);
    }

    updateMissionSystemPlayerData() {
        return this.missionCoordinator.updateMissionSystemPlayerData();
    }

    updateMissionSystemLocation(location) {
        return this.missionCoordinator.updateMissionSystemLocation(location);
    }

    async initializeMissionSystem() {
        return this.missionCoordinator.initializeMissionSystem();
    }

    async prePopulateStationMissions() {
        return this.missionCoordinator.prePopulateStationMissions();
    }

    getGameStations() {
        return this.missionCoordinator.getGameStations();
    }

    async ensureStationHasMissions(station) {
        return this.missionCoordinator.ensureStationHasMissions(station);
    }

    selectStationTemplate(station) {
        return this.missionCoordinator.selectStationTemplate(station);
    }

    getTemplateWeights(stationType) {
        return this.missionCoordinator.getTemplateWeights(stationType);
    }

    async refreshStationMissions(stationKey) {
        return this.missionCoordinator.refreshStationMissions(stationKey);
    }

    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    testMissionUI() {
        return this.missionCoordinator.testMissionUI();
    }

    async sendEnemyDestroyedEvent(destroyedShip) {
        return this.missionCoordinator.sendEnemyDestroyedEvent(destroyedShip);
    }

    async sendLocationReachedEvent(location) {
        return this.missionCoordinator.sendLocationReachedEvent(location);
    }

    showMissionProgressNotification(mission, eventType) {
        return this.missionCoordinator.showMissionProgressNotification(mission, eventType);
    }

    getMissionProgressMessage(mission, eventType) {
        return this.missionCoordinator.getMissionProgressMessage(mission, eventType);
    }

    getCurrentLocation() {
        return this.missionCoordinator.getCurrentLocation();
    }

    async populateAllStations() {
        return this.missionCoordinator.populateAllStations();
    }

    async getMissionSummary() {
        return this.missionCoordinator.getMissionSummary();
    }

    async testMissionEvents() {
        return this.missionCoordinator.testMissionEvents();
    }

    async clearActiveMissions() {
        return this.missionCoordinator.clearActiveMissions();
    }

} 