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
        this.chunks = new Map(); // Map of "x,y,z" -> Chunk
        this.activeChunks = new Set();
        this.visibleChunks = new Set();
        this.maxChunks = 1000; // Maximum number of chunks to keep in memory
        this.maxMemory = 256 * 1024 * 1024; // 256MB memory limit
        this.currentMemory = 0;
        this.loadingChunks = new Set(); // Chunks currently being loaded
        this.maxConcurrentLoads = 4; // Maximum number of concurrent chunk loads
        this.loadQueue = []; // Queue of chunks waiting to be loaded
        this.scene = null; // THREE.js scene
        this.material = null; // Shared material for all chunks
    }

    // Set the THREE.js scene
    setScene(scene) {
        this.scene = scene;
    }

    // Set the shared material
    setMaterial(material) {
        this.material = material;
    }

    // Get or create chunk at chunk coordinates
    getChunk(chunkX, chunkY, chunkZ) {
        const key = `${chunkX},${chunkY},${chunkZ}`;
        if (!this.chunks.has(key)) {
            this.chunks.set(key, new Chunk(chunkX, chunkY, chunkZ, this.chunkSize));
        }
        return this.chunks.get(key);
    }

    // Convert world coordinates to chunk coordinates
    worldToChunkCoordinates(worldX, worldY, worldZ) {
        return {
            x: Math.floor(worldX / this.chunkSize),
            y: Math.floor(worldY / this.chunkSize),
            z: Math.floor(worldZ / this.chunkSize)
        };
    }

    // Get chunk containing world coordinates
    getChunkAtWorldPosition(worldX, worldY, worldZ) {
        const { x, y, z } = this.worldToChunkCoordinates(worldX, worldY, worldZ);
        return this.getChunk(x, y, z);
    }

    // Update chunks within radius of center point
    async updateChunksInRadius(centerX, centerY, centerZ, radius) {
        // Convert to chunk coordinates
        const centerChunk = this.worldToChunkCoordinates(centerX, centerY, centerZ);
        const chunkRadius = Math.ceil(radius / this.chunkSize);
        
        // Track new active chunks
        const newActiveChunks = new Set();
        const newVisibleChunks = new Set();
        
        // Update chunks within radius
        for (let x = -chunkRadius; x <= chunkRadius; x++) {
            for (let y = -chunkRadius; y <= chunkRadius; y++) {
                for (let z = -chunkRadius; z <= chunkRadius; z++) {
                    const chunkX = centerChunk.x + x;
                    const chunkY = centerChunk.y + y;
                    const chunkZ = centerChunk.z + z;
                    
                    // Check if chunk is within sphere radius
                    const distSq = x * x + y * y + z * z;
                    if (distSq <= chunkRadius * chunkRadius) {
                        const chunk = this.getChunk(chunkX, chunkY, chunkZ);
                        const key = `${chunkX},${chunkY},${chunkZ}`;
                        
                        // Update chunk state
                        chunk.isActive = true;
                        newActiveChunks.add(key);
                        
                        // Generate mesh if needed
                        if (chunk.isDirty && this.material) {
                            const mesh = chunk.generateMesh(this.material);
                            if (mesh && this.scene) {
                                if (!this.scene.children.includes(mesh)) {
                                    this.scene.add(mesh);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Update active chunks set
        this.activeChunks = newActiveChunks;
        
        // Manage memory
        this.manageMemory();
    }

    // Get chunks that need updating
    getChunksToUpdate() {
        const chunks = [];
        for (const key of this.activeChunks) {
            const chunk = this.chunks.get(key);
            if (chunk && chunk.isDirty) {
                chunks.push(chunk);
            }
        }
        return chunks;
    }

    // Manage memory usage
    manageMemory() {
        // Calculate current memory usage
        this.currentMemory = 0;
        for (const chunk of this.chunks.values()) {
            chunk.optimizeMemory();
            this.currentMemory += chunk.memoryUsage;
        }

        // If we're over the memory limit, unload chunks
        if (this.currentMemory > this.maxMemory) {
            const chunks = Array.from(this.chunks.values());
            chunks.sort((a, b) => b.priority - a.priority);

            while (this.currentMemory > this.maxMemory && chunks.length > 0) {
                const chunk = chunks.pop();
                if (!this.activeChunks.has(`${chunk.x},${chunk.y},${chunk.z}`)) {
                    chunk.dispose();
                    this.chunks.delete(`${chunk.x},${chunk.y},${chunk.z}`);
                    this.currentMemory -= chunk.memoryUsage;
                }
            }
        }
    }

    // Clean up resources
    dispose() {
        for (const chunk of this.chunks.values()) {
            chunk.dispose();
        }
        this.chunks.clear();
        this.activeChunks.clear();
        this.visibleChunks.clear();
        this.loadingChunks.clear();
        this.loadQueue = [];
    }
} 