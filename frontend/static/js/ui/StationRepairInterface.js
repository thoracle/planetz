import { debug } from '../debug.js';

/**
 * Station Repair Interface - Comprehensive repair services at stations
 * Based on docs/spaceships_spec.md and docs/tech_design.md
 * 
 * Features:
 * - Full hull repair services
 * - Individual system repair options
 * - Repair cost calculations
 * - Repair time estimates
 * - Credit balance management
 * - Faction-based pricing
 */

import { getSystemDisplayName } from '../ship/System.js';
import { playerCredits } from '../utils/PlayerCredits.js';

export class StationRepairInterface {
    constructor(starfieldManager) {
        this.starfieldManager = starfieldManager;
        this.isVisible = false;
        this.ship = null;
        this.dockedLocation = null;
        this.selectedSystems = new Set();
        this.repairInProgress = false;
        
        // Repair pricing configuration
        this.repairPricing = {
            // Base costs per system type
            baseCosts: {
                hull: 50,           // Credits per % hull damage
                system: 100,        // Base cost per system
                critical: 1.5,      // Multiplier for critical systems
                emergency: 2.0,     // Multiplier for emergency repairs
                energy: 5           // Credits per energy unit recharged
            },
            
            // Ship class multipliers
            shipClassMultipliers: {
                scout: 0.8,
                light_fighter: 1.0,
                heavy_fighter: 1.2,
                light_freighter: 1.5,
                heavy_freighter: 2.0
            },
            
            // Faction reputation discounts
            factionDiscounts: {
                friendly: 0.8,
                neutral: 1.0,
                hostile: 1.5
            },
            
            // Repair time per system (seconds)
            repairTimes: {
                hull: 2,            // Seconds per % hull damage
                system: 30,         // Base seconds per system
                emergency: 0.5,     // Multiplier for instant repair
                energy: 0.1         // Seconds per energy unit recharged
            }
        };
        
        // Use unified credits system
        // this.playerCredits = 5000; // Removed - using unified system
        
debug('AI', 'Station Repair Interface initialized');
    }
    
    /**
     * Show the repair interface
     * @param {Object} ship - Ship instance
     * @param {Object} dockedLocation - Location where ship is docked
     */
    show(ship, dockedLocation) {
debug('AI', 'StationRepairInterface.show() called with:', { ship, dockedLocation });
        
        this.ship = ship;
        this.dockedLocation = dockedLocation;
        this.isVisible = true;
        this.selectedSystems.clear();
        
        // Expose this instance to global window for onclick handlers
        window.stationRepairInterface = this;
        
debug('UI', 'Creating interface...');
        this.createInterface();
debug('UI', 'Interface created, updating...');
        this.updateInterface();
debug('UI', 'Interface updated, showing...');
        
        // Show the interface
        if (this.container) {
            this.container.style.display = 'block';
        }
        
debug('AI', 'Station Repair Interface shown');
    }
    
