// HitScanService - performs center-ray physics casts for scan-hit weapons
import { getFireOrigin, getFireDirection } from './AimResolver.js';
import { normalizeRangeKm } from './RangeUnits.js';
import { isCelestial, isDamageable } from './TargetFilter.js';

export function castLaserRay(ship, weaponRangeValueKmOrM, intendedTarget = null) {
	const physics = window.physicsManager;
	const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
	if (!physics || !physics.initialized || !THREE) {
		return { hit: false, point: null, entity: null, distance: 0 };
	}

	const origin = getFireOrigin(ship);
	const dir = getFireDirection(ship);
	if (!origin || !dir) {
		return { hit: false, point: null, entity: null, distance: 0 };
	}

	const maxRangeKm = normalizeRangeKm(weaponRangeValueKmOrM);
	let remainingKm = maxRangeKm;
	let currentOrigin = origin.clone();
	let steps = 0;
	const maxSteps = 6; // allow a few skips past celestials

	while (remainingKm > 0.01 && steps < maxSteps) {
		const result = physics.raycast(currentOrigin, dir, remainingKm);
		if (!result || !result.hit) break;
		const entity = result.entity;
		const distanceKm = result.distance;

		if (isDamageable(entity)) {
			// If intended target provided, optionally validate (lightly)
			if (intendedTarget) {
				// Accept if same ship or same id/type; otherwise still accept per design
			}
			return { hit: true, point: result.point, entity, distance: distanceKm };
		}

		// Skip celestials and unknowns by advancing slightly beyond the hit point
		const advanceKm = Math.max(0.05, Math.min(0.2, remainingKm * 0.1));
		const advanceVec = dir.clone().multiplyScalar(distanceKm + advanceKm);
		currentOrigin = currentOrigin.clone().add(advanceVec);
		remainingKm -= (distanceKm + advanceKm);
		steps++;
	}

	return { hit: false, point: null, entity: null, distance: 0 };
}


