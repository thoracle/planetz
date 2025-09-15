import { getWireframeType } from '../constants/WireframeTypes.js';
import { debug } from '../debug.js';

/**
 * Star Charts and Target Computer Integration
 * ===========================================
 *
 * This module provides seamless integration between the Star Charts discovery
 * system and the Target Computer targeting system. It ensures:
 *
 * - Real-time data synchronization
 * - Unified discovery and targeting workflow
 * - Enhanced target information from Star Charts
 * - Automatic target acquisition from Star Charts selection
 * - Bidirectional state updates between systems
 */

export class StarChartsTargetComputerIntegration {
    constructor(starChartsManager, targetComputerManager, solarSystemManager) {
        this.starCharts = starChartsManager;
        this.targetComputer = targetComputerManager;
        this.solarSystem = solarSystemManager;

        // Integration state
        this.isActive = false;
        this.lastSyncTime = 0;
        this.syncInterval = 1000; // Sync every 1 second for responsive updates
        this.syncIntervalId = null;
        this.pauseSync = false; // Flag to pause sync during manual target selection

        // Enhanced target data
        this.enhancedTargets = new Map(); // targetId -> enhanced data from Star Charts

        // Discovery callbacks
        this.discoveryCallbacks = [];
        this.targetSelectionCallbacks = [];

debug('TARGETING', 'Star Charts ↔ Target Computer Integration initialized');
    }

    /**
     * Activate the integration system
     */
    activate() {
        if (this.isActive) return;

        this.isActive = true;
        this.startSynchronization();

        // Register discovery callbacks
        this.registerDiscoveryCallbacks();

        // Initial sync - force sync all discovered objects
        this.forceSync();

debug('TARGETING', '✅ Star Charts ↔ Target Computer Integration activated');
    }

    /**
     * Deactivate the integration system
     */
    deactivate() {
        if (!this.isActive) return;

        this.isActive = false;
        this.stopSynchronization();

debug('TARGETING', '⏸️  Star Charts ↔ Target Computer Integration deactivated');
    }

    /**
     * Start simplified synchronization - only essential functions
     */
    startSynchronization() {
        this.syncIntervalId = setInterval(() => {
            this.syncTargetData(); // Ensure discovered objects are available as targets
            this.hydrateMissingObjects(); // Attach Three.js objects for wireframes
            // Removed updateEnhancedTargets() - metadata enhancement not critical
        }, this.syncInterval);
    }

    /**
     * Stop real-time synchronization
     */
    stopSynchronization() {
        if (this.syncIntervalId) {
            clearInterval(this.syncIntervalId);
            this.syncIntervalId = null;
        }
    }

    /**
     * Register callbacks for Star Charts discovery events
     */
    registerDiscoveryCallbacks() {
        // Add discovery callback to Star Charts
        if (this.starCharts && typeof this.starCharts.addDiscoveryCallback === 'function') {
            this.starCharts.addDiscoveryCallback((objectId, discoveryData) => {
                this.handleDiscoveryEvent(objectId, discoveryData);
            });
        }

        // Add target selection callback to Star Charts
        if (this.starCharts && typeof this.starCharts.addTargetSelectionCallback === 'function') {
            this.starCharts.addTargetSelectionCallback((objectId) => {
                this.handleTargetSelection(objectId);
            });
        }
    }

    /**
     * Handle discovery events from Star Charts
     */
    handleDiscoveryEvent(objectId, discoveryData) {
debug('UTILITY', `🗺️  Discovery event: ${objectId}`, discoveryData);

        // Update enhanced target data
        this.updateEnhancedTargetData(objectId, discoveryData);

        // Notify Target Computer of new potential target
        this.notifyTargetComputerOfDiscovery(objectId);

        // Trigger any registered callbacks
        this.discoveryCallbacks.forEach(callback => {
            try {
                callback(objectId, discoveryData);
            } catch (error) {
                console.error('❌ Discovery callback error:', error);
            }
        });
    }

    /**
     * Handle target selection from Star Charts
     */
    handleTargetSelection(objectId) {
debug('TARGETING', `🎯 Target selection from Star Charts: ${objectId}`);
debug('TARGETING', `🎯 TARGET_SWITCH: Starting from Star Charts to ${objectId}`);

        // Temporarily pause synchronization to prevent interference
        this.pauseSync = true;

        // Get enhanced data for this target
        const enhancedData = this.getEnhancedTargetData(objectId);

        // Set target in Target Computer with enhanced data
        const success = this.setTargetWithEnhancedData(objectId, enhancedData);

        // Resume synchronization after a delay to allow target to settle
        setTimeout(() => {
            this.pauseSync = false;
        }, 2000);

        // Trigger target selection callbacks
        this.targetSelectionCallbacks.forEach(callback => {
            try {
                callback(objectId);
            } catch (error) {
                console.error('❌ Target selection callback error:', error);
            }
        });

        return success;
    }

