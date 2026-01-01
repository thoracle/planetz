import * as THREE from 'three';
import WarpDrive from './WarpDrive.js';
import WarpEffects from './WarpEffects.js';
import SectorNavigation from './SectorNavigation.js';
import WarpFeedback from './WarpFeedback.js';
import { debug } from './debug.js';

class WarpDriveManager {
    constructor(scene, camera, viewManager) {
        // Store viewManager reference
        this.viewManager = viewManager;
        
        // Core components
        this.warpDrive = new WarpDrive(viewManager);
        this.warpEffects = new WarpEffects(scene);
        this.warpEffects.initialize(scene, camera);
        this.sectorNavigation = new SectorNavigation(scene, camera, this.warpDrive);
        
        // Set sector navigation reference in warp drive
        this.warpDrive.sectorNavigation = this.sectorNavigation;
        
        // Ship properties
        this.ship = new THREE.Object3D();
        this.ship.position.set(0, 0, 0);
        this.velocity = new THREE.Vector3(0, 0, 0);
        
        // Movement parameters
        this.maxSpeed = 1000;
        this.acceleration = 50;
        this.deceleration = 30;
        
        // Camera reference
        this.camera = camera;
        
        // Current system data
        this.currentSystem = null;
        
        // Initialize event handlers
        debug('P1', '🚀 WARP MANAGER: Binding warp drive events');
        this.warpDrive.onWarpStart = this.handleWarpStart.bind(this);
        this.warpDrive.onWarpEnd = this.handleWarpEnd.bind(this);
        this.warpDrive.onEnergyUpdate = this.handleEnergyUpdate.bind(this);
        debug('P1', '🚀 WARP MANAGER: Event binding complete - onWarpStart:', !!this.warpDrive.onWarpStart, 'onWarpEnd:', !!this.warpDrive.onWarpEnd);
    }

    /**
     * Update the warp drive and navigation state
     * @param {number} deltaTime - Time elapsed since last update in milliseconds
     */
    update(deltaTime) {
        // Update warp drive state
        this.warpDrive.update(deltaTime);
        
        // Update sector navigation
        this.sectorNavigation.update(deltaTime);
        
        // Update visual effects
        if (this.warpDrive.isActive) {
            // Get current warp factor for effects
            const warpFactor = this.warpDrive.warpFactor;
            
            // Update effects with current warp factor
            if (this.warpEffects) {
                this.warpEffects.update(deltaTime, warpFactor);
                
                // Track warp effect status (logging reduced)
            }
        }
    }

    /**
     * Handle warp drive activation
     * @param {number} warpFactor - Current warp factor
     */
    handleWarpStart(warpFactor) {
        // CRITICAL: IMMEDIATE EXECUTION TRACE
        debug('P1', '🚀 WARP START: handleWarpStart() CALLED - warpFactor:', warpFactor);
        
        // CRITICAL: IMMEDIATE NUCLEAR CACHE CLEARING - ZERO TOLERANCE FOR STALE DATA
        debug('TARGETING', '🧹 WARP START: Immediate nuclear cache clearing to prevent ANY stale data');
        this.nuclearCacheClear();
        
        // Show warp effects
        if (this.warpEffects && this.warpEffects.initialized) {
            this.warpEffects.showAll();
        } else {
            debug('P1', 'CRITICAL: Warp effects not initialized during warp start');
        }
    }
    
