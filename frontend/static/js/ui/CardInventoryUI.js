import { debug } from '../debug.js';
import { CardValidationEngine } from './CardValidationEngine.js';
import { getBadgeManager } from './CardBadgeManager.js';
import { getUpgradeAudioManager } from './CardUpgradeAudioManager.js';

// Extracted handlers (reduce file size by delegating functionality)
import { CUIDragDropHandler } from './CUIDragDropHandler.js';
import { CUISlotRenderer } from './CUISlotRenderer.js';
import { CUICardRenderer } from './CUICardRenderer.js';
import { CUIModalManager } from './CUIModalManager.js';
import { CUIShipConfigManager } from './CUIShipConfigManager.js';
import { CUITestDataLoader } from './CUITestDataLoader.js';
import { getStyleManager } from './CUIStyleManager.js';
import { CUIShopModeManager } from './CUIShopModeManager.js';
import { CUIUICreator } from './CUIUICreator.js';
import { CUICardUpgradeManager } from './CUICardUpgradeManager.js';
import { CUICardSlotManager } from './CUICardSlotManager.js';

// Player data (extracted to separate module)
import { playerData } from './PlayerData.js';

// Core inventory and ship configuration
import CardInventory from '../ship/CardInventory.js';
import { SHIP_CONFIGS } from '../ship/ShipConfigs.js';

export default class CardInventoryUI {
    constructor(containerId) {
        // SINGLETON PATTERN: Return existing instance if it exists
        if (CardInventoryUI.instance) {
            // Update container if a new one is provided
            if (containerId && containerId !== CardInventoryUI.instance.containerId) {
                CardInventoryUI.instance.setContainer(containerId);
            }
            return CardInventoryUI.instance;
        }
        
        this.containerId = containerId;
        this.container = containerId ? document.getElementById(containerId) : null;
        this.inventory = new CardInventory();
        this.shipSlots = new Map(); // Map of slotId -> card
        // this.credits = 50000; // Removed - using unified credits system
        this.currentShipType = 'starter_ship';
        this.currentShipConfig = SHIP_CONFIGS[this.currentShipType];
        this.isShopMode = false;
        this.dockedLocation = null;
        this.dockingInterface = null;
        this.isInitialized = false;

        // Track timeouts for cleanup
        this.activeTimeouts = new Set();

        // Bound event handlers for proper cleanup
        this._boundHandlers = {
            dragStart: null,
            dragEnd: null,
            trackInteraction: null
        };

        // Track event listener types for interaction tracking
        this._interactionEventTypes = ['click', 'touchstart', 'keydown'];

        // Initialize badge manager for NEW and quantity increase badges
        this.badgeManager = getBadgeManager();

        // Expose badge state for backwards compatibility
        this.lastShopVisit = this.badgeManager.lastShopVisit;
        this.newCardTimestamps = this.badgeManager.newCardTimestamps;
        this.quantityIncreaseTimestamps = this.badgeManager.quantityIncreaseTimestamps;

        // Audio setup for upgrade sounds (delegated to CardUpgradeAudioManager)
        this.audioManager = getUpgradeAudioManager();

        // Initialize extracted handlers (reduces file size by delegating functionality)
        this.dragDropHandler = new CUIDragDropHandler(this);
        this.slotRenderer = new CUISlotRenderer(this);
        this.cardRenderer = new CUICardRenderer(this);
        this.modalManager = new CUIModalManager(this);
        this.shipConfigManager = new CUIShipConfigManager(this, playerData);
        this.testDataLoader = new CUITestDataLoader(this);
        this.styleManager = getStyleManager();
        this.shopModeManager = new CUIShopModeManager(this);
        this.uiCreator = new CUIUICreator(this);
        this.cardUpgradeManager = new CUICardUpgradeManager(this);
        this.cardSlotManager = new CUICardSlotManager(this);

        // Set singleton instance and global reference
        CardInventoryUI.instance = this;
        window.cardInventoryUI = this;
        
        // Only check for container if containerId was provided
        if (containerId && !this.container) {
            debug('UI', `❌ Container with id '${containerId}' not found`);
            return;
        }
        
        // Only initialize UI if we have a container or if containerId is null (shop mode)
        if (this.container || containerId === null) {
            this.init();
        }
    }
    
