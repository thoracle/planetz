/**
 * Target Computer System - Provides targeting and tracking capabilities
 * Based on docs/spaceships_spec.md and docs/tech_design.md
 * Energy consumption when active, damage affects targeting accuracy and range
 */

import System, { SYSTEM_STATES } from '../System.js';

export default class TargetComputer extends System {
    constructor(level = 1, config = {}) {
        // Base configuration for target computer
        const baseConfig = {
            slotCost: 1,
            energyConsumptionRate: 8, // Energy per second when active
            systemType: 'target_computer',
            maxHealth: 80,
            ...config
        };
        
        super('Target Computer', level, baseConfig);
        
        // Target computer state
        this.isTargeting = false; // Whether actively targeting
        this.currentTarget = null; // Current target object
        this.targetLock = false; // Whether target is locked
        this.targetingRange = 50; // Base targeting range in km
        this.targetingAccuracy = 1.0; // Base targeting accuracy (0-1)
        this.maxTargets = 10; // Maximum number of targets that can be tracked
        
        // Current performance values (will be calculated based on level and damage)
        this.currentTargetingRange = 0;
        this.currentTargetingAccuracy = 0;
        this.currentMaxTargets = 0;
        
        // Tracking state
        this.trackedTargets = new Map(); // Map of tracked targets
        this.lastScanTime = 0; // When last target scan was performed
        this.scanInterval = 1000; // Target scan interval in milliseconds
        
        // Override default active state - target computer is only active when targeting
        this.isActive = false;
        
        // Initialize level-specific values
        this.updateLevelStats();
        
        console.log(`Target Computer created (Level ${level}) - Range: ${this.getCurrentTargetingRange()}km, Max Targets: ${this.getMaxTargets()}`);
    }
    
    /**
     * Initialize level-specific stats for target computer
     * @returns {Object} Level stats configuration
     */
    initializeLevelStats() {
        const baseConsumption = this.energyConsumptionRate;
        const baseRange = this.targetingRange;
        const baseAccuracy = this.targetingAccuracy;
        const baseMaxTargets = this.maxTargets;
        
        return {
            1: { 
                effectiveness: 1.0,
                energyConsumptionRate: baseConsumption,
                targetingRange: baseRange,
                targetingAccuracy: baseAccuracy,
                maxTargets: baseMaxTargets,
                computerType: 'Basic Targeting Computer'
            },
            2: { 
                effectiveness: 1.2,
                energyConsumptionRate: baseConsumption * 0.95, // 5% more efficient
                targetingRange: baseRange * 1.3, // 30% more range
                targetingAccuracy: baseAccuracy * 1.1, // 10% better accuracy
                maxTargets: baseMaxTargets + 5, // 5 more targets
                computerType: 'Enhanced Targeting Computer'
            },
            3: { 
                effectiveness: 1.4,
                energyConsumptionRate: baseConsumption * 0.90, // 10% more efficient
                targetingRange: baseRange * 1.6, // 60% more range
                targetingAccuracy: baseAccuracy * 1.2, // 20% better accuracy
                maxTargets: baseMaxTargets + 10, // 10 more targets
                computerType: 'Advanced Targeting Computer'
            },
            4: { 
                effectiveness: 1.6,
                energyConsumptionRate: baseConsumption * 0.85, // 15% more efficient
                targetingRange: baseRange * 2.0, // 100% more range
                targetingAccuracy: baseAccuracy * 1.3, // 30% better accuracy
                maxTargets: baseMaxTargets + 20, // 20 more targets
                computerType: 'Military Grade Targeting Computer'
            },
            5: { 
                effectiveness: 1.8,
                energyConsumptionRate: baseConsumption * 0.80, // 20% more efficient
                targetingRange: baseRange * 2.5, // 150% more range
                targetingAccuracy: baseAccuracy * 1.5, // 50% better accuracy
                maxTargets: baseMaxTargets + 30, // 30 more targets
                computerType: 'AI-Assisted Targeting Computer'
            }
        };
    }
    
    /**
     * Update targeting computer stats based on current level
     */
    updateLevelStats() {
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        
        // Update current performance based on level and health
        this.updateCurrentStats();
        
        console.log(`Target Computer upgraded to Level ${this.level} - ${levelStats.computerType}`);
    }
    
