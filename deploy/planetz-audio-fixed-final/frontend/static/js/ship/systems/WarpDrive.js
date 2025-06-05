/**
 * Warp Drive System - Provides faster-than-light travel capability
 * Based on docs/spaceships_spec.md and docs/tech_design.md
 * Converted from standalone WarpDrive.js to integrate with Ship system architecture
 */

import System, { SYSTEM_STATES } from '../System.js';

export default class WarpDrive extends System {
    constructor(level = 1, config = {}) {
        // Base configuration for warp drive
        const baseConfig = {
            slotCost: 1,
            energyConsumptionRate: 0, // Warp uses energy differently (lump sum per warp)
            systemType: 'warp_drive',
            maxHealth: 200,
            ...config
        };
        
        super('Warp Drive', level, baseConfig);
        
        // Warp drive specific properties
        this.isWarping = false;
        this.warpFactor = 1.0;
        this.maxWarpFactor = 9.9;
        this.cooldownTime = 0;
        this.maxCooldownTime = 60000; // 60 seconds
        this.warpSequenceTime = 12000; // Match WarpEffects duration
        this.lastUpdateTime = Date.now();
        
        // Override default active state - warp drive is only active when warping
        this.isActive = false;
        
        // Energy tracking for current warp
        this.totalEnergyCost = 0;
        this.energyConsumed = 0;
        
        // External dependencies (to be set when needed)
        this.sectorNavigation = null;
        this.feedback = null; // WarpFeedback instance
        
        // Event callbacks
        this.onWarpStart = null;
        this.onWarpEnd = null;
        this.onEnergyUpdate = null;
        
        // Acceleration curve for smooth transitions (optional - only if Three.js is available)
        this.accelerationCurve = null;
        if (typeof window !== 'undefined' && window.THREE && window.THREE.CubicBezierCurve3) {
            try {
                this.accelerationCurve = new window.THREE.CubicBezierCurve3(
                    new window.THREE.Vector3(0, 0, 0),
                    new window.THREE.Vector3(0.2, 0.8, 0),
                    new window.THREE.Vector3(0.8, 1, 0),
                    new window.THREE.Vector3(1, 1, 0)
                );
            } catch (error) {
                console.warn('Three.js not available for warp drive acceleration curve');
            }
        }
        
        console.log(`Warp Drive created (Level ${level}) - Max Warp Factor: ${this.getMaxWarpFactor()}`);
    }
    
    /**
     * Initialize level-specific stats for warp drive
     * @returns {Object} Level stats configuration
     */
    initializeLevelStats() {
        const baseCooldown = this.maxCooldownTime;
        
        return {
            1: { 
                effectiveness: 1.0,
                maxWarpFactor: 6.0, // Level 1 limited to warp 6
                cooldownReduction: 1.0, // No reduction
                energyEfficiency: 1.0 // No efficiency bonus
            },
            2: { 
                effectiveness: 1.2,
                maxWarpFactor: 7.0, // Level 2 can reach warp 7
                cooldownReduction: 0.9, // 10% faster cooldown
                energyEfficiency: 0.95 // 5% more efficient
            },
            3: { 
                effectiveness: 1.4,
                maxWarpFactor: 8.0, // Level 3 can reach warp 8
                cooldownReduction: 0.8, // 20% faster cooldown
                energyEfficiency: 0.90 // 10% more efficient
            },
            4: { 
                effectiveness: 1.6,
                maxWarpFactor: 9.0, // Level 4 can reach warp 9
                cooldownReduction: 0.7, // 30% faster cooldown
                energyEfficiency: 0.85 // 15% more efficient
            },
            5: { 
                effectiveness: 1.8,
                maxWarpFactor: 9.9, // Level 5 maximum warp factor
                cooldownReduction: 0.6, // 40% faster cooldown
                energyEfficiency: 0.80 // 20% more efficient
            }
        };
    }
    
