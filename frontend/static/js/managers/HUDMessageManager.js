/**
 * HUDMessageManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles ephemeral HUD message display for notifications, errors, and status updates.
 *
 * Features:
 * - Displays temporary messages with animated slide-in/slide-out effects
 * - Green terminal-style styling consistent with game UI
 * - Configurable display duration
 * - Integrates with ship's log for verbose mode
 * - Plays audio feedback for messages
 */

import { debug } from '../debug.js';

export class HUDMessageManager {
    /**
     * Create a HUDMessageManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
        this.hudEphemeralElement = null;
    }

    /**
     * Show a temporary ephemeral message in the HUD (errors, notifications, etc.)
     * @param {string} title - Message title
     * @param {string} message - Message content
     * @param {number} duration - Duration in milliseconds (default 5000)
     */
    showHUDEphemeral(title, message, duration = 5000) {
        // Log to ship's log if verbose mode is enabled
        if (window.shipLog && window.gameConfig?.verbose) {
            window.shipLog.addEphemeralEntry(title, message);
        }

        // Create ephemeral message element if it doesn't exist
        if (!this.hudEphemeralElement) {
            this.hudEphemeralElement = document.createElement('div');
            this.hudEphemeralElement.style.cssText = `
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.9);
                color: #00ff00;
                padding: 12px 20px;
                border: 2px solid #00ff00;
                border-radius: 0;
                font-family: "Courier New", monospace;
                font-size: 14px;
                font-weight: bold;
                text-align: center;
                z-index: 10000;
                box-shadow: 0 0 10px #00ff00, inset 0 0 10px rgba(0, 255, 0, 0.1);
                text-shadow: 0 0 5px #00ff00;
                min-width: 300px;
                max-width: 500px;
                display: none;
                animation: slideInFromTop 0.3s ease-out;
                letter-spacing: 1px;
            `;

            // Add animation keyframes
            if (!document.getElementById('hud-ephemeral-animations')) {
                const style = document.createElement('style');
                style.id = 'hud-ephemeral-animations';
                style.textContent = `
                    @keyframes slideInFromTop {
                        0% {
                            opacity: 0;
                            transform: translateX(-50%) translateY(-20px);
                        }
                        100% {
                            opacity: 1;
                            transform: translateX(-50%) translateY(0);
                        }
                    }

                    @keyframes slideOutToTop {
                        0% {
                            opacity: 1;
                            transform: translateX(-50%) translateY(0);
                        }
                        100% {
                            opacity: 0;
                            transform: translateX(-50%) translateY(-20px);
                        }
                    }
                `;
                document.head.appendChild(style);
            }

            document.body.appendChild(this.hudEphemeralElement);
        }

        // Set ephemeral message content with greenscreen terminal styling
        this.hudEphemeralElement.innerHTML = `
            <div style="
                font-size: 16px;
                margin-bottom: 6px;
                color: #00ff00;
                text-shadow: 0 0 8px #00ff00;
                letter-spacing: 2px;
                font-weight: bold;
            ">${title}</div>
            <div style="
                color: #00ff00;
                font-size: 12px;
                line-height: 1.3;
                text-shadow: 0 0 5px #00ff00;
                letter-spacing: 1px;
                opacity: 0.9;
            ">${message}</div>
        `;

        // Show the ephemeral message with animation
        this.hudEphemeralElement.style.display = 'block';
        this.hudEphemeralElement.style.animation = 'slideInFromTop 0.3s ease-out';

        // Hide after duration with animation
        this.sfm._setTimeout(() => {
            if (this.hudEphemeralElement) {
                this.hudEphemeralElement.style.animation = 'slideOutToTop 0.3s ease-in';
                this.sfm._setTimeout(() => {
                    if (this.hudEphemeralElement) {
                        this.hudEphemeralElement.style.display = 'none';
                    }
                }, 300);
            }
        }, duration);

        // Play error sound
        this.sfm.playCommandFailedSound();
    }

    /**
     * Show HUD error message (alias for showHUDEphemeral for backward compatibility)
     * @param {string} title - Error title
     * @param {string} message - Error message
     * @param {number} duration - Duration in milliseconds (default 3000)
     */
    showHUDError(title, message, duration = 3000) {
        // Delegate to showHUDEphemeral for consistent styling
        this.showHUDEphemeral(title, message, duration);
    }

    /**
     * Dispose of resources
     */
    dispose() {
        if (this.hudEphemeralElement && this.hudEphemeralElement.parentNode) {
            this.hudEphemeralElement.parentNode.removeChild(this.hudEphemeralElement);
        }
        this.hudEphemeralElement = null;
        this.sfm = null;
    }
}
