/**
 * WeaponCard - Base class for weapon cards and specific weapon implementations
 * Based on docs/weapons_system_spec.md and docs/system_architecture.md
 * Implements Scan-Hit and Splash-Damage weapon types
 */

export class WeaponCard {
    constructor(weaponData) {
        // Basic weapon properties
        this.weaponId = weaponData.weaponId || `weapon_${Date.now()}`;
        this.name = weaponData.name || 'Unknown Weapon';
        this.weaponType = weaponData.weaponType || 'scan-hit'; // 'scan-hit' or 'splash-damage'
        this.damage = weaponData.damage || 50;
        this.cooldownTime = weaponData.cooldownTime || 0.5; // seconds
        this.range = weaponData.range || 1000; // meters
        this.autofireEnabled = weaponData.autofireEnabled || false;
        this.accuracy = weaponData.accuracy || 0.95; // 0-1 scale
        this.energyCost = weaponData.energyCost || 10;
        this.targetLockRequired = weaponData.targetLockRequired || false;
        
        // Special properties (varies by weapon type)
        this.specialProperties = weaponData.specialProperties || {};
        
        // Blast radius for splash-damage weapons
        this.blastRadius = weaponData.blastRadius || 0;
        
        // Homing capability for missiles
        this.homingCapability = weaponData.homingCapability || false;
        
        console.log(`WeaponCard created: ${this.name} (${this.weaponType})`);
    }
    
    /**
     * Fire the weapon (base implementation)
     * @param {Object} origin Origin position
     * @param {Object} target Target object (may be null)
     * @returns {Object} Fire result
     */
    fire(origin, target = null) {
        // Base implementation - should be overridden by specific weapon types
        console.warn(`Base WeaponCard.fire() called for ${this.name} - should be overridden`);
        
        return {
            success: false,
            reason: 'Base weapon class cannot fire',
            damage: 0
        };
    }
    
    /**
     * Calculate damage based on distance
     * @param {number} distance Distance to target
     * @returns {number} Calculated damage
     */
    calculateDamage(distance) {
        if (distance > this.range) {
            return 0; // Out of range
        }
        
        // Base damage calculation - can be overridden
        return this.damage;
    }
    
    /**
     * Check if target is valid for this weapon
     * @param {Object} target Target object
     * @param {number} distance Distance to target
     * @returns {boolean} True if target is valid
     */
    isValidTarget(target, distance) {
        if (!target) {
            return !this.targetLockRequired; // Weapons that don't require lock can fire without target
        }
        
        return distance <= this.range;
    }
    
    /**
     * Create projectile for splash-damage weapons
     * @param {Object} origin Origin position
     * @param {Object} target Target object
     * @returns {Projectile} Projectile instance
     */
    createProjectile(origin, target) {
        // Override in splash-damage weapons
        console.warn(`createProjectile() not implemented for ${this.name}`);
        return null;
    }
    
    /**
     * Get weapon card data for UI display
     * @returns {Object} Card display data
     */
    getCardData() {
        return {
            weaponId: this.weaponId,
            name: this.name,
            weaponType: this.weaponType,
            damage: this.damage,
            cooldownTime: this.cooldownTime,
            range: this.range,
            autofireEnabled: this.autofireEnabled,
            accuracy: this.accuracy,
            energyCost: this.energyCost,
            blastRadius: this.blastRadius,
            homingCapability: this.homingCapability,
            targetLockRequired: this.targetLockRequired,
            specialProperties: this.specialProperties
        };
    }
}

/**
 * ScanHitWeapon - Direct-fire energy weapons (lasers, plasma cannons)
 */
export class ScanHitWeapon extends WeaponCard {
    constructor(weaponData) {
        super({
            ...weaponData,
            weaponType: 'scan-hit',
            targetLockRequired: false // Scan-hit weapons don't require target lock
        });
        
        // Scan-hit specific properties
        this.penetration = weaponData.penetration || false;
    }
    
    /**
     * Fire scan-hit weapon
     * @param {Object} origin Origin position
     * @param {Object} target Target object (optional)
     * @returns {Object} Fire result
     */
    fire(origin, target = null) {
        console.log(`${this.name} firing (scan-hit)`);
        
        // For scan-hit weapons, we always return hit: true because they use
        // visual hit detection in the WeaponSlot.triggerWeaponEffects method
        // rather than probabilistic hit calculation here
        
        return {
            success: true,
            hit: true, // Always true for scan-hit weapons - actual hit detection happens in triggerWeaponEffects
            damage: this.damage, // Use full weapon damage - visual effects will handle actual targeting
            weaponType: this.name,
            distance: target ? this.calculateDistanceToTarget(origin, target) : 0
        };
    }
    
