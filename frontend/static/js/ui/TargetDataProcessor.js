/**
 * TargetDataProcessor
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Handles target data retrieval and standardization.
 *
 * Features:
 * - Current target data lookup with multiple matching strategies
 * - Target data normalization to standardized format
 * - Discovery status integration
 * - Special handling for ships, waypoints, beacons, stars
 * - PHASE 3: Includes GameObject reference when available
 */

import { debug } from '../debug.js';

export class TargetDataProcessor {
    /**
     * Create a TargetDataProcessor
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;

        // Rate limiting for warnings
        this.lastTargetNotFoundWarning = 0;
    }

    /**
     * Get current target data
     * Finds the current target in targetObjects and returns processed data
     * @returns {Object|null} Processed target data or null
     */
    getCurrentTargetData() {
        // Debug logging for beacons (much less frequent)
        if (this.tcm.currentTarget?.name?.includes('Navigation Beacon') && Math.random() < 0.001) {
            debug('TARGETING', `getCurrentTargetData() called for beacon: ${this.tcm.currentTarget?.name}`, {
                targetIndex: this.tcm.targetIndex,
                targetObjectsLength: this.tcm.targetObjects.length
            });
        }

        if (!this.tcm.currentTarget) {
            return null;
        }

        // First, check if the current targetIndex is valid and matches currentTarget
        if (this.tcm.targetIndex >= 0 && this.tcm.targetIndex < this.tcm.targetObjects.length) {
            const targetData = this.tcm.targetObjects[this.tcm.targetIndex];
            if (window?.DEBUG_TCM) debug('TARGETING', `🔍 DEBUG: Checking targetIndex ${this.tcm.targetIndex}, targetData:`, targetData?.name || 'no name');
            if (targetData) {
                // For targets from addNonPhysicsTargets, the Three.js object is in targetData.object
                // For other targets, the targetData might be the object itself
                const matches = targetData === this.tcm.currentTarget ||
                    targetData.object === this.tcm.currentTarget ||
                    (targetData.object && targetData.object.uuid === this.tcm.currentTarget?.uuid) ||
                    targetData.name === this.tcm.currentTarget?.name;
                if (window?.DEBUG_TCM) debug('TARGETING', `🔍 DEBUG: Target match check - matches: ${matches}, targetData.name: ${targetData.name}, currentTarget.name: ${this.tcm.currentTarget?.name}`);
                if (matches) {
                    if (window?.DEBUG_TCM) debug('TARGETING', `🔍 DEBUG: Found matching target, processing...`);
                    return this.processTargetData(targetData);
                } else {
                    if (window?.DEBUG_TCM) debug('INSPECTION', `🔍 DEBUG: Index mismatch detected - finding correct index...`);
                    // Index mismatch detected - find correct index and fix it silently
                    const correctIndex = this.tcm.targetObjects.findIndex(target =>
                        target === this.tcm.currentTarget ||
                        target.object === this.tcm.currentTarget ||
                        (target.object && target.object.uuid === this.tcm.currentTarget?.uuid) ||
                        target.name === this.tcm.currentTarget?.name
                    );

                    if (correctIndex !== -1) {
                        this.tcm.targetIndex = correctIndex;
                        return this.processTargetData(this.tcm.targetObjects[correctIndex]);
                    }

                    // Rate limit debug output to prevent spam
                    if (Math.random() < 0.001) {
                        debug('TARGETING', `🔍 getCurrentTargetData: Index ${this.tcm.targetIndex} target mismatch - targetData: ${targetData.name}, currentTarget: ${this.tcm.currentTarget?.name}, type: ${typeof this.tcm.currentTarget}`);
                    }
                }
            }
        }

        // If current target is already a target data object, try to find it in the list
        if (this.tcm.currentTarget && typeof this.tcm.currentTarget === 'object') {
            for (let i = 0; i < this.tcm.targetObjects.length; i++) {
                const targetData = this.tcm.targetObjects[i];
                if (targetData) {
                    // More robust target matching - check multiple criteria
                    const isExactMatch = targetData === this.tcm.currentTarget;
                    const isObjectMatch = targetData.object === this.tcm.currentTarget;
                    const isUUIDMatch = targetData.object?.uuid && this.tcm.currentTarget.uuid && targetData.object.uuid === this.tcm.currentTarget.uuid;
                    const isNameTypeMatch = targetData.name === this.tcm.currentTarget.name && targetData.type === this.tcm.currentTarget.type;
                    const isIdMatch = targetData.id === this.tcm.currentTarget.id;

                    if (isExactMatch || isObjectMatch || isUUIDMatch || isNameTypeMatch || isIdMatch) {
                        // Update the index to match the found target
                        this.tcm.targetIndex = i;
                        this.tcm.currentTarget = targetData.object || targetData; // Ensure we have the original object, not processed target data
                        debug('TARGETING', `🔧 Fixed target index mismatch: set to ${i} for target ${targetData.name} (${isExactMatch ? 'exact' : isObjectMatch ? 'object' : isUUIDMatch ? 'uuid' : isIdMatch ? 'ID' : 'name/type'})`);

                        // Process and return the target data
                        const processedData = this.processTargetData(targetData);
                        if (window?.DEBUG_TCM) debug('TARGETING', `🔍 DEBUG: Returning processed data for ${targetData.name}:`, processedData);
                        return processedData;
                    }
                }
            }
        }

        // If we still can't find the target, it might have been destroyed or removed
        // Don't spam the console - only log occasionally
        const now = Date.now();
        if (!this.lastTargetNotFoundWarning || (now - this.lastTargetNotFoundWarning) > 5000) { // Only warn every 5 seconds
            debug('TARGETING', `⚠️ Current target not found in target list - may have been destroyed or updated`);
            this.lastTargetNotFoundWarning = now;
        }

        // For manual navigation selections (Star Charts/LRS), don't clear the target - return it directly
        if (this.tcm.isManualNavigationSelection && this.tcm.currentTarget && this.tcm.currentTarget.name && this.tcm.currentTarget.type) {
            // Rate limit debug output to prevent spam
            if (Math.random() < 0.001) {
                debug('TARGETING', `🎯 Using scanner target data directly: ${this.tcm.currentTarget.name}`);
            }
            return this.processTargetData(this.tcm.currentTarget);
        }

        // For manual selections (including Star Charts), try to use the current target directly
        if (this.tcm.isManualSelection && this.tcm.currentTarget && this.tcm.currentTarget.name) {
            debug('TARGETING', `🎯 Using manual selection target data directly: ${this.tcm.currentTarget.name}`, this.tcm.currentTarget);
            return this.processTargetData(this.tcm.currentTarget);
        }

        // SPECIAL CASE: Handle virtual waypoints that may not be in targetObjects yet
        if (this.tcm.currentTarget && (this.tcm.currentTarget.isWaypoint || this.tcm.currentTarget.isVirtual || this.tcm.currentTarget.type === 'waypoint')) {
            debug('WAYPOINTS', `🎯 Using virtual waypoint target data directly: ${this.tcm.currentTarget.name}`);
            return this.processTargetData(this.tcm.currentTarget);
        }

        // For Star Charts objects that may have lost their 3D position, try to preserve them
        // Check if this is a Star Charts object (has A0_ ID or is discovered)
        if (this.tcm.currentTarget && this.tcm.currentTarget.name) {
            const hasStarChartsId = this.tcm.currentTarget.id && this.tcm.currentTarget.id.toString().startsWith('A0_');
            const isDiscoveredObject = this.tcm.isObjectDiscovered(this.tcm.currentTarget);

            if (hasStarChartsId || isDiscoveredObject) {
                debug('TARGETING', `🎯 Preserving Star Charts object without 3D position: ${this.tcm.currentTarget.name}`);
                return this.processTargetData(this.tcm.currentTarget);
            }
        }

        // Clear the invalid target to prevent repeated warnings (only for non-scanner/non-manual/non-StarCharts targets)
        if (window?.DEBUG_TCM) debug('P1', `🔍 DEBUG: getCurrentTargetData() - clearing invalid target and returning null`);
        this.tcm.clearCurrentTarget();
        return null;
    }

