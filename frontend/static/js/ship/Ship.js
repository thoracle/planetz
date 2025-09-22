import { getShipConfig, validateShipConfig } from './ShipConfigs.js';
import CardSystemIntegration from './CardSystemIntegration.js';
import { CargoHoldManager } from './systems/CargoHoldManager.js';
import * as THREE from 'three';
import { debug } from '../debug.js';

/**
 * Ship class - data-driven spaceship implementation
 * Based on docs/tech_design.md and docs/spaceships_spec.md
 * Simplified: Systems consume energy from shared pool when active (no separate power grid)
 */
export default class Ship {
    constructor(shipType = 'starter_ship') {
        // Ship identification
        this.shipType = shipType;
        this.shipConfig = getShipConfig(shipType);
        
        // Ship position in 3D space (for weapon effects) - initialize without THREE dependency
        this.position = null; // Will be initialized when THREE is available
        
        // Validate configuration
        if (!validateShipConfig(this.shipConfig)) {
            throw new Error(`Invalid ship configuration for ${shipType}`);
        }
        
        // Base stats are now minimal - most stats come from installed gear
        this.baseSpeed = 0;         // Speed comes from engines
        this.baseArmor = 0;         // Armor comes from shield generators
        this.baseFirepower = 0;     // Firepower comes from weapons
        this.baseCargoCapacity = 0; // Cargo comes from cargo holds
        this.baseHardpoints = this.shipConfig.baseHardpoints;
        
        // Current calculated stats (derived from installed gear)
        this.currentSpeed = 0;
        this.currentArmor = 0;
        this.currentFirepower = 0;
        this.currentCargoCapacity = 0;

        // Initialize faction standings with varied starting values
        this.factionStandings = {
            'terran_republic_alliance': 65,  // FRIENDLY - government starts friendly
            'traders_guild': 45,             // NEUTRAL - merchants start neutral
            'scientists_consortium': 25,     // NEUTRAL - scientists start neutral
            'explorers_guild': 70,           // FRIENDLY - explorers start friendly
            'mercenary_fleet': -35           // HOSTILE - mercenaries start hostile
        };
        
        // System management
        this.systems = new Map();
        this.upgrades = new Map();
        
        // Cargo system
        this.cargoHoldManager = new CargoHoldManager(this);
        
        // System slots (still needed for installation limits)
        this.totalSlots = this.shipConfig.systemSlots;
        this.usedSlots = 0;
        this.availableSlots = this.totalSlots;
        
        // Energy management (central energy pool) - now comes from energy reactors
        this.maxEnergy = 0;         // Energy capacity comes from reactors
        this.currentEnergy = 0;
        this.energyRechargeRate = 0; // Energy recharge comes from reactors
        
        // Hull integrity - now comes from hull plating
        this.maxHull = 0;           // Hull capacity comes from hull plating
        this.currentHull = 0;
        
        // Initialize weapons system
        this.weaponSystem = null; // Will be initialized after systems are available
        
        // Initialize card system integration first
        this.cardSystemIntegration = new CardSystemIntegration(this);

        // Initialize card data and then create systems (both default and card-based)
        this.cardSystemIntegration.initializeCardData().then(async () => {
            // Now that card data is loaded, initialize default systems
            // This will check for card conflicts and only create systems that don't have cards
            this.initializeDefaultSystems();

            // Create additional systems based on installed cards
            await this.cardSystemIntegration.createSystemsFromCards();

            // Initialize cargo holds from installed cards
            this.cargoHoldManager.initializeFromCards();

            // Initialize weapons system after all systems are loaded
            await this.initializeWeaponSystem();

debug('UI', `Ship ${this.shipType} fully initialized with card-based systems`);
        }).catch(error => {
            console.error('Failed to initialize card data or create systems:', error);
            // Fallback: initialize default systems anyway
            this.initializeDefaultSystems();
        });

        // Validate system integrity after initialization is complete
        setTimeout(() => {
            this.validateSystemIntegrity();
        }, 1000); // Small delay to ensure all async operations complete

        // Install starter cards if this is a starter ship
        if (this.shipConfig.starterCards) {
            this.installStarterCards();
        }
        
        // Initialize auto-repair system
        this.autoRepairSystem = null; // Will be initialized after systems are loaded
        
debug('UTILITY', `Ship created: ${shipType} (simplified energy system)`, this.shipConfig);
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
        
debug('UTILITY', 'Default systems initialized for', this.shipType);
    }
    
