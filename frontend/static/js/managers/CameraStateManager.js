/**
 * CameraStateManager
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Manages camera-related state vectors and mouse look settings.
 *
 * Features:
 * - Camera direction vectors for movement calculations
 * - Mouse look sensitivity and rotation state
 * - Velocity vector for ship movement
 */

import { SHIP_MOVEMENT } from '../constants/ShipConstants.js';

export class CameraStateManager {
    /**
     * Create a CameraStateManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
        const THREE = starfieldManager.THREE;

        // Movement velocity vector
        this.velocity = new THREE.Vector3();

        // Rotation speed from constants
        this.rotationSpeed = SHIP_MOVEMENT.ROTATION_SPEED;

        // Camera direction vectors for movement calculations
        this.cameraDirection = new THREE.Vector3();
        this.cameraRight = new THREE.Vector3();
        this.cameraUp = new THREE.Vector3();

        // Mouse look settings
        this.mouseSensitivity = SHIP_MOVEMENT.MOUSE_SENSITIVITY;
        this.mouseRotation = new THREE.Vector2();
        this.isMouseLookEnabled = false; // Disabled to match thoralexander.com
    }

    /**
     * Update camera direction vectors from camera
     * @param {THREE.Camera} camera - The camera to get direction from
     */
    updateFromCamera(camera) {
        camera.getWorldDirection(this.cameraDirection);
        this.cameraRight.crossVectors(this.cameraDirection, camera.up).normalize();
        this.cameraUp.crossVectors(this.cameraRight, this.cameraDirection).normalize();
    }

    /**
     * Reset velocity to zero
     */
    resetVelocity() {
        this.velocity.set(0, 0, 0);
    }

    /**
     * Reset mouse rotation
     */
    resetMouseRotation() {
        this.mouseRotation.set(0, 0);
    }

    /**
     * Toggle mouse look mode
     * @returns {boolean} New mouse look state
     */
    toggleMouseLook() {
        this.isMouseLookEnabled = !this.isMouseLookEnabled;
        return this.isMouseLookEnabled;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.velocity = null;
        this.cameraDirection = null;
        this.cameraRight = null;
        this.cameraUp = null;
        this.mouseRotation = null;
        this.sfm = null;
    }
}
