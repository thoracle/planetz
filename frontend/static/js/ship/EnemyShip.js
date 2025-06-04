import { getEnemyShipConfig, validateShipConfig } from './ShipConfigs.js';

/**
 * EnemyShip class - simplified enemy vessels with only essential combat systems
 * Based on enemy ship configurations with minimal systems
 */
export default class EnemyShip {
    constructor(enemyShipType = 'enemy_fighter') {
        // Get enemy ship configuration
        this.shipConfig = getEnemyShipConfig(enemyShipType);
        
        // Validate configuration
        if (!validateShipConfig(this.shipConfig)) {
            throw new Error(`Invalid enemy ship configuration for ${enemyShipType}`);
        }
        
        // Ship identification
        this.shipType = enemyShipType;
        this.isEnemy = true;
        this.diplomacy = 'enemy';
        this.shipName = `${this.shipConfig.name}`;
        
        // Base stats from configuration
        this.baseSpeed = this.shipConfig.baseSpeed;
        this.baseArmor = this.shipConfig.baseArmor;
        this.baseFirepower = this.shipConfig.baseFirepower;
        this.baseCargoCapacity = this.shipConfig.baseCargoCapacity;
        this.baseHardpoints = this.shipConfig.baseHardpoints;
        
        // Current calculated stats (will be derived from installed gear)
        this.currentSpeed = 0;
        this.currentArmor = 0;
        this.currentFirepower = 0;
        this.currentCargoCapacity = 0;
        
        // System management
        this.systems = new Map();
        this.systemRegistry = new Map();
        this.systemStates = new Map();
        
        // System slots
        this.totalSlots = this.shipConfig.systemSlots;
        this.usedSlots = 0;
        this.availableSlots = this.totalSlots;
        
        // Energy management (will be set by energy reactor)
        this.maxEnergy = 0;
        this.currentEnergy = 0;
        this.energyRechargeRate = 0;
        
        // Hull integrity (will be set by hull plating)
        this.maxHull = 0;
        this.currentHull = 0;
        
        // Initialize enemy systems
        this.initializeEnemySystemInstances();
        
        console.log(`Enemy ship created: ${enemyShipType}`, this.shipConfig);
    }
    
    /**
     * Initialize enemy system instances with simplified configurations
     */
    async initializeEnemySystemInstances() {
        try {
            // Import only the systems that enemy ships use
            const { default: ImpulseEngines } = await import('./systems/ImpulseEngines.js');
            const { default: Shields } = await import('./systems/Shields.js');
            const { default: Weapons } = await import('./systems/Weapons.js');
            const { default: LongRangeScanner } = await import('./systems/LongRangeScanner.js');
            const { default: SubspaceRadioSystem } = await import('./systems/SubspaceRadioSystem.js');
            const { default: TargetComputer } = await import('./systems/TargetComputer.js');
            
            // Import gear systems
            const { default: HullPlating } = await import('./systems/HullPlating.js');
            const { default: EnergyReactor } = await import('./systems/EnergyReactor.js');
            const { default: ShieldGenerator } = await import('./systems/ShieldGenerator.js');
            
            // Get enemy system configurations
            const enemySystems = this.shipConfig.defaultSystems;
            
            // Create and add core systems (always present)
            if (enemySystems.hull_plating) {
                const hullPlating = new HullPlating(enemySystems.hull_plating.level);
                hullPlating.slotCost = enemySystems.hull_plating.slots;
                this.addSystem('hull_plating', hullPlating);
            }
            
            if (enemySystems.energy_reactor) {
                const energyReactor = new EnergyReactor(enemySystems.energy_reactor.level);
                energyReactor.slotCost = enemySystems.energy_reactor.slots;
                this.addSystem('energy_reactor', energyReactor);
            }
            
            // Add shield generator if present
            if (enemySystems.shield_generator) {
                const shieldGenerator = new ShieldGenerator(enemySystems.shield_generator.level);
                shieldGenerator.slotCost = enemySystems.shield_generator.slots;
                this.addSystem('shield_generator', shieldGenerator);
            }
            
            // Create and add combat systems
            if (enemySystems.impulse_engines) {
                const engines = new ImpulseEngines(enemySystems.impulse_engines.level);
                engines.slotCost = enemySystems.impulse_engines.slots;
                this.addSystem('impulse_engines', engines);
            }
            
            if (enemySystems.shields) {
                const shields = new Shields(enemySystems.shields.level);
                shields.slotCost = enemySystems.shields.slots;
                this.addSystem('shields', shields);
            }
            
            if (enemySystems.weapons) {
                const weapons = new Weapons(enemySystems.weapons.level);
                weapons.slotCost = enemySystems.weapons.slots;
                this.addSystem('weapons', weapons);
            }
            
            if (enemySystems.target_computer) {
                const targetComputer = new TargetComputer(enemySystems.target_computer.level);
                targetComputer.slotCost = enemySystems.target_computer.slots;
                this.addSystem('target_computer', targetComputer);
            }
            
            // Add optional systems
            if (enemySystems.subspace_radio) {
                const radio = new SubspaceRadioSystem(enemySystems.subspace_radio.level);
                radio.slotCost = enemySystems.subspace_radio.slots;
                this.addSystem('subspace_radio', radio);
            }
            
            if (enemySystems.long_range_scanner) {
                const scanner = new LongRangeScanner(enemySystems.long_range_scanner.level);
                scanner.slotCost = enemySystems.long_range_scanner.slots;
                this.addSystem('long_range_scanner', scanner);
            }
            
            // Calculate total stats from installed systems
            this.calculateTotalStats();
            
            // Set current energy and hull to maximum
            this.currentEnergy = this.maxEnergy;
            this.currentHull = this.maxHull;
            
            console.log(`Enemy ship systems initialized: ${this.systems.size} systems installed`);
            console.log('Enemy ship systems:', Array.from(this.systems.keys()));
            
        } catch (error) {
            console.error('Failed to initialize enemy ship systems:', error);
        }
    }
    
