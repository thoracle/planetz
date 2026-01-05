/**
 * TCMTargetingInitializer
 *
 * Extracted from TargetComputerManager to reduce constructor size.
 * Handles initialization of targeting and selection systems.
 *
 * Features:
 * - Consolidates 6 targeting/selection manager instantiations
 * - Provides centralized access to targeting managers
 * - Provides cleanup on disposal
 */

import { TargetSelectionManager } from '../ui/TargetSelectionManager.js';
import { TargetListManager } from '../ui/TargetListManager.js';
import { ClickCycleHandler } from '../ui/ClickCycleHandler.js';
import { TargetComputerToggle } from '../ui/TargetComputerToggle.js';
import { TargetStateManager } from '../ui/TargetStateManager.js';
import { DestroyedTargetHandler } from '../ui/DestroyedTargetHandler.js';
import { debug } from '../debug.js';

export class TCMTargetingInitializer {
    /**
     * Create a TCMTargetingInitializer
     * @param {Object} targetComputerManager - Reference to parent TargetComputerManager
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;

        // Targeting/selection managers
        this.targetSelectionManager = null;
        this.targetListManager = null;
        this.clickCycleHandler = null;
        this.targetComputerToggle = null;
        this.targetStateManager = null;
        this.destroyedTargetHandler = null;
    }

    /**
     * Initialize all targeting/selection managers
     */
    initialize() {
        // Initialize TargetSelectionManager
        this.targetSelectionManager = new TargetSelectionManager(this.tcm);

        // Initialize TargetListManager
        this.targetListManager = new TargetListManager(this.tcm);

        // Initialize ClickCycleHandler
        this.clickCycleHandler = new ClickCycleHandler(this.tcm);

        // Initialize TargetComputerToggle
        this.targetComputerToggle = new TargetComputerToggle(this.tcm);

        // Initialize TargetStateManager
        this.targetStateManager = new TargetStateManager(this.tcm);

        // Initialize DestroyedTargetHandler
        this.destroyedTargetHandler = new DestroyedTargetHandler(this.tcm);

        debug('UTILITY', 'TCMTargetingInitializer: 6 targeting/selection managers initialized');
    }

    /**
     * Dispose of all targeting/selection managers
     */
    dispose() {
        const managers = [
            'targetSelectionManager',
            'targetListManager',
            'clickCycleHandler',
            'targetComputerToggle',
            'targetStateManager',
            'destroyedTargetHandler'
        ];

        for (const managerName of managers) {
            if (this[managerName]) {
                if (typeof this[managerName].dispose === 'function') {
                    this[managerName].dispose();
                }
                this[managerName] = null;
            }
        }

        this.tcm = null;
    }
}
