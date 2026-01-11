import * as THREE from 'three';
import { debug } from './debug.js';
import { GameObjectFactory } from './core/GameObjectFactory.js';
import { CelestialBodyFactory } from './managers/CelestialBodyFactory.js';
import { OrbitCalculator } from './managers/OrbitCalculator.js';

/**
 * SolarSystemManager - Manages celestial body creation and physics
 *
 * Refactored to delegate to:
 * - CelestialBodyFactory: Planet, moon, station, beacon creation
 * - OrbitCalculator: Orbital mechanics and spatial grid
 *
 * COLLISION MODES:
 * - Realistic (default): Collision spheres match visual mesh sizes
 * - Weapon-friendly: Small collision spheres to prevent blocking weapon fire
 *
 * Toggle with: window.useRealisticCollision = true/false
 */
export class SolarSystemManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;

        // Set up camera position near Hermes Refinery station
        this.camera.position.set(-70, 5, 80);
        this.camera.lookAt(-75, 0, 75);

        this.starSystem = null;
        this.celestialBodies = new Map();
        this.planetGenerators = new Map();
        this.orbitalSpeeds = new Map();
        this.rotationSpeeds = new Map();
        this.currentEditBody = null;
        this.currentSector = 'A0';

        // Initialize extracted modules
        this.orbitCalculator = new OrbitCalculator(20);
        this.celestialBodyFactory = new CelestialBodyFactory(scene, this);

        // Expose constants from OrbitCalculator for backward compatibility
        this.G = this.orbitCalculator.G;
        this.SOLAR_MASS = this.orbitCalculator.SOLAR_MASS;
        this.AU = this.orbitCalculator.AU;
        this.SCALE_FACTOR = this.orbitCalculator.SCALE_FACTOR;
        this.VISUAL_SCALE = this.orbitCalculator.VISUAL_SCALE;
        this.MAX_DISTANCE_KM = this.orbitCalculator.MAX_DISTANCE_KM;
        this.gridSize = this.orbitCalculator.gridSize;
    }

    // Delegate orbital element access to OrbitCalculator
    get orbitalElements() {
        return this.orbitCalculator.orbitalElements;
    }

    get spatialGrid() {
        return this.orbitCalculator.spatialGrid;
    }

    getDebugInfo() {
        let info = {
            'Star System': this.starSystem ? 'Active' : 'None',
            'Total Bodies': this.celestialBodies.size,
            'Planets': Array.from(this.celestialBodies.keys()).filter(key => key.startsWith('planet_')).length,
            'Moons': Array.from(this.celestialBodies.keys()).filter(key => key.startsWith('moon_')).length
        };

        // Add ships count section
        if (window.starfieldManager) {
            const starfieldManager = window.starfieldManager;
            let totalShips = 0;
            let enemyShips = 0;
            let friendlyShips = 0;
            let neutralShips = 0;
            let unknownShips = 0;

            if (starfieldManager.targetComputerManager && starfieldManager.targetComputerManager.targetObjects) {
                const targetObjects = starfieldManager.targetComputerManager.targetObjects;

                targetObjects.forEach(targetData => {
                    if (targetData.isShip || targetData.type === 'enemy_ship' || targetData.type === 'ship') {
                        totalShips++;

                        if (targetData.ship && targetData.ship.isTargetDummy) {
                            neutralShips++;
                        } else if (targetData.type === 'enemy_ship' || (targetData.ship && targetData.ship.diplomacy === 'enemy')) {
                            enemyShips++;
                        } else if (targetData.ship && targetData.ship.diplomacy === 'friendly') {
                            friendlyShips++;
                        } else if (targetData.ship && targetData.ship.diplomacy === 'neutral') {
                            neutralShips++;
                        } else {
                            unknownShips++;
                        }
                    }
                });
            }

            info['Total Ships'] = totalShips;
            info['Enemy'] = enemyShips;
            info['Friendly'] = friendlyShips;
            info['Neutral'] = neutralShips;
            info['Unknown'] = unknownShips;
        }

        return info;
    }

    update(deltaTime) {
        // Update spatial partitioning
        this.updateSpatialGrid();
    }

    async generateStarSystem(sector) {
        debug('UTILITY', 'Starting star system generation for sector:', sector);

        this.currentSector = sector;

        try {
            debug('UTILITY', 'Clearing existing system');
            this.clearSystem();

            // Get system from universe data or API
            if (this.universe) {
                const systemData = this.universe.find(system => system.sector === sector);
                if (systemData) {
                    debug('STAR_CHARTS', 'Found system in universe data:', {
                        starName: systemData.star_name,
                        starType: systemData.star_type,
                        planetCount: systemData.planets?.length
                    });
                    this.starSystem = systemData;
                } else {
                    debug('STAR_CHARTS', 'System not found in universe data, falling back to API');
                    const response = await fetch(`/api/generate_star_system?seed=${sector}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    this.starSystem = await response.json();
                }
            } else {
                debug('P1', 'No universe data available, using API');
                const response = await fetch(`/api/generate_star_system?seed=${sector}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                this.starSystem = await response.json();
            }

            debug('STAR_CHARTS', 'Star system data:', {
                starName: this.starSystem?.star_name,
                starType: this.starSystem?.star_type,
                starSize: this.starSystem?.star_size,
                planetCount: this.starSystem?.planets?.length
            });

            debug('UTILITY', 'Generating new system for sector:', sector);
            const success = await this.createStarSystem();

            if (!success) {
                debug('P1', 'Failed to generate new star system');
                return false;
            }

            debug('UTILITY', 'Successfully generated new star system for sector:', sector);
            try {
                const evt = new CustomEvent('starSystemReady', { detail: { sector, starName: this.starSystem?.star_name } });
                window.dispatchEvent(evt);
            } catch (e) {
                // ignore if CustomEvent unavailable
            }
            return true;
        } catch (error) {
            debug('P1', `Error generating star system: ${error}`);
            return false;
        }
    }

    async createStarSystem() {
        debug('UTILITY', '=== Starting Star System Creation ===');
        if (!this.starSystem) {
            debug('P1', 'No star system data available for creation');
            throw new Error('No star system data available');
        }

        debug('STAR_CHARTS', 'Star system data:', {
            name: this.starSystem.star_name,
            type: this.starSystem.star_type,
            size: this.starSystem.star_size,
            planetCount: this.starSystem.planets?.length
        });

        const starSystemData = this.starSystem;
        debug('UTILITY', 'Clearing existing system...');
        this.clearSystem();
        this.starSystem = starSystemData;
        debug('UTILITY', 'Restored star system data');

        try {
            // Create star
            const starSize = this.starSystem.star_size || 5;
            debug('STAR_CHARTS', 'Creating star:', {
                size: starSize,
                type: this.starSystem.star_type,
                name: this.starSystem.star_name
            });

            const starGeometry = new THREE.SphereGeometry(starSize, 32, 32);
            const starColor = this.celestialBodyFactory.getStarColor(this.starSystem.star_type);
            const starMaterial = new THREE.MeshPhongMaterial({
                color: starColor,
                emissive: starColor,
                emissiveIntensity: 2,
                shininess: 100
            });
            const star = new THREE.Mesh(starGeometry, starMaterial);
            this.scene.add(star);
            this.celestialBodies.set('star', star);
            debug('UTILITY', 'Star created and added to scene');

            // Create GameObject via factory
            const starName = this.starSystem.star_name || 'Unknown Star';
            let gameObject = null;
            try {
                gameObject = GameObjectFactory.createStar({
                    name: starName,
                    position: { x: 0, y: 0, z: 0 },
                    classification: this.starSystem.star_type || 'Unknown',
                    threeObject: star
                });
                debug('UTILITY', `Created GameObject for star: ${gameObject.id}`);
            } catch (factoryError) {
                debug('P1', `Failed to create GameObject for star ${starName}: ${factoryError.message}`);
            }

            star.name = starName;
            star.userData = {
                name: starName,
                type: 'star',
                faction: 'Neutral',
                diplomacy: 'neutral',
                gameObject: gameObject,
                gameObjectId: gameObject?.id
            };

            // Add physics body for star
            if (window.spatialManager && window.spatialManagerReady) {
                const useRealistic = window.useRealisticCollision !== false;
                const collisionRadius = useRealistic ? starSize : Math.min(starSize, 0.5);

                window.spatialManager.addObject(star, {
                    type: 'star',
                    name: starName,
                    faction: 'Neutral',
                    diplomacy: 'neutral',
                    radius: collisionRadius,
                    entityType: 'star',
                    entityId: gameObject?.id || starName,
                    health: 50000,
                    gameObjectId: gameObject?.id
                });
                debug('UTILITY', `Star added to spatial tracking: ${starName}, radius=${collisionRadius}m`);
            } else {
                debug('P1', 'SpatialManager not ready - skipping spatial tracking for star');
            }

            // Add lighting
            const starLight = new THREE.PointLight(starColor, 2, 1000);
            starLight.position.copy(star.position);
            this.scene.add(starLight);
            debug('UTILITY', 'Star light added');

            const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
            this.scene.add(ambientLight);
            debug('UTILITY', 'Ambient light added');

            const hemisphereLight = new THREE.HemisphereLight(starColor, 0x404040, 0.8);
            hemisphereLight.position.copy(star.position);
            this.scene.add(hemisphereLight);
            debug('UTILITY', 'Hemisphere light added');

            // Create planets via factory
            if (!this.starSystem.planets || !Array.isArray(this.starSystem.planets)) {
                debug('P1', 'No planets data available or invalid planets array');
                return true;
            }

            debug('STAR_CHARTS', 'Starting planet creation:', {
                totalPlanets: this.starSystem.planets.length,
                maxPlanets: Math.min(10, this.starSystem.planets.length)
            });

            const maxPlanets = Math.min(10, this.starSystem.planets.length);
            for (let i = 0; i < maxPlanets; i++) {
                const planetData = this.starSystem.planets[i];
                if (!planetData) {
                    debug('P1', `Invalid planet data at index ${i}`);
                    continue;
                }
                debug('STAR_CHARTS', `Creating planet ${i}:`, {
                    name: planetData.planet_name,
                    type: planetData.planet_type,
                    size: planetData.planet_size,
                    moonCount: planetData.moons?.length
                });
                await this.celestialBodyFactory.createPlanet(planetData, i, maxPlanets);
            }

            debug('STAR_CHARTS', 'Planet creation completed:', {
                totalBodies: this.celestialBodies.size,
                planetCount: Array.from(this.celestialBodies.keys()).filter(k => k.startsWith('planet_')).length,
                moonCount: Array.from(this.celestialBodies.keys()).filter(k => k.startsWith('moon_')).length
            });

            // Add Sol-specific infrastructure
            if (this.currentSector === 'A0' || this.starSystem?.star_name?.toLowerCase() === 'sol') {
                debug('UTILITY', 'Creating Sol System infrastructure...');
                await this.createSolSystemInfrastructure();
                debug('UTILITY', 'Sol System infrastructure complete');
            }

            debug('UTILITY', '=== Star System Creation Complete ===');
            return true;
        } catch (error) {
            debug('P1', `=== Star System Creation Failed === ${error.message}`);
            this.clearSystem();
            throw error;
        }
    }

    // Delegate planet creation to factory
    async createPlanet(planetData, index, maxPlanets) {
        return this.celestialBodyFactory.createPlanet(planetData, index, maxPlanets);
    }

    // Delegate moon creation to factory
    async createMoon(moonData, planetIndex, moonIndex) {
        return this.celestialBodyFactory.createMoon(moonData, planetIndex, moonIndex);
    }

    // Delegate orbital calculations to OrbitCalculator
    calculateOrbitalPeriod(semiMajorAxis) {
        return this.orbitCalculator.calculateOrbitalPeriod(semiMajorAxis);
    }

    calculateOrbitalVelocity(elements) {
        return this.orbitCalculator.calculateOrbitalVelocity(elements);
    }

    calculateMeanMotion(elements) {
        return this.orbitCalculator.calculateMeanMotion(elements);
    }

    calculateGravitationalForce(body1, body2) {
        return this.orbitCalculator.calculateGravitationalForce(body1, body2, this.celestialBodies);
    }

    setOrbitalElements(key, elements) {
        this.orbitCalculator.setOrbitalElements(key, elements);
    }

    getGridKey(position) {
        return this.orbitCalculator.getGridKey(position);
    }

    updateSpatialGrid() {
        this.orbitCalculator.updateSpatialGrid(this.celestialBodies);
    }

    getNearbyBodies(position, radius) {
        return this.orbitCalculator.getNearbyBodies(position, radius, this.celestialBodies);
    }

    getOrbitPosition(auDistance, angleDegrees) {
        return this.orbitCalculator.getOrbitPosition(auDistance, angleDegrees);
    }

    getEuropaMoonOrbitPosition() {
        return this.orbitCalculator.getEuropaMoonOrbitPosition();
    }

    clearSystem() {
        debug('UTILITY', 'Clearing star system');

        for (const [id, body] of this.celestialBodies) {
            if (body) {
                this.scene.remove(body);

                if (window.spatialManager) {
                    window.spatialManager.removeObject(body);
                    debug('UTILITY', `Object removed from spatial tracking: ${id}`);
                }

                if (body.geometry) {
                    body.geometry.dispose();
                }

                if (body.material) {
                    if (Array.isArray(body.material)) {
                        body.material.forEach(material => {
                            if (material.map) material.map.dispose();
                            material.dispose();
                        });
                    } else {
                        if (body.material.map) body.material.map.dispose();
                        body.material.dispose();
                    }
                }

                if (body.userData) {
                    body.userData = {};
                }
            }
        }

        this.celestialBodies.clear();
        this.planetGenerators.clear();
        this.orbitalSpeeds.clear();
        this.rotationSpeeds.clear();
        this.orbitCalculator.clearOrbitalElements();
        this.orbitCalculator.clearSpatialGrid();
        this.starSystem = null;

        if (window.gc) {
            window.gc();
        }

        debug('PERFORMANCE', 'Star system cleared and memory cleaned up');
    }

    // Delegate color functions to factory
    getStarColor(starType) {
        return this.celestialBodyFactory.getStarColor(starType);
    }

    getPlanetColor(planetType) {
        return this.celestialBodyFactory.getPlanetColor(planetType);
    }

    getMoonColor(moonType) {
        return this.celestialBodyFactory.getMoonColor(moonType);
    }

    getCelestialBodies() {
        return this.celestialBodies;
    }

    getCurrentEditBody() {
        return this.currentEditBody;
    }

    setCurrentEditBody(body) {
        this.currentEditBody = body;
    }

    getCelestialBodyInfo(body) {
        const gameObject = body?.userData?.gameObject;

        // First try spatial manager
        if (window.spatialManager && body) {
            const metadata = window.spatialManager.getMetadata(body);
            if (metadata) {
                const diplomacy = gameObject?.diplomacy || metadata.diplomacy;
                const faction = gameObject?.faction || metadata.faction || 'Unknown';

                return {
                    name: metadata.name || 'Unknown',
                    type: metadata.type || 'unknown',
                    classification: metadata.classification || metadata.type || 'Unknown',
                    faction: faction,
                    diplomacy: diplomacy,
                    description: metadata.description || 'No description available.',
                    intel_brief: metadata.intel_brief || faction !== 'Unknown' ? `${metadata.type || 'Object'} operated by ${faction}` : 'No intelligence data available.',
                    canDock: !!metadata.canDock,
                    gameObject: gameObject,
                    ...metadata
                };
            }
        }

        let key = Array.from(this.celestialBodies.entries())
            .find(([_, value]) => value === body)?.[0];

        if (!key && body && body.uuid) {
            key = Array.from(this.celestialBodies.entries())
                .find(([_, value]) => value.uuid === body.uuid)?.[0];
        }

        if (!key && body && body.userData && (body.userData.type === 'station' || body.userData.isSpaceStation)) {
            const faction = gameObject?.faction || body.userData.faction || 'Unknown';
            const diplomacy = gameObject?.diplomacy || body.userData.diplomacy;
            return {
                name: body.userData.name || 'Unknown Station',
                type: 'station',
                classification: body.userData.stationType || body.userData.type || 'Space Station',
                faction: faction,
                diplomacy: diplomacy,
                description: body.userData.description || 'Space station facility.',
                intel_brief: faction !== 'Unknown' ? `${body.userData.stationType || 'Station'} operated by ${faction}` : 'Space station facility.',
                canDock: !!body.userData.canDock,
                gameObject: gameObject
            };
        }

        if (!key) return null;

        if (key === 'star') {
            return {
                name: this.starSystem.star_name || 'Unknown Star',
                type: 'star',
                classification: this.starSystem.star_type || 'Unknown',
                description: this.starSystem.description || 'No description available.',
                intel_brief: this.starSystem.intel_brief || 'No intelligence data available.'
            };
        }

        if (key.startsWith('station_')) {
            if (body && body.userData) {
                const faction = gameObject?.faction || body.userData.faction || 'Unknown';
                const diplomacy = gameObject?.diplomacy || body.userData.diplomacy;
                return {
                    name: body.userData.name || 'Unknown Station',
                    type: 'station',
                    classification: body.userData.type || 'Space Station',
                    faction: faction,
                    diplomacy: diplomacy,
                    description: body.userData.description || 'Space station facility.',
                    intel_brief: `${body.userData.type} operated by ${faction}`,
                    canDock: body.userData.canDock || false,
                    gameObject: gameObject
                };
            }
            return {
                name: 'Unknown Station',
                type: 'station',
                classification: 'Space Station'
            };
        }

        const [type, planetIndex, moonIndex] = key.split('_');
        const planet = this.starSystem.planets[parseInt(planetIndex)];

        if (!planet) {
            debug('P1', `No planet data found for index ${planetIndex}`);
            return null;
        }

        if (type === 'planet') {
            return {
                name: planet.planet_name || `Planet ${planetIndex}`,
                type: 'planet',
                classification: planet.planet_type || 'Unknown',
                diplomacy: planet.diplomacy || 'Unknown',
                government: planet.government || 'Unknown',
                economy: planet.economy || 'Unknown',
                technology: planet.technology || 'Unknown',
                population: planet.population,
                description: planet.description || 'No description available.',
                intel_brief: planet.intel_brief || 'No intelligence data available.'
            };
        } else if (type === 'moon') {
            const moon = planet.moons[parseInt(moonIndex)];
            if (!moon) {
                debug('P1', `No moon data found for planet ${planetIndex}, moon ${moonIndex}`);
                return null;
            }
            return {
                name: moon.moon_name || `Moon ${moonIndex}`,
                type: 'moon',
                classification: moon.moon_type || 'Unknown',
                diplomacy: moon.diplomacy || 'Unknown',
                government: moon.government || 'Unknown',
                economy: moon.economy || 'Unknown',
                technology: moon.technology || 'Unknown',
                population: moon.population,
                description: moon.description || 'No description available.',
                intel_brief: moon.intel_brief || 'No intelligence data available.'
            };
        }

        return null;
    }

    setCurrentSector(sector) {
        this.currentSector = sector;
    }

    getCurrentSector() {
        return this.currentSector;
    }

    /**
     * Create Sol System specific infrastructure
     */
    async createSolSystemInfrastructure() {
        debug('UTILITY', 'Creating Sol System space stations and infrastructure...');

        try {
            const response = await fetch('/static/data/starter_system_infrastructure.json');
            if (!response.ok) {
                throw new Error(`Failed to load infrastructure data: ${response.status}`);
            }
            const infrastructureData = await response.json();
            const solStations = infrastructureData.stations;
            debug('UTILITY', `Loaded ${solStations.length} stations from JSON data`);

            for (const stationData of solStations) {
                try {
                    const station = this.celestialBodyFactory.createSpaceStation(stationData);
                    if (station) {
                        this.scene.add(station);
                        this.celestialBodies.set(`station_${stationData.name.toLowerCase().replace(/\s+/g, '_')}`, station);
                        debug('UTILITY', `Created station: ${stationData.name} (${stationData.faction})`);
                    }
                } catch (error) {
                    debug('P1', `Failed to create station ${stationData.name}: ${error.message}`);
                }
            }

            debug('UTILITY', `Created ${solStations.length} space stations in Sol system`);
        } catch (error) {
            debug('P1', `Failed to load Sol system infrastructure: ${error.message}`);
        }

        // Create Navigation Beacons
        try {
            await this.celestialBodyFactory.createNavigationBeacons();
        } catch (e) {
            debug('P1', `Failed to create navigation beacons: ${e?.message || e}`);
        }
    }

    /**
     * Get discovery radius based on player's target CPU card
     */
    getDiscoveryRadius() {
        try {
            if (this.starfieldManager && this.starfieldManager.ship) {
                const ship = this.starfieldManager.ship;
                const targetComputer = ship.systems?.get('target_computer');

                if (targetComputer && targetComputer.range) {
                    debug('TARGETING', `Using equipped target CPU range: ${targetComputer.range}km for discovery radius`);
                    return targetComputer.range;
                }
            }

            debug('TARGETING', `No target CPU equipped, using level 1 range: 50km for discovery radius`);
            return 50;
        } catch (error) {
            debug('P1', `Failed to get target CPU range, using default 50km: ${error.message}`);
            return 50;
        }
    }

    // Delegate station creation to factory
    createSpaceStation(stationData) {
        return this.celestialBodyFactory.createSpaceStation(stationData);
    }

    /**
     * Get diplomacy status for a faction
     */
    getFactionDiplomacy(faction) {
        const factionDiplomacy = {
            'Terran Republic Alliance': 'friendly',
            'Free Trader Consortium': 'neutral',
            'Nexus Corporate Syndicate': 'neutral',
            'Ethereal Wanderers': 'neutral',
            'Scientists Consortium': 'friendly',
            'Miners Union': 'neutral'
        };

        return factionDiplomacy[faction] || 'neutral';
    }

    /**
     * Add docking collision box to a space station
     */
    addDockingCollisionBox(station, stationData) {
        if (!window.spatialManager || !window.spatialManagerReady) {
            debug('P1', 'Spatial manager not ready - docking collision box will be added later');
            station.userData.pendingDockingCollision = {
                stationData: stationData,
                position: station.position.clone()
            };
            return;
        }

        let dockingBoxSize = stationData.size * 3;

        switch (stationData.type) {
            case 'Shipyard':
                dockingBoxSize = stationData.size * 4;
                break;
            case 'Defense Platform':
                dockingBoxSize = stationData.size * 2.5;
                break;
            default:
                dockingBoxSize = stationData.size * 3;
        }

        const dockingBoxGeometry = new THREE.BoxGeometry(
            dockingBoxSize * 2,
            dockingBoxSize * 1.5,
            dockingBoxSize * 2
        );

        const dockingBoxMaterial = new THREE.MeshBasicMaterial({
            visible: false,
            transparent: true,
            opacity: 0
        });

        const dockingBox = new THREE.Mesh(dockingBoxGeometry, dockingBoxMaterial);
        dockingBox.position.copy(station.position);

        dockingBox.userData = {
            isDockingCollisionBox: true,
            parentStation: station,
            stationName: stationData.name,
            stationType: stationData.type,
            faction: stationData.faction,
            dockingRange: dockingBoxSize
        };

        this.scene.add(dockingBox);

        try {
            window.spatialManager.addObject(dockingBox, {
                type: 'docking_zone',
                name: `${stationData.name} Docking Zone`,
                radius: dockingBoxSize / 2,
                canCollide: true,
                isTargetable: false,
                layer: 'docking',
                entityType: 'docking_zone',
                entityId: `docking_${stationData.name.toLowerCase().replace(/\s+/g, '_')}`,
                parentStation: station,
                stationName: stationData.name
            });

            if (window.collisionManager) {
                window.collisionManager.addObjectToLayer(dockingBox, 'docking');
            }

            station.userData.dockingCollisionBox = dockingBox;

            debug('UTILITY', `Created docking collision zone for ${stationData.name} (${dockingBoxSize.toFixed(1)}m range)`);
        } catch (error) {
            debug('P1', `Failed to create docking zone for ${stationData.name}: ${error.message}`);
        }
    }
}
