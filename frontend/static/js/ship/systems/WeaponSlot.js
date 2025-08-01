/**
 * WeaponSlot - Manages individual weapon slot state and firing
 * Based on docs/weapons_system_spec.md and docs/system_architecture.md
 * Handles weapon installation, cooldown management, and firing logic
 */

import { WeaponCard } from './WeaponCard.js';

export class WeaponSlot {
    constructor(weaponNumber, ship, starfieldManager, weaponSystem = null) {
        this.weaponNumber = weaponNumber;
        this.ship = ship;
        this.starfieldManager = starfieldManager;
        this.weaponSystem = weaponSystem; // Reference to WeaponSystemCore for HUD messaging
        this.weapon = null;
        this.lastFired = 0;
        this.effectsManager = null;
        
        // Debug throttling
        this.lastDebugTime = 0;
        this.debugInterval = 2000; // Debug every 2 seconds max
        
        // One-time configuration debug
        this.configurationLogged = false;
        
        this.slotIndex = weaponNumber;
        this.equippedWeapon = null;
        this.cooldownTimer = 0; // milliseconds
        this.isEmpty = true;
        
        // Remove warning throttling - weapons have cooldowns already
        // Warning messages will show every time without throttling
        
        console.log(`WeaponSlot ${weaponNumber} initialized`);
    }
    
