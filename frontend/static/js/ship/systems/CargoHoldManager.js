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
        
        if (!this.ship.cardInventory) {
            console.log('🚛 No cardInventory available on ship');
            return;
        }
        
        // Clear existing holds
        this.cargoHolds.clear();
        this.totalCapacity = 0;
        
        // Find all cargo hold cards installed on ship
        const installedCards = this.ship.cardInventory.getInstalledCards();
        console.log(`🚛 Checking ${installedCards.size} installed cards for cargo holds`);
        let holdSlot = 0;
        
        for (const [slotId, card] of installedCards) {
            console.log(`🚛 Found card: ${card.cardType} (Lv.${card.level}) in slot ${slotId}`);
            if (this.isCargoHoldCard(card.cardType)) {
                console.log(`🚛 ✅ Identified as cargo hold card: ${card.cardType}`);
                const cargoHold = this.createCargoHold(card, holdSlot);
                this.cargoHolds.set(holdSlot, cargoHold);
                this.totalCapacity += cargoHold.capacity;
                
                console.log(`🚛 Cargo Hold ${holdSlot}: ${cargoHold.name} (${cargoHold.capacity} units)`);
                holdSlot++;
            } else {
                console.log(`🚛 ❌ Not a cargo hold card: ${card.cardType}`);
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
            return {
                success: false,
                error: 'Insufficient cargo capacity',
                required: totalVolume,
                available: this.getAvailableCapacity()
            };
        }
        
        // Find optimal cargo hold for this commodity
        const targetHold = this.selectOptimalHold(commodityData);
        if (!targetHold) {
            return {
                success: false,
                error: 'No suitable cargo hold available'
            };
        }
        
        // Add to cargo manifest
        const cargoId = `${commodityId}_${Date.now()}`;
        const cargoItem = {
            id: cargoId,
            commodityId: commodityId,
            quantity: quantity,
            volume: commodityData.volume,
            holdSlot: targetHold.slotId,
            loadedAt: Date.now(),
            integrity: 1.0,
            commodityData: commodityData
        };
        
        this.loadedCargo.set(cargoId, cargoItem);
        
        // Add to hold's cargo list
        const existingQuantity = targetHold.cargo.get(commodityId) || 0;
        targetHold.cargo.set(commodityId, existingQuantity + quantity);
        
        this.updateUsedCapacity();
        
        console.log(`🚛 Loaded ${quantity} units of ${commodityId} into hold ${targetHold.slotId}`);
        
        return {
            success: true,
            cargoId: cargoId,
            holdSlot: targetHold.slotId,
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
            hold.cargo.set(cargoItem.commodityId, currentQuantity - unloadQuantity);
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
        // Priority 1: Special requirements
        for (const requirement of commodityData.special_requirements || []) {
            for (const [slotId, hold] of this.cargoHolds) {
                if (hold.features.includes(requirement)) {
                    const usedSpace = this.getHoldUsedCapacity(hold);
                    if (usedSpace < hold.capacity) {
                        return hold;
                    }
                }
            }
        }
        
        // Priority 2: Largest available space
        let bestHold = null;
        let mostSpace = 0;
        
        for (const [slotId, hold] of this.cargoHolds) {
            const availableSpace = hold.capacity - this.getHoldUsedCapacity(hold);
            if (availableSpace > mostSpace) {
                mostSpace = availableSpace;
                bestHold = hold;
            }
        }
        
        return bestHold;
    }
    
    /**
     * Get used capacity for specific hold
     */
    getHoldUsedCapacity(hold) {
        let used = 0;
        for (const [commodityId, quantity] of hold.cargo) {
            const commodityData = this.getCommodityData(commodityId);
            used += quantity * commodityData.volume;
        }
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
                volume: 2,
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
                volume: 3,
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
        console.log('🚛 CardInventory reference:', this.ship?.cardInventory ? 'Available' : 'Missing');
        
        if (this.ship?.cardInventory) {
            const installedCards = this.ship.cardInventory.getInstalledCards();
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
