/**
 * PlanetZ Game - Main Application Entry Point
 *
 * This file orchestrates application startup by delegating to bootstrap modules.
 * Refactored from 2,507 lines to ~180 lines for maintainability.
 *
 * @version 2.1.0-refactored
 */

import * as THREE from 'three';
import { WeaponEffectsManager } from './ship/systems/WeaponEffectsManager.js';
import './ship/systems/services/HitScanService.js';
import './ship/systems/services/SimpleProjectileService.js';
import './utils/ErrorReporter.js';
import './utils/ShipLog.js';
import { debug } from './debug.js';

// Global namespace - initialize early for backward compatibility
import { PLANETZ, initializeAliases, registerManager, setReady } from './core/GlobalNamespace.js';
initializeAliases();

// Bootstrap modules
import {
    DebugManager,
    setupDebugWindowFunctions,
    createSceneSetup,
    setupResizeHandler,
    createGuiContainer,
    initializeThreeJSSystems,
    initializeSmartDebugManager,
    initializeAchievementSystem,
    initializeCoreManagers,
    initializeWaypointsSystem,
    initializeDockingSystem,
    initializeUniverse,
    setupGlobalExports,
    createModeHandlers,
    setupGlobalKeyboardListener,
    setupVerboseToggle
} from './bootstrap/index.js';

// Version tracking
const APP_VERSION = '2.1.0-refactored';
const APP_BUILD_DATE = new Date().toISOString();

// Module-level manager references
let viewManager = null;
let solarSystemManager = null;
let starfieldManager = null;
let debugManager = null;
let spatialManager = null;
let collisionManager = null;

/**
 * Main application initialization
 */
document.addEventListener('DOMContentLoaded', async () => {
    debug('P1', `PLANETZ v${APP_VERSION}`);

    // Set up verbose mode toggle
    setupVerboseToggle();

    // Create scene setup (scene, camera, renderer, controls)
    const sceneSetup = createSceneSetup();
    if (!sceneSetup) {
        debug('P1', 'Failed to create scene setup');
        return;
    }

    const { scene, camera, renderer, controls, clock, container, uiContainer } = sceneSetup;

    // Set up resize handler
    setupResizeHandler(camera, renderer, container);

    // Initialize smart debug manager (for debug() function)
    const smartDebugManager = initializeSmartDebugManager();

    // Initialize Three.js debug manager (stats, axes, grid)
    debugManager = new DebugManager();
    debugManager.initialize(scene, uiContainer);

    // Initialize achievement system
    initializeAchievementSystem();

    // Set up debug window functions (testNotification, checkDiscoveries, etc.)
    setupDebugWindowFunctions();

    // Initialize core managers
    const coreManagers = initializeCoreManagers(scene, camera, controls);
    viewManager = coreManagers.viewManager;
    starfieldManager = coreManagers.starfieldManager;
    solarSystemManager = coreManagers.solarSystemManager;

    // Initialize Three.js spatial/collision systems
    debug('UI', 'Three.js spatial systems ready');
    const systems = initializeThreeJSSystems(scene);
    if (systems) {
        spatialManager = systems.spatialManager;
        collisionManager = systems.collisionManager;

        // Register managers in namespace (with backward-compatible aliases)
        registerManager('spatial', spatialManager);
        registerManager('collision', collisionManager);
        setReady('spatialManager', true);
        setReady('collisionManager', true);

        // Initialize docking system
        initializeDockingSystem(starfieldManager);
    } else {
        debug('P1', 'Failed to initialize Three.js systems');
        setReady('spatialManager', false);
        setReady('collisionManager', false);
    }

    // Initialize waypoints system
    initializeWaypointsSystem();

    // Set manager references for debug manager
    debugManager.setManagers(viewManager, solarSystemManager);

    // Verify managers are properly connected
    if (!viewManager.areManagersReady()) {
        debug('P1', 'Failed to initialize managers properly');
        return;
    }

    // Initialize universe and generate initial star system
    await initializeUniverse(viewManager, solarSystemManager, starfieldManager);

    // Set up global exports
    setupGlobalExports(WeaponEffectsManager);

    // Create GUI containers (hidden by default)
    const guiContainer = createGuiContainer('gui-container', 'right');
    uiContainer.appendChild(guiContainer);

    const warpGuiContainer = createGuiContainer('warp-gui-container', 'left');
    uiContainer.appendChild(warpGuiContainer);

    // Create mode handlers for keyboard shortcuts
    const modeHandlers = createModeHandlers({
        debugManager,
        viewManager,
        gui: null, // dat.gui not initialized in slim mode
        guiContainer,
        warpGui: null,
        warpGuiContainer,
        cycleCelestialBody: null
    });

    // Set up global keyboard listener
    setupGlobalKeyboardListener(modeHandlers, null);

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);

        const deltaTime = clock.getDelta();

        // Update core game systems
        if (viewManager) {
            viewManager.update(deltaTime);
        }
        if (starfieldManager) {
            starfieldManager.update(deltaTime);
        }
        if (solarSystemManager) {
            solarSystemManager.update(deltaTime);
        }

        // Update spatial and collision systems
        if (spatialManager) {
            spatialManager.update(deltaTime);
        }
        if (collisionManager) {
            collisionManager.update(deltaTime);
        }

        // Update projectile systems
        if (window.simpleProjectileManager) {
            window.simpleProjectileManager.update();
        }

        // Update physics projectiles
        if (window.activeProjectiles && window.activeProjectiles.length > 0) {
            window.activeProjectiles = window.activeProjectiles.filter(projectile => {
                if (projectile.isActive && typeof projectile.update === 'function') {
                    try {
                        projectile.update(deltaTime * 1000);
                        return projectile.isActive();
                    } catch (error) {
                        debug('P1', `Error updating projectile: ${error.message}`);
                        if (typeof projectile.cleanup === 'function') {
                            projectile.cleanup();
                        }
                        return false;
                    }
                } else {
                    if (typeof projectile.cleanup === 'function') {
                        projectile.cleanup();
                    }
                    return false;
                }
            });
        }

        // Update debug manager
        debugManager.update();

        // Render scene
        renderer.render(scene, camera);
    }

    // Start animation loop
    debug('UTILITY', 'Starting animation loop...');
    animate();
});

// Make THREE available globally for other modules
window.THREE = THREE;
