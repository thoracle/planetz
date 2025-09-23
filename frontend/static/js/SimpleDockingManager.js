import { debug } from './debug.js';

/**
 * SimpleDockingManager - Distance and angle-based docking system
 * Replaces physics-based collision docking with simple, reliable distance + approach checks
 * Optimized for retro space shooter gameplay
 */

export class SimpleDockingManager {
    constructor(starfieldManager, spatialManager, collisionManager) {
        this.starfieldManager = starfieldManager;
        this.spatialManager = spatialManager;
        this.collisionManager = collisionManager;
        
        // Docking state
        this.isDocked = false;
        this.currentDockingTarget = null;
        this.dockingInProgress = false;
        this.launchInProgress = false;
        
        // Store approach position for simple launch
        this.approachPosition = null;
        this.approachRotation = null;
        
        // Docking parameters
        this.dockingRange = 1.5; // km - distance to initiate docking
        this.maxApproachAngle = 60; // degrees - maximum approach angle
        this.dockingSpeed = 0.5; // km/s - speed during docking sequence
        this.launchDistance = 8.0; // km - base launch distance (used as fallback, actual distance is 2x docking range)
        
        // Cooldown system
        this.dockingCooldown = false;
        this.dockingCooldownTime = 3000; // 3 seconds
        this.lastDockingTime = 0;
        this.lastLaunchTime = 0;
        
        // Monitoring
        this.dockingCheckInterval = null;
        this.checkIntervalMs = 100; // Check every 100ms
        
debug('UTILITY', 'SimpleDockingManager initialized - Distance + angle based docking');
    }

    /**
     * Start monitoring for docking opportunities
     */
    startDockingMonitoring() {
        if (this.dockingCheckInterval) {
            clearInterval(this.dockingCheckInterval);
        }
        
        this.dockingCheckInterval = setInterval(() => {
            this.checkDockingOpportunities();
        }, this.checkIntervalMs);
        
debug('UTILITY', 'Docking monitoring started');
    }

    /**
     * Stop monitoring for docking opportunities
     */
    stopDockingMonitoring() {
        if (this.dockingCheckInterval) {
            clearInterval(this.dockingCheckInterval);
            this.dockingCheckInterval = null;
        }
        
debug('UTILITY', 'Docking monitoring stopped');
    }

    /**
     * Check for docking opportunities with nearby stations
     */
    checkDockingOpportunities() {
        if (this.isDocked || this.dockingInProgress || this.launchInProgress) {
            // console.log(`🚀 Skipping docking check: isDocked=${this.isDocked}, dockingInProgress=${this.dockingInProgress}, launchInProgress=${this.launchInProgress}`);
            return;
        }

        const ship = this.starfieldManager.viewManager?.getShip();
        if (!ship) {
            return;
        }

        // Get ship position from camera (player ship is at camera position)
        const shipPosition = this.starfieldManager.camera.position;

        // Find nearby dockable objects (stations, planets, moons)
        // Use larger search radius for stations to detect them at reasonable distance
        const stationSearchRadius = 50.0; // 50km search radius for stations (much larger than docking range)
        const nearbyStations = this.spatialManager.queryNearby(
            shipPosition, 
            stationSearchRadius,
            'station'
        );
        
        const nearbyPlanets = this.spatialManager.queryNearby(
            shipPosition, 
            4.0 * 2, // Planets have 4.0km docking range
            'planet'
        );
        
        const nearbyMoons = this.spatialManager.queryNearby(
            shipPosition, 
            1.5 * 2, // Moons have 1.5km docking range  
            'moon'
        );
        
        // Combine all dockable objects
        const nearbyObjects = [...nearbyStations, ...nearbyPlanets, ...nearbyMoons];

        let bestDockingTarget = null;
        let bestDockingResult = null;

        for (const {object: target, distance, metadata} of nearbyObjects) {
            // For planets and moons, we don't require canDock flag (they're inherently dockable)
            // For stations, we do check the canDock flag
            if (metadata.type === 'station' && !metadata.canDock) continue;

            const dockingResult = this.checkDockingEligibility(ship, target);
            if (dockingResult.canDock) {
                if (!bestDockingTarget || distance < bestDockingResult.distance) {
                    bestDockingTarget = target;
                    bestDockingResult = dockingResult;
                }
            }
        }

        // Update docking target
        if (bestDockingTarget !== this.currentDockingTarget) {
            this.currentDockingTarget = bestDockingTarget;
            
            if (bestDockingTarget) {
                this.showDockingPrompt(bestDockingTarget, bestDockingResult);
            } else {
                this.hideDockingPrompt();
            }
        }
    }

