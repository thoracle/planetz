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
        this.universe = null;  // Store the universe data
        this.celestialBodies = new Map();
        this.planetGenerators = new Map();
        this.orbitalSpeeds = new Map();
        this.rotationSpeeds = new Map();
        this.currentEditBody = null;
        this.currentSector = 'A0'; // Track current sector
        
        // Constants for orbital calculations
        this.G = 6.67430e-11;
        this.SOLAR_MASS = 1.989e30;
        this.AU = 149.6e9;
        this.SCALE_FACTOR = 1e-9;
        
        // Visual scale factor for scene representation - increased for ultra-compact system
        this.VISUAL_SCALE = 200.0;
        
        // Maximum distance from sun in kilometers
        this.MAX_DISTANCE_KM = 3.2e6; // 3.2 million kilometers - increased from 800,000
        
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
                
                // Update position using visual scale
                const visualVelocity = velocity.clone().multiplyScalar(this.SCALE_FACTOR * this.VISUAL_SCALE);
                planet.position.add(visualVelocity.multiplyScalar(deltaTime));

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

    async generateStarSystem(sector) {
        if (!this.universe) {
            console.error('No universe data available');
            return false;
        }

        // Find the star system for this sector
        this.starSystem = this.universe.find(system => system.sector === sector);
        
        if (!this.starSystem) {
            console.error('No star system data found for sector:', sector);
            return false;
        }

        console.log('Generating star system for sector:', sector, 'with data:', this.starSystem);
        
        try {
            await this.createStarSystem();
            return true;
        } catch (error) {
            console.error('Failed to generate star system:', error);
            return false;
        }
    }

    async createStarSystem() {
        if (!this.starSystem) {
            throw new Error('No star system data available');
        }

        this.clearSystem();

        try {
            // Create star
            const starSize = this.starSystem.star_size || 5;
            const starGeometry = new THREE.SphereGeometry(starSize, 32, 32);
            const starColor = this.getStarColor(this.starSystem.star_type);
            const starMaterial = new THREE.MeshPhongMaterial({
                color: starColor,
                emissive: starColor,
                emissiveIntensity: 1,
                shininess: 100
            });
            const star = new THREE.Mesh(starGeometry, starMaterial);
            this.scene.add(star);
            this.celestialBodies.set('star', star);

            // Add star light
            const starLight = new THREE.PointLight(starColor, 1, 100);
            starLight.position.copy(star.position);
            this.scene.add(starLight);

            // Create planets
            if (!this.starSystem.planets || !Array.isArray(this.starSystem.planets)) {
                console.warn('No planets data available or invalid planets array');
                return;
            }

            // Limit the number of planets to 10
            const maxPlanets = Math.min(10, this.starSystem.planets.length);
            for (let i = 0; i < maxPlanets; i++) {
                const planetData = this.starSystem.planets[i];
                if (!planetData) {
                    console.warn(`Invalid planet data at index ${i}`);
                    continue;
                }
                await this.createPlanet(planetData, i);
            }
        } catch (error) {
            console.error('Error creating star system:', error);
            this.clearSystem(); // Clean up on error
            throw error;
        }
    }

    async createPlanet(planetData, index) {
        if (!planetData || typeof planetData !== 'object') {
            console.warn(`Invalid planet data for index ${index}`);
            return;
        }

        // Create planet mesh
        const planetSize = planetData.planet_size || 1;
        const planetGeometry = new THREE.SphereGeometry(planetSize, 32, 32);
        const planetMaterial = new THREE.MeshPhongMaterial({
            color: this.getPlanetColor(planetData.planet_type),
            shininess: 0.5,
            flatShading: true
        });
        const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        
        // Calculate initial position based on orbit
        const orbitRadius = (index + 1) * 10;
        const angle = Math.random() * Math.PI * 2; // Random starting angle
        planet.position.set(
            orbitRadius * Math.cos(angle),
            0,
            orbitRadius * Math.sin(angle)
        );
        
        this.scene.add(planet);
        this.celestialBodies.set(`planet_${index}`, planet);
        
        // Add orbital elements with mass and proper initialization
        this.setOrbitalElements(`planet_${index}`, {
            semiMajorAxis: orbitRadius,
            eccentricity: 0.1,
            inclination: Math.random() * 0.1,
            longitudeOfAscendingNode: Math.random() * Math.PI * 2,
            argumentOfPeriapsis: Math.random() * Math.PI * 2,
            meanAnomaly: angle,
            mass: planetSize * 1e24 // Mass proportional to size
        });

        // Create moons (limit to 5 moons per planet)
        if (planetData.moons && Array.isArray(planetData.moons)) {
            const maxMoons = Math.min(5, planetData.moons.length);
            for (let moonIndex = 0; moonIndex < maxMoons; moonIndex++) {
                const moonData = planetData.moons[moonIndex];
                if (!moonData) {
                    console.warn(`Invalid moon data for planet ${index}, moon ${moonIndex}`);
                    continue;
                }
                await this.createMoon(moonData, index, moonIndex);
            }
        }
    }

    async createMoon(moonData, planetIndex, moonIndex) {
        if (!moonData || typeof moonData !== 'object') {
            console.warn(`Invalid moon data for planet ${planetIndex}, moon ${moonIndex}`);
            return;
        }

        const moonSize = moonData.moon_size || 0.3;
        const moonGeometry = new THREE.SphereGeometry(moonSize, 32, 32);
        const moonMaterial = new THREE.MeshPhongMaterial({
            color: this.getPlanetColor(moonData.moon_type),
            shininess: 0.3,
            flatShading: true
        });
        const moon = new THREE.Mesh(moonGeometry, moonMaterial);
        
        // Get parent planet position
        const planet = this.celestialBodies.get(`planet_${planetIndex}`);
        if (!planet) {
            console.warn(`Parent planet not found for moon ${moonIndex}`);
            return;
        }
        
        // Calculate initial position relative to planet
        const moonOrbitRadius = (moonIndex + 1) * 2;
        const angle = Math.random() * Math.PI * 2; // Random starting angle
        moon.position.copy(planet.position).add(new THREE.Vector3(
            moonOrbitRadius * Math.cos(angle),
            Math.sin(angle * 0.5) * moonOrbitRadius * 0.2, // Slight vertical variation
            moonOrbitRadius * Math.sin(angle)
        ));
        
        this.scene.add(moon);
        this.celestialBodies.set(`moon_${planetIndex}_${moonIndex}`, moon);
        
        // Add orbital elements with mass and proper initialization
        this.setOrbitalElements(`moon_${planetIndex}_${moonIndex}`, {
            semiMajorAxis: moonOrbitRadius,
            eccentricity: 0.05,
            inclination: Math.random() * 0.05,
            longitudeOfAscendingNode: Math.random() * Math.PI * 2,
            argumentOfPeriapsis: Math.random() * Math.PI * 2,
            meanAnomaly: angle,
            mass: moonSize * 1e22 // Mass proportional to size, but less than planets
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
        switch (starType) {
            case 'Class-O': return 0x9BB0FF;  // Blue
            case 'Class-B': return 0xADB6FF;  // Blue-white
            case 'Class-A': return 0xCAD7FF;  // White
            case 'Class-F': return 0xF8F7FF;  // Yellow-white
            case 'Class-G': return 0xFFF4EA;  // Yellow (like our Sun)
            case 'Class-K': return 0xFFD2A1;  // Orange
            case 'Class-M': return 0xFFCC6F;  // Red
            default: return 0xFFFFFF;         // Default white
        }
    }

    getPlanetColor(planetType) {
        switch (planetType) {
            case 'Class-M': return 0x4CAF50;  // Earth-like, green/blue
            case 'Class-K': return 0xFF9800;  // Orange/brown rocky
            case 'Class-L': return 0x795548;  // Brown dwarf
            case 'Class-T': return 0x607D8B;  // Cool methane dwarf
            case 'Class-Y': return 0x9E9E9E;  // Ultra-cool brown dwarf
            case 'Class-D': return 0xBDBDBD;  // Small, rocky
            case 'Class-H': return 0xFFEB3B;  // Hot super-Earth
            case 'Class-J': return 0xFFC107;  // Gas giant
            case 'Class-N': return 0x00BCD4;  // Ice giant
            case 'rocky': return 0x8B4513;    // Basic rocky
            default: return 0xCCCCCC;         // Default grey
        }
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
        return this.celestialBodies;
    }

    getCurrentEditBody() {
        return this.currentEditBody;
    }

    setCurrentEditBody(body) {
        this.currentEditBody = body;
    }

    getCelestialBodyInfo(body) {
        // Find the key for this body
        const key = Array.from(this.celestialBodies.entries())
            .find(([_, value]) => value === body)?.[0];
        
        if (!key) return null;

        if (key === 'star') {
            return {
                name: this.starSystem.star_name || 'Unknown Star',
                type: this.starSystem.star_type || 'Unknown'
            };
        }

        const [type, planetIndex, moonIndex] = key.split('_');
        const planet = this.starSystem.planets[parseInt(planetIndex)];
        
        if (type === 'planet') {
            return {
                name: planet.planet_name || `Planet ${planetIndex}`,
                type: planet.planet_type || 'Unknown'
            };
        } else if (type === 'moon') {
            const moon = planet.moons[parseInt(moonIndex)];
            return {
                name: moon.moon_name || `Moon ${moonIndex}`,
                type: moon.moon_type || 'Unknown'
            };
        }

        return null;
    }

    // Add method to set current sector
    setCurrentSector(sector) {
        this.currentSector = sector;
    }

    // Add method to get current sector
    getCurrentSector() {
        return this.currentSector;
    }
} 