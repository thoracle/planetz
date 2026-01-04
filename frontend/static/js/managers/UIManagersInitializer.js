/**
 * UIManagersInitializer
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Handles initialization of UI management systems.
 *
 * Features:
 * - Consolidates 3 UI manager instantiations
 * - Provides centralized access to UI managers
 * - Provides cleanup on disposal
 */

import { DockingUIManager } from './DockingUIManager.js';
import { InterfaceInitManager } from './InterfaceInitManager.js';
import { HUDContainerManager } from './HUDContainerManager.js';
import { debug } from '../debug.js';

export class UIManagersInitializer {
    /**
     * Create a UIManagersInitializer
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // UI managers
        this.dockingUIManager = null;
        this.interfaceInitManager = null;
        this.hudContainerManager = null;
    }

    /**
     * Initialize all UI managers
     */
    initialize() {
        this.dockingUIManager = new DockingUIManager(this.sfm);
        this.dockingUIManager.initialize();

        this.interfaceInitManager = new InterfaceInitManager(this.sfm);
        this.interfaceInitManager.initialize();

        this.hudContainerManager = new HUDContainerManager(this.sfm);
        this.hudContainerManager.initialize();

        debug('UTILITY', 'UIManagersInitializer: 3 UI managers initialized');
    }

    /**
     * Dispose of all UI managers
     */
    dispose() {
        const managers = [
            'dockingUIManager',
            'interfaceInitManager',
            'hudContainerManager'
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
