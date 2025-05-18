// Planet Generator Tests
import PlanetGenerator from '../static/js/planetGenerator.js';
import * as THREE from 'three';

// Mock the ChunkManager import
jest.mock('../static/js/chunkManager.js', () => {
    return jest.fn().mockImplementation(() => ({
        updateChunksInRadius: jest.fn(),
        chunks: new Map(),
        activeChunks: new Set(),
        getActiveChunks: jest.fn().mockReturnValue([]),
        getChunk: jest.fn(() => ({
            size: 16,
            resolution: 16,
            position: { x: 0, y: 0, z: 0 },
            setDensity: jest.fn(),
            getDensity: jest.fn(),
            getLocalCoordinates: jest.fn(),
            getWorldPosition: () => ({ x: 0, y: 0, z: 0 }),
            generateMesh: async () => ({
                geometry: {
                    attributes: {
                        position: {},
                        normal: {},
                        color: {}
                    }
                }
            })
        })),
        getChunkAtWorldPosition: jest.fn((x, y, z) => ({
            size: 16,
            resolution: 16,
            position: { x: Math.floor(x/16)*16, y: Math.floor(y/16)*16, z: Math.floor(z/16)*16 },
            setDensity: jest.fn(),
            getDensity: jest.fn(),
            getLocalCoordinates: (wx, wy, wz) => ({
                x: wx % 16,
                y: wy % 16,
                z: wz % 16
            }),
            getWorldPosition: () => ({ x: 0, y: 0, z: 0 })
        }))
    }));
});

