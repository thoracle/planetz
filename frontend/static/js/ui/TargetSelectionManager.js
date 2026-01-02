/**
 * TargetSelectionManager
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Manages all target selection operations including:
 * - Target cycling (TAB key)
 * - Selection by ID (from Star Charts)
 * - Selection by name (fallback)
 * - Selection from scanner (Long Range Scanner)
 *
 * Features:
 * - Unified target selection logic
 * - Automatic wireframe creation
 * - Ship target computer synchronization
 * - Discovery status integration
 * - Range monitoring
 */

import { debug } from '../debug.js';

export class TargetSelectionManager {
    /**
     * Create a TargetSelectionManager
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;
    }

    /**
     * Set target from Long Range Scanner
     * @param {Object} targetData - Target data from scanner
     */
    setTargetFromScanner(targetData) {
        if (!targetData) {
            debug('P1', '🎯 Cannot set target from scanner - no target data provided');
            return;
        }

        // Set the target directly without cycling through the normal target list
        this.tcm.currentTarget = targetData;
        this.tcm.isManualNavigationSelection = true; // Mark as navigation selection for protection

        // Find and set the target index in the current target list
        let targetIndex = this.tcm.targetObjects.findIndex(target =>
            target.name === targetData.name ||
            target.id === targetData.id ||
            (target.object && target.object.userData && target.object.userData.id === targetData.id)
        );

        if (targetIndex !== -1) {
            this.tcm.targetIndex = targetIndex;
            // Update the existing target data with scanner data to ensure consistency
            this.tcm.targetObjects[targetIndex] = { ...this.tcm.targetObjects[targetIndex], ...targetData };
        } else {
            // If target is not in the current list, add it and set the index
            this.tcm.targetObjects.push(targetData);
            this.tcm.targetIndex = this.tcm.targetObjects.length - 1;
        }

        // FIXED: Reset arrow state for new target to prevent stale hysteresis
        this.tcm.directionArrowRenderer.lastArrowState = false;

        // Force direction arrow update
        this.tcm.updateDirectionArrow();

        // Ensure target synchronization - force update target display immediately
        this.tcm.updateTargetDisplay();

        // Additional safeguard: verify the target was set correctly
        if (this.tcm.currentTarget?.name !== targetData.name) {
            debug('P1', `🎯 Scanner target synchronization issue - expected ${targetData.name}, got ${this.tcm.currentTarget?.name}`);
            this.tcm.currentTarget = targetData;
            this.tcm.updateTargetDisplay();
        }

        // Start range monitoring for the scanner target
        this.tcm.startRangeMonitoring();

        // INSTANT DISCOVERY: Force immediate discovery check to eliminate lag
        const starChartsManager = this.tcm.viewManager?.navigationSystemManager?.starChartsManager;
        if (starChartsManager && targetData?.id) {
            starChartsManager.forceDiscoveryCheck(targetData.id);
        }

        // Sync with StarfieldManager
        if (this.tcm.viewManager?.starfieldManager) {
            this.tcm.viewManager.starfieldManager.currentTarget = this.tcm.currentTarget?.object || this.tcm.currentTarget;
            this.tcm.viewManager.starfieldManager.targetIndex = this.tcm.targetIndex;
        }
    }

