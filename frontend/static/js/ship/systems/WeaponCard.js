import { debug } from '../../debug.js';

/**
 * WeaponCard - Base class for weapon cards and specific weapon implementations
 * Based on docs/weapons_system_spec.md and docs/system_architecture.md
 * Implements Scan-Hit and Splash-Damage weapon types
 */

import { CrosshairTargeting } from '../../utils/CrosshairTargeting.js';
import { targetingService } from '../../services/TargetingService.js';

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
        
debug('COMBAT', `WeaponCard created: ${this.name} (${this.weaponType})`);
    }
    
    /**
     * Fire the weapon (base implementation)
     * @param {Object} origin Origin position
     * @param {Object} target Target object (may be null)
     * @returns {Object} Fire result
     */
    fire(origin, target = null) {

        
        // Check cooldown
        const currentTime = Date.now();
        if (currentTime < this.nextFireTime) {
debug('COMBAT', `⏰ ${this.name} on cooldown for ${((this.nextFireTime - currentTime) / 1000).toFixed(1)}s`);
        }
        
        // Base implementation - should be overridden by specific weapon types
debug('COMBAT', `Base WeaponCard.fire() called for ${this.name} - should be overridden`);
        
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
        const projectileType = this.blastRadius > 0 ? 'splash-damage' : 'direct-hit';
debug('UTILITY', `🚀 PROJECTILE: Creating ${projectileType} projectile for ${this.name} - TIMESTAMP: ${Date.now()}`);
        
        // FIXED: Use target-based aiming for physics projectiles, camera direction as fallback
        let direction = { x: 0, y: 0, z: 1 }; // Default forward
        
        // ENHANCED SKILL-BASED AIMING: Camera direction with ship velocity compensation
        if (window.starfieldManager && window.starfieldManager.camera) {
            // Use camera direction for accurate crosshair alignment
            const camera = window.starfieldManager.camera;
            const cameraDirection = new window.THREE.Vector3(0, 0, -1);
            cameraDirection.applyQuaternion(camera.quaternion);
            
            // VELOCITY COMPENSATION: Get ship velocity from StarfieldManager movement system
            let shipVelocity = { x: 0, y: 0, z: 0 };
            if (window.starfieldManager) {
                // Use targetSpeed for immediate response (handles acceleration lag)
                const currentSpeed = window.starfieldManager.currentSpeed || 0;
                const targetSpeed = window.starfieldManager.targetSpeed || 0;
                const effectiveSpeed = Math.max(currentSpeed, targetSpeed); // Use higher value for immediate response
                
                if (effectiveSpeed > 0) {
                    // Calculate speed multiplier using same logic as StarfieldManager
                    let speedMultiplier = effectiveSpeed * 0.3; // Base multiplier
                    
                    // Apply speed reductions for lower impulse levels
                    if (effectiveSpeed <= 3) {
                        const reductionFactor = Math.pow(0.15, 4 - effectiveSpeed);
                        speedMultiplier *= reductionFactor;
                    }
                    
                    // Calculate movement direction based on view (same as StarfieldManager)
                    const moveDirection = window.starfieldManager.view === 'AFT' ? -1 : 1;
                    
                    // Create velocity vector using camera orientation (same as ship movement)
                    const forwardVector = new window.THREE.Vector3(0, 0, -speedMultiplier * moveDirection);
                    forwardVector.applyQuaternion(camera.quaternion);
                    
                    shipVelocity = { x: forwardVector.x, y: forwardVector.y, z: forwardVector.z };
                }
            }
            
            // CORRECTED: Subtract velocity to compensate for ship movement (not add)
            const velocityScale = 0.1; // Reduced scale for more subtle, accurate compensation
            direction = {
                x: cameraDirection.x - (shipVelocity.x * velocityScale), // ✅ Subtract for proper compensation
                y: cameraDirection.y - (shipVelocity.y * velocityScale), // ✅ Subtract for proper compensation
                z: cameraDirection.z - (shipVelocity.z * velocityScale)  // ✅ Subtract for proper compensation
            };
            
            // Normalize direction to maintain consistent speed
            const dirLength = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
            if (dirLength > 0) {
                direction.x /= dirLength;
                direction.y /= dirLength;
                direction.z /= dirLength;
            }
            
debug('AI', `🎯 ${this.name}: Enhanced aiming with velocity compensation: x=${direction.x.toFixed(4)}, y=${direction.y.toFixed(4)}, z=${direction.z.toFixed(4)}`);
debug('UTILITY', `🎯 ${this.name}: Ship velocity: x=${shipVelocity.x.toFixed(2)}, y=${shipVelocity.y.toFixed(2)}, z=${shipVelocity.z.toFixed(2)}`);
        } else {
            // No camera available - use default forward direction
    
        }

        // NEW: Try simplified Three.js projectile system first
debug('AI', `🔍 PROJECTILE DEBUG: Checking SimpleProjectile availability for ${this.name}`);
debug('UTILITY', `   - window.simpleProjectileManager: ${!!window.simpleProjectileManager}`);
debug('UTILITY', `   - window.SimpleProjectile: ${!!window.SimpleProjectile}`);
        
        if (window.simpleProjectileManager && window.SimpleProjectile) {
            try {
debug('UTILITY', `🚀 Using simplified Three.js projectile for ${this.name}`);
                
                const simpleProjectile = new window.SimpleProjectile({
                    origin: origin,
                    direction: direction,
                    target: target,
                    damage: this.damage,
                    blastRadius: this.blastRadius,
                    flightRange: this.flightRange,
                    isHoming: this.homingCapability,
                    weaponName: this.name,
                    maxRange: this.range,
                    scene: window.starfieldManager?.scene
                });
                
                return simpleProjectile;
                
            } catch (error) {
debug('P1', 'Failed to create simple projectile, falling back to physics projectile:', error);
            }
        }
        
        // Try to create physics-based projectile as fallback
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
                    weaponData: this, // Pass entire weapon data for speed lookup
                    physicsManager: window.physicsManager,
                    scene: window.starfieldManager?.scene || window.scene
                });
                
                return physicsProjectile;
                
            } catch (error) {
debug('P1', 'Failed to create physics projectile, falling back to simple projectile:', error);
            }
        } else {
debug('AI', 'PhysicsManager not available, using simple projectile system');
        }
        
        // Fallback to simple projectile if physics not available
