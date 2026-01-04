/**
 * DamageControlStateManager
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Manages damage control HUD visibility and update state.
 *
 * Features:
 * - Track damage control visibility state
 * - Track if damage control panel is open
 * - Control when damage control should be updated
 * - Weapon HUD connection state
 * - Debug mode state
 * - Outline update throttling
 */

export class DamageControlStateManager {
    /**
     * Create a DamageControlStateManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // Damage control visibility state
        this.damageControlVisible = false;
        this.isDamageControlOpen = false;
        this.shouldUpdateDamageControl = false;

        // Weapon HUD connection state
        this.weaponHUDConnected = false;

        // Debug mode for weapon hit detection (independent of damage control)
        this.debugMode = false; // Toggled with Ctrl-O

        // Target outline throttling
        this.lastOutlineUpdate = 0;

        // Previous target tracking for intel dismissal
        this.previousTarget = null;
    }

    /**
     * Open damage control panel
     */
    openDamageControl() {
        this.isDamageControlOpen = true;
        this.damageControlVisible = true;
        this.shouldUpdateDamageControl = true;
    }

    /**
     * Close damage control panel
     */
    closeDamageControl() {
        this.isDamageControlOpen = false;
        this.damageControlVisible = false;
    }

    /**
     * Toggle damage control panel
     * @returns {boolean} New open state
     */
    toggleDamageControl() {
        if (this.isDamageControlOpen) {
            this.closeDamageControl();
        } else {
            this.openDamageControl();
        }
        return this.isDamageControlOpen;
    }

    /**
     * Mark that damage control needs updating
     */
    markForUpdate() {
        this.shouldUpdateDamageControl = true;
    }

    /**
     * Clear update flag after updating
     */
    clearUpdateFlag() {
        this.shouldUpdateDamageControl = false;
    }

    /**
     * Toggle debug mode
     * @returns {boolean} New debug mode state
     */
    toggleDebugMode() {
        this.debugMode = !this.debugMode;
        return this.debugMode;
    }

    /**
     * Check if outline update is due based on throttling
     * @param {number} currentTime - Current timestamp
     * @param {number} throttleMs - Throttle interval in milliseconds
     * @returns {boolean} True if update should occur
     */
    isOutlineUpdateDue(currentTime, throttleMs = 100) {
        return (currentTime - this.lastOutlineUpdate) >= throttleMs;
    }

    /**
     * Update last outline update time
     * @param {number} currentTime - Current timestamp
     */
    updateOutlineTime(currentTime) {
        this.lastOutlineUpdate = currentTime;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.previousTarget = null;
        this.sfm = null;
    }
}
