import { debug } from '../debug.js';

/**
 * StarfieldAudioManager - Handles all audio functionality for the starfield view
 * Extracted from StarfieldManager.js for better code organization
 */
export class StarfieldAudioManager {
    constructor(THREE, audioListener) {
        this.THREE = THREE;
        this.audioListener = audioListener;
        this.audioLoader = new THREE.AudioLoader();
        
        // Audio objects
        this.engineSound = new THREE.Audio(audioListener);
        this.commandSound = new THREE.Audio(audioListener);
        this.commandFailedSound = new THREE.Audio(audioListener);
        
        // Audio state
        this.soundLoaded = false;
        this.commandSoundLoaded = false;
        this.commandFailedSoundLoaded = false;
        this.engineState = 'stopped'; // 'stopped', 'starting', 'running', 'stopping'
        this.engineTimes = null;
        
        // User interaction tracking to prevent warning spam
        this.userHasInteracted = false;
        this.interactionWarningShown = false;
        
        // Initialize audio system
        this.initializeAudio();
    }

    /**
     * Initialize all audio systems
     */
    initializeAudio() {
        // Set up user interaction detection FIRST
        this.setupUserInteractionDetection();
        
        // Ensure AudioContext is running
        this.ensureAudioContextRunning();
        
        // Load audio files from static directory
        const audioBasePath = 'static/audio/';
        this.loadEngineAudio(`${audioBasePath}engines.wav`);
        this.loadCommandAudio(`${audioBasePath}command.wav`);
        this.loadCommandFailedAudio(`${audioBasePath}command_failed.mp3`);
        
        // Add visibility change listener for audio context
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.ensureAudioContextRunning();
            }
        });
    }

    /**
     * Ensure AudioContext is running (required for audio playback)
     */
    ensureAudioContextRunning() {
        if (this.audioListener?.context) {
            if (this.audioListener.context.state === 'suspended') {
                // Only show warning once per session until user interaction
                if (!this.userHasInteracted && !this.interactionWarningShown) {
                    debug('UTILITY', 'No user interaction detected - sound may not play due to browser policy');
                    this.interactionWarningShown = true;
                }
                
                // Always try to resume, but don't spam console
                this.audioListener.context.resume().then(() => {
                    if (this.userHasInteracted) {
debug('UTILITY', '🎵 AudioContext resumed successfully');
                    }
                }).catch(error => {
                    if (this.userHasInteracted) {
                        console.warn('⚠️ Failed to resume AudioContext:', error);
                    }
                });
            }
        }
    }

    /**
     * Load engine audio
     */
    loadEngineAudio(audioPath) {
        this.audioLoader.load(
            audioPath,
            (buffer) => {
                // Engine sound loaded
                this.engineSound.setBuffer(buffer);
                this.engineSound.setLoop(true);
                
                // Set loop points for the middle portion of the sound
                const duration = buffer.duration;
                const startupTime = duration * 0.25;
                const shutdownTime = duration * 0.70;
                
                this.engineSound.setLoopStart(startupTime);
                this.engineSound.setLoopEnd(shutdownTime);
                
                this.engineTimes = {
                    startup: startupTime,
                    shutdown: shutdownTime,
                    total: duration
                };
                
                this.engineSound.setVolume(0.0);
                this.soundLoaded = true;
            },
            (progress) => {
                // Progress callback (optional)
            },
            (error) => {
                console.error('❌ Error loading engine sound:', {
                    path: audioPath,
                    error: error
                });
            }
        );
    }

    /**
     * Load command audio
     */
    loadCommandAudio(audioPath) {
        this.audioLoader.load(
            audioPath,
            (buffer) => {
                // Command sound loaded
                this.commandSound.setBuffer(buffer);
                this.commandSound.setVolume(0.5);
                this.commandSoundLoaded = true;
            },
            (progress) => {
                // Progress callback (optional)
            },
            (error) => {
                console.error('❌ Error loading command sound:', {
                    path: audioPath,
                    error: error
                });
            }
        );
    }

    /**
     * Load command failed audio
     */
    loadCommandFailedAudio(audioPath) {
        this.audioLoader.load(
            audioPath,
            (buffer) => {
                // Command failed sound loaded
                this.commandFailedSound.setBuffer(buffer);
                this.commandFailedSound.setVolume(0.6);
                this.commandFailedSoundLoaded = true;
            },
            (progress) => {
                // Progress callback (optional)
            },
            (error) => {
                console.error('❌ Error loading command failed sound:', {
                    path: audioPath,
                    error: error
                });
            }
        );
    }

    /**
     * Play engine startup sound and transition to running state
     */
    playEngineStartup() {
        if (!this.soundLoaded) return;
        
        this.ensureAudioContextRunning();
        
        if (this.engineState === 'stopped') {
            this.engineState = 'starting';
            this.engineSound.setVolume(0.0);
            this.engineSound.play();
            
            // Fade in engine sound over startup time
            if (this.engineTimes) {
                const startupDuration = this.engineTimes.startup * 1000; // Convert to milliseconds
                const fadeSteps = 20;
                const fadeInterval = startupDuration / fadeSteps;
                let currentStep = 0;
                
                const fadeIn = setInterval(() => {
                    currentStep++;
                    const volume = (currentStep / fadeSteps) * 0.3; // Max volume 0.3
                    this.engineSound.setVolume(volume);
                    
                    if (currentStep >= fadeSteps) {
                        clearInterval(fadeIn);
                        this.engineState = 'running';
                    }
                }, fadeInterval);
            }
        }
    }

    /**
     * Play engine shutdown sound and transition to stopped state
     */
    playEngineShutdown() {
        if (!this.soundLoaded) return;
        
        if (this.engineState === 'running') {
            this.engineState = 'stopping';
            
            // Fade out engine sound
            const fadeSteps = 15;
            const fadeInterval = 50; // 50ms per step
            let currentStep = 0;
            const initialVolume = this.engineSound.getVolume();
            
            const fadeOut = setInterval(() => {
                currentStep++;
                const volume = initialVolume * (1 - (currentStep / fadeSteps));
                this.engineSound.setVolume(Math.max(0, volume));
                
                if (currentStep >= fadeSteps) {
                    clearInterval(fadeOut);
                    this.engineSound.stop();
                    this.engineState = 'stopped';
                }
            }, fadeInterval);
        }
    }

    /**
     * Update engine sound volume based on current speed
     */
    updateEngineVolume(currentSpeed, maxSpeed) {
        if (this.soundLoaded && this.engineState === 'running') {
            const volume = (currentSpeed / maxSpeed) * 0.3; // Max volume 0.3
            this.engineSound.setVolume(Math.max(0, Math.min(0.3, volume)));
        }
    }

    /**
     * Play command success sound
     */
    playCommandSound() {
        if (this.commandSoundLoaded && !this.commandSound.isPlaying) {
            this.ensureAudioContextRunning();
            this.commandSound.play();
        } else if (!this.commandSoundLoaded) {
            // Fallback: generate a success beep using Web Audio API
            this.generateCommandSuccessBeep();
        }
    }

    /**
     * Play command failed sound
     */
    playCommandFailedSound() {
        if (this.commandFailedSoundLoaded && !this.commandFailedSound.isPlaying) {
            this.ensureAudioContextRunning();
            this.commandFailedSound.play();
        } else if (!this.commandFailedSoundLoaded) {
            // Fallback: generate a low-pitched beep using Web Audio API
            this.generateCommandFailedBeep();
        }
    }

    /**
     * Generate a command success beep using Web Audio API as fallback
     */
    generateCommandSuccessBeep() {
        if (this.audioListener?.context) {
            try {
                const audioContext = this.audioListener.context;
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // High frequency
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.15);
            } catch (error) {
                console.warn('⚠️ Failed to generate command success beep:', error);
            }
        }
    }

    /**
     * Generate a command failed beep using Web Audio API as fallback
     */
    generateCommandFailedBeep() {
        if (this.audioListener?.context) {
            try {
                const audioContext = this.audioListener.context;
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.setValueAtTime(200, audioContext.currentTime); // Low frequency
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
                gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.8);
            } catch (error) {
                console.warn('⚠️ Failed to generate command failed beep:', error);
            }
        }
    }

    /**
     * Get current engine state
     */
    getEngineState() {
        return this.engineState;
    }

    /**
     * Check if sounds are loaded
     */
    areSoundsLoaded() {
        return {
            engine: this.soundLoaded,
            command: this.commandSoundLoaded,
            commandFailed: this.commandFailedSoundLoaded
        };
    }

    /**
     * Dispose of all audio resources
     */
    dispose() {
debug('UTILITY', '🎵 Disposing StarfieldAudioManager...');
        
        // Stop and clean up audio
        if (this.engineSound) {
            this.engineSound.stop();
            if (this.engineSound.buffer) {
                this.engineSound.setBuffer(null);
            }
        }
        
        if (this.commandSound) {
            this.commandSound.stop();
            if (this.commandSound.buffer) {
                this.commandSound.setBuffer(null);
            }
        }
        
        if (this.commandFailedSound) {
            this.commandFailedSound.stop();
            if (this.commandFailedSound.buffer) {
                this.commandFailedSound.setBuffer(null);
            }
        }
        
        // Reset state
        this.engineState = 'stopped';
        this.soundLoaded = false;
        this.commandSoundLoaded = false;
        this.commandFailedSoundLoaded = false;
    }

    /**
     * Set up user interaction detection to prevent audio policy warnings
     */
    setupUserInteractionDetection() {
        const interactionEvents = ['click', 'keydown', 'touchstart', 'mousedown'];
        
        const handleUserInteraction = () => {
            if (!this.userHasInteracted) {
                this.userHasInteracted = true;
debug('UTILITY', '🎵 User interaction detected - audio policy satisfied');
                
                // Reset warning flag so future audio attempts work
                this.interactionWarningShown = false;
                
                // Resume AudioContext if suspended
                if (this.audioListener?.context && this.audioListener.context.state === 'suspended') {
                    this.audioListener.context.resume().then(() => {
debug('UTILITY', '🎵 AudioContext resumed after user interaction');
                    }).catch(error => {
                        console.warn('⚠️ Failed to resume AudioContext after interaction:', error);
                    });
                }
                
                // Remove event listeners after first successful interaction
                interactionEvents.forEach(event => {
                    document.removeEventListener(event, handleUserInteraction);
                });
            }
        };
        
        // Add event listeners for user interaction (not using once: true to avoid double cleanup)
        interactionEvents.forEach(event => {
            document.addEventListener(event, handleUserInteraction, false);
        });
    }

    /**
     * Check if user has interacted (for other audio systems)
     */
    hasUserInteracted() {
        return this.userHasInteracted;
    }

    /**
     * Mark that warning has been shown (for other audio systems)
     */
    markWarningShown() {
        this.interactionWarningShown = true;
    }

    /**
     * Check if warning has been shown (for other audio systems)
     */
    hasWarningBeenShown() {
        return this.interactionWarningShown;
    }
} 