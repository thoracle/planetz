import * as THREE from 'three';

// Message types
const MESSAGE_TYPES = {
    GENERATE_MESH: 'generateMesh',
    ERROR: 'error',
    SUCCESS: 'success',
    PROGRESS: 'progress'
};

export class Chunk {
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
        this.lodTransitionFactor = 0; // Factor for smooth LOD transitions
        this.targetLODLevel = -1; // Target LOD level for transitions
        this.worker = null;      // Web Worker for mesh generation
        this.isGeneratingMesh = false; // Flag to prevent concurrent mesh generation
        this.currentGenerationId = 0;
        this.errorCount = 0;      // Error count tracking
        this.meshGenerationProgress = 0; // Progress tracking
        this.verticesFound = 0;
        this.lastCameraDistance = Infinity; // Last known distance to camera
        this.consecutiveErrors = 0;
        this.lastSuccessfulGeneration = 0;
        this.nextRetryTime = 0;
        this.maxTimeout = 60000; // Maximum timeout in milliseconds
        this.baseTimeout = 30000; // Base timeout in milliseconds
        this.timeoutMultiplier = 1.0; // Multiplier for adaptive timeout
    }

    getBoundingBox() {
        const worldPos = this.getWorldPosition();
        const min = worldPos.clone();
        const max = worldPos.clone().addScalar(this.size);
        return new THREE.Box3(min, max);
    }

    // Convert chunk coordinates to world coordinates
    getWorldPosition() {
        return new THREE.Vector3(
            this.x * this.size,
            this.y * this.size,
            this.z * this.size
        );
    }

    // Get chunk center in world coordinates
    getCenter() {
        const pos = this.getWorldPosition();
        return new THREE.Vector3(
            pos.x + this.size / 2,
            pos.y + this.size / 2,
            pos.z + this.size / 2
        );
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
            x: Math.floor(worldX - this.x * this.size),
            y: Math.floor(worldY - this.y * this.size),
            z: Math.floor(worldZ - this.z * this.size)
        };
    }

    // Set density value at local coordinates
    setDensity(x, y, z, value) {
        this.densityField[x * this.size * this.size + y * this.size + z] = value;
        this.isDirty = true;
    }

    // Get density value at local coordinates
    getDensity(x, y, z) {
        return this.densityField[x * this.size * this.size + y * this.size + z];
    }

    // Generate mesh from density field
    async generateMesh(material, cameraPosition) {
        // Prevent concurrent generations
        if (this.isGeneratingMesh) {
            return null;
        }

        // Don't retry if in error state and cooldown hasn't expired
        if (this.loadState === 'error' && this.nextRetryTime && Date.now() < this.nextRetryTime) {
            return null;
        }

        this.isGeneratingMesh = true;
        const generationId = Date.now();
        this.currentGenerationId = generationId;

        // Clean up any existing worker
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }

        let timeoutId;
        let meshPromise;
        
        try {
            // Try development path first, then fallback to production path
            let workerPath = 'js/workers/meshGenerator.worker.js';
            console.log(`🔧 CHUNK DEBUG: Attempting to create worker with dev path: ${workerPath}`);
            
            try {
                this.worker = new Worker(workerPath);
                console.log(`✅ CHUNK DEBUG: Worker created successfully with dev path`);
            } catch (devError) {
                console.log(`⚠️ CHUNK DEBUG: Dev path failed, trying production path...`);
                workerPath = 'static/js/workers/meshGenerator.worker.js';
                try {
                    this.worker = new Worker(workerPath);
                    console.log(`✅ CHUNK DEBUG: Worker created successfully with production path`);
                } catch (prodError) {
                    console.error(`❌ CHUNK DEBUG: Both paths failed:`, {dev: devError.message, prod: prodError.message});
                    throw new Error(`Worker creation failed: ${prodError.message}`);
                }
            }
            
            // Calculate adaptive timeout based on chunk complexity
            const chunkComplexity = this.calculateChunkComplexity();
            const timeout = Math.min(
                this.maxTimeout || 60000,
                (this.baseTimeout || 30000) * Math.max(1, chunkComplexity * this.timeoutMultiplier)
            );

            // Promise for mesh generation with adaptive timeout
            meshPromise = new Promise((resolve, reject) => {
                // Set up timeout with adaptive duration
                timeoutId = setTimeout(() => {
                    if (this.worker) {
                        this.worker.terminate();
                        this.worker = null;
                    }
                    reject(new Error(`Mesh generation timed out after ${timeout/1000} seconds`));
                }, timeout);

                const messageHandler = (e) => {
                    if (generationId !== this.currentGenerationId) {
                        clearTimeout(timeoutId);
                        this.worker.terminate();
                        reject(new Error('Generation superseded'));
                        return;
                    }

                    if (!e.data || !e.data.type) {
                        clearTimeout(timeoutId);
                        reject(new Error('Invalid message format from worker'));
                        return;
                    }

                    switch (e.data.type) {
                        case MESSAGE_TYPES.ERROR:
                            clearTimeout(timeoutId);
                            reject(new Error(e.data.errorMessage || 'Unknown worker error'));
                            return;

                        case MESSAGE_TYPES.PROGRESS:
                            if (e.data.data) {
                                this.meshGenerationProgress = e.data.data.progress || 0;
                                this.verticesFound = e.data.data.verticesFound || 0;
                                
                                // Extend timeout if making good progress
                                if (this.meshGenerationProgress > 0.5 && timeoutId) {
                                    clearTimeout(timeoutId);
                                    timeoutId = setTimeout(() => {
                                        if (this.worker) {
                                            this.worker.terminate();
                                            this.worker = null;
                                        }
                                        reject(new Error(`Mesh generation timed out after extended period`));
                                    }, timeout * 0.5); // Add 50% more time if we're over halfway
                                }
                            }
                            return;

                        case MESSAGE_TYPES.SUCCESS:
                            clearTimeout(timeoutId);
                            if (!e.data.data) {
                                reject(new Error('Missing mesh data in success message'));
                                return;
                            }
                            resolve(e.data.data);
                            return;

                        default:
                            clearTimeout(timeoutId);
                            reject(new Error(`Unknown message type: ${e.data.type}`));
                            return;
                    }
                };

                const errorHandler = (error) => {
                    clearTimeout(timeoutId);
                    reject(new Error(`Worker error: ${error.message || String(error)}`));
                };

                this.worker.onmessage = messageHandler;
                this.worker.onerror = errorHandler;

                // Send initial data to worker with complexity hint
                try {
                    const center = this.getCenter();
                    const distance = Math.sqrt(
                        Math.pow(center.x - cameraPosition.x, 2) +
                        Math.pow(center.y - cameraPosition.y, 2) +
                        Math.pow(center.z - cameraPosition.z, 2)
                    );

                    const toCamera = new THREE.Vector3().subVectors(cameraPosition, center).normalize();
                    const viewAngle = Math.abs(toCamera.dot(new THREE.Vector3(0, 1, 0)));

                    // Ensure density field exists and is valid
                    if (!this.densityField || this.densityField.length !== this.size * this.size * this.size) {
                        this.densityField = new Float32Array(this.size * this.size * this.size);
                        // Initialize with default terrain
                        for (let x = 0; x < this.size; x++) {
                            for (let y = 0; y < this.size; y++) {
                                for (let z = 0; z < this.size; z++) {
                                    const worldY = y + this.y * this.size;
                                    this.densityField[x * this.size * this.size + y * this.size + z] = worldY < 0 ? 1 : -1;
                                }
                            }
                        }
                    }

                    this.worker.postMessage({
                        type: MESSAGE_TYPES.GENERATE_MESH,
                        data: {
                            densityField: this.densityField,
                            size: this.size,
                            distance: distance,
                            viewAngle: viewAngle,
                            complexity: chunkComplexity
                        }
                    }, [this.densityField.buffer]);

                    // Create a new density field since we transferred the buffer
                    this.densityField = new Float32Array(this.size * this.size * this.size);
                } catch (error) {
                    clearTimeout(timeoutId);
                    reject(new Error(`Failed to send data to worker: ${error.message}`));
                }
            });

            // Wait for mesh generation
            const meshData = await meshPromise;

            // Additional validation after successful generation
            if (!meshData || !meshData.vertices || !meshData.normals || !meshData.colors) {
                throw new Error('Incomplete mesh data received');
            }

            if (meshData.vertices.length === 0) {
                // Empty mesh is valid for chunks with no visible surface
                const geometry = new THREE.BufferGeometry();
                if (this.mesh) {
                    this.mesh.geometry.dispose();
                }
                this.mesh = new THREE.Mesh(geometry, material);
                this.mesh.visible = false;
                this.loadState = 'loaded';
                return this.mesh;
            }

            // Create geometry with error handling
            try {
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(meshData.vertices, 3));
                geometry.setAttribute('normal', new THREE.Float32BufferAttribute(meshData.normals, 3));
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(meshData.colors, 3));

                // Store LOD level and vertex count
                this.lastLODLevel = meshData.lodLevel;
                this.vertexCount = meshData.vertexCount;

                // Clean up old mesh before creating new one
                if (this.mesh) {
                    this.mesh.geometry.dispose();
                }

                this.mesh = new THREE.Mesh(geometry, material);
                this.mesh.position.copy(this.getWorldPosition());
                this.mesh.visible = false;
                this.mesh.frustumCulled = true;

                // Reset error tracking on success
                this.errorCount = 0;
                this.consecutiveErrors = 0;
                this.lastSuccessfulGeneration = Date.now();
                this.loadState = 'loaded';

                return this.mesh;
            } catch (error) {
                throw new Error(`Failed to create mesh geometry: ${error.message}`);
            }

        } catch (error) {
            // Enhanced error handling with progressive backoff
            this.errorCount = (this.errorCount || 0) + 1;
            this.consecutiveErrors = (this.consecutiveErrors || 0) + 1;
            
            const errorMessage = `Chunk (${this.x}, ${this.y}, ${this.z}) - ${error.message}`;
            if (this.errorCount >= 3) {
                console.error(`${errorMessage} - Marking chunk as failed after ${this.errorCount} attempts`);
                this.loadState = 'error';
                // Exponential backoff with max of 5 minutes
                const backoffTime = Math.min(1000 * Math.pow(2, this.errorCount), 300000);
                this.nextRetryTime = Date.now() + backoffTime;
            } else {
                console.warn(`${errorMessage} - Attempt ${this.errorCount}`);
                // Shorter backoff for initial retries
                const backoffTime = Math.min(1000 * Math.pow(2, this.errorCount - 1), 30000);
                this.nextRetryTime = Date.now() + backoffTime;
                this.isDirty = true;
            }
            
            return null;
        } finally {
            // Cleanup
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            if (this.worker) {
                this.worker.terminate();
                this.worker = null;
            }
            this.isGeneratingMesh = false;
            this.meshGenerationProgress = 0;
            this.verticesFound = 0;
            
            // Reset generation ID if it matches current
            if (this.currentGenerationId === generationId) {
                this.currentGenerationId = null;
            }
        }
    }

    // Helper method to calculate chunk complexity
    calculateChunkComplexity() {
        if (!this.densityField) return 1.0;
        
        let surfaceCount = 0;
        let totalSamples = 0;
        const sampleStep = 2; // Sample every other point to save time
        
        for (let x = 0; x < this.size; x += sampleStep) {
            for (let y = 0; y < this.size; y += sampleStep) {
                for (let z = 0; z < this.size; z += sampleStep) {
                    const idx = x * this.size * this.size + y * this.size + z;
                    const density = this.densityField[idx];
                    
                    // Check neighbors for sign changes (surface indication)
                    if (x > 0) {
                        const prevX = this.densityField[(x-sampleStep) * this.size * this.size + y * this.size + z];
                        if (Math.sign(density) !== Math.sign(prevX)) surfaceCount++;
                    }
                    if (y > 0) {
                        const prevY = this.densityField[x * this.size * this.size + (y-sampleStep) * this.size + z];
                        if (Math.sign(density) !== Math.sign(prevY)) surfaceCount++;
                    }
                    if (z > 0) {
                        const prevZ = this.densityField[x * this.size * this.size + y * this.size + (z-sampleStep)];
                        if (Math.sign(density) !== Math.sign(prevZ)) surfaceCount++;
                    }
                    
                    totalSamples++;
                }
            }
        }
        
        // Return complexity factor (1.0 - 2.0)
        return 1.0 + Math.min(1.0, surfaceCount / (totalSamples * 0.5));
    }

    // Update chunk visibility based on camera position with LOD consideration
    updateVisibility(camera) {
        const center = this.getCenter();
        const distance = Math.sqrt(
            Math.pow(center.x - camera.position.x, 2) +
            Math.pow(center.y - camera.position.y, 2) +
            Math.pow(center.z - camera.position.z, 2)
        );

        // Update last known camera distance
        this.lastCameraDistance = distance;

        // Enhanced visibility check with LOD consideration
        const visibilityThreshold = 1000 * (1 + this.lastLODLevel * 0.5);
        this.isVisible = distance < visibilityThreshold;

        // Mark chunk as dirty if LOD needs to change significantly
        if (this.mesh && Math.abs(this.targetLODLevel - this.lastLODLevel) > 0.5) {
            this.isDirty = true;
        }
    }

    // Calculate update priority based on distance and visibility with LOD consideration
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
        // 3. Chunks that need LOD updates
        // 4. Chunks that haven't been updated recently
        const lodUpdateNeeded = Math.abs(this.targetLODLevel - this.lastLODLevel) > 0.5;
        this.priority = (this.isVisible ? 1000 : 0) +
                       (1000 / (distance + 1)) +
                       (lodUpdateNeeded ? 500 : 0) +
                       (Date.now() - this.lastUpdate) / 1000;
    }

    // Optimize memory usage
    optimizeMemory() {
        // Calculate current memory usage
        let totalMemoryUsage = 0;

        // Account for density field
        if (this.densityField) {
            totalMemoryUsage += this.densityField.byteLength;
        }

        // Account for geometry buffers
        if (this.mesh && this.mesh.geometry) {
            const geometry = this.mesh.geometry;
            for (const key in geometry.attributes) {
                const attribute = geometry.attributes[key];
                if (attribute.array) {
                    totalMemoryUsage += attribute.array.byteLength;
                }
            }
        }

        // If chunk is not visible and memory usage is high, clean up heavy resources
        if (!this.isVisible && totalMemoryUsage > 1024 * 1024) { // More than 1MB
            if (this.mesh && !this.mesh.visible) {
                // Keep the mesh but dispose of heavy geometry data
                if (this.mesh.geometry) {
                    this.mesh.geometry.dispose();
                    this.mesh.geometry = null;
                }
            }
            
            // Clear density field if not needed
            if (!this.isActive && this.densityField) {
                this.densityField = null;
            }
        }

        this.memoryUsage = totalMemoryUsage;
        return totalMemoryUsage;
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
        if (this.mesh) {
            this.mesh.geometry.dispose();
            this.mesh = null;
        }
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.isGeneratingMesh = false;
        this.unload();
    }
} 