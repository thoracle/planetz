/**
 * TargetListManager
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Manages target list building, caching, and sorting.
 *
 * Features:
 * - Target list building from celestial bodies and ships
 * - Known targets cache for better cycling experience
 * - Distance-based sorting with throttling
 * - Deduplication and sector filtering
 * - Non-physics target fallback support
 */

import { debug } from '../debug.js';
import {
    TARGETING_TIMING,
    TARGETING_RANGE,
} from '../constants/TargetingConstants.js';

export class TargetListManager {
    /**
     * Create a TargetListManager
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;

        // Persistent target cache for better cycling experience
        this.knownTargets = new Map();
        this.lastFullScanTime = 0;
        this.fullScanInterval = TARGETING_TIMING.FULL_SCAN_INTERVAL_MS;

        // Sorting state
        this.lastSortTime = 0;
        this.sortInterval = TARGETING_TIMING.SORT_INTERVAL_MS;
    }

    /**
     * Update the target list
     */
    updateTargetList() {
        // Store previous target list for comparison
        const previousTargets = [...this.tcm.targetObjects];

        // Always use Three.js-based target list update (physics system removed)
        this.updateTargetListWithPhysics();

        // Update the known targets cache with current targets
        this.updateKnownTargetsCache(this.tcm.targetObjects);

        // If we have a manual navigation selection and the new list is very small, enhance it with cached targets
        if (this.tcm.isManualNavigationSelection && this.tcm.targetObjects.length <= 2) {
            const enhancedTargets = this.enhanceTargetListWithCache(this.tcm.targetObjects);
            if (enhancedTargets.length > this.tcm.targetObjects.length) {
                this.tcm.targetObjects = enhancedTargets;
            }
        }
    }

    /**
     * Update the known targets cache with current targets
     * @param {Array} currentTargets - Current targets to cache
     */
    updateKnownTargetsCache(currentTargets) {
        const now = Date.now();
        const currentSector = this.tcm.solarSystemManager?.currentSector || 'A0';

        // CRITICAL FIX: Clear cache entries from other sectors first
        for (const [name, cachedTarget] of this.knownTargets.entries()) {
            if (cachedTarget.id && !cachedTarget.id.startsWith(currentSector + '_')) {
                debug('TARGETING', `🧹 Clearing cached target from different sector: ${name} (ID: ${cachedTarget.id})`);
                this.knownTargets.delete(name);
            }
        }

        // Add current targets to cache
        for (const target of currentTargets) {
            if (target && target.name && target.id) {
                // CRITICAL FIX: Only cache targets from current sector
                if (target.id.startsWith(currentSector + '_')) {
                    this.knownTargets.set(target.name, {
                        ...target,
                        lastSeen: now,
                        distance: this.calculateTargetDistance(target)
                    });
                    debug('TARGETING', `📝 Cached target: ${target.name} (ID: ${target.id})`);
                } else {
                    debug('TARGETING', `🚫 Skipping cache for target from different sector: ${target.name} (ID: ${target.id})`);
                }
            }
        }

        // Clean up old entries (older than 5 minutes)
        const maxAge = 5 * 60 * 1000; // 5 minutes
        for (const [name, cachedTarget] of this.knownTargets.entries()) {
            if (now - cachedTarget.lastSeen > maxAge) {
                debug('TARGETING', `🗑️ Removing expired cached target: ${name}`);
                this.knownTargets.delete(name);
            }
        }

        debug('TARGETING', `🎯 Known targets cache updated: ${this.knownTargets.size} targets cached for sector ${currentSector}`);
    }

    /**
     * Enhance target list with cached targets for better cycling
     * @param {Array} currentTargets - Current targets
     * @returns {Array} Enhanced target list
     */
    enhanceTargetListWithCache(currentTargets) {
        const enhancedTargets = [...currentTargets];
        const currentTargetNames = new Set(currentTargets.map(t => t.name));
        const maxCyclingRange = TARGETING_RANGE.MAX_CYCLING_RANGE;

        // CRITICAL FIX: Get current sector to prevent cross-sector contamination
        const currentSector = this.tcm.solarSystemManager?.currentSector || 'A0';
        debug('TARGETING', `🎯 Enhancing target list for sector ${currentSector} (${this.knownTargets.size} cached targets available)`);

        // Add cached targets that are within reasonable range AND in current sector
        for (const [name, cachedTarget] of this.knownTargets.entries()) {
            // Skip if already in current list
            if (currentTargetNames.has(name)) {
                continue;
            }

            // CRITICAL FIX: Only include targets from current sector
            if (cachedTarget.id && !cachedTarget.id.startsWith(currentSector + '_')) {
                debug('TARGETING', `🚫 Skipping cached target from different sector: ${name} (ID: ${cachedTarget.id})`);
                continue;
            }

            // Calculate current distance to cached target
            const distance = this.calculateTargetDistance(cachedTarget);

            // Include if within cycling range
            if (distance <= maxCyclingRange) {
                debug('TARGETING', `🎯 Adding cached target for cycling: ${name} (${distance.toFixed(1)}km, ID: ${cachedTarget.id})`);
                enhancedTargets.push({
                    ...cachedTarget,
                    distance: distance,
                    isCached: true // Mark as cached for debugging
                });
            } else {
                debug('TARGETING', `🚫 Cached target out of range: ${name} (${distance.toFixed(1)}km > ${maxCyclingRange}km)`);
            }
        }

        debug('TARGETING', `🎯 Enhanced target list: ${currentTargets.length} → ${enhancedTargets.length} targets`);
        return enhancedTargets;
    }

