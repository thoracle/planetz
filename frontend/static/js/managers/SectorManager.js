/**
 * SectorManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles sector calculation and transitions in the galaxy.
 *
 * Features:
 * - Calculates current sector based on camera position
 * - Handles sector transitions and system generation
 * - Resets targeting systems on sector change
 * - Updates galactic chart with ship location
 * - Coordinates with Star Charts and proximity radar
 */

import { debug } from '../debug.js';

export class SectorManager {
    /**
     * Create a SectorManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
        this.SECTOR_SIZE = 100000; // Sector grid size in game units
    }

    /**
     * Update current sector based on camera position
     * Handles all sector transition logic
     */
    updateCurrentSector() {
        if (!this.sfm.solarSystemManager) return;

        // Calculate current sector based on position
        const currentSector = this.calculateCurrentSector();

        // Get the current sector from the solar system manager
        const currentSystemSector = this.sfm.solarSystemManager.currentSector;

        // Only update if we've moved to a new sector
        if (currentSector !== currentSystemSector) {
            // Reset target computer state before sector change
            if (this.sfm.targetComputerEnabled) {
                this.sfm.currentTarget = null;
                this.sfm.targetIndex = -1;
                this.sfm.targetComputerManager.hideTargetHUD();
                this.sfm.targetComputerManager.hideTargetReticle();

                // Clear any existing wireframe
                if (this.sfm.targetWireframe) {
                    this.sfm.wireframeScene.remove(this.sfm.targetWireframe);
                    this.sfm.targetWireframe.geometry.dispose();
                    this.sfm.targetWireframe.material.dispose();
                    this.sfm.targetWireframe = null;
                }
            }

            // CRITICAL FIX: Reset proximity radar state before sector change (like target computer)
            if (this.sfm.proximityDetector3D && this.sfm.proximityDetector3D.isVisible) {
                debug('UTILITY', '🎯 Sector change: Deactivating proximity radar');
                this.sfm.proximityDetector3D.toggle(); // Deactivate proximity radar
            }

            // CRITICAL FIX: Update Star Charts current sector before generating new system
            if (this.sfm.starChartsManager) {
                debug('UTILITY', `🗺️ Sector change: Updating Star Charts from ${this.sfm.starChartsManager.currentSector} to ${currentSector}`);
                this.sfm.starChartsManager.currentSector = currentSector;
            }

            this.sfm.solarSystemManager.setCurrentSector(currentSector);
            // Generate new star system for the sector
            this.sfm.solarSystemManager.generateStarSystem(currentSector);

            // Update target list after sector change if target computer is enabled
            if (this.sfm.targetComputerEnabled) {
                this.sfm._setTimeout(() => {
                    this.sfm.updateTargetList();
                    this.sfm.cycleTarget();
                }, 100); // Small delay to ensure new system is fully generated
            }

            // Update galactic chart with new sector
            const galacticChart = this.sfm.viewManager.getGalacticChart();
            if (galacticChart) {
                // Convert sector to index (e.g., 'A0' -> 0, 'B1' -> 10, etc.)
                const row = currentSector.charCodeAt(0) - 65; // Convert A-J to 0-9
                const col = parseInt(currentSector[1]);
                const systemIndex = row * 9 + col;
                galacticChart.setShipLocation(systemIndex);
            }
        }
    }

    /**
     * Calculate current sector from camera position
     * @returns {string} Sector notation (e.g., 'A0', 'B1', 'J8')
     */
    calculateCurrentSector() {
        if (!this.sfm.solarSystemManager) return 'A0';

        // Get camera position
        const pos = this.sfm.camera.position;

        // Calculate grid coordinates
        // Adjust offsets to ensure (0,0,0) is in sector A0
        const x = Math.floor(pos.x / this.SECTOR_SIZE);
        const z = Math.floor(pos.z / this.SECTOR_SIZE);

        // Convert to sector notation (A0-J8)
        // Clamp x between 0-8 for sectors 0-8
        const col = Math.max(0, Math.min(8, x + 4)); // +4 to center around origin

        // Clamp z between 0-9 for sectors A-J
        const row = Math.max(0, Math.min(9, z + 5)); // +5 to center around origin
        const rowLetter = String.fromCharCode(65 + row); // 65 is ASCII for 'A'

        const sector = `${rowLetter}${col}`;

        return sector;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.sfm = null;
    }
}