    /**
     * Nuclear cache clearing - obliterates ALL target-related caches immediately
     * Called at warp start to ensure ZERO stale data can survive
     */
    nuclearCacheClear() {
        // CRITICAL: IMMEDIATE EXECUTION TRACE
        debug('P1', '🧹 NUCLEAR: nuclearCacheClear() CALLED');
        
        const starfieldManager = this.viewManager?.starfieldManager;
        const targetComputerManager = starfieldManager?.targetComputerManager;
        const starChartsIntegration = this.viewManager?.navigationSystemManager?.starChartsIntegration;
        
        if (!starfieldManager || !targetComputerManager) {
            debug('TARGETING', '🧹 NUCLEAR: Cannot clear - managers not available');
            debug('P1', '🧹 NUCLEAR: FAILED - starfieldManager:', !!starfieldManager, 'targetComputerManager:', !!targetComputerManager);
            return;
        }
        
        debug('TARGETING', '🧹 NUCLEAR: Starting immediate cache obliteration at warp start');
        
        // 1. Clear ALL target arrays
        const oldTargets = targetComputerManager.targetObjects?.length || 0;
        const oldStarfieldTargets = starfieldManager.targetObjects?.length || 0;
        targetComputerManager.targetObjects = [];
        starfieldManager.targetObjects = [];
        debug('TARGETING', `🧹 NUCLEAR: Cleared ${oldTargets} TCM + ${oldStarfieldTargets} StarfieldManager targets`);
        
        // 2. Clear ALL caches
        if (targetComputerManager.knownTargets) {
            const oldKnown = targetComputerManager.knownTargets.size;
            targetComputerManager.knownTargets.clear();
            debug('TARGETING', `🧹 NUCLEAR: Cleared ${oldKnown} knownTargets`);
        }
        
        if (starChartsIntegration?.enhancedTargets) {
            const oldEnhanced = starChartsIntegration.enhancedTargets.size;
            starChartsIntegration.enhancedTargets.clear();
            debug('TARGETING', `🧹 NUCLEAR: Cleared ${oldEnhanced} enhancedTargets`);
        }
        
        // 3. Clear ALL target references
        targetComputerManager.currentTarget = null;
        targetComputerManager.targetIndex = -1;
        targetComputerManager.previousTarget = null;
        targetComputerManager.targetedObject = null;
        targetComputerManager.lastTargetedObjectId = null;
        
        starfieldManager.currentTarget = null;
        starfieldManager.targetIndex = -1;
        starfieldManager.previousTarget = null;
        starfieldManager.targetedObject = null;
        
        // 4. Clear valid targets arrays
        if (targetComputerManager.validTargets) {
            targetComputerManager.validTargets = [];
        }
        if (starfieldManager.validTargets) {
            starfieldManager.validTargets = [];
        }
        
        debug('TARGETING', '🧹 NUCLEAR: Immediate cache obliteration COMPLETE - NO stale data can survive warp');
    }

