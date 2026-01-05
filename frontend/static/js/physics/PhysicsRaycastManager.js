/**
 * PhysicsRaycastManager
 *
 * Extracted from PhysicsManager to reduce file size.
 * Handles all raycast operations for physics collision detection.
 *
 * Features:
 * - Ammo.js physics raycasting
 * - Three.js fallback raycasting
 * - Entity identification from raycast hits
 * - Safe property access for raycast callbacks
 */

import { debug } from '../debug.js';

export class PhysicsRaycastManager {
    /**
     * Create a PhysicsRaycastManager
     * @param {Object} physicsManager - Reference to parent PhysicsManager
     */
    constructor(physicsManager) {
        this.pm = physicsManager;
    }

    /**
     * Perform a raycast in the physics world
     * @param {THREE.Vector3} origin - Ray origin
     * @param {THREE.Vector3} direction - Ray direction (normalized)
     * @param {number} maxDistance - Maximum ray distance
     * @returns {object|null} Hit result or null
     */
    raycast(origin, direction, maxDistance = 1000) {
        if (!this.pm.initialized) {
            debug('P1', 'PhysicsManager not initialized');
            return null;
        }

        try {
            // Check if raycast methods are available
            if (!this.pm.Ammo.ClosestRayResultCallback || !this.pm.physicsWorld.rayTest) {
                debug('AI', '🔄 Using Three.js raycast (physics methods not available)');
                return this.raycastFallback(origin, direction, maxDistance);
            }

            const rayStart = new this.pm.Ammo.btVector3(origin.x, origin.y, origin.z);
            const rayEnd = new this.pm.Ammo.btVector3(
                origin.x + direction.x * maxDistance,
                origin.y + direction.y * maxDistance,
                origin.z + direction.z * maxDistance
            );

            const rayCallback = new this.pm.Ammo.ClosestRayResultCallback(rayStart, rayEnd);
            this.pm.physicsWorld.rayTest(rayStart, rayEnd, rayCallback);

            if (rayCallback.hasHit()) {
                const hitBody = this.safeGetRaycastProperty(rayCallback, 'collisionObject');
                const hitPoint = this.safeGetRaycastProperty(rayCallback, 'hitPointWorld');
                const hitNormal = this.safeGetRaycastProperty(rayCallback, 'hitNormalWorld');
                const hitFraction = this.safeGetRaycastProperty(rayCallback, 'closestHitFraction');

                // Check if we have essential hit data
                if (!hitBody || !hitPoint || !hitNormal) {
                    if (!this.pm._silentMode && this.pm._debugLoggingEnabled) {
                        debug('UTILITY', `🔍 RAYCAST MISS: Missing essential hit data (body=${!!hitBody}, point=${!!hitPoint}, normal=${!!hitNormal})`);
                    }

                    // Clean up Ammo.js objects
                    this.pm.Ammo.destroy(rayCallback);
                    this.pm.Ammo.destroy(rayStart);
                    this.pm.Ammo.destroy(rayEnd);

                    return null;
                }

                // We have essential hit data - check if we need manual distance calculation
                if (hitFraction === null) {
                    const hitVector = new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z());
                    const originVector = new THREE.Vector3(origin.x, origin.y, origin.z);
                    const calculatedDistance = originVector.distanceTo(hitVector);
                    const calculatedFraction = calculatedDistance / maxDistance;

                    const entityInfo = this._findEntityInfo(hitBody, hitPoint);

                    const result = {
                        hit: true,
                        body: hitBody,
                        point: new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z()),
                        normal: new THREE.Vector3(hitNormal.x(), hitNormal.y(), hitNormal.z()),
                        distance: calculatedDistance,
                        fraction: calculatedFraction,
                        entity: entityInfo || { type: 'unknown', id: 'unknown' }
                    };

                    // Clean up Ammo.js objects
                    this.pm.Ammo.destroy(rayCallback);
                    this.pm.Ammo.destroy(rayStart);
                    this.pm.Ammo.destroy(rayEnd);

                    return result;
                }

                const entityInfo = this._findEntityInfo(hitBody, hitPoint);

                const result = {
                    hit: true,
                    body: hitBody,
                    point: new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z()),
                    normal: new THREE.Vector3(hitNormal.x(), hitNormal.y(), hitNormal.z()),
                    distance: origin.distanceTo(new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z())),
                    fraction: hitFraction,
                    entity: entityInfo || { type: 'unknown', id: 'unknown' }
                };

                // Clean up Ammo.js objects
                this.pm.Ammo.destroy(rayCallback);
                this.pm.Ammo.destroy(rayStart);
                this.pm.Ammo.destroy(rayEnd);

                return result;
            } else {
                debug('P1', `PHYSICS RAYCAST MISS: No hits detected (checked ${this.pm.rigidBodies.size} bodies)`);
            }

            // Clean up Ammo.js objects
            this.pm.Ammo.destroy(rayCallback);
            this.pm.Ammo.destroy(rayStart);
            this.pm.Ammo.destroy(rayEnd);
            return null;

        } catch (error) {
            debug('P1', `Physics raycast failed, using Three.js fallback: ${error.message}`);
            return this.raycastFallback(origin, direction, maxDistance);
        }
    }

    /**
     * Find entity info from hit body using multiple lookup methods
     * @param {object} hitBody - The hit rigid body
     * @param {object} hitPoint - The hit point (Ammo btVector3)
     * @returns {object|null} Entity info or null
     */
    _findEntityInfo(hitBody, hitPoint) {
        const metadata = this.pm.entityMetadata.get(hitBody);

        if (metadata) {
            return metadata;
        }

        // Method 1: Check userData property
        if (hitBody.userData) {
            return hitBody.userData;
        }

        // Method 2: Try to find matching physics body by iterating through stored bodies
        for (const [storedThreeObject, storedRigidBody] of this.pm.rigidBodies.entries()) {
            if (storedRigidBody === hitBody ||
                (storedRigidBody && hitBody && storedRigidBody.ptr === hitBody.ptr) ||
                (storedRigidBody && hitBody && storedRigidBody.constructor === hitBody.constructor)) {

                const storedMetadata = this.pm.entityMetadata.get(storedRigidBody);
                if (storedMetadata) {
                    debug('UTILITY', `✅ FALLBACK SUCCESS: Found matching body ${storedMetadata.type} ${storedMetadata.id}`);
                    return storedMetadata;
                }
            }
        }

        // Method 3: Position-based matching (last resort)
        if (hitPoint) {
            if (!this.pm._silentMode && this.pm._debugLoggingEnabled) {
                debug('UTILITY', `🔍 Trying position-based entity identification...`);
            }
            const hitPos = new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z());

            for (const [storedThreeObject, storedRigidBody] of this.pm.rigidBodies.entries()) {
                const objectPos = storedThreeObject.position;
                const distance = hitPos.distanceTo(objectPos);

                if (distance < 10.0) {
                    const storedMetadata = this.pm.entityMetadata.get(storedRigidBody);
                    if (storedMetadata) {
                        debug('UTILITY', `✅ POSITION MATCH: ${storedMetadata.type} ${storedMetadata.id} at distance ${distance.toFixed(2)}`);
                        return storedMetadata;
                    }
                }
            }
        }

        debug('P1', `❌ ENTITY IDENTIFICATION FAILED - using 'unknown'`);
        return null;
    }

    /**
     * Fallback raycast using Three.js raycaster
     * @param {THREE.Vector3} origin - Ray origin
     * @param {THREE.Vector3} direction - Ray direction (normalized)
     * @param {number} maxDistance - Maximum ray distance
     * @returns {object|null} Hit result or null
     */
    raycastFallback(origin, direction, maxDistance = 1000) {
        try {
            if (typeof THREE === 'undefined') {
                debug('P1', 'THREE.js not available for raycast fallback');
                return null;
            }

            const raycaster = new THREE.Raycaster();
            raycaster.set(origin, direction);
            raycaster.far = maxDistance;

            // Get all Three.js objects that have rigid bodies
            const targets = [];
            for (const [threeObject] of this.pm.rigidBodies.entries()) {
                if (threeObject && threeObject.visible !== false) {
                    targets.push(threeObject);
                }
            }

            const intersects = raycaster.intersectObjects(targets, true);

            if (intersects.length > 0) {
                const hit = intersects[0];

                // Find the rigid body for this object
                let hitObject = hit.object;
                let rigidBody = this.pm.rigidBodies.get(hitObject);

                // Try parent if direct lookup fails
                while (!rigidBody && hitObject.parent) {
                    hitObject = hitObject.parent;
                    rigidBody = this.pm.rigidBodies.get(hitObject);
                }

                const metadata = rigidBody ? this.pm.entityMetadata.get(rigidBody) : null;

                return {
                    hit: true,
                    body: rigidBody,
                    point: hit.point.clone(),
                    normal: hit.face ? hit.face.normal.clone() : new THREE.Vector3(0, 1, 0),
                    distance: hit.distance,
                    fraction: hit.distance / maxDistance,
                    entity: metadata || { type: 'unknown', id: 'unknown' }
                };
            }

            return null;

        } catch (error) {
            debug('P1', `Three.js raycast fallback failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Test if a weapon scan hits a target using raycasting
     * @param {THREE.Object3D} weaponMesh - Weapon mesh
     * @param {THREE.Object3D} targetMesh - Target mesh
     * @param {object} targetRigidBody - Target's rigid body
     * @param {number} range - Weapon range
     * @returns {object|null} Hit result or null
     */
    testScanHitWeapon(weaponMesh, targetMesh, targetRigidBody, range) {
        if (!this.pm.initialized || !weaponMesh || !targetMesh) {
            return null;
        }

        try {
            const weaponPosition = weaponMesh.getWorldPosition(new THREE.Vector3());
            const targetPosition = targetMesh.getWorldPosition(new THREE.Vector3());

            const direction = new THREE.Vector3()
                .subVectors(targetPosition, weaponPosition)
                .normalize();

            const result = this.raycast(weaponPosition, direction, range);

            if (result && result.body === targetRigidBody) {
                return result;
            }

            return null;

        } catch (error) {
            debug('P1', `Scan hit weapon test failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Test if a raycast hits a specific target
     * @param {THREE.Object3D} weaponMesh - Weapon mesh
     * @param {THREE.Object3D} targetMesh - Target mesh
     * @param {object} targetRigidBody - Target's rigid body
     * @param {number} range - Weapon range
     * @returns {object|null} Hit result or null
     */
    testRaycastHit(weaponMesh, targetMesh, targetRigidBody, range) {
        return this.testScanHitWeapon(weaponMesh, targetMesh, targetRigidBody, range);
    }

    /**
     * Process Ammo.js raycast collisions (for projectiles)
     */
    processAmmoRaycastCollisions() {
        // This method processes raycast-based collision detection for fast-moving projectiles
        // Implementation depends on game's projectile system
        if (!this.pm.initialized) return;

        // Projectile collision processing is typically done in the update loop
        // This is a placeholder for any additional raycast collision processing
    }

    /**
     * Safely get a property from an Ammo.js raycast callback
     * @param {object} rayCallback - The Ammo.js raycast callback object
     * @param {string} property - The property to access
     * @returns {*} The property value or null if not found
     */
    safeGetRaycastProperty(rayCallback, property) {
        const propertyMethods = {
            'collisionObject': [
                'get_m_collisionObject',
                'm_collisionObject',
                'getCollisionObject',
                'collisionObject'
            ],
            'closestHitFraction': [
                'get_m_closestHitFraction',
                'm_closestHitFraction',
                'getClosestHitFraction',
                'closestHitFraction',
                'get_closestHitFraction',
                'hasHit'
            ],
            'hitPointWorld': [
                'get_m_hitPointWorld',
                'm_hitPointWorld',
                'getHitPointWorld',
                'hitPointWorld',
                'get_hitPointWorld'
            ],
            'hitNormalWorld': [
                'get_m_hitNormalWorld',
                'm_hitNormalWorld',
                'getHitNormalWorld',
                'hitNormalWorld',
                'get_hitNormalWorld'
            ]
        };

        const methods = propertyMethods[property];
        if (!methods) {
            if (!this.pm._warnedProperties) this.pm._warnedProperties = new Set();
            if (!this.pm._warnedProperties.has(property)) {
                debug('UTILITY', `Unknown raycast property: ${property}`);
                this.pm._warnedProperties.add(property);
            }
            return null;
        }

        // Try each method in order
        for (const methodName of methods) {
            try {
                if (typeof rayCallback[methodName] === 'function') {
                    const result = rayCallback[methodName]();
                    if (this.pm._debugLoggingEnabled && !this.pm._successfulMethods) this.pm._successfulMethods = new Set();
                    if (this.pm._debugLoggingEnabled && !this.pm._successfulMethods.has(`${property}_${methodName}`)) {
                        debug('UTILITY', `✅ RAYCAST API: ${property} accessed via ${methodName}()`);
                        this.pm._successfulMethods.add(`${property}_${methodName}`);
                    }
                    return result;
                }

                if (rayCallback[methodName] !== undefined) {
                    const result = rayCallback[methodName];
                    if (this.pm._debugLoggingEnabled && !this.pm._successfulMethods) this.pm._successfulMethods = new Set();
                    if (this.pm._debugLoggingEnabled && !this.pm._successfulMethods.has(`${property}_${methodName}`)) {
                        debug('UTILITY', `✅ RAYCAST API: ${property} accessed via ${methodName} (property)`);
                        this.pm._successfulMethods.add(`${property}_${methodName}`);
                    }
                    return result;
                }
            } catch (error) {
                continue;
            }
        }

        // Special handling for closestHitFraction
        if (property === 'closestHitFraction') {
            try {
                if (typeof rayCallback.hasHit === 'function' && rayCallback.hasHit()) {
                    return 0.5;
                }
                return null;
            } catch (error) {
                return null;
            }
        }

        if (!this.pm._silentMode && !this.pm._lastFailureWarning) this.pm._lastFailureWarning = {};
        const now = Date.now();
        if (!this.pm._silentMode && (!this.pm._lastFailureWarning[property] || now - this.pm._lastFailureWarning[property] > 5000)) {
            debug('UTILITY', `Could not access raycast property ${property} with any known method`);
            this.pm._lastFailureWarning[property] = now;
        }

        return null;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.pm = null;
    }
}
