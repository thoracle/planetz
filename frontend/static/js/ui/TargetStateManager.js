/**
 * TargetStateManager
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Handles target computer activation, deactivation, and state clearing.
 *
 * Features:
 * - Activate/deactivate target computer
 * - Clear target computer state completely
 * - Clear current target while keeping HUD visible
 * - Find next valid target when current is invalid
 * - Simple cycling (next/previous) without selection logic
 */

import { debug } from '../debug.js';

export class TargetStateManager {
    /**
     * Create a TargetStateManager
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;
    }

    /**
     * Activate target computer and select first target if available
     */
    activateTargetComputer() {
        debug('TARGETING', `🎯 activateTargetComputer called: targetComputerEnabled=${this.tcm.targetComputerEnabled}, isPoweringUp=${this.tcm.isPoweringUp}, targets=${this.tcm.targetObjects?.length || 0}`);
        this.tcm.targetComputerEnabled = true;

        // If we have targets, select the first one
        if (this.tcm.targetObjects && this.tcm.targetObjects.length > 0) {
            this.tcm.targetIndex = 0;
            debug('TARGETING', `🎯 activateTargetComputer: About to call updateTargetDisplay after activation`);
            this.tcm.updateTargetDisplay();
            // Force direction arrow update when target computer is activated
            this.tcm.updateDirectionArrow();
        }
    }

    /**
     * Deactivate target computer and hide HUD
     */
    deactivateTargetComputer() {
        this.tcm.targetComputerEnabled = false;
        this.tcm.currentTarget = null;
        this.tcm.targetIndex = -1;
        this.tcm.isManualNavigationSelection = false;
        this.tcm.isManualSelection = false;

        if (this.tcm.targetHUD) {
            this.tcm.targetHUD.style.display = 'none';
        }
        if (this.tcm.targetReticle) {
            this.tcm.targetReticle.style.display = 'none';
        }

        // Stop wireframe animation and clear wireframe
        this.tcm.stopWireframeAnimation();
        if (this.tcm.targetWireframe) {
            this.tcm.wireframeScene.remove(this.tcm.targetWireframe);
            if (this.tcm.targetWireframe.geometry) {
                this.tcm.targetWireframe.geometry.dispose();
            }
            if (this.tcm.targetWireframe.material) {
                this.tcm.targetWireframe.material.dispose();
            }
            this.tcm.targetWireframe = null;
        }
    }

    /**
     * Cycle to next target (simple increment)
     */
    cycleTargetNext() {
        if (!this.tcm.targetComputerEnabled || !this.tcm.targetObjects || this.tcm.targetObjects.length === 0) {
            return;
        }

        this.tcm.targetIndex = (this.tcm.targetIndex + 1) % this.tcm.targetObjects.length;
        this.tcm.updateTargetDisplay();
    }

    /**
     * Cycle to previous target (simple decrement)
     */
    cycleTargetPrevious() {
        if (!this.tcm.targetComputerEnabled || !this.tcm.targetObjects || this.tcm.targetObjects.length === 0) {
            return;
        }

        this.tcm.targetIndex = this.tcm.targetIndex - 1;
        if (this.tcm.targetIndex < 0) {
            this.tcm.targetIndex = this.tcm.targetObjects.length - 1;
        }
        this.tcm.updateTargetDisplay();
    }

