/**
 * CardUpgradeAudioManager
 *
 * Extracted from CardInventoryUI.js to reduce god class size.
 * Manages audio playback for card upgrade sounds with multiple fallback strategies.
 *
 * Features:
 * - THREE.js audio integration
 * - HTML5 fallback with audio pooling
 * - User interaction tracking for browser autoplay policies
 * - Corruption detection and element recreation
 * - Web Audio API as last resort fallback
 */

import { debug } from '../debug.js';

export class CardUpgradeAudioManager {
    constructor() {
        // THREE.js audio components
        this.audioListener = null;
        this.upgradeSound = null;
        this.upgradeSoundLoaded = false;

        // HTML5 fallback audio
        this.fallbackAudio = null;
        this.fallbackAudioLoaded = false;

        // Audio pool for rapid successive plays
        this.audioPool = [];
        this.audioPoolSize = 5;
        this.audioPoolIndex = 0;
        this.audioElementUseCount = [];
        this.maxUsesPerElement = 10;

        // User interaction tracking for browser policies
        this.userHasInteracted = false;
        this.audioWarningShown = false;
        this.interactionCheckInterval = null;

        // Track timeouts for cleanup
        this.activeTimeouts = new Set();

        // Track event listeners for cleanup
        this._boundHandlers = {
            trackInteraction: null
        };
        this._interactionEventTypes = ['click', 'touchstart', 'keydown'];

        // Initialize audio
        this.initialize();
    }

    /**
     * Initialize audio components for upgrade sounds
     */
    initialize() {
        debug('UTILITY', '🔊 Initializing upgrade audio...');

        try {
            // Initialize THREE.js audio context if available
            if (typeof window.THREE !== 'undefined' && window.THREE.AudioListener) {
                this.audioListener = new window.THREE.AudioListener();
                this.upgradeSound = new window.THREE.Audio(this.audioListener);
                this.upgradeSoundLoaded = false;

                const audioLoader = new window.THREE.AudioLoader();
                this.loadAudio(audioLoader, 'static/audio/blurb.mp3');
            } else {
                debug('UI', '⚠️ THREE.js not available for audio initialization, using fallback');
                this.upgradeSoundLoaded = false;
                this.initializeFallbackAudio();
            }
        } catch (error) {
            debug('UI', `❌ Error initializing upgrade audio: ${error.message}`);
            this.upgradeSoundLoaded = false;
            this.initializeFallbackAudio();
        }
    }

    /**
     * Load audio using THREE.js AudioLoader
     */
    loadAudio(audioLoader, audioPath) {
        audioLoader.load(
            audioPath,
            (buffer) => {
                this.upgradeSound.setBuffer(buffer);
                this.upgradeSound.setVolume(0.7);
                this.upgradeSoundLoaded = true;
            },
            (progress) => {
                // Loading progress (silent)
            },
            (error) => {
                debug('UI', `❌ Error loading upgrade sound: ${error.message || error}`);
                this.upgradeSoundLoaded = false;
                this.initializeFallbackAudio();
            }
        );
    }

    /**
     * Initialize fallback HTML5 audio
     */
    initializeFallbackAudio() {
        debug('NAVIGATION', '🔄 Initializing fallback HTML5 audio with path detection...');
        try {
            this.fallbackAudio = new Audio('static/audio/blurb.mp3');
            this.fallbackAudio.volume = 0.7;
            this.fallbackAudio.preload = 'auto';

            // Create audio pool for rapid successive plays
            this.audioPool = [];
            this.audioPoolSize = 5;
            this.audioPoolIndex = 0;
            this.audioElementUseCount = [];
            this.maxUsesPerElement = 10;

            // Track user interaction for browser audio policies
            this.userHasInteracted = false;
            this.audioWarningShown = false;
            this.setupUserInteractionTracking();

            this.fallbackAudio.addEventListener('canplaythrough', () => {
                debug('UTILITY', '✅ Fallback audio loaded successfully');
                this.fallbackAudioLoaded = true;
                this.createAudioPool();
            });

            this.fallbackAudio.addEventListener('error', (e) => {
                debug('UI', `❌ Fallback audio loading failed: ${e.type}`);
                this.fallbackAudioLoaded = false;
            });

        } catch (error) {
            debug('UI', `❌ Error initializing fallback audio: ${error.message}`);
            this.fallbackAudioLoaded = false;
        }
    }

