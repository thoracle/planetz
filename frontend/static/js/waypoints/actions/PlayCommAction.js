/**
 * PlayCommAction - Play communication audio
 * 
 * Plays audio communications when waypoint is triggered. Supports
 * subtitles, volume control, and integration with existing audio system.
 */

import { WaypointAction, ActionType } from '../WaypointAction.js';
import { debug } from '../../debug.js';

// Communication types
export const CommType = {
    MISSION_UPDATE: 'mission_update',
    WARNING: 'warning',
    ALERT: 'alert',
    DIALOGUE: 'dialogue',
    SYSTEM: 'system',
    AMBIENT: 'ambient'
};

// Communication priority levels
export const CommPriority = {
    LOW: 1,
    NORMAL: 2,
    HIGH: 3,
    URGENT: 4,
    CRITICAL: 5
};

export class PlayCommAction extends WaypointAction {
    constructor(type, parameters) {
        super(type, parameters);
        
        // Validate audio parameters
        this.validateAudioParameters();
    }

    /**
     * Perform communication playback action
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} - Playback result
     */
    async performAction(context) {
        const {
            audioFile,
            videoFile = null,
            subtitle = null,
            duration = null,
            volume = 0.7,
            commType = CommType.SYSTEM,
            priority = CommPriority.NORMAL,
            speaker = null,
            npcId = null,
            channelId = 'default',
            channel = 'default',
            loop = false,
            fadeIn = false,
            fadeOut = false
        } = this.parameters;

        debug('WAYPOINTS', `📻 Playing communication: ${audioFile}${videoFile ? ` + video: ${videoFile}` : ''} (${commType}, priority: ${priority})`);

        try {
            let audioResult = null;
            let videoResult = null;

            // Play video if provided
            if (videoFile) {
                debug('WAYPOINTS', `🎬 Playing video communication: ${videoFile}`);
                videoResult = await this.playVideo({
                    file: videoFile,
                    npcId: npcId,
                    channelId: channelId,
                    duration: duration
                });
            }

            // Play audio if provided
            if (audioFile) {
                // Check if audio system is available
                const audioSystem = this.getAudioSystem();
                if (!audioSystem) {
                    throw new Error('Audio system not available');
                }

                // Prepare audio configuration
                const audioConfig = {
                    file: audioFile,
                    volume: volume,
                    loop: loop,
                    channel: channel,
                    priority: priority,
                    fadeIn: fadeIn,
                    fadeOut: fadeOut
                };

                // Play the audio
                audioResult = await this.playAudio(audioConfig);
            }

            // Show subtitle if provided
            let subtitleResult = null;
            if (subtitle) {
                const effectiveDuration = duration || audioResult?.duration || videoResult?.duration || 5000;
                subtitleResult = await this.showSubtitle({
                    text: subtitle,
                    duration: effectiveDuration,
                    speaker: speaker || npcId,
                    commType: commType,
                    priority: priority
                });
            }

            // Create communication log entry
            this.logCommunication({
                audioFile: audioFile,
                videoFile: videoFile,
                subtitle: subtitle,
                speaker: speaker || npcId,
                npcId: npcId,
                channelId: channelId,
                commType: commType,
                timestamp: new Date(),
                waypoint: context.waypoint
            });

            const result = {
                audioFile: audioFile,
                videoFile: videoFile,
                audioResult: audioResult,
                videoResult: videoResult,
                subtitleResult: subtitleResult,
                duration: audioResult?.duration || videoResult?.duration || duration || 5000,
                commType: commType,
                speaker: speaker || npcId,
                npcId: npcId,
                channelId: channelId,
                success: true
            };

            debug('WAYPOINTS', `✅ Communication played successfully: ${audioFile || 'no audio'}${videoFile ? ` + ${videoFile}` : ''}`);
            return result;

        } catch (error) {
            debug('P1', `Failed to play communication: ${error.message}`);

            // Fallback: show subtitle only if audio fails
            if (this.parameters.subtitle) {
                try {
                    await this.showSubtitle({
                        text: `[Audio Failed] ${this.parameters.subtitle}`,
                        duration: duration || 5000,
                        speaker: speaker,
                        commType: CommType.SYSTEM,
                        priority: CommPriority.HIGH
                    });
                } catch (subtitleError) {
                    debug('P1', `Failed to show fallback subtitle: ${subtitleError.message}`);
                }
            }

            throw error;
        }
    }

