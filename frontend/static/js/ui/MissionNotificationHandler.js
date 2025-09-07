import { debug } from '../debug.js';

/**
 * MissionNotificationHandler - Integration with Communication HUD for mission updates
 * Handles mission-related notifications and communication events
 */

import { MissionAPIService } from '../services/MissionAPIService.js';

export class MissionNotificationHandler {
    constructor(communicationHUD, starfieldManager) {
        this.commHUD = communicationHUD;
        this.starfieldManager = starfieldManager;
        this.missionManager = null; // To be set when mission manager is available
        this.missionAPI = new MissionAPIService();
        
        // Notification settings
        this.notificationSettings = {
            objectiveComplete: {
                duration: 4000,
                channel: 'MISSION.1',
                status: '■ UPDATE'
            },
            missionComplete: {
                duration: 6000,
                channel: 'MISSION.1',
                status: '■ SUCCESS'
            },
            missionFailed: {
                duration: 5000,
                channel: 'MISSION.1',
                status: '■ FAILED'
            },
            missionAccepted: {
                duration: 5000,
                channel: 'MISSION.1',
                status: '■ NEW'
            },
            objectiveFailed: {
                duration: 4000,
                channel: 'MISSION.1',
                status: '■ ALERT'
            }
        };
        
        this.initialize();
    }
    
    initialize() {
        this.setupEventListeners();
debug('MISSIONS', '📢 MissionNotificationHandler: Initialized');
        
        // Make globally accessible for testing
        window.missionNotificationHandler = this;
    }
    
    /**
     * Set mission manager when available
     */
    setMissionManager(missionManager) {
        this.missionManager = missionManager;
        this.attachMissionManagerEvents();
debug('MISSIONS', '📢 MissionNotificationHandler: Mission manager attached');
    }
    
    /**
     * Setup event listeners for mission events
     */
    setupEventListeners() {
        // Connect to mission API events
        this.missionAPI.addEventListener('missionAccepted', (data) => {
            this.onMissionAccepted(data.mission);
        });
        
        this.missionAPI.addEventListener('missionCompleted', (data) => {
            this.onMissionComplete(data.mission);
        });
        
        this.missionAPI.addEventListener('missionFailed', (data) => {
            this.onMissionFailed(data.mission, data.reason);
        });
        
        this.missionAPI.addEventListener('objectiveCompleted', (data) => {
            this.onObjectiveComplete(data.objective, data.mission);
        });
        
debug('MISSIONS', '📢 MissionNotificationHandler: Event listeners ready and connected to mission API');
    }
    
    /**
     * Attach to mission manager events (when available)
     */
    attachMissionManagerEvents() {
        if (!this.missionManager) return;
        
        // Example event bindings (adjust based on actual mission manager API)
        if (typeof this.missionManager.on === 'function') {
            this.missionManager.on('objectiveCompleted', this.onObjectiveComplete.bind(this));
            this.missionManager.on('missionCompleted', this.onMissionComplete.bind(this));
            this.missionManager.on('missionFailed', this.onMissionFailed.bind(this));
            this.missionManager.on('missionAccepted', this.onMissionAccepted.bind(this));
            this.missionManager.on('objectiveFailed', this.onObjectiveFailed.bind(this));
        }
    }
    
    /**
     * Handle objective completion notification
     */
    onObjectiveComplete(objective, mission) {
        const settings = this.notificationSettings.objectiveComplete;
        
        // Get contextual message based on objective type
        const { npcName, message } = this.createObjectiveCompletionMessage(objective, mission);
        
        // Check if this is a delivery objective to trigger delivery audio
        const isDeliveryObjective = objective.type === 'deliver_cargo' || 
                                   (objective.description && objective.description.toLowerCase().includes('deliver'));
        
        // Check if this is a delivery mission (for context)
        const isDeliveryMission = mission.type === 'delivery' || 
                                 (mission.title && mission.title.toLowerCase().includes('delivery'));
        
        const showMessageOptions = {
            channel: settings.channel,
            status: settings.status,
            duration: settings.duration,
            signalStrength: '████████▓'
        };
        
        // If this is a delivery objective completion on a delivery mission, trigger delivery audio
        if (isDeliveryObjective && isDeliveryMission) {
debug('UI', `📢 Delivery objective completed - triggering delivery audio`);
            showMessageOptions.isDeliveryComplete = true;
        }
        
        this.commHUD.showMessage(
            npcName,
            message,
            showMessageOptions
        );
        
debug('UI', `📢 Objective completed: ${objective.description}`);
    }
    
