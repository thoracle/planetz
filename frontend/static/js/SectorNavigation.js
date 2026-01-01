import * as THREE from 'three';
import WarpFeedback from './WarpFeedback.js';
import { debug } from './debug.js';

class SectorNavigation {
    constructor(scene, camera, warpDrive) {
        this.scene = scene;
        this.camera = camera;
        this.warpDrive = warpDrive;
        this.viewManager = warpDrive.viewManager; // Get ViewManager from WarpDrive
        
        // Navigation properties
        this.currentSector = 'A0';
        this.targetSector = null;
        this.isNavigating = false;
        this.navigationProgress = 0;
        this._hasArrived = false;
        
        // Sector size and grid properties
        this.SECTOR_SIZE = 100000;
        this.GRID_ROWS = 10; // A-J
        this.GRID_COLS = 9;  // 0-8
        
        // Navigation timing
        this.warpDuration = 12000; // Match WarpEffects duration
        this.arrivalTime = 8000;   // Arrival at 8 seconds
        this.startTime = 0;
        
        // Position tracking
        this.startPosition = new THREE.Vector3();
        this.targetPosition = new THREE.Vector3();
        
        // Initialize navigation feedback
        this.feedback = new WarpFeedback();
    }

    /**
     * Calculate sector coordinates from position
     * @param {THREE.Vector3} position - Current position
     * @returns {string} Sector coordinate (e.g., 'A0', 'B1')
     */
    calculateSectorFromPosition(position) {
        const x = Math.floor(position.x / this.SECTOR_SIZE);
        const z = Math.floor(position.z / this.SECTOR_SIZE);
        
        // Convert to sector notation (A0-J8)
        const col = Math.max(0, Math.min(8, x + 4)); // +4 to center around origin
        const row = Math.max(0, Math.min(9, z + 5)); // +5 to center around origin
        const rowLetter = String.fromCharCode(65 + row); // 65 is ASCII for 'A'
        
        return `${rowLetter}${col}`;
    }

    /**
     * Calculate position from sector coordinates
     * @param {string} sector - Sector coordinate (e.g., 'A0', 'B1')
     * @returns {THREE.Vector3} Center position of the sector
     */
    calculatePositionFromSector(sector) {
        const row = sector.charCodeAt(0) - 65; // Convert A-J to 0-9
        const col = parseInt(sector[1]);
        
        // Convert to world coordinates
        const x = (col - 4) * this.SECTOR_SIZE;
        const z = (row - 5) * this.SECTOR_SIZE;
        
        return new THREE.Vector3(x, 0, z);
    }

    /**
     * Calculate Manhattan distance between sectors
     * @param {string} sector1 - First sector coordinate
     * @param {string} sector2 - Second sector coordinate
     * @returns {number} Manhattan distance
     */
    calculateSectorDistance(sector1, sector2) {
        const row1 = sector1.charCodeAt(0) - 65;
        const col1 = parseInt(sector1[1]);
        const row2 = sector2.charCodeAt(0) - 65;
        const col2 = parseInt(sector2[1]);
        
        return Math.abs(row2 - row1) + Math.abs(col2 - col1);
    }

    /**
     * Calculate required energy for sector navigation
     * @param {string} fromSector - Starting sector
     * @param {string} toSector - Target sector
     * @returns {number} Required energy
     */
    calculateRequiredEnergy(fromSector, toSector) {
        const fromRow = fromSector.charCodeAt(0) - 65;
        const fromCol = parseInt(fromSector[1]);
        const toRow = toSector.charCodeAt(0) - 65;
        const toCol = parseInt(toSector[1]);
        
        const distance = Math.abs(toRow - fromRow) + Math.abs(toCol - fromCol);
        return Math.pow(distance, 2) * 50;
    }

