/**
 * Ship configurations for different ship types
 * Based on docs/spaceships_spec.md
 * Simplified: Energy-only system (no separate power grid)
 */

export const SHIP_CONFIGS = {
    starter_ship: {
        name: 'Starter Ship',
        description: 'Basic training vessel with essential systems',
        
        // Base stats - Very basic
        baseSpeed: 30,         // Low (30/100)
        baseArmor: 20,         // Very Low (20/100)
        baseFirepower: 20,     // Very Low (20/100)
        baseCargoCapacity: 5,  // Minimal (5 units)
        baseHardpoints: 3,     // Minimal (3 hard points)
        
        // Energy system - Basic
        maxEnergy: 1000,       // Small energy pool
        energyRechargeRate: 20, // Slow recharge rate
        
        // Hull - Light construction
        maxHull: 300,          // Very low hull hit points
        
        // System slots - Minimal but expandable
        systemSlots: 9,        // Updated for 4 weapon slots testing (was 6)
        
        // System slot allocations
        slotConfig: {
            engines: 1,        // Basic impulse engines
            reactor: 1,         // Basic energy reactor
            weapons: 4,         // 4 weapon slots for testing (matches starter cards)
            utility: 3,         // Standard utility slots
            // Total slots: 9 (1 engine + 1 reactor + 4 weapons + 3 utility = 9)
        },
        
        // Default system configurations - Starter optimized
        defaultSystems: {
            // Essential operational systems only (systems that have corresponding cards)
            energy_reactor: {
                level: 1, // Level 1 = 1000 energy, 10/sec recharge (1 * 1000, 1 * 10)
                slots: 1
            },
            impulse_engines: { 
                level: 1, // Level 1 = 15 speed (1 * 15) - basic engines
                slots: 1, 
                energyConsumption: 8 // Low consumption for starter ship
            },
            target_computer: { 
                level: 1, // Level 1 = basic targeting (no sub-targeting)
                slots: 1, 
                energyConsumption: 3 // Minimal consumption
            }
            // Removed laser_cannon - weapons now come from starterCards via WeaponSyncManager
            // No galactic chart or subspace radio - must be acquired from shop
        },
        
        // Pre-installed starter cards
        starterCards: {
            utility_1: { cardType: 'target_computer', level: 1 },
            engine_1: { cardType: 'impulse_engines', level: 1 },
            power_1: { cardType: 'energy_reactor', level: 1 },
            weapon_1: { cardType: 'laser_cannon', level: 1 },
            weapon_2: { cardType: 'pulse_cannon', level: 1 },
            weapon_3: { cardType: 'plasma_cannon', level: 1 },
            weapon_4: { cardType: 'phaser_array', level: 1 }
            // Added 4 different weapons for testing the weapon system
            // Removed galactic_chart card - player must acquire from shop
            // Removed radio_1 - player must acquire subspace radio cards from the shop
        }
    },
    
    heavy_fighter: {
        name: 'Heavy Fighter',
        description: 'Durable combat ship for prolonged engagements',
        
        // Base stats (from spaceships_spec.md)
        baseSpeed: 50,         // Medium-Low (50/100)
        baseArmor: 80,         // High (80/100)
        baseFirepower: 80,     // High (80/100)
        baseCargoCapacity: 15, // Low (15 units)
        baseHardpoints: 8,     // Medium (8 hard points)
        
        // Energy system (simplified - no separate power grid)
        maxEnergy: 5000,       // Energy pool for all systems
        energyRechargeRate: 50, // Energy per second
        
        // Hull
        maxHull: 1000,         // Hull hit points
        
        // System slots (increased to accommodate future systems)
        systemSlots: 18,       // Available system slots
        
        // System slot allocations (for reference) - SIMPLIFIED: All systems take 1 slot
        slotConfig: {
            engines: 1,        // Impulse engines
            warpDrive: 1,       // Warp drive
            shields: 1,         // Deflector shield generator
            weapons: 4,         // Maximum weapons for heavy combat role
            missileTubes: 1,    // Missile tubes (now included for cooldown testing)
            scanner: 1,         // Long range scanner
            radio: 1,           // Subspace radio
            galacticChart: 1,   // Galactic chart
            targetComputer: 1,  // Target computer
            // Available slots: 6 (18 total - 12 used = 6 free for future systems)
        },
        
        // Default system configurations (energy consumption per second when active)
        // SIMPLIFIED: All systems take exactly 1 slot
        defaultSystems: {
            // Core ship systems that provide base stats
            hull_plating: {
                level: 5, // Level 5 = 1000 hull (5 * 200)
                slots: 1
            },
            energy_reactor: {
                level: 5, // Level 5 = 5000 energy, 50/sec recharge (5 * 1000, 5 * 10)
                slots: 1
            },
            shield_generator: {
                level: 6, // Level 6 = 90 armor when active (6 * 15) - close to target 80
                slots: 1,
                energyConsumption: 30 // 6 * 5 energy per second when active
            },
            cargo_hold: {
                level: 2, // Level 2 = 20 cargo units (2 * 10) - close to target 15
                slots: 1
            },
            
            // Operational systems
            impulse_engines: { 
                level: 4, // Level 4 = 60 speed (4 * 15) - close to target 50
                slots: 1, 
                energyConsumption: 20 // Energy per second when maneuvering
            },
            warp_drive: { 
                level: 1, 
                slots: 1, 
                energyConsumption: 0 // Uses energy per warp (handled separately)
            },
            shields: { 
                level: 1, 
                slots: 1, 
                energyConsumption: 25 // Energy per second when active
            },
            laser_cannon: { 
                level: 7, // Level 7 = 84 firepower (7 * 12) - close to target 80
                slots: 1, 
                energyConsumption: 0 // Uses energy per shot (handled separately)
            },
            long_range_scanner: { 
                level: 1, 
                slots: 1, 
                energyConsumption: 5 // Energy per second when scanning
            },
            subspace_radio: { 
                level: 1, 
                slots: 1, 
                energyConsumption: 6 // Energy per second when transmitting
            },
            galactic_chart: { 
                level: 1, 
                slots: 1, 
                energyConsumption: 8 // Energy per second when active
            },
            target_computer: { 
                level: 3, // Level 3+ enables sub-targeting functionality
                slots: 1, 
                energyConsumption: 8 // Energy per second when active
            },
            missile_tubes: {
                level: 1, // Level 1 missile tubes for testing cooldown system
                slots: 1,
                energyConsumption: 0 // Uses cooldown instead of energy per shot
            }
        }
    },
    
    scout: {
        name: 'Scout',
        description: 'Fast reconnaissance ship with advanced sensors',
        
        // Base stats - High speed, low armor, minimal cargo
        baseSpeed: 90,         // Very High (90/100)
        baseArmor: 30,         // Low (30/100)
        baseFirepower: 40,     // Low-Medium (40/100)
        baseCargoCapacity: 8,  // Very Low (8 units)
        baseHardpoints: 4,     // Low (4 hard points)
        
        // Energy system - Efficient but smaller capacity
        maxEnergy: 3500,       // Smaller energy pool
        energyRechargeRate: 60, // Fast recharge rate
        
        // Hull - Light construction
        maxHull: 500,          // Low hull hit points
        
        // System slots - Adequate slots for core systems plus expansion
        systemSlots: 15,       // Increased for better expansion capability
        
        // System slot allocations
        slotConfig: {
            engines: 1,        // Impulse engines (high performance)
            warpDrive: 1,       // Warp drive
            shields: 1,         // Light shields
            weapons: 2,         // Fewer weapons - reconnaissance focused
            scanner: 1,         // Enhanced long range scanner
            radio: 1,           // Subspace radio
            galacticChart: 1,   // Galactic chart
            targetComputer: 1,  // Target computer
            // Available slots: 6 (15 total - 9 used = 6 free)
        },
        
        // Default system configurations - Scout optimized
        defaultSystems: {
            // Core ship systems that provide base stats
            hull_plating: {
                level: 3, // Level 3 = 600 hull (3 * 200) - light construction
                slots: 1
            },
            energy_reactor: {
                level: 4, // Level 4 = 4000 energy, 40/sec recharge (4 * 1000, 4 * 10)
                slots: 1
            },
            shield_generator: {
                level: 2, // Level 2 = 30 armor when active (2 * 15) - matches target 30
                slots: 1,
                energyConsumption: 10 // 2 * 5 energy per second when active
            },
            cargo_hold: {
                level: 1, // Level 1 = 10 cargo units (1 * 10) - close to target 8
                slots: 1
            },
            
            // Operational systems
            impulse_engines: { 
                level: 2,       // Higher level engines for speed
                slots: 1, 
                energyConsumption: 15 // More efficient engines
            },
            warp_drive: { 
                level: 2,       // Better warp capability
                slots: 1, 
                energyConsumption: 0
            },
            shields: { 
                level: 1,       // Basic shields
                slots: 1, 
                energyConsumption: 15 // Lower energy consumption
            },
            pulse_cannon: { 
                level: 1,       // Basic pulse cannon - faster firing, lower damage
                slots: 1, 
                energyConsumption: 0
            },
            long_range_scanner: { 
                level: 3,       // Enhanced scanner for reconnaissance
                slots: 1, 
                energyConsumption: 3 // Very efficient scanning
            },
            subspace_radio: { 
                level: 2,       // Better communication range
                slots: 1, 
                energyConsumption: 4
            },
            galactic_chart: { 
                level: 2,       // Enhanced navigation
                slots: 1, 
                energyConsumption: 5
            },
            target_computer: { 
                level: 3,       // Level 3+ enables sub-targeting functionality
                slots: 1, 
                energyConsumption: 6
            }
        }
    },
    
    light_fighter: {
        name: 'Light Fighter',
        description: 'Balanced combat ship for patrol and escort duties',
        
        // Base stats - Balanced for combat
        baseSpeed: 70,         // High (70/100)
        baseArmor: 50,         // Medium (50/100)
        baseFirepower: 60,     // Medium-High (60/100)
        baseCargoCapacity: 12, // Low (12 units)
        baseHardpoints: 6,     // Medium-Low (6 hard points)
        
        // Energy system - Balanced
        maxEnergy: 4000,       // Medium energy pool
        energyRechargeRate: 55, // Good recharge rate
        
        // Hull - Medium construction
        maxHull: 700,          // Medium hull hit points
        
        // System slots - Balanced allocation with good expansion
        systemSlots: 18,       // Increased for better expansion capability
        
        // System slot allocations
        slotConfig: {
            engines: 1,        // Impulse engines
            warpDrive: 1,       // Warp drive
            shields: 1,         // Medium shields
            weapons: 3,         // Good combat capability but not maximum
            scanner: 1,         // Long range scanner
            radio: 1,           // Subspace radio
            galacticChart: 1,   // Galactic chart
            targetComputer: 1,  // Target computer
            // Available slots: 8 (18 total - 10 used = 8 free)
        },
        
        // Default system configurations - Combat balanced
        defaultSystems: {
            // Core ship systems that provide base stats
            hull_plating: {
                level: 4, // Level 4 = 800 hull (4 * 200) - medium construction
                slots: 1
            },
            energy_reactor: {
                level: 4, // Level 4 = 4000 energy, 40/sec recharge (4 * 1000, 4 * 10)
                slots: 1
            },
            shield_generator: {
                level: 3, // Level 3 = 45 armor when active (3 * 15) - close to target 50
                slots: 1,
                energyConsumption: 15 // 3 * 5 energy per second when active
            },
            cargo_hold: {
                level: 1, // Level 1 = 10 cargo units (1 * 10) - close to target 12
                slots: 1
            },
            
            // Operational systems
            impulse_engines: { 
                level: 1, 
                slots: 1, 
                energyConsumption: 18
            },
            warp_drive: { 
                level: 1, 
                slots: 1, 
                energyConsumption: 0
            },
            shields: { 
                level: 2,       // Better shields than scout
                slots: 1, 
                energyConsumption: 20
            },
            plasma_cannon: { 
                level: 2,       // Enhanced plasma cannon - balanced damage and efficiency
                slots: 1, 
                energyConsumption: 0
            },
            long_range_scanner: { 
                level: 1, 
                slots: 1, 
                energyConsumption: 5
            },
            subspace_radio: { 
                level: 1, 
                slots: 1, 
                energyConsumption: 6
            },
            galactic_chart: { 
                level: 1, 
                slots: 1, 
                energyConsumption: 8
            },
            target_computer: { 
                level: 3,       // Level 3+ enables sub-targeting functionality
                slots: 1, 
                energyConsumption: 7
            }
        }
    },
    
    light_freighter: {
        name: 'Light Freighter',
        description: 'Cargo transport with basic defensive capabilities',
        
        // Base stats - Cargo focused
        baseSpeed: 40,         // Low (40/100)
        baseArmor: 60,         // Medium-High (60/100)
        baseFirepower: 30,     // Low (30/100)
        baseCargoCapacity: 50, // High (50 units)
        baseHardpoints: 6,     // Medium-Low (6 hard points)
        
        // Energy system - Larger capacity for cargo systems
        maxEnergy: 6000,       // Large energy pool
        energyRechargeRate: 45, // Slower recharge rate
        
        // Hull - Reinforced for cargo protection
        maxHull: 900,          // High hull hit points
        
        // System slots - More utility focused with expansion room
        systemSlots: 20,       // Increased for cargo systems and expansion
        
        // System slot allocations
        slotConfig: {
            engines: 1,        // Basic impulse engines
            warpDrive: 1,       // Warp drive
            shields: 1,         // Defensive shields
            weapons: 2,         // Moderate defensive capability
            scanner: 1,         // Long range scanner
            radio: 1,           // Subspace radio
            galacticChart: 1,   // Galactic chart
            targetComputer: 1,  // Basic target computer
            // Available slots: 11 (20 total - 9 used = 11 free for cargo systems)
        },
        
        // Default system configurations - Cargo optimized
        defaultSystems: {
            // Core ship systems that provide base stats
            hull_plating: {
                level: 5, // Level 5 = 1000 hull (5 * 200) - reinforced for cargo protection
                slots: 1
            },
            energy_reactor: {
                level: 6, // Level 6 = 6000 energy, 60/sec recharge (6 * 1000, 6 * 10)
                slots: 1
            },
            shield_generator: {
                level: 4, // Level 4 = 60 armor when active (4 * 15) - matches target 60
                slots: 1,
                energyConsumption: 20 // 4 * 5 energy per second when active
            },
            cargo_hold: {
                level: 5, // Level 5 = 50 cargo units (5 * 10) - matches target 50
                slots: 1
            },
            
            // Operational systems
            impulse_engines: { 
                level: 1,       // Basic engines
                slots: 1, 
                energyConsumption: 25 // Higher consumption due to cargo mass
            },
            warp_drive: { 
                level: 1, 
                slots: 1, 
                energyConsumption: 0
            },
            shields: { 
                level: 2,       // Good defensive shields
                slots: 1, 
                energyConsumption: 30 // Higher consumption for cargo protection
            },
            pulse_cannon: { 
                level: 1,       // Basic defensive pulse cannon
                slots: 1, 
                energyConsumption: 0
            },
            long_range_scanner: { 
                level: 2,       // Good scanner for trade routes
                slots: 1, 
                energyConsumption: 4
            },
            subspace_radio: { 
                level: 2,       // Good communication for trade
                slots: 1, 
                energyConsumption: 5
            },
            galactic_chart: { 
                level: 2,       // Enhanced navigation for trade routes
                slots: 1, 
                energyConsumption: 7
            },
            target_computer: { 
                level: 3,       // Level 3+ enables sub-targeting functionality
                slots: 1, 
                energyConsumption: 8
            }
        }
    },
    
    heavy_freighter: {
        name: 'Heavy Freighter',
        description: 'Maximum cargo capacity with minimal combat capability',
        
        // Base stats - Maximum cargo focus
        baseSpeed: 25,         // Very Low (25/100)
        baseArmor: 70,         // High (70/100)
        baseFirepower: 20,     // Very Low (20/100)
        baseCargoCapacity: 100, // Maximum (100 units)
        baseHardpoints: 4,     // Low (4 hard points)
        
        // Energy system - Massive capacity for cargo operations
        maxEnergy: 8000,       // Very large energy pool
        energyRechargeRate: 40, // Slow recharge rate
        
        // Hull - Heavily reinforced
        maxHull: 1200,         // Very high hull hit points
        
        // System slots - Maximum utility focus with extensive expansion
        systemSlots: 25,       // Maximum system slots for cargo operations and expansion
        
        // System slot allocations
        slotConfig: {
            engines: 1,        // Heavy impulse engines
            warpDrive: 1,       // Warp drive
            shields: 1,         // Heavy shields
            weapons: 1,         // Minimal weapons - cargo focused
            scanner: 1,         // Long range scanner
            radio: 1,           // Subspace radio
            galacticChart: 1,   // Galactic chart
            targetComputer: 1,  // Basic target computer
            // Available slots: 16 (25 total - 9 used = 16 free for cargo systems)
        },
        
        // Default system configurations - Heavy cargo optimized
        defaultSystems: {
            // Core ship systems that provide base stats
            hull_plating: {
                level: 6, // Level 6 = 1200 hull (6 * 200) - heavily reinforced
                slots: 1
            },
            energy_reactor: {
                level: 8, // Level 8 = 8000 energy, 80/sec recharge (8 * 1000, 8 * 10)
                slots: 1
            },
            shield_generator: {
                level: 5, // Level 5 = 75 armor when active (5 * 15) - close to target 70
                slots: 1,
                energyConsumption: 25 // 5 * 5 energy per second when active
            },
            cargo_hold: {
                level: 10, // Level 10 = 100 cargo units (10 * 10) - matches target 100
                slots: 1
            },
            
            // Operational systems
            impulse_engines: { 
                level: 1,       // Heavy but slow engines
                slots: 1, 
                energyConsumption: 35 // High consumption due to massive cargo
            },
            warp_drive: { 
                level: 1, 
                slots: 1, 
                energyConsumption: 0
            },
            shields: { 
                level: 3,       // Heavy defensive shields
                slots: 1, 
                energyConsumption: 40 // High consumption for maximum protection
            },
            pulse_cannon: { 
                level: 1,       // Minimal defensive pulse cannon
                slots: 1, 
                energyConsumption: 0
            },
            long_range_scanner: { 
                level: 2,       // Good scanner for trade routes
                slots: 1, 
                energyConsumption: 6
            },
            subspace_radio: { 
                level: 2,       // Good communication for trade
                slots: 1, 
                energyConsumption: 7
            },
            galactic_chart: { 
                level: 2,       // Enhanced navigation for trade routes
                slots: 1, 
                energyConsumption: 9
            },
            target_computer: { 
                level: 3,       // Level 3+ enables sub-targeting functionality
                slots: 1, 
                energyConsumption: 10
            }
        }
    }
};

