/**
 * Impulse Engines System - Provides ship movement and maneuverability
 * Based on docs/spaceships_spec.md and docs/tech_design.md
 * Energy consumption varies with impulse speed setting
 */

import System, { SYSTEM_STATES } from '../System.js';

export default class ImpulseEngines extends System {
    constructor(level = 1, config = {}) {
        // Base energy consumption at impulse 1 (will scale with speed)
        const baseConfig = {
            slotCost: 1,
            energyConsumptionRate: 5, // Base consumption at impulse 1
            systemType: 'impulse_engines',
            maxHealth: 150,
            ...config
        };
        
        super('Impulse Engines', level, baseConfig);
        
        // Impulse speed settings (1-9, where 9 is maximum)
        this.currentImpulseSpeed = 0; // 0 = stopped, 1-9 = speed settings
        this.maxImpulseSpeed = 9;
        
        // Movement state
        this.isMovingForward = false;
        this.isRotating = false;
        
        // Engines start powered down (override base System default)
        this.isActive = false;
        
        // Energy consumption scaling by impulse speed
        this.energyScaling = {
            0: 0,    // Stopped - no energy consumption
            1: 1.0,  // Impulse 1 - base consumption
            2: 1.5,  // Impulse 2 - 50% more energy
            3: 2.2,  // Impulse 3 - 120% more energy
            4: 3.0,  // Impulse 4 - 200% more energy
            5: 4.0,  // Impulse 5 - 300% more energy
            6: 5.5,  // Impulse 6 - 450% more energy
            7: 7.5,  // Impulse 7 - 650% more energy
            8: 10.0, // Impulse 8 - 900% more energy
            9: 15.0  // Impulse 9 - 1400% more energy (emergency speed)
        };
        
        console.log(`Impulse Engines created (Level ${level}) - Max Speed: Impulse ${this.maxImpulseSpeed}`);
    }
    
    /**
     * Initialize level-specific stats for impulse engines
     * @returns {Object} Level stats configuration
     */
    initializeLevelStats() {
        const baseConsumption = this.energyConsumptionRate;
        return {
            1: { 
                effectiveness: 1.0, 
                energyConsumptionRate: baseConsumption,
                maxSpeed: 6 // Level 1 caps at impulse 6
            },
            2: { 
                effectiveness: 1.2, 
                energyConsumptionRate: baseConsumption * 0.9, // 10% more efficient
                maxSpeed: 7 // Level 2 caps at impulse 7
            },
            3: { 
                effectiveness: 1.4, 
                energyConsumptionRate: baseConsumption * 0.8, // 20% more efficient
                maxSpeed: 8 // Level 3 caps at impulse 8
            },
            4: { 
                effectiveness: 1.6, 
                energyConsumptionRate: baseConsumption * 0.7, // 30% more efficient
                maxSpeed: 9 // Level 4 caps at impulse 9
            },
            5: { 
                effectiveness: 1.8, 
                energyConsumptionRate: baseConsumption * 0.6, // 40% more efficient
                maxSpeed: 9 // Level 5 caps at impulse 9 (max efficiency)
            }
        };
    }
    
    /**
     * Get maximum impulse speed for current system level and health
     * @returns {number} Maximum impulse speed
     */
    getMaxImpulseSpeed() {
        if (!this.isOperational()) {
            return 0;
        }
        
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        const maxForLevel = levelStats.maxSpeed || 6;
        
        // Damaged engines have reduced max speed
        const effectiveness = this.getEffectiveness();
        let speedReduction;
        
        if (effectiveness < 0.2) {
            // Severely damaged (below 20%) - emergency speed only (impulse 1)
            speedReduction = 1; // Max impulse 1 for emergency movement
        } else if (effectiveness < 0.5) {
            // Moderately damaged - half speed
            speedReduction = Math.ceil(maxForLevel * 0.5);
        } else {
            // Lightly damaged or operational - full capability
            speedReduction = maxForLevel;
        }
        
        // Ensure minimum emergency movement capability (at least impulse 1)
        const calculatedMax = Math.min(speedReduction, this.maxImpulseSpeed);
        return Math.max(1, calculatedMax);
    }
    
