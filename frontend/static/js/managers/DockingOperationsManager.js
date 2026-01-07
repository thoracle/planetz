/**
 * DockingOperationsManager
 *
 * Extracted from StarfieldManager.js to reduce god class size.
 * Manages all docking and undocking operations including orbit mechanics.
 *
 * Features:
 * - Docking validation and initiation
 * - Orbit mechanics during docked state
 * - Undocking/launch procedures
 * - Integration with SimpleDockingManager for physics-based docking
 */

import { debug } from '../debug.js';
import { DOCKING } from '../constants/ShipConstants.js';

export class DockingOperationsManager {
    /**
     * Create a DockingOperationsManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager for cross-calls
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // Core docking state
        this.isDocked = false;
        this.dockedTo = null;
        this.orbitRadius = DOCKING?.ORBIT_RADIUS || 2.0;
        this.orbitAngle = 0;
        this.orbitSpeed = DOCKING?.ORBIT_SPEED || 0.001;
        this.dockingRange = DOCKING?.DOCKING_RANGE || 1.5;

        // Docking transition state
        this.dockingState = null;
        this.undockingState = null;

        // Undocking cooldown to prevent immediate re-targeting
        this.undockCooldown = null;

        // Guard flag for physics docking
        this._inPhysicsDocking = false;
    }

    /**
     * Check if docking is possible with target (no logging)
     * @param {Object} target - Target to dock with
     * @returns {boolean} True if docking is possible
     */
    canDock(target) {
        const ship = this.sfm.viewManager?.getShip();
        const validation = this.sfm.dockingSystemManager.validateDocking(ship, target, this.sfm);
        return validation.canDock;
    }

    /**
     * Check if docking is possible with target (with logging for user actions)
     * @param {Object} target - Target to dock with
     * @returns {boolean} True if docking is possible
     */
    canDockWithLogging(target) {
        const ship = this.sfm.viewManager?.getShip();
        const validation = this.sfm.dockingSystemManager.validateDocking(ship, target, this.sfm);

        if (!validation.canDock) {
            debug('P1', `Cannot dock: ${validation.reasons.join(', ')}`);
        }

        return validation.canDock;
    }

    /**
     * Initialize physics-based docking when physics system is ready
     */
    initializeSimpleDocking() {
        if (window.spatialManagerReady && window.collisionManagerReady && !this.sfm.simpleDockingManager) {
            const SimpleDockingManager = this.sfm.SimpleDockingManager;
            if (SimpleDockingManager) {
                this.sfm.simpleDockingManager = new SimpleDockingManager(
                    this.sfm,
                    window.spatialManager,
                    window.collisionManager
                );
                debug('UTILITY', 'Simple docking system initialized');
                this.sfm.simpleDockingManager.startDockingMonitoring();
            }
        } else if (!this.sfm.simpleDockingManager) {
            debug('P1', `Cannot initialize SimpleDockingManager: spatialManagerReady=${window.spatialManagerReady}, collisionManagerReady=${window.collisionManagerReady}`);
        }
    }

    /**
     * Show docking interface when docked to a station
     * @param {THREE.Object3D} target - The docked target
     */
    showDockingInterface(target) {
        if (this.sfm.dockingInterface) {
            debug('TARGETING', 'Showing docking interface for', target.name);
            this.sfm.dockingInterface.show(target);
        } else {
            debug('P1', 'DockingInterface not available');
        }
    }