    /**
     * Check if ship can dock with station
     * @param {THREE.Object3D} ship - Ship attempting to dock
     * @param {THREE.Object3D} station - Station to dock with
     * @returns {Object} Docking eligibility result
     */
    checkDockingEligibility(ship, target) {
        // For the player ship, we don't need metadata from spatial manager
        // The ship is represented by the camera position
        let targetMetadata = this.spatialManager.getMetadata(target);
        
        // If direct lookup fails, try to find by name (handles object reference mismatches)
        if (!targetMetadata && target.name) {
            for (const [obj, metadata] of this.spatialManager.trackedObjects.entries()) {
                if (obj.name === target.name && (metadata.type === 'planet' || metadata.type === 'moon' || metadata.type === 'station')) {
                    targetMetadata = metadata;
                    break;
                }
            }
        }
        
        // Fallback: Check userData for station information
        if (!targetMetadata && target.userData) {
            if (target.userData.isSpaceStation || target.userData.type === 'station') {
                targetMetadata = {
                    type: 'station',
                    name: target.userData.name || target.name,
                    faction: target.userData.faction,
                    canDock: target.userData.canDock !== false
                };
            }
        }
        
        if (!targetMetadata) {
            return { canDock: false, reason: 'Missing target metadata' };
        }
        
        // Get ship position from camera (player ship is at camera position)
        const shipPosition = this.starfieldManager.camera.position;
        
        // Check distance - use appropriate range based on target type
        const distance = shipPosition.distanceTo(target.position);
        
        // UNIFIED: Use centralized docking range calculation
        const requiredRange = this.getUnifiedDockingRange(targetMetadata.type, target);
        
        if (distance > requiredRange) {
            return { 
                canDock: false, 
                reason: 'Too far', 
                distance, 
                requiredDistance: requiredRange 
            };
        }
        
        // Check approach angle (ship should be facing roughly toward target)
        const toTarget = target.position.clone().sub(shipPosition).normalize();
        const shipForward = new window.THREE.Vector3(0, 0, -1).applyQuaternion(this.starfieldManager.camera.quaternion);
        const approachAngle = Math.acos(Math.max(-1, Math.min(1, toTarget.dot(shipForward))));
        const approachAngleDegrees = approachAngle * (180 / Math.PI);
        
        if (approachAngleDegrees > this.maxApproachAngle) {
            return {
                canDock: false,
                reason: 'Poor approach angle',
                distance,
                approachAngle: approachAngleDegrees,
                maxApproachAngle: this.maxApproachAngle
            };
        }
        
        // Check cooldown
        const now = Date.now();
        if (this.dockingCooldown && (now - this.lastLaunchTime) < this.dockingCooldownTime) {
            const remainingCooldown = this.dockingCooldownTime - (now - this.lastLaunchTime);
            return {
                canDock: false,
                reason: 'Docking systems cooling down',
                distance,
                approachAngle: approachAngleDegrees,
                cooldownRemaining: remainingCooldown
            };
        }
        
        // Check ship speed (should be slow for docking)
        const shipSpeed = this.starfieldManager.currentSpeed || 0;
        if (shipSpeed > 2) { // Max speed 2 for docking
            return {
                canDock: false,
                reason: 'Ship moving too fast',
                distance,
                approachAngle: approachAngleDegrees,
                currentSpeed: shipSpeed,
                maxDockingSpeed: 2
            };
        }
        
        return {
            canDock: true,
            distance,
            approachAngle: approachAngleDegrees,
            target: target,
            targetName: targetMetadata.name || 'Unknown Target'
        };
    }

    /**
     * DEPRECATED: Use initiateUnifiedDocking instead
     * Legacy docking method - redirects to unified system
     * @param {THREE.Object3D} target - Target to dock with (station, planet, or moon)
     */
    async initiateDocking(target) {
        console.warn('🚀 DEPRECATED: initiateDocking called - redirecting to initiateUnifiedDocking');
        return await this.initiateUnifiedDocking(target);
    }