    /**
     * Fire the equipped weapon
     * @param {Ship} ship Ship instance for energy consumption
     * @param {Object} target Target object (may be null for some weapons)
     * @returns {boolean} True if weapon fired successfully
     */
    fire(ship, target = null) {
        if (!this.canFire()) {
            console.log(`Weapon slot ${this.slotIndex}: Cannot fire`);
            return false;
        }
        
        const weapon = this.equippedWeapon;
        
        // Check energy requirements
        if (weapon.energyCost > 0) {
            if (!ship.hasEnergy(weapon.energyCost)) {
                console.log(`Weapon slot ${this.slotIndex}: Insufficient energy (need ${weapon.energyCost})`);
                
                // Show HUD feedback for insufficient energy
                if (this.weaponSystem && this.weaponSystem.weaponHUD) {
                    const currentEnergy = ship.systems ? ship.systems.energyReactor?.currentEnergy || 0 : 0;
                    this.weaponSystem.weaponHUD.showInsufficientEnergyFeedback(
                        weapon.name, 
                        weapon.energyCost, 
                        currentEnergy
                    );
                } else if (this.weaponSystem && this.weaponSystem.showMessage) {
                    this.weaponSystem.showMessage(
                        `Insufficient Energy: ${weapon.name} needs ${weapon.energyCost} energy`,
                        3000
                    );
                }
                
                return false;
            }
            
            // Consume energy
            ship.consumeEnergy(weapon.energyCost);
        }
        
        // Check target requirements for splash-damage weapons
        if (weapon.targetLockRequired && !target) {
            console.log(`Weapon slot ${this.slotIndex}: Target lock required`);
            
            // Show HUD message through weapon system (no throttling)
            if (this.weaponSystem && this.weaponSystem.showMessage) {
                this.weaponSystem.showMessage(
                    `Target Lock Required: ${weapon.name} needs a locked target`,
                    3000
                );
            }
            
            return false;
        }
        
        // Range checking for both target-locked and free-aim modes
        let distanceToTarget = null;
        let isOutOfRange = false;
        
        if (target) {
            // Target-locked mode: check distance to target
            distanceToTarget = this.calculateDistanceToTarget(target);
            isOutOfRange = !weapon.isValidTarget(target, distanceToTarget);
        } else {
            // Free-aim mode: check distance to crosshair intersection
            distanceToTarget = this.calculateCrosshairDistance();
            isOutOfRange = distanceToTarget > weapon.range;
        }
        
        // Show range warning but allow firing (no throttling, always show message)
        if (isOutOfRange) {
            const distanceKm = (distanceToTarget / 1000).toFixed(1);
            const maxRangeKm = (weapon.range / 1000).toFixed(1);
            const modeText = target ? 'Target' : 'Crosshair';
            
            console.log(`Weapon slot ${this.slotIndex}: ${modeText} out of range`);
            
            // Show HUD feedback for out of range
            if (this.weaponSystem && this.weaponSystem.weaponHUD) {
                this.weaponSystem.weaponHUD.showOutOfRangeFeedback(
                    weapon.name,
                    distanceToTarget,
                    weapon.range
                );
            } else if (this.weaponSystem && this.weaponSystem.showMessage) {
                this.weaponSystem.showMessage(
                    `${modeText} Out of Range: ${weapon.name} - ${distanceKm}km > ${maxRangeKm}km max`,
                    3000
                );
            }
            
            // Continue firing anyway - don't return false
        }
        
        // Calculate proper weapon firing position (especially important for projectiles)
        const weaponOrigin = this.calculateWeaponOrigin(ship);
        
        // Removed torpedo trajectory debugging to prevent console spam
        // if (weapon.name.toLowerCase().includes('torpedo')) {
        //     console.log(`🎯 TORPEDO LAUNCH DEBUG:`);
        //     console.log(`   └ Origin: (${weaponOrigin.x.toFixed(1)}, ${weaponOrigin.y.toFixed(1)}, ${weaponOrigin.z.toFixed(1)})`);
        //     if (target) {
        //         const targetPos = target.position || target.threeObject?.position;
        //         if (targetPos) {
        //             console.log(`   └ Target: ${target.ship?.shipName || target.name} at (${targetPos.x.toFixed(1)}, ${targetPos.y.toFixed(1)}, ${targetPos.z.toFixed(1)})`);
        //             const distance = Math.sqrt(
        //                 Math.pow(weaponOrigin.x - targetPos.x, 2) +
        //                 Math.pow(weaponOrigin.y - targetPos.y, 2) +
        //                 Math.pow(weaponOrigin.z - targetPos.z, 2)
        //             );
        //             console.log(`   └ Distance: ${distance.toFixed(1)}m`);
        //         }
        //     }
        // }
        
        // Debug: Log weapon firing details for projectiles
        if (weapon.weaponType === 'splash-damage') {
            console.log(`🚀 ${weapon.name}: Firing projectile from origin:`, weaponOrigin);
            if (target) {
                const targetPos = target.position || target.threeObject?.position;
                if (targetPos) {
                    const distance = Math.sqrt(
                        Math.pow(weaponOrigin.x - targetPos.x, 2) +
                        Math.pow(weaponOrigin.y - targetPos.y, 2) +
                        Math.pow(weaponOrigin.z - targetPos.z, 2)
                    );
                    console.log(`🎯 ${weapon.name}: Target at distance ${distance.toFixed(1)}m:`, targetPos);
                }
            } else {
                console.log(`🎯 ${weapon.name}: Free-aim mode (no target lock)`);
            }
        }
        
        // Fire the weapon with proper origin position
        const fireResult = weapon.fire(weaponOrigin, target);
        
        if (fireResult.success) {
            // Set cooldown timer
            this.setCooldownTimer(weapon.cooldownTime * 1000); // Convert to milliseconds
            
            // Trigger visual and audio effects through the weapon effects manager
            if (ship.weaponEffectsManager) {
                try {
                    this.triggerWeaponEffects(ship, weapon, target, fireResult);
                } catch (error) {
                    console.log('Failed to trigger weapon effects:', error);
                }
            } else {
                console.log(`Weapon fired: ${weapon.name} (no effects manager available)`);
            }
            
            // Removed weapon firing log to prevent console spam
        // console.log(`Weapon slot ${this.slotIndex}: ${weapon.name} fired - ${fireResult.damage} damage`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Calculate weapon origin position for firing projectiles
     * @param {Ship} ship Ship instance
     * @returns {Object} Weapon origin position {x, y, z}
     */
    calculateWeaponOrigin(ship) {
        // Get THREE reference
        const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
        if (!THREE) {
            console.log('THREE.js not available, using ship position as weapon origin');
            return ship.position;
        }
        
        // Try to get camera reference for proper positioning
        let camera = null;
        if (ship.starfieldManager?.camera) {
            camera = ship.starfieldManager.camera;
        } else if (ship.viewManager?.camera) {
            camera = ship.viewManager.camera;
        } else if (ship.camera) {
            camera = ship.camera;
        }
        
        if (!camera) {
            console.log('Camera not available, using ship position as weapon origin');
            return ship.position;
        }
        
        // Calculate weapon origin position using camera-relative positioning (like lasers)
        const cameraPos = camera.position.clone();
        
        // Calculate camera's orientation vectors
        const cameraRight = new THREE.Vector3(1, 0, 0);
        const cameraDown = new THREE.Vector3(0, -1, 0);
        const cameraForward = new THREE.Vector3(0, 0, -1);
        
        // Apply camera rotation to get actual orientation vectors
        cameraRight.applyQuaternion(camera.quaternion);
        cameraDown.applyQuaternion(camera.quaternion);
        cameraForward.applyQuaternion(camera.quaternion);
        
        // Position weapon at bottom center of screen (like lasers but centered and lower)
        // For close-range shots, reduce the offset to minimize visual trajectory mismatch
        let distanceToNearestTarget = -1;
        try {
            const targetComputer = this.ship?.getSystem('target_computer');
            if (targetComputer && targetComputer.currentTarget && targetComputer.currentTarget.threeObject) {
                const targetPos = targetComputer.currentTarget.threeObject.position;
                distanceToNearestTarget = cameraPos.distanceTo(targetPos);
            }
        } catch (error) {
            // Ignore errors, use default offset
        }
        const isCloseRange = distanceToNearestTarget > 0 && distanceToNearestTarget < 5000; // Less than 5km
        
        const bottomOffset = isCloseRange ? 0.3 : 1.5; // Reduce offset for close range
        const forwardOffset = isCloseRange ? 0.1 : 0.5; // Reduce forward offset for close range
        
        if (isCloseRange) {
            console.log(`🎯 CLOSE RANGE: Reduced spawn offset for target at ${(distanceToNearestTarget/1000).toFixed(1)}km`);
        }
        
        // Create centered weapon position at bottom center (no variations)
        const weaponPosition = cameraPos.clone()
            .add(cameraDown.clone().multiplyScalar(bottomOffset))   // Down from center (reduced for close range)
            .add(cameraForward.clone().multiplyScalar(forwardOffset)); // Slightly forward (reduced for close range)
        
        console.log(`🚀 Projectile origin: Lower center screen position (unified for all weapons)`);
        
        return {
            x: weaponPosition.x,
            y: weaponPosition.y,
            z: weaponPosition.z
        };
    }
    
    /**
     * Check if weapon can fire
     * @returns {boolean} True if weapon can fire
     */
    canFire() {
        if (this.isEmpty || !this.equippedWeapon) {
            return false;
        }
        
        if (this.isInCooldown()) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Check if weapon is in cooldown
     * @returns {boolean} True if weapon is cooling down
     */
    isInCooldown() {
        return this.cooldownTimer > 0;
    }
    
    /**
     * Get cooldown percentage (0-100)
     * @returns {number} Cooldown percentage
     */
    getCooldownPercentage() {
        if (!this.equippedWeapon || this.cooldownTimer <= 0) {
            return 0;
        }
        
        const maxCooldown = this.equippedWeapon.cooldownTime * 1000;
        return Math.max(0, Math.min(100, (this.cooldownTimer / maxCooldown) * 100));
    }
    
    /**
     * Equip a weapon to this slot
     * @param {WeaponCard} weaponCard - The weapon to equip
     */
    equipWeapon(weaponCard) {
        this.equippedWeapon = weaponCard;
        this.isEmpty = false; // Mark slot as not empty
        this.cooldownTimer = 0;
        
        // Set up showMessage callback for the weapon card to use the weapon system's HUD messaging
        if (this.weaponSystem && this.weaponSystem.showMessage) {
            weaponCard.showMessage = (message, duration = 3000) => {
                this.weaponSystem.showMessage(message, duration);
            };
        }
        
        console.log(`Weapon slot ${this.slotIndex}: Equipped ${weaponCard.name}`);
        
        // Log weapon configuration once
        if (!this.configurationLogged) {
            console.log(`🔫 WEAPON CONFIG: ${weaponCard.name} - Range: ${weaponCard.range}m, Cooldown: ${weaponCard.cooldownTime}s, Sound Duration: ${weaponCard.cooldownTime}s`);
            this.configurationLogged = true;
        }
        
        return true; // Return success
    }
    
    /**
     * Unequip weapon from this slot
     * @returns {boolean} True if unequipped successfully
     */
    unequipWeapon() {
        if (this.isEmpty) {
            return false;
        }
        
        const weaponName = this.equippedWeapon ? this.equippedWeapon.name : 'Unknown';
        
        this.equippedWeapon = null;
        this.isEmpty = true;
        this.cooldownTimer = 0;
        
        console.log(`Weapon slot ${this.slotIndex}: Unequipped ${weaponName}`);
        return true;
    }
    
    /**
     * Update cooldown timer
     * @param {number} deltaTime Time elapsed in milliseconds
     */
    updateCooldown(deltaTime) {
        if (this.cooldownTimer > 0) {
            this.cooldownTimer = Math.max(0, this.cooldownTimer - deltaTime);
        }
    }
    
    /**
     * Set cooldown timer
     * @param {number} cooldownTime Cooldown time in milliseconds
     */
    setCooldownTimer(cooldownTime) {
        this.cooldownTimer = Math.max(0, cooldownTime);
    }
    
    /**
     * Get remaining cooldown time in seconds
     * @returns {number} Remaining cooldown in seconds
     */
    getRemainingCooldownTime() {
        return this.cooldownTimer / 1000;
    }
    
    /**
     * Calculate distance to target (placeholder - integrate with existing targeting system)
     * @param {Object} target Target object
     * @returns {number} Distance to target
     */
    calculateDistanceToTarget(target) {
        // Get ship position (origin)
        const ship = this.ship;
        let shipPosition = null;
        
        if (ship && ship.threeObject && ship.threeObject.position) {
            shipPosition = ship.threeObject.position;
        } else if (window.starfieldManager && window.starfieldManager.camera) {
            // Fallback to camera position if ship position not available
            shipPosition = window.starfieldManager.camera.position;
        } else {
            console.log('Cannot calculate distance: no ship or camera position available');
            return 0;
        }
        
        // Get target position
        let targetPosition = null;
        
        if (target && target.position) {
            targetPosition = target.position;
        } else if (target && target.threeObject && target.threeObject.position) {
            targetPosition = target.threeObject.position;
        } else if (target && target.ship && target.ship.threeObject && target.ship.threeObject.position) {
            targetPosition = target.ship.threeObject.position;
        } else {
            console.log('Cannot calculate distance: target position not available', target);
            return 0;
        }
        
        // Calculate 3D distance
        const distance = Math.sqrt(
            Math.pow(shipPosition.x - targetPosition.x, 2) +
            Math.pow(shipPosition.y - targetPosition.y, 2) +
            Math.pow(shipPosition.z - targetPosition.z, 2)
        );
        
        // World coordinates are already in meters, no conversion needed
        return distance;
    }
    
    /**
     * Calculate distance to where the crosshair is pointing (for free-aim mode)
     * @returns {number} Distance to crosshair intersection in meters
     */
    calculateCrosshairDistance() {
        // Ensure we have access to camera and physics
        if (!window.starfieldManager?.camera || !window.physicsManager?.initialized) {
            // If no physics or camera, assume weapon max range
            return this.equippedWeapon?.range || 24000;
        }
        
        const camera = window.starfieldManager.camera;
        const physicsManager = window.physicsManager;
        
        // Get camera's forward direction (where crosshair is pointing)
        const aimDirection = new THREE.Vector3(0, 0, -1);
        aimDirection.applyQuaternion(camera.quaternion);
        
        // Cast a ray from camera position in aim direction
        const weaponRange = this.equippedWeapon?.range || 24000;
        const raycastResult = physicsManager.raycast(
            camera.position,
            aimDirection,
            weaponRange / 1000 // Convert to world units (km)
        );
        
        if (raycastResult && raycastResult.hit && raycastResult.distance) {
            // Hit something - return actual distance in meters
            return raycastResult.distance * 1000; // Convert from world units to meters
        } else {
            // No hit within range - return weapon max range
            return weaponRange;
        }
    }
    
    /**
     * Check if laser beam intersects with target using physics raycasting
     * @param {Array} startPositions Array of beam start positions [left, right]
     * @param {Array} endPositions Array of beam end positions [left, right]
     * @param {Object} target Target object with position and optional radius (optional for area scanning)
     * @param {number} weaponRange Maximum weapon range in meters
     * @returns {Object} Hit result with {hit: boolean, position: Vector3|null, entity: object|null, distance: number}
     */
    checkLaserBeamHit(startPositions, endPositions, target, weaponRange) {
        const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
        if (!THREE) {
            console.log('THREE.js not available for laser physics raycast');
            return { hit: false, position: null, entity: null, distance: 0 };
        }

        // Check if physics manager is available
        if (!window.physicsManager || !window.physicsManager.initialized) {
            console.log('PhysicsManager not available - falling back to distance-based detection');
            return this.checkLaserBeamHit_Fallback(startPositions, endPositions, target, weaponRange);
        }

        const physicsManager = window.physicsManager;
        const weaponRangeInWorldUnits = weaponRange / 1000; // Convert meters to world units (km)

        // Throttled range debugging
        const now = Date.now();
        if (now - this.lastDebugTime > this.debugInterval) {
            const weaponRangeKm = (weaponRange / 1000).toFixed(1);
            // Physics raycast (max range ${weaponRangeKm}km)
            this.lastDebugTime = now;
        }

        // DEBUG MODE: Set this to true to disable fallback and force physics-only
        const FORCE_PHYSICS_ONLY = false; // Physics working perfectly - restore Three.js fallback as backup

        // Perform raycast for each laser beam (left and right)
        let closestHit = null;
        let closestDistance = Infinity;

        for (let i = 0; i < startPositions.length; i++) {
            const startPos = startPositions[i];
            const endPos = endPositions[i];
            
            // Calculate ray direction
            const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();
            
            // Perform physics raycast - this will find ANY targets along the beam path
            const hitResult = physicsManager.raycast(startPos, direction, weaponRangeInWorldUnits);
            
            if (hitResult && hitResult.hit) {
                // Check if this hit is closer than previous hits
                if (hitResult.distance < closestDistance) {
                    closestDistance = hitResult.distance;
                    closestHit = {
                        hit: true,
                        position: hitResult.point,
                        entity: hitResult.entity,
                        distance: hitResult.distance,
                        normal: hitResult.normal,
                        body: hitResult.body,
                        beamIndex: i // Track which beam hit (0 = left, 1 = right)
                    };
                }
                
                                    // Physics hit detected
            }
        }

        // If we have a hit, check if it matches the intended target (if target was specified)
        if (closestHit && target) {
            // Validate that we hit the intended target
            const hitEntity = closestHit.entity;
            const targetValid = this.validateTargetHit(hitEntity, target);
            
            if (!targetValid) {
                console.log(`🎯 PHYSICS HIT MISMATCH: Hit ${hitEntity?.type || 'unknown'} instead of intended target - REJECTING HIT`);
                // Reject hits on non-target entities (like celestial bodies)
                closestHit = null;
            }
        }

        if (closestHit) {
            console.log(`💥 PHYSICS LASER HIT: ${closestHit.entity?.type || 'unknown'} at ${closestDistance.toFixed(2)}km`);
            return closestHit;
        }

        // No physics hits found
        if (now - this.lastDebugTime > this.debugInterval) {
            console.log(`🎯 PHYSICS LASER MISS: No targets hit within ${(weaponRange/1000).toFixed(1)}km range`);
        }

        // FORCE PHYSICS ONLY MODE: Skip fallback to debug physics issues
        if (FORCE_PHYSICS_ONLY) {
            console.log('🚫 FALLBACK DISABLED: Physics raycast must work - returning miss');
            return { hit: false, position: null, entity: null, distance: 0 };
        }

        // If physics raycast failed or found no hits, try Three.js fallback (only if target specified)
        if (target) {
            console.log('🔄 Physics raycast failed, using Three.js fallback:');
            return this.checkLaserBeamHit_Fallback(startPositions, endPositions, target, weaponRange);
        }

        // Final miss case - no physics hit and no target for fallback
        return { hit: false, position: null, entity: null, distance: 0 };
    }

    /**
     * Validate that the hit entity matches the intended target
     * @param {Object} hitEntity The entity that was hit by raycast
     * @param {Object} target The intended target
     * @returns {boolean} True if hit matches intended target
     */
    validateTargetHit(hitEntity, target) {
        if (!hitEntity || !target) return false;
        
        // Check if hit entity matches target by comparing ship objects or names
        if (hitEntity.ship && target.ship) {
            return hitEntity.ship === target.ship || 
                   hitEntity.ship.shipName === target.ship.shipName;
        }
        
        // Check by entity type and position
        if (hitEntity.type === target.type) {
            return true;
        }
        
        // Check by entity ID
        if (hitEntity.id && target.name) {
            return hitEntity.id === target.name;
        }
        
        return false;
    }

    /**
     * Fallback hit detection for when physics is not available
     * @param {Array} startPositions Array of beam start positions [left, right]
     * @param {Array} endPositions Array of beam end positions [left, right]
     * @param {Object} target Target object with position and optional radius
     * @param {number} weaponRange Maximum weapon range in meters
     * @returns {Object} Hit result with {hit: boolean, position: Vector3|null}
     */
    checkLaserBeamHit_Fallback(startPositions, endPositions, target, weaponRange) {
        const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
        if (!THREE) {
            console.log('THREE.js not available for laser fallback raycast');
            return { hit: false, position: null, entity: null, distance: 0 };
        }

        // If no specific target provided, perform area scanning for ANY targets
        if (!target) {
            return this.checkLaserBeamHit_AreaScan(startPositions, endPositions, weaponRange);
        }

        // Original fallback logic for specific target validation
        if (!target.position) {
            return { hit: false, position: null, entity: null, distance: 0 };
        }
        
        // Calculate distance from player to target center
        const playerPos = this.starfieldManager?.camera?.position || new THREE.Vector3(0, 0, 0);
        const targetPos = new THREE.Vector3(target.position.x, target.position.y, target.position.z);
        const distanceToTarget = playerPos.distanceTo(targetPos);
        
        // Convert weapon range from meters to world units (1 world unit = 1 kilometer = 1000 meters)
        const weaponRangeInWorldUnits = weaponRange / 1000;
        
        // Check if target center is within weapon range (using correct units)
        if (distanceToTarget > weaponRangeInWorldUnits) {
            return { hit: false, position: null, entity: null, distance: distanceToTarget };
        }
        
        // WIDENED HIT DETECTION for cockpit-style weapons
        // Base target radius (convert from meters to world units)
        const baseTargetRadius = (target.radius || 50) / 1000;
        
        // Cockpit weapon bonus: Add distance-based bonus for realistic targeting from cockpit perspective
        // This simulates the fact that distant targets appear smaller and are harder to hit precisely
        const cockpitHitBonus = (1.0, distanceToTarget * 0.05); // 5% of distance, minimum 1.0km
        const effectiveTargetRadius = (baseTargetRadius + cockpitHitBonus) * 2; // 2x bigger for balanced gameplay
        
        console.log(`🎯 FALLBACK HIT DETECTION: Distance ${distanceToTarget.toFixed(2)}km, effective radius ${effectiveTargetRadius.toFixed(3)}km`);
        
        // Check intersection with laser beams using widened detection
        for (let i = 0; i < startPositions.length; i++) {
            const startPos = startPositions[i];
            const endPos = endPositions[i];
            
            // Create ray from start to end position
            const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();
            const ray = new THREE.Ray(startPos, direction);
            
            // Check distance from ray to target center
            const distanceToRay = ray.distanceToPoint(targetPos);
            
            if (distanceToRay <= effectiveTargetRadius) {
                // Hit detected - calculate intersection point
                const intersectionPoint = new THREE.Vector3();
                ray.closestPointToPoint(targetPos, intersectionPoint);
                
                console.log(`💥 FALLBACK LASER HIT: Beam ${i} hit target at distance ${distanceToRay.toFixed(3)}km from ray`);
                 
                 // Create proper entity structure for fallback mode
                 const fallbackEntity = {
                     type: target.type || 'fallback_target',
                     threeObject: target.mesh || target,
                     ship: target.ship,
                     id: target.ship?.shipName || 'fallback_target'
                 };
                 
                 return {
                     hit: true,
                     position: intersectionPoint,
                     entity: fallbackEntity,
                     distance: distanceToTarget,
                     beamIndex: i
                 };
            }
        }
        
        return { hit: false, position: null, entity: null, distance: distanceToTarget };
    }

    /**
     * Perform area scanning to find ANY targets along laser beam path (free-aim mode)
     * @param {Array} startPositions Array of beam start positions
     * @param {Array} endPositions Array of beam end positions
     * @param {number} weaponRange Maximum weapon range in meters
     * @returns {Object} Hit result
     */
    checkLaserBeamHit_AreaScan(startPositions, endPositions, weaponRange) {
        const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
        if (!THREE) {
            return { hit: false, position: null, entity: null, distance: 0 };
        }

        const weaponRangeInWorldUnits = weaponRange / 1000;
        let closestHit = null;
        let closestDistance = Infinity;

        // Get all potential targets from the scene
        const potentialTargets = this.getAllSceneTargets();
        
        console.log(`🎯 AREA SCAN: Checking ${potentialTargets.length} potential targets`);

        for (let i = 0; i < startPositions.length; i++) {
            const startPos = startPositions[i];
            const endPos = endPositions[i];
            const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();
            const ray = new THREE.Ray(startPos, direction);

            // Check each potential target
            for (const targetInfo of potentialTargets) {
                const targetPos = targetInfo.position;
                const distance = startPos.distanceTo(targetPos);
                
                // Skip targets outside weapon range
                if (distance > weaponRangeInWorldUnits) continue;
                
                // Calculate hit detection radius (larger for gameplay)
                const baseRadius = 0.1; // 100m base radius
                const effectiveRadius = baseRadius + (distance * 0.02); // Grows with distance
                
                // Check if ray intersects target
                const distanceToRay = ray.distanceToPoint(targetPos);
                
                if (distanceToRay <= effectiveRadius && distance < closestDistance) {
                    closestDistance = distance;
                    
                    const intersectionPoint = new THREE.Vector3();
                    ray.closestPointToPoint(targetPos, intersectionPoint);
                    
                    closestHit = {
                        hit: true,
                        position: intersectionPoint,
                        entity: targetInfo.entity,
                        distance: distance,
                        beamIndex: i
                    };
                    
                    console.log(`🎯 AREA SCAN HIT: Found target ${targetInfo.entity?.type || 'unknown'} at ${distance.toFixed(2)}km`);
                }
            }
        }

        if (closestHit) {
            console.log(`💥 AREA SCAN SUCCESS: Hit ${closestHit.entity?.type || 'unknown'} at ${closestDistance.toFixed(2)}km`);
            return closestHit;
        }

        console.log('🎯 AREA SCAN MISS: No targets found in beam path');
        return { hit: false, position: null, entity: null, distance: 0 };
    }

    /**
     * Get all potential targets from the scene for area scanning
     * @returns {Array} Array of target objects with position and entity info
     */
    getAllSceneTargets() {
        const targets = [];
        
        // Get targets from StarfieldManager if available
        if (this.starfieldManager) {
            // Add dummy ships
            if (this.starfieldManager.targetDummyShips) {
                this.starfieldManager.targetDummyShips.forEach(ship => {
                    if (ship.currentHull > 0.001) {
                        targets.push({
                            position: ship.mesh.position,
                            entity: {
                                type: 'enemy_ship',
                                ship: ship,
                                threeObject: ship.mesh,
                                id: ship.shipName
                            }
                        });
                    }
                });
            }
            
            // Add targets from target computer manager
            if (this.starfieldManager.targetComputerManager?.targetObjects) {
                this.starfieldManager.targetComputerManager.targetObjects.forEach(targetData => {
                    if (targetData.isShip && targetData.ship && targetData.ship.currentHull > 0.001) {
                        targets.push({
                            position: targetData.object.position,
                            entity: {
                                type: targetData.type,
                                ship: targetData.ship,
                                threeObject: targetData.object,
                                id: targetData.ship.shipName
                            }
                        });
                    }
                });
            }
        }

        return targets;
    }
    
    /**
     * Create debug wireframe sphere to visualize hit detection area
     * @param {Vector3} targetPos Target position
     * @param {number} radius Effective hit detection radius in world units
     */
    createDebugHitSphere(targetPos, radius) {
        const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
        if (!THREE) {
            console.log('DEBUG: THREE.js not available for debug sphere');
            return;
        }
        
        // Check if debug mode is enabled
        if (!this.starfieldManager?.debugMode) {
            console.log('🐛 DEBUG: Debug mode not enabled, skipping debug sphere');
            return;
        }
        
        console.log(`🐛 DEBUG: Creating hit sphere at position (${targetPos.x.toFixed(2)}, ${targetPos.y.toFixed(2)}, ${targetPos.z.toFixed(2)}) with radius ${radius.toFixed(3)}km`);
        
        // Clean up any existing debug sphere for this target
        this.cleanupDebugHitSphere();
        
        // Create wireframe sphere geometry - make it larger and more visible
        const sphereGeometry = new THREE.SphereGeometry(radius, 24, 16); // More segments for smoother sphere
        const sphereMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00, // Bright green for hit detection
            wireframe: true,
            transparent: true,
            opacity: 0.8, // More opaque
            side: THREE.DoubleSide // Render both sides
        });
        
        // Create sphere mesh
        const debugSphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        debugSphere.position.copy(targetPos);
        
        // Add a tag to identify debug spheres
        debugSphere.userData = { isDebugHitSphere: true };
        
        // Store reference for cleanup
        this.debugHitSphere = debugSphere;
        
        // Add to scene
        if (this.starfieldManager?.scene) {
            this.starfieldManager.scene.add(debugSphere);
            console.log('🐛 DEBUG: Added debug sphere to scene');
        } else {
            console.log('DEBUG: No scene available to add debug sphere');
        }
        
        // Keep visible longer when in debug mode - 5 seconds instead of 2
        setTimeout(() => {
            console.log('🐛 DEBUG: Auto-cleaning up debug sphere after 5 seconds');
            this.cleanupDebugHitSphere();
        }, 5000);
    }
    
    /**
     * Clean up debug hit sphere
     */
    cleanupDebugHitSphere() {
        if (this.debugHitSphere && this.starfieldManager?.scene) {
            this.starfieldManager.scene.remove(this.debugHitSphere);
            if (this.debugHitSphere.geometry) {
                this.debugHitSphere.geometry.dispose();
            }
            if (this.debugHitSphere.material) {
                this.debugHitSphere.material.dispose();
            }
            console.log('🐛 DEBUG: Cleaned up individual debug sphere');
            this.debugHitSphere = null;
        }
    }
    
    /**
     * Clean up all debug spheres when damage control is toggled off
     */
    static cleanupAllDebugSpheres(starfieldManager) {
        // This method can be called by StarfieldManager to clean up all debug spheres
        // when damage control mode is toggled off
        if (!starfieldManager?.scene) {
            return;
        }
        
        // Find and remove all debug hit spheres
        const objectsToRemove = [];
        starfieldManager.scene.traverse((object) => {
            // Look for debug spheres by userData tag (more reliable than color detection)
            if (object.userData && object.userData.isDebugHitSphere) {
                objectsToRemove.push(object);
            } else if (object.isMesh && object.material && object.material.wireframe && 
                object.material.color && object.material.color.getHex() === 0x00ff00) {
                // Fallback: also check for green wireframe spheres
                objectsToRemove.push(object);
            }
        });
        
        objectsToRemove.forEach(object => {
            starfieldManager.scene.remove(object);
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                object.material.dispose();
            }
        });
        
        console.log(`🧹 Cleaned up ${objectsToRemove.length} debug hit spheres`);
    }
    
