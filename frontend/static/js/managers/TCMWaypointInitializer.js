/**
 * TCMWaypointInitializer
 *
 * Extracted from TargetComputerManager to reduce constructor size.
 * Handles initialization of waypoint and sector systems.
 *
 * Features:
 * - Consolidates 3 waypoint/sector manager instantiations
 * - Provides centralized access to waypoint managers
 * - Provides cleanup on disposal
 */

import { WaypointTargetManager } from '../ui/WaypointTargetManager.js';
import { TargetSectorManager } from '../ui/TargetSectorManager.js';
import { StarChartsNotifier } from '../ui/StarChartsNotifier.js';
import { debug } from '../debug.js';

export class TCMWaypointInitializer {
    /**
     * Create a TCMWaypointInitializer
     * @param {Object} targetComputerManager - Reference to parent TargetComputerManager
     */
    constructor(targetComputerManager) {
        this.tcm = targetComputerManager;

        // Waypoint/sector managers
        this.waypointTargetManager = null;
        this.targetSectorManager = null;
        this.starChartsNotifier = null;
    }

    /**
     * Initialize all waypoint/sector managers
     */
    initialize() {
        // Initialize WaypointTargetManager
        this.waypointTargetManager = new WaypointTargetManager(this.tcm);

        // Initialize TargetSectorManager
        this.targetSectorManager = new TargetSectorManager(this.tcm);

        // Initialize StarChartsNotifier
        this.starChartsNotifier = new StarChartsNotifier(this.tcm);

        debug('UTILITY', 'TCMWaypointInitializer: 3 waypoint/sector managers initialized');
    }

    /**
     * Dispose of all waypoint/sector managers
     */
    dispose() {
        const managers = [
            'waypointTargetManager',
            'targetSectorManager',
            'starChartsNotifier'
        ];

        for (const managerName of managers) {
            if (this[managerName]) {
                if (typeof this[managerName].dispose === 'function') {
                    this[managerName].dispose();
                }
                this[managerName] = null;
            }
        }

        this.tcm = null;
    }
}
