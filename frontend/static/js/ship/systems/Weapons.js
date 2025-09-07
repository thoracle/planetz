import { debug } from '../../debug.js';

/**
 * Weapons System - Provides ship combat capabilities with laser weapons
 * Based on docs/spaceships_spec.md and docs/tech_design.md
 * Energy consumption per shot (instant consumption), fire rate management, level-specific damage
 */

import System, { SYSTEM_STATES } from '../System.js';

export default class Weapons extends System {
    constructor(level = 1, config = {}) {
        // Extract weapon type from config (passed from CardSystemIntegration)
        const weaponCardType = config.weaponCardType || 'laser_cannon'; // Default to laser cannon
        
        // Base configuration for weapons
        const baseConfig = {
            slotCost: 1,
            energyConsumptionRate: 0, // Weapons don't consume energy per second, only per shot
            systemType: 'weapons',
            maxHealth: 100,
            ...config
        };
        
        super('Weapons', level, baseConfig);
        
        // Store weapon type AFTER super() call
        this.weaponCardType = weaponCardType;
        
        // Get weapon mechanics AFTER super() call when 'this' is available
        const weaponStats = this.getBaseWeaponStats();
        this.baseDamage = weaponStats.damage;
        this.baseFireRate = weaponStats.fireRate;
        this.energyPerShot = weaponStats.energyPerShot;
        
        // Weapon state
        this.isCharging = false; // Whether weapon is charging for next shot
        this.lastFireTime = 0; // When weapon last fired
        this.currentCooldown = 0; // Time until next shot can be fired
        this.burstMode = false; // Whether firing in burst mode
        this.burstCount = 0; // Current burst shots fired
        this.maxBurstShots = 3; // Maximum shots per burst (level dependent)
        
        // Targeting state
        this.hasTarget = false;
        this.targetLock = false;
        this.targetDistance = 0;
        
        // Visual effect state
        this.isFiring = false;
        this.muzzleFlashActive = false;
        
        // Weapons don't consume continuous power, so they should not be marked as "active"
        // in the power management sense. They're always "ready" when operational.
        this.isActive = false;
        
        // Re-initialize level-specific values now that base properties are set
        this.levelStats = this.initializeLevelStats();
        this.updateLevelStats();
        
debug('COMBAT', `Weapons created (Level ${level}) - Damage: ${this.getCurrentDamage()}, Fire Rate: ${this.getCurrentFireRate()}/sec`);
    }
    
    /**
     * Get base weapon statistics based on card type
     */
    getBaseWeaponStats() {
        const weaponStats = {
            'laser_cannon': {
                damage: 50,
                fireRate: 2.0,
                energyPerShot: 15,
                accuracy: 0.95,
                range: 120,
                name: 'Laser Cannon'
            },
            'plasma_cannon': {
                damage: 65,
                fireRate: 1.5,
                energyPerShot: 25,
                accuracy: 0.85,
                range: 100,
                name: 'Plasma Cannon'
            },
            'pulse_cannon': {
                damage: 35,
                fireRate: 3.0,
                energyPerShot: 10,
                accuracy: 0.90,
                range: 80,
                name: 'Pulse Cannon'
            },
            'phaser_array': {
                damage: 55,
                fireRate: 1.8,
                energyPerShot: 20,
                accuracy: 0.92,
                range: 150,
                name: 'Phaser Array'
            },
            'disruptor_cannon': {
                damage: 75,
                fireRate: 1.2,
                energyPerShot: 30,
                accuracy: 0.80,
                range: 90,
                name: 'Disruptor Cannon'
            },
            'particle_beam': {
                damage: 85,
                fireRate: 1.0,
                energyPerShot: 35,
                accuracy: 0.88,
                range: 200,
                name: 'Particle Beam'
            }
        };
        
        return weaponStats[this.weaponCardType] || weaponStats['laser_cannon'];
    }
    
