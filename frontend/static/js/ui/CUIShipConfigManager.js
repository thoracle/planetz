/**
 * CUIShipConfigManager
 *
 * Extracted from CardInventoryUI to reduce file size.
 * Handles ship configuration loading and saving.
 *
 * Features:
 * - Load ship configuration from saved data
 * - Load current ship configuration from active ship
 * - Save ship configuration to player data
 * - Ship switching coordination
 */

import { debug } from '../debug.js';
import { SHIP_CONFIGS, getStarterCards } from '../ship/ShipConfigs.js';

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
     * Load ship configuration from saved data
     * @param {string} shipType - Ship type to load configuration for
     */
    loadShipConfiguration(shipType) {
        // First try to load saved configuration
        const savedConfig = this.playerData.getShipConfiguration(shipType);

        if (savedConfig && savedConfig.size > 0) {
            debug('UI', `Loading saved configuration for ${shipType}`);
            savedConfig.forEach((cardData, slotId) => {
                this.cui.shipSlots.set(slotId, cardData);
            });
            return;
        }

        // Fall back to starter cards if available
        const starterCards = getStarterCards(shipType);
        if (starterCards && Object.keys(starterCards).length > 0) {
            debug('UI', `Loading starter cards for ${shipType}`);
            Object.entries(starterCards).forEach(([slotId, cardData]) => {
                this.cui.shipSlots.set(slotId, cardData);
            });
            return;
        }

        debug('UI', `No configuration found for ${shipType}, starting with empty slots`);
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

        debug('UTILITY', `Loading current ship configuration from actual ship: ${ship.shipType}`);

        // Clear existing slots
        this.cui.shipSlots.clear();

        const shipConfig = SHIP_CONFIGS[ship.shipType];

        // Try to load starter cards first for ships that have them defined
        if (shipConfig && shipConfig.starterCards) {
            debug('UI', `Loading starter cards for ${ship.shipType}`);

            // Build a mapping of slot types to available slot indices
            const slotTypeToIndex = {};
            const slotTypeMapping = this.cui.slotRenderer ?
                this.cui.slotRenderer.generateSlotTypeMapping(shipConfig) :
                this.cui.generateSlotTypeMapping(shipConfig);

            for (let i = 0; i < shipConfig.systemSlots; i++) {
                const slotType = slotTypeMapping[i] || 'utility';
                if (!slotTypeToIndex[slotType]) {
                    slotTypeToIndex[slotType] = [];
                }
                slotTypeToIndex[slotType].push(i);
            }

            // Map starter cards to appropriate slots
            Object.entries(shipConfig.starterCards).forEach(([cardType, cardData]) => {
                const level = typeof cardData === 'number' ? cardData : cardData.level || 1;

                // Find the appropriate slot type for this card
                const preferredSlotType = this.getPreferredSlotType(cardType);

                // Find first available slot of the preferred type
                let targetSlotIndex = null;
                if (slotTypeToIndex[preferredSlotType]) {
                    for (const slotIndex of slotTypeToIndex[preferredSlotType].sort((a, b) => a - b)) {
                        if (!this.cui.shipSlots.has(slotIndex.toString())) {
                            targetSlotIndex = slotIndex;
                            break;
                        }
                    }
                }

                // Weapon cards MUST go in weapon slots
                if (targetSlotIndex === null && this.cui.isWeaponCard(cardType)) {
                    debug('UI', `WEAPON SLOT VIOLATION: Cannot place weapon ${cardType} - no weapon slots available`);
                    return;
                }

                // Non-weapon cards can fall back to utility slots
                if (targetSlotIndex === null && !this.cui.isWeaponCard(cardType) && slotTypeToIndex['utility']) {
                    for (const slotIndex of slotTypeToIndex['utility'].sort((a, b) => a - b)) {
                        if (!this.cui.shipSlots.has(slotIndex.toString())) {
                            targetSlotIndex = slotIndex;
                            break;
                        }
                    }
                }

                if (targetSlotIndex !== null) {
                    this.cui.shipSlots.set(targetSlotIndex.toString(), { cardType, level });
                    debug('TARGETING', `Loaded default starter card ${cardType} (Lv.${level}) into slot ${targetSlotIndex} (${slotTypeMapping[targetSlotIndex]})`);
                } else {
                    debug('UI', `FAILED: No available slot found for starter card ${cardType} - ship only has ${shipConfig.systemSlots} slots, ${this.cui.shipSlots.size} already used`);
                }
            });
        } else {
            // For non-starter ships, load from actual ship systems
            debug('UTILITY', `Loading systems for non-starter ship: ${ship.shipType}`);

            const systemToCardType = {
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

            if (ship.systems) {
                let slotIndex = 0;
                Object.entries(ship.systems).forEach(([systemName, system]) => {
                    const cardType = systemToCardType[systemName];
                    if (cardType && system && system.level) {
                        const card = {
                            cardType: cardType,
                            level: system.level || 1
                        };
                        this.cui.shipSlots.set(slotIndex.toString(), card);
                        debug('UI', `Loaded ${cardType} (Lv.${card.level}) from system ${systemName} in slot ${slotIndex}`);
                        slotIndex++;
                    } else if (!cardType) {
                        debug('UI', `No card mapping found for system: ${systemName}`);
                    } else if (!system || !system.level) {
                        debug('UI', `System ${systemName} has no level property`);
                    }
                });
            }
        }

        debug('UI', `Loaded ${this.cui.shipSlots.size} cards from current ship`);
    }

    /**
     * Get preferred slot type for a card type
     * @param {string} cardType - Card type
     * @returns {string} Preferred slot type
     */
    getPreferredSlotType(cardType) {
        const cardToSlotType = {
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
            'target_computer': 'targetComputer',
            'subspace_radio': 'radio',
            'galactic_chart': 'galacticChart',
            'cargo_hold': 'utility',
            'hull_plating': 'utility'
        };

        return cardToSlotType[cardType] || 'utility';
    }

    /**
     * Save current ship configuration
     */
    saveCurrentShipConfiguration() {
        const config = new Map(this.cui.shipSlots);
        this.playerData.saveShipConfiguration(this.cui.currentShipType, config);
        debug('UI', `Saved configuration for ${this.cui.currentShipType} with ${config.size} cards`);
    }

    /**
     * Switch to a different ship type
     * @param {string} shipType - Ship type to switch to
     */
    async switchShip(shipType) {
        debug('UI', `Switching ship type from ${this.cui.currentShipType} to ${shipType}`);

        // Save current configuration before switching
        this.saveCurrentShipConfiguration();

        // Update ship type and configuration
        this.cui.currentShipType = shipType;
        this.cui.currentShipConfig = SHIP_CONFIGS[shipType];

        // Add the ship to player's owned ships if not already owned
        if (!this.playerData.ownsShip(shipType)) {
            this.playerData.addShip(shipType);
            debug('UI', `Added ${shipType} to player's owned ships`);
        }

        // Clear current ship slots
        this.cui.shipSlots.clear();

        // Load new ship configuration
        this.loadShipConfiguration(shipType);

        // Update UI
        if (this.cui.slotRenderer) {
            this.cui.slotRenderer.renderShipSlots();
        } else {
            this.cui.renderShipSlots();
        }

        // Update the actual ship instance in ViewManager
        if (this.cui.dockingInterface?.starfieldManager?.viewManager) {
            debug('UI', `Updating ViewManager ship instance to ${shipType}`);
            await this.cui.dockingInterface.starfieldManager.viewManager.switchShip(shipType);
        } else {
            debug('UI', 'ViewManager not available - ship instance not updated');
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
