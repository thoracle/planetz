/**
 * TargetDummyManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles creation, management, and cleanup of target dummy ships
 * used for combat practice and sub-targeting training.
 *
 * Features:
 * - Creates target dummy ships with random damage for practice
 * - Positions dummies at various altitudes for radar bucket testing
 * - Manages dummy ship meshes and spatial tracking
 * - Preserves current target when creating dummies
 */

import { debug } from '../debug.js';

export class TargetDummyManager {
    /**
     * Create a TargetDummyManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // Target dummy tracking arrays
        this.targetDummyShips = [];
        this.dummyShipMeshes = [];
    }

    /**
     * Create target dummy ships for sub-targeting practice
     * @param {number} count - Number of dummy ships to create
     */
    async createTargetDummyShips(count = 3) {
        debug('TARGETING', `🎯 Creating ${count} target dummy ships...`);

        const tcm = this.sfm.targetComputerManager;
        const scene = this.sfm.scene;
        const camera = this.sfm.camera;
        const THREE = this.sfm.THREE;

        // Store current target information for restoration BEFORE any changes
        const previousTarget = tcm.currentTarget;
        const previousTargetIndex = tcm.targetIndex;
        const previousTargetData = tcm.getCurrentTargetData();

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
        tcm.preventTargetChanges = true;

        // Force complete wireframe cleanup before any target list changes
        if (this.sfm.targetOutline) {
            scene.remove(this.sfm.targetOutline);
            if (this.sfm.targetOutline.geometry) this.sfm.targetOutline.geometry.dispose();
            if (this.sfm.targetOutline.material) this.sfm.targetOutline.material.dispose();
            this.sfm.targetOutline = null;
            this.sfm.targetOutlineObject = null;
        }

        if (tcm.targetWireframe) {
            tcm.wireframeScene.remove(tcm.targetWireframe);
            if (tcm.targetWireframe.geometry) {
                tcm.targetWireframe.geometry.dispose();
            }
            if (tcm.targetWireframe.material) {
                if (Array.isArray(tcm.targetWireframe.material)) {
                    tcm.targetWireframe.material.forEach(material => material.dispose());
                } else {
                    tcm.targetWireframe.material.dispose();
                }
            }
            tcm.targetWireframe = null;
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
                const shipMesh = this.createDummyShipMesh(i, THREE);

                // Position the ship relative to player
                let angle, distance, height;

                // Get player's current heading from camera rotation
                const playerRotation = new THREE.Euler().setFromQuaternion(camera.quaternion);
                const playerHeading = playerRotation.y; // Y rotation is heading in THREE.js

                if (i === 0) {
                    // First dummy: place in VERY HIGH altitude bucket (>1000m above)
                    angle = playerHeading + (Math.PI * 0.1); // 18° to the right of player heading
                    distance = 80; // 80km away - using game units (1 unit = 1 km)
                    height = 1.2; // 1.2km above player (very_high bucket: y=0.7, threshold=1000m)
                } else if (i === 1) {
                    // Second dummy: place in VERY LOW altitude bucket (<-1000m below)
                    const relativeAngle = Math.PI * 0.6; // 108° to the left-back
                    angle = playerHeading + relativeAngle;
                    distance = 55; // 55km away - using game units (1 unit = 1 km)
                    height = -1.5; // 1.5km below player (very_low bucket: y=-0.7, threshold=-Infinity)
                } else {
                    // Third dummy: place in SOMEWHAT HIGH altitude bucket (100-500m above)
                    const relativeAngle = -Math.PI * 0.4; // 72° to the left of player heading
                    angle = playerHeading + relativeAngle;
                    distance = 30; // 30km away - using game units (1 unit = 1 km)
                    height = 0.3; // 300m above player (somewhat_high bucket: y=0.25, threshold=100m)
                }

                shipMesh.position.set(
                    camera.position.x + Math.sin(angle) * distance,
                    camera.position.y + height,
                    camera.position.z + Math.cos(angle) * distance
                );

                // Enhanced debug logging with full 3D coordinates
                const targetPosition = shipMesh.position;
                const playerPosition = camera.position;
                const actualDistance = playerPosition.distanceTo(targetPosition);
                const altitudeDifference = targetPosition.y - playerPosition.y;

                // Store ship data in mesh
                shipMesh.userData = {
                    ship: dummyShip,
                    shipType: enemyShipType,
                    isTargetDummy: true,
                    name: dummyShip.shipName
                };

                // Add to scene and tracking arrays
                scene.add(shipMesh);
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
                    debug('P1', '⚠️ SpatialManager not ready - skipping spatial tracking for ships');
                }

            } catch (error) {
                debug('P1', `Failed to create target dummy ${i + 1}: ${error}`);
            }
        }

        // Update target list to include dummy ships
        this.sfm.updateTargetList();

        // Try to restore previous target using the identifier or fallback methods
        let foundIndex = -1;
        let foundTarget = null;

        if (targetIdentifier) {
            // Find target by identifying characteristics
            for (let i = 0; i < tcm.targetObjects.length; i++) {
                const targetData = tcm.targetObjects[i];
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
                        const targetPos = this.sfm.getTargetPosition(target);
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
            tcm.targetIndex = foundIndex;
            tcm.currentTarget = foundTarget;

            // Recreate wireframes for the restored target
            tcm.createTargetWireframe();
            tcm.updateTargetDisplay();

            // Force StarfieldManager outline recreation
            const currentTargetData = tcm.getCurrentTargetData();
            if (currentTargetData) {
                this.sfm.createTargetOutline(foundTarget, '#00ff41', currentTargetData);
            }
        }

        // Clear the flag to allow normal target changes again
        tcm.preventTargetChanges = false;

        debug('TARGETING', `✅ Target dummy ships created successfully - target preserved`);
    }

    /**
     * Create a visual mesh for a target dummy ship - simple wireframe cube
     *
     * Visual Size: 1.0m base geometry × 1.5 scale = 1.5m × 1.5m × 1.5m final size
     * Physics Collision: 1.5m (matches visual mesh exactly - what you see is what you get)
     *
     * @param {number} index - Ship index for color variation
     * @param {Object} THREE - Three.js library reference
     * @returns {THREE.Mesh} Simple wireframe cube mesh (1.5m actual size)
     */
    createDummyShipMesh(index, THREE) {
        // Create simple cube geometry - 50% smaller than before
        const cubeGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);

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

        const cubeMaterial = new THREE.MeshBasicMaterial({
            color: cubeColor,
            wireframe: true,
            transparent: true,
            opacity: 0.8
        });

        const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);

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
        const scene = this.sfm.scene;

        // Remove meshes from scene
        this.dummyShipMeshes.forEach(mesh => {
            scene.remove(mesh);

            // Remove from spatial tracking systems
            if (window.spatialManager && typeof window.spatialManager.removeObject === 'function') {
                window.spatialManager.removeObject(mesh);
                debug('TARGETING', '🧹 Object removed from spatial tracking');
            } else if (mesh.userData?.physicsBody && window.physicsManager) {
                // Fallback to physics manager if available (legacy support)
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
     * Get all target dummy ships
     * @returns {Array} Array of target dummy ship instances
     */
    getTargetDummyShips() {
        return this.targetDummyShips;
    }

    /**
     * Get all dummy ship meshes
     * @returns {Array} Array of Three.js mesh objects
     */
    getDummyShipMeshes() {
        return this.dummyShipMeshes;
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.clearTargetDummyShips();
        this.sfm = null;
    }
}
