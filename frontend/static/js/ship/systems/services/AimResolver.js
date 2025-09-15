// AimResolver - centralized helpers to get fire origin and direction from active camera

export function getActiveCamera(ship) {
	const camera = ship?.starfieldManager?.camera
		|| ship?.viewManager?.camera
		|| ship?.camera
		|| window.starfieldManager?.camera
		|| null;
	return camera || null;
}

export function getFireOrigin(ship) {
	const camera = getActiveCamera(ship);
	if (camera && camera.position) {
		return camera.position.clone();
	}
	// Fallback to ship position if no camera
	return ship?.position?.clone ? ship.position.clone() : ship?.position || null;
}

export function getFireDirection(ship) {
	const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
	const camera = getActiveCamera(ship);
	if (!THREE || !camera) return null;
	const dir = new THREE.Vector3(0, 0, -1);
	dir.applyQuaternion(camera.quaternion).normalize();
	return dir;
}