    /**
     * Sync target data between systems
     */
    syncTargetData() {
        if (!this.isActive) return;

        // Skip sync if paused (during manual target selection)
        if (this.pauseSync) {
debug('TARGETING', '🔄 Sync paused for manual target selection');
            return;
        }

        try {
            // Get current targets from Target Computer
            const currentTargets = this.getCurrentTargetsFromTargetComputer();

            // Get discovered objects from Star Charts
            const discoveredObjects = this.getDiscoveredObjectsFromStarCharts();

debug('TARGETING', `🔄 Syncing targets: ${discoveredObjects.length} discovered, ${currentTargets.length} in Target Computer`);

            // Sync target availability
            this.syncTargetAvailability(currentTargets, discoveredObjects);

            // Update last sync time
            this.lastSyncTime = Date.now();

        } catch (error) {
            console.error('❌ Target data sync error:', error);
        }
    }

    /**
     * Get current targets from Target Computer
     */
    getCurrentTargetsFromTargetComputer() {
        if (!this.targetComputer) return [];

        // Get targets from Target Computer manager
        const targets = [];

        if (this.targetComputer.targetedObject) {
            targets.push({
                id: this.targetComputer.lastTargetedObjectId || this.targetComputer.targetedObject.id,
                object: this.targetComputer.targetedObject,
                isCurrentTarget: true
            });
        }

        if (this.targetComputer.validTargets && this.targetComputer.validTargets.length > 0) {
            this.targetComputer.validTargets.forEach(target => {
                if (!targets.find(t => t.id === target.id)) {
                    targets.push({
                        id: target.id,
                        object: target,
                        isCurrentTarget: false
                    });
                }
            });
        }

        return targets;
    }

    /**
     * Normalize object ID to consistent format
     * Converts lowercase 'a0_' prefixes to uppercase 'A0_' to match Star Charts database
     */
    normalizeObjectId(objectId) {
        if (!objectId) return objectId;
        return objectId.replace(/^a0_/i, 'A0_');
    }

    /**
     * Get discovered objects from Star Charts
     */
    getDiscoveredObjectsFromStarCharts() {
        if (!this.starCharts) return [];

        const discovered = [];

        // Get discovered objects from Star Charts database
        if (this.starCharts.objectDatabase && this.starCharts.objectDatabase.sectors) {
            const currentSector = this.starCharts.currentSector || 'A0';
            const sectorData = this.starCharts.objectDatabase.sectors[currentSector];

            if (sectorData) {
                // Add star if discovered
                if (sectorData.star && this.starCharts.isDiscovered(sectorData.star.id)) {
                    discovered.push({
                        id: this.normalizeObjectId(sectorData.star.id),
                        name: sectorData.star.name,
                        type: 'star',
                        discovered: true,
                        discoveryData: this.starCharts.getDiscoveryMetadata(sectorData.star.id)
                    });
                }

                // Add planets and objects
                (sectorData.objects || []).forEach(obj => {
                    if (obj && obj.id && this.starCharts.isDiscovered(obj.id)) {
                        discovered.push({
                            id: this.normalizeObjectId(obj.id),
                            name: obj.name,
                            type: obj.type,
                            discovered: true,
                            discoveryData: this.starCharts.getDiscoveryMetadata(obj.id)
                        });
                    }
                });

                // Add infrastructure
                const infra = sectorData.infrastructure || {};
                (infra.stations || []).forEach(station => {
                    if (station && station.id && this.starCharts.isDiscovered(station.id)) {
                        discovered.push({
                            id: this.normalizeObjectId(station.id),
                            name: station.name,
                            type: 'space_station',
                            discovered: true,
                            discoveryData: this.starCharts.getDiscoveryMetadata(station.id)
                        });
                    }
                });

                (infra.beacons || []).forEach(beacon => {
                    if (beacon && beacon.id && this.starCharts.isDiscovered(beacon.id)) {
                        discovered.push({
                            id: this.normalizeObjectId(beacon.id),
                            name: beacon.name,
                            type: 'navigation_beacon',
                            discovered: true,
                            discoveryData: this.starCharts.getDiscoveryMetadata(beacon.id)
                        });
                    }
                });
            }
        }

        return discovered;
    }

