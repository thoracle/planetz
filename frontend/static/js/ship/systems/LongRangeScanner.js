/**
 * Long Range Scanner System - Provides detailed space scanning capabilities
 * Based on docs/spaceships_spec.md and docs/tech_design.md
 * Energy consumption when scanning, damage affects range and clarity
 */

import System, { SYSTEM_STATES } from '../System.js';

export default class LongRangeScannerSystem extends System {
    constructor(level = 1, config = {}) {
        // Initialize base scanner properties BEFORE calling super()
        const baseScanRange = 1000; // Base scan range in space units
        const baseEnergyConsumptionRate = 10; // Energy per second when scanning
        const baseResolution = 100; // Base detail resolution percentage
        
        // Base configuration for long range scanner
        const baseConfig = {
            slotCost: 1,
            energyConsumptionRate: baseEnergyConsumptionRate,
            systemType: 'long_range_scanner',
            maxHealth: 100,
            ...config
        };
        
        super('Long Range Scanner', level, baseConfig);
        
        // Store base properties
        this.baseScanRange = baseScanRange;
        this.baseResolution = baseResolution;
        
        // Scanner state
        this.isScanning = false; // Whether scanner is actively scanning
        this.scanData = null; // Current scan data
        this.lastScanTime = 0; // When last scan was completed
        this.scanDuration = 2000; // Time for full scan (2 seconds)
        this.fogOfWarEnabled = false; // Whether fog of war is active due to damage
        
        // Override default active state - scanner is only active when scanning
        this.isActive = false;
        
        // Scanning performance metrics
        this.currentScanRange = baseScanRange;
        this.currentResolution = baseResolution;
        
        // Re-initialize level-specific values now that base properties are set
        this.levelStats = this.initializeLevelStats();
        this.updateLevelStats();
        
        console.log(`Long Range Scanner created (Level ${level}) - Range: ${this.getCurrentScanRange()}, Resolution: ${this.getCurrentResolution()}%`);
    }
    
    /**
     * Initialize level-specific stats for long range scanner
     * @returns {Object} Level stats configuration
     */
    initializeLevelStats() {
        const baseScanRange = this.baseScanRange;
        const baseEnergyConsumptionRate = this.energyConsumptionRate;
        const baseResolution = this.baseResolution;
        
        return {
            1: { 
                effectiveness: 1.0,
                scanRange: baseScanRange,
                energyConsumptionRate: baseEnergyConsumptionRate,
                resolution: baseResolution,
                scannerType: 'Basic Scanner'
            },
            2: { 
                effectiveness: 1.2,
                scanRange: baseScanRange * 1.3, // 30% more range
                energyConsumptionRate: baseEnergyConsumptionRate * 0.95, // 5% more efficient
                resolution: baseResolution * 1.1, // 10% better resolution
                scannerType: 'Enhanced Scanner'
            },
            3: { 
                effectiveness: 1.4,
                scanRange: baseScanRange * 1.6, // 60% more range
                energyConsumptionRate: baseEnergyConsumptionRate * 0.90, // 10% more efficient
                resolution: baseResolution * 1.2, // 20% better resolution
                scannerType: 'Advanced Scanner'
            },
            4: { 
                effectiveness: 1.6,
                scanRange: baseScanRange * 2.0, // 100% more range
                energyConsumptionRate: baseEnergyConsumptionRate * 0.85, // 15% more efficient
                resolution: baseResolution * 1.3, // 30% better resolution
                scannerType: 'Military Grade Scanner'
            },
            5: { 
                effectiveness: 1.8,
                scanRange: baseScanRange * 2.5, // 150% more range
                energyConsumptionRate: baseEnergyConsumptionRate * 0.80, // 20% more efficient
                resolution: baseResolution * 1.5, // 50% better resolution
                scannerType: 'Long Range Deep Space Scanner'
            }
        };
    }
    
    /**
     * Update scanner stats based on current level
     */
    updateLevelStats() {
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        
        // Update current performance based on level and health
        this.updateCurrentStats();
        
        console.log(`Long Range Scanner upgraded to Level ${this.level} - ${levelStats.scannerType}`);
    }
    
    /**
     * Update current scanner performance based on level and damage
     */
    updateCurrentStats() {
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        const effectiveness = this.getEffectiveness();
        
        // Calculate current performance
        this.currentScanRange = levelStats.scanRange * effectiveness;
        this.currentResolution = levelStats.resolution * effectiveness;
        
        // Enable fog of war if heavily damaged
        this.fogOfWarEnabled = effectiveness < 0.5; // Below 50% effectiveness
    }
    
    /**
     * Get current scan range based on level and system health
     * @returns {number} Current scan range
     */
    getCurrentScanRange() {
        if (!this.isOperational()) {
            return 0;
        }
        
        this.updateCurrentStats();
        return this.currentScanRange;
    }
    
    /**
     * Get current resolution based on level and system health
     * @returns {number} Current resolution percentage
     */
    getCurrentResolution() {
        if (!this.isOperational()) {
            return 0;
        }
        
        this.updateCurrentStats();
        return Math.min(100, this.currentResolution);
    }
    
