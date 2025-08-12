/**
 * PhysicsDockingManager - Physics-based collision docking system
 * Replaces distance-based docking with proper collision detection
 * Handles launch positioning and docking cooldowns
 */

export class PhysicsDockingManager {
    constructor(starfieldManager) {
        this.starfieldManager = starfieldManager;
        this.physicsManager = window.physicsManager;
        
        // Docking state
        this.isDocked = false;
        this.currentDockingTarget = null;
        this.dockingInProgress = false;
        this.launchInProgress = false;
        
        // Collision tracking
        this.inDockingZone = false;
        this.currentDockingZone = null;
        this.dockingCollisionCallbacks = [];
        
        // Cooldown system
        this.dockingCooldown = false;
        this.dockingCooldownTime = 3000; // 3 seconds
        this.lastDockingTime = 0;
        this.lastLaunchTime = 0;
        
        // Launch positioning
        this.launchDistance = 5.0; // Distance to position ship when launching (km)
        this.launchSafetyBuffer = 2.0; // Additional buffer to ensure we're outside docking zone
        
        // Monitoring
        this.dockingZoneCheckInterval = null;
        
        console.log('🚀 PhysicsDockingManager initialized');
        this.setupCollisionCallbacks();
    }

    /**
     * Setup collision detection for docking zones
     * Since physics callbacks aren't available, we'll use manual detection
     */
    setupCollisionCallbacks() {
        if (!this.physicsManager) {
            console.warn('🚀 Physics manager not available for docking collision setup');
            return;
        }

        // Start monitoring for docking zone collisions manually
        this.startDockingZoneMonitoring();
        console.log('🚀 Docking zone monitoring started');
    }

    /**
     * Start monitoring for docking zone collisions manually
     */
    startDockingZoneMonitoring() {
        // Set up a regular check for docking zone proximity
        this.dockingZoneCheckInterval = setInterval(() => {
            this.checkDockingZoneProximity();
        }, 100); // Check every 100ms
    }

    /**
     * Check if player is in a docking zone using distance calculation
     */
    checkDockingZoneProximity() {
        if (!this.starfieldManager.camera || !this.starfieldManager.solarSystemManager) {
            return;
        }

        const playerPosition = this.starfieldManager.camera.position;
        const celestialBodies = this.starfieldManager.solarSystemManager.celestialBodies;
        
        let closestDockingZone = null;
        let closestDistance = Infinity;

        // Check distance to all docking zones
        for (const [key, body] of celestialBodies.entries()) {
            if (body.userData && body.userData.dockingCollisionBox) {
                const dockingBox = body.userData.dockingCollisionBox;
                const distance = playerPosition.distanceTo(dockingBox.position);
                const dockingRange = body.userData.dockingRange || 3.0;

                // Check if we're within docking range
                if (distance <= dockingRange && distance < closestDistance) {
                    closestDistance = distance;
                    closestDockingZone = {
                        object: body,
                        dockingBox: dockingBox,
                        distance: distance,
                        range: dockingRange
                    };
                }
            }
        }

        // Update docking zone state
        const wasInDockingZone = this.inDockingZone;
        this.inDockingZone = closestDockingZone !== null;
        this.currentDockingZone = closestDockingZone;

        // Handle entering/leaving docking zones
        if (!wasInDockingZone && this.inDockingZone) {
            this.onEnterDockingZone(closestDockingZone);
        } else if (wasInDockingZone && !this.inDockingZone) {
            this.onLeaveDockingZone();
        } else if (this.inDockingZone && this.currentDockingZone && !this.isDocked && !this.dockingInProgress) {
            // Re-check eligibility while remaining inside the zone (handle case: slowed down after initial fast pass)
            const currentSpeed = this.starfieldManager.currentSpeed || 0;
            if (currentSpeed <= 1) {
                this.checkAutoDocking(this.currentDockingZone);
            }
        }
    }

    /**
     * Handle entering a docking zone
     */
    onEnterDockingZone(dockingZone) {
        console.log(`🚀 Entered docking zone for ${dockingZone.object.userData.name}`);
        
        // Show docking prompt if conditions are met
        this.checkAutoDocking(dockingZone);
    }

    /**
     * Handle collision with docking zones (legacy method - now unused)
     */
    handleDockingCollision(entityA, entityB, contactManifold) {
        // This method is no longer used since we're using manual detection
        // Keeping it for potential future use with proper collision callbacks
    }

    /**
     * Check if the entity represents the player ship
     */
    isPlayerShip(shipEntity) {
        // This needs to be implemented based on how the ship entity is identified
        // For now, assume any ship entity with the ship type is the player
        return shipEntity.type === 'ship' && shipEntity.entityId === 'player_ship';
    }

