/**
 * AudioInitManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles audio system initialization and engine sounds.
 *
 * Features:
 * - Initialize Three.js AudioListener
 * - Create and manage StarfieldAudioManager
 * - Set up global audio references
 * - Play engine startup/shutdown sounds
 */

import { debug } from '../debug.js';
import { StarfieldAudioManager } from '../views/StarfieldAudioManager.js';

export class AudioInitManager {
    /**
     * Create an AudioInitManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
        this.listener = null;
        this.audioManager = null;
    }

    /**
     * Initialize the audio system
     * Creates AudioListener, attaches to camera, creates StarfieldAudioManager
     * @returns {boolean} True if initialization was successful
     */
    initializeAudio() {
        const THREE = this.sfm.THREE;
        const camera = this.sfm.camera;

        if (!camera) {
            debug('P1', 'No camera available for audio listener');
            return false;
        }

        // Create audio listener
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);

        // Initialize audio manager
        this.audioManager = new StarfieldAudioManager(THREE, this.listener);

        // Store references on parent for backwards compatibility
        this.sfm.listener = this.listener;
        this.sfm.audioManager = this.audioManager;

        // Make audio manager globally accessible for other audio systems
        window.starfieldAudioManager = this.audioManager;

        return true;
    }

    /**
     * Play engine startup sound
     * @param {number} targetVolume - Optional target volume (unused, kept for API compatibility)
     */
    playEngineStartup(targetVolume) {
        if (this.audioManager) {
            this.audioManager.playEngineStartup();
        }
    }

    /**
     * Play engine shutdown sound
     */
    playEngineShutdown() {
        if (this.audioManager) {
            this.audioManager.playEngineShutdown();
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        if (this.listener && this.sfm.camera) {
            this.sfm.camera.remove(this.listener);
        }
        if (this.audioManager && typeof this.audioManager.dispose === 'function') {
            this.audioManager.dispose();
        }
        this.listener = null;
        this.audioManager = null;
        this.sfm = null;
    }
}
