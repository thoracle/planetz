/**
 * GameObjectFactory - Singleton factory for creating game objects
 *
 * Part of the GameObject Factory Pattern refactor.
 * Provides validated creation of all game object types.
 *
 * Features:
 * - Type-specific factory methods with required field validation
 * - Automatic ID generation via IDGenerator
 * - Automatic registration with GameObjectRegistry
 * - Fail-fast validation with clear error messages
 */

import { debug } from '../debug.js';
import { GameObject, GameObjectType } from './GameObject.js';
import { GameObjectRegistry } from './GameObjectRegistry.js';
import { IDGenerator } from './IDGenerator.js';

/**
 * Singleton factory for creating game objects
 */
class GameObjectFactoryClass {
    constructor() {
        this._initialized = false;
    }

    /**
     * Initialize the factory (call once at app startup)
     * @param {string} sector - Starting sector
     */
    initialize(sector) {
        GameObjectRegistry.setCurrentSector(sector);
        this._initialized = true;
        debug('UTILITY', `GameObjectFactory initialized for sector ${sector}`);
    }

    /**
     * Get current sector
     */
    get currentSector() {
        return GameObjectRegistry.currentSector;
    }

    /**
     * Set current sector (for sector changes)
     * @param {string} sector - New sector
     * @param {boolean} [clearPrevious=true] - Whether to clear objects from previous sector
     */
    setSector(sector, clearPrevious = true) {
        GameObjectRegistry.setCurrentSector(sector, clearPrevious);
        IDGenerator.clear(clearPrevious ? GameObjectRegistry.currentSector : null);
        debug('UTILITY', `GameObjectFactory sector changed to ${sector}`);
    }

    // ==================== FACTORY METHODS ====================

    /**
     * Create a star game object
     * @param {Object} data - Star data
     * @param {string} data.name - Star name (required)
     * @param {Object} data.position - Position {x, y, z} (required)
     * @param {string} [data.classification] - Star type (e.g., 'Class-G')
     * @param {Object} [data.threeObject] - Three.js mesh reference
     * @returns {GameObject}
     */
    createStar(data) {
        this._assertInitialized();
        this._validateRequired(data, ['name', 'position'], 'createStar');

        const sector = this.currentSector;
        const id = IDGenerator.generateDeterministic(GameObjectType.STAR, sector, data.name);

        const gameObject = new GameObject({
            id,
            type: GameObjectType.STAR,
            name: data.name,
            sector,
            position: this._normalizePosition(data.position),
            faction: 'Neutral', // Stars are always neutral
            classification: data.classification || 'Unknown',
            discovered: true, // Stars are always visible
            threeObject: data.threeObject
        });

        GameObjectRegistry.register(gameObject);
        return gameObject;
    }

    /**
     * Create a planet game object
     * @param {Object} data - Planet data
     * @param {string} data.name - Planet name (required)
     * @param {Object} data.position - Position {x, y, z} (required)
     * @param {string} [data.classification] - Planet type (e.g., 'Class-M')
     * @param {string} [data.faction] - Faction controlling the planet
     * @param {Object} [data.threeObject] - Three.js mesh reference
     * @returns {GameObject}
     */
    createPlanet(data) {
        this._assertInitialized();
        this._validateRequired(data, ['name', 'position'], 'createPlanet');

        const sector = this.currentSector;
        const id = IDGenerator.generateDeterministic(GameObjectType.PLANET, sector, data.name);

        const gameObject = new GameObject({
            id,
            type: GameObjectType.PLANET,
            name: data.name,
            sector,
            position: this._normalizePosition(data.position),
            faction: data.faction || 'Neutral',
            classification: data.classification || 'Unknown',
            discovered: data.discovered || false,
            threeObject: data.threeObject
        });

        // Store additional planet metadata
        if (data.government) gameObject.setMeta('government', data.government);
        if (data.economy) gameObject.setMeta('economy', data.economy);
        if (data.technology) gameObject.setMeta('technology', data.technology);
        if (data.population) gameObject.setMeta('population', data.population);
        if (data.description) gameObject.setMeta('description', data.description);

        GameObjectRegistry.register(gameObject);
        return gameObject;
    }

