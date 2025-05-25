/**
 * Ship configurations for different ship types
 * Based on docs/spaceships_spec.md
 * Simplified: Energy-only system (no separate power grid)
 */

export const SHIP_CONFIGS = {
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
        
        // System slots
        systemSlots: 10,       // Available system slots
        
        // System slot allocations (for reference)
        slotConfig: {
            engines: 2,        // Impulse engines
            warpDrive: 1,       // Warp drive
            shields: 2,         // Deflector shields
            weapons: 3,         // Laser weapons
            scanner: 1,         // Long range scanner
            radio: 1           // Subspace radio
        },
        
        // Default system configurations (energy consumption per second when active)
        defaultSystems: {
            impulse_engines: { 
                level: 1, 
                slots: 2, 
                energyConsumption: 20 // Energy per second when maneuvering
            },
            warp_drive: { 
                level: 1, 
                slots: 1, 
                energyConsumption: 0 // Uses energy per warp (handled separately)
            },
            shields: { 
                level: 1, 
                slots: 2, 
                energyConsumption: 25 // Energy per second when active
            },
            weapons: { 
                level: 1, 
                slots: 3, 
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
                energyConsumption: 3 // Energy per second when transmitting
            }
        }
    }
    
    // Future ship types can be added here for post-MVP
    // scout: { ... },
    // light_fighter: { ... },
    // light_freighter: { ... },
    // heavy_freighter: { ... }
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