    /**
     * Clear target computer state completely - removes all target data and UI elements
     */
    clearTargetComputer() {
        // Reset ALL target state variables
        this.tcm.currentTarget = null;
        this.tcm.previousTarget = null;
        this.tcm.targetedObject = null;
        this.tcm.lastTargetedObjectId = null;
        this.tcm.targetIndex = -1;
        this.tcm.targetObjects = [];
        this.tcm.validTargets = [];
        this.tcm.lastTargetCycleTime = 0;
        this.tcm.isManualNavigationSelection = false;

        // Clear target computer system state if available
        const ship = this.tcm.viewManager?.getShip();
        const targetComputerSystem = ship?.getSystem('target_computer');
        if (targetComputerSystem) {
            targetComputerSystem.clearTarget();
            targetComputerSystem.deactivate();
        }

        // Hide HUD elements
        if (this.tcm.targetHUD) {
            this.tcm.targetHUD.style.display = 'none';
        }
        if (this.tcm.targetReticle) {
            this.tcm.targetReticle.style.display = 'none';
        }

        // Clear wireframe
        if (this.tcm.targetWireframe) {
            this.tcm.wireframeScene.remove(this.tcm.targetWireframe);
            this.tcm.targetWireframe.geometry.dispose();
            this.tcm.targetWireframe.material.dispose();
            this.tcm.targetWireframe = null;
        }

        // Clear 3D outline
        this.tcm.clearTargetOutline();

        // Disable target computer
        this.tcm.targetComputerEnabled = false;
    }

    /**
     * Clear current target and reset target state while keeping HUD visible
     */
    clearCurrentTarget() {
        debug('TARGETING', `🎯 clearCurrentTarget() called - current target: ${this.tcm.currentTarget?.name || 'None'}`);

        this.tcm.currentTarget = null;
        this.tcm.targetIndex = -1;

        // Keep HUD visible but show "No Target" state
        if (this.tcm.targetHUD) {
            this.tcm.targetHUD.style.display = 'block';
            this.tcm.targetHUD.style.visibility = 'visible';
            this.tcm.targetHUD.style.opacity = '1';
            debug('TARGETING', `🎯 Keeping target HUD visible for "No Target" state`);

            // Update display to show "No Target"
            this.tcm.updateTargetDisplay();

            // Ensure frame elements stay visible
            setTimeout(() => {
                if (this.tcm.targetHUD) {
                    this.tcm.targetHUD.style.display = 'block';
                    this.tcm.targetHUD.style.visibility = 'visible';

                    // Make sure any frame elements with styling are visible
                    const styledElements = this.tcm.targetHUD.querySelectorAll('*');
                    styledElements.forEach(el => {
                        const style = window.getComputedStyle(el);
                        if (style.borderWidth !== '0px' ||
                            style.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
                            style.backgroundImage !== 'none') {
                            if (el.style.display === 'none') {
                                el.style.display = 'block';
                            }
                            if (el.style.visibility === 'hidden') {
                                el.style.visibility = 'visible';
                            }
                        }
                    });
                }
            }, 10);
        }

        if (this.tcm.targetReticle) {
            this.tcm.targetReticle.style.display = 'none';
            debug('TARGETING', `🎯 Hidden target reticle`);
        }

        // Clear wireframe
        debug('TARGETING', `🎯 About to clear wireframe...`);
        this.tcm.clearTargetWireframe();

        // Clear HUD wireframe
        if (this.tcm.wireframeRenderer) {
            this.tcm.wireframeRenderer.clear();
            this.tcm.wireframeRenderer.render(new this.tcm.THREE.Scene(), new this.tcm.THREE.Camera());
        }

        if (this.tcm.wireframeContainer) {
            this.tcm.wireframeContainer.style.display = 'none';
        }

        debug('TARGETING', `🎯 Wireframe cleared`);

        // Hide direction arrows
        this.tcm.hideAllDirectionArrows();
        debug('TARGETING', `🎯 Direction arrows hidden`);

        debug('TARGETING', `✅ clearCurrentTarget() completed - HUD showing "No Target" state`);
    }

    /**
     * Find next valid target when current target is invalid
     */
    findNextValidTarget() {
        const startIndex = this.tcm.targetIndex;

        // Search for next valid target
        for (let i = 0; i < this.tcm.targetObjects.length; i++) {
            const nextIndex = (startIndex + i + 1) % this.tcm.targetObjects.length;
            const target = this.tcm.targetObjects[nextIndex];

            if (target && (target.object || target.position)) {
                this.tcm.targetIndex = nextIndex;
                return;
            }
        }

        // No valid targets found
        this.clearCurrentTarget();
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // No resources to dispose
    }
}
