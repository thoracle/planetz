/**
 * DockingSystemManager - Comprehensive docking system management
 * Handles all docking-related validation, requirements, and integration with ship systems
 * Based on docs/spaceships_spec.md and docs/tech_design.md
 */

import { getSystemDisplayName } from './System.js';

export default class DockingSystemManager {
    constructor() {
        this.dockingRequirements = {
            maximumDockingSpeed: 1, // impulse speed
            dockingEnergyCost: 0,  // Free docking - docks provide refueling services
            launchEnergyCost: 0,   // Free launch - players should be able to leave when low on energy
            dockingRange: 1.5 // km - default for moons, planets will be 4.0km
        };
        
        this.dockingRestrictions = {
            hostileFactions: ['hostile', 'enemy'],
            combatZones: true,
            systemFailures: ['impulse_engines']
        };
        
        console.log('DockingSystemManager initialized');
    }
    
    /**
     * Comprehensive docking validation
     * @param {Object} ship - Ship instance
     * @param {Object} target - Target celestial body
     * @param {Object} starfieldManager - StarfieldManager instance
     * @returns {Object} Validation result with success flag and reasons
     */
    validateDocking(ship, target, starfieldManager) {
        const result = {
            canDock: true,
            reasons: [],
            warnings: [],
            energyCost: this.dockingRequirements.dockingEnergyCost
        };
        
        // Basic target validation
        if (!target) {
            result.canDock = false;
            result.reasons.push('No target specified');
            return result;
        }
        
        // Get target information
        const targetInfo = starfieldManager.solarSystemManager?.getCelestialBodyInfo(target);
        if (!targetInfo) {
            result.canDock = false;
            result.reasons.push('Target information unavailable');
            return result;
        }
        
        // Check if already docked
        if (starfieldManager.isDocked) {
            result.canDock = false;
            result.reasons.push('Already docked');
            return result;
        }
        
        // Distance validation
        const distance = starfieldManager.calculateDistance(
            starfieldManager.camera.position, 
            target.position
        );
        
        // Use different docking ranges for planets vs moons (matching StarfieldManager logic)
        let dockingRange = this.dockingRequirements.dockingRange; // Default 1.5 for moons
        if (targetInfo?.type === 'planet') {
            dockingRange = 4.0; // 4.0km for planets
        }
        
        if (distance > dockingRange) {
            result.canDock = false;
            result.reasons.push(`Too far from target (${distance.toFixed(1)}km > ${dockingRange}km)`);
        }
        
        // Speed validation
        if (starfieldManager.currentSpeed > this.dockingRequirements.maximumDockingSpeed) {
            result.canDock = false;
            result.reasons.push(`Speed too high (Impulse ${starfieldManager.currentSpeed} > ${this.dockingRequirements.maximumDockingSpeed})`);
        }
        
        // Diplomatic status validation
        if (this.dockingRestrictions.hostileFactions.includes(targetInfo.diplomacy)) {
            result.canDock = false;
            result.reasons.push(`Cannot dock at ${targetInfo.diplomacy} location`);
        }
        
        // Ship system validation
        if (ship) {
            const shipValidation = this.validateShipSystems(ship);
            if (!shipValidation.canDock) {
                result.canDock = false;
                result.reasons.push(...shipValidation.reasons);
            }
            result.warnings.push(...shipValidation.warnings);
        }
        
        // Combat zone validation
        if (this.isInCombatZone(starfieldManager)) {
            result.canDock = false;
            result.reasons.push('Cannot dock in combat zone');
        }
        
        // Location-specific requirements
        const locationValidation = this.validateLocationRequirements(targetInfo);
        if (!locationValidation.canDock) {
            result.canDock = false;
            result.reasons.push(...locationValidation.reasons);
        }
        result.warnings.push(...locationValidation.warnings);
        
        return result;
    }
    
    /**
     * Validate ship systems for docking capability
     * @param {Object} ship - Ship instance
     * @returns {Object} Validation result
     */
    validateShipSystems(ship) {
        const result = {
            canDock: true,
            reasons: [],
            warnings: []
        };
        
        // Energy validation removed - docks are for refueling, so no energy required
        
        // Critical system validation
        for (const systemName of this.dockingRestrictions.systemFailures) {
            const system = ship.getSystem(systemName);
            if (!system || !system.isOperational()) {
                result.canDock = false;
                result.reasons.push(`${this.formatSystemName(systemName)} offline or damaged`);
            }
        }
        
        // System health warnings
        const systemWarnings = this.checkSystemHealth(ship);
        result.warnings.push(...systemWarnings);
        
        return result;
    }
    
