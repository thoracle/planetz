/**
 * TargetValidationManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles target validation and sub-target updates during game loop.
 *
 * Features:
 * - Validates current target is still valid
 * - Updates sub-targets for targeting computer
 * - Clears invalid targets
 * - Manages outline updates with throttling
 * - Handles direction arrow updates
 */

import { debug } from '../debug.js';

export class TargetValidationManager {
    /**
     * Create a TargetValidationManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
        this.lastOutlineUpdate = 0;
    }

    /**
     * Update target computer state during game loop
     * Handles target display, validation, outlines, and direction arrows
     * @param {number} deltaTime - Time since last frame
     */
    updateTargetingState(deltaTime) {
        // Update target display whenever target computer is enabled
        if (this.sfm.targetComputerEnabled) {
            this.sfm.updateTargetDisplay();

            // If we have a current target, verify it's still valid and update sub-targets
            if (this.sfm.currentTarget) {
                this.validateAndUpdateSubTargets();
            }
        }

        // Update target computer manager (handles wireframe rendering, reticles, etc.)
        if (this.sfm.targetComputerEnabled) {
            this.sfm.targetComputerManager.update(deltaTime);
        }

        // Update 3D world outline if target computer is enabled and we have a target
        this.updateOutlineThrottled(deltaTime);

        // Update direction arrows
        this.updateDirectionArrows();
    }

    /**
     * Verify current target is still valid and update sub-targets
     */
    validateAndUpdateSubTargets() {
        const targetData = this.sfm.getCurrentTargetData();
        if (targetData && targetData.object === this.sfm.currentTarget) {
            // Update sub-targets for targeting computer if it has sub-targeting capability
            const ship = this.sfm.viewManager?.getShip();
            const targetComputer = ship?.getSystem('target_computer');
            if (targetComputer && targetComputer.hasSubTargeting()) {
                // Update sub-targets periodically (this is handled in TargetComputer.update)
                // but we need to refresh the display when sub-targets change
                targetComputer.updateSubTargets();
            }
        } else {
            // Target mismatch, clear current target
            this.sfm.currentTarget = null;
            this.sfm.targetIndex = -1;
        }
    }

    /**
     * Update 3D world outline with throttling (max 10 FPS)
     * @param {number} deltaTime - Time since last frame
     */
    updateOutlineThrottled(deltaTime) {
        if (this.sfm.targetComputerEnabled && this.sfm.currentTarget && this.sfm.outlineEnabled) {
            const now = Date.now();
            if (now - this.lastOutlineUpdate > 100) {
                this.sfm.updateTargetOutline(this.sfm.currentTarget, deltaTime);
                this.lastOutlineUpdate = now;
            }
        }
    }

    /**
     * Update direction arrows based on target state
     */
    updateDirectionArrows() {
        if (this.sfm.targetComputerManager) {
            // Sync the target computer enabled state only, not the current target
            this.sfm.targetComputerManager.targetComputerEnabled = this.sfm.targetComputerEnabled;

            if (this.sfm.targetComputerEnabled && this.sfm.currentTarget) {
                this.sfm.updateDirectionArrow();
            } else {
                // Hide all arrows - delegate to target computer manager
                this.sfm.targetComputerManager.hideAllDirectionArrows();
            }
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.sfm = null;
    }
}
