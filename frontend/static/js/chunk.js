console.log('Loading chunk.js...');

class Chunk {
    constructor(x, y, z, size = 16) {
        this.x = x;  // Chunk position in chunk coordinates
        this.y = y;
        this.z = z;
        this.size = size;
        this.densityField = new Float32Array(size * size * size);
        this.mesh = null;
        this.isDirty = true;  // Needs update
        this.isActive = false;  // Is within visible range
        this.isVisible = true; // Always visible for now
        this.lastUpdate = 0;    // Timestamp of last update
        this.priority = 0;      // Update priority
        this.memoryUsage = 0;   // Memory usage in bytes
        this.loadState = 'unloaded'; // 'unloaded', 'loading', 'loaded', 'error'
        this.loadPromise = null; // Promise for async loading
        this.geometry = null;    // THREE.js geometry
        this.material = null;    // THREE.js material
        this.lastLODLevel = -1;  // Last LOD level used
    }

    // Convert chunk coordinates to world coordinates
    getWorldPosition() {
        return {
            x: this.x * this.size,
            y: this.y * this.size,
            z: this.z * this.size
        };
    }

    // Get chunk center in world coordinates
    getCenter() {
        const pos = this.getWorldPosition();
        const halfSize = this.size / 2;
        return {
            x: pos.x + halfSize,
            y: pos.y + halfSize,
            z: pos.z + halfSize
        };
    }

    // Check if a world coordinate is within this chunk
    containsPoint(worldX, worldY, worldZ) {
        const startX = this.x * this.size;
        const startY = this.y * this.size;
        const startZ = this.z * this.size;
        
        return worldX >= startX && worldX < startX + this.size &&
               worldY >= startY && worldY < startY + this.size &&
               worldZ >= startZ && worldZ < startZ + this.size;
    }

    // Get local coordinates within chunk
    getLocalCoordinates(worldX, worldY, worldZ) {
        return {
            x: worldX - this.x * this.size,
            y: worldY - this.y * this.size,
            z: worldZ - this.z * this.size
        };
    }

    // Set density value at local coordinates
    setDensity(localX, localY, localZ, value) {
        const index = localX + localY * this.size + localZ * this.size * this.size;
        this.densityField[index] = value;
        this.isDirty = true;
    }

    // Get density value at local coordinates
    getDensity(localX, localY, localZ) {
        const index = localX + localY * this.size + localZ * this.size * this.size;
        return this.densityField[index];
    }

    // Generate mesh from density field
    generateMesh(material) {
        if (!this.isDirty && this.mesh) return this.mesh;

        // Create geometry if needed
        if (!this.geometry) {
            this.geometry = new THREE.BufferGeometry();
        }

        // Create material if needed
        if (!this.material) {
            this.material = material;
        }

        // Generate vertices and faces using marching cubes
        const vertices = [];
        const colors = [];
        const normals = [];

        // Simple marching cubes implementation
        for (let x = 0; x < this.size - 1; x++) {
            for (let y = 0; y < this.size - 1; y++) {
                for (let z = 0; z < this.size - 1; z++) {
                    const d000 = this.getDensity(x, y, z);
                    const d001 = this.getDensity(x, y, z + 1);
                    const d010 = this.getDensity(x, y + 1, z);
                    const d011 = this.getDensity(x, y + 1, z + 1);
                    const d100 = this.getDensity(x + 1, y, z);
                    const d101 = this.getDensity(x + 1, y, z + 1);
                    const d110 = this.getDensity(x + 1, y + 1, z);
                    const d111 = this.getDensity(x + 1, y + 1, z + 1);

                    // Only generate mesh for cells near the surface
                    if (Math.abs(d000) < 0.1 || Math.abs(d111) < 0.1) {
                        // Add vertex at cell center
                        const vx = x + 0.5;
                        const vy = y + 0.5;
                        const vz = z + 0.5;

                        // Calculate normal
                        const nx = (d100 - d000) + (d101 - d001) + (d110 - d010) + (d111 - d011);
                        const ny = (d010 - d000) + (d011 - d001) + (d110 - d100) + (d111 - d101);
                        const nz = (d001 - d000) + (d011 - d010) + (d101 - d100) + (d111 - d110);
                        const length = Math.sqrt(nx * nx + ny * ny + nz * nz);

                        // Add vertex and normal
                        vertices.push(vx, vy, vz);
                        normals.push(nx / length, ny / length, nz / length);

                        // Add color based on height
                        const height = (d000 + d001 + d010 + d011 + d100 + d101 + d110 + d111) / 8;
                        const color = new THREE.Color();
                        color.setHSL(0.6 + height * 0.1, 0.8, 0.5);
                        colors.push(color.r, color.g, color.b);
                    }
                }
            }
        }

        // Update geometry
        this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        this.geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        this.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

        // Create or update mesh
        if (!this.mesh) {
            this.mesh = new THREE.Mesh(this.geometry, this.material);
        }

        this.isDirty = false;
        this.lastUpdate = Date.now();
        return this.mesh;
    }

