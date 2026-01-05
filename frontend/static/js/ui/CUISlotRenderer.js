/**
 * CUISlotRenderer
 *
 * Extracted from CardInventoryUI to reduce file size.
 * Handles rendering of ship slots and slot-related operations.
 *
 * Features:
 * - Ship slot grid rendering
 * - Slot type mapping and icons
 * - Empty slot and occupied slot rendering
 * - Slot event handler binding
 */

import { debug } from '../debug.js';
import { CARD_ICONS } from '../ship/NFTCard.js';

export class CUISlotRenderer {
    /**
     * Create a CUISlotRenderer
     * @param {Object} cardInventoryUI - Reference to parent CardInventoryUI
     */
    constructor(cardInventoryUI) {
        this.cui = cardInventoryUI;
    }

    /**
     * Generate slot type mapping from ship config
     * @param {Object} config - Ship configuration
     * @returns {Object} Map of slot index to slot type
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
     * @param {string} slotType - Slot type
     * @returns {string} Emoji icon
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
     * Render ship slots in the slot grid
     */
    renderShipSlots() {
        const slotsGrid = document.getElementById('slots-grid');
        if (!slotsGrid) {
            debug('UI', 'Slots grid not found');
            return;
        }

        const config = this.cui.currentShipConfig;
        if (!config) {
            debug('UI', 'No ship config available');
            return;
        }

        // Generate slot type mapping from ship config
        const slotTypeMapping = this.generateSlotTypeMapping(config);

        // Store mapping on parent for compatibility
        this.cui.slotTypeMapping = slotTypeMapping;

        // Create slot HTML
        let slotsHTML = '';
        for (let i = 0; i < config.systemSlots; i++) {
            const slotId = i.toString();
            const slotType = slotTypeMapping[i] || 'utility';
            const slotIcon = this.getSlotTypeIcon(slotType);
            const card = this.cui.shipSlots.get(slotId);

            slotsHTML += `
                <div class="ship-slot ${card ? 'occupied' : 'empty'}"
                     data-slot-id="${slotId}"
                     data-slot-type="${slotType}">
                    <div class="slot-header">
                        <span class="slot-icon">${slotIcon}</span>
                        <span class="slot-type">${slotType.toUpperCase()}</span>
                        <span class="slot-number">#${i + 1}</span>
                    </div>
                    ${this.renderSlotContent(slotId, card, slotType)}
                </div>
            `;
        }

        slotsGrid.innerHTML = slotsHTML;

        // Bind event handlers to slots
        this.bindSlotEventHandlers();

        debug('UI', `Rendered ${config.systemSlots} ship slots`);
    }

    /**
     * Render content for a single slot
     * @param {string} slotId - Slot identifier
     * @param {Object|null} card - Card in slot or null
     * @param {string} slotType - Type of slot
     * @returns {string} HTML content
     */
    renderSlotContent(slotId, card, slotType) {
        if (!card) {
            return `
                <div class="empty-slot">
                    <div class="empty-text">EMPTY</div>
                    <div class="empty-hint">Drag card here</div>
                </div>
            `;
        }

        const cardIcon = CARD_ICONS[card.cardType] || '❓';

        return `
            <div class="installed-card" data-card-type="${card.cardType}">
                <div class="card-icon">${cardIcon}</div>
                <div class="card-name">${this.formatCardName(card.cardType)}</div>
                <div class="card-level">Level ${card.level}</div>
                <button class="remove-btn"
                        onclick="cardInventoryUI.removeCardFromSlot('${slotId}')"
                        title="Remove card">✖</button>
            </div>
        `;
    }

    /**
     * Format card type to display name
     * @param {string} cardType - Card type identifier
     * @returns {string} Formatted name
     */
    formatCardName(cardType) {
        return cardType
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Bind event handlers to slot elements
     */
    bindSlotEventHandlers() {
        const slots = document.querySelectorAll('.ship-slot');

        slots.forEach(slot => {
            // Use the drag-drop handler if available
            const dragDropHandler = this.cui.dragDropHandler;

            slot.addEventListener('dragover', (e) => {
                if (dragDropHandler) {
                    dragDropHandler.handleDragOver(e);
                } else {
                    this.cui.handleDragOver(e);
                }
            });

            slot.addEventListener('dragenter', (e) => {
                if (dragDropHandler) {
                    dragDropHandler.handleDragEnter(e);
                } else {
                    this.cui.handleDragEnter(e);
                }
            });

            slot.addEventListener('dragleave', (e) => {
                if (dragDropHandler) {
                    dragDropHandler.handleDragLeave(e);
                } else {
                    this.cui.handleDragLeave(e);
                }
            });

            slot.addEventListener('drop', async (e) => {
                if (dragDropHandler) {
                    await dragDropHandler.handleDrop(e);
                } else {
                    await this.cui.handleDrop(e);
                }
            });
        });
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.cui = null;
    }
}
