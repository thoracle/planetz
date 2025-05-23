import { Chunk } from './chunk.js';
import * as THREE from 'three';

class ChunkManager {
    constructor(planetGenerator, chunkSize) {
        this.planetGenerator = planetGenerator;
        this.chunkSize = chunkSize;
        this.chunks = new Map();
        this.activeChunks = new Set();
        this.lastUpdatePosition = null;
        this.lastUpdateRadius = null;
        this.updateThreshold = 1.0; // Minimum distance to trigger a new update
        this.isInitialized = false; // Track if we've done the first update
        this.scene = null;
        this.material = null;
        
        // Memory management parameters
        this.maxChunks = 1000; // Maximum number of chunks to keep in memory
        this.memoryLimit = 1024 * 1024 * 512; // 512MB limit
        this.lastMemoryCheck = 0;
        this.memoryCheckInterval = 5000; // Check every 5 seconds

        // Mesh generation throttling - adjusted values
        this.concurrentGenerations = 0;
        this.maxConcurrentGenerations = 2; // Reduced from 4 to 2
        this.generationQueue = [];
        this.lastGenerationError = 0;
        this.baseErrorCooldown = 2000; // Increased from 1000 to 2000
        this.maxErrorCooldown = 60000; // Increased from 30000 to 60000
        this.currentErrorCooldown = this.baseErrorCooldown;
        this.errorTimeWindow = 120000; // Increased from 60000 to 120000
        this.errorHistory = [];
        this.maxErrorRate = 5; // Reduced from 10 to 5
        this.circuitBreakerTripped = false;
        this.circuitBreakerResetTimeout = null;
        
        // Enhanced queue management
        this.generationQueue = [];
        this.queueProcessingInterval = null;
        this.lastSuccessfulGeneration = Date.now();
        
        // Adaptive timeout handling
        this.baseTimeout = 30000; // Base timeout of 30 seconds
        this.maxTimeout = 60000; // Maximum timeout of 60 seconds
        this.timeoutMultiplier = 1.0; // Dynamically adjusted based on success/failure
    }

    setScene(scene) {
        this.scene = scene;
    }

    setMaterial(material) {
        this.material = material;
    }

    updateChunksInRadius(x, y, z, radius) {
        // Always do the first update
        if (!this.isInitialized) {
            this.isInitialized = true;
        } else {
            // Check if we need to update based on position change
            if (this.lastUpdatePosition && this.lastUpdateRadius) {
                const dx = x - this.lastUpdatePosition.x;
                const dy = y - this.lastUpdatePosition.y;
                const dz = z - this.lastUpdatePosition.z;
                const distanceSquared = dx * dx + dy * dy + dz * dz;
                const radiusDiff = Math.abs(radius - this.lastUpdateRadius);
                
                // Skip update if position and radius haven't changed significantly
                if (distanceSquared < this.updateThreshold * this.updateThreshold && radiusDiff < this.updateThreshold) {
                    return;
                }
            }
        }

        // Store current update parameters
        this.lastUpdatePosition = { x, y, z };
        this.lastUpdateRadius = radius;

        // Calculate chunk bounds
        const chunkRadius = Math.ceil(radius / this.chunkSize);
        const newActiveChunks = new Set();

        // Iterate through potential chunks
        for (let cx = -chunkRadius; cx <= chunkRadius; cx++) {
            for (let cy = -chunkRadius; cy <= chunkRadius; cy++) {
                for (let cz = -chunkRadius; cz <= chunkRadius; cz++) {
                    // Calculate chunk center
                    const chunkX = cx * this.chunkSize;
                    const chunkY = cy * this.chunkSize;
                    const chunkZ = cz * this.chunkSize;

                    // Check if chunk is within sphere
                    const dx = chunkX - x;
                    const dy = chunkY - y;
                    const dz = chunkZ - z;
                    const distanceSquared = dx * dx + dy * dy + dz * dz;

                    if (distanceSquared <= radius * radius) {
                        const key = `${cx},${cy},${cz}`;
                        newActiveChunks.add(key);

                        // Create chunk if it doesn't exist
                        if (!this.chunks.has(key)) {
                            this.chunks.set(key, new Chunk(cx, cy, cz, this.chunkSize));
                        }
                    }
                }
            }
        }

        // Deactivate chunks that are no longer in range
        for (const key of this.activeChunks) {
            if (!newActiveChunks.has(key)) {
                const chunk = this.chunks.get(key);
                if (chunk) {
                    chunk.isActive = false;
                }
            }
        }

        // Update active chunks set
        this.activeChunks = newActiveChunks;
    }

    getChunkAtWorldPosition(x, y, z) {
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkY = Math.floor(y / this.chunkSize);
        const chunkZ = Math.floor(z / this.chunkSize);
        const key = `${chunkX},${chunkY},${chunkZ}`;
        return this.chunks.get(key);
    }