    /**
     * Set or update the container for this instance
     */
    setContainer(containerId) {
        this.containerId = containerId;
        this.container = containerId ? document.getElementById(containerId) : null;
        
        if (containerId && !this.container) {
            debug('UI', `❌ Container with id '${containerId}' not found`);
            return;
        }

        // Re-initialize UI if we now have a container
        if (this.container && !this.isInitialized) {
            this.init();
        }
        
    }
    
    /**
     * Get the singleton instance (create if doesn't exist)
     */
    static getInstance(containerId = null) {
        if (!CardInventoryUI.instance) {
            new CardInventoryUI(containerId);
        }
        return CardInventoryUI.instance;
    }

    // ========================================
    // Badge Tracking Methods
    // (Implementation moved to CardBadgeManager)
    // ========================================

    getLastShopVisit() {
        return this.badgeManager.getLastShopVisit();
    }

    saveLastShopVisit() {
        this.badgeManager.saveLastShopVisit();
        this.lastShopVisit = this.badgeManager.lastShopVisit;
    }

    getNewCardTimestamps() {
        return this.badgeManager.getNewCardTimestamps();
    }

    getQuantityIncreaseTimestamps() {
        return this.badgeManager.getQuantityIncreaseTimestamps();
    }

    saveNewCardTimestamps() {
        this.badgeManager.saveNewCardTimestamps();
    }

    saveQuantityIncreaseTimestamps() {
        this.badgeManager.saveQuantityIncreaseTimestamps();
    }

    markCardAsNew(cardType) {
        this.badgeManager.markCardAsNew(cardType);
        this.newCardTimestamps = this.badgeManager.newCardTimestamps;
    }

    isCardNew(cardType) {
        return this.badgeManager.isCardNew(cardType);
    }

    markCardQuantityIncrease(cardType) {
        this.badgeManager.markCardQuantityIncrease(cardType);
        this.quantityIncreaseTimestamps = this.badgeManager.quantityIncreaseTimestamps;
    }

    hasQuantityIncrease(cardType) {
        return this.badgeManager.hasQuantityIncrease(cardType);
    }

    clearNewCardStatus() {
        this.badgeManager.clearNewCardStatus();
        this.lastShopVisit = this.badgeManager.lastShopVisit;
    }

    clearQuantityIncreaseStatus() {
        this.badgeManager.clearQuantityIncreaseStatus();
        this.quantityIncreaseTimestamps = this.badgeManager.quantityIncreaseTimestamps;
    }

    // ========================================
    // Audio Methods
    // (Implementation moved to CardUpgradeAudioManager)
    // ========================================

    /**
     * Play upgrade success sound
     * Delegates to CardUpgradeAudioManager
     */
    playUpgradeSound() {
        this.audioManager.playUpgradeSound();
    }

    /**
     * Create a tracked timeout that will be cleared on destroy
     * @param {Function} callback - Callback to execute
     * @param {number} delay - Delay in milliseconds
     * @returns {number} - Timeout ID
     */
    _createTrackedTimeout(callback, delay) {
        const timeoutId = setTimeout(() => {
            this.activeTimeouts.delete(timeoutId);
            callback();
        }, delay);
        this.activeTimeouts.add(timeoutId);
        return timeoutId;
    }

    /**
     * Clear all tracked timeouts
     */
    _clearAllTimeouts() {
        this.activeTimeouts.forEach(timeoutId => {
            clearTimeout(timeoutId);
        });
        this.activeTimeouts.clear();
    }

    /**
     * Wrapped setTimeout that tracks the timeout ID for cleanup on destroy
     * @param {Function} callback - The function to call after the delay
     * @param {number} delay - The delay in milliseconds
     * @returns {number} The timeout ID
     */
    _setTimeout(callback, delay) {
        const id = setTimeout(() => {
            this.activeTimeouts.delete(id);
            callback();
        }, delay);
        this.activeTimeouts.add(id);
        return id;
    }

    /**
     * Clean up resources (legacy alias for destroy)
     */
    dispose() {
        this.destroy();
    }

