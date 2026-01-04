/**
 * ViewStateManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles view state changes (FORE, AFT, GALACTIC, LONG RANGE).
 *
 * Features:
 * - Manages view type transitions
 * - Handles camera rotation for different views
 * - Controls crosshair visibility based on view/dock state
 * - Preserves previous view for special view transitions
 * - Restricts view changes while docked
 * - Holds view state (view, previousView)
 */

import { debug } from '../debug.js';

export class ViewStateManager {
    /**
     * Create a ViewStateManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // View state
        this.view = 'FORE'; // Current view (FORE, AFT, GALACTIC, LONG RANGE)
        this.previousView = 'FORE'; // Previous view for special view transitions
    }

    /**
     * Set the current view type
     * @param {string} viewType - View type ('FORE', 'AFT', 'GALACTIC', 'SCANNER')
     */
    setView(viewType) {
        debug('UTILITY', `🎯 ViewStateManager.setView('${viewType}') called`);
        debug('TARGETING', '🎯 setView call stack');

        // Operations HUD is now an overlay and doesn't interfere with view changes

        // Store previous view when switching to special views
        if (viewType === 'GALACTIC' || viewType === 'SCANNER') {
            // Only store previous view if it's not a special view
            if (this.view !== 'GALACTIC' && this.view !== 'LONG RANGE') {
                this.previousView = this.view;
            }
        }

        // Don't allow view changes while docked (except for special views)
        if (this.sfm.isDocked && viewType !== 'GALACTIC' && viewType !== 'SCANNER' && viewType !== 'LONG RANGE') {
            return;
        }

        // When leaving special views while docked, restore to previous view or force FORE
        if (this.sfm.isDocked && (this.view === 'GALACTIC' || this.view === 'LONG RANGE') &&
            viewType !== 'GALACTIC' && viewType !== 'SCANNER') {
            // Use previous view if it exists and is valid (FORE or AFT), otherwise default to FORE
            const validView = this.previousView === 'FORE' || this.previousView === 'AFT' ? this.previousView : 'FORE';
            this.view = validView;
            this.sfm.camera.rotation.set(0, validView === 'AFT' ? Math.PI : 0, 0);

            // Always ensure crosshairs are hidden while docked
            if (this.sfm.viewManager) {
                this.sfm.viewManager.frontCrosshair.style.display = 'none';
                this.sfm.viewManager.aftCrosshair.style.display = 'none';
            }

            this.sfm.updateSpeedIndicator();
            return;
        }

        // Set the view type, converting SCANNER to LONG RANGE for display
        if (!this.sfm.isDocked) {
            this.view = viewType === 'SCANNER' ? 'LONG RANGE' : viewType.toUpperCase();

            // Update camera rotation based on view (only for flight views)
            if (this.view === 'AFT') {
                this.sfm.camera.rotation.set(0, Math.PI, 0); // 180 degrees around Y axis
            } else if (this.view === 'FORE') {
                this.sfm.camera.rotation.set(0, 0, 0); // Reset to forward
            }
        } else {
            // If docked, allow special views
            if (viewType === 'GALACTIC' || viewType === 'SCANNER') {
                this.view = viewType === 'SCANNER' ? 'LONG RANGE' : viewType.toUpperCase();
            }
        }

        // Handle crosshair visibility
        if (this.sfm.viewManager) {
            // Hide crosshairs if docked or in special views
            const showCrosshairs = !this.sfm.isDocked && this.view !== 'GALACTIC' && this.view !== 'LONG RANGE';
            this.sfm.viewManager.frontCrosshair.style.display = showCrosshairs && this.view === 'FORE' ? 'block' : 'none';
            this.sfm.viewManager.aftCrosshair.style.display = showCrosshairs && this.view === 'AFT' ? 'block' : 'none';
        }

        this.sfm.camera.updateMatrixWorld();
        this.sfm.updateSpeedIndicator();
    }

    /**
     * Get current view
     * @returns {string} Current view type
     */
    getView() {
        return this.view;
    }

    /**
     * Get previous view
     * @returns {string} Previous view type
     */
    getPreviousView() {
        return this.previousView;
    }

    /**
     * Check if current view is a special view (GALACTIC or LONG RANGE)
     * @returns {boolean} True if in special view
     */
    isSpecialView() {
        return this.view === 'GALACTIC' || this.view === 'LONG RANGE';
    }

    /**
     * Check if current view is a flight view (FORE or AFT)
     * @returns {boolean} True if in flight view
     */
    isFlightView() {
        return this.view === 'FORE' || this.view === 'AFT';
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.sfm = null;
    }
}
