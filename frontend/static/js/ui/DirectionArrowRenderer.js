/**
 * DirectionArrowRenderer
 *
 * Extracted from TargetComputerManager to reduce god class size.
 * Manages the directional arrows that point toward off-screen targets.
 *
 * Features:
 * - Creates 4 directional arrows (top, bottom, left, right)
 * - Updates arrow visibility and position based on target screen position
 * - Color-codes arrows based on target diplomacy (enemy=red, friendly=green, neutral=yellow, unknown=cyan)
 * - Handles waypoint targets with magenta color
 * - Includes hysteresis to prevent flickering at screen edges
 */

import { debug } from '../debug.js';

export class DirectionArrowRenderer {
    /**
     * Create a DirectionArrowRenderer
     * @param {Object} targetComputerManager - Reference to parent TCM for callbacks
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;

        // Arrow DOM elements
        this.directionArrows = null;

        // Hysteresis state to prevent flickering
        this.lastArrowState = false;

        // Debug throttling
        this.lastArrowSuccessLog = 0;
        this.debugArrowNextUpdate = false;
        this.lastColorUpdateLog = 0;
        this.lastColorVerifyLog = 0;
        this.lastArrowContainerLog = 0;
    }

    /**
     * Create direction arrows (one for each edge of the screen)
     */
    createDirectionArrows() {
        // Create direction arrows (one for each edge)
        this.directionArrows = {
            left: document.createElement('div'),
            right: document.createElement('div'),
            top: document.createElement('div'),
            bottom: document.createElement('div')
        };

        // Style each arrow - simplified approach with proper dimensions
        Object.entries(this.directionArrows).forEach(([position, arrow]) => {
            // Set specific dimensions and styles for each direction
            if (position === 'top') {
                arrow.style.cssText = `
                    position: fixed;
                    width: 20px;
                    height: 15px;
                    pointer-events: none;
                    z-index: 25000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                // Create triangle directly with proper centering
                arrow.innerHTML = '<div style="width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 15px solid #D0D0D0;"></div>';
            } else if (position === 'bottom') {
                arrow.style.cssText = `
                    position: fixed;
                    width: 20px;
                    height: 15px;
                    pointer-events: none;
                    z-index: 25000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                arrow.innerHTML = '<div style="width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-top: 15px solid #D0D0D0;"></div>';
            } else if (position === 'left') {
                arrow.style.cssText = `
                    position: fixed;
                    width: 15px;
                    height: 20px;
                    pointer-events: none;
                    z-index: 25000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                arrow.innerHTML = '<div style="width: 0; height: 0; border-top: 10px solid transparent; border-bottom: 10px solid transparent; border-right: 15px solid #D0D0D0;"></div>';
            } else if (position === 'right') {
                arrow.style.cssText = `
                    position: fixed;
                    width: 15px;
                    height: 20px;
                    pointer-events: none;
                    z-index: 25000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                arrow.innerHTML = '<div style="width: 0; height: 0; border-top: 10px solid transparent; border-bottom: 10px solid transparent; border-left: 15px solid #D0D0D0;"></div>';
            }

            document.body.appendChild(arrow); // Append to body, not HUD
        });
    }

