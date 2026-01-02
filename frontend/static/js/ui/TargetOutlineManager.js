/**
 * TargetOutlineManager
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Manages 3D target outlines in the world scene.
 *
 * Features:
 * - Creates wireframe outlines around targeted objects
 * - Updates outline position/rotation to track targets
 * - Color-codes outlines based on diplomacy status
 * - Properly disposes of Three.js resources
 */

import { debug } from '../debug.js';

export class TargetOutlineManager {
    /**
     * Create a TargetOutlineManager
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;

        // Outline system state
        this.outlineEnabled = true;
        this.lastOutlineUpdate = 0;
        this.targetOutline = null;
        this.outlineGeometry = null;
        this.outlineMaterial = null;
    }

    /**
     * Create 3D target outline in the world
     * @param {THREE.Object3D} targetObject - The target object to outline
     * @param {string} outlineColor - CSS color string for outline
     * @param {Object} targetData - Target data object (optional)
     */
    createTargetOutline(targetObject, outlineColor = '#00ff41', targetData = null) {
        const THREE = this.tcm.THREE;
        const scene = this.tcm.scene;

        // Clear any existing outline first
        this.clearTargetOutline();

        if (!targetObject || !targetObject.geometry) {
            return;
        }

        const currentTargetData = targetData || this.tcm.getCurrentTargetData();
        if (!currentTargetData) {
            return;
        }

        try {
            // Create outline geometry
            this.outlineGeometry = targetObject.geometry.clone();

            // Create outline material
            this.outlineMaterial = new THREE.MeshBasicMaterial({
                color: outlineColor,
                side: THREE.BackSide,
                transparent: true,
                opacity: 0.5,
                wireframe: true
            });

            // Create outline mesh
            this.targetOutline = new THREE.Mesh(this.outlineGeometry, this.outlineMaterial);

            // Position outline at target location
            this.targetOutline.position.copy(targetObject.position);
            this.targetOutline.rotation.copy(targetObject.rotation);
            this.targetOutline.scale.copy(targetObject.scale).multiplyScalar(1.1);

            // Add to scene
            scene.add(this.targetOutline);

        } catch (error) {
            debug('P1', `Error creating target outline: ${error}`);
        }
    }

    /**
     * Update 3D target outline
     * @param {THREE.Object3D} targetObject - The target object
     * @param {number} deltaTime - Time since last frame
     */
    updateTargetOutline(targetObject, deltaTime) {
        if (!this.tcm.targetObjects || this.tcm.targetObjects.length === 0) {
            this.clearTargetOutline();
            return;
        }

        if (!this.tcm.targetComputerEnabled) {
            this.clearTargetOutline();
            return;
        }

        if (!this.tcm.currentTarget) {
            this.clearTargetOutline();
            return;
        }

        const targetData = this.tcm.getCurrentTargetData();
        if (!targetData) {
            this.clearTargetOutline();
            return;
        }

        if (!targetObject || targetObject !== this.tcm.currentTarget) {
            this.clearTargetOutline();
            return;
        }

        // Get outline color based on target type
        let outlineColor = this.getOutlineColorForTarget(targetData);

        // Create or update outline
        this.createTargetOutline(targetObject, outlineColor, targetData);
    }

    /**
     * Clear 3D target outline
     */
    clearTargetOutline() {
        const scene = this.tcm.scene;

        if (this.targetOutline) {
            scene.remove(this.targetOutline);

            if (this.outlineGeometry) {
                this.outlineGeometry.dispose();
                this.outlineGeometry = null;
            }

            if (this.outlineMaterial) {
                this.outlineMaterial.dispose();
                this.outlineMaterial = null;
            }

            this.targetOutline = null;
        }
    }

    /**
     * Get outline color for target based on diplomacy
     * @param {Object} targetData - Target data object
     * @returns {string} CSS color string
     */
    getOutlineColorForTarget(targetData) {
        if (targetData?.isShip) {
            return '#ff3333'; // Enemy ships are red
        }

        const info = this.tcm.solarSystemManager.getCelestialBodyInfo(this.tcm.currentTarget);
        if (info?.diplomacy?.toLowerCase() === 'enemy') {
            return '#ff3333';
        } else if (info?.diplomacy?.toLowerCase() === 'friendly') {
            return '#00ff41';
        } else if (info?.diplomacy?.toLowerCase() === 'neutral') {
            return '#ffff00';
        }

        return '#00ff41'; // Default green
    }

    /**
     * Check if outlines are enabled
     * @returns {boolean} True if outlines are enabled
     */
    isEnabled() {
        return this.outlineEnabled;
    }

    /**
     * Enable or disable outlines
     * @param {boolean} enabled - Whether to enable outlines
     */
    setEnabled(enabled) {
        this.outlineEnabled = enabled;
        if (!enabled) {
            this.clearTargetOutline();
        }
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.clearTargetOutline();
        this.outlineEnabled = true;
        this.lastOutlineUpdate = 0;
    }
}
