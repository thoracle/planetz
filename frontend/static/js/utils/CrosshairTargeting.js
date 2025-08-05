/**
 * CrosshairTargeting - Shared targeting logic for both weapon systems and crosshair display
 * 
 * This utility class provides a single source of truth for all crosshair-based target detection,
 * ensuring that weapon firing logic and crosshair visual feedback use identical calculations.
 */
export class CrosshairTargeting {
    /**
     * Calculate distance-based aim tolerance
     * @param {number} targetDistance - Distance to target in kilometers
     * @returns {number} Aim tolerance in kilometers
     */
    static calculateAimTolerance(targetDistance) {
        // PRECISION CROSSHAIR TOLERANCE: Much tighter tolerance for accurate crosshair feedback
        // The crosshair should only show a target circle when genuinely aimed at the target,
        // not when broadly in the target's vicinity. This ensures missile direction matches crosshair feedback.
        //
        // Precision tolerances for crosshair accuracy:
        // Close range (<5km): 0.05km tolerance (tight precision for close combat)
        // Medium range (5-15km): 0.05-0.15km tolerance (reasonable for medium range)  
        // Long range (15km+): 0.15-0.3km tolerance (still challenging but fair)
        let aimToleranceKm;
        
        if (targetDistance < 5) {
            aimToleranceKm = 0.05; // 50m = 0.05km tolerance for close combat
        } else if (targetDistance < 15) {
            aimToleranceKm = 0.05 + (targetDistance - 5) * 0.01; // 0.05-0.15km for medium range
        } else {
            aimToleranceKm = 0.15 + Math.min((targetDistance - 15) * 0.01, 0.15); // 0.15-0.3km for long range
        }
        
        return aimToleranceKm;
    }
    
    /**
     * Check if player is currently moving and apply movement bonus to tolerance
     * @param {number} baseToleranceKm - Base aim tolerance in kilometers
     * @returns {number} Adjusted tolerance with movement bonus applied
     */
    static applyMovementBonus(baseToleranceKm) {
        const starfieldManager = window.starfieldManager;
        
        // Detect movement: linear movement OR rotational movement
        const isMoving = starfieldManager && (
            starfieldManager.currentSpeed > 0 || 
            (starfieldManager.rotationVelocity && 
             (Math.abs(starfieldManager.rotationVelocity.x) > 0.0001 || 
              Math.abs(starfieldManager.rotationVelocity.y) > 0.0001)));
        
        if (isMoving) {
            // BALANCED: Reasonable movement bonus for moving targets
            let movementMultiplier = 1.3; // Base 30% bonus for movement
            
            // For close range, give slightly more bonus due to higher difficulty
            if (baseToleranceKm < 0.3) {
                movementMultiplier = 1.4; // 40% bonus for close combat
            }
            
            const adjustedTolerance = baseToleranceKm * movementMultiplier;
            
            return adjustedTolerance;
        } else {
            // Static targeting - no bonus needed with realistic base tolerances
            return baseToleranceKm;
        }
    }
    
    /**
     * Set up raycaster for crosshair targeting
     * @param {THREE.Camera} camera - Camera for raycasting
     * @returns {THREE.Raycaster} Configured raycaster
     */
    static setupRaycaster(camera) {
        // Ensure camera matrix is up-to-date before raycasting
        camera.updateMatrixWorld(true);
        
        const raycaster = new window.THREE.Raycaster();
        
        // Get camera forward direction (where crosshairs are pointing)
        const aimDirection = new window.THREE.Vector3(0, 0, -1);
        aimDirection.applyQuaternion(camera.quaternion);
        
        // Set up raycaster from camera position in aim direction
        raycaster.set(camera.position, aimDirection);
        
        return raycaster;
    }
    
