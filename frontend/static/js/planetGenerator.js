import ChunkManager from './chunkManager.js';
import * as THREE from 'three';

class PlanetGenerator {
    constructor(gridSize = 64) {
        this.gridSize = gridSize;
        this.chunkSize = 16;
        
        // Enhanced LOD parameters
        this.lodLevels = 6; // Increased number of detail levels
        this.lodDistanceThresholds = [10, 20, 30, 50, 80, 120]; // More granular thresholds
        this.lodResolutionDivisors = [1, 1.5, 2, 3, 4, 6]; // Fractional divisors for smoother transitions
        this.lodTransitionRange = 5; // Distance range for smooth transitions
        
        // Initialize permutation table with a default seed
        this.initializePermutationTable(Math.random() * 10000);
        
        // Planet class definitions
        this.planetClasses = {
            "Class-M": {
                name: "Class-M (Earth-like)",
                description: "Earth-like planets capable of supporting humanoid life",
                params: {
                    noiseScale: 1.2,
                    octaves: 5,
                    persistence: 0.5,
                    lacunarity: 2.0,
                    terrainHeight: 0.15,
                    seed: Math.random() * 10000
                }
            },
            "Class-L": {
                name: "Class-L (Marginal)",
                description: "Marginally habitable with harsh conditions",
                params: {
                    noiseScale: 2.0,
                    octaves: 6,
                    persistence: 0.6,
                    lacunarity: 2.2,
                    terrainHeight: 0.25,
                    seed: Math.random() * 10000
                }
            },
            "Class-H": {
                name: "Class-H (Desert)",
                description: "Hot, arid worlds with little surface water",
                params: {
                    noiseScale: 3.0,
                    octaves: 4,
                    persistence: 0.4,
                    lacunarity: 2.5,
                    terrainHeight: 0.2,
                    seed: Math.random() * 10000
                }
            },
            "Class-D": {
                name: "Class-D (Demon)",
                description: "Toxic atmosphere, uninhabitable",
                params: {
                    noiseScale: 4.0,
                    octaves: 7,
                    persistence: 0.7,
                    lacunarity: 2.8,
                    terrainHeight: 0.4,
                    seed: Math.random() * 10000
                }
            },
            "Class-J": {
                name: "Class-J (Gas Giant)",
                description: "Gas giants similar to Jupiter",
                params: {
                    noiseScale: 0.8,
                    octaves: 3,
                    persistence: 0.3,
                    lacunarity: 1.8,
                    terrainHeight: 0.08,
                    seed: Math.random() * 10000
                }
            },
            "Class-K": {
                name: "Class-K (Barren)",
                description: "Barren, rocky worlds with limited water",
                params: {
                    noiseScale: 2.5,
                    octaves: 4,
                    persistence: 0.45,
                    lacunarity: 2.3,
                    terrainHeight: 0.3,
                    seed: Math.random() * 10000
                }
            },
            "Class-N": {
                name: "Class-N (Ringed)",
                description: "Planets with rings similar to Saturn",
                params: {
                    noiseScale: 1.0,
                    octaves: 4,
                    persistence: 0.4,
                    lacunarity: 2.0,
                    terrainHeight: 0.12,
                    seed: Math.random() * 10000
                }
            },
            "Class-Y": {
                name: "Class-Y (Demon)",
                description: "Extremely inhospitable with lethal conditions",
                params: {
                    noiseScale: 4.5,
                    octaves: 8,
                    persistence: 0.8,
                    lacunarity: 3.0,
                    terrainHeight: 0.5,
                    seed: Math.random() * 10000
                }
            }
        };
        
        // Generation parameters (start with Class-M)
        this.params = { ...this.planetClasses["Class-M"].params };
        
        // Initialize chunk manager last to ensure all parameters are set
        this.chunkManager = new ChunkManager(this, this.chunkSize);
        
        // Initialize chunks
        this.initializeChunks();
    }

    initializePermutationTable(seed) {
        this.p = new Array(512);
        
        // Create initial array [0..255]
        const values = Array.from({ length: 256 }, (_, i) => i);
        
        // Fisher-Yates shuffle with seeded random
        for (let i = values.length - 1; i > 0; i--) {
            const j = Math.floor(this.seededRandom(seed + i) * (i + 1));
            [values[i], values[j]] = [values[j], values[i]];
        }
        
        // Copy values to permutation table
        for (let i = 0; i < 256; i++) {
            this.p[i] = values[i];
            this.p[i + 256] = values[i];
        }
    }

    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    // Apply a planet class preset
    applyPlanetClass(className) {
        if (this.planetClasses[className]) {
            this.params = { ...this.planetClasses[className].params };
            this.generateDensityField();
            return true;
        }
        return false;
    }

