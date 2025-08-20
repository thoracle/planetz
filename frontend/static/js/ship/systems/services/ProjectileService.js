// ProjectileService - spawns projectiles using current aiming
import { getFireOrigin, getFireDirection } from './AimResolver.js';

export function spawnProjectileForWeapon(ship, weaponCard) {
	try {
		const origin = getFireOrigin(ship);
		const dir = getFireDirection(ship);
		if (!origin || !dir) return null;
		// Defer to existing weapon card API to preserve behavior
		return weaponCard.createProjectile(origin, ship?.weaponSystem?.lockedTarget || null);
	} catch (e) {
		console.warn('ProjectileService.spawnProjectileForWeapon failed:', e?.message || e);
		return null;
	}
}