    /**
     * Create a moon game object
     * @param {Object} data - Moon data
     * @param {string} data.name - Moon name (required)
     * @param {Object} data.position - Position {x, y, z} (required)
     * @param {string} [data.parentPlanet] - Parent planet name
     * @param {string} [data.classification] - Moon type
     * @param {string} [data.faction] - Faction controlling the moon
     * @param {Object} [data.threeObject] - Three.js mesh reference
     * @returns {GameObject}
     */
    createMoon(data) {
        this._assertInitialized();
        this._validateRequired(data, ['name', 'position'], 'createMoon');

        const sector = this.currentSector;
        const id = IDGenerator.generateDeterministic(GameObjectType.MOON, sector, data.name);

        const gameObject = new GameObject({
            id,
            type: GameObjectType.MOON,
            name: data.name,
            sector,
            position: this._normalizePosition(data.position),
            faction: data.faction || 'Neutral',
            classification: data.classification || 'Unknown',
            discovered: data.discovered || false,
            threeObject: data.threeObject
        });

        // Store additional moon metadata
        if (data.parentPlanet) gameObject.setMeta('parentPlanet', data.parentPlanet);
        if (data.government) gameObject.setMeta('government', data.government);
        if (data.economy) gameObject.setMeta('economy', data.economy);

        GameObjectRegistry.register(gameObject);
        return gameObject;
    }

    /**
     * Create a space station game object
     * @param {Object} data - Station data
     * @param {string} data.name - Station name (required)
     * @param {Object} data.position - Position {x, y, z} (required)
     * @param {string} data.faction - Controlling faction (required)
     * @param {string} [data.stationType] - Station type (e.g., 'Shipyard')
     * @param {string[]} [data.services] - Available services
     * @param {Object} [data.threeObject] - Three.js mesh reference
     * @returns {GameObject}
     */
    createStation(data) {
        this._assertInitialized();
        this._validateRequired(data, ['name', 'position', 'faction'], 'createStation');

        const sector = this.currentSector;
        const id = IDGenerator.generateDeterministic(GameObjectType.STATION, sector, data.name);

        const gameObject = new GameObject({
            id,
            type: GameObjectType.STATION,
            name: data.name,
            sector,
            position: this._normalizePosition(data.position),
            faction: data.faction,
            classification: data.stationType || 'Space Station',
            discovered: data.discovered || false,
            threeObject: data.threeObject
        });

        // Store additional station metadata
        if (data.services) gameObject.setMeta('services', data.services);
        if (data.description) gameObject.setMeta('description', data.description);
        gameObject.setMeta('canDock', data.canDock !== false); // Stations can dock by default

        GameObjectRegistry.register(gameObject);
        return gameObject;
    }

    /**
     * Create a navigation beacon game object
     * @param {Object} data - Beacon data
     * @param {string} data.name - Beacon name (required)
     * @param {Object} data.position - Position {x, y, z} (required)
     * @param {string} [data.beaconId] - Beacon identifier
     * @param {Object} [data.threeObject] - Three.js mesh reference
     * @returns {GameObject}
     */
    createBeacon(data) {
        this._assertInitialized();
        this._validateRequired(data, ['name', 'position'], 'createBeacon');

        const sector = this.currentSector;
        const id = data.beaconId || IDGenerator.generateDeterministic(GameObjectType.BEACON, sector, data.name);

        const gameObject = new GameObject({
            id,
            type: GameObjectType.BEACON,
            name: data.name,
            sector,
            position: this._normalizePosition(data.position),
            faction: 'Neutral', // Beacons are always neutral
            classification: 'Navigation Beacon',
            discovered: data.discovered || false,
            threeObject: data.threeObject
        });

        if (data.description) gameObject.setMeta('description', data.description);

        GameObjectRegistry.register(gameObject);
        return gameObject;
    }

