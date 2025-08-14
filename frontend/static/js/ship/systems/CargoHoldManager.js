/**
 * CargoHoldManager - Manages ship cargo holds and commodity storage
 * Phase 1 Implementation: Basic cargo operations
 */

import { CARD_TYPES } from '../NFTCard.js';

export class CargoHoldManager {
    constructor(ship) {
        this.ship = ship;
        this.cargoHolds = new Map(); // Map of holdSlot -> CargoHold
        this.loadedCargo = new Map(); // Map of cargoId -> CargoItem
        this.totalCapacity = 0;
        this.usedCapacity = 0;
        
        console.log('🚛 CargoHoldManager: Initialized');
    }
    
    /**
     * Initialize cargo holds from installed cards
     */
    initializeFromCards() {
        console.log('🚛 CargoHoldManager: initializeFromCards() called');
        
        if (!this.ship.cardSystemIntegration) {
            console.log('🚛 No cardSystemIntegration available on ship');
            return;
        }
        
        // Save existing cargo before clearing holds
        const existingCargo = new Map();
        for (const [holdSlot, hold] of this.cargoHolds) {
            if (hold.cargo && hold.cargo.size > 0) {
                existingCargo.set(hold.slotId, new Map(hold.cargo));
                console.log(`🚛 PRESERVING: Saved ${hold.cargo.size} cargo types from hold slot ${hold.slotId}`);
            }
        }
        
        // Clear existing holds
        this.cargoHolds.clear();
        this.totalCapacity = 0;
        
        // Find all cargo hold cards installed on ship
        const installedCards = this.ship.cardSystemIntegration.installedCards;
        console.log(`🚛 Checking ${installedCards.size} installed cards for cargo holds`);
        let holdSlot = 0;
        
        for (const [slotId, card] of installedCards) {
            console.log(`🚛 Found card: ${card.cardType} (Lv.${card.level}) in slot ${slotId}`);
            if (this.isCargoHoldCard(card.cardType)) {
                console.log(`🚛 ✅ Identified as cargo hold card: ${card.cardType}`);
                const cargoHold = this.createCargoHold(card, slotId); // Pass the actual slot ID, not holdSlot counter
                this.cargoHolds.set(holdSlot, cargoHold);
                this.totalCapacity += cargoHold.capacity;
                
                console.log(`🚛 Cargo Hold ${holdSlot}: ${cargoHold.name} (Level ${cargoHold.level}) in slot ${slotId} (${cargoHold.capacity} units)`);
                holdSlot++;
            } else {
                console.log(`🚛 ❌ Not a cargo hold card: ${card.cardType}`);
            }
        }
        
        // Restore existing cargo to recreated holds
        for (const [slotId, savedCargo] of existingCargo) {
            // Find the hold with this slotId
            for (const [holdSlot, hold] of this.cargoHolds) {
                if (hold.slotId === slotId) {
                    hold.cargo = savedCargo;
                    console.log(`🚛 RESTORED: ${savedCargo.size} cargo types to hold slot ${slotId}`);
                    break;
                }
            }
        }
        
        console.log(`🚛 Total cargo capacity: ${this.totalCapacity} units`);
        this.updateUsedCapacity();
    }
    
    /**
     * Check if card type is a cargo hold
     */
    isCargoHoldCard(cardType) {
        return [
            CARD_TYPES.CARGO_HOLD,
            CARD_TYPES.REINFORCED_CARGO_HOLD,
            CARD_TYPES.SHIELDED_CARGO_HOLD
        ].includes(cardType);
    }
    
    /**
     * Create cargo hold from card
     */
    createCargoHold(card, slotId) {
        const holdData = this.getCargoHoldData(card.cardType, card.level);
        
        return {
            slotId: slotId,
            cardType: card.cardType,
            level: card.level,
            name: holdData.name,
            capacity: holdData.capacity,
            features: holdData.features,
            cargo: new Map(), // Map of commodityId -> quantity
            integrity: 1.0
        };
    }
    
    /**
     * Get cargo hold specifications by type and level
     */
    getCargoHoldData(cardType, level) {
        const baseData = {
            [CARD_TYPES.CARGO_HOLD]: {
                name: 'Basic Cargo Hold',
                baseCapacity: 100,
                features: ['basic_storage']
            },
            [CARD_TYPES.REINFORCED_CARGO_HOLD]: {
                name: 'Reinforced Cargo Hold',
                baseCapacity: 120,
                features: ['basic_storage', 'damage_resistance', 'environmental_control']
            },
            [CARD_TYPES.SHIELDED_CARGO_HOLD]: {
                name: 'Shielded Cargo Hold',
                baseCapacity: 110,
                features: ['basic_storage', 'scan_resistance', 'magnetic_containment']
            }
        };
        
        const data = baseData[cardType];
        if (!data) return { name: 'Unknown Hold', capacity: 50, features: [] };
        
        // Scale capacity by level
        const capacity = Math.floor(data.baseCapacity * (1 + (level - 1) * 0.3));
        
        return {
            name: `${data.name} (Level ${level})`,
            capacity: capacity,
            features: data.features
        };
    }
    
