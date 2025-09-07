/**
 * AI Configuration System - Ship-specific AI behavior parameters
 * 
 * Based on docs/enemy_ai_spec.md ship type specifications
 * Each configuration defines how different ship types behave in combat
 */

/**
 * AI configuration templates for different ship types
 * Values are tuned based on ship role and capabilities
 */
export const AI_CONFIGS = {
    scout: {
        // Basic parameters
        sensorRange: 2,             // 2km detection range (game units)
        maxSpeed: 8,                // Fast movement
        maxForce: 0.15,             // High agility
        communicationRange: 10,     // 10km long-range comms (game units)
        
        // Behavior weights (higher = more influence)
        behaviorWeights: {
            separation: 0.8,        // High - scouts avoid clustering
            alignment: 0.2,         // Low - independent movement
            cohesion: 0.2,          // Low - solo operations
            pursuit: 0.1,           // Low - prefers evasion
            evasion: 0.9,           // High - primary survival tactic
            orbiting: 0.8           // High - buzzing behavior
        },
        
        // Combat thresholds
        combatThresholds: {
            fleeHealth: 0.3,        // Flee at 30% health
            evadeHealth: 0.7,       // Evade at 70% health
            engageRange: 1.5        // Engage within 1.5km (game units)
        },
        
        // Formation preferences
        formationPreferences: {
            preferredPosition: 'perimeter',  // Stay on edges
            leadershipTendency: 0.2,        // Low leadership
            followTendency: 0.3             // Low following
        },
        
        // Flocking behavior parameters
        flocking: {
            separationWeight: 0.9,          // High separation for scouts
            alignmentWeight: 0.2,           // Low alignment - independent
            cohesionWeight: 0.2,            // Low cohesion - solo operations
            formationWeight: 0.4,           // Moderate formation adherence
            avoidanceWeight: 1.0,           // High obstacle avoidance
            separationRadius: 0.8,          // 800m personal space
            alignmentRadius: 1.5,           // 1.5km alignment check
            cohesionRadius: 2.0,            // 2km cohesion range
            maxForce: 0.4,                  // High agility
            maxSpeed: 8                     // Match ship speed
        }
    },
    
    light_fighter: {
        sensorRange: 1.8,          // 1.8km detection range (game units)
        maxSpeed: 6,
        maxForce: 0.12,
        communicationRange: 8,      // 8km communications (game units)
        
        behaviorWeights: {
            separation: 0.6,        // Moderate - maintains agility
            alignment: 0.5,         // Moderate - coordinates in patrols
            cohesion: 0.4,          // Moderate - stays with group
            pursuit: 0.7,           // High - aggressive dogfighting
            evasion: 0.6,           // Moderate - dodges in combat
            orbiting: 0.5           // Moderate - escorts or buzzes
        },
        
        combatThresholds: {
            fleeHealth: 0.2,        // Fight longer than scouts
            evadeHealth: 0.5,       // Evade at 50% health
            engageRange: 1.2        // 1.2km engagement range (game units)
        },
        
        formationPreferences: {
            preferredPosition: 'wing',
            leadershipTendency: 0.3,
            followTendency: 0.6
        },
        
        // Flocking behavior parameters
        flocking: {
            separationWeight: 0.6,          // Moderate separation
            alignmentWeight: 0.7,           // High alignment for coordination
            cohesionWeight: 0.6,            // Good group cohesion
            formationWeight: 0.8,           // Strong formation adherence
            avoidanceWeight: 0.9,           // High obstacle avoidance
            separationRadius: 0.6,          // 600m personal space
            alignmentRadius: 2.5,           // 2.5km alignment check
            cohesionRadius: 3.0,            // 3km cohesion range
            maxForce: 0.35,                 // Good agility
            maxSpeed: 6                     // Match ship speed
        }
    },
    
    heavy_fighter: {
        sensorRange: 1.6,          // 1.6km detection range (game units)
        maxSpeed: 4,
        maxForce: 0.08,
        communicationRange: 8,      // 8km communications (game units)
        
        behaviorWeights: {
            separation: 0.4,        // Moderate - tolerates proximity
            alignment: 0.7,         // High - maintains formation
            cohesion: 0.6,          // High - protects allies
            pursuit: 0.8,           // High - engages head-on
            evasion: 0.3,           // Low - tanks damage
            orbiting: 0.2           // Low - rarely orbits
        },
        
        combatThresholds: {
            fleeHealth: 0.15,       // Very tough, fights to the end
            evadeHealth: 0.3,       // Only evade when critically damaged
            engageRange: 1.0        // 1km close-range brawler (game units)
        },
        
        formationPreferences: {
            preferredPosition: 'front',
            leadershipTendency: 0.7,
            followTendency: 0.4
        },
        
        // Flocking behavior parameters
        flocking: {
            separationWeight: 0.4,          // Lower separation - tank formation
            alignmentWeight: 0.8,           // High alignment for coordinated assault
            cohesionWeight: 0.8,            // High cohesion - stay together
            formationWeight: 0.9,           // Very strong formation adherence
            avoidanceWeight: 0.7,           // Moderate avoidance - push through
            separationRadius: 0.4,          // 400m personal space - tight formation
            alignmentRadius: 2.0,           // 2km alignment check
            cohesionRadius: 2.5,            // 2.5km cohesion range
            maxForce: 0.2,                  // Lower agility
            maxSpeed: 4                     // Match ship speed
        }
    },
    
    carrier: {
        sensorRange: 2.5,          // 2.5km long-range sensors (game units)
        maxSpeed: 2,                // Slow and ponderous
        maxForce: 0.05,             // Low maneuverability
        communicationRange: 15,     // 15km command ship comms (game units)
        
        behaviorWeights: {
            separation: 0.2,        // Low - large and slow
            alignment: 0.5,         // Moderate - leads formation
            cohesion: 0.8,          // High - keeps fighters close
            pursuit: 0.0,           // None - avoids combat
            evasion: 0.5,           // Moderate - warps out
            orbiting: 0.0           // None - no orbiting
        },
        
        combatThresholds: {
            fleeHealth: 0.4,        // Flees early to preserve ship
            evadeHealth: 0.8,       // Evades at first sign of trouble
            engageRange: 2.0        // 2km stays far from combat (game units)
        },
        
        formationPreferences: {
            preferredPosition: 'center',
            leadershipTendency: 0.9,
            followTendency: 0.1
        },
        
        // Flocking behavior parameters
        flocking: {
            separationWeight: 0.3,          // Low separation - command ship needs escorts
            alignmentWeight: 0.5,           // Moderate alignment
            cohesionWeight: 0.9,            // Very high cohesion - keep escorts close
            formationWeight: 0.95,          // Extremely strong formation adherence
            avoidanceWeight: 1.0,           // Maximum obstacle avoidance
            separationRadius: 1.0,          // 1km personal space - large ship
            alignmentRadius: 4.0,           // 4km alignment check - command range
            cohesionRadius: 5.0,            // 5km cohesion range - battle group
            maxForce: 0.1,                  // Very low agility
            maxSpeed: 2                     // Match ship speed
        }
    },
    
    light_freighter: {
        sensorRange: 1.5,          // 1.5km detection range (game units)
        maxSpeed: 5,
        maxForce: 0.1,
        communicationRange: 6,      // 6km communications (game units)
        
        behaviorWeights: {
            separation: 0.5,        // Moderate - avoids escorts
            alignment: 0.5,         // Moderate - stays with escorts
            cohesion: 0.7,          // High - needs protection
            pursuit: 0.0,           // None - avoids combat
            evasion: 0.8,           // High - flees when attacked
            orbiting: 0.0           // None - no orbiting
        },
        
        combatThresholds: {
            fleeHealth: 0.9,        // Flees immediately when attacked
            evadeHealth: 0.95,      // Evades at first damage
            engageRange: 0.5        // 0.5km only defends at close range (game units)
        },
        
        formationPreferences: {
            preferredPosition: 'protected',
            leadershipTendency: 0.1,
            followTendency: 0.8
        },
        
        // Flocking behavior parameters
        flocking: {
            separationWeight: 0.7,          // High separation - avoid clustering
            alignmentWeight: 0.6,           // Good alignment with escorts
            cohesionWeight: 0.9,            // Very high cohesion - needs protection
            formationWeight: 0.8,           // Strong formation adherence
            avoidanceWeight: 1.0,           // Maximum obstacle avoidance
            separationRadius: 0.6,          // 600m personal space
            alignmentRadius: 3.0,           // 3km alignment check
            cohesionRadius: 4.0,            // 4km cohesion range
            maxForce: 0.25,                 // Good agility for evasion
            maxSpeed: 5                     // Match ship speed
        }
    },
    
    heavy_freighter: {
        sensorRange: 1.4,          // 1.4km detection range (game units)
        maxSpeed: 3,
        maxForce: 0.06,
        communicationRange: 6,      // 6km communications (game units)
        
        behaviorWeights: {
            separation: 0.3,        // Low - bulky and slow
            alignment: 0.5,         // Moderate - stays with escorts
            cohesion: 0.7,          // High - needs protection
            pursuit: 0.2,           // Low - defends self
            evasion: 0.6,           // Moderate - flees when damaged
            orbiting: 0.0           // None - no orbiting
        },
        
        combatThresholds: {
            fleeHealth: 0.4,        // More durable than light freighter
            evadeHealth: 0.7,       // Evades when moderately damaged
            engageRange: 0.8        // 0.8km slightly better defensive capability (game units)
        },
        
        formationPreferences: {
            preferredPosition: 'protected',
            leadershipTendency: 0.2,
            followTendency: 0.7
        },
        
        // Flocking behavior parameters
        flocking: {
            separationWeight: 0.5,          // Moderate separation - heavy ship
            alignmentWeight: 0.7,           // Good alignment with escorts
            cohesionWeight: 0.8,            // High cohesion - needs protection
            formationWeight: 0.9,           // Very strong formation adherence
            avoidanceWeight: 1.0,           // Maximum obstacle avoidance
            separationRadius: 0.8,          // 800m personal space - large ship
            alignmentRadius: 2.5,           // 2.5km alignment check
            cohesionRadius: 3.5,            // 3.5km cohesion range
            maxForce: 0.15,                 // Low agility - heavy ship
            maxSpeed: 3                     // Match ship speed
        }
    }
};