debug('UTILITY', `⚠️ Using fallback projectile for ${this.name}`);
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
debug('UTILITY', `${this.name} firing (scan-hit)`);
        
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
debug('TARGETING', `${this.name} deals ${damage} damage to target`);
        
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
debug('P1', 'Failed to show damage feedback:', error.message);
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
    
    /**
     * Show miss feedback through HUD system
     */
    showMissFeedback() {
        try {
debug('UTILITY', `🎯 MISS FEEDBACK: ${this.name} showing miss notification`);
            
            // Try to get weapon HUD reference through various paths
            let weaponHUD = null;
            
            // Path 1: Through ship's weapon system
            if (window.starfieldManager?.viewManager?.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.starfieldManager.viewManager.ship.weaponSystem.weaponHUD;
debug('COMBAT', `🎯 MISS FEEDBACK: Found weaponHUD via ship.weaponSystem`);
            }
            // Path 2: Through global ship reference
            else if (window.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.ship.weaponSystem.weaponHUD;
debug('COMBAT', `🎯 MISS FEEDBACK: Found weaponHUD via global ship`);
            }
            // Path 3: Through StarfieldManager directly
            else if (window.starfieldManager?.weaponHUD) {
                weaponHUD = window.starfieldManager.weaponHUD;
debug('COMBAT', `🎯 MISS FEEDBACK: Found weaponHUD via StarfieldManager`);
            }
            
            if (weaponHUD) {
debug('COMBAT', `🎯 MISS FEEDBACK: Calling showWeaponFeedback('miss') on weaponHUD`);
                weaponHUD.showWeaponFeedback('miss', this.name);
                
                // Also show unified miss feedback
                if (typeof weaponHUD.showUnifiedMessage === 'function') {
                    weaponHUD.showUnifiedMessage('MISS', 1500, 2, '#ff4444', '#cc3333', 'rgba(40, 0, 0, 0.9)');
                }
            } else {
                console.log(`🎯 MISS FEEDBACK: No weaponHUD found - checking paths:
                  starfieldManager.viewManager.ship.weaponSystem.weaponHUD: ${!!window.starfieldManager?.viewManager?.ship?.weaponSystem?.weaponHUD}
                  ship.weaponSystem.weaponHUD: ${!!window.ship?.weaponSystem?.weaponHUD}
                  starfieldManager.weaponHUD: ${!!window.starfieldManager?.weaponHUD}`);
            }
        } catch (error) {
debug('P1', 'Failed to show miss feedback:', error.message);
        }
    }
    
    /**
     * Show target destruction feedback through HUD system
     * @param {Object} targetShip The destroyed target ship
     */
    showTargetDestructionFeedback(targetShip) {
        try {
            const targetName = targetShip.shipName || 'ENEMY SHIP';
            const message = `${targetName.toUpperCase()} DESTROYED`;
            
debug('TARGETING', `🎯 TARGET DESTRUCTION FEEDBACK: ${this.name} destroyed ${targetName}`);
            
            // Try to get weapon HUD reference through various paths
            let weaponHUD = null;
            
            // Path 1: Through ship's weapon system
            if (window.starfieldManager?.viewManager?.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.starfieldManager.viewManager.ship.weaponSystem.weaponHUD;
debug('TARGETING', `🎯 TARGET DESTRUCTION: Found weaponHUD via ship.weaponSystem`);
            }
            // Path 2: Through global ship reference
            else if (window.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.ship.weaponSystem.weaponHUD;
debug('TARGETING', `🎯 TARGET DESTRUCTION: Found weaponHUD via global ship`);
            }
            // Path 3: Through StarfieldManager directly
            else if (window.starfieldManager?.weaponHUD) {
                weaponHUD = window.starfieldManager.weaponHUD;
debug('TARGETING', `🎯 TARGET DESTRUCTION: Found weaponHUD via StarfieldManager`);
            }
            
            if (weaponHUD) {
debug('TARGETING', `🎯 TARGET DESTRUCTION: Calling showWeaponFeedback('target-destroyed') on weaponHUD`);
                weaponHUD.showWeaponFeedback('target-destroyed', message);
            } else {
debug('TARGETING', `🎯 TARGET DESTRUCTION: No weaponHUD found for target destruction feedback`);
            }
        } catch (error) {
debug('P1', 'Failed to show target destruction feedback:', error.message);
        }
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
        const weaponTypeDisplay = this.blastRadius > 0 ? 'splash-damage' : 'direct-hit';
debug('COMBAT', `${this.name} firing (${weaponTypeDisplay})`);
        
        // SIMPLIFIED: Remove range enforcement to match laser weapon behavior
        // Our SimpleProjectile system uses HitScanService for instant hit detection,
        // so we don't need to validate targets before firing - just like lasers
        
        // ENHANCED: Comprehensive energy validation like laser weapons
        if (ship && this.energyCost > 0) {
            if (!ship.hasEnergy(this.energyCost)) {
                const currentEnergy = Math.round(ship.currentEnergy);
                const energyNeeded = this.energyCost;
                const energyShortfall = energyNeeded - currentEnergy;
                
debug('UTILITY', `🔋 ${this.name}: Insufficient energy (need ${energyNeeded}, have ${currentEnergy}, short ${energyShortfall})`);
                
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
debug('AI', `🔋 ${this.name}: Consumed ${this.energyCost} energy (${Math.round(ship.currentEnergy)} remaining)`);
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
            // Non-homing projectile firing toward crosshairs
        }
        
        // Range validation moved to after getting unified targeting result to ensure consistency
        
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
     * Get target under crosshairs using unified targeting service
     * @param {THREE.Camera} camera - Camera for raycasting
     * @returns {Object|null} Target object if valid crosshair target found, null otherwise
     */
    getCrosshairTarget(camera) {
        const targetingResult = targetingService.getCurrentTarget({
            camera: camera,
            weaponRange: (this.range || 30000) / 1000, // Convert meters to kilometers for targeting service
            requestedBy: this.name,
            enableFallback: false // Only precise crosshair targeting
        });
        
        return targetingResult.hasTarget ? targetingResult.target : null;
    }

    /**
     * Create projectile for splash-damage weapon
     * @param {Object} origin Origin position
     * @param {Object} target Target object
     * @returns {Projectile} Projectile instance
     */
    createProjectile(origin, target) {
        const projectileType = this.blastRadius > 0 ? 'splash-damage' : 'direct-hit';
debug('UTILITY', `🚀 PROJECTILE: Creating ${projectileType} projectile for ${this.name} - TIMESTAMP: ${Date.now()}`);
        
        // FIXED: Use target-based aiming for physics projectiles, camera direction as fallback
        let direction = { x: 0, y: 0, z: 1 }; // Default forward
        
        // ENHANCED SKILL-BASED AIMING: Camera direction with ship velocity compensation
        // This ensures missiles go exactly where the player is aiming, accounting for ship movement
        if (window.starfieldManager && window.starfieldManager.camera) {
            const camera = window.starfieldManager.camera;
            const cameraDirection = new window.THREE.Vector3(0, 0, -1);
            cameraDirection.applyQuaternion(camera.quaternion);
            
            // VELOCITY COMPENSATION: Get ship velocity from StarfieldManager movement system
            let shipVelocity = { x: 0, y: 0, z: 0 };
            if (window.starfieldManager) {
                // Use targetSpeed for immediate response (handles acceleration lag)
                const currentSpeed = window.starfieldManager.currentSpeed || 0;
                const targetSpeed = window.starfieldManager.targetSpeed || 0;
                const effectiveSpeed = Math.max(currentSpeed, targetSpeed); // Use higher value for immediate response
                
                if (effectiveSpeed > 0) {
                    // Calculate speed multiplier using same logic as StarfieldManager
                    let speedMultiplier = effectiveSpeed * 0.3; // Base multiplier
                    
                    // Apply speed reductions for lower impulse levels
                    if (effectiveSpeed <= 3) {
                        const reductionFactor = Math.pow(0.15, 4 - effectiveSpeed);
                        speedMultiplier *= reductionFactor;
                    }
                    
                    // Calculate movement direction based on view (same as StarfieldManager)
                    const moveDirection = window.starfieldManager.view === 'AFT' ? -1 : 1;
                    
                    // Create velocity vector using camera orientation (same as ship movement)
                    const forwardVector = new window.THREE.Vector3(0, 0, -speedMultiplier * moveDirection);
                    forwardVector.applyQuaternion(camera.quaternion);
                    
                    shipVelocity = { x: forwardVector.x, y: forwardVector.y, z: forwardVector.z };
                }
            }
            
            // CORRECTED: Subtract velocity to compensate for ship movement (not add)
            const velocityScale = 0.1; // Reduced scale for more subtle, accurate compensation
            direction = {
                x: cameraDirection.x - (shipVelocity.x * velocityScale), // ✅ Subtract for proper compensation
                y: cameraDirection.y - (shipVelocity.y * velocityScale), // ✅ Subtract for proper compensation
                z: cameraDirection.z - (shipVelocity.z * velocityScale)  // ✅ Subtract for proper compensation
            };
            
            // Normalize direction to maintain consistent speed
            const dirLength = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
            if (dirLength > 0) {
                direction.x /= dirLength;
                direction.y /= dirLength;
                direction.z /= dirLength;
            }
            
debug('AI', `🎯 ${this.name}: Enhanced aiming with velocity compensation: x=${direction.x.toFixed(4)}, y=${direction.y.toFixed(4)}, z=${direction.z.toFixed(4)}`);
            const speedInfo = window.starfieldManager ? `current=${window.starfieldManager.currentSpeed}, target=${window.starfieldManager.targetSpeed}, effective=${Math.max(window.starfieldManager.currentSpeed || 0, window.starfieldManager.targetSpeed || 0)}` : 'unknown';
debug('UTILITY', `🎯 ${this.name}: Ship velocity: x=${shipVelocity.x.toFixed(2)}, y=${shipVelocity.y.toFixed(2)}, z=${shipVelocity.z.toFixed(2)} (speeds: ${speedInfo})`);
            
            // No automatic target tracking - missiles are dumb-fire projectiles with velocity compensation
            // FIXED: Don't nullify target - we need it for precise collision radius calculation
            // target = null;
        } else {

        }

        // NEW: Try simplified Three.js projectile system first
debug('AI', `🔍 SPLASH PROJECTILE DEBUG: Checking SimpleProjectile availability for ${this.name}`);
debug('UTILITY', `   - window.simpleProjectileManager: ${!!window.simpleProjectileManager}`);
debug('UTILITY', `   - window.SimpleProjectile: ${!!window.SimpleProjectile}`);
        
        if (window.simpleProjectileManager && window.SimpleProjectile) {
            try {
debug('UTILITY', `🚀 Using simplified Three.js projectile for ${this.name}`);
                
                const simpleProjectile = new window.SimpleProjectile({
                    origin: origin,
                    direction: direction,
                    target: target,
                    damage: this.damage,
                    blastRadius: this.blastRadius,
                    flightRange: this.flightRange,
                    isHoming: this.homingCapability,
                    weaponName: this.name,
                    maxRange: this.range,
                    scene: window.starfieldManager?.scene
                });
                
                return simpleProjectile;
                
            } catch (error) {
debug('P1', 'Failed to create simple projectile in SplashDamageWeapon, falling back to physics projectile:', error);
            }
        }
        
        // ENHANCED: Try to create physics-based projectile with comprehensive error handling
        if (window.physicsManager) {
            if (!window.physicsManager.isReady()) {
debug('PHYSICS', `🔧 ${this.name}: PhysicsManager not ready, initializing...`);
                
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
debug('PHYSICS', `✅ ${this.name}: Creating physics-based projectile`);
            
                    
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
                        weaponData: this, // Pass entire weapon data for speed lookup
                        physicsManager: window.physicsManager,
                        scene: window.starfieldManager?.scene || window.scene
                    });
                    
                    if (physicsProjectile && physicsProjectile.rigidBody) {
debug('PHYSICS', `✅ ${this.name}: Physics projectile created successfully`);
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
debug('AI', `${this.name}: PhysicsManager not available`);
        }
        
        // ENHANCED: Fallback to simple projectile with user notification
debug('UTILITY', `${this.name}: Using fallback projectile system (reduced accuracy)`);
        
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
        // Check if it's our new SimpleProjectile
        if (window.SimpleProjectile && projectile instanceof window.SimpleProjectile) {
            // SimpleProjectiles are managed by SimpleProjectileManager
            if (window.simpleProjectileManager) {
                window.simpleProjectileManager.addProjectile(projectile);
            }
            return;
        }
        
        // Add to global projectile tracking for frame updates (legacy system)
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
    
    /**
     * Show miss feedback through HUD system
     */
    showMissFeedback() {
        try {
debug('UTILITY', `🎯 MISS FEEDBACK: ${this.name} showing miss notification`);
            
            // Try to get weapon HUD reference through various paths
            let weaponHUD = null;
            
            // Path 1: Through ship's weapon system
            if (window.starfieldManager?.viewManager?.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.starfieldManager.viewManager.ship.weaponSystem.weaponHUD;
debug('COMBAT', `🎯 MISS FEEDBACK: Found weaponHUD via ship.weaponSystem`);
            }
            // Path 2: Through global ship reference
            else if (window.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.ship.weaponSystem.weaponHUD;
debug('COMBAT', `🎯 MISS FEEDBACK: Found weaponHUD via global ship`);
            }
            // Path 3: Through StarfieldManager directly
            else if (window.starfieldManager?.weaponHUD) {
                weaponHUD = window.starfieldManager.weaponHUD;
debug('COMBAT', `🎯 MISS FEEDBACK: Found weaponHUD via StarfieldManager`);
            }
            
            if (weaponHUD) {
debug('COMBAT', `🎯 MISS FEEDBACK: Calling showWeaponFeedback('miss') on weaponHUD`);
                weaponHUD.showWeaponFeedback('miss', this.name);
                
                // Also show unified miss feedback
                if (typeof weaponHUD.showUnifiedMessage === 'function') {
                    weaponHUD.showUnifiedMessage('MISS', 1500, 2, '#ff4444', '#cc3333', 'rgba(40, 0, 0, 0.9)');
                }
            } else {
                console.log(`🎯 MISS FEEDBACK: No weaponHUD found - checking paths:
                  starfieldManager.viewManager.ship.weaponSystem.weaponHUD: ${!!window.starfieldManager?.viewManager?.ship?.weaponSystem?.weaponHUD}
                  ship.weaponSystem.weaponHUD: ${!!window.ship?.weaponSystem?.weaponHUD}
                  starfieldManager.weaponHUD: ${!!window.starfieldManager?.weaponHUD}`);
            }
        } catch (error) {
debug('P1', 'Failed to show miss feedback:', error.message);
        }
    }
    
    /**
     * Show target destruction feedback through HUD system
     * @param {Object} targetShip The destroyed target ship
     */
    showTargetDestructionFeedback(targetShip) {
        try {
            const targetName = targetShip.shipName || 'ENEMY SHIP';
            const message = `${targetName.toUpperCase()} DESTROYED`;
            
debug('TARGETING', `🎯 TARGET DESTRUCTION FEEDBACK: ${this.name} destroyed ${targetName}`);
            
            // Try to get weapon HUD reference through various paths
            let weaponHUD = null;
            
            // Path 1: Through ship's weapon system
            if (window.starfieldManager?.viewManager?.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.starfieldManager.viewManager.ship.weaponSystem.weaponHUD;
debug('TARGETING', `🎯 TARGET DESTRUCTION: Found weaponHUD via ship.weaponSystem`);
            }
            // Path 2: Through global ship reference
            else if (window.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.ship.weaponSystem.weaponHUD;
debug('TARGETING', `🎯 TARGET DESTRUCTION: Found weaponHUD via global ship`);
            }
            // Path 3: Through StarfieldManager directly
            else if (window.starfieldManager?.weaponHUD) {
                weaponHUD = window.starfieldManager.weaponHUD;
debug('TARGETING', `🎯 TARGET DESTRUCTION: Found weaponHUD via StarfieldManager`);
            }
            
            if (weaponHUD) {
debug('TARGETING', `🎯 TARGET DESTRUCTION: Calling showWeaponFeedback('target-destroyed') on weaponHUD`);
                weaponHUD.showWeaponFeedback('target-destroyed', message);
            } else {
debug('TARGETING', `🎯 TARGET DESTRUCTION: No weaponHUD found for target destruction feedback`);
            }
        } catch (error) {
debug('P1', 'Failed to show target destruction feedback:', error.message);
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
        this.blastRadius = config.blastRadius !== undefined ? config.blastRadius : 50;
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
        const flightRangeMeters = this.flightRange * 1000; // Convert km to meters
        if (this.checkCollision() || this.distanceTraveled >= flightRangeMeters) {
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
debug('UTILITY', `Creating explosion effect at`, this.position);
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
        this.weaponData = config.weaponData; // Store weapon data for speed lookup
        this.damage = config.damage || 100;
        this.blastRadius = config.blastRadius !== undefined ? config.blastRadius : 50;
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
        this.scene = config.scene || window.starfieldManager?.scene || window.scene;
        
        // SIMPLIFIED: No complex trail tracking - we'll create static trails on impact
        this.trailCreated = false;
        
        // ADAPTIVE COLLISION DELAY: Prevent instant collision on launch (MUST BE BEFORE PHYSICS INIT)
        this.launchTime = Date.now();
        this.collisionProcessed = false;
        
        // Calculate adaptive collision delay based on target distance and projectile speed
        let adaptiveDelayMs = 1; // Default 1ms delay for dumb-fire missiles (reduced from 3ms)
        if (this.target && this.target.distance) {
            const targetDistanceKm = this.target.distance;
            const targetDistanceM = targetDistanceKm * 1000; // Convert to meters
            
            // Get projectile speed for precise timing calculation
            let projectileSpeed = this.isHoming ? 800 : 750; // Default speeds in m/s
            if (this.weaponData?.specialProperties?.projectileSpeed) {
                projectileSpeed = this.weaponData.specialProperties.projectileSpeed;
            }
            
            // Calculate time to reach target in milliseconds
            const timeToTargetMs = (targetDistanceM / projectileSpeed) * 1000;
            
            if (targetDistanceKm < 0.5) {
                // Ultra close range (< 500m): No delay, immediate collision allowed
                adaptiveDelayMs = 0;
            } else if (targetDistanceKm < 2) {
                // Very close range (< 2km): Minimal delay, much less than flight time
                adaptiveDelayMs = Math.max(0, Math.min(1, timeToTargetMs * 0.01)); // 1% of flight time, max 1ms
            } else if (targetDistanceKm < 5) {
                // Close range (< 5km): Short delay
                adaptiveDelayMs = Math.max(1, Math.min(2, timeToTargetMs * 0.02)); // 2% of flight time, 1-2ms
            } else {
                // Long range (>= 5km): Standard delay
                adaptiveDelayMs = Math.max(2, Math.min(3, timeToTargetMs * 0.03)); // 3% of flight time, 2-3ms
            }
            
            console.log(`🕐 COLLISION TIMING: ${this.weaponName} target=${targetDistanceKm.toFixed(2)}km, speed=${projectileSpeed}m/s, flight_time=${timeToTargetMs.toFixed(1)}ms, delay=${adaptiveDelayMs.toFixed(1)}ms`);
        }
        
        this.collisionDelayMs = adaptiveDelayMs;
        this.allowCollisionAfter = this.launchTime + this.collisionDelayMs;
        
        // Initialize physics body with target information
        this.initializePhysicsBody(config.origin, config.direction, config.target);
        
        // TRAIL DISABLED: Temporarily disabled to eliminate visual artifacts
        // this.initializeSimpleTrail();
        
        // Silent projectile launch
        
        // Add range checking - projectile expires when it travels beyond weapon range
        // ENHANCED: Add time-based cleanup as a backup (20 seconds max flight time for any projectile)
        this.launchTimeMs = Date.now();
        const maxFlightTimeMs = 20000; // 20 seconds maximum flight time as backup cleanup
        
        this.rangeCheckInterval = setInterval(() => {
            if (this.hasDetonated || !this.threeObject) {
                clearInterval(this.rangeCheckInterval);
                this.rangeCheckInterval = null;
                return;
            }
            
            // Time-based cleanup (backup mechanism)
            const flightTimeMs = Date.now() - this.launchTimeMs;
            if (flightTimeMs > maxFlightTimeMs) {
debug('COMBAT', `⏰ ${this.weaponName}: Expired after ${(flightTimeMs/1000).toFixed(1)}s flight time (max: ${maxFlightTimeMs/1000}s)`);
                this.expireOutOfRange();
                clearInterval(this.rangeCheckInterval);
                this.rangeCheckInterval = null;
                return;
            }
            
            // Calculate distance traveled from start position
            const currentPos = this.threeObject.position;
            const distanceTraveled = Math.sqrt(
                Math.pow(currentPos.x - this.startPosition.x, 2) +
                Math.pow(currentPos.y - this.startPosition.y, 2) +
                Math.pow(currentPos.z - this.startPosition.z, 2)
            );
            
            // Check if projectile has exceeded weapon range (with small buffer for precision)
            const flightRangeMeters = this.flightRange * 1000; // Convert km to meters
            if (distanceTraveled > flightRangeMeters - 50) { // Stop 50m before max range to prevent overshoot
debug('COMBAT', `⏰ ${this.weaponName}: Max range reached (${distanceTraveled.toFixed(1)}m / ${flightRangeMeters.toFixed(0)}m) after ${(flightTimeMs/1000).toFixed(1)}s`);
                this.expireOutOfRange();
                clearInterval(this.rangeCheckInterval);
                this.rangeCheckInterval = null;
            }
        }, 250); // Check every 250ms (reduced frequency to improve performance)
    }
    
    /**
     * Initialize Ammo.js rigid body for the projectile
     * @param {Object} origin Starting position {x, y, z}
     * @param {Object} direction Initial direction vector {x, y, z}
     * @param {Object} target Target object with distance information for collision radius calculation
     */
    initializePhysicsBody(origin, direction = {x: 0, y: 0, z: 1}, target = null) {
        if (!this.physicsManager || !this.physicsManager.isReady()) {
debug('PHYSICS', 'PhysicsManager not ready - falling back to simple projectile');
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
            
            // Create visual representation - larger and more visible
            const geometry = new THREE.SphereGeometry(5.0, 8, 6); // Increased from 2.0 to 5.0 for better visibility
            const material = new THREE.MeshBasicMaterial({ 
                color: this.isHoming ? 0xff6666 : 0x66ff66, // Brighter colors - already self-illuminated  
                transparent: false, // Fully opaque for maximum visibility
                opacity: 1.0
                // Note: MeshBasicMaterial is already self-illuminated, no emissive properties needed
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
debug('COMBAT', `🎯 ${this.weaponName}: Visual missile mesh created and added to scene (radius: 5.0m, glowing)`);
            } else {
                // Try alternative scene sources
                const fallbackScene = window.starfieldManager?.scene || window.scene;
                if (fallbackScene) {
                    fallbackScene.add(this.threeObject);
                    this.scene = fallbackScene; // Store for cleanup
debug('COMBAT', `🎯 ${this.weaponName}: Visual missile mesh added using fallback scene reference`);
                } else {
                    console.warn(`⚠️ ${this.weaponName}: No scene available for visual mesh - starfieldManager: ${!!window.starfieldManager}, window.scene: ${!!window.scene}`);
                }
            }
            
            // FIXED COLLISION RADIUS: Realistic collision detection for visual consistency
            let collisionRadius;
            
            // Get projectile speed - unified calculation for all physics
            let projectileSpeed = this.isHoming ? 8000 : 10000; // Default speeds
            if (this.weaponData?.specialProperties?.projectileSpeed) {
                projectileSpeed = this.weaponData.specialProperties.projectileSpeed;
            }
            
            const physicsStepDistance = (projectileSpeed / 240); // Distance per physics step (240 FPS)
            const minRadiusForTunneling = Math.max(1.0, physicsStepDistance * 0.5); // Minimal tunneling prevention
            
debug('TARGETING', `🔍 COLLISION DEBUG: ${this.weaponName} target parameter:`, target);
debug('P1', `🔍 COLLISION DEBUG: target has distance property: ${target && target.distance !== undefined}`);
debug('TARGETING', `🔍 COLLISION DEBUG: target.distance value: ${target ? target.distance : 'N/A'}`);
            
            if (target && target.distance) {
                const targetDistance = target.distance;
                
                // PRECISION COLLISION RADIUS: Use weapon firing tolerance from CrosshairTargeting
                // This ensures collision radius matches the actual aiming precision requirements
                const aimToleranceKm = CrosshairTargeting.calculateAimTolerance(targetDistance, 'weapon');
                const baseRadius = aimToleranceKm * 1000; // Convert km to meters
                
                // ENHANCED CLOSE-RANGE COMPENSATION: Ensure reliable collision at very close range
                let speedCompensatedRadius = minRadiusForTunneling;
                if (targetDistance < 1.0) {
                    // Ultra close range: Increase collision radius significantly for reliable hits
                    speedCompensatedRadius = Math.max(minRadiusForTunneling, baseRadius * 2.0);
                } else if (targetDistance < 3.0) {
                    // Close range: Moderate increase to collision radius
                    speedCompensatedRadius = Math.max(minRadiusForTunneling, baseRadius * 1.5);
                } else {
                    // Normal range: Standard tunneling prevention
                    speedCompensatedRadius = minRadiusForTunneling;
                }
                
                collisionRadius = Math.max(baseRadius, speedCompensatedRadius);
                
                console.log(`🎯 ${this.weaponName}: ENHANCED collision radius: distance=${targetDistance.toFixed(1)}km, tolerance=${aimToleranceKm.toFixed(4)}km, base=${baseRadius.toFixed(1)}m, speed_comp=${speedCompensatedRadius.toFixed(1)}m, final=${collisionRadius.toFixed(1)}m`);
            } else {
                // STRICT FALLBACK: For free-aim firing without precise target, use minimal radius
                // This prevents "spray and pray" tactics from working too well
                const aimToleranceKm = 0.002; // 2m = very tight for free-aim
                const baseRadius = aimToleranceKm * 1000; // Convert km to meters
                collisionRadius = Math.max(baseRadius, minRadiusForTunneling);
debug('TARGETING', `🎯 ${this.weaponName}: STRICT FALLBACK collision radius: tolerance=${aimToleranceKm}km, base=${baseRadius}m, final=${collisionRadius}m (no precise target)`);
            }
            
            // Create physics rigid body with distance-appropriate collision radius
            const bodyConfig = {
                mass: 10.0,
                restitution: 0.0, // SIMPLIFIED: No bouncing at all
                friction: 0.3,
                shape: 'sphere',
                radius: collisionRadius, // BALANCED RADIUS: Allows hits but prevents instant collision
                entityType: 'projectile',
                entityId: `${this.weaponName}_${Date.now()}`,
                health: 1,
                projectileSpeed: projectileSpeed // SPEED DATA: For enhanced CCD configuration
            };
            
debug('COMBAT', `🔍 PHYSICS SETUP: ${this.weaponName} - collision radius: ${collisionRadius}m, speed: ${projectileSpeed}m/s, delay: ${this.collisionDelayMs}ms`);
            
            this.rigidBody = this.physicsManager.createRigidBody(this.threeObject, bodyConfig);
            
            if (this.rigidBody) {
debug('COMBAT', `✅ PHYSICS BODY CREATED: ${this.weaponName} rigid body created successfully`);
                // Silent rigid body creation
                
                // Calculate velocity based on direction and weapon-specific speed
debug('COMBAT', `🚀 ${this.weaponName}: Using weapon-specific speed: ${projectileSpeed} m/s`);
                this.velocity = {
                    x: direction.x * projectileSpeed,
                    y: direction.y * projectileSpeed,
                    z: direction.z * projectileSpeed
                };
                
                // Apply velocity to the physics rigid body
                const physicsVelocity = this.physicsManager.createVector3(
                    this.velocity.x,
                    this.velocity.y,
                    this.velocity.z
                );
                this.rigidBody.setLinearVelocity(physicsVelocity);
                
                                console.log(`🚀 ${this.weaponName}: Set velocity to ${projectileSpeed} units/s in direction:`, {
                    x: direction.x.toFixed(3), 
                    y: direction.y.toFixed(3), 
                    z: direction.z.toFixed(3)
                });
                
                // DEBUG: Also log where this will take the projectile
                const projectedEndPos = {
                    x: (origin.x + direction.x * 1000).toFixed(1),
                    y: (origin.y + direction.y * 1000).toFixed(1),
                    z: (origin.z + direction.z * 1000).toFixed(1)
                };
debug('COMBAT', `🎯 ${this.weaponName}: Will fly toward position:`, projectedEndPos);
                
                // DEBUG: Track projectile for collision detection
debug('COMBAT', `🔍 COLLISION TRACKING: ${this.weaponName} will accept collisions after ${this.collisionDelayMs}ms delay`);
                
                // DEBUG: Direction is now properly calculated to aim at validated targets
                if (this.target && this.target.position) {
        
                }
                
                // Enhanced CCD configuration handled automatically by PhysicsManager via bodyConfig.projectileSpeed
                
                // Set up collision callback
                this.setupCollisionCallback();
            } else {

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
            
            return;
        }
        
        if (effectsManager.fallbackMode) {
            
            // Temporarily bypass fallback mode for testing
        }
        
        const THREE = window.THREE;
        if (!THREE) {
            
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
        // TRAIL DISABLED: Temporarily disabled to eliminate visual artifacts
        
        this.trailData = effectsManager.createProjectileTrail(this.trailId, particleType, startPos, this.threeObject);
    }

    /**
     * Set up collision detection callback for the projectile
     */
    setupCollisionCallback() {
        if (!this.rigidBody || !this.physicsManager) {

            return;
        }
        
        // Add projectile to physics manager's collision tracking
        this.rigidBody.projectileOwner = this;
        
    }
    
    /**
     * Called when projectile collides with something
     * @param {Object} contactPoint Contact point information
     * @param {Object} otherObject The object we collided with
     */
    onCollision(contactPoint, otherObject) {
debug('COMBAT', `🚀 COLLISION EVENT: ${this.weaponName} collision detected!`);
        
        // COLLISION DELAY: Prevent instant collision on launch
        const currentTime = Date.now();
        const flightTime = currentTime - this.launchTime;
        if (currentTime < this.allowCollisionAfter) {
debug('COMBAT', `⏰ COLLISION DELAY: ${this.weaponName} collision blocked (${flightTime}ms flight, need ${this.collisionDelayMs}ms)`);
            return; // Ignore collision during delay period
        }
        
debug('COMBAT', `🎯 COLLISION ACCEPTED: ${this.weaponName} after ${flightTime}ms flight time`);
        
        // Store collision target for direct hit weapons (otherObject is threeObject)
        // Need to find the entity metadata from the threeObject
        if (this.physicsManager && otherObject) {
            const rigidBody = this.physicsManager.rigidBodies.get(otherObject);
            if (rigidBody) {
                this.collisionTarget = this.physicsManager.entityMetadata.get(rigidBody);
                
                // SIMPLE RULE: Missiles ignore collisions with other projectiles entirely
                if (this.collisionTarget && 
                    this.collisionTarget.type === 'projectile') {
debug('TARGETING', `🚫 PROJECTILE PASS-THROUGH: ${this.weaponName} ignoring collision with projectile ${this.collisionTarget.id} (type: ${this.collisionTarget.type})`);
                    return; // Missiles pass through other missiles
                }
                
                // TARGET VALIDATION: Relaxed - only block obvious wrong targets
                if (this.target && this.collisionTarget) {
                    const hitEntityType = this.collisionTarget.type || 'unknown';
                    const intendedTargetType = this.target.type || 'enemy_ship';
                    
                    // Only skip very large celestial bodies when clearly aiming at ships
                    if (intendedTargetType === 'enemy_ship' && hitEntityType === 'star') {
debug('TARGETING', `🚫 TARGET VALIDATION: Skipping ${hitEntityType} collision - intended target was ${intendedTargetType}`);
                        return; // Only block star collisions, allow planets/moons
                    }
                }
                
debug('TARGETING', `🎯 COLLISION: Stored collision target:`, this.collisionTarget?.id || 'Unknown', `(type: ${this.collisionTarget?.type || 'unknown'})`);
            } else {
debug('TARGETING', `⚠️ COLLISION: Could not find rigid body for collision target`);
                this.collisionTarget = otherObject; // Fallback to threeObject
            }
        } else {
            this.collisionTarget = otherObject; // Fallback to threeObject
        }
        // CRITICAL: Prevent collision loops
        if (this.hasDetonated || this.collisionProcessed) {
            return;
        }
        this.collisionProcessed = true;
        // NOTE: hasDetonated will be set by detonate() method after damage application
        
        // Native collision detection - process collision immediately
        
debug('TARGETING', `🛑 COLLISION: ${this.weaponName} hit target - starting cleanup and damage application`);
        
        // CRITICAL: Immediately remove from physics world to prevent further collisions
        if (this.rigidBody && this.physicsManager) {
            try {
                this.physicsManager.removeRigidBody(this.threeObject);
debug('COMBAT', `🧹 REMOVED: ${this.weaponName} from physics world`);
            } catch (error) {
                console.error('Error removing projectile from physics:', error);
            }
        }
        
        // IMPROVED: Immediately stop trail updates to prevent bouncing
        if (this.trailData && this.trailData.projectileObject) {
            this.trailData.projectileObject = null;
debug('COMBAT', `🛑 TRAIL: ${this.weaponName} trail stopped`);
            
            // CRITICAL: Immediately call removeProjectileTrail to start fade-out
            if (this.trailId && window.starfieldManager?.viewManager?.getShip()?.weaponEffectsManager) {
                const effectsManager = window.starfieldManager.viewManager.getShip().weaponEffectsManager;
                effectsManager.removeProjectileTrail(this.trailId);
debug('COMBAT', `🧹 TRAIL: Started fade-out for ${this.weaponName} trail`);
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
debug('COMBAT', `🎯 COLLISION: ${this.weaponName} collision position:`, position);
        } catch (error) {
debug('UTILITY', 'Using fallback position for collision');
            // Clone position to avoid corruption when object is removed
            const clonedPos = this.threeObject.position.clone();
            position = {
                x: clonedPos.x,
                y: clonedPos.y,
                z: clonedPos.z
            };
debug('COMBAT', `🎯 COLLISION: ${this.weaponName} fallback position:`, position);
        }
        
        // Detonate at collision point
debug('COMBAT', `💥 COLLISION: ${this.weaponName} calling detonate() with position:`, position);
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
            
            const flightRangeMeters = this.flightRange * 1000; // Convert km to meters
            if (distance >= flightRangeMeters - 50) { // Stop 50m before max range to prevent overshoot
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
debug('COMBAT', `DETONATE METHOD CALLED FOR ${this.weaponName}`);
debug('UTILITY', `hasDetonated: ${this.hasDetonated}`);
        
        if (this.hasDetonated) {
debug('COMBAT', `DETONATE: ${this.weaponName} already detonated, skipping`);
            return;
        }
        
debug('COMBAT', `💥 DETONATE: ${this.weaponName} starting detonation sequence`);
debug('UTILITY', `💥 Position:`, position);
        
        // Get detonation position with validation and debugging
        let detonationPos = position;
        if (!detonationPos && this.threeObject && this.threeObject.position) {
            // Clone position to avoid corruption when object is removed
            const clonedPos = this.threeObject.position.clone();
debug('COMBAT', `🎯 ${this.weaponName}: Using threeObject position for detonation:`, clonedPos);
debug('COMBAT', `🎯 ${this.weaponName}: Start position was:`, this.startPosition);
            
            // Calculate distance traveled for debugging
            const distanceTraveled = Math.sqrt(
                Math.pow(clonedPos.x - this.startPosition.x, 2) +
                Math.pow(clonedPos.y - this.startPosition.y, 2) +
                Math.pow(clonedPos.z - this.startPosition.z, 2)
            );
debug('COMBAT', `🎯 ${this.weaponName}: Distance traveled: ${distanceTraveled.toFixed(1)}m (max: ${(this.flightRange * 1000).toFixed(0)}m)`);
            
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
debug('COMBAT', `💥 ${this.weaponName}: Starting damage application at position:`, detonationPos);
        
        // Check if this is a direct-hit weapon (zero blast radius)
        if (this.blastRadius === 0) {
debug('TARGETING', `🎯 ${this.weaponName}: Direct hit weapon - applying damage to collision target only`);
            this.applyDirectHitDamage(detonationPos);
        } else {
debug('COMBAT', `💥 ${this.weaponName}: Splash damage weapon - applying area effect`);
            this.applyPhysicsSplashDamage(detonationPos);
        }
        
        // Show collision visualization spheres for splash damage weapons only
        if (this.physicsManager && detonationPos && this.blastRadius > 0) {
            this.physicsManager.createCollisionVisualization(detonationPos, detonationPos, this.blastRadius);
        } else if (this.blastRadius === 0) {
debug('COMBAT', `🎯 ${this.weaponName}: Direct hit weapon - no blast visualization needed`);
        }
        
        this.createExplosionEffect(detonationPos);
        
        // Mark as detonated AFTER damage application
        this.hasDetonated = true;
        
        this.cleanup();
    }
    
    /**
     * Apply direct hit damage to the collision target only
     * @param {Object} position Collision position
     */
    applyDirectHitDamage(position) {
        if (!this.collisionTarget || !position) {
debug('TARGETING', `⚠️ ${this.weaponName}: No collision target for direct hit damage`);
            return;
        }
        
debug('TARGETING', `🎯 ${this.weaponName}: Applying direct hit damage to collision target`);
        
        // Find the ship object from the collision target
        let targetShip = null;
        
        // Check if collision target has ship reference
        if (this.collisionTarget.ship && typeof this.collisionTarget.ship.applyDamage === 'function') {
            targetShip = this.collisionTarget.ship;
debug('TARGETING', `🎯 ${this.weaponName}: Found target ship via collision target:`, targetShip.shipName || 'Unknown');
        } else if (this.collisionTarget.threeObject?.userData?.ship && typeof this.collisionTarget.threeObject.userData.ship.applyDamage === 'function') {
            targetShip = this.collisionTarget.threeObject.userData.ship;
debug('TARGETING', `🎯 ${this.weaponName}: Found target ship via threeObject:`, targetShip.shipName || 'Unknown');
        } else if (typeof this.collisionTarget.applyDamage === 'function') {
            targetShip = this.collisionTarget;
debug('TARGETING', `🎯 ${this.weaponName}: Collision target is ship object:`, targetShip.shipName || 'Unknown');
        }
        
        if (!targetShip) {
debug('TARGETING', `⚠️ ${this.weaponName}: Could not find ship object for collision target`);
            console.log(`🔍 Collision target structure:`, {
                hasShip: !!this.collisionTarget.ship,
                hasApplyDamage: typeof this.collisionTarget.applyDamage === 'function',
                hasThreeObject: !!this.collisionTarget.threeObject,
                hasUserData: !!this.collisionTarget.threeObject?.userData,
                hasUserDataShip: !!this.collisionTarget.threeObject?.userData?.ship,
                type: this.collisionTarget.type,
                id: this.collisionTarget.id
            });
            return;
        }
        
        // Apply full damage (no distance falloff for direct hits)
        const damage = this.damage;
debug('TARGETING', `💥 ${this.weaponName}: Applying ${damage} direct hit damage to ${targetShip.shipName || 'enemy ship'}`);
        
        const damageResult = targetShip.applyDamage(damage, 'kinetic', null);
debug('TARGETING', `💥 ${this.weaponName}: After damage - hull: ${targetShip.currentHull}/${targetShip.maxHull}, destroyed: ${damageResult?.isDestroyed || false}`);
        
        // Show damage feedback on HUD using unified display
        this.showDamageFeedback(targetShip, damage);
        
        // Also show hit feedback with unified display
        if (window.starfieldManager?.viewManager?.getShip()?.weaponSystem?.weaponHUD) {
            const weaponHUD = window.starfieldManager.viewManager.getShip().weaponSystem.weaponHUD;
            weaponHUD.showUnifiedMessage(`HIT! ${damage} DMG`, 2000, 3, '#00ff00', '#00aa00', 'rgba(0, 40, 0, 0.9)');
        }
        
        // Play hit sound
        if (window.starfieldManager?.viewManager?.getShip()?.weaponEffectsManager) {
            const effectsManager = window.starfieldManager.viewManager.getShip().weaponEffectsManager;
            const targetPos = new THREE.Vector3(position.x, position.y, position.z);
            effectsManager.playSound('explosion', targetPos, 0.7);
        }
        
        // Check for destruction - either freshly destroyed this hit OR already at 0 hull
        const isDestroyed = (damageResult && damageResult.isDestroyed) || (targetShip.currentHull <= 0.001);
        if (isDestroyed) {
debug('TARGETING', `🔥 ${this.weaponName}: ${targetShip.shipName || 'Enemy ship'} DESTROYED by direct hit!`);
            
            // Show target destruction feedback on weapon HUD
            this.showTargetDestructionFeedback(targetShip);
            
            if (window.starfieldManager?.viewManager?.getShip()?.weaponEffectsManager) {
                const effectsManager = window.starfieldManager.viewManager.getShip().weaponEffectsManager;
                effectsManager.playSuccessSound(null, 0.8);
            }
            
            // CRITICAL FIX: Remove destroyed ship from game world (was missing!)
            // Defer removal to next frame to avoid interfering with ongoing collision processing
            if (window.starfieldManager && typeof window.starfieldManager.removeDestroyedTarget === 'function') {
                setTimeout(() => {
                    try {
                        window.starfieldManager.removeDestroyedTarget(targetShip);
                    } catch (error) {
debug('P1', 'Error during target removal:', error.message);
                    }
                }, 0);
            }
        }
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
        // Removed spatial query debug spam
            
            affectedEntities.forEach(entity => {
                // Skip projectiles (including the torpedo itself) - they shouldn't take splash damage
                if (entity.type === 'projectile') {
debug('COMBAT', `🚫 ${this.weaponName}: Skipping projectile entity: ${entity.id} (projectiles don't take splash damage)`);
                    return;
                }
                
                // Get entity position from threeObject
                let entityPosition = null;
                if (entity.threeObject && entity.threeObject.position) {
                    entityPosition = entity.threeObject.position;
                } else if (entity.position) {
                    entityPosition = entity.position;
                } else {
debug('COMBAT', 'Entity has no position, skipping damage application');
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
                
debug('COMBAT', `🎯 ${this.weaponName}: Entity at ${distance.toFixed(1)}m distance, calculated ${damage} damage (max: ${maxDamage}) [inverse-square law]`);
                
                if (damage > 0) {
                    // FIXED: Use the entity found by spatial query (the actual target in blast radius)
                    let targetShip = null;
                    
                    // Priority 1: Check if entity has ship reference (from physics metadata)
                    if (entity.ship && typeof entity.ship.applyDamage === 'function') {
                        targetShip = entity.ship;
                        const shipName = entity.ship.shipName || entity.id || 'Unknown';
debug('TARGETING', `💥 ${this.weaponName}: Found target ship via entity.ship: ${shipName} (distance: ${distance.toFixed(1)}m)`);
                    }
                    
                    // Priority 2: Try alternative paths to find ship reference from entity
                    if (!targetShip) {
                        if (entity.threeObject?.userData?.ship && typeof entity.threeObject.userData.ship.applyDamage === 'function') {
                            targetShip = entity.threeObject.userData.ship;
                            const shipName = entity.threeObject.userData.ship.shipName || entity.id || 'Unknown';
debug('COMBAT', `💥 ${this.weaponName}: Found ship via threeObject.userData.ship: ${shipName}`);
                        } else if (typeof entity.applyDamage === 'function') {
                            // Entity itself is the ship object
                            targetShip = entity;
                            const shipName = entity.shipName || entity.id || 'Unknown';
debug('COMBAT', `💥 ${this.weaponName}: Entity is direct ship object: ${shipName}`);
                        }
                    }
                    
                    // Final fallback: If spatial query entity doesn't have ship reference, log for debugging
                    if (!targetShip) {
debug('COMBAT', `${this.weaponName}: Spatial query found entity at ${distance.toFixed(1)}m but no ship reference found. Entity type: ${entity.type}, ID: ${entity.id}`);
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
debug('TARGETING', `💥 ${this.weaponName}: Applying ${damage} explosive damage to ${targetShip.shipName || 'enemy ship'} (hull: ${targetShip.currentHull}/${targetShip.maxHull})`);
                        
                        // PROJECTILE WEAPONS: Apply damage without sub-targeting (3rd parameter = null)
                        const damageResult = targetShip.applyDamage(damage, 'explosive', null);
debug('TARGETING', `💥 ${this.weaponName}: After damage - hull: ${targetShip.currentHull}/${targetShip.maxHull}, destroyed: ${damageResult?.isDestroyed || false}`);
                        
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
debug('COMBAT', `🛡️ ${this.weaponName}: Shields absorbed ${damageResult.shieldDamage} damage`);
                        }
                        if (damageResult.hullDamage > 0) {
debug('COMBAT', `💥 ${this.weaponName}: Hull took ${damageResult.hullDamage} damage`);
                        }
                        if (damageResult.systemsDamaged.length > 0) {
debug('COMBAT', `🎯 ${this.weaponName}: Random subsystem hits: ${damageResult.systemsDamaged.join(', ')}`);
                        }
                        
                        // Check for destruction - either freshly destroyed this hit OR newly at 0 hull
                        const isNowDestroyed = (damageResult && damageResult.isDestroyed) || (targetShip.currentHull <= 0.001);
                        if (isNowDestroyed && !wasAlreadyDestroyed) {
debug('TARGETING', `🔥 ${this.weaponName}: ${targetShip.shipName || 'Enemy ship'} DESTROYED by torpedo blast!`);
                            targetShip.currentHull = 0;
                            
                            if (window.starfieldManager?.viewManager?.getShip()?.weaponEffectsManager) {
                                const effectsManager = window.starfieldManager.viewManager.getShip().weaponEffectsManager;
                                effectsManager.playSuccessSound(null, 0.8);
                            }
                            
                            // Defer removal to next frame to avoid interfering with ongoing collision processing
                            if (window.starfieldManager && typeof window.starfieldManager.removeDestroyedTarget === 'function') {
                                setTimeout(() => {
                                    try {
                                        window.starfieldManager.removeDestroyedTarget(targetShip);
                                    } catch (error) {
debug('P1', 'Error during splash damage target removal:', error.message);
                                    }
                                }, 0);
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
     * @returns {number} Distance in kilometers (1 world unit = 1km)
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
            // Path 3: Through StarfieldManager directly
            else if (window.starfieldManager?.weaponHUD) {
                weaponHUD = window.starfieldManager.weaponHUD;

            }
            
            if (weaponHUD) {
                const targetName = target.shipName || target.name || 'Target';

                weaponHUD.showDamageFeedback(this.weaponName, damage, targetName);
            }
        } catch (error) {
debug('P1', 'Failed to show damage feedback:', error.message);
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
                
                // Only play explosion sound if missile hit something (collisionTarget exists)
                if (this.collisionTarget) {
                    // Use 'torpedo' explosion type for torpedo-specific explosion sound (explosion-01.mp3)
                    effectsManager.createExplosion(explosionPos, this.blastRadius, 'torpedo', explosionPos);
debug('UTILITY', `✨ Created explosion effect with sound at:`, position, `with radius ${this.blastRadius}m`);
                } else {
                    // Create visual explosion only (no sound) for misses
                    effectsManager.createExplosion(explosionPos, this.blastRadius, 'silent', explosionPos);
debug('UTILITY', `✨ Created silent explosion effect at:`, position, `with radius ${this.blastRadius}m (miss - no sound)`);
                }
            } catch (error) {
debug('P1', 'Failed to create explosion effect:', error);
            }
        } else {
debug('COMBAT', 'No weapon effects manager available for explosion effect');
        }
    }
    
    /**
     * ENHANCED: Clean up physics resources immediately with complete tracking removal
     */
    cleanup() {
        try {
debug('COMBAT', `🧹 CLEANUP: Starting cleanup for ${this.weaponName}`);
            
            // Clear range checking interval to prevent memory leaks
            if (this.rangeCheckInterval) {
                clearInterval(this.rangeCheckInterval);
                this.rangeCheckInterval = null;
debug('COMBAT', `🧹 CLEANUP: Cleared range check interval for ${this.weaponName}`);
            }
            
            // CRITICAL: Remove from global projectile tracking array to prevent memory leaks
            if (window.activeProjectiles) {
                const index = window.activeProjectiles.indexOf(this);
                if (index > -1) {
                    window.activeProjectiles.splice(index, 1);
debug('COMBAT', `🧹 CLEANUP: Removed ${this.weaponName} from global tracking (${window.activeProjectiles.length} remaining)`);
                }
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
debug('COMBAT', `🧹 CLEANUP: Removed trail for ${this.weaponName}`);
            }
            
            // Remove from physics world
            if (this.rigidBody && this.physicsManager && this.threeObject) {
                this.physicsManager.removeRigidBody(this.threeObject);
                this.rigidBody = null;
debug('COMBAT', `🧹 CLEANUP: Removed rigid body for ${this.weaponName}`);
            }
            
            // Remove from visual scene
            if (this.threeObject && this.scene) {
                this.scene.remove(this.threeObject);
                this.threeObject.geometry?.dispose();
                this.threeObject.material?.dispose();
                this.threeObject = null;
debug('COMBAT', `🧹 CLEANUP: Removed visual mesh for ${this.weaponName}`);
            }
            
debug('COMBAT', `✅ CLEANUP: Completed cleanup for ${this.weaponName}`);
            
        } catch (error) {
            console.error(`❌ CLEANUP ERROR: Failed to clean up ${this.weaponName}:`, error);
        }
    }

    /**
     * ENHANCED: Expire the projectile when it travels beyond weapon range
     * Clean removal without explosion effects
     */
    expireOutOfRange() {
        if (this.hasDetonated) {
debug('COMBAT', `⚠️ ${this.weaponName}: Already detonated, skipping expireOutOfRange`);
            return;
        }
        
debug('COMBAT', `💨 ${this.weaponName}: Expiring after reaching maximum range or flight time`);
        
        // CRITICAL: Set detonated flag FIRST to prevent double cleanup
        this.hasDetonated = true;
        
        // Clear range checking interval immediately
        if (this.rangeCheckInterval) {
            clearInterval(this.rangeCheckInterval);
            this.rangeCheckInterval = null;
debug('COMBAT', `🧹 EXPIRE: Cleared range check interval for ${this.weaponName}`);
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
debug('COMBAT', `🧹 REMOVED: ${this.weaponName} from physics world (expired)`);
            } catch (error) {
                console.error('Error removing expired projectile from physics:', error);
            }
        }
        
        // Show miss feedback for out-of-range expiry - find parent weapon
        try {
            // Try to find the active weapon to show miss feedback
            if (window.starfieldManager?.viewManager?.ship?.weaponSystem) {
                const weaponSystem = window.starfieldManager.viewManager.ship.weaponSystem;
                const activeWeapon = weaponSystem.getActiveWeapon();
                if (activeWeapon?.equippedWeapon && activeWeapon.equippedWeapon.name === this.weaponName) {
                    if (typeof activeWeapon.equippedWeapon.showMissFeedback === 'function') {
                        activeWeapon.equippedWeapon.showMissFeedback();
debug('COMBAT', `🎯 PROJECTILE MISS: Called showMissFeedback on ${this.weaponName}`);
                    }
                }
            }
        } catch (error) {
debug('P1', 'Failed to show projectile miss feedback:', error.message);
        }
        
        // Clean up immediately without explosion effects
        this.cleanup();
    }
    
    /**
     * Show target destruction feedback through HUD system
     * @param {Object} targetShip The destroyed target ship
     */
    showTargetDestructionFeedback(targetShip) {
        try {
            const targetName = targetShip.shipName || 'ENEMY SHIP';
            const message = `${targetName.toUpperCase()} DESTROYED`;
            
debug('TARGETING', `🎯 TARGET DESTRUCTION FEEDBACK: ${this.weaponName} destroyed ${targetName}`);
            
            // Try to get weapon HUD reference through various paths
            let weaponHUD = null;
            
            // Path 1: Through ship's weapon system
            if (window.starfieldManager?.viewManager?.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.starfieldManager.viewManager.ship.weaponSystem.weaponHUD;
debug('TARGETING', `🎯 TARGET DESTRUCTION: Found weaponHUD via ship.weaponSystem`);
            }
            // Path 2: Through global ship reference
            else if (window.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.ship.weaponSystem.weaponHUD;
debug('TARGETING', `🎯 TARGET DESTRUCTION: Found weaponHUD via global ship`);
            }
            // Path 3: Through StarfieldManager directly
            else if (window.starfieldManager?.weaponHUD) {
                weaponHUD = window.starfieldManager.weaponHUD;
debug('TARGETING', `🎯 TARGET DESTRUCTION: Found weaponHUD via StarfieldManager`);
            }
            
            if (weaponHUD) {
debug('TARGETING', `🎯 TARGET DESTRUCTION: Calling showWeaponFeedback('target-destroyed') on weaponHUD`);
                weaponHUD.showWeaponFeedback('target-destroyed', message);
            } else {
debug('TARGETING', `🎯 TARGET DESTRUCTION: No weaponHUD found for target destruction feedback`);
            }
        } catch (error) {
debug('P1', 'Failed to show target destruction feedback:', error.message);
        }
    }
} 