/**
 * TargetComputerToggle
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Handles the toggle logic for turning the target computer on/off.
 *
 * Features:
 * - Toggle target computer between active/inactive states
 * - Handle ship system validation
 * - Show power-up animation on activation
 * - Auto-select first target after activation
 * - Sync state with StarfieldManager
 * - Clean up resources on deactivation
 */

import { debug } from '../debug.js';

export class TargetComputerToggle {
    /**
     * Create a TargetComputerToggle
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;
    }

    /**
     * Toggle target computer on/off
     */
    toggleTargetComputer() {
        const ship = this.tcm.viewManager?.getShip();
        if (!ship) {
            debug('P1', 'No ship available for target computer control');
            return;
        }

        const targetComputer = ship.getSystem('target_computer');
        if (!targetComputer) {
            debug('P1', 'No target computer system found on ship');
            return;
        }

        // Toggle the target computer system
        if (targetComputer.isActive) {
            this.deactivate(targetComputer);
        } else {
            this.activate(ship, targetComputer);
        }
    }

    /**
     * Deactivate the target computer
     * @param {Object} targetComputer - The target computer system
     */
    deactivate(targetComputer) {
        // Clear target BEFORE deactivating the system
        if (targetComputer.setTarget) {
            targetComputer.setTarget(null);
        }
        targetComputer.deactivate();
        this.tcm.targetComputerEnabled = false;
        debug('TARGETING', 'Target computer deactivated');

        this.tcm.targetHUD.style.display = 'none';
        this.tcm.targetReticle.style.display = 'none';

        // Clear target info display to prevent "unknown target" flash
        this.tcm.targetInfoDisplay.innerHTML = '';

        // Clear current target to ensure clean reactivation
        this.tcm.currentTarget = null;
        this.tcm.targetIndex = -1;

        // Stop all monitoring when target computer is disabled
        this.tcm.stopNoTargetsMonitoring();
        this.tcm.stopRangeMonitoring();

        // Clear wireframe if it exists
        if (this.tcm.targetWireframe) {
            this.tcm.wireframeScene.remove(this.tcm.targetWireframe);
            this.tcm.targetWireframe.geometry.dispose();
            this.tcm.targetWireframe.material.dispose();
            this.tcm.targetWireframe = null;
        }

        // Clear 3D outline when target computer is disabled
        this.tcm.clearTargetOutline();
    }

    /**
     * Activate the target computer
     * @param {Object} ship - The player ship
     * @param {Object} targetComputer - The target computer system
     */
    activate(ship, targetComputer) {
        debug('TARGETING', 'Attempting to activate target computer...');
        debug('TARGETING', 'Target computer canActivate result:', targetComputer.canActivate ? targetComputer.canActivate() : 'canActivate method not available');
        debug('TARGETING', 'Target computer isOperational result:', targetComputer.isOperational ? targetComputer.isOperational() : 'isOperational method not available');

        if (targetComputer.activate(ship)) {
            this.tcm.targetComputerEnabled = true;
            debug('TARGETING', 'Target computer activated successfully');
        } else {
            this.tcm.targetComputerEnabled = false;
            debug('P1', 'Failed to activate target computer - check system status and energy');
            debug('TARGETING', `Target computer activation failed. isActive: ${targetComputer.isActive}, health: ${targetComputer.healthPercentage}, state: ${targetComputer.state}`);
            return;
        }

        // Show the HUD immediately when target computer is enabled
        this.tcm.targetHUD.style.display = 'block';

        // Show "Powering up" animation while initializing
        this.tcm.showPowerUpAnimation();

        this.tcm.updateTargetList();

        // Use a longer delay to allow for power-up animation and target initialization
        setTimeout(() => {
            this.completeActivation();
        }, 800); // Longer delay for power-up animation (0.8 seconds)
    }

    /**
     * Complete the activation process after power-up animation
     */
    completeActivation() {
        // Hide the power-up animation
        this.tcm.hidePowerUpAnimation();

        // Only auto-select target if no manual selection exists
        if (!this.tcm.preventTargetChanges) {
            this.tcm.targetIndex = -1;
            if (this.tcm.targetObjects.length > 0) {
                // Call cycleTarget directly and then sync with StarfieldManager
                this.tcm.cycleTarget(); // Auto-select first target

                // Stop no targets monitoring since we have a target
                this.tcm.stopNoTargetsMonitoring();

                // Play audio feedback for target acquisition on startup
                this.tcm.playAudio('frontend/static/audio/blurb.mp3');

                // Start monitoring the selected target's range
                this.tcm.startRangeMonitoring();

                // Manually sync with StarfieldManager to ensure UI updates
                if (this.tcm.viewManager?.starfieldManager) {
                    this.tcm.viewManager.starfieldManager.currentTarget = this.tcm.currentTarget?.object || this.tcm.currentTarget;
                    this.tcm.viewManager.starfieldManager.targetIndex = this.tcm.targetIndex;
                    this.tcm.viewManager.starfieldManager.targetObjects = this.tcm.targetObjects;

                    // Update 3D outline for automatic cycle (if enabled)
                    if (this.tcm.currentTarget && this.tcm.viewManager.starfieldManager.outlineEnabled &&
                        !this.tcm.viewManager.starfieldManager.outlineDisabledUntilManualCycle) {
                        this.tcm.viewManager.starfieldManager.updateTargetOutline(this.tcm.currentTarget?.object || this.tcm.currentTarget, 0);
                    }
                }

                // Force direction arrow update when target changes
                this.tcm.updateDirectionArrow();

            } else {
                this.tcm.showNoTargetsDisplay(); // Show special "No targets in range" display
            }
        } else {
            // Preserve existing selection without blocking future manual cycling
            this.tcm.updateTargetDisplay();
        }
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // No resources to dispose
    }
}
