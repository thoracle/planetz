import { debug } from '../debug.js';

/**
 * CardRewardAnimator - Clash Royale style card reveal animation system
 * Creates dramatic one-at-a-time card reveals with loot crate presentation
 */

export class CardRewardAnimator {
    constructor() {
        this.cardQueue = [];
        this.isAnimating = false;
        this.currentCardIndex = 0;
        this.overlay = null;
        this.currentPrompt = null;
        
        // Animation settings
        this.animationSettings = {
            dropDuration: 800,
            anticipationDuration: 3000,
            flipDuration: 600,
            celebrationDuration: 1500,
            particleDuration: 2000
        };
        
        // Rarity configurations
        this.rarityConfig = {
            common: {
                color: '#888888',
                particles: 10,
                sound: 'card_reveal_common',
                glow: 'weak'
            },
            uncommon: {
                color: '#00ff41',
                particles: 20,
                sound: 'card_reveal_uncommon',
                glow: 'medium'
            },
            rare: {
                color: '#0088ff',
                particles: 35,
                sound: 'card_reveal_rare',
                glow: 'strong'
            },
            epic: {
                color: '#8800ff',
                particles: 50,
                sound: 'card_reveal_epic',
                glow: 'intense'
            },
            legendary: {
                color: '#ffaa00',
                particles: 100,
                sound: 'card_reveal_legendary',
                glow: 'legendary'
            }
        };
        
        this.initialize();
    }
    
    initialize() {
        this.setupStyles();
debug('UI', '🎴 CardRewardAnimator: Initialized');
        
        // Make globally accessible for testing
        window.cardRewardAnimator = this;
    }
    
