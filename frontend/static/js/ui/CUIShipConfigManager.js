/**
 * CUIShipConfigManager
 *
 * Extracted from CardInventoryUI to reduce file size.
 * Handles ship configuration loading, saving, and switching.
 *
 * Features:
 * - Load ship configuration from saved data or starter cards
 * - Load current ship configuration from active ship
 * - Save ship configuration to player data
 * - Ship switching coordination
 * - Card-to-slot type mapping
 */

import { debug } from '../debug.js';
import { SHIP_CONFIGS, getStarterCards } from '../ship/ShipConfigs.js';

// Card type to preferred slot type mapping
const CARD_TO_SLOT_TYPE = {
    'impulse_engines': 'engines',
    'warp_drive': 'warpDrive',
    'shields': 'shields',
    'shield_generator': 'shields',
    'energy_reactor': 'reactor',
    'laser_cannon': 'weapons',
    'plasma_cannon': 'weapons',
    'pulse_cannon': 'weapons',
    'phaser_array': 'weapons',
    'standard_missile': 'weapons',
    'homing_missile': 'weapons',
    'photon_torpedo': 'weapons',
    'proximity_mine': 'weapons',
    'long_range_scanner': 'scanner',
    'target_computer': 'utility',
    'basic_radar': 'utility',
    'advanced_radar': 'utility',
    'tactical_radar': 'utility',
    'subspace_radio': 'radio',
    'galactic_chart': 'galacticChart',
    'cargo_hold': 'utility',
    'hull_plating': 'utility'
};

// System name to card type mapping
const SYSTEM_TO_CARD_TYPE = {
    'impulseEngines': 'impulse_engines',
    'warpDrive': 'warp_drive',
    'shields': 'shields',
    'shieldGenerator': 'shield_generator',
    'weapons': 'laser_cannon',
    'hullPlating': 'hull_plating',
    'longRangeScanner': 'long_range_scanner',
    'subspaceRadio': 'subspace_radio',
    'galacticChart': 'galactic_chart',
    'targetComputer': 'target_computer',
    'energyReactor': 'energy_reactor',
    'cargoHold': 'cargo_hold'
};

export class CUIShipConfigManager {
    /**
     * Create a CUIShipConfigManager
     * @param {Object} cardInventoryUI - Reference to parent CardInventoryUI
     * @param {Object} playerData - Reference to player data instance
     */
    constructor(cardInventoryUI, playerData) {
        this.cui = cardInventoryUI;
        this.playerData = playerData;
    }

    /**
     * Get preferred slot type for a card type
     * @param {string} cardType - Card type
     * @returns {string} Preferred slot type
     */
    getPreferredSlotType(cardType) {
        return CARD_TO_SLOT_TYPE[cardType] || 'utility';
    }

    /**
     * Build slot type to index mapping for a ship config
     * @param {Object} shipConfig - Ship configuration
     * @returns {Object} Map of slot type to array of slot indices
     */
    buildSlotTypeToIndexMap(shipConfig) {
        const slotTypeMapping = this.cui.generateSlotTypeMapping(shipConfig);
        const slotTypeToIndex = {};

        Object.entries(slotTypeMapping).forEach(([slotIndex, slotType]) => {
            if (!slotTypeToIndex[slotType]) {
                slotTypeToIndex[slotType] = [];
            }
            slotTypeToIndex[slotType].push(parseInt(slotIndex));
        });

        return slotTypeToIndex;
    }

    /**
     * Find available slot for a card type
     * @param {string} cardType - Card type
     * @param {Object} slotTypeToIndex - Slot type to index mapping
     * @returns {number|null} Slot index or null if not found
     */
    findAvailableSlot(cardType, slotTypeToIndex) {
        const preferredSlotType = this.getPreferredSlotType(cardType);
        let targetSlotIndex = null;

        // Try preferred slot type first
        if (slotTypeToIndex[preferredSlotType]) {
            for (const slotIndex of slotTypeToIndex[preferredSlotType].sort((a, b) => a - b)) {
                if (!this.cui.shipSlots.has(slotIndex.toString())) {
                    targetSlotIndex = slotIndex;
                    break;
                }
            }
        }

        // Weapons can ONLY go in weapon slots
        if (targetSlotIndex === null && this.cui.isWeaponCard(cardType)) {
            debug('UI', `WEAPON SLOT VIOLATION: Cannot place weapon ${cardType} - no weapon slots available`);
            return null;
        }

        // Non-weapons can fall back to utility slots
        if (targetSlotIndex === null && !this.cui.isWeaponCard(cardType) && slotTypeToIndex['utility']) {
            for (const slotIndex of slotTypeToIndex['utility'].sort((a, b) => a - b)) {
                if (!this.cui.shipSlots.has(slotIndex.toString())) {
                    targetSlotIndex = slotIndex;
                    break;
                }
            }
        }

        return targetSlotIndex;
    }

