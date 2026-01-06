import { debug } from '../debug.js';
import { getSystemDisplayName } from '../ship/System.js';
import { DCHToggleHandler } from './damageControl/DCHToggleHandler.js';
import { DCHSystemCardRenderer } from './damageControl/DCHSystemCardRenderer.js';

/**
 * Operations Report HUD Implementation
 * Shows ship systems status and repair management
 * No legacy conflicts, simple event handling, clean architecture
 */

export default class DamageControlHUD {
    constructor(ship, containerElement, starfieldManager) {
        this.ship = ship;
        this.container = containerElement;
        this.starfieldManager = starfieldManager;
        this.isVisible = false;
        this.manualRepairSystem = {
            isRepairing: false,
            repairTarget: null,
            repairStartTime: 0,
            repairDuration: 5000 // 5 seconds
        };

        this.elements = {};
        this.updateInterval = null;
        this.buttonStateInterval = null;

        // Bound event handlers for proper cleanup
        this._boundHandlers = {
            closeButtonClick: null,
            closeButtonMouseEnter: null,
            closeButtonMouseLeave: null,
            systemsListClick: null
        };

        // Store close button reference for cleanup
        this._closeButton = null;

        // Memory leak prevention: track style element for cleanup
        this._styleElement = null;

        // Track dynamically created button handlers for cleanup
        this._buttonHandlers = new Map(); // Maps button element -> {mouseenter, mouseleave}

        // Track pending timeouts for cleanup on dispose
        this._pendingTimeouts = new Set();

        // Initialize extracted handlers
        this.toggleHandler = new DCHToggleHandler(this);
        this.cardRenderer = new DCHSystemCardRenderer(this);

        this.init();
    }
    
    init() {
        // Create the main structure
        this.container.innerHTML = '';
        this.container.style.cssText = `
            position: fixed;
            top: 80px;
            right: 10px;
            width: 300px;
            max-height: 56vh;
            overflow-y: auto;
            border: 2px solid #00ff41;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff41;
            font-family: "Courier New", monospace;
            font-size: 14px;
            padding: 10px;
            display: none;
            pointer-events: auto;
            z-index: 1000;
        `;
        
        this.createHeader();
        this.createWarpStatusSection();
        this.createManualRepairSection();
        this.createSystemsList();
        this.bindEvents();
    }
    