    /**
     * Start navigation to a target sector
     * @param {string} targetSector - Target sector coordinate
     * @returns {boolean} True if navigation started successfully
     */
    startNavigation(targetSector) {
        debug('NAVIGATION', `Starting navigation sequence: from=${this.currentSector}, to=${targetSector}`);

        if (this.isNavigating) {
            debug('P1', 'Navigation already in progress');
            this.feedback.showWarning(
                'Navigation in Progress',
                'Cannot start new navigation while already navigating.',
                () => this.feedback.hideAll()
            );
            return false;
        }

        if (targetSector === this.currentSector) {
            debug('P1', `Attempted to navigate to current sector: ${targetSector}`);
            this.feedback.showWarning(
                'Invalid Destination',
                'Cannot navigate to current sector.',
                () => this.feedback.hideAll()
            );
            return false;
        }

        const requiredEnergy = this.calculateRequiredEnergy(this.currentSector, targetSector);
        debug('NAVIGATION', `Energy check: required=${requiredEnergy}, available=${this.viewManager.getShipEnergy()}`);

        if (requiredEnergy > this.viewManager.getShipEnergy()) {
            debug('P1', `Insufficient energy for navigation: required=${requiredEnergy}, available=${this.viewManager.getShipEnergy()}`);
            this.feedback.showWarning(
                'Insufficient Energy',
                `Navigation to ${targetSector} requires ${requiredEnergy} energy units.`,
                () => this.feedback.hideAll()
            );
            return false;
        }

debug('NAVIGATION', 'Energy check passed, proceeding with navigation');

        // Clear target computer and old system after energy check but before warp
        if (this.viewManager.starfieldManager) {
debug('TARGETING', 'Clearing target computer');
            this.viewManager.starfieldManager.clearTargetComputer();
            
            // CRITICAL FIX: Also deactivate proximity radar and reset star charts during warp
            if (this.viewManager.starfieldManager.proximityDetector3D && this.viewManager.starfieldManager.proximityDetector3D.isVisible) {
                debug('UTILITY', '🚀 Warp start: Deactivating proximity radar');
                this.viewManager.starfieldManager.proximityDetector3D.toggle();
            }
            
            // Update star charts to target sector (will be finalized on warp completion)
            if (this.viewManager.starfieldManager.starChartsManager) {
                debug('UTILITY', `🚀 Warp start: Preparing Star Charts for sector transition to ${targetSector}`);
                // Don't update currentSector yet - that happens on completion
            }
        }
        
        // Clear the old system now that we know we have enough energy
        if (this.viewManager.solarSystemManager) {
            debug('NAVIGATION', `Clearing old star system: sector=${this.currentSector}`);
            this.viewManager.solarSystemManager.clearSystem();
        }

        this.targetSector = targetSector;
        this.isNavigating = true;
        this.navigationProgress = 0;
        this.startTime = Date.now();
        
        // Store start position and calculate target position
        this.startPosition.copy(this.camera.position);
        this.targetPosition = this.calculatePositionFromSector(targetSector);
        
        debug('NAVIGATION', `Navigation parameters set: startPosition=${this.startPosition.toArray()}, targetPosition=${this.targetPosition.toArray()}`);
        
        // Activate warp drive
        if (!this.warpDrive.activate()) {
debug('P1', 'Failed to activate warp drive');
            this.isNavigating = false;
            return false;
        }

        // Change view to FORE when entering warp
        if (this.viewManager && this.viewManager.starfieldManager) {
            this.viewManager.starfieldManager.setView('FORE');
        }

debug('NAVIGATION', 'Warp drive activated, starting navigation');
        // Show initial progress
        this.feedback.showAll();
        this.feedback.updateProgress(0, 'Warp Navigation');
        return true;
    }

    /**
     * Update navigation state
     * @param {number} deltaTime - Time elapsed since last update in milliseconds
     */
    update(deltaTime) {
        if (!this.isNavigating) return;

        const elapsedTime = Date.now() - this.startTime;
        this.navigationProgress = Math.min(1, elapsedTime / this.warpDuration);

        // Check for arrival point
        if (elapsedTime >= this.arrivalTime && !this._hasArrived) {
            this._hasArrived = true;
            // Update sector and position at arrival
            this.currentSector = this.targetSector;
            this.camera.position.copy(this.targetPosition);
            
            // Update the ship's location in the galactic chart
            const row = this.currentSector.charCodeAt(0) - 65;
            const col = parseInt(this.currentSector[1]);
            const systemIndex = row * 9 + col;
            
            if (this.viewManager && this.viewManager.galacticChart) {
                this.viewManager.galacticChart.setShipLocation(systemIndex);
            }
        }

        if (this.navigationProgress >= 1) {
            this.completeNavigation();
            return;
        }

        // Use different progress calculations before and after arrival
        let progress;
        if (elapsedTime < this.arrivalTime) {
            // Accelerate to arrival point
            progress = Math.sin((elapsedTime / this.arrivalTime) * Math.PI / 2);
        } else {
            // Hold position after arrival
            progress = 1;
        }

        // Set warp factor based on progress
        const warpFactor = 1 + (this.warpDrive.maxWarpFactor - 1) * progress;
        this.warpDrive.setWarpFactor(warpFactor);

        // Update position if we haven't arrived yet
        if (!this._hasArrived) {
            this.camera.position.lerpVectors(
                this.startPosition,
                this.targetPosition,
                progress
            );
        }

        // Update feedback with progress percentage
        const progressPercentage = Math.round(this.navigationProgress * 100);
        this.feedback.updateProgress(
            progressPercentage,
            'Warp Navigation'
        );
    }