    /**
     * Initialize level-specific stats for weapons
     * @returns {Object} Level stats configuration
     */
    initializeLevelStats() {
        const baseDamage = this.baseDamage;
        const baseFireRate = this.baseFireRate;
        const weaponName = this.getBaseWeaponStats().name;
        
        return {
            1: { 
                effectiveness: 1.0,
                damage: baseDamage,
                fireRate: baseFireRate,
                energyPerShot: this.energyPerShot,
                maxBurstShots: 1, // Single shot
                weaponType: `Level 1 ${weaponName}`
            },
            2: { 
                effectiveness: 1.2,
                damage: baseDamage * 1.3, // 30% more damage
                fireRate: baseFireRate * 1.1, // 10% faster fire rate
                energyPerShot: this.energyPerShot * 1.2,
                maxBurstShots: 2, // Dual shot
                weaponType: `Level 2 ${weaponName}s`
            },
            3: { 
                effectiveness: 1.4,
                damage: baseDamage * 1.6, // 60% more damage
                fireRate: baseFireRate * 1.2, // 20% faster fire rate
                energyPerShot: this.energyPerShot * 1.5,
                maxBurstShots: 3, // Triple shot
                weaponType: `Level 3 ${weaponName} Array`
            },
            4: { 
                effectiveness: 1.6,
                damage: baseDamage * 2.0, // 100% more damage
                fireRate: baseFireRate * 1.3, // 30% faster fire rate
                energyPerShot: this.energyPerShot * 1.8,
                maxBurstShots: 4, // Quad shot
                weaponType: `Level 4 Heavy ${weaponName}s`
            },
            5: { 
                effectiveness: 1.8,
                damage: baseDamage * 2.5, // 150% more damage
                fireRate: baseFireRate * 1.4, // 40% faster fire rate
                energyPerShot: this.energyPerShot * 2.0,
                maxBurstShots: 5, // Penta shot
                weaponType: `Level 5 Enhanced ${weaponName} Battery`
            },
            6: { 
                effectiveness: 2.0,
                damage: baseDamage * 3.0, // 200% more damage
                fireRate: baseFireRate * 1.5, // 50% faster fire rate
                energyPerShot: this.energyPerShot * 2.2,
                maxBurstShots: 6, // Hexa shot
                weaponType: `Level 6 Military ${weaponName} Array`
            },
            7: { 
                effectiveness: 2.2,
                damage: baseDamage * 3.5, // 250% more damage
                fireRate: baseFireRate * 1.6, // 60% faster fire rate
                energyPerShot: this.energyPerShot * 2.5,
                maxBurstShots: 7, // Hepta shot
                weaponType: `Level 7 Elite ${weaponName} System`
            }
        };
    }
    
    /**
     * Update weapon stats based on current level
     */
    updateLevelStats() {
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        
        this.maxBurstShots = levelStats.maxBurstShots;
        
debug('COMBAT', `Weapons upgraded to Level ${this.level} - ${levelStats.weaponType}`);
    }
    
    /**
     * Get current damage per shot based on level and system health
     * @returns {number} Damage per shot
     */
    getCurrentDamage() {
        if (!this.isOperational()) {
            return 0;
        }
        
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        const baseDamage = levelStats.damage;
        const effectiveness = this.getEffectiveness();
        
        return baseDamage * effectiveness;
    }
    
    /**
     * Get current fire rate (shots per second) based on level and system health
     * @returns {number} Fire rate in shots per second
     */
    getCurrentFireRate() {
        if (!this.isOperational()) {
            return 0;
        }
        
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        const baseFireRate = levelStats.fireRate;
        const effectiveness = this.getEffectiveness();
        
        return baseFireRate * effectiveness;
    }
    
    /**
     * Get energy cost per shot based on level and system health
     * @returns {number} Energy consumed per shot
     */
    getEnergyPerShot() {
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        const baseEnergyPerShot = levelStats.energyPerShot;
        
        // Damaged systems are less efficient (consume more energy)
        const effectiveness = this.getEffectiveness();
        const inefficiencyPenalty = 1 + (1 - effectiveness) * 0.3; // Up to 30% more energy when damaged
        
        return baseEnergyPerShot * inefficiencyPenalty;
    }
    
    /**
     * Get time between shots in milliseconds
     * @returns {number} Cooldown time in milliseconds
     */
    getShotCooldown() {
        const fireRate = this.getCurrentFireRate();
        return fireRate > 0 ? 1000 / fireRate : Infinity;
    }
    
