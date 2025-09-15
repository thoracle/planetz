/**
 * SpawnShipsAction - Spawn ships with randomized count
 * 
 * Spawns ships when waypoint is triggered. Supports min/max count randomization,
 * formation patterns, faction assignment, and behavior configuration.
 */

import { WaypointAction, ActionType } from '../WaypointAction.js';
import { debug } from '../../debug.js';

// Formation patterns for ship spawning
export const FormationPattern = {
    RANDOM: 'random',
    LINE: 'line',
    TRIANGLE: 'triangle',
    DIAMOND: 'diamond',
    CIRCLE: 'circle',
    WEDGE: 'wedge',
    SCATTERED: 'scattered'
};

// Ship behavior types
export const ShipBehavior = {
    AGGRESSIVE: 'aggressive',
    DEFENSIVE: 'defensive',
    PATROL: 'patrol',
    ESCORT: 'escort',
    PASSIVE: 'passive',
    FLEE: 'flee'
};

export class SpawnShipsAction extends WaypointAction {
    constructor(type, parameters) {
        super(type, parameters);
        
        // Validate spawn parameters
        this.validateSpawnParameters();
    }

    /**
     * Perform ship spawning action
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} - Spawn result
     */
    async performAction(context) {
        const {
            shipType = 'enemy_fighter',
            minCount = 1,
            maxCount = 1,
            formation = FormationPattern.RANDOM,
            faction = 'pirates',
            spawnRadius = 20.0,
            behavior = ShipBehavior.AGGRESSIVE,
            position = null, // Optional override position
            level = 1,       // Ship level/difficulty
            equipment = null // Optional equipment loadout
        } = this.parameters;

        debug('WAYPOINTS', `🚢 Spawning ships: ${shipType} (${minCount}-${maxCount}) formation: ${formation}`);

        // Calculate spawn count
        const spawnCount = this.calculateSpawnCount(minCount, maxCount);
        
        // Get spawn position (waypoint position or override)
        const basePosition = position || context.waypoint?.position || [0, 0, 0];
        
        // Generate spawn positions based on formation
        const spawnPositions = this.generateFormationPositions(
            basePosition, 
            spawnCount, 
            formation, 
            spawnRadius
        );

        // Spawn the ships
        const spawnedShips = [];
        for (let i = 0; i < spawnCount; i++) {
            try {
                const ship = await this.createShip({
                    type: shipType,
                    faction: faction,
                    behavior: behavior,
                    position: spawnPositions[i],
                    level: level,
                    equipment: equipment,
                    formationIndex: i,
                    totalInFormation: spawnCount
                });
                
                if (ship) {
                    spawnedShips.push(ship);
                    debug('WAYPOINTS', `🚢 Spawned ship ${i + 1}/${spawnCount}: ${shipType} at [${spawnPositions[i].join(', ')}]`);
                }
            } catch (error) {
                console.error(`Failed to spawn ship ${i + 1}:`, error);
            }
        }

        // Configure formation behavior if applicable
        if (spawnedShips.length > 1 && formation !== FormationPattern.RANDOM) {
            this.configureFormationBehavior(spawnedShips, formation);
        }

        // Apply faction relationships
        this.applyFactionRelationships(spawnedShips, faction);

        const result = {
            spawnedCount: spawnedShips.length,
            requestedCount: spawnCount,
            ships: spawnedShips,
            formation: formation,
            faction: faction,
            spawnPositions: spawnPositions
        };

        debug('WAYPOINTS', `✅ Ship spawn complete: ${spawnedShips.length}/${spawnCount} ships spawned`);
        return result;
    }

    /**
     * Calculate number of ships to spawn
     * @param {number} minCount - Minimum ships
     * @param {number} maxCount - Maximum ships
     * @returns {number} - Actual spawn count
     */
    calculateSpawnCount(minCount, maxCount) {
        if (minCount === maxCount) {
            return maxCount; // Exact count
        }
        
        if (minCount > maxCount) {
            console.warn(`Invalid spawn count: min (${minCount}) > max (${maxCount}), using min`);
            return minCount;
        }
        
        return Math.floor(Math.random() * (maxCount - minCount + 1)) + minCount;
    }

