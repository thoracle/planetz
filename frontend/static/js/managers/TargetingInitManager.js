/**
 * TargetingInitManager
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Handles initialization of targeting and navigation systems.
 *
 * Features:
 * - Creates TargetComputerManager with proper dependencies
 * - Creates StarChartsManager with proper dependencies
 * - Creates ProximityDetector3D (radar) for spatial awareness
 * - Provides cleanup on disposal
 */

import { TargetComputerManager } from '../views/TargetComputerManager.js';
import { StarChartsManager } from '../views/StarChartsManager.js';
import { ProximityDetector3D } from '../ui/ProximityDetector3D.js';
import { debug } from '../debug.js';

export class TargetingInitManager {
    /**
     * Create a TargetingInitManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // Targeting components
        this.targetComputerManager = null;
        this.starChartsManager = null;
        this.proximityDetector3D = null;
    }

    /**
     * Initialize all targeting and navigation systems
     */
    initialize() {
        this.createTargetComputerManager();
        this.createStarChartsManager();
        this.createProximityDetector();
    }

    /**
     * Create the target computer manager
     */
    createTargetComputerManager() {
        this.targetComputerManager = new TargetComputerManager(
            this.sfm.scene,
            this.sfm.camera,
            this.sfm.viewManager,
            this.sfm.THREE,
            this.sfm.solarSystemManager
        );
        this.targetComputerManager.initialize();
        debug('TARGETING', 'TargetComputerManager initialized');
    }

    /**
     * Create the star charts manager
     */
    createStarChartsManager() {
        this.starChartsManager = new StarChartsManager(
            this.sfm.scene,
            this.sfm.camera,
            this.sfm.viewManager,
            this.sfm.solarSystemManager,
            this.targetComputerManager
        );
        debug('STAR_CHARTS', 'StarChartsManager initialized');
    }

    /**
     * Create the 3D proximity detector (radar)
     */
    createProximityDetector() {
        this.proximityDetector3D = new ProximityDetector3D(this.sfm, document.body);
        debug('UTILITY', 'ProximityDetector3D initialized');
    }

    /**
     * Dispose of all targeting and navigation systems
     */
    dispose() {
        // Clean up TargetComputerManager
        if (this.targetComputerManager) {
            if (typeof this.targetComputerManager.dispose === 'function') {
                this.targetComputerManager.dispose();
            }
            this.targetComputerManager = null;
        }

        // Clean up StarChartsManager
        if (this.starChartsManager) {
            if (typeof this.starChartsManager.dispose === 'function') {
                this.starChartsManager.dispose();
            }
            this.starChartsManager = null;
        }

        // Clean up ProximityDetector3D
        if (this.proximityDetector3D) {
            if (typeof this.proximityDetector3D.dispose === 'function') {
                this.proximityDetector3D.dispose();
            }
            this.proximityDetector3D = null;
        }

        this.sfm = null;
    }
}
