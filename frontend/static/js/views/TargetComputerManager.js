import { debug } from '../debug.js';
import { DistanceCalculator } from '../utils/DistanceCalculator.js';
import {
    TARGETING_TIMING,
    TARGETING_RANGE,
    WIREFRAME_COLORS,
    WIREFRAME_GEOMETRY,
    SUBSYSTEM_GEOMETRY,
} from '../constants/TargetingConstants.js';
import { DirectionArrowRenderer } from '../ui/DirectionArrowRenderer.js';
import { TargetReticleManager } from '../ui/TargetReticleManager.js';
import { SubSystemPanelManager } from '../ui/SubSystemPanelManager.js';
import { WireframeRenderer } from '../ui/WireframeRenderer.js';
import { TargetingFeedbackManager } from '../ui/TargetingFeedbackManager.js';
import { TargetOutlineManager } from '../ui/TargetOutlineManager.js';
import { HUDStatusManager } from '../ui/HUDStatusManager.js';
import { TargetIdManager } from '../ui/TargetIdManager.js';
import { TargetListManager } from '../ui/TargetListManager.js';
import { WaypointTargetManager } from '../ui/WaypointTargetManager.js';
import { TargetSelectionManager } from '../ui/TargetSelectionManager.js';
import { TargetDataProcessor } from '../ui/TargetDataProcessor.js';
import { TargetPositionManager } from '../ui/TargetPositionManager.js';
import { TargetDiplomacyManager } from '../ui/TargetDiplomacyManager.js';
import { StarChartsNotifier } from '../ui/StarChartsNotifier.js';
import { TargetSectorManager } from '../ui/TargetSectorManager.js';
import { TargetStateManager } from '../ui/TargetStateManager.js';
import { DestroyedTargetHandler } from '../ui/DestroyedTargetHandler.js';
import { TargetHUDController } from '../ui/TargetHUDController.js';
import { TargetComputerToggle } from '../ui/TargetComputerToggle.js';
import { TargetWireframeCreator } from '../ui/TargetWireframeCreator.js';
import { ClickCycleHandler } from '../ui/ClickCycleHandler.js';
import { TargetHUDBuilder } from '../ui/TargetHUDBuilder.js';

/**
 * TargetComputerManager - Handles all target computer functionality
 *
 * This class is responsible for:
 * - Target computer HUD creation and management
 * - Target list management and sorting
 * - Target cycling and selection
 * - Wireframe rendering and sub-target indicators
 * - Target outlines and reticles
 * - Direction arrows and distance calculations
 *
 * Extracted from StarfieldManager to improve code organization and maintainability.
 */
import { WIREFRAME_TYPES, getWireframeType } from '../constants/WireframeTypes.js';

export class TargetComputerManager {
    constructor(scene, camera, viewManager, THREE, solarSystemManager) {
        this.scene = scene;
        this.camera = camera;
        this.viewManager = viewManager;
        this.THREE = THREE;
        this.solarSystemManager = solarSystemManager;
        
        // Target computer state
        this.targetComputerEnabled = false;
        this.currentTarget = null;
        this.targetIndex = -1;
        this.targetObjects = [];
        this.targetWireframe = null;
        this.targetReticle = null;
        this.validTargets = [];
        this.lastTargetCycleTime = 0;
        this.previousTarget = null;
        this.targetedObject = null;
        this.lastTargetedObjectId = null;
        this.isManualNavigationSelection = false; // True when user selects from Star Charts or LRS - prevents auto-override
        this.isManualSelection = false; // Telemetry only
        
        // Persistent target cache (delegated to TargetListManager)
        // this.knownTargets - now in targetListManager
        // this.lastFullScanTime - now in targetListManager
        // this.fullScanInterval - now in targetListManager
        
        // Waypoint interruption tracking (delegated to WaypointTargetManager)
        // this.interruptedWaypoint - now in waypointTargetManager
        // this.waypointInterruptionTime - now in waypointTargetManager

        // Waypoint integration state (delegated to WaypointTargetManager)
        // this._waypointsAdded - now in waypointTargetManager
        // this._waypointStyleApplied - now in waypointTargetManager
        
        // Target change prevention flag (used during dummy creation)
        this.preventTargetChanges = false;
        
        // UI elements
        this.targetHUD = null;
        this.wireframeContainer = null;
        this.wireframeRenderer = null;
        this.wireframeScene = null;
        this.wireframeCamera = null;
        this.targetInfoDisplay = null;
        this.statusIconsContainer = null;
        this.targetNameDisplay = null;
        this.targetDistanceDisplay = null;
        this.directionArrows = {};
        
        // Sub-targeting
        this.subTargetIndicators = [];
        this.targetableAreas = [];
        
        // Outline system (delegated to TargetOutlineManager)
        // this.outlineEnabled - now in targetOutlineManager
        // this.lastOutlineUpdate - now in targetOutlineManager
        // this.targetOutline - now in targetOutlineManager
        // this.outlineGeometry - now in targetOutlineManager
        // this.outlineMaterial - now in targetOutlineManager
        
        // Sorting state (delegated to TargetListManager)
        // this.lastSortTime - now in targetListManager
        // this.sortInterval - now in targetListManager
        
        // Arrow state tracking (now managed by DirectionArrowRenderer)
        // this.lastArrowState = null; // Moved to DirectionArrowRenderer
        
        // Power-up animation state (delegated to TargetingFeedbackManager)
        // this.isPoweringUp - now in targetingFeedbackManager

        // No targets monitoring state (delegated to TargetingFeedbackManager)
        // this.noTargetsInterval - now in targetingFeedbackManager
        // this.isInNoTargetsMode - now in targetingFeedbackManager

        // Range monitoring state (delegated to TargetingFeedbackManager)
        // this.rangeMonitoringInterval - now in targetingFeedbackManager
        // this.isRangeMonitoringActive - now in targetingFeedbackManager

        // Temporary "no targets" message timeout (delegated to TargetingFeedbackManager)
        // this.noTargetsTimeout - now in targetingFeedbackManager

        // Audio for targeting events (delegated to TargetingFeedbackManager)
        // this.audioElements - now in targetingFeedbackManager
        
        // Wireframe animation
        this.wireframeAnimationId = null;

        // AbortController for centralized event listener cleanup
        this._abortController = new AbortController();

        // Warning throttling
        this.lastTargetNotFoundWarning = 0;

        // Initialize DirectionArrowRenderer
        this.directionArrowRenderer = new DirectionArrowRenderer(this);

        // Initialize TargetReticleManager
        this.targetReticleManager = new TargetReticleManager(this);

        // Initialize SubSystemPanelManager
        this.subSystemPanelManager = new SubSystemPanelManager(this);

        // Initialize WireframeRenderer
        this.wireframeRendererManager = new WireframeRenderer(this);

        // Initialize TargetingFeedbackManager
        this.targetingFeedbackManager = new TargetingFeedbackManager(this);

        // Initialize TargetOutlineManager
        this.targetOutlineManager = new TargetOutlineManager(this);

        // Initialize HUDStatusManager
        this.hudStatusManager = new HUDStatusManager(this);

        // Initialize TargetIdManager
        this.targetIdManager = new TargetIdManager(this);

        // Initialize TargetListManager
        this.targetListManager = new TargetListManager(this);

        // Initialize WaypointTargetManager
        this.waypointTargetManager = new WaypointTargetManager(this);

        // Initialize TargetSelectionManager
        this.targetSelectionManager = new TargetSelectionManager(this);

        // Initialize TargetDataProcessor
        this.targetDataProcessor = new TargetDataProcessor(this);

        // Initialize TargetPositionManager
        this.targetPositionManager = new TargetPositionManager(this);

        // Initialize TargetDiplomacyManager
        this.targetDiplomacyManager = new TargetDiplomacyManager(this);

        // Initialize StarChartsNotifier
        this.starChartsNotifier = new StarChartsNotifier(this);

        // Initialize TargetSectorManager
        this.targetSectorManager = new TargetSectorManager(this);

        // Initialize TargetStateManager
        this.targetStateManager = new TargetStateManager(this);

        // Initialize DestroyedTargetHandler
        this.destroyedTargetHandler = new DestroyedTargetHandler(this);

        // Initialize TargetHUDController
        this.targetHUDController = new TargetHUDController(this);

        // Initialize TargetComputerToggle
        this.targetComputerToggle = new TargetComputerToggle(this);

        // Initialize TargetWireframeCreator
        this.targetWireframeCreator = new TargetWireframeCreator(this);

        // Initialize ClickCycleHandler
        this.clickCycleHandler = new ClickCycleHandler(this);

        // Initialize TargetHUDBuilder
        this.targetHUDBuilder = new TargetHUDBuilder(this);

        // console.log('🎯 TargetComputerManager initialized');
    }

