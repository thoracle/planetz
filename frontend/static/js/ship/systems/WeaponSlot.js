/**
 * WeaponSlot - Manages individual weapon slot state and firing
 * Based on docs/weapons_system_spec.md and docs/system_architecture.md
 * Handles weapon installation, cooldown management, and firing logic
 */

import { WeaponCard } from './WeaponCard.js';

export class WeaponSlot {
    constructor(weaponNumber, ship, starfieldManager) {
        this.weaponNumber = weaponNumber;
        this.ship = ship;
        this.starfieldManager = starfieldManager;
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
        
        // Throttling for warning messages to prevent spam
        this.lastInsufficientEnergyWarning = 0;
        this.lastTargetLockWarning = 0;
        this.lastOutOfRangeWarning = 0;
        this.warningThrottleTime = 5000; // 5 seconds between warnings
        
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
            console.warn(`Weapon slot ${this.slotIndex}: Cannot fire`);
            return false;
        }
        
        const weapon = this.equippedWeapon;
        
        // Check energy requirements
        if (weapon.energyCost > 0) {
            if (!ship.hasEnergy(weapon.energyCost)) {
                // Throttle insufficient energy warnings to prevent console spam
                const now = Date.now();
                if (now - this.lastInsufficientEnergyWarning > this.warningThrottleTime) {
                    console.warn(`Weapon slot ${this.slotIndex}: Insufficient energy (need ${weapon.energyCost})`);
                    this.lastInsufficientEnergyWarning = now;
                }
                return false;
            }
            
            // Consume energy
            ship.consumeEnergy(weapon.energyCost);
        }
        
        // Check target requirements for splash-damage weapons
        if (weapon.targetLockRequired && !target) {
            // Throttle target lock warnings to prevent console spam
            const now = Date.now();
            if (now - this.lastTargetLockWarning > this.warningThrottleTime) {
                console.warn(`Weapon slot ${this.slotIndex}: Target lock required`);
                this.lastTargetLockWarning = now;
            }
            return false;
        }
        
        // Validate target range
        if (target && !weapon.isValidTarget(target, this.calculateDistanceToTarget(target))) {
            // Throttle out of range warnings to prevent console spam
            const now = Date.now();
            if (now - this.lastOutOfRangeWarning > this.warningThrottleTime) {
                console.warn(`Weapon slot ${this.slotIndex}: Target out of range`);
                this.lastOutOfRangeWarning = now;
            }
            return false;
        }
        
        // Fire the weapon
        const fireResult = weapon.fire(ship.position, target);
        
        if (fireResult.success) {
            // Set cooldown timer
            this.setCooldownTimer(weapon.cooldownTime * 1000); // Convert to milliseconds
            
            // Trigger visual and audio effects through the weapon effects manager
            if (ship.weaponEffectsManager) {
                try {
                    this.triggerWeaponEffects(ship, weapon, target, fireResult);
                } catch (error) {
                    console.warn('Failed to trigger weapon effects:', error);
                }
            } else {
                console.log(`Weapon fired: ${weapon.name} (no effects manager available)`);
            }
            
            console.log(`Weapon slot ${this.slotIndex}: ${weapon.name} fired - ${fireResult.damage} damage`);
            return true;
        }
        