    /**
     * Calculate hit chance based on distance and accuracy
     * @param {Object} target Target object
     * @returns {number} Hit chance (0-1)
     */
    calculateHitChance(target) {
        if (!target) {
            return 0; // Can't hit without a target
        }
        
        const distance = this.calculateDistanceToTarget(null, target);
        
        // Accuracy degrades with distance
        const rangeFactor = Math.max(0, 1 - (distance / this.range));
        return this.accuracy * rangeFactor;
    }
    
    /**
     * Apply instant damage to target
     * @param {Object} target Target object
     * @param {number} damage Damage amount
     */
    applyInstantDamage(target, damage) {
        console.log(`${this.name} deals ${damage} damage to target`);
        
        // This would integrate with the combat/damage system
        if (target.takeDamage) {
            target.takeDamage(damage);
        }
    }
    
    /**
     * Calculate distance to target (placeholder)
     * @param {Object} origin Origin position
     * @param {Object} target Target object
     * @returns {number} Distance
     */
    calculateDistanceToTarget(origin, target) {
        // This would integrate with the existing distance calculation system
        return 500; // placeholder
    }
}

/**
 * SplashDamageWeapon - Projectile-based weapons (missiles, torpedoes)
 */
export class SplashDamageWeapon extends WeaponCard {
    constructor(weaponData) {
        super({
            ...weaponData,
            weaponType: 'splash-damage',
            targetLockRequired: weaponData.targetLockRequired !== false // Default to true unless explicitly false
        });
        
        // Splash-damage specific properties
        this.flightRange = weaponData.flightRange || this.range;
        this.turnRate = weaponData.turnRate || 90; // degrees per second for homing
    }
    
    /**
     * Fire splash-damage weapon
     * @param {Object} origin Origin position
     * @param {Object} target Target object
     * @returns {Object} Fire result
     */
    fire(origin, target = null) {
        console.log(`${this.name} firing (splash-damage)`);
        
        // Splash-damage weapons typically require a target
        if (this.targetLockRequired && !target) {
            return {
                success: false,
                reason: 'Target lock required',
                damage: 0
            };
        }
        
        // Create and launch projectile
        const projectile = this.createProjectile(origin, target);
        
        if (projectile) {
            // Add projectile to game's projectile manager
            this.addProjectileToGame(projectile);
            
            return {
                success: true,
                projectile: projectile,
                weaponType: this.name,
                damage: this.damage // Potential damage
            };
        }
        
        return {
            success: false,
            reason: 'Failed to create projectile',
            damage: 0
        };
    }
    
    /**
     * Create projectile for splash-damage weapon
     * @param {Object} origin Origin position
     * @param {Object} target Target object
     * @returns {Projectile} Projectile instance
     */
    createProjectile(origin, target) {
        // Calculate direction to target for physics projectiles
        let direction = { x: 0, y: 0, z: 1 }; // Default forward
        if (target && target.position) {
            const dirVector = {
                x: target.position.x - origin.x,
                y: target.position.y - origin.y,
                z: target.position.z - origin.z
            };
            const magnitude = Math.sqrt(dirVector.x * dirVector.x + dirVector.y * dirVector.y + dirVector.z * dirVector.z);
            if (magnitude > 0) {
                direction = {
                    x: dirVector.x / magnitude,
                    y: dirVector.y / magnitude,
                    z: dirVector.z / magnitude
                };
            }
        }

        // Try to create physics-based projectile first
        if (window.physicsManager && window.physicsManager.isReady()) {
            try {
                const physicsProjectile = new PhysicsProjectile({
                    origin: origin,
                    direction: direction,
                    target: target,
                    damage: this.damage,
                    blastRadius: this.blastRadius,
                    flightRange: this.flightRange,
                    isHoming: this.homingCapability,
                    turnRate: this.turnRate,
                    weaponName: this.name,
                    physicsManager: window.physicsManager,
                    scene: window.scene
                });
                
                console.log(`🚀 Created physics projectile: ${this.name}`);
                return physicsProjectile;
                
            } catch (error) {
                console.warn('Failed to create physics projectile, falling back to simple projectile:', error);
            }
        }
        
        // Fallback to simple projectile if physics not available
        console.log(`⚠️ Using fallback projectile for ${this.name}`);
        return new Projectile({
            origin: origin,
            target: target,
            damage: this.damage,
            blastRadius: this.blastRadius,
            flightRange: this.flightRange,
            isHoming: this.homingCapability,
            turnRate: this.turnRate,
            weaponName: this.name
        });
    }
    
    /**
     * Calculate splash damage based on distance from blast center
     * @param {number} distance Distance from blast center
     * @returns {number} Damage amount
     */
    calculateSplashDamage(distance) {
        if (distance > this.blastRadius) {
            return 0; // Outside blast radius
        }
        
        // Linear falloff from center to edge
        const falloffFactor = 1 - (distance / this.blastRadius);
        return this.damage * falloffFactor;
    }
    
