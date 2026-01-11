/**
 * CUIUICreator
 *
 * Extracted from CardInventoryUI to reduce file size.
 * Handles UI element creation for the card inventory interface.
 *
 * Features:
 * - Create main UI structure
 * - Create ship slots panel
 * - Create inventory panel
 * - Create ship selector and stats
 * - Create collection stats
 */

import { debug } from '../debug.js';
import { SHIP_CONFIGS } from '../ship/ShipConfigs.js';

export class CUIUICreator {
    /**
     * Create a CUIUICreator
     * @param {Object} cardInventoryUI - Reference to parent CardInventoryUI
     */
    constructor(cardInventoryUI) {
        this.cui = cardInventoryUI;
    }

    /**
     * Create the UI elements
     */
    createUI() {
        if (!this.cui.container) {
            debug('UI', 'Cannot create UI - no container available');
            return;
        }

        this.cui.container.innerHTML = '';

        // Add NEW badge CSS styles
        this.cui.addNewBadgeStyles();

        // Create header
        const header = document.createElement('div');
        header.className = 'card-inventory-header';
        header.innerHTML = `
            <h2>${this.cui.isShopMode ? 'SHIP UPGRADE SHOP' : 'SHIP COLLECTION'}</h2>
            ${this.cui.isShopMode ?
                `<button onclick="cardInventoryUI.hideShop()" class="close-shop-btn">\u2190 RETURN TO STATION MENU</button>` :
                `<button onclick="cardInventoryUI.hideInventory()" class="close-inventory-btn">\u2190 RETURN TO STATION MENU</button>`
            }
        `;
        this.cui.container.appendChild(header);

        // Create main content area with proper two-panel structure
        const mainContent = document.createElement('div');
        mainContent.className = 'inventory-main';
        this.cui.container.appendChild(mainContent);

        if (this.cui.isShopMode) {
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
        this.cui.setupEventListeners();
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
                <select id="ship-type-select" onchange="cardInventoryUI.switchShip(this.value)">
                    ${this.createShipTypeOptions()}
                </select>
            </div>
            <div class="ship-slots-grid" id="ship-slots-grid">
                <!-- Ship slots will be populated by renderShipSlots() -->
            </div>
        `;
        this.cui.container.querySelector('.inventory-main').appendChild(panel);

        // Render the ship slots immediately
        this.cui.renderShipSlots();
    }

    /**
     * Create inventory panel (right side)
     */
    createInventoryPanel() {
        const panel = document.createElement('div');
        panel.className = 'inventory-panel';
        panel.innerHTML = `
            <h3>COLLECTION</h3>
            <div class="inventory-grid" id="inventory-grid">
                <!-- Collection cards will be populated by renderInventoryGrid() -->
            </div>
        `;
        this.cui.container.querySelector('.inventory-main').appendChild(panel);
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
        this.cui.container.querySelector('.inventory-main').appendChild(selector);
    }

    /**
     * Create ship type options for dropdown
     */
    createShipTypeOptions() {
        // For testing, show all available ship types instead of just owned ships
        const allShipTypes = Object.keys(SHIP_CONFIGS);
        return allShipTypes.map(shipType => {
            const config = SHIP_CONFIGS[shipType];
            return `<option value="${shipType}" ${shipType === this.cui.currentShipType ? 'selected' : ''}>
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
        this.cui.container.querySelector('.inventory-main').appendChild(stats);
    }

    /**
     * Create inventory grid (deprecated - use createInventoryPanel instead)
     */
    createInventoryGrid() {
        // This method is kept for backward compatibility but should not be used
        debug('UI', 'createInventoryGrid is deprecated, use createInventoryPanel instead');
    }

    /**
     * Create collection stats display
     */
    createCollectionStats() {
        const stats = document.createElement('div');
        stats.className = 'collection-stats';
        stats.id = 'collection-stats';
        this.cui.container.appendChild(stats); // Append to main container, not inventory-main
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

        const config = this.cui.currentShipConfig;
        if (!config) {
            slotsGrid.innerHTML = '<div class="error">Ship configuration not found</div>';
            return;
        }

        // Create slot type mapping (slot index to slot type)
        const slotTypes = this.cui.generateSlotTypeMapping(config);

        // Create slots based on ship configuration
        const slots = [];
        for (let i = 0; i < config.systemSlots; i++) {
            const slotType = slotTypes[i] || 'utility'; // Default to utility if not mapped
            const equippedCard = this.cui.shipSlots.get(i.toString());

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

        debug('RENDER', `Rendered ${config.systemSlots} ship slots for ${config.name}`);
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
            engines: '\uD83D\uDE80',
            reactor: '\u26A1',
            weapons: '\u2694\uFE0F',
            utility: '\uD83D\uDD27',
            warpDrive: '\uD83C\uDF00',
            shields: '\uD83D\uDEE1\uFE0F',
            scanner: '\uD83D\uDCE1',
            radio: '\uD83D\uDCFB',
            galacticChart: '\uD83D\uDDFA\uFE0F',
            targetComputer: '\uD83C\uDFAF',
            missileTubes: '\uD83D\uDE80'
        };
        return slotIcons[slotType] || '\uD83D\uDD27';
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.cui = null;
    }
}
