/**
 * FactionStandingsManager - Centralized player faction reputation
 *
 * Part of the GameObject Factory Pattern refactor.
 * Single source of truth for player's standing with all factions.
 *
 * Standing Range: -100 (hostile) to +100 (allied)
 * Diplomacy Thresholds:
 *   - Enemy:    -100 to -25
 *   - Neutral:   -25 to +25
 *   - Friendly:  +25 to +100
 */

import { debug } from '../debug.js';

/**
 * All known factions in the game
 */
export const Factions = {
    TERRAN_REPUBLIC: 'Terran Republic Alliance',
    ZEPHYRIAN: 'Zephyrian Collective',
    SCIENTISTS: 'Scientists Consortium',
    FREE_TRADERS: 'Free Trader Consortium',
    NEXUS_CORP: 'Nexus Corporate Syndicate',
    ETHEREAL: 'Ethereal Wanderers',
    DRACONIS: 'Draconis Imperium',
    CRIMSON_RAIDERS: 'Crimson Raider Clans',
    SHADOW: 'Shadow Consortium',
    VOID_CULT: 'Void Cult',
    NEUTRAL: 'Neutral'
};

/**
 * Diplomacy status values
 */
export const DiplomacyStatus = {
    ENEMY: 'enemy',
    NEUTRAL: 'neutral',
    FRIENDLY: 'friendly'
};

/**
 * Standing thresholds for diplomacy status
 */
const DIPLOMACY_THRESHOLDS = {
    ENEMY_MAX: -25,     // Below this is enemy
    FRIENDLY_MIN: 25    // Above this is friendly
};

/**
 * Default starting standings for all factions
 */
const DEFAULT_STANDINGS = {
    [Factions.TERRAN_REPUBLIC]: 50,    // Player's faction - friendly
    [Factions.ZEPHYRIAN]: 30,          // Allies - friendly
    [Factions.SCIENTISTS]: 25,          // Allies - friendly
    [Factions.FREE_TRADERS]: 0,         // Neutral
    [Factions.NEXUS_CORP]: 0,           // Neutral
    [Factions.ETHEREAL]: 0,             // Neutral
    [Factions.DRACONIS]: -10,           // Slightly hostile
    [Factions.CRIMSON_RAIDERS]: -50,    // Hostile
    [Factions.SHADOW]: -60,             // Hostile
    [Factions.VOID_CULT]: -75,          // Very hostile
    [Factions.NEUTRAL]: 0               // Always neutral
};

/**
 * Singleton manager for player faction standings
 */
class FactionStandingsManagerClass {
    constructor() {
        // Current standings: faction -> number (-100 to +100)
        this._standings = new Map();

        // Standing change history for audit/debugging
        this._history = [];
        this._maxHistoryLength = 100;

        // Event listeners
        this._listeners = new Set();

        // Initialize with default standings
        this.reset();
    }

    // ==================== CORE STANDING OPERATIONS ====================

    /**
     * Get the player's standing with a faction
     * @param {string} faction - Faction name
     * @returns {number} Standing value (-100 to +100)
     */
    getStanding(faction) {
        if (!faction) return 0;

        // Normalize faction name (case-insensitive lookup)
        const normalizedFaction = this._normalizeFaction(faction);
        if (!normalizedFaction) {
            debug('P1', `ASSERTION WARNING: Unknown faction "${faction}"`);
            return 0;
        }

        return this._standings.get(normalizedFaction) ?? 0;
    }

    /**
     * Get diplomacy status for a faction
     * @param {string} faction - Faction name
     * @returns {'enemy'|'neutral'|'friendly'} Diplomacy status
     */
    getDiplomacyStatus(faction) {
        // Neutral faction is always neutral
        if (!faction || faction === Factions.NEUTRAL || faction === 'Neutral') {
            return DiplomacyStatus.NEUTRAL;
        }

        const standing = this.getStanding(faction);

        if (standing <= DIPLOMACY_THRESHOLDS.ENEMY_MAX) {
            return DiplomacyStatus.ENEMY;
        }
        if (standing >= DIPLOMACY_THRESHOLDS.FRIENDLY_MIN) {
            return DiplomacyStatus.FRIENDLY;
        }
        return DiplomacyStatus.NEUTRAL;
    }

