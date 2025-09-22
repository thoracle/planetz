import { debug } from '../../debug.js';

/**
 * RadarSystem - Ship radar system with card-based progression
 * 
 * Provides 3D radar capabilities based on installed radar cards:
 * - Basic Radar: 25km range, basic object detection
 * - Advanced Radar: 50km range, enhanced detection, IFF
 * - Tactical Radar: 75km range, threat assessment, formations
 */

import { getSystemDisplayName } from '../System.js';

export default class RadarSystem {
    constructor(level = 1) {
        this.level = level;
        this.systemType = 'radar';
        this.name = 'Proximity Detector';
        this.description = 'Provides 3D spatial awareness and proximity detection';

        // Health and operational status
        this.maxHealth = 100;
        this.currentHealth = this.maxHealth;
        this.healthPercentage = 1.0;
        this.slotCost = 1; // All systems cost 1 slot

        // Activation state
        this.isActive = false;
        
        // Radar specifications based on level
        this.updateSpecifications();
        
debug('UTILITY', `🎯 ProximityDetector Level ${this.level} created`);
    }
    
    /**
     * Update radar specifications based on level
     */
    updateSpecifications() {
        const specifications = this.getRadarSpecifications();
        
        this.range = specifications.range;
        this.updateFrequency = specifications.updateFrequency;
        this.trackingCapacity = specifications.trackingCapacity;
        this.energyConsumption = specifications.energyConsumption;
        this.hasIFF = specifications.hasIFF;
        this.hasThreatAssessment = specifications.hasThreatAssessment;
        this.hasFormationDetection = specifications.hasFormationDetection;
        
debug('UTILITY', `🎯 ProximityDetector Level ${this.level} specifications updated:`, specifications);
    }
    
    /**
     * Get radar specifications for current level
     */
    getRadarSpecifications() {
        const baseSpecs = {
            1: { // Basic Radar
                range: 25000,              // 25km range
                updateFrequency: 5,        // 5Hz updates
                trackingCapacity: 20,      // Track up to 20 objects
                energyConsumption: 8,      // 8 energy/sec
                hasIFF: false,             // No IFF capabilities
                hasThreatAssessment: false, // No threat assessment
                hasFormationDetection: false // No formation detection
            },
            2: { // Improved Basic Radar
                range: 35000,              // 35km range
                updateFrequency: 8,        // 8Hz updates
                trackingCapacity: 30,      // Track up to 30 objects
                energyConsumption: 10,     // 10 energy/sec
                hasIFF: true,              // Basic IFF
                hasThreatAssessment: false,
                hasFormationDetection: false
            },
            3: { // Advanced Radar
                range: 50000,              // 50km range
                updateFrequency: 10,       // 10Hz updates
                trackingCapacity: 50,      // Track up to 50 objects
                energyConsumption: 12,     // 12 energy/sec
                hasIFF: true,              // Enhanced IFF
                hasThreatAssessment: true, // Basic threat assessment
                hasFormationDetection: false
            },
            4: { // Enhanced Advanced Radar
                range: 65000,              // 65km range
                updateFrequency: 15,       // 15Hz updates
                trackingCapacity: 75,      // Track up to 75 objects
                energyConsumption: 15,     // 15 energy/sec
                hasIFF: true,
                hasThreatAssessment: true,
                hasFormationDetection: true  // Formation detection
            },
            5: { // Tactical Radar
                range: 75000,              // 75km range
                updateFrequency: 20,       // 20Hz updates
                trackingCapacity: 100,     // Track up to 100 objects
                energyConsumption: 18,     // 18 energy/sec
                hasIFF: true,
                hasThreatAssessment: true,
                hasFormationDetection: true
            }
        };
        
        return baseSpecs[Math.min(this.level, 5)] || baseSpecs[1];
    }
    
    /**
     * Check if radar can be activated
     */
    canActivate(ship) {
        if (!this.isOperational()) {
            return false;
        }

        // Check if ship is available
        if (!ship) {
            return false;
        }

        // Check if ship has radar cards installed
        if (!ship.hasSystemCardsSync('radar')) {
            return false;
        }

        // Check energy requirements
        if (ship.currentEnergy < this.energyConsumption) {
            return false;
        }

        return true;
    }
    