    /**
     * Update direction arrow based on current target position
     */
    updateDirectionArrow() {
        const currentTarget = this.tcm.currentTarget;
        const targetComputerEnabled = this.tcm.targetComputerEnabled;
        const camera = this.tcm.camera;
        const THREE = this.tcm.THREE;

        // Only proceed if we have a target and the target computer is enabled
        if (!currentTarget || !targetComputerEnabled || !this.directionArrows) {
            // Hide all arrows
            this.hideAllDirectionArrows();
            return;
        }

        // Get target position using helper function
        const targetPos = this.tcm.getTargetPosition(currentTarget);

        // Get target data and discovery status once
        const currentTargetData = this.tcm.getCurrentTargetData();
        const isDiscovered = currentTargetData?.isShip || this.tcm.isObjectDiscovered(currentTargetData);

        if (!targetPos) {
            // DEBUG: Log why position lookup failed for arrows
            debug('P1', `🎯 ARROW: No position for "${currentTarget?.name || 'unknown'}"`, {
                isDiscovered,
                targetType: currentTarget?.type,
                hasPosition: !!currentTarget?.position,
                positionType: typeof currentTarget?.position,
                hasObjectPosition: !!currentTarget?.object?.position
            });
            this.hideAllDirectionArrows();
            return;
        }

        // DEBUG: Log arrow state for undiscovered targets (less verbose)
        if (!isDiscovered && (!this.lastArrowSuccessLog || Date.now() - this.lastArrowSuccessLog > 3000)) {
            // We'll log the full details after determining arrow visibility
            this.lastArrowSuccessLog = Date.now();
            this.debugArrowNextUpdate = true;
        }

        // Get target's world position relative to camera
        const targetPosition = targetPos.clone();
        const screenPosition = targetPosition.clone().project(camera);

        // Check if target is off screen or behind camera
        // Use 0.95 threshold for better edge detection, and check depth
        const isOffScreen = Math.abs(screenPosition.x) > 0.95 ||
                           Math.abs(screenPosition.y) > 0.95 ||
                           screenPosition.z > 1.0; // Behind camera

        // Add hysteresis to prevent flickering at screen edges
        // Tighter threshold (0.92 vs 0.95 = 3% gap) for faster arrow hiding
        // FIXED: Only initialize if null/undefined, not when false
        if (this.lastArrowState == null) this.lastArrowState = false;
        const shouldShowArrow = isOffScreen || (this.lastArrowState && (
            Math.abs(screenPosition.x) > 0.92 ||
            Math.abs(screenPosition.y) > 0.92 ||
            screenPosition.z > 1.0
        ));

        this.lastArrowState = shouldShowArrow;

        if (shouldShowArrow) {
            // Get camera's view direction and relative position
            const cameraDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
            const relativePosition = targetPosition.clone().sub(camera.position);

            // Get camera's right and up vectors
            const cameraRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
            const cameraUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

            // Project relative position onto camera's right and up vectors
            const rightComponent = relativePosition.dot(cameraRight);
            const upComponent = relativePosition.dot(cameraUp);

            // Get target info for color using consolidated diplomacy logic
            let arrowColor = '#44ffff'; // Default teal

            // SPECIAL CASE: Handle waypoints first (check both target data and current target)
            const isWaypointFromData = currentTargetData?.type === 'waypoint' || currentTargetData?.isWaypoint || currentTargetData?.isVirtual;
            const isWaypointFromTarget = currentTarget?.type === 'waypoint' || currentTarget?.isWaypoint || currentTarget?.isVirtual;

            let diplomacy = 'unknown';
            if (isWaypointFromData || isWaypointFromTarget) {
                arrowColor = '#ff00ff'; // Magenta for waypoints
                diplomacy = 'waypoint';
            } else if (currentTargetData) {
                diplomacy = this.tcm.getTargetDiplomacy(currentTargetData);
                if (diplomacy === 'enemy') {
                    arrowColor = '#ff3333';
                } else if (diplomacy === 'friendly') {
                    arrowColor = '#00ff41';
                } else if (diplomacy === 'neutral') {
                    arrowColor = '#ffff00';
                } else if (diplomacy === 'unknown') {
                    arrowColor = '#44ffff'; // Teal for unknown/undiscovered
                }
            }

            // Determine which arrow to show based on the strongest component
            let primaryDirection = '';
            if (Math.abs(rightComponent) > Math.abs(upComponent)) {
                primaryDirection = rightComponent > 0 ? 'right' : 'left';
            } else {
                primaryDirection = upComponent > 0 ? 'top' : 'bottom';
            }

            // Position and show the appropriate arrow
            const arrow = this.directionArrows[primaryDirection];
            if (arrow) {
                // Position arrow at edge of screen - clear conflicting properties first
                arrow.style.left = '';
                arrow.style.right = '';
                arrow.style.top = '';
                arrow.style.bottom = '';

                if (primaryDirection === 'top') {
                    arrow.style.left = '50%';
                    arrow.style.top = '20px';
                    arrow.style.transform = 'translateX(-50%)';
                } else if (primaryDirection === 'bottom') {
                    arrow.style.left = '50%';
                    arrow.style.top = (window.innerHeight - 20 - 19) + 'px'; // viewport height - margin - arrow height
                    arrow.style.transform = 'translateX(-50%)';
                } else if (primaryDirection === 'left') {
                    arrow.style.left = '20px';
                    arrow.style.top = '50%';
                    arrow.style.transform = 'translateY(-50%)';
                } else if (primaryDirection === 'right') {
                    arrow.style.left = (window.innerWidth - 20 - 19) + 'px'; // viewport width - margin - arrow width
                    arrow.style.top = '50%';
                    arrow.style.transform = 'translateY(-50%)';
                }

                // Update arrow color for the visible border - need to update the child element
                const childTriangle = arrow.firstElementChild;
                if (childTriangle) {
                    // DEBUG: Log color update for unknown targets
                    if (diplomacy === 'unknown' && (!this.lastColorUpdateLog || Date.now() - this.lastColorUpdateLog > 2000)) {
                        debug('TARGETING', `🎯 ARROW COLOR: Setting ${primaryDirection} arrow to ${arrowColor} for ${currentTarget?.name} (diplomacy: ${diplomacy})`);
                        this.lastColorUpdateLog = Date.now();
                    }

                    // Update ONLY the color, preserving widths and solid style from original creation
                    if (primaryDirection === 'top') {
                        childTriangle.style.borderBottomColor = arrowColor;
                    } else if (primaryDirection === 'bottom') {
                        childTriangle.style.borderTopColor = arrowColor;
                    } else if (primaryDirection === 'left') {
                        childTriangle.style.borderRightColor = arrowColor;
                    } else if (primaryDirection === 'right') {
                        childTriangle.style.borderLeftColor = arrowColor;
                    }

                    // DEBUG: Verify ALL border colors AND WIDTHS for unknown targets
                    if (diplomacy === 'unknown' && (!this.lastColorVerifyLog || Date.now() - this.lastColorVerifyLog > 2000)) {
                        debug('TARGETING', `🎯 ARROW BORDERS (${primaryDirection}): verified for ${currentTarget?.name}`);
                        this.lastColorVerifyLog = Date.now();
                    }
                }

                // CRITICAL: Use 'flex' not 'block' to maintain triangle centering
                arrow.style.display = 'flex';

                // DEBUG: Log arrow container position and visibility for unknown targets
                if (diplomacy === 'unknown' && (!this.lastArrowContainerLog || Date.now() - this.lastArrowContainerLog > 2000)) {
                    debug('TARGETING', `🎯 ARROW CONTAINER (${primaryDirection}): display=${arrow.style.display}, pos=(${arrow.style.left}, ${arrow.style.top})`);
                    this.lastArrowContainerLog = Date.now();
                }

                // DEBUG: Log arrow display details for undiscovered targets
                if (this.debugArrowNextUpdate) {
                    debug('TARGETING', `🎯 ARROW: Displaying ${primaryDirection} arrow for ${currentTarget?.name} (discovered: ${isDiscovered}, diplomacy: ${diplomacy}, color: ${arrowColor})`);
                    this.debugArrowNextUpdate = false;
                }

                // Hide other arrows
                Object.keys(this.directionArrows).forEach(dir => {
                    if (dir !== primaryDirection) {
                        this.directionArrows[dir].style.display = 'none';
                    }
                });
            }
        } else {
            // Target is on screen, hide all arrows
            if (this.debugArrowNextUpdate) {
                debug('TARGETING', `🎯 ARROW: Target on screen, hiding arrows for ${currentTarget?.name} (discovered: ${isDiscovered})`);
                this.debugArrowNextUpdate = false;
            }
            this.hideAllDirectionArrows();
        }
    }

