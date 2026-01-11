/**
 * CUIShopModeManager
 *
 * Extracted from CardInventoryUI to reduce file size.
 * Handles shop and inventory container management.
 *
 * Features:
 * - Shop mode container creation and management
 * - Inventory mode container creation and management
 * - Show/hide transitions
 * - Docking interface integration
 */

import { debug } from '../debug.js';
import { SHIP_CONFIGS } from '../ship/ShipConfigs.js';

export class CUIShopModeManager {
    /**
     * Create a CUIShopModeManager
     * @param {Object} cardInventoryUI - Reference to parent CardInventoryUI
     */
    constructor(cardInventoryUI) {
        this.cui = cardInventoryUI;
    }

    /**
     * Show the card inventory as a station shop
     * @param {Object} dockedLocation - The location where the ship is docked
     * @param {Object} dockingInterface - Reference to the station menu to return to
     */
    showAsShop(dockedLocation, dockingInterface) {
        this.cui.isShopMode = true;
        this.cui.dockedLocation = dockedLocation;
        this.cui.dockingInterface = dockingInterface;

        // Store reference globally for button handlers
        window.cardInventoryUI = this.cui;

        // Get current ship from starfieldManager to set the ship selector correctly
        let currentShip = null;
        if (dockingInterface && dockingInterface.starfieldManager) {
            currentShip = dockingInterface.starfieldManager.ship;
            if (currentShip && currentShip.shipType) {
                this.cui.currentShipType = currentShip.shipType;
                this.cui.currentShipConfig = SHIP_CONFIGS[this.cui.currentShipType];

                // Validate that the player owns this ship, if not fall back to first owned ship
                this.cui.validateCurrentShipOwnership();
            }
        }

        // Create shop container
        this.createShopContainer();

        this.cui.createUI();
        this.cui.setupEventListeners();

        // Only load test data if we haven't done so yet
        const hasTestData = this.cui.inventory && this.cui.inventory.getDiscoveredCards().length > 0;
        if (!hasTestData) {
            this.cui.loadTestData();
        }

        // Only load ship configuration from actual ship if we don't already have cards loaded
        // This prevents overwriting cards that the user has installed in the UI
        const hasShipSlots = this.cui.shipSlots && this.cui.shipSlots.size > 0;
        if (!hasShipSlots) {
            if (currentShip) {
                this.cui.loadCurrentShipConfiguration(currentShip);
            } else if (this.cui.currentShipType) {
                // Fallback to stored configuration if no current ship available
                this.cui.loadShipConfiguration(this.cui.currentShipType);
            }
        }

        // Always render to update the display
        this.cui.render();

        // Set the ship selector dropdown to the current ship type
        const shipSelector = document.getElementById('ship-type-select');
        if (shipSelector && this.cui.currentShipType) {
            shipSelector.value = this.cui.currentShipType;
        }

        // Clear NEW card status when shop is opened
        this.cui.clearNewCardStatus();

        // Reload quantity increase timestamps from localStorage before displaying
        this.cui.quantityIncreaseTimestamps = this.cui.getQuantityIncreaseTimestamps();
        debug('UI', 'COLLECTION: Reloaded quantity increase timestamps from localStorage');

        // Clear quantity increase status after a delay to let user see red badges first
        this.cui._setTimeout(() => {
            debug('UI', 'COLLECTION: Clearing quantity increase timestamps after delay');
            this.cui.clearQuantityIncreaseStatus();
        }, 5000); // 5 second delay to see red badges

        // Show the shop
        this.cui.shopContainer.style.display = 'block';

        debug('UI', 'Card shop opened at:', dockedLocation);
        debug('UI', 'Docking interface reference stored:', !!this.cui.dockingInterface);
    }

    /**
     * Hide the shop and return to station menu
     */
    hideShop() {
        debug('UI', 'Hiding shop...');
        debug('AI', 'Shop container exists:', !!this.cui.shopContainer);
        debug('UI', 'Docking interface exists:', !!this.cui.dockingInterface);
        debug('UI', 'Docked location exists:', !!this.cui.dockedLocation);

        if (this.cui.shopContainer && this.cui.shopContainer.parentNode) {
            this.cui.shopContainer.parentNode.removeChild(this.cui.shopContainer);
            this.cui.shopContainer = null;
        }

        // Clean up credits display
        const creditsDisplay = document.getElementById('credits-display');
        if (creditsDisplay && creditsDisplay.parentNode) {
            creditsDisplay.parentNode.removeChild(creditsDisplay);
        }

        this.cui.isShopMode = false;

        // Return to station menu
        if (this.cui.dockingInterface) {
            debug('UI', 'Attempting to show station menu...');
            try {
                this.cui.dockingInterface.returnToStationMenu();
                debug('UI', 'Successfully returned to station menu');
            } catch (error) {
                debug('UI', `Error showing station menu: ${error.message}`);
            }
        } else {
            debug('UI', 'Cannot return to station menu - missing docking interface reference');
        }

        debug('UI', 'Card shop closed');
    }

