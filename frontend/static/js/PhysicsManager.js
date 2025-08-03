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

        // Debugging
        this._warnedProperties = new Set();
        this._successfulMethods = new Set();
        this._lastFailureWarning = {};
        this._debugLoggingEnabled = false; // Production: Disable collision debug logging
        this._silentMode = true; // Production: Disable debug output for performance
        this._lastCollisionDebugTime = 0; // Track debug spam timing
        this.lastPhysicsDebugTime = 0; // Track physics debug spam timing
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
            console.log('🔧 Configuring native collision detection...');
            try {
                // Configure native collision detection with complete build
                const dispatchInfo = this.physicsWorld.getDispatchInfo();
                
                // Enable CCD properly with complete build
                dispatchInfo.set_m_useContinuous(true);
                dispatchInfo.set_m_useConvexConservativeDistanceUtil(true);
                
                // Set CCD penetration threshold  
                if (typeof dispatchInfo.set_m_allowedCcdPenetration === 'function') {
                    dispatchInfo.set_m_allowedCcdPenetration(0.0001);
                    console.log('✅ CCD penetration configured via set_m_allowedCcdPenetration');
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
            console.log('PhysicsManager not initialized');
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
            damping = 0.1 // Linear damping (angular damping will be same value)
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
            rigidBody.setDamping(damping, damping); // Use specified damping for both linear and angular

            // Set user data for collision detection
            rigidBody.userData = {
                type: entityType,
                id: entityId,
                health: health,
                threeObject: threeObject
            };

            // Add to physics world with proper collision groups (compatible with projectiles)
            const collisionGroup = 2; // Enemy ships use group 2
            const collisionMask = -1;  // Collide with everything (including projectiles in group 1)
            this.physicsWorld.addRigidBody(rigidBody, collisionGroup, collisionMask);

            // Store references
            this.rigidBodies.set(threeObject, rigidBody);
            
            // Include ship reference if available in Three.js object userData
            const entityData = {
                type: entityType,
                id: entityId,
                health: health,
                threeObject: threeObject,
                shapeType: 'box', // Store shape type for wireframe creation
                shapeWidth: width,
                shapeHeight: height,
                shapeDepth: depth
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
            console.log('PhysicsManager not initialized');
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
            console.log('PhysicsManager not initialized');
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
                threeObject: threeObject,
                shapeType: 'sphere', // Store shape type for wireframe creation
                shapeRadius: radius  // Store radius for wireframe sizing
            });

            console.log(`Created planet rigid body for ${entityType} ${entityId || 'unnamed'}`);
            
            // Create debug wireframe if debug mode is active
            this.onRigidBodyCreated(rigidBody, threeObject);
            
            return rigidBody;

        } catch (error) {
            console.error('Error creating planet rigid body:', error);
            return null;
        }
    }

    /**
     * Disable collision debugging to reduce console spam
     */
    disableCollisionDebug() {
        this._silentMode = true;
        this._debugLoggingEnabled = false;
        console.log('🔇 Collision debugging disabled - console spam reduced');
    }

    /**
     * Enable collision debugging
     */
    enableCollisionDebug() {
        this._silentMode = false;
        this._debugLoggingEnabled = true;
        console.log('🔊 Collision debugging enabled');
    }

    /**
     * Completely disable all physics debug output (for clean console)
     */
    setSilentMode() {
        this._silentMode = true;
        this._debugLoggingEnabled = false;
        console.log('🔇 Physics debugging completely disabled - console will be clean');
    }

    /**
     * Ultimate silence - disable ALL debug output from physics system
     */
    setUltraSilentMode() {
        this._silentMode = true;
        this._debugLoggingEnabled = false;
        
        // Override console methods for physics-related logs only
        const originalLog = console.log;
        console.log = (...args) => {
            const message = args.join(' ');
            // Skip physics, collision, torpedo, and projectile logs
            if (message.includes('🚀') || message.includes('💥') || 
                message.includes('🔍') || message.includes('🎯') ||
                message.includes('✅') || message.includes('🔧') ||
                message.includes('📋') || message.includes('TORPEDO') ||
                message.includes('PROJECTILE') || message.includes('COLLISION') ||
                message.includes('Physics') || message.includes('manifolds')) {
                return; // Skip these logs
            }
            originalLog.apply(console, args);
        };
        
        console.log('🤐 ULTRA SILENT MODE: All physics debug output completely suppressed');
    }

    /**
     * Generic method to create a rigid body with configurable shape
     * @param {THREE.Object3D} threeObject - The Three.js object
     * @param {object} config - Configuration object
     * @returns {object} The created rigid body
     */
    createRigidBody(threeObject, config = {}) {
        if (!this.initialized) {
            console.log('PhysicsManager not initialized');
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
                    console.log(`Unknown shape type: ${shape}, defaulting to box`);
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

            // Debug: Check if rigid body was created successfully
            if (!rigidBody) {
                console.log(`PHYSICS: Failed to create rigid body for ${entityType} ${entityId}`);
                return null;
            }

            // Set physics properties
            try {
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
            } catch (error) {
                console.error(`❌ PHYSICS: Failed to set properties on rigid body:`, error);
                return null;
            }

            // Add to physics world with collision groups for projectiles
            try {
                if (entityType === 'projectile') {
                    // Native collision group configuration with complete build
                    const collisionGroup = config.collisionGroup || 1;
                    const collisionMask = config.collisionMask || -1; // Collide with everything by default
                    this.physicsWorld.addRigidBody(rigidBody, collisionGroup, collisionMask);
                    
                    // Enable Continuous Collision Detection for fast projectiles with proper radius
                    const projectileSpeed = config.projectileSpeed || 1500; // Default projectile speed
                    this.configureProjectilePhysics(rigidBody, config.radius, projectileSpeed);
                    
                    // Silent projectile addition
                } else {
                    this.physicsWorld.addRigidBody(rigidBody);
                }
            } catch (error) {
                console.error(`❌ PHYSICS: Failed to add rigid body to physics world:`, error);
                return null;
            }

            // Store references
            this.rigidBodies.set(threeObject, rigidBody);
            
            const entityData = {
                type: entityType,
                id: entityId || `${entityType}_${Date.now()}`,
                health: health,
                threeObject: threeObject,
                shapeType: shape, // Store shape type for wireframe creation
                shapeRadius: radius,
                shapeWidth: width,
                shapeHeight: height,
                shapeDepth: depth
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
            
            // Silent metadata tracking

            // Log projectile creation for debugging collision issues
            // Silent projectile setup
            if (entityType === 'projectile') {
                try {
                    // Silently ensure projectile is active and can collide
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
                
                // Don't auto-enable debugging - stay silent
            }
        
            // Create debug wireframe if debug mode is active
            this.onRigidBodyCreated(rigidBody, threeObject);
            
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
            console.log('PhysicsManager not initialized');
            return null;
        }

        try {
            return new this.Ammo.btVector3(x, y, z);
        } catch (error) {
            console.log('Error creating btVector3:', error);
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
            console.log('Error syncing Three.js object with physics body:', error);
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
            console.log('Error syncing physics body with Three.js object:', error);
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
            console.log('PhysicsManager not initialized');
            return [];
        }

        console.log(`🔍 SPATIAL QUERY: Called with position (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}), radius: ${radius}m`);

        try {
            // Check if ghost objects are available
            if (!this.Ammo.btGhostObject) {
                // Fallback: Use simple distance-based query
                console.log('🔍 Using fallback spatial query (btGhostObject not available)');
                return this.spatialQueryFallback(position, radius);
            }

            // Create ghost object for spatial query (convert radius from meters to km)
            const ghost = new this.Ammo.btGhostObject();
            const radiusKm = radius / 1000; // Convert meters to kilometers to match world coordinates
            const shape = new this.Ammo.btSphereShape(radiusKm);
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
        const radiusKm = radius / 1000; // Convert meters to kilometers to match world coordinates
        const radiusSquared = radiusKm * radiusKm; // Use km radius for calculations
        
        // Debug: Log what we're searching for
        console.log(`🔍 SPATIAL QUERY: Searching for entities within ${radius}m (${radiusKm.toFixed(3)}km) of position (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
        console.log(`🔍 SPATIAL QUERY: Checking ${this.rigidBodies.size} rigid bodies and ${this.entityMetadata.size} metadata entries`);
        
        // Check all registered rigid bodies
        for (const [threeObject, rigidBody] of this.rigidBodies.entries()) {
            if (threeObject.position) {
                const distance = threeObject.position.distanceTo(position); // Distance in km (world units)
                if (distance <= radiusKm) { // Compare km to km
                    const metadata = this.entityMetadata.get(rigidBody);
                    if (metadata) {
                        console.log(`✅ SPATIAL QUERY: Found entity '${metadata.id}' (${metadata.type}) at ${distance.toFixed(3)}km (${(distance * 1000).toFixed(1)}m)`);
                        overlaps.push(metadata);
                    } else {
                        console.log(`⚠️ SPATIAL QUERY: RigidBody at ${distance.toFixed(3)}km (${(distance * 1000).toFixed(1)}m) has no metadata`);
                    }
                }
            }
        }
        
        console.log(`🔍 SPATIAL QUERY: Found ${overlaps.length} entities within ${radius}m radius`);
        
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
            console.log('PhysicsManager not initialized');
            return null;
        }

        try {
            // Check if raycast methods are available
            if (!this.Ammo.ClosestRayResultCallback || !this.physicsWorld.rayTest) {
                // Use fallback raycast method
                console.log('🔄 Using Three.js raycast (physics methods not available)');
                return this.raycastFallback(origin, direction, maxDistance);
            }

            const rayStart = new this.Ammo.btVector3(origin.x, origin.y, origin.z);
            const rayEnd = new this.Ammo.btVector3(
                origin.x + direction.x * maxDistance,
                origin.y + direction.y * maxDistance,
                origin.z + direction.z * maxDistance
            );

            // Verbose debug logging only when explicitly enabled (uncomment for troubleshooting)
            // console.log(`🔍 PHYSICS RAYCAST DEBUG:`);
            // console.log(`  Origin: (${origin.x.toFixed(2)}, ${origin.y.toFixed(2)}, ${origin.z.toFixed(2)})`);
            // console.log(`  Direction: (${direction.x.toFixed(3)}, ${direction.y.toFixed(3)}, ${direction.z.toFixed(3)})`);
            // console.log(`  Max Distance: ${maxDistance.toFixed(1)}km`);
            // console.log(`  Rigid Bodies in World: ${this.rigidBodies.size}`);
            // console.log(`  Ray End: (${rayEnd.x().toFixed(2)}, ${rayEnd.y().toFixed(2)}, ${rayEnd.z().toFixed(2)})`);
            // 
            // // List all physics bodies and their positions
            // let bodyCount = 0;
            // for (const [threeObject, rigidBody] of this.rigidBodies.entries()) {
            //     const metadata = this.entityMetadata.get(rigidBody);
            //     const transform = new this.Ammo.btTransform();
            //     rigidBody.getWorldTransform(transform);
            //     const pos = transform.getOrigin();
            //     
            //     console.log(`  Body ${bodyCount}: ${metadata?.type || 'unknown'} at (${pos.x().toFixed(2)}, ${pos.y().toFixed(2)}, ${pos.z().toFixed(2)})`);
            //     bodyCount++;
            // }

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

                // Check if we have essential hit data
                if (!hitBody || !hitPoint || !hitNormal) {
                    // Missing essential hit data - no hit detected
                    if (!this._silentMode && this._debugLoggingEnabled) {
                    console.log(`🔍 RAYCAST MISS: Missing essential hit data (body=${!!hitBody}, point=${!!hitPoint}, normal=${!!hitNormal})`);
                }
                    
                    // Clean up Ammo.js objects
                    this.Ammo.destroy(rayCallback);
                    this.Ammo.destroy(rayStart);
                    this.Ammo.destroy(rayEnd);
                    
                    return null;
                }
                
                // We have essential hit data - check if we need manual distance calculation
                if (hitFraction === null) {
                    // Missing fraction but have essential data - use manual calculation
                        const hitVector = new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z());
                        const originVector = new THREE.Vector3(origin.x, origin.y, origin.z);
                        const calculatedDistance = originVector.distanceTo(hitVector);
                        
                        // Create calculated fraction instead of reassigning readonly property
                        const calculatedFraction = calculatedDistance / maxDistance;
                        
                        // Proceed with manual distance - don't reassign hitFraction, use calculatedFraction
                        const metadata = this.entityMetadata.get(hitBody);

                        // Debug metadata lookup (only log if lookup fails)
                        if (!metadata) {
                                        // Metadata debug: checking hitBody properties
                        }
                        
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
                                            console.log(`✅ FALLBACK SUCCESS: Found matching body ${storedMetadata.type} ${storedMetadata.id}`);
                                            entityInfo = storedMetadata;
                                            break;
                                        }
                                    }
                                }
                            }
                            
                            // Method 3: Position-based matching (last resort)
                            if (!entityInfo && hitPoint) {
                                if (!this._silentMode && this._debugLoggingEnabled) {
                                    console.log(`🔍 Trying position-based entity identification...`);
                                }
                                const hitPos = new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z());
                                
                                for (const [storedThreeObject, storedRigidBody] of this.rigidBodies.entries()) {
                                    const objectPos = storedThreeObject.position;
                                    const distance = hitPos.distanceTo(objectPos);
                                    
                                    if (!this._silentMode && this._debugLoggingEnabled) {
                                        console.log(`🔍 Checking object at (${objectPos.x.toFixed(2)}, ${objectPos.y.toFixed(2)}, ${objectPos.z.toFixed(2)}) - distance ${distance.toFixed(2)}`);
                                    }
                                    
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
                        
                        // Final debug output (only if identification failed or used fallback)
                        if (!metadata && entityInfo) {
                            console.log(`✅ FALLBACK IDENTIFICATION: ${entityInfo.type} ${entityInfo.id}`);
                        } else if (!entityInfo) {
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
                }

                const metadata = this.entityMetadata.get(hitBody);

                // Debug metadata lookup (only log if lookup fails)
                if (!metadata) {
                                    // Metadata debug (regular path): checking hitBody properties
                }
                
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
                                    console.log(`✅ FALLBACK SUCCESS: Found matching body ${storedMetadata.type} ${storedMetadata.id}`);
                                    entityInfo = storedMetadata;
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Method 3: Position-based matching (last resort)
                    if (!entityInfo && hitPoint) {
                        if (!this._silentMode && this._debugLoggingEnabled) {
                            console.log(`🔍 Trying position-based entity identification...`);
                        }
                        const hitPos = new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z());
                        
                        for (const [storedThreeObject, storedRigidBody] of this.rigidBodies.entries()) {
                            if (storedRigidBody === hitBody) {
                                const objectPos = storedThreeObject.position;
                                const distance = objectPos.distanceTo(hitPos);
                                
                                if (!this._silentMode && this._debugLoggingEnabled) {
                                    console.log(`🔍 Checking object at (${objectPos.x.toFixed(2)}, ${objectPos.y.toFixed(2)}, ${objectPos.z.toFixed(2)}) - distance ${distance.toFixed(2)}`);
                                }
                                
                                if (distance < 50) { // Within reasonable distance
                                    const storedMetadata = this.entityMetadata.get(storedRigidBody);
                                    if (!this._silentMode && this._debugLoggingEnabled) {
                                        console.log(`🔍 Full metadata:`, storedMetadata);
                                    }
                                }
                            }
                        }
                    }
                }
                
                // Final debug output (only if identification failed or used fallback)
                if (!metadata && entityInfo) {
                    console.log(`✅ FALLBACK IDENTIFICATION: ${entityInfo.type} ${entityInfo.id}`);
                } else if (!entityInfo) {
                    console.log(`❌ ENTITY IDENTIFICATION FAILED (regular path) - using 'unknown'`);
                }

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
                console.log(`❌ PHYSICS RAYCAST MISS: No hits detected (checked ${this.rigidBodies.size} bodies)`);
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
            // FIXED TIMESTEP: Use smaller fixed timestep for fast projectiles (prevents tunneling)
            const fixedTimeStep = 1/240; // 240 FPS physics for high-speed projectiles
            const maxSubSteps = Math.ceil(deltaTime / fixedTimeStep); // Dynamic substeps based on frame time
            this.physicsWorld.stepSimulation(deltaTime, maxSubSteps, fixedTimeStep);
            
            // Physics debug logging disabled in production for performance

            // Use native collision detection for projectiles (this was already working!)
            this.handleCollisions();
            
            // Sync Three.js objects with physics bodies FIRST
            this.syncThreeJSWithPhysics();

            // Update debug visualization AFTER sync (so wireframes use correct positions)
            this.updateDebugVisualization();

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
                // Skip old fallback - using Ammo.js raycast instead (per upgrade plan)
                return;
            }
            
            const numManifolds = this.dispatcher.getNumManifolds();
            
            // Enhanced collision debugging - throttled for 0 manifolds, immediate for >0 manifolds
            if (numManifolds > 0) {
                console.log(`🚀 COLLISION DEBUG: Found ${numManifolds} active collision manifolds - processing immediately`);
            } else if (!this.lastCollisionDebugTime || (Date.now() - this.lastCollisionDebugTime) > 2000) {
                console.log(`🔍 COLLISION DEBUG: Running collision detection - ${numManifolds} manifolds found`);
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
                    console.log(`🚀 COLLISION DEBUG: Found projectile collision - projectile0:${!!projectile0}, projectile1:${!!projectile1}`);
                    
                    const numContacts = contactManifold.getNumContacts();
                    
                    for (let j = 0; j < numContacts; j++) {
                        const contactPoint = contactManifold.getContactPoint(j);
                        
                        // Check if projectile is close enough to target for collision
                        const distance = contactPoint.get_m_distance ? contactPoint.get_m_distance() : 
                                        (contactPoint.getDistance ? contactPoint.getDistance() : 0.1);
                        
                        console.log(`📏 COLLISION DEBUG: Contact distance: ${distance}`);
                        
                        // Only process contact if distance indicates actual collision (increased threshold for better detection)
                        if (distance <= 0.5) {
                            console.log(`✅ COLLISION DEBUG: Processing collision - distance: ${distance}`);
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
            console.log('⚠️ Old collision detection failed - using Ammo.js raycast instead:', error.message);
            // Skip old fallback - using Ammo.js raycast method instead (per upgrade plan)
        }
    }

    /**
     * Configure projectile physics with enhanced CCD for high-speed projectiles
     */
    configureProjectilePhysics(rigidBody, collisionRadius = 0.4, projectileSpeed = 1500) {
        try {
            // ENHANCED CCD: More aggressive settings for high-speed projectiles
            const physicsStepDistance = projectileSpeed / 240; // Distance per physics step
            
            // CCD Motion Threshold: Lower = more sensitive collision detection
            const ccdThreshold = Math.min(0.1, collisionRadius * 0.25); // Very sensitive for fast projectiles
            rigidBody.setCcdMotionThreshold(ccdThreshold);
            
            // CCD Swept Sphere: Larger than collision radius for tunneling prevention
            const sweptRadius = Math.max(collisionRadius * 1.5, physicsStepDistance * 0.75);
            rigidBody.setCcdSweptSphereRadius(sweptRadius);
            
            // Enable continuous collision detection flag
            const currentFlags = rigidBody.getCollisionFlags();
            rigidBody.setCollisionFlags(currentFlags | 4); // CF_CONTINUOUS_COLLISION_DETECTION
            
            console.log(`✅ Enhanced CCD: collision=${collisionRadius.toFixed(2)}m, swept=${sweptRadius.toFixed(2)}m, threshold=${ccdThreshold.toFixed(3)}m, speed=${projectileSpeed}m/s`);
        } catch (error) {
            console.warn('⚠️ CCD configuration failed:', error.message);
        }
    }



    /**
     * Native Ammo.js collision detection using collision manifolds
     */
    processNativeCollisions() {
        try {
            const dispatcher = this.physicsWorld.getDispatcher();
            const numManifolds = dispatcher.getNumManifolds();
            
            for (let i = 0; i < numManifolds; i++) {
                const contactManifold = dispatcher.getManifoldByIndexInternal(i);
                const numContacts = contactManifold.getNumContacts();
                
                if (numContacts > 0) {
                    this.handleNativeCollision(contactManifold);
                }
            }
        } catch (error) {
            console.log('⚠️ Native collision detection failed - using Ammo.js raycast instead:', error.message);
            // Skip old fallback - using Ammo.js raycast method instead (per upgrade plan)
        }
    }

    /**
     * Handle native collision manifold
     */
    handleNativeCollision(contactManifold) {
        const rigidBody0 = Ammo.castObject(contactManifold.getBody0(), Ammo.btRigidBody);
        const rigidBody1 = Ammo.castObject(contactManifold.getBody1(), Ammo.btRigidBody);
        
        const entity0 = this.entityMetadata.get(rigidBody0);
        const entity1 = this.entityMetadata.get(rigidBody1);
        
        if (!entity0 || !entity1) return;
        
        // Determine projectile and target
        let projectile = null;
        let target = null;
        
        if (entity0.type === 'projectile' && entity1.type !== 'projectile') {
            projectile = entity0;
            target = entity1;
        } else if (entity1.type === 'projectile' && entity0.type !== 'projectile') {
            projectile = entity1;
            target = entity0;
        } else {
            return; // Not a projectile collision
        }
        
        // Get contact point from manifold
        const contactPoint = contactManifold.getContactPoint(0);
        const worldPos = contactPoint.getPositionWorldOnB();
        const contactPosThree = new THREE.Vector3(worldPos.x(), worldPos.y(), worldPos.z());
        
        // Process the collision with proper signature
        const targetRigidBody = target.type === 'projectile' ? rigidBody0 : rigidBody1;
        this.handleProjectileCollision(projectile, contactPosThree, targetRigidBody);
    }

    /**
     * Process scan-hit weapon collisions using instant raycast (per upgrade plan)
     * For weapons like Laser Cannon that fire instantly
     * @param {Object} weaponMesh - The weapon's Three.js mesh
     * @param {Object} targetMesh - The target's Three.js mesh  
     * @param {Object} targetRigidBody - The target's Ammo.js rigid body
     * @param {number} range - The weapon's maximum range
     * @returns {Object} Hit result { hit: boolean, point?: Vector3, distance?: number }
     */
    testScanHitWeapon(weaponMesh, targetMesh, targetRigidBody, range) {
        // Get weapon's position and direction
        const origin = new THREE.Vector3();
        weaponMesh.getWorldPosition(origin);
        const direction = new THREE.Vector3(0, 0, -1);
        weaponMesh.getWorldDirection(direction);

        // Coarse distance check using target's Three.js mesh
        const targetPos = new THREE.Vector3();
        targetMesh.getWorldPosition(targetPos);
        const distanceToTarget = origin.distanceTo(targetPos);
        targetMesh.geometry.computeBoundingSphere();
        const targetRadius = targetMesh.geometry.boundingSphere.radius;

        if (distanceToTarget - targetRadius > range) {
            console.log('Miss (target too far)');
            return { hit: false };
        }

        // Proceed with Ammo.js raycast
        const start = new Ammo.btVector3(origin.x, origin.y, origin.z);
        const end = new Ammo.btVector3(
            origin.x + direction.x * range,
            origin.y + direction.y * range,
            origin.z + direction.z * range
        );

        const rayCallback = new Ammo.ClosestRayResultCallback(start, end);
        this.physicsWorld.rayTest(start, end, rayCallback);

        let result = { hit: false };
        if (rayCallback.hasHit()) {
            const hitPoint = rayCallback.get_m_hitPointWorld();
            const hitDistance = origin.distanceTo(
                new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z())
            );

            if (hitDistance <= range && rayCallback.get_m_collisionObject() === targetRigidBody) {
                result = {
                    hit: true,
                    point: new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z()),
                    distance: hitDistance
                };
                console.log('Hit at:', result.point);
            } else {
                console.log('Miss (out of range or wrong object)');
            }
        } else {
            console.log('Miss (no hit)');
        }

        Ammo.destroy(start);
        Ammo.destroy(end);
        Ammo.destroy(rayCallback);

        return result;
    }

    /**
     * Ammo.js raycast-based collision detection (per upgrade plan)
     * DEPRECATED: This was incorrectly applied to projectiles - now projectiles use native collision
     * Implements the clean algorithm from docs/ammo_js_upgrade_plan.md
     */
    processAmmoRaycastCollisions() {
        const projectiles = [];
        const targets = [];
        
        // Collect projectiles and potential targets
        this.entityMetadata.forEach((entity, rigidBody) => {
            if (entity.type === 'projectile') {
                projectiles.push({ entity, rigidBody });
            } else if (entity.type === 'enemy_ship' || entity.type === 'planet' || entity.type === 'moon' || entity.type === 'star') {
                targets.push({ entity, rigidBody });
            }
        });
        
        // Debug: Log projectile/target counts when projectiles exist (limited to prevent spam)
        if (projectiles.length > 0) {
            // Only log occasionally to prevent console spam
            if (!this._lastRaycastLog || (Date.now() - this._lastRaycastLog > 2000)) {
                console.log(`🎯 RAYCAST COLLISION CHECK: ${projectiles.length} projectiles, ${targets.length} targets`);
                this._lastRaycastLog = Date.now();
            }
        }
        
        // Process each projectile against each target using Ammo.js raycast
        for (const projectile of projectiles) {
            if (!projectile.entity.threeObject) continue;
            
            for (const target of targets) {
                if (!target.entity.threeObject) continue;
                
                // Use the clean raycast algorithm from upgrade plan
                const hitResult = this.testRaycastHit(
                    projectile.entity.threeObject,
                    target.entity.threeObject, 
                    target.rigidBody,
                    projectile.rigidBody.projectileOwner?.range || 30000
                );
                
                if (hitResult.hit) {
                    console.log(`✅ RAYCAST HIT: ${projectile.entity.id} -> ${target.entity.id} at distance ${hitResult.distance.toFixed(1)}m`);
                    
                    // Only allow enemy ships to cause collisions for now
                    if (target.entity.type === 'enemy_ship') {
                        // Trigger projectile collision handler
                        if (projectile.rigidBody && projectile.rigidBody.projectileOwner && 
                            typeof projectile.rigidBody.projectileOwner.onCollision === 'function') {
                            
                            const contactPoint = {
                                get_m_positionWorldOnA: () => ({
                                    x: () => hitResult.point.x,
                                    y: () => hitResult.point.y,
                                    z: () => hitResult.point.z
                                }),
                                position: hitResult.point.clone(),
                                impulse: 1.0
                            };
                            
                            projectile.rigidBody.projectileOwner.onCollision(contactPoint, target.entity.threeObject);
                        }
                        
                        // Remove projectile from physics world
                        try {
                            this.physicsWorld.removeRigidBody(projectile.rigidBody);
                            this.rigidBodies.delete(projectile.entity.threeObject);
                            this.entityMetadata.delete(projectile.rigidBody);
                        } catch (error) {
                            console.log('Error removing projectile after raycast collision:', error);
                        }
                        
                        break; // Exit target loop for this projectile
                    }
                }
            }
        }
    }
    
    /**
     * Test raycast hit using clean algorithm from docs/ammo_js_upgrade_plan.md
     * @param {THREE.Object3D} weaponMesh - Projectile's Three.js object  
     * @param {THREE.Object3D} targetMesh - Target's Three.js object
     * @param {Ammo.btRigidBody} targetRigidBody - Target's rigid body
     * @param {number} range - Weapon range in meters
     * @returns {Object} Hit result with hit boolean, point, and distance
     */
    testRaycastHit(weaponMesh, targetMesh, targetRigidBody, range) {
        // Get weapon's position and direction
        const origin = new THREE.Vector3();
        weaponMesh.getWorldPosition(origin);
        
        // FIXED: Get actual velocity direction from physics instead of object direction
        const weaponRigidBody = this.rigidBodies.get(weaponMesh);
        const velocity = weaponRigidBody ? weaponRigidBody.getLinearVelocity() : null;
        
        let direction;
        if (velocity && (Math.abs(velocity.x()) + Math.abs(velocity.y()) + Math.abs(velocity.z())) > 0.1) {
            // Use actual velocity direction
            direction = new THREE.Vector3(velocity.x(), velocity.y(), velocity.z()).normalize();
        } else {
            // Fallback to object direction if no velocity
            direction = new THREE.Vector3(0, 0, -1);
            weaponMesh.getWorldDirection(direction);
        }

        // Coarse distance check using target's Three.js mesh
        const targetPos = new THREE.Vector3();
        targetMesh.getWorldPosition(targetPos);
        const distanceToTarget = origin.distanceTo(targetPos);
        
        // Compute target radius
        let targetRadius = 50; // Default radius
        if (targetMesh.geometry) {
            targetMesh.geometry.computeBoundingSphere();
            if (targetMesh.geometry.boundingSphere) {
                targetRadius = targetMesh.geometry.boundingSphere.radius;
            }
        }

        if (distanceToTarget - targetRadius > range) {
            return { hit: false, reason: 'target too far' };
        }

        // Proceed with Ammo.js raycast
        const start = new Ammo.btVector3(origin.x, origin.y, origin.z);
        const end = new Ammo.btVector3(
            origin.x + direction.x * range,
            origin.y + direction.y * range,
            origin.z + direction.z * range
        );

        const rayCallback = new Ammo.ClosestRayResultCallback(start, end);
        this.physicsWorld.rayTest(start, end, rayCallback);

        let result = { hit: false, reason: 'no hit' };
        if (rayCallback.hasHit()) {
            const hitPoint = rayCallback.get_m_hitPointWorld();
            const hitDistance = origin.distanceTo(
                new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z())
            );

            if (hitDistance <= range && rayCallback.get_m_collisionObject() === targetRigidBody) {
                result = {
                    hit: true,
                    point: new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z()),
                    distance: hitDistance
                };
            } else {
                result = { hit: false, reason: 'out of range or wrong object' };
            }
        }

        // Clean up Ammo objects
        Ammo.destroy(start);
        Ammo.destroy(end);
        Ammo.destroy(rayCallback);

        return result;
    }


    
    /**
     * Handle individual projectile collision
     * @param {Object} projectile The projectile object
     * @param {Object} contactPoint The collision contact point
     * @param {Object} otherBody The other body in the collision
     */
    handleProjectileCollision(projectile, contactPoint, otherBody) {
        try {
            console.log(`🎯 COLLISION DEBUG: handleProjectileCollision called for ${projectile.weaponName}`);
            
            // Find the Three.js object associated with the other body
            let otherObject = null;
            for (const [threeObj, rigidBody] of this.rigidBodies.entries()) {
                if (rigidBody === otherBody) {
                    otherObject = threeObj;
                    console.log(`🎯 COLLISION DEBUG: Found target object: ${threeObj.name || 'unnamed'}`);
                    break;
                }
            }
            
            if (!otherObject) {
                console.log(`❌ COLLISION DEBUG: Could not find Three.js object for collision target`);
                return;
            }
            
            // Call the projectile's collision handler
            if (typeof projectile.onCollision === 'function') {
                console.log(`🎯 COLLISION DEBUG: Calling projectile.onCollision for ${projectile.weaponName}`);
                projectile.onCollision(contactPoint, otherObject);
            } else {
                console.log(`❌ COLLISION DEBUG: ${projectile.weaponName} has no onCollision method`);
            }
            
        } catch (error) {
            console.log('Error handling projectile collision:', error.message);
            console.log('Error stack:', error.stack);
            console.log('Projectile:', projectile?.weaponName);
            console.log('Contact point:', contactPoint);
            console.log('Other body exists:', !!otherBody);
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
                console.log('Error syncing object with physics:', error);
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
            } else if (typeof rigidBody.setCenterOfMassTransform === 'function') {
                rigidBody.setCenterOfMassTransform(transform);
            } else if (rigidBody.getMotionState && typeof rigidBody.getMotionState === 'function') {
                const motionState = rigidBody.getMotionState();
                if (motionState && typeof motionState.setWorldTransform === 'function') {
                    motionState.setWorldTransform(transform);
                }
            } else {
                throw new Error('No compatible transform method found on rigid body');
            }

            // Cleanup Ammo objects
            this.Ammo.destroy(btVector3);
            this.Ammo.destroy(btQuaternion);
            this.Ammo.destroy(transform);

        } catch (error) {
                            console.log(`Error updating rigid body position:`, error);
            throw error; // Re-throw for fallback handling
        }
    }

    /**
     * Update all physics body positions to match their Three.js objects
     */
    updateAllRigidBodyPositions() {
        if (!this.initialized) return;

        console.log(`🔄 CTRL+P DEBUG: Syncing all physics body positions with mesh positions...`);
        console.log(`📊 Physics World Status:`);
        console.log(`   • Total rigid bodies registered: ${this.rigidBodies.size}`);
        console.log(`   • Entity metadata entries: ${this.entityMetadata.size}`);
        console.log(`   • Physics world initialized: ${this.initialized}`);
        console.log(`   • Debug mode: ${this.debugMode ? 'ENABLED' : 'DISABLED'}`);
        
        console.log(`🔍 Physics Body Inventory:`);
        let updateCount = 0;
        let recreateCount = 0;
        
        for (const [threeObject, rigidBody] of this.rigidBodies.entries()) {
            const metadata = this.entityMetadata.get(rigidBody);
            const entityType = metadata ? metadata.type : 'unknown';
            const position = threeObject.position;
            console.log(`   • ${threeObject.name || 'unnamed'} (${entityType}) at (${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)})`);
            
            try {
                this.updateRigidBodyPosition(threeObject);
                updateCount++;
            } catch (error) {
                console.log(`Transform update failed for ${threeObject.name || 'object'}, trying recreation:`, error.message);
                try {
                    this.recreateRigidBodyAtPosition(threeObject);
                    recreateCount++;
                } catch (recreateError) {
                    console.error(`Failed to recreate rigid body for ${threeObject.name || 'object'}:`, recreateError);
                }
            }
        }
        
        console.log(`✅ CTRL+P SYNC COMPLETE:`);
        console.log(`   • Successfully updated: ${updateCount} physics bodies`);
        console.log(`   • Recreated: ${recreateCount} physics bodies`);
        console.log(`   • Total processed: ${updateCount + recreateCount} bodies`);
        if (this.debugMode) {
            console.log(`🔍 Physics debug visualization is ACTIVE`);
            
            // Update debug wireframes to match new physics body positions
            this.updateDebugVisualization();
            console.log(`🔍 Debug wireframes updated to match physics body positions`);
        }
    }

    /**
     * Remove a rigid body from physics world
     * @param {THREE.Object3D} threeObject - The Three.js object
     */
    removeRigidBody(threeObject) {
        if (!this.initialized) return;

        const rigidBody = this.rigidBodies.get(threeObject);
        if (rigidBody) {
            // Check if this is a torpedo - delay wireframe removal to see tracking
            const metadata = this.entityMetadata.get(rigidBody);
            const entityId = metadata?.id || '';
            const isTorpedo = false; // Disable torpedo wireframe preservation to fix collision shapes around ship
            
            if (isTorpedo && this.debugMode) {
                console.log(`🎯 TORPEDO CLEANUP: Preserving wireframe tracking for ${entityId}`);
                
                // Create a separate tracking entry for the torpedo wireframe
                const wireframe = this.debugWireframes.get(rigidBody);
                if (wireframe && threeObject && threeObject.position) {
                    // Initialize delayed wireframes map if it doesn't exist
                    if (!this.delayedWireframes) {
                        this.delayedWireframes = new Map();
                    }
                    
                    // Store the final position for the wireframe
                    const finalPosition = {
                        x: threeObject.position.x,
                        y: threeObject.position.y,
                        z: threeObject.position.z
                    };
                    
                    this.delayedWireframes.set(wireframe, {
                        entityId: entityId,
                        position: finalPosition,
                        timestamp: Date.now(),
                        detonated: true // Mark as properly detonated
                    });
                    
                    console.log(`🎯 TORPEDO WIREFRAME: Stored final position (${finalPosition.x.toFixed(1)}, ${finalPosition.y.toFixed(1)}, ${finalPosition.z.toFixed(1)}) for ${entityId}`);
                }
                
                // Delay wireframe removal for torpedoes so we can see them
                setTimeout(() => {
                    this.removeDebugWireframe(rigidBody);
                    // Clean up from delayed tracking
                    if (this.delayedWireframes && wireframe) {
                        this.delayedWireframes.delete(wireframe);
                    }
                    console.log(`🧹 DELAYED: Removed torpedo wireframe for ${entityId}`);
                }, 3000); // 3 second delay
            } else {
                // Clean up debug wireframe immediately for non-torpedoes
                this.removeDebugWireframe(rigidBody);
            }
            
            this.physicsWorld.removeRigidBody(rigidBody);
            this.rigidBodies.delete(threeObject);
            this.entityMetadata.delete(rigidBody);
            
            // Silent metadata removal
            const entityType = metadata?.type || 'unknown';
            
            this.Ammo.destroy(rigidBody);
            
            // Clean up torpedo logging timestamp to prevent memory leaks
            if (isTorpedo && this._torpedoLogTimestamps) {
                this._torpedoLogTimestamps.delete(entityId);
            }
            
            console.log(`🧹 Removed rigid body${isTorpedo ? ' (wireframe delayed)' : ' and wireframe'}`);
        }
    }

    /**
     * Remove debug wireframe for a specific rigid body
     * @param {object} rigidBody - Ammo.js rigid body
     */
    removeDebugWireframe(rigidBody) {
        if (!rigidBody) return;
        
        const wireframe = this.debugWireframes.get(rigidBody);
        if (wireframe && this.debugGroup) {
            // Remove from scene
            this.debugGroup.remove(wireframe);
            
            // Dispose geometry and material
            if (wireframe.geometry) wireframe.geometry.dispose();
            if (wireframe.material) wireframe.material.dispose();
            
            // Remove from tracking
            this.debugWireframes.delete(rigidBody);
            
            console.log(`🧹 Removed debug wireframe for ${wireframe.userData?.entityType || 'unknown'} entity`);
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

            // Silent collision detection - no logging during normal operation

            // Process manifolds silently unless there are actual contacts
            for (let i = 0; i < numManifolds; i++) {
                let contactManifold = null;
                let numContacts = 0;
                
                try {
                    contactManifold = dispatcher.getManifoldByIndexInternal(i);
                    if (contactManifold) {
                        numContacts = contactManifold.getNumContacts();
                    }
                } catch (error) {
                    if (this._debugLoggingEnabled) {
                        console.error(`❌ Error getting manifold ${i}:`, error);
                    }
                    continue;
                }

                if (numContacts > 0) {
                    if (this._debugLoggingEnabled) {
                        console.log(`💥 Processing ${numContacts} contacts for manifold ${i}`);
                    }
                    
                    let bodyA = null, bodyB = null;
                    try {
                        bodyA = contactManifold.getBody0();
                        bodyB = contactManifold.getBody1();
                    } catch (error) {
                        if (this._debugLoggingEnabled) {
                            console.error(`❌ Error getting bodies:`, error);
                        }
                        continue;
                    }
                    
                    let entityA = this.entityMetadata.get(bodyA);
                    let entityB = this.entityMetadata.get(bodyB);

                    if (entityA && entityB) {
                        if (this._debugLoggingEnabled) {
                            console.log(`💥 COLLISION: ${entityA.type} <-> ${entityB.type}`);
                        }
                        try {
                            this.handleCollision(entityA, entityB, contactManifold);
                        } catch (error) {
                            console.error(`❌ Error in handleCollision:`, error);
                        }
                    }
                }
            }
            
            // Silent collision processing - no logging
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
        } else if ((entityA.type === 'projectile' && entityB.type === 'enemy_ship') ||
                   (entityB.type === 'projectile' && entityA.type === 'enemy_ship')) {
            this.handleProjectileToShipCollision(entityA, entityB, impulse);
        } else if ((entityA.type === 'projectile' && (entityB.type === 'planet' || entityB.type === 'moon' || entityB.type === 'star')) ||
                   (entityB.type === 'projectile' && (entityA.type === 'planet' || entityA.type === 'moon' || entityA.type === 'star'))) {
            this.handleProjectileToCelestialCollision(entityA, entityB, impulse);
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
     * Handle projectile-to-ship collision
     * @param {object} entityA - First entity
     * @param {object} entityB - Second entity
     * @param {number} impulse - Collision impulse
     */
    handleProjectileToShipCollision(entityA, entityB, impulse) {
        // Determine which is the projectile and which is the ship
        const projectile = entityA.type === 'projectile' ? entityA : entityB;
        const ship = entityA.type === 'projectile' ? entityB : entityA;
        
        console.log(`🚀💥 Projectile collision: ${projectile.id} hit ${ship.id}`);
        
        // Find the projectile instance via the rigid body's projectileOwner property
        let projectileInstance = null;
        
        // Get the rigid body from the three object
        const rigidBody = this.rigidBodies.get(projectile.threeObject);
        if (rigidBody && rigidBody.projectileOwner) {
            projectileInstance = rigidBody.projectileOwner;
            console.log(`🔍 Found projectile instance via rigidBody.projectileOwner for ${projectile.id}`);
        } else {
            console.log(`No rigidBody.projectileOwner found for ${projectile.id}`, {
                hasRigidBody: !!rigidBody,
                hasProjectileOwner: !!rigidBody?.projectileOwner,
                rigidBodyKeys: rigidBody ? Object.keys(rigidBody) : []
            });
        }
        
        if (projectileInstance && typeof projectileInstance.onCollision === 'function') {
            console.log(`🔥 Calling projectile onCollision for ${projectile.id}`);
            
            // Create contact point data with cloned position to avoid corruption
            const contactPoint = {
                position: projectile.threeObject?.position.clone() || { x: 0, y: 0, z: 0 },
                impulse: impulse
            };
            
            // Call the projectile's collision handler
            projectileInstance.onCollision(contactPoint, ship.threeObject);
        } else {
            console.log(`Could not find projectile instance with onCollision method for ${projectile.id}`);
        }
    }

    /**
     * Handle projectile-to-celestial collision  
     * @param {object} entityA - First entity
     * @param {object} entityB - Second entity
     * @param {number} impulse - Collision impulse
     */
    handleProjectileToCelestialCollision(entityA, entityB, impulse) {
        // Determine which is the projectile and which is the celestial body
        const projectile = entityA.type === 'projectile' ? entityA : entityB;
        const celestial = entityA.type === 'projectile' ? entityB : entityA;
        
        console.log(`🌍💥 Projectile-to-celestial collision: ${projectile.id} hit ${celestial.id}`);
        
        // Find the projectile instance via the rigid body's projectileOwner property
        let projectileInstance = null;
        
        // Get the rigid body from the three object
        const rigidBody = this.rigidBodies.get(projectile.threeObject);
        if (rigidBody && rigidBody.projectileOwner) {
            projectileInstance = rigidBody.projectileOwner;
            console.log(`🔍 Found projectile instance via rigidBody.projectileOwner for ${projectile.id} (celestial collision)`);
        } else {
            console.log(`No rigidBody.projectileOwner found for ${projectile.id} (celestial collision)`);
        }
        
        if (projectileInstance && typeof projectileInstance.onCollision === 'function') {
            console.log(`🔥 Calling projectile onCollision for ${projectile.id} (hit celestial body)`);
            
            // Create contact point data
            const contactPoint = {
                position: projectile.threeObject?.position || { x: 0, y: 0, z: 0 },
                impulse: impulse
            };
            
            // Call the projectile's collision handler
            projectileInstance.onCollision(contactPoint, celestial.threeObject);
        } else {
            console.log(`Could not find projectile instance with onCollision method for ${projectile.id} (celestial collision)`);
        }
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
            console.log('🔍 Physics debug mode ENABLING - creating wireframes...');
            this.enableDebugVisualization(scene);
            console.log(`🔍 Physics debug mode ENABLED - showing ${this.debugWireframes.size} collision shapes`);
        } else {
            console.log('🔍 Physics debug mode DISABLING - removing wireframes...');
            this.disableDebugVisualization(scene);
            console.log('🔍 Physics debug mode DISABLED - hiding collision shapes');
        }
        
        return this.debugMode;
    }

    /**
     * Disable physics debug visualization
     * @param {THREE.Scene} scene - Three.js scene
     */
    disableDebugVisualization(scene) {
        if (this.debugGroup && scene) {
            // Properly dispose of all wireframes
            for (const [rigidBody, wireframe] of this.debugWireframes.entries()) {
                if (wireframe.geometry) wireframe.geometry.dispose();
                if (wireframe.material) wireframe.material.dispose();
            }
            
            // Clean up delayed torpedo wireframes
            if (this.delayedWireframes) {
                for (const [wireframe, data] of this.delayedWireframes.entries()) {
                    if (wireframe.geometry) wireframe.geometry.dispose();
                    if (wireframe.material) wireframe.material.dispose();
                }
                this.delayedWireframes.clear();
                console.log('🧹 Cleaned up delayed torpedo wireframes');
            }
            
            // Clean up torpedo logging timestamps
            if (this._torpedoLogTimestamps) {
                this._torpedoLogTimestamps.clear();
                console.log('🧹 Cleaned up torpedo logging timestamps');
            }
            
            // Remove all wireframes
            this.debugWireframes.clear();
            scene.remove(this.debugGroup);
            this.debugGroup = null;
            
            console.log('🧹 Disabled physics debug visualization and cleaned up all wireframes');
        }
    }

    /**
     * Enable physics debug visualization
     * @param {THREE.Scene} scene - Three.js scene
     */
    enableDebugVisualization(scene) {
        if (!scene || typeof THREE === 'undefined') {
            console.log('Scene or THREE.js not available for physics debug');
            return;
        }

        // Clear console to remove existing spam
        console.clear();
        console.log('🔍 Physics Debug Mode ENABLED - Console cleared');

        // Create debug group if it doesn't exist
        if (!this.debugGroup) {
            this.debugGroup = new THREE.Group();
            this.debugGroup.name = 'PhysicsDebugGroup';
            this.debugGroup.renderOrder = 999; // Render last to ensure visibility
            scene.add(this.debugGroup);
            if (!this._silentMode) {
                console.log('📦 Created physics debug group');
            }
        }

        // Create wireframes for all existing physics bodies
        let wireframeCount = 0;
        for (const [threeObject, rigidBody] of this.rigidBodies.entries()) {
            this.createDebugWireframe(rigidBody, threeObject);
            wireframeCount++;
        }
        
        // Force an immediate position update for all wireframes
        if (!this._silentMode && this._debugLoggingEnabled) {
            console.log(`🔍 Forcing immediate wireframe position update...`);
        }
        this.updateDebugVisualization();
        
        if (!this._silentMode) {
            // Silent wireframe creation
            console.log(`👁️ PHYSICS DEBUG WIREFRAMES NOW VISIBLE: Look for colored wireframe outlines around objects`);
            console.log(`   • Enemy ships: MAGENTA wireframes`);
            console.log(`   • Celestial bodies (stars): ORANGE wireframes`);
            console.log(`   • Celestial bodies (planets): YELLOW wireframes`);
            console.log(`   • Torpedo projectiles: BRIGHT MAGENTA/RED-PINK wireframes`);
            console.log(`   • Missile projectiles: BRIGHT ORANGE/RED-ORANGE wireframes`);
            console.log(`   • Other projectiles: CYAN/GREEN wireframes`);
            console.log(`   • Unknown objects: WHITE wireframes`);
            console.log(`💡 TIP: Fire torpedoes to see their bright collision shapes in motion!`);
            console.log(`💡 TIP: Press Ctrl+Shift+P to enhance wireframe visibility if you can't see them`);
        }
        
        // Expose debug methods globally for console access
        window.testWireframes = () => this.testWireframeVisibility();
        window.debugWireframes = () => this.debugWireframeInfo();
        window.updateWireframes = () => this.updateDebugVisualization();
        window.moveWireframesToCamera = () => this.moveWireframesToCamera();
        window.enhanceWireframes = () => this.enhanceWireframeVisibility();
        window.enableVerboseLogging = () => this.enableVerboseLogging();
        window.disableVerboseLogging = () => this.disableVerboseLogging();
        window.disableCollisionDebug = () => this.disableCollisionDebug();
        window.clearConsole = () => console.clear();
        window.stopProjectileWireframes = () => { this._silentMode = true; console.log('🔇 Silent mode enabled - reduced logging'); };
        window.checkAllPhysicsShapes = () => this.checkAllPhysicsShapes();
        
        console.log(`💡 Physics Debug Console Commands:`);
        console.log(`   • clearConsole() - Clear the console (recommended first step)`);
        console.log(`   • checkAllPhysicsShapes() - Audit all physics objects and their shape metadata`);
        console.log(`   • debugWireframes() - Show wireframe status summary`);
        console.log(`   • testWireframes() - Make wireframes extremely obvious`);
        console.log(`💡 Collision Mode Toggle Commands:`);
        console.log(`   • window.useRealisticCollision = true  - Match collision sizes to visual meshes (default)`);
        console.log(`   • window.useRealisticCollision = false - Use small collision sizes (weapon-friendly)`);
        console.log(`   • Target dummies: Visual and collision sizes now match (3.0m) for honest hit detection`);
        console.log(`   • moveWireframesToCamera() - Move all wireframes in front of camera`);
        console.log(`   • enhanceWireframes() - Make wireframes more visible`);
        console.log(`   • enableVerboseLogging() - Enable detailed debug logs`);
        console.log(`   • disableVerboseLogging() - Disable detailed debug logs`);
        console.log(`   • disableCollisionDebug() - Stop collision debugging spam`);
        console.log(`   • stopProjectileWireframes() - Enable silent mode`);
        console.log(`   • updateWireframes() - Force update wireframe positions`);
    }

    /**
     * Create wireframe visualization for a physics body
     * @param {object} rigidBody - Ammo.js rigid body
     * @param {THREE.Object3D} threeObject - Associated Three.js object
     */
    createDebugWireframe(rigidBody, threeObject) {
        if (!this.debugMode || !this.debugGroup || !rigidBody || this.debugWireframes.has(rigidBody)) {
            return;
        }

        try {
            const metadata = this.entityMetadata.get(rigidBody);
            
            // Skip less important projectiles to eliminate flashing wireframes, but allow torpedoes/missiles
            const entityType = metadata?.type || 'unknown';
            const entityId = metadata?.id || '';
            const objectName = threeObject?.name || '';
            const userDataType = threeObject?.userData?.type || '';
            
            // Filter out small/fast projectiles (lasers, bullets) but keep important ones (torpedoes, missiles)
            const isFilteredProjectile = 
                entityId.includes('laser') || entityId.includes('Laser') ||
                entityId.includes('bullet') || entityId.includes('Bullet') ||
                objectName.includes('laser') || objectName.includes('bullet') ||
                (entityType === 'projectile' && (
                    entityId.includes('laser') || entityId.includes('bullet') ||
                    entityId.includes('beam') || entityId.includes('ray')
                ));
            
            if (isFilteredProjectile) {
                // Only log if debug logging is enabled
                if (this._debugLoggingEnabled && !this._silentMode) {
                    console.log(`🚫 Skipping wireframe for filtered projectile: ${entityId || objectName || 'unnamed'}`);
                }
                return;
            }
            
            // Silent wireframe creation for projectiles

            // Get collision shape and position
            const collisionShape = rigidBody.getCollisionShape();
            if (!collisionShape) return;

            const transform = new this.Ammo.btTransform();
            rigidBody.getWorldTransform(transform);
            const position = transform.getOrigin();
            const rotation = transform.getRotation();

            // Create wireframe geometry based on collision shape
            let geometry;
            let material;
            let wireframe;

            // Determine shape type and create appropriate wireframe
            console.log(`🔍 WIREFRAME DEBUG: Creating wireframe for ${entityType} "${entityId}"`);
            
            // Use stored shape information instead of trying to detect from corrupted collision shapes
            const storedShapeType = metadata?.shapeType;
            const storedRadius = metadata?.shapeRadius;
            
            console.log(`   • Stored shape type: ${storedShapeType}`);
            console.log(`   • Stored radius: ${storedRadius}`);
            
                        if (storedShapeType === 'sphere') {
                // Sphere shape using stored radius
                console.log(`   • Creating SPHERE wireframe`);
                const radius = storedRadius || 1.0; // Use stored radius or fallback
                console.log(`   • Using stored radius: ${radius}m`);
                geometry = new THREE.SphereGeometry(radius * 1.1, 16, 16);
                
                // Enhanced colors for different entity types
                let wireframeColor;
                if (entityType === 'projectile') {
                    // Bright colors for projectiles to make them stand out
                    wireframeColor = entityId.includes('torpedo') ? 0xff0044 : // Bright red-pink for torpedoes
                                    entityId.includes('missile') ? 0xff4400 : // Bright red-orange for missiles
                                    0x44ff00; // Bright green for other projectiles
                } else {
                    wireframeColor = entityType === 'planet' ? 0xffff00 : 
                                    entityType === 'star' ? 0xff8800 : 
                                    entityType === 'moon' ? 0x88ffff : 0x00ff00;
                }
                
                material = new THREE.MeshBasicMaterial({
                    color: wireframeColor,
                    wireframe: true,
                    transparent: true,
                    opacity: entityType === 'projectile' ? 1.0 : 0.6, // Full opacity for projectiles
                    depthTest: false,
                    depthWrite: false
                });
            } else if (storedShapeType === 'box') {
                // Box shape using stored dimensions
                console.log(`   • Creating BOX wireframe`);
                const width = metadata?.shapeWidth || 2;
                const height = metadata?.shapeHeight || 2;
                const depth = metadata?.shapeDepth || 2;
                console.log(`   • Using stored dimensions: ${width}x${height}x${depth}`);
                geometry = new THREE.BoxGeometry(width * 1.1, height * 1.1, depth * 1.1);
                
                // Enhanced colors for different entity types
                let wireframeColor;
                if (entityType === 'projectile') {
                    // Bright, distinctive colors for projectiles
                    wireframeColor = entityId.includes('torpedo') ? 0xff0044 : // Bright red-pink for torpedoes
                                    entityId.includes('missile') ? 0xff4400 : // Bright red-orange for missiles
                                    0x44ff00; // Bright green for other projectiles
                } else {
                    wireframeColor = entityType === 'planet' ? 0xffff00 : 
                                    entityType === 'star' ? 0xff8800 : 0x00ff00;
                }
                
                material = new THREE.MeshBasicMaterial({
                    color: wireframeColor,
                    wireframe: true,
                    transparent: true,
                    opacity: entityType === 'projectile' ? 1.0 : 0.6, // Full opacity for projectiles
                    depthTest: false,
                    depthWrite: false
                });
            } else if (storedShapeType === 'capsule') {
                // Capsule shape using stored dimensions
                console.log(`   • Creating CAPSULE wireframe (approximated as cylinder)`);
                const radius = metadata?.shapeRadius || 1;
                const height = metadata?.shapeHeight || 2;
                console.log(`   • Using stored capsule dimensions: radius=${radius}, height=${height}`);
                geometry = new THREE.CylinderGeometry(radius * 1.1, radius * 1.1, height * 1.1, 16);
                
                // Enhanced colors for different entity types
                let wireframeColor;
                if (entityType === 'projectile') {
                    wireframeColor = entityId.includes('torpedo') ? 0xff0044 : 
                                    entityId.includes('missile') ? 0xff4400 : 0x44ff00;
                } else {
                    wireframeColor = entityType === 'planet' ? 0xffff00 : 
                                    entityType === 'star' ? 0xff8800 : 
                                    entityType === 'moon' ? 0x88ffff : 0x00ff00;
                }
                
                material = new THREE.MeshBasicMaterial({
                    color: wireframeColor,
                    wireframe: true,
                    transparent: true,
                    opacity: entityType === 'projectile' ? 1.0 : 0.6,
                    depthTest: false,
                    depthWrite: false
                });
            } else {
                // Default to box for unknown shapes
                console.log(`   • Creating DEFAULT BOX wireframe (unknown shape type: ${storedShapeType})`);
                geometry = new THREE.BoxGeometry(2, 2, 2);
                material = new THREE.MeshBasicMaterial({
                    color: entityType === 'projectile' ? 0xffffff : 0xffffff, // White for unknown projectiles
                    wireframe: true,
                    transparent: true,
                    opacity: entityType === 'projectile' ? 1.0 : 0.6, // Full opacity for projectiles
                    depthTest: false,
                    depthWrite: false
                });
            }

            // Create wireframe mesh
            wireframe = new THREE.Mesh(geometry, material);
            
            // Make projectile wireframes MUCH bigger for visibility
            if (entityType === 'projectile') {
                wireframe.scale.set(10, 10, 10); // 10x larger for torpedoes!
                // Silent torpedo wireframe creation
            }
            
            // Force wireframes to always render on top
            wireframe.renderOrder = 1000;
            wireframe.material.depthTest = false;

            // Set initial position and rotation from physics body
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

            const entityName = metadata?.id || threeObject.name || 'unnamed';
            
            // Only log if debug logging is enabled or for important entities
            if (!this._silentMode && (this._debugLoggingEnabled || entityType === 'star' || entityType === 'planet' || entityType === 'projectile')) {
                let colorName;
                if (entityType === 'projectile') {
                    if (entityId.includes('torpedo')) {
                        colorName = 'BRIGHT MAGENTA/RED-PINK';
                    } else if (entityId.includes('missile')) {
                        colorName = 'BRIGHT ORANGE/RED-ORANGE';
                    } else {
                        colorName = 'CYAN/GREEN';
                    }
                } else {
                    colorName = entityType === 'enemy_ship' ? 'MAGENTA' : 
                               entityType === 'planet' ? 'YELLOW' :
                               entityType === 'star' ? 'ORANGE' : 'CYAN';
                }
                
                console.log(`🔍 Created ${colorName} wireframe for ${entityName} (${entityType}) at (${position.x().toFixed(2)}, ${position.y().toFixed(2)}, ${position.z().toFixed(2)})`);
            }

        } catch (error) {
            if (this._debugLoggingEnabled && !this._silentMode) {
                                    console.log('Failed to create debug wireframe:', error);
            }
        }
    }

    /**
     * Update debug wireframes to match current physics body positions
     */
    updateDebugVisualization() {
        if (!this.debugMode || !this.debugGroup) {
            return;
        }

        let updateCount = 0;
        const staleWireframes = [];
        
        // Update existing wireframes using Three.js object positions (more reliable)
        for (const [threeObject, rigidBody] of this.rigidBodies.entries()) {
            const wireframe = this.debugWireframes.get(rigidBody);
            if (wireframe) {
                try {
                    // Use Three.js object position and rotation (this works correctly!)
                    const position = threeObject.position;
                    const quaternion = threeObject.quaternion;

                    // Apply position and rotation to wireframe
                    wireframe.position.set(position.x, position.y, position.z);
                    wireframe.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
                    
                    // Debug: Log position updates for torpedoes (throttled to avoid spam)
                    const metadata = this.entityMetadata.get(rigidBody);
                    const entityId = metadata?.id || 'unknown';
                    if (entityId.includes('Torpedo') && !this._silentMode) {
                        // Initialize torpedo logging timestamps if not exists
                        if (!this._torpedoLogTimestamps) {
                            this._torpedoLogTimestamps = new Map();
                        }
                        
                        const now = Date.now();
                        const lastLogTime = this._torpedoLogTimestamps.get(entityId);
                        
                        // Completely silent torpedo wireframe updates
                    }
                    
                    updateCount++;
                } catch (error) {
                    console.log('Failed to update debug wireframe - marking for removal:', error);
                    staleWireframes.push(rigidBody);
                }
            }
        }
        
        // Update delayed torpedo wireframes (for torpedoes that have been cleaned up but wireframes are still visible)
        if (this.delayedWireframes && this.delayedWireframes.size > 0) {
            const now = Date.now();
            for (const [wireframe, data] of this.delayedWireframes.entries()) {
                try {
                    // Only lock wireframes at their final position if they have actually detonated
                    // Otherwise, these wireframes should have been removed when the torpedo was cleaned up
                    if (data.detonated && data.position) {
                        wireframe.position.set(data.position.x, data.position.y, data.position.z);
                    }
                    
                    // Clean up wireframes that have been displayed long enough
                    if (now - data.timestamp > 3000) { // Remove after 3 seconds
                        this.delayedWireframes.delete(wireframe);
                        if (wireframe.parent) {
                            wireframe.parent.remove(wireframe);
                        }
                        continue;
                    }
                    
                    updateCount++;
                } catch (error) {
                    console.log('Failed to update delayed torpedo wireframe:', error);
                    this.delayedWireframes.delete(wireframe);
                }
            }
        }
        
        // Clean up stale wireframes
        staleWireframes.forEach(rigidBody => {
            this.removeDebugWireframe(rigidBody);
        });
        
        // Silent position updates - no logging
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
                console.log('No metadata found for rigid body');
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
        const propertyMethods = {
            'collisionObject': [
                'get_m_collisionObject',
                'm_collisionObject', 
                'getCollisionObject',
                'collisionObject'
            ],
            'closestHitFraction': [
                'get_m_closestHitFraction',
                'm_closestHitFraction',
                'getClosestHitFraction',
                'closestHitFraction',
                'get_closestHitFraction',
                'hasHit' // Alternative method that exists on most raycast callbacks
            ],
            'hitPointWorld': [
                'get_m_hitPointWorld',
                'm_hitPointWorld',
                'getHitPointWorld',
                'hitPointWorld',
                'get_hitPointWorld'
            ],
            'hitNormalWorld': [
                'get_m_hitNormalWorld', 
                'm_hitNormalWorld',
                'getHitNormalWorld',
                'hitNormalWorld',
                'get_hitNormalWorld'
            ]
        };

        const methods = propertyMethods[property];
        if (!methods) {
            // Reduce console spam - only warn once per unknown property
            if (!this._warnedProperties) this._warnedProperties = new Set();
            if (!this._warnedProperties.has(property)) {
                console.log(`Unknown raycast property: ${property}`);
                this._warnedProperties.add(property);
            }
            return null;
        }

        // Try each method in order
        for (const methodName of methods) {
            try {
                // Try as method call
                if (typeof rayCallback[methodName] === 'function') {
                    const result = rayCallback[methodName]();
                    // Only log success on first successful access per property to reduce spam
                    if (this._debugLoggingEnabled && !this._successfulMethods) this._successfulMethods = new Set();
                    if (this._debugLoggingEnabled && !this._successfulMethods.has(`${property}_${methodName}`)) {
                        console.log(`✅ RAYCAST API: ${property} accessed via ${methodName}()`);
                        this._successfulMethods.add(`${property}_${methodName}`);
                    }
                    return result;
                }
                
                // Try as direct property
                if (rayCallback[methodName] !== undefined) {
                    const result = rayCallback[methodName];
                    // Only log success on first successful access per property to reduce spam
                    if (this._debugLoggingEnabled && !this._successfulMethods) this._successfulMethods = new Set();
                    if (this._debugLoggingEnabled && !this._successfulMethods.has(`${property}_${methodName}`)) {
                        console.log(`✅ RAYCAST API: ${property} accessed via ${methodName} (property)`);
                        this._successfulMethods.add(`${property}_${methodName}`);
                    }
                    return result;
                }
            } catch (error) {
                // Silent catch - continue to next method
                continue;
            }
        }

        // Special handling for closestHitFraction - try hasHit() and return 0.0 or 1.0
        if (property === 'closestHitFraction') {
            try {
                if (typeof rayCallback.hasHit === 'function' && rayCallback.hasHit()) {
                    return 0.5; // Return a reasonable hit fraction
                }
                // If no hit, return null instead of causing errors
                return null;
            } catch (error) {
                // Final fallback - assume no hit to avoid errors
                return null;
            }
        }

        // Reduce console spam - only warn periodically for failed property access
        if (!this._silentMode && !this._lastFailureWarning) this._lastFailureWarning = {};
        const now = Date.now();
        if (!this._silentMode && (!this._lastFailureWarning[property] || now - this._lastFailureWarning[property] > 5000)) {
            console.log(`Could not access raycast property ${property} with any known method`);
            this._lastFailureWarning[property] = now;
        }

        return null;
    }

    /**
     * Make all debug wireframes more visible (for debugging visibility issues)
     */
    enhanceWireframeVisibility() {
        if (!this.debugMode || !this.debugGroup) {
            console.log('❌ Debug mode not active - cannot enhance wireframes');
            return;
        }
        
        let enhancedCount = 0;
        for (const [rigidBody, wireframe] of this.debugWireframes.entries()) {
            if (wireframe && wireframe.material) {
                // Make wireframes very visible
                wireframe.material.color.setHex(0xff0000); // Bright red
                wireframe.material.transparent = true;
                wireframe.material.opacity = 0.8;
                wireframe.material.depthTest = false;
                wireframe.material.depthWrite = false;
                wireframe.renderOrder = 9999;
                wireframe.scale.set(1.5, 1.5, 1.5); // Make them bigger
                enhancedCount++;
            }
        }
        
        console.log(`🔍 Enhanced visibility for ${enhancedCount} wireframes - they should now be bright red and enlarged`);
        
        // Also log the debug group status
        console.log(`🔍 Debug group status:`);
        console.log(`   • Parent scene: ${!!this.debugGroup.parent}`);
        console.log(`   • Children count: ${this.debugGroup.children.length}`);
        console.log(`   • Visible: ${this.debugGroup.visible}`);
        console.log(`   • Position: (${this.debugGroup.position.x}, ${this.debugGroup.position.y}, ${this.debugGroup.position.z})`);
    }

    /**
     * Make wireframes extremely obvious for debugging (console command)
     */
    testWireframeVisibility() {
        if (!this.debugMode || !this.debugGroup) {
            console.log('❌ Debug mode not active');
            return;
        }
        
        console.log(`🔍 Testing wireframe visibility - making them extremely obvious...`);
        
        // First, force update all wireframe positions
        console.log(`🔍 Force updating wireframe positions first...`);
        this.updateDebugVisualization();
        
        let count = 0;
        // Use the same iteration approach as the working physics inventory
        for (const [threeObject, rigidBody] of this.rigidBodies.entries()) {
            const wireframe = this.debugWireframes.get(rigidBody);
            if (wireframe && wireframe.material) {
                // Get position from Three.js object (this works!) instead of transform
                const threePos = threeObject.position;
                
                // Set wireframe to match Three.js object position
                wireframe.position.set(threePos.x, threePos.y, threePos.z);
                
                // Make them absolutely impossible to miss
                wireframe.material.color.setHex(0xff0000); // Bright red
                wireframe.material.transparent = false;
                wireframe.material.opacity = 1.0;
                wireframe.material.wireframe = false; // Solid, not wireframe
                wireframe.material.depthTest = false;
                wireframe.material.depthWrite = false;
                wireframe.renderOrder = 99999;
                wireframe.scale.set(3, 3, 3); // Make them 3x larger
                wireframe.material.needsUpdate = true;
                count++;
                
                const metadata = this.entityMetadata.get(rigidBody);
                console.log(`🔍 Enhanced wireframe ${count}: ${metadata?.type || 'unknown'}`);
                console.log(`   • Three.js position: (${threePos.x.toFixed(2)}, ${threePos.y.toFixed(2)}, ${threePos.z.toFixed(2)})`);
                console.log(`   • Wireframe position: (${wireframe.position.x.toFixed(2)}, ${wireframe.position.y.toFixed(2)}, ${wireframe.position.z.toFixed(2)})`);
                console.log(`   • Scale: (${wireframe.scale.x}, ${wireframe.scale.y}, ${wireframe.scale.z})`);
                console.log(`   • Visible: ${wireframe.visible}`);
                console.log(`   • Parent: ${!!wireframe.parent}`);
            }
        }
        
        console.log(`🔍 Made ${count} wireframes into BRIGHT RED SOLID SHAPES that are 3x larger`);
        console.log(`🔍 All wireframes positioned using Three.js object positions (not physics transforms)`);
    }

    /**
     * Print detailed debug information about wireframes
     */
    debugWireframeInfo() {
        console.log(`🔍 === WIREFRAME DEBUG INFO ===`);
        console.log(`🔍 Debug mode: ${this.debugMode}`);
        console.log(`🔍 Debug group exists: ${!!this.debugGroup}`);
        console.log(`🔍 Debug group parent: ${!!this.debugGroup?.parent}`);
        console.log(`🔍 Debug group children: ${this.debugGroup?.children.length || 0}`);
        console.log(`🔍 Wireframes in map: ${this.debugWireframes.size}`);
        
        console.log(`🔍 Physics bodies: ${this.rigidBodies.size}`);
        
        if (this.debugGroup && this.debugWireframes.size > 0) {
            let visibleCount = 0;
            this.debugWireframes.forEach((wireframe, rigidBody) => {
                const metadata = this.entityMetadata.get(rigidBody);
                const entityName = metadata?.id || 'unnamed';
                const entityType = metadata?.type || 'unknown';
                
                if (wireframe.visible) visibleCount++;
                
                console.log(`🔍 ${entityName} (${entityType}):`);
                console.log(`   • Visible: ${wireframe.visible}`);
                console.log(`   • Position: (${wireframe.position.x.toFixed(2)}, ${wireframe.position.y.toFixed(2)}, ${wireframe.position.z.toFixed(2)})`);
                console.log(`   • Color: #${wireframe.material.color.getHexString()}`);
            });
            
            console.log(`🔍 Summary: ${visibleCount}/${this.debugWireframes.size} wireframes visible`);
        }
        
        if (window.camera) {
            console.log(`🔍 Camera position: (${window.camera.position.x.toFixed(2)}, ${window.camera.position.y.toFixed(2)}, ${window.camera.position.z.toFixed(2)})`);
        }
    }

    /**
     * Move all wireframes to camera position for testing
     */
    moveWireframesToCamera() {
        if (!this.debugMode || !this.debugGroup || !window.camera) {
            console.log('❌ Debug mode not active or no camera available');
            return;
        }
        
        console.log(`🔍 Moving all wireframes to camera position for visibility test...`);
        
        const cameraPos = window.camera.position;
        const offsetDistance = 5; // Distance in front of camera
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(window.camera.quaternion);
        
        let movedCount = 0;
        this.debugWireframes.forEach((wireframe, rigidBody) => {
            const metadata = this.entityMetadata.get(rigidBody);
            const entityName = metadata?.id || 'unnamed';
            
            // Position wireframe in front of camera in a line
            const offset = new THREE.Vector3().copy(cameraDirection).multiplyScalar(offsetDistance + movedCount * 2);
            wireframe.position.copy(cameraPos).add(offset);
            
            // Make them very obvious
            wireframe.material.color.setHex(0xff0000); // Bright red
            wireframe.material.wireframe = false; // Solid
            wireframe.scale.set(0.5, 0.5, 0.5); // Smaller for testing
            wireframe.material.needsUpdate = true;
            
            console.log(`🔍 Moved ${entityName} to camera front at distance ${offsetDistance + movedCount * 2}`);
            movedCount++;
        });
        
        console.log(`🔍 Moved ${movedCount} wireframes to camera position - you should see red cubes in front of you!`);
    }

    /**
     * Enable verbose debug logging
     */
    enableVerboseLogging() {
        this._debugLoggingEnabled = true;
        console.log('🔍 Verbose physics debug logging ENABLED');
    }

    /**
     * Disable verbose debug logging  
     */
    disableVerboseLogging() {
        this._debugLoggingEnabled = false;
        console.log('🔍 Verbose physics debug logging DISABLED');
    }

    /**
     * Disable collision debugging to reduce console spam
     */
    disableCollisionDebug() {
        this._silentMode = true;
        this._debugLoggingEnabled = false;
        console.log('🔇 Collision debugging disabled');
    }

    /**
     * Create a visual indicator for collision detection
     * @param {THREE.Vector3} projectilePos - Position of the projectile
     * @param {THREE.Vector3} targetPos - Position of the target
     * @param {number} collisionThreshold - The collision detection radius
     */
    createCollisionVisualization(projectilePos, targetPos, collisionThreshold) {
        if (!window.starfieldManager?.scene) return;
        
        // Create damage zone spheres - scaled appropriately for distance
        const damageZones = [
            { radius: 0.5, color: 0xff0000, name: 'close hits' },      // 0.5m - Red (direct hit)
            { radius: 2, color: 0xff6600, name: 'medium range' },      // 2m - Orange (close)  
            { radius: 5, color: 0xffff00, name: 'edge hits' }          // 5m - Yellow (edge damage)
        ];
        
        const spheres = [];
        
        damageZones.forEach(zone => {
            const geometry = new THREE.SphereGeometry(zone.radius, 16, 12);
            const material = new THREE.MeshBasicMaterial({ 
                color: zone.color,
                wireframe: true, 
                transparent: true, 
                opacity: 0.7 
            });
            
            const sphere = new THREE.Mesh(geometry, material);
            // Ensure proper position setting for THREE.js
            if (projectilePos.isVector3) {
                sphere.position.copy(projectilePos);
            } else {
                sphere.position.set(projectilePos.x, projectilePos.y, projectilePos.z);
            }
            console.log(`🔍 SPHERE ${zone.name}: Set position to (${sphere.position.x.toFixed(1)}, ${sphere.position.y.toFixed(1)}, ${sphere.position.z.toFixed(1)})`);
            
            window.starfieldManager.scene.add(sphere);
            spheres.push({ sphere, geometry, material });
        });
        
        // Remove all visualization spheres after 3 seconds
        setTimeout(() => {
            if (window.starfieldManager?.scene) {
                spheres.forEach(({ sphere, geometry, material }) => {
                    window.starfieldManager.scene.remove(sphere);
                    geometry.dispose();
                    material.dispose();
                });
            }
        }, 3000);
        
        console.log(`👁️ Created collision visualization showing damage zones at detonation point: ${projectilePos.x.toFixed(1)}, ${projectilePos.y.toFixed(1)}, ${projectilePos.z.toFixed(1)}`);
    }

    /**
     * Check all physics objects and their shape metadata for debugging
     */
    checkAllPhysicsShapes() {
        console.log("=== PHYSICS SHAPE METADATA AUDIT ===");
        console.log(`📊 Total rigid bodies: ${this.rigidBodies.size}`);
        console.log(`📊 Total entity metadata: ${this.entityMetadata.size}\n`);

        let sphereCount = 0;
        let boxCount = 0;
        let capsuleCount = 0;
        let unknownCount = 0;
        let missingMetadataCount = 0;

        for (const [threeObject, rigidBody] of this.rigidBodies.entries()) {
            const metadata = this.entityMetadata.get(rigidBody);
            
            if (!metadata) {
                console.log(`❌ MISSING METADATA: ${threeObject.name || 'unnamed'}`);
                missingMetadataCount++;
                continue;
            }

            const { type, id, shapeType, shapeRadius, shapeWidth, shapeHeight, shapeDepth } = metadata;
            
            console.log(`🔍 ${type} "${id || 'unnamed'}":`);
            console.log(`   • Shape: ${shapeType || 'MISSING'}`);
            
            switch (shapeType) {
                case 'sphere':
                    console.log(`   • Radius: ${shapeRadius || 'MISSING'}m`);
                    sphereCount++;
                    break;
                case 'box':
                    console.log(`   • Dimensions: ${shapeWidth || '?'}x${shapeHeight || '?'}x${shapeDepth || '?'}`);
                    boxCount++;
                    break;
                case 'capsule':
                    console.log(`   • Radius: ${shapeRadius || 'MISSING'}m, Height: ${shapeHeight || 'MISSING'}m`);
                    capsuleCount++;
                    break;
                default:
                    console.log(`   • ❌ UNKNOWN SHAPE TYPE: ${shapeType}`);
                    unknownCount++;
            }
            
            // Check for missing required properties
            const issues = [];
            if (!shapeType) issues.push('shapeType');
            if (shapeType === 'sphere' && !shapeRadius) issues.push('shapeRadius');
            if (shapeType === 'box' && (!shapeWidth || !shapeHeight || !shapeDepth)) {
                issues.push('box dimensions');
            }
            if (shapeType === 'capsule' && (!shapeRadius || !shapeHeight)) {
                issues.push('capsule dimensions');
            }
            
            if (issues.length > 0) {
                console.log(`   • ⚠️  MISSING: ${issues.join(', ')}`);
            } else {
                console.log(`   • ✅ Shape metadata complete`);
            }
            console.log('');
        }

        console.log("=== SUMMARY ===");
        console.log(`✅ Spheres: ${sphereCount}`);
        console.log(`✅ Boxes: ${boxCount}`);
        console.log(`✅ Capsules: ${capsuleCount}`);
        console.log(`❌ Unknown shapes: ${unknownCount}`);
        console.log(`❌ Missing metadata: ${missingMetadataCount}`);
        
        const total = sphereCount + boxCount + capsuleCount + unknownCount;
        const healthyCount = sphereCount + boxCount + capsuleCount;
        const healthyPercentage = total > 0 ? ((healthyCount / total) * 100).toFixed(1) : '0';
        
        console.log(`\n🎯 Overall Health: ${healthyPercentage}% (${healthyCount}/${total} objects have proper shape metadata)`);
        
        if (unknownCount > 0 || missingMetadataCount > 0) {
            console.log(`\n⚠️  ISSUES FOUND: ${unknownCount + missingMetadataCount} objects need attention`);
        } else {
            console.log(`\n🎉 ALL PHYSICS OBJECTS HAVE PROPER SHAPE METADATA!`);
        }
    }
}

export default PhysicsManager;