    createHeader() {
        this.elements.header = document.createElement('div');
        this.elements.header.style.cssText = `
            font-weight: bold;
            font-size: 18px;
            margin-bottom: 12px;
            border-bottom: 2px solid #00ff41;
            padding-bottom: 4px;
            text-align: center;
            position: relative;
        `;
        
        // Create header content container
        const headerContent = document.createElement('div');
        headerContent.textContent = 'OPERATIONS REPORT';
        
        // Create close button
        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            position: absolute;
            top: -8px;
            right: 0;
            background: rgba(0, 255, 65, 0.2);
            border: 1px solid #00ff41;
            color: #00ff41;
            font-size: 20px;
            font-weight: bold;
            width: 24px;
            height: 24px;
            border-radius: 3px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            line-height: 1;
            transition: all 0.2s ease;
            text-shadow: 0 0 4px rgba(0, 255, 65, 0.6);
        `;
        
        // Store close button reference for cleanup
        this._closeButton = closeButton;

        // Create bound handlers for cleanup
        this._boundHandlers.closeButtonMouseEnter = () => {
            closeButton.style.backgroundColor = 'rgba(0, 255, 65, 0.4)';
            closeButton.style.boxShadow = '0 0 12px rgba(0, 255, 65, 0.8)';
            closeButton.style.textShadow = '0 0 8px rgba(0, 255, 65, 1)';
        };

        this._boundHandlers.closeButtonMouseLeave = () => {
            closeButton.style.backgroundColor = 'rgba(0, 255, 65, 0.2)';
            closeButton.style.boxShadow = 'none';
            closeButton.style.textShadow = '0 0 4px rgba(0, 255, 65, 0.6)';
        };

        this._boundHandlers.closeButtonClick = () => {
            // Use the same method as the O key to properly sync state
            if (this.starfieldManager && this.starfieldManager.toggleDamageControl) {
                this.starfieldManager.playCommandSound();
                this.starfieldManager.toggleDamageControl();
            } else {
                // Fallback if starfieldManager is not available
                this.hide();
            }
        };

        // Add hover effects
        closeButton.addEventListener('mouseenter', this._boundHandlers.closeButtonMouseEnter);
        closeButton.addEventListener('mouseleave', this._boundHandlers.closeButtonMouseLeave);

        // Add click handler to close the ops HUD
        closeButton.addEventListener('click', this._boundHandlers.closeButtonClick);

        this.elements.header.appendChild(headerContent);
        this.elements.header.appendChild(closeButton);
        this.container.appendChild(this.elements.header);
    }
    
    createWarpStatusSection() {
        this.elements.warpStatus = document.createElement('div');
        this.elements.warpStatus.style.cssText = `
            margin-bottom: 15px;
            padding: 8px;
            border: 1px solid rgba(0, 255, 65, 0.3);
            background: rgba(0, 255, 65, 0.05);
            border-radius: 4px;
            display: none;
        `;
        
        this.elements.warpStatus.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 6px; text-align: center;">
                🚀 WARP STATUS
            </div>
            <div class="warp-progress-container" style="margin-bottom: 6px;">
                <div class="warp-progress-bar" style="
                    width: 100%;
                    height: 8px;
                    background: rgba(0, 255, 65, 0.2);
                    border: 1px solid rgba(0, 255, 65, 0.4);
                    border-radius: 2px;
                    overflow: hidden;
                ">
                    <div class="warp-progress-fill" style="
                        height: 100%;
                        background: linear-gradient(90deg, #00ff41, #44ff88);
                        width: 0%;
                        transition: width 0.3s ease;
                    "></div>
                </div>
            </div>
            <div class="warp-status-text" style="
                font-size: 12px;
                text-align: center;
                color: rgba(0, 255, 65, 0.9);
            ">
                Standby
            </div>
        `;
        
        this.container.appendChild(this.elements.warpStatus);
    }
    
    createManualRepairSection() {
        this.elements.repairContainer = document.createElement('div');
        this.elements.repairContainer.style.cssText = `
            margin-bottom: 15px;
            padding: 8px;
            border: 1px solid #555;
            border-radius: 4px;
            background-color: rgba(0, 0, 0, 0.4);
        `;
        
        this.elements.repairLabel = document.createElement('div');
        this.elements.repairLabel.style.cssText = `
            font-size: 12px;
            color: #aaa;
            margin-bottom: 4px;
            text-align: center;
        `;
        this.elements.repairLabel.textContent = 'Manual Repair System';
        
        this.elements.repairBarContainer = document.createElement('div');
        this.elements.repairBarContainer.style.cssText = `
            width: 100%;
            height: 8px;
            background-color: #333;
            border-radius: 4px;
            overflow: hidden;
        `;
        
        this.elements.repairBar = document.createElement('div');
        this.elements.repairBar.style.cssText = `
            height: 100%;
            background-color: #555;
            width: 0%;
            transition: width 0.1s ease;
        `;
        
        this.elements.repairBarContainer.appendChild(this.elements.repairBar);
        this.elements.repairContainer.appendChild(this.elements.repairLabel);
        this.elements.repairContainer.appendChild(this.elements.repairBarContainer);
        this.container.appendChild(this.elements.repairContainer);
    }
    
