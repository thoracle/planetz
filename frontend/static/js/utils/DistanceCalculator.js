import { debug } from '../debug.js';

/**
 * DistanceCalculator - Unified distance calculation utility
 *
 * Provides consistent, optimized 3D distance calculations across all game systems.
 * Eliminates duplicate implementations and ensures mathematical accuracy.
 *
 * Features:
 * - Standardized coordinate format handling ({x, y, z} objects)
 * - Robust error handling with consistent return values
 * - Performance-optimized calculations
 * - Comprehensive validation
 * - Debug logging support
 */
export class DistanceCalculator {
    /**
     * Calculate Euclidean distance between two 3D points
     * @param {Object|Array|Vector3} point1 - First point (accepts {x,y,z}, [x,y,z], or Vector3)
     * @param {Object|Array|Vector3} point2 - Second point (accepts {x,y,z}, [x,y,z], or Vector3)
     * @returns {number} Distance between points, or Infinity if invalid
     */
    static calculate(point1, point2) {
        try {
            // Validate inputs
            if (!point1 || !point2) {
                debug('TARGETING', 'DistanceCalculator: Invalid points provided', { point1, point2 });
                return Infinity;
            }

            // Convert to standardized format
            const coord1 = this.standardizeCoordinates(point1);
            const coord2 = this.standardizeCoordinates(point2);

            // Validate coordinate objects
            if (!this.validateCoordinates(coord1) || !this.validateCoordinates(coord2)) {
                debug('TARGETING', 'DistanceCalculator: Invalid coordinate format', { coord1, coord2 });
                return Infinity;
            }

            // Calculate Euclidean distance
            const dx = coord1.x - coord2.x;
            const dy = coord1.y - coord2.y;
            const dz = coord1.z - coord2.z;

            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

            // Validate result
            if (!isFinite(distance)) {
                debug('TARGETING', 'DistanceCalculator: Invalid distance result', { distance, coord1, coord2 });
                return Infinity;
            }

            return distance;

        } catch (error) {
            debug('TARGETING', 'DistanceCalculator: Error calculating distance', error);
            return Infinity;
        }
    }

    /**
     * Calculate squared distance (faster for comparisons)
     * @param {Object|Array|Vector3} point1 - First point
     * @param {Object|Array|Vector3} point2 - Second point
     * @returns {number} Squared distance between points
     */
    static calculateSquared(point1, point2) {
        try {
            const coord1 = this.standardizeCoordinates(point1);
            const coord2 = this.standardizeCoordinates(point2);

            if (!this.validateCoordinates(coord1) || !this.validateCoordinates(coord2)) {
                return Infinity;
            }

            const dx = coord1.x - coord2.x;
            const dy = coord1.y - coord2.y;
            const dz = coord1.z - coord2.z;

            return dx * dx + dy * dy + dz * dz;

        } catch (error) {
            debug('TARGETING', 'DistanceCalculator: Error calculating squared distance', error);
            return Infinity;
        }
    }

    /**
     * Convert various coordinate formats to standardized {x, y, z} format
     * @param {Object|Array|Vector3} coords - Input coordinates
     * @returns {Object} Standardized coordinates {x, y, z}
     */
    static standardizeCoordinates(coords) {
        if (!coords) return null;

        // Handle Three.js Vector3
        if (typeof coords === 'object' && 'isVector3' in coords) {
            return { x: coords.x, y: coords.y, z: coords.z };
        }

        // Handle array format [x, y, z]
        if (Array.isArray(coords) && coords.length >= 3) {
            return { x: coords[0], y: coords[1], z: coords[2] };
        }

        // Handle object format {x, y, z}
        if (typeof coords === 'object' && 'x' in coords && 'y' in coords && 'z' in coords) {
            return { x: coords.x, y: coords.y, z: coords.z };
        }

        // Handle nested coordinates (e.g., from star chart objects)
        if (typeof coords === 'object' && coords.coordinates) {
            return this.standardizeCoordinates(coords.coordinates);
        }

        return null;
    }

    /**
     * Validate coordinate object has required properties
     * @param {Object} coords - Coordinate object to validate
     * @returns {boolean} True if valid
     */
    static validateCoordinates(coords) {
        if (!coords || typeof coords !== 'object') return false;

        const { x, y, z } = coords;
        return typeof x === 'number' && typeof y === 'number' && typeof z === 'number' &&
               isFinite(x) && isFinite(y) && isFinite(z);
    }

    /**
     * Check if distance is within range (useful for proximity checks)
     * @param {Object|Array|Vector3} point1 - First point
     * @param {Object|Array|Vector3} point2 - Second point
     * @param {number} maxDistance - Maximum allowed distance
     * @returns {boolean} True if within range
     */
    static isWithinRange(point1, point2, maxDistance) {
        const squaredDistance = this.calculateSquared(point1, point2);
        return squaredDistance <= (maxDistance * maxDistance);
    }

    /**
     * Find closest point from a list of points
     * @param {Object|Array|Vector3} targetPoint - Target point
     * @param {Array} pointList - Array of points to check
     * @returns {Object} {point, distance, index} of closest point
     */
    static findClosestPoint(targetPoint, pointList) {
        if (!Array.isArray(pointList) || pointList.length === 0) {
            return null;
        }

        let closest = null;
        let minDistance = Infinity;
        let closestIndex = -1;

        pointList.forEach((point, index) => {
            const distance = this.calculate(targetPoint, point);
            if (distance < minDistance) {
                minDistance = distance;
                closest = point;
                closestIndex = index;
            }
        });

        return {
            point: closest,
            distance: minDistance,
            index: closestIndex
        };
    }

    /**
     * Calculate Manhattan distance (for grid-based systems)
     * @param {Object|Array|Vector3} point1 - First point
     * @param {Object|Array|Vector3} point2 - Second point
     * @returns {number} Manhattan distance
     */
    static calculateManhattan(point1, point2) {
        const coord1 = this.standardizeCoordinates(point1);
        const coord2 = this.standardizeCoordinates(point2);

        if (!this.validateCoordinates(coord1) || !this.validateCoordinates(coord2)) {
            return Infinity;
        }

        return Math.abs(coord1.x - coord2.x) +
               Math.abs(coord1.y - coord2.y) +
               Math.abs(coord1.z - coord2.z);
    }
}
