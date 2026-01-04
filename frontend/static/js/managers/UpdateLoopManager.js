/**
 * UpdateLoopManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles the main game loop update coordination.
 *
 * Features:
 * - Coordinate all subsystem updates each frame
 * - Handle docked vs flying state
 * - Update movement, weapons, targeting, AI
 */

import { debug } from '../debug.js';

export class UpdateLoopManager {
    /**
     * Create an UpdateLoopManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
    }

    /**
     * Main update loop - called each frame
     * @param {number} deltaTime - Time since last frame in seconds
     */
    update(deltaTime) {
        if (!deltaTime) deltaTime = 1/60;

        // If docked, update orbit instead of normal movement
        if (this.sfm.isDocked) {
            this.sfm.updateOrbit(deltaTime);
            this.sfm.updateSpeedIndicator();
            return;
        }

        // Handle smooth rotation from arrow keys
        this.sfm.updateSmoothRotation(deltaTime);

        // Handle speed changes with acceleration/deceleration
        this.sfm.shipMovementController.updateSpeedState(deltaTime);

        this.sfm.updateSpeedIndicator();

        // Only update ship systems display when damage control is open
        // and when systems have actually changed (not every frame)
        if (this.sfm.isDamageControlOpen && this.sfm.shouldUpdateDamageControl) {
            this.sfm.updateShipSystemsDisplay();
            this.sfm.shouldUpdateDamageControl = false;
        }

        // Update weapon effects manager for visual effects animation
        const weaponEffectsManager = this.sfm.ensureWeaponEffectsManager();
        if (weaponEffectsManager) {
            weaponEffectsManager.update(deltaTime);
        }

        // Ensure weapon effects manager is connected to ship
        this.sfm.ensureWeaponEffectsConnection();

        // Forward/backward movement based on view
        this.sfm.shipMovementController.applyMovement(deltaTime);

        // Update starfield positions - delegate to StarfieldRenderer
        this.sfm.starfieldRenderer.updateStarfieldPositions(this.sfm.camera.position, this.sfm.view);

        // Update targeting system - delegate to TargetValidationManager
        this.sfm.targetValidationManager.updateTargetingState(deltaTime);

        // Update weapon system - delegate to WeaponHUDManager
        this.sfm.weaponHUDManager.updateWeaponSystem(deltaTime);

        // Update 3D proximity detector
        if (this.sfm.proximityDetector3D) {
            this.sfm.proximityDetector3D.update(deltaTime);
        }

        // Update enemy AI manager
        if (this.sfm.enemyAIManager) {
            this.sfm.enemyAIManager.update(deltaTime);
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.sfm = null;
    }
}
