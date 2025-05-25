import * as THREE from 'three';
import { getShipConfig, validateShipConfig } from './ShipConfigs.js';

/**
 * Ship class - data-driven spaceship implementation
 * Based on docs/tech_design.md and docs/spaceships_spec.md
 * Simplified: Systems consume energy from shared pool when active (no separate power grid)
 */
export default class Ship {
    constructor(shipType = 'heavy_fighter') {
        // Ship identification
        this.shipType = shipType;
        this.shipConfig = getShipConfig(shipType);
        
        // Validate configuration
        if (!validateShipConfig(this.shipConfig)) {
            throw new Error(`Invalid ship configuration for ${shipType}`);
        }
        
        // Base stats from configuration
        this.baseSpeed = this.shipConfig.baseSpeed;
        this.baseArmor = this.shipConfig.baseArmor;
        this.baseFirepower = this.shipConfig.baseFirepower;
        this.baseCargoCapacity = this.shipConfig.baseCargoCapacity;
        this.baseHardpoints = this.shipConfig.baseHardpoints;
        
        // Current calculated stats (modified by systems and damage)
        this.currentSpeed = this.baseSpeed;
        this.currentArmor = this.baseArmor;
        this.currentFirepower = this.baseFirepower;
        this.currentCargoCapacity = this.baseCargoCapacity;
        
        // System management
        this.systems = new Map();
        this.upgrades = new Map();
        
        // System slots (still needed for installation limits)
        this.totalSlots = this.shipConfig.systemSlots;
        this.usedSlots = 0;
        this.availableSlots = this.totalSlots;
        
        // Energy management (central energy pool) - SIMPLIFIED: no separate power grid
        this.maxEnergy = this.shipConfig.maxEnergy;
        this.currentEnergy = this.maxEnergy;
        this.energyRechargeRate = this.shipConfig.energyRechargeRate;
        
        // Hull integrity
        this.maxHull = this.shipConfig.maxHull;
        this.currentHull = this.maxHull;
        
        // Initialize default systems
        this.initializeDefaultSystems();
        
        console.log(`Ship created: ${shipType} (simplified energy system)`, this.shipConfig);
    }
    
    /**
     * Initialize default systems for the ship
     */
    initializeDefaultSystems() {
        // System registry - will be populated as systems are added
        this.systemRegistry = new Map();
        
        // Initialize system state tracking
        this.systemStates = new Map();
        
        // Initialize default systems based on ship configuration
        this.initializeDefaultSystemInstances();
        
        console.log('Default systems initialized for', this.shipType);
    }
    
    /**
     * Create default system instances for the ship
     */
    async initializeDefaultSystemInstances() {
        try {
            // Import system classes
            const { default: ImpulseEngines } = await import('./systems/ImpulseEngines.js');
            const { default: WarpDrive } = await import('./systems/WarpDrive.js');
            const { default: Shields } = await import('./systems/Shields.js');
            const { default: Weapons } = await import('./systems/Weapons.js');
            const { default: LongRangeScanner } = await import('./systems/LongRangeScanner.js');
            const { default: GalacticChartSystem } = await import('./systems/GalacticChartSystem.js');
            
            // Get default system configurations
            const defaultSystems = this.shipConfig.defaultSystems;
            
            // Create and add default systems
            if (defaultSystems.impulse_engines) {
                const engines = new ImpulseEngines(defaultSystems.impulse_engines.level);
                this.addSystem('impulse_engines', engines);
            }
            
            if (defaultSystems.warp_drive) {
                const warpDrive = new WarpDrive(defaultSystems.warp_drive.level);
                this.addSystem('warp_drive', warpDrive);
            }
            
            if (defaultSystems.shields) {
                const shields = new Shields(defaultSystems.shields.level);
                this.addSystem('shields', shields);
            }
            
            if (defaultSystems.weapons) {
                const weapons = new Weapons(defaultSystems.weapons.level);
                this.addSystem('weapons', weapons);
            }
            
            if (defaultSystems.long_range_scanner) {
                const scanner = new LongRangeScanner(defaultSystems.long_range_scanner.level);
                this.addSystem('long_range_scanner', scanner);
            }
            
            if (defaultSystems.subspace_radio) {
                const radio = new GalacticChartSystem(defaultSystems.subspace_radio.level);
                this.addSystem('subspace_radio', radio);
            }
            
            console.log(`Initialized ${this.systems.size} default systems for ${this.shipType}`);
            
        } catch (error) {
            console.error('Error initializing default systems:', error);
        }
    }
    
