/**
 * TargetingConstants.js - Targeting system constants and colors
 *
 * Centralized source of truth for target computer configuration,
 * wireframe colors, and diplomacy-related visual settings.
 */

/**
 * Target computer timing constants
 */
export const TARGETING_TIMING = {
    SORT_INTERVAL_MS: 2000,          // How often to re-sort target list (ms)
    FULL_SCAN_INTERVAL_MS: 30000,    // Time between full target scans (ms)
    TARGET_CYCLE_DEBOUNCE_MS: 200,   // Minimum time between target cycles (ms)
    OUTLINE_UPDATE_INTERVAL_MS: 100, // How often to update 3D outline (ms)
};

/**
 * Target computer range constants (in km)
 */
export const TARGETING_RANGE = {
    MAX_CYCLING_RANGE: 500,          // Maximum range for target cycling
    DISCOVERY_RANGE: 10,             // Range at which objects are discovered
    SCANNER_RANGE: 1000,             // Long-range scanner maximum range
    INFINITY_DISTANCE: 999999,       // Value used for "infinite" distance
};

/**
 * Wireframe display colors (hex values for Three.js)
 * These colors indicate the diplomatic relationship with targets
 */
export const WIREFRAME_COLORS = {
    // Diplomacy-based colors
    HOSTILE: 0xff3333,               // Red - enemy/hostile targets
    FRIENDLY: 0x44ff44,              // Green - allied/friendly targets
    NEUTRAL: 0xffff44,               // Yellow - neutral targets
    UNKNOWN: 0x44ffff,               // Cyan/Teal - undiscovered or unknown faction

    // Special object colors
    WAYPOINT: 0xff00ff,              // Magenta - mission waypoints
    DEFAULT: 0x00ff41,               // Terminal green - default/fallback

    // System status colors (for sub-targeting)
    SYSTEM_HEALTHY: 0x00ff41,        // Green - system at full health
    SYSTEM_DAMAGED: 0xffff00,        // Yellow - system damaged
    SYSTEM_CRITICAL: 0xff8800,       // Orange - system critical
    SYSTEM_DESTROYED: 0xff0000,      // Red - system destroyed
};

/**
 * Wireframe colors as CSS strings (for HTML elements)
 */
export const WIREFRAME_COLORS_CSS = {
    HOSTILE: '#ff3333',
    FRIENDLY: '#44ff44',
    NEUTRAL: '#ffff44',
    UNKNOWN: '#44ffff',
    WAYPOINT: '#ff00ff',
    DEFAULT: '#00ff41',
};

/**
 * Wireframe geometry constants
 */
export const WIREFRAME_GEOMETRY = {
    // Camera positions for wireframe rendering
    MAIN_CAMERA_Z: 5,                // Main wireframe camera distance
    SUBSYSTEM_CAMERA_Z: 4,           // Sub-system wireframe camera distance

    // Animation speeds
    ROTATION_SPEED_X: 0.005,         // Wireframe X rotation per frame
    ROTATION_SPEED_Y: 0.01,          // Wireframe Y rotation per frame

    // Default geometry parameters
    DEFAULT_RADIUS: 1,               // Default wireframe radius
    DEFAULT_SEGMENTS: 8,             // Default segment count for geometry
};

/**
 * Sub-system wireframe geometry parameters
 */
export const SUBSYSTEM_GEOMETRY = {
    // Engine geometry
    ENGINE: {
        RADIUS: 0.8,
        HEIGHT: 1.5,
        SEGMENTS: 8,
    },

    // Reactor geometry (torus)
    REACTOR: {
        MAJOR_RADIUS: 1.0,
        MINOR_RADIUS: 0.3,
        MAJOR_SEGMENTS: 12,
        MINOR_SEGMENTS: 6,
    },

    // Scanner geometry (dish)
    SCANNER: {
        DISH_RADIUS: 1.2,
        DISH_SEGMENTS: 12,
    },

    // Shield geometry (hexagon)
    SHIELD: {
        RADIUS: 1.0,
        HEIGHT: 0.8,
        SIDES: 6,
    },
};

/**
 * Direction arrow constants
 */
export const DIRECTION_ARROWS = {
    Z_INDEX: 25000,                  // Z-index for direction arrows (above all UI)
    SIZE: 20,                        // Arrow size in pixels
    OFFSET: 40,                      // Offset from screen edge
};

/**
 * Default export for convenient destructuring
 */
export default {
    TARGETING_TIMING,
    TARGETING_RANGE,
    WIREFRAME_COLORS,
    WIREFRAME_COLORS_CSS,
    WIREFRAME_GEOMETRY,
    SUBSYSTEM_GEOMETRY,
    DIRECTION_ARROWS,
};
