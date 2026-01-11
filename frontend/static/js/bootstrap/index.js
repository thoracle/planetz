/**
 * Bootstrap module for PlanetZ game.
 * Re-exports all bootstrap utilities for convenient importing.
 */

export { DebugManager, setupDebugWindowFunctions } from './DebugUtilities.js';
export { createSceneSetup, setupResizeHandler, createGuiContainer } from './SceneSetup.js';
export {
    initializeThreeJSSystems,
    initializeSmartDebugManager,
    initializeAchievementSystem,
    initializeCoreManagers,
    initializeWaypointsSystem,
    initializeDockingSystem,
    initializeUniverse,
    setupGlobalExports
} from './AppInitializer.js';
export {
    createModeHandlers,
    setupGlobalKeyboardListener,
    createMouseEventLogger,
    setupVerboseToggle
} from './EventBindings.js';