    initializeChunks() {
        const numChunks = Math.ceil(this.gridSize / this.chunkSize);
        const halfChunks = Math.floor(numChunks / 2);
        const center = { x: 0, y: 0, z: 0 };
        const radius = (this.gridSize / 2) * Math.sqrt(3); // Diagonal of the cube
        
        // Update chunks within sphere radius
        this.chunkManager.updateChunksInRadius(center.x, center.y, center.z, radius);
        
        // Generate density field for each chunk
        this.generateDensityField();
    }

    generateDensityField(viewerPosition = { x: 0, y: 0, z: 0 }) {
        // Update each active chunk with LOD support
        for (const key of this.chunkManager.activeChunks) {
            const chunk = this.chunkManager.chunks.get(key);
            if (!chunk || !chunk.isActive) continue;
            
            this.generateDensityFieldWithLOD(chunk, viewerPosition);
        }
    }

    generateDensityFieldWithLOD(chunk, viewerPosition) {
        const worldPos = chunk.getWorldPosition();
        const distance = Math.sqrt(
            Math.pow(worldPos.x - viewerPosition.x, 2) +
            Math.pow(worldPos.y - viewerPosition.y, 2) +
            Math.pow(worldPos.z - viewerPosition.z, 2)
        );

        const lodLevel = this.calculateLODLevel(distance);
        const samplingStep = this.getLODSamplingStep(lodLevel);
        const halfSize = this.gridSize / 2;

        // Store both integer and fractional LOD level
        chunk.lastLODLevel = lodLevel;
        chunk.lodTransitionFactor = lodLevel - Math.floor(lodLevel);

        let densityStats = { min: Infinity, max: -Infinity, sum: 0, count: 0 };
        let noiseStats = { min: Infinity, max: -Infinity, sum: 0, count: 0 };

        // Generate density values with variable resolution
        for (let x = 0; x < chunk.size; x += samplingStep) {
            for (let y = 0; y < chunk.size; y += samplingStep) {
                for (let z = 0; z < chunk.size; z += samplingStep) {
                    const worldX = worldPos.x + x - halfSize;
                    const worldY = worldPos.y + y - halfSize;
                    const worldZ = worldPos.z + z - halfSize;

                    // Calculate distance from center (normalized to 0-1 range)
                    const distanceFromCenter = Math.sqrt(
                        worldX * worldX +
                        worldY * worldY +
                        worldZ * worldZ
                    ) / halfSize;

                    // Base density (negative inside planet, positive outside)
                    let density = 1.0 - distanceFromCenter;

                    // Add noise only if we're near the surface
                    if (Math.abs(density) < 0.1) {
                        const noiseValue = this.generateNoise(
                            worldX + halfSize,
                            worldY + halfSize,
                            worldZ + halfSize
                        );
                        
                        // Track noise statistics
                        noiseStats.min = Math.min(noiseStats.min, noiseValue);
                        noiseStats.max = Math.max(noiseStats.max, noiseValue);
                        noiseStats.sum += noiseValue;
                        noiseStats.count++;
                        
                        density += noiseValue * this.params.terrainHeight;
                    }

                    // Track density statistics
                    densityStats.min = Math.min(densityStats.min, density);
                    densityStats.max = Math.max(densityStats.max, density);
                    densityStats.sum += density;
                    densityStats.count++;

                    // Fill the block of cells for this LOD step
                    for (let dx = 0; dx < samplingStep && x + dx < chunk.size; dx++) {
                        for (let dy = 0; dy < samplingStep && y + dy < chunk.size; dy++) {
                            for (let dz = 0; dz < samplingStep && z + dz < chunk.size; dz++) {
                                chunk.setDensity(x + dx, y + dy, z + dz, density);
                            }
                        }
                    }
                }
            }
        }

        // Only log significant density changes
        /*
        if (Math.abs(densityStats.max - densityStats.min) > 0.5) {
            console.log('Significant density variation detected:', {
                min: densityStats.min.toFixed(3),
                max: densityStats.max.toFixed(3),
                avg: (densityStats.sum / densityStats.count).toFixed(3)
            });
        }
        */
    }