    /**
     * Comprehensive cleanup of all resources
     */
    destroy() {
        debug('UI', 'CardInventoryUI destroy() called - cleaning up all resources');

        // Clear all tracked timeouts
        this._clearAllTimeouts();

        // Remove document-level drag event listeners
        if (this._boundHandlers.dragStart) {
            document.removeEventListener('dragstart', this._boundHandlers.dragStart);
            this._boundHandlers.dragStart = null;
        }

        if (this._boundHandlers.dragEnd) {
            document.removeEventListener('dragend', this._boundHandlers.dragEnd);
            this._boundHandlers.dragEnd = null;
        }

        // Audio cleanup is handled by CardUpgradeAudioManager (singleton persists)

        // Clear data structures
        if (this.shipSlots) {
            this.shipSlots.clear();
        }

        // Clear DOM container reference
        if (this.container) {
            this.container.innerHTML = '';
            this.container = null;
        }

        // Clear singleton instance and global reference
        if (CardInventoryUI.instance === this) {
            CardInventoryUI.instance = null;
        }

        if (window.cardInventoryUI === this) {
            window.cardInventoryUI = null;
        }

        this.isInitialized = false;

        debug('UI', 'CardInventoryUI cleanup complete');
    }

    /**
     * Static method to access player data
     * @returns {PlayerData} The global player data instance
     */
    static getPlayerData() {
        return playerData;
    }

    /**
     * Add a ship to the player's collection
     * @param {string} shipType - Ship type to add
     */
    addShipToPlayer(shipType) {
        if (SHIP_CONFIGS[shipType]) {
            playerData.addShip(shipType);
            
            // Refresh the ship selector if we're in shop mode
            if (this.isShopMode) {
                const shipSelector = document.getElementById('ship-type-select');
                if (shipSelector) {
                    shipSelector.innerHTML = this.createShipTypeOptions();
                }
            }
        } else {
            debug('UI', `⚠️ Cannot add unknown ship type: ${shipType}`);
        }
    }

    init() {
        // Only create UI if we have a container
        if (this.container) {
            this.createUI();
            this.setupEventListeners();
            
            // Only load test data and render if we haven't loaded a ship configuration
            if (!this.currentShipType || this.shipSlots.size === 0) {
                this.loadTestData();
                this.render();
            } else {
                // Only update the inventory portion, not the ship slots
                this.renderInventoryGrid();
                this.updateCollectionStats();
                this.updateCreditsDisplay();
                this.renderShipSlots();
            }
        } else {
            // For temporary instances, just load test data without UI
            this.loadTestData();
        }
        
        // Mark as initialized
        this.isInitialized = true;
    }

    /**
     * Show the card inventory as a station shop
     * @param {Object} dockedLocation - The location where the ship is docked
     * @param {Object} dockingInterface - Reference to the station menu to return to
     */
    showAsShop(dockedLocation, dockingInterface) {
        this.shopModeManager.showAsShop(dockedLocation, dockingInterface);
    }

    /**
     * Validate that the current ship type is owned by the player
     * If not, fall back to the first owned ship
     */
    validateCurrentShipOwnership() {
        if (!playerData.ownsShip(this.currentShipType)) {
            const ownedShips = playerData.getOwnedShips();
            if (ownedShips.length > 0) {
                debug('UI', `⚠️ Player doesn't own ${this.currentShipType}, falling back to ${ownedShips[0]}`);
                this.currentShipType = ownedShips[0];
                this.currentShipConfig = SHIP_CONFIGS[this.currentShipType];
            } else {
                debug('UI', '❌ Player owns no ships! Adding starter ship as fallback.');
                playerData.addShip('starter_ship');
                this.currentShipType = 'starter_ship';
                this.currentShipConfig = SHIP_CONFIGS[this.currentShipType];
            }
        }
    }

    /**
     * Hide the shop and return to station menu
     */
    hideShop() {
        this.shopModeManager.hideShop();
    }

    /**
     * Create the shop container for station mode
     */
    createShopContainer() {
        this.shopModeManager.createShopContainer();
    }

    /**
     * Load test data for demonstration
     */
    loadTestData() {
        this.testDataLoader.loadTestData();
    }

    /**
     * Add CSS styles for NEW badge
     */
    addNewBadgeStyles() {
        this.styleManager.addBadgeStyles();
    }

    /**
     * Create the UI elements
     */
    createUI() {
        this.uiCreator.createUI();
    }

    /**
     * Create ship slots panel (left side in normal mode)
     */
    createShipSlotsPanel() {
        this.uiCreator.createShipSlotsPanel();
    }

    /**
     * Create inventory panel (right side)
     */
    createInventoryPanel() {
        this.uiCreator.createInventoryPanel();
    }

    /**
     * Create ship selector dropdown
     */
    createShipSelector() {
        this.uiCreator.createShipSelector();
    }

    /**
     * Create ship type options for dropdown
     */
    createShipTypeOptions() {
        return this.uiCreator.createShipTypeOptions();
    }

