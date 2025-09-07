import System from '../System.js';
import { debug } from '../../debug.js';

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
        
debug('UTILITY', `Cargo Hold Level ${this.level}: +${this.cargoCapacity} cargo units`);
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

/**
 * Reinforced Cargo Hold System - Damage-resistant cargo storage
 * Based on docs/spaceships_spec.md
 */
export class ReinforcedCargoHold extends CargoHold {
    constructor(level = 1) {
        super(level);
        
        this.systemType = 'reinforced_cargo_hold';
        this.description = 'Reinforced cargo hold with enhanced damage resistance';
        
        // Reinforced cargo holds have same capacity but higher durability
        this.cargoCapacityPerLevel = 10; // Same as regular cargo hold
        this.maxHealth = this.maxHealth * 1.5; // 50% more health
        this.currentHealth = this.maxHealth;
        
        this.updateStats();
    }
    
    /**
     * Take damage - reinforced cargo holds are more resistant
     */
    takeDamage(damage) {
        // Reinforced cargo holds take 25% less damage
        const reducedDamage = damage * 0.75;
        super.takeDamage(reducedDamage);
        
        if (reducedDamage > 0) {
debug('COMBAT', `${this.name} reinforced plating absorbed ${damage - reducedDamage} damage`);
        }
    }
    
    getSystemInfo() {
        const baseInfo = super.getSystemInfo();
        return {
            ...baseInfo,
            description: `Provides ${this.getCargoCapacity().toFixed(0)} cargo units (damage-resistant)`
        };
    }
}

/**
 * Shielded Cargo Hold System - Scan-resistant cargo storage
 * Based on docs/spaceships_spec.md
 */
export class ShieldedCargoHold extends CargoHold {
    constructor(level = 1) {
        super(level);
        
        this.systemType = 'shielded_cargo_hold';
        this.description = 'Shielded cargo hold with scan-resistant properties';
        
        // Shielded cargo holds have slightly less capacity but scan protection
        this.cargoCapacityPerLevel = 8; // 20% less capacity than regular
        this.scanResistance = 0.75; // 75% chance to resist scans
        
        this.updateStats();
    }
    
    /**
     * Check if cargo can resist scanning
     */
    resistsScan() {
        if (!this.isOperational()) return false;
        return Math.random() < this.scanResistance * this.getEffectiveness();
    }
    
    getSystemInfo() {
        const baseInfo = super.getSystemInfo();
        return {
            ...baseInfo,
            stats: {
                ...baseInfo.stats,
                scanResistance: (this.scanResistance * 100).toFixed(0) + '%'
            },
            description: `Provides ${this.getCargoCapacity().toFixed(0)} cargo units (scan-resistant)`
        };
    }
} 