    getActiveChunks() {
        return Array.from(this.activeChunks).map(key => this.chunks.get(key));
    }

    updateSceneRepresentation(camera) {
        if (!this.scene || !this.isInitialized) return;

        // Check memory usage periodically
        const now = Date.now();
        if (now - this.lastMemoryCheck > this.memoryCheckInterval) {
            this.optimizeMemoryUsage(camera);
            this.lastMemoryCheck = now;
        }

        // Check circuit breaker state
        if (this.circuitBreakerTripped) {
            if (now - this.lastGenerationError > this.currentErrorCooldown) {
                this.resetCircuitBreaker();
            } else {
                return; // Skip generation while circuit breaker is tripped
            }
        }

        // Clean up old error history
        this.errorHistory = this.errorHistory.filter(
            time => now - time < this.errorTimeWindow
        );

        const frustum = new THREE.Frustum();
        const projScreenMatrix = new THREE.Matrix4();
        projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        frustum.setFromProjectionMatrix(projScreenMatrix);

        // Process generation queue with priority
        this.processGenerationQueue(camera, frustum);

        // Handle active chunks
        for (const key of this.activeChunks) {
            const chunk = this.chunks.get(key);
            if (!chunk) continue;

            if (chunk.mesh) {
                if (!chunk.mesh.parent) {
                    this.scene.add(chunk.mesh);
                }
                chunk.mesh.visible = frustum.intersectsBox(chunk.getBoundingBox());
            } else if (chunk.isDirty && !chunk.isGeneratingMesh) {
                this.queueChunkGeneration(chunk, camera, frustum);
            }
        }

        // Handle inactive chunks
        this.chunks.forEach((chunk, chunkKey) => {
            if (chunk.mesh && chunk.mesh.parent) {
                const isActive = this.activeChunks.has(chunkKey);
                if (!isActive) {
                    chunk.mesh.visible = false;
                    if (!frustum.intersectsBox(chunk.getBoundingBox())) {
                        this.scene.remove(chunk.mesh);
                        chunk.dispose();
                    }
                }
            }
        });
    }

    queueChunkGeneration(chunk, camera, frustum) {
        // Skip if chunk has too many errors
        if (chunk.errorCount >= 3 || chunk.loadState === 'error') {
            chunk.loadState = 'error';
            return;
        }

        // Respect retry timing
        if (chunk.nextRetryTime && Date.now() < chunk.nextRetryTime) {
            return;
        }

        // Calculate priority based on distance and visibility
        const chunkCenter = chunk.getCenter();
        const distanceToCamera = chunkCenter.distanceTo(camera.position);
        const isVisible = frustum.intersectsBox(chunk.getBoundingBox());
        
        const priority = this.calculatePriority(distanceToCamera, isVisible, chunk.errorCount);

        // Add to queue if not already queued
        const queueItem = {
            chunk,
            priority,
            timestamp: Date.now()
        };

        const existingIndex = this.generationQueue.findIndex(item => item.chunk === chunk);
        if (existingIndex === -1) {
            this.generationQueue.push(queueItem);
            this.sortGenerationQueue();
        }
    }

    calculatePriority(distance, isVisible, errorCount) {
        let priority = 1000 / (distance + 1); // Base priority on distance
        if (isVisible) priority *= 2; // Double priority if visible
        priority *= Math.pow(0.7, errorCount); // Reduce priority more aggressively for chunks with errors
        return priority;
    }

    sortGenerationQueue() {
        this.generationQueue.sort((a, b) => b.priority - a.priority);
    }

    processGenerationQueue(camera, frustum) {
        const now = Date.now();

        // Clean up and update queue
        this.generationQueue = this.generationQueue.filter(item => {
            const chunk = item.chunk;
            // Remove items that shouldn't be in queue
            if (chunk.errorCount >= 3 || chunk.loadState === 'error' || 
                (chunk.nextRetryTime && now < chunk.nextRetryTime)) {
                return false;
            }
            return true;
        });

        // Update priorities periodically
        if (now - this.lastQueueSort > 1000) {
            this.generationQueue.forEach(item => {
                const chunkCenter = item.chunk.getCenter();
                const distanceToCamera = chunkCenter.distanceTo(camera.position);
                const isVisible = frustum.intersectsBox(item.chunk.getBoundingBox());
                item.priority = this.calculatePriority(distanceToCamera, isVisible, item.chunk.errorCount);
            });
            this.sortGenerationQueue();
            this.lastQueueSort = now;
        }

        // Process queue with rate limiting
        while (this.generationQueue.length > 0 && 
               this.concurrentGenerations < this.maxConcurrentGenerations &&
               !this.circuitBreakerTripped) {
            const item = this.generationQueue.shift();
            
            // Double check conditions before generation
            if (item.chunk.errorCount >= 3 || item.chunk.loadState === 'error' ||
                (item.chunk.nextRetryTime && now < item.chunk.nextRetryTime)) {
                continue;
            }
            
            this.generateChunkMesh(item.chunk, camera);
        }
    }

