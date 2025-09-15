/**
 * ShowMessageAction - Display message to player with optional audio
 * 
 * Shows text messages to the player when waypoint is triggered. Supports
 * optional audio playback, priority levels, and various display styles.
 */

import { WaypointAction, ActionType } from '../WaypointAction.js';
import { debug } from '../../debug.js';

// Message types
export const MessageType = {
    INFO: 'info',
    SUCCESS: 'success',
    WARNING: 'warning',
    ERROR: 'error',
    MISSION: 'mission',
    SYSTEM: 'system',
    DISCOVERY: 'discovery'
};

// Message priority levels
export const MessagePriority = {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent',
    CRITICAL: 'critical'
};

// Display positions
export const DisplayPosition = {
    TOP_CENTER: 'top-center',
    TOP_LEFT: 'top-left',
    TOP_RIGHT: 'top-right',
    CENTER: 'center',
    BOTTOM_CENTER: 'bottom-center',
    BOTTOM_LEFT: 'bottom-left',
    BOTTOM_RIGHT: 'bottom-right'
};

export class ShowMessageAction extends WaypointAction {
    constructor(type, parameters) {
        super(type, parameters);
        
        // Validate message parameters
        this.validateMessageParameters();
    }

    /**
     * Perform message display action
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} - Display result
     */
    async performAction(context) {
        const {
            title = "Message",
            message,
            duration = 5000,
            priority = MessagePriority.NORMAL,
            messageType = MessageType.INFO,
            position = DisplayPosition.TOP_CENTER,
            audioFileId = null,
            audioVolume = 0.7,
            dismissible = true,
            icon = null,
            actions = null // Optional action buttons
        } = this.parameters;

        debug('WAYPOINTS', `💬 Showing message: "${title}" - ${message} (${messageType}, ${priority})`);

        try {
            // Play audio if specified
            let audioResult = null;
            if (audioFileId) {
                audioResult = await this.playMessageAudio(audioFileId, audioVolume);
            }

            // Create and show message
            const messageResult = await this.showMessage({
                title,
                message,
                duration,
                priority,
                messageType,
                position,
                dismissible,
                icon,
                actions,
                waypoint: context.waypoint
            });

            // Log message for history
            this.logMessage({
                title,
                message,
                messageType,
                priority,
                timestamp: new Date(),
                waypoint: context.waypoint,
                audioFile: audioFileId
            });

            const result = {
                title,
                message,
                messageType,
                priority,
                duration,
                audioResult,
                messageResult,
                success: true
            };

            debug('WAYPOINTS', `✅ Message displayed successfully: ${title}`);
            return result;

        } catch (error) {
            console.error('Failed to show message:', error);
            throw error;
        }
    }

