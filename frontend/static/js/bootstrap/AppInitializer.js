/**
 * Application Initializer for the PlanetZ game.
 * Extracted from app.js to reduce file size and improve modularity.
 *
 * Handles:
 * - Manager creation (ViewManager, StarfieldManager, SolarSystemManager, etc.)
 * - Three.js spatial systems initialization
 * - Universe data loading and initial system generation
 * - Global manager exposure for debugging
 */

import * as THREE from 'three';
import { ViewManager } from '../views/ViewManager.js';
import { StarfieldManager } from '../views/StarfieldManager.js';
import { SolarSystemManager } from '../SolarSystemManager.js';
import SpatialManager from '../SpatialManager.js';
import SimpleCollisionManager from '../SimpleCollisionManager.js';
import SimpleDockingManager from '../SimpleDockingManager.js';
import { WaypointManager } from '../waypoints/WaypointManager.js';
import { WaypointKeyboardHandler } from '../waypoints/WaypointKeyboardHandler.js';
import { GameObjectFactory } from '../core/GameObjectFactory.js';
import { SmartDebugManager } from '../utils/DebugManager.js';
import { getAchievementSystem } from '../systems/AchievementSystem.js';
import { debug } from '../debug.js';
import { registerManager, registerDebug, setReady } from '../core/GlobalNamespace.js';

/**
 * Managers object containing all initialized managers
 * @typedef {Object} ManagersResult
 * @property {ViewManager} viewManager
 * @property {StarfieldManager} starfieldManager
 * @property {SolarSystemManager} solarSystemManager
 * @property {SpatialManager} spatialManager
 * @property {SimpleCollisionManager} collisionManager
 * @property {WaypointManager} waypointManager
 * @property {WaypointKeyboardHandler} waypointKeyboardHandler
 * @property {SmartDebugManager} smartDebugManager
 */

/**
 * Initialize Three.js-based spatial and collision systems
 * Replaces Ammo.js physics with simple, performant Three.js systems
 * @param {THREE.Scene} scene
 * @returns {{spatialManager: SpatialManager, collisionManager: SimpleCollisionManager}|null}
 */
export function initializeThreeJSSystems(scene) {
    debug('UTILITY', 'Initializing Three.js spatial and collision systems...');

    try {
        // Create spatial manager for object tracking
        const spatialManager = new SpatialManager();
        registerManager('spatial', spatialManager);

        // Create collision manager for raycast and collision detection
        const collisionManager = new SimpleCollisionManager(scene, spatialManager);
        registerManager('collision', collisionManager);

        debug('UTILITY', 'Three.js systems initialized successfully');
        return { spatialManager, collisionManager };
    } catch (error) {
        debug('P1', `Failed to initialize Three.js systems: ${error.message}`);
        return null;
    }
}

/**
 * Initialize the smart debug manager and set up global debug function
 * @returns {SmartDebugManager}
 */
export function initializeSmartDebugManager() {
    const smartDebugManager = new SmartDebugManager();

    // Set up global debug function to use smartDebugManager
    window.debug = (channel, message) => {
        if (smartDebugManager) {
            smartDebugManager.debug(channel, message);
        }
    };

    // Set up global access to debug manager
    smartDebugManager.setupGlobalAccess();

    return smartDebugManager;
}

/**
 * Initialize the achievement system
 */
export function initializeAchievementSystem() {
    try {
        const achievementSystem = getAchievementSystem();
        debug('P1', 'Achievement system initialized successfully');
        return achievementSystem;
    } catch (error) {
        debug('P1', `Failed to initialize achievement system: ${error.message}`);
        return null;
    }
}

/**
 * Initialize core managers (ViewManager, StarfieldManager, SolarSystemManager)
 * @param {THREE.Scene} scene
 * @param {THREE.PerspectiveCamera} camera
 * @param {OrbitControls} controls
 * @returns {Object} Core managers
 */
