/**
 * GlobalReferencesManager
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Handles setup and cleanup of global window references.
 *
 * Features:
 * - Manages window.starfieldManager reference
 * - Manages window.targetComputerManager reference
 * - Manages window.starfieldAudioManager reference
 * - Provides cleanup on disposal
 */

export class GlobalReferencesManager {
    /**
     * Create a GlobalReferencesManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
    }

    /**
     * Initialize all global references
     */
    initialize() {
        // Expose starfieldManager globally for button click handlers
        window.starfieldManager = this.sfm;

        // Expose target computer manager globally for waypoints integration
        if (this.sfm.targetComputerManager) {
            window.targetComputerManager = this.sfm.targetComputerManager;
        }
    }

    /**
     * Update audio manager reference (called after audio initialization)
     * @param {Object} audioManager - The audio manager instance
     */
    setAudioManagerReference(audioManager) {
        if (audioManager) {
            window.starfieldAudioManager = audioManager;
        }
    }

    /**
     * Dispose of all global references
     */
    dispose() {
        // Remove starfieldManager reference
        if (window.starfieldManager === this.sfm) {
            delete window.starfieldManager;
        }

        // Remove starfieldAudioManager reference
        if (this.sfm.audioManager && window.starfieldAudioManager === this.sfm.audioManager) {
            delete window.starfieldAudioManager;
        }

        // Remove targetComputerManager reference
        if (this.sfm.targetComputerManager && window.targetComputerManager === this.sfm.targetComputerManager) {
            delete window.targetComputerManager;
        }

        this.sfm = null;
    }
}