    /**
     * Modify standing with a faction
     * @param {string} faction - Faction name
     * @param {number} delta - Amount to change (-100 to +100)
     * @param {string} [reason] - Reason for change (for logging)
     * @returns {Object} { oldStanding, newStanding, diplomacyChanged }
     */
    modifyStanding(faction, delta, reason = 'unknown') {
        if (!faction || faction === Factions.NEUTRAL) {
            return { oldStanding: 0, newStanding: 0, diplomacyChanged: false };
        }

        const normalizedFaction = this._normalizeFaction(faction);
        if (!normalizedFaction) {
            debug('P1', `Cannot modify standing: unknown faction "${faction}"`);
            return { oldStanding: 0, newStanding: 0, diplomacyChanged: false };
        }

        const oldStanding = this._standings.get(normalizedFaction) ?? 0;
        const oldDiplomacy = this._standingToDiplomacy(oldStanding);

        // Calculate new standing, clamped to [-100, 100]
        const newStanding = Math.max(-100, Math.min(100, oldStanding + delta));
        this._standings.set(normalizedFaction, newStanding);

        const newDiplomacy = this._standingToDiplomacy(newStanding);
        const diplomacyChanged = oldDiplomacy !== newDiplomacy;

        // Log the change
        this._recordChange({
            faction: normalizedFaction,
            oldStanding,
            newStanding,
            delta,
            reason,
            diplomacyChanged,
            timestamp: Date.now()
        });

        // Notify listeners
        this._notifyChange({
            faction: normalizedFaction,
            oldStanding,
            newStanding,
            oldDiplomacy,
            newDiplomacy,
            reason
        });

        debug('FACTION', `Standing changed: ${normalizedFaction} ${oldStanding} -> ${newStanding} (${reason})`);

        return { oldStanding, newStanding, diplomacyChanged };
    }

    /**
     * Set standing to a specific value
     * @param {string} faction - Faction name
     * @param {number} value - New standing value (-100 to +100)
     * @param {string} [reason] - Reason for change
     */
    setStanding(faction, value, reason = 'set') {
        const normalizedFaction = this._normalizeFaction(faction);
        if (!normalizedFaction) return;

        const oldStanding = this._standings.get(normalizedFaction) ?? 0;
        const delta = value - oldStanding;
        this.modifyStanding(faction, delta, reason);
    }

    // ==================== BULK OPERATIONS ====================

    /**
     * Get all standings as an object
     * @returns {Object} faction -> standing
     */
    getAllStandings() {
        const result = {};
        for (const [faction, standing] of this._standings) {
            result[faction] = standing;
        }
        return result;
    }

    /**
     * Get all diplomacy statuses
     * @returns {Object} faction -> diplomacy status
     */
    getAllDiplomacy() {
        const result = {};
        for (const faction of this._standings.keys()) {
            result[faction] = this.getDiplomacyStatus(faction);
        }
        return result;
    }

    /**
     * Get all hostile factions
     * @returns {string[]} Array of hostile faction names
     */
    getHostileFactions() {
        return Array.from(this._standings.keys())
            .filter(f => this.getDiplomacyStatus(f) === DiplomacyStatus.ENEMY);
    }

    /**
     * Get all friendly factions
     * @returns {string[]} Array of friendly faction names
     */
    getFriendlyFactions() {
        return Array.from(this._standings.keys())
            .filter(f => this.getDiplomacyStatus(f) === DiplomacyStatus.FRIENDLY);
    }

    /**
     * Reset all standings to defaults
     */
    reset() {
        this._standings.clear();
        for (const [faction, standing] of Object.entries(DEFAULT_STANDINGS)) {
            this._standings.set(faction, standing);
        }
        this._history = [];
        debug('FACTION', 'Faction standings reset to defaults');
    }

    // ==================== PERSISTENCE ====================