    /**
     * Cycle to the next or previous target
     * @param {boolean} forward - Whether to cycle forward (true) or backward (false). Default: true
     */
    cycleTarget(forward = true) {
        try {
            debug('TARGETING', `🎯 TAB PRESSED: TargetComputerManager.cycleTarget called (forward=${forward})`);

            // Rate-limited target list debug (only show occasionally to reduce spam)
            if (Math.random() < 0.1) {
                debug('TARGETING', `🔍 CURRENT TARGET LIST (${this.tcm.targetObjects.length} targets)`);
                this.tcm.targetObjects.slice(0, 5).forEach((target, i) => {
                    debug('TARGETING', `  [${i}] ${target.name} - ID: "${target.id}" - Distance: ${target.distance?.toFixed(1)}km`);
                });
            }

            // Add waypoints to targeting system before cycling (only if not already added)
            if (!this.tcm._waypointsAdded) {
                this.tcm.addWaypointsToTargets();
            }

            // Debug: Log all conditions that might prevent cycling
            debug('TARGETING', `🎯 TAB: Checking conditions - isDocked: ${this.tcm.viewManager?.starfieldManager?.isDocked}, undockCooldown: ${this.tcm.viewManager?.starfieldManager?.undockCooldown ? (Date.now() < this.tcm.viewManager.starfieldManager.undockCooldown) : false}, preventTargetChanges: ${this.tcm.preventTargetChanges}, targetComputerEnabled: ${this.tcm.targetComputerEnabled}, targetObjectsLength: ${this.tcm.targetObjects?.length || 0}`);

            // Prevent cycling targets while docked
            if (this.tcm.viewManager?.starfieldManager?.isDocked) {
                debug('TARGETING', `🎯 TAB: Blocked - ship is docked`);
                return;
            }

            // Prevent cycling during undock cooldown
            if (this.tcm.viewManager?.starfieldManager?.undockCooldown && Date.now() < this.tcm.viewManager.starfieldManager.undockCooldown) {
                debug('TARGETING', `🎯 TAB: Blocked - undock cooldown active`);
                return;
            }

            // Prevent target changes during dummy creation
            if (this.tcm.preventTargetChanges) {
                debug('TARGETING', `🎯 TAB: Blocked - preventTargetChanges flag`);
                return;
            }

            if (!this.tcm.targetComputerEnabled || this.tcm.targetObjects.length === 0) {
                debug('TARGETING', `🎯 TAB: Blocked - not enabled or no targets (enabled: ${this.tcm.targetComputerEnabled}, targets: ${this.tcm.targetObjects.length})`);
                return;
            }

            debug('TARGETING', '🎯 TAB: All checks passed, proceeding with target cycling');

            // Additional debugging for target cycling issues
            if (this.tcm.preventTargetChanges) {
                return;
            }

            // Hide reticle until new target is set
            if (this.tcm.targetReticle) {
                this.tcm.targetReticle.style.display = 'none';
            }

            // Keep target HUD visible
            this.tcm.targetHUD.style.display = 'block';

            // Cycle to next or previous target
            const previousIndex = this.tcm.targetIndex;
            const previousTarget = this.tcm.currentTarget;

            if (this.tcm.targetIndex === -1 || !this.tcm.currentTarget) {
                this.tcm.targetIndex = 0;
            } else {
                if (forward) {
                    // Cycle forward (next target)
                    this.tcm.targetIndex = (this.tcm.targetIndex + 1) % this.tcm.targetObjects.length;
                } else {
                    // Cycle backward (previous target)
                    this.tcm.targetIndex = (this.tcm.targetIndex - 1 + this.tcm.targetObjects.length) % this.tcm.targetObjects.length;
                }
            }

            // Get the target data directly from our target list
            const targetData = this.tcm.targetObjects[this.tcm.targetIndex];

            // For waypoints, use the targetData itself (which has isWaypoint flag)
            // For other objects, use the object property if it exists
            if (targetData && targetData.isWaypoint) {
                this.tcm.currentTarget = targetData; // Use waypoint target data directly
            } else {
                this.tcm.currentTarget = targetData.object || targetData; // Store the original object, not the processed target data
            }

            // FIXED: Don't clear navigation selection flag during cycling
            // The flag should only clear when user explicitly changes targeting mode,
            // not when cycling through targets (which is part of normal navigation workflow)
            // Preserves manual selection context and enables target list enhancement
            if (previousTarget && targetData) {
                if (previousTarget.name !== targetData.name) {
                    // Cycling to a different target - preserve navigation selection flag
                    // Only clear generic manual selection flag
                    this.tcm.isManualSelection = false;
                } else if (previousTarget.name === targetData.name && (this.tcm.isManualNavigationSelection || this.tcm.isManualSelection)) {
                    // Cycling back to the same target - preserve the flags
                }
            }

            // Sync with ship's TargetComputer system for sub-targeting
            const ship = this.tcm.viewManager?.getShip();
            const targetComputer = ship?.getSystem('target_computer');
            if (targetComputer && targetComputer.isActive) {
                // For enemy ships, pass the ship instance (has systems). For others, pass the render object
                const isEnemyShip = !!(targetData?.isShip && targetData?.ship);
                let targetForSubTargeting = isEnemyShip ? targetData.ship : (targetData?.object || targetData);

                // Ensure the target object has name and faction information
                if (targetForSubTargeting && !isEnemyShip) {
                    // Copy essential information from targetData to the object
                    if (!targetForSubTargeting.name && targetData.name) {
                        targetForSubTargeting.name = targetData.name;
                    }
                    if (!targetForSubTargeting.faction && targetData.faction) {
                        targetForSubTargeting.faction = targetData.faction;
                    }
                    if (!targetForSubTargeting.diplomacy && targetData.diplomacy) {
                        targetForSubTargeting.diplomacy = targetData.diplomacy;
                    }

                    // For navigation beacons and other objects, also check userData as fallback
                    if (!targetForSubTargeting.name && targetForSubTargeting.userData?.name) {
                        targetForSubTargeting.name = targetForSubTargeting.userData.name;
                    }
                    if (!targetForSubTargeting.faction && targetForSubTargeting.userData?.faction) {
                        targetForSubTargeting.faction = targetForSubTargeting.userData.faction;
                    }
                }

                targetComputer.setTarget(targetForSubTargeting);
            }

            // Always clear wireframe before switching targets (covers star wireframe case)
            this._clearWireframe();

            // Also remove any stray power-up overlay that might obscure re-render
            const pu = document.getElementById('powerup-animation');
            if (pu && pu.parentNode) {
                pu.parentNode.removeChild(pu);
            }

            // DISCOVERY FIX: Auto-discover objects when they become the current target
            // This ensures wireframe shows correct shape and color immediately
            const currentTargetData = this.tcm.getCurrentTargetData();
            if (currentTargetData && !currentTargetData.isShip) {
                const starChartsManager = this.tcm.viewManager?.navigationSystemManager?.starChartsManager;
                if (starChartsManager) {
                    const objectId = this.tcm.constructStarChartsId(currentTargetData);
                    if (objectId && !starChartsManager.isDiscovered(objectId)) {
                        // Auto-discover the object when it becomes the current target
                        starChartsManager.addDiscoveredObject(objectId, 'targeting', 'player');
                        debug('TARGETING', `🔍 Auto-discovered object on targeting: ${objectId} (${currentTargetData.name})`);
                    }
                }
            }

            // Create new wireframe and refresh HUD
            debug('TARGETING', `🎯 TAB: About to create wireframe for target: ${this.tcm.currentTarget?.name}`);

            // Handle waypoint-specific targeting
            if (this.tcm.currentTarget && this.tcm.currentTarget.isWaypoint) {
                debug('WAYPOINTS', `🎯 Waypoint targeted: ${this.tcm.currentTarget.name}`);
                this.tcm.createWaypointWireframe();
            } else {
                this.tcm.createTargetWireframe();
            }

            debug('TARGETING', `🎯 TAB: Wireframe creation completed, wireframe exists: ${!!this.tcm.targetWireframe}`);
            this.tcm.updateTargetDisplay();

            // FIXED: Reset arrow state for new target to prevent stale hysteresis
            this.tcm.directionArrowRenderer.lastArrowState = false;

            // Force direction arrow update after target cycling
            this.tcm.updateDirectionArrow();

            // Start monitoring the selected target's range (for both manual and automatic cycles)
            this.tcm.startRangeMonitoring();

            debug('TARGETING', `🎯 TAB: cycleTarget completed - new target: ${this.tcm.currentTarget?.name || 'none'} (ID: ${this.tcm.currentTarget?.id || 'none'})`);

            // Notify Star Charts to update blinking target if it's open
            debug('TARGETING', `🎯 TAB: About to call notifyStarChartsOfTargetChange()`);
            this.tcm.notifyStarChartsOfTargetChange();
            debug('TARGETING', `🎯 TAB: Called notifyStarChartsOfTargetChange()`);

            // INSTANT DISCOVERY: Force immediate discovery check to eliminate lag
            const starChartsManagerForDiscovery = this.tcm.viewManager?.navigationSystemManager?.starChartsManager;
            if (starChartsManagerForDiscovery && this.tcm.currentTarget?.id) {
                starChartsManagerForDiscovery.forceDiscoveryCheck(this.tcm.currentTarget.id);
            }

        } catch (error) {
            debug('P1', `🎯 ERROR in TargetComputerManager.cycleTarget: ${error}`);
            debug('TARGETING', `🎯 ERROR in cycleTarget: ${error.message}`);
        }
    }

