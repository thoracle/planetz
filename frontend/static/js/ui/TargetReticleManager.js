/**
 * TargetReticleManager
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Manages the target reticle that appears over on-screen targets.
 *
 * Features:
 * - Creates reticle with corner brackets and name/distance displays
 * - Updates position based on target's screen coordinates
 * - Updates target info (name, distance, color) based on diplomacy
 * - Handles waypoint, discovered, and undiscovered target display
 * - Color-codes reticle based on target faction
 */

import { debug } from '../debug.js';

export class TargetReticleManager {
    /**
     * Create a TargetReticleManager
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;

        // Reticle DOM elements
        this.targetReticle = null;
        this.targetNameDisplay = null;
        this.targetDistanceDisplay = null;

        // Debug throttling
        this._lastUnknownTarget = null;
    }

    /**
     * Create target reticle for on-screen targets
     */
    createTargetReticle() {
        // Create target reticle corners - match original design
        this.targetReticle = document.createElement('div');
        this.targetReticle.style.cssText = `
            position: fixed;
            width: 40px;
            height: 40px;
            display: none;
            pointer-events: none;
            z-index: 999;
            transform: translate(-50%, -50%);
        `;

        // Create corner elements - match original bracket style
        const corners = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];
        corners.forEach(corner => {
            const el = document.createElement('div');
            el.classList.add('reticle-corner');
            el.style.cssText = `
                position: absolute;
                width: 10px;
                height: 10px;
                border: 2px solid #D0D0D0;
                box-shadow: 0 0 2px #D0D0D0;
            `;

            // Position and style each corner - match original
            switch(corner) {
                case 'topLeft':
                    el.style.top = '0';
                    el.style.left = '0';
                    el.style.borderRight = 'none';
                    el.style.borderBottom = 'none';
                    break;
                case 'topRight':
                    el.style.top = '0';
                    el.style.right = '0';
                    el.style.borderLeft = 'none';
                    el.style.borderBottom = 'none';
                    break;
                case 'bottomLeft':
                    el.style.bottom = '0';
                    el.style.left = '0';
                    el.style.borderRight = 'none';
                    el.style.borderTop = 'none';
                    break;
                case 'bottomRight':
                    el.style.bottom = '0';
                    el.style.right = '0';
                    el.style.borderLeft = 'none';
                    el.style.borderTop = 'none';
                    break;
            }

            this.targetReticle.appendChild(el);
        });

        // Create target name display (above the reticle) - match original
        this.targetNameDisplay = document.createElement('div');
        this.targetNameDisplay.className = 'target-name-display';
        this.targetNameDisplay.style.cssText = `
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            color: #D0D0D0;
            text-shadow: 0 0 4px #D0D0D0;
            font-family: 'Orbitron', monospace;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
            white-space: nowrap;
            pointer-events: none;
            z-index: 1000;
            display: none;
        `;

        // Create target distance display (below the reticle) - match original
        this.targetDistanceDisplay = document.createElement('div');
        this.targetDistanceDisplay.className = 'target-distance-display';
        this.targetDistanceDisplay.style.cssText = `
            position: absolute;
            top: 50px;
            left: 50%;
            transform: translateX(-50%);
            color: #D0D0D0;
            text-shadow: 0 0 4px #D0D0D0;
            font-family: 'Orbitron', monospace;
            font-size: 14px;
            font-weight: bold;
            text-align: center;
            white-space: nowrap;
            pointer-events: none;
            z-index: 1000;
            display: none;
        `;

        this.targetReticle.appendChild(this.targetNameDisplay);
        this.targetReticle.appendChild(this.targetDistanceDisplay);