/**
 * Get AI configuration for a specific ship type
 * @param {string} shipType - Ship type identifier
 * @returns {Object} AI configuration object
 */
export function getAIConfig(shipType) {
    // Normalize ship type (remove prefixes like 'enemy_')
    const normalizedType = shipType.replace(/^enemy_/, '').replace(/_ship$/, '');
    
    // Map common variations to standard types
    const typeMap = {
        fighter: 'light_fighter',
        interceptor: 'light_fighter',
        gunship: 'heavy_fighter',
        frigate: 'heavy_fighter',
        destroyer: 'heavy_fighter',
        cruiser: 'carrier',
        battleship: 'carrier',
        transport: 'light_freighter',
        cargo: 'heavy_freighter',
        hauler: 'heavy_freighter'
    };
    
    const mappedType = typeMap[normalizedType] || normalizedType;
    const config = AI_CONFIGS[mappedType];
    
    if (!config) {
        console.warn(`No AI config found for ship type: ${shipType}, using light_fighter default`);
        return { ...AI_CONFIGS.light_fighter }; // Return a copy
    }
    
    return { ...config }; // Return a copy to prevent modification
}

/**
 * Modify AI config based on difficulty level
 * @param {Object} baseConfig - Base AI configuration
 * @param {number} difficultyLevel - Difficulty level (1-100)
 * @returns {Object} Modified configuration
 */
