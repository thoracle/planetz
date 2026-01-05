/**
 * PhysicsCollisionHandler
 *
 * Extracted from PhysicsManager to reduce file size.
 * Handles all collision detection and response for the physics system.
 *
 * Features:
 * - Collision manifold processing
 * - Ship-to-ship collision handling
 * - Ship-to-celestial collision handling
 * - Projectile collision handling
 * - Collision damage and bouncing effects
 */

import { debug } from '../debug.js';

export class PhysicsCollisionHandler {
    /**
     * Create a PhysicsCollisionHandler
     * @param {Object} physicsManager - Reference to parent PhysicsManager
     */
    constructor(physicsManager) {
        this.pm = physicsManager;
    }

    /**
     * Setup collision detection callbacks
     */
    setupCollisionDetection() {
        try {
            if (typeof this.pm.physicsWorld.setCollisionEventCallback === 'function') {
                this.pm.physicsWorld.setCollisionEventCallback(this.onCollisionEvent.bind(this));
                debug('UTILITY', '✅ Collision event callbacks enabled');
            } else {
                debug('AI', 'Collision event callbacks not available in this Ammo.js build');
                debug('UTILITY', '💡 Will use manual collision detection instead');
            }
        } catch (error) {
            debug('P1', 'Collision detection setup failed:', error.message);
            debug('UI', '💡 Continuing without automatic collision callbacks');
        }

        debug('UTILITY', '🚨 Collision detection system initialized');
    }

    /**
     * Handle collision events from Ammo.js
     * @param {object} collisionEvent - Collision event data
     */
    onCollisionEvent(collisionEvent) {
        // This will be called by Ammo.js when collisions occur
        // For now, we'll use manual collision detection in the update loop
    }

    /**
     * Handle collision detection for projectiles and other objects
     */
    handleCollisions() {
        if (!this.pm.initialized) return;

        try {
            if (!this.pm.dispatcher || typeof this.pm.dispatcher.getNumManifolds !== 'function') {
                return;
            }

            const numManifolds = this.pm.dispatcher.getNumManifolds();

            for (let i = 0; i < numManifolds; i++) {
                const contactManifold = this.pm.dispatcher.getManifoldByIndexInternal(i);

                if (!contactManifold) continue;

                const body0 = this.pm.Ammo.castObject(contactManifold.getBody0(), this.pm.Ammo.btRigidBody);
                const body1 = this.pm.Ammo.castObject(contactManifold.getBody1(), this.pm.Ammo.btRigidBody);

                const projectile0 = body0?.projectileOwner;
                const projectile1 = body1?.projectileOwner;

                if (projectile0 || projectile1) {
                    const numContacts = contactManifold.getNumContacts();

                    for (let j = 0; j < numContacts; j++) {
                        const contactPoint = contactManifold.getContactPoint(j);

                        const distance = contactPoint.get_m_distance ? contactPoint.get_m_distance() :
                            (contactPoint.getDistance ? contactPoint.getDistance() : 0.1);

                        if (distance <= 10.0) {
                            if (projectile0) {
                                this.handleProjectileCollision(projectile0, contactPoint, body1);
                            }
                            if (projectile1) {
                                this.handleProjectileCollision(projectile1, contactPoint, body0);
                            }
                        }
                    }
                }
            }
        } catch (error) {
            debug('P1', `Old collision detection failed - using Ammo.js raycast instead: ${error.message}`);
        }
    }

    /**
     * Native Ammo.js collision detection using collision manifolds
     */
    processNativeCollisions() {
        try {
            const dispatcher = this.pm.physicsWorld.getDispatcher();
            const numManifolds = dispatcher.getNumManifolds();

            for (let i = 0; i < numManifolds; i++) {
                const contactManifold = dispatcher.getManifoldByIndexInternal(i);
                const numContacts = contactManifold.getNumContacts();

                if (numContacts > 0) {
                    this.handleNativeCollision(contactManifold);
                }
            }
        } catch (error) {
            debug('P1', `Native collision detection failed - using Ammo.js raycast instead: ${error.message}`);
        }
    }