    /**
     * Trigger weapon visual and audio effects
     * @param {Object} ship Ship instance with position and weaponEffectsManager
     * @param {Object} weapon Weapon configuration object
     * @param {Object} target Target object or null
     * @param {Object} fireResult Result from weapon fire
     */
    triggerWeaponEffects(ship, weapon, target, fireResult) {
        if (!ship || !ship.weaponEffectsManager) {
            // Effects manager not available, skip effects
            return;
        }
        
        const effectsManager = ship.weaponEffectsManager;
        
        // Check if effects manager is in fallback mode
        if (effectsManager.fallbackMode) {
            console.log(`Weapon ${weapon.name} fired - effects disabled (fallback mode)`);
            return;
        }
        
        // Get THREE reference (use global pattern like other files)
        const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
        if (!THREE) {
            console.log('THREE.js not available for weapon effects');
            return;
        }
        
        // Get weapon position (for now use ship position, later we'll add weapon hardpoints)
        const weaponPosition = ship.position.clone();
        const weaponDirection = new THREE.Vector3(0, 0, 1); // Default forward direction
        
        // Get camera/view direction for manual aiming and weapon positioning
        let camera = null;
        let aimDirection = weaponDirection; // Default forward direction
        
        // Try multiple ways to get the camera reference
        if (ship.starfieldManager?.camera) {
            camera = ship.starfieldManager.camera;
        } else if (ship.viewManager?.camera) {
            camera = ship.viewManager.camera;
        } else if (ship.camera) {
            camera = ship.camera;
        }
        
        // Create weapon positions at bottom screen corners (camera-relative)
        let leftWeaponPos, rightWeaponPos;
        
        if (camera) {
            // Get camera position and orientation
            const cameraPos = camera.position.clone();
            
            // Calculate camera's right and down vectors for screen-relative positioning
            const cameraRight = new THREE.Vector3(1, 0, 0);
            const cameraDown = new THREE.Vector3(0, -1, 0);
            const cameraForward = new THREE.Vector3(0, 0, -1);
            
            // Apply camera rotation to get actual orientation vectors
            cameraRight.applyQuaternion(camera.quaternion);
            cameraDown.applyQuaternion(camera.quaternion);
            cameraForward.applyQuaternion(camera.quaternion);
            
            // Position weapons at bottom screen corners (closer to camera for cockpit effect)
            const cornerOffset = 1.8; // Distance to screen corners
            const bottomOffset = 0.8; // How far down from center
            const forwardOffset = 0.5; // Slight forward offset from camera
            
            leftWeaponPos = cameraPos.clone()
                .add(cameraRight.clone().multiplyScalar(-cornerOffset)) // Left
                .add(cameraDown.clone().multiplyScalar(bottomOffset))   // Down
                .add(cameraForward.clone().multiplyScalar(forwardOffset)); // Slightly forward
                
            rightWeaponPos = cameraPos.clone()
                .add(cameraRight.clone().multiplyScalar(cornerOffset))  // Right
                .add(cameraDown.clone().multiplyScalar(bottomOffset))   // Down
                .add(cameraForward.clone().multiplyScalar(forwardOffset)); // Slightly forward
            
            // Get the camera's forward direction for aiming
            aimDirection = cameraForward.clone();
            console.log('🎯 Using camera aim direction and screen corner positioning for weapon fire');
        } else {
            // Fallback to ship-relative positioning if no camera available
            leftWeaponPos = weaponPosition.clone().add(new THREE.Vector3(-2.5, -1.5, 1.0));
            rightWeaponPos = weaponPosition.clone().add(new THREE.Vector3(2.5, -1.5, 1.0));
            console.log('Camera not found, using fallback ship-relative positioning');
        }
        
        // Always create dual muzzle flashes with optimal sound duration
        const soundDuration = weapon.weaponType === 'scan-hit' ? 0.5 : undefined;
        effectsManager.createMuzzleFlash(leftWeaponPos, aimDirection, weapon.cardType, soundDuration);
        effectsManager.createMuzzleFlash(rightWeaponPos, aimDirection, weapon.cardType, soundDuration);
        
        // Handle weapon-type-specific effects
        if (weapon.weaponType === 'scan-hit') {
            // Weapons fire from cockpit corners but converge toward the crosshairs center
            const maxRange = weapon.range; // Use weapon's actual range
            
            // Calculate convergence distance based on target distance if available, otherwise use medium range
            let convergenceDistance = maxRange * 0.5; // Default to half max range
            if (target && target.position && camera) {
                const targetPos = new THREE.Vector3(target.position.x, target.position.y, target.position.z);
                convergenceDistance = Math.min(camera.position.distanceTo(targetPos), maxRange);
            }
            
            // Calculate center aim point at convergence distance (where crosshairs are pointing)
            const centerAimPoint = camera.position.clone().add(
                aimDirection.clone().multiplyScalar(convergenceDistance)
            );
            
            // Calculate beam end positions - both beams converge at the center aim point
            const leftEndPosition = centerAimPoint.clone();
            const rightEndPosition = centerAimPoint.clone();
            
            // Create dual laser beams that converge at the aim point (no extension)
            effectsManager.createLaserBeam(leftWeaponPos, leftEndPosition, weapon.cardType);
            effectsManager.createLaserBeam(rightWeaponPos, rightEndPosition, weapon.cardType);
            
            // Perform physics-based laser hit detection
            // For scan-hit weapons (lasers), physics raycast determines hit, not accuracy roll
            let anyHit = false;
            let hitTargets = [];
            
            // Use physics raycasting to detect hits (no need to manually iterate through all ships)
            const physicsHitResult = this.checkLaserBeamHit(
                [leftWeaponPos, rightWeaponPos], 
                [leftEndPosition, rightEndPosition], 
                target, // Optional target for validation
                maxRange
            );
            
            if (physicsHitResult && physicsHitResult.hit && physicsHitResult.entity) {
                // Physics raycast found a hit!
                const hitEntity = physicsHitResult.entity;
                const hitPosition = physicsHitResult.position;
                const hitDistance = physicsHitResult.distance;
                
                // Physics laser hit detected
                
                // Create explosion at the physics hit point
                const baseExplosionRadius = Math.min(weapon.damage * 2, 100); // 2 meters per damage point, max 100m
                const explosionRadiusMeters = baseExplosionRadius;
                
                // Create visual explosion effect
                effectsManager.createExplosion(hitPosition, explosionRadiusMeters, 'damage', hitPosition);
                
                // Apply damage to the hit entity
                if (hitEntity.ship && typeof hitEntity.ship.applyDamage === 'function') {
                    // Check if we have sub-targeting for more precise damage
                    const subTargetSystem = this.ship?.getSystem('target_computer')?.currentSubTarget;
                    
                    if (subTargetSystem) {
                        // Sub-targeting - apply focused damage to specific system
                        const subTargetDamage = weapon.damage * 1.3; // 30% bonus for sub-targeting
                        console.log(`🎯 SUB-TARGET HIT: Targeting ${subTargetSystem.displayName} for ${subTargetDamage} focused damage`);
                        
                        hitEntity.ship.applyDamage(subTargetDamage, 'energy', subTargetSystem.systemName);
                        console.log(`💥 Sub-target hit: ${hitEntity.ship.shipName || 'Enemy ship'} ${subTargetSystem.displayName} took ${subTargetDamage} damage`);
                        
                        // Show damage feedback for sub-targeting
                        this.showWeaponFeedback(weapon.name, subTargetDamage, hitEntity.ship);
                    } else {
                        // No sub-targeting - apply normal damage
                        hitEntity.ship.applyDamage(weapon.damage, 'energy');
                        console.log(`💥 Physics hit: ${hitEntity.ship.shipName || 'Enemy ship'} took ${weapon.damage} damage - hull: ${hitEntity.ship.currentHull}/${hitEntity.ship.maxHull}`);
                        
                        // Show damage feedback for normal hit
                        this.showWeaponFeedback(weapon.name, weapon.damage, hitEntity.ship);
                    }
                    
                    // Check if target was destroyed
                    if (hitEntity.ship.currentHull <= 0.001) { // Use small threshold instead of exact 0 to handle floating-point precision
                        console.log(`🔥 ${hitEntity.ship.shipName || 'Enemy ship'} DESTROYED! (Hull: ${hitEntity.ship.currentHull})`);
                        
                        // Ensure hull is exactly 0 for consistency
                        hitEntity.ship.currentHull = 0;
                        
                        // Play success sound for ship destruction
                        if (ship?.weaponEffectsManager) {
                            ship.weaponEffectsManager.playSuccessSound(null, 0.8); // Full duration, 80% volume
                            console.log(`🎉 Playing ship destruction success sound (full duration)`);
                        }
                        
                        // Remove destroyed ship from game
                        if (this.starfieldManager && typeof this.starfieldManager.removeDestroyedTarget === 'function') {
                            this.starfieldManager.removeDestroyedTarget(hitEntity.ship);
                        }
                    }
                    
                    // Track successful hit
                    hitTargets.push(hitEntity);
                    anyHit = true;
                    
                    console.log(`💥 Physics laser beam hit confirmed with explosion radius ${explosionRadiusMeters}m`);
                } else {
                    console.log('Hit entity does not have a ship with applyDamage method:', hitEntity);
                }
            } else {
                console.log('🎯 Physics laser beams missed all targets');
                // Show miss feedback only if we haven't already shown it
                if (!anyHit) {
                    this.showMissFeedback(weapon.name);
                }
            }
            
            // Handle case where no physics result was obtained at all
            if (!physicsHitResult && !anyHit) {
                console.log('🎯 No physics result - laser missed');
                this.showMissFeedback(weapon.name);
            }
            
        } else if (weapon.weaponType === 'splash-damage') {
            // For projectile weapons, the projectile will handle its own trail effects
            // The explosion will be handled when the projectile detonates
            console.log(`Projectile launched: ${weapon.name} (effects will be handled by projectile)`);
        }
    }
    