    /**
     * LEGACY: Old docking validation method (kept for reference)
     */
    async _legacyInitiateDocking(target) {
        if (this.isDocked || this.dockingInProgress) {
            console.warn('🚀 Docking already in progress or docked');
            return false;
        }

        const ship = this.starfieldManager.viewManager?.getShip();
        if (!ship) {
            console.warn('🚀 No ship available for docking');
            return false;
        }
        
        // Store approach position and rotation for simple launch
        this.approachPosition = this.starfieldManager.camera.position.clone();
        this.approachRotation = this.starfieldManager.camera.quaternion.clone();
debug('UTILITY', `🚀 Stored approach position: (${this.approachPosition.x.toFixed(2)}, ${this.approachPosition.y.toFixed(2)}, ${this.approachPosition.z.toFixed(2)})`);

        const dockingResult = this.checkDockingEligibility(ship, target);
        if (!dockingResult.canDock) {
            console.warn('🚀 Docking not possible:', dockingResult.reason);
            this.starfieldManager.showHUDError?.('DOCKING FAILED', dockingResult.reason);
            return false;
        }

debug('TARGETING', 'Initiating docking sequence with', dockingResult.targetName);
        
        this.dockingInProgress = true;
        this.currentDockingTarget = target;
        
        try {
            // Stop ship movement
            this.starfieldManager.targetSpeed = 0;
            this.starfieldManager.currentSpeed = 0;
            
            // Animate docking approach (simple version)
            await this.animateDockingApproach(ship, target);
            
            // Complete docking
            await this.completeDocking(target);
            
            return true;
            
        } catch (error) {
            console.error('🚀 Docking sequence failed:', error);
            this.dockingInProgress = false;
            this.currentDockingTarget = null;
            return false;
        }
    }