    /**
     * Set target by object ID (from Star Charts)
     * @param {string} objectId - The ID of the object to target
     * @returns {boolean} Whether the target was successfully set
     */
    setTargetById(objectId) {
        debug('TARGETING', `🎯 setTargetById called with: ${objectId}`);
        debug('TARGETING', `🎯 setTargetById call stack:`, new Error().stack);

        if (!objectId) {
            debug('P1', '🎯 setTargetById: No object ID provided');
            return false;
        }

        // Normalize A0_ prefix case to avoid casing mismatches
        const normalizedId = typeof objectId === 'string' ? objectId.replace(/^a0_/i, 'A0_') : objectId;

        debug('TARGETING', `🎯 Setting target by ID: ${normalizedId}, targetObjects.length: ${this.tcm.targetObjects.length}`);

        // Debug: Log all target IDs for comparison
        debug('TARGETING', `🎯 All target IDs in list:`, this.tcm.targetObjects.map((t, i) => `[${i}] ${t.name}: "${t.id}"`));

        if (this.tcm.targetObjects.length === 0) {
            debug('TARGETING', `🎯 WARNING: targetObjects array is empty! No targets available for lookup.`);
        }

        for (let i = 0; i < this.tcm.targetObjects.length; i++) {
            const target = this.tcm.targetObjects[i];

            const userDataId = target?.object?.userData?.id;
            const directIdMatch = (userDataId && userDataId === normalizedId) || (target.id && target.id === normalizedId);

            // Fuzzy matches are last resort only
            const nameNormalized = target.name?.toLowerCase().replace(/\s+/g, '_');
            const fuzzyMatch = (target.name === normalizedId) || (nameNormalized === normalizedId) || (target?.object?.name === normalizedId);

            const matchesId = directIdMatch || (!directIdMatch && fuzzyMatch);

            debug('TARGETING', `🎯 Checking target ${i}: ${target.name} (id: ${target.id || 'n/a'}, userData.id: ${userDataId || 'n/a'}) - directMatch: ${!!directIdMatch}, fuzzyMatch: ${!!fuzzyMatch}`);

            if (matchesId) {
                this._setTargetAtIndex(i, target, normalizedId);
                debug('TARGETING', `🎯 setTargetById: Target found and set, about to call updateTargetDisplay`);
                return true;
            }
        }

        debug('P1', `🎯 Target not found by ID: ${normalizedId}`);
        debug('TARGETING', `🎯 Available targets:`, this.tcm.targetObjects.map(t => `${t.name} (${t.id || t?.object?.userData?.id || 'no-id'})`));

        // FALLBACK: Try to find by name if ID lookup fails
        // This handles cases where objects have names but no IDs
        const objectName = normalizedId.replace(/^A0_/, '').replace(/_/g, ' ');
        debug('TARGETING', `🎯 FALLBACK: Attempting name-based lookup for "${objectName}"`);

        // Log all available target names for debugging
        const availableNames = this.tcm.targetObjects.map(t => t.name).filter(n => n);
        debug('TARGETING', `🎯 FALLBACK: Available target names: ${availableNames.join(', ')}`);

        for (let i = 0; i < this.tcm.targetObjects.length; i++) {
            const target = this.tcm.targetObjects[i];

            // Try multiple matching strategies
            let nameMatch = false;
            const targetName = target.name;

            if (!targetName) continue;

            // Exact match
            if (targetName.toLowerCase() === objectName.toLowerCase()) {
                nameMatch = true;
                debug('TARGETING', `🎯 FALLBACK: Exact match found: "${targetName}"`);
            }
            // Handle star/star mapping
            else if (objectName === 'star' && (targetName.toLowerCase().includes('sol') || targetName.toLowerCase().includes('star'))) {
                nameMatch = true;
                debug('TARGETING', `🎯 FALLBACK: Star match found: "${targetName}"`);
            }
            // Handle terra prime variations
            else if (objectName === 'terra_prime' && targetName.toLowerCase().includes('terra prime')) {
                nameMatch = true;
                debug('TARGETING', `🎯 FALLBACK: Terra Prime match found: "${targetName}"`);
            }
            // Handle luna variations
            else if (objectName === 'luna' && targetName.toLowerCase().includes('luna')) {
                nameMatch = true;
                debug('TARGETING', `🎯 FALLBACK: Luna match found: "${targetName}"`);
            }
            // Handle europa variations
            else if (objectName === 'europa' && targetName.toLowerCase().includes('europa')) {
                nameMatch = true;
                debug('TARGETING', `🎯 FALLBACK: Europa match found: "${targetName}"`);
            }
            // Generic partial match as last resort
            else if (objectName.length > 2 && targetName.toLowerCase().includes(objectName.toLowerCase())) {
                nameMatch = true;
                debug('TARGETING', `🎯 FALLBACK: Partial match found: "${targetName}" contains "${objectName}"`);
            }

            if (nameMatch) {
                debug('TARGETING', `🎯 FALLBACK: Found target by name: ${targetName}`);
                this._setTargetAtIndex(i, target, normalizedId);
                debug('TARGETING', `🎯 FALLBACK: Target set successfully to ${target.name} (originally ${normalizedId})`);
                return true;
            }
        }

        debug('TARGETING', `🎯 FALLBACK: Name-based lookup also failed for "${objectName}"`);

        // FINAL FALLBACK: Try to add object dynamically from StarCharts data
        debug('TARGETING', `🎯 FINAL FALLBACK: Attempting to add object from StarCharts data: ${normalizedId}`);

        const starChartsManager = this.tcm.viewManager?.navigationSystemManager?.starChartsManager;
        if (starChartsManager) {
            const objectData = starChartsManager.getObjectData(normalizedId);
            if (objectData) {
                // CRITICAL FIX: Check current sector to prevent cross-sector contamination
                const currentSector = this.tcm.viewManager?.solarSystemManager?.currentSector || 'A0';
                if (normalizedId && !normalizedId.startsWith(currentSector + '_')) {
                    debug('TARGETING', `🚫 setTargetById: Skipping target from different sector: ${objectData.name} (ID: ${normalizedId}, current sector: ${currentSector})`);
                    return false;
                }

                debug('TARGETING', `🎯 FINAL FALLBACK: Found object data in StarCharts: ${objectData.name}, adding to target list`);

                // Create a target entry for this object
                const targetData = {
                    id: normalizedId,
                    name: objectData.name,
                    type: objectData.type,
                    position: objectData.cartesianPosition || objectData.position || [0, 0, 0],
                    distance: 0, // Will be calculated
                    isShip: false,
                    object: null, // No Three.js object yet
                    faction: objectData.faction,
                    diplomacy: objectData.diplomacy,
                    isSpaceStation: objectData.type === 'space_station' || objectData.type === 'station' || (objectData.type && (
                        objectData.type.toLowerCase().includes('station') ||
                        objectData.type.toLowerCase().includes('complex') ||
                        objectData.type.toLowerCase().includes('platform') ||
                        objectData.type.toLowerCase().includes('facility') ||
                        objectData.type.toLowerCase().includes('base')
                    )),
                    isMoon: objectData.type === 'moon'
                };

                // Add to target list
                this.tcm.targetObjects.push(targetData);
                const newIndex = this.tcm.targetObjects.length - 1;

                // Set as current target
                this.tcm.targetIndex = newIndex;
                this.tcm.currentTarget = targetData;
                this.tcm.isManualSelection = true;
                this.tcm.isManualNavigationSelection = true;

                // Update display
                this.tcm.createTargetWireframe();
                this.tcm.updateTargetDisplay();
                this.tcm.updateReticleTargetInfo();

                debug('TARGETING', `🎯 FINAL FALLBACK: Successfully added and targeted object from StarCharts: ${objectData.name}`);
                return true;
            }
        }

        debug('TARGETING', `🎯 CRITICAL: All lookup methods failed for ${normalizedId}. Target switching will not work until target objects are properly populated with IDs or names.`);
        return false;
    }