    /**
     * Create ship stats display
     */
    createShipStats() {
        this.uiCreator.createShipStats();
    }

    /**
     * Create inventory grid (deprecated - use createInventoryPanel instead)
     */
    createInventoryGrid() {
        this.uiCreator.createInventoryGrid();
    }

    /**
     * Create collection stats display
     */
    createCollectionStats() {
        this.uiCreator.createCollectionStats();
    }

    /**
     * Create ship configuration panel with ship slots (deprecated - use createShipSlotsPanel)
     */
    createShipConfigurationPanel() {
        this.uiCreator.createShipConfigurationPanel();
    }

    /**
     * Render ship slots based on current ship configuration
     */
    renderShipSlots() {
        this.uiCreator.renderShipSlots();
    }

    /**
     * Generate slot type mapping based on ship configuration
     */
    generateSlotTypeMapping(config) {
        return this.uiCreator.generateSlotTypeMapping(config);
    }

    /**
     * Get icon for slot type
     */
    getSlotTypeIcon(slotType) {
        return this.uiCreator.getSlotTypeIcon(slotType);
    }

    /**
     * Setup event listeners for drag and drop
     */
    setupEventListeners() {
        this.dragDropHandler.setupEventListeners();
    }

    /**
     * Handle drag start - delegates to dragDropHandler
     */
    handleDragStart(e) {
        this.dragDropHandler.handleDragStart(e);
    }

    /**
     * Handle drag end - delegates to dragDropHandler
     */
    handleDragEnd(e) {
        this.dragDropHandler.handleDragEnd(e);
    }

    /**
     * Handle drag over - delegates to dragDropHandler
     */
    handleDragOver(e) {
        return this.dragDropHandler.handleDragOver(e);
    }

    /**
     * Handle drag enter - delegates to dragDropHandler
     */
    handleDragEnter(e) {
        this.dragDropHandler.handleDragEnter(e);
    }

    /**
     * Handle drag leave - delegates to dragDropHandler
     */
    handleDragLeave(e) {
        this.dragDropHandler.handleDragLeave(e);
    }

    /**
     * Handle drop - delegates to dragDropHandler
     */
    async handleDrop(e) {
        return await this.dragDropHandler.handleDrop(e);
    }

    /**
     * Install a card in a slot (called by dragDropHandler)
     * @param {string} slotId - Slot ID
     * @param {string} cardType - Card type
     * @param {number} level - Card level
     * @returns {Promise<boolean>} Success status
     */
    async installCardInSlot(slotId, cardType, level) {
        return await this.cardSlotManager.installCardInSlot(slotId, cardType, level);
    }

    // ========================================
    // Card Validation Methods
    // (Implementation moved to CardValidationEngine)
    // ========================================

    /**
     * Check if a card type is compatible with a slot type
     */
    isCardCompatibleWithSlot(cardType, slotType) {
        return CardValidationEngine.isCardCompatibleWithSlot(cardType, slotType, this.currentShipType);
    }

    /**
     * Check if a ship type is a capital ship (can use capital ship systems)
     */
    isCapitalShipType(shipType) {
        return CardValidationEngine.isCapitalShipType(shipType);
    }

    /**
     * Check if a ship type is a station (can use station-specific systems)
     */
    isStationType(shipType) {
        return CardValidationEngine.isStationType(shipType);
    }

    /**
     * Check if a cargo hold card can be removed safely
     * @param {Object} card - The card being removed
     * @param {number} slotId - The slot ID
     * @returns {boolean} True if removal should be cancelled
     */
    async checkCargoHoldRemoval(card, slotId) {
        return await this.cardSlotManager.checkCargoHoldRemoval(card, slotId);
    }
    
    /**
     * Show cargo removal confirmation modal
     * Delegates to CUIModalManager
     */
    async showCargoRemovalConfirmation(card, slotId, holdSlot, cargoContents, cargoManager) {
        return this.modalManager.showCargoRemovalConfirmation(card, slotId, holdSlot, cargoContents, cargoManager);
    }
    
    /**
     * Show notification after cargo is dumped
     * Delegates to CUIModalManager
     */
    showCargoDumpNotification(dumpedCargo) {
        this.modalManager.showCargoDumpNotification(dumpedCargo);
    }
    
    /**
     * Show trading notification
     * Delegates to CUIModalManager
     */
    showTradeNotification(message, type = 'info') {
        this.modalManager.showTradeNotification(message, type);
    }

