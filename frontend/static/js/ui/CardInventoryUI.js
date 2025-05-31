/**
 * CardInventoryUI class - Drag-and-drop interface for card inventory management
 * 
 * Features:
 * - Card inventory UI with grid layout
 * - Ship slot interface for card installation
 * - Card transfer system between inventory and slots
 * - Visual feedback for valid drops and build validation
 */

import CardInventory from '../ship/CardInventory.js';
import { CARD_TYPES, CARD_ICONS } from '../ship/NFTCard.js';
import { SHIP_CONFIGS, getAvailableShipTypes } from '../ship/ShipConfigs.js';
import NFTCard from '../ship/NFTCard.js';

// Simple player data structure for ship ownership
class PlayerData {
    constructor() {
        this.ownedShips = new Set(['starter_ship']); // Player starts with starter ship
        this.credits = 50000;
        this.shipConfigurations = new Map(); // Store equipped cards for each ship
        
        // Initialize starter ship with basic configuration
        this.shipConfigurations.set('starter_ship', new Map([
            ['utility_1', { cardType: 'target_computer', level: 1 }],
            ['engine_1', { cardType: 'impulse_engines', level: 1 }],
            ['power_1', { cardType: 'energy_reactor', level: 1 }],
            ['weapon_1', { cardType: 'laser_cannon', level: 1 }],
            ['weapon_2', { cardType: 'pulse_cannon', level: 1 }],
            ['weapon_3', { cardType: 'plasma_cannon', level: 1 }],
            ['weapon_4', { cardType: 'phaser_array', level: 1 }]
        ]));
    }
    
    /**
     * Add a ship to the player's collection
     * @param {string} shipType - Ship type to add
     */
    addShip(shipType) {
        this.ownedShips.add(shipType);
        // Initialize empty configuration for new ship
        if (!this.shipConfigurations.has(shipType)) {
            this.shipConfigurations.set(shipType, new Map());
        }
    }
    
    /**
     * Check if player owns a specific ship
     * @param {string} shipType - Ship type to check
     * @returns {boolean}
     */
    ownsShip(shipType) {
        return this.ownedShips.has(shipType);
    }
    
    /**
     * Get list of owned ships
     * @returns {Array<string>}
     */
    getOwnedShips() {
        return Array.from(this.ownedShips);
    }
    
    /**
     * Purchase a ship if player has enough credits
     * @param {string} shipType - Ship type to purchase
     * @param {number} cost - Cost of the ship
     * @returns {boolean} - Whether purchase was successful
     */
    purchaseShip(shipType, cost) {
        if (this.credits >= cost && !this.ownedShips.has(shipType)) {
            this.credits -= cost;
            this.addShip(shipType);
            return true;
        }
        return false;
    }
    
    /**
     * Get ship configuration (equipped cards)
     * @param {string} shipType - Ship type
     * @returns {Map} - Map of slotId -> cardData
     */
    getShipConfiguration(shipType) {
        return this.shipConfigurations.get(shipType) || new Map();
    }
    
    /**
     * Save ship configuration (equipped cards)
     * @param {string} shipType - Ship type
     * @param {Map} configuration - Map of slotId -> cardData
     */
    saveShipConfiguration(shipType, configuration) {
        this.shipConfigurations.set(shipType, new Map(configuration));
    }
    
    /**
     * Install a card in a specific ship's slot
     * @param {string} shipType - Ship type
     * @param {string} slotId - Slot identifier
     * @param {Object} cardData - Card data {cardType, level}
     */
    installCardInShip(shipType, slotId, cardData) {
        if (!this.shipConfigurations.has(shipType)) {
            this.shipConfigurations.set(shipType, new Map());
        }
        this.shipConfigurations.get(shipType).set(slotId, cardData);
    }
    
    /**
     * Remove a card from a specific ship's slot
     * @param {string} shipType - Ship type
     * @param {string} slotId - Slot identifier
     */
    removeCardFromShip(shipType, slotId) {
        const config = this.shipConfigurations.get(shipType);
        if (config) {
            config.delete(slotId);
        }
    }
}

// Global player data instance
const playerData = new PlayerData();

export default class CardInventoryUI {
    constructor(containerId) {
        this.containerId = containerId;
        this.container = containerId ? document.getElementById(containerId) : null;
        this.inventory = new CardInventory();
        this.shipSlots = new Map(); // Map of slotId -> card
        this.credits = 50000; // Starting credits
        this.currentShipType = 'starter_ship';
        this.currentShipConfig = SHIP_CONFIGS[this.currentShipType];
        this.isShopMode = false;
        this.dockedLocation = null;
        this.dockingInterface = null;
        
        // Audio setup for upgrade sounds
        this.initializeAudio();
        
        // Set global reference for button onclick handlers
        window.cardInventoryUI = this;
        
        // Only check for container if containerId was provided
        if (containerId && !this.container) {
            console.error(`Container with id '${containerId}' not found`);
            return;
        }
        
        // Only initialize UI if we have a container or if containerId is null (shop mode)
        if (this.container || containerId === null) {
            this.init();
        }
    }

    /**
     * Initialize audio components for upgrade sounds
     */
    initializeAudio() {
        console.log('🔊 Initializing upgrade audio...');
        
        try {
            // Initialize THREE.js audio context if not already available
            if (typeof window.THREE !== 'undefined' && window.THREE.AudioListener) {
                console.log('✅ THREE.js audio available');
                this.audioListener = new window.THREE.AudioListener();
                this.upgradeSound = new window.THREE.Audio(this.audioListener);
                this.upgradeSoundLoaded = false;
                
                // Load upgrade sound
                const audioLoader = new window.THREE.AudioLoader();
                console.log('🎵 Loading upgrade sound...');
                
                audioLoader.load(
                    'audio/blurb.mp3', // Simplified path
                    (buffer) => {
                        console.log('✅ Upgrade sound loaded successfully');
                        this.upgradeSound.setBuffer(buffer);
                        this.upgradeSound.setVolume(0.7); // Set reasonable volume
                        this.upgradeSoundLoaded = true;
                        console.log('🎵 Upgrade sound initialization complete');
                    },
                    (progress) => {
                        console.log(`🎵 Loading upgrade sound: ${(progress.loaded / progress.total * 100).toFixed(2)}%`);
                    },
                    (error) => {
                        console.error('❌ Error loading upgrade sound:', error);
                        this.upgradeSoundLoaded = false;
                        // Try fallback HTML5 audio
                        this.initializeFallbackAudio();
                    }
                );
            } else {
                console.warn('⚠️ THREE.js not available for audio initialization, using fallback');
                this.upgradeSoundLoaded = false;
                // Use fallback HTML5 audio
                this.initializeFallbackAudio();
            }
        } catch (error) {
            console.error('❌ Error initializing upgrade audio:', error);
            this.upgradeSoundLoaded = false;
            // Use fallback HTML5 audio
            this.initializeFallbackAudio();
        }
    }

    /**
     * Initialize fallback HTML5 audio
     */
    initializeFallbackAudio() {
        console.log('🔄 Initializing fallback HTML5 audio...');
        try {
            this.fallbackAudio = new Audio('audio/blurb.mp3');
            this.fallbackAudio.volume = 0.7;
            this.fallbackAudio.preload = 'auto';
            
            this.fallbackAudio.addEventListener('canplaythrough', () => {
                console.log('✅ Fallback audio loaded successfully');
                this.fallbackAudioLoaded = true;
            });
            
            this.fallbackAudio.addEventListener('error', (e) => {
                console.error('❌ Fallback audio loading failed:', e);
                this.fallbackAudioLoaded = false;
            });
            
        } catch (error) {
            console.error('❌ Error initializing fallback audio:', error);
            this.fallbackAudioLoaded = false;
        }
    }