    /**
     * Handle mission completion notification
     */
    onMissionComplete(mission) {
        const settings = this.notificationSettings.missionComplete;
        
        // Get contextual message based on mission type and destination
        const { npcName, message } = this.createMissionCompletionMessage(mission);
        
        // Check if this is a delivery mission to trigger audio
        const isDeliveryMission = mission.type === 'delivery' || 
                                 (mission.title && mission.title.toLowerCase().includes('delivery')) ||
                                 (mission.objectives && mission.objectives.some(obj => 
                                     obj.type === 'deliver_cargo' || 
                                     (obj.description && obj.description.toLowerCase().includes('deliver'))
                                 ));
        
        this.commHUD.showMessage(
            npcName,
            message,
            {
                channel: settings.channel,
                status: settings.status,
                duration: settings.duration,
                signalStrength: '█████████',
                isDeliveryComplete: isDeliveryMission
            }
        );
        
debug('MISSIONS', `📢 Mission completed: ${mission.title}${isDeliveryMission ? ' (Delivery mission - playing audio)' : ''}`);
    }
    
    /**
     * Handle mission failure notification
     */
    onMissionFailed(mission, reason) {
        const settings = this.notificationSettings.missionFailed;
        
        this.commHUD.showMessage(
            this.getMissionGiver(mission) || 'Mission Control',
            `Mission failed: ${mission.title}${reason ? ` - ${reason}` : ''}`,
            {
                channel: settings.channel,
                status: settings.status,
                duration: settings.duration,
                signalStrength: '██▓░░░░░░'
            }
        );
        
debug('P1', `📢 Mission failed: ${mission.title}`);
    }
    
    /**
     * Handle mission acceptance notification
     */
    onMissionAccepted(mission) {
        const settings = this.notificationSettings.missionAccepted;
        
        this.commHUD.showMessage(
            this.getMissionGiver(mission) || 'Mission Control',
            `New mission accepted: ${mission.title}`,
            {
                channel: settings.channel,
                status: settings.status,
                duration: settings.duration,
                signalStrength: '████████░'
            }
        );
        
debug('MISSIONS', `📢 Mission accepted: ${mission.title}`);
    }
    
    /**
     * Handle objective failure notification
     */
    onObjectiveFailed(objective, mission) {
        const settings = this.notificationSettings.objectiveFailed;
        
        this.commHUD.showMessage(
            this.getMissionGiver(mission) || 'Mission Control',
            `Objective failed: ${objective.description}`,
            {
                channel: settings.channel,
                status: settings.status,
                duration: settings.duration,
                signalStrength: '███▓░░░░░'
            }
        );
        
debug('P1', `📢 Objective failed: ${objective.description}`);
    }
    
