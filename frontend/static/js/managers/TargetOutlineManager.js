/**
 * TargetOutlineManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles 3D outline rendering for targeted objects in the game world.
 *
 * Features:
 * - Creates translucent backface outlines around targets
 * - Pulsing animation effect for visual feedback
 * - Color-coded outlines based on diplomacy status
 * - Automatic cleanup of Three.js resources
 */

import { debug } from '../debug.js';

export class TargetOutlineManager {
    /**
     * Create a TargetOutlineManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // Outline state
        this.outlineEnabled = false;
        this.targetOutline = null;
        this.targetOutlineObject = null;
        this.outlineDisabledUntilManualCycle = false;
        this._noTargetsWarningLogged = false;
    }

    /**
     * Create a 3D outline around the targeted object in the world
     * @param {Object3D} targetObject - The object to outline
     * @param {string} outlineColor - Hex color for the outline
     * @param {Object} targetData - Optional target data to avoid race conditions
     */
    createTargetOutline(targetObject, outlineColor = '#00ff41', targetData = null) {
        if (!this.outlineEnabled || !targetObject) return;

        const THREE = this.sfm.THREE;
        const scene = this.sfm.scene;

        // Prevent continuous recreation - check if we already have an outline for this object
        if (this.targetOutline && this.targetOutlineObject === targetObject) {
            return; // Already have outline for this object
        }

        // Use provided targetData or fetch it if not provided
        const currentTargetData = targetData || this.sfm.getCurrentTargetData();
        if (!currentTargetData || !currentTargetData.name || currentTargetData.name === 'unknown') {
            debug('TARGETING', `🎯 Skipping outline creation - invalid target data: hasTargetData=${!!currentTargetData}, name=${currentTargetData?.name}`);
            return;
        }

        try {
            // Clear any existing outline
            this.clearTargetOutline();

            // Store reference to the object being outlined
            this.targetOutlineObject = targetObject;

            debug('TARGETING', `🎯 Creating 3D outline for target: ${currentTargetData.name}`);

            // Create outline material with slightly larger scale
            const outlineMaterial = new THREE.MeshBasicMaterial({
                color: new THREE.Color(outlineColor),
                transparent: true,
                opacity: 0.4,
                side: THREE.BackSide, // Render back faces to create outline effect
                depthWrite: false
            });

            // Create outline mesh by cloning the target's geometry
            let outlineGeometry = null;

            if (targetObject.geometry) {
                // Direct geometry clone
                outlineGeometry = targetObject.geometry.clone();
            } else if (targetObject.children && targetObject.children.length > 0) {
                // For grouped objects (like ships), create a bounding box outline
                const box = new THREE.Box3().setFromObject(targetObject);
                const size = box.getSize(new THREE.Vector3());
                const center = box.getCenter(new THREE.Vector3());

                // Create a box geometry that encompasses the object
                outlineGeometry = new THREE.BoxGeometry(size.x * 1.2, size.y * 1.2, size.z * 1.2);

                // Adjust position to match the bounding box center
                const offset = center.clone().sub(targetObject.position);
                outlineGeometry.translate(offset.x, offset.y, offset.z);
            } else {
                // Fallback: create a simple sphere outline
                outlineGeometry = new THREE.SphereGeometry(2, 16, 12);
            }

            if (outlineGeometry) {
                this.targetOutline = new THREE.Mesh(outlineGeometry, outlineMaterial);

                // Position the outline to match the target
                this.targetOutline.position.copy(targetObject.position);
                this.targetOutline.rotation.copy(targetObject.rotation);
                this.targetOutline.scale.copy(targetObject.scale).multiplyScalar(1.05); // Slightly larger

                // Add to scene
                scene.add(this.targetOutline);

                debug('TARGETING', `🎯 Created 3D outline for target: ${currentTargetData.name}`);
            }

        } catch (error) {
            debug('P1', `Failed to create target outline: ${error}`);
        }
    }