    /**
     * Add projectile to game's projectile management system
     * @param {Projectile} projectile Projectile to add
     */
    addProjectileToGame(projectile) {
        console.log(`Adding projectile to game: ${projectile.weaponName}`);
        
        // Add to global projectile tracking for frame updates
        if (!window.activeProjectiles) {
            window.activeProjectiles = [];
        }
        
        window.activeProjectiles.push(projectile);
        
        // If it's a physics projectile, it will be automatically updated by the physics system
        // If it's a fallback projectile, we need to set up manual updates
        if (projectile instanceof PhysicsProjectile) {
            console.log(`✅ Physics projectile added to tracking: ${projectile.weaponName}`);
        } else {
            console.log(`⚠️ Fallback projectile added to tracking: ${projectile.weaponName}`);
            // Set up simple flight simulation for fallback projectiles
            this.simulateFallbackProjectile(projectile);
        }
    }
    
    /**
     * Simulate flight for fallback projectiles (when physics not available)
     * @param {Projectile} projectile Fallback projectile to simulate
     */
    simulateFallbackProjectile(projectile) {
        const flightTime = 2000; // 2 seconds flight time
        const updateInterval = 50; // 50ms updates (20 FPS)
        
        const startTime = Date.now();
        const simulationTimer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            
            if (elapsed >= flightTime || projectile.hasDetonated) {
                clearInterval(simulationTimer);
                if (!projectile.hasDetonated) {
                    console.log(`⏰ ${projectile.weaponName} flight time expired, detonating`);
                    projectile.detonate();
                }
                
                // Remove from active projectiles
                const index = window.activeProjectiles.indexOf(projectile);
                if (index > -1) {
                    window.activeProjectiles.splice(index, 1);
                }
                return;
            }
            
            // Update projectile
            projectile.update(updateInterval);
        }, updateInterval);
    }
}

/**
 * Projectile - Physics-based projectile for splash-damage weapons
 */
export class Projectile {
    constructor(config) {
        this.position = { ...config.origin };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.target = config.target;
        this.damage = config.damage || 100;
        this.blastRadius = config.blastRadius || 50;
        this.flightRange = config.flightRange || 3000;
        this.isHoming = config.isHoming || false;
        this.turnRate = config.turnRate || 90; // degrees per second
        this.weaponName = config.weaponName || 'Projectile';
        
        this.hasDetonated = false;
        this.distanceTraveled = 0;
        this.launchTime = Date.now();
        
        // Calculate initial velocity toward target
        this.calculateInitialVelocity();
        
        console.log(`Projectile created: ${this.weaponName} (homing: ${this.isHoming})`);
    }
    
    /**
     * Update projectile physics
     * @param {number} deltaTime Time elapsed in milliseconds
     */
    update(deltaTime) {
        if (this.hasDetonated) return;
        
        const deltaSeconds = deltaTime / 1000;
        
        // Update homing if enabled
        if (this.isHoming && this.target) {
            this.updateHoming(this.target, deltaSeconds);
        }
        
        // Update position
        this.position.x += this.velocity.x * deltaSeconds;
        this.position.y += this.velocity.y * deltaSeconds;
        this.position.z += this.velocity.z * deltaSeconds;
        
        // Update distance traveled
        const speed = Math.sqrt(
            this.velocity.x * this.velocity.x +
            this.velocity.y * this.velocity.y +
            this.velocity.z * this.velocity.z
        );
        this.distanceTraveled += speed * deltaSeconds;
        
        // Check for collision or range limit
        if (this.checkCollision() || this.distanceTraveled >= this.flightRange) {
            this.detonate();
        }
    }
    
    /**
     * Update homing guidance
     * @param {Object} target Target object
     * @param {number} deltaTime Time in seconds
     */
    updateHoming(target, deltaTime) {
        if (!target.position) return;
        
        // Calculate direction to target
        const toTarget = {
            x: target.position.x - this.position.x,
            y: target.position.y - this.position.y,
            z: target.position.z - this.position.z
        };
        
        // Normalize target direction
        const targetDistance = Math.sqrt(toTarget.x * toTarget.x + toTarget.y * toTarget.y + toTarget.z * toTarget.z);
        if (targetDistance > 0) {
            toTarget.x /= targetDistance;
            toTarget.y /= targetDistance;
            toTarget.z /= targetDistance;
        }
        
        // Apply turn rate limitation
        const maxTurnRadians = (this.turnRate * Math.PI / 180) * deltaTime;
        
        // Simple proportional navigation (this could be more sophisticated)
        this.velocity.x += toTarget.x * maxTurnRadians * 100; // Simplified steering
        this.velocity.y += toTarget.y * maxTurnRadians * 100;
        this.velocity.z += toTarget.z * maxTurnRadians * 100;
        
        // Maintain constant speed
        const currentSpeed = Math.sqrt(
            this.velocity.x * this.velocity.x +
            this.velocity.y * this.velocity.y +
            this.velocity.z * this.velocity.z
        );
        
        if (currentSpeed > 0) {
            const normalizedSpeed = 1000; // m/s
            this.velocity.x = (this.velocity.x / currentSpeed) * normalizedSpeed;
            this.velocity.y = (this.velocity.y / currentSpeed) * normalizedSpeed;
            this.velocity.z = (this.velocity.z / currentSpeed) * normalizedSpeed;
        }
    }
    
