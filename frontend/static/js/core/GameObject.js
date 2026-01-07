/**
 * GameObject - Base class for all game objects
 *
 * Part of the GameObject Factory Pattern refactor.
 * Provides a single source of truth for all game object data.
 *
 * Properties:
 * - Immutable: id, type, name, sector (set at creation, never change)
 * - Static: faction, classification (set at creation, rarely change)
 * - Mutable: position, discovered (change during gameplay)
 * - Computed: diplomacy (derived from FactionStandingsManager)
 */

import { debug } from '../debug.js';

/**
 * Valid game object types
 */
export const GameObjectType = {
    STAR: 'star',
    PLANET: 'planet',
    MOON: 'moon',
    STATION: 'station',
    BEACON: 'beacon',
    SHIP: 'ship'
};

/**
 * Base class for all game objects in the PlanetZ universe
 */
export class GameObject {
    /**
     * Create a new GameObject
     * @param {Object} config - Configuration object
     * @param {string} config.id - Unique identifier (required)
     * @param {string} config.type - Object type from GameObjectType (required)
     * @param {string} config.name - Display name (required)
     * @param {string} config.sector - Current sector (required)
     * @param {Object} config.position - Position {x, y, z} (required)
     * @param {string} [config.faction] - Faction name (optional)
     * @param {string} [config.classification] - Subtype classification (optional)
     * @param {boolean} [config.discovered] - Discovery state (optional, default false)
     * @param {Object} [config.threeObject] - Reference to Three.js mesh (optional)
     */
    constructor(config) {
        // Validate required fields - fail fast
        this._validateConfig(config);

        // Immutable properties (frozen after construction)
        this._id = config.id;
        this._type = config.type;
        this._name = config.name;
        this._sector = config.sector;

        // Static properties (rarely change)
        this._faction = config.faction || null;
        this._classification = config.classification || null;

        // Mutable properties
        this._position = { ...config.position };
        this._discovered = config.discovered || false;

        // Reference to Three.js object (for rendering integration)
        this._threeObject = config.threeObject || null;

        // Additional metadata storage
        this._metadata = {};

        // Event listeners for property changes
        this._listeners = new Map();

        // Freeze immutable properties
        Object.freeze(this._id);
        Object.freeze(this._type);
        Object.freeze(this._name);
        Object.freeze(this._sector);
    }

    /**
     * Validate configuration - fail fast with clear error messages
     * @private
     */
    _validateConfig(config) {
        if (!config) {
            throw new Error('GameObject: config is required');
        }
        if (!config.id) {
            throw new Error('GameObject: id is required');
        }
        if (!config.type) {
            throw new Error(`GameObject: type is required for object ${config.id || 'unknown'}`);
        }
        if (!Object.values(GameObjectType).includes(config.type)) {
            throw new Error(`GameObject: invalid type "${config.type}" for object ${config.id}. Valid types: ${Object.values(GameObjectType).join(', ')}`);
        }
        if (!config.name) {
            throw new Error(`GameObject: name is required for object ${config.id}`);
        }
        if (!config.sector) {
            throw new Error(`GameObject: sector is required for object ${config.id}`);
        }
        if (!config.position || typeof config.position.x !== 'number') {
            throw new Error(`GameObject: valid position {x, y, z} is required for object ${config.id}`);
        }
    }

    // ==================== GETTERS (Immutable Properties) ====================

    /** Unique identifier - never changes */
    get id() {
        return this._id;
    }

    /** Object type (star, planet, moon, station, beacon, ship) - never changes */
    get type() {
        return this._type;
    }

    /** Display name - never changes */
    get name() {
        return this._name;
    }

    /** Current sector - never changes for this instance */
    get sector() {
        return this._sector;
    }

    // ==================== GETTERS/SETTERS (Static Properties) ====================

    /** Faction owning this object */
    get faction() {
        return this._faction;
    }

    set faction(value) {
        const oldValue = this._faction;
        this._faction = value;
        this._notifyChange('faction', oldValue, value);
    }

    /** Classification/subtype (e.g., 'Class-M' for planets) */
    get classification() {
        return this._classification;
    }

    set classification(value) {
        this._classification = value;
    }

    // ==================== GETTERS/SETTERS (Mutable Properties) ====================

    /** Position in 3D space */
    get position() {
        return { ...this._position }; // Return copy to prevent mutation
    }

    set position(value) {
        if (!value || typeof value.x !== 'number') {
            debug('P1', `ASSERTION FAILED: Invalid position set on GameObject ${this._id}`);
            return;
        }
        const oldValue = { ...this._position };
        this._position = { x: value.x, y: value.y, z: value.z };
        this._notifyChange('position', oldValue, this._position);

        // Sync with Three.js object if linked
        if (this._threeObject) {
            this._threeObject.position.set(value.x, value.y, value.z);
        }
    }

    /** Whether the player has discovered this object */
    get discovered() {
        return this._discovered;
    }

    set discovered(value) {
        const oldValue = this._discovered;
        this._discovered = !!value;
        this._notifyChange('discovered', oldValue, this._discovered);
    }

    /** Reference to Three.js mesh */
    get threeObject() {
        return this._threeObject;
    }

