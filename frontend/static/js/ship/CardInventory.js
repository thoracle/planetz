import { debug } from '../debug.js';

/**
 * CardInventory class - Manages card collection and stacking mechanics
 * Based on docs/tech_design.md and docs/system_architecture.md
 * 
 * Features:
 * - Clash Royale-style card stacking (all same type cards stack)
 * - Card level progression system (1-10)
 * - Upgrade requirements (2, 3, 5, 8, 12, 20, 32, 50, 80 cards per level)
 * - Card collection tracking and progress display
 * - Pokédex-style discovery system with silhouettes
 */

import NFTCard, { CARD_TYPES, CARD_RARITY, DROP_RATES, RARITY_CARD_POOLS } from './NFTCard.js';

// Upgrade requirements for each level (cards needed to upgrade TO that level)
export const UPGRADE_REQUIREMENTS = {
    1: 0,   // Level 1 requires 0 cards (base level)
    2: 2,   // Level 2 requires 2 cards to upgrade from level 1
    3: 3,   // Level 3 requires 3 cards to upgrade from level 2
    4: 5,   // Level 4 requires 5 cards to upgrade from level 3
    5: 8,   // Level 5 requires 8 cards to upgrade from level 4
    6: 12,  // Level 6 requires 12 cards to upgrade from level 5
    7: 20,  // Level 7 requires 20 cards to upgrade from level 6
    8: 32,  // Level 8 requires 32 cards to upgrade from level 7
    9: 50,  // Level 9 requires 50 cards to upgrade from level 8
    10: 80  // Level 10 requires 80 cards to upgrade from level 9 (max level)
};

export const MAX_CARD_LEVEL = 10;

export default class CardInventory {
    constructor() {
        // Card stacks - each entry contains: { cardType, count, level, discovered }
        this.cardStacks = new Map();
        
        // Discovery tracking - tracks which card types have been discovered
        this.discoveredCards = new Set();
        
        // Total cards collected (for statistics)
        this.totalCardsCollected = 0;
        
        // Initialize with all card types as undiscovered stacks
        this.initializeCardStacks();
    }

    /**
     * Initialize card stacks for all card types
     */
    initializeCardStacks() {
        // Check if hull_plating is in CARD_TYPES
debug('UI', 'CARD_TYPES.HULL_PLATING:', CARD_TYPES.HULL_PLATING);
debug('UI', 'hull_plating in Object.values(CARD_TYPES):', Object.values(CARD_TYPES).includes('hull_plating'));
debug('UI', 'All CARD_TYPES values:', Object.values(CARD_TYPES));
        
        Object.values(CARD_TYPES).forEach((cardType, index) => {
            this.cardStacks.set(cardType, {
                cardType: cardType,
                count: 0,
                level: 1,
                discovered: false,
                rarity: null // Will be set when first card is added
            });
            if (cardType === 'hull_plating') {
debug('UTILITY', '✅ Found and initialized hull_plating at index:', index);
            }
        });
        
debug('UI', 'Total card stacks initialized:', this.cardStacks.size);
debug('UI', 'Has hull_plating after init:', this.cardStacks.has('hull_plating'));
        
        // Additional debugging - list all initialized card types
debug('UI', 'All initialized card types:', Array.from(this.cardStacks.keys()));
    }

    /**
     * Add a card to the inventory
     * @param {NFTCard} card - The card to add
     * @returns {Object} - Result object with success status and details
     */
    addCard(card) {
        if (!(card instanceof NFTCard)) {
            return { success: false, error: 'Invalid card object' };
        }

        const cardType = card.cardType;
        const stack = this.cardStacks.get(cardType);
        
        if (!stack) {
            return { success: false, error: `Unknown card type: ${cardType}` };
        }

        // Discover the card if not already discovered
        if (!stack.discovered) {
            stack.discovered = true;
            this.discoveredCards.add(cardType);
            // Set the rarity of the stack to the first card's rarity
            stack.rarity = card.rarity;
        }

        // Add to stack count
        stack.count++;
        this.totalCardsCollected++;

        return {
            success: true,
            cardType: cardType,
            newCount: stack.count,
            level: stack.level,
            discovered: !this.discoveredCards.has(cardType)
        };
    }

