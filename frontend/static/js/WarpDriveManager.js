import * as THREE from 'three';
import WarpDrive from './WarpDrive.js';
import WarpEffects from './WarpEffects.js';
import SectorNavigation from './SectorNavigation.js';
import WarpFeedback from './WarpFeedback.js';

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
        this.warpDrive.onWarpStart = this.handleWarpStart.bind(this);
        this.warpDrive.onWarpEnd = this.handleWarpEnd.bind(this);
        this.warpDrive.onEnergyUpdate = this.handleEnergyUpdate.bind(this);
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
        // Show warp effects
        if (this.warpEffects && this.warpEffects.initialized) {
            this.warpEffects.showAll();
        } else {
            console.warn('Warp effects not initialized');
        }
    }

    /**
     * Handle warp drive deactivation
     */
    async handleWarpEnd() {
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
                
                if (!this.viewManager || !this.viewManager.solarSystemManager) {
                    throw new Error('SolarSystemManager not available');
                }
                
                // CRITICAL FIX: Update sector in SolarSystemManager first
                this.viewManager.solarSystemManager.setCurrentSector(currentSector);
                
                // Generate new star system and wait for completion
                const generationSuccess = await this.viewManager.solarSystemManager.generateStarSystem(currentSector);
                
                if (!generationSuccess) {
                    console.error('Failed to generate new star system');
                    return;
                }

                // CRITICAL FIX: Trigger StarfieldManager sector update to reset all navigation systems
                if (this.viewManager.starfieldManager) {
                    debug('UTILITY', `🚀 Warp completion: Triggering StarfieldManager sector update for ${currentSector}`);
                    // Force update all navigation systems (target computer, proximity radar, star charts)
                    this.viewManager.starfieldManager.updateCurrentSector();
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
                console.error('Error in post-warp sequence:', error);
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
            console.error('Error generating star system:', error);
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
        console.log('Storing target computer state before warp:', {
            wasEnabled: wasTargetComputerEnabled,
            targetSector: targetSector
        });

        // Clear target computer first
        if (this.viewManager.starfieldManager) {
            this.viewManager.starfieldManager.clearTargetComputer();
        }

        // Get destination system information
        const destinationSystem = this.viewManager.galacticChart.getStarSystemForSector(targetSector);
        if (!destinationSystem) {
            console.error('Failed to get destination system information');
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