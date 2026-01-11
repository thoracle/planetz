/**
 * CUICardSlotManager
 *
 * Extracted from CardInventoryUI to reduce file size.
 * Handles card installation, removal, and cargo hold validation.
 *
 * Features:
 * - Card installation in slots
 * - Card removal with cargo hold protection
 * - Cargo hold removal validation
 * - Ship system synchronization
 */

import { debug } from '../debug.js';
import { CardValidationEngine } from './CardValidationEngine.js';

export class CUICardSlotManager {
    /**
     * Create a CUICardSlotManager
     * @param {Object} cardInventoryUI - Reference to parent CardInventoryUI
     */
    constructor(cardInventoryUI) {
        this.cui = cardInventoryUI;
    }

    /**
     * Install a card in a slot
     * @param {string} slotId - Slot ID
     * @param {string} cardType - Card type
     * @param {number} level - Card level
     * @returns {Promise<boolean>} Success status
     */
    async installCardInSlot(slotId, cardType, level) {
        try {
            // Create and install the card
            const card = this.cui.inventory.generateSpecificCard(cardType, 'common');
            card.level = level;

            // Install card in slot
            this.cui.shipSlots.set(slotId, card);

            debug('UI', `Installed ${card.cardType} in slot ${slotId}`);

            // Sync with ship's CardSystemIntegration
            if (window.viewManager?.ship?.cardSystemIntegration) {
                window.viewManager.ship.cardSystemIntegration.installedCards.set(slotId, {
                    cardType: card.cardType,
                    level: card.level
                });

                try {
                    await window.viewManager.ship.cardSystemIntegration.createSystemsFromCards();
                    if (window.viewManager.ship.cargoHoldManager) {
                        window.viewManager.ship.cargoHoldManager.initializeFromCards();
                    }
                } catch (error) {
                    debug('UI', `Failed to refresh ship systems: ${error.message}`);
                }
            }

            this.cui.saveCurrentShipConfiguration();
            this.cui.renderShipSlots();

            // Refresh help screen if weapon card
            if (this.cui.isWeaponCard(card.cardType) && window.starfieldManager?.helpInterface?.isVisible) {
                window.starfieldManager.helpInterface.forceRefresh();
            }

            return true;
        } catch (error) {
            debug('UI', `Failed to install card: ${error.message}`);
            return false;
        }
    }

    /**
     * Check if a cargo hold card can be removed safely
     * @param {Object} card - The card being removed
     * @param {number} slotId - The slot ID
     * @returns {Promise<boolean>} True if removal should be cancelled
     */
    async checkCargoHoldRemoval(card, slotId) {
        debug('UI', `CARGO CHECK: Checking ${card.cardType} in slot ${slotId}`);

        // Check if this is a cargo hold card
        if (!CardValidationEngine.isCargoHoldCard(card.cardType)) {
            debug('UI', `CARGO CHECK: ${card.cardType} is not a cargo hold card`);
            return false; // Not a cargo hold, proceed with normal removal
        }

        debug('UI', `CARGO CHECK: ${card.cardType} is a cargo hold card, checking for cargo...`);

        // Check if ship has cargo manager and if hold contains cargo
        if (!window.viewManager || !window.viewManager.ship || !window.viewManager.ship.cargoHoldManager) {
            debug('AI', `CARGO CHECK: No cargo manager available`);
            return false; // No cargo manager, proceed with removal
        }

        const cargoManager = window.viewManager.ship.cargoHoldManager;
        debug('UI', `CARGO CHECK: Found cargo manager with ${cargoManager.cargoHolds.size} holds`);

        // Find which cargo hold slot this card corresponds to
        let holdSlot = null;
        debug('UI', `CARGO CHECK: Looking for card slot ${slotId} in cargo holds`);
        for (const [holdSlotId, hold] of cargoManager.cargoHolds) {
            debug('UI', `CARGO CHECK: Checking hold ${holdSlotId} with slotId ${hold.slotId}`);
            if (hold.slotId === slotId) {
                holdSlot = holdSlotId;
                debug('UI', `CARGO CHECK: Found matching hold slot ${holdSlot}`);
                break;
            }
        }

        if (holdSlot === null) {
            debug('UI', `CARGO CHECK: No matching hold found for slot ${slotId}`);
            return false; // Hold not found, proceed with removal
        }

        // Check if hold contains cargo (use the actual card slot ID, not the hold map key)
        const hasCargo = cargoManager.hasCargoInHold(slotId);
        debug('UI', `CARGO CHECK: Hold ${holdSlot} (card slot ${slotId}) has cargo: ${hasCargo}`);
        if (!hasCargo) {
            debug('UI', `CARGO CHECK: Hold ${holdSlot} (card slot ${slotId}) is empty, proceeding with removal`);
            return false; // No cargo in hold, proceed with removal
        }

        // Get cargo contents for display (use the actual card slot ID)
        const cargoContents = cargoManager.getCargoInHold(slotId);
        debug('AI', `CARGO CHECK: Hold ${holdSlot} (card slot ${slotId}) contains ${cargoContents.length} cargo types`);

        debug('UI', `CARGO CHECK: Showing removal confirmation modal...`);
        // Show confirmation modal
        const result = await this.cui.showCargoRemovalConfirmation(card, slotId, holdSlot, cargoContents, cargoManager);
        debug('UI', `CARGO CHECK: Modal returned ${result} (true = cancel removal, false = proceed)`);
        return result;
    }