    /**
     * Add a system to the ship (simplified version of Ship.addSystem)
     */
    addSystem(systemName, system) {
        if (this.systems.has(systemName)) {
            console.warn(`System ${systemName} already exists on enemy ship`);
            return false;
        }
        
        // Check slot availability
        if (this.usedSlots + system.slotCost > this.totalSlots) {
            console.warn(`Not enough slots for ${systemName} on enemy ship`);
            return false;
        }
        
        // Add the system
        this.systems.set(systemName, system);
        this.systemRegistry.set(systemName, system);
        this.usedSlots += system.slotCost;
        this.availableSlots = this.totalSlots - this.usedSlots;
        
        // Initialize system state
        this.systemStates.set(systemName, {
            isActive: false,
            health: system.maxHealth,
            effectiveness: 1.0
        });
        
        console.log(`Enemy ship system added: ${systemName} (Level ${system.level})`);
        return true;
    }
    
    /**
     * Calculate total stats from installed systems (simplified version)
     */
    calculateTotalStats() {
        // Reset stats
        this.maxEnergy = 0;
        this.energyRechargeRate = 0;
        this.maxHull = 0;
        this.currentSpeed = 0;
        this.currentArmor = 0;
        this.currentFirepower = 0;
        this.currentCargoCapacity = 0;
        
        // Calculate stats from gear systems
        for (const [systemName, system] of this.systems) {
            if (systemName === 'hull_plating') {
                this.maxHull += system.getHullCapacity();
            } else if (systemName === 'energy_reactor') {
                this.maxEnergy += system.getEnergyCapacity();
                this.energyRechargeRate += system.getEnergyRechargeRate();
            } else if (systemName === 'shield_generator') {
                // Armor is only active when shields are up
                // This is handled in the shield system
            } else if (systemName === 'impulse_engines') {
                this.currentSpeed += system.getSpeedBonus();
            } else if (systemName === 'weapons') {
                this.currentFirepower += system.getFirepowerBonus();
            }
        }
        
        console.log(`Enemy ship stats calculated: Hull=${this.maxHull}, Energy=${this.maxEnergy}, Speed=${this.currentSpeed}, Firepower=${this.currentFirepower}`);
    }
    
    /**
     * Get system by name
     */
    getSystem(systemName) {
        return this.systems.get(systemName);
    }
    
    /**
     * Wait for systems to be fully initialized
     */
    async waitForSystemsInitialized() {
        return new Promise((resolve) => {
            const checkSystems = () => {
                if (this.systems.size > 0) {
                    resolve();
                } else {
                    setTimeout(checkSystems, 10);
                }
            };
            checkSystems();
        });
    }
    
    /**
     * Get a simplified status for enemy ships
     */
    getStatus() {
        const systemsStatus = {};
        
        for (const [systemName, system] of this.systems) {
            systemsStatus[systemName] = {
                name: system.name,
                level: system.level,
                health: system.currentHealth / system.maxHealth,
                isActive: system.isActive || false,
                isOperational: system.isOperational()
            };
        }
        
        return {
            shipType: this.shipType,
            shipName: this.shipName,
            isEnemy: true,
            diplomacy: this.diplomacy,
            hull: {
                current: this.currentHull,
                max: this.maxHull,
                percentage: this.maxHull > 0 ? this.currentHull / this.maxHull : 0
            },
            energy: {
                current: this.currentEnergy,
                max: this.maxEnergy,
                rechargeRate: this.energyRechargeRate
            },
            stats: {
                speed: this.currentSpeed,
                armor: this.currentArmor,
                firepower: this.currentFirepower,
                cargoCapacity: this.currentCargoCapacity
            },
            systems: systemsStatus,
            slots: {
                total: this.totalSlots,
                used: this.usedSlots,
                available: this.availableSlots
            }
        };
    }
    
