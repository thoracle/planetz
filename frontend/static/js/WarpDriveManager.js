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
            this.warpEffects.update(deltaTime, this.warpDrive.warpFactor);
        }
    }

    /**
     * Handle warp drive activation
     * @param {number} warpFactor - Current warp factor
     */
    handleWarpStart(warpFactor) {
        console.log(`Warp drive activated at factor ${warpFactor}`);
        this.warpEffects.showAll();
    }

    /**
     * Handle warp drive deactivation
     */
    async handleWarpEnd() {
        console.log('Warp drive deactivated');
        this.isActive = false;
        this.hideAllWarpEffects();

        // Only proceed with system generation if we're in navigation mode
        if (this.sectorNavigation && this.sectorNavigation.isNavigating) {
            try {
                console.log('Starting post-warp sequence');
                
                // Get current sector from navigation
                const currentSector = this.sectorNavigation.currentSector;
                console.log('Generating new star system for sector:', currentSector);
                
                if (!this.viewManager || !this.viewManager.solarSystemManager) {
                    throw new Error('SolarSystemManager not available');
                }
                
                // Generate new star system and wait for completion
                const generationSuccess = await this.viewManager.solarSystemManager.generateStarSystem(currentSector);
                
                if (!generationSuccess) {
                    console.error('Failed to generate new star system');
                    return;
                }
                
                console.log('New star system generated successfully');
                
                // Update galactic chart with new position
                if (this.viewManager.galacticChart) {
                    console.log('Updating galactic chart with new position:', currentSector);
                    this.viewManager.galacticChart.setShipLocation(currentSector);
                }
                
                // Ensure we're in the correct view (FRONT or AFT)
                if (this.viewManager.currentView === 'galactic') {
                    console.log('Restoring previous view after warp');
                    this.viewManager.restorePreviousView();
                }
                
                // Get the stored target computer state
                const wasTargetComputerEnabled = this.sectorNavigation.wasTargetComputerEnabled;
                console.log('Target computer state before warp:', {
                    wasEnabled: wasTargetComputerEnabled,
                    hasStarfieldManager: !!this.viewManager.starfieldManager,
                    currentSector: currentSector
                });
                
                // Only enable target computer if it was enabled before warp
                if (wasTargetComputerEnabled && this.viewManager.starfieldManager) {
                    console.log('Restoring target computer state after warp');
                    this.viewManager.starfieldManager.toggleTargetComputer();
                    console.log('Target computer state after restoration:', {
                        isEnabled: this.viewManager.starfieldManager.targetComputerEnabled,
                        targetCount: this.viewManager.starfieldManager.targetObjects?.length || 0,
                        currentTarget: this.viewManager.starfieldManager.currentTarget ? 'set' : 'none'
                    });
                } else {
                    console.log('Target computer state unchanged:', {
                        reason: !wasTargetComputerEnabled ? 'was not enabled before warp' : 'starfieldManager not available',
                        currentState: this.viewManager.starfieldManager?.targetComputerEnabled
                    });
                }
                
                console.log('Post-warp sequence completed successfully');
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
            console.log(`Generated star system in sector ${sector}:`, this.currentSystem);
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

        // Store the state in the sector navigation for use after warp
        this.sectorNavigation.wasTargetComputerEnabled = wasTargetComputerEnabled;

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

    hideAllWarpEffects() {
        this.warpEffects.hideAll();
    }
}

export default WarpDriveManager; 