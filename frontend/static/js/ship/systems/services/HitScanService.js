/**
 * THREE.JS HitScanService - Simple Three.js Raycaster-based weapon hit detection
 * 
 * Philosophy: Use Three.js Raycaster for simple, performant hit detection.
 * No complex physics, just direct raycast intersection with targetable objects.
 * Optimized for retro space shooter gameplay.
 */

const DEBUG_LOG_HITSCAN = true;

/**
 * Simple weapon hit detection using Three.js Raycaster
 * @param {THREE.Vector3} origin - Ray origin point
 * @param {THREE.Vector3} dir - Ray direction (normalized)
 * @param {number} maxRangeKm - Maximum weapon range in kilometers
 * @param {Object} ship - Ship reference for context
 * @returns {Object|null} Hit result or null if miss
 */
function performHitScan(origin, dir, maxRangeKm, ship) {
	// Try multiple ways to get collision manager reference
	let collisionManager = window.collisionManager;
	
	// Try to get collision manager from ship's starfield manager
	if (!collisionManager && ship && ship.starfieldManager && ship.starfieldManager.collisionManager) {
		collisionManager = ship.starfieldManager.collisionManager;
	}
	
	// Try to get collision manager from global starfield manager
	if (!collisionManager && window.starfieldManager && window.starfieldManager.collisionManager) {
		collisionManager = window.starfieldManager.collisionManager;
	}
	
	const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
	
	if (!collisionManager || !THREE) {
		if (DEBUG_LOG_HITSCAN) {
			console.log('❌ HITSCAN: CollisionManager not available');
			console.log(`  - window.collisionManager: ${!!window.collisionManager}`);
			console.log(`  - window.starfieldManager: ${!!window.starfieldManager}`);
			console.log(`  - collisionManager found: ${!!collisionManager}`);
			console.log(`  - THREE: ${!!THREE}`);
		}
		return null;
	}

	if (DEBUG_LOG_HITSCAN) {
		console.log('🎯 HITSCAN: Performing Three.js raycast');
		console.log(`  - Origin: (${origin.x.toFixed(2)}, ${origin.y.toFixed(2)}, ${origin.z.toFixed(2)})`);
		console.log(`  - Direction: (${dir.x.toFixed(3)}, ${dir.y.toFixed(3)}, ${dir.z.toFixed(3)})`);
		console.log(`  - Range: ${maxRangeKm}km`);
	}
	
	// Use collision manager's weapon raycast method
	const result = collisionManager.weaponRaycast(origin, dir, maxRangeKm, ship);
	
	if (result && result.hit) {
		if (DEBUG_LOG_HITSCAN) {
			console.log('✅ HITSCAN: Hit detected');
			console.log(`  - Target: ${result.metadata?.type || 'unknown'}`);
			console.log(`  - Distance: ${result.distanceKm.toFixed(2)}km`);
			console.log(`  - Hit Point: (${result.point.x.toFixed(2)}, ${result.point.y.toFixed(2)}, ${result.point.z.toFixed(2)})`);
		}
		
		return {
			hit: true,
			object: result.object,
			point: result.point,
			hitPoint: result.point,  // Weapon system expects hitPoint
			target: result.metadata?.type || 'unknown',  // Weapon system expects target
			distance: result.distanceKm,
			normal: result.normal || new THREE.Vector3(0, 1, 0),
			targetType: result.metadata?.type || 'unknown',
			metadata: result.metadata || {}
		};
	} else {
		if (DEBUG_LOG_HITSCAN) {
			console.log('❌ HITSCAN: No hit detected');
		}
		return null;
	}
}

// Create HitScanService object for weapon systems
const HitScanService = {
    performHitScan: performHitScan
};

// Export both ways for compatibility
window.HitScanService = HitScanService;
window.performHitScan = performHitScan;

// Also make it available as a module export
export { performHitScan, HitScanService };

console.log('🎯 HitScanService loaded - Three.js Raycaster implementation');