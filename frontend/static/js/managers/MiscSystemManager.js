/**
 * MiscSystemManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles miscellaneous system operations and utility methods.
 *
 * Features:
 * - Solar system manager setup
 * - Proximity detector toggle
 * - Starfield recreation
 * - Target refresh
 * - Damage control flagging
 * - Status icon updates
 */

import { debug } from '../debug.js';

export class MiscSystemManager {
    /**
     * Create a MiscSystemManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
    }

    /**
     * Set the solar system manager reference
     * @param {Object} manager - SolarSystemManager instance
     */
    setSolarSystemManager(manager) {
        this.sfm.solarSystemManager = manager;
        // Update target computer manager with new solar system manager
        if (this.sfm.targetComputerManager) {
            this.sfm.targetComputerManager.solarSystemManager = manager;
        }
    }

    /**
     * Toggle proximity detector display
     * @returns {boolean} Success status
     */
    toggleProximityDetector() {
        if (this.sfm.proximityDetector3D) {
            // The proximity detector will handle its own validation
            const success = this.sfm.proximityDetector3D.toggle();
            debug('UTILITY', 'StarfieldManager: 3D Proximity Detector toggle result:', success);
            return success;
        }
        return false;
    }

    /**
     * Recreate the starfield with current density settings
     */
    recreateStarfield() {
        // Update starfield renderer's star count and recreate
        this.sfm.starfieldRenderer.setStarCount(this.sfm.starCount);
        this.sfm.starfield = this.sfm.starfieldRenderer.getStarfield();
    }

    /**
     * Refresh the current target and its wireframe
     */
    refreshCurrentTarget() {
        if (this.sfm.currentTarget && this.sfm.targetComputerEnabled) {
            // Update the wireframe display without cycling
            this.sfm.updateTargetDisplay();
        }
    }

    /**
     * Mark that damage control display needs updating
     */
    markDamageControlForUpdate() {
        this.sfm.shouldUpdateDamageControl = true;
    }

    /**
     * Update status icons for current target
     * @param {number} distance - Distance to target
     * @param {string} diplomacyColor - Color based on diplomacy status
     * @param {boolean} isEnemyShip - Whether target is an enemy
     * @param {Object} info - Additional target info
     */
    updateStatusIcons(distance, diplomacyColor, isEnemyShip, info) {
        // Delegate status icon updates to target computer manager
        this.sfm.targetComputerManager.updateStatusIcons(distance, diplomacyColor, isEnemyShip, info);

        // Update intel icon display
        this.sfm.updateIntelIconDisplay();
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.sfm = null;
    }
}
