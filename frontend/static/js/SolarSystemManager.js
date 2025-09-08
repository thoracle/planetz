import * as THREE from 'three';
import PlanetGenerator from './planetGenerator.js';
import { Atmosphere } from './Atmosphere.js';
import { Cloud } from './Cloud.js';
import { debug } from './debug.js';

/**
 * SolarSystemManager - Manages celestial body creation and physics
 * 
 * COLLISION MODES:
 * • Realistic (default): Collision spheres match visual mesh sizes for accurate physics
 * • Weapon-friendly: Small collision spheres to prevent blocking weapon fire
 * 
 * Toggle with: window.useRealisticCollision = true/false
 * Note: Changes require regenerating the star system to take effect
 */
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
        this.VISUAL_SCALE = 100.0;
        
        // Maximum distance from sun in kilometers
        this.MAX_DISTANCE_KM = 1.6e6; // 1.6 million kilometers - reduced from 3.2 million
        
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

        // Add ships count section
        if (window.starfieldManager) {
            const starfieldManager = window.starfieldManager;
            let totalShips = 0;
            let enemyShips = 0;
            let friendlyShips = 0;
            let neutralShips = 0;
            let unknownShips = 0;

            // Count ships from targetObjects (this already includes dummy ships via addNonPhysicsTargets)
            if (starfieldManager.targetComputerManager && starfieldManager.targetComputerManager.targetObjects) {
                const targetObjects = starfieldManager.targetComputerManager.targetObjects;
                
                targetObjects.forEach(targetData => {
                    // Check if this is a ship (has isShip flag or is enemy_ship type)
                    if (targetData.isShip || targetData.type === 'enemy_ship' || targetData.type === 'ship') {
                        totalShips++;
                        
                        // Determine faction based on type and diplomacy
                        // Check if this is a target dummy first (should be neutral training targets)
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

            // Add ship counts to debug info
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

        // Planets and moons are now stationary
        // Previous orbital mechanics code removed to disable movement
    }

    async generateStarSystem(sector) {
debug('UTILITY', 'Starting star system generation for sector:', sector);
        
        // Update current sector immediately
        this.currentSector = sector;
debug('UTILITY', 'Updated current sector to:', sector);
        
        try {
            // Clear existing system first
debug('UTILITY', 'Clearing existing system');
            this.clearSystem();
            
            // First try to get the system from universe data
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
            
            debug('STAR_CHARTS', 'Star system data:', {
                starName: this.starSystem?.star_name,
                starType: this.starSystem?.star_type,
                starSize: this.starSystem?.star_size,
                planetCount: this.starSystem?.planets?.length
            });
            
            // Generate new system
debug('UTILITY', 'Generating new system for sector:', sector);
            const success = await this.createStarSystem();
            
            if (!success) {
                console.error('Failed to generate new star system');
                return false;
            }
            
debug('UTILITY', 'Successfully generated new star system for sector:', sector);
            // Notify listeners that the star system is ready
            try {
                const evt = new CustomEvent('starSystemReady', { detail: { sector, starName: this.starSystem?.star_name } });
                window.dispatchEvent(evt);
            } catch (e) {
                // ignore if CustomEvent unavailable
            }
            return true;
        } catch (error) {
            console.error('Error generating star system:', error);
            return false;
        }
    }

    async createStarSystem() {
debug('UTILITY', '=== Starting Star System Creation ===');
        if (!this.starSystem) {
            console.error('No star system data available for creation');
            throw new Error('No star system data available');
        }

        debug('STAR_CHARTS', 'Star system data:', {
            name: this.starSystem.star_name,
            type: this.starSystem.star_type,
            size: this.starSystem.star_size,
            planetCount: this.starSystem.planets?.length
        });
        
        // Store the star system data before clearing
        const starSystemData = this.starSystem;
debug('UTILITY', 'Stored star system data for restoration');
        
        // Clear existing meshes and collections
debug('UTILITY', 'Clearing existing system...');
        this.clearSystem();
        
        // Restore the star system data
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
            const starColor = this.getStarColor(this.starSystem.star_type);
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

                    // Set name directly on star object for target computer
        star.name = this.starSystem.star_name || 'Unknown Star';
        
        // Add metadata to star object
        star.userData = {
            name: this.starSystem.star_name || 'Unknown Star',
            type: 'star',
            faction: 'neutral',
            diplomacy: 'neutral'
        };
            
            // Add physics body for the star
            if (window.spatialManager && window.spatialManagerReady) {
                // Use realistic collision size matching visual mesh (can be toggled with window.useRealisticCollision = false)
                const useRealistic = window.useRealisticCollision !== false; // Default to realistic
                const collisionRadius = useRealistic ? starSize : Math.min(starSize, 0.5);
                
                window.spatialManager.addObject(star, {
                    type: 'star',
                    name: this.starSystem.star_name || 'Unknown Star',
                    faction: 'neutral', // Stars are neutral
                    diplomacy: 'neutral',
                    radius: collisionRadius, // Match visual mesh size for realistic collision detection
                    entityType: 'star',
                    entityId: this.starSystem.star_name || 'Unknown Star',
                    health: 50000 // Stars are essentially indestructible
                });
                
debug('UTILITY', `🌟 Star added to spatial tracking: ${this.starSystem.star_name}, radius=${collisionRadius}m`);
            } else {
                console.warn('⚠️ SpatialManager not ready - skipping spatial tracking for star');
            }

            // Add star light with increased intensity and range
            const starLight = new THREE.PointLight(starColor, 2, 1000);
            starLight.position.copy(star.position);
            this.scene.add(starLight);
debug('UTILITY', 'Star light added');

            // Add ambient light for base illumination
            const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
            this.scene.add(ambientLight);
debug('UTILITY', 'Ambient light added');

            // Add hemisphere light to simulate scattered light
            const hemisphereLight = new THREE.HemisphereLight(starColor, 0x404040, 0.8);
            hemisphereLight.position.copy(star.position);
            this.scene.add(hemisphereLight);
debug('UTILITY', 'Hemisphere light added');

            // Create planets
            if (!this.starSystem.planets || !Array.isArray(this.starSystem.planets)) {
                console.warn('No planets data available or invalid planets array');
                return true; // Still return true as we created the star
            }

            debug('STAR_CHARTS', 'Starting planet creation:', {
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
                debug('STAR_CHARTS', `Creating planet ${i}:`, {
                    name: planetData.planet_name,
                    type: planetData.planet_type,
                    size: planetData.planet_size,
                    moonCount: planetData.moons?.length
                });
                await this.createPlanet(planetData, i, maxPlanets);
            }
            
            debug('STAR_CHARTS', 'Planet creation completed:', {
                totalBodies: this.celestialBodies.size,
                planetCount: Array.from(this.celestialBodies.keys()).filter(k => k.startsWith('planet_')).length,
                moonCount: Array.from(this.celestialBodies.keys()).filter(k => k.startsWith('moon_')).length
            });
            
            // Add Sol-specific infrastructure if this is the Sol system
            if (this.currentSector === 'A0' || this.starSystem?.star_name?.toLowerCase() === 'sol') {
debug('UTILITY', '🌟 Creating Sol System infrastructure...');
                await this.createSolSystemInfrastructure();
debug('UTILITY', '🌟 Sol System infrastructure complete');
            }
            
debug('UTILITY', '=== Star System Creation Complete ===');
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
            
            // Check if this is the starter system for more compact layout
            const isStarterSystem = this.starSystem?.star_name === 'Sol';
            
            // Calculate orbit radius - more compact for starter system
            let minRadius, maxRadius;
            if (isStarterSystem) {
                // Much closer orbits for starter system - easier to navigate
                minRadius = 15;  // Very close to star
                maxRadius = 35;  // Still close but room for multiple bodies
            } else {
                // Regular system spacing
                minRadius = 1000;
                maxRadius = 5000;
            }
            
            const totalPlanets = Math.max(1, this.starSystem.planets.length);
            
            // Use exponential spacing to create more realistic orbital distances
            const base = isStarterSystem ? 1.5 : 1.8; // Smaller base for more compact starter system
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
            
            // Add physics body for the planet
            if (window.spatialManager && window.spatialManagerReady) {
                // Use realistic collision size matching visual mesh (can be toggled with window.useRealisticCollision = false)
                const useRealistic = window.useRealisticCollision !== false; // Default to realistic
                const collisionRadius = useRealistic ? planetSize : Math.min(planetSize, 0.5);
                
                // Set the name and diplomacy on the planet object for target computer
                planet.name = planetData.planet_name || `Planet ${index}`;
                planet.diplomacy = planetData.diplomacy || 'neutral';
                planet.faction = planetData.diplomacy || 'neutral'; // Use diplomacy as faction for planets
                
                window.spatialManager.addObject(planet, {
                    type: 'planet',
                    name: planetData.planet_name || `Planet ${index}`,
                    radius: collisionRadius, // Match visual mesh size for realistic collision detection
                    entityType: 'planet',
                    entityId: planetData.planet_name || `Planet ${index}`,
                    health: 20000, // Planets are very durable
                    diplomacy: planetData.diplomacy || 'neutral',
                    faction: planetData.diplomacy || 'neutral', // Use diplomacy as faction for planets
                    government: planetData.government,
                    economy: planetData.economy,
                    technology: planetData.technology
                });
                
debug('PHYSICS', `🌍 Planet collision: Visual=${planetSize}m, Physics=${collisionRadius}m (realistic=${useRealistic})`);
                
debug('UTILITY', `🪐 Planet added to spatial tracking: ${planetData.planet_name || index}, radius=${collisionRadius}m`);
            } else {
                console.warn('⚠️ SpatialManager not ready - skipping spatial tracking for planets');
            }
            
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
            
            // Check if this is the starter system for more compact moon layout
            const isStarterSystem = this.starSystem?.star_name === 'Sol';
            
            // Calculate initial position relative to planet - increased distances to avoid launch interference
            const baseMoonOrbitRadius = isStarterSystem ? 8.0 : 12.0; // Much further from planets
            const moonOrbitRadius = Math.max(6, (moonIndex + 1) * baseMoonOrbitRadius);
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
            
            // Set name and diplomacy directly on moon object for target computer
            moon.name = moonData.moon_name || `Moon ${moonIndex} of Planet ${planetIndex}`;
            moon.diplomacy = moonData.diplomacy || 'neutral';
            moon.faction = moonData.diplomacy || 'neutral'; // Use diplomacy as faction for moons
            
            // Add physics body for the moon
            if (window.spatialManager && window.spatialManagerReady) {
                // Use realistic collision size matching visual mesh (can be toggled with window.useRealisticCollision = false)
                const useRealistic = window.useRealisticCollision !== false; // Default to realistic
                const collisionRadius = useRealistic ? moonSize : Math.min(moonSize, 0.1);
                
                window.spatialManager.addObject(moon, {
                    type: 'moon',
                    name: moonData.moon_name || `Moon ${moonIndex} of Planet ${planetIndex}`,
                    radius: collisionRadius,
                    canCollide: true,
                    isTargetable: true,
                    layer: 'planets',
                    diplomacy: moonData.diplomacy || 'neutral',
                    faction: moonData.diplomacy || 'neutral', // Use diplomacy as faction for moons
                    government: moonData.government,
                    economy: moonData.economy,
                    technology: moonData.technology
                });
                
debug('UTILITY', `🌙 Moon added to spatial tracking: ${moonData.moon_name || `${planetIndex}_${moonIndex}`}, radius=${collisionRadius}m`);
            } else {
                console.warn('⚠️ SpatialManager not ready - skipping spatial tracking for moons');
            }
            
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
debug('UTILITY', 'Clearing star system');
        
        // Remove all celestial bodies from the scene
        for (const [id, body] of this.celestialBodies) {
            if (body) {
                // Remove from scene
                this.scene.remove(body);
                
                // Remove from spatial tracking if it exists
                if (window.spatialManager) {
                    window.spatialManager.removeObject(body);
debug('UTILITY', `🧹 Object removed from spatial tracking: ${id}`);
                }
                
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
        
debug('PERFORMANCE', 'Star system cleared and memory cleaned up');
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
        // First try to get metadata from spatial manager (includes faction info)
        if (window.spatialManager && body) {
            const metadata = window.spatialManager.getMetadata(body);
            if (metadata) {
                // console.log(`🔍 SolarSystemManager.getCelestialBodyInfo: Found spatial metadata for ${metadata.name}:`, {
                //     name: metadata.name,
                //     type: metadata.type,
                //     faction: metadata.faction,
                //     diplomacy: metadata.diplomacy
                // });
                return {
                    name: metadata.name || 'Unknown',
                    type: metadata.type || 'unknown',
                    classification: metadata.classification || metadata.type || 'Unknown',
                    faction: metadata.faction || 'Unknown',
                    diplomacy: metadata.diplomacy,
                    description: metadata.description || 'No description available.',
                    intel_brief: metadata.intel_brief || metadata.faction ? `${metadata.type || 'Object'} operated by ${metadata.faction}` : 'No intelligence data available.',
                    canDock: !!metadata.canDock,
                    ...metadata
                };
            }
        }
        
        // Find the key for this body - first try by reference
        let key = Array.from(this.celestialBodies.entries())
            .find(([_, value]) => value === body)?.[0];
        
        // If not found by reference, try by UUID as fallback
        if (!key && body && body.uuid) {
            key = Array.from(this.celestialBodies.entries())
                .find(([_, value]) => value.uuid === body.uuid)?.[0];
        }
        
        // Defensive: if body carries station flags in userData, force station info
        if (!key && body && body.userData && (body.userData.type === 'station' || body.userData.isSpaceStation)) {
            return {
                name: body.userData.name || 'Unknown Station',
                type: 'station',
                classification: body.userData.stationType || body.userData.type || 'Space Station',
                faction: body.userData.faction || 'Unknown',
                description: body.userData.description || 'Space station facility.',
                intel_brief: body.userData.faction ? `${body.userData.stationType || 'Station'} operated by ${body.userData.faction}` : 'Space station facility.',
                canDock: !!body.userData.canDock
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

        // Handle space stations
        if (key.startsWith('station_')) {
            if (body && body.userData) {
                return {
                    name: body.userData.name || 'Unknown Station',
                    type: 'station',
                    classification: body.userData.type || 'Space Station',
                    faction: body.userData.faction || 'Unknown',
                    description: body.userData.description || 'Space station facility.',
                    intel_brief: `${body.userData.type} operated by ${body.userData.faction}`,
                    canDock: body.userData.canDock || false
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
            console.warn(`No planet data found for index ${planetIndex}`);
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
                console.warn(`No moon data found for planet ${planetIndex}, moon ${moonIndex}`);
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

    // Add method to set current sector
    setCurrentSector(sector) {
        this.currentSector = sector;
    }

    // Add method to get current sector
    getCurrentSector() {
        return this.currentSector;
    }

    /**
     * Create Sol System specific infrastructure including space stations and faction presence
     * Based on docs/sol_system_layout.md
     */
    async createSolSystemInfrastructure() {
debug('UTILITY', 'Creating Sol System space stations and infrastructure...');

        try {
            // Load infrastructure data from JSON file
            const response = await fetch('/static/data/starter_system_infrastructure.json');
            if (!response.ok) {
                throw new Error(`Failed to load infrastructure data: ${response.status}`);
            }
            const infrastructureData = await response.json();
            const solStations = infrastructureData.stations;
debug('UTILITY', `📋 Loaded ${solStations.length} stations from JSON data`);

            // Create space station objects
            for (const stationData of solStations) {
                try {
                    const station = this.createSpaceStation(stationData);
                    if (station) {
                        this.scene.add(station);
                        this.celestialBodies.set(`station_${stationData.name.toLowerCase().replace(/\s+/g, '_')}`, station);
debug('UTILITY', `✅ Created station: ${stationData.name} (${stationData.faction})`);
                    }
                } catch (error) {
                    console.error(`❌ Failed to create station ${stationData.name}:`, error);
                }
            }

debug('UTILITY', `🛰️ Created ${solStations.length} space stations in Sol system`);
        } catch (error) {
            console.error('❌ Failed to load Sol system infrastructure:', error);
        }

        // Create Navigation Beacon ring around Terra Prime on the galactic plane
        try {
            await this.createNavigationBeaconsAroundTerraPrime();
        } catch (e) {
            console.warn('⚠️ Failed to create navigation beacons:', e?.message || e);
        }
    }

    /**
     * Create a ring of Navigation Beacons 200km from Sol (the star) with even spacing
     * Small neutral pyramids with low hull that can be destroyed in 1–2 shots
     */
    async createNavigationBeaconsAroundTerraPrime() {
        if (!this.starSystem) {
            console.warn('No star system available for beacon placement');
            return;
        }

        try {
            // Load beacon data from JSON file
            const response = await fetch('/static/data/starter_system_infrastructure.json');
            if (!response.ok) {
                throw new Error(`Failed to load beacon data: ${response.status}`);
            }
            const infrastructureData = await response.json();
            const beaconData = infrastructureData.beacons;
debug('UTILITY', `📋 Loaded ${beaconData.length} beacons from JSON data`);

            const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
            if (!THREE) return;

            // Ensure StarfieldManager has a tracking array
            if (!this.starfieldManager) this.starfieldManager = window.starfieldManager;
            if (this.starfieldManager && !Array.isArray(this.starfieldManager.navigationBeacons)) {
                this.starfieldManager.navigationBeacons = [];
            }

            // Create beacons from JSON data
            for (let i = 0; i < beaconData.length; i++) {
                const beaconInfo = beaconData[i];
                const position = beaconInfo.position;

                // Small pyramid (4-sided cone) geometry
                const height = 0.8;
                const baseRadius = 0.5;
                const geometry = new THREE.ConeGeometry(baseRadius, height, 4);

                // Handle color conversion from hex string to number
                let color;
                if (typeof beaconInfo.color === 'string') {
                    color = parseInt(beaconInfo.color.replace('#', ''), 16);
                } else {
                    color = 0xffff00; // Default yellow
                }

                const material = new THREE.MeshPhongMaterial({
                    color: color,
                    emissive: 0x222200,
                    shininess: 10
                });

                const beacon = new THREE.Mesh(geometry, material);
                beacon.position.set(position[0], position[1], position[2]);

                // Calculate rotation based on position
                const angle = Math.atan2(position[2], position[0]);
                beacon.rotation.y = angle;

debug('UTILITY', `📡 Beacon ${i + 1} created at position (${position[0].toFixed(1)}, ${position[1].toFixed(1)}, ${position[2].toFixed(1)})`);

                // Set name directly on beacon object for target computer
                beacon.name = beaconInfo.name;

                beacon.userData = {
                    name: beaconInfo.name,
                    type: 'beacon',
                    faction: 'Neutral',
                    isBeacon: true,
                    description: beaconInfo.description,
                    id: beaconInfo.id
                };

                this.scene.add(beacon);

                // Register as first-class object in celestialBodies for unified lookups
                try {
                    if (!this.celestialBodies) this.celestialBodies = new Map();
                    const normalizedId = (beaconInfo.id || '').replace(/^a0_/i, 'A0_');
                    const nameSlug = (beaconInfo.name || '').toLowerCase().replace(/\s+/g, '_');
                    // Multiple keys to improve retrieval paths
                    if (normalizedId) this.celestialBodies.set(normalizedId, beacon);
                    if (normalizedId) this.celestialBodies.set(`beacon_${normalizedId}`, beacon);
                    if (nameSlug) this.celestialBodies.set(`beacon_${nameSlug}`, beacon);
                } catch (e) {
                    console.warn('⚠️ Failed to register beacon in celestialBodies:', e?.message || e);
                }

                // Add to spatial tracking for collision detection
                if (window.spatialManager && window.spatialManagerReady) {
                    window.spatialManager.addObject(beacon, {
                        type: 'beacon',
                        name: beaconInfo.name,
                        radius: 0.6, // Small collision radius
                        canCollide: true,
                        isTargetable: true,
                        layer: 'stations',
                        entityType: 'beacon',
                        entityId: beaconInfo.id,
                        health: 150 // 1–2 laser hits from starter weapons
                    });

                    // Also add to collision manager's station layer
                    if (window.collisionManager) {
                        window.collisionManager.addObjectToLayer(beacon, 'stations');
                    }

debug('INFRASTRUCTURE', `📡 Navigation beacon ${beaconInfo.name} added to spatial tracking`);
                }

                // Track in StarfieldManager so we can clean up on destroy
                if (this.starfieldManager) {
                    this.starfieldManager.navigationBeacons.push(beacon);
                }
            }

debug('NAVIGATION', `📡 Created ${beaconData.length} Navigation Beacons from JSON data`);
        } catch (error) {
            console.error('❌ Failed to create navigation beacons from JSON:', error);
        }
    }

    /**
     * Get discovery radius based on player's target CPU card
     * @returns {number} Discovery radius in kilometers
     */
    getDiscoveryRadius() {
        try {
            // Try to get the player's ship and target CPU system
            if (this.starfieldManager && this.starfieldManager.ship) {
                const ship = this.starfieldManager.ship;
                const targetComputer = ship.systems?.get('target_computer');

                if (targetComputer && targetComputer.range) {
                    // Use the equipped target CPU's range
debug('TARGETING', `🎯 Using equipped target CPU range: ${targetComputer.range}km for discovery radius`);
                    return targetComputer.range;
                }
            }

            // Fallback to level 1 target CPU range if no target CPU equipped
debug('TARGETING', `🎯 No target CPU equipped, using level 1 range: 50km for discovery radius`);
            return 50; // Level 1 target CPU range
        } catch (error) {
            console.warn('⚠️ Failed to get target CPU range, using default 50km:', error);
            return 50;
        }
    }

    /**
     * Create a space station mesh
     */
    createSpaceStation(stationData) {
        // Handle position conversion from JSON array to THREE.Vector3
        let position;
        if (Array.isArray(stationData.position)) {
            // JSON format: [distance, angle] - convert to 3D position
            position = this.getOrbitPosition(stationData.position[0], stationData.position[1]);
        } else {
            // Legacy format: already a THREE.Vector3
            position = stationData.position;
        }

        // Handle color conversion from hex string to number
        let color;
        if (typeof stationData.color === 'string') {
            // JSON format: "#00ff44" -> 0x00ff44
            color = parseInt(stationData.color.replace('#', ''), 16);
        } else {
            // Legacy format: already a number
            color = stationData.color;
        }

        // Create station geometry (simple geometric shape for now)
        let stationGeometry;

        switch (stationData.type) {
            case 'Shipyard':
                // Larger, more complex structure for shipyards
                stationGeometry = new THREE.CylinderGeometry(stationData.size * 0.5, stationData.size * 0.8, stationData.size * 2, 8);
                break;
            case 'Defense Platform':
                // Octagonal shape for defense platforms
                stationGeometry = new THREE.CylinderGeometry(stationData.size * 0.8, stationData.size * 0.8, stationData.size * 0.5, 8);
                break;
            case 'Research Lab':
                // Spherical with protruding modules
                stationGeometry = new THREE.SphereGeometry(stationData.size * 0.6, 16, 16);
                break;
            case 'Mining Station':
                // Industrial cubic structure
                stationGeometry = new THREE.BoxGeometry(stationData.size, stationData.size * 0.6, stationData.size * 1.2);
                break;
            default:
                // Default torus shape for other station types
                stationGeometry = new THREE.TorusGeometry(stationData.size, stationData.size * 0.3, 8, 16);
        }

        // Create station material with faction colors
        const stationMaterial = new THREE.MeshPhongMaterial({
            color: color,
            shininess: 30,
            transparent: true,
            opacity: 0.9
        });

        const station = new THREE.Mesh(stationGeometry, stationMaterial);
        station.position.copy(position);
        
        // Add some random rotation to make stations look more dynamic
        station.rotation.x = Math.random() * Math.PI * 2;
        station.rotation.y = Math.random() * Math.PI * 2;
        station.rotation.z = Math.random() * Math.PI * 2;

        // Set name directly on station object for target computer
        station.name = stationData.name;
        
        // Store station metadata for interactions
        station.userData = {
            name: stationData.name,
            faction: stationData.faction,
            type: stationData.type,
            description: stationData.description,
            services: stationData.services || [],
            intel_brief: stationData.intel_brief || stationData.description,
            discoveryRadius: this.getDiscoveryRadius(), // Dynamic based on target CPU
            isSpaceStation: true,
            canDock: true // Space stations should be dockable
        };

        // Add station to spatial manager with metadata
        if (window.spatialManager) {
            window.spatialManager.addObject(station, {
                type: 'station',
                name: stationData.name,
                faction: stationData.faction,
                diplomacy: this.getFactionDiplomacy(stationData.faction),
                radius: stationData.size,
                canCollide: true,
                isTargetable: true,
                layer: 'stations',
                entityType: 'station',
                entityId: `station_${stationData.name.toLowerCase().replace(/\s+/g, '_')}`
            });
        }

        // Add docking collision box for physics-based docking
        this.addDockingCollisionBox(station, stationData);

        return station;
    }

    /**
     * Get diplomacy status for a faction
     */
    getFactionDiplomacy(faction) {
        // Map faction names to diplomacy status
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
        // Only add docking collision if spatial manager is available
        if (!window.spatialManager || !window.spatialManagerReady) {
            console.warn('🚀 Spatial manager not ready - docking collision box will be added later');
            // Store the data for later addition
            station.userData.pendingDockingCollision = {
                stationData: stationData,
                position: station.position.clone()
            };
            return;
        }

        // Create a larger invisible collision box around the station for docking detection
        // Size it based on station type and size for appropriate docking range
        let dockingBoxSize = stationData.size * 3; // Default 3x station size
        
        switch (stationData.type) {
            case 'Shipyard':
                dockingBoxSize = stationData.size * 4; // Larger docking area for shipyards
                break;
            case 'Defense Platform':
                dockingBoxSize = stationData.size * 2.5; // Smaller docking area for military precision
                break;
            default:
                dockingBoxSize = stationData.size * 3; // Standard docking area
        }

        // Create invisible collision box geometry
        const dockingBoxGeometry = new THREE.BoxGeometry(
            dockingBoxSize * 2, 
            dockingBoxSize * 1.5, 
            dockingBoxSize * 2
        );
        
        // Create invisible material
        const dockingBoxMaterial = new THREE.MeshBasicMaterial({
            visible: false, // Invisible collision box
            transparent: true,
            opacity: 0
        });

        // Create the docking collision box mesh
        const dockingBox = new THREE.Mesh(dockingBoxGeometry, dockingBoxMaterial);
        dockingBox.position.copy(station.position);
        
        // Add metadata to identify this as a docking collision box
        dockingBox.userData = {
            isDockingCollisionBox: true,
            parentStation: station,
            stationName: stationData.name,
            stationType: stationData.type,
            faction: stationData.faction,
            dockingRange: dockingBoxSize
        };

        // Add to scene
        this.scene.add(dockingBox);

        // Add spatial tracking for docking detection
        try {
            // Add docking zone to spatial manager
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

            // Also add to collision manager's docking layer
            if (window.collisionManager) {
                window.collisionManager.addObjectToLayer(dockingBox, 'docking');
            }

            // Store reference for cleanup
            station.userData.dockingCollisionBox = dockingBox;
            
debug('UTILITY', `🚀 Created docking collision zone for ${stationData.name} (${dockingBoxSize.toFixed(1)}m range)`);
        } catch (error) {
            console.error(`❌ Failed to create docking zone for ${stationData.name}:`, error);
        }
    }

    /**
     * Get position in orbit around the star
     */
    getOrbitPosition(auDistance, angleDegrees) {
        const angle = (angleDegrees * Math.PI) / 180;
        const distance = auDistance * this.VISUAL_SCALE;
        
        return new THREE.Vector3(
            Math.cos(angle) * distance,
            (Math.random() - 0.5) * 2, // Small random Y variation
            Math.sin(angle) * distance
        );
    }

    /**
     * Get position near Europa moon around Terra Prime
     */
    getEuropaMoonOrbitPosition() {
        // Terra Prime is at ~1 AU (100 units from star)
        const terraPrimeDistance = 1.0 * this.VISUAL_SCALE;
        const terraPrimeAngle = 0; // Terra Prime is at 0 degrees
        
        // Europa moon orbits Terra Prime at ~16 units distance (moonIndex 1 * 8.0 * 2)
        const europaMoonDistance = 16.0;
        const europaMoonAngle = Math.PI * 0.5; // 90 degrees from Terra Prime
        
        // Calculate Terra Prime position
        const terraPrimeX = Math.cos(terraPrimeAngle) * terraPrimeDistance;
        const terraPrimeZ = Math.sin(terraPrimeAngle) * terraPrimeDistance;
        
        // Calculate Europa moon position relative to Terra Prime
        const europaMoonX = terraPrimeX + Math.cos(europaMoonAngle) * europaMoonDistance;
        const europaMoonZ = terraPrimeZ + Math.sin(europaMoonAngle) * europaMoonDistance;
        
        // Position station slightly offset from Europa moon (2 units away)
        const stationOffset = 2.0;
        const stationAngle = Math.PI * 0.25; // 45 degrees offset
        
        return new THREE.Vector3(
            europaMoonX + Math.cos(stationAngle) * stationOffset,
            (Math.random() - 0.5) * 2, // Small random Y variation
            europaMoonZ + Math.sin(stationAngle) * stationOffset
        );
    }
} 