    /**
     * Save standings to localStorage
     * @param {string} [key='factionStandings'] - Storage key
     */
    save(key = 'factionStandings') {
        try {
            const data = {
                standings: this.getAllStandings(),
                history: this._history.slice(-20), // Keep last 20 changes
                savedAt: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(data));
            debug('FACTION', 'Faction standings saved');
        } catch (e) {
            debug('P1', 'Failed to save faction standings:', e);
        }
    }

    /**
     * Load standings from localStorage
     * @param {string} [key='factionStandings'] - Storage key
     * @returns {boolean} True if loaded successfully
     */
    load(key = 'factionStandings') {
        try {
            const stored = localStorage.getItem(key);
            if (!stored) return false;

            const data = JSON.parse(stored);
            if (!data.standings) return false;

            // Restore standings
            this._standings.clear();
            for (const [faction, standing] of Object.entries(data.standings)) {
                const normalizedFaction = this._normalizeFaction(faction);
                if (normalizedFaction) {
                    this._standings.set(normalizedFaction, standing);
                }
            }

            // Ensure all factions have a value
            for (const faction of Object.keys(DEFAULT_STANDINGS)) {
                if (!this._standings.has(faction)) {
                    this._standings.set(faction, DEFAULT_STANDINGS[faction]);
                }
            }

            // Restore history
            if (data.history) {
                this._history = data.history;
            }

            debug('FACTION', 'Faction standings loaded');
            return true;
        } catch (e) {
            debug('P1', 'Failed to load faction standings:', e);
            return false;
        }
    }

    // ==================== EVENT LISTENERS ====================

    /**
     * Subscribe to standing changes
     * @param {Function} callback - Function({ faction, oldStanding, newStanding, oldDiplomacy, newDiplomacy, reason })
     * @returns {Function} Unsubscribe function
     */
    onStandingChanged(callback) {
        this._listeners.add(callback);
        return () => this._listeners.delete(callback);
    }

    /**
     * Notify listeners of standing change
     * @private
     */
    _notifyChange(change) {
        for (const callback of this._listeners) {
            try {
                callback(change);
            } catch (e) {
                debug('P1', 'Error in standing change listener:', e);
            }
        }
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Normalize faction name for consistent lookup
     * @private
     */
    _normalizeFaction(faction) {
        if (!faction) return null;

        // Direct match
        if (DEFAULT_STANDINGS.hasOwnProperty(faction)) {
            return faction;
        }

        // Case-insensitive match
        const lowerFaction = faction.toLowerCase();
        for (const knownFaction of Object.keys(DEFAULT_STANDINGS)) {
            if (knownFaction.toLowerCase() === lowerFaction) {
                return knownFaction;
            }
        }

        return null;
    }

    /**
     * Convert standing value to diplomacy status
     * @private
     */
    _standingToDiplomacy(standing) {
        if (standing <= DIPLOMACY_THRESHOLDS.ENEMY_MAX) return DiplomacyStatus.ENEMY;
        if (standing >= DIPLOMACY_THRESHOLDS.FRIENDLY_MIN) return DiplomacyStatus.FRIENDLY;
        return DiplomacyStatus.NEUTRAL;
    }

    /**
     * Record a standing change in history
     * @private
     */
    _recordChange(change) {
        this._history.push(change);
        if (this._history.length > this._maxHistoryLength) {
            this._history.shift();
        }
    }

    /**
     * Get standing change history
     * @param {number} [limit=20] - Number of recent changes to return
     * @returns {Array} Recent standing changes
     */
    getHistory(limit = 20) {
        return this._history.slice(-limit);
    }

    /**
     * Get statistics about faction standings
     * @returns {Object}
     */
    getStats() {
        return {
            totalFactions: this._standings.size,
            hostile: this.getHostileFactions().length,
            friendly: this.getFriendlyFactions().length,
            neutral: this._standings.size - this.getHostileFactions().length - this.getFriendlyFactions().length,
            recentChanges: this._history.length
        };
    }
}

// Singleton instance
export const FactionStandingsManager = new FactionStandingsManagerClass();

// Also export the class for testing
export { FactionStandingsManagerClass };