    /**
     * Sync target availability between systems
     */
    syncTargetAvailability(targetComputerTargets, starChartsTargets) {
        // Ensure all discovered objects are available as targets
        let addedCount = 0;
        starChartsTargets.forEach(starChartsTarget => {
            const normalizedId = this.normalizeObjectId(starChartsTarget.id);
            
            // Check both the provided targets AND the actual targetObjects array for duplicates
            const existsInTargetComputer = targetComputerTargets.some(tcTarget => 
                this.normalizeObjectId(tcTarget.id) === normalizedId || tcTarget.name === starChartsTarget.name
            );
            
            const existsInTargetObjects = this.targetComputer?.targetObjects?.some(target => 
                this.normalizeObjectId(target.id) === normalizedId || target.name === starChartsTarget.name
            );

            if (!existsInTargetComputer && !existsInTargetObjects) {
                // Add to Target Computer's known targets
                this.addTargetToTargetComputer(starChartsTarget);
                addedCount++;
            }
        });

        if (addedCount > 0) {
debug('TARGETING', `🎯 Added ${addedCount} new targets to Target Computer`);
            // Only refresh display if no current target is set (avoid interrupting manual selection)
            if (this.targetComputer && this.targetComputer.updateTargetDisplay && !this.targetComputer.currentTarget) {
                this.targetComputer.updateTargetDisplay();
debug('TARGETING', `🎯 Refreshed Target Computer display`);
            }
        }
    }

