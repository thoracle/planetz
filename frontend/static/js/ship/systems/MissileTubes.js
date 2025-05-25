/**
 * Missile Tubes System - Provides ship combat capabilities with missile weapons
 * Separate from laser weapons, competes for weapon slots
 * Based on docs/spaceships_spec.md and docs/tech_design.md
 */

import System, { SYSTEM_STATES } from '../System.js';

export default class MissileTubes extends System {
    constructor(level = 1, config = {}) {
        // Initialize base missile properties BEFORE calling super()
        const baseDamage = 80; // Higher base damage than lasers
        const baseFireRate = 0.8; // Slower fire rate than lasers
        
        // Base configuration for missile tubes
        const baseConfig = {
            slotCost: 1, // Competes with laser weapons for slots
            energyConsumptionRate: 0, // Missiles don't consume energy per second, only per shot
            systemType: 'missile_tubes',
            maxHealth: 100,
            ...config
        };
        
        super('Missile Tubes', level, baseConfig);
        
        // Store the base properties as instance variables
        this.baseDamage = baseDamage;
        this.baseFireRate = baseFireRate;
        
        // Missile state
        this.isCharging = false; // Whether missile is loading for next shot
        this.lastFireTime = 0; // When missile last fired
        this.currentCooldown = 0; // Time until next missile can be fired
        this.burstMode = false; // Whether firing in burst mode
        this.burstCount = 0; // Current burst missiles fired
        this.maxBurstShots = 1; // Maximum missiles per burst (level dependent)
        
        // Targeting state
        this.hasTarget = false;
        this.targetLock = false;
        this.targetDistance = 0;
        
        // Visual effect state
        this.isFiring = false;
        this.launchFlashActive = false;
        
        // Missile tubes don't consume continuous power, so they should not be marked as "active"
        // in the power management sense. They're always "ready" when operational.
        this.isActive = false;
        
        // Re-initialize level-specific values now that base properties are set
        this.levelStats = this.initializeLevelStats();
        this.updateLevelStats();
        
        console.log(`Missile Tubes created (Level ${level}) - Damage: ${this.getCurrentDamage()}, Fire Rate: ${this.getCurrentFireRate()}/sec`);
    }
    
    /**
     * Initialize level-specific stats for missile tubes
     * @returns {Object} Level stats configuration
     */
    initializeLevelStats() {
        const baseDamage = this.baseDamage;
        const baseFireRate = this.baseFireRate;
        
        return {
            1: { 
                effectiveness: 1.0,
                damage: baseDamage,
                fireRate: baseFireRate,
                energyPerShot: 5, // Level 1 missile tubes take 5 energy to fire
                maxBurstShots: 1, // Single missile
                weaponType: 'Level 1 Light Missiles'
            },
            2: { 
                effectiveness: 1.2,
                damage: baseDamage * 1.4, // 40% more damage
                fireRate: baseFireRate * 0.9, // 10% slower fire rate
                energyPerShot: 12, // Level 2 missile tubes take 12 energy to fire
                maxBurstShots: 2, // Dual missile launch
                weaponType: 'Level 2 Standard Missiles'
            },
            3: { 
                effectiveness: 1.4,
                damage: baseDamage * 1.8, // 80% more damage
                fireRate: baseFireRate * 0.8, // 20% slower fire rate
                energyPerShot: 20, // Level 3 missile tubes take 20 energy to fire
                maxBurstShots: 2, // Dual missile launch
                weaponType: 'Level 3 Heavy Missiles'
            },
            4: { 
                effectiveness: 1.6,
                damage: baseDamage * 2.5, // 150% more damage
                fireRate: baseFireRate * 0.7, // 30% slower fire rate
                energyPerShot: 30, // Level 4 missile tubes take 30 energy to fire
                maxBurstShots: 3, // Triple missile launch
                weaponType: 'Level 4 Plasma Missiles'
            },
            5: { 
                effectiveness: 1.8,
                damage: baseDamage * 3.5, // 250% more damage
                fireRate: baseFireRate * 0.6, // 40% slower fire rate
                energyPerShot: 40, // Level 5 missile tubes take 40 energy to fire
                maxBurstShots: 4, // Quad missile launch
                weaponType: 'Level 5 Quantum Torpedoes'
            }
        };
    }
    
