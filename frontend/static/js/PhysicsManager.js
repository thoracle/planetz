/**
 * PhysicsManager - Handles Ammo.js physics integration for Planetz
 * 
 * Features:
 * - Zero gravity physics world for space simulation
 * - Spatial tracking and queries for ships, stations, and planets
 * - Collision detection and response
 * - Raycast weapon systems
 * - Projectile physics for missiles
 */

export class PhysicsManager {
    constructor() {
        this.Ammo = null;
        this.physicsWorld = null;
        this.rigidBodies = new Map(); // Map of Three.js objects to Ammo.js rigid bodies
        this.entityMetadata = new Map(); // Map of rigid bodies to game entity data
        this.initialized = false;
        this.updateCallbacks = [];
        this.collisionCallbacks = [];
        
        // Collision detection
        this.collisionPairs = new Map(); // Track collision pairs to avoid duplicate processing
        this.collisionEvents = [];
        this.lastCollisionTime = 0;
        
        // Performance settings
        this.maxEntities = 1000;
        this.spatialQueryDistance = 5000; // Units beyond which entities are deactivated
        this.physicsUpdateRate = 60; // Hz
        this.lastUpdateTime = 0;
    }

    /**
     * Initialize the physics engine
     * @returns {Promise<boolean>} True if initialization succeeds
     */
    async initialize() {
        try {
            console.log('Initializing Ammo.js physics engine...');
            
            // Initialize Ammo.js - handle both async and sync loading
            if (typeof Ammo === 'function') {
                // Check if Ammo returns a promise (CDN loading) or is directly available (local loading)
                const ammoResult = Ammo();
                if (ammoResult && typeof ammoResult.then === 'function') {
                    // Promise-based loading (CDN)
                    this.Ammo = await ammoResult;
                } else {
                    // Direct loading (local file) - Ammo() returns the module directly
                    this.Ammo = ammoResult || Ammo;
                }
            } else {
                throw new Error('Ammo.js is not available');
            }
            
            if (!this.Ammo) {
                throw new Error('Failed to initialize Ammo.js module');
            }
            
            // Set up collision configuration
            const collisionConfig = new this.Ammo.btDefaultCollisionConfiguration();
            const dispatcher = new this.Ammo.btCollisionDispatcher(collisionConfig);
            const broadphase = new this.Ammo.btDbvtBroadphase();
            const solver = new this.Ammo.btSequentialImpulseConstraintSolver();
            
            // Create physics world with zero gravity (space environment)
            this.physicsWorld = new this.Ammo.btDiscreteDynamicsWorld(
                dispatcher, 
                broadphase, 
                solver, 
                collisionConfig
            );
            
            // Set zero gravity for space simulation
            this.physicsWorld.setGravity(new this.Ammo.btVector3(0, 0, 0));
            
            // Enable collision detection
            this.physicsWorld.getDispatchInfo().set_m_allowedCcdPenetration(0.0001);
            
            // Set up collision detection
            this.setupCollisionDetection();
            
            this.initialized = true;
            console.log('🚀 PhysicsManager initialized successfully with local Ammo.js');
            
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize PhysicsManager:', error);
            return false;
        }
    }