    /**
     * Check system health and generate warnings
     * @param {Object} ship - Ship instance
     * @returns {Array} Array of warning messages
     */
    checkSystemHealth(ship) {
        const warnings = [];
        
        for (const [systemName, system] of ship.systems) {
            const healthPercent = system.healthPercentage * 100;
            
            if (healthPercent < 50 && system.isOperational()) {
                warnings.push(`${this.formatSystemName(systemName)} damaged (${healthPercent.toFixed(1)}%)`);
            }
            
            if (system.isActive && system.getEnergyConsumptionRate) {
                const consumption = system.getEnergyConsumptionRate();
                if (consumption > 0) {
                    warnings.push(`${this.formatSystemName(systemName)} consuming ${consumption.toFixed(1)} energy/sec`);
                }
            }
        }
        
        return warnings;
    }
    
    /**
     * Validate location-specific docking requirements
     * @param {Object} targetInfo - Target celestial body information
     * @returns {Object} Validation result
     */
    validateLocationRequirements(targetInfo) {
        const result = {
            canDock: true,
            reasons: [],
            warnings: []
        };
        
        // Planet-specific requirements
        if (targetInfo.type === 'planet') {
            // Large planets might have atmospheric entry requirements
            if (targetInfo.size === 'large') {
                result.warnings.push('Large planet - atmospheric entry procedures required');
            }
        }
        
        // Moon-specific requirements
        if (targetInfo.type === 'moon') {
            // Some moons might have special docking procedures
            result.warnings.push('Moon docking - reduced gravity conditions');
        }
        
        // Faction-specific requirements
        if (targetInfo.diplomacy === 'neutral') {
            result.warnings.push('Neutral territory - standard docking fees may apply');
        } else if (targetInfo.diplomacy === 'friendly') {
            result.warnings.push('Friendly territory - reduced docking fees');
        }
        
        return result;
    }
    
    /**
     * Check if ship is in a combat zone
     * @param {Object} starfieldManager - StarfieldManager instance
     * @returns {boolean} True if in combat zone
     */
    isInCombatZone(starfieldManager) {
        // Check for hostile targets in the area
        if (starfieldManager.targetComputerEnabled && starfieldManager.currentTarget) {
            const targetInfo = starfieldManager.solarSystemManager?.getCelestialBodyInfo(starfieldManager.currentTarget);
            if (targetInfo?.diplomacy === 'hostile') {
                return true;
            }
        }
        
        // Could be extended to check for other combat indicators
        return false;
    }
    
    /**
     * Validate launch capability
     * @param {Object} ship - Ship instance
     * @returns {Object} Validation result
     */
    validateLaunch(ship) {
        const result = {
            canLaunch: true,
            reasons: [],
            warnings: [],
            energyCost: this.dockingRequirements.launchEnergyCost
        };
        
        if (!ship) {
            result.canLaunch = false;
            result.reasons.push('No ship data available');
            return result;
        }
        
        // Launch should not require energy - removed energy validation
        // Players should be able to undock even when low on power to seek refueling
        
        // Impulse engines must be operational for launch
        const impulseEngines = ship.getSystem('impulse_engines');
        if (!impulseEngines || !impulseEngines.isOperational()) {
            result.canLaunch = false;
            result.reasons.push('Impulse engines offline - cannot launch');
        }
        
        return result;
    }
    
    /**
     * Get docking status information
     * @param {Object} ship - Ship instance
     * @param {Object} starfieldManager - StarfieldManager instance
     * @returns {Object} Docking status information
     */
    getDockingStatus(ship, starfieldManager) {
        return {
            isDocked: starfieldManager.isDocked,
            dockedLocation: starfieldManager.dockedTo,
            canDock: starfieldManager.isDocked ? false : this.validateDocking(ship, starfieldManager.currentTarget, starfieldManager).canDock,
            canLaunch: starfieldManager.isDocked ? this.validateLaunch(ship).canLaunch : false,
            dockingRange: this.dockingRequirements.dockingRange,
            currentSpeed: starfieldManager.currentSpeed,
            maxDockingSpeed: this.dockingRequirements.maximumDockingSpeed
        };
    }
    
    /**
     * Format system name for display
     * @param {string} systemName - System name
     * @returns {string} Formatted name
     */
    formatSystemName(systemName) {
        return getSystemDisplayName(systemName);
    }
    
    /**
     * Get docking requirements
     * @returns {Object} Docking requirements
     */
    getDockingRequirements() {
        return { ...this.dockingRequirements };
    }
    
    /**
     * Update docking requirements (for configuration)
     * @param {Object} newRequirements - New requirements to merge
     */
    updateDockingRequirements(newRequirements) {
        this.dockingRequirements = { ...this.dockingRequirements, ...newRequirements };
        console.log('Docking requirements updated:', this.dockingRequirements);
    }
} 