    /**
     * PHASE 3: Find GameObject reference from various sources
     * @param {Object} targetData - Raw target data
     * @returns {Object|null} GameObject instance or null
     */
    _findGameObject(targetData) {
        // Try multiple sources for gameObject
        return targetData.gameObject ||
               targetData.object?.userData?.gameObject ||
               this.tcm.currentTarget?.userData?.gameObject ||
               null;
    }

    /**
     * Process target data and return standardized format
     * PHASE 3: Now includes gameObject reference when available
     * @param {Object} targetData - Raw target data
     * @returns {Object|null} Standardized target data
     */
    processTargetData(targetData) {
        if (!targetData) {
            return null;
        }

        // PHASE 3: Find GameObject reference early
        const gameObject = this._findGameObject(targetData);

        // Debug logging for beacons (much less frequent)
        if (targetData.name?.includes('Navigation Beacon') && Math.random() < 0.001) {
            debug('TARGETING', `processTargetData for beacon: ${targetData.name}`, {
                type: targetData.type,
                discovered: targetData.discovered,
                diplomacy: targetData.diplomacy,
                faction: targetData.faction,
                hasGameObject: !!gameObject,
                _isUndiscovered: targetData._isUndiscovered
            });
        }

        // For navigation beacons, check actual discovery status and apply appropriate properties
        if (targetData.type === 'navigation_beacon') {
            const actuallyDiscovered = this.tcm.isObjectDiscovered(targetData);
            if (!actuallyDiscovered) {
                // Beacon is undiscovered - apply unknown properties
                if (targetData.diplomacy !== 'unknown' || targetData.faction !== 'Unknown') {
                    try {
                        targetData.discovered = false;
                        targetData.diplomacy = 'unknown';
                        targetData.faction = 'Unknown';
                        debug('TARGETING', `Applied undiscovered properties to beacon: ${targetData.name}`);
                    } catch (e) {
                        // Ignore readonly property errors
                        if (e.message && !e.message.includes('readonly')) {
                            debug('P1', `🎯 Error setting undiscovered beacon properties: ${e}`);
                        }
                    }
                }
            } else {
                // Beacon is discovered - ensure it has proper faction properties
                try {
                    targetData.discovered = true;
                    // Only set neutral faction if no faction is already set
                    if (!targetData.faction || targetData.faction === 'Unknown') {
                        targetData.faction = 'Neutral';
                        targetData.diplomacy = 'neutral';
                        debug('TARGETING', `Applied discovered properties to beacon: ${targetData.name} (neutral faction)`);
                    }
                } catch (e) {
                    // Ignore readonly property errors
                    if (e.message && !e.message.includes('readonly')) {
                        debug('P1', `🎯 Error setting discovered beacon properties: ${e}`);
                    }
                }
            }
        }

        // CRITICAL: Ensure target data has proper Star Charts ID for consistent discovery checks
        // This MUST happen before any discovery status checks
        const constructedId = this.tcm.constructStarChartsId(targetData);
        if (constructedId && (!targetData.id || !targetData.id.toString().startsWith('A0_'))) {
            // Update the target data to use the proper Star Charts ID
            try {
                targetData.id = constructedId;
            } catch (e) {
                // Ignore readonly property errors
                if (e.message && !e.message.includes('readonly')) {
                    debug('P1', `🎯 Error setting target ID: ${e}`);
                }
            }
        }

        // Check discovery status for non-ship objects (now with proper ID)
        // Use same position validation logic as display update for consistency
        const hasValidPositionForStar = this.tcm.getTargetPosition(targetData) !== null;
        const isDiscovered = targetData.isShip || (this.tcm.isObjectDiscovered(targetData) && hasValidPositionForStar);

        // SPECIAL CASE: Stars should always show as neutral when discovered
        if (targetData.type === 'star' && isDiscovered) {
            try {
                targetData.discovered = true;
                targetData.diplomacy = 'neutral';
                targetData.faction = 'Neutral';
                // Rate limit Sol debug spam to prevent console flooding
                if (targetData.name === 'Sol' && Math.random() < 0.0001) {
                    debug('TARGETING', `Applied discovered properties to star: ${targetData.name} (neutral faction)`);
                }
            } catch (e) {
                // Ignore readonly property errors
                if (e.message && !e.message.includes('readonly')) {
                    debug('P1', `🎯 Error setting star properties: ${e}`);
                }
            }
        }

        // SPECIAL CASE: Handle waypoints first (before ship check)
        if (targetData.type === 'waypoint' || targetData.isWaypoint || targetData.isVirtual) {
            debug('WAYPOINTS', `🎯 Processing waypoint in processTargetData: ${targetData.name}`);
            return {
                object: this.tcm.currentTarget,
                name: targetData.name || 'Mission Waypoint',
                type: 'waypoint',
                isShip: false,
                isWaypoint: true,
                isVirtual: targetData.isVirtual || true,
                distance: targetData.distance || 0,
                faction: 'waypoint',
                diplomacy: 'waypoint',
                isDiscovered: true, // Waypoints are always "discovered" since they're mission targets
                gameObject: gameObject, // PHASE 3: Include GameObject reference
                ...targetData // Include all original properties
            };
        }

        // Check if this is a ship (either 'ship' or 'enemy_ship' type, or has isShip flag)
        if (targetData.type === 'ship' || targetData.type === 'enemy_ship' || targetData.isShip) {
            // Ensure we get the actual ship instance - try multiple sources
            let shipInstance = targetData.ship;

            // If no ship in targetData, try to get it from the object
            if (!shipInstance && targetData.object?.userData?.ship) {
                shipInstance = targetData.object.userData.ship;
            }

            // If still no ship, try from currentTarget (which should be the original mesh)
            if (!shipInstance && this.tcm.currentTarget?.userData?.ship) {
                shipInstance = this.tcm.currentTarget.userData.ship;
            }

            // For target dummies, ensure the ship instance is preserved
            if (!shipInstance && targetData.name?.includes('Target Dummy')) {
                // Try to find the ship from the target dummy list
                if (this.tcm.viewManager?.starfieldManager?.targetDummyShips) {
                    shipInstance = this.tcm.viewManager.starfieldManager.targetDummyShips.find(
                        dummy => dummy.shipName === targetData.name
                    );
                }
            }

            return {
                object: this.tcm.currentTarget,
                name: targetData.name || shipInstance?.shipName || this.tcm.currentTarget?.shipName || 'Enemy Ship',
                type: targetData.type || 'enemy_ship',
                isShip: true,
                ship: shipInstance || targetData.ship, // Don't fall back to this.tcm.currentTarget as it's the target data object
                distance: targetData.distance,
                isMoon: targetData.isMoon || false,
                diplomacy: targetData.diplomacy || shipInstance?.diplomacy,
                faction: targetData.faction || shipInstance?.faction || targetData.diplomacy || shipInstance?.diplomacy,
                isDiscovered: isDiscovered,
                gameObject: gameObject, // PHASE 3: Include GameObject reference
                ...targetData // Include all original properties
            };
        } else {
            // For non-ship targets, prefer the data we already have from target list
            // If targetData already has the info (from addNonPhysicsTargets), use it

            // PHASE 3: Get diplomacy from GameObject if available, else fall back to legacy
            const getDiplomacy = () => {
                if (gameObject && isDiscovered) {
                    const goDiplomacy = gameObject.diplomacy;
                    if (goDiplomacy && goDiplomacy !== 'unknown') {
                        return goDiplomacy;
                    }
                }
                return isDiscovered ? targetData.diplomacy : 'unknown';
            };

            if (targetData.type && targetData.type !== 'unknown') {
                return {
                    object: this.tcm.currentTarget,
                    name: isDiscovered ? (targetData.name || 'Unknown') : 'Unknown',
                    type: targetData.type,
                    isShip: false,
                    distance: targetData.distance,
                    isMoon: targetData.isMoon || false,
                    isSpaceStation: targetData.isSpaceStation,
                    faction: isDiscovered ? targetData.faction : 'unknown',
                    diplomacy: getDiplomacy(),
                    isDiscovered: isDiscovered,
                    gameObject: gameObject, // PHASE 3: Include GameObject reference
                    ...targetData
                };
            } else if (targetData.name && targetData.name !== 'Unknown') {
                // For targets with valid names (like from Star Charts) but no type,
                // use the target data directly and avoid falling back to Sol
                debug('TARGETING', `🎯 Processing target with name but no type: ${targetData.name}`);
                return {
                    object: this.tcm.currentTarget,
                    name: isDiscovered ? targetData.name : 'Unknown',
                    type: targetData.type || 'celestial_body', // Default type for celestial objects
                    isShip: false,
                    distance: targetData.distance,
                    isMoon: targetData.isMoon || false,
                    isSpaceStation: targetData.isSpaceStation,
                    faction: isDiscovered ? targetData.faction : 'unknown',
                    diplomacy: getDiplomacy(),
                    isDiscovered: isDiscovered,
                    gameObject: gameObject, // PHASE 3: Include GameObject reference
                    ...targetData
                };
            } else {
                // Fallback to getCelestialBodyInfo only if we have no useful target data
                debug('TARGETING', `🎯 Falling back to getCelestialBodyInfo for target:`, targetData);
                const info = this.tcm.solarSystemManager?.getCelestialBodyInfo(this.tcm.currentTarget);
                return {
                    object: this.tcm.currentTarget,
                    name: isDiscovered ? (info?.name || targetData.name || 'Unknown') : 'Unknown',
                    type: info?.type || targetData.type || 'unknown',
                    isShip: false,
                    distance: targetData.distance,
                    isMoon: targetData.isMoon || false,
                    faction: isDiscovered ? info?.faction : 'unknown',
                    diplomacy: getDiplomacy() || (isDiscovered ? info?.diplomacy : 'unknown'),
                    isDiscovered: isDiscovered,
                    gameObject: gameObject, // PHASE 3: Include GameObject reference
                    ...info
                };
            }
        }
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // No resources to dispose
    }
}
