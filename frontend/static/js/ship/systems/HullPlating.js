import System from '../System.js';
import { debug } from '../../debug.js';

/**
 * Hull Plating System - Provides hull hit points
 * Based on docs/spaceships_spec.md
 */
export default class HullPlating extends System {
    constructor(level = 1) {
        super('hull_plating', level);
        
        this.systemType = 'hull_plating';
        this.description = 'Armored hull plating that provides structural integrity';
        this.slotCost = 1;
        this.maxLevel = 10; // Allow up to level 10 for heavy freighters
        
        // Hull plating provides hull hit points based on level
        this.hullCapacityPerLevel = 200; // Base hull per level
        
        // Energy consumption (passive system - no energy cost)
        this.baseEnergyConsumption = 0;
        
        this.updateStats();
    }
    
    /**
     * Update system stats based on current level
     */
    updateStats() {
        // Calculate hull capacity based on level
        this.hullCapacity = this.hullCapacityPerLevel * this.level;
        
debug('UTILITY', `Hull Plating Level ${this.level}: +${this.hullCapacity} hull`);
    }
    
    /**
     * Get hull capacity bonus
     * @returns {number} Hull capacity provided by this system
     */
    getHullCapacity() {
        if (!this.isOperational()) return 0;
        return this.hullCapacity * this.getEffectiveness();
    }
    
    /**
     * Get system information for UI display
     */
    getSystemInfo() {
        const baseInfo = super.getSystemInfo();
        return {
            ...baseInfo,
            stats: {
                hullCapacity: this.getHullCapacity(),
                maxHullCapacity: this.hullCapacity
            },
            description: `Provides ${this.getHullCapacity().toFixed(0)} hull hit points`
        };
    }
    
    /**
     * Update system (called each frame)
     * @param {number} deltaTime - Time elapsed since last update
     * @param {Ship} ship - Reference to the ship
     */
    update(deltaTime, ship) {
        super.update(deltaTime, ship);
        // Hull plating is passive - no active updates needed
    }
} 