    /**
     * Getter for backwards compatibility with _waypointsAdded
     * @returns {boolean} Whether waypoints have been added
     */
    get _waypointsAdded() {
        return this.waypointTargetManager?.waypointsAdded || false;
    }

    /**
     * Setter for backwards compatibility with _waypointsAdded
     */
    set _waypointsAdded(value) {
        if (this.waypointTargetManager) {
            this.waypointTargetManager._waypointsAdded = value;
        }
    }

    /**
     * Convert faction name to diplomacy status
     * Delegates to TargetDiplomacyManager
     * @param {string} faction - Faction name
     * @returns {string} Diplomacy status ('friendly', 'neutral', 'enemy')
     */
    getFactionDiplomacy(faction) {
        return this.targetDiplomacyManager.getFactionDiplomacy(faction);
    }

    /**
     * Initialize the target computer manager
     */
    initialize() {
        this.createTargetComputerHUD();
        this.createTargetReticle();
        // console.log('🎯 TargetComputerManager fully initialized');
    }

    /**
     * Create the target computer HUD with sliding sub-system panel
     * Delegates to TargetHUDBuilder
     */
    createTargetComputerHUD() {
        this.targetHUDBuilder.buildTargetComputerHUD();
    }

    /**
     * Show the sub-system targeting panel with slide-out animation
     * Delegates to SubSystemPanelManager
     */
    showSubSystemPanel() {
        this.subSystemPanelManager.showSubSystemPanel();
    }

    /**
     * Hide the sub-system targeting panel with slide-in animation
     * Delegates to SubSystemPanelManager
     */
    hideSubSystemPanel() {
        this.subSystemPanelManager.hideSubSystemPanel();
    }

    /**
     * Update sub-system panel border color to match main HUD
     * Delegates to SubSystemPanelManager
     */
    updateSubSystemPanelColor(color) {
        this.subSystemPanelManager.updateSubSystemPanelColor(color);
    }

    /**
     * Create geometric shapes for different sub-systems
     * Delegates to SubSystemPanelManager
     */
    createSubSystemGeometry(systemName, baseColor = 0x00ff41) {
        return this.subSystemPanelManager.createSubSystemGeometry(systemName, baseColor);
    }

    /**
     * Update sub-system wireframe based on current sub-target
     * Delegates to SubSystemPanelManager
     */
    updateSubSystemWireframe(systemName, healthPercentage = 1.0, diplomacyColor = '#00ff41') {
        this.subSystemPanelManager.updateSubSystemWireframe(systemName, healthPercentage, diplomacyColor);
        // Keep local reference in sync for backwards compatibility
        this.currentSubSystemWireframe = this.subSystemPanelManager.currentSubSystemWireframe;
    }

    /**
     * Convert CSS color string to Three.js hex number
     * Delegates to SubSystemPanelManager
     */
    convertColorToHex(colorString) {
        return this.subSystemPanelManager.convertColorToHex(colorString);
    }

    /**
     * Get faction-based health color that maintains faction hue but adjusts for damage
     * Delegates to SubSystemPanelManager
     */
    getFactionHealthColor(diplomacyColor, healthPercentage) {
        return this.subSystemPanelManager.getFactionHealthColor(diplomacyColor, healthPercentage);
    }

    /**
     * Blend two hex colors
     * Delegates to SubSystemPanelManager
     */
    blendColors(color1, color2, ratio) {
        return this.subSystemPanelManager.blendColors(color1, color2, ratio);
    }

    /**
     * Get color based on health percentage (legacy method for compatibility)
     * Delegates to SubSystemPanelManager
     */
    getHealthColor(healthPercentage) {
        return this.subSystemPanelManager.getHealthColor(healthPercentage);
    }

    /**
     * Animate sub-system wireframe
     * Delegates to SubSystemPanelManager
     */
    animateSubSystemWireframe() {
        this.subSystemPanelManager.animateSubSystemWireframe();
    }

    /**
     * Update method called from StarfieldManager main loop
     */
    update(deltaTime) {
        // Animate sub-system wireframe if visible
        if (this.subSystemPanelManager.isPanelVisible()) {
            this.animateSubSystemWireframe();
        }
    }

    /**
     * Add scan line effects to the target HUD that sync with comm HUD
     * Delegates to HUDStatusManager
     */
    addTargetScanLineEffects() {
        this.hudStatusManager.addTargetScanLineEffects();
    }

    /**
     * Add CSS styles for target scan line animations
     * Delegates to HUDStatusManager
     */
    addTargetScanLineStyles() {
        this.hudStatusManager.addTargetScanLineStyles();
    }

    /**
     * Create direction arrows for off-screen targets
     * Delegates to DirectionArrowRenderer
     */
    createDirectionArrows() {
        this.directionArrowRenderer.createDirectionArrows();
        // Expose directionArrows for backwards compatibility
        this.directionArrows = this.directionArrowRenderer.directionArrows;
    }

    /**
     * Create target reticle for on-screen targets
     * Delegates to TargetReticleManager
     */
    createTargetReticle() {
        this.targetReticleManager.createTargetReticle();
        // Expose DOM elements for backwards compatibility
        this.targetReticle = this.targetReticleManager.targetReticle;
        this.targetNameDisplay = this.targetReticleManager.targetNameDisplay;
        this.targetDistanceDisplay = this.targetReticleManager.targetDistanceDisplay;
    }

    /**
     * Toggle target computer on/off
     * Delegates to TargetComputerToggle
     */
    toggleTargetComputer() {
        this.targetComputerToggle.toggleTargetComputer();
    }

    /**
     * Get isPoweringUp state (delegated to TargetingFeedbackManager)
     */
    get isPoweringUp() {
        return this.targetingFeedbackManager?.isPoweringUp || false;
    }

    /**
     * Show power-up animation when target computer first activates
     * Delegates to TargetingFeedbackManager
     */
    showPowerUpAnimation() {
        this.targetingFeedbackManager.showPowerUpAnimation();
    }

    /**
     * Hide power-up animation and restore normal display
     * Delegates to TargetingFeedbackManager
     */
    hidePowerUpAnimation() {
        this.targetingFeedbackManager.hidePowerUpAnimation();
    }

    /**
     * Hard reset any in-progress power-up state (used on undock/launch)
     * Delegates to TargetingFeedbackManager
     */
    resetAfterUndock() {
        this.targetingFeedbackManager.resetAfterUndock();
    }

    /**
     * Show "No Targets in Range" display when no targets are available
     * Delegates to TargetingFeedbackManager
     */
    showNoTargetsDisplay() {
        this.targetingFeedbackManager.showNoTargetsDisplay();
    }

    /**
     * Start monitoring for targets when in "no targets" mode
     * Delegates to TargetingFeedbackManager
     */
    startNoTargetsMonitoring() {
        this.targetingFeedbackManager.startNoTargetsMonitoring();
    }

    /**
     * Stop monitoring for targets
     * Delegates to TargetingFeedbackManager
     */
    stopNoTargetsMonitoring() {
        this.targetingFeedbackManager.stopNoTargetsMonitoring();
    }

    /**
     * Range monitoring disabled - targets persist until manually changed or sector warp
     * Delegates to TargetingFeedbackManager
     */
    startRangeMonitoring() {
        this.targetingFeedbackManager.startRangeMonitoring();
    }