export function applyDifficultyModifiers(baseConfig, difficultyLevel = 50) {
    const config = { ...baseConfig };
    
    // Scale difficulty from 0.5 to 1.5 (50% to 150% effectiveness)
    const difficultyScale = 0.5 + (difficultyLevel / 100);
    
    // Apply difficulty scaling to key parameters
    config.sensorRange = Math.round(config.sensorRange * difficultyScale);
    config.maxSpeed *= difficultyScale;
    config.maxForce *= difficultyScale;
    
    // Adjust combat thresholds (harder enemies fight longer)
    config.combatThresholds = { ...config.combatThresholds };
    config.combatThresholds.fleeHealth *= (2 - difficultyScale); // Lower flee threshold for harder enemies
    config.combatThresholds.evadeHealth *= (2 - difficultyScale);
    config.combatThresholds.engageRange *= difficultyScale;
    
    // Adjust behavior weights (harder enemies are more aggressive)
    config.behaviorWeights = { ...config.behaviorWeights };
    config.behaviorWeights.pursuit *= difficultyScale;
    config.behaviorWeights.evasion *= (2 - difficultyScale); // Less evasive when harder
    
    return config;
}

/**
 * Create faction-specific AI config modifications
 * @param {Object} baseConfig - Base AI configuration
 * @param {string} faction - Faction identifier
 * @returns {Object} Modified configuration
 */
