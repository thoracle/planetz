/**
 * ShipMovementController
 *
 * Extracted from StarfieldManager.js to reduce god class size.
 * Manages ship movement, speed control, and rotation.
 *
 * Features:
 * - Speed state management (currentSpeed, targetSpeed, acceleration/deceleration)
 * - Smooth rotation with momentum (arrow key handling)
 * - Forward/backward movement based on view
 * - Integration with impulse engine system for energy consumption
 */

import { debug } from '../debug.js';
import { SHIP_MOVEMENT } from '../constants/ShipConstants.js';

export class ShipMovementController {
    /**
     * Create a ShipMovementController
     * @param {Object} starfieldManager - Reference to parent StarfieldManager for cross-calls
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // Speed state
        this.targetSpeed = 0;
        this.currentSpeed = 0;
        this.maxSpeed = SHIP_MOVEMENT.MAX_SPEED;
        this.acceleration = SHIP_MOVEMENT.ACCELERATION;
        this.deceleration = SHIP_MOVEMENT.DECELERATION;
        this.decelerating = false;

        // Rotation state
        this.rotationSpeed = SHIP_MOVEMENT.ROTATION_SPEED;
        this.rotationVelocity = { x: 0, y: 0 };
        this.rotationAcceleration = SHIP_MOVEMENT.ROTATION_ACCELERATION;
        this.rotationDeceleration = SHIP_MOVEMENT.ROTATION_DECELERATION;
        this.maxRotationSpeed = SHIP_MOVEMENT.MAX_ROTATION_SPEED;

        // Ship heading tracking (independent of camera view for radar consistency)
        this.shipHeading = undefined;
    }

    /**
     * Update smooth rotation based on arrow key states
     * @param {number} deltaTime - Time since last frame
     */
    updateSmoothRotation(deltaTime) {
        // Determine target rotation velocities based on key states
        let targetRotationX = 0;
        let targetRotationY = 0;

        if (this.sfm.keys.ArrowLeft) {
            targetRotationY = this.maxRotationSpeed;
        }
        if (this.sfm.keys.ArrowRight) {
            targetRotationY = -this.maxRotationSpeed;
        }
        if (this.sfm.keys.ArrowUp) {
            targetRotationX = this.maxRotationSpeed;
        }
        if (this.sfm.keys.ArrowDown) {
            targetRotationX = -this.maxRotationSpeed;
        }

        // Smooth acceleration/deceleration for Y rotation (left/right)
        if (Math.abs(targetRotationY) > 0) {
            // Accelerate towards target rotation speed
            if (Math.abs(this.rotationVelocity.y) < Math.abs(targetRotationY)) {
                const direction = Math.sign(targetRotationY);
                this.rotationVelocity.y += direction * this.rotationAcceleration * deltaTime * 60;
                // Clamp to target speed
                if (Math.abs(this.rotationVelocity.y) > Math.abs(targetRotationY)) {
                    this.rotationVelocity.y = targetRotationY;
                }
            }
        } else {
            // Decelerate to zero
            if (Math.abs(this.rotationVelocity.y) > 0) {
                const direction = -Math.sign(this.rotationVelocity.y);
                this.rotationVelocity.y += direction * this.rotationDeceleration * deltaTime * 60;
                // Stop if we've crossed zero
                if (Math.sign(this.rotationVelocity.y) !== Math.sign(this.rotationVelocity.y + direction * this.rotationDeceleration * deltaTime * 60)) {
                    this.rotationVelocity.y = 0;
                }
            }
        }

        // Smooth acceleration/deceleration for X rotation (up/down)
        if (Math.abs(targetRotationX) > 0) {
            // Accelerate towards target rotation speed
            if (Math.abs(this.rotationVelocity.x) < Math.abs(targetRotationX)) {
                const direction = Math.sign(targetRotationX);
                this.rotationVelocity.x += direction * this.rotationAcceleration * deltaTime * 60;
                // Clamp to target speed
                if (Math.abs(this.rotationVelocity.x) > Math.abs(targetRotationX)) {
                    this.rotationVelocity.x = targetRotationX;
                }
            }
        } else {
            // Decelerate to zero
            if (Math.abs(this.rotationVelocity.x) > 0) {
                const direction = -Math.sign(this.rotationVelocity.x);
                this.rotationVelocity.x += direction * this.rotationDeceleration * deltaTime * 60;
                // Stop if we've crossed zero
                if (Math.sign(this.rotationVelocity.x) !== Math.sign(this.rotationVelocity.x + direction * this.rotationDeceleration * deltaTime * 60)) {
                    this.rotationVelocity.x = 0;
                }
            }
        }

        // Apply rotation to camera
        if (Math.abs(this.rotationVelocity.y) > 0.0001) {
            this.sfm.camera.rotateY(this.rotationVelocity.y * deltaTime * 60);
            // Update ship heading when actually rotating (for radar consistency)
            if (this.shipHeading === undefined) {
                this.shipHeading = this.sfm.camera.rotation.y;
            } else {
                this.shipHeading += this.rotationVelocity.y * deltaTime * 60;
            }
        }
        if (Math.abs(this.rotationVelocity.x) > 0.0001) {
            this.sfm.camera.rotateX(this.rotationVelocity.x * deltaTime * 60);
        }

        // Update impulse engines rotation state for energy consumption
        const ship = this.sfm.viewManager?.getShip();
        if (ship) {
            const impulseEngines = ship.getSystem('impulse_engines');
            if (impulseEngines) {
                const isRotating = Math.abs(this.rotationVelocity.x) > 0.0001 || Math.abs(this.rotationVelocity.y) > 0.0001;
                impulseEngines.setRotating(isRotating);
            }
        }
    }

