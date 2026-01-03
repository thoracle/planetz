/**
 * TargetHUDController
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Handles target HUD visibility, styling, and basic display operations.
 *
 * Features:
 * - Show/hide target HUD
 * - Set HUD border color based on diplomacy
 * - Update scan line colors
 * - Update target info display content
 * - Refresh current target display
 */

import { debug } from '../debug.js';

export class TargetHUDController {
    /**
     * Create a TargetHUDController
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;
    }

    /**
     * Show the target HUD
     */
    showTargetHUD() {
        if (this.tcm.targetHUD) {
            this.tcm.targetHUD.style.display = 'block';
        }
    }

    /**
     * Hide the target HUD
     */
    hideTargetHUD() {
        if (this.tcm.targetHUD) {
            this.tcm.targetHUD.style.display = 'none';
        }

        // Also hide the sub-system panel
        this.tcm.hideSubSystemPanel();
    }

    /**
     * Set the target HUD border color based on diplomacy
     * Preserves waypoint magenta color when applicable
     * @param {string} color - CSS color string
     */
    setTargetHUDBorderColor(color) {
        // Check if current target is a waypoint - preserve magenta color
        if (this.tcm.currentTarget && this.tcm.currentTarget.isWaypoint) {
            const waypointColor = '#ff00ff'; // Magenta
            debug('WAYPOINTS', `🎨 Preserving waypoint color ${waypointColor} instead of ${color}`);

            if (this.tcm.targetHUD) {
                this.tcm.targetHUD.style.borderColor = waypointColor;
                this.tcm.targetHUD.style.color = waypointColor;
            }

            // Update scan line color to match waypoint
            this.updateScanLineColor(waypointColor);
            return;
        }

        // Normal target color handling
        if (this.tcm.targetHUD) {
            this.tcm.targetHUD.style.borderColor = color;
            this.tcm.targetHUD.style.color = color;
        }

        // Update scan line color to match faction
        this.updateScanLineColor(color);
    }

    /**
     * Update scan line color to match faction
     * @param {string} color - CSS color string
     */
    updateScanLineColor(color) {
        if (this.tcm.animatedScanLine) {
            this.tcm.animatedScanLine.style.background = `linear-gradient(90deg, transparent, ${color}, transparent)`;
        }
    }

    /**
     * Update the target info display with HTML content
     * @param {string} htmlContent - HTML content to display
     */
    updateTargetInfoDisplay(htmlContent) {
        if (this.tcm.targetInfoDisplay) {
            this.tcm.targetInfoDisplay.innerHTML = htmlContent;
        }
    }

    /**
     * Refresh the current target and its wireframe
     */
    refreshCurrentTarget() {
        if (this.tcm.currentTarget && this.tcm.targetComputerEnabled) {
            // Update the wireframe display without cycling
            this.tcm.updateTargetDisplay();
        }
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // No resources to dispose
    }
}
