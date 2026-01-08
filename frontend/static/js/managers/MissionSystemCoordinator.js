/**
 * MissionSystemCoordinator
 *
 * Extracted from StarfieldManager.js to reduce god class size.
 * Coordinates all mission-related functionality including:
 * - Mission API communication
 * - Mission event handling
 * - Station mission population
 * - Mission UI coordination
 */

import { debug } from '../debug.js';
import { MissionStatusHUD } from '../ui/MissionStatusHUD.js';
import { MissionCompletionUI } from '../ui/MissionCompletionUI.js';
import { MissionNotificationHandler } from '../ui/MissionNotificationHandler.js';
import { MissionEventHandler } from '../ui/MissionEventHandler.js';
import { MissionAPIService } from '../services/MissionAPIService.js';
import { MissionEventService } from '../services/MissionEventService.js';

// TESTING CONFIGURATION - must match StarfieldManager
const TESTING_CONFIG = {
    NO_PERSISTENCE: false
};

export class MissionSystemCoordinator {
    /**
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // Initialize mission API service
        this.missionAPI = new MissionAPIService();

        // Expose mission API globally for waypoint system
        window.missionAPI = this.missionAPI;

        // Initialize mission event service
        this.missionEventService = new MissionEventService();

        // Initialize mission UI components
        this.missionStatusHUD = new MissionStatusHUD(this.sfm, null);
        this.missionCompletionUI = new MissionCompletionUI(this.sfm, null);
        this.missionNotificationHandler = new MissionNotificationHandler(
            this.sfm.communicationHUD,
            this.sfm
        );
        this.missionEventHandler = new MissionEventHandler(this.sfm);

        // Make MissionEventHandler globally available for waypoint system
        window.missionEventHandler = this.missionEventHandler;

        debug('MISSIONS', 'MissionSystemCoordinator initialized');
    }

    /**
     * Initialize mission system on game start
     */
    async initializeMissionSystem() {
        debug('MISSIONS', 'Initializing mission system...');

        try {
            // Update player data first
            this.updateMissionSystemPlayerData();

            // Test backend connection
            const isConnected = await this.missionAPI.testConnection();

            if (isConnected) {
                debug('MISSIONS', 'Mission API connected, pre-populating stations...');

                // TESTING PHASE: Clear old data for fresh start
                if (TESTING_CONFIG.NO_PERSISTENCE) {
                    debug('UTILITY', 'TESTING MODE ACTIVE: Clearing all persistent data for fresh start...');

                    const activeCount = await this.missionAPI.getActiveMissions();
                    if (activeCount.length > 0) {
                        debug('MISSIONS', `TESTING MODE: Found ${activeCount.length} old active missions, clearing...`);
                        await this.missionAPI.clearActiveMissions();
                        debug('MISSIONS', 'TESTING MODE: All old missions cleared');
                    } else {
                        debug('MISSIONS', 'TESTING MODE: No old missions found - clean start');
                    }

                    // Reset credits to starting amount
                    const { playerCredits } = await import('../utils/PlayerCredits.js');
                    playerCredits.reset();
                    debug('UTILITY', 'TESTING MODE: Credits reset to starting amount');

                    debug('MISSIONS', 'TESTING MODE: Fresh session initialized - NO mission pre-population');
                } else {
                    // Only pre-populate missions when NOT in testing mode
                    await this.prePopulateStationMissions();
                }
            } else {
                debug('AI', 'Mission API not available, missions will use fallback data');
            }

        } catch (error) {
            debug('P1', `Failed to initialize mission system: ${error}`);
        }
    }

    /**
     * Pre-populate all stations with appropriate missions
     */
    async prePopulateStationMissions() {
        const stations = this.getGameStations();

        debug('MISSIONS', `Pre-populating ${stations.length} stations with missions...`);

        for (const station of stations) {
            try {
                await this.ensureStationHasMissions(station);
                await this.delay(500);
            } catch (error) {
                debug('P1', `Failed to populate missions for ${station.key}: ${error}`);
            }
        }

        debug('MISSIONS', 'Station mission pre-population complete');
    }