    /**
     * Create or recreate the audio pool
     */
    createAudioPool() {
        debug('UI', 'Creating audio pool...');
        this.audioPool = [];
        this.audioElementUseCount = [];

        for (let i = 0; i < this.audioPoolSize; i++) {
            this.createAudioElement(i);
        }
        debug('UI', `✅ Audio pool created with ${this.audioPool.length} elements`);
    }

    /**
     * Create a single audio element for the pool
     */
    createAudioElement(index) {
        const audioBasePath = 'static/audio/';
        const audioClone = new Audio(`${audioBasePath}blurb.mp3`);
        audioClone.volume = 0.7;
        audioClone.preload = 'auto';
        this.audioElementUseCount[index] = 0;

        audioClone.addEventListener('play', () => {
            debug('UI', `🎵 Audio ${index} started playing (use #${this.audioElementUseCount[index] + 1})`);
        });

        audioClone.addEventListener('ended', () => {
            debug('UI', `🎵 Audio ${index} finished playing`);
        });

        audioClone.addEventListener('error', (e) => {
            debug('UI', `❌ Audio ${index} error: ${e.type}`);
            this._setTimeout(() => this.recreateAudioElement(index), 100);
        });

        audioClone.addEventListener('stalled', () => {
            debug('UI', `⚠️ Audio ${index} stalled - may need recreation`);
        });

        audioClone.addEventListener('suspend', () => {
            debug('UI', `⚠️ Audio ${index} suspended - may need recreation`);
        });

        this.audioPool[index] = audioClone;
        debug('NAVIGATION', `🔧 Created audio element ${index} (dev path)`);
    }

    /**
     * Recreate a specific audio element that may be corrupted
     */
    recreateAudioElement(index) {
        debug('UI', `🔄 Recreating potentially corrupted audio element ${index}`);

        if (this.audioPool[index]) {
            this.audioPool[index].src = '';
            this.audioPool[index].load();
        }

        this.createAudioElement(index);
    }

    /**
     * Check if an audio element is healthy and recreate if needed
     */
    checkAudioElementHealth(index) {
        const audio = this.audioPool[index];
        const useCount = this.audioElementUseCount[index];

        const maxUsesThreshold = Math.max(2, this.maxUsesPerElement / 2);
        if (useCount >= maxUsesThreshold) {
            debug('UI', `🔄 Audio element ${index} reached threshold (${useCount}/${maxUsesThreshold}), recreating...`);
            this.recreateAudioElement(index);
            return false;
        }

        if (!audio || audio.error || audio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
            debug('UI', `⚠️ Audio element ${index} unhealthy, recreating...`);
            this.recreateAudioElement(index);
            return false;
        }

        if (this.detectSilentCorruption(audio, index)) {
            debug('UI', `🔇 Audio element ${index} appears silently corrupted, recreating...`);
            this.recreateAudioElement(index);
            return false;
        }

        return true;
    }

    /**
     * Detect silent audio corruption where the element reports success but produces no sound
     */
    detectSilentCorruption(audio, index) {
        if (isNaN(audio.duration) || audio.duration === 0) {
            debug('UI', `⚠️ Audio ${index} has invalid duration: ${audio.duration}`);
            return true;
        }

        if (!audio.src || audio.src === '') {
            debug('UI', `⚠️ Audio ${index} missing source`);
            return true;
        }

        if (audio.readyState < 2) {
            debug('UI', `⚠️ Audio ${index} readyState dropped to ${audio.readyState}`);
            return true;
        }

        if (audio.volume === 0) {
            debug('UI', `⚠️ Audio ${index} volume is 0 (possible corruption)`);
            audio.volume = 0.7;
            return true;
        }

        return false;
    }