    /**
     * Animate docking approach (simple linear movement)
     * @param {THREE.Object3D} ship - Ship docking
     * @param {THREE.Object3D} station - Target station
     */
    async animateDockingApproach(ship, target) {
        return new Promise((resolve) => {
            // Use camera position since player ship is represented by camera
            const camera = this.starfieldManager.camera;
            const startPos = camera.position.clone();
            const targetPos = target.position.clone();
            
            // Move to a docking position near the target (not inside it)
            const dockingOffset = new THREE.Vector3(0, 0, 2); // 2km offset
            targetPos.add(dockingOffset);
            
            const duration = 2000; // 2 seconds
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Smooth easing
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                
                // Interpolate camera position
                camera.position.lerpVectors(startPos, targetPos, easedProgress);
                
                if (progress >= 1) {
                    resolve();
                } else {
                    requestAnimationFrame(animate);
                }
            };
            
            animate();
        });
    }

    /**
     * Complete docking process
     * @param {THREE.Object3D} station - Station docked to
     */
    async completeDocking(station) {
        this.isDocked = true;
        this.dockingInProgress = false;
        this.lastDockingTime = Date.now();
        
        // Get station metadata with fallback name lookup
        let stationMetadata = this.spatialManager.getMetadata(station);
        
        // If direct lookup fails, try searching by name (same as checkDockingEligibility)
        if (!stationMetadata && station.name) {
            for (const [obj, metadata] of this.spatialManager.trackedObjects.entries()) {
                if (obj.name === station.name && (metadata.type === 'planet' || metadata.type === 'moon' || metadata.type === 'station')) {
                    stationMetadata = metadata;
                    break;
                }
            }
        }
        
        const stationName = stationMetadata?.name || station.name || 'Unknown Station';
        
debug('UTILITY', 'Docking completed with', stationName);
        
        // Update starfield manager state
        if (this.starfieldManager) {
            this.starfieldManager.isDocked = true;
            this.starfieldManager.dockedTo = station;
            this.starfieldManager.showHUDMessage?.('DOCKED', `Successfully docked with ${stationName}`);
            
            // CRITICAL: Shutdown all ship systems (engines, targeting, etc.)
            this.shutdownAllShipSystems();
        }
        
        // Note: Cargo delivery check is handled in the main docking success path
        
        // Stop monitoring while docked
        this.stopDockingMonitoring();
        
        // Trigger docking interface
        this.showDockingInterface(station);
    }
    
    /**
     * Shutdown all ship systems when docking - engines, targeting, etc.
     * This is the missing piece that was causing engines to keep running
     */
    shutdownAllShipSystems() {
debug('UTILITY', '🛑 SimpleDockingManager: Shutting down all ship systems for docking');
        
        // CRITICAL: Stop engine audio immediately (was missing!)
        if (this.starfieldManager.audioManager && this.starfieldManager.audioManager.getEngineState() === 'running') {
            this.starfieldManager.playEngineShutdown();
debug('UTILITY', '🔇 Engine shutdown called during docking');
        } else {
debug('UTILITY', '🔇 Engine state check:', this.starfieldManager.audioManager ? this.starfieldManager.audioManager.getEngineState() : 'no audioManager');
        }
        
        // Call StarfieldManager's comprehensive system shutdown
        if (this.starfieldManager && typeof this.starfieldManager.shutdownAllSystems === 'function') {
            this.starfieldManager.shutdownAllSystems();
        }
        
        // Hide crosshairs and UI elements
        if (this.starfieldManager.viewManager) {
            if (this.starfieldManager.viewManager.frontCrosshair) {
                this.starfieldManager.viewManager.frontCrosshair.style.display = 'none';
            }
            if (this.starfieldManager.viewManager.aftCrosshair) {
                this.starfieldManager.viewManager.aftCrosshair.style.display = 'none';
            }
        }
        
        // Shutdown target computer UI
        if (this.starfieldManager.targetComputerEnabled && this.starfieldManager.targetComputerManager) {
            this.starfieldManager.targetComputerEnabled = false;
            this.starfieldManager.targetComputerManager.hideTargetHUD();
            this.starfieldManager.targetComputerManager.hideTargetReticle();
            this.starfieldManager.targetComputerManager.clearTargetWireframe();
            this.starfieldManager.targetComputerManager.hideAllDirectionArrows();
debug('TARGETING', 'Target computer UI shut down (including direction arrows)');
        }
        
        // CRITICAL: Hide weapon HUD when docking (was missing!)
        if (this.starfieldManager.weaponHUD && this.starfieldManager.weaponHUD.weaponSlotsDisplay) {
            this.starfieldManager.weaponHUD.weaponSlotsDisplay.style.display = 'none';
            this.starfieldManager.weaponHUD.autofireIndicator.style.display = 'none';
            this.starfieldManager.weaponHUD.targetLockIndicator.style.display = 'none';
            this.starfieldManager.weaponHUD.unifiedDisplay.style.display = 'none';
debug('COMBAT', '🚪 Weapon HUD hidden during docking');
        }
        
        // Close any open UI panels
        if (this.starfieldManager.viewManager) {
            if (this.starfieldManager.viewManager.galacticChart && this.starfieldManager.viewManager.galacticChart.isVisible()) {
                this.starfieldManager.viewManager.galacticChart.hide(false);
debug('UTILITY', '🚪 Galactic Chart dismissed during docking');
            }
            if (this.starfieldManager.viewManager.longRangeScanner && this.starfieldManager.viewManager.longRangeScanner.isVisible()) {
                this.starfieldManager.viewManager.longRangeScanner.hide(false);
debug('UTILITY', '🚪 Long Range Scanner dismissed during docking');
            }
        }
        
        // Hide proximity detector
        if (this.starfieldManager.proximityDetector3D && this.starfieldManager.proximityDetector3D.isVisible) {
            this.starfieldManager.proximityDetector3D.isVisible = false;
            this.starfieldManager.proximityDetector3D.detectorContainer.style.display = 'none';
debug('UTILITY', '🚪 Proximity Detector dismissed during docking');
        }
        
        // Hide other HUD elements that should be off during docking
        if (this.starfieldManager.communicationHUD && this.starfieldManager.communicationHUD.visible) {
            this.starfieldManager.communicationHUD.hide();
debug('UI', '🚪 Communication HUD dismissed during docking');
        }
        
        if (this.starfieldManager.missionStatusHUD && this.starfieldManager.missionStatusHUD.visible) {
            this.starfieldManager.missionStatusHUD.hide();
debug('UI', '🚪 Mission Status HUD dismissed during docking');
        }
        
debug('UTILITY', '🛑 SimpleDockingManager: All ship systems shutdown complete');
    }

    /**
     * Launch from current station - Simple approach: restore approach position and back out
     */
    async launchFromStation() {
debug('UTILITY', 'launchFromStation() called - Simple launch approach');
debug('UTILITY', `🚀 isDocked: ${this.isDocked}, launchInProgress: ${this.launchInProgress}`);
        
        if (!this.isDocked || this.launchInProgress) {
            console.warn('🚀 Not docked or launch already in progress');
            return false;
        }

debug('UTILITY', 'Launching from station - validation passed');
        
        this.launchInProgress = true;
        
        try {
            const station = this.currentDockingTarget;
            
            if (this.approachPosition && this.approachRotation && station) {
debug('UTILITY', `🚀 Restoring approach position: (${this.approachPosition.x.toFixed(2)}, ${this.approachPosition.y.toFixed(2)}, ${this.approachPosition.z.toFixed(2)})`);
                
                // Restore the approach position and rotation
                this.starfieldManager.camera.position.copy(this.approachPosition);
                this.starfieldManager.camera.quaternion.copy(this.approachRotation);
                
                // Set AFT view (facing away from station)
                this.starfieldManager.setView('AFT');
debug('UTILITY', 'Set to AFT view for launch');
                
                // Calculate direction away from station
                const awayFromStation = this.starfieldManager.camera.position.clone().sub(station.position).normalize();
                
                // Move back along approach vector to safe distance
                const safeDistance = this.starfieldManager.calculateSafeLaunchDistance(station);
                const backoutPosition = station.position.clone().add(awayFromStation.multiplyScalar(safeDistance));
                
                // Position at safe distance
                this.starfieldManager.camera.position.copy(backoutPosition);
                
                // Verify the distance after positioning
                const actualDistance = this.starfieldManager.camera.position.distanceTo(station.position);
debug('UTILITY', `🚀 Backed out to ${actualDistance.toFixed(3)}km from ${station.name || 'station'}`);
                
                // Set initial launch speed (gentle departure)
                this.starfieldManager.targetSpeed = 1; // Impulse 1
                this.starfieldManager.currentSpeed = 1;
                
            } else {
                console.warn('🚀 No stored approach position - using fallback launch');
                // Fallback: just move away from station
                const station = this.currentDockingTarget;
                if (station) {
                    const awayDirection = new this.starfieldManager.THREE.Vector3(1, 0, 0); // Default direction
                    const safeDistance = this.starfieldManager.calculateSafeLaunchDistance(station);
                    const launchPos = station.position.clone().add(awayDirection.multiplyScalar(safeDistance));
                    this.starfieldManager.camera.position.copy(launchPos);
                    this.starfieldManager.setView('AFT');
                }
            }
            
            // Complete launch
            this.completeLaunch();
            
            return true;
            
        } catch (error) {
            console.error('🚀 Launch sequence failed:', error);
            this.launchInProgress = false;
            return false;
        }
    }

    /**
     * Calculate safe launch position outside station and away from other dockable objects
     * @param {THREE.Object3D} ship - Ship launching
     * @param {THREE.Object3D} station - Station launching from
     * @returns {THREE.Vector3} Launch position
     */
    calculateLaunchPosition(ship, station) {
        // Use StarfieldManager's comprehensive safe launch distance calculation
        const safeDistance = this.starfieldManager.calculateSafeLaunchDistance(station);
        
        // Get direction from station to current camera position (even if close)
        let awayFromStation = new window.THREE.Vector3()
            .subVectors(this.starfieldManager.camera.position, station.position);
        
        // If we're too close to get a good direction (which happens when docked), use a default direction
        if (awayFromStation.length() < 0.1) {
            // Use a default direction (positive X axis)
            awayFromStation.set(1, 0, 0);
debug('UTILITY', 'Using default launch direction (too close to station)');
        } else {
            awayFromStation.normalize();
        }
        
        // Always launch at exactly the safe distance from station center
        const launchPosition = station.position.clone()
            .add(awayFromStation.multiplyScalar(safeDistance));
        
        // Verify the distance is correct
        const actualDistance = launchPosition.distanceTo(station.position);
debug('UTILITY', `🚀 Launch position calculated: ${safeDistance.toFixed(1)}km away from ${station.name || 'station'} (actual: ${actualDistance.toFixed(1)}km)`);
        
        return launchPosition;
    }
    
    /**
     * Calculate launch rotation to face away from station
     * @param {THREE.Object3D} ship - Ship launching
     * @param {THREE.Object3D} station - Station launching from
     * @returns {THREE.Quaternion} Launch rotation
     */
    calculateLaunchRotation(ship, station) {
        // Calculate direction away from station
        const awayFromStation = new window.THREE.Vector3()
            .subVectors(this.starfieldManager.camera.position, station.position)
            .normalize();
        
        // Create rotation matrix to face away from station
        const lookAtMatrix = new window.THREE.Matrix4();
        const up = new window.THREE.Vector3(0, 1, 0);
        
        // Look in the direction away from station
        const targetPosition = this.starfieldManager.camera.position.clone()
            .add(awayFromStation.multiplyScalar(10)); // Look 10km ahead
        
        lookAtMatrix.lookAt(
            this.starfieldManager.camera.position,
            targetPosition,
            up
        );
        
        const launchRotation = new window.THREE.Quaternion();
        launchRotation.setFromRotationMatrix(lookAtMatrix);
        
debug('UTILITY', `🚀 Launch rotation calculated: facing away from ${station.name || 'station'}`);
        return launchRotation;
    }

    /**
     * Animate launch sequence
     * @param {THREE.Object3D} ship - Ship launching
     * @param {THREE.Object3D} station - Station launching from
     */
    async animateLaunch(ship, station) {
        return new Promise((resolve) => {
            // Simple launch animation - could be enhanced
            setTimeout(resolve, 1000); // 1 second launch delay
        });
    }

    /**
     * UNIFIED: Initiate docking with any dockable object (planets, moons, stations)
     * Replaces separate physics-based and distance-based docking paths
     * @param {THREE.Object3D} target - Target to dock with
     * @returns {Promise<boolean>} Success status
     */
    async initiateUnifiedDocking(target) {
debug('TARGETING', 'UNIFIED: Initiating docking sequence with', target.name || 'unnamed target');
        
        // Check if already docked to THIS target
        if (this.isDocked && this.currentDockingTarget === target) {
            console.warn('🚀 Already docked to this target, cannot dock again');
debug('P1', 'State check: isDocked=true, currentTarget=', this.currentDockingTarget?.name || 'null');
            return false;
        }
        
        // Check if already docked to DIFFERENT target
        if (this.isDocked && this.currentDockingTarget !== target) {
            console.warn('🚀 Already docked to different target, must undock first');
debug('P1', 'Current target:', this.currentDockingTarget?.name || 'null', 'New target:', target?.name || 'null');
            return false;
        }
        
        // Prevent multiple simultaneous docking attempts
        if (this.dockingInProgress) {
            console.warn('🚀 Docking already in progress, ignoring new request');
            return false;
        }
        
        this.dockingInProgress = true;
        this.currentDockingTarget = target;
        
        try {
            // Unified eligibility check (works for all object types)
            const eligibility = this.checkDockingEligibility(null, target);
            if (!eligibility.canDock) {
                console.warn('🚀 Docking eligibility failed:', eligibility.reason);
                this.dockingInProgress = false;
                this.currentDockingTarget = null;
                return false;
            }
            
            // Get ship for energy consumption
            const ship = this.starfieldManager.viewManager?.getShip();
            if (ship) {
                const dockingEnergyCost = 25;
                if (!ship.consumeEnergy(dockingEnergyCost)) {
                    console.warn('🚀 Docking failed: Insufficient energy for docking procedures');
                    this.dockingInProgress = false;
                    this.currentDockingTarget = null;
                    return false;
                }
            }
            
            // Stop ship movement
            this.starfieldManager.targetSpeed = 0;
            this.starfieldManager.currentSpeed = 0;
            this.starfieldManager.decelerating = false;
            
            // Use StarfieldManager's unified dock method (works for all object types)
            const dockingSuccess = this.starfieldManager.dock(target);
            
            if (dockingSuccess) {
                this.isDocked = true;
                this.lastDockingTime = Date.now();
                this.dockingInProgress = false;
                
                // Ensure StarfieldManager state is synchronized
                this.starfieldManager.isDocked = true;
                this.starfieldManager.dockedTo = target;
                
debug('TARGETING', `🚀 Successfully docked with ${target.name || 'target'}`);
                
                // Show docking interface (station menu)
debug('TARGETING', `🚀 Showing docking interface for ${target.name || 'target'}`);
                this.starfieldManager.showDockingInterface(target);
                
                // Check for cargo deliveries upon successful docking (stations only)
                const targetMetadata = this.spatialManager.getMetadata(target);
debug('INSPECTION', `🚛 DEBUG: Checking cargo delivery conditions:`);
debug('TARGETING', `🚛 DEBUG: - targetMetadata:`, targetMetadata);
debug('TARGETING', `🚛 DEBUG: - targetMetadata?.type:`, targetMetadata?.type);
debug('TARGETING', `🚛 DEBUG: - target?.userData?.name:`, target?.userData?.name);
debug('TARGETING', `🚛 DEBUG: - target.name:`, target.name);

                // Check if this is a station by name pattern or metadata
                const isStation = (targetMetadata?.type === 'station') ||
                                (target.name && (target.name.includes('Station') || target.name.includes('Base') ||
                                target.name.includes('Outpost') || target.name.includes('Platform') ||
                                target.name.includes('Array') || target.name.includes('Facility') ||
                                target.name.includes('Complex') || target.name.includes('Shipyard') ||
                                target.name.includes('Refinery') || target.name.includes('City') ||
                                target.name.includes('Research') || target.name.includes('Lab') ||
                                target.name.includes('Trading') || target.name.includes('Post')));

                const stationName = target?.userData?.name || target.name;
debug('INSPECTION', `🚛 DEBUG: - isStation:`, isStation);
debug('INSPECTION', `🚛 DEBUG: - stationName:`, stationName);

                if (isStation && stationName) {
                    const originalName = stationName;
                    const stationKey = String(originalName).toLowerCase().replace(/\s+/g, '_');
debug('INSPECTION', `🚛 DEBUG: Station name conversion: "${originalName}" → "${stationKey}"`);
                    await this.starfieldManager.checkCargoDeliveries(stationKey);
                } else {
debug('INSPECTION', `🚛 DEBUG: Cargo delivery check skipped - not a station or no name`);
                }
                
                // KEEP currentDockingTarget until launch - don't set to null
                // this.currentDockingTarget = null;
                return true;
            } else {
                console.error('🚀 StarfieldManager.dock() failed');
                this.dockingInProgress = false;
                this.currentDockingTarget = null;
                return false;
            }
            
        } catch (error) {
            console.error('🚀 Error during unified docking:', error);
            this.dockingInProgress = false;
            this.currentDockingTarget = null;
            return false;
        }
    }

    /**
     * UNIFIED: Get docking range for any dockable object type
     * Centralizes all docking range logic in one place
     * @param {string} targetType - Type of target (planet, moon, station)
     * @param {THREE.Object3D} target - Target object (for station-specific overrides)
     * @returns {number} Docking range in kilometers
     */
    getUnifiedDockingRange(targetType, target) {
        switch (targetType) {
            case 'planet':
                return 4.0; // Planets have 4.0km docking range
            case 'moon':
                return 1.5; // Moons have 1.5km docking range
            case 'station':
                // Check for station-specific docking range override
                if (target?.userData?.dockingRange) {
                    return target.userData.dockingRange;
                }
                // Check for active zone range (from collision detection)
                if (target?.userData?.activeZoneRange) {
                    return target.userData.activeZoneRange;
                }
                // Default station range
                return 1.8; // Stations default to 1.8km (slightly larger than moons)
            default:
                console.warn(`Unknown dockable object type: ${targetType}, using default range`);
                return this.dockingRange; // Fallback to default
        }
    }

    /**
     * Complete launch process
     */
    completeLaunch() {
        // Store the current camera position before any system reinitialization
        const launchPosition = this.starfieldManager.camera.position.clone();
        const launchRotation = this.starfieldManager.camera.quaternion.clone();
        
debug('UTILITY', `🚀 Launch completed - storing position: (${launchPosition.x.toFixed(2)}, ${launchPosition.y.toFixed(2)}, ${launchPosition.z.toFixed(2)})`);
        
        this.isDocked = false;
        this.launchInProgress = false;
        this.currentDockingTarget = null; // Clear the docking target
        this.dockingInProgress = false; // Also clear this flag
        this.lastLaunchTime = Date.now();
        this.dockingCooldown = true;
        
        // Ensure StarfieldManager state is synchronized
        this.starfieldManager.isDocked = false;
        this.starfieldManager.dockedTo = null;
        
        // Clear stored approach position after launch
        this.approachPosition = null;
        this.approachRotation = null;
        
        // Update starfield manager state
        if (this.starfieldManager) {
            this.starfieldManager.isDocked = false;
            this.starfieldManager.dockedTo = null;
            this.starfieldManager.showHUDMessage?.('LAUNCHED', 'Launch sequence completed');
            
            // CRITICAL: Restore weapon HUD after launch (was missing!)
            console.log('🔫 LAUNCH: Restoring weapon HUD after SimpleDockingManager launch...');
            if (this.starfieldManager.weaponHUD && this.starfieldManager.weaponHUD.weaponSlotsDisplay) {
                this.starfieldManager.weaponHUD.weaponSlotsDisplay.style.display = 'flex';
                this.starfieldManager.weaponHUD.autofireIndicator.style.display = 'none'; // Will be shown if autofire is on
                this.starfieldManager.weaponHUD.targetLockIndicator.style.display = 'none'; // Will be shown if locked
                this.starfieldManager.weaponHUD.unifiedDisplay.style.display = 'none'; // Will be shown when needed
                console.log('🔫 LAUNCH: Weapon HUD restored successfully');
                
                // Update weapon HUD with current weapon system state
                const ship = this.starfieldManager.viewManager?.getShip();
                if (ship && ship.weaponSystem) {
                    this.starfieldManager.weaponHUD.updateWeaponSlotsDisplay(ship.weaponSystem.weaponSlots, ship.weaponSystem.activeSlotIndex);
                    // Ensure connection is established
                    this.starfieldManager.connectWeaponHUDToSystem();
                    console.log('🔫 LAUNCH: Weapon HUD updated and connected');
                }
debug('COMBAT', '🔫 Weapon HUD restored after SimpleDockingManager launch');
            } else {
                console.log('🔫 LAUNCH: Cannot restore weapon HUD - missing components:', {
                    weaponHUD: !!this.starfieldManager.weaponHUD,
                    weaponSlotsDisplay: !!this.starfieldManager.weaponHUD?.weaponSlotsDisplay
                });
            }
            
            // Set undock cooldown to prevent immediate re-docking
            this.starfieldManager.undockCooldown = Date.now() + 10000; // 10 second cooldown
debug('UTILITY', `🚀 Undock cooldown set: 10 seconds (until ${new Date(this.starfieldManager.undockCooldown).toLocaleTimeString()})`);
            
            // Check camera position before system initialization
            const positionBeforeInit = this.starfieldManager.camera.position.clone();
debug('UTILITY', `🚀 Camera position BEFORE system init: (${positionBeforeInit.x.toFixed(2)}, ${positionBeforeInit.y.toFixed(2)}, ${positionBeforeInit.z.toFixed(2)})`);
            
            // Reinitialize ship systems for space flight
            if (typeof this.starfieldManager.initializeShipSystems === 'function') {
                this.starfieldManager.initializeShipSystems();
debug('UTILITY', 'Ship systems reinitialized for space flight');
            }
            
            // Check camera position after system initialization
            const positionAfterInit = this.starfieldManager.camera.position.clone();
debug('UTILITY', `🚀 Camera position AFTER system init: (${positionAfterInit.x.toFixed(2)}, ${positionAfterInit.y.toFixed(2)}, ${positionAfterInit.z.toFixed(2)})`);
            
            // CRITICAL: Restore the launch position after system initialization
            // This prevents the old undock method from overriding our safe launch positioning
            this.starfieldManager.camera.position.copy(launchPosition);
            this.starfieldManager.camera.quaternion.copy(launchRotation);
debug('UTILITY', `🚀 Launch position RESTORED: (${launchPosition.x.toFixed(2)}, ${launchPosition.y.toFixed(2)}, ${launchPosition.z.toFixed(2)})`);
            
            // Set AFT view AFTER system initialization to prevent override
            this.starfieldManager.setView('AFT');
debug('UTILITY', 'AFT view set AFTER system initialization');
            
            // Verify final position
            const finalPosition = this.starfieldManager.camera.position.clone();
debug('UTILITY', `🚀 Final camera position: (${finalPosition.x.toFixed(2)}, ${finalPosition.y.toFixed(2)}, ${finalPosition.z.toFixed(2)})`);
        }
        
        // Resume docking monitoring
        this.startDockingMonitoring();
        
        // Set AFT view as the very final step after all initialization is complete
        setTimeout(() => {
            this.starfieldManager.setView('AFT');
debug('UTILITY', 'Final AFT view set after launch completion');
            
            // Force AFT view again after a longer delay to override any system that might switch it back
            setTimeout(() => {
                this.starfieldManager.setView('AFT');
debug('UTILITY', 'FINAL FINAL AFT view set - overriding any system switches');
                
                // Set impulse 1 to start moving away from the station
                this.starfieldManager.setImpulseSpeed(1);
debug('UTILITY', 'Impulse 1 set - beginning departure from station');
            }, 500); // Longer delay to ensure target computer doesn't override
        }, 100); // Small delay to ensure all systems are initialized
        
        // Set cooldown timer
        setTimeout(() => {
            this.dockingCooldown = false;
debug('UTILITY', 'Docking systems ready');
        }, this.dockingCooldownTime);
    }

    /**
     * Show docking prompt to player
     * @param {THREE.Object3D} station - Station available for docking
     * @param {Object} dockingResult - Docking eligibility result
     */
    showDockingPrompt(station, dockingResult) {
        // This would integrate with the UI system
        if (this.starfieldManager.showDockingPrompt) {
            this.starfieldManager.showDockingPrompt(station, dockingResult);
        }
    }

    /**
     * Hide docking prompt
     */
    hideDockingPrompt() {
        if (this.starfieldManager.hideDockingPrompt) {
            this.starfieldManager.hideDockingPrompt();
        }
    }

    /**
     * Show docking interface
     * @param {THREE.Object3D} station - Station docked to
     */
    showDockingInterface(station) {
        if (this.starfieldManager.showDockingInterface) {
            this.starfieldManager.showDockingInterface(station);
        }
    }

    /**
     * Get current docking status
     * @returns {Object} Docking status
     */
    getDockingStatus() {
        return {
            isDocked: this.isDocked,
            dockingInProgress: this.dockingInProgress,
            launchInProgress: this.launchInProgress,
            currentTarget: this.currentDockingTarget,
            cooldownActive: this.dockingCooldown,
            cooldownRemaining: this.dockingCooldown ? 
                Math.max(0, this.dockingCooldownTime - (Date.now() - this.lastLaunchTime)) : 0
        };
    }


    /**
     * Cleanup docking manager
     */
    destroy() {
        this.stopDockingMonitoring();
debug('UTILITY', 'SimpleDockingManager destroyed');
    }
}

export default SimpleDockingManager;
