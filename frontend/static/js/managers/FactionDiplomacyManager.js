/**
 * FactionDiplomacyManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles faction relationship lookups and AI manager initialization.
 *
 * Features:
 * - Convert faction name to diplomacy status
 * - Initialize enemy AI manager
 */

import { debug } from '../debug.js';

// Faction relationship mappings (matches AmbientShipManager.js)
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
     * @param {string} faction - Faction name
     * @returns {string} Diplomacy status ('friendly', 'neutral', 'enemy')
     */
    getFactionDiplomacy(faction) {
        if (!faction) return 'neutral';
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