    createSystemsList() {
        this.elements.systemsList = document.createElement('div');
        this.elements.systemsList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 8px;
            max-height: 35vh;
            overflow-y: auto;
            padding-right: 5px;
        `;
        
        // Add custom scrollbar styling (only if not already added)
        if (!this._styleElement) {
            const style = document.createElement('style');
            style.textContent = `
                .damage-control-systems-list::-webkit-scrollbar {
                    width: 8px;
                }
                .damage-control-systems-list::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.3);
                    border-radius: 4px;
                }
                .damage-control-systems-list::-webkit-scrollbar-thumb {
                    background: #00ff41;
                    border-radius: 4px;
                }
                .damage-control-systems-list::-webkit-scrollbar-thumb:hover {
                    background: #00cc33;
                }
            `;
            document.head.appendChild(style);
            this._styleElement = style; // Track for cleanup
        }
        
        this.elements.systemsList.className = 'damage-control-systems-list';
        this.container.appendChild(this.elements.systemsList);
    }
    
    bindEvents() {
        // Create bound handler for cleanup
        this._boundHandlers.systemsListClick = (event) => {
            // Handle regular toggle buttons
            if (event.target.matches('.damage-control-toggle-btn')) {
                const systemName = event.target.dataset.systemName;
                debug('UI', `🔧 Button clicked: systemName=${systemName}, disabled=${event.target.disabled}`);
                if (systemName && !event.target.disabled) {
                    debug('AI', `🔧 Toggle button clicked for: ${systemName}`);
                    this.toggleSystem(systemName);
                } else {
                    debug('UI', `🔧 Button click ignored: ${!systemName ? 'no system name' : 'button disabled'}`);
                }
            }
            // Handle impulse speed control buttons
            else if (event.target.matches('.impulse-speed-btn')) {
                const systemName = event.target.dataset.systemName;
                const action = event.target.dataset.action;

                if (systemName && action && !event.target.disabled) {
                    debug('UI', `🔧 Speed button clicked: systemName=${systemName}, action=${action}`);
                    this.adjustImpulseSpeed(action);
                }
            }
        };

        // Event delegation for both toggle buttons and speed control buttons
        this.elements.systemsList.addEventListener('click', this._boundHandlers.systemsListClick);
    }
    
    adjustImpulseSpeed(action) {
        const ship = this.ship;
        const impulseEngines = ship?.getSystem('impulse_engines');
        
        if (!impulseEngines) {
            debug('UI', '⚠️ Cannot adjust impulse speed: no impulse engines');
            return;
        }
        
        const currentSpeed = impulseEngines.getImpulseSpeed();
        let requestedSpeed = currentSpeed;
        
        if (action === 'increase') {
            requestedSpeed = currentSpeed + 1;
        } else if (action === 'decrease') {
            requestedSpeed = currentSpeed - 1;
        }
        
        // Don't allow negative speeds
        if (requestedSpeed < 0) {
            requestedSpeed = 0;
        }
        
        if (requestedSpeed !== currentSpeed) {
            // Use EXACTLY the same logic as 0-9 keys from StarfieldManager
            
            // Check if the requested speed exceeds the engine's maximum capability
            const maxSpeed = impulseEngines.getMaxImpulseSpeed();
            if (requestedSpeed > maxSpeed) {
                // Requested speed exceeds engine capability - play command failed sound and abort
                this.starfieldManager.playCommandFailedSound();
                return; // Abort without changing speed
            }
            
            impulseEngines.setImpulseSpeed(requestedSpeed);
            // Get the actual clamped speed from the impulse engines
            const actualSpeed = impulseEngines.getImpulseSpeed();
            
            // Set target speed to the actual clamped speed (same as 0-9 keys)
            this.starfieldManager.targetSpeed = actualSpeed;
            
            // Determine if we need to decelerate (same as 0-9 keys)
            if (actualSpeed < this.starfieldManager.currentSpeed) {
                this.starfieldManager.decelerating = true;
                // Start engine shutdown if going to zero
                if (actualSpeed === 0 && this.starfieldManager.engineState === 'running') {
                    this.starfieldManager.playEngineShutdown();
                }
            } else {
                this.starfieldManager.decelerating = false;
                // Handle engine sounds for acceleration
                const sounds = this.starfieldManager.audioManager.areSoundsLoaded();
                if (sounds.engine) {
                    if (this.starfieldManager.audioManager.getEngineState() === 'stopped') {
                        this.starfieldManager.audioManager.playEngineStartup();
                    } else if (this.starfieldManager.audioManager.getEngineState() === 'running') {
                        this.starfieldManager.audioManager.updateEngineVolume(actualSpeed, this.starfieldManager.maxSpeed);
                    }
                }
            }
            
            // Refresh the ops HUD to update the speed display
            this._setTimeout(() => this.refresh(), 50);
        }
    }
    
    show() {
        this.isVisible = true;
        this.container.style.display = 'block';
        
        // SIMPLIFIED: Just refresh the display - card system refresh is handled by toggleDamageControl()
        debug('COMBAT', '🔄 Operations HUD opening - refreshing display...');
        this.refresh();
        
        // Start update loops
        if (!this.updateInterval) {
            this.updateInterval = setInterval(() => {
                this.updateRepairProgress();
            }, 100);
        }
        
        // Start button state monitoring loop
        if (!this.buttonStateInterval) {
            this.buttonStateInterval = setInterval(() => {
                this.updateAllButtonStates();
            }, 500); // Check button states every 500ms
        }
    }
    
    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';
        
        // Stop update loops
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.buttonStateInterval) {
            clearInterval(this.buttonStateInterval);
            this.buttonStateInterval = null;
        }
    }
    
    refresh() {
        if (!this.isVisible) return;
        
        
        // Get ship status with and without filtering for comparison
        const unfilteredStatus = this.ship.getStatus(false);
        const shipStatus = this.ship.getStatus(true); // getCardFilteredStatus()
        
        
        
        if (!unfilteredStatus || !unfilteredStatus.systems) {
            debug('UI', '⚠️ No ship status available for operations report');
            return;
        }

        // Clean up existing button handlers before recreating buttons
        this._cleanupButtonHandlers();

        // Clear systems list
        this.elements.systemsList.innerHTML = '';
        
        // Use unfiltered status to show all individual systems that actually exist
        // Then validate each system individually for card requirements
        const systemsToShow = this.validateAndPrepareSystemsForDisplay(unfilteredStatus.systems);
        
        // Check for radar cards and add virtual radar system if needed
        // FIXED: Check installed cards directly to avoid stale data
        let hasRadarCards = false;
        if (this.ship && this.ship.cardSystemIntegration && this.ship.cardSystemIntegration.installedCards) {
            const installedCardTypes = Array.from(this.ship.cardSystemIntegration.installedCards.values()).map(card => card.cardType);
            hasRadarCards = installedCardTypes.includes('basic_radar') || 
                           installedCardTypes.includes('advanced_radar') || 
                           installedCardTypes.includes('tactical_radar');
        }
        
debug('COMBAT', `🔍 Operations HUD radar card check: hasRadarCards=${hasRadarCards}, existing radar system=${!!systemsToShow.radar}`);
        if (hasRadarCards && !systemsToShow.radar) {
            systemsToShow.radar = {
                name: 'Proximity Detector',
                level: 1,
                health: 100,
                healthPercentage: 1.0,  // Full health as decimal
                isOperational: true,
                canBeActivated: true,   // Key property for operational status
                canRepair: false,
                repairCost: 0,
                status: 'operational',  // Explicit operational status
                virtual: true  // Mark as virtual system
            };
        }
        
        // Add each system (including passive systems for informational purposes)
        let systemsShown = 0;
        for (const [systemName, systemData] of Object.entries(systemsToShow)) {
            this.createSystemCard(systemName, systemData);
            systemsShown++;
        }
        
        if (systemsShown === 0) {
            const noSystemsDiv = document.createElement('div');
            noSystemsDiv.style.cssText = `
                color: #ffaa00;
                text-align: center;
                margin: 20px 0;
                font-style: italic;
            `;
            noSystemsDiv.textContent = 'No systems detected';
            this.elements.systemsList.appendChild(noSystemsDiv);
        }
        
debug('UI', `🔧 Displayed ${systemsShown} systems`);
    }
    
    /**
     * Validate systems and prepare them for display
     * Checks if each system has required cards and marks availability
     * @param {Object} allSystems - All systems from unfiltered ship status
     * @returns {Object} - Systems with validation info added
     */
    validateAndPrepareSystemsForDisplay(allSystems) {
        const validatedSystems = {};
        
        for (const [systemName, systemData] of Object.entries(allSystems)) {
            const hasValidCard = this.validateSystemCard(systemName);
            
            validatedSystems[systemName] = {
                ...systemData,
                hasValidCard: hasValidCard,
                isRepairable: hasValidCard && systemData.health < 1.0
            };
            
debug('AI', `🔧 System validation: ${systemName} - hasCard: ${hasValidCard}, repairable: ${validatedSystems[systemName].isRepairable}`);
        }
        
        return validatedSystems;
    }
    
    /**
     * Validate if a system has the required cards installed
     * Uses the fixed cardEnablesSystem logic for individual weapon systems
     * @param {string} systemName - Name of the system to validate
     * @returns {boolean} - True if system has required cards
     */
    validateSystemCard(systemName) {
        // For individual weapon systems, check if the corresponding weapon card is installed
        const weaponSystems = ['laser_cannon', 'plasma_cannon', 'pulse_cannon', 'phaser_array', 
                              'disruptor_cannon', 'particle_beam', 'standard_missile', 'homing_missile',
                              'photon_torpedo', 'proximity_mine'];
        
        if (weaponSystems.includes(systemName)) {
            // Check if we have the specific weapon card installed
            if (this.ship.cardSystemIntegration?.installedCards) {
                for (const [slotId, cardData] of this.ship.cardSystemIntegration.installedCards) {
                    if (cardData.cardType === systemName) {
                        return true;
                    }
                }
            }
            
            // Also check starter cards
            if (this.ship.shipConfig?.starterCards) {
                for (const card of Object.values(this.ship.shipConfig.starterCards)) {
                    if (card.cardType === systemName) {
                        return true;
                    }
                }
            }
            
            return false;
        }
        
        // For non-weapon systems, check installed cards directly to avoid stale data
        if (this.ship && this.ship.cardSystemIntegration && this.ship.cardSystemIntegration.installedCards) {
            const installedCardTypes = Array.from(this.ship.cardSystemIntegration.installedCards.values()).map(card => card.cardType);
            
            // Check for direct card type match first
            if (installedCardTypes.includes(systemName)) {
                return true;
            }
            
            // Check for system-specific card variants
            switch (systemName) {
                case 'radar':
                    return installedCardTypes.includes('basic_radar') || 
                           installedCardTypes.includes('advanced_radar') || 
                           installedCardTypes.includes('tactical_radar');
                case 'shields':
                    return installedCardTypes.includes('shields') || 
                           installedCardTypes.includes('shield_generator') || 
                           installedCardTypes.includes('phase_shield') || 
                           installedCardTypes.includes('quantum_barrier') || 
                           installedCardTypes.includes('temporal_deflector');
                case 'target_computer':
                    return installedCardTypes.includes('target_computer') || 
                           installedCardTypes.includes('tactical_computer') || 
                           installedCardTypes.includes('combat_computer') || 
                           installedCardTypes.includes('strategic_computer');
                case 'energy_reactor':
                    return installedCardTypes.includes('energy_reactor') || 
                           installedCardTypes.includes('quantum_reactor') || 
                           installedCardTypes.includes('dark_matter_core') || 
                           installedCardTypes.includes('antimatter_generator') || 
                           installedCardTypes.includes('crystalline_matrix');
                case 'impulse_engines':
                    return installedCardTypes.includes('impulse_engines') || 
                           installedCardTypes.includes('quantum_drive') || 
                           installedCardTypes.includes('dimensional_shifter') || 
                           installedCardTypes.includes('temporal_engine') || 
                           installedCardTypes.includes('gravity_well_drive');
                default:
                    return false;
            }
        }
        
        // Fallback to starter cards check
        if (this.ship.shipConfig?.starterCards) {
            for (const card of Object.values(this.ship.shipConfig.starterCards)) {
                if (card.cardType === systemName) {
                    return true;
                }
            }
        }
        
        return false;
    }

    // ========================================
    // Methods delegated to DCHSystemCardRenderer
    // ========================================

    createSystemCard(systemName, systemData) {
        this.cardRenderer.createSystemCard(systemName, systemData);
    }

    createSpeedControls(systemName, isDamaged, hasValidCard) {
        return this.cardRenderer.createSpeedControls(systemName, isDamaged, hasValidCard);
    }

    createToggleButton(systemName, isDamaged, hasValidCard) {
        return this.cardRenderer.createToggleButton(systemName, isDamaged, hasValidCard);
    }

    // ========================================
    // Methods delegated to DCHToggleHandler
    // ========================================

    getSystemActiveState(systemName, system = null) {
        return this.toggleHandler.getSystemActiveState(systemName, system);
    }

    updateButtonState(systemName, logUpdate = true) {
        this.toggleHandler.updateButtonState(systemName, logUpdate);
    }

    updateAllButtonStates() {
        this.toggleHandler.updateAllButtonStates();
    }

    toggleSystem(systemName) {
        this.toggleHandler.toggleSystem(systemName);
    }

    getDisplayName(systemName) {
        // Use the standard system display name function
        const baseName = getSystemDisplayName(systemName).toUpperCase();
        
        // Get system level if available
        try {
            const system = this.ship.getSystem(systemName);
            if (system && system.level) {
                return `${baseName} (Lvl ${system.level})`;
            }
        } catch (error) {
            // If we can't get the system level, just use the base name
            debug('UTILITY', `Could not get level for system ${systemName}: ${error.message}`);
        }
        
        return baseName;
    }
    
    /**
     * Get real energy consumption for a system
     */
    getRealEnergyConsumption(systemName) {
        try {
            const system = this.ship.getSystem(systemName);
            if (!system) {
                return '0';
            }
            
            // Check for various energy consumption properties
            if (typeof system.getEnergyConsumption === 'function') {
                return system.getEnergyConsumption().toString();
            }
            
            if (system.energyConsumption !== undefined) {
                return system.energyConsumption.toString();
            }
            
            if (system.energyPerSecond !== undefined) {
                return system.energyPerSecond.toString();
            }
            
            if (system.powerConsumption !== undefined) {
                return system.powerConsumption.toString();
            }
            
            // Default energy consumption based on system type
            const defaultEnergyMap = {
                'target_computer': '15',
                'impulse_engines': '25',
                'energy_reactor': '0', // Generates energy, doesn't consume
                'laser_cannon': '12',
                'pulse_cannon': '18',
                'plasma_cannon': '22',
                'phaser_array': '28',
                'disruptor_cannon': '20',
                'particle_beam': '35',
                'shields': '20',
                'warp_drive': '50',
                'subspace_radio': '8',
                'long_range_scanner': '10',
                'galactic_chart': '5',
                'hull_plating': '0',
                'cargo_hold': '2'
            };
            
            return defaultEnergyMap[systemName] || '5';
            
        } catch (error) {
            debug('UI', `⚠️ Failed to get energy consumption for ${systemName}: ${error.message}`);
            return '?';
        }
    }
    
    startRepair(systemName) {
        if (this.manualRepairSystem.isRepairing) {
debug('TARGETING', `🔧 Repair already in progress: ${this.manualRepairSystem.repairTarget}`);
            return;
        }
        
        const system = this.ship.getSystem(systemName);
        if (!system) {
            debug('UI', `❌ System not found for repair: ${systemName}`);
            return;
        }
        
        if (system.healthPercentage >= 1.0) {
debug('AI', `🔧 System ${systemName} is already fully repaired`);
            return;
        }
        
debug('AI', `🔧 Starting repair for ${systemName} (${Math.round(system.healthPercentage * 100)}% health)`);
        
        // Start repair
        this.manualRepairSystem.isRepairing = true;
        this.manualRepairSystem.repairTarget = systemName;
        this.manualRepairSystem.repairStartTime = Date.now();
        
        // Update UI with formatted display name
        const displayName = this.getDisplayName(systemName);
        this.elements.repairLabel.textContent = `Repairing ${displayName}...`;
        this.elements.repairBar.style.backgroundColor = '#00aa00';
        
        // Disable all toggle buttons
        this.disableAllToggleButtons();
    }
    
    updateRepairProgress() {
        if (!this.manualRepairSystem.isRepairing) return;
        
        const elapsed = Date.now() - this.manualRepairSystem.repairStartTime;
        const progress = Math.min(elapsed / this.manualRepairSystem.repairDuration, 1.0);
        
        // Update progress bar
        this.elements.repairBar.style.width = `${progress * 100}%`;
        
        // Check if repair is complete
        if (progress >= 1.0) {
            this.completeRepair();
        }
    }
    
    completeRepair() {
        const systemName = this.manualRepairSystem.repairTarget;
        const system = this.ship.getSystem(systemName);
        
        if (system) {
            // Fully repair the system
            system.currentHealth = system.maxHealth;
            system.healthPercentage = 1.0;
            
            // CRITICAL: Update system state so it becomes operational again
            system.updateSystemState();
            
debug('AI', `🔧 Repair completed for ${systemName}`);
        }
        
        // Reset repair system
        this.manualRepairSystem.isRepairing = false;
        this.manualRepairSystem.repairTarget = null;
        this.manualRepairSystem.repairStartTime = 0;
        
        // Update UI
        this.elements.repairLabel.textContent = 'Manual Repair System';
        this.elements.repairBar.style.backgroundColor = '#555';
        this.elements.repairBar.style.width = '0%';
        
        // Refresh the display to show updated health and re-enable buttons
        this.refresh();
    }
    
    disableAllToggleButtons() {
        const buttons = this.elements.systemsList.querySelectorAll('.damage-control-toggle-btn');
        buttons.forEach(button => {
            button.disabled = true;
            button.style.opacity = '0.6';
            button.style.cursor = 'not-allowed';
        });
    }
    
    // Called when systems take damage or are repaired externally
    markForUpdate() {
        if (this.isVisible) {
            // Debounce updates to avoid spam
            if (this.updateTimeout) {
                clearTimeout(this.updateTimeout);
            }
            this.updateTimeout = setTimeout(() => {
                this.refresh();
            }, 100);
        }
    }
    
    dispose() {
        debug('UI', '🧹 Disposing DamageControlHUD...');

        // Clear all intervals
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        if (this.buttonStateInterval) {
            clearInterval(this.buttonStateInterval);
            this.buttonStateInterval = null;
        }
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }

        // Clear all pending timeouts
        if (this._pendingTimeouts) {
            this._pendingTimeouts.forEach(id => clearTimeout(id));
            this._pendingTimeouts.clear();
            this._pendingTimeouts = null;
        }

        debug('UI', '🧹 DamageControlHUD disposed');
    }

    /**
     * Wrapped setTimeout that tracks the timeout ID for cleanup on dispose
     * @param {Function} callback - The function to call after the delay
     * @param {number} delay - The delay in milliseconds
     * @returns {number} The timeout ID
     */
    _setTimeout(callback, delay) {
        const id = setTimeout(() => {
            if (this._pendingTimeouts) {
                this._pendingTimeouts.delete(id);
            }
            callback();
        }, delay);
        if (this._pendingTimeouts) {
            this._pendingTimeouts.add(id);
        }
        return id;
    }

    /**
     * Clean up dynamically created button handlers
     * @private
     */
    _cleanupButtonHandlers() {
        if (this._buttonHandlers) {
            for (const [button, handlers] of this._buttonHandlers) {
                if (handlers.mouseenter) {
                    button.removeEventListener('mouseenter', handlers.mouseenter);
                }
                if (handlers.mouseleave) {
                    button.removeEventListener('mouseleave', handlers.mouseleave);
                }
            }
            this._buttonHandlers.clear();
        }
    }

    /**
     * Comprehensive cleanup of all resources
     */
    destroy() {
        debug('UI', '🧹 DamageControlHUD destroy() called - cleaning up all resources');

        // First call dispose to clear intervals/timeouts
        this.dispose();

        // Remove close button event listeners
        if (this._closeButton) {
            if (this._boundHandlers.closeButtonMouseEnter) {
                this._closeButton.removeEventListener('mouseenter', this._boundHandlers.closeButtonMouseEnter);
            }
            if (this._boundHandlers.closeButtonMouseLeave) {
                this._closeButton.removeEventListener('mouseleave', this._boundHandlers.closeButtonMouseLeave);
            }
            if (this._boundHandlers.closeButtonClick) {
                this._closeButton.removeEventListener('click', this._boundHandlers.closeButtonClick);
            }
            this._closeButton = null;
        }

        // Remove systemsList click listener
        if (this.elements.systemsList && this._boundHandlers.systemsListClick) {
            this.elements.systemsList.removeEventListener('click', this._boundHandlers.systemsListClick);
        }

        // Clean up dynamically created button handlers
        this._cleanupButtonHandlers();

        // Remove style element from document head
        if (this._styleElement && this._styleElement.parentNode) {
            this._styleElement.parentNode.removeChild(this._styleElement);
            this._styleElement = null;
        }

        // Clear bound handlers
        this._boundHandlers.closeButtonMouseEnter = null;
        this._boundHandlers.closeButtonMouseLeave = null;
        this._boundHandlers.closeButtonClick = null;
        this._boundHandlers.systemsListClick = null;

        // Clear container contents
        if (this.container) {
            this.container.innerHTML = '';
        }

        // Clear element references
        this.elements = {};

        // Clear manual repair state
        this.manualRepairSystem = null;

        // Clear references
        this.ship = null;
        this.starfieldManager = null;
        this.container = null;
        this.isVisible = false;

        debug('UI', '🧹 DamageControlHUD cleanup complete');
    }
    
    /**
     * Force refresh the operations report display (reload systems and update UI)
     */
    async forceRefresh() {
debug('COMBAT', 'Force refreshing operations report systems...');
        
        // Force reload cards from the ship
        if (this.ship && this.ship.cardSystemIntegration) {
debug('COMBAT', '🔄 Reloading cards from ship...');
            await this.ship.cardSystemIntegration.loadCards();
debug('COMBAT', '🔄 Recreating systems from cards...');
            await this.ship.cardSystemIntegration.createSystemsFromCards();
debug('COMBAT', '✅ Card system refresh completed');
        } else {
debug('COMBAT', '❌ No ship or cardSystemIntegration available for refresh');
        }
        
        // Refresh the display
debug('COMBAT', '🔄 Refreshing Operations HUD display...');
        this.refresh();
        debug('COMBAT', '✅ Operations HUD display refresh completed');
    }
    
    /**
     * Update warp status in the OPS HUD
     * @param {number} progress - Progress percentage (0-100)
     * @param {string} phase - Current warp phase
     * @param {boolean} isActive - Whether warp is currently active
     */
    updateWarpStatus(progress, phase, isActive = false) {
        if (!this.elements.warpStatus) return;
        
        if (isActive) {
            // Show warp status section
            this.elements.warpStatus.style.display = 'block';
            
            // Update progress bar
            const progressFill = this.elements.warpStatus.querySelector('.warp-progress-fill');
            if (progressFill) {
                progressFill.style.width = `${Math.max(0, Math.min(100, progress))}%`;
            }
            
            // Update status text
            const statusText = this.elements.warpStatus.querySelector('.warp-status-text');
            if (statusText) {
                statusText.textContent = `${phase}: ${Math.round(progress)}%`;
            }
            
            debug('COMBAT', `🚀 OPS HUD: Warp status updated - ${phase}: ${Math.round(progress)}%`);
        } else {
            // Hide warp status section when not active
            this.elements.warpStatus.style.display = 'none';
            debug('COMBAT', '🚀 OPS HUD: Warp status hidden');
        }
    }
    
    /**
     * Show warp status section (called when warp starts)
     */
    showWarpStatus() {
        if (this.elements.warpStatus) {
            this.elements.warpStatus.style.display = 'block';
            debug('COMBAT', '🚀 OPS HUD: Warp status section shown');
        }
    }
    
    /**
     * Hide warp status section (called when warp ends)
     */
    hideWarpStatus() {
        if (this.elements.warpStatus) {
            this.elements.warpStatus.style.display = 'none';
            debug('COMBAT', '🚀 OPS HUD: Warp status section hidden');
        }
    }
}