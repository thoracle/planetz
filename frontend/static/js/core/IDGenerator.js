/**
 * IDGenerator - Consistent ID generation for game objects
 *
 * Part of the GameObject Factory Pattern refactor.
 * Provides unique, deterministic IDs for all game objects.
 *
 * ID Format: {type}_{sector}_{index}_{timestamp}
 * Example: "planet_A0_3_1704567890123"
 */

import { debug } from '../debug.js';

/**
 * Singleton ID generator for consistent game object identification
 */
class IDGeneratorClass {
    constructor() {
        this._counters = new Map();
        this._usedIds = new Set();
    }

    /**
     * Generate a unique ID for a game object
     * @param {string} type - Object type (planet, moon, station, beacon, ship)
     * @param {string} sector - Current sector (e.g., 'A0', 'B1')
     * @param {string} [name] - Optional name for more readable IDs
     * @returns {string} Unique object ID
     */
    generate(type, sector, name = null) {
        if (!type) {
            debug('P1', 'ASSERTION FAILED: IDGenerator.generate called without type');
            throw new Error('IDGenerator.generate requires a type parameter');
        }

        if (!sector) {
            debug('P1', 'ASSERTION FAILED: IDGenerator.generate called without sector');
            throw new Error('IDGenerator.generate requires a sector parameter');
        }

        // Get next counter for this type+sector combination
        const counterKey = `${type}_${sector}`;
        const counter = this._counters.get(counterKey) || 0;
        this._counters.set(counterKey, counter + 1);

        // Build ID components
        let id;
        if (name) {
            // Use name slug for readable IDs
            const nameSlug = this._slugify(name);
            id = `${type}_${sector}_${nameSlug}`;
        } else {
            // Use counter for anonymous objects
            id = `${type}_${sector}_${counter}`;
        }

        // Ensure uniqueness with timestamp suffix if collision
        if (this._usedIds.has(id)) {
            id = `${id}_${Date.now()}`;
        }

        this._usedIds.add(id);
        return id;
    }

    /**
     * Generate a deterministic ID from existing data
     * Used for objects that already have identifying information
     * @param {string} type - Object type
     * @param {string} sector - Current sector
     * @param {string} name - Object name (required for deterministic ID)
     * @returns {string} Deterministic object ID
     */
    generateDeterministic(type, sector, name) {
        if (!type || !sector || !name) {
            debug('P1', 'ASSERTION FAILED: generateDeterministic requires type, sector, and name');
            throw new Error('generateDeterministic requires type, sector, and name parameters');
        }

        const nameSlug = this._slugify(name);
        const id = `${type}_${sector}_${nameSlug}`;

        // Track usage but don't enforce uniqueness for deterministic IDs
        // (same object should get same ID)
        this._usedIds.add(id);
        return id;
    }

    /**
     * Check if an ID has been used
     * @param {string} id - ID to check
     * @returns {boolean} True if ID exists
     */
    exists(id) {
        return this._usedIds.has(id);
    }

    /**
     * Register an existing ID (for backward compatibility with legacy objects)
     * @param {string} id - ID to register
     */
    register(id) {
        this._usedIds.add(id);
    }

    /**
     * Clear all tracked IDs (used when changing sectors)
     * @param {string} [sector] - Optional sector to clear, or all if not specified
     */
    clear(sector = null) {
        if (sector) {
            // Clear only IDs for specific sector
            const prefix = `_${sector}_`;
            for (const id of this._usedIds) {
                if (id.includes(prefix)) {
                    this._usedIds.delete(id);
                }
            }
            // Clear counters for this sector
            for (const key of this._counters.keys()) {
                if (key.endsWith(`_${sector}`)) {
                    this._counters.delete(key);
                }
            }
        } else {
            // Clear all
            this._usedIds.clear();
            this._counters.clear();
        }
    }

    /**
     * Convert a name to a URL-safe slug
     * @private
     */
    _slugify(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    /**
     * Get statistics about generated IDs
     * @returns {Object} ID generation stats
     */
    getStats() {
        return {
            totalIds: this._usedIds.size,
            countersByType: Object.fromEntries(this._counters)
        };
    }
}

// Singleton instance
export const IDGenerator = new IDGeneratorClass();

// Also export the class for testing
export { IDGeneratorClass };