    /**
     * Remove a card from a ship slot
     */
    async removeCard(slotId) {
        await this.cardSlotManager.removeCard(slotId);
    }

    /**
     * Render the entire UI
     */
    render() {
        this.renderInventoryGrid();
        this.updateCollectionStats();
        this.updateCreditsDisplay();
        // Always render ship slots in both modes
        this.renderShipSlots();
    }

    /**
     * Render the inventory grid
     */
    renderInventoryGrid() {
        this.cardRenderer.renderInventoryGrid();
    }

    /**
     * Render a single card stack
     */
    renderCardStack(stack) {
        return this.cardRenderer.renderCardStack(stack);
    }

    /**
     * Update collection statistics
     */
    updateCollectionStats() {
        this.cardRenderer.updateCollectionStats();
    }

    /**
     * Update credits display
     */
    updateCreditsDisplay() {
        this.cardRenderer.updateCreditsDisplay();
    }

    /**
     * Update ship stats display
     */
    updateShipStats() {
        this.cardRenderer.updateShipStats();
    }

    /**
     * Switch to a different ship type
     * @param {string} shipType - Ship type to switch to
     */
    async switchShip(shipType) {
        await this.shipConfigManager.switchShip(shipType);
    }

    /**
     * Save current ship configuration
     */
    saveCurrentShipConfiguration() {
        this.shipConfigManager.saveCurrentShipConfiguration();
    }

    /**
     * Load ship configuration from stored player data
     * @param {string} shipType - Ship type to load configuration for
     */
    loadShipConfiguration(shipType) {
        this.shipConfigManager.loadShipConfiguration(shipType);
    }

    /**
     * Show inventory interface for ship configuration management
     */
    showAsInventory(dockedLocation, dockingInterface) {
        this.shopModeManager.showAsInventory(dockedLocation, dockingInterface);
    }

    /**
     * Create the inventory container for normal mode
     */
    createInventoryContainer() {
        this.shopModeManager.createInventoryContainer();
    }

    /**
     * Hide the inventory and return to station menu
     */
    hideInventory() {
        this.shopModeManager.hideInventory();
    }

    /**
     * Load current ship configuration from the actual game ship
     * @param {Object} ship - The current ship object from the game
     */
    loadCurrentShipConfiguration(ship) {
        this.shipConfigManager.loadCurrentShipConfiguration(ship);
    }

    /**
     * Check if a card type is a weapon
     */
    isWeaponCard(cardType) {
        return CardValidationEngine.isWeaponCard(cardType);
    }

    /**
     * Upgrade a card stack to the next level
     * @param {string} cardType - Type of card to upgrade
     */
    async upgradeCard(cardType) {
        await this.cardUpgradeManager.upgradeCard(cardType);
    }

    /**
     * Static method to mark a card as newly awarded (can be called from anywhere)
     * @param {string} cardType - The type of card that was awarded
     */
    static markCardAsNewlyAwarded(cardType) {
        // Update the global instance if it exists
        if (window.cardInventoryUI) {
            window.cardInventoryUI.markCardAsNew(cardType);
        } else {
            // If no instance exists, store in localStorage directly
            const stored = localStorage.getItem('planetz_new_card_timestamps');
            const timestamps = stored ? JSON.parse(stored) : {};
            timestamps[cardType] = Date.now();
            localStorage.setItem('planetz_new_card_timestamps', JSON.stringify(timestamps));
        }
        debug('UI', `🆕 Card marked as NEW: ${cardType}`);
    }

    /**
     * Static method to mark a card as having a quantity increase (can be called from anywhere)
     * @param {string} cardType - The type of card that had a quantity increase
     */
    static markCardQuantityIncrease(cardType) {
        // ALWAYS store directly to localStorage to ensure persistence
        // This bypasses any instance issues and guarantees the data is saved
        const stored = localStorage.getItem('planetz_quantity_increase_timestamps');
        const timestamps = stored ? JSON.parse(stored) : {};
        const timestamp = Date.now();
        timestamps[cardType] = timestamp;
        const jsonString = JSON.stringify(timestamps);
        localStorage.setItem('planetz_quantity_increase_timestamps', jsonString);
        
        // Also update the instance if it exists (for immediate UI updates)
        if (window.cardInventoryUI && window.cardInventoryUI.quantityIncreaseTimestamps) {
            window.cardInventoryUI.quantityIncreaseTimestamps[cardType] = Date.now();
        }
        
        debug('UI', `📈 Card marked as quantity increase: ${cardType}`);
    }
}