    /**
     * Add a target to Target Computer's known targets
     */
    addTargetToTargetComputer(targetData) {
        if (!this.targetComputer || !targetData) return;

        // Normalize ID to uppercase to match Star Charts database format
        const normalizedId = targetData.id ? targetData.id.replace(/^a0_/i, 'A0_') : null;
        
        if (!normalizedId) {
            debug('TARGETING', `🚨 WARNING: Target ${targetData.name} has no ID, skipping sync`);
            return;
        }

        // Use centralized wireframe type mapping - single source of truth
        const wireframeConfig = this.getWireframeType(targetData.type);
        let normalizedType = targetData.type;
        let isSpaceStation = false;

        // Apply centralized type normalization if needed
        if (wireframeConfig.geometry === 'torus') {
            // Space stations need special handling for backward compatibility
            normalizedType = 'station';
            isSpaceStation = true;
        }

        // Create target data object for Target Computer
        const targetDataForTC = {
            id: normalizedId,
            name: targetData.name,
            type: targetData.type, // CRITICAL: Keep original type for wireframe consistency
            normalizedType: normalizedType, // Store normalized type separately if needed
            isSpaceStation: isSpaceStation,
            discovered: !targetData._isUndiscovered, // Set based on discovery status
            fromStarCharts: true,
            // Set diplomacy for undiscovered objects
            diplomacy: targetData._isUndiscovered ? 'unknown' : (targetData.diplomacy || 'neutral'),
            faction: targetData._isUndiscovered ? 'Unknown' : targetData.faction
        };

        // Debug logging for beacons
        if (targetData.type === 'navigation_beacon') {
            console.log(`🔍 DEBUG ADD: Adding beacon to target computer:`, {
                originalData: {
                    name: targetData.name,
                    type: targetData.type,
                    _isUndiscovered: targetData._isUndiscovered
                },
                processedData: {
                    name: targetDataForTC.name,
                    type: targetDataForTC.type,
                    discovered: targetDataForTC.discovered,
                    diplomacy: targetDataForTC.diplomacy,
                    faction: targetDataForTC.faction
                }
            });
        }

        // Attach actual Three.js object for first-class targets when available
        try {
            const vm = window.viewManager || this.targetComputer?.viewManager || this.starCharts?.viewManager;
            const ssm = this.solarSystem || vm?.solarSystemManager || window.solarSystemManager;
            const sfm = vm?.starfieldManager || window.starfieldManager;

            // Prefer lookup by normalized id
            const findByIdInMap = (map, key) => {
                try { return map && typeof map.get === 'function' ? map.get(key) : null; } catch { return null; }
            };

            if (targetData.type === 'navigation_beacon') {
                // Resolve beacon from StarfieldManager.navigationBeacons by id or name
                const beacons = sfm?.navigationBeacons || [];
                const beaconObj = beacons.find(b => b?.userData?.id === normalizedId) ||
                                   beacons.find(b => (b?.userData?.name || b?.name) === targetData.name);
                if (beaconObj) {
                    targetDataForTC.object = beaconObj;
                    targetDataForTC.position = beaconObj.position;
                }
                // Fallback: celestialBodies registry (we registered beacon under id and beacon_<id>)
                if (!targetDataForTC.object && ssm?.celestialBodies) {
                    targetDataForTC.object = findByIdInMap(ssm.celestialBodies, normalizedId) ||
                                              findByIdInMap(ssm.celestialBodies, `beacon_${normalizedId}`);
                    if (targetDataForTC.object && targetDataForTC.object.position) {
                        targetDataForTC.position = targetDataForTC.object.position;
                    }
                }
            } else if (targetData.type === 'star') {
                // Special handling for stars - they're stored with key 'star' in celestialBodies
                if (ssm?.celestialBodies) {
                    targetDataForTC.object = findByIdInMap(ssm.celestialBodies, 'star');
                    if (targetDataForTC.object && targetDataForTC.object.position) {
                        targetDataForTC.position = targetDataForTC.object.position;
                    }
                }
            } else {
                // Stations/planets: try celestialBodies by id first
                if (ssm?.celestialBodies) {
                    targetDataForTC.object = findByIdInMap(ssm.celestialBodies, normalizedId) ||
                                              findByIdInMap(ssm.celestialBodies, `station_${targetData.name?.toLowerCase()?.replace(/\s+/g, '_')}`);
                    if (targetDataForTC.object && targetDataForTC.object.position) {
                        targetDataForTC.position = targetDataForTC.object.position;
                    }
                }
            }
        } catch (e) {
            // Non-fatal; leave as metadata only
        }

        // Add to Target Computer's known targets cache
        if (this.targetComputer.knownTargets) {
            this.targetComputer.knownTargets.set(targetData.name, targetDataForTC);
        }

        // CRITICAL: Add to targetObjects array through proper deduplication
        if (this.targetComputer.targetObjects) {
            // Use the target computer's built-in deduplication method
            if (this.targetComputer.addTargetWithDeduplication) {
                this.targetComputer.addTargetWithDeduplication(targetDataForTC);
                debug('TARGETING', `🎯 Added target via deduplication: ${targetData.name} (${normalizedId})`);
            } else {
                // Fallback: Check if target already exists (robust deduplication with ID normalization)
                const existingIndex = this.targetComputer.targetObjects.findIndex(target => {
                    const targetNormalizedId = this.normalizeObjectId(target.id);
                    return targetNormalizedId === normalizedId || target.name === targetData.name;
                });

                if (existingIndex === -1) {
                    // Add new target to the array
                    this.targetComputer.targetObjects.push(targetDataForTC);
                    debug('TARGETING', `🎯 Added target to Target Computer targetObjects: ${targetData.name} (${normalizedId})`);
                } else {
                    // Update existing target
                    this.targetComputer.targetObjects[existingIndex] = { ...this.targetComputer.targetObjects[existingIndex], ...targetDataForTC };
                    debug('TARGETING', `🎯 Updated existing target in Target Computer: ${targetData.name} (${normalizedId})`);
                }
            }
        }

        debug('TARGETING', `🎯 Added target to Target Computer: ${targetData.name} (${normalizedId})`);

        // Refresh the target display to show the new target
        if (this.targetComputer && this.targetComputer.updateTargetDisplay) {
            this.targetComputer.updateTargetDisplay();
        }
    }