    /**
     * Set target by name (fallback for Star Charts integration)
     * @param {string} objectName - The name of the object to target
     * @returns {boolean} Whether the target was successfully set
     */
    setTargetByName(objectName) {
        if (!objectName) {
            debug('P1', '🎯 setTargetByName: No object name provided');
            return false;
        }

        debug('TARGETING', `🎯 Setting target by name: ${objectName}`);

        // Search through current target objects by name
        for (let i = 0; i < this.tcm.targetObjects.length; i++) {
            const target = this.tcm.targetObjects[i];

            if (target.name === objectName) {
                // Set target with proper synchronization
                this.tcm.targetIndex = i;
                this.tcm.currentTarget = target.object || target;

                // Mark as manual navigation selection to prevent automatic override
                this.tcm.isManualSelection = true;
                this.tcm.isManualNavigationSelection = true; // Preserve navigation context

                // Force immediate display update
                this.tcm.updateTargetDisplay();
                this.tcm.updateReticleTargetInfo();

                debug('TARGETING', `🎯 Star Charts: Target set by name to ${target.name} at index ${i}`);
                return true;
            }
        }

        debug('P1', `🎯 Target not found by name: ${objectName}`);
        return false;
    }

    /**
     * Internal helper: Set target at a specific index
     * Consolidates common logic between setTargetById main path and fallback
     * @param {number} index - Index in targetObjects array
     * @param {Object} target - Target data object
     * @param {string} normalizedId - Normalized object ID
     * @private
     */
    _setTargetAtIndex(index, target, normalizedId) {
        this.tcm.targetIndex = index;
        // Prefer the actual Three.js object when available for accurate info lookups
        this.tcm.currentTarget = target.object || target;

        // Mark as manual navigation selection to prevent automatic override
        this.tcm.isManualSelection = true;
        this.tcm.isManualNavigationSelection = true;

        // Update ship's target computer system (same as cycleTarget does)
        // This ensures subsystems are properly cleared when switching to unknown objects
        const ship = this.tcm.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');

        if (targetComputer && targetComputer.setTarget) {
            // Prepare target data for subsystem targeting (same logic as cycleTarget)
            let targetForSubTargeting = this.tcm.currentTarget;

            if (targetForSubTargeting && typeof targetForSubTargeting === 'object') {
                // Ensure target has required properties for subsystem targeting
                if (!targetForSubTargeting.name && target.name) {
                    targetForSubTargeting.name = target.name;
                }
                if (!targetForSubTargeting.faction && target.faction) {
                    targetForSubTargeting.faction = target.faction;
                }
                // For navigation beacons and other objects, also check userData as fallback
                if (!targetForSubTargeting.name && targetForSubTargeting.userData?.name) {
                    targetForSubTargeting.name = targetForSubTargeting.userData.name;
                }
                if (!targetForSubTargeting.faction && targetForSubTargeting.userData?.faction) {
                    targetForSubTargeting.faction = targetForSubTargeting.userData.faction;
                }
            }

            // Update ship's target computer system - this clears subsystems for unknown objects
            targetComputer.setTarget(targetForSubTargeting);

            // Force UI refresh to ensure subsystem clearing is reflected in display
            if (this.tcm.updateTargetDisplay) {
                this.tcm.updateTargetDisplay();
            }
            if (this.tcm.updateReticleTargetInfo) {
                this.tcm.updateReticleTargetInfo();
            }

            // Delayed refresh to override any conflicting updates
            setTimeout(() => {
                if (this.tcm.updateTargetDisplay) {
                    this.tcm.updateTargetDisplay();
                }
                if (this.tcm.updateReticleTargetInfo) {
                    this.tcm.updateReticleTargetInfo();
                }
            }, 100);
        }

        // Force immediate HUD refresh
        // If selected target lacks a Three.js object, attempt to resolve it now
        if (!this.tcm.currentTarget || !this.tcm.currentTarget.position) {
            this._resolveTargetObject(index, target, normalizedId);
        }

        // Clear existing wireframe before creating new one (same as cycleTarget does)
        debug('TARGETING', `🎯 TARGET_SWITCH: Clearing existing wireframe`);
        this._clearWireframe();

        // Create new wireframe for the selected target
        this.tcm.createTargetWireframe();
        debug('TARGETING', `🎯 setTargetById: About to call updateTargetDisplay()`);
        this.tcm.updateTargetDisplay();
        debug('TARGETING', `🎯 setTargetById: Called updateTargetDisplay()`);
        this.tcm.updateReticleTargetInfo();

        // INSTANT DISCOVERY: Force immediate discovery check to eliminate lag
        const starChartsManager = this.tcm.viewManager?.navigationSystemManager?.starChartsManager;
        if (starChartsManager && normalizedId) {
            starChartsManager.forceDiscoveryCheck(normalizedId);
        }

        debug('TARGETING', `🎯 Star Charts: Target set to ${target.name} (ID: ${normalizedId}) at index ${index}`);
    }