// Enemy ship configurations - simplified with only essential combat systems
export const ENEMY_SHIP_CONFIGS = {
    enemy_fighter: {
        name: 'Enemy Fighter',
        description: 'Basic enemy combat vessel',
        
        // Base stats
        baseSpeed: 60,
        baseArmor: 50,
        baseFirepower: 60,
        baseCargoCapacity: 5,
        baseHardpoints: 4,
        
        // Energy system
        maxEnergy: 2000,
        energyRechargeRate: 30,
        
        // Hull
        maxHull: 600,
        
        // System slots
        systemSlots: 8,
        
        // Simplified systems - only essential combat systems
        defaultSystems: {
            // Core systems
            hull_plating: {
                level: 3, // 600 hull
                slots: 1
            },
            energy_reactor: {
                level: 2, // 2000 energy, 20/sec recharge
                slots: 1
            },
            
            // Combat systems only
            impulse_engines: { 
                level: 3, // 45 speed
                slots: 1, 
                energyConsumption: 15
            },
            shield_generator: { 
                level: 2, // Basic shields
                slots: 1, 
                energyConsumption: 20
            },
            laser_cannon: { 
                level: 4, // 48 firepower - standard enemy weapon
                slots: 1, 
                energyConsumption: 0
            },
            target_computer: { 
                level: 2, // Basic targeting (no sub-targeting)
                slots: 1, 
                energyConsumption: 5
            },
            subspace_radio: { 
                level: 1, // Basic communications
                slots: 1, 
                energyConsumption: 3
            }
            // No warp drive, long range scanner, galactic chart, or missile tubes
        }
    },
    
    enemy_interceptor: {
        name: 'Enemy Interceptor',
        description: 'Fast enemy attack craft',
        
        // Base stats - fast and agile
        baseSpeed: 80,
        baseArmor: 30,
        baseFirepower: 45,
        baseCargoCapacity: 3,
        baseHardpoints: 3,
        
        // Energy system
        maxEnergy: 1500,
        energyRechargeRate: 40,
        
        // Hull
        maxHull: 400,
        
        // System slots
        systemSlots: 8,
        
        // Minimal systems for speed
        defaultSystems: {
            // Core systems
            hull_plating: {
                level: 2, // 400 hull
                slots: 1
            },
            energy_reactor: {
                level: 2, // 2000 energy, 20/sec recharge
                slots: 1
            },
            
            // Speed-focused systems
            impulse_engines: { 
                level: 4, // 60 speed
                slots: 1, 
                energyConsumption: 12
            },
            shield_generator: { 
                level: 1, // Minimal shields
                slots: 1, 
                energyConsumption: 15
            },
            pulse_cannon: { 
                level: 3, // 36 firepower - fast firing for interceptor
                slots: 1, 
                energyConsumption: 0
            },
            target_computer: { 
                level: 1, // Basic targeting
                slots: 1, 
                energyConsumption: 3
            },
            subspace_radio: { 
                level: 1, // Basic communications
                slots: 1, 
                energyConsumption: 2
            }
            // Minimal systems for speed
        }
    },
    
    enemy_gunship: {
        name: 'Enemy Gunship',
        description: 'Heavy enemy combat vessel',
        
        // Base stats - slow but heavily armed
        baseSpeed: 40,
        baseArmor: 80,
        baseFirepower: 90,
        baseCargoCapacity: 10,
        baseHardpoints: 6,
        
        // Energy system
        maxEnergy: 3000,
        energyRechargeRate: 25,
        
        // Hull
        maxHull: 1000,
        
        // System slots
        systemSlots: 8,
        
        // Combat-focused systems - same 7 essential systems as other enemy ships
        defaultSystems: {
            // Core systems
            hull_plating: {
                level: 5, // 1000 hull
                slots: 1
            },
            energy_reactor: {
                level: 3, // 3000 energy, 30/sec recharge
                slots: 1
            },
            
            // Heavy combat systems
            impulse_engines: { 
                level: 2, // 30 speed (slow)
                slots: 1, 
                energyConsumption: 20
            },
            shield_generator: { 
                level: 3, // Strong shields (renamed from shields for consistency)
                slots: 1, 
                energyConsumption: 30
            },
            plasma_cannon: { 
                level: 6, // 72 firepower - heavy hitting for gunship
                slots: 1, 
                energyConsumption: 0
            },
            target_computer: { 
                level: 3, // Advanced targeting with sub-targeting
                slots: 1, 
                energyConsumption: 8
            },
            subspace_radio: { 
                level: 1, // Basic communications
                slots: 1, 
                energyConsumption: 4
            }
            // Only essential 7 systems for consistency
        }
    }
};

