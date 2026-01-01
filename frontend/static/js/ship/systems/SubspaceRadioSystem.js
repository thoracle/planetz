import { debug } from '../../debug.js';

/**
 * Subspace Radio System - Provides galactic communication and news feeds
 * Based on docs/spaceships_spec.md and docs/tech_design.md
 * Energy consumption when active, damage affects signal strength and range
 */

import System, { SYSTEM_STATES } from '../System.js';

export default class SubspaceRadioSystem extends System {
    constructor(level = 1, config = {}) {
        // Initialize base radio properties BEFORE calling super()
        const baseSignalRange = 100; // Base percentage of galactic range
        const baseEnergyConsumptionRate = 6; // Energy per second when radio is active
        const baseSignalStrength = 100; // Base signal clarity (percentage)
        
        // Base configuration for subspace radio
        const baseConfig = {
            slotCost: 1,
            energyConsumptionRate: baseEnergyConsumptionRate,
            repairCost: 120,
            upgradeBaseCost: 250,
            ...config
        };

        super('Subspace Radio', level, baseConfig);

        // Store base values for level calculations
        this.baseSignalRange = baseSignalRange;
        this.baseEnergyConsumptionRate = baseEnergyConsumptionRate;
        this.baseSignalStrength = baseSignalStrength;
        
        // Radio state
        this.isRadioActive = false;
        this.lastActivationTime = 0;
        this.activationCooldown = 500; // 0.5 second cooldown between activations
        
        // Override default active state - radio is only active when listening
        this.isActive = false;
        
debug('UTILITY', `Subspace Radio System created (Level ${this.level}) - Signal Range: ${this.getCurrentSignalRange()}%, Signal Strength: ${this.getCurrentSignalStrength()}%`);
    }

    initializeLevelStats() {
        // Define level-specific stats for subspace radio
        // Use constants here since instance properties aren't available yet during super() call
        const baseSignalRange = 100;
        const baseEnergyConsumptionRate = 6;
        const baseSignalStrength = 100;
        
        const levelStats = {};
        
        for (let level = 1; level <= this.maxLevel; level++) {
            levelStats[level] = {
                effectiveness: level / this.maxLevel, // 0.2 to 1.0
                signalRange: Math.floor(baseSignalRange * (0.5 + 0.5 * (level / this.maxLevel))), // 50% to 100%
                energyConsumptionRate: baseEnergyConsumptionRate, // Fixed at 6 energy/sec for all levels
                signalStrength: Math.floor(baseSignalStrength * (0.6 + 0.4 * (level / this.maxLevel))), // 60% to 100%
                maxChannels: level * 3, // 3 to 15 communication channels
                messageBuffer: level * 10 // 10 to 50 stored messages
            };
        }

debug('UTILITY', `Subspace Radio upgraded to Level ${this.level} - Enhanced Communication Array`);
        return levelStats;
    }

    // Energy consumption only when radio is active
    getEnergyConsumptionRate() {
        if (!this.isOperational() || !this.isActive || !this.isRadioActive) {
            return 0;
        }
        
        // Safety check for initialization
        if (!this.levelStats || !this.levelStats[this.level]) {
            const baseConsumption = this.baseEnergyConsumptionRate;
            // Apply damage reduction - damaged systems are less efficient
            const damageMultiplier = this.getEffectiveness() < 1 ? 1.2 : 1.0;
            return baseConsumption * damageMultiplier;
        }
        
        const currentStats = this.levelStats[this.level];
        const baseConsumption = currentStats.energyConsumptionRate;
        
        // Apply damage reduction - damaged systems are less efficient
        const damageMultiplier = this.getEffectiveness() < 1 ? 1.2 : 1.0;
        
        return baseConsumption * damageMultiplier;
    }

    // Check if radio can be activated
    canActivate(ship) {
        // Basic system operational check
        if (!this.isOperational()) {
            return false;
        }

        // Card requirement check - radio requires subspace radio cards
        if (ship && ship.hasSystemCardsSync) {
            const cardCheck = ship.hasSystemCardsSync('subspace_radio');
            // Handle both boolean and object returns
            let cardCheckPassed = false;
            if (typeof cardCheck === 'boolean') {
                cardCheckPassed = cardCheck;
            } else if (cardCheck && typeof cardCheck === 'object') {
                cardCheckPassed = cardCheck.hasCards;
            } else {
                cardCheckPassed = false;
            }
            
            if (!cardCheckPassed) {
                return false;
            }
        }

        // Cooldown check
        if (this.isInCooldown()) {
            return false;
        }

        // Energy check (use correct property name)
        const energyRequired = 15; // Energy required for activation
        if (ship && ship.currentEnergy < energyRequired) {
            return false;
        }

        return true;
    }

    /**
     * Check if system is in cooldown period
     * @returns {boolean} True if system is in cooldown
     */
    isInCooldown() {
        if (!this.lastActivationTime || !this.activationCooldown) {
            return false;
        }
        
        const currentTime = Date.now();
        return (currentTime - this.lastActivationTime) < this.activationCooldown;
    }

