/**
 * DockingUIManager
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Handles initialization of docking-related UI components.
 *
 * Features:
 * - Manages DockingInterface (station menu)
 * - Manages DockingSystemManager
 * - Manages DockingModal (popup-based docking)
 * - Placeholder for physics-based docking manager
 */

import { DockingInterface } from '../ui/DockingInterface.js';
import DockingSystemManager from '../ship/DockingSystemManager.js';
import DockingModal from '../ui/DockingModal.js';

export class DockingUIManager {
    /**
     * Create a DockingUIManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // Docking UI components
        this.dockingInterface = null;
        this.dockingSystemManager = null;
        this.dockingModal = null;

        // Physics-based docking manager placeholder
        this.physicsDockingManager = null;
    }

    /**
     * Initialize all docking UI components
     */
    initialize() {
        // Create station menu interface
        this.dockingInterface = new DockingInterface(this.sfm);

        // Create docking system manager
        this.dockingSystemManager = new DockingSystemManager();

        // Physics-based docking manager will be activated when physics is ready
        this.physicsDockingManager = null;

        // Create docking modal for popup-based docking
        this.dockingModal = new DockingModal(this.sfm);
    }

    /**
     * Dispose of all docking UI components
     */
    dispose() {
        // Clean up docking interface
        if (this.dockingInterface) {
            if (typeof this.dockingInterface.dispose === 'function') {
                this.dockingInterface.dispose();
            }
            this.dockingInterface = null;
        }

        // Clean up docking system manager
        if (this.dockingSystemManager) {
            if (typeof this.dockingSystemManager.dispose === 'function') {
                this.dockingSystemManager.dispose();
            }
            this.dockingSystemManager = null;
        }

        // Clean up docking modal
        if (this.dockingModal) {
            if (typeof this.dockingModal.destroy === 'function') {
                this.dockingModal.destroy();
            }
            this.dockingModal = null;
        }

        // Clean up physics docking manager
        if (this.physicsDockingManager) {
            if (typeof this.physicsDockingManager.dispose === 'function') {
                this.physicsDockingManager.dispose();
            }
            this.physicsDockingManager = null;
        }

        this.sfm = null;
    }
}