    /**
     * Set impulse speed (0-9)
     * @param {number} speed - Impulse speed setting
     * @returns {boolean} True if speed was set successfully
     */
    setImpulseSpeed(speed) {
        if (!this.isOperational()) {
            console.warn('Cannot set impulse speed: engines not operational');
            return false;
        }
        
        const maxSpeed = this.getMaxImpulseSpeed();
        const clampedSpeed = Math.max(0, Math.min(speed, maxSpeed));
        
        if (clampedSpeed !== speed) {
            console.warn(`Impulse speed clamped to ${clampedSpeed} (max for level ${this.level}: ${maxSpeed})`);
        }
        
        this.currentImpulseSpeed = clampedSpeed;
        
        // Update active state based on impulse speed
        this.isActive = clampedSpeed > 0;
        
        console.log(`Impulse speed set to ${clampedSpeed}`);
        return true;
    }
    
    /**
     * Get current impulse speed setting
     * @returns {number} Current impulse speed (0-9)
     */
    getImpulseSpeed() {
        return this.currentImpulseSpeed;
    }
    
    /**
     * Set movement state (forward movement)
     * @param {boolean} moving - True if ship is moving forward
     */
    setMovingForward(moving) {
        this.isMovingForward = moving;
        
        // Update active state - engines are active if moving and have impulse speed > 0
        this.isActive = moving && this.currentImpulseSpeed > 0;
    }
    
    /**
     * Set rotation state (ship turning)
     * @param {boolean} rotating - True if ship is rotating
     */
    setRotating(rotating) {
        this.isRotating = rotating;
        // Note: Rotation doesn't consume energy
    }
    
    /**
     * Get current energy consumption rate per second
     * Only consumes energy when moving forward, not when rotating
     * @returns {number} Energy consumption rate when active
     */
    getEnergyConsumptionRate() {
        // No energy consumption if not operational or not moving forward
        if (!this.isOperational() || !this.isMovingForward || this.currentImpulseSpeed === 0) {
            return 0;
        }
        
        // Get base consumption for current level
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        const baseConsumption = levelStats.energyConsumptionRate || this.energyConsumptionRate;
        
        // Apply impulse speed scaling
        const speedMultiplier = this.energyScaling[this.currentImpulseSpeed] || 1.0;
        
        // Apply system effectiveness (damaged systems are less efficient)
        const effectiveness = this.getEffectiveness();
        const inefficiencyPenalty = 1 + (1 - effectiveness) * 0.5; // Up to 50% more consumption when damaged
        
        return baseConsumption * speedMultiplier * inefficiencyPenalty;
    }
    
    /**
     * Get base speed provided by this engine system
     * @returns {number} Base speed rating provided by engines
     */
    getBaseSpeed() {
        if (!this.isOperational()) return 0;
        
        // Base speed per level
        const speedPerLevel = 15; // Base speed units per level
        const baseSpeed = speedPerLevel * this.level;
        
        return baseSpeed * this.getEffectiveness();
    }
    
    /**
     * Get speed bonus for ship stats calculation (legacy method for compatibility)
     * @returns {number} Speed multiplier based on impulse speed
     */
    getSpeedBonus() {
        if (!this.isOperational()) {
            return 0;
        }
        
        // Speed bonus based on current impulse setting and system effectiveness
        const effectiveness = this.getEffectiveness();
        const speedMultiplier = this.currentImpulseSpeed / this.maxImpulseSpeed; // 0-1 based on impulse setting
        
        return speedMultiplier * effectiveness;
    }
    
