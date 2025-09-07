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
     * @param {string} mode - 'crosshair' for display, 'weapon' for firing
     * @returns {number} Aim tolerance in kilometers
     */
    static calculateAimTolerance(targetDistance, mode = 'weapon') {
        // targetDistance is in kilometers
        let aimToleranceKm;
        if (mode === 'crosshair') {
            // More permissive to show valid-circle when aim is reasonably close
            if (targetDistance < 10) {
                aimToleranceKm = 0.020; // 20 m base at close range
            } else if (targetDistance < 20) {
                aimToleranceKm = 0.020 + (targetDistance - 10) * 0.0020; // up to ~40 m at 20 km
            } else {
                aimToleranceKm = 0.040 + Math.min((targetDistance - 20) * 0.0010, 0.020); // cap ~60 m
            }
        } else {
            // SIMPLIFIED: No tolerance system - physics raycast handles all hit detection
            // This is kept for compatibility but not used in combat
            aimToleranceKm = 0.001; // Minimal tolerance for legacy systems
        }
        return aimToleranceKm;
    }
    
    static applyMovementBonus(baseToleranceKm) {
        const starfieldManager = window.starfieldManager;
        const isMoving = starfieldManager && (
            starfieldManager.currentSpeed > 0 || 
            (starfieldManager.rotationVelocity && 
             (Math.abs(starfieldManager.rotationVelocity.x) > 0.0001 || 
              Math.abs(starfieldManager.rotationVelocity.y) > 0.0001)));
        
        if (isMoving) {
            let movementMultiplier = 1.1; 
            if (baseToleranceKm < 0.01) {
                movementMultiplier = 1.15; 
            }
            return baseToleranceKm * movementMultiplier;
        } else {
            return baseToleranceKm;
        }
    }
    
    /**
     * Set up raycaster for crosshair targeting
     * @param {THREE.Camera} camera - Camera for raycasting
     * @returns {THREE.Raycaster} Configured raycaster
     */
    static setupRaycaster(camera) {
        camera.updateMatrixWorld(true);
        const raycaster = new window.THREE.Raycaster();
        const aimDirection = new window.THREE.Vector3(0, 0, -1);
        aimDirection.applyQuaternion(camera.quaternion).normalize();
        raycaster.set(camera.position, aimDirection);
        return raycaster;
    }
    
    static findCrosshairTargets(options) {
        const { camera, weaponRange, enableDebugLogging = false, debugPrefix = "TARGET", toleranceMode = 'weapon' } = options;
        
        if (!window.starfieldManager?.dummyShipMeshes) {
            return { closestTarget: null, closestDistance: null, closestMesh: null };
        }
        
        const raycaster = this.setupRaycaster(camera);
        const currentWeaponRange = weaponRange; 
        
        let closestEnemyDistance = null;
        let closestEnemyShip = null;
        let closestEnemyMesh = null;
        
        const dummyShips = window.starfieldManager.dummyShipMeshes || [];
        
        for (const enemyMesh of dummyShips) {
            if (enemyMesh && enemyMesh.userData?.ship) {
                const enemyPos = new window.THREE.Vector3();
                enemyMesh.getWorldPosition(enemyPos);
                const distanceToAimLineKm = raycaster.ray.distanceToPoint(enemyPos);
                const targetDistance = camera.position.distanceTo(enemyPos);
                
                const baseToleranceKm = this.calculateAimTolerance(targetDistance, toleranceMode);
                const aimToleranceKm = this.applyMovementBonus(baseToleranceKm);
                
                if (distanceToAimLineKm <= aimToleranceKm) {
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
        
        return {
            closestTarget: closestEnemyShip,
            closestDistance: closestEnemyDistance,
            closestMesh: closestEnemyMesh,
            weaponRange: currentWeaponRange
        };
    }
    
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
    
    static getCrosshairTarget(camera, weaponRange, weaponName = "WEAPON") {
        const isWeaponFiring = weaponName !== "crosshair_display";
        const toleranceMode = isWeaponFiring ? 'weapon' : 'crosshair';
        
        const result = this.findCrosshairTargets({
            camera,
            weaponRange,
            enableDebugLogging: isWeaponFiring,
            debugPrefix: weaponName,
            toleranceMode: toleranceMode
        });
        
        const { closestTarget, closestDistance, closestMesh, weaponRange: weaponRangeKm } = result;
        
        if (closestTarget && closestMesh && closestDistance !== null) {
            const rangeValidation = this.validateRange(closestDistance, weaponRangeKm);
            if (rangeValidation.inRange) {
                const worldPos = new window.THREE.Vector3();
                closestMesh.getWorldPosition(worldPos);
                return {
                    ship: closestTarget,
                    position: {
                        x: worldPos.x,
                        y: worldPos.y,
                        z: worldPos.z
                    },
                    distance: closestDistance,
                    name: closestTarget.name || 'target',
                    mesh: closestMesh
                };
            }
        }
        return null;
    }
    
    static updateCrosshairState(camera, weaponRange) {
        const result = this.findCrosshairTargets({
            camera,
            weaponRange,
            enableDebugLogging: false
        });
        
        const { closestTarget, closestDistance, weaponRange: weaponRangeKm } = result;
        
        if (closestTarget && closestDistance !== null) {
            const rangeValidation = this.validateRange(closestDistance, weaponRangeKm);
            if (rangeValidation.inRange) {
                return {
                    targetState: 'inRange',
                    targetShip: closestTarget,
                    targetDistance: closestDistance,
                    rangeRatio: rangeValidation.rangeRatio
                };
            } else {
                return {
                    targetState: rangeValidation.rangeState,
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