    /**
     * Play message audio
     * @param {string} audioFileId - Audio file ID
     * @param {number} volume - Audio volume
     * @returns {Promise<Object>} - Audio result
     */
    async playMessageAudio(audioFileId, volume) {
        try {
            if (window.audioManager && window.audioManager.playAudio) {
                const result = await window.audioManager.playAudio(audioFileId, volume);
                debug('WAYPOINTS', `🔊 Message audio played: ${audioFileId}`);
                return { success: true, audioFile: audioFileId, result };
                
            } else {
                // Fallback audio playback
                const audio = new Audio(`/static/audio/${audioFileId}`);
                audio.volume = volume;
                
                return new Promise((resolve, reject) => {
                    audio.addEventListener('canplaythrough', () => {
                        audio.play()
                            .then(() => resolve({ success: true, audioFile: audioFileId }))
                            .catch(reject);
                    });
                    
                    audio.addEventListener('error', () => {
                        reject(new Error(`Failed to load audio: ${audioFileId}`));
                    });
                });
            }
        } catch (error) {
            console.warn(`Failed to play message audio ${audioFileId}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Show message to player
     * @param {Object} config - Message configuration
     * @returns {Promise<Object>} - Display result
     */
    async showMessage(config) {
        const {
            title,
            message,
            duration,
            priority,
            messageType,
            position,
            dismissible,
            icon,
            actions,
            waypoint
        } = config;

        // Create message element
        const messageElement = this.createMessageElement(config);
        
        // Add to DOM
        document.body.appendChild(messageElement);

        // Handle dismissible messages
        if (dismissible) {
            this.addDismissHandler(messageElement);
        }

        // Handle action buttons
        if (actions && actions.length > 0) {
            this.addActionHandlers(messageElement, actions);
        }

        // Auto-remove after duration (unless it has actions)
        if (!actions || actions.length === 0) {
            setTimeout(() => {
                this.removeMessage(messageElement);
            }, duration);
        }

        // Track active messages for management
        this.trackActiveMessage(messageElement, config);

        return {
            success: true,
            element: messageElement,
            duration: duration,
            messageId: messageElement.id
        };
    }

    /**
     * Create message DOM element
     * @param {Object} config - Message configuration
     * @returns {HTMLElement} - Message element
     */
    createMessageElement(config) {
        const {
            title,
            message,
            priority,
            messageType,
            position,
            dismissible,
            icon
        } = config;

        const messageElement = document.createElement('div');
        messageElement.id = `waypoint-message-${Date.now()}`;
        messageElement.className = `waypoint-message message-${messageType} priority-${priority} position-${position}`;

        // Create message content
        let content = '';
        
        // Icon
        if (icon) {
            content += `<div class="message-icon">${icon}</div>`;
        } else {
            content += `<div class="message-icon">${this.getDefaultIcon(messageType)}</div>`;
        }

        // Content area
        content += '<div class="message-content">';
        content += `<div class="message-title">${title}</div>`;
        content += `<div class="message-text">${message}</div>`;
        content += '</div>';

        // Dismiss button
        if (dismissible) {
            content += '<div class="message-dismiss" title="Dismiss">×</div>';
        }

        messageElement.innerHTML = content;

        // Apply styling
        this.applyMessageStyling(messageElement, config);
        
        // Ensure CSS styles are available
        this.ensureMessageStyles();

        return messageElement;
    }

    /**
     * Apply styling to message element
     * @param {HTMLElement} element - Message element
     * @param {Object} config - Message configuration
     */
    applyMessageStyling(element, config) {
        const { position, priority, messageType } = config;
        
        // Base styling
        element.style.cssText = `
            position: fixed;
            z-index: 10000;
            background: ${this.getMessageBackground(messageType)};
            color: ${this.getMessageColor(messageType)};
            border: 2px solid ${this.getMessageBorderColor(messageType)};
            border-radius: 8px;
            padding: 15px 20px;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            max-width: 400px;
            min-width: 200px;
            animation: messageSlideIn 0.3s ease-out;
            display: flex;
            align-items: center;
            gap: 10px;
        `;

        // Position-specific styling
        this.applyPositionStyling(element, position);
        
        // Priority-specific styling
        if (priority === MessagePriority.URGENT || priority === MessagePriority.CRITICAL) {
            element.style.animation += ', messagePulse 1s infinite';
        }
    }

    /**
     * Apply position-specific styling
     * @param {HTMLElement} element - Message element
     * @param {string} position - Display position
     */
    applyPositionStyling(element, position) {
        switch (position) {
            case DisplayPosition.TOP_CENTER:
                element.style.top = '20px';
                element.style.left = '50%';
                element.style.transform = 'translateX(-50%)';
                break;
            case DisplayPosition.TOP_LEFT:
                element.style.top = '20px';
                element.style.left = '20px';
                break;
            case DisplayPosition.TOP_RIGHT:
                element.style.top = '20px';
                element.style.right = '20px';
                break;
            case DisplayPosition.CENTER:
                element.style.top = '50%';
                element.style.left = '50%';
                element.style.transform = 'translate(-50%, -50%)';
                break;
            case DisplayPosition.BOTTOM_CENTER:
                element.style.bottom = '20px';
                element.style.left = '50%';
                element.style.transform = 'translateX(-50%)';
                break;
            case DisplayPosition.BOTTOM_LEFT:
                element.style.bottom = '20px';
                element.style.left = '20px';
                break;
            case DisplayPosition.BOTTOM_RIGHT:
                element.style.bottom = '20px';
                element.style.right = '20px';
                break;
        }
    }

    /**
     * Get default icon for message type
     * @param {string} messageType - Message type
     * @returns {string} - Icon character/HTML
     */
    getDefaultIcon(messageType) {
        switch (messageType) {
            case MessageType.INFO:
                return 'ℹ️';
            case MessageType.SUCCESS:
                return '✅';
            case MessageType.WARNING:
                return '⚠️';
            case MessageType.ERROR:
                return '❌';
            case MessageType.MISSION:
                return '🎯';
            case MessageType.SYSTEM:
                return '⚙️';
            case MessageType.DISCOVERY:
                return '🔍';
            default:
                return 'ℹ️';
        }
    }

    /**
     * Get message background color
     * @param {string} messageType - Message type
     * @returns {string} - CSS color
     */
    getMessageBackground(messageType) {
        switch (messageType) {
            case MessageType.INFO:
                return 'rgba(33, 150, 243, 0.9)';
            case MessageType.SUCCESS:
                return 'rgba(76, 175, 80, 0.9)';
            case MessageType.WARNING:
                return 'rgba(255, 152, 0, 0.9)';
            case MessageType.ERROR:
                return 'rgba(244, 67, 54, 0.9)';
            case MessageType.MISSION:
                return 'rgba(156, 39, 176, 0.9)';
            case MessageType.SYSTEM:
                return 'rgba(96, 125, 139, 0.9)';
            case MessageType.DISCOVERY:
                return 'rgba(0, 150, 136, 0.9)';
            default:
                return 'rgba(0, 0, 0, 0.9)';
        }
    }

    /**
     * Get message text color
     * @param {string} messageType - Message type
     * @returns {string} - CSS color
     */
    getMessageColor(messageType) {
        return '#ffffff'; // White text for all message types
    }

    /**
     * Get message border color
     * @param {string} messageType - Message type
     * @returns {string} - CSS color
     */
    getMessageBorderColor(messageType) {
        switch (messageType) {
            case MessageType.INFO:
                return '#2196f3';
            case MessageType.SUCCESS:
                return '#4caf50';
            case MessageType.WARNING:
                return '#ff9800';
            case MessageType.ERROR:
                return '#f44336';
            case MessageType.MISSION:
                return '#9c27b0';
            case MessageType.SYSTEM:
                return '#607d8b';
            case MessageType.DISCOVERY:
                return '#009688';
            default:
                return '#ffffff';
        }
    }

    /**
     * Add dismiss handler to message
     * @param {HTMLElement} element - Message element
     */
    addDismissHandler(element) {
        const dismissButton = element.querySelector('.message-dismiss');
        if (dismissButton) {
            dismissButton.addEventListener('click', () => {
                this.removeMessage(element);
            });
        }

        // Also allow clicking the message itself to dismiss
        element.addEventListener('click', (event) => {
            if (event.target === element || event.target.classList.contains('message-content')) {
                this.removeMessage(element);
            }
        });
    }

    /**
     * Add action button handlers
     * @param {HTMLElement} element - Message element
     * @param {Array} actions - Action configurations
     */
    addActionHandlers(element, actions) {
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'message-actions';
        
        actions.forEach(action => {
            const button = document.createElement('button');
            button.className = 'message-action-button';
            button.textContent = action.label;
            button.onclick = () => {
                this.handleMessageAction(action, element);
            };
            
            actionsContainer.appendChild(button);
        });
        
        element.appendChild(actionsContainer);
    }

    /**
     * Handle message action button click
     * @param {Object} action - Action configuration
     * @param {HTMLElement} element - Message element
     */
    handleMessageAction(action, element) {
        debug('WAYPOINTS', `🔘 Message action clicked: ${action.label}`);
        
        // Execute action callback if provided
        if (action.callback && typeof action.callback === 'function') {
            action.callback();
        }
        
        // Remove message if action specifies
        if (action.dismissMessage !== false) {
            this.removeMessage(element);
        }
    }

    /**
     * Remove message from DOM
     * @param {HTMLElement} element - Message element
     */
    removeMessage(element) {
        if (element && element.parentNode) {
            element.style.animation = 'messageSlideOut 0.3s ease-in';
            setTimeout(() => {
                if (element.parentNode) {
                    document.body.removeChild(element);
                }
                this.untrackActiveMessage(element);
            }, 300);
        }
    }

    /**
     * Track active message for management
     * @param {HTMLElement} element - Message element
     * @param {Object} config - Message configuration
     */
    trackActiveMessage(element, config) {
        if (!window.activeWaypointMessages) {
            window.activeWaypointMessages = [];
        }
        
        window.activeWaypointMessages.push({
            element: element,
            config: config,
            createdAt: new Date()
        });
    }

    /**
     * Untrack active message
     * @param {HTMLElement} element - Message element
     */
    untrackActiveMessage(element) {
        if (window.activeWaypointMessages) {
            window.activeWaypointMessages = window.activeWaypointMessages.filter(
                msg => msg.element !== element
            );
        }
    }

    /**
     * Log message for history
     * @param {Object} messageData - Message data
     */
    logMessage(messageData) {
        if (!window.messageHistory) {
            window.messageHistory = [];
        }

        window.messageHistory.push({
            ...messageData,
            id: `msg_${Date.now()}`,
            waypointId: messageData.waypoint?.id,
            waypointName: messageData.waypoint?.name
        });

        // Keep only last 50 messages
        if (window.messageHistory.length > 50) {
            window.messageHistory.shift();
        }

        debug('WAYPOINTS', `📝 Message logged: ${messageData.title}`);
    }

    /**
     * Ensure message CSS styles are available
     */
    ensureMessageStyles() {
        if (document.getElementById('waypoint-message-styles')) {
            return; // Already added
        }

        const style = document.createElement('style');
        style.id = 'waypoint-message-styles';
        style.textContent = `
            @keyframes messageSlideIn {
                0% {
                    opacity: 0;
                    transform: translateY(-20px) translateX(-50%);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0) translateX(-50%);
                }
            }
            
            @keyframes messageSlideOut {
                0% {
                    opacity: 1;
                    transform: translateY(0) translateX(-50%);
                }
                100% {
                    opacity: 0;
                    transform: translateY(-20px) translateX(-50%);
                }
            }
            
            @keyframes messagePulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.8; }
            }
            
