import { debug } from '../debug.js';

/**
 * Operations Report HUD Implementation
 * Shows ship systems status and repair management
 * No legacy conflicts, simple event handling, clean architecture
 */

import { getSystemDisplayName } from '../ship/System.js';

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
            setTimeout(() => this.refresh(), 50);
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
    
    createSystemCard(systemName, systemData) {
        const systemCard = document.createElement('div');
        systemCard.style.cssText = `
            padding: 10px;
            border: 1px solid #444;
            border-radius: 4px;
            background-color: rgba(0, 0, 0, 0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
            min-height: 65px;
        `;
        
        // Left side - system info
        const systemInfo = document.createElement('div');
        systemInfo.style.cssText = `flex: 1; margin-right: 10px;`;
        
        // System name
        const displayName = this.getDisplayName(systemName);
        const healthPercentage = Math.round(systemData.health * 100);
        const isDamaged = healthPercentage < 100;
        const isOperational = systemData.canBeActivated;
        const hasValidCard = systemData.hasValidCard !== false; // Default to true if not specified
        
        // Determine status color based on card availability and system health
        let statusColor = '#555'; // Default for unavailable
        if (hasValidCard) {
            statusColor = isDamaged ? '#ff6b6b' : (isOperational ? '#00ff41' : '#ffaa00');
        }
        
        const nameDiv = document.createElement('div');
        nameDiv.style.cssText = `
            font-weight: bold;
            margin-bottom: 6px;
            color: ${statusColor};
            font-size: 13px;
        `;
        nameDiv.textContent = displayName;
        systemInfo.appendChild(nameDiv);
        
        // Health bar container
        const healthBarContainer = document.createElement('div');
        healthBarContainer.style.cssText = `
            width: 100%;
            max-width: 200px;
            height: 6px;
            background-color: #333;
            border-radius: 3px;
            overflow: hidden;
            margin-bottom: 6px;
            border: 1px solid #555;
        `;
        
        // Health bar fill
        const healthBar = document.createElement('div');
        let healthBarColor = '#ff4444'; // Red for damaged
        if (healthPercentage >= 75) healthBarColor = '#00ff41'; // Green for healthy
        else if (healthPercentage >= 50) healthBarColor = '#ffaa00'; // Yellow for moderate
        else if (healthPercentage >= 25) healthBarColor = '#ff8800'; // Orange for low
        
        healthBar.style.cssText = `
            height: 100%;
            background-color: ${healthBarColor};
            width: ${healthPercentage}%;
            transition: width 0.3s ease, background-color 0.3s ease;
        `;
        healthBarContainer.appendChild(healthBar);
        systemInfo.appendChild(healthBarContainer);
        
        // System details with real energy data
        const detailsDiv = document.createElement('div');
        detailsDiv.style.cssText = `
            font-size: 11px;
            color: #aaa;
            line-height: 1.2;
        `;
        
        let statusText = 'UNAVAILABLE';
        if (hasValidCard) {
            statusText = isOperational ? 'OPERATIONAL' : 'OFFLINE';
            if (isDamaged) statusText = 'DAMAGED';
        }
        
        // Get real energy consumption from the system
        const realEnergyConsumption = this.getRealEnergyConsumption(systemName);
        
        detailsDiv.innerHTML = `
            Status: <span style="color: ${statusColor}">${statusText}</span><br>
            Health: ${healthPercentage}%<br>
            Energy: ${realEnergyConsumption}/sec${hasValidCard ? '' : '<br><span style="color: #ff6b6b;">No Card</span>'}
        `;
        systemInfo.appendChild(detailsDiv);
        
        systemCard.appendChild(systemInfo);
        
        // Right side - toggle button or speed controls (only for non-passive systems)
        if (systemName === 'impulse_engines') {
            // Special handling for impulse engines - create speed control buttons
            const speedControls = this.createSpeedControls(systemName, isDamaged, hasValidCard);
            if (speedControls) {
                systemCard.appendChild(speedControls);
            }
        } else {
            // Regular toggle button for other systems
            const toggleButton = this.createToggleButton(systemName, isDamaged, hasValidCard);
            if (toggleButton) {
                systemCard.appendChild(toggleButton);
            }
        }
        
        this.elements.systemsList.appendChild(systemCard);
    }
    
    createSpeedControls(systemName, isDamaged, hasValidCard) {
        const ship = this.ship;
        const impulseEngines = ship?.getSystem('impulse_engines');
        
        if (!impulseEngines) {
            return null; // No impulse engines system
        }
        
        // Get current speed and max speed
        const currentSpeed = impulseEngines.getImpulseSpeed();
        const maxSpeed = impulseEngines.getMaxImpulseSpeed();
        
        // Create container for speed controls - vertical layout to match other systems
        const controlsContainer = document.createElement('div');
        controlsContainer.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
        `;
        
        // Create speed display (top)
        const speedDisplay = document.createElement('div');
        speedDisplay.style.cssText = `
            text-align: center;
            font-size: 10px;
            font-weight: bold;
            color: #00ff41;
            padding: 2px 4px;
            margin-bottom: 2px;
        `;
        speedDisplay.textContent = currentSpeed === 0 ? 'STOP' : `IMP ${currentSpeed}`;
        
        // Create button stack container (bottom)
        const buttonStack = document.createElement('div');
        buttonStack.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 2px;
        `;
        
        // Create increase button (top)
        const increaseButton = document.createElement('button');
        increaseButton.innerHTML = '+';
        increaseButton.className = 'impulse-speed-btn';
        increaseButton.dataset.action = 'increase';
        increaseButton.dataset.systemName = systemName;
        
        // Create decrease button (bottom)
        const decreaseButton = document.createElement('button');
        decreaseButton.innerHTML = '−';
        decreaseButton.className = 'impulse-speed-btn';
        decreaseButton.dataset.action = 'decrease';
        decreaseButton.dataset.systemName = systemName;
        
        // Style both buttons
        [decreaseButton, increaseButton].forEach(button => {
            // Only disable if no cards - damaged engines can still be used (just with reduced max speed)
            const isDisabled = !hasValidCard;
            const canDecrease = currentSpeed > 0;
            const canIncrease = currentSpeed < maxSpeed;
            
            // Disable buttons based on conditions
            if (button === decreaseButton && (!canDecrease || isDisabled)) {
                button.disabled = true;
            } else if (button === increaseButton && (!canIncrease || isDisabled)) {
                button.disabled = true;
            }
            
            button.style.cssText = `
                width: 38px;
                height: 22px;
                border: 1px solid #00ff41;
                border-radius: 3px;
                background: rgba(0, 255, 65, 0.2);
                color: #00ff41;
                font-size: 16px;
                font-weight: bold;
                cursor: ${button.disabled ? 'not-allowed' : 'pointer'};
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                opacity: ${button.disabled ? 0.5 : 1};
                line-height: 1;
            `;
            
            // Add hover effects for enabled buttons (track for cleanup)
            if (!button.disabled) {
                const mouseEnterHandler = () => {
                    button.style.backgroundColor = 'rgba(0, 255, 65, 0.4)';
                    button.style.boxShadow = '0 0 8px rgba(0, 255, 65, 0.5)';
                };
                const mouseLeaveHandler = () => {
                    button.style.backgroundColor = 'rgba(0, 255, 65, 0.2)';
                    button.style.boxShadow = 'none';
                };
                button.addEventListener('mouseenter', mouseEnterHandler);
                button.addEventListener('mouseleave', mouseLeaveHandler);
                // Track handlers for cleanup
                this._buttonHandlers.set(button, { mouseenter: mouseEnterHandler, mouseleave: mouseLeaveHandler });
            }
        });
        
        // Assemble the button stack (+ on top, - on bottom)
        buttonStack.appendChild(increaseButton);
        buttonStack.appendChild(decreaseButton);
        
        // Assemble the main container (speed display on top, buttons on bottom)
        controlsContainer.appendChild(speedDisplay);
        controlsContainer.appendChild(buttonStack);
        
        return controlsContainer;
    }

    createToggleButton(systemName, isDamaged, hasValidCard) {
        const button = document.createElement('button');
        button.className = 'damage-control-toggle-btn';
        button.dataset.systemName = systemName;

        // Get the system and its current state
        const system = this.ship && this.ship.getSystem ? this.ship.getSystem(systemName) : null;


        // Get the current system state
        const isActive = this.getSystemActiveState(systemName, system);

        // Determine button state and appearance
        let buttonText = 'OFF';
        let backgroundColor = '#4a2a2a';
        let textColor = '#ff4444';
        let isDisabled = false;

        // Check if this is a passive system - don't create buttons for them
        // Note: weapons removed from passive systems to allow power management
        const passiveSystems = ['energy_reactor', 'impulse_engines', 'warp_drive', 'cargo_hold', 'hull_plating'];
        if (passiveSystems.includes(systemName)) {
            return null; // Don't create a button for passive systems
        }

        if (isActive) {
            // System is currently active/on
            buttonText = 'ON';
            backgroundColor = '#2a4a2a';
            textColor = '#00ff41';
        } else {
            // System is currently inactive/off
            buttonText = 'OFF';
            backgroundColor = '#4a2a2a';
            textColor = '#ff4444';
        }

        // Only disable button if system has no card - damaged systems can still be toggled
        // (they just might not work properly, like with hotkeys)
        if (!hasValidCard) {
            isDisabled = true;
        }

        // Store the system state in the button for later use in event handlers
        button.dataset.isActive = isActive;

        button.style.cssText = `
            padding: 8px 12px;
            border: 1px solid #555;
            border-radius: 3px;
            background-color: ${backgroundColor};
            color: ${textColor};
            font-size: 10px;
            font-weight: bold;
            cursor: ${isDisabled ? 'not-allowed' : 'pointer'};
            transition: all 0.2s ease;
            min-width: 55px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        button.textContent = buttonText;
        button.disabled = isDisabled;

        // Click handler is handled by event delegation in bindEvents()
        // No need for direct onclick handler to avoid double-firing
        
        // Hover effects (only if button is enabled) - track for cleanup
        if (!isDisabled && !isDamaged) {
            const mouseEnterHandler = () => {
                if (!isDisabled) {
                    button.style.transform = 'scale(1.05)';
                    // Use the stored system state for hover effects
                    const currentIsActive = button.dataset.isActive === 'true';
                    if (currentIsActive) {
                        button.style.borderColor = '#00ff41';
                    } else {
                        button.style.borderColor = '#ff4444';
                    }
                }
            };
            const mouseLeaveHandler = () => {
                button.style.transform = 'scale(1)';
                button.style.borderColor = '#555';
            };
            button.addEventListener('mouseenter', mouseEnterHandler);
            button.addEventListener('mouseleave', mouseLeaveHandler);
            // Track handlers for cleanup
            this._buttonHandlers.set(button, { mouseenter: mouseEnterHandler, mouseleave: mouseLeaveHandler });
        }

        return button;
    }
    
    /**
     * Get the active state for a specific system
     * @param {string} systemName - Name of the system
     * @param {Object} system - System object (optional)
     * @returns {boolean} True if system is active
     */
    getSystemActiveState(systemName, system = null) {
        
        // Get system if not provided
        if (!system) {
            system = this.ship && this.ship.getSystem ? this.ship.getSystem(systemName) : null;
        }
        
        // Passive systems are always considered "active" since they can't be toggled
        const passiveSystems = ['energy_reactor', 'impulse_engines', 'warp_drive', 'cargo_hold'];
        if (passiveSystems.includes(systemName)) {
            return true;
        }
        
        // Special handling for different system types
        switch (systemName) {
            case 'target_computer':
                // Target computer state is managed by StarfieldManager
                return this.starfieldManager && this.starfieldManager.targetComputerEnabled ? this.starfieldManager.targetComputerEnabled : false;
                
            case 'radar':
                // Radar state is managed by ProximityDetector3D
                return this.starfieldManager && this.starfieldManager.proximityDetector3D ? this.starfieldManager.proximityDetector3D.isVisible : false;
                
            case 'shields':
                // Shields have their own isShieldsUp property
                return system && system.isShieldsUp !== undefined ? system.isShieldsUp : false;
                
            case 'long_range_scanner':
                // FIXED: Check system active state, not UI visibility
                // UI can be closed while system is still active (consuming energy)
                return system && system.isActive !== undefined ? system.isActive : false;
                
            case 'star_charts':
                // FIXED: Check system active state, not UI visibility  
                // UI can be closed while system is still active (consuming energy)
                return system && system.isActive !== undefined ? system.isActive : false;
                
            case 'galactic_chart':
                // FIXED: Check system active state, not UI visibility
                // UI can be closed while system is still active (consuming energy)
                return system && system.isActive !== undefined ? system.isActive : false;
                
            case 'subspace_radio':
                // FIXED: Check the actual system's active state, not UI visibility
                // The system can be active (consuming energy) even if UI is closed, or
                // the UI can be visible but system inactive (no energy)
                return system && system.isActive !== undefined ? system.isActive : false;
                
            default:
                // Default to system.isActive for other systems
                return system && system.isActive !== undefined ? system.isActive : false;
        }
    }
    
    /**
     * Update the state of a specific button after a system toggle
     * @param {string} systemName - Name of the system
     * @param {boolean} logUpdate - Whether to log the update (default: true)
     */
    updateButtonState(systemName, logUpdate = true) {
        const button = this.elements.systemsList.querySelector(`[data-system-name="${systemName}"]`);
        if (!button) {
            if (logUpdate) debug('UI', `⚠️ Button not found for system: ${systemName}`);
            return;
        }
        
        const system = this.ship && this.ship.getSystem ? this.ship.getSystem(systemName) : null;
        const isActive = this.getSystemActiveState(systemName, system);
        
        // Check if state actually changed to avoid unnecessary updates
        const currentState = button.dataset.isActive === 'true';
        if (currentState === isActive && !logUpdate) {
            return; // No change needed
        }
        
        
        // Check if this is a passive system
        const passiveSystems = ['energy_reactor', 'impulse_engines', 'warp_drive', 'cargo_hold'];
        const isPassiveSystem = passiveSystems.includes(systemName);
        
        // Don't update passive systems - they maintain their distinct styling
        if (isPassiveSystem) {
            return;
        }
        
        // Check if button is disabled (no card) - damaged systems can still be updated
        const isDisabled = button.disabled;
        if (isDisabled) {
            return; // Don't update disabled buttons (no card systems)
        }
        
        // Update button appearance based on new state
        if (isActive) {
            button.textContent = 'ON';
            button.style.backgroundColor = '#2a4a2a';
            button.style.color = '#00ff41';
        } else {
            button.textContent = 'OFF';
            button.style.backgroundColor = '#4a2a2a';
            button.style.color = '#ff4444';
        }
        
        // Update stored state for hover effects
        button.dataset.isActive = isActive.toString();
        
    }
    
    /**
     * Update all button states to reflect current system states
     * Called periodically to sync with external state changes
     */
    updateAllButtonStates() {
        if (!this.isVisible || !this.elements.systemsList) {
            return;
        }
        
        // Get all toggle buttons
        const buttons = this.elements.systemsList.querySelectorAll('.damage-control-toggle-btn');
        
        buttons.forEach(button => {
            const systemName = button.dataset.systemName;
            if (systemName) {
                this.updateButtonState(systemName, false); // Don't log routine updates
            }
        });
    }
    
    toggleSystem(systemName) {
        try {
            // Passive systems cannot be toggled
            const passiveSystems = ['energy_reactor', 'hull_plating', 'impulse_engines', 'warp_drive', 'cargo_hold'];
            if (passiveSystems.includes(systemName)) {
                debug('UI', `⚠️ Cannot toggle passive system: ${systemName}`);
                return;
            }

            const ship = this.ship;
            if (!ship || !ship.getSystem) {
                debug('UI', '❌ No ship or ship.getSystem method available for system toggle');
                return;
            }

            const system = ship.getSystem(systemName);
            if (!system) {
                debug('UI', `❌ System ${systemName} not found`);
                return;
            }

            debug('UI', `System ${systemName} current state: isActive=${system.isActive}, hasActivate=${typeof system.activate === 'function'}`);

            // Special handling for systems with keyboard shortcuts - do exactly what keys do
            if (systemName === 'target_computer') {
                if (this.starfieldManager && this.starfieldManager.toggleTargetComputer) {
                    const ship = this.ship;
                    const targetComputer = ship?.getSystem('target_computer');
                    const energyReactor = ship?.getSystem('energy_reactor');
                    const isCurrentlyOn = this.starfieldManager.targetComputerEnabled;
                    
                    // If target computer is ON, always allow turning it OFF (no energy check needed)
                    // If target computer is OFF, check if it can be activated
                    if (isCurrentlyOn || (targetComputer && targetComputer.canActivate(ship))) {
                        // Same as T key: play command sound and toggle
                        this.starfieldManager.playCommandSound();
                        this.starfieldManager.toggleTargetComputer();
                        
                        
                        // Update button state immediately
                        setTimeout(() => this.updateButtonState(systemName), 50);
                    } else {
                        // Same error handling as T key
                        this.starfieldManager.playCommandFailedSound();
                        
                        if (!targetComputer) {
                            this.starfieldManager.showHUDEphemeral(
                                'TARGET COMPUTER UNAVAILABLE',
                                'No Target Computer card installed in ship slots'
                            );
                        } else if (!targetComputer.isOperational()) {
                            this.starfieldManager.showHUDEphemeral(
                                'TARGET COMPUTER OFFLINE',
                                `System damaged (${Math.round(targetComputer.healthPercentage * 100)}% health) - repair required`
                            );
                        } else if (!ship.hasSystemCardsSync('target_computer')) {
                            this.starfieldManager.showHUDEphemeral(
                                'TARGET COMPUTER UNAVAILABLE',
                                'No Target Computer card installed in ship slots'
                            );
                        } else if (!energyReactor || !energyReactor.isOperational()) {
                            if (!energyReactor) {
                                this.starfieldManager.showHUDEphemeral(
                                    'POWER FAILURE',
                                    'No Energy Reactor installed - cannot power systems'
                                );
                            } else {
                                this.starfieldManager.showHUDEphemeral(
                                    'POWER FAILURE',
                                    `Energy Reactor disabled (${Math.round(energyReactor.healthPercentage * 100)}% health) - repair immediately`
                                );
                            }
                        } else {
                            this.starfieldManager.showHUDEphemeral(
                                'TARGET COMPUTER UNAVAILABLE',
                                'System requirements not met'
                            );
                        }
                    }
                } else {
                    debug('UI', '❌ StarfieldManager or toggleTargetComputer method not available');
                    return;
                }
            } else if (systemName === 'shields') {
                // Shields system - do exactly what S key does
                const ship = this.ship;
                const shields = ship?.getSystem('shields');
                const isCurrentlyOn = shields?.isShieldsUp || false;
                
                // If shields are ON, always allow turning them OFF (no energy check needed)
                // If shields are OFF, check if they can be activated
                if (isCurrentlyOn || (shields && shields.canActivate(ship))) {
                    // Same as S key: play command sound and toggle shields
                    this.starfieldManager.playCommandSound();
                    shields.toggleShields();
                    
                    // Update button state immediately
                    setTimeout(() => this.updateButtonState(systemName), 50);
                } else {
                    // Same error handling as S key
                    this.starfieldManager.playCommandFailedSound();
                    
                    if (!shields) {
                        this.starfieldManager.showHUDEphemeral(
                            'SHIELDS UNAVAILABLE',
                            'No Shield Generator card installed in ship slots'
                        );
                    } else if (!shields.isOperational()) {
                        this.starfieldManager.showHUDEphemeral(
                            'SHIELDS OFFLINE',
                            `Shield system damaged (${Math.round(shields.healthPercentage * 100)}% health) - repair required`
                        );
                    } else {
                        this.starfieldManager.showHUDEphemeral(
                            'SHIELDS UNAVAILABLE',
                            'System requirements not met'
                        );
                    }
                }
                
                // Update button state immediately
                setTimeout(() => this.updateButtonState(systemName), 50);
            } else if (systemName === 'radar') {
                // Radar system - do exactly what P key does
                const ship = this.ship;
                const radarSystem = ship?.getSystem('radar');
                const isCurrentlyOn = this.starfieldManager?.proximityDetector3D?.isVisible || false;
                
                if (!radarSystem) {
                    // No radar system exists (no cards installed)
                    this.starfieldManager.playCommandFailedSound();
                    this.starfieldManager.showHUDEphemeral(
                        'PROXIMITY DETECTOR UNAVAILABLE',
                        'No Proximity Detector card installed in ship slots'
                    );
                } else if (!isCurrentlyOn && !radarSystem.canActivate(ship)) {
                    // System exists but can't be activated
                    this.starfieldManager.playCommandFailedSound();
                    if (!radarSystem.isOperational()) {
                        this.starfieldManager.showHUDEphemeral(
                            'PROXIMITY DETECTOR DAMAGED',
                            'Proximity Detector system requires repair'
                        );
                    } else {
                        this.starfieldManager.showHUDEphemeral(
                            'INSUFFICIENT ENERGY',
                            'Need energy to activate proximity detector'
                        );
                    }
                } else {
                    // System available and operational - toggle it (same as P key)
                    this.starfieldManager.playCommandSound();
                    this.starfieldManager.toggleProximityDetector();
                    
                    // Update button state immediately
                    setTimeout(() => this.updateButtonState(systemName), 50);
                }
            } else if (systemName === 'long_range_scanner') {
                // Long Range Scanner - do exactly what L key does (via ViewManager)
                if (this.starfieldManager.viewManager) {
                    const ship = this.starfieldManager.viewManager.getShip();
                    const scannerSystem = ship?.systems?.get('long_range_scanner');
                    
                    // Check if scanner is already visible (toggle behavior like L key)
                    const isVisible = this.starfieldManager.viewManager.navigationSystemManager?.longRangeScanner?.isVisible();
                    
                    if (isVisible) {
                        // Scanner is visible, hide it (same as L key when scanner is open)
                        this.starfieldManager.playCommandSound();
                        if (scannerSystem) {
                            scannerSystem.stopScan();
                        }
                        this.starfieldManager.viewManager.navigationSystemManager?.longRangeScanner.hide();
                        
                        // Update button state immediately
                        setTimeout(() => this.updateButtonState(systemName), 50);
                    } else if (scannerSystem && scannerSystem.canActivate(ship)) {
                        // Scanner not visible, show it (same as L key when scanner is closed)
                        this.starfieldManager.playCommandSound();
                        
                        // Start scanning operation
                        const scanStarted = scannerSystem.startScan(ship);
                        if (scanStarted) {
                            // Show the long range scanner interface
                            this.starfieldManager.viewManager.navigationSystemManager?.longRangeScanner.show();

                            // Update button state immediately
                            setTimeout(() => this.updateButtonState(systemName), 50);
                        } else {
                            debug('UI', '⚠️ Failed to start Long Range Scanner');
                        }
                    } else {
                        // Same error handling as L key
                        this.starfieldManager.playCommandFailedSound();
                        
                        if (!scannerSystem) {
                            this.starfieldManager.showHUDEphemeral(
                                'LONG RANGE SCANNER UNAVAILABLE',
                                'No Long Range Scanner card installed in ship slots'
                            );
                        } else if (!scannerSystem.isOperational()) {
                            this.starfieldManager.showHUDEphemeral(
                                'LONG RANGE SCANNER OFFLINE',
                                `Scanner system damaged (${Math.round(scannerSystem.healthPercentage * 100)}% health) - repair required`
                            );
                        } else {
                            this.starfieldManager.showHUDEphemeral(
                                'LONG RANGE SCANNER UNAVAILABLE',
                                'System requirements not met'
                            );
                        }
                    }
                } else {
                    debug('UI', '❌ ViewManager not available for Long Range Scanner');
                }
            } else if (systemName === 'star_charts') {
                // Star Charts - do exactly what C key does (via ViewManager)
                if (this.starfieldManager.viewManager) {
                    const ship = this.starfieldManager.viewManager.getShip();
                    const starCharts = ship?.systems?.get('star_charts');
                    
                    // Check if star charts is already visible (toggle behavior like C key)
                    const isVisible = this.starfieldManager.viewManager.navigationSystemManager?.starChartsUI?.isVisible();
                    
                    if (isVisible) {
                        // Star charts is visible, hide it (same as C key when star charts is open)
                        this.starfieldManager.playCommandSound();
                        this.starfieldManager.viewManager.navigationSystemManager?.starChartsUI.hide();
                        
                        // Update button state immediately
                        setTimeout(() => this.updateButtonState(systemName), 50);
                    } else if (starCharts && starCharts.canActivate(ship)) {
                        // Star charts not visible, show it (same as C key when star charts is closed)
                        this.starfieldManager.playCommandSound();
                        this.starfieldManager.viewManager.navigationSystemManager?.starChartsUI.show();
                        
                        // Update button state immediately
                        setTimeout(() => this.updateButtonState(systemName), 50);
                    } else {
                        // Same error handling as C key
                        this.starfieldManager.playCommandFailedSound();
                        
                        if (!starCharts) {
                            this.starfieldManager.showHUDEphemeral(
                                'STAR CHARTS UNAVAILABLE',
                                'No Star Charts card installed in ship slots'
                            );
                        } else if (!starCharts.isOperational()) {
                            this.starfieldManager.showHUDEphemeral(
                                'STAR CHARTS OFFLINE',
                                `Star Charts system damaged (${Math.round(starCharts.healthPercentage * 100)}% health) - repair required`
                            );
                        } else {
                            this.starfieldManager.showHUDEphemeral(
                                'STAR CHARTS UNAVAILABLE',
                                'System requirements not met'
                            );
                        }
                    }
                } else {
                    debug('UI', '❌ ViewManager not available for Star Charts');
                }
            } else if (systemName === 'galactic_chart') {
                // Galactic Chart - do exactly what G key does (via ViewManager)
                if (this.starfieldManager.viewManager) {
                    const ship = this.starfieldManager.viewManager.getShip();
                    const galacticChart = ship?.systems?.get('galactic_chart');
                    
                    // Check if galactic chart is already visible (toggle behavior like G key)
                    const isVisible = this.starfieldManager.viewManager.galacticChart?.isVisible();
                    
                    if (isVisible) {
                        // Galactic chart is visible, hide it (same as G key when chart is open)
                        this.starfieldManager.playCommandSound();
                        this.starfieldManager.viewManager.galacticChart.hide(true);
                        
                        // Update button state immediately
                        setTimeout(() => this.updateButtonState(systemName), 50);
                    } else if (galacticChart && galacticChart.canActivate(ship)) {
                        // Galactic chart not visible, show it (same as G key when chart is closed)
                        this.starfieldManager.playCommandSound();
                        this.starfieldManager.viewManager.setView('galactic');
                        
                        // Update button state immediately
                        setTimeout(() => this.updateButtonState(systemName), 50);
                    } else {
                        // Same error handling as G key
                        this.starfieldManager.playCommandFailedSound();
                        
                        if (!galacticChart) {
                            this.starfieldManager.showHUDEphemeral(
                                'GALACTIC CHART UNAVAILABLE',
                                'No Galactic Chart card installed in ship slots'
                            );
                        } else if (!galacticChart.isOperational()) {
                            this.starfieldManager.showHUDEphemeral(
                                'GALACTIC CHART OFFLINE',
                                `Chart system damaged (${Math.round(galacticChart.healthPercentage * 100)}% health) - repair required`
                            );
                        } else {
                            this.starfieldManager.showHUDEphemeral(
                                'GALACTIC CHART UNAVAILABLE',
                                'System requirements not met'
                            );
                        }
                    }
                } else {
                    debug('UI', '❌ ViewManager not available for Galactic Chart');
                }
            } else if (systemName === 'subspace_radio') {
                // Subspace Radio - do exactly what R key does (handled by SubspaceRadio UI class)
                const ship = this.ship;
                const radio = ship?.getSystem('subspace_radio');
                
                if (!radio) {
                    // System doesn't exist (starter ship case)
                    this.starfieldManager.playCommandFailedSound();
                    this.starfieldManager.showHUDEphemeral(
                        'SUBSPACE RADIO UNAVAILABLE',
                        'Install subspace radio card to enable communications'
                    );
                } else if (!radio.canActivate(ship)) {
                    // System exists but can't activate
                    this.starfieldManager.playCommandFailedSound();
                    if (!radio.isOperational()) {
                        this.starfieldManager.showHUDEphemeral(
                            'SUBSPACE RADIO DAMAGED',
                            'Repair system to enable communications'
                        );
                    } else if (!ship.hasSystemCardsSync('subspace_radio')) {
                        this.starfieldManager.showHUDEphemeral(
                            'SUBSPACE RADIO MISSING',
                            'Install subspace radio card to enable communications'
                        );
                    } else if (!ship.hasEnergy(15)) {
                        this.starfieldManager.showHUDEphemeral(
                            'INSUFFICIENT ENERGY',
                            'Need 15 energy units to activate radio'
                        );
                    } else {
                        this.starfieldManager.showHUDEphemeral(
                            'SUBSPACE RADIO ERROR',
                            'System cannot be activated'
                        );
                    }
                } else {
                    // System available - let SubspaceRadio UI handle it (same as R key)
                    this.starfieldManager.playCommandSound();
                    
                    // Try multiple paths to access SubspaceRadio UI
                    let subspaceRadioUI = null;
                    
                    // Method 1: Via ViewManager (most likely)
                    if (this.starfieldManager.viewManager && this.starfieldManager.viewManager.subspaceRadio) {
                        subspaceRadioUI = this.starfieldManager.viewManager.subspaceRadio;
                    }
                    // Method 2: Via global window object (fallback)
                    else if (window.subspaceRadio) {
                        subspaceRadioUI = window.subspaceRadio;
                    }
                    
                    if (subspaceRadioUI && subspaceRadioUI.toggle) {
                        subspaceRadioUI.toggle();

                        // Update button state immediately
                        setTimeout(() => this.updateButtonState(systemName), 50);
                    } else {
                        debug('UI', '⚠️ SubspaceRadio UI not available via any access method');
                    }
                }
            } else {
                // Standard system toggle for other systems
                // Check if system can be activated
                if (!system.canActivate) {
                    debug('UI', `⚠️ System ${systemName} does not have canActivate method`);
                    return;
                }

                if (!system.canActivate(ship)) {
                    debug('UI', `Cannot activate system ${systemName}`);
                    return;
                }

                // Toggle the system state
                if (system.isActive) {
                    // Deactivate the system
                    try {
                        system.deactivate();
                        debug('UI', `Deactivated system: ${systemName}`);
                    } catch (error) {
                        debug('UI', `❌ Error deactivating system ${systemName}: ${error.message}`);
                    }
                } else {
                    // Activate the system
                    try {
                        const result = system.activate(ship);
                        if (result) {
                            debug('UI', `Activated system: ${systemName}`);
                        } else {
                            debug('UI', `⚠️ Failed to activate system ${systemName} - activate() returned false`);
                        }
                    } catch (error) {
                        debug('UI', `❌ Error activating system ${systemName}: ${error.message}`);
                    }
                }
            }

            // Refresh the display to update button states
            this.refresh();
        } catch (error) {
            debug('UI', `❌ Error toggling system ${systemName}: ${error.message}`);
            // If there's an error, also try to refresh the display to show current states
            this.refresh();
        }
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

        debug('UI', '🧹 DamageControlHUD disposed');
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