    /**
     * Check if auto-docking should occur
     */
    checkAutoDocking(dockingZone) {
        // Don't auto-dock if already docked or in cooldown
        if (this.isDocked || this.dockingCooldown || this.dockingInProgress) {
            return;
        }

        // Check velocity - must be slow enough to dock
        const currentSpeed = this.starfieldManager.currentSpeed || 0;
        if (currentSpeed > 1) { // Max docking speed
            console.log('🚀 Too fast to dock - reduce speed');
            return;
        }

        // Get station data from docking zone
        const stationData = {
            object: dockingZone.object,
            name: dockingZone.object.userData.name || 'Unknown Station',
            type: dockingZone.object.userData.type || 'station',
            faction: dockingZone.object.userData.faction
        };

        // Show docking prompt
        this.promptDocking(stationData);
    }

    /**
     * Get station data from docking zone entity
     */
    getDockingZoneStation(dockingEntity) {
        // Look for the station in the current system
        if (!this.starfieldManager.solarSystemManager) {
            return null;
        }

        const celestialBodies = this.starfieldManager.solarSystemManager.celestialBodies;
        for (const [key, body] of celestialBodies.entries()) {
            if (body.userData && body.userData.dockingCollisionBox && 
                body.userData.dockingRigidBody === dockingEntity.rigidBody) {
                return {
                    object: body,
                    name: body.userData.name,
                    type: body.userData.type,
                    faction: body.userData.faction
                };
            }
        }
        return null;
    }

    /**
     * Prompt player for docking
     */
    promptDocking(stationData) {
        console.log(`🚀 Entered docking zone for ${stationData.name} - press DOCK to dock`);
        
        // Show docking UI if available with enriched info
        if (this.starfieldManager.dockingModal) {
            const targetInfo = {
                name: stationData.name,
                type: 'station',
                faction: stationData.faction,
                dockingRange: this.currentDockingZone?.range
            };
            const distance = this.currentDockingZone?.distance ?? 0;
            const currentSpeed = this.starfieldManager.currentSpeed || 0;
            this.starfieldManager.dockingModal.show(stationData.object, targetInfo, distance, currentSpeed);
        }
    }

    /**
     * Initiate docking with physics-based validation
     */
    async initiateDocking(target) {
        // Check if we're in cooldown
        if (this.dockingCooldown) {
            const timeLeft = this.dockingCooldownTime - (Date.now() - this.lastLaunchTime);
            console.log(`🚀 Docking on cooldown for ${Math.ceil(timeLeft / 1000)} more seconds`);
            return false;
        }

        // Check if already docked
        if (this.isDocked) {
            console.log('🚀 Already docked');
            return false;
        }

        // Check if we're in a docking zone
        if (!this.inDockingZone || !this.currentDockingZone) {
            console.log('🚀 Not in a docking zone - move closer to the station');
            return false;
        }

        // Validate target matches current docking zone (compare by position instead of reference)
        const targetPosition = target.position || target;
        const zonePosition = this.currentDockingZone.object.position;
        
        if (!targetPosition || !zonePosition) {
            console.log('🚀 Invalid target or zone position data');
            return false;
        }
        
        // Check if positions match (within a small tolerance for floating point)
        const positionDistance = targetPosition.distanceTo ? 
            targetPosition.distanceTo(zonePosition) : 
            Math.sqrt(
                Math.pow(targetPosition.x - zonePosition.x, 2) +
                Math.pow(targetPosition.y - zonePosition.y, 2) +
                Math.pow(targetPosition.z - zonePosition.z, 2)
            );
            
        if (positionDistance > 0.1) { // 0.1km tolerance
            console.log('🚀 Target position mismatch with current docking zone');
            console.log('  Target position:', targetPosition);
            console.log('  Zone position:', zonePosition);
            console.log('  Distance:', positionDistance);
            return false;
        }

        const stationData = {
            object: this.currentDockingZone.object,
            name: this.currentDockingZone.object.userData.name || 'Unknown Station',
            type: this.currentDockingZone.object.userData.type || 'station',
            faction: this.currentDockingZone.object.userData.faction
        };

        // Check speed
        const currentSpeed = this.starfieldManager.currentSpeed || 0;
        if (currentSpeed > 1) {
            console.log('🚀 Too fast to dock - reduce speed to under 1 km/s');
            return false;
        }

        // Start docking process
        this.dockingInProgress = true;
        this.currentDockingTarget = target;

        try {
            // Use existing docking animation system
            const dockingSuccess = this.starfieldManager.dock(target);
            
            if (dockingSuccess) {
                this.isDocked = true;
                this.lastDockingTime = Date.now();
                console.log(`🚀 Successfully docked with ${stationData.name}`);
                return true;
            } else {
                this.dockingInProgress = false;
                this.currentDockingTarget = null;
                return false;
            }
        } catch (error) {
            console.error('🚀 Docking failed:', error);
            this.dockingInProgress = false;
            this.currentDockingTarget = null;
            return false;
        }
    }

