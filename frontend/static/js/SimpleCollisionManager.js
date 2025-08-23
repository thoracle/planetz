/**
 * SimpleCollisionManager - Three.js-based collision detection system
 * Replaces Ammo.js collision detection with simple, performant Three.js Raycaster
 * Optimized for space shooter gameplay with minimal overhead
 */

export class SimpleCollisionManager {
    constructor(scene, spatialManager) {
        this.scene = scene;
        this.spatialManager = spatialManager;
        
        // Access THREE.js lazily to ensure it's loaded
        const THREE = window.THREE;
        if (!THREE) {
            throw new Error('THREE.js not available - ensure it is loaded before SimpleCollisionManager');
        }
        
        this.raycaster = new THREE.Raycaster();
        
        // Performance settings
        this.raycaster.params.Points.threshold = 0.1;
        this.raycaster.params.Line.threshold = 0.1;
        
        // Collision layers for filtering
        this.collisionLayers = {
            SHIPS: 'ships',
            STATIONS: 'stations', 
            PLANETS: 'planets',
            PROJECTILES: 'projectiles',
            EFFECTS: 'effects'
        };
        
        // Layer-based object tracking
        this.layeredObjects = new Map(); // layer -> Set<object>
        
        console.log('💥 SimpleCollisionManager initialized - Three.js collision detection');
    }

    /**
     * Perform raycast collision detection
     * @param {THREE.Vector3} origin - Ray origin
     * @param {THREE.Vector3} direction - Ray direction (normalized)
     * @param {number} maxDistance - Maximum ray distance
     * @param {Array} excludeObjects - Objects to ignore
     * @param {Array} layerFilter - Only check specific layers
     * @returns {Object|null} Hit result or null
     */
    raycast(origin, direction, maxDistance, excludeObjects = [], layerFilter = null) {
        // Set up raycaster
        this.raycaster.set(origin, direction);
        this.raycaster.far = maxDistance;
        this.raycaster.near = 0.01; // Avoid self-intersection

        // Get objects to test against
        let testObjects = this.getCollidableObjects(layerFilter);
        
        // Filter out excluded objects
        if (excludeObjects.length > 0) {
            testObjects = testObjects.filter(obj => !excludeObjects.includes(obj));
        }

        // Perform intersection test
        const intersects = this.raycaster.intersectObjects(testObjects, true);
        
        if (intersects.length === 0) {
            return null;
        }

        // Filter hits by maximum distance (enforce range limit)
        const validHits = intersects.filter(hit => hit.distance <= maxDistance);
        
        if (validHits.length === 0) {
            return null; // No hits within range
        }

        // Return first hit within range
        const hit = validHits[0];
        const metadata = this.spatialManager.getMetadata(hit.object);
        
        return {
            hit: true,
            object: hit.object,
            point: hit.point,
            distance: hit.distance,
            normal: hit.face ? hit.face.normal : new window.THREE.Vector3(0, 1, 0),
            metadata: metadata || {}
        };
    }

    /**
     * Perform sphere collision detection
     * @param {THREE.Vector3} center - Sphere center
     * @param {number} radius - Sphere radius
     * @param {Array} excludeObjects - Objects to ignore
     * @param {Array} layerFilter - Only check specific layers
     * @returns {Array} Array of collision results
     */
    sphereCollision(center, radius, excludeObjects = [], layerFilter = null) {
        const results = [];
        const testObjects = this.getCollidableObjects(layerFilter);
        
        for (const object of testObjects) {
            if (excludeObjects.includes(object)) continue;
            
            const distance = center.distanceTo(object.position);
            const metadata = this.spatialManager.getMetadata(object);
            const objectRadius = metadata?.radius || 1.0;
            
            if (distance <= (radius + objectRadius)) {
                results.push({
                    object,
                    distance,
                    overlap: (radius + objectRadius) - distance,
                    metadata: metadata || {}
                });
            }
        }
        
        return results.sort((a, b) => a.distance - b.distance);
    }

    /**
     * Check collision between two specific objects
     * @param {THREE.Object3D} obj1 - First object
     * @param {THREE.Object3D} obj2 - Second object
     * @returns {boolean} True if colliding
     */
    checkObjectCollision(obj1, obj2) {
        return this.spatialManager.checkCollision(obj1, obj2);
    }

    /**
     * Add object to a collision layer
     * @param {THREE.Object3D} object - Object to add
     * @param {string} layer - Layer name
     */
    addObjectToLayer(object, layer) {
        if (!this.layeredObjects.has(layer)) {
            this.layeredObjects.set(layer, new Set());
        }
        this.layeredObjects.get(layer).add(object);
        // console.log(`CollisionManager: Added object to layer '${layer}'`);
    }

