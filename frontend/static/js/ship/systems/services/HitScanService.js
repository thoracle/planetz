/**
 * SIMPLIFIED HitScanService - Basic Physics Raycast Only
 * 
 * Philosophy: If the physics raycast hits a collision box, it's a hit.
 * No tolerance calculations, no fallbacks, no complex aim calculations.
 * Simple, predictable, and performant.
 * CACHE_BUST_1755752329380 - Updated to filter celestial objects during raycast
 */

const DEBUG_LOG_HITSCAN = true;

/**
 * Simple weapon hit detection using physics raycast only
 * @param {THREE.Vector3} origin - Ray origin point
 * @param {THREE.Vector3} dir - Ray direction (normalized)
 * @param {number} maxRangeKm - Maximum weapon range in kilometers
 * @param {Object} ship - Ship reference for context
 * @returns {Object|null} Hit result or null if miss
 */
function performHitScan(origin, dir, maxRangeKm, ship) {
	// Try multiple ways to get physics reference
	let physics = window.physicsManager || window.physics;
	
	// Try to get physics from ship's starfield manager
	if (!physics && ship && ship.starfieldManager && ship.starfieldManager.physicsManager) {
		physics = ship.starfieldManager.physicsManager;
	}
	
	// Try to get physics from global starfield manager
	if (!physics && window.starfieldManager && window.starfieldManager.physicsManager) {
		physics = window.starfieldManager.physicsManager;
	}
	
	const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
	
	if (!physics || !physics.physicsWorld || !THREE) {
		if (DEBUG_LOG_HITSCAN) {
			console.log('❌ HITSCAN: Physics not available');
			console.log(`  - window.physicsManager: ${!!window.physicsManager}`);
			console.log(`  - window.starfieldManager: ${!!window.starfieldManager}`);
			console.log(`  - physics found: ${!!physics}`);
			console.log(`  - physics.physicsWorld: ${!!(physics && physics.physicsWorld)}`);
			console.log(`  - THREE: ${!!THREE}`);
		}
		return null;
	}

	// Convert range to meters for physics
	const maxRangeM = maxRangeKm * 1000;
	
			if (DEBUG_LOG_HITSCAN) {
			console.log(`🔫 SIMPLE RAYCAST: origin=(${origin.x.toFixed(2)},${origin.y.toFixed(2)},${origin.z.toFixed(2)}) dir=(${dir.x.toFixed(3)},${dir.y.toFixed(3)},${dir.z.toFixed(3)}) maxKm=${maxRangeKm.toFixed(1)}`);
			console.log(`🔍 PHYSICS MANAGER: entityMetadata=${!!physics.entityMetadata}, size=${physics.entityMetadata?.size || 0}`);
		}

	// Perform physics raycast
	try {
		const rayStart = new physics.Ammo.btVector3(origin.x, origin.y, origin.z);
		const rayEnd = new physics.Ammo.btVector3(
			origin.x + dir.x * maxRangeM,
			origin.y + dir.y * maxRangeM,
			origin.z + dir.z * maxRangeM
		);

		// MULTIPLE RAYCAST APPROACH: Since AllHitsRayResultCallback doesn't work properly,
		// we'll do multiple sequential raycasts, skipping over celestial objects
		let currentStart = new physics.Ammo.btVector3(origin.x, origin.y, origin.z);
		const finalEnd = new physics.Ammo.btVector3(
			origin.x + dir.x * maxRangeM,
			origin.y + dir.y * maxRangeM,
			origin.z + dir.z * maxRangeM
		);
		
		let maxAttempts = 5; // Prevent infinite loops
		let attempt = 0;

			if (DEBUG_LOG_HITSCAN) {
			console.log(`🔍 SEQUENTIAL RAYCAST: Starting multi-pass raycast to skip celestial objects`);
			console.log(`🔍 RAY SETUP: origin=(${origin.x.toFixed(2)}, ${origin.y.toFixed(2)}, ${origin.z.toFixed(2)})`);
			console.log(`🔍 RAY SETUP: direction=(${dir.x.toFixed(3)}, ${dir.y.toFixed(3)}, ${dir.z.toFixed(3)})`);
			console.log(`🔍 RAY SETUP: maxRange=${maxRangeM}m`);
			
			// DIRECT RAYCAST TEST: Try a direct raycast to target dummy 3 position
			const targetDummy3Pos = new physics.Ammo.btVector3(-28.53, 20.30, 12.27);
			const directRayCallback = new physics.Ammo.ClosestRayResultCallback(rayStart, targetDummy3Pos);
			physics.physicsWorld.rayTest(rayStart, targetDummy3Pos, directRayCallback);
			
			if (directRayCallback.hasHit()) {
				const hitBody = directRayCallback.get_m_collisionObject();
				let metadata = physics.entityMetadata.get(hitBody);
				console.log(`🎯 DIRECT RAYCAST TO TARGET DUMMY 3: HIT! type=${metadata?.type || 'unknown'} id=${metadata?.id || 'unnamed'}`);
			} else {
				console.log(`🎯 DIRECT RAYCAST TO TARGET DUMMY 3: MISS - no collision detected`);
			}
			
			physics.Ammo.destroy(directRayCallback);
			physics.Ammo.destroy(targetDummy3Pos);
			
			// Debug: Show target dummy positions in physics world and check ray alignment
			if (physics.entityMetadata && physics.entityMetadata.size > 0) {
				console.log(`🎯 TARGET DUMMIES IN PHYSICS WORLD:`);
				let targetCount = 0;
				for (const [rigidBody, metadata] of physics.entityMetadata.entries()) {
					if (metadata.type === 'enemy_ship' && metadata.id && metadata.id.includes('target_dummy')) {
						const pos = rigidBody.getWorldTransform().getOrigin();
						console.log(`🎯   ${metadata.id}: (${pos.x().toFixed(2)}, ${pos.y().toFixed(2)}, ${pos.z().toFixed(2)})`);
						
						// Target dummy collision info (from creation logs: 1.5m x 1.5m x 1.5m)
						console.log(`🎯   ${metadata.id} collision: 1.5m box (0.75m half-extents)`);
						
						// Check if this target is close to the ray path
						const targetPos = new THREE.Vector3(pos.x(), pos.y(), pos.z());
						const distanceFromOrigin = origin.distanceTo(targetPos);
						if (distanceFromOrigin < 50) { // Within 50m of ray origin
							console.log(`🎯   ${metadata.id} is ${distanceFromOrigin.toFixed(2)}m from ray origin`);
							
							// Check if target is along ray direction (dot product test)
							const toTarget = targetPos.clone().sub(origin).normalize();
							const dotProduct = toTarget.dot(dir);
							console.log(`🎯   Ray alignment: ${dotProduct.toFixed(3)} (1.0 = perfect alignment)`);
							
							if (dotProduct > 0.8) {
								console.log(`🎯   *** ${metadata.id} IS ALONG RAY PATH! ***`);
							}
						}
						
						targetCount++;
					}
				}
				if (targetCount === 0) {
					console.log(`🎯   NO TARGET DUMMIES FOUND IN PHYSICS WORLD!`);
				}
			}
		}
		
		while (attempt < maxAttempts) {
			attempt++;
			
					if (DEBUG_LOG_HITSCAN) {
			console.log(`🔍 ATTEMPT ${attempt}: raycast from (${currentStart.x().toFixed(2)}, ${currentStart.y().toFixed(2)}, ${currentStart.z().toFixed(2)}) to (${finalEnd.x().toFixed(2)}, ${finalEnd.y().toFixed(2)}, ${finalEnd.z().toFixed(2)})`);
			const rayLength = Math.sqrt(
				Math.pow(finalEnd.x() - currentStart.x(), 2) +
				Math.pow(finalEnd.y() - currentStart.y(), 2) +
				Math.pow(finalEnd.z() - currentStart.z(), 2)
			);
			console.log(`🔍 RAY LENGTH: ${(rayLength/1000).toFixed(1)}km`);
		}
			
			const rayCallback = new physics.Ammo.ClosestRayResultCallback(currentStart, finalEnd);
			physics.physicsWorld.rayTest(currentStart, finalEnd, rayCallback);

			if (!rayCallback.hasHit()) {
				// No more hits found
				if (DEBUG_LOG_HITSCAN) {
					console.log(`🔍 SEQUENTIAL RAYCAST: No more hits found after ${attempt} attempts`);
				}
				physics.Ammo.destroy(rayCallback);
				break;
			}
			
			const hitBody = rayCallback.get_m_collisionObject();
			const hitPoint = rayCallback.get_m_hitPointWorld();
			
					// Get metadata for the hit body
		let metadata = physics.entityMetadata.get(hitBody);
		
		// Enhanced metadata lookup when Map fails (same as PhysicsManager)
		if (!metadata) {
			// Method 1: Check userData property
			if (hitBody.userData) {
				metadata = hitBody.userData;
			}
			
			// Method 2: Try to find matching physics body by iterating through stored bodies
			if (!metadata) {
				for (const [storedThreeObject, storedRigidBody] of physics.rigidBodies.entries()) {
					// Check if this is the same physics body using various comparison methods
					if (storedRigidBody === hitBody || 
						(storedRigidBody && hitBody && storedRigidBody.ptr === hitBody.ptr) ||
						(storedRigidBody && hitBody && storedRigidBody.constructor === hitBody.constructor)) {
						
						const storedMetadata = physics.entityMetadata.get(storedRigidBody);
						if (storedMetadata) {
							metadata = storedMetadata;
							if (DEBUG_LOG_HITSCAN) {
								console.log(`🔍 METADATA FOUND via rigidBodies iteration: ${metadata.type || 'unknown'}`);
							}
							break;
						}
					}
				}
			}
		}
		
		if (DEBUG_LOG_HITSCAN) {
			const hitPos = new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z());
			const distance = origin.distanceTo(hitPos);
			console.log(`✅ PHYSICS HIT: distance=${(distance/1000).toFixed(3)}km type=${metadata?.type || 'unknown'} name=${metadata?.name || 'unnamed'}`);
			console.log(`🔍 METADATA LOOKUP: hitBody=${!!hitBody}, entityMetadata.size=${physics.entityMetadata?.size || 0}, metadata=${!!metadata}`);
		}

		// Check if this hit is a celestial object
		if (metadata && (metadata.type === 'star' || metadata.type === 'planet' || metadata.type === 'moon')) {
			if (DEBUG_LOG_HITSCAN) {
				console.log(`🌟 SEQUENTIAL RAYCAST: Skipping celestial ${metadata.type} "${metadata.name || 'unnamed'}" - attempt ${attempt}`);
			}
			
			// Move the start point slightly past this celestial object
			const hitPos = new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z());
			const skipDistance = 0.2; // Skip 20cm past the hit point to ensure complete clearance
			const newStart = hitPos.clone().add(dir.clone().multiplyScalar(skipDistance));
			
			// Update currentStart for next raycast
			physics.Ammo.destroy(currentStart);
			currentStart = new physics.Ammo.btVector3(newStart.x, newStart.y, newStart.z);
			
			if (DEBUG_LOG_HITSCAN) {
				console.log(`🔄 NEW START POINT: (${newStart.x.toFixed(2)}, ${newStart.y.toFixed(2)}, ${newStart.z.toFixed(2)})`);
				console.log(`🔄 CURRENT START UPDATED: (${currentStart.x().toFixed(2)}, ${currentStart.y().toFixed(2)}, ${currentStart.z().toFixed(2)})`);
			}
			
			// CRITICAL FIX: Recalculate the end point from the new start position
			// to maintain the original ray range and direction
			const newEndX = newStart.x + dir.x * maxRangeM;
			const newEndY = newStart.y + dir.y * maxRangeM;
			const newEndZ = newStart.z + dir.z * maxRangeM;
			finalEnd.setValue(newEndX, newEndY, newEndZ);
			
			if (DEBUG_LOG_HITSCAN) {
				console.log(`🔄 RECALCULATED END POINT: (${newEndX.toFixed(2)}, ${newEndY.toFixed(2)}, ${newEndZ.toFixed(2)})`);
				
				// Debug: Check if target dummy 3 is between new start and end
				const newStartVec = new THREE.Vector3(newStart.x, newStart.y, newStart.z);
				const newEndVec = new THREE.Vector3(newEndX, newEndY, newEndZ);
				const targetDummy3Pos = new THREE.Vector3(-28.53, 20.30, 12.27);
				
				// Check if target dummy is along the new ray path
				const rayDir = newEndVec.clone().sub(newStartVec).normalize();
				const toTarget = targetDummy3Pos.clone().sub(newStartVec);
				const projectionLength = toTarget.dot(rayDir);
				const closestPoint = newStartVec.clone().add(rayDir.clone().multiplyScalar(projectionLength));
				const distanceToRay = targetDummy3Pos.distanceTo(closestPoint);
				
				console.log(`🎯 TARGET DUMMY 3 vs NEW RAY:`);
				console.log(`🎯   Distance from new ray: ${distanceToRay.toFixed(3)}m (should be < 0.75m for hit)`);
				console.log(`🎯   Projection along ray: ${projectionLength.toFixed(2)}m`);
			}
			
			physics.Ammo.destroy(rayCallback);
			continue; // Try next raycast
		}

		// Found a non-celestial hit!
		if (DEBUG_LOG_HITSCAN) {
			console.log(`🔍 METADATA CHECK: metadata=${!!metadata}, type=${metadata?.type}, name=${metadata?.name}`);
		}
		
		if (metadata) {
			const hitPos = new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z());
			const distance = origin.distanceTo(hitPos);
			
			const result = {
				hit: true,
				target: metadata.ship || metadata,
				distance: distance / 1000, // Convert back to km
				hitPoint: hitPos,
				metadata: metadata
			};

			if (DEBUG_LOG_HITSCAN) {
				console.log(`🎯 SEQUENTIAL RAYCAST SUCCESS: ${metadata.name || metadata.type} at ${result.distance.toFixed(3)}km after ${attempt} attempts`);
			}

			// Cleanup
			physics.Ammo.destroy(rayStart);
			physics.Ammo.destroy(rayEnd);
			physics.Ammo.destroy(currentStart);
			physics.Ammo.destroy(finalEnd);
			physics.Ammo.destroy(rayCallback);

			return result;
		} else {
			// Hit something without metadata, skip it
			if (DEBUG_LOG_HITSCAN) {
				console.log(`🔍 SEQUENTIAL RAYCAST: Skipping hit without metadata - attempt ${attempt}`);
			}
			
			const hitPos = new THREE.Vector3(hitPoint.x(), hitPoint.y(), hitPoint.z());
			const skipDistance = 0.2; // Skip 20cm past the hit point to ensure complete clearance
			const newStart = hitPos.clone().add(dir.clone().multiplyScalar(skipDistance));
			
			physics.Ammo.destroy(currentStart);
			currentStart = new physics.Ammo.btVector3(newStart.x, newStart.y, newStart.z);
			
			if (DEBUG_LOG_HITSCAN) {
				console.log(`🔄 NEW START POINT: (${newStart.x.toFixed(2)}, ${newStart.y.toFixed(2)}, ${newStart.z.toFixed(2)})`);
				console.log(`🔄 CURRENT START UPDATED: (${currentStart.x().toFixed(2)}, ${currentStart.y().toFixed(2)}, ${currentStart.z().toFixed(2)})`);
			}
			
			// CRITICAL FIX: Recalculate the end point from the new start position
			const newEndX = newStart.x + dir.x * maxRangeM;
			const newEndY = newStart.y + dir.y * maxRangeM;
			const newEndZ = newStart.z + dir.z * maxRangeM;
			finalEnd.setValue(newEndX, newEndY, newEndZ);
			
			if (DEBUG_LOG_HITSCAN) {
				console.log(`🔄 RECALCULATED END POINT: (${newEndX.toFixed(2)}, ${newEndY.toFixed(2)}, ${newEndZ.toFixed(2)})`);
				
				// Debug: Check if target dummy 3 is between new start and end
				const newStartVec = new THREE.Vector3(newStart.x, newStart.y, newStart.z);
				const newEndVec = new THREE.Vector3(newEndX, newEndY, newEndZ);
				const targetDummy3Pos = new THREE.Vector3(-28.53, 20.30, 12.27);
				
				// Check if target dummy is along the new ray path
				const rayDir = newEndVec.clone().sub(newStartVec).normalize();
				const toTarget = targetDummy3Pos.clone().sub(newStartVec);
				const projectionLength = toTarget.dot(rayDir);
				const closestPoint = newStartVec.clone().add(rayDir.clone().multiplyScalar(projectionLength));
				const distanceToRay = targetDummy3Pos.distanceTo(closestPoint);
				
				console.log(`🎯 TARGET DUMMY 3 vs NEW RAY:`);
				console.log(`🎯   Distance from new ray: ${distanceToRay.toFixed(3)}m (should be < 0.75m for hit)`);
				console.log(`🎯   Projection along ray: ${projectionLength.toFixed(2)}m`);
			}
			
			physics.Ammo.destroy(rayCallback);
			continue;
		}
		
		} // End of while loop
		
		// If we get here, no valid (non-celestial) hits were found after all attempts
		if (DEBUG_LOG_HITSCAN) {
			console.log(`❌ SEQUENTIAL RAYCAST: No valid hits found after ${attempt} attempts`);
		}

		// Cleanup
		physics.Ammo.destroy(rayStart);
		physics.Ammo.destroy(rayEnd);
		physics.Ammo.destroy(currentStart);
		physics.Ammo.destroy(finalEnd);

	} catch (error) {
		if (DEBUG_LOG_HITSCAN) {
			console.log(`❌ RAYCAST ERROR: ${error.message}`);
		}
	}

	return null;
}

/**
 * Get physics center position for a ship (for damage application)
 */
function resolvePhysicsCenterForShip(ship) {
	if (!ship) return null;
	
	const physics = window.physicsManager;
	if (!physics || !physics.rigidBodies) return null;

	// Find the physics body for this ship
	for (const [threeObject, rigidBody] of physics.rigidBodies.entries()) {
		const metadata = physics.entityMetadata.get(rigidBody);
		if (metadata && metadata.ship === ship) {
			try {
				const transform = new physics.Ammo.btTransform();
				rigidBody.getWorldTransform(transform);
				const pos = transform.getOrigin();
				return new (window.THREE || THREE).Vector3(pos.x(), pos.y(), pos.z());
			} catch (error) {
				console.warn('Error getting physics center:', error);
			}
		}
	}
	
	return null;
}

// Export for use by weapon systems
if (typeof module !== 'undefined' && module.exports) {
	module.exports = { performHitScan, resolvePhysicsCenterForShip };
} else {
	window.HitScanService = { performHitScan, resolvePhysicsCenterForShip };
}