    /**
     * Clean up range monitoring state (no longer used)
     * Delegates to TargetingFeedbackManager
     */
    stopRangeMonitoring() {
        this.targetingFeedbackManager.stopRangeMonitoring();
    }

    /**
     * Show temporary "No targets in range" message for specified duration
     * Delegates to TargetingFeedbackManager
     * @param {Function} callback - Function to call after the delay
     * @param {number} duration - Duration in milliseconds (default: 1000ms)
     */
    showTemporaryNoTargetsMessage(callback, duration = 1000) {
        this.targetingFeedbackManager.showTemporaryNoTargetsMessage(callback, duration);
    }

    /**
     * Play audio file using HTML5 Audio
     * Delegates to TargetingFeedbackManager
     * @param {string} audioPath - Path to audio file
     */
    playAudio(audioPath) {
        this.targetingFeedbackManager.playAudio(audioPath);
    }

    /**
     * Update the list of available targets
     */
    updateTargetList() {
        return this.targetListManager.updateTargetList();
    }

    /**
     * Update the known targets cache with current targets
     * Delegates to TargetListManager
     */
    updateKnownTargetsCache(currentTargets) {
        return this.targetListManager.updateKnownTargetsCache(currentTargets);
    }

    /**
     * Enhance target list with cached targets for better cycling
     * Delegates to TargetListManager
     */
    enhanceTargetListWithCache(currentTargets) {
        return this.targetListManager.enhanceTargetListWithCache(currentTargets);
    }

    /**
     * Calculate distance to a target
     * Delegates to TargetListManager
     */
    calculateTargetDistance(target) {
        return this.targetListManager.calculateTargetDistance(target);
    }

    /**
     * Enhanced target list update using Three.js native approach
     * Delegates to TargetListManager
     */
    updateTargetListWithPhysics() {
        return this.targetListManager.updateTargetListWithPhysics();
    }

    /**
     * Traditional target list update (fallback when physics not available)
     * Delegates to TargetListManager
     */
    updateTargetListTraditional() {
        return this.targetListManager.updateTargetListTraditional();
    }

    /**
     * Add targets that don't have physics bodies yet (fallback)
     * Delegates to TargetListManager
     */
    addNonPhysicsTargets(allTargets, maxRange) {
        return this.targetListManager.addNonPhysicsTargets(allTargets, maxRange);
    }

    /**
     * Get diplomacy status for any target type with consistent fallback logic
     * Delegates to TargetDiplomacyManager
     * @param {Object} targetData - Target data object
     * @returns {string} Diplomacy status ('enemy', 'friendly', 'neutral', 'unknown')
     */
    getTargetDiplomacy(targetData) {
        return this.targetDiplomacyManager.getTargetDiplomacy(targetData);
    }

    /**
     * UNIVERSAL TARGET NORMALIZATION: Normalize target ID before any processing
     * Delegates to TargetIdManager
     */
    normalizeTarget(targetData, fallbackKey = null) {
        return this.targetIdManager.normalizeTarget(targetData, fallbackKey);
    }

    /**
     * Add a single target with proper deduplication
     * Delegates to TargetListManager
     */
    addTargetWithDeduplication(targetData) {
        return this.targetListManager.addTargetWithDeduplication(targetData);
    }

    /**
     * Enhanced sorting with physics data
     * Delegates to TargetListManager
     */
    sortTargetsByDistanceWithPhysics(forceSort = false) {
        return this.targetListManager.sortTargetsByDistanceWithPhysics(forceSort);
    }

    /**
     * Sort targets by distance from camera
     * Delegates to TargetListManager
     */
    sortTargetsByDistance(forceSort = false) {
        return this.targetListManager.sortTargetsByDistance(forceSort);
    }

    /**
     * Set target from long-range scanner
     * Delegates to TargetSelectionManager
     * @param {Object} targetData - Target data from long-range scanner
     */
    setTargetFromScanner(targetData) {
        return this.targetSelectionManager.setTargetFromScanner(targetData);
    }

    /**
     * Cycle to the next or previous target
     * Delegates to TargetSelectionManager
     * @param {boolean} forward - Whether to cycle forward (true) or backward (false). Default: true
     */
    cycleTarget(forward = true) {
        return this.targetSelectionManager.cycleTarget(forward);
    }

    /**
     * Notify Star Charts that the target has changed (for real-time blinking updates)
     * Delegates to StarChartsNotifier
     */
    notifyStarChartsOfTargetChange() {
        this.starChartsNotifier.notifyStarChartsOfTargetChange();
    }

    /**
     * Create wireframe for current target
     * Delegates to TargetWireframeCreator
     */
    createTargetWireframe() {
        this.targetWireframeCreator.createTargetWireframe();
    }

    /**
     * Create star geometry for wireframe display
     * Delegates to WireframeRenderer
     */
    createStarGeometry(radius) {
        return this.wireframeRendererManager.createStarGeometry(radius);
    }