    /**
     * Get available cargo capacity
     */
    getAvailableCapacity() {
        return this.totalCapacity - this.usedCapacity;
    }
    
    /**
     * Update used capacity calculation
     */
    updateUsedCapacity() {
        this.usedCapacity = 0;
        
        for (const [cargoId, cargoItem] of this.loadedCargo) {
            this.usedCapacity += cargoItem.quantity * cargoItem.volume;
        }
    }
    
    /**
     * Load cargo into ship
     */
    loadCargo(commodityId, quantity, commodityData = null) {
        // Get commodity data if not provided
        if (!commodityData) {
            commodityData = this.getCommodityData(commodityId);
        }
        
        const totalVolume = quantity * commodityData.volume;
        
        // Check if we have enough capacity
        if (totalVolume > this.getAvailableCapacity()) {
            console.log(`🚛 ❌ PURCHASE FAILED: Insufficient capacity`);
            console.log(`🚛    - Commodity: ${commodityId}`);
            console.log(`🚛    - Quantity: ${quantity} units`);
            console.log(`🚛    - Volume per unit: ${commodityData.volume}`);
            console.log(`🚛    - Total volume needed: ${totalVolume} space`);
            console.log(`🚛    - Available capacity: ${this.getAvailableCapacity()} space`);
            console.log(`🚛    - Total capacity: ${this.totalCapacity} space`);
            console.log(`🚛    - Used capacity: ${this.usedCapacity} space`);
            return {
                success: false,
                error: 'Insufficient cargo capacity',
                required: totalVolume,
                available: this.getAvailableCapacity()
            };
        }
        
        // Distribute cargo across multiple holds if needed
        let remainingQuantity = quantity;
        const loadedCargo = [];
        
        while (remainingQuantity > 0) {
            // Find optimal cargo hold for this commodity
            const targetHold = this.selectOptimalHold(commodityData);
            if (!targetHold) {
                return {
                    success: false,
                    error: 'No suitable cargo hold available'
                };
            }
            
            // Calculate how much can fit in this hold
            const holdUsedSpace = this.getHoldUsedCapacity(targetHold);
            const holdAvailableSpace = targetHold.capacity - holdUsedSpace;
            const maxUnitsForThisHold = Math.floor(holdAvailableSpace / commodityData.volume);
            const unitsToLoad = Math.min(remainingQuantity, maxUnitsForThisHold);
            
            if (unitsToLoad <= 0) {
                return {
                    success: false,
                    error: 'No space available in cargo holds'
                };
            }
            
            // Add to cargo manifest
            const cargoId = `${commodityId}_${Date.now()}_${targetHold.slotId}`;
            const cargoItem = {
                id: cargoId,
                commodityId: commodityId,
                quantity: unitsToLoad,
                volume: commodityData.volume,
                holdSlot: targetHold.slotId,
                loadedAt: Date.now(),
                integrity: 1.0,
                commodityData: commodityData
            };
            
            this.loadedCargo.set(cargoId, cargoItem);
            
            // Add to hold's cargo list
            const existingQuantity = targetHold.cargo.get(commodityId) || 0;
            targetHold.cargo.set(commodityId, existingQuantity + unitsToLoad);
            
            loadedCargo.push({
                holdSlot: targetHold.slotId,
                quantity: unitsToLoad
            });
            
            console.log(`🚛 Loaded ${unitsToLoad} units of ${commodityId} into hold ${targetHold.slotId}`);
            
            remainingQuantity -= unitsToLoad;
        }
        
        this.updateUsedCapacity();
        
        return {
            success: true,
            loadedCargo: loadedCargo,
            totalLoaded: quantity,
            usedCapacity: this.usedCapacity,
            totalCapacity: this.totalCapacity
        };
    }
    
