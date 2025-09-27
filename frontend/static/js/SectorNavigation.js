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
        console.log('Starting navigation sequence:', {
            from: this.currentSector,
            to: targetSector,
            isNavigating: this.isNavigating
        });

        if (this.isNavigating) {
            console.warn('Navigation already in progress');
            this.feedback.showWarning(
                'Navigation in Progress',
                'Cannot start new navigation while already navigating.',
                () => this.feedback.hideAll()
            );
            return false;
        }

        if (targetSector === this.currentSector) {
            console.warn('Attempted to navigate to current sector:', targetSector);
            this.feedback.showWarning(
                'Invalid Destination',
                'Cannot navigate to current sector.',
                () => this.feedback.hideAll()
            );
            return false;
        }

        const requiredEnergy = this.calculateRequiredEnergy(this.currentSector, targetSector);
        console.log('Energy check:', {
            required: requiredEnergy,
            available: this.viewManager.getShipEnergy()
        });

        if (requiredEnergy > this.viewManager.getShipEnergy()) {
            console.warn('Insufficient energy for navigation:', {
                required: requiredEnergy,
                available: this.viewManager.getShipEnergy()
            });
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
            console.log('Clearing old star system:', {
                sector: this.currentSector,
                timestamp: new Date().toISOString()
            });
            this.viewManager.solarSystemManager.clearSystem();
        }

        this.targetSector = targetSector;
        this.isNavigating = true;
        this.navigationProgress = 0;
        this.startTime = Date.now();
        
        // Store start position and calculate target position
        this.startPosition.copy(this.camera.position);
        this.targetPosition = this.calculatePositionFromSector(targetSector);
        
        console.log('Navigation parameters set:', {
            startPosition: this.startPosition.toArray(),
            targetPosition: this.targetPosition.toArray(),
            startTime: this.startTime
        });
        
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
        console.log('Completing navigation sequence:', {
            oldSector: this.currentSector,
            newSector: this.targetSector,
            timestamp: new Date().toISOString()
        });

        // CRITICAL FIX: Force reset all navigation systems after warp completion
        console.log(`🚀 SectorNavigation: completeNavigation() called for sector ${this.currentSector}`);
        console.log(`🔍 SectorNavigation: viewManager available: ${!!this.viewManager}`);
        console.log(`🔍 SectorNavigation: viewManager.starfieldManager available: ${!!this.viewManager?.starfieldManager}`);
        
        // CRITICAL FIX: Force reset navigation systems directly (bypass updateCurrentSector condition)
        if (this.viewManager?.starfieldManager) {
            console.log(`🚀 SectorNavigation: Force resetting navigation systems for sector ${this.currentSector}`);
            
            const starfieldManager = this.viewManager.starfieldManager;
            
            // Force reset target computer (ALWAYS reset, regardless of enabled state)
            console.log(`🎯 SectorNavigation: Resetting target computer for sector ${this.currentSector} (enabled: ${starfieldManager.targetComputerEnabled})`);
            starfieldManager.currentTarget = null;
            starfieldManager.targetIndex = -1;
            
            // CRITICAL: Clear the old target list to remove A0 objects
            starfieldManager.targetObjects = [];
            if (starfieldManager.targetComputerManager) {
                starfieldManager.targetComputerManager.targetObjects = [];
                starfieldManager.targetComputerManager.currentTarget = null;
                starfieldManager.targetComputerManager.targetIndex = -1;
                starfieldManager.targetComputerManager.hideTargetHUD();
                starfieldManager.targetComputerManager.hideTargetReticle();
            }
            
            // Clear any existing wireframe
            if (starfieldManager.targetWireframe) {
                starfieldManager.wireframeScene.remove(starfieldManager.targetWireframe);
                starfieldManager.targetWireframe.geometry.dispose();
                starfieldManager.targetWireframe.material.dispose();
                starfieldManager.targetWireframe = null;
            }
            
            // ALWAYS update target list for new sector (regardless of target computer state)
            setTimeout(() => {
                console.log(`🎯 SectorNavigation: Updating target list for sector ${this.currentSector}`);
                
                // Check SolarSystemManager state before updating target list
                if (starfieldManager.solarSystemManager) {
                    const currentSystemSector = starfieldManager.solarSystemManager.currentSector;
                    const celestialBodies = starfieldManager.solarSystemManager.getCelestialBodies();
                    console.log(`🌍 SectorNavigation: SolarSystemManager sector: ${currentSystemSector}, bodies: ${celestialBodies.size}`);
                    
                    // Debug: Check target computer range
                    const ship = starfieldManager.ship;
                    const targetComputer = ship?.getSystem('target_computer');
                    const maxTargetingRange = targetComputer?.range || 150;
                    console.log(`🎯 SectorNavigation: Target computer range: ${maxTargetingRange}km`);
                    
                    // Debug: Check first few celestial bodies and their distances
                    if (celestialBodies.size > 0) {
                        let bodyCount = 0;
                        for (const [key, body] of celestialBodies.entries()) {
                            if (bodyCount >= 3) break;
                            const info = starfieldManager.solarSystemManager.getCelestialBodyInfo(body);
                            const distance = body.position ? Math.sqrt(
                                Math.pow(body.position.x - starfieldManager.camera.position.x, 2) +
                                Math.pow(body.position.y - starfieldManager.camera.position.y, 2) +
                                Math.pow(body.position.z - starfieldManager.camera.position.z, 2)
                            ) : 'unknown';
                            console.log(`🌍 SectorNavigation: Body ${key}: ${info?.name || 'unknown'} at ${distance}km (range: ${maxTargetingRange}km)`);
                            bodyCount++;
                        }
                    }
                    
                    // If SolarSystemManager is still on wrong sector, force regenerate
                    if (currentSystemSector !== this.currentSector) {
                        console.log(`🚨 SectorNavigation: SolarSystemManager sector mismatch! Expected: ${this.currentSector}, Got: ${currentSystemSector}`);
                        console.log(`🔄 SectorNavigation: Force regenerating star system for ${this.currentSector}`);
                        starfieldManager.solarSystemManager.setCurrentSector(this.currentSector);
                        starfieldManager.solarSystemManager.generateStarSystem(this.currentSector);
                    }
                }
                
                if (starfieldManager.updateTargetList) {
                    console.log(`🎯 SectorNavigation: Calling updateTargetList() for sector ${this.currentSector}`);
                    starfieldManager.updateTargetList();
                }
                if (starfieldManager.cycleTarget) {
                    console.log(`🎯 SectorNavigation: Calling cycleTarget() for sector ${this.currentSector}`);
                    starfieldManager.cycleTarget();
                }
            }, 200); // Increased delay to allow system generation
            
            // Star Charts will now get fresh data automatically from solarSystemManager
            console.log(`🗺️ SectorNavigation: Star Charts will auto-update using fresh solarSystemManager data`);
            if (starfieldManager.starChartsManager) {
                console.log(`🗺️ SectorNavigation: Star Charts Manager exists - sector will update automatically`);
            }
            
            // Reuse comprehensive ship shutdown system from docking (includes engine audio shutdown)
            console.log(`🛑 SectorNavigation: Shutting down all ship systems for sector transition`);
            console.log(`🔍 SectorNavigation: shutdownAllSystems available: ${typeof starfieldManager.shutdownAllSystems}`);
            
            if (starfieldManager.shutdownAllSystems && typeof starfieldManager.shutdownAllSystems === 'function') {
                console.log(`🛑 SectorNavigation: Calling starfieldManager.shutdownAllSystems()`);
                starfieldManager.shutdownAllSystems();
                
                // Also manually stop engine audio if it's still running
                if (starfieldManager.audioManager && starfieldManager.audioManager.getEngineState() === 'running') {
                    console.log(`🔇 SectorNavigation: Manually stopping engine audio`);
                    starfieldManager.playEngineShutdown();
                }
            } else {
                console.warn(`❌ SectorNavigation: shutdownAllSystems not available (${typeof starfieldManager.shutdownAllSystems}), using comprehensive fallback`);
                
                // Comprehensive fallback: manual engine audio shutdown
                if (starfieldManager.audioManager && starfieldManager.audioManager.getEngineState() === 'running') {
                    console.log(`🔇 SectorNavigation: Fallback engine audio shutdown`);
                    starfieldManager.playEngineShutdown();
                }
                
                // Fallback: basic engine shutdown
                if (starfieldManager.ship) {
                    const impulseEngines = starfieldManager.ship.getSystem('impulse_engines');
                    if (impulseEngines) {
                        console.log(`🚀 SectorNavigation: Fallback impulse engine shutdown`);
                        impulseEngines.setImpulseSpeed(0);
                        impulseEngines.setMovingForward(false);
                        impulseEngines.isActive = false;
                    }
                }
            }
            
            // Reset movement-related properties in StarfieldManager
            starfieldManager.targetSpeed = 0;
            starfieldManager.currentSpeed = 0;
            starfieldManager.isMoving = false;
            starfieldManager.isAccelerating = false;
            
            console.log(`🛑 SectorNavigation: Ship systems shutdown complete for sector transition`);
        } else {
            console.log(`❌ SectorNavigation: Cannot access starfieldManager - viewManager: ${!!this.viewManager}, starfieldManager: ${!!this.viewManager?.starfieldManager}`);
            
            // Try alternative access paths
            if (this.viewManager) {
                console.log(`🔍 SectorNavigation: ViewManager properties: ${Object.keys(this.viewManager).join(', ')}`);
            }
        }

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
            const offsetDistance = 100; // km
            
            // Calculate offset position (slightly offset from star)
            const newPosition = {
                x: starPosition.x + offsetDistance,
                y: starPosition.y,
                z: starPosition.z
            };
            
            console.log(`🚀 SectorNavigation: Positioning ship 100km from system star at (${newPosition.x.toFixed(1)}, ${newPosition.y.toFixed(1)}, ${newPosition.z.toFixed(1)})`);
            
            // Update camera position
            this.camera.position.set(newPosition.x, newPosition.y, newPosition.z);
            
            // Update ship position if available
            if (this.viewManager.starfieldManager.ship) {
                this.viewManager.starfieldManager.ship.position.set(newPosition.x, newPosition.y, newPosition.z);
            }
        } else {
            console.warn(`🚀 SectorNavigation: Could not find system star for positioning`);
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