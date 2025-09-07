import { debug } from '../debug.js';

/**
 * TargetingService - Unified targeting system for crosshair display and weapon firing
 * 
 * This service provides a single source of truth for all targeting operations:
 * - Crosshair target detection and display
 * - Weapon firing target acquisition
 * - Range validation and tolerance calculations
 * - Fallback targeting strategies
 * 
 * Benefits:
 * - Eliminates duplicate targeting logic
 * - Ensures crosshair and weapon targeting are always synchronized
 * - Centralized tolerance and range calculations
 * - Consistent fallback behavior across all systems
 */

import { CrosshairTargeting } from '../utils/CrosshairTargeting.js';

export class TargetingService {
    constructor() {
        this.lastTargetUpdate = 0;
        this.targetUpdateInterval = 50; // Update every 50ms for smooth targeting
        this.cachedTargetResult = null;
        this.lastWeaponRange = null;
        this.lastCameraPosition = null;
        
        // Targeting configuration
        this.config = {
            // Fallback targeting settings
            fallbackEnabled: true,
            fallbackRangeMultiplier: 1.5, // Search within 1.5x weapon range
            
            // Cache settings
            enableCaching: true,
            cacheValidityMs: 50,
            
            // Debug settings
            enableDebugLogging: false
        };
    }

    /**
     * Get current targeting result for both crosshair display and weapon firing
     * This is the main method that replaces all scattered targeting logic
     * 
     * @param {Object} options - Targeting options
     * @param {THREE.Camera} options.camera - Camera for raycasting
     * @param {number} options.weaponRange - Current weapon range in meters
     * @param {string} options.requestedBy - Who is requesting targeting ('weapon', 'crosshair', 'debug')
     * @param {boolean} options.enableFallback - Enable fallback targeting if crosshair fails
     * @returns {Object} Unified targeting result
     */
    getCurrentTarget(options) {
        const { camera, weaponRange, requestedBy = 'unknown', enableFallback = true } = options;
        
        if (!camera || !weaponRange) {
            return this.createEmptyTargetResult('missing_camera_or_range');
        }

        // Check cache validity to avoid redundant calculations
        if (this.isCacheValid(camera, weaponRange)) {
                    // Using cached result
            return this.cachedTargetResult;
        }

        // Perform fresh targeting calculation
        const targetResult = this.calculateTargeting(camera, weaponRange, enableFallback, requestedBy);
        
        // Update cache
        this.updateCache(targetResult, camera, weaponRange);
        
        return targetResult;
    }

    /**
     * Calculate targeting result using unified logic
     * @private
     */
    calculateTargeting(camera, weaponRange, enableFallback, requestedBy) {
        const startTime = performance.now();
        
        // Step 1: Try crosshair targeting (primary method)
        const crosshairTarget = this.getCrosshairTarget(camera, weaponRange, requestedBy);
        
        if (crosshairTarget) {
            const result = this.createTargetResult(crosshairTarget, 'crosshair', weaponRange);
            this.logTargetingResult(result, startTime, requestedBy);
            return result;
        }
        
        // Step 2: Try fallback targeting if enabled
        if (enableFallback) {
            const fallbackTarget = this.getFallbackTarget(camera, weaponRange, requestedBy);
            
            if (fallbackTarget) {
                const result = this.createTargetResult(fallbackTarget, 'fallback', weaponRange);
                this.logTargetingResult(result, startTime, requestedBy);
                return result;
            }
        }
        
        // Step 3: No target found
        const result = this.createEmptyTargetResult('no_target_found');
        this.logTargetingResult(result, startTime, requestedBy);
        return result;
    }

    /**
     * Get crosshair target using existing CrosshairTargeting utility
     * @private
     */
    getCrosshairTarget(camera, weaponRange, requestedBy) {
        try {
            return CrosshairTargeting.getCrosshairTarget(camera, weaponRange, requestedBy);
        } catch (error) {
            console.warn(`🎯 TARGETING: Crosshair targeting failed for ${requestedBy}:`, error);
            return null;
        }
    }

    /**
     * Get fallback target when crosshair targeting fails
     * @private
     */
    getFallbackTarget(camera, weaponRange, requestedBy) {
        if (!window.starfieldManager?.dummyShipMeshes) {
            return null;
        }
        
        // DISABLED: Fallback targeting disabled for weapon firing to ensure crosshair precision
        // Weapons should only fire when crosshair targeting succeeds, not fall back to nearest target
        if (requestedBy && requestedBy.includes('Missile')) {
            return null;
        }
        
        const maxRangeMeters = weaponRange * this.config.fallbackRangeMultiplier; // Keep in meters
        const dummyShips = window.starfieldManager.dummyShipMeshes;
        
        let nearestDistance = Infinity;
        let nearestTarget = null;
        
        for (const enemyMesh of dummyShips) {
            if (enemyMesh && enemyMesh.position && enemyMesh.userData?.ship) {
                const distanceMeters = camera.position.distanceTo(enemyMesh.position);
                
                if (distanceMeters < nearestDistance && distanceMeters <= maxRangeMeters) {
                    nearestDistance = distanceMeters;
                    nearestTarget = {
                        ship: enemyMesh.userData.ship,
                        position: {
                            x: enemyMesh.position.x,
                            y: enemyMesh.position.y,
                            z: enemyMesh.position.z
                        },
                        distance: distanceMeters,
                        name: enemyMesh.userData.ship.shipName || 'Enemy Ship',
                        mesh: enemyMesh
                    };
                }
            }
        }
        
        // Fallback target found
        
        return nearestTarget;
    }

