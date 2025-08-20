// TargetFilter - central classification logic used by hit-scan/projectiles

export function isCelestial(entity) {
	if (!entity) return false;
	return entity.type === 'star' || entity.type === 'planet' || entity.type === 'moon';
}

export function isDamageable(entity) {
	return !!entity && !isCelestial(entity);
}


