/**
 * Achievement System
 * 
 * Manages player achievements, progress tracking, and notifications.
 * Supports multi-tier achievements with progressive rewards.
 */

import { debug } from '../debug.js';

// Achievement categories
export const ACHIEVEMENT_CATEGORIES = {
    EXPLORATION: 'exploration',
    COMBAT: 'combat',
    TRADING: 'trading',
    MISSIONS: 'missions',
    COLLECTION: 'collection'
};

// Achievement tiers for progressive achievements
export const ACHIEVEMENT_TIERS = {
    BRONZE: { name: 'Bronze', color: '#CD7F32', icon: '🥉' },
    SILVER: { name: 'Silver', color: '#C0C0C0', icon: '🥈' },
    GOLD: { name: 'Gold', color: '#FFD700', icon: '🥇' },
    PLATINUM: { name: 'Platinum', color: '#E5E4E2', icon: '💎' },
    LEGENDARY: { name: 'Legendary', color: '#FF6B35', icon: '🏆' }
};

/**
 * Achievement System Class
 */
export class AchievementSystem {
    constructor() {
        this.achievements = new Map();
        this.playerProgress = new Map();
        this.unlockedAchievements = new Set();
        
        // Initialize achievement definitions
        this.initializeAchievements();
        
        // Load saved progress
        this.loadProgress();
        
        // Set global reference
        window.achievementSystem = this;
        
        // Add global debug functions (using P1 channel for always-visible output)
        window.checkAchievements = () => {
            debug('P1', '🏆 Achievement System Status:');
            debug('P1', `Total achievements: ${this.achievements.size}`);
            debug('P1', `Unlocked achievements: ${this.unlockedAchievements.size}`);
            debug('P1', 'Achievement progress:');
            this.achievements.forEach((achievement, id) => {
                const progress = this.playerProgress.get(id);
                debug('P1', `  ${achievement.name}: ${progress.current}/${achievement.requirements.target} ${progress.unlocked ? '✅' : '⏳'}`);
            });
            return this.getStatistics();
        };

        window.testAchievement = (discoveryCount) => {
            debug('P1', `🧪 Testing achievement system with ${discoveryCount} discoveries`);
            this.updateDiscoveryProgress(discoveryCount);
        };

        window.testNotification = () => {
            debug('P1', '🧪 Testing achievement notification system');
            if (window.starfieldManager && window.starfieldManager.showHUDEphemeral) {
                debug('P1', '✅ StarfieldManager found, showing test notification');
                window.starfieldManager.showHUDEphemeral(
                    '🏆 Test Achievement!',
                    '🥉 This is a test notification',
                    5000
                );
            } else {
                debug('P1', '❌ StarfieldManager or showHUDEphemeral not available');
                debug('P1', 'StarfieldManager available:', !!window.starfieldManager);
                debug('P1', 'showHUDEphemeral available:', !!(window.starfieldManager && window.starfieldManager.showHUDEphemeral));
            }
        };

        // Debug helper to fix corrupted achievements
        window.fixAchievements = () => {
            debug('P1', '🔧 Manually validating and fixing achievement data...');
            this.validateAchievementData();
            debug('P1', '✅ Achievement validation complete');
            return this.getStatistics();
        };
        
        debug('ACHIEVEMENTS', '🏆 Achievement system initialized');
    }
    
