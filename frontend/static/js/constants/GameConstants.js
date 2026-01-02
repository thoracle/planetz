/**
 * GameConstants.js - General game configuration constants
 *
 * Centralized source of truth for game-wide settings including
 * rendering, timing, and general gameplay parameters.
 */

/**
 * Starfield rendering constants
 */
export const STARFIELD = {
    STAR_COUNT: 40000,               // Number of background stars
    MIN_STAR_SIZE: 0.5,              // Minimum star sprite size
    MAX_STAR_SIZE: 2.0,              // Maximum star sprite size
    PARALLAX_FACTOR: 0.1,            // Parallax movement factor
};

/**
 * UI timing constants (milliseconds)
 */
export const UI_TIMING = {
    HUD_MESSAGE_DURATION: 3000,      // Default HUD message display time
    EPHEMERAL_MESSAGE_DURATION: 5000, // Ephemeral notification duration
    TOOLTIP_DELAY: 500,              // Delay before showing tooltips
    ANIMATION_DURATION: 300,         // Default CSS animation duration
    FADE_DURATION: 200,              // Fade in/out duration
};

/**
 * Discovery system constants
 */
export const DISCOVERY = {
    DISCOVERY_RANGE_KM: 10,          // Distance to discover objects
    NOTIFICATION_COOLDOWN_MS: 5000,  // Cooldown between duplicate notifications
};

/**
 * Mission system constants
 */
export const MISSIONS = {
    MAX_ACTIVE_MISSIONS: 5,          // Maximum concurrent active missions
    REWARD_MULTIPLIER_BASE: 1.0,     // Base reward multiplier
};

/**
 * Audio constants
 */
export const AUDIO = {
    MASTER_VOLUME: 0.7,              // Default master volume (0-1)
    SFX_VOLUME: 0.8,                 // Sound effects volume
    MUSIC_VOLUME: 0.5,               // Background music volume
};

/**
 * Physics/collision constants
 */
export const PHYSICS = {
    COLLISION_CHECK_INTERVAL_MS: 50, // How often to check collisions
    PROJECTILE_LIFETIME_MS: 5000,    // How long projectiles exist
    EXPLOSION_DURATION_MS: 1000,     // Visual explosion duration
};

/**
 * Camera constants
 */
export const CAMERA = {
    FOV: 75,                         // Field of view in degrees
    NEAR_CLIP: 0.1,                  // Near clipping plane
    FAR_CLIP: 100000,                // Far clipping plane
};

/**
 * Z-index layering constants for UI elements
 */
export const Z_INDEX = {
    GAME_CANVAS: 0,
    STARFIELD: 100,
    HUD_BACKGROUND: 1000,
    HUD_ELEMENTS: 5000,
    HUD_OVERLAY: 10000,
    MODAL_BACKDROP: 15000,
    MODAL_CONTENT: 16000,
    DIRECTION_ARROWS: 25000,
    TOOLTIPS: 30000,
    DEBUG_OVERLAY: 50000,
};

/**
 * Default export for convenient destructuring
 */
export default {
    STARFIELD,
    UI_TIMING,
    DISCOVERY,
    MISSIONS,
    AUDIO,
    PHYSICS,
    CAMERA,
    Z_INDEX,
};
