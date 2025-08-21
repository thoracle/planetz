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
        
        // Docking parameters
        this.dockingRange = 1.5; // km - distance to initiate docking
        this.maxApproachAngle = 60; // degrees - maximum approach angle
        this.dockingSpeed = 0.5; // km/s - speed during docking sequence
        this.launchDistance = 3.0; // km - distance to position ship when launching
        
        // Cooldown system
        this.dockingCooldown = false;
        this.dockingCooldownTime = 3000; // 3 seconds
        this.lastDockingTime = 0;
        this.lastLaunchTime = 0;
        
        // Monitoring
        this.dockingCheckInterval = null;
        this.checkIntervalMs = 100; // Check every 100ms
        
        console.log('🚀 SimpleDockingManager initialized - Distance + angle based docking');
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
        
        console.log('🚀 Docking monitoring started');
    }

    /**
     * Stop monitoring for docking opportunities
     */
    stopDockingMonitoring() {
        if (this.dockingCheckInterval) {
            clearInterval(this.dockingCheckInterval);
            this.dockingCheckInterval = null;
        }
        
        console.log('🚀 Docking monitoring stopped');
    }

    /**
     * Check for docking opportunities with nearby stations
     */
    checkDockingOpportunities() {
        if (this.isDocked || this.dockingInProgress || this.launchInProgress) {
            return;
        }

        const ship = this.starfieldManager.viewManager?.getShip();
        if (!ship || !ship.position) {
            return;
        }

        // Find nearby stations
        const nearbyObjects = this.spatialManager.queryNearby(
            ship.position, 
            this.dockingRange * 2, // Search radius
            'station'
        );

        let bestDockingTarget = null;
        let bestDockingResult = null;

        for (const {object: station, distance, metadata} of nearbyObjects) {
            if (!metadata.canDock) continue;

            const dockingResult = this.checkDockingEligibility(ship, station);
            if (dockingResult.canDock) {
                if (!bestDockingTarget || distance < bestDockingResult.distance) {
                    bestDockingTarget = station;
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
    checkDockingEligibility(ship, station) {
        const shipMetadata = this.spatialManager.getMetadata(ship);
        const stationMetadata = this.spatialManager.getMetadata(station);
        
        if (!shipMetadata || !stationMetadata) {
            return { canDock: false, reason: 'Missing metadata' };
        }
        
        // Check distance
        const distance = ship.position.distanceTo(station.position);
        const requiredRange = this.dockingRange;
        
        if (distance > requiredRange) {
            return { 
                canDock: false, 
                reason: 'Too far', 
                distance, 
                requiredDistance: requiredRange 
            };
        }
        
        // Check approach angle (ship should be facing roughly toward station)
        const toStation = station.position.clone().sub(ship.position).normalize();
        const shipForward = new window.THREE.Vector3(0, 0, -1).applyQuaternion(ship.quaternion);
        const approachAngle = Math.acos(Math.max(-1, Math.min(1, toStation.dot(shipForward))));
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
            station: station,
            stationName: stationMetadata.name || 'Unknown Station'
        };
    }

    /**
     * Initiate docking sequence
     * @param {THREE.Object3D} station - Station to dock with
     */
    async initiateDocking(station) {
        if (this.isDocked || this.dockingInProgress) {
            console.warn('🚀 Docking already in progress or docked');
            return false;
        }

        const ship = this.starfieldManager.viewManager?.getShip();
        if (!ship) {
            console.warn('🚀 No ship available for docking');
            return false;
        }

        const dockingResult = this.checkDockingEligibility(ship, station);
        if (!dockingResult.canDock) {
            console.warn('🚀 Docking not possible:', dockingResult.reason);
            this.starfieldManager.showHUDError?.('DOCKING FAILED', dockingResult.reason);
            return false;
        }

        console.log('🚀 Initiating docking sequence with', dockingResult.stationName);
        
        this.dockingInProgress = true;
        this.currentDockingTarget = station;
        
        try {
            // Stop ship movement
            this.starfieldManager.targetSpeed = 0;
            this.starfieldManager.currentSpeed = 0;
            
            // Animate docking approach (simple version)
            await this.animateDockingApproach(ship, station);
            
            // Complete docking
            this.completeDocking(station);
            
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
    async animateDockingApproach(ship, station) {
        return new Promise((resolve) => {
            const startPos = ship.position.clone();
            const targetPos = station.position.clone();
            const duration = 2000; // 2 seconds
            const startTime = Date.now();
            
            const animate = () => {
                const elapsed = Date.now() - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Smooth easing
                const easedProgress = 1 - Math.pow(1 - progress, 3);
                
                // Interpolate position
                ship.position.lerpVectors(startPos, targetPos, easedProgress);
                
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
    completeDocking(station) {
        this.isDocked = true;
        this.dockingInProgress = false;
        this.lastDockingTime = Date.now();
        
        const stationMetadata = this.spatialManager.getMetadata(station);
        const stationName = stationMetadata?.name || 'Unknown Station';
        
        console.log('🚀 Docking completed with', stationName);
        
        // Update starfield manager state
        if (this.starfieldManager) {
            this.starfieldManager.isDocked = true;
            this.starfieldManager.dockedTo = station;
            this.starfieldManager.showHUDMessage?.('DOCKED', `Successfully docked with ${stationName}`);
        }
        
        // Stop monitoring while docked
        this.stopDockingMonitoring();
        
        // Trigger docking interface
        this.showDockingInterface(station);
    }

    /**
     * Launch from current station
     */
    async launchFromStation() {
        if (!this.isDocked || this.launchInProgress) {
            console.warn('🚀 Not docked or launch already in progress');
            return false;
        }

        console.log('🚀 Launching from station');
        
        this.launchInProgress = true;
        
        try {
            const ship = this.starfieldManager.viewManager?.getShip();
            const station = this.currentDockingTarget;
            
            if (ship && station) {
                // Position ship at launch distance
                const launchPos = this.calculateLaunchPosition(ship, station);
                ship.position.copy(launchPos);
                
                // Animate launch movement
                await this.animateLaunch(ship, station);
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
     * Calculate launch position outside station
     * @param {THREE.Object3D} ship - Ship launching
     * @param {THREE.Object3D} station - Station launching from
     * @returns {THREE.Vector3} Launch position
     */
    calculateLaunchPosition(ship, station) {
        const stationMetadata = this.spatialManager.getMetadata(station);
        const stationRadius = stationMetadata?.radius || 1;
        const safeDistance = stationRadius + this.launchDistance;
        
        // Launch in random direction away from station
        const launchDirection = new window.THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        ).normalize();
        
        return station.position.clone().add(launchDirection.multiplyScalar(safeDistance));
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
     * Complete launch process
     */
    completeLaunch() {
        this.isDocked = false;
        this.launchInProgress = false;
        this.currentDockingTarget = null;
        this.lastLaunchTime = Date.now();
        this.dockingCooldown = true;
        
        console.log('🚀 Launch completed');
        
        // Update starfield manager state
        if (this.starfieldManager) {
            this.starfieldManager.isDocked = false;
            this.starfieldManager.dockedTo = null;
            this.starfieldManager.showHUDMessage?.('LAUNCHED', 'Launch sequence completed');
        }
        
        // Resume docking monitoring
        this.startDockingMonitoring();
        
        // Set cooldown timer
        setTimeout(() => {
            this.dockingCooldown = false;
            console.log('🚀 Docking systems ready');
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
        console.log('🚀 SimpleDockingManager destroyed');
    }
}

export default SimpleDockingManager;
