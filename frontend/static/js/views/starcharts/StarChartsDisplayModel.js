/**
 * StarChartsDisplayModel
 *
 * Extracted from StarChartsUI to reduce file size.
 * Handles display model building, object data retrieval, and position calculations.
 *
 * Features:
 * - Build normalized ring model for star system display
 * - Position calculations for planets, moons, stations, beacons
 * - Live angle calculations from SolarSystemManager
 * - Object discovery and test mode handling
 */

import { debug } from '../../debug.js';

export class StarChartsDisplayModel {
    /**
     * Create a StarChartsDisplayModel
     * @param {Object} starChartsUI - Reference to parent StarChartsUI
     */
    constructor(starChartsUI) {
        this.ui = starChartsUI;
    }

    /**
     * Build normalized ring model to match LRS visual layout
     */
    buildDisplayModel() {
        this.ui.displayModel = {
            planetOrder: [],
            ringRadii: [],
            positions: new Map(), // id -> {x,y}
            moonOffsets: new Map() // id -> radius
        };
        const ssm = this.getSolarSystemManagerRef();
        const sectorId = this.ui.starChartsManager.getCurrentSector();
        const sectorData = this.ui.starChartsManager.objectDatabase?.sectors[sectorId];
        if (!sectorData) return;

        // 0) Set star position at origin (0,0) - center of coordinate system
        if (sectorData.star) {
            this.ui.displayModel.positions.set(sectorData.star.id, { x: 0, y: 0 });
        }

        // 1) Determine planet order by starSystem.planets order (matches LRS rings)
        const lrsPlanets = (ssm && ssm.starSystem && Array.isArray(ssm.starSystem.planets))
            ? ssm.starSystem.planets
            : [];

        // 2) Create ring radii like LRS (100, 250, 400, ...)
        const base = 100;
        const step = 150;
        lrsPlanets.forEach((p, i) => {
            const ring = base + i * step;
            this.ui.displayModel.ringRadii.push(ring);
            // Find DB object to get ID for consistent selection/labels
            const planetDb = (sectorData.objects || []).find(o => o.type === 'planet' && o.name === p.planet_name) || null;
            const planetId = planetDb?.id || `planet_${i}`;
            this.ui.displayModel.planetOrder.push(planetId);
            const angleDeg = (() => {
                if (ssm && ssm.celestialBodies) {
                    const body = ssm.celestialBodies.get(`planet_${i}`);
                    if (body && body.position) {
                        const pos = body.position;
                        return (Math.atan2(pos.z, pos.x) * 180) / Math.PI;
                    }
                }
                return this.getLiveAngleDegForPlanet(planetDb || p);
            })();
            const angleRad = angleDeg * Math.PI / 180;
            const x = ring * Math.cos(angleRad);
            const y = ring * Math.sin(angleRad);
            this.ui.displayModel.positions.set(planetId, { x, y });
        });

        // 3) Moons: place around their parent planet using small local rings
        if (ssm && ssm.celestialBodies) {
            // For each planet index, place its moons by keys moon_i_j
            lrsPlanets.forEach((_, i) => {
                const parentId = this.ui.displayModel.planetOrder[i] || `planet_${i}`;
                const parentPos = this.ui.displayModel.positions.get(parentId) || { x: 0, y: 0 };

                // Find the actual planet object to get all possible IDs
                const planetDb = (sectorData.objects || []).find(o => o.type === 'planet' && o.name === lrsPlanets[i]?.planet_name);
                const possibleParentIds = [parentId];
                if (planetDb && planetDb.id !== parentId) {
                    possibleParentIds.push(planetDb.id);
                }

                // Collect moons for this planet from DB by parent id match (check all possible IDs)
                const dbMoons = (sectorData.objects || []).filter(o =>
                    o.type === 'moon' &&
                    o.orbit?.parent &&
                    possibleParentIds.includes(o.orbit.parent)
                );
                if (dbMoons.length > 0) {
                    dbMoons.sort((a, b) => (a.orbit?.radius || 0) - (b.orbit?.radius || 0));
                    dbMoons.forEach((m, idx) => {
                        const localR = 30 + idx * 15;
                        const angleDeg = this.getLiveAngleDegForMoon(m, parentId);
                        const angleRad = angleDeg * Math.PI / 180;
                        const x = parentPos.x + localR * Math.cos(angleRad);
                        const y = parentPos.y + localR * Math.sin(angleRad);
                        this.ui.displayModel.positions.set(m.id, { x, y });
                        this.ui.displayModel.moonOffsets.set(m.id, localR);
                    });
                } else {
                    // Fallback to SSM moon keys moon_i_j up to some count
                    for (let j = 0; j < 6; j++) {
                        const moonKey = `moon_${i}_${j}`;
                        const moonBody = ssm.celestialBodies.get(moonKey);
                        if (!moonBody) break;
                        const localR = 30 + j * 15;
                        const rel = moonBody.position.clone();
                        const parentBody = ssm.celestialBodies.get(`planet_${i}`);
                        if (parentBody) rel.sub(parentBody.position);
                        const angleDeg = (Math.atan2(rel.z, rel.x) * 180) / Math.PI;
                        const angleRad = angleDeg * Math.PI / 180;
                        const x = parentPos.x + localR * Math.cos(angleRad);
                        const y = parentPos.y + localR * Math.sin(angleRad);
                        const syntheticId = `${moonKey}`;
                        this.ui.displayModel.positions.set(syntheticId, { x, y });
                        this.ui.displayModel.moonOffsets.set(syntheticId, localR);
                    }
                }
            });
        }

        // 4) Infrastructure: snap to nearest planet ring by polar coords [AU, deg]
        const infra = sectorData.infrastructure || {};
        const stations = infra.stations || [];
        const beacons = infra.beacons || [];
        const AU_TO_DISPLAY = 149.6;

        const snapToNearestRing = (radiusDisplay, isStation = false) => {
            if (this.ui.displayModel.ringRadii.length === 0) return radiusDisplay;
            const nearestRing = this.ui.displayModel.ringRadii.reduce((best, r) => (
                Math.abs(r - radiusDisplay) < Math.abs(best - radiusDisplay) ? r : best
            ), this.ui.displayModel.ringRadii[0]);

            // Add offset for stations to prevent overlap with planets
            if (isStation) {
                return nearestRing + 25; // Offset stations 25 units outward from planet ring
            }
            return nearestRing;
        };

        const placePolar = (obj) => {
            // Prefer live angle if available by matching body name to SSM
            const liveAngle = this.getLiveAngleDegByName(obj.name);

            if (typeof liveAngle === 'number') {
                // Snap to nearest ring or force beacon ring
                const isBeacon = (obj.type === 'navigation_beacon');
                const isStation = (obj.type === 'space_station');
                const rDisplayGuess = Array.isArray(obj.position) && obj.position.length === 2 ? (obj.position[0] * AU_TO_DISPLAY) : 300;
                const ring = isBeacon && this.ui.displayModel.beaconRing ? this.ui.displayModel.beaconRing : snapToNearestRing(rDisplayGuess, isStation);
                const rad = liveAngle * Math.PI / 180;
                const x = ring * Math.cos(rad);
                const y = ring * Math.sin(rad);
                this.ui.displayModel.positions.set(obj.id, { x, y });
                return;
            }

            // Handle static/polar data
            const isBeacon = (obj.type === 'navigation_beacon');
            if (Array.isArray(obj.position) && obj.position.length === 2) {
                const rDisplay = isBeacon && this.ui.displayModel.beaconRing ? this.ui.displayModel.beaconRing : (obj.position[0] * AU_TO_DISPLAY);
                const angleDeg = obj.position[1];
                const ring = isBeacon && this.ui.displayModel.beaconRing ? this.ui.displayModel.beaconRing : snapToNearestRing(rDisplay);
                const angleRad = angleDeg * Math.PI / 180;
                const x = ring * Math.cos(angleRad);
                const y = ring * Math.sin(angleRad);
                this.ui.displayModel.positions.set(obj.id, { x, y });
                return;
            }

            // Fallback for infrastructure with 3D coordinates [x, y, z] (e.g., beacons JSON)
            if (Array.isArray(obj.position) && obj.position.length === 3) {
                const x3 = obj.position[0];
                const y3 = obj.position[1]; // Use Y coordinate for beacons (they're positioned vertically)
                const z3 = obj.position[2];

                // For beacons, calculate angle using y,x (not z,x) since they're arranged in a circle
                const angleDeg = isBeacon
                    ? (Math.atan2(y3, x3) * 180) / Math.PI
                    : (Math.atan2(z3, x3) * 180) / Math.PI;

                const ring = isBeacon && this.ui.displayModel.beaconRing ? this.ui.displayModel.beaconRing : snapToNearestRing(300);
                const angleRad = angleDeg * Math.PI / 180;
                const x = ring * Math.cos(angleRad);
                const y = ring * Math.sin(angleRad);
                this.ui.displayModel.positions.set(obj.id, { x, y });
                return;
            }
            // If no position information, skip
        };

        // 5) Set beacon ring radius BEFORE positioning beacons (stationary ring like LRS)
        this.ui.displayModel.beaconRing = 350;

        // Position stations with collision detection
        this.positionStationsWithCollisionDetection(stations, placePolar);

        // Position beacons (they have their own dedicated ring, so less collision risk)
        beacons.forEach(beacon => {
            placePolar(beacon);
        });
    }

