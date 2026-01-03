/**
 * TargetWireframeCreator
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Handles creation of target wireframe geometry in the HUD display.
 *
 * Features:
 * - Creates wireframe geometry for current target
 * - Handles discovery-based color determination
 * - Creates appropriate geometry based on target type
 * - Supports waypoint, ship, station, planet wireframes
 * - Handles undiscovered object wireframes
 */

import { debug } from '../debug.js';

export class TargetWireframeCreator {
    /**
     * Create a TargetWireframeCreator
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;
    }

    /**
     * Create wireframe for current target
     */
    createTargetWireframe() {
        debug('TARGETING', `🖼️ createTargetWireframe() called for target: ${this.tcm.currentTarget?.name || 'none'}`);

        if (!this.tcm.currentTarget) {
            debug('TARGETING', '🖼️ No current target - aborting wireframe creation');
            return;
        }

        // SPECIAL CASE: If this is a waypoint, delegate to waypoint wireframe creation
        if (this.tcm.currentTarget && this.tcm.currentTarget.isWaypoint) {
            debug('WAYPOINTS', `🎯 Delegating to createWaypointWireframe for: ${this.tcm.currentTarget.name}`);
            this.tcm.createWaypointWireframe();
            return;
        }

        const childrenBefore = this.tcm.wireframeScene.children.length;
        debug('TARGETING', `🖼️ Wireframe scene children before: ${childrenBefore}`);

        // Clear any existing wireframe first to prevent duplicates
        this.tcm.clearTargetWireframe();

        const childrenAfter = this.tcm.wireframeScene.children.length;
        // Only log if there's a significant change
        if (childrenBefore !== childrenAfter) {
            debug('UI', `🖼️ WIREFRAME: Scene children: ${childrenBefore} -> ${childrenAfter}`);
        }

        try {
            // Ensure currentTarget is hydrated with a real object/position before building geometry
            this.hydrateCurrentTarget();

            // Normalize references
            const currentTargetData = this.tcm.getCurrentTargetData();
            const targetObject = this.tcm.currentTarget?.object || this.tcm.currentTarget;

            // Derive radius from actual target geometry when possible
            let radius = this.deriveRadius(targetObject);

            // Determine wireframe color and enemy status
            const { wireframeColor, isEnemyShip, info } = this.determineWireframeStyle(currentTargetData, targetObject, radius);

            const wireframeMaterial = new this.tcm.THREE.LineBasicMaterial({
                color: wireframeColor,
                linewidth: 1,
                transparent: true,
                opacity: 0.8
            });

            // Check if object is discovered to determine wireframe type
            const isDiscovered = currentTargetData?.isShip || this.tcm.isObjectDiscovered(currentTargetData);

            if (!isDiscovered) {
                // Undiscovered objects use a standard "unknown" wireframe shape
                debug('INSPECTION', `🔍 Creating unknown wireframe for undiscovered object`);
                const unknownGeometry = this.tcm.createUnknownWireframeGeometry(radius);
                this.tcm.targetWireframe = new this.tcm.THREE.LineSegments(unknownGeometry, wireframeMaterial);
            } else {
                // Use centralized wireframe type mapping for discovered objects
                this.createDiscoveredWireframe(currentTargetData, targetObject, info, radius, wireframeMaterial);
            }

            // Clear any existing sub-target indicators (they are disabled)
            this.tcm.createSubTargetIndicators(0, 0);

            // Ensure wireframe was created successfully before using it
            if (!this.tcm.targetWireframe) {
                debug('TARGETING', `🎯 WIREFRAME: ERROR - No wireframe created for ${currentTargetData?.name || 'unknown'}`);
                return;
            }

            this.tcm.targetWireframe.position.set(0, 0, 0);
            this.tcm.wireframeScene.add(this.tcm.targetWireframe);

            this.tcm.wireframeCamera.position.z = Math.max(radius * 3, 3);
            this.tcm.targetWireframe.rotation.set(0.5, 0, 0.3);

            debug('TARGETING', `🖼️ Wireframe creation SUCCESS: target=${this.tcm.currentTarget?.name}, wireframeExists=${!!this.tcm.targetWireframe}, sceneChildren=${this.tcm.wireframeScene.children.length}`);

        } catch (error) {
            debug('TARGETING', `🖼️ Wireframe creation ERROR: ${error.message}`);
            debug('P1', `Error creating target wireframe: ${error}`);
        }
    }

