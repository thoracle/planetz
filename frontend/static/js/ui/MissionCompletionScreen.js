/**
 * MissionCompletionScreen - Mission completion UI with detailed rewards
 * 
 * Displays a comprehensive mission completion screen showing:
 * - Mission title and description
 * - Credits earned
 * - Faction reputation gained
 * - NFT cards awarded
 * - Optional suppression flag for when not needed
 */

import { debug } from '../debug.js';

export class MissionCompletionScreen {
    constructor() {
        this.isVisible = false;
        this.completionElement = null;
        this.currentMission = null;
        
        debug('UI', '🎉 MissionCompletionScreen initialized');
    }

    /**
     * Show mission completion screen
     * @param {Object} missionData - Mission completion data
     * @param {Object} rewards - Rewards earned
     * @param {Object} options - Display options
     */
    show(missionData, rewards, options = {}) {
        const {
            suppressScreen = false,
            duration = 10000,
            showBackground = true,
            playSound = true
        } = options;

        // Check if screen should be suppressed
        if (suppressScreen) {
            debug('UI', '🎉 Mission completion screen suppressed by flag');
            return { success: true, suppressed: true };
        }

        debug('UI', `🎉 Showing mission completion screen: ${missionData.title}`);

        try {
            // Create completion screen
            this.createCompletionScreen(missionData, rewards, options);
            
            // Show the screen
            this.displayScreen(showBackground, playSound);
            
            // Auto-hide after duration
            setTimeout(() => {
                this.hide();
            }, duration);

            this.currentMission = missionData;
            return { success: true, suppressed: false };

        } catch (error) {
            console.error('Failed to show mission completion screen:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Create the completion screen DOM element
     * @param {Object} missionData - Mission data
     * @param {Object} rewards - Rewards data
     * @param {Object} options - Display options
     */
    createCompletionScreen(missionData, rewards, options) {
        // Remove existing screen if present
        if (this.completionElement) {
            this.hide();
        }

        // Create main container
        this.completionElement = document.createElement('div');
        this.completionElement.className = 'mission-completion-screen';
        
        // Build the screen content
        this.completionElement.innerHTML = this.buildScreenHTML(missionData, rewards);
        
        // Apply styling
        this.applyScreenStyling();
        
        // Add event listeners
        this.addEventListeners();
    }

    /**
     * Build the HTML content for the completion screen
     * @param {Object} missionData - Mission data
     * @param {Object} rewards - Rewards data
     * @returns {string} - HTML content
     */
    buildScreenHTML(missionData, rewards) {
        const factionName = this.getFactionDisplayName(missionData.faction);
        const factionRep = rewards.factionBonuses ? Object.values(rewards.factionBonuses)[0] || 0 : 0;
        
        return `
            <div class="completion-overlay"></div>
            <div class="completion-content">
                <div class="completion-header">
                    <div class="completion-icon">🎉</div>
                    <h1 class="completion-title">MISSION COMPLETE</h1>
                    <div class="completion-subtitle">${missionData.title}</div>
                </div>
                
                <div class="completion-body">
                    <div class="mission-info">
                        <div class="mission-description">${missionData.description}</div>
                        <div class="mission-faction">Faction: ${factionName}</div>
                    </div>
                    
                    <div class="rewards-section">
                        <h2 class="rewards-title">REWARDS EARNED</h2>
                        
                        <div class="rewards-grid">
                            ${this.buildCreditsReward(rewards.credits)}
                            ${this.buildFactionReward(factionName, factionRep)}
                            ${this.buildCardsReward(rewards.cards)}
                        </div>
                    </div>
                </div>
                
                <div class="completion-footer">
                    <button class="completion-close-btn">CONTINUE</button>
                    <div class="completion-hint">Press ESC or click CONTINUE to close</div>
                </div>
            </div>
        `;
    }

    /**
     * Build credits reward HTML
     * @param {number} credits - Credits earned
     * @returns {string} - HTML for credits reward
     */
    buildCreditsReward(credits) {
        if (!credits || credits <= 0) return '';
        
        return `
            <div class="reward-item credits-reward">
                <div class="reward-icon">💰</div>
                <div class="reward-content">
                    <div class="reward-amount">${credits.toLocaleString()}</div>
                    <div class="reward-label">Credits</div>
                </div>
            </div>
        `;
    }

    /**
     * Build faction reputation reward HTML
     * @param {string} factionName - Faction display name
     * @param {number} reputation - Reputation points earned
     * @returns {string} - HTML for faction reward
     */
    buildFactionReward(factionName, reputation) {
        if (!reputation || reputation <= 0) return '';
        
        return `
            <div class="reward-item faction-reward">
                <div class="reward-icon">🎖️</div>
                <div class="reward-content">
                    <div class="reward-amount">+${reputation}</div>
                    <div class="reward-label">${factionName} Rep</div>
                </div>
            </div>
        `;
    }

    /**
     * Build NFT cards reward HTML
     * @param {Object} cards - Cards data
     * @returns {string} - HTML for cards reward
     */
    buildCardsReward(cards) {
        if (!cards || !cards.count || cards.count <= 0) return '';
        
        const cardTypes = cards.preferredTypes ? cards.preferredTypes.join(', ') : 'Various';
        const tierRange = cards.minTier && cards.maxTier ? `T${cards.minTier}-${cards.maxTier}` : 'Random';
        
        return `
            <div class="reward-item cards-reward">
                <div class="reward-icon">🃏</div>
                <div class="reward-content">
                    <div class="reward-amount">${cards.count}</div>
                    <div class="reward-label">NFT Cards</div>
                    <div class="reward-details">${tierRange} • ${cardTypes}</div>
                </div>
            </div>
        `;
    }

    /**
     * Apply CSS styling to the completion screen
     */
    applyScreenStyling() {
        this.completionElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'VT323', monospace;
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
        `;

        // Add CSS styles if not already present
        this.ensureScreenStyles();
    }

    /**
     * Display the screen with animations
     * @param {boolean} showBackground - Show background overlay
     * @param {boolean} playSound - Play completion sound
     */
    displayScreen(showBackground, playSound) {
        // Add to DOM
        document.body.appendChild(this.completionElement);
        
        // Trigger fade-in animation
        requestAnimationFrame(() => {
            this.completionElement.style.opacity = '1';
        });

        // Play sound if requested
        if (playSound) {
            this.playCompletionSound();
        }

        this.isVisible = true;
        debug('UI', '🎉 Mission completion screen displayed');
    }

    /**
     * Hide the completion screen
     */
    hide() {
        if (!this.completionElement || !this.isVisible) return;

        debug('UI', '🎉 Hiding mission completion screen');

        // Fade out animation
        this.completionElement.style.opacity = '0';
        
        // Remove from DOM after animation
        setTimeout(() => {
            if (this.completionElement && this.completionElement.parentNode) {
                document.body.removeChild(this.completionElement);
            }
            this.completionElement = null;
            this.isVisible = false;
            this.currentMission = null;
        }, 500);
    }

    /**
     * Add event listeners for user interaction
     */
    addEventListeners() {
        // Close button
        const closeBtn = this.completionElement.querySelector('.completion-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }

        // ESC key to close
        const handleKeyPress = (event) => {
            if (event.key === 'Escape' && this.isVisible) {
                this.hide();
                document.removeEventListener('keydown', handleKeyPress);
            }
        };
        document.addEventListener('keydown', handleKeyPress);

        // Click overlay to close
        const overlay = this.completionElement.querySelector('.completion-overlay');
        if (overlay) {
            overlay.addEventListener('click', () => this.hide());
        }
    }

    /**
     * Get display name for faction
     * @param {string} factionId - Faction identifier
     * @returns {string} - Display name
     */
    getFactionDisplayName(factionId) {
        const factionNames = {
            'terran_republic_alliance': 'Terran Republic Alliance',
            'explorers_guild': 'Explorers Guild',
            'traders_guild': 'Traders Guild',
            'friendly': 'Allied Forces',
            'neutral': 'Independent Systems',
            'enemy': 'Hostile Forces'
        };
        
        return factionNames[factionId] || factionId || 'Unknown Faction';
    }

    /**
     * Play mission completion sound
     */
    playCompletionSound() {
        try {
            if (window.starfieldManager && window.starfieldManager.playCommandSound) {
                window.starfieldManager.playCommandSound();
            }
        } catch (error) {
            debug('UI', '⚠️ Could not play completion sound:', error);
        }
    }

    /**
     * Ensure CSS styles are added to the page
     */
    ensureScreenStyles() {
        if (document.getElementById('mission-completion-styles')) {
            return; // Already added
        }

        const style = document.createElement('style');
        style.id = 'mission-completion-styles';
        style.textContent = `
            .mission-completion-screen .completion-overlay {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.85);
                backdrop-filter: blur(5px);
            }

            .mission-completion-screen .completion-content {
                position: relative;
                background: linear-gradient(135deg, rgba(0, 20, 40, 0.95), rgba(0, 40, 20, 0.95));
                border: 3px solid #00ff41;
                border-radius: 10px;
                padding: 30px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                box-shadow: 0 0 30px rgba(0, 255, 65, 0.5), inset 0 0 20px rgba(0, 255, 65, 0.1);
                animation: slideInFromTop 0.5s ease-out;
            }

            .mission-completion-screen .completion-header {
                text-align: center;
                margin-bottom: 25px;
                border-bottom: 2px solid #00ff41;
                padding-bottom: 20px;
            }

            .mission-completion-screen .completion-icon {
                font-size: 48px;
                margin-bottom: 10px;
                animation: bounce 1s ease-in-out infinite alternate;
            }

            .mission-completion-screen .completion-title {
                color: #00ff41;
                font-size: 32px;
                margin: 0 0 10px 0;
                text-shadow: 0 0 10px #00ff41;
                letter-spacing: 2px;
            }

            .mission-completion-screen .completion-subtitle {
                color: #ffffff;
                font-size: 18px;
                opacity: 0.9;
            }

            .mission-completion-screen .mission-info {
                margin-bottom: 25px;
                padding: 15px;
                background: rgba(0, 0, 0, 0.3);
                border-radius: 5px;
                border-left: 4px solid #00ff41;
            }

            .mission-completion-screen .mission-description {
                color: #ffffff;
                font-size: 14px;
                line-height: 1.4;
                margin-bottom: 10px;
            }

            .mission-completion-screen .mission-faction {
                color: #00ff41;
                font-size: 12px;
                font-weight: bold;
            }

            .mission-completion-screen .rewards-title {
                color: #00ff41;
                font-size: 24px;
                text-align: center;
                margin: 0 0 20px 0;
                text-shadow: 0 0 5px #00ff41;
            }

            .mission-completion-screen .rewards-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
                margin-bottom: 25px;
            }

            .mission-completion-screen .reward-item {
                background: rgba(0, 255, 65, 0.1);
                border: 2px solid #00ff41;
                border-radius: 8px;
                padding: 15px;
                text-align: center;
                transition: all 0.3s ease;
                animation: fadeInUp 0.6s ease-out;
            }

            .mission-completion-screen .reward-item:hover {
                background: rgba(0, 255, 65, 0.2);
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0, 255, 65, 0.3);
            }

            .mission-completion-screen .reward-icon {
                font-size: 32px;
                margin-bottom: 8px;
            }

            .mission-completion-screen .reward-amount {
                color: #00ff41;
                font-size: 20px;
                font-weight: bold;
                text-shadow: 0 0 5px #00ff41;
            }

            .mission-completion-screen .reward-label {
                color: #ffffff;
                font-size: 14px;
                margin-top: 5px;
            }

            .mission-completion-screen .reward-details {
                color: #cccccc;
                font-size: 10px;
                margin-top: 3px;
                opacity: 0.8;
            }

            .mission-completion-screen .completion-footer {
                text-align: center;
                border-top: 2px solid #00ff41;
                padding-top: 20px;
            }

            .mission-completion-screen .completion-close-btn {
                background: linear-gradient(135deg, #00ff41, #00cc33);
                border: none;
                color: #000000;
                padding: 12px 30px;
                font-family: 'VT323', monospace;
                font-size: 16px;
                font-weight: bold;
                border-radius: 5px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 1px;
            }

            .mission-completion-screen .completion-close-btn:hover {
                background: linear-gradient(135deg, #00cc33, #00ff41);
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0, 255, 65, 0.4);
            }

            .mission-completion-screen .completion-hint {
                color: #cccccc;
                font-size: 12px;
                margin-top: 10px;
                opacity: 0.7;
            }

            @keyframes slideInFromTop {
                0% {
                    opacity: 0;
                    transform: translateY(-50px);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes fadeInUp {
                0% {
                    opacity: 0;
                    transform: translateY(20px);
                }
                100% {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            @keyframes bounce {
                0% { transform: translateY(0); }
                100% { transform: translateY(-10px); }
            }
        `;
        
        document.head.appendChild(style);
    }

    /**
     * Check if screen is currently visible
     * @returns {boolean} - Visibility state
     */
    get visible() {
        return this.isVisible;
    }
}

// Create global instance
if (!window.missionCompletionScreen) {
    window.missionCompletionScreen = new MissionCompletionScreen();
}

export default MissionCompletionScreen;