    // Update chunk visibility based on camera position
    updateVisibility(camera) {
        const center = this.getCenter();
        const distance = Math.sqrt(
            Math.pow(center.x - camera.position.x, 2) +
            Math.pow(center.y - camera.position.y, 2) +
            Math.pow(center.z - camera.position.z, 2)
        );

        // Simple visibility check - can be enhanced with frustum culling
        this.isVisible = distance < 1000; // Arbitrary visibility distance
    }

    // Calculate update priority based on distance and visibility
    calculatePriority(viewerPosition) {
        const center = this.getCenter();
        const distance = Math.sqrt(
            Math.pow(center.x - viewerPosition.x, 2) +
            Math.pow(center.y - viewerPosition.y, 2) +
            Math.pow(center.z - viewerPosition.z, 2)
        );
        
        // Higher priority for:
        // 1. Visible chunks
        // 2. Chunks closer to viewer
        // 3. Chunks that haven't been updated recently
        this.priority = (this.isVisible ? 1000 : 0) +
                       (1000 / (distance + 1)) +
                       (Date.now() - this.lastUpdate) / 1000;
    }

    // Optimize memory usage
    optimizeMemory() {
        // Calculate current memory usage
        this.memoryUsage = this.densityField.byteLength;
    }

    // Load chunk data asynchronously
    async load() {
        if (this.loadState === 'loaded' || this.loadState === 'loading') {
            return this.loadPromise;
        }

        this.loadState = 'loading';
        this.loadPromise = new Promise(async (resolve, reject) => {
            try {
                // For now, just mark as loaded
                this.loadState = 'loaded';
                resolve();
            } catch (error) {
                this.loadState = 'error';
                reject(error);
            }
        });

        return this.loadPromise;
    }

    // Unload chunk data to free memory
    unload() {
        if (this.loadState === 'unloaded') return;
        this.loadState = 'unloaded';
        this.loadPromise = null;
    }

    // Clean up resources
    dispose() {
        if (this.geometry) {
            this.geometry.dispose();
        }
        if (this.material) {
            this.material.dispose();
        }
        if (this.mesh) {
            this.mesh.geometry = null;
            this.mesh.material = null;
        }
        this.unload();
    }
}

// ChunkManager handles chunk creation, updates, and memory management
class ChunkManager {
    constructor(planetGenerator, chunkSize = 16) {
        this.planetGenerator = planetGenerator;
        this.chunkSize = chunkSize;
        this.chunks = new Map(); // Map of chunk coordinates to Chunk objects
        this.activeChunks = new Set(); // Set of active chunk keys
        this.scene = null;
        this.material = null;
        this.maxChunks = 1000; // Maximum number of chunks to keep in memory
        this.maxMemoryMB = 512; // Maximum memory usage in MB
        this.updateQueue = []; // Queue of chunks to update
        this.isUpdating = false; // Flag to prevent concurrent updates
        this.updateInterval = 100; // Minimum time between updates in ms
        this.lastUpdate = 0; // Timestamp of last update
    }

    setScene(scene) {
        this.scene = scene;
    }

    setMaterial(material) {
        this.material = material;
    }

    getChunk(chunkX, chunkY, chunkZ) {
        const key = `${chunkX},${chunkY},${chunkZ}`;
        if (!this.chunks.has(key)) {
            const chunk = new Chunk(chunkX, chunkY, chunkZ, this.chunkSize);
            this.chunks.set(key, chunk);
        }
        return this.chunks.get(key);
    }

    worldToChunkCoordinates(worldX, worldY, worldZ) {
        return {
            x: Math.floor(worldX / this.chunkSize),
            y: Math.floor(worldY / this.chunkSize),
            z: Math.floor(worldZ / this.chunkSize)
        };
    }