    generateNoise(x, y, z) {
        // Simple Perlin-like noise implementation
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        
        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);
        
        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);
        
        const A = this.p[X] + Y;
        const AA = this.p[A] + Z;
        const AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y;
        const BA = this.p[B] + Z;
        const BB = this.p[B + 1] + Z;
        
        // Calculate noise value with improved gradient handling
        let result = this.lerp(w, 
            this.lerp(v, 
                this.lerp(u, this.grad(this.p[AA], x, y, z),
                            this.grad(this.p[BA], x - 1, y, z)),
                this.lerp(u, this.grad(this.p[AB], x, y - 1, z),
                            this.grad(this.p[BB], x - 1, y - 1, z))),
            this.lerp(v, 
                this.lerp(u, this.grad(this.p[AA + 1], x, y, z - 1),
                            this.grad(this.p[BA + 1], x - 1, y, z - 1)),
                this.lerp(u, this.grad(this.p[AB + 1], x, y - 1, z - 1),
                            this.grad(this.p[BB + 1], x - 1, y - 1, z - 1))));
        
        // Normalize to [-1, 1] range and ensure no zero values
        result = Math.max(-1, Math.min(1, result));
        if (Math.abs(result) < 0.000001) {
            result = (this.p[X] & 1) === 0 ? 0.000001 : -0.000001;
        }
        
        return result;
    }

    // Generate a new seed for the planet
    generateNewSeed() {
        this.params.seed = Math.random() * 10000;
        this.initializePermutationTable(this.params.seed);
        this.generateDensityField();
    }

    // Get density at world coordinates
    getDensityAt(x, y, z) {
        const chunk = this.chunkManager.getChunkAtWorldPosition(x, y, z);
        if (!chunk) return 0;
        
        const local = chunk.getLocalCoordinates(x, y, z);
        return chunk.getDensity(local.x, local.y, local.z);
    }

    // Calculate LOD level based on distance with smooth transitions
    calculateLODLevel(distance) {
        // Find the appropriate LOD level
        for (let i = 0; i < this.lodDistanceThresholds.length; i++) {
            if (distance < this.lodDistanceThresholds[i]) {
                // If we're near a threshold, interpolate between levels
                if (i > 0) {
                    const prevThreshold = this.lodDistanceThresholds[i - 1];
                    const currThreshold = this.lodDistanceThresholds[i];
                    const transitionStart = currThreshold - this.lodTransitionRange;
                    
                    if (distance > transitionStart) {
                        const t = (distance - transitionStart) / this.lodTransitionRange;
                        return this.lodResolutionDivisors[i - 1] * (1 - t) + this.lodResolutionDivisors[i] * t;
                    }
                }
                return this.lodResolutionDivisors[i];
            }
        }
        return this.lodResolutionDivisors[this.lodLevels - 1];
    }

    // Get sampling step for LOD level with support for fractional steps
    getLODSamplingStep(lodLevel) {
        // For fractional LOD levels, return the base step
        return Math.floor(lodLevel);
    }

    // Clean up resources
    dispose() {
        this.chunkManager.dispose();
    }

    // Noise helper functions
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        let result = ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
        
        // Ensure we never return exactly zero
        if (result === 0) {
            result = (hash & 4) === 0 ? 0.000001 : -0.000001;
        }
        return result;
    }

    async generatePlanet(planetData) {
        // Create a new geometry for the planet
        const geometry = new THREE.SphereGeometry(1, 32, 32); // Adjust size as needed

        // Create a material for the planet
        const material = new THREE.MeshPhongMaterial({
            color: this.getPlanetColor(planetData.planet_type), // Assuming you have a method to get color
            shininess: 15,
            flatShading: true,
            emissive: 0x000000, // Set emissive color to black
            emissiveIntensity: 0 // Set emissive intensity to 0
        });

        // Create the planet mesh
        const planet = new THREE.Mesh(geometry, material);

        // Return the planet mesh
        return planet;
    }

    getPlanetColor(planetType) {
        // Define colors for different planet types
        const colors = {
            'Class-M': 0x4CAF50, // Green
            'Class-L': 0xFF9800, // Orange
            'Class-H': 0xFF5722, // Deep Orange
            'Class-D': 0x9C27B0, // Purple
            'Class-J': 0x2196F3, // Blue
            'Class-K': 0x795548, // Brown
            'Class-N': 0x00BCD4, // Cyan
            'Class-Y': 0xF44336  // Red
        };

        // Return the color for the given planet type, defaulting to a neutral color if not found
        return colors[planetType] || 0x808080; // Default to gray
    }
}

export default PlanetGenerator; 