    /**
     * Handle native collision manifold
     */
    handleNativeCollision(contactManifold) {
        const Ammo = this.pm.Ammo;
        const rigidBody0 = Ammo.castObject(contactManifold.getBody0(), Ammo.btRigidBody);
        const rigidBody1 = Ammo.castObject(contactManifold.getBody1(), Ammo.btRigidBody);

        const entity0 = this.pm.entityMetadata.get(rigidBody0);
        const entity1 = this.pm.entityMetadata.get(rigidBody1);

        if (!entity0 || !entity1) return;

        let projectile = null;
        let target = null;

        if (entity0.type === 'projectile' && entity1.type !== 'projectile') {
            projectile = entity0;
            target = entity1;
        } else if (entity1.type === 'projectile' && entity0.type !== 'projectile') {
            projectile = entity1;
            target = entity0;
        } else {
            return;
        }

        const contactPoint = contactManifold.getContactPoint(0);
        const worldPos = contactPoint.getPositionWorldOnB();
        const contactPosThree = new THREE.Vector3(worldPos.x(), worldPos.y(), worldPos.z());

        const targetRigidBody = target.type === 'projectile' ? rigidBody0 : rigidBody1;
        this.handleProjectileCollision(projectile, contactPosThree, targetRigidBody);
    }

    /**
     * Handle individual projectile collision
     * @param {Object} projectile The projectile object
     * @param {Object} contactPoint The collision contact point
     * @param {Object} otherBody The other body in the collision
     */
    handleProjectileCollision(projectile, contactPoint, otherBody) {
        try {
            let otherObject = null;
            for (const [threeObj, rigidBody] of this.pm.rigidBodies.entries()) {
                if (rigidBody === otherBody) {
                    otherObject = threeObj;
                    break;
                }
            }

            if (projectile && typeof projectile.onCollision === 'function') {
                const contactData = {
                    position: contactPoint.position || contactPoint,
                    impulse: 1.0
                };
                projectile.onCollision(contactData, otherObject);
            }
        } catch (error) {
            debug('P1', `Error handling projectile collision: ${error.message}`);
        }
    }

    /**
     * Process collisions manually during physics update
     */
    processCollisions() {
        if (!this.pm.initialized) return;

        try {
            const dispatcher = this.pm.physicsWorld.getDispatcher();
            const numManifolds = dispatcher.getNumManifolds();

            for (let i = 0; i < numManifolds; i++) {
                let contactManifold = null;
                let numContacts = 0;

                try {
                    contactManifold = dispatcher.getManifoldByIndexInternal(i);
                    if (contactManifold) {
                        numContacts = contactManifold.getNumContacts();
                    }
                } catch (error) {
                    if (this.pm._debugLoggingEnabled) {
                        debug('P1', `❌ Error getting manifold ${i}: ${error.message}`);
                    }
                    continue;
                }

                if (numContacts > 0) {
                    if (this.pm._debugLoggingEnabled) {
                        debug('UTILITY', `💥 Processing ${numContacts} contacts for manifold ${i}`);
                    }

                    let bodyA = null, bodyB = null;
                    try {
                        bodyA = contactManifold.getBody0();
                        bodyB = contactManifold.getBody1();
                    } catch (error) {
                        if (this.pm._debugLoggingEnabled) {
                            debug('P1', `❌ Error getting bodies: ${error.message}`);
                        }
                        continue;
                    }

                    let entityA = this.pm.entityMetadata.get(bodyA);
                    let entityB = this.pm.entityMetadata.get(bodyB);

                    if (entityA && entityB) {
                        if (this.pm._debugLoggingEnabled) {
                            debug('UTILITY', `💥 COLLISION: ${entityA.type} <-> ${entityB.type}`);
                        }
                        try {
                            this.handleCollision(entityA, entityB, contactManifold);
                        } catch (error) {
                            debug('P1', `❌ Error in handleCollision: ${error.message}`);
                        }
                    }
                }
            }
        } catch (error) {
            debug('P1', `Error processing collisions: ${error.message}`);
        }
    }