    /**
     * Set up user interaction tracking for browser audio policies
     */
    setupUserInteractionTracking() {
        const starfieldAudioManager = window.starfieldAudioManager;
        if (starfieldAudioManager) {
            debug('UI', 'Using global StarfieldAudioManager for user interaction detection');

            const checkInteractionState = () => {
                if (!this.userHasInteracted && starfieldAudioManager.hasUserInteracted()) {
                    this.userHasInteracted = true;
                    debug('UI', 'User interaction detected via StarfieldAudioManager');

                    if (this.audioListener && this.audioListener.context && this.audioListener.context.state === 'suspended') {
                        this.audioListener.context.resume().then(() => {
                            debug('UI', '🔊 AudioContext resumed after user interaction');
                        });
                    }
                }
            };

            checkInteractionState();
            this.interactionCheckInterval = setInterval(checkInteractionState, 100);
        } else {
            debug('AI', 'StarfieldAudioManager not available, using local user interaction detection');

            this._boundHandlers.trackInteraction = () => {
                if (!this.userHasInteracted) {
                    this.userHasInteracted = true;
                    debug('UI', 'User interaction detected - audio should work now');

                    if (this.audioListener && this.audioListener.context && this.audioListener.context.state === 'suspended') {
                        this.audioListener.context.resume().then(() => {
                            debug('UI', '🔊 AudioContext resumed after user interaction');
                        });
                    }
                }
            };

            this._interactionEventTypes.forEach(event => {
                document.addEventListener(event, this._boundHandlers.trackInteraction, { once: false });
            });
        }
    }

    /**
     * Wrapped setTimeout that tracks the timeout ID for cleanup on destroy
     */
    _setTimeout(callback, delay) {
        const id = setTimeout(() => {
            this.activeTimeouts.delete(id);
            callback();
        }, delay);
        this.activeTimeouts.add(id);
        return id;
    }

    /**
     * Clear all tracked timeouts
     */
    _clearAllTimeouts() {
        this.activeTimeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        this.activeTimeouts.clear();
    }