    /**
     * Setup CSS animations and styles
     */
    setupStyles() {
        if (document.getElementById('card-reward-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'card-reward-styles';
        style.textContent = `
            @keyframes cardGlow {
                0% { filter: drop-shadow(0 0 10px currentColor); }
                50% { filter: drop-shadow(0 0 30px currentColor); }
                100% { filter: drop-shadow(0 0 10px currentColor); }
            }
            
            @keyframes pulse {
                0% { opacity: 0.7; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.05); }
                100% { opacity: 0.7; transform: scale(1); }
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes particle {
                0% {
                    transform: translate(0, 0) scale(1);
                    opacity: 1;
                }
                100% {
                    transform: translate(var(--particle-x), var(--particle-y)) scale(0);
                    opacity: 0;
                }
            }
            
            .card-reveal-overlay {
                animation: fadeIn 0.5s ease-in-out;
            }
            
            .card-particle {
                position: absolute;
                width: 4px;
                height: 4px;
                border-radius: 50%;
                pointer-events: none;
                animation: particle 2s ease-out forwards;
            }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Start card reveal sequence - main entry point
     */
    async animateCardRewards(cards) {
        if (this.isAnimating) {
            console.warn('🎴 CardRewardAnimator: Animation already in progress');
            return;
        }
        
        this.cardQueue = [...cards];
        this.currentCardIndex = 0;
        this.isAnimating = true;
        
debug('UI', `🎴 CardRewardAnimator: Starting animation for ${cards.length} cards`);
        
        try {
            // Create fullscreen overlay
            this.createCardRevealOverlay();
            
            // Reveal cards one by one
            for (let i = 0; i < cards.length; i++) {
                await this.revealSingleCard(cards[i], i);
                
                // Wait for user input between cards
                if (i < cards.length - 1) {
                    await this.waitForUserInput();
                    this.clearCurrentCard();
                }
            }
            
            // Final continue prompt
            this.showContinuePrompt(false);
            await this.waitForUserInput();
            
            // Clean up and finish
            await this.finishCardReveals();
            
        } catch (error) {
            console.error('🎴 CardRewardAnimator: Animation error:', error);
            this.cleanup();
        } finally {
            this.isAnimating = false;
        }
    }
    
    /**
     * Create fullscreen dark overlay for card reveals
     */
    createCardRevealOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'card-reveal-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.95) 100%);
            z-index: 2100;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            user-select: none;
        `;
        
        // Add title text
        const titleText = document.createElement('div');
        titleText.style.cssText = `
            font-family: 'VT323', monospace;
            font-size: 36px;
            color: #00ff41;
            margin-bottom: 50px;
            animation: pulse 2s ease-in-out infinite;
            text-align: center;
        `;
        titleText.textContent = '🎴 REWARDS EARNED 🎴';
        this.overlay.appendChild(titleText);
        
        document.body.appendChild(this.overlay);
debug('UI', '🎴 CardRewardAnimator: Overlay created');
    }
    
    /**
     * Reveal single card with full Clash Royale style animation
     */
    async revealSingleCard(cardData, index) {
debug('UI', `🎴 Revealing card ${index + 1}: ${cardData.name} (${cardData.rarity})`);
        
        // Create card container
        const cardContainer = document.createElement('div');
        cardContainer.className = 'card-reveal-container';
        cardContainer.style.cssText = `
            position: relative;
            width: 200px;
            height: 280px;
            perspective: 1000px;
            margin: 20px;
        `;
        
        // Create card back and front
        const cardBack = this.createCardBack(cardData.rarity);
        const cardFront = this.createCardFront(cardData);
        
        cardContainer.appendChild(cardBack);
        cardContainer.appendChild(cardFront);
        this.overlay.appendChild(cardContainer);
        
        // Phase 1: Drop in animation
        await this.animateCardDrop(cardContainer);
        
        // Phase 2: Anticipation with glow buildup
        await this.addAnticipationEffects(cardContainer, cardData.rarity);
        
        // Phase 3: Dramatic flip reveal
        await this.flipCardReveal(cardBack, cardFront, cardData.rarity);
        
        // Phase 4: Celebration effects
        await this.addCelebrationEffects(cardContainer, cardData);
        
        // Show continue prompt
        this.showContinuePrompt(index < this.cardQueue.length - 1);
    }
    
    /**
     * Create card back with rarity-based styling
     */
    createCardBack(rarity) {
        const config = this.rarityConfig[rarity] || this.rarityConfig.common;
        const cardBack = document.createElement('div');
        cardBack.className = 'card-back';
        
        cardBack.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, ${config.color}22 0%, ${config.color}44 50%, ${config.color}22 100%);
            border: 3px solid ${config.color};
            border-radius: 15px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            backface-visibility: hidden;
            box-shadow: 
                0 0 30px ${config.color}66,
                inset 0 0 30px ${config.color}33;
        `;
        
        // Mystery card icon
        cardBack.innerHTML = `
            <div style="
                font-size: 72px; 
                color: ${config.color}; 
                text-shadow: 0 0 20px ${config.color};
                margin-bottom: 20px;
            ">?</div>
            <div style="
                font-family: 'VT323', monospace; 
                color: ${config.color}; 
                font-size: 20px; 
                text-transform: uppercase;
                letter-spacing: 2px;
            ">${rarity}</div>
        `;
        
        return cardBack;
    }
    
    /**
     * Create card front with actual card data
     */
    createCardFront(cardData) {
        const config = this.rarityConfig[cardData.rarity] || this.rarityConfig.common;
        const cardFront = document.createElement('div');
        cardFront.className = 'card-front';
        
        cardFront.style.cssText = `
            position: absolute;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #001100 0%, #002200 50%, #001100 100%);
            border: 3px solid #00ff41;
            border-radius: 15px;
            transform: rotateY(180deg);
            backface-visibility: hidden;
            display: flex;
            flex-direction: column;
            padding: 15px;
            box-sizing: border-box;
            text-align: center;
        `;
        
        cardFront.innerHTML = `
            <div style="
                color: #00ff41; 
                font-family: 'VT323', monospace; 
                font-size: 20px; 
                font-weight: bold; 
                margin-bottom: 15px;
                text-shadow: 0 0 5px #00ff41;
            ">
                ${cardData.name}
            </div>
            
            <div style="
                flex: 1; 
                background: rgba(0,255,65,0.1); 
                border: 1px solid #00ff41; 
                border-radius: 8px; 
                padding: 15px; 
                margin-bottom: 15px;
                display: flex;
                flex-direction: column;
                justify-content: center;
            ">
                <div style="
                    color: #ffffff; 
                    font-size: 20px; 
                    margin-bottom: 10px;
                ">
                    Level ${cardData.level}
                </div>
                ${cardData.description ? `
                <div style="
                    color: #cccccc; 
                    font-size: 14px; 
                    line-height: 1.3;
                ">
                    ${cardData.description}
                </div>` : ''}
            </div>
            
            <div style="
                color: ${config.color}; 
                font-size: 14px; 
                text-transform: uppercase;
                font-weight: bold;
                text-shadow: 0 0 5px ${config.color};
            ">
                [${cardData.rarity}]
            </div>
        `;
        
        return cardFront;
    }
    
    /**
     * Animate card dropping in from above
     */
    async animateCardDrop(container) {
        container.style.transform = 'translateY(-500px) scale(0.5)';
        container.style.opacity = '0';
        
        await this.animateElement(container, {
            transform: 'translateY(0) scale(1)',
            opacity: '1'
        }, this.animationSettings.dropDuration, 'cubic-bezier(0.68, -0.55, 0.265, 1.55)');
    }
    
    /**
     * Add anticipation effects with glow buildup
     */
    async addAnticipationEffects(container, rarity) {
        const config = this.rarityConfig[rarity] || this.rarityConfig.common;
        
        // Add pulsing glow animation
        container.style.animation = 'cardGlow 1s ease-in-out 3';
        container.style.filter = `drop-shadow(0 0 20px ${config.color})`;
        
        // Play anticipation sound
        this.playSound('card_anticipation', 0.5);
        
        await this.delay(this.animationSettings.anticipationDuration);
    }
    
    /**
     * Flip card reveal animation
     */
    async flipCardReveal(cardBack, cardFront, rarity) {
        // Flip the back
        await this.animateElement(cardBack, {
            transform: 'rotateY(-180deg)'
        }, this.animationSettings.flipDuration);
        
        // Flip the front
        await this.animateElement(cardFront, {
            transform: 'rotateY(0deg)'
        }, this.animationSettings.flipDuration);
        
        // Play reveal sound
        this.playRevealSound(rarity);
    }
    
    /**
     * Add celebration particle effects
     */
    async addCelebrationEffects(container, cardData) {
        const config = this.rarityConfig[cardData.rarity] || this.rarityConfig.common;
        
        // Create particle burst
        for (let i = 0; i < config.particles; i++) {
            this.createParticle(container, config.color);
        }
        
        // Add special effects for rare cards
        if (cardData.rarity === 'legendary') {
            this.addLegendaryEffects(container);
        } else if (cardData.rarity === 'epic') {
            this.addEpicEffects(container);
        }
        
        await this.delay(this.animationSettings.celebrationDuration);
    }
    
    /**
     * Create individual particle
     */
    createParticle(container, color) {
        const particle = document.createElement('div');
        particle.className = 'card-particle';
        
        // Random position around card
        const angle = Math.random() * Math.PI * 2;
        const distance = 100 + Math.random() * 100;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        
        particle.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            width: ${2 + Math.random() * 4}px;
            height: ${2 + Math.random() * 4}px;
            background: ${color};
            border-radius: 50%;
            box-shadow: 0 0 10px ${color};
            --particle-x: ${x}px;
            --particle-y: ${y}px;
        `;
        
        container.appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, this.animationSettings.particleDuration);
    }
    
