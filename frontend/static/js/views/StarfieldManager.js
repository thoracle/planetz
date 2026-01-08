// THREE is handled dynamically in constructor
import { HUDInitializer } from '../managers/HUDInitializer.js';
import { InputSystemsInitializer } from '../managers/InputSystemsInitializer.js';
import { DisposalManager } from '../managers/DisposalManager.js';
import { PropertyProxyInitializer } from '../managers/PropertyProxyInitializer.js';
import { UIManagersInitializer } from '../managers/UIManagersInitializer.js';
import { InfrastructureInitializer } from '../managers/InfrastructureInitializer.js';
import { GameLogicInitializer } from '../managers/GameLogicInitializer.js';
import { TargetingInitManager } from '../managers/TargetingInitManager.js';
import { RenderingInitManager } from '../managers/RenderingInitManager.js';
import { UtilityManagersInitializer } from '../managers/UtilityManagersInitializer.js';
import { CoreManagersInitializer } from '../managers/CoreManagersInitializer.js';
import { StateManagersInitializer } from '../managers/StateManagersInitializer.js';
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

// Constants
import { SHIP_MOVEMENT, DOCKING } from '../constants/ShipConstants.js';
import { TARGETING_TIMING } from '../constants/TargetingConstants.js';

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

        // StateManagersInitializer - consolidates 3 state managers
        this.stateManagersInitializer = new StateManagersInitializer(this);
        this.stateManagersInitializer.initialize();

        // ViewStateManager will be initialized later, but we need solarSystemManager reference early
        this.solarSystemManager = null; // Will be set by setSolarSystemManager

        // InputSystemsInitializer - consolidates 3 input/operations managers
        this.inputSystemsInitializer = new InputSystemsInitializer(this);
        this.inputSystemsInitializer.initialize();

        // HUDInitializer - consolidates 2 HUD managers
        this.hudInitializer = new HUDInitializer(this);
        this.hudInitializer.initialize();

        // RenderingInitManager - handles starfield renderer initialization
        this.renderingInitManager = new RenderingInitManager(this);
        this.renderingInitManager.initialize();

        // AbortController for centralized event listener cleanup
        // Must be created before any UI components that need abort signals
        this._abortController = new AbortController();

        // Create ship systems HUD (initially hidden)
        // Note: Speed indicator created after UtilityManagersInitializer
        this.createShipSystemsHUD();
        this.shipSystemsHUD.style.display = 'none'; // Hide by default

        // TargetingInitManager - handles targeting system initialization
        // (targetComputerManager, starChartsManager, proximityDetector3D)
        this.targetingInitManager = new TargetingInitManager(this);
        this.targetingInitManager.initialize();

        // InfrastructureInitializer - consolidates 3 infrastructure managers
        this.infrastructureInitializer = new InfrastructureInitializer(this);
        this.infrastructureInitializer.initialize();

        // Initialize simple docking system (moved to app.js after spatial systems are ready)
        // if (!this._dockingInitTried) {
        //     this._dockingInitTried = true;
        //     this.initializeSimpleDocking();
        // }

        // UIManagersInitializer - consolidates 3 UI managers
        this.uiManagersInitializer = new UIManagersInitializer(this);
        this.uiManagersInitializer.initialize();

        // GameLogicInitializer - consolidates 2 game logic managers
        this.gameLogicInitializer = new GameLogicInitializer(this);
        this.gameLogicInitializer.initialize();

        // Initialize mission system after a short delay to ensure all systems are ready
        this._setTimeout(() => {
            this.gameLogicInitializer.initializeMissionSystem();
        }, 2000);

        // Bind keyboard events
        this.bindKeyEvents();
        // Bind mouse events
        this.bindMouseEvents();

        // UtilityManagersInitializer - consolidates 14 utility managers
        this.utilityManagersInitializer = new UtilityManagersInitializer(this);
        this.utilityManagersInitializer.initialize();

        // Create speed indicator (requires statusBarManager from UtilityManagersInitializer)
        this.createSpeedIndicator();

        // Create weapon HUD (requires weaponHUDManager from UtilityManagersInitializer)
        debug('COMBAT', '🔫 StarfieldManager constructor: About to create weapon HUD...');
        this.createWeaponHUD();

        // Try to initialize WeaponEffectsManager after a short delay
        // This ensures THREE.js is fully loaded and available
        this._setTimeout(() => {
            this.initializeWeaponEffectsManager();
            this.initializeAIManager();
        }, 100);

        // CoreManagersInitializer - consolidates 10 core managers
        this.coreManagersInitializer = new CoreManagersInitializer(this);
        this.coreManagersInitializer.initialize();

        // DisposalManager - handles cleanup and resource disposal
        this.disposalManager = new DisposalManager(this);

        // Initialize property proxies for backwards compatibility
        // All Object.defineProperty calls are centralized in PropertyProxyInitializer
        PropertyProxyInitializer.initialize(this);
    }

    // ========================================
    // Faction Diplomacy Methods
    // (Implementation moved to FactionDiplomacyManager)
    // ========================================

    getFactionDiplomacy(faction) {
        return this.factionDiplomacyManager.getFactionDiplomacy(faction);
    }

    async initializeAIManager() {
        return this.factionDiplomacyManager.initializeAIManager();
    }
    
    /**
     * Initialize WeaponEffectsManager for weapon visual and audio effects (lazy initialization)
     * Delegated to WeaponEffectsInitManager
     */
    initializeWeaponEffectsManager() {
        return this.weaponEffectsInitManager.initializeWeaponEffectsManager();
    }

    /**
     * Ensure WeaponEffectsManager is initialized (lazy initialization with retry limits)
     * Delegated to WeaponEffectsInitManager
     */
    ensureWeaponEffectsManager() {
        return this.weaponEffectsInitManager.ensureWeaponEffectsManager();
    }

    ensureAudioContextRunning() {
        this.commandAudioManager.ensureAudioContextRunning();
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
        // Access via utilityManagersInitializer directly since this may be called before PropertyProxyInitializer
        this.utilityManagersInitializer.statusBarManager.createSpeedIndicator();
    }

    /**
     * Create ship systems HUD with integrated damage control
     * Delegates to ShipSystemsHUDManager
     */
    createShipSystemsHUD() {
        // Access via hudInitializer directly since this may be called before PropertyProxyInitializer
        this.hudInitializer.shipSystemsHUDManager.createShipSystemsHUD();
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
        this.statusBarManager.updateSpeedIndicator();
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
        // Access via utilityManagersInitializer directly since this may be called before PropertyProxyInitializer
        this.utilityManagersInitializer.weaponHUDManager.createWeaponHUD();
    }

    setupWeaponHUDConnectionRetry() {
        this.weaponHUDManager.setupWeaponHUDConnectionRetry();
    }

    connectWeaponHUDToSystem() {
        this.weaponHUDManager.connectWeaponHUDToSystem();
    }

    bindKeyEvents() {
        // Access via inputSystemsInitializer directly since this may be called before PropertyProxyInitializer
        this.inputSystemsInitializer.keyboardInputManager.bindKeyEvents();
    }

    // NOTE: The full keyboard event handling (~1250 lines) has been moved to KeyboardInputManager.js
    // The following methods remain here: toggleTargetComputer, toggleDamageControl, toggleHelp, etc.
    // These are called from KeyboardInputManager via sfm reference

    // Keyboard event handling moved to KeyboardInputManager.js
    toggleTargetComputer() {
        this.targetCyclingManager.toggleTargetComputer();
    }

    toggleDamageControl() {
        this.uiToggleManager.toggleDamageControl();
    }

    toggleHelp() {
        this.uiToggleManager.toggleHelp();
    }

    updateTargetList() {
        this.targetCyclingManager.updateTargetList();
    }

    cycleTarget(forward = true) {
        this.targetCyclingManager.cycleTarget(forward);
    }

    /**
     * Set target from long-range scanner
     * @param {Object} targetData - Target data from long-range scanner
     */
    setTargetFromScanner(targetData) {
        this.targetCyclingManager.setTargetFromScanner(targetData);
    }

    setSolarSystemManager(manager) {
        this.miscSystemManager.setSolarSystemManager(manager);
    }

    bindMouseEvents() {
        // Access via inputSystemsInitializer directly since this may be called before PropertyProxyInitializer
        this.inputSystemsInitializer.keyboardInputManager.bindMouseEvents();
    }

    updateSmoothRotation(deltaTime) {
        this.shipMovementController.updateSmoothRotation(deltaTime);
    }
    update(deltaTime) {
        this.updateLoopManager.update(deltaTime);
    }

    updateCurrentSector() {
        this.sectorManager.updateCurrentSector();
    }

    calculateCurrentSector() {
        return this.sectorManager.calculateCurrentSector();
    }

    // Debug methods delegated to DebugCommandManager
    debugDamageRandomSystems() {
        this.debugCommandManager.debugDamageRandomSystems();
    }

    debugDamageHull() {
        this.debugCommandManager.debugDamageHull();
    }

    debugDrainEnergy() {
        this.debugCommandManager.debugDrainEnergy();
    }

    debugRepairAllSystems() {
        this.debugCommandManager.debugRepairAllSystems();
    }

    dispose() {
        this.disposalManager.dispose();
    }

    /**
     * Wrapped setTimeout that tracks the timeout ID for cleanup on dispose
     * Delegated to TimeoutManager
     */
    _setTimeout(callback, delay) {
        // Access via infrastructureInitializer directly since this may be called before PropertyProxyInitializer
        return this.infrastructureInitializer.timeoutManager.setTimeout(callback, delay);
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
        this.viewStateManager.setView(viewType);
    }

    resetStar(star) {
        // Delegate to starfield renderer
        this.starfieldRenderer.resetStar(star);
    }

    /**
     * Clear target computer state completely - removes all target data and UI elements
     */
    clearTargetComputer() {
        this.targetCyclingManager.clearTargetComputer();
    }

    playEngineStartup(targetVolume) {
        this.audioInitManager.playEngineStartup(targetVolume);
    }

    playEngineShutdown() {
        this.audioInitManager.playEngineShutdown();
    }

    playCommandSound() {
        this.commandAudioManager.playCommandSound();
    }

    generateCommandSuccessBeep() {
        this.commandAudioManager.generateCommandSuccessBeep();
    }

    playCommandFailedSound() {
        this.commandAudioManager.playCommandFailedSound();
    }

    generateCommandFailedBeep() {
        this.commandAudioManager.generateCommandFailedBeep();
    }

    recreateStarfield() {
        this.miscSystemManager.recreateStarfield();
    }

    toggleProximityDetector() {
        return this.miscSystemManager.toggleProximityDetector();
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

    initializeSimpleDocking(SimpleDockingManagerClass) {
        this.dockingOperationsManager.initializeSimpleDocking(SimpleDockingManagerClass);
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

    // ========================================
    // Waypoint Test Methods
    // (Implementation moved to WaypointTestManager)
    // ========================================

    /**
     * Handle waypoint creation asynchronously (called from keydown handler)
     * Delegated to WaypointTestManager
     */
    async handleWaypointCreationAsync() {
        return this.waypointTestManager.handleWaypointCreationAsync();
    }

    /**
     * Create a waypoint test mission for development/testing
     * Delegated to WaypointTestManager
     */
    async createWaypointTestMission() {
        return this.waypointTestManager.createWaypointTestMission();
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
        this.targetDisplayManager.sortTargetsByDistance();
    }

    formatDistance(distanceInKm) {
        return this.targetDisplayManager.formatDistance(distanceInKm);
    }

    updateTargetDisplay() {
        this.targetDisplayManager.updateTargetDisplay();
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
        return this.targetDisplayManager.getCurrentTargetData();
    }

    calculateDistance(point1, point2) {
        // Use unified DistanceCalculator for consistent results across all systems
        return DistanceCalculator.calculate(point1, point2);
    }

    getParentPlanetName(moon) {
        return this.targetDisplayManager.getParentPlanetName(moon);
    }

    updateDirectionArrow() {
        // Delegate to target computer manager
        this.targetComputerManager.updateDirectionArrow();
    }

    markDamageControlForUpdate() {
        this.miscSystemManager.markDamageControlForUpdate();
    }

    /**
     * Ensure WeaponEffectsManager is connected to the ship
     * Delegated to WeaponEffectsInitManager
     */
    ensureWeaponEffectsConnection() {
        return this.weaponEffectsInitManager.ensureWeaponEffectsConnection();
    }

    toggleDebugMode() {
        this.uiToggleManager.toggleDebugMode();
    }

    refreshCurrentTarget() {
        this.miscSystemManager.refreshCurrentTarget();
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

    updateStatusIcons(distance, diplomacyColor, isEnemyShip, info) {
        this.miscSystemManager.updateStatusIcons(distance, diplomacyColor, isEnemyShip, info);
    }

    updateActionButtons(currentTargetData, info) {
        this.buttonStateManager.updateActionButtons(currentTargetData, info);
    }

    setImpulseSpeed(requestedSpeed) {
        return this.shipMovementController.setImpulseSpeed(requestedSpeed);
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
        this.weaponHUDManager.onWeaponSystemReady();
    }
    /**
     * Get sub-targeting availability and display information
     * Delegated to SubTargetDisplayManager
     */
    getSubTargetAvailability(ship, targetComputer, isEnemyShip, currentTargetData) {
        return this.subTargetDisplayManager.getSubTargetAvailability(ship, targetComputer, isEnemyShip, currentTargetData);
    }

    handleSubTargetingKey(direction) {
        this.keyboardInputManager.handleSubTargetingKey(direction);
    }

    // ========================================
    // Communication System Delegation Methods
    // (Implementation moved to CommunicationManager)
    // ========================================

    showCommunication(npcName, message, options = {}) {
        return this.communicationManagerDelegate.showCommunication(npcName, message, options);
    }

    hideCommunication() {
        this.communicationManagerDelegate.hideCommunication();
    }

    isCommunicationVisible() {
        return this.communicationManagerDelegate.isCommunicationVisible();
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
        return this.timeoutManager.delay(ms);
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