    /**
     * Load starter cards for a ship type
     * @param {string} shipType - Ship type
     */
    loadStarterCards(shipType) {
        const starterCards = getStarterCards(shipType);
        if (!starterCards || Object.keys(starterCards).length === 0) {
            debug('UI', `No starter cards defined for ${shipType}`);
            return;
        }

        const shipConfig = SHIP_CONFIGS[shipType];
        const slotTypeToIndex = this.buildSlotTypeToIndexMap(shipConfig);
        const slotTypeMapping = this.cui.generateSlotTypeMapping(shipConfig);

        Object.entries(starterCards).forEach(([slotId, cardData]) => {
            const cardType = cardData.cardType;
            const level = cardData.level || 1;

            const targetSlotIndex = this.findAvailableSlot(cardType, slotTypeToIndex);

            if (targetSlotIndex !== null) {
                const card = this.cui.inventory.generateSpecificCard(cardType, 'common');
                card.level = level;
                this.cui.shipSlots.set(targetSlotIndex.toString(), card);
                debug('TARGETING', `Loaded starter card ${cardType} (Lv.${level}) into slot ${targetSlotIndex} (${slotTypeMapping[targetSlotIndex]})`);
            } else {
                debug('UI', `FAILED: No slot found for starter card ${cardType}`);
            }
        });
    }

    /**
     * Load saved configuration with named slot mapping
     * @param {Map} config - Saved configuration
     * @param {string} shipType - Ship type
     */
    loadSavedConfiguration(config, shipType) {
        const shipConfig = SHIP_CONFIGS[shipType];
        const slotTypeToIndex = this.buildSlotTypeToIndexMap(shipConfig);
        const slotTypeMapping = this.cui.generateSlotTypeMapping(shipConfig);

        config.forEach((cardData, slotId) => {
            const cardType = cardData.cardType;
            const level = cardData.level || 1;

            // If slotId is numeric, use it directly
            if (!isNaN(slotId)) {
                const card = this.cui.inventory.generateSpecificCard(cardType, 'common');
                card.level = level;
                this.cui.shipSlots.set(slotId, card);
                debug('UI', `Loaded ${cardType} (Lv.${level}) from numeric slot ${slotId}`);
                return;
            }

            // Map named slots to numerical indices
            const targetSlotIndex = this.findAvailableSlot(cardType, slotTypeToIndex);

            if (targetSlotIndex !== null) {
                const card = this.cui.inventory.generateSpecificCard(cardType, 'common');
                card.level = level;
                this.cui.shipSlots.set(targetSlotIndex.toString(), card);
                debug('TARGETING', `Loaded ${cardType} (Lv.${level}) from named slot ${slotId} to slot ${targetSlotIndex}`);
            } else {
                debug('UI', `FAILED: No slot found for card ${cardType} from slot ${slotId}`);
            }
        });
    }

    /**
     * Load ship configuration from saved data or starter cards
     * @param {string} shipType - Ship type to load configuration for
     */
    loadShipConfiguration(shipType) {
        debug('UTILITY', `Loading configuration for ${shipType}`);

        const config = this.playerData.getShipConfiguration(shipType);
        this.cui.shipSlots.clear();

        if (config.size === 0) {
            debug('UI', `No saved configuration for ${shipType}, loading starter cards`);
            this.loadStarterCards(shipType);
        } else if (shipType === 'starter_ship') {
            // Starter ship may have named slots that need mapping
            this.loadSavedConfiguration(config, shipType);
        } else {
            // Regular configuration with numerical slot indices
            config.forEach((cardData, slotId) => {
                const card = this.cui.inventory.generateSpecificCard(cardData.cardType, 'common');
                card.level = cardData.level || 1;
                this.cui.shipSlots.set(slotId, card);
                debug('UI', `Loaded ${cardData.cardType} (Lv.${card.level}) from slot ${slotId}`);
            });
        }

        debug('UI', `Loaded ${this.cui.shipSlots.size} cards for ${shipType}`);
        this.syncWithShipIntegration();
    }

    /**
     * Sync loaded cards with ship's CardSystemIntegration
     */
    syncWithShipIntegration() {
        if (!window.viewManager?.ship?.cardSystemIntegration) {
            debug('UI', 'CardSystemIntegration not available for sync');
            return;
        }

        window.viewManager.ship.cardSystemIntegration.installedCards.clear();

        this.cui.shipSlots.forEach((card, slotId) => {
            window.viewManager.ship.cardSystemIntegration.installedCards.set(slotId, {
                cardType: card.cardType,
                level: card.level
            });
        });

        debug('UI', `Synced ${this.cui.shipSlots.size} cards with CardSystemIntegration`);
    }

