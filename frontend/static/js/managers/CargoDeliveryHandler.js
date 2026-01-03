/**
 * CargoDeliveryHandler
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles automatic cargo delivery when docking at stations.
 *
 * Features:
 * - Checks loaded cargo against active delivery missions
 * - Automatically delivers matching cargo to destination stations
 * - Removes delivered cargo from ship's hold
 * - Triggers mission progress updates
 * - Refreshes cargo display after deliveries
 */

import { debug } from '../debug.js';

export class CargoDeliveryHandler {
    /**
     * Create a CargoDeliveryHandler
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
    }

    /**
     * Check for cargo deliveries upon docking
     * @param {string} stationKey - The station key/name where docking occurred
     */
    async checkCargoDeliveries(stationKey) {
        try {
            const ship = this.sfm.viewManager?.getShip();
            if (!ship || !ship.cargoHoldManager) {
                debug('AI', '🚛 No ship or cargo hold manager available for delivery check');
                return;
            }

            // Get all loaded cargo
            const loadedCargo = ship.cargoHoldManager.getLoadedCargo();
            if (!loadedCargo || loadedCargo.size === 0) {
                debug('UTILITY', '🚛 No cargo loaded - skipping delivery check');
                return;
            }

            debug('UTILITY', `🚛 Checking for cargo deliveries at ${stationKey} with ${loadedCargo.size} cargo items`);

            // Check each cargo item for delivery opportunities
            const cargoToRemove = [];

            for (const [cargoId, cargoItem] of loadedCargo.entries()) {
                if (cargoItem && cargoItem.commodityId) {
                    debug('UTILITY', `🚛 Attempting delivery of ${cargoItem.quantity} units of ${cargoItem.commodityId} to ${stationKey}`);
                    debug('TARGETING', `🚛 DEBUG: Original station name: "${stationKey}" (converted from docking target)`);

                    // Trigger cargo delivery event
                    if (this.sfm.missionEventService) {
                        const result = await this.sfm.missionEventService.cargoDelivered(
                            cargoItem.commodityId,
                            cargoItem.quantity,
                            stationKey,
                            {
                                playerShip: ship.shipType,
                                integrity: cargoItem.integrity || 1.0,
                                source: 'docking'  // Indicate this is auto-delivery on docking
                            }
                        );

                        // If any missions were updated (cargo was delivered), calculate required quantity to remove
                        if (result && result.success && result.updated_missions.length > 0) {
                            debug('UTILITY', `🚛 Auto-delivery successful for ${cargoItem.commodityId}, calculating quantity to remove`);

                            // Find the mission that was updated for this cargo type
                            let quantityToRemove = 0;
                            for (const mission of result.updated_missions) {
                                if (mission.mission_type === 'delivery' &&
                                    mission.custom_fields.cargo_type === cargoItem.commodityId &&
                                    mission.custom_fields.destination === stationKey) {

                                    const requiredQuantity = mission.custom_fields.cargo_amount || 50;
                                    const alreadyDelivered = mission.custom_fields.cargo_delivered || 0;

                                    // Calculate how much we need to remove (up to what we have in cargo)
                                    quantityToRemove = Math.min(requiredQuantity, cargoItem.quantity);

                                    debug('AI', `🚛 Mission ${mission.id} requires ${requiredQuantity} units, delivered so far: ${alreadyDelivered}, removing: ${quantityToRemove} from available ${cargoItem.quantity}`);
                                    break;
                                }
                            }

                            // Only remove if we found a valid quantity
                            if (quantityToRemove > 0) {
                                cargoToRemove.push({
                                    cargoId: cargoId,
                                    commodityId: cargoItem.commodityId,
                                    quantity: quantityToRemove
                                });
                            }
                        }
                    }
                }
            }

            // Remove delivered cargo from ship
            for (const cargo of cargoToRemove) {
                const removeResult = ship.cargoHoldManager.unloadCargo(cargo.cargoId, cargo.quantity);
                if (removeResult.success) {
                    debug('UTILITY', `🚛 Removed ${cargo.quantity} units of ${cargo.commodityId} from cargo hold (auto-delivery)`);
                } else {
                    debug('P1', `🚛 Failed to remove cargo ${cargo.commodityId}: ${removeResult.error}`);
                }
            }

            // Refresh cargo display if cargo was removed
            if (cargoToRemove.length > 0 && this.sfm.commodityExchange) {
                this.sfm.commodityExchange.refreshCargoDisplay();
            }

        } catch (error) {
            debug('P1', `🚛 Error checking cargo deliveries: ${error}`);
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.sfm = null;
    }
}