    /**
     * Hide the repair interface
     */
    hide() {
        this.isVisible = false;
        this.ship = null;
        this.dockedLocation = null;
        this.selectedSystems.clear();
        
        // Clean up global reference
        if (window.stationRepairInterface === this) {
            window.stationRepairInterface = null;
        }
        
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
            this.container = null;
        }
        
debug('AI', 'Station Repair Interface hidden');
    }
    
    /**
     * Return to the docking interface
     */
    returnToDocking() {
        const dockedLocation = this.dockedLocation;
        this.hide();
        
        // Show the docking interface again
        if (this.starfieldManager.dockingInterface && dockedLocation) {
            this.starfieldManager.dockingInterface.show(dockedLocation);
        }
    }
    
    /**
     * Create the repair interface HTML structure
     */
    createInterface() {
        // Remove existing interface
        if (this.container) {
            this.hide();
        }
        
        // Create main container
        this.container = document.createElement('div');
        this.container.className = 'station-repair-interface';
        this.container.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid #00ff41;
            color: #00ff41;
            font-family: 'VT323', monospace;
            padding: 20px;
            z-index: 1000;
            box-shadow: 0 0 20px rgba(0, 255, 65, 0.3);
            width: 729px;
            max-height: 85vh;
            overflow-y: auto;
            display: none;
        `;

        // Create header
        this.createHeader();
        
        // Create content wrapper
        this.contentWrapper = document.createElement('div');
        this.contentWrapper.className = 'repair-content-wrapper';
        this.contentWrapper.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 20px;
        `;
        this.container.appendChild(this.contentWrapper);

        // Create panels
        this.createCreditsPanel();
        this.createHullRepairPanel();
        this.createEnergyRechargePanel();
        this.createSystemsRepairPanel();
        this.createSummaryPanel();

        // Add to document
        document.body.appendChild(this.container);
        
        // Add styles
        this.addStyles();
    }
    
    /**
     * Update the interface with current ship data
     */
    updateInterface() {
        if (!this.isVisible || !this.ship) return;
        
        this.updateLocationInfo();
        this.updateCreditsDisplay();
        this.updateHullRepairPanel();
        this.updateEnergyRechargePanel();
        this.updateSystemsGrid();
        this.updateRepairSummary();
    }
    
    /**
     * Update location information
     */
    updateLocationInfo() {
        const locationElement = document.getElementById('repair-location');
        if (!locationElement || !this.dockedLocation) return;
        
        // Remove celestial object name and type - just show generic location
        locationElement.textContent = '';
    }
    
    /**
     * Update credits display
     */
    updateCreditsDisplay() {
        const creditsElement = document.getElementById('credits-display');
        if (!creditsElement) return;
        
        const credits = playerCredits.getCredits();
        creditsElement.textContent = playerCredits.getFormattedCredits();
        creditsElement.style.color = credits > 0 ? '#00ff41' : '#ff4444';
        creditsElement.style.textShadow = credits > 0 ? '0 0 5px rgba(0, 255, 65, 0.5)' : '0 0 5px rgba(255, 68, 68, 0.5)';
        
        // Register for automatic updates
        playerCredits.registerDisplay(creditsElement);
    }
    
    /**
     * Update hull repair panel
     */
    updateHullRepairPanel() {
        const hullStatusElement = document.getElementById('hull-status');
        const hullOptionsElement = document.getElementById('hull-repair-options');
        
        if (!hullStatusElement || !hullOptionsElement || !this.ship) return;
        
        // Add null checks and fallbacks for hull values
        const currentHull = this.ship.currentHull || 0;
        const maxHull = this.ship.maxHull || 1; // Prevent division by zero
        
        // Calculate hull percentage with proper fallbacks
        let hullPercentage = 0;
        if (maxHull > 0) {
            hullPercentage = (currentHull / maxHull) * 100;
        }
        const hullDamage = 100 - hullPercentage;
        
        // Hull status display
        hullStatusElement.innerHTML = `
            <div class="status-line">
                <span>Current Hull Integrity:</span>
                <span class="${this.getHealthClass(hullPercentage)}">${hullPercentage.toFixed(1)}%</span>
            </div>
            <div class="status-line">
                <span>Hull Damage:</span>
                <span>${hullDamage.toFixed(1)}%</span>
            </div>
        `;
        
        // Check if hull values are actually available
        if (maxHull <= 1 || (currentHull === 0 && maxHull === 1)) {
            // Ship has no hull system installed or initialized
            hullOptionsElement.innerHTML = `
                <div class="no-repair-needed">
                    <div class="status-warning">⚠️ No hull plating system detected</div>
                    <div class="status-info">Install hull plating cards to enable hull integrity monitoring</div>
                </div>
            `;
            return;
        }
        
        // Hull repair options
        if (hullDamage > 0) {
            const repairCost = this.calculateHullRepairCost(hullDamage);
            const repairTime = this.calculateHullRepairTime(hullDamage);
            const emergencyMultiplier = this.repairPricing.baseCosts.emergency;
            const emergencyCost = Math.floor(repairCost * emergencyMultiplier);
            
            hullOptionsElement.innerHTML = `
                <div class="repair-option">
                    <div class="option-info">
                        <div class="option-title">Standard Hull Repair</div>
                        <div class="option-details">Repair all hull damage (${hullDamage.toFixed(1)}%)</div>
                        <div class="option-cost">Cost: ${repairCost.toLocaleString()} credits</div>
                        <div class="option-time">Time: ${repairTime} seconds</div>
                    </div>
                    <button class="repair-button" onclick="window.stationRepairInterface?.repairHull(false)" 
                            ${this.playerCredits < repairCost ? 'disabled' : ''}>
                        REPAIR HULL
                    </button>
                </div>
                <div class="repair-option">
                    <div class="option-info">
                        <div class="option-title">Emergency Hull Repair</div>
                        <div class="option-details">Instant hull repair (${hullDamage.toFixed(1)}%)</div>
                        <div class="option-cost">Cost: ${emergencyCost.toLocaleString()} credits</div>
                        <div class="option-time">Time: Instant</div>
                    </div>
                    <button class="repair-button emergency" onclick="window.stationRepairInterface?.repairHull(true)" 
                            ${this.playerCredits < emergencyCost ? 'disabled' : ''}>
                        EMERGENCY REPAIR
                    </button>
                </div>
            `;
        } else {
            hullOptionsElement.innerHTML = `
                <div class="no-repair-needed">
                    <div class="status-good">✓ Hull is at full integrity</div>
                </div>
            `;
        }
    }
    
    /**
     * Update energy recharge panel
     */
    updateEnergyRechargePanel() {
        const energyInfoElement = document.getElementById('energy-recharge-info');
        if (!energyInfoElement || !this.ship) return;
        
        const currentEnergy = this.ship.currentEnergy || 0;
        const maxEnergy = this.ship.maxEnergy || 0;
        const energyPercentage = maxEnergy > 0 ? (currentEnergy / maxEnergy) * 100 : 0;
        const energyDeficit = maxEnergy - currentEnergy;
        
        if (maxEnergy <= 0) {
            energyInfoElement.innerHTML = `
                <div class="no-service-available">
                    <div class="status-warning">⚠️ No energy reactor detected</div>
                    <div class="status-info">Install energy reactor cards to enable energy systems</div>
                </div>
            `;
            return;
        }
        
        // Energy status display
        energyInfoElement.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                    <div class="status-line">
                        <span>Current Energy:</span>
                        <span class="${this.getEnergyClass(energyPercentage)}">${currentEnergy.toFixed(0)} / ${maxEnergy.toFixed(0)}</span>
                    </div>
                    <div class="status-line">
                        <span>Energy Level:</span>
                        <span class="${this.getEnergyClass(energyPercentage)}">${energyPercentage.toFixed(1)}%</span>
                    </div>
                    ${energyDeficit > 0 ? `
                        <div class="status-line">
                            <span>Energy Needed:</span>
                            <span class="status-poor">${energyDeficit.toFixed(0)} units</span>
                        </div>
                    ` : ''}
                </div>
                <div>
                    ${this.createEnergyRechargeOptions(energyDeficit)}
                </div>
            </div>
        `;
    }
    
    /**
     * Get energy status class based on percentage
     * @param {number} energyPercentage - Energy percentage (0-100)
     * @returns {string} CSS class name
     */
    getEnergyClass(energyPercentage) {
        if (energyPercentage >= 80) return 'status-good';
        if (energyPercentage >= 50) return 'status-fair';
        if (energyPercentage >= 25) return 'status-poor';
        return 'status-critical';
    }
    
    /**
     * Create energy recharge options HTML
     * @param {number} energyDeficit - Amount of energy needed
     * @returns {string} HTML for recharge options
     */
    createEnergyRechargeOptions(energyDeficit) {
        if (energyDeficit <= 0) {
            return `
                <div class="no-repair-needed">
                    <div class="status-good">✓ Energy at full capacity</div>
                </div>
            `;
        }
        
        // Calculate costs for different recharge amounts
        const partialRecharge = Math.min(energyDeficit, energyDeficit * 0.5); // 50% of deficit
        const fullRecharge = energyDeficit;
        
        const partialCost = this.calculateEnergyRechargeCost(partialRecharge);
        const fullCost = this.calculateEnergyRechargeCost(fullRecharge);
        const emergencyFullCost = Math.floor(fullCost * this.repairPricing.baseCosts.emergency);
        
        const partialTime = this.calculateEnergyRechargeTime(partialRecharge);
        const fullTime = this.calculateEnergyRechargeTime(fullRecharge);
        
        return `
            <div class="energy-options">
                ${partialRecharge > 0 ? `
                    <div class="repair-option" style="margin-bottom: 10px;">
                        <div class="option-info">
                            <div class="option-title">Partial Recharge</div>
                            <div class="option-details">+${partialRecharge.toFixed(0)} energy units</div>
                            <div class="option-cost">Cost: ${partialCost.toLocaleString()} credits</div>
                            <div class="option-time">Time: ${partialTime}s</div>
                        </div>
                        <button class="repair-button" onclick="window.stationRepairInterface?.rechargeEnergy(${partialRecharge}, false)" 
                                ${this.playerCredits < partialCost ? 'disabled' : ''}>
                            RECHARGE 50%
                        </button>
                    </div>
                ` : ''}
                <div class="repair-option" style="margin-bottom: 10px;">
                    <div class="option-info">
                        <div class="option-title">Full Recharge</div>
                        <div class="option-details">+${fullRecharge.toFixed(0)} energy units</div>
                        <div class="option-cost">Cost: ${fullCost.toLocaleString()} credits</div>
                        <div class="option-time">Time: ${fullTime}s</div>
                    </div>
                    <button class="repair-button" onclick="window.stationRepairInterface?.rechargeEnergy(${fullRecharge}, false)" 
                            ${this.playerCredits < fullCost ? 'disabled' : ''}>
                        FULL RECHARGE
                    </button>
                </div>
                <div class="repair-option">
                    <div class="option-info">
                        <div class="option-title">Emergency Recharge</div>
                        <div class="option-details">Instant full recharge (+${fullRecharge.toFixed(0)} units)</div>
                        <div class="option-cost">Cost: ${emergencyFullCost.toLocaleString()} credits</div>
                        <div class="option-time">Time: Instant</div>
                    </div>
                    <button class="repair-button emergency" onclick="window.stationRepairInterface?.rechargeEnergy(${fullRecharge}, true)" 
                            ${this.playerCredits < emergencyFullCost ? 'disabled' : ''}>
                        EMERGENCY RECHARGE
                    </button>
                </div>
            </div>
        `;
    }
    
    /**
     * Update systems repair grid
     */
    updateSystemsGrid() {
        const systemsGridElement = document.getElementById('systems-grid');
        if (!systemsGridElement || !this.ship) return;
        
        const systems = Array.from(this.ship.systems.entries());
        const damagedSystems = systems.filter(([name, system]) => system.healthPercentage < 1.0);
        
        if (damagedSystems.length === 0) {
            systemsGridElement.innerHTML = `
                <div class="no-repair-needed">
                    <div class="status-good">✓ All systems are operational</div>
                </div>
            `;
            return;
        }
        
        systemsGridElement.innerHTML = damagedSystems.map(([systemName, system]) => {
            const healthPercentage = system.healthPercentage * 100;
            const damage = 100 - healthPercentage;
            const repairCost = this.calculateSystemRepairCost(systemName, system);
            const repairTime = this.calculateSystemRepairTime(systemName, system);
            const isSelected = this.selectedSystems.has(systemName);
            
            return `
                <div class="system-repair-item ${isSelected ? 'selected' : ''}" 
                     onclick="window.stationRepairInterface?.toggleSystemSelection('${systemName}')">
                    <div class="system-info">
                        <div class="system-name">${getSystemDisplayName(systemName)}</div>
                        <div class="system-health ${this.getHealthClass(healthPercentage)}">
                            ${healthPercentage.toFixed(1)}% (${damage.toFixed(1)}% damage)
                        </div>
                        <div class="system-cost">Cost: ${repairCost.toLocaleString()} credits</div>
                        <div class="system-time">Time: ${repairTime} seconds</div>
                    </div>
                    <div class="system-checkbox">
                        <div class="checkbox ${isSelected ? 'checked' : ''}">
                            ${isSelected ? '✓' : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    /**
     * Update repair summary panel
     */
    updateRepairSummary() {
        const summaryElement = document.getElementById('repair-summary');
        const actionsElement = document.getElementById('repair-actions');
        
        if (!summaryElement || !actionsElement) return;
        
        const selectedSystemsArray = Array.from(this.selectedSystems);
        const totalCost = this.calculateTotalRepairCost();
        const totalTime = this.calculateTotalRepairTime();
        
        if (selectedSystemsArray.length === 0) {
            summaryElement.innerHTML = `
                <div class="summary-line">No systems selected for repair</div>
            `;
            actionsElement.innerHTML = `
                <button class="repair-button" disabled>SELECT SYSTEMS TO REPAIR</button>
            `;
        } else {
            summaryElement.innerHTML = `
                <div class="summary-line">
                    <span>Selected Systems:</span>
                    <span>${selectedSystemsArray.length}</span>
                </div>
                <div class="summary-line">
                    <span>Total Cost:</span>
                    <span>${totalCost.toLocaleString()} credits</span>
                </div>
                <div class="summary-line">
                    <span>Total Time:</span>
                    <span>${totalTime} seconds</span>
                </div>
                <div class="summary-line">
                    <span>Credits After Repair:</span>
                    <span class="${this.playerCredits >= totalCost ? 'status-good' : 'status-critical'}">
                        ${(this.playerCredits - totalCost).toLocaleString()}
                    </span>
                </div>
            `;
            
            const emergencyMultiplier = this.repairPricing.baseCosts.emergency;
            const emergencyCost = Math.floor(totalCost * emergencyMultiplier);
            
            actionsElement.innerHTML = `
                <div class="repair-actions-grid">
                    <button class="repair-button" onclick="window.stationRepairInterface?.selectAllSystems()">
                        SELECT ALL
                    </button>
                    <button class="repair-button" onclick="window.stationRepairInterface?.clearSelection()">
                        CLEAR ALL
                    </button>
                    <button class="repair-button" onclick="window.stationRepairInterface?.repairSelectedSystems(false)" 
                            ${this.playerCredits < totalCost ? 'disabled' : ''}>
                        REPAIR SELECTED (${totalTime}s)
                    </button>
                    <button class="repair-button emergency" onclick="window.stationRepairInterface?.repairSelectedSystems(true)" 
                            ${this.playerCredits < emergencyCost ? 'disabled' : ''}>
                        EMERGENCY REPAIR (${emergencyCost.toLocaleString()})
                    </button>
                </div>
            `;
        }
    }
    
    /**
     * Calculate hull repair cost
     * @param {number} damagePercentage - Percentage of hull damage
     * @returns {number} Repair cost in credits
     */
    calculateHullRepairCost(damagePercentage) {
        const baseCost = this.repairPricing.baseCosts.hull * damagePercentage;
        const shipMultiplier = this.getShipClassMultiplier();
        const factionMultiplier = this.getFactionMultiplier();
        
        return Math.floor(baseCost * shipMultiplier * factionMultiplier);
    }
    
    /**
     * Calculate hull repair time
     * @param {number} damagePercentage - Percentage of hull damage
     * @returns {number} Repair time in seconds
     */
    calculateHullRepairTime(damagePercentage) {
        return Math.floor(this.repairPricing.repairTimes.hull * damagePercentage);
    }
    
    /**
     * Calculate system repair cost
     * @param {string} systemName - Name of the system
     * @param {Object} system - System instance
     * @returns {number} Repair cost in credits
     */
    calculateSystemRepairCost(systemName, system) {
        const damage = 1 - system.healthPercentage;
        const baseCost = this.repairPricing.baseCosts.system * damage;
        const criticalMultiplier = this.isCriticalSystem(systemName) ? this.repairPricing.baseCosts.critical : 1.0;
        const shipMultiplier = this.getShipClassMultiplier();
        const factionMultiplier = this.getFactionMultiplier();
        
        return Math.floor(baseCost * criticalMultiplier * shipMultiplier * factionMultiplier);
    }
    
    /**
     * Calculate system repair time
     * @param {string} systemName - Name of the system
     * @param {Object} system - System instance
     * @returns {number} Repair time in seconds
     */
    calculateSystemRepairTime(systemName, system) {
        const damage = 1 - system.healthPercentage;
        const baseTime = this.repairPricing.repairTimes.system * damage;
        const criticalMultiplier = this.isCriticalSystem(systemName) ? 1.5 : 1.0;
        
        return Math.floor(baseTime * criticalMultiplier);
    }
    
    /**
     * Calculate total repair cost for selected systems
     * @returns {number} Total cost in credits
     */
    calculateTotalRepairCost() {
        let totalCost = 0;
        
        for (const systemName of this.selectedSystems) {
            const system = this.ship.getSystem(systemName);
            if (system) {
                totalCost += this.calculateSystemRepairCost(systemName, system);
            }
        }
        
        return totalCost;
    }
    
    /**
     * Calculate total repair time for selected systems
     * @returns {number} Total time in seconds
     */
    calculateTotalRepairTime() {
        let totalTime = 0;
        
        for (const systemName of this.selectedSystems) {
            const system = this.ship.getSystem(systemName);
            if (system) {
                totalTime += this.calculateSystemRepairTime(systemName, system);
            }
        }
        
        return totalTime;
    }
    
    /**
     * Calculate energy recharge cost
     * @param {number} energyToRecharge - Amount of energy to recharge
     * @returns {number} Cost in credits
     */
    calculateEnergyRechargeCost(energyToRecharge) {
        const baseCost = this.repairPricing.baseCosts.energy * energyToRecharge;
        const shipMultiplier = this.getShipClassMultiplier();
        const factionMultiplier = this.getFactionMultiplier();
        
        return Math.floor(baseCost * shipMultiplier * factionMultiplier);
    }
    
    /**
     * Calculate energy recharge time
     * @param {number} energyToRecharge - Amount of energy to recharge
     * @returns {number} Time in seconds
     */
    calculateEnergyRechargeTime(energyToRecharge) {
        const baseTime = this.repairPricing.repairTimes.energy * energyToRecharge;
        return Math.floor(baseTime);
    }
    
    /**
     * Get ship class multiplier for repair costs
     * @returns {number} Multiplier value
     */
    getShipClassMultiplier() {
        const shipType = this.ship.shipType || 'light_fighter';
        return this.repairPricing.shipClassMultipliers[shipType] || 1.0;
    }
    
    /**
     * Get faction multiplier for repair costs
     * @returns {number} Multiplier value
     */
    getFactionMultiplier() {
        if (!this.dockedLocation) return 1.0;
        
        const info = this.starfieldManager.solarSystemManager.getCelestialBodyInfo(this.dockedLocation);
        const diplomacy = info?.diplomacy || 'neutral';
        
        return this.repairPricing.factionDiscounts[diplomacy] || 1.0;
    }
    
    /**
     * Check if a system is critical
     * @param {string} systemName - Name of the system
     * @returns {boolean} True if system is critical
     */
    isCriticalSystem(systemName) {
        const criticalSystems = ['hull_plating', 'energy_reactor', 'impulse_engines', 'life_support'];
        return criticalSystems.includes(systemName);
    }
    
    /**
     * Get health class for color coding
     * @param {number} healthPercentage - Health percentage (0-100)
     * @returns {string} CSS class name
     */
    getHealthClass(healthPercentage) {
        if (healthPercentage >= 75) return 'status-good';
        if (healthPercentage >= 50) return 'status-fair';
        if (healthPercentage >= 25) return 'status-poor';
        return 'status-critical';
    }
    
    /**
     * Toggle system selection for repair
     * @param {string} systemName - Name of the system to toggle
     */
    toggleSystemSelection(systemName) {
        if (this.selectedSystems.has(systemName)) {
            this.selectedSystems.delete(systemName);
        } else {
            this.selectedSystems.add(systemName);
        }
        
        this.updateInterface();
    }
    
    /**
     * Select all damaged systems for repair
     */
    selectAllSystems() {
        this.selectedSystems.clear();
        
        for (const [systemName, system] of this.ship.systems) {
            if (system.healthPercentage < 1.0) {
                this.selectedSystems.add(systemName);
            }
        }
        
        this.updateInterface();
    }
    
    /**
     * Clear all system selections
     */
    clearSelection() {
        this.selectedSystems.clear();
        this.updateInterface();
    }
    
    /**
     * Repair hull damage
     * @param {boolean} emergency - Whether to use emergency repair (instant)
     */
    repairHull(emergency = false) {
        if (!this.ship) return;
        
        // Add null checks and fallbacks for hull values
        const currentHull = this.ship.currentHull || 0;
        const maxHull = this.ship.maxHull || 1; // Prevent division by zero
        
        // Check if hull values are actually available
        if (maxHull <= 1 || (currentHull === 0 && maxHull === 1)) {
debug('AI', 'No hull plating system detected - cannot repair hull');
            return;
        }
        
        // Calculate hull percentage with proper fallbacks
        let hullPercentage = 0;
        if (maxHull > 0) {
            hullPercentage = (currentHull / maxHull) * 100;
        }
        const hullDamage = 100 - hullPercentage;
        
        if (hullDamage <= 0) {
debug('UI', 'Hull is already at full integrity');
            return;
        }
        
        const baseCost = this.calculateHullRepairCost(hullDamage);
        const cost = emergency ? Math.floor(baseCost * this.repairPricing.baseCosts.emergency) : baseCost;
        
        if (this.playerCredits < cost) {
debug('AI', 'Insufficient credits for hull repair');
            return;
        }
        
        // Deduct credits
        this.playerCredits -= cost;
        
        // Repair hull
        this.ship.currentHull = this.ship.maxHull;
        
        // Show repair progress
        if (emergency) {
debug('AI', `Emergency hull repair completed instantly for ${cost.toLocaleString()} credits`);
        } else {
            const repairTime = this.calculateHullRepairTime(hullDamage);
debug('AI', `Hull repair completed in ${repairTime} seconds for ${cost.toLocaleString()} credits`);
            this.simulateRepairProgress('Hull', repairTime);
        }
        
        this.updateInterface();
    }
    
    /**
     * Repair selected systems
     * @param {boolean} emergency - Whether to use emergency repair (instant)
     */
    repairSelectedSystems(emergency = false) {
        if (this.selectedSystems.size === 0) {
debug('AI', 'No systems selected for repair');
            return;
        }
        
        const baseCost = this.calculateTotalRepairCost();
        const cost = emergency ? Math.floor(baseCost * this.repairPricing.baseCosts.emergency) : baseCost;
        
        if (this.playerCredits < cost) {
debug('AI', 'Insufficient credits for system repairs');
            return;
        }
        
        // Deduct credits
        this.playerCredits -= cost;
        
        // Repair selected systems
        const repairedSystems = [];
        for (const systemName of this.selectedSystems) {
            const system = this.ship.getSystem(systemName);
            if (system) {
                system.repair(1.0); // Full repair
                repairedSystems.push(getSystemDisplayName(systemName));
            }
        }
        
        // Show repair progress
        if (emergency) {
debug('AI', `Emergency repair completed instantly for ${repairedSystems.length} systems: ${repairedSystems.join(', ')}`);
        } else {
            const repairTime = this.calculateTotalRepairTime();
debug('AI', `System repairs completed in ${repairTime} seconds for ${repairedSystems.length} systems: ${repairedSystems.join(', ')}`);
            this.simulateRepairProgress(`${repairedSystems.length} Systems`, repairTime);
        }
        
        // Clear selection
        this.selectedSystems.clear();
        this.updateInterface();
    }
    
    /**
     * Recharge ship energy for credits
     * @param {number} energyAmount - Amount of energy to recharge (optional, defaults to full)
     * @param {boolean} emergency - Whether to use emergency recharge (instant)
     */
    rechargeEnergy(energyAmount = null, emergency = false) {
        if (!this.ship) {
debug('AI', 'No ship available for energy recharge');
            return false;
        }
        
        const currentEnergy = this.ship.currentEnergy || 0;
        const maxEnergy = this.ship.maxEnergy || 0;
        
        if (maxEnergy <= 0) {
debug('UI', 'No energy reactor system detected');
            return false;
        }
        
        // Calculate energy to recharge
        const energyDeficit = maxEnergy - currentEnergy;
        const actualRechargeAmount = energyAmount !== null ? Math.min(energyAmount, energyDeficit) : energyDeficit;
        
        if (actualRechargeAmount <= 0) {
debug('UI', 'Energy is already at full capacity');
            return false;
        }
        
        // Calculate cost
        const baseCost = this.calculateEnergyRechargeCost(actualRechargeAmount);
        const cost = emergency ? Math.floor(baseCost * this.repairPricing.baseCosts.emergency) : baseCost;
        
        if (this.playerCredits < cost) {
debug('UI', 'Insufficient credits for energy recharge');
            return false;
        }
        
        // Deduct credits
        this.playerCredits -= cost;
        
        // Recharge energy
        this.ship.currentEnergy = Math.min(currentEnergy + actualRechargeAmount, maxEnergy);
        
        // Show recharge progress
        if (emergency) {
debug('UI', `Emergency energy recharge completed instantly: +${actualRechargeAmount.toFixed(0)} energy for ${cost.toLocaleString()} credits`);
        } else {
            const rechargeTime = this.calculateEnergyRechargeTime(actualRechargeAmount);
debug('UI', `Energy recharge completed: +${actualRechargeAmount.toFixed(0)} energy in ${rechargeTime}s for ${cost.toLocaleString()} credits`);
            this.simulateRepairProgress(`Energy Recharge (+${actualRechargeAmount.toFixed(0)})`, rechargeTime);
        }
        
        // Update interface
        this.updateInterface();
        
debug('UI', `Ship energy recharged: ${currentEnergy.toFixed(0)} → ${this.ship.currentEnergy.toFixed(0)} / ${maxEnergy.toFixed(0)}`);
        return true;
    }

    /**
     * Simulate repair progress (for non-emergency repairs)
     * @param {string} repairType - Type of repair being performed
     * @param {number} duration - Duration in seconds
     */
    simulateRepairProgress(repairType, duration) {
        // This would show a progress bar in a real implementation
        // For now, just log the progress
debug('AI', `${repairType} repair in progress... (${duration}s)`);
        
        // In a real implementation, this would:
        // 1. Show a progress bar
        // 2. Disable other actions during repair
        // 3. Update progress every second
        // 4. Complete repair when done
    }
    
    /**
     * Add CSS styles for the repair interface
     */
    addStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
            
            .station-repair-interface.visible {
                display: block !important;
            }
            
            .repair-option {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin: 15px 0;
                padding: 15px;
                border: 1px solid rgba(0, 255, 65, 0.5);
                background: rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
                color: #00ff41;
            }
            
            .repair-option:hover {
                background: rgba(0, 255, 65, 0.1);
                border-color: #00ff41;
                box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
            }
            
            .option-info, .option-title, .option-details, .option-cost, .option-time {
                color: #00ff41;
                text-shadow: 0 0 3px rgba(0, 255, 65, 0.3);
            }
            
            .repair-button {
                background: rgba(0, 20, 0, 0.5);
                border: 2px solid #00ff41;
                color: #00ff41;
                font-family: inherit;
                font-size: 14px;
                padding: 10px 20px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-shadow: 0 0 5px rgba(0, 255, 65, 0.3);
            }
            
            .repair-button:hover:not(:disabled) {
                background: rgba(0, 255, 65, 0.15);
                transform: scale(1.05);
                box-shadow: 0 0 15px rgba(0, 255, 65, 0.4);
            }
            
            .repair-button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                background: rgba(100, 100, 100, 0.2);
                border-color: #666666;
                color: #999999;
                text-shadow: none;
            }
            
            .repair-button.emergency {
                border-color: #ff4444;
                color: #ff4444;
                text-shadow: 0 0 5px rgba(255, 68, 68, 0.3);
            }
            
            .repair-button.emergency:hover:not(:disabled) {
                background: rgba(255, 68, 68, 0.15);
                box-shadow: 0 0 15px rgba(255, 68, 68, 0.4);
            }
            
            .system-repair-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 15px;
                border: 1px solid rgba(0, 255, 65, 0.5);
                cursor: pointer;
                transition: all 0.3s ease;
                background: rgba(0, 0, 0, 0.3);
                color: #00ff41;
            }
            
            .system-repair-item:hover {
                background: rgba(0, 255, 65, 0.1);
                border-color: #00ff41;
                box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
            }
            
            .system-repair-item.selected {
                border-color: #00ff41;
                background: rgba(0, 255, 65, 0.2);
                box-shadow: 0 0 15px rgba(0, 255, 65, 0.4);
            }
            
            .system-info, .system-name, .system-health, .system-cost, .system-time {
                color: #00ff41;
                text-shadow: 0 0 3px rgba(0, 255, 65, 0.3);
            }
            
            .checkbox {
                width: 20px;
                height: 20px;
                border: 2px solid #00ff41;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 14px;
                background: rgba(0, 0, 0, 0.3);
                transition: all 0.3s ease;
                margin-left: 15px;
                color: #00ff41;
            }
            
            .checkbox.checked {
                background: rgba(0, 255, 65, 0.3);
                box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
            }
            
            .status-good { color: #00ff41; text-shadow: 0 0 5px rgba(0, 255, 65, 0.5); }
            .status-fair { color: #00ff41; text-shadow: 0 0 5px rgba(0, 255, 65, 0.5); }
            .status-poor { color: #00ff41; text-shadow: 0 0 5px rgba(0, 255, 65, 0.5); }
            .status-critical { color: #ff4444; text-shadow: 0 0 5px rgba(255, 68, 68, 0.5); }
            .status-warning { color: #ff4444; text-shadow: 0 0 5px rgba(255, 68, 68, 0.5); }
            .status-info { color: #00ff41; text-shadow: 0 0 5px rgba(0, 255, 65, 0.5); }
            
            .status-line {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid rgba(0, 255, 65, 0.2);
                font-size: 14px;
                color: #00ff41;
            }
            
            .status-line:last-child {
                border-bottom: none;
            }
            
            .status-line span {
                color: #00ff41;
                text-shadow: 0 0 3px rgba(0, 255, 65, 0.3);
            }
            
            .energy-options .repair-option {
                margin-bottom: 8px;
                padding: 10px;
                font-size: 12px;
            }
            
            .energy-options .option-info {
                margin-bottom: 8px;
            }
            
            .energy-options .option-title {
                font-weight: bold;
                font-size: 13px;
                color: #00ff41;
            }
            
            .energy-options .option-details {
                font-size: 11px;
                opacity: 0.8;
                color: #00ff41;
            }
            
            .energy-options .option-cost,
            .energy-options .option-time {
                font-size: 11px;
                opacity: 0.9;
                color: #00ff41;
            }
            
            .no-service-available {
                text-align: center;
                padding: 20px;
                border: 1px solid rgba(255, 68, 68, 0.5);
                background: rgba(255, 68, 68, 0.1);
                border-radius: 4px;
                color: #ff4444;
            }
            
            .no-repair-needed {
                text-align: center;
                padding: 20px;
                border: 1px solid rgba(0, 255, 65, 0.5);
                background: rgba(0, 255, 65, 0.1);
                border-radius: 4px;
                color: #00ff41;
                text-shadow: 0 0 5px rgba(0, 255, 65, 0.3);
            }
            
            .repair-actions-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
                margin-top: 15px;
            }
            
            .summary-line {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid rgba(0, 255, 65, 0.2);
                font-size: 14px;
                color: #00ff41;
            }
            
            .summary-line:last-child {
                border-bottom: none;
            }
            
            .summary-line span {
                color: #00ff41;
                text-shadow: 0 0 3px rgba(0, 255, 65, 0.3);
            }
        `;
        
        if (!document.head.querySelector('style[data-repair-interface]')) {
            style.setAttribute('data-repair-interface', 'true');
            document.head.appendChild(style);
        }
    }
    
    createHeader() {
        this.header = document.createElement('div');
        this.header.className = 'repair-header';
        this.header.style.cssText = `
            border-bottom: 2px solid #00ff41;
            padding-bottom: 15px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        this.header.innerHTML = `
            <div>
                <div style="font-size: 20px; font-weight: bold; color: #00ff41; text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);">STATION REPAIR SERVICES</div>
                <div id="repair-location" style="font-size: 14px; color: #00ff41; opacity: 0.8; margin-top: 5px; text-shadow: 0 0 3px rgba(0, 255, 65, 0.3);"></div>
            </div>
            <button class="close-button" style="
                background: rgba(0, 20, 0, 0.5);
                border: 2px solid #00ff41;
                color: #00ff41;
                font-family: inherit;
                font-size: 14px;
                padding: 8px 15px;
                cursor: pointer;
                transition: all 0.3s ease;
                text-shadow: 0 0 5px rgba(0, 255, 65, 0.3);
            ">← BACK</button>
        `;
        
        // Add close button functionality
        const closeButton = this.header.querySelector('.close-button');
        closeButton.addEventListener('click', () => this.returnToDocking());
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.background = 'rgba(0, 255, 65, 0.15)';
            closeButton.style.boxShadow = '0 0 15px rgba(0, 255, 65, 0.4)';
        });
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.background = 'rgba(0, 20, 0, 0.5)';
            closeButton.style.boxShadow = 'none';
        });
        
        this.container.appendChild(this.header);
    }
    
    createCreditsPanel() {
        const panel = document.createElement('div');
        panel.className = 'credits-panel';
        panel.style.cssText = `
            border: 2px solid #00ff41;
            padding: 15px;
            background: rgba(0, 20, 0, 0.3);
        `;
        
        panel.innerHTML = `
            <div style="font-size: 16px; font-weight: bold; color: #00ff41; margin-bottom: 15px; text-shadow: 0 0 5px rgba(0, 255, 65, 0.3);">CREDITS AVAILABLE</div>
            <div id="credits-display" style="font-size: 24px; font-weight: bold; text-align: center; padding: 15px; border: 1px solid rgba(0, 255, 65, 0.5); background: rgba(0, 0, 0, 0.3); color: #00ff41; text-shadow: 0 0 10px rgba(0, 255, 65, 0.5);">${playerCredits.getFormattedCredits()}</div>
        `;
        
        this.contentWrapper.appendChild(panel);
    }
    
    createHullRepairPanel() {
        const panel = document.createElement('div');
        panel.className = 'hull-repair-panel';
        panel.style.cssText = `
            border: 2px solid #00ff41;
            padding: 15px;
            background: rgba(0, 20, 0, 0.3);
        `;
        
        panel.innerHTML = `
            <div style="font-size: 16px; font-weight: bold; color: #00ff41; margin-bottom: 15px; text-shadow: 0 0 5px rgba(0, 255, 65, 0.3);">HULL REPAIR</div>
            <div id="hull-status"></div>
            <div id="hull-repair-options"></div>
        `;
        
        this.contentWrapper.appendChild(panel);
    }
    
    createEnergyRechargePanel() {
        const panel = document.createElement('div');
        panel.className = 'energy-recharge-panel';
        panel.style.cssText = `
            border: 2px solid #00ff41;
            padding: 15px;
            background: rgba(0, 20, 0, 0.3);
            grid-column: 1 / -1;
        `;
        
        panel.innerHTML = `
            <div style="font-size: 16px; font-weight: bold; color: #00ff41; margin-bottom: 15px; text-shadow: 0 0 5px rgba(0, 255, 65, 0.3);">ENERGY RECHARGE</div>
            <div id="energy-recharge-info"></div>
        `;
        
        this.contentWrapper.appendChild(panel);
    }
    
    createSystemsRepairPanel() {
        const panel = document.createElement('div');
        panel.className = 'systems-repair-panel';
        panel.style.cssText = `
            border: 2px solid #00ff41;
            padding: 15px;
            background: rgba(0, 20, 0, 0.3);
            grid-column: 1 / -1;
        `;
        
        panel.innerHTML = `
            <div style="font-size: 16px; font-weight: bold; color: #00ff41; margin-bottom: 15px; text-shadow: 0 0 5px rgba(0, 255, 65, 0.3);">SYSTEM REPAIRS</div>
            <div id="systems-grid" style="display: grid; gap: 15px; max-height: 300px; overflow-y: auto;"></div>
        `;
        
        this.contentWrapper.appendChild(panel);
    }
    
    createSummaryPanel() {
        const panel = document.createElement('div');
        panel.className = 'repair-summary-panel';
        panel.style.cssText = `
            border: 2px solid #00ff41;
            padding: 15px;
            background: rgba(0, 20, 0, 0.3);
            grid-column: 1 / -1;
        `;
        
        panel.innerHTML = `
            <div style="font-size: 16px; font-weight: bold; color: #00ff41; margin-bottom: 15px; text-shadow: 0 0 5px rgba(0, 255, 65, 0.3);">REPAIR SUMMARY</div>
            <div id="repair-summary"></div>
            <div id="repair-actions"></div>
        `;
        
        this.contentWrapper.appendChild(panel);
    }
} 