    /**
     * Play upgrade success sound with improved reliability
     */
    playUpgradeSound() {
        debug('UI', '🎵 Attempting to play upgrade sound...');

        if (!this.userHasInteracted) {
            const starfieldAudioManager = window.starfieldAudioManager;
            if (starfieldAudioManager && !starfieldAudioManager.hasWarningBeenShown()) {
                debug('UTILITY', 'No user interaction detected - sound may not play due to browser policy');
                starfieldAudioManager.markWarningShown();
            } else if (!starfieldAudioManager && !this.audioWarningShown) {
                debug('UTILITY', 'No user interaction detected - sound may not play due to browser policy');
                this.audioWarningShown = true;
            }
        }

        try {
            // Try THREE.js audio first
            if (this.upgradeSoundLoaded && this.upgradeSound && !this.upgradeSound.isPlaying) {
                debug('UI', '🎵 Playing THREE.js upgrade sound');

                if (this.audioListener.context.state === 'suspended') {
                    this.audioListener.context.resume().then(() => {
                        this.upgradeSound.play();
                        debug('UI', '✅ Playing upgrade success sound (blurb.mp3) via THREE.js');
                    });
                } else {
                    this.upgradeSound.play();
                    debug('UI', '✅ Playing upgrade success sound (blurb.mp3) via THREE.js');
                }
                return;
            }

            // Try fallback HTML5 audio with improved pooling
            if (this.fallbackAudioLoaded && this.audioPool && this.audioPool.length > 0) {
                debug('UI', '🎵 Playing fallback HTML5 upgrade sound');

                const originalPoolIndex = this.audioPoolIndex;
                let currentPoolIndex = originalPoolIndex;
                let attemptsRemaining = this.audioPoolSize;

                while (attemptsRemaining > 0) {
                    if (!this.checkAudioElementHealth(currentPoolIndex)) {
                        debug('UI', `⚠️ Audio element ${currentPoolIndex} unhealthy, trying next...`);
                        currentPoolIndex = (currentPoolIndex + 1) % this.audioPool.length;
                        attemptsRemaining--;
                        continue;
                    }

                    const audioToPlay = this.audioPool[currentPoolIndex];
                    this.audioElementUseCount[currentPoolIndex]++;
                    this.audioPoolIndex = (currentPoolIndex + 1) % this.audioPool.length;

                    debug('UI', `🎵 Using audio pool slot ${currentPoolIndex} [use #${this.audioElementUseCount[currentPoolIndex]}]`);

                    if (!audioToPlay) {
                        debug('UI', `❌ Audio pool slot ${currentPoolIndex} is null/undefined`);
                        this.recreateAudioElement(currentPoolIndex);
                        currentPoolIndex = (currentPoolIndex + 1) % this.audioPool.length;
                        attemptsRemaining--;
                        continue;
                    }

                    if (this.detectSilentCorruption(audioToPlay, currentPoolIndex)) {
                        debug('UI', `🔇 Last-minute corruption detected for audio ${currentPoolIndex}, skipping...`);
                        this.recreateAudioElement(currentPoolIndex);
                        currentPoolIndex = (currentPoolIndex + 1) % this.audioPool.length;
                        attemptsRemaining--;
                        continue;
                    }

                    if (audioToPlay.readyState >= 2) {
                        if (!audioToPlay.paused) {
                            audioToPlay.pause();
                        }
                        audioToPlay.currentTime = 0;

                        if (audioToPlay.volume !== 0.7) {
                            debug('UI', `🔧 Resetting audio ${currentPoolIndex} volume from ${audioToPlay.volume} to 0.7`);
                            audioToPlay.volume = 0.7;
                        }

                        const playPromise = audioToPlay.play();
                        if (playPromise !== undefined) {
                            playPromise.then(() => {
                                this._setTimeout(() => {
                                    if (audioToPlay.paused && audioToPlay.currentTime === 0) {
                                        debug('UI', `🔇 Audio ${currentPoolIndex} may have failed silently - recreating for next use`);
                                        this.recreateAudioElement(currentPoolIndex);
                                    }
                                }, 100);
                            }).catch((error) => {
                                debug('UI', `❌ HTML5 audio play failed for pool ${currentPoolIndex}: ${error.message}`);
                                this.recreateAudioElement(currentPoolIndex);
                                if (attemptsRemaining > 1) {
                                    debug('UI', `🔄 Trying next audio element...`);
                                    currentPoolIndex = (currentPoolIndex + 1) % this.audioPool.length;
                                    attemptsRemaining--;
                                    this._setTimeout(() => this.playUpgradeSound(), 10);
                                } else {
                                    this.tryAlternativeAudioPlayback();
                                }
                            });
                        }
                        return;
                    } else {
                        debug('UI', `⚠️ Audio pool ${currentPoolIndex} not ready (readyState: ${audioToPlay.readyState}), trying to load...`);
                        audioToPlay.load();
                        audioToPlay.addEventListener('canplaythrough', () => {
                            audioToPlay.currentTime = 0;
                            audioToPlay.play().then(() => {
                                debug('UI', `✅ Audio pool ${currentPoolIndex} played after loading`);
                            }).catch(err => {
                                debug('UI', `❌ Audio pool ${currentPoolIndex} play failed after loading: ${err.message}`);
                                this.recreateAudioElement(currentPoolIndex);
                            });
                        }, { once: true });
                        return;
                    }
                }

                debug('UI', '❌ All audio elements failed, recreating pool...');
                this.createAudioPool();
                this.tryAlternativeAudioPlayback();
                return;
            }

            // Fallback to original method if pool isn't available
            if (this.fallbackAudioLoaded && this.fallbackAudio) {
                debug('UI', '🎵 Playing fallback HTML5 upgrade sound (original method)');
                this.playOriginalFallbackAudio();
                return;
            }

            this.tryAlternativeAudioPlayback();

        } catch (error) {
            debug('UI', `❌ Error playing upgrade sound: ${error.message}`);
            this.tryAlternativeAudioPlayback();
        }
    }

