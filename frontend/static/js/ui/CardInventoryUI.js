/**
 * CardInventoryUI class - Drag-and-drop interface for card inventory management
 * Based on docs/tech_design.md and docs/system_architecture.md
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
import { DebugLogger, DEBUG_CATEGORIES } from '../utils/DebugConfig.js';

export default class CardInventoryUI {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.inventory = new CardInventory();
        this.draggedCard = null;
        this.draggedElement = null;
        this.shipSlots = new Map(); // Map of slot ID to installed card
        
        // Ship type selection
        this.currentShipType = 'heavy_fighter'; // Default ship type
        this.currentShipConfig = SHIP_CONFIGS[this.currentShipType];
        
        // Credit system (similar to Clash Royale gold)
        this.credits = 50000; // Starting credits for testing
        
        this.init();
    }

    init() {
        this.createUI();
        this.setupEventListeners();
        this.loadTestData();
        this.render();
    }

    createUI() {
        this.container.innerHTML = `
            <div class="card-inventory-interface">
                <div class="inventory-header">
                    <h2>Card Inventory & Ship Configuration</h2>
                    <div class="header-stats">
                        <div class="credits-display">
                            <span class="credits-icon">💰</span>
                            <span class="credits-amount" id="credits-amount">${this.credits.toLocaleString()}</span>
                        </div>
                        <div class="collection-stats">
                            <span class="discovered-count">0/0 Discovered</span>
                            <span class="total-cards">0 Total Cards</span>
                        </div>
                    </div>
                </div>
                
                <div class="inventory-main">
                    <div class="ship-slots-panel">
                        <h3>Ship Configuration</h3>
                        <div class="ship-type-selection">
                            <label for="ship-type-select">Ship Type:</label>
                            <select id="ship-type-select">
                                ${this.createShipTypeOptions()}
                            </select>
                        </div>
                        <div class="ship-slots-grid">
                            ${this.createShipSlotsHTML()}
                        </div>
                        <div class="ship-stats">
                            <div class="stat-item">
                                <span class="stat-label">Ship Type:</span>
                                <span class="stat-value" id="ship-type-display">${this.currentShipConfig.name}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Slots:</span>
                                <span class="stat-value" id="total-slots">0/0</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Total Power:</span>
                                <span class="stat-value" id="total-power">0</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Total Shields/Hull:</span>
                                <span class="stat-value" id="total-shields-hull">0</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">Build Status:</span>
                                <span class="stat-value" id="build-status">Valid</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="inventory-panel">
                        <h3>Card Inventory</h3>
                        <div class="inventory-filters">
                            <select id="rarity-filter">
                                <option value="all">All Rarities</option>
                                <option value="common">Common</option>
                                <option value="rare">Rare</option>
                                <option value="epic">Epic</option>
                                <option value="legendary">Legendary</option>
                            </select>
                            <select id="type-filter">
                                <option value="all">All Types</option>
                                <option value="engine">Engine</option>
                                <option value="power">Power</option>
                                <option value="weapon">Weapon</option>
                                <option value="utility">Utility</option>
                            </select>
                            <select id="sort-filter">
                                <option value="rarity">Sort by Rarity</option>
                                <option value="level">Sort by Level</option>
                                <option value="type">Sort by Type</option>
                                <option value="name">Sort by Name</option>
                            </select>
                        </div>
                        <div class="inventory-grid" id="inventory-grid">
                            <!-- Cards will be populated here -->
                        </div>
                    </div>
                </div>
                
                <div class="inventory-actions">
                    <button id="open-pack-btn" class="action-btn">Open Card Pack</button>
                    <button id="generate-test-cards-btn" class="action-btn">Generate 10 Test Cards</button>
                    <button id="generate-specific-test-cards-btn" class="action-btn">Generate Specific Test Cards</button>
                    <button id="save-config-btn" class="action-btn">Save Configuration</button>
                    <button id="load-config-btn" class="action-btn">Load Configuration</button>
                    <button id="reset-ship-btn" class="action-btn danger">Reset Ship</button>
                </div>
            </div>
        `;
    }

    createShipSlotsHTML() {
        // Get slot configuration based on current ship type
        const slotConfig = this.getShipSlotConfiguration();
        
        return slotConfig.map((slot, index) => `
            <div class="ship-slot" data-slot-type="${slot.slotType}" data-slot-id="${slot.id}">
                <div class="slot-header">
                    <span class="slot-icon">${slot.icon}</span>
                    <span class="slot-name">${slot.name}</span>
                </div>
                <div class="slot-content" id="slot-${slot.id}">
                    <div class="empty-slot">Drop ${slot.category} card here</div>
                </div>
            </div>
        `).join('');
    }

    getShipSlotConfiguration() {
        // Diverse slot configurations - each ship class has unique slot count and specialization
        const configurations = {
            // HEAVY FIGHTER - Maximum combat capability (16 slots)
            // Strengths: Heavy weapons, strong defenses, versatile
            // Weaknesses: Lower utility/cargo capacity
            heavy_fighter: [
                // Core Systems (4 slots)
                { id: 'engine_1', slotType: 'engine', icon: '🚀', name: 'Engine 1', category: 'Engine' },
                { id: 'utility_13', slotType: 'utility', icon: '🔧', name: 'Utility 1', category: 'Utility' },
                { id: 'utility_14', slotType: 'utility', icon: '🔧', name: 'Utility 2', category: 'Utility' },
                { id: 'power_1', slotType: 'power', icon: '⚡', name: 'Power 1', category: 'Power Core' },
                
                // Heavy Weapon Systems (6 slots) - Maximum firepower
                { id: 'primary_weapon_1', slotType: 'weapon', icon: '⚔️', name: 'Weapon 1', category: 'Primary Weapon' },
                { id: 'primary_weapon_2', slotType: 'weapon', icon: '⚔️', name: 'Weapon 2', category: 'Primary Weapon' },
                { id: 'primary_weapon_3', slotType: 'weapon', icon: '⚔️', name: 'Weapon 3', category: 'Primary Weapon' },
                { id: 'secondary_weapon_1', slotType: 'weapon', icon: '⚔️', name: 'Weapon 4', category: 'Secondary Weapon' },
                { id: 'secondary_weapon_2', slotType: 'weapon', icon: '⚔️', name: 'Weapon 5', category: 'Secondary Weapon' },
                { id: 'secondary_weapon_3', slotType: 'weapon', icon: '⚔️', name: 'Weapon 6', category: 'Secondary Weapon' },
                
                // Support Systems (4 slots)
                { id: 'utility_1', slotType: 'utility', icon: '🔧', name: 'Utility 3', category: 'Utility' },
                { id: 'utility_2', slotType: 'utility', icon: '🔧', name: 'Utility 4', category: 'Utility' },
                { id: 'utility_3', slotType: 'utility', icon: '🔧', name: 'Utility 5', category: 'Utility' },
                { id: 'utility_4', slotType: 'utility', icon: '🔧', name: 'Utility 6', category: 'Utility' },
                
                // Advanced Systems (2 slots) - Heavy fighter exclusive
                { id: 'power_2', slotType: 'power', icon: '⚡', name: 'Power 2', category: 'Power Core' },
                { id: 'utility_5', slotType: 'utility', icon: '🔧', name: 'Utility 7', category: 'Utility' }
            ],
            
            // SCOUT - Speed and reconnaissance specialist (11 slots)
            // Strengths: Enhanced sensors, speed, stealth capability
            // Weaknesses: Minimal weapons, light armor, small cargo
            scout: [
                // Core Systems (3 slots) - Lightweight
                { id: 'engine_1', slotType: 'engine', icon: '🚀', name: 'Engine 1', category: 'Engine' },
                { id: 'utility_15', slotType: 'utility', icon: '🔧', name: 'Utility 1', category: 'Utility' },
                { id: 'power_1', slotType: 'power', icon: '⚡', name: 'Power 1', category: 'Power Core' },
                
                // Minimal Weapon Systems (1 slot) - Self-defense only
                { id: 'primary_weapon_1', slotType: 'weapon', icon: '⚔️', name: 'Weapon 1', category: 'Primary Weapon' },
                
                // Support Systems (5 slots) - Scout specialty
                { id: 'utility_1', slotType: 'utility', icon: '🔧', name: 'Utility 2', category: 'Utility' },
                { id: 'utility_2', slotType: 'utility', icon: '🔧', name: 'Utility 3', category: 'Utility' },
                { id: 'utility_3', slotType: 'utility', icon: '🔧', name: 'Utility 4', category: 'Utility' },
                { id: 'utility_4', slotType: 'utility', icon: '🔧', name: 'Utility 5', category: 'Utility' },
                { id: 'utility_5', slotType: 'utility', icon: '🔧', name: 'Utility 6', category: 'Utility' },
            ],
            
            // LIGHT FIGHTER - Balanced patrol ship (12 slots)
            // Strengths: Balanced capabilities, good versatility
            // Weaknesses: No specialization, average in all areas
            light_fighter: [
                // Core Systems (3 slots)
                { id: 'engine_1', slotType: 'engine', icon: '🚀', name: 'Engine 1', category: 'Engine' },
                { id: 'utility_16', slotType: 'utility', icon: '🔧', name: 'Utility 1', category: 'Utility' },
                { id: 'power_1', slotType: 'power', icon: '⚡', name: 'Power 1', category: 'Power Core' },
                
                // Balanced Weapon Systems (4 slots)
                { id: 'primary_weapon_1', slotType: 'weapon', icon: '⚔️', name: 'Weapon 1', category: 'Primary Weapon' },
                { id: 'primary_weapon_2', slotType: 'weapon', icon: '⚔️', name: 'Weapon 2', category: 'Primary Weapon' },
                { id: 'secondary_weapon_1', slotType: 'weapon', icon: '⚔️', name: 'Weapon 3', category: 'Secondary Weapon' },
                { id: 'secondary_weapon_2', slotType: 'weapon', icon: '⚔️', name: 'Weapon 4', category: 'Secondary Weapon' },
                
                // Support Systems (5 slots) - Good all-around capability
                { id: 'utility_1', slotType: 'utility', icon: '🔧', name: 'Utility 2', category: 'Utility' },
                { id: 'utility_2', slotType: 'utility', icon: '🔧', name: 'Utility 3', category: 'Utility' },
                { id: 'utility_3', slotType: 'utility', icon: '🔧', name: 'Utility 4', category: 'Utility' },
                { id: 'utility_4', slotType: 'utility', icon: '🔧', name: 'Utility 5', category: 'Utility' },
                { id: 'utility_5', slotType: 'utility', icon: '🔧', name: 'Utility 6', category: 'Utility' }
            ],
            
            // LIGHT FREIGHTER - Cargo transport (14 slots)
            // Strengths: Good cargo capacity, decent defenses
            // Weaknesses: Slow, minimal weapons, limited sensors
            light_freighter: [
                // Core Systems (4 slots) - Reinforced for cargo
                { id: 'engine_1', slotType: 'engine', icon: '🚀', name: 'Engine 1', category: 'Engine' },
                { id: 'utility_17', slotType: 'utility', icon: '🔧', name: 'Utility 1', category: 'Utility' },
                { id: 'utility_18', slotType: 'utility', icon: '🔧', name: 'Utility 2', category: 'Utility' },
                { id: 'power_1', slotType: 'power', icon: '⚡', name: 'Power 1', category: 'Power Core' },
                
                // Minimal Weapon Systems (2 slots) - Basic defense
                { id: 'primary_weapon_1', slotType: 'weapon', icon: '⚔️', name: 'Weapon 1', category: 'Primary Weapon' },
                { id: 'secondary_weapon_1', slotType: 'weapon', icon: '⚔️', name: 'Weapon 2', category: 'Secondary Weapon' },
                
                // Basic Support Systems (2 slots)
                { id: 'utility_7', slotType: 'utility', icon: '🔧', name: 'Utility 3', category: 'Utility' },
                { id: 'utility_8', slotType: 'utility', icon: '🔧', name: 'Utility 4', category: 'Utility' },
                
                // Extensive Cargo/Utility Systems (6 slots) - Freighter specialty
                { id: 'utility_1', slotType: 'utility', icon: '🔧', name: 'Utility 5', category: 'Utility' },
                { id: 'utility_2', slotType: 'utility', icon: '🔧', name: 'Utility 6', category: 'Utility' },
                { id: 'utility_3', slotType: 'utility', icon: '🔧', name: 'Utility 7', category: 'Utility' },
                { id: 'utility_4', slotType: 'utility', icon: '🔧', name: 'Utility 8', category: 'Utility' },
                { id: 'utility_5', slotType: 'utility', icon: '🔧', name: 'Utility 9', category: 'Utility' },
                { id: 'utility_6', slotType: 'utility', icon: '🔧', name: 'Utility 10', category: 'Utility' }
            ],
            
            // HEAVY FREIGHTER - Maximum cargo capacity (18 slots)
            // Strengths: Massive cargo capacity, heavy armor, industrial power
            // Weaknesses: Very slow, minimal weapons, poor maneuverability
            heavy_freighter: [
                // Reinforced Core Systems (5 slots) - Industrial grade
                { id: 'engine_1', slotType: 'engine', icon: '🚀', name: 'Engine 1', category: 'Engine' },
                { id: 'utility_19', slotType: 'utility', icon: '🔧', name: 'Utility 1', category: 'Utility' },
                { id: 'utility_20', slotType: 'utility', icon: '🔧', name: 'Utility 2', category: 'Utility' },
                { id: 'utility_21', slotType: 'utility', icon: '🔧', name: 'Utility 3', category: 'Utility' },
                { id: 'power_1', slotType: 'power', icon: '⚡', name: 'Power 1', category: 'Power Core' },
                
                // Minimal Weapon Systems (1 slot) - Token defense
                { id: 'primary_weapon_1', slotType: 'weapon', icon: '⚔️', name: 'Weapon 1', category: 'Primary Weapon' },
                
                // Basic Support Systems (2 slots)
                { id: 'utility_11', slotType: 'utility', icon: '🔧', name: 'Utility 4', category: 'Utility' },
                { id: 'utility_12', slotType: 'utility', icon: '🔧', name: 'Utility 5', category: 'Utility' },
                
                // Massive Cargo Systems (10 slots) - Maximum capacity
                { id: 'utility_1', slotType: 'utility', icon: '🔧', name: 'Utility 6', category: 'Utility' },
                { id: 'utility_2', slotType: 'utility', icon: '🔧', name: 'Utility 7', category: 'Utility' },
                { id: 'utility_3', slotType: 'utility', icon: '🔧', name: 'Utility 8', category: 'Utility' },
                { id: 'utility_4', slotType: 'utility', icon: '🔧', name: 'Utility 9', category: 'Utility' },
                { id: 'utility_5', slotType: 'utility', icon: '🔧', name: 'Utility 10', category: 'Utility' },
                { id: 'utility_6', slotType: 'utility', icon: '🔧', name: 'Utility 11', category: 'Utility' },
                { id: 'utility_7', slotType: 'utility', icon: '🔧', name: 'Utility 12', category: 'Utility' },
                { id: 'utility_8', slotType: 'utility', icon: '🔧', name: 'Utility 13', category: 'Utility' },
                { id: 'utility_9', slotType: 'utility', icon: '🔧', name: 'Utility 14', category: 'Utility' },
                { id: 'utility_10', slotType: 'utility', icon: '🔧', name: 'Utility 15', category: 'Utility' }
            ]
        };

        const slots = configurations[this.currentShipType] || configurations.heavy_fighter;
        
        // Sort slots by type in the order: Engine, Power, Weapon, Utility
        const slotTypeOrder = { 'engine': 0, 'power': 1, 'weapon': 2, 'utility': 3 };
        
        return slots.sort((a, b) => {
            const orderA = slotTypeOrder[a.slotType];
            const orderB = slotTypeOrder[b.slotType];
            
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            
            // If same type, maintain original order by comparing slot names
            return a.name.localeCompare(b.name);
        });
    }

    createShipTypeOptions() {
        const availableShipTypes = getAvailableShipTypes();
        return availableShipTypes.map(shipType => {
            const config = SHIP_CONFIGS[shipType];
            const displayName = config.name;
            const selected = shipType === this.currentShipType ? 'selected' : '';
            return `<option value="${shipType}" ${selected}>${displayName}</option>`;
        }).join('');
    }

    setupEventListeners() {
        // Filter change listeners
        document.getElementById('rarity-filter').addEventListener('change', () => this.render());
        document.getElementById('type-filter').addEventListener('change', () => this.render());
        document.getElementById('sort-filter').addEventListener('change', () => this.render());

        // Ship type change listener
        document.getElementById('ship-type-select').addEventListener('change', (e) => this.onShipTypeChange(e.target.value));

        // Action button listeners
        document.getElementById('open-pack-btn').addEventListener('click', () => this.openCardPack());
        document.getElementById('generate-test-cards-btn').addEventListener('click', () => this.generateTestCards());
        document.getElementById('generate-specific-test-cards-btn').addEventListener('click', () => this.generateSpecificTestCards());
        document.getElementById('save-config-btn').addEventListener('click', () => this.saveConfiguration());
        document.getElementById('load-config-btn').addEventListener('click', () => this.loadConfiguration());
        document.getElementById('reset-ship-btn').addEventListener('click', () => this.resetShip());

        // Setup drag and drop for ship slots
        this.setupSlotDropZones();
    }

    setupSlotDropZones() {
        const slots = document.querySelectorAll('.ship-slot');
        
        slots.forEach(slot => {
            slot.addEventListener('dragover', (e) => this.handleSlotDragOver(e));
            slot.addEventListener('drop', (e) => this.handleSlotDrop(e));
            slot.addEventListener('dragleave', (e) => this.handleSlotDragLeave(e));
        });
    }

    validateCardData(cardData) {
        if (!cardData) {
            return { valid: false, error: 'Card data is null or undefined' };
        }
        
        if (!cardData.cardType && !cardData.type) {
            return { valid: false, error: 'Card missing cardType/type property' };
        }
        
        if (!cardData.metadata && !cardData.name) {
            return { valid: false, error: 'Card missing metadata/name property' };
        }
        
        return { valid: true };
    }

    setupCardDragAndDrop(cardElement, cardData) {
        if (!cardElement || !cardData) {
            console.warn('Invalid parameters for setupCardDragAndDrop:', { cardElement, cardData });
            return;
        }
        
        // Validate card data structure
        const validation = this.validateCardData(cardData);
        if (!validation.valid) {
            console.error('Invalid card data for drag setup:', validation.error, cardData);
            return;
        }
        
        cardElement.draggable = true;
        
        cardElement.addEventListener('dragstart', (e) => {
            DebugLogger.debug(DEBUG_CATEGORIES.DRAG_DROP, `Drag started for: ${cardData.metadata?.name || cardData.name || 'unknown card'}`);
            this.draggedCard = cardData;
            this.draggedElement = cardElement;
            cardElement.classList.add('dragging');
            
            // Create a custom drag image with fixed width
            const dragImage = cardElement.cloneNode(true);
            dragImage.style.width = '200px';
            dragImage.style.position = 'absolute';
            dragImage.style.top = '-1000px';
            dragImage.style.left = '-1000px';
            dragImage.style.pointerEvents = 'none';
            dragImage.style.transform = 'none';
            dragImage.style.opacity = '1';
            dragImage.classList.remove('dragging');
            
            document.body.appendChild(dragImage);
            
            // Set the custom drag image
            e.dataTransfer.setDragImage(dragImage, 100, 50);
            
            // Clean up the temporary element after a short delay
            setTimeout(() => {
                if (document.body.contains(dragImage)) {
                    document.body.removeChild(dragImage);
                }
            }, 100);
            
            // Set drag data
            try {
                e.dataTransfer.setData('text/plain', JSON.stringify(cardData));
                e.dataTransfer.effectAllowed = 'move';
            } catch (error) {
                console.error('Error setting drag data:', error);
            }
        });

        cardElement.addEventListener('dragend', (e) => {
            DebugLogger.debug(DEBUG_CATEGORIES.DRAG_DROP, `Drag ended for: ${this.draggedCard?.metadata?.name || this.draggedCard?.name || 'unknown card'}`);
            cardElement.classList.remove('dragging');
            
            // Only clear if drag was not successful (no drop occurred)
            if (this.draggedCard) {
                console.log('Drag ended without successful drop, clearing references');
                this.draggedCard = null;
                this.draggedElement = null;
            }
            
            // Remove all drop zone highlights
            document.querySelectorAll('.ship-slot').forEach(slot => {
                slot.classList.remove('valid-drop', 'invalid-drop');
            });
        });
    }

    handleSlotDragOver(e) {
        e.preventDefault();
        
        if (!this.draggedCard) {
            console.warn('handleSlotDragOver called but no draggedCard found');
            return;
        }
        
        const slot = e.currentTarget;
        if (!slot || !slot.dataset) {
            console.warn('Invalid slot element in handleSlotDragOver');
            return;
        }
        
        const slotType = slot.dataset.slotType;
        if (!slotType) {
            console.warn('Slot missing slotType data attribute');
            return;
        }
        
        const isValidDrop = this.isValidCardForSlot(this.draggedCard, slotType);
        
        slot.classList.toggle('valid-drop', isValidDrop);
        slot.classList.toggle('invalid-drop', !isValidDrop);
        
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = isValidDrop ? 'move' : 'none';
        }
    }

    handleSlotDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const slotElement = e.currentTarget;
        const slotType = slotElement.dataset.slotType;
        const slotId = slotElement.dataset.slotId;
        
        // Remove visual feedback
        slotElement.classList.remove('valid-drop', 'invalid-drop');
        
        if (!this.draggedCard) {
            console.warn('No dragged card found during drop');
            return;
        }
        
        // Store reference to dragged card before clearing it
        const cardToInstall = this.draggedCard;
        const draggedElement = this.draggedElement;
        
        // Check if card is valid for this slot type
        if (!this.isValidCardForSlot(cardToInstall, slotType)) {
            console.log(`Cannot install ${cardToInstall.metadata.name} in ${slotType} slot`);
            return;
        }
        
        try {
            // Check if slot is already occupied
            if (this.shipSlots.has(slotId)) {
                // Return existing card to inventory
                const existingCard = this.shipSlots.get(slotId);
                this.inventory.addCard(existingCard);
                console.log(`Returned ${existingCard.metadata.name} to inventory`);
            }
            
            // Install the new card
            this.installCardInSlot(cardToInstall, slotId, slotType);
            
            // Remove card from inventory
            this.removeCardFromInventory(cardToInstall);
            
            // Clear dragged card references
            this.draggedCard = null;
            this.draggedElement = null;
            
            // Update displays
            this.updateSlotDisplay(slotId);
            this.updateShipStats();
            this.render();
            
            console.log(`Successfully installed ${cardToInstall.metadata.name} in ${slotType} slot`);
            
        } catch (error) {
            console.error('Error during card installation:', error);
            
            // Restore dragged card references if installation failed
            this.draggedCard = cardToInstall;
            this.draggedElement = draggedElement;
            
            // Show error to user
            alert(`Failed to install card: ${error.message}`);
        }
    }

    handleSlotDragLeave(e) {
        const slot = e.currentTarget;
        slot.classList.remove('valid-drop', 'invalid-drop');
    }

    isValidCardForSlot(card, slotType) {
        // Simplified slot compatibility - generic slots accept multiple card types
        const slotCompatibility = {
            // Engine slot accepts propulsion systems (except warp drive which goes to utility)
            'engine': [
                CARD_TYPES.IMPULSE_ENGINES,
                // Advanced Propulsion
                CARD_TYPES.QUANTUM_DRIVE, CARD_TYPES.DIMENSIONAL_SHIFTER, 
                CARD_TYPES.TEMPORAL_ENGINE, CARD_TYPES.GRAVITY_WELL_DRIVE
            ],
            
            // Power slot accepts only reactors (shield generators moved to utility)
            'power': [
                CARD_TYPES.ENERGY_REACTOR,
                // Exotic Core Systems
                CARD_TYPES.QUANTUM_REACTOR, CARD_TYPES.DARK_MATTER_CORE, 
                CARD_TYPES.ANTIMATTER_GENERATOR, CARD_TYPES.CRYSTALLINE_MATRIX
            ],
            
            // Weapon slot accepts ALL weapon systems (both primary and secondary use same slot type)
            'weapon': [
                // Basic Weapons
                CARD_TYPES.LASER_CANNON, CARD_TYPES.PLASMA_CANNON, CARD_TYPES.PULSE_CANNON,
                CARD_TYPES.PHASER_ARRAY, CARD_TYPES.DISRUPTOR_CANNON, CARD_TYPES.PARTICLE_BEAM,
                CARD_TYPES.MISSILE_TUBES, CARD_TYPES.TORPEDO_LAUNCHER,
                // Exotic Weapons
                CARD_TYPES.ION_STORM_CANNON, CARD_TYPES.GRAVITON_BEAM, CARD_TYPES.QUANTUM_TORPEDO,
                CARD_TYPES.SINGULARITY_LAUNCHER, CARD_TYPES.VOID_RIPPER, CARD_TYPES.NANITE_SWARM
            ],
            
            // Utility slot accepts targeting computers, experimental systems, all cargo types, sensors, communications, warp drives, armor, and shield generators
            'utility': [
                CARD_TYPES.TARGET_COMPUTER,
                CARD_TYPES.CARGO_HOLD,
                CARD_TYPES.REINFORCED_CARGO_HOLD,
                CARD_TYPES.SHIELDED_CARGO_HOLD,
                // Warp drive now goes in utility category
                CARD_TYPES.WARP_DRIVE,
                // Shield generators moved from power to utility category
                CARD_TYPES.SHIELD_GENERATOR, CARD_TYPES.SHIELDS,
                // Armor systems now go in utility category for greater tradeoff choices
                CARD_TYPES.HULL_PLATING,
                CARD_TYPES.PHASE_SHIELD, CARD_TYPES.ADAPTIVE_ARMOR, 
                CARD_TYPES.QUANTUM_BARRIER, CARD_TYPES.TEMPORAL_DEFLECTOR,
                // Sensors and Communications now go to utility
                CARD_TYPES.SENSORS, CARD_TYPES.LONG_RANGE_SENSORS, CARD_TYPES.DEEP_SPACE_SENSORS,
                CARD_TYPES.LONG_RANGE_SCANNER, CARD_TYPES.GALACTIC_CHART,
                CARD_TYPES.QUANTUM_SCANNER, CARD_TYPES.PRECOGNITION_ARRAY, 
                CARD_TYPES.DIMENSIONAL_RADAR, CARD_TYPES.PSIONIC_AMPLIFIER, CARD_TYPES.NEURAL_INTERFACE,
                CARD_TYPES.COMMUNICATIONS, CARD_TYPES.SUBSPACE_RADIO, CARD_TYPES.QUANTUM_ENTANGLEMENT_COMM,
                // Alien communication systems
                CARD_TYPES.VORTHAN_MIND_LINK, CARD_TYPES.NEXUS_HARMONIZER, CARD_TYPES.ETHEREAL_CONDUIT,
                // Experimental systems
                CARD_TYPES.ZEPHYRIAN_CRYSTAL,
                CARD_TYPES.PROBABILITY_DRIVE, CARD_TYPES.CHAOS_FIELD_GEN, 
                CARD_TYPES.REALITY_ANCHOR, CARD_TYPES.ENTROPY_REVERSER
            ]
        };
        
        const compatibleTypes = slotCompatibility[slotType] || [];
        return compatibleTypes.includes(card.cardType);
    }

    installCardInSlot(card, slotId, slotType) {
        // Install new card (replacement logic is handled in handleSlotDrop)
        this.shipSlots.set(slotId, card);
    }

    removeCardFromInventory(card) {
        // This would remove one instance of the card from inventory
        // For now, we'll just decrease the count
        const stack = this.inventory.getCardStack(card.cardType);
        if (!stack) {
            throw new Error(`Card stack not found for type: ${card.cardType}`);
        }
        
        if (stack.count <= 0) {
            throw new Error(`No cards available in stack for type: ${card.cardType}`);
        }
        
        stack.count--;
        // Note: We never delete card stacks, just set count to 0
        // This ensures the card type remains available for future additions
        
        console.log(`Removed ${card.metadata.name} from inventory (${stack.count} remaining)`);
    }

    updateSlotDisplay(slotId) {
        const slotContent = document.getElementById(`slot-${slotId}`);
        if (!slotContent) {
            console.warn(`Slot element not found for id: ${slotId}`);
            return;
        }
        
        const installedCard = this.shipSlots.get(slotId);
        
        if (installedCard) {
            const stats = installedCard.getStats();
            slotContent.innerHTML = `
                <div class="installed-card">
                    <span class="card-name">${installedCard.metadata.name}</span>
                    <span class="card-level">Level ${installedCard.level}</span>
                    <span class="card-rarity">${installedCard.rarity.toUpperCase()}</span>
                    <div class="card-stats">
                        <span class="stat-power">⚡${stats.power}</span>
                        <span class="stat-mass">⚖${stats.mass}</span>
                    </div>
                    <button class="remove-card-btn" onclick="cardInventoryUI.removeCardFromSlot('${slotId}')">×</button>
                </div>
            `;
        } else {
            // Get the slot configuration to find the proper category name
            const slotConfig = this.getShipSlotConfiguration();
            const slot = slotConfig.find(s => s.id === slotId);
            const slotLabel = slot ? slot.category : slotId.replace('_', ' ');
            slotContent.innerHTML = `<div class="empty-slot">Drop ${slotLabel} card here</div>`;
        }
    }

    removeCardFromSlot(slotId) {
        const card = this.shipSlots.get(slotId);
        if (card) {
            console.log(' Removing card from slot:', slotId, 'Card:', card.metadata.name);
            console.log('📦 Before adding back - inventory count for', card.cardType, ':', this.inventory.getCardStack(card.cardType)?.count || 0);
            console.log('🗂️ CardStacks Map size:', this.inventory.cardStacks.size);
            console.log('🔍 CardStacks has hull_plating:', this.inventory.cardStacks.has('hull_plating'));
            console.log('🔍 CardStacks has card type:', this.inventory.cardStacks.has(card.cardType));
            console.log('🎯 Card type value:', JSON.stringify(card.cardType));
            
            const addResult = this.inventory.addCard(card);
            console.log('➕ Add card result:', addResult);
            
            if (addResult.autoUpgraded) {
                console.log('🔄 Auto-upgrade triggered!', `${card.metadata.name} upgraded to level ${addResult.newLevel}`);
            }
            
            this.shipSlots.delete(slotId);
            this.updateSlotDisplay(slotId);
            this.updateShipStats();
            
            console.log('📦 After adding back - inventory count for', card.cardType, ':', this.inventory.getCardStack(card.cardType)?.count || 0);
            console.log('🔍 Discovered cards count:', this.inventory.getDiscoveredCards().length);
            
            this.render();
        }
    }

    updateShipStats() {
        let totalPower = 0;
        let totalShields = 0;
        let totalHull = 0;
        let isValidBuild = true;

        // Calculate stats from installed cards
        this.shipSlots.forEach(card => {
            const stats = card.getStats();
            totalPower += stats.power || 0;
            totalShields += stats.shieldStrength || 0;
            totalHull += stats.armor || 0;
        });

        // Check if build is valid (positive power balance)
        isValidBuild = totalPower >= 0;

        // Calculate slot availability
        const slotConfig = this.getShipSlotConfiguration();
        const slotCounts = {
            engine: { used: 0, total: 0 },
            weapon: { used: 0, total: 0 },
            utility: { used: 0, total: 0 },
            power: { used: 0, total: 0 }
        };

        // Count total slots by type
        slotConfig.forEach(slot => {
            if (slotCounts[slot.slotType]) {
                slotCounts[slot.slotType].total++;
            }
        });

        // Count used slots by checking if slot has a card installed
        slotConfig.forEach(slot => {
            const slotElement = document.getElementById(`slot-${slot.id}`);
            const hasCard = slotElement && !slotElement.querySelector('.empty-slot');
            if (hasCard && slotCounts[slot.slotType]) {
                slotCounts[slot.slotType].used++;
            }
        });

        // Update display
        const totalUsedSlots = slotCounts.engine.used + slotCounts.weapon.used + slotCounts.utility.used + slotCounts.power.used;
        const totalAvailableSlots = slotCounts.engine.total + slotCounts.weapon.total + slotCounts.utility.total + slotCounts.power.total;
        
        // Safely update elements if they exist
        const totalSlotsElement = document.getElementById('total-slots');
        const totalPowerElement = document.getElementById('total-power');
        const totalShieldsHullElement = document.getElementById('total-shields-hull');
        const buildStatusElement = document.getElementById('build-status');
        
        if (totalSlotsElement) totalSlotsElement.textContent = `${totalUsedSlots}/${totalAvailableSlots}`;
        if (totalPowerElement) totalPowerElement.textContent = totalPower;
        if (totalShieldsHullElement) totalShieldsHullElement.textContent = `${totalShields}/${totalHull}`;
        if (buildStatusElement) {
            buildStatusElement.textContent = isValidBuild ? 'Valid' : 'Invalid';
            buildStatusElement.className = `stat-value ${isValidBuild ? 'valid' : 'invalid'}`;
        }
    }

    render() {
        this.renderInventoryGrid();
        this.updateCollectionStats();
        this.updateCreditsDisplay();
        this.updateAllSlotDisplays();
        this.updateShipStats();
    }

    getCardCategory(cardType) {
        // Map card types to their simplified slot categories
        const categoryMap = {
            // Engine category (warp drive moved to utility)
            [CARD_TYPES.IMPULSE_ENGINES]: 'engine',
            [CARD_TYPES.QUANTUM_DRIVE]: 'engine',
            [CARD_TYPES.DIMENSIONAL_SHIFTER]: 'engine',
            [CARD_TYPES.TEMPORAL_ENGINE]: 'engine',
            [CARD_TYPES.GRAVITY_WELL_DRIVE]: 'engine',
            
            // Armor category - now maps to utility for consolidated slot system
            [CARD_TYPES.HULL_PLATING]: 'utility',
            [CARD_TYPES.PHASE_SHIELD]: 'utility',
            [CARD_TYPES.ADAPTIVE_ARMOR]: 'utility',
            [CARD_TYPES.QUANTUM_BARRIER]: 'utility',
            [CARD_TYPES.TEMPORAL_DEFLECTOR]: 'utility',
            
            // Power category (simplified from power-systems) - only reactors
            [CARD_TYPES.ENERGY_REACTOR]: 'power',
            [CARD_TYPES.QUANTUM_REACTOR]: 'power',
            [CARD_TYPES.DARK_MATTER_CORE]: 'power',
            [CARD_TYPES.ANTIMATTER_GENERATOR]: 'power',
            [CARD_TYPES.CRYSTALLINE_MATRIX]: 'power',
            
            // Weapon category (all weapons use same category)
            [CARD_TYPES.LASER_CANNON]: 'weapon',
            [CARD_TYPES.PLASMA_CANNON]: 'weapon',
            [CARD_TYPES.PULSE_CANNON]: 'weapon',
            [CARD_TYPES.PHASER_ARRAY]: 'weapon',
            [CARD_TYPES.DISRUPTOR_CANNON]: 'weapon',
            [CARD_TYPES.PARTICLE_BEAM]: 'weapon',
            [CARD_TYPES.MISSILE_TUBES]: 'weapon',
            [CARD_TYPES.TORPEDO_LAUNCHER]: 'weapon',
            [CARD_TYPES.ION_STORM_CANNON]: 'weapon',
            [CARD_TYPES.GRAVITON_BEAM]: 'weapon',
            [CARD_TYPES.QUANTUM_TORPEDO]: 'weapon',
            [CARD_TYPES.SINGULARITY_LAUNCHER]: 'weapon',
            [CARD_TYPES.VOID_RIPPER]: 'weapon',
            [CARD_TYPES.NANITE_SWARM]: 'weapon',
            
            // Sensors category
            [CARD_TYPES.LONG_RANGE_SCANNER]: 'sensors',
            [CARD_TYPES.GALACTIC_CHART]: 'sensors',
            [CARD_TYPES.QUANTUM_SCANNER]: 'sensors',
            [CARD_TYPES.PRECOGNITION_ARRAY]: 'sensors',
            [CARD_TYPES.DIMENSIONAL_RADAR]: 'sensors',
            [CARD_TYPES.PSIONIC_AMPLIFIER]: 'sensors',
            [CARD_TYPES.NEURAL_INTERFACE]: 'sensors',
            
            // Communications category (simplified from communications)
            [CARD_TYPES.SUBSPACE_RADIO]: 'comms',
            [CARD_TYPES.VORTHAN_MIND_LINK]: 'comms',
            [CARD_TYPES.NEXUS_HARMONIZER]: 'comms',
            [CARD_TYPES.ETHEREAL_CONDUIT]: 'comms',
            
            // Utility category (simplified from targeting)
            [CARD_TYPES.TARGET_COMPUTER]: 'utility',
            [CARD_TYPES.CARGO_HOLD]: 'utility',
            [CARD_TYPES.REINFORCED_CARGO_HOLD]: 'utility',
            [CARD_TYPES.SHIELDED_CARGO_HOLD]: 'utility',
            // Warp drive now goes in utility category
            [CARD_TYPES.WARP_DRIVE]: 'utility',
            // Shield generators moved from power to utility category
            [CARD_TYPES.SHIELD_GENERATOR]: 'utility',
            [CARD_TYPES.SHIELDS]: 'utility',
            // Armor systems now go in utility category for greater tradeoff choices
            [CARD_TYPES.HULL_PLATING]: 'utility',
            [CARD_TYPES.PHASE_SHIELD]: 'utility',
            [CARD_TYPES.ADAPTIVE_ARMOR]: 'utility',
            [CARD_TYPES.QUANTUM_BARRIER]: 'utility',
            [CARD_TYPES.TEMPORAL_DEFLECTOR]: 'utility',
            // Sensors and Communications now go to utility
            [CARD_TYPES.SENSORS]: 'utility',
            [CARD_TYPES.LONG_RANGE_SENSORS]: 'utility',
            [CARD_TYPES.DEEP_SPACE_SENSORS]: 'utility',
            [CARD_TYPES.COMMUNICATIONS]: 'utility',
            [CARD_TYPES.SUBSPACE_RADIO]: 'utility',
            [CARD_TYPES.QUANTUM_ENTANGLEMENT_COMM]: 'utility',
            // Alien communication systems
            [CARD_TYPES.VORTHAN_MIND_LINK]: 'utility',
            [CARD_TYPES.NEXUS_HARMONIZER]: 'utility',
            [CARD_TYPES.ETHEREAL_CONDUIT]: 'utility',
            // Experimental systems
            [CARD_TYPES.ZEPHYRIAN_CRYSTAL]: 'utility',
            [CARD_TYPES.PROBABILITY_DRIVE]: 'utility',
            [CARD_TYPES.CHAOS_FIELD_GEN]: 'utility',
            [CARD_TYPES.REALITY_ANCHOR]: 'utility',
            [CARD_TYPES.ENTROPY_REVERSER]: 'utility'
        };
        
        return categoryMap[cardType] || 'unknown';
    }

    /**
     * Calculate upgrade cost based on card rarity and level (similar to Clash Royale)
     * @param {string} rarity - Card rarity
     * @param {number} currentLevel - Current card level
     * @returns {number} - Cost in credits
     */
    getUpgradeCost(rarity, currentLevel) {
        const baseCosts = {
            common: 100,
            rare: 500,
            epic: 2000,
            legendary: 10000
        };
        
        const levelMultiplier = Math.pow(1.5, currentLevel - 1);
        return Math.floor(baseCosts[rarity] * levelMultiplier);
    }

    /**
     * Check if player can afford an upgrade
     * @param {string} cardType - Card type to upgrade
     * @returns {Object} - Affordability info
     */
    canAffordUpgrade(cardType) {
        const stack = this.inventory.getCardStack(cardType);
        if (!stack || !stack.discovered || stack.level >= 10) {
            return { canAfford: false, reason: 'Invalid upgrade' };
        }

        const cost = this.getUpgradeCost(stack.rarity, stack.level);
        const canAfford = this.credits >= cost;
        
        return {
            canAfford,
            cost,
            currentCredits: this.credits,
            reason: canAfford ? null : 'Insufficient credits'
        };
    }

    /**
     * Update credits display
     */
    updateCreditsDisplay() {
        const creditsElement = document.getElementById('credits-amount');
        if (creditsElement) {
            creditsElement.textContent = this.credits.toLocaleString();
        }
    }

    renderInventoryGrid() {
        const grid = document.getElementById('inventory-grid');
        const rarityFilter = document.getElementById('rarity-filter').value;
        const typeFilter = document.getElementById('type-filter').value;
        const sortFilter = document.getElementById('sort-filter').value;
        
        // Use discovered cards only to avoid showing empty/undiscovered cards
        const stacks = this.inventory.getDiscoveredCards();
        DebugLogger.debug(DEBUG_CATEGORIES.INVENTORY, '🎯 Rendering inventory grid - discovered stacks:', stacks.length);
        DebugLogger.verbose(DEBUG_CATEGORIES.INVENTORY, '📋 Discovered stacks:', stacks.map(s => `${s.name} (${s.count})`));
        
        const filteredStacks = stacks.filter(stack => {
            const matchesRarity = rarityFilter === 'all' || stack.rarity === rarityFilter;
            const matchesType = typeFilter === 'all' || this.getCardCategory(stack.cardType) === typeFilter;
            return matchesRarity && matchesType;
        });
        
        // Sort the filtered stacks based on the selected sort option
        const sortedStacks = this.sortCards(filteredStacks, sortFilter);
        
        DebugLogger.debug(DEBUG_CATEGORIES.INVENTORY, '🔍 After filtering and sorting:', sortedStacks.length, 'stacks');

        grid.innerHTML = sortedStacks.map(stack => this.createCardStackHTML(stack)).join('');
        
        // Setup drag and drop for rendered cards
        grid.querySelectorAll('.card-stack').forEach(cardElement => {
            const cardType = cardElement.dataset.cardType;
            const cardData = this.inventory.getCardStack(cardType);
            if (cardData && cardData.count > 0) {
                this.setupCardDragAndDrop(cardElement, cardData.sampleCard);
            }
        });
    }

    sortCards(stacks, sortBy) {
        const rarityOrder = { 'common': 1, 'rare': 2, 'epic': 3, 'legendary': 4 };
        
        return [...stacks].sort((a, b) => {
            switch (sortBy) {
                case 'rarity':
                    // Sort by rarity (legendary first), then by name
                    const rarityDiff = (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
                    return rarityDiff !== 0 ? rarityDiff : a.name.localeCompare(b.name);
                    
                case 'level':
                    // Sort by level (highest first), then by rarity, then by name
                    const levelDiff = b.level - a.level;
                    if (levelDiff !== 0) return levelDiff;
                    const rarityDiffLevel = (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
                    return rarityDiffLevel !== 0 ? rarityDiffLevel : a.name.localeCompare(b.name);
                    
                case 'type':
                    // Sort by type, then by rarity, then by name
                    const typeA = this.getCardCategory(a.cardType);
                    const typeB = this.getCardCategory(b.cardType);
                    const typeDiff = typeA.localeCompare(typeB);
                    if (typeDiff !== 0) return typeDiff;
                    const rarityDiffType = (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
                    return rarityDiffType !== 0 ? rarityDiffType : a.name.localeCompare(b.name);
                    
                case 'name':
                    // Sort alphabetically by name
                    return a.name.localeCompare(b.name);
                    
                default:
                    // Default to rarity sorting
                    const defaultRarityDiff = (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
                    return defaultRarityDiff !== 0 ? defaultRarityDiff : a.name.localeCompare(b.name);
            }
        });
    }

    createCardStackHTML(stack) {
        const progressPercent = (stack.count / this.inventory.getUpgradeRequirements(stack.level + 1)) * 100;
        const cardIcon = CARD_ICONS[stack.cardType] || '❓';
        
        // Check upgrade requirements
        const hasEnoughCards = stack.canUpgrade;
        const affordabilityInfo = this.canAffordUpgrade(stack.cardType);
        const upgradeCost = stack.level < 10 ? this.getUpgradeCost(stack.rarity, stack.level) : 0;
        const canUpgrade = hasEnoughCards && affordabilityInfo.canAfford && stack.level < 10;
        
        // Determine button state and text
        let upgradeButtonHTML = '';
        if (stack.level >= 10) {
            upgradeButtonHTML = '<button class="upgrade-btn max-level" disabled>MAX LEVEL</button>';
        } else if (!hasEnoughCards) {
            upgradeButtonHTML = `<button class="upgrade-btn insufficient-cards" disabled>NEED ${this.inventory.getUpgradeRequirements(stack.level + 1) - stack.count} MORE</button>`;
        } else if (!affordabilityInfo.canAfford) {
            upgradeButtonHTML = `<button class="upgrade-btn insufficient-credits" disabled>💰 ${upgradeCost.toLocaleString()}</button>`;
        } else {
            upgradeButtonHTML = `<button class="upgrade-btn ready" onclick="cardInventoryUI.upgradeCard('${stack.cardType}')">💰 ${upgradeCost.toLocaleString()} UPGRADE</button>`;
        }
        
        return `
            <div class="card-stack ${stack.rarity}" data-card-type="${stack.cardType}">
                <div class="card-header">
                    <span class="card-icon">${cardIcon}</span>
                    <span class="card-name">${stack.name}</span>
                </div>
                <div class="card-level-rarity">
                    <span class="card-level">Level ${stack.level}</span>
                    <span class="card-rarity">${stack.rarity.toUpperCase()}</span>
                </div>
                <div class="upgrade-progress-compact">
                    <div class="progress-bar-compact">
                        <div class="progress-fill-compact" style="width: ${Math.min(progressPercent, 100)}%"></div>
                        <div class="progress-count-overlay">${stack.count}/${this.inventory.getUpgradeRequirements(stack.level + 1)}</div>
                    </div>
                </div>
                ${upgradeButtonHTML}
            </div>
        `;
    }

    updateAllSlotDisplays() {
        // Use the current ship's slot configuration
        const slotConfig = this.getShipSlotConfiguration();
        const slotIds = slotConfig.map(slot => slot.id);
        
        slotIds.forEach(slotId => {
            this.updateSlotDisplay(slotId);
        });
    }

    updateCollectionStats() {
        const stats = this.inventory.getCollectionStats();
        
        // Debug logging to see what stats we're getting
        console.log('🔍 Raw stats object:', stats);
        console.log('🔍 Stats properties:', {
            discoveredCardTypes: stats.discoveredCardTypes,
            totalCardTypes: stats.totalCardTypes,
            totalCardsCollected: stats.totalCardsCollected
        });
        
        // Safely update collection stats elements if they exist
        const discoveredElement = document.querySelector('.discovered-count');
        const totalCardsElement = document.querySelector('.total-cards');
        
        if (discoveredElement) {
            discoveredElement.textContent = `${stats.discoveredCardTypes}/${stats.totalCardTypes} Discovered`;
        }
        
        if (totalCardsElement) {
            totalCardsElement.textContent = `${stats.totalCardsCollected} Total Cards`;
        }
        
        // Log stats for debugging
        DebugLogger.info(DEBUG_CATEGORIES.INVENTORY, '📊 Collection Stats:', `${stats.discoveredCardTypes}/${stats.totalCardTypes} types discovered, ${stats.totalCardsCollected} total cards`);
    }

    // Action methods
    openCardPack() {
        const newCards = this.inventory.openCardPack(5);
        this.render();
        
        // Show pack opening animation/notification
        this.showPackResults(newCards);
    }

    generateTestCards() {
        const newCards = [];
        for (let i = 0; i < 10; i++) {
            const card = this.inventory.generateRandomCard();
            this.inventory.addCard(card);
            newCards.push(card);
        }
        this.render();
        
        // Show the results
        this.showPackResults(newCards);
        console.log('Generated 10 test cards:', newCards.map(c => `${c.metadata.name} (${c.rarity})`));
    }

    generateSpecificTestCards() {
        const newCards = [];
        
        // Generate specific cards for testing, including Quantum Reactor
        // Use the inventory's generateSpecificCard method
        const specificCards = [
            { type: CARD_TYPES.QUANTUM_REACTOR, rarity: 'rare' },
            { type: CARD_TYPES.DARK_MATTER_CORE, rarity: 'epic' },
            { type: CARD_TYPES.PHASE_SHIELD, rarity: 'epic' },
            { type: CARD_TYPES.ADAPTIVE_ARMOR, rarity: 'epic' },
            { type: CARD_TYPES.QUANTUM_DRIVE, rarity: 'epic' },
            { type: CARD_TYPES.DIMENSIONAL_SHIFTER, rarity: 'epic' },
            { type: CARD_TYPES.TEMPORAL_ENGINE, rarity: 'legendary' },
            { type: CARD_TYPES.GRAVITY_WELL_DRIVE, rarity: 'legendary' }
        ];
        
        specificCards.forEach(cardSpec => {
            const card = this.inventory.generateSpecificCard(cardSpec.type, cardSpec.rarity);
            this.inventory.addCard(card);
            newCards.push(card);
        });
        
        this.render();
        
        // Show the results
        this.showPackResults(newCards);
        console.log('Generated specific test cards:', newCards.map(c => `${c.metadata.name} (${c.rarity})`));
    }

    showPackResults(cards) {
        const notification = document.createElement('div');
        notification.className = 'pack-results-notification';
        
        // Calculate pack statistics
        const rarityCount = {};
        const categoryCount = {};
        let newDiscoveries = 0;
        
        cards.forEach(card => {
            // Count by rarity
            rarityCount[card.rarity] = (rarityCount[card.rarity] || 0) + 1;
            
            // Count by category
            const category = this.getCardCategory(card.cardType);
            categoryCount[category] = (categoryCount[category] || 0) + 1;
            
            // Check if this is a new discovery (simplified check)
            const stack = this.inventory.getCardStack(card.cardType);
            if (stack && stack.count === 1) {
                newDiscoveries++;
            }
        });
        
        notification.innerHTML = `
            <div class="pack-header">
                <h3>🎁 Pack Opened!</h3>
                <div class="pack-summary">
                    <span class="pack-count">${cards.length} cards</span>
                    ${newDiscoveries > 0 ? `<span class="new-discoveries">✨ ${newDiscoveries} new!</span>` : ''}
                </div>
            </div>
            
            <div class="pack-stats">
                <div class="rarity-breakdown">
                    ${Object.entries(rarityCount).map(([rarity, count]) => 
                        `<span class="rarity-stat ${rarity}">${count} ${rarity}</span>`
                    ).join('')}
                </div>
                <div class="category-breakdown">
                    ${Object.entries(categoryCount).map(([category, count]) => 
                        `<span class="category-stat">${count} ${category}</span>`
                    ).join('')}
                </div>
            </div>
            
            <div class="new-cards">
                ${cards.map(card => {
                    const stack = this.inventory.getCardStack(card.cardType);
                    const isNewDiscovery = stack && stack.count === 1;
                    const stats = card.getStats();
                    
                    return `
                        <div class="new-card ${card.rarity} ${isNewDiscovery ? 'new-discovery' : ''}">
                            <div class="card-header-info">
                                <span class="card-icon">${card.getIcon()}</span>
                                ${isNewDiscovery ? '<span class="discovery-badge">NEW!</span>' : ''}
                            </div>
                            <div class="card-name">${card.metadata.name}</div>
                            <div class="card-category">${this.getCardCategory(card.cardType)}</div>
                            <div class="card-rarity">${card.rarity.toUpperCase()}</div>
                            <div class="card-stats-mini">
                                ${stats.power ? `⚡${stats.power}` : ''}
                                ${stats.mass ? `⚖️${stats.mass}` : ''}
                                ${stats.damage ? `⚔️${stats.damage}` : ''}
                                ${stats.shield ? `🛡️${stats.shield}` : ''}
                            </div>
                            ${stack ? `<div class="card-count-info">Total: ${stack.count}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
            
            <div class="pack-actions">
                <button class="close-btn" onclick="this.closest('.pack-results-notification').remove()">Close</button>
                <button class="open-another-btn" onclick="window.cardInventoryUI.openCardPack(); this.closest('.pack-results-notification').remove();">Open Another Pack</button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Add animation
        notification.style.opacity = '0';
        notification.style.transform = 'translate(-50%, -50%) scale(0.8)';
        
        requestAnimationFrame(() => {
            notification.style.transition = 'all 0.3s ease';
            notification.style.opacity = '1';
            notification.style.transform = 'translate(-50%, -50%) scale(1)';
        });
        
        // Auto-remove after 10 seconds (increased from 5)
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.opacity = '0';
                notification.style.transform = 'translate(-50%, -50%) scale(0.8)';
                setTimeout(() => notification.remove(), 300);
            }
        }, 10000);
        
        // Log detailed pack results to console
        console.log('🎁 Pack Results:');
        cards.forEach((card, index) => {
            const stack = this.inventory.getCardStack(card.cardType);
            const isNew = stack && stack.count === 1;
            console.log(`  ${index + 1}. ${card.metadata.name} (${card.rarity}) ${isNew ? '✨ NEW!' : ''} - Total: ${stack ? stack.count : 0}`);
        });
    }

    upgradeCard(cardType) {
        const stack = this.inventory.getCardStack(cardType);
        if (!stack) {
            console.error(`Card type ${cardType} not found`);
            return;
        }

        // Check if upgrade is possible
        const affordabilityInfo = this.canAffordUpgrade(cardType);
        if (!affordabilityInfo.canAfford) {
            console.log(`Cannot afford upgrade: ${affordabilityInfo.reason}`);
            return;
        }

        const upgradeCost = this.getUpgradeCost(stack.rarity, stack.level);
        
        // Attempt the upgrade
        const result = this.inventory.upgradeCard(cardType);
        if (result.success) {
            // Deduct credits
            this.credits -= upgradeCost;
            this.updateCreditsDisplay();
            
            // Show upgrade notification
            this.showUpgradeNotification(stack.name, result.newLevel, upgradeCost);
            
            // Update only the specific card element instead of re-rendering entire grid
            this.updateSpecificCardElement(cardType);
            
            // Update collection stats
            this.updateCollectionStats();
            
            console.log(`✅ Upgraded ${stack.name} to level ${result.newLevel} for ${upgradeCost} credits`);
        } else {
            console.error(`❌ Upgrade failed: ${result.error}`);
        }
    }

    /**
     * Update a specific card element in the grid without re-rendering the entire grid
     * @param {string} cardType - The card type to update
     */
    updateSpecificCardElement(cardType) {
        const cardElement = document.querySelector(`[data-card-type="${cardType}"]`);
        if (!cardElement) {
            console.warn(`Card element not found for ${cardType}, falling back to full render`);
            this.render();
            return;
        }

        const stack = this.inventory.getCardStack(cardType);
        if (!stack) {
            console.error(`Card stack not found for ${cardType}`);
            return;
        }

        // Create new HTML for this card
        const newCardHTML = this.createCardStackHTML(stack);
        
        // Create a temporary container to parse the new HTML
        const tempContainer = document.createElement('div');
        tempContainer.innerHTML = newCardHTML;
        const newCardElement = tempContainer.firstElementChild;
        
        // Replace the old element with the new one
        cardElement.parentNode.replaceChild(newCardElement, cardElement);
        
        // Re-setup drag and drop for the updated card
        if (stack.count > 0) {
            this.setupCardDragAndDrop(newCardElement, stack.sampleCard);
        }
    }

    /**
     * Show upgrade notification (similar to Clash Royale)
     * @param {string} cardName - Name of the upgraded card
     * @param {number} newLevel - New level after upgrade
     * @param {number} cost - Cost of the upgrade
     */
    showUpgradeNotification(cardName, newLevel, cost) {
        const notification = document.createElement('div');
        notification.className = 'upgrade-notification';
        notification.innerHTML = `
            <div class="upgrade-content">
                <div class="upgrade-icon">⬆️</div>
                <div class="upgrade-text">
                    <div class="upgrade-card-name">${cardName}</div>
                    <div class="upgrade-level">Level ${newLevel}</div>
                    <div class="upgrade-cost">-${cost.toLocaleString()} 💰</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        
        requestAnimationFrame(() => {
            notification.style.transition = 'all 0.3s ease';
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        });
        
        // Remove after 2 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    saveConfiguration() {
        const config = {
            shipSlots: Object.fromEntries(this.shipSlots),
            inventory: this.inventory.toJSON(),
            credits: this.credits,
            timestamp: Date.now()
        };
        
        localStorage.setItem('shipConfiguration', JSON.stringify(config));
        console.log('Configuration saved!');
    }

    loadConfiguration() {
        const saved = localStorage.getItem('shipConfiguration');
        if (saved) {
            const config = JSON.parse(saved);
            
            // Restore ship slots
            this.shipSlots.clear();
            Object.entries(config.shipSlots).forEach(([slotId, card]) => {
                this.shipSlots.set(slotId, card);
            });
            
            // Restore inventory
            this.inventory.fromJSON(config.inventory);
            
            // Restore credits (with fallback for old saves)
            this.credits = config.credits || 50000;
            
            this.render();
            console.log('Configuration loaded!');
        }
    }

    resetShip() {
        if (confirm('Are you sure you want to reset the ship configuration? All installed cards will be returned to inventory.')) {
            // Return all cards to inventory
            this.shipSlots.forEach(card => {
                this.inventory.addCard(card);
            });
            
            this.shipSlots.clear();
            this.render();
            console.log('Ship configuration reset!');
        }
    }

    loadTestData() {
        // Reset inventory to clear any cached data
        this.inventory.reset();
        
        // Add some test cards for demonstration
        for (let i = 0; i < 20; i++) {
            const card = this.inventory.generateRandomCard();
            this.inventory.addCard(card);
        }
        
        console.log('Test data loaded with fresh random cards');
    }

    onShipTypeChange(newShipType) {
        this.currentShipType = newShipType;
        this.currentShipConfig = SHIP_CONFIGS[this.currentShipType];
        
        // Update ship type display
        const shipTypeDisplay = document.getElementById('ship-type-display');
        if (shipTypeDisplay) {
            shipTypeDisplay.textContent = this.currentShipConfig.name;
        }
        
        // Get the new slot configuration
        const newSlotConfig = this.getShipSlotConfiguration();
        const newSlotIds = new Set(newSlotConfig.map(slot => slot.id));
        
        // Return cards to inventory if their slots no longer exist in the new ship type
        const cardsToReturn = [];
        this.shipSlots.forEach((card, slotId) => {
            if (!newSlotIds.has(slotId)) {
                cardsToReturn.push({ card, slotId });
            }
        });
        
        // Return invalid cards to inventory
        cardsToReturn.forEach(({ card, slotId }) => {
            this.inventory.addCard(card);
            this.shipSlots.delete(slotId);
            console.log(`Returned ${card.metadata.name} to inventory (slot no longer available in ${this.currentShipConfig.name})`);
        });
        
        // Rebuild the ship slots section
        const shipSlotsGrid = document.querySelector('.ship-slots-grid');
        if (shipSlotsGrid) {
            shipSlotsGrid.innerHTML = this.createShipSlotsHTML();
            
            // Reset scroll position to top
            shipSlotsGrid.scrollTop = 0;
            
            // Re-setup event listeners for the new slots
            this.setupSlotDropZones();
            
            // Update slot displays for any remaining installed cards
            this.updateAllSlotDisplays();
        }
        
        // Re-render the interface to update inventory and stats
        this.render();
        
        console.log(`Ship type changed to: ${this.currentShipConfig.name}`);
        console.log(`Available slots: ${newSlotConfig.map(s => s.name).join(', ')}`);
        
        if (cardsToReturn.length > 0) {
            console.log(`Returned ${cardsToReturn.length} cards to inventory due to slot changes`);
        }
    }
}

// Global reference for button onclick handlers
window.cardInventoryUI = null; 