export function applyFactionModifiers(baseConfig, faction = 'neutral') {
    const config = { ...baseConfig };
    
    switch (faction) {
        case 'military':
            // Military ships are disciplined and coordinated
            config.behaviorWeights = { ...config.behaviorWeights };
            config.behaviorWeights.alignment *= 1.3;
            config.behaviorWeights.cohesion *= 1.2;
            config.communicationRange *= 1.5;
            break;
            
        case 'pirate':
            // Pirates are aggressive but less coordinated
            config.behaviorWeights = { ...config.behaviorWeights };
            config.behaviorWeights.pursuit *= 1.4;
            config.behaviorWeights.separation *= 1.3;
            config.behaviorWeights.alignment *= 0.8;
            config.maxSpeed *= 1.2;
            break;
            
        case 'trader':
            // Traders are defensive and prefer to flee
            config.behaviorWeights = { ...config.behaviorWeights };
            config.behaviorWeights.evasion *= 1.5;
            config.behaviorWeights.pursuit *= 0.5;
            config.combatThresholds.fleeHealth *= 1.5;
            config.combatThresholds.evadeHealth *= 1.3;
            break;
            
        case 'rebel':
            // Rebels are unpredictable and independent
            config.behaviorWeights = { ...config.behaviorWeights };
            config.behaviorWeights.separation *= 1.4;
            config.behaviorWeights.cohesion *= 0.7;
            config.behaviorWeights.orbiting *= 1.3;
            break;
    }
    
    return config;
}

/**
 * Validate AI configuration
 * @param {Object} config - Configuration to validate
 * @returns {boolean} True if valid
 */
export function validateAIConfig(config) {
    const required = [
        'sensorRange', 'maxSpeed', 'maxForce', 'communicationRange',
        'behaviorWeights', 'combatThresholds', 'formationPreferences'
    ];
    
    for (const field of required) {
        if (!(field in config)) {
            console.error(`Missing required AI config field: ${field}`);
            return false;
        }
    }
    
    // Validate behavior weights
    const requiredWeights = ['separation', 'alignment', 'cohesion', 'pursuit', 'evasion', 'orbiting'];
    for (const weight of requiredWeights) {
        if (!(weight in config.behaviorWeights)) {
            console.error(`Missing behavior weight: ${weight}`);
            return false;
        }
    }
    
    // Validate combat thresholds
    const requiredThresholds = ['fleeHealth', 'evadeHealth', 'engageRange'];
    for (const threshold of requiredThresholds) {
        if (!(threshold in config.combatThresholds)) {
            console.error(`Missing combat threshold: ${threshold}`);
            return false;
        }
    }
    
    return true;
}

/**
 * Get list of all available ship types with AI configs
 * @returns {Array} Array of ship type names
 */
export function getAvailableShipTypes() {
    return Object.keys(AI_CONFIGS);
}

/**
 * Get default AI config (used as fallback)
 * @returns {Object} Default AI configuration
 */
export function getDefaultAIConfig() {
    return { ...AI_CONFIGS.light_fighter };
}

export default AI_CONFIGS;
