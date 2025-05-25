/**
 * Galactic Chart System - Provides galactic navigation and universe mapping
 * Based on docs/spaceships_spec.md and docs/tech_design.md
 * Energy consumption when active, damage affects accuracy and range
 */

import System, { SYSTEM_STATES } from '../System.js';

export default class GalacticChartSystem extends System {
    constructor(level = 1, config = {}) {
        // Initialize base chart properties BEFORE calling super()
        const baseDataRange = 100; // Base percentage of universe data accessible
        const baseEnergyConsumptionRate = 8; // Energy per second when chart is active
        const baseAccuracy = 100; // Base accuracy of displayed information (percentage)
        
        // Base configuration for galactic chart
        const baseConfig = {
            slotCost: 1,
            energyConsumptionRate: baseEnergyConsumptionRate,
            repairCost: 150,
            upgradeBaseCost: 300,
            ...config
        };

        super('Galactic Chart', level, baseConfig);

        // Store base values for level calculations
        this.baseDataRange = baseDataRange;
        this.baseEnergyConsumptionRate = baseEnergyConsumptionRate;
        this.baseAccuracy = baseAccuracy;
        
        // Chart state
        this.isChartActive = false;
        this.lastActivationTime = 0;
        this.activationCooldown = 1000; // 1 second cooldown between activations
        
        // Override default active state - chart is only active when HUD is open
        this.isActive = false;
        
        // Now levelStats should be properly initialized, so this should work
        console.log(`Galactic Chart System created (Level ${this.level}) - Data Range: ${this.getCurrentDataRange()}%, Accuracy: ${this.getCurrentAccuracy()}%`);
    }

    initializeLevelStats() {
        // Define level-specific stats for galactic chart
        // Use constants here since instance properties aren't available yet during super() call
        const baseDataRange = 100;
        const baseEnergyConsumptionRate = 8;
        const baseAccuracy = 100;
        
        const levelStats = {};
        
        for (let level = 1; level <= this.maxLevel; level++) {
            levelStats[level] = {
                effectiveness: 1.0, // All levels have full effectiveness - damage is handled separately
                dataRange: Math.floor(baseDataRange * (0.8 + 0.2 * (level / this.maxLevel))), // 80% to 100%
                energyConsumptionRate: baseEnergyConsumptionRate, // Fixed at 8 energy/sec for all levels
                accuracy: Math.floor(baseAccuracy * (0.85 + 0.15 * (level / this.maxLevel))), // 85% to 100%
                maxConcurrentConnections: level * 2, // 2 to 10 data streams
                refreshRate: Math.max(1, 6 - level) // 5 to 1 seconds between updates
            };
        }

        console.log(`Galactic Chart upgraded to Level ${this.level} - Enhanced Navigation System`);
        return levelStats;
    }

    // Energy consumption only when chart is active
    getEnergyConsumptionRate() {
        if (!this.isOperational() || !this.isActive || !this.isChartActive) {
            return 0;
        }
        
        // Safety check for initialization
        if (!this.levelStats || !this.levelStats[this.level]) {
            const baseConsumption = this.baseEnergyConsumptionRate;
            // Apply damage reduction - damaged systems are less efficient
            const damageMultiplier = this.getEffectiveness() < 1 ? 1.3 : 1.0;
            return baseConsumption * damageMultiplier;
        }
        
        const currentStats = this.levelStats[this.level];
        const baseConsumption = currentStats.energyConsumptionRate;
        
        // Apply damage reduction - damaged systems are less efficient
        const damageMultiplier = this.getEffectiveness() < 1 ? 1.3 : 1.0;
        
        return baseConsumption * damageMultiplier;
    }

    // Check if chart can be activated
    canActivate(ship) {
        if (!this.isOperational()) {
            return false;
        }
        
        // Check cooldown
        const currentTime = Date.now();
        if (currentTime - this.lastActivationTime < this.activationCooldown) {
            return false;
        }
        
        // Check energy for initial activation (requires 20 energy to start)
        if (!ship || ship.currentEnergy < 20) {
            return false;
        }
        
        return true;
    }

