/**
 * Player Data Management
 * Extracted from CardInventoryUI.js for modularity.
 *
 * Handles:
 * - Ship ownership tracking
 * - Ship configurations (equipped cards)
 * - Ship purchases
 */

import { getStarterCards } from '../ship/ShipConfigs.js';
import { playerCredits } from '../utils/PlayerCredits.js';

/**
 * Simple player data structure for ship ownership
 */
export class PlayerData {
    constructor() {
        this.ownedShips = new Set(['starter_ship']); // Player starts with starter ship
        this.shipConfigurations = new Map(); // Store equipped cards for each ship

        // Initialize starter ship using centralized starter card configuration
        const starterCards = getStarterCards('starter_ship');
        const starterCardMap = new Map();
        Object.entries(starterCards).forEach(([slotId, cardData]) => {
            starterCardMap.set(slotId, cardData);
        });
        this.shipConfigurations.set('starter_ship', starterCardMap);
    }

    /**
     * Add a ship to the player's collection
     * @param {string} shipType - Ship type to add
     */
    addShip(shipType) {
        this.ownedShips.add(shipType);
        // Initialize empty configuration for new ship
        if (!this.shipConfigurations.has(shipType)) {
            this.shipConfigurations.set(shipType, new Map());
        }
    }

    /**
     * Check if player owns a specific ship
     * @param {string} shipType - Ship type to check
     * @returns {boolean}
     */
    ownsShip(shipType) {
        return this.ownedShips.has(shipType);
    }

    /**
     * Get list of owned ships
     * @returns {Array<string>}
     */
    getOwnedShips() {
        return Array.from(this.ownedShips);
    }

    /**
     * Purchase a ship if player has enough credits
     * @param {string} shipType - Ship type to purchase
     * @param {number} cost - Cost of the ship
     * @returns {boolean} - Whether purchase was successful
     */
    purchaseShip(shipType, cost) {
        if (playerCredits.canAfford(cost) && !this.ownedShips.has(shipType)) {
            if (playerCredits.spendCredits(cost, `Purchase ship: ${shipType}`)) {
                this.addShip(shipType);
                return true;
            }
        }
        return false;
    }

    /**
     * Get ship configuration (equipped cards)
     * @param {string} shipType - Ship type
     * @returns {Map} - Map of slotId -> cardData
     */
    getShipConfiguration(shipType) {
        return this.shipConfigurations.get(shipType) || new Map();
    }

    /**
     * Save ship configuration (equipped cards)
     * @param {string} shipType - Ship type
     * @param {Map} configuration - Map of slotId -> cardData
     */
    saveShipConfiguration(shipType, configuration) {
        this.shipConfigurations.set(shipType, new Map(configuration));
    }

    /**
     * Install a card in a specific ship's slot
     * @param {string} shipType - Ship type
     * @param {string} slotId - Slot identifier
     * @param {Object} cardData - Card data {cardType, level}
     */
    installCardInShip(shipType, slotId, cardData) {
        if (!this.shipConfigurations.has(shipType)) {
            this.shipConfigurations.set(shipType, new Map());
        }
        this.shipConfigurations.get(shipType).set(slotId, cardData);
    }

    /**
     * Remove a card from a specific ship's slot
     * @param {string} shipType - Ship type
     * @param {string} slotId - Slot identifier
     */
    removeCardFromShip(shipType, slotId) {
        const config = this.shipConfigurations.get(shipType);
        if (config) {
            config.delete(slotId);
        }
    }
}

// Global player data instance (singleton)
export const playerData = new PlayerData();

export default PlayerData;
