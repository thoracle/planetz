// HitScanService - performs center-ray physics casts for scan-hit weapons
import { getFireOrigin, getFireDirection } from './AimResolver.js';
import { normalizeRangeKm } from './RangeUnits.js';
import { isDamageable } from './TargetFilter.js';
import { CrosshairTargeting } from '../../../utils/CrosshairTargeting.js';

function resolvePhysicsCenterForShip(ship) {
	try {
		const physics = window.physicsManager;
		const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
		if (!physics || !physics.rigidBodies || !THREE || !ship) return null;
		for (const [threeObject, rigidBody] of physics.rigidBodies.entries()) {
			const metadata = physics.entityMetadata.get(rigidBody);
			if (metadata && (metadata.ship === ship || metadata.id === ship.shipName)) {
				const transform = new physics.Ammo.btTransform();
				rigidBody.getWorldTransform(transform);
				const pos = transform.getOrigin();
				return new THREE.Vector3(pos.x(), pos.y(), pos.z());
			}
		}
	} catch (e) {}
	return null;
}

function findNearestPhysicsShipHit(origin, dir, maxRangeKm, tolKm) {
	const physics = window.physicsManager;
	const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
	if (!physics || !physics.rigidBodies || !THREE) return null;
	let best = null;
	let bestLateralKm = Infinity;
	const ray = new THREE.Ray(origin.clone(), dir.clone());
	for (const [threeObject, rigidBody] of physics.rigidBodies.entries()) {
		const metadata = physics.entityMetadata.get(rigidBody);
		// Accept any damageable ship-like body (enemy, friendly, neutral stations with ship refs)
		if (!metadata || (!metadata.ship && metadata.type !== 'enemy_ship')) continue;
		try {
			const transform = new physics.Ammo.btTransform();
			rigidBody.getWorldTransform(transform);
			const p = transform.getOrigin();
			const pos = new THREE.Vector3(p.x(), p.y(), p.z());
			const toPos = pos.clone().sub(origin);
			const forwardKm = toPos.dot(dir);
			if (forwardKm < 0 || forwardKm > maxRangeKm) continue;
			const lateralKm = ray.distanceToPoint(pos);
			if (lateralKm <= tolKm && lateralKm < bestLateralKm) {
				const closestPoint = new THREE.Vector3();
				ray.closestPointToPoint(pos, closestPoint);
				bestLateralKm = lateralKm;
				best = {
					hit: true,
					point: closestPoint,
					entity: { type: metadata.type || 'ship', ship: metadata.ship, threeObject, id: metadata.id },
					distance: origin.distanceTo(pos)
				};
			}
		} catch (_) {}
	}
	return best;
}

function findPhysicsShipAtPoint(point, radiusKm = 0.050) {
	const physics = window.physicsManager;
	const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
	if (!physics || !physics.rigidBodies || !THREE) return null;
	let nearest = null;
	let bestDist = Infinity;
	for (const [threeObject, rigidBody] of physics.rigidBodies.entries()) {
		const metadata = physics.entityMetadata.get(rigidBody);
		if (!metadata) continue;
		// Accept any ship-like metadata that carries a ship reference
		if (!metadata.ship && metadata.type !== 'enemy_ship') continue;
		try {
			const transform = new physics.Ammo.btTransform();
			rigidBody.getWorldTransform(transform);
			const p = transform.getOrigin();
			const pos = new THREE.Vector3(p.x(), p.y(), p.z());
			const d = pos.distanceTo(point);
			if (d <= radiusKm && d < bestDist) {
				bestDist = d;
				nearest = { ship: metadata.ship || null, threeObject, id: metadata.id };
			}
		} catch (_) {}
	}
	return nearest;
}

