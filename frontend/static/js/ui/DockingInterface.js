/**
 * DockingInterface - UI for services available while docked at planets/moons
 */

import { StationRepairInterface } from './StationRepairInterface.js';
import CardInventoryUI from './CardInventoryUI.js';
import { MissionBoard } from './MissionBoard.js';

export class DockingInterface {
    constructor(starfieldManager) {
        this.starfieldManager = starfieldManager;
        this.isVisible = false;
        this.dockedLocation = null;
        
        // Initialize station services
        this.stationRepairInterface = new StationRepairInterface(starfieldManager);
        this.cardInventoryUI = new CardInventoryUI(null);
        this.missionBoard = new MissionBoard(starfieldManager);
        
        // Properly initialize the CardInventoryUI for ship integration
        this.cardInventoryUI.init(); // This will load test data since no container
        
        // Load the current ship configuration into CardInventoryUI for system integration
        if (starfieldManager.ship && starfieldManager.ship.shipType) {
            // Initialize the CardInventoryUI with the ship's configuration
            this.cardInventoryUI.currentShipType = starfieldManager.ship.shipType;
            this.cardInventoryUI.currentShipConfig = starfieldManager.ship.shipConfig;
            
            // Load the ship configuration into CardInventoryUI.shipSlots for CardSystemIntegration
            this.cardInventoryUI.loadShipConfiguration(starfieldManager.ship.shipType);
            
            console.log(`🔧 DockingInterface: Loaded ${this.cardInventoryUI.shipSlots.size} cards for ship integration`);
        }
        
        // Set card inventory UI reference on the ship for system integration
        if (starfieldManager.ship) {
            starfieldManager.ship.setCardInventoryUI(this.cardInventoryUI);
        }
        
        this.createDockingUI();
    }

