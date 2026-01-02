/**
 * TargetSectorManager
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Handles sector changes and their impact on targeting.
 *
 * Features:
 * - Detects sector changes
 * - Resets target computer state on sector change
 * - Triggers new star system generation
 * - Updates target list after sector transition
 */

import { debug } from '../debug.js';

export class TargetSectorManager {
    /**
     * Create a TargetSectorManager
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;
    }

    /**
     * Update current sector - resets target computer state on sector changes
     * Called periodically to check for sector transitions
     */
    updateCurrentSector() {
        if (!this.tcm.solarSystemManager) return;

        // Calculate current sector based on position
        const currentSector = this.calculateCurrentSector();

        // Get the current sector from the solar system manager
        const currentSystemSector = this.tcm.solarSystemManager.currentSector;

        // Only update if we've moved to a new sector
        if (currentSector !== currentSystemSector) {
            // Reset target computer state before sector change
            if (this.tcm.targetComputerEnabled) {
                this.tcm.currentTarget = null;
                this.tcm.targetIndex = -1;
                this.tcm.targetHUD.style.display = 'none';
                this.tcm.targetReticle.style.display = 'none';

                // Clear any existing wireframe
                if (this.tcm.targetWireframe) {
                    this.tcm.wireframeScene.remove(this.tcm.targetWireframe);
                    this.tcm.targetWireframe.geometry.dispose();
                    this.tcm.targetWireframe.material.dispose();
                    this.tcm.targetWireframe = null;
                }
            }

            this.tcm.solarSystemManager.setCurrentSector(currentSector);
            // Generate new star system for the sector
            this.tcm.solarSystemManager.generateStarSystem(currentSector);

            // Update target list after sector change if target computer is enabled
            if (this.tcm.targetComputerEnabled) {
                setTimeout(() => {
                    this.tcm.updateTargetList();
                    // Only auto-select if no manual selection exists
                    if (!this.tcm.isManualSelection && !this.tcm.isManualNavigationSelection) {
                        debug('TARGETING', `Sector change: Auto-selecting nearest target (no manual selection)`);
                        this.tcm.cycleTarget(); // Auto-select nearest target
                    } else {
                        debug('UTILITY', `Sector change: Preserving existing manual navigation selection`);
                    }
                }, 100); // Small delay to ensure new system is fully generated
            }
        }
    }

    /**
     * Calculate current sector based on position
     * @returns {string} Current sector identifier
     */
    calculateCurrentSector() {
        // This would need actual implementation based on camera position
        // Placeholder for now - returns default sector
        return 'A0';
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // No resources to dispose
    }
}
