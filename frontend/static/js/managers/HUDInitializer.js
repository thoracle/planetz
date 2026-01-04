/**
 * HUDInitializer
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Handles initialization of HUD display systems.
 *
 * Features:
 * - Consolidates 2 HUD manager instantiations
 * - Provides centralized access to HUD managers
 * - Provides cleanup on disposal
 */

import { ShipSystemsHUDManager } from './ShipSystemsHUDManager.js';
import { IntelDisplayManager } from './IntelDisplayManager.js';
import { debug } from '../debug.js';

export class HUDInitializer {
    /**
     * Create a HUDInitializer
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // HUD managers
        this.shipSystemsHUDManager = null;
        this.intelDisplayManager = null;
    }

    /**
     * Initialize all HUD managers
     */
    initialize() {
        this.shipSystemsHUDManager = new ShipSystemsHUDManager(this.sfm);
        this.intelDisplayManager = new IntelDisplayManager(this.sfm);

        debug('UTILITY', 'HUDInitializer: 2 HUD managers initialized');
    }

    /**
     * Dispose of all HUD managers
     */
    dispose() {
        const managers = [
            'shipSystemsHUDManager',
            'intelDisplayManager'
        ];

        for (const managerName of managers) {
            if (this[managerName]) {
                if (typeof this[managerName].dispose === 'function') {
                    this[managerName].dispose();
                } else if (typeof this[managerName].destroy === 'function') {
                    this[managerName].destroy();
                }
                this[managerName] = null;
            }
        }

        this.sfm = null;
    }
}