    /**
     * Get maximum warp factor for current system level and health
     * @returns {number} Maximum achievable warp factor
     */
    getMaxWarpFactor() {
        if (!this.isOperational()) {
            return 0;
        }
        
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        const maxForLevel = levelStats.maxWarpFactor || 6.0;
        
        // Damaged warp drives have reduced max warp factor
        const effectiveness = this.getEffectiveness();
        let damageReduction;
        
        if (effectiveness < 0.2) {
            // Severely damaged (below 20%) - emergency warp only (warp 1-2)
            damageReduction = 0.2; // Max warp 2 for emergency escape
        } else if (effectiveness < 0.5) {
            // Moderately damaged - half warp factor
            damageReduction = 0.5;
        } else {
            // Lightly damaged or operational - full capability
            damageReduction = 1.0;
        }
        
        // Ensure minimum emergency warp capability (at least warp 1)
        const calculatedMax = Math.min(this.maxWarpFactor, maxForLevel * damageReduction);
        return Math.max(1.0, calculatedMax);
    }
    
    /**
     * Get maximum travel distance per warp jump based on system health
     * When damaged, warp drive loses range capability rather than speed
     * @returns {number} Maximum travel distance in sectors (Manhattan distance)
     */
    getMaxTravelDistance() {
        // Destroyed warp drive cannot travel
        if (!this.isOperational()) {
            return 0;
        }
        
        const effectiveness = this.getEffectiveness();
        
        if (effectiveness < 0.2) {
            // Severely damaged (below 20%) - emergency range only (1-2 sectors)
            return 2;
        } else if (effectiveness < 0.5) {
            // Moderately damaged (20-50%) - reduced range (2-4 sectors)
            return Math.floor(8 * effectiveness);
        } else {
            // Lightly damaged or operational (50%+) - full galactic range
            return 9; // Full 9x9 galactic grid range
        }
    }
    
    /**
     * Get effective cooldown time considering level and damage
     * @returns {number} Cooldown time in milliseconds
     */
    getEffectiveCooldownTime() {
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        const baseCooldown = this.maxCooldownTime * levelStats.cooldownReduction;
        
        // Damaged systems have longer cooldowns
        const effectiveness = this.getEffectiveness();
        const damageMultiplier = 1 + (1 - effectiveness) * 0.5; // Up to 50% longer cooldown when damaged
        
        return baseCooldown * damageMultiplier;
    }
    
    /**
     * Calculate energy cost for a warp, considering level efficiency and damage
     * @param {number} baseCost - Base energy cost for the warp
     * @returns {number} Actual energy cost
     */
    calculateWarpEnergyCost(baseCost) {
        if (!this.isOperational()) {
            return Infinity; // Can't warp if not operational
        }
        
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        const efficiency = levelStats.energyEfficiency || 1.0;
        
        // Damaged systems are less efficient
        const effectiveness = this.getEffectiveness();
        const damageInefficiency = 1 + (1 - effectiveness) * 0.3; // Up to 30% more energy when damaged
        
        return Math.ceil(baseCost * efficiency * damageInefficiency);
    }
    
    /**
     * Set the warp factor
     * @param {number} factor - The desired warp factor
     * @returns {boolean} True if the warp factor was set successfully
     */
    setWarpFactor(factor) {
        const maxFactor = this.getMaxWarpFactor();
        
        if (factor < 1.0 || factor > maxFactor) {
            console.warn(`Invalid warp factor: ${factor}. Must be between 1.0 and ${maxFactor} for current system level/health`);
            return false;
        }
        
        this.warpFactor = factor;
        return true;
    }
    
