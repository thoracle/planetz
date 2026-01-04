/**
 * GameLogicInitializer
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Handles initialization of game logic systems.
 *
 * Features:
 * - Consolidates 2 game logic manager instantiations
 * - Provides centralized access to game logic managers
 * - Provides cleanup on disposal
 */

import { MissionSystemCoordinator } from './MissionSystemCoordinator.js';
import { AIInitManager } from './AIInitManager.js';
import { debug } from '../debug.js';

export class GameLogicInitializer {
    /**
     * Create a GameLogicInitializer
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // Game logic managers
        this.missionCoordinator = null;
        this.aiInitManager = null;
    }

    /**
     * Initialize all game logic managers
     */
    initialize() {
        // Create mission system coordinator (handles all mission-related functionality)
        this.missionCoordinator = new MissionSystemCoordinator(this.sfm);

        // AIInitManager - handles enemy AI initialization
        this.aiInitManager = new AIInitManager(this.sfm);
        this.aiInitManager.initialize();

        debug('UTILITY', 'GameLogicInitializer: 2 game logic managers initialized');
    }

    /**
     * Initialize the mission system (called after delay)
     */
    initializeMissionSystem() {
        if (this.missionCoordinator) {
            this.missionCoordinator.initializeMissionSystem();
        }
    }

    /**
     * Dispose of all game logic managers
     */
    dispose() {
        // Dispose MissionSystemCoordinator
        if (this.missionCoordinator) {
            if (typeof this.missionCoordinator.dispose === 'function') {
                this.missionCoordinator.dispose();
            }
            this.missionCoordinator = null;
        }

        // Dispose AIInitManager
        if (this.aiInitManager) {
            if (typeof this.aiInitManager.dispose === 'function') {
                this.aiInitManager.dispose();
            }
            this.aiInitManager = null;
        }

        this.sfm = null;
    }
}