    /**
     * Generate formation positions for ships
     * @param {Array} basePosition - Base spawn position [x, y, z]
     * @param {number} count - Number of ships
     * @param {string} formation - Formation pattern
     * @param {number} radius - Formation radius
     * @returns {Array} - Array of positions
     */
    generateFormationPositions(basePosition, count, formation, radius) {
        const positions = [];
        const [baseX, baseY, baseZ] = basePosition;

        switch (formation) {
            case FormationPattern.RANDOM:
                for (let i = 0; i < count; i++) {
                    positions.push([
                        baseX + (Math.random() - 0.5) * radius * 2,
                        baseY + (Math.random() - 0.5) * radius * 2,
                        baseZ + (Math.random() - 0.5) * radius * 2
                    ]);
                }
                break;

            case FormationPattern.LINE:
                const spacing = count > 1 ? radius * 2 / (count - 1) : 0;
                for (let i = 0; i < count; i++) {
                    positions.push([
                        baseX + (i - (count - 1) / 2) * spacing,
                        baseY,
                        baseZ
                    ]);
                }
                break;

            case FormationPattern.TRIANGLE:
                if (count === 1) {
                    positions.push([baseX, baseY, baseZ]);
                } else if (count === 2) {
                    positions.push([baseX - radius * 0.5, baseY, baseZ]);
                    positions.push([baseX + radius * 0.5, baseY, baseZ]);
                } else {
                    // Triangle formation with leader at front
                    positions.push([baseX, baseY, baseZ + radius]); // Leader
                    const wingSpacing = radius * 0.8;
                    for (let i = 1; i < count; i++) {
                        const side = i % 2 === 1 ? -1 : 1;
                        const row = Math.floor((i - 1) / 2);
                        positions.push([
                            baseX + side * wingSpacing * (row + 1),
                            baseY,
                            baseZ - row * radius * 0.6
                        ]);
                    }
                }
                break;

            case FormationPattern.DIAMOND:
                if (count === 1) {
                    positions.push([baseX, baseY, baseZ]);
                } else {
                    const angleStep = (2 * Math.PI) / Math.min(count, 4);
                    for (let i = 0; i < count; i++) {
                        const angle = i * angleStep;
                        const distance = i < 4 ? radius : radius * 1.5;
                        positions.push([
                            baseX + Math.cos(angle) * distance,
                            baseY,
                            baseZ + Math.sin(angle) * distance
                        ]);
                    }
                }
                break;

            case FormationPattern.CIRCLE:
                if (count === 1) {
                    positions.push([baseX, baseY, baseZ]);
                } else {
                    const angleStep = (2 * Math.PI) / count;
                    for (let i = 0; i < count; i++) {
                        const angle = i * angleStep;
                        positions.push([
                            baseX + Math.cos(angle) * radius,
                            baseY,
                            baseZ + Math.sin(angle) * radius
                        ]);
                    }
                }
                break;

            case FormationPattern.WEDGE:
                positions.push([baseX, baseY, baseZ]); // Leader at point
                for (let i = 1; i < count; i++) {
                    const side = i % 2 === 1 ? -1 : 1;
                    const row = Math.floor(i / 2);
                    positions.push([
                        baseX + side * radius * 0.5 * (row + 1),
                        baseY,
                        baseZ - radius * 0.8 * (row + 1)
                    ]);
                }
                break;

            case FormationPattern.SCATTERED:
                // More spread out than random
                for (let i = 0; i < count; i++) {
                    positions.push([
                        baseX + (Math.random() - 0.5) * radius * 4,
                        baseY + (Math.random() - 0.5) * radius * 4,
                        baseZ + (Math.random() - 0.5) * radius * 4
                    ]);
                }
                break;

            default:
                console.warn(`Unknown formation pattern: ${formation}, using random`);
                return this.generateFormationPositions(basePosition, count, FormationPattern.RANDOM, radius);
        }

        return positions;
    }

    /**
     * Create individual ship
     * @param {Object} config - Ship configuration
     * @returns {Promise<Object>} - Created ship object
     */
    async createShip(config) {
        const {
            type,
            faction,
            behavior,
            position,
            level,
            equipment,
            formationIndex,
            totalInFormation
        } = config;

        // Integration with existing ship creation system
        if (window.starfieldManager && window.starfieldManager.createEnemyShip) {
            // Use existing enemy ship creation
            const ship = window.starfieldManager.createEnemyShip({
                shipType: type,
                position: position,
                faction: faction,
                behavior: behavior,
                level: level
            });

            // Apply equipment if specified
            if (equipment && ship) {
                this.applyShipEquipment(ship, equipment);
            }

            return ship;
            
        } else if (window.shipFactory) {
            // Use ship factory if available
            return window.shipFactory.createShip({
                type: type,
                position: position,
                faction: faction,
                behavior: behavior,
                level: level,
                equipment: equipment
            });
            
        } else {
            // Fallback: Create basic ship object
            debug('WAYPOINTS', '⚠️ No ship creation system available, creating placeholder');
            
            return {
                id: `spawned_ship_${Date.now()}_${formationIndex}`,
                type: type,
                faction: faction,
                behavior: behavior,
                position: position,
                level: level,
                isSpawned: true,
                spawnedAt: new Date(),
                formationIndex: formationIndex,
                totalInFormation: totalInFormation
            };
        }
    }

