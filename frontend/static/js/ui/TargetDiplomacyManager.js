/**
 * TargetDiplomacyManager
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Handles faction and diplomacy resolution for targets.
 *
 * Features:
 * - Faction to diplomacy status mapping via FactionStandingsManager
 * - Target diplomacy resolution with discovery integration
 * - Special handling for stars, ships, stations, beacons
 * - GameObject.diplomacy preferred when available (Phase 3)
 * - Fallback diplomacy logic based on target type
 */

import { debug } from '../debug.js';
import { FactionStandingsManager } from '../core/FactionStandingsManager.js';

// PHASE 6: Legacy FACTION_RELATIONS removed - now using FactionStandingsManager exclusively

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
     * PHASE 6: Uses FactionStandingsManager exclusively (single source of truth)
     * @param {string} faction - Faction name
     * @returns {string} Diplomacy status ('friendly', 'neutral', 'enemy')
     */
    getFactionDiplomacy(faction) {
        // Null/undefined faction defaults to neutral
        if (!faction) {
            debug('TARGETING', `getFactionDiplomacy: null/undefined faction, defaulting to 'neutral'`);
            return 'neutral';
        }

        // PHASE 6: FactionStandingsManager is the single source of truth
        const diplomacy = FactionStandingsManager.getDiplomacyStatus(faction);
        if (diplomacy) {
            return diplomacy;
        }

        // Unknown faction - log and return neutral
        debug('TARGETING', `getFactionDiplomacy: Unknown faction "${faction}", defaulting to 'neutral'`);
        return 'neutral';
    }

    /**
     * Get diplomacy status for any target type with consistent fallback logic
     * PHASE 3: Now prefers GameObject.diplomacy when available
     * @param {Object} targetData - Target data object
     * @returns {string} Diplomacy status ('enemy', 'friendly', 'neutral', 'unknown')
     */
    getTargetDiplomacy(targetData) {
        // PHASE 0 ASSERTION: Fail fast if targetData is null
        // This surfaces bugs where callers pass invalid data instead of masking with 'unknown'
        if (!targetData) {
            debug('P1', 'ASSERTION FAILED: getTargetDiplomacy called with null/undefined targetData. Fix calling code.');
            return 'unknown'; // Keep fallback during transition
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

        // PHASE 3: Try GameObject.diplomacy first (single source of truth)
        // This uses FactionStandingsManager internally for dynamic diplomacy
        const gameObject = targetData.gameObject ||
                          targetData.object?.userData?.gameObject ||
                          targetData.userData?.gameObject;
        if (gameObject && typeof gameObject.diplomacy === 'string') {
            // Update GameObject's discovered state if needed
            if (!gameObject.discovered && isDiscovered) {
                gameObject.discovered = true;
            }
            const goDiplomacy = gameObject.diplomacy;
            if (goDiplomacy && goDiplomacy !== 'unknown') {
                return goDiplomacy;
            }
        }

        // PHASE 0 ASSERTION: Log discovered objects missing faction data
        // This helps identify data quality issues that should be fixed at the source
        if (!targetData.faction && !targetData.diplomacy && targetData.type !== 'star' && !gameObject) {
            debug('P1', 'ASSERTION WARNING: Discovered object missing faction/diplomacy and no GameObject:', {
                name: targetData.name,
                type: targetData.type,
                id: targetData.id || targetData.object?.uuid
            });
        }

        // LEGACY FALLBACK: For objects not yet migrated to GameObject pattern
        // This will be simplified in Phase 6

        // 1. Direct diplomacy property (highest priority)
        if (targetData.diplomacy && targetData.diplomacy !== 'unknown') {
            return targetData.diplomacy;
        }

        // 2. Faction-based diplomacy via FactionStandingsManager
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