    /**
     * Handle a collision between two entities
     * @param {object} entityA - First entity
     * @param {object} entityB - Second entity
     * @param {object} contactManifold - Contact manifold
     */
    handleCollision(entityA, entityB, contactManifold) {
        const pairKey = this.getCollisionPairKey(entityA.id, entityB.id);
        const currentTime = Date.now();

        if (this.pm.collisionPairs.has(pairKey)) {
            const lastTime = this.pm.collisionPairs.get(pairKey);
            if (currentTime - lastTime < 100) {
                return;
            }
        }

        this.pm.collisionPairs.set(pairKey, currentTime);

        const impulse = this.calculateCollisionImpulse(contactManifold);

        if (entityA.type === 'enemy_ship' && entityB.type === 'enemy_ship') {
            this.handleShipToShipCollision(entityA, entityB, impulse);
        } else if ((entityA.type === 'enemy_ship' && (entityB.type === 'planet' || entityB.type === 'moon' || entityB.type === 'star')) ||
            (entityB.type === 'enemy_ship' && (entityA.type === 'planet' || entityA.type === 'moon' || entityA.type === 'star'))) {
            this.handleShipToCelestialCollision(entityA, entityB, impulse);
        } else if ((entityA.type === 'enemy_ship' && entityB.type === 'station') ||
            (entityB.type === 'enemy_ship' && entityA.type === 'station')) {
            this.handleShipToStationCollision(entityA, entityB, impulse);
        } else if ((entityA.type === 'projectile' && entityB.type === 'enemy_ship') ||
            (entityB.type === 'projectile' && entityA.type === 'enemy_ship')) {
            this.handleProjectileToShipCollision(entityA, entityB, impulse);
        } else if ((entityA.type === 'projectile' && (entityB.type === 'planet' || entityB.type === 'moon' || entityB.type === 'star')) ||
            (entityB.type === 'projectile' && (entityA.type === 'planet' || entityA.type === 'moon' || entityA.type === 'star'))) {
            this.handleProjectileToCelestialCollision(entityA, entityB, impulse);
        }

        this.notifyCollisionCallbacks(entityA, entityB, impulse);

        debug('UTILITY', `💥 Collision detected: ${entityA.type} (${entityA.id}) <-> ${entityB.type} (${entityB.id}), impulse: ${impulse.toFixed(2)}`);
    }

    /**
     * Handle ship-to-ship collision
     */
    handleShipToShipCollision(shipA, shipB, impulse) {
        const damageA = Math.min(impulse * 0.1, shipA.health * 0.3);
        const damageB = Math.min(impulse * 0.1, shipB.health * 0.3);

        if (shipA.threeObject.userData?.ship) {
            this.applyCollisionDamage(shipA.threeObject.userData.ship, damageA);
        }
        if (shipB.threeObject.userData?.ship) {
            this.applyCollisionDamage(shipB.threeObject.userData.ship, damageB);
        }

        this.applyBouncingEffect(shipA.threeObject, shipB.threeObject, impulse);

        debug('COMBAT', `🚀💥 Ship collision: ${shipA.id} took ${damageA.toFixed(1)} damage, ${shipB.id} took ${damageB.toFixed(1)} damage`);
    }

    /**
     * Handle ship-to-celestial body collision
     */
    handleShipToCelestialCollision(entityA, entityB, impulse) {
        const ship = entityA.type === 'enemy_ship' ? entityA : entityB;
        const celestial = entityA.type === 'enemy_ship' ? entityB : entityA;

        const damage = Math.min(impulse * 0.5, ship.health * 0.8);

        if (ship.threeObject.userData?.ship) {
            this.applyCollisionDamage(ship.threeObject.userData.ship, damage);
        }

        this.applyStrongBounce(ship.threeObject, celestial.threeObject, impulse);

        debug('COMBAT', `🌍💥 Ship-to-celestial collision: ${ship.id} hit ${celestial.id}, took ${damage.toFixed(1)} damage`);
    }

