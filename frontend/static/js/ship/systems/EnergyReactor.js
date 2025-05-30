import System from '../System.js';

/**
 * Energy Reactor System - Provides energy capacity and recharge rate
 * Based on docs/spaceships_spec.md
 */
export default class EnergyReactor extends System {
    constructor(level = 1) {
        super('energy_reactor', level);
        
        this.systemType = 'energy_reactor';
        this.description = 'Energy reactor that provides power capacity and recharge rate';
        this.slotCost = 1;
        this.maxLevel = 10; // Allow up to level 10 for heavy freighters
        
        // Energy reactor provides energy capacity and recharge rate based on level
        this.energyCapacityPerLevel = 1000; // Base energy capacity per level
        this.energyRechargePerLevel = 10;   // Base energy recharge per second per level
        
        // Energy consumption (passive system - no energy cost)
        this.baseEnergyConsumption = 0;
        
        this.updateStats();
    }
    
    /**
     * Update system stats based on current level
     */
    updateStats() {
        // Calculate energy stats based on level
        this.energyCapacity = this.energyCapacityPerLevel * this.level;
        this.energyRechargeRate = this.energyRechargePerLevel * this.level;
        
        console.log(`Energy Reactor Level ${this.level}: +${this.energyCapacity} energy, +${this.energyRechargeRate}/sec recharge`);
    }
    
    /**
     * Get energy capacity bonus
     * @returns {number} Energy capacity provided by this system
     */
    getEnergyCapacity() {
        if (!this.isOperational()) return 0;
        return this.energyCapacity * this.getEffectiveness();
    }
    
    /**
     * Get energy recharge rate bonus
     * @returns {number} Energy recharge rate provided by this system
     */
    getEnergyRechargeRate() {
        if (!this.isOperational()) return 0;
        return this.energyRechargeRate * this.getEffectiveness();
    }
    
    /**
     * Check if energy reactor can be activated
     * @param {Ship} ship - The ship instance
     * @returns {boolean} - True if energy reactor can be activated
     */
    canActivate(ship) {
        if (!this.isOperational()) {
            return false;
        }
        
        // Check if ship has required cards
        if (ship && ship.hasSystemCardsSync) {
            const cardCheck = ship.hasSystemCardsSync('energy_reactor');
            if (cardCheck && typeof cardCheck === 'object' && !cardCheck.hasCards) {
                return false;
            } else if (typeof cardCheck === 'boolean' && !cardCheck) {
                return false;
            }
        }
        
        // Energy reactor has no additional requirements
        return true;
    }
    
    /**
     * Get system information for UI display
     */
    getSystemInfo() {
        const baseInfo = super.getSystemInfo();
        return {
            ...baseInfo,
            stats: {
                energyCapacity: this.getEnergyCapacity(),
                maxEnergyCapacity: this.energyCapacity,
                energyRechargeRate: this.getEnergyRechargeRate(),
                maxEnergyRechargeRate: this.energyRechargeRate
            },
            description: `Provides ${this.getEnergyCapacity().toFixed(0)} energy capacity and ${this.getEnergyRechargeRate().toFixed(1)}/sec recharge`
        };
    }
    
    /**
     * Update system (called each frame)
     * @param {number} deltaTime - Time elapsed since last update
     * @param {Ship} ship - Reference to the ship
     */
    update(deltaTime, ship) {
        super.update(deltaTime, ship);
        // Energy reactor is passive - no active updates needed
    }
} 