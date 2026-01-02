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
     * @param {string} faction - Faction name
     * @returns {string} Diplomacy status ('friendly', 'neutral', 'enemy')
     */
    getFactionDiplomacy(faction) {
        // Log null/undefined faction for debugging (data quality issue)
        if (!faction) {
            debug('TARGETING', `⚠️ getFactionDiplomacy: null/undefined faction, defaulting to 'neutral'`);
            return 'neutral';
        }
        
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
        
        // Case-insensitive lookup: find faction by comparing lowercase versions
        const factionKey = Object.keys(factionRelations).find(key => 
            key.toLowerCase() === faction.toLowerCase()
        );
        
        // Log unknown faction for debugging (possible typo or missing faction)
        if (!factionKey) {
            debug('TARGETING', `⚠️ getFactionDiplomacy: Unknown faction "${faction}", defaulting to 'neutral'`);
            return 'neutral';
        }
        
        return factionRelations[factionKey];
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
     */
    createTargetComputerHUD() {
        // Create main target HUD container - match original position and styling
        this.targetHUD = document.createElement('div');
        this.targetHUD.style.cssText = `
            position: fixed;
            bottom: 50px;
            left: 10px;
            width: 200px;
            height: auto;
            border: 2px solid #D0D0D0;
            background: rgba(0, 0, 0, 0.7);
            color: #D0D0D0;
            font-family: "Courier New", monospace;
            font-size: 14px;
            padding: 10px;
            display: none;
            pointer-events: auto;
            z-index: 1000;
            transition: border-color 0.3s ease;
            overflow: visible;
            cursor: pointer;
        `;

        // Create wireframe display - delegates to WireframeRenderer
        this.wireframeRendererManager.createWireframeDisplay();
        // Expose elements for backwards compatibility
        this.wireframeContainer = this.wireframeRendererManager.wireframeContainer;
        this.wireframeRenderer = this.wireframeRendererManager.wireframeRenderer;
        this.wireframeScene = this.wireframeRendererManager.wireframeScene;
        this.wireframeCamera = this.wireframeRendererManager.wireframeCamera;

        // Create target info display with click zones for TAB/SHIFT-TAB functionality
        this.targetInfoDisplay = document.createElement('div');
        this.targetInfoDisplay.style.cssText = `
            width: 100%;
            text-align: left;
            margin-bottom: 10px;
            pointer-events: auto;
            position: relative;
            z-index: 10000;
            cursor: pointer;
        `;
        
        // Ensure all child elements don't block clicks by setting pointer-events: none on children
        const targetInfoStyle = document.createElement('style');
        targetInfoStyle.textContent = `
            .target-info-display * {
                pointer-events: none;
            }
            .status-icons-container * {
                pointer-events: none;
            }
            .action-buttons-container * {
                pointer-events: none;
            }
        `;
        document.head.appendChild(targetInfoStyle);
        this.targetInfoDisplay.className = 'target-info-display';
        
        // Add click handler for left/right half targeting (with abort signal for cleanup)

        // Forward any clicks on the main container to the targetInfoDisplay for seamless interaction
        this.targetHUD.addEventListener('click', (event) => {
            // Always forward clicks to targetInfoDisplay for consistent behavior
            // This handles clicks on child elements within the info display
            const newEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                clientX: event.clientX,
                clientY: event.clientY
            });
            this.targetInfoDisplay.dispatchEvent(newEvent);
        }, { signal: this._abortController.signal });

        this.targetInfoDisplay.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            const rect = this.targetInfoDisplay.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const halfWidth = rect.width / 2;

            if (clickX < halfWidth) {
                // Left half - same as SHIFT-TAB (previous target)
                this.cycleToPreviousTarget();
            } else {
                // Right half - same as TAB (next target)
                this.cycleToNextTarget();
            }
        }, { signal: this._abortController.signal });
        

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
            cursor: pointer;
        `;
        this.statusIconsContainer.className = 'status-icons-container';

        // Create icons with tooltips - match original (with abort signal for cleanup)
        const createIcon = (symbol, tooltip) => {
            const icon = document.createElement('div');
            icon.style.cssText = `
                cursor: help;
                opacity: 0.8;
                transition: all 0.2s ease;
                position: relative;
                width: 24px;
                height: 24px;
                border: 1px solid #D0D0D0;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: "Courier New", monospace;
                font-size: 14px;
                text-shadow: 0 0 4px #D0D0D0;
                box-shadow: 0 0 4px rgba(208, 208, 208, 0.4);
            `;
            icon.innerHTML = symbol;
            icon.title = tooltip;

            // Add hover effects (with abort signal for cleanup)
            icon.addEventListener('mouseenter', () => {
                icon.style.opacity = '1';
                icon.style.transform = 'scale(1.1)';
                // Box shadow will be updated by updateStatusIcons with diplomacy color
            }, { signal: this._abortController.signal });

            icon.addEventListener('mouseleave', () => {
                icon.style.opacity = '0.8';
                icon.style.transform = 'scale(1)';
                // Box shadow will be updated by updateStatusIcons with diplomacy color
            }, { signal: this._abortController.signal });

            return icon;
        };

        // New station service icons (5):
        this.serviceIcons = {
            // Combine Repair & Refuel with Energy Recharge: keep name of former, icon of latter
            repairRefuel: createIcon('⚡', 'Repair & Refuel'),
            shipRefit: createIcon('🛠️', 'Ship Refitting'),
            tradeExchange: createIcon('💰', 'Trade Exchange'),
            missionBoard: createIcon('📋', 'Mission Board')
        };
        Object.values(this.serviceIcons).forEach(icon => this.statusIconsContainer.appendChild(icon));

        // Create action buttons container
        this.actionButtonsContainer = document.createElement('div');
        this.actionButtonsContainer.style.cssText = `
            width: 100%;
            display: flex;
            justify-content: space-between;
            gap: 8px;
            position: relative;
            z-index: 1004;
            cursor: pointer;
        `;
        this.actionButtonsContainer.className = 'action-buttons-container';

        // Create direction arrows for off-screen targets
        this.createDirectionArrows();

        // Add scan line effects to sync with comm HUD
        this.addTargetScanLineEffects();

        // Assemble the HUD - match original order
        this.targetHUD.appendChild(this.wireframeContainer);
        this.targetHUD.appendChild(this.targetInfoDisplay);
        this.targetHUD.appendChild(this.statusIconsContainer);
        this.targetHUD.appendChild(this.actionButtonsContainer);
        
        // Create and add sub-system panel to main HUD (positioned absolutely to the right)
        // Delegates to SubSystemPanelManager
        this.subSystemPanelManager.createSubSystemPanel(this.targetHUD, this._abortController);
        // Expose DOM elements for backwards compatibility
        this.subSystemPanel = this.subSystemPanelManager.subSystemPanel;
        this.subSystemWireframeContainer = this.subSystemPanelManager.subSystemWireframeContainer;
        this.subSystemWireframeRenderer = this.subSystemPanelManager.subSystemWireframeRenderer;
        this.subSystemWireframeScene = this.subSystemPanelManager.subSystemWireframeScene;
        this.subSystemWireframeCamera = this.subSystemPanelManager.subSystemWireframeCamera;
        this.subSystemContent = this.subSystemPanelManager.subSystemContent;

        document.body.appendChild(this.targetHUD);
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
     */
    toggleTargetComputer() {
        const ship = this.viewManager?.getShip();
        if (!ship) {
            debug('P1', 'No ship available for target computer control');
            return;
        }

        const targetComputer = ship.getSystem('target_computer');
        if (!targetComputer) {
            debug('P1', 'No target computer system found on ship');
            return;
        }
        
        // Toggle the target computer system
        if (targetComputer.isActive) {
            // Clear target BEFORE deactivating the system
            if (targetComputer.setTarget) {
                targetComputer.setTarget(null);
            }
            targetComputer.deactivate();
            this.targetComputerEnabled = false;
            debug('TARGETING', 'Target computer deactivated');
        } else {
            debug('TARGETING', 'Attempting to activate target computer...');
            debug('TARGETING', 'Target computer canActivate result:', targetComputer.canActivate ? targetComputer.canActivate() : 'canActivate method not available');
            debug('TARGETING', 'Target computer isOperational result:', targetComputer.isOperational ? targetComputer.isOperational() : 'isOperational method not available');

            if (targetComputer.activate(ship)) {
                this.targetComputerEnabled = true;
                debug('TARGETING', 'Target computer activated successfully');
            } else {
                this.targetComputerEnabled = false;
                debug('P1', 'Failed to activate target computer - check system status and energy');
                debug('TARGETING', `Target computer activation failed. isActive: ${targetComputer.isActive}, health: ${targetComputer.healthPercentage}, state: ${targetComputer.state}`);
                return;
            }
        }
        
        if (!this.targetComputerEnabled) {
            this.targetHUD.style.display = 'none';
            this.targetReticle.style.display = 'none';
            
            // Clear target info display to prevent "unknown target" flash
            this.targetInfoDisplay.innerHTML = '';
            
            // Clear current target to ensure clean reactivation
            this.currentTarget = null;
            this.targetIndex = -1;
            
            
            // Stop all monitoring when target computer is disabled
            this.stopNoTargetsMonitoring();
            this.stopRangeMonitoring();
            
            // Clear wireframe if it exists
            if (this.targetWireframe) {
                this.wireframeScene.remove(this.targetWireframe);
                this.targetWireframe.geometry.dispose();
                this.targetWireframe.material.dispose();
                this.targetWireframe = null;
            }
            
            // Clear 3D outline when target computer is disabled
            this.clearTargetOutline();
        } else {
            // Show the HUD immediately when target computer is enabled
            this.targetHUD.style.display = 'block';
            
            // Show "Powering up" animation while initializing
            this.showPowerUpAnimation();
            
            this.updateTargetList();
            
            // Use a longer delay to allow for power-up animation and target initialization
            setTimeout(() => {
                // Hide the power-up animation
                this.hidePowerUpAnimation();
                
                // Only auto-select target if no manual selection exists
                if (!this.preventTargetChanges) {
                    this.targetIndex = -1;
                    if (this.targetObjects.length > 0) {
                        // console.log(`🎯 Target Computer activation: Auto-selecting nearest target (no manual selection)`);
                        // Call cycleTarget directly and then sync with StarfieldManager
                        this.cycleTarget(); // Auto-select first target
                        
                        // Stop no targets monitoring since we have a target
                        this.stopNoTargetsMonitoring();
                        
                        // Play audio feedback for target acquisition on startup
                        this.playAudio('frontend/static/audio/blurb.mp3');
                        
                        // Start monitoring the selected target's range
                        this.startRangeMonitoring();
                        
                        // Manually sync with StarfieldManager to ensure UI updates
                        if (this.viewManager?.starfieldManager) {
                            this.viewManager.starfieldManager.currentTarget = this.currentTarget?.object || this.currentTarget;
                            this.viewManager.starfieldManager.targetIndex = this.targetIndex;
                            this.viewManager.starfieldManager.targetObjects = this.targetObjects;
                            
                            // Update 3D outline for automatic cycle (if enabled)
                            if (this.currentTarget && this.viewManager.starfieldManager.outlineEnabled && 
                                !this.viewManager.starfieldManager.outlineDisabledUntilManualCycle) {
                                this.viewManager.starfieldManager.updateTargetOutline(this.currentTarget?.object || this.currentTarget, 0);
                            }
                        }
                        
                        // Force direction arrow update when target changes
                        this.updateDirectionArrow();

                    } else {
                        // console.log('🎯 No targets available for initial selection');
                        this.showNoTargetsDisplay(); // Show special "No targets in range" display
                    }
                } else {
                    // Preserve existing selection without blocking future manual cycling
                    // console.log(`🎯 Target Computer activation: Preserving existing selection - ${this.currentTarget?.name || 'unknown'}`);
                    this.updateTargetDisplay();
                }
            }, 800); // Longer delay for power-up animation (0.8 seconds)
        }
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
     * @param {Object} targetData - Target data object
     * @returns {string} Diplomacy status ('enemy', 'friendly', 'neutral')
     */
    getTargetDiplomacy(targetData) {
        if (!targetData) {
            return 'unknown';
        }

        // SPECIAL CASE: Stars always show as neutral regardless of faction or diplomacy properties
        // This ensures consistent yellow coloring across HUD, wireframe, and direction arrows
        if (targetData.type === 'star') {
            return 'neutral';
        }

        // DISCOVERY COLOR FIX: Check if object is discovered first
        const isDiscovered = targetData.isShip || this.isObjectDiscovered(targetData);
        
        if (!isDiscovered) {
            // Undiscovered objects should have unknown diplomacy
            return 'unknown';
        }

        // For DISCOVERED objects, determine proper faction standing
        // 1. Direct diplomacy property (highest priority)
        if (targetData.diplomacy && targetData.diplomacy !== 'unknown') {
            return targetData.diplomacy;
        }

        // 2. Faction-based diplomacy
        // Skip 'Unknown' faction (placeholder for undiscovered objects) - let it fall through to step 4.5
        if (targetData.faction && targetData.faction !== 'Unknown') {
            const factionDiplomacy = this.getFactionDiplomacy(targetData.faction);
            if (factionDiplomacy && factionDiplomacy !== 'unknown') {
                return factionDiplomacy;
            }
        }

        // 3. Ship diplomacy (for ship targets)
        if (targetData.ship?.diplomacy) {
            return targetData.ship.diplomacy;
        }

        // 4. Celestial body info diplomacy (for planets, stations, etc.)
        const info = this.solarSystemManager?.getCelestialBodyInfo(targetData.object || targetData);
        if (info?.diplomacy) {
            return info.diplomacy;
        }

        // 4.5. Celestial body faction (especially important for stations!)
        // This catches stations with faction data that don't have explicit diplomacy property
        if (info?.faction) {
            const factionDiplomacy = this.getFactionDiplomacy(info.faction);
            if (factionDiplomacy && factionDiplomacy !== 'unknown') {
                return factionDiplomacy;
            }
        }

        // 5. Default logic for discovered objects based on type
        // Only use these defaults if no faction/diplomacy data was found above
        if (targetData.type === 'station') {
            return 'neutral'; // Stations without faction data default to neutral
        }

        if (targetData.type === 'planet' || targetData.type === 'moon') {
            return 'neutral'; // Planets/moons are neutral
        }

        if (targetData.type === 'beacon' || targetData.type === 'navigation_beacon') {
            return 'neutral'; // Beacons are neutral
        }

        if (targetData.isShip) {
            return 'unknown'; // Ships need proper faction data
        }

        // Default for other discovered objects
        return 'neutral';
    }

    /**
     * Add a single target with proper deduplication
     */
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
     */
    notifyStarChartsOfTargetChange() {
        debug('TARGETING', `🎯 notifyStarChartsOfTargetChange() called`);
        
        // Check if Star Charts is open and available
        // The UI is stored as starChartsUI in NavigationSystemManager, not as starChartsManager.ui
        const starChartsUI = this.viewManager?.navigationSystemManager?.starChartsUI;
        
        debug('TARGETING', `🎯 starChartsUI exists: ${!!starChartsUI}`);
        debug('TARGETING', `🎯 starChartsUI.isVisible: ${starChartsUI?.isVisible}`);
        
        if (starChartsUI && starChartsUI.isVisible) {
            debug('TARGETING', `🎯 BEFORE Star Charts render - current target: ${this.currentTarget?.name || 'none'} (ID: ${this.currentTarget?.id || 'none'})`);
            
            // Use requestAnimationFrame to ensure render happens on next frame
            requestAnimationFrame(() => {
                debug('TARGETING', `🎯 FRAME render - current target: ${this.currentTarget?.name || 'none'} (ID: ${this.currentTarget?.id || 'none'})`);
                
                // Center on the new target (like clicking on it would do)
                if (this.currentTarget && this.currentTarget.name) {
                    // Try to find the target object for centering
                    let targetObject = null;
                    
                    // First try to get it from Star Charts database
                    if (this.currentTarget.id) {
                        targetObject = starChartsUI.starChartsManager.getObjectData(this.currentTarget.id);
                    }
                    
                    // If not found, try to find by name
                    if (!targetObject && this.currentTarget.name) {
                        targetObject = starChartsUI.findObjectByName(this.currentTarget.name);
                    }
                    
                    // If we found the target object, center on it
                    if (targetObject) {
                        starChartsUI.centerOnTarget(targetObject);
                        debug('TARGETING', `🎯 TAB: Centered Star Charts on new target: ${this.currentTarget.name}`);
                    } else {
                        // Just render without centering if target not found in Star Charts
                        starChartsUI.render();
                        debug('TARGETING', `🎯 TAB: Target ${this.currentTarget.name} not found in Star Charts, rendered without centering`);
                    }
                } else {
                    // No target, just render
                    starChartsUI.render();
                }
                
                debug('TARGETING', `🎯 AFTER frame Star Charts render - notified of target change`);
            });
        } else {
            debug('TARGETING', `🎯 Star Charts not available for notification - not visible or not initialized`);
        }
    }

    /**
     * Create wireframe for current target
     */
    createTargetWireframe() {
        debug('TARGETING', `🖼️ createTargetWireframe() called for target: ${this.currentTarget?.name || 'none'}`);
        
        if (!this.currentTarget) {
            debug('TARGETING', '🖼️ No current target - aborting wireframe creation');
            return;
        }

        // SPECIAL CASE: If this is a waypoint, delegate to waypoint wireframe creation
        if (this.currentTarget && this.currentTarget.isWaypoint) {
            debug('WAYPOINTS', `🎯 Delegating to createWaypointWireframe for: ${this.currentTarget.name}`);
            this.createWaypointWireframe();
            return;
        }

        const childrenBefore = this.wireframeScene.children.length;
        debug('TARGETING', `🖼️ Wireframe scene children before: ${childrenBefore}`);

        // Clear any existing wireframe first to prevent duplicates
        this.clearTargetWireframe();
        
        const childrenAfter = this.wireframeScene.children.length;
        // Only log if there's a significant change
        if (childrenBefore !== childrenAfter) {
            debug('UI', `🖼️ WIREFRAME: Scene children: ${childrenBefore} -> ${childrenAfter}`);
        }

        try {
            // Ensure currentTarget is hydrated with a real object/position before building geometry
            if (!this.currentTarget.position) {
                try {
                    const vm = this.viewManager || window.viewManager;
                    const ssm = this.solarSystemManager || vm?.solarSystemManager || window.solarSystemManager;
                    const sfm = vm?.starfieldManager || window.starfieldManager;
                    const currentData = this.targetObjects?.[this.targetIndex];
                    const normalizedId = typeof (currentData?.id || '') === 'string' ? (currentData?.id || '').replace(/^a0_/i, 'A0_') : (currentData?.id || '');
                    let resolved = null;
                    if (currentData?.type === 'navigation_beacon' && sfm?.navigationBeacons) {
                        resolved = sfm.navigationBeacons.find(b => b?.userData?.id === normalizedId) ||
                                   sfm.navigationBeacons.find(b => (b?.userData?.name || b?.name) === currentData.name);
                    }
                    if (!resolved && ssm?.celestialBodies) {
                        resolved = ssm.celestialBodies.get(normalizedId) ||
                                   ssm.celestialBodies.get(`beacon_${normalizedId}`) ||
                                   ssm.celestialBodies.get(`station_${currentData?.name?.toLowerCase()?.replace(/\s+/g, '_')}`);
                    }
                    if (resolved) {
                        this.currentTarget = resolved;
                        this.targetObjects[this.targetIndex] = { ...currentData, object: resolved, position: resolved.position };
                    }
                } catch (_) {}
            }
            // Normalize references
            const currentTargetData = this.getCurrentTargetData();
            const targetObject = this.currentTarget?.object || this.currentTarget;

            // Derive radius from actual target geometry when possible
            let radius = 1;
            if (targetObject?.geometry) {
                if (!targetObject.geometry.boundingSphere) {
                    targetObject.geometry.computeBoundingSphere();
                }
                radius = targetObject.geometry.boundingSphere?.radius || radius;
            }

            // Determine target info (use same logic as updateTargetDisplay)
        let info = null;
       let wireframeColor = 0x44ffff; // default teal for unknown
       let isEnemyShip = false;

       // Determine target info, prioritizing Star Charts data over spatial manager data
       const ship = this.viewManager?.getShip();
       const targetComputer = ship?.getSystem('target_computer');
       const enhancedTargetInfo = targetComputer?.getCurrentTargetInfo();

       // Start with currentTargetData from Star Charts (has correct normalized types)
       info = currentTargetData || {};

       if (enhancedTargetInfo) {
           // Merge enhanced info but preserve the correct type from Star Charts
           info = {
               ...enhancedTargetInfo,
               type: currentTargetData?.type || enhancedTargetInfo.type,
               name: currentTargetData?.name || enhancedTargetInfo.name
           };
       } else if (currentTargetData?.isShip) {
           info = { type: 'enemy_ship' };
           radius = Math.max(radius, 2);
       } else if (!info.type) {
           // Fallback to SolarSystemManager only if we don't have type info
           const solarInfo = this.solarSystemManager?.getCelestialBodyInfo(targetObject);
           if (solarInfo) {
               info = { ...info, ...solarInfo };
           }
       }

       // CRITICAL FIX: Update wireframe color and isEnemyShip based on diplomacy using consolidated logic
       const diplomacy = this.getTargetDiplomacy(currentTargetData);

       // DISCOVERY COLOR FIX: Clear cached discovery status to ensure fresh data
       if (this.currentTarget) {
           this.currentTarget._lastDiscoveryStatus = undefined;
       }

       // Check discovery status for wireframe color using proper discovery logic
       const isDiscovered = currentTargetData?.isShip || this.isObjectDiscovered(currentTargetData);
       
       debug('TARGETING', `🎨 WIREFRAME COLOR: ${currentTargetData?.name} - isDiscovered: ${isDiscovered}, diplomacy: ${diplomacy}, faction: ${info?.faction}`);
       
       if (!isDiscovered) {
           // Undiscovered objects use unknown faction color (cyan)
           wireframeColor = 0x44ffff; // Cyan for unknown/undiscovered
           debug('TARGETING', `🎨 Using CYAN wireframe for undiscovered: ${currentTargetData?.name}`);
       } else {
           // DISCOVERY COLOR FIX: Faction-based coloring for discovered objects
           if (currentTargetData?.type === 'waypoint' || currentTargetData?.isVirtual) {
               wireframeColor = 0xff00ff; // Magenta for waypoints
           } else {
               // Pure faction-based coloring
               switch (diplomacy) {
                   case 'enemy':
                   case 'hostile':
                       wireframeColor = 0xff3333; // Red for hostile
                       isEnemyShip = currentTargetData?.isShip; // Set enemy ship flag
                       break;
                   case 'friendly':
                   case 'ally':
                       wireframeColor = 0x44ff44; // Green for friendly
                       break;
                   case 'neutral':
                       wireframeColor = 0xffff44; // Yellow for neutral
                       break;
                   case 'unknown':
                       wireframeColor = 0x44ffff; // Cyan for unknown faction
                       break;
                   default:
                       // No diplomacy data - default to neutral
                       wireframeColor = 0xffff44; // Yellow (neutral) as default
                       break;
               }
           }
           
           debug('TARGETING', `🎨 Using faction-based wireframe for discovered: ${currentTargetData?.name} → ${diplomacy || 'default'}`);
       }

       // Override color for waypoints
       if (this.currentTarget && this.currentTarget.isWaypoint) {
           wireframeColor = 0xff00ff; // Magenta for waypoints
           debug('WAYPOINTS', '🎨 Using magenta color for waypoint wireframe');
       }

            const wireframeMaterial = new this.THREE.LineBasicMaterial({
                color: wireframeColor,
                linewidth: 1,
                transparent: true,
                opacity: 0.8
            });

            // Check if object is discovered to determine wireframe type
            if (!isDiscovered) {
                // Undiscovered objects use a standard "unknown" wireframe shape
                debug('INSPECTION', `🔍 Creating unknown wireframe for undiscovered object`);
                const unknownGeometry = this.createUnknownWireframeGeometry(radius);
                this.targetWireframe = new this.THREE.LineSegments(unknownGeometry, wireframeMaterial);
            } else {
                // Use centralized wireframe type mapping for discovered objects
                const resolvedType = (currentTargetData?.type || '').toLowerCase();
                const wireframeConfig = this.getWireframeConfig(resolvedType);

                if (wireframeConfig.geometry === 'star') {
                    const starGeometry = this.createStarGeometry(radius);
                    this.targetWireframe = new this.THREE.LineSegments(starGeometry, wireframeMaterial);
                } else {
                    let baseGeometry = null;

                    // Handle special cases that need additional logic
                    if (wireframeConfig.geometry === 'box') {
                        // Box geometry is only for enemy ships - verify this is actually an enemy ship
                        if (info?.type === 'enemy_ship' || currentTargetData?.isShip) {
                            baseGeometry = new this.THREE.BoxGeometry(radius, radius, radius);
                        }
                        // If not an enemy ship but config says 'box', baseGeometry stays null
                        // and we'll fall through to the standard geometry creation
                    } else if (wireframeConfig.geometry === 'torus') {
                        // Space stations - use centralized configuration
                        const ringR = Math.max(radius * 0.8, 1.0);
                        const ringTube = Math.max(radius * 0.25, 0.3);
                        baseGeometry = new this.THREE.TorusGeometry(ringR, ringTube, 8, 16);
                    } else {
                        // Standard geometries from centralized mapping
                        baseGeometry = this.createGeometryFromConfig(wireframeConfig.geometry, radius);
                    }

                    // Create wireframe from base geometry if we have one
                    if (baseGeometry) {
                        const edgesGeometry = new this.THREE.EdgesGeometry(baseGeometry);
                        this.targetWireframe = new this.THREE.LineSegments(edgesGeometry, wireframeMaterial);
                        // Dispose the temporary base geometry; keep edgesGeometry until clear
                        baseGeometry.dispose();
                    } else if (targetObject?.geometry && targetObject.geometry.isBufferGeometry) {
                        // Fallback to actual target geometry if no base geometry was created
                        const edgesGeometry = new this.THREE.EdgesGeometry(targetObject.geometry);
                        this.targetWireframe = new this.THREE.LineSegments(edgesGeometry, wireframeMaterial);
                    } else {
                        // Final fallback - create default icosahedron geometry
                        const defaultGeometry = new this.THREE.IcosahedronGeometry(radius, 0);
                        const edgesGeometry = new this.THREE.EdgesGeometry(defaultGeometry);
                        this.targetWireframe = new this.THREE.LineSegments(edgesGeometry, wireframeMaterial);
                        defaultGeometry.dispose();
                    }
                }
            }

            // Clear any existing sub-target indicators (they are disabled)
            this.createSubTargetIndicators(0, 0);

            // Ensure wireframe was created successfully before using it
            if (!this.targetWireframe) {
                debug('TARGETING', `🎯 WIREFRAME: ERROR - No wireframe created for ${currentTargetData?.name || 'unknown'}`);
                return;
            }

            this.targetWireframe.position.set(0, 0, 0);
            this.wireframeScene.add(this.targetWireframe);
            
            const finalChildren = this.wireframeScene.children.length;
            const childTypes = this.wireframeScene.children.map(child => child.constructor.name).join(', ');

            this.wireframeCamera.position.z = Math.max(radius * 3, 3);
            this.targetWireframe.rotation.set(0.5, 0, 0.3);
            
            debug('TARGETING', `🖼️ Wireframe creation SUCCESS: target=${this.currentTarget?.name}, wireframeExists=${!!this.targetWireframe}, wireframeType=${this.targetWireframe?.constructor?.name}, sceneChildren=${this.wireframeScene.children.length}`);

        } catch (error) {
            debug('TARGETING', `🖼️ Wireframe creation ERROR: ${error.message}`);
            debug('P1', `Error creating target wireframe: ${error}`);
        }
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
     */
    removeDestroyedTarget(destroyedShip) {
        if (!destroyedShip) {
            return;
        }

debug('TARGETING', `💥 removeDestroyedTarget called for: ${destroyedShip.shipName || 'unknown ship'}`);

        // Get ship systems for proper cleanup
        const ship = this.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');

        // Check if the destroyed ship is currently targeted by any system
        const isCurrentTarget = this.currentTarget === destroyedShip;
        const isCurrentTargetData = this.getCurrentTargetData()?.ship === destroyedShip;
        const isWeaponTarget = ship?.weaponSystem?.lockedTarget === destroyedShip;
        const isTargetComputerTarget = targetComputer?.currentTarget === destroyedShip;

        const anySystemTargeting = isCurrentTarget || isCurrentTargetData || isWeaponTarget || isTargetComputerTarget;

debug('TARGETING', `🔍 Checking targeting systems for destroyed ship: ${destroyedShip.shipName}`);
debug('TARGETING', `   • Current target: ${isCurrentTarget}`);
debug('TARGETING', `   • Current target data: ${isCurrentTargetData}`);
debug('TARGETING', `   • Weapon system target: ${isWeaponTarget}`);
debug('TARGETING', `   • Target computer target: ${isTargetComputerTarget}`);
debug('TARGETING', `   • Any system targeting: ${anySystemTargeting}`);

        if (anySystemTargeting) {
debug('TARGETING', 'Destroyed ship was targeted - performing full synchronization cleanup');

            // Store the previous target index for smart target selection
            const previousTargetIndex = this.targetIndex;

            // Clear ALL targeting system references
            this.currentTarget = null;
            this.targetIndex = -1;

            if (ship?.weaponSystem) {
                ship.weaponSystem.setLockedTarget(null);
            }

            if (targetComputer) {
                targetComputer.clearTarget();
                targetComputer.clearSubTarget();
            }

            // ALWAYS clear 3D outline when a targeted ship is destroyed
            // console.log('🎯 Clearing 3D outline for destroyed target');
            this.clearTargetOutline();

            // Update target list to remove destroyed ship
            this.updateTargetList();

            // Smart target selection after destruction
            if (this.targetObjects && this.targetObjects.length > 0) {
debug('TARGETING', `🔄 Selecting new target from ${this.targetObjects.length} available targets`);

                // Prevent outlines from appearing automatically after destruction
                if (this.viewManager?.starfieldManager) {
                    this.viewManager.starfieldManager.outlineDisabledUntilManualCycle = true;
                }

                // Smart target index selection - try to stay close to previous position
                let newTargetIndex = 0;
                if (previousTargetIndex >= 0 && previousTargetIndex < this.targetObjects.length) {
                    // Use the same index if still valid
                    newTargetIndex = previousTargetIndex;
                } else if (previousTargetIndex >= this.targetObjects.length) {
                    // If previous index is now beyond array bounds, use the last target
                    newTargetIndex = this.targetObjects.length - 1;
                }

                // Set the new target directly instead of cycling
                this.targetIndex = newTargetIndex;
                const targetData = this.targetObjects[this.targetIndex];
                this.currentTarget = targetData?.object || null;

                if (this.currentTarget) {
                    // console.log(`🎯 Selected new target: ${targetData.name} (index ${this.targetIndex})`);
                    
                    // Update UI for new target
                    this.updateTargetDisplay();
                    this.updateReticleTargetInfo();
                } else {
debug('P1', '❌ Failed to select valid target after destruction');
                    this.targetIndex = -1;
                }

                // console.log('🎯 Target selection complete - outline disabled until next manual cycle');
            } else {
debug('TARGETING', '📭 No targets remaining after destruction');

                // CRITICAL: Force clear outline again when no targets remain
                // console.log('🎯 Force-clearing outline - no targets remaining');
                this.clearTargetOutline();

                // Clear wireframe and hide UI
                this.clearTargetWireframe();
                this.hideTargetHUD();
                this.hideTargetReticle();
            }
        } else {
            
            // Just update the target list without changing current target
            this.updateTargetList();
        }

debug('TARGETING', `✅ removeDestroyedTarget complete for: ${destroyedShip.shipName || 'unknown ship'}`);
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
     * Show the target HUD
     */
    showTargetHUD() {
        if (this.targetHUD) {
            this.targetHUD.style.display = 'block';
        }
    }
    
    /**
     * Hide the target HUD
     */
    hideTargetHUD() {
        if (this.targetHUD) {
            this.targetHUD.style.display = 'none';
        }
        
        // Also hide the sub-system panel
        this.hideSubSystemPanel();
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

    setTargetHUDBorderColor(color) {
        // Check if current target is a waypoint - preserve magenta color
        if (this.currentTarget && this.currentTarget.isWaypoint) {
            const waypointColor = '#ff00ff'; // Magenta
            debug('WAYPOINTS', `🎨 Preserving waypoint color ${waypointColor} instead of ${color}`);
            
            if (this.targetHUD) {
                this.targetHUD.style.borderColor = waypointColor;
                this.targetHUD.style.color = waypointColor;
            }
            
            // Update scan line color to match waypoint
            this.updateScanLineColor(waypointColor);
            return;
        }
        
        // Normal target color handling
        if (this.targetHUD) {
            this.targetHUD.style.borderColor = color;
            this.targetHUD.style.color = color;
        }
        
        // Update scan line color to match faction
        this.updateScanLineColor(color);
    }
    
    /**
     * Update scan line color to match faction
     */
    updateScanLineColor(color) {
        if (this.animatedScanLine) {
            this.animatedScanLine.style.background = `linear-gradient(90deg, transparent, ${color}, transparent)`;
        }
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
     */
    updateTargetInfoDisplay(htmlContent) {
        if (this.targetInfoDisplay) {
            this.targetInfoDisplay.innerHTML = htmlContent;
        }
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
     */
    activateTargetComputer() {
        debug('TARGETING', `🎯 activateTargetComputer called: targetComputerEnabled=${this.targetComputerEnabled}, isPoweringUp=${this.isPoweringUp}, targets=${this.targetObjects?.length || 0}`);
        this.targetComputerEnabled = true;

        // If we have targets, select the first one
        if (this.targetObjects && this.targetObjects.length > 0) {
            this.targetIndex = 0;
            debug('TARGETING', `🎯 activateTargetComputer: About to call updateTargetDisplay after activation`);
            this.updateTargetDisplay();
            // Force direction arrow update when target computer is activated
            this.updateDirectionArrow();
        }
        
        // console.log('🎯 Target Computer activated and display updated');
    }

    /**
     * Deactivate target computer and hide HUD
     */
    deactivateTargetComputer() {
        this.targetComputerEnabled = false;
        this.currentTarget = null;
        this.targetIndex = -1;
        this.isManualNavigationSelection = false; // Reset navigation selection flag
        this.isManualSelection = false; // Reset manual selection flag
        
        if (this.targetHUD) {
            this.targetHUD.style.display = 'none';
        }
        if (this.targetReticle) {
            this.targetReticle.style.display = 'none';
        }
        
        // Stop wireframe animation and clear wireframe
        this.stopWireframeAnimation();
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
        
        // console.log('🎯 Target Computer deactivated');
    }

    /**
     * Cycle to next target
     */
    cycleTargetNext() {
        if (!this.targetComputerEnabled || !this.targetObjects || this.targetObjects.length === 0) {
            return;
        }
        
        this.targetIndex = (this.targetIndex + 1) % this.targetObjects.length;
        this.updateTargetDisplay();
    }

    /**
     * Cycle to previous target  
     */
    cycleTargetPrevious() {
        if (!this.targetComputerEnabled || !this.targetObjects || this.targetObjects.length === 0) {
            return;
        }
        
        this.targetIndex = this.targetIndex - 1;
        if (this.targetIndex < 0) {
            this.targetIndex = this.targetObjects.length - 1;
        }
        this.updateTargetDisplay();
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
     */
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
                    // Only auto-select if no manual selection exists
                    if (!this.isManualSelection && !this.isManualNavigationSelection) {
debug('TARGETING', `🎯 Sector change: Auto-selecting nearest target (no manual selection)`);
                        this.cycleTarget(); // Auto-select nearest target
                    } else {
debug('UTILITY', `🎯 Sector change: Preserving existing manual navigation selection`);
                    }
                }, 100); // Small delay to ensure new system is fully generated
            }
        }
    }

    /**
     * Calculate current sector - placeholder implementation
     */
    calculateCurrentSector() {
        // This would need actual implementation based on camera position
        // Placeholder for now
        return 'A0';
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
        this.isManualNavigationSelection = false; // Reset navigation selection flag
        
        // Clear target computer system state if available
        const ship = this.viewManager?.getShip();
        const targetComputerSystem = ship?.getSystem('target_computer');
        if (targetComputerSystem) {
            targetComputerSystem.clearTarget();
            targetComputerSystem.deactivate();
        }
        
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
        
        // Clear 3D outline
        this.clearTargetOutline();
        
        // Disable target computer
        this.targetComputerEnabled = false;
        
        // console.log('🎯 Target computer completely cleared - all state reset');
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
     */
    clearCurrentTarget() {
        debug('TARGETING', `🎯 clearCurrentTarget() called - current target: ${this.currentTarget?.name || 'None'}`);
        
        this.currentTarget = null;
        this.targetIndex = -1;
        
        // Keep HUD visible but show "No Target" state
        if (this.targetHUD) {
            this.targetHUD.style.display = 'block';
            this.targetHUD.style.visibility = 'visible';
            this.targetHUD.style.opacity = '1';
            debug('TARGETING', `🎯 Keeping target HUD visible for "No Target" state`);
            
            // Update display to show "No Target"
            this.updateTargetDisplay();
            
            // Ensure frame elements stay visible
            setTimeout(() => {
                if (this.targetHUD) {
                    this.targetHUD.style.display = 'block';
                    this.targetHUD.style.visibility = 'visible';
                    
                    // Make sure any frame elements with styling are visible
                    const styledElements = this.targetHUD.querySelectorAll('*');
                    styledElements.forEach(el => {
                        const style = window.getComputedStyle(el);
                        if (style.borderWidth !== '0px' || 
                            style.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
                            style.backgroundImage !== 'none') {
                            if (el.style.display === 'none') {
                                el.style.display = 'block';
                            }
                            if (el.style.visibility === 'hidden') {
                                el.style.visibility = 'visible';
                            }
                        }
                    });
                }
            }, 10);
        }
        
        if (this.targetReticle) {
            this.targetReticle.style.display = 'none';
            debug('TARGETING', `🎯 Hidden target reticle`);
        }
        
        // Clear wireframe
        debug('TARGETING', `🎯 About to clear wireframe...`);
        this.clearTargetWireframe();
        
        // Clear HUD wireframe
        if (this.wireframeRenderer) {
            this.wireframeRenderer.clear();
            this.wireframeRenderer.render(new this.THREE.Scene(), new this.THREE.Camera());
        }
        
        if (this.wireframeContainer) {
            this.wireframeContainer.style.display = 'none';
        }
        
        debug('TARGETING', `🎯 Wireframe cleared`);
        
        // Hide direction arrows
        this.hideAllDirectionArrows();
        debug('TARGETING', `🎯 Direction arrows hidden`);
        
        debug('TARGETING', `✅ clearCurrentTarget() completed - HUD showing "No Target" state`);
    }

    /**
     * Find next valid target when current target is invalid
     */
    findNextValidTarget() {
        const startIndex = this.targetIndex;
        
        // Search for next valid target
        for (let i = 0; i < this.targetObjects.length; i++) {
            const nextIndex = (startIndex + i + 1) % this.targetObjects.length;
            const target = this.targetObjects[nextIndex];
            
            if (target && (target.object || target.position)) {
                this.targetIndex = nextIndex;
                // console.log(`🎯 Found valid target at index ${nextIndex}: ${target.name}`);
                return;
            }
        }
        
        // No valid targets found
        // console.warn('🎯 No valid targets found in target list');
        this.clearCurrentTarget();
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


    /**
     * Notify Star Charts of target change for real-time updates
     */
    notifyStarChartsOfTargetChange() {
        // Use requestAnimationFrame for smooth UI updates
        requestAnimationFrame(() => {
            debug('TARGETING', '🎯 notifyStarChartsOfTargetChange() ENTRY');
            
            // Access Star Charts UI directly
            const starChartsUI = this.viewManager?.navigationSystemManager?.starChartsUI;
            
            debug('TARGETING', `🎯 starChartsUI exists: ${starChartsUI ? 'true' : 'false'}`);
            debug('TARGETING', `🎯 starChartsUI.isVisible: ${starChartsUI?.isVisible}`);
            
            if (starChartsUI && starChartsUI.isVisible) {
                debug('TARGETING', '🎯 Calling Star Charts render for target change');
                starChartsUI.render();
                debug('TARGETING', '🎯 AFTER frame Star Charts render');
            }
        });
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
     */
    cycleToPreviousTarget() {
        if (this.viewManager?.starfieldManager) {
            this.viewManager.starfieldManager.cycleTarget(false); // false = backward/previous
            // Play the same sound as TAB key
            this.viewManager.starfieldManager.playCommandSound();
        }
    }

    /**
     * Cycle to next target (same as TAB)
     */
    cycleToNextTarget() {
        if (this.viewManager?.starfieldManager) {
            this.viewManager.starfieldManager.cycleTarget(true); // true = forward/next
            // Play the same sound as TAB key
            this.viewManager.starfieldManager.playCommandSound();
        }
    }

    /**
     * Cycle to previous sub-target (same as Z key)
     */
    cycleToPreviousSubTarget() {
        if (this.viewManager?.starfieldManager) {
            this.viewManager.starfieldManager.handleSubTargetingKey('previous');
        }
    }

    /**
     * Cycle to next sub-target (same as X key)
     */
    cycleToNextSubTarget() {
        if (this.viewManager?.starfieldManager) {
            this.viewManager.starfieldManager.handleSubTargetingKey('next');
        }
    }

}