    /**
     * Create a ship game object
     * @param {Object} data - Ship data
     * @param {string} data.name - Ship name (required)
     * @param {string} data.faction - Ship faction (required)
     * @param {string} data.shipType - Ship class type (required)
     * @param {Object} data.position - Position {x, y, z} (required)
     * @param {string} [data.diplomacy] - Explicit diplomacy override
     * @param {Object} [data.threeObject] - Three.js mesh reference
     * @returns {GameObject}
     */
    createShip(data) {
        this._assertInitialized();
        this._validateRequired(data, ['name', 'faction', 'shipType', 'position'], 'createShip');

        const sector = this.currentSector;
        // Ships use unique IDs since multiple ships can have same name
        const id = IDGenerator.generate(GameObjectType.SHIP, sector, data.name);

        const gameObject = new GameObject({
            id,
            type: GameObjectType.SHIP,
            name: data.name,
            sector,
            position: this._normalizePosition(data.position),
            faction: data.faction,
            classification: data.shipType,
            discovered: true, // Ships are always discovered when created (within range)
            threeObject: data.threeObject
        });

        // Store additional ship metadata
        gameObject.setMeta('shipType', data.shipType);
        if (data.health !== undefined) gameObject.setMeta('health', data.health);
        if (data.maxHealth !== undefined) gameObject.setMeta('maxHealth', data.maxHealth);

        GameObjectRegistry.register(gameObject);
        return gameObject;
    }

    // ==================== BULK OPERATIONS ====================

    /**
     * Create multiple objects from an array of data
     * @param {string} type - Object type ('planet', 'moon', 'station', 'beacon', 'ship')
     * @param {Object[]} dataArray - Array of object data
     * @returns {GameObject[]} Created objects
     */
    createBatch(type, dataArray) {
        const factoryMethod = this._getFactoryMethod(type);
        return dataArray.map(data => {
            try {
                return factoryMethod.call(this, data);
            } catch (e) {
                debug('P1', `Failed to create ${type} in batch:`, e.message);
                return null;
            }
        }).filter(Boolean);
    }

    // ==================== VALIDATION HELPERS ====================

    /**
     * Assert factory is initialized
     * @private
     */
    _assertInitialized() {
        if (!this._initialized) {
            throw new Error('GameObjectFactory not initialized. Call initialize(sector) first.');
        }
    }

    /**
     * Validate required fields are present
     * @private
     */
    _validateRequired(data, requiredFields, methodName) {
        if (!data) {
            throw new Error(`${methodName}: data object is required`);
        }

        for (const field of requiredFields) {
            if (field === 'position') {
                if (!data.position || typeof data.position.x !== 'number') {
                    throw new Error(`${methodName}: valid position {x, y, z} is required`);
                }
            } else if (!data[field]) {
                throw new Error(`${methodName}: ${field} is required`);
            }
        }
    }

    /**
     * Normalize position from various formats to {x, y, z}
     * @private
     */
    _normalizePosition(position) {
        if (Array.isArray(position)) {
            return {
                x: position[0] || 0,
                y: position[1] || 0,
                z: position[2] || 0
            };
        }
        if (position && typeof position.x === 'number') {
            return {
                x: position.x,
                y: position.y || 0,
                z: position.z || 0
            };
        }
        throw new Error('Invalid position format');
    }

    /**
     * Get factory method for a type
     * @private
     */
    _getFactoryMethod(type) {
        const methods = {
            star: this.createStar,
            planet: this.createPlanet,
            moon: this.createMoon,
            station: this.createStation,
            beacon: this.createBeacon,
            ship: this.createShip
        };
        const method = methods[type];
        if (!method) {
            throw new Error(`Unknown object type: ${type}`);
        }
        return method;
    }

    // ==================== UTILITY ====================

    /**
     * Get statistics about factory usage
     * @returns {Object}
     */
    getStats() {
        return {
            initialized: this._initialized,
            currentSector: this.currentSector,
            registry: GameObjectRegistry.getStats(),
            idGenerator: IDGenerator.getStats()
        };
    }

    /**
     * Clear all objects and reset factory state
     * @param {boolean} [keepInitialized=true] - Whether to keep factory initialized
     */
    reset(keepInitialized = true) {
        GameObjectRegistry.clearAll();
        IDGenerator.clear();
        if (!keepInitialized) {
            this._initialized = false;
        }
        debug('UTILITY', 'GameObjectFactory reset');
    }
}

// Singleton instance
export const GameObjectFactory = new GameObjectFactoryClass();

// Also export the class for testing
export { GameObjectFactoryClass };