    /**
     * Update target display information
     */
    updateTargetDisplay() {
        // console.log(`🎯 updateTargetDisplay called: enabled=${this.targetComputerEnabled}, currentTarget=${this.currentTarget?.name || 'none'}, targets=${this.targetObjects?.length || 0}`);

        // Only log when target actually changes
        if (this._lastLoggedTarget !== this.currentTarget?.name) {
            debug('TARGETING', `🎯 TARGET_SWITCH: updateTargetDisplay() - target: ${this.currentTarget?.name || 'none'}, type: ${this.currentTarget?.type || 'unknown'}`);
            this._lastLoggedTarget = this.currentTarget?.name;
        }

        if (!this.targetComputerEnabled) {
            debug('INSPECTION', `🔍 Target display update skipped - target computer disabled`);
            return;
        }

        // Don't update display during power-up animation
        if (this.isPoweringUp) {
            debug('TARGETING', `🎯 updateTargetDisplay: Skipping due to power-up animation`);
            return;
        }

        // console.log(`🎯 updateTargetDisplay: Proceeding with display update`);

        // Check if we need to recreate wireframe due to discovery status change
        const targetDataForDiscoveryCheck = this.getCurrentTargetData();
        if (targetDataForDiscoveryCheck && this.currentTarget) {
            const currentDiscoveryStatus = targetDataForDiscoveryCheck.isShip || this.isObjectDiscovered(targetDataForDiscoveryCheck);
            
            // Store the last known discovery status for this target
            if (this.currentTarget._lastDiscoveryStatus === undefined) {
                this.currentTarget._lastDiscoveryStatus = currentDiscoveryStatus;
                debug('TARGETING', `🎯 Initial discovery status for ${targetDataForDiscoveryCheck.name}: ${currentDiscoveryStatus}`);
            } else if (this.currentTarget._lastDiscoveryStatus !== currentDiscoveryStatus) {
                // Discovery status changed - recreate wireframe with new colors
                debug('TARGETING', `🎯 Discovery status changed for ${targetDataForDiscoveryCheck.name}: ${this.currentTarget._lastDiscoveryStatus} -> ${currentDiscoveryStatus}`);
                this.currentTarget._lastDiscoveryStatus = currentDiscoveryStatus;
                
                // Clear existing wireframe first - CRITICAL FIX: Use wireframeScene not main scene
                if (this.targetWireframe) {
                    this.wireframeScene.remove(this.targetWireframe);
                    if (this.targetWireframe.geometry) {
                        this.targetWireframe.geometry.dispose();
                    }
                    if (this.targetWireframe.material) {
                        this.targetWireframe.material.dispose();
                    }
                    this.targetWireframe = null;
                }
                
                // Recreate wireframe with updated discovery status
                this.createTargetWireframe();
                debug('TARGETING', `🎯 Wireframe recreated for discovery status change: ${targetDataForDiscoveryCheck.name}`);
            }
        }
        
        // Handle case where no target is selected
        if (!this.currentTarget) {
            this.targetInfoDisplay.innerHTML = `
                <div style="background-color: #2a2a2a; color: #D0D0D0; padding: 8px; border-radius: 4px; margin-bottom: 8px; text-align: center; border: 1px solid #555555;">
                    <div style="font-weight: bold; font-size: 12px;">No Target Selected</div>
                    <div style="font-size: 10px;">Press TAB to cycle targets</div>
                </div>
            `;
            this.hideTargetReticle();
            // Hide service icons when there is no current target
            if (this.statusIconsContainer) {
                this.statusIconsContainer.style.display = 'none';
            }
            return;
        }

        // Get target position safely FIRST - before getting currentTargetData
        // This prevents the race condition where we get target data, set HUD colors,
        // then discover the target has no valid position and gets cleared
        const targetPos = this.getTargetPosition(this.currentTarget);
        if (!targetPos) {
            debug('P1', '🎯 Cannot calculate distance for range check - invalid target position');
            // Clear the target immediately to prevent inconsistent state
            this.clearCurrentTarget();
            return;
        }

        const currentTargetData = this.getCurrentTargetData();
        // Debug logging for target data issues
        if (!currentTargetData) {
            debug('TARGETING', `No currentTargetData for target: ${this.currentTarget?.name || 'unknown'}, targetIndex: ${this.targetIndex}, targetObjects.length: ${this.targetObjects.length}`);
            return;
        }
        
        // console.log(`🎯 DEBUG: Display updating with target data:`, {
        //     name: currentTargetData.name,
        //     type: currentTargetData.type,
        //     targetIndex: this.targetIndex,
        //     currentTargetName: this.currentTarget?.name
        // }); // Reduced debug spam
        
        // console.log(`🎯 DEBUG: currentTargetData for ${currentTargetData.name}:`, {
        //     hasShip: !!currentTargetData.ship,
        //     shipName: currentTargetData.ship?.shipName,
        //     isShip: currentTargetData.isShip,
        //     type: currentTargetData.type,
        //     rawData: currentTargetData
        // }); // Reduce spam

        const distance = this.calculateDistance(this.camera.position, targetPos);
        
        // Get target info for diplomacy status and actions
        let info = null;
        let isEnemyShip = false;
        
if (window?.DEBUG_TCM) debug('TARGETING', `🎯 DEBUG: About to get target info for currentTarget:`, this.currentTarget?.name, 'currentTargetData:', currentTargetData?.name);
        
        // First, try to get enhanced target info from the ship's TargetComputer system
        const ship = this.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');
        const enhancedTargetInfo = targetComputer?.getCurrentTargetInfo();
        
        if (enhancedTargetInfo) {
            // Use the comprehensive target information from TargetComputer
            info = enhancedTargetInfo;
            // Use consolidated diplomacy logic instead of old hardcoded check
            const diplomacy = this.getTargetDiplomacy(currentTargetData);
            isEnemyShip = diplomacy === 'enemy' && currentTargetData?.isShip;

        } else if (currentTargetData.isShip && currentTargetData.ship) {
            // Use consolidated diplomacy logic for ships and target dummies
            const diplomacy = this.getTargetDiplomacy(currentTargetData);
            isEnemyShip = diplomacy === 'enemy';
            info = {
                type: 'enemy_ship',
                diplomacy: diplomacy,
                name: currentTargetData.ship.shipName,
                shipType: currentTargetData.ship.shipType
            };
        } else {
            // Final fallback: Prefer the processed target data; fall back to solar system info using the underlying object
            const targetObject = this.currentTarget?.object || this.currentTarget;
            const bodyInfo = this.solarSystemManager.getCelestialBodyInfo(targetObject) || {};
            // Prefer Star Charts/target list data for name/type
            const preferredName = currentTargetData?.name || bodyInfo.name;
            const preferredType = currentTargetData?.type || bodyInfo.type;
            info = { ...bodyInfo, name: preferredName, type: preferredType };
            // For non-ship targets, use consolidated diplomacy logic
            const diplomacy = this.getTargetDiplomacy(currentTargetData || bodyInfo);
            isEnemyShip = diplomacy === 'enemy';
        }
        
if (window?.DEBUG_TCM) debug('INSPECTION', `🎯 DEBUG: Final info object:`, info);
        
        // Update HUD border color based on diplomacy using consolidated logic
        // SPECIAL CASE: Handle waypoints first (always magenta)
        const isWaypointForColors = currentTargetData?.type === 'waypoint' || currentTargetData?.isWaypoint || currentTargetData?.isVirtual;
        let diplomacyColor = '#44ffff'; // Default teal for unknown
        
        if (isWaypointForColors) {
            diplomacyColor = '#ff00ff'; // Magenta for waypoints
            debug('WAYPOINTS', `🎨 Using magenta HUD color for waypoint: ${currentTargetData?.name}`);
        } else {
            // Check discovery status first - undiscovered objects should always show as unknown
            // Also check if object has valid position - objects without positions should show as unknown
            const hasValidPosition = this.getTargetPosition(currentTargetData) !== null;
            const isObjectDiscoveredForDiplomacy = currentTargetData?.isShip || (this.isObjectDiscovered(currentTargetData) && hasValidPosition);
            const diplomacy = isObjectDiscoveredForDiplomacy ? this.getTargetDiplomacy(currentTargetData) : 'unknown';

            if (diplomacy === 'enemy') {
                diplomacyColor = '#ff3333'; // Enemy red
            } else if (diplomacy === 'neutral') {
                diplomacyColor = '#ffff00'; // Neutral yellow (includes stars via getTargetDiplomacy)
            } else if (diplomacy === 'friendly') {
                diplomacyColor = '#00ff41'; // Friendly green
            } else if (diplomacy === 'unknown') {
                diplomacyColor = '#44ffff'; // Unknown teal
            }
        }
        
        this.targetHUD.style.borderColor = diplomacyColor;

        // Update wireframe container border color to match
        if (this.wireframeContainer) {
            this.wireframeContainer.style.borderColor = diplomacyColor;
        }

        // Get sub-target information from player's targeting computer
        const playerShip = this.viewManager?.getShip();
        const targetComputerForSubTargets = playerShip?.getSystem('target_computer');
        let subTargetHTML = '';
        
        // Add sub-target information if available and target is discovered
        const isTargetDiscovered = currentTargetData?.discovered === true; // Only true if explicitly discovered
        
            // Debug logging for subsystem targeting (for undiscovered objects)
            if ((currentTargetData?.discovered === false || currentTargetData?._isUndiscovered) && Math.random() < 0.1) {
                debug('TARGETING', `🚫 SUBSYSTEM CHECK for undiscovered ${currentTargetData.name}`, {
                    discovered: currentTargetData.discovered,
                    _isUndiscovered: currentTargetData._isUndiscovered,
                    isTargetDiscovered: isTargetDiscovered,
                    hasSubTargeting: targetComputerForSubTargets?.hasSubTargeting(),
                    willShowSubsystems: targetComputerForSubTargets && targetComputerForSubTargets.hasSubTargeting() && (currentTargetData?.isShip || isTargetDiscovered)
                });
            }
        
        if (targetComputerForSubTargets && targetComputerForSubTargets.hasSubTargeting() && (currentTargetData?.isShip || isTargetDiscovered)) {
            // For enemy ships and space stations, use actual sub-targeting
            const isSpaceStation = info?.type === 'station' || 
                                    (info?.type && (
                                        info.type.toLowerCase().includes('station') ||
                                        info.type.toLowerCase().includes('complex') ||
                                        info.type.toLowerCase().includes('platform') ||
                                        info.type.toLowerCase().includes('facility') ||
                                        info.type.toLowerCase().includes('base')
                                    )) ||
                                    currentTargetData.type === 'station' || 
                                    (currentTargetData.type && (
                                        currentTargetData.type.toLowerCase().includes('station') ||
                                        currentTargetData.type.toLowerCase().includes('complex') ||
                                        currentTargetData.type.toLowerCase().includes('platform') ||
                                        currentTargetData.type.toLowerCase().includes('facility') ||
                                        currentTargetData.type.toLowerCase().includes('base')
                                    )) ||
                                    (this.currentTarget?.userData?.isSpaceStation);
            
            // Reduced debug noise

            // Only log for target dummies to debug the sub-targeting issue
            if (currentTargetData.name && currentTargetData.name.includes('Target Dummy')) {
                if (window?.DEBUG_TCM) debug('TARGETING', `🎯 Sub-targeting check: isEnemyShip=${isEnemyShip}, currentTargetData.ship=${!!currentTargetData.ship}, isSpaceStation=${isSpaceStation}`);
                if (window?.DEBUG_TCM) debug('TARGETING', `🎯 Sub-targeting DEBUG: isShip=${currentTargetData.isShip}, type=${currentTargetData.type}, ship=${!!currentTargetData.ship}, isTargetDummy=${currentTargetData.ship?.isTargetDummy}`);
            }
            if ((isEnemyShip && currentTargetData.ship) || isSpaceStation) {
                // Note: Target is already set via setTarget() in cycleTarget method
                // The setTarget() method automatically calls updateSubTargets()
                // So we don't need to call it again here to avoid console spam
                
                if (targetComputerForSubTargets.currentSubTarget) {
                    const subTarget = targetComputerForSubTargets.currentSubTarget;
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
                    const accuracyBonus = Math.round(targetComputerForSubTargets.getSubTargetAccuracyBonus() * 100);
                    const damageBonus = Math.round(targetComputerForSubTargets.getSubTargetDamageBonus() * 100);
                    
                    // Create health bar display matching main hull health style
                    const healthBarSection = `
                        <div style="margin-top: 8px; padding: 4px 0;">
                            <div class=\"tcm-subsystem-label\" style=\"font-weight: bold; font-size: 11px; margin-bottom: 2px;\">${subTarget.displayName}: ${healthPercent}%</div>
                            <div style="background-color: #333; border: 1px solid #666; height: 8px; border-radius: 2px; overflow: hidden;">
                                <div style="background-color: white; height: 100%; width: ${healthPercent}%; transition: width 0.3s ease;"></div>
                            </div>
                        </div>`;
                    
                    subTargetHTML = `
                        <div style="
                            background-color: ${isEnemyShip ? '#ff0000' : diplomacyColor}; 
                            color: ${isEnemyShip ? 'white' : '#000000'}; 
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
                            <div style="font-size: 9px; opacity: 0.6; margin-top: 2px;">
                                Z X to cycle sub-targets
                            </div>
                        </div>
                    `;
                } else {
                    // Show available sub-targets count
                    const availableTargets = targetComputerForSubTargets.availableSubTargets.length;
                    if (availableTargets > 0) {
                        subTargetHTML = `
                            <div style="
                                background-color: ${diplomacyColor}; 
                                color: #000000; 
                                padding: 6px; 
                                border-radius: 4px; 
                                margin-top: 4px;
                                font-weight: bold;
                            ">
                                <div style="font-size: 12px; margin-bottom: 2px;">SYSTEM:</div>
                                <div style="font-size: 11px; opacity: 0.8;">
                                    ${availableTargets} targetable systems detected
                                </div>
                                <div style="font-size: 9px; opacity: 0.6; margin-top: 2px;">
                                    Z X to cycle sub-targets
                                </div>
                            </div>
                        `;
                    }
                }
            }
        }

        // Update target information display with colored background and black text
        let typeDisplay = info?.type || 'Unknown';
        if (isEnemyShip) {
            // Remove redundant "(Enemy Ship)" text since faction colors already indicate hostility
            typeDisplay = info.shipType;
        }
        
        // Clear outOfRange flag if target is back within normal range
        if (currentTargetData?.outOfRange && distance <= 150) {
            debug('TARGETING', `Target ${currentTargetData.name} back in range (${distance.toFixed(1)}km) - clearing outOfRange flag`);
            currentTargetData.outOfRange = false;
            
            // Also clear the flag in the original target object in targetObjects array
            if (this.targetIndex >= 0 && this.targetIndex < this.targetObjects.length) {
                const originalTargetData = this.targetObjects[this.targetIndex];
                if (originalTargetData) {
                    originalTargetData.outOfRange = false;
                }
            }
        }
        
        // Format distance for display - check if target is flagged as out of range
        const formattedDistance = currentTargetData.outOfRange ? 'Out of Range' : this.formatDistance(distance);
        
        // Create hull health section for enemy ships and stations
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
                    <div class="tcm-hull-label" style="font-weight: bold; font-size: 11px; margin-bottom: 2px;">HULL: ${displayPercentage}%</div>
                    <div style="background-color: #333; border: 1px solid #666; height: 8px; border-radius: 2px; overflow: hidden;">
                        <div style="background-color: white; height: 100%; width: ${hullPercentage}%; transition: width 0.3s ease;"></div>
                    </div>
                </div>`;
        } else if ((info?.type === 'station' || (info?.type && (
                            info.type.toLowerCase().includes('station') ||
                            info.type.toLowerCase().includes('complex') ||
                            info.type.toLowerCase().includes('platform') ||
                            info.type.toLowerCase().includes('facility') ||
                            info.type.toLowerCase().includes('base')
                        ))) && targetComputer && isTargetDiscovered) {
            // Use station's Hull Plating sub-system as hull indicator
            const hullSystem = targetComputer.availableSubTargets?.find(s => s.systemName === 'hull_plating');
            if (hullSystem) {
                let raw = (typeof hullSystem.healthPercentage === 'number') ? hullSystem.healthPercentage : hullSystem.health;
                let hullPercent = 0;
                if (typeof raw === 'number') {
                    hullPercent = raw <= 1 ? Math.round(raw * 100) : Math.round(raw);
                }
                hullPercent = Math.max(0, Math.min(100, hullPercent));

                hullHealthSection = `
                    <div style="margin-top: 8px; padding: 4px 0;">
                        <div class="tcm-hull-label" style="font-weight: bold; font-size: 11px; margin-bottom: 2px;">HULL: ${hullPercent}%</div>
                        <div style="background-color: #333; border: 1px solid #666; height: 8px; border-radius: 2px; overflow: hidden;">
                            <div style="background-color: white; height: 100%; width: ${hullPercent}%; transition: width 0.3s ease;"></div>
                        </div>
                    </div>`;
            }
        }
        
        // Determine text and background colors based on target type
        let textColor, backgroundColor;
        if (isEnemyShip) {
            // White text on solid red background for hostile enemies
            textColor = 'white';
            backgroundColor = '#ff0000';
        } else {
            // Friendly (green) and Neutral (yellow) should use black text
            backgroundColor = diplomacyColor;
            const isYellow = backgroundColor.toLowerCase() === '#ffff00';
            const isGreen = backgroundColor.toLowerCase() === '#00ff41';
            textColor = (isYellow || isGreen) ? 'black' : 'white';
        }
        
        // Prefer currentTargetData for display name/type to avoid mismatches
        // Check discovery status to determine if we should show real name or "Unknown"
        // Use the same logic as diplomacy - require both discovery and valid position
        // SPECIAL CASE: Waypoints are always considered "discovered" since they're mission targets
        const isWaypoint = currentTargetData?.isVirtual || currentTargetData?.type === 'waypoint' || currentTargetData?.isWaypoint;
        const hasValidPositionForDisplay = this.getTargetPosition(currentTargetData) !== null;
        const isObjectDiscovered = currentTargetData?.isShip || isWaypoint || (this.isObjectDiscovered(currentTargetData) && hasValidPositionForDisplay);
        let displayName;
        
        if (!isObjectDiscovered && !currentTargetData?.isShip) {
            // Undiscovered non-ship objects show as "Unknown"
            displayName = 'Unknown';

        } else {
            // Discovered objects or ships show their real name
            displayName = currentTargetData?.name || info?.name || 'Unknown Target';
        }
        
        let displayType;
        if (!isObjectDiscovered && !currentTargetData?.isShip) {
            // Undiscovered non-ship objects show type as "Unknown"
            displayType = 'Unknown';
        } else {
            // Discovered objects or ships show their real type
            displayType = (currentTargetData?.type || info?.type || 'Unknown');
            if (isEnemyShip && info?.shipType) {
                displayType = info.shipType;
            }
        }
if (window?.DEBUG_TCM) debug('TARGETING', `🎯 DEBUG: Setting targetInfoDisplay.innerHTML with name: "${displayName}", type: "${displayType}", distance: "${formattedDistance}"`);
        // Update main target info display (without sub-system targeting)
        this.targetInfoDisplay.innerHTML = `
            <div style="background-color: ${backgroundColor}; color: ${textColor}; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
                <div style="font-weight: bold; font-size: 12px;">${displayName}</div>
                <div style="font-size: 10px;">${displayType}</div>
                <div style="font-size: 10px;">${formattedDistance}</div>
                ${hullHealthSection}
            </div>
        `;

        // Update sub-system panel content and show/hide based on availability
        if (subTargetHTML && subTargetHTML.trim()) {
            // Update sub-system panel content
            this.subSystemContent.innerHTML = `
                ${subTargetHTML}
            `;
            
            // Update sub-system wireframe based on current sub-target
            const playerShip = this.viewManager?.getShip();
            const targetComputerForWireframe = playerShip?.getSystem('target_computer');
            if (targetComputerForWireframe && targetComputerForWireframe.currentSubTarget) {
                const subTarget = targetComputerForWireframe.currentSubTarget;
                this.updateSubSystemWireframe(subTarget.systemName, subTarget.health, diplomacyColor);
            }
            
            // Show the sub-system panel with animation
            this.showSubSystemPanel();
            
            // Update sub-system panel border color to match main HUD
            this.updateSubSystemPanelColor(diplomacyColor);
        } else {
            // Clear wireframe when no sub-systems available
            this.updateSubSystemWireframe(null);
            
            // Hide the sub-system panel with animation
            this.hideSubSystemPanel();
        }
if (window?.DEBUG_TCM) debug('TARGETING', `🎯 DEBUG: targetInfoDisplay.innerHTML set to:`, this.targetInfoDisplay.innerHTML.substring(0, 200) + '...');

        // Update status icons with diplomacy color
        this.updateStatusIcons(distance, diplomacyColor, isEnemyShip, info, isObjectDiscovered);

        // Ensure hull/subsystem labels use black for friendly/neutral, white for hostile
        const hullLabels = this.targetInfoDisplay.querySelectorAll('.tcm-hull-label');
        hullLabels.forEach(lbl => {
            if (!isEnemyShip) {
                lbl.style.color = 'black';
            } else {
                lbl.style.color = 'white';
            }
        });
        const subsystemLabels = this.targetInfoDisplay.querySelectorAll('.tcm-subsystem-label');
        subsystemLabels.forEach(lbl => {
            if (!isEnemyShip) {
                lbl.style.color = 'black';
            } else {
                lbl.style.color = 'white';
            }
        });

        // Update action buttons based on target type  
        this.updateActionButtons(currentTargetData, info);
        
        // Update reticle color based on faction
        this.updateReticleColor(diplomacyColor);
    }

    /**
     * Get current target data
     * Delegates to TargetDataProcessor
     * @returns {Object|null} Processed target data or null
     */
    getCurrentTargetData() {
        return this.targetDataProcessor.getCurrentTargetData();
    }

    /**
     * UNIFIED ID NORMALIZATION: Convert any target ID to proper sector-prefixed format
     * Delegates to TargetIdManager
     */
    normalizeTargetId(targetData, fallbackKey = null) {
        return this.targetIdManager.normalizeTargetId(targetData, fallbackKey);
    }

    /**
     * Construct object ID for discovery system compatibility
     * Delegates to TargetIdManager
     */
    constructObjectId(targetData) {
        return this.targetIdManager.constructObjectId(targetData);
    }

    /**
     * Construct a proper sector-prefixed ID from target data
     * Delegates to TargetIdManager
     */
    constructStarChartsId(targetData) {
        return this.targetIdManager.constructStarChartsId(targetData);
    }

    /**
     * Check if an object is discovered using StarChartsManager
     * Delegates to TargetIdManager
     */
    isObjectDiscovered(targetData) {
        return this.targetIdManager.isObjectDiscovered(targetData);
    }

    /**
     * Process target data and return standardized format
     * Delegates to TargetDataProcessor
     * @param {Object} targetData - Raw target data
     * @returns {Object|null} Standardized target data
     */
    processTargetData(targetData) {
        return this.targetDataProcessor.processTargetData(targetData);
    }

    /**
     * Get star system information from solar system manager
     */
    getStarSystem() {
        return this.solarSystemManager?.getStarSystem?.() || null;
    }

    /**
     * Calculate distance between two points
     */
    calculateDistance(point1, point2) {
        // Use unified DistanceCalculator for consistent results across all systems
        return DistanceCalculator.calculate(point1, point2);
    }

    /**
     * Format distance for display
     * Delegates to TargetPositionManager
     * @param {number} distanceInKm - Distance in kilometers
     * @returns {string} Formatted distance string
     */
    formatDistance(distanceInKm) {
        return this.targetPositionManager.formatDistance(distanceInKm);
    }

    /**
     * Update method called from StarfieldManager
     */
    update(deltaTime) {
        if (!this.targetComputerEnabled) {
            return;
        }

        // Update reticle position if we have a target
        if (this.currentTarget) {
            this.updateReticlePosition();
            this.updateReticleTargetInfo();
        }

        // Render wireframe if target computer is enabled and we have a target
        if (this.targetWireframe && this.wireframeScene && this.wireframeRenderer) {
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
                debug('P1', `Error rendering wireframe: ${error}`);
            }
        }

        // Update direction arrow
        if (this.currentTarget) {
            this.updateDirectionArrow();
        } else {
            // Hide all arrows
            this.hideAllDirectionArrows();
        }
    }

    /**
     * Update reticle position on screen
     * Delegates to TargetReticleManager
     */
    updateReticlePosition() {
        this.targetReticleManager.updateReticlePosition();
    }

    /**
     * Update reticle target info (name and distance)
     * Delegates to TargetReticleManager
     */
    updateReticleTargetInfo() {
        this.targetReticleManager.updateReticleTargetInfo();
    }

    /**
     * Update direction arrow
     * Delegates to DirectionArrowRenderer
     */
    updateDirectionArrow() {
        this.directionArrowRenderer.updateDirectionArrow();
    }

    /**
     * Hide all direction arrows
     * Delegates to DirectionArrowRenderer
     */
    hideAllDirectionArrows() {
        this.directionArrowRenderer.hideAllDirectionArrows();
    }

    /**
     * Create visual indicators for sub-targeting on the wireframe
     */
    createSubTargetIndicators(radius, baseColor) {
        // DISABLED: Sub-target indicators completely removed to prevent wireframe stacking
        // Always clear existing indicators if they exist
        if (this.subTargetIndicators) {
            this.subTargetIndicators.forEach(indicator => {
                this.wireframeScene.remove(indicator);
                if (indicator.geometry) indicator.geometry.dispose();
                if (indicator.material) indicator.material.dispose();
            });
        }
        this.subTargetIndicators = [];
        
        // Early return - sub-target indicators are completely disabled
        debug('TARGETING', `🎯 SUB-TARGETS: Sub-target indicators disabled to prevent stacking`);
        return;
    }

    /**
     * Update sub-target visual indicators based on current selection
     * DISABLED: Sub-target indicators are completely disabled
     */
    updateSubTargetIndicators() {
        // Sub-target indicators are disabled - nothing to update
        return;
    }

    /**
     * Create 3D target outline in the world
     * Delegates to TargetOutlineManager
     */
    createTargetOutline(targetObject, outlineColor = '#00ff41', targetData = null) {
        this.targetOutlineManager.createTargetOutline(targetObject, outlineColor, targetData);
    }

    /**
     * Update 3D target outline
     * Delegates to TargetOutlineManager
     */
    updateTargetOutline(targetObject, deltaTime) {
        this.targetOutlineManager.updateTargetOutline(targetObject, deltaTime);
    }

    /**
     * Clear 3D target outline
     * Delegates to TargetOutlineManager
     */
    clearTargetOutline() {
        this.targetOutlineManager.clearTargetOutline();
    }

    /**
     * Get outline color for target based on diplomacy
     * Delegates to TargetOutlineManager
     */
    getOutlineColorForTarget(targetData) {
        return this.targetOutlineManager.getOutlineColorForTarget(targetData);
    }

    /**
     * Remove destroyed target from target list and automatically cycle to next target
     * Delegates to DestroyedTargetHandler
     */
    removeDestroyedTarget(destroyedShip) {
        this.destroyedTargetHandler.removeDestroyedTarget(destroyedShip);
    }

    /**
     * Refresh the current target and its wireframe
     * Delegates to TargetHUDController
     */
    refreshCurrentTarget() {
        this.targetHUDController.refreshCurrentTarget();
    }

    /**
     * Show the target HUD
     * Delegates to TargetHUDController
     */
    showTargetHUD() {
        this.targetHUDController.showTargetHUD();
    }

    /**
     * Hide the target HUD
     * Delegates to TargetHUDController
     */
    hideTargetHUD() {
        this.targetHUDController.hideTargetHUD();
    }
    
    /**
     * Set the target HUD border color
     */
    /**
     * Set target by object ID (for Star Charts integration)
     * Delegates to TargetSelectionManager
     * @param {string} objectId - The ID of the object to target
     * @returns {boolean} Whether the target was successfully set
     */
    setTargetById(objectId) {
        return this.targetSelectionManager.setTargetById(objectId);
    }

    /**
     * Set target by name (fallback for Star Charts integration)
     * Delegates to TargetSelectionManager
     * @param {string} objectName - The name of the object to target
     * @returns {boolean} Whether the target was successfully set
     */
    setTargetByName(objectName) {
        return this.targetSelectionManager.setTargetByName(objectName);
    }

    // Removed duplicate setVirtualTarget method - using the enhanced version below

    /**
     * Set the target HUD border color based on diplomacy
     * Delegates to TargetHUDController
     */
    setTargetHUDBorderColor(color) {
        this.targetHUDController.setTargetHUDBorderColor(color);
    }

    /**
     * Update scan line color to match faction
     * Delegates to TargetHUDController
     */
    updateScanLineColor(color) {
        this.targetHUDController.updateScanLineColor(color);
    }
    
    /**
     * Show the target reticle
     * Delegates to TargetReticleManager
     */
    showTargetReticle() {
        this.targetReticleManager.showTargetReticle();
    }

    /**
     * Hide the target reticle
     * Delegates to TargetReticleManager
     */
    hideTargetReticle() {
        this.targetReticleManager.hideTargetReticle();
    }

    /**
     * Update the target info display with HTML content
     * Delegates to TargetHUDController
     */
    updateTargetInfoDisplay(htmlContent) {
        this.targetHUDController.updateTargetInfoDisplay(htmlContent);
    }

    /**
     * Set target reticle position
     * Delegates to TargetReticleManager
     */
    setTargetReticlePosition(x, y) {
        this.targetReticleManager.setTargetReticlePosition(x, y);
    }

    /**
     * Update reticle color based on target faction
     * Delegates to TargetReticleManager
     */
    updateReticleColor(diplomacyColor = '#44ffff') {
        this.targetReticleManager.updateReticleColor(diplomacyColor);
    }

    /**
     * Get target reticle corners for styling
     * Delegates to TargetReticleManager
     */
    getTargetReticleCorners() {
        return this.targetReticleManager.getTargetReticleCorners();
    }
    
    /**
     * Update status icons with diplomacy color and info
     * Delegates to HUDStatusManager
     */
    updateStatusIcons(distance, diplomacyColor, isEnemyShip, info, isObjectDiscovered) {
        this.hudStatusManager.updateStatusIcons(distance, diplomacyColor, isEnemyShip, info, isObjectDiscovered);
    }

    /**
     * Update arrow colors to match diplomacy
     * Delegates to DirectionArrowRenderer
     */
    updateArrowColors(diplomacyColor) {
        this.directionArrowRenderer.updateArrowColors(diplomacyColor);
    }

    /**
     * Update action buttons based on target type
     * Delegates to HUDStatusManager
     */
    updateActionButtons(currentTargetData, info) {
        this.hudStatusManager.updateActionButtons(currentTargetData, info);
    }

    /**
     * Clear action buttons container
     * Delegates to HUDStatusManager
     */
    clearActionButtons() {
        this.hudStatusManager.clearActionButtons();
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        debug('TARGETING', '⚡ TargetComputerManager disposal started...');

        // Abort all event listeners registered with AbortController
        if (this._abortController) {
            this._abortController.abort();
            this._abortController = null;
        }

        // Stop wireframe animation
        this.stopWireframeAnimation();

        // Clean up TargetingFeedbackManager (handles timers and audio)
        if (this.targetingFeedbackManager) {
            this.targetingFeedbackManager.dispose();
        }

        // Clean up TargetOutlineManager
        if (this.targetOutlineManager) {
            this.targetOutlineManager.dispose();
        }

        // Clean up HUDStatusManager
        if (this.hudStatusManager) {
            this.hudStatusManager.dispose();
        }

        // Clean up TargetIdManager
        if (this.targetIdManager) {
            this.targetIdManager.dispose();
        }

        // Clean up wireframe renderer
        if (this.wireframeRenderer) {
            this.wireframeRenderer.dispose();
            this.wireframeRenderer = null;
        }

        // Clean up sub-system wireframe renderer
        if (this.subSystemWireframeRenderer) {
            this.subSystemWireframeRenderer.dispose();
            this.subSystemWireframeRenderer = null;
        }

        // Clean up target wireframe
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

        // Clean up wireframe scene children
        if (this.wireframeScene) {
            while (this.wireframeScene.children.length > 0) {
                const child = this.wireframeScene.children[0];
                this.wireframeScene.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
            this.wireframeScene = null;
        }

        // Clean up sub-system wireframe scene
        if (this.subSystemWireframeScene) {
            while (this.subSystemWireframeScene.children.length > 0) {
                const child = this.subSystemWireframeScene.children[0];
                this.subSystemWireframeScene.remove(child);
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
            this.subSystemWireframeScene = null;
        }

        // Clean up UI elements
        if (this.targetHUD && this.targetHUD.parentNode) {
            this.targetHUD.parentNode.removeChild(this.targetHUD);
            this.targetHUD = null;
        }
        if (this.targetReticle && this.targetReticle.parentNode) {
            this.targetReticle.parentNode.removeChild(this.targetReticle);
            this.targetReticle = null;
        }
        if (this.subSystemPanel && this.subSystemPanel.parentNode) {
            this.subSystemPanel.parentNode.removeChild(this.subSystemPanel);
            this.subSystemPanel = null;
        }

        // Clean up direction arrows
        Object.values(this.directionArrows).forEach(arrow => {
            if (arrow && arrow.parentNode) {
                arrow.parentNode.removeChild(arrow);
            }
        });
        this.directionArrows = {};

        // Clean up target outline
        this.clearTargetOutline();

        // Clear known targets cache (delegated to TargetListManager)
        if (this.targetListManager) {
            this.targetListManager.dispose();
        }

        // Clean up TargetStateManager
        if (this.targetStateManager) {
            this.targetStateManager.dispose();
        }

        // Clean up DestroyedTargetHandler
        if (this.destroyedTargetHandler) {
            this.destroyedTargetHandler.dispose();
        }

        // Clean up TargetHUDController
        if (this.targetHUDController) {
            this.targetHUDController.dispose();
        }

        // Clean up TargetComputerToggle
        if (this.targetComputerToggle) {
            this.targetComputerToggle.dispose();
        }

        // Clean up TargetWireframeCreator
        if (this.targetWireframeCreator) {
            this.targetWireframeCreator.dispose();
        }

        // Clean up ClickCycleHandler
        if (this.clickCycleHandler) {
            this.clickCycleHandler.dispose();
        }

        // Clean up TargetHUDBuilder
        if (this.targetHUDBuilder) {
            this.targetHUDBuilder.dispose();
        }

        // Clear target arrays
        this.targetObjects = [];
        this.validTargets = [];
        this.subTargetIndicators = [];
        this.targetableAreas = [];

        // Null out references
        this.currentTarget = null;
        this.previousTarget = null;
        this.targetedObject = null;
        this.scene = null;
        this.camera = null;
        this.viewManager = null;
        this.solarSystemManager = null;

        debug('TARGETING', '✅ TargetComputerManager disposal complete');
    }

    /**
     * Stop wireframe animation
     * Delegates to WireframeRenderer
     */
    stopWireframeAnimation() {
        this.wireframeRendererManager.stopWireframeAnimation();
    }

    /**
     * Activate target computer and select first target if available
     * Delegates to TargetStateManager
     */
    activateTargetComputer() {
        this.targetStateManager.activateTargetComputer();
    }

    /**
     * Deactivate target computer and hide HUD
     * Delegates to TargetStateManager
     */
    deactivateTargetComputer() {
        this.targetStateManager.deactivateTargetComputer();
    }

    /**
     * Cycle to next target
     * Delegates to TargetStateManager
     */
    cycleTargetNext() {
        this.targetStateManager.cycleTargetNext();
    }

    /**
     * Cycle to previous target
     * Delegates to TargetStateManager
     */
    cycleTargetPrevious() {
        this.targetStateManager.cycleTargetPrevious();
    }

    /**
     * Get parent planet name for moons
     */
    getParentPlanetName(moon) {
        if (!this.solarSystemManager) return null;
        
        // Implementation depends on solar system manager structure
        // This is a placeholder - would need actual implementation
        return null;
    }

    /**
     * Update current sector - resets target computer state on sector changes
     * Delegates to TargetSectorManager
     */
    updateCurrentSector() {
        this.targetSectorManager.updateCurrentSector();
    }

    /**
     * Calculate current sector based on position
     * Delegates to TargetSectorManager
     * @returns {string} Current sector identifier
     */
    calculateCurrentSector() {
        return this.targetSectorManager.calculateCurrentSector();
    }

    /**
     * Clear target computer state completely - removes all target data and UI elements
     * Delegates to TargetStateManager
     */
    clearTargetComputer() {
        this.targetStateManager.clearTargetComputer();
    }

    /**
     * Clear target wireframe only
     * Delegates to WireframeRenderer
     */
    clearTargetWireframe() {
        this.wireframeRendererManager.clearTargetWireframe();
        // Keep local reference in sync for backwards compatibility
        this.targetWireframe = this.wireframeRendererManager.targetWireframe;
        this.subTargetIndicators = this.wireframeRendererManager.subTargetIndicators;
    }

    /**
     * Safely get position from target object (handles different target structures)
     * Delegates to TargetPositionManager
     * @param {Object} target - Target object to extract position from
     * @returns {THREE.Vector3|null} Position vector or null if not found
     */
    getTargetPosition(target) {
        return this.targetPositionManager.getTargetPosition(target);
    }

    /**
     * Clear current target and reset target state
     * Delegates to TargetStateManager
     */
    clearCurrentTarget() {
        this.targetStateManager.clearCurrentTarget();
    }

    /**
     * Find next valid target when current target is invalid
     * Delegates to TargetStateManager
     */
    findNextValidTarget() {
        this.targetStateManager.findNextValidTarget();
    }

    /**
     * Star Charts Integration Methods
     * These methods provide decoupled targeting for the Star Charts system
     */

    /**
     * Target waypoint using the same code path as TAB targeting
     * Delegates to WaypointTargetManager
     */
    targetWaypointViaCycle(waypointData) {
        return this.waypointTargetManager.targetWaypointViaCycle(waypointData);
    }

    /**
     * Set virtual target (Mission waypoint integration)
     * Delegates to WaypointTargetManager
     */
    setVirtualTarget(waypointData) {
        return this.waypointTargetManager.setVirtualTarget(waypointData);
    }

    /**
     * Remove virtual target by ID
     * Delegates to WaypointTargetManager
     */
    removeVirtualTarget(waypointId) {
        return this.waypointTargetManager.removeVirtualTarget(waypointId);
    }

    /**
     * Get all virtual targets
     * Delegates to WaypointTargetManager
     */
    getVirtualTargets() {
        return this.waypointTargetManager.getVirtualTargets();
    }

    /**
     * Check if current target is virtual
     * Delegates to WaypointTargetManager
     */
    isCurrentTargetVirtual() {
        return this.waypointTargetManager.isCurrentTargetVirtual();
    }

    /**
     * Get wireframe configuration for an object type using centralized data
     * Delegates to WireframeRenderer
     */
    getWireframeConfig(objectType) {
        return this.wireframeRendererManager.getWireframeConfig(objectType);
    }

    /**
     * Create a standard wireframe geometry for unknown/undiscovered objects
     * Delegates to WireframeRenderer
     */
    createUnknownWireframeGeometry(radius) {
        return this.wireframeRendererManager.createUnknownWireframeGeometry(radius);
    }

    /**
     * Create geometry from centralized wireframe configuration
     * Delegates to WireframeRenderer
     */
    createGeometryFromConfig(geometryType, radius) {
        return this.wireframeRendererManager.createGeometryFromConfig(geometryType, radius);
    }

    // ========== WAYPOINT SYSTEM INTEGRATION ==========


    /**
     * Check if current target is a waypoint
     * Delegates to WaypointTargetManager
     */
    isCurrentTargetWaypoint() {
        return this.waypointTargetManager.isCurrentTargetWaypoint();
    }

    /**
     * Enhanced setTarget with waypoint interruption tracking
     * Delegates to WaypointTargetManager
     */
    setTarget(newTarget) {
        return this.waypointTargetManager.setTarget(newTarget);
    }

    /**
     * Resume interrupted waypoint
     * Delegates to WaypointTargetManager
     */
    resumeInterruptedWaypoint() {
        return this.waypointTargetManager.resumeInterruptedWaypoint();
    }

    /**
     * Check if there's an interrupted waypoint
     * Delegates to WaypointTargetManager
     */
    hasInterruptedWaypoint() {
        return this.waypointTargetManager.hasInterruptedWaypoint();
    }

    /**
     * Get interrupted waypoint
     * Delegates to WaypointTargetManager
     */
    getInterruptedWaypoint() {
        return this.waypointTargetManager.getInterruptedWaypoint();
    }

    /**
     * Clear interrupted waypoint state
     * Delegates to WaypointTargetManager
     */
    clearInterruptedWaypoint() {
        return this.waypointTargetManager.clearInterruptedWaypoint();
    }


    // ========== WAYPOINT INTEGRATION METHODS ==========

    /**
     * Get faction color based on diplomacy status
     * Delegates to WaypointTargetManager
     */
    getFactionColor(target) {
        return this.waypointTargetManager.getFactionColor(target);
    }

    /**
     * Add waypoints to the targeting system
     * Delegates to WaypointTargetManager
     */
    addWaypointsToTargets() {
        return this.waypointTargetManager.addWaypointsToTargets();
    }

    /**
     * Apply waypoint-specific HUD colors (magenta)
     * Delegates to WaypointTargetManager
     */
    setWaypointHUDColors() {
        return this.waypointTargetManager.setWaypointHUDColors();
    }

    /**
     * Create waypoint-specific wireframe (diamond shape)
     * Delegates to WaypointTargetManager
     */
    createWaypointWireframe() {
        return this.waypointTargetManager.createWaypointWireframe();
    }

    /**
     * Cycle to previous target (same as SHIFT-TAB)
     * Delegates to ClickCycleHandler
     */
    cycleToPreviousTarget() {
        return this.clickCycleHandler.cycleToPreviousTarget();
    }

    /**
     * Cycle to next target (same as TAB)
     * Delegates to ClickCycleHandler
     */
    cycleToNextTarget() {
        return this.clickCycleHandler.cycleToNextTarget();
    }

    /**
     * Cycle to previous sub-target (same as Z key)
     * Delegates to ClickCycleHandler
     */
    cycleToPreviousSubTarget() {
        return this.clickCycleHandler.cycleToPreviousSubTarget();
    }

    /**
     * Cycle to next sub-target (same as X key)
     * Delegates to ClickCycleHandler
     */
    cycleToNextSubTarget() {
        return this.clickCycleHandler.cycleToNextSubTarget();
    }

}