    /**
     * Check for collision with targets or environment
     * @returns {boolean} True if collision detected
     */
    checkCollision() {
        // This would integrate with the game's collision detection system
        // For now, simple distance check to target
        if (this.target && this.target.position) {
            const distance = Math.sqrt(
                Math.pow(this.position.x - this.target.position.x, 2) +
                Math.pow(this.position.y - this.target.position.y, 2) +
                Math.pow(this.position.z - this.target.position.z, 2)
            );
            
            return distance < 10; // 10 meter proximity detonation
        }
        
        return false;
    }
    
    /**
     * Detonate projectile and apply splash damage
     */
    detonate() {
        if (this.hasDetonated) return;
        
        this.hasDetonated = true;
        console.log(`${this.weaponName} detonated at position`, this.position);
        
        // Apply splash damage to all targets within blast radius
        this.applySplashDamage();
        
        // Create visual explosion effect
        this.createExplosionEffect();
    }
    
    /**
     * Apply splash damage to targets within blast radius
     */
    applySplashDamage() {
        // This would integrate with the game's target/entity system
        console.log(`Applying splash damage: ${this.damage} base damage, ${this.blastRadius}m radius`);
        
        // For now, just apply damage to primary target if within range
        if (this.target && this.target.position) {
            const distance = this.calculateDamageAtDistance(
                Math.sqrt(
                    Math.pow(this.position.x - this.target.position.x, 2) +
                    Math.pow(this.position.y - this.target.position.y, 2) +
                    Math.pow(this.position.z - this.target.position.z, 2)
                )
            );
            
            if (distance > 0 && this.target.takeDamage) {
                this.target.takeDamage(distance);
            }
        }
    }
    
    /**
     * Calculate damage at specific distance from blast center
     * @param {number} distance Distance from blast center
     * @returns {number} Damage amount
     */
    calculateDamageAtDistance(distance) {
        if (distance > this.blastRadius) {
            return 0;
        }
        
        // Linear falloff
        const falloffFactor = 1 - (distance / this.blastRadius);
        return Math.round(this.damage * falloffFactor);
    }
    
    /**
     * Create explosion visual effect
     */
    createExplosionEffect() {
        // This would integrate with the visual effects system
        console.log(`Creating explosion effect at`, this.position);
    }
    
    /**
     * Calculate initial velocity toward target
     */
    calculateInitialVelocity() {
        if (!this.target || !this.target.position) {
            // Default forward velocity if no target
            this.velocity = { x: 0, y: 0, z: 1000 }; // 1000 m/s forward
            return;
        }
        
        // Calculate direction to target
        const direction = {
            x: this.target.position.x - this.position.x,
            y: this.target.position.y - this.position.y,
            z: this.target.position.z - this.position.z
        };
        
        // Normalize and apply speed
        const distance = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
        if (distance > 0) {
            const speed = 1000; // 1000 m/s
            this.velocity.x = (direction.x / distance) * speed;
            this.velocity.y = (direction.y / distance) * speed;
            this.velocity.z = (direction.z / distance) * speed;
        }
    }
} 

/**
 * PhysicsProjectile - Real physics-based projectile using Ammo.js rigid bodies
 * Replaces simple math-based projectile with true physics simulation
 */
export class PhysicsProjectile {
    constructor(config) {
        // Basic projectile properties  
        this.weaponName = config.weaponName || 'Physics Projectile';
        this.damage = config.damage || 100;
        this.blastRadius = config.blastRadius || 50;
        this.flightRange = config.flightRange || 3000;
        this.isHoming = config.isHoming || false;
        this.turnRate = config.turnRate || 90; // degrees per second
        this.target = config.target;
        this.launchTime = Date.now();
        
        // Physics properties
        this.physicsManager = config.physicsManager || window.physicsManager;
        this.rigidBody = null;
        this.threeObject = null;
        this.hasDetonated = false;
        this.distanceTraveled = 0;
        this.startPosition = { ...config.origin };
        
        // Visual properties
        this.scene = config.scene || window.scene;
        
        // Particle trail tracking
        this.particleTrailId = null;
        
        // Initialize physics body
        this.initializePhysicsBody(config.origin, config.direction);
        
        // Create particle trail effects
        this.initializeParticleTrail();
        
        console.log(`🚀 PhysicsProjectile created: ${this.weaponName} (homing: ${this.isHoming})`);
    }
    
