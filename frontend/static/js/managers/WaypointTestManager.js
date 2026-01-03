/**
 * WaypointTestManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles waypoint test mission creation for development and testing purposes.
 *
 * Features:
 * - Creates test waypoint missions via the W key
 * - Integrates with WaypointManager for mission creation
 * - Provides HUD feedback for mission creation status
 * - Shows mission notifications on success
 */

import { debug } from '../debug.js';

export class WaypointTestManager {
    /**
     * Create a WaypointTestManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
    }

    /**
     * Handle waypoint creation asynchronously (called from keydown handler)
     */
    async handleWaypointCreationAsync() {
        try {
            await this.createWaypointTestMission();
        } catch (error) {
            debug('P1', `❌ Error in handleWaypointCreationAsync: ${error}`);
        }
    }

    /**
     * Create a waypoint test mission for development/testing
     */
    async createWaypointTestMission() {
        debug('WAYPOINTS', '🎯 W key pressed - Creating waypoint test mission...');

        // Check if waypoint manager is available
        debug('WAYPOINTS', `🎯 Checking waypoint manager availability: ${!!window.waypointManager}`);
        if (!window.waypointManager) {
            debug('P1', '❌ Waypoint manager not available');
            this.sfm.playCommandFailedSound();
            this.sfm.showHUDEphemeral(
                'WAYPOINT SYSTEM UNAVAILABLE',
                'Waypoint manager not initialized'
            );
            return;
        }
        debug('WAYPOINTS', '✅ Waypoint manager is available');

        try {
            // Create the test mission
            debug('WAYPOINTS', '🎯 Calling waypointManager.createTestMission()...');
            const result = await window.waypointManager.createTestMission();
            debug('WAYPOINTS', `🎯 createTestMission result: ${result ? 'success' : 'null/false'}`);

            if (result) {
                debug('WAYPOINTS', '✅ Test mission created successfully');
                this.sfm.playCommandSound();
                this.sfm.showHUDEphemeral(
                    'TEST MISSION CREATED',
                    `${result.mission.title} - ${result.waypoints.length} waypoints added`
                );

                debug('WAYPOINTS', `✅ Test mission created: ${result.mission.title}`);

                // Show mission notification if available
                if (window.missionNotificationHandler &&
                    typeof window.missionNotificationHandler.showNotification === 'function') {
                    window.missionNotificationHandler.showNotification(
                        `Mission Available: ${result.mission.title}`,
                        'info'
                    );
                } else {
                    // Fallback notification using HUD
                    this.sfm._setTimeout(() => {
                        this.sfm.showHUDEphemeral(
                            'MISSION AVAILABLE',
                            `${result.mission.title} - Navigate to waypoints`
                        );
                    }, 2000);
                }

            } else {
                debug('P1', '❌ Test mission creation returned null/false');
                this.sfm.playCommandFailedSound();
                this.sfm.showHUDEphemeral(
                    'MISSION CREATION FAILED',
                    'Unable to create waypoint test mission'
                );
            }

        } catch (error) {
            debug('P1', `❌ Failed to create waypoint test mission: ${error}`);
            this.sfm.playCommandFailedSound();
            this.sfm.showHUDEphemeral(
                'MISSION CREATION ERROR',
                'System error during mission creation'
            );
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.sfm = null;
    }
}