    /**
     * Handle warp drive deactivation
     */
    async handleWarpEnd() {
        // CRITICAL: IMMEDIATE EXECUTION TRACE
        debug('P1', '🚀 WARP END: handleWarpEnd() CALLED');
        
        this.isActive = false;
        
        // Hide warp effects
        if (this.warpEffects && this.warpEffects.initialized) {
            this.warpEffects.hideAll();
        }

        // Only proceed with system generation if we're in navigation mode
        if (this.sectorNavigation && this.sectorNavigation.isNavigating) {
            try {
                // Get current sector from navigation
                const currentSector = this.sectorNavigation.currentSector;
                debug('UTILITY', `🚀 Warp completion: Current sector from SectorNavigation: ${currentSector}`);
                
                if (!this.viewManager || !this.viewManager.solarSystemManager) {
                    throw new Error('SolarSystemManager not available');
                }
                
                // CRITICAL FIX: Update sector in SolarSystemManager first
                debug('UTILITY', `🚀 Warp completion: Setting SolarSystemManager sector to ${currentSector}`);
                this.viewManager.solarSystemManager.setCurrentSector(currentSector);
                debug('UTILITY', `🚀 Warp completion: SolarSystemManager sector is now ${this.viewManager.solarSystemManager.currentSector}`);
                
                // Generate new star system and wait for completion
                const generationSuccess = await this.viewManager.solarSystemManager.generateStarSystem(currentSector);
                
                if (!generationSuccess) {
                    debug('P1', 'CRITICAL: Failed to generate new star system for sector', currentSector);
                    throw new Error(`Star system generation failed for sector ${currentSector}`);
                }

                // CRITICAL FIX: Now that system generation is complete, update target lists
                if (this.viewManager.starfieldManager) {
                    // CRITICAL: EMERGENCY NUCLEAR CLEARING before target list update
                    debug('TARGETING', '🧹 EMERGENCY: Final nuclear cache clearing before target list update');
                    this.nuclearCacheClear();
                    
                    debug('UTILITY', `🚀 Warp completion: Updating navigation systems for sector ${currentSector}`);
                    
                    const starfieldManager = this.viewManager.starfieldManager;
                    
                    // Verify SolarSystemManager has the correct sector
                    if (this.viewManager.solarSystemManager.currentSector !== currentSector) {
                        throw new Error(`SolarSystemManager sector mismatch: expected ${currentSector}, got ${this.viewManager.solarSystemManager.currentSector}`);
                    }
                    
                    // Update target list now that new system is generated
                    debug('TARGETING', `🎯 Warp completion: Updating target list for new sector ${currentSector}`);
                    starfieldManager.updateTargetList();
                    
                    // CRITICAL: POST-UPDATE CONTAMINATION SCAN - Zero tolerance enforcement
                    debug('TARGETING', '🧹 POST-UPDATE: Scanning for contamination after target list update');
                    const targetComputerManager = starfieldManager.targetComputerManager;
                    if (targetComputerManager?.targetObjects) {
                        const contaminatedTargets = targetComputerManager.targetObjects.filter(target => 
                            target.id && typeof target.id === 'string' && !target.id.startsWith(currentSector + '_')
                        );
                        
                        if (contaminatedTargets.length > 0) {
                            debug('TARGETING', `🚨 CONTAMINATION DETECTED: ${contaminatedTargets.length} cross-sector targets found after update!`);
                            contaminatedTargets.forEach(target => {
                                debug('TARGETING', `🚨 CONTAMINATED: ${target.name} (ID: ${target.id})`);
                            });
                            
                            // NUCLEAR PURGE: Remove all contaminated targets immediately
                            targetComputerManager.targetObjects = targetComputerManager.targetObjects.filter(target => 
                                !target.id || typeof target.id !== 'string' || target.id.startsWith(currentSector + '_')
                            );
                            
                            // Also clear from StarfieldManager
                            starfieldManager.targetObjects = starfieldManager.targetObjects.filter(target => 
                                !target.id || typeof target.id !== 'string' || target.id.startsWith(currentSector + '_')
                            );
                            
                            debug('TARGETING', `🧹 PURGED: Removed ${contaminatedTargets.length} contaminated targets`);
                            debug('TARGETING', `🧹 CLEAN: Target list now has ${targetComputerManager.targetObjects.length} clean targets`);
                        } else {
                            debug('TARGETING', `✅ CLEAN: No contamination detected - ${targetComputerManager.targetObjects.length} targets all from sector ${currentSector}`);
                        }
                    }
                    
                    // Resume StarCharts integration sync now that sector is properly updated
                    if (this.viewManager.navigationSystemManager?.starChartsIntegration) {
                        debug('UTILITY', 'Resuming StarCharts integration sync after system generation');
                        this.viewManager.navigationSystemManager.starChartsIntegration.pauseSync = false;
                    }
                    
                    // Cycle to first target if target computer is enabled
                    if (starfieldManager.targetComputerEnabled) {
                        debug('TARGETING', '🎯 Warp completion: Cycling to first target');
                        starfieldManager.cycleTarget();
                    }
                }

                // Update galactic chart with new position
                if (this.viewManager.galacticChart) {
                    this.viewManager.galacticChart.setShipLocation(currentSector);
                }
                
                // Ensure we're in the correct view (FRONT or AFT)
                if (this.viewManager.currentView === 'galactic') {
    
                    this.viewManager.restorePreviousView();
                }
                
                // Get the stored target computer state
                const wasTargetComputerEnabled = this.sectorNavigation.wasTargetComputerEnabled;
                // Checking target computer state for restoration
                
                // Only enable target computer if it was enabled before warp
                if (wasTargetComputerEnabled && this.viewManager.starfieldManager) {
                    this.viewManager.starfieldManager.toggleTargetComputer();
                }

            } catch (error) {
                debug('P1', 'CRITICAL: Error in post-warp sequence:', error.message);
                throw error; // Fail fast - don't hide critical errors
            }
        }
    }

