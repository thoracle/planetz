/**
 * TargetStateManager
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Manages target computer state and related tracking variables.
 *
 * Features:
 * - Target computer enabled/disabled state
 * - Current target tracking
 * - Target list management
 * - Sorting state for target list
 * - Arrow state tracking
 * - Button state logging throttling
 */

import { TARGETING_TIMING } from '../constants/TargetingConstants.js';

export class TargetStateManager {
    /**
     * Create a TargetStateManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // Target computer state
        this.targetComputerEnabled = false;
        this.currentTarget = null;
        this.targetIndex = -1;
        this.targetObjects = [];
        this.targetWireframe = null;
        this.targetReticle = null;

        // Sorting state
        this.lastSortTime = 0;
        this.sortInterval = TARGETING_TIMING.SORT_INTERVAL_MS;

        // Arrow state tracking
        this.lastArrowState = null;

        // Button state logging throttling
        this.lastButtonStateLog = null;
    }

    /**
     * Reset target state to defaults
     */
    reset() {
        this.targetComputerEnabled = false;
        this.currentTarget = null;
        this.targetIndex = -1;
        this.targetObjects = [];
        this.targetWireframe = null;
        this.targetReticle = null;
        this.lastSortTime = 0;
        this.lastArrowState = null;
        this.lastButtonStateLog = null;
    }

    /**
     * Check if sorting is due based on interval
     * @param {number} currentTime - Current timestamp
     * @returns {boolean} True if sorting should occur
     */
    isSortDue(currentTime) {
        return (currentTime - this.lastSortTime) >= this.sortInterval;
    }

    /**
     * Update last sort time
     * @param {number} currentTime - Current timestamp
     */
    updateSortTime(currentTime) {
        this.lastSortTime = currentTime;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.reset();
        this.sfm = null;
    }
}
