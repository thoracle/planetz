/**
 * TargetUpdateLoop
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Handles the per-frame update loop for the target computer.
 *
 * Features:
 * - Updates reticle position and info when target exists
 * - Animates wireframe rotation and oscillation
 * - Updates sub-target visual indicators
 * - Renders wireframe scene
 * - Updates direction arrows
 * - Animates sub-system wireframe when visible
 */

import { debug } from '../debug.js';

export class TargetUpdateLoop {
    /**
     * Create a TargetUpdateLoop
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;
    }

    /**
     * Main update method called each frame from StarfieldManager
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        // Animate sub-system wireframe if visible
        if (this.tcm.subSystemPanelManager?.isPanelVisible()) {
            this.tcm.animateSubSystemWireframe();
        }

        if (!this.tcm.targetComputerEnabled) {
            return;
        }

        // Update reticle position if we have a target
        if (this.tcm.currentTarget) {
            this.tcm.updateReticlePosition();
            this.tcm.updateReticleTargetInfo();
        }

        // Render wireframe if target computer is enabled and we have a target
        if (this.tcm.targetWireframe && this.tcm.wireframeScene && this.tcm.wireframeRenderer) {
            this.updateWireframe(deltaTime);
        }

        // Update direction arrow
        if (this.tcm.currentTarget) {
            this.tcm.updateDirectionArrow();
        } else {
            // Hide all arrows
            this.tcm.hideAllDirectionArrows();
        }
    }

    /**
     * Update wireframe animation and rendering
     * @param {number} deltaTime - Time since last frame
     */
    updateWireframe(deltaTime) {
        try {
            // Rotate wireframe continuously
            if (this.tcm.targetWireframe) {
                this.tcm.targetWireframe.rotation.y += deltaTime * 0.5; // Increased rotation speed
                this.tcm.targetWireframe.rotation.x = 0.5 + Math.sin(Date.now() * 0.001) * 0.2; // Increased oscillation
            }

            // Update sub-target visual indicators
            this.tcm.updateSubTargetIndicators();

            // Render the wireframe scene
            this.tcm.wireframeRenderer.render(this.tcm.wireframeScene, this.tcm.wireframeCamera);
        } catch (error) {
            debug('P1', `Error rendering wireframe: ${error}`);
        }
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        // No resources to dispose
    }
}
