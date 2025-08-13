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
        console.log('📢 MissionNotificationHandler: Initialized');
        
        // Make globally accessible for testing
        window.missionNotificationHandler = this;
    }
    
    /**
     * Set mission manager when available
     */
    setMissionManager(missionManager) {
        this.missionManager = missionManager;
        this.attachMissionManagerEvents();
        console.log('📢 MissionNotificationHandler: Mission manager attached');
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
        
        console.log('📢 MissionNotificationHandler: Event listeners ready and connected to mission API');
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
        
        this.commHUD.showMessage(
            this.getMissionGiver(mission) || 'Mission Control',
            `Objective completed: ${objective.description}`,
            {
                channel: settings.channel,
                status: settings.status,
                duration: settings.duration,
                signalStrength: '████████▓'
            }
        );
        
        console.log(`📢 Objective completed: ${objective.description}`);
    }
    
    /**
     * Handle mission completion notification
     */
    onMissionComplete(mission) {
        const settings = this.notificationSettings.missionComplete;
        
        this.commHUD.showMessage(
            this.getMissionGiver(mission) || 'Mission Control',
            `Mission complete: ${mission.title}`,
            {
                channel: settings.channel,
                status: settings.status,
                duration: settings.duration,
                signalStrength: '█████████'
            }
        );
        
        console.log(`📢 Mission completed: ${mission.title}`);
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
        
        console.log(`📢 Mission failed: ${mission.title}`);
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
        
        console.log(`📢 Mission accepted: ${mission.title}`);
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
        
        console.log(`📢 Objective failed: ${objective.description}`);
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
        console.log(`📢 Custom notification: ${message}`);
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
        
        console.log(`📢 Mission briefing sent: ${mission.title}`);
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
        
        console.log(`📢 Mission update: ${updateText}`);
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
        
        console.log(`📢 Progress notification: ${progressText}`);
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
        
        console.log(`📢 Urgent alert: ${alertText}`);
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
        console.log('📢 Testing mission notifications...');
        
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
        
        console.log('📢 Test notifications scheduled');
    }
    
    /**
     * Test failure notifications
     */
    testFailureNotifications() {
        console.log('📢 Testing failure notifications...');
        
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
        
        console.log('📢 Failure test notifications scheduled');
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
        console.log('📢 Notification settings updated');
    }
}
