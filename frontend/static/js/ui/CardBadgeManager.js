/**
 * CardBadgeManager
 *
 * Extracted from CardInventoryUI.js to reduce god class size.
 * Manages NEW and quantity increase badges for cards.
 *
 * Uses localStorage to persist badge state across sessions.
 */

import { debug } from '../debug.js';

// localStorage keys
const STORAGE_KEYS = {
    LAST_SHOP_VISIT: 'planetz_last_shop_visit',
    NEW_CARD_TIMESTAMPS: 'planetz_new_card_timestamps',
    QUANTITY_INCREASE_TIMESTAMPS: 'planetz_quantity_increase_timestamps'
};

export class CardBadgeManager {
    constructor() {
        this.lastShopVisit = this.getLastShopVisit();
        this.newCardTimestamps = this.getNewCardTimestamps();
        this.quantityIncreaseTimestamps = this.getQuantityIncreaseTimestamps();
    }

    /**
     * Get the timestamp of the last shop visit from localStorage
     * @returns {number} Timestamp or 0 if never visited
     */
    getLastShopVisit() {
        const stored = localStorage.getItem(STORAGE_KEYS.LAST_SHOP_VISIT);
        return stored ? parseInt(stored) : 0;
    }

    /**
     * Save the current timestamp as the last shop visit
     */
    saveLastShopVisit() {
        const now = Date.now();
        localStorage.setItem(STORAGE_KEYS.LAST_SHOP_VISIT, now.toString());
        this.lastShopVisit = now;
    }

    /**
     * Get the timestamps when cards were awarded from localStorage
     * @returns {Object} Map of cardType -> timestamp
     */
    getNewCardTimestamps() {
        const stored = localStorage.getItem(STORAGE_KEYS.NEW_CARD_TIMESTAMPS);
        return stored ? JSON.parse(stored) : {};
    }

    /**
     * Get the quantity increase timestamps from localStorage
     * @returns {Object} Map of cardType -> timestamp
     */
    getQuantityIncreaseTimestamps() {
        const stored = localStorage.getItem(STORAGE_KEYS.QUANTITY_INCREASE_TIMESTAMPS);
        return stored ? JSON.parse(stored) : {};
    }

    /**
     * Save the new card timestamps to localStorage
     */
    saveNewCardTimestamps() {
        localStorage.setItem(STORAGE_KEYS.NEW_CARD_TIMESTAMPS, JSON.stringify(this.newCardTimestamps));
    }

    /**
     * Save the quantity increase timestamps to localStorage
     */
    saveQuantityIncreaseTimestamps() {
        localStorage.setItem(STORAGE_KEYS.QUANTITY_INCREASE_TIMESTAMPS, JSON.stringify(this.quantityIncreaseTimestamps));
    }

    /**
     * Mark a card as newly awarded
     * @param {string} cardType - The type of card that was awarded
     */
    markCardAsNew(cardType) {
        this.newCardTimestamps[cardType] = Date.now();
        this.saveNewCardTimestamps();
    }

    /**
     * Check if a card should show the NEW badge
     * @param {string} cardType - The type of card to check
     * @returns {boolean} True if the card should show NEW badge
     */
    isCardNew(cardType) {
        const cardTimestamp = this.newCardTimestamps[cardType];
        return cardTimestamp && cardTimestamp > this.lastShopVisit;
    }

    /**
     * Mark a card as having a quantity increase
     * @param {string} cardType - The type of card that had a quantity increase
     */
    markCardQuantityIncrease(cardType) {
        debug('UI', `Marking quantity increase for ${cardType}`);
        this.quantityIncreaseTimestamps[cardType] = Date.now();
        this.saveQuantityIncreaseTimestamps();
    }

    /**
     * Check if a card has a quantity increase
     * @param {string} cardType - The type of card to check
     * @returns {boolean} True if the card has a quantity increase
     */
    hasQuantityIncrease(cardType) {
        // Also check localStorage directly as fallback
        const stored = localStorage.getItem(STORAGE_KEYS.QUANTITY_INCREASE_TIMESTAMPS);
        const timestamps = stored ? JSON.parse(stored) : {};

        // Use localStorage data if instance data is empty
        if (Object.keys(this.quantityIncreaseTimestamps).length === 0 && Object.keys(timestamps).length > 0) {
            return timestamps.hasOwnProperty(cardType);
        }

        return this.quantityIncreaseTimestamps.hasOwnProperty(cardType);
    }

    /**
     * Clear NEW status for all cards (called when shop is opened)
     */
    clearNewCardStatus() {
        // Update last shop visit to current time
        this.saveLastShopVisit();
        // No need to clear timestamps - they'll be compared against the new lastShopVisit
    }

    /**
     * Clear quantity increase status for all cards (called when collection is opened)
     */
    clearQuantityIncreaseStatus() {
        this.quantityIncreaseTimestamps = {};
        this.saveQuantityIncreaseTimestamps();
    }

    /**
     * Reload quantity increase timestamps from localStorage
     * Useful when data may have been modified externally
     */
    reloadQuantityIncreaseTimestamps() {
        this.quantityIncreaseTimestamps = this.getQuantityIncreaseTimestamps();
    }
}

// Singleton instance
let badgeManagerInstance = null;

/**
 * Get the singleton CardBadgeManager instance
 * @returns {CardBadgeManager}
 */
export function getBadgeManager() {
    if (!badgeManagerInstance) {
        badgeManagerInstance = new CardBadgeManager();
    }
    return badgeManagerInstance;
}
