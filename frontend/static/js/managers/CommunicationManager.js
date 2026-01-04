/**
 * CommunicationManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles communication HUD display operations.
 *
 * Features:
 * - Show communication messages from NPCs/missions
 * - Hide communication HUD
 * - Check communication visibility state
 */

import { debug } from '../debug.js';

export class CommunicationManager {
    /**
     * Create a CommunicationManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
    }

    /**
     * Show communication message from mission or AI system
     * @param {string} npcName - Name of the NPC sending the message
     * @param {string} message - The message text
     * @param {Object} options - Optional settings (channel, signal strength, duration)
     * @returns {boolean} True if message was shown successfully
     */
    showCommunication(npcName, message, options = {}) {
        if (this.sfm.communicationHUD) {
            this.sfm.communicationHUD.showMessage(npcName, message, options);
            return true;
        }
        debug('P1', '🗣️ Communication HUD not available');
        return false;
    }

    /**
     * Hide communication HUD
     */
    hideCommunication() {
        if (this.sfm.communicationHUD) {
            this.sfm.communicationHUD.hide();
        }
    }

    /**
     * Check if communication HUD is visible
     * @returns {boolean} True if communication is visible
     */
    isCommunicationVisible() {
        return this.sfm.communicationHUD ? this.sfm.communicationHUD.visible : false;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.sfm = null;
    }
}