    /**
     * Get all game stations that should have missions
     */
    getGameStations() {
        return [
            {
                key: 'terra_prime',
                name: 'Terra Prime',
                type: 'military_hub',
                faction: 'terran_republic_alliance',
                templates: ['elimination', 'escort'],
                minMissions: 3,
                maxMissions: 6
            },
            {
                key: 'europa_research_station',
                name: 'Europa Station',
                type: 'research_station',
                faction: 'scientists_consortium',
                templates: ['exploration', 'delivery'],
                minMissions: 2,
                maxMissions: 4
            },
            {
                key: 'ceres_outpost',
                name: 'Ceres Outpost',
                type: 'trade_hub',
                faction: 'traders_guild',
                templates: ['delivery', 'escort'],
                minMissions: 3,
                maxMissions: 5
            },
            {
                key: 'mars_base',
                name: 'Mars Base',
                type: 'military_base',
                faction: 'terran_republic_alliance',
                templates: ['elimination', 'escort'],
                minMissions: 2,
                maxMissions: 4
            },
            {
                key: 'luna_port',
                name: 'Luna Port',
                type: 'commercial_port',
                faction: 'traders_guild',
                templates: ['delivery', 'escort'],
                minMissions: 2,
                maxMissions: 3
            },
            {
                key: 'asteroid_mining_platform',
                name: 'Asteroid Mining Platform',
                type: 'industrial',
                faction: 'miners_union',
                templates: ['elimination', 'escort'],
                minMissions: 1,
                maxMissions: 3
            }
        ];
    }

    /**
     * Ensure a station has the right number of missions
     */
    async ensureStationHasMissions(station) {
        try {
            const currentMissions = await this.missionAPI.getAvailableMissions(station.key);
            const currentCount = currentMissions.length;

            debug('MISSIONS', `${station.name}: ${currentCount} existing missions`);

            if (currentCount < station.minMissions) {
                const missionsToGenerate = station.minMissions - currentCount;
                debug('MISSIONS', `Generating ${missionsToGenerate} missions for ${station.name}`);

                for (let i = 0; i < missionsToGenerate; i++) {
                    const template = this.selectStationTemplate(station);

                    try {
                        const result = await this.missionAPI.generateMission(template, station.key);

                        if (result.success) {
                            debug('MISSIONS', `Generated ${template} mission for ${station.name}: ${result.mission.title}`);
                        } else {
                            debug('P1', `Failed to generate ${template} for ${station.name}: ${result.error}`);
                        }

                        await this.delay(200);
                    } catch (error) {
                        debug('P1', `Error generating ${template} for ${station.name}: ${error}`);
                    }
                }
            } else {
                debug('MISSIONS', `${station.name} has sufficient missions (${currentCount}/${station.minMissions})`);
            }
        } catch (error) {
            debug('P1', `Failed to check missions for ${station.name}: ${error}`);
        }
    }

    /**
     * Select appropriate template for station
     */
    selectStationTemplate(station) {
        const templates = station.templates || ['delivery_template', 'elimination_template'];
        const weights = this.getTemplateWeights(station.type);

        const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;

        for (const template of templates) {
            const weight = weights[template] || 1;
            random -= weight;
            if (random <= 0) {
                return template;
            }
        }

        return templates[Math.floor(Math.random() * templates.length)];
    }

    /**
     * Get template weights based on station type
     */
    getTemplateWeights(stationType) {
        const weights = {
            military_hub: { 'elimination': 3, 'escort': 2 },
            research_station: { 'exploration': 3, 'delivery': 2 },
            trade_hub: { 'delivery': 3, 'escort': 2 },
            military_base: { 'elimination': 3, 'escort': 2 },
            commercial_port: { 'delivery': 3, 'escort': 2 },
            industrial: { 'elimination': 2, 'escort': 3 }
        };

        return weights[stationType] || { 'delivery': 2, 'elimination': 2, 'escort': 1 };
    }

    /**
     * Refresh missions for a specific station
     */
    async refreshStationMissions(stationKey) {
        const station = this.getGameStations().find(s => s.key === stationKey);
        if (station) {
            debug('MISSIONS', `Refreshing missions for ${station.name}...`);
            await this.ensureStationHasMissions(station);
        }
    }

    /**
     * Show mission completion screen
     */
    async showMissionComplete(missionId, completionData) {
        if (this.missionCompletionUI) {
            await this.missionCompletionUI.showMissionComplete(missionId, completionData);
            return true;
        }
        debug('P1', 'Mission completion UI not available');
        return false;
    }

    /**
     * Pause game for mission completion
     */
    pauseForMissionComplete() {
        debug('MISSIONS', 'Game paused for mission completion');
    }

    /**
     * Resume game after mission completion
     */
    resumeFromMissionComplete() {
        debug('MISSIONS', 'Game resumed from mission completion');
    }

    /**
     * Check if mission status HUD is visible
     */
    isMissionStatusVisible() {
        return this.missionStatusHUD ? this.missionStatusHUD.visible : false;
    }

    /**
     * Hide mission status HUD
     */
    hideMissionStatus() {
        if (this.missionStatusHUD) {
            this.missionStatusHUD.hide();
        }
    }

    /**
     * Show mission status HUD
     */
    showMissionStatus() {
        if (this.missionStatusHUD) {
            this.missionStatusHUD.show();
        }
    }

    /**
     * Send mission notification via Communication HUD
     */
    sendMissionNotification(npcName, message, options = {}) {
        if (this.missionNotificationHandler) {
            this.missionNotificationHandler.sendMissionNotification(npcName, message, options);
            return true;
        }
        debug('P1', 'Mission notification handler not available');
        return false;
    }

