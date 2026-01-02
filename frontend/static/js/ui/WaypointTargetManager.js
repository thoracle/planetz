/**
 * WaypointTargetManager
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Manages waypoint/virtual target integration with the targeting system.
 *
 * Features:
 * - Virtual target creation for mission waypoints
 * - Waypoint interruption and resumption tracking
 * - Waypoint-specific HUD styling (magenta colors)
 * - Integration with WaypointManager
 * - Adding waypoints to target list
 */

import { debug } from '../debug.js';

export class WaypointTargetManager {
    /**
     * Create a WaypointTargetManager
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;

        // Waypoint interruption tracking
        this.interruptedWaypoint = null;
        this.waypointInterruptionTime = null;

        // Waypoint integration state
        this._waypointsAdded = false;
        this._waypointStyleApplied = false;
    }

    /**
     * Target a waypoint via the cycling mechanism
     * @param {Object|string} waypointData - Waypoint data object or waypoint ID string
     * @returns {boolean} - True if waypoint was targeted successfully
     */
    targetWaypointViaCycle(waypointData) {
        // Handle both waypoint object and waypoint ID string
        let waypoint;

        if (typeof waypointData === 'string') {
            // If it's a string, treat it as waypoint ID
            waypoint = window.waypointManager?.getWaypoint(waypointData);
            if (!waypoint) {
                debug('P1', `🎯 Waypoint not found: ${waypointData}`);
                return false;
            }
        } else if (waypointData && waypointData.position) {
            // If it's an object with position, use it directly
            waypoint = waypointData;
        } else {
            debug('P1', '🎯 targetWaypointViaCycle: Invalid waypoint data');
            return false;
        }

        // Enable target computer if not already enabled
        if (!this.tcm.targetComputerEnabled) {
            this.tcm.targetComputerEnabled = true;
            // Also update StarfieldManager's flag to keep them synchronized
            if (this.tcm.viewManager?.starfieldManager) {
                this.tcm.viewManager.starfieldManager.targetComputerEnabled = true;
            }
            debug('WAYPOINTS', '🎯 Auto-enabled target computer for waypoint targeting');
        }

        // First, add any existing active waypoints to target list
        this.addWaypointsToTargets();

        // Check if our specific waypoint is already in the target list
        let waypointIndex = this.tcm.targetObjects.findIndex(t =>
            t.id === waypoint.id ||
            (t.isWaypoint && t.name === waypoint.name) ||
            (t.type === 'waypoint' && t.name === waypoint.name)
        );

        // If waypoint not found, add it directly (handles newly created waypoints)
        if (waypointIndex === -1) {
            // Create waypoint target object (same format as addWaypointsToTargets)
            const waypointTarget = {
                id: waypoint.id,
                name: waypoint.name,
                displayName: waypoint.name,
                type: 'waypoint',
                isWaypoint: true,
                faction: 'waypoint',
                diplomacy: 'waypoint',
                position: {
                    x: waypoint.position[0],
                    y: waypoint.position[1],
                    z: waypoint.position[2]
                },
                waypointData: waypoint
            };

            // Add to target list
            this.tcm.targetObjects.push(waypointTarget);
            waypointIndex = this.tcm.targetObjects.length - 1;
        }

        // Set the target index to the waypoint and use the proven cycleTarget logic
        this.tcm.targetIndex = waypointIndex;

        // Use the same logic as cycleTarget for consistent behavior
        const targetData = this.tcm.targetObjects[this.tcm.targetIndex];

        // For waypoints, use the targetData itself (which has isWaypoint flag)
        if (targetData.isWaypoint || targetData.type === 'waypoint') {
            this.tcm.currentTarget = targetData;
        } else {
            debug('P1', '🎯 Target at index is not a waypoint');
            return false;
        }

        // Handle waypoint-specific targeting (same as cycleTarget)
        if (this.tcm.currentTarget && this.tcm.currentTarget.isWaypoint) {
            this.createWaypointWireframe();
        } else {
            this.tcm.createTargetWireframe();
        }

        this.tcm.updateTargetDisplay();

        // Force direction arrow update after waypoint targeting (same as cycleTarget)
        this.tcm.updateDirectionArrow();

        // Start monitoring the selected target's range
        this.tcm.startRangeMonitoring();

        // Sync with StarfieldManager (same as cycleTarget)
        if (this.tcm.viewManager?.starfieldManager) {
            this.tcm.viewManager.starfieldManager.currentTarget = this.tcm.currentTarget?.object || this.tcm.currentTarget;
            this.tcm.viewManager.starfieldManager.targetIndex = this.tcm.targetIndex;
        }
        return true;
    }