    getChunkAtWorldPosition(worldX, worldY, worldZ) {
        const coords = this.worldToChunkCoordinates(worldX, worldY, worldZ);
        return this.getChunk(coords.x, coords.y, coords.z);
    }

    async updateChunksInRadius(centerX, centerY, centerZ, radius) {
        if (this.isUpdating) return;
        this.isUpdating = true;

        try {
            const now = Date.now();
            if (now - this.lastUpdate < this.updateInterval) {
                return;
            }
            this.lastUpdate = now;

            // Calculate chunk radius
            const chunkRadius = Math.ceil(radius / this.chunkSize);
            const centerChunk = this.worldToChunkCoordinates(centerX, centerY, centerZ);

            // Update active chunks set
            this.activeChunks.clear();
            for (let x = -chunkRadius; x <= chunkRadius; x++) {
                for (let y = -chunkRadius; y <= chunkRadius; y++) {
                    for (let z = -chunkRadius; z <= chunkRadius; z++) {
                        const chunkX = centerChunk.x + x;
                        const chunkY = centerChunk.y + y;
                        const chunkZ = centerChunk.z + z;

                        // Check if chunk is within sphere radius
                        const dx = chunkX - centerChunk.x;
                        const dy = chunkY - centerChunk.y;
                        const dz = chunkZ - centerChunk.z;
                        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        
                        if (distance <= chunkRadius) {
                            const chunk = this.getChunk(chunkX, chunkY, chunkZ);
                            const key = `${chunkX},${chunkY},${chunkZ}`;
                            this.activeChunks.add(key);
                            
                            // Update chunk priority
                            chunk.calculatePriority({ x: centerX, y: centerY, z: centerZ });
                            
                            // Add to update queue if needed
                            if (chunk.isDirty) {
                                this.updateQueue.push(chunk);
                            }
                        }
                    }
                }
            }

            // Sort update queue by priority
            this.updateQueue.sort((a, b) => b.priority - a.priority);

            // Process updates
            const maxUpdatesPerFrame = 5;
            for (let i = 0; i < maxUpdatesPerFrame && this.updateQueue.length > 0; i++) {
                const chunk = this.updateQueue.shift();
                if (chunk.isDirty) {
                    await this.updateChunk(chunk);
                }
            }

            // Manage memory
            this.manageMemory();

        } finally {
            this.isUpdating = false;
        }
    }

    async updateChunk(chunk) {
        if (!chunk.isDirty) return;

        try {
            // Generate mesh
            const mesh = chunk.generateMesh(this.material);
            
            // Add to scene if not already added
            if (mesh && this.scene && !this.scene.children.includes(mesh)) {
                this.scene.add(mesh);
            }

            chunk.isDirty = false;
            chunk.lastUpdate = Date.now();
        } catch (error) {
            console.error('Error updating chunk:', error);
        }
    }

    manageMemory() {
        // Calculate total memory usage
        let totalMemory = 0;
        for (const chunk of this.chunks.values()) {
            chunk.optimizeMemory();
            totalMemory += chunk.memoryUsage;
        }

        // If memory usage is too high, unload least important chunks
        if (totalMemory > this.maxMemoryMB * 1024 * 1024 || this.chunks.size > this.maxChunks) {
            // Sort chunks by priority (lowest first)
            const sortedChunks = Array.from(this.chunks.entries())
                .sort(([, a], [, b]) => a.priority - b.priority);

            // Unload chunks until we're under the limit
            while ((totalMemory > this.maxMemoryMB * 1024 * 1024 || this.chunks.size > this.maxChunks) 
                   && sortedChunks.length > 0) {
                const [key, chunk] = sortedChunks.shift();
                
                // Don't unload active chunks
                if (this.activeChunks.has(key)) continue;

                // Remove from scene
                if (chunk.mesh && this.scene) {
                    this.scene.remove(chunk.mesh);
                }

                // Dispose of resources
                chunk.dispose();
                
                // Remove from maps
                this.chunks.delete(key);
                totalMemory -= chunk.memoryUsage;
            }
        }
    }

    dispose() {
        // Dispose of all chunks
        for (const chunk of this.chunks.values()) {
            chunk.dispose();
        }
        this.chunks.clear();
        this.activeChunks.clear();
        this.updateQueue = [];
    }
} 