    /**
     * Remove a card from a ship slot
     * @param {string} slotId - Slot ID to remove card from
     */
    async removeCard(slotId) {
        const card = this.cui.shipSlots.get(slotId);
        if (card) {
            debug('UI', `CARGO PROTECTION: Checking removal of ${card.cardType} from slot ${slotId}`);

            // Check if this is a cargo hold card with cargo
            if (await this.checkCargoHoldRemoval(card, slotId)) {
                debug('UI', `CARGO PROTECTION: Removal cancelled for ${card.cardType}`);
                return; // Removal cancelled or handled by cargo dump process
            }

            debug('UI', `CARGO PROTECTION: Proceeding with removal of ${card.cardType}`);
            // Remove from ship slots
            this.cui.shipSlots.delete(slotId);

            // Sync with ship's CardSystemIntegration.installedCards Map
            if (window.viewManager && window.viewManager.ship && window.viewManager.ship.cardSystemIntegration) {
                window.viewManager.ship.cardSystemIntegration.installedCards.delete(slotId);
                debug('UI', `Removed card from ship's CardSystemIntegration: ${card.cardType}`);

                // Refresh ship systems from the updated card configuration
                try {
                    await window.viewManager.ship.cardSystemIntegration.createSystemsFromCards();

                    // Re-initialize cargo holds from updated cards
                    if (window.viewManager.ship.cargoHoldManager) {
                        window.viewManager.ship.cargoHoldManager.initializeFromCards();
                        debug('UI', 'Cargo holds refreshed after card removal');
                    }

                    debug('UI', 'Ship systems refreshed after card removal');
                } catch (error) {
                    debug('UI', `Failed to refresh ship systems: ${error.message}`);
                }
            } else {
                debug('UI', 'Could not sync with ship CardSystemIntegration - ship may not be available');
            }

            // Save the configuration to ensure changes persist
            this.cui.saveCurrentShipConfiguration();

            // Update the slot display
            this.cui.renderShipSlots();

            // Refresh help screen if it's open and this was a weapon card
            if (this.cui.isWeaponCard(card.cardType) && window.starfieldManager?.helpInterface?.isVisible) {
                window.starfieldManager.helpInterface.forceRefresh();
                debug('UI', 'Help screen refreshed after weapon removal');
            }

            debug('UI', `Removed ${card.cardType} from slot ${slotId}`);
            debug('UI', `Configuration saved with ${this.cui.shipSlots.size} total cards`);
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.cui = null;
    }
}