    /**
     * Unload cargo from ship
     */
    unloadCargo(cargoId, quantity = null) {
        const cargoItem = this.loadedCargo.get(cargoId);
        if (!cargoItem) {
            return {
                success: false,
                error: 'Cargo item not found'
            };
        }
        
        const unloadQuantity = quantity || cargoItem.quantity;
        
        if (unloadQuantity > cargoItem.quantity) {
            return {
                success: false,
                error: 'Cannot unload more than available',
                available: cargoItem.quantity,
                requested: unloadQuantity
            };
        }
        
        // Update cargo item
        cargoItem.quantity -= unloadQuantity;
        
        // Update hold's cargo list
        const hold = this.cargoHolds.get(cargoItem.holdSlot);
        if (hold) {
            const currentQuantity = hold.cargo.get(cargoItem.commodityId);
            const newQuantity = currentQuantity - unloadQuantity;
            
            if (newQuantity <= 0) {
                // Remove entry entirely when quantity reaches 0
                hold.cargo.delete(cargoItem.commodityId);
                console.log(`🚛 CLEANUP: Removed ${cargoItem.commodityId} from hold slot ${cargoItem.holdSlot} (quantity reached 0)`);
            } else {
                // Update quantity if still has remaining cargo
                hold.cargo.set(cargoItem.commodityId, newQuantity);
            }
        }
        
        // Remove from manifest if fully unloaded
        if (cargoItem.quantity <= 0) {
            this.loadedCargo.delete(cargoId);
        }
        
        this.updateUsedCapacity();
        
        console.log(`🚛 Unloaded ${unloadQuantity} units of ${cargoItem.commodityId}`);
        
        return {
            success: true,
            commodityId: cargoItem.commodityId,
            quantity: unloadQuantity,
            integrity: cargoItem.integrity,
            remainingQuantity: cargoItem.quantity
        };
    }
    
    /**
     * Select optimal cargo hold for commodity
     */
    selectOptimalHold(commodityData) {
        console.log(`🚛 SELECTING HOLD: Looking for optimal hold for ${commodityData.name || 'unknown commodity'}`);
        console.log(`🚛 SELECTING HOLD: Available holds: ${this.cargoHolds.size}`);
        
        // Priority 1: Special requirements
        for (const requirement of commodityData.special_requirements || []) {
            for (const [slotId, hold] of this.cargoHolds) {
                if (hold.features.includes(requirement)) {
                    const usedSpace = this.getHoldUsedCapacity(hold);
                    if (usedSpace < hold.capacity) {
                        console.log(`🚛 SELECTING HOLD: Found special requirement hold: slot ${hold.slotId} (${usedSpace}/${hold.capacity} used)`);
                        return hold;
                    }
                }
            }
        }
        
        // Priority 2: Largest available space
        let bestHold = null;
        let mostSpace = 0;
        
        console.log(`🚛 SELECTING HOLD: Checking available space in each hold:`);
        for (const [slotId, hold] of this.cargoHolds) {
            const usedSpace = this.getHoldUsedCapacity(hold);
            const availableSpace = hold.capacity - usedSpace;
            console.log(`🚛 SELECTING HOLD: Hold slot ${hold.slotId}: ${usedSpace}/${hold.capacity} used, ${availableSpace} available`);
            
            if (availableSpace > mostSpace) {
                mostSpace = availableSpace;
                bestHold = hold;
                console.log(`🚛 SELECTING HOLD: New best hold: slot ${hold.slotId} with ${availableSpace} available space`);
            }
        }
        
        console.log(`🚛 SELECTING HOLD: Selected hold: slot ${bestHold?.slotId || 'none'} with ${mostSpace} available space`);
        return bestHold;
    }
    
    /**
     * Get used capacity for specific hold
     */
    getHoldUsedCapacity(hold) {
        let used = 0;
        console.log(`🚛 CAPACITY CHECK: Hold slot ${hold.slotId} cargo:`, Array.from(hold.cargo.entries()));
        for (const [commodityId, quantity] of hold.cargo) {
            const commodityData = this.getCommodityData(commodityId);
            const volume = quantity * commodityData.volume;
            console.log(`🚛 CAPACITY CHECK: ${commodityId}: ${quantity} units × ${commodityData.volume} = ${volume} space`);
            used += volume;
        }
        console.log(`🚛 CAPACITY CHECK: Hold slot ${hold.slotId} total used: ${used}/${hold.capacity}`);
        return used;
    }
    
