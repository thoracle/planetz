/**
 * SplashDamageWeapon - Projectile-based weapons (missiles, torpedoes)
 * Extracted from WeaponCard.js for better code organization.
 */

import { debug } from '../../../debug.js';
import { WeaponCard } from './WeaponBase.js';
import { targetingService } from '../../../services/TargetingService.js';
import { PhysicsProjectile } from './PhysicsProjectile.js';
import { Projectile } from './Projectile.js';

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
                    debug('P1', `${this.name}: Failed to initialize physics:`, initError);
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
                    debug('P1', `${this.name}: Failed to create physics projectile:`, physicsError);

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
            debug('P1', `${this.name}: Complete projectile creation failure:`, fallbackError);

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
                debug('COMBAT', `MISS FEEDBACK: No weaponHUD found - checking paths:
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

            debug('TARGETING', `TARGET DESTRUCTION FEEDBACK: ${this.name} destroyed ${targetName}`);

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