    /**
     * Ensure targetObjects entries have actual Three.js objects attached when available
     * Useful after initial beacon/station creation
     */
    hydrateMissingObjects() {
        try {
            if (!this.targetComputer || !Array.isArray(this.targetComputer.targetObjects)) return;
            const vm = window.viewManager || this.targetComputer?.viewManager || this.starCharts?.viewManager;
            const ssm = this.solarSystem || vm?.solarSystemManager || window.solarSystemManager;
            const sfm = vm?.starfieldManager || window.starfieldManager;

            let hydrated = 0;
            this.targetComputer.targetObjects.forEach((t, idx) => {
                if (t && !t.object) {
                    const id = (t.id || '').replace(/^a0_/i, 'A0_');
                    let obj = null;
                    if (t.type === 'navigation_beacon' && sfm?.navigationBeacons) {
                        obj = sfm.navigationBeacons.find(b => b?.userData?.id === id) ||
                              sfm.navigationBeacons.find(b => (b?.userData?.name || b?.name) === t.name);
                    }
                    if (!obj && ssm?.celestialBodies && typeof ssm.celestialBodies.get === 'function') {
                        if (t.type === 'star') {
                            // Special handling for stars - they're stored with key 'star'
                            obj = ssm.celestialBodies.get('star');
                        } else {
                            obj = ssm.celestialBodies.get(id) || ssm.celestialBodies.get(`beacon_${id}`) ||
                                  ssm.celestialBodies.get(`station_${t.name?.toLowerCase()?.replace(/\s+/g, '_')}`);
                        }
                    }
                    if (obj) {
                        this.targetComputer.targetObjects[idx] = { ...t, object: obj, position: obj.position };
                        hydrated++;
                    }
                }
            });
            if (hydrated > 0) {
                // Optionally refresh HUD if current target was affected
                if (this.targetComputer.currentTarget && !this.targetComputer.currentTarget.position) {
                    this.targetComputer.updateTargetDisplay();
                }
            }
        } catch (_) {}
    }

    /**
     * Update enhanced target data
     */
    updateEnhancedTargetData(objectId, discoveryData) {
        const enhancedData = {
            ...discoveryData,
            lastUpdated: Date.now(),
            source: 'star_charts',
            enhanced: true
        };

        this.enhancedTargets.set(objectId, enhancedData);
    }

    /**
     * Get enhanced target data
     */
    getEnhancedTargetData(objectId) {
        return this.enhancedTargets.get(objectId) || null;
    }

    /**
     * Update enhanced targets information
     */
    updateEnhancedTargets() {
        if (!this.targetComputer || !this.starCharts) return;

        // Update current target with enhanced data if available
        if (this.targetComputer.targetedObject) {
            const targetId = this.targetComputer.lastTargetedObjectId || this.targetComputer.targetedObject.id;
            const enhancedData = this.getEnhancedTargetData(targetId);

            if (enhancedData) {
                this.applyEnhancedDataToTarget(targetId, enhancedData);
            }
        }
    }

    /**
     * Apply enhanced data to current target
     */
    applyEnhancedDataToTarget(targetId, enhancedData) {
        // Add enhanced information to target display
        if (this.targetComputer.targetInfoDisplay) {
            const infoElement = this.targetComputer.targetInfoDisplay;

            // Add discovery information
            if (enhancedData.discoveryMethod) {
                infoElement.setAttribute('data-discovery-method', enhancedData.discoveryMethod);
            }

            if (enhancedData.discoveredAt) {
                const discoveredDate = new Date(enhancedData.discoveredAt).toLocaleDateString();
                infoElement.setAttribute('data-discovered-at', discoveredDate);
            }
        }

debug('TARGETING', `✨ Applied enhanced data to target: ${targetId}`);
    }

    /**
     * Set target with enhanced data
     */
    setTargetWithEnhancedData(objectId, enhancedData) {
        if (!this.targetComputer) return false;

        // Ensure Target Computer is activated
        if (this.targetComputer.targetComputerEnabled === false) {
debug('TARGETING', 'Activating Target Computer for manual selection');
            this.targetComputer.targetComputerEnabled = true;
        }

        // First set the target normally
        debug('TARGETING', `🎯 Star Charts: Attempting to set target: ${objectId}`);
        const success = this.targetComputer.setTargetById(objectId);

        if (success) {
debug('TARGETING', `🎯 Successfully set target: ${objectId}`);
debug('TARGETING', `🎯 TARGET_SWITCH: Target set successfully, updating display`);

            // Force a display update to ensure HUD reflects the change
            if (this.targetComputer.updateTargetDisplay) {
                this.targetComputer.updateTargetDisplay();
                debug('TARGETING', `🎯 TARGET_SWITCH: Display update called`);
            }
            
            if (enhancedData) {
                // Apply enhanced data after successful targeting
                setTimeout(() => {
                    this.applyEnhancedDataToTarget(objectId, enhancedData);
                }, 100);
            }
        } else {
            console.warn(`🎯 Failed to set target: ${objectId}`);
            debug('P1', `❌ CRITICAL: Failed to set target for ${objectData?.name || 'Unknown'} (${objectId}) - target lookup failed`);
            debug('TARGETING', `🎯 TARGET_SWITCH: Target lookup failed, attempting cleanup and fallback`);

            // CRITICAL FIX: When target switching fails, clear the wireframe and reset display
            // This prevents old enemy wireframes from remaining visible
            if (this.targetComputer.clearTargetWireframe) {
                debug('TARGETING', '🎯 TARGET_SWITCH: Clearing wireframe due to target lookup failure');
                this.targetComputer.clearTargetWireframe();
            }

            // Reset current target to prevent stale data
            this.targetComputer.currentTarget = null;
            this.targetComputer.targetIndex = -1;

            // Force display update to show "no target" state
            if (this.targetComputer.updateTargetDisplay) {
                this.targetComputer.updateTargetDisplay();
                debug('TARGETING', '🎯 TARGET_SWITCH: Display reset due to target lookup failure');
            }

            // Update reticle to show no target
            if (this.targetComputer.updateReticleTargetInfo) {
                this.targetComputer.updateReticleTargetInfo();
            }
        }

        return success;
    }

