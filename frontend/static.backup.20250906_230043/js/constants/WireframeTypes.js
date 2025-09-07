/**
 * WireframeTypes.js - Centralized source of truth for wireframe type mappings
 *
 * This file contains the single unified mapping from object types to wireframe geometries.
 * All wireframe-related code should use this centralized data instead of scattered normalization logic.
 */

export const WIREFRAME_TYPES = {
    // Core celestial objects
    'star': {
        geometry: 'star',
        description: 'Radiating star geometry',
        priority: 1
    },
    'planet': {
        geometry: 'icosahedron',
        description: 'Icosahedral sphere geometry',
        priority: 1
    },
    'moon': {
        geometry: 'octahedron',
        description: 'Octahedral geometry',
        priority: 1
    },

    // Infrastructure objects
    'navigation_beacon': {
        geometry: 'octahedron',
        description: 'Simple pyramid beacon geometry',
        priority: 1
    },
    'space_station': {
        geometry: 'torus',
        description: 'Torus ring geometry',
        priority: 1
    },

    // Ship types
    'enemy_ship': {
        geometry: 'box',
        description: 'Cubic box geometry',
        priority: 2
    },
    'ship': {
        geometry: 'box',
        description: 'Cubic box geometry',
        priority: 2
    }, // Alias for enemy_ship

    // Station aliases for backward compatibility
    'station': {
        geometry: 'torus',
        description: 'Torus ring geometry',
        priority: 1
    }, // Alias for space_station

    // Fallback for unknown types
    'unknown': {
        geometry: 'icosahedron',
        description: 'Default icosahedral geometry',
        priority: 99
    }
};

/**
 * Get wireframe type configuration for a given object type
 * @param {string} objectType - The object type from database
 * @returns {Object} Wireframe configuration with geometry and description
 */
export function getWireframeType(objectType) {
    if (!objectType || typeof objectType !== 'string') {
        return WIREFRAME_TYPES.unknown;
    }

    const normalizedType = objectType.toLowerCase().trim();
    return WIREFRAME_TYPES[normalizedType] || WIREFRAME_TYPES.unknown;
}

/**
 * Check if an object type has a defined wireframe mapping
 * @param {string} objectType - The object type to check
 * @returns {boolean} True if wireframe type is defined
 */
export function hasWireframeType(objectType) {
    if (!objectType || typeof objectType !== 'string') {
        return false;
    }

    const normalizedType = objectType.toLowerCase().trim();
    return WIREFRAME_TYPES[normalizedType] !== undefined;
}

/**
 * Get all supported object types for wireframes
 * @returns {string[]} Array of supported object types
 */
export function getSupportedObjectTypes() {
    return Object.keys(WIREFRAME_TYPES).filter(type => type !== 'unknown');
}

/**
 * Get wireframe types sorted by priority
 * @returns {Object} Wireframe types sorted by priority
 */
export function getWireframeTypesByPriority() {
    const entries = Object.entries(WIREFRAME_TYPES);
    return entries.sort(([,a], [,b]) => a.priority - b.priority)
                   .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
}