    /**
     * Launch from current docking target with safe positioning
     */
    async initiateLaunch() {
        if (!this.isDocked || !this.currentDockingTarget) {
            console.log('🚀 Not currently docked');
            return false;
        }

        this.launchInProgress = true;

        try {
            // Calculate safe launch position
            const launchPosition = this.calculateLaunchPosition(this.currentDockingTarget);
            const launchRotation = this.calculateLaunchRotation(this.currentDockingTarget);

            // Position ship at launch point
            this.starfieldManager.camera.position.copy(launchPosition);
            this.starfieldManager.camera.setRotationFromQuaternion(launchRotation);

            // Update ship physics position if physics body exists
            if (window.physicsManager && this.starfieldManager.ship) {
                const shipRigidBody = window.physicsManager.rigidBodies.get(this.starfieldManager.ship);
                if (shipRigidBody) {
                    const btVector = new window.Ammo.btVector3(
                        launchPosition.x, launchPosition.y, launchPosition.z
                    );
                    shipRigidBody.getMotionState().setWorldTransform(
                        new window.Ammo.btTransform(
                            new window.Ammo.btQuaternion(
                                launchRotation.x, launchRotation.y, launchRotation.z, launchRotation.w
                            ),
                            btVector
                        )
                    );
                    window.Ammo.destroy(btVector);
                }
            }

            // Clear docking state
            this.isDocked = false;
            this.dockingInProgress = false;
            this.currentDockingTarget = null;
            this.inDockingZone = false;
            this.currentDockingZone = null;

            // Start cooldown
            this.startCooldown();

            // Use existing launch system to update view
            if (this.starfieldManager.launch) {
                this.starfieldManager.launch();
            }

            console.log('🚀 Launch successful - positioned safely away from station');
            return true;

        } catch (error) {
            console.error('🚀 Launch failed:', error);
            this.launchInProgress = false;
            return false;
        }
    }

    /**
     * Calculate safe launch position away from docking zone
     */
    calculateLaunchPosition(dockingTarget) {
        const targetPosition = dockingTarget.position;
        
        // Get docking zone size for safety buffer
        let dockingRange = 3.0; // Default
        if (dockingTarget.userData && dockingTarget.userData.dockingRange) {
            dockingRange = dockingTarget.userData.dockingRange;
        }

        // Calculate launch distance (docking range + safety buffer + launch distance)
        const totalLaunchDistance = dockingRange + this.launchSafetyBuffer + this.launchDistance;

        // Find a direction away from the station (opposite to current relative position)
        const currentRelativePos = new this.starfieldManager.THREE.Vector3()
            .subVectors(this.starfieldManager.camera.position, targetPosition);
        
        // If too close to calculate good direction, use a default direction
        if (currentRelativePos.length() < 0.1) {
            currentRelativePos.set(1, 0, 0); // Default direction
        }

        // Normalize and scale to launch distance
        currentRelativePos.normalize().multiplyScalar(totalLaunchDistance);

        // Calculate final launch position
        return new this.starfieldManager.THREE.Vector3()
            .addVectors(targetPosition, currentRelativePos);
    }

    /**
     * Calculate launch rotation facing away from station
     */
    calculateLaunchRotation(dockingTarget) {
        const targetPosition = dockingTarget.position;
        const launchPosition = this.calculateLaunchPosition(dockingTarget);
        
        // Calculate direction away from station
        const awayDirection = new this.starfieldManager.THREE.Vector3()
            .subVectors(launchPosition, targetPosition)
            .normalize();

        // Create rotation matrix looking in the away direction
        const lookAtMatrix = new this.starfieldManager.THREE.Matrix4();
        const up = new this.starfieldManager.THREE.Vector3(0, 1, 0);
        lookAtMatrix.lookAt(launchPosition, launchPosition.clone().add(awayDirection), up);

        // Extract rotation quaternion
        return new this.starfieldManager.THREE.Quaternion().setFromRotationMatrix(lookAtMatrix);
    }

    /**
     * Start docking cooldown
     */
    startCooldown() {
        this.dockingCooldown = true;
        this.lastLaunchTime = Date.now();

        // Clear cooldown after timeout
        setTimeout(() => {
            this.dockingCooldown = false;
            console.log('🚀 Docking cooldown ended');
        }, this.dockingCooldownTime);

        console.log(`🚀 Docking cooldown started for ${this.dockingCooldownTime / 1000} seconds`);
    }

    /**
     * Check if currently in a docking zone
     */
    isInDockingZone() {
        return this.inDockingZone && this.currentDockingZone !== null;
    }

    /**
     * Get current docking zone info
     */
    getCurrentDockingZoneInfo() {
        if (!this.isInDockingZone()) {
            return null;
        }

        return this.getDockingZoneStation(this.currentDockingZone);
    }

    /**
     * Handle leaving docking zone
     */
    onLeaveDockingZone() {
        this.inDockingZone = false;
        this.currentDockingZone = null;
        console.log('🚀 Left docking zone');
    }

    /**
     * Clean up physics callbacks and intervals
     */
    dispose() {
        // Clear the docking zone monitoring interval
        if (this.dockingZoneCheckInterval) {
            clearInterval(this.dockingZoneCheckInterval);
            this.dockingZoneCheckInterval = null;
        }

        // Clear docking state
        this.inDockingZone = false;
        this.currentDockingZone = null;
        
        console.log('🚀 PhysicsDockingManager disposed');
    }
}
