import { debug } from '../debug.js';
import { DistanceCalculator } from '../utils/DistanceCalculator.js';
import {
    TARGETING_TIMING,
    TARGETING_RANGE,
    WIREFRAME_COLORS,
    WIREFRAME_GEOMETRY,
    SUBSYSTEM_GEOMETRY,
} from '../constants/TargetingConstants.js';

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
        
        // Persistent target cache for better cycling experience
        this.knownTargets = new Map(); // Cache of all known targets by name
        this.lastFullScanTime = 0;
        this.fullScanInterval = TARGETING_TIMING.FULL_SCAN_INTERVAL_MS;
        
        // Waypoint interruption tracking
        this.interruptedWaypoint = null;
        this.waypointInterruptionTime = null;
        
        // Waypoint integration state
        this._waypointsAdded = false;
        this._waypointStyleApplied = false;
        
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
        
        // Outline system
        this.outlineEnabled = true;
        this.lastOutlineUpdate = 0;
        this.targetOutline = null;
        this.outlineGeometry = null;
        this.outlineMaterial = null;
        
        // Sorting state
        this.lastSortTime = 0;
        this.sortInterval = TARGETING_TIMING.SORT_INTERVAL_MS;
        
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

        // Temporary "no targets" message timeout
        this.noTargetsTimeout = null;
        
        // Audio for targeting events (using HTML5 Audio for simplicity)
        this.audioElements = new Map();
        
        // Wireframe animation
        this.wireframeAnimationId = null;

        // AbortController for centralized event listener cleanup
        this._abortController = new AbortController();

        // Warning throttling
        this.lastTargetNotFoundWarning = 0;

        // console.log('🎯 TargetComputerManager initialized');
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

        // Create sub-system targeting panel (slides out to the right, flush with bottom, 10% bigger than previous)
        this.subSystemPanel = document.createElement('div');
        this.subSystemPanel.style.cssText = `
            position: absolute;
            bottom: -2px;
            left: 220px;
            width: 165px;
            height: auto;
            border: 2px solid #D0D0D0;
            background: rgba(0, 0, 0, 0.7);
            color: #D0D0D0;
            font-family: "Courier New", monospace;
            font-size: 14px;
            padding: 10px;
            pointer-events: auto;
            z-index: 1000;
            transition: all 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
            transform: translateX(-100%);
            opacity: 0;
            overflow: hidden;
            cursor: pointer;
        `;
        
        // Add click handler for left/right half sub-targeting (with abort signal for cleanup)
        this.subSystemPanel.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();

            // Use the panel's bounding rect for consistent click detection regardless of child elements
            const rect = this.subSystemPanel.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const halfWidth = rect.width / 2;

            if (clickX < halfWidth) {
                // Left half - same as Z (previous sub-target)
                this.cycleToPreviousSubTarget();
            } else {
                // Right half - same as X (next sub-target)
                this.cycleToNextSubTarget();
            }
        }, { signal: this._abortController.signal });

        // Create sub-system wireframe container (10% bigger than previous)
        this.subSystemWireframeContainer = document.createElement('div');
        this.subSystemWireframeContainer.style.cssText = `
            width: 100%;
            height: 75px;
            border: 1px solid #D0D0D0;
            margin-bottom: 10px;
            position: relative;
            overflow: hidden;
            background: rgba(0, 20, 0, 0.3);
        `;

        // Create sub-system wireframe renderer (10% bigger: 149x75 vs previous 135x68)
        this.subSystemWireframeRenderer = new this.THREE.WebGLRenderer({ alpha: true });
        this.subSystemWireframeRenderer.setSize(149, 75);
        this.subSystemWireframeRenderer.setClearColor(0x000000, 0);
        
        // Create scene and camera for sub-system wireframe
        this.subSystemWireframeScene = new this.THREE.Scene();
        this.subSystemWireframeCamera = new this.THREE.PerspectiveCamera(45, 149/75, 0.1, 1000);
        this.subSystemWireframeCamera.position.z = WIREFRAME_GEOMETRY.SUBSYSTEM_CAMERA_Z;
        
        // Add lights to sub-system wireframe scene
        const subSystemWireframeLight = new this.THREE.DirectionalLight(0x00ff41, 1);
        subSystemWireframeLight.position.set(1, 1, 1);
        this.subSystemWireframeScene.add(subSystemWireframeLight);
        
        const subSystemWireframeAmbient = new this.THREE.AmbientLight(0x00ff41, 0.4);
        this.subSystemWireframeScene.add(subSystemWireframeAmbient);
        
        // Center the smaller wireframe renderer in its container
        this.subSystemWireframeRenderer.domElement.style.cssText = `
            display: block;
            margin: 0 auto;
            pointer-events: none;
        `;
        
        this.subSystemWireframeContainer.appendChild(this.subSystemWireframeRenderer.domElement);

        // Create sub-system content container
        this.subSystemContent = document.createElement('div');
        this.subSystemContent.style.cssText = `
            width: 100%;
            height: auto;
        `;
        
        // Ensure all child elements don't block clicks by setting pointer-events: none on children
        const subSystemStyle = document.createElement('style');
        subSystemStyle.textContent = `
            .sub-system-content * {
                pointer-events: none;
            }
        `;
        document.head.appendChild(subSystemStyle);
        this.subSystemContent.className = 'sub-system-content';
        
        // Assemble sub-system panel
        this.subSystemPanel.appendChild(this.subSystemWireframeContainer);
        this.subSystemPanel.appendChild(this.subSystemContent);

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
            z-index: 9999;
        `;

        // Create wireframe renderer - match original size
        this.wireframeRenderer = new this.THREE.WebGLRenderer({ alpha: true });
        this.wireframeRenderer.setSize(200, 150);
        this.wireframeRenderer.setClearColor(0x000000, 0);
        
        // Create scene and camera for wireframe
        this.wireframeScene = new this.THREE.Scene();
        this.wireframeCamera = new this.THREE.PerspectiveCamera(45, 200/150, 0.1, 1000);
        this.wireframeCamera.position.z = WIREFRAME_GEOMETRY.MAIN_CAMERA_Z;
        
        // Add lights to wireframe scene
        const wireframeLight = new this.THREE.DirectionalLight(0x00ff41, 1);
        wireframeLight.position.set(1, 1, 1);
        this.wireframeScene.add(wireframeLight);
        
        const wireframeAmbient = new this.THREE.AmbientLight(0x00ff41, 0.4);
        this.wireframeScene.add(wireframeAmbient);
        
        // Ensure wireframe canvas doesn't block clicks
        this.wireframeRenderer.domElement.style.pointerEvents = 'none';
        this.wireframeContainer.appendChild(this.wireframeRenderer.domElement);

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
        
        // Add sub-system panel to main HUD (positioned absolutely to the right)
        this.targetHUD.appendChild(this.subSystemPanel);
        
        document.body.appendChild(this.targetHUD);
    }

    /**
     * Show the sub-system targeting panel with slide-out animation
     */
    showSubSystemPanel() {
        if (!this.subSystemPanel) return;
        
        // Ensure the panel is visible first
        this.subSystemPanel.style.display = 'block';
        
        // Small delay to ensure display change is processed before animation
        requestAnimationFrame(() => {
            // Animate the panel sliding out from left to right
            this.subSystemPanel.style.transform = 'translateX(0)';
            this.subSystemPanel.style.opacity = '1';
        });
        
        debug('TARGETING', '🎯 Sub-system panel sliding out');
    }

    /**
     * Hide the sub-system targeting panel with slide-in animation
     */
    hideSubSystemPanel() {
        if (!this.subSystemPanel) return;
        
        // Immediately start the slide-in animation (right to left)
        this.subSystemPanel.style.transform = 'translateX(-100%)';
        this.subSystemPanel.style.opacity = '0';
        
        // Hide the panel after animation completes
        setTimeout(() => {
            if (this.subSystemPanel && this.subSystemPanel.style.opacity === '0') {
                this.subSystemPanel.style.display = 'none';
            }
        }, 300); // Match the CSS transition duration
        
        debug('TARGETING', '🎯 Sub-system panel sliding in');
    }

    /**
     * Update sub-system panel border color to match main HUD
     */
    updateSubSystemPanelColor(color) {
        if (this.subSystemPanel) {
            this.subSystemPanel.style.borderColor = color;
        }
        if (this.subSystemWireframeContainer) {
            this.subSystemWireframeContainer.style.borderColor = color;
        }
    }

    /**
     * Create geometric shapes for different sub-systems
     */
    createSubSystemGeometry(systemName, baseColor = 0x00ff41) {
        const geometry = new this.THREE.BufferGeometry();
        const material = new this.THREE.LineBasicMaterial({ 
            color: baseColor,
            transparent: true,
            opacity: 0.8
        });

        let vertices = [];

        switch (systemName) {
            case 'weapons':
                // Octahedron - aggressive angular shape
                vertices = [
                    // Top pyramid
                    0, 1, 0,   1, 0, 0,
                    1, 0, 0,   0, 0, 1,
                    0, 0, 1,   -1, 0, 0,
                    -1, 0, 0,  0, 1, 0,
                    // Bottom pyramid
                    0, -1, 0,  1, 0, 0,
                    1, 0, 0,   0, 0, 1,
                    0, 0, 1,   -1, 0, 0,
                    -1, 0, 0,  0, -1, 0,
                    // Connect top and bottom
                    0, 1, 0,   0, -1, 0
                ];
                break;

            case 'shields':
                // Icosphere - protective dome shape
                const t = (1.0 + Math.sqrt(5.0)) / 2.0; // Golden ratio
                const icosahedronVertices = [
                    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
                    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
                    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]
                ];
                // Create edges for wireframe
                const edges = [
                    [0,11], [0,5], [0,1], [0,7], [0,10], [1,5], [5,11], [11,10], [10,7], [7,1],
                    [3,9], [3,4], [3,2], [3,6], [3,8], [4,9], [9,8], [8,6], [6,2], [2,4],
                    [1,9], [5,4], [11,2], [10,6], [7,8], [0,3], [1,3], [5,3], [11,3], [10,3]
                ];
                vertices = [];
                edges.forEach(edge => {
                    vertices.push(...icosahedronVertices[edge[0]], ...icosahedronVertices[edge[1]]);
                });
                break;

            case 'impulse_engines':
                // Cylinder - engine thruster shape
                const radius = 0.8;
                const height = 1.5;
                const segments = 8;
                vertices = [];
                // Top circle
                for (let i = 0; i < segments; i++) {
                    const angle1 = (i / segments) * Math.PI * 2;
                    const angle2 = ((i + 1) / segments) * Math.PI * 2;
                    vertices.push(
                        Math.cos(angle1) * radius, height/2, Math.sin(angle1) * radius,
                        Math.cos(angle2) * radius, height/2, Math.sin(angle2) * radius
                    );
                }
                // Bottom circle
                for (let i = 0; i < segments; i++) {
                    const angle1 = (i / segments) * Math.PI * 2;
                    const angle2 = ((i + 1) / segments) * Math.PI * 2;
                    vertices.push(
                        Math.cos(angle1) * radius, -height/2, Math.sin(angle1) * radius,
                        Math.cos(angle2) * radius, -height/2, Math.sin(angle2) * radius
                    );
                }
                // Vertical lines connecting circles
                for (let i = 0; i < segments; i++) {
                    const angle = (i / segments) * Math.PI * 2;
                    vertices.push(
                        Math.cos(angle) * radius, height/2, Math.sin(angle) * radius,
                        Math.cos(angle) * radius, -height/2, Math.sin(angle) * radius
                    );
                }
                break;

            case 'warp_drive':
                // Torus - ring drive shape
                const majorRadius = 1.0;
                const minorRadius = 0.3;
                const majorSegments = 12;
                const minorSegments = 6;
                vertices = [];
                // Major circles
                for (let i = 0; i < majorSegments; i++) {
                    const angle1 = (i / majorSegments) * Math.PI * 2;
                    const angle2 = ((i + 1) / majorSegments) * Math.PI * 2;
                    vertices.push(
                        Math.cos(angle1) * majorRadius, 0, Math.sin(angle1) * majorRadius,
                        Math.cos(angle2) * majorRadius, 0, Math.sin(angle2) * majorRadius
                    );
                }
                // Minor circles
                for (let i = 0; i < majorSegments; i += 3) { // Every 3rd segment
                    const majorAngle = (i / majorSegments) * Math.PI * 2;
                    const centerX = Math.cos(majorAngle) * majorRadius;
                    const centerZ = Math.sin(majorAngle) * majorRadius;
                    for (let j = 0; j < minorSegments; j++) {
                        const minorAngle1 = (j / minorSegments) * Math.PI * 2;
                        const minorAngle2 = ((j + 1) / minorSegments) * Math.PI * 2;
                        vertices.push(
                            centerX + Math.cos(minorAngle1) * minorRadius * Math.cos(majorAngle),
                            Math.sin(minorAngle1) * minorRadius,
                            centerZ + Math.cos(minorAngle1) * minorRadius * Math.sin(majorAngle),
                            centerX + Math.cos(minorAngle2) * minorRadius * Math.cos(majorAngle),
                            Math.sin(minorAngle2) * minorRadius,
                            centerZ + Math.cos(minorAngle2) * minorRadius * Math.sin(majorAngle)
                        );
                    }
                }
                break;

            case 'target_computer':
                // Tetrahedron - precise targeting shape
                vertices = [
                    // Base triangle
                    1, -0.5, -0.5,   -1, -0.5, -0.5,
                    -1, -0.5, -0.5,  0, -0.5, 1,
                    0, -0.5, 1,      1, -0.5, -0.5,
                    // Apex connections
                    1, -0.5, -0.5,   0, 1, 0,
                    -1, -0.5, -0.5,  0, 1, 0,
                    0, -0.5, 1,      0, 1, 0
                ];
                break;

            case 'long_range_scanner':
                // Dish/Parabola - scanning array shape
                const dishRadius = 1.2;
                const dishSegments = 12;
                vertices = [];
                // Dish rim
                for (let i = 0; i < dishSegments; i++) {
                    const angle1 = (i / dishSegments) * Math.PI * 2;
                    const angle2 = ((i + 1) / dishSegments) * Math.PI * 2;
                    vertices.push(
                        Math.cos(angle1) * dishRadius, 0, Math.sin(angle1) * dishRadius,
                        Math.cos(angle2) * dishRadius, 0, Math.sin(angle2) * dishRadius
                    );
                }
                // Dish spokes to center
                for (let i = 0; i < dishSegments; i += 2) {
                    const angle = (i / dishSegments) * Math.PI * 2;
                    vertices.push(
                        0, 0, 0,
                        Math.cos(angle) * dishRadius, 0, Math.sin(angle) * dishRadius
                    );
                }
                // Support structure
                vertices.push(0, 0, 0, 0, -1, 0);
                break;

            case 'energy_reactor':
                // Cube - power core shape
                vertices = [
                    // Front face
                    -1, -1, 1,   1, -1, 1,
                    1, -1, 1,    1, 1, 1,
                    1, 1, 1,     -1, 1, 1,
                    -1, 1, 1,    -1, -1, 1,
                    // Back face
                    -1, -1, -1,  1, -1, -1,
                    1, -1, -1,   1, 1, -1,
                    1, 1, -1,    -1, 1, -1,
                    -1, 1, -1,   -1, -1, -1,
                    // Connecting edges
                    -1, -1, 1,   -1, -1, -1,
                    1, -1, 1,    1, -1, -1,
                    1, 1, 1,     1, 1, -1,
                    -1, 1, 1,    -1, 1, -1
                ];
                break;

            case 'hull_plating':
                // Hexagonal prism - armor plating shape
                const hexRadius = 1.0;
                const hexHeight = 0.8;
                vertices = [];
                // Top hexagon
                for (let i = 0; i < 6; i++) {
                    const angle1 = (i / 6) * Math.PI * 2;
                    const angle2 = ((i + 1) / 6) * Math.PI * 2;
                    vertices.push(
                        Math.cos(angle1) * hexRadius, hexHeight/2, Math.sin(angle1) * hexRadius,
                        Math.cos(angle2) * hexRadius, hexHeight/2, Math.sin(angle2) * hexRadius
                    );
                }
                // Bottom hexagon
                for (let i = 0; i < 6; i++) {
                    const angle1 = (i / 6) * Math.PI * 2;
                    const angle2 = ((i + 1) / 6) * Math.PI * 2;
                    vertices.push(
                        Math.cos(angle1) * hexRadius, -hexHeight/2, Math.sin(angle1) * hexRadius,
                        Math.cos(angle2) * hexRadius, -hexHeight/2, Math.sin(angle2) * hexRadius
                    );
                }
                // Vertical edges
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    vertices.push(
                        Math.cos(angle) * hexRadius, hexHeight/2, Math.sin(angle) * hexRadius,
                        Math.cos(angle) * hexRadius, -hexHeight/2, Math.sin(angle) * hexRadius
                    );
                }
                break;

            default:
                // Default: Simple wireframe cube
                vertices = [
                    -1, -1, 1,   1, -1, 1,   1, -1, 1,    1, 1, 1,
                    1, 1, 1,     -1, 1, 1,   -1, 1, 1,    -1, -1, 1,
                    -1, -1, -1,  1, -1, -1,  1, -1, -1,   1, 1, -1,
                    1, 1, -1,    -1, 1, -1,  -1, 1, -1,   -1, -1, -1,
                    -1, -1, 1,   -1, -1, -1, 1, -1, 1,    1, -1, -1,
                    1, 1, 1,     1, 1, -1,   -1, 1, 1,    -1, 1, -1
                ];
        }

        geometry.setAttribute('position', new this.THREE.Float32BufferAttribute(vertices, 3));
        return new this.THREE.LineSegments(geometry, material);
    }

    /**
     * Update sub-system wireframe based on current sub-target
     */
    updateSubSystemWireframe(systemName, healthPercentage = 1.0, diplomacyColor = '#00ff41') {
        if (!this.subSystemWireframeScene || !this.subSystemWireframeRenderer) return;

        // Clear existing wireframe
        while (this.subSystemWireframeScene.children.length > 2) { // Keep lights
            this.subSystemWireframeScene.remove(this.subSystemWireframeScene.children[2]);
        }

        if (!systemName) return;

        // Convert diplomacy color to hex number for Three.js
        const baseColor = this.convertColorToHex(diplomacyColor);
        
        // Create new wireframe for the system with faction color
        const wireframe = this.createSubSystemGeometry(systemName, baseColor);
        
        // Adjust color based on health while maintaining faction hue
        const finalColor = this.getFactionHealthColor(diplomacyColor, healthPercentage);
        wireframe.material.color.setHex(finalColor);
        
        // Add rotation animation
        wireframe.rotation.x = Date.now() * 0.0005;
        wireframe.rotation.y = Date.now() * 0.001;
        
        this.subSystemWireframeScene.add(wireframe);
        
        // Store reference for animation
        this.currentSubSystemWireframe = wireframe;
        
        // Render the scene
        this.subSystemWireframeRenderer.render(this.subSystemWireframeScene, this.subSystemWireframeCamera);
        
        debug('TARGETING', `🎯 Sub-system wireframe updated: ${systemName} (${Math.round(healthPercentage * 100)}% health, ${diplomacyColor} faction)`);
    }

    /**
     * Convert CSS color string to Three.js hex number
     */
    convertColorToHex(colorString) {
        // Remove # if present
        const hex = colorString.replace('#', '');
        return parseInt(hex, 16);
    }

    /**
     * Get faction-based health color that maintains faction hue but adjusts for damage
     */
    getFactionHealthColor(diplomacyColor, healthPercentage) {
        // For healthy systems (70%+), use full faction color
        if (healthPercentage > 0.7) {
            return this.convertColorToHex(diplomacyColor);
        }
        
        // For damaged systems, blend faction color with damage indicators
        const baseColor = this.convertColorToHex(diplomacyColor);
        
        if (healthPercentage > 0.4) {
            // Slightly damaged - blend with yellow
            return this.blendColors(baseColor, 0xffff00, 0.3);
        } else if (healthPercentage > 0.2) {
            // Heavily damaged - blend with orange
            return this.blendColors(baseColor, 0xff8800, 0.5);
        } else {
            // Critical - blend with red
            return this.blendColors(baseColor, 0xff0000, 0.7);
        }
    }

    /**
     * Blend two hex colors
     */
    blendColors(color1, color2, ratio) {
        const r1 = (color1 >> 16) & 0xff;
        const g1 = (color1 >> 8) & 0xff;
        const b1 = color1 & 0xff;
        
        const r2 = (color2 >> 16) & 0xff;
        const g2 = (color2 >> 8) & 0xff;
        const b2 = color2 & 0xff;
        
        const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
        const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
        const b = Math.round(b1 * (1 - ratio) + b2 * ratio);
        
        return (r << 16) | (g << 8) | b;
    }

    /**
     * Get color based on health percentage (legacy method for compatibility)
     */
    getHealthColor(healthPercentage) {
        if (healthPercentage > 0.7) return 0x00ff41; // Green - healthy
        if (healthPercentage > 0.4) return 0xffff00; // Yellow - damaged
        if (healthPercentage > 0.2) return 0xff8800; // Orange - heavily damaged
        return 0xff0000; // Red - critical
    }

    /**
     * Animate sub-system wireframe
     */
    animateSubSystemWireframe() {
        if (this.currentSubSystemWireframe && this.subSystemWireframeRenderer && this.subSystemWireframeScene) {
            // Rotate the wireframe
            this.currentSubSystemWireframe.rotation.x += 0.005;
            this.currentSubSystemWireframe.rotation.y += 0.01;
            
            // Render the scene
            this.subSystemWireframeRenderer.render(this.subSystemWireframeScene, this.subSystemWireframeCamera);
        }
    }

    /**
     * Update method called from StarfieldManager main loop
     */
    update(deltaTime) {
        // Animate sub-system wireframe if visible
        if (this.subSystemPanel && this.subSystemPanel.style.opacity === '1') {
            this.animateSubSystemWireframe();
        }
    }

    /**
     * Add scan line effects to the target HUD that sync with comm HUD
     */
    addTargetScanLineEffects() {
        // Add CSS styles for scan line effects
        this.addTargetScanLineStyles();
        
        // Create static scan line overlay (repeating lines)
        const scanLineOverlay = document.createElement('div');
        scanLineOverlay.className = 'target-scan-lines';
        scanLineOverlay.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            width: 200px;
            height: 150px;
            background: repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0, 255, 65, 0.03) 2px,
                rgba(0, 255, 65, 0.03) 4px
            );
            pointer-events: none;
            z-index: 1;
        `;
        
        // Create animated scan line with delay to sync with comm HUD
        this.animatedScanLine = document.createElement('div');
        this.animatedScanLine.className = 'target-scan-line';
        this.animatedScanLine.style.cssText = `
            position: absolute;
            top: 10px;
            left: 10px;
            width: 200px;
            height: 2px;
            background: linear-gradient(90deg, transparent, #00ff41, transparent);
            animation: targetScanLine 2s linear infinite;
            animation-delay: 0.5s;
            opacity: 0.6;
            pointer-events: none;
            z-index: 2;
        `;
        
        this.targetHUD.appendChild(scanLineOverlay);
        this.targetHUD.appendChild(this.animatedScanLine);
    }
    
    /**
     * Add CSS styles for target scan line animations
     */
    addTargetScanLineStyles() {
        if (document.getElementById('target-scan-line-styles')) return;

        const style = document.createElement('style');
        style.id = 'target-scan-line-styles';
        style.textContent = `
            @keyframes targetScanLine {
                0% { transform: translateY(0); opacity: 0; }
                50% { opacity: 0.6; }
                100% { transform: translateY(150px); opacity: 0; }
            }
        `;

        document.head.appendChild(style);
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

        // Style each arrow - simplified approach with proper dimensions
        Object.entries(this.directionArrows).forEach(([position, arrow]) => {
            // Set specific dimensions and styles for each direction
            if (position === 'top') {
                arrow.style.cssText = `
                    position: fixed;
                    width: 20px;
                    height: 15px;
                    pointer-events: none;
                    z-index: 25000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                // Create triangle directly with proper centering
                arrow.innerHTML = '<div style="width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 15px solid #D0D0D0;"></div>';
            } else if (position === 'bottom') {
                arrow.style.cssText = `
                    position: fixed;
                    width: 20px;
                    height: 15px;
                    pointer-events: none;
                    z-index: 25000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                arrow.innerHTML = '<div style="width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 15px solid #D0D0D0;"></div>';
            } else if (position === 'left') {
                arrow.style.cssText = `
                    position: fixed;
                    width: 15px;
                    height: 20px;
                    pointer-events: none;
                    z-index: 25000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                arrow.innerHTML = '<div style="width: 0; height: 0; border-top: 10px solid transparent; border-bottom: 10px solid transparent; border-right: 15px solid #D0D0D0;"></div>';
            } else if (position === 'right') {
                arrow.style.cssText = `
                    position: fixed;
                    width: 15px;
                    height: 20px;
                    pointer-events: none;
                    z-index: 25000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                arrow.innerHTML = '<div style="width: 0; height: 0; border-top: 10px solid transparent; border-bottom: 10px solid transparent; border-left: 15px solid #D0D0D0;"></div>';
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
        // Hide service icons while powering up (no valid target yet)
        if (this.statusIconsContainer) {
            this.statusIconsContainer.style.display = 'none';
        }
        
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
        
        // Remove power-up element if present
        const pu = document.getElementById('powerup-animation');
        if (pu && pu.parentNode) {
            pu.parentNode.removeChild(pu);
        }
        
        // The updateTargetDisplay() call after this will replace the power-up content
        // with the actual target information
    }

    /**
     * Hard reset any in-progress power-up state (used on undock/launch)
     */
    resetAfterUndock() {
        this.isPoweringUp = false;
        // Remove any lingering power-up DOM
        const pu = document.getElementById('powerup-animation');
        if (pu && pu.parentNode) {
            pu.parentNode.removeChild(pu);
        }
        // Stop monitors and hide HUD to ensure a clean manual re-activation
        this.stopNoTargetsMonitoring();
        this.stopRangeMonitoring();
        if (this.targetHUD) this.targetHUD.style.display = 'none';
        if (this.targetReticle) this.targetReticle.style.display = 'none';
        this.targetInfoDisplay.innerHTML = '';
        this.currentTarget = null;
        this.targetIndex = -1;
        this.isManualNavigationSelection = false; // Reset navigation selection flag
        this.isManualSelection = false; // Reset manual selection flag
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
        // Hide service icons on no-targets screen
        if (this.statusIconsContainer) {
            this.statusIconsContainer.style.display = 'none';
        }
        
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
                // console.log(`🎯 Targets detected while monitoring - automatically acquiring nearest target`);
                this.stopNoTargetsMonitoring();
                
                // If no current target is set, automatically select the nearest one
                // BUT: Don't override manual selections from Star Charts or other systems
                if (!this.currentTarget) {
                    // console.log(`🎯 No current target - automatically selecting nearest target`);
                    this.targetIndex = -1;
                    this.cycleTarget(); // Auto-select nearest target
                    
                    // Play audio feedback for automatic target reacquisition
                    this.playAudio('frontend/static/audio/blurb.mp3');
                } else {
                    // Update target index to match the current target (scanner or normal)
                    // console.log(`🎯 Current target exists - updating target index for ${this.currentTarget.name}`);
                    const currentIndex = this.targetObjects.findIndex(target => target.name === this.currentTarget.name);
                    if (currentIndex !== -1) {
                        this.targetIndex = currentIndex;
                        this.updateTargetDisplay();
                    } else {
                        // Current target not found in list - select nearest available target unless user is actively holding a manual lock
                        if (!this.isManualSelection) {

                            this.targetIndex = -1;
                            this.cycleTarget();
                        } else {
                            // console.log(`🎯 Manual selection preserved - not auto-cycling`);
                        }
                    }
                }
                
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
                
                // Force direction arrow update when target changes
                this.updateDirectionArrow();
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
     * Range monitoring disabled - targets persist until manually changed or sector warp
     */
    startRangeMonitoring() {
        // Range monitoring disabled - targets persist until manually changed or sector warp
        // console.log(`🎯 Range monitoring disabled - targets will only clear on solar system warp`);
        return;
    }

    /**
     * Clean up range monitoring state (no longer used)
     */
    stopRangeMonitoring() {
        // Clean up any existing interval if it exists
        if (this.rangeMonitoringInterval) {
            clearInterval(this.rangeMonitoringInterval);
            this.rangeMonitoringInterval = null;
        }
    }
    
    /**
     * Range monitoring disabled - targets persist until manually changed or sector warp
     * Removed handleTargetOutOfRange method to prevent automatic target clearing
     */

    /**
     * Show temporary "No targets in range" message for specified duration
     * @param {Function} callback - Function to call after the delay
     * @param {number} duration - Duration in milliseconds (default: 1000ms)
     */
    showTemporaryNoTargetsMessage(callback, duration = 1000) {
        // Show "No targets in range" message with switching indicator
        this.targetInfoDisplay.innerHTML = `
            <div style="background-color: #2a2a2a; color: #D0D0D0; padding: 8px; border-radius: 4px; margin-bottom: 8px; text-align: center; border: 1px solid #555555;">
                <div style="font-weight: bold; font-size: 12px;">No Targets In Range</div>
                <div style="font-size: 10px;">Switching to nearest target...</div>
            </div>
        `;

        // Hide service icons during the delay
        if (this.statusIconsContainer) {
            this.statusIconsContainer.style.display = 'none';
        }

        // Clear any existing timeout
        if (this.noTargetsTimeout) {
            clearTimeout(this.noTargetsTimeout);
        }

        // Set timeout to execute callback after delay
        this.noTargetsTimeout = setTimeout(() => {
            this.noTargetsTimeout = null;
            callback();
        }, duration);
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
                    debug('P1', `🔊 Audio error for ${fileName}: ${e}`);
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
                    debug('P1', `🔊 Failed to play audio: ${fileName} - ${error}`);
                });
            }
        } catch (error) {
            debug('P1', `🔊 Failed to play audio: ${audioPath} - ${error}`);
        }
    }

    /**
     * Update the list of available targets
     */
    updateTargetList() {
        // console.log(`🎯 updateTargetList called: physicsManager=${!!window.physicsManager}, physicsManagerReady=${!!window.physicsManagerReady}`);
        
        // Store previous target list for comparison
        const previousTargets = [...this.targetObjects];
        
        // Always use Three.js-based target list update (physics system removed)
        this.updateTargetListWithPhysics();
        
        // Update the known targets cache with current targets
        this.updateKnownTargetsCache(this.targetObjects);
        
        // If we have a manual navigation selection and the new list is very small, enhance it with cached targets
        if (this.isManualNavigationSelection && this.targetObjects.length <= 2) {
            // console.log(`🎯 Manual navigation selection active with small target list (${this.targetObjects.length}) - enhancing with cached targets for better cycling`);
            
            const enhancedTargets = this.enhanceTargetListWithCache(this.targetObjects);
            if (enhancedTargets.length > this.targetObjects.length) {
                this.targetObjects = enhancedTargets;
                // console.log(`🎯 Enhanced target list for cycling: ${this.targetObjects.length} targets available`);
            }
        }
    }

    /**
     * Update the known targets cache with current targets
     */
    updateKnownTargetsCache(currentTargets) {
        const now = Date.now();
        const currentSector = this.solarSystemManager?.currentSector || 'A0';
        
        // CRITICAL FIX: Clear cache entries from other sectors first
        for (const [name, cachedTarget] of this.knownTargets.entries()) {
            if (cachedTarget.id && !cachedTarget.id.startsWith(currentSector + '_')) {
                debug('TARGETING', `🧹 Clearing cached target from different sector: ${name} (ID: ${cachedTarget.id})`);
                this.knownTargets.delete(name);
            }
        }
        
        // Add current targets to cache
        for (const target of currentTargets) {
            if (target && target.name && target.id) {
                // CRITICAL FIX: Only cache targets from current sector
                if (target.id.startsWith(currentSector + '_')) {
                    this.knownTargets.set(target.name, {
                        ...target,
                        lastSeen: now,
                        distance: this.calculateTargetDistance(target)
                    });
                    debug('TARGETING', `📝 Cached target: ${target.name} (ID: ${target.id})`);
                } else {
                    debug('TARGETING', `🚫 Skipping cache for target from different sector: ${target.name} (ID: ${target.id})`);
                }
            }
        }
        
        // Clean up old entries (older than 5 minutes)
        const maxAge = 5 * 60 * 1000; // 5 minutes
        for (const [name, cachedTarget] of this.knownTargets.entries()) {
            if (now - cachedTarget.lastSeen > maxAge) {
                debug('TARGETING', `🗑️ Removing expired cached target: ${name}`);
                this.knownTargets.delete(name);
            }
        }
        
        debug('TARGETING', `🎯 Known targets cache updated: ${this.knownTargets.size} targets cached for sector ${currentSector}`);
    }

    /**
     * Enhance target list with cached targets for better cycling
     */
    enhanceTargetListWithCache(currentTargets) {
        const enhancedTargets = [...currentTargets];
        const currentTargetNames = new Set(currentTargets.map(t => t.name));
        const maxCyclingRange = TARGETING_RANGE.MAX_CYCLING_RANGE;
        
        // CRITICAL FIX: Get current sector to prevent cross-sector contamination
        const currentSector = this.solarSystemManager?.currentSector || 'A0';
        debug('TARGETING', `🎯 Enhancing target list for sector ${currentSector} (${this.knownTargets.size} cached targets available)`);
        
        // Add cached targets that are within reasonable range AND in current sector
        for (const [name, cachedTarget] of this.knownTargets.entries()) {
            // Skip if already in current list
            if (currentTargetNames.has(name)) {
                continue;
            }
            
            // CRITICAL FIX: Only include targets from current sector
            if (cachedTarget.id && !cachedTarget.id.startsWith(currentSector + '_')) {
                debug('TARGETING', `🚫 Skipping cached target from different sector: ${name} (ID: ${cachedTarget.id})`);
                continue;
            }
            
            // Calculate current distance to cached target
            const distance = this.calculateTargetDistance(cachedTarget);
            
            // Include if within cycling range
            if (distance <= maxCyclingRange) {
                debug('TARGETING', `🎯 Adding cached target for cycling: ${name} (${distance.toFixed(1)}km, ID: ${cachedTarget.id})`);
                enhancedTargets.push({
                    ...cachedTarget,
                    distance: distance,
                    isCached: true // Mark as cached for debugging
                });
            } else {
                debug('TARGETING', `🚫 Cached target out of range: ${name} (${distance.toFixed(1)}km > ${maxCyclingRange}km)`);
            }
        }
        
        debug('TARGETING', `🎯 Enhanced target list: ${currentTargets.length} → ${enhancedTargets.length} targets`);
        return enhancedTargets;
    }

    /**
     * Calculate distance to a target
     */
    calculateTargetDistance(target) {
        if (!target || !target.position || !this.camera) {
            return Infinity;
        }
        
        try {
            const targetPos = Array.isArray(target.position) 
                ? new this.THREE.Vector3(...target.position)
                : target.position;
            return this.camera.position.distanceTo(targetPos) / 1000; // Convert to km
        } catch (error) {
            debug('P1', `🎯 Error calculating distance to ${target.name}: ${error}`);
            return Infinity;
        }
    }

    /**
     * Enhanced target list update using Three.js native approach
     */
    updateTargetListWithPhysics() {
        // Delegate to traditional method which now has all our enhancements
        return this.updateTargetListTraditional();
    }

    /**
     * Traditional target list update (fallback when physics not available)
     */
    updateTargetListTraditional() {
        let allTargets = [];
        
        // Get the actual range from the target computer system
        const ship = this.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');
        const maxTargetingRange = targetComputer?.range || 150; // Fallback to 150km if system not found
        
        // Get celestial bodies from SolarSystemManager (same as traditional method)
        if (this.solarSystemManager) {
            const bodies = this.solarSystemManager.getCelestialBodies();
            debug('TARGETING', `SolarSystemManager has ${bodies.size} celestial bodies`);

            const celestialBodies = Array.from(bodies.entries())
                .map(([key, body]) => {
                    const info = this.solarSystemManager.getCelestialBodyInfo(body);

                    // Validate body position
                    if (!body.position ||
                        isNaN(body.position.x) ||
                        isNaN(body.position.y) ||
                        isNaN(body.position.z)) {
                        debug('TARGETING', `🎯 Invalid position for body ${key}`);
                        return null;
                    }

                    const distance = this.calculateDistance(this.camera.position, body.position);
                    debug('TARGETING', `Body ${key}: ${info.name} at ${distance.toFixed(1)}km`);

                    // Skip bodies beyond target computer range
                    if (distance > maxTargetingRange) {
                        debug('TARGETING', `Body ${key} beyond range (${distance.toFixed(1)}km > ${maxTargetingRange}km)`);
                        return null;
                    }
                    
                    // Ensure consistent ID format with Star Charts (sector prefix)
                    let targetId = this.constructStarChartsId(info);
                    if (!targetId) {
                        // Fallback to key-based ID if name-based construction fails
                        const currentSector = this.solarSystemManager?.currentSector || 'A0';
                        const normalizedKey = key.replace(/^(station_|planet_|moon_|star_)/, '');
                        targetId = `${currentSector}_${normalizedKey}`;
                    }
                    
                    // Check if this object is discovered before including faction info
                    const isDiscovered = this.isObjectDiscovered({id: targetId, name: info.name, type: info.type});
                    
                    const baseTarget = {
                        id: targetId, // CRITICAL: Use consistent A0_ format
                        name: info.name,
                        type: info.type,
                        position: body.position.toArray(),
                        isMoon: key.startsWith('moon_'),
                        isSpaceStation: info.type === 'station' || (info.type && (
                            info.type.toLowerCase().includes('station') ||
                            info.type.toLowerCase().includes('complex') ||
                            info.type.toLowerCase().includes('platform') ||
                            info.type.toLowerCase().includes('facility') ||
                            info.type.toLowerCase().includes('base')
                        )),
                        object: body,
                        isShip: false,
                        distance: distance
                    };
                    
                    // Only include faction/diplomacy info for discovered objects
                    if (isDiscovered) {
                        return {
                            ...baseTarget,
                            ...info, // Include all info properties (diplomacy, faction, etc.)
                            discovered: true
                        };
                    } else {
                        // For undiscovered objects, set unknown status
                        return {
                            ...baseTarget,
                            diplomacy: 'unknown',
                            faction: 'Unknown',
                            discovered: false
                        };
                    }
                })
                .filter(body => body !== null);
            
            allTargets = allTargets.concat(celestialBodies);
        }
        
        // Add any targets that might not have physics bodies yet (ships, beacons, etc.)
        this.addNonPhysicsTargets(allTargets, maxTargetingRange);
        
        // Apply deduplication to prevent duplicate targets
        const deduplicatedTargets = [];
        const seenIds = new Set();
        const seenNames = new Set();
        const duplicatesFound = [];
        
        for (const target of allTargets) {
            const targetId = target.id;
            const targetName = target.name;
            
            // Skip if we've seen this ID or name before
            if ((targetId && seenIds.has(targetId)) || seenNames.has(targetName)) {
                duplicatesFound.push({ name: targetName, id: targetId, reason: targetId && seenIds.has(targetId) ? 'duplicate ID' : 'duplicate name' });
                continue;
            }
            
            // Add to seen sets
            if (targetId) seenIds.add(targetId);
            seenNames.add(targetName);
            deduplicatedTargets.push(target);
        }
        
        // Log duplicates found (rate limited)
        if (duplicatesFound.length > 0 && Math.random() < 0.1) {
            debug('TARGETING', `🎯 DEDUP: Removed ${duplicatesFound.length} duplicates:`, duplicatesFound.slice(0, 3));
        }
        
        // CRITICAL: Normalize ALL target IDs before setting the target list
        debug('TARGETING', `🔍 Normalizing ${deduplicatedTargets.length} targets`);
        
        const normalizedTargets = deduplicatedTargets.map(target => this.normalizeTarget(target));
        
        // Rate-limited detailed logging (only 5% of the time to reduce spam)
        if (Math.random() < 0.05) {
            debug('TARGETING', `🔍 NORMALIZATION SAMPLE: ${normalizedTargets.length} targets`);
            normalizedTargets.slice(0, 3).forEach((target, i) => {
                debug('TARGETING', `  [${i}] ${target.name} - ID: "${target.id}"`);
            });
        }
        
        // CRITICAL: Filter out any targets from other sectors to prevent contamination
        const currentSector = this.solarSystemManager?.currentSector || 'A0';
        const sectorFilteredTargets = normalizedTargets.filter(target => {
            if (target.id && typeof target.id === 'string' && !target.id.startsWith(currentSector + '_')) {
                debug('TARGETING', `🚫 SECTOR FILTER: Removing cross-sector target: ${target.name} (ID: ${target.id}, current sector: ${currentSector})`);
                return false;
            }
            return true;
        });
        
        if (sectorFilteredTargets.length !== normalizedTargets.length) {
            debug('TARGETING', `🧹 SECTOR FILTER: Removed ${normalizedTargets.length - sectorFilteredTargets.length} cross-sector targets`);
        }
        
        // Update target list with sector-filtered targets
        this.targetObjects = sectorFilteredTargets;

        // Debug logging to see what targets were found
        debug('TARGETING', `TargetComputerManager: Found ${this.targetObjects.length} targets:`, this.targetObjects.map(t => `${t.name} (${t.distance.toFixed(1)}km)`));

        // Sort targets by distance
        this.sortTargetsByDistance();
    }

    /**
     * Add targets that don't have physics bodies yet (fallback)
     */
    addNonPhysicsTargets(allTargets, maxRange) {
        // console.log(`🎯 addNonPhysicsTargets: Called with ${allTargets.length} existing targets, maxRange: ${maxRange}km`);
        
        // Build sets for duplicate detection - check both names and ship objects
        const existingTargetIds = new Set(allTargets.map(t => t.physicsEntity?.id || t.name));
        const existingShipObjects = new Set(allTargets.map(t => t.ship).filter(ship => ship));
        
        // Debug viewManager chain (reduced logging)
        // console.log(`🎯 addNonPhysicsTargets: viewManager exists: ${!!this.viewManager}`);
        // console.log(`🎯 addNonPhysicsTargets: starfieldManager exists: ${!!this.viewManager?.starfieldManager}`);
        // console.log(`🎯 addNonPhysicsTargets: dummyShipMeshes exists: ${!!this.viewManager?.starfieldManager?.dummyShipMeshes}`);
        // console.log(`🎯 addNonPhysicsTargets: dummyShipMeshes length: ${this.viewManager?.starfieldManager?.dummyShipMeshes?.length || 0}`);
        
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
                            id: ship.id || mesh.userData?.id || ship.shipName, // CRITICAL: Include the ID field
                            name: ship.shipName,
                            type: 'enemy_ship',
                            position: mesh.position.toArray(),
                            isMoon: false,
                            object: mesh,
                            isShip: true,
                            ship: ship,
                            distance: distance,
                            diplomacy: ship.diplomacy || 'enemy', // Copy diplomacy from ship
                            faction: ship.faction || ship.diplomacy || 'enemy' // Copy faction from ship
                        });
                    } else {
                        // console.log(`🎯 addNonPhysicsTargets: Dummy ship ${targetId} out of range: ${distance.toFixed(1)}km > ${maxRange}km`);
                    }
                } else if (ship && ship.currentHull <= 0.001) {
                    // console.log(`🗑️ Fallback method filtering out destroyed ship: ${ship.shipName} (Hull: ${ship.currentHull})`);
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
                        // Generate proper sector-prefixed ID
                        const currentSector = this.solarSystemManager?.currentSector || 'A0';
                        let sectorId;
                        if (key === 'star') {
                            sectorId = `${currentSector}_star`;
                        } else if (key.startsWith('planet_')) {
                            const planetIndex = key.split('_')[1];
                            const planetName = info.name?.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `planet_${planetIndex}`;
                            sectorId = `${currentSector}_${planetName}`;
                        } else if (key.startsWith('moon_')) {
                            const moonName = info.name?.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || key;
                            sectorId = `${currentSector}_${moonName}`;
                        } else {
                            // Fallback for other objects
                            const objectName = info.name?.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || key;
                            sectorId = `${currentSector}_${objectName}`;
                        }

                        const targetData = {
                            id: sectorId, // Use sector-prefixed ID
                            name: info.name,
                            type: info.type,
                            position: body.position.toArray(),
                            isMoon: key.startsWith('moon_'),
                            isSpaceStation: info.type === 'station' || (info.type && (
                            info.type.toLowerCase().includes('station') ||
                            info.type.toLowerCase().includes('complex') ||
                            info.type.toLowerCase().includes('platform') ||
                            info.type.toLowerCase().includes('facility') ||
                            info.type.toLowerCase().includes('base')
                        )),
                            object: body,
                            isShip: false,
                            distance: distance,
                            ...info
                        };
                        debug('TARGETING', `TargetComputerManager.addNonPhysicsTargets: Adding celestial body: ${targetData.name} (${targetData.type}, ${targetData.faction}, ${targetData.diplomacy})`);
                        allTargets.push(targetData);
                    }
                }
            }
        }
        
        // console.log(`🎯 addNonPhysicsTargets: Processing ${this.viewManager.starfieldManager.dummyShipMeshes?.length || 0} dummy ships`);
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
     * This ensures ALL targets get proper sector-prefixed IDs regardless of source
     */
    normalizeTarget(targetData, fallbackKey = null) {
        if (!targetData) return targetData;
        
        // Clone to avoid modifying original
        const normalizedTarget = { ...targetData };
        
        // Apply unified ID normalization
        const normalizedId = this.normalizeTargetId(targetData, fallbackKey);
        if (normalizedId) {
            normalizedTarget.id = normalizedId;
        }
        
        return normalizedTarget;
    }

    addTargetWithDeduplication(targetData) {
        if (!targetData) {
            debug('TARGETING', `🚨 Cannot add null target`);
            return false;
        }
        
        // CRITICAL: Normalize target ID before processing
        targetData = this.normalizeTarget(targetData);
        
        if (!targetData.id) {
            debug('TARGETING', `🚨 Cannot add target without ID after normalization: ${targetData?.name || 'unknown'}`);
            return false;
        }
        
        // CRITICAL: AGGRESSIVE SECTOR VALIDATION - ZERO TOLERANCE FOR CROSS-SECTOR CONTAMINATION
        const currentSector = this.viewManager?.solarSystemManager?.currentSector;
        if (currentSector && targetData.id && typeof targetData.id === 'string') {
            if (!targetData.id.startsWith(currentSector + '_')) {
                debug('TARGETING', `🚨 SECTOR VIOLATION: Rejecting cross-sector target: ${targetData.name} (${targetData.id}) - Current sector: ${currentSector}`);
                debug('TARGETING', `🚨 FAIL-FAST: Cross-sector contamination prevented at target addition point`);
                return false; // FAIL-FAST: Reject immediately
            }
        }

        // Check for existing target by ID and name
        const existingIndex = this.targetObjects.findIndex(target => {
            return target.id === targetData.id || target.name === targetData.name;
        });

        if (existingIndex === -1) {
            // Add new target
            this.targetObjects.push(targetData);
            debug('TARGETING', `🎯 DEDUP: Added new target: ${targetData.name} (${targetData.id})`);
            return true;
        } else {
            // Update existing target
            this.targetObjects[existingIndex] = { ...this.targetObjects[existingIndex], ...targetData };
            debug('TARGETING', `🎯 DEDUP: Updated existing target: ${targetData.name} (${targetData.id})`);
            return false; // Not a new addition
        }
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
            // Handle targets that don't have physical objects attached (e.g., Star Charts targets)
            if (targetData.object && targetData.object.position) {
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
            } else if (targetData.position) {
                // Fallback to stored position if available
                targetData.distance = this.calculateDistance(this.camera.position, targetData.position);
            } else {
                // Last resort: set to a large distance so these targets sort to the end
                targetData.distance = TARGETING_RANGE.INFINITY_DISTANCE;
                debug('TARGETING', `⚠️ Target ${targetData.name} has no position data - setting distance to ${targetData.distance}km`);
            }

            // Clear outOfRange flag if target is back within normal range
            const ship = this.viewManager?.getShip();
            const targetComputer = ship?.getSystem('target_computer');
            const maxRange = targetComputer?.range || 150;
            if (targetData.outOfRange && targetData.distance <= maxRange) {
                debug('TARGETING', `Target ${targetData.name} back in range (${targetData.distance.toFixed(1)}km) - clearing outOfRange flag`);
                targetData.outOfRange = false;
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
            // Handle targets that don't have physical objects attached (e.g., Star Charts targets)
            if (targetData.object && targetData.object.position) {
                targetData.distance = this.calculateDistance(this.camera.position, targetData.object.position);
            } else if (targetData.position) {
                // Fallback to stored position if available
                targetData.distance = this.calculateDistance(this.camera.position, targetData.position);
            } else {
                // Last resort: set to a large distance so these targets sort to the end
                targetData.distance = TARGETING_RANGE.INFINITY_DISTANCE;
                debug('TARGETING', `⚠️ Target ${targetData.name} has no position data - setting distance to ${targetData.distance}km`);
            }

            // Clear outOfRange flag if target is back within normal range
            const ship = this.viewManager?.getShip();
            const targetComputer = ship?.getSystem('target_computer');
            const maxRange = targetComputer?.range || 150;
            if (targetData.outOfRange && targetData.distance <= maxRange) {
                debug('TARGETING', `Target ${targetData.name} back in range (${targetData.distance.toFixed(1)}km) - clearing outOfRange flag`);
                targetData.outOfRange = false;
            }
        });

        // Sort by distance
        this.targetObjects.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Set target from long-range scanner
     * @param {Object} targetData - Target data from long-range scanner
     */
    setTargetFromScanner(targetData) {
        if (!targetData) {
            debug('P1', '🎯 Cannot set target from scanner - no target data provided');
            return;
        }

        // console.log(`🎯 Setting target from long-range scanner: ${targetData.name || 'Unknown'}`);
        // console.log(`🎯 Scanner target details:`, {
        //     name: targetData.name,
        //     type: targetData.type,
        //     hasObject: !!targetData.object,
        //     currentTargetCount: this.targetObjects.length,
        //     previousTarget: this.currentTarget?.name,
        //     isManualNavigationSelection: this.isManualNavigationSelection
        // });

        // Set the target directly without cycling through the normal target list
        this.currentTarget = targetData;
        this.isManualNavigationSelection = true; // Mark as navigation selection for protection

        // Find and set the target index in the current target list
        let targetIndex = this.targetObjects.findIndex(target => 
            target.name === targetData.name || 
            target.id === targetData.id ||
            (target.object && target.object.userData && target.object.userData.id === targetData.id)
        );
        
        if (targetIndex !== -1) {
            this.targetIndex = targetIndex;
            // console.log(`🎯 Scanner target index set to ${targetIndex} (existing in list)`);
            
            // Update the existing target data with scanner data to ensure consistency
            this.targetObjects[targetIndex] = { ...this.targetObjects[targetIndex], ...targetData };
        } else {
            // If target is not in the current list, add it and set the index
            this.targetObjects.push(targetData);
            this.targetIndex = this.targetObjects.length - 1;
            // console.log(`🎯 Scanner target added to list at index ${this.targetIndex} (newly added)`);
        }
        
        // FIXED: Reset arrow state for new target to prevent stale hysteresis
        this.lastArrowState = false;
        
        // Force direction arrow update
        this.updateDirectionArrow();
        
        // Ensure target synchronization - force update target display immediately
        // console.log(`🎯 About to call updateTargetDisplay() for scanner target: ${targetData.name}`);
        this.updateTargetDisplay();
        // console.log(`🎯 updateTargetDisplay() completed for scanner target`);

        // Additional safeguard: verify the target was set correctly
        if (this.currentTarget?.name !== targetData.name) {
            debug('P1', `🎯 Scanner target synchronization issue - expected ${targetData.name}, got ${this.currentTarget?.name}`);
            this.currentTarget = targetData;
            this.updateTargetDisplay();
        }

        // Start range monitoring for the scanner target
        this.startRangeMonitoring();
        
        // INSTANT DISCOVERY: Force immediate discovery check to eliminate lag
        const starChartsManager = this.viewManager?.navigationSystemManager?.starChartsManager;
        if (starChartsManager && targetData?.id) {
            starChartsManager.forceDiscoveryCheck(targetData.id);
        }
        
        // Sync with StarfieldManager
        if (this.viewManager?.starfieldManager) {
            this.viewManager.starfieldManager.currentTarget = this.currentTarget?.object || this.currentTarget;
            this.viewManager.starfieldManager.targetIndex = this.targetIndex;
        }
        
        // console.log(`🎯 Scanner target set successfully - protected from auto-switching`);
    }

    /**
     * Cycle to the next or previous target
     * @param {boolean} forward - Whether to cycle forward (true) or backward (false). Default: true
     */
    cycleTarget(forward = true) {
        try {
            debug('TARGETING', `🎯 TAB PRESSED: TargetComputerManager.cycleTarget called (forward=${forward})`);
            
            // Rate-limited target list debug (only show occasionally to reduce spam)
            if (Math.random() < 0.1) {
                debug('TARGETING', `🔍 CURRENT TARGET LIST (${this.targetObjects.length} targets)`);
                this.targetObjects.slice(0, 5).forEach((target, i) => {
                    debug('TARGETING', `  [${i}] ${target.name} - ID: "${target.id}" - Distance: ${target.distance?.toFixed(1)}km`);
                });
            }
        
        // Add waypoints to targeting system before cycling (only if not already added)
        if (!this._waypointsAdded) {
            this.addWaypointsToTargets();
        }
        
        // Debug: Log all conditions that might prevent cycling
        debug('TARGETING', `🎯 TAB: Checking conditions - isDocked: ${this.viewManager?.starfieldManager?.isDocked}, undockCooldown: ${this.viewManager?.starfieldManager?.undockCooldown ? (Date.now() < this.viewManager.starfieldManager.undockCooldown) : false}, preventTargetChanges: ${this.preventTargetChanges}, targetComputerEnabled: ${this.targetComputerEnabled}, targetObjectsLength: ${this.targetObjects?.length || 0}`);
        
        // Prevent cycling targets while docked
        if (this.viewManager?.starfieldManager?.isDocked) {
            debug('TARGETING', `🎯 TAB: Blocked - ship is docked`);
            return;
        }

        // Prevent cycling during undock cooldown
        if (this.viewManager?.starfieldManager?.undockCooldown && Date.now() < this.viewManager.starfieldManager.undockCooldown) {
            debug('TARGETING', `🎯 TAB: Blocked - undock cooldown active`);
            return;
        }

        // Prevent target changes during dummy creation
        if (this.preventTargetChanges) {
            debug('TARGETING', `🎯 TAB: Blocked - preventTargetChanges flag`);
            return;
        }

        if (!this.targetComputerEnabled || this.targetObjects.length === 0) {
            debug('TARGETING', `🎯 TAB: Blocked - not enabled or no targets (enabled: ${this.targetComputerEnabled}, targets: ${this.targetObjects.length})`);
            // console.log(`🎯 Cannot cycle targets - enabled: ${this.targetComputerEnabled}, targets: ${this.targetObjects.length}`);
            return;
        }
        
        debug('TARGETING', '🎯 TAB: All checks passed, proceeding with target cycling');

        // Additional debugging for target cycling issues
        if (this.preventTargetChanges) {
            // console.log(`🎯 Target cycling blocked by preventTargetChanges flag`);
            return;
        }
        
        // console.log(`🎯 Cycling targets - current: ${this.currentTarget?.name}, index: ${this.targetIndex}, total targets: ${this.targetObjects.length}, isManualNav: ${this.isManualNavigationSelection}`);
        // console.log(`🎯 Available targets for cycling:`, this.targetObjects.map(t => t.name));

        // Hide reticle until new target is set
        if (this.targetReticle) {
            this.targetReticle.style.display = 'none';
        }

        // Keep target HUD visible
        this.targetHUD.style.display = 'block';

        // Cycle to next or previous target
        const previousIndex = this.targetIndex;
        const previousTarget = this.currentTarget;
        
        if (this.targetIndex === -1 || !this.currentTarget) {
            this.targetIndex = 0;
        } else {
            if (forward) {
                // Cycle forward (next target)
                this.targetIndex = (this.targetIndex + 1) % this.targetObjects.length;
            } else {
                // Cycle backward (previous target)
                this.targetIndex = (this.targetIndex - 1 + this.targetObjects.length) % this.targetObjects.length;
            }
        }

        // Get the target data directly from our target list
        const targetData = this.targetObjects[this.targetIndex];
        
        // For waypoints, use the targetData itself (which has isWaypoint flag)
        // For other objects, use the object property if it exists
        if (targetData && targetData.isWaypoint) {
            this.currentTarget = targetData; // Use waypoint target data directly
        } else {
            this.currentTarget = targetData.object || targetData; // Store the original object, not the processed target data
        }
        
        // FIXED: Don't clear navigation selection flag during cycling
        // The flag should only clear when user explicitly changes targeting mode,
        // not when cycling through targets (which is part of normal navigation workflow)
        // Preserves manual selection context and enables target list enhancement
        if (previousTarget && targetData) {
            if (previousTarget.name !== targetData.name) {
                // Cycling to a different target - preserve navigation selection flag
                // Only clear generic manual selection flag
                this.isManualSelection = false;
                // console.log(`🎯 Cycling to different target - preserving navigation selection flag`);
            } else if (previousTarget.name === targetData.name && (this.isManualNavigationSelection || this.isManualSelection)) {
                // Cycling back to the same target - preserve the flags
                // console.log(`🎯 Cycling back to same target - preserving flags`);
            }
        }
        // Note: Removed aggressive flag clearing from edge cases - preserve user intent
        
        // Debug target name for troubleshooting
        // Debug target name for troubleshooting (commented out to reduce spam)
        // if (targetData && targetData.ship && targetData.ship.shipName) {
        //     console.log(`Target set: ${targetData.ship.shipName}`);
        // } else if (targetData && targetData.name) {
        //     console.log(`Target set: ${targetData.name}`);
        // } else {
        //     console.log(`Target set: Unknown (missing name data)`, targetData);
        // }
        
        // Sync with ship's TargetComputer system for sub-targeting
        const ship = this.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');
        if (targetComputer && targetComputer.isActive) {
            // For enemy ships, pass the ship instance (has systems). For others, pass the render object
            const isEnemyShip = !!(targetData?.isShip && targetData?.ship);
            let targetForSubTargeting = isEnemyShip ? targetData.ship : (targetData?.object || targetData);

            // Ensure the target object has name and faction information
            if (targetForSubTargeting && !isEnemyShip) {
                // Copy essential information from targetData to the object
                if (!targetForSubTargeting.name && targetData.name) {
                    targetForSubTargeting.name = targetData.name;
                }
                if (!targetForSubTargeting.faction && targetData.faction) {
                    targetForSubTargeting.faction = targetData.faction;
                }
                if (!targetForSubTargeting.diplomacy && targetData.diplomacy) {
                    targetForSubTargeting.diplomacy = targetData.diplomacy;
                }

                // For navigation beacons and other objects, also check userData as fallback
                if (!targetForSubTargeting.name && targetForSubTargeting.userData?.name) {
                    targetForSubTargeting.name = targetForSubTargeting.userData.name;
                }
                if (!targetForSubTargeting.faction && targetForSubTargeting.userData?.faction) {
                    targetForSubTargeting.faction = targetForSubTargeting.userData.faction;
                }
            }

            targetComputer.setTarget(targetForSubTargeting);
        }
        
        // Removed target cycling log to prevent console spam
        // console.log(`🔄 Target cycled: ${previousIndex} → ${this.targetIndex} (${targetData.name})`);
        // console.log(`🎯 Previous target: ${previousTarget?.userData?.ship?.shipName || 'none'}`);
        // console.log(`🎯 New target: ${targetData.name}`);

        // Always clear wireframe before switching targets (covers star wireframe case)
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

        // Also remove any stray power-up overlay that might obscure re-render
        const pu = document.getElementById('powerup-animation');
        if (pu && pu.parentNode) {
            pu.parentNode.removeChild(pu);
        }

        // DISCOVERY FIX: Auto-discover objects when they become the current target
        // This ensures wireframe shows correct shape and color immediately
        const currentTargetData = this.getCurrentTargetData();
        if (currentTargetData && !currentTargetData.isShip) {
            const starChartsManager = this.viewManager?.navigationSystemManager?.starChartsManager;
            if (starChartsManager) {
                const objectId = this.constructStarChartsId(currentTargetData);
                if (objectId && !starChartsManager.isDiscovered(objectId)) {
                    // Auto-discover the object when it becomes the current target
                    starChartsManager.addDiscoveredObject(objectId, 'targeting', 'player');
                    debug('TARGETING', `🔍 Auto-discovered object on targeting: ${objectId} (${currentTargetData.name})`);
                }
            }
        }

        // Create new wireframe and refresh HUD
        debug('TARGETING', `🎯 TAB: About to create wireframe for target: ${this.currentTarget?.name}`);
        
        // Handle waypoint-specific targeting
        if (this.currentTarget && this.currentTarget.isWaypoint) {
            debug('WAYPOINTS', `🎯 Waypoint targeted: ${this.currentTarget.name}`);
            this.createWaypointWireframe();
        } else {
            this.createTargetWireframe();
        }
        
        debug('TARGETING', `🎯 TAB: Wireframe creation completed, wireframe exists: ${!!this.targetWireframe}`);
        this.updateTargetDisplay();
        
        // FIXED: Reset arrow state for new target to prevent stale hysteresis
        this.lastArrowState = false;
        
        // Force direction arrow update after target cycling
        this.updateDirectionArrow();
        
        // Start monitoring the selected target's range (for both manual and automatic cycles)
        this.startRangeMonitoring();
        
        debug('TARGETING', `🎯 TAB: cycleTarget completed - new target: ${this.currentTarget?.name || 'none'} (ID: ${this.currentTarget?.id || 'none'})`);
        
        // Notify Star Charts to update blinking target if it's open
        debug('TARGETING', `🎯 TAB: About to call notifyStarChartsOfTargetChange()`);
        this.notifyStarChartsOfTargetChange();
        debug('TARGETING', `🎯 TAB: Called notifyStarChartsOfTargetChange()`);
        
        // INSTANT DISCOVERY: Force immediate discovery check to eliminate lag
        const starChartsManager = this.viewManager?.navigationSystemManager?.starChartsManager;
        if (starChartsManager && this.currentTarget?.id) {
            starChartsManager.forceDiscoveryCheck(this.currentTarget.id);
        }
        
        } catch (error) {
            debug('P1', `🎯 ERROR in TargetComputerManager.cycleTarget: ${error}`);
            debug('TARGETING', `🎯 ERROR in cycleTarget: ${error.message}`);
        }
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
     */
    getCurrentTargetData() {
        // Debug logging for beacons (much less frequent)
        if (this.currentTarget?.name?.includes('Navigation Beacon') && Math.random() < 0.001) {
            debug('TARGETING', `getCurrentTargetData() called for beacon: ${this.currentTarget?.name}`, {
                targetIndex: this.targetIndex,
                targetObjectsLength: this.targetObjects.length
            });
        }
        
        if (!this.currentTarget) {
            return null;
        }

        // First, check if the current targetIndex is valid and matches currentTarget
        if (this.targetIndex >= 0 && this.targetIndex < this.targetObjects.length) {
            const targetData = this.targetObjects[this.targetIndex];
if (window?.DEBUG_TCM) debug('TARGETING', `🔍 DEBUG: Checking targetIndex ${this.targetIndex}, targetData:`, targetData?.name || 'no name');
            if (targetData) {
                // For targets from addNonPhysicsTargets, the Three.js object is in targetData.object
                // For other targets, the targetData might be the object itself
                const matches = targetData === this.currentTarget ||
                    targetData.object === this.currentTarget ||
                    (targetData.object && targetData.object.uuid === this.currentTarget?.uuid) ||
                    targetData.name === this.currentTarget?.name;
if (window?.DEBUG_TCM) debug('TARGETING', `🔍 DEBUG: Target match check - matches: ${matches}, targetData.name: ${targetData.name}, currentTarget.name: ${this.currentTarget?.name}`);
                if (matches) {
if (window?.DEBUG_TCM) debug('TARGETING', `🔍 DEBUG: Found matching target, processing...`);
                    return this.processTargetData(targetData);
                } else {
if (window?.DEBUG_TCM) debug('INSPECTION', `🔍 DEBUG: Index mismatch detected - finding correct index...`);
                    // Index mismatch detected - find correct index and fix it silently
                    const correctIndex = this.targetObjects.findIndex(target => 
                        target === this.currentTarget ||
                        target.object === this.currentTarget ||
                        (target.object && target.object.uuid === this.currentTarget?.uuid) ||
                        target.name === this.currentTarget?.name
                    );
                    
                    if (correctIndex !== -1) {
                        this.targetIndex = correctIndex;
                        return this.processTargetData(this.targetObjects[correctIndex]);
                    }
                    
// Rate limit debug output to prevent spam
                if (Math.random() < 0.001) {
                    debug('TARGETING', `🔍 getCurrentTargetData: Index ${this.targetIndex} target mismatch - targetData: ${targetData.name}, currentTarget: ${this.currentTarget?.name}, type: ${typeof this.currentTarget}`);
                }
                }
            }
        }

        // If current target is already a target data object, try to find it in the list
        if (this.currentTarget && typeof this.currentTarget === 'object') {
            for (let i = 0; i < this.targetObjects.length; i++) {
                const targetData = this.targetObjects[i];
                if (targetData) {
                    // More robust target matching - check multiple criteria
                    const isExactMatch = targetData === this.currentTarget;
                    const isObjectMatch = targetData.object === this.currentTarget;
                    const isUUIDMatch = targetData.object?.uuid && this.currentTarget.uuid && targetData.object.uuid === this.currentTarget.uuid;
                    const isNameTypeMatch = targetData.name === this.currentTarget.name && targetData.type === this.currentTarget.type;
                    const isIdMatch = targetData.id === this.currentTarget.id;

                    if (isExactMatch || isObjectMatch || isUUIDMatch || isNameTypeMatch || isIdMatch) {
                        // Update the index to match the found target
                        this.targetIndex = i;
                        this.currentTarget = targetData.object || targetData; // Ensure we have the original object, not processed target data
debug('TARGETING', `🔧 Fixed target index mismatch: set to ${i} for target ${targetData.name} (${isExactMatch ? 'exact' : isObjectMatch ? 'object' : isUUIDMatch ? 'uuid' : isIdMatch ? 'ID' : 'name/type'})`);

                        // Process and return the target data
                        const processedData = this.processTargetData(targetData);
if (window?.DEBUG_TCM) debug('TARGETING', `🔍 DEBUG: Returning processed data for ${targetData.name}:`, processedData);
                        return processedData;
                    }
                }
            }
        }

        // If we still can't find the target, it might have been destroyed or removed
        // Don't spam the console - only log occasionally
        const now = Date.now();
        if (!this.lastTargetNotFoundWarning || (now - this.lastTargetNotFoundWarning) > 5000) { // Only warn every 5 seconds
debug('TARGETING', `⚠️ Current target not found in target list - may have been destroyed or updated`);
            this.lastTargetNotFoundWarning = now;
        }
        
        // For manual navigation selections (Star Charts/LRS), don't clear the target - return it directly
        if (this.isManualNavigationSelection && this.currentTarget && this.currentTarget.name && this.currentTarget.type) {
            // Rate limit debug output to prevent spam
            if (Math.random() < 0.001) {
                debug('TARGETING', `🎯 Using scanner target data directly: ${this.currentTarget.name}`);
            }
            return this.processTargetData(this.currentTarget);
        }
        
        // For manual selections (including Star Charts), try to use the current target directly
        if (this.isManualSelection && this.currentTarget && this.currentTarget.name) {
debug('TARGETING', `🎯 Using manual selection target data directly: ${this.currentTarget.name}`, this.currentTarget);
            return this.processTargetData(this.currentTarget);
        }
        
        // SPECIAL CASE: Handle virtual waypoints that may not be in targetObjects yet
        if (this.currentTarget && (this.currentTarget.isWaypoint || this.currentTarget.isVirtual || this.currentTarget.type === 'waypoint')) {
            debug('WAYPOINTS', `🎯 Using virtual waypoint target data directly: ${this.currentTarget.name}`);
            return this.processTargetData(this.currentTarget);
        }
        
        // For Star Charts objects that may have lost their 3D position, try to preserve them
        // Check if this is a Star Charts object (has A0_ ID or is discovered)
        if (this.currentTarget && this.currentTarget.name) {
            const hasStarChartsId = this.currentTarget.id && this.currentTarget.id.toString().startsWith('A0_');
            const isDiscoveredObject = this.isObjectDiscovered(this.currentTarget);
            
            if (hasStarChartsId || isDiscoveredObject) {
                debug('TARGETING', `🎯 Preserving Star Charts object without 3D position: ${this.currentTarget.name}`);
                return this.processTargetData(this.currentTarget);
            }
        }
        
        // Clear the invalid target to prevent repeated warnings (only for non-scanner/non-manual/non-StarCharts targets)
if (window?.DEBUG_TCM) debug('P1', `🔍 DEBUG: getCurrentTargetData() - clearing invalid target and returning null`);
        this.clearCurrentTarget();
        return null;
    }

    /**
     * UNIFIED ID NORMALIZATION: Convert any target ID to proper sector-prefixed format
     * This is the SINGLE SOURCE OF TRUTH for target ID generation
     */
    normalizeTargetId(targetData, fallbackKey = null) {
        if (!targetData) return null;
        
        const currentSector = this.solarSystemManager?.currentSector || 'A0';
        
        // If target already has a proper sector-prefixed ID, return it
        if (targetData.id && typeof targetData.id === 'string' && targetData.id.match(/^[A-Z]\d+_/)) {
            return targetData.id;
        }
        
        // Generate sector-prefixed ID based on name and type
        if (targetData.name) {
            const cleanName = targetData.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
            let normalizedName;
            
            // Special handling for common celestial bodies
            switch (cleanName.toLowerCase()) {
                case 'terra prime':
                    normalizedName = 'terra_prime';
                    break;
                case 'luna':
                    normalizedName = 'luna';
                    break;
                case 'europa':
                    normalizedName = 'europa';
                    break;
                case 'sol':
                    normalizedName = 'star';
                    break;
                default:
                    normalizedName = cleanName.toLowerCase()
                        .replace(/\s+/g, '_')
                        .replace(/[^a-z0-9_]/g, '');
                    break;
            }
            
            return `${currentSector}_${normalizedName}`;
        }
        
        // Fallback using key if provided
        if (fallbackKey) {
            const normalizedKey = fallbackKey.replace(/^(station_|planet_|moon_|star_)/, '');
            return `${currentSector}_${normalizedKey}`;
        }
        
        return null;
    }

    /**
     * Construct object ID for discovery system compatibility
     * Uses the existing normalizeTargetId method for consistency
     */
    constructObjectId(targetData) {
        return this.normalizeTargetId(targetData);
    }

    /**
     * Construct a proper sector-prefixed ID from target data (DEPRECATED - use normalizeTargetId)
     */
    constructStarChartsId(targetData) {
        if (!targetData) return null;
        
        // Get current sector from solarSystemManager
        const currentSector = this.solarSystemManager?.currentSector || 'A0';
        const sectorPrefix = `${currentSector}_`;
        
        // If already has proper sector prefix, return it
        let objectId = targetData.id;
        if (objectId && objectId.toString().startsWith(sectorPrefix)) {
            return objectId;
        }
        
        if (!targetData.name) return null;
        
        // Clean the name by removing faction suffixes like "(friendly)", "(neutral)", etc.
        const cleanName = targetData.name.replace(/\s*\([^)]*\)\s*$/, '').trim();
        
        // Special handling for common celestial bodies
        let normalizedName;
        switch (cleanName.toLowerCase()) {
            case 'terra prime':
                normalizedName = 'terra_prime';
                break;
            case 'luna':
                normalizedName = 'luna';
                break;
            case 'europa':
                normalizedName = 'europa';
                break;
            case 'sol':
                normalizedName = 'star';
                break;
            default:
                // Construct ID from cleaned name for Star Charts compatibility
                // Remove invalid characters like # and replace spaces with underscores
                normalizedName = cleanName.toLowerCase()
                    .replace(/\s+/g, '_')
                    .replace(/[^a-z0-9_]/g, ''); // Remove any non-alphanumeric characters except underscore
                break;
        }
        
        // Prevent double sector prefixes
        const lowerPrefix = sectorPrefix.toLowerCase();
        if (normalizedName.startsWith(lowerPrefix)) {
            return typeof normalizedName === 'string' ? normalizedName.replace(new RegExp(`^${lowerPrefix}`, 'i'), sectorPrefix) : normalizedName;
        } else {
            return `${sectorPrefix}${normalizedName}`;
        }
        
        // Notify Star Charts to update blinking target if it's open
        debug('TARGETING', `🎯 updateTargetDisplay: About to call notifyStarChartsOfTargetChange()`);
        this.notifyStarChartsOfTargetChange();
        debug('TARGETING', `🎯 updateTargetDisplay: Called notifyStarChartsOfTargetChange()`);
    }

    /**
     * Check if an object is discovered using StarChartsManager
     */
    isObjectDiscovered(targetData) {
        // Try to get StarChartsManager through viewManager
        const starChartsManager = this.viewManager?.navigationSystemManager?.starChartsManager;
        if (!starChartsManager) {
            // If no StarChartsManager available, assume discovered (fallback behavior)
            return true;
        }

        // Use consolidated ID construction method
        const objectId = this.constructStarChartsId(targetData);
        if (!objectId) {
            // If we can't determine object ID, assume discovered
            return true;
        }
        
        // Check discovery status - ALWAYS get fresh status, don't rely on cache
        const isDiscovered = starChartsManager.isDiscovered(objectId);
        
        // REMOVED: Recursive wireframe recreation that caused infinite loop
        // The wireframe color update will be handled by the existing updateTargetDisplay logic
        
        // Only log discovery status changes (with heavy rate limiting to prevent spam)
        if (!this._lastDiscoveryStatus) this._lastDiscoveryStatus = {};
        if (this._lastDiscoveryStatus[objectId] !== isDiscovered) {
            // Only log 0.1% of status changes to prevent spam
            if (Math.random() < 0.001) {
                debug('TARGETING', `🔍 Discovery status changed: ${objectId} -> ${isDiscovered}`);
            }
            this._lastDiscoveryStatus[objectId] = isDiscovered;
            
            // Clean up old entries to prevent memory leak (keep only last 100 entries)
            const entries = Object.keys(this._lastDiscoveryStatus);
            if (entries.length > 100) {
                const toDelete = entries.slice(0, entries.length - 100);
                toDelete.forEach(key => delete this._lastDiscoveryStatus[key]);
            }
        }
        
        return isDiscovered;
    }

    /**
     * Process target data and return standardized format
     */
    processTargetData(targetData) {
        if (!targetData) {
            return null;
        }

        // Debug logging for beacons (much less frequent)
        if (targetData.name?.includes('Navigation Beacon') && Math.random() < 0.001) {
            debug('TARGETING', `processTargetData for beacon: ${targetData.name}`, {
                type: targetData.type,
                discovered: targetData.discovered,
                diplomacy: targetData.diplomacy,
                faction: targetData.faction,
                _isUndiscovered: targetData._isUndiscovered
            });
        }

        // For navigation beacons, check actual discovery status and apply appropriate properties
        if (targetData.type === 'navigation_beacon') {
            const actuallyDiscovered = this.isObjectDiscovered(targetData);
            if (!actuallyDiscovered) {
                // Beacon is undiscovered - apply unknown properties
                if (targetData.diplomacy !== 'unknown' || targetData.faction !== 'Unknown') {
                    try {
                        targetData.discovered = false;
                        targetData.diplomacy = 'unknown';
                        targetData.faction = 'Unknown';
                        debug('TARGETING', `Applied undiscovered properties to beacon: ${targetData.name}`);
                    } catch (e) {
                        // Ignore readonly property errors
                        if (e.message && !e.message.includes('readonly')) {
                            debug('P1', `🎯 Error setting undiscovered beacon properties: ${e}`);
                        }
                    }
                }
            } else {
                // Beacon is discovered - ensure it has proper faction properties
                try {
                    targetData.discovered = true;
                    // Only set neutral faction if no faction is already set
                    if (!targetData.faction || targetData.faction === 'Unknown') {
                        targetData.faction = 'Neutral';
                        targetData.diplomacy = 'neutral';
                        debug('TARGETING', `Applied discovered properties to beacon: ${targetData.name} (neutral faction)`);
                    }
                } catch (e) {
                    // Ignore readonly property errors
                    if (e.message && !e.message.includes('readonly')) {
                        debug('P1', `🎯 Error setting discovered beacon properties: ${e}`);
                    }
                }
            }
        }

        // CRITICAL: Ensure target data has proper Star Charts ID for consistent discovery checks
        // This MUST happen before any discovery status checks
        const constructedId = this.constructStarChartsId(targetData);
        if (constructedId && (!targetData.id || !targetData.id.toString().startsWith('A0_'))) {
            // Update the target data to use the proper Star Charts ID
            try {
                targetData.id = constructedId;
            } catch (e) {
                // Ignore readonly property errors
                if (e.message && !e.message.includes('readonly')) {
                    debug('P1', `🎯 Error setting target ID: ${e}`);
                }
            }
        }
        
        // Check discovery status for non-ship objects (now with proper ID)
        // Use same position validation logic as display update for consistency
        const hasValidPositionForStar = this.getTargetPosition(targetData) !== null;
        const isDiscovered = targetData.isShip || (this.isObjectDiscovered(targetData) && hasValidPositionForStar);

        // SPECIAL CASE: Stars should always show as neutral when discovered
        if (targetData.type === 'star' && isDiscovered) {
            try {
                targetData.discovered = true;
                targetData.diplomacy = 'neutral';
                targetData.faction = 'Neutral';
                // Rate limit Sol debug spam to prevent console flooding
                if (targetData.name === 'Sol' && Math.random() < 0.0001) {
                    debug('TARGETING', `Applied discovered properties to star: ${targetData.name} (neutral faction)`);
                }
            } catch (e) {
                // Ignore readonly property errors
                if (e.message && !e.message.includes('readonly')) {
                    debug('P1', `🎯 Error setting star properties: ${e}`);
                }
            }
        }

        // SPECIAL CASE: Handle waypoints first (before ship check)
        if (targetData.type === 'waypoint' || targetData.isWaypoint || targetData.isVirtual) {
            debug('WAYPOINTS', `🎯 Processing waypoint in processTargetData: ${targetData.name}`);
            return {
                object: this.currentTarget,
                name: targetData.name || 'Mission Waypoint',
                type: 'waypoint',
                isShip: false,
                isWaypoint: true,
                isVirtual: targetData.isVirtual || true,
                distance: targetData.distance || 0,
                faction: 'waypoint',
                diplomacy: 'waypoint',
                isDiscovered: true, // Waypoints are always "discovered" since they're mission targets
                ...targetData // Include all original properties
            };
        }

        // Check if this is a ship (either 'ship' or 'enemy_ship' type, or has isShip flag)
        if (targetData.type === 'ship' || targetData.type === 'enemy_ship' || targetData.isShip) {
            // Ensure we get the actual ship instance - try multiple sources
            let shipInstance = targetData.ship;

            // If no ship in targetData, try to get it from the object
            if (!shipInstance && targetData.object?.userData?.ship) {
                shipInstance = targetData.object.userData.ship;
            }

            // If still no ship, try from currentTarget (which should be the original mesh)
            if (!shipInstance && this.currentTarget?.userData?.ship) {
                shipInstance = this.currentTarget.userData.ship;
            }

            // For target dummies, ensure the ship instance is preserved
            if (!shipInstance && targetData.name?.includes('Target Dummy')) {
                // Try to find the ship from the target dummy list
                if (this.viewManager?.starfieldManager?.targetDummyShips) {
                    shipInstance = this.viewManager.starfieldManager.targetDummyShips.find(
                        dummy => dummy.shipName === targetData.name
                    );
                }
            }
            
            return {
                object: this.currentTarget,
                name: targetData.name || shipInstance?.shipName || this.currentTarget?.shipName || 'Enemy Ship',
                type: targetData.type || 'enemy_ship',
                isShip: true,
                ship: shipInstance || targetData.ship, // Don't fall back to this.currentTarget as it's the target data object
                distance: targetData.distance,
                isMoon: targetData.isMoon || false,
                diplomacy: targetData.diplomacy || shipInstance?.diplomacy,
                faction: targetData.faction || shipInstance?.faction || targetData.diplomacy || shipInstance?.diplomacy,
                isDiscovered: isDiscovered,
                ...targetData // Include all original properties
            };
        } else {
            // For non-ship targets, prefer the data we already have from target list
            // If targetData already has the info (from addNonPhysicsTargets), use it
            if (targetData.type && targetData.type !== 'unknown') {
                return {
                    object: this.currentTarget,
                    name: isDiscovered ? (targetData.name || 'Unknown') : 'Unknown',
                    type: targetData.type,
                    isShip: false,
                    distance: targetData.distance,
                    isMoon: targetData.isMoon || false,
                    isSpaceStation: targetData.isSpaceStation,
                    faction: isDiscovered ? targetData.faction : 'unknown',
                    diplomacy: isDiscovered ? targetData.diplomacy : 'unknown',
                    isDiscovered: isDiscovered,
                    ...targetData
                };
            } else if (targetData.name && targetData.name !== 'Unknown') {
                // For targets with valid names (like from Star Charts) but no type, 
                // use the target data directly and avoid falling back to Sol
debug('TARGETING', `🎯 Processing target with name but no type: ${targetData.name}`);
                return {
                    object: this.currentTarget,
                    name: isDiscovered ? targetData.name : 'Unknown',
                    type: targetData.type || 'celestial_body', // Default type for celestial objects
                    isShip: false,
                    distance: targetData.distance,
                    isMoon: targetData.isMoon || false,
                    isSpaceStation: targetData.isSpaceStation,
                    faction: isDiscovered ? targetData.faction : 'unknown',
                    diplomacy: isDiscovered ? targetData.diplomacy : 'unknown',
                    isDiscovered: isDiscovered,
                    ...targetData
                };
            } else {
                // Fallback to getCelestialBodyInfo only if we have no useful target data
debug('TARGETING', `🎯 Falling back to getCelestialBodyInfo for target:`, targetData);
                const info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
                return {
                    object: this.currentTarget,
                    name: isDiscovered ? (info?.name || targetData.name || 'Unknown') : 'Unknown',
                    type: info?.type || targetData.type || 'unknown',
                    isShip: false,
                    distance: targetData.distance,
                    isMoon: targetData.isMoon || false,
                    faction: isDiscovered ? info?.faction : 'unknown',
                    diplomacy: isDiscovered ? info?.diplomacy : 'unknown',
                    isDiscovered: isDiscovered,
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
        // Use unified DistanceCalculator for consistent results across all systems
        return DistanceCalculator.calculate(point1, point2);
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
        
        // Check if this is an enemy ship using consolidated diplomacy logic
        if (currentTargetData.isShip && currentTargetData.ship) {
            // Use consolidated diplomacy logic instead of assuming all ships are enemy
            const diplomacy = this.getTargetDiplomacy(currentTargetData);
            isEnemyShip = diplomacy === 'enemy';
            info = {
                type: 'enemy_ship',
                diplomacy: diplomacy,
                name: currentTargetData.ship.shipName,
                shipType: currentTargetData.ship.shipType
            };
            targetName = info.name || (isEnemyShip ? 'Enemy Ship' : 'Ship');
            debug('TARGETING', `🎯 RETICLE: Ship target: ${targetName}, diplomacy: ${diplomacy}, isEnemyShip: ${isEnemyShip}`);
        } else {
            // Get celestial body info - need to pass the actual Three.js object
            const targetObject = this.currentTarget?.object || this.currentTarget;
            const bodyInfo = this.solarSystemManager.getCelestialBodyInfo(targetObject) || {};
            // Prefer Star Charts/target list data for name/type to avoid mismatches
            const preferredName = currentTargetData?.name || bodyInfo.name;
            const preferredType = currentTargetData?.type || bodyInfo.type;
            info = { ...bodyInfo, name: preferredName, type: preferredType };
            targetName = preferredName || 'Unknown Target';
            // console.log(`🎯 DEBUG: updateReticleTargetInfo() - Target: ${targetName}, type: ${preferredType || 'unknown'}`);
        }
        
        // Check if object is discovered BEFORE setting colors and final name
        // SPECIAL CASE: Waypoints are always considered "discovered" since they're mission targets
        const isWaypointForName = currentTargetData?.type === 'waypoint' || currentTargetData?.isWaypoint || currentTargetData?.isVirtual;
        const isDiscovered = currentTargetData?.isShip || isWaypointForName || this.isObjectDiscovered(currentTargetData);
        
        // Override target name for undiscovered objects (but not waypoints)
        if (!isDiscovered && !currentTargetData.isShip && !isWaypointForName) {
            targetName = 'Unknown';
            // Only log once per target when showing as unknown
            if (this._lastUnknownTarget !== this.currentTarget?.name) {
                debug('TARGETING', `🎯 RETICLE: Undiscovered object "${this.currentTarget?.name}" showing as "Unknown"`);
                this._lastUnknownTarget = this.currentTarget?.name;
            }
        } else if (isWaypointForName) {
            // Ensure waypoints show their proper name
            targetName = currentTargetData?.name || 'Mission Waypoint';
            debug('WAYPOINTS', `🎨 Using waypoint name for reticle: ${targetName}`);
        }
        
        // Determine reticle color based on discovery status and diplomacy
        let reticleColor = '#44ffff'; // Default teal for unknown
        
        // SPECIAL CASE: Handle waypoints first (always magenta)
        if (currentTargetData?.type === 'waypoint' || currentTargetData?.isWaypoint || currentTargetData?.isVirtual) {
            reticleColor = '#ff00ff'; // Magenta for waypoints
            debug('WAYPOINTS', `🎨 Using magenta reticle color for waypoint: ${currentTargetData?.name}`);
        } else if (!isDiscovered) {
            // Undiscovered objects use unknown faction color (cyan)
            reticleColor = '#44ffff'; // Cyan for unknown/undiscovered
        } else {
            // Use consolidated diplomacy logic for discovered objects
            const diplomacyStatus = this.getTargetDiplomacy(currentTargetData);
            
            // Target dummies should use standard faction colors (red for enemy/hostile)
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
            } else if (diplomacyStatus?.toLowerCase() === 'unknown') {
                reticleColor = '#44ffff'; // Cyan for unknown faction
            }
        }

        // Update name display
        this.targetNameDisplay.textContent = targetName;
        this.targetNameDisplay.style.color = reticleColor;
        this.targetNameDisplay.style.textShadow = `0 0 4px ${reticleColor}`;
        this.targetNameDisplay.style.display = 'block';

        // Update distance display - check if target is flagged as out of range
        const targetData = this.getCurrentTargetData();
        
        // Clear outOfRange flag if target is back within normal range
        if (targetData?.outOfRange && distance <= 150) {
            debug('TARGETING', `Target ${targetData.name} back in range (${distance.toFixed(1)}km) - clearing outOfRange flag`);
            targetData.outOfRange = false;
            
            // Also clear the flag in the original target object in targetObjects array
            if (this.targetIndex >= 0 && this.targetIndex < this.targetObjects.length) {
                const originalTargetData = this.targetObjects[this.targetIndex];
                if (originalTargetData) {
                    originalTargetData.outOfRange = false;
                }
            }
        }
        
        this.targetDistanceDisplay.textContent = targetData?.outOfRange ? 'Out of Range' : this.formatDistance(distance);
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
        
        // Get target data and discovery status once
        const currentTargetData = this.getCurrentTargetData();
        const isDiscovered = currentTargetData?.isShip || this.isObjectDiscovered(currentTargetData);
        
        if (!targetPos) {
            // DEBUG: Log why position lookup failed for arrows
            debug('P1', `🎯 ARROW: No position for "${this.currentTarget?.name || 'unknown'}"`, {
                isDiscovered,
                targetType: this.currentTarget?.type,
                hasPosition: !!this.currentTarget?.position,
                positionType: typeof this.currentTarget?.position,
                hasObjectPosition: !!this.currentTarget?.object?.position
            });
            this.hideAllDirectionArrows();
            return;
        }
        
        // DEBUG: Log arrow state for undiscovered targets (less verbose)
        if (!isDiscovered && (!this.lastArrowSuccessLog || Date.now() - this.lastArrowSuccessLog > 3000)) {
            // We'll log the full details after determining arrow visibility
            this.lastArrowSuccessLog = Date.now();
            this.debugArrowNextUpdate = true;
        }

        // Get target's world position relative to camera
        const targetPosition = targetPos.clone();
        const screenPosition = targetPosition.clone().project(this.camera);
        
        // Check if target is off screen or behind camera
        // Use 0.95 threshold for better edge detection, and check depth
        const isOffScreen = Math.abs(screenPosition.x) > 0.95 || 
                           Math.abs(screenPosition.y) > 0.95 || 
                           screenPosition.z > 1.0; // Behind camera

        // Add hysteresis to prevent flickering at screen edges
        // Tighter threshold (0.92 vs 0.95 = 3% gap) for faster arrow hiding
        // FIXED: Only initialize if null/undefined, not when false
        if (this.lastArrowState == null) this.lastArrowState = false;
        const shouldShowArrow = isOffScreen || (this.lastArrowState && (
            Math.abs(screenPosition.x) > 0.92 || 
            Math.abs(screenPosition.y) > 0.92 || 
            screenPosition.z > 1.0
        ));
        
        this.lastArrowState = shouldShowArrow;

        if (shouldShowArrow) {
            // Get camera's view direction and relative position
            const cameraDirection = new this.THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            const relativePosition = targetPosition.clone().sub(this.camera.position);
            
            // Get camera's right and up vectors
            const cameraRight = new this.THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
            const cameraUp = new this.THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
            
            // Project relative position onto camera's right and up vectors
            const rightComponent = relativePosition.dot(cameraRight);
            const upComponent = relativePosition.dot(cameraUp);

            // Get target info for color using consolidated diplomacy logic
            const currentTargetData = this.getCurrentTargetData();
            let arrowColor = '#44ffff'; // Default teal
            
            // SPECIAL CASE: Handle waypoints first (check both target data and current target)
            const isWaypointFromData = currentTargetData?.type === 'waypoint' || currentTargetData?.isWaypoint || currentTargetData?.isVirtual;
            const isWaypointFromTarget = this.currentTarget?.type === 'waypoint' || this.currentTarget?.isWaypoint || this.currentTarget?.isVirtual;
            
            let diplomacy = 'unknown';
            if (isWaypointFromData || isWaypointFromTarget) {
                arrowColor = '#ff00ff'; // Magenta for waypoints
                diplomacy = 'waypoint';
            } else if (currentTargetData) {
                diplomacy = this.getTargetDiplomacy(currentTargetData);
                if (diplomacy === 'enemy') {
                    arrowColor = '#ff3333';
                } else if (diplomacy === 'friendly') {
                    arrowColor = '#00ff41';
                } else if (diplomacy === 'neutral') {
                    arrowColor = '#ffff00';
                } else if (diplomacy === 'unknown') {
                    arrowColor = '#44ffff'; // Teal for unknown/undiscovered
                }
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
                // Position arrow at edge of screen - clear conflicting properties first
                arrow.style.left = '';
                arrow.style.right = '';
                arrow.style.top = '';
                arrow.style.bottom = '';
                
                if (primaryDirection === 'top') {
                    arrow.style.left = '50%';
                    arrow.style.top = '20px';
                    arrow.style.transform = 'translateX(-50%)';
                } else if (primaryDirection === 'bottom') {
                    arrow.style.left = '50%';
                    arrow.style.top = (window.innerHeight - 20 - 19) + 'px'; // viewport height - margin - arrow height
                    arrow.style.transform = 'translateX(-50%)';
                } else if (primaryDirection === 'left') {
                    arrow.style.left = '20px';
                    arrow.style.top = '50%';
                    arrow.style.transform = 'translateY(-50%)';
                } else if (primaryDirection === 'right') {
                    arrow.style.left = (window.innerWidth - 20 - 19) + 'px'; // viewport width - margin - arrow width
                    arrow.style.top = '50%';
                    arrow.style.transform = 'translateY(-50%)';
                }

                // Update arrow color for the visible border - need to update the child element
                const childTriangle = arrow.firstElementChild;
                if (childTriangle) {
                    // DEBUG: Log color update for unknown targets
                    if (diplomacy === 'unknown' && (!this.lastColorUpdateLog || Date.now() - this.lastColorUpdateLog > 2000)) {
                        debug('TARGETING', `🎯 ARROW COLOR: Setting ${primaryDirection} arrow to ${arrowColor} for ${this.currentTarget?.name} (diplomacy: ${diplomacy})`);
                        this.lastColorUpdateLog = Date.now();
                    }
                    
                    // Update ONLY the color, preserving widths and solid style from original creation
                    if (primaryDirection === 'top') {
                        childTriangle.style.borderBottomColor = arrowColor;
                    } else if (primaryDirection === 'bottom') {
                        childTriangle.style.borderTopColor = arrowColor;
                    } else if (primaryDirection === 'left') {
                        childTriangle.style.borderRightColor = arrowColor;
                    } else if (primaryDirection === 'right') {
                        childTriangle.style.borderLeftColor = arrowColor;
                    }
                    
                    // DEBUG: Verify ALL border colors AND WIDTHS for unknown targets
                    if (diplomacy === 'unknown' && (!this.lastColorVerifyLog || Date.now() - this.lastColorVerifyLog > 2000)) {
                        debug('TARGETING', `🎯 ARROW BORDERS (${primaryDirection}): verified for ${this.currentTarget?.name}`);
                        this.lastColorVerifyLog = Date.now();
                    }
                }
                
                // CRITICAL: Use 'flex' not 'block' to maintain triangle centering
                arrow.style.display = 'flex';
                
                // DEBUG: Log arrow container position and visibility for unknown targets
                if (diplomacy === 'unknown' && (!this.lastArrowContainerLog || Date.now() - this.lastArrowContainerLog > 2000)) {
                    debug('TARGETING', `🎯 ARROW CONTAINER (${primaryDirection}): display=${arrow.style.display}, pos=(${arrow.style.left}, ${arrow.style.top})`);
                    this.lastArrowContainerLog = Date.now();
                }
                
                // DEBUG: Log arrow display details for undiscovered targets
                if (this.debugArrowNextUpdate) {
                    debug('TARGETING', `🎯 ARROW: Displaying ${primaryDirection} arrow for ${this.currentTarget?.name} (discovered: ${isDiscovered}, diplomacy: ${diplomacy}, color: ${arrowColor})`);
                    this.debugArrowNextUpdate = false;
                }
                
                // Hide other arrows
                Object.keys(this.directionArrows).forEach(dir => {
                    if (dir !== primaryDirection) {
                        this.directionArrows[dir].style.display = 'none';
                    }
                });
            }
        } else {
            // Target is on screen, hide all arrows
            if (this.debugArrowNextUpdate) {
                debug('TARGETING', `🎯 ARROW: Target on screen, hiding arrows for ${this.currentTarget?.name} (discovered: ${isDiscovered})`);
                this.debugArrowNextUpdate = false;
            }
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
        // FIXED: Reset arrow state to prevent stale hysteresis on next target
        this.lastArrowState = false;
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
            debug('P1', `Error creating target outline: ${error}`);
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
     * @param {string} objectId - The ID of the object to target
     */
    setTargetById(objectId) {
        debug('TARGETING', `🎯 setTargetById called with: ${objectId}`);
        debug('TARGETING', `🎯 setTargetById call stack:`, new Error().stack);
        
        if (!objectId) {
            debug('P1', '🎯 setTargetById: No object ID provided');
            return false;
        }

        // Normalize A0_ prefix case to avoid casing mismatches
        const normalizedId = typeof objectId === 'string' ? objectId.replace(/^a0_/i, 'A0_') : objectId;

debug('TARGETING', `🎯 Setting target by ID: ${normalizedId}, targetObjects.length: ${this.targetObjects.length}`);
        
        // Debug: Log all target IDs for comparison
        debug('TARGETING', `🎯 All target IDs in list:`, this.targetObjects.map((t, i) => `[${i}] ${t.name}: "${t.id}"`));
        
        if (this.targetObjects.length === 0) {
            debug('TARGETING', `🎯 WARNING: targetObjects array is empty! No targets available for lookup.`);
        }

        for (let i = 0; i < this.targetObjects.length; i++) {
            const target = this.targetObjects[i];

            const userDataId = target?.object?.userData?.id;
            const directIdMatch = (userDataId && userDataId === normalizedId) || (target.id && target.id === normalizedId);

            // Fuzzy matches are last resort only
            const nameNormalized = target.name?.toLowerCase().replace(/\s+/g, '_');
            const fuzzyMatch = (target.name === normalizedId) || (nameNormalized === normalizedId) || (target?.object?.name === normalizedId);

            const matchesId = directIdMatch || (!directIdMatch && fuzzyMatch);

debug('TARGETING', `🎯 Checking target ${i}: ${target.name} (id: ${target.id || 'n/a'}, userData.id: ${userDataId || 'n/a'}) - directMatch: ${!!directIdMatch}, fuzzyMatch: ${!!fuzzyMatch}`);

            if (matchesId) {
                this.targetIndex = i;
                // Prefer the actual Three.js object when available for accurate info lookups
                this.currentTarget = target.object || target;

                // Mark as manual navigation selection to prevent automatic override
                this.isManualSelection = true;
                this.isManualNavigationSelection = true;
                
                // Update ship's target computer system (same as cycleTarget does)
                // This ensures subsystems are properly cleared when switching to unknown objects
                const ship = this.viewManager?.getShip();
                const targetComputer = ship?.getSystem('target_computer');
                
                if (targetComputer && targetComputer.setTarget) {
                    // Prepare target data for subsystem targeting (same logic as cycleTarget)
                    let targetForSubTargeting = this.currentTarget;
                    
                    if (targetForSubTargeting && typeof targetForSubTargeting === 'object') {
                        // Ensure target has required properties for subsystem targeting
                        if (!targetForSubTargeting.name && target.name) {
                            targetForSubTargeting.name = target.name;
                        }
                        if (!targetForSubTargeting.faction && target.faction) {
                            targetForSubTargeting.faction = target.faction;
                        }
                        // For navigation beacons and other objects, also check userData as fallback
                        if (!targetForSubTargeting.name && targetForSubTargeting.userData?.name) {
                            targetForSubTargeting.name = targetForSubTargeting.userData.name;
                        }
                        if (!targetForSubTargeting.faction && targetForSubTargeting.userData?.faction) {
                            targetForSubTargeting.faction = targetForSubTargeting.userData.faction;
                        }
                    }

                    // Update ship's target computer system - this clears subsystems for unknown objects
                    targetComputer.setTarget(targetForSubTargeting);
                    
                    // Force UI refresh to ensure subsystem clearing is reflected in display
                    if (this.updateTargetDisplay) {
                        this.updateTargetDisplay();
                    }
                    if (this.updateReticleTargetInfo) {
                        this.updateReticleTargetInfo();
                    }
                    
                    // Delayed refresh to override any conflicting updates
                    setTimeout(() => {
                        if (this.updateTargetDisplay) {
                            this.updateTargetDisplay();
                        }
                        if (this.updateReticleTargetInfo) {
                            this.updateReticleTargetInfo();
                        }
                    }, 100);
                }
                
                debug('TARGETING', `🎯 setTargetById: Target found and set, about to call updateTargetDisplay`);

                // Force immediate HUD refresh
                // If selected target lacks a Three.js object, attempt to resolve it now
                if (!this.currentTarget || !this.currentTarget.position) {
                    try {
                        const vm = this.viewManager || window.viewManager;
                        const ssm = this.solarSystemManager || vm?.solarSystemManager || window.solarSystemManager;
                        const sfm = vm?.starfieldManager || window.starfieldManager;
                        const normalizedIdForLookup = normalizedId;

                        let resolved = null;
                        if (target.type === 'navigation_beacon' && sfm?.navigationBeacons) {
                            resolved = sfm.navigationBeacons.find(b => b?.userData?.id === normalizedIdForLookup) ||
                                       sfm.navigationBeacons.find(b => (b?.userData?.name || b?.name) === target.name);
                        }
                        if (!resolved && ssm?.celestialBodies && typeof ssm.celestialBodies.get === 'function') {
                            resolved = ssm.celestialBodies.get(normalizedIdForLookup) ||
                                       ssm.celestialBodies.get(`beacon_${normalizedIdForLookup}`) ||
                                       ssm.celestialBodies.get(`station_${target.name?.toLowerCase()?.replace(/\s+/g, '_')}`);
                        }
                        if (resolved) {
                            this.currentTarget = resolved;
                            // Update the target object reference in our list as well
                            this.targetObjects[i] = { ...target, object: resolved, position: resolved.position };
                        }
                    } catch (e) {
                        // non-fatal
                    }
                }

                // Clear existing wireframe before creating new one (same as cycleTarget does)
        debug('TARGETING', `🎯 TARGET_SWITCH: Clearing existing wireframe`);
                if (this.targetWireframe) {
                    debug('INSPECTION', `🔍 Clearing existing wireframe: ${this.targetWireframe.type || 'unknown type'}`);
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
                    debug('INSPECTION', `🔍 Wireframe cleared successfully`);
                } else {
                    debug('INSPECTION', `🔍 No existing wireframe to clear`);
                }

                // Create new wireframe for the selected target
                this.createTargetWireframe();
                debug('TARGETING', `🎯 setTargetById: About to call updateTargetDisplay()`);
                this.updateTargetDisplay();
                debug('TARGETING', `🎯 setTargetById: Called updateTargetDisplay()`);
                this.updateReticleTargetInfo();

                // INSTANT DISCOVERY: Force immediate discovery check to eliminate lag
                const starChartsManager = this.viewManager?.navigationSystemManager?.starChartsManager;
                if (starChartsManager && normalizedId) {
                    starChartsManager.forceDiscoveryCheck(normalizedId);
                }

debug('TARGETING', `🎯 Star Charts: Target set to ${target.name} (ID: ${normalizedId}) at index ${i}`);
                return true;
            }
        }

        debug('P1', `🎯 Target not found by ID: ${normalizedId}`);
        debug('TARGETING', `🎯 Available targets:`, this.targetObjects.map(t => `${t.name} (${t.id || t?.object?.userData?.id || 'no-id'})`));

        // FALLBACK: Try to find by name if ID lookup fails
        // This handles cases where objects have names but no IDs
        const objectName = normalizedId.replace(/^A0_/, '').replace(/_/g, ' ');
        debug('TARGETING', `🎯 FALLBACK: Attempting name-based lookup for "${objectName}"`);

        // Log all available target names for debugging
        const availableNames = this.targetObjects.map(t => t.name).filter(n => n);
        debug('TARGETING', `🎯 FALLBACK: Available target names: ${availableNames.join(', ')}`);

        for (let i = 0; i < this.targetObjects.length; i++) {
            const target = this.targetObjects[i];

            // Try multiple matching strategies
            let nameMatch = false;
            const targetName = target.name;

            if (!targetName) continue;

            // Exact match
            if (targetName.toLowerCase() === objectName.toLowerCase()) {
                nameMatch = true;
                debug('TARGETING', `🎯 FALLBACK: Exact match found: "${targetName}"`);
            }
            // Handle star/star mapping
            else if (objectName === 'star' && (targetName.toLowerCase().includes('sol') || targetName.toLowerCase().includes('star'))) {
                nameMatch = true;
                debug('TARGETING', `🎯 FALLBACK: Star match found: "${targetName}"`);
            }
            // Handle terra prime variations
            else if (objectName === 'terra_prime' && targetName.toLowerCase().includes('terra prime')) {
                nameMatch = true;
                debug('TARGETING', `🎯 FALLBACK: Terra Prime match found: "${targetName}"`);
            }
            // Handle luna variations
            else if (objectName === 'luna' && targetName.toLowerCase().includes('luna')) {
                nameMatch = true;
                debug('TARGETING', `🎯 FALLBACK: Luna match found: "${targetName}"`);
            }
            // Handle europa variations
            else if (objectName === 'europa' && targetName.toLowerCase().includes('europa')) {
                nameMatch = true;
                debug('TARGETING', `🎯 FALLBACK: Europa match found: "${targetName}"`);
            }
            // Generic partial match as last resort
            else if (objectName.length > 2 && targetName.toLowerCase().includes(objectName.toLowerCase())) {
                nameMatch = true;
                debug('TARGETING', `🎯 FALLBACK: Partial match found: "${targetName}" contains "${objectName}"`);
            }

            if (nameMatch) {
                debug('TARGETING', `🎯 FALLBACK: Found target by name: ${targetName}`);

                this.targetIndex = i;
                this.currentTarget = target.object || target;
                this.isManualSelection = true;
                this.isManualNavigationSelection = true;

                // Force immediate HUD refresh (same as successful ID lookup)
                if (!this.currentTarget || !this.currentTarget.position) {
                    try {
                        const vm = this.viewManager || window.viewManager;
                        const ssm = this.solarSystemManager || vm?.solarSystemManager || window.solarSystemManager;
                        const sfm = vm?.starfieldManager || window.starfieldManager;

                        let resolved = null;
                        if (target.type === 'navigation_beacon' && sfm?.navigationBeacons) {
                            resolved = sfm.navigationBeacons.find(b => (b?.userData?.name || b?.name) === target.name);
                        }
                        if (!resolved && ssm?.celestialBodies && typeof ssm.celestialBodies.get === 'function') {
                            resolved = ssm.celestialBodies.get(normalizedId) ||
                                       ssm.celestialBodies.get(`beacon_${normalizedId}`) ||
                                       ssm.celestialBodies.get(`station_${target.name?.toLowerCase()?.replace(/\s+/g, '_')}`);
                        }
                        if (resolved) {
                            this.currentTarget = resolved;
                            this.targetObjects[i] = { ...target, object: resolved, position: resolved.position };
                        }
                    } catch (e) {
                        debug('TARGETING', `🎯 FALLBACK: Resolution failed: ${e.message}`);
                    }
                }

                // Clear existing wireframe and create new one
                debug('TARGETING', `🎯 TARGET_SWITCH: Clearing existing wireframe for fallback target`);
                if (this.targetWireframe) {
                    debug('INSPECTION', `🔍 Clearing existing wireframe: ${this.targetWireframe.type || 'unknown type'}`);
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
                this.targetWireframe = null;

                // Update ship's target computer system (same as cycleTarget does)
                // This ensures subsystems are properly cleared when switching to unknown objects
                const ship = this.viewManager?.getShip();
                const targetComputer = ship?.getSystem('target_computer');
                
                if (targetComputer && targetComputer.setTarget) {
                    // Prepare target data for subsystem targeting (same logic as cycleTarget)
                    let targetForSubTargeting = this.currentTarget;
                    
                    if (targetForSubTargeting && typeof targetForSubTargeting === 'object') {
                        // Ensure target has required properties for subsystem targeting
                        if (!targetForSubTargeting.name && target.name) {
                            targetForSubTargeting.name = target.name;
                        }
                        if (!targetForSubTargeting.faction && target.faction) {
                            targetForSubTargeting.faction = target.faction;
                        }
                        // For navigation beacons and other objects, also check userData as fallback
                        if (!targetForSubTargeting.name && targetForSubTargeting.userData?.name) {
                            targetForSubTargeting.name = targetForSubTargeting.userData.name;
                        }
                        if (!targetForSubTargeting.faction && targetForSubTargeting.userData?.faction) {
                            targetForSubTargeting.faction = targetForSubTargeting.userData.faction;
                        }
                    }

                    // Update ship's target computer system - this clears subsystems for unknown objects
                    targetComputer.setTarget(targetForSubTargeting);
                    
                    // Force UI refresh to ensure subsystem clearing is reflected in display
                    if (this.updateTargetDisplay) {
                        this.updateTargetDisplay();
                    }
                    if (this.updateReticleTargetInfo) {
                        this.updateReticleTargetInfo();
                    }
                    
                    // Delayed refresh to override any conflicting updates
                    setTimeout(() => {
                        if (this.updateTargetDisplay) {
                            this.updateTargetDisplay();
                        }
                        if (this.updateReticleTargetInfo) {
                            this.updateReticleTargetInfo();
                        }
                    }, 100);
                }

                // Create new wireframe for the selected target
                this.createTargetWireframe();
                this.updateTargetDisplay();
                this.updateReticleTargetInfo();

                debug('TARGETING', `🎯 FALLBACK: Target set successfully to ${target.name} (originally ${normalizedId})`);
                return true;
            }
        }

        debug('TARGETING', `🎯 FALLBACK: Name-based lookup also failed for "${objectName}"`);
        
        // FINAL FALLBACK: Try to add object dynamically from StarCharts data
        debug('TARGETING', `🎯 FINAL FALLBACK: Attempting to add object from StarCharts data: ${normalizedId}`);
        
        const starChartsManager = this.viewManager?.navigationSystemManager?.starChartsManager;
        if (starChartsManager) {
            const objectData = starChartsManager.getObjectData(normalizedId);
            if (objectData) {
                // CRITICAL FIX: Check current sector to prevent cross-sector contamination
                const currentSector = this.viewManager?.solarSystemManager?.currentSector || 'A0';
                if (normalizedId && !normalizedId.startsWith(currentSector + '_')) {
                    debug('TARGETING', `🚫 setTargetById: Skipping target from different sector: ${objectData.name} (ID: ${normalizedId}, current sector: ${currentSector})`);
                    return false;
                }
                
                debug('TARGETING', `🎯 FINAL FALLBACK: Found object data in StarCharts: ${objectData.name}, adding to target list`);
                
                // Create a target entry for this object
                const targetData = {
                    id: normalizedId,
                    name: objectData.name,
                    type: objectData.type,
                    position: objectData.cartesianPosition || objectData.position || [0, 0, 0],
                    distance: 0, // Will be calculated
                    isShip: false,
                    object: null, // No Three.js object yet
                    faction: objectData.faction,
                    diplomacy: objectData.diplomacy,
                    isSpaceStation: objectData.type === 'space_station' || objectData.type === 'station' || (objectData.type && (
                        objectData.type.toLowerCase().includes('station') ||
                        objectData.type.toLowerCase().includes('complex') ||
                        objectData.type.toLowerCase().includes('platform') ||
                        objectData.type.toLowerCase().includes('facility') ||
                        objectData.type.toLowerCase().includes('base')
                    )),
                    isMoon: objectData.type === 'moon'
                };
                
                // Add to target list
                this.targetObjects.push(targetData);
                const newIndex = this.targetObjects.length - 1;
                
                // Set as current target
                this.targetIndex = newIndex;
                this.currentTarget = targetData;
                this.isManualSelection = true;
                this.isManualNavigationSelection = true;
                
                // Update display
                this.createTargetWireframe();
                this.updateTargetDisplay();
                this.updateReticleTargetInfo();
                
                debug('TARGETING', `🎯 FINAL FALLBACK: Successfully added and targeted object from StarCharts: ${objectData.name}`);
                return true;
            }
        }
        
        debug('TARGETING', `🎯 CRITICAL: All lookup methods failed for ${normalizedId}. Target switching will not work until target objects are properly populated with IDs or names.`);
        return false;
    }

    /**
     * Set target by name (fallback for Star Charts integration)
     * @param {string} objectName - The name of the object to target
     */
    setTargetByName(objectName) {
        if (!objectName) {
            debug('P1', '🎯 setTargetByName: No object name provided');
            return false;
        }

debug('TARGETING', `🎯 Setting target by name: ${objectName}`);

        // Search through current target objects by name
        for (let i = 0; i < this.targetObjects.length; i++) {
            const target = this.targetObjects[i];
            
            if (target.name === objectName) {
                // Set target with proper synchronization
                this.targetIndex = i;
                this.currentTarget = target.object || target;
                
                // Mark as manual navigation selection to prevent automatic override
                this.isManualSelection = true;
                this.isManualNavigationSelection = true; // Preserve navigation context
                
                // Force immediate display update
                this.updateTargetDisplay();
                this.updateReticleTargetInfo();
                
debug('TARGETING', `🎯 Star Charts: Target set by name to ${target.name} at index ${i}`);
                return true;
            }
        }

        debug('P1', `🎯 Target not found by name: ${objectName}`);
        return false;
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
    updateReticleColor(diplomacyColor = '#44ffff') {
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
    updateStatusIcons(distance, diplomacyColor, isEnemyShip, info, isObjectDiscovered) {
        // New service availability logic
        if (this.serviceIcons) {
            const isEnemy = (info?.diplomacy || '').toLowerCase() === 'enemy';
            const isStar = info?.type === 'star' || (this.getStarSystem && this.getStarSystem() && info?.name === this.getStarSystem().star_name);
            const isPlanet = info?.type === 'planet';
            const isWaypoint = this.currentTarget?.isWaypoint || this.currentTarget?.isVirtual || info?.type === 'waypoint';
            const canUse = !isEnemy && isObjectDiscovered && !isWaypoint; // Exclude waypoints from showing services

            const availability = isStar ? {
                repairRefuel: false,
                shipRefit: false,
                tradeExchange: false,
                missionBoard: false
            } : {
                repairRefuel: canUse,
                shipRefit: canUse,
                tradeExchange: canUse && isPlanet,
                missionBoard: canUse
            };

            Object.entries(this.serviceIcons).forEach(([key, icon]) => {
                const visible = !!availability[key];
                icon.style.display = visible ? 'flex' : 'none';
                icon.style.borderColor = diplomacyColor;
                icon.style.color = diplomacyColor;
                icon.style.textShadow = `0 0 4px ${diplomacyColor}`;
                icon.style.boxShadow = `0 0 4px ${diplomacyColor}`;
                icon.title = icon.title; // keep tooltip text
            });

            const anyVisible = !isStar && Object.entries(this.serviceIcons).some(([_, icon]) => icon.style.display !== 'none');
            this.statusIconsContainer.style.display = anyVisible ? 'flex' : 'none';
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
        debug('TARGETING', '⚡ TargetComputerManager disposal started...');

        // Abort all event listeners registered with AbortController
        if (this._abortController) {
            this._abortController.abort();
            this._abortController = null;
        }

        // Stop wireframe animation
        this.stopWireframeAnimation();

        // Clear all timers
        if (this.noTargetsInterval) {
            clearInterval(this.noTargetsInterval);
            this.noTargetsInterval = null;
        }
        if (this.noTargetsTimeout) {
            clearTimeout(this.noTargetsTimeout);
            this.noTargetsTimeout = null;
        }
        if (this.rangeMonitoringInterval) {
            clearInterval(this.rangeMonitoringInterval);
            this.rangeMonitoringInterval = null;
        }

        // Clean up audio elements
        if (this.audioElements) {
            this.audioElements.forEach((audio, key) => {
                if (audio) {
                    audio.pause();
                    audio.src = '';
                }
            });
            this.audioElements.clear();
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

        // Clear known targets cache
        if (this.knownTargets) {
            this.knownTargets.clear();
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
     */
    clearTargetWireframe() {
        debug('TARGETING', `🎯 WIREFRAME: clearTargetWireframe() called - existing wireframe: ${this.targetWireframe ? 'YES' : 'NO'}`);
        const childrenBefore = this.wireframeScene.children.length;
        const childTypesBefore = this.wireframeScene.children.map(child => child.constructor.name).join(', ');
        debug('TARGETING', `🎯 WIREFRAME: Before clear - ${childrenBefore} objects: ${childTypesBefore}`);
        
        // Store reference to current wireframe before clearing for orphan detection
        const currentWireframe = this.targetWireframe;
        
        // Clear main wireframe
        if (this.targetWireframe) {
            this.wireframeScene.remove(this.targetWireframe);
            this.targetWireframe.geometry.dispose();
            this.targetWireframe.material.dispose();
            this.targetWireframe = null;
        }
        
        // SAFETY: Remove any orphaned LineSegments that might be wireframes
        // This handles cases where wireframe references were lost but wireframes remain in scene
        // Note: We exclude the wireframe we just removed to avoid double-processing
        const orphanedWireframes = this.wireframeScene.children.filter(child => 
            child.constructor.name === 'LineSegments' && 
            child !== currentWireframe
        );
        
        if (orphanedWireframes.length > 0) {
            debug('TARGETING', `🎯 WIREFRAME: Found ${orphanedWireframes.length} orphaned wireframes, removing...`);
            orphanedWireframes.forEach(wireframe => {
                this.wireframeScene.remove(wireframe);
                if (wireframe.geometry) wireframe.geometry.dispose();
                if (wireframe.material) wireframe.material.dispose();
            });
        }
        
        // Clear sub-target indicators to prevent accumulation
        const indicatorCount = this.subTargetIndicators?.length || 0;
        if (this.subTargetIndicators) {
            this.subTargetIndicators.forEach(indicator => {
                this.wireframeScene.remove(indicator);
                if (indicator.geometry) indicator.geometry.dispose();
                if (indicator.material) indicator.material.dispose();
            });
        }
        this.subTargetIndicators = [];
        
        const childrenAfter = this.wireframeScene.children.length;
        const childTypesAfter = this.wireframeScene.children.map(child => child.constructor.name).join(', ');
        debug('TARGETING', `🎯 WIREFRAME: After clear - ${childrenAfter} objects: ${childTypesAfter}`);
        if (childrenBefore !== childrenAfter || indicatorCount > 0 || orphanedWireframes.length > 0) {
            debug('TARGETING', `🎯 WIREFRAME: Cleared ${childrenBefore - childrenAfter} objects (${indicatorCount} sub-targets, ${orphanedWireframes.length} orphaned wireframes)`);
        }
    }

    /**
     * Safely get position from target object (handles different target structures)
     * Always returns a Vector3 object or null
     */
    getTargetPosition(target) {
        if (!target) return null;
        
        // SPECIAL CASE: Handle virtual waypoints first
        if (target.isVirtual || target.isWaypoint || target.type === 'waypoint') {
            if (target.position && typeof target.position === 'object' && 
                typeof target.position.x === 'number' && 
                typeof target.position.y === 'number' && 
                typeof target.position.z === 'number') {
                return new this.THREE.Vector3(target.position.x, target.position.y, target.position.z);
            }
        }
        
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
        
        // As a last resort, try resolving a live scene object by id/name (covers beacons/stations)
        try {
            const vm = this.viewManager || window.viewManager;
            const ssm = this.solarSystemManager || vm?.solarSystemManager || window.solarSystemManager;
            const sfm = vm?.starfieldManager || window.starfieldManager;

            const id = typeof (target.id || target?.object?.userData?.id || '') === 'string' ? (target.id || target?.object?.userData?.id || '').replace(/^a0_/i, 'A0_') : (target.id || target?.object?.userData?.id || '');
            const name = target.name || target?.object?.name || target?.object?.userData?.name;

            let resolved = null;
            // Beacons first
            if (sfm?.navigationBeacons) {
                resolved = sfm.navigationBeacons.find(b => b?.userData?.id === id) ||
                           sfm.navigationBeacons.find(b => (b?.userData?.name || b?.name) === name);
            }
            // General celestial bodies
            if (!resolved && ssm?.celestialBodies && typeof ssm.celestialBodies.get === 'function') {
                // Handle star ID mapping (A0_star -> 'star')
                if (id === 'A0_star') {
                    resolved = ssm.celestialBodies.get('star');
                } else {
                    resolved = ssm.celestialBodies.get(id) ||
                               ssm.celestialBodies.get(`beacon_${id}`) ||
                               (name ? ssm.celestialBodies.get(`station_${name.toLowerCase().replace(/\s+/g, '_')}`) : null);
                }
                
                // If still not found, try to find by name in celestial bodies
                // This handles cases where Star Charts objects have specific names but SolarSystemManager uses generic keys
                if (!resolved && name) {
                    // Try to find by iterating through celestial bodies and matching names
                    for (const [key, body] of ssm.celestialBodies) {
                        if (body && (body.name === name || body.userData?.name === name)) {
                            resolved = body;
                            debug('TARGETING', `🎯 Found celestial body by name lookup: ${name} -> ${key}`);
                            break;
                        }
                    }
                }
            }
            if (resolved && resolved.position && typeof resolved.position.clone === 'function') {
                // Persist the resolution onto target/currentTarget if possible
                // Check if currentTarget is writable before assignment
                try {
                    if (this.currentTarget === target) {
                        this.currentTarget = resolved;
                    }
                } catch (e) {
                    // Ignore readonly property errors - this is just an optimization
                    if (e.message && !e.message.includes('readonly')) {
                        debug('P1', `🎯 Error updating currentTarget: ${e}`);
                    }
                }
                // Also try to update corresponding entry in targetObjects
                try {
                    const idx = Array.isArray(this.targetObjects) ? this.targetObjects.findIndex(t => (t.id || '') === id || t.name === name) : -1;
                    if (idx >= 0) {
                        this.targetObjects[idx] = { ...(this.targetObjects[idx] || {}), object: resolved, position: resolved.position };
                    }
                } catch (e) {
                    // Ignore readonly property errors - this is just an optimization
                    if (e.message && !e.message.includes('readonly')) {
                        debug('P1', `🎯 Error updating targetObjects: ${e}`);
                    }
                }
                return resolved.position;
            }
        } catch (_) {}

        // console.warn('🎯 TargetComputerManager: Could not extract position from target:', target);
        return null;
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
     * This ensures consistent behavior between waypoint creation and TAB cycling
     * @param {Object|string} waypointData - Waypoint data object or waypoint ID string
     * @returns {boolean} - True if waypoint was targeted successfully
     */
    targetWaypointViaCycle(waypointData) {
        // Handle both waypoint object and waypoint ID string
        let waypoint;
        
        if (typeof waypointData === 'string') {
            // If it's a string, treat it as waypoint ID
            waypoint = window.waypointManager?.getWaypoint(waypointData);
            if (!waypoint) {
                debug('P1', `🎯 Waypoint not found: ${waypointData}`);
                return false;
            }
        } else if (waypointData && waypointData.position) {
            // If it's an object with position, use it directly
            waypoint = waypointData;
        } else {
            debug('P1', '🎯 targetWaypointViaCycle: Invalid waypoint data');
            return false;
        }

        // Enable target computer if not already enabled
        if (!this.targetComputerEnabled) {
            this.targetComputerEnabled = true;
            // Also update StarfieldManager's flag to keep them synchronized
            if (this.viewManager?.starfieldManager) {
                this.viewManager.starfieldManager.targetComputerEnabled = true;
            }
            debug('WAYPOINTS', '🎯 Auto-enabled target computer for waypoint targeting');
        }

        // First, add any existing active waypoints to target list
        this.addWaypointsToTargets();
        
        // Check if our specific waypoint is already in the target list
        let waypointIndex = this.targetObjects.findIndex(t => 
            t.id === waypoint.id || 
            (t.isWaypoint && t.name === waypoint.name) ||
            (t.type === 'waypoint' && t.name === waypoint.name)
        );
        
        // If waypoint not found, add it directly (handles newly created waypoints)
        if (waypointIndex === -1) {
            // Create waypoint target object (same format as addWaypointsToTargets)
            const waypointTarget = {
                id: waypoint.id,
                name: waypoint.name,
                displayName: waypoint.name,
                type: 'waypoint',
                isWaypoint: true,
                faction: 'waypoint',
                diplomacy: 'waypoint',
                position: {
                    x: waypoint.position[0],
                    y: waypoint.position[1], 
                    z: waypoint.position[2]
                },
                waypointData: waypoint
            };
            
            // Add to target list
            this.targetObjects.push(waypointTarget);
            waypointIndex = this.targetObjects.length - 1;
        }
        
        // Set the target index to the waypoint and use the proven cycleTarget logic
        this.targetIndex = waypointIndex;
        
        // Use the same logic as cycleTarget for consistent behavior
        const targetData = this.targetObjects[this.targetIndex];
        
        // For waypoints, use the targetData itself (which has isWaypoint flag)
        if (targetData.isWaypoint || targetData.type === 'waypoint') {
            this.currentTarget = targetData;
        } else {
            debug('P1', '🎯 Target at index is not a waypoint');
            return false;
        }
        
        // Handle waypoint-specific targeting (same as cycleTarget)
        if (this.currentTarget && this.currentTarget.isWaypoint) {
            this.createWaypointWireframe();
        } else {
            this.createTargetWireframe();
        }
        
        this.updateTargetDisplay();
        
        // Force direction arrow update after waypoint targeting (same as cycleTarget)
        this.updateDirectionArrow();
        
        // Start monitoring the selected target's range
        this.startRangeMonitoring();
        
        // Sync with StarfieldManager (same as cycleTarget)
        if (this.viewManager?.starfieldManager) {
            this.viewManager.starfieldManager.currentTarget = this.currentTarget?.object || this.currentTarget;
            this.viewManager.starfieldManager.targetIndex = this.targetIndex;
        }
        return true;
    }

    /**
     * Set virtual target (Mission waypoint integration)
     * @deprecated Use targetWaypointViaCycle() instead for consistent behavior
     * Creates a virtual target object for mission waypoints
     * @param {Object|string} waypointData - Waypoint data object or waypoint ID string
     * @returns {boolean} - True if virtual target was created and set
     */
    setVirtualTarget(waypointData) {
        // Handle both waypoint object and waypoint ID string
        let waypoint;
        
        if (typeof waypointData === 'string') {
            // If it's a string, treat it as waypoint ID
            waypoint = window.waypointManager?.getWaypoint(waypointData);
            if (!waypoint) {
                debug('P1', `🎯 Waypoint not found: ${waypointData}`);
                return false;
            }
        } else if (waypointData && waypointData.position) {
            // If it's an object with position, use it directly
            waypoint = waypointData;
        } else {
            debug('P1', '🎯 setVirtualTarget: Invalid waypoint data');
            return false;
        }

        // Create virtual target object
        const virtualTarget = {
            id: waypoint.id,
            name: waypoint.name || 'Mission Waypoint',
            type: 'waypoint', // Set as waypoint type for proper color coding
            position: {
                x: waypoint.position[0],
                y: waypoint.position[1],
                z: waypoint.position[2]
            },
            isVirtual: true,
            isWaypoint: true, // Additional flag for clarity
            waypointData: waypoint
        };

        // Enhanced duplicate check - check multiple criteria to prevent duplicates
        const existingIndex = this.targetObjects.findIndex(t => 
            t.id === virtualTarget.id ||
            (t.isWaypoint && t.name === virtualTarget.name) ||
            (t.isVirtual && t.name === virtualTarget.name) ||
            (t.type === 'waypoint' && t.name === virtualTarget.name)
        );
        
        if (existingIndex >= 0) {
            // Update existing virtual target
            this.targetObjects[existingIndex] = virtualTarget;
            this.targetIndex = existingIndex;
        } else {
            // Add new virtual target
            this.targetObjects.push(virtualTarget);
            this.targetIndex = this.targetObjects.length - 1;
        }

        this.currentTarget = virtualTarget;
        
        // Enable target computer for waypoint targeting
        if (!this.targetComputerEnabled) {
            this.targetComputerEnabled = true;
            // Also update StarfieldManager's flag to keep them synchronized
            if (this.viewManager?.starfieldManager) {
                this.viewManager.starfieldManager.targetComputerEnabled = true;
            }
            debug('WAYPOINTS', '🎯 Auto-enabled target computer for waypoint targeting');
        }
        
        // Create wireframe for the waypoint target
        this.createTargetWireframe(); // This will delegate to createWaypointWireframe() for waypoints
        
        this.updateTargetDisplay();
        
        // Force direction arrow update after waypoint targeting setup
        try {
            // Call immediately, just like in cycleTarget - no delay needed
            this.updateDirectionArrow();
        } catch (error) {
            debug('P1', `Error calling updateDirectionArrow(): ${error}`);
        }

        debug('TARGETING', `🎯 Virtual target created: ${virtualTarget.name} at position (${virtualTarget.position?.x?.toFixed(1)}, ${virtualTarget.position?.y?.toFixed(1)}, ${virtualTarget.position?.z?.toFixed(1)})`);
        debug('TARGETING', `🎯 Star Charts: Virtual target set to ${virtualTarget.name}`);
        return true;
    }

    /**
     * Remove virtual target by ID
     * @param {string} waypointId - The waypoint ID to remove
     * @returns {boolean} - True if target was found and removed
     */
    removeVirtualTarget(waypointId) {
        debug('TARGETING', `🎯 removeVirtualTarget called for: ${waypointId}`);
        debug('TARGETING', `🎯 Current target: ${this.currentTarget?.name || 'None'} (id: ${this.currentTarget?.id || 'None'})`);
        debug('TARGETING', `🎯 Target objects count: ${this.targetObjects.length}`);
        
        const targetIndex = this.targetObjects.findIndex(t => 
            t.isVirtual && t.id === waypointId
        );

        if (targetIndex >= 0) {
            debug('TARGETING', `🎯 Found waypoint at index ${targetIndex}, removing...`);
            
            // Remove from target list
            this.targetObjects.splice(targetIndex, 1);

            // Adjust current target index if necessary
            if (this.targetIndex >= targetIndex) {
                this.targetIndex = Math.max(0, this.targetIndex - 1);
            }

            debug('TARGETING', `🎯 After removal: targetObjects.length=${this.targetObjects.length}, targetIndex=${this.targetIndex}`);

            // Update current target if we removed the active target
            if (this.currentTarget && this.currentTarget.id === waypointId) {
                debug('TARGETING', `🎯 Removed waypoint was current target, updating...`);
                if (this.targetObjects.length > 0) {
                    this.currentTarget = this.targetObjects[this.targetIndex];
                    debug('TARGETING', `🎯 Switched to new target: ${this.currentTarget.name}`);
                    this.updateTargetDisplay();
                } else {
                    debug('TARGETING', `🎯 No more targets, clearing current target`);
                    this.clearCurrentTarget();
                }
            } else {
                debug('TARGETING', `🎯 Removed waypoint was not current target, no target update needed`);
            }

debug('TARGETING', `🎯 Star Charts: Removed virtual target ${waypointId}`);
            return true;
        }

        debug('TARGETING', `🎯 Waypoint ${waypointId} not found in target list`);
        return false;
    }

    /**
     * Get all virtual targets
     * @returns {Array} - Array of virtual target objects
     */
    getVirtualTargets() {
        return this.targetObjects.filter(t => t.isVirtual);
    }

    /**
     * Check if current target is virtual
     * @returns {boolean} - True if current target is virtual
     */
    isCurrentTargetVirtual() {
        return this.currentTarget && this.currentTarget.isVirtual;
    }

    /**
     * Get wireframe configuration for an object type using centralized data
     * @param {string} objectType - The object type to get wireframe config for
     * @returns {Object} Wireframe configuration with geometry and description
     */
    getWireframeConfig(objectType) {
        return getWireframeType(objectType);
    }

    /**
     * Create a standard wireframe geometry for unknown/undiscovered objects
     * @param {number} radius - The radius/size of the geometry
     * @returns {THREE.BufferGeometry} A simple geometric shape for unknown objects
     */
    createUnknownWireframeGeometry(radius) {
        // Create a simple diamond/octahedron shape for unknown objects
        // This gives a generic, mysterious appearance that doesn't reveal the actual object type
        const geometry = new this.THREE.OctahedronGeometry(radius * 0.8, 0);
        
        // Convert to edges geometry for wireframe display
        const edgesGeometry = new this.THREE.EdgesGeometry(geometry);
        
        // Dispose the temporary geometry
        geometry.dispose();
        
        debug('INSPECTION', `🔍 Created unknown wireframe geometry with radius ${radius * 0.8}`);
        return edgesGeometry;
    }

    /**
     * Create geometry from centralized wireframe configuration
     * @param {string} geometryType - The geometry type from WIREFRAME_TYPES
     * @param {number} radius - The radius/size of the geometry
     * @returns {THREE.Geometry|null} The created geometry or null if not supported
     */
    createGeometryFromConfig(geometryType, radius) {

        switch (geometryType) {
            case 'icosahedron':
                return new this.THREE.IcosahedronGeometry(radius, 0);

            case 'octahedron':
                return new this.THREE.OctahedronGeometry(radius, 0);

            case 'sphere':
                return new this.THREE.SphereGeometry(radius * 0.8, 8, 6);

            default:
                debug('P1', `Unknown geometry type: ${geometryType}`);
                return null;
        }
    }

    /**
     * (Removed duplicate getCurrentTargetData implementation)
     */

    // ========== WAYPOINT SYSTEM INTEGRATION ==========


    /**
     * Check if current target is a waypoint
     * @returns {boolean} - Whether current target is a waypoint
     */
    isCurrentTargetWaypoint() {
        return this.currentTarget && 
               this.currentTarget.type === 'waypoint' && 
               this.currentTarget.isVirtual;
    }

    /**
     * Enhanced setTarget with waypoint interruption tracking
     * @param {Object} newTarget - New target object
     */
    setTarget(newTarget) {
        // Check if current target is a waypoint and we're switching to non-waypoint
        if (this.isCurrentTargetWaypoint() && newTarget && newTarget.type !== 'waypoint') {
            // Store interrupted waypoint for later resumption
            this.interruptedWaypoint = {
                ...this.currentTarget,
                status: 'INTERRUPTED',
                interruptedAt: new Date(),
                interruptedBy: newTarget.type
            };
            
            debug('WAYPOINTS', `🎯 Waypoint interrupted: ${this.currentTarget.name} by ${newTarget.type}`);
            
            // Notify waypoint manager
            if (window.waypointManager) {
                window.waypointManager.notifyWaypointInterrupted(this.currentTarget.id);
            }
        }

        // Set new target normally
        this.currentTarget = newTarget;
        this.updateTargetDisplay();
    }

    /**
     * Resume interrupted waypoint
     * @returns {boolean} - Success status
     */
    resumeInterruptedWaypoint() {
        if (this.interruptedWaypoint) {
            const waypoint = this.interruptedWaypoint;
            
            // Clear interruption state
            this.interruptedWaypoint = null;
            this.waypointInterruptionTime = null;
            
            // Re-target the waypoint using the cycle approach
            const success = this.targetWaypointViaCycle(waypoint.id);
            
            // Update waypoint status
            if (success && window.waypointManager) {
                window.waypointManager.resumeWaypoint(waypoint.id);
            }
            
            debug('WAYPOINTS', `🎯 Resumed interrupted waypoint: ${waypoint.name}`);
            return success;
        }
        return false;
    }

    /**
     * Check if there's an interrupted waypoint
     * @returns {boolean} - Whether there's an interrupted waypoint
     */
    hasInterruptedWaypoint() {
        return this.interruptedWaypoint !== null;
    }

    /**
     * Get interrupted waypoint
     * @returns {Object|null} - Interrupted waypoint or null
     */
    getInterruptedWaypoint() {
        return this.interruptedWaypoint;
    }

    /**
     * Clear interrupted waypoint state
     */
    clearInterruptedWaypoint() {
        this.interruptedWaypoint = null;
        this.waypointInterruptionTime = null;
        debug('WAYPOINTS', '🎯 Cleared interrupted waypoint state');
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
     * @param {Object} target - Target object
     * @returns {string} Hex color code
     */
    getFactionColor(target) {
        // Faction colors from docs/restart.md
        const FACTION_COLORS = {
            hostile: '#ff3333',    // Red
            neutral: '#ffff44',    // Yellow  
            friendly: '#44ff44',   // Green
            unknown: '#44ffff',    // Cyan
            waypoint: '#ff00ff'    // Magenta - special case for waypoints
        };
        
        // Special handling for waypoints
        if (target && (target.isWaypoint || target.faction === 'waypoint' || target.diplomacy === 'waypoint')) {
            return FACTION_COLORS.waypoint;
        }
        
        // Standard faction color resolution
        const diplomacy = target?.diplomacy || target?.faction || 'unknown';
        return FACTION_COLORS[diplomacy] || FACTION_COLORS.unknown;
    }

    /**
     * Add waypoints to the targeting system
     * @returns {number} Number of waypoints added
     */
    addWaypointsToTargets() {
        if (!window.waypointManager) {
            debug('WAYPOINTS', '❌ WaypointManager not available');
            return 0;
        }
        
        // Prevent duplicate additions
        if (this._waypointsAdded) {
            debug('WAYPOINTS', '⏭️ Waypoints already added, skipping');
            return 0;
        }
        
        const activeWaypoints = window.waypointManager.getActiveWaypoints();
        let addedCount = 0;
        
        debug('WAYPOINTS', `🎯 addWaypointsToTargets() - Processing ${activeWaypoints.length} active waypoints`);
        activeWaypoints.forEach((wp, i) => {
            debug('WAYPOINTS', `  📍 ${i + 1}. ${wp.name}: status=${wp.status} (will be added to targets)`);
        });
        
        for (const waypoint of activeWaypoints) {
            // Enhanced duplicate check - check ID, name, and isVirtual flag
            const existingIndex = this.targetObjects.findIndex(t => 
                t.id === waypoint.id || 
                (t.isWaypoint && t.name === waypoint.name) ||
                (t.isVirtual && t.name === waypoint.name) ||
                (t.type === 'waypoint' && t.name === waypoint.name)
            );
            if (existingIndex !== -1) {
                debug('WAYPOINTS', `⏭️ Waypoint ${waypoint.name} already exists at index ${existingIndex}, skipping`);
                continue;
            }
            
            // Create waypoint target with explicit faction assignment
            const waypointTarget = {
                id: waypoint.id,
                name: waypoint.name,
                displayName: waypoint.name,
                type: 'waypoint',
                isWaypoint: true
            };
            
            // Explicitly set faction and diplomacy (force assignment)
            waypointTarget.faction = 'waypoint';
            waypointTarget.diplomacy = 'waypoint';
            
            // Waypoint faction assignment verified
            
            // Add remaining properties (carefully to avoid overwriting faction)
            waypointTarget.position = {
                x: waypoint.position[0],
                y: waypoint.position[1], 
                z: waypoint.position[2]
            };
            waypointTarget.waypointData = waypoint;
            waypointTarget.distance = 0;
            waypointTarget.color = '#ff00ff'; // Magenta
            waypointTarget.isTargetable = true;
            
            // Re-assign faction and diplomacy to ensure they stick
            waypointTarget.faction = 'waypoint';
            waypointTarget.diplomacy = 'waypoint';
            
            // DEBUG: Check if property assignment worked
            debug('WAYPOINTS', `🔧 AFTER PROPERTY ASSIGNMENT - Waypoint ${waypoint.name}: faction=${waypointTarget.faction}, diplomacy=${waypointTarget.diplomacy}`);
            
            // Create object property with waypoint properties
            waypointTarget.object = {
                position: {
                    x: waypoint.position[0],
                    y: waypoint.position[1],
                    z: waypoint.position[2]
                },
                id: waypoint.id,
                name: waypoint.name,
                displayName: waypoint.name,
                type: 'waypoint',
                isWaypoint: true,
                faction: 'waypoint',
                diplomacy: 'waypoint',
                userData: {
                    type: 'waypoint',
                    faction: 'waypoint',
                    diplomacy: 'waypoint',
                    isWaypoint: true
                }
            };
            
            // Calculate distance if camera is available
            if (this.camera && this.camera.position) {
                const dx = waypointTarget.position.x - this.camera.position.x;
                const dy = waypointTarget.position.y - this.camera.position.y;
                const dz = waypointTarget.position.z - this.camera.position.z;
                waypointTarget.distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            } else {
                debug('WAYPOINTS', '⚠️ Camera not available for distance calculation');
            }
            
            this.targetObjects.push(waypointTarget);
            addedCount++;

            // DEBUG: Check faction after adding to targetObjects
            const addedObject = this.targetObjects[this.targetObjects.length - 1];
            debug('WAYPOINTS', `🔧 AFTER PUSH - Waypoint ${waypoint.name}: faction=${addedObject.faction}, diplomacy=${addedObject.diplomacy}`);

            debug('WAYPOINTS', `✅ Added waypoint: ${waypoint.name} (faction: ${waypointTarget.faction}, distance: ${waypointTarget.distance?.toFixed(2) || 'unknown'})`);
        }
        
        // Sort by distance
        this.targetObjects.sort((a, b) => (a.distance || 0) - (b.distance || 0));
        
        this._waypointsAdded = true;
        debug('WAYPOINTS', `✅ Added ${addedCount} waypoints to targeting system`);
        return addedCount;
    }

    /**
     * Apply waypoint-specific HUD colors (magenta)
     */
    setWaypointHUDColors() {
        if (!this.currentTarget || !this.currentTarget.isWaypoint) {
            debug('WAYPOINTS', '⏭️ Current target is not a waypoint, skipping HUD colors');
            return;
        }
        
        const WAYPOINT_COLOR = '#ff00ff'; // Magenta
        debug('WAYPOINTS', `🎨 Applying waypoint colors for: ${this.currentTarget.name}`);
        
        // Find and style HUD elements (including inner frames)
        const hudSelectors = [
            '#target-hud', '.target-hud', '.targeting-hud', '.target-computer',
            '[class*="target"]', '[id*="target"]', '.reticle', '.crosshair',
            '.target-name', '.current-target', '.target-display'
        ];
        
        let styledCount = 0;
        hudSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // Apply magenta colors
                element.style.setProperty('color', WAYPOINT_COLOR, 'important');
                element.style.setProperty('border-color', WAYPOINT_COLOR, 'important');
                element.style.setProperty('box-shadow', `0 0 15px ${WAYPOINT_COLOR}`, 'important');
                
                // Also style child elements (inner frames)
                const children = element.querySelectorAll('*');
                children.forEach(child => {
                    if (child.style.borderColor || child.style.border || 
                        getComputedStyle(child).borderColor !== 'rgba(0, 0, 0, 0)') {
                        child.style.setProperty('border-color', WAYPOINT_COLOR, 'important');
                    }
                    if (child.style.color || getComputedStyle(child).color !== 'rgba(0, 0, 0, 0)') {
                        child.style.setProperty('color', WAYPOINT_COLOR, 'important');
                    }
                });
                
                // Update text content for name displays
                if (element.classList.contains('target-name') || 
                    element.classList.contains('current-target') ||
                    element.classList.contains('target-display')) {
                    element.innerHTML = `📍 ${this.currentTarget.name}`;
                }
                
                styledCount++;
            });
        });
        
        debug('WAYPOINTS', `🎨 Applied magenta colors to ${styledCount} HUD elements`);
    }

    /**
     * Create waypoint-specific wireframe (diamond shape)
     */
    createWaypointWireframe() {
        if (!this.currentTarget || !this.currentTarget.isWaypoint) {
            debug('WAYPOINTS', '⏭️ Current target is not a waypoint, skipping wireframe');
            return;
        }
        
        if (!this.wireframeScene) {
            debug('WAYPOINTS', '❌ Wireframe scene not available for waypoint wireframe creation');
            return;
        }
        
        // Remove existing wireframe
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
        
        // Create diamond wireframe geometry
        const geometry = new this.THREE.BufferGeometry();
        const size = 0.6; // 60% smaller
        
        // Diamond vertices (distinct shape for waypoints)
        const vertices = new Float32Array([
            // Top pyramid
            0, size, 0,     size, 0, 0,     // Top to Right
            0, size, 0,     0, 0, size,     // Top to Front  
            0, size, 0,     -size, 0, 0,    // Top to Left
            0, size, 0,     0, 0, -size,    // Top to Back
            
            // Bottom pyramid
            0, -size, 0,    size, 0, 0,     // Bottom to Right
            0, -size, 0,    0, 0, size,     // Bottom to Front
            0, -size, 0,    -size, 0, 0,    // Bottom to Left
            0, -size, 0,    0, 0, -size,    // Bottom to Back
            
            // Middle ring
            size, 0, 0,     0, 0, size,     // Right to Front
            0, 0, size,     -size, 0, 0,    // Front to Left
            -size, 0, 0,    0, 0, -size,    // Left to Back
            0, 0, -size,    size, 0, 0      // Back to Right
        ]);
        
        geometry.setAttribute('position', new this.THREE.BufferAttribute(vertices, 3));
        
        // Magenta material
        const material = new this.THREE.LineBasicMaterial({ 
            color: 0xff00ff, // Magenta
            transparent: true,
            opacity: 0.9
        });
        
        this.targetWireframe = new this.THREE.LineSegments(geometry, material);
        // Position at origin for HUD display (not at world coordinates)
        this.targetWireframe.position.set(0, 0, 0);
        
        // Animation and render settings
        this.targetWireframe.userData.rotationSpeed = 0.02;
        this.targetWireframe.layers.enable(0);
        this.targetWireframe.renderOrder = 1000;
        this.targetWireframe.frustumCulled = false;
        
        this.wireframeScene.add(this.targetWireframe);
        
        debug('WAYPOINTS', `💎 Created magenta diamond wireframe for: ${this.currentTarget.name}`);
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