    /**
     * Safely get position from target object
     * @param {Object} target - Target object
     * @returns {THREE.Vector3|null} Position vector or null
     */
    getTargetPosition(target) {
        if (!target) return null;

        const THREE = this.sfm.THREE;

        if (target.position && typeof target.position.clone === 'function') {
            return target.position;
        } else if (target.object && target.object.position) {
            if (typeof target.object.position.clone === 'function') {
                return target.object.position;
            } else if (Array.isArray(target.object.position)) {
                return new THREE.Vector3(...target.object.position);
            } else if (typeof target.object.position === 'object' &&
                       typeof target.object.position.x === 'number') {
                return new THREE.Vector3(
                    target.object.position.x,
                    target.object.position.y,
                    target.object.position.z
                );
            }
        } else if (target.position && Array.isArray(target.position)) {
            return new THREE.Vector3(...target.position);
        } else if (target.position && typeof target.position === 'object' &&
                   typeof target.position.x === 'number') {
            return new THREE.Vector3(
                target.position.x,
                target.position.y,
                target.position.z
            );
        }

        debug('P1', `Could not extract position from target: ${target?.name || 'unknown'}`);
        return null;
    }

    /**
     * Main dock method - initiates docking sequence
     * @param {Object} target - Target to dock with
     * @returns {boolean} Success status
     */
    dock(target) {
        if (typeof this._inPhysicsDocking !== 'boolean') {
            this._inPhysicsDocking = false;
        }

        this.initializeSimpleDocking();

        if (!this.canDockWithLogging(target)) {
            return false;
        }

        const ship = this.sfm.viewManager?.getShip();
        if (ship) {
            debug('UTILITY', 'Docking procedures initiated - no energy cost');
        }

        // Store the current view before docking
        this.sfm.previousView = this.sfm.view;

        // Stop engine sounds
        if (this.sfm.audioManager && this.sfm.audioManager.getEngineState() === 'running') {
            this.sfm.playEngineShutdown();
            debug('UTILITY', 'Engine shutdown called during docking');
        }

        // Cut speed immediately
        this.sfm.targetSpeed = 0;
        this.sfm.currentSpeed = 0;
        this.sfm.decelerating = false;

        // Calculate initial position relative to target
        const targetPosition = this.getTargetPosition(target);
        if (!targetPosition) {
            debug('P1', 'Cannot dock - invalid target position');
            return false;
        }

        const THREE = this.sfm.THREE;
        const relativePos = new THREE.Vector3().subVectors(this.sfm.camera.position, targetPosition);
        this.orbitAngle = Math.atan2(relativePos.z, relativePos.x);

        // Store initial state for transition
        this.dockingState = {
            startPos: this.sfm.camera.position.clone(),
            startRot: this.sfm.camera.quaternion.clone(),
            progress: 0,
            transitioning: true,
            target: target
        };

        // Get target info for orbit radius calculation
        const info = this.sfm.solarSystemManager.getCelestialBodyInfo(target);

        // Calculate orbit radius based on body size
        this.orbitRadius = this.dockingRange;
        if (info?.type === 'planet') {
            this.orbitRadius = 4.0;
        }

        // Calculate final orbit position
        const finalOrbitPos = new THREE.Vector3(
            targetPosition.x + Math.cos(this.orbitAngle) * this.orbitRadius,
            targetPosition.y,
            targetPosition.z + Math.sin(this.orbitAngle) * this.orbitRadius
        );
        this.dockingState.endPos = finalOrbitPos;

        // Calculate final rotation (looking at target)
        const targetRot = new THREE.Quaternion();
        const lookAtMatrix = new THREE.Matrix4();
        lookAtMatrix.lookAt(finalOrbitPos, target.position, new THREE.Vector3(0, 1, 0));
        targetRot.setFromRotationMatrix(lookAtMatrix);
        this.dockingState.endRot = targetRot;

        // Set docking state
        this.isDocked = true;
        this.dockedTo = target;
        this.sfm.targetSpeed = 0;
        this.sfm.currentSpeed = 0;
        this.sfm.decelerating = false;

        // Hide crosshairs and power down systems
        this._handleDockingUIChanges();

        // Play command sound for successful dock
        this.sfm.playCommandSound();

        // Show station menu
        this.sfm.dockingInterface.show(target);

        // Update the dock button to show "LAUNCH"
        this.sfm.updateTargetDisplay();

        // Refresh missions for the docked station
        if (target && target.userData && target.userData.name) {
            const stationKey = String(target.userData.name).toLowerCase().replace(/\s+/g, '_');
            this.sfm._setTimeout(() => {
                this.sfm.refreshStationMissions(stationKey);
            }, 1000);
        }

        return true;
    }

