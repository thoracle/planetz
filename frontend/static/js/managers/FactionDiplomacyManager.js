/**
 * FactionDiplomacyManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles faction relationship lookups and AI manager initialization.
 *
 * Features:
 * - Convert faction name to diplomacy status via FactionStandingsManager
 * - Initialize enemy AI manager
 *
 * PHASE 5: Now delegates to FactionStandingsManager for dynamic standings
 */

import { debug } from '../debug.js';
import { FactionStandingsManager } from '../core/FactionStandingsManager.js';

// LEGACY: Kept for backward compatibility - will be removed in Phase 6
// FactionStandingsManager is now the single source of truth
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
    'Void Cult': 'enemy'
};

export class FactionDiplomacyManager {
    /**
     * Create a FactionDiplomacyManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
    }

    /**
     * Convert faction name to diplomacy status
     * PHASE 5: Now uses FactionStandingsManager as primary source
     * @param {string} faction - Faction name
     * @returns {string} Diplomacy status ('friendly', 'neutral', 'enemy')
     */
    getFactionDiplomacy(faction) {
        if (!faction) return 'neutral';

        // PHASE 5: Use FactionStandingsManager as primary source (dynamic standings)
        try {
            const diplomacy = FactionStandingsManager.getDiplomacyStatus(faction);
            if (diplomacy) {
                return diplomacy;
            }
        } catch (e) {
            debug('FACTION', `FactionStandingsManager lookup failed for "${faction}": ${e.message}`);
        }

        // LEGACY FALLBACK: Static relations (will be removed in Phase 6)
        return FACTION_RELATIONS[faction] || 'neutral';
    }

    /**
     * Initialize the enemy AI manager
     */
    async initializeAIManager() {
        try {
            if (this.sfm.enemyAIManager) {
                await this.sfm.enemyAIManager.initialize();
                debug('UTILITY', 'Enemy AI system ready');
            }
        } catch (error) {
            debug('P1', `❌ Failed to initialize AI manager: ${error}`);
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.sfm = null;
    }
}