    /**
     * Get commodity data (basic implementation)
     */
    getCommodityData(commodityId) {
        // Basic commodity definitions for Phase 1
        const commodities = {
            'medical_supplies': {
                name: 'Medical Supplies',
                volume: 1,
                base_price: 50,
                legal_status: 'legal',
                special_requirements: ['environmental_control']
            },
            'food_rations': {
                name: 'Food Rations',
                volume: 1,
                base_price: 10,
                legal_status: 'legal',
                special_requirements: []
            },
            'raw_materials': {
                name: 'Raw Materials',
                volume: 1,
                base_price: 15,
                legal_status: 'legal',
                special_requirements: []
            },
            'rare_elements': {
                name: 'Rare Elements',
                volume: 1,
                base_price: 200,
                legal_status: 'legal',
                special_requirements: ['magnetic_containment']
            },
            'illegal_weapons': {
                name: 'Illegal Weapons',
                volume: 1,
                base_price: 500,
                legal_status: 'illegal',
                special_requirements: ['scan_resistance']
            }
        };
        
        return commodities[commodityId] || {
            name: 'Unknown Commodity',
            volume: 1,
            base_price: 10,
            legal_status: 'legal',
            special_requirements: []
        };
    }
    
    /**
     * Get cargo manifest for UI display
     */
    getCargoManifest() {
        const manifest = {
            holds: [],
            totalCapacity: this.totalCapacity,
            usedCapacity: this.usedCapacity,
            availableCapacity: this.getAvailableCapacity(),
            cargo: []
        };
        
        // Add hold information
        for (const [slotId, hold] of this.cargoHolds) {
            manifest.holds.push({
                slotId: hold.slotId,
                name: hold.name,
                capacity: hold.capacity,
                usedCapacity: this.getHoldUsedCapacity(hold),
                features: hold.features,
                integrity: hold.integrity
            });
        }
        
        // Add cargo information
        for (const [cargoId, cargoItem] of this.loadedCargo) {
            manifest.cargo.push({
                id: cargoItem.id,
                commodityId: cargoItem.commodityId,
                name: cargoItem.commodityData.name,
                quantity: cargoItem.quantity,
                volume: cargoItem.volume,
                holdSlot: cargoItem.holdSlot,
                integrity: cargoItem.integrity,
                loadedAt: cargoItem.loadedAt
            });
        }
        
        return manifest;
    }
    
    /**
     * Check if ship has specific commodity
     */
    hasCommodity(commodityId, minQuantity = 1) {
        let totalQuantity = 0;
        
        for (const [cargoId, cargoItem] of this.loadedCargo) {
            if (cargoItem.commodityId === commodityId) {
                totalQuantity += cargoItem.quantity;
            }
        }
        
        return totalQuantity >= minQuantity;
    }
    
    /**
     * Check if any cargo hold contains cargo
     * @param {number} holdSlot - Optional: check specific hold slot, if not provided checks all holds
     * @returns {boolean} True if cargo is present
     */
    hasCargoInHold(holdSlot = null) {
        console.log(`🛡️ CARGO CHECK: hasCargoInHold(${holdSlot}) called`);
        console.log(`🛡️ CARGO CHECK: loadedCargo has ${this.loadedCargo.size} items`);
        
        if (holdSlot !== null) {
            // Check specific hold
            console.log(`🛡️ CARGO CHECK: Looking for cargo with holdSlot === ${holdSlot}`);
            for (const [cargoId, cargoItem] of this.loadedCargo) {
                console.log(`🛡️ CARGO CHECK: Cargo item ${cargoId}: holdSlot=${cargoItem.holdSlot}, quantity=${cargoItem.quantity}`);
                if (cargoItem.holdSlot === holdSlot && cargoItem.quantity > 0) {
                    console.log(`🛡️ CARGO CHECK: Found matching cargo! Returning true`);
                    return true;
                }
            }
            console.log(`🛡️ CARGO CHECK: No matching cargo found, returning false`);
            return false;
        } else {
            // Check all holds
            console.log(`🛡️ CARGO CHECK: Checking all holds, usedCapacity=${this.usedCapacity}`);
            return this.usedCapacity > 0;
        }
    }
    
    /**
     * Get cargo contents for a specific hold
     * @param {number} holdSlot - Hold slot to check
     * @returns {Array} Array of cargo items in the hold
     */
    getCargoInHold(holdSlot) {
        const cargoInHold = [];
        for (const [cargoId, cargoItem] of this.loadedCargo) {
            if (cargoItem.holdSlot === holdSlot) {
                cargoInHold.push({
                    id: cargoItem.id,
                    commodityId: cargoItem.commodityId,
                    name: cargoItem.commodityData.name,
                    quantity: cargoItem.quantity,
                    volume: cargoItem.volume
                });
            }
        }
        return cargoInHold;
    }
    