    /**
     * Calculate total stats including system modifications
     */
    calculateTotalStats() {
        let speedModifier = 1.0;
        let armorModifier = 1.0;
        let firepowerModifier = 1.0;
        let cargoModifier = 1.0;
        
        // Apply system modifications
        for (let [systemName, system] of this.systems) {
            if (system.isOperational()) {
                const effectiveness = system.getEffectiveness();
                
                // Apply system-specific modifiers
                switch (systemName) {
                    case 'impulse_engines':
                        speedModifier *= (1 + (system.getSpeedBonus() * effectiveness));
                        break;
                    case 'shields':
                        armorModifier *= (1 + (system.getArmorBonus() * effectiveness));
                        break;
                    case 'weapons':
                        firepowerModifier *= (1 + (system.getFirepowerBonus() * effectiveness));
                        break;
                }
            }
        }
        
        // Apply upgrade modifications
        for (let [upgradeName, upgrade] of this.upgrades) {
            if (upgrade.isInstalled) {
                const stats = upgrade.stats;
                speedModifier *= (1 + (stats.speed || 0));
                armorModifier *= (1 + (stats.armor || 0));
                firepowerModifier *= (1 + (stats.firepower || 0));
                cargoModifier *= (1 + (stats.cargo || 0));
            }
        }
        
        // Calculate final stats
        this.currentSpeed = this.baseSpeed * speedModifier;
        this.currentArmor = this.baseArmor * armorModifier;
        this.currentFirepower = this.baseFirepower * firepowerModifier;
        this.currentCargoCapacity = this.baseCargoCapacity * cargoModifier;
        
        return {
            speed: this.currentSpeed,
            armor: this.currentArmor,
            firepower: this.currentFirepower,
            cargo: this.currentCargoCapacity
        };
    }
    
    /**
     * Apply damage to the ship
     * @param {number} damage - Amount of damage to apply
     * @param {string} damageType - Type of damage (energy, kinetic, etc.)
     */
    applyDamage(damage, damageType = 'kinetic') {
        let actualDamageToHull = damage;
        
        // Check if ship has shields and they're active
        const shieldsSystem = this.systems.get('shields');
        if (shieldsSystem && shieldsSystem.absorbDamage) {
            // Shields absorb some damage and return the remainder
            actualDamageToHull = shieldsSystem.absorbDamage(damage);
            
            if (actualDamageToHull < damage) {
                console.log(`Shields absorbed ${(damage - actualDamageToHull).toFixed(1)} damage`);
            }
        }
        
        // Apply remaining damage to hull
        this.currentHull = Math.max(0, this.currentHull - actualDamageToHull);
        
        // Apply system damage based on hull damage and random chance
        if (actualDamageToHull > 0) {
            this.applySystemDamage(actualDamageToHull, damageType);
        }
        
        // Recalculate stats after damage
        this.calculateTotalStats();
        
        console.log(`Ship took ${damage} ${damageType} damage. Hull damage: ${actualDamageToHull.toFixed(1)}. Hull: ${this.currentHull}/${this.maxHull}`);
    }
    
    /**
     * Apply damage to random systems
     * @param {number} damage - Base damage amount
     * @param {string} damageType - Type of damage
     */
    applySystemDamage(damage, damageType) {
        // 5% chance of system damage per hull hit (from spaceships_spec.md)
        if (Math.random() < 0.05) {
            const systemNames = Array.from(this.systems.keys());
            if (systemNames.length > 0) {
                const randomSystem = systemNames[Math.floor(Math.random() * systemNames.length)];
                const system = this.systems.get(randomSystem);
                
                // 10-20% damage to specific system
                const systemDamage = damage * (0.1 + Math.random() * 0.1);
                system.takeDamage(systemDamage);
                
                console.log(`System damage: ${randomSystem} took ${systemDamage.toFixed(1)} damage`);
            }
        }
    }
    
    /**
     * Repair a specific system
     * @param {string} systemName - Name of system to repair
     * @param {number} repairAmount - Amount to repair (0-1 for percentage)
     */
    repairSystem(systemName, repairAmount) {
        const system = this.systems.get(systemName);
        if (system) {
            system.repair(repairAmount);
            this.calculateTotalStats(); // Recalculate after repair
            console.log(`Repaired ${systemName} by ${(repairAmount * 100).toFixed(1)}%`);
        }
    }
    