    /**
     * Play upgrade success sound
     */
    playUpgradeSound() {
        console.log('🎵 Attempting to play upgrade sound...');
        
        try {
            // Try THREE.js audio first
            if (this.upgradeSoundLoaded && this.upgradeSound && !this.upgradeSound.isPlaying) {
                console.log('🎵 Playing THREE.js upgrade sound');
                
                // Ensure AudioContext is running before playing sounds
                if (this.audioListener.context.state === 'suspended') {
                    this.audioListener.context.resume();
                }
                
                this.upgradeSound.play();
                console.log('✅ Playing upgrade success sound (blurb.mp3) via THREE.js');
                return;
            }
            
            // Try fallback HTML5 audio
            if (this.fallbackAudioLoaded && this.fallbackAudio) {
                console.log('🎵 Playing fallback HTML5 upgrade sound');
                
                // Reset audio to beginning
                this.fallbackAudio.currentTime = 0;
                
                const playPromise = this.fallbackAudio.play();
                if (playPromise !== undefined) {
                    playPromise.then(() => {
                        console.log('✅ Playing upgrade success sound (blurb.mp3) via HTML5 audio');
                    }).catch((error) => {
                        console.error('❌ HTML5 audio play failed:', error);
                    });
                }
                return;
            }
            
            // If neither audio method worked
            if (!this.upgradeSoundLoaded && !this.fallbackAudioLoaded) {
                console.log('⚠️ Upgrade sound not loaded, trying to reload...');
                // Try to reinitialize audio
                this.initializeAudio();
            }
            
        } catch (error) {
            console.error('❌ Error playing upgrade sound:', error);
        }
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
            console.warn(`Cannot add unknown ship type: ${shipType}`);
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
    }

    /**
     * Show the card inventory as a station shop
     * @param {Object} dockedLocation - The location where the ship is docked
     * @param {Object} dockingInterface - Reference to the docking interface to return to
     */
    showAsShop(dockedLocation, dockingInterface) {
        this.isShopMode = true;
        this.dockedLocation = dockedLocation;
        this.dockingInterface = dockingInterface;
        
        // Store reference globally for button handlers
        window.cardInventoryUI = this;
        
        // Get current ship from starfieldManager to set the ship selector correctly
        let currentShip = null;
        if (dockingInterface && dockingInterface.starfieldManager) {
            currentShip = dockingInterface.starfieldManager.ship;
            if (currentShip && currentShip.shipType) {
                this.currentShipType = currentShip.shipType;
                this.currentShipConfig = SHIP_CONFIGS[this.currentShipType];
                
                // Validate that the player owns this ship, if not fall back to first owned ship
                this.validateCurrentShipOwnership();
            }
        }
        
        // Create shop container
        this.createShopContainer();
        
        this.createUI();
        this.setupEventListeners();
        
        // Only load test data if we haven't done so yet
        const hasTestData = this.inventory && this.inventory.getDiscoveredCards().length > 0;
        if (!hasTestData) {
            this.loadTestData();
        }
        
        // Only load ship configuration from actual ship if we don't already have cards loaded
        // This prevents overwriting cards that the user has installed in the UI
        const hasShipSlots = this.shipSlots && this.shipSlots.size > 0;
        if (!hasShipSlots) {
            if (currentShip) {
                this.loadCurrentShipConfiguration(currentShip);
            } else if (this.currentShipType) {
                // Fallback to stored configuration if no current ship available
                this.loadShipConfiguration(this.currentShipType);
            }
        }
        
        // Always render to update the display
        this.render();
        
        // Set the ship selector dropdown to the current ship type
        const shipSelector = document.getElementById('ship-type-select');
        if (shipSelector && this.currentShipType) {
            shipSelector.value = this.currentShipType;
        }
        
        // Show the shop
        this.shopContainer.style.display = 'block';
        
        console.log('Card shop opened at:', dockedLocation);
        console.log('Docking interface reference stored:', !!this.dockingInterface);
    }

    /**
     * Validate that the current ship type is owned by the player
     * If not, fall back to the first owned ship
     */
    validateCurrentShipOwnership() {
        if (!playerData.ownsShip(this.currentShipType)) {
            const ownedShips = playerData.getOwnedShips();
            if (ownedShips.length > 0) {
                console.warn(`Player doesn't own ${this.currentShipType}, falling back to ${ownedShips[0]}`);
                this.currentShipType = ownedShips[0];
                this.currentShipConfig = SHIP_CONFIGS[this.currentShipType];
            } else {
                console.error('Player owns no ships! Adding starter ship as fallback.');
                playerData.addShip('starter_ship');
                this.currentShipType = 'starter_ship';
                this.currentShipConfig = SHIP_CONFIGS[this.currentShipType];
            }
        }
    }

    /**
     * Hide the shop and return to docking interface
     */
    hideShop() {
        console.log('Hiding shop...');
        console.log('Shop container exists:', !!this.shopContainer);
        console.log('Docking interface exists:', !!this.dockingInterface);
        console.log('Docked location exists:', !!this.dockedLocation);
        
        if (this.shopContainer && this.shopContainer.parentNode) {
            this.shopContainer.parentNode.removeChild(this.shopContainer);
            this.shopContainer = null;
        }
        
        // Clean up credits display
        const creditsDisplay = document.getElementById('credits-display');
        if (creditsDisplay && creditsDisplay.parentNode) {
            creditsDisplay.parentNode.removeChild(creditsDisplay);
        }
        
        this.isShopMode = false;
        
        // Return to docking interface
        if (this.dockingInterface && this.dockedLocation) {
            console.log('Attempting to show docking interface...');
            try {
                this.dockingInterface.show(this.dockedLocation);
                console.log('Successfully returned to docking interface');
            } catch (error) {
                console.error('Error showing docking interface:', error);
            }
        } else {
            console.error('Cannot return to docking interface - missing reference or location');
            console.log('dockingInterface:', this.dockingInterface);
            console.log('dockedLocation:', this.dockedLocation);
        }
        
        console.log('Card shop closed');
    }