    /**
     * Get audio system instance
     * @returns {Object|null} - Audio system or null
     */
    getAudioSystem() {
        // Try multiple audio system references
        if (window.audioManager) {
            return window.audioManager;
        }
        
        if (window.starfieldManager && window.starfieldManager.audioManager) {
            return window.starfieldManager.audioManager;
        }
        
        if (window.missionEventHandler) {
            return window.missionEventHandler;
        }
        
        return null;
    }

    /**
     * Play audio file
     * @param {Object} config - Audio configuration
     * @returns {Promise<Object>} - Audio playback result
     */
    async playAudio(config) {
        const audioSystem = this.getAudioSystem();
        
        if (audioSystem.playAudio) {
            // Standard audio manager
            const result = await audioSystem.playAudio(config.file, config.volume);
            return {
                success: true,
                duration: result?.duration || 5000,
                audioId: result?.id || null
            };
            
        } else if (audioSystem.playCommAudio) {
            // Communication-specific audio
            const result = await audioSystem.playCommAudio(config);
            return {
                success: true,
                duration: result?.duration || 5000,
                audioId: result?.id || null
            };
            
        } else {
            // Fallback: HTML5 Audio
            return this.playAudioFallback(config);
        }
    }

    /**
     * Fallback audio playback using HTML5 Audio
     * @param {Object} config - Audio configuration
     * @returns {Promise<Object>} - Playback result
     */
    playAudioFallback(config) {
        return new Promise((resolve, reject) => {
            try {
                const audio = new Audio(`/static/video/${config.file}`);
                audio.volume = config.volume;
                audio.loop = config.loop;

                audio.addEventListener('loadedmetadata', () => {
                    resolve({
                        success: true,
                        duration: audio.duration * 1000, // Convert to milliseconds
                        audioId: `fallback_${Date.now()}`
                    });
                });

                audio.addEventListener('error', (error) => {
                    reject(new Error(`Audio playback failed: ${error.message}`));
                });

                audio.play().catch(reject);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Play video communication using standard communication system
     * @param {Object} config - Video configuration
     * @returns {Promise<Object>} - Video playback result
     */
    async playVideo(config) {
        const { file, npcId, channelId, duration, subtitle } = config;

        debug('WAYPOINTS', `🎬 Playing video via CommunicationHUD: ${file} (NPC: ${npcId})`);

        try {
            // Use the standard communication system
            if (window.starfieldManager && window.starfieldManager.showCommunication) {
                const npcName = npcId ? npcId.toUpperCase() : 'MISSION CONTROL';
                const message = subtitle || 'Communication in progress...';
                
                const result = window.starfieldManager.showCommunication(npcName, message, {
                    channel: channelId || 'MISSION.1',
                    signalStrength: '████████░',
                    status: '■ LIVE',
                    duration: duration || 5000,
                    faction: 'mission'
                });

                if (result) {
                    return {
                        success: true,
                        duration: duration || 5000,
                        method: 'CommunicationHUD'
                    };
                } else {
                    throw new Error('Communication system not available');
                }
            } else {
                throw new Error('StarfieldManager not available');
            }
        } catch (error) {
            debug('P1', `Video communication failed: ${error.message}`);
            // Fallback: just return success to not break the action
            return { success: false, error: error.message };
        }
    }

    /**
     * Show subtitle text
     * @param {Object} config - Subtitle configuration
     * @returns {Promise<Object>} - Subtitle result
     */
    async showSubtitle(config) {
        const {
            text,
            duration = 5000,
            speaker,
            commType,
            priority
        } = config;

        debug('WAYPOINTS', `💬 Showing subtitle via ephemeral UI: "${text}" (${duration}ms)`);

        try {
            // Use the standard ephemeral message system
            if (window.starfieldManager && window.starfieldManager.showHUDEphemeral) {
                const title = speaker ? speaker.toUpperCase() : 'COMMUNICATION';
                window.starfieldManager.showHUDEphemeral(title, text, duration);
                
                return {
                    success: true,
                    text: text,
                    duration: duration,
                    method: 'ephemeralHUD'
                };
            } else {
                throw new Error('StarfieldManager ephemeral UI not available');
            }
        } catch (error) {
            debug('P1', `Subtitle display failed: ${error.message}`);
            // Fallback: log to debug
            debug('WAYPOINTS', `🎯 WAYPOINT MESSAGE: ${speaker ? speaker + ': ' : ''}${text}`);
            return { success: false, error: error.message };
        }
    }


    /**
     * Get color for communication type
     * @param {string} commType - Communication type
     * @returns {string} - CSS color
     */
    getCommTypeColor(commType) {
        switch (commType) {
            case CommType.MISSION_UPDATE:
                return '#00ff41';  // Green
            case CommType.WARNING:
                return '#ff9800';  // Orange
            case CommType.ALERT:
                return '#f44336';  // Red
            case CommType.DIALOGUE:
                return '#2196f3';  // Blue
            case CommType.SYSTEM:
                return '#9c27b0';  // Purple
            case CommType.AMBIENT:
                return '#607d8b';  // Blue Grey
            default:
                return '#ffffff';  // White
        }
    }

    /**
     * Ensure subtitle CSS animations are available
     */
    ensureSubtitleStyles() {
        if (document.getElementById('waypoint-subtitle-styles')) {
            return; // Already added
        }

        const style = document.createElement('style');
        style.id = 'waypoint-subtitle-styles';
        style.textContent = `
            @keyframes subtitleFadeIn {
                0% {
                    opacity: 0;
                    transform: translateX(-50%) translateY(20px);
                }
                100% {
                    opacity: 1;
                    transform: translateX(-50%) translateY(0);
                }
            }
            
            .waypoint-subtitle .subtitle-speaker {
                color: #ffeb3b;
                font-weight: bold;
            }
            
            .waypoint-subtitle.priority-4,
            .waypoint-subtitle.priority-5 {
                animation: subtitlePulse 1s infinite;
            }
            
            @keyframes subtitlePulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Log communication for history/debugging
     * @param {Object} commData - Communication data
     */
    logCommunication(commData) {
        // Store in communication history
        if (!window.communicationHistory) {
            window.communicationHistory = [];
        }

        window.communicationHistory.push({
            ...commData,
            id: `comm_${Date.now()}`,
            waypointId: commData.waypoint?.id,
            waypointName: commData.waypoint?.name
        });

        // Keep only last 100 communications
        if (window.communicationHistory.length > 100) {
            window.communicationHistory.shift();
        }

        debug('WAYPOINTS', `📝 Communication logged: ${commData.audioFile}`);
    }

    /**
     * Validate audio parameters
     */
    validateAudioParameters() {
        const { audioFile, volume, duration } = this.parameters;

        if (!audioFile || typeof audioFile !== 'string') {
            throw new Error('audioFile parameter is required and must be a string');
        }

        if (volume !== undefined && (typeof volume !== 'number' || volume < 0 || volume > 1)) {
            throw new Error('volume must be a number between 0 and 1');
        }

        if (duration !== undefined && (typeof duration !== 'number' || duration <= 0)) {
            throw new Error('duration must be a positive number');
        }
    }

    /**
     * Get required parameters for this action
     * @returns {Array<string>} - Required parameter names
     */
    getRequiredParameters() {
        return ['audioFile'];
    }

    /**
     * Get parameter types for validation
     * @returns {Object} - Parameter name to type mapping
     */
    getParameterTypes() {
        return {
            audioFile: 'string',
            subtitle: 'string',
            duration: 'number',
            volume: 'number',
            commType: 'string',
            priority: 'number',
            speaker: 'string',
            channel: 'string',
            loop: 'boolean'
        };
    }

    /**
     * Get action summary for debugging
     * @returns {Object} - Action summary
     */
    getSummary() {
        const baseSummary = super.getSummary();
        const { audioFile, subtitle, commType, speaker } = this.parameters;
        
        return {
            ...baseSummary,
            audioFile: audioFile,
            hasSubtitle: !!subtitle,
            commType: commType || CommType.SYSTEM,
            speaker: speaker || 'System',
            estimatedDuration: this.parameters.duration || 5000
        };
    }
}

export default PlayCommAction;