    /**
     * Initialize Ammo.js rigid body for the projectile
     * @param {Object} origin Starting position {x, y, z}
     * @param {Object} direction Initial direction vector {x, y, z}
     */
    initializePhysicsBody(origin, direction = {x: 0, y: 0, z: 1}) {
        if (!this.physicsManager || !this.physicsManager.isReady()) {
            console.warn('PhysicsManager not ready - falling back to simple projectile');
            return;
        }
        
        const THREE = window.THREE;
        if (!THREE) {
            console.error('THREE.js not available for projectile visualization');
            return;
        }
        
        try {
            // Small forward offset to ensure projectiles don't collide with ship immediately
            const startOffset = 5; // Reduced from 50m to 5m since we now have proper weapon positions
            const adjustedOrigin = {
                x: origin.x + (direction.x * startOffset),
                y: origin.y + (direction.y * startOffset), 
                z: origin.z + (direction.z * startOffset)
            };
            
            // Create visual representation (larger sphere for better visibility)
            const geometry = new THREE.SphereGeometry(2.0, 8, 6); // 4m diameter projectile (larger for visibility)
            
            // Use MeshLambertMaterial which supports emissive property
            const material = new THREE.MeshLambertMaterial({ 
                color: this.isHoming ? 0xff4444 : 0x44ff44,
                emissive: this.isHoming ? 0x440000 : 0x004400, // Brighter emissive
                transparent: true,
                opacity: 0.9 // More opaque
            });
            
            this.threeObject = new THREE.Mesh(geometry, material);
            this.threeObject.position.set(adjustedOrigin.x, adjustedOrigin.y, adjustedOrigin.z);
            
            // Add projectile reference to userData for collision detection
            this.threeObject.userData = {
                projectile: this,
                type: 'projectile'
            };
            
            // Add to scene
            if (this.scene) {
                this.scene.add(this.threeObject);
            }
            
            // Create physics rigid body
            const bodyConfig = {
                mass: 10.0, // 10kg missile
                restitution: 0.1, // Slight bounce
                friction: 0.3,
                shape: 'sphere',
                radius: 2.0, // Match visual size
                entityType: 'projectile',
                entityId: `${this.weaponName}_${Date.now()}`,
                health: 1 // Projectiles have minimal health
            };
            
            this.rigidBody = this.physicsManager.createRigidBody(this.threeObject, bodyConfig);
            
            if (this.rigidBody) {
                // Reduced speed for better visibility and particle trail effects
                const speed = this.isHoming ? 150 : 200; // Much slower: 150-200 m/s instead of 1000 m/s
                const velocity = this.physicsManager.createVector3(
                    direction.x * speed,
                    direction.y * speed, 
                    direction.z * speed
                );
                this.rigidBody.setLinearVelocity(velocity);
                
                // Reduced collision delay since projectiles now start from proper position
                this.collisionDelayTime = 0.3; // Reduced from 1.0s to 0.3s
                this.canCollide = false;
                
                // Enable collision detection after delay
                setTimeout(() => {
                    this.canCollide = true;
                    console.log(`✅ Collision detection enabled for ${this.weaponName}`);
                }, this.collisionDelayTime * 1000);
                
                // Enable continuous collision detection for fast-moving projectiles (if available)
                try {
                    if (typeof this.rigidBody.setCcdMotionThreshold === 'function') {
                        this.rigidBody.setCcdMotionThreshold(0.1);
                        console.log('✅ CCD motion threshold set');
                    }
                    if (typeof this.rigidBody.setCcdSweptSphereRadius === 'function') {
                        this.rigidBody.setCcdSweptSphereRadius(0.2);
                        console.log('✅ CCD swept sphere radius set');
                    }
                } catch (error) {
                    console.log('⚠️ CCD methods not available, continuing without them');
                }
                
                // Set up collision callback
                this.setupCollisionCallback();
                
                console.log(`✅ Physics body created for ${this.weaponName} - speed: ${speed} m/s, collision delay: ${this.collisionDelayTime}s, offset: ${startOffset}m`);
            }
            
        } catch (error) {
            console.error('Failed to create physics projectile:', error);
        }
    }
    
