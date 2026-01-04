/**
 * TargetCyclingManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles target list updates, cycling, and scanner-based targeting.
 *
 * Features:
 * - Update target list from target computer manager
 * - Cycle through targets (forward/backward)
 * - Set targets from long-range scanner
 * - Sync local state with target computer manager
 * - Update weapon system locked target
 */

import { debug } from '../debug.js';

export class TargetCyclingManager {
    /**
     * Create a TargetCyclingManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
    }

    /**
     * Update target list from target computer manager
     */
    updateTargetList() {
        const targetBeforeUpdate = this.sfm.targetComputerManager.currentTarget;
        const indexBeforeUpdate = this.sfm.targetComputerManager.targetIndex;

        // Delegate to target computer manager
        this.sfm.targetComputerManager.updateTargetList();

        const targetAfterUpdate = this.sfm.targetComputerManager.currentTarget;
        const indexAfterUpdate = this.sfm.targetComputerManager.targetIndex;

        if (targetBeforeUpdate !== targetAfterUpdate || indexBeforeUpdate !== indexAfterUpdate) {
            debug('TARGETING', `🎯 WARNING: Target changed during updateTargetList!`);
            debug('TARGETING', `🎯   Before: target=${targetBeforeUpdate?.userData?.ship?.shipName || 'unknown'}, index=${indexBeforeUpdate}`);
            debug('TARGETING', `🎯   After: target=${targetAfterUpdate?.userData?.ship?.shipName || 'unknown'}, index=${indexAfterUpdate}`);
        }

        // Update local state to match
        this.sfm.targetObjects = this.sfm.targetComputerManager.targetObjects;
        this.sfm.targetIndex = this.sfm.targetComputerManager.targetIndex;
        this.sfm.currentTarget = this.sfm.targetComputerManager.currentTarget?.object || this.sfm.targetComputerManager.currentTarget;

        // Clear targeting cache when target list changes to prevent stale crosshair results
        if (window.targetingService) {
            window.targetingService.clearCache();
        }
    }

    /**
     * Cycle through targets
     * @param {boolean} forward - Direction to cycle (true = forward, false = backward)
     */
    cycleTarget(forward = true) {
        debug('TARGETING', `🎯 TargetCyclingManager.cycleTarget called (forward=${forward})`);

        if (!this.sfm.targetComputerManager) {
            debug('TARGETING', '🎯 ERROR: targetComputerManager is null/undefined');
            return;
        }
        if (!this.sfm.targetComputerManager.cycleTarget) {
            debug('TARGETING', '🎯 ERROR: targetComputerManager.cycleTarget method does not exist');
            return;
        }

        // Delegate to target computer manager
        debug('TARGETING', '🎯 TargetCyclingManager: Delegating to targetComputerManager.cycleTarget');
        this.sfm.targetComputerManager.cycleTarget(forward);
        debug('TARGETING', '🎯 TargetCyclingManager: Delegation complete');

        // Update local state to match
        this.sfm.currentTarget = this.sfm.targetComputerManager.currentTarget?.object || this.sfm.targetComputerManager.currentTarget;
        this.sfm.targetIndex = this.sfm.targetComputerManager.targetIndex;
        this.sfm.targetObjects = this.sfm.targetComputerManager.targetObjects;

        // DEBUG: Log target info for wireframe debugging
        this.sfm._setTimeout(() => {
            const currentTarget = this.sfm.targetComputerManager.currentTarget;
            debug('TARGETING', `Target object details: name=${currentTarget?.name}, id=${currentTarget?.id}, type=${currentTarget?.type}, hasObject=${!!currentTarget?.object}, objType=${currentTarget?.object?.type}, geometry=${currentTarget?.object?.geometry?.type}`);
        }, 100);

        // Update target display to reflect the new target in the UI
        if (this.sfm.targetComputerManager.updateTargetDisplay) {
            this.sfm.targetComputerManager.updateTargetDisplay();
        }

        // Handle outline suppression logic
        if (this.sfm.currentTarget && this.sfm.outlineEnabled && !this.sfm.outlineDisabledUntilManualCycle) {
            this.sfm.updateTargetOutline(this.sfm.currentTarget, 0);
        }

        // Update weapon system target
        const ship = this.sfm.viewManager?.getShip();
        if (ship && ship.weaponSystem) {
            ship.weaponSystem.setLockedTarget(this.sfm.currentTarget);
        }
    }

    /**
     * Set target from long-range scanner
     * @param {Object} targetData - Target data from long-range scanner
     */
    setTargetFromScanner(targetData) {
        // Delegate to target computer manager
        this.sfm.targetComputerManager.setTargetFromScanner(targetData);

        // Update local state to match
        this.sfm.currentTarget = this.sfm.targetComputerManager.currentTarget?.object || this.sfm.targetComputerManager.currentTarget;
        this.sfm.targetIndex = this.sfm.targetComputerManager.targetIndex;
        this.sfm.targetObjects = this.sfm.targetComputerManager.targetObjects;

        // Handle outline for scanner targets
        if (this.sfm.currentTarget && this.sfm.outlineEnabled) {
            this.sfm.updateTargetOutline(this.sfm.currentTarget, 0);
        }

        // Update weapon system target
        const ship = this.sfm.viewManager?.getShip();
        if (ship && ship.weaponSystem) {
            ship.weaponSystem.setLockedTarget(this.sfm.currentTarget);
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.sfm = null;
    }
}