    /**
     * Update current targeting performance based on level and damage
     */
    updateCurrentStats() {
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        const effectiveness = this.getEffectiveness();
        
        // Ensure level stats exist before calculating
        if (!levelStats) {
            console.warn('Level stats not available for target computer');
            this.currentTargetingRange = this.targetingRange;
            this.currentTargetingAccuracy = this.targetingAccuracy;
            this.currentMaxTargets = this.maxTargets;
            return;
        }
        
        // Calculate current performance
        this.currentTargetingRange = levelStats.targetingRange * effectiveness;
        this.currentTargetingAccuracy = Math.min(1.0, levelStats.targetingAccuracy * effectiveness);
        this.currentMaxTargets = Math.floor(levelStats.maxTargets * effectiveness);
    }
    
    /**
     * Get current targeting range based on level and system health
     * @returns {number} Current targeting range in km
     */
    getCurrentTargetingRange() {
        if (!this.isOperational()) {
            return 0;
        }
        
        this.updateCurrentStats();
        return this.currentTargetingRange || this.targetingRange || 50;
    }
    
    /**
     * Get current targeting accuracy based on level and system health
     * @returns {number} Current targeting accuracy (0-1)
     */
    getCurrentTargetingAccuracy() {
        if (!this.isOperational()) {
            return 0;
        }
        
        this.updateCurrentStats();
        return this.currentTargetingAccuracy || this.targetingAccuracy || 1.0;
    }
    
    /**
     * Get maximum number of targets that can be tracked
     * @returns {number} Maximum targets
     */
    getMaxTargets() {
        if (!this.isOperational()) {
            return 0;
        }
        
        this.updateCurrentStats();
        return this.currentMaxTargets || this.maxTargets || 10;
    }
    
    /**
     * Activate targeting computer
     * @param {Ship} ship - Ship instance for energy consumption
     * @returns {boolean} True if activation successful
     */
    activate(ship) {
        if (!this.isOperational()) {
            console.warn('Cannot activate Target Computer: system not operational');
            return false;
        }
        
        // Check energy availability for sustained operation
        const energyRequired = this.getEnergyConsumptionRate();
        if (!ship.hasEnergy(energyRequired)) {
            console.warn('Cannot activate Target Computer: Insufficient energy');
            return false;
        }
        
        this.isActive = true;
        this.isTargeting = true;
        console.log(`Target Computer activated - Range: ${this.getCurrentTargetingRange().toFixed(0)}km, Accuracy: ${(this.getCurrentTargetingAccuracy() * 100).toFixed(1)}%`);
        return true;
    }
    
    /**
     * Deactivate targeting computer
     */
    deactivate() {
        this.isActive = false;
        this.isTargeting = false;
        this.currentTarget = null;
        this.targetLock = false;
        this.trackedTargets.clear();
        console.log('Target Computer deactivated');
    }
    
    /**
     * Set current target
     * @param {Object} target - Target object
     * @returns {boolean} True if target was set successfully
     */
    setTarget(target) {
        if (!this.isOperational() || !this.isActive) {
            console.warn('Cannot set target: Target Computer not active');
            return false;
        }
        
        this.currentTarget = target;
        this.targetLock = false; // Reset lock when changing targets
        
        // Add to tracked targets if not already tracked
        if (target && !this.trackedTargets.has(target.id)) {
            if (this.trackedTargets.size < this.getMaxTargets()) {
                this.trackedTargets.set(target.id, {
                    target: target,
                    firstDetected: Date.now(),
                    lastUpdated: Date.now(),
                    lockStrength: 0
                });
            }
        }
        
        console.log(`Target set: ${target ? target.name || 'Unknown' : 'None'}`);
        return true;
    }
    
    /**
     * Attempt to lock onto current target
     * @returns {boolean} True if lock was successful
     */
    lockTarget() {
        if (!this.currentTarget || !this.isOperational() || !this.isActive) {
            return false;
        }
        
        const accuracy = this.getCurrentTargetingAccuracy();
        const lockChance = accuracy * 0.8; // 80% of accuracy determines lock chance
        
        if (Math.random() < lockChance) {
            this.targetLock = true;
            console.log('Target lock acquired');
            return true;
        } else {
            console.log('Target lock failed - insufficient accuracy');
            return false;
        }
    }
    
    /**
     * Clear current target
     */
    clearTarget() {
        this.currentTarget = null;
        this.targetLock = false;
    }
    
