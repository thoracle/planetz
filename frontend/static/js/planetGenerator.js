class PlanetGenerator {
    constructor(gridSize = 64) {
        this.gridSize = gridSize;
        this.densityField = new Float32Array(gridSize * gridSize * gridSize);
        
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
        
        // Generate initial density field
        this.generateDensityField();
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

    generateDensityField() {
        const halfSize = this.gridSize / 2;
        
        // Generate density values
        for (let x = 0; x < this.gridSize; x++) {
            for (let y = 0; y < this.gridSize; y++) {
                for (let z = 0; z < this.gridSize; z++) {
                    const index = x + y * this.gridSize + z * this.gridSize * this.gridSize;
                    
                    // Calculate distance from center
                    const dx = x - halfSize;
                    const dy = y - halfSize;
                    const dz = z - halfSize;
                    const distanceFromCenter = Math.sqrt(dx * dx + dy * dy + dz * dz) / halfSize;
                    
                    // Base density (1 inside sphere, 0 outside)
                    let density = 1.0 - distanceFromCenter;
                    
                    // Add noise
                    const noiseValue = this.generateNoise(x, y, z);
                    density += noiseValue * this.params.terrainHeight; // Use terrain height parameter
                    
                    this.densityField[index] = density;
                }
            }
        }
    }

    generateNoise(x, y, z) {
        let amplitude = 1.0;
        let frequency = this.params.noiseScale;
        let noiseValue = 0;
        let amplitudeSum = 0;

        // Fractal Brownian Motion (FBM)
        for (let i = 0; i < this.params.octaves; i++) {
            const sampleX = x * frequency + this.params.seed;
            const sampleY = y * frequency + this.params.seed;
            const sampleZ = z * frequency + this.params.seed;
            
            // Use improved Perlin noise
            const noise = this.improvedNoise(sampleX, sampleY, sampleZ);
            noiseValue += noise * amplitude;
            
            amplitudeSum += amplitude;
            amplitude *= this.params.persistence;
            frequency *= this.params.lacunarity;
        }

        // Normalize
        return noiseValue / amplitudeSum;
    }

    // Update parameters and regenerate if needed
    updateParams(newParams) {
        let needsUpdate = false;
        
        // Update each parameter and check if regeneration is needed
        for (const [key, value] of Object.entries(newParams)) {
            if (this.params[key] !== value) {
                this.params[key] = value;
                needsUpdate = true;
            }
        }
        
        // Regenerate density field if parameters changed
        if (needsUpdate) {
            this.generateDensityField();
        }
        
        return needsUpdate;
    }

    improvedNoise(x, y, z) {
        // Improved Perlin noise implementation
        const p = new Array(512);
        const permutation = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
        
        // Duplicate the permutation array
        for (let i = 0; i < 256; i++) {
            p[256 + i] = p[i] = permutation[i];
        }

        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;

        x -= Math.floor(x);
        y -= Math.floor(y);
        z -= Math.floor(z);

        const u = this.fade(x);
        const v = this.fade(y);
        const w = this.fade(z);

        const A = p[X] + Y;
        const AA = p[A] + Z;
        const AB = p[A + 1] + Z;
        const B = p[X + 1] + Y;
        const BA = p[B] + Z;
        const BB = p[B + 1] + Z;

        return this.lerp(w,
            this.lerp(v,
                this.lerp(u,
                    this.grad(p[AA], x, y, z),
                    this.grad(p[BA], x - 1, y, z)
                ),
                this.lerp(u,
                    this.grad(p[AB], x, y - 1, z),
                    this.grad(p[BB], x - 1, y - 1, z)
                )
            ),
            this.lerp(v,
                this.lerp(u,
                    this.grad(p[AA + 1], x, y, z - 1),
                    this.grad(p[BA + 1], x - 1, y, z - 1)
                ),
                this.lerp(u,
                    this.grad(p[AB + 1], x, y - 1, z - 1),
                    this.grad(p[BB + 1], x - 1, y - 1, z - 1)
                )
            )
        );
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    lerp(t, a, b) {
        return a + t * (b - a);
    }

    grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h == 12 || h == 14 ? x : z;
        return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
    }

    getDensityAt(x, y, z) {
        const index = x + y * this.gridSize + z * this.gridSize * this.gridSize;
        return this.densityField[index];
    }
} 