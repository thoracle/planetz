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
        // Create main target HUD container
        this.targetHUD = document.createElement('div');
        this.targetHUD.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            height: 400px;
            background: rgba(0, 0, 0, 0.8);
            border: 2px solid #808080;
            color: #00ff41;
            font-family: "Courier New", monospace;
            font-size: 12px;
            padding: 10px;
            z-index: 1001;
            display: none;
            pointer-events: none;
            border-radius: 5px;
            box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
        `;

        // Create wireframe container
        this.wireframeContainer = document.createElement('div');
        this.wireframeContainer.style.cssText = `
            width: 200px;
            height: 150px;
            border: 1px solid #00ff41;
            margin: 10px auto;
            background: rgba(0, 0, 0, 0.9);
            position: relative;
            border-radius: 3px;
        `;

        // Create wireframe renderer
        this.wireframeRenderer = new this.THREE.WebGLRenderer({ 
            alpha: true, 
            antialias: true,
            preserveDrawingBuffer: true
        });
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

        // Create direction arrows for off-screen targets
        this.createDirectionArrows();

        // Assemble the HUD
        this.targetHUD.appendChild(this.targetInfoDisplay);
        this.targetHUD.appendChild(this.statusIconsContainer);
        this.targetHUD.appendChild(this.wireframeContainer);
        
        document.body.appendChild(this.targetHUD);
    }

    /**
     * Create direction arrows for off-screen targets
     */
    createDirectionArrows() {
        const positions = ['top', 'bottom', 'left', 'right'];
        
        positions.forEach(position => {
            const arrow = document.createElement('div');
            arrow.style.cssText = `
                position: fixed;
                width: 0;
                height: 0;
                z-index: 999;
                display: none;
                pointer-events: none;
            `;
            
            // Set arrow direction based on position
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
            
            this.directionArrows[position] = arrow;
            document.body.appendChild(arrow);
        });
    }

    /**
     * Create target reticle for on-screen targets
     */
    createTargetReticle() {
        this.targetReticle = document.createElement('div');
        this.targetReticle.style.cssText = `
            position: fixed;
            width: 40px;
            height: 40px;
            border: 2px solid #00ff41;
            pointer-events: none;
            z-index: 1000;
            display: none;
            transform: translate(-50%, -50%);
        `;

        // Create corner brackets
        const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        corners.forEach(corner => {
            const bracket = document.createElement('div');
            bracket.style.cssText = `
                position: absolute;
                width: 10px;
                height: 10px;
                border: 2px solid #00ff41;
            `;
            
            if (corner === 'top-left') {
                bracket.style.top = '-2px';
                bracket.style.left = '-2px';
                bracket.style.borderRight = 'none';
                bracket.style.borderBottom = 'none';
            } else if (corner === 'top-right') {
                bracket.style.top = '-2px';
                bracket.style.right = '-2px';
                bracket.style.borderLeft = 'none';
                bracket.style.borderBottom = 'none';
            } else if (corner === 'bottom-left') {
                bracket.style.bottom = '-2px';
                bracket.style.left = '-2px';
                bracket.style.borderRight = 'none';
                bracket.style.borderTop = 'none';
            } else if (corner === 'bottom-right') {
                bracket.style.bottom = '-2px';
                bracket.style.right = '-2px';
                bracket.style.borderLeft = 'none';
                bracket.style.borderTop = 'none';
            }
            
            this.targetReticle.appendChild(bracket);
        });

        // Create target name display
        this.targetNameDisplay = document.createElement('div');
        this.targetNameDisplay.style.cssText = `
            position: absolute;
            top: -25px;
            left: 50%;
            transform: translateX(-50%);
            color: #00ff41;
            font-family: "Courier New", monospace;
            font-size: 12px;
            white-space: nowrap;
            pointer-events: none;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
        `;

        // Create target distance display
        this.targetDistanceDisplay = document.createElement('div');
        this.targetDistanceDisplay.style.cssText = `
            position: absolute;
            top: 45px;
            left: 50%;
            transform: translateX(-50%);
            color: #00ff41;
            font-family: "Courier New", monospace;
            font-size: 10px;
            white-space: nowrap;
            pointer-events: none;
            text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
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

    /**
     * Update the list of available targets
     */
    updateTargetList() {
        if (!this.solarSystemManager) {
            return;
        }

        // Get all celestial objects from the solar system
        const celestialObjects = this.solarSystemManager.getCelestialObjects();
        
        // Get all enemy ships
        const enemyShips = this.solarSystemManager.getEnemyShips();
        
        // Combine celestial objects and enemy ships
        this.targetObjects = [
            ...celestialObjects.map(obj => ({
                object: obj,
                distance: this.calculateDistance(this.camera.position, obj.position),
                type: 'celestial'
            })),
            ...enemyShips.map(ship => ({
                object: ship,
                distance: this.calculateDistance(this.camera.position, ship.position),
                type: 'ship'
            }))
        ];

        // Sort targets by distance
        this.sortTargetsByDistance();
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
        if (this.targetIndex === -1 || !this.currentTarget) {
            this.targetIndex = 0;
        } else {
            this.targetIndex = (this.targetIndex + 1) % this.targetObjects.length;
        }

        // Get the target object directly from our target list
        const targetData = this.targetObjects[this.targetIndex];
        this.currentTarget = targetData.object;

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

        // Create new wireframe and update display
        this.createTargetWireframe();
        this.updateTargetDisplay();
        this.updateTargetOutline(this.currentTarget, 0);
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

            // Create wireframe geometry
            const wireframeGeometry = new this.THREE.SphereGeometry(radius, 16, 12);
            const wireframeMaterial = new this.THREE.MeshBasicMaterial({
                color: wireframeColor,
                wireframe: true,
                transparent: true,
                opacity: 0.8
            });

            this.targetWireframe = new this.THREE.Mesh(wireframeGeometry, wireframeMaterial);
            this.wireframeScene.add(this.targetWireframe);

            // Create sub-target indicators if available
            this.createSubTargetIndicators(radius, wireframeColor);

        } catch (error) {
            console.error('Error creating target wireframe:', error);
        }
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
        const info = currentTargetData.isShip ? 
            { type: 'enemy_ship', name: currentTargetData.name } : 
            this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);

        // Update target info display
        let targetInfoHTML = `
            <div style="margin-bottom: 5px; font-weight: bold;">
                ${info?.name || 'Unknown Target'}
            </div>
            <div style="margin-bottom: 3px;">
                Type: ${info?.type || 'Unknown'}
            </div>
            <div style="margin-bottom: 3px;">
                Distance: ${this.formatDistance(distance)}
            </div>
        `;

        if (info?.diplomacy) {
            targetInfoHTML += `
                <div style="margin-bottom: 3px;">
                    Status: ${info.diplomacy}
                </div>
            `;
        }

        this.targetInfoDisplay.innerHTML = targetInfoHTML;

        // Update HUD border color based on diplomacy
        let diplomacyColor = '#808080'; // Default gray
        const isEnemyShip = currentTargetData?.isShip;
        
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

        if (targetData.type === 'ship') {
            return {
                object: this.currentTarget,
                name: this.currentTarget.shipName || 'Enemy Ship',
                isShip: true,
                ship: this.currentTarget,
                distance: targetData.distance
            };
        } else {
            const info = this.solarSystemManager.getCelestialBodyInfo(this.currentTarget);
            return {
                object: this.currentTarget,
                name: info?.name || 'Unknown',
                isShip: false,
                distance: targetData.distance,
                ...info
            };
        }
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
     * Update target computer (called from main update loop)
     */
    update(deltaTime) {
        if (!this.targetComputerEnabled) return;

        // Update target display
        this.updateTargetDisplay();
        
        // Update reticle position
        this.updateReticlePosition();
        
        // Update direction arrows
        this.updateDirectionArrow();
        
        // Render wireframe if we have a target
        if (this.targetWireframe && this.wireframeScene && this.wireframeRenderer) {
            try {
                // Rotate wireframe continuously
                if (this.targetWireframe) {
                    this.targetWireframe.rotation.y += deltaTime * 0.5;
                    this.targetWireframe.rotation.x = 0.5 + Math.sin(Date.now() * 0.001) * 0.2;
                }
                
                // Update sub-target visual indicators
                this.updateSubTargetIndicators();
                
                // Render the wireframe scene
                this.wireframeRenderer.render(this.wireframeScene, this.wireframeCamera);
            } catch (error) {
                console.warn('Error rendering wireframe:', error);
            }
        }

        // Update 3D world outline if we have a target
        if (this.currentTarget && this.outlineEnabled) {
            const now = Date.now();
            if (now - this.lastOutlineUpdate > 100) {
                this.updateTargetOutline(this.currentTarget, deltaTime);
                this.lastOutlineUpdate = now;
            }
        }
    }

    /**
     * Clear target computer state completely
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
     * Update reticle position for on-screen targets
     */
    updateReticlePosition() {
        if (!this.currentTarget || !this.targetComputerEnabled) {
            this.targetReticle.style.display = 'none';
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
            
            this.targetReticle.style.display = isBehindCamera ? 'none' : 'block';
            this.targetReticle.style.left = `${x}px`;
            this.targetReticle.style.top = `${y}px`;

            // Update target information displays if reticle is visible
            if (!isBehindCamera) {
                this.updateReticleTargetInfo();
            } else {
                if (this.targetNameDisplay) {
                    this.targetNameDisplay.style.display = 'none';
                }
                if (this.targetDistanceDisplay) {
                    this.targetDistanceDisplay.style.display = 'none';
                }
            }
        } else {
            this.targetReticle.style.display = 'none';
            if (this.targetNameDisplay) {
                this.targetNameDisplay.style.display = 'none';
            }
            if (this.targetDistanceDisplay) {
                this.targetDistanceDisplay.style.display = 'none';
            }
        }
    }

    /**
     * Update reticle target information display
     */
    updateReticleTargetInfo() {
        if (!this.currentTarget) return;

        const currentTargetData = this.getCurrentTargetData();
        if (!currentTargetData) return;

        const distance = this.calculateDistance(this.camera.position, this.currentTarget.position);
        
        // Update target name
        if (this.targetNameDisplay) {
            this.targetNameDisplay.textContent = currentTargetData.name || 'Unknown';
            this.targetNameDisplay.style.display = 'block';
        }
        
        // Update target distance
        if (this.targetDistanceDisplay) {
            this.targetDistanceDisplay.textContent = this.formatDistance(distance);
            this.targetDistanceDisplay.style.display = 'block';
        }
    }

    /**
     * Update direction arrows for off-screen targets
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

                // Update arrow color
                arrow.style.borderTopColor = arrowColor;
                arrow.style.borderBottomColor = arrowColor;
                arrow.style.borderLeftColor = arrowColor;
                arrow.style.borderRightColor = arrowColor;
                
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
     * Remove destroyed target from target list
     */
    removeDestroyedTarget(destroyedShip) {
        if (!destroyedShip) {
            return;
        }

        console.log(`💥 removeDestroyedTarget called for: ${destroyedShip.shipName || 'unknown ship'}`);

        // Find and remove the destroyed ship from target objects
        const initialLength = this.targetObjects.length;
        this.targetObjects = this.targetObjects.filter(targetData => {
            return !(targetData.type === 'ship' && targetData.object === destroyedShip);
        });

        // Check if we removed the current target
        const wasCurrentTarget = (this.currentTarget === destroyedShip || 
                                 this.getCurrentTargetData()?.ship === destroyedShip);

        if (wasCurrentTarget) {
            console.log(`🎯 Current target was destroyed, clearing outline and cycling to next target`);
            
            // Clear current target state
            this.currentTarget = null;
            this.clearTargetOutline();
            
            // Update target list and cycle to next target
            this.updateTargetList();
            
            if (this.targetObjects.length > 0) {
                // Reset index and cycle to first available target
                this.targetIndex = -1;
                this.cycleTarget();
            } else {
                // No targets left
                this.targetIndex = -1;
                this.clearTargetOutline();
            }
        } else {
            // Target wasn't current target, just update the list
            this.clearTargetOutline();
            this.updateTargetList();
            
            // Re-establish outline for current target if it still exists
            if (this.currentTarget) {
                this.updateTargetOutline(this.currentTarget, 0);
            } else {
                this.clearTargetOutline();
            }
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
} 