    /**
     * Complete the navigation sequence
     */
    completeNavigation() {
        debug('UTILITY', 'Completing navigation sequence:', {
            oldSector: this.currentSector,
            newSector: this.targetSector,
            timestamp: new Date().toISOString()
        });

        // Assert critical dependencies exist - fail fast if not
        if (!this.viewManager) {
            throw new Error('ViewManager is null - cannot complete navigation');
        }
        if (!this.viewManager.starfieldManager) {
            throw new Error('StarfieldManager is null - cannot complete navigation');
        }
        if (!this.viewManager.solarSystemManager) {
            throw new Error('SolarSystemManager is null - cannot complete navigation');
        }
        
        debug('UTILITY', `🚀 SectorNavigation: Force resetting navigation systems for sector ${this.currentSector}`);
        
        const starfieldManager = this.viewManager.starfieldManager;
        const solarSystemManager = this.viewManager.solarSystemManager;
        
        // CRITICAL FIX: Update SolarSystemManager sector FIRST to prevent race condition
        debug('UTILITY', `🚀 SectorNavigation: Updating SolarSystemManager sector from ${solarSystemManager.currentSector} to ${this.currentSector}`);
        solarSystemManager.setCurrentSector(this.currentSector);
        
        // Force reset target computer (ALWAYS reset, regardless of enabled state)
        debug('TARGETING', `🎯 SectorNavigation: Resetting target computer for sector ${this.currentSector} (enabled: ${starfieldManager.targetComputerEnabled})`);
        starfieldManager.currentTarget = null;
        starfieldManager.targetIndex = -1;
        
        // CRITICAL: Clear the old target list to remove old sector objects
        debug('TARGETING', `🔍 BEFORE CLEARING: StarfieldManager has ${starfieldManager.targetObjects?.length || 0} targets`);
        if (starfieldManager.targetObjects?.length > 0) {
            debug('TARGETING', `Clearing ${starfieldManager.targetObjects.length} old targets from StarfieldManager`);
        }
        
        // Clear all target arrays immediately
        starfieldManager.targetObjects = [];
        
        if (!starfieldManager.targetComputerManager) {
            throw new Error('TargetComputerManager is null - cannot clear targets');
        }
        
        const tcm = starfieldManager.targetComputerManager;
        if (tcm.targetObjects?.length > 0) {
            debug('TARGETING', `Clearing ${tcm.targetObjects.length} old targets from TargetComputerManager`);
        }
        
        // CRITICAL: NUCLEAR CACHE CLEARING - ZERO TOLERANCE FOR STALE DATA
        debug('TARGETING', `🧹 NUCLEAR CACHE CLEAR: Obliterating ALL target-related data structures`);
        
        // 1. Clear ALL target arrays immediately (already done above, but ensure it's complete)
        tcm.targetObjects = [];
        starfieldManager.targetObjects = [];
        
        // 2. Clear ALL target selection state
        tcm.currentTarget = null;
        tcm.targetIndex = -1;
        starfieldManager.currentTarget = null;
        starfieldManager.targetIndex = -1;
        tcm.hideTargetHUD();
        tcm.hideTargetReticle();
        
        // 3. NUCLEAR CLEAR: All target caches
        if (tcm.knownTargets) {
            const oldKnownSize = tcm.knownTargets.size;
            tcm.knownTargets.clear();
            debug('TARGETING', `🧹 NUCLEAR: Cleared ${oldKnownSize} knownTargets entries`);
        }
        
        // 4. NUCLEAR CLEAR: All StarfieldManager cached target references
        if (starfieldManager.validTargets) {
            starfieldManager.validTargets = [];
            debug('TARGETING', `🧹 NUCLEAR: Cleared StarfieldManager validTargets`);
        }
        
        if (starfieldManager.previousTarget) {
            starfieldManager.previousTarget = null;
            debug('TARGETING', `🧹 NUCLEAR: Cleared StarfieldManager previousTarget`);
        }
        
        if (starfieldManager.targetedObject) {
            starfieldManager.targetedObject = null;
            debug('TARGETING', `🧹 NUCLEAR: Cleared StarfieldManager targetedObject`);
        }
        
        // 5. NUCLEAR CLEAR: All TargetComputerManager cached references
        if (tcm.validTargets) {
            tcm.validTargets = [];
            debug('TARGETING', `🧹 NUCLEAR: Cleared TCM validTargets`);
        }
        
        if (tcm.previousTarget) {
            tcm.previousTarget = null;
            debug('TARGETING', `🧹 NUCLEAR: Cleared TCM previousTarget`);
        }
        
        if (tcm.targetedObject) {
            tcm.targetedObject = null;
            debug('TARGETING', `🧹 NUCLEAR: Cleared TCM targetedObject`);
        }
        
        if (tcm.lastTargetedObjectId) {
            tcm.lastTargetedObjectId = null;
            debug('TARGETING', `🧹 NUCLEAR: Cleared TCM lastTargetedObjectId`);
        }
        
        // 6. NUCLEAR CLEAR: StarCharts integration caches (enhanced clearing)
        if (this.viewManager.navigationSystemManager?.starChartsIntegration) {
            const integration = this.viewManager.navigationSystemManager.starChartsIntegration;
            
            if (integration.enhancedTargets) {
                const oldEnhancedSize = integration.enhancedTargets.size;
                integration.enhancedTargets.clear();
                debug('TARGETING', `🧹 NUCLEAR: Cleared ${oldEnhancedSize} enhancedTargets entries`);
            }
            
            // Clear any other potential caches in the integration
            if (integration.targetCache) {
                integration.targetCache.clear();
                debug('TARGETING', `🧹 NUCLEAR: Cleared integration targetCache`);
            }
            
            if (integration.objectCache) {
                integration.objectCache.clear();
                debug('TARGETING', `🧹 NUCLEAR: Cleared integration objectCache`);
            }
        }
        
        debug('TARGETING', `🧹 NUCLEAR CACHE CLEAR COMPLETE: All target data structures obliterated`);
        
        // CRITICAL: Pause StarChartsTargetComputerIntegration sync during transition
        if (this.viewManager.navigationSystemManager?.starChartsIntegration) {
            debug('UTILITY', 'Pausing StarCharts integration sync during sector transition');
            this.viewManager.navigationSystemManager.starChartsIntegration.pauseSync = true;
            
            // CRITICAL: Clear the enhanced targets cache to prevent old sector contamination
            if (this.viewManager.navigationSystemManager.starChartsIntegration.enhancedTargets) {
                const oldCacheSize = this.viewManager.navigationSystemManager.starChartsIntegration.enhancedTargets.size;
                this.viewManager.navigationSystemManager.starChartsIntegration.enhancedTargets.clear();
                debug('TARGETING', `Cleared StarCharts enhanced targets cache (had ${oldCacheSize} cached targets)`);
            }
        } else {
            debug('P1', 'CRITICAL: StarCharts integration not found - old sector targets may persist');
        }
        
        // Clear any existing wireframe
        if (starfieldManager.targetWireframe) {
            starfieldManager.wireframeScene.remove(starfieldManager.targetWireframe);
            starfieldManager.targetWireframe.geometry.dispose();
            starfieldManager.targetWireframe.material.dispose();
            starfieldManager.targetWireframe = null;
        }

        // CRITICAL FIX: Clear StarCharts discovery data from old sector
        if (starfieldManager.starChartsManager) {
            debug('UTILITY', `🗺️ Updating Star Charts sector from ${starfieldManager.starChartsManager.currentSector} to ${this.currentSector}`);
            
            // Clear discovered objects from other sectors
            const discoveredObjects = starfieldManager.starChartsManager.getDiscoveredObjects();
            const oldSectorObjects = discoveredObjects.filter(id => !id.startsWith(this.currentSector + '_'));
            
            if (oldSectorObjects.length > 0) {
                debug('UTILITY', `🧹 Clearing ${oldSectorObjects.length} discovered objects from other sectors`);
                oldSectorObjects.forEach(objectId => {
                    starfieldManager.starChartsManager.discoveredObjects.delete(objectId);
                    starfieldManager.starChartsManager.discoveryMetadata.delete(objectId);
                    debug('UTILITY', `🗑️ Removed discovered object: ${objectId}`);
                });
            }
            
            starfieldManager.starChartsManager.currentSector = this.currentSector;
            
            // CRITICAL FIX: Force immediate spatial grid refresh to prevent discovery contamination
            // The spatial grid must be refreshed IMMEDIATELY after sector change to prevent
            // the discovery system from finding objects from the old sector
            debug('UTILITY', '🗺️ CRITICAL: Force refreshing StarCharts spatial grid to prevent discovery contamination');
            starfieldManager.starChartsManager.refreshSpatialGrid();
        }
        
        // Target list update will be handled by WarpDriveManager.handleWarpEnd() 
        // after system generation completes to prevent race conditions
        debug('UTILITY', 'Target list update deferred to WarpDriveManager.handleWarpEnd() to prevent race conditions');
        
        // Shutdown ship systems for clean sector transition
        debug('UTILITY', 'Shutting down ship systems for sector transition');
        if (starfieldManager.shutdownAllSystems && typeof starfieldManager.shutdownAllSystems === 'function') {
            starfieldManager.shutdownAllSystems();
        } else {
            // Fallback: manual engine shutdown
            if (starfieldManager.ship) {
                const impulseEngines = starfieldManager.ship.getSystem('impulse_engines');
                if (impulseEngines) {
                    impulseEngines.setImpulseSpeed(0);
                    impulseEngines.setMovingForward(false);
                    impulseEngines.isActive = false;
                }
            }
        }
        
        // Reset movement state
        starfieldManager.targetSpeed = 0;
        starfieldManager.currentSpeed = 0;
        starfieldManager.isMoving = false;
        starfieldManager.isAccelerating = false;

        this.targetSector = null;
        this._hasArrived = false;
        
        // Hide feedback elements before deactivating warp
        this.feedback.hideAll();
        
        // Deactivate warp drive
debug('UTILITY', 'Deactivating warp drive');
        this.warpDrive.deactivate();
        
        // Position ship near the system star for proper targeting range
        this.positionShipNearStar();
        
        // Only set isNavigating to false after warp drive is deactivated
        this.isNavigating = false;
    }

