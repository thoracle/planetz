/**
 * CelestialBodyFactory - Handles creation of celestial bodies (planets, moons, stations, beacons)
 * Extracted from SolarSystemManager.js to reduce file size and improve modularity.
 *
 * @module CelestialBodyFactory
 */

import * as THREE from 'three';
import { debug } from '../debug.js';
import { GameObjectFactory } from '../core/GameObjectFactory.js';

/**
 * Color mappings for star types (spectral classification)
 */
const STAR_COLORS = {
    'Class-O': 0x9BB0FF,  // Blue
    'Class-B': 0xADB6FF,  // Blue-white
    'Class-A': 0xCAD7FF,  // White
    'Class-F': 0xF8F7FF,  // Yellow-white
    'Class-G': 0xFFF4EA,  // Yellow (like our Sun)
    'Class-K': 0xFFD2A1,  // Orange
    'Class-M': 0xFFCC6F   // Red
};

/**
 * Color mappings for planet types
 */
const PLANET_COLORS = {
    'Class-M': 0x4CAF50,  // Earth-like, green/blue
    'Class-K': 0xFF9800,  // Orange/brown rocky
    'Class-L': 0x795548,  // Brown dwarf
    'Class-T': 0x607D8B,  // Cool methane dwarf
    'Class-Y': 0x9E9E9E,  // Ultra-cool brown dwarf
    'Class-D': 0xBDBDBD,  // Small, rocky
    'Class-H': 0xFFEB3B,  // Hot super-Earth
    'Class-J': 0xFFC107,  // Gas giant
    'Class-N': 0x00BCD4,  // Ice giant
    'rocky': 0x8B4513     // Basic rocky
};

/**
 * Color mappings for moon types
 */
const MOON_COLORS = {
    'rocky': 0x888888,
    'ice': 0xddddff,
    'desert': 0xd2b48c
};

/**
 * Factory class for creating celestial bodies (planets, moons, stations, beacons)
 */
export class CelestialBodyFactory {
    /**
     * Create a new CelestialBodyFactory
     * @param {THREE.Scene} scene - The Three.js scene
     * @param {SolarSystemManager} solarSystemManager - Reference to parent manager
     */
    constructor(scene, solarSystemManager) {
        this.scene = scene;
        this.ssm = solarSystemManager;
    }

    /**
     * Get color for a star type
     * @param {string} starType - Star spectral type (e.g., 'Class-G')
     * @returns {number} Hex color value
     */
    getStarColor(starType) {
        return STAR_COLORS[starType] || 0xFFFFFF;
    }

    /**
     * Get color for a planet type
     * @param {string} planetType - Planet type classification
     * @returns {number} Hex color value
     */
    getPlanetColor(planetType) {
        return PLANET_COLORS[planetType] || 0xCCCCCC;
    }

    /**
     * Get color for a moon type
     * @param {string} moonType - Moon type
     * @returns {number} Hex color value
     */
    getMoonColor(moonType) {
        return MOON_COLORS[moonType] || 0x888888;
    }