    /**
     * Send mission briefing
     */
    sendMissionBriefing(mission) {
        if (this.missionNotificationHandler) {
            this.missionNotificationHandler.sendMissionBriefing(mission);
            return true;
        }
        debug('P1', 'Mission notification handler not available');
        return false;
    }

    /**
     * Update mission system with current player data
     */
    updateMissionSystemPlayerData() {
        const ship = this.sfm.ship;
        if (!ship) return;

        const playerData = {
            level: ship.level || 1,
            credits: ship.credits || 50000,
            ship_type: ship.shipType || 'starter_ship',
            faction_standings: ship.factionStandings || {
                'terran_republic_alliance': 0,
                'traders_guild': 0,
                'scientists_consortium': 0,
                'explorers_guild': 0,
                'mercenary_fleet': 0
            }
        };

        if (this.missionAPI) {
            this.missionAPI.updatePlayerData(playerData);
        }

        if (this.missionStatusHUD) {
            this.missionStatusHUD.updatePlayerData(playerData);
        }
    }

    /**
     * Update mission system with current player location
     */
    updateMissionSystemLocation(location) {
        if (this.missionAPI) {
            this.missionAPI.setPlayerLocation(location);
        }

        if (this.missionStatusHUD) {
            this.missionStatusHUD.setPlayerLocation(location);
        }

        debug('MISSIONS', `Updated mission system location to ${location}`);
    }

    /**
     * Test mission UI systems
     */
    testMissionUI() {
        debug('UI', 'Testing mission UI systems...');

        this.updateMissionSystemPlayerData();

        if (this.missionAPI) {
            this.missionAPI.testConnection().then(connected => {
                if (connected) {
                    debug('MISSIONS', 'Mission API connection successful');
                    this.missionAPI.refreshAllMissions();
                } else {
                    debug('AI', 'Mission API not available, using mock data');
                }
            });
        }

        if (this.missionStatusHUD) {
            debug('AI', 'Mission Status HUD available - press M to test');
        }

        if (this.missionNotificationHandler) {
            this.missionNotificationHandler.testNotifications();
        }

        // Test mission completion after 20 seconds
        this.sfm._setTimeout(() => {
            if (this.missionCompletionUI) {
                debug('UI', 'Testing mission completion UI...');
                this.missionCompletionUI.testCompletion();
            }
        }, 20000);

        debug('UI', 'Mission UI test sequence started');
    }

    /**
     * Send enemy destroyed event to mission system
     */
    async sendEnemyDestroyedEvent(destroyedShip) {
        if (!this.missionEventService || !destroyedShip) return;

        try {
            const playerContext = {
                location: this.getCurrentLocation(),
                playerShip: this.sfm.ship?.shipType || 'starter_ship'
            };

            const result = await this.missionEventService.enemyDestroyed(destroyedShip, playerContext);

            if (result?.success && result.updated_missions?.length > 0) {
                debug('MISSIONS', `Enemy destruction updated ${result.updated_missions.length} missions`);

                if (this.missionStatusHUD?.visible) {
                    this.sfm._setTimeout(() => {
                        this.missionStatusHUD.refreshMissions();
                    }, 100);
                }

                for (const mission of result.updated_missions) {
                    this.showMissionProgressNotification(mission, 'enemy_destroyed');
                }
            }
        } catch (error) {
            debug('P1', `Failed to send enemy destroyed event: ${error}`);
        }
    }

    /**
     * Send location reached event to mission system
     */
    async sendLocationReachedEvent(location) {
        if (!this.missionEventService || !location) return;

        try {
            const playerContext = {
                playerShip: this.sfm.ship?.shipType || 'starter_ship'
            };

            const result = await this.missionEventService.locationReached(location, playerContext);

            if (result?.success && result.updated_missions?.length > 0) {
                debug('MISSIONS', `Location reached updated ${result.updated_missions.length} missions`);

                if (this.missionStatusHUD?.visible) {
                    this.sfm._setTimeout(() => {
                        this.missionStatusHUD.refreshMissions();
                    }, 100);
                }

                for (const mission of result.updated_missions) {
                    this.showMissionProgressNotification(mission, 'location_reached');
                }
            }
        } catch (error) {
            debug('P1', `Failed to send location reached event: ${error}`);
        }
    }

