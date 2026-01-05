/**
 * ProximityBlipManager - Manages radar blip creation and updates
 * Extracted from ProximityDetector3D.js for better code organization.
 *
 * Handles:
 * - Object tracking and filtering
 * - Blip creation and positioning
 * - Altitude line rendering
 * - Faction-based coloring
 * - Target blinking animation
 */

import { debug } from '../../debug.js';
import * as THREE from 'three';

export class ProximityBlipManager {
    constructor(detector) {
        this.detector = detector;
        this.THREE = THREE;

        // Blip tracking
        this.objectBlips = new Map();
        this.altitudeLines = new Map();

        // Session stats
        this.lastObjectCount = 0;
        this.lastTotalObjects = 0;

        // Universal faction colors (Three.js hex format)
        this.FACTION_COLORS = {
            enemy: 0xff3333,      // Red for hostile
            neutral: 0xffff44,    // Yellow for neutral
            friendly: 0x44ff44,   // Green for friendly
            unknown: 0x44ffff,    // Cyan for unknown
            waypoint: 0xff00ff    // Magenta for waypoints (not used on radar)
        };
    }

    /**
     * Update blip blinking animation for targeted objects
     * @param {number} deltaTime Time since last update
     */
    updateBlipBlinking(deltaTime) {
        if (!this.objectBlips) return;

        // Calculate blink phase (oscillate between 0.3 and 1.0 opacity)
        const blinkFrequency = 3; // Hz
        const blinkPhase = (Math.sin(Date.now() * 0.001 * blinkFrequency * Math.PI * 2) + 1) / 2; // 0 to 1
        const minOpacity = 0.3;
        const maxOpacity = 1.0;
        const currentOpacity = minOpacity + (blinkPhase * (maxOpacity - minOpacity));

        this.objectBlips.forEach((blip) => {
            if (blip && blip.userData && blip.userData.isCurrentTarget) {
                // Apply blinking to current target
                if (blip.material) {
                    blip.material.opacity = currentOpacity;
                }
            } else {
                // Reset non-target blips to full opacity
                if (blip.material) {
                    blip.material.opacity = blip.userData?.baseOpacity || 0.9;
                }
            }
        });
    }

    /**
     * Update all blip positions based on current game state
     */
    updateBlipPositions() {
        // Clear previous frame's blips
        this.clearPreviousObjects();

        // Get player position for relative calculations
        const playerShip = this.detector.starfieldManager.viewManager?.getShip();
        const playerMesh = playerShip?.mesh;
        const playerPosition = playerMesh?.position ||
            this.detector.starfieldManager.camera?.position ||
            new THREE.Vector3(0, 0, 0);

        // Get all objects to track
        const objects = this.getAllTrackableObjects();
        const currentZoom = this.detector.getCurrentZoom();
        const detectionRangeKm = currentZoom.range / 1000; // Convert meters to kilometers

        let objectsInRange = 0;

        for (const obj of objects) {
            if (!obj.mesh || !obj.mesh.position) {
                continue;
            }

            const distance = playerPosition.distanceTo(obj.mesh.position);

            if (distance <= detectionRangeKm && distance > 1) { // Exclude self
                // Skip celestial bodies (stars, planets, moons)
                if (obj.type === 'star' || obj.type === 'planet' || obj.type === 'moon') {
                    continue;
                }

                this.createObjectBlip(obj, playerPosition);
                objectsInRange++;
            }
        }

        // Log when object count changes
        if (objectsInRange !== this.lastObjectCount) {
            this.detector.logControlled('log', `Tracking ${objectsInRange} objects within ${detectionRangeKm.toFixed(0)}km range`, null, true);
            this.lastObjectCount = objectsInRange;
        }
        this.detector.sessionStats.objectsTracked = objectsInRange;
    }

