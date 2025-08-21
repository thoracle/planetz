/**
 * SpatialManager - Simple Three.js-based spatial tracking system
 * Replaces Ammo.js physics world for object tracking and spatial queries
 * Optimized for maximum performance with simple bounding volumes
 */

export class SpatialManager {
    constructor() {
        this.trackedObjects = new Map(); // Three.js Object3D -> metadata
        this.objectsByType = new Map(); // type -> Set of objects
        this.boundingBoxes = new Map(); // object -> THREE.Box3
        this.boundingSpheres = new Map(); // object -> THREE.Sphere
        
        // Performance optimization
        this.updateQueue = [];
        this.maxUpdatesPerFrame = 50;
        this.lastUpdateTime = 0;
        
        console.log('🌌 SpatialManager initialized - Three.js spatial tracking');
    }

    /**
     * Add an object to spatial tracking
     * @param {THREE.Object3D} object - Three.js object to track
     * @param {Object} metadata - Object metadata (type, faction, etc.)
     */
    addObject(object, metadata = {}) {
        if (!object || !object.position) {
            console.warn('SpatialManager: Invalid object for tracking');
            return false;
        }

        // Store metadata
        this.trackedObjects.set(object, {
            type: metadata.type || 'unknown',
            faction: metadata.faction || 'neutral',
            canCollide: metadata.canCollide !== false,
            isTargetable: metadata.isTargetable !== false,
            radius: metadata.radius || this.calculateRadius(object),
            ...metadata
        });

        // Group by type for efficient queries
        const type = metadata.type || 'unknown';
        if (!this.objectsByType.has(type)) {
            this.objectsByType.set(type, new Set());
        }
        this.objectsByType.get(type).add(object);

        // Create bounding volumes
        this.updateBoundingVolumes(object);

        return true;
    }

    /**
     * Remove an object from spatial tracking
     * @param {THREE.Object3D} object - Object to remove
     */
    removeObject(object) {
        const metadata = this.trackedObjects.get(object);
        if (metadata) {
            // Remove from type grouping
            const typeSet = this.objectsByType.get(metadata.type);
            if (typeSet) {
                typeSet.delete(object);
                if (typeSet.size === 0) {
                    this.objectsByType.delete(metadata.type);
                }
            }
        }

        // Clean up all references
        this.trackedObjects.delete(object);
        this.boundingBoxes.delete(object);
        this.boundingSpheres.delete(object);
    }

    /**
     * Update bounding volumes for an object
     * @param {THREE.Object3D} object - Object to update
     */
    updateBoundingVolumes(object) {
        const metadata = this.trackedObjects.get(object);
        if (!metadata) return;

        // Simple sphere bounding volume (most performant)
        const sphere = new THREE.Sphere(object.position.clone(), metadata.radius);
        this.boundingSpheres.set(object, sphere);

        // Optional box bounding volume for more precise collision
        if (metadata.useBoundingBox) {
            const box = new THREE.Box3();
            if (object.geometry) {
                box.setFromObject(object);
            } else {
                // Fallback: create box from sphere
                const size = metadata.radius;
                box.setFromCenterAndSize(object.position, new THREE.Vector3(size * 2, size * 2, size * 2));
            }
            this.boundingBoxes.set(object, box);
        }
    }

    /**
     * Calculate approximate radius for an object
     * @param {THREE.Object3D} object - Object to measure
     * @returns {number} Radius in game units
     */
    calculateRadius(object) {
        if (object.geometry) {
            object.geometry.computeBoundingSphere();
            return object.geometry.boundingSphere?.radius || 1.0;
        }
        
        // Fallback based on object type or scale
        if (object.scale) {
            return Math.max(object.scale.x, object.scale.y, object.scale.z);
        }
        
        return 1.0; // Default radius
    }

    /**
     * Query objects within radius of a position
     * @param {THREE.Vector3} position - Center position
     * @param {number} radius - Search radius
     * @param {string} type - Optional type filter
     * @returns {Array} Array of {object, distance, metadata}
     */
    queryNearby(position, radius, type = null) {
        const results = [];
        const searchObjects = type ? 
            (this.objectsByType.get(type) || new Set()) : 
            this.trackedObjects.keys();

        for (const object of searchObjects) {
            const distance = position.distanceTo(object.position);
            if (distance <= radius) {
                results.push({
                    object,
                    distance,
                    metadata: this.trackedObjects.get(object)
                });
            }
        }

        // Sort by distance (closest first)
        results.sort((a, b) => a.distance - b.distance);
        return results;
    }

    /**
     * Query objects by type
     * @param {string} type - Object type to find
     * @returns {Array} Array of objects
     */
    queryByType(type) {
        const typeSet = this.objectsByType.get(type);
        return typeSet ? [...typeSet] : [];
    }

    /**
     * Check if two objects are colliding (sphere-sphere collision)
     * @param {THREE.Object3D} obj1 - First object
     * @param {THREE.Object3D} obj2 - Second object
     * @returns {boolean} True if colliding
     */
    checkCollision(obj1, obj2) {
        const sphere1 = this.boundingSpheres.get(obj1);
        const sphere2 = this.boundingSpheres.get(obj2);
        
        if (!sphere1 || !sphere2) return false;
        
        const distance = sphere1.center.distanceTo(sphere2.center);
        return distance <= (sphere1.radius + sphere2.radius);
    }

    /**
     * Get all collidable objects (for raycast intersection)
     * @returns {Array} Array of Three.js objects that can be hit
     */
    getCollidableObjects() {
        const collidable = [];
        for (const [object, metadata] of this.trackedObjects) {
            if (metadata.canCollide) {
                collidable.push(object);
            }
        }
        return collidable;
    }

    /**
     * Get all targetable objects (for target computer)
     * @returns {Array} Array of objects that can be targeted
     */
    getTargetableObjects() {
        const targetable = [];
        for (const [object, metadata] of this.trackedObjects) {
            if (metadata.isTargetable) {
                targetable.push(object);
            }
        }
        return targetable;
    }

    /**
     * Update spatial system (call once per frame)
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Update bounding volumes for moved objects
        // Only update a subset per frame for performance
        const now = performance.now();
        if (now - this.lastUpdateTime < 16) return; // ~60fps limit
        
        let updatesThisFrame = 0;
        for (const [object, metadata] of this.trackedObjects) {
            if (updatesThisFrame >= this.maxUpdatesPerFrame) break;
            
            // Update bounding sphere position
            const sphere = this.boundingSpheres.get(object);
            if (sphere) {
                sphere.center.copy(object.position);
                updatesThisFrame++;
            }
        }
        
        this.lastUpdateTime = now;
    }

    /**
     * Get metadata for an object
     * @param {THREE.Object3D} object - Object to query
     * @returns {Object|null} Object metadata or null
     */
    getMetadata(object) {
        return this.trackedObjects.get(object) || null;
    }

    /**
     * Get statistics about tracked objects
     * @returns {Object} Statistics object
     */
    getStats() {
        const typeStats = {};
        for (const [type, objects] of this.objectsByType) {
            typeStats[type] = objects.size;
        }

        return {
            totalObjects: this.trackedObjects.size,
            typeBreakdown: typeStats,
            boundingSpheres: this.boundingSpheres.size,
            boundingBoxes: this.boundingBoxes.size
        };
    }

    /**
     * Clear all tracked objects
     */
    clear() {
        this.trackedObjects.clear();
        this.objectsByType.clear();
        this.boundingBoxes.clear();
        this.boundingSpheres.clear();
        console.log('🌌 SpatialManager cleared');
    }
}

export default SpatialManager;