    /**
     * Set virtual target (Mission waypoint integration)
     * @deprecated Use targetWaypointViaCycle() instead for consistent behavior
     * Creates a virtual target object for mission waypoints
     * @param {Object|string} waypointData - Waypoint data object or waypoint ID string
     * @returns {boolean} - True if virtual target was created and set
     */
    setVirtualTarget(waypointData) {
        // Handle both waypoint object and waypoint ID string
        let waypoint;

        if (typeof waypointData === 'string') {
            // If it's a string, treat it as waypoint ID
            waypoint = window.waypointManager?.getWaypoint(waypointData);
            if (!waypoint) {
                debug('P1', `🎯 Waypoint not found: ${waypointData}`);
                return false;
            }
        } else if (waypointData && waypointData.position) {
            // If it's an object with position, use it directly
            waypoint = waypointData;
        } else {
            debug('P1', '🎯 setVirtualTarget: Invalid waypoint data');
            return false;
        }

        // Create virtual target object
        const virtualTarget = {
            id: waypoint.id,
            name: waypoint.name || 'Mission Waypoint',
            type: 'waypoint', // Set as waypoint type for proper color coding
            position: {
                x: waypoint.position[0],
                y: waypoint.position[1],
                z: waypoint.position[2]
            },
            isVirtual: true,
            isWaypoint: true, // Additional flag for clarity
            waypointData: waypoint
        };

        // Enhanced duplicate check - check multiple criteria to prevent duplicates
        const existingIndex = this.tcm.targetObjects.findIndex(t =>
            t.id === virtualTarget.id ||
            (t.isWaypoint && t.name === virtualTarget.name) ||
            (t.isVirtual && t.name === virtualTarget.name) ||
            (t.type === 'waypoint' && t.name === virtualTarget.name)
        );

        if (existingIndex >= 0) {
            // Update existing virtual target
            this.tcm.targetObjects[existingIndex] = virtualTarget;
            this.tcm.targetIndex = existingIndex;
        } else {
            // Add new virtual target
            this.tcm.targetObjects.push(virtualTarget);
            this.tcm.targetIndex = this.tcm.targetObjects.length - 1;
        }

        this.tcm.currentTarget = virtualTarget;

        // Enable target computer for waypoint targeting
        if (!this.tcm.targetComputerEnabled) {
            this.tcm.targetComputerEnabled = true;
            // Also update StarfieldManager's flag to keep them synchronized
            if (this.tcm.viewManager?.starfieldManager) {
                this.tcm.viewManager.starfieldManager.targetComputerEnabled = true;
            }
            debug('WAYPOINTS', '🎯 Auto-enabled target computer for waypoint targeting');
        }

        // Create wireframe for the waypoint target
        this.tcm.createTargetWireframe(); // This will delegate to createWaypointWireframe() for waypoints

        this.tcm.updateTargetDisplay();

        // Force direction arrow update after waypoint targeting setup
        try {
            // Call immediately, just like in cycleTarget - no delay needed
            this.tcm.updateDirectionArrow();
        } catch (error) {
            debug('P1', `Error calling updateDirectionArrow(): ${error}`);
        }

        debug('TARGETING', `🎯 Virtual target created: ${virtualTarget.name} at position (${virtualTarget.position?.x?.toFixed(1)}, ${virtualTarget.position?.y?.toFixed(1)}, ${virtualTarget.position?.z?.toFixed(1)})`);
        debug('TARGETING', `🎯 Star Charts: Virtual target set to ${virtualTarget.name}`);
        return true;
    }

