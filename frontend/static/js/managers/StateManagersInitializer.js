/**
 * StateManagersInitializer
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Handles initialization of state management systems.
 *
 * Features:
 * - Consolidates 3 state manager instantiations
 * - Provides centralized access to state managers
 * - Provides cleanup on disposal
 */

import { CameraStateManager } from './CameraStateManager.js';
import { TargetStateManager } from './TargetStateManager.js';
import { DamageControlStateManager } from './DamageControlStateManager.js';
import { debug } from '../debug.js';

export class StateManagersInitializer {
    /**
     * Create a StateManagersInitializer
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // State managers
        this.cameraStateManager = null;
        this.targetStateManager = null;
        this.damageControlStateManager = null;
    }

    /**
     * Initialize all state managers
     */
    initialize() {
        this.cameraStateManager = new CameraStateManager(this.sfm);
        this.targetStateManager = new TargetStateManager(this.sfm);
        this.damageControlStateManager = new DamageControlStateManager(this.sfm);

        debug('UTILITY', 'StateManagersInitializer: 3 state managers initialized');
    }

    /**
     * Dispose of all state managers
     */
    dispose() {
        const managers = [
            'cameraStateManager',
            'targetStateManager',
            'damageControlStateManager'
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
