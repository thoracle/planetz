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
        
        console.log('🎯 TargetComputerManager initialized');
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

        // Create wireframe container - match original styling
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
            top: -25px;
            left: 50%;
            transform: translateX(-50%);
            color: #D0D0D0;
            text-shadow: 0 0 4px #D0D0D0;
            font-family: 'Orbitron', monospace;
            font-size: 12.1px;
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
            top: 45px;
            left: 50%;
            transform: translateX(-50%);
            color: #D0D0D0;
            text-shadow: 0 0 4px #D0D0D0;
            font-family: 'Orbitron', monospace;
            font-size: 11px;
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
            
            this.updateTargetList();
            // Only reset target index if we don't have a current target AND target changes are allowed
            if (!this.currentTarget && !this.preventTargetChanges) {
                this.targetIndex = -1;
                this.cycleTarget();
            } else {
                // Just update the display with existing target
                this.updateTargetDisplay();
            }
        }
    }

    /**
     * Update the list of available targets
     */
    updateTargetList() {
        console.log(`🎯 updateTargetList called: physicsManager=${!!window.physicsManager}, physicsManagerReady=${!!window.physicsManagerReady}`);
        
        // Use physics-based spatial queries if available, otherwise fall back to traditional method
        if (window.physicsManager && window.physicsManagerReady) {
            console.log(`🎯 Using updateTargetListWithPhysics()`);
            this.updateTargetListWithPhysics();
        } else {
            console.log(`🎯 Using updateTargetListTraditional()`);
            this.updateTargetListTraditional();
        }
    }

    /**
     * Enhanced target list update using physics-based spatial queries
     */
    updateTargetListWithPhysics() {
        console.log('🎯 TargetComputerManager.updateTargetListWithPhysics() called');
        const maxTargetingRange = 10000; // 10,000 km max targeting range
        
        // Perform spatial query around the camera position
        const nearbyEntities = window.physicsManager.spatialQuery(
            this.camera.position, 
            maxTargetingRange
        );
        
        console.log(`🎯 Physics spatial query found ${nearbyEntities.length} entities within ${maxTargetingRange}km`);
        
        let allTargets = [];
        
        // Process entities found by physics spatial query
        nearbyEntities.forEach(entity => {
            if (!entity.threeObject || !entity.threeObject.position) {
                return; // Skip invalid entities
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
            } else if (entity.type === 'star' || entity.type === 'planet' || entity.type === 'moon') {
                // Handle celestial bodies
                const info = this.solarSystemManager.getCelestialBodyInfo(entity.threeObject);
                if (info) {
                    targetData = {
                        name: info.name,
                        type: info.type,
                        position: entity.threeObject.position.toArray(),
                        isMoon: entity.type === 'moon',
                        object: entity.threeObject,
                        isShip: false,
                        distance: distance,
                        physicsEntity: entity,
                        ...info
                    };
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
        this.sortTargetsByDistanceWithPhysics();
        
        // Update target display
        this.updateTargetDisplay();
        
        console.log(`🎯 Physics-enhanced targeting: ${allTargets.length} total targets`);
    }

    /**
     * Traditional target list update (fallback when physics not available)
     */
    updateTargetListTraditional() {
        let allTargets = [];
        
        // Add comprehensive debugging
        console.log('🎯 TargetComputerManager.updateTargetListTraditional() called');
        console.log('🎯 Debug info:', {
            hasSolarSystemManager: !!this.solarSystemManager,
            viewManager: !!this.viewManager,
            starfieldManager: !!this.viewManager?.starfieldManager,
            dummyShips: this.viewManager?.starfieldManager?.dummyShipMeshes?.length || 0
        });
        
        // Get celestial bodies from SolarSystemManager
        if (this.solarSystemManager) {
            const bodies = this.solarSystemManager.getCelestialBodies();
            console.log('🎯 Celestial bodies found:', {
                bodiesMapSize: bodies.size,
                bodiesKeys: Array.from(bodies.keys()),
                hasStarSystem: !!this.solarSystemManager.starSystem
            });
            
            const celestialBodies = Array.from(bodies.entries())
                .map(([key, body]) => {
                    const info = this.solarSystemManager.getCelestialBodyInfo(body);
                    
                    // Add detailed debugging for each body
                    console.log(`🎯 Processing celestial body: ${key}`, {
                        hasBody: !!body,
                        hasPosition: !!body?.position,
                        position: body?.position ? [body.position.x, body.position.y, body.position.z] : null,
                        info: info,
                        bodyType: typeof body
                    });
                    
                    // Validate body position
                    if (!body.position || 
                        isNaN(body.position.x) || 
                        isNaN(body.position.y) || 
                        isNaN(body.position.z)) {
                        console.warn('🎯 Invalid position detected for celestial body:', info?.name);
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
            
            console.log(`🎯 Processed ${celestialBodies.length} valid celestial bodies:`, 
                celestialBodies.map(b => ({ name: b.name, type: b.type, distance: b.distance.toFixed(1) + 'km' }))
            );
            
            allTargets = allTargets.concat(celestialBodies);
        } else {
            console.warn('🎯 No SolarSystemManager available for targeting');
        }
        
        // Note: Dummy ships will be added by addNonPhysicsTargets() to avoid duplicates
        
        // Update target list
        this.targetObjects = allTargets;
        
        console.log(`🎯 Final target list: ${allTargets.length} targets total`, 
            allTargets.map((t, index) => ({ index, name: t.name, type: t.type, isShip: t.isShip }))
        );
        
        // Sort targets by distance
        this.sortTargetsByDistance();
        
        // Update target display
        this.updateTargetDisplay();
    }

    /**
     * Add targets that don't have physics bodies yet (fallback)
     */
    addNonPhysicsTargets(allTargets, maxRange) {
        const existingTargetIds = new Set(allTargets.map(t => t.physicsEntity?.id || t.name));
        
        // Check for ships without physics bodies
        if (this.viewManager?.starfieldManager?.dummyShipMeshes) {
            console.log(`🎯 addNonPhysicsTargets: Processing ${this.viewManager.starfieldManager.dummyShipMeshes.length} dummy ships`);
            console.log(`🎯 addNonPhysicsTargets: Existing target IDs:`, Array.from(existingTargetIds));
            
            this.viewManager.starfieldManager.dummyShipMeshes.forEach((mesh, index) => {
                const ship = mesh.userData.ship;
                const targetId = ship.shipName;
                
                console.log(`🎯 addNonPhysicsTargets: Checking dummy ship ${index}: ${targetId}, hull: ${ship.currentHull}, already exists: ${existingTargetIds.has(targetId)}`);
                
                // Filter out destroyed ships and check if not already in target list
                if (!existingTargetIds.has(targetId) && ship && ship.currentHull > 0.001) {
                    const distance = this.calculateDistance(this.camera.position, mesh.position);
                    if (distance <= maxRange) {
                        console.log(`🎯 addNonPhysicsTargets: Adding dummy ship: ${targetId}`);
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
                        console.log(`🎯 addNonPhysicsTargets: Dummy ship ${targetId} out of range: ${distance.toFixed(1)}km > ${maxRange}km`);
                    }
                } else if (ship && ship.currentHull <= 0.001) {
                    console.log(`🗑️ Fallback method filtering out destroyed ship: ${ship.shipName} (Hull: ${ship.currentHull})`);
                } else if (existingTargetIds.has(targetId)) {
                    console.log(`🎯 addNonPhysicsTargets: Skipping duplicate ship: ${targetId}`);
                }
            });
        }
        
        // Check for celestial bodies without physics bodies
        if (this.solarSystemManager) {
            const bodies = this.solarSystemManager.getCelestialBodies();
            Array.from(bodies.entries()).forEach(([key, body]) => {
                const info = this.solarSystemManager.getCelestialBodyInfo(body);
                if (info && !existingTargetIds.has(info.name)) {
                    const distance = this.calculateDistance(this.camera.position, body.position);
                    if (distance <= maxRange && body.position) {
                        allTargets.push({
                            name: info.name,
                            type: info.type,
                            position: body.position.toArray(),
                            isMoon: key.startsWith('moon_'),
                            object: body,
                            isShip: false,
                            distance: distance,
                            ...info
                        });
                    }
                }
            });
        }
    }

    /**
     * Enhanced sorting with physics data
     */
    sortTargetsByDistanceWithPhysics() {
        const now = Date.now();
        if (now - this.lastSortTime < this.sortInterval) {
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
    sortTargetsByDistance() {
        const now = Date.now();
        if (now - this.lastSortTime < this.sortInterval) {
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
            console.log(`🎯 Target change prevented during dummy creation`);
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

        // Get the target object directly from our target list
        const targetData = this.targetObjects[this.targetIndex];
        this.currentTarget = targetData.object;
        
        // Removed target cycling log to prevent console spam
        // console.log(`🔄 Target cycled: ${previousIndex} → ${this.targetIndex} (${targetData.name})`);
        // console.log(`🎯 Previous target: ${previousTarget?.userData?.ship?.shipName || 'none'}`);
        // console.log(`🎯 New target: ${targetData.name}`);

        // Clean up existing wireframe before creating a new one
        if (this.targetWireframe) {
            console.log(`🎯 WIREFRAME: Cleaning up existing wireframe`);
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
            console.log(`🎯 WIREFRAME: Existing wireframe cleaned up`);
        } else {
            console.log(`🎯 WIREFRAME: No existing wireframe to clean up`);
        }

        // Create new wireframe and update display
        this.createTargetWireframe();
        this.updateTargetDisplay();
    }

    /**
     * Create wireframe for current target
     */
    createTargetWireframe() {
        if (!this.currentTarget) return;

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
                wireframeColor = 0xff3333; // Enemy ships are darker neon red
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
                    wireframeColor = 0xff3333; // Darker neon red
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

            if (info && (info.type === 'star' || (this.getStarSystem() && info.name === this.getStarSystem().star_name))) {
                // For stars, use the custom star geometry directly (it's already a line geometry)
                const starGeometry = this.createStarGeometry(radius);
                this.targetWireframe = new this.THREE.LineSegments(starGeometry, wireframeMaterial);
            } else {
                // For other objects, create standard wireframes using EdgesGeometry
                let wireframeGeometry;
                if (info) {
                    // Create different shapes based on object type
                    if (info.type === 'enemy_ship') {
                        // Use simple cube wireframe to match simplified target dummies
                        wireframeGeometry = new this.THREE.BoxGeometry(radius, radius, radius);
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
        if (!this.currentTarget || !this.targetComputerEnabled) {
            return;
        }

        const currentTargetData = this.getCurrentTargetData();
        if (!currentTargetData) {
            return;
        }

        const distance = this.calculateDistance(this.camera.position, this.currentTarget.position);
        
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
        
        // Create hull health section for enemy ships
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
        if (!this.currentTarget || this.targetIndex < 0 || this.targetIndex >= this.targetObjects.length) {
            return null;
        }

        const targetData = this.targetObjects[this.targetIndex];
        if (!targetData || targetData.object !== this.currentTarget) {
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
        return point1.distanceTo(point2);
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

        // Calculate target's screen position
        const screenPosition = this.currentTarget.position.clone().project(this.camera);
        const isOnScreen = Math.abs(screenPosition.x) <= 1 && Math.abs(screenPosition.y) <= 1;

        if (isOnScreen) {
            const x = (screenPosition.x + 1) * window.innerWidth / 2;
            const y = (-screenPosition.y + 1) * window.innerHeight / 2;
            
            const cameraForward = new this.THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
            const relativePos = this.currentTarget.position.clone().sub(this.camera.position);
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
            reticleColor = '#ff3333'; // Enemy ships are darker neon red
        } else if (info?.type === 'star') {
            reticleColor = '#ffff00'; // Stars are neutral yellow
        } else if (info?.diplomacy?.toLowerCase() === 'enemy') {
            reticleColor = '#ff3333'; // Darker neon red
        } else if (info?.diplomacy?.toLowerCase() === 'neutral') {
            reticleColor = '#ffff00';
        } else if (info?.diplomacy?.toLowerCase() === 'friendly') {
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

        // Get target's world position relative to camera
        const targetPosition = this.currentTarget.position.clone();
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

        // Create targetable area indicators (simulating different systems/areas)
        const targetableAreas = [
            { name: 'Command Center', position: [0, radius * 0.7, 0], color: 0xff3333 },
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
            console.log('🎯 Clearing 3D outline for destroyed target');
            this.clearTargetOutline();

            // Update target list to remove destroyed ship
            this.updateTargetList();

            // Select new target using proper cycling logic
            if (this.targetObjects && this.targetObjects.length > 0) {
                console.log(`🔄 Cycling to new target from ${this.targetObjects.length} available targets`);

                // Prevent outlines from appearing automatically after destruction
                if (this.viewManager?.starfieldManager) {
                    this.viewManager.starfieldManager.outlineDisabledUntilManualCycle = true;
                }

                // Cycle to next target without creating outline (automatic cycle)
                this.cycleTarget(false);

                console.log('🎯 Target cycled after destruction - outline disabled until next manual cycle');
            } else {
                console.log('📭 No targets remaining after destruction');

                // CRITICAL: Force clear outline again when no targets remain
                console.log('🎯 Force-clearing outline - no targets remaining');
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
        
        console.log('🎯 TargetComputerManager disposed');
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
        
        console.log('🎯 Target computer completely cleared - all state reset');
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
} 