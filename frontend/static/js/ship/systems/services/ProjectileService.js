// ProjectileService - spawns projectiles using current aiming
import { debug } from '../../../debug.js';
import { getFireOrigin } from './AimResolver.js';

export function spawnProjectileForWeapon(ship, weaponCard) {
	try {
		const origin = getFireOrigin(ship);
		if (!origin) return null;
		// Defer to existing weapon card API to preserve behavior
		return weaponCard.createProjectile(origin, ship?.weaponSystem?.lockedTarget || null);
	} catch (e) {
		debug('COMBAT', 'ProjectileService.spawnProjectileForWeapon failed:', e?.message || e);
		return null;
	}
}

