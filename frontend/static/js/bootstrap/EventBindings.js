/**
 * Event Bindings for the PlanetZ game.
 * Extracted from app.js to reduce file size and improve modularity.
 *
 * Handles:
 * - Global keyboard event listeners
 * - Mode toggle functions (debug, edit, warp control)
 * - Mouse event handlers
 */

import { debug } from '../debug.js';

/**
 * Mode state object
 * @typedef {Object} ModeState
 * @property {boolean} editMode - Whether edit mode is active
 * @property {boolean} warpControlMode - Whether warp control mode is active
 */

/**
 * Create mode toggle handlers
 * @param {Object} options
 * @param {DebugManager} options.debugManager
 * @param {ViewManager} options.viewManager
 * @param {Object} options.gui - dat.gui instance for edit mode
 * @param {HTMLElement} options.guiContainer
 * @param {Object} options.warpGui - dat.gui instance for warp control
 * @param {HTMLElement} options.warpGuiContainer
 * @param {Function} options.cycleCelestialBody - Function to cycle celestial bodies in edit mode
 * @returns {Object} Mode handlers and state
 */
export function createModeHandlers(options) {
    const {
        debugManager,
        viewManager,
        gui,
        guiContainer,
        warpGui,
        warpGuiContainer,
        cycleCelestialBody
    } = options;

    const state = {
        editMode: false,
        warpControlMode: false
    };

    /**
     * Toggle debug mode (Ctrl/Cmd+U)
     */
    function toggleDebugMode() {
        if (!debugManager) return;
        debugManager.toggle();
    }

    /**
     * Toggle edit mode (Ctrl/Cmd+E)
     */
    function toggleEditMode() {
        state.editMode = !state.editMode;
        viewManager.setEditMode(state.editMode);

        // If enabling edit mode, ensure warp control mode is off
        if (state.editMode && state.warpControlMode) {
            state.warpControlMode = false;
            if (warpGuiContainer) warpGuiContainer.style.display = 'none';
            if (warpGui) warpGui.domElement.style.display = 'none';
            document.body.classList.remove('warp-control-mode');
        }

        // Update debug visibility
        if (debugManager) {
            debugManager.setEditMode(state.editMode);
        }

        // Update UI
        if (state.editMode) {
            document.body.classList.add('edit-mode');
            if (guiContainer) guiContainer.style.display = 'block';
            if (gui) gui.domElement.style.display = 'block';
        } else {
            document.body.classList.remove('edit-mode');
            if (guiContainer) guiContainer.style.display = 'none';
            if (gui) gui.domElement.style.display = 'none';
        }
    }

    /**
     * Toggle warp control mode (Ctrl/Cmd+W)
     */
    function toggleWarpControlMode() {
        if (!warpGui) return;

        state.warpControlMode = !state.warpControlMode;

        // If enabling warp control mode, ensure edit mode is off
        if (state.warpControlMode && state.editMode) {
            state.editMode = false;
            viewManager.setEditMode(false);
            if (guiContainer) guiContainer.style.display = 'none';
            if (gui) gui.domElement.style.display = 'none';
            document.body.classList.remove('edit-mode');
            if (debugManager) {
                debugManager.setEditMode(false);
            }
        }

        // Update UI
        if (state.warpControlMode) {
            document.body.classList.add('warp-control-mode');
            if (warpGuiContainer) warpGuiContainer.style.display = 'block';
            if (warpGui) warpGui.domElement.style.display = 'block';
        } else {
            document.body.classList.remove('warp-control-mode');
            if (warpGuiContainer) warpGuiContainer.style.display = 'none';
            if (warpGui) warpGui.domElement.style.display = 'none';
        }
    }

    return {
        state,
        toggleDebugMode,
        toggleEditMode,
        toggleWarpControlMode
    };
}

/**
 * Set up global keyboard event listener
 * @param {Object} handlers - Mode handlers from createModeHandlers
 * @param {Function} cycleCelestialBody - Function to cycle celestial bodies
 * @returns {Function} Cleanup function to remove listener
 */
export function setupGlobalKeyboardListener(handlers, cycleCelestialBody) {
    const { state, toggleDebugMode, toggleEditMode, toggleWarpControlMode } = handlers;

    const handleKeydown = (event) => {
        // Debug TAB detection
        if (event.key === 'Tab') {
            debug('TARGETING', `GLOBAL TAB detected - editMode: ${state.editMode}`);
        }

        // Handle Ctrl/Cmd key combinations
        if (event.ctrlKey || event.metaKey) {
            if (event.key === 'u') {
                event.preventDefault();
                toggleDebugMode();
            } else if (event.key === 'e') {
                event.preventDefault();
                toggleEditMode();
            } else if (event.key === 'w') {
                event.preventDefault();
                toggleWarpControlMode();
            }
        } else if (state.editMode && event.key === 'Tab') {
            // TAB in edit mode cycles celestial bodies
            debug('TARGETING', 'TAB intercepted by edit mode');
            event.preventDefault();
            event.stopPropagation();
            if (cycleCelestialBody) {
                cycleCelestialBody();
            }
            return false;
        }
    };

    document.addEventListener('keydown', handleKeydown, true);

    // Return cleanup function
    return () => {
        document.removeEventListener('keydown', handleKeydown, true);
    };
}

/**
 * Create mouse event logger for debugging
 * @param {SmartDebugManager} smartDebugManager
 * @param {Object} state - Mode state
 * @param {OrbitControls} controls
 * @returns {Function} Log function
 */
export function createMouseEventLogger(smartDebugManager, state, controls) {
    return function logMouseEvent(type, event) {
        if (!smartDebugManager || !smartDebugManager.config?.global?.enabled) return;

        debug('INSPECTION', `Mouse ${type}: ${JSON.stringify({
            button: event.button,
            buttons: event.buttons,
            modifiers: {
                ctrl: event.ctrlKey,
                alt: event.altKey,
                meta: event.metaKey,
                shift: event.shiftKey
            },
            editMode: state.editMode,
            controls: {
                enabled: controls.enabled,
                enableRotate: controls.enableRotate,
                enablePan: controls.enablePan,
                enableZoom: controls.enableZoom
            }
        })}`);
    };
}

/**
 * Set up verbose mode toggle on window
 */
export function setupVerboseToggle() {
    window.gameConfig = window.gameConfig || {};
    window.gameConfig.verbose = window.gameConfig.verbose !== undefined ? window.gameConfig.verbose : true;

    window.toggleVerbose = function() {
        window.gameConfig.verbose = !window.gameConfig.verbose;
        debug('P1', `Verbose mode ${window.gameConfig.verbose ? 'ENABLED' : 'DISABLED'}`);

        // Refresh ship's log display if visible
        if (window.shipLog) {
            window.shipLog.refreshLogDisplay();
        }

        return window.gameConfig.verbose;
    };

    debug('P1', `Verbose logging enabled: ${window.gameConfig.verbose}`);
}
