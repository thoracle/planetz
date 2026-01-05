/**
 * TCMDataInitializer
 *
 * Extracted from TargetComputerManager to reduce constructor size.
 * Handles initialization of data processing systems.
 *
 * Features:
 * - Consolidates 4 data/processing manager instantiations
 * - Provides centralized access to data managers
 * - Provides cleanup on disposal
 */

import { TargetDataProcessor } from '../ui/TargetDataProcessor.js';
import { TargetPositionManager } from '../ui/TargetPositionManager.js';
import { TargetDiplomacyManager } from '../ui/TargetDiplomacyManager.js';
import { TargetIdManager } from '../ui/TargetIdManager.js';
import { debug } from '../debug.js';

export class TCMDataInitializer {
    /**
     * Create a TCMDataInitializer
     * @param {Object} targetComputerManager - Reference to parent TargetComputerManager
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;

        // Data/processing managers
        this.targetDataProcessor = null;
        this.targetPositionManager = null;
        this.targetDiplomacyManager = null;
        this.targetIdManager = null;
    }

    /**
     * Initialize all data/processing managers
     */
    initialize() {
        // Initialize TargetDataProcessor
        this.targetDataProcessor = new TargetDataProcessor(this.tcm);

        // Initialize TargetPositionManager
        this.targetPositionManager = new TargetPositionManager(this.tcm);

        // Initialize TargetDiplomacyManager
        this.targetDiplomacyManager = new TargetDiplomacyManager(this.tcm);

        // Initialize TargetIdManager
        this.targetIdManager = new TargetIdManager(this.tcm);

        debug('UTILITY', 'TCMDataInitializer: 4 data/processing managers initialized');
    }

    /**
     * Dispose of all data/processing managers
     */
    dispose() {
        const managers = [
            'targetDataProcessor',
            'targetPositionManager',
            'targetDiplomacyManager',
            'targetIdManager'
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
