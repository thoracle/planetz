/**
 * TCMLifecycleInitializer
 *
 * Extracted from TargetComputerManager to reduce constructor size.
 * Handles initialization of lifecycle and update systems.
 *
 * Features:
 * - Consolidates 3 lifecycle manager instantiations
 * - Provides centralized access to lifecycle managers
 * - Provides cleanup on disposal
 */

import { TargetHUDController } from '../ui/TargetHUDController.js';
import { TargetUpdateLoop } from '../ui/TargetUpdateLoop.js';
import { TCMResourceCleaner } from '../ui/TCMResourceCleaner.js';
import { debug } from '../debug.js';

export class TCMLifecycleInitializer {
    /**
     * Create a TCMLifecycleInitializer
     * @param {Object} targetComputerManager - Reference to parent TargetComputerManager
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;

        // Lifecycle managers
        this.targetHUDController = null;
        this.targetUpdateLoop = null;
        this.resourceCleaner = null;
    }

    /**
     * Initialize all lifecycle managers
     */
    initialize() {
        // Initialize TargetHUDController
        this.targetHUDController = new TargetHUDController(this.tcm);

        // Initialize TargetUpdateLoop
        this.targetUpdateLoop = new TargetUpdateLoop(this.tcm);

        // Initialize TCMResourceCleaner
        this.resourceCleaner = new TCMResourceCleaner(this.tcm);

        debug('UTILITY', 'TCMLifecycleInitializer: 3 lifecycle managers initialized');
    }

    /**
     * Dispose of all lifecycle managers
     */
    dispose() {
        const managers = [
            'targetHUDController',
            'targetUpdateLoop',
            'resourceCleaner'
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