    createDockingUI() {
        // Create main docking interface container
        this.container = document.createElement('div');
        this.container.className = 'docking-interface';
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
            display: none;
            z-index: 1000;
            flex-direction: column;
            max-height: 90vh;
            min-width: 600px;
            max-width: 800px;
        `;



        // Create header section
        this.header = document.createElement('div');
        this.header.className = 'docking-header';
        this.header.style.cssText = `
            border-bottom: 2px solid #00ff41;
            padding-bottom: 15px;
            margin-bottom: 20px;
            text-align: center;
        `;
        this.container.appendChild(this.header);

        // Create content wrapper (consistent with other UIs)
        this.contentWrapper = document.createElement('div');
        this.contentWrapper.className = 'content-wrapper';
        this.contentWrapper.style.cssText = `
            flex: 1;
            overflow-y: auto;
            margin-bottom: 20px;
        `;
        this.container.appendChild(this.contentWrapper);

        // Create services container
        this.servicesContainer = document.createElement('div');
        this.servicesContainer.className = 'docking-services';
        this.servicesContainer.style.cssText = `
            display: grid;
            gap: 15px;
            grid-template-columns: 1fr;
        `;
        this.contentWrapper.appendChild(this.servicesContainer);

        // Create action buttons
        this.createActionButtons();
        
        // Add event listeners
        // (Close button removed - use Launch button to exit)
        
        // Add to document
        document.body.appendChild(this.container);
        
        // Add styles
        this.addStyles();
    }

    createActionButtons() {
        // Launch button
        this.launchButton = this.createServiceButton(
            'LAUNCH',
            'Return to your ship and launch into space',
            'launch-button',
            () => this.handleLaunch()
        );

        // Repair button
        this.repairButton = this.createServiceButton(
            'REPAIR SHIP',
            'Repair hull damage and system malfunctions',
            'repair-button',
            () => this.handleRepair()
        );

        // Shop button
        this.shopButton = this.createServiceButton(
            'UPGRADE SHIP',
            'Purchase and upgrade ship component cards',
            'shop-button',
            () => this.handleShop()
        );

        // Mission Board button
        this.missionButton = this.createServiceButton(
            'MISSION BOARD',
            'View and accept available missions and contracts',
            'mission-button',
            () => this.handleMissionBoard()
        );

        // Add buttons to services container
        this.servicesContainer.appendChild(this.launchButton);
        this.servicesContainer.appendChild(this.repairButton);
        this.servicesContainer.appendChild(this.shopButton);
        this.servicesContainer.appendChild(this.missionButton);
    }

    createServiceButton(title, description, className, clickHandler) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = `service-button ${className}`;
        buttonContainer.style.cssText = `
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid #00ff41;
            padding: 20px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            font-family: 'VT323', monospace;
        `;

        buttonContainer.innerHTML = `
            <div class="service-title" style="font-size: 20px; font-weight: bold; margin-bottom: 8px;">
                ${title}
            </div>
            <div class="service-description" style="font-size: 16px; opacity: 0.8; line-height: 1.4;">
                ${description}
            </div>
        `;

        // Add hover effects (consistent with other UI buttons)
        buttonContainer.addEventListener('mouseenter', () => {
            buttonContainer.style.background = 'rgba(0, 255, 65, 0.2)';
            buttonContainer.style.borderColor = '#44ff44';
        });

        buttonContainer.addEventListener('mouseleave', () => {
            buttonContainer.style.background = 'rgba(0, 0, 0, 0.5)';
            buttonContainer.style.borderColor = '#00ff41';
        });

        buttonContainer.addEventListener('click', clickHandler);

        return buttonContainer;
    }

    show(dockedLocation) {
        this.dockedLocation = dockedLocation;
        this.isVisible = true;
        
        // **CRITICAL FIX**: Refresh current ship type from the actual ship instance
        // This ensures the correct ship type is displayed after ship switching
        const currentShip = this.starfieldManager.ship;
        if (currentShip && currentShip.shipType) {
            console.log(`🔄 DockingInterface: Refreshing ship type to ${currentShip.shipType}`);
            
            // Update CardInventoryUI ship references
            this.cardInventoryUI.currentShipType = currentShip.shipType;
            this.cardInventoryUI.currentShipConfig = currentShip.shipConfig;
            
            // Reload ship configuration to match current ship
            this.cardInventoryUI.loadShipConfiguration(currentShip.shipType);
            
            console.log(`✅ DockingInterface: Ship type updated to ${currentShip.shipType}`);
        }
        
        // Update header with location info
        this.updateHeader();
        
        // Update button availability based on location
        this.updateButtonStates();
        
        // Show the interface
        this.container.style.display = 'flex';
        
        console.log('Docking interface shown for:', dockedLocation);
    }

    hide() {
        this.isVisible = false;
        this.dockedLocation = null;
        this.container.style.display = 'none';
        console.log('Docking interface hidden');
    }

    updateHeader() {
        if (!this.dockedLocation) return;

        // Get location info from solar system manager
        const info = this.starfieldManager.solarSystemManager.getCelestialBodyInfo(this.dockedLocation);
        
        this.header.innerHTML = `
            <div style="font-size: 16px; margin-bottom: 8px; opacity: 0.8; letter-spacing: 1px; font-family: 'VT323', monospace;">DOCKED AT</div>
            <div style="font-size: 28px; font-weight: bold; color: #00ff41; margin-bottom: 8px; font-family: 'VT323', monospace;">${info?.name || 'UNKNOWN LOCATION'}</div>
            <div style="font-size: 16px; opacity: 0.9; font-family: 'VT323', monospace;">
                ${info?.type?.toUpperCase() || 'UNKNOWN'} • ${info?.diplomacy?.toUpperCase() || 'NEUTRAL'}
            </div>
        `;
    }

    updateButtonStates() {
        if (!this.dockedLocation) return;

        // If you can dock, you can use all services
        // Hostile planets won't allow docking in the first place
        
        // All services are always available when docked
        [this.launchButton, this.repairButton, this.shopButton].forEach(button => {
            button.style.opacity = '1';
            button.style.pointerEvents = 'auto';
            button.title = ''; // Clear any disabled tooltips
        });
    }

    handleLaunch() {
        console.log('Launch button clicked from docking interface');
        
        // Play command sound
        if (this.starfieldManager.playCommandSound) {
            this.starfieldManager.playCommandSound();
        }
        
        // Hide docking interface
        this.hide();
        
        // Trigger undocking
        this.starfieldManager.undock();
    }

    handleRepair() {
        console.log('Repair service requested');
        console.log('StarfieldManager:', this.starfieldManager);
        
        // Get ship from ViewManager
        const ship = this.starfieldManager.viewManager?.getShip();
        console.log('Ship:', ship);
        console.log('Docked location:', this.dockedLocation);
        console.log('Station repair interface:', this.stationRepairInterface);
        
        // Play command sound
        if (this.starfieldManager.playCommandSound) {
            this.starfieldManager.playCommandSound();
        }
        
        // Store the docked location BEFORE hiding the interface
        const dockedLocation = this.dockedLocation;
        
        // Hide docking interface
        this.hide();
        
        // Show repair interface with stored location
        if (ship && dockedLocation) {
            console.log('Attempting to show repair interface...');
            this.stationRepairInterface.show(ship, dockedLocation);
            console.log('Repair interface show() called');
        } else {
            console.error('Cannot access repair services: ship or location data unavailable');
            console.error('Ship exists:', !!ship);
            console.error('Docked location exists:', !!dockedLocation);
        }
    }

    handleShop() {
        console.log('Card shop requested');
        
        // Play command sound
        if (this.starfieldManager.playCommandSound) {
            this.starfieldManager.playCommandSound();
        }
        
        // Store the docked location BEFORE hiding the interface
        const dockedLocation = this.dockedLocation;
        
        // Hide docking interface
        this.hide();
        
        // Show card inventory shop
        if (dockedLocation) {
            console.log('Opening card shop...');
            this.cardInventoryUI.showAsShop(dockedLocation, this);
        } else {
            console.error('Cannot access card shop: location data unavailable');
        }
    }

    handleMissionBoard() {
        console.log('🎯 Mission Board requested');
        
        // Play command sound
        if (this.starfieldManager.playCommandSound) {
            this.starfieldManager.playCommandSound();
        }
        
        // Store the docked location BEFORE hiding the interface
        const dockedLocation = this.dockedLocation;
        
        // Hide docking interface
        this.hide();
        
        // Show mission board with location context
        if (this.missionBoard && dockedLocation) {
            // Set current location for mission filtering
            this.missionBoard.setLocation(dockedLocation);
            
            // Update player data if available
            if (this.starfieldManager.ship) {
                const playerData = {
                    level: this.starfieldManager.ship.level || 1,
                    credits: this.starfieldManager.ship.credits || 50000,
                    ship_type: this.starfieldManager.ship.shipType || 'starter_ship',
                    faction_standings: this.starfieldManager.ship.factionStandings || {
                        'terran_republic_alliance': 0,
                        'traders_guild': 0,
                        'scientists_consortium': 0
                    }
                };
                this.missionBoard.updatePlayerData(playerData);
            }
            
            // Store reference for return navigation
            this.missionBoard.dockingInterface = this;
            
            // Show mission board
            this.missionBoard.show();
        } else {
            console.error('❌ Cannot access mission board: mission board or location data unavailable');
        }
    }

    addStyles() {
        // Add CSS for additional styling
        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
            
            .docking-interface.visible {
                display: flex;
            }
            
            .docking-interface .content-wrapper {
                scrollbar-width: thin;
                scrollbar-color: #00ff41 rgba(0, 255, 65, 0.1);
            }
            
            .docking-interface .content-wrapper::-webkit-scrollbar {
                width: 8px;
            }
            
            .docking-interface .content-wrapper::-webkit-scrollbar-track {
                background: rgba(0, 255, 65, 0.1);
                border-radius: 4px;
            }
            
            .docking-interface .content-wrapper::-webkit-scrollbar-thumb {
                background-color: #00ff41;
                border-radius: 4px;
                border: 2px solid transparent;
                background-clip: content-box;
            }
            
            .docking-interface .service-button.launch-button {
                border-color: #00ff41;
            }
            
            .docking-interface .service-button.launch-button .service-title,
            .docking-interface .service-button.launch-button .service-description {
                color: #00ff41;
            }
            
            .docking-interface .service-button.launch-button:hover {
                border-color: #44ff44;
                background: rgba(0, 255, 65, 0.2) !important;
            }
            
            .docking-interface .service-button.repair-button {
                border-color: #ffaa00;
            }
            
            .docking-interface .service-button.repair-button .service-title,
            .docking-interface .service-button.repair-button .service-description {
                color: #ffaa00;
            }
            
            .docking-interface .service-button.repair-button:hover {
                border-color: #ffcc44;
                background: rgba(255, 170, 0, 0.2) !important;
            }
            
            .docking-interface .service-button.shop-button {
                border-color: #0099ff;
            }
            
            .docking-interface .service-button.shop-button .service-title,
            .docking-interface .service-button.shop-button .service-description {
                color: #0099ff;
            }
            
            .docking-interface .service-button.shop-button:hover {
                border-color: #44bbff;
                background: rgba(0, 153, 255, 0.2) !important;
            }
            
            .docking-interface .service-button.inventory-button {
                border-color: #00ff99;
            }
            
            .docking-interface .service-button.inventory-button .service-title,
            .docking-interface .service-button.inventory-button .service-description {
                color: #00ff99;
            }
            
            .docking-interface .service-button.inventory-button:hover {
                border-color: #44ffaa;
                background: rgba(0, 255, 153, 0.2) !important;
            }
            
            .docking-interface .close-button {
                font-family: 'VT323', monospace;
            }
            
            .docking-interface .close-button:hover {
                background: rgba(0, 255, 65, 0.2) !important;
            }
        `;
        
        if (!document.head.querySelector('style[data-docking-interface]')) {
            style.setAttribute('data-docking-interface', 'true');
            document.head.appendChild(style);
        }
    }

    dispose() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
} 