    /**
     * Initialize all achievement definitions
     */
    initializeAchievements() {
        // Discovery achievements with multiple tiers
        this.registerAchievement({
            id: 'explorer_novice',
            category: ACHIEVEMENT_CATEGORIES.EXPLORATION,
            name: 'Cosmic Explorer',
            description: 'Discover 5 objects in the Sol system',
            tier: ACHIEVEMENT_TIERS.BRONZE,
            requirements: {
                type: 'discovery_count',
                target: 5
            },
            rewards: {
                credits: 500,
                title: 'Novice Explorer'
            }
        });
        
        this.registerAchievement({
            id: 'explorer_apprentice',
            category: ACHIEVEMENT_CATEGORIES.EXPLORATION,
            name: 'System Surveyor',
            description: 'Discover 10 objects in the Sol system',
            tier: ACHIEVEMENT_TIERS.SILVER,
            requirements: {
                type: 'discovery_count',
                target: 10
            },
            rewards: {
                credits: 1500,
                title: 'System Surveyor'
            }
        });
        
        this.registerAchievement({
            id: 'explorer_veteran',
            category: ACHIEVEMENT_CATEGORIES.EXPLORATION,
            name: 'Stellar Cartographer',
            description: 'Discover 15 objects in the Sol system',
            tier: ACHIEVEMENT_TIERS.GOLD,
            requirements: {
                type: 'discovery_count',
                target: 15
            },
            rewards: {
                credits: 3000,
                title: 'Stellar Cartographer'
            }
        });
        
        this.registerAchievement({
            id: 'explorer_master',
            category: ACHIEVEMENT_CATEGORIES.EXPLORATION,
            name: 'Master Navigator',
            description: 'Discover 20 objects in the Sol system',
            tier: ACHIEVEMENT_TIERS.PLATINUM,
            requirements: {
                type: 'discovery_count',
                target: 20
            },
            rewards: {
                credits: 5000,
                title: 'Master Navigator'
            }
        });
        
        this.registerAchievement({
            id: 'explorer_legend',
            category: ACHIEVEMENT_CATEGORIES.EXPLORATION,
            name: 'Legendary Explorer',
            description: 'Discover all 27 objects in the Sol system',
            tier: ACHIEVEMENT_TIERS.LEGENDARY,
            requirements: {
                type: 'discovery_count',
                target: 27
            },
            rewards: {
                credits: 10000,
                title: 'Legendary Explorer',
                special: 'Unique ship paint scheme'
            }
        });
        
        debug('ACHIEVEMENTS', `📋 Registered ${this.achievements.size} achievements`);
    }
    
    /**
     * Register a new achievement
     */
    registerAchievement(achievementData) {
        this.achievements.set(achievementData.id, achievementData);
        
        // Initialize progress tracking
        if (!this.playerProgress.has(achievementData.id)) {
            this.playerProgress.set(achievementData.id, {
                current: 0,
                unlocked: false,
                unlockedAt: null
            });
        }
    }
    
    /**
     * Update progress for discovery-based achievements
     */
    updateDiscoveryProgress(discoveryCount) {
        // Check all discovery achievements
        const discoveryAchievements = Array.from(this.achievements.values())
            .filter(achievement => achievement.requirements.type === 'discovery_count');
        
        discoveryAchievements.forEach(achievement => {
            const progress = this.playerProgress.get(achievement.id);
            
            if (!progress.unlocked && discoveryCount >= achievement.requirements.target) {
                this.unlockAchievement(achievement.id);
            } else {
                // Update progress
                progress.current = discoveryCount;
                this.saveProgress();
            }
        });
    }
    
    /**
     * Unlock an achievement
     */
    unlockAchievement(achievementId) {
        const achievement = this.achievements.get(achievementId);
        const progress = this.playerProgress.get(achievementId);
        
        if (!achievement || progress.unlocked) {
            return false;
        }
        
        // Mark as unlocked
        progress.unlocked = true;
        progress.unlockedAt = new Date().toISOString();
        progress.current = achievement.requirements.target;
        
        this.unlockedAchievements.add(achievementId);
        
        // Award rewards
        this.awardRewards(achievement);
        
        // Show notification
        this.showAchievementNotification(achievement);
        
        // Save progress
        this.saveProgress();
        
        debug('ACHIEVEMENTS', `🏆 Achievement unlocked: ${achievement.name}`);
        
        return true;
    }
    
    /**
     * Award achievement rewards
     */
    awardRewards(achievement) {
        if (achievement.rewards.credits && window.playerCredits) {
            window.playerCredits.addCredits(achievement.rewards.credits);
            debug('ACHIEVEMENTS', `💰 Awarded ${achievement.rewards.credits} credits`);
        }
        
        // TODO: Implement title system
        if (achievement.rewards.title) {
            debug('ACHIEVEMENTS', `🎖️ Earned title: ${achievement.rewards.title}`);
        }
        
        // TODO: Implement special rewards
        if (achievement.rewards.special) {
            debug('ACHIEVEMENTS', `✨ Special reward: ${achievement.rewards.special}`);
        }
    }
    
    /**
     * Show achievement unlock notification
     */
    showAchievementNotification(achievement) {
        debug('P1', `🎉 Showing achievement notification for: ${achievement.name}`);
        
        if (window.starfieldManager && window.starfieldManager.showHUDEphemeral) {
            const tier = achievement.tier;
            const message = `${tier.icon} ${achievement.name} - ${achievement.description}`;
            
            debug('P1', `📢 Calling showHUDEphemeral with: ${message}`);
            
            window.starfieldManager.showHUDEphemeral(
                '🏆 Achievement Unlocked!',
                message,
                8000 // Show for 8 seconds
            );
        } else {
            debug('P1', '❌ StarfieldManager or showHUDEphemeral not available for notifications');
        }
    }
    