    /**
     * Handle energy level updates
     * @param {number} energyLevel - Current energy level
     */
    handleEnergyUpdate(energyLevel) {
        // Energy updates are handled by WarpFeedback, no need for additional logging
    }

    /**
     * Generate the current star system using the backend API
     */
    async generateCurrentSystem() {
        try {
            const sector = this.sectorNavigation.currentSector;
            const response = await fetch(`/api/generate_star_system?seed=${sector}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.currentSystem = await response.json();

        } catch (error) {
            debug('P1', `Error generating star system: ${error.message}`);
            // Handle error appropriately
        }
    }

    /**
     * Get current warp drive status
     * @returns {Object} Status object
     */
    getStatus() {
        return {
            warpDrive: this.warpDrive.getStatus(),
            navigation: this.sectorNavigation.getStatus(),
            currentSystem: this.currentSystem ? {
                sector: this.currentSystem.sector,
                starType: this.currentSystem.star_type,
                planetCount: this.currentSystem.planets.length
            } : null
        };
    }

    /**
     * Set warp factor
     * @param {number} factor - Desired warp factor
     * @returns {boolean} True if successful
     */
    setWarpFactor(factor) {
        return this.warpDrive.setWarpFactor(factor);
    }

    /**
     * Activate warp drive
     * @returns {boolean} True if successful
     */
    activateWarp() {
        return this.warpDrive.activate();
    }

    /**
     * Deactivate warp drive
     */
    deactivateWarp() {
        this.warpDrive.deactivate();
    }

    /**
     * Navigate to a target sector
     * @param {string} targetSector - Target sector coordinate
     * @returns {boolean} True if navigation started successfully
     */
    navigateToSector(targetSector) {
        // Store target computer state before clearing
        const wasTargetComputerEnabled = this.viewManager.starfieldManager?.targetComputerEnabled;
        debug('NAVIGATION', `Storing target computer state before warp: wasEnabled=${wasTargetComputerEnabled}, targetSector=${targetSector}`);

        // Clear target computer first
        if (this.viewManager.starfieldManager) {
            this.viewManager.starfieldManager.clearTargetComputer();
        }

        // Get destination system information
        const destinationSystem = this.viewManager.galacticChart.getStarSystemForSector(targetSector);
        if (!destinationSystem) {
            debug('P1', 'Failed to get destination system information');
            return false;
        }

        // Store the state in the sector navigation for use after warp
        this.sectorNavigation.wasTargetComputerEnabled = wasTargetComputerEnabled;

        // Pass destination system to warp effects
        if (this.warpEffects) {
            this.warpEffects.showAll(destinationSystem);
        }

        // Start navigation
        return this.sectorNavigation.startNavigation(targetSector);
    }

    /**
     * Get current sector
     * @returns {string} Current sector coordinate
     */
    getCurrentSector() {
        return this.sectorNavigation.currentSector;
    }

    /**
     * Calculate required energy for sector navigation
     * @param {string} targetSector - Target sector coordinate
     * @returns {number} Required energy
     */
    calculateRequiredEnergy(targetSector) {
        return this.sectorNavigation.calculateRequiredEnergy(
            this.sectorNavigation.currentSector,
            targetSector
        );
    }

    /**
     * Get current system information
     * @returns {Object} Current system data
     */
    getCurrentSystem() {
        return this.currentSystem;
    }

    /**
     * Hide all warp effects
     */
    hideAllWarpEffects() {
        this.warpEffects.hideAll();
    }
}

export default WarpDriveManager; 