    /**
     * Remove virtual target by ID
     * @param {string} waypointId - The waypoint ID to remove
     * @returns {boolean} - True if target was found and removed
     */
    removeVirtualTarget(waypointId) {
        debug('TARGETING', `🎯 removeVirtualTarget called for: ${waypointId}`);
        debug('TARGETING', `🎯 Current target: ${this.tcm.currentTarget?.name || 'None'} (id: ${this.tcm.currentTarget?.id || 'None'})`);
        debug('TARGETING', `🎯 Target objects count: ${this.tcm.targetObjects.length}`);

        const targetIndex = this.tcm.targetObjects.findIndex(t =>
            t.isVirtual && t.id === waypointId
        );

        if (targetIndex >= 0) {
            debug('TARGETING', `🎯 Found waypoint at index ${targetIndex}, removing...`);

            // Remove from target list
            this.tcm.targetObjects.splice(targetIndex, 1);

            // Adjust current target index if necessary
            if (this.tcm.targetIndex >= targetIndex) {
                this.tcm.targetIndex = Math.max(0, this.tcm.targetIndex - 1);
            }

            debug('TARGETING', `🎯 After removal: targetObjects.length=${this.tcm.targetObjects.length}, targetIndex=${this.tcm.targetIndex}`);

            // Update current target if we removed the active target
            if (this.tcm.currentTarget && this.tcm.currentTarget.id === waypointId) {
                debug('TARGETING', `🎯 Removed waypoint was current target, updating...`);
                if (this.tcm.targetObjects.length > 0) {
                    this.tcm.currentTarget = this.tcm.targetObjects[this.tcm.targetIndex];
                    debug('TARGETING', `🎯 Switched to new target: ${this.tcm.currentTarget.name}`);
                    this.tcm.updateTargetDisplay();
                } else {
                    debug('TARGETING', `🎯 No more targets, clearing current target`);
                    this.tcm.clearCurrentTarget();
                }
            } else {
                debug('TARGETING', `🎯 Removed waypoint was not current target, no target update needed`);
            }

            debug('TARGETING', `🎯 Star Charts: Removed virtual target ${waypointId}`);
            return true;
        }

        debug('TARGETING', `🎯 Waypoint ${waypointId} not found in target list`);
        return false;
    }

    /**
     * Get all virtual targets
     * @returns {Array} - Array of virtual target objects
     */
    getVirtualTargets() {
        return this.tcm.targetObjects.filter(t => t.isVirtual);
    }

    /**
     * Check if current target is virtual
     * @returns {boolean} - True if current target is virtual
     */
    isCurrentTargetVirtual() {
        return this.tcm.currentTarget && this.tcm.currentTarget.isVirtual;
    }

    /**
     * Check if current target is a waypoint
     * @returns {boolean} - Whether current target is a waypoint
     */
    isCurrentTargetWaypoint() {
        return this.tcm.currentTarget &&
               this.tcm.currentTarget.type === 'waypoint' &&
               this.tcm.currentTarget.isVirtual;
    }

    /**
     * Enhanced setTarget with waypoint interruption tracking
     * @param {Object} newTarget - New target object
     */
    setTarget(newTarget) {
        // Check if current target is a waypoint and we're switching to non-waypoint
        if (this.isCurrentTargetWaypoint() && newTarget && newTarget.type !== 'waypoint') {
            // Store interrupted waypoint for later resumption
            this.interruptedWaypoint = {
                ...this.tcm.currentTarget,
                status: 'INTERRUPTED',
                interruptedAt: new Date(),
                interruptedBy: newTarget.type
            };

            debug('WAYPOINTS', `🎯 Waypoint interrupted: ${this.tcm.currentTarget.name} by ${newTarget.type}`);

            // Notify waypoint manager
            if (window.waypointManager) {
                window.waypointManager.notifyWaypointInterrupted(this.tcm.currentTarget.id);
            }
        }

        // Set new target normally
        this.tcm.currentTarget = newTarget;
        this.tcm.updateTargetDisplay();
    }

    /**
     * Resume interrupted waypoint
     * @returns {boolean} - Success status
     */
    resumeInterruptedWaypoint() {
        if (this.interruptedWaypoint) {
            const waypoint = this.interruptedWaypoint;

            // Clear interruption state
            this.interruptedWaypoint = null;
            this.waypointInterruptionTime = null;

            // Re-target the waypoint using the cycle approach
            const success = this.targetWaypointViaCycle(waypoint.id);

            // Update waypoint status
            if (success && window.waypointManager) {
                window.waypointManager.resumeWaypoint(waypoint.id);
            }

            debug('WAYPOINTS', `🎯 Resumed interrupted waypoint: ${waypoint.name}`);
            return success;
        }
        return false;
    }

    /**
     * Check if there's an interrupted waypoint
     * @returns {boolean} - Whether there's an interrupted waypoint
     */
    hasInterruptedWaypoint() {
        return this.interruptedWaypoint !== null;
    }

    /**
     * Get interrupted waypoint
     * @returns {Object|null} - Interrupted waypoint or null
     */
    getInterruptedWaypoint() {
        return this.interruptedWaypoint;
    }

