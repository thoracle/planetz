/**
 * InterfaceInitManager
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Handles initialization of UI interface components.
 *
 * Features:
 * - Manages HelpInterface creation with error handling
 * - Manages CommunicationHUD for NPC interactions
 * - Provides cleanup on disposal
 */

import { HelpInterface } from '../ui/HelpInterface.js';
import { CommunicationHUD } from '../ui/CommunicationHUD.js';
import { debug } from '../debug.js';

export class InterfaceInitManager {
    /**
     * Create an InterfaceInitManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // Interface components
        this.helpInterface = null;
        this.communicationHUD = null;
    }

    /**
     * Initialize all interface components
     */
    initialize() {
        this.createHelpInterface();
        this.createCommunicationHUD();
    }

    /**
     * Create the help interface with error handling
     */
    createHelpInterface() {
        try {
            this.helpInterface = new HelpInterface(this.sfm);
            debug('UI', 'HelpInterface created successfully');
        } catch (error) {
            debug('P1', `❌ Failed to create HelpInterface: ${error}`);
            this.helpInterface = null;
        }
    }

    /**
     * Create the communication HUD for NPC interactions
     */
    createCommunicationHUD() {
        this.communicationHUD = new CommunicationHUD(this.sfm, document.body);
    }

    /**
     * Dispose of all interface components
     */
    dispose() {
        // Clean up help interface
        if (this.helpInterface) {
            if (typeof this.helpInterface.dispose === 'function') {
                this.helpInterface.dispose();
            }
            this.helpInterface = null;
        }

        // Clean up communication HUD
        if (this.communicationHUD) {
            if (typeof this.communicationHUD.dispose === 'function') {
                this.communicationHUD.dispose();
            }
            this.communicationHUD = null;
        }

        this.sfm = null;
    }
}