    /**
     * Initialize particle trail effects for the projectile
     */
    initializeParticleTrail() {
        // Get weapon effects manager from global scope
        const effectsManager = window.starfieldManager?.viewManager?.getShip()?.weaponEffectsManager;
        if (!effectsManager || effectsManager.fallbackMode) {
            console.log('⚠️ WeaponEffectsManager not available for particle trails');
            return;
        }
        
        // Map weapon names to particle trail types
        const weaponTypeMap = {
            'Homing Missile': 'homing_missile',
            'Photon Torpedo': 'photon_torpedo', 
            'Proximity Mine': 'proximity_mine',
            'homing_missile': 'homing_missile',
            'photon_torpedo': 'photon_torpedo',
            'proximity_mine': 'proximity_mine'
        };
        
        const particleType = weaponTypeMap[this.weaponName] || 'homing_missile';
        const projectileId = `${this.weaponName}_${this.launchTime}`;
        
        // Create particle trail if we have a visual object
        if (this.threeObject && this.threeObject.position) {
            const THREE = window.THREE;
            const startPosition = new THREE.Vector3(
                this.threeObject.position.x,
                this.threeObject.position.y, 
                this.threeObject.position.z
            );
            
            this.particleTrailId = projectileId;
            const trailData = effectsManager.createProjectileTrail(
                projectileId, 
                particleType, 
                startPosition, 
                this.threeObject
            );
            
            if (trailData) {
                console.log(`✨ Created particle trail for ${this.weaponName}: ${particleType}`);
            }
        }
    }
    
    /**
     * Set up collision detection callback for the projectile
     */
    setupCollisionCallback() {
        if (!this.rigidBody || !this.physicsManager) return;
        
        // Add projectile to physics manager's collision tracking
        this.rigidBody.projectileOwner = this;
        
        // The collision will be handled by PhysicsManager's collision detection system
        // When a collision is detected, it will call this.onCollision()
    }
    
    /**
     * Handle collision event from physics engine
     * @param {Object} contactPoint Contact point information
     * @param {Object} otherObject The object we collided with
     */
    onCollision(contactPoint, otherObject) {
        if (this.hasDetonated) return;
        
        // Check collision delay - don't collide until delay period has passed
        if (!this.canCollide) {
            console.log(`⏳ ${this.weaponName} collision ignored - still in delay period`);
            return;
        }
        
        console.log(`💥 ${this.weaponName} collision detected with:`, otherObject);
        
        // Get collision position from physics
        const collisionPos = contactPoint.get_m_positionWorldOnA();
        const position = {
            x: collisionPos.x(),
            y: collisionPos.y(),
            z: collisionPos.z()
        };
        
        this.detonate(position);
    }
    
    /**
     * Update projectile physics and guidance systems
     * @param {number} deltaTime Time elapsed in milliseconds
     */
    update(deltaTime) {
        if (this.hasDetonated || !this.rigidBody) return;
        
        const deltaSeconds = deltaTime / 1000;
        
        // Update distance traveled
        this.updateDistanceTraveled();
        
        // Check range limit
        if (this.distanceTraveled >= this.flightRange) {
            console.log(`${this.weaponName} reached max range, detonating`);
            this.detonate();
            return;
        }
        
        // Update homing guidance if enabled
        if (this.isHoming && this.target) {
            this.updateHomingGuidance(deltaSeconds);
        }
        
        // Sync visual position with physics body
        if (this.threeObject) {
            this.physicsManager.syncThreeWithPhysics(this.threeObject, this.rigidBody);
        }
    }
    
    /**
     * Update distance traveled calculation
     */
    updateDistanceTraveled() {
        if (!this.threeObject) return;
        
        const currentPos = this.threeObject.position;
        const distance = Math.sqrt(
            Math.pow(currentPos.x - this.startPosition.x, 2) +
            Math.pow(currentPos.y - this.startPosition.y, 2) +
            Math.pow(currentPos.z - this.startPosition.z, 2)
        );
        this.distanceTraveled = distance;
    }
    