    /**
     * Handle UI changes when docking (hide HUDs, etc.)
     */
    _handleDockingUIChanges() {
        if (!this.sfm.viewManager) return;

        // Hide crosshairs
        this.sfm.viewManager.frontCrosshair.style.display = 'none';
        this.sfm.viewManager.aftCrosshair.style.display = 'none';

        // Power down all systems
        this.sfm.shutdownAllSystems();

        // Power down target computer UI
        if (this.sfm.targetComputerEnabled) {
            this.sfm.targetComputerEnabled = false;
            this.sfm.targetComputerManager.hideTargetHUD();
            this.sfm.targetComputerManager.hideTargetReticle();
            this.sfm.targetComputerManager.hideAllDirectionArrows();
            this.sfm.targetComputerManager.clearTargetWireframe();
        }

        // Close galactic chart if open
        if (this.sfm.viewManager.galacticChart && this.sfm.viewManager.galacticChart.isVisible()) {
            this.sfm.viewManager.galacticChart.hide(false);
        }

        // Close long range scanner if open
        if (this.sfm.viewManager.longRangeScanner && this.sfm.viewManager.longRangeScanner.isVisible()) {
            this.sfm.viewManager.longRangeScanner.hide(false);
            debug('UTILITY', 'Long Range Scanner dismissed during docking');
        }

        // Hide proximity detector if open
        if (this.sfm.proximityDetector3D && this.sfm.proximityDetector3D.isVisible) {
            this.sfm.proximityDetector3D.isVisible = false;
            this.sfm.proximityDetector3D.detectorContainer.style.display = 'none';
            debug('UTILITY', 'Proximity Detector dismissed during docking');
        }

        // Hide subspace radio UI
        if (this.sfm.viewManager.subspaceRadio && this.sfm.viewManager.subspaceRadio.isVisible) {
            this.sfm.viewManager.subspaceRadio.hide();
        }

        // Hide communication HUD
        if (this.sfm.communicationHUD && this.sfm.communicationHUD.visible) {
            this.sfm.communicationHUD.hide();
            debug('AI', 'Communication HUD dismissed during docking');
        }

        // Hide damage control HUD
        if (this.sfm.damageControlVisible || (this.sfm.damageControlHUD && this.sfm.damageControlHUD.isVisible)) {
            this.sfm.damageControlVisible = false;
            if (this.sfm.damageControlHUD) {
                this.sfm.damageControlHUD.hide();
            }
            debug('COMBAT', 'Damage Control HUD dismissed during docking');
        }

        // Hide mission status HUD
        if (this.sfm.missionStatusHUD && this.sfm.missionStatusHUD.visible) {
            this.sfm.missionStatusHUD.hide();
            debug('UI', 'Mission Status HUD dismissed during docking');
        }

        // Hide weapon HUD
        if (this.sfm.weaponHUD && this.sfm.weaponHUD.weaponSlotsDisplay) {
            this.sfm.weaponHUD.weaponSlotsDisplay.style.display = 'none';
            this.sfm.weaponHUD.autofireIndicator.style.display = 'none';
            this.sfm.weaponHUD.targetLockIndicator.style.display = 'none';
            this.sfm.weaponHUD.unifiedDisplay.style.display = 'none';
            debug('COMBAT', 'Weapon HUD hidden during docking');
        }

        // Restore view to FORE if in modal view
        if (this.sfm.viewManager.currentView === 'GALACTIC' || this.sfm.viewManager.currentView === 'SCANNER') {
            this.sfm.viewManager.restorePreviousView();
        }
    }

