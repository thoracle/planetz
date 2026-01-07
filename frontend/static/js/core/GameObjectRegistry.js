/**
 * GameObjectRegistry - Central registry for all game objects
 *
 * Part of the GameObject Factory Pattern refactor.
 * Provides indexed access to game objects by ID, type, sector, and faction.
 *
 * Features:
 * - O(1) lookup by ID
 * - Indexed queries by type, sector, faction
 * - Automatic cleanup on sector change
 * - Event notifications for object add/remove
 */

import { debug } from '../debug.js';
import { GameObjectType } from './GameObject.js';

/**
 * Singleton registry for all game objects
 */
class GameObjectRegistryClass {
    constructor() {
        // Primary storage: ID -> GameObject
        this._objects = new Map();

        // Indexes for efficient queries
        this._byType = new Map();      // type -> Set<id>
        this._bySector = new Map();    // sector -> Set<id>
        this._byFaction = new Map();   // faction -> Set<id>

        // Track current sector
        this._currentSector = null;

        // Event listeners
        this._listeners = {
            add: new Set(),
            remove: new Set(),
            clear: new Set()
        };

        // Initialize type indexes
        for (const type of Object.values(GameObjectType)) {
            this._byType.set(type, new Set());
        }
    }

    // ==================== CRUD OPERATIONS ====================

    /**
     * Register a game object
     * @param {GameObject} gameObject - Object to register
     * @throws {Error} If object with same ID exists
     */
    register(gameObject) {
        if (!gameObject || !gameObject.id) {
            debug('P1', 'ASSERTION FAILED: register called with invalid gameObject');
            throw new Error('GameObjectRegistry.register requires a valid GameObject');
        }

        if (this._objects.has(gameObject.id)) {
            debug('P1', `ASSERTION WARNING: Duplicate registration attempt for ${gameObject.id}`);
            // Return existing object instead of throwing (allows re-registration)
            return this._objects.get(gameObject.id);
        }

        // Store in primary map
        this._objects.set(gameObject.id, gameObject);

        // Update indexes
        this._addToIndex(this._byType, gameObject.type, gameObject.id);
        this._addToIndex(this._bySector, gameObject.sector, gameObject.id);
        if (gameObject.faction) {
            this._addToIndex(this._byFaction, gameObject.faction, gameObject.id);
        }

        // Subscribe to faction changes
        gameObject.onChange('faction', (oldFaction, newFaction) => {
            if (oldFaction) {
                this._removeFromIndex(this._byFaction, oldFaction, gameObject.id);
            }
            if (newFaction) {
                this._addToIndex(this._byFaction, newFaction, gameObject.id);
            }
        });

        // Notify listeners
        this._notify('add', gameObject);

        debug('UTILITY', `Registered ${gameObject.type}: ${gameObject.name} (${gameObject.id})`);
        return gameObject;
    }

    /**
     * Unregister a game object
     * @param {string|GameObject} idOrObject - Object ID or GameObject instance
     * @returns {boolean} True if object was removed
     */
    unregister(idOrObject) {
        const id = typeof idOrObject === 'string' ? idOrObject : idOrObject?.id;
        if (!id) {
            return false;
        }

        const gameObject = this._objects.get(id);
        if (!gameObject) {
            return false;
        }

        // Remove from indexes
        this._removeFromIndex(this._byType, gameObject.type, id);
        this._removeFromIndex(this._bySector, gameObject.sector, id);
        if (gameObject.faction) {
            this._removeFromIndex(this._byFaction, gameObject.faction, id);
        }

        // Remove from primary map
        this._objects.delete(id);

        // Notify listeners
        this._notify('remove', gameObject);

        debug('UTILITY', `Unregistered ${gameObject.type}: ${gameObject.name} (${id})`);
        return true;
    }

    /**
     * Get a game object by ID
     * @param {string} id - Object ID
     * @returns {GameObject|null}
     */
    getById(id) {
        return this._objects.get(id) || null;
    }

    /**
     * Check if an object exists
     * @param {string} id - Object ID
     * @returns {boolean}
     */
    has(id) {
        return this._objects.has(id);
    }

    // ==================== QUERY METHODS ====================

    /**
     * Get all objects of a specific type
     * @param {string} type - Object type from GameObjectType
     * @returns {GameObject[]}
     */
    getByType(type) {
        const ids = this._byType.get(type);
        if (!ids) return [];
        return Array.from(ids).map(id => this._objects.get(id)).filter(Boolean);
    }

    /**
     * Get all objects in a specific sector
     * @param {string} sector - Sector code (e.g., 'A0', 'B1')
     * @returns {GameObject[]}
     */
    getBySector(sector) {
        const ids = this._bySector.get(sector);
        if (!ids) return [];
        return Array.from(ids).map(id => this._objects.get(id)).filter(Boolean);
    }

    /**
     * Get all objects owned by a specific faction
     * @param {string} faction - Faction name
     * @returns {GameObject[]}
     */
    getByFaction(faction) {
        const ids = this._byFaction.get(faction);
        if (!ids) return [];
        return Array.from(ids).map(id => this._objects.get(id)).filter(Boolean);
    }

    /**
     * Get all discovered objects
     * @param {string} [sector] - Optional sector filter
     * @returns {GameObject[]}
     */
    getDiscovered(sector = null) {
        let objects = sector ? this.getBySector(sector) : this.getAll();
        return objects.filter(obj => obj.discovered);
    }