/**
 * Get ship configuration by type
 * @param {string} shipType - Type of ship
 * @returns {Object} - Ship configuration
 */
export function getShipConfig(shipType) {
    return SHIP_CONFIGS[shipType] || SHIP_CONFIGS.heavy_fighter;
}

/**
 * Get enemy ship configuration by type
 * @param {string} shipType - Type of enemy ship
 * @returns {Object} - Enemy ship configuration
 */
export function getEnemyShipConfig(shipType) {
    return ENEMY_SHIP_CONFIGS[shipType] || ENEMY_SHIP_CONFIGS.enemy_fighter;
}

/**
 * Get available ship types
 * @returns {Array} - Array of available ship types
 */
export function getAvailableShipTypes() {
    return Object.keys(SHIP_CONFIGS);
}

/**
 * Validate ship configuration
 * @param {Object} config - Ship configuration to validate
 * @returns {boolean} - True if configuration is valid
 */
export function validateShipConfig(config) {
    const requiredFields = [
        'name', 'baseSpeed', 'baseArmor', 'baseFirepower',
        'baseCargoCapacity', 'baseHardpoints', 'maxEnergy', 
        'energyRechargeRate', 'maxHull', 'systemSlots'
    ];
    
    return requiredFields.every(field => config.hasOwnProperty(field));
} 