            .waypoint-message .message-content {
                flex: 1;
            }
            
            .waypoint-message .message-title {
                font-weight: bold;
                margin-bottom: 5px;
            }
            
            .waypoint-message .message-text {
                font-weight: normal;
                opacity: 0.9;
            }
            
            .waypoint-message .message-dismiss {
                cursor: pointer;
                font-size: 18px;
                font-weight: bold;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            
            .waypoint-message .message-dismiss:hover {
                opacity: 1;
            }
            
            .waypoint-message .message-actions {
                margin-top: 10px;
                display: flex;
                gap: 10px;
            }
            
            .waypoint-message .message-action-button {
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 5px 10px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: background 0.2s;
            }
            
            .waypoint-message .message-action-button:hover {
                background: rgba(255, 255, 255, 0.3);
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Validate message parameters
     */
    validateMessageParameters() {
        const { message, duration, audioVolume } = this.parameters;

        if (!message || typeof message !== 'string') {
            throw new Error('message parameter is required and must be a string');
        }

        if (duration !== undefined && (typeof duration !== 'number' || duration <= 0)) {
            throw new Error('duration must be a positive number');
        }

        if (audioVolume !== undefined && (typeof audioVolume !== 'number' || audioVolume < 0 || audioVolume > 1)) {
            throw new Error('audioVolume must be a number between 0 and 1');
        }
    }

    /**
     * Get required parameters for this action
     * @returns {Array<string>} - Required parameter names
     */
    getRequiredParameters() {
        return ['message'];
    }

    /**
     * Get parameter types for validation
     * @returns {Object} - Parameter name to type mapping
     */
    getParameterTypes() {
        return {
            title: 'string',
            message: 'string',
            duration: 'number',
            priority: 'string',
            messageType: 'string',
            position: 'string',
            audioFileId: 'string',
            audioVolume: 'number',
            dismissible: 'boolean'
        };
    }

    /**
     * Get action summary for debugging
     * @returns {Object} - Action summary
     */
    getSummary() {
        const baseSummary = super.getSummary();
        const { title, message, messageType, audioFileId } = this.parameters;
        
        return {
            ...baseSummary,
            title: title || 'Message',
            messagePreview: message ? message.substring(0, 50) + '...' : '',
            messageType: messageType || MessageType.INFO,
            hasAudio: !!audioFileId,
            audioFile: audioFileId
        };
    }
}

export default ShowMessageAction;
