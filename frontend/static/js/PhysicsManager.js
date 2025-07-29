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
        this.rigidBodies = new Map(); // Three.js object -> rigid body
        this.entityMetadata = new Map(); // rigid body -> entity data
        this.initialized = false;
        this.updateCallbacks = [];
        this.collisionCallbacks = [];
        
        // Physics debug visualization
        this.debugMode = false;
        this.debugWireframes = new Map(); // rigid body -> wireframe mesh
        this.debugGroup = null; // Group to hold all debug wireframes
        
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
            } else if (typeof Ammo === 'object' && Ammo !== null) {
                // Ammo is already loaded as an object (script tag loading)
                this.Ammo = Ammo;
                console.log('🔍 Using Ammo.js as pre-loaded object');
            } else {
                throw new Error('Ammo.js is not available');
            }
            
            if (!this.Ammo) {
                throw new Error('Failed to initialize Ammo.js module');
            }
            
            console.log('🔍 Ammo.js available, checking components...');
            console.log('- btDefaultCollisionConfiguration:', typeof this.Ammo.btDefaultCollisionConfiguration);
            console.log('- btCollisionDispatcher:', typeof this.Ammo.btCollisionDispatcher);
            console.log('- btDbvtBroadphase:', typeof this.Ammo.btDbvtBroadphase);
            console.log('- btSequentialImpulseConstraintSolver:', typeof this.Ammo.btSequentialImpulseConstraintSolver);
            console.log('- btDiscreteDynamicsWorld:', typeof this.Ammo.btDiscreteDynamicsWorld);
            console.log('- btVector3:', typeof this.Ammo.btVector3);
            
            // Set up collision configuration
            console.log('🔧 Creating collision configuration...');
            const collisionConfig = new this.Ammo.btDefaultCollisionConfiguration();
            console.log('✅ Collision config created');
            
            console.log('🔧 Creating dispatcher...');
            const dispatcher = new this.Ammo.btCollisionDispatcher(collisionConfig);
            this.dispatcher = dispatcher; // Store dispatcher for collision detection
            console.log('✅ Dispatcher created');
            
            console.log('🔧 Creating broadphase...');
            const broadphase = new this.Ammo.btDbvtBroadphase();
            console.log('✅ Broadphase created');
            
            console.log('🔧 Creating solver...');
            const solver = new this.Ammo.btSequentialImpulseConstraintSolver();
            console.log('✅ Solver created');
            
            // Create physics world with zero gravity (space environment)
            console.log('🔧 Creating physics world...');
            this.physicsWorld = new this.Ammo.btDiscreteDynamicsWorld(
                dispatcher, 
                broadphase, 
                solver, 
                collisionConfig
            );
            console.log('✅ Physics world created');
            
            // Set zero gravity for space simulation
            console.log('🔧 Setting gravity...');
            this.physicsWorld.setGravity(new this.Ammo.btVector3(0, 0, 0));
            console.log('✅ Gravity set to zero');
            
            // Enable collision detection
            console.log('🔧 Configuring collision detection...');
            try {
                // Try different ways to set CCD penetration
                const dispatchInfo = this.physicsWorld.getDispatchInfo();
                console.log('🔍 DispatchInfo methods:', Object.getOwnPropertyNames(dispatchInfo));
                
                if (typeof dispatchInfo.set_m_allowedCcdPenetration === 'function') {
                    dispatchInfo.set_m_allowedCcdPenetration(0.0001);
                    console.log('✅ Used set_m_allowedCcdPenetration');
                } else if (typeof dispatchInfo.m_allowedCcdPenetration !== 'undefined') {
                    dispatchInfo.m_allowedCcdPenetration = 0.0001;
                    console.log('✅ Used direct property assignment');
                } else {
                    console.log('⚠️ CCD penetration setting not available, continuing without it');
                }
            } catch (error) {
                console.log('⚠️ Collision detection config failed, continuing without CCD:', error.message);
            }
            console.log('✅ Collision detection configured');
            
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
            
            // Include ship reference if available in Three.js object userData
            const entityData = {
                type: entityType,
                id: entityId,
                health: health,
                threeObject: threeObject
            };
            
            // Add ship reference if it exists in userData
            if (threeObject.userData && threeObject.userData.ship) {
                entityData.ship = threeObject.userData.ship;
                console.log(`🔗 Physics entity includes ship reference for ${entityId}`);
            }
            
            this.entityMetadata.set(rigidBody, entityData);

            console.log(`Created ship rigid body for ${entityType} ${entityId}`);
            
            // Create debug wireframe if debug mode is active
            this.onRigidBodyCreated(rigidBody, threeObject);
            
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
     * Generic method to create a rigid body with configurable shape
     * @param {THREE.Object3D} threeObject - The Three.js object
     * @param {object} config - Configuration object
     * @returns {object} The created rigid body
     */
    createRigidBody(threeObject, config = {}) {
        if (!this.initialized) {
            console.error('PhysicsManager not initialized');
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

            // Create appropriate shape based on config
            switch (shape.toLowerCase()) {
                case 'sphere':
                    ammoShape = new this.Ammo.btSphereShape(radius);
                    break;
                case 'box':
                    ammoShape = new this.Ammo.btBoxShape(
                        new this.Ammo.btVector3(width / 2, height / 2, depth / 2)
                    );
                    break;
                case 'capsule':
                    ammoShape = new this.Ammo.btCapsuleShape(radius, height);
                    break;
                case 'cylinder':
                    ammoShape = new this.Ammo.btCylinderShape(
                        new this.Ammo.btVector3(radius, height / 2, radius)
                    );
                    break;
                default:
                    console.warn(`Unknown shape type: ${shape}, defaulting to box`);
                    ammoShape = new this.Ammo.btBoxShape(
                        new this.Ammo.btVector3(width / 2, height / 2, depth / 2)
                    );
            }

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

            // Calculate local inertia for dynamic bodies
            const inertia = new this.Ammo.btVector3(0, 0, 0);
            if (mass > 0) {
                ammoShape.calculateLocalInertia(mass, inertia);
            }

            // Create rigid body
            const rbInfo = new this.Ammo.btRigidBodyConstructionInfo(
                mass,
                motionState,
                ammoShape,
                inertia
            );
            const rigidBody = new this.Ammo.btRigidBody(rbInfo);

            // Set physics properties
            rigidBody.setRestitution(restitution);
            rigidBody.setFriction(friction);
            
            // Set appropriate damping for space environment
            if (mass > 0) {
                rigidBody.setDamping(0.1, 0.1); // Linear and angular damping
            }

            // Set user data for collision detection
            rigidBody.userData = {
                type: entityType,
                id: entityId || `${entityType}_${Date.now()}`,
                health: health,
                threeObject: threeObject
            };

            // Add to physics world
            this.physicsWorld.addRigidBody(rigidBody);

            // Store references
            this.rigidBodies.set(threeObject, rigidBody);
            
            const entityData = {
                type: entityType,
                id: entityId || `${entityType}_${Date.now()}`,
                health: health,
                threeObject: threeObject
            };
            
            // Add additional references if available
            if (threeObject.userData) {
                if (threeObject.userData.ship) {
                    entityData.ship = threeObject.userData.ship;
                }
                if (threeObject.userData.projectile) {
                    entityData.projectile = threeObject.userData.projectile;
                }
            }
            
            this.entityMetadata.set(rigidBody, entityData);

            // Removed rigid body creation log to prevent console spam
            // console.log(`✅ Created ${shape} rigid body for ${entityType} (mass: ${mass}kg)`);
        
            return rigidBody;

        } catch (error) {
            console.error('Error creating rigid body:', error);
            return null;
        }
    }

    /**
     * Create a btVector3 for Ammo.js
     * @param {number} x - X component
     * @param {number} y - Y component  
     * @param {number} z - Z component
     * @returns {object} Ammo.js btVector3
     */
    createVector3(x, y, z) {
        if (!this.initialized) {
            console.error('PhysicsManager not initialized');
            return null;
        }

        try {
            return new this.Ammo.btVector3(x, y, z);
        } catch (error) {
            console.error('Error creating btVector3:', error);
            return null;
        }
    }

    /**
     * Helper method to check if PhysicsManager is ready for use
     * @returns {boolean} True if ready for physics operations
     */
    isReady() {
        return this.initialized && this.physicsWorld && this.Ammo;
    }

    /**
     * Synchronize Three.js object position/rotation with physics body
     * @param {THREE.Object3D} threeObject - The Three.js object to update
     * @param {object} rigidBody - The Ammo.js rigid body to sync from
     */
    syncThreeWithPhysics(threeObject, rigidBody) {
        if (!this.initialized || !threeObject || !rigidBody) {
            return;
        }

        try {
            // Get transform from rigid body
            const transform = new this.Ammo.btTransform();
            rigidBody.getMotionState().getWorldTransform(transform);
            
            // Update position
            const origin = transform.getOrigin();
            threeObject.position.set(origin.x(), origin.y(), origin.z());
            
            // Update rotation
            const rotation = transform.getRotation();
            threeObject.quaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());
            
            // Update matrix
            threeObject.updateMatrixWorld();
            
        } catch (error) {
            console.error('Error syncing Three.js object with physics body:', error);
        }
    }

    /**
     * Synchronize physics body with Three.js object position/rotation
     * @param {object} rigidBody - The Ammo.js rigid body to update
     * @param {THREE.Object3D} threeObject - The Three.js object to sync from
     */
    syncPhysicsWithThree(rigidBody, threeObject) {
        if (!this.initialized || !threeObject || !rigidBody) {
            return;
        }

        try {
            // Create transform from Three.js object
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
            
            // Update rigid body transform
            rigidBody.getMotionState().setWorldTransform(transform);
            rigidBody.setWorldTransform(transform);
            
        } catch (error) {
            console.error('Error syncing physics body with Three.js object:', error);
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
            // Check if ghost objects are available
            if (!this.Ammo.btGhostObject) {
                // Fallback: Use simple distance-based query
                console.log('🔍 Using fallback spatial query (btGhostObject not available)');
                return this.spatialQueryFallback(position, radius);
            }

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
            if (typeof ghost.getNumOverlappingObjects === 'function') {
                const numOverlaps = ghost.getNumOverlappingObjects();
                for (let i = 0; i < numOverlaps; i++) {
                    const overlappingObject = ghost.getOverlappingObject(i);
                    const metadata = this.entityMetadata.get(overlappingObject);
                    if (metadata) {
                        overlaps.push(metadata);
                    }
                }
            }

            // Clean up
            this.physicsWorld.removeCollisionObject(ghost);
            this.Ammo.destroy(ghost);

            return overlaps;

        } catch (error) {
            console.log('⚠️ Spatial query failed, using fallback:', error.message);
            return this.spatialQueryFallback(position, radius);
        }
    }

    /**
     * Fallback spatial query using distance calculations
     */
    spatialQueryFallback(position, radius) {
        const overlaps = [];
        const radiusSquared = radius * radius;
        
        // Check all registered rigid bodies
        for (const [threeObject, rigidBody] of this.rigidBodies.entries()) {
            if (threeObject.position) {
                const distanceSquared = threeObject.position.distanceToSquared(position);
                if (distanceSquared <= radiusSquared) {
                    const metadata = this.entityMetadata.get(rigidBody);
                    if (metadata) {
                        overlaps.push(metadata);
                    }
                }
            }
        }
        
        return overlaps;
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
            // Check if raycast methods are available
            if (!this.Ammo.ClosestRayResultCallback || !this.physicsWorld.rayTest) {
                // Use fallback raycast method
                console.log('🔄 Using Three.js raycast (physics methods not available)');
                return this.raycastFallback(origin, direction, maxDistance);
            }

            // DEBUG: Log raycast details
            console.log(`🔍 PHYSICS RAYCAST DEBUG:`);
            console.log(`  Origin: (${origin.x.toFixed(2)}, ${origin.y.toFixed(2)}, ${origin.z.toFixed(2)})`);
            console.log(`  Direction: (${direction.x.toFixed(3)}, ${direction.y.toFixed(3)}, ${direction.z.toFixed(3)})`);
            console.log(`  Max Distance: ${maxDistance.toFixed(1)}km`);
            console.log(`  Rigid Bodies in World: ${this.rigidBodies.size}`);

            const rayStart = new this.Ammo.btVector3(origin.x, origin.y, origin.z);
            const rayEnd = new this.Ammo.btVector3(
                origin.x + direction.x * maxDistance,
                origin.y + direction.y * maxDistance,
                origin.z + direction.z * maxDistance
            );

            console.log(`  Ray End: (${rayEnd.x().toFixed(2)}, ${rayEnd.y().toFixed(2)}, ${rayEnd.z().toFixed(2)})`);

            // DEBUG: List all physics bodies and their positions
            let bodyCount = 0;
            for (const [threeObject, rigidBody] of this.rigidBodies.entries()) {
                const metadata = this.entityMetadata.get(rigidBody);
                const transform = new this.Ammo.btTransform();
                rigidBody.getWorldTransform(transform);
                const pos = transform.getOrigin();
                
                console.log(`  Body ${bodyCount}: ${metadata?.type || 'unknown'} at (${pos.x().toFixed(2)}, ${pos.y().toFixed(2)}, ${pos.z().toFixed(2)})`);
                bodyCount++;
            }

            const rayCallback = new this.Ammo.ClosestRayResultCallback(rayStart, rayEnd);
            this.physicsWorld.rayTest(rayStart, rayEnd, rayCallback);

            // Debug: Check what methods are available on rayCallback
            // console.log(`🔍 RAYCAST DEBUG: Available methods on rayCallback:`, 
            //     Object.getOwnPropertyNames(rayCallback.__proto__).filter(name => 
            //         name.includes('Hit') || name.includes('Collision') || name.includes('Fraction') || name.includes('get') || name.includes('m_')
            //     )
            // );
            // console.log(`🔍 RAYCAST DEBUG: ALL methods on rayCallback:`, Object.getOwnPropertyNames(rayCallback.__proto__));

            if (rayCallback.hasHit()) {
                const hitBody = this.safeGetRaycastProperty(rayCallback, 'collisionObject');
                const hitPoint = this.safeGetRaycastProperty(rayCallback, 'hitPointWorld');
                const hitNormal = this.safeGetRaycastProperty(rayCallback, 'hitNormalWorld');
                const hitFraction = this.safeGetRaycastProperty(rayCallback, 'closestHitFraction');

                if (!hitBody || !hitPoint || !hitNormal || hitFraction === null) {
                    console.error('❌ Could not access raycast hit data with current Ammo.js API');
                    console.log(`🔍 Hit data: body=${!!hitBody}, point=${!!hitPoint}, normal=${!!hitNormal}, fraction=${hitFraction}`);
                    
                    // If we have hit point but no fraction, calculate distance manually
                    if (hitBody && hitPoint && hitNormal && hitFraction === null) {
                        console.log(`🔧 MANUAL DISTANCE: Calculating distance from hit point since fraction unavailable`);
                        const hitVector = new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z());
                        const originVector = new THREE.Vector3(origin.x, origin.y, origin.z);
                        const calculatedDistance = originVector.distanceTo(hitVector);
                        
                        console.log(`🔧 MANUAL DISTANCE: Origin (${origin.x.toFixed(2)}, ${origin.y.toFixed(2)}, ${origin.z.toFixed(2)})`);
                        console.log(`🔧 MANUAL DISTANCE: Hit Point (${hitPoint.x().toFixed(2)}, ${hitPoint.y().toFixed(2)}, ${hitPoint.z().toFixed(2)})`);
                        console.log(`🔧 MANUAL DISTANCE: Calculated distance = ${calculatedDistance.toFixed(2)}m`);
                        
                        // Create calculated fraction instead of reassigning readonly property
                        const calculatedFraction = calculatedDistance / maxDistance;
                        console.log(`✅ MANUAL DISTANCE: Using calculated fraction = ${calculatedFraction.toFixed(4)}`);
                        
                        // Proceed with manual distance - don't reassign hitFraction, use calculatedFraction
                        const metadata = this.entityMetadata.get(hitBody);

                        // Debug metadata lookup
                        console.log(`🔍 METADATA DEBUG: hitBody object:`, hitBody);
                        console.log(`🔍 METADATA DEBUG: hitBody constructor:`, hitBody?.constructor?.name);
                        console.log(`🔍 METADATA DEBUG: entityMetadata map size:`, this.entityMetadata.size);
                        console.log(`🔍 METADATA DEBUG: metadata result:`, metadata);
                        
                        // Enhanced metadata lookup when Map fails
                        let entityInfo = metadata;
                        if (!entityInfo) {
                            // console.log(`🔍 METADATA LOOKUP FAILED - Trying alternative methods...`);
                            
                            // Method 1: Check userData property
                            if (hitBody.userData) {
                                // console.log(`✅ Found userData:`, hitBody.userData);
                                entityInfo = hitBody.userData;
                            }
                            
                            // Method 2: Try to find matching physics body by iterating through stored bodies
                            if (!entityInfo) {
                                // console.log(`🔍 Searching through all stored rigid bodies...`);
                                for (const [storedThreeObject, storedRigidBody] of this.rigidBodies.entries()) {
                                    // Check if this is the same physics body using various comparison methods
                                    if (storedRigidBody === hitBody || 
                                        (storedRigidBody && hitBody && storedRigidBody.ptr === hitBody.ptr) ||
                                        (storedRigidBody && hitBody && storedRigidBody.constructor === hitBody.constructor)) {
                                        
                                        const storedMetadata = this.entityMetadata.get(storedRigidBody);
                                        if (storedMetadata) {
                                            console.log(`✅ FOUND MATCHING BODY: ${storedMetadata.type} ${storedMetadata.id}`);
                                            entityInfo = storedMetadata;
                                            break;
                                        }
                                    }
                                }
                            }
                            
                            // Method 3: Position-based matching (last resort)
                            if (!entityInfo && hitPoint) {
                                console.log(`🔍 Trying position-based entity identification...`);
                                const hitPos = new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z());
                                
                                for (const [storedThreeObject, storedRigidBody] of this.rigidBodies.entries()) {
                                    const objectPos = storedThreeObject.position;
                                    const distance = hitPos.distanceTo(objectPos);
                                    
                                    console.log(`🔍 Checking object at (${objectPos.x.toFixed(2)}, ${objectPos.y.toFixed(2)}, ${objectPos.z.toFixed(2)}) - distance ${distance.toFixed(2)}`);
                                    
                                    if (distance < 10.0) { // Increased threshold to 10 units
                                        const storedMetadata = this.entityMetadata.get(storedRigidBody);
                                        if (storedMetadata) {
                                            console.log(`✅ POSITION MATCH: ${storedMetadata.type} ${storedMetadata.id} at distance ${distance.toFixed(2)}`);
                                            console.log(`🔍 Full metadata:`, storedMetadata);
                                            
                                            // Verify ship reference if it's an enemy_ship
                                            if (storedMetadata.type === 'enemy_ship' && storedMetadata.ship) {
                                                console.log(`✅ Ship reference found:`, storedMetadata.ship.shipName || 'Unknown ship');
                                            }
                                            
                                            entityInfo = storedMetadata;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        
                        // Final debug output
                        if (entityInfo) {
                            console.log(`✅ ENTITY IDENTIFIED: ${entityInfo.type} ${entityInfo.id}`);
                        } else {
                            console.log(`❌ ENTITY IDENTIFICATION FAILED - using 'unknown'`);
                        }

                        // Build result with manual distance calculation
                        const result = {
                            hit: true,
                            body: hitBody,
                            point: new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z()),
                            normal: new THREE.Vector3(hitNormal.x(), hitNormal.y(), hitNormal.z()),
                            distance: calculatedDistance,
                            fraction: calculatedFraction,
                            entity: entityInfo || { type: 'unknown', id: 'unknown' }
                        };

                        // Clean up Ammo.js objects
                        this.Ammo.destroy(rayCallback);
                        this.Ammo.destroy(rayStart);
                        this.Ammo.destroy(rayEnd);
                        
                        return result;
                    } else {
                        throw new Error('Raycast hit data inaccessible');
                    }
                }

                const metadata = this.entityMetadata.get(hitBody);

                // Debug metadata lookup (same as manual distance path)
                console.log(`🔍 METADATA DEBUG (regular path): hitBody object:`, hitBody);
                console.log(`🔍 METADATA DEBUG (regular path): hitBody constructor:`, hitBody?.constructor?.name);
                console.log(`🔍 METADATA DEBUG (regular path): entityMetadata map size:`, this.entityMetadata.size);
                console.log(`🔍 METADATA DEBUG (regular path): metadata result:`, metadata);
                
                // Enhanced metadata lookup when Map fails
                let entityInfo = metadata;
                if (!entityInfo) {
                    // console.log(`🔍 METADATA LOOKUP FAILED (regular path) - Trying alternative methods...`);
                    
                    // Method 1: Check userData property
                    if (hitBody.userData) {
                        // console.log(`✅ Found userData:`, hitBody.userData);
                        entityInfo = hitBody.userData;
                    }
                    
                    // Method 2: Try to find matching physics body by iterating through stored bodies
                    if (!entityInfo) {
                        // console.log(`🔍 Searching through all stored rigid bodies...`);
                        for (const [storedThreeObject, storedRigidBody] of this.rigidBodies.entries()) {
                            // Check if this is the same physics body using various comparison methods
                            if (storedRigidBody === hitBody || 
                                (storedRigidBody && hitBody && storedRigidBody.ptr === hitBody.ptr) ||
                                (storedRigidBody && hitBody && storedRigidBody.constructor === hitBody.constructor)) {
                                
                                const storedMetadata = this.entityMetadata.get(storedRigidBody);
                                if (storedMetadata) {
                                    console.log(`✅ FOUND MATCHING BODY: ${storedMetadata.type} ${storedMetadata.id}`);
                                    entityInfo = storedMetadata;
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Method 3: Position-based matching (last resort)
                    if (!entityInfo && hitPoint) {
                        console.log(`🔍 Trying position-based entity identification...`);
                        const hitPos = new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z());
                        
                        for (const [storedThreeObject, storedRigidBody] of this.rigidBodies.entries()) {
                            const objectPos = storedThreeObject.position;
                            const distance = hitPos.distanceTo(objectPos);
                            
                            console.log(`🔍 Checking object at (${objectPos.x.toFixed(2)}, ${objectPos.y.toFixed(2)}, ${objectPos.z.toFixed(2)}) - distance ${distance.toFixed(2)}`);
                            
                            if (distance < 10.0) { // Increased threshold to 10 units
                                const storedMetadata = this.entityMetadata.get(storedRigidBody);
                                if (storedMetadata) {
                                    console.log(`✅ POSITION MATCH: ${storedMetadata.type} ${storedMetadata.id} at distance ${distance.toFixed(2)}`);
                                    console.log(`🔍 Full metadata:`, storedMetadata);
                                    
                                    // Verify ship reference if it's an enemy_ship
                                    if (storedMetadata.type === 'enemy_ship' && storedMetadata.ship) {
                                        console.log(`✅ Ship reference found:`, storedMetadata.ship.shipName || 'Unknown ship');
                                    }
                                    
                                    entityInfo = storedMetadata;
                                    break;
                                }
                            }
                        }
                    }
                }
                
                // Final debug output
                if (entityInfo) {
                    console.log(`✅ ENTITY IDENTIFIED (regular path): ${entityInfo.type} ${entityInfo.id}`);
                } else {
                    console.log(`❌ ENTITY IDENTIFICATION FAILED (regular path) - using 'unknown'`);
                }

                console.log(`✅ PHYSICS RAYCAST HIT: ${entityInfo?.type || 'unknown'} at (${hitPoint.x().toFixed(2)}, ${hitPoint.y().toFixed(2)}, ${hitPoint.z().toFixed(2)})`);

                const result = {
                    hit: true,
                    body: hitBody,
                    point: new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z()),
                    normal: new THREE.Vector3(hitNormal.x(), hitNormal.y(), hitNormal.z()),
                    distance: origin.distanceTo(new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z())),
                    fraction: hitFraction,
                    entity: entityInfo || { type: 'unknown', id: 'unknown' }
                };

                // Clean up Ammo.js objects
                this.Ammo.destroy(rayCallback);
                this.Ammo.destroy(rayStart);
                this.Ammo.destroy(rayEnd);
                
                return result;
            } else {
                console.log(`❌ PHYSICS RAYCAST MISS: No hits detected (checked ${bodyCount} bodies)`);
            }

            // Clean up Ammo.js objects
            this.Ammo.destroy(rayCallback);
            this.Ammo.destroy(rayStart);
            this.Ammo.destroy(rayEnd);
            return null;

        } catch (error) {
            console.log('🔄 Physics raycast failed, using Three.js fallback:', error.message);
            console.error('Full physics raycast error:', error);
            return this.raycastFallback(origin, direction, maxDistance);
        }
    }

    /**
     * Fallback raycast using Three.js raycaster
     * @param {THREE.Vector3} origin - Ray origin  
     * @param {THREE.Vector3} direction - Ray direction (normalized)
     * @param {number} maxDistance - Maximum ray distance
     * @returns {object|null} Hit result or null
     */
    raycastFallback(origin, direction, maxDistance = 1000) {
        try {
            // Use Three.js raycaster as fallback
            if (typeof THREE === 'undefined') {
                console.log('⚠️ THREE.js not available for raycast fallback');
                return null;
            }

            const raycaster = new THREE.Raycaster();
            raycaster.set(origin, direction);
            raycaster.far = maxDistance;

            // Get all rigid body objects to test against
            const targetObjects = [];
            for (const [threeObject, rigidBody] of this.rigidBodies.entries()) {
                if (threeObject && threeObject.visible) {
                    targetObjects.push(threeObject);
                }
            }

            if (targetObjects.length === 0) {
                return null;
            }

            // Perform Three.js raycast
            const intersections = raycaster.intersectObjects(targetObjects, true);
            
            if (intersections.length > 0) {
                const firstHit = intersections[0];
                const hitObject = firstHit.object;
                
                // Find the top-level object (ship) that contains this mesh
                let targetShip = hitObject;
                while (targetShip.parent && !this.rigidBodies.has(targetShip)) {
                    targetShip = targetShip.parent;
                }
                
                const rigidBody = this.rigidBodies.get(targetShip);
                const metadata = this.entityMetadata.get(rigidBody);

                const result = {
                    hit: true,
                    body: rigidBody,
                    point: firstHit.point,
                    normal: firstHit.face ? firstHit.face.normal : new THREE.Vector3(0, 1, 0),
                    distance: firstHit.distance,
                    entity: metadata,
                    threeObject: targetShip
                };

                console.log(`🎯 THREE.js raycast HIT: ${metadata?.name || 'unknown'} at ${firstHit.distance.toFixed(1)}m`);
                return result;
            }

            return null;

        } catch (error) {
            console.log('⚠️ Three.js raycast fallback failed:', error.message);
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

            // Update debug visualization
            this.updateDebugVisualization();

            // Process collisions manually (since automatic callbacks may not be available)
            this.processCollisions();

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
     * Handle collision detection for projectiles and other objects
     */
    handleCollisions() {
        if (!this.initialized) return;
        
        try {
            // Check if collision manifold detection is available
            if (!this.dispatcher || typeof this.dispatcher.getNumManifolds !== 'function') {
                // Use fallback collision detection
                return this.handleCollisionsFallback();
            }
            
            const numManifolds = this.dispatcher.getNumManifolds();
            
            // Add periodic debug logging (every 5 seconds) to see if collision detection is working
            if (!this.lastCollisionDebugTime || (Date.now() - this.lastCollisionDebugTime) > 5000) {
                console.log(`🔍 DEBUG: Collision detection running - ${numManifolds} manifolds found`);
                this.lastCollisionDebugTime = Date.now();
            }
            
            for (let i = 0; i < numManifolds; i++) {
                const contactManifold = this.dispatcher.getManifoldByIndexInternal(i);
                
                if (!contactManifold) continue;
                
                const body0 = this.Ammo.castObject(contactManifold.getBody0(), this.Ammo.btRigidBody);
                const body1 = this.Ammo.castObject(contactManifold.getBody1(), this.Ammo.btRigidBody);
                
                // Check if either body is a projectile
                const projectile0 = body0?.projectileOwner;
                const projectile1 = body1?.projectileOwner;
                
                if (projectile0 || projectile1) {
                    console.log(`🔍 DEBUG: Found projectile collision - projectile0:${!!projectile0}, projectile1:${!!projectile1}`);
                    
                    const numContacts = contactManifold.getNumContacts();
                    
                    for (let j = 0; j < numContacts; j++) {
                        const contactPoint = contactManifold.getContactPoint(j);
                        
                        // Check if projectile is close enough to target for collision
                        const distance = contactPoint.get_m_distance ? contactPoint.get_m_distance() : 
                                        (contactPoint.getDistance ? contactPoint.getDistance() : 0.1);
                        
                        console.log(`🔍 DEBUG: Contact distance: ${distance}`);
                        
                        // Only process contact if distance indicates actual collision (increased threshold for better detection)
                        if (distance <= 0.5) {
                            console.log(`🔍 DEBUG: Processing collision - distance: ${distance}`);
                            // Handle projectile collision
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
            console.log('⚠️ Collision detection failed, using basic mode:', error.message);
            this.handleCollisionsFallback();
        }
    }

    /**
     * Fallback collision detection using simple distance checks
     */
    handleCollisionsFallback() {
        // For now, skip complex collision detection
        // This would be implemented later when we add projectiles
        // console.log('🔍 Using basic collision detection (manifolds not available)');
    }
    
    /**
     * Handle individual projectile collision
     * @param {Object} projectile The projectile object
     * @param {Object} contactPoint The collision contact point
     * @param {Object} otherBody The other body in the collision
     */
    handleProjectileCollision(projectile, contactPoint, otherBody) {
        try {
            // Find the Three.js object associated with the other body
            let otherObject = null;
            for (const [threeObj, rigidBody] of this.rigidBodies.entries()) {
                if (rigidBody === otherBody) {
                    otherObject = threeObj;
                    break;
                }
            }
            
            // Rate-limited collision logging to prevent spam (only log torpedo collisions)
            if (projectile.weaponName.toLowerCase().includes('torpedo')) {
                console.log(`🔥 Projectile collision detected: ${projectile.weaponName}`);
            }
            
            // Call the projectile's collision handler
            if (typeof projectile.onCollision === 'function') {
                projectile.onCollision(contactPoint, otherObject);
            }
            
        } catch (error) {
            console.error('Error handling projectile collision:', error);
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
     * Update physics body position to match Three.js object position
     * @param {THREE.Object3D} threeObject - The Three.js object
     */
    updateRigidBodyPosition(threeObject) {
        if (!this.initialized) return;

        const rigidBody = this.rigidBodies.get(threeObject);
        if (!rigidBody) return;

        try {
            // Get current Three.js object position and rotation
            const position = threeObject.position;
            const quaternion = threeObject.quaternion;

            // Debug: Check what methods are available on the rigid body
            console.log(`🔍 DEBUG: Available methods on rigidBody:`, Object.getOwnPropertyNames(rigidBody.__proto__).filter(name => name.includes('Transform') || name.includes('World')));

            // Create new transform
            const transform = new this.Ammo.btTransform();
            transform.setIdentity();
            
            // Set position
            const btVector3 = new this.Ammo.btVector3(position.x, position.y, position.z);
            transform.setOrigin(btVector3);
            
            // Set rotation  
            const btQuaternion = new this.Ammo.btQuaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
            transform.setRotation(btQuaternion);

            // Try different methods to set world transform
            if (typeof rigidBody.setWorldTransform === 'function') {
                rigidBody.setWorldTransform(transform);
                console.log(`🔄 Updated physics body position using setWorldTransform for ${threeObject.name || 'object'} to (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
            } else if (typeof rigidBody.setCenterOfMassTransform === 'function') {
                rigidBody.setCenterOfMassTransform(transform);
                console.log(`🔄 Updated physics body position using setCenterOfMassTransform for ${threeObject.name || 'object'} to (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
            } else {
                // Try getting and setting motion state instead
                const motionState = rigidBody.getMotionState();
                if (motionState && typeof motionState.setWorldTransform === 'function') {
                    motionState.setWorldTransform(transform);
                    console.log(`🔄 Updated physics body position using motionState.setWorldTransform for ${threeObject.name || 'object'} to (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
                } else {
                    console.error(`❌ No suitable method found to update rigid body transform for ${threeObject.name || 'object'}`);
                    console.log(`🔍 Available rigidBody methods:`, Object.getOwnPropertyNames(rigidBody.__proto__));
                }
            }

            // Activate the rigid body to ensure physics world recognizes the change
            if (typeof rigidBody.activate === 'function') {
                rigidBody.activate(true);
            }

            // Clean up temporary Ammo objects
            this.Ammo.destroy(btVector3);
            this.Ammo.destroy(btQuaternion);
            this.Ammo.destroy(transform);

        } catch (error) {
            console.error('Error updating rigid body position:', error);
            console.log(`🔍 RigidBody object:`, rigidBody);
            console.log(`🔍 RigidBody type:`, typeof rigidBody);
            console.log(`🔍 RigidBody constructor:`, rigidBody.constructor.name);
        }
    }

    /**
     * Update all physics body positions to match their Three.js objects
     */
    updateAllRigidBodyPositions() {
        if (!this.initialized) return;

        let updateCount = 0;
        let recreateCount = 0;
        
        for (const [threeObject, rigidBody] of this.rigidBodies.entries()) {
            try {
                // Try transform update first
                this.updateRigidBodyPosition(threeObject);
                updateCount++;
            } catch (error) {
                console.warn(`Transform update failed for ${threeObject.name || 'object'}, trying recreation:`, error);
                // Fallback: recreate physics body at new position
                this.recreateRigidBodyAtPosition(threeObject);
                recreateCount++;
            }
        }

        console.log(`🔄 Updated ${updateCount} physics body positions, recreated ${recreateCount} physics bodies`);
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
        console.log('🔧 Setting up collision detection system...');
        
        try {
            // Check if collision event callback is available
            if (typeof this.physicsWorld.setCollisionEventCallback === 'function') {
                this.physicsWorld.setCollisionEventCallback(this.onCollisionEvent.bind(this));
                console.log('✅ Collision event callbacks enabled');
            } else {
                console.log('⚠️ Collision event callbacks not available in this Ammo.js build');
                console.log('💡 Will use manual collision detection instead');
            }
        } catch (error) {
            console.log('⚠️ Collision detection setup failed:', error.message);
            console.log('💡 Continuing without automatic collision callbacks');
        }
        
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
            
            // Try to get contact distance with fallback
            let distance = -0.1; // Default to penetration assumption
            try {
                if (typeof contactPoint.getDistance === 'function') {
                    distance = contactPoint.getDistance();
                } else {
                    // Fallback: assume moderate penetration for impulse calculation
                    // Removed collision warning log to prevent console spam
                    // console.log('⚠️ contactPoint.getDistance not available for impulse calculation, using fallback');
                    distance = -0.1;
                }
            } catch (error) {
                console.log('⚠️ Error getting contact distance for impulse, using fallback:', error.message);
                distance = -0.1;
            }
            
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

    /**
     * Toggle physics debug visualization
     * @param {THREE.Scene} scene - Three.js scene to add debug wireframes to
     */
    toggleDebugMode(scene) {
        this.debugMode = !this.debugMode;
        
        if (this.debugMode) {
            this.enableDebugVisualization(scene);
            console.log('🔍 Physics debug mode ENABLED - showing collision shapes');
        } else {
            this.disableDebugVisualization(scene);
            console.log('🔍 Physics debug mode DISABLED - hiding collision shapes');
        }
        
        return this.debugMode;
    }

    /**
     * Enable physics debug visualization
     * @param {THREE.Scene} scene - Three.js scene
     */
    enableDebugVisualization(scene) {
        if (!scene || typeof THREE === 'undefined') {
            console.warn('Scene or THREE.js not available for physics debug');
            return;
        }

        // Create debug group if it doesn't exist
        if (!this.debugGroup) {
            this.debugGroup = new THREE.Group();
            this.debugGroup.name = 'PhysicsDebugGroup';
            scene.add(this.debugGroup);
        }

        // Create wireframes for all existing physics bodies
        for (const [threeObject, rigidBody] of this.rigidBodies.entries()) {
            this.createDebugWireframe(rigidBody, threeObject);
        }
    }

    /**
     * Disable physics debug visualization
     * @param {THREE.Scene} scene - Three.js scene
     */
    disableDebugVisualization(scene) {
        if (this.debugGroup && scene) {
            // Remove all wireframes
            this.debugWireframes.clear();
            scene.remove(this.debugGroup);
            this.debugGroup = null;
        }
    }

    /**
     * Create wireframe visualization for a physics body
     * @param {object} rigidBody - Ammo.js rigid body
     * @param {THREE.Object3D} threeObject - Associated Three.js object
     */
    createDebugWireframe(rigidBody, threeObject) {
        if (!this.debugMode || !this.debugGroup || typeof THREE === 'undefined') {
            return;
        }

        try {
            const metadata = this.entityMetadata.get(rigidBody);
            
            // Get current physics body position and rotation
            const transform = new this.Ammo.btTransform();
            rigidBody.getWorldTransform(transform);
            const position = transform.getOrigin();
            const rotation = transform.getRotation();

            // Create wireframe geometry based on collision shape
            const collisionShape = rigidBody.getCollisionShape();
            let geometry;
            let material;

            // Determine shape type and create appropriate wireframe
            if (this.isBoxShape(collisionShape)) {
                // Box shape
                const halfExtents = collisionShape.getHalfExtentsWithMargin();
                const width = halfExtents.x() * 2;
                const height = halfExtents.y() * 2;
                const depth = halfExtents.z() * 2;
                
                geometry = new THREE.BoxGeometry(width, height, depth);
                material = new THREE.MeshBasicMaterial({ 
                    color: metadata?.type === 'enemy_ship' ? 0xff0000 : 0x00ff00, 
                    wireframe: true,
                    transparent: true,
                    opacity: 0.7
                });
            } else if (this.isSphereShape(collisionShape)) {
                // Sphere shape
                const radius = collisionShape.getRadius();
                geometry = new THREE.SphereGeometry(radius, 16, 12);
                material = new THREE.MeshBasicMaterial({ 
                    color: metadata?.type === 'enemy_ship' ? 0xff4444 : 0x44ff44, 
                    wireframe: true,
                    transparent: true,
                    opacity: 0.7
                });
            } else {
                // Default box for unknown shapes
                geometry = new THREE.BoxGeometry(2, 2, 2);
                material = new THREE.MeshBasicMaterial({ 
                    color: 0xffff00, 
                    wireframe: true,
                    transparent: true,
                    opacity: 0.5
                });
            }

            // Create wireframe mesh
            const wireframe = new THREE.Mesh(geometry, material);
            wireframe.position.set(position.x(), position.y(), position.z());
            wireframe.quaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());
            
            // Add debug info as userData
            wireframe.userData = {
                type: 'physics_debug',
                entityType: metadata?.type || 'unknown',
                entityId: metadata?.id || 'unknown',
                rigidBody: rigidBody
            };

            // Add to debug group and store reference
            this.debugGroup.add(wireframe);
            this.debugWireframes.set(rigidBody, wireframe);

            console.log(`🔍 Created debug wireframe for ${metadata?.type || 'unknown'} at (${position.x().toFixed(2)}, ${position.y().toFixed(2)}, ${position.z().toFixed(2)})`);

        } catch (error) {
            console.warn('Failed to create debug wireframe:', error);
        }
    }

    /**
     * Update debug wireframes to match current physics body positions
     */
    updateDebugVisualization() {
        if (!this.debugMode || !this.debugGroup) {
            return;
        }

        for (const [rigidBody, wireframe] of this.debugWireframes.entries()) {
            try {
                const transform = new this.Ammo.btTransform();
                rigidBody.getWorldTransform(transform);
                const position = transform.getOrigin();
                const rotation = transform.getRotation();

                wireframe.position.set(position.x(), position.y(), position.z());
                wireframe.quaternion.set(rotation.x(), rotation.y(), rotation.z(), rotation.w());
            } catch (error) {
                console.warn('Failed to update debug wireframe:', error);
            }
        }
    }

    /**
     * Check if collision shape is a box
     * @param {object} collisionShape - Ammo.js collision shape
     * @returns {boolean} True if box shape
     */
    isBoxShape(collisionShape) {
        try {
            return collisionShape.getShapeType() === 0; // BOX_SHAPE_PROXYTYPE
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if collision shape is a sphere
     * @param {object} collisionShape - Ammo.js collision shape
     * @returns {boolean} True if sphere shape
     */
    isSphereShape(collisionShape) {
        try {
            return collisionShape.getShapeType() === 8; // SPHERE_SHAPE_PROXYTYPE
        } catch (error) {
            return false;
        }
    }

    /**
     * Add debug wireframe for newly created rigid body
     * @param {object} rigidBody - Newly created rigid body
     * @param {THREE.Object3D} threeObject - Associated Three.js object
     */
    onRigidBodyCreated(rigidBody, threeObject) {
        if (this.debugMode) {
            this.createDebugWireframe(rigidBody, threeObject);
        }
    }

    /**
     * Recreate physics body at new position (alternative to transform update)
     * @param {THREE.Object3D} threeObject - The Three.js object
     */
    recreateRigidBodyAtPosition(threeObject) {
        if (!this.initialized) return;

        const oldRigidBody = this.rigidBodies.get(threeObject);
        if (!oldRigidBody) return;

        try {
            // Get metadata from old rigid body
            const metadata = this.entityMetadata.get(oldRigidBody);
            if (!metadata) {
                console.error('No metadata found for rigid body');
                return;
            }

            // Remove old rigid body
            this.physicsWorld.removeRigidBody(oldRigidBody);
            this.rigidBodies.delete(threeObject);
            this.entityMetadata.delete(oldRigidBody);

            // Create new rigid body at current position
            const newRigidBody = this.createShipRigidBody(
                threeObject,
                metadata.type,
                metadata.id,
                metadata.health
            );

            console.log(`🔄 Recreated physics body for ${threeObject.name || 'object'} at (${threeObject.position.x.toFixed(2)}, ${threeObject.position.y.toFixed(2)}, ${threeObject.position.z.toFixed(2)})`);

            return newRigidBody;

        } catch (error) {
            console.error('Error recreating rigid body:', error);
        }
    }

    /**
     * Safely access raycast callback properties with API compatibility
     * @param {*} rayCallback - The Ammo.js raycast callback object
     * @param {string} property - The property to access
     * @returns {*} The property value or null if not found
     */
    safeGetRaycastProperty(rayCallback, property) {
        const methodVariations = {
            'closestHitFraction': [
                'get_m_closestHitFraction',
                'm_closestHitFraction', 
                'getClosestHitFraction',
                'closestHitFraction',
                'get_closestHitFraction',
                'closest_hit_fraction'
            ],
            'collisionObject': [
                'get_m_collisionObject',
                'm_collisionObject',
                'getCollisionObject', 
                'collisionObject',
                'get_collisionObject',
                'collision_object'
            ],
            'hitPointWorld': [
                'get_m_hitPointWorld',
                'm_hitPointWorld',
                'getHitPointWorld',
                'hitPointWorld',
                'get_hitPointWorld',
                'hit_point_world'
            ],
            'hitNormalWorld': [
                'get_m_hitNormalWorld', 
                'm_hitNormalWorld',
                'getHitNormalWorld',
                'hitNormalWorld',
                'get_hitNormalWorld',
                'hit_normal_world'
            ]
        };

        const variations = methodVariations[property];
        if (!variations) {
            console.warn(`Unknown raycast property: ${property}`);
            return null;
        }

        // Try each variation until one works
        for (const methodName of variations) {
            try {
                if (typeof rayCallback[methodName] === 'function') {
                    const result = rayCallback[methodName]();
                    if (result !== null && result !== undefined) {
                        console.log(`✅ RAYCAST API: ${property} accessed via ${methodName}()`);
                        return result;
                    }
                } else if (rayCallback[methodName] !== undefined) {
                    const result = rayCallback[methodName];
                    if (result !== null && result !== undefined) {
                        console.log(`✅ RAYCAST API: ${property} accessed via ${methodName} (property)`);
                        return result;
                    }
                }
            } catch (error) {
                // Continue to next variation silently
                continue;
            }
        }

        console.warn(`Could not access raycast property ${property} with any known method`);
        
        // Only show detailed debug info for closestHitFraction since it's the problematic one
        if (property === 'closestHitFraction') {
            console.log(`🔍 Available fraction-related methods:`, Object.getOwnPropertyNames(rayCallback.__proto__).filter(name => 
                name.toLowerCase().includes('fraction') || name.toLowerCase().includes('distance')
            ));
            
            // Final fallback: try direct property access on the object itself
            console.log(`🔍 Trying direct property access for ${property}...`);
            const allProperties = Object.getOwnPropertyNames(rayCallback);
            const relevantProps = allProperties.filter(name => 
                name.toLowerCase().includes('fraction') || name.toLowerCase().includes('distance')
            );
            console.log(`🔍 Relevant properties found:`, relevantProps);
            
            if (relevantProps.length > 0) {
                const prop = relevantProps[0];
                try {
                    const result = rayCallback[prop];
                    console.log(`✅ RAYCAST FALLBACK: ${property} accessed via direct property ${prop}`);
                    return result;
                } catch (error) {
                    console.error(`❌ RAYCAST FALLBACK failed for ${prop}:`, error);
                }
            }
        }
        
        return null;
    }
}

export default PhysicsManager; 