    /**
     * Clear interrupted waypoint state
     */
    clearInterruptedWaypoint() {
        this.interruptedWaypoint = null;
        this.waypointInterruptionTime = null;
        debug('WAYPOINTS', '🎯 Cleared interrupted waypoint state');
    }

    /**
     * Get faction color based on diplomacy status
     * @param {Object} target - Target object
     * @returns {string} Hex color code
     */
    getFactionColor(target) {
        // Faction colors from docs/restart.md
        const FACTION_COLORS = {
            hostile: '#ff3333',    // Red
            neutral: '#ffff44',    // Yellow
            friendly: '#44ff44',   // Green
            unknown: '#44ffff',    // Cyan
            waypoint: '#ff00ff'    // Magenta - special case for waypoints
        };

        // Special handling for waypoints
        if (target && (target.isWaypoint || target.faction === 'waypoint' || target.diplomacy === 'waypoint')) {
            return FACTION_COLORS.waypoint;
        }

        // Standard faction color resolution
        const diplomacy = target?.diplomacy || target?.faction || 'unknown';
        return FACTION_COLORS[diplomacy] || FACTION_COLORS.unknown;
    }

    /**
     * Add waypoints to the targeting system
     * @returns {number} Number of waypoints added
     */
    addWaypointsToTargets() {
        if (!window.waypointManager) {
            debug('WAYPOINTS', '❌ WaypointManager not available');
            return 0;
        }

        // Prevent duplicate additions
        if (this._waypointsAdded) {
            debug('WAYPOINTS', '⏭️ Waypoints already added, skipping');
            return 0;
        }

        const activeWaypoints = window.waypointManager.getActiveWaypoints();
        let addedCount = 0;

        debug('WAYPOINTS', `🎯 addWaypointsToTargets() - Processing ${activeWaypoints.length} active waypoints`);
        activeWaypoints.forEach((wp, i) => {
            debug('WAYPOINTS', `  📍 ${i + 1}. ${wp.name}: status=${wp.status} (will be added to targets)`);
        });

        for (const waypoint of activeWaypoints) {
            // Enhanced duplicate check - check ID, name, and isVirtual flag
            const existingIndex = this.tcm.targetObjects.findIndex(t =>
                t.id === waypoint.id ||
                (t.isWaypoint && t.name === waypoint.name) ||
                (t.isVirtual && t.name === waypoint.name) ||
                (t.type === 'waypoint' && t.name === waypoint.name)
            );
            if (existingIndex !== -1) {
                debug('WAYPOINTS', `⏭️ Waypoint ${waypoint.name} already exists at index ${existingIndex}, skipping`);
                continue;
            }

            // Create waypoint target with explicit faction assignment
            const waypointTarget = {
                id: waypoint.id,
                name: waypoint.name,
                displayName: waypoint.name,
                type: 'waypoint',
                isWaypoint: true
            };

            // Explicitly set faction and diplomacy (force assignment)
            waypointTarget.faction = 'waypoint';
            waypointTarget.diplomacy = 'waypoint';

            // Add remaining properties (carefully to avoid overwriting faction)
            waypointTarget.position = {
                x: waypoint.position[0],
                y: waypoint.position[1],
                z: waypoint.position[2]
            };
            waypointTarget.waypointData = waypoint;
            waypointTarget.distance = 0;
            waypointTarget.color = '#ff00ff'; // Magenta
            waypointTarget.isTargetable = true;

            // Re-assign faction and diplomacy to ensure they stick
            waypointTarget.faction = 'waypoint';
            waypointTarget.diplomacy = 'waypoint';

            // DEBUG: Check if property assignment worked
            debug('WAYPOINTS', `🔧 AFTER PROPERTY ASSIGNMENT - Waypoint ${waypoint.name}: faction=${waypointTarget.faction}, diplomacy=${waypointTarget.diplomacy}`);

            // Create object property with waypoint properties
            waypointTarget.object = {
                position: {
                    x: waypoint.position[0],
                    y: waypoint.position[1],
                    z: waypoint.position[2]
                },
                id: waypoint.id,
                name: waypoint.name,
                displayName: waypoint.name,
                type: 'waypoint',
                isWaypoint: true,
                faction: 'waypoint',
                diplomacy: 'waypoint',
                userData: {
                    type: 'waypoint',
                    faction: 'waypoint',
                    diplomacy: 'waypoint',
                    isWaypoint: true
                }
            };

            // Calculate distance if camera is available
            if (this.tcm.camera && this.tcm.camera.position) {
                const dx = waypointTarget.position.x - this.tcm.camera.position.x;
                const dy = waypointTarget.position.y - this.tcm.camera.position.y;
                const dz = waypointTarget.position.z - this.tcm.camera.position.z;
                waypointTarget.distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
            } else {
                debug('WAYPOINTS', '⚠️ Camera not available for distance calculation');
            }

            this.tcm.targetObjects.push(waypointTarget);
            addedCount++;

            // DEBUG: Check faction after adding to targetObjects
            const addedObject = this.tcm.targetObjects[this.tcm.targetObjects.length - 1];
            debug('WAYPOINTS', `🔧 AFTER PUSH - Waypoint ${waypoint.name}: faction=${addedObject.faction}, diplomacy=${addedObject.diplomacy}`);

            debug('WAYPOINTS', `✅ Added waypoint: ${waypoint.name} (faction: ${waypointTarget.faction}, distance: ${waypointTarget.distance?.toFixed(2) || 'unknown'})`);
        }

        // Sort by distance
        this.tcm.targetObjects.sort((a, b) => (a.distance || 0) - (b.distance || 0));

        this._waypointsAdded = true;
        debug('WAYPOINTS', `✅ Added ${addedCount} waypoints to targeting system`);
        return addedCount;
    }