    /**
     * Check if warp drive can be activated
     * @param {Ship} ship - Ship instance to check energy and other conditions
     * @returns {boolean} True if warp can be activated
     */
    canActivateWarp(ship) {
        if (!this.isOperational()) {
            return false;
        }
        
        if (this.isWarping) {
            return false;
        }
        
        if (this.cooldownTime > 0) {
            return false;
        }
        
        if (!this.sectorNavigation) {
            return false;
        }
        
        // Check if ship has enough energy for the warp
        const baseCost = this.sectorNavigation.calculateRequiredEnergy(
            this.sectorNavigation.currentSector,
            this.sectorNavigation.targetSector
        );
        const actualCost = this.calculateWarpEnergyCost(baseCost);
        
        return ship.currentEnergy >= actualCost;
    }
    
    /**
     * Activate the warp drive
     * @param {Ship} ship - Ship instance for energy consumption
     * @returns {boolean} True if activation was successful
     */
    activateWarp(ship) {
        if (!this.canActivateWarp(ship)) {
            this.showWarpError(ship);
            return false;
        }
        
        // Calculate total energy cost for this warp
        const baseCost = this.sectorNavigation.calculateRequiredEnergy(
            this.sectorNavigation.currentSector,
            this.sectorNavigation.targetSector
        );
        this.totalEnergyCost = this.calculateWarpEnergyCost(baseCost);
        this.energyConsumed = 0;
        
        console.log('Warp initiated:', {
            cost: this.totalEnergyCost,
            from: this.sectorNavigation.currentSector,
            to: this.sectorNavigation.targetSector,
            level: this.level,
            effectiveness: this.getEffectiveness()
        });
        
        this.isWarping = true;
        this.isActive = true; // Set active when warping starts
        this.lastUpdateTime = Date.now();
        
        // Show feedback if available
        if (this.feedback) {
            this.feedback.showAll();
        }
        
        // Trigger start callback
        if (this.onWarpStart) {
            this.onWarpStart(this.warpFactor);
        }
        
        return true;
    }
    
    /**
     * Deactivate the warp drive and start cooldown
     */
    deactivateWarp() {
        if (!this.isWarping) return;
        
        this.isWarping = false;
        this.isActive = false; // Set inactive when warping ends
        this.cooldownTime = this.getEffectiveCooldownTime();
        
        console.log(`Warp deactivated - Cooldown: ${this.cooldownTime}ms`);
        
        // Show feedback for cooldown
        if (this.feedback) {
            this.feedback.showAll();
            this.feedback.updateProgress(100, `Warp Cooldown (${Math.ceil(this.cooldownTime / 1000)}s)`);
        }
        
        // Trigger end callback
        if (this.onWarpEnd) {
            this.onWarpEnd();
        }
        
        // Hide feedback after cooldown (if not damaged)
        if (this.isOperational()) {
            setTimeout(() => {
                if (this.feedback) {
                    this.feedback.hideAll();
                }
            }, this.cooldownTime);
        }
    }
    
    /**
     * Show appropriate error message for failed warp activation
     * @param {Ship} ship - Ship instance to check conditions
     */
    showWarpError(ship) {
        if (!this.feedback) return;
        
        if (!this.isOperational()) {
            this.feedback.showWarning(
                'Warp Drive Damaged',
                'The warp drive requires repair before it can be activated.',
                () => this.feedback.hideAll()
            );
        } else if (this.cooldownTime > 0) {
            this.feedback.showWarning(
                'Warp Drive Cooling Down',
                `Please wait ${Math.ceil(this.cooldownTime / 1000)} seconds before activating warp drive again.`,
                () => this.feedback.hideAll()
            );
        } else if (this.isWarping) {
            this.feedback.showWarning(
                'Warp Drive Active',
                'The warp drive is already active.',
                () => this.feedback.hideAll()
            );
        } else if (ship.currentEnergy < this.totalEnergyCost) {
            this.feedback.showWarning(
                'Insufficient Energy',
                `The warp drive requires ${this.totalEnergyCost} energy. Current: ${ship.currentEnergy}`,
                () => this.feedback.hideAll()
            );
        } else {
            this.feedback.showWarning(
                'Warp Drive Error',
                'Unable to activate warp drive. Check navigation system.',
                () => this.feedback.hideAll()
            );
        }
    }
    