    /**
     * Find targets under crosshairs using distance-based tolerance
     * @param {Object} options - Configuration options
     * @param {THREE.Camera} options.camera - Camera for raycasting
     * @param {number} options.weaponRange - Weapon range in meters (for validation)
     * @param {boolean} options.enableDebugLogging - Whether to log debug information
     * @param {string} options.debugPrefix - Prefix for debug logs (e.g., weapon name)
     * @returns {Object} Targeting result with closest target information
     */
    static findCrosshairTargets(options) {
        const { camera, weaponRange, enableDebugLogging = false, debugPrefix = "TARGET" } = options;
        
        if (!window.starfieldManager?.dummyShipMeshes) {
            return { closestTarget: null, closestDistance: null, closestMesh: null };
        }
        
        const raycaster = this.setupRaycaster(camera);
        const currentWeaponRange = weaponRange; // Weapon range now in kilometers
        
        let closestEnemyDistance = null;
        let closestEnemyShip = null;
        let closestEnemyMesh = null;
        
        // Check all enemy ships - ALL must pass tolerance check
        const dummyShips = window.starfieldManager.dummyShipMeshes || [];
        
        for (const enemyMesh of dummyShips) {
            if (enemyMesh && enemyMesh.userData?.ship) {
                // Calculate distances
                const enemyPos = enemyMesh.position;
                const distanceToAimLineMeters = raycaster.ray.distanceToPoint(enemyPos); // In meters
                const distanceToAimLineKm = distanceToAimLineMeters / 1000; // Convert to km for comparison
                const targetDistanceMeters = camera.position.distanceTo(enemyPos);
                const targetDistance = targetDistanceMeters / 1000; // Convert to kilometers
                
                // Track distance calculations (debug logging removed for performance)
                
                // Calculate tolerance with distance scaling and movement bonus
                const baseToleranceKm = this.calculateAimTolerance(targetDistance);
                const aimToleranceKm = this.applyMovementBonus(baseToleranceKm);
                
                // Debug logging (reduced for performance)
                if (enableDebugLogging) {
                    // Only log if there are actual issues
                    if (distanceToAimLineKm > 1000) {
                        console.log(`🚨 AIM DEBUG ${debugPrefix}: Suspiciously large distance detected: ${distanceToAimLineKm.toFixed(1)}km - possible scale issue`);
                    }
                }
                
                // Check if target passes tolerance test (both in kilometers)
                if (distanceToAimLineKm <= aimToleranceKm) {
                    // Only consider if within extended range (4x weapon range)
                    if (targetDistance <= currentWeaponRange * 4) {
                        if (closestEnemyDistance === null || targetDistance < closestEnemyDistance) {
                            closestEnemyDistance = targetDistance;
                            closestEnemyShip = enemyMesh.userData.ship;
                            closestEnemyMesh = enemyMesh;
                        }
                    }
                }
            }
        }
        
        // Return targeting results
        return {
            closestTarget: closestEnemyShip,
            closestDistance: closestEnemyDistance,
            closestMesh: closestEnemyMesh,
            weaponRange: currentWeaponRange
        };
    }
    
    /**
     * Validate if target is within weapon range
     * @param {number} targetDistance - Distance to target in kilometers
     * @param {number} weaponRange - Weapon range in kilometers
     * @returns {Object} Range validation result
     */
    static validateRange(targetDistance, weaponRange) {
        if (targetDistance === null) {
            return { inRange: false, rangeState: 'none' };
        }
        
        const rangeRatio = targetDistance / weaponRange;
        
        if (rangeRatio <= 1.0) {
            return { inRange: true, rangeState: 'inRange', rangeRatio };
        } else if (rangeRatio <= 1.2) {
            return { inRange: false, rangeState: 'closeRange', rangeRatio };
        } else {
            return { inRange: false, rangeState: 'outRange', rangeRatio };
        }
    }
    
