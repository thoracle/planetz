/**
 * TargetingFeedbackManager
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Manages visual and audio feedback for the targeting system.
 *
 * Features:
 * - Power-up animation when target computer activates
 * - "No Targets" display when nothing is in range
 * - Audio feedback for targeting events
 * - Monitoring for targets entering/leaving range
 * - Temporary status messages
 */

import { debug } from '../debug.js';

export class TargetingFeedbackManager {
    /**
     * Create a TargetingFeedbackManager
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;

        // Power-up animation state
        this.isPoweringUp = false;

        // No targets monitoring state
        this.noTargetsInterval = null;
        this.isInNoTargetsMode = false;

        // Range monitoring state
        this.rangeMonitoringInterval = null;
        this.isRangeMonitoringActive = false;

        // Temporary "no targets" message timeout
        this.noTargetsTimeout = null;

        // Audio for targeting events (using HTML5 Audio for simplicity)
        this.audioElements = new Map();
    }

    /**
     * Show power-up animation when target computer first activates
     */
    showPowerUpAnimation() {
        this.isPoweringUp = true;
        const targetInfoDisplay = this.tcm.targetInfoDisplay;
        const statusIconsContainer = this.tcm.statusIconsContainer;
        const wireframeContainer = this.tcm.wireframeContainer;

        // Create or update power-up display
        targetInfoDisplay.innerHTML = `
            <div id="powerup-animation" style="
                background: linear-gradient(45deg, #001122, #002244, #001122);
                background-size: 200% 200%;
                color: #00ff41;
                padding: 20px;
                border-radius: 4px;
                text-align: center;
                border: 1px solid #00ff41;
                box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
                animation: powerUpPulse 0.8s ease-in-out infinite alternate,
                           powerUpGradient 2s ease-in-out infinite alternate;
                font-family: 'Orbitron', monospace;
            ">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">
                    TARGET COMPUTER
                </div>
                <div style="font-size: 12px; opacity: 0.8; margin-bottom: 12px;">
                    POWERING UP...
                </div>
                <div style="
                    display: flex;
                    justify-content: center;
                    gap: 4px;
                    align-items: center;
                ">
                    <div class="power-dot" style="
                        width: 8px;
                        height: 8px;
                        background: #00ff41;
                        border-radius: 50%;
                        animation: powerDot1 1.2s ease-in-out infinite;
                    "></div>
                    <div class="power-dot" style="
                        width: 8px;
                        height: 8px;
                        background: #00ff41;
                        border-radius: 50%;
                        animation: powerDot2 1.2s ease-in-out infinite;
                    "></div>
                    <div class="power-dot" style="
                        width: 8px;
                        height: 8px;
                        background: #00ff41;
                        border-radius: 50%;
                        animation: powerDot3 1.2s ease-in-out infinite;
                    "></div>
                </div>
            </div>
        `;
        // Hide service icons while powering up (no valid target yet)
        if (statusIconsContainer) {
            statusIconsContainer.style.display = 'none';
        }

        // Add CSS animations if not already present
        if (!document.getElementById('target-computer-powerup-styles')) {
            const style = document.createElement('style');
            style.id = 'target-computer-powerup-styles';
            style.textContent = `
                @keyframes powerUpPulse {
                    0% {
                        box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
                        border-color: #00ff41;
                    }
                    100% {
                        box-shadow: 0 0 30px rgba(0, 255, 65, 0.6);
                        border-color: #33ff66;
                    }
                }

                @keyframes powerUpGradient {
                    0% { background-position: 0% 50%; }
                    100% { background-position: 100% 50%; }
                }

                @keyframes powerDot1 {
                    0%, 60%, 100% { opacity: 0.3; transform: scale(0.8); }
                    30% { opacity: 1; transform: scale(1.2); }
                }

                @keyframes powerDot2 {
                    0%, 30%, 90%, 100% { opacity: 0.3; transform: scale(0.8); }
                    60% { opacity: 1; transform: scale(1.2); }
                }

                @keyframes powerDot3 {
                    0%, 90%, 100% { opacity: 0.3; transform: scale(0.8); }
                    90% { opacity: 1; transform: scale(1.2); }
                }
            `;
            document.head.appendChild(style);
        }

        // Hide wireframe during power-up
        if (wireframeContainer) {
            wireframeContainer.style.opacity = '0.3';
        }

        // Hide reticle during power-up
        this.tcm.hideTargetReticle();
    }

    /**
     * Hide power-up animation and restore normal display
     */
    hidePowerUpAnimation() {
        this.isPoweringUp = false;
        const wireframeContainer = this.tcm.wireframeContainer;

        // Restore wireframe visibility
        if (wireframeContainer) {
            wireframeContainer.style.opacity = '1';
        }

        // Remove power-up element if present
        const pu = document.getElementById('powerup-animation');
        if (pu && pu.parentNode) {
            pu.parentNode.removeChild(pu);
        }

        // The updateTargetDisplay() call after this will replace the power-up content
        // with the actual target information
    }

