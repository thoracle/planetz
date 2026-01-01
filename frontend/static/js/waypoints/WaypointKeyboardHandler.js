/**
 * WaypointKeyboardHandler - Keyboard shortcuts for waypoint system
 * 
 * Handles W key for waypoint resumption and Shift+W for waypoint cycling.
 * Provides seamless keyboard navigation for waypoint interruption scenarios.
 */

import { debug } from '../debug.js';

// Keyboard shortcut configuration
const SHORTCUTS = {
    WAYPOINT_RESUME: 'KeyW',           // W key - Resume interrupted waypoint
    WAYPOINT_CYCLE: 'KeyW',            // Shift+W - Cycle through waypoints
    WAYPOINT_TARGET_NEXT: 'KeyN',      // N key - Target next waypoint (optional)
    WAYPOINT_CLEAR: 'Escape'           // Escape - Clear waypoint target (optional)
};

// Feedback types for user notifications
const FeedbackType = {
    SUCCESS: 'success',
    INFO: 'info',
    WARNING: 'warning',
    ERROR: 'error'
};

export class WaypointKeyboardHandler {
    constructor() {
        this.isEnabled = true;
        this.keyboardListeners = new Map();
        this.feedbackQueue = [];
        this.lastKeyPress = null;
        this.keyPressCount = 0;
        
        // Performance tracking
        this.metrics = {
            waypointResumes: 0,
            waypointCycles: 0,
            averageResponseTime: 0,
            totalResponseTime: 0
        };

        debug('WAYPOINTS', '⌨️ WaypointKeyboardHandler initialized');
        
        // Set up keyboard listeners
        this.setupKeyboardListeners();
    }

    /**
     * Set up keyboard event listeners
     */
    setupKeyboardListeners() {
        // Main keydown listener
        const keydownHandler = (event) => this.handleKeyDown(event);
        document.addEventListener('keydown', keydownHandler);
        this.keyboardListeners.set('keydown', keydownHandler);

        // Keyup listener for key release tracking
        const keyupHandler = (event) => this.handleKeyUp(event);
        document.addEventListener('keyup', keyupHandler);
        this.keyboardListeners.set('keyup', keyupHandler);

        debug('WAYPOINTS', '⌨️ Keyboard listeners registered');
    }