    /**
     * Create a planet mesh and register it with spatial tracking
     * @param {Object} planetData - Planet data from universe generation
     * @param {number} index - Planet index in the system
     * @param {number} maxPlanets - Total number of planets in the system
     * @returns {Promise<THREE.Mesh|null>} The created planet mesh or null on error
     */
    async createPlanet(planetData, index, maxPlanets) {
        // PHASE 0 ASSERTION: Validate required planet data
        if (!planetData || typeof planetData !== 'object') {
            debug('P1', `ASSERTION FAILED: createPlanet called with invalid planetData at index ${index}. Fix data source.`);
            return null;
        }

        // PHASE 0 ASSERTION: Log planets missing essential identifiers
        if (!planetData.planet_name) {
            debug('P1', `ASSERTION WARNING: Planet at index ${index} missing planet_name. Using fallback name.`);
        }

        try {
            // Create planet mesh
            const planetSize = Math.max(0.1, planetData.planet_size || 1);
            const planetGeometry = new THREE.SphereGeometry(planetSize, 32, 32);
            const planetMaterial = new THREE.MeshPhongMaterial({
                color: this.getPlanetColor(planetData.planet_type),
                shininess: 0.5,
                flatShading: true
            });
            const planet = new THREE.Mesh(planetGeometry, planetMaterial);

            // Calculate position
            const positionData = this._calculatePlanetPosition(planetData, index);
            const { x, y, z, orbitRadius, angle } = positionData;

            // Validate position before setting
            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                debug('P1', `Invalid position calculated for planet ${index}: x=${x}, y=${y}, z=${z}, orbitRadius=${orbitRadius}`);
                planet.position.set(0, 0, 0);
            } else {
                planet.position.set(x, y, z);
            }

            this.scene.add(planet);
            this.ssm.celestialBodies.set(`planet_${index}`, planet);

            // Create GameObject via factory for single source of truth
            const planetName = planetData.planet_name || `Planet ${index}`;
            let gameObject = null;
            try {
                gameObject = GameObjectFactory.createPlanet({
                    name: planetName,
                    position: { x, y, z },
                    classification: planetData.planet_type || 'Unknown',
                    faction: planetData.faction || 'Neutral',
                    discovered: false,
                    threeObject: planet,
                    government: planetData.government,
                    economy: planetData.economy,
                    technology: planetData.technology,
                    population: planetData.population,
                    description: planetData.description
                });

                planet.userData.gameObject = gameObject;
                planet.userData.gameObjectId = gameObject.id;
                debug('UTILITY', `Created GameObject for planet: ${gameObject.id}`);
            } catch (factoryError) {
                debug('P1', `Failed to create GameObject for planet ${planetName}: ${factoryError.message}`);
            }

            // Set legacy properties on mesh for backward compatibility
            planet.name = planetName;
            planet.diplomacy = planetData.diplomacy || 'neutral';
            planet.faction = planetData.faction || planetData.diplomacy || 'Neutral';

            // Add physics body for the planet
            if (window.spatialManager && window.spatialManagerReady) {
                const useRealistic = window.useRealisticCollision !== false;
                const collisionRadius = useRealistic ? planetSize : Math.min(planetSize, 0.5);

                window.spatialManager.addObject(planet, {
                    type: 'planet',
                    name: planetName,
                    radius: collisionRadius,
                    entityType: 'planet',
                    entityId: gameObject?.id || planetName,
                    health: 20000,
                    diplomacy: planetData.diplomacy || 'neutral',
                    faction: planetData.faction || planetData.diplomacy || 'Neutral',
                    government: planetData.government,
                    economy: planetData.economy,
                    technology: planetData.technology,
                    gameObjectId: gameObject?.id
                });

                debug('PHYSICS', `Planet collision: Visual=${planetSize}m, Physics=${collisionRadius}m (realistic=${useRealistic})`);
                debug('UTILITY', `Planet added to spatial tracking: ${planetName}, radius=${collisionRadius}m`);
            } else {
                debug('P1', 'SpatialManager not ready - skipping spatial tracking for planets');
            }

            // Add orbital elements
            this.ssm.setOrbitalElements(`planet_${index}`, {
                semiMajorAxis: orbitRadius,
                eccentricity: 0.1,
                inclination: Math.random() * 0.1,
                longitudeOfAscendingNode: Math.random() * Math.PI * 2,
                argumentOfPeriapsis: Math.random() * Math.PI * 2,
                meanAnomaly: angle,
                mass: planetSize * 1e24
            });

            // Create moons (limit to 5 moons per planet)
            if (planetData.moons && Array.isArray(planetData.moons)) {
                const maxMoons = Math.min(5, planetData.moons.length);
                for (let moonIndex = 0; moonIndex < maxMoons; moonIndex++) {
                    const moonData = planetData.moons[moonIndex];
                    if (!moonData) {
                        debug('P1', `Invalid moon data for planet ${index}, moon ${moonIndex}`);
                        continue;
                    }
                    await this.createMoon(moonData, index, moonIndex);
                }
            }

            return planet;
        } catch (error) {
            debug('P1', `Error creating planet ${index}: ${error}`);
            return null;
        }
    }

    /**
     * Calculate planet position from data or fallback algorithm
     * @private
     */
    _calculatePlanetPosition(planetData, index) {
        let x, y, z, orbitRadius, angle;

        if (planetData.position && Array.isArray(planetData.position) && planetData.position.length >= 3) {
            // Use positioning data from backend
            [x, y, z] = planetData.position;
            orbitRadius = Math.sqrt(x * x + y * y + z * z);
            angle = Math.atan2(z, x);
            debug('STAR_CHARTS', `Using backend position for planet ${index}:`, { x, y, z, orbitRadius, angle, name: planetData.planet_name });
        } else {
            // Fallback to legacy positioning
            const isStarterSystem = this.ssm.starSystem?.star_name === 'Sol';

            let minRadius, maxRadius;
            if (isStarterSystem) {
                minRadius = 15;
                maxRadius = 35;
            } else {
                minRadius = 30;
                maxRadius = 150;
            }

            const totalPlanets = Math.max(1, this.ssm.starSystem.planets.length);
            orbitRadius = minRadius + (index * (maxRadius - minRadius) / Math.max(1, totalPlanets - 1));
            angle = (Math.random() * Math.PI * 2) || 0;

            x = orbitRadius * Math.cos(angle);
            y = 0;
            z = orbitRadius * Math.sin(angle);

            debug('STAR_CHARTS', `Using fallback position for planet ${index}:`, { x, y, z, orbitRadius, angle, name: planetData.planet_name });
        }

        return { x, y, z, orbitRadius, angle };
    }

    /**
     * Create a moon mesh and register it with spatial tracking
     * @param {Object} moonData - Moon data from universe generation
     * @param {number} planetIndex - Index of parent planet
     * @param {number} moonIndex - Index of this moon
     * @returns {Promise<THREE.Mesh|null>} The created moon mesh or null on error
     */
    async createMoon(moonData, planetIndex, moonIndex) {
        // PHASE 0 ASSERTION: Validate required moon data
        if (!moonData || typeof moonData !== 'object') {
            debug('P1', `ASSERTION FAILED: createMoon called with invalid moonData for planet ${planetIndex}, moon ${moonIndex}. Fix data source.`);
            return null;
        }

        if (!moonData.moon_name) {
            debug('P1', `ASSERTION WARNING: Moon at planet ${planetIndex}, index ${moonIndex} missing moon_name. Using fallback name.`);
        }

        try {
            const moonSize = Math.max(0.1, moonData.moon_size || 0.3);
            const moonGeometry = new THREE.SphereGeometry(moonSize, 32, 32);
            const moonMaterial = new THREE.MeshPhongMaterial({
                color: this.getPlanetColor(moonData.moon_type),
                shininess: 0.3,
                flatShading: true
            });
            const moon = new THREE.Mesh(moonGeometry, moonMaterial);

            // Get parent planet
            const planet = this.ssm.celestialBodies.get(`planet_${planetIndex}`);
            if (!planet) {
                debug('P1', `Parent planet not found for moon ${moonIndex}`);
                return null;
            }

            // Calculate moon position
            const positionData = this._calculateMoonPosition(moonData, planet, planetIndex, moonIndex);
            if (!positionData) return null;

            const { moonOrbitRadius, angle } = positionData;

            // Validate final position
            if (isNaN(moon.position.x) || isNaN(moon.position.y) || isNaN(moon.position.z)) {
                debug('P1', `Invalid position calculated for moon ${moonIndex} of planet ${planetIndex}`);
                return null;
            }

            // Set position from calculated data
            moon.position.copy(positionData.position);

            this.scene.add(moon);
            this.ssm.celestialBodies.set(`moon_${planetIndex}_${moonIndex}`, moon);

            // Create GameObject via factory
            const moonName = moonData.moon_name || `Moon ${moonIndex} of Planet ${planetIndex}`;
            const parentPlanetObj = planet.userData?.gameObject;
            const parentPlanetName = parentPlanetObj?.name || planet.name || `Planet ${planetIndex}`;
            let gameObject = null;

            try {
                gameObject = GameObjectFactory.createMoon({
                    name: moonName,
                    position: { x: moon.position.x, y: moon.position.y, z: moon.position.z },
                    classification: moonData.moon_type || 'Unknown',
                    faction: moonData.faction || 'Neutral',
                    discovered: false,
                    threeObject: moon,
                    parentPlanet: parentPlanetName,
                    government: moonData.government,
                    economy: moonData.economy
                });

                moon.userData.gameObject = gameObject;
                moon.userData.gameObjectId = gameObject.id;
                debug('UTILITY', `Created GameObject for moon: ${gameObject.id}`);
            } catch (factoryError) {
                debug('P1', `Failed to create GameObject for moon ${moonName}: ${factoryError.message}`);
            }

            // Set legacy properties
            moon.name = moonName;
            moon.diplomacy = moonData.diplomacy || 'neutral';
            moon.faction = moonData.faction || moonData.diplomacy || 'Neutral';

            // Add physics body
            if (window.spatialManager && window.spatialManagerReady) {
                const useRealistic = window.useRealisticCollision !== false;
                const collisionRadius = useRealistic ? moonSize : Math.min(moonSize, 0.1);

                window.spatialManager.addObject(moon, {
                    type: 'moon',
                    name: moonName,
                    radius: collisionRadius,
                    canCollide: true,
                    isTargetable: true,
                    layer: 'planets',
                    diplomacy: moonData.diplomacy || 'neutral',
                    faction: moonData.faction || moonData.diplomacy || 'Neutral',
                    government: moonData.government,
                    economy: moonData.economy,
                    technology: moonData.technology,
                    gameObjectId: gameObject?.id
                });

                debug('UTILITY', `Moon added to spatial tracking: ${moonName}, radius=${collisionRadius}m`);
            } else {
                debug('P1', 'SpatialManager not ready - skipping spatial tracking for moons');
            }

            // Add orbital elements
            this.ssm.setOrbitalElements(`moon_${planetIndex}_${moonIndex}`, {
                semiMajorAxis: moonOrbitRadius,
                eccentricity: 0.05,
                inclination: Math.random() * 0.05,
                longitudeOfAscendingNode: Math.random() * Math.PI * 2,
                argumentOfPeriapsis: Math.random() * Math.PI * 2,
                meanAnomaly: angle,
                mass: moonSize * 1e22
            });

            return moon;
        } catch (error) {
            debug('P1', `Error creating moon ${moonIndex} for planet ${planetIndex}: ${error.message}`);
            return null;
        }
    }

    /**
     * Calculate moon position from data or fallback algorithm
     * @private
     */
    _calculateMoonPosition(moonData, planet, planetIndex, moonIndex) {
        let moonOrbitRadius, angle;
        const position = new THREE.Vector3();

        if (moonData.position && Array.isArray(moonData.position) && moonData.position.length >= 3) {
            // Use absolute positioning from backend
            const [x, y, z] = moonData.position;
            position.set(x, y, z);

            const relativeX = x - planet.position.x;
            const relativeZ = z - planet.position.z;
            moonOrbitRadius = Math.sqrt(relativeX * relativeX + relativeZ * relativeZ);
            angle = Math.atan2(relativeZ, relativeX);

            debug('STAR_CHARTS', `Using backend position for moon ${moonIndex}:`, {
                x, y, z, moonOrbitRadius, angle, name: moonData.moon_name
            });
        } else {
            // Fallback to legacy relative positioning
            const isStarterSystem = this.ssm.starSystem?.star_name === 'Sol';

            const baseMoonOrbitRadius = isStarterSystem ? 8.0 : 12.0;
            moonOrbitRadius = Math.max(6, (moonIndex + 1) * baseMoonOrbitRadius);
            angle = (Math.random() * Math.PI * 2) || 0;
            const verticalVariation = Math.sin(angle * 0.5) * moonOrbitRadius * 0.2;

            const x = moonOrbitRadius * Math.cos(angle);
            const y = verticalVariation;
            const z = moonOrbitRadius * Math.sin(angle);

            const moonPosition = new THREE.Vector3(x, y, z);
            if (moonPosition.x === 0 && moonPosition.y === 0 && moonPosition.z === 0) {
                debug('P1', `Zero position calculated for moon ${moonIndex} of planet ${planetIndex}`);
                return null;
            }

            position.copy(planet.position).add(moonPosition);
            debug('STAR_CHARTS', `Using fallback position for moon ${moonIndex}:`, {
                x: position.x, y: position.y, z: position.z, moonOrbitRadius, angle, name: moonData.moon_name
            });
        }

        return { position, moonOrbitRadius, angle };
    }

    /**
     * Create a space station mesh
     * @param {Object} stationData - Station configuration data
     * @returns {THREE.Mesh|null} The created station mesh or null on error
     */
    createSpaceStation(stationData) {
        // Validate required station data
        if (!stationData || typeof stationData !== 'object') {
            debug('P1', 'ASSERTION FAILED: createSpaceStation called with invalid stationData.');
            return null;
        }

        if (!stationData.name) {
            debug('P1', 'ASSERTION WARNING: Station missing name. Using fallback name.');
        }
        if (!stationData.faction) {
            debug('P1', `ASSERTION WARNING: Station "${stationData.name || 'Unknown'}" missing faction.`);
        }
        if (!stationData.position) {
            debug('P1', `ASSERTION FAILED: Station "${stationData.name || 'Unknown'}" missing position.`);
            return null;
        }

        // Handle position conversion
        let position;
        if (Array.isArray(stationData.position)) {
            if (stationData.position.length === 3) {
                const INFRASTRUCTURE_SCALE = 1.0;
                position = new THREE.Vector3(
                    stationData.position[0] * INFRASTRUCTURE_SCALE,
                    stationData.position[1] * INFRASTRUCTURE_SCALE,
                    stationData.position[2] * INFRASTRUCTURE_SCALE
                );
            } else if (stationData.position.length === 2) {
                position = this.ssm.getOrbitPosition(stationData.position[0], stationData.position[1]);
            } else {
                debug('P1', `Invalid position format for station ${stationData.name}`);
                position = new THREE.Vector3(0, 0, 0);
            }
        } else {
            position = stationData.position;
        }

        // Handle color conversion
        let color;
        if (typeof stationData.color === 'string') {
            color = parseInt(stationData.color.replace('#', ''), 16);
        } else {
            color = stationData.color;
        }

        // Create station geometry based on type
        let stationGeometry;
        switch (stationData.type) {
            case 'Shipyard':
                stationGeometry = new THREE.CylinderGeometry(stationData.size * 0.5, stationData.size * 0.8, stationData.size * 2, 8);
                break;
            case 'Defense Platform':
                stationGeometry = new THREE.CylinderGeometry(stationData.size * 0.8, stationData.size * 0.8, stationData.size * 0.5, 8);
                break;
            case 'Research Lab':
                stationGeometry = new THREE.SphereGeometry(stationData.size * 0.6, 16, 16);
                break;
            case 'Mining Station':
                stationGeometry = new THREE.BoxGeometry(stationData.size, stationData.size * 0.6, stationData.size * 1.2);
                break;
            default:
                stationGeometry = new THREE.TorusGeometry(stationData.size, stationData.size * 0.3, 8, 16);
        }

        const stationMaterial = new THREE.MeshPhongMaterial({
            color: color,
            shininess: 30,
            transparent: true,
            opacity: 0.9
        });

        const station = new THREE.Mesh(stationGeometry, stationMaterial);
        station.position.copy(position);

        // Add random rotation
        station.rotation.x = Math.random() * Math.PI * 2;
        station.rotation.y = Math.random() * Math.PI * 2;
        station.rotation.z = Math.random() * Math.PI * 2;

        // Create GameObject via factory
        const stationName = stationData.name || 'Unknown Station';
        let gameObject = null;
        try {
            gameObject = GameObjectFactory.createStation({
                name: stationName,
                position: { x: position.x, y: position.y, z: position.z },
                faction: stationData.faction,
                stationType: stationData.type || 'Space Station',
                discovered: false,
                threeObject: station,
                services: stationData.services || [],
                description: stationData.description,
                canDock: true
            });
            debug('UTILITY', `Created GameObject for station: ${gameObject.id}`);
        } catch (factoryError) {
            debug('P1', `Failed to create GameObject for station ${stationName}: ${factoryError.message}`);
        }

        // Set legacy properties
        station.name = stationName;

        // Store station metadata
        station.userData = {
            name: stationName,
            faction: stationData.faction,
            type: stationData.type,
            description: stationData.description,
            services: stationData.services || [],
            intel_brief: stationData.intel_brief || stationData.description,
            discoveryRadius: this.ssm.getDiscoveryRadius(),
            isSpaceStation: true,
            canDock: true,
            gameObject: gameObject,
            gameObjectId: gameObject?.id
        };

        // Add station to spatial manager
        if (window.spatialManager) {
            window.spatialManager.addObject(station, {
                type: 'station',
                name: stationName,
                faction: stationData.faction,
                diplomacy: this.ssm.getFactionDiplomacy(stationData.faction),
                radius: stationData.size,
                canCollide: true,
                isTargetable: true,
                layer: 'stations',
                entityType: 'station',
                entityId: gameObject?.id || `station_${stationName.toLowerCase().replace(/\s+/g, '_')}`,
                gameObjectId: gameObject?.id
            });
        }

        // Add docking collision box
        this.ssm.addDockingCollisionBox(station, stationData);

        return station;
    }

    /**
     * Create navigation beacons around Sol (from infrastructure data)
     * @returns {Promise<void>}
     */
    async createNavigationBeacons() {
        if (!this.ssm.starSystem) {
            debug('P1', 'No star system available for beacon placement');
            return;
        }

        try {
            const response = await fetch('/static/data/starter_system_infrastructure.json');
            if (!response.ok) {
                throw new Error(`Failed to load beacon data: ${response.status}`);
            }
            const infrastructureData = await response.json();
            const beaconData = infrastructureData.beacons;
            debug('UTILITY', `Loaded ${beaconData.length} beacons from JSON data`);

            // Ensure StarfieldManager has a tracking array
            if (!this.ssm.starfieldManager) this.ssm.starfieldManager = window.starfieldManager;
            if (this.ssm.starfieldManager && !Array.isArray(this.ssm.starfieldManager.navigationBeacons)) {
                this.ssm.starfieldManager.navigationBeacons = [];
            }

            // Create beacons from JSON data
            for (let i = 0; i < beaconData.length; i++) {
                const beaconInfo = beaconData[i];
                const beacon = this._createBeaconMesh(beaconInfo, i);
                if (beacon) {
                    this.scene.add(beacon);
                    this._registerBeacon(beacon, beaconInfo);
                }
            }

            debug('NAVIGATION', `Created ${beaconData.length} Navigation Beacons from JSON data`);
        } catch (error) {
            debug('P1', `Failed to create navigation beacons from JSON: ${error.message}`);
        }
    }

    /**
     * Create a beacon mesh
     * @private
     */
    _createBeaconMesh(beaconInfo, index) {
        const position = beaconInfo.position;
        const INFRASTRUCTURE_SCALE = 1.0;

        const height = 0.8;
        const baseRadius = 0.5;
        const geometry = new THREE.ConeGeometry(baseRadius, height, 4);

        let color;
        if (typeof beaconInfo.color === 'string') {
            color = parseInt(beaconInfo.color.replace('#', ''), 16);
        } else {
            color = 0xffff00;
        }

        const material = new THREE.MeshPhongMaterial({
            color: color,
            emissive: 0x222200,
            shininess: 10
        });

        const beacon = new THREE.Mesh(geometry, material);
        beacon.position.set(
            position[0] * INFRASTRUCTURE_SCALE,
            position[1] * INFRASTRUCTURE_SCALE,
            position[2] * INFRASTRUCTURE_SCALE
        );

        const scaledX = position[0] * INFRASTRUCTURE_SCALE;
        const scaledZ = position[2] * INFRASTRUCTURE_SCALE;
        beacon.rotation.y = Math.atan2(scaledZ, scaledX);

        debug('UTILITY', `Beacon ${index + 1} created at position (${scaledX.toFixed(1)}, ${(position[1] * INFRASTRUCTURE_SCALE).toFixed(1)}, ${scaledZ.toFixed(1)})`);

        return beacon;
    }

    /**
     * Register a beacon with spatial tracking and celestial bodies
     * @private
     */
    _registerBeacon(beacon, beaconInfo) {
        const scaledX = beacon.position.x;
        const scaledZ = beacon.position.z;
        const beaconName = beaconInfo.name || `Navigation Beacon`;

        // Create GameObject via factory
        let gameObject = null;
        try {
            gameObject = GameObjectFactory.createBeacon({
                name: beaconName,
                position: { x: scaledX, y: beacon.position.y, z: scaledZ },
                beaconId: beaconInfo.id,
                discovered: false,
                threeObject: beacon,
                description: beaconInfo.description
            });
            debug('UTILITY', `Created GameObject for beacon: ${gameObject.id}`);
        } catch (factoryError) {
            debug('P1', `Failed to create GameObject for beacon ${beaconName}: ${factoryError.message}`);
        }

        beacon.name = beaconName;
        beacon.userData = {
            name: beaconName,
            type: 'beacon',
            faction: 'Neutral',
            isBeacon: true,
            description: beaconInfo.description,
            id: beaconInfo.id,
            gameObject: gameObject,
            gameObjectId: gameObject?.id
        };

        // Register in celestialBodies
        try {
            const normalizedId = typeof beaconInfo.id === 'string' ? beaconInfo.id.replace(/^a0_/i, 'A0_') : beaconInfo.id;
            const nameSlug = beaconName.toLowerCase().replace(/\s+/g, '_');

            if (normalizedId) this.ssm.celestialBodies.set(normalizedId, beacon);
            if (normalizedId) this.ssm.celestialBodies.set(`beacon_${normalizedId}`, beacon);
            if (nameSlug) this.ssm.celestialBodies.set(`beacon_${nameSlug}`, beacon);
            if (gameObject?.id) this.ssm.celestialBodies.set(gameObject.id, beacon);
        } catch (e) {
            debug('P1', `Failed to register beacon in celestialBodies: ${e?.message || e}`);
        }

        // Add to spatial tracking
        if (window.spatialManager && window.spatialManagerReady) {
            window.spatialManager.addObject(beacon, {
                type: 'beacon',
                name: beaconName,
                radius: 0.6,
                canCollide: true,
                isTargetable: true,
                layer: 'stations',
                entityType: 'beacon',
                entityId: gameObject?.id || beaconInfo.id,
                health: 150,
                gameObjectId: gameObject?.id
            });

            if (window.collisionManager) {
                window.collisionManager.addObjectToLayer(beacon, 'stations');
            }

            debug('INFRASTRUCTURE', `Navigation beacon ${beaconName} added to spatial tracking`);
        }

        // Track in StarfieldManager
        if (this.ssm.starfieldManager) {
            this.ssm.starfieldManager.navigationBeacons.push(beacon);
        }
    }
}

export default CelestialBodyFactory;
