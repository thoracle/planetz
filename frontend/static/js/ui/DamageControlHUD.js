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
        `;
        this.elements.header.textContent = 'OPERATIONS REPORT';
        this.container.appendChild(this.elements.header);
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
        
        // Add custom scrollbar styling
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
        
        this.elements.systemsList.className = 'damage-control-systems-list';
        this.container.appendChild(this.elements.systemsList);
    }
    
    bindEvents() {
        // Simple event delegation - one listener for all toggle buttons
        this.elements.systemsList.addEventListener('click', (event) => {
            if (event.target.matches('.damage-control-toggle-btn')) {
                const systemName = event.target.dataset.systemName;
                if (systemName && !event.target.disabled) {
debug('AI', `🔧 Toggle button clicked for: ${systemName}`);
                    this.toggleSystem(systemName);
                }
            }
        });
    }
    
    show() {
        this.isVisible = true;
        this.container.style.display = 'block';
        this.refresh();
        
        // Start update loop
        if (!this.updateInterval) {
            this.updateInterval = setInterval(() => {
                this.updateRepairProgress();
            }, 100);
        }
    }
    
    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';
        
        // Stop update loop
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    refresh() {
        if (!this.isVisible) return;
        
debug('COMBAT', 'Refreshing operations report display');
        
        // Get ship status with and without filtering for comparison
        const unfilteredStatus = this.ship.getStatus(false);
        const shipStatus = this.ship.getStatus(true); // getCardFilteredStatus()
        
debug('UI', 'ALL ship systems (unfiltered):', Object.keys(unfilteredStatus.systems));
debug('UI', 'FILTERED ship systems:', Object.keys(shipStatus.systems));
        console.log('🔧 Systems filtered OUT:', Object.keys(unfilteredStatus.systems).filter(
            name => !Object.keys(shipStatus.systems).includes(name)
        ));
        
        // Debug: Show raw ship systems Map
debug('UI', 'Ship.systems Map entries:');
        for (const [systemName, system] of this.ship.systems) {
debug('UI', `  - ${systemName}: ${system.constructor.name} (Level ${system.level}, Health: ${Math.round(system.healthPercentage * 100)}%)`);
        }
        
        if (!unfilteredStatus || !unfilteredStatus.systems) {
            console.warn('No ship status available for operations report');
            return;
        }
        
        // Debug: Log what systems we're getting
debug('UI', 'Using unfiltered ship status systems:', Object.keys(unfilteredStatus.systems));
        
        // Clear systems list
        this.elements.systemsList.innerHTML = '';
        
        // Use unfiltered status to show all individual systems that actually exist
        // Then validate each system individually for card requirements
        const systemsToShow = this.validateAndPrepareSystemsForDisplay(unfilteredStatus.systems);
        
        // Check for radar cards and add virtual radar system if needed
        const hasRadarCards = this.ship && this.ship.hasSystemCardsSync && this.ship.hasSystemCardsSync('radar');
        if (hasRadarCards && !systemsToShow.radar) {
debug('UI', 'Adding virtual radar system (cards detected but no system object)');
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
        
        // Add each system
        let systemsShown = 0;
        for (const [systemName, systemData] of Object.entries(systemsToShow)) {
debug('UI', `🔧 Processing system: ${systemName}`, systemData);
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
        
        // For non-weapon systems, use the existing card system validation
        return this.ship.hasSystemCardsSync(systemName);
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
        
        // Right side - toggle button
        const toggleButton = this.createToggleButton(systemName, isDamaged, hasValidCard);
        systemCard.appendChild(toggleButton);
        
        this.elements.systemsList.appendChild(systemCard);
    }
    
    createToggleButton(systemName, isDamaged, hasValidCard) {
        const button = document.createElement('button');
        button.className = 'damage-control-toggle-btn';
        button.dataset.systemName = systemName;

        // Get the system and its current state
        const system = this.ship && this.ship.getSystem ? this.ship.getSystem(systemName) : null;

        // Debug logging to see what systems are available
        if (!system) {
            console.warn(`System ${systemName} not found on ship`);
        } else {
            console.log(`System ${systemName} found:`, {
                hasActivate: typeof system.activate === 'function',
                hasDeactivate: typeof system.deactivate === 'function',
                hasIsActive: typeof system.isActive !== 'undefined',
                isActive: system.isActive,
                canActivate: system.canActivate ? 'yes' : 'no'
            });
        }

        // Special handling for passive systems (always ON)
        const passiveSystems = ['energy_reactor', 'hull_plating', 'impulse_engines'];
        let isActive = false; // Initialize the variable

        if (passiveSystems.includes(systemName)) {
            // Passive systems are always ON
            isActive = true;
        } else if (systemName === 'target_computer') {
            // Target computer state is managed by StarfieldManager
            isActive = this.starfieldManager && this.starfieldManager.targetComputerEnabled ? this.starfieldManager.targetComputerEnabled : false;
        } else {
            isActive = system && system.isActive !== undefined ? system.isActive : false;
        }

        // Determine button state and appearance
        let buttonText = 'OFF';
        let backgroundColor = '#4a2a2a';
        let textColor = '#ff4444';
        let isDisabled = !hasValidCard;

        if (!hasValidCard) {
            buttonText = 'NO CARD';
            backgroundColor = '#3a3a3a';
            textColor = '#666';
        } else if (isDamaged) {
            buttonText = 'DAMAGED';
            backgroundColor = '#4a4a2a';
            textColor = '#ffaa44';
            isDisabled = true;
        } else if (passiveSystems.includes(systemName)) {
            // Passive systems are always ON
            buttonText = 'ON';
            backgroundColor = '#2a4a2a';
            textColor = '#00ff41';
            isDisabled = true; // Passive systems can't be toggled
        } else if (isActive) {
            buttonText = 'ON';
            backgroundColor = '#2a4a2a';
            textColor = '#00ff41';
        } else {
            buttonText = 'OFF';
            backgroundColor = '#4a2a2a';
            textColor = '#ff4444';
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
            cursor: ${isDisabled ? 'default' : 'pointer'};
            transition: all 0.2s ease;
            min-width: 55px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        button.textContent = buttonText;
        button.disabled = isDisabled;

        // Add click handler for toggle functionality
        if (!isDisabled && !isDamaged) {
            button.onclick = () => {
                this.toggleSystem(systemName);
            };

            // Hover effects
            button.addEventListener('mouseenter', () => {
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
            });

            button.addEventListener('mouseleave', () => {
                button.style.transform = 'scale(1)';
                button.style.borderColor = '#555';
            });
        }

        return button;
    }
    
    toggleSystem(systemName) {
        try {
            console.log(`🔧 Toggling system: ${systemName}`);

            // Check if this is a passive system (always ON)
            const passiveSystems = ['energy_reactor', 'hull_plating', 'impulse_engines'];
            if (passiveSystems.includes(systemName)) {
                console.log(`System ${systemName} is passive - no toggle action needed`);
                return;
            }

            const ship = this.ship;
            if (!ship || !ship.getSystem) {
                console.error('No ship or ship.getSystem method available for system toggle');
                return;
            }

            const system = ship.getSystem(systemName);
            if (!system) {
                console.error(`System ${systemName} not found`);
                return;
            }

            console.log(`System ${systemName} current state:`, {
                isActive: system.isActive,
                hasActivate: typeof system.activate === 'function',
                hasDeactivate: typeof system.deactivate === 'function',
                hasCanActivate: typeof system.canActivate === 'function'
            });

            // Special handling for target computer system
            if (systemName === 'target_computer') {
                // Target computer requires StarfieldManager's toggle method
                if (this.starfieldManager && this.starfieldManager.toggleTargetComputer) {
                    console.log(`Target computer toggle: StarfieldManager.enabled = ${this.starfieldManager.targetComputerEnabled}`);
                    this.starfieldManager.toggleTargetComputer();
                    console.log(`Toggled target computer via StarfieldManager, new state: ${this.starfieldManager.targetComputerEnabled}`);

                    // Also ensure the system itself is properly activated/deactivated
                    const ship = this.ship;
                    if (ship && ship.getSystem) {
                        const targetComputer = ship.getSystem('target_computer');
                        if (targetComputer) {
                            console.log(`Target computer system state before sync: ${targetComputer.isActive}`);
                            const shouldBeActive = this.starfieldManager.targetComputerEnabled;
                            if (shouldBeActive && !targetComputer.isActive) {
                                // Try to activate the system directly
                                if (targetComputer.canActivate && targetComputer.canActivate()) {
                                    if (targetComputer.activate(ship)) {
                                        console.log('Activated target computer system');
                                        // Sync the StarfieldManager state with the system state
                                        this.starfieldManager.targetComputerEnabled = true;
                                    } else {
                                        console.warn('Failed to activate target computer system - activate() returned false');
                                    }
                                } else {
                                    console.warn('Cannot activate target computer system - canActivate() failed or undefined');
                                }
                            } else if (!shouldBeActive && targetComputer.isActive) {
                                targetComputer.deactivate();
                                console.log('Deactivated target computer system');
                                // Sync the StarfieldManager state with the system state
                                this.starfieldManager.targetComputerEnabled = false;
                            }
                            console.log(`Target computer system state after sync: ${targetComputer.isActive}`);
                        } else {
                            console.warn('Target computer system not found on ship');
                        }
                    }
                } else {
                    console.error('StarfieldManager or toggleTargetComputer method not available');
                    return;
                }
            } else {
                // Standard system toggle for other systems
                // Check if system can be activated
                if (!system.canActivate) {
                    console.warn(`System ${systemName} does not have canActivate method`);
                    return;
                }

                if (!system.canActivate(ship)) {
                    console.log(`Cannot activate system ${systemName}`);
                    return;
                }

                // Toggle the system state
                if (system.isActive) {
                    // Deactivate the system
                    system.deactivate();
                    console.log(`Deactivated system: ${systemName}`);
                } else {
                    // Activate the system
                    const result = system.activate(ship);
                    if (result) {
                        console.log(`Activated system: ${systemName}`);
                    } else {
                        console.warn(`Failed to activate system ${systemName} - activate() returned false`);
                    }
                }
            }

            // Refresh the display to update button states
            this.refresh();
        } catch (error) {
            console.error(`Error toggling system ${systemName}:`, error);
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
            console.warn(`Failed to get energy consumption for ${systemName}:`, error);
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
            console.error(`🔧 System not found: ${systemName}`);
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
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }
    }
    
    /**
     * Force refresh the operations report display (reload systems and update UI)
     */
    async forceRefresh() {
debug('COMBAT', 'Force refreshing operations report systems...');
        
        // Force reload cards from the ship
        if (this.ship && this.ship.cardSystemIntegration) {
            await this.ship.cardSystemIntegration.loadCards();
            await this.ship.cardSystemIntegration.createSystemsFromCards();
        }
        
        // Refresh the display
        this.refresh();
    }
} 