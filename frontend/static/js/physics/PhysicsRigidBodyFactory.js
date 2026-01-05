/**
 * PhysicsRigidBodyFactory
 *
 * Extracted from PhysicsManager to reduce file size.
 * Handles creation and removal of rigid bodies for physics simulation.
 *
 * Features:
 * - Ship rigid body creation
 * - Station rigid body creation
 * - Planet/celestial rigid body creation
 * - Generic rigid body creation
 * - Projectile physics configuration
 * - Rigid body removal and cleanup
 */

import { debug } from '../debug.js';

export class PhysicsRigidBodyFactory {
    /**
     * Create a PhysicsRigidBodyFactory
     * @param {Object} physicsManager - Reference to parent PhysicsManager
     */
    constructor(physicsManager) {
        this.pm = physicsManager;
    }

    /**
     * Create a rigid body for a ship
     * @param {THREE.Object3D} threeObject - The Three.js object
     * @param {object} options - Physics options
     * @returns {object} The created rigid body
     */
    createShipRigidBody(threeObject, options = {}) {
        if (!this.pm.initialized) {
            debug('P1', 'PhysicsManager not initialized');
            return null;
        }

        const {
            mass = 1000,
            restitution = 0.3,
            friction = 0.5,
            width = 10,
            height = 5,
            depth = 20,
            entityType = 'ship',
            entityId = null,
            health = 100,
            damping = 0.1
        } = options;

        try {
            const shape = new this.pm.Ammo.btBoxShape(
                new this.pm.Ammo.btVector3(width / 2, height / 2, depth / 2)
            );

            const transform = new this.pm.Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new this.pm.Ammo.btVector3(
                threeObject.position.x,
                threeObject.position.y,
                threeObject.position.z
            ));
            transform.setRotation(new this.pm.Ammo.btQuaternion(
                threeObject.quaternion.x,
                threeObject.quaternion.y,
                threeObject.quaternion.z,
                threeObject.quaternion.w
            ));

            const motionState = new this.pm.Ammo.btDefaultMotionState(transform);

            const inertia = new this.pm.Ammo.btVector3(0, 0, 0);
            shape.calculateLocalInertia(mass, inertia);

            const rbInfo = new this.pm.Ammo.btRigidBodyConstructionInfo(
                mass,
                motionState,
                shape,
                inertia
            );
            const rigidBody = new this.pm.Ammo.btRigidBody(rbInfo);

            rigidBody.setRestitution(restitution);
            rigidBody.setFriction(friction);
            rigidBody.setDamping(damping, damping);

            rigidBody.userData = {
                type: entityType,
                id: entityId,
                health: health,
                threeObject: threeObject
            };

            const collisionGroup = 2;
            const collisionMask = -1;
            this.pm.physicsWorld.addRigidBody(rigidBody, collisionGroup, collisionMask);

            this.pm.rigidBodies.set(threeObject, rigidBody);

            const entityData = {
                type: entityType,
                id: entityId,
                health: health,
                threeObject: threeObject,
                shapeType: 'box',
                shapeWidth: width,
                shapeHeight: height,
                shapeDepth: depth
            };

            if (threeObject.userData && threeObject.userData.ship) {
                entityData.ship = threeObject.userData.ship;
                debug('PHYSICS', `🔗 Physics entity includes ship reference for ${entityId}`);
            }

            this.pm.entityMetadata.set(rigidBody, entityData);

            debug('UTILITY', `Created ship rigid body for ${entityType} ${entityId}`);

            this.pm.onRigidBodyCreated(rigidBody, threeObject);

            return rigidBody;

        } catch (error) {
            debug('P1', `Error creating ship rigid body: ${error.message}`);
            return null;
        }
    }

    /**
     * Create a rigid body for a station (static)
     * @param {THREE.Object3D} threeObject - The Three.js object
     * @param {object} options - Physics options
     * @returns {object} The created rigid body
     */
    createStationRigidBody(threeObject, options = {}) {
        if (!this.pm.initialized) {
            debug('P1', 'PhysicsManager not initialized');
            return null;
        }

        const {
            width = 50,
            height = 50,
            depth = 50,
            entityType = 'station',
            entityId = null,
            health = 1000
        } = options;

        try {
            const shape = new this.pm.Ammo.btBoxShape(
                new this.pm.Ammo.btVector3(width / 2, height / 2, depth / 2)
            );

            const transform = new this.pm.Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new this.pm.Ammo.btVector3(
                threeObject.position.x,
                threeObject.position.y,
                threeObject.position.z
            ));

            const motionState = new this.pm.Ammo.btDefaultMotionState(transform);
            const rbInfo = new this.pm.Ammo.btRigidBodyConstructionInfo(
                0,
                motionState,
                shape,
                new this.pm.Ammo.btVector3(0, 0, 0)
            );
            const rigidBody = new this.pm.Ammo.btRigidBody(rbInfo);

            rigidBody.userData = {
                type: entityType,
                id: entityId,
                health: health,
                threeObject: threeObject
            };

            this.pm.physicsWorld.addRigidBody(rigidBody);

            this.pm.rigidBodies.set(threeObject, rigidBody);
            this.pm.entityMetadata.set(rigidBody, {
                type: entityType,
                id: entityId,
                health: health,
                threeObject: threeObject
            });

            debug('UTILITY', `Created station rigid body for ${entityType} ${entityId}`);
            return rigidBody;

        } catch (error) {
            debug('P1', `Error creating station rigid body: ${error.message}`);
            return null;
        }
    }

    /**
     * Create a rigid body for a planet (static, spherical)
     * @param {THREE.Object3D} threeObject - The Three.js object
     * @param {object} options - Physics options
     * @returns {object} The created rigid body
     */
    createPlanetRigidBody(threeObject, options = {}) {
        if (!this.pm.initialized) {
            debug('P1', 'PhysicsManager not initialized');
            return null;
        }

        const {
            radius = 100,
            entityType = 'planet',
            entityId = null,
            health = 10000
        } = options;

        try {
            const shape = new this.pm.Ammo.btSphereShape(radius);

            const transform = new this.pm.Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new this.pm.Ammo.btVector3(
                threeObject.position.x,
                threeObject.position.y,
                threeObject.position.z
            ));

            const motionState = new this.pm.Ammo.btDefaultMotionState(transform);
            const rbInfo = new this.pm.Ammo.btRigidBodyConstructionInfo(
                0,
                motionState,
                shape,
                new this.pm.Ammo.btVector3(0, 0, 0)
            );
            const rigidBody = new this.pm.Ammo.btRigidBody(rbInfo);

            rigidBody.userData = {
                type: entityType,
                id: entityId,
                health: health,
                threeObject: threeObject
            };

            this.pm.physicsWorld.addRigidBody(rigidBody);

            this.pm.rigidBodies.set(threeObject, rigidBody);
            this.pm.entityMetadata.set(rigidBody, {
                type: entityType,
                id: entityId,
                health: health,
                threeObject: threeObject,
                shapeType: 'sphere',
                shapeRadius: radius
            });

            debug('UTILITY', `Created planet rigid body for ${entityType} ${entityId || 'unnamed'}`);

            this.pm.onRigidBodyCreated(rigidBody, threeObject);

            return rigidBody;

        } catch (error) {
            debug('P1', `Error creating planet rigid body: ${error.message}`);
            return null;
        }
    }

    /**
     * Generic method to create a rigid body with configurable shape
     * @param {THREE.Object3D} threeObject - The Three.js object
     * @param {object} config - Configuration object
     * @returns {object} The created rigid body
     */
    createRigidBody(threeObject, config = {}) {
        if (!this.pm.initialized) {
            debug('P1', 'PhysicsManager not initialized');
            return null;
        }

        const {
            mass = 1.0,
            restitution = 0.3,
            friction = 0.5,
            shape = 'box',
            radius = 1.0,
            width = 2.0,
            height = 2.0,
            depth = 2.0,
            entityType = 'object',
            entityId = null,
            health = 100
        } = config;

        try {
            let ammoShape;

            switch (shape.toLowerCase()) {
                case 'sphere':
                    ammoShape = new this.pm.Ammo.btSphereShape(radius);
                    break;
                case 'box':
                    ammoShape = new this.pm.Ammo.btBoxShape(
                        new this.pm.Ammo.btVector3(width / 2, height / 2, depth / 2)
                    );
                    break;
                case 'capsule':
                    ammoShape = new this.pm.Ammo.btCapsuleShape(radius, height);
                    break;
                case 'cylinder':
                    ammoShape = new this.pm.Ammo.btCylinderShape(
                        new this.pm.Ammo.btVector3(radius, height / 2, radius)
                    );
                    break;
                default:
                    debug('UTILITY', `Unknown shape type: ${shape}, defaulting to box`);
                    ammoShape = new this.pm.Ammo.btBoxShape(
                        new this.pm.Ammo.btVector3(width / 2, height / 2, depth / 2)
                    );
            }

            const transform = new this.pm.Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new this.pm.Ammo.btVector3(
                threeObject.position.x,
                threeObject.position.y,
                threeObject.position.z
            ));
            transform.setRotation(new this.pm.Ammo.btQuaternion(
                threeObject.quaternion.x,
                threeObject.quaternion.y,
                threeObject.quaternion.z,
                threeObject.quaternion.w
            ));

            const motionState = new this.pm.Ammo.btDefaultMotionState(transform);

            const inertia = new this.pm.Ammo.btVector3(0, 0, 0);
            if (mass > 0) {
                ammoShape.calculateLocalInertia(mass, inertia);
            }

            const rbInfo = new this.pm.Ammo.btRigidBodyConstructionInfo(
                mass,
                motionState,
                ammoShape,
                inertia
            );
            const rigidBody = new this.pm.Ammo.btRigidBody(rbInfo);

            if (!rigidBody) {
                debug('P1', `PHYSICS: Failed to create rigid body for ${entityType} ${entityId}`);
                return null;
            }

            try {
                rigidBody.setRestitution(restitution);
                rigidBody.setFriction(friction);

                if (mass > 0) {
                    rigidBody.setDamping(0.1, 0.1);
                }

                rigidBody.userData = {
                    type: entityType,
                    id: entityId || `${entityType}_${Date.now()}`,
                    health: health,
                    threeObject: threeObject
                };
            } catch (error) {
                debug('P1', `❌ PHYSICS: Failed to set properties on rigid body: ${error.message}`);
                return null;
            }

            try {
                if (entityType === 'projectile') {
                    const collisionGroup = config.collisionGroup || 1;
                    const collisionMask = config.collisionMask || -1;
                    this.pm.physicsWorld.addRigidBody(rigidBody, collisionGroup, collisionMask);

                    const projectileSpeed = config.projectileSpeed || 750;
                    this.configureProjectilePhysics(rigidBody, config.radius, projectileSpeed);
                } else {
                    this.pm.physicsWorld.addRigidBody(rigidBody);
                }
            } catch (error) {
                debug('P1', `❌ PHYSICS: Failed to add rigid body to physics world: ${error.message}`);
                return null;
            }

            this.pm.rigidBodies.set(threeObject, rigidBody);

            const entityData = {
                type: entityType,
                id: entityId || `${entityType}_${Date.now()}`,
                health: health,
                threeObject: threeObject,
                shapeType: shape,
                shapeRadius: radius,
                shapeWidth: width,
                shapeHeight: height,
                shapeDepth: depth
            };

            if (threeObject.userData) {
                if (threeObject.userData.ship) {
                    entityData.ship = threeObject.userData.ship;
                }
                if (threeObject.userData.projectile) {
                    entityData.projectile = threeObject.userData.projectile;
                }
            }

            this.pm.entityMetadata.set(rigidBody, entityData);

            if (entityType === 'projectile') {
                try {
                    if (typeof rigidBody.setActivationState === 'function') {
                        rigidBody.setActivationState(1);
                    }
                    if (typeof rigidBody.forceActivationState === 'function') {
                        rigidBody.forceActivationState(1);
                    }
                    if (typeof rigidBody.activate === 'function') {
                        rigidBody.activate();
                    }
                } catch (error) {
                    // Silent error handling
                }
            }

            this.pm.onRigidBodyCreated(rigidBody, threeObject);

            return rigidBody;

        } catch (error) {
            debug('P1', `Error creating rigid body: ${error.message}`);
            return null;
        }
    }

    /**
     * Configure projectile physics with enhanced CCD for high-speed projectiles
     */
    configureProjectilePhysics(rigidBody, collisionRadius = 0.4, projectileSpeed = 750) {
        try {
            const physicsStepDistance = projectileSpeed / 240;

            const ccdThreshold = Math.min(0.1, collisionRadius * 0.25);
            rigidBody.setCcdMotionThreshold(ccdThreshold);

            const sweptRadius = Math.max(collisionRadius * 1.5, physicsStepDistance * 0.75);
            rigidBody.setCcdSweptSphereRadius(sweptRadius);

            const currentFlags = rigidBody.getCollisionFlags();
            rigidBody.setCollisionFlags(currentFlags | 4);

            debug('UTILITY', `✅ Enhanced CCD: collision=${collisionRadius.toFixed(2)}m, swept=${sweptRadius.toFixed(2)}m, threshold=${ccdThreshold.toFixed(3)}m, speed=${projectileSpeed}m/s`);
        } catch (error) {
            debug('P1', `⚠️ CCD configuration failed: ${error.message}`);
        }
    }

    /**
     * Remove a rigid body from physics world
     * @param {THREE.Object3D} threeObject - The Three.js object
     */
    removeRigidBody(threeObject) {
        if (!this.pm.initialized) return;

        const rigidBody = this.pm.rigidBodies.get(threeObject);
        if (rigidBody) {
            const metadata = this.pm.entityMetadata.get(rigidBody);
            const entityId = metadata?.id || '';
            const isTorpedo = false;

            if (isTorpedo && this.pm.debugMode) {
                debug('PERFORMANCE', `🎯 TORPEDO CLEANUP: Preserving wireframe tracking for ${entityId}`);

                const wireframe = this.pm.debugWireframes.get(rigidBody);
                if (wireframe && threeObject && threeObject.position) {
                    if (!this.pm.delayedWireframes) {
                        this.pm.delayedWireframes = new Map();
                    }

                    const finalPosition = {
                        x: threeObject.position.x,
                        y: threeObject.position.y,
                        z: threeObject.position.z
                    };

                    this.pm.delayedWireframes.set(wireframe, {
                        entityId: entityId,
                        position: finalPosition,
                        timestamp: Date.now(),
                        detonated: true
                    });

                    debug('PERFORMANCE', `🎯 TORPEDO WIREFRAME: Stored final position for ${entityId}`);
                }

                setTimeout(() => {
                    this.pm.debugVisualizer?.removeDebugWireframe(rigidBody);
                    if (this.pm.delayedWireframes && wireframe) {
                        this.pm.delayedWireframes.delete(wireframe);
                    }
                    debug('PERFORMANCE', `🧹 DELAYED: Removed torpedo wireframe for ${entityId}`);
                }, 3000);
            } else {
                this.pm.debugVisualizer?.removeDebugWireframe(rigidBody);
            }

            this.pm.physicsWorld.removeRigidBody(rigidBody);
            this.pm.rigidBodies.delete(threeObject);
            this.pm.entityMetadata.delete(rigidBody);

            this.pm.Ammo.destroy(rigidBody);

            if (isTorpedo && this.pm._torpedoLogTimestamps) {
                this.pm._torpedoLogTimestamps.delete(entityId);
            }

            debug('PERFORMANCE', `🧹 Removed rigid body${isTorpedo ? ' (wireframe delayed)' : ' and wireframe'}`);
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.pm = null;
    }
}