    /**
     * Hydrate current target with real object/position if missing
     */
    hydrateCurrentTarget() {
        if (!this.tcm.currentTarget.position) {
            try {
                const vm = this.tcm.viewManager || window.viewManager;
                const ssm = this.tcm.solarSystemManager || vm?.solarSystemManager || window.solarSystemManager;
                const sfm = vm?.starfieldManager || window.starfieldManager;
                const currentData = this.tcm.targetObjects?.[this.tcm.targetIndex];
                const normalizedId = typeof (currentData?.id || '') === 'string' ? (currentData?.id || '').replace(/^a0_/i, 'A0_') : (currentData?.id || '');
                let resolved = null;

                if (currentData?.type === 'navigation_beacon' && sfm?.navigationBeacons) {
                    resolved = sfm.navigationBeacons.find(b => b?.userData?.id === normalizedId) ||
                               sfm.navigationBeacons.find(b => (b?.userData?.name || b?.name) === currentData.name);
                }
                if (!resolved && ssm?.celestialBodies) {
                    resolved = ssm.celestialBodies.get(normalizedId) ||
                               ssm.celestialBodies.get(`beacon_${normalizedId}`) ||
                               ssm.celestialBodies.get(`station_${currentData?.name?.toLowerCase()?.replace(/\s+/g, '_')}`);
                }
                if (resolved) {
                    this.tcm.currentTarget = resolved;
                    this.tcm.targetObjects[this.tcm.targetIndex] = { ...currentData, object: resolved, position: resolved.position };
                }
            } catch (_) {}
        }
    }

    /**
     * Derive radius from target geometry
     * @param {Object} targetObject - The target object
     * @returns {number} The derived radius
     */
    deriveRadius(targetObject) {
        let radius = 1;
        if (targetObject?.geometry) {
            if (!targetObject.geometry.boundingSphere) {
                targetObject.geometry.computeBoundingSphere();
            }
            radius = targetObject.geometry.boundingSphere?.radius || radius;
        }
        return radius;
    }

    /**
     * Determine wireframe color and style based on target data
     * @param {Object} currentTargetData - Current target data
     * @param {Object} targetObject - The target object
     * @param {number} radius - The target radius
     * @returns {Object} Color, enemy status, and info
     */
    determineWireframeStyle(currentTargetData, targetObject, radius) {
        let info = null;
        let wireframeColor = 0x44ffff; // default teal for unknown
        let isEnemyShip = false;

        // Determine target info, prioritizing Star Charts data over spatial manager data
        const ship = this.tcm.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');
        const enhancedTargetInfo = targetComputer?.getCurrentTargetInfo();

        // Start with currentTargetData from Star Charts (has correct normalized types)
        info = currentTargetData || {};

        if (enhancedTargetInfo) {
            // Merge enhanced info but preserve the correct type from Star Charts
            info = {
                ...enhancedTargetInfo,
                type: currentTargetData?.type || enhancedTargetInfo.type,
                name: currentTargetData?.name || enhancedTargetInfo.name
            };
        } else if (currentTargetData?.isShip) {
            info = { type: 'enemy_ship' };
            radius = Math.max(radius, 2);
        } else if (!info.type) {
            // Fallback to SolarSystemManager only if we don't have type info
            const solarInfo = this.tcm.solarSystemManager?.getCelestialBodyInfo(targetObject);
            if (solarInfo) {
                info = { ...info, ...solarInfo };
            }
        }

        // Get diplomacy for color determination
        const diplomacy = this.tcm.getTargetDiplomacy(currentTargetData);

        // Clear cached discovery status to ensure fresh data
        if (this.tcm.currentTarget) {
            this.tcm.currentTarget._lastDiscoveryStatus = undefined;
        }

        // Check discovery status for wireframe color
        const isDiscovered = currentTargetData?.isShip || this.tcm.isObjectDiscovered(currentTargetData);

        debug('TARGETING', `🎨 WIREFRAME COLOR: ${currentTargetData?.name} - isDiscovered: ${isDiscovered}, diplomacy: ${diplomacy}, faction: ${info?.faction}`);

        if (!isDiscovered) {
            wireframeColor = 0x44ffff; // Cyan for unknown/undiscovered
            debug('TARGETING', `🎨 Using CYAN wireframe for undiscovered: ${currentTargetData?.name}`);
        } else {
            wireframeColor = this.getDiscoveredWireframeColor(currentTargetData, diplomacy);
            if (diplomacy === 'enemy' || diplomacy === 'hostile') {
                isEnemyShip = currentTargetData?.isShip;
            }
            debug('TARGETING', `🎨 Using faction-based wireframe for discovered: ${currentTargetData?.name} → ${diplomacy || 'default'}`);
        }

        // Override color for waypoints
        if (this.tcm.currentTarget && this.tcm.currentTarget.isWaypoint) {
            wireframeColor = 0xff00ff; // Magenta for waypoints
            debug('WAYPOINTS', '🎨 Using magenta color for waypoint wireframe');
        }

        return { wireframeColor, isEnemyShip, info };
    }