    /**
     * Send custom mission notification
     */
    sendMissionNotification(npcName, message, options = {}) {
        const defaultOptions = {
            channel: 'MISSION.1',
            status: '■ INFO',
            duration: 4000,
            signalStrength: '████████░'
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        this.commHUD.showMessage(npcName, message, finalOptions);
debug('UI', `📢 Custom notification: ${message}`);
    }
    
    /**
     * Send mission briefing
     */
    sendMissionBriefing(mission) {
        const giver = this.getMissionGiver(mission);
        
        this.commHUD.showMessage(
            giver || 'Mission Control',
            `Mission briefing: ${mission.description || mission.title}`,
            {
                channel: 'BRIEFING.1',
                status: '■ BRIEF',
                duration: 8000,
                signalStrength: '█████████'
            }
        );
        
debug('MISSIONS', `📢 Mission briefing sent: ${mission.title}`);
    }
    
    /**
     * Send mission update
     */
    sendMissionUpdate(mission, updateText) {
        const giver = this.getMissionGiver(mission);
        
        this.commHUD.showMessage(
            giver || 'Mission Control',
            updateText,
            {
                channel: 'MISSION.1',
                status: '■ UPDATE',
                duration: 5000,
                signalStrength: '████████▓'
            }
        );
        
debug('MISSIONS', `📢 Mission update: ${updateText}`);
    }
    
    /**
     * Send progress notification
     */
    sendProgressNotification(mission, progressText) {
        const giver = this.getMissionGiver(mission);
        
        this.commHUD.showMessage(
            giver || 'Mission Control',
            progressText,
            {
                channel: 'MISSION.1',
                status: '■ PROGRESS',
                duration: 3000,
                signalStrength: '███████▓░'
            }
        );
        
debug('UI', `📢 Progress notification: ${progressText}`);
    }
    
    /**
     * Send urgent mission alert
     */
    sendUrgentAlert(mission, alertText) {
        const giver = this.getMissionGiver(mission);
        
        this.commHUD.showMessage(
            giver || 'Mission Control',
            alertText,
            {
                channel: 'EMERGENCY',
                status: '■ URGENT',
                duration: 7000,
                signalStrength: '█████████'
            }
        );
        
debug('UI', `📢 Urgent alert: ${alertText}`);
    }
    
    /**
     * Station NPC mapping for personalized communications
     */
    getStationNPCs() {
        return {
            // Terran Republic Alliance stations
            'terra_prime': {
                commander: 'Director Lisa Park',
                title: 'Earth Orbital Command',
                faction: 'Terran Republic Alliance'
            },
            'luna_station': {
                commander: 'Admiral Sarah Chen',
                title: 'Luna Station Command',
                faction: 'Terran Republic Alliance'
            },
            'europa_station': {
                commander: 'Ambassador Elena Rodriguez',
                title: 'Europa Diplomatic Hub',
                faction: 'Terran Republic Alliance'
            },
            'europa_research_station': {
                commander: 'Dr. Marcus Webb',
                title: 'Europa Research Division',
                faction: 'Terran Republic Alliance'
            },
            'ceres_outpost': {
                commander: 'Dr. Marcus Webb',
                title: 'Ceres Research Lab',
                faction: 'Terran Republic Alliance'
            },
            'mars_base': {
                commander: 'Captain James Sullivan',
                title: 'Mars Orbital Defense',
                faction: 'Terran Republic Alliance'
            },
            'mars_orbital': {
                commander: 'Captain James Sullivan',
                title: 'Mars Orbital Command',
                faction: 'Terran Republic Alliance'
            },
            
            // Free Trader Consortium stations
            'freeport_prime': {
                commander: 'Guildmaster Korvak Steelhand',
                title: 'Freeport Prime Trade Authority',
                faction: 'Free Trader Consortium'
            },
            'merchants_paradise_station': {
                commander: 'Trade Baron Viktor Thorne',
                title: 'Merchant\'s Paradise Station',
                faction: 'Free Trader Consortium'
            },
            
            // Nexus Corporate Syndicate stations
            'corporate_headquarters': {
                commander: 'Executive Director Yuki Tanaka',
                title: 'Nexus Corporate HQ',
                faction: 'Nexus Corporate Syndicate'
            },
            'innovation_labs': {
                commander: 'Dr. Alex Morrison',
                title: 'Nexus Innovation Labs',
                faction: 'Nexus Corporate Syndicate'
            },
            
            // Zephyrian Collective stations
            'crystal_haven_station': {
                commander: 'Resonance Speaker Zyx\'thala',
                title: 'Crystal Haven Station',
                faction: 'Zephyrian Collective'
            },
            'ancient_archive': {
                commander: 'Keeper Vel\'nara',
                title: 'Ancient Archive',
                faction: 'Zephyrian Collective'
            },
            
            // Default fallback
            'default': {
                commander: 'Station Commander',
                title: 'Station Operations',
                faction: 'Local Authority'
            }
        };
    }

    /**
     * Get appropriate NPC for a station
     */
    getStationNPC(stationKey) {
        const npcs = this.getStationNPCs();
        const normalizedKey = stationKey ? stationKey.toLowerCase().replace(/\s+/g, '_') : null;
        return npcs[normalizedKey] || npcs['default'];
    }

    /**
     * Create personalized objective completion message
     */
    createObjectiveCompletionMessage(objective, mission) {
        const objDesc = objective.description || '';
        
        // Detect objective type from description
        const lowerDesc = objDesc.toLowerCase();
        
        // Check for cargo loading - look for "load" and either "cargo" or "units of"
        if (lowerDesc.includes('load') && (lowerDesc.includes('cargo') || lowerDesc.includes('units of'))) {
            // Cargo loading objective
            const cargoType = mission.custom_fields?.cargo_type || 'cargo';
            const quantity = mission.custom_fields?.cargo_amount || 'specified amount of';
            
            // Safety check for undefined values
            const safeCargoType = cargoType === undefined || cargoType === null ? 'cargo' : cargoType;
            const safeQuantity = quantity === undefined || quantity === null ? 'specified amount of' : quantity;
            
            return {
                npcName: 'Cargo Coordinator',
                message: `Cargo manifest confirmed. ${safeQuantity} units of ${safeCargoType} loaded and secured for transport.`
            };
        } else if (lowerDesc.includes('deliver') && (lowerDesc.includes('cargo') || mission.mission_type === 'delivery')) {
            // Cargo delivery objective - always use Capt. Cooper with consistent message
            return {
                npcName: 'Capt. Cooper',
                message: 'Delivery confirmed. Medical supplies received and accounted for. Thank you for your service.'
            };
        } else if (objDesc.toLowerCase().includes('eliminate') || objDesc.toLowerCase().includes('destroy')) {
            // Combat objective
            return {
                npcName: 'Tactical Command',
                message: `Target eliminated. Excellent work, pilot. Return to base for debrief.`
            };
        } else if (objDesc.toLowerCase().includes('escort') || objDesc.toLowerCase().includes('protect')) {
            // Escort objective
            return {
                npcName: 'Fleet Command',
                message: `Escort objective complete. All assets secure. Well done, commander.`
            };
        }
        
        // Fallback for unknown objective types
        return {
            npcName: this.getMissionGiver(mission) || 'Mission Control',
            message: `Objective completed: ${objDesc}`
        };
    }

    /**
     * Create personalized mission completion message
     */
    createMissionCompletionMessage(mission) {
        const missionType = mission.mission_type || '';
        const title = mission.title || 'Unknown Mission';
        
        if (missionType === 'delivery') {
            // Delivery mission completion - always use Capt. Cooper with consistent message
            return {
                npcName: 'Capt. Cooper',
                message: 'Delivery confirmed. Medical supplies received and accounted for. Thank you for your service.'
            };
            
        } else if (missionType === 'elimination') {
            // Combat mission completion
            return {
                npcName: 'Admiral Sarah Chen',
                message: `Combat mission successful. Hostile threats neutralized. Return to base for debriefing and reward distribution.`
            };
            
        } else if (missionType === 'escort') {
            // Escort mission completion
            return {
                npcName: 'Fleet Command',
                message: `Escort mission complete. All convoy assets arrived safely. Your protection was invaluable.`
            };
            
        } else if (missionType === 'exploration') {
            // Exploration mission completion
            return {
                npcName: 'Dr. Marcus Webb',
                message: `Fascinating discoveries! Your exploration data will advance our understanding significantly.`
            };
        }
        
        // Fallback for unknown mission types
        return {
            npcName: this.getMissionGiver(mission) || 'Mission Control',
            message: `Mission "${title}" completed successfully. Thank you for your service.`
        };
    }

    /**
     * Get mission giver name
     */
    getMissionGiver(mission) {
        if (!mission) return null;
        
        // Try different possible properties for mission giver
        return mission.giver || mission.client || mission.issuer || mission.contact;
    }
    
    /**
     * Test notification system with mock data
     */
    testNotifications() {
debug('MISSIONS', '📢 Testing mission notifications...');
        
        const mockMission = {
            id: 'test_mission',
            title: 'Test Mission',
            giver: 'Admiral Chen',
            description: 'This is a test mission for notification system'
        };
        
        const mockObjective = {
            id: 'test_objective',
            description: 'Destroy enemy fighters'
        };
        
        // Test sequence with delays
        setTimeout(() => {
            this.onMissionAccepted(mockMission);
        }, 1000);
        
        setTimeout(() => {
            this.sendMissionBriefing(mockMission);
        }, 3000);
        
        setTimeout(() => {
            this.sendProgressNotification(mockMission, 'Enemy squadron located in sector 7');
        }, 6000);
        
        setTimeout(() => {
            this.onObjectiveComplete(mockObjective, mockMission);
        }, 9000);
        
        setTimeout(() => {
            this.sendMissionUpdate(mockMission, 'Proceed to extraction point');
        }, 12000);
        
        setTimeout(() => {
            this.onMissionComplete(mockMission);
        }, 15000);
        
debug('UI', '📢 Test notifications scheduled');
    }
    
    /**
     * Test failure notifications
     */
    testFailureNotifications() {
debug('AI', '📢 Testing failure notifications...');
        
        const mockMission = {
            id: 'test_mission_fail',
            title: 'Failed Test Mission',
            giver: 'Commander Torres'
        };
        
        const mockObjective = {
            id: 'test_objective_fail',
            description: 'Protect convoy'
        };
        
        setTimeout(() => {
            this.sendUrgentAlert(mockMission, 'Multiple enemy contacts detected!');
        }, 1000);
        
        setTimeout(() => {
            this.onObjectiveFailed(mockObjective, mockMission);
        }, 4000);
        
        setTimeout(() => {
            this.onMissionFailed(mockMission, 'Time limit exceeded');
        }, 7000);
        
debug('AI', '📢 Failure test notifications scheduled');
    }
    
    /**
     * Get notification settings
     */
    getNotificationSettings() {
        return { ...this.notificationSettings };
    }
    
    /**
     * Update notification settings
     */
    updateNotificationSettings(settings) {
        this.notificationSettings = { ...this.notificationSettings, ...settings };
debug('UTILITY', '📢 Notification settings updated');
    }
}