    /**
     * Create the shop container for station mode
     */
    createShopContainer() {
        // Remove existing shop container
        if (this.shopContainer) {
            this.hideShop();
        }
        
        // Create shop container
        this.shopContainer = document.createElement('div');
        
        this.shopContainer.style.cssText = `
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
        this.container = this.shopContainer;
        
        // Add to document
        document.body.appendChild(this.shopContainer);
    }

    /**
     * Load test data for demonstration
     */
    loadTestData() {
        console.log('Loading test data for card inventory...');
        
        // Generate some random cards for testing
        for (let i = 0; i < 15; i++) {
            const card = this.inventory.generateRandomCard();
            this.inventory.addCard(card);
        }
        
        // Add essential core system cards that players need guaranteed access to
        const specificCards = [
            // Core propulsion systems
            'impulse_engines',
            'warp_drive',
            
            // Essential defense systems
            'shields',
            'shield_generator',
            'hull_plating',
            
            // Core weapon systems - energy weapons
            'laser_cannon',
            'plasma_cannon',
            'pulse_cannon',
            'phaser_array',
            
            // Core weapon systems - projectile weapons
            'standard_missile',
            'homing_missile',
            'photon_torpedo',
            'proximity_mine',
            
            // Essential navigation and communication systems
            'galactic_chart',           // Required for G key functionality
            'long_range_scanner',       // Required for L key functionality  
            'subspace_radio',           // Required for R key functionality
            'target_computer',          // Required for T key functionality
            
            // Core power and utility systems
            'energy_reactor',
            'cargo_hold'
        ];
        
        specificCards.forEach(cardType => {
            const card = this.inventory.generateSpecificCard(cardType, 'common');
            this.inventory.addCard(card);
        });
        
        // Add MANY more impulse engines to allow upgrading to higher levels
        // Level 5 engine (max impulse 9) needs 20 cards total
        // So we'll add 25 cards to allow for some experimentation
        console.log('Adding 25 impulse engine cards for high-level upgrades...');
        for (let i = 0; i < 25; i++) {
            const impulseEngine = this.inventory.generateSpecificCard('impulse_engines', 'common');
            this.inventory.addCard(impulseEngine);
        }
        
        // Also add multiple energy reactors for upgrading
        for (let i = 0; i < 15; i++) {
            const reactor = this.inventory.generateSpecificCard('energy_reactor', 'common');
            this.inventory.addCard(reactor);
        }
        
        // Add multiple weapon cards for upgrading  
        for (let i = 0; i < 10; i++) {
            const laser = this.inventory.generateSpecificCard('laser_cannon', 'common');
            this.inventory.addCard(laser);
            
            const plasma = this.inventory.generateSpecificCard('plasma_cannon', 'common');
            this.inventory.addCard(plasma);
        }
        
        console.log('Test data loaded with high-level upgrade capabilities');
    }

    /**
     * Create the UI elements
     */
    createUI() {
        if (!this.container) {
            console.warn('Cannot create UI - no container available');
            return;
        }

        this.container.innerHTML = '';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'card-inventory-header';
        header.innerHTML = `
            <h2>${this.isShopMode ? 'SHIP UPGRADE SHOP' : 'SHIP INVENTORY'}</h2>
            ${this.isShopMode ? 
                `<button onclick="cardInventoryUI.hideShop()" class="close-shop-btn">← BACK TO STATION</button>` : 
                `<button onclick="cardInventoryUI.hideInventory()" class="close-inventory-btn">← BACK TO STATION</button>`
            }
        `;
        this.container.appendChild(header);

        // Create main content area with proper two-panel structure
        const mainContent = document.createElement('div');
        mainContent.className = 'inventory-main';
        this.container.appendChild(mainContent);

        if (this.isShopMode) {
            // Shop mode: Create ship selector, then two-panel layout (ship slots LEFT, inventory RIGHT)
            this.createShipSlotsPanel();
            this.createInventoryPanel();
        } else {
            // Normal mode: Create two-panel layout (ship slots LEFT, inventory RIGHT)
            this.createShipSlotsPanel();
            this.createInventoryPanel();
        }
        
        // Create collection stats (outside the main grid)
        this.createCollectionStats();
        
        // Set up drag and drop event listeners
        this.setupEventListeners();
    }

    /**
     * Create ship slots panel (left side in normal mode)
     */
    createShipSlotsPanel() {
        const panel = document.createElement('div');
        panel.className = 'ship-slots-panel';
        panel.innerHTML = `
            <h3>SHIP CONFIGURATION</h3>
            <div class="ship-type-selection">
                <label>Ship Type:</label>
                <select onchange="cardInventoryUI.switchShip(this.value)">
                    ${this.createShipTypeOptions()}
                </select>
            </div>
            <div class="ship-slots-grid" id="ship-slots-grid">
                <!-- Ship slots will be populated by renderShipSlots() -->
            </div>
        `;
        this.container.querySelector('.inventory-main').appendChild(panel);
        
        // Render the ship slots immediately
        this.renderShipSlots();
    }

    /**
     * Create inventory panel (right side)
     */
    createInventoryPanel() {
        const panel = document.createElement('div');
        panel.className = 'inventory-panel';
        panel.innerHTML = `
            <h3>INVENTORY</h3>
            <div class="inventory-grid" id="inventory-grid">
                <!-- Inventory cards will be populated by renderInventoryGrid() -->
            </div>
        `;
        this.container.querySelector('.inventory-main').appendChild(panel);
    }

    /**
     * Create ship selector dropdown
     */
    createShipSelector() {
        const selector = document.createElement('div');
        selector.className = 'ship-selector';
        selector.innerHTML = `
            <h3>SELECT SHIP</h3>
            <select id="ship-type-select" onchange="cardInventoryUI.switchShip(this.value)">
                ${this.createShipTypeOptions()}
            </select>
        `;
        this.container.querySelector('.inventory-main').appendChild(selector);
    }

    /**
     * Create ship type options for dropdown
     */
    createShipTypeOptions() {
        // For testing, show all available ship types instead of just owned ships
        const allShipTypes = Object.keys(SHIP_CONFIGS);
        return allShipTypes.map(shipType => {
            const config = SHIP_CONFIGS[shipType];
            return `<option value="${shipType}" ${shipType === this.currentShipType ? 'selected' : ''}>
                ${config ? config.name : shipType}
            </option>`;
        }).join('');
    }

    /**
     * Create ship stats display
     */
    createShipStats() {
        const stats = document.createElement('div');
        stats.className = 'ship-stats';
        stats.id = 'ship-stats';
        this.container.querySelector('.inventory-main').appendChild(stats);
    }

    /**
     * Create inventory grid (deprecated - use createInventoryPanel instead)
     */
    createInventoryGrid() {
        // This method is kept for backward compatibility but should not be used
        console.warn('createInventoryGrid is deprecated, use createInventoryPanel instead');
    }

    /**
     * Create collection stats display
     */
    createCollectionStats() {
        const stats = document.createElement('div');
        stats.className = 'collection-stats';
        stats.id = 'collection-stats';
        this.container.appendChild(stats); // Append to main container, not inventory-main
    }

    /**
     * Create ship configuration panel with ship slots (deprecated - use createShipSlotsPanel)
     */
    createShipConfigurationPanel() {
        // This method is kept for backward compatibility
        this.createShipSlotsPanel();
    }

    /**
     * Render ship slots based on current ship configuration
     */
    renderShipSlots() {
        const slotsGrid = document.getElementById('ship-slots-grid');
        if (!slotsGrid) return;
        
        const config = this.currentShipConfig;
        if (!config) {
            slotsGrid.innerHTML = '<div class="error">Ship configuration not found</div>';
            return;
        }
        
        // Create slot type mapping (slot index to slot type)
        const slotTypes = this.generateSlotTypeMapping(config);
        
        // Create slots based on ship configuration
        const slots = [];
        for (let i = 0; i < config.systemSlots; i++) {
            const slotType = slotTypes[i] || 'utility'; // Default to utility if not mapped
            const equippedCard = this.shipSlots.get(i.toString());
            
            const slotContent = equippedCard ? 
                `<div class="installed-card" data-card-type="${equippedCard.cardType}">
                    <div class="card-icon">${equippedCard.getIcon()}</div>
                    <div class="card-name">${equippedCard.getDisplayName()}</div>
                    <div class="card-level">Lv.${equippedCard.level || 1}</div>
                    <button class="remove-card-btn" onclick="cardInventoryUI.removeCard('${i}')">×</button>
                </div>` :
                `<div class="empty-slot">
                    <div class="slot-type-icon">${this.getSlotTypeIcon(slotType)}</div>
                    <div class="slot-type-label">${slotType.toUpperCase()}</div>
                    <div class="slot-number">Slot ${i + 1}</div>
                </div>`;
                
            slots.push(`
                <div class="ship-slot" 
                     data-slot-id="${i}"
                     data-slot-type="${slotType}"
                     ondrop="cardInventoryUI.handleDrop(event)"
                     ondragover="cardInventoryUI.handleDragOver(event)"
                     ondragenter="cardInventoryUI.handleDragEnter(event)"
                     ondragleave="cardInventoryUI.handleDragLeave(event)">
                    ${slotContent}
                </div>
            `);
        }
        
        slotsGrid.innerHTML = slots.join('');
        
        console.log(`🔧 Rendered ${config.systemSlots} ship slots for ${config.name}`);
    }
    
    /**
     * Generate slot type mapping based on ship configuration
     */
    generateSlotTypeMapping(config) {
        const slotTypes = {};
        let currentSlot = 0;
        
        if (config.slotConfig) {
            // Use the slotConfig to assign slot types
            Object.entries(config.slotConfig).forEach(([slotType, count]) => {
                for (let i = 0; i < count; i++) {
                    slotTypes[currentSlot] = slotType;
                    currentSlot++;
                }
            });
        }
        
        // Fill remaining slots with 'utility' type
        while (currentSlot < config.systemSlots) {
            slotTypes[currentSlot] = 'utility';
            currentSlot++;
        }
        
        return slotTypes;
    }
    
    /**
     * Get icon for slot type
     */
    getSlotTypeIcon(slotType) {
        const slotIcons = {
            engines: '🚀',
            reactor: '⚡',
            weapons: '⚔️',
            utility: '🔧',
            warpDrive: '🌀',
            shields: '🛡️',
            scanner: '📡',
            radio: '📻',
            galacticChart: '🗺️',
            targetComputer: '🎯',
            missileTubes: '🚀'
        };
        return slotIcons[slotType] || '🔧';
    }

    /**
     * Setup event listeners for drag and drop
     */
    setupEventListeners() {
        // Add drag start event listeners to all cards
        document.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('card-stack')) {
                this.handleDragStart(e);
            }
        });
        
        // Add drag end event listeners
        document.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('card-stack')) {
                this.handleDragEnd(e);
            }
        });
        
        console.log('Drag and drop event listeners set up');
    }

    /**
     * Handle drag start
     */
    handleDragStart(e) {
        const cardElement = e.target;
        const cardType = cardElement.dataset.cardType;
        const cardLevel = cardElement.dataset.cardLevel;
        const cardRarity = cardElement.dataset.cardRarity;
        
        // Store drag data
        const dragData = {
            cardType: cardType,
            level: parseInt(cardLevel) || 1,
            rarity: cardRarity || 'common'
        };
        
        // Store in both dataTransfer and class property
        e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
        this.currentDragData = dragData; // Store for dragenter events
        
        // Set drag effect
        e.dataTransfer.effectAllowed = 'move';
        
        // Add visual feedback
        cardElement.classList.add('dragging');
        
        console.log(`🚀 Started dragging ${cardType} (Lv.${dragData.level})`);
    }

    /**
     * Handle drag end
     */
    handleDragEnd(e) {
        const cardElement = e.target;
        cardElement.classList.remove('dragging');
        
        // Clear current drag data
        this.currentDragData = null;
        
        // Clean up any remaining drag feedback on ALL slots
        document.querySelectorAll('.ship-slot').forEach(slot => {
            slot.classList.remove('valid-drop', 'invalid-drop');
        });
    }

    /**
     * Handle drag over (must prevent default to allow drop)
     */
    handleDragOver(e) {
        e.preventDefault();
        return false;
    }

    /**
     * Handle drag enter with slot type validation
     */
    handleDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();
        const slot = e.currentTarget;
        const slotType = slot.dataset.slotType;
        
        // Clear any existing feedback classes first
        slot.classList.remove('valid-drop', 'invalid-drop');
        
        // Check if slot is empty
        const isEmpty = slot.querySelector('.empty-slot') !== null;
        if (!isEmpty) {
            slot.classList.add('invalid-drop');
            return;
        }
        
        // Use stored drag data (dataTransfer.getData() doesn't work reliably in dragenter)
        if (this.currentDragData) {
            const dragCardType = this.currentDragData.cardType;
            const isCompatible = this.isCardCompatibleWithSlot(dragCardType, slotType);
            
            if (isCompatible) {
                slot.classList.add('valid-drop');
            } else {
                slot.classList.add('invalid-drop');
            }
        } else {
            slot.classList.add('invalid-drop');
        }
    }

    /**
     * Handle drag leave
     */
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        const slot = e.currentTarget;
        
        // Only remove classes if we're actually leaving the slot
        // Check if the related target is within this slot
        if (!slot.contains(e.relatedTarget)) {
            slot.classList.remove('valid-drop', 'invalid-drop');
        }
    }

    /**
     * Handle drop with slot type validation
     */
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        const slot = e.currentTarget;
        const slotId = slot.dataset.slotId;
        const slotType = slot.dataset.slotType;
        
        // Clean up drag feedback immediately
        slot.classList.remove('valid-drop', 'invalid-drop');
        
        // Check if slot is occupied
        const isEmpty = slot.querySelector('.empty-slot') !== null;
        if (!isEmpty) {
            console.log(`❌ Cannot drop card - slot ${slotId} is already occupied`);
            return false;
        }
        
        try {
            // Get drag data
            const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
            
            // Validate card type compatibility with slot type
            if (!this.isCardCompatibleWithSlot(dragData.cardType, slotType)) {
                console.log(`❌ Cannot drop ${dragData.cardType} card in ${slotType} slot - incompatible types`);
                return false;
            }
            
            // Create and install the card
            const card = this.inventory.generateSpecificCard(dragData.cardType, dragData.rarity);
            card.level = dragData.level;
            
            // Install card in slot
            this.shipSlots.set(slotId, card);
            
            console.log(`✅ Installed ${card.cardType} in ${slotType} slot ${slotId}`);
            
            // Save the configuration to ensure changes persist
            this.saveCurrentShipConfiguration();
            
            // Update the slot display
            this.renderShipSlots();
            
            console.log(`Configuration saved with ${this.shipSlots.size} total cards`);
            
        } catch (error) {
            console.error('❌ Failed to drop card:', error);
        }
        
        return false;
    }

    /**
     * Check if a card type is compatible with a slot type
     */
    isCardCompatibleWithSlot(cardType, slotType) {
        const cardToSlotMapping = {
            // Engine slot cards
            'impulse_engines': ['engines'],
            'quantum_drive': ['engines'],
            'dimensional_shifter': ['engines'],
            'temporal_engine': ['engines'],
            'gravity_well_drive': ['engines'],
            
            // Reactor/Power slot cards
            'energy_reactor': ['reactor'],
            'quantum_reactor': ['reactor'],
            'dark_matter_core': ['reactor'],
            'antimatter_generator': ['reactor'],
            'crystalline_matrix': ['reactor'],
            
            // Weapon slot cards
            'laser_cannon': ['weapons'],
            'pulse_cannon': ['weapons'],
            'plasma_cannon': ['weapons'],
            'phaser_array': ['weapons'],
            'disruptor_cannon': ['weapons'],
            'particle_beam': ['weapons'],
            'ion_storm_cannon': ['weapons'],
            'graviton_beam': ['weapons'],
            'quantum_torpedo': ['weapons'],
            'singularity_launcher': ['weapons'],
            'void_ripper': ['weapons'],
            // New projectile weapons
            'standard_missile': ['weapons'],
            'homing_missile': ['weapons'],
            'photon_torpedo': ['weapons'],
            'proximity_mine': ['weapons'],
            
            // Utility slot cards (most flexible)
            'hull_plating': ['utility'],
            'shield_generator': ['shields', 'utility'],
            'cargo_hold': ['utility'],
            'reinforced_cargo_hold': ['utility'],
            'shielded_cargo_hold': ['utility'],
            'warp_drive': ['warpDrive', 'utility'],
            'shields': ['shields', 'utility'],
            'long_range_scanner': ['scanner', 'utility'],
            'subspace_radio': ['radio', 'utility'],
            'galactic_chart': ['galacticChart', 'utility'],
            'target_computer': ['targetComputer', 'utility'],
            
            // Specialized slots
            'tactical_computer': ['targetComputer', 'utility'],
            'combat_computer': ['targetComputer', 'utility'],
            'strategic_computer': ['targetComputer', 'utility']
        };
        
        const allowedSlots = cardToSlotMapping[cardType] || ['utility']; // Default to utility
        return allowedSlots.includes(slotType);
    }

    /**
     * Remove a card from a ship slot
     */
    removeCard(slotId) {
        const card = this.shipSlots.get(slotId);
        if (card) {
            // Remove from ship slots
            this.shipSlots.delete(slotId);
            
            // Save the configuration to ensure changes persist
            this.saveCurrentShipConfiguration();
            
            // Add back to inventory (optional - for now just re-render)
            // This would require more complex inventory management
            
            // Update the slot display
            this.renderShipSlots();
            
            console.log(`🗑️ Removed ${card.cardType} from slot ${slotId}`);
            console.log(`Configuration saved with ${this.shipSlots.size} total cards`);
        }
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
        const grid = document.getElementById('inventory-grid');
        if (!grid) return;

        const cards = this.inventory.getDiscoveredCards();
        
        grid.innerHTML = cards.map(stack => this.renderCardStack(stack)).join('');
    }

    /**
     * Render a single card stack
     */
    renderCardStack(stack) {
        const card = stack.sampleCard;
        const rarityColor = card.getRarityColor();
        
        // Calculate upgrade requirements
        const currentLevel = stack.level;
        const nextLevel = currentLevel + 1;
        const maxLevel = 5;
        const canUpgrade = nextLevel <= maxLevel;
        
        // Upgrade cost calculation based on spec
        const upgradeCosts = {
            2: { cards: 3, credits: 1000 },
            3: { cards: 6, credits: 5000 },
            4: { cards: 12, credits: 15000 },
            5: { cards: 24, credits: 50000 }
        };
        
        const upgradeCost = upgradeCosts[nextLevel];
        const hasEnoughCards = canUpgrade && stack.count >= upgradeCost?.cards;
        const hasEnoughCredits = canUpgrade && this.credits >= (upgradeCost?.credits || 0);
        const canAffordUpgrade = hasEnoughCards && hasEnoughCredits;
        
        // Create tooltip text for upgrade requirements
        const tooltipText = canUpgrade ? 
            `Upgrade to Level ${nextLevel}: ${upgradeCost.cards}x cards + ${upgradeCost.credits.toLocaleString()} credits` : 
            'Maximum level reached';
        
        // Upgrade button HTML
        const upgradeButton = canUpgrade ? `
            <button class="upgrade-btn ${canAffordUpgrade ? 'upgrade-available' : 'upgrade-unavailable'}" 
                    onclick="cardInventoryUI.upgradeCard('${card.cardType}')"
                    title="${tooltipText}"
                    ${!canAffordUpgrade ? 'disabled' : ''}>
                ${canAffordUpgrade ? '⬆️' : '❌'} Upgrade to Lv.${nextLevel}
            </button>
        ` : `
            <div class="max-level-indicator" title="${tooltipText}">🏆 MAX LEVEL</div>
        `;
        
        return `
            <div class="card-stack" 
                 style="border-color: ${rarityColor}" 
                 draggable="true"
                 data-card-type="${card.cardType}"
                 data-card-level="${stack.level}"
                 data-card-rarity="${card.rarity}">
                <div class="card-icon">${card.getIcon()}</div>
                <div class="card-name">${stack.name}</div>
                <div class="card-count">x${stack.count}</div>
                <div class="card-level">Lv.${stack.level}</div>
                <div class="card-rarity" style="color: ${rarityColor}">${card.rarity.toUpperCase()}</div>
                ${upgradeButton}
            </div>
        `;
    }

    /**
     * Update collection statistics
     */
    updateCollectionStats() {
        const statsElement = document.getElementById('collection-stats');
        if (!statsElement) return;

        const stats = this.inventory.getCollectionStats();
        
        statsElement.innerHTML = `
            <h3>COLLECTION PROGRESS</h3>
            <div class="stats-grid">
                <div>Discovered: ${stats.discoveredCardTypes}/${stats.totalCardTypes}</div>
                <div>Completion: ${stats.completionPercentage.toFixed(1)}%</div>
                <div>Total Cards: ${stats.totalCardsCollected}</div>
            </div>
        `;
    }

    /**
     * Update credits display
     */
    updateCreditsDisplay() {
        if (this.isShopMode) {
            // Create or update credits display in shop mode
            let creditsDisplay = document.getElementById('credits-display');
            if (!creditsDisplay) {
                creditsDisplay = document.createElement('div');
                creditsDisplay.id = 'credits-display';
                creditsDisplay.style.cssText = `
                    position: fixed;
                    top: 80px;
                    right: 20px;
                    background: rgba(0, 0, 0, 0.8);
                    border: 2px solid #00ff41;
                    padding: 15px 20px;
                    font-size: 18px;
                    font-weight: bold;
                    color: #00ff41;
                    border-radius: 5px;
                    box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
                    z-index: 1001;
                `;
                document.body.appendChild(creditsDisplay);
            }
            creditsDisplay.innerHTML = `💰 Credits: ${this.credits.toLocaleString()}`;
        }
        
        console.log(`💰 Credits: ${this.credits.toLocaleString()}`);
    }

    /**
     * Update ship stats display
     */
    updateShipStats() {
        const statsElement = document.getElementById('ship-stats');
        if (!statsElement) return;

        const config = this.currentShipConfig;
        
        statsElement.innerHTML = `
            <h3>${config.name.toUpperCase()}</h3>
            <div class="ship-info">
                <div>Type: ${this.currentShipType}</div>
                <div>Slots: ${config.systemSlots}</div>
                <div>Description: ${config.description}</div>
            </div>
        `;
    }

    /**
     * Switch to a different ship
     */
    switchShip(shipType) {
        if (shipType === this.currentShipType) return;
        
        console.log(`Switching ship from ${this.currentShipType} to ${shipType}`);
        
        // Save current ship configuration
        this.saveCurrentShipConfiguration();
        
        // Switch to new ship
        this.currentShipType = shipType;
        this.currentShipConfig = SHIP_CONFIGS[shipType];
        
        // Clear current ship slots
        this.shipSlots.clear();
        
        // Load new ship configuration
        this.loadShipConfiguration(shipType);
        
        // Update UI - always render ship slots in both modes
        this.renderShipSlots();
        
        console.log(`Ship switched to ${shipType}`);
    }

    /**
     * Save current ship configuration
     */
    saveCurrentShipConfiguration() {
        if (!this.currentShipType) return;
        
        const config = new Map();
        this.shipSlots.forEach((card, slotId) => {
            config.set(slotId, {
                cardType: card.cardType,
                level: card.level || 1
            });
        });
        
        playerData.saveShipConfiguration(this.currentShipType, config);
        console.log(`Saved configuration for ${this.currentShipType}`);
    }

    /**
     * Load ship configuration from stored player data
     * @param {string} shipType - Ship type to load configuration for
     */
    loadShipConfiguration(shipType) {
        console.log(`Loading stored configuration for ${shipType}`);
        
        const config = playerData.getShipConfiguration(shipType);
        this.shipSlots.clear();
        
        // If no stored configuration exists and this is a starter ship, load default starter cards
        if (config.size === 0 && shipType === 'starter_ship') {
            console.log(`No stored configuration found for ${shipType}, loading default starter cards`);
            
            const shipConfig = SHIP_CONFIGS[shipType];
            if (shipConfig && shipConfig.starterCards) {
                // Map starter card slots to proper slot indices based on slotConfig
                const slotTypeMapping = this.generateSlotTypeMapping(shipConfig);
                const slotTypeToIndex = {};
                
                // Create reverse mapping: slotType -> slot indices
                Object.entries(slotTypeMapping).forEach(([slotIndex, slotType]) => {
                    if (!slotTypeToIndex[slotType]) {
                        slotTypeToIndex[slotType] = [];
                    }
                    slotTypeToIndex[slotType].push(parseInt(slotIndex));
                });
                
                // Load starter cards into appropriate slots
                Object.entries(shipConfig.starterCards).forEach(([starterSlotId, cardData]) => {
                    const cardType = cardData.cardType;
                    const level = cardData.level || 1;
                    
                    // Determine which slot type this card should go in
                    let targetSlotIndex = null;
                    
                    // Map card types to their preferred slot types
                    const cardToSlotMapping = {
                        'impulse_engines': 'engines',
                        'energy_reactor': 'reactor',
                        'laser_cannon': 'weapons',
                        'pulse_cannon': 'weapons',
                        'plasma_cannon': 'weapons',
                        'phaser_array': 'weapons',
                        'standard_missile': 'weapons',
                        'homing_missile': 'weapons',
                        'photon_torpedo': 'weapons',
                        'proximity_mine': 'weapons',
                        'target_computer': 'utility',
                        'warp_drive': 'warpDrive',
                        'shields': 'shields',
                        'long_range_scanner': 'scanner',
                        'subspace_radio': 'radio',
                        'galactic_chart': 'galacticChart'
                    };
                    
                    const preferredSlotType = cardToSlotMapping[cardType] || 'utility';
                    
                    // Find the next available slot of the preferred type
                    if (slotTypeToIndex[preferredSlotType]) {
                        for (const slotIndex of slotTypeToIndex[preferredSlotType].sort((a, b) => a - b)) {
                            if (!this.shipSlots.has(slotIndex.toString())) {
                                targetSlotIndex = slotIndex;
                                break;
                            }
                        }
                    }
                    
                    // For weapons, only allow weapon slots - NO FALLBACK to utility
                    if (targetSlotIndex === null && this.isWeaponCard(cardType)) {
                        console.error(`❌ WEAPON SLOT VIOLATION: Cannot place weapon ${cardType} - no weapon slots available`);
                        return; // Skip this weapon instead of placing it in wrong slot type
                    }
                    
                    // For non-weapons, allow fallback to utility slots
                    if (targetSlotIndex === null && !this.isWeaponCard(cardType) && slotTypeToIndex['utility']) {
                        for (const slotIndex of slotTypeToIndex['utility'].sort((a, b) => a - b)) {
                            if (!this.shipSlots.has(slotIndex.toString())) {
                                targetSlotIndex = slotIndex;
                                break;
                            }
                        }
                    }
                    
                    if (targetSlotIndex !== null) {
                        const card = this.inventory.generateSpecificCard(cardType, 'common');
                        card.level = level;
                        this.shipSlots.set(targetSlotIndex.toString(), card);
                        console.log(`Loaded default starter card ${cardType} (Lv.${level}) into slot ${targetSlotIndex} (${slotTypeMapping[targetSlotIndex]})`);
                    } else {
                        console.error(`❌ FAILED: No available slot found for starter card ${cardType} - ship only has ${shipConfig.systemSlots} slots, ${this.shipSlots.size} already used`);
                    }
                });
            }
        } else {
            // Load from stored configuration
            // Handle both named slots (utility_1, engine_1, etc.) and numerical slots (0, 1, 2, etc.)
            
            // Check if this is a starter ship with named slots that need mapping
            if (shipType === 'starter_ship' && config.size > 0) {
                const shipConfig = SHIP_CONFIGS[shipType];
                const slotTypeMapping = this.generateSlotTypeMapping(shipConfig);
                const slotTypeToIndex = {};
                
                // Create reverse mapping: slotType -> slot indices
                Object.entries(slotTypeMapping).forEach(([slotIndex, slotType]) => {
                    if (!slotTypeToIndex[slotType]) {
                        slotTypeToIndex[slotType] = [];
                    }
                    slotTypeToIndex[slotType].push(parseInt(slotIndex));
                });
                
                // Map named slots to slot types and find appropriate numerical slot
                const cardToSlotMapping = {
                    'impulse_engines': 'engines',
                    'energy_reactor': 'reactor',
                    'laser_cannon': 'weapons',
                    'pulse_cannon': 'weapons',
                    'plasma_cannon': 'weapons',
                    'phaser_array': 'weapons',
                    'standard_missile': 'weapons',
                    'homing_missile': 'weapons',
                    'photon_torpedo': 'weapons',
                    'proximity_mine': 'weapons',
                    'target_computer': 'utility',
                    'warp_drive': 'warpDrive',
                    'shields': 'shields',
                    'long_range_scanner': 'scanner',
                    'subspace_radio': 'radio',
                    'galactic_chart': 'galacticChart'
                };
                
                // Map named slots to numerical indices
                config.forEach((cardData, slotId) => {
                    const cardType = cardData.cardType;
                    const level = cardData.level || 1;
                    
                    // If slotId is numeric, use it directly
                    if (!isNaN(slotId)) {
                        const card = this.inventory.generateSpecificCard(cardType, 'common');
                        card.level = level;
                        this.shipSlots.set(slotId, card);
                        console.log(`Loaded ${cardType} (Lv.${level}) from numeric slot ${slotId}`);
                        return;
                    }
                    
                    // Map named slots to slot types and find appropriate numerical slot
                    const cardToSlotMapping = {
                        'impulse_engines': 'engines',
                        'energy_reactor': 'reactor',
                        'laser_cannon': 'weapons',
                        'pulse_cannon': 'weapons',
                        'plasma_cannon': 'weapons',
                        'phaser_array': 'weapons',
                        'standard_missile': 'weapons',
                        'homing_missile': 'weapons',
                        'photon_torpedo': 'weapons',
                        'proximity_mine': 'weapons',
                        'target_computer': 'utility',
                        'warp_drive': 'warpDrive',
                        'shields': 'shields',
                        'long_range_scanner': 'scanner',
                        'subspace_radio': 'radio',
                        'galactic_chart': 'galacticChart'
                    };
                    
                    const preferredSlotType = cardToSlotMapping[cardType] || 'utility';
                    
                    // Find the next available slot of the preferred type
                    let targetSlotIndex = null;
                    if (slotTypeToIndex[preferredSlotType]) {
                        for (const slotIndex of slotTypeToIndex[preferredSlotType].sort((a, b) => a - b)) {
                            if (!this.shipSlots.has(slotIndex.toString())) {
                                targetSlotIndex = slotIndex;
                                break;
                            }
                        }
                    }
                    
                    // For weapons, only allow weapon slots - NO FALLBACK to utility
                    if (targetSlotIndex === null && this.isWeaponCard(cardType)) {
                        console.error(`❌ WEAPON SLOT VIOLATION: Cannot place weapon ${cardType} - no weapon slots available`);
                        return; // Skip this weapon instead of placing it in wrong slot type
                    }
                    
                    // For non-weapons, allow fallback to utility slots
                    if (targetSlotIndex === null && !this.isWeaponCard(cardType) && slotTypeToIndex['utility']) {
                        for (const slotIndex of slotTypeToIndex['utility'].sort((a, b) => a - b)) {
                            if (!this.shipSlots.has(slotIndex.toString())) {
                                targetSlotIndex = slotIndex;
                                break;
                            }
                        }
                    }
                    
                    if (targetSlotIndex !== null) {
                        const card = this.inventory.generateSpecificCard(cardType, 'common');
                        card.level = level;
                        this.shipSlots.set(targetSlotIndex.toString(), card);
                        console.log(`Loaded ${cardType} (Lv.${level}) from named slot ${slotId} to slot ${targetSlotIndex} (${slotTypeMapping[targetSlotIndex]})`);
                    } else {
                        console.error(`❌ FAILED: No available slot found for card ${cardType} from named slot ${slotId} - ship only has ${shipConfig.systemSlots} slots, ${this.shipSlots.size} already used`);
                    }
                });
            } else {
                // Load regular configuration with numerical slot indices
                config.forEach((cardData, slotId) => {
                    const card = this.inventory.generateSpecificCard(cardData.cardType, 'common');
                    card.level = cardData.level || 1;
                    this.shipSlots.set(slotId, card);
                    console.log(`Loaded ${cardData.cardType} (Lv.${card.level}) from stored slot ${slotId}`);
                });
            }
        }
        
        console.log(`Loaded ${this.shipSlots.size} cards for ${shipType}`);
    }

    /**
     * Show inventory interface for ship configuration management
     */
    showAsInventory(dockedLocation, dockingInterface) {
        this.isShopMode = false;
        this.dockedLocation = dockedLocation;
        this.dockingInterface = dockingInterface;
        
        // Get current ship from starfieldManager to set the ship selector correctly
        let currentShip = null;
        if (dockingInterface && dockingInterface.starfieldManager) {
            currentShip = dockingInterface.starfieldManager.ship;
            if (currentShip && currentShip.shipType) {
                this.currentShipType = currentShip.shipType;
                this.currentShipConfig = SHIP_CONFIGS[this.currentShipType];
                
                // Validate that the player owns this ship, if not fall back to first owned ship
                this.validateCurrentShipOwnership();
            }
        }
        
        // Create inventory container
        this.createInventoryContainer();
        
        this.createUI();
        this.setupEventListeners();
        
        // Only load test data and render if we haven't loaded a ship configuration
        if (!this.currentShipType || this.shipSlots.size === 0) {
            this.loadTestData();
            this.render();
        } else {
            // Update both ship slots and inventory
            this.renderShipSlots();
            this.renderInventoryGrid();
            this.updateCollectionStats();
            this.updateCreditsDisplay();
        }
        
        // Load the current ship's actual configuration
        if (currentShip) {
            this.loadCurrentShipConfiguration(currentShip);
        } else if (this.currentShipType) {
            // Fallback to stored configuration if no current ship available
            this.loadShipConfiguration(this.currentShipType);
        }
        
        // Set the ship selector dropdown to the current ship type
        const shipSelector = document.getElementById('ship-type-select');
        if (shipSelector && this.currentShipType) {
            shipSelector.value = this.currentShipType;
        }
        
        // Show the inventory
        this.inventoryContainer.style.display = 'block';
        
        console.log('Ship inventory opened at:', dockedLocation);
    }

    /**
     * Create the inventory container for normal mode
     */
    createInventoryContainer() {
        // Remove existing inventory container
        if (this.inventoryContainer) {
            this.hideInventory();
        }
        
        // Create inventory container
        this.inventoryContainer = document.createElement('div');
        
        this.inventoryContainer.style.cssText = `
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
        this.container = this.inventoryContainer;
        
        // Add to document
        document.body.appendChild(this.inventoryContainer);
    }

