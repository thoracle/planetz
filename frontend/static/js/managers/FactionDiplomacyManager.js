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
 * PHASE 6: Uses FactionStandingsManager exclusively (single source of truth)
 */

import { debug } from '../debug.js';
import { FactionStandingsManager } from '../core/FactionStandingsManager.js';

// PHASE 6: Legacy FACTION_RELATIONS removed - now using FactionStandingsManager exclusively

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
     * PHASE 6: Uses FactionStandingsManager exclusively (single source of truth)
     * @param {string} faction - Faction name
     * @returns {string} Diplomacy status ('friendly', 'neutral', 'enemy')
     */
    getFactionDiplomacy(faction) {
        if (!faction) return 'neutral';

        // PHASE 6: FactionStandingsManager is the single source of truth
        const diplomacy = FactionStandingsManager.getDiplomacyStatus(faction);
        return diplomacy || 'neutral';
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