    set threeObject(value) {
        this._threeObject = value;
        if (value) {
            // Sync Three.js object with our data
            value.userData.gameObject = this;
            value.userData.gameObjectId = this._id;
        }
    }

    // ==================== COMPUTED PROPERTIES ====================

    /**
     * Get diplomacy status for this object based on player's faction standings
     * Computed property - queries FactionStandingsManager
     * @returns {string} 'enemy' | 'neutral' | 'friendly' | 'unknown'
     */
    get diplomacy() {
        // Stars are always neutral
        if (this._type === GameObjectType.STAR) {
            return 'neutral';
        }

        // Undiscovered objects have unknown diplomacy
        if (!this._discovered) {
            return 'unknown';
        }

        // No faction means neutral
        if (!this._faction) {
            return 'neutral';
        }

        // Query FactionStandingsManager for player's standing with this faction
        // Import dynamically to avoid circular dependency
        try {
            const { FactionStandingsManager } = require('./FactionStandingsManager.js');
            return FactionStandingsManager.getDiplomacyStatus(this._faction);
        } catch (e) {
            // FactionStandingsManager not yet available - return based on faction name
            return this._getFallbackDiplomacy();
        }
    }

    /**
     * Fallback diplomacy resolution when FactionStandingsManager unavailable
     * @private
     */
    _getFallbackDiplomacy() {
        const FACTION_RELATIONS = {
            'Terran Republic Alliance': 'friendly',
            'Zephyrian Collective': 'friendly',
            'Scientists Consortium': 'friendly',
            'Free Trader Consortium': 'neutral',
            'Nexus Corporate Syndicate': 'neutral',
            'Ethereal Wanderers': 'neutral',
            'Draconis Imperium': 'neutral',
            'Crimson Raider Clans': 'enemy',
            'Shadow Consortium': 'enemy',
            'Void Cult': 'enemy',
            'Neutral': 'neutral'
        };
        return FACTION_RELATIONS[this._faction] || 'neutral';
    }

    /**
     * Check if this object is hostile to the player
     * @returns {boolean}
     */
    get isHostile() {
        return this.diplomacy === 'enemy';
    }

    /**
     * Check if this object is friendly to the player
     * @returns {boolean}
     */
    get isFriendly() {
        return this.diplomacy === 'friendly';
    }

    // ==================== METADATA ====================

    /**
     * Get metadata value
     * @param {string} key - Metadata key
     * @returns {*} Metadata value
     */
    getMeta(key) {
        return this._metadata[key];
    }

    /**
     * Set metadata value
     * @param {string} key - Metadata key
     * @param {*} value - Metadata value
     */
    setMeta(key, value) {
        this._metadata[key] = value;
    }

    /**
     * Get all metadata
     * @returns {Object} Copy of metadata
     */
    getAllMeta() {
        return { ...this._metadata };
    }

    // ==================== EVENT LISTENERS ====================

    /**
     * Subscribe to property changes
     * @param {string} property - Property name to watch
     * @param {Function} callback - Callback(oldValue, newValue, gameObject)
     * @returns {Function} Unsubscribe function
     */
    onChange(property, callback) {
        if (!this._listeners.has(property)) {
            this._listeners.set(property, new Set());
        }
        this._listeners.get(property).add(callback);

        // Return unsubscribe function
        return () => {
            this._listeners.get(property)?.delete(callback);
        };
    }

    /**
     * Notify listeners of property change
     * @private
     */
    _notifyChange(property, oldValue, newValue) {
        const listeners = this._listeners.get(property);
        if (listeners) {
            for (const callback of listeners) {
                try {
                    callback(oldValue, newValue, this);
                } catch (e) {
                    debug('P1', `Error in GameObject change listener for ${property}:`, e);
                }
            }
        }
    }

    // ==================== SERIALIZATION ====================

    /**
     * Convert to plain object for serialization
     * @returns {Object}
     */
    toJSON() {
        return {
            id: this._id,
            type: this._type,
            name: this._name,
            sector: this._sector,
            faction: this._faction,
            classification: this._classification,
            position: { ...this._position },
            discovered: this._discovered,
            metadata: { ...this._metadata }
        };
    }

    /**
     * Create GameObject from serialized data
     * @param {Object} data - Serialized data
     * @returns {GameObject}
     */
    static fromJSON(data) {
        const obj = new GameObject({
            id: data.id,
            type: data.type,
            name: data.name,
            sector: data.sector,
            faction: data.faction,
            classification: data.classification,
            position: data.position,
            discovered: data.discovered
        });
        if (data.metadata) {
            obj._metadata = { ...data.metadata };
        }
        return obj;
    }

    // ==================== UTILITY ====================

    /**
     * Calculate distance to another position
     * @param {Object} position - Target position {x, y, z}
     * @returns {number} Distance in game units
     */
    distanceTo(position) {
        const dx = this._position.x - position.x;
        const dy = this._position.y - position.y;
        const dz = this._position.z - position.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * String representation
     * @returns {string}
     */
    toString() {
        return `GameObject(${this._type}:${this._name}@${this._sector})`;
    }
}
