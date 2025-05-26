import System from '../System.js';

/**
 * Cargo Hold System - Provides cargo storage capacity
 * Based on docs/spaceships_spec.md
 */
export default class CargoHold extends System {
    constructor(level = 1) {
        super('cargo_hold', level);
        
        this.systemType = 'cargo_hold';
        this.description = 'Cargo hold that provides storage capacity';
        this.slotCost = 1;
        this.maxLevel = 10; // Allow up to level 10 for heavy freighters
        
        // Cargo hold provides storage capacity based on level
        this.cargoCapacityPerLevel = 10; // Base cargo units per level
        
        // Energy consumption (passive system - no energy cost)
        this.baseEnergyConsumption = 0;
        
        this.updateStats();
    }
    
    /**
     * Update system stats based on current level
     */
    updateStats() {
        // Calculate cargo capacity based on level
        this.cargoCapacity = this.cargoCapacityPerLevel * this.level;
        
        console.log(`Cargo Hold Level ${this.level}: +${this.cargoCapacity} cargo units`);
    }
    
    /**
     * Get cargo capacity bonus
     * @returns {number} Cargo capacity provided by this system
     */
    getCargoCapacity() {
        if (!this.isOperational()) return 0;
        return this.cargoCapacity * this.getEffectiveness();
    }
    
    /**
     * Get system information for UI display
     */
    getSystemInfo() {
        const baseInfo = super.getSystemInfo();
        return {
            ...baseInfo,
            stats: {
                cargoCapacity: this.getCargoCapacity(),
                maxCargoCapacity: this.cargoCapacity
            },
            description: `Provides ${this.getCargoCapacity().toFixed(0)} cargo units`
        };
    }
    
    /**
     * Update system (called each frame)
     * @param {number} deltaTime - Time elapsed since last update
     * @param {Ship} ship - Reference to the ship
     */
    update(deltaTime, ship) {
        super.update(deltaTime, ship);
        // Cargo hold is passive - no active updates needed
    }
} 