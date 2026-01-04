/**
 * HUDContainerManager
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Handles creation of HUD containers and their associated HUD components.
 *
 * Features:
 * - Creates DOM containers for HUDs
 * - Initializes DamageControlHUD
 * - Initializes DiplomacyHUD
 * - Provides cleanup on disposal
 */

import DamageControlHUD from '../ui/DamageControlHUD.js';
import DiplomacyHUD from '../ui/DiplomacyHUD.js';

export class HUDContainerManager {
    /**
     * Create a HUDContainerManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // DOM containers
        this.damageControlContainer = null;
        this.diplomacyContainer = null;

        // HUD instances
        this.damageControlHUD = null;
        this.diplomacyHUD = null;
    }

    /**
     * Initialize all HUD containers and their components
     */
    initialize() {
        this.createDamageControlHUD();
        this.createDiplomacyHUD();
    }

    /**
     * Create the damage control HUD with its container
     */
    createDamageControlHUD() {
        this.damageControlContainer = document.createElement('div');
        document.body.appendChild(this.damageControlContainer);
        this.damageControlHUD = new DamageControlHUD(
            this.sfm.ship,
            this.damageControlContainer,
            this.sfm
        );
    }

    /**
     * Create the diplomacy HUD with its container
     */
    createDiplomacyHUD() {
        this.diplomacyContainer = document.createElement('div');
        document.body.appendChild(this.diplomacyContainer);
        this.diplomacyHUD = new DiplomacyHUD(this.sfm, this.diplomacyContainer);
    }

    /**
     * Dispose of all HUD containers and components
     */
    dispose() {
        // Clean up damage control HUD
        if (this.damageControlHUD) {
            if (typeof this.damageControlHUD.dispose === 'function') {
                this.damageControlHUD.dispose();
            }
            this.damageControlHUD = null;
        }

        // Remove damage control container from DOM
        if (this.damageControlContainer && this.damageControlContainer.parentNode) {
            this.damageControlContainer.parentNode.removeChild(this.damageControlContainer);
            this.damageControlContainer = null;
        }

        // Clean up diplomacy HUD
        if (this.diplomacyHUD) {
            if (typeof this.diplomacyHUD.dispose === 'function') {
                this.diplomacyHUD.dispose();
            }
            this.diplomacyHUD = null;
        }

        // Remove diplomacy container from DOM
        if (this.diplomacyContainer && this.diplomacyContainer.parentNode) {
            this.diplomacyContainer.parentNode.removeChild(this.diplomacyContainer);
            this.diplomacyContainer = null;
        }

        this.sfm = null;
    }
}
