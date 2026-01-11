/**
 * GlobalNamespace.js
 *
 * Organizes all window.* globals under a unified window.PLANETZ namespace.
 * Provides backward-compatible aliases so existing code continues to work.
 *
 * Usage:
 *   import { PLANETZ, registerManager, registerUI } from './core/GlobalNamespace.js';
 *
 *   // Register a manager (creates backward-compatible alias)
 *   registerManager('starfield', starfieldManagerInstance);
 *
 *   // Access via namespace
 *   PLANETZ.managers.starfield
 *
 *   // Or via legacy alias (still works)
 *   window.starfieldManager
 */

// Initialize the PLANETZ namespace
window.PLANETZ = window.PLANETZ || {
    // Core game managers
    managers: {
        starfield: null,
        view: null,
        spatial: null,
        collision: null,
        targetComputer: null,
        navigation: null,
        starCharts: null,
        waypoint: null,
        waypointKeyboard: null,
        audio: null,
        projectile: null,
        targeting: null
    },

    // UI components
    ui: {
        cardInventory: null,
        helpInterface: null,
        missionStatus: null,
        damageControl: null,
        communication: null,
        stationRepair: null,
        missionCompletion: null,
        missionCompletionScreen: null,
        missionNotification: null,
        cardReward: null,
        diplomacy: null
    },

    // Audio systems
    audio: {
        starfield: null
    },

    // Debug utilities
    debug: {
        manager: null,
        enable: null,
        disable: null,
        toggle: null,
        status: null,
        stats: null,
        states: null,
        reset: null,
        list: null,
        p1: null
    },

    // Error reporting
    error: {
        reporter: null,
        getReport: null,
        download: null,
        clear: null
    },

    // Testing utilities
    testing: {
        checkAchievements: null,
        testNotification: null,
        checkDiscoveries: null,
        testHUD: null,
        checkActiveProjectiles: null
    },

    // Ready flags for async initialization
    ready: {
        starfieldManager: false,
        spatialManager: false,
        collisionManager: false
    },

    // Player data
    player: {
        credits: null,
        shipLog: null
    },

    // Game configuration
    config: {
        game: null,
        verbose: false
    },

    // External libraries
    libs: {
        THREE: null
    }
};

// Export for ES6 module usage
export const PLANETZ = window.PLANETZ;

/**
 * Mapping of namespace paths to legacy window property names
 * Format: { 'namespace.path': 'legacyWindowName' }
 */
const LEGACY_ALIASES = {
    // Managers
    'managers.starfield': 'starfieldManager',
    'managers.view': 'viewManager',
    'managers.spatial': 'spatialManager',
    'managers.collision': 'collisionManager',
    'managers.targetComputer': 'targetComputerManager',
    'managers.navigation': 'navigationSystemManager',
    'managers.starCharts': 'starChartsManager',
    'managers.waypoint': 'waypointManager',
    'managers.waypointKeyboard': 'waypointKeyboardHandler',
    'managers.audio': 'starfieldAudioManager',
    'managers.projectile': 'simpleProjectileManager',
    'managers.targeting': 'targetingService',

    // UI
    'ui.cardInventory': 'cardInventoryUI',
    'ui.helpInterface': 'helpInterface',
    'ui.missionStatus': 'missionStatusHUD',
    'ui.communication': 'communicationHUD',
    'ui.stationRepair': 'stationRepairInterface',
    'ui.missionCompletion': 'missionCompletionUI',
    'ui.missionCompletionScreen': 'missionCompletionScreen',
    'ui.missionNotification': 'missionNotificationHandler',
    'ui.cardReward': 'cardRewardAnimator',
    'ui.damageControl': 'simplifiedDamageControl',

    // Debug
    'debug.manager': 'smartDebugManager',

    // Error
    'error.reporter': 'errorReporter',

    // Player
    'player.credits': 'playerCredits',
    'player.shipLog': 'shipLog',

    // Ready flags
    'ready.starfieldManager': 'starfieldManagerReady',
    'ready.spatialManager': 'spatialManagerReady',
    'ready.collisionManager': 'collisionManagerReady'
};

/**
 * Create a backward-compatible alias using Object.defineProperty
 * This allows both old code (window.starfieldManager) and new code
 * (PLANETZ.managers.starfield) to work seamlessly.
 *
 * @param {string} namespacePath - Path in PLANETZ (e.g., 'managers.starfield')
 * @param {string} legacyName - Legacy window property name (e.g., 'starfieldManager')
 */
function createBackwardCompatibleAlias(namespacePath, legacyName) {
    const parts = namespacePath.split('.');
    const category = parts[0];
    const key = parts[1];

    // Only create alias if it doesn't already exist as a real property
    if (!(legacyName in window) || window[legacyName] === undefined || window[legacyName] === null) {
        try {
            Object.defineProperty(window, legacyName, {
                get() {
                    return PLANETZ[category]?.[key];
                },
                set(value) {
                    if (PLANETZ[category]) {
                        PLANETZ[category][key] = value;
                    }
                },
                configurable: true,
                enumerable: true
            });
        } catch (e) {
            // Property might already be defined with a different configuration
            // This is fine - the old code will continue to work
        }
    }
}