    /**
     * Show miss feedback on weapon HUD
     */
    showMissFeedback() {
        try {
            // Get weapon name
            const weaponName = this.isEmpty ? 'Unknown Weapon' : this.equippedWeapon.name;
            
            // Try to get weapon HUD reference through weapon system
            if (this.weaponSystem && this.weaponSystem.weaponHUD) {
                this.weaponSystem.weaponHUD.showMissFeedback(weaponName);
            }
        } catch (error) {
            console.log('Failed to show miss feedback:', error.message);
        }
    }
    
    /**
     * Get weapon slot status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            slotIndex: this.slotIndex,
            isEmpty: this.isEmpty,
            weaponName: this.isEmpty ? null : this.equippedWeapon.name,
            weaponType: this.isEmpty ? null : this.equippedWeapon.weaponType,
            canFire: this.canFire(),
            isInCooldown: this.isInCooldown(),
            cooldownTimer: this.cooldownTimer,
            cooldownPercentage: this.getCooldownPercentage(),
                        remainingCooldownTime: this.getRemainingCooldownTime()
        };
    }
    
    /**
     * Show weapon feedback through HUD system
     * @param {string} weaponName - Name of the weapon
     * @param {number} damage - Damage dealt
     * @param {Object} target - Target that was hit
     */
    showWeaponFeedback(weaponName, damage, target) {
        try {
            // Try to get weapon HUD reference through various paths
            let weaponHUD = null;
            
            // Path 1: Through weapon system
            if (this.weaponSystem?.weaponHUD) {
                weaponHUD = this.weaponSystem.weaponHUD;
            }
            // Path 2: Through starfield manager
            else if (window.starfieldManager?.weaponHUD) {
                weaponHUD = window.starfieldManager.weaponHUD;
            }
            // Path 3: Through ship's weapon system
            else if (this.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = this.ship.weaponSystem.weaponHUD;
            }
            
            if (weaponHUD) {
                const targetName = target.shipName || target.name || 'Target';
                console.log(`🎯 LASER FEEDBACK: ${weaponName} calling showDamageFeedback (${damage} dmg)`);
                weaponHUD.showDamageFeedback(weaponName, damage, targetName);
            } else {
                console.log(`🎯 LASER FEEDBACK: No weaponHUD found for ${weaponName}`);
            }
        } catch (error) {
            console.log('Failed to show weapon feedback:', error.message);
        }
    }
    
    /**
     * Show miss feedback through HUD system
     * @param {string} weaponName - Name of the weapon
     */
    showMissFeedback(weaponName) {
        try {
            // Try to get weapon HUD reference through various paths
            let weaponHUD = null;
            
            // Path 1: Through weapon system
            if (this.weaponSystem?.weaponHUD) {
                weaponHUD = this.weaponSystem.weaponHUD;
            }
            // Path 2: Through starfield manager
            else if (window.starfieldManager?.weaponHUD) {
                weaponHUD = window.starfieldManager.weaponHUD;
            }
            // Path 3: Through ship's weapon system
            else if (this.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = this.ship.weaponSystem.weaponHUD;
            }
            
            if (weaponHUD) {
                console.log(`🎯 LASER FEEDBACK: ${weaponName} showing miss feedback`);
                weaponHUD.showWeaponFeedback('miss', weaponName);
            } else {
                console.log(`🎯 LASER FEEDBACK: No weaponHUD found for ${weaponName} miss`);
            }
        } catch (error) {
            console.log('Failed to show miss feedback:', error.message);
        }
    }
} 