/**
 * CoreManagersInitializer
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Handles initialization of core system managers.
 *
 * Features:
 * - Consolidates 10 core manager instantiations
 * - Provides centralized access to core managers
 * - Provides cleanup on disposal
 */

import { ViewStateManager } from './ViewStateManager.js';
import { TargetValidationManager } from './TargetValidationManager.js';
import { WeaponEffectsInitManager } from './WeaponEffectsInitManager.js';
import { UIToggleManager } from './UIToggleManager.js';
import { TargetCyclingManager } from './TargetCyclingManager.js';
import { TargetDisplayManager } from './TargetDisplayManager.js';
import { CommunicationManager } from './CommunicationManager.js';
import { FactionDiplomacyManager } from './FactionDiplomacyManager.js';
import { UpdateLoopManager } from './UpdateLoopManager.js';
import { MiscSystemManager } from './MiscSystemManager.js';
import { debug } from '../debug.js';

export class CoreManagersInitializer {
    /**
     * Create a CoreManagersInitializer
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // Core managers
        this.viewStateManager = null;
        this.targetValidationManager = null;
        this.weaponEffectsInitManager = null;
        this.uiToggleManager = null;
        this.targetCyclingManager = null;
        this.targetDisplayManager = null;
        this.communicationManagerDelegate = null;
        this.factionDiplomacyManager = null;
        this.updateLoopManager = null;
        this.miscSystemManager = null;
    }

    /**
     * Initialize all core managers
     */
    initialize() {
        this.viewStateManager = new ViewStateManager(this.sfm);
        this.targetValidationManager = new TargetValidationManager(this.sfm);
        this.weaponEffectsInitManager = new WeaponEffectsInitManager(this.sfm);
        this.uiToggleManager = new UIToggleManager(this.sfm);
        this.targetCyclingManager = new TargetCyclingManager(this.sfm);
        this.targetDisplayManager = new TargetDisplayManager(this.sfm);
        this.communicationManagerDelegate = new CommunicationManager(this.sfm);
        this.factionDiplomacyManager = new FactionDiplomacyManager(this.sfm);
        this.updateLoopManager = new UpdateLoopManager(this.sfm);
        this.miscSystemManager = new MiscSystemManager(this.sfm);

        debug('UTILITY', 'CoreManagersInitializer: 10 core managers initialized');
    }

    /**
     * Dispose of all core managers
     */
    dispose() {
        const managers = [
            'viewStateManager',
            'targetValidationManager',
            'weaponEffectsInitManager',
            'uiToggleManager',
            'targetCyclingManager',
            'targetDisplayManager',
            'communicationManagerDelegate',
            'factionDiplomacyManager',
            'updateLoopManager',
            'miscSystemManager'
        ];

        for (const managerName of managers) {
            if (this[managerName]) {
                if (typeof this[managerName].dispose === 'function') {
                    this[managerName].dispose();
                }
                this[managerName] = null;
            }
        }

        this.sfm = null;
    }
}