    /**
     * Check if weapon can fire (not on cooldown and operational)
     * @returns {boolean} True if weapon can fire
     */
    canFire() {
        if (!this.isOperational()) {
            return false;
        }
        
        const now = Date.now();
        const cooldownTime = this.getShotCooldown();
        
        return (now - this.lastFireTime) >= cooldownTime;
    }
    
    /**
     * Attempt to fire weapon
     * @param {Ship} ship - Ship instance for energy consumption
     * @param {Object} target - Optional target object with position
     * @returns {Object|null} Fire result with damage and hit information, or null if failed
     */
    fire(ship, target = null) {
        if (!this.canFire()) {
            console.warn('Cannot fire: weapon on cooldown or not operational');
            return null;
        }
        
        const energyCost = this.getEnergyPerShot();
        
        // Check if ship has enough energy
        if (!ship.hasEnergy(energyCost)) {
            console.warn('Cannot fire: insufficient energy');
            return null;
        }
        
        // Consume energy
        ship.consumeEnergy(energyCost);
        
        // Calculate damage
        const damage = this.getCurrentDamage();
        
        // Update fire timing
        this.lastFireTime = Date.now();
        this.currentCooldown = this.getShotCooldown();
        
        // Visual effects
        this.triggerMuzzleFlash();
        
        // Calculate hit probability and range effects
        const hitResult = this.calculateHit(target);
        
        const fireResult = {
            damage: damage,
            energyConsumed: energyCost,
            hit: hitResult.hit,
            distance: hitResult.distance,
            accuracy: hitResult.accuracy,
            weaponType: this.levelStats[this.level].weaponType,
            timestamp: this.lastFireTime
        };
        
        // Removed weapon firing spam
        
        return fireResult;
    }
    
    /**
     * Calculate hit probability and range effects
     * @param {Object} target - Target object with position
     * @returns {Object} Hit calculation results
     */
    calculateHit(target) {
        if (!target || !target.position) {
            // No target - assume hit for direct fire
            return {
                hit: true,
                distance: 0,
                accuracy: 1.0
            };
        }
        
        // Calculate distance to target
        this.targetDistance = target.position.distanceTo(new THREE.Vector3(0, 0, 0));
        
        // Base accuracy (affected by system health and distance)
        const effectiveness = this.getEffectiveness();
        const maxRange = 1000; // Maximum effective range
        const rangeEffect = Math.max(0.1, 1 - (this.targetDistance / maxRange));
        const accuracy = effectiveness * rangeEffect;
        
        // Hit probability (can be modified for difficulty)
        const hitChance = Math.min(0.95, accuracy); // Maximum 95% hit chance
        const hit = Math.random() < hitChance;
        
        return {
            hit: hit,
            distance: this.targetDistance,
            accuracy: accuracy
        };
    }
    
    /**
     * Trigger muzzle flash effect
     */
    triggerMuzzleFlash() {
        this.muzzleFlashActive = true;
        this.isFiring = true;
        
        // Reset visual effects after brief delay
        setTimeout(() => {
            this.muzzleFlashActive = false;
            this.isFiring = false;
        }, 100);
    }
    
    /**
     * Set targeting information
     * @param {boolean} hasTarget - Whether a target is selected
     * @param {boolean} targetLock - Whether target is locked
     * @param {number} distance - Distance to target
     */
    setTargeting(hasTarget, targetLock = false, distance = 0) {
        this.hasTarget = hasTarget;
        this.targetLock = targetLock;
        this.targetDistance = distance;
    }
    
    /**
     * Get base firepower provided by this weapon system
     * @returns {number} Base firepower rating provided by weapons
     */
    getBaseFirepower() {
        if (!this.isOperational()) return 0;
        
        // Base firepower per level
        const firepowerPerLevel = 12; // Base firepower units per level
        const baseFirepower = firepowerPerLevel * this.level;
        
        return baseFirepower * this.getEffectiveness();
    }
    
    /**
     * Get firepower bonus for ship stats calculation (legacy method for compatibility)
     * @returns {number} Firepower multiplier based on weapon damage
     */
    getFirepowerBonus() {
        if (!this.isOperational()) {
            return 0;
        }
        
        // Firepower bonus based on current damage and fire rate
        const effectiveness = this.getEffectiveness();
        const damageMultiplier = this.getCurrentDamage() / this.baseDamage; // Relative to base damage
        const rateMultiplier = this.getCurrentFireRate() / this.baseFireRate; // Relative to base fire rate
        
        // Combined firepower bonus (damage * rate * effectiveness)
        return (damageMultiplier * rateMultiplier * effectiveness - 1); // -1 to get bonus above base
    }
    
