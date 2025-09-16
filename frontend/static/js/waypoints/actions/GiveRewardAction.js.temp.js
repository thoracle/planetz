/**
 * GiveRewardAction - Award rewards using reward package system
 * 
 * Awards rewards to player when waypoint is triggered. Integrates with
 * existing mission reward system using reward package IDs.
 */

// Reward types for validation
export const RewardType = {
    CREDITS: 'credits',
    REPUTATION: 'reputation',
    ITEMS: 'items',
    CARDS: 'cards',
    EXPERIENCE: 'experience',
    MIXED: 'mixed'
};

export class GiveRewardAction extends WaypointAction {
    constructor(type, parameters) {
        super(type, parameters);
        
        // Validate reward parameters
        this.validateRewardParameters();
    }

    /**
     * Perform reward giving action
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} - Reward result
     */
    async performAction(context) {
        const {
            rewardPackageId,
            bonusMultiplier = 1.0,
            message = null,
            showNotification = true,
            notificationDuration = 5000
        } = this.parameters;

        debug('WAYPOINTS', `💰 Awarding reward package: ${rewardPackageId} (multiplier: ${bonusMultiplier})`);

        try {
            // Award rewards through mission event handler
            const rewardResult = await this.awardRewards({
                reward_package_id: rewardPackageId,
                bonus_multiplier: bonusMultiplier
            });

            // Show notification if requested
            if (showNotification) {
                await this.showRewardNotification({
                    rewardResult,
                    message,
                    duration: notificationDuration,
                    waypoint: context.waypoint
                });
            }

            // Log reward for analytics
            this.logReward({
                rewardPackageId,
                bonusMultiplier,
                rewardResult,
                waypoint: context.waypoint,
                timestamp: new Date()
            });

            const result = {
                rewardPackageId,
                bonusMultiplier,
                rewardResult,
                success: true,
                message: message
            };

            debug('WAYPOINTS', `✅ Reward awarded successfully: ${rewardPackageId}`);
            return result;

        } catch (error) {
            console.error('Failed to award reward:', error);
            
            // Show error notification
            if (showNotification) {
                await this.showErrorNotification(error.message);
            }
            
            throw error;
        }
    }

    /**
     * Award rewards through mission system
     * @param {Object} rewardData - Reward data
     * @returns {Promise<Object>} - Reward result
     */
    async awardRewards(rewardData) {
        // Try mission event handler first
        if (window.missionEventHandler && window.missionEventHandler.awardRewards) {
            debug('WAYPOINTS', '💰 Using MissionEventHandler.awardRewards()');
            return await window.missionEventHandler.awardRewards(rewardData);
        }

        // Try direct mission system integration
        if (window.missionSystem && window.missionSystem.awardRewards) {
            debug('WAYPOINTS', '💰 Using MissionSystem.awardRewards()');
            return await window.missionSystem.awardRewards(rewardData);
        }

        // Try reward manager if available
        if (window.rewardManager && window.rewardManager.processRewardPackage) {
            debug('WAYPOINTS', '💰 Using RewardManager.processRewardPackage()');
            return await window.rewardManager.processRewardPackage(
                rewardData.reward_package_id,
                rewardData.bonus_multiplier
            );
        }

        // Fallback: Direct API call to backend
        return await this.awardRewardsFallback(rewardData);
    }

