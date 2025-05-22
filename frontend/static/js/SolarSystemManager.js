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

        // Planets and moons are now stationary
        // Previous orbital mechanics code removed to disable movement
    }

    async generateStarSystem(sector) {
        console.log('Starting star system generation for sector:', sector);
        
        // Update current sector immediately
        this.currentSector = sector;
        console.log('Updated current sector to:', sector);
        
        try {
            // Clear existing system first
            console.log('Clearing existing system');
            this.clearSystem();
            
            // First try to get the system from universe data
            if (this.universe) {
                const systemData = this.universe.find(system => system.sector === sector);
                if (systemData) {
                    console.log('Found system in universe data:', {
                        starName: systemData.star_name,
                        starType: systemData.star_type,
                        planetCount: systemData.planets?.length
                    });
                    this.starSystem = systemData;
                } else {
                    console.warn('System not found in universe data, falling back to API');
                    // Fall back to API if not found in universe
                    const response = await fetch(`/api/generate_star_system?seed=${sector}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    this.starSystem = await response.json();
                }
            } else {
                console.warn('No universe data available, using API');
                // Use API if no universe data
                const response = await fetch(`/api/generate_star_system?seed=${sector}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                this.starSystem = await response.json();
            }
            
            console.log('Star system data:', {
                starName: this.starSystem?.star_name,
                starType: this.starSystem?.star_type,
                starSize: this.starSystem?.star_size,
                planetCount: this.starSystem?.planets?.length
            });
            
            // Generate new system
            console.log('Generating new system for sector:', sector);
            const success = await this.createStarSystem();
            
            if (!success) {
                console.error('Failed to generate new star system');
                return false;
            }
            
            console.log('Successfully generated new star system for sector:', sector);
            return true;
        } catch (error) {
            console.error('Error generating star system:', error);
            return false;
        }
    }

    async createStarSystem() {
        console.log('=== Starting Star System Creation ===');
        if (!this.starSystem) {
            console.error('No star system data available for creation');
            throw new Error('No star system data available');
        }

        console.log('Star system data:', {
            name: this.starSystem.star_name,
            type: this.starSystem.star_type,
            size: this.starSystem.star_size,
            planetCount: this.starSystem.planets?.length
        });
        
        // Store the star system data before clearing
        const starSystemData = this.starSystem;
        console.log('Stored star system data for restoration');
        
        // Clear existing meshes and collections
        console.log('Clearing existing system...');
        this.clearSystem();
        
        // Restore the star system data
        this.starSystem = starSystemData;
        console.log('Restored star system data');

        try {
            // Create star
            const starSize = this.starSystem.star_size || 5;
            console.log('Creating star:', {
                size: starSize,
                type: this.starSystem.star_type,
                name: this.starSystem.star_name
            });
            
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
            console.log('Star created and added to scene');

            // Add star light
            const starLight = new THREE.PointLight(starColor, 1, 100);
            starLight.position.copy(star.position);
            this.scene.add(starLight);
            console.log('Star light added');

            // Create planets
            if (!this.starSystem.planets || !Array.isArray(this.starSystem.planets)) {
                console.warn('No planets data available or invalid planets array');
                return true; // Still return true as we created the star
            }

            console.log('Starting planet creation:', {
                totalPlanets: this.starSystem.planets.length,
                maxPlanets: Math.min(10, this.starSystem.planets.length)
            });
            
            // Limit the number of planets to 10
            const maxPlanets = Math.min(10, this.starSystem.planets.length);
            for (let i = 0; i < maxPlanets; i++) {
                const planetData = this.starSystem.planets[i];
                if (!planetData) {
                    console.warn(`Invalid planet data at index ${i}`);
                    continue;
                }
                console.log(`Creating planet ${i}:`, {
                    name: planetData.planet_name,
                    type: planetData.planet_type,
                    size: planetData.planet_size,
                    moonCount: planetData.moons?.length
                });
                await this.createPlanet(planetData, i, maxPlanets);
            }
            
            console.log('Planet creation completed:', {
                totalBodies: this.celestialBodies.size,
                planetCount: Array.from(this.celestialBodies.keys()).filter(k => k.startsWith('planet_')).length,
                moonCount: Array.from(this.celestialBodies.keys()).filter(k => k.startsWith('moon_')).length
            });
            
            console.log('=== Star System Creation Complete ===');
            return true; // Return true on successful completion
        } catch (error) {
            console.error('=== Star System Creation Failed ===');
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                currentState: {
                    hasStarSystem: !!this.starSystem,
                    bodyCount: this.celestialBodies.size
                }
            });
            this.clearSystem(); // Clean up on error
            throw error; // Re-throw the error to be caught by generateStarSystem
        }
    }

    async createPlanet(planetData, index, maxPlanets) {
        if (!planetData || typeof planetData !== 'object') {
            console.warn(`Invalid planet data for index ${index}`);
            return;
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
            
            // Calculate orbit radius between 1000km and 5000km with exponential spacing
            const minRadius = 1000;
            const maxRadius = 5000;
            const totalPlanets = Math.max(1, this.starSystem.planets.length);
            
            // Use exponential spacing to create more realistic orbital distances
            const base = 1.8; // Base for exponential spacing
            const normalizedIndex = index / (totalPlanets - 1 || 1);
            const orbitRadius = minRadius + (maxRadius - minRadius) * (Math.pow(base, normalizedIndex) - 1) / (base - 1);
            
            // Ensure angle is a valid number
            const angle = (Math.random() * Math.PI * 2) || 0;
            
            // Set initial position
            const x = orbitRadius * Math.cos(angle);
            const y = 0;
            const z = orbitRadius * Math.sin(angle);
            
            // Validate position before setting
            if (isNaN(x) || isNaN(y) || isNaN(z)) {
                console.warn(`Invalid position calculated for planet ${index}:`, { x, y, z, orbitRadius, angle });
                planet.position.set(0, 0, 0);
            } else {
                planet.position.set(x, y, z);
            }
            
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
        } catch (error) {
            console.error(`Error creating planet ${index}:`, error);
        }
    }

    async createMoon(moonData, planetIndex, moonIndex) {
        if (!moonData || typeof moonData !== 'object') {
            console.warn(`Invalid moon data for planet ${planetIndex}, moon ${moonIndex}`);
            return;
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
            
            // Get parent planet position
            const planet = this.celestialBodies.get(`planet_${planetIndex}`);
            if (!planet) {
                console.warn(`Parent planet not found for moon ${moonIndex}`);
                return;
            }
            
            // Calculate initial position relative to planet
            const moonOrbitRadius = Math.max(1, (moonIndex + 1) * 2);
            const angle = (Math.random() * Math.PI * 2) || 0;
            const verticalVariation = Math.sin(angle * 0.5) * moonOrbitRadius * 0.2;
            
            // Calculate moon position components
            const x = moonOrbitRadius * Math.cos(angle);
            const y = verticalVariation;
            const z = moonOrbitRadius * Math.sin(angle);
            
            // Create position vector and validate
            const moonPosition = new THREE.Vector3(x, y, z);
            if (moonPosition.x === 0 && moonPosition.y === 0 && moonPosition.z === 0) {
                console.warn(`Zero position calculated for moon ${moonIndex} of planet ${planetIndex}`);
                return;
            }
            
            // Add moon position to planet position
            moon.position.copy(planet.position).add(moonPosition);
            
            // Validate final position
            if (isNaN(moon.position.x) || isNaN(moon.position.y) || isNaN(moon.position.z)) {
                console.warn(`Invalid position calculated for moon ${moonIndex} of planet ${planetIndex}:`, 
                    moon.position.toArray());
                return;
            }
            
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
        } catch (error) {
            console.error(`Error creating moon ${moonIndex} for planet ${planetIndex}:`, error);
        }
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
        console.log('Clearing star system');
        
        // Remove all celestial bodies from the scene
        for (const [id, body] of this.celestialBodies) {
            if (body) {
                // Remove from scene
                this.scene.remove(body);
                
                // Dispose of geometry
                if (body.geometry) {
                    body.geometry.dispose();
                }
                
                // Dispose of materials
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
                
                // Remove any custom properties
                if (body.userData) {
                    body.userData = {};
                }
            }
        }
        
        // Clear all collections
        this.celestialBodies.clear();
        this.planetGenerators.clear();
        this.orbitalSpeeds.clear();
        this.rotationSpeeds.clear();
        this.orbitalElements.clear();
        this.spatialGrid.clear();
        
        // Reset star system data
        this.starSystem = null;
        
        // Force garbage collection of any remaining references
        if (window.gc) {
            window.gc();
        }
        
        console.log('Star system cleared and memory cleaned up');
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