    /**
     * Check if system is operational
     */
    isOperational() {
        return this.currentHealth > 0 && this.healthPercentage > 0;
    }
    
    /**
     * Get energy consumption rate
     */
    getEnergyConsumptionRate() {
        return this.energyConsumption;
    }
    
    /**
     * Get radar range in meters
     */
    getRange() {
        return this.range;
    }
    
    /**
     * Get radar update frequency in Hz
     */
    getUpdateFrequency() {
        return this.updateFrequency;
    }
    
    /**
     * Get maximum trackable objects
     */
    getTrackingCapacity() {
        return this.trackingCapacity;
    }
    
    /**
     * Check if radar has IFF (Identify Friend or Foe) capabilities
     */
    hasIFFCapabilities() {
        return this.hasIFF;
    }
    
    /**
     * Check if radar has threat assessment capabilities
     */
    hasThreatAssessmentCapabilities() {
        return this.hasThreatAssessment;
    }
    
    /**
     * Check if radar has formation detection capabilities
     */
    hasFormationDetectionCapabilities() {
        return this.hasFormationDetection;
    }
    
    /**
     * Get system display name
     */
    getDisplayName() {
        return getSystemDisplayName(this.systemType);
    }
    
    /**
     * Get system status for HUD display
     */
    getStatus() {
        return {
            name: this.name,
            level: this.level,
            health: Math.round(this.healthPercentage * 100),
            operational: this.isOperational(),
            energyConsumption: this.energyConsumption,
            range: `${(this.range / 1000).toFixed(0)}km`,
            updateRate: `${this.updateFrequency}Hz`,
            trackingCapacity: this.trackingCapacity,
            features: {
                iff: this.hasIFF,
                threatAssessment: this.hasThreatAssessment,
                formationDetection: this.hasFormationDetection
            }
        };
    }
    
    /**
     * Update system (called from ship update loop)
     */
    update(deltaTime, ship) {
        // System maintenance and health updates could go here
        // For now, radar is passive and doesn't need active updates
    }
    
    /**
     * Damage the radar system
     */
    takeDamage(amount) {
        this.currentHealth = Math.max(0, this.currentHealth - amount);
        this.healthPercentage = this.currentHealth / this.maxHealth;
        
        if (this.currentHealth <= 0) {
            this.isOperational = false;
debug('COMBAT', `🎯 RadarSystem damaged beyond repair`);
        } else {
debug('COMBAT', `🎯 RadarSystem damaged: ${Math.round(this.healthPercentage * 100)}% health remaining`);
        }
    }
    
    /**
     * Repair the radar system
     */
    repair(amount) {
        this.currentHealth = Math.min(this.maxHealth, this.currentHealth + amount);
        this.healthPercentage = this.currentHealth / this.maxHealth;
        
        if (this.currentHealth > 0) {
            this.isOperational = true;
        }
        
debug('AI', `🎯 RadarSystem repaired: ${Math.round(this.healthPercentage * 100)}% health`);
    }
    
    /**
     * Get repair cost for this system
     */
    getRepairCost() {
        const damageFactor = 1 - this.healthPercentage;
        const baseCost = 100; // Base repair cost
        return Math.ceil(baseCost * damageFactor * this.level);
    }

    /**
     * Check if radar can be activated
     */
    canActivate(ship) {
        if (!this.isOperational()) {
            return false;
        }

        // Radar systems require energy to operate
        if (ship && ship.hasEnergy) {
            const energyRequired = this.getEnergyConsumption();
            return ship.hasEnergy(energyRequired);
        }

        return true;
    }

    /**
     * Activate the radar system
     */
    activate(ship) {
        if (!this.canActivate(ship)) {
            console.warn('Cannot activate radar: system not operational or insufficient energy');
            return false;
        }

        this.isActive = true;
        debug('UTILITY', '🎯 Radar system activated');
        return true;
    }

    /**
     * Deactivate the radar system
     */
    deactivate() {
        this.isActive = false;
        debug('UTILITY', '🎯 Radar system deactivated');
    }

    /**
     * Check if radar is operational
     */
    isOperational() {
        return this.healthPercentage > 0 && this.isOperational !== false;
    }
}