/**
 * DockingInterface - UI for services available while docked at planets/moons
 */

import { StationRepairInterface } from './StationRepairInterface.js';
import CardInventoryUI from './CardInventoryUI.js';
import { MissionBoard } from './MissionBoard.js';
import { CommodityExchange } from './CommodityExchange.js';

export class DockingInterface {
    constructor(starfieldManager) {
        this.starfieldManager = starfieldManager;
        this.isVisible = false;
        this.dockedLocation = null;
        
        // Initialize station services
        this.stationRepairInterface = new StationRepairInterface(starfieldManager);
        this.cardInventoryUI = new CardInventoryUI(null);
        this.missionBoard = new MissionBoard(starfieldManager);
        this.commodityExchange = new CommodityExchange(starfieldManager);
        
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
        // Create main station menu container (after docking is complete)
        this.container = document.createElement('div');
        this.container.className = 'station-menu';
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



        // Create header section with launch button
        this.header = document.createElement('div');
        this.header.className = 'docking-header';
        this.header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #00ff41;
            padding-bottom: 15px;
            margin-bottom: 20px;
        `;
        this.container.appendChild(this.header);

        // Create header title section
        this.headerTitle = document.createElement('div');
        this.headerTitle.className = 'header-title';
        this.headerTitle.style.cssText = `
            flex: 1;
            text-align: center;
        `;
        this.header.appendChild(this.headerTitle);

        // Create launch button in header
        this.createHeaderLaunchButton();

        // Create content wrapper with two-column layout
        this.contentWrapper = document.createElement('div');
        this.contentWrapper.className = 'content-wrapper';
        this.contentWrapper.style.cssText = `
            flex: 1;
            display: flex;
            gap: 20px;
            overflow-y: auto;
            margin-bottom: 20px;
        `;
        this.container.appendChild(this.contentWrapper);

        // Create wireframe station visualization area
        this.stationVisualization = document.createElement('div');
        this.stationVisualization.className = 'station-wireframe';
        this.stationVisualization.style.cssText = `
            flex: 0 0 250px;
            border: 1px solid #00ff41;
            background: rgba(0, 0, 0, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 200px;
            position: relative;
        `;
        this.contentWrapper.appendChild(this.stationVisualization);

        // Create services container with improved layout
        this.servicesContainer = document.createElement('div');
        this.servicesContainer.className = 'docking-services';
        this.servicesContainer.style.cssText = `
            flex: 1;
            display: grid;
            gap: 10px;
            grid-template-columns: 1fr 1fr;
            align-content: start;
        `;
        this.contentWrapper.appendChild(this.servicesContainer);

        // Create action buttons
        this.createActionButtons();
        
        // Add event listeners
        // (Close button removed - use Launch button to exit)
        
        // Add to document
        document.body.appendChild(this.container);
        
        // Add styles
        // Create wireframe station animation
        this.createStationWireframe();
        
        this.addStyles();
    }

    createHeaderLaunchButton() {
        this.launchButton = document.createElement('button');
        this.launchButton.className = 'launch-button-header';
        this.launchButton.textContent = 'LAUNCH';
        this.launchButton.style.cssText = `
            background: rgba(0, 255, 65, 0.1);
            border: 2px solid #00ff41;
            color: #00ff41;
            font-family: 'VT323', monospace;
            font-size: 16px;
            padding: 8px 16px;
            cursor: pointer;
            transition: all 0.2s ease;
            border-radius: 4px;
        `;
        
        this.launchButton.addEventListener('mouseenter', () => {
            this.launchButton.style.background = 'rgba(0, 255, 65, 0.2)';
            this.launchButton.style.transform = 'scale(1.05)';
        });
        
        this.launchButton.addEventListener('mouseleave', () => {
            this.launchButton.style.background = 'rgba(0, 255, 65, 0.1)';
            this.launchButton.style.transform = 'scale(1)';
        });
        
        this.launchButton.addEventListener('click', () => this.handleLaunch());
        this.header.appendChild(this.launchButton);
    }

    createStationWireframe(objectType = 'station') {
        // Create animated wireframe visualization matching target CPU design based on object type
        const wireframe = document.createElement('div');
        wireframe.style.cssText = `
            width: 80px;
            height: 80px;
            position: relative;
            animation: station-pulse 3s ease-in-out infinite;
        `;
        
        // Create different wireframes based on object type (matching TargetComputerManager patterns)
        switch (objectType?.toLowerCase()) {
            case 'station':
                this.createTorusWireframe(wireframe);
                break;
            case 'planet':
                this.createPlanetWireframe(wireframe);
                break;
            case 'moon':
                this.createMoonWireframe(wireframe);
                break;
            default:
                // Default to torus for unknown types
                this.createTorusWireframe(wireframe);
                break;
        }

        this.stationVisualization.appendChild(wireframe);
        
        // Add station name below wireframe
        const stationName = document.createElement('div');
        stationName.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 12px;
            color: #00ff41;
            text-align: center;
            opacity: 0.8;
        `;
        stationName.textContent = 'STATION\nWIREFRAME';
        this.stationVisualization.appendChild(stationName);
    }
    
    createTorusWireframe(wireframe) {
        // Torus ring design for stations (matching target CPU)
        // Main torus ring (outer ring)
        const outerRing = document.createElement('div');
        outerRing.style.cssText = `
            width: 80px;
            height: 80px;
            border: 2px solid #00ff41;
            border-radius: 50%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
        `;
        wireframe.appendChild(outerRing);
        
        // Inner torus tube
        const innerRing = document.createElement('div');
        innerRing.style.cssText = `
            width: 40px;
            height: 40px;
            border: 1px solid #00ff41;
            border-radius: 50%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 255, 65, 0.1);
        `;
        wireframe.appendChild(innerRing);

        // Station core hub
        const stationCore = document.createElement('div');
        stationCore.style.cssText = `
            width: 12px;
            height: 12px;
            border: 1px solid #00ff41;
            border-radius: 50%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 255, 65, 0.3);
        `;
        wireframe.appendChild(stationCore);

        // Docking spokes (like target CPU wireframes)
        for (let i = 0; i < 6; i++) {
            const spoke = document.createElement('div');
            spoke.style.cssText = `
                width: 20px;
                height: 1px;
                background: #00ff41;
                position: absolute;
                top: 50%;
                left: 50%;
                transform-origin: 0% 50%;
                transform: translate(-50%, -50%) rotate(${i * 60}deg);
                opacity: 0.7;
            `;
            wireframe.appendChild(spoke);
        }
    }
    
    createPlanetWireframe(wireframe) {
        // Icosahedron-like design for planets (triangular faces)
        const planetCore = document.createElement('div');
        planetCore.style.cssText = `
            width: 60px;
            height: 60px;
            border: 2px solid #00ff41;
            border-radius: 50%;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 255, 65, 0.1);
        `;
        wireframe.appendChild(planetCore);
        
        // Create triangular wireframe pattern
        for (let i = 0; i < 8; i++) {
            const triangle = document.createElement('div');
            triangle.style.cssText = `
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-bottom: 14px solid #00ff41;
                position: absolute;
                top: 50%;
                left: 50%;
                transform-origin: 50% 100%;
                transform: translate(-50%, -100%) rotate(${i * 45}deg);
                opacity: 0.6;
            `;
            wireframe.appendChild(triangle);
        }
    }
    
    createMoonWireframe(wireframe) {
        // Octahedron-like design for moons (angular/crystalline)
        const moonCore = document.createElement('div');
        moonCore.style.cssText = `
            width: 50px;
            height: 50px;
            border: 2px solid #00ff41;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(45deg);
            background: rgba(0, 255, 65, 0.1);
        `;
        wireframe.appendChild(moonCore);
        
        // Add diagonal cross pattern
        const cross1 = document.createElement('div');
        cross1.style.cssText = `
            width: 60px;
            height: 1px;
            background: #00ff41;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(45deg);
            opacity: 0.8;
        `;
        wireframe.appendChild(cross1);
        
        const cross2 = document.createElement('div');
        cross2.style.cssText = `
            width: 60px;
            height: 1px;
            background: #00ff41;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            opacity: 0.8;
        `;
        wireframe.appendChild(cross2);
    }
    
    updateStationWireframe(stationName, objectType = null) {
        // Clear existing wireframe
        const existingWireframe = this.stationVisualization.querySelector('div:first-child');
        if (existingWireframe && existingWireframe !== this.stationVisualization.querySelector('div:last-child')) {
            existingWireframe.remove();
        }
        
        // Create new wireframe with correct type
        if (objectType) {
            this.createStationWireframe(objectType);
        }
        
        // Update station name
        const stationNameEl = this.stationVisualization.querySelector('div:last-child');
        if (stationNameEl) {
            stationNameEl.textContent = stationName.toUpperCase();
        }
    }

    updateHeader() {
        if (!this.dockedLocation) return;

        // Get location info from solar system manager
        const info = this.starfieldManager.solarSystemManager.getCelestialBodyInfo(this.dockedLocation);
        
        // Update header title section (don't overwrite the whole header which contains launch button)
        this.headerTitle.innerHTML = `
            <div style="font-size: 16px; margin-bottom: 8px; opacity: 0.8; letter-spacing: 1px; font-family: 'VT323', monospace;">STATION MENU</div>
            <div style="font-size: 28px; font-weight: bold; color: #00ff41; margin-bottom: 8px; font-family: 'VT323', monospace;">${info?.name || 'UNKNOWN LOCATION'}</div>
            <div style="font-size: 16px; opacity: 0.9; font-family: 'VT323', monospace;">
                ${info?.diplomacy?.toUpperCase() || 'NEUTRAL'} • ${info?.type?.toUpperCase() || 'UNKNOWN'}
            </div>
        `;
        
        // Update station wireframe with correct type
        this.updateStationWireframe(info?.name || 'UNKNOWN', info?.type);
    }



    createActionButtons() {
        // Remove launch button from services (now in header)

        // Repair button
        this.repairButton = this.createServiceButton(
            '🔧 REPAIR SHIP',
            'Repair hull damage and system malfunctions',
            'repair-button',
            () => this.handleRepair()
        );

        // Shop button
        this.shopButton = this.createServiceButton(
            '🏪 UPGRADE SHIP',
            'Purchase and upgrade ship component cards',
            'shop-button',
            () => this.handleShop()
        );

        // Mission Board button
        this.missionButton = this.createServiceButton(
            '🎯 MISSION BOARD',
            'View and accept available missions and contracts',
            'mission-button',
            () => this.handleMissionBoard()
        );

        // Commodity Exchange button
        this.commodityButton = this.createServiceButton(
            '🚛 COMMODITY EXCHANGE',
            'Buy and sell commodities and cargo',
            'commodity-button',
            () => this.handleCommodityExchange()
        );

        // Add buttons to services container (no launch button)
        this.servicesContainer.appendChild(this.repairButton);
        this.servicesContainer.appendChild(this.shopButton);
        this.servicesContainer.appendChild(this.missionButton);
        this.servicesContainer.appendChild(this.commodityButton);
    }

    createServiceButton(title, description, className, clickHandler) {
        const buttonContainer = document.createElement('div');
        buttonContainer.className = `service-button ${className}`;
        buttonContainer.style.cssText = `
            background: rgba(0, 0, 0, 0.5);
            border: 1px solid #00ff41;
            padding: 12px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            font-family: 'VT323', monospace;
            border-radius: 4px;
            text-align: center;
            min-height: 80px;
            display: flex;
            flex-direction: column;
            justify-content: center;
        `;

        buttonContainer.innerHTML = `
            <div class="service-title" style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">
                ${title}
            </div>
            <div class="service-description" style="font-size: 10px; opacity: 0.7; line-height: 1.2;">
                ${description}
            </div>
        `;

        // Add hover effects (consistent with other UI buttons)
        buttonContainer.addEventListener('mouseenter', () => {
            buttonContainer.style.background = 'rgba(0, 255, 65, 0.2)';
            buttonContainer.style.borderColor = '#44ff44';
            buttonContainer.style.transform = 'scale(1.05)';
        });

        buttonContainer.addEventListener('mouseleave', () => {
            buttonContainer.style.background = 'rgba(0, 0, 0, 0.5)';
            buttonContainer.style.borderColor = '#00ff41';
            buttonContainer.style.transform = 'scale(1)';
        });

        buttonContainer.addEventListener('click', clickHandler);

        return buttonContainer;
    }

    show(dockedLocation) {
        this.dockedLocation = dockedLocation;
        this.isVisible = true;
        
        // Store original docked location for service screens to return to
        this.originalDockedLocation = dockedLocation;
        
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
        
        console.log('Station menu shown for:', dockedLocation);
    }

    hide() {
        this.isVisible = false;
        this.dockedLocation = null;
        this.container.style.display = 'none';
        console.log('Station menu hidden');
    }
    
    /**
     * Return to station menu from service screens
     * Uses the stored original docked location to ensure proper info display
     */
    returnToStationMenu() {
        if (this.originalDockedLocation) {
            this.show(this.originalDockedLocation);
        } else {
            console.warn('No original docked location stored - using current dockedLocation');
            if (this.dockedLocation) {
                this.show(this.dockedLocation);
            }
        }
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
        console.log('Launch button clicked from station menu');
        
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
            // Normalize location for mission filtering (string key)
            const locName = dockedLocation?.userData?.name || dockedLocation?.name || 'terra_prime';
            const locKey = String(locName).toLowerCase().replace(/\s+/g, '_');
            this.missionBoard.setLocation(locKey);
            
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

    handleCommodityExchange() {
        console.log('🏪 Commodity Exchange requested');
        
        // Play command sound
        if (this.starfieldManager.playCommandSound) {
            this.starfieldManager.playCommandSound();
        }
        
        // Store the docked location BEFORE hiding the interface
        const dockedLocation = this.dockedLocation;
        
        // Hide docking interface
        this.hide();
        
        // Show commodity exchange with location context
        if (this.commodityExchange && dockedLocation) {
            // Normalize location for market data (string key)
            const locName = dockedLocation?.userData?.name || dockedLocation?.name || 'terra_prime';
            const locKey = String(locName).toLowerCase().replace(/\s+/g, '_');
            
            // Store reference for return navigation
            this.commodityExchange.dockingInterface = this;
            
            // Show commodity exchange
            this.commodityExchange.show(locKey);
        } else {
            console.error('❌ Cannot access commodity exchange: exchange or location data unavailable');
        }
    }

    addStyles() {
        // Add CSS for additional styling
        const style = document.createElement('style');
        style.textContent = `
            @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
            
            .station-menu.visible {
                display: flex;
            }
            
            .station-menu .content-wrapper {
                scrollbar-width: thin;
                scrollbar-color: #00ff41 rgba(0, 255, 65, 0.1);
            }
            
            .station-menu .content-wrapper::-webkit-scrollbar {
                width: 8px;
            }
            
            .station-menu .content-wrapper::-webkit-scrollbar-track {
                background: rgba(0, 255, 65, 0.1);
                border-radius: 4px;
            }
            
            .station-menu .content-wrapper::-webkit-scrollbar-thumb {
                background-color: #00ff41;
                border-radius: 4px;
                border: 2px solid transparent;
                background-clip: content-box;
            }
            
            .station-menu .service-button.launch-button {
                border-color: #00ff41;
            }
            
            .station-menu .service-button.launch-button .service-title,
            .station-menu .service-button.launch-button .service-description {
                color: #00ff41;
            }
            
            .station-menu .service-button.launch-button:hover {
                border-color: #44ff44;
                background: rgba(0, 255, 65, 0.2) !important;
            }
            
            .station-menu .service-button.repair-button {
                border-color: #ffaa00;
            }
            
            .station-menu .service-button.repair-button .service-title,
            .station-menu .service-button.repair-button .service-description {
                color: #ffaa00;
            }
            
            .station-menu .service-button.repair-button:hover {
                border-color: #ffcc44;
                background: rgba(255, 170, 0, 0.2) !important;
            }
            
            .station-menu .service-button.shop-button {
                border-color: #0099ff;
            }
            
            .station-menu .service-button.shop-button .service-title,
            .station-menu .service-button.shop-button .service-description {
                color: #0099ff;
            }
            
            .station-menu .service-button.shop-button:hover {
                border-color: #44bbff;
                background: rgba(0, 153, 255, 0.2) !important;
            }
            
            .station-menu .service-button.inventory-button {
                border-color: #00ff99;
            }
            
            .station-menu .service-button.inventory-button .service-title,
            .station-menu .service-button.inventory-button .service-description {
                color: #00ff99;
            }
            
            .station-menu .service-button.inventory-button:hover {
                border-color: #44ffaa;
                background: rgba(0, 255, 153, 0.2) !important;
            }
            
            .station-menu .close-button {
                font-family: 'VT323', monospace;
            }
            
            .station-menu .close-button:hover {
                background: rgba(0, 255, 65, 0.2) !important;
            }
            
            /* Station wireframe animation */
            @keyframes station-pulse {
                0%, 100% {
                    opacity: 1;
                    transform: scale(1);
                }
                50% {
                    opacity: 0.7;
                    transform: scale(1.05);
                }
            }
        `;
        
        if (!document.head.querySelector('style[data-station-menu]')) {
            style.setAttribute('data-station-menu', 'true');
            document.head.appendChild(style);
        }
    }

    dispose() {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
} 