    /**
     * Get all trackable objects in the system
     * @returns {Array} Array of trackable objects
     */
    getAllTrackableObjects() {
        const objects = [];
        const sfm = this.detector.starfieldManager;

        this.detector.logControlled('log', 'getAllTrackableObjects() called');

        // Get celestial bodies from SolarSystemManager
        if (sfm.solarSystemManager) {
            this.detector.logControlled('log', 'Getting celestial bodies from SolarSystemManager');
            const bodies = sfm.solarSystemManager.getCelestialBodies();

            if (bodies) {
                this.detector.logControlled('log', `Found ${bodies.size} celestial bodies in the system`);
                for (const [key, body] of bodies.entries()) {
                    if (body && body.position) {
                        const info = sfm.solarSystemManager.getCelestialBodyInfo(body);
                        objects.push({
                            mesh: body,
                            name: info?.name || key,
                            type: info?.type || 'celestial',
                            id: key,
                            isCelestial: true
                        });
                    }
                }
            } else {
                this.detector.logControlled('warn', 'getCelestialBodies() returned null/undefined');
            }
        } else {
            this.detector.logControlled('warn', 'No SolarSystemManager available');
        }

        // Get target dummy ships
        if (sfm.dummyShipMeshes) {
            sfm.dummyShipMeshes.forEach((mesh, index) => {
                if (mesh && mesh.position && mesh.userData?.ship) {
                    objects.push({
                        mesh: mesh,
                        name: mesh.userData.ship.shipName || `Target ${index + 1}`,
                        type: 'enemy_ship',
                        id: `target_dummy_${index}`,
                        ship: mesh.userData.ship,
                        isTargetDummy: true
                    });
                } else {
                    debug('UI', `🚫 DUMMY SHIP INVALID: Index ${index} - mesh:${!!mesh}, position:${!!mesh?.position}, userData.ship:${!!mesh?.userData?.ship}`);
                }
            });
        } else {
            debug('UI', `🚫 NO DUMMY SHIPS: dummyShipMeshes is ${sfm.dummyShipMeshes}`);
        }

        // Get real enemy ships
        if (sfm.enemyShips) {
            sfm.enemyShips.forEach((ship, index) => {
                if (ship && ship.mesh && ship.mesh.position) {
                    objects.push({
                        mesh: ship.mesh,
                        name: ship.shipName || `Enemy ${index + 1}`,
                        type: 'enemy_ship',
                        id: `enemy_${index}`,
                        ship: ship,
                        isEnemyShip: true
                    });
                }
            });
        }

        // Get space stations
        if (sfm.spaceStations) {
            sfm.spaceStations.forEach((station, index) => {
                if (station && station.mesh && station.mesh.position) {
                    objects.push({
                        mesh: station.mesh,
                        name: station.name || `Station ${index + 1}`,
                        type: 'space_station',
                        id: `station_${index}`,
                        isSpaceStation: true
                    });
                }
            });
        }

        // Filter out waypoints
        const filteredObjects = objects.filter(obj => {
            if (obj.type === 'waypoint' || obj.type === 'navigation_waypoint') {
                return false;
            }
            if (obj.name && (obj.name.toLowerCase().includes('waypoint') || obj.name.toLowerCase().includes('nav point'))) {
                return false;
            }
            if (obj.mesh?.userData?.isWaypoint || obj.mesh?.userData?.type === 'waypoint') {
                return false;
            }
            return true;
        });

        // Log when object counts change
        if (filteredObjects.length !== this.lastTotalObjects) {
            this.detector.logControlled('log', `Found ${filteredObjects.length} total objects (${objects.length - filteredObjects.length} waypoints filtered out)`, null, true);
            this.lastTotalObjects = filteredObjects.length;
        }

        return filteredObjects;
    }

    /**
     * Clear previous frame's object blips
     */
    clearPreviousObjects() {
        // Remove all blips and altitude lines from scene
        this.objectBlips.forEach((blip) => {
            this.detector.scene.remove(blip);
        });
        this.altitudeLines.forEach((line) => {
            this.detector.scene.remove(line);
        });

        this.objectBlips.clear();
        this.altitudeLines.clear();
    }

