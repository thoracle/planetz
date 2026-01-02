/**
 * ShipConstants.js - Ship movement, rotation, and docking constants
 *
 * Centralized source of truth for all ship physics and movement parameters.
 * These values are tuned for the current game feel and should be adjusted here
 * rather than scattered throughout the codebase.
 */

/**
 * Ship movement constants
 */
export const SHIP_MOVEMENT = {
    // Speed settings
    MAX_SPEED: 9,                    // Maximum impulse speed (0-9 scale)
    ACCELERATION: 0.02,              // How quickly ship speeds up
    DECELERATION: 0.03,              // How quickly ship slows down (slightly faster than acceleration)

    // Rotation settings
    ROTATION_SPEED: 2.0,             // Base rotation speed in radians per second
    ROTATION_ACCELERATION: 0.0008,   // How quickly rotation speeds up
    ROTATION_DECELERATION: 0.0012,   // How quickly rotation slows down
    MAX_ROTATION_SPEED: 0.025,       // Maximum rotation velocity

    // Mouse look (currently disabled)
    MOUSE_SENSITIVITY: 0.002,        // Mouse look sensitivity
};

/**
 * Docking system constants
 */
export const DOCKING = {
    ORBIT_RADIUS: 1.5,               // Distance from station when docked (km)
    ORBIT_SPEED: 0.001,              // Orbital rotation speed (radians per frame)
    DOCKING_RANGE: 1.5,              // Maximum distance to initiate docking (km)
    UNDOCK_COOLDOWN_MS: 10000,       // Cooldown after undocking before targeting works (ms)
};

/**
 * Energy system constants
 */
export const ENERGY = {
    // Impulse engine energy consumption multipliers by speed level
    IMPULSE_CONSUMPTION_MULTIPLIERS: [0, 1, 2, 3, 4, 5, 7, 9, 12, 15],
    BASE_IMPULSE_CONSUMPTION: 1,     // Base energy per tick at speed 1
};

/**
 * Default export for convenient destructuring
 */
export default {
    SHIP_MOVEMENT,
    DOCKING,
    ENERGY,
};