    /**
     * Get achievement progress for display
     */
    getAchievementProgress(achievementId) {
        const achievement = this.achievements.get(achievementId);
        const progress = this.playerProgress.get(achievementId);
        
        if (!achievement || !progress) {
            return null;
        }
        
        // Double-check unlock status to prevent display bugs
        const actuallyUnlocked = progress.unlocked && progress.current >= achievement.requirements.target;
        
        return {
            ...achievement,
            progress: {
                current: progress.current,
                target: achievement.requirements.target,
                percentage: Math.min(100, (progress.current / achievement.requirements.target) * 100),
                unlocked: actuallyUnlocked,
                unlockedAt: actuallyUnlocked ? progress.unlockedAt : null
            }
        };
    }
    
    /**
     * Get all achievements for a category
     */
    getAchievementsByCategory(category) {
        return Array.from(this.achievements.values())
            .filter(achievement => achievement.category === category)
            .map(achievement => this.getAchievementProgress(achievement.id))
            .sort((a, b) => a.requirements.target - b.requirements.target);
    }
    
    /**
     * Get achievement statistics
     */
    getStatistics() {
        const total = this.achievements.size;
        const unlocked = this.unlockedAchievements.size;
        const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;
        
        return {
            total,
            unlocked,
            percentage,
            categories: Object.values(ACHIEVEMENT_CATEGORIES).map(category => ({
                name: category,
                achievements: this.getAchievementsByCategory(category)
            }))
        };
    }
    
    /**
     * Save progress to localStorage
     */
    saveProgress() {
        try {
            const progressData = {
                playerProgress: Array.from(this.playerProgress.entries()),
                unlockedAchievements: Array.from(this.unlockedAchievements),
                lastUpdated: new Date().toISOString()
            };
            
            localStorage.setItem('planetz_achievements', JSON.stringify(progressData));
        } catch (error) {
            debug('ACHIEVEMENTS', '❌ Failed to save achievement progress:', error);
        }
    }
    
    /**
     * Load progress from localStorage
     */
    loadProgress() {
        try {
            const saved = localStorage.getItem('planetz_achievements');
            if (saved) {
                const progressData = JSON.parse(saved);
                
                // Restore progress
                this.playerProgress = new Map(progressData.playerProgress || []);
                this.unlockedAchievements = new Set(progressData.unlockedAchievements || []);
                
                // Validate loaded data - fix any corrupted achievements
                this.validateAchievementData();
                
                debug('ACHIEVEMENTS', `📂 Loaded progress: ${this.unlockedAchievements.size} achievements unlocked`);
            }
        } catch (error) {
            debug('ACHIEVEMENTS', '❌ Failed to load achievement progress:', error);
        }
    }

    /**
     * Validate achievement data and fix any corruption
     */
    validateAchievementData() {
        let fixedCount = 0;
        
        this.achievements.forEach((achievement, id) => {
            const progress = this.playerProgress.get(id);
            if (progress) {
                // Check if achievement is marked as unlocked but doesn't meet requirements
                if (progress.unlocked && progress.current < achievement.requirements.target) {
                    debug('ACHIEVEMENTS', `🔧 Fixing corrupted achievement: ${achievement.name} (${progress.current}/${achievement.requirements.target})`);
                    progress.unlocked = false;
                    progress.unlockedAt = null;
                    this.unlockedAchievements.delete(id);
                    fixedCount++;
                }
            }
        });
        
        if (fixedCount > 0) {
            debug('ACHIEVEMENTS', `🔧 Fixed ${fixedCount} corrupted achievements`);
            this.saveProgress();
        }
    }
    
    /**
     * Reset all achievements (for testing)
     */
    resetAchievements() {
        this.playerProgress.clear();
        this.unlockedAchievements.clear();
        
        // Reinitialize progress for all achievements
        this.achievements.forEach((achievement, id) => {
            this.playerProgress.set(id, {
                current: 0,
                unlocked: false,
                unlockedAt: null
            });
        });
        
        this.saveProgress();
        debug('ACHIEVEMENTS', '🔄 All achievements reset');
    }
}

// Initialize singleton instance
let achievementSystemInstance = null;

export function getAchievementSystem() {
    if (!achievementSystemInstance) {
        achievementSystemInstance = new AchievementSystem();
    }
    return achievementSystemInstance;
}