    /**
     * Handle system state effects specific to weapons
     * @param {string} newState The new system state
     */
    handleStateEffects(newState) {
        super.handleStateEffects(newState);
        
        switch (newState) {
            case SYSTEM_STATES.CRITICAL:
                // Critical weapons have reduced fire rate and damage
debug('P1', 'Critical weapon damage - reduced combat effectiveness');
                break;
            case SYSTEM_STATES.DISABLED:
                // Disabled weapons cannot fire
debug('COMBAT', 'Weapon systems disabled - no firing capability!');
                break;
        }
    }
    
    /**
     * Update weapons (called each frame)
     * @param {number} deltaTime Time elapsed since last update in milliseconds
     * @param {Ship} ship Ship instance for integration
     */
    update(deltaTime, ship) {
        // Call parent update (no continuous energy consumption for weapons)
        super.update(deltaTime, ship);
        
        // Update cooldown timer
        if (this.currentCooldown > 0) {
            this.currentCooldown = Math.max(0, this.currentCooldown - deltaTime);
        }
        
        // Update charging state
        this.isCharging = this.currentCooldown > 0;
        
        // Update visual effects
        if (this.muzzleFlashActive) {
            // Handle muzzle flash timing
        }
    }
    
    /**
     * Get current energy consumption rate per second
     * Weapons don't consume continuous energy, only per shot
     * @returns {number} Always returns 0 for weapons
     */
    getEnergyConsumptionRate() {
        return 0; // Weapons only consume energy per shot, not continuously
    }
    
    /**
     * Activate weapons (override base method)
     * Weapons don't consume continuous power, so activation just means "ready to fire"
     * @param {Ship} ship - Ship instance (not used for weapons)
     * @returns {boolean} True if weapons are operational
     */
    activate(ship) {
        if (!this.isOperational()) {
            console.warn(`Cannot activate ${this.name}: system not operational`);
            return false;
        }
        
        // Weapons don't have an "active" state in the power consumption sense
        // They're always ready to fire when operational
debug('COMBAT', `${this.name} ready to fire`);
        return true;
    }
    
    /**
     * Deactivate weapons (override base method)
     * Weapons don't consume continuous power, so deactivation is not applicable
     */
    deactivate() {
        // Weapons don't have an "active" state in the power consumption sense
        // This method exists for interface compatibility but doesn't change state
debug('COMBAT', `${this.name} deactivation requested (weapons don't consume continuous power)`);
    }
    
    /**
     * Upgrade system to next level
     * @returns {boolean} True if upgrade successful
     */
    upgrade() {
        const result = super.upgrade();
        if (result) {
            this.updateLevelStats();
        }
        return result;
    }
    
    /**
     * Get system status with weapon-specific information
     * @returns {Object} Extended status object
     */
    getStatus() {
        const baseStatus = super.getStatus();
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        
        return {
            ...baseStatus,
            // Override isActive to reflect "ready to fire" status rather than power consumption
            isActive: this.isOperational() && this.canFire(),
            currentDamage: this.getCurrentDamage(),
            currentFireRate: this.getCurrentFireRate(),
            energyPerShot: this.getEnergyPerShot(),
            canFire: this.canFire(),
            isCharging: this.isCharging,
            cooldownRemaining: this.currentCooldown,
            weaponType: levelStats.weaponType,
            hasTarget: this.hasTarget,
            targetLock: this.targetLock,
            targetDistance: this.targetDistance,
            firepowerBonus: this.getFirepowerBonus(),
            maxBurstShots: this.maxBurstShots,
            // Add clarification that weapons don't consume continuous power
            energyConsumptionType: 'per-shot',
            continuousEnergyConsumption: 0
        };
    }
    
    /**
     * Clean up weapon effects when system is destroyed
     */
    dispose() {
        // Clean up any visual effects or timers
        this.muzzleFlashActive = false;
        this.isFiring = false;
        this.isCharging = false;
    }
} 