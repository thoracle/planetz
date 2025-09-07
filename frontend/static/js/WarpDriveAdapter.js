import { debug } from './debug.js';

/**
 * WarpDriveAdapter - Maintains compatibility with existing WarpDriveManager
 * while using the new Ship's WarpDrive system internally
 * 
 * This adapter allows the existing code to continue working while the
 * WarpDrive system is now properly integrated with the Ship architecture
 */
import WarpFeedback from './WarpFeedback.js';

export default class WarpDriveAdapter {
    constructor(viewManager) {
        this.viewManager = viewManager;
        this.ship = null; // Will be set when ship is available
        this.warpDriveSystem = null; // Reference to the ship's warp drive system
        
        // Initialize feedback system (same as original)
        this.feedback = new WarpFeedback();
        
        // External dependencies
        this.sectorNavigation = null;
        
debug('UTILITY', 'WarpDriveAdapter initialized - will connect to Ship\'s WarpDrive system');
    }
    
    /**
     * Connect to the ship's warp drive system
     * @param {Ship} ship - Ship instance
     */
    connectToShip(ship) {
        this.ship = ship;
        this.warpDriveSystem = ship.getWarpDrive();
        
        if (this.warpDriveSystem) {
            // Set up dependencies and callbacks for the warp drive system
            this.warpDriveSystem.setDependencies(this.sectorNavigation, this.feedback);
            this.warpDriveSystem.setCallbacks(
                this.onWarpStart?.bind(this),
                this.onWarpEnd?.bind(this),
                this.onEnergyUpdate?.bind(this)
            );
            
debug('UTILITY', 'WarpDriveAdapter connected to Ship\'s WarpDrive system');
        } else {
            console.warn('Ship does not have a warp drive system installed');
        }
    }
    
    /**
     * Set sector navigation (maintains compatibility)
     * @param {Object} sectorNavigation - SectorNavigation instance
     */
    setSectorNavigation(sectorNavigation) {
        this.sectorNavigation = sectorNavigation;
        
        // Update the warp drive system if connected
        if (this.warpDriveSystem) {
            this.warpDriveSystem.setDependencies(this.sectorNavigation, this.feedback);
        }
    }
    
    /**
     * Activate the warp drive (maintains compatibility)
     * @returns {boolean} True if activation was successful
     */
    activate() {
        if (!this.warpDriveSystem || !this.ship) {
            console.error('WarpDriveAdapter: No warp drive system or ship available');
            return false;
        }
        
        return this.warpDriveSystem.activateWarp(this.ship);
    }
    
    /**
     * Deactivate the warp drive (maintains compatibility)
     */
    deactivate() {
        if (this.warpDriveSystem) {
            this.warpDriveSystem.deactivateWarp();
        }
    }
    
    /**
     * Set the warp factor (maintains compatibility)
     * @param {number} factor - The desired warp factor
     * @returns {boolean} True if the warp factor was set successfully
     */
    setWarpFactor(factor) {
        if (this.warpDriveSystem) {
            return this.warpDriveSystem.setWarpFactor(factor);
        }
        return false;
    }
    
    /**
     * Update the warp drive state (maintains compatibility)
     * @param {number} deltaTime - Time elapsed since last update in milliseconds
     */
    update(deltaTime) {
        // The ship's update method will handle updating all systems including warp drive
        // This method is kept for compatibility but doesn't need to do anything
        if (this.ship) {
            this.ship.update(deltaTime);
        }
    }
    
    /**
     * Get the current status (maintains compatibility)
     * @returns {Object} Status object containing current state
     */
    getStatus() {
        if (this.warpDriveSystem) {
            const systemStatus = this.warpDriveSystem.getStatus();
            
            // Convert to the format expected by existing code
            return {
                isActive: systemStatus.isWarping,
                warpFactor: systemStatus.warpFactor,
                energyLevel: this.ship ? this.ship.currentEnergy : 0,
                cooldownTime: systemStatus.cooldownTime
            };
        }
        
        // Fallback status if no warp drive system
        return {
            isActive: false,
            warpFactor: 1.0,
            energyLevel: this.viewManager.getShipEnergy(),
            cooldownTime: 0
        };
    }
    
    /**
     * Calculate the current speed (maintains compatibility)
     * @returns {number} Current speed in units per second
     */
    getCurrentSpeed() {
        if (this.warpDriveSystem) {
            return this.warpDriveSystem.getCurrentSpeed();
        }
        return 0;
    }
    
    /**
     * Add energy to the warp drive (maintains compatibility)
     * @param {number} amount - Amount of energy to add
     */
    addEnergy(amount) {
        if (this.ship) {
            this.ship.currentEnergy = Math.min(this.ship.maxEnergy, this.ship.currentEnergy + amount);
            this.feedback.updateEnergyIndicator(this.ship.currentEnergy, this.ship.maxEnergy);
            
            if (this.onEnergyUpdate) {
                this.onEnergyUpdate(this.ship.currentEnergy);
            }
        }
    }
    
    /**
     * Get the underlying warp drive system for advanced operations
     * @returns {WarpDrive|null} The ship's warp drive system
     */
    getWarpDriveSystem() {
        return this.warpDriveSystem;
    }
    
    /**
     * Check if the adapter is properly connected
     * @returns {boolean} True if connected to ship and warp drive system
     */
    isConnected() {
        return this.ship !== null && this.warpDriveSystem !== null;
    }
    
    // Event handlers (maintain compatibility with existing callbacks)
    onWarpStart = null;
    onWarpEnd = null;
    onEnergyUpdate = null;
} 