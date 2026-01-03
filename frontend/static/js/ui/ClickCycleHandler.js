/**
 * ClickCycleHandler
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Handles click-based target cycling on the HUD.
 *
 * Features:
 * - Cycle to previous/next target via HUD clicks
 * - Cycle to previous/next sub-target via HUD clicks
 * - Integrates with StarfieldManager for actual cycling
 * - Plays command sounds on target changes
 */

import { debug } from '../debug.js';

export class ClickCycleHandler {
    /**
     * Create a ClickCycleHandler
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;
    }

    /**
     * Cycle to previous target (same as SHIFT-TAB)
     */
    cycleToPreviousTarget() {
        if (this.tcm.viewManager?.starfieldManager) {
            this.tcm.viewManager.starfieldManager.cycleTarget(false); // false = backward/previous
            // Play the same sound as TAB key
            this.tcm.viewManager.starfieldManager.playCommandSound();
        }
    }

    /**
     * Cycle to next target (same as TAB)
     */
    cycleToNextTarget() {
        if (this.tcm.viewManager?.starfieldManager) {
            this.tcm.viewManager.starfieldManager.cycleTarget(true); // true = forward/next
            // Play the same sound as TAB key
            this.tcm.viewManager.starfieldManager.playCommandSound();
        }
    }

    /**
     * Cycle to previous sub-target (same as Z key)
     */
    cycleToPreviousSubTarget() {
        if (this.tcm.viewManager?.starfieldManager) {
            this.tcm.viewManager.starfieldManager.handleSubTargetingKey('previous');
        }
    }

    /**
     * Cycle to next sub-target (same as X key)
     */
    cycleToNextSubTarget() {
        if (this.tcm.viewManager?.starfieldManager) {
            this.tcm.viewManager.starfieldManager.handleSubTargetingKey('next');
        }
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // No resources to dispose
    }
}