    /**
     * Apply damage to the warp drive
     * Warp drive can be completely destroyed but remains repairable
     * @param {number} damage Amount of damage to apply
     */
    takeDamage(damage) {
        if (damage <= 0) return;
        
        this.currentHealth = Math.max(0, this.currentHealth - damage);
        this.healthPercentage = this.currentHealth / this.maxHealth;
        
        // Update system state based on health
        this.updateSystemState();
        
        console.log(`${this.name} took ${damage.toFixed(1)} damage. Health: ${this.healthPercentage.toFixed(2)}`);
        
        if (this.healthPercentage === 0) {
            console.log(`${this.name} has been completely destroyed but can still be repaired`);
        }
    }
    


    /**
     * Check if system is operational
     * @returns {boolean} True if system can function
     */
    isOperational() {
        // Warp drive can be completely destroyed (0% health) but is still repairable
        return this.healthPercentage > 0;
    }

    /**
     * Handle system state effects specific to warp drive
     * @param {string} newState The new system state
     */
    handleStateEffects(newState) {
        super.handleStateEffects(newState);
        
        switch (newState) {
            case SYSTEM_STATES.CRITICAL:
                // Critical warp drive has extended cooldown and reduced max warp factor
                if (this.isWarping) {
                    console.log('Critical warp drive damage - reducing warp factor');
                    const maxFactor = this.getMaxWarpFactor();
                    if (this.warpFactor > maxFactor) {
                        this.warpFactor = maxFactor;
                    }
                }
                break;
            case SYSTEM_STATES.DISABLED:
                // Warp drive is completely destroyed and cannot function
                if (this.isWarping) {
                    console.log('Warp drive destroyed - emergency warp termination!');
                    this.isWarping = false;
                    this.isActive = false; // Set inactive on destruction
                    this.cooldownTime = 0; // No cooldown when destroyed
                    
                    if (this.onWarpEnd) {
                        this.onWarpEnd();
                    }
                }
                console.log('Warp drive completely destroyed - requires repair before use');
                break;
        }
    }
    
    /**
     * Update warp drive (called each frame)
     * @param {number} deltaTime Time elapsed since last update in milliseconds
     * @param {Ship} ship Ship instance for energy consumption
     */
    update(deltaTime, ship) {
        // Call parent update (no energy consumption during normal operation)
        super.update(deltaTime, ship);
        
        const currentTime = Date.now();
        const timeSinceLastUpdate = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;
        
        if (this.isWarping && ship) {
            this.updateWarpSequence(ship, deltaTime);
        } else if (this.cooldownTime > 0) {
            this.updateCooldown(timeSinceLastUpdate);
        }
    }
    
    /**
     * Update warp sequence energy consumption
     * @param {Ship} ship Ship instance for energy consumption
     * @param {number} deltaTime Time elapsed since last update
     */
    updateWarpSequence(ship, deltaTime) {
        // Calculate energy consumption based on remaining cost and time
        const remainingEnergy = this.totalEnergyCost - this.energyConsumed;
        
        // Calculate energy per frame based on total cost and warp duration
        // For 60 FPS, we want to consume the total cost over the warp sequence time
        const framesInWarpSequence = (this.warpSequenceTime / 1000) * 60; // Convert to frames
        const energyPerFrame = Math.ceil(this.totalEnergyCost / framesInWarpSequence);
        const energyConsumption = Math.min(remainingEnergy, energyPerFrame);
        
        // Consume energy from ship
        if (energyConsumption > 0) {
            if (ship.consumeEnergy(energyConsumption)) {
                this.energyConsumed += energyConsumption;
            } else {
                // Not enough energy - emergency warp termination
                console.warn('Insufficient energy during warp - emergency termination');
                this.deactivateWarp();
                
                if (this.feedback) {
                    this.feedback.showWarning(
                        'Energy Depleted',
                        'The warp drive has been deactivated due to insufficient energy.',
                        () => this.feedback.hideAll()
                    );
                }
                return;
            }
        }
        
        // Update feedback
        if (this.feedback) {
            this.feedback.updateEnergyIndicator(ship.currentEnergy, ship.maxEnergy);
            this.feedback.updateProgress(
                (this.warpFactor / this.maxWarpFactor) * 100,
                'Warp Speed'
            );
        }
        
        // Notify energy update
        if (this.onEnergyUpdate) {
            this.onEnergyUpdate(ship.currentEnergy);
        }
    }
    