    /**
     * Calculate distance to a target
     * @param {Object} target - Target object
     * @returns {number} Distance in km
     */
    calculateTargetDistance(target) {
        if (!target || !target.position || !this.tcm.camera) {
            return Infinity;
        }

        try {
            const THREE = this.tcm.THREE;
            const targetPos = Array.isArray(target.position)
                ? new THREE.Vector3(...target.position)
                : target.position;
            return this.tcm.camera.position.distanceTo(targetPos) / 1000; // Convert to km
        } catch (error) {
            debug('P1', `🎯 Error calculating distance to ${target.name}: ${error}`);
            return Infinity;
        }
    }

    /**
     * Enhanced target list update using Three.js native approach
     */
    updateTargetListWithPhysics() {
        // Delegate to traditional method which now has all our enhancements
        return this.updateTargetListTraditional();
    }

    /**
     * Traditional target list update (fallback when physics not available)
     */
    updateTargetListTraditional() {
        let allTargets = [];

        // Get the actual range from the target computer system
        const ship = this.tcm.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');
        const maxTargetingRange = targetComputer?.range || 150; // Fallback to 150km if system not found

        // Get celestial bodies from SolarSystemManager (same as traditional method)
        if (this.tcm.solarSystemManager) {
            const bodies = this.tcm.solarSystemManager.getCelestialBodies();
            debug('TARGETING', `SolarSystemManager has ${bodies.size} celestial bodies`);

            const celestialBodies = Array.from(bodies.entries())
                .map(([key, body]) => {
                    const info = this.tcm.solarSystemManager.getCelestialBodyInfo(body);

                    // Validate body position
                    if (!body.position ||
                        isNaN(body.position.x) ||
                        isNaN(body.position.y) ||
                        isNaN(body.position.z)) {
                        debug('TARGETING', `🎯 Invalid position for body ${key}`);
                        return null;
                    }

                    const distance = this.tcm.calculateDistance(this.tcm.camera.position, body.position);
                    debug('TARGETING', `Body ${key}: ${info.name} at ${distance.toFixed(1)}km`);

                    // Skip bodies beyond target computer range
                    if (distance > maxTargetingRange) {
                        debug('TARGETING', `Body ${key} beyond range (${distance.toFixed(1)}km > ${maxTargetingRange}km)`);
                        return null;
                    }

                    // Ensure consistent ID format with Star Charts (sector prefix)
                    let targetId = this.tcm.constructStarChartsId(info);
                    if (!targetId) {
                        // Fallback to key-based ID if name-based construction fails
                        const currentSector = this.tcm.solarSystemManager?.currentSector || 'A0';
                        const normalizedKey = key.replace(/^(station_|planet_|moon_|star_)/, '');
                        targetId = `${currentSector}_${normalizedKey}`;
                    }

                    // Check if this object is discovered before including faction info
                    const isDiscovered = this.tcm.isObjectDiscovered({id: targetId, name: info.name, type: info.type});

                    const baseTarget = {
                        id: targetId, // CRITICAL: Use consistent A0_ format
                        name: info.name,
                        type: info.type,
                        position: body.position.toArray(),
                        isMoon: key.startsWith('moon_'),
                        isSpaceStation: info.type === 'station' || (info.type && (
                            info.type.toLowerCase().includes('station') ||
                            info.type.toLowerCase().includes('complex') ||
                            info.type.toLowerCase().includes('platform') ||
                            info.type.toLowerCase().includes('facility') ||
                            info.type.toLowerCase().includes('base')
                        )),
                        object: body,
                        isShip: false,
                        distance: distance
                    };

                    // Only include faction/diplomacy info for discovered objects
                    if (isDiscovered) {
                        return {
                            ...baseTarget,
                            ...info, // Include all info properties (diplomacy, faction, etc.)
                            discovered: true
                        };
                    } else {
                        // For undiscovered objects, set unknown status
                        return {
                            ...baseTarget,
                            diplomacy: 'unknown',
                            faction: 'Unknown',
                            discovered: false
                        };
                    }
                })
                .filter(body => body !== null);

            allTargets = allTargets.concat(celestialBodies);
        }

        // Add any targets that might not have physics bodies yet (ships, beacons, etc.)
        this.addNonPhysicsTargets(allTargets, maxTargetingRange);

        // Apply deduplication to prevent duplicate targets
        const deduplicatedTargets = [];
        const seenIds = new Set();
        const seenNames = new Set();
        const duplicatesFound = [];

        for (const target of allTargets) {
            const targetId = target.id;
            const targetName = target.name;

            // Skip if we've seen this ID or name before
            if ((targetId && seenIds.has(targetId)) || seenNames.has(targetName)) {
                duplicatesFound.push({ name: targetName, id: targetId, reason: targetId && seenIds.has(targetId) ? 'duplicate ID' : 'duplicate name' });
                continue;
            }

            // Add to seen sets
            if (targetId) seenIds.add(targetId);
            seenNames.add(targetName);
            deduplicatedTargets.push(target);
        }

        // Log duplicates found (rate limited)
        if (duplicatesFound.length > 0 && Math.random() < 0.1) {
            debug('TARGETING', `🎯 DEDUP: Removed ${duplicatesFound.length} duplicates:`, duplicatesFound.slice(0, 3));
        }

        // CRITICAL: Normalize ALL target IDs before setting the target list
        debug('TARGETING', `🔍 Normalizing ${deduplicatedTargets.length} targets`);

        const normalizedTargets = deduplicatedTargets.map(target => this.tcm.normalizeTarget(target));

        // Rate-limited detailed logging (only 5% of the time to reduce spam)
        if (Math.random() < 0.05) {
            debug('TARGETING', `🔍 NORMALIZATION SAMPLE: ${normalizedTargets.length} targets`);
            normalizedTargets.slice(0, 3).forEach((target, i) => {
                debug('TARGETING', `  [${i}] ${target.name} - ID: "${target.id}"`);
            });
        }

        // CRITICAL: Filter out any targets from other sectors to prevent contamination
        const currentSector = this.tcm.solarSystemManager?.currentSector || 'A0';
        const sectorFilteredTargets = normalizedTargets.filter(target => {
            if (target.id && typeof target.id === 'string' && !target.id.startsWith(currentSector + '_')) {
                debug('TARGETING', `🚫 SECTOR FILTER: Removing cross-sector target: ${target.name} (ID: ${target.id}, current sector: ${currentSector})`);
                return false;
            }
            return true;
        });

        if (sectorFilteredTargets.length !== normalizedTargets.length) {
            debug('TARGETING', `🧹 SECTOR FILTER: Removed ${normalizedTargets.length - sectorFilteredTargets.length} cross-sector targets`);
        }

        // Update target list with sector-filtered targets
        this.tcm.targetObjects = sectorFilteredTargets;

        // Debug logging to see what targets were found
        debug('TARGETING', `TargetComputerManager: Found ${this.tcm.targetObjects.length} targets:`, this.tcm.targetObjects.map(t => `${t.name} (${t.distance.toFixed(1)}km)`));

        // Sort targets by distance
        this.sortTargetsByDistance();
    }