        return false;
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
        // This would integrate with the existing targeting/distance calculation system
        // For now, return a placeholder value
        return 500; // meters
    }
    
    /**
     * Check if laser beam intersects with target along beam path
     * @param {Array} startPositions Array of beam start positions [left, right]
     * @param {Array} endPositions Array of beam end positions [left, right]
     * @param {Object} target Target object with position and optional radius
     * @param {number} weaponRange Maximum weapon range in meters
     * @returns {Object} Hit result with {hit: boolean, position: Vector3|null}
     */
    checkLaserBeamHit(startPositions, endPositions, target, weaponRange) {
        if (!target || !target.position) {
            return { hit: false, position: null };
        }
        
        const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
        if (!THREE) {
            return { hit: false, position: null };
        }
        
        // Calculate distance from player to target center
        const playerPos = this.starfieldManager?.camera?.position || new THREE.Vector3(0, 0, 0);
        const targetPos = new THREE.Vector3(target.position.x, target.position.y, target.position.z);
        const distanceToTarget = playerPos.distanceTo(targetPos);
        
        // Convert weapon range from meters to world units (1 world unit = 1 kilometer = 1000 meters)
        const weaponRangeInWorldUnits = weaponRange / 1000;
        
        // Throttled range debugging
        const now = Date.now();
        if (now - this.lastDebugTime > this.debugInterval) {
            const distanceKm = distanceToTarget.toFixed(2);
            const weaponRangeKm = (weaponRange / 1000).toFixed(1);
            console.log(`🎯 RANGE CHECK: Target at ${distanceKm}km vs weapon range ${weaponRangeKm}km`);
            this.lastDebugTime = now;
        }
        
        // Check if target center is within weapon range (using correct units)
        if (distanceToTarget > weaponRangeInWorldUnits) {
            return { hit: false, position: null };
        }
        
        // WIDENED HIT DETECTION for cockpit-style weapons
        // Base target radius (convert from meters to world units)
        const baseTargetRadius = (target.radius || 50) / 1000; // Convert radius from meters to km
        
        // Add generous hit detection bonus for cockpit-mounted weapons
        // This accounts for the fact that weapons fire from screen corners but should hit crosshair targets
        const cockpitHitBonus = Math.max(1.0, distanceToTarget * 0.05); // 5% of distance, minimum 1.0km
        const effectiveTargetRadius = (baseTargetRadius + cockpitHitBonus) * 2; // 2x bigger for balanced gameplay
        
        console.log(`🎯 HIT DETECTION: Base radius ${baseTargetRadius.toFixed(3)}km + cockpit bonus ${cockpitHitBonus.toFixed(3)}km = effective radius ${effectiveTargetRadius.toFixed(3)}km (2x enlarged for cockpit weapons)`);
        
        // DEBUG: Always show hit detection sphere when in debug mode (regardless of hit/miss)
        console.log(`🐛 TRACE: About to check debug sphere creation - debugMode: ${this.starfieldManager?.debugMode}`);
        console.log(`🐛 TRACE: StarfieldManager exists: ${!!this.starfieldManager}`);
        if (this.starfieldManager) {
            console.log(`🐛 TRACE: StarfieldManager.debugMode: ${this.starfieldManager.debugMode}`);
            console.log(`🐛 TRACE: StarfieldManager.damageControlVisible: ${this.starfieldManager.damageControlVisible}`);
        }
        
        if (this.starfieldManager?.debugMode) {
            console.log(`🐛 TRACE: Calling createDebugHitSphere with radius ${effectiveTargetRadius}`);
            this.createDebugHitSphere(targetPos, effectiveTargetRadius);
        } else {
            console.log(`🐛 TRACE: NOT creating debug sphere - debug mode not enabled`);
        }
        
        // Check intersection with both laser beams using widened detection
        for (let i = 0; i < startPositions.length; i++) {
            const startPos = startPositions[i];
            const endPos = endPositions[i];
            
            // Create ray from start to end position
            const direction = new THREE.Vector3().subVectors(endPos, startPos).normalize();
            const ray = new THREE.Ray(startPos, direction);
            
            // Calculate distance from ray to target center
            const distanceToRay = ray.distanceToPoint(targetPos);
            
            // Check if ray intersects target sphere (using widened radius)
            if (distanceToRay <= effectiveTargetRadius) {
                // Calculate intersection point along the ray
                const closestPoint = ray.closestPointToPoint(targetPos, new THREE.Vector3());
                
                // Verify intersection point is within beam length
                const distanceAlongRay = startPos.distanceTo(closestPoint);
                const beamLength = startPos.distanceTo(endPos);
                
                if (distanceAlongRay <= beamLength) {
                    console.log(`🎯 HIT! Beam ${i + 1} hit target (distance to ray: ${distanceToRay.toFixed(3)}km <= effective radius: ${effectiveTargetRadius.toFixed(3)}km)`);
                    return { hit: true, position: closestPoint };
                }
            }
        }
        
        return { hit: false, position: null };
    }
    
    /**
     * Create debug wireframe sphere to visualize hit detection area
     * @param {Vector3} targetPos Target position
     * @param {number} radius Effective hit detection radius in world units
     */
    createDebugHitSphere(targetPos, radius) {
        const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
        if (!THREE) {
            console.warn('🐛 DEBUG: THREE.js not available for debug sphere');
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
            console.warn('🐛 DEBUG: No scene available to add debug sphere');
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
            console.warn('THREE.js not available for weapon effects');
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
            console.warn('🎯 Camera not found, using fallback ship-relative positioning');
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
            
            // Perform actual 3D hit detection along the beam path
            // Check for hits against ALL enemy ships, not just the targeted one
            if (fireResult.hit) {
                let anyHit = false;
                let hitTargets = [];
                
                // Get all enemy ships from StarfieldManager
                const allEnemyTargets = [];
                if (ship.starfieldManager?.dummyShipMeshes) {
                    ship.starfieldManager.dummyShipMeshes.forEach(mesh => {
                        if (mesh.userData?.ship && mesh.position) {
                            allEnemyTargets.push({
                                position: {
                                    x: mesh.position.x,
                                    y: mesh.position.y, 
                                    z: mesh.position.z
                                },
                                radius: 50, // Default ship radius in meters
                                ship: mesh.userData.ship,
                                mesh: mesh
                            });
                        }
                    });
                }
                
                // If we have a specific target, add it to the list if not already included
                if (target && target.position) {
                    const alreadyIncluded = allEnemyTargets.some(enemyTarget => 
                        enemyTarget.position.x === target.position.x &&
                        enemyTarget.position.y === target.position.y &&
                        enemyTarget.position.z === target.position.z
                    );
                    if (!alreadyIncluded) {
                        allEnemyTargets.push({
                            position: {
                                x: target.position.x,
                                y: target.position.y,
                                z: target.position.z
                            },
                            radius: target.radius || 50,
                            ship: target.ship,
                            mesh: target.mesh || target
                        });
                    }
                }
                
                // Check hit detection against all enemy ships
                for (const enemyTarget of allEnemyTargets) {
                    const targetHit = this.checkLaserBeamHit(
                        [leftWeaponPos, rightWeaponPos], 
                        [leftEndPosition, rightEndPosition], 
                        enemyTarget, maxRange
                    );
                    
                    if (targetHit.hit) {
                        // Calculate effective radius for explosion (same logic as in checkLaserBeamHit)
                        const playerPos = camera.position || new THREE.Vector3(0, 0, 0);
                        const targetPos = new THREE.Vector3(enemyTarget.position.x, enemyTarget.position.y, enemyTarget.position.z);
                        const distanceToTarget = playerPos.distanceTo(targetPos);
                        
                        const baseTargetRadius = (enemyTarget.radius || 50) / 1000; // Convert from meters to km
                        const cockpitHitBonus = Math.max(1.0, distanceToTarget * 0.05); // 5% of distance, minimum 1.0km
                        const effectiveTargetRadius = (baseTargetRadius + cockpitHitBonus) * 2; // 2x bigger for balanced gameplay
                        
                        // Create explosion at the intersection point
                        // Use weapon damage for explosion size instead of hit detection radius
                        const baseExplosionRadius = Math.min(weapon.damage * 2, 100); // 2 meters per damage point, max 100m
                        const explosionRadiusMeters = baseExplosionRadius;
                        effectsManager.createExplosion(targetHit.position, explosionRadiusMeters, 'damage', targetPos);
                        
                        // Apply damage to the hit enemy ship
                        if (enemyTarget.ship && enemyTarget.ship.applyDamage) {
                            // Check if we have a sub-target active for precision targeting
                            const ship = this.starfieldManager?.viewManager?.getShip();
                            const targetComputer = ship?.getSystem('target_computer');
                            
                            console.log(`🐛 DEBUG: Checking damage application for ${enemyTarget.ship.shipName || 'enemy ship'}`);
                            console.log(`🐛 DEBUG: Has target computer: ${!!targetComputer}`);
                            console.log(`🐛 DEBUG: Has sub-targeting: ${targetComputer ? targetComputer.hasSubTargeting() : false}`);
                            console.log(`🐛 DEBUG: Current sub-target: ${targetComputer?.currentSubTarget?.displayName || 'none'}`);
                            
                            // Check for active sub-targeting (must be valid target object, not null)
                            if (targetComputer && 
                                targetComputer.hasSubTargeting() && 
                                targetComputer.currentSubTarget && 
                                targetComputer.currentSubTarget !== null) {
                                
                                console.log(`🎯 SYSTEM: ${targetComputer.currentSubTarget.displayName} targeted with 30% damage bonus`);
                                
                                // Calculate enhanced damage for sub-targeting
                                const enhancedDamage = weapon.damage * 1.3; // 30% bonus
                                console.log(`💥 Enhanced damage: ${weapon.damage} → ${enhancedDamage.toFixed(1)} (+${(enhancedDamage - weapon.damage).toFixed(1)})`);
                                
                                // Apply enhanced damage to specific sub-target using systemName
                                if (enemyTarget.ship.applySubTargetDamage) {
                                    enemyTarget.ship.applySubTargetDamage(targetComputer.currentSubTarget.systemName, enhancedDamage, 'energy');
                                    console.log(`🎯 Applied ${enhancedDamage.toFixed(1)} damage directly to ${targetComputer.currentSubTarget.displayName}`);
                                    
                                    // Check if target was destroyed by sub-target damage
                                    if (enemyTarget.ship.currentHull <= 0) {
                                        console.log(`🔥 ${enemyTarget.ship.shipName || 'Enemy ship'} DESTROYED by collateral damage!`);
                                        
                                        // Play success sound for ship destruction (full duration)
                                        if (ship?.weaponEffectsManager) {
                                            ship.weaponEffectsManager.playSuccessSound(null, 0.8); // Full duration, 80% volume
                                            console.log(`🎉 Playing ship destruction success sound (full duration)`);
                                        }
                                        
                                        this.starfieldManager.removeDestroyedTarget(enemyTarget.ship);
                                    }
                                } else {
                                    // Fallback: apply enhanced damage to hull
                                    console.warn('Ship has no applySubTargetDamage method, applying to hull with bonus');
                                    enemyTarget.ship.applyDamage(enhancedDamage, 'energy');
                                    console.log(`💥 Enhanced hull hit: ${enemyTarget.ship.shipName || 'Enemy ship'} for ${enhancedDamage.toFixed(1)} damage - hull: ${enemyTarget.ship.currentHull}/${enemyTarget.ship.maxHull}`);
                                }
                                
                                // Update sub-target system display if available
                                if (targetComputer.currentSubTarget && enemyTarget.ship.getSystem) {
                                    const subTargetSystem = enemyTarget.ship.getSystem(targetComputer.currentSubTarget.systemName);
                                    if (subTargetSystem && subTargetSystem.health !== undefined) {
                                        const healthPercent = (subTargetSystem.health * 100).toFixed(1);
                                        console.log(`🎯 Sub-target system ${targetComputer.currentSubTarget.displayName} health: ${healthPercent}%`);
                                    }
                                }
                                
                            } else {
                                // No sub-targeting - apply normal damage
                                console.log(`🐛 DEBUG: No sub-targeting - applying normal damage`);
                                enemyTarget.ship.applyDamage(weapon.damage, 'energy');
                                console.log(`💥 Normal hit: ${enemyTarget.ship.shipName || 'Enemy ship'} for ${weapon.damage} damage - hull: ${enemyTarget.ship.currentHull}/${enemyTarget.ship.maxHull}`);
                                
                                // Check if target was destroyed
                                if (enemyTarget.ship.currentHull <= 0) {
                                    console.log(`🔥 ${enemyTarget.ship.shipName || 'Enemy ship'} DESTROYED!`);
                                    
                                    // Play success sound for ship destruction (full duration)
                                    if (ship?.weaponEffectsManager) {
                                        ship.weaponEffectsManager.playSuccessSound(null, 0.8); // Full duration, 80% volume
                                        console.log(`🎉 Playing ship destruction success sound (full duration)`);
                                    }
                                    
                                    this.starfieldManager.removeDestroyedTarget(enemyTarget.ship);
                                }
                            }
                        }
                        
                        hitTargets.push(enemyTarget);
                        anyHit = true;
                        
                        console.log('💥 Laser beam hit enemy ship at', targetHit.position, `with explosion radius ${explosionRadiusMeters}m`);
                    }
                }
                
                if (!anyHit) {
                    console.log('🎯 Laser beams missed all targets (no intersection along beam paths)');
                }
            }
            
        } else if (weapon.weaponType === 'splash-damage') {
            // For projectile weapons, the projectile will handle its own trail effects
            // The explosion will be handled when the projectile detonates
            console.log(`Projectile launched: ${weapon.name} (effects will be handled by projectile)`);
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
} 