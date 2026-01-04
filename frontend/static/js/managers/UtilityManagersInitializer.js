/**
 * UtilityManagersInitializer
 *
 * Extracted from StarfieldManager to reduce constructor size.
 * Handles initialization of various utility managers that follow
 * the simple pattern of new ManagerName(starfieldManager).
 *
 * Features:
 * - Consolidates 14 small manager instantiations
 * - Provides centralized access to utility managers
 * - Provides cleanup on disposal
 */

import { TargetDummyManager } from './TargetDummyManager.js';
import { TargetOutlineManager } from './TargetOutlineManager.js';
import { DestroyedTargetHandler } from './DestroyedTargetHandler.js';
import { ReticleManager } from './ReticleManager.js';
import { SystemLifecycleManager } from './SystemLifecycleManager.js';
import { HUDMessageManager } from './HUDMessageManager.js';
import { CargoDeliveryHandler } from './CargoDeliveryHandler.js';
import { WaypointTestManager } from './WaypointTestManager.js';
import { CommandAudioManager } from './CommandAudioManager.js';
import { WeaponHUDManager } from './WeaponHUDManager.js';
import { StatusBarManager } from './StatusBarManager.js';
import { SubTargetDisplayManager } from './SubTargetDisplayManager.js';
import { DebugCommandManager } from './DebugCommandManager.js';
import { SectorManager } from './SectorManager.js';
import { debug } from '../debug.js';

export class UtilityManagersInitializer {
    /**
     * Create a UtilityManagersInitializer
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // Utility managers
        this.targetDummyManager = null;
        this.targetOutlineManager = null;
        this.destroyedTargetHandler = null;
        this.reticleManager = null;
        this.systemLifecycleManager = null;
        this.hudMessageManager = null;
        this.cargoDeliveryHandler = null;
        this.waypointTestManager = null;
        this.commandAudioManager = null;
        this.weaponHUDManager = null;
        this.statusBarManager = null;
        this.subTargetDisplayManager = null;
        this.debugCommandManager = null;
        this.sectorManager = null;
    }

    /**
     * Initialize all utility managers
     */
    initialize() {
        this.targetDummyManager = new TargetDummyManager(this.sfm);
        this.targetOutlineManager = new TargetOutlineManager(this.sfm);
        this.destroyedTargetHandler = new DestroyedTargetHandler(this.sfm);
        this.reticleManager = new ReticleManager(this.sfm);
        this.systemLifecycleManager = new SystemLifecycleManager(this.sfm);
        this.hudMessageManager = new HUDMessageManager(this.sfm);
        this.cargoDeliveryHandler = new CargoDeliveryHandler(this.sfm);
        this.waypointTestManager = new WaypointTestManager(this.sfm);
        this.commandAudioManager = new CommandAudioManager(this.sfm);
        this.weaponHUDManager = new WeaponHUDManager(this.sfm);
        this.statusBarManager = new StatusBarManager(this.sfm);
        this.subTargetDisplayManager = new SubTargetDisplayManager(this.sfm);
        this.debugCommandManager = new DebugCommandManager(this.sfm);
        this.sectorManager = new SectorManager(this.sfm);

        debug('UTILITY', 'UtilityManagersInitializer: 14 utility managers initialized');
    }

    /**
     * Dispose of all utility managers
     */
    dispose() {
        const managers = [
            'targetDummyManager',
            'targetOutlineManager',
            'destroyedTargetHandler',
            'reticleManager',
            'systemLifecycleManager',
            'hudMessageManager',
            'cargoDeliveryHandler',
            'waypointTestManager',
            'commandAudioManager',
            'weaponHUDManager',
            'statusBarManager',
            'subTargetDisplayManager',
            'debugCommandManager',
            'sectorManager'
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
