/**
 * PhysicsProjectile - SIMPLIFIED physics-based projectile using Ammo.js rigid bodies
 * Extracted from WeaponCard.js for better code organization.
 *
 * Uses simple collision detection and static trails for better reliability.
 */

import { debug } from '../../../debug.js';
import { CrosshairTargeting } from '../../../utils/CrosshairTargeting.js';

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
            debug('P1', 'THREE.js not available for projectile visualization');
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
                    debug('COMBAT', `${this.weaponName}: No scene available for visual mesh - starfieldManager: ${!!window.starfieldManager}, window.scene: ${!!window.scene}`);
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

                debug('COMBAT', `${this.weaponName}: Set velocity to ${projectileSpeed} units/s in direction:`, {
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
            debug('P1', 'Failed to initialize physics body for projectile:', error);
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
                debug('COMBAT', `REMOVED: ${this.weaponName} from physics world`);
            } catch (error) {
                debug('P1', 'Error removing projectile from physics:', error);
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
                debug('COMBAT', `${this.weaponName}: Projectile position corrupted (0,0,0), skipping visualization`);
            }
        }

        // If we still don't have a valid position, skip visualization but continue with cleanup
        if (!detonationPos) {
            debug('COMBAT', `${this.weaponName}: No valid detonation position available, skipping damage and visualization`);
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
            debug('TARGETING', `${this.weaponName}: Could not find ship object for collision target`);
            debug('TARGETING', `Collision target structure:`, {
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
                        debug('COMBAT', `Entity structure:`, {
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
            debug('P1', 'Failed to apply physics splash damage:', error);
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

            debug('COMBAT', `CLEANUP: Completed cleanup for ${this.weaponName}`);

        } catch (error) {
            debug('P1', `CLEANUP ERROR: Failed to clean up ${this.weaponName}:`, error);
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
                debug('COMBAT', `REMOVED: ${this.weaponName} from physics world (expired)`);
            } catch (error) {
                debug('P1', 'Error removing expired projectile from physics:', error);
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
