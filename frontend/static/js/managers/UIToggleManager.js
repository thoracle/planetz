/**
 * UIToggleManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles UI toggle operations for damage control, help, and debug mode.
 *
 * Features:
 * - Toggle damage control HUD visibility
 * - Toggle help interface visibility
 * - Toggle debug mode for weapon hit spheres
 * - Manages associated state flags
 */

import { debug } from '../debug.js';
import { WeaponSlot } from '../ship/systems/WeaponSlot.js';

export class UIToggleManager {
    /**
     * Create a UIToggleManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
    }

    /**
     * Toggle damage control HUD visibility
     */
    toggleDamageControl() {
        this.sfm.damageControlVisible = !this.sfm.damageControlVisible;

        if (this.sfm.damageControlVisible) {
            // Operations HUD is an overlay, don't change the view
            this.sfm.isDamageControlOpen = true; // Set the state flag

            debug('COMBAT', 'Showing operations report HUD...');

            // SIMPLIFIED: Just show the HUD - no card system refresh needed
            // The ship systems should already be initialized from launch/undocking
            this.sfm.damageControlHUD.show();
            debug('COMBAT', 'Operations report HUD shown');

            this.sfm.updateSpeedIndicator(); // Update the view indicator
        } else {
            // Operations HUD is an overlay, don't change the view when closing
            this.sfm.isDamageControlOpen = false; // Clear the state flag

            // Clean up all debug hit spheres when operations report is turned off
            WeaponSlot.cleanupAllDebugSpheres(this.sfm);

            // Hide the operations report HUD
            this.sfm.damageControlHUD.hide();

            this.sfm.updateSpeedIndicator(); // Update the view indicator
        }
    }

    /**
     * Toggle help interface visibility
     */
    toggleHelp() {
        debug('P1', '🔄 toggleHelp() called - using HelpInterface');
        if (this.sfm.helpInterface) {
            try {
                if (this.sfm.helpInterface.isVisible) {
                    this.sfm.helpInterface.hide();
                    debug('P1', '✅ Help screen closed');
                } else {
                    this.sfm.helpInterface.show();
                    debug('P1', '✅ Help screen opened');
                }
            } catch (error) {
                debug('P1', `❌ Failed to toggle help screen: ${error}`);
            }
        } else {
            debug('P1', '❌ HelpInterface not available - cannot toggle help');
        }
    }

    /**
     * Toggle debug mode for weapon hit detection spheres
     */
    toggleDebugMode() {
        this.sfm.debugMode = !this.sfm.debugMode;

        if (this.sfm.debugMode) {
            this.sfm.playCommandSound();
            debug('COMBAT', '🐛 DEBUG MODE ENABLED - Weapon hit detection spheres will be shown');
            this.sfm.showHUDEphemeral(
                'DEBUG MODE ENABLED',
                'Weapon hit detection spheres will be visible'
            );
        } else {
            this.sfm.playCommandSound();
            debug('INSPECTION', '🐛 DEBUG MODE DISABLED - Cleaning up debug spheres');
            this.sfm.showHUDEphemeral(
                'DEBUG MODE DISABLED',
                'Debug spheres cleared'
            );

            // Clean up all existing debug spheres
            WeaponSlot.cleanupAllDebugSpheres(this.sfm);
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.sfm = null;
    }
}