    /**
     * Get current energy consumption rate
     * Only consumes energy when active
     * @returns {number} Energy consumption rate per second
     */
    getEnergyConsumptionRate() {
        if (!this.isOperational() || !this.isActive) {
            return 0;
        }
        
        // Get base consumption for current level
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        const baseConsumption = levelStats.energyConsumptionRate || this.energyConsumptionRate;
        
        // Apply system effectiveness (damaged systems consume more energy)
        const effectiveness = this.getEffectiveness();
        const inefficiencyPenalty = 1 + (1 - effectiveness) * 0.2; // Up to 20% more consumption when damaged
        
        return baseConsumption * inefficiencyPenalty;
    }
    
    /**
     * Handle system state effects specific to target computer
     * @param {string} newState The new system state
     */
    handleStateEffects(newState) {
        super.handleStateEffects(newState);
        
        switch (newState) {
            case SYSTEM_STATES.CRITICAL:
                // Critical targeting computer has reduced accuracy and range
                console.log('Critical targeting computer damage - reduced accuracy and range');
                // Clear target lock if accuracy drops too low
                if (this.getCurrentTargetingAccuracy() < 0.3) {
                    this.targetLock = false;
                    console.log('Target lock lost due to critical damage');
                }
                break;
            case SYSTEM_STATES.DISABLED:
                // Disabled targeting computer cannot function
                this.deactivate();
                console.log('Target Computer disabled - no targeting capability!');
                break;
        }
        
        // Update current stats when state changes
        this.updateCurrentStats();
    }
    
    /**
     * Update targeting computer (called each frame)
     * @param {number} deltaTime Time elapsed since last update in milliseconds
     * @param {Ship} ship Ship instance for energy consumption
     */
    update(deltaTime, ship) {
        // Call parent update for energy consumption
        super.update(deltaTime, ship);
        
        // If targeting computer is active but ship has insufficient energy, deactivate
        if (this.isActive && !ship.hasEnergy(this.getEnergyConsumptionRate() * deltaTime / 1000)) {
            console.warn('Target Computer deactivated due to insufficient energy');
            this.deactivate();
        }
        
        // Update tracked targets if active
        if (this.isActive && this.isOperational()) {
            this.updateTrackedTargets(deltaTime);
        }
    }
    
    /**
     * Update tracked targets (remove old ones, update lock strength)
     * @param {number} deltaTime Time elapsed since last update
     */
    updateTrackedTargets(deltaTime) {
        const now = Date.now();
        const maxTrackingTime = 30000; // 30 seconds max tracking time
        
        // Remove old tracked targets
        for (const [targetId, trackingData] of this.trackedTargets) {
            if (now - trackingData.lastUpdated > maxTrackingTime) {
                this.trackedTargets.delete(targetId);
            }
        }
        
        // Update current target lock strength
        if (this.currentTarget && this.trackedTargets.has(this.currentTarget.id)) {
            const trackingData = this.trackedTargets.get(this.currentTarget.id);
            trackingData.lastUpdated = now;
            
            // Increase lock strength over time when targeting
            if (this.targetLock) {
                trackingData.lockStrength = Math.min(1.0, trackingData.lockStrength + deltaTime / 5000); // 5 seconds to full lock
            }
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
     * Get system status with targeting computer-specific information
     * @returns {Object} Extended status object
     */
    getStatus() {
        const baseStatus = super.getStatus();
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        
        return {
            ...baseStatus,
            // Add backward compatibility for healthPercentage
            healthPercentage: this.healthPercentage,
            isTargeting: this.isTargeting,
            currentTarget: this.currentTarget ? this.currentTarget.name || 'Unknown' : null,
            targetLock: this.targetLock,
            currentTargetingRange: this.getCurrentTargetingRange(),
            currentTargetingAccuracy: this.getCurrentTargetingAccuracy(),
            maxTargets: this.getMaxTargets(),
            trackedTargetsCount: this.trackedTargets.size,
            computerType: levelStats ? levelStats.computerType : 'Basic Targeting Computer',
            energyConsumptionRate: this.getEnergyConsumptionRate()
        };
    }
    
    /**
     * Clean up targeting computer effects when system is destroyed
     */
    dispose() {
        this.deactivate();
        this.trackedTargets.clear();
    }
} 