    /**
     * Start scanning operation
     * @param {Ship} ship - Ship instance for energy consumption
     * @returns {boolean} True if scan started successfully
     */
    startScan(ship) {
        if (!this.isOperational()) {
            console.warn('Cannot scan: Long Range Scanner not operational');
            return false;
        }
        
        if (this.isScanning) {
            console.log('Scan already in progress');
            return true;
        }
        
        // Check energy availability for sustained scanning
        const energyRequired = this.getEnergyConsumptionRate();
        if (!ship.hasEnergy(energyRequired)) {
            console.warn('Cannot scan: Insufficient energy for scanner operation');
            return false;
        }
        
        this.isScanning = true;
        this.isActive = true; // Start consuming energy per second
        this.lastScanTime = Date.now();
        
        console.log(`Long Range Scanner activated - Range: ${this.getCurrentScanRange().toFixed(0)}, Resolution: ${this.getCurrentResolution().toFixed(1)}%`);
        return true;
    }
    
    /**
     * Stop scanning operation
     */
    stopScan() {
        this.isScanning = false;
        this.isActive = false; // Stop consuming energy per second
        console.log('Long Range Scanner deactivated');
    }
    
    /**
     * Check if scanner can be activated (operational and has energy)
     * @param {Ship} ship - Ship instance to check energy
     * @returns {boolean} True if scanner can be activated
     */
    canActivate(ship) {
        if (!this.isOperational()) {
            return false;
        }
        
        // Check if required cards are installed
        if (ship && !ship.hasSystemCardsSync('long_range_scanner')) {
            console.warn('Cannot activate Long Range Scanner: No scanner card installed');
            return false;
        }
        
        const energyRequired = this.getEnergyConsumptionRate();
        return ship.hasEnergy(energyRequired);
    }
    
    /**
     * Get scan data with damage-affected results
     * @param {Object} solarSystemData - Raw solar system data
     * @returns {Object} Processed scan data with damage effects
     */
    processScanData(solarSystemData) {
        if (!this.isOperational()) {
            return null;
        }
        
        const resolution = this.getCurrentResolution() / 100; // Convert to 0-1 scale
        const range = this.getCurrentScanRange();
        
        // Apply damage effects to scan data
        let processedData = { ...solarSystemData };
        
        // Reduce detail based on resolution
        if (resolution < 1.0) {
            // Hide some details if resolution is poor
            if (resolution < 0.8) {
                // Hide moon details
                if (processedData.planets) {
                    processedData.planets = processedData.planets.map(planet => ({
                        ...planet,
                        moons: planet.moons ? planet.moons.filter(() => Math.random() < resolution) : []
                    }));
                }
            }
            
            if (resolution < 0.6) {
                // Hide some planet details
                if (processedData.planets) {
                    processedData.planets = processedData.planets.filter(() => Math.random() < resolution);
                }
            }
        }
        
        // Apply fog of war if enabled
        if (this.fogOfWarEnabled) {
            processedData.fogOfWar = true;
            processedData.visibilityReduced = true;
        }
        
        return processedData;
    }
    
    /**
     * Handle system state effects specific to long range scanner
     * @param {string} newState The new system state
     */
    handleStateEffects(newState) {
        super.handleStateEffects(newState);
        
        switch (newState) {
            case SYSTEM_STATES.CRITICAL:
                // Critical scanner has fog of war and reduced range
                this.fogOfWarEnabled = true;
                console.log('Critical scanner damage - fog of war enabled, reduced scan clarity');
                break;
            case SYSTEM_STATES.DISABLED:
                // Disabled scanner cannot scan
                this.stopScan();
                console.log('Long Range Scanner disabled - no scanning capability!');
                break;
        }
        
        // Update current stats when state changes
        this.updateCurrentStats();
    }
    
    /**
     * Update scanner system (called each frame)
     * @param {number} deltaTime Time elapsed since last update in milliseconds
     * @param {Ship} ship Ship instance for energy consumption
     */
    update(deltaTime, ship) {
        // Call parent update for energy consumption
        super.update(deltaTime, ship);
        
        // If scanner is active but ship has insufficient energy, stop scanning
        if (this.isActive && !ship.hasEnergy(this.getEnergyConsumptionRate() * deltaTime / 1000)) {
            console.warn('Long Range Scanner deactivated due to insufficient energy');
            this.stopScan();
        }
    }
    
    /**
     * Upgrade system to next level
     * @returns {boolean} True if upgrade successful
     */
    upgrade() {
        const result = super.upgrade();
        if (result) {
            this.updateLevelStats();
        }
        return result;
    }
    
    /**
     * Get system status with scanner-specific information
     * @returns {Object} Extended status object
     */
    getStatus() {
        const baseStatus = super.getStatus();
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        
        return {
            ...baseStatus,
            isScanning: this.isScanning,
            currentScanRange: this.getCurrentScanRange(),
            currentResolution: this.getCurrentResolution(),
            fogOfWarEnabled: this.fogOfWarEnabled,
            canActivate: this.isOperational(),
            scannerType: levelStats.scannerType,
            energyConsumptionRate: this.getEnergyConsumptionRate(),
            lastScanTime: this.lastScanTime
        };
    }
    
    /**
     * Clean up scanner effects when system is destroyed
     */
    dispose() {
        this.stopScan();
        this.scanData = null;
    }
} 