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
        console.log(`🚨 CACHE TEST: WeaponCard.js fire() method called for ${this.name} - TIMESTAMP: ${Date.now()}`);
        
        // Check cooldown
        const currentTime = Date.now();
        if (currentTime < this.nextFireTime) {
            console.log(`⏰ ${this.name} on cooldown for ${((this.nextFireTime - currentTime) / 1000).toFixed(1)}s`);
        }
        
        // Base implementation - should be overridden by specific weapon types
        console.log(`Base WeaponCard.fire() called for ${this.name} - should be overridden`);
        
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
        console.log(`🚨 SPLASH PROJECTILE: Creating projectile for ${this.name} - TIMESTAMP: ${Date.now()}`);
        
        // IMPROVED: Use camera aim direction for free-aim shooting instead of target-based
        let direction = { x: 0, y: 0, z: 1 }; // Default forward
        
        // Check camera availability for direction calculation
        
        if (window.starfieldManager && window.starfieldManager.camera) {
            const camera = window.starfieldManager.camera;
            
            // Get camera's forward direction (where crosshairs are pointing)
            const cameraForward = new THREE.Vector3(0, 0, -1);
            cameraForward.applyQuaternion(camera.quaternion);
            
            direction = {
                x: cameraForward.x,
                y: cameraForward.y,
                z: cameraForward.z
            };
            
            // Using camera aim direction
        } else if (target && target.position) {
            // Fallback to target-based aiming if camera not available
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
            // Using target-based direction as fallback
        } else {
            console.log(`🔍 DEBUG: No camera or target available for ${this.name}, using default direction`);
        }

        // Try to create physics-based projectile first
        if (window.physicsManager && window.physicsManager.isReady()) {
            try {
                console.log(`🔍 DEBUG: Creating PhysicsProjectile for ${this.name} with direction:`, direction);
                
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
                
                console.log(`✅ DEBUG: PhysicsProjectile created successfully for ${this.name}`);
                return physicsProjectile;
                
            } catch (error) {
                console.log('Failed to create physics projectile, falling back to simple projectile:', error);
            }
        } else {
            console.log(`🔍 DEBUG: PhysicsManager not ready for ${this.name}, using fallback`);
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
            
            // Show damage feedback on HUD
            this.showDamageFeedback(target, damage);
        }
    }
    
    /**
     * Show damage feedback on weapon HUD
     * @param {Object} target Target that took damage
     * @param {number} damage Damage amount dealt
     */
    showDamageFeedback(target, damage) {
        try {
            // Try to get weapon HUD reference through various paths
            let weaponHUD = null;
            
            // Path 1: Through ship's weapon system
            if (window.starfieldManager?.viewManager?.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.starfieldManager.viewManager.ship.weaponSystem.weaponHUD;
            }
            // Path 2: Through global ship reference
            else if (window.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.ship.weaponSystem.weaponHUD;
            }
            
            if (weaponHUD) {
                const targetName = target.shipName || target.name || 'Target';
                weaponHUD.showDamageFeedback(this.name, damage, targetName);
            }
        } catch (error) {
            console.log('Failed to show damage feedback:', error.message);
        }
    }
    
    /**
     * Calculate distance to target (placeholder)
     * @param {Object} origin Origin position
     * @param {Object} target Target object
     * @returns {number} Distance
     */
    calculateDistanceToTarget(origin, target) {
        if (!origin || !target) {
            return 0;
        }
        
        // Extract position from target if it's an object with position property
        const targetPos = target.position || target;
        
        return Math.sqrt(
            Math.pow(origin.x - targetPos.x, 2) +
            Math.pow(origin.y - targetPos.y, 2) +
            Math.pow(origin.z - targetPos.z, 2)
        );
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
     * @param {Object} ship Ship instance for energy validation
     * @returns {Object} Fire result
     */
    fire(origin, target = null, ship = null) {
        console.log(`🚨 SPLASH WEAPON CACHE TEST: ${this.name} firing (splash-damage) - TIMESTAMP: ${Date.now()}`);
        
        // ENHANCED: Comprehensive energy validation like laser weapons
        if (ship && this.energyCost > 0) {
            if (!ship.hasEnergy(this.energyCost)) {
                const currentEnergy = Math.round(ship.currentEnergy);
                const energyNeeded = this.energyCost;
                const energyShortfall = energyNeeded - currentEnergy;
                
                console.log(`🔋 ${this.name}: Insufficient energy (need ${energyNeeded}, have ${currentEnergy}, short ${energyShortfall})`);
                
                // Send HUD message for insufficient energy
                if (window.starfieldManager?.weaponHUD) {
                    window.starfieldManager.weaponHUD.showMessage(
                        `Insufficient Energy: ${this.name}`,
                        `Need ${energyNeeded} energy, have ${currentEnergy}`,
                        3000
                    );
                }
                
                return {
                    success: false,
                    reason: `Insufficient energy (need ${energyNeeded}, have ${currentEnergy})`,
                    damage: 0,
                    energyShortfall: energyShortfall
                };
            }
            
            // Consume energy
            ship.consumeEnergy(this.energyCost);
            console.log(`🔋 ${this.name}: Consumed ${this.energyCost} energy (${Math.round(ship.currentEnergy)} remaining)`);
        }
        
        // CORRECTED: Only homing weapons require target lock, non-homing projectiles can free-aim
        if (this.targetLockRequired && this.homingCapability && !target) {
            // Send HUD message for target lock required
            if (window.starfieldManager?.weaponHUD) {
                window.starfieldManager.weaponHUD.showMessage(
                    `Target Lock Required: ${this.name}`,
                    `Homing weapons require a locked target`,
                    3000
                );
            }
            
            return {
                success: false,
                reason: 'Target lock required for homing weapon',
                damage: 0
            };
        }
        
        // Non-homing projectiles (torpedoes, missiles) can fire without target lock toward crosshairs
        if (!this.homingCapability) {
            console.log(`🎯 ${this.name}: Non-homing projectile firing toward crosshairs (no target lock needed)`);
        }
        
        // Range validation for targeted shots (if target exists) - show message but allow firing
        if (target && target.position && origin) {
            const distance = this.calculateDistanceToTarget(origin, target.position);
            const maxRange = this.range || 10000; // Default 10km if no range specified
            
            if (distance > maxRange) {
                const distanceKm = (distance / 1000).toFixed(1);
                const maxRangeKm = (maxRange / 1000).toFixed(1);
                
                console.log(`🎯 ${this.name}: Target out of range (${distanceKm}km > ${maxRangeKm}km max)`);
                
                // Send HUD message for out of range using proper callback
                if (this.showMessage && typeof this.showMessage === 'function') {
                    this.showMessage(
                        `Target Out of Range: ${this.name} - ${distanceKm}km > ${maxRangeKm}km max`,
                        3000
                    );
                } else {
                    // Fallback for when no callback is set (shouldn't happen in normal operation)
                    console.log(`🎯 No HUD message callback available for ${this.name}`);
                }
                
                // Continue firing anyway - don't return false
                console.log(`🎯 ${this.name}: Firing anyway despite being out of range`);
            } else {
                console.log(`🎯 ${this.name}: Target in range (${(distance / 1000).toFixed(1)}km / ${(maxRange / 1000).toFixed(1)}km max)`);
            }
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
        console.log(`🚨 SPLASH PROJECTILE: Creating projectile for ${this.name} - TIMESTAMP: ${Date.now()}`);
        
        // IMPROVED: Use camera aim direction for free-aim shooting instead of target-based
        let direction = { x: 0, y: 0, z: 1 }; // Default forward
        
        // Check camera availability for direction calculation
        
        if (window.starfieldManager && window.starfieldManager.camera) {
            const camera = window.starfieldManager.camera;
            
            // Get camera's forward direction (where crosshairs are pointing)
            const cameraForward = new THREE.Vector3(0, 0, -1);
            cameraForward.applyQuaternion(camera.quaternion);
            
            direction = {
                x: cameraForward.x,
                y: cameraForward.y,
                z: cameraForward.z
            };
            
            // Using camera aim direction
        } else if (target && target.position) {
            // Fallback to target-based aiming if camera not available
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
            // Using target-based direction as fallback
        } else {
            console.log(`🔍 DEBUG: No camera or target available for ${this.name}, using default direction`);
        }

        // ENHANCED: Try to create physics-based projectile with comprehensive error handling
        if (window.physicsManager) {
            if (!window.physicsManager.isReady()) {
                console.log(`🔧 ${this.name}: PhysicsManager not ready, initializing...`);
                
                // Send HUD message about physics initialization
                if (window.starfieldManager?.weaponHUD) {
                    window.starfieldManager.weaponHUD.showMessage(
                        `Physics Initializing: ${this.name}`,
                        `Projectile physics loading, please wait...`,
                        2000
                    );
                }
                
                // Try to initialize physics if possible
                try {
                    if (typeof window.physicsManager.initialize === 'function') {
                        window.physicsManager.initialize();
                    }
                } catch (initError) {
                    console.error(`❌ ${this.name}: Failed to initialize physics:`, initError);
                }
            }
            
            if (window.physicsManager.isReady()) {
                try {
                    console.log(`✅ ${this.name}: Creating physics-based projectile`);
                    
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
                    
                    if (physicsProjectile && physicsProjectile.rigidBody) {
                        console.log(`✅ ${this.name}: Physics projectile created successfully`);
                        return physicsProjectile;
                    } else {
                        throw new Error('PhysicsProjectile created but missing rigid body');
                    }
                    
                } catch (physicsError) {
                    console.error(`❌ ${this.name}: Failed to create physics projectile:`, physicsError);
                    
                    // Send HUD message about physics failure
                    if (window.starfieldManager?.weaponHUD) {
                        window.starfieldManager.weaponHUD.showMessage(
                            `Physics Error: ${this.name}`,
                            `Using fallback mode - limited accuracy`,
                            3000
                        );
                    }
                }
            }
        } else {
                            console.log(`${this.name}: PhysicsManager not available`);
        }
        
        // ENHANCED: Fallback to simple projectile with user notification
        console.log(`${this.name}: Using fallback projectile system (reduced accuracy)`);
        
        // Send HUD message about fallback mode
        if (window.starfieldManager?.weaponHUD) {
            window.starfieldManager.weaponHUD.showMessage(
                `Fallback Mode: ${this.name}`,
                `Physics unavailable - using simplified projectile`,
                2000
            );
        }
        
        try {
            // Check if simple Projectile class exists
            if (typeof Projectile !== 'undefined') {
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
            } else {
                throw new Error('Projectile class not available');
            }
        } catch (fallbackError) {
            console.error(`❌ ${this.name}: Complete projectile creation failure:`, fallbackError);
            
            // Send HUD error message
            if (window.starfieldManager?.weaponHUD) {
                window.starfieldManager.weaponHUD.showMessage(
                    `Weapon System Error: ${this.name}`,
                    `Unable to create projectile - system malfunction`,
                    4000
                );
            }
            
            return null; // Complete failure
        }
    }
    
    /**
     * Calculate splash damage based on distance from blast center using inverse-square law
     * @param {number} distance Distance from blast center
     * @returns {number} Damage amount
     */
    calculateSplashDamage(distance) {
        if (distance > this.blastRadius) {
            return 0; // Outside blast radius
        }
        
        // Apply inverse-square law for realistic explosion physics
        // damage = maxDamage * (radius² / (distance² + epsilon))
        const epsilon = 0.1; // Small value to prevent division by zero
        const radiusSquared = this.blastRadius * this.blastRadius;
        const distanceSquared = distance * distance + epsilon;
        
        // Calculate damage using inverse-square law, capped at maxDamage
        let damage = Math.round(this.damage * (radiusSquared / distanceSquared));
        damage = Math.min(damage, this.damage); // Cap at maximum damage
        
        return damage;
    }
    
    /**
     * Add projectile to game's projectile management system
     * @param {Projectile} projectile Projectile to add
     */
    addProjectileToGame(projectile) {
        // Add to global projectile tracking for frame updates
        if (!window.activeProjectiles) {
            window.activeProjectiles = [];
        }
        
        window.activeProjectiles.push(projectile);
        
        // If it's a physics projectile, it will be automatically updated by the physics system
        // If it's a fallback projectile, we need to set up manual updates
        if (projectile instanceof PhysicsProjectile) {
            // Clean torpedo tracking
        } else {
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
                    // Only log torpedo simulation events
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
    
    /**
     * Calculate distance between two positions
     * @param {Object} pos1 First position {x, y, z}
     * @param {Object} pos2 Second position {x, y, z}
     * @returns {number} Distance in meters
     */
    calculateDistanceToTarget(pos1, pos2) {
        if (!pos1 || !pos2) {
            return 0;
        }
        
        return Math.sqrt(
            Math.pow(pos1.x - pos2.x, 2) +
            Math.pow(pos1.y - pos2.y, 2) +
            Math.pow(pos1.z - pos2.z, 2)
        );
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
        
        // Removed torpedo creation logging to keep console clean
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
        
        // Removed torpedo detonation logging to keep console clean
        
        // Apply splash damage to all targets within blast radius
        this.applySplashDamage();
        
        // Create visual explosion effect
        this.createExplosionEffect();
    }
    
    /**
     * Apply splash damage to targets within blast radius
     */
    applySplashDamage() {
        // Removed torpedo splash damage logging to keep console clean
        
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
                
                // Show damage feedback on HUD
                this.showDamageFeedback(this.target, distance);
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
 * PhysicsProjectile - SIMPLIFIED physics-based projectile using Ammo.js rigid bodies
 * Uses simple collision detection and static trails for better reliability
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
        this.startPosition = new THREE.Vector3(config.origin.x, config.origin.y, config.origin.z);
        
        // Visual properties
        this.scene = config.scene || window.scene;
        
        // SIMPLIFIED: No complex trail tracking - we'll create static trails on impact
        this.trailCreated = false;
        
        // Initialize physics body
        this.initializePhysicsBody(config.origin, config.direction);
        
        // IMPROVED: Create simple trail during flight that stops on collision
        this.initializeSimpleTrail();
        
        // Silent projectile launch
        
        // Native collision detection - no delay needed
        this.launchTime = Date.now();
        this.collisionProcessed = false;
        
        // Add range checking - projectile expires when it travels beyond weapon range
        this.rangeCheckInterval = setInterval(() => {
            if (this.hasDetonated || !this.threeObject) {
                clearInterval(this.rangeCheckInterval);
                return;
            }
            
            // Calculate distance traveled from start position
            const currentPos = this.threeObject.position;
            const distanceTraveled = Math.sqrt(
                Math.pow(currentPos.x - this.startPosition.x, 2) +
                Math.pow(currentPos.y - this.startPosition.y, 2) +
                Math.pow(currentPos.z - this.startPosition.z, 2)
            );
            
            // Silent range checking - no periodic logging to reduce spam
            
            // Check if projectile has exceeded weapon range
            if (distanceTraveled > this.flightRange) {
                if (window.physicsManager && window.physicsManager._debugLoggingEnabled) {
                    console.log(`⏰ ${this.weaponName}: Max range reached`);
                }
                this.expireOutOfRange();
                clearInterval(this.rangeCheckInterval);
            }
        }, 100); // Check every 100ms
    }
    
    /**
     * Initialize Ammo.js rigid body for the projectile
     * @param {Object} origin Starting position {x, y, z}
     * @param {Object} direction Initial direction vector {x, y, z}
     */
    initializePhysicsBody(origin, direction = {x: 0, y: 0, z: 1}) {
        if (!this.physicsManager || !this.physicsManager.isReady()) {
            console.log('PhysicsManager not ready - falling back to simple projectile');
            return;
        }
        
        const THREE = window.THREE;
        if (!THREE) {
            console.error('THREE.js not available for projectile visualization');
            return;
        }
        
        try {
            // Use exact weapon origin position
            const adjustedOrigin = {
                x: origin.x,
                y: origin.y, 
                z: origin.z
            };
            
            // Create visual representation
            const geometry = new THREE.SphereGeometry(2.0, 8, 6);
            const material = new THREE.MeshLambertMaterial({ 
                color: this.isHoming ? 0xff4444 : 0x44ff44,
                emissive: this.isHoming ? 0x440000 : 0x004400,
                transparent: true,
                opacity: 0.9
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
                mass: 10.0,
                restitution: 0.0, // SIMPLIFIED: No bouncing at all
                friction: 0.3,
                shape: 'sphere',
                radius: 2.0,
                entityType: 'projectile',
                entityId: `${this.weaponName}_${Date.now()}`,
                health: 1
            };
            
            this.rigidBody = this.physicsManager.createRigidBody(this.threeObject, bodyConfig);
            
            if (this.rigidBody) {
                // Silent rigid body creation
                
                // Calculate velocity based on direction and weapon speed
                const speed = this.isHoming ? 8000 : 10000; // Doubled from 4000/5000 to 8000/10000 for ultra-fast torpedoes
                this.velocity = {
                    x: direction.x * speed,
                    y: direction.y * speed,
                    z: direction.z * speed
                };
                
                // Apply velocity to the physics rigid body
                const physicsVelocity = this.physicsManager.createVector3(
                    this.velocity.x,
                    this.velocity.y,
                    this.velocity.z
                );
                this.rigidBody.setLinearVelocity(physicsVelocity);
                
                console.log(`🚀 ${this.weaponName}: Set velocity to ${speed} units/s in direction:`, direction);
                
                // Set up collision callback
                this.setupCollisionCallback();
            } else {
                console.log(`❌ DEBUG: Failed to create physics rigid body for ${this.weaponName}`);
            }
            
        } catch (error) {
            console.error('Failed to initialize physics body for projectile:', error);
        }
    }

    /**
     * IMPROVED: Create a simple trail during flight that can be stopped on collision
     */
    initializeSimpleTrail() {
        const effectsManager = window.starfieldManager?.viewManager?.getShip()?.weaponEffectsManager;
        if (!effectsManager) {
            console.log('🔍 DEBUG: No effects manager found');
            return;
        }
        
        if (effectsManager.fallbackMode) {
            console.log('🔍 DEBUG: Effects manager in fallback mode, bypassing for test');
            // Temporarily bypass fallback mode for testing
        }
        
        const THREE = window.THREE;
        if (!THREE) {
            console.log('🔍 DEBUG: No THREE.js found in WeaponCard');
            return;
        }
        
        const weaponTypeMap = {
            'Homing Missile': 'homing_missile',
            'Photon Torpedo': 'photon_torpedo',
            'Proximity Mine': 'proximity_mine'
        };
        
        const particleType = weaponTypeMap[this.weaponName] || 'homing_missile';
        this.trailId = `${this.weaponName}_${this.launchTime}`;
        
        const startPos = new THREE.Vector3(this.startPosition.x, this.startPosition.y, this.startPosition.z);
        console.log('🔍 DEBUG: Calling createProjectileTrail with:', this.trailId, particleType, startPos);
        this.trailData = effectsManager.createProjectileTrail(this.trailId, particleType, startPos, this.threeObject);
    }

    /**
     * Set up collision detection callback for the projectile
     */
    setupCollisionCallback() {
        if (!this.rigidBody || !this.physicsManager) {
            console.log(`🔍 DEBUG: setupCollisionCallback failed for ${this.weaponName} - rigidBody:${!!this.rigidBody}, physicsManager:${!!this.physicsManager}`);
            return;
        }
        
        // Add projectile to physics manager's collision tracking
        this.rigidBody.projectileOwner = this;
        console.log(`✅ DEBUG: Collision callback set up for ${this.weaponName} - projectileOwner assigned`);
    }
    
    /**
     * Called when projectile collides with something
     * @param {Object} contactPoint Contact point information
     * @param {Object} otherObject The object we collided with
     */
    onCollision(contactPoint, otherObject) {
        // Add detailed collision debugging
        console.log(`🔥 COLLISION DEBUG: ${this.weaponName} onCollision called`);
        console.log(`🔥 COLLISION DEBUG: hasDetonated=${this.hasDetonated}, collisionProcessed=${this.collisionProcessed}`);
        
        // CRITICAL: Prevent collision loops
        if (this.hasDetonated || this.collisionProcessed) {
            console.log(`🔥 COLLISION DEBUG: Early return - already processed`);
            return;
        }
        this.collisionProcessed = true;
        // NOTE: hasDetonated will be set by detonate() method after damage application
        
        // Native collision detection - process collision immediately
        
        console.log(`🛑 COLLISION: ${this.weaponName} hit target - starting cleanup and damage application`);
        
        // CRITICAL: Immediately remove from physics world to prevent further collisions
        if (this.rigidBody && this.physicsManager) {
            try {
                this.physicsManager.removeRigidBody(this.threeObject);
                console.log(`🧹 REMOVED: ${this.weaponName} from physics world`);
            } catch (error) {
                console.error('Error removing projectile from physics:', error);
            }
        }
        
        // IMPROVED: Immediately stop trail updates to prevent bouncing
        if (this.trailData && this.trailData.projectileObject) {
            this.trailData.projectileObject = null;
            console.log(`🛑 TRAIL: ${this.weaponName} trail stopped`);
            
            // CRITICAL: Immediately call removeProjectileTrail to start fade-out
            if (this.trailId && window.starfieldManager?.viewManager?.getShip()?.weaponEffectsManager) {
                const effectsManager = window.starfieldManager.viewManager.getShip().weaponEffectsManager;
                effectsManager.removeProjectileTrail(this.trailId);
                console.log(`🧹 TRAIL: Started fade-out for ${this.weaponName} trail`);
            }
        }
        
        // Get collision position from physics
        let position = { x: 0, y: 0, z: 0 };
        try {
            const collisionPos = contactPoint.get_m_positionWorldOnA();
            position = {
                x: collisionPos.x(),
                y: collisionPos.y(), 
                z: collisionPos.z()
            };
            console.log(`🎯 COLLISION: ${this.weaponName} collision position:`, position);
        } catch (error) {
            console.log('Using fallback position for collision');
            // Clone position to avoid corruption when object is removed
            const clonedPos = this.threeObject.position.clone();
            position = {
                x: clonedPos.x,
                y: clonedPos.y,
                z: clonedPos.z
            };
            console.log(`🎯 COLLISION: ${this.weaponName} fallback position:`, position);
        }
        
        // Detonate at collision point
        console.log(`💥 COLLISION: ${this.weaponName} calling detonate() with position:`, position);
        this.detonate(position);
    }
    
    /**
     * SIMPLIFIED: Update projectile (basic range checking only)
     * @param {number} deltaTime Time in seconds
     */
    update(deltaTime) {
        if (this.hasDetonated) return false;
        
        // Check range limit (physics handles movement)
        if (this.threeObject) {
            const currentPos = this.threeObject.position;
            const distance = Math.sqrt(
                Math.pow(currentPos.x - this.startPosition.x, 2) +
                Math.pow(currentPos.y - this.startPosition.y, 2) +
                Math.pow(currentPos.z - this.startPosition.z, 2)
            );
            
            if (distance >= this.flightRange) {
                // Silent max range reached
                this.detonate();
                return false;
            }
        }
        
        return true; // Still active
    }
    
    /**
     * Check if projectile is still active
     * @returns {boolean} True if projectile should continue existing
     */
    isActive() {
        return !this.hasDetonated;
    }

    /**
     * SIMPLIFIED: Detonate projectile with physics-based splash damage
     * @param {Object} position Optional detonation position
     */
    detonate(position = null) {
        console.log(`DETONATE METHOD CALLED FOR ${this.weaponName}`);
        console.log(`hasDetonated: ${this.hasDetonated}`);
        
        if (this.hasDetonated) {
            console.log(`DETONATE: ${this.weaponName} already detonated, skipping`);
            return;
        }
        
        console.log(`💥 DETONATE: ${this.weaponName} starting detonation sequence`);
        console.log(`💥 Position:`, position);
        
        // Get detonation position with validation and debugging
        let detonationPos = position;
        if (!detonationPos && this.threeObject && this.threeObject.position) {
            // Clone position to avoid corruption when object is removed
            const clonedPos = this.threeObject.position.clone();
            console.log(`🎯 ${this.weaponName}: Using threeObject position for detonation:`, clonedPos);
            console.log(`🎯 ${this.weaponName}: Start position was:`, this.startPosition);
            
            // Calculate distance traveled for debugging
            const distanceTraveled = Math.sqrt(
                Math.pow(clonedPos.x - this.startPosition.x, 2) +
                Math.pow(clonedPos.y - this.startPosition.y, 2) +
                Math.pow(clonedPos.z - this.startPosition.z, 2)
            );
            console.log(`🎯 ${this.weaponName}: Distance traveled: ${distanceTraveled.toFixed(1)}m (max: ${this.flightRange}m)`);
            
            // Validate position is not at origin (indicates corruption)
            if (clonedPos.x !== 0 || clonedPos.y !== 0 || clonedPos.z !== 0) {
                detonationPos = {
                    x: clonedPos.x,
                    y: clonedPos.y,
                    z: clonedPos.z
                };
            } else {
                console.warn(`⚠️ ${this.weaponName}: Projectile position corrupted (0,0,0), skipping visualization`);
            }
        }
        
        // If we still don't have a valid position, skip visualization but continue with cleanup
        if (!detonationPos) {
            console.warn(`⚠️ ${this.weaponName}: No valid detonation position available, skipping damage and visualization`);
            this.hasDetonated = true;
            this.cleanup();
            return;
        }
        
        // Silent detonation
        
        // NOTE: Explosion sound is played by createExplosionEffect() -> createExplosion() for consistent positioning
        console.log(`💥 ${this.weaponName}: Starting damage application at position:`, detonationPos);
        this.applyPhysicsSplashDamage(detonationPos);
        
        // Show collision visualization spheres for all detonations (hits and misses)
        if (this.physicsManager && detonationPos) {
            this.physicsManager.createCollisionVisualization(detonationPos, detonationPos, this.blastRadius);
        }
        
        this.createExplosionEffect(detonationPos);
        
        // Mark as detonated AFTER damage application
        this.hasDetonated = true;
        
        this.cleanup();
    }
    
    /**
     * Apply splash damage using physics spatial queries with inverse-square law
     * @param {Object} position Explosion center position
     */
    applyPhysicsSplashDamage(position) {
        if (!this.physicsManager || !position) return;
        
        try {
            // Use physics spatial query to find all entities within blast radius
            const affectedEntities = this.physicsManager.spatialQuery(position, this.blastRadius);
            
            // Log entity breakdown for better debugging
            const entityTypes = {};
            affectedEntities.forEach(entity => {
                const type = entity.type || 'unknown';
                entityTypes[type] = (entityTypes[type] || 0) + 1;
            });
            
            // Always log splash damage results for debugging
            console.log(`💥 ${this.weaponName}: Found ${affectedEntities.length} entities in ${this.blastRadius}m blast radius:`, entityTypes);
            
            affectedEntities.forEach(entity => {
                // Skip projectiles (including the torpedo itself) - they shouldn't take splash damage
                if (entity.type === 'projectile') {
                    console.log(`🚫 ${this.weaponName}: Skipping projectile entity: ${entity.id} (projectiles don't take splash damage)`);
                    return;
                }
                
                // Get entity position from threeObject
                let entityPosition = null;
                if (entity.threeObject && entity.threeObject.position) {
                    entityPosition = entity.threeObject.position;
                } else if (entity.position) {
                    entityPosition = entity.position;
                } else {
                    console.log('Entity has no position, skipping damage application');
                    return;
                }
                
                // Calculate 3D distance from explosion center (simple Euclidean distance)
                const distance = Math.sqrt(
                    Math.pow(position.x - entityPosition.x, 2) +
                    Math.pow(position.y - entityPosition.y, 2) +
                    Math.pow(position.z - entityPosition.z, 2)
                );
                
                // Apply inverse-square law for realistic explosion physics
                // damage = maxDamage * (radius² / (distance² + epsilon))
                // epsilon prevents division by zero for direct hits
                const epsilon = 0.1; // Small value to prevent division by zero
                const maxDamage = this.damage;
                const radiusSquared = this.blastRadius * this.blastRadius;
                const distanceSquared = distance * distance + epsilon;
                
                // Calculate damage using inverse-square law, capped at maxDamage
                let damage = Math.round(maxDamage * (radiusSquared / distanceSquared));
                damage = Math.min(damage, maxDamage); // Cap at maximum damage
                
                console.log(`🎯 ${this.weaponName}: Entity at ${distance.toFixed(1)}m distance, calculated ${damage} damage (max: ${maxDamage}) [inverse-square law]`);
                
                if (damage > 0) {
                    // FIXED: Use the entity found by spatial query (the actual target in blast radius)
                    let targetShip = null;
                    
                    // Priority 1: Check if entity has ship reference (from physics metadata)
                    if (entity.ship && typeof entity.ship.applyDamage === 'function') {
                        targetShip = entity.ship;
                        const shipName = entity.ship.shipName || entity.id || 'Unknown';
                        console.log(`💥 ${this.weaponName}: Found target ship via entity.ship: ${shipName} (distance: ${distance.toFixed(1)}m)`);
                    }
                    
                    // Priority 2: Try alternative paths to find ship reference from entity
                    if (!targetShip) {
                        if (entity.threeObject?.userData?.ship && typeof entity.threeObject.userData.ship.applyDamage === 'function') {
                            targetShip = entity.threeObject.userData.ship;
                            const shipName = entity.threeObject.userData.ship.shipName || entity.id || 'Unknown';
                            console.log(`💥 ${this.weaponName}: Found ship via threeObject.userData.ship: ${shipName}`);
                        } else if (typeof entity.applyDamage === 'function') {
                            // Entity itself is the ship object
                            targetShip = entity;
                            const shipName = entity.shipName || entity.id || 'Unknown';
                            console.log(`💥 ${this.weaponName}: Entity is direct ship object: ${shipName}`);
                        }
                    }
                    
                    // Final fallback: If spatial query entity doesn't have ship reference, log for debugging
                    if (!targetShip) {
                        console.log(`${this.weaponName}: Spatial query found entity at ${distance.toFixed(1)}m but no ship reference found. Entity type: ${entity.type}, ID: ${entity.id}`);
                        console.log(`🔍 Entity structure:`, {
                            hasShip: !!entity.ship,
                            hasApplyDamage: typeof entity.applyDamage === 'function',
                            hasThreeObject: !!entity.threeObject,
                            hasUserData: !!entity.threeObject?.userData,
                            hasUserDataShip: !!entity.threeObject?.userData?.ship,
                            entityKeys: Object.keys(entity)
                        });
                        
                        // Skip applying damage if we can't find the ship - this is better than hitting wrong targets
                        return;
                    }
                    
                    // Apply damage if we found a valid target ship (PROJECTILE WEAPONS - NO SUB-TARGETING)
                    if (targetShip) {
                        const wasAlreadyDestroyed = targetShip.currentHull <= 0.001;
                        console.log(`💥 ${this.weaponName}: Applying ${damage} explosive damage to ${targetShip.shipName || 'enemy ship'} (hull: ${targetShip.currentHull}/${targetShip.maxHull})`);
                        
                        // PROJECTILE WEAPONS: Apply damage without sub-targeting (3rd parameter = null)
                        const damageResult = targetShip.applyDamage(damage, 'explosive', null);
                        console.log(`💥 ${this.weaponName}: After damage - hull: ${targetShip.currentHull}/${targetShip.maxHull}, destroyed: ${damageResult?.isDestroyed || false}`);
                        
                        // Show damage feedback on HUD
                        this.showDamageFeedback(targetShip, damage);
                        
                        // Play splash damage explosion sound for each target hit
                        if (damage > 0 && window.starfieldManager?.viewManager?.getShip()?.weaponEffectsManager) {
                            const effectsManager = window.starfieldManager.viewManager.getShip().weaponEffectsManager;
                            const targetPos = new THREE.Vector3(entityPosition.x, entityPosition.y, entityPosition.z);
                            effectsManager.playSound('explosion', targetPos, 0.5); // Lower volume for splash damage hits
                        }
                        
                        // Log shield/hull breakdown for projectile weapons
                        if (damageResult.shieldDamage > 0) {
                            console.log(`🛡️ ${this.weaponName}: Shields absorbed ${damageResult.shieldDamage} damage`);
                        }
                        if (damageResult.hullDamage > 0) {
                            console.log(`💥 ${this.weaponName}: Hull took ${damageResult.hullDamage} damage`);
                        }
                        if (damageResult.systemsDamaged.length > 0) {
                            console.log(`🎯 ${this.weaponName}: Random subsystem hits: ${damageResult.systemsDamaged.join(', ')}`);
                        }
                        
                        if (damageResult && damageResult.isDestroyed && !wasAlreadyDestroyed) {
                            console.log(`🔥 ${this.weaponName}: ${targetShip.shipName || 'Enemy ship'} DESTROYED by torpedo blast!`);
                            targetShip.currentHull = 0;
                            
                            if (window.starfieldManager?.viewManager?.getShip()?.weaponEffectsManager) {
                                const effectsManager = window.starfieldManager.viewManager.getShip().weaponEffectsManager;
                                effectsManager.playSuccessSound(null, 0.8);
                            }
                            
                            if (window.starfieldManager && typeof window.starfieldManager.removeDestroyedTarget === 'function') {
                                window.starfieldManager.removeDestroyedTarget(targetShip);
                            }
                        }
                    }
                }
            });
            
        } catch (error) {
            console.error('Failed to apply physics splash damage:', error);
        }
    }
    
    /**
     * Calculate damage at specific distance from blast center using inverse-square law
     * @param {number} distance Distance from blast center in meters
     * @returns {number} Damage amount
     */
    calculateDamageAtDistance(distance) {
        if (distance > this.blastRadius) {
            return 0;
        }
        
        // Apply inverse-square law for realistic explosion physics
        // damage = maxDamage * (radius² / (distance² + epsilon))
        const epsilon = 0.1; // Small value to prevent division by zero
        const radiusSquared = this.blastRadius * this.blastRadius;
        const distanceSquared = distance * distance + epsilon;
        
        // Calculate damage using inverse-square law, capped at maxDamage
        let damage = Math.round(this.damage * (radiusSquared / distanceSquared));
        damage = Math.min(damage, this.damage); // Cap at maximum damage
        
        return damage;
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
     * Show damage feedback on weapon HUD
     * @param {Object} target Target that took damage
     * @param {number} damage Damage amount dealt
     */
    showDamageFeedback(target, damage) {
        try {
            // Try to get weapon HUD reference through various paths
            let weaponHUD = null;
            
            // Path 1: Through ship's weapon system
            if (window.starfieldManager?.viewManager?.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.starfieldManager.viewManager.ship.weaponSystem.weaponHUD;
            }
            // Path 2: Through global ship reference
            else if (window.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.ship.weaponSystem.weaponHUD;
            }
            
            if (weaponHUD) {
                const targetName = target.shipName || target.name || 'Target';
                weaponHUD.showDamageFeedback(this.weaponName, damage, targetName);
            }
        } catch (error) {
            console.log('Failed to show damage feedback:', error.message);
        }
    }
    
    /**
     * Create visual explosion effect
     * @param {Object} position Explosion position
     */
    createExplosionEffect(position) {
        // Use the same explosion system as laser weapons for consistency
        if (window.starfieldManager?.viewManager?.getShip()?.weaponEffectsManager) {
            try {
                const effectsManager = window.starfieldManager.viewManager.getShip().weaponEffectsManager;
                const explosionPos = position ? new THREE.Vector3(position.x, position.y, position.z) : null;
                
                // Use 'torpedo' explosion type for torpedo-specific explosion sound (explosion-01.mp3)
                effectsManager.createExplosion(explosionPos, this.blastRadius, 'torpedo', explosionPos);
                console.log(`✨ Created explosion effect at:`, position, `with radius ${this.blastRadius}m`);
            } catch (error) {
                console.log('Failed to create explosion effect:', error);
            }
        } else {
            console.log('No weapon effects manager available for explosion effect');
        }
    }
    
    /**
     * SIMPLIFIED: Clean up physics resources immediately
     */
    cleanup() {
        try {
            // Clear range checking interval to prevent memory leaks
            if (this.rangeCheckInterval) {
                clearInterval(this.rangeCheckInterval);
                this.rangeCheckInterval = null;
            }
            
            // IMPROVED: Clean up simple trail system
            if (this.trailId && window.starfieldManager?.viewManager?.getShip()?.weaponEffectsManager) {
                const effectsManager = window.starfieldManager.viewManager.getShip().weaponEffectsManager;
                
                // Stop trail updates immediately
                if (this.trailData && this.trailData.projectileObject) {
                    this.trailData.projectileObject = null;
                }
                
                // Remove the trail after a short delay to let it fade
                effectsManager.removeProjectileTrail(this.trailId);
            }
            
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
            
            // Silent cleanup
            
        } catch (error) {
            console.error('Error cleaning up physics projectile:', error);
        }
    }

    /**
     * Expire the projectile when it travels beyond weapon range
     * Clean removal without explosion effects
     */
    expireOutOfRange() {
        if (this.hasDetonated) return;
        this.hasDetonated = true;
        
        console.log(`💨 ${this.weaponName}: Fading out after reaching maximum range`);
        
        // Clear range checking interval
        if (this.rangeCheckInterval) {
            clearInterval(this.rangeCheckInterval);
        }
        
        // Stop trail updates immediately
        if (this.trailData && this.trailData.projectileObject) {
            this.trailData.projectileObject = null;
            // Silent trail stopping
            
            // CRITICAL: Immediately call removeProjectileTrail to start fade-out
            if (this.trailId && window.starfieldManager?.viewManager?.getShip()?.weaponEffectsManager) {
                const effectsManager = window.starfieldManager.viewManager.getShip().weaponEffectsManager;
                effectsManager.removeProjectileTrail(this.trailId);
            }
        }
        
        // Remove from physics world immediately
        if (this.rigidBody && this.physicsManager) {
            try {
                this.physicsManager.removeRigidBody(this.threeObject);
                console.log(`🧹 REMOVED: ${this.weaponName} from physics world (expired)`);
            } catch (error) {
                console.error('Error removing expired projectile from physics:', error);
            }
        }
        
        // Clean up immediately without explosion effects
        this.cleanup();
    }
} 