    /**
     * Remove object from a collision layer
     * @param {THREE.Object3D} object - Object to remove
     * @param {string} layer - Layer name
     */
    removeObjectFromLayer(object, layer) {
        if (this.layeredObjects.has(layer)) {
            this.layeredObjects.get(layer).delete(object);
            if (this.layeredObjects.get(layer).size === 0) {
                this.layeredObjects.delete(layer);
            }
            // console.log(`CollisionManager: Removed object from layer '${layer}'`);
        }
    }

    /**
     * Get collidable objects, optionally filtered by layer
     * @param {Array} layerFilter - Layer names to include
     * @returns {Array} Array of collidable objects
     */
    getCollidableObjects(layerFilter = null) {
        let objects = this.spatialManager.getCollidableObjects();
        
        if (layerFilter && layerFilter.length > 0) {
            objects = objects.filter(obj => {
                const metadata = this.spatialManager.getMetadata(obj);
                return metadata && layerFilter.includes(metadata.layer);
            });
        }
        
        return objects;
    }

    /**
     * Weapon-specific raycast for hit detection
     * @param {THREE.Vector3} origin - Weapon origin
     * @param {THREE.Vector3} direction - Fire direction
     * @param {number} maxRangeKm - Weapon range in kilometers
     * @param {THREE.Object3D} firingShip - Ship firing the weapon (to exclude)
     * @returns {Object|null} Hit result or null
     */
    weaponRaycast(origin, direction, maxRangeKm, firingShip = null) {
        const maxRangeM = maxRangeKm * 1000; // Convert to meters
        const excludeObjects = firingShip ? [firingShip] : [];
        
        // Only hit ships, stations, and other targetable objects
        const layerFilter = [
            this.collisionLayers.SHIPS,
            this.collisionLayers.STATIONS,
            this.collisionLayers.PLANETS
        ];
        
        const result = this.raycast(origin, direction, maxRangeM, excludeObjects, layerFilter);
        
        if (result) {
            // Convert distance back to kilometers for game logic
            result.distanceKm = result.distance / 1000;
        }
        
        return result;
    }

    /**
     * Docking collision check - simple distance and approach angle
     * @param {THREE.Object3D} ship - Ship attempting to dock
     * @param {THREE.Object3D} station - Station to dock with
     * @returns {Object} Docking eligibility result
     */
    checkDocking(ship, station) {
        const shipMetadata = this.spatialManager.getMetadata(ship);
        const stationMetadata = this.spatialManager.getMetadata(station);
        
        if (!shipMetadata || !stationMetadata) {
            return { canDock: false, reason: 'Missing metadata' };
        }
        
        const distance = ship.position.distanceTo(station.position);
        const dockingRange = (shipMetadata.radius || 1) + (stationMetadata.dockingRange || 2);
        
        // Check distance
        if (distance > dockingRange) {
            return { 
                canDock: false, 
                reason: 'Too far', 
                distance, 
                requiredDistance: dockingRange 
            };
        }
        
        // Check approach angle (optional - for more realistic docking)
        const approachVector = ship.position.clone().sub(station.position).normalize();
        const shipForward = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
        const approachAngle = Math.acos(approachVector.dot(shipForward.negate()));
        const maxApproachAngle = Math.PI / 3; // 60 degrees
        
        if (approachAngle > maxApproachAngle) {
            return {
                canDock: false,
                reason: 'Poor approach angle',
                distance,
                approachAngle: approachAngle * (180 / Math.PI),
                maxApproachAngle: maxApproachAngle * (180 / Math.PI)
            };
        }
        
        return {
            canDock: true,
            distance,
            approachAngle: approachAngle * (180 / Math.PI)
        };
    }

    /**
     * Projectile collision detection (for missiles, etc.)
     * @param {THREE.Vector3} position - Projectile position
     * @param {number} radius - Projectile collision radius
     * @param {THREE.Object3D} firingShip - Ship that fired (to exclude)
     * @returns {Object|null} Hit result or null
     */
    projectileCollision(position, radius, firingShip = null) {
        const excludeObjects = firingShip ? [firingShip] : [];
        const layerFilter = [
            this.collisionLayers.SHIPS,
            this.collisionLayers.STATIONS,
            this.collisionLayers.PLANETS
        ];
        
        const collisions = this.sphereCollision(position, radius, excludeObjects, layerFilter);
        
        return collisions.length > 0 ? collisions[0] : null;
    }

    /**
     * Update collision system (call once per frame)
     * @param {number} deltaTime - Time since last update
     */
    update(deltaTime) {
        // Update spatial manager first
        this.spatialManager.update(deltaTime);
        
        // Any per-frame collision system updates can go here
        // For now, collision detection is on-demand only
    }

    /**
     * Get collision system statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return {
            spatialStats: this.spatialManager.getStats(),
            raycastsThisFrame: 0, // Could track this if needed
            collisionChecksThisFrame: 0 // Could track this if needed
        };
    }

    /**
     * Clear all collision data
     */
    clear() {
        this.spatialManager.clear();
        console.log('💥 SimpleCollisionManager cleared');
    }
}

export default SimpleCollisionManager;