    /**
     * Create a blip for an object on the 3D grid
     * @param {Object} obj Object to create blip for
     * @param {THREE.Vector3} playerPosition Player's current position
     */
    createObjectBlip(obj, playerPosition) {
        if (!obj.mesh) return;

        const currentZoom = this.detector.getCurrentZoom();
        let gridX, gridZ, relativePos, distance, worldToGridScaleFactor;

        // Common calculations
        relativePos = obj.mesh.position.clone().sub(playerPosition);
        distance = relativePos.length();

        // Get ship heading for coordinate transformation
        let shipHeading = 0;
        if (this.detector.starfieldManager?.shipHeading !== undefined) {
            shipHeading = this.detector.starfieldManager.shipHeading;
        } else if (this.detector.starfieldManager?.camera) {
            if (this.detector.starfieldManager.shipHeading === undefined) {
                this.detector.starfieldManager.shipHeading = this.detector.starfieldManager.camera.rotation.y;
            }
            shipHeading = this.detector.starfieldManager.shipHeading;
        }

        // Debug logging for targets
        const isDebugObject = obj.isTargetDummy || obj.type === 'enemy_ship';
        if (isDebugObject && Math.random() < 0.1) {
            debug('RADAR', `🎯 BEFORE ROTATION: ${obj.name || obj.type}`);
            debug('RADAR', `   World pos: (${obj.mesh.position.x.toFixed(1)}, ${obj.mesh.position.z.toFixed(1)})`);
            debug('RADAR', `   Player pos: (${playerPosition.x.toFixed(1)}, ${playerPosition.z.toFixed(1)})`);
            debug('RADAR', `   Relative: (${relativePos.x.toFixed(1)}, ${relativePos.z.toFixed(1)})`);
            debug('RADAR', `   Ship heading: ${(shipHeading * 180 / Math.PI).toFixed(1)}°`);
        }

        // Transform coordinates
        const worldX = relativePos.x;
        const worldZ = -relativePos.z;

        const cosRot = Math.cos(shipHeading);
        const sinRot = Math.sin(shipHeading);

        const rotatedX = worldX * cosRot - worldZ * sinRot;
        const rotatedZ = worldX * sinRot + worldZ * cosRot;

        relativePos.x = rotatedX;
        relativePos.z = rotatedZ;

        if (isDebugObject && Math.random() < 0.1) {
            debug('RADAR', `🎯 AFTER ROTATION: ${obj.name || obj.type}`);
            debug('RADAR', `   Rotated: (${relativePos.x.toFixed(1)}, ${relativePos.z.toFixed(1)})`);
        }

        const detectionRangeM = currentZoom.range;
        const worldHalfRangeM = detectionRangeM / 2;

        if (this.detector.viewMode === 'topDown') {
            const viewSize = Math.min(currentZoom.range / 1000, 50);
            const worldRangeKm = currentZoom.range / 1000;
            worldToGridScaleFactor = viewSize / worldRangeKm;

            gridX = relativePos.x * worldToGridScaleFactor;
            gridZ = relativePos.z * worldToGridScaleFactor;
        } else {
            const gridHalfSizeInScene = 0.55;
            const worldHalfRangeKm = worldHalfRangeM / 1000;
            worldToGridScaleFactor = gridHalfSizeInScene / worldHalfRangeKm;

            gridX = relativePos.x * worldToGridScaleFactor;
            gridZ = relativePos.z * worldToGridScaleFactor;
        }

        // Apply minimum visual separation
        const minVisualSeparation = 0.1;
        const gridDistance = Math.sqrt(gridX * gridX + gridZ * gridZ);

        if (gridDistance > 0 && gridDistance < minVisualSeparation) {
            const scaleFactor = minVisualSeparation / gridDistance;
            gridX *= scaleFactor;
            gridZ *= scaleFactor;
        }

        // Calculate altitude
        let altitude;
        if (this.detector.viewMode === 'topDown') {
            altitude = obj.mesh.position.y - playerPosition.y;
        } else {
            altitude = relativePos.y;
        }

        const bucketedAltitudeY = this.detector.normalizeAltitudeToBucket(altitude);
        const blipColor = this.getBlipColor(obj);

        // Create altitude line and blip
        this.createAltitudeLine(gridX, gridZ, bucketedAltitudeY, blipColor, obj);
        this.createBlip(obj, gridX, gridZ, bucketedAltitudeY, distance);
    }

    /**
     * Create vertical altitude indicator line
     */
    createAltitudeLine(gridX, gridZ, bucketedAltitudeY, blipColor, obj) {
        if (this.detector.viewMode === 'topDown') {
            return;
        }

        const lineLength = Math.abs(bucketedAltitudeY) * 2;
        const lineHeight = lineLength > 0 ? lineLength : 0.2;

        let centerY;
        if (bucketedAltitudeY >= 0) {
            centerY = lineHeight / 2;
        } else {
            centerY = -lineHeight / 2;
        }

        const baseSizeMultiplier = 0.1;
        const playerSize = baseSizeMultiplier * 2;
        const targetSize = baseSizeMultiplier * 1.2;
        const blipSize = (obj.type === 'enemy_ship' || obj.isTargetDummy) ? targetSize : playerSize;
        const lineThickness = blipSize * 0.8;

        const lineGeometry = new THREE.CylinderGeometry(lineThickness, lineThickness, lineHeight, 6);
        const lineMaterial = new THREE.MeshBasicMaterial({
            color: blipColor,
            opacity: 1.0,
            transparent: false
        });

        const altitudeLine = new THREE.Mesh(lineGeometry, lineMaterial);
        altitudeLine.position.set(gridX, centerY, gridZ);

        this.detector.scene.add(altitudeLine);
        this.altitudeLines.set(`${obj.id || `${gridX}_${gridZ}_${Date.now()}`}`, altitudeLine);
    }