/**
 * Register a manager in the PLANETZ namespace
 * @param {string} name - Manager name (e.g., 'starfield', 'view', 'spatial')
 * @param {Object} instance - Manager instance
 */
export function registerManager(name, instance) {
    if (PLANETZ.managers.hasOwnProperty(name)) {
        PLANETZ.managers[name] = instance;

        // Find and apply legacy alias if exists
        const aliasPath = `managers.${name}`;
        if (LEGACY_ALIASES[aliasPath]) {
            window[LEGACY_ALIASES[aliasPath]] = instance;
        }
    } else {
        console.warn(`Unknown manager name: ${name}. Add to PLANETZ.managers first.`);
        PLANETZ.managers[name] = instance;
    }
}

/**
 * Register a UI component in the PLANETZ namespace
 * @param {string} name - UI component name (e.g., 'cardInventory', 'helpInterface')
 * @param {Object} instance - UI component instance
 */
export function registerUI(name, instance) {
    if (PLANETZ.ui.hasOwnProperty(name)) {
        PLANETZ.ui[name] = instance;

        // Find and apply legacy alias if exists
        const aliasPath = `ui.${name}`;
        if (LEGACY_ALIASES[aliasPath]) {
            window[LEGACY_ALIASES[aliasPath]] = instance;
        }
    } else {
        console.warn(`Unknown UI name: ${name}. Add to PLANETZ.ui first.`);
        PLANETZ.ui[name] = instance;
    }
}

/**
 * Register a debug utility in the PLANETZ namespace
 * @param {string} name - Debug utility name
 * @param {Function|Object} utility - Debug utility
 */
export function registerDebug(name, utility) {
    PLANETZ.debug[name] = utility;

    const aliasPath = `debug.${name}`;
    if (LEGACY_ALIASES[aliasPath]) {
        window[LEGACY_ALIASES[aliasPath]] = utility;
    }
}

/**
 * Register an error utility in the PLANETZ namespace
 * @param {string} name - Error utility name
 * @param {Function|Object} utility - Error utility
 */
export function registerError(name, utility) {
    PLANETZ.error[name] = utility;

    const aliasPath = `error.${name}`;
    if (LEGACY_ALIASES[aliasPath]) {
        window[LEGACY_ALIASES[aliasPath]] = utility;
    }
}

/**
 * Set a ready flag in the PLANETZ namespace
 * @param {string} name - Ready flag name (e.g., 'starfieldManager')
 * @param {boolean} value - Ready state
 */
export function setReady(name, value) {
    if (PLANETZ.ready.hasOwnProperty(name)) {
        PLANETZ.ready[name] = value;

        const aliasPath = `ready.${name}`;
        if (LEGACY_ALIASES[aliasPath]) {
            window[LEGACY_ALIASES[aliasPath]] = value;
        }
    }
}

/**
 * Register player data in the PLANETZ namespace
 * @param {string} name - Player data name (e.g., 'credits', 'shipLog')
 * @param {Object} instance - Player data instance
 */
export function registerPlayer(name, instance) {
    PLANETZ.player[name] = instance;

    const aliasPath = `player.${name}`;
    if (LEGACY_ALIASES[aliasPath]) {
        window[LEGACY_ALIASES[aliasPath]] = instance;
    }
}

/**
 * Get a manager from the PLANETZ namespace
 * @param {string} name - Manager name
 * @returns {Object|null} Manager instance or null
 */
export function getManager(name) {
    return PLANETZ.managers[name] || null;
}

/**
 * Get a UI component from the PLANETZ namespace
 * @param {string} name - UI component name
 * @returns {Object|null} UI component instance or null
 */
export function getUI(name) {
    return PLANETZ.ui[name] || null;
}

/**
 * Check if a manager is ready
 * @param {string} name - Manager name
 * @returns {boolean} Whether the manager is ready
 */
export function isReady(name) {
    return PLANETZ.ready[name] === true;
}

/**
 * Initialize backward-compatible aliases for all mapped properties
 * Call this early in app initialization before any managers are created
 */
export function initializeAliases() {
    for (const [namespacePath, legacyName] of Object.entries(LEGACY_ALIASES)) {
        createBackwardCompatibleAlias(namespacePath, legacyName);
    }
}

/**
 * Get a summary of the current namespace state
 * @returns {Object} Summary of registered managers and UI components
 */
export function getNamespaceSummary() {
    const summary = {
        managers: {},
        ui: {},
        ready: { ...PLANETZ.ready }
    };

    for (const [key, value] of Object.entries(PLANETZ.managers)) {
        summary.managers[key] = value !== null ? 'registered' : 'null';
    }

    for (const [key, value] of Object.entries(PLANETZ.ui)) {
        summary.ui[key] = value !== null ? 'registered' : 'null';
    }

    return summary;
}

// Expose namespace summary for debugging
window.PLANETZ_SUMMARY = getNamespaceSummary;