    /**
     * Apply damage to enemy ship (simplified damage model)
     */
    applyDamage(damage, damageType = 'kinetic') {
        const result = {
            totalDamage: damage,
            hullDamage: 0,
            systemsDamaged: [],
            isDestroyed: false
        };
        
        // Simple damage model: apply damage to hull
        const actualDamage = Math.min(damage, this.currentHull);
        this.currentHull -= actualDamage;
        result.hullDamage = actualDamage;
        
        // Check if ship is destroyed
        if (this.currentHull <= 0) {
            result.isDestroyed = true;
        }
        
        // Randomly damage systems when hull is damaged
        if (actualDamage > 0 && this.systems.size > 0) {
            const systemNames = Array.from(this.systems.keys());
            const numSystemsToCheck = Math.min(2, systemNames.length);
            
            for (let i = 0; i < numSystemsToCheck; i++) {
                const randomSystem = systemNames[Math.floor(Math.random() * systemNames.length)];
                const system = this.systems.get(randomSystem);
                
                if (system && Math.random() < 0.3) { // 30% chance to damage each system
                    const systemDamage = damage * 0.1; // 10% of total damage
                    system.takeDamage(systemDamage);
                    result.systemsDamaged.push(randomSystem);
                }
            }
        }
        
        return result;
    }
    
    /**
     * Apply damage to a specific system (for sub-targeting)
     * @param {string} systemName - Name of the system to damage
     * @param {number} damage - Amount of damage to apply
     * @param {string} damageType - Type of damage
     * @returns {boolean} True if damage was applied successfully
     */
    applySubTargetDamage(systemName, damage, damageType = 'kinetic') {
        const system = this.systems.get(systemName);
        if (!system) {
            console.warn(`Cannot apply sub-target damage: system ${systemName} not found on ${this.shipName}`);
            return false;
        }
        
        const healthBefore = system.healthPercentage;
        system.takeDamage(damage);
        const healthAfter = system.healthPercentage;
        
        console.log(`🎯 Sub-target damage: ${systemName} on ${this.shipName} took ${damage.toFixed(1)} ${damageType} damage`);
        console.log(`📊 System health: ${(healthBefore * 100).toFixed(1)}% → ${(healthAfter * 100).toFixed(1)}%`);
        
        if (healthAfter === 0 && healthBefore > 0) {
            console.log(`💥 SYSTEM DESTROYED: ${systemName} on ${this.shipName} completely disabled!`);
            
            // Play success sound for destroyed sub-system (50% duration for shorter sound)
            // Try to get the weapon effects manager from the global game state
            if (window.starfieldManager?.viewManager?.getShip()?.weaponSystem?.weaponEffectsManager) {
                const effectsManager = window.starfieldManager.viewManager.getShip().weaponSystem.weaponEffectsManager;
                // Play 50% duration success sound for sub-system destruction
                effectsManager.playSuccessSound(null, 0.6, 0.5); 
                console.log(`🎉 Playing sub-system destruction success sound (50% duration)`);
            }
        }
        
        // Apply some collateral damage to ship hull (25% of system damage)
        const collateralDamage = damage * 0.25;
        this.currentHull = Math.max(0, this.currentHull - collateralDamage);
        console.log(`💥 Collateral hull damage: ${collateralDamage.toFixed(1)} (hull: ${this.currentHull.toFixed(1)}/${this.maxHull})`);
        
        // Check if ship is destroyed due to hull damage
        if (this.currentHull <= 0) {
            console.log(`🔥 ${this.shipName} DESTROYED by collateral damage!`);
            
            // Play success sound for ship destruction (full duration)
            if (window.starfieldManager?.viewManager?.getShip()?.weaponSystem?.weaponEffectsManager) {
                const effectsManager = window.starfieldManager.viewManager.getShip().weaponSystem.weaponEffectsManager;
                effectsManager.playSuccessSound(null, 0.8); // Full duration, 80% volume
                console.log(`🎉 Playing ship destruction success sound (full duration)`);
            }
            
            return { isDestroyed: true };
        }
        
        return true;
    }
} 