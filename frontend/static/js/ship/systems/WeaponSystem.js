/**
 * Base Weapon System - Provides weapon functionality for ships
 * Based on docs/spaceships_spec.md and docs/tech_design.md
 * Energy consumption per shot, damage affects accuracy and damage output
 */

import System, { SYSTEM_STATES } from '../System.js';

export class WeaponSystem extends System {
    constructor(weaponType, level = 1, config = {}) {
        // Base configuration for weapon systems
        const baseConfig = {
            slotCost: 1,
            energyConsumptionRate: 0, // Weapons consume energy per shot, not per second
            systemType: 'weapon',
            maxHealth: 75,
            ...config
        };
        
        super(weaponType, level, baseConfig);
        
        // Weapon-specific properties
        this.weaponType = weaponType;
        this.baseDamage = config.baseDamage || 12; // Base damage per shot
        this.energyPerShot = config.energyPerShot || 15; // Energy consumed per shot
        this.fireRate = config.fireRate || 1.0; // Shots per second
        this.accuracy = config.accuracy || 0.9; // Base accuracy (0-1)
        this.range = config.range || 100; // Weapon range in km
        
        // Current performance values (calculated based on level and damage)
        this.currentDamage = 0;
        this.currentAccuracy = 0;
        this.currentFireRate = 0;
        this.currentRange = 0;
        
        // Firing state
        this.lastFireTime = 0;
        this.canFire = true;
        
        // Update level-specific values
        this.updateWeaponStats();
        
        console.log(`${this.displayName} created (Level ${level}) - Damage: ${this.getCurrentDamage()}, Range: ${this.getCurrentRange()}km`);
    }
    
    /**
     * Initialize level-specific stats for weapons
     * @returns {Object} Level stats configuration
     */
    initializeLevelStats() {
        const baseDamage = this.baseDamage;
        const baseAccuracy = this.accuracy;
        const baseFireRate = this.fireRate;
        const baseRange = this.range;
        const baseEnergyPerShot = this.energyPerShot;
        
        return {
            1: { 
                effectiveness: 1.0,
                damage: baseDamage,
                accuracy: baseAccuracy,
                fireRate: baseFireRate,
                range: baseRange,
                energyPerShot: baseEnergyPerShot
            },
            2: { 
                effectiveness: 1.2,
                damage: baseDamage * 1.3, // 30% more damage
                accuracy: baseAccuracy * 1.05, // 5% better accuracy
                fireRate: baseFireRate * 1.1, // 10% faster firing
                range: baseRange * 1.2, // 20% more range
                energyPerShot: baseEnergyPerShot * 1.1 // 10% more energy per shot
            },
            3: { 
                effectiveness: 1.4,
                damage: baseDamage * 1.6, // 60% more damage
                accuracy: baseAccuracy * 1.1, // 10% better accuracy
                fireRate: baseFireRate * 1.2, // 20% faster firing
                range: baseRange * 1.4, // 40% more range
                energyPerShot: baseEnergyPerShot * 1.2 // 20% more energy per shot
            },
            4: { 
                effectiveness: 1.6,
                damage: baseDamage * 2.0, // 100% more damage
                accuracy: baseAccuracy * 1.15, // 15% better accuracy
                fireRate: baseFireRate * 1.3, // 30% faster firing
                range: baseRange * 1.6, // 60% more range
                energyPerShot: baseEnergyPerShot * 1.3 // 30% more energy per shot
            },
            5: { 
                effectiveness: 1.8,
                damage: baseDamage * 2.5, // 150% more damage
                accuracy: baseAccuracy * 1.2, // 20% better accuracy
                fireRate: baseFireRate * 1.4, // 40% faster firing
                range: baseRange * 1.8, // 80% more range
                energyPerShot: baseEnergyPerShot * 1.4 // 40% more energy per shot
            }
        };
    }
    
    /**
     * Update weapon performance based on level and damage
     */
    updateWeaponStats() {
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        const effectiveness = this.getEffectiveness();
        
        // Calculate current performance
        this.currentDamage = levelStats.damage * effectiveness;
        this.currentAccuracy = Math.min(1.0, levelStats.accuracy * effectiveness);
        this.currentFireRate = levelStats.fireRate * effectiveness;
        this.currentRange = levelStats.range * effectiveness;
        this.currentEnergyPerShot = levelStats.energyPerShot;
    }
    
    /**
     * Get current damage output
     * @returns {number} Current damage per shot
     */
    getCurrentDamage() {
        if (!this.isOperational()) {
            return 0;
        }
        
        this.updateWeaponStats();
        return this.currentDamage || this.baseDamage;
    }
    
    /**
     * Get current accuracy
     * @returns {number} Current accuracy (0-1)
     */
    getCurrentAccuracy() {
        if (!this.isOperational()) {
            return 0;
        }
        
        this.updateWeaponStats();
        return this.currentAccuracy || this.accuracy;
    }
    
