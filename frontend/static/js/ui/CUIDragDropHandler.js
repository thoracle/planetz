/**
 * CUIDragDropHandler
 *
 * Extracted from CardInventoryUI to reduce file size.
 * Handles all drag-and-drop operations for the card inventory system.
 *
 * Features:
 * - Drag start/end event handling
 * - Drag over/enter/leave visual feedback
 * - Drop handling with slot compatibility validation
 * - Event listener setup and cleanup
 */

import { debug } from '../debug.js';

export class CUIDragDropHandler {
    /**
     * Create a CUIDragDropHandler
     * @param {Object} cardInventoryUI - Reference to parent CardInventoryUI
     */
    constructor(cardInventoryUI) {
        this.cui = cardInventoryUI;
        this.currentDragData = null;

        // Bound event handlers for proper cleanup
        this._boundHandlers = {
            dragStart: null,
            dragEnd: null
        };
    }

    /**
     * Setup event listeners for drag and drop
     */
    setupEventListeners() {
        // Create bound handlers for later removal
        this._boundHandlers.dragStart = (e) => {
            if (e.target.classList.contains('card-stack') || e.target.classList.contains('collection-card-item')) {
                this.handleDragStart(e);
            }
        };

        this._boundHandlers.dragEnd = (e) => {
            if (e.target.classList.contains('card-stack') || e.target.classList.contains('collection-card-item')) {
                this.handleDragEnd(e);
            }
        };

        // Add drag start event listeners to all cards
        document.addEventListener('dragstart', this._boundHandlers.dragStart);

        // Add drag end event listeners
        document.addEventListener('dragend', this._boundHandlers.dragEnd);

        debug('UI', 'Drag and drop event listeners set up');
    }

    /**
     * Remove event listeners for cleanup
     */
    removeEventListeners() {
        if (this._boundHandlers.dragStart) {
            document.removeEventListener('dragstart', this._boundHandlers.dragStart);
        }
        if (this._boundHandlers.dragEnd) {
            document.removeEventListener('dragend', this._boundHandlers.dragEnd);
        }
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
        this.currentDragData = dragData;

        // Also expose on parent for compatibility
        this.cui.currentDragData = dragData;

        // Set drag effect
        e.dataTransfer.effectAllowed = 'move';

        // Add visual feedback
        cardElement.classList.add('dragging');

        debug('UI', `Started dragging ${cardType} (Lv.${dragData.level})`);
    }

    /**
     * Handle drag end
     */
    handleDragEnd(e) {
        const cardElement = e.target;
        cardElement.classList.remove('dragging');

        // Clear current drag data
        this.currentDragData = null;
        this.cui.currentDragData = null;

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
        const dragData = this.currentDragData || this.cui.currentDragData;
        if (dragData) {
            const dragCardType = dragData.cardType;
            const isCompatible = this.cui.isCardCompatibleWithSlot(dragCardType, slotType);

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
     * @returns {Promise<boolean>} Whether the drop was successful
     */
    async handleDrop(e) {
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
            debug('UI', `Cannot drop card - slot ${slotId} is already occupied`);
            return false;
        }

        try {
            // Get drag data
            const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));

            // Validate card type compatibility with slot type
            if (!this.cui.isCardCompatibleWithSlot(dragData.cardType, slotType)) {
                debug('UI', `Cannot drop ${dragData.cardType} card in ${slotType} slot - incompatible types`);
                return false;
            }

            // Delegate the actual installation to CardInventoryUI
            return await this.cui.installCardInSlot(slotId, dragData.cardType, dragData.level);

        } catch (error) {
            debug('UI', `Drop error: ${error.message}`);
            return false;
        }
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.removeEventListeners();
        this.currentDragData = null;
        this._boundHandlers = {
            dragStart: null,
            dragEnd: null
        };
        this.cui = null;
    }
}
