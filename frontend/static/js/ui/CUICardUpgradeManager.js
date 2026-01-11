/**
 * CUICardUpgradeManager
 *
 * Extracted from CardInventoryUI to reduce file size.
 * Handles card upgrade logic and progression.
 *
 * Features:
 * - Card upgrade cost calculation
 * - Credit validation
 * - Card stack management during upgrades
 * - Ship system refresh after upgrades
 */

import { debug } from '../debug.js';
import { playerCredits } from '../utils/PlayerCredits.js';

// Define upgrade costs (cards + credits)
const UPGRADE_COSTS = {
    2: { cards: 3, credits: 1000 },
    3: { cards: 6, credits: 5000 },
    4: { cards: 12, credits: 15000 },
    5: { cards: 24, credits: 50000 }
};

const MAX_LEVEL = 5;

export class CUICardUpgradeManager {
    /**
     * Create a CUICardUpgradeManager
     * @param {Object} cardInventoryUI - Reference to parent CardInventoryUI
     */
    constructor(cardInventoryUI) {
        this.cui = cardInventoryUI;
    }

    /**
     * Get upgrade cost for a specific level
     * @param {number} level - Target level (2-5)
     * @returns {Object|null} Cost object with cards and credits, or null if invalid
     */
    getUpgradeCost(level) {
        return UPGRADE_COSTS[level] || null;
    }

    /**
     * Check if an upgrade is possible
     * @param {Object} cardStack - The card stack to check
     * @returns {Object} Result with canUpgrade boolean and reason string
     */
    canUpgrade(cardStack) {
        if (!cardStack) {
            return { canUpgrade: false, reason: 'Card stack not found' };
        }

        if (!cardStack.discovered) {
            return { canUpgrade: false, reason: 'Cannot upgrade undiscovered card' };
        }

        const currentLevel = cardStack.level;
        const nextLevel = currentLevel + 1;

        if (nextLevel > MAX_LEVEL) {
            return { canUpgrade: false, reason: `Already at maximum level ${MAX_LEVEL}` };
        }

        const upgradeCost = this.getUpgradeCost(nextLevel);

        if (cardStack.count < upgradeCost.cards) {
            return {
                canUpgrade: false,
                reason: `Not enough cards. Have ${cardStack.count}, need ${upgradeCost.cards}`
            };
        }

        if (!playerCredits.canAfford(upgradeCost.credits)) {
            return {
                canUpgrade: false,
                reason: `Not enough credits. Have ${playerCredits.getCredits()}, need ${upgradeCost.credits}`
            };
        }

        return { canUpgrade: true, reason: 'Requirements met' };
    }

    /**
     * Upgrade a card stack to the next level
     * @param {string} cardType - Type of card to upgrade
     */
    async upgradeCard(cardType) {
        debug('UI', `UPGRADE CLICKED: Attempting to upgrade ${cardType}`);
        debug('UI', `Current credits: ${playerCredits.getCredits()}`);

        // Get the card stack directly from inventory to ensure we're modifying the source data
        const cardStack = this.cui.inventory.cardStacks.get(cardType);

        if (!cardStack) {
            debug('UI', `Card stack not found: ${cardType}`);
            return;
        }

        const upgradeCheck = this.canUpgrade(cardStack);
        if (!upgradeCheck.canUpgrade) {
            debug('UI', `Cannot upgrade ${cardType}: ${upgradeCheck.reason}`);
            return;
        }

        const currentLevel = cardStack.level;
        const nextLevel = currentLevel + 1;
        const upgradeCost = this.getUpgradeCost(nextLevel);

        debug('UI', `Card ${cardType} - Current Level: ${currentLevel}, Next Level: ${nextLevel}, Count: ${cardStack.count}`);
        debug('UI', `Upgrade to level ${nextLevel} requires: ${upgradeCost.cards} cards + ${upgradeCost.credits} credits`);
        debug('UI', `Requirements met! Proceeding with upgrade...`);

        // Perform the upgrade directly on the cardStack source data
        try {
            // Consume cards from the source card stack
            cardStack.count -= upgradeCost.cards;
            debug('AI', `Cards consumed: ${upgradeCost.cards}, remaining: ${cardStack.count}`);

            // Consume credits
            const creditsSpent = playerCredits.spendCredits(upgradeCost.credits, `Upgrade ${cardType} to level ${nextLevel}`);
            if (!creditsSpent) {
                debug('UI', 'Failed to spend credits for upgrade');
                return;
            }
            debug('AI', `Credits consumed: ${upgradeCost.credits}, remaining: ${playerCredits.getCredits()}`);

            // Increase level in the source card stack
            cardStack.level = nextLevel;

            // Update any slotted cards of the same type to the new level
            let updatedSlotCount = 0;
            this.cui.shipSlots.forEach((slottedCard, slotId) => {
                if (slottedCard.cardType === cardType) {
                    slottedCard.level = nextLevel;
                    updatedSlotCount++;
                    debug('UI', `Updated slotted ${cardType} in slot ${slotId} to level ${nextLevel}`);
                }
            });

            if (updatedSlotCount > 0) {
                debug('UI', `Updated ${updatedSlotCount} slotted card(s) of type ${cardType} to level ${nextLevel}`);
                // Save the configuration to persist the level changes
                this.cui.saveCurrentShipConfiguration();
            }

            debug('UI', `Successfully upgraded ${cardType} to level ${nextLevel}`);
            debug('UI', `Consumed ${upgradeCost.cards} cards and ${upgradeCost.credits} credits`);

            // If we consumed all cards in the stack, mark as undiscovered but keep the level progress
            if (cardStack.count <= 0) {
                debug('AI', `Card stack ${cardType} depleted (Level ${cardStack.level} progress retained)`);
                // Don't remove from inventory, just set count to 0 - level progress is preserved
            }

            // Refresh ship systems and cargo holds to reflect the upgrade
            await this.refreshShipSystems();

            // Re-render the inventory to reflect changes
            debug('UI', `Re-rendering inventory...`);
            this.cui.render();

            // Play upgrade success sound
            debug('UI', `Playing upgrade sound...`);
            this.cui.playUpgradeSound();

        } catch (error) {
            debug('UI', `Error during upgrade: ${error.message}`);
        }
    }

    /**
     * Refresh ship systems after an upgrade
     */
    async refreshShipSystems() {
        try {
            if (window.viewManager && window.viewManager.ship) {
                const ship = window.viewManager.ship;

                // Refresh ship systems from updated card configuration
                if (ship.cardSystemIntegration) {
                    await ship.cardSystemIntegration.createSystemsFromCards();
                    debug('UI', 'Ship systems refreshed after card upgrade');

                    // Re-initialize cargo holds from updated cards
                    if (ship.cargoHoldManager) {
                        ship.cargoHoldManager.initializeFromCards();
                        debug('UI', 'Cargo holds refreshed after card upgrade');
                    }
                }
            }
        } catch (error) {
            debug('UI', `Failed to refresh ship systems after upgrade: ${error.message}`);
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.cui = null;
    }
}
