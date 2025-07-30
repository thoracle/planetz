/**
 * Base System class - interface for all ship systems
 * Based on docs/tech_design.md and docs/spaceships_spec.md
 * Simplified: Systems consume energy from ship's shared energy pool when active
 */

// System states from the state diagram in tech_design.md
export const SYSTEM_STATES = {
    OPERATIONAL: 'operational',
    DAMAGED: 'damaged', 
    CRITICAL: 'critical',
    DISABLED: 'disabled'
};

// System damage thresholds
export const DAMAGE_THRESHOLDS = {
    MINOR: 0.25,     // 0-25% damage
    MODERATE: 0.50,  // 26-50% damage  
    SEVERE: 0.75,    // 51-75% damage
    CRITICAL: 1.0    // 76-100% damage
};

// Standardized display names for all systems
export const SYSTEM_DISPLAY_NAMES = {
    // Core ship systems
    'hull_plating': 'Hull Plating',
    'energy_reactor': 'Energy Reactor',
    'shield_generator': 'Shield Generator',
    'cargo_hold': 'Cargo Hold',
    
    // Operational systems
    'impulse_engines': 'Impulse Engines',
    'warp_drive': 'Warp Drive',
    'shields': 'Deflector Shield Generator',
    'laser_cannon': 'Laser Cannon',
    'plasma_cannon': 'Plasma Cannon',
    'pulse_cannon': 'Pulse Cannon',
    'phaser_array': 'Phaser Array',
    'disruptor_cannon': 'Disruptor Cannon',
    'particle_beam': 'Particle Beam',
    'missile_tubes': 'Missile Tubes',
    'torpedo_launcher': 'Torpedo Launcher',
    
    // Legacy weapon system (for backward compatibility)
    'weapons': 'Laser Cannon',
    
    // Sensor and communication systems
    'long_range_scanner': 'Long Range Sensors',
    'subspace_radio': 'Subspace Radio',
    'galactic_chart': 'Galactic Chart',
    'target_computer': 'Target Computer',
    
    // Legacy/alternative names
    'sensors': 'Sensors',
    'life_support': 'Life Support',
    'targeting': 'Target Computer',
    'scanner': 'Long Range Scanner',
    'radio': 'Subspace Radio'
};

/**
 * Get standardized display name for a system
 * @param {string} systemName - Internal system name
 * @returns {string} User-friendly display name
 */
