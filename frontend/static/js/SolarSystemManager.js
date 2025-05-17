import * as THREE from 'three';
import PlanetGenerator from './planetGenerator.js';
import { Atmosphere } from './Atmosphere.js';
import { Cloud } from './Cloud.js';

export class SolarSystemManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        
        // Set up camera position
        this.camera.position.set(0, 20, 30);
        this.camera.lookAt(0, 0, 0);
        
        this.starSystem = null;
        this.celestialBodies = new Map();
        this.planetGenerators = new Map();
        this.orbitalSpeeds = new Map();
        this.rotationSpeeds = new Map();
        this.currentEditBody = null;
        
        // Constants for orbital calculations
        this.G = 6.67430e-11;
        this.SOLAR_MASS = 1.989e30;
        this.AU = 149.6e9;
        this.SCALE_FACTOR = 1e-9;
        
        // Orbital elements storage
        this.orbitalElements = new Map();
        
        // Spatial partitioning
        this.gridSize = 20;
        this.spatialGrid = new Map();
    }

    getDebugInfo() {
        let info = {
            'Star System': this.starSystem ? 'Active' : 'None',
            'Total Bodies': this.celestialBodies.size,
            'Planets': Array.from(this.celestialBodies.keys()).filter(key => key.startsWith('planet_')).length,
            'Moons': Array.from(this.celestialBodies.keys()).filter(key => key.startsWith('moon_')).length
        };

        return info;
    }

    update(deltaTime) {
        // Update spatial partitioning
        this.updateSpatialGrid();

        // Update planet positions based on orbital mechanics and gravitational interactions
        for (let i = 0; i < this.celestialBodies.size; i++) {
            const planetKey = `planet_${i}`;
            const planet = this.celestialBodies.get(planetKey);
            if (planet) {
                const elements = this.orbitalElements.get(planetKey);
                if (!elements) continue;

                // Calculate gravitational forces from nearby bodies
                const nearbyBodies = this.getNearbyBodies(planet.position, 10);
                const totalForce = new THREE.Vector3();
                
                nearbyBodies.forEach(nearbyKey => {
                    if (nearbyKey !== planetKey) {
                        const force = this.calculateGravitationalForce(planetKey, nearbyKey);
                        totalForce.add(force);
                    }
                });

                // Update velocity based on gravitational force
                const acceleration = totalForce.divideScalar(elements.mass);
                const velocity = new THREE.Vector3(
                    Math.cos(elements.meanAnomaly),
                    0,
                    Math.sin(elements.meanAnomaly)
                ).multiplyScalar(this.calculateOrbitalVelocity(elements));

                velocity.add(acceleration.multiplyScalar(deltaTime));
                
                // Update position
                planet.position.add(velocity.multiplyScalar(deltaTime));

                // Update orbital elements
                elements.meanAnomaly += this.calculateMeanMotion(elements) * deltaTime;
                this.setOrbitalElements(planetKey, elements);
            }
        }

        // Update moon positions with similar gravitational calculations
        for (let i = 0; i < this.celestialBodies.size; i++) {
            const planetKey = `planet_${i}`;
            const planet = this.celestialBodies.get(planetKey);
            if (planet) {
                for (let j = 0; j < this.celestialBodies.size; j++) {
                    const moonKey = `moon_${i}_${j}`;
                    const moon = this.celestialBodies.get(moonKey);
                    if (moon) {
                        const elements = this.orbitalElements.get(moonKey);
                        if (!elements) continue;

                        // Calculate gravitational forces
                        const planetForce = this.calculateGravitationalForce(moonKey, planetKey);
                        const nearbyBodies = this.getNearbyBodies(moon.position, 5);
                        const totalForce = planetForce.clone();

                        nearbyBodies.forEach(nearbyKey => {
                            if (nearbyKey !== moonKey && nearbyKey !== planetKey) {
                                const force = this.calculateGravitationalForce(moonKey, nearbyKey);
                                totalForce.add(force);
                            }
                        });

                        // Update moon position
                        const acceleration = totalForce.divideScalar(elements.mass);
                        const velocity = new THREE.Vector3(
                            Math.cos(elements.meanAnomaly),
                            Math.sin(elements.inclination),
                            Math.sin(elements.meanAnomaly)
                        ).multiplyScalar(this.calculateOrbitalVelocity(elements));

                        velocity.add(acceleration.multiplyScalar(deltaTime));
                        moon.position.add(velocity.multiplyScalar(deltaTime));

                        // Update orbital elements
                        elements.meanAnomaly += this.calculateMeanMotion(elements) * deltaTime;
                        this.setOrbitalElements(moonKey, elements);
                    }
                }
            }
        }
    }

    async generateStarSystem(seed = null) {
        try {
            console.log('Generating star system with seed:', seed);
            // Call backend API to generate star system
            const response = await fetch(`/api/generate_star_system?seed=${seed || ''}`);
            if (!response.ok) {
                throw new Error('Failed to generate star system');
            }
            
            this.starSystem = await response.json();
            console.log('Received star system data:', this.starSystem);
            await this.createStarSystem();
            return true;
        } catch (error) {
            console.error('Error generating star system:', error);
            return false;
        }
    }

    async createStarSystem() {
        if (!this.starSystem) {
            console.log('No star system data available');
            return;
        }

        console.log('Creating star system:', this.starSystem);

        // Clear existing celestial bodies
        this.clearSystem();

        // Create star with proper size and color
        const starSize = this.starSystem.star_size || 2.0;
        const starGeometry = new THREE.SphereGeometry(starSize, 32, 32);
        const starColor = this.getStarColor(this.starSystem.star_type);
        const starMaterial = new THREE.MeshBasicMaterial({
            color: starColor,
            emissive: starColor,
            emissiveIntensity: 1
        });
        const star = new THREE.Mesh(starGeometry, starMaterial);
        this.scene.add(star);
        this.celestialBodies.set('star', star);
        console.log('Created star at position:', star.position);

        // Add star light with matching color
        const starLight = new THREE.PointLight(starColor, 2, 100);
        starLight.position.copy(star.position);
        this.scene.add(starLight);
        console.log('Added star light');

        // Create planets
        console.log('Creating planets:', this.starSystem.planets);
        for (let i = 0; i < this.starSystem.planets.length; i++) {
            const planetData = this.starSystem.planets[i];
            await this.createPlanet(planetData, i);
        }
    }

    async createPlanet(planetData, index) {
        // Create planet generator first to get visual characteristics
        const planetGenerator = new PlanetGenerator();
        if (planetData.params) {
            planetGenerator.params = {
                noiseScale: planetData.params.noise_scale,
                octaves: planetData.params.octaves,
                persistence: planetData.params.persistence,
                lacunarity: planetData.params.lacunarity,
                terrainHeight: planetData.params.terrain_height,
                seed: planetData.params.seed,
                planetType: planetData.planet_type
            };
        }
        this.planetGenerators.set(`planet_${index}`, planetGenerator);

        // Get visual characteristics for this planet type
        const characteristics = planetGenerator.getVisualCharacteristics(planetData.planet_type);

        // Create planet mesh with proper material
        const planetGeometry = new THREE.SphereGeometry(planetData.planet_size || 1, 32, 32);
        const planetMaterial = new THREE.MeshPhongMaterial({
            color: characteristics.baseColor,
            shininess: 15,
            flatShading: true
        });
        const planet = new THREE.Mesh(planetGeometry, planetMaterial);

        // Calculate orbit
        const orbitDistance = 5 + index * 3;
        const orbitPeriod = this.calculateOrbitalPeriod(orbitDistance);
        const meanMotion = (2 * Math.PI) / orbitPeriod;
        this.orbitalSpeeds.set(`planet_${index}`, meanMotion);

        // Position planet
        planet.position.x = orbitDistance;
        this.scene.add(planet);
        this.celestialBodies.set(`planet_${index}`, planet);

        // Set orbital elements
        this.setOrbitalElements(`planet_${index}`, {
            semiMajorAxis: orbitDistance,
            eccentricity: 0.1 + Math.random() * 0.1,
            inclination: Math.random() * Math.PI / 6,
            longitudeOfAscendingNode: Math.random() * Math.PI * 2,
            argumentOfPeriapsis: Math.random() * Math.PI * 2,
            meanAnomaly: Math.random() * Math.PI * 2,
            mass: 5.972e24 * (planetData.planet_size || 1)
        });

        // Add atmosphere if needed
        if (planetData.has_atmosphere) {
            const atmosphere = new Atmosphere(planetData.planet_size || 1);
            atmosphere.mesh.material.color = characteristics.atmosphere.color;
            atmosphere.mesh.material.opacity = characteristics.atmosphere.density * 0.2;
            atmosphere.mesh.position.copy(planet.position);
            this.scene.add(atmosphere.mesh);
            this.celestialBodies.set(`atmosphere_${index}`, atmosphere.mesh);
        }

        // Add clouds if needed
        if (planetData.has_clouds) {
            const clouds = new Cloud(planetData.planet_size || 1);
            clouds.mesh.material.color = characteristics.clouds.color;
            clouds.mesh.material.opacity = characteristics.clouds.coverage * 0.5;
            clouds.mesh.position.copy(planet.position);
            this.scene.add(clouds.mesh);
            this.celestialBodies.set(`clouds_${index}`, clouds.mesh);
        }

        // Add rings for Class-N planets
        if (planetData.planet_type === 'Class-N') {
            const ringGeometry = new THREE.RingGeometry(
                (planetData.planet_size || 1) * 1.5,
                (planetData.planet_size || 1) * 2.5,
                64
            );
            const ringMaterial = new THREE.MeshPhongMaterial({
                color: 0xA89F8D,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            const rings = new THREE.Mesh(ringGeometry, ringMaterial);
            rings.rotation.x = Math.PI / 2;
            rings.position.copy(planet.position);
            this.scene.add(rings);
            this.celestialBodies.set(`rings_${index}`, rings);
        }

        // Create moons
        if (planetData.moons && planetData.moons.length > 0) {
            for (let j = 0; j < planetData.moons.length; j++) {
                const moonData = planetData.moons[j];
                await this.createMoon(moonData, index, j);
            }
        }
    }

    async createMoon(moonData, planetIndex, moonIndex) {
        // Create moon mesh
        const moonGeometry = new THREE.SphereGeometry(0.2, 32, 32);
        const moonMaterial = new THREE.MeshPhongMaterial({
            color: this.getMoonColor(moonData.moon_type)
        });
        const moon = new THREE.Mesh(moonGeometry, moonMaterial);

        // Calculate moon orbit
        const moonOrbitDistance = 1.5 + moonIndex * 0.5;
        const moonOrbitPeriod = this.calculateOrbitalPeriod(moonOrbitDistance);
        const moonMeanMotion = (2 * Math.PI) / moonOrbitPeriod;
        this.orbitalSpeeds.set(`moon_${planetIndex}_${moonIndex}`, moonMeanMotion);

        // Position moon relative to its planet
        const planet = this.celestialBodies.get(`planet_${planetIndex}`);
        if (planet) {
            moon.position.copy(planet.position);
            moon.position.x += moonOrbitDistance;
        }

        this.scene.add(moon);
        this.celestialBodies.set(`moon_${planetIndex}_${moonIndex}`, moon);

        // Add orbital elements for moon
        this.setOrbitalElements(`moon_${planetIndex}_${moonIndex}`, {
            semiMajorAxis: moonOrbitDistance,
            eccentricity: 0.05 + Math.random() * 0.05,
            inclination: Math.random() * Math.PI / 8,
            longitudeOfAscendingNode: Math.random() * Math.PI * 2,
            argumentOfPeriapsis: Math.random() * Math.PI * 2,
            meanAnomaly: Math.random() * Math.PI * 2,
            mass: 7.34767309e22 * (moonData.moon_size || 1) // Moon mass * moon size
        });
    }

    calculateOrbitalPeriod(semiMajorAxis) {
        // Kepler's Third Law: T² = (4π²/GM) * a³
        return Math.sqrt((4 * Math.PI * Math.PI) / (this.G * this.SOLAR_MASS) * Math.pow(semiMajorAxis, 3));
    }

    calculateOrbitalVelocity(elements) {
        return Math.sqrt((this.G * this.SOLAR_MASS) / elements.semiMajorAxis);
    }

    calculateMeanMotion(elements) {
        return Math.sqrt((this.G * this.SOLAR_MASS) / Math.pow(elements.semiMajorAxis, 3));
    }

    clearSystem() {
        // Remove all celestial bodies from scene
        this.celestialBodies.forEach(body => {
            this.scene.remove(body);
        });
        
        // Clear all maps
        this.celestialBodies.clear();
        this.planetGenerators.clear();
        this.orbitalSpeeds.clear();
        this.rotationSpeeds.clear();
    }

    getStarColor(starType) {
        const colors = {
            'red dwarf': 0xff4444,
            'yellow dwarf': 0xffff00,
            'blue giant': 0x4444ff,
            'white dwarf': 0xffffff
        };
        return colors[starType] || 0xffffff;
    }

    getMoonColor(moonType) {
        const colors = {
            'rocky': 0x888888,
            'ice': 0xddddff,
            'desert': 0xd2b48c
        };
        return colors[moonType] || 0x888888;
    }

    // Add orbital elements for a celestial body
    setOrbitalElements(key, elements) {
        this.orbitalElements.set(key, {
            semiMajorAxis: elements.semiMajorAxis,
            eccentricity: elements.eccentricity,
            inclination: elements.inclination,
            longitudeOfAscendingNode: elements.longitudeOfAscendingNode,
            argumentOfPeriapsis: elements.argumentOfPeriapsis,
            meanAnomaly: elements.meanAnomaly,
            mass: elements.mass
        });
    }

    // Calculate gravitational force between two bodies
    calculateGravitationalForce(body1, body2) {
        const elements1 = this.orbitalElements.get(body1);
        const elements2 = this.orbitalElements.get(body2);
        if (!elements1 || !elements2) return new THREE.Vector3();

        const pos1 = this.celestialBodies.get(body1).position;
        const pos2 = this.celestialBodies.get(body2).position;
        
        const r = pos2.clone().sub(pos1);
        const distance = r.length();
        
        if (distance < 0.1) return new THREE.Vector3(); // Prevent division by zero
        
        const forceMagnitude = (this.G * elements1.mass * elements2.mass) / (distance * distance);
        return r.normalize().multiplyScalar(forceMagnitude);
    }

    // Get grid cell key for a position
    getGridKey(position) {
        const x = Math.floor(position.x / this.gridSize);
        const y = Math.floor(position.y / this.gridSize);
        const z = Math.floor(position.z / this.gridSize);
        return `${x},${y},${z}`;
    }

    // Update spatial partitioning
    updateSpatialGrid() {
        this.spatialGrid.clear();
        this.celestialBodies.forEach((body, key) => {
            const gridKey = this.getGridKey(body.position);
            if (!this.spatialGrid.has(gridKey)) {
                this.spatialGrid.set(gridKey, new Set());
            }
            this.spatialGrid.get(gridKey).add(key);
        });
    }

    // Get nearby bodies for gravitational calculations
    getNearbyBodies(position, radius) {
        const nearbyBodies = new Set();
        const cellRadius = Math.ceil(radius / this.gridSize);
        const centerCell = this.getGridKey(position);
        const [centerX, centerY, centerZ] = centerCell.split(',').map(Number);

        // Check surrounding cells
        for (let x = -cellRadius; x <= cellRadius; x++) {
            for (let y = -cellRadius; y <= cellRadius; y++) {
                for (let z = -cellRadius; z <= cellRadius; z++) {
                    const cellKey = `${centerX + x},${centerY + y},${centerZ + z}`;
                    const cellBodies = this.spatialGrid.get(cellKey);
                    if (cellBodies) {
                        cellBodies.forEach(bodyKey => {
                            const body = this.celestialBodies.get(bodyKey);
                            if (body && body.position.distanceTo(position) <= radius) {
                                nearbyBodies.add(bodyKey);
                            }
                        });
                    }
                }
            }
        }
        return Array.from(nearbyBodies);
    }

    getCelestialBodies() {
        // Only return actual celestial bodies (star, planets, moons)
        return Array.from(this.celestialBodies.entries())
            .filter(([key]) => key === 'star' || key.startsWith('planet_') || key.startsWith('moon_'))
            .map(([_, body]) => body);
    }

    getCurrentEditBody() {
        return this.currentEditBody;
    }

    setCurrentEditBody(body) {
        this.currentEditBody = body;
    }

    getCelestialBodyInfo(object) {
        // Find the key for this object
        let targetKey = null;
        for (const [key, value] of this.celestialBodies.entries()) {
            if (value === object) {
                targetKey = key;
                break;
            }
        }

        if (!targetKey) return { name: "Unknown", type: "Unknown" };

        // Parse the key to determine the type
        if (targetKey === 'star') {
            return {
                name: this.starSystem.star_name,
                type: this.starSystem.star_type
            };
        } else if (targetKey.startsWith('planet_')) {
            const planetIndex = parseInt(targetKey.split('_')[1]);
            const planet = this.starSystem.planets[planetIndex];
            return {
                name: planet.planet_name,
                type: planet.planet_type
            };
        } else if (targetKey.startsWith('moon_')) {
            const [_, planetIndex, moonIndex] = targetKey.split('_').map(Number);
            const moon = this.starSystem.planets[planetIndex].moons[moonIndex];
            return {
                name: moon.moon_name,
                type: moon.moon_type
            };
        }

        return { name: "Unknown", type: "Unknown" };
    }
} 