    /**
     * Apply waypoint-specific HUD colors (magenta)
     */
    setWaypointHUDColors() {
        if (!this.tcm.currentTarget || !this.tcm.currentTarget.isWaypoint) {
            debug('WAYPOINTS', '⏭️ Current target is not a waypoint, skipping HUD colors');
            return;
        }

        const WAYPOINT_COLOR = '#ff00ff'; // Magenta
        debug('WAYPOINTS', `🎨 Applying waypoint colors for: ${this.tcm.currentTarget.name}`);

        // Find and style HUD elements (including inner frames)
        const hudSelectors = [
            '#target-hud', '.target-hud', '.targeting-hud', '.target-computer',
            '[class*="target"]', '[id*="target"]', '.reticle', '.crosshair',
            '.target-name', '.current-target', '.target-display'
        ];

        let styledCount = 0;
        hudSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                // Apply magenta colors
                element.style.setProperty('color', WAYPOINT_COLOR, 'important');
                element.style.setProperty('border-color', WAYPOINT_COLOR, 'important');
                element.style.setProperty('box-shadow', `0 0 15px ${WAYPOINT_COLOR}`, 'important');

                // Also style child elements (inner frames)
                const children = element.querySelectorAll('*');
                children.forEach(child => {
                    if (child.style.borderColor || child.style.border ||
                        getComputedStyle(child).borderColor !== 'rgba(0, 0, 0, 0)') {
                        child.style.setProperty('border-color', WAYPOINT_COLOR, 'important');
                    }
                    if (child.style.color || getComputedStyle(child).color !== 'rgba(0, 0, 0, 0)') {
                        child.style.setProperty('color', WAYPOINT_COLOR, 'important');
                    }
                });

                // Update text content for name displays
                if (element.classList.contains('target-name') ||
                    element.classList.contains('current-target') ||
                    element.classList.contains('target-display')) {
                    element.innerHTML = `📍 ${this.tcm.currentTarget.name}`;
                }

                styledCount++;
            });
        });

        debug('WAYPOINTS', `🎨 Applied magenta colors to ${styledCount} HUD elements`);
    }

    /**
     * Create waypoint-specific wireframe (diamond shape)
     * Delegates to WireframeRenderer
     */
    createWaypointWireframe() {
        this.tcm.wireframeRendererManager.createWaypointWireframe();
        // Keep local reference in sync for backwards compatibility
        this.tcm.targetWireframe = this.tcm.wireframeRendererManager.targetWireframe;
    }

    /**
     * Reset waypoints added flag (used when changing sectors/systems)
     */
    resetWaypointsAdded() {
        this._waypointsAdded = false;
        debug('WAYPOINTS', '🔄 Reset waypoints added flag');
    }

    /**
     * Get waypoints added state
     * @returns {boolean} Whether waypoints have been added
     */
    get waypointsAdded() {
        return this._waypointsAdded;
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.interruptedWaypoint = null;
        this.waypointInterruptionTime = null;
        this._waypointsAdded = false;
        this._waypointStyleApplied = false;
    }
}