    /**
     * Complete docking for stations via physics path
     * @param {Object} target - Station target
     * @returns {boolean} Success status
     */
    completeDockingStation(target) {
        this.isDocked = true;
        this.dockedTo = target;
        this.sfm.targetSpeed = 0;
        this.sfm.currentSpeed = 0;
        this.sfm.decelerating = false;

        this._handleDockingUIChanges();

        // Also handle diplomacy and intel HUD
        if (this.sfm.diplomacyHUD && this.sfm.diplomacyHUD.visible) {
            this.sfm.diplomacyHUD.hide();
            debug('UI', 'Diplomacy HUD dismissed during docking completion');
        }

        if (this.sfm.intelDisplayManager) {
            this.sfm.intelDisplayManager.hideIntel();
        }

        // Remove any mission rewards overlay
        const missionRewardsOverlay = document.getElementById('mission-rewards-overlay');
        if (missionRewardsOverlay) {
            missionRewardsOverlay.remove();
            debug('UTILITY', 'Mission rewards overlay dismissed during docking completion');
        }

        this.sfm.playCommandSound();
        return true;
    }

    /**
     * Undock from current station/body
     */
    undock() {
        debug('UTILITY', 'DockingOperationsManager.undock() called');

        if (!this.isDocked) {
            debug('UTILITY', 'Not docked - returning early');
            return;
        }

        // Use simple docking system launch if available
        if (this.sfm.simpleDockingManager && this.sfm.simpleDockingManager.isDocked) {
            debug('UTILITY', 'Using SimpleDockingManager for launch');
            return this.sfm.simpleDockingManager.launchFromStation();
        }

        debug('AI', 'SimpleDockingManager not available - using legacy undock logic');

        const ship = this.sfm.viewManager?.getShip();
        if (ship) {
            const launchValidation = this.sfm.dockingSystemManager.validateLaunch(ship);

            if (!launchValidation.canLaunch) {
                debug('P1', `Launch failed: ${launchValidation.reasons.join(', ')}`);
                return;
            }

            debug('UTILITY', 'Launch procedures initiated - no energy cost');
        }

        const launchTarget = this.dockedTo;

        // Hide station menu
        this.sfm.dockingInterface.hide();

        // Play command sound
        this.sfm.playCommandSound();

        // Start engine sound
        if (this.sfm.soundLoaded && this.sfm.engineState === 'stopped') {
            this.sfm.playEngineStartup(1 / this.sfm.maxSpeed);
        }

        const THREE = this.sfm.THREE;

        // Store initial state for transition
        this.undockingState = {
            startPos: this.sfm.camera.position.clone(),
            startRot: this.sfm.camera.quaternion.clone(),
            progress: 0,
            transitioning: true
        };

        // Calculate undock position
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.sfm.camera.quaternion);
        const safeDistance = this.calculateSafeLaunchDistance(launchTarget);
        const targetPos = this.sfm.camera.position.clone().add(forward.multiplyScalar(safeDistance));
        this.undockingState.endPos = targetPos;

        // Reset to forward-facing rotation
        this.undockingState.endRot = new THREE.Quaternion();

        this.isDocked = false;
        this.dockedTo = null;

        // Reset button state
        this.sfm.currentButtonState = {
            hasDockButton: false,
            isDocked: false,
            hasScanButton: false,
            hasTradeButton: false
        };

        // Clear current target
        this.sfm.currentTarget = null;
        this.sfm.targetIndex = -1;

        // Clear action buttons
        if (this.sfm.actionButtonsContainer) {
            this.sfm.actionButtonsContainer.innerHTML = '';
        }

        // Add undock cooldown
        this.undockCooldown = Date.now() + 10000;

        // Set speed to impulse 1
        this.sfm.targetSpeed = 1;
        this.sfm.currentSpeed = 1;
        this.sfm.decelerating = false;

        // Restore UI after undocking
        this._handleUndockingUIChanges();