    /**
     * Wait for systems to be fully initialized
     * @returns {Promise} Promise that resolves when systems are loaded
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
            const { default: StarChartsSystem } = await import('./systems/StarChartsSystem.js');
            const { default: SubspaceRadioSystem } = await import('./systems/SubspaceRadioSystem.js');
            const { default: TargetComputer } = await import('./systems/TargetComputer.js');
            
            // Import new gear systems
            const { default: HullPlating } = await import('./systems/HullPlating.js');
            const { default: EnergyReactor } = await import('./systems/EnergyReactor.js');
            const { default: ShieldGenerator } = await import('./systems/ShieldGenerator.js');
            const { default: CargoHold } = await import('./systems/CargoHold.js');
            const { default: RadarSystem } = await import('./systems/RadarSystem.js');
            
            // Get default system configurations
            const defaultSystems = this.shipConfig.defaultSystems;
            
            // Create and add default systems
            // NOTE: impulse_engines, target_computer, and energy_reactor are now created from cards
            
            if (defaultSystems.warp_drive) {
                const warpDrive = new WarpDrive(defaultSystems.warp_drive.level);
                // Override slot cost from ship configuration
                warpDrive.slotCost = defaultSystems.warp_drive.slots;
                this.addSystem('warp_drive', warpDrive);
            }
            
            if (defaultSystems.shields) {
                const shields = new Shields(defaultSystems.shields.level);
                // Override slot cost from ship configuration
                shields.slotCost = defaultSystems.shields.slots;
                this.addSystem('shields', shields);
            }
            
            if (defaultSystems.weapons) {
                const weapons = new Weapons(defaultSystems.weapons.level);
                // Override slot cost from ship configuration
                weapons.slotCost = defaultSystems.weapons.slots;
                this.addSystem('weapons', weapons);
            }
            
            // Skip long_range_scanner if it will be created from cards
            if (defaultSystems.long_range_scanner && !this.hasSystemFromCards('long_range_scanner')) {
                const scanner = new LongRangeScanner(defaultSystems.long_range_scanner.level);
                // Override slot cost from ship configuration
                scanner.slotCost = defaultSystems.long_range_scanner.slots;
                this.addSystem('long_range_scanner', scanner, 'Ship.initDefault');
            } else if (defaultSystems.long_range_scanner) {
                debug('SYSTEM_FLOW', `⏭️ Skipping long_range_scanner creation (will be created from cards)`);
            }
            
            if (defaultSystems.subspace_radio) {
                const radio = new SubspaceRadioSystem(defaultSystems.subspace_radio.level);
                // Override slot cost from ship configuration
                radio.slotCost = defaultSystems.subspace_radio.slots;
                this.addSystem('subspace_radio', radio);
            }
            
            if (defaultSystems.galactic_chart) {
                const galacticChart = new GalacticChartSystem(defaultSystems.galactic_chart.level);
                // Override slot cost from ship configuration
                galacticChart.slotCost = defaultSystems.galactic_chart.slots;
                this.addSystem('galactic_chart', galacticChart);
            }
            
            // Skip star_charts if it will be created from cards
            debug('SYSTEM_FLOW', `🏗️ Initializing star_charts system`);
            if (defaultSystems.star_charts && !this.hasSystemFromCards('star_charts')) {
                debug('SYSTEM_FLOW', `🚀 Creating star_charts from default config`);
                const starCharts = new StarChartsSystem(defaultSystems.star_charts.level);
                // Override slot cost from ship configuration
                starCharts.slotCost = defaultSystems.star_charts.slots;
                this.addSystem('star_charts', starCharts, 'Ship.initDefault');
            } else {
                debug('SYSTEM_FLOW', `⏭️ Skipping star_charts creation (will be created from cards)`);
            }
            
            // Add new gear systems that provide base ship stats
            // Skip hull_plating if it will be created from cards
            debug('SYSTEM_FLOW', `🏗️ Initializing hull_plating system`);
            if (defaultSystems.hull_plating && !this.hasSystemFromCards('hull_plating')) {
                debug('SYSTEM_FLOW', `🚀 Creating hull_plating from default config`);
                const hullPlating = new HullPlating(defaultSystems.hull_plating.level);
                hullPlating.slotCost = defaultSystems.hull_plating.slots;
                this.addSystem('hull_plating', hullPlating, 'Ship.initDefault');
            } else {
                debug('SYSTEM_FLOW', `⏭️ Skipping hull_plating creation (will be created from cards)`);
            }
            
            if (defaultSystems.shield_generator) {
                const shieldGenerator = new ShieldGenerator(defaultSystems.shield_generator.level);
                shieldGenerator.slotCost = defaultSystems.shield_generator.slots;
                this.addSystem('shield_generator', shieldGenerator);
            }
            
            if (defaultSystems.cargo_hold) {
                const cargoHold = new CargoHold(defaultSystems.cargo_hold.level);
                cargoHold.slotCost = defaultSystems.cargo_hold.slots;
                this.addSystem('cargo_hold', cargoHold);
            }
            
            // Radar system is card-based only, no default system
            // It will be initialized when radar cards are installed
            
debug('UTILITY', `Initialized ${this.systems.size} default systems for ${this.shipType}`);
            
            // Initialize auto-repair system after systems are loaded
            const { default: AutoRepairSystem } = await import('./AutoRepairSystem.js');
            this.autoRepairSystem = new AutoRepairSystem(this);
            
        } catch (error) {
            console.error('Error initializing default systems:', error);
        }
    }
    
    /**
     * Calculate total stats from installed gear/systems
     */
    calculateTotalStats() {
        // Reset stats to base (minimal) values
        let totalSpeed = this.baseSpeed;
        let totalArmor = this.baseArmor;
        let totalFirepower = this.baseFirepower;
        let totalCargoCapacity = this.baseCargoCapacity;
        let totalEnergyCapacity = 0;
        let totalEnergyRechargeRate = 0;
        let totalHullCapacity = 0;
        
        // Sum stats from all installed systems/gear
        for (let [systemName, system] of this.systems) {
            if (typeof system.isOperational === 'function' ? system.isOperational() : system.isOperational) {
                // Add base stats provided by each system
                if (system.getBaseSpeed) {
                    totalSpeed += system.getBaseSpeed();
                }
                if (system.getArmorBonus) {
                    totalArmor += system.getArmorBonus();
                }
                if (system.getBaseFirepower) {
                    totalFirepower += system.getBaseFirepower();
                }
                if (system.getCargoCapacity) {
                    totalCargoCapacity += system.getCargoCapacity();
                }
                if (system.getEnergyCapacity) {
                    totalEnergyCapacity += system.getEnergyCapacity();
                }
                if (system.getEnergyRechargeRate) {
                    totalEnergyRechargeRate += system.getEnergyRechargeRate();
                }
                if (system.getHullCapacity) {
                    totalHullCapacity += system.getHullCapacity();
                }
            }
        }
        
        // Apply upgrade modifications (if any)
        for (let [upgradeName, upgrade] of this.upgrades) {
            if (upgrade.isInstalled) {
                const stats = upgrade.stats;
                totalSpeed *= (1 + (stats.speed || 0));
                totalArmor *= (1 + (stats.armor || 0));
                totalFirepower *= (1 + (stats.firepower || 0));
                totalCargoCapacity *= (1 + (stats.cargo || 0));
            }
        }
        
        // Update ship stats
        this.currentSpeed = totalSpeed;
        this.currentArmor = totalArmor;
        this.currentFirepower = totalFirepower;
        this.currentCargoCapacity = totalCargoCapacity;
        
        // Update energy and hull stats
        const oldMaxEnergy = this.maxEnergy;
        const oldMaxHull = this.maxHull;
        
        this.maxEnergy = totalEnergyCapacity;
        this.energyRechargeRate = totalEnergyRechargeRate;
        this.maxHull = totalHullCapacity;
        
        // Adjust current energy and hull if maximums changed
        if (oldMaxEnergy !== this.maxEnergy) {
            // Scale current energy proportionally if max changed
            if (oldMaxEnergy > 0) {
                const energyRatio = this.currentEnergy / oldMaxEnergy;
                this.currentEnergy = this.maxEnergy * energyRatio;
            } else {
                this.currentEnergy = this.maxEnergy; // Start with full energy
            }
        }
        
        if (oldMaxHull !== this.maxHull) {
            // Scale current hull proportionally if max changed
            if (oldMaxHull > 0) {
                const hullRatio = this.currentHull / oldMaxHull;
                this.currentHull = this.maxHull * hullRatio;
            } else {
                this.currentHull = this.maxHull; // Start with full hull
            }
        }
        
        return {
            speed: this.currentSpeed,
            armor: this.currentArmor,
            firepower: this.currentFirepower,
            cargo: this.currentCargoCapacity,
            maxEnergy: this.maxEnergy,
            energyRechargeRate: this.energyRechargeRate,
            maxHull: this.maxHull
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
debug('COMBAT', `Shields absorbed ${(damage - actualDamageToHull).toFixed(1)} damage`);
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
        
debug('COMBAT', `Ship took ${damage} ${damageType} damage. Hull damage: ${actualDamageToHull.toFixed(1)}. Hull: ${this.currentHull}/${this.maxHull}`);
    }
    
    /**
     * Apply damage to random systems
     * @param {number} damage - Base damage amount
     * @param {string} damageType - Type of damage
     */
    applySystemDamage(damage, damageType) {
        // 5% chance of system damage per hull hit (from spaceships_spec.md)
        if (Math.random() < 0.05) {
            // Filter to only include operational (non-destroyed) systems
            const allSystemNames = Array.from(this.systems.keys());
            const operationalSystems = allSystemNames.filter(systemName => {
                const system = this.systems.get(systemName);
                return system && system.currentHealth > 0; // Only target systems that aren't destroyed
            });
            
            if (operationalSystems.length > 0) {
                const randomSystem = operationalSystems[Math.floor(Math.random() * operationalSystems.length)];
                const system = this.systems.get(randomSystem);
                
                // 10-20% damage to specific system
                const systemDamage = damage * (0.1 + Math.random() * 0.1);
                system.takeDamage(systemDamage);
                
debug('COMBAT', `System damage: ${randomSystem} took ${systemDamage.toFixed(1)} damage`);
            } else {
debug('COMBAT', `System damage: No operational systems available for random damage`);
            }
        }
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
            console.warn(`Cannot apply sub-target damage: system ${systemName} not found`);
            return false;
        }
        
        const healthBefore = system.healthPercentage;
        system.takeDamage(damage);
        const healthAfter = system.healthPercentage;
        
debug('TARGETING', `Sub-target damage: ${systemName} took ${damage.toFixed(1)} ${damageType} damage`);
debug('UTILITY', `System health: ${(healthBefore * 100).toFixed(1)}% → ${(healthAfter * 100).toFixed(1)}%`);
        
        if (healthAfter === 0 && healthBefore > 0) {
debug('UTILITY', `System ${systemName} DESTROYED!`);
        }
        
        // Recalculate stats after system damage
        this.calculateTotalStats();
        
        return true;
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
debug('AI', `Repaired ${systemName} by ${(repairAmount * 100).toFixed(1)}%`);
        }
    }
    
    /**
     * Add a system to the ship
     * @param {string} systemName - System identifier
     * @param {System} system - System instance
     */
    addSystem(systemName, system, source = 'unknown') {
        const callerInfo = new Error().stack.split('\n')[2]?.trim() || 'unknown';
        const uniqueId = `${source}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        debug('SYSTEM_FLOW', `⚙️ [${uniqueId}] Attempting to add system: ${systemName} from ${source} (caller: ${callerInfo})`);

        // Check if system already exists (prevent duplicates)
        if (this.systems.has(systemName)) {
            debug('P1', `System ${systemName} already exists - skipping duplicate addition`);
            debug('SYSTEM_FLOW', `❌ DUPLICATE [${uniqueId}]: ${systemName} already exists, rejecting addition from ${source}`);

            // Log existing system info for debugging
            const existingSystem = this.systems.get(systemName);
            debug('SYSTEM_FLOW', `📋 Existing system: ${systemName}, level: ${existingSystem.level || 'unknown'}`);

            return false;
        }
        
        // Check slot capacity
        if (this.usedSlots + system.slotCost > this.totalSlots) {
            debug('P1', `Cannot add ${systemName}: insufficient slots (${system.slotCost} needed, ${this.availableSlots} available)`);
            return false;
        }
        
        // Add the system
        this.systems.set(systemName, system);
        debug('SYSTEM_FLOW', `✅ SUCCESS [${uniqueId}]: ${systemName} added to ship systems from ${source}`);

        // Set ship reference on the system if it has a setShip method
        if (typeof system.setShip === 'function') {
            system.setShip(this);
            debug('SYSTEM_FLOW', `🔗 Ship reference set on ${systemName}`);
        }

        // Update slot usage
        this.usedSlots += system.slotCost;
        this.availableSlots = this.totalSlots - this.usedSlots;

        // Pass StarfieldManager reference if available
        if (this.starfieldManager && typeof system.setStarfieldManager === 'function') {
            system.setStarfieldManager(this.starfieldManager);
        }
        
        // Calculate total stats
        this.calculateTotalStats();
        
        return true;
    }

    /**
     * Validate system creation integrity (for debugging P1 errors)
     */
    validateSystemIntegrity() {
        const systemCounts = {};
        const duplicateSystems = [];

        // Count occurrences of each system type in creation logs
        // This is a simple validation method

        debug('SYSTEM_FLOW', `🔍 System integrity check: ${this.systems.size} total systems`);

        for (const [systemName, system] of this.systems) {
            debug('SYSTEM_FLOW', `📋 System: ${systemName}, level: ${system.level || 'unknown'}`);
        }

        return {
            totalSystems: this.systems.size,
            duplicateSystems: duplicateSystems
        };
    }

    /**
     * Check if a system should be created from cards instead of during initialization
     * @param {string} systemName - Name of the system to check
     * @returns {boolean} True if system has cards and should be created from cards
     */
    hasSystemFromCards(systemName) {
        debug('SYSTEM_FLOW', `🔍 Checking if ${systemName} should be created from cards`);

        if (!this.cardSystemIntegration) {
            debug('SYSTEM_FLOW', `❌ No CardSystemIntegration available for ${systemName}`);
            return false;
        }

        // Delegate to CardSystemIntegration to check
        const result = this.cardSystemIntegration.hasCardsForSystem(systemName);
        debug('SYSTEM_FLOW', `📋 ${systemName} card check result: ${result}`);
        return result;
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
            
            // Recalculate ship stats after removing system
            this.calculateTotalStats();
            
debug('UTILITY', `Removed system: ${systemName} (${this.usedSlots}/${this.totalSlots} slots used)`);
            return true;
        }
        return false;
    }
    
    /**
     * Get current ship status
     * @param {boolean} filterByCards - If true, only include systems with required cards
     */
    getStatus(filterByCards = false) {
        // Build systems status information
        const systemsStatus = {};
        for (const [systemName, system] of this.systems) {
            // If filtering by cards, check if system has required cards
            if (filterByCards && !this.hasSystemCardsSync(systemName)) {
                continue; // Skip systems without required cards
            }
            
            systemsStatus[systemName] = {
                health: system.healthPercentage,
                isActive: system.isActive,
                canBeActivated: typeof system.isOperational === 'function' ? system.isOperational() : system.isOperational,
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
            systemCount: Object.keys(systemsStatus).length // Count filtered systems
        };
    }
    
    /**
     * Get ship status with only card-enabled systems
     * @returns {Object} - Ship status with only systems that have required cards
     */
    getCardFilteredStatus() {
        return this.getStatus(true);
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
        
        // Update auto-repair system
        if (this.autoRepairSystem) {
            this.autoRepairSystem.update(deltaTime);
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
            if ((typeof system.isOperational === 'function' ? system.isOperational() : system.isOperational) && system.getEnergyConsumptionRate) {
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
     * Install starter cards for new players
     */
    async installStarterCards() {
        if (!this.cardSystemIntegration || !this.shipConfig.starterCards) {
            return;
        }
        
debug('UI', 'Installing starter cards for new player...');
        
        // Wait a bit for card system to be ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
            // Import CardInventoryUI to create cards
            const { default: CardInventoryUI } = await import('../ui/CardInventoryUI.js');
            
            // Create a temporary card inventory to generate cards
            const tempInventory = new CardInventoryUI(null);
            
            // Install each starter card
            for (const [slotId, cardData] of Object.entries(this.shipConfig.starterCards)) {
                try {
                    // Generate the card
                    const card = tempInventory.inventory.generateSpecificCard(cardData.cardType, 'common');
                    card.level = cardData.level;
                    
                    // Install to ship slot (we'll create a simple slot system for starter ships)
                    if (!this.starterCardSlots) {
                        this.starterCardSlots = new Map();
                    }
                    
                    this.starterCardSlots.set(slotId, card);
debug('UI', `Installed starter card: ${card.name} (Level ${card.level}) to slot ${slotId}`);
                    
                } catch (error) {
                    console.error(`Failed to install starter card ${cardData.cardType}:`, error);
                }
            }
            
            // Update card system integration
            if (this.cardSystemIntegration) {
                await this.cardSystemIntegration.initializeCardData();
            }
            
debug('UI', 'Starter cards installation complete');
            
        } catch (error) {
            console.error('Failed to install starter cards:', error);
        }
    }

    /**
     * Check if system has required cards (enhanced for starter ships)
     */
    async hasSystemCards(systemName) {
        // For starter ships, check both regular card system and starter cards
        if (this.starterCardSlots && this.starterCardSlots.size > 0) {
            // Check if any starter card enables this system
            for (const [slotId, card] of this.starterCardSlots) {
                if (this.cardEnablesSystem(card, systemName)) {
                    return true;
                }
            }
        }
        
        // Check regular card system
        if (this.cardSystemIntegration) {
            try {
                return await this.cardSystemIntegration.hasSystemCards(systemName);
            } catch (error) {
                console.error(`Error checking system cards for ${systemName}:`, error);
            }
        }
        
        // For non-card ships, assume all systems are available
        return true;
    }
    
    /**
     * Synchronous check if system has required cards (uses cached data)
     * @param {string} systemName - Name of the system
     * @param {boolean} enableLogging - Whether to log debug information
     * @returns {boolean} - True if system has required cards
     */
    hasSystemCardsSync(systemName, enableLogging = false) {
        if (!this.cardSystemIntegration) {
            // No card system integration, assume all systems are available (fallback)
            return true;
        }
        
        // Check if this system is enabled by starter cards first
        if (this.shipConfig?.starterCards) {
            for (const card of Object.values(this.shipConfig.starterCards)) {
                if (this.cardEnablesSystem(card, systemName)) {
                    return true;
                }
            }
        }
        
        // Use the card integration system for card-based checks
        const result = this.cardSystemIntegration.hasSystemCardsSync(systemName);
        
        // Optional logging when explicitly requested
        if (enableLogging && !result.hasCards && result.missingCards.length > 0) {
debug('UI', `📋 Card Check: ${systemName} missing [${result.missingCards.join(', ')}]`);
        }
        
        return result.hasCards;
    }
    
    /**
     * Debug method to check and log card status for a system
     * @param {string} systemName - Name of the system to check
     * @returns {Object} - Detailed card check result
     */
    debugSystemCards(systemName) {
        if (!this.cardSystemIntegration) {

            return { hasCards: true, reason: 'no_card_system' };
        }
        
        // Check starter cards first
        if (this.shipConfig?.starterCards) {
            for (const card of Object.values(this.shipConfig.starterCards)) {
                if (this.cardEnablesSystem(card, systemName)) {
    
                    return { hasCards: true, reason: 'starter_card', card: card.cardType };
                }
            }
        }
        
        // Check installed cards
        const result = this.cardSystemIntegration.hasSystemCardsSync(systemName);
        if (result.hasCards) {
            
        } else {
            
        }
        
        return result;
    }
    
    /**
     * Check if a card enables a specific system
     */
    cardEnablesSystem(card, systemName) {
        if (!card || !card.cardType) return false;
        
        // Map card types to system names
        const cardToSystemMap = {
            'target_computer': 'target_computer',
            'impulse_engines': 'impulse_engines',
            'energy_reactor': 'energy_reactor',
            'subspace_radio': 'subspace_radio',
            'long_range_scanner': 'long_range_scanner',
            'galactic_chart': 'galactic_chart',
            'star_charts': 'star_charts',
            'basic_radar': 'radar',
            'advanced_radar': 'radar',
            'tactical_radar': 'radar',
            // Weapon cards - support both consolidated AND individual systems
            'laser_cannon': ['weapons', 'laser_cannon'],  // Enable both consolidated and individual
            'plasma_cannon': ['weapons', 'plasma_cannon'],
            'pulse_cannon': ['weapons', 'pulse_cannon'],
            'phaser_array': ['weapons', 'phaser_array'],
            'disruptor_cannon': ['weapons', 'disruptor_cannon'],
            'particle_beam': ['weapons', 'particle_beam'],
            'standard_missile': ['weapons', 'standard_missile'],
            'homing_missile': ['weapons', 'homing_missile'],
            'photon_torpedo': ['weapons', 'photon_torpedo'],
            'proximity_mine': ['weapons', 'proximity_mine']
        };
        
        const enabledSystems = cardToSystemMap[card.cardType];
        
        // Handle arrays (weapon cards that enable multiple systems)
        if (Array.isArray(enabledSystems)) {
            return enabledSystems.includes(systemName);
        }
        
        // Handle single system mapping (non-weapon cards)
        return enabledSystems === systemName;
    }

    /**
     * Get system effectiveness based on installed cards
     * @param {string} systemName - Name of the system
     * @returns {number} - Effectiveness multiplier (0.0 to 3.0)
     */
    getSystemCardEffectiveness(systemName) {
        return this.cardSystemIntegration.getSystemEffectiveness(systemName);
    }

    /**
     * Get detailed card status for a system
     * @param {string} systemName - Name of the system
     * @returns {Object} - Detailed system card status
     */
    getSystemCardStatus(systemName) {
        return this.cardSystemIntegration.getSystemStatus(systemName);
    }

    /**
     * Set the card inventory UI reference for integration
     * @param {CardInventoryUI} cardInventoryUI - Reference to the card inventory UI
     */
    setCardInventoryUI(cardInventoryUI) {
        this.cardSystemIntegration.setCardInventoryUI(cardInventoryUI);
    }
    
    /**
     * Get the warp drive system
     * @returns {WarpDrive|null} The warp drive system or null if not available
     */
    getWarpDrive() {
        return this.getSystem('warp_drive');
    }
    
    /**
     * Initialize the weapon system using unified WeaponSyncManager approach
     * @returns {Promise} Promise that resolves when weapon system is initialized
     */
    async initializeWeaponSystem() {
        try {
debug('COMBAT', '🔫 Ship: Starting weapon system initialization...');
            
            // Import WeaponSyncManager
            const { default: WeaponSyncManager } = await import('./WeaponSyncManager.js');
            
            // Create and use the unified weapon sync manager
            this.weaponSyncManager = new WeaponSyncManager(this);
            
            // Enable debug mode for testing
            this.weaponSyncManager.setDebugMode(true);
            
            // Initialize weapons using unified approach
            this.weaponSystem = await this.weaponSyncManager.initializeWeapons();
            
debug('COMBAT', '🔫 Ship: Weapon system initialized successfully using WeaponSyncManager');
            
            // Notify StarfieldManager that weapon system is ready
            if (this.starfieldManager && typeof this.starfieldManager.onWeaponSystemReady === 'function') {
debug('COMBAT', '🔫 Ship: Calling onWeaponSystemReady callback...');
                this.starfieldManager.onWeaponSystemReady();
            } else {
                console.warn('🔫 Ship: StarfieldManager callback not available:', {
                    hasStarfieldManager: !!this.starfieldManager,
                    hasCallback: !!(this.starfieldManager && typeof this.starfieldManager.onWeaponSystemReady === 'function')
                });
            }
            
        } catch (error) {
            console.error('🔫 Ship: Failed to initialize weapon system:', error);
        }
    }
    
    /**
     * Get the weapon system
     * @returns {WeaponSystemCore|null} The weapon system or null if not available
     */
    getWeaponSystem() {
        return this.weaponSystem;
    }
    
    /**
     * Get the weapon sync manager for debugging and advanced configuration
     * @returns {WeaponSyncManager|null} The weapon sync manager or null if not available
     */
    getWeaponSyncManager() {
        return this.weaponSyncManager;
    }

    /**
     * Set the StarfieldManager reference for HUD error display
     * @param {StarfieldManager} starfieldManager The StarfieldManager instance
     */
    setStarfieldManager(starfieldManager) {
        this.starfieldManager = starfieldManager;
        
        // Pass the reference to all existing systems
        for (const [systemName, system] of this.systems) {
            if (system && typeof system.setStarfieldManager === 'function') {
                system.setStarfieldManager(starfieldManager);
            }
        }
        
debug('UTILITY', 'StarfieldManager reference set for ship and all systems');
    }

    /**
     * Get the StarfieldManager reference
     * @returns {StarfieldManager|null} The StarfieldManager instance or null
     */
    getStarfieldManager() {
        return this.starfieldManager || null;
    }

    /**
     * Simple boolean check if system has required cards (convenience method)
     * @param {string} systemName - Name of the system
     * @returns {boolean} - True if system has required cards or no card system integration
     */
    hasSystemCards(systemName) {
        if (!this.cardSystemIntegration) {
            // No card system integration, assume all systems are available
            return true;
        }
        
        // Check if this system is enabled by starter cards first
        if (this.shipConfig?.starterCards) {
            for (const card of Object.values(this.shipConfig.starterCards)) {
                if (this.cardEnablesSystem(card, systemName)) {
                    return true;
                }
            }
        }
        
        try {
            const result = this.cardSystemIntegration.hasSystemCardsSync(systemName);
            return result && result.hasCards;
        } catch (error) {
            console.warn(`Error checking system cards for ${systemName}:`, error);
            return false;
        }
    }
} 