    /**
     * Create object blip on the grid
     */
    createBlip(obj, gridX, gridZ, scaledAltitudeY, distance) {
        const clampedAltitude = Math.max(-1, Math.min(1, scaledAltitudeY));
        const blipColor = this.getBlipColor(obj);

        // Calculate blip size based on view mode
        let baseSizeMultiplier;
        if (this.detector.viewMode === 'topDown') {
            const currentZoom = this.detector.getCurrentZoom();
            const coordinateScale = Math.min(currentZoom.range / 1000, 50);
            baseSizeMultiplier = Math.max(coordinateScale * 0.02, 0.5);
        } else {
            baseSizeMultiplier = 0.1;
        }

        const playerSize = baseSizeMultiplier * 2;
        const targetSize = baseSizeMultiplier * 1.2;
        const blipSize = (obj.type === 'enemy_ship' || obj.isTargetDummy) ? targetSize : playerSize;

        // Create geometry based on view mode and object type
        let blipGeometry;
        if (this.detector.viewMode === 'topDown') {
            blipGeometry = new THREE.SphereGeometry(blipSize, 8, 8);
        } else {
            if (obj.type === 'enemy_ship' || obj.isTargetDummy) {
                blipGeometry = new THREE.ConeGeometry(blipSize, blipSize * 1.5, 3);
            } else if (obj.type === 'planet') {
                blipGeometry = new THREE.SphereGeometry(blipSize * 1.2, 8, 8);
            } else if (obj.type === 'moon') {
                blipGeometry = new THREE.SphereGeometry(blipSize * 0.8, 6, 6);
            } else if (obj.type === 'star') {
                const starSize = (obj.type === 'star') ? targetSize : blipSize;
                blipGeometry = new THREE.OctahedronGeometry(starSize);
            } else {
                blipGeometry = new THREE.BoxGeometry(blipSize, blipSize, blipSize);
            }
        }

        let blipOpacity, blipTransparent;
        if (this.detector.viewMode === 'topDown') {
            blipOpacity = 1.0;
            blipTransparent = false;
        } else {
            blipOpacity = 0.9;
            blipTransparent = true;
        }

        const blipMaterial = new THREE.MeshBasicMaterial({
            color: blipColor,
            transparent: blipTransparent,
            opacity: blipOpacity
        });

        const blip = new THREE.Mesh(blipGeometry, blipMaterial);

        // Check if this is the current target
        const isCurrentTarget = this.isCurrentTarget(obj);
        if (isCurrentTarget) {
            blip.userData.isCurrentTarget = true;
            blip.userData.baseOpacity = blipOpacity;
            blip.userData.baseColor = blipColor;
            blipMaterial.transparent = true;
        }

        // Position blip
        if (this.detector.viewMode === 'topDown') {
            blip.position.set(gridX, 0.05, gridZ);
        } else {
            blip.position.set(gridX, clampedAltitude, gridZ);
        }

        // Handle orientation
        if (obj.type === 'enemy_ship' || obj.isTargetDummy) {
            if (this.detector.viewMode === 'topDown') {
                blip.rotation.x = 0;
                blip.rotation.z = 0;
                blip.rotation.y = 0;
            } else {
                blip.rotation.y = 0;
                const gridPlaneWorldY = 0;
                const objectAltitude = obj.mesh.position.y;

                if (objectAltitude >= gridPlaneWorldY) {
                    blip.rotation.x = -Math.PI / 2;
                } else {
                    blip.rotation.x = Math.PI / 2;
                }
            }
        }

        this.detector.scene.add(blip);
        this.objectBlips.set(obj.id || `${gridX}_${gridZ}_${Date.now()}`, blip);
    }