    /**
     * Get wireframe color for discovered objects based on diplomacy
     * @param {Object} currentTargetData - Current target data
     * @param {string} diplomacy - Diplomacy status
     * @returns {number} Hex color value
     */
    getDiscoveredWireframeColor(currentTargetData, diplomacy) {
        if (currentTargetData?.type === 'waypoint' || currentTargetData?.isVirtual) {
            return 0xff00ff; // Magenta for waypoints
        }

        switch (diplomacy) {
            case 'enemy':
            case 'hostile':
                return 0xff3333; // Red for hostile
            case 'friendly':
            case 'ally':
                return 0x44ff44; // Green for friendly
            case 'neutral':
                return 0xffff44; // Yellow for neutral
            case 'unknown':
                return 0x44ffff; // Cyan for unknown faction
            default:
                return 0xffff44; // Yellow (neutral) as default
        }
    }

    /**
     * Create wireframe for discovered objects
     * @param {Object} currentTargetData - Current target data
     * @param {Object} targetObject - The target object
     * @param {Object} info - Target info
     * @param {number} radius - The target radius
     * @param {Object} wireframeMaterial - The material to use
     */
    createDiscoveredWireframe(currentTargetData, targetObject, info, radius, wireframeMaterial) {
        const resolvedType = (currentTargetData?.type || '').toLowerCase();
        const wireframeConfig = this.tcm.getWireframeConfig(resolvedType);

        if (wireframeConfig.geometry === 'star') {
            const starGeometry = this.tcm.createStarGeometry(radius);
            this.tcm.targetWireframe = new this.tcm.THREE.LineSegments(starGeometry, wireframeMaterial);
        } else {
            let baseGeometry = null;

            // Handle special cases that need additional logic
            if (wireframeConfig.geometry === 'box') {
                // Box geometry is only for enemy ships - verify this is actually an enemy ship
                if (info?.type === 'enemy_ship' || currentTargetData?.isShip) {
                    baseGeometry = new this.tcm.THREE.BoxGeometry(radius, radius, radius);
                }
            } else if (wireframeConfig.geometry === 'torus') {
                // Space stations - use centralized configuration
                const ringR = Math.max(radius * 0.8, 1.0);
                const ringTube = Math.max(radius * 0.25, 0.3);
                baseGeometry = new this.tcm.THREE.TorusGeometry(ringR, ringTube, 8, 16);
            } else {
                // Standard geometries from centralized mapping
                baseGeometry = this.tcm.createGeometryFromConfig(wireframeConfig.geometry, radius);
            }

            // Create wireframe from base geometry if we have one
            if (baseGeometry) {
                const edgesGeometry = new this.tcm.THREE.EdgesGeometry(baseGeometry);
                this.tcm.targetWireframe = new this.tcm.THREE.LineSegments(edgesGeometry, wireframeMaterial);
                baseGeometry.dispose();
            } else if (targetObject?.geometry && targetObject.geometry.isBufferGeometry) {
                // Fallback to actual target geometry if no base geometry was created
                const edgesGeometry = new this.tcm.THREE.EdgesGeometry(targetObject.geometry);
                this.tcm.targetWireframe = new this.tcm.THREE.LineSegments(edgesGeometry, wireframeMaterial);
            } else {
                // Final fallback - create default icosahedron geometry
                const defaultGeometry = new this.tcm.THREE.IcosahedronGeometry(radius, 0);
                const edgesGeometry = new this.tcm.THREE.EdgesGeometry(defaultGeometry);
                this.tcm.targetWireframe = new this.tcm.THREE.LineSegments(edgesGeometry, wireframeMaterial);
                defaultGeometry.dispose();
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