    /**
     * Create the shop container for station mode
     */
    createShopContainer() {
        // Remove existing shop container
        if (this.cui.shopContainer) {
            this.hideShop();
        }

        // Create shop container
        this.cui.shopContainer = document.createElement('div');

        this.cui.shopContainer.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.95) !important;
            color: #00ff41 !important;
            font-family: 'VT323', monospace !important;
            z-index: 1000 !important;
            display: none !important;
            overflow-y: auto !important;
            padding: 20px !important;
            box-sizing: border-box !important;
        `;

        // Set container reference for createUI
        this.cui.container = this.cui.shopContainer;

        // Add to document
        document.body.appendChild(this.cui.shopContainer);
    }

    /**
     * Show inventory interface for ship configuration management
     * @param {Object} dockedLocation - The location where the ship is docked
     * @param {Object} dockingInterface - Reference to the station menu to return to
     */
    showAsInventory(dockedLocation, dockingInterface) {
        this.cui.isShopMode = false;
        this.cui.dockedLocation = dockedLocation;
        this.cui.dockingInterface = dockingInterface;

        // Get current ship from starfieldManager to set the ship selector correctly
        let currentShip = null;
        if (dockingInterface && dockingInterface.starfieldManager) {
            currentShip = dockingInterface.starfieldManager.ship;
            if (currentShip && currentShip.shipType) {
                this.cui.currentShipType = currentShip.shipType;
                this.cui.currentShipConfig = SHIP_CONFIGS[this.cui.currentShipType];

                // Validate that the player owns this ship, if not fall back to first owned ship
                this.cui.validateCurrentShipOwnership();
            }
        }

        // Create inventory container
        this.createInventoryContainer();

        this.cui.createUI();
        this.cui.setupEventListeners();

        // Only load test data and render if we haven't loaded a ship configuration
        if (!this.cui.currentShipType || this.cui.shipSlots.size === 0) {
            this.cui.loadTestData();
            this.cui.render();
        } else {
            // Update both ship slots and inventory
            this.cui.renderShipSlots();
            this.cui.renderInventoryGrid();
            this.cui.updateCollectionStats();
            this.cui.updateCreditsDisplay();
        }

        // Load the current ship's actual configuration
        if (currentShip) {
            this.cui.loadCurrentShipConfiguration(currentShip);
        } else if (this.cui.currentShipType) {
            // Fallback to stored configuration if no current ship available
            this.cui.loadShipConfiguration(this.cui.currentShipType);
        }

        // Set the ship selector dropdown to the current ship type
        const shipSelector = document.getElementById('ship-type-select');
        if (shipSelector && this.cui.currentShipType) {
            shipSelector.value = this.cui.currentShipType;
        }

        // Show the inventory
        this.cui.inventoryContainer.style.display = 'block';

        debug('UI', 'Ship inventory opened at:', dockedLocation);
    }

    /**
     * Create the inventory container for normal mode
     */
    createInventoryContainer() {
        // Remove existing inventory container
        if (this.cui.inventoryContainer) {
            this.hideInventory();
        }

        // Create inventory container
        this.cui.inventoryContainer = document.createElement('div');

        this.cui.inventoryContainer.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            background: rgba(0, 0, 0, 0.95) !important;
            color: #00ff41 !important;
            font-family: 'VT323', monospace !important;
            z-index: 1000 !important;
            display: none !important;
            overflow-y: auto !important;
            padding: 20px !important;
            box-sizing: border-box !important;
        `;

        // Set container reference for createUI
        this.cui.container = this.cui.inventoryContainer;

        // Add to document
        document.body.appendChild(this.cui.inventoryContainer);
    }

    /**
     * Hide the inventory and return to station menu
     */
    hideInventory() {
        if (this.cui.inventoryContainer && this.cui.inventoryContainer.parentNode) {
            this.cui.inventoryContainer.parentNode.removeChild(this.cui.inventoryContainer);
            this.cui.inventoryContainer = null;
        }

        this.cui.isShopMode = false;

        // Return to station menu
        if (this.cui.dockingInterface) {
            this.cui.dockingInterface.returnToStationMenu();
        }

        debug('UI', 'Ship inventory closed');
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.cui = null;
    }
}