    /**
     * Notify Target Computer of new discovery
     */
    notifyTargetComputerOfDiscovery(objectId) {
        if (!this.targetComputer) return;

        // Get object data from Star Charts
        const objectData = this.starCharts.getObjectData(objectId);
        if (!objectData) return;

        // Add to Target Computer's target list
        this.addTargetToTargetComputer({
            id: objectId,
            name: objectData.name,
            type: objectData.type,
            discovered: true
        });

        // Force immediate target computer update for responsive discovery
        if (this.targetComputer && this.targetComputer.updateTargetList) {
            this.targetComputer.updateTargetList();
            debug('TARGETING', `🔄 Forced immediate target list update for discovery: ${objectData.name}`);
        }
        
        // Also force display update if this is the current target
        if (this.targetComputer && this.targetComputer.updateTargetDisplay) {
            this.targetComputer.updateTargetDisplay();
            debug('TARGETING', `🔄 Forced immediate display update for discovery: ${objectData.name}`);
        }

debug('TARGETING', `📡 Notified Target Computer of discovery: ${objectData.name}`);
    }

    /**
     * Add discovery callback
     */
    addDiscoveryCallback(callback) {
        if (typeof callback === 'function') {
            this.discoveryCallbacks.push(callback);
        }
    }

    /**
     * Add target selection callback
     */
    addTargetSelectionCallback(callback) {
        if (typeof callback === 'function') {
            this.targetSelectionCallbacks.push(callback);
        }
    }

    /**
     * Remove discovery callback
     */
    removeDiscoveryCallback(callback) {
        const index = this.discoveryCallbacks.indexOf(callback);
        if (index > -1) {
            this.discoveryCallbacks.splice(index, 1);
        }
    }

    /**
     * Get integration status
     */
    getStatus() {
        return {
            active: this.isActive,
            lastSyncTime: this.lastSyncTime,
            enhancedTargetsCount: this.enhancedTargets.size,
            discoveryCallbacksCount: this.discoveryCallbacks.length,
            starChartsAvailable: !!this.starCharts,
            targetComputerAvailable: !!this.targetComputer,
            solarSystemAvailable: !!this.solarSystem
        };
    }

    /**
     * Force synchronization
     */
    forceSync() {
        if (this.isActive) {
            this.syncTargetData();
debug('UTILITY', '🔄 Forced synchronization completed');
        }
    }

    /**
     * Clean up integration
     */
    cleanup() {
        this.deactivate();
        this.enhancedTargets.clear();
        this.discoveryCallbacks.length = 0;
debug('TARGETING', '🧹 Star Charts ↔ Target Computer Integration cleaned up');
    }

    /**
     * Get wireframe configuration for an object type using centralized data
     * @param {string} objectType - The object type to get wireframe config for
     * @returns {Object} Wireframe configuration with geometry and description
     */
    getWireframeType(objectType) {
        return getWireframeType(objectType);
    }
}

/**
 * Factory function to create and initialize the integration
 */
export function createStarChartsTargetComputerIntegration(starChartsManager, targetComputerManager, solarSystemManager) {
    const integration = new StarChartsTargetComputerIntegration(
        starChartsManager,
        targetComputerManager,
        solarSystemManager
    );

    // Auto-activate if all components are available
    if (starChartsManager && targetComputerManager && solarSystemManager) {
        integration.activate();
debug('TARGETING', '✅ Star Charts ↔ Target Computer Integration auto-activated');
    } else {
        console.warn('⚠️ Star Charts Integration: Missing components - not activated');
        console.warn('   Star Charts:', !!starChartsManager);
        console.warn('   Target Computer:', !!targetComputerManager);
        console.warn('   Solar System:', !!solarSystemManager);
    }

    return integration;
}