    /**
     * Handle keydown events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyDown(event) {
        if (!this.isEnabled) {
            return;
        }

        // Track key press timing
        const startTime = performance.now();
        this.keyPressCount++;

        try {
            // Handle different key combinations
            switch (event.code) {
                case SHORTCUTS.WAYPOINT_RESUME:
                    if (event.shiftKey) {
                        this.handleWaypointCycle(event);
                    } else {
                        this.handleWaypointResume(event);
                    }
                    break;

                case SHORTCUTS.WAYPOINT_TARGET_NEXT:
                    if (!event.shiftKey && !event.ctrlKey && !event.altKey) {
                        this.handleTargetNextWaypoint(event);
                    }
                    break;

                case SHORTCUTS.WAYPOINT_CLEAR:
                    if (!event.shiftKey && !event.ctrlKey && !event.altKey) {
                        this.handleClearWaypointTarget(event);
                    }
                    break;
            }

            // Update performance metrics
            const responseTime = performance.now() - startTime;
            this.metrics.totalResponseTime += responseTime;
            this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.keyPressCount;

        } catch (error) {
            debug('P1', `Error handling waypoint keyboard shortcut: ${error.message}`);
        }
    }

    /**
     * Handle keyup events
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleKeyUp(event) {
        // Track key release for potential future features
        this.lastKeyPress = {
            code: event.code,
            timestamp: Date.now(),
            modifiers: {
                shift: event.shiftKey,
                ctrl: event.ctrlKey,
                alt: event.altKey
            }
        };
    }

    /**
     * Handle W key - Enable target computer (like T key) then resume interrupted waypoint or target next active waypoint
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleWaypointResume(event) {
        event.preventDefault();
        
        debug('WAYPOINTS', '⌨️ W key pressed - enabling target computer and attempting waypoint resume');

        // First, ensure target computer is enabled (like T key does) - waypoints require target computer
        if (window.starfieldManager && !window.starfieldManager.isDocked) {
            const ship = window.starfieldManager.viewManager?.getShip();
            if (ship) {
                const targetComputer = ship.getSystem('target_computer');
                const energyReactor = ship.getSystem('energy_reactor');
                
                if (targetComputer && targetComputer.canActivate(ship)) {
                    // Enable target computer if it's not already enabled
                    if (!targetComputer.isActive) {
                        debug('WAYPOINTS', '🎯 W key: Enabling target computer for waypoint operations');
                        if (targetComputer.activate(ship)) {
                            window.targetComputerManager.targetComputerEnabled = true;
                            // Sync with StarfieldManager
                            window.starfieldManager.targetComputerEnabled = true;
                        } else {
                            // Failed to activate - show error and return
                            if (window.starfieldManager?.showHUDEphemeral) {
                                window.starfieldManager.showHUDEphemeral('TARGET COMPUTER FAILED', 'Insufficient energy or system damaged');
                            }
                            return;
                        }
                    }
                } else {
                    // Target computer not available - show same error as T key and return
                    if (window.starfieldManager?.showHUDEphemeral) {
                        if (!targetComputer) {
                            window.starfieldManager.showHUDEphemeral(
                                'TARGET COMPUTER UNAVAILABLE',
                                'No Target Computer card installed in ship slots'
                            );
                        } else if (!targetComputer.isOperational()) {
                            window.starfieldManager.showHUDEphemeral(
                                'TARGET COMPUTER OFFLINE',
                                `System damaged (${Math.round(targetComputer.healthPercentage * 100)}% health) - repair required`
                            );
                        } else if (!ship.hasSystemCardsSync('target_computer')) {
                            window.starfieldManager.showHUDEphemeral(
                                'TARGET COMPUTER UNAVAILABLE',
                                'No Target Computer card installed in ship slots'
                            );
                        } else if (!energyReactor || !energyReactor.isOperational()) {
                            // Energy reactor is the problem
                            if (!energyReactor) {
                                window.starfieldManager.showHUDEphemeral(
                                    'POWER FAILURE',
                                    'No Energy Reactor installed - cannot power systems'
                                );
                            } else {
                                window.starfieldManager.showHUDEphemeral(
                                    'POWER FAILURE',
                                    `Energy Reactor damaged (${Math.round(energyReactor.healthPercentage * 100)}% health) - repair required`
                                );
                            }
                        } else {
                            window.starfieldManager.showHUDEphemeral(
                                'TARGET COMPUTER FAILED',
                                'Insufficient energy for targeting systems'
                            );
                        }
                    }
                    return;
                }
            }
        }

        // Try to resume interrupted waypoint first
        if (window.targetComputerManager?.hasInterruptedWaypoint()) {
            const resumed = window.targetComputerManager.resumeInterruptedWaypoint();
            if (resumed) {
                this.metrics.waypointResumes++;
                this.showFeedback('Waypoint resumed', FeedbackType.SUCCESS);
                
                debug('WAYPOINTS', '✅ Interrupted waypoint resumed successfully');
                return;
            }
        }

        // Otherwise target next active waypoint
        const nextWaypoint = window.waypointManager?.getNextActiveWaypoint();
        if (nextWaypoint) {
            if (window.targetComputerManager?.targetWaypointViaCycle) {
                window.targetComputerManager.targetWaypointViaCycle(nextWaypoint.id);
            } else if (window.targetComputerManager?.setVirtualTarget) {
                // Fallback for backward compatibility
                window.targetComputerManager.setVirtualTarget(nextWaypoint.id);
                
                debug('WAYPOINTS', `🎯 Targeting next waypoint: ${nextWaypoint.name}`);
            } else {
                // Use ephemeral HUD for waypoint messages
                if (window.starfieldManager?.showHUDEphemeral) {
                    window.starfieldManager.showHUDEphemeral('SYSTEM ERROR', 'Target Computer not available');
                }
            }
        } else {
            // Use ephemeral HUD for waypoint messages
            if (window.starfieldManager?.showHUDEphemeral) {
                window.starfieldManager.showHUDEphemeral('NO WAYPOINTS', 'No active waypoints available');
            }
            debug('WAYPOINTS', '⚠️ No active waypoints to target');
        }
    }

    /**
     * Handle Shift+W - Cycle through all active waypoints
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleWaypointCycle(event) {
        event.preventDefault();
        
        debug('WAYPOINTS', '⌨️ Shift+W pressed - cycling waypoints');

        // Get all active waypoints
        const activeWaypoints = window.waypointManager?.getActiveWaypoints() || [];
        if (activeWaypoints.length === 0) {
            // Use ephemeral HUD for waypoint messages
            if (window.starfieldManager?.showHUDEphemeral) {
                window.starfieldManager.showHUDEphemeral('NO WAYPOINTS', 'No active waypoints to cycle');
            }
            return;
        }

        // Find current waypoint index
        const currentTarget = window.targetComputerManager?.currentTarget;
        let nextIndex = 0;

        if (currentTarget && currentTarget.type === 'waypoint') {
            const currentIndex = activeWaypoints.findIndex(w => w.id === currentTarget.id);
            if (currentIndex !== -1) {
                nextIndex = (currentIndex + 1) % activeWaypoints.length;
            }
        }

        // Target next waypoint in cycle
        const nextWaypoint = activeWaypoints[nextIndex];
        if (window.targetComputerManager?.targetWaypointViaCycle) {
            window.targetComputerManager.targetWaypointViaCycle(nextWaypoint.id);
        } else if (window.targetComputerManager?.setVirtualTarget) {
            // Fallback for backward compatibility
            window.targetComputerManager.setVirtualTarget(nextWaypoint.id);
            this.metrics.waypointCycles++;
            
            const cycleInfo = `${nextIndex + 1}/${activeWaypoints.length}`;
            
            debug('WAYPOINTS', `🔄 Cycled to waypoint: ${nextWaypoint.name} (${cycleInfo})`);
        } else {
            // Use ephemeral HUD for waypoint messages
            if (window.starfieldManager?.showHUDEphemeral) {
                window.starfieldManager.showHUDEphemeral('SYSTEM ERROR', 'Target Computer not available');
            }
        }
    }

    /**
     * Handle N key - Target next waypoint (alternative to W key)
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleTargetNextWaypoint(event) {
        event.preventDefault();
        
        debug('WAYPOINTS', '⌨️ N key pressed - targeting next waypoint');

        const nextWaypoint = window.waypointManager?.getNextActiveWaypoint();
        if (nextWaypoint && window.targetComputerManager?.targetWaypointViaCycle) {
            window.targetComputerManager.targetWaypointViaCycle(nextWaypoint.id);
        } else if (nextWaypoint && window.targetComputerManager?.setVirtualTarget) {
            // Fallback for backward compatibility
            window.targetComputerManager.setVirtualTarget(nextWaypoint.id);
        } else {
            // Use ephemeral HUD for waypoint messages
            if (window.starfieldManager?.showHUDEphemeral) {
                window.starfieldManager.showHUDEphemeral('NO WAYPOINTS', 'No waypoints available');
            }
        }
    }

    /**
     * Handle Escape key - Clear waypoint target
     * @param {KeyboardEvent} event - Keyboard event
     */
    handleClearWaypointTarget(event) {
        const currentTarget = window.targetComputerManager?.currentTarget;
        
        if (currentTarget && currentTarget.type === 'waypoint') {
            event.preventDefault();
            
            if (window.targetComputerManager.clearCurrentTarget) {
                window.targetComputerManager.clearCurrentTarget();
                
                debug('WAYPOINTS', '🎯 Waypoint target cleared');
            }
        }
    }