    /**
     * Get all undiscovered objects
     * @param {string} [sector] - Optional sector filter
     * @returns {GameObject[]}
     */
    getUndiscovered(sector = null) {
        let objects = sector ? this.getBySector(sector) : this.getAll();
        return objects.filter(obj => !obj.discovered);
    }

    /**
     * Get all hostile objects
     * @param {string} [sector] - Optional sector filter
     * @returns {GameObject[]}
     */
    getHostile(sector = null) {
        let objects = sector ? this.getBySector(sector) : this.getAll();
        return objects.filter(obj => obj.isHostile);
    }

    /**
     * Get all friendly objects
     * @param {string} [sector] - Optional sector filter
     * @returns {GameObject[]}
     */
    getFriendly(sector = null) {
        let objects = sector ? this.getBySector(sector) : this.getAll();
        return objects.filter(obj => obj.isFriendly);
    }

    /**
     * Find objects matching a predicate
     * @param {Function} predicate - Function(gameObject) => boolean
     * @returns {GameObject[]}
     */
    find(predicate) {
        return Array.from(this._objects.values()).filter(predicate);
    }

    /**
     * Find first object matching a predicate
     * @param {Function} predicate - Function(gameObject) => boolean
     * @returns {GameObject|null}
     */
    findOne(predicate) {
        for (const obj of this._objects.values()) {
            if (predicate(obj)) return obj;
        }
        return null;
    }

    /**
     * Get all registered objects
     * @returns {GameObject[]}
     */
    getAll() {
        return Array.from(this._objects.values());
    }

    /**
     * Get count of registered objects
     * @returns {number}
     */
    get count() {
        return this._objects.size;
    }

    // ==================== SECTOR MANAGEMENT ====================

    /**
     * Set the current sector and optionally clear objects from other sectors
     * @param {string} sector - New current sector
     * @param {boolean} [clearOthers=false] - Whether to clear objects from other sectors
     */
    setCurrentSector(sector, clearOthers = false) {
        const previousSector = this._currentSector;
        this._currentSector = sector;

        if (clearOthers && previousSector && previousSector !== sector) {
            this.clearSector(previousSector);
        }

        debug('UTILITY', `Registry sector changed: ${previousSector || 'none'} -> ${sector}`);
    }

    /**
     * Get the current sector
     * @returns {string|null}
     */
    get currentSector() {
        return this._currentSector;
    }

    /**
     * Clear all objects in a specific sector
     * @param {string} sector - Sector to clear
     */
    clearSector(sector) {
        const ids = this._bySector.get(sector);
        if (!ids) return;

        // Create copy of IDs to avoid modification during iteration
        const idsToRemove = Array.from(ids);
        for (const id of idsToRemove) {
            this.unregister(id);
        }

        debug('UTILITY', `Cleared ${idsToRemove.length} objects from sector ${sector}`);
    }

    /**
     * Clear all objects
     */
    clearAll() {
        const count = this._objects.size;

        // Clear all storage
        this._objects.clear();
        for (const set of this._byType.values()) set.clear();
        this._bySector.clear();
        this._byFaction.clear();

        // Notify listeners
        this._notify('clear', null);

        debug('UTILITY', `Registry cleared: ${count} objects removed`);
    }

    // ==================== EVENT LISTENERS ====================

    /**
     * Subscribe to registry events
     * @param {'add'|'remove'|'clear'} event - Event type
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    on(event, callback) {
        if (!this._listeners[event]) {
            debug('P1', `Unknown registry event type: ${event}`);
            return () => {};
        }

        this._listeners[event].add(callback);
        return () => this._listeners[event].delete(callback);
    }

    /**
     * Notify listeners of an event
     * @private
     */
    _notify(event, data) {
        for (const callback of this._listeners[event]) {
            try {
                callback(data);
            } catch (e) {
                debug('P1', `Error in registry listener for ${event}:`, e);
            }
        }
    }

    // ==================== INDEX HELPERS ====================

    /**
     * Add to index
     * @private
     */
    _addToIndex(index, key, id) {
        if (!index.has(key)) {
            index.set(key, new Set());
        }
        index.get(key).add(id);
    }

    /**
     * Remove from index
     * @private
     */
    _removeFromIndex(index, key, id) {
        const set = index.get(key);
        if (set) {
            set.delete(id);
            if (set.size === 0) {
                index.delete(key);
            }
        }
    }

    // ==================== DEBUG/STATS ====================

    /**
     * Get registry statistics
     * @returns {Object}
     */
    getStats() {
        const stats = {
            total: this._objects.size,
            currentSector: this._currentSector,
            byType: {},
            bySector: {},
            byFaction: {}
        };

        for (const [type, ids] of this._byType) {
            if (ids.size > 0) stats.byType[type] = ids.size;
        }
        for (const [sector, ids] of this._bySector) {
            stats.bySector[sector] = ids.size;
        }
        for (const [faction, ids] of this._byFaction) {
            stats.byFaction[faction] = ids.size;
        }

        return stats;
    }

    /**
     * Log registry contents for debugging
     */
    dump() {
        debug('UTILITY', 'GameObjectRegistry dump:', this.getStats());
        for (const obj of this._objects.values()) {
            debug('UTILITY', `  ${obj.toString()}`);
        }
    }
}

// Singleton instance
export const GameObjectRegistry = new GameObjectRegistryClass();

// Also export the class for testing
export { GameObjectRegistryClass };
