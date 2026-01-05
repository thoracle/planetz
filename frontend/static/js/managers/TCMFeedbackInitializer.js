/**
 * TCMFeedbackInitializer
 *
 * Extracted from TargetComputerManager to reduce constructor size.
 * Handles initialization of feedback and visual effect systems.
 *
 * Features:
 * - Consolidates 3 feedback manager instantiations
 * - Provides centralized access to feedback managers
 * - Provides cleanup on disposal
 */

import { TargetingFeedbackManager } from '../ui/TargetingFeedbackManager.js';
import { TargetOutlineManager } from '../ui/TargetOutlineManager.js';
import { TargetWireframeCreator } from '../ui/TargetWireframeCreator.js';
import { debug } from '../debug.js';

export class TCMFeedbackInitializer {
    /**
     * Create a TCMFeedbackInitializer
     * @param {Object} targetComputerManager - Reference to parent TargetComputerManager
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;

        // Feedback managers
        this.targetingFeedbackManager = null;
        this.targetOutlineManager = null;
        this.targetWireframeCreator = null;
    }

    /**
     * Initialize all feedback managers
     */
    initialize() {
        // Initialize TargetingFeedbackManager
        this.targetingFeedbackManager = new TargetingFeedbackManager(this.tcm);

        // Initialize TargetOutlineManager
        this.targetOutlineManager = new TargetOutlineManager(this.tcm);

        // Initialize TargetWireframeCreator
        this.targetWireframeCreator = new TargetWireframeCreator(this.tcm);

        debug('UTILITY', 'TCMFeedbackInitializer: 3 feedback managers initialized');
    }

    /**
     * Dispose of all feedback managers
     */
    dispose() {
        const managers = [
            'targetingFeedbackManager',
            'targetOutlineManager',
            'targetWireframeCreator'
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
