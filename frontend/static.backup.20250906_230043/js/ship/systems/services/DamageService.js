// DamageService - centralizes damage application

export function applyDamageToEntity(entity, damage, damageType = 'energy', subsystem = null) {
	if (!entity) return false;
	const ship = entity.ship || entity; // accept either wrapped entity or ship
	if (!ship || typeof ship.applyDamage !== 'function') return false;

	if (subsystem) {
		ship.applyDamage(damage, damageType, subsystem.systemName || subsystem);
		return true;
	}

	ship.applyDamage(damage, damageType);
	return true;
}