    /**
     * Handle ship-to-station collision
     */
    handleShipToStationCollision(entityA, entityB, impulse) {
        const ship = entityA.type === 'enemy_ship' ? entityA : entityB;
        const station = entityA.type === 'enemy_ship' ? entityB : entityA;

        const damage = Math.min(impulse * 0.2, ship.health * 0.4);

        if (ship.threeObject.userData?.ship) {
            this.applyCollisionDamage(ship.threeObject.userData.ship, damage);
        }

        this.applyBouncingEffect(ship.threeObject, station.threeObject, impulse * 0.5);

        debug('COMBAT', `🏭💥 Ship-to-station collision: ${ship.id} hit ${station.id}, took ${damage.toFixed(1)} damage`);
    }

    /**
     * Handle projectile-to-ship collision
     */
    handleProjectileToShipCollision(entityA, entityB, impulse) {
        const projectile = entityA.type === 'projectile' ? entityA : entityB;
        const ship = entityA.type === 'projectile' ? entityB : entityA;

        debug('UTILITY', `🚀💥 Projectile collision: ${projectile.id} hit ${ship.id}`);

        let projectileInstance = null;

        const rigidBody = this.pm.rigidBodies.get(projectile.threeObject);
        if (rigidBody && rigidBody.projectileOwner) {
            projectileInstance = rigidBody.projectileOwner;
            debug('UTILITY', `🔍 Found projectile instance via rigidBody.projectileOwner for ${projectile.id}`);
        } else {
            debug('PHYSICS', `No rigidBody.projectileOwner found for ${projectile.id}`);
        }

        if (projectileInstance && typeof projectileInstance.onCollision === 'function') {
            debug('UTILITY', `🔥 Calling projectile onCollision for ${projectile.id}`);

            const contactPoint = {
                position: projectile.threeObject?.position.clone() || { x: 0, y: 0, z: 0 },
                impulse: impulse
            };

            projectileInstance.onCollision(contactPoint, ship.threeObject);
        } else {
            debug('UTILITY', `Could not find projectile instance with onCollision method for ${projectile.id}`);
        }
    }

    /**
     * Handle projectile-to-celestial collision
     */
    handleProjectileToCelestialCollision(entityA, entityB, impulse) {
        const projectile = entityA.type === 'projectile' ? entityA : entityB;
        const celestial = entityA.type === 'projectile' ? entityB : entityA;

        debug('UTILITY', `🌍💥 Projectile-to-celestial collision: ${projectile.id} hit ${celestial.id}`);

        let projectileInstance = null;

        const rigidBody = this.pm.rigidBodies.get(projectile.threeObject);
        if (rigidBody && rigidBody.projectileOwner) {
            projectileInstance = rigidBody.projectileOwner;
            debug('UTILITY', `🔍 Found projectile instance via rigidBody.projectileOwner for ${projectile.id} (celestial collision)`);
        } else {
            debug('UTILITY', `No rigidBody.projectileOwner found for ${projectile.id} (celestial collision)`);
        }

        if (projectileInstance && typeof projectileInstance.onCollision === 'function') {
            debug('UTILITY', `🔥 Calling projectile onCollision for ${projectile.id} (hit celestial body)`);

            const contactPoint = {
                position: projectile.threeObject?.position || { x: 0, y: 0, z: 0 },
                impulse: impulse
            };

            projectileInstance.onCollision(contactPoint, celestial.threeObject);
        } else {
            debug('UTILITY', `Could not find projectile instance with onCollision method for ${projectile.id} (celestial collision)`);
        }
    }

    /**
     * Calculate collision impulse from contact manifold
     */
    calculateCollisionImpulse(contactManifold) {
        let totalImpulse = 0;
        const numContacts = contactManifold.getNumContacts();

        for (let i = 0; i < numContacts; i++) {
            const contactPoint = contactManifold.getContactPoint(i);

            let distance = -0.1;
            try {
                if (typeof contactPoint.getDistance === 'function') {
                    distance = contactPoint.getDistance();
                } else {
                    distance = -0.1;
                }
            } catch (error) {
                debug('P1', 'Error getting contact distance for impulse, using fallback:', error.message);
                distance = -0.1;
            }

            if (distance < 0) {
                totalImpulse += Math.abs(distance) * 1000;
            }
        }

        return totalImpulse;
    }