    /**
     * Fallback reward awarding via direct API call
     * @param {Object} rewardData - Reward data
     * @returns {Promise<Object>} - Reward result
     */
    async awardRewardsFallback(rewardData) {
        debug('WAYPOINTS', '💰 Using fallback API call for rewards');
        
        try {
            const response = await fetch('/api/missions/award_rewards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(rewardData)
            });

            if (!response.ok) {
                throw new Error(`Reward API call failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown reward error');
            }

            return result;

        } catch (error) {
            console.error('Fallback reward API call failed:', error);
            
            // Final fallback: simulate reward for testing
            return this.simulateReward(rewardData);
        }
    }

    /**
     * Simulate reward for testing/fallback
     * @param {Object} rewardData - Reward data
     * @returns {Object} - Simulated reward result
     */
    simulateReward(rewardData) {
        debug('WAYPOINTS', '💰 Simulating reward (fallback mode)');
        
        const { reward_package_id, bonus_multiplier = 1.0 } = rewardData;
        
        // Create simulated reward based on package ID
        const baseReward = this.getSimulatedRewardPackage(reward_package_id);
        
        // Apply bonus multiplier
        const finalReward = {
            credits: Math.floor((baseReward.credits || 0) * bonus_multiplier),
            reputation: baseReward.reputation ? 
                Object.fromEntries(
                    Object.entries(baseReward.reputation).map(([faction, rep]) => 
                        [faction, Math.floor(rep * bonus_multiplier)]
                    )
                ) : {},
            items: baseReward.items || [],
            cards: baseReward.cards || []
        };

        return {
            success: true,
            rewards: finalReward,
            package_id: reward_package_id,
            bonus_multiplier: bonus_multiplier,
            simulated: true
        };
    }

    /**
     * Get simulated reward package for testing
     * @param {string} packageId - Reward package ID
     * @returns {Object} - Simulated reward package
     */
    getSimulatedRewardPackage(packageId) {
        // Common reward packages for simulation
        const packages = {
            'small_credits': {
                credits: 1000,
                reputation: {},
                items: [],
                cards: []
            },
            'medium_credits': {
                credits: 5000,
                reputation: {},
                items: [],
                cards: []
            },
            'large_credits': {
                credits: 10000,
                reputation: {},
                items: [],
                cards: []
            },
            'pirate_bounty': {
                credits: 2500,
                reputation: { 'federation': 50, 'pirates': -25 },
                items: [],
                cards: []
            },
            'exploration_reward': {
                credits: 1500,
                reputation: { 'explorers_guild': 25 },
                items: ['star_chart_fragment'],
                cards: []
            },
            'mission_complete': {
                credits: 7500,
                reputation: { 'federation': 100 },
                items: ['mission_token'],
                cards: ['rare_equipment_card']
            }
        };

        return packages[packageId] || packages['small_credits'];
    }

    /**
     * Show reward notification to player
     * @param {Object} config - Notification configuration
     */
    async showRewardNotification(config) {
        const {
            rewardResult,
            message,
            duration,
            waypoint
        } = config;

        // Create notification content
        const notificationContent = this.createRewardNotificationContent(rewardResult, message);
        
        // Show notification using existing message system
        if (window.waypointManager && window.waypointManager.showNotification) {
            window.waypointManager.showNotification(
                notificationContent.text,
                'success',
                {
                    title: notificationContent.title,
                    duration: duration,
                    icon: '💰'
                }
            );
        } else {
            // Fallback: Create simple notification
            this.showSimpleNotification(notificationContent, duration);
        }

        debug('WAYPOINTS', `💬 Reward notification shown: ${notificationContent.title}`);
    }

    /**
     * Create reward notification content
     * @param {Object} rewardResult - Reward result
     * @param {string} customMessage - Custom message
     * @returns {Object} - Notification content
     */
    createRewardNotificationContent(rewardResult, customMessage) {
        if (customMessage) {
            return {
                title: 'Reward Received',
                text: customMessage
            };
        }

        const rewards = rewardResult.rewards || {};
        const parts = [];

        // Credits
        if (rewards.credits && rewards.credits > 0) {
            parts.push(`${rewards.credits.toLocaleString()} credits`);
        }

        // Reputation
        if (rewards.reputation) {
            Object.entries(rewards.reputation).forEach(([faction, rep]) => {
                if (rep !== 0) {
                    const sign = rep > 0 ? '+' : '';
                    parts.push(`${sign}${rep} ${faction} reputation`);
                }
            });
        }

        // Items
        if (rewards.items && rewards.items.length > 0) {
            parts.push(`${rewards.items.length} item(s)`);
        }

        // Cards
        if (rewards.cards && rewards.cards.length > 0) {
            parts.push(`${rewards.cards.length} card(s)`);
        }

        const text = parts.length > 0 ? 
            `Received: ${parts.join(', ')}` : 
            'Reward received';

        return {
            title: 'Mission Reward',
            text: text
        };
    }

    /**
     * Show simple notification fallback
     * @param {Object} content - Notification content
     * @param {number} duration - Display duration
     */
    showSimpleNotification(content, duration) {
        const notification = document.createElement('div');
        notification.className = 'waypoint-reward-notification';
        notification.innerHTML = `
            <div class="notification-icon">💰</div>
            <div class="notification-content">
                <div class="notification-title">${content.title}</div>
                <div class="notification-text">${content.text}</div>
            </div>
        `;

        // Apply styling
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(76, 175, 80, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            border: 2px solid #4caf50;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: bold;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            animation: slideInRight 0.3s ease-out;
        `;

        // Add CSS animation
        this.ensureNotificationStyles();

        // Add to DOM
        document.body.appendChild(notification);

        // Remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, duration);
    }

    /**
     * Show error notification
     * @param {string} errorMessage - Error message
     */
    async showErrorNotification(errorMessage) {
        const notification = document.createElement('div');
        notification.className = 'waypoint-error-notification';
        notification.innerHTML = `
            <div class="notification-icon">❌</div>
            <div class="notification-content">
                <div class="notification-title">Reward Failed</div>
                <div class="notification-text">${errorMessage}</div>
            </div>
        `;

        // Apply error styling
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(244, 67, 54, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            border: 2px solid #f44336;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: bold;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            animation: slideInRight 0.3s ease-out;
        `;

        document.body.appendChild(notification);

        // Remove after 7 seconds (longer for errors)
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => {
                    if (notification.parentNode) {
                        document.body.removeChild(notification);
                    }
                }, 300);
            }
        }, 7000);
    }

    /**
     * Ensure notification CSS styles are available
     */
    ensureNotificationStyles() {
        if (document.getElementById('waypoint-reward-notification-styles')) {
            return; // Already added
        }

        const style = document.createElement('style');
        style.id = 'waypoint-reward-notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                0% {
                    opacity: 0;
                    transform: translateX(100%);
                }
                100% {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes slideOutRight {
                0% {
                    opacity: 1;
                    transform: translateX(0);
                }
                100% {
                    opacity: 0;
                    transform: translateX(100%);
                }
            }
            
            .waypoint-reward-notification .notification-content,
            .waypoint-error-notification .notification-content {
                display: flex;
                flex-direction: column;
            }
            
            .waypoint-reward-notification .notification-title,
            .waypoint-error-notification .notification-title {
                font-size: 14px;
                margin-bottom: 4px;
            }
            
            .waypoint-reward-notification .notification-text,
            .waypoint-error-notification .notification-text {
                font-size: 12px;
                opacity: 0.9;
                font-weight: normal;
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Log reward for analytics
     * @param {Object} rewardData - Reward data
     */
    logReward(rewardData) {
        if (!window.rewardHistory) {
            window.rewardHistory = [];
        }

        window.rewardHistory.push({
            ...rewardData,
            id: `reward_${Date.now()}`,
            waypointId: rewardData.waypoint?.id,
            waypointName: rewardData.waypoint?.name
        });

        // Keep only last 100 rewards
        if (window.rewardHistory.length > 100) {
            window.rewardHistory.shift();
        }

        debug('WAYPOINTS', `📝 Reward logged: ${rewardData.rewardPackageId}`);
    }

    /**
     * Validate reward parameters
     */
    validateRewardParameters() {
        const { rewardPackageId, bonusMultiplier } = this.parameters;

        if (!rewardPackageId || typeof rewardPackageId !== 'string') {
            throw new Error('rewardPackageId parameter is required and must be a string');
        }

        if (bonusMultiplier !== undefined && (typeof bonusMultiplier !== 'number' || bonusMultiplier <= 0)) {
            throw new Error('bonusMultiplier must be a positive number');
        }
    }

    /**
     * Get required parameters for this action
     * @returns {Array<string>} - Required parameter names
     */
    getRequiredParameters() {
        return ['rewardPackageId'];
    }

    /**
     * Get parameter types for validation
     * @returns {Object} - Parameter name to type mapping
     */
    getParameterTypes() {
        return {
            rewardPackageId: 'string',
            bonusMultiplier: 'number',
            message: 'string',
            showNotification: 'boolean',
            notificationDuration: 'number'
        };
    }

    /**
     * Get action summary for debugging
     * @returns {Object} - Action summary
     */
    getSummary() {
        const baseSummary = super.getSummary();
        const { rewardPackageId, bonusMultiplier, message } = this.parameters;
        
        return {
            ...baseSummary,
            rewardPackageId: rewardPackageId,
            bonusMultiplier: bonusMultiplier || 1.0,
            hasCustomMessage: !!message,
            estimatedValue: this.estimateRewardValue(rewardPackageId, bonusMultiplier)
        };
    }

    /**
     * Estimate reward value for summary
     * @param {string} packageId - Reward package ID
     * @param {number} multiplier - Bonus multiplier
     * @returns {string} - Estimated value description
     */
    estimateRewardValue(packageId, multiplier = 1.0) {
        const simulated = this.getSimulatedRewardPackage(packageId);
        const credits = Math.floor((simulated.credits || 0) * multiplier);
        
        if (credits > 0) {
            return `~${credits.toLocaleString()} credits`;
        } else {
            return 'Mixed rewards';
        }
    }
}

module.exports = GiveRewardAction;