    /**
     * Update missile stats based on current level
     */
    updateLevelStats() {
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        
        this.maxBurstShots = levelStats.maxBurstShots;
        
        console.log(`Missile Tubes upgraded to Level ${this.level} - ${levelStats.weaponType}`);
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
     * Check if missile can fire (not on cooldown and operational)
     * @returns {boolean} True if missile can fire
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
     * Attempt to fire missile
     * @param {Ship} ship - Ship instance for energy consumption
     * @param {Object} target - Optional target object with position
     * @returns {Object} Fire result with success status and details
     */
    fire(ship, target = null) {
        if (!this.canFire()) {
            return {
                success: false,
                reason: 'Missile tubes on cooldown or not operational',
                cooldownRemaining: this.getShotCooldown() - (Date.now() - this.lastFireTime)
            };
        }
        
        const energyCost = this.getEnergyPerShot();
        
        // Check if ship has enough energy
        if (!ship.hasEnergy(energyCost)) {
            return {
                success: false,
                reason: 'Insufficient energy for missile launch',
                energyRequired: energyCost,
                energyAvailable: ship.currentEnergy
            };
        }
        
        // Consume energy
        ship.consumeEnergy(energyCost);
        
        // Record fire time
        this.lastFireTime = Date.now();
        
        // Set firing state
        this.isFiring = true;
        this.triggerLaunchFlash();
        
        // Calculate hit if target provided
        let hitResult = null;
        if (target) {
            hitResult = this.calculateHit(target);
        }
        
        console.log(`Missile fired! Energy consumed: ${energyCost}, Damage: ${this.getCurrentDamage()}`);
        
        return {
            success: true,
            damage: this.getCurrentDamage(),
            energyConsumed: energyCost,
            hitResult: hitResult,
            weaponType: this.levelStats[this.level]?.weaponType || 'Missiles'
        };
    }
    
    /**
     * Calculate hit probability and damage for target
     * @param {Object} target - Target object with position and other properties
     * @returns {Object} Hit calculation result
     */
    calculateHit(target) {
        // Missiles have better tracking than lasers but are slower
        let baseAccuracy = 0.85; // 85% base hit chance
        
        // Distance affects accuracy (missiles lose tracking at long range)
        if (this.targetDistance > 0) {
            const distancePenalty = Math.min(this.targetDistance / 1000, 0.3); // Max 30% penalty
            baseAccuracy -= distancePenalty;
        }
        
        // Target lock improves accuracy
        if (this.targetLock) {
            baseAccuracy += 0.1; // 10% bonus for target lock
        }
        
        // System effectiveness affects accuracy
        const effectiveness = this.getEffectiveness();
        const finalAccuracy = baseAccuracy * effectiveness;
        
        const hit = Math.random() < finalAccuracy;
        const damage = hit ? this.getCurrentDamage() : 0;
        
        return {
            hit: hit,
            damage: damage,
            accuracy: finalAccuracy,
            distance: this.targetDistance
        };
    }
    
    /**
     * Trigger visual launch flash effect
     */
    triggerLaunchFlash() {
        this.launchFlashActive = true;
        
        // Reset flash after short duration
        setTimeout(() => {
            this.launchFlashActive = false;
        }, 200); // 200ms flash duration
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
     * Get firepower bonus for ship stats calculation
     * @returns {number} Firepower multiplier bonus
     */
    getFirepowerBonus() {
        if (!this.isOperational()) {
            return 0;
        }
        
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        const effectiveness = this.getEffectiveness();
        
        // Missile tubes provide significant firepower bonus due to high damage
        return (levelStats.effectiveness - 1.0) * effectiveness * 1.2; // 20% more bonus than lasers
    }
    
    /**
     * Handle state-specific effects for missile tubes
     * @param {string} newState - New system state
     */
    handleStateEffects(newState) {
        switch (newState) {
            case SYSTEM_STATES.CRITICAL:
                console.log('Missile tubes critical - reduced fire rate and accuracy');
                break;
            case SYSTEM_STATES.DISABLED:
                console.log('Missile tubes disabled - cannot fire');
                this.isFiring = false;
                break;
            case SYSTEM_STATES.DESTROYED:
                console.log('Missile tubes destroyed - no missile capability');
                this.isFiring = false;
                break;
        }
    }
    
    /**
     * Update missile tubes system
     * @param {number} deltaTime - Time elapsed since last update
     * @param {Ship} ship - Ship instance
     */
    update(deltaTime, ship) {
        super.update(deltaTime, ship);
        
        // Update cooldown display
        if (this.lastFireTime > 0) {
            const timeSinceLastFire = Date.now() - this.lastFireTime;
            const cooldownTime = this.getShotCooldown();
            this.currentCooldown = Math.max(0, cooldownTime - timeSinceLastFire);
        }
        
        // Reset firing state after brief period
        if (this.isFiring && Date.now() - this.lastFireTime > 500) {
            this.isFiring = false;
        }
    }
    
    /**
     * Get current energy consumption rate per second
     * Missile tubes don't consume continuous energy, only per shot
     * @returns {number} Always returns 0 for missile tubes
     */
    getEnergyConsumptionRate() {
        return 0; // Missile tubes only consume energy per shot, not continuously
    }
    
    /**
     * Activate missile tubes (override base method)
     * Missile tubes don't consume continuous power, so activation just means "ready to fire"
     * @param {Ship} ship - Ship instance (not used for missile tubes)
     * @returns {boolean} True if missile tubes are operational
     */
    activate(ship) {
        if (!this.isOperational()) {
            return false;
        }
        
        // Missile tubes are always "ready" when operational, no continuous power needed
        console.log('Missile tubes ready to fire');
        return true;
    }
    
    /**
     * Deactivate missile tubes (override base method)
     * @returns {boolean} Always true for missile tubes
     */
    deactivate() {
        console.log('Missile tubes standing down');
        return true;
    }
    
    /**
     * Upgrade missile tubes to next level
     * @returns {boolean} True if upgrade was successful
     */
    upgrade() {
        if (this.level < 5) {
            this.level++;
            this.updateLevelStats();
            console.log(`Missile tubes upgraded to Level ${this.level}`);
            return true;
        }
        return false;
    }
    
    /**
     * Get system status with missile-specific information
     * @returns {Object} Extended status object
     */
    getStatus() {
        const baseStatus = super.getStatus();
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        
        return {
            ...baseStatus,
            // Add backward compatibility for HUD
            healthPercentage: baseStatus.health.percentage,
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
            readyToFire: this.isOperational() && !this.isActive // Ready when operational but not consuming power
        };
    }
    
    /**
     * Clean up missile tubes system
     */
    dispose() {
        this.isFiring = false;
        this.launchFlashActive = false;
        console.log('Missile tubes system disposed');
    }
}