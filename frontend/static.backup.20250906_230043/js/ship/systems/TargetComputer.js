/**
 * Target Computer System - Provides targeting and tracking capabilities
 * Based on docs/spaceships_spec.md and docs/tech_design.md
 * Energy consumption when active, damage affects targeting accuracy and range
 */

import System, { SYSTEM_STATES, getSystemDisplayName } from '../System.js';

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
        this.targetingRange = 150; // Base targeting range in km (increased for target dummy testing)
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
        
        // Sub-targeting system (Level 3+)
        this.currentSubTarget = null; // Currently selected sub-target system
        this.availableSubTargets = []; // List of targetable enemy systems
        this.subTargetIndex = 0; // Current index in sub-target list
        this.subTargetAccuracyBonus = 0.2; // 20% accuracy bonus for sub-targeted systems
        this.subTargetDamageBonus = 0.3; // 30% damage bonus for sub-targeted systems
        
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
     * Check if target computer can be activated
     * @param {Ship} ship - Ship instance to check energy and card requirements
     * @returns {boolean} True if target computer can be activated
     */
    canActivate(ship) {
        if (!this.isOperational()) {
            return false;
        }
        
        // Check if required cards are installed
        if (ship && ship.hasSystemCards && typeof ship.hasSystemCards === 'function') {
            const hasCards = ship.hasSystemCards('target_computer');
            if (!hasCards) {
                return false;
            }
        }
        
        // Target cycling should not require energy - removed energy check
        // Players should be able to cycle targets even when low on power
        
        return true;
    }
    
    /**
     * Activate targeting computer
     * @param {Ship} ship - Ship instance for energy consumption
     * @returns {boolean} True if activation successful
     */
    activate(ship) {
        if (!this.canActivate(ship)) {
            console.warn('Cannot activate Target Computer: system requirements not met');
            return false;
        }
        
        this.isActive = true;
        this.isTargeting = true;
        
        const energyConsumption = this.getEnergyConsumptionRate();
        const currentEnergy = Math.round(ship.currentEnergy);
        const energyReactor = ship.getSystem('energy_reactor');
        
        console.log(`Target Computer activated - Range: ${this.getCurrentTargetingRange().toFixed(0)}km, Accuracy: ${(this.getCurrentTargetingAccuracy() * 100).toFixed(1)}%`);
        
        // Provide feedback about energy consumption and warnings
        if (currentEnergy < energyConsumption * 10) {
            // Less than 10 seconds of operation remaining
            const timeRemaining = Math.floor(currentEnergy / energyConsumption);
            this.showHUDError(
                'LOW POWER WARNING',
                `Target Computer active. ${timeRemaining}s operation remaining (${energyConsumption}/sec)`
            );
        } else if (!energyReactor || !energyReactor.isOperational()) {
            // No power generation - will shut down when energy depletes
            this.showHUDError(
                'POWER GENERATION OFFLINE',
                `Target Computer active. Energy Reactor disabled - repair soon!`
            );
        }
        
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
        
        // Update sub-targets for new target
        this.updateSubTargets();
        
        // Extract comprehensive target information for display
        if (target) {
            const name = target.name || target.shipName || target.userData?.name || 'Unknown';
            let faction = 'Unknown';
            let diplomacy = 'Unknown';
            
            // Try multiple sources for faction/diplomacy information
            if (target.faction) {
                faction = target.faction;
            } else if (target.diplomacy) {
                faction = target.diplomacy;
            } else if (target.ship?.diplomacy) {
                // Check ship object for target dummies and enemy ships
                faction = target.ship.diplomacy;
            } else if (target.ship?.faction) {
                faction = target.ship.faction;
            } else if (target.userData?.faction) {
                faction = target.userData.faction;
            } else if (target.userData?.diplomacy) {
                faction = target.userData.diplomacy;
            } else if (target.shipData?.faction) {
                faction = target.shipData.faction;
            }
            
            // Set diplomacy same as faction if not explicitly set
            diplomacy = target.diplomacy || target.ship?.diplomacy || faction;
            
            console.log(`Target set: ${name} (${faction})`);
            
            // Determine proper object type
            let objectType = 'Unknown';
            if (target.isShip || target.userData?.isShip) {
                objectType = 'Ship';
            } else if (target.userData?.type) {
                // Use userData type (e.g., 'planet', 'moon', 'star', 'station')
                objectType = target.userData.type.charAt(0).toUpperCase() + target.userData.type.slice(1);
            } else if (window.spatialManager) {
                // Try to get type from spatial manager metadata
                const metadata = window.spatialManager.getMetadata(target);
                if (metadata?.type) {
                    objectType = metadata.type.charAt(0).toUpperCase() + metadata.type.slice(1);
                }
            }
            
            // Store enhanced target info for HUD display
            this.currentTargetInfo = {
                name: name,
                faction: faction,
                diplomacy: diplomacy,
                type: objectType
            };
        } else {
            console.log(`Target set: None`);
            this.currentTargetInfo = null;
        }
        
        if (this.hasSubTargeting() && this.availableSubTargets.length > 0) {
            console.log(`Sub-targeting available: ${this.availableSubTargets.length} systems detected`);
        }
        return true;
    }
    
    /**
     * Get current target information for HUD display
     * @returns {Object|null} Target information object or null
     */
    getCurrentTargetInfo() {
        return this.currentTargetInfo || null;
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
        this.clearSubTarget();
    }
    
    /**
     * Check if sub-targeting is available (Level 3+)
     * @returns {boolean} True if sub-targeting is available
     */
    hasSubTargeting() {
        return this.level >= 3 && this.isOperational();
    }
    
    /**
     * Check if intel capabilities are available (Level 3+)
     * Intel capabilities include detailed scanning and intelligence gathering
     * @returns {boolean} True if intel capabilities are available
     */
    hasIntelCapabilities() {
        return this.level >= 3 && this.isOperational();
    }
    
    /**
     * Detect targetable systems on enemy ship
     * @param {Ship} enemyShip - Enemy ship to scan for targetable systems
     * @returns {Array} Array of targetable systems
     */
    detectTargetableSystems(target) {
        if (!this.hasSubTargeting() || !target) {
            return [];
        }
        
        // Debug logging removed for performance
        
        const targetableSystems = [];
        
        // Handle ships with systems property
        // Check multiple possible locations for ship systems
        let shipSystems = null;
        if (target.systems) {
            shipSystems = target.systems;
        } else if (target.ship?.systems) {
            shipSystems = target.ship.systems;
        } else if (target.userData?.ship?.systems) {
            shipSystems = target.userData.ship.systems;
        }
        
        if (shipSystems) {
            // Scan ship systems
            for (const [systemName, system] of shipSystems) {
                // Only target systems that are not completely destroyed (health > 0)
                // Systems with 0% health are destroyed and cannot be targeted
                if (system.healthPercentage > 0) {
                    targetableSystems.push({
                        systemName: systemName,
                        system: system,
                        displayName: system.displayName || getSystemDisplayName(systemName),
                        health: system.healthPercentage,
                        priority: this.getSystemTargetPriority(systemName)
                    });
                }
            }
        }
        // Handle space stations (Three.js objects with userData.isSpaceStation)
        else if (target.userData?.isSpaceStation || target.isSpaceStation) {
            // Generate standard space station systems based on station type
            const stationSystems = this.generateStationSystems(target);
            
            for (const system of stationSystems) {
                targetableSystems.push({
                    systemName: system.name,
                    system: system,
                    displayName: system.displayName,
                    health: system.health,
                    priority: this.getSystemTargetPriority(system.name)
                });
            }
        }
        // Handle navigation beacons (neutral, simple systems)
        else if (target.userData?.isBeacon || target.userData?.type === 'beacon') {
            const beaconSystems = [
                { name: 'hull_plating', displayName: 'Hull Plating', health: 20, healthPercentage: 20 },
                { name: 'subspace_radio', displayName: 'Subspace Radio', health: 30, healthPercentage: 30 }
            ];
            for (const system of beaconSystems) {
                if (system.health > 0) {
                    targetableSystems.push({
                        systemName: system.name,
                        system: system,
                        displayName: system.displayName,
                        health: system.healthPercentage,
                        priority: this.getSystemTargetPriority(system.name)
                    });
                }
            }
        }
        
        // Sort by priority (higher priority first)
        targetableSystems.sort((a, b) => b.priority - a.priority);
        
        // Debug: Found ${targetableSystems.length} targetable systems
        
        return targetableSystems;
    }
    
    /**
     * Generate standard systems for space stations based on their type
     * @param {Object} station - Space station object with userData
     * @returns {Array} Array of station systems
     */
    generateStationSystems(station) {
        const stationData = station.userData || {};
        const stationType = stationData.type || 'Unknown';
        const stationName = stationData.name || 'Space Station';
        
        // Generating station systems for ${stationName} (${stationType})
        
        // Base systems that all stations have
        const baseSystems = [
            {
                name: 'hull_plating',
                displayName: 'Hull Plating',
                health: 100,
                healthPercentage: 100
            },
            {
                name: 'energy_reactor',
                displayName: 'Power Core',
                health: 100,
                healthPercentage: 100
            },
            {
                name: 'life_support',
                displayName: 'Life Support',
                health: 100,
                healthPercentage: 100
            }
        ];
        
        // Additional systems based on station type
        const additionalSystems = [];
        
        switch (stationType) {
            case 'Defense Platform':
            case 'Military Base':
                additionalSystems.push(
                    { name: 'weapons', displayName: 'Defense Weapons', health: 100, healthPercentage: 100 },
                    { name: 'shields', displayName: 'Station Shields', health: 100, healthPercentage: 100 },
                    { name: 'target_computer', displayName: 'Fire Control', health: 100, healthPercentage: 100 }
                );
                break;
                
            case 'Shipyard':
                additionalSystems.push(
                    { name: 'manufacturing', displayName: 'Manufacturing Bay', health: 100, healthPercentage: 100 },
                    { name: 'docking_arms', displayName: 'Docking Arms', health: 100, healthPercentage: 100 },
                    { name: 'cargo_systems', displayName: 'Cargo Systems', health: 100, healthPercentage: 100 }
                );
                break;
                
            case 'Research Lab':
            case 'Research Station':
                additionalSystems.push(
                    { name: 'laboratories', displayName: 'Research Labs', health: 100, healthPercentage: 100 },
                    { name: 'long_range_scanner', displayName: 'Sensor Array', health: 100, healthPercentage: 100 },
                    { name: 'data_core', displayName: 'Data Core', health: 100, healthPercentage: 100 }
                );
                break;
                
            case 'Mining Station':
            case 'Refinery':
                additionalSystems.push(
                    { name: 'mining_equipment', displayName: 'Mining Equipment', health: 100, healthPercentage: 100 },
                    { name: 'processing_plant', displayName: 'Processing Plant', health: 100, healthPercentage: 100 },
                    { name: 'cargo_systems', displayName: 'Cargo Bay', health: 100, healthPercentage: 100 }
                );
                break;
                
            case 'Trading Post':
            case 'Commercial Hub':
                additionalSystems.push(
                    { name: 'cargo_systems', displayName: 'Cargo Bay', health: 100, healthPercentage: 100 },
                    { name: 'subspace_radio', displayName: 'Communications', health: 100, healthPercentage: 100 },
                    { name: 'docking_arms', displayName: 'Docking Bays', health: 100, healthPercentage: 100 }
                );
                break;
                
            default:
                // Generic station systems
                additionalSystems.push(
                    { name: 'docking_arms', displayName: 'Docking System', health: 100, healthPercentage: 100 },
                    { name: 'subspace_radio', displayName: 'Communications', health: 100, healthPercentage: 100 }
                );
        }
        
        const allSystems = [...baseSystems, ...additionalSystems];
        // Generated ${allSystems.length} systems for station
        
        return allSystems;
    }
    
    /**
     * Get targeting priority for different system types
     * @param {string} systemName - Name of the system
     * @returns {number} Priority value (higher = more important)
     */
    getSystemTargetPriority(systemName) {
        const priorities = {
            'weapons': 10,
            'shields': 9,
            'impulse_engines': 8,
            'warp_drive': 7,
            'target_computer': 6,
            'long_range_scanner': 5,
            'energy_reactor': 4,
            'hull_plating': 3,
            'subspace_radio': 2,
            'galactic_chart': 1,
            // Station-specific systems
            'life_support': 9,
            'manufacturing': 8,
            'docking_arms': 7,
            'cargo_systems': 6,
            'laboratories': 6,
            'data_core': 5,
            'mining_equipment': 5,
            'processing_plant': 4
        };
        
        return priorities[systemName] || 0;
    }
    
    /**
     * Cycle to next sub-target
     * @returns {boolean} True if sub-target was changed
     */
    cycleSubTargetNext() {
        if (!this.hasSubTargeting() || !this.currentTarget || this.availableSubTargets.length === 0) {
            return false;
        }
        
        this.subTargetIndex = (this.subTargetIndex + 1) % this.availableSubTargets.length;
        this.currentSubTarget = this.availableSubTargets[this.subTargetIndex];
        
        console.log(`Sub-target: ${this.currentSubTarget.displayName} (${(this.currentSubTarget.health * 100).toFixed(1)}% health)`);
        return true;
    }
    
    /**
     * Cycle to previous sub-target
     * @returns {boolean} True if sub-target was changed
     */
    cycleSubTargetPrevious() {
        if (!this.hasSubTargeting() || !this.currentTarget || this.availableSubTargets.length === 0) {
            return false;
        }
        
        this.subTargetIndex = (this.subTargetIndex - 1 + this.availableSubTargets.length) % this.availableSubTargets.length;
        this.currentSubTarget = this.availableSubTargets[this.subTargetIndex];
        
        console.log(`Sub-target: ${this.currentSubTarget.displayName} (${(this.currentSubTarget.health * 100).toFixed(1)}% health)`);
        return true;
    }
    
    /**
     * Clear current sub-target
     */
    clearSubTarget() {
        this.currentSubTarget = null;
        this.availableSubTargets = [];
        this.subTargetIndex = 0;
    }
    
    /**
     * Select a random sub-target from available targets
     * @returns {boolean} True if a sub-target was selected
     */
    selectRandomSubTarget() {
        if (!this.hasSubTargeting() || !this.currentTarget || this.availableSubTargets.length === 0) {
            return false;
        }
        
        this.subTargetIndex = Math.floor(Math.random() * this.availableSubTargets.length);
        this.currentSubTarget = this.availableSubTargets[this.subTargetIndex];
        
        console.log(`Random sub-target selected: ${this.currentSubTarget.displayName} (${(this.currentSubTarget.health * 100).toFixed(1)}% health)`);
        return true;
    }
    
    /**
     * Update available sub-targets for current target
     */
    updateSubTargets() {
        if (!this.hasSubTargeting() || !this.currentTarget) {
            this.clearSubTarget();
            return;
        }
        
        // Rebuild the sub-targets list
        this.availableSubTargets = this.detectTargetableSystems(this.currentTarget);
        
        // If we don't have a current sub-target and there are available targets, select one randomly
        if (!this.currentSubTarget && this.availableSubTargets.length > 0) {
            this.selectRandomSubTarget();
        } else if (this.currentSubTarget) {
            // Check if current sub-target is still valid
            const currentSystemName = this.currentSubTarget.systemName;
            const foundIndex = this.availableSubTargets.findIndex(
                target => target.systemName === currentSystemName
            );
            
            if (foundIndex !== -1) {
                // Current sub-target is still valid, update to latest info
                this.subTargetIndex = foundIndex;
                this.currentSubTarget = this.availableSubTargets[this.subTargetIndex];
            } else {
                // Current sub-target is no longer valid, select a new random one
                if (this.availableSubTargets.length > 0) {
                    this.selectRandomSubTarget();
                } else {
                    this.currentSubTarget = null;
                }
            }
        }
    }
    
    /**
     * Get accuracy bonus for current sub-target
     * @returns {number} Accuracy bonus (0-1)
     */
    getSubTargetAccuracyBonus() {
        if (!this.hasSubTargeting() || !this.currentSubTarget) {
            return 0;
        }
        
        // Base sub-targeting bonus scales with targeting computer performance
        const currentAccuracy = this.getCurrentTargetingAccuracy();
        const baseBonus = this.subTargetAccuracyBonus; // 0.2 (20%)
        
        // Scale bonus based on targeting computer accuracy
        // Perfect accuracy (1.0) = full bonus, lower accuracy = reduced bonus
        return baseBonus * currentAccuracy;
    }
    
    /**
     * Get damage bonus for current sub-target
     * @returns {number} Damage bonus (0-1)
     */
    getSubTargetDamageBonus() {
        if (!this.hasSubTargeting() || !this.currentSubTarget) {
            return 0;
        }
        
        // Base sub-targeting damage bonus scales with targeting computer performance
        const currentAccuracy = this.getCurrentTargetingAccuracy();
        const baseBonus = this.subTargetDamageBonus; // 0.3 (30%)
        
        // Scale bonus based on targeting computer accuracy
        // Perfect accuracy (1.0) = full bonus, lower accuracy = reduced bonus
        return baseBonus * currentAccuracy;
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
            const energyReactor = ship.getSystem('energy_reactor');
            const energyRequired = this.getEnergyConsumptionRate();
            const energyAvailable = Math.round(ship.currentEnergy);
            
            console.warn('Target Computer deactivated due to insufficient energy');
            this.deactivate();
            
            // Provide detailed feedback via HUD error
            if (!energyReactor || !energyReactor.isOperational()) {
                // Energy reactor is the problem
                if (!energyReactor) {
                    this.showHUDError(
                        'TARGET COMPUTER SHUTDOWN',
                        'Energy Reactor destroyed - no power generation'
                    );
                } else {
                    this.showHUDError(
                        'TARGET COMPUTER SHUTDOWN',
                        `Energy Reactor disabled (${Math.round(energyReactor.healthPercentage * 100)}% health) - repair immediately`
                    );
                }
            } else {
                // Energy depletion
                this.showHUDError(
                    'TARGET COMPUTER SHUTDOWN',
                    `Energy depleted (${energyAvailable} units) - need ${energyRequired}/sec for operation`
                );
            }
        }
        
        // Update tracked targets if active
        if (this.isActive && this.isOperational()) {
            this.updateTrackedTargets(deltaTime);
            
            // Update sub-targets periodically (every 2 seconds)
            if (this.hasSubTargeting() && this.currentTarget && (Date.now() - this.lastScanTime) > 2000) {
                this.updateSubTargets();
                this.lastScanTime = Date.now();
            }
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
            energyConsumptionRate: this.getEnergyConsumptionRate(),
            canActivate: this.canActivate({ currentEnergy: 1000 }), // Test with high energy
            // Sub-targeting information
            hasSubTargeting: this.hasSubTargeting(),
            currentSubTarget: this.currentSubTarget ? this.currentSubTarget.displayName : null,
            availableSubTargets: this.availableSubTargets.length,
            subTargetAccuracyBonus: this.getSubTargetAccuracyBonus(),
            subTargetDamageBonus: this.getSubTargetDamageBonus()
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