    /**
     * Update homing guidance using physics forces
     * @param {number} deltaTime Time in seconds
     */
    updateHomingGuidance(deltaTime) {
        if (!this.target || !this.target.position || !this.rigidBody) return;
        
        // Get current position and velocity from physics body (with error handling)
        let currentPos, currentVel;
        try {
            const transform = this.rigidBody.getWorldTransform();
            const origin = transform.getOrigin();
            currentPos = { x: origin.x(), y: origin.y(), z: origin.z() };
            
            const velocity = this.rigidBody.getLinearVelocity();
            currentVel = { x: velocity.x(), y: velocity.y(), z: velocity.z() };
        } catch (error) {
            console.warn('⚠️ Failed to get physics body transform/velocity:', error);
            // Fallback to Three.js object position and estimated velocity
            currentPos = {
                x: this.threeObject.position.x,
                y: this.threeObject.position.y,
                z: this.threeObject.position.z
            };
            // Estimate velocity from direction to target
            const toTarget = {
                x: this.target.position.x - currentPos.x,
                y: this.target.position.y - currentPos.y,
                z: this.target.position.z - currentPos.z
            };
            const distance = Math.sqrt(toTarget.x * toTarget.x + toTarget.y * toTarget.y + toTarget.z * toTarget.z);
            const speed = 1000; // Default speed
            currentVel = distance > 0 ? {
                x: (toTarget.x / distance) * speed,
                y: (toTarget.y / distance) * speed,
                z: (toTarget.z / distance) * speed
            } : { x: 0, y: 0, z: 1000 };
        }
        
        // Calculate direction to target
        const toTarget = {
            x: this.target.position.x - currentPos.x,
            y: this.target.position.y - currentPos.y,
            z: this.target.position.z - currentPos.z
        };
        
        // Normalize target direction
        const targetDistance = Math.sqrt(toTarget.x * toTarget.x + toTarget.y * toTarget.y + toTarget.z * toTarget.z);
        if (targetDistance > 0) {
            toTarget.x /= targetDistance;
            toTarget.y /= targetDistance;
            toTarget.z /= targetDistance;
        }
        
        // Calculate desired velocity direction
        const currentSpeed = Math.sqrt(currentVel.x * currentVel.x + currentVel.y * currentVel.y + currentVel.z * currentVel.z);
        const desiredVel = {
            x: toTarget.x * currentSpeed,
            y: toTarget.y * currentSpeed,
            z: toTarget.z * currentSpeed
        };
        
        // Calculate steering force (proportional navigation)
        const maxTurnForce = this.turnRate * 10; // Convert turn rate to force magnitude
        const steeringForce = {
            x: (desiredVel.x - currentVel.x) * maxTurnForce * deltaTime,
            y: (desiredVel.y - currentVel.y) * maxTurnForce * deltaTime,
            z: (desiredVel.z - currentVel.z) * maxTurnForce * deltaTime
        };
        
        // Apply steering force (try applyCentralForce first, fallback to velocity adjustment)
        try {
            if (typeof this.rigidBody.applyCentralForce === 'function') {
                const forceVector = this.physicsManager.createVector3(
                    steeringForce.x,
                    steeringForce.y,
                    steeringForce.z
                );
                this.rigidBody.applyCentralForce(forceVector);
            } else {
                // Fallback: directly adjust velocity for steering
                const newVelocity = this.physicsManager.createVector3(
                    desiredVel.x,
                    desiredVel.y,
                    desiredVel.z
                );
                this.rigidBody.setLinearVelocity(newVelocity);
            }
        } catch (error) {
            console.warn('⚠️ Force application failed, using velocity fallback:', error);
            // Final fallback: direct velocity setting
            const newVelocity = this.physicsManager.createVector3(
                desiredVel.x,
                desiredVel.y,
                desiredVel.z
            );
            this.rigidBody.setLinearVelocity(newVelocity);
        }
        
        console.log(`🎯 ${this.weaponName} steering toward target at ${targetDistance.toFixed(0)}m`);
    }
    
    /**
     * Detonate projectile with physics-based splash damage
     * @param {Object} position Optional detonation position
     */
    detonate(position = null) {
        if (this.hasDetonated) return;
        
        this.hasDetonated = true;
        
        // Get detonation position
        let detonationPos = position;
        if (!detonationPos && this.threeObject) {
            detonationPos = {
                x: this.threeObject.position.x,
                y: this.threeObject.position.y,
                z: this.threeObject.position.z
            };
        }
        
        console.log(`💥 ${this.weaponName} detonated at:`, detonationPos);
        
        // Apply physics-based splash damage
        this.applyPhysicsSplashDamage(detonationPos);
        
        // Create explosion effects
        this.createExplosionEffect(detonationPos);
        
        // Clean up physics resources
        this.cleanup();
    }
    