    /**
     * Create standardized target result object
     * @private
     */
    createTargetResult(target, acquisitionMethod, weaponRange) {
        const rangeValidation = CrosshairTargeting.validateRange(target.distance, weaponRange);
        
        return {
            // Target information
            hasTarget: true,
            target: target,
            targetName: target.name,
            targetDistance: target.distance,
            targetPosition: target.position,
            targetShip: target.ship,
            targetMesh: target.mesh,
            
            // Acquisition information
            acquisitionMethod: acquisitionMethod, // 'crosshair', 'fallback'
            acquisitionTime: Date.now(),
            
            // Range validation
            inRange: rangeValidation.inRange,
            rangeState: rangeValidation.rangeState,
            rangeRatio: rangeValidation.rangeRatio,
            weaponRange: weaponRange,
            
            // Crosshair display state
            crosshairState: rangeValidation.inRange ? 'inRange' : rangeValidation.rangeState,
            
            // Weapon firing state
            canFire: rangeValidation.inRange,
            
            // Metadata
            reason: `target_acquired_via_${acquisitionMethod}`
        };
    }

    /**
     * Create empty result when no target is found
     * @private
     */
    createEmptyTargetResult(reason) {
        return {
            // Target information
            hasTarget: false,
            target: null,
            targetName: null,
            targetDistance: null,
            targetPosition: null,
            targetShip: null,
            targetMesh: null,
            
            // Acquisition information
            acquisitionMethod: 'none',
            acquisitionTime: Date.now(),
            
            // Range validation
            inRange: false,
            rangeState: 'none',
            rangeRatio: null,
            weaponRange: null,
            
            // Crosshair display state
            crosshairState: 'none',
            
            // Weapon firing state
            canFire: false,
            
            // Metadata
            reason: reason
        };
    }

    /**
     * Check if cached result is still valid
     * @private
     */
    isCacheValid(camera, weaponRange) {
        if (!this.config.enableCaching || !this.cachedTargetResult) {
            return false;
        }
        
        const now = Date.now();
        const cacheAge = now - this.lastTargetUpdate;
        
        if (cacheAge > this.config.cacheValidityMs) {
            return false;
        }
        
        // Check if camera position or weapon range changed significantly
        if (this.lastCameraPosition && this.lastWeaponRange) {
            const positionDelta = camera.position.distanceTo(this.lastCameraPosition);
            const rangeDelta = Math.abs(weaponRange - this.lastWeaponRange);
            
            // Invalidate cache if position moved >10m or weapon range changed
            if (positionDelta > 0.01 || rangeDelta > 100) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Update targeting cache
     * @private
     */
    updateCache(targetResult, camera, weaponRange) {
        if (!this.config.enableCaching) return;
        
        this.cachedTargetResult = targetResult;
        this.lastTargetUpdate = Date.now();
        this.lastWeaponRange = weaponRange;
        this.lastCameraPosition = camera.position.clone();
    }

    /**
     * Clear targeting cache (useful when targets are spawned/removed)
     * @public
     */
    clearCache() {
        this.cachedTargetResult = null;
        this.lastTargetUpdate = 0;
        this.lastCameraPosition = null;
        this.lastWeaponRange = null;
    }

    /**
     * Log targeting result for debugging
     * @private
     */
    logTargetingResult(result, startTime, requestedBy) {
        if (!this.config.enableDebugLogging) return;
        
        const duration = (performance.now() - startTime).toFixed(2);
        
        // Targeting result logging reduced for cleaner console
        // Only log targeting failures and successes for weapon firing (not crosshair display)
        if (requestedBy !== "crosshair_display") {
            if (result.hasTarget) {
debug('TARGETING', `🎯 TARGETING SUCCESS [${requestedBy}]: ${result.targetName} via ${result.acquisitionMethod} (${result.targetDistance.toFixed(1)}km, ${result.rangeState}) [${duration}ms]`);
            } else {
debug('P1', `🎯 TARGETING FAILED [${requestedBy}]: ${result.reason} [${duration}ms]`);
            }
        }
    }

    /**
     * Enable/disable debug logging
     */
    setDebugLogging(enabled) {
        this.config.enableDebugLogging = enabled;
    }

    /**
     * Configure targeting parameters
     */
    configure(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Clear targeting cache (useful when game state changes)
     */
    clearCache() {
        this.cachedTargetResult = null;
        this.lastTargetUpdate = 0;
        this.lastCameraPosition = null;
        this.lastWeaponRange = null;
    }

    /**
     * Get targeting statistics for debugging
     */
    getStats() {
        return {
            cacheAge: this.lastTargetUpdate ? Date.now() - this.lastTargetUpdate : null,
            hasCache: !!this.cachedTargetResult,
            lastTarget: this.cachedTargetResult?.targetName || 'none',
            config: { ...this.config }
        };
    }
}

// Create singleton instance
export const targetingService = new TargetingService();

// Global access for debugging
if (typeof window !== 'undefined') {
    window.targetingService = targetingService;
}