    /**
     * Internal helper: Resolve target object from various sources
     * @param {number} index - Index in targetObjects array
     * @param {Object} target - Target data object
     * @param {string} normalizedId - Normalized object ID
     * @private
     */
    _resolveTargetObject(index, target, normalizedId) {
        try {
            const vm = this.tcm.viewManager || window.viewManager;
            const ssm = this.tcm.solarSystemManager || vm?.solarSystemManager || window.solarSystemManager;
            const sfm = vm?.starfieldManager || window.starfieldManager;

            let resolved = null;
            if (target.type === 'navigation_beacon' && sfm?.navigationBeacons) {
                resolved = sfm.navigationBeacons.find(b => b?.userData?.id === normalizedId) ||
                           sfm.navigationBeacons.find(b => (b?.userData?.name || b?.name) === target.name);
            }
            if (!resolved && ssm?.celestialBodies && typeof ssm.celestialBodies.get === 'function') {
                resolved = ssm.celestialBodies.get(normalizedId) ||
                           ssm.celestialBodies.get(`beacon_${normalizedId}`) ||
                           ssm.celestialBodies.get(`station_${target.name?.toLowerCase()?.replace(/\s+/g, '_')}`);
            }
            if (resolved) {
                this.tcm.currentTarget = resolved;
                // Update the target object reference in our list as well
                this.tcm.targetObjects[index] = { ...target, object: resolved, position: resolved.position };
            }
        } catch (e) {
            // non-fatal - target will work without Three.js object
            debug('TARGETING', `🎯 Target resolution failed: ${e.message}`);
        }
    }

    /**
     * Internal helper: Clear existing wireframe
     * @private
     */
    _clearWireframe() {
        if (this.tcm.targetWireframe) {
            debug('INSPECTION', `🔍 Clearing existing wireframe: ${this.tcm.targetWireframe.type || 'unknown type'}`);
            this.tcm.wireframeScene.remove(this.tcm.targetWireframe);
            if (this.tcm.targetWireframe.geometry) {
                this.tcm.targetWireframe.geometry.dispose();
            }
            if (this.tcm.targetWireframe.material) {
                if (Array.isArray(this.tcm.targetWireframe.material)) {
                    this.tcm.targetWireframe.material.forEach(material => material.dispose());
                } else {
                    this.tcm.targetWireframe.material.dispose();
                }
            }
            this.tcm.targetWireframe = null;
            debug('INSPECTION', `🔍 Wireframe cleared successfully`);
        } else {
            debug('INSPECTION', `🔍 No existing wireframe to clear`);
        }
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // No resources to dispose in this manager
    }
}
