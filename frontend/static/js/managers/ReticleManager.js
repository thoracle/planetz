/**
 * ReticleManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles target reticle positioning, color updates, and info displays.
 *
 * Features:
 * - Projects 3D target position to 2D screen coordinates
 * - Updates reticle position on screen
 * - Manages target name and distance displays
 * - Color-codes reticle based on diplomacy status
 * - Handles behind-camera and off-screen target cases
 */

import { debug } from '../debug.js';

export class ReticleManager {
    /**
     * Create a ReticleManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
    }

    /**
     * Update the reticle position based on current target
     */
    updateReticlePosition() {
        const tcm = this.sfm.targetComputerManager;

        if (!this.sfm.currentTarget || !this.sfm.targetComputerEnabled) {
            tcm.hideTargetReticle();
            if (this.sfm.targetNameDisplay) {
                this.sfm.targetNameDisplay.style.display = 'none';
            }
            if (this.sfm.targetDistanceDisplay) {
                this.sfm.targetDistanceDisplay.style.display = 'none';
            }
            return;
        }

        // Get target position using helper function
        const targetPosition = this.sfm.getTargetPosition(this.sfm.currentTarget);
        if (!targetPosition) {
            debug('P1', '🎯 Cannot update reticle - invalid target position');
            return;
        }

        // Ensure targetPosition is a Three.js Vector3 object
        if (typeof targetPosition.clone !== 'function') {
            debug('P1', `🎯 targetPosition is not a Vector3 object: ${typeof targetPosition}, constructor: ${targetPosition?.constructor?.name}`);
            return;
        }

        const THREE = this.sfm.THREE;
        const camera = this.sfm.camera;

        // Calculate target's screen position
        const screenPosition = targetPosition.clone().project(camera);
        const isOnScreen = Math.abs(screenPosition.x) <= 1 && Math.abs(screenPosition.y) <= 1;

        if (isOnScreen) {
            const x = (screenPosition.x + 1) * window.innerWidth / 2;
            const y = (-screenPosition.y + 1) * window.innerHeight / 2;

            const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            const relativePos = targetPosition.clone().sub(camera.position);
            const isBehindCamera = relativePos.dot(cameraForward) < 0;

            if (isBehindCamera) {
                tcm.hideTargetReticle();
                if (this.sfm.targetNameDisplay) {
                    this.sfm.targetNameDisplay.style.display = 'none';
                }
                if (this.sfm.targetDistanceDisplay) {
                    this.sfm.targetDistanceDisplay.style.display = 'none';
                }
            } else {
                // RESTORED: Direct reticle positioning like original backup version
                tcm.showTargetReticle();
                const targetReticle = tcm.targetReticle;
                if (targetReticle) {
                    targetReticle.style.left = `${x}px`;
                    targetReticle.style.top = `${y}px`;
                }

                // Update target information displays if reticle is visible
                this.updateReticleTargetInfo();
            }
        } else {
            tcm.hideTargetReticle();
            if (this.sfm.targetNameDisplay) {
                this.sfm.targetNameDisplay.style.display = 'none';
            }
            if (this.sfm.targetDistanceDisplay) {
                this.sfm.targetDistanceDisplay.style.display = 'none';
            }
        }
    }

    /**
     * Update reticle target information (name, distance, colors)
     */
    updateReticleTargetInfo() {
        if (!this.sfm.currentTarget || !this.sfm.targetNameDisplay || !this.sfm.targetDistanceDisplay) {
            return;
        }

        // Get current target data
        const currentTargetData = this.sfm.getCurrentTargetData();
        if (!currentTargetData) {
            return;
        }

        // Calculate distance to target
        const targetPos = this.sfm.getTargetPosition(this.sfm.currentTarget);
        const distance = targetPos ? this.sfm.calculateDistance(this.sfm.camera.position, targetPos) : 0;

        // Get target info for diplomacy status and display
        let info = null;
        let isEnemyShip = false;
        let targetName = 'Unknown Target';

        // Check if this is an enemy ship
        if (currentTargetData.isShip && currentTargetData.ship) {
            isEnemyShip = true;
            info = {
                type: 'enemy_ship',
                diplomacy: currentTargetData.diplomacy || currentTargetData.ship.diplomacy || 'enemy',
                faction: currentTargetData.faction || currentTargetData.ship.faction || currentTargetData.diplomacy || 'enemy',
                name: currentTargetData.ship.shipName,
                shipType: currentTargetData.ship.shipType
            };
            targetName = info.name || 'Enemy Ship';

            // Debug log for reticle color issue
            debug('INSPECTION', `🎯 RETICLE DEBUG: Enemy ship detected - diplomacy: ${info.diplomacy}, faction: ${info.faction}, isEnemyShip: ${isEnemyShip}`);
        } else {
            // Get celestial body info - need to pass the actual Three.js object
            const targetObject = this.sfm.currentTarget?.object || this.sfm.currentTarget;
            info = this.sfm.solarSystemManager.getCelestialBodyInfo(targetObject);

            // Fallback to target data name if celestial body info not found
            if (!info || !info.name) {
                const targetData = this.sfm.targetComputerManager.getCurrentTargetData();
                targetName = targetData?.name || 'Unknown Target';
            } else {
                targetName = info.name;
            }
        }

        // Determine reticle color based on diplomacy using faction color rules
        const reticleColor = this.getReticleColor(isEnemyShip, info);

        // Update reticle corner colors
        const corners = this.sfm.targetComputerManager.getTargetReticleCorners();
        for (const corner of corners) {
            corner.style.borderColor = reticleColor;
            corner.style.boxShadow = `0 0 2px ${reticleColor}`;
        }

        // Format distance display
        const formattedDistance = this.sfm.formatDistance(distance);

        // Update target name display
        this.sfm.targetNameDisplay.textContent = targetName;
        this.sfm.targetNameDisplay.style.color = reticleColor;
        this.sfm.targetNameDisplay.style.textShadow = `0 0 4px ${reticleColor}`;
        this.sfm.targetNameDisplay.style.display = 'block';

        // Update target distance display
        this.sfm.targetDistanceDisplay.textContent = formattedDistance;
        this.sfm.targetDistanceDisplay.style.color = reticleColor;
        this.sfm.targetDistanceDisplay.style.textShadow = `0 0 4px ${reticleColor}`;
        this.sfm.targetDistanceDisplay.style.display = 'block';
    }

    /**
     * Get reticle color based on target type and diplomacy
     * @param {boolean} isEnemyShip - Whether target is an enemy ship
     * @param {Object} info - Target info object
     * @returns {string} Hex color string
     */
    getReticleColor(isEnemyShip, info) {
        if (isEnemyShip) {
            return '#ff0000'; // Enemy ships are bright red
        }

        if (info?.type === 'star') {
            return '#ffff00'; // Stars are neutral yellow
        }

        // Convert faction to diplomacy if needed
        let diplomacy = info?.diplomacy?.toLowerCase();
        if (!diplomacy && info?.faction) {
            diplomacy = this.sfm.getFactionDiplomacy(info.faction).toLowerCase();
        }

        if (diplomacy === 'enemy') {
            return '#ff0000'; // Enemy territories are bright red
        } else if (diplomacy === 'neutral') {
            return '#ffff00'; // Neutral territories are yellow
        } else if (diplomacy === 'friendly') {
            return '#00ff41'; // Friendly territories are green
        } else if (diplomacy === 'unknown') {
            return '#44ffff'; // Unknown territories are cyan
        }

        return '#44ffff'; // Default teal for unknown
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.sfm = null;
    }
}