    /**
     * Hard reset any in-progress power-up state (used on undock/launch)
     */
    resetAfterUndock() {
        this.isPoweringUp = false;
        // Remove any lingering power-up DOM
        const pu = document.getElementById('powerup-animation');
        if (pu && pu.parentNode) {
            pu.parentNode.removeChild(pu);
        }
        // Stop monitors and hide HUD to ensure a clean manual re-activation
        this.stopNoTargetsMonitoring();
        this.stopRangeMonitoring();
        if (this.tcm.targetHUD) this.tcm.targetHUD.style.display = 'none';
        if (this.tcm.targetReticle) this.tcm.targetReticle.style.display = 'none';
        this.tcm.targetInfoDisplay.innerHTML = '';
        this.tcm.currentTarget = null;
        this.tcm.targetIndex = -1;
        this.tcm.isManualNavigationSelection = false; // Reset navigation selection flag
        this.tcm.isManualSelection = false; // Reset manual selection flag
    }

    /**
     * Show "No Targets in Range" display when no targets are available
     */
    showNoTargetsDisplay() {
        const targetInfoDisplay = this.tcm.targetInfoDisplay;
        const statusIconsContainer = this.tcm.statusIconsContainer;
        const wireframeContainer = this.tcm.wireframeContainer;

        // Get the actual range from the target computer system
        const ship = this.tcm.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');
        const range = targetComputer?.range || 150; // Fallback to 150km if system not found

        targetInfoDisplay.innerHTML = `
            <div style="
                background: linear-gradient(45deg, #2a1810, #3a2218, #2a1810);
                background-size: 200% 200%;
                color: #ff8c42;
                padding: 20px;
                border-radius: 4px;
                text-align: center;
                border: 1px solid #ff8c42;
                box-shadow: 0 0 20px rgba(255, 140, 66, 0.3);
                animation: noTargetsGlow 2s ease-in-out infinite alternate;
                font-family: 'Orbitron', monospace;
            ">
                <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">
                    NO TARGETS IN RANGE
                </div>
                <div style="font-size: 10px; opacity: 0.8; margin-bottom: 8px;">
                    TARGET COMPUTER RANGE: ${range}km
                </div>
                <div style="font-size: 9px; opacity: 0.6;">
                    Move closer to celestial bodies or ships
                </div>
            </div>
        `;
        // Hide service icons on no-targets screen
        if (statusIconsContainer) {
            statusIconsContainer.style.display = 'none';
        }

        // Add CSS animation for no targets glow effect
        if (!document.getElementById('no-targets-styles')) {
            const style = document.createElement('style');
            style.id = 'no-targets-styles';
            style.textContent = `
                @keyframes noTargetsGlow {
                    0% {
                        box-shadow: 0 0 20px rgba(255, 140, 66, 0.3);
                        border-color: #ff8c42;
                    }
                    100% {
                        box-shadow: 0 0 30px rgba(255, 140, 66, 0.6);
                        border-color: #ffb366;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Hide wireframe during no targets display
        if (wireframeContainer) {
            wireframeContainer.style.opacity = '0.3';
        }

        // Hide reticle during no targets display
        this.tcm.hideTargetReticle();

        // Play audio feedback for no targets found
        this.playAudio('frontend/static/audio/command_failed.mp3');

        // Start monitoring for targets coming back into range
        this.startNoTargetsMonitoring();
    }

    /**
     * Start monitoring for targets when in "no targets" mode
     */
    startNoTargetsMonitoring() {
        this.isInNoTargetsMode = true;

        // Clear any existing interval
        if (this.noTargetsInterval) {
            clearInterval(this.noTargetsInterval);
        }

        // Check for targets every 2 seconds
        this.noTargetsInterval = setInterval(() => {
            if (!this.tcm.targetComputerEnabled || !this.isInNoTargetsMode) {
                this.stopNoTargetsMonitoring();
                return;
            }

            // Silently update target list to check for new targets
            this.tcm.updateTargetList();

            // If we found targets, automatically select the nearest one
            if (this.tcm.targetObjects && this.tcm.targetObjects.length > 0) {
                this.stopNoTargetsMonitoring();

                // If no current target is set, automatically select the nearest one
                // BUT: Don't override manual selections from Star Charts or other systems
                if (!this.tcm.currentTarget) {
                    this.tcm.targetIndex = -1;
                    this.tcm.cycleTarget(); // Auto-select nearest target

                    // Play audio feedback for automatic target reacquisition
                    this.playAudio('frontend/static/audio/blurb.mp3');
                } else {
                    // Update target index to match the current target (scanner or normal)
                    const currentIndex = this.tcm.targetObjects.findIndex(target => target.name === this.tcm.currentTarget.name);
                    if (currentIndex !== -1) {
                        this.tcm.targetIndex = currentIndex;
                        this.tcm.updateTargetDisplay();
                    } else {
                        // Current target not found in list - select nearest available target unless user is actively holding a manual lock
                        if (!this.tcm.isManualSelection) {
                            this.tcm.targetIndex = -1;
                            this.tcm.cycleTarget();
                        }
                    }
                }

                // Start monitoring the acquired target's range
                this.startRangeMonitoring();

                // Sync with StarfieldManager
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
            }
        }, 2000); // Check every 2 seconds
    }

    /**
     * Stop monitoring for targets
     */
    stopNoTargetsMonitoring() {
        this.isInNoTargetsMode = false;
        if (this.noTargetsInterval) {
            clearInterval(this.noTargetsInterval);
            this.noTargetsInterval = null;
        }
    }

    /**
     * Range monitoring disabled - targets persist until manually changed or sector warp
     */
    startRangeMonitoring() {
        // Range monitoring disabled - targets persist until manually changed or sector warp
        return;
    }

    /**
     * Clean up range monitoring state (no longer used)
     */
    stopRangeMonitoring() {
        // Clean up any existing interval if it exists
        if (this.rangeMonitoringInterval) {
            clearInterval(this.rangeMonitoringInterval);
            this.rangeMonitoringInterval = null;
        }
    }

    /**
     * Show temporary "No targets in range" message for specified duration
     * @param {Function} callback - Function to call after the delay
     * @param {number} duration - Duration in milliseconds (default: 1000ms)
     */
    showTemporaryNoTargetsMessage(callback, duration = 1000) {
        const targetInfoDisplay = this.tcm.targetInfoDisplay;
        const statusIconsContainer = this.tcm.statusIconsContainer;

        // Show "No targets in range" message with switching indicator
        targetInfoDisplay.innerHTML = `
            <div style="background-color: #2a2a2a; color: #D0D0D0; padding: 8px; border-radius: 4px; margin-bottom: 8px; text-align: center; border: 1px solid #555555;">
                <div style="font-weight: bold; font-size: 12px;">No Targets In Range</div>
                <div style="font-size: 10px;">Switching to nearest target...</div>
            </div>
        `;

        // Hide service icons during the delay
        if (statusIconsContainer) {
            statusIconsContainer.style.display = 'none';
        }

        // Clear any existing timeout
        if (this.noTargetsTimeout) {
            clearTimeout(this.noTargetsTimeout);
        }

        // Set timeout to execute callback after delay
        this.noTargetsTimeout = setTimeout(() => {
            this.noTargetsTimeout = null;
            callback();
        }, duration);
    }

    /**
     * Play audio file using HTML5 Audio (simpler and more reliable)
     * @param {string} audioPath - Path to audio file
     */
    playAudio(audioPath) {
        try {
            // Use correct audio path format (like CardInventoryUI)
            const audioBasePath = 'static/audio/';
            const fileName = audioPath.split('/').pop(); // Extract filename from full path
            const correctedPath = `${audioBasePath}${fileName}`;

            // Get or create audio element for this sound
            if (!this.audioElements.has(fileName)) {
                const audio = new Audio(correctedPath);
                // Increase volume slightly for better audibility
                audio.volume = fileName === 'blurb.mp3' ? 0.4 : 0.3; // blurb.mp3 slightly louder
                audio.preload = 'auto';

                // Add error handling
                audio.addEventListener('error', (e) => {
                    debug('P1', `🔊 Audio error for ${fileName}: ${e}`);
                });

                this.audioElements.set(fileName, audio);
            }

            const audio = this.audioElements.get(fileName);

            // Reset playback position and play
            audio.currentTime = 0;
            const playPromise = audio.play();

            // Handle potential play() promise rejection
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    debug('P1', `🔊 Failed to play audio: ${fileName} - ${error}`);
                });
            }
        } catch (error) {
            debug('P1', `🔊 Failed to play audio: ${audioPath} - ${error}`);
        }
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // Clear all timers
        if (this.noTargetsInterval) {
            clearInterval(this.noTargetsInterval);
            this.noTargetsInterval = null;
        }
        if (this.noTargetsTimeout) {
            clearTimeout(this.noTargetsTimeout);
            this.noTargetsTimeout = null;
        }
        if (this.rangeMonitoringInterval) {
            clearInterval(this.rangeMonitoringInterval);
            this.rangeMonitoringInterval = null;
        }

        // Clean up audio elements
        if (this.audioElements) {
            this.audioElements.forEach((audio, key) => {
                if (audio) {
                    audio.pause();
                    audio.src = '';
                }
            });
            this.audioElements.clear();
        }

        this.isPoweringUp = false;
        this.isInNoTargetsMode = false;
        this.isRangeMonitoringActive = false;
    }
}