    /**
     * Hide the inventory and return to docking interface
     */
    hideInventory() {
        if (this.inventoryContainer && this.inventoryContainer.parentNode) {
            this.inventoryContainer.parentNode.removeChild(this.inventoryContainer);
            this.inventoryContainer = null;
        }
        
        this.isShopMode = false;
        
        // Return to docking interface
        if (this.dockingInterface && this.dockedLocation) {
            this.dockingInterface.show(this.dockedLocation);
        }
        
        console.log('Ship inventory closed');
    }

    /**
     * Load current ship configuration from the actual game ship
     * @param {Object} ship - The current ship object from the game
     */
    loadCurrentShipConfiguration(ship) {
        if (!ship) {
            console.warn('No ship provided to load configuration from');
            return;
        }
        
        console.log(`Loading current ship configuration from actual ship: ${ship.shipType}`);
        
        // Clear existing ship slots
        this.shipSlots.clear();
        
        // Check if this is a starter ship and use starterCards configuration
        const shipConfig = SHIP_CONFIGS[ship.shipType];
        if (shipConfig && shipConfig.starterCards) {
            console.log(`Loading starter cards for ${ship.shipType}`);
            
            // Map starter card slots to proper slot indices based on slotConfig
            const slotTypeMapping = this.generateSlotTypeMapping(shipConfig);
            const slotTypeToIndex = {};
            
            // Create reverse mapping: slotType -> slot indices
            Object.entries(slotTypeMapping).forEach(([slotIndex, slotType]) => {
                if (!slotTypeToIndex[slotType]) {
                    slotTypeToIndex[slotType] = [];
                }
                slotTypeToIndex[slotType].push(parseInt(slotIndex));
            });
            
            // Load starter cards into appropriate slots
            Object.entries(shipConfig.starterCards).forEach(([starterSlotId, cardData]) => {
                const cardType = cardData.cardType;
                const level = cardData.level || 1;
                
                // Determine which slot type this card should go in
                let targetSlotIndex = null;
                
                // Map card types to their preferred slot types
                const cardToSlotMapping = {
                    'impulse_engines': 'engines',
                    'energy_reactor': 'reactor',
                    'laser_cannon': 'weapons',
                    'pulse_cannon': 'weapons',
                    'plasma_cannon': 'weapons',
                    'phaser_array': 'weapons',
                    'standard_missile': 'weapons',
                    'homing_missile': 'weapons',
                    'photon_torpedo': 'weapons',
                    'proximity_mine': 'weapons',
                    'target_computer': 'utility',
                    'warp_drive': 'warpDrive',
                    'shields': 'shields',
                    'long_range_scanner': 'scanner',
                    'subspace_radio': 'radio',
                    'galactic_chart': 'galacticChart'
                };
                
                const preferredSlotType = cardToSlotMapping[cardType] || 'utility';
                
                // Find the next available slot of the preferred type
                if (slotTypeToIndex[preferredSlotType]) {
                    for (const slotIndex of slotTypeToIndex[preferredSlotType].sort((a, b) => a - b)) {
                        if (!this.shipSlots.has(slotIndex.toString())) {
                            targetSlotIndex = slotIndex;
                            break;
                        }
                    }
                }
                
                // For weapons, only allow weapon slots - NO FALLBACK to utility
                if (targetSlotIndex === null && this.isWeaponCard(cardType)) {
                    console.error(`❌ WEAPON SLOT VIOLATION: Cannot place weapon ${cardType} - no weapon slots available`);
                    return; // Skip this weapon instead of placing it in wrong slot type
                }
                
                // For non-weapons, allow fallback to utility slots
                if (targetSlotIndex === null && !this.isWeaponCard(cardType) && slotTypeToIndex['utility']) {
                    for (const slotIndex of slotTypeToIndex['utility'].sort((a, b) => a - b)) {
                        if (!this.shipSlots.has(slotIndex.toString())) {
                            targetSlotIndex = slotIndex;
                            break;
                        }
                    }
                }
                
                if (targetSlotIndex !== null) {
                    const card = this.inventory.generateSpecificCard(cardType, 'common');
                    card.level = level;
                    this.shipSlots.set(targetSlotIndex.toString(), card);
                    console.log(`Loaded default starter card ${cardType} (Lv.${level}) into slot ${targetSlotIndex} (${slotTypeMapping[targetSlotIndex]})`);
                } else {
                    console.error(`❌ FAILED: No available slot found for starter card ${cardType} - ship only has ${shipConfig.systemSlots} slots, ${this.shipSlots.size} already used`);
                }
            });
        } else {
            // Fallback to legacy system loading for non-starter ships
            console.log(`Loading systems for non-starter ship: ${ship.shipType}`);
            
            // Mapping from system names to card types
            const systemToCardMapping = {
                'impulse_engines': 'impulse_engines',
                'warp_drive': 'warp_drive',
                'shields': 'shields',
                'laser_cannon': 'weapons',
                'plasma_cannon': 'plasma_cannon',
                'pulse_cannon': 'pulse_cannon',
                'phaser_array': 'weapons',
                'disruptor_cannon': 'disruptor_cannon',
                'particle_beam': 'particle_beam',
                'weapons': 'laser_cannon', // Legacy weapon system maps to laser cannon
                'long_range_scanner': 'long_range_scanner',
                'subspace_radio': 'subspace_radio',
                'galactic_chart': 'galactic_chart',
                'target_computer': 'target_computer',
                'hull_plating': 'hull_plating',
                'energy_reactor': 'energy_reactor',
                'shield_generator': 'shield_generator',
                'cargo_hold': 'cargo_hold',
                'missile_tubes': 'missile_tubes',
                'torpedo_launcher': 'torpedo_launcher'
            };
            
            // Get the ship's current systems
            if (ship.systems) {
                let slotIndex = 0;
                ship.systems.forEach((system, systemName) => {
                    const cardType = systemToCardMapping[systemName];
                    if (cardType && system && system.level) {
                        // Create a card representation of the installed system
                        const card = this.inventory.generateSpecificCard(cardType, 'common');
                        card.level = system.level;
                        this.shipSlots.set(slotIndex.toString(), card);
                        console.log(`Loaded ${cardType} (Lv.${card.level}) from system ${systemName} in slot ${slotIndex}`);
                        slotIndex++;
                    } else if (!cardType) {
                        console.log(`No card mapping found for system: ${systemName}`);
                    } else if (!system.level) {
                        console.log(`System ${systemName} has no level property`);
                    }
                });
            }
        }
        
        console.log(`Loaded ${this.shipSlots.size} cards from current ship`);
    }