    /**
     * Position stations with collision detection to prevent overlaps
     * @param {Array} stations - Array of station objects
     * @param {Function} placePolar - Fallback positioning function
     */
    positionStationsWithCollisionDetection(stations, placePolar) {
        const minSeparationAngle = 15; // Minimum degrees between stations on same ring
        const positionedStations = new Map(); // ring -> array of angles

        // Sort stations by priority (prefer live angles, then by name for consistency)
        const sortedStations = [...stations].sort((a, b) => {
            const aHasLive = typeof this.getLiveAngleDegByName(a.name) === 'number';
            const bHasLive = typeof this.getLiveAngleDegByName(b.name) === 'number';

            // Prioritize stations with live angles
            if (aHasLive && !bHasLive) return -1;
            if (!aHasLive && bHasLive) return 1;

            // Then sort by name for consistency
            return (a.name || a.id || '').localeCompare(b.name || b.id || '');
        });

        sortedStations.forEach(station => {
            // Calculate preferred position
            let preferredAngle = null;
            let ring = null;

            // Try to get live angle first
            const liveAngle = this.getLiveAngleDegByName(station.name);
            if (typeof liveAngle === 'number') {
                preferredAngle = liveAngle;
                const AU_TO_DISPLAY = 149.6;
                const rDisplayGuess = Array.isArray(station.position) && station.position.length === 2 ?
                    (station.position[0] * AU_TO_DISPLAY) : 300;
                ring = this.snapToNearestRing(rDisplayGuess, true); // true = isStation
            } else if (Array.isArray(station.position) && station.position.length === 2) {
                preferredAngle = station.position[1]; // angle in degrees
                const AU_TO_DISPLAY = 149.6;
                ring = this.snapToNearestRing(station.position[0] * AU_TO_DISPLAY, true);
            }

            if (preferredAngle === null || ring === null) {
                // Fallback: use original placePolar logic
                placePolar(station);
                return;
            }

            // Normalize angle to 0-360 range
            preferredAngle = ((preferredAngle % 360) + 360) % 360;

            // Check for collisions on this ring
            if (!positionedStations.has(ring)) {
                positionedStations.set(ring, []);
            }

            const existingAngles = positionedStations.get(ring);
            let finalAngle = preferredAngle;

            // Find a collision-free angle
            let attempts = 0;
            const maxAttempts = 24; // 360/15 = 24 possible positions with 15° separation

            while (attempts < maxAttempts) {
                let hasCollision = false;

                for (const existingAngle of existingAngles) {
                    const angleDiff = Math.min(
                        Math.abs(finalAngle - existingAngle),
                        360 - Math.abs(finalAngle - existingAngle)
                    );

                    if (angleDiff < minSeparationAngle) {
                        hasCollision = true;
                        break;
                    }
                }

                if (!hasCollision) {
                    // Found a good position
                    break;
                }

                // Try next position (alternate between + and - offsets)
                attempts++;
                const offset = Math.ceil(attempts / 2) * minSeparationAngle;
                finalAngle = attempts % 2 === 1 ?
                    (preferredAngle + offset) % 360 :
                    ((preferredAngle - offset) + 360) % 360;
            }

            // Record this position
            existingAngles.push(finalAngle);

            // Set the final position
            const angleRad = finalAngle * Math.PI / 180;
            const x = ring * Math.cos(angleRad);
            const y = ring * Math.sin(angleRad);
            this.ui.displayModel.positions.set(station.id, { x, y });
        });
    }

    /**
     * Snap to nearest ring (helper method)
     * @param {number} radiusDisplay - Radius in display units
     * @param {boolean} isStation - Whether this is a station (adds offset)
     * @returns {number} Snapped radius
     */
    snapToNearestRing(radiusDisplay, isStation = false) {
        if (this.ui.displayModel.ringRadii.length === 0) return radiusDisplay;
        const nearestRing = this.ui.displayModel.ringRadii.reduce((best, r) => (
            Math.abs(r - radiusDisplay) < Math.abs(best - radiusDisplay) ? r : best
        ), this.ui.displayModel.ringRadii[0]);

        // Add offset for stations to prevent overlap with planets
        if (isStation) {
            return nearestRing + 25; // Offset stations 25 units outward from planet ring
        }
        return nearestRing;
    }

    /**
     * Get SolarSystemManager reference
     * @returns {Object|null} SolarSystemManager or null
     */
    getSolarSystemManagerRef() {
        try {
            if (this.ui.viewManager && typeof this.ui.viewManager.getSolarSystemManager === 'function') {
                return this.ui.viewManager.getSolarSystemManager();
            }
        } catch (e) {}
        return null;
    }

    /**
     * Find body by display name using SolarSystemManager
     * @param {string} name - Body name to find
     * @returns {Object|null} Body info or null
     */
    findBodyByName(name) {
        const ssm = this.getSolarSystemManagerRef();
        if (!ssm || typeof ssm.getCelestialBodies !== 'function' || typeof ssm.getCelestialBodyInfo !== 'function') return null;
        const bodies = ssm.getCelestialBodies();
        for (const [key, body] of bodies.entries()) {
            const info = ssm.getCelestialBodyInfo(body);
            if (info && info.name === name) return { key, body };
        }
        return null;
    }

    /**
     * Get live angle for planet based on absolute position in scene
     * @param {Object} object - Planet object
     * @returns {number} Angle in degrees
     */
    getLiveAngleDegForPlanet(object) {
        const ssm = this.getSolarSystemManagerRef();
        if (ssm) {
            const found = this.findBodyByName(object.name);
            if (found && found.body && found.body.position) {
                const pos = found.body.position;
                return (Math.atan2(pos.z, pos.x) * 180) / Math.PI;
            }
        }
        // fallback to data
        if (object.orbit && typeof object.orbit.angle === 'number') return object.orbit.angle;
        if (Array.isArray(object.position) && object.position.length >= 3) {
            return (Math.atan2(object.position[2], object.position[0]) * 180) / Math.PI;
        }
        return 0;
    }

    /**
     * Get live angle for moon relative to its parent planet
     * @param {Object} object - Moon object
     * @param {string} parentId - Parent planet ID
     * @returns {number} Angle in degrees
     */
    getLiveAngleDegForMoon(object, parentId) {
        const ssm = this.getSolarSystemManagerRef();
        if (ssm) {
            const child = this.findBodyByName(object.name);
            const parentObj = this.ui.starChartsManager.getObjectData(parentId);
            const parent = parentObj ? this.findBodyByName(parentObj.name) : null;
            if (child && parent && child.body && parent.body) {
                const rel = child.body.position.clone().sub(parent.body.position);
                return (Math.atan2(rel.z, rel.x) * 180) / Math.PI;
            }
        }
        // fallback to data
        if (object.orbit && typeof object.orbit.angle === 'number') return object.orbit.angle;
        if (Array.isArray(object.position) && object.position.length >= 3) {
            return (Math.atan2(object.position[2], object.position[0]) * 180) / Math.PI;
        }
        return 0;
    }

    /**
     * Live angle by matching name (stations/beacons when present in scene)
     * @param {string} name - Object name
     * @returns {number|null} Angle in degrees or null
     */
    getLiveAngleDegByName(name) {
        const ssm = this.getSolarSystemManagerRef();
        if (!ssm) return null;
        const found = this.findBodyByName(name);
        if (found && found.body && found.body.position) {
            const pos = found.body.position;
            // For navigation beacons, use y coordinate (vertical) instead of z (depth)
            const isBeacon = name.includes('Navigation Beacon');
            const angleCoord = isBeacon ? pos.y : pos.z;
            return (Math.atan2(angleCoord, pos.x) * 180) / Math.PI;
        }
        // Fallback for navigation beacons (exist in StarfieldManager)
        try {
            const beacons = this.ui.viewManager?.starfieldManager?.navigationBeacons || [];
            const b = beacons.find(bc => (bc.userData?.name || 'Navigation Beacon') === name);
            if (b) {
                return (Math.atan2(b.position.y, b.position.x) * 180) / Math.PI;
            }
        } catch (e) {
            debug('P1', 'Error in beacon angle lookup:', e);
        }
        return null;
    }

    /**
     * Explicit beacon angle getter (by name) used when building infra positions
     * @param {string} name - Beacon name
     * @returns {number|null} Angle in degrees or null
     */
    getBeaconAngleDegByName(name) {
        try {
            const beacons = this.ui.viewManager?.starfieldManager?.navigationBeacons || [];
            const b = beacons.find(bc => (bc.userData?.name || 'Navigation Beacon') === name);
            if (b && b.position) {
                return (Math.atan2(b.position.y, b.position.x) * 180) / Math.PI;
            }
        } catch (e) {}
        return null;
    }

    /**
     * Get all objects for current sector for rendering
     * Discovered objects show normally, undiscovered show as "?"
     * In test mode, all objects show normally
     * @returns {Array} Array of object data
     */
    getDiscoveredObjectsForRender() {
        // CLEAN FIX: Get fresh sector data from solarSystemManager like Long Range Scanner does
        const solarSystemManager = this.ui.viewManager.getSolarSystemManager();
        if (!solarSystemManager) return [];

        const currentSector = solarSystemManager.currentSector;
        const rawStarSystem = solarSystemManager.starSystem;
        if (!rawStarSystem) return [];

        // Update StarChartsManager current sector to match reality
        if (this.ui.starChartsManager.currentSector !== currentSector) {
            debug('STAR_CHARTS', `StarChartsUI: Updating sector from ${this.ui.starChartsManager.currentSector} to ${currentSector}`);
            this.ui.starChartsManager.currentSector = currentSector;
        }

        // CRITICAL FIX: Use dynamic solar system data instead of static database
        const celestialBodies = solarSystemManager.getCelestialBodies();
        if (!celestialBodies || celestialBodies.size === 0) return [];

        // Check if test mode is enabled (show all objects normally)
        const isTestMode = this.isTestModeEnabled();
        const discoveredIds = isTestMode ? null : this.ui.starChartsManager.getDiscoveredObjects();
        const norm = (id) => (typeof id === 'string' ? id.replace(/^a0_/i, 'A0_') : id);
        const isDiscovered = (id) => {
            if (isTestMode) return true;
            if (!Array.isArray(discoveredIds)) return false;
            const nid = norm(id);
            return discoveredIds.some(did => norm(did) === nid);
        };

        const allObjects = [];

        // CRITICAL FIX: Process dynamic solar system objects instead of static database
        for (const [key, body] of celestialBodies.entries()) {
            const bodyId = `${currentSector}_${key}`;
            const info = solarSystemManager.getCelestialBodyInfo(body);

            if (!info) continue;

            const discovered = isDiscovered(bodyId);

            // Create object data compatible with StarCharts UI format
            const objectData = {
                id: bodyId,
                name: info.name,
                type: info.type,
                position: body.position ? [body.position.x, body.position.y, body.position.z] : [0, 0, 0],
                cartesianPosition: body.position,
                visualRadius: info.radius || 1,
                class: this.ui.starChartsManager.getObjectClass(info.type),
                description: this.ui.starChartsManager.getObjectDescription(info.name, info.type),
                faction: info.faction || 'neutral',
                diplomacy: info.diplomacy || 'neutral'
            };

            if (discovered || isTestMode) {
                allObjects.push(objectData);
            } else {
                // Add undiscovered object with special flag
                allObjects.push({
                    ...objectData,
                    _isUndiscovered: true
                });
            }
        }

        return allObjects;
    }

    /**
     * Check if test mode is enabled
     * @returns {boolean} True if test mode enabled
     */
    isTestModeEnabled() {
        try {
            if (typeof window !== 'undefined' && window.STAR_CHARTS_DISCOVER_ALL === true) {
                return true;
            }
        } catch (e) {}
        try {
            const flag = localStorage.getItem('star_charts_test_discover_all');
            return String(flag).toLowerCase() === 'true' || flag === '1';
        } catch (e) {}
        return false;
    }

    /**
     * Helper to match target IDs with normalization
     * @param {string} targetId - Target ID
     * @param {string} objectId - Object ID
     * @returns {boolean} True if IDs match
     */
    matchesTargetId(targetId, objectId) {
        if (!targetId || !objectId) return false;
        if (targetId === objectId) return true;

        // Try normalized versions
        const norm = (id) => (typeof id === 'string' ? id.replace(/^a0_/i, 'A0_') : id);
        return norm(targetId) === norm(objectId);
    }

    /**
     * Enhanced target matching that handles both ID and name matching
     * @param {Object} object - Object to check
     * @returns {boolean} True if object matches current target
     */
    matchesCurrentTarget(object) {
        const currentTarget = this.ui.starChartsManager.targetComputerManager?.currentTarget;
        if (!currentTarget || !object) return false;

        // Try ID matching first
        if (this.matchesTargetId(currentTarget.id, object.id)) {
            return true;
        }

        // Try name matching as fallback
        if (currentTarget.name && object.name && currentTarget.name === object.name) {
            return true;
        }

        // Try to get target data from target computer and match by name
        const targetData = this.ui.starChartsManager.targetComputerManager.getCurrentTargetData?.();
        if (targetData && targetData.name && object.name && targetData.name === object.name) {
            return true;
        }

        return false;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.ui = null;
    }
}