    /**
     * Show user feedback for keyboard actions
     * @param {string} message - Feedback message
     * @param {string} type - Feedback type
     */
    showFeedback(message, type) {
        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = `waypoint-keyboard-feedback waypoint-feedback-${type}`;
        feedback.textContent = message;
        
        // Style the feedback
        feedback.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${this.getFeedbackColor(type)};
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 9999;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
            animation: waypointFeedbackFade 2s ease-out forwards;
        `;

        // Add CSS animation if not already present
        this.ensureFeedbackStyles();

        // Add to DOM
        document.body.appendChild(feedback);
        this.feedbackQueue.push(feedback);

        // Remove after animation
        setTimeout(() => {
            if (feedback.parentNode) {
                document.body.removeChild(feedback);
            }
            
            // Remove from queue
            const index = this.feedbackQueue.indexOf(feedback);
            if (index > -1) {
                this.feedbackQueue.splice(index, 1);
            }
        }, 2000);

        debug('WAYPOINTS', `💬 Feedback shown: ${message} (${type})`);
    }

    /**
     * Get feedback color based on type
     * @param {string} type - Feedback type
     * @returns {string} - CSS color
     */
    getFeedbackColor(type) {
        switch (type) {
            case FeedbackType.SUCCESS:
                return 'rgba(76, 175, 80, 0.9)';   // Green
            case FeedbackType.INFO:
                return 'rgba(33, 150, 243, 0.9)';  // Blue
            case FeedbackType.WARNING:
                return 'rgba(255, 152, 0, 0.9)';   // Orange
            case FeedbackType.ERROR:
                return 'rgba(244, 67, 54, 0.9)';   // Red
            default:
                return 'rgba(0, 0, 0, 0.8)';       // Black
        }
    }

    /**
     * Ensure feedback CSS animation is available
     */
    ensureFeedbackStyles() {
        if (document.getElementById('waypoint-feedback-styles')) {
            return; // Already added
        }

        const style = document.createElement('style');
        style.id = 'waypoint-feedback-styles';
        style.textContent = `
            @keyframes waypointFeedbackFade {
                0% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
                20% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                80% {
                    opacity: 1;
                    transform: translate(-50%, -50%) scale(1);
                }
                100% {
                    opacity: 0;
                    transform: translate(-50%, -50%) scale(0.8);
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Enable keyboard handling
     */
    enable() {
        this.isEnabled = true;
        debug('WAYPOINTS', '⌨️ Keyboard handler enabled');
    }

    /**
     * Disable keyboard handling
     */
    disable() {
        this.isEnabled = false;
        debug('WAYPOINTS', '⌨️ Keyboard handler disabled');
    }

    /**
     * Check if keyboard handling is enabled
     * @returns {boolean} - Whether enabled
     */
    isHandlerEnabled() {
        return this.isEnabled;
    }

    /**
     * Get keyboard shortcut help text
     * @returns {Array} - Array of shortcut descriptions
     */
    getShortcutHelp() {
        return [
            {
                key: 'W',
                description: 'Resume interrupted waypoint or target next waypoint',
                category: 'Waypoint Navigation'
            },
            {
                key: 'Shift + W',
                description: 'Cycle through all active waypoints',
                category: 'Waypoint Navigation'
            },
            {
                key: 'N',
                description: 'Target next available waypoint',
                category: 'Waypoint Navigation'
            },
            {
                key: 'Escape',
                description: 'Clear current waypoint target',
                category: 'Waypoint Navigation'
            }
        ];
    }

    /**
     * Get keyboard handler metrics
     * @returns {Object} - Handler metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            totalKeyPresses: this.keyPressCount,
            isEnabled: this.isEnabled,
            activeFeedback: this.feedbackQueue.length,
            lastKeyPress: this.lastKeyPress
        };
    }

    /**
     * Reset metrics
     */
    resetMetrics() {
        this.metrics = {
            waypointResumes: 0,
            waypointCycles: 0,
            averageResponseTime: 0,
            totalResponseTime: 0
        };
        
        this.keyPressCount = 0;
        debug('WAYPOINTS', '📊 Keyboard handler metrics reset');
    }

    /**
     * Cleanup keyboard listeners
     */
    cleanup() {
        // Remove event listeners
        for (const [eventType, handler] of this.keyboardListeners) {
            document.removeEventListener(eventType, handler);
        }
        
        this.keyboardListeners.clear();

        // Clear any remaining feedback
        this.feedbackQueue.forEach(feedback => {
            if (feedback.parentNode) {
                document.body.removeChild(feedback);
            }
        });
        
        this.feedbackQueue = [];

        debug('WAYPOINTS', '🧹 Keyboard handler cleaned up');
    }

    /**
     * Test keyboard shortcuts (for debugging)
     */
    testShortcuts() {
        debug('WAYPOINTS', '🧪 Testing keyboard shortcuts...');
        
        // Simulate key presses for testing
        const testKeys = [
            { code: 'KeyW', shiftKey: false, description: 'W key (resume/target)' },
            { code: 'KeyW', shiftKey: true, description: 'Shift+W (cycle)' },
            { code: 'KeyN', shiftKey: false, description: 'N key (next)' }
        ];

        testKeys.forEach((testKey, index) => {
            setTimeout(() => {
                debug('WAYPOINTS', `🧪 Testing: ${testKey.description}`);
                
                const mockEvent = {
                    code: testKey.code,
                    shiftKey: testKey.shiftKey,
                    ctrlKey: false,
                    altKey: false,
                    preventDefault: () => {}
                };
                
                this.handleKeyDown(mockEvent);
            }, index * 1000);
        });
    }
    
    /**
     * Alias methods for backward compatibility with tests
     */
    handleWaypointKey(event) {
        return this.handleWaypointResume(event);
    }
    
    handleNextWaypointKey(event) {
        return this.handleWaypointCycle(event);
    }
}

// Global keyboard handler instance
let keyboardHandlerInstance = null;

/**
 * Get or create global keyboard handler instance
 * @returns {WaypointKeyboardHandler} - Keyboard handler instance
 */
export function getWaypointKeyboardHandler() {
    if (!keyboardHandlerInstance) {
        keyboardHandlerInstance = new WaypointKeyboardHandler();
        
        // Make available globally for debugging
        window.waypointKeyboardHandler = keyboardHandlerInstance;
    }
    return keyboardHandlerInstance;
}

// Initialize keyboard handler when module is loaded
export default getWaypointKeyboardHandler();