        document.body.appendChild(this.targetReticle);
    }

    /**
     * Update reticle position on screen
     */
    updateReticlePosition() {
        const currentTarget = this.tcm.currentTarget;
        const targetComputerEnabled = this.tcm.targetComputerEnabled;
        const camera = this.tcm.camera;
        const THREE = this.tcm.THREE;

        if (!currentTarget || !targetComputerEnabled) {
            this.targetReticle.style.display = 'none';
            return;
        }

        // Get target position using helper function
        const targetPosition = this.tcm.getTargetPosition(currentTarget);
        if (!targetPosition) {
            this.targetReticle.style.display = 'none';
            return;
        }

        // Calculate target's screen position
        const screenPosition = targetPosition.clone().project(camera);
        const isOnScreen = Math.abs(screenPosition.x) <= 1 && Math.abs(screenPosition.y) <= 1;

        if (isOnScreen) {
            const x = (screenPosition.x + 1) * window.innerWidth / 2;
            const y = (-screenPosition.y + 1) * window.innerHeight / 2;

            const cameraForward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            const relativePos = targetPosition.clone().sub(camera.position);
            const isBehindCamera = relativePos.dot(cameraForward) < 0;

            // RESTORED: Direct positioning like original working version
            this.targetReticle.style.display = isBehindCamera ? 'none' : 'block';
            if (!isBehindCamera) {
                this.targetReticle.style.left = `${x}px`;
                this.targetReticle.style.top = `${y}px`;
            }
        } else {
            this.targetReticle.style.display = 'none';
        }
    }

    /**
     * Update reticle target info (name and distance)
     */
    updateReticleTargetInfo() {
        const currentTarget = this.tcm.currentTarget;

        if (!currentTarget || !this.targetNameDisplay || !this.targetDistanceDisplay) {
            return;
        }

        // Get current target data
        const currentTargetData = this.tcm.getCurrentTargetData();
        if (!currentTargetData) {
            return;
        }

        // Calculate distance to target
        const targetPos = this.tcm.getTargetPosition(currentTarget);
        const distance = targetPos ? this.tcm.calculateDistance(this.tcm.camera.position, targetPos) : 0;

        // Get target info for diplomacy status and display
        let info = null;
        let isEnemyShip = false;
        let targetName = 'Unknown Target';

        // Check if this is an enemy ship using consolidated diplomacy logic
        if (currentTargetData.isShip && currentTargetData.ship) {
            // Use consolidated diplomacy logic instead of assuming all ships are enemy
            const diplomacy = this.tcm.getTargetDiplomacy(currentTargetData);
            isEnemyShip = diplomacy === 'enemy';
            info = {
                type: 'enemy_ship',
                diplomacy: diplomacy,
                name: currentTargetData.ship.shipName,
                shipType: currentTargetData.ship.shipType
            };
            targetName = info.name || (isEnemyShip ? 'Enemy Ship' : 'Ship');
            debug('TARGETING', `🎯 RETICLE: Ship target: ${targetName}, diplomacy: ${diplomacy}, isEnemyShip: ${isEnemyShip}`);
        } else {
            // Get celestial body info - need to pass the actual Three.js object
            const targetObject = currentTarget?.object || currentTarget;
            const bodyInfo = this.tcm.solarSystemManager.getCelestialBodyInfo(targetObject) || {};
            // Prefer Star Charts/target list data for name/type to avoid mismatches
            const preferredName = currentTargetData?.name || bodyInfo.name;
            const preferredType = currentTargetData?.type || bodyInfo.type;
            info = { ...bodyInfo, name: preferredName, type: preferredType };
            targetName = preferredName || 'Unknown Target';
        }

        // Check if object is discovered BEFORE setting colors and final name
        // SPECIAL CASE: Waypoints are always considered "discovered" since they're mission targets
        const isWaypointForName = currentTargetData?.type === 'waypoint' || currentTargetData?.isWaypoint || currentTargetData?.isVirtual;
        const isDiscovered = currentTargetData?.isShip || isWaypointForName || this.tcm.isObjectDiscovered(currentTargetData);

        // Override target name for undiscovered objects (but not waypoints)
        if (!isDiscovered && !currentTargetData.isShip && !isWaypointForName) {
            targetName = 'Unknown';
            // Only log once per target when showing as unknown
            if (this._lastUnknownTarget !== currentTarget?.name) {
                debug('TARGETING', `🎯 RETICLE: Undiscovered object "${currentTarget?.name}" showing as "Unknown"`);
                this._lastUnknownTarget = currentTarget?.name;
            }
        } else if (isWaypointForName) {
            // Ensure waypoints show their proper name
            targetName = currentTargetData?.name || 'Mission Waypoint';
            debug('WAYPOINTS', `🎨 Using waypoint name for reticle: ${targetName}`);
        }

        // Determine reticle color based on discovery status and diplomacy
        let reticleColor = '#44ffff'; // Default teal for unknown

        // SPECIAL CASE: Handle waypoints first (always magenta)
        if (currentTargetData?.type === 'waypoint' || currentTargetData?.isWaypoint || currentTargetData?.isVirtual) {
            reticleColor = '#ff00ff'; // Magenta for waypoints
            debug('WAYPOINTS', `🎨 Using magenta reticle color for waypoint: ${currentTargetData?.name}`);
        } else if (!isDiscovered) {
            // Undiscovered objects use unknown faction color (cyan)
            reticleColor = '#44ffff'; // Cyan for unknown/undiscovered
        } else {
            // Use consolidated diplomacy logic for discovered objects
            const diplomacyStatus = this.tcm.getTargetDiplomacy(currentTargetData);

            // Target dummies should use standard faction colors (red for enemy/hostile)
            if (isEnemyShip) {
                reticleColor = '#ff3333'; // Enemy ships are darker neon red
            } else if (info?.type === 'star') {
                reticleColor = '#ffff00'; // Stars are neutral yellow
            } else if (diplomacyStatus?.toLowerCase() === 'enemy') {
                reticleColor = '#ff3333'; // Darker neon red
            } else if (diplomacyStatus?.toLowerCase() === 'neutral') {
                reticleColor = '#ffff00';
            } else if (diplomacyStatus?.toLowerCase() === 'friendly') {
                reticleColor = '#00ff41';
            } else if (diplomacyStatus?.toLowerCase() === 'unknown') {
                reticleColor = '#44ffff'; // Cyan for unknown faction
            }
        }

        // Update name display
        this.targetNameDisplay.textContent = targetName;
        this.targetNameDisplay.style.color = reticleColor;
        this.targetNameDisplay.style.textShadow = `0 0 4px ${reticleColor}`;
        this.targetNameDisplay.style.display = 'block';

        // Update distance display - check if target is flagged as out of range
        const targetData = this.tcm.getCurrentTargetData();

        // Clear outOfRange flag if target is back within normal range
        if (targetData?.outOfRange && distance <= 150) {
            debug('TARGETING', `Target ${targetData.name} back in range (${distance.toFixed(1)}km) - clearing outOfRange flag`);
            targetData.outOfRange = false;

            // Also clear the flag in the original target object in targetObjects array
            if (this.tcm.targetIndex >= 0 && this.tcm.targetIndex < this.tcm.targetObjects.length) {
                const originalTargetData = this.tcm.targetObjects[this.tcm.targetIndex];
                if (originalTargetData) {
                    originalTargetData.outOfRange = false;
                }
            }
        }

        this.targetDistanceDisplay.textContent = targetData?.outOfRange ? 'Out of Range' : this.tcm.formatDistance(distance);
        this.targetDistanceDisplay.style.color = reticleColor;
        this.targetDistanceDisplay.style.textShadow = `0 0 4px ${reticleColor}`;
        this.targetDistanceDisplay.style.display = 'block';

        // Update reticle corner colors
        const corners = this.targetReticle.querySelectorAll('.reticle-corner');
        corners.forEach(corner => {
            corner.style.borderColor = reticleColor;
            corner.style.boxShadow = `0 0 4px ${reticleColor}`;
        });
    }

    /**
     * Show the target reticle
     */
    showTargetReticle() {
        if (this.targetReticle) {
            this.targetReticle.style.display = 'block';
        }
    }

    /**
     * Hide the target reticle
     */
    hideTargetReticle() {
        if (this.targetReticle) {
            this.targetReticle.style.display = 'none';
        }
    }

    /**
     * Set target reticle position
     * @param {number} x - X coordinate in pixels
     * @param {number} y - Y coordinate in pixels
     */
    setTargetReticlePosition(x, y) {
        if (this.targetReticle) {
            this.targetReticle.style.left = `${x}px`;
            this.targetReticle.style.top = `${y}px`;
        }
    }

    /**
     * Update reticle color based on target faction
     * @param {string} diplomacyColor - CSS color string
     */
    updateReticleColor(diplomacyColor = '#44ffff') {
        if (this.targetReticle) {
            const corners = this.targetReticle.querySelectorAll('.reticle-corner');
            corners.forEach(corner => {
                corner.style.borderColor = diplomacyColor;
                corner.style.boxShadow = `0 0 2px ${diplomacyColor}`;
            });

            // Update name and distance display colors
            if (this.targetNameDisplay) {
                this.targetNameDisplay.style.color = diplomacyColor;
                this.targetNameDisplay.style.textShadow = `0 0 4px ${diplomacyColor}`;
            }
            if (this.targetDistanceDisplay) {
                this.targetDistanceDisplay.style.color = diplomacyColor;
                this.targetDistanceDisplay.style.textShadow = `0 0 4px ${diplomacyColor}`;
            }
        }
    }

    /**
     * Get target reticle corners for styling
     * @returns {HTMLCollection} Collection of corner elements
     */
    getTargetReticleCorners() {
        if (this.targetReticle) {
            return this.targetReticle.getElementsByClassName('reticle-corner');
        }
        return [];
    }

    /**
     * Dispose of reticle DOM elements
     */
    dispose() {
        if (this.targetReticle && this.targetReticle.parentNode) {
            this.targetReticle.parentNode.removeChild(this.targetReticle);
        }
        this.targetReticle = null;
        this.targetNameDisplay = null;
        this.targetDistanceDisplay = null;
        this._lastUnknownTarget = null;
    }
}