    // Activate galactic chart
    activateChart(ship) {
        if (!this.canActivate(ship)) {
            return false;
        }
        
        // Consume energy for activation
        ship.currentEnergy -= 20;
        this.isActive = true;
        this.isChartActive = true;
        this.lastActivationTime = Date.now();
        
        console.log(`Galactic Chart activated - Energy consumption: ${this.getEnergyConsumptionRate()}/sec`);
        return true;
    }

    // Deactivate galactic chart
    deactivateChart() {
        this.isActive = false;
        this.isChartActive = false;
        console.log('Galactic Chart deactivated');
    }

    // Get current data range affected by damage
    getCurrentDataRange() {
        // Safety check for initialization
        if (!this.levelStats || !this.levelStats[this.level]) {
            return Math.floor(this.baseDataRange * this.getEffectiveness());
        }
        
        const currentStats = this.levelStats[this.level];
        const baseRange = currentStats.dataRange;
        
        // Apply damage effects - damaged systems have reduced range
        return Math.floor(baseRange * this.getEffectiveness());
    }

    // Get current accuracy affected by damage
    getCurrentAccuracy() {
        // Safety check for initialization
        if (!this.levelStats || !this.levelStats[this.level]) {
            return Math.floor(this.baseAccuracy * this.getEffectiveness());
        }
        
        const currentStats = this.levelStats[this.level];
        const baseAccuracy = currentStats.accuracy;
        
        // Apply damage effects - damaged systems are less accurate
        return Math.floor(baseAccuracy * this.getEffectiveness());
    }

    // Process universe data based on system capabilities and damage
    processUniverseData(rawUniverseData) {
        if (!this.isOperational() || !rawUniverseData) {
            return null;
        }
        
        const dataRange = this.getCurrentDataRange();
        const accuracy = this.getCurrentAccuracy();
        
        // Limit data based on range
        const accessibleSystemsCount = Math.floor((rawUniverseData.length * dataRange) / 100);
        const limitedData = rawUniverseData.slice(0, accessibleSystemsCount);
        
        // Apply accuracy effects to the data
        return limitedData.map(system => {
            if (accuracy < 100) {
                // Introduce inaccuracies when damaged
                const modifiedSystem = { ...system };
                
                // Reduce accuracy of planet counts
                if (accuracy < 80 && system.planets) {
                    const inaccuracyFactor = accuracy / 100;
                    modifiedSystem.planets = system.planets.map(planet => ({
                        ...planet,
                        // Introduce small errors in size/position data
                        size: planet.size * (0.8 + 0.4 * inaccuracyFactor * Math.random()),
                        distance: planet.distance * (0.9 + 0.2 * inaccuracyFactor * Math.random())
                    }));
                }
                
                // Reduce accuracy of star data
                if (accuracy < 60) {
                    modifiedSystem.star_name = system.star_name + (Math.random() < 0.3 ? ' [?]' : '');
                }
                
                return modifiedSystem;
            }
            
            return system;
        });
    }

    // Get status including chart-specific information
    getStatus() {
        const baseStatus = super.getStatus();
        
        return {
            ...baseStatus,
            isChartActive: this.isChartActive,
            dataRange: this.getCurrentDataRange(),
            accuracy: this.getCurrentAccuracy(),
            canActivate: this.canActivate({ currentEnergy: 1000 }), // Test with high energy
            energyConsumptionRate: this.getEnergyConsumptionRate(),
            refreshRate: (this.levelStats && this.levelStats[this.level]) ? this.levelStats[this.level].refreshRate : 5
        };
    }

    // Handle system damage - chart becomes less reliable
    takeDamage(amount) {
        const wasDamaged = this.currentHealth < this.maxHealth;
        super.takeDamage(amount);
        
        // If chart becomes heavily damaged while active, deactivate it
        if (this.isChartActive && this.getEffectiveness() < 0.3) {
            console.warn('Galactic Chart system critically damaged - shutting down');
            this.deactivateChart();
        }
    }

    // Update method called each frame
    update(deltaTime, ship) {
        super.update(deltaTime);
        
        // Handle energy consumption when active
        if (this.isChartActive && ship) {
            const energyConsumption = this.getEnergyConsumptionRate() * deltaTime;
            ship.currentEnergy -= energyConsumption;
            
            // Auto-deactivate if energy runs out
            if (ship.currentEnergy <= 0) {
                console.warn('Insufficient energy - Galactic Chart shutting down');
                this.deactivateChart();
            }
        }
    }
} 