    /**
     * Load current ship configuration from the active ship instance
     * @param {Object} ship - Active ship instance
     */
    loadCurrentShipConfiguration(ship) {
        if (!ship) {
            debug('UI', 'No ship provided to load configuration from');
            return;
        }

        debug('UTILITY', `Loading configuration from ship: ${ship.shipType}`);
        this.cui.shipSlots.clear();

        const shipConfig = SHIP_CONFIGS[ship.shipType];

        // Try CardSystemIntegration first (most reliable)
        if (ship.cardSystemIntegration?.installedCards?.size > 0) {
            debug('UI', `Loading from CardSystemIntegration: ${ship.cardSystemIntegration.installedCards.size} cards`);
            ship.cardSystemIntegration.installedCards.forEach((cardData, slotId) => {
                const card = this.cui.inventory.generateSpecificCard(cardData.cardType, 'common');
                card.level = cardData.level || 1;
                this.cui.shipSlots.set(slotId, card);
                debug('UI', `Loaded ${cardData.cardType} (Lv.${card.level}) from slot ${slotId}`);
            });
            debug('UI', `Loaded ${this.cui.shipSlots.size} cards from CardSystemIntegration`);
            return;
        }

        // Try starter cards if defined
        if (shipConfig?.starterCards) {
            debug('UI', `Loading starter cards for ${ship.shipType}`);
            const slotTypeToIndex = this.buildSlotTypeToIndexMap(shipConfig);
            const slotTypeMapping = this.cui.generateSlotTypeMapping(shipConfig);

            Object.entries(shipConfig.starterCards).forEach(([cardType, cardData]) => {
                const level = typeof cardData === 'number' ? cardData : cardData.level || 1;
                const targetSlotIndex = this.findAvailableSlot(cardType, slotTypeToIndex);

                if (targetSlotIndex !== null) {
                    const card = this.cui.inventory.generateSpecificCard(cardType, 'common');
                    card.level = level;
                    this.cui.shipSlots.set(targetSlotIndex.toString(), card);
                    debug('TARGETING', `Loaded starter ${cardType} (Lv.${level}) into slot ${targetSlotIndex}`);
                }
            });
            debug('UI', `Loaded ${this.cui.shipSlots.size} cards from starter cards`);
            return;
        }

        // Fall back to ship.systems
        if (ship.systems) {
            debug('UTILITY', `Loading from ship.systems for ${ship.shipType}`);
            let slotIndex = 0;

            Object.entries(ship.systems).forEach(([systemName, system]) => {
                const cardType = SYSTEM_TO_CARD_TYPE[systemName];
                if (cardType && system?.level) {
                    const card = this.cui.inventory.generateSpecificCard(cardType, 'common');
                    card.level = system.level;
                    this.cui.shipSlots.set(slotIndex.toString(), card);
                    debug('UI', `Loaded ${cardType} (Lv.${card.level}) from ${systemName}`);
                    slotIndex++;
                }
            });
        }

        debug('UI', `Loaded ${this.cui.shipSlots.size} cards from ship`);
    }

    /**
     * Save current ship configuration
     */
    saveCurrentShipConfiguration() {
        if (!this.cui.currentShipType) return;

        const config = new Map();
        this.cui.shipSlots.forEach((card, slotId) => {
            config.set(slotId, {
                cardType: card.cardType,
                level: card.level || 1
            });
        });

        this.playerData.saveShipConfiguration(this.cui.currentShipType, config);
        debug('UI', `Saved configuration for ${this.cui.currentShipType}`);
    }

    /**
     * Switch to a different ship type
     * @param {string} shipType - Ship type to switch to
     */
    async switchShip(shipType) {
        debug('UI', `Switching from ${this.cui.currentShipType} to ${shipType}`);

        // Save current configuration
        this.saveCurrentShipConfiguration();

        // Update ship type
        this.cui.currentShipType = shipType;
        this.cui.currentShipConfig = SHIP_CONFIGS[shipType];

        // Add ship to owned ships
        if (!this.playerData.ownsShip(shipType)) {
            this.playerData.addShip(shipType);
        }

        // Clear and load new configuration
        this.cui.shipSlots.clear();
        this.loadShipConfiguration(shipType);

        // Update UI
        this.cui.renderShipSlots();

        // Update actual ship instance
        if (this.cui.dockingInterface?.starfieldManager?.viewManager) {
            await this.cui.dockingInterface.starfieldManager.viewManager.switchShip(shipType);
        }

        debug('UI', `Ship switched to ${shipType}`);
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.cui = null;
        this.playerData = null;
    }
}
