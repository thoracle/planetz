/**
 * InfrastructureInitializer
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Handles initialization of infrastructure/utility systems.
 *
 * Features:
 * - Consolidates 3 infrastructure manager instantiations
 * - Provides centralized access to infrastructure managers
 * - Provides cleanup on disposal
 */

import { TimeoutManager } from './TimeoutManager.js';
import { GlobalReferencesManager } from './GlobalReferencesManager.js';
import { ButtonStateManager } from './ButtonStateManager.js';
import { debug } from '../debug.js';

export class InfrastructureInitializer {
    /**
     * Create an InfrastructureInitializer
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // Infrastructure managers
        this.timeoutManager = null;
        this.globalReferencesManager = null;
        this.buttonStateManager = null;
    }

    /**
     * Initialize all infrastructure managers
     */
    initialize() {
        // TimeoutManager - handles timeout tracking and cleanup
        this.timeoutManager = new TimeoutManager(this.sfm);

        // GlobalReferencesManager - handles window.* global references
        this.globalReferencesManager = new GlobalReferencesManager(this.sfm);
        this.globalReferencesManager.initialize();

        // ButtonStateManager - handles dock button CSS and state
        this.buttonStateManager = new ButtonStateManager(this.sfm);
        this.buttonStateManager.injectDockButtonCSS();

        debug('UTILITY', 'InfrastructureInitializer: 3 infrastructure managers initialized');
    }

    /**
     * Dispose of all infrastructure managers
     */
    dispose() {
        // Dispose ButtonStateManager
        if (this.buttonStateManager) {
            if (typeof this.buttonStateManager.dispose === 'function') {
                this.buttonStateManager.dispose();
            }
            this.buttonStateManager = null;
        }

        // Dispose GlobalReferencesManager
        if (this.globalReferencesManager) {
            if (typeof this.globalReferencesManager.dispose === 'function') {
                this.globalReferencesManager.dispose();
            }
            this.globalReferencesManager = null;
        }

        // Dispose TimeoutManager
        if (this.timeoutManager) {
            if (typeof this.timeoutManager.dispose === 'function') {
                this.timeoutManager.dispose();
            }
            this.timeoutManager = null;
        }

        this.sfm = null;
    }
}