    /**
     * Play original fallback audio method
     */
    playOriginalFallbackAudio() {
        try {
            this.fallbackAudio.currentTime = 0;

            const playPromise = this.fallbackAudio.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    debug('UI', '✅ Playing upgrade success sound via HTML5 audio');
                }).catch((error) => {
                    debug('UI', `❌ Original HTML5 audio play failed: ${error.message}`);
                    this.tryAlternativeAudioPlayback();
                });
            }
        } catch (error) {
            debug('UI', `❌ Original fallback audio error: ${error.message}`);
            this.tryAlternativeAudioPlayback();
        }
    }

    /**
     * Try alternative audio playback methods
     */
    tryAlternativeAudioPlayback() {
        debug('UI', '🔄 Trying alternative audio playback...');

        try {
            const immediateAudio = new Audio('static/audio/blurb.mp3');
            immediateAudio.volume = 0.7;

            this._setTimeout(() => {
                const playPromise = immediateAudio.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        debug('UI', '✅ Emergency audio playback successful');
                    }).catch(err => {
                        debug('UI', `❌ Emergency audio playback failed: ${err.message}`);
                        this.tryWebAudioPlayback();
                    });
                }
            }, 10);

        } catch (emergencyError) {
            debug('UI', `❌ Emergency audio creation failed: ${emergencyError.message}`);
            this.tryWebAudioPlayback();
        }
    }

    /**
     * Try Web Audio API as last resort
     */
    tryWebAudioPlayback() {
        if (typeof AudioContext !== 'undefined' || typeof webkitAudioContext !== 'undefined') {
            debug('UI', '🔊 Trying Web Audio API...');

            try {
                const AudioCtx = AudioContext || webkitAudioContext;
                const audioContext = new AudioCtx();

                fetch('static/audio/blurb.mp3')
                    .then(response => response.arrayBuffer())
                    .then(data => audioContext.decodeAudioData(data))
                    .then(audioBuffer => {
                        const source = audioContext.createBufferSource();
                        const gainNode = audioContext.createGain();

                        source.buffer = audioBuffer;
                        gainNode.gain.value = 0.7;

                        source.connect(gainNode);
                        gainNode.connect(audioContext.destination);

                        source.start();
                        debug('UI', '✅ Web Audio API playback successful');
                    })
                    .catch(error => {
                        debug('UI', `❌ Web Audio API failed: ${error.message}`);
                    });

            } catch (webAudioError) {
                debug('UI', `❌ Web Audio API not supported: ${webAudioError.message}`);
            }
        } else {
            debug('UI', '💔 All audio playback methods failed - no Web Audio API support');
        }
    }

    /**
     * Cleanup all audio resources
     */
    destroy() {
        debug('UI', 'CardUpgradeAudioManager destroy() called');

        // Clear interaction check interval
        if (this.interactionCheckInterval) {
            clearInterval(this.interactionCheckInterval);
            this.interactionCheckInterval = null;
        }

        // Clear all tracked timeouts
        this._clearAllTimeouts();

        // Remove interaction tracking listeners
        if (this._boundHandlers.trackInteraction) {
            this._interactionEventTypes.forEach(event => {
                document.removeEventListener(event, this._boundHandlers.trackInteraction);
            });
            this._boundHandlers.trackInteraction = null;
        }

        // Clean up THREE.js audio
        if (this.upgradeSound) {
            if (this.upgradeSound.isPlaying) {
                this.upgradeSound.stop();
            }
            this.upgradeSound = null;
        }

        if (this.audioListener) {
            this.audioListener = null;
        }

        // Clean up audio pool
        if (this.audioPool) {
            this.audioPool.forEach(audio => {
                audio.pause();
                audio.src = '';
            });
            this.audioPool = null;
        }

        if (this.fallbackAudio) {
            this.fallbackAudio.pause();
            this.fallbackAudio.src = '';
            this.fallbackAudio = null;
        }

        debug('UI', 'CardUpgradeAudioManager cleanup complete');
    }
}

// Singleton instance
let audioManagerInstance = null;

/**
 * Get the singleton CardUpgradeAudioManager instance
 * @returns {CardUpgradeAudioManager}
 */
export function getUpgradeAudioManager() {
    if (!audioManagerInstance) {
        audioManagerInstance = new CardUpgradeAudioManager();
    }
    return audioManagerInstance;
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetUpgradeAudioManager() {
    if (audioManagerInstance) {
        audioManagerInstance.destroy();
        audioManagerInstance = null;
    }
}
