/**
 * DestroyedTargetHandler
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Handles cleanup and re-selection when a targeted object is destroyed.
 *
 * Features:
 * - Detects if destroyed ship is currently targeted by any system
 * - Clears all targeting system references
 * - Updates target list to remove destroyed ship
 * - Smart target re-selection after destruction
 * - Handles UI cleanup when no targets remain
 */

import { debug } from '../debug.js';

export class DestroyedTargetHandler {
    /**
     * Create a DestroyedTargetHandler
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;
    }

    /**
     * Remove destroyed target from target list and automatically cycle to next target
     * @param {Object} destroyedShip - The ship that was destroyed
     */
    removeDestroyedTarget(destroyedShip) {
        if (!destroyedShip) {
            return;
        }

        debug('TARGETING', `💥 removeDestroyedTarget called for: ${destroyedShip.shipName || 'unknown ship'}`);

        // Get ship systems for proper cleanup
        const ship = this.tcm.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');

        // Check if the destroyed ship is currently targeted by any system
        const isCurrentTarget = this.tcm.currentTarget === destroyedShip;
        const isCurrentTargetData = this.tcm.getCurrentTargetData()?.ship === destroyedShip;
        const isWeaponTarget = ship?.weaponSystem?.lockedTarget === destroyedShip;
        const isTargetComputerTarget = targetComputer?.currentTarget === destroyedShip;

        const anySystemTargeting = isCurrentTarget || isCurrentTargetData || isWeaponTarget || isTargetComputerTarget;

        debug('TARGETING', `🔍 Checking targeting systems for destroyed ship: ${destroyedShip.shipName}`);
        debug('TARGETING', `   • Current target: ${isCurrentTarget}`);
        debug('TARGETING', `   • Current target data: ${isCurrentTargetData}`);
        debug('TARGETING', `   • Weapon system target: ${isWeaponTarget}`);
        debug('TARGETING', `   • Target computer target: ${isTargetComputerTarget}`);
        debug('TARGETING', `   • Any system targeting: ${anySystemTargeting}`);

        if (anySystemTargeting) {
            debug('TARGETING', 'Destroyed ship was targeted - performing full synchronization cleanup');

            // Store the previous target index for smart target selection
            const previousTargetIndex = this.tcm.targetIndex;

            // Clear ALL targeting system references
            this.tcm.currentTarget = null;
            this.tcm.targetIndex = -1;

            if (ship?.weaponSystem) {
                ship.weaponSystem.setLockedTarget(null);
            }

            if (targetComputer) {
                targetComputer.clearTarget();
                targetComputer.clearSubTarget();
            }

            // ALWAYS clear 3D outline when a targeted ship is destroyed
            this.tcm.clearTargetOutline();

            // Update target list to remove destroyed ship
            this.tcm.updateTargetList();

            // Smart target selection after destruction
            if (this.tcm.targetObjects && this.tcm.targetObjects.length > 0) {
                debug('TARGETING', `🔄 Selecting new target from ${this.tcm.targetObjects.length} available targets`);

                // Prevent outlines from appearing automatically after destruction
                if (this.tcm.viewManager?.starfieldManager) {
                    this.tcm.viewManager.starfieldManager.outlineDisabledUntilManualCycle = true;
                }

                // Smart target index selection - try to stay close to previous position
                let newTargetIndex = 0;
                if (previousTargetIndex >= 0 && previousTargetIndex < this.tcm.targetObjects.length) {
                    // Use the same index if still valid
                    newTargetIndex = previousTargetIndex;
                } else if (previousTargetIndex >= this.tcm.targetObjects.length) {
                    // If previous index is now beyond array bounds, use the last target
                    newTargetIndex = this.tcm.targetObjects.length - 1;
                }

                // Set the new target directly instead of cycling
                this.tcm.targetIndex = newTargetIndex;
                const targetData = this.tcm.targetObjects[this.tcm.targetIndex];
                this.tcm.currentTarget = targetData?.object || null;

                if (this.tcm.currentTarget) {
                    // Update UI for new target
                    this.tcm.updateTargetDisplay();
                    this.tcm.updateReticleTargetInfo();
                } else {
                    debug('P1', '❌ Failed to select valid target after destruction');
                    this.tcm.targetIndex = -1;
                }
            } else {
                debug('TARGETING', '📭 No targets remaining after destruction');

                // CRITICAL: Force clear outline again when no targets remain
                this.tcm.clearTargetOutline();

                // Clear wireframe and hide UI
                this.tcm.clearTargetWireframe();
                this.tcm.hideTargetHUD();
                this.tcm.hideTargetReticle();
            }
        } else {
            // Just update the target list without changing current target
            this.tcm.updateTargetList();
        }

        debug('TARGETING', `✅ removeDestroyedTarget complete for: ${destroyedShip.shipName || 'unknown ship'}`);
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // No resources to dispose
    }
}