export function castLaserRay(ship, weaponRangeValueKmOrM, intendedTarget = null) {
	const physics = window.physicsManager;
	const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
	if (!physics || !physics.initialized || !THREE) {
		return { hit: false, point: null, entity: null, distance: 0 };
	}
	const DEBUG_LOG_HITSCAN = true;
	const DEBUG_ACCEPT_RANGE_VALID = false; // Do not auto-accept range-only; require aim alignment
	const origin = getFireOrigin(ship);
	let dir = getFireDirection(ship);
	if (!origin || !dir) { return { hit: false, point: null, entity: null, distance: 0 }; }
	const maxRangeKm = normalizeRangeKm(weaponRangeValueKmOrM);

	// Do NOT override aim direction; use active camera direction for free-aim behavior
	// We still compute tolerance against targets below, but the ray direction stays as the camera forward

	if (DEBUG_LOG_HITSCAN) {
		try { console.log(`🔫 LASER RAY: origin=(${origin.x.toFixed(2)},${origin.y.toFixed(2)},${origin.z.toFixed(2)}) dir=(${dir.x.toFixed(3)},${dir.y.toFixed(3)},${dir.z.toFixed(3)}) maxKm=${maxRangeKm.toFixed(1)} bodies=${physics.rigidBodies?.size ?? 'n/a'}`); } catch (_) {}
	}

	let remainingKm = maxRangeKm;
	let currentOrigin = origin.clone();
	let steps = 0;
	const maxSteps = 6;
	while (remainingKm > 0.01 && steps < maxSteps) {
		const result = physics.raycast(currentOrigin, dir, remainingKm);
		if (!result || !result.hit) break;
		const entity = result.entity;
		const distanceKm = result.distance;
		if (isDamageable(entity)) {
			if (DEBUG_LOG_HITSCAN) { try { console.log(`✅ PHYSICS HIT: ${entity?.type || 'unknown'} @ ${distanceKm.toFixed(3)}km`); } catch (_) {} }
			return { hit: true, point: result.point, entity, distance: distanceKm };
		}
		// If metadata carries a ship ref even if flagged non-damageable (e.g., station), accept
		if (entity && entity.ship) {
			if (DEBUG_LOG_HITSCAN) { try { console.log(`✅ PHYSICS HIT (ship-ref): ${entity?.type || 'unknown'} @ ${distanceKm.toFixed(3)}km`); } catch (_) {} }
			return { hit: true, point: result.point, entity, distance: distanceKm };
		}
		const advanceKm = Math.max(0.05, Math.min(0.2, remainingKm * 0.1));
		const advanceVec = dir.clone().multiplyScalar(distanceKm + advanceKm);
		currentOrigin = currentOrigin.clone().add(advanceVec);
		remainingKm -= (distanceKm + advanceKm);
		steps++;
	}

	if (DEBUG_LOG_HITSCAN) { try { console.log('❌ PHYSICS MISS: applying tolerance fallbacks'); } catch (_) {} }

	// Physics-first scan
	try {
		let tolKmScan = 0.030; // 30m tolerance to allow reasonable near-line hits
		const scanHit = findNearestPhysicsShipHit(origin, dir, maxRangeKm, tolKmScan);
		if (scanHit) {
			if (DEBUG_LOG_HITSCAN) { try { console.log(`✅ SCAN HIT: lateral<=${tolKmScan}km at ${scanHit.distance.toFixed(3)}km`); } catch (_) {} }
			return scanHit;
		}
	} catch (_) {}

	// Lock tolerance
	try {
		if (intendedTarget && (intendedTarget.position || intendedTarget.ship)) {
			const cam = ship?.starfieldManager?.camera || ship?.viewManager?.camera || ship?.camera || null;
			const pc = resolvePhysicsCenterForShip(intendedTarget.ship || intendedTarget);
			const fallbackPos = intendedTarget.position ? new THREE.Vector3(intendedTarget.position.x, intendedTarget.position.y, intendedTarget.position.z) : null;
			const targetPos = pc || fallbackPos;
			if (targetPos) {
				const ray = new THREE.Ray(origin.clone(), dir.clone());
				const lateralKm = ray.distanceToPoint(targetPos);
				const targetDistKm = cam ? cam.position.distanceTo(targetPos) : origin.distanceTo(targetPos);
				let tolKm = CrosshairTargeting.calculateAimTolerance(targetDistKm, 'weapon');
				if (DEBUG_LOG_HITSCAN) { try { console.log(`🎯 LOCK TOL: distToRay=${lateralKm.toFixed(4)}km tol=${tolKm.toFixed(4)}km targetDist=${targetDistKm.toFixed(3)}km (physCenter=${!!pc})`); } catch (_) {} }
				if (lateralKm <= tolKm && targetDistKm <= maxRangeKm) {
					const closestPoint = new THREE.Vector3();
					ray.closestPointToPoint(targetPos, closestPoint);
					let shipRef = intendedTarget.ship || intendedTarget;
					if (!shipRef) {
						const nearest = findPhysicsShipAtPoint(closestPoint, 0.050);
						if (nearest) shipRef = nearest.ship;
					}
					if (!shipRef) {
						// Do not synthesize a hit without a valid ship reference
						return null;
					}
					const syntheticEntity = { type: 'enemy_ship', ship: shipRef, threeObject: null, id: shipRef?.shipName || 'laser_tol' };
					if (DEBUG_LOG_HITSCAN) { try { console.log('✅ LOCK TOLERANCE HIT'); } catch (_) {} }
					return { hit: true, point: closestPoint, entity: syntheticEntity, distance: targetDistKm };
				}
			}
		}
	} catch (_) {}

	// Crosshair tolerance
	try {
		const cam = ship?.starfieldManager?.camera || ship?.viewManager?.camera || ship?.camera || null;
		if (cam && THREE) {
			const ct = CrosshairTargeting.getCrosshairTarget(cam, maxRangeKm, 'LASER');
			if (ct && (ct.ship || ct.position)) {
				const pc = resolvePhysicsCenterForShip(ct.ship);
				const fallbackPos = ct.position ? new THREE.Vector3(ct.position.x, ct.position.y, ct.position.z) : null;
				const targetPos = pc || fallbackPos;
				if (targetPos) {
					const ray = new THREE.Ray(origin.clone(), dir.clone());
					const lateralKm = ray.distanceToPoint(targetPos);
					const targetDistKm = cam.position.distanceTo(targetPos);
					let tolKm = CrosshairTargeting.calculateAimTolerance(targetDistKm, 'weapon');
					if (DEBUG_LOG_HITSCAN) { try { console.log(`🎯 XHAIR TOL: distToRay=${lateralKm.toFixed(4)}km tol=${tolKm.toFixed(4)}km targetDist=${targetDistKm.toFixed(3)}km (physCenter=${!!pc})`); } catch (_) {} }
					if (lateralKm <= tolKm && targetDistKm <= maxRangeKm) {
						const closestPoint = new THREE.Vector3();
						ray.closestPointToPoint(targetPos, closestPoint);
						let shipRef = ct.ship;
						if (!shipRef) {
							const nearest = findPhysicsShipAtPoint(closestPoint, 0.050);
							if (nearest) shipRef = nearest.ship;
						}
						const syntheticEntity = { type: 'enemy_ship', ship: shipRef, threeObject: null, id: shipRef?.shipName || 'laser_xhair' };
						if (DEBUG_LOG_HITSCAN) { try { console.log('✅ XHAIR TOLERANCE HIT'); } catch (_) {} }
						return { hit: true, point: closestPoint, entity: syntheticEntity, distance: targetDistKm };
					}
				}
			}
		}
	} catch (_) {}

	return { hit: false, point: null, entity: null, distance: 0 };
}