    /**
     * Show mission progress notification
     */
    showMissionProgressNotification(mission, eventType) {
        if (!this.missionNotificationHandler) return;

        const completedObjectives = mission.objectives?.filter(obj =>
            obj.status === 'ACHIEVED' || obj.status === 'COMPLETED'
        ) || [];

        if (completedObjectives.length > 0) {
            const objective = completedObjectives[0];
            const message = `Objective completed: ${objective.description}`;

            this.missionNotificationHandler.sendObjectiveUpdate(
                mission.client || 'Mission Control',
                message,
                mission
            );
        } else {
            const message = this.getMissionProgressMessage(mission, eventType);
            if (message) {
                this.missionNotificationHandler.sendMissionUpdate(
                    mission.client || 'Mission Control',
                    message,
                    mission
                );
            }
        }
    }

    /**
     * Get appropriate progress message for mission event
     */
    getMissionProgressMessage(mission, eventType) {
        const killCount = mission.custom_fields?.kills_made || 0;
        const requiredKills = mission.custom_fields?.enemy_count || 0;

        switch (eventType) {
            case 'enemy_destroyed':
                if (requiredKills > 0) {
                    return `Enemy eliminated. Progress: ${killCount}/${requiredKills}`;
                }
                return 'Enemy eliminated';
            case 'location_reached':
                return 'Location objective updated';
            default:
                return 'Mission progress updated';
        }
    }

    /**
     * Get current player location for mission events
     */
    getCurrentLocation() {
        if (this.sfm.solarSystemManager?.currentSystem) {
            return this.sfm.solarSystemManager.currentSystem.toLowerCase().replace(/\s+/g, '_');
        }

        if (this.sfm.currentTarget?.userData?.name) {
            return String(this.sfm.currentTarget.userData.name).toLowerCase().replace(/\s+/g, '_');
        }

        return 'unknown';
    }

    /**
     * Manual mission population for testing
     */
    async populateAllStations() {
        debug('UTILITY', 'Manual station population requested...');
        await this.prePopulateStationMissions();
    }

    /**
     * Get mission summary for all stations
     */
    async getMissionSummary() {
        debug('MISSIONS', 'Getting mission summary for all stations...');

        const stations = this.getGameStations();
        const summary = {};

        for (const station of stations) {
            try {
                const missions = await this.missionAPI.getAvailableMissions(station.key);
                summary[station.name] = {
                    count: missions.length,
                    missions: missions.map(m => ({ title: m.title, type: m.type }))
                };
            } catch (error) {
                summary[station.name] = { error: error.message };
            }
        }

        debug('MISSIONS', 'Mission summary:', summary);
        return summary;
    }

    /**
     * Test mission event system
     */
    async testMissionEvents() {
        debug('MISSIONS', 'Testing mission event system...');

        if (!this.missionEventService) {
            debug('P1', 'MissionEventService not available');
            return;
        }

        debug('UTILITY', 'Testing enemy destroyed event...');
        const result = await this.missionEventService.testEnemyDestroyed();
        debug('UTILITY', 'Enemy destroyed test result:', result);

        debug('UTILITY', 'Testing location reached event...');
        const locationResult = await this.missionEventService.locationReached('terra_prime', {
            playerShip: 'starter_ship'
        });
        debug('UTILITY', 'Location reached test result:', locationResult);

        return { enemyDestroyed: result, locationReached: locationResult };
    }

    /**
     * Clear all active missions
     */
    async clearActiveMissions() {
        debug('MISSIONS', 'Clearing all active missions...');

        try {
            const result = await this.missionAPI.clearActiveMissions();

            if (result.success) {
                debug('MISSIONS', `Successfully cleared ${result.cleared_count} active missions`);

                if (this.missionStatusHUD?.visible) {
                    this.missionStatusHUD.refreshMissions();
                    debug('UI', 'Mission Status HUD refreshed after clearing');
                }

                this.sfm.showHUDMessage(
                    'MISSIONS CLEARED',
                    `${result.cleared_count} active missions cleared`
                );
            } else {
                debug('P1', `Failed to clear active missions: ${result.error}`);
                this.sfm.showHUDEphemeral('CLEAR FAILED', result.error || 'Unknown error');
            }

            return result;
        } catch (error) {
            debug('P1', `Failed to clear active missions: ${error}`);
            this.sfm.showHUDEphemeral('CLEAR FAILED', 'Connection error');
            return { success: false, error: error.message };
        }
    }

    /**
     * Simple delay utility
     */
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Dispose of resources
     */
    dispose() {
        if (this.missionStatusHUD) {
            this.missionStatusHUD = null;
        }
        if (this.missionCompletionUI) {
            this.missionCompletionUI = null;
        }
        if (this.missionNotificationHandler) {
            this.missionNotificationHandler = null;
        }
        if (this.missionEventHandler) {
            this.missionEventHandler = null;
        }
        if (this.missionAPI) {
            this.missionAPI = null;
        }
        if (this.missionEventService) {
            this.missionEventService = null;
        }

        window.missionAPI = null;
        window.missionEventHandler = null;

        debug('MISSIONS', 'MissionSystemCoordinator disposed');
    }
}
