/**
 * AIInitManager
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Handles initialization of AI systems.
 *
 * Features:
 * - Creates EnemyAIManager with proper dependencies
 * - Provides cleanup on disposal
 */

import { EnemyAIManager } from '../ai/EnemyAIManager.js';
import { debug } from '../debug.js';

export class AIInitManager {
    /**
     * Create an AIInitManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // AI components
        this.enemyAIManager = null;
    }

    /**
     * Initialize all AI systems
     */
    initialize() {
        this.createEnemyAIManager();
    }

    /**
     * Create the enemy AI manager
     */
    createEnemyAIManager() {
        this.enemyAIManager = new EnemyAIManager(
            this.sfm.scene,
            this.sfm.camera,
            this.sfm
        );
        debug('UTILITY', 'EnemyAIManager initialized');
    }

    /**
     * Dispose of all AI systems
     */
    dispose() {
        // Clean up EnemyAIManager
        if (this.enemyAIManager) {
            if (typeof this.enemyAIManager.dispose === 'function') {
                this.enemyAIManager.dispose();
            }
            this.enemyAIManager = null;
        }

        this.sfm = null;
    }
}