    /**
     * Update speed state with acceleration/deceleration
     * @param {number} deltaTime - Time since last frame
     */
    updateSpeedState(deltaTime) {
        // Handle speed changes with acceleration/deceleration
        if (this.decelerating) {
            // Calculate truly proportional deceleration rate to prevent oscillation near target
            const previousSpeed = this.currentSpeed;
            const speedDifference = this.currentSpeed - this.targetSpeed;

            // Truly proportional deceleration that scales with remaining distance
            // This prevents oscillation by ensuring deceleration decreases as we approach target
            const proportionalDecel = Math.min(this.deceleration, Math.max(0.001, speedDifference * 0.5));

            // Apply deceleration
            this.currentSpeed = Math.max(
                this.targetSpeed,
                this.currentSpeed - proportionalDecel
            );

            // Check if we've reached target speed
            const speedDiff = Math.abs(this.currentSpeed - this.targetSpeed);
            if (speedDiff < 0.01) {
                this.currentSpeed = this.targetSpeed;
                this.decelerating = false;
            }

            // Debug deceleration behavior
            const speedChange = Math.abs(this.currentSpeed - previousSpeed);

            // Update engine sound during deceleration
            if (this.sfm.audioManager.getEngineState() === 'running') {
                const volume = this.currentSpeed / this.maxSpeed;
                if (volume < 0.01) {
                    this.sfm.audioManager.playEngineShutdown();
                } else {
                    this.sfm.audioManager.updateEngineVolume(this.currentSpeed, this.maxSpeed);
                }
            }
        } else if (this.currentSpeed < this.targetSpeed) {
            // Only handle acceleration if we're not decelerating
            const previousSpeed = this.currentSpeed;
            const speedDiff = this.targetSpeed - this.currentSpeed;

            // Truly proportional acceleration that scales with remaining distance
            // This prevents oscillation by ensuring acceleration decreases as we approach target
            const proportionalAccel = Math.min(this.acceleration, Math.max(0.001, speedDiff * 0.5));

            const newSpeed = Math.min(
                this.targetSpeed,
                this.currentSpeed + proportionalAccel
            );
            this.currentSpeed = newSpeed;

            // Update engine sound during acceleration
            if (this.sfm.soundLoaded) {
                const volume = this.currentSpeed / this.maxSpeed;
                if (this.sfm.engineState === 'stopped' && this.currentSpeed > 0) {
                    this.sfm.playEngineStartup(volume);
                } else if (this.sfm.engineState === 'running') {
                    this.sfm.engineSound.setVolume(volume);
                }
            }
        }
    }

    /**
     * Apply forward/backward movement based on current speed and view
     * @param {number} deltaTime - Time since last frame
     */
    applyMovement(deltaTime) {
        if (this.currentSpeed > 0) {
            const moveDirection = this.sfm.view === 'AFT' ? -1 : 1;

            // Update impulse engines movement state
            const ship = this.sfm.viewManager?.getShip();
            if (ship) {
                const impulseEngines = ship.getSystem('impulse_engines');
                if (impulseEngines) {
                    impulseEngines.setMovingForward(true);
                }
            }

            // Calculate speed multiplier with reduced speeds for impulse 1, 2, 3, and 4
            let speedMultiplier = this.currentSpeed * 0.3; // Base multiplier

            // Apply speed reductions for lower impulse levels
            if (this.currentSpeed <= 3) {
                // Exponential reduction for impulse 1-3
                const reductionFactor = Math.pow(0.15, 4 - this.currentSpeed);
                speedMultiplier *= reductionFactor;
            } else if (this.currentSpeed === 4) {
                // Impulse 4: Use consistent exponential formula like other speeds
                const reductionFactor = Math.pow(0.15, 4 - this.currentSpeed);
                speedMultiplier *= reductionFactor;
            }
            // Impulse 5+: Standard calculation without reduction

            // Calculate actual movement based on current speed
            const THREE = this.sfm.THREE;
            const forwardVector = new THREE.Vector3(0, 0, -speedMultiplier * moveDirection);
            forwardVector.applyQuaternion(this.sfm.camera.quaternion);

            // Apply movement
            this.sfm.camera.position.add(forwardVector);
            this.sfm.camera.updateMatrixWorld();

            // Update ship position for weapon effects
            if (this.sfm.ship && this.sfm.ship.position) {
                this.sfm.ship.position.copy(this.sfm.camera.position);
            }
        } else {
            // Update impulse engines movement state when not moving
            const ship = this.sfm.viewManager?.getShip();
            if (ship) {
                const impulseEngines = ship.getSystem('impulse_engines');
                if (impulseEngines) {
                    impulseEngines.setMovingForward(false);
                }
            }
        }
    }

    /**
     * Set target speed with proper state management
     * @param {number} speed - Target speed (0-9)
     */
    setTargetSpeed(speed) {
        const clampedSpeed = Math.max(0, Math.min(this.maxSpeed, speed));

        if (clampedSpeed < this.currentSpeed) {
            this.decelerating = true;
        } else {
            this.decelerating = false;
        }

        this.targetSpeed = clampedSpeed;
        return clampedSpeed;
    }

    /**
     * Get current movement state for UI display
     * @returns {Object} Movement state
     */
    getMovementState() {
        return {
            currentSpeed: this.currentSpeed,
            targetSpeed: this.targetSpeed,
            maxSpeed: this.maxSpeed,
            decelerating: this.decelerating,
            isMoving: this.currentSpeed > 0,
            isRotating: Math.abs(this.rotationVelocity.x) > 0.0001 || Math.abs(this.rotationVelocity.y) > 0.0001
        };
    }

    /**
     * Stop all movement immediately
     */
    stopAllMovement() {
        this.currentSpeed = 0;
        this.targetSpeed = 0;
        this.decelerating = false;
        this.rotationVelocity = { x: 0, y: 0 };
    }

    /**
     * Set impulse speed with engine audio feedback
     * @param {number} requestedSpeed - The requested speed (0-9)
     * @returns {boolean} True if speed was set successfully
     */
    setImpulseSpeed(requestedSpeed) {
        // Don't allow speed changes while docked
        if (this.sfm.isDocked) {
            return false;
        }

        // Update impulse engines with new speed setting (this will clamp the speed)
        const ship = this.sfm.viewManager?.getShip();
        let actualSpeed = requestedSpeed; // fallback

        if (ship) {
            const impulseEngines = ship.getSystem('impulse_engines');
            if (impulseEngines) {
                // Check if the requested speed exceeds the engine's maximum capability
                const maxSpeed = impulseEngines.getMaxImpulseSpeed();

                if (requestedSpeed > maxSpeed) {
                    // Requested speed exceeds engine capability - fail silently for modal
                    return false;
                }

                impulseEngines.setImpulseSpeed(requestedSpeed);
                // Get the actual clamped speed from the impulse engines
                actualSpeed = impulseEngines.getImpulseSpeed();
            }
        }

        // Set target speed to the actual clamped speed
        this.targetSpeed = actualSpeed;

        // Determine if we need to decelerate
        if (actualSpeed < this.currentSpeed) {
            this.decelerating = true;
            // Start engine shutdown if going to zero
            if (actualSpeed === 0 && this.sfm.engineState === 'running') {
                this.sfm.playEngineShutdown();
            }
        } else {
            this.decelerating = false;
            // Handle engine sounds for acceleration
            if (this.sfm.soundLoaded) {
                const volume = actualSpeed / this.maxSpeed;
                if (this.sfm.engineState === 'stopped') {
                    this.sfm.playEngineStartup(volume);
                } else if (this.sfm.engineState === 'running') {
                    this.sfm.engineSound.setVolume(volume);
                }
            }
        }

        return true;
    }
}