    /**
     * Apply damage to the impulse engines
     * Impulse engines can be completely destroyed but remain repairable
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
        // Impulse engines can be completely destroyed (0% health) but are still repairable
        return this.healthPercentage > 0;
    }

    /**
     * Handle system state effects specific to impulse engines
     * @param {string} newState The new system state
     */
    handleStateEffects(newState) {
        super.handleStateEffects(newState);
        
        switch (newState) {
            case SYSTEM_STATES.CRITICAL:
                // Critical engines can't go above impulse 2 (emergency speed only)
                if (this.currentImpulseSpeed > 2) {
                    console.log('Critical engine damage - impulse speed reduced to emergency speed (2)');
                    this.setImpulseSpeed(2);
                }
                break;
            case SYSTEM_STATES.DISABLED:
                // Impulse engines are completely destroyed and cannot function
                if (this.currentImpulseSpeed > 0) {
                    console.log('Impulse engines destroyed - all stop!');
                    this.emergencyStop();
                }
                break;
        }
    }
    
    /**
     * Get system status with impulse-specific information
     * @returns {Object} Extended status object
     */
    getStatus() {
        const baseStatus = super.getStatus();
        
        return {
            ...baseStatus,
            currentImpulseSpeed: this.currentImpulseSpeed,
            maxImpulseSpeed: this.getMaxImpulseSpeed(),
            isMovingForward: this.isMovingForward,
            isRotating: this.isRotating,
            speedBonus: this.getSpeedBonus(),
            energyEfficiency: this.getEnergyEfficiency()
        };
    }
    
    /**
     * Get energy efficiency rating (lower is better)
     * @returns {number} Energy units per distance unit
     */
    getEnergyEfficiency() {
        if (this.currentImpulseSpeed === 0) {
            return 0;
        }
        
        const energyPerSecond = this.getEnergyConsumptionRate();
        const speedFactor = this.currentImpulseSpeed;
        
        // Energy per distance unit (energy/sec divided by speed factor)
        return energyPerSecond / speedFactor;
    }
    
    /**
     * Get travel time and energy cost for a given distance
     * @param {number} distance - Distance to travel
     * @param {number} impulseSpeed - Impulse speed to use (optional, uses current if not specified)
     * @returns {Object} Travel calculation results
     */
    calculateTravel(distance, impulseSpeed = null) {
        const speed = impulseSpeed !== null ? impulseSpeed : this.currentImpulseSpeed;
        
        if (speed === 0 || !this.isOperational()) {
            return {
                time: Infinity,
                energyCost: Infinity,
                possible: false
            };
        }
        
        // Simulate the energy consumption for this speed
        const tempSpeed = this.currentImpulseSpeed;
        const tempMoving = this.isMovingForward;
        
        this.currentImpulseSpeed = speed;
        this.isMovingForward = true;
        
        const energyPerSecond = this.getEnergyConsumptionRate();
        
        // Restore original state
        this.currentImpulseSpeed = tempSpeed;
        this.isMovingForward = tempMoving;
        
        // Calculate travel time (arbitrary units - speed affects time)
        const timeToTravel = distance / speed;
        const totalEnergyCost = energyPerSecond * timeToTravel;
        
        return {
            time: timeToTravel,
            energyCost: totalEnergyCost,
            energyPerSecond: energyPerSecond,
            efficiency: totalEnergyCost / distance,
            possible: true
        };
    }
    
    /**
     * Emergency stop - immediately set impulse to 0
     */
    emergencyStop() {
        this.currentImpulseSpeed = 0;
        this.isMovingForward = false;
        console.log('Emergency stop engaged - all stop!');
    }
    
    /**
     * Check if impulse engines can be activated
     * @param {Ship} ship - The ship instance
     * @returns {boolean} - True if impulse engines can be activated
     */
    canActivate(ship) {
        if (!this.isOperational()) {
            return false;
        }
        
        // Check if ship has required cards
        if (ship && ship.hasSystemCardsSync) {
            const cardCheck = ship.hasSystemCardsSync('impulse_engines');
            if (cardCheck && typeof cardCheck === 'object' && !cardCheck.hasCards) {
                return false;
            } else if (typeof cardCheck === 'boolean' && !cardCheck) {
                return false;
            }
        }
        
        // Impulse engines have no additional requirements
        return true;
    }
} 