    /**
     * Apply collision damage to a ship
     */
    applyCollisionDamage(ship, damage) {
        if (damage <= 0) return;

        try {
            ship.currentHull = Math.max(0, ship.currentHull - damage);

            const systems = Array.from(ship.systems.keys());
            const damageableSystemNames = systems.filter(name =>
                !['hull_plating', 'energy_reactor'].includes(name)
            );

            const operationalSystems = damageableSystemNames.filter(systemName => {
                const system = ship.getSystem(systemName);
                return system && system.currentHealth > 0;
            });

            if (operationalSystems.length > 0) {
                const randomSystem = operationalSystems[Math.floor(Math.random() * operationalSystems.length)];
                const system = ship.getSystem(randomSystem);

                if (system) {
                    const systemDamage = damage * 0.3;
                    system.takeDamage(systemDamage);
                    debug('COMBAT', `🔧 Collision damaged ${randomSystem}: ${systemDamage.toFixed(1)} damage`);
                }
            } else {
                debug('COMBAT', `🔧 Collision: No operational systems available for random damage`);
            }
        } catch (error) {
            debug('P1', `Error applying collision damage: ${error.message}`);
        }
    }

    /**
     * Apply bouncing effect between two objects
     */
    applyBouncingEffect(objectA, objectB, impulse) {
        try {
            const rigidBodyA = this.pm.getRigidBody(objectA);
            const rigidBodyB = this.pm.getRigidBody(objectB);

            if (rigidBodyA && rigidBodyB) {
                const direction = new THREE.Vector3()
                    .subVectors(objectA.position, objectB.position)
                    .normalize();

                const bounceForce = Math.min(impulse * 0.1, 100);
                const impulseVector = new this.pm.Ammo.btVector3(
                    direction.x * bounceForce,
                    direction.y * bounceForce,
                    direction.z * bounceForce
                );

                rigidBodyA.applyCentralImpulse(impulseVector);

                if (rigidBodyB.getMass() > 0) {
                    const oppositeImpulse = new this.pm.Ammo.btVector3(
                        -direction.x * bounceForce * 0.5,
                        -direction.y * bounceForce * 0.5,
                        -direction.z * bounceForce * 0.5
                    );
                    rigidBodyB.applyCentralImpulse(oppositeImpulse);
                }
            }
        } catch (error) {
            debug('P1', `Error applying bouncing effect: ${error.message}`);
        }
    }

    /**
     * Apply strong bounce away from celestial body
     */
    applyStrongBounce(ship, celestial, impulse) {
        try {
            const rigidBody = this.pm.getRigidBody(ship);
            if (rigidBody) {
                const direction = new THREE.Vector3()
                    .subVectors(ship.position, celestial.position)
                    .normalize();

                const bounceForce = Math.min(impulse * 0.3, 500);
                const impulseVector = new this.pm.Ammo.btVector3(
                    direction.x * bounceForce,
                    direction.y * bounceForce,
                    direction.z * bounceForce
                );

                rigidBody.applyCentralImpulse(impulseVector);
            }
        } catch (error) {
            debug('P1', `Error applying strong bounce: ${error.message}`);
        }
    }

    /**
     * Get collision pair key for tracking
     */
    getCollisionPairKey(idA, idB) {
        return idA < idB ? `${idA}_${idB}` : `${idB}_${idA}`;
    }

    /**
     * Notify all collision callbacks
     */
    notifyCollisionCallbacks(entityA, entityB, impulse) {
        this.pm.collisionCallbacks.forEach(callback => {
            try {
                callback(entityA, entityB, impulse);
            } catch (error) {
                debug('P1', `Error in collision callback: ${error.message}`);
            }
        });
    }

    /**
     * Add collision callback
     */
    addCollisionCallback(callback) {
        this.pm.collisionCallbacks.push(callback);
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.pm = null;
    }
}
