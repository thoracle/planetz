/**
 * TargetPositionManager
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Handles target position resolution and distance formatting.
 *
 * Features:
 * - Position extraction from various target data structures
 * - Three.js Vector3 position resolution
 * - Waypoint and virtual target position handling
 * - Distance formatting for display
 * - Fallback resolution via scene object lookup
 */

import { debug } from '../debug.js';

export class TargetPositionManager {
    /**
     * Create a TargetPositionManager
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;
    }

    /**
     * Get THREE reference from parent TCM
     */
    get THREE() {
        return this.tcm.THREE;
    }

    /**
     * Safely get position from target object (handles different target structures)
     * Always returns a Vector3 object or null
     * @param {Object} target - Target object to extract position from
     * @returns {THREE.Vector3|null} Position vector or null if not found
     */
    getTargetPosition(target) {
        if (!target) return null;

        // SPECIAL CASE: Handle virtual waypoints first
        if (target.isVirtual || target.isWaypoint || target.type === 'waypoint') {
            if (target.position && typeof target.position === 'object' &&
                typeof target.position.x === 'number' &&
                typeof target.position.y === 'number' &&
                typeof target.position.z === 'number') {
                return new this.THREE.Vector3(target.position.x, target.position.y, target.position.z);
            }
        }

        // Check for Three.js Vector3 object first
        if (target.position && typeof target.position.clone === 'function') {
            return target.position;
        }

        // Check for nested object with position
        if (target.object && target.object.position && typeof target.object.position.clone === 'function') {
            return target.object.position;
        }

        // Convert array position to Vector3
        if (target.position && Array.isArray(target.position) && target.position.length >= 3) {
            return new this.THREE.Vector3(target.position[0], target.position[1], target.position[2]);
        }

        // Convert plain object position to Vector3
        if (target.position && typeof target.position === 'object' &&
            typeof target.position.x === 'number' &&
            typeof target.position.y === 'number' &&
            typeof target.position.z === 'number') {
            return new this.THREE.Vector3(target.position.x, target.position.y, target.position.z);
        }

        // Try to extract position from nested object userData
        if (target.object && target.object.userData && target.object.userData.position) {
            const pos = target.object.userData.position;
            if (Array.isArray(pos) && pos.length >= 3) {
                return new this.THREE.Vector3(pos[0], pos[1], pos[2]);
            }
            if (typeof pos === 'object' && typeof pos.x === 'number') {
                return new this.THREE.Vector3(pos.x, pos.y, pos.z);
            }
        }

        // As a last resort, try resolving a live scene object by id/name (covers beacons/stations)
        try {
            const vm = this.tcm.viewManager || window.viewManager;
            const ssm = this.tcm.solarSystemManager || vm?.solarSystemManager || window.solarSystemManager;
            const sfm = vm?.starfieldManager || window.starfieldManager;

            const id = typeof (target.id || target?.object?.userData?.id || '') === 'string' ? (target.id || target?.object?.userData?.id || '').replace(/^a0_/i, 'A0_') : (target.id || target?.object?.userData?.id || '');
            const name = target.name || target?.object?.name || target?.object?.userData?.name;

            let resolved = null;
            // Beacons first
            if (sfm?.navigationBeacons) {
                resolved = sfm.navigationBeacons.find(b => b?.userData?.id === id) ||
                           sfm.navigationBeacons.find(b => (b?.userData?.name || b?.name) === name);
            }
            // General celestial bodies
            if (!resolved && ssm?.celestialBodies && typeof ssm.celestialBodies.get === 'function') {
                // Handle star ID mapping (A0_star -> 'star')
                if (id === 'A0_star') {
                    resolved = ssm.celestialBodies.get('star');
                } else {
                    resolved = ssm.celestialBodies.get(id) ||
                               ssm.celestialBodies.get(`beacon_${id}`) ||
                               (name ? ssm.celestialBodies.get(`station_${name.toLowerCase().replace(/\s+/g, '_')}`) : null);
                }

                // If still not found, try to find by name in celestial bodies
                // This handles cases where Star Charts objects have specific names but SolarSystemManager uses generic keys
                if (!resolved && name) {
                    // Try to find by iterating through celestial bodies and matching names
                    for (const [key, body] of ssm.celestialBodies) {
                        if (body && (body.name === name || body.userData?.name === name)) {
                            resolved = body;
                            debug('TARGETING', `Found celestial body by name lookup: ${name} -> ${key}`);
                            break;
                        }
                    }
                }
            }
            if (resolved && resolved.position && typeof resolved.position.clone === 'function') {
                // Persist the resolution onto target/currentTarget if possible
                // Check if currentTarget is writable before assignment
                try {
                    if (this.tcm.currentTarget === target) {
                        this.tcm.currentTarget = resolved;
                    }
                } catch (e) {
                    // Ignore readonly property errors - this is just an optimization
                    if (e.message && !e.message.includes('readonly')) {
                        debug('P1', `Error updating currentTarget: ${e}`);
                    }
                }
                // Also try to update corresponding entry in targetObjects
                try {
                    const idx = Array.isArray(this.tcm.targetObjects) ? this.tcm.targetObjects.findIndex(t => (t.id || '') === id || t.name === name) : -1;
                    if (idx >= 0) {
                        this.tcm.targetObjects[idx] = { ...(this.tcm.targetObjects[idx] || {}), object: resolved, position: resolved.position };
                    }
                } catch (e) {
                    // Ignore readonly property errors - this is just an optimization
                    if (e.message && !e.message.includes('readonly')) {
                        debug('P1', `Error updating targetObjects: ${e}`);
                    }
                }
                return resolved.position;
            }
        } catch (_) {}

        return null;
    }

    /**
     * Format distance for display with appropriate units
     * @param {number} distanceInKm - Distance in kilometers
     * @returns {string} Formatted distance string
     */
    formatDistance(distanceInKm) {
        const addCommas = (num) => {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        };

        if (distanceInKm < 1) {
            return `${Math.round(distanceInKm * 1000)}m`;
        } else if (distanceInKm < 1000) {
            return `${distanceInKm.toFixed(1)}km`;
        } else {
            return `${addCommas(Math.round(distanceInKm))}km`;
        }
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // No resources to dispose
    }
}