    /**
     * Update cooldown timer
     * @param {number} timeSinceLastUpdate Time elapsed since last update
     */
    updateCooldown(timeSinceLastUpdate) {
        const previousCooldownTime = this.cooldownTime;
        this.cooldownTime = Math.max(0, this.cooldownTime - timeSinceLastUpdate);
        
        // Calculate cooldown progress (100% to 0%)
        const cooldownProgress = (this.cooldownTime / this.getEffectiveCooldownTime()) * 100;
        
        // Update feedback with remaining cooldown time
        if (this.feedback) {
            this.feedback.updateProgress(
                cooldownProgress,
                `Warp Cooldown (${Math.ceil(this.cooldownTime / 1000)}s)`
            );
        }
        
        // Log if cooldown time reduction is unusually large
        const timeReduced = previousCooldownTime - this.cooldownTime;
        if (timeReduced > timeSinceLastUpdate * 1.5) {
            console.warn('Large cooldown time reduction:', {
                timeReduced,
                timeSinceLastUpdate,
                previousCooldownTime,
                newCooldownTime: this.cooldownTime
            });
        }
        
        // Hide feedback when cooldown is complete
        if (this.cooldownTime <= 0 && this.feedback) {
            this.feedback.hideAll();
        }
    }
    
    /**
     * Get current speed based on warp factor
     * @returns {number} Current speed in units per second
     */
    getCurrentSpeed() {
        return this.isWarping ? this.warpFactor * 1000 : 0;
    }
    
    /**
     * Get system status with warp-specific information
     * @returns {Object} Extended status object
     */
    getStatus() {
        const baseStatus = super.getStatus();
        
        return {
            ...baseStatus,
            isWarping: this.isWarping,
            warpFactor: this.warpFactor, // Legacy field for visual effects
            maxWarpFactor: this.getMaxWarpFactor(), // Legacy field for compatibility
            maxTravelDistance: this.getMaxTravelDistance(), // Actual travel capability
            cooldownTime: this.cooldownTime,
            cooldownProgress: this.cooldownTime > 0 ? (this.cooldownTime / this.getEffectiveCooldownTime()) : 0,
            totalEnergyCost: this.totalEnergyCost,
            energyConsumed: this.energyConsumed,
            canWarp: this.isOperational() && this.cooldownTime <= 0 && !this.isWarping,
            currentSpeed: this.getCurrentSpeed()
        };
    }
    
    /**
     * Set external dependencies
     * @param {Object} sectorNavigation - SectorNavigation instance
     * @param {Object} feedback - WarpFeedback instance
     */
    setDependencies(sectorNavigation, feedback) {
        this.sectorNavigation = sectorNavigation;
        this.feedback = feedback;
    }
    
    /**
     * Set event callbacks
     * @param {Function} onWarpStart - Callback for warp start
     * @param {Function} onWarpEnd - Callback for warp end
     * @param {Function} onEnergyUpdate - Callback for energy updates
     */
    setCallbacks(onWarpStart, onWarpEnd, onEnergyUpdate) {
        this.onWarpStart = onWarpStart;
        this.onWarpEnd = onWarpEnd;
        this.onEnergyUpdate = onEnergyUpdate;
    }
} 