export function getSystemDisplayName(systemName) {
    return SYSTEM_DISPLAY_NAMES[systemName] || 
           systemName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

export default class System {
    constructor(name, level = 1, config = {}) {
        // Basic properties
        this.name = name;
        this.displayName = getSystemDisplayName(name);
        this.level = level;
        this.maxLevel = 5;
        
        // Health tracking
        this.maxHealth = config.maxHealth || 100;
        this.currentHealth = this.maxHealth;
        this.healthPercentage = 1.0;
        
        // SIMPLIFIED: Only slot cost, no power cost (systems consume energy when active)
        this.slotCost = config.slotCost || 1;
        this.energyConsumptionRate = config.energyConsumptionRate || 0; // Energy per second when active
        this.isActive = true; // Track if system is actively consuming energy - default to true for operational systems
        
        // System state
        this.state = SYSTEM_STATES.OPERATIONAL;
        this.effectiveness = 1.0;
        
        // System type and configuration
        this.systemType = config.systemType || 'generic';
        this.config = config;
        
        // Level-specific stats (to be overridden by concrete systems)
        this.levelStats = this.initializeLevelStats();
        
        // Remove verbose system creation logging - only log if there are issues
        // console.log(`System created: ${this.displayName} (Level ${level}) - Energy consumption: ${this.energyConsumptionRate}/sec`);
    }
    
    /**
     * Initialize level-specific stats (to be overridden by concrete systems)
     * @returns {Object} Level stats configuration
     */
    initializeLevelStats() {
        return {
            1: { effectiveness: 1.0, energyConsumptionRate: this.energyConsumptionRate },
            2: { effectiveness: 1.2, energyConsumptionRate: this.energyConsumptionRate * 1.1 },
            3: { effectiveness: 1.4, energyConsumptionRate: this.energyConsumptionRate * 1.2 },
            4: { effectiveness: 1.6, energyConsumptionRate: this.energyConsumptionRate * 1.3 },
            5: { effectiveness: 1.8, energyConsumptionRate: this.energyConsumptionRate * 1.4 }
        };
    }
    
    /**
     * Check if system is operational
     * @returns {boolean} True if system can function
     */
    isOperational() {
        return this.state !== SYSTEM_STATES.DISABLED && this.currentHealth > 0;
    }
    
    /**
     * Get current effectiveness (0.0 to 1.0)
     * @returns {number} System effectiveness
     */
    getEffectiveness() {
        if (!this.isOperational()) {
            return 0.0;
        }
        
        // Base effectiveness from health
        let healthEffectiveness = this.healthPercentage;
        
        // Apply level bonuses
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        let levelEffectiveness = levelStats.effectiveness || 1.0;
        
        // Combine effectiveness factors
        this.effectiveness = Math.min(1.0, healthEffectiveness * levelEffectiveness);
        
        return this.effectiveness;
    }
    
    /**
     * Get current energy consumption rate per second
     * @returns {number} Energy consumption rate when active
     */
    getEnergyConsumptionRate() {
        if (!this.isActive || !this.isOperational()) {
            return 0;
        }
        
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        return levelStats.energyConsumptionRate || this.energyConsumptionRate;
    }
    
    /**
     * Activate the system (start consuming energy)
     * @param {Ship} ship - Ship instance for energy consumption
     * @returns {boolean} True if activation successful
     */
    activate(ship) {
        if (!this.isOperational()) {
            console.warn(`Cannot activate ${this.displayName}: system not operational`);
            return false;
        }
        
        this.isActive = true;
        console.log(`${this.displayName} activated`);
        return true;
    }
    
    /**
     * Deactivate the system (stop consuming energy)
     */
    deactivate() {
        this.isActive = false;
        console.log(`${this.displayName} deactivated`);
    }
    
    /**
     * Apply damage to the system
     * @param {number} damage Amount of damage to apply
     */
    takeDamage(damage) {
        if (damage <= 0) return;
        
        this.currentHealth = Math.max(0, this.currentHealth - damage);
        this.healthPercentage = this.currentHealth / this.maxHealth;
        
        // Update system state based on health
        this.updateSystemState();
        
        console.log(`${this.displayName} took ${damage.toFixed(1)} damage. Health: ${this.healthPercentage.toFixed(2)}`);
    }
    
    /**
     * Repair the system
     * @param {number} repairAmount Amount to repair (0-1 for percentage of max health)
     */
    repair(repairAmount) {
        if (repairAmount <= 0) return;
        
        const repairPoints = repairAmount * this.maxHealth;
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + repairPoints);
        this.healthPercentage = this.currentHealth / this.maxHealth;
        
        // Update system state based on new health
        this.updateSystemState();
        
        console.log(`${this.displayName} repaired by ${(repairAmount * 100).toFixed(1)}%. Health: ${this.healthPercentage.toFixed(2)}`);
    }
    
    /**
     * Update system state based on current health
     */
    updateSystemState() {
        const previousState = this.state;
        
        if (this.healthPercentage <= 0) {
            this.state = SYSTEM_STATES.DISABLED;
            this.isActive = false; // Disabled systems are not active
        } else if (this.healthPercentage <= DAMAGE_THRESHOLDS.MINOR) {
            this.state = SYSTEM_STATES.CRITICAL;
        } else if (this.healthPercentage <= DAMAGE_THRESHOLDS.MODERATE) {
            this.state = SYSTEM_STATES.DAMAGED;
        } else {
            this.state = SYSTEM_STATES.OPERATIONAL;
        }
        
        // Trigger state change events if state changed
        if (previousState !== this.state) {
            this.onStateChanged(previousState, this.state);
        }
    }
    
    /**
     * Handle state change events
     * @param {string} fromState Previous state
     * @param {string} toState New state
     */
    onStateChanged(fromState, toState) {
        console.log(`${this.displayName} state changed: ${fromState} -> ${toState}`);
        
        // Trigger cascading effects based on state changes
        this.handleStateEffects(toState);
    }
    
    /**
     * Handle state-specific effects (to be overridden by concrete systems)
     * @param {string} newState The new system state
     */
    handleStateEffects(newState) {
        // Base implementation - concrete systems should override this
        switch (newState) {
            case SYSTEM_STATES.CRITICAL:
                // Systems in critical state may have chance of failure
                if (Math.random() < 0.1) { // 10% chance of cascading failure
                    console.log(`${this.displayName} experiencing cascading failure!`);
                }
                break;
            case SYSTEM_STATES.DISABLED:
                console.log(`${this.displayName} is completely disabled!`);
                break;
        }
    }
    
    /**
     * Upgrade system to next level
     * @returns {boolean} True if upgrade successful
     */
    upgrade() {
        if (this.level >= this.maxLevel) {
            console.warn(`${this.displayName} is already at maximum level (${this.maxLevel})`);
            return false;
        }
        
        this.level++;
        
        // Update energy consumption rate based on new level
        const levelStats = this.levelStats[this.level];
        if (levelStats && levelStats.energyConsumptionRate) {
            this.energyConsumptionRate = levelStats.energyConsumptionRate;
        }
        
        console.log(`${this.displayName} upgraded to level ${this.level}`);
        return true;
    }
    
    /**
     * Get system status information
     * @returns {Object} Status object
     */
    getStatus() {
        return {
            name: this.name,
            displayName: this.displayName,
            level: this.level,
            maxLevel: this.maxLevel,
            health: {
                current: this.currentHealth,
                max: this.maxHealth,
                percentage: this.healthPercentage
            },
            state: this.state,
            effectiveness: this.getEffectiveness(),
            isActive: this.isActive,
            energyConsumption: this.getEnergyConsumptionRate(),
            slotCost: this.slotCost,
            systemType: this.systemType
        };
    }
    
    /**
     * Update system (called each frame) - consume energy if active
     * @param {number} deltaTime Time elapsed since last update in milliseconds
     * @param {Ship} ship Ship instance for energy consumption
     */
    update(deltaTime, ship) {
        // Consume energy if active and operational
        if (this.isActive && this.isOperational() && ship) {
            const energyPerFrame = this.getEnergyConsumptionRate() * (deltaTime / 1000);
            if (energyPerFrame > 0) {
                if (!ship.consumeEnergy(energyPerFrame)) {
                    // Not enough energy - deactivate system
                    console.log(`${this.displayName} deactivated due to insufficient energy`);
                    this.deactivate();
                }
            }
        }
    }
    
    /**
     * Get level requirements for upgrade
     * @param {number} targetLevel Target level (1-5)
     * @returns {Object} Requirements object
     */
    getLevelRequirements(targetLevel) {
        if (targetLevel < 1 || targetLevel > this.maxLevel) {
            return null;
        }
        
        return {
            level: targetLevel,
            credits: targetLevel * 1000, // Base cost scaling
            materials: this.getRequiredMaterials(targetLevel),
            prerequisites: [] // To be defined by concrete systems
        };
    }
    
    /**
     * Get required materials for upgrade
     * @param {number} targetLevel Target level
     * @returns {Array} Array of required materials
     */
    getRequiredMaterials(targetLevel) {
        // Base materials - concrete systems should override
        return [
            { name: 'electronics', quantity: targetLevel * 5 },
            { name: 'alloys', quantity: targetLevel * 3 }
        ];
    }
    
    /**
     * Check if system can be upgraded
     * @returns {boolean} True if upgrade is possible
     */
    canUpgrade() {
        return this.level < this.maxLevel && this.isOperational();
    }

    /**
     * Set the StarfieldManager reference for HUD error display
     * @param {StarfieldManager} starfieldManager The StarfieldManager instance
     */
    setStarfieldManager(starfieldManager) {
        this.starfieldManager = starfieldManager;
    }

    /**
     * Show HUD error message if StarfieldManager is available
     * @param {string} title Error title
     * @param {string} message Error message
     * @param {number} duration Duration in milliseconds (default 3000)
     */
    showHUDError(title, message, duration = 3000) {
        if (this.starfieldManager && this.starfieldManager.showHUDError) {
            this.starfieldManager.showHUDError(title, message, duration);
        }
    }

    /**
     * Play command failed sound if StarfieldManager is available
     */
    playCommandFailedSound() {
        if (this.starfieldManager && this.starfieldManager.playCommandFailedSound) {
            this.starfieldManager.playCommandFailedSound();
        }
    }
} 