    /**
     * Position ship near the system star after warp for proper targeting range
     */
    positionShipNearStar() {
        if (!this.viewManager?.starfieldManager?.solarSystemManager) return;
        
        const solarSystemManager = this.viewManager.starfieldManager.solarSystemManager;
        const celestialBodies = solarSystemManager.getCelestialBodies();
        
        // Find the system star
        let systemStar = null;
        for (const [key, body] of celestialBodies.entries()) {
            if (key === 'star' || key.includes('star')) {
                systemStar = body;
                break;
            }
        }
        
        if (systemStar && systemStar.position) {
            // Position ship 100km from the star (within 150km targeting range)
            const starPosition = systemStar.position;
            debug('UTILITY', `System star found at (${starPosition.x.toFixed(1)}, ${starPosition.y.toFixed(1)}, ${starPosition.z.toFixed(1)})`);
            
            // Calculate direction vector from star to ship (normalized)
            const direction = {
                x: 1, // Simple offset in X direction
                y: 0,
                z: 0
            };
            
            // Position ship 50km from star (well within 150km targeting range)
            const offsetDistance = 50; // km - reduced for better targeting
            const newPosition = {
                x: starPosition.x + (direction.x * offsetDistance),
                y: starPosition.y + (direction.y * offsetDistance),
                z: starPosition.z + (direction.z * offsetDistance)
            };
            
            debug('UTILITY', `Positioning ship ${offsetDistance}km from system star at (${newPosition.x.toFixed(1)}, ${newPosition.y.toFixed(1)}, ${newPosition.z.toFixed(1)})`);
            
            // Update camera position
            this.camera.position.set(newPosition.x, newPosition.y, newPosition.z);
            
            // Update ship position if available
            if (this.viewManager.starfieldManager.ship) {
                this.viewManager.starfieldManager.ship.position.set(newPosition.x, newPosition.y, newPosition.z);
            }
            
            // Verify distance calculation
            const actualDistance = Math.sqrt(
                Math.pow(newPosition.x - starPosition.x, 2) +
                Math.pow(newPosition.y - starPosition.y, 2) +
                Math.pow(newPosition.z - starPosition.z, 2)
            );
            debug('UTILITY', `Calculated distance to star: ${actualDistance.toFixed(1)}km`);
        } else {
            debug('UTILITY', 'Could not find system star for positioning');
        }
    }

    /**
     * Get current navigation status
     * @returns {Object} Navigation status
     */
    getStatus() {
        return {
            currentSector: this.currentSector,
            targetSector: this.targetSector,
            isNavigating: this.isNavigating,
            navigationProgress: this.navigationProgress
        };
    }
}

export default SectorNavigation; 