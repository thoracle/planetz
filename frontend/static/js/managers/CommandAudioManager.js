/**
 * CommandAudioManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles command feedback audio - success and failure beeps.
 *
 * Features:
 * - Generates success beeps (800Hz sine wave)
 * - Generates failure beeps (200Hz square wave)
 * - Ensures AudioContext is running (handles suspended state)
 * - Fallback beep generation when AudioManager unavailable
 */

import { debug } from '../debug.js';

export class CommandAudioManager {
    /**
     * Create a CommandAudioManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
    }

    /**
     * Ensure the audio context is running (resume if suspended)
     */
    ensureAudioContextRunning() {
        if (this.sfm.listener && this.sfm.listener.context) {
            if (this.sfm.listener.context.state === 'suspended') {
                this.sfm.listener.context.resume().catch(error => {
                    debug('P1', `Failed to resume AudioContext: ${error}`);
                });
            }
        }
    }

    /**
     * Play command success sound
     */
    playCommandSound() {
        // Delegate to audio manager
        if (this.sfm.audioManager) {
            this.sfm.audioManager.playCommandSound();
        } else {
            // Fallback if audio manager is not available
            this.generateCommandSuccessBeep();
        }
    }

    /**
     * Generate a success beep using Web Audio API
     */
    generateCommandSuccessBeep() {
        try {
            // Ensure AudioContext is running
            this.ensureAudioContextRunning();

            if (!this.sfm.listener || !this.sfm.listener.context) {
                debug('P1', 'No audio context available for command success beep');
                return;
            }

            const audioContext = this.sfm.listener.context;
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            // Connect oscillator to gain to destination
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Configure the beep - higher frequency for success
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // High frequency
            oscillator.type = 'sine'; // Smooth sine wave for pleasant sound

            // Configure volume envelope - quick attack, moderate decay
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01); // Quick attack
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15); // Moderate decay

            // Play the beep for 0.15 seconds
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);

        } catch (error) {
            debug('P1', `Failed to generate command success beep: ${error}`);
        }
    }

    /**
     * Play command failed sound
     */
    playCommandFailedSound() {
        // Delegate to audio manager
        if (this.sfm.audioManager) {
            this.sfm.audioManager.playCommandFailedSound();
        } else {
            // Fallback if audio manager is not available
            this.generateCommandFailedBeep();
        }
    }

    /**
     * Generate a failure beep using Web Audio API
     */
    generateCommandFailedBeep() {
        try {
            // Ensure AudioContext is running
            this.ensureAudioContextRunning();

            if (!this.sfm.listener || !this.sfm.listener.context) {
                debug('P1', 'No audio context available for command failed beep');
                return;
            }

            const audioContext = this.sfm.listener.context;
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            // Connect oscillator to gain to destination
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Configure the beep - lower frequency than success sound
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime); // Low frequency
            oscillator.type = 'square'; // Harsh square wave for error sound

            // Configure volume envelope - quick attack, quick decay
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01); // Quick attack
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2); // Quick decay

            // Play the beep for 0.2 seconds
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);

        } catch (error) {
            debug('P1', `Failed to generate command failed beep: ${error}`);
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.sfm = null;
    }
}
