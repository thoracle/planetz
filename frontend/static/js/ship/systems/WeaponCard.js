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
        
        // Calculate hit chance
        const hitChance = this.calculateHitChance(target);
        const hit = Math.random() < hitChance;
        
        if (hit && target) {
            const distance = this.calculateDistanceToTarget(origin, target);
            const damage = this.calculateDamage(distance);
            
            // Apply instant damage
            this.applyInstantDamage(target, damage);
            
            return {
                success: true,
                hit: true,
                damage: damage,
                weaponType: this.name,
                distance: distance
            };
        }
        
        return {
            success: true,
            hit: false,
            damage: 0,
            weaponType: this.name,
            reason: hit ? 'No target' : 'Missed'
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
        // This would integrate with the game's projectile management system
        console.log(`Adding projectile to game: ${projectile.weaponName}`);
        
        // For now, just log - this would be connected to ProjectileManager
        if (window.gameInstance && window.gameInstance.projectileManager) {
            window.gameInstance.projectileManager.addProjectile(projectile);
        }
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