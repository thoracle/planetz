/**
 * InputSystemsInitializer
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Handles initialization of input and operations systems.
 *
 * Features:
 * - Consolidates 3 input/operations manager instantiations
 * - Provides centralized access to input systems
 * - Provides cleanup on disposal
 */

import { DockingOperationsManager } from './DockingOperationsManager.js';
import { KeyboardInputManager } from './KeyboardInputManager.js';
import { ShipMovementController } from './ShipMovementController.js';
import { debug } from '../debug.js';

export class InputSystemsInitializer {
    /**
     * Create an InputSystemsInitializer
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // Input/operations managers
        this.dockingOperationsManager = null;
        this.keyboardInputManager = null;
        this.shipMovementController = null;
    }

    /**
     * Initialize all input/operations managers
     */
    initialize() {
        this.dockingOperationsManager = new DockingOperationsManager(this.sfm);
        this.keyboardInputManager = new KeyboardInputManager(this.sfm);
        this.shipMovementController = new ShipMovementController(this.sfm);

        debug('UTILITY', 'InputSystemsInitializer: 3 input systems initialized');
    }

    /**
     * Dispose of all input/operations managers
     */
    dispose() {
        const managers = [
            'dockingOperationsManager',
            'keyboardInputManager',
            'shipMovementController'
        ];

        for (const managerName of managers) {
            if (this[managerName]) {
                if (typeof this[managerName].dispose === 'function') {
                    this[managerName].dispose();
                }
                this[managerName] = null;
            }
        }

        this.sfm = null;
    }
}