    /**
     * Dump (destroy) all cargo in a specific hold
     * @param {number} holdSlot - Hold slot to clear
     * @returns {Object} Result with success status and dumped cargo list
     */
        dumpCargoInHold(holdSlot) {
        console.log(`🗑️ DUMP: Attempting to dump cargo from hold slot ${holdSlot}`);
        console.log(`🗑️ DUMP: Current loadedCargo has ${this.loadedCargo.size} items`);
        
        const cargoToDump = this.getCargoInHold(holdSlot);
        const dumpedCargo = [];

        // Remove all cargo items from this hold
        for (const [cargoId, cargoItem] of this.loadedCargo) {
            console.log(`🗑️ DUMP: Checking cargo ${cargoId}: holdSlot=${cargoItem.holdSlot}, looking for ${holdSlot}`);
            if (cargoItem.holdSlot === holdSlot) {
                dumpedCargo.push({
                    commodityId: cargoItem.commodityId,
                    name: cargoItem.commodityData.name,
                    quantity: cargoItem.quantity
                });
                this.loadedCargo.delete(cargoId);
                console.log(`🗑️ DUMP: Removed cargo ${cargoId}`);
            }
        }
        
        // Recalculate used capacity
        this.recalculateUsedCapacity();
        
        console.log(`🗑️ Dumped ${dumpedCargo.length} cargo types from hold ${holdSlot}`);
        
        return {
            success: true,
            dumpedCargo: dumpedCargo,
            totalItemsDumped: dumpedCargo.length
        };
    }
    
    /**
     * Recalculate used capacity based on current cargo
     */
    recalculateUsedCapacity() {
        this.usedCapacity = 0;
        for (const [cargoId, cargoItem] of this.loadedCargo) {
            this.usedCapacity += cargoItem.volume;
        }
    }
    
    /**
     * Get total quantity of specific commodity
     */
    getCommodityQuantity(commodityId) {
        let totalQuantity = 0;
        
        for (const [cargoId, cargoItem] of this.loadedCargo) {
            if (cargoItem.commodityId === commodityId) {
                totalQuantity += cargoItem.quantity;
            }
        }
        
        return totalQuantity;
    }
    
    /**
     * Debug cargo hold status
     */
    debugCargoStatus() {
        console.log('🚛 === CARGO HOLD DEBUG ===');
        console.log('🚛 Ship reference:', this.ship ? 'Available' : 'Missing');
        console.log('🚛 CardSystemIntegration reference:', this.ship?.cardSystemIntegration ? 'Available' : 'Missing');
        
        if (this.ship?.cardSystemIntegration) {
            const installedCards = this.ship.cardSystemIntegration.installedCards;
            console.log('🚛 Installed cards:', installedCards.size);
            
            let cargoCardCount = 0;
            for (const [slotId, card] of installedCards) {
                if (this.isCargoHoldCard(card.cardType)) {
                    cargoCardCount++;
                    console.log(`🚛 Found cargo card: ${card.cardType} (Lv.${card.level}) in slot ${slotId}`);
                }
            }
            console.log(`🚛 Total cargo hold cards: ${cargoCardCount}`);
        }
        
        console.log(`🚛 Initialized cargo holds: ${this.cargoHolds.size}`);
        console.log(`🚛 Total capacity: ${this.totalCapacity} units`);
        console.log(`🚛 Used capacity: ${this.usedCapacity} units`);
        console.log(`🚛 Available capacity: ${this.getAvailableCapacity()} units`);
        
        // Show hold details
        for (const [slotId, hold] of this.cargoHolds) {
            console.log(`🚛 Hold ${slotId}: ${hold.name} - ${this.getHoldUsedCapacity(hold)}/${hold.capacity} units`);
        }
        
        const manifest = this.getCargoManifest();
        console.log('🚛 Cargo manifest:', manifest);
        console.log('🚛 === END DEBUG ===');
        
        return manifest;
    }
    
    /**
     * Test cargo operations (for debugging)
     */
    testCargoOperations() {
        console.log('🚛 Testing cargo operations...');
        
        // First debug status
        this.debugCargoStatus();
        
        // Test loading
        const loadResult = this.loadCargo('medical_supplies', 50);
        console.log('🚛 Load test:', loadResult);
        
        const loadResult2 = this.loadCargo('food_rations', 30);
        console.log('🚛 Load test 2:', loadResult2);
        
        // Test manifest
        const manifest = this.getCargoManifest();
        console.log('🚛 Cargo manifest:', manifest);
        
        // Test commodity check
        console.log('🚛 Has medical supplies:', this.hasCommodity('medical_supplies', 40));
        console.log('🚛 Medical supplies quantity:', this.getCommodityQuantity('medical_supplies'));
        
        return manifest;
    }
}
