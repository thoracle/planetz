/**
 * DestroyedTargetHandler
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles target destruction and synchronization across all targeting systems.
 *
 * Features:
 * - Removes destroyed ships from scene and tracking arrays
 * - Cleans up spatial/physics manager registrations
 * - Synchronizes all targeting systems (HUD, weapon lock, target computer)
 * - Handles autofire state when target is destroyed
 * - Cycles to next available target after destruction
 */

import { debug } from '../debug.js';

export class DestroyedTargetHandler {
    /**
     * Create a DestroyedTargetHandler
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
    }

    /**
     * Handle target destruction and synchronization across all targeting systems
     * @param {Object} destroyedShip - The ship that was destroyed
     */
    removeDestroyedTarget(destroyedShip) {
        if (!destroyedShip) return;

        debug('TARGETING', `💥 removeDestroyedTarget called for: ${destroyedShip.shipName || 'unknown ship'}`);

        // Send mission event for enemy destruction
        this.sfm.sendEnemyDestroyedEvent(destroyedShip);

        // First, physically remove the ship from the scene and arrays
        let shipMesh = null;

        // Find the mesh for this ship
        for (let i = this.sfm.dummyShipMeshes.length - 1; i >= 0; i--) {
            const mesh = this.sfm.dummyShipMeshes[i];
            if (mesh.userData.ship === destroyedShip) {
                shipMesh = mesh;

                // Remove from the scene
                debug('UTILITY', `🗑️ Removing ${destroyedShip.shipName} mesh from scene`);
                this.sfm.scene.remove(mesh);

                // CRITICAL: Remove from spatial tracking systems
                if (window.spatialManager && typeof window.spatialManager.removeObject === 'function') {
                    debug('PHYSICS', `🗑️ Removing ${destroyedShip.shipName} from spatial tracking`);
                    window.spatialManager.removeObject(mesh);
                } else if (window.physicsManager && typeof window.physicsManager.removeRigidBody === 'function') {
                    // Fallback to physics manager if available (legacy support)
                    debug('PHYSICS', `🗑️ Removing ${destroyedShip.shipName} rigid body from physics world`);
                    window.physicsManager.removeRigidBody(mesh);
                } else {
                    debug('PHYSICS', `ℹ️ No physics cleanup needed for ${destroyedShip.shipName} - using Three.js spatial systems`);
                }

                // Clean up mesh resources
                if (mesh.geometry) {
                    mesh.geometry.dispose();
                }
                if (mesh.material) {
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach(material => material.dispose());
                    } else {
                        mesh.material.dispose();
                    }
                }

                // Remove from dummyShipMeshes array
                this.sfm.dummyShipMeshes.splice(i, 1);
                debug('UTILITY', `🗑️ Removed ${destroyedShip.shipName} from dummyShipMeshes array`);
                break;
            }
        }

        // Also support removing destroyed navigation beacons (by Three.js object)
        if (!shipMesh && this.sfm.navigationBeacons && destroyedShip.isBeacon) {
            for (let i = this.sfm.navigationBeacons.length - 1; i >= 0; i--) {
                const mesh = this.sfm.navigationBeacons[i];
                if (mesh === destroyedShip || mesh.userData === destroyedShip || mesh.userData?.isBeacon === true && mesh === destroyedShip) {

                    this.sfm.scene.remove(mesh);
                    // Remove from spatial tracking systems
                    if (window.spatialManager && typeof window.spatialManager.removeObject === 'function') {
                        window.spatialManager.removeObject(mesh);
                    } else if (window.physicsManager && typeof window.physicsManager.removeRigidBody === 'function') {
                        window.physicsManager.removeRigidBody(mesh);
                    }
                    if (mesh.geometry) mesh.geometry.dispose();
                    if (mesh.material) mesh.material.dispose();
                    this.sfm.navigationBeacons.splice(i, 1);
                    break;
                }
            }
        }

        // Check if ANY targeting system was targeting the destroyed ship
        const ship = this.sfm.viewManager?.getShip();
        const targetComputer = ship?.getSystem('target_computer');

        const hudTargetsDestroyed = this.sfm.currentTarget &&
            (this.sfm.currentTarget === shipMesh ||
             this.sfm.getCurrentTargetData()?.ship === destroyedShip);

        const weaponTargetsDestroyed = ship?.weaponSystem?.lockedTarget &&
            (ship.weaponSystem.lockedTarget === shipMesh ||
             ship.weaponSystem.lockedTarget === destroyedShip);

        const tcTargetsDestroyed = targetComputer?.currentTarget === destroyedShip;

        // IMPROVED: Check if outline is targeting destroyed ship
        const outlineTargetsDestroyed = this.sfm.targetOutlineObject &&
            (this.sfm.targetOutlineObject === shipMesh ||
             this.sfm.targetOutlineObject === destroyedShip ||
             this.sfm.targetOutlineObject === this.sfm.currentTarget);

        const anySystemTargeting = hudTargetsDestroyed || weaponTargetsDestroyed || tcTargetsDestroyed || outlineTargetsDestroyed;

        debug('TARGETING', `🔍 Targeting analysis:`);
        debug('TARGETING', `   • HUD targets destroyed ship: ${hudTargetsDestroyed}`);
        debug('TARGETING', `   • Weapon targets destroyed ship: ${weaponTargetsDestroyed}`);
        debug('TARGETING', `   • Target computer targets destroyed ship: ${tcTargetsDestroyed}`);
        debug('TARGETING', `   • Outline targets destroyed ship: ${outlineTargetsDestroyed}`);
        debug('TARGETING', `   • Any system targeting: ${anySystemTargeting}`);

        if (anySystemTargeting) {
            this.handleTargetedShipDestroyed(ship, targetComputer, shipMesh, destroyedShip);
        } else {
            this.handleNonTargetedShipDestroyed(ship, destroyedShip);
        }

        debug('TARGETING', `✅ removeDestroyedTarget complete for: ${destroyedShip.shipName || 'unknown ship'}`);
    }

    /**
     * Handle cleanup when a targeted ship is destroyed
     * @private
     */
    handleTargetedShipDestroyed(ship, targetComputer, shipMesh, destroyedShip) {
        debug('TARGETING', 'Destroyed ship was targeted - performing full synchronization cleanup');

        // Clear ALL targeting system references
        this.sfm.currentTarget = null;
        this.sfm.targetIndex = -1;

        if (ship?.weaponSystem) {
            ship.weaponSystem.setLockedTarget(null);

            // Turn off autofire when main target is destroyed
            // This doesn't apply to sub-targets, only when the entire ship is destroyed
            if (ship.weaponSystem.isAutofireOn) {
                ship.weaponSystem.isAutofireOn = false;
                debug('TARGETING', 'Autofire turned OFF - main target destroyed');

                // Update UI to reflect autofire is now off
                if (ship.weaponSystem.weaponHUD) {
                    ship.weaponSystem.weaponHUD.updateAutofireStatus(false);
                }

                // Show message to player
                ship.weaponSystem.showMessage('Autofire disabled - target destroyed', 3000);
            }
        }

        if (targetComputer) {
            targetComputer.clearTarget();
            targetComputer.clearSubTarget();
        }

        // ALWAYS clear 3D outline when a targeted ship is destroyed
        debug('TARGETING', 'Clearing 3D outline for destroyed target');
        this.sfm.clearTargetOutline();

        // Update target list to remove destroyed ship
        this.sfm.updateTargetList();

        // Select new target using proper cycling logic
        if (this.sfm.targetObjects && this.sfm.targetObjects.length > 0) {
            debug('TARGETING', `🔄 Cycling to new target from ${this.sfm.targetObjects.length} available targets`);

            // Prevent outlines from appearing automatically after destruction
            this.sfm.outlineDisabledUntilManualCycle = true;

            // Cycle to next target without creating outline (automatic cycle)
            this.sfm.cycleTarget(false);

            debug('TARGETING', 'Target cycled after destruction - outline disabled until next manual cycle');
        } else {
            debug('TARGETING', '📭 No targets remaining after destruction');

            // CRITICAL: Force clear outline again when no targets remain
            debug('TARGETING', 'Force-clearing outline - no targets remaining');
            this.sfm.clearTargetOutline();

            // Clear wireframe and hide UI
            if (this.sfm.targetWireframe) {
                this.sfm.wireframeScene.remove(this.sfm.targetWireframe);
                this.sfm.targetWireframe.geometry.dispose();
                this.sfm.targetWireframe.material.dispose();
                this.sfm.targetWireframe = null;
            }

            if (this.sfm.targetComputerManager) {
                this.sfm.targetComputerManager.hideTargetHUD();
                this.sfm.targetComputerManager.hideTargetReticle();
            }
        }
    }

    /**
     * Handle cleanup when a non-targeted ship is destroyed
     * @private
     */
    handleNonTargetedShipDestroyed(ship, destroyedShip) {
        debug('TARGETING', 'Destroyed ship was not targeted by any system - minimal cleanup');

        // Check if autofire was targeting this ship even if not officially "targeted"
        if (ship?.weaponSystem?.isAutofireOn && ship.weaponSystem.lockedTarget) {
            // Check if the destroyed ship matches the autofire target
            const autofireTargetShip = ship.weaponSystem.lockedTarget.ship;
            if (autofireTargetShip === destroyedShip) {
                ship.weaponSystem.isAutofireOn = false;
                ship.weaponSystem.setLockedTarget(null);
                debug('TARGETING', 'Autofire turned OFF - autofire target destroyed');

                // Update UI to reflect autofire is now off
                if (ship.weaponSystem.weaponHUD) {
                    ship.weaponSystem.weaponHUD.updateAutofireStatus(false);
                }

                // Show message to player
                ship.weaponSystem.showMessage('Autofire disabled - target destroyed', 3000);
            }
        }

        // ALWAYS clear 3D outline when any ship is destroyed
        // Even if not "targeted", the outline might still be showing it
        debug('UTILITY', 'Force-clearing 3D outline for safety');
        this.sfm.clearTargetOutline();

        // Still refresh the target list to keep everything in sync
        this.sfm.updateTargetList();

        // Validate and refresh current target if needed
        if (this.sfm.targetObjects && this.sfm.targetObjects.length > 0 && this.sfm.targetIndex >= 0) {
            if (this.sfm.targetIndex >= this.sfm.targetObjects.length) {
                this.sfm.targetIndex = 0;
            }
            // Refresh display and outline for current target
            this.sfm.updateTargetDisplay();
            if (this.sfm.currentTarget && this.sfm.outlineEnabled) {
                // Use validated outline update instead of direct creation
                this.sfm.updateTargetOutline(this.sfm.currentTarget, 0);
            }
        } else if (this.sfm.targetObjects && this.sfm.targetObjects.length === 0) {
            // No targets left, clear everything
            this.sfm.currentTarget = null;
            this.sfm.targetIndex = -1;
            this.sfm.clearTargetOutline();

            if (this.sfm.targetComputerManager) {
                this.sfm.targetComputerManager.hideTargetHUD();
                this.sfm.targetComputerManager.hideTargetReticle();
            }
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.sfm = null;
    }
}
