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
            slotCost: 2,
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
     * Get maximum impulse speed for current system level
     * @returns {number} Maximum impulse speed
     */
    getMaxImpulseSpeed() {
        if (!this.isOperational()) {
            return 0;
        }
        
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        return Math.min(levelStats.maxSpeed || 6, this.maxImpulseSpeed);
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
     * Get speed bonus for ship stats calculation
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
     * Handle system state effects specific to impulse engines
     * @param {string} newState The new system state
     */
    handleStateEffects(newState) {
        super.handleStateEffects(newState);
        
        switch (newState) {
            case SYSTEM_STATES.CRITICAL:
                // Critical engines can't go above impulse 3
                if (this.currentImpulseSpeed > 3) {
                    console.log('Critical engine damage - impulse speed reduced to 3');
                    this.setImpulseSpeed(3);
                }
                break;
            case SYSTEM_STATES.DISABLED:
                // Disabled engines can't move
                this.currentImpulseSpeed = 0;
                this.isMovingForward = false;
                console.log('Impulse engines disabled - ship dead in space!');
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
} 