export function initializeCoreManagers(scene, camera, controls) {
    // Initialize ViewManager
    const viewManager = new ViewManager(scene, camera, controls);
    registerManager('view', viewManager);

    // Initialize StarfieldManager and connect it to ViewManager
    const starfieldManager = new StarfieldManager(scene, camera, viewManager, THREE);
    viewManager.setStarfieldManager(starfieldManager);
    registerManager('starfield', starfieldManager);
    setReady('starfieldManager', true);

    // Initialize SolarSystemManager
    const solarSystemManager = new SolarSystemManager(scene, camera);
    starfieldManager.setSolarSystemManager(solarSystemManager);
    viewManager.setSolarSystemManager(solarSystemManager);

    debug('UTILITY', 'Core managers initialized');

    return { viewManager, starfieldManager, solarSystemManager };
}

/**
 * Initialize waypoints system
 * @returns {Object} Waypoint managers
 */
export function initializeWaypointsSystem() {
    debug('WAYPOINTS', 'Initializing Waypoints System...');

    try {
        const waypointManager = new WaypointManager();
        registerManager('waypoint', waypointManager);

        const waypointKeyboardHandler = new WaypointKeyboardHandler(waypointManager);
        registerManager('waypointKeyboard', waypointKeyboardHandler);

        debug('WAYPOINTS', 'Waypoints System initialized successfully');
        return { waypointManager, waypointKeyboardHandler };
    } catch (error) {
        debug('P1', `Failed to initialize Waypoints System: ${error.message}`);
        return { waypointManager: null, waypointKeyboardHandler: null };
    }
}

/**
 * Initialize docking system after spatial systems are ready
 * @param {StarfieldManager} starfieldManager
 */
export function initializeDockingSystem(starfieldManager) {
    if (starfieldManager && typeof starfieldManager.initializeSimpleDocking === 'function') {
        starfieldManager.initializeSimpleDocking(SimpleDockingManager);
        debug('UTILITY', 'Docking system initialized');
    }
}

/**
 * Load universe data and generate initial star system
 * @param {ViewManager} viewManager
 * @param {SolarSystemManager} solarSystemManager
 * @param {StarfieldManager} starfieldManager
 * @returns {Promise<boolean>} Success status
 */
export async function initializeUniverse(viewManager, solarSystemManager, starfieldManager) {
    try {
        await viewManager.galacticChart.fetchUniverseData();

        // Ensure universe data is shared with SolarSystemManager
        if (viewManager.galacticChart.universe) {
            solarSystemManager.universe = viewManager.galacticChart.universe;

            // Initialize GameObjectFactory for the starting sector
            GameObjectFactory.initialize('A0');
            debug('UTILITY', 'GameObjectFactory initialized for sector A0');

            // Generate initial star system for sector A0
            const success = await solarSystemManager.generateStarSystem('A0');
            if (success) {
                // Wait for celestial bodies and stations to be fully created
                await new Promise(resolve => setTimeout(resolve, 500));

                // Refresh spatial grid after system generation
                if (viewManager.navigationSystemManager?.starChartsManager) {
                    viewManager.navigationSystemManager.starChartsManager.refreshSpatialGrid();
                    debug('UTILITY', 'Spatial grid refreshed after system generation');
                }

                // Force an immediate update of the target list
                if (starfieldManager?.targetComputerManager) {
                    starfieldManager.targetComputerManager.updateTargetList();

                    const targetCount = starfieldManager.targetComputerManager.targetObjects?.length || 0;
                    if (targetCount === 0) {
                        setTimeout(() => {
                            starfieldManager.targetComputerManager.updateTargetList();
                        }, 500);
                    }
                }

                return true;
            } else {
                debug('P1', 'Failed to generate star system');
                return false;
            }
        } else {
            debug('P1', 'Failed to fetch universe data');
            return false;
        }
    } catch (error) {
        debug('P1', `Error during universe initialization: ${error.message}`);
        return false;
    }
}

/**
 * Set up global exports for modules that need them
 * @param {Object} THREE - Three.js library
 * @param {Object} WeaponEffectsManager - Weapon effects manager class
 */
export function setupGlobalExports(WeaponEffectsManager) {
    window.THREE = THREE;
    window.WeaponEffectsManager = WeaponEffectsManager;
    debug('UTILITY', 'Global exports set up');
}