    /**
     * Update the outline position and animation
     * @param {Object3D} targetObject - The current target object
     * @param {number} deltaTime - Time delta for animations
     */
    updateTargetOutline(targetObject, deltaTime) {
        // CRITICAL: Prevent outline creation when no targets exist
        if (!this.sfm.targetObjects || this.sfm.targetObjects.length === 0) {
            // Only log this message once per state change to avoid spam
            if (!this._noTargetsWarningLogged) {
                this._noTargetsWarningLogged = true;
            }
            if (this.targetOutline) {
                this.clearTargetOutline();
            }
            return;
        }

        // Reset warning flag when targets are available
        this._noTargetsWarningLogged = false;

        // Check if outlines are enabled and not suppressed
        if (!this.outlineEnabled || this.outlineDisabledUntilManualCycle) {
            if (this.targetOutline) {
                this.clearTargetOutline();
            }
            return;
        }

        // CRITICAL: Check if we have a valid current target
        if (!this.sfm.currentTarget) {
            if (this.targetOutline) {
                this.clearTargetOutline();
            }
            return;
        }

        // Validate target data before proceeding
        const targetData = this.sfm.getCurrentTargetData();
        if (!targetData || !targetData.name || targetData.name === 'unknown') {
            // Clear outline for invalid targets
            if (this.targetOutline) {
                this.clearTargetOutline();
            }
            return;
        }

        // Additional check: Ensure targetObject is valid and exists in scene
        if (!targetObject || !targetObject.position) {
            if (this.targetOutline) {
                this.clearTargetOutline();
            }
            return;
        }

        // Check if outline needs to be created or recreated
        if (!this.targetOutline || this.targetOutlineObject !== targetObject) {
            const outlineColor = this.getOutlineColorForTarget(targetData);
            // Pass the validated target data to prevent race condition
            this.createTargetOutline(targetObject, outlineColor, targetData);
        }

        // Update outline position and rotation to match target
        if (this.targetOutline && targetObject) {
            this.targetOutline.position.copy(targetObject.position);
            this.targetOutline.rotation.copy(targetObject.rotation);

            // Add subtle pulsing animation
            if (deltaTime) {
                const time = Date.now() * 0.002;
                const pulseScale = 1.0 + Math.sin(time) * 0.02;
                this.targetOutline.scale.setScalar(pulseScale);
            }
        }
    }

    /**
     * Clear the current 3D outline
     */
    clearTargetOutline() {
        const scene = this.sfm.scene;

        // More thorough clearing with detailed logging
        debug('TARGETING', 'clearTargetOutline called');
        debug('TARGETING', `   • targetOutline exists: ${!!this.targetOutline}`);
        debug('TARGETING', `   • targetOutlineObject exists: ${!!this.targetOutlineObject}`);

        if (!this.targetOutline && !this.targetOutlineObject) {
            debug('UTILITY', 'No outline objects to clear');
            return;
        }

        try {
            // Clear the 3D outline from scene
            if (this.targetOutline) {
                debug('TARGETING', 'Removing targetOutline from scene');
                scene.remove(this.targetOutline);

                // Dispose of geometry and material to free memory
                if (this.targetOutline.geometry) {
                    this.targetOutline.geometry.dispose();
                    debug('TARGETING', 'Disposed targetOutline geometry');
                }
                if (this.targetOutline.material) {
                    this.targetOutline.material.dispose();
                    debug('TARGETING', 'Disposed targetOutline material');
                }
            }

            // Force clear both properties
            this.targetOutline = null;
            this.targetOutlineObject = null;

            debug('TARGETING', '✅ Target outline completely cleared');

        } catch (error) {
            debug('P1', `❌ Error clearing target outline: ${error}`);
            // Force clear even if there was an error
            this.targetOutline = null;
            this.targetOutlineObject = null;
            debug('P1', 'Force-cleared outline properties after error');
        }

        // Double-check that they're actually cleared
        if (this.targetOutline || this.targetOutlineObject) {
            debug('P1', '⚠️ WARNING: Outline properties still exist after clearing!');
            debug('TARGETING', `   • targetOutline: ${this.targetOutline}`);
            debug('TARGETING', `   • targetOutlineObject: ${this.targetOutlineObject}`);
        }
    }

    /**
     * Toggle the outline system on/off
     */
    toggleTargetOutline() {
        this.outlineEnabled = !this.outlineEnabled;

        // Clear any destruction suppression when manually toggling
        this.outlineDisabledUntilManualCycle = false;

        if (!this.outlineEnabled) {
            this.clearTargetOutline();
        } else if (this.sfm.currentTarget) {
            // Recreate outline for current target using validated method with target data
            const targetData = this.sfm.getCurrentTargetData();
            if (targetData && targetData.name && targetData.name !== 'unknown') {
                this.updateTargetOutline(this.sfm.currentTarget, 0);
            }
        }

        debug('TARGETING', `🎯 Target outline ${this.outlineEnabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Get the appropriate outline color based on target type
     * @param {Object} targetData - Target data from getCurrentTargetData()
     * @returns {string} Hex color string
     */
    getOutlineColorForTarget(targetData) {
        if (!targetData) return '#44ffff'; // Teal for unknown

        if (targetData.isShip) {
            return '#ff3333'; // Red for enemy ships
        } else if (targetData.diplomacy?.toLowerCase() === 'friendly') {
            return '#00ff41'; // Green for friendlies
        } else if (targetData.diplomacy?.toLowerCase() === 'neutral') {
            return '#ffff00'; // Yellow for neutrals
        } else {
            return '#00ff41'; // Default green
        }
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.clearTargetOutline();
        this.sfm = null;
    }
}