    /**
     * Create a rigid body for a spaceship
     * @param {THREE.Object3D} threeObject - The Three.js object
     * @param {object} options - Physics options
     * @returns {object} The created rigid body
     */
    createShipRigidBody(threeObject, options = {}) {
        if (!this.initialized) {
            console.error('PhysicsManager not initialized');
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
            health = 100
        } = options;

        try {
            // Create box shape for ship
            const shape = new this.Ammo.btBoxShape(
                new this.Ammo.btVector3(width / 2, height / 2, depth / 2)
            );

            // Set up transform
            const transform = new this.Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new this.Ammo.btVector3(
                threeObject.position.x,
                threeObject.position.y,
                threeObject.position.z
            ));
            transform.setRotation(new this.Ammo.btQuaternion(
                threeObject.quaternion.x,
                threeObject.quaternion.y,
                threeObject.quaternion.z,
                threeObject.quaternion.w
            ));

            // Create motion state
            const motionState = new this.Ammo.btDefaultMotionState(transform);

            // Calculate local inertia
            const inertia = new this.Ammo.btVector3(0, 0, 0);
            shape.calculateLocalInertia(mass, inertia);

            // Create rigid body
            const rbInfo = new this.Ammo.btRigidBodyConstructionInfo(
                mass,
                motionState,
                shape,
                inertia
            );
            const rigidBody = new this.Ammo.btRigidBody(rbInfo);

            // Set physics properties
            rigidBody.setRestitution(restitution);
            rigidBody.setFriction(friction);
            rigidBody.setDamping(0.1, 0.1); // Linear and angular damping for space

            // Set user data for collision detection
            rigidBody.userData = {
                type: entityType,
                id: entityId,
                health: health,
                threeObject: threeObject
            };

            // Add to physics world
            this.physicsWorld.addRigidBody(rigidBody);

            // Store references
            this.rigidBodies.set(threeObject, rigidBody);
            this.entityMetadata.set(rigidBody, {
                type: entityType,
                id: entityId,
                health: health,
                threeObject: threeObject
            });

            console.log(`Created ship rigid body for ${entityType} ${entityId}`);
            return rigidBody;

        } catch (error) {
            console.error('Error creating ship rigid body:', error);
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
        if (!this.initialized) {
            console.error('PhysicsManager not initialized');
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
            // Create box shape for station
            const shape = new this.Ammo.btBoxShape(
                new this.Ammo.btVector3(width / 2, height / 2, depth / 2)
            );

            // Set up transform
            const transform = new this.Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new this.Ammo.btVector3(
                threeObject.position.x,
                threeObject.position.y,
                threeObject.position.z
            ));

            // Create static rigid body (mass = 0)
            const motionState = new this.Ammo.btDefaultMotionState(transform);
            const rbInfo = new this.Ammo.btRigidBodyConstructionInfo(
                0, // Static body
                motionState,
                shape,
                new this.Ammo.btVector3(0, 0, 0)
            );
            const rigidBody = new this.Ammo.btRigidBody(rbInfo);

            // Set user data
            rigidBody.userData = {
                type: entityType,
                id: entityId,
                health: health,
                threeObject: threeObject
            };

            // Add to physics world
            this.physicsWorld.addRigidBody(rigidBody);

            // Store references
            this.rigidBodies.set(threeObject, rigidBody);
            this.entityMetadata.set(rigidBody, {
                type: entityType,
                id: entityId,
                health: health,
                threeObject: threeObject
            });

            console.log(`Created station rigid body for ${entityType} ${entityId}`);
            return rigidBody;

        } catch (error) {
            console.error('Error creating station rigid body:', error);
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
        if (!this.initialized) {
            console.error('PhysicsManager not initialized');
            return null;
        }

        const {
            radius = 100,
            entityType = 'planet',
            entityId = null,
            health = 10000
        } = options;

        try {
            // Create sphere shape for planet
            const shape = new this.Ammo.btSphereShape(radius);

            // Set up transform
            const transform = new this.Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new this.Ammo.btVector3(
                threeObject.position.x,
                threeObject.position.y,
                threeObject.position.z
            ));

            // Create static rigid body (mass = 0)
            const motionState = new this.Ammo.btDefaultMotionState(transform);
            const rbInfo = new this.Ammo.btRigidBodyConstructionInfo(
                0, // Static body
                motionState,
                shape,
                new this.Ammo.btVector3(0, 0, 0)
            );
            const rigidBody = new this.Ammo.btRigidBody(rbInfo);

            // Set user data
            rigidBody.userData = {
                type: entityType,
                id: entityId,
                health: health,
                threeObject: threeObject
            };

            // Add to physics world
            this.physicsWorld.addRigidBody(rigidBody);

            // Store references
            this.rigidBodies.set(threeObject, rigidBody);
            this.entityMetadata.set(rigidBody, {
                type: entityType,
                id: entityId,
                health: health,
                threeObject: threeObject
            });

            console.log(`Created planet rigid body for ${entityType} ${entityId}`);
            return rigidBody;

        } catch (error) {
            console.error('Error creating planet rigid body:', error);
            return null;
        }
    }

    /**
     * Perform spatial query to find nearby entities
     * @param {THREE.Vector3} position - Search position
     * @param {number} radius - Search radius
     * @returns {Array} Array of nearby entities
     */
    spatialQuery(position, radius = 1000) {
        if (!this.initialized) {
            console.error('PhysicsManager not initialized');
            return [];
        }

        try {
            // Create ghost object for spatial query
            const ghost = new this.Ammo.btGhostObject();
            const shape = new this.Ammo.btSphereShape(radius);
            ghost.setCollisionShape(shape);

            // Set ghost position
            const transform = new this.Ammo.btTransform();
            transform.setIdentity();
            transform.setOrigin(new this.Ammo.btVector3(position.x, position.y, position.z));
            ghost.setWorldTransform(transform);

            // Add to world temporarily
            this.physicsWorld.addCollisionObject(ghost);

            // Get overlapping objects
            const overlaps = [];
            const numOverlaps = ghost.getNumOverlappingObjects();
            for (let i = 0; i < numOverlaps; i++) {
                const overlappingObject = ghost.getOverlappingObject(i);
                const metadata = this.entityMetadata.get(overlappingObject);
                if (metadata) {
                    overlaps.push(metadata);
                }
            }

            // Clean up
            this.physicsWorld.removeCollisionObject(ghost);
            this.Ammo.destroy(ghost);

            return overlaps;

        } catch (error) {
            console.error('Error performing spatial query:', error);
            return [];
        }
    }

    /**
     * Perform raycast for laser weapons
     * @param {THREE.Vector3} origin - Ray origin
     * @param {THREE.Vector3} direction - Ray direction (normalized)
     * @param {number} maxDistance - Maximum ray distance
     * @returns {object|null} Hit result or null
     */
    raycast(origin, direction, maxDistance = 1000) {
        if (!this.initialized) {
            console.error('PhysicsManager not initialized');
            return null;
        }

        try {
            const rayStart = new this.Ammo.btVector3(origin.x, origin.y, origin.z);
            const rayEnd = new this.Ammo.btVector3(
                origin.x + direction.x * maxDistance,
                origin.y + direction.y * maxDistance,
                origin.z + direction.z * maxDistance
            );

            const rayCallback = new this.Ammo.ClosestRayResultCallback(rayStart, rayEnd);
            this.physicsWorld.rayTest(rayStart, rayEnd, rayCallback);

            if (rayCallback.hasHit()) {
                const hitBody = rayCallback.get_m_collisionObject();
                const hitPoint = rayCallback.get_m_hitPointWorld();
                const hitNormal = rayCallback.get_m_hitNormalWorld();
                const metadata = this.entityMetadata.get(hitBody);

                const result = {
                    hit: true,
                    body: hitBody,
                    point: new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z()),
                    normal: new THREE.Vector3(hitNormal.x(), hitNormal.y(), hitNormal.z()),
                    distance: rayCallback.get_m_closestHitFraction() * maxDistance,
                    entity: metadata
                };

                this.Ammo.destroy(rayCallback);
                return result;
            }

            this.Ammo.destroy(rayCallback);
            return null;

        } catch (error) {
            console.error('Error performing raycast:', error);
            return null;
        }
    }

    /**
     * Update physics simulation
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        if (!this.initialized) return;

        try {
            // Update physics world
            this.physicsWorld.stepSimulation(deltaTime, 10);

            // Sync Three.js objects with physics bodies
            this.syncThreeJSWithPhysics();

            // Call update callbacks
            this.updateCallbacks.forEach(callback => {
                try {
                    callback(deltaTime);
                } catch (error) {
                    console.error('Error in physics update callback:', error);
                }
            });

        } catch (error) {
            console.error('Error updating physics:', error);
        }
    }

    /**
     * Synchronize Three.js objects with physics bodies
     */
    syncThreeJSWithPhysics() {
        this.rigidBodies.forEach((rigidBody, threeObject) => {
            try {
                if (rigidBody.isActive()) {
                    const motionState = rigidBody.getMotionState();
                    if (motionState) {
                        const transform = new this.Ammo.btTransform();
                        motionState.getWorldTransform(transform);
                        
                        const origin = transform.getOrigin();
                        const rotation = transform.getRotation();
                        
                        // Update Three.js object position and rotation
                        threeObject.position.set(origin.x(), origin.y(), origin.z());
                        threeObject.quaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());
                    }
                }
            } catch (error) {
                console.error('Error syncing object with physics:', error);
            }
        });
    }

    /**
     * Remove a rigid body from physics world
     * @param {THREE.Object3D} threeObject - The Three.js object
     */
    removeRigidBody(threeObject) {
        if (!this.initialized) return;

        const rigidBody = this.rigidBodies.get(threeObject);
        if (rigidBody) {
            this.physicsWorld.removeRigidBody(rigidBody);
            this.rigidBodies.delete(threeObject);
            this.entityMetadata.delete(rigidBody);
            this.Ammo.destroy(rigidBody);
        }
    }

    /**
     * Add update callback
     * @param {Function} callback - Callback function
     */
    addUpdateCallback(callback) {
        this.updateCallbacks.push(callback);
    }

    /**
     * Remove update callback
     * @param {Function} callback - Callback function
     */
    removeUpdateCallback(callback) {
        const index = this.updateCallbacks.indexOf(callback);
        if (index > -1) {
            this.updateCallbacks.splice(index, 1);
        }
    }

    /**
     * Add collision callback
     * @param {Function} callback - Callback function
     */
    addCollisionCallback(callback) {
        this.collisionCallbacks.push(callback);
    }

    /**
     * Get physics world for advanced operations
     * @returns {object} The Ammo.js physics world
     */
    getPhysicsWorld() {
        return this.physicsWorld;
    }

    /**
     * Get rigid body for a Three.js object
     * @param {THREE.Object3D} threeObject - The Three.js object
     * @returns {object|null} The rigid body or null
     */
    getRigidBody(threeObject) {
        return this.rigidBodies.get(threeObject);
    }

    /**
     * Set up collision detection system
     */
    setupCollisionDetection() {
        if (!this.initialized) return;

        // Enable collision callbacks
        this.physicsWorld.setCollisionEventCallback(this.onCollisionEvent.bind(this));
        
        console.log('🚨 Collision detection system initialized');
    }

    /**
     * Handle collision events from Ammo.js
     * @param {object} collisionEvent - Collision event data
     */
    onCollisionEvent(collisionEvent) {
        // This will be called by Ammo.js when collisions occur
        // For now, we'll use manual collision detection in the update loop
        // as Ammo.js callback setup can be complex
    }

    /**
     * Process collisions manually during physics update
     */
    processCollisions() {
        if (!this.initialized) return;

        try {
            const dispatcher = this.physicsWorld.getDispatcher();
            const numManifolds = dispatcher.getNumManifolds();

            for (let i = 0; i < numManifolds; i++) {
                const contactManifold = dispatcher.getManifoldByIndexInternal(i);
                const numContacts = contactManifold.getNumContacts();

                if (numContacts > 0) {
                    const bodyA = contactManifold.getBody0();
                    const bodyB = contactManifold.getBody1();
                    
                    const entityA = this.entityMetadata.get(bodyA);
                    const entityB = this.entityMetadata.get(bodyB);

                    if (entityA && entityB) {
                        this.handleCollision(entityA, entityB, contactManifold);
                    }
                }
            }
        } catch (error) {
            console.error('Error processing collisions:', error);
        }
    }

    /**
     * Handle a collision between two entities
     * @param {object} entityA - First entity
     * @param {object} entityB - Second entity
     * @param {object} contactManifold - Contact manifold
     */
    handleCollision(entityA, entityB, contactManifold) {
        // Create collision pair key for tracking
        const pairKey = this.getCollisionPairKey(entityA.id, entityB.id);
        const currentTime = Date.now();
        
        // Avoid processing the same collision pair too frequently
        if (this.collisionPairs.has(pairKey)) {
            const lastTime = this.collisionPairs.get(pairKey);
            if (currentTime - lastTime < 100) { // 100ms cooldown
                return;
            }
        }
        
        this.collisionPairs.set(pairKey, currentTime);

        // Calculate collision impulse
        const impulse = this.calculateCollisionImpulse(contactManifold);
        
        // Handle different collision types
        if (entityA.type === 'enemy_ship' && entityB.type === 'enemy_ship') {
            this.handleShipToShipCollision(entityA, entityB, impulse);
        } else if ((entityA.type === 'enemy_ship' && (entityB.type === 'planet' || entityB.type === 'moon' || entityB.type === 'star')) ||
                   (entityB.type === 'enemy_ship' && (entityA.type === 'planet' || entityA.type === 'moon' || entityA.type === 'star'))) {
            this.handleShipToCelestialCollision(entityA, entityB, impulse);
        } else if ((entityA.type === 'enemy_ship' && entityB.type === 'station') ||
                   (entityB.type === 'enemy_ship' && entityA.type === 'station')) {
            this.handleShipToStationCollision(entityA, entityB, impulse);
        }
        
        // Notify collision callbacks
        this.notifyCollisionCallbacks(entityA, entityB, impulse);
        
        console.log(`💥 Collision detected: ${entityA.type} (${entityA.id}) <-> ${entityB.type} (${entityB.id}), impulse: ${impulse.toFixed(2)}`);
    }

    /**
     * Handle ship-to-ship collision
     * @param {object} shipA - First ship entity
     * @param {object} shipB - Second ship entity
     * @param {number} impulse - Collision impulse
     */
    handleShipToShipCollision(shipA, shipB, impulse) {
        // Calculate damage based on impulse and mass
        const damageA = Math.min(impulse * 0.1, shipA.health * 0.3); // Max 30% health damage
        const damageB = Math.min(impulse * 0.1, shipB.health * 0.3);
        
        // Apply damage to ships
        if (shipA.threeObject.userData?.ship) {
            this.applyCollisionDamage(shipA.threeObject.userData.ship, damageA);
        }
        if (shipB.threeObject.userData?.ship) {
            this.applyCollisionDamage(shipB.threeObject.userData.ship, damageB);
        }
        
        // Apply bouncing effect
        this.applyBouncingEffect(shipA.threeObject, shipB.threeObject, impulse);
        
        console.log(`🚀💥 Ship collision: ${shipA.id} took ${damageA.toFixed(1)} damage, ${shipB.id} took ${damageB.toFixed(1)} damage`);
    }

    /**
     * Handle ship-to-celestial body collision
     * @param {object} entityA - First entity
     * @param {object} entityB - Second entity
     * @param {number} impulse - Collision impulse
     */
    handleShipToCelestialCollision(entityA, entityB, impulse) {
        // Determine which is the ship and which is the celestial body
        const ship = entityA.type === 'enemy_ship' ? entityA : entityB;
        const celestial = entityA.type === 'enemy_ship' ? entityB : entityA;
        
        // Ships take much more damage when hitting planets/stars
        const damage = Math.min(impulse * 0.5, ship.health * 0.8); // Up to 80% damage
        
        if (ship.threeObject.userData?.ship) {
            this.applyCollisionDamage(ship.threeObject.userData.ship, damage);
        }
        
        // Strong bouncing effect away from celestial body
        this.applyStrongBounce(ship.threeObject, celestial.threeObject, impulse);
        
        console.log(`🌍💥 Ship-to-celestial collision: ${ship.id} hit ${celestial.id}, took ${damage.toFixed(1)} damage`);
    }

    /**
     * Handle ship-to-station collision
     * @param {object} entityA - First entity
     * @param {object} entityB - Second entity
     * @param {number} impulse - Collision impulse
     */
    handleShipToStationCollision(entityA, entityB, impulse) {
        // Determine which is the ship and which is the station
        const ship = entityA.type === 'enemy_ship' ? entityA : entityB;
        const station = entityA.type === 'enemy_ship' ? entityB : entityA;
        
        // Moderate damage for station collisions
        const damage = Math.min(impulse * 0.2, ship.health * 0.4); // Up to 40% damage
        
        if (ship.threeObject.userData?.ship) {
            this.applyCollisionDamage(ship.threeObject.userData.ship, damage);
        }
        
        // Gentle bouncing for station collisions
        this.applyBouncingEffect(ship.threeObject, station.threeObject, impulse * 0.5);
        
        console.log(`🏭💥 Ship-to-station collision: ${ship.id} hit ${station.id}, took ${damage.toFixed(1)} damage`);
    }

    /**
     * Calculate collision impulse from contact manifold
     * @param {object} contactManifold - Contact manifold
     * @returns {number} Collision impulse
     */
    calculateCollisionImpulse(contactManifold) {
        let totalImpulse = 0;
        const numContacts = contactManifold.getNumContacts();
        
        for (let i = 0; i < numContacts; i++) {
            const contactPoint = contactManifold.getContactPoint(i);
            const distance = contactPoint.getDistance();
            
            if (distance < 0) { // Penetrating contact
                totalImpulse += Math.abs(distance) * 1000; // Scale factor
            }
        }
        
        return totalImpulse;
    }

    /**
     * Apply collision damage to a ship
     * @param {object} ship - Ship instance
     * @param {number} damage - Damage amount
     */
    applyCollisionDamage(ship, damage) {
        if (damage <= 0) return;
        
        try {
            // Apply hull damage
            ship.currentHull = Math.max(0, ship.currentHull - damage);
            
            // Apply random system damage
            const systems = Array.from(ship.systems.keys());
            const damageableSystemNames = systems.filter(name => 
                !['hull_plating', 'energy_reactor'].includes(name)
            );
            
            if (damageableSystemNames.length > 0) {
                const randomSystem = damageableSystemNames[Math.floor(Math.random() * damageableSystemNames.length)];
                const system = ship.getSystem(randomSystem);
                
                if (system) {
                    const systemDamage = damage * 0.3; // 30% of collision damage to systems
                    system.takeDamage(systemDamage);
                    console.log(`🔧 Collision damaged ${randomSystem}: ${systemDamage.toFixed(1)} damage`);
                }
            }
            
        } catch (error) {
            console.error('Error applying collision damage:', error);
        }
    }

    /**
     * Apply bouncing effect between two objects
     * @param {THREE.Object3D} objectA - First object
     * @param {THREE.Object3D} objectB - Second object
     * @param {number} impulse - Collision impulse
     */
    applyBouncingEffect(objectA, objectB, impulse) {
        try {
            const rigidBodyA = this.getRigidBody(objectA);
            const rigidBodyB = this.getRigidBody(objectB);
            
            if (rigidBodyA && rigidBodyB) {
                // Calculate bounce direction
                const direction = new THREE.Vector3()
                    .subVectors(objectA.position, objectB.position)
                    .normalize();
                
                // Apply impulse for bouncing
                const bounceForce = Math.min(impulse * 0.1, 100); // Limit bounce force
                const impulseVector = new this.Ammo.btVector3(
                    direction.x * bounceForce,
                    direction.y * bounceForce,
                    direction.z * bounceForce
                );
                
                rigidBodyA.applyCentralImpulse(impulseVector);
                
                // Apply opposite force to second object if it's dynamic
                if (rigidBodyB.getMass() > 0) {
                    const oppositeImpulse = new this.Ammo.btVector3(
                        -direction.x * bounceForce * 0.5,
                        -direction.y * bounceForce * 0.5,
                        -direction.z * bounceForce * 0.5
                    );
                    rigidBodyB.applyCentralImpulse(oppositeImpulse);
                }
            }
        } catch (error) {
            console.error('Error applying bouncing effect:', error);
        }
    }

    /**
     * Apply strong bounce away from celestial body
     * @param {THREE.Object3D} ship - Ship object
     * @param {THREE.Object3D} celestial - Celestial body object
     * @param {number} impulse - Collision impulse
     */
    applyStrongBounce(ship, celestial, impulse) {
        try {
            const rigidBody = this.getRigidBody(ship);
            if (rigidBody) {
                // Calculate direction away from celestial body
                const direction = new THREE.Vector3()
                    .subVectors(ship.position, celestial.position)
                    .normalize();
                
                // Apply strong impulse away from celestial body
                const bounceForce = Math.min(impulse * 0.3, 500); // Stronger bounce for celestial collisions
                const impulseVector = new this.Ammo.btVector3(
                    direction.x * bounceForce,
                    direction.y * bounceForce,
                    direction.z * bounceForce
                );
                
                rigidBody.applyCentralImpulse(impulseVector);
            }
        } catch (error) {
            console.error('Error applying strong bounce:', error);
        }
    }

    /**
     * Get collision pair key for tracking
     * @param {string} idA - First entity ID
     * @param {string} idB - Second entity ID
     * @returns {string} Collision pair key
     */
    getCollisionPairKey(idA, idB) {
        return idA < idB ? `${idA}_${idB}` : `${idB}_${idA}`;
    }

    /**
     * Notify all collision callbacks
     * @param {object} entityA - First entity
     * @param {object} entityB - Second entity
     * @param {number} impulse - Collision impulse
     */
    notifyCollisionCallbacks(entityA, entityB, impulse) {
        this.collisionCallbacks.forEach(callback => {
            try {
                callback(entityA, entityB, impulse);
            } catch (error) {
                console.error('Error in collision callback:', error);
            }
        });
    }

    /**
     * Cleanup physics resources
     */
    cleanup() {
        if (!this.initialized) return;

        console.log('Cleaning up PhysicsManager...');

        // Remove all rigid bodies
        this.rigidBodies.forEach((rigidBody, threeObject) => {
            this.physicsWorld.removeRigidBody(rigidBody);
            this.Ammo.destroy(rigidBody);
        });

        this.rigidBodies.clear();
        this.entityMetadata.clear();
        this.updateCallbacks.length = 0;
        this.collisionCallbacks.length = 0;

        // Clean up physics world
        if (this.physicsWorld) {
            this.Ammo.destroy(this.physicsWorld);
            this.physicsWorld = null;
        }

        this.initialized = false;
        console.log('PhysicsManager cleanup complete');
    }
}

export default PhysicsManager; 