    async generateChunkMesh(chunk, camera) {
        this.concurrentGenerations++;
        try {
            const mesh = await chunk.generateMesh(this.material, camera.position);
            if (mesh) {
                this.handleSuccessfulGeneration();
            }
        } catch (error) {
            console.error(`Error generating mesh for chunk:`, error);
            this.handleGenerationError(chunk);
        } finally {
            this.concurrentGenerations--;
        }
    }

    handleSuccessfulGeneration() {
        // Reset error tracking on success
        this.consecutiveErrors = 0;
        this.currentErrorCooldown = this.baseErrorCooldown;
        this.lastSuccessfulGeneration = Date.now();
    }

    handleGenerationError(chunk) {
        const now = Date.now();
        this.lastGenerationError = now;
        this.errorHistory.push(now);
        this.consecutiveErrors++;
        chunk.errorCount = (chunk.errorCount || 0) + 1;

        // Implement exponential backoff
        this.currentErrorCooldown = Math.min(
            this.currentErrorCooldown * 2,
            this.maxErrorCooldown
        );

        // Check if we need to trip the circuit breaker
        if (this.errorHistory.length >= this.maxErrorRate) {
            this.tripCircuitBreaker();
        }
    }

    tripCircuitBreaker() {
        if (!this.circuitBreakerTripped) {
            console.warn('Circuit breaker tripped due to high error rate');
            this.circuitBreakerTripped = true;
            
            // Clear existing reset timeout if any
            if (this.circuitBreakerResetTimeout) {
                clearTimeout(this.circuitBreakerResetTimeout);
            }

            // Schedule circuit breaker reset
            this.circuitBreakerResetTimeout = setTimeout(() => {
                this.resetCircuitBreaker();
            }, this.currentErrorCooldown);

            // Clear generation queue
            this.generationQueue = [];
        }
    }

    resetCircuitBreaker() {
        if (this.circuitBreakerTripped) {
            console.log('Resetting circuit breaker');
            this.circuitBreakerTripped = false;
            this.consecutiveErrors = 0;
            this.currentErrorCooldown = this.baseErrorCooldown;
            this.errorHistory = [];
            this.circuitBreakerResetTimeout = null;
        }
    }

    // Optimize memory usage across all chunks
    optimizeMemoryUsage(camera) {
        let totalMemoryUsage = 0;
        const chunkDistances = new Map();

        // Calculate distances and total memory usage
        this.chunks.forEach((chunk, key) => {
            const memory = chunk.optimizeMemory();
            totalMemoryUsage += memory;

            // Calculate distance to camera
            const chunkCenter = chunk.getCenter();
            const distance = Math.sqrt(
                Math.pow(chunkCenter.x - camera.position.x, 2) +
                Math.pow(chunkCenter.y - camera.position.y, 2) +
                Math.pow(chunkCenter.z - camera.position.z, 2)
            );
            chunkDistances.set(key, distance);
        });

        // If we're over the memory limit or have too many chunks, clean up
        if (totalMemoryUsage > this.memoryLimit || this.chunks.size > this.maxChunks) {
            // Sort chunks by distance and activity
            const sortedChunks = Array.from(this.chunks.entries())
                .sort(([keyA, chunkA], [keyB, chunkB]) => {
                    // Prioritize keeping active and visible chunks
                    if (chunkA.isActive !== chunkB.isActive) {
                        return chunkA.isActive ? -1 : 1;
                    }
                    if (chunkA.isVisible !== chunkB.isVisible) {
                        return chunkA.isVisible ? -1 : 1;
                    }
                    // Sort by distance
                    return chunkDistances.get(keyA) - chunkDistances.get(keyB);
                });

            // Remove chunks until we're under the limits
            while ((totalMemoryUsage > this.memoryLimit || this.chunks.size > this.maxChunks) 
                   && sortedChunks.length > 0) {
                const [key, chunk] = sortedChunks.pop();
                if (!chunk.isActive && !chunk.isVisible) {
                    // Remove the chunk completely
                    chunk.dispose();
                    this.chunks.delete(key);
                    totalMemoryUsage -= chunk.memoryUsage;
                } else if (!chunk.isVisible) {
                    // Just clean up its resources
                    chunk.optimizeMemory();
                    totalMemoryUsage = Math.max(0, totalMemoryUsage - chunk.memoryUsage);
                }
            }
        }

        return totalMemoryUsage;
    }

    dispose() {
        this.chunks.clear();
        this.activeChunks.clear();
        this.lastUpdatePosition = null;
        this.lastUpdateRadius = null;
        this.isInitialized = false;
    }
}

export default ChunkManager; 