    /**
     * Check if a card stack can be upgraded (without performing the upgrade)
     * @param {string} cardType - The card type to check
     * @returns {Object} - Upgrade possibility result
     */
    canUpgrade(cardType) {
        const stack = this.cardStacks.get(cardType);
        if (!stack) return { canUpgrade: false, reason: 'Unknown card type' };

        if (!stack.discovered) {
            return { canUpgrade: false, reason: 'Card not discovered' };
        }

        const currentLevel = stack.level;
        const currentCount = stack.count;
        
        // Check if we have enough cards for the next level
        if (currentLevel >= MAX_CARD_LEVEL) {
            return { canUpgrade: false, reason: 'Max level reached' };
        }

        const requiredForNextLevel = UPGRADE_REQUIREMENTS[currentLevel + 1];
        
        if (currentCount >= requiredForNextLevel) {
            return {
                canUpgrade: true,
                currentLevel: currentLevel,
                nextLevel: currentLevel + 1,
                cardsRequired: requiredForNextLevel,
                cardsAvailable: currentCount
            };
        }

        return { 
            canUpgrade: false, 
            reason: 'Insufficient cards',
            cardsRequired: requiredForNextLevel,
            cardsAvailable: currentCount,
            cardsNeeded: requiredForNextLevel - currentCount
        };
    }

    /**
     * Manually upgrade a card stack
     * @param {string} cardType - The card type to upgrade
     * @returns {Object} - Upgrade result
     */
    upgradeCard(cardType) {
        const stack = this.cardStacks.get(cardType);
        if (!stack) {
            return { success: false, error: `Unknown card type: ${cardType}` };
        }

        if (!stack.discovered) {
            return { success: false, error: 'Cannot upgrade undiscovered card' };
        }

        if (stack.level >= MAX_CARD_LEVEL) {
            return { success: false, error: 'Card is already at maximum level' };
        }

        const requiredCards = UPGRADE_REQUIREMENTS[stack.level + 1];
        
        if (stack.count < requiredCards) {
            return {
                success: false,
                error: `Insufficient cards. Need ${requiredCards}, have ${stack.count}`
            };
        }

        // Perform upgrade
        stack.level++;
        stack.count -= requiredCards;

        return {
            success: true,
            newLevel: stack.level,
            cardsUsed: requiredCards,
            remainingCards: stack.count
        };
    }

    /**
     * Get card stack information
     * @param {string} cardType - The card type to get info for
     * @returns {Object} - Stack information
     */
    getCardStack(cardType) {
        const stack = this.cardStacks.get(cardType);
        if (!stack) return null;

        // Create a sample card to get name and rarity
        // Use the stack's rarity if available, otherwise default to common
        const cardRarity = stack.rarity || CARD_RARITY.COMMON;
        const sampleCard = new NFTCard(cardType, cardRarity);
        
        // Set the level on the sample card to match the stack level
        sampleCard.level = stack.level;

        const nextLevelRequirement = stack.level < MAX_CARD_LEVEL 
            ? UPGRADE_REQUIREMENTS[stack.level + 1] 
            : null;

        const upgradeInfo = this.canUpgrade(cardType);

        return {
            cardType: stack.cardType,
            name: sampleCard.metadata.name,
            rarity: cardRarity, // Use the determined rarity
            count: stack.count,
            level: stack.level,
            discovered: stack.discovered,
            sampleCard: sampleCard,
            canUpgrade: upgradeInfo.canUpgrade,
            nextLevelRequirement: nextLevelRequirement,
            progressToNextLevel: nextLevelRequirement 
                ? Math.min(stack.count / nextLevelRequirement, 1.0)
                : 1.0,
            upgradeInfo: upgradeInfo
        };
    }

    /**
     * Get all card stacks
     * @returns {Array} - Array of all card stack information
     */
    getAllCardStacks() {
        return Array.from(this.cardStacks.keys()).map(cardType => 
            this.getCardStack(cardType)
        );
    }

    /**
     * Get discovered cards (including those with count = 0)
     * @returns {Array} - Array of discovered card stacks (count >= 0)
     */
    getDiscoveredCards() {
        return this.getAllCardStacks().filter(stack => stack.discovered && stack.count >= 0);
    }

    /**
     * Get undiscovered cards (for Pokédex-style display)
     * @returns {Array} - Array of undiscovered card types
     */
    getUndiscoveredCards() {
        return this.getAllCardStacks().filter(stack => !stack.discovered);
    }

    /**
     * Get upgrade requirements for a specific level
     * @param {number} level - The level to get requirements for
     * @returns {number} - Number of cards required for upgrade
     */
    getUpgradeRequirements(level) {
        return UPGRADE_REQUIREMENTS[level] || 0;
    }