    /**
     * Configure formation behavior for multiple ships
     * @param {Array} ships - Spawned ships
     * @param {string} formation - Formation pattern
     */
    configureFormationBehavior(ships, formation) {
        if (ships.length < 2) return;

        // Set formation leader (first ship)
        const leader = ships[0];
        if (leader.ai) {
            leader.ai.isFormationLeader = true;
            leader.ai.formation = formation;
        }

        // Configure wingmen
        for (let i = 1; i < ships.length; i++) {
            const wingman = ships[i];
            if (wingman.ai) {
                wingman.ai.isFormationLeader = false;
                wingman.ai.formationLeader = leader;
                wingman.ai.formation = formation;
                wingman.ai.formationPosition = i;
            }
        }

        debug('WAYPOINTS', `🚢 Configured ${formation} formation: 1 leader + ${ships.length - 1} wingmen`);
    }

    /**
     * Apply faction relationships to spawned ships
     * @param {Array} ships - Spawned ships
     * @param {string} faction - Faction name
     */
    applyFactionRelationships(ships, faction) {
        // This would integrate with the faction system
        // For now, just set basic faction properties
        
        ships.forEach(ship => {
            if (ship) {
                ship.faction = faction;
                
                // Set relationship to player based on faction
                if (window.factionManager) {
                    const relationship = window.factionManager.getRelationshipToPlayer(faction);
                    ship.playerRelationship = relationship;
                } else {
                    // Default relationships
                    ship.playerRelationship = this.getDefaultRelationship(faction);
                }
            }
        });

        debug('WAYPOINTS', `🚢 Applied faction relationships: ${faction}`);
    }

    /**
     * Get default faction relationship
     * @param {string} faction - Faction name
     * @returns {string} - Relationship type
     */
    getDefaultRelationship(faction) {
        const hostileFactions = ['pirates', 'raiders', 'criminals', 'hostile'];
        const friendlyFactions = ['federation', 'alliance', 'traders', 'friendly'];
        
        if (hostileFactions.includes(faction.toLowerCase())) {
            return 'hostile';
        } else if (friendlyFactions.includes(faction.toLowerCase())) {
            return 'friendly';
        } else {
            return 'neutral';
        }
    }

    /**
     * Apply equipment to ship
     * @param {Object} ship - Ship object
     * @param {Object} equipment - Equipment configuration
     */
    applyShipEquipment(ship, equipment) {
        if (!ship || !equipment) return;

        // Apply weapons
        if (equipment.weapons && ship.weapons) {
            equipment.weapons.forEach(weapon => {
                ship.weapons.push(weapon);
            });
        }

        // Apply shields
        if (equipment.shields && ship.shields) {
            Object.assign(ship.shields, equipment.shields);
        }

        // Apply other equipment
        if (equipment.other) {
            Object.assign(ship, equipment.other);
        }

        debug('WAYPOINTS', `🔧 Applied equipment to ship: ${Object.keys(equipment).join(', ')}`);
    }

    /**
     * Validate spawn parameters
     */
    validateSpawnParameters() {
        const { minCount, maxCount, spawnRadius } = this.parameters;

        if (minCount !== undefined && (typeof minCount !== 'number' || minCount < 0)) {
            throw new Error('minCount must be a non-negative number');
        }

        if (maxCount !== undefined && (typeof maxCount !== 'number' || maxCount < 0)) {
            throw new Error('maxCount must be a non-negative number');
        }

        if (minCount !== undefined && maxCount !== undefined && minCount > maxCount) {
            throw new Error('minCount cannot be greater than maxCount');
        }

        if (spawnRadius !== undefined && (typeof spawnRadius !== 'number' || spawnRadius <= 0)) {
            throw new Error('spawnRadius must be a positive number');
        }
    }

    /**
     * Get required parameters for this action
     * @returns {Array<string>} - Required parameter names
     */
    getRequiredParameters() {
        return []; // All parameters have defaults
    }

    /**
     * Get parameter types for validation
     * @returns {Object} - Parameter name to type mapping
     */
    getParameterTypes() {
        return {
            shipType: 'string',
            minCount: 'number',
            maxCount: 'number',
            formation: 'string',
            faction: 'string',
            spawnRadius: 'number',
            behavior: 'string',
            level: 'number'
        };
    }

    /**
     * Get action summary for debugging
     * @returns {Object} - Action summary
     */
    getSummary() {
        const baseSummary = super.getSummary();
        const { minCount = 1, maxCount = 1, formation, faction, shipType } = this.parameters;
        
        return {
            ...baseSummary,
            shipType: shipType || 'enemy_fighter',
            spawnRange: `${minCount}-${maxCount}`,
            formation: formation || 'random',
            faction: faction || 'pirates',
            estimatedSpawnCount: Math.floor((minCount + maxCount) / 2)
        };
    }
}

export default SpawnShipsAction;
