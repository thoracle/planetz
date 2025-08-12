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
        
        // Outline system
        this.outlineEnabled = true;
        this.lastOutlineUpdate = 0;
        this.targetOutline = null;
        this.outlineGeometry = null;
        this.outlineMaterial = null;
        
        // Sorting state
        this.lastSortTime = 0;
        this.sortInterval = 2000; // Sort every 2 seconds
        
        // Arrow state tracking
        this.lastArrowState = null;
        
        // Power-up animation state
        this.isPoweringUp = false;
        
        // No targets monitoring state
        this.noTargetsInterval = null;
        this.isInNoTargetsMode = false;
        
        // Range monitoring state
        this.rangeMonitoringInterval = null;
        this.isRangeMonitoringActive = false;
        
        // Audio for targeting events (using HTML5 Audio for simplicity)
        this.audioElements = new Map();
        
        // Wireframe animation
        this.wireframeAnimationId = null;
        
        // Warning throttling
        this.lastTargetNotFoundWarning = 0;
        
        console.log('🎯 TargetComputerManager initialized');
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
     * Initialize the target computer manager
     */
    initialize() {
        this.createTargetComputerHUD();
        this.createTargetReticle();
        console.log('🎯 TargetComputerManager fully initialized');
    }

    /**
     * Create the target computer HUD
     */
    createTargetComputerHUD() {
        // Create main target HUD container - match original position and styling
        this.targetHUD = document.createElement('div');
        this.targetHUD.style.cssText = `
            position: fixed;
            bottom: 80px;
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
        `;

        // Create wireframe container - match original styling
        this.wireframeContainer = document.createElement('div');
        this.wireframeContainer.style.cssText = `
            width: 100%;
            height: 150px;
            border: 1px solid #D0D0D0;
            margin-bottom: 10px;
            position: relative;
            overflow: visible;
            pointer-events: none;
            z-index: 1001;
        `;

        // Create wireframe renderer - match original size
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

        // Create icons with tooltips - match original
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
            
            // Add hover effects
            icon.addEventListener('mouseenter', () => {
                icon.style.opacity = '1';
                icon.style.transform = 'scale(1.1)';
                // Box shadow will be updated by updateStatusIcons with diplomacy color
            });
            
            icon.addEventListener('mouseleave', () => {
                icon.style.opacity = '0.8';
                icon.style.transform = 'scale(1)';
                // Box shadow will be updated by updateStatusIcons with diplomacy color
            });
            
            return icon;
        };

        // Create sci-fi style icons - match original
        this.governmentIcon = createIcon('⬡', 'Government');
        this.economyIcon = createIcon('⬢', 'Economy');
        this.technologyIcon = createIcon('⬨', 'Technology');

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

        // Create direction arrows for off-screen targets
        this.createDirectionArrows();

        // Assemble the HUD - match original order
        this.targetHUD.appendChild(this.wireframeContainer);
        this.targetHUD.appendChild(this.targetInfoDisplay);
        this.targetHUD.appendChild(this.statusIconsContainer);
        this.targetHUD.appendChild(this.actionButtonsContainer);
        
        document.body.appendChild(this.targetHUD);
    }

    /**
     * Create direction arrows for off-screen targets - match original style
     */
    createDirectionArrows() {
        // Create direction arrows (one for each edge)
        this.directionArrows = {
            left: document.createElement('div'),
            right: document.createElement('div'),
            top: document.createElement('div'),
            bottom: document.createElement('div')
        };

        // Style each arrow - match original styling with proper borders
        Object.entries(this.directionArrows).forEach(([position, arrow]) => {
            arrow.style.cssText = `
                position: absolute;
                width: 0;
                height: 0;
                display: none;
                pointer-events: none;
                z-index: 1001;
            `;
            
            // Set specific border styles for each direction
            if (position === 'top') {
                arrow.style.borderLeft = '10px solid transparent';
                arrow.style.borderRight = '10px solid transparent';
                arrow.style.borderBottom = '15px solid #D0D0D0';
            } else if (position === 'bottom') {
                arrow.style.borderLeft = '10px solid transparent';
                arrow.style.borderRight = '10px solid transparent';
                arrow.style.borderTop = '15px solid #D0D0D0';
            } else if (position === 'left') {
                arrow.style.borderTop = '10px solid transparent';
                arrow.style.borderBottom = '10px solid transparent';
                arrow.style.borderRight = '15px solid #D0D0D0';
            } else if (position === 'right') {
                arrow.style.borderTop = '10px solid transparent';
                arrow.style.borderBottom = '10px solid transparent';
                arrow.style.borderLeft = '15px solid #D0D0D0';
            }
            
            document.body.appendChild(arrow); // Append to body, not HUD
        });
    }

    /**
     * Create target reticle for on-screen targets - match original style
     */
    createTargetReticle() {
        // Create target reticle corners - match original design
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

        // Create corner elements - match original bracket style
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

            // Position and style each corner - match original
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

        // Create target name display (above the reticle) - match original
        this.targetNameDisplay = document.createElement('div');
        this.targetNameDisplay.className = 'target-name-display';
        this.targetNameDisplay.style.cssText = `
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            color: #D0D0D0;
            text-shadow: 0 0 4px #D0D0D0;
            font-family: 'Orbitron', monospace;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            white-space: nowrap;
            pointer-events: none;
            z-index: 1000;
            display: none;
        `;

        // Create target distance display (below the reticle) - match original
        this.targetDistanceDisplay = document.createElement('div');
        this.targetDistanceDisplay.className = 'target-distance-display';
        this.targetDistanceDisplay.style.cssText = `
            position: absolute;
            top: 50px;
            left: 50%;
            transform: translateX(-50%);
            color: #D0D0D0;
            text-shadow: 0 0 4px #D0D0D0;
            font-family: 'Orbitron', monospace;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            white-space: nowrap;
            pointer-events: none;
            z-index: 1000;
            display: none;
        `;

        this.targetReticle.appendChild(this.targetNameDisplay);
        this.targetReticle.appendChild(this.targetDistanceDisplay);
        
        document.body.appendChild(this.targetReticle);
    }

    /**
     * Toggle target computer on/off
     */
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
            
            // Clear target info display to prevent "unknown target" flash
            this.targetInfoDisplay.innerHTML = '';
            
            // Clear current target to ensure clean reactivation
            this.currentTarget = null;
            this.targetIndex = -1;
            
            // Clear target on ship's TargetComputer system
            const ship = this.viewManager?.getShip();
            if (ship) {
                const targetComputer = ship.getSystem('target_computer');
                if (targetComputer) {
                    targetComputer.setTarget(null);
                }
            }
            
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
                
                // Always select nearest target when activating (fresh start behavior)
                if (!this.preventTargetChanges) {
                    this.targetIndex = -1;
                    if (this.targetObjects.length > 0) {
                        // Call cycleTarget directly and then sync with StarfieldManager
                        this.cycleTarget(false); // false = automatic cycle
                        
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
                    } else {
                        console.log('🎯 No targets available for initial selection');
                        this.showNoTargetsDisplay(); // Show special "No targets in range" display
                    }
                } else {
                    // Just update the display with existing target
                    this.updateTargetDisplay();
                }
            }, 800); // Longer delay for power-up animation (0.8 seconds)
        }
    }

    /**
     * Show power-up animation when target computer first activates
     */
    showPowerUpAnimation() {
        this.isPoweringUp = true;
        // Create or update power-up display
        this.targetInfoDisplay.innerHTML = `
            <div id="powerup-animation" style="
                background: linear-gradient(45deg, #001122, #002244, #001122);
                background-size: 200% 200%;
                color: #00ff41;
                padding: 20px;
                border-radius: 4px;
                text-align: center;
                border: 1px solid #00ff41;
                box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
                animation: powerUpPulse 0.8s ease-in-out infinite alternate,
                           powerUpGradient 2s ease-in-out infinite alternate;
                font-family: 'Orbitron', monospace;
            ">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">
                    TARGET COMPUTER
                </div>
                <div style="font-size: 12px; opacity: 0.8; margin-bottom: 12px;">
                    POWERING UP...
                </div>
                <div style="
                    display: flex;
                    justify-content: center;
                    gap: 4px;
                    align-items: center;
                ">
                    <div class="power-dot" style="
                        width: 8px;
                        height: 8px;
                        background: #00ff41;
                        border-radius: 50%;
                        animation: powerDot1 1.2s ease-in-out infinite;
                    "></div>
                    <div class="power-dot" style="
                        width: 8px;
                        height: 8px;
                        background: #00ff41;
                        border-radius: 50%;
                        animation: powerDot2 1.2s ease-in-out infinite;
                    "></div>
                    <div class="power-dot" style="
                        width: 8px;
                        height: 8px;
                        background: #00ff41;
                        border-radius: 50%;
                        animation: powerDot3 1.2s ease-in-out infinite;
                    "></div>
                </div>
            </div>
        `;
        
        // Add CSS animations if not already present
        if (!document.getElementById('target-computer-powerup-styles')) {
            const style = document.createElement('style');
            style.id = 'target-computer-powerup-styles';
            style.textContent = `
                @keyframes powerUpPulse {
                    0% { 
                        box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
                        border-color: #00ff41;
                    }
                    100% { 
                        box-shadow: 0 0 30px rgba(0, 255, 65, 0.6);
                        border-color: #33ff66;
                    }
                }
                
                @keyframes powerUpGradient {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 100% 50%; }
                }
                
                @keyframes powerDot1 {
                    0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
                    30% { opacity: 1; transform: scale(1.2); }
                }
                
                @keyframes powerDot2 {
                    0%, 30%, 90%, 100% { opacity: 0.3; transform: scale(0.8); }
                    60% { opacity: 1; transform: scale(1.2); }
                }
                
                @keyframes powerDot3 {
                    0%, 90%, 100% { opacity: 0.3; transform: scale(0.8); }
                    90% { opacity: 1; transform: scale(1.2); }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Hide wireframe during power-up
        if (this.wireframeContainer) {
            this.wireframeContainer.style.opacity = '0.3';
        }
        
        // Hide reticle during power-up
        this.hideTargetReticle();
    }
    
    /**
     * Hide power-up animation and restore normal display
     */
    hidePowerUpAnimation() {
        this.isPoweringUp = false;
        // Restore wireframe visibility
        if (this.wireframeContainer) {
            this.wireframeContainer.style.opacity = '1';
        }
        
        // The updateTargetDisplay() call after this will replace the power-up content
        // with the actual target information
    }

    /**
     * Show "No Targets in Range" display when no targets are available
     */
    showNoTargetsDisplay() {
        // Get the actual range from the target computer system
        const ship = this.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');
        const range = targetComputer?.range || 150; // Fallback to 150km if system not found
        
        this.targetInfoDisplay.innerHTML = `
            <div style="
                background: linear-gradient(45deg, #2a1810, #3a2218, #2a1810);
                background-size: 200% 200%;
                color: #ff8c42;
                padding: 20px;
                border-radius: 4px;
                text-align: center;
                border: 1px solid #ff8c42;
                box-shadow: 0 0 20px rgba(255, 140, 66, 0.3);
                animation: noTargetsGlow 2s ease-in-out infinite alternate;
                font-family: 'Orbitron', monospace;
            ">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">
                    NO TARGETS IN RANGE
                </div>
                <div style="font-size: 10px; opacity: 0.8; margin-bottom: 8px;">
                    TARGET COMPUTER RANGE: ${range}km
                </div>
                <div style="font-size: 9px; opacity: 0.6;">
                    Move closer to celestial bodies or ships
                </div>
            </div>
        `;
        
        // Add CSS animation for no targets glow effect
        if (!document.getElementById('no-targets-styles')) {
            const style = document.createElement('style');
            style.id = 'no-targets-styles';
            style.textContent = `
                @keyframes noTargetsGlow {
                    0% { 
                        box-shadow: 0 0 20px rgba(255, 140, 66, 0.3);
                        border-color: #ff8c42;
                    }
                    100% { 
                        box-shadow: 0 0 30px rgba(255, 140, 66, 0.6);
                        border-color: #ffb366;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Hide wireframe during no targets display
        if (this.wireframeContainer) {
            this.wireframeContainer.style.opacity = '0.3';
        }
        
        // Hide reticle during no targets display
        this.hideTargetReticle();
        
        // Play audio feedback for no targets found
        this.playAudio('frontend/static/audio/command_failed.mp3');
        
        // Start monitoring for targets coming back into range
        this.startNoTargetsMonitoring();
    }
    
    /**
     * Start monitoring for targets when in "no targets" mode
     */
    startNoTargetsMonitoring() {
        this.isInNoTargetsMode = true;
        
        // Clear any existing interval
        if (this.noTargetsInterval) {
            clearInterval(this.noTargetsInterval);
        }
        
        // Check for targets every 2 seconds
        this.noTargetsInterval = setInterval(() => {
            if (!this.targetComputerEnabled || !this.isInNoTargetsMode) {
                this.stopNoTargetsMonitoring();
                return;
            }
            
            // Silently update target list to check for new targets
            this.updateTargetList();
            
            // If we found targets, automatically select the nearest one
            if (this.targetObjects && this.targetObjects.length > 0) {
                console.log(`🎯 Targets detected while monitoring - automatically acquiring nearest target`);
                this.stopNoTargetsMonitoring();
                
                // Select nearest target
                this.targetIndex = -1;
                this.cycleTarget(false); // false = automatic cycle
                
                // Play audio feedback for automatic target reacquisition
                this.playAudio('frontend/static/audio/blurb.mp3');
                
                // Start monitoring the acquired target's range
                this.startRangeMonitoring();
                
                // Sync with StarfieldManager
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
            }
        }, 2000); // Check every 2 seconds
    }
    
    /**
     * Stop monitoring for targets
     */
    stopNoTargetsMonitoring() {
        this.isInNoTargetsMode = false;
        if (this.noTargetsInterval) {
            clearInterval(this.noTargetsInterval);
            this.noTargetsInterval = null;
        }
    }
    
    /**
     * Start monitoring current target range to detect when it goes out of range
     */
    startRangeMonitoring() {
        if (this.isRangeMonitoringActive) {
            return; // Already monitoring
        }
        
        this.isRangeMonitoringActive = true;
        
        // Clear any existing interval
        if (this.rangeMonitoringInterval) {
            clearInterval(this.rangeMonitoringInterval);
        }
        
        // Check target range every 3 seconds
        this.rangeMonitoringInterval = setInterval(() => {
            if (!this.targetComputerEnabled || !this.currentTarget) {
                this.stopRangeMonitoring();
                return;
            }
            
            // Get target computer range
            const ship = this.viewManager?.getShip();
            const targetComputer = ship?.getSystem('target_computer');
            const maxRange = targetComputer?.range || 150;
            
            // Calculate distance to current target
            const targetPos = this.getTargetPosition(this.currentTarget);
            if (!targetPos) {
                this.stopRangeMonitoring();
                return;
            }
            
            const distance = this.calculateDistance(this.camera.position, targetPos);
            
            // Check if current target is out of range
            if (distance > maxRange) {
                console.log(`🎯 Current target out of range (${distance.toFixed(1)}km > ${maxRange}km) - searching for new target`);
                this.handleTargetOutOfRange();
            }
        }, 3000); // Check every 3 seconds
    }
    
    /**
     * Stop monitoring current target range
     */
    stopRangeMonitoring() {
        this.isRangeMonitoringActive = false;
        if (this.rangeMonitoringInterval) {
            clearInterval(this.rangeMonitoringInterval);
            this.rangeMonitoringInterval = null;
        }
    }
    
    /**
     * Handle when current target goes out of range
     */
    handleTargetOutOfRange() {
        // Update target list to see what's currently in range
        this.updateTargetList();
        
        // If we have targets in range, select the nearest one
        if (this.targetObjects && this.targetObjects.length > 0) {
            console.log(`🎯 Switching to nearest target in range`);
            this.targetIndex = -1;
            this.cycleTarget(false); // false = automatic cycle
            
            // Play audio feedback for automatic target switch
            this.playAudio('frontend/static/audio/blurb.mp3');
            
            // Sync with StarfieldManager
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
        } else {
            // No targets in range - show no targets display
            console.log(`🎯 No targets in range - showing no targets display`);
            this.currentTarget = null;
            this.targetIndex = -1;
            this.stopRangeMonitoring();
            
            // Clear target on ship's TargetComputer system
            const ship = this.viewManager?.getShip();
            if (ship) {
                const targetComputer = ship.getSystem('target_computer');
                if (targetComputer) {
                    targetComputer.setTarget(null);
                }
            }
            
            this.showNoTargetsDisplay();
            
            // Clear StarfieldManager state
            if (this.viewManager?.starfieldManager) {
                this.viewManager.starfieldManager.currentTarget = null;
                this.viewManager.starfieldManager.targetIndex = -1;
                this.viewManager.starfieldManager.targetObjects = [];
            }
        }
    }

    /**
     * Play audio file using HTML5 Audio (simpler and more reliable)
     * @param {string} audioPath - Path to audio file
     */
    playAudio(audioPath) {
        try {
            // Use correct audio path format (like CardInventoryUI)
            const audioBasePath = 'static/audio/';
            const fileName = audioPath.split('/').pop(); // Extract filename from full path
            const correctedPath = `${audioBasePath}${fileName}`;
            
            // Get or create audio element for this sound
            if (!this.audioElements.has(fileName)) {
                const audio = new Audio(correctedPath);
                // Increase volume slightly for better audibility
                audio.volume = fileName === 'blurb.mp3' ? 0.4 : 0.3; // blurb.mp3 slightly louder
                audio.preload = 'auto';
                
                // Add error handling
                audio.addEventListener('error', (e) => {
                    console.warn(`🔊 Audio error for ${fileName}:`, e);
                });
                
                this.audioElements.set(fileName, audio);
            }
            
            const audio = this.audioElements.get(fileName);
            
            // Reset playback position and play
            audio.currentTime = 0;
            const playPromise = audio.play();
            
            // Handle potential play() promise rejection
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn('🔊 Failed to play audio:', fileName, error);
                });
            }
        } catch (error) {
            console.warn('🔊 Failed to play audio:', audioPath, error);
        }
    }

    /**
     * Update the list of available targets
     */
    updateTargetList() {
        // console.log(`🎯 updateTargetList called: physicsManager=${!!window.physicsManager}, physicsManagerReady=${!!window.physicsManagerReady}`);
        
        // Use physics-based spatial queries if available, otherwise fall back to traditional method
        if (window.physicsManager && window.physicsManagerReady) {
            // console.log(`🎯 Using updateTargetListWithPhysics()`);
            this.updateTargetListWithPhysics();
        } else {
            // console.log(`🎯 Using updateTargetListTraditional()`);
            this.updateTargetListTraditional();
        }
    }

    /**
     * Enhanced target list update using physics-based spatial queries
     */
    updateTargetListWithPhysics() {
        // console.log('🎯 TargetComputerManager.updateTargetListWithPhysics() called');
        
        // Get the actual range from the target computer system
        const ship = this.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');
        const maxTargetingRange = targetComputer?.range || 150; // Fallback to 150km if system not found
        
        // Perform spatial query around the camera position
        const nearbyEntities = window.physicsManager.spatialQuery(
            this.camera.position, 
            maxTargetingRange
        );
        
        // console.log(`🎯 Physics spatial query found ${nearbyEntities.length} entities within ${maxTargetingRange}km (Target Computer Level ${targetComputer?.level || 'Unknown'})`);
        
        let allTargets = [];
        
        // Process entities found by physics spatial query
        nearbyEntities.forEach(entity => {
            if (!entity.threeObject || !entity.threeObject.position) {
                return; // Skip invalid entities
            }
            
            // Skip docking collision boxes - they are not targetable
            if (entity.type === 'docking_zone' || 
                entity.threeObject.userData?.isDockingCollisionBox) {
                return;
            }
            
            const distance = this.calculateDistance(this.camera.position, entity.threeObject.position);
            
            // Create target data based on entity type
            let targetData = null;
            
            if (entity.type === 'enemy_ship') {
                // Handle enemy ships
                const ship = entity.threeObject.userData?.ship;
                if (ship && ship.currentHull > 0.001) { // Filter out destroyed ships
                    targetData = {
                        name: ship.shipName || entity.id,
                        type: 'enemy_ship',
                        position: entity.threeObject.position.toArray(),
                        isMoon: false,
                        object: entity.threeObject,
                        isShip: true,
                        ship: ship,
                        distance: distance,
                        physicsEntity: entity
                    };
                } else if (ship && ship.currentHull <= 0.001) {
                    console.log(`🗑️ Physics query filtering out destroyed ship: ${ship.shipName} (Hull: ${ship.currentHull})`);
                }
            } else if (entity.type === 'star' || entity.type === 'planet' || entity.type === 'moon' || entity.type === 'station') {
                // Handle celestial bodies and stations
                const info = this.solarSystemManager.getCelestialBodyInfo(entity.threeObject);
                if (info) {
                    targetData = {
                        name: info.name,
                        type: info.type,
                        position: entity.threeObject.position.toArray(),
                        isMoon: entity.type === 'moon',
                        isSpaceStation: entity.type === 'station' || info.type === 'station',
                        object: entity.threeObject,
                        isShip: false,
                        distance: distance,
                        physicsEntity: entity,
                        ...info
                    };
                }
            } else {
                // Handle unknown physics entities - try to get info from userData or object properties
                const obj = entity.threeObject;
                if (obj.userData) {
                    const userData = obj.userData;
                    
                    // Check if this is a space station from userData
                    if (userData.type === 'station' || userData.isSpaceStation) {
                        const info = this.solarSystemManager.getCelestialBodyInfo(obj);
                        targetData = {
                            name: userData.stationName || userData.name || info?.name || 'Unknown Station',
                            type: 'station',
                            position: obj.position.toArray(),
                            isMoon: false,
                            isSpaceStation: true,
                            object: obj,
                            isShip: false,
                            distance: distance,
                            physicsEntity: entity,
                            faction: userData.faction,
                            stationType: userData.stationType,
                            canDock: userData.canDock
                        };
                    }
                }
            }
            
            if (targetData) {
                allTargets.push(targetData);
            }
        });
        
        // Add any targets that might not have physics bodies yet (fallback)
        this.addNonPhysicsTargets(allTargets, maxTargetingRange);
        
        // Update target list
        this.targetObjects = allTargets;
        
        // Sort targets by distance using physics-enhanced sorting
        this.sortTargetsByDistanceWithPhysics(true); // Force sort on target list update
        
        // Update target display (unless power-up animation is running or in no targets monitoring mode)
        if (!this.isPoweringUp && !this.isInNoTargetsMode) {
            this.updateTargetDisplay();
        }
        
        // console.log(`🎯 Physics-enhanced targeting: ${allTargets.length} total targets`);
    }

    /**
     * Traditional target list update (fallback when physics not available)
     */
    updateTargetListTraditional() {
        let allTargets = [];
        
        // Add comprehensive debugging
        // console.log('🎯 TargetComputerManager.updateTargetListTraditional() called');
        // console.log('🎯 Debug info:', {
        //     hasSolarSystemManager: !!this.solarSystemManager,
        //     viewManager: !!this.viewManager,
        //     starfieldManager: !!this.viewManager?.starfieldManager,
        //     dummyShips: this.viewManager?.starfieldManager?.dummyShipMeshes?.length || 0
        // });
        
        // Get celestial bodies from SolarSystemManager
        if (this.solarSystemManager) {
            const bodies = this.solarSystemManager.getCelestialBodies();
            // console.log('🎯 Celestial bodies found:', {
            //     bodiesMapSize: bodies.size,
            //     bodiesKeys: Array.from(bodies.keys()),
            //     hasStarSystem: !!this.solarSystemManager.starSystem
            // });
            
            const celestialBodies = Array.from(bodies.entries())
                .map(([key, body]) => {
                    const info = this.solarSystemManager.getCelestialBodyInfo(body);
                    
                    // Add detailed debugging for each body
                        // console.log(`🎯 Processing celestial body: ${key}`, {
                        //     hasBody: !!body,
                        //     hasPosition: !!body?.position,
                        //     position: body?.position ? [body.position.x, body.position.y, body.position.z] : null,
                        //     info: info,
                        //     bodyType: typeof body
                        // });
                    
                    // Validate body position
                    if (!body.position || 
                        isNaN(body.position.x) || 
                        isNaN(body.position.y) || 
                        isNaN(body.position.z)) {
                        // console.warn('🎯 Invalid position detected for celestial body:', info?.name);
                        return null;
                    }
                    
                    return {
                        name: info.name,
                        type: info.type,
                        position: body.position.toArray(),
                        isMoon: key.startsWith('moon_'),
                        object: body,  // Store the actual THREE.js object
                        isShip: false,
                        distance: this.calculateDistance(this.camera.position, body.position)
                    };
                })
                .filter(body => body !== null); // Remove any invalid bodies
            
            // console.log(`🎯 Processed ${celestialBodies.length} valid celestial bodies:`, 
            //     celestialBodies.map(b => ({ name: b.name, type: b.type, distance: b.distance.toFixed(1) + 'km' }))
            // );
            
            allTargets = allTargets.concat(celestialBodies);
        } else {
            // console.warn('🎯 No SolarSystemManager available for targeting');
        }
        
        // Note: Dummy ships will be added by addNonPhysicsTargets() to avoid duplicates
        
        // Update target list
        this.targetObjects = allTargets;
        
        // If target computer is enabled and we have targets, ensure current target is valid
        if (this.targetComputerEnabled && allTargets.length > 0) {
            if (this.targetIndex >= 0 && this.targetIndex < allTargets.length) {
                this.updateTargetDisplay();
            }
        }
        
        // console.log(`🎯 Final target list: ${allTargets.length} targets total`,
        //     allTargets.map((t, index) => ({ index, name: t.name, type: t.type, isShip: t.isShip }))
        // );
        
        // Sort targets by distance
        this.sortTargetsByDistance(true); // Force sort on target list update
        
        // Update target display (unless power-up animation is running or in no targets monitoring mode)
        if (!this.isPoweringUp && !this.isInNoTargetsMode) {
            this.updateTargetDisplay();
        }
    }

    /**
     * Add targets that don't have physics bodies yet (fallback)
     */
    addNonPhysicsTargets(allTargets, maxRange) {
        // Build sets for duplicate detection - check both names and ship objects
        const existingTargetIds = new Set(allTargets.map(t => t.physicsEntity?.id || t.name));
        const existingShipObjects = new Set(allTargets.map(t => t.ship).filter(ship => ship));
        
        // Check for ships without physics bodies
        if (this.viewManager?.starfieldManager?.dummyShipMeshes) {
            // console.log(`🎯 addNonPhysicsTargets: Processing ${this.viewManager.starfieldManager.dummyShipMeshes.length} dummy ships`);
            // console.log(`🎯 addNonPhysicsTargets: Existing target IDs:`, Array.from(existingTargetIds));
            
            this.viewManager.starfieldManager.dummyShipMeshes.forEach((mesh, index) => {
                const ship = mesh.userData.ship;
                const targetId = ship.shipName;
                
                // console.log(`🎯 addNonPhysicsTargets: Checking dummy ship ${index}: ${targetId}, hull: ${ship.currentHull}, already exists: ${existingTargetIds.has(targetId) || existingShipObjects.has(ship)}`);
                
                // Filter out destroyed ships and check if not already in target list
                // Check both by ID/name and by ship object reference
                if (!existingTargetIds.has(targetId) && !existingShipObjects.has(ship) && ship && ship.currentHull > 0.001) {
                    const distance = this.calculateDistance(this.camera.position, mesh.position);
                    if (distance <= maxRange) {
                        // console.log(`🎯 addNonPhysicsTargets: Adding dummy ship: ${targetId}`);
                        allTargets.push({
                            name: ship.shipName,
                            type: 'enemy_ship',
                            position: mesh.position.toArray(),
                            isMoon: false,
                            object: mesh,
                            isShip: true,
                            ship: ship,
                            distance: distance
                        });
                    } else {
                        // console.log(`🎯 addNonPhysicsTargets: Dummy ship ${targetId} out of range: ${distance.toFixed(1)}km > ${maxRange}km`);
                    }
                } else if (ship && ship.currentHull <= 0.001) {
                    console.log(`🗑️ Fallback method filtering out destroyed ship: ${ship.shipName} (Hull: ${ship.currentHull})`);
                }
            });
        }
        
        // CRITICAL FIX: Add celestial bodies to fallback system
        // When spatial query fails, this ensures planets/moons/stars still appear in targeting
        if (this.solarSystemManager?.celestialBodies) {
            // console.log(`🎯 addNonPhysicsTargets: Processing celestial bodies as fallback`);
            
            for (const [key, body] of this.solarSystemManager.celestialBodies.entries()) {
                if (!body || !body.position) continue;
                
                const distance = this.calculateDistance(this.camera.position, body.position);
                if (distance <= maxRange) {
                    const info = this.solarSystemManager.getCelestialBodyInfo(body);
                    if (info && !existingTargetIds.has(info.name)) {
                        // console.log(`🎯 addNonPhysicsTargets: Adding celestial body: ${info.name} (${info.type})`);
                        allTargets.push({
                            name: info.name,
                            type: info.type,
                            position: body.position.toArray(),
                            isMoon: key.startsWith('moon_'),
                            isSpaceStation: info.type === 'station',
                            object: body,
                            isShip: false,
                            distance: distance,
                            ...info
                        });
                    }
                }
            }
        }
        
        // console.log(`🎯 addNonPhysicsTargets: Processing ${this.viewManager.starfieldManager.dummyShipMeshes?.length || 0} dummy ships`);
    }

    /**
     * Enhanced sorting with physics data
     */
    sortTargetsByDistanceWithPhysics(forceSort = false) {
        const now = Date.now();
        if (!forceSort && now - this.lastSortTime < this.sortInterval) {
            return; // Don't sort too frequently
        }
        this.lastSortTime = now;

        // Update distances for all targets (some may have moved via physics)
        this.targetObjects.forEach(targetData => {
            if (targetData.physicsEntity) {
                // Get updated position from physics if available
                const physicsBody = window.physicsManager.getRigidBody(targetData.object);
                if (physicsBody && physicsBody.isActive()) {
                    // Position is already synced by physics manager
                    targetData.distance = this.calculateDistance(this.camera.position, targetData.object.position);
                }
            } else {
                // Fallback to regular distance calculation
                targetData.distance = this.calculateDistance(this.camera.position, targetData.object.position);
            }
        });

        // Sort by distance
        this.targetObjects.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Sort targets by distance from camera
     */
    sortTargetsByDistance(forceSort = false) {
        const now = Date.now();
        if (!forceSort && now - this.lastSortTime < this.sortInterval) {
            return; // Don't sort too frequently
        }
        this.lastSortTime = now;

        // Update distances for all targets
        this.targetObjects.forEach(targetData => {
            targetData.distance = this.calculateDistance(this.camera.position, targetData.object.position);
        });

        // Sort by distance
        this.targetObjects.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Cycle to the next target
     */
    cycleTarget(isManualCycle = true) {
        // Prevent cycling targets while docked
        if (this.viewManager?.starfieldManager?.isDocked) {
            return;
        }

        // Prevent cycling targets immediately after undocking
        if (this.viewManager?.starfieldManager?.undockCooldown && Date.now() < this.viewManager.starfieldManager.undockCooldown) {
            return;
        }

        // Prevent target changes during dummy creation
        if (this.preventTargetChanges) {
            // console.log(`🎯 Target change prevented during dummy creation`);
            return;
        }

        if (!this.targetComputerEnabled || this.targetObjects.length === 0) {
            return;
        }

        // Hide reticle until new target is set
        if (this.targetReticle) {
            this.targetReticle.style.display = 'none';
        }

        // Keep target HUD visible
        this.targetHUD.style.display = 'block';

        // Cycle to next target
        const previousIndex = this.targetIndex;
        const previousTarget = this.currentTarget;
        
        if (this.targetIndex === -1 || !this.currentTarget) {
            this.targetIndex = 0;
        } else {
            this.targetIndex = (this.targetIndex + 1) % this.targetObjects.length;
        }

        // Get the target data directly from our target list
        const targetData = this.targetObjects[this.targetIndex];
        this.currentTarget = targetData; // Store the full target data, not just the object
        
        // Sync with ship's TargetComputer system for sub-targeting
        const ship = this.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');
        if (targetComputer) {
            // For enemy ships, pass the ship instance (has systems). For others, pass the render object
            const isEnemyShip = !!(targetData?.isShip && targetData?.ship);
            const targetForSubTargeting = isEnemyShip ? targetData.ship : (targetData?.object || targetData);
            targetComputer.setTarget(targetForSubTargeting);
        }
        
        // Removed target cycling log to prevent console spam
        // console.log(`🔄 Target cycled: ${previousIndex} → ${this.targetIndex} (${targetData.name})`);
        // console.log(`🎯 Previous target: ${previousTarget?.userData?.ship?.shipName || 'none'}`);
        // console.log(`🎯 New target: ${targetData.name}`);

        // Clean up existing wireframe before creating a new one
        if (this.targetWireframe) {
            // console.log(`🎯 WIREFRAME: Cleaning up existing wireframe`);
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
            // console.log(`🎯 WIREFRAME: Existing wireframe cleaned up`);
        } else {
            // console.log(`🎯 WIREFRAME: No existing wireframe to clean up`);
        }

        // Create new wireframe and update display
        this.createTargetWireframe();
        this.updateTargetDisplay();
        
        // Start monitoring the selected target's range (for both manual and automatic cycles)
        this.startRangeMonitoring();
    }

    /**
     * Create wireframe for current target
     */
    createTargetWireframe() {
        if (!this.currentTarget) return;

        try {
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

            // Determine target info
            let info = null;
            let wireframeColor = 0x808080; // default gray

            if (currentTargetData?.isShip) {
                info = { type: 'enemy_ship' };
                wireframeColor = 0xff3333; // hostile red for enemy ships
                radius = Math.max(radius, 2);
            } else {
                info = currentTargetData || this.solarSystemManager.getCelestialBodyInfo(targetObject);

                if (info?.type === 'star' || (this.getStarSystem() && info?.name === this.getStarSystem().star_name)) {
                    wireframeColor = 0xffff00; // stars yellow
                } else {
                    let diplomacy = info?.diplomacy?.toLowerCase();
                    if (!diplomacy && info?.faction) {
                        diplomacy = this.getFactionDiplomacy(info.faction).toLowerCase();
                    }
                    if (diplomacy === 'enemy') wireframeColor = 0xff3333;
                    else if (diplomacy === 'neutral') wireframeColor = 0xffff00;
                    else if (diplomacy === 'friendly') wireframeColor = 0x00ff41;
                }
            }

            const wireframeMaterial = new this.THREE.LineBasicMaterial({
                color: wireframeColor,
                linewidth: 1,
                transparent: true,
                opacity: 0.8
            });

            // Build geometry per type
            if (info && (info.type === 'star' || (this.getStarSystem() && info.name === this.getStarSystem().star_name))) {
                const starGeometry = this.createStarGeometry(radius);
                this.targetWireframe = new this.THREE.LineSegments(starGeometry, wireframeMaterial);
            } else {
                let baseGeometry = null;

                if (info?.type === 'enemy_ship' || currentTargetData?.isShip) {
                    baseGeometry = new this.THREE.BoxGeometry(radius, radius, radius);
                } else if (info?.type === 'station' || currentTargetData?.isSpaceStation || targetObject?.userData?.isSpaceStation) {
                    // Distinct station silhouette: torus ring
                    const ringR = Math.max(radius * 0.8, 1.0);
                    const ringTube = Math.max(radius * 0.25, 0.3);
                    baseGeometry = new this.THREE.TorusGeometry(ringR, ringTube, 8, 16);
                } else if (currentTargetData?.isMoon || info?.type === 'moon') {
                    baseGeometry = new this.THREE.OctahedronGeometry(radius, 0);
                } else if (info?.type === 'planet') {
                    baseGeometry = new this.THREE.IcosahedronGeometry(radius, 0);
                } else if (targetObject?.geometry && targetObject.geometry.isBufferGeometry) {
                    // Fall back to edges of actual target geometry to preserve uniqueness
                    const edgesGeometry = new this.THREE.EdgesGeometry(targetObject.geometry);
                    this.targetWireframe = new this.THREE.LineSegments(edgesGeometry, wireframeMaterial);
                    // Do not dispose edgesGeometry here; it will be disposed when clearing wireframe
                }

                if (!this.targetWireframe) {
                    // Create edges from our base geometry
                    if (!baseGeometry) {
                        baseGeometry = new this.THREE.IcosahedronGeometry(radius, 0);
                    }
                    const edgesGeometry = new this.THREE.EdgesGeometry(baseGeometry);
                    this.targetWireframe = new this.THREE.LineSegments(edgesGeometry, wireframeMaterial);
                    // Dispose only the temporary base geometry; keep edgesGeometry until clear
                    baseGeometry.dispose();
                }
            }

            // Add sub-target indicators only for enemy ships
            const isEnemyShip = !!(currentTargetData?.isShip && currentTargetData?.ship);
            if (isEnemyShip) {
                this.createSubTargetIndicators(radius, wireframeColor);
            } else {
                this.createSubTargetIndicators(0, 0); // clears existing indicators
            }

            this.targetWireframe.position.set(0, 0, 0);
            this.wireframeScene.add(this.targetWireframe);

            this.wireframeCamera.position.z = Math.max(radius * 3, 3);
            this.targetWireframe.rotation.set(0.5, 0, 0.3);

        } catch (error) {
            console.error('Error creating target wireframe:', error);
        }
    }

    /**
     * Create star geometry for wireframe display
     */
    createStarGeometry(radius) {
        const geometry = new this.THREE.BufferGeometry();
        const vertices = [];
        
        // Create a simpler 3D star with radiating lines from center
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
     * Update target display information
     */
    updateTargetDisplay() {
        if (!this.targetComputerEnabled) {
            return;
        }
        
        // Don't update display during power-up animation
        if (this.isPoweringUp) {
            return;
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
            return;
        }

        const currentTargetData = this.getCurrentTargetData();
        // Reduced debug noise: remove verbose per-frame logs
        if (!currentTargetData) {
            console.log('🎯 No currentTargetData, returning early');
            return;
        }

        // Get target position safely
        const targetPos = this.getTargetPosition(this.currentTarget);
        if (!targetPos) {
            console.warn('🎯 Cannot calculate distance for range check - invalid target position');
            return;
        }

        const distance = this.calculateDistance(this.camera.position, targetPos);
        
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
            // Prefer the processed target data; fall back to solar system info using the underlying object
            const targetObject = this.currentTarget?.object || this.currentTarget;
            info = currentTargetData || this.solarSystemManager.getCelestialBodyInfo(targetObject);
        }
        
        // Update HUD border color based on diplomacy
        let diplomacyColor = '#D0D0D0'; // Default gray
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
            // For enemy ships and space stations, use actual sub-targeting
            const isSpaceStation = info?.type === 'station' || currentTargetData.type === 'station' || 
                                    (this.currentTarget?.userData?.isSpaceStation);
            
            // Reduced debug noise
            

            
            if ((isEnemyShip && currentTargetData.ship) || isSpaceStation) {
                // Note: Target is already set via setTarget() in cycleTarget method
                // The setTarget() method automatically calls updateSubTargets()
                // So we don't need to call it again here to avoid console spam
                
                if (targetComputer.currentSubTarget) {
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
                                &lt; &gt; to cycle sub-targets
                            </div>
                        </div>
                    `;
                } else {
                    // Show available sub-targets count
                    const availableTargets = targetComputer.availableSubTargets.length;
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
                                    &lt; &gt; to cycle sub-targets
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
        
        // Format distance for display
        const formattedDistance = this.formatDistance(distance);
        
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
                    <div style="color: white; font-weight: bold; font-size: 11px; margin-bottom: 2px;">HULL: ${displayPercentage}%</div>
                    <div style="background-color: #333; border: 1px solid #666; height: 8px; border-radius: 2px; overflow: hidden;">
                        <div style="background-color: white; height: 100%; width: ${hullPercentage}%; transition: width 0.3s ease;"></div>
                    </div>
                </div>`;
        } else if (info?.type === 'station' && targetComputer) {
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
                        <div style="color: white; font-weight: bold; font-size: 11px; margin-bottom: 2px;">HULL: ${hullPercent}%</div>
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
            backgroundColor = '#ff0000'; // Bright red background for hostile enemies
        } else {
            // Keep existing styling for non-hostile targets (black text on colored background)
            textColor = 'black';
            backgroundColor = diplomacyColor;
        }
        
        this.targetInfoDisplay.innerHTML = `
            <div style="background-color: ${backgroundColor}; color: ${textColor}; padding: 8px; border-radius: 4px; margin-bottom: 8px;">
                <div style="font-weight: bold; font-size: 12px;">${info?.name || 'Unknown Target'}</div>
                <div style="font-size: 10px;">${typeDisplay}</div>
                <div style="font-size: 10px;">${formattedDistance}</div>
                ${hullHealthSection}
            </div>
            ${subTargetHTML}
        `;


        // Update status icons with diplomacy color
        this.updateStatusIcons(distance, diplomacyColor, isEnemyShip, info);

        // Update action buttons based on target type  
        this.updateActionButtons(currentTargetData, info);
        
        // Update reticle color based on faction
        this.updateReticleColor(diplomacyColor);
    }

    /**
     * Get current target data
     */
    getCurrentTargetData() {
        if (!this.currentTarget) {
            // console.log(`🎯 DEBUG: getCurrentTargetData() - no current target`);
            return null;
        }

        // First, check if the current targetIndex is valid
        if (this.targetIndex >= 0 && this.targetIndex < this.targetObjects.length) {
            const targetData = this.targetObjects[this.targetIndex];
            if (targetData) {
                // For targets from addNonPhysicsTargets, the Three.js object is in targetData.object
                // For other targets, the targetData might be the object itself
                if (targetData === this.currentTarget || 
                    targetData.object === this.currentTarget ||
                    (targetData.object && targetData.object.uuid === this.currentTarget?.uuid)) {
                    return this.processTargetData(targetData);
                }
            }
        }

        // If current target is already a target data object, try to find it in the list
        if (this.currentTarget && typeof this.currentTarget === 'object') {
            for (let i = 0; i < this.targetObjects.length; i++) {
                const targetData = this.targetObjects[i];
                if (targetData && 
                    (targetData === this.currentTarget || 
                     targetData.object === this.currentTarget ||
                     (targetData.name === this.currentTarget.name && targetData.type === this.currentTarget.type))) {
                    // Update the index to match the found target
                    this.targetIndex = i;
                    this.currentTarget = targetData; // Ensure we have the full target data
                    console.log(`🔧 Fixed target index mismatch: set to ${i} for target ${targetData.name}`);
                    
                    // Process and return the target data
                    return this.processTargetData(targetData);
                }
            }
        }

        // If we still can't find the target, it might have been destroyed or removed
        // Don't spam the console - only log occasionally
        const now = Date.now();
        if (!this.lastTargetNotFoundWarning || (now - this.lastTargetNotFoundWarning) > 5000) { // Only warn every 5 seconds
            console.log(`⚠️ Current target not found in target list - may have been destroyed or updated`);
            this.lastTargetNotFoundWarning = now;
        }
        
        // Clear the invalid target to prevent repeated warnings
        this.clearCurrentTarget();
        return null;
    }

    /**
     * Process target data and return standardized format
     */
    processTargetData(targetData) {
        if (!targetData) {
            return null;
        }

        // Check if this is a ship (either 'ship' or 'enemy_ship' type, or has isShip flag)
        if (targetData.type === 'ship' || targetData.type === 'enemy_ship' || targetData.isShip) {
            return {
                object: this.currentTarget,
                name: targetData.name || this.currentTarget.shipName || 'Enemy Ship',
                type: targetData.type || 'enemy_ship',
                isShip: true,
                ship: targetData.ship || this.currentTarget,
                distance: targetData.distance,
                isMoon: targetData.isMoon || false
            };
        } else {
            // For non-ship targets, prefer the data we already have from target list
            // If targetData already has the info (from addNonPhysicsTargets), use it
            if (targetData.type && targetData.type !== 'unknown') {
                return {
                    object: this.currentTarget,
                    name: targetData.name || 'Unknown',
                    type: targetData.type,
                    isShip: false,
                    distance: targetData.distance,
                    isMoon: targetData.isMoon || false,
                    isSpaceStation: targetData.isSpaceStation,
                    faction: targetData.faction,
                    diplomacy: targetData.diplomacy,
                    ...targetData
                };
            } else {
                // Fallback to getCelestialBodyInfo if no proper data
                const info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
                return {
                    object: this.currentTarget,
                    name: info?.name || 'Unknown',
                    type: info?.type || 'unknown',
                    isShip: false,
                    distance: targetData.distance,
                    isMoon: targetData.isMoon || false,
                    ...info
                };
            }
        }
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
        if (!point1 || !point2) {
            console.warn('🎯 calculateDistance: Invalid points provided', { point1, point2 });
            return 0;
        }
        
        // Convert points to Vector3 if needed
        let vec1 = point1;
        let vec2 = point2;
        
        // Convert point1 to Vector3 if it's an array
        if (Array.isArray(point1)) {
            vec1 = new this.THREE.Vector3(point1[0], point1[1], point1[2]);
        } else if (point1 && typeof point1 === 'object' && typeof point1.x === 'number' && !point1.distanceTo) {
            vec1 = new this.THREE.Vector3(point1.x, point1.y, point1.z);
        }
        
        // Convert point2 to Vector3 if it's an array
        if (Array.isArray(point2)) {
            vec2 = new this.THREE.Vector3(point2[0], point2[1], point2[2]);
        } else if (point2 && typeof point2 === 'object' && typeof point2.x === 'number' && !point2.distanceTo) {
            vec2 = new this.THREE.Vector3(point2.x, point2.y, point2.z);
        }
        
        // Ensure we have Vector3 objects
        if (!vec1 || !vec2 || typeof vec1.distanceTo !== 'function' || typeof vec2.distanceTo !== 'function') {
            console.warn('🎯 calculateDistance: Could not convert to Vector3 objects', { 
                originalPoint1: point1, 
                originalPoint2: point2,
                vec1: vec1,
                vec2: vec2
            });
            return 0;
        }
        
        try {
            return vec1.distanceTo(vec2);
        } catch (error) {
            console.warn('🎯 calculateDistance: Error calculating distance', error);
            return 0;
        }
    }

    /**
     * Format distance for display
     */
    formatDistance(distanceInKm) {
        const addCommas = (num) => {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        };

        if (distanceInKm < 1) {
            return `${Math.round(distanceInKm * 1000)}m`;
        } else if (distanceInKm < 1000) {
            return `${distanceInKm.toFixed(1)}km`;
        } else {
            return `${addCommas(Math.round(distanceInKm))}km`;
        }
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
                console.warn('Error rendering wireframe:', error);
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
     */
    updateReticlePosition() {
        if (!this.currentTarget || !this.targetComputerEnabled) {
            this.targetReticle.style.display = 'none';
            return;
        }

        // Get target position using helper function
        const targetPosition = this.getTargetPosition(this.currentTarget);
        if (!targetPosition) {
            // console.warn('🎯 TargetComputerManager: Cannot update reticle - invalid target position');
            this.targetReticle.style.display = 'none';
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
            
            // RESTORED: Direct positioning like original working version
            this.targetReticle.style.display = isBehindCamera ? 'none' : 'block';
            if (!isBehindCamera) {
                this.targetReticle.style.left = `${x}px`;
                this.targetReticle.style.top = `${y}px`;
            }
        } else {
            this.targetReticle.style.display = 'none';
        }
    }

    /**
     * Update reticle target info (name and distance)
     */
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
                diplomacy: currentTargetData.ship.diplomacy || 'enemy',
                name: currentTargetData.ship.shipName,
                shipType: currentTargetData.ship.shipType
            };
            targetName = info.name || 'Enemy Ship';
            // console.log(`🎯 DEBUG: updateReticleTargetInfo() - Enemy ship target: ${targetName}, diplomacy: ${info.diplomacy}`);
        } else {
            // Get celestial body info - need to pass the actual Three.js object
            const targetObject = this.currentTarget?.object || this.currentTarget;
            info = this.solarSystemManager.getCelestialBodyInfo(targetObject);
            
            // Fallback to target data name if celestial body info not found
            if (!info || !info.name) {
                targetName = currentTargetData?.name || 'Unknown Target';
            } else {
                targetName = info.name;
            }
            // console.log(`🎯 DEBUG: updateReticleTargetInfo() - Target: ${targetName}, type: ${info?.type || currentTargetData?.type || 'unknown'}`);
        }
        
        // Determine reticle color based on diplomacy using faction color rules
        let reticleColor = '#D0D0D0'; // Default gray
        
        // Use diplomacy if available, otherwise try to get it from faction
        let diplomacyStatus = info?.diplomacy;
        if (!diplomacyStatus && info?.faction) {
            diplomacyStatus = this.getFactionDiplomacy(info.faction);
        }
        
        if (isEnemyShip) {
            reticleColor = '#ff3333'; // Enemy ships are darker neon red
        } else if (info?.type === 'star') {
            reticleColor = '#ffff00'; // Stars are neutral yellow
        } else if (diplomacyStatus?.toLowerCase() === 'enemy') {
            reticleColor = '#ff3333'; // Darker neon red
        } else if (diplomacyStatus?.toLowerCase() === 'neutral') {
            reticleColor = '#ffff00';
        } else if (diplomacyStatus?.toLowerCase() === 'friendly') {
            reticleColor = '#00ff41';
        }

        // Update name display
        this.targetNameDisplay.textContent = targetName;
        this.targetNameDisplay.style.color = reticleColor;
        this.targetNameDisplay.style.textShadow = `0 0 4px ${reticleColor}`;
        this.targetNameDisplay.style.display = 'block';

        // Update distance display
        this.targetDistanceDisplay.textContent = this.formatDistance(distance);
        this.targetDistanceDisplay.style.color = reticleColor;
        this.targetDistanceDisplay.style.textShadow = `0 0 4px ${reticleColor}`;
        this.targetDistanceDisplay.style.display = 'block';

        // Update reticle corner colors
        const corners = this.targetReticle.querySelectorAll('.reticle-corner');
        corners.forEach(corner => {
            corner.style.borderColor = reticleColor;
            corner.style.boxShadow = `0 0 4px ${reticleColor}`;
        });
    }

    /**
     * Update direction arrow
     */
    updateDirectionArrow() {
        // Only proceed if we have a target and the target computer is enabled
        if (!this.currentTarget || !this.targetComputerEnabled || !this.directionArrows) {
            // Hide all arrows
            this.hideAllDirectionArrows();
            return;
        }

        // Get target position using helper function
        const targetPos = this.getTargetPosition(this.currentTarget);
        if (!targetPos) {
            // console.warn('🎯 TargetComputerManager: Cannot update direction arrow - invalid target position');
            this.hideAllDirectionArrows();
            return;
        }

        // Get target's world position relative to camera
        const targetPosition = targetPos.clone();
        const screenPosition = targetPosition.clone().project(this.camera);
        
        // Check if target is near or off screen edges (arrows appear sooner)
        const isOffScreen = Math.abs(screenPosition.x) > 0.85 || Math.abs(screenPosition.y) > 0.85;

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
            let arrowColor = '#D0D0D0';
            
            if (info?.diplomacy?.toLowerCase() === 'enemy') {
                arrowColor = '#ff3333';
            } else if (info?.diplomacy?.toLowerCase() === 'friendly') {
                arrowColor = '#00ff41';
            } else if (info?.diplomacy?.toLowerCase() === 'neutral') {
                arrowColor = '#ffff00';
            }

            // Determine which arrow to show based on the strongest component
            let primaryDirection = '';
            if (Math.abs(rightComponent) > Math.abs(upComponent)) {
                primaryDirection = rightComponent > 0 ? 'right' : 'left';
            } else {
                primaryDirection = upComponent > 0 ? 'top' : 'bottom';
            }

            // Position and show the appropriate arrow
            const arrow = this.directionArrows[primaryDirection];
            if (arrow) {
                // Position arrow at edge of screen
                if (primaryDirection === 'top') {
                    arrow.style.left = '50%';
                    arrow.style.top = '20px';
                    arrow.style.transform = 'translateX(-50%)';
                } else if (primaryDirection === 'bottom') {
                    arrow.style.left = '50%';
                    arrow.style.bottom = '20px';
                    arrow.style.transform = 'translateX(-50%)';
                } else if (primaryDirection === 'left') {
                    arrow.style.left = '20px';
                    arrow.style.top = '50%';
                    arrow.style.transform = 'translateY(-50%)';
                } else if (primaryDirection === 'right') {
                    arrow.style.right = '20px';
                    arrow.style.top = '50%';
                    arrow.style.transform = 'translateY(-50%)';
                }

                // Update arrow color for the visible border
                if (primaryDirection === 'top') {
                    arrow.style.borderBottomColor = arrowColor;
                } else if (primaryDirection === 'bottom') {
                    arrow.style.borderTopColor = arrowColor;
                } else if (primaryDirection === 'left') {
                    arrow.style.borderRightColor = arrowColor;
                } else if (primaryDirection === 'right') {
                    arrow.style.borderLeftColor = arrowColor;
                }
                
                arrow.style.display = 'block';
                
                // Hide other arrows
                Object.keys(this.directionArrows).forEach(dir => {
                    if (dir !== primaryDirection) {
                        this.directionArrows[dir].style.display = 'none';
                    }
                });
            }
        } else {
            // Target is on screen, hide all arrows
            this.hideAllDirectionArrows();
        }
    }

    /**
     * Hide all direction arrows
     */
    hideAllDirectionArrows() {
        if (this.directionArrows) {
            Object.values(this.directionArrows).forEach(arrow => {
                arrow.style.display = 'none';
            });
        }
    }

    /**
     * Create visual indicators for sub-targeting on the wireframe
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

        // Get diplomacy color for the target to influence sub-target indicators
        let baseDiplomacyColor = 0x808080; // Default gray
        const currentTargetData = this.getCurrentTargetData();
        
        if (currentTargetData?.isShip) {
            baseDiplomacyColor = 0xff3333; // Enemy ships
        } else {
            const info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
            if (info?.diplomacy?.toLowerCase() === 'enemy') {
                baseDiplomacyColor = 0xff3333;
            } else if (info?.diplomacy?.toLowerCase() === 'neutral') {
                baseDiplomacyColor = 0xffff00;
            } else if (info?.diplomacy?.toLowerCase() === 'friendly') {
                baseDiplomacyColor = 0x00ff41;
            }
        }

        // Create targetable area indicators (tinted by diplomacy but maintaining system identity)
        const targetableAreas = [
            { name: 'Command Center', position: [0, radius * 0.7, 0], color: baseDiplomacyColor === 0xff3333 ? 0xff6666 : 0xff3333 },
            { name: 'Power Core', position: [0, 0, 0], color: baseDiplomacyColor === 0x00ff41 ? 0x66ff66 : 0x44ff44 },
            { name: 'Communications', position: [radius * 0.6, 0, 0], color: baseDiplomacyColor === 0xffff00 ? 0x6666ff : 0x4444ff },
            { name: 'Defense Grid', position: [-radius * 0.6, 0, 0], color: baseDiplomacyColor === 0xffff00 ? 0xffff66 : 0xffff44 },
            { name: 'Sensor Array', position: [0, -radius * 0.7, 0], color: baseDiplomacyColor === 0xff3333 ? 0xff66ff : 0xff44ff },
            { name: 'Docking Bay', position: [0, 0, radius * 0.8], color: baseDiplomacyColor === 0x00ff41 ? 0x66ffff : 0x44ffff }
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

    /**
     * Create 3D target outline in the world
     */
    createTargetOutline(targetObject, outlineColor = '#00ff41', targetData = null) {
        // Clear any existing outline first
        this.clearTargetOutline();
        
        if (!targetObject || !targetObject.geometry) {
            return;
        }

        const currentTargetData = targetData || this.getCurrentTargetData();
        if (!currentTargetData) {
            return;
        }

        try {
            // Create outline geometry
            this.outlineGeometry = targetObject.geometry.clone();
            
            // Create outline material
            this.outlineMaterial = new this.THREE.MeshBasicMaterial({
                color: outlineColor,
                side: this.THREE.BackSide,
                transparent: true,
                opacity: 0.5,
                wireframe: true
            });

            // Create outline mesh
            this.targetOutline = new this.THREE.Mesh(this.outlineGeometry, this.outlineMaterial);
            
            // Position outline at target location
            this.targetOutline.position.copy(targetObject.position);
            this.targetOutline.rotation.copy(targetObject.rotation);
            this.targetOutline.scale.copy(targetObject.scale).multiplyScalar(1.1);
            
            // Add to scene
            this.scene.add(this.targetOutline);
            
        } catch (error) {
            console.error('Error creating target outline:', error);
        }
    }

    /**
     * Update 3D target outline
     */
    updateTargetOutline(targetObject, deltaTime) {
        if (!this.targetObjects || this.targetObjects.length === 0) {
            this.clearTargetOutline();
            return;
        }

        if (!this.targetComputerEnabled) {
            this.clearTargetOutline();
            return;
        }

        if (!this.currentTarget) {
            this.clearTargetOutline();
            return;
        }

        const targetData = this.getCurrentTargetData();
        if (!targetData) {
            this.clearTargetOutline();
            return;
        }

        if (!targetObject || targetObject !== this.currentTarget) {
            this.clearTargetOutline();
            return;
        }

        // Get outline color based on target type
        let outlineColor = this.getOutlineColorForTarget(targetData);
        
        // Create or update outline
        this.createTargetOutline(targetObject, outlineColor, targetData);
    }

    /**
     * Clear 3D target outline
     */
    clearTargetOutline() {
        if (this.targetOutline) {
            this.scene.remove(this.targetOutline);
            
            if (this.outlineGeometry) {
                this.outlineGeometry.dispose();
                this.outlineGeometry = null;
            }
            
            if (this.outlineMaterial) {
                this.outlineMaterial.dispose();
                this.outlineMaterial = null;
            }
            
            this.targetOutline = null;
        }
    }

    /**
     * Get outline color for target based on diplomacy
     */
    getOutlineColorForTarget(targetData) {
        if (targetData?.isShip) {
            return '#ff3333'; // Enemy ships are red
        }
        
        const info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
        if (info?.diplomacy?.toLowerCase() === 'enemy') {
            return '#ff3333';
        } else if (info?.diplomacy?.toLowerCase() === 'friendly') {
            return '#00ff41';
        } else if (info?.diplomacy?.toLowerCase() === 'neutral') {
            return '#ffff00';
        }
        
        return '#00ff41'; // Default green
    }

    /**
     * Remove destroyed target from target list and automatically cycle to next target
     */
    removeDestroyedTarget(destroyedShip) {
        if (!destroyedShip) {
            return;
        }

        console.log(`💥 removeDestroyedTarget called for: ${destroyedShip.shipName || 'unknown ship'}`);

        // Get ship systems for proper cleanup
        const ship = this.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');

        // Check if the destroyed ship is currently targeted by any system
        const isCurrentTarget = this.currentTarget === destroyedShip;
        const isCurrentTargetData = this.getCurrentTargetData()?.ship === destroyedShip;
        const isWeaponTarget = ship?.weaponSystem?.lockedTarget === destroyedShip;
        const isTargetComputerTarget = targetComputer?.currentTarget === destroyedShip;

        const anySystemTargeting = isCurrentTarget || isCurrentTargetData || isWeaponTarget || isTargetComputerTarget;

        console.log(`🔍 Checking targeting systems for destroyed ship: ${destroyedShip.shipName}`);
        console.log(`   • Current target: ${isCurrentTarget}`);
        console.log(`   • Current target data: ${isCurrentTargetData}`);
        console.log(`   • Weapon system target: ${isWeaponTarget}`);
        console.log(`   • Target computer target: ${isTargetComputerTarget}`);
        console.log(`   • Any system targeting: ${anySystemTargeting}`);

        if (anySystemTargeting) {
            console.log('🗑️ Destroyed ship was targeted - performing full synchronization cleanup');

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
                console.log(`🔄 Selecting new target from ${this.targetObjects.length} available targets`);

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
                    console.log('❌ Failed to select valid target after destruction');
                    this.targetIndex = -1;
                }

                // console.log('🎯 Target selection complete - outline disabled until next manual cycle');
            } else {
                console.log('📭 No targets remaining after destruction');

                // CRITICAL: Force clear outline again when no targets remain
                // console.log('🎯 Force-clearing outline - no targets remaining');
                this.clearTargetOutline();

                // Clear wireframe and hide UI
                this.clearTargetWireframe();
                this.hideTargetHUD();
                this.hideTargetReticle();
            }
        } else {
            console.log('🔄 Destroyed ship was not currently targeted - performing standard list update');
            
            // Just update the target list without changing current target
            this.updateTargetList();
        }

        console.log(`✅ removeDestroyedTarget complete for: ${destroyedShip.shipName || 'unknown ship'}`);
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
    }
    
    /**
     * Set the target HUD border color
     */
    setTargetHUDBorderColor(color) {
        if (this.targetHUD) {
            this.targetHUD.style.borderColor = color;
            this.targetHUD.style.color = color;
        }
    }
    
    /**
     * Show the target reticle
     */
    showTargetReticle() {
        if (this.targetReticle) {
            this.targetReticle.style.display = 'block';
        }
    }
    
    /**
     * Hide the target reticle
     */
    hideTargetReticle() {
        if (this.targetReticle) {
            this.targetReticle.style.display = 'none';
        }
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
     */
    setTargetReticlePosition(x, y) {
        if (this.targetReticle) {
            this.targetReticle.style.left = `${x}px`;
            this.targetReticle.style.top = `${y}px`;
        }
    }

    /**
     * Update reticle color based on target faction
     */
    updateReticleColor(diplomacyColor = '#D0D0D0') {
        if (this.targetReticle) {
            const corners = this.targetReticle.querySelectorAll('.reticle-corner');
            corners.forEach(corner => {
                corner.style.borderColor = diplomacyColor;
                corner.style.boxShadow = `0 0 2px ${diplomacyColor}`;
            });
            
            // Update name and distance display colors
            if (this.targetNameDisplay) {
                this.targetNameDisplay.style.color = diplomacyColor;
                this.targetNameDisplay.style.textShadow = `0 0 4px ${diplomacyColor}`;
            }
            if (this.targetDistanceDisplay) {
                this.targetDistanceDisplay.style.color = diplomacyColor;
                this.targetDistanceDisplay.style.textShadow = `0 0 4px ${diplomacyColor}`;
            }
        }
    }
    
    /**
     * Get target reticle corners for styling
     */
    getTargetReticleCorners() {
        if (this.targetReticle) {
            return this.targetReticle.getElementsByClassName('reticle-corner');
        }
        return [];
    }
    
    /**
     * Update status icons with diplomacy color and info
     */
    updateStatusIcons(distance, diplomacyColor, isEnemyShip, info) {
        // Update status icons with diplomacy color
        if (this.governmentIcon) {
            this.governmentIcon.style.display = info?.government ? 'block' : 'none';
        }
        if (this.economyIcon) {
            this.economyIcon.style.display = info?.economy ? 'block' : 'none';
        }
        if (this.technologyIcon) {
            this.technologyIcon.style.display = info?.technology ? 'block' : 'none';
        }

        // Update icon colors and borders to match diplomacy
        const icons = [this.governmentIcon, this.economyIcon, this.technologyIcon].filter(icon => icon);
        icons.forEach(icon => {
            if (icon.style.display !== 'none') {
                icon.style.borderColor = diplomacyColor;
                icon.style.color = diplomacyColor;
                icon.style.textShadow = `0 0 4px ${diplomacyColor}`;
                icon.style.boxShadow = `0 0 4px ${diplomacyColor.replace(')', ', 0.4)')}`;
            }
        });

        // Update tooltips with current info
        if (info?.government && this.governmentIcon) {
            this.governmentIcon.title = `Government: ${info.government}`;
        }
        if (info?.economy && this.economyIcon) {
            this.economyIcon.title = `Economy: ${info.economy}`;
        }
        if (info?.technology && this.technologyIcon) {
            this.technologyIcon.title = `Technology: ${info.technology}`;
        }

        // Update reticle colors
        const corners = this.getTargetReticleCorners();
        Array.from(corners).forEach(corner => {
            corner.style.borderColor = diplomacyColor;
            corner.style.boxShadow = `0 0 2px ${diplomacyColor}`;
        });

        // Update target name and distance display colors
        if (this.targetNameDisplay) {
            this.targetNameDisplay.style.color = diplomacyColor;
            this.targetNameDisplay.style.textShadow = `0 0 4px ${diplomacyColor}`;
        }
        if (this.targetDistanceDisplay) {
            this.targetDistanceDisplay.style.color = diplomacyColor;
            this.targetDistanceDisplay.style.textShadow = `0 0 4px ${diplomacyColor}`;
        }

        // Update HUD and wireframe container colors to match diplomacy
        if (this.targetHUD) {
            this.targetHUD.style.borderColor = diplomacyColor;
            this.targetHUD.style.color = diplomacyColor;
        }
        if (this.wireframeContainer) {
            this.wireframeContainer.style.borderColor = diplomacyColor;
        }

        // Update arrow colors to match diplomacy
        this.updateArrowColors(diplomacyColor);
    }
    
    /**
     * Update arrow colors to match diplomacy
     */
    updateArrowColors(diplomacyColor) {
        ['top', 'bottom', 'left', 'right'].forEach(direction => {
            const arrow = document.querySelector(`#targeting-arrow-${direction}`);
            if (arrow) {
                // Update the visible border color based on direction
                if (direction === 'top') {
                    arrow.style.borderBottomColor = diplomacyColor;
                } else if (direction === 'bottom') {
                    arrow.style.borderTopColor = diplomacyColor;
                } else if (direction === 'left') {
                    arrow.style.borderRightColor = diplomacyColor;
                } else if (direction === 'right') {
                    arrow.style.borderLeftColor = diplomacyColor;
                }
            }
        });
    }
    
    /**
     * Update action buttons based on target type
     */
    updateActionButtons(currentTargetData, info) {
        // Dock button removed - docking is now handled by the DockingModal
        // which shows when conditions are met (distance, speed, etc.)
        
        // Clear existing buttons since we no longer show dock button
        this.clearActionButtons();
        
        // Reset button state on StarfieldManager if it exists
        if (this.viewManager?.starfieldManager) {
            this.viewManager.starfieldManager.currentButtonState = {
                hasDockButton: false,
                isDocked: this.viewManager.starfieldManager.isDocked || false,
                hasScanButton: false,
                hasTradeButton: false
            };
        }
    }

    /**
     * Clear action buttons container
     */
    clearActionButtons() {
        if (this.actionButtonsContainer) {
            this.actionButtonsContainer.innerHTML = '';
        }
    }
    
    /**
     * Clean up resources
     */
    dispose() {
        // Clean up wireframe renderer
        if (this.wireframeRenderer) {
            this.wireframeRenderer.dispose();
        }
        
        // Clean up target wireframe
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
        
        // Clean up UI elements
        if (this.targetHUD) document.body.removeChild(this.targetHUD);
        if (this.targetReticle) document.body.removeChild(this.targetReticle);
        
        // Clean up direction arrows
        Object.values(this.directionArrows).forEach(arrow => {
            if (arrow.parentNode) {
                document.body.removeChild(arrow);
            }
        });
        
        // Clean up target outline
        this.clearTargetOutline();
        
        // console.log('🎯 TargetComputerManager disposed');
    }




    /**
     * Stop wireframe animation
     */
    stopWireframeAnimation() {
        if (this.wireframeAnimationId) {
            cancelAnimationFrame(this.wireframeAnimationId);
            this.wireframeAnimationId = null;
        }
    }

    /**
     * Activate target computer and select first target if available
     */
    activateTargetComputer() {
        this.targetComputerEnabled = true;
        
        // If we have targets, select the first one
        if (this.targetObjects && this.targetObjects.length > 0) {
            this.targetIndex = 0;
            this.updateTargetDisplay();
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
                    this.cycleTarget();
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
     */
    clearTargetWireframe() {
        if (this.targetWireframe) {
            this.wireframeScene.remove(this.targetWireframe);
            this.targetWireframe.geometry.dispose();
            this.targetWireframe.material.dispose();
            this.targetWireframe = null;
        }
    }

    /**
     * Safely get position from target object (handles different target structures)
     * Always returns a Vector3 object or null
     */
    getTargetPosition(target) {
        if (!target) return null;
        
        // Check for Three.js Vector3 object first
        if (target.position && typeof target.position.clone === 'function') {
            return target.position;
        }
        
        // Check for nested object with position
        if (target.object && target.object.position && typeof target.object.position.clone === 'function') {
            return target.object.position;
        }
        
        // Convert array position to Vector3
        if (target.position && Array.isArray(target.position) && target.position.length >= 3) {
            return new this.THREE.Vector3(target.position[0], target.position[1], target.position[2]);
        }
        
        // Convert plain object position to Vector3
        if (target.position && typeof target.position === 'object' && 
            typeof target.position.x === 'number' && 
            typeof target.position.y === 'number' && 
            typeof target.position.z === 'number') {
            return new this.THREE.Vector3(target.position.x, target.position.y, target.position.z);
        }
        
        // Try to extract position from nested object userData
        if (target.object && target.object.userData && target.object.userData.position) {
            const pos = target.object.userData.position;
            if (Array.isArray(pos) && pos.length >= 3) {
                return new this.THREE.Vector3(pos[0], pos[1], pos[2]);
            }
            if (typeof pos === 'object' && typeof pos.x === 'number') {
                return new this.THREE.Vector3(pos.x, pos.y, pos.z);
            }
        }
        
        // console.warn('🎯 TargetComputerManager: Could not extract position from target:', target);
        return null;
    }

    /**
     * Clear current target and reset target state
     */
    clearCurrentTarget() {
        this.currentTarget = null;
        this.targetIndex = -1;
        
        // Hide target display elements
        if (this.targetHUD) {
            this.targetHUD.style.display = 'none';
        }
        if (this.targetReticle) {
            this.targetReticle.style.display = 'none';
        }
        
        // Clear wireframe
        this.clearTargetWireframe();
        
        // Hide direction arrows
        this.hideAllDirectionArrows();
        
        // console.log('🎯 Current target cleared due to invalid state');
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
} 