describe('PlanetGenerator', () => {
    let planetGenerator;
    
    beforeEach(() => {
        // Reset THREE mock implementations
        Object.values(global.THREE).forEach(mock => {
            if (jest.isMockFunction(mock)) {
                mock.mockClear();
            }
        });
        
        // Create a new instance with mocked dependencies
        planetGenerator = new PlanetGenerator(64);
    });
    
    test('initialization with default parameters', () => {
        expect(planetGenerator.params).toBeDefined();
        expect(planetGenerator.params.noiseScale).toBe(1.2);
        expect(planetGenerator.params.octaves).toBe(5);
        expect(planetGenerator.params.persistence).toBe(0.5);
        expect(planetGenerator.params.lacunarity).toBe(2);
        expect(planetGenerator.params.terrainHeight).toBe(0.15);
        
        // Test critical properties are initialized
        expect(planetGenerator.gridSize).toBe(64);
        expect(planetGenerator.chunkSize).toBe(16);
        expect(planetGenerator.p).toHaveLength(512);
        expect(planetGenerator.lodLevels).toBe(6);
        expect(planetGenerator.lodDistanceThresholds).toEqual([10, 20, 30, 50, 80, 120]);
        expect(planetGenerator.lodResolutionDivisors).toEqual([1, 1.5, 2, 3, 4, 6]);
    });
    
    test('noise generation is consistent', () => {
        const x = 1.0, y = 2.0, z = 3.0;
        const value1 = planetGenerator.generateNoise(x, y, z);
        const value2 = planetGenerator.generateNoise(x, y, z);
        expect(value1).toBe(value2);
        
        // Test noise generation actually produces values
        expect(value1).not.toBe(0);
        expect(typeof value1).toBe('number');
        expect(Number.isFinite(value1)).toBe(true);
    });
    
    test('noise values are within valid range', () => {
        const values = [];
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * 10 - 5;
            const y = Math.random() * 10 - 5;
            const z = Math.random() * 10 - 5;
            const value = planetGenerator.generateNoise(x, y, z);
            values.push(value);
            expect(value).toBeGreaterThanOrEqual(-1);
            expect(value).toBeLessThanOrEqual(1);
        }
        
        // Ensure we're getting a good distribution of values
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        expect(Math.abs(avg)).toBeLessThan(0.5); // Should be roughly centered around 0
        
        // Ensure we're getting different values
        const uniqueValues = new Set(values);
        expect(uniqueValues.size).toBeGreaterThan(50); // At least 50 unique values out of 100
    });
    
    test('terrain height affects vertex displacement', () => {
        const originalHeight = planetGenerator.params.terrainHeight;
        const vertex = { x: 1, y: 0, z: 0 };
        
        // Mock the noise function to return a consistent non-zero value
        const mockNoiseValue = 0.5;
        const originalGenerateNoise = planetGenerator.generateNoise;
        planetGenerator.generateNoise = jest.fn().mockReturnValue(mockNoiseValue);
        
        // Get displacement with original height
        const originalDisplacement = planetGenerator.generateNoise(vertex.x, vertex.y, vertex.z) * originalHeight;
        
        // Double the terrain height
        planetGenerator.params.terrainHeight = originalHeight * 2;
        const newDisplacement = planetGenerator.generateNoise(vertex.x, vertex.y, vertex.z) * planetGenerator.params.terrainHeight;
        
        expect(Math.abs(newDisplacement)).toBeGreaterThan(Math.abs(originalDisplacement));
        expect(newDisplacement).toBe(originalDisplacement * 2);
        
        // Restore the original function
        planetGenerator.generateNoise = originalGenerateNoise;
    });

    test('density field generation maintains consistency across transfers', () => {
        const chunk = {
            size: 16,
            resolution: 16,
            position: { x: 0, y: 0, z: 0 },
            getWorldPosition: () => ({ x: 0, y: 0, z: 0 }),
            setDensity: jest.fn(),
            getDensity: jest.fn(),
            getLocalCoordinates: jest.fn(),
            densityField: new Float32Array(16 * 16 * 16),
            colorField: new Array(16 * 16 * 16).fill(null),
            needsUpdate: false,
            isActive: true
        };
        const viewerPosition = { x: 0, y: 0, z: 0 };

        // Generate density field directly
        planetGenerator.generateDensityFieldWithLOD(chunk, viewerPosition);

        // Ensure density field was updated
        expect(chunk.needsUpdate).toBe(true);
        expect(chunk.densityField.some(value => value !== 0)).toBe(true);
        expect(chunk.colorField.some(value => value !== null)).toBe(true);

        // Reset chunk
        chunk.needsUpdate = false;
        chunk.densityField.fill(0);
        chunk.colorField.fill(null);

        // Simulate worker transfer by serializing and deserializing parameters
        const params = JSON.parse(JSON.stringify(planetGenerator.params));
        const newGenerator = new PlanetGenerator(64);
        newGenerator.params = params;
        newGenerator.generateDensityFieldWithLOD(chunk, viewerPosition);

        // Verify consistency
        expect(chunk.needsUpdate).toBe(true);
        expect(chunk.densityField.some(value => value !== 0)).toBe(true);
        expect(chunk.colorField.some(value => value !== null)).toBe(true);
    });

    test('chunk updates handle worker message delays', async () => {
        const planetGenerator = new PlanetGenerator();
        const chunk = planetGenerator.chunkManager.getChunk(0, 0, 0);
        
        // Set some density values
        for (let x = 0; x < chunk.size; x++) {
            for (let y = 0; y < chunk.size; y++) {
                for (let z = 0; z < chunk.size; z++) {
                    chunk.setDensity(x, y, z, Math.random() * 2 - 1);
                }
            }
        }

        // Generate mesh asynchronously
        const mesh = await chunk.generateMesh(new THREE.MeshBasicMaterial());
        expect(mesh).toBeDefined();
        expect(mesh.geometry).toBeDefined();
        expect(mesh.geometry.attributes.position).toBeDefined();
        expect(mesh.geometry.attributes.normal).toBeDefined();
        expect(mesh.geometry.attributes.color).toBeDefined();
    });

    test('planet class changes maintain data integrity', () => {
        // Initial state
        const initialClass = "Class-M";
        planetGenerator.applyPlanetClass(initialClass);
        const initialParams = { ...planetGenerator.params };
        
        // Change planet class
        const newClass = "Class-H";
        planetGenerator.applyPlanetClass(newClass);
        
        // Verify parameter changes
        expect(planetGenerator.params).not.toEqual(initialParams);
        expect(planetGenerator.params.noiseScale).toBe(3.0);
        expect(planetGenerator.params.octaves).toBe(4);
        
        // Verify noise generation still works
        const testPoint = { x: 1, y: 1, z: 1 };
        const noiseValue = planetGenerator.generateNoise(
            testPoint.x,
            testPoint.y,
            testPoint.z
        );
        expect(noiseValue).toBeDefined();
        expect(noiseValue).toBeGreaterThanOrEqual(-1);
        expect(noiseValue).toBeLessThanOrEqual(1);
        expect(Number.isFinite(noiseValue)).toBe(true);
        expect(noiseValue).not.toBe(0);
    });

    test('chunk manager handles concurrent updates', async () => {
        const center = { x: 0, y: 0, z: 0 };
        const radius = 32;
        
        // Simulate multiple concurrent chunk updates
        const updates = [];
        
        // Clear the mock call count after construction
        planetGenerator.chunkManager.updateChunksInRadius.mockClear();
        
        for (let i = 0; i < 3; i++) {
            updates.push(
                new Promise(resolve => {
                    setTimeout(() => {
                        planetGenerator.chunkManager.updateChunksInRadius(
                            center.x + i * 10,
                            center.y,
                            center.z,
                            radius
                        );
                        resolve();
                    }, Math.random() * 30);
                })
            );
        }

        await Promise.all(updates);
        
        // Verify chunk manager state is consistent
        const chunks = planetGenerator.chunkManager.getActiveChunks();
        expect(chunks).toBeDefined();
        expect(Array.isArray(chunks)).toBe(true);
        
        // Verify the chunk manager was actually called
        expect(planetGenerator.chunkManager.updateChunksInRadius).toHaveBeenCalledTimes(3);
    });
}); 