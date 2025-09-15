// RangeUnits - helpers to normalize weapon ranges

export function normalizeRangeKm(value) {
	if (typeof value !== 'number' || !isFinite(value)) return 24; // default 24km
	return value <= 200 ? value : value / 1000; // <=200 -> km, otherwise meters → km
}

export function kmToMeters(km) {
	return (typeof km === 'number' && isFinite(km)) ? km * 1000 : 0;
}

