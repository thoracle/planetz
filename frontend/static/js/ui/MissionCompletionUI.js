/**
 * MissionCompletionUI - Mission completion screen with rewards display
 * Handles mission completion celebration, rewards, and progression
 */

import { CardRewardAnimator } from './CardRewardAnimator.js';

export class MissionCompletionUI {
    constructor(starfieldManager, missionManager) {
        this.starfieldManager = starfieldManager;
        this.missionManager = missionManager;
        this.cardAnimator = new CardRewardAnimator();
        this.completionScreen = null;
        this.isShowing = false;
        
        // Performance rating system
        this.ratingSystem = {
            excellent: { stars: 5, threshold: 0.9, bonus: 0.5 },
            good: { stars: 4, threshold: 0.75, bonus: 0.3 },
            average: { stars: 3, threshold: 0.6, bonus: 0.1 },
            poor: { stars: 2, threshold: 0.4, bonus: 0 },
            failed: { stars: 1, threshold: 0, bonus: -0.2 }
        };
        
        this.initialize();
    }
    
    initialize() {
        this.setupStyles();
        console.log('🎉 MissionCompletionUI: Initialized');
        
        // Make globally accessible for testing
        window.missionCompletionUI = this;
    }
    
    /**
     * Setup CSS styles for completion screen
     */
    setupStyles() {
        if (document.getElementById('mission-completion-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'mission-completion-styles';
        style.textContent = `
            @keyframes missionCompleteEntry {
                0% {
                    opacity: 0;
                    transform: scale(0.8) translateY(50px);
                }
                100% {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                }
            }
            
            @keyframes starShine {
                0% { filter: brightness(1) saturate(1); }
                50% { filter: brightness(1.5) saturate(1.5); }
                100% { filter: brightness(1) saturate(1); }
            }
            
            @keyframes creditCount {
                0% { transform: scale(1); }
                50% { transform: scale(1.2); }
                100% { transform: scale(1); }
            }
            
            @keyframes glowPulse {
                0% { box-shadow: 0 0 20px rgba(0, 255, 65, 0.3); }
                50% { box-shadow: 0 0 40px rgba(0, 255, 65, 0.6); }
                100% { box-shadow: 0 0 20px rgba(0, 255, 65, 0.3); }
            }
            
            .mission-complete-screen {
                animation: missionCompleteEntry 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            }
            
            .star-rating .star {
                animation: starShine 0.5s ease-in-out;
            }
            
            .credit-amount {
                animation: creditCount 0.3s ease-in-out;
            }
            
            .completion-panel {
                animation: glowPulse 3s ease-in-out infinite;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Show mission completion screen
     */
    async showMissionComplete(missionId, completionData) {
        if (this.isShowing) {
            console.warn('🎉 MissionCompletionUI: Already showing completion screen');
            return;
        }
        
        this.isShowing = true;
        console.log(`🎉 MissionCompletionUI: Showing completion for mission ${missionId}`);
        
        try {
            // Get mission data
            const mission = await this.getMissionData(missionId);
            
            // Calculate performance rating
            const performance = this.calculatePerformance(completionData);
            
            // Create completion screen
            this.createCompletionScreen(mission, completionData, performance);
            
            // Pause game (optional)
            this.pauseGame();
            
            // Play completion sound
            this.playCompletionSound(performance.rating);
            
            // Show screen with animation
            await this.animateScreenEntry();
            
            // Animate rewards
            await this.animateRewardDisplay(completionData.rewards, performance);
            
            // Wait for user to continue
            await this.waitForContinue();
            
            // Show card reveals if any
            if (completionData.rewards.cards && completionData.rewards.cards.length > 0) {
                await this.cardAnimator.animateCardRewards(completionData.rewards.cards);
            }
            
            // Final cleanup
            await this.hideCompletionScreen();
            
        } catch (error) {
            console.error('🎉 MissionCompletionUI: Error showing completion:', error);
            this.cleanup();
        } finally {
            this.resumeGame();
            this.isShowing = false;
        }
    }
    
    /**
     * Create the main completion screen
     */
    createCompletionScreen(mission, completionData, performance) {
        this.completionScreen = document.createElement('div');
        this.completionScreen.className = 'mission-complete-screen';
        this.completionScreen.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            z-index: 2000;
            display: flex;
            justify-content: center;
            align-items: center;
            opacity: 0;
        `;
        
        // Create main panel
        const panel = this.createCompletionPanel(mission, completionData, performance);
        this.completionScreen.appendChild(panel);
        
        document.body.appendChild(this.completionScreen);
    }
    
    /**
     * Create main completion panel
     */
    createCompletionPanel(mission, completionData, performance) {
        const panel = document.createElement('div');
        panel.className = 'completion-panel';
        panel.style.cssText = `
            background: linear-gradient(135deg, rgba(0, 40, 0, 0.9) 0%, rgba(0, 60, 0, 0.9) 50%, rgba(0, 40, 0, 0.9) 100%);
            border: 3px solid #00ff41;
            border-radius: 8px;
            padding: 30px;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            font-family: 'VT323', monospace;
            color: #ffffff;
            text-align: center;
            box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
        `;
        
        // Header
        panel.appendChild(this.createHeader(mission));
        
        // Performance section
        panel.appendChild(this.createPerformanceSection(performance, completionData));
        
        // Rewards section
        panel.appendChild(this.createRewardsSection(completionData.rewards, performance));
        
        // Statistics section
        if (completionData.statistics) {
            panel.appendChild(this.createStatisticsSection(completionData.statistics));
        }
        
        // Continue button
        panel.appendChild(this.createContinueButton());
        
        return panel;
    }
    
    /**
     * Create header section
     */
    createHeader(mission) {
        const header = document.createElement('div');
        header.style.cssText = `
            margin-bottom: 30px;
        `;
        
        header.innerHTML = `
            <div style="
                font-size: 40px;
                color: #00ff41;
                margin-bottom: 20px;
                animation: pulse 2s ease-in-out infinite;
            ">
                🎉 MISSION COMPLETE 🎉
            </div>
            
            <div style="
                font-size: 28px;
                color: #ffffff;
                margin-bottom: 10px;
                text-transform: uppercase;
                letter-spacing: 2px;
            ">
                ${mission.title}
            </div>
            
            <div style="
                font-size: 20px;
                color: #00ff41;
                font-style: italic;
            ">
                All objectives completed!
            </div>
        `;
        
        return header;
    }
    
    /**
     * Create performance rating section
     */
    createPerformanceSection(performance, completionData) {
        const section = document.createElement('div');
        section.style.cssText = `
            margin-bottom: 30px;
            padding: 20px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            border: 1px solid #00ff41;
        `;
        
        // Star rating
        const stars = this.createStarRating(performance.stars);
        
        section.innerHTML = `
            <div style="
                font-size: 22px;
                color: #ffff44;
                margin-bottom: 15px;
            ">
                PERFORMANCE RATING:
            </div>
            
            <div style="
                font-size: 36px;
                margin-bottom: 15px;
            ">
                ${stars} (${performance.rating.toUpperCase()})
            </div>
            
            ${completionData.completionTime ? `
            <div style="
                font-size: 16px;
                color: #cccccc;
                margin-bottom: 10px;
            ">
                Completion Time: ${completionData.completionTime}${completionData.timeLimit ? ` / ${completionData.timeLimit}` : ''}
            </div>` : ''}
            
            ${completionData.bonusObjectives ? `
            <div style="
                font-size: 16px;
                color: #00aaff;
            ">
                Bonus Objectives: ${completionData.bonusObjectives.completed}/${completionData.bonusObjectives.total} completed
            </div>` : ''}
        `;
        
        return section;
    }
    
    /**
     * Create rewards section
     */
    createRewardsSection(rewards, performance) {
        const section = document.createElement('div');
        section.style.cssText = `
            margin-bottom: 30px;
        `;
        
        section.innerHTML = `
            <div style="
                font-size: 22px;
                color: #00ff41;
                margin-bottom: 20px;
                text-transform: uppercase;
                letter-spacing: 2px;
                border-bottom: 2px solid #00ff41;
                padding-bottom: 10px;
            ">
                ── REWARDS ──
            </div>
        `;
        
        // Credits
        if (rewards.credits) {
            section.appendChild(this.createCreditsDisplay(rewards.credits, performance.bonus));
        }
        
        // Cards preview
        if (rewards.cards && rewards.cards.length > 0) {
            section.appendChild(this.createCardsPreview(rewards.cards));
        }
        
        // Faction standing
        if (rewards.factionStanding) {
            section.appendChild(this.createFactionStandingDisplay(rewards.factionStanding));
        }
        
        return section;
    }
    
    /**
     * Create credits display with animation
     */
    createCreditsDisplay(credits, bonus) {
        const container = document.createElement('div');
        container.style.cssText = `
            margin-bottom: 20px;
            padding: 15px;
            background: rgba(255, 255, 0, 0.1);
            border: 1px solid #ffff44;
            border-radius: 6px;
        `;
        
        const baseCredits = Math.floor(credits / (1 + bonus));
        const bonusCredits = credits - baseCredits;
        
        container.innerHTML = `
            <div style="
                font-size: 20px;
                color: #ffff44;
                margin-bottom: 10px;
            ">
                💰 CREDITS EARNED:
            </div>
            
            <div style="
                font-size: 24px;
                color: #ffffff;
                font-weight: bold;
            ">
                <span class="credit-amount">${credits.toLocaleString()}</span>
                ${bonusCredits > 0 ? `<span style="color: #00ff41;"> (+${bonusCredits.toLocaleString()} bonus)</span>` : ''}
            </div>
        `;
        
        return container;
    }
    
    /**
     * Create cards preview
     */
    createCardsPreview(cards) {
        const container = document.createElement('div');
        container.style.cssText = `
            margin-bottom: 20px;
            padding: 15px;
            background: rgba(0, 0, 255, 0.1);
            border: 1px solid #00aaff;
            border-radius: 6px;
        `;
        
        container.innerHTML = `
            <div style="
                font-size: 20px;
                color: #00aaff;
                margin-bottom: 15px;
            ">
                🎴 CARDS AWARDED:
            </div>
            
            <div style="
                display: flex;
                justify-content: center;
                gap: 15px;
                flex-wrap: wrap;
            ">
                ${cards.map(card => `
                    <div style="
                        width: 80px;
                        height: 110px;
                        background: linear-gradient(135deg, #001100 0%, #002200 50%, #001100 100%);
                        border: 2px solid #00ff41;
                        border-radius: 8px;
                        display: flex;
                        flex-direction: column;
                        justify-content: center;
                        align-items: center;
                        padding: 8px;
                        box-sizing: border-box;
                    ">
                        <div style="
                            color: #00ff41;
                            font-size: 12px;
                            text-align: center;
                            margin-bottom: 5px;
                            font-weight: bold;
                        ">
                            ${card.name}
                        </div>
                        <div style="
                            color: #ffffff;
                            font-size: 10px;
                            margin-bottom: 5px;
                        ">
                            Level ${card.level}
                        </div>
                        <div style="
                            color: ${this.getRarityColor(card.rarity)};
                            font-size: 9px;
                            text-transform: uppercase;
                        ">
                            [${card.rarity}]
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <div style="
                font-size: 16px;
                color: #cccccc;
                margin-top: 10px;
                font-style: italic;
            ">
                Click CONTINUE for detailed card reveals
            </div>
        `;
        
        return container;
    }
    
    /**
     * Create faction standing display
     */
    createFactionStandingDisplay(factionData) {
        const container = document.createElement('div');
        container.style.cssText = `
            margin-bottom: 20px;
            padding: 15px;
            background: rgba(255, 0, 255, 0.1);
            border: 1px solid #ff00ff;
            border-radius: 6px;
        `;
        
        container.innerHTML = `
            <div style="
                font-size: 20px;
                color: #ff00ff;
                margin-bottom: 15px;
            ">
                ⭐ FACTION STANDING:
            </div>
            
            ${Object.entries(factionData).map(([faction, data]) => `
                <div style="
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                    font-size: 16px;
                ">
                    <span style="color: #ffffff;">${faction}:</span>
                    <span style="color: #00ff41;">
                        +${data.change} (${data.from} → ${data.to})
                    </span>
                </div>
            `).join('')}
        `;
        
        return container;
    }
    
    /**
     * Create statistics section
     */
    createStatisticsSection(statistics) {
        const section = document.createElement('div');
        section.style.cssText = `
            margin-bottom: 30px;
            padding: 20px;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            border: 1px solid #888888;
        `;
        
        section.innerHTML = `
            <div style="
                font-size: 20px;
                color: #888888;
                margin-bottom: 15px;
                text-transform: uppercase;
            ">
                📊 MISSION STATISTICS:
            </div>
            
            <div style="
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                font-size: 16px;
            ">
                ${Object.entries(statistics).map(([key, value]) => `
                    <div style="
                        display: flex;
                        justify-content: space-between;
                        color: #cccccc;
                    ">
                        <span>${this.formatStatisticName(key)}:</span>
                        <span style="color: #ffffff;">${value}</span>
                    </div>
                `).join('')}
            </div>
        `;
        
        return section;
    }
    
    /**
     * Create continue button
     */
    createContinueButton() {
        const button = document.createElement('button');
        button.style.cssText = `
            background: #00ff41;
            color: #000000;
            border: none;
            padding: 15px 40px;
            font-family: 'VT323', monospace;
            font-size: 18px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 2px;
            transition: all 0.3s ease;
            box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
        `;
        button.textContent = 'CONTINUE';
        
        button.addEventListener('mouseenter', () => {
            button.style.background = '#44ff77';
            button.style.transform = 'scale(1.05)';
            button.style.boxShadow = '0 0 30px rgba(0, 255, 65, 0.5)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.background = '#00ff41';
            button.style.transform = 'scale(1)';
            button.style.boxShadow = '0 0 20px rgba(0, 255, 65, 0.3)';
        });
        
        button.addEventListener('click', () => {
            this.continueClicked = true;
        });
        
        return button;
    }
    
    /**
     * Create star rating display
     */
    createStarRating(stars) {
        let rating = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= stars) {
                rating += '⭐';
            } else {
                rating += '☆';
            }
        }
        return rating;
    }
    
    /**
     * Calculate performance rating
     */
    calculatePerformance(completionData) {
        let score = 0.5; // Base score
        
        // Time performance
        if (completionData.completionTime && completionData.timeLimit) {
            const timeRatio = this.parseTime(completionData.completionTime) / this.parseTime(completionData.timeLimit);
            score += (1 - timeRatio) * 0.3; // Up to 30% for speed
        }
        
        // Bonus objectives
        if (completionData.bonusObjectives) {
            const bonusRatio = completionData.bonusObjectives.completed / completionData.bonusObjectives.total;
            score += bonusRatio * 0.2; // Up to 20% for bonus objectives
        }
        
        // Damage taken (if available)
        if (completionData.statistics && completionData.statistics.damageTaken) {
            const damageScore = Math.max(0, 1 - (parseFloat(completionData.statistics.damageTaken) / 100));
            score += damageScore * 0.2; // Up to 20% for avoiding damage
        }
        
        // Determine rating
        let rating = 'poor';
        let stars = 1;
        let bonus = 0;
        
        for (const [ratingName, config] of Object.entries(this.ratingSystem)) {
            if (score >= config.threshold) {
                rating = ratingName;
                stars = config.stars;
                bonus = config.bonus;
            }
        }
        
        return { rating, stars, bonus, score };
    }
    
    /**
     * Parse time string to seconds
     */
    parseTime(timeString) {
        const parts = timeString.split(':');
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    
    /**
     * Get rarity color
     */
    getRarityColor(rarity) {
        const colors = {
            common: '#888888',
            uncommon: '#00ff41',
            rare: '#0088ff',
            epic: '#8800ff',
            legendary: '#ffaa00'
        };
        return colors[rarity] || colors.common;
    }
    
    /**
     * Format statistic name for display
     */
    formatStatisticName(key) {
        return key.replace(/([A-Z])/g, ' $1')
                 .replace(/^./, str => str.toUpperCase())
                 .replace(/([a-z])([A-Z])/g, '$1 $2');
    }
    
    /**
     * Animate screen entry
     */
    async animateScreenEntry() {
        this.completionScreen.style.opacity = '1';
        await this.delay(800); // Match CSS animation duration
    }
    
    /**
     * Animate reward display elements
     */
    async animateRewardDisplay(rewards, performance) {
        // Animate star rating
        const stars = this.completionScreen.querySelectorAll('.star');
        for (let i = 0; i < stars.length; i++) {
            setTimeout(() => {
                if (stars[i]) stars[i].style.animation = 'starShine 0.5s ease-in-out';
            }, i * 200);
        }
        
        // Animate credit counting
        if (rewards.credits) {
            setTimeout(() => {
                const creditElement = this.completionScreen.querySelector('.credit-amount');
                if (creditElement) {
                    creditElement.style.animation = 'creditCount 0.3s ease-in-out';
                }
            }, 1000);
        }
        
        await this.delay(2000);
    }
    
    /**
     * Wait for continue button click
     */
    async waitForContinue() {
        this.continueClicked = false;
        
        while (!this.continueClicked) {
            await this.delay(100);
        }
    }
    
    /**
     * Hide completion screen
     */
    async hideCompletionScreen() {
        if (this.completionScreen) {
            this.completionScreen.style.opacity = '0';
            await this.delay(500);
            this.cleanup();
        }
    }
    
    /**
     * Cleanup DOM elements
     */
    cleanup() {
        if (this.completionScreen && this.completionScreen.parentNode) {
            this.completionScreen.parentNode.removeChild(this.completionScreen);
        }
        this.completionScreen = null;
        this.continueClicked = false;
    }
    
    /**
     * Pause game during completion screen
     */
    pauseGame() {
        if (this.starfieldManager && typeof this.starfieldManager.pauseForMissionComplete === 'function') {
            this.starfieldManager.pauseForMissionComplete();
        }
    }
    
    /**
     * Resume game after completion screen
     */
    resumeGame() {
        if (this.starfieldManager && typeof this.starfieldManager.resumeFromMissionComplete === 'function') {
            this.starfieldManager.resumeFromMissionComplete();
        }
    }
    
    /**
     * Play completion sound
     */
    playCompletionSound(rating) {
        const audioManager = window.starfieldAudioManager;
        if (audioManager && typeof audioManager.playSound === 'function') {
            const soundMap = {
                excellent: 'mission_complete_excellent',
                good: 'mission_complete_good',
                average: 'mission_complete_average',
                poor: 'mission_complete_poor',
                failed: 'mission_complete_failed'
            };
            
            const sound = soundMap[rating] || 'mission_complete_average';
            audioManager.playSound(sound, 0.8);
        }
    }
    
    /**
     * Get mission data (mock for now)
     */
    async getMissionData(missionId) {
        // In real implementation, this would fetch from mission manager
        return {
            id: missionId,
            title: 'Eliminate Raider Squadron',
            description: 'Destroy enemy raiders threatening trade routes'
        };
    }
    
    /**
     * Simple delay utility
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Test the completion UI with mock data
     */
    async testCompletion() {
        const mockCompletionData = {
            completionTime: '12:34',
            timeLimit: '15:00',
            bonusObjectives: {
                completed: 2,
                total: 3
            },
            rewards: {
                credits: 15750,
                cards: [
                    {
                        name: 'PLASMA CANNON',
                        level: 3,
                        rarity: 'rare'
                    },
                    {
                        name: 'SHIELD BOOSTER',
                        level: 2,
                        rarity: 'common'
                    }
                ],
                factionStanding: {
                    'Terra Defense Force': {
                        change: 250,
                        from: 'Honored',
                        to: 'Revered'
                    }
                }
            },
            statistics: {
                shipsDestroyed: 7,
                damageTaken: '23%',
                accuracy: '89%'
            }
        };
        
        await this.showMissionComplete('test_mission', mockCompletionData);
    }
}