    /**
     * Get crosshair target for weapon firing (WeaponCard.js replacement)
     * @param {THREE.Camera} camera - Camera for raycasting
     * @param {number} weaponRange - Weapon range in meters
     * @param {string} weaponName - Weapon name for debug logging
     * @returns {Object|null} Target object if valid crosshair target found, null otherwise
     */
    static getCrosshairTarget(camera, weaponRange, weaponName = "WEAPON") {
        // Only enable debug logging for weapon firing, not crosshair display
        const isWeaponFiring = weaponName !== "crosshair_display";
        
        const result = this.findCrosshairTargets({
            camera,
            weaponRange,
            enableDebugLogging: isWeaponFiring,
            debugPrefix: weaponName
        });
        
        const { closestTarget, closestDistance, closestMesh, weaponRange: weaponRangeKm } = result;
        
        // Reduced logging: Only log target analysis for actual weapon firing and when targets are found
        // Removed continuous "no target" spam for better console readability
        
        // Validate target is within weapon range
        if (closestTarget && closestMesh && closestDistance !== null) {
            const rangeValidation = this.validateRange(closestDistance, weaponRangeKm);
            
            if (isWeaponFiring) {
                console.log(`🎯 ${weaponName}: Target analysis - Found target at ${closestDistance.toFixed(1)}km, range ratio: ${rangeValidation.rangeRatio?.toFixed(2)}, state: ${rangeValidation.rangeState}`);
            }
            
            if (rangeValidation.inRange) {
                if (isWeaponFiring) {
                    console.log(`🎯 ${weaponName}: Firing at validated crosshair target: ${closestTarget.name || 'target'} (${closestDistance.toFixed(1)}km)`);
                }
                // Return target with MESH position (not ship position)
                return {
                    ship: closestTarget,
                    position: {
                        x: closestMesh.position.x,
                        y: closestMesh.position.y,
                        z: closestMesh.position.z
                    },
                    distance: closestDistance,
                    name: closestTarget.name || 'target'
                };
            } else {
                if (isWeaponFiring) {
                    console.log(`🎯 ${weaponName}: Target out of range (${closestDistance.toFixed(1)}km > ${weaponRangeKm.toFixed(1)}km)`);
                }
            }
        } else if (isWeaponFiring) {
            // Only log "no target" when actually firing, not for crosshair display
            console.log(`🎯 ${weaponName}: No valid crosshair target - firing in camera direction (will check for miss on expiry)`);
        }
        return null; // No valid target under crosshairs
    }
    
    /**
     * Update crosshair display state (ViewManager.js replacement)
     * @param {THREE.Camera} camera - Camera for raycasting  
     * @param {number} weaponRange - Weapon range in meters
     * @returns {Object} Crosshair state for visual display
     */
    static updateCrosshairState(camera, weaponRange) {
        const result = this.findCrosshairTargets({
            camera,
            weaponRange,
            enableDebugLogging: false // ViewManager doesn't need debug spam
        });
        
        const { closestTarget, closestDistance, weaponRange: weaponRangeKm } = result;
        
        // Determine target state for crosshair display
        // IMPORTANT: Only show crosshair if target passes BOTH tolerance AND range validation
        // This ensures crosshair display matches weapon targeting logic exactly
        if (closestTarget && closestDistance !== null) {
            const rangeValidation = this.validateRange(closestDistance, weaponRangeKm);
            
            // FIXED: Only show crosshair target if it would actually be valid for weapon firing
            // This prevents "target circle shows up when it should not" issue
            if (rangeValidation.inRange) {
                return {
                    targetState: 'inRange', // Force to inRange since we only show valid targets
                    targetShip: closestTarget,
                    targetDistance: closestDistance,
                    rangeRatio: rangeValidation.rangeRatio
                };
            } else {
                // Target passes tolerance but fails range - show as close/out of range indicator
                return {
                    targetState: rangeValidation.rangeState, // 'closeRange' or 'outRange'
                    targetShip: closestTarget,
                    targetDistance: closestDistance,
                    rangeRatio: rangeValidation.rangeRatio
                };
            }
        }
        
        return {
            targetState: 'none',
            targetShip: null,
            targetDistance: null,
            rangeRatio: null
        };
    }
}