    /**
     * Apply splash damage using physics spatial queries
     * @param {Object} position Explosion center position
     */
    applyPhysicsSplashDamage(position) {
        if (!this.physicsManager || !position) return;
        
        try {
            // Use physics spatial query to find all entities within blast radius
            const affectedEntities = this.physicsManager.spatialQuery(position, this.blastRadius);
            
            console.log(`💥 SPLASH DAMAGE: Found ${affectedEntities.length} entities within ${this.blastRadius}m blast radius`);
            
            affectedEntities.forEach(entity => {
                // Get entity position from threeObject
                let entityPosition = null;
                if (entity.threeObject && entity.threeObject.position) {
                    entityPosition = {
                        x: entity.threeObject.position.x,
                        y: entity.threeObject.position.y,
                        z: entity.threeObject.position.z
                    };
                } else if (entity.position) {
                    // Fallback if position is directly available
                    entityPosition = entity.position;
                } else {
                    console.warn('⚠️ Entity has no accessible position, skipping splash damage:', entity);
                    return;
                }
                
                const distance = this.calculateDistance(position, entityPosition);
                const damage = this.calculateDamageAtDistance(distance);
                
                if (damage > 0) {
                    // Apply damage to entity
                    if (entity.ship && typeof entity.ship.applyDamage === 'function') {
                        // Check if ship is already destroyed before applying damage
                        const wasAlreadyDestroyed = entity.ship.currentHull <= 0.001;
                        
                        const damageResult = entity.ship.applyDamage(damage, 'explosive');
                        console.log(`💥 Applied ${damage} explosive damage to ${entity.ship.shipName || 'entity'} at ${distance.toFixed(1)}m`);
                        
                        // Only play success sound if this damage actually destroyed the ship (wasn't already destroyed)
                        if (!wasAlreadyDestroyed && damageResult && (damageResult.isDestroyed || entity.ship.currentHull <= 0.001)) {
                            console.log(`🔥 ${entity.ship.shipName || 'Enemy ship'} DESTROYED by ${this.weaponName} splash damage!`);
                            
                            // Ensure hull is exactly 0 for consistency
                            entity.ship.currentHull = 0;
                            
                            // Play success sound for ship destruction
                            if (window.starfieldManager?.viewManager?.getShip()?.weaponEffectsManager) {
                                const effectsManager = window.starfieldManager.viewManager.getShip().weaponEffectsManager;
                                effectsManager.playSuccessSound(null, 0.8); // Full duration, 80% volume
                                console.log(`🎉 Playing ship destruction success sound (full duration)`);
                            }
                            
                            // Remove destroyed ship from game
                            if (window.starfieldManager && typeof window.starfieldManager.removeDestroyedTarget === 'function') {
                                window.starfieldManager.removeDestroyedTarget(entity.ship);
                            }
                        } else if (wasAlreadyDestroyed) {
                            console.log(`⚫ Ship was already destroyed, skipping success sound`);
                        }
                    } else if (entity.takeDamage) {
                        entity.takeDamage(damage);
                        console.log(`💥 Applied ${damage} damage to entity at ${distance.toFixed(1)}m`);
                    }
                }
            });
            
        } catch (error) {
            console.error('Failed to apply physics splash damage:', error);
        }
    }
    
    /**
     * Calculate damage at specific distance from blast center
     * @param {number} distance Distance from blast center in meters
     * @returns {number} Damage amount
     */
    calculateDamageAtDistance(distance) {
        if (distance > this.blastRadius) {
            return 0;
        }
        
        // Exponential falloff for more realistic blast damage
        const falloffFactor = Math.pow(1 - (distance / this.blastRadius), 2);
        return Math.round(this.damage * falloffFactor);
    }
    
    /**
     * Calculate distance between two positions
     * @param {Object} pos1 First position {x, y, z}
     * @param {Object} pos2 Second position {x, y, z} 
     * @returns {number} Distance in meters
     */
    calculateDistance(pos1, pos2) {
        return Math.sqrt(
            Math.pow(pos1.x - pos2.x, 2) +
            Math.pow(pos1.y - pos2.y, 2) +
            Math.pow(pos1.z - pos2.z, 2)
        );
    }
    
    /**
     * Create visual explosion effect
     * @param {Object} position Explosion position
     */
    createExplosionEffect(position) {
        // This will integrate with the existing effects system
        if (window.effectsManager) {
            try {
                window.effectsManager.createExplosion(position, this.blastRadius, 'missile', position);
                console.log(`✨ Created explosion effect at:`, position);
            } catch (error) {
                console.warn('Failed to create explosion effect:', error);
            }
        }
    }
    
    /**
     * Clean up physics resources
     */
    cleanup() {
        try {
            // Remove from physics world
            if (this.rigidBody && this.physicsManager) {
                this.physicsManager.removeRigidBody(this.rigidBody);
                this.rigidBody = null;
            }
            
            // Remove from visual scene
            if (this.threeObject && this.scene) {
                this.scene.remove(this.threeObject);
                this.threeObject.geometry?.dispose();
                this.threeObject.material?.dispose();
                this.threeObject = null;
            }

            // Remove particle trail if it exists
            if (this.particleTrailId && window.starfieldManager?.viewManager?.getShip()?.weaponEffectsManager) {
                window.starfieldManager.viewManager.getShip().weaponEffectsManager.removeProjectileTrail(this.particleTrailId);
                console.log(`🧹 Removed particle trail for ${this.weaponName}`);
            }
            
            console.log(`🧹 Cleaned up ${this.weaponName} physics resources`);
            
        } catch (error) {
            console.error('Error cleaning up physics projectile:', error);
        }
    }
    
    /**
     * Check if projectile is active (not detonated)
     * @returns {boolean} True if projectile is still active
     */
    isActive() {
        return !this.hasDetonated && this.rigidBody !== null;
    }
} 