    /**
     * Add legendary card effects
     */
    addLegendaryEffects(container) {
        // Golden glow pulse
        container.style.animation = 'cardGlow 0.5s ease-in-out infinite';
        container.style.filter = 'drop-shadow(0 0 40px #ffaa00)';
        
        // Screen flash effect
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(255, 170, 0, 0.3);
            pointer-events: none;
            z-index: 2200;
            animation: fadeIn 0.2s ease-out reverse;
        `;
        document.body.appendChild(flash);
        
        setTimeout(() => {
            if (flash.parentNode) {
                flash.parentNode.removeChild(flash);
            }
        }, 200);
    }
    
    /**
     * Add epic card effects
     */
    addEpicEffects(container) {
        // Purple glow
        container.style.filter = 'drop-shadow(0 0 30px #8800ff)';
        
        // Add sparkle effects
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                this.createSparkle(container, '#8800ff');
            }, i * 50);
        }
    }
    
    /**
     * Create sparkle effect
     */
    createSparkle(container, color) {
        const sparkle = document.createElement('div');
        sparkle.style.cssText = `
            position: absolute;
            top: ${Math.random() * 100}%;
            left: ${Math.random() * 100}%;
            width: 3px;
            height: 3px;
            background: ${color};
            border-radius: 50%;
            box-shadow: 0 0 6px ${color};
            animation: pulse 0.5s ease-in-out;
        `;
        
        container.appendChild(sparkle);
        
        setTimeout(() => {
            if (sparkle.parentNode) {
                sparkle.parentNode.removeChild(sparkle);
            }
        }, 500);
    }
    
    /**
     * Show continue prompt
     */
    showContinuePrompt(hasMore) {
        if (this.currentPrompt) {
            this.currentPrompt.remove();
        }
        
        this.currentPrompt = document.createElement('div');
        this.currentPrompt.className = 'continue-prompt';
        this.currentPrompt.style.cssText = `
            position: absolute;
            bottom: 50px;
            left: 50%;
            transform: translateX(-50%);
            color: #ffffff;
            font-family: 'VT323', monospace;
            font-size: 20px;
            animation: pulse 1s ease-in-out infinite;
            text-align: center;
            text-shadow: 0 0 10px #00ff41;
        `;
        
        this.currentPrompt.textContent = hasMore ? 
            'CLICK OR PRESS SPACE FOR NEXT CARD' : 
            'CLICK OR PRESS SPACE TO CONTINUE';
            
        this.overlay.appendChild(this.currentPrompt);
    }
    
    /**
     * Wait for user input (click or space/enter key)
     */
    async waitForUserInput() {
        return new Promise(resolve => {
            const handleInput = (event) => {
                if (event.type === 'click' || event.key === ' ' || event.key === 'Enter') {
                    document.removeEventListener('click', handleInput);
                    document.removeEventListener('keydown', handleInput);
                    resolve();
                }
            };
            
            document.addEventListener('click', handleInput);
            document.addEventListener('keydown', handleInput);
        });
    }
    
    /**
     * Clear current card from display
     */
    clearCurrentCard() {
        const containers = this.overlay.querySelectorAll('.card-reveal-container');
        containers.forEach(container => container.remove());
        
        if (this.currentPrompt) {
            this.currentPrompt.remove();
            this.currentPrompt = null;
        }
    }
    
    /**
     * Finish card reveals and clean up
     */
    async finishCardReveals() {
        await this.animateElement(this.overlay, {
            opacity: '0'
        }, 500);
        
        this.cleanup();
    }
    
    /**
     * Clean up DOM elements
     */
    cleanup() {
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }
        this.overlay = null;
        this.currentPrompt = null;
        this.cardQueue = [];
debug('UI', '🎴 CardRewardAnimator: Cleaned up');
    }
    
    /**
     * Play reveal sound based on rarity
     */
    playRevealSound(rarity) {
        const config = this.rarityConfig[rarity] || this.rarityConfig.common;
        this.playSound(config.sound, 0.7);
    }
    
    /**
     * Play sound using audio manager
     */
    playSound(soundName, volume = 0.5) {
        const audioManager = window.starfieldAudioManager;
        if (audioManager && typeof audioManager.playSound === 'function') {
            audioManager.playSound(soundName, volume);
        } else {
debug('UI', `🎴 CardRewardAnimator: Would play sound: ${soundName}`);
        }
    }
    
    /**
     * Animate element with CSS transitions
     */
    async animateElement(element, properties, duration = 300, easing = 'ease') {
        return new Promise(resolve => {
            element.style.transition = `all ${duration}ms ${easing}`;
            
            Object.assign(element.style, properties);
            
            setTimeout(resolve, duration);
        });
    }
    
    /**
     * Simple delay utility
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Test the card animator with mock data
     */
    async testAnimation() {
        const mockCards = [
            {
                name: 'PLASMA CANNON',
                level: 3,
                rarity: 'rare',
                description: 'High-energy plasma weapon system'
            },
            {
                name: 'SHIELD BOOSTER',
                level: 2,
                rarity: 'common',
                description: 'Increases shield regeneration rate'
            },
            {
                name: 'QUANTUM DRIVE',
                level: 5,
                rarity: 'legendary',
                description: 'Faster-than-light travel system'
            }
        ];
        
        await this.animateCardRewards(mockCards);
    }
}