    /**
     * Check if a card type is a weapon
     */
    isWeaponCard(cardType) {
        const weaponCards = [
            // Scan-hit weapons (lasers)
            'laser_cannon', 'pulse_cannon', 'plasma_cannon', 'phaser_array', 'disruptor_cannon', 
            'particle_beam', 'ion_storm_cannon', 'graviton_beam', 
            // Projectile weapons (missiles, torpedoes, mines)
            'standard_missile', 'homing_missile', 'photon_torpedo', 'proximity_mine',
            // Legacy/other weapons
            'quantum_torpedo', 'singularity_launcher', 'void_ripper'
        ];
        return weaponCards.includes(cardType);
    }

    /**
     * Upgrade a card stack to the next level
     * @param {string} cardType - Type of card to upgrade
     */
    upgradeCard(cardType) {
        console.log(`🔧 UPGRADE CLICKED: Attempting to upgrade ${cardType}`);
        console.log(`💰 Current credits: ${this.credits}`);
        
        // Get the card stack directly from inventory to ensure we're modifying the source data
        const cardStack = this.inventory.cardStacks.get(cardType);
        
        if (!cardStack) {
            console.error(`❌ Card stack not found: ${cardType}`);
            return;
        }
        
        if (!cardStack.discovered) {
            console.error(`❌ Cannot upgrade undiscovered card: ${cardType}`);
            return;
        }
        
        const currentLevel = cardStack.level;
        const nextLevel = currentLevel + 1;
        const maxLevel = 5;
        
        console.log(`📊 Card ${cardType} - Current Level: ${currentLevel}, Next Level: ${nextLevel}, Count: ${cardStack.count}`);
        
        // Check if upgrade is possible
        if (nextLevel > maxLevel) {
            console.error(`❌ Card ${cardType} is already at maximum level ${maxLevel}`);
            return;
        }
        
        // Define upgrade costs (cards + credits)
        const upgradeCosts = {
            2: { cards: 3, credits: 1000 },
            3: { cards: 6, credits: 5000 },
            4: { cards: 12, credits: 15000 },
            5: { cards: 24, credits: 50000 }
        };
        
        const upgradeCost = upgradeCosts[nextLevel];
        console.log(`💎 Upgrade to level ${nextLevel} requires: ${upgradeCost.cards} cards + ${upgradeCost.credits} credits`);
        
        // Validate requirements
        if (cardStack.count < upgradeCost.cards) {
            console.error(`❌ Not enough cards for upgrade. Have ${cardStack.count}, need ${upgradeCost.cards}`);
            return;
        }
        
        if (this.credits < upgradeCost.credits) {
            console.error(`❌ Not enough credits for upgrade. Have ${this.credits}, need ${upgradeCost.credits}`);
            return;
        }
        
        console.log(`✅ Requirements met! Proceeding with upgrade...`);
        
        // Perform the upgrade directly on the cardStack source data
        try {
            // Consume cards from the source card stack
            cardStack.count -= upgradeCost.cards;
            console.log(`📦 Cards consumed: ${upgradeCost.cards}, remaining: ${cardStack.count}`);
            
            // Consume credits
            this.credits -= upgradeCost.credits;
            console.log(`💰 Credits consumed: ${upgradeCost.credits}, remaining: ${this.credits}`);
            
            // Increase level in the source card stack
            cardStack.level = nextLevel;
            
            console.log(`✅ Successfully upgraded ${cardType} to level ${nextLevel}`);
            console.log(`💳 Consumed ${upgradeCost.cards} cards and ${upgradeCost.credits} credits`);
            console.log(`📦 Remaining cards: ${cardStack.count}, Credits: ${this.credits}`);
            
            // If we consumed all cards in the stack, mark as undiscovered but keep the level progress
            if (cardStack.count <= 0) {
                console.log(`📦 Card stack ${cardType} depleted (Level ${cardStack.level} progress retained)`);
                // Don't remove from inventory, just set count to 0 - level progress is preserved
            }
            
            // Re-render the inventory to reflect changes
            console.log(`🔄 Re-rendering inventory...`);
            this.render();
            
            // Play upgrade success sound
            console.log(`🎵 Playing upgrade sound...`);
            this.playUpgradeSound();
            
        } catch (error) {
            console.error(`❌ Error during upgrade:`, error);
        }
    }
}