    /**
     * Add a system to the ship (simplified - only checks slots, not power)
     * @param {string} systemName - Name of the system
     * @param {Object} system - System instance
     */
    addSystem(systemName, system) {
        // Check slot availability
        if (this.usedSlots >= this.totalSlots) {
            console.warn('No available slots for system:', systemName);
            return false;
        }
        
        this.systems.set(systemName, system);
        this.usedSlots += system.slotCost || 1;
        this.availableSlots = this.totalSlots - this.usedSlots;
        
        console.log(`Added system: ${systemName} (${this.usedSlots}/${this.totalSlots} slots used)`);
        return true;
    }
    
    /**
     * Remove a system from the ship
     * @param {string} systemName - Name of the system
     */
    removeSystem(systemName) {
        const system = this.systems.get(systemName);
        if (system) {
            this.systems.delete(systemName);
            this.usedSlots -= system.slotCost || 1;
            this.availableSlots = this.totalSlots - this.usedSlots;
            
            console.log(`Removed system: ${systemName} (${this.usedSlots}/${this.totalSlots} slots used)`);
            return true;
        }
        return false;
    }
    
    /**
     * Get current ship status
     */
    getStatus() {
        // Build systems status information
        const systemsStatus = {};
        for (const [systemName, system] of this.systems) {
            systemsStatus[systemName] = {
                health: system.healthPercentage,
                isActive: system.isActive,
                canBeActivated: system.isOperational(),
                level: system.level,
                systemType: system.systemType || systemName
            };
        }
        
        return {
            shipType: this.shipType,
            hull: {
                current: this.currentHull,
                max: this.maxHull,
                percentage: (this.currentHull / this.maxHull) * 100
            },
            energy: {
                current: this.currentEnergy,
                max: this.maxEnergy,
                percentage: (this.currentEnergy / this.maxEnergy) * 100
            },
            slots: {
                used: this.usedSlots,
                total: this.totalSlots,
                available: this.availableSlots
            },
            stats: this.calculateTotalStats(),
            systems: systemsStatus,
            systemCount: this.systems.size
        };
    }
    
    /**
     * Update ship systems (called each frame)
     * @param {number} deltaTime - Time elapsed since last update
     */
    update(deltaTime) {
        // Recharge energy
        if (this.currentEnergy < this.maxEnergy) {
            this.currentEnergy = Math.min(
                this.maxEnergy,
                this.currentEnergy + (this.energyRechargeRate * deltaTime / 1000)
            );
        }
        
        // Update all systems (systems can consume energy during their update)
        for (let [systemName, system] of this.systems) {
            if (system.update) {
                system.update(deltaTime, this); // Pass ship reference for energy consumption
            }
        }
    }
    
    /**
     * Consume energy from the central pool
     * @param {number} amount - Amount of energy to consume
     * @returns {boolean} - True if energy was available and consumed
     */
    consumeEnergy(amount) {
        if (this.currentEnergy >= amount) {
            this.currentEnergy -= amount;
            return true;
        }
        return false;
    }
    
    /**
     * Check if ship has sufficient energy
     * @param {number} amount - Amount of energy to check
     * @returns {boolean} - True if energy is available
     */
    hasEnergy(amount) {
        return this.currentEnergy >= amount;
    }
    
    /**
     * Get total energy consumption per second from all active systems
     * @returns {number} Energy consumption rate per second
     */
    getEnergyConsumptionRate() {
        let totalConsumption = 0;
        
        for (let [systemName, system] of this.systems) {
            if (system.isOperational() && system.getEnergyConsumptionRate) {
                totalConsumption += system.getEnergyConsumptionRate();
            }
        }
        
        return totalConsumption;
    }
    
    /**
     * Get a specific system by name
     * @param {string} systemName - Name of the system to retrieve
     * @returns {System|null} The system instance or null if not found
     */
    getSystem(systemName) {
        return this.systems.get(systemName) || null;
    }
    
    /**
     * Get the warp drive system
     * @returns {WarpDrive|null} The warp drive system or null if not available
     */
    getWarpDrive() {
        return this.getSystem('warp_drive');
    }
} 