    /**
     * Check if an object is the current target
     * @param {Object} obj Object to check
     * @returns {boolean} True if object is the current target
     */
    isCurrentTarget(obj) {
        const targetComputerManager = this.detector.starfieldManager.targetComputerManager;
        if (!targetComputerManager || !targetComputerManager.currentTarget) {
            return false;
        }

        const currentTarget = targetComputerManager.currentTarget;

        if (obj === currentTarget || obj.mesh === currentTarget) {
            return true;
        }

        if (obj.mesh && obj.mesh === currentTarget) {
            return true;
        }

        if (currentTarget.userData) {
            if (currentTarget.userData.ship === obj || currentTarget.userData.ship === obj.mesh) {
                return true;
            }
            if (obj.userData && currentTarget.userData === obj.userData) {
                return true;
            }
        }

        if (obj.id && currentTarget.id && obj.id === currentTarget.id) {
            return true;
        }

        return false;
    }

    /**
     * Get blip color based on object type and faction
     * @param {Object} obj Object to get color for
     * @returns {number} Three.js hex color
     */
    getBlipColor(obj) {
        let diplomacy = null;

        // Check ship diplomacy/faction
        if (obj.ship?.diplomacy) {
            diplomacy = obj.ship.diplomacy.toLowerCase();
        } else if (obj.ship?.faction) {
            diplomacy = obj.ship.faction.toLowerCase();
        }

        // Check mesh userData
        if (!diplomacy && obj.mesh?.userData?.diplomacy) {
            diplomacy = obj.mesh.userData.diplomacy.toLowerCase();
        } else if (!diplomacy && obj.mesh?.userData?.faction) {
            diplomacy = obj.mesh.userData.faction.toLowerCase();
        }

        // Check object properties directly
        if (!diplomacy && obj.diplomacy) {
            diplomacy = obj.diplomacy.toLowerCase();
        } else if (!diplomacy && obj.faction) {
            diplomacy = obj.faction.toLowerCase();
        }

        // For celestial bodies, try solar system manager
        if (!diplomacy && obj.isCelestial && this.detector.starfieldManager?.solarSystemManager) {
            const celestialInfo = this.detector.starfieldManager.solarSystemManager.getCelestialBodyInfo(obj.mesh);
            if (celestialInfo) {
                if (celestialInfo.diplomacy) {
                    diplomacy = celestialInfo.diplomacy.toLowerCase();
                } else if (celestialInfo.faction) {
                    diplomacy = celestialInfo.faction.toLowerCase();
                }
            }
        }

        // Apply faction coloring
        if (diplomacy) {
            if (obj.type === 'station' || obj.type === 'space_station' || obj.isSpaceStation) {
                debug('RADAR', `🎯 Station "${obj.name || 'Unknown'}" faction: "${diplomacy}" -> color will be applied`);
            }

            switch (diplomacy) {
                case 'enemy':
                case 'hostile':
                    return this.FACTION_COLORS.enemy;
                case 'friendly':
                case 'allied':
                case 'ally':
                    return this.FACTION_COLORS.friendly;
                case 'neutral':
                    return this.FACTION_COLORS.neutral;
                case 'unknown':
                    return this.FACTION_COLORS.unknown;
            }
        }

        // Handle specific object types
        if (obj.isCelestial) {
            switch (obj.type) {
                case 'star':
                    return this.FACTION_COLORS.neutral;
                case 'planet':
                    return this.FACTION_COLORS.friendly;
                case 'moon':
                    return this.FACTION_COLORS.unknown;
                case 'station':
                case 'space_station':
                    return this.FACTION_COLORS.unknown;
                default:
                    return this.FACTION_COLORS.unknown;
            }
        }

        if (obj.isSpaceStation || obj.type === 'station' || obj.type === 'space_station') {
            debug('RADAR', `⚠️ Station "${obj.name || 'Unknown'}" has no faction data - defaulting to unknown (cyan)`);
            return this.FACTION_COLORS.unknown;
        }

        if (obj.isTargetDummy) {
            return this.FACTION_COLORS.neutral;
        }

        if (obj.isEnemyShip || obj.type === 'enemy_ship') {
            return this.FACTION_COLORS.enemy;
        }

        return this.FACTION_COLORS.unknown;
    }

    /**
     * Dispose all blip resources
     */
    dispose() {
        this.objectBlips.forEach((blip) => {
            if (this.detector.scene) this.detector.scene.remove(blip);
            if (blip.geometry) blip.geometry.dispose();
            if (blip.material) blip.material.dispose();
        });
        this.objectBlips.clear();

        this.altitudeLines.forEach((line) => {
            if (this.detector.scene) this.detector.scene.remove(line);
            if (line.geometry) line.geometry.dispose();
            if (line.material) line.material.dispose();
        });
        this.altitudeLines.clear();
    }
}
