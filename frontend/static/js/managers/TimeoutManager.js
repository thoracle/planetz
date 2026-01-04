/**
 * TimeoutManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles timeout tracking and cleanup for proper disposal.
 *
 * Features:
 * - Track setTimeout IDs for cleanup on dispose
 * - Provide Promise-based delay utility
 * - Auto-cleanup of completed timeouts
 */

export class TimeoutManager {
    /**
     * Create a TimeoutManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
        this._pendingTimeouts = new Set();
    }

    /**
     * Wrapped setTimeout that tracks the timeout ID for cleanup on dispose
     * @param {Function} callback - The function to call after the delay
     * @param {number} delay - The delay in milliseconds
     * @returns {number} The timeout ID
     */
    setTimeout(callback, delay) {
        const id = setTimeout(() => {
            this._pendingTimeouts.delete(id);
            callback();
        }, delay);
        this._pendingTimeouts.add(id);
        return id;
    }

    /**
     * Promise-based delay utility
     * @param {number} ms - Delay in milliseconds
     * @returns {Promise} Resolves after the delay
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Clear all pending timeouts
     */
    clearAll() {
        this._pendingTimeouts.forEach(id => clearTimeout(id));
        this._pendingTimeouts.clear();
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.clearAll();
        this._pendingTimeouts = null;
        this.sfm = null;
    }
}