    /**
     * Get collection statistics
     * @returns {Object} - Collection statistics
     */
    getCollectionStats() {
        const totalCardTypes = Object.keys(CARD_TYPES).length;
        const discoveredCount = this.discoveredCards.size;
        const completionPercentage = (discoveredCount / totalCardTypes) * 100;

        // Calculate total cards currently in inventory (not historical count)
        let currentTotalCards = 0;
        
        // Calculate rarity distribution
        const rarityStats = {};
        Object.values(CARD_RARITY).forEach(rarity => {
            rarityStats[rarity] = {
                discovered: 0,
                total: 0
            };
        });

        // Count cards by rarity using actual stack data
        this.cardStacks.forEach((stack, cardType) => {
            currentTotalCards += stack.count;
            
            if (stack.discovered && stack.rarity) {
                const rarity = stack.rarity;
                rarityStats[rarity].total++;
                rarityStats[rarity].discovered++;
            }
        });

        const stats = {
            totalCardTypes: totalCardTypes,
            discoveredCardTypes: discoveredCount,
            completionPercentage: Math.round(completionPercentage * 100) / 100,
            totalCardsCollected: currentTotalCards, // Use current total instead of historical
            rarityStats: rarityStats
        };
        
        // Debug logging
debug('UTILITY', 'getCollectionStats() called:');
debug('UI', '  - CARD_TYPES length:', totalCardTypes);
debug('UI', '  - discoveredCards.size:', discoveredCount);
debug('UI', '  - currentTotalCards:', currentTotalCards);
debug('UI', '  - cardStacks.size:', this.cardStacks.size);
debug('UTILITY', '  - returning stats:', stats);
        
        return stats;
    }

    /**
     * Generate a random card drop based on rarity probabilities
     * @returns {NFTCard} - A randomly generated card
     */
    generateRandomCard() {
        // Select rarity based on drop rates
        const random = Math.random() * 100;
        let cumulativeRate = 0;
        let selectedRarity = CARD_RARITY.COMMON;

        for (const [rarity, rate] of Object.entries(DROP_RATES)) {
            cumulativeRate += rate;
            if (random <= cumulativeRate) {
                selectedRarity = rarity;
                break;
            }
        }

        // Select random card type from the appropriate rarity pool
        const availableCardTypes = RARITY_CARD_POOLS[selectedRarity] || Object.values(CARD_TYPES);
        const randomCardType = availableCardTypes[Math.floor(Math.random() * availableCardTypes.length)];

        const card = new NFTCard(randomCardType, selectedRarity);
        
        return card;
    }

    /**
     * Generate a specific card with given type and rarity
     * @param {string} cardType - The specific card type to generate
     * @param {string} rarity - The rarity level for the card
     * @returns {NFTCard} - The generated card
     */
    generateSpecificCard(cardType, rarity) {
        const card = new NFTCard(cardType, rarity);
        
        return card;
    }

    /**
     * Simulate opening a card pack
     * @param {number} packSize - Number of cards in the pack
     * @returns {Array} - Array of cards
     */
    openCardPack(packSize = 5) {
        const cards = [];
        
        for (let i = 0; i < packSize; i++) {
            const card = this.generateRandomCard();
            this.addCard(card);
            cards.push(card);
        }

        return cards;
    }

    /**
     * Export inventory data for persistence
     * @returns {Object} - Serializable inventory data
     */
    toJSON() {
        return {
            cardStacks: Array.from(this.cardStacks.entries()),
            discoveredCards: Array.from(this.discoveredCards),
            totalCardsCollected: this.totalCardsCollected
        };
    }

    /**
     * Import inventory data from persistence
     * @param {Object} data - Serialized inventory data
     */
    fromJSON(data) {
        if (data.cardStacks) {
            this.cardStacks = new Map(data.cardStacks);
        }
        
        if (data.discoveredCards) {
            this.discoveredCards = new Set(data.discoveredCards);
        }
        
        if (data.totalCardsCollected !== undefined) {
            this.totalCardsCollected = data.totalCardsCollected;
        }
    }

    /**
     * Reset inventory (for testing or new game)
     */
    reset() {
        this.cardStacks.clear();
        this.discoveredCards.clear();
        this.totalCardsCollected = 0;
        this.initializeCardStacks();
    }
} 