    /**
     * Hide all direction arrows
     */
    hideAllDirectionArrows() {
        if (this.directionArrows) {
            Object.values(this.directionArrows).forEach(arrow => {
                arrow.style.display = 'none';
            });
        }
        // FIXED: Reset arrow state to prevent stale hysteresis on next target
        this.lastArrowState = false;
    }

    /**
     * Update arrow colors to match diplomacy (legacy method for document.querySelector approach)
     * @param {string} diplomacyColor - CSS color string
     */
    updateArrowColors(diplomacyColor) {
        ['top', 'bottom', 'left', 'right'].forEach(direction => {
            const arrow = document.querySelector(`#targeting-arrow-${direction}`);
            if (arrow) {
                // Update the visible border color based on direction
                if (direction === 'top') {
                    arrow.style.borderBottomColor = diplomacyColor;
                } else if (direction === 'bottom') {
                    arrow.style.borderTopColor = diplomacyColor;
                } else if (direction === 'left') {
                    arrow.style.borderRightColor = diplomacyColor;
                } else if (direction === 'right') {
                    arrow.style.borderLeftColor = diplomacyColor;
                }
            }
        });
    }

    /**
     * Dispose of arrow DOM elements
     */
    dispose() {
        if (this.directionArrows) {
            Object.values(this.directionArrows).forEach(arrow => {
                if (arrow.parentNode) {
                    arrow.parentNode.removeChild(arrow);
                }
            });
            this.directionArrows = null;
        }
        this.lastArrowState = false;
    }
}