    // Activate subspace radio
    activateRadio(ship) {
        if (!this.canActivate(ship)) {
            return false;
        }
        
        // Consume energy for activation
        ship.currentEnergy -= 15;
        this.isActive = true;
        this.isRadioActive = true;
        this.lastActivationTime = Date.now();
        
debug('UTILITY', `Subspace Radio activated - Energy consumption: ${this.getEnergyConsumptionRate()}/sec`);
        return true;
    }

    // Deactivate subspace radio
    deactivateRadio() {
        this.isActive = false;
        this.isRadioActive = false;
debug('UTILITY', 'Subspace Radio deactivated');
    }

    // Get current signal range affected by damage
    getCurrentSignalRange() {
        // Safety check for initialization
        if (!this.levelStats || !this.levelStats[this.level]) {
            return Math.floor(this.baseSignalRange * this.getEffectiveness());
        }
        
        const currentStats = this.levelStats[this.level];
        const baseRange = currentStats.signalRange;
        
        // Apply damage effects - damaged systems have reduced range
        return Math.floor(baseRange * this.getEffectiveness());
    }

    // Get current signal strength affected by damage
    getCurrentSignalStrength() {
        // Safety check for initialization
        if (!this.levelStats || !this.levelStats[this.level]) {
            return Math.floor(this.baseSignalStrength * this.getEffectiveness());
        }
        
        const currentStats = this.levelStats[this.level];
        const baseStrength = currentStats.signalStrength;
        
        // Apply damage effects - damaged systems have weaker signals
        return Math.floor(baseStrength * this.getEffectiveness());
    }

    // Get maximum channels available
    getMaxChannels() {
        if (!this.levelStats || !this.levelStats[this.level]) {
            return Math.max(1, Math.floor(3 * this.getEffectiveness()));
        }
        
        const currentStats = this.levelStats[this.level];
        return Math.max(1, Math.floor(currentStats.maxChannels * this.getEffectiveness()));
    }

    // Process incoming messages based on system capabilities and damage
    processIncomingMessage(rawMessage) {
        if (!this.isOperational() || !rawMessage) {
            return null;
        }
        
        const signalStrength = this.getCurrentSignalStrength();
        const signalRange = this.getCurrentSignalRange();
        
        // Apply signal degradation based on damage
        let processedMessage = { ...rawMessage };
        
        if (signalStrength < 100) {
            // Introduce signal interference when damaged
            if (signalStrength < 80) {
                // Add static to message
                const staticChance = (100 - signalStrength) / 100;
                if (Math.random() < staticChance * 0.3) {
                    processedMessage.text = processedMessage.text.replace(/[aeiou]/gi, '*');
                }
            }
            
            if (signalStrength < 60) {
                // Severe interference
                processedMessage.text = processedMessage.text + ' [SIGNAL WEAK]';
            }
            
            if (signalStrength < 40) {
                // Critical interference
                processedMessage.text = '[STATIC] ' + processedMessage.text + ' [TRANSMISSION BREAKING UP]';
            }
        }
        
        // Check if message is within range
        if (rawMessage.distance && signalRange < 100) {
            const maxDistance = signalRange / 100;
            if (rawMessage.distance > maxDistance) {
                return null; // Message out of range
            }
        }
        
        return processedMessage;
    }

    // Get status including radio-specific information
    getStatus() {
        const baseStatus = super.getStatus();
        
        return {
            ...baseStatus,
            isRadioActive: this.isRadioActive,
            signalRange: this.getCurrentSignalRange(),
            signalStrength: this.getCurrentSignalStrength(),
            maxChannels: this.getMaxChannels(),
            canActivate: this.canActivate({ currentEnergy: 1000 }), // Test with high energy
            energyConsumptionRate: this.getEnergyConsumptionRate(),
            messageBuffer: (this.levelStats && this.levelStats[this.level]) ? this.levelStats[this.level].messageBuffer : 10
        };
    }

    // Handle system damage - radio becomes less reliable
    takeDamage(amount) {
        const wasDamaged = this.currentHealth < this.maxHealth;
        super.takeDamage(amount);
        
        // If radio becomes heavily damaged while active, deactivate it
        if (this.isRadioActive && this.getEffectiveness() < 0.2) {
            debug('P1', 'Subspace Radio system critically damaged - shutting down');
            this.deactivateRadio();
        }
    }

    // Update method called each frame
    update(deltaTime, ship) {
        super.update(deltaTime);
        
        // Handle energy consumption when active
        if (this.isRadioActive && ship) {
            const energyConsumption = this.getEnergyConsumptionRate() * deltaTime / 1000;
            ship.currentEnergy -= energyConsumption;
            
            // Auto-deactivate if energy runs out
            if (ship.currentEnergy <= 0) {
                debug('UTILITY', 'Insufficient energy - Subspace Radio shutting down');
                this.deactivateRadio();
            }
        }
    }

    /**
     * Clean up subspace radio resources
     */
    dispose() {
        this.deactivateRadio();
        debug('UTILITY', 'Subspace Radio disposed');
    }
} 