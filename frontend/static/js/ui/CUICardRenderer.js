/**
 * CUICardRenderer
 *
 * Extracted from CardInventoryUI to reduce file size.
 * Handles rendering of inventory cards and card stacks.
 *
 * Features:
 * - Inventory grid rendering
 * - Card stack rendering with upgrade buttons
 * - Badge rendering (NEW, quantity increase)
 * - Collection statistics
 */

import { debug } from '../debug.js';
import { playerCredits } from '../utils/PlayerCredits.js';

export class CUICardRenderer {
    /**
     * Create a CUICardRenderer
     * @param {Object} cardInventoryUI - Reference to parent CardInventoryUI
     */
    constructor(cardInventoryUI) {
        this.cui = cardInventoryUI;
    }

    /**
     * Render the inventory grid with all discovered cards
     */
    renderInventoryGrid() {
        const grid = document.getElementById('inventory-grid');
        if (!grid) return;

        const cards = this.cui.inventory.getDiscoveredCards();

        grid.innerHTML = cards.map(stack => this.renderCardStack(stack)).join('');
    }

    /**
     * Render a single card stack
     * @param {Object} stack - Card stack data
     * @returns {string} HTML for the card stack
     */
    renderCardStack(stack) {
        const card = stack.sampleCard;
        const rarityColor = card.getRarityColor();

        // Calculate upgrade requirements
        const currentLevel = stack.level;
        const nextLevel = currentLevel + 1;
        const maxLevel = 5;
        const canUpgrade = nextLevel <= maxLevel;

        // Upgrade cost calculation based on spec
        const upgradeCosts = {
            2: { cards: 3, credits: 1000 },
            3: { cards: 6, credits: 5000 },
            4: { cards: 12, credits: 15000 },
            5: { cards: 24, credits: 50000 }
        };

        const upgradeCost = upgradeCosts[nextLevel];
        const hasEnoughCards = canUpgrade && stack.count >= upgradeCost?.cards;
        const hasEnoughCredits = canUpgrade && playerCredits.canAfford(upgradeCost?.credits || 0);
        const canAffordUpgrade = hasEnoughCards && hasEnoughCredits;

        // Determine the appropriate CSS class and button content
        let buttonClass = '';
        let buttonIcon = '';
        let buttonText = `Upgrade to Lv.${nextLevel}`;

        if (canAffordUpgrade) {
            buttonClass = 'upgrade-available';
            buttonIcon = '⬆️';
        } else if (!hasEnoughCards && !hasEnoughCredits) {
            buttonClass = 'upgrade-unavailable';
            buttonIcon = '⚫';
            buttonText = `Need Cards & Credits`;
        } else if (!hasEnoughCards) {
            buttonClass = 'insufficient-cards';
            buttonIcon = '⚫';
            buttonText = `Need ${upgradeCost.cards - stack.count} More Cards`;
        } else if (!hasEnoughCredits) {
            buttonClass = 'insufficient-credits';
            buttonIcon = '⚫';
            buttonText = `Need ${(upgradeCost.credits - playerCredits.getCredits()).toLocaleString()} More Credits`;
        }

        // Create tooltip text for upgrade requirements
        const tooltipText = canUpgrade ?
            `Upgrade to Level ${nextLevel}: ${upgradeCost.cards}x cards + ${upgradeCost.credits.toLocaleString()} credits` :
            'Maximum level reached';

        // Upgrade button HTML
        const upgradeButton = canUpgrade ? `
            <button class="upgrade-btn ${buttonClass}"
                    onclick="cardInventoryUI.upgradeCard('${card.cardType}')"
                    title="${tooltipText}"
                    ${!canAffordUpgrade ? 'disabled' : ''}>
                ${buttonIcon} ${buttonText}
            </button>
        ` : `
            <div class="max-level-indicator" title="${tooltipText}">🏆 MAX LEVEL</div>
        `;

        // Check if this card should show NEW badge
        const isNew = this.cui.isCardNew(card.cardType);
        const newBadge = isNew ? '<div class="new-badge">NEW</div>' : '';

        // Check if this card has a quantity increase (red badge)
        const hasQuantityIncrease = this.cui.hasQuantityIncrease(card.cardType);
        const countStyle = hasQuantityIncrease ? 'background-color: #ff4444; color: white; font-weight: bold; padding: 2px 4px; border-radius: 3px;' : '';

        return `
            <div class="collection-card-item ${isNew ? 'has-new-badge' : ''}"
                 draggable="true"
                 data-card-type="${card.cardType}"
                 data-card-level="${stack.level}"
                 data-rarity="${card.rarity}">
                <div class="card-header">
                    <div class="card-icon">${card.getIcon()}</div>
                    ${newBadge}
                    ${!isNew ? `<div class="card-count-badge" style="${countStyle}">x${stack.count}</div>` : ''}
                </div>
                <div class="card-body">
                    <div class="card-name">${stack.name}</div>
                    <div class="card-level">Level ${stack.level}</div>
                    <div class="card-rarity" style="color: ${rarityColor}">${card.rarity.toUpperCase()}</div>
                </div>
                <div class="card-footer">
                    ${upgradeButton}
                </div>
            </div>
        `;
    }

    /**
     * Update collection statistics display
     */
    updateCollectionStats() {
        const statsElement = document.getElementById('collection-stats');
        if (!statsElement) return;

        const stats = this.cui.inventory.getCollectionStats();

        statsElement.innerHTML = `
            <h3>COLLECTION PROGRESS</h3>
            <div class="stats-grid">
                <div>Discovered: ${stats.discoveredCardTypes}/${stats.totalCardTypes}</div>
                <div>Completion: ${stats.completionPercentage.toFixed(1)}%</div>
                <div>Total Cards: ${stats.totalCardsCollected}</div>
            </div>
        `;
    }

    /**
     * Update credits display
     */
    updateCreditsDisplay() {
        if (this.cui.isShopMode) {
            // Create or update credits display in shop mode
            let creditsDisplay = document.getElementById('credits-display');
            if (!creditsDisplay) {
                creditsDisplay = document.createElement('div');
                creditsDisplay.id = 'credits-display';
                creditsDisplay.style.cssText = `
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    background: rgba(0, 0, 0, 0.8);
                    border: 2px solid #00ff41;
                    padding: 15px 20px;
                    font-size: 18px;
                    font-weight: bold;
                    color: #00ff41;
                    border-radius: 5px;
                    box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
                    z-index: 1001;
                `;
                document.body.appendChild(creditsDisplay);
            }
            creditsDisplay.innerHTML = `💰 Credits: ${playerCredits.getFormattedCredits()}`;

            // Register for automatic updates
            playerCredits.registerDisplay(creditsDisplay, (el, credits) => {
                el.innerHTML = `💰 Credits: ${credits.toLocaleString()}`;
            });
        }

        debug('UI', `💰 Credits: ${playerCredits.getFormattedCredits()}`);
    }

    /**
     * Update ship stats display
     */
    updateShipStats() {
        const statsElement = document.getElementById('ship-stats');
        if (!statsElement) return;

        const config = this.cui.currentShipConfig;

        statsElement.innerHTML = `
            <h3>${config.name.toUpperCase()}</h3>
            <div class="ship-info">
                <div>Type: ${this.cui.currentShipType}</div>
                <div>Slots: ${config.systemSlots}</div>
                <div>Description: ${config.description}</div>
            </div>
        `;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.cui = null;
    }
}
