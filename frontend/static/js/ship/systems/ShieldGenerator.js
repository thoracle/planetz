import System from '../System.js';
import { debug } from '../../debug.js';

/**
 * Shield Generator System - Provides armor/defensive capability
 * Based on docs/spaceships_spec.md
 */
export default class ShieldGenerator extends System {
    constructor(level = 1) {
        super('shield_generator', level);
        
        this.systemType = 'shield_generator';
        this.description = 'Shield generator that provides defensive armor rating';
        this.slotCost = 1;
        this.maxLevel = 10; // Allow up to level 10 for heavy freighters
        
        // Shield generator provides armor rating based on level
        this.armorPerLevel = 15; // Base armor per level
        
        // Energy consumption when active
        this.baseEnergyConsumption = 5; // Energy per second per level when active
        
        this.updateStats();
    }
    
    /**
     * Update system stats based on current level
     */
    updateStats() {
        // Calculate armor based on level
        this.armorRating = this.armorPerLevel * this.level;
        this.energyConsumption = this.baseEnergyConsumption * this.level;
        
debug('COMBAT', `Shield Generator Level ${this.level}: +${this.armorRating} armor, ${this.energyConsumption}/sec energy`);
    }
    
    /**
     * Get armor bonus
     * @returns {number} Armor rating provided by this system
     */
    getArmorBonus() {
        if (!this.isOperational() || !this.isActive) return 0;
        return this.armorRating * this.getEffectiveness();
    }
    
    /**
     * Get energy consumption rate when active
     * @returns {number} Energy consumption per second
     */
    getEnergyConsumptionRate() {
        if (!this.isActive || !this.isOperational()) return 0;
        return this.energyConsumption;
    }
    
    /**
     * Get system information for UI display
     */
    getSystemInfo() {
        const baseInfo = super.getSystemInfo();
        return {
            ...baseInfo,
            stats: {
                armorRating: this.getArmorBonus(),
                maxArmorRating: this.armorRating,
                energyConsumption: this.getEnergyConsumptionRate()
            },
            description: `Provides ${this.getArmorBonus().toFixed(0)} armor when active (${this.energyConsumption}/sec energy)`
        };
    }
    
    /**
     * Update system (called each frame)
     * @param {number} deltaTime - Time elapsed since last update
     * @param {Ship} ship - Reference to the ship
     */
    update(deltaTime, ship) {
        super.update(deltaTime, ship);
        
        // Consume energy when active
        if (this.isActive && this.isOperational()) {
            const energyNeeded = this.getEnergyConsumptionRate() * (deltaTime / 1000);
            if (!ship.consumeEnergy(energyNeeded)) {
                // Not enough energy - deactivate
                this.isActive = false;
debug('COMBAT', 'Shield Generator deactivated - insufficient energy');
            }
        }
    }
} 