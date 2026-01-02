/**
 * TargetDiplomacyManager
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Handles faction and diplomacy resolution for targets.
 *
 * Features:
 * - Faction to diplomacy status mapping
 * - Target diplomacy resolution with discovery integration
 * - Special handling for stars, ships, stations, beacons
 * - Fallback diplomacy logic based on target type
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

export class TargetDiplomacyManager {
    /**
     * Create a TargetDiplomacyManager
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;
    }

    /**
     * Convert faction name to diplomacy status
     * @param {string} faction - Faction name
     * @returns {string} Diplomacy status ('friendly', 'neutral', 'enemy')
     */
    getFactionDiplomacy(faction) {
        // Log null/undefined faction for debugging (data quality issue)
        if (!faction) {
            debug('TARGETING', `getFactionDiplomacy: null/undefined faction, defaulting to 'neutral'`);
            return 'neutral';
        }

        // Case-insensitive lookup: find faction by comparing lowercase versions
        const factionKey = Object.keys(FACTION_RELATIONS).find(key =>
            key.toLowerCase() === faction.toLowerCase()
        );

        // Log unknown faction for debugging (possible typo or missing faction)
        if (!factionKey) {
            debug('TARGETING', `getFactionDiplomacy: Unknown faction "${faction}", defaulting to 'neutral'`);
            return 'neutral';
        }

        return FACTION_RELATIONS[factionKey];
    }

    /**
     * Get diplomacy status for any target type with consistent fallback logic
     * @param {Object} targetData - Target data object
     * @returns {string} Diplomacy status ('enemy', 'friendly', 'neutral', 'unknown')
     */
    getTargetDiplomacy(targetData) {
        if (!targetData) {
            return 'unknown';
        }

        // SPECIAL CASE: Stars always show as neutral regardless of faction or diplomacy properties
        // This ensures consistent yellow coloring across HUD, wireframe, and direction arrows
        if (targetData.type === 'star') {
            return 'neutral';
        }

        // DISCOVERY COLOR FIX: Check if object is discovered first
        const isDiscovered = targetData.isShip || this.tcm.isObjectDiscovered(targetData);

        if (!isDiscovered) {
            // Undiscovered objects should have unknown diplomacy
            return 'unknown';
        }

        // For DISCOVERED objects, determine proper faction standing
        // 1. Direct diplomacy property (highest priority)
        if (targetData.diplomacy && targetData.diplomacy !== 'unknown') {
            return targetData.diplomacy;
        }

        // 2. Faction-based diplomacy
        // Skip 'Unknown' faction (placeholder for undiscovered objects) - let it fall through to step 4.5
        if (targetData.faction && targetData.faction !== 'Unknown') {
            const factionDiplomacy = this.getFactionDiplomacy(targetData.faction);
            if (factionDiplomacy && factionDiplomacy !== 'unknown') {
                return factionDiplomacy;
            }
        }

        // 3. Ship diplomacy (for ship targets)
        if (targetData.ship?.diplomacy) {
            return targetData.ship.diplomacy;
        }

        // 4. Celestial body info diplomacy (for planets, stations, etc.)
        const info = this.tcm.solarSystemManager?.getCelestialBodyInfo(targetData.object || targetData);
        if (info?.diplomacy) {
            return info.diplomacy;
        }

        // 4.5. Celestial body faction (especially important for stations!)
        // This catches stations with faction data that don't have explicit diplomacy property
        if (info?.faction) {
            const factionDiplomacy = this.getFactionDiplomacy(info.faction);
            if (factionDiplomacy && factionDiplomacy !== 'unknown') {
                return factionDiplomacy;
            }
        }

        // 5. Default logic for discovered objects based on type
        // Only use these defaults if no faction/diplomacy data was found above
        if (targetData.type === 'station') {
            return 'neutral'; // Stations without faction data default to neutral
        }

        if (targetData.type === 'planet' || targetData.type === 'moon') {
            return 'neutral'; // Planets/moons are neutral
        }

        if (targetData.type === 'beacon' || targetData.type === 'navigation_beacon') {
            return 'neutral'; // Beacons are neutral
        }

        if (targetData.isShip) {
            return 'unknown'; // Ships need proper faction data
        }

        // Default for other discovered objects
        return 'neutral';
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // No resources to dispose
    }
}