    /**
     * Get current fire rate
     * @returns {number} Current shots per second
     */
    getCurrentFireRate() {
        if (!this.isOperational()) {
            return 0;
        }
        
        this.updateWeaponStats();
        return this.currentFireRate || this.fireRate;
    }
    
    /**
     * Get current range
     * @returns {number} Current range in km
     */
    getCurrentRange() {
        if (!this.isOperational()) {
            return 0;
        }
        
        this.updateWeaponStats();
        return this.currentRange || this.range;
    }
    
    /**
     * Get energy cost per shot
     * @returns {number} Energy required per shot
     */
    getEnergyPerShot() {
        if (!this.isOperational()) {
            return 0;
        }
        
        this.updateWeaponStats();
        return this.currentEnergyPerShot || this.energyPerShot;
    }
    
    /**
     * Check if weapon can fire
     * @returns {boolean} True if weapon can fire
     */
    canFireWeapon() {
        if (!this.isOperational()) {
            return false;
        }
        
        // Check fire rate cooldown
        const now = Date.now();
        const timeSinceLastShot = now - this.lastFireTime;
        const cooldownTime = 1000 / this.getCurrentFireRate(); // Convert fire rate to cooldown
        
        return timeSinceLastShot >= cooldownTime;
    }
    
    /**
     * Fire the weapon
     * @param {Ship} ship - Ship instance for energy consumption
     * @param {Object} target - Target object (optional)
     * @returns {Object} Fire result with damage and hit information
     */
    fire(ship, target = null) {
        if (!this.canFireWeapon()) {
            return { success: false, reason: 'Weapon on cooldown' };
        }
        
        const energyCost = this.getEnergyPerShot();
        if (!ship.consumeEnergy(energyCost)) {
            return { success: false, reason: 'Insufficient energy' };
        }
        
        // Record fire time
        this.lastFireTime = Date.now();
        
        // Calculate hit chance and damage
        const accuracy = this.getCurrentAccuracy();
        const damage = this.getCurrentDamage();
        const hit = Math.random() < accuracy;
        
        const result = {
            success: true,
            hit: hit,
            damage: hit ? damage : 0,
            energyConsumed: energyCost,
            weaponType: this.weaponType,
            range: this.getCurrentRange()
        };
        
        // Removed weapon firing spam
        
        return result;
    }
    
    /**
     * Get weapon status information
     * @returns {Object} Status object
     */
    getStatus() {
        const baseStatus = super.getStatus();
        return {
            ...baseStatus,
            weaponType: this.weaponType,
            damage: this.getCurrentDamage(),
            accuracy: this.getCurrentAccuracy(),
            fireRate: this.getCurrentFireRate(),
            range: this.getCurrentRange(),
            energyPerShot: this.getEnergyPerShot(),
            canFire: this.canFireWeapon()
        };
    }
}

// Specific weapon implementations

export class LaserCannon extends WeaponSystem {
    constructor(level = 1) {
        super('laser_cannon', level, {
            baseDamage: 12,
            energyPerShot: 15,
            fireRate: 2.0, // Fast firing
            accuracy: 0.95, // High accuracy
            range: 35000, // 35km range - enough to reach target dummies at 30km
            maxHealth: 75
        });
    }
}

export class PlasmaCannon extends WeaponSystem {
    constructor(level = 1) {
        super('plasma_cannon', level, {
            baseDamage: 18,
            energyPerShot: 25,
            fireRate: 1.2, // Slower but more powerful
            accuracy: 0.85, // Lower accuracy
            range: 100,
            maxHealth: 80
        });
    }
}

export class PulseCannon extends WeaponSystem {
    constructor(level = 1) {
        super('pulse_cannon', level, {
            baseDamage: 8,
            energyPerShot: 10,
            fireRate: 3.0, // Very fast firing
            accuracy: 0.90, // Good accuracy
            range: 80,
            maxHealth: 70
        });
    }
}

export class PhaserArray extends WeaponSystem {
    constructor(level = 1) {
        super('phaser_array', level, {
            baseDamage: 15,
            energyPerShot: 20,
            fireRate: 1.5, // Moderate firing rate
            accuracy: 0.92, // Very good accuracy
            range: 150,
            maxHealth: 85
        });
    }
}

export class DisruptorCannon extends WeaponSystem {
    constructor(level = 1) {
        super('disruptor_cannon', level, {
            baseDamage: 22,
            energyPerShot: 30,
            fireRate: 0.8, // Slow but devastating
            accuracy: 0.80, // Lower accuracy
            range: 90,
            maxHealth: 75
        });
    }
}

export class ParticleBeam extends WeaponSystem {
    constructor(level = 1) {
        super('particle_beam', level, {
            baseDamage: 25,
            energyPerShot: 35,
            fireRate: 0.6, // Very slow but extremely powerful
            accuracy: 0.88, // Good accuracy
            range: 200,
            maxHealth: 90
        });
    }
} 