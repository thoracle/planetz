/**
 * RenderingInitManager
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Handles initialization of rendering systems.
 *
 * Features:
 * - Creates StarfieldRenderer with proper configuration
 * - Provides cleanup on disposal
 */

import { StarfieldRenderer } from '../views/StarfieldRenderer.js';
import { STARFIELD } from '../constants/GameConstants.js';
import { debug } from '../debug.js';

export class RenderingInitManager {
    /**
     * Create a RenderingInitManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // Rendering components
        this.starfieldRenderer = null;
    }

    /**
     * Initialize all rendering systems
     */
    initialize() {
        this.createStarfieldRenderer();
    }

    /**
     * Create the starfield renderer with quintuple density
     */
    createStarfieldRenderer() {
        this.starfieldRenderer = new StarfieldRenderer(
            this.sfm.scene,
            this.sfm.THREE,
            STARFIELD.STAR_COUNT
        );
        this.starfieldRenderer.initialize();
        debug('UTILITY', 'StarfieldRenderer initialized');
    }

    /**
     * Dispose of all rendering systems
     */
    dispose() {
        // Clean up StarfieldRenderer
        if (this.starfieldRenderer) {
            if (typeof this.starfieldRenderer.dispose === 'function') {
                this.starfieldRenderer.dispose();
            }
            this.starfieldRenderer = null;
        }

        this.sfm = null;
    }
}
