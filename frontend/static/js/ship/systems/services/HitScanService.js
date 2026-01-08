import { debug } from '../../../debug.js';

/**
 * THREE.JS HitScanService - Simple Three.js Raycaster-based weapon hit detection
 * 
 * Philosophy: Use Three.js Raycaster for simple, performant hit detection.
 * No complex physics, just direct raycast intersection with targetable objects.
 * Optimized for retro space shooter gameplay.
 */

const DEBUG_LOG_HITSCAN = false;

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
debug('AI', '❌ HITSCAN: CollisionManager not available');
debug('UTILITY', `  - window.collisionManager: ${!!window.collisionManager}`);
debug('UTILITY', `  - window.starfieldManager: ${!!window.starfieldManager}`);
debug('UTILITY', `  - collisionManager found: ${!!collisionManager}`);
debug('UTILITY', `  - THREE: ${!!THREE}`);
		}
		return null;
	}

	if (DEBUG_LOG_HITSCAN) {
debug('UTILITY', 'HITSCAN: Performing Three.js raycast');
debug('UTILITY', `  - Origin: (${origin.x.toFixed(2)}, ${origin.y.toFixed(2)}, ${origin.z.toFixed(2)})`);
debug('UTILITY', `  - Direction: (${dir.x.toFixed(3)}, ${dir.y.toFixed(3)}, ${dir.z.toFixed(3)})`);
debug('UTILITY', `  - Range: ${maxRangeKm}km`);
	}
	
	// Use collision manager's weapon raycast method
	const result = collisionManager.weaponRaycast(origin, dir, maxRangeKm, ship);
	
	if (result && result.hit) {
		if (DEBUG_LOG_HITSCAN) {
debug('UTILITY', '✅ HITSCAN: Hit detected');
debug('TARGETING', `  - Target: ${result.metadata?.type || 'unknown'}`);
debug('UTILITY', `  - Distance: ${result.distanceKm.toFixed(2)}km`);
debug('UTILITY', `  - Hit Point: (${result.point.x.toFixed(2)}, ${result.point.y.toFixed(2)}, ${result.point.z.toFixed(2)})`);
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
debug('UTILITY', '❌ HITSCAN: No hit detected');
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

debug('UTILITY', 'HitScanService loaded - Three.js Raycaster implementation');