    /**
     * Add targets that don't have physics bodies yet (fallback)
     * @param {Array} allTargets - Array to add targets to
     * @param {number} maxRange - Maximum targeting range
     */
    addNonPhysicsTargets(allTargets, maxRange) {
        // Build sets for duplicate detection - check both names and ship objects
        const existingTargetIds = new Set(allTargets.map(t => t.physicsEntity?.id || t.name));
        const existingShipObjects = new Set(allTargets.map(t => t.ship).filter(ship => ship));

        // Check for ships without physics bodies
        if (this.tcm.viewManager?.starfieldManager?.dummyShipMeshes) {
            this.tcm.viewManager.starfieldManager.dummyShipMeshes.forEach((mesh, index) => {
                const ship = mesh.userData.ship;
                const targetId = ship.shipName;

                // Filter out destroyed ships and check if not already in target list
                // Check both by ID/name and by ship object reference
                if (!existingTargetIds.has(targetId) && !existingShipObjects.has(ship) && ship && ship.currentHull > 0.001) {
                    const distance = this.tcm.calculateDistance(this.tcm.camera.position, mesh.position);
                    if (distance <= maxRange) {
                        allTargets.push({
                            id: ship.id || mesh.userData?.id || ship.shipName, // CRITICAL: Include the ID field
                            name: ship.shipName,
                            type: 'enemy_ship',
                            position: mesh.position.toArray(),
                            isMoon: false,
                            object: mesh,
                            isShip: true,
                            ship: ship,
                            distance: distance,
                            diplomacy: ship.diplomacy || 'enemy', // Copy diplomacy from ship
                            faction: ship.faction || ship.diplomacy || 'enemy' // Copy faction from ship
                        });
                    }
                }
            });
        }

        // CRITICAL FIX: Add celestial bodies to fallback system
        // When spatial query fails, this ensures planets/moons/stars still appear in targeting
        if (this.tcm.solarSystemManager?.celestialBodies) {
            for (const [key, body] of this.tcm.solarSystemManager.celestialBodies.entries()) {
                if (!body || !body.position) continue;

                const distance = this.tcm.calculateDistance(this.tcm.camera.position, body.position);
                if (distance <= maxRange) {
                    const info = this.tcm.solarSystemManager.getCelestialBodyInfo(body);
                    if (info && !existingTargetIds.has(info.name)) {
                        // Generate proper sector-prefixed ID
                        const currentSector = this.tcm.solarSystemManager?.currentSector || 'A0';
                        let sectorId;
                        if (key === 'star') {
                            sectorId = `${currentSector}_star`;
                        } else if (key.startsWith('planet_')) {
                            const planetIndex = key.split('_')[1];
                            const planetName = info.name?.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `planet_${planetIndex}`;
                            sectorId = `${currentSector}_${planetName}`;
                        } else if (key.startsWith('moon_')) {
                            const moonName = info.name?.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || key;
                            sectorId = `${currentSector}_${moonName}`;
                        } else {
                            // Fallback for other objects
                            const objectName = info.name?.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || key;
                            sectorId = `${currentSector}_${objectName}`;
                        }

                        const targetData = {
                            id: sectorId, // Use sector-prefixed ID
                            name: info.name,
                            type: info.type,
                            position: body.position.toArray(),
                            isMoon: key.startsWith('moon_'),
                            isSpaceStation: info.type === 'station' || (info.type && (
                                info.type.toLowerCase().includes('station') ||
                                info.type.toLowerCase().includes('complex') ||
                                info.type.toLowerCase().includes('platform') ||
                                info.type.toLowerCase().includes('facility') ||
                                info.type.toLowerCase().includes('base')
                            )),
                            object: body,
                            isShip: false,
                            distance: distance,
                            ...info
                        };
                        debug('TARGETING', `TargetComputerManager.addNonPhysicsTargets: Adding celestial body: ${targetData.name} (${targetData.type}, ${targetData.faction}, ${targetData.diplomacy})`);
                        allTargets.push(targetData);
                    }
                }
            }
        }
    }

    /**
     * Add a single target with proper deduplication
     * @param {Object} targetData - Target to add
     * @returns {boolean} True if target was added (new), false if updated existing
     */
    addTargetWithDeduplication(targetData) {
        if (!targetData) {
            debug('TARGETING', `🚨 Cannot add null target`);
            return false;
        }

        // CRITICAL: Normalize target ID before processing
        targetData = this.tcm.normalizeTarget(targetData);

        if (!targetData.id) {
            debug('TARGETING', `🚨 Cannot add target without ID after normalization: ${targetData?.name || 'unknown'}`);
            return false;
        }

        // CRITICAL: AGGRESSIVE SECTOR VALIDATION - ZERO TOLERANCE FOR CROSS-SECTOR CONTAMINATION
        const currentSector = this.tcm.viewManager?.solarSystemManager?.currentSector;
        if (currentSector && targetData.id && typeof targetData.id === 'string') {
            if (!targetData.id.startsWith(currentSector + '_')) {
                debug('TARGETING', `🚨 SECTOR VIOLATION: Rejecting cross-sector target: ${targetData.name} (${targetData.id}) - Current sector: ${currentSector}`);
                debug('TARGETING', `🚨 FAIL-FAST: Cross-sector contamination prevented at target addition point`);
                return false; // FAIL-FAST: Reject immediately
            }
        }

        // Check for existing target by ID and name
        const existingIndex = this.tcm.targetObjects.findIndex(target => {
            return target.id === targetData.id || target.name === targetData.name;
        });

        if (existingIndex === -1) {
            // Add new target
            this.tcm.targetObjects.push(targetData);
            debug('TARGETING', `🎯 DEDUP: Added new target: ${targetData.name} (${targetData.id})`);
            return true;
        } else {
            // Update existing target
            this.tcm.targetObjects[existingIndex] = { ...this.tcm.targetObjects[existingIndex], ...targetData };
            debug('TARGETING', `🎯 DEDUP: Updated existing target: ${targetData.name} (${targetData.id})`);
            return false; // Not a new addition
        }
    }

    /**
     * Enhanced sorting with physics data
     * @param {boolean} forceSort - Force sort even if recently sorted
     */
    sortTargetsByDistanceWithPhysics(forceSort = false) {
        const now = Date.now();
        if (!forceSort && now - this.lastSortTime < this.sortInterval) {
            return; // Don't sort too frequently
        }
        this.lastSortTime = now;

        // Update distances for all targets (some may have moved via physics)
        this.tcm.targetObjects.forEach(targetData => {
            // Handle targets that don't have physical objects attached (e.g., Star Charts targets)
            if (targetData.object && targetData.object.position) {
                if (targetData.physicsEntity) {
                    // Get updated position from physics if available
                    const physicsBody = window.physicsManager.getRigidBody(targetData.object);
                    if (physicsBody && physicsBody.isActive()) {
                        // Position is already synced by physics manager
                        targetData.distance = this.tcm.calculateDistance(this.tcm.camera.position, targetData.object.position);
                    }
                } else {
                    // Fallback to regular distance calculation
                    targetData.distance = this.tcm.calculateDistance(this.tcm.camera.position, targetData.object.position);
                }
            } else if (targetData.position) {
                // Fallback to stored position if available
                targetData.distance = this.tcm.calculateDistance(this.tcm.camera.position, targetData.position);
            } else {
                // Last resort: set to a large distance so these targets sort to the end
                targetData.distance = TARGETING_RANGE.INFINITY_DISTANCE;
                debug('TARGETING', `⚠️ Target ${targetData.name} has no position data - setting distance to ${targetData.distance}km`);
            }

            // Clear outOfRange flag if target is back within normal range
            const ship = this.tcm.viewManager?.getShip();
            const targetComputer = ship?.getSystem('target_computer');
            const maxRange = targetComputer?.range || 150;
            if (targetData.outOfRange && targetData.distance <= maxRange) {
                debug('TARGETING', `Target ${targetData.name} back in range (${targetData.distance.toFixed(1)}km) - clearing outOfRange flag`);
                targetData.outOfRange = false;
            }
        });

        // Sort by distance
        this.tcm.targetObjects.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Sort targets by distance from camera
     * @param {boolean} forceSort - Force sort even if recently sorted
     */
    sortTargetsByDistance(forceSort = false) {
        const now = Date.now();
        if (!forceSort && now - this.lastSortTime < this.sortInterval) {
            return; // Don't sort too frequently
        }
        this.lastSortTime = now;

        // Update distances for all targets
        this.tcm.targetObjects.forEach(targetData => {
            // Handle targets that don't have physical objects attached (e.g., Star Charts targets)
            if (targetData.object && targetData.object.position) {
                targetData.distance = this.tcm.calculateDistance(this.tcm.camera.position, targetData.object.position);
            } else if (targetData.position) {
                // Fallback to stored position if available
                targetData.distance = this.tcm.calculateDistance(this.tcm.camera.position, targetData.position);
            } else {
                // Last resort: set to a large distance so these targets sort to the end
                targetData.distance = TARGETING_RANGE.INFINITY_DISTANCE;
                debug('TARGETING', `⚠️ Target ${targetData.name} has no position data - setting distance to ${targetData.distance}km`);
            }

            // Clear outOfRange flag if target is back within normal range
            const ship = this.tcm.viewManager?.getShip();
            const targetComputer = ship?.getSystem('target_computer');
            const maxRange = targetComputer?.range || 150;
            if (targetData.outOfRange && targetData.distance <= maxRange) {
                debug('TARGETING', `Target ${targetData.name} back in range (${targetData.distance.toFixed(1)}km) - clearing outOfRange flag`);
                targetData.outOfRange = false;
            }
        });

        // Sort by distance
        this.tcm.targetObjects.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Clear the known targets cache
     */
    clearKnownTargetsCache() {
        this.knownTargets.clear();
        debug('TARGETING', '🧹 Known targets cache cleared');
    }

    /**
     * Get the known targets cache
     * @returns {Map} Known targets cache
     */
    getKnownTargets() {
        return this.knownTargets;
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.knownTargets.clear();
        this.lastFullScanTime = 0;
        this.lastSortTime = 0;
    }
}