        // Reset Target Computer state
        if (this.sfm.targetComputerManager) {
            this.sfm.targetComputerManager.resetAfterUndock?.();
        }

        // Update displays
        this.sfm.updateTargetDisplay();
        this.sfm.updateSpeedIndicator();

        // Notify systems that launch has occurred
        try {
            window.dispatchEvent(new CustomEvent('shipLaunched'));
        } catch (_) {}
    }

    /**
     * Handle UI changes when undocking
     */
    _handleUndockingUIChanges() {
        if (!this.sfm.viewManager) return;

        // Restore view
        const viewToRestore = this.sfm.previousView === 'AFT' ? 'AFT' : 'FORE';
        this.sfm.view = viewToRestore;

        // Update camera rotation
        if (viewToRestore === 'AFT') {
            this.sfm.camera.rotation.set(0, Math.PI, 0);
        } else {
            this.sfm.camera.rotation.set(0, 0, 0);
        }

        // Show appropriate crosshair
        this.sfm.viewManager.frontCrosshair.style.display = viewToRestore === 'FORE' ? 'block' : 'none';
        this.sfm.viewManager.aftCrosshair.style.display = viewToRestore === 'AFT' ? 'block' : 'none';

        // Initialize ship systems
        this.sfm.initializeShipSystems().then(() => {
            debug('UTILITY', 'Ship systems initialized during launch');

            // Restore weapon HUD
            if (this.sfm.weaponHUD && this.sfm.weaponHUD.weaponSlotsDisplay) {
                this.sfm.weaponHUD.weaponSlotsDisplay.style.display = 'flex';
                this.sfm.weaponHUD.autofireIndicator.style.display = 'none';
                this.sfm.weaponHUD.targetLockIndicator.style.display = 'none';
                this.sfm.weaponHUD.unifiedDisplay.style.display = 'none';

                const ship = this.sfm.viewManager?.getShip();
                if (ship && ship.weaponSystem) {
                    this.sfm.weaponHUD.updateWeaponSlotsDisplay(
                        ship.weaponSystem.weaponSlots,
                        ship.weaponSystem.activeSlotIndex
                    );
                    this.sfm.connectWeaponHUDToSystem();
                }
            }
        }).catch(error => {
            debug('P1', `Failed to initialize ship systems during launch: ${error}`);
        });

        // Restore Mission Status HUD
        if (this.sfm.missionStatusHUD && !this.sfm.missionStatusHUD.isVisible) {
            this.sfm.missionStatusHUD.refreshMissions().then(() => {
                if (this.sfm.missionStatusHUD.activeMissions?.length > 0) {
                    this.sfm.missionStatusHUD.show();
                    debug('UI', 'Mission Status HUD restored after launch');
                }
            }).catch(() => {});
        }
    }

    /**
     * Launch from docked station (alias for undock)
     */
    launch() {
        return this.undock();
    }

    /**
     * Update orbit position while docked
     * @param {number} deltaTime - Time since last update
     */
    updateOrbit(deltaTime) {
        if (!this.isDocked || !this.dockedTo) return;

        // Handle docking transition
        if (this.dockingState && this.dockingState.transitioning) {
            this.dockingState.progress = Math.min(1, this.dockingState.progress + deltaTime * 0.5);
            const smoothProgress = this.easeInOutCubic(this.dockingState.progress);

            this.sfm.camera.position.lerp(this.dockingState.endPos, smoothProgress);
            this.sfm.camera.quaternion.slerp(this.dockingState.endRot, smoothProgress);

            if (this.dockingState.progress >= 1) {
                this.dockingState.transitioning = false;
            }
            return;
        }

        // Regular orbit update
        const targetPos = this.dockedTo.position;

        this.orbitAngle += this.orbitSpeed;
        if (this.orbitAngle > Math.PI * 2) this.orbitAngle -= Math.PI * 2;

        this.sfm.camera.position.x = targetPos.x + Math.cos(this.orbitAngle) * this.orbitRadius;
        this.sfm.camera.position.y = targetPos.y;
        this.sfm.camera.position.z = targetPos.z + Math.sin(this.orbitAngle) * this.orbitRadius;

        this.sfm.camera.lookAt(targetPos);

        this.sfm.updateTargetDisplay();
    }

    /**
     * Easing function for smooth transitions
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    /**
     * Calculate safe launch distance to avoid nearby dockable objects
     * @param {Object} launchTarget - Target we're launching from
     * @returns {number} Safe distance in km
     */
    calculateSafeLaunchDistance(launchTarget) {
        const targetInfo = this.sfm.solarSystemManager?.getCelestialBodyInfo(launchTarget);
        let dockingRange = 1.5;

        if (targetInfo?.type === 'planet') {
            dockingRange = 4.0;
        } else if (targetInfo?.type === 'station') {
            dockingRange = launchTarget.userData?.dockingRange || 2.0;
        }

        const objectRadius = launchTarget.geometry?.parameters?.radius ||
                           launchTarget.userData?.radius ||
                           (targetInfo?.type === 'planet' ? 1.2 : 0.3);

        const launchDistance = objectRadius + (dockingRange * 2.0);
        debug('UTILITY', `Launch distance: ${launchDistance.toFixed(1)}km`);
        return launchDistance;
    }

    /**
     * Handle dock button clicks
     * @param {boolean} isDocked - Current docked state
     * @param {string} targetName - Target name
     */
    handleDockButtonClick(isDocked, targetName) {
        if (!this.sfm.currentTarget) {
            debug('P1', 'No current target available for docking');
            return;
        }

        if (this.canDockWithLogging(this.sfm.currentTarget)) {
            this.dockWithDebug(this.sfm.currentTarget);
        } else {
            const info = this.sfm.solarSystemManager.getCelestialBodyInfo(this.sfm.currentTarget);
            const distance = this.sfm.camera.position.distanceTo(this.sfm.currentTarget.position);

            let dockingRangeForDisplay = this.dockingRange;
            if (info?.type === 'planet') {
                dockingRangeForDisplay = 4.0;
            }

            if (info?.diplomacy?.toLowerCase() === 'enemy') {
                this.sfm.viewManager.warpFeedback.showWarning(
                    'Cannot Dock at Hostile Target',
                    'This planet or moon is hostile to your ship.',
                    () => {}
                );
            } else {
                debug('P1', `Target out of docking range: ${distance.toFixed(2)}km (max: ${dockingRangeForDisplay}km)`);
            }
        }

        this.sfm.updateTargetDisplay();
    }

    /**
     * Dock with debug logging
     * @param {Object} target - Target to dock with
     */
    async dockWithDebug(target) {
        if (!this.sfm.simpleDockingManager) {
            debug('UTILITY', 'Initializing SimpleDockingManager for docking');
            this.initializeSimpleDocking();
        }

        if (this.sfm.simpleDockingManager) {
            debug('UTILITY', 'Using SimpleDockingManager for docking');
            return await this.sfm.simpleDockingManager.initiateUnifiedDocking(target);
        } else {
            debug('P1', 'SimpleDockingManager could not be initialized');
            return false;
        }
    }

    /**
     * Undock with debug logging
     */
    undockWithDebug() {
        if (!this.isDocked) return;
        this.undock();
    }

    /**
     * Get comprehensive docking status
     * @returns {Object} Docking status
     */
    getDockingStatus() {
        const ship = this.sfm.viewManager?.getShip();
        return this.sfm.dockingSystemManager.getDockingStatus(ship, this.sfm);
    }

    /**
     * Get docking requirements for UI
     * @returns {Object} Docking requirements
     */
    getDockingRequirements() {
        return this.sfm.dockingSystemManager.getDockingRequirements();
    }
}
