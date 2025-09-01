/**
 * MissionStatusHUD - In-game mission tracking interface
 * Positioned in upper-right corner, toggled with M key
 * Shows active missions and objectives with real-time updates
 */

import { MissionAPIService } from '../services/MissionAPIService.js';

export class MissionStatusHUD {
    constructor(starfieldManager, missionManager) {
        this.starfieldManager = starfieldManager;
        this.missionManager = missionManager;
        this.isVisible = false;
        this.activeMissions = [];
        this.updateInterval = null;
        
        // Initialize Mission API Service
        this.missionAPI = new MissionAPIService();
        
        // UI components
        this.hudContainer = null;
        this.missionPanels = new Map();
        this.lastUpdateTime = 0;
        
        // Update frequency (2Hz = every 500ms)
        this.updateFrequency = 500;
        
        this.initialize();
    }
    
    initialize() {
        this.createHUDContainer();
        this.setupEventListeners();
        console.log('🎯 MissionStatusHUD: Initialized');
        
        // Make globally accessible for testing
        window.missionStatusHUD = this;
    }
    
    /**
     * Create the main HUD container with positioning and styling
     */
    createHUDContainer() {
        this.hudContainer = document.createElement('div');
        this.hudContainer.className = 'mission-status-hud';
        this.hudContainer.style.cssText = `
            position: fixed;
            top: 120px;
            right: 15px;
            width: 320px;
            max-height: 400px;
            background: rgba(0, 0, 0, 0.85);
            border: 2px solid #00ff41;
            border-radius: 4px;
            font-family: 'VT323', monospace;
            color: #00ff41;
            padding: 15px;
            box-shadow: 
                0 0 20px rgba(0, 255, 65, 0.3),
                inset 0 0 20px rgba(0, 255, 65, 0.1);
            z-index: 1001;
            display: none;
            user-select: none;
            backdrop-filter: blur(2px);
            overflow-y: auto;
        `;
        
        this.createHeader();
        this.createContent();
        
        document.body.appendChild(this.hudContainer);
        console.log('🎯 MissionStatusHUD: Container created');
    }
    
    /**
     * Create header with title and close button
     */
    createHeader() {
        this.headerArea = document.createElement('div');
        this.headerArea.className = 'mission-header';
        this.headerArea.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #00ff41;
        `;
        
        // Title
        const title = document.createElement('div');
        title.style.cssText = `
            font-size: 20px;
            font-weight: bold;
            color: #00ff41;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        title.innerHTML = '◉ MISSION STATUS';
        
        // Close button
        const closeButton = document.createElement('div');
        closeButton.style.cssText = `
            color: #ffffff;
            cursor: pointer;
            font-size: 16px;
            padding: 4px 8px;
            border: 1px solid #00ff41;
            border-radius: 3px;
            background: rgba(0, 255, 65, 0.1);
            transition: all 0.2s ease;
        `;
        closeButton.textContent = '[M] CLOSE';
        closeButton.addEventListener('click', () => this.toggle());
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.background = 'rgba(0, 255, 65, 0.3)';
        });
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.background = 'rgba(0, 255, 65, 0.1)';
        });
        
        this.headerArea.appendChild(title);
        this.headerArea.appendChild(closeButton);
        this.hudContainer.appendChild(this.headerArea);
    }
    
    /**
     * Create content area for mission panels
     */
    createContent() {
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'mission-content';
        this.contentArea.style.cssText = `
            max-height: 320px;
            overflow-y: auto;
        `;
        
        // Initially show no missions message
        this.showNoMissionsMessage();
        
        this.hudContainer.appendChild(this.contentArea);
    }
    
    /**
     * Show message when no active missions
     */
    showNoMissionsMessage() {
        this.contentArea.innerHTML = `
            <div style="
                text-align: center;
                color: #888888;
                font-size: 16px;
                padding: 20px;
                font-style: italic;
            ">
                No active missions<br>
                <span style="font-size: 14px; margin-top: 10px; display: block;">
                    Visit a station's Mission Board to accept missions
                </span>
            </div>
        `;
    }
    
    /**
     * Show the HUD
     */
    show() {
        if (!this.isVisible) {
            this.isVisible = true;
            this.hudContainer.style.display = 'block';
            console.log('🎯 MissionStatusHUD: Shown');
            
            // Start periodic updates
            this.startUpdates();
            // Initial load of missions
            this.refreshMissions();
        }
        return true;
    }
    
    /**
     * Hide the HUD
     */
    hide() {
        if (this.isVisible) {
            this.isVisible = false;
            this.hudContainer.style.display = 'none';
            console.log('🎯 MissionStatusHUD: Hidden');
            
            // Stop updates
            this.stopUpdates();
        }
        return true;
    }
    
    /**
     * Toggle HUD visibility
     */
    toggle() {
        this.isVisible = !this.isVisible;
        this.hudContainer.style.display = this.isVisible ? 'block' : 'none';
        
        console.log(`🎯 MissionStatusHUD: ${this.isVisible ? 'Enabled' : 'Disabled'}`);
        
        if (this.isVisible) {
            // Start periodic updates
            this.startUpdates();
            // Initial load of missions
            this.refreshMissions();
        } else {
            // Stop updates
            this.stopUpdates();
        }
        
        return true;
    }
    
    /**
     * Start periodic mission updates
     */
    startUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        this.updateInterval = setInterval(() => {
            this.updateMissionStatus();
        }, this.updateFrequency);
        
        console.log('🎯 MissionStatusHUD: Started periodic updates');
    }
    
    /**
     * Stop periodic updates
     */
    stopUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        console.log('🎯 MissionStatusHUD: Stopped periodic updates');
    }
    
    /**
     * Refresh missions from mission API
     */
    async refreshMissions() {
        try {
            // Get active missions from API
            this.activeMissions = await this.missionAPI.getActiveMissions();
            
            // Process missions for UI display
            this.activeMissions = this.activeMissions.map(mission => this.processMissionForUI(mission));
            
            this.renderMissions();
            console.log(`🎯 MissionStatusHUD: Refreshed ${this.activeMissions.length} active missions`);
        } catch (error) {
            console.error('🎯 MissionStatusHUD: Error refreshing missions:', error);
            this.showErrorMessage('Failed to load missions');
            
            // Fallback to mock data for testing
            console.log('🎯 MissionStatusHUD: Using mock data as fallback');
            this.activeMissions = this.getMockMissions();
            this.renderMissions();
        }
    }
    
    /**
     * Update missions data directly with provided mission objects
     * This avoids race conditions with API calls when we already have fresh data
     */
    updateMissionsData(updatedMissions) {
        try {
            // Process and display the updated missions directly
            
            // Process missions for UI display
            this.activeMissions = updatedMissions.map(mission => this.processMissionForUI(mission));
            
            this.renderMissions();
            console.log(`🎯 MissionStatusHUD: Updated with ${this.activeMissions.length} missions directly`);
        } catch (error) {
            console.error('🎯 MissionStatusHUD: Error updating missions data:', error);
            // Fallback to refresh if direct update fails
            this.refreshMissions();
        }
    }

    /**
     * Update mission status (called periodically)
     */
    updateMissionStatus() {
        if (!this.isVisible) return;
        
        // Update mission progress, timers, distances, etc.
        this.activeMissions.forEach(mission => {
            this.updateMissionPanel(mission);
        });
    }
    
    /**
     * Render all active missions
     */
    renderMissions() {
        this.contentArea.innerHTML = '';
        this.missionPanels.clear();
        
        if (this.activeMissions.length === 0) {
            this.showNoMissionsMessage();
            return;
        }
        
        this.activeMissions.forEach((mission, index) => {
            const panel = this.createMissionPanel(mission, index);
            this.contentArea.appendChild(panel);
            this.missionPanels.set(mission.id, panel);
        });
    }
    
    /**
     * Create individual mission panel
     */
    createMissionPanel(mission, index) {
        const panel = document.createElement('div');
        panel.className = 'mission-panel';
        panel.style.cssText = `
            background: rgba(0, 40, 0, 0.3);
            border: 1px solid #00ff41;
            border-radius: 4px;
            padding: 12px;
            margin-bottom: 10px;
            transition: all 0.3s ease;
        `;
        
        // Panel header with mission title and expand/collapse
        const header = this.createMissionHeader(mission, index);
        panel.appendChild(header);
        
        // Mission details (collapsible)
        const details = this.createMissionDetails(mission);
        panel.appendChild(details);
        
        // Add hover effects
        panel.addEventListener('mouseenter', () => {
            panel.style.background = 'rgba(0, 60, 0, 0.4)';
        });
        panel.addEventListener('mouseleave', () => {
            panel.style.background = 'rgba(0, 40, 0, 0.3)';
        });
        
        return panel;
    }
    
    /**
     * Create mission header with title and expand/collapse
     */
    createMissionHeader(mission, index) {
        const header = document.createElement('div');
        header.className = 'mission-header-panel';
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            margin-bottom: 10px;
        `;
        
        // Expand/collapse icon and title
        const titleSection = document.createElement('div');
        titleSection.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
        `;
        
        const expandIcon = document.createElement('span');
        expandIcon.textContent = mission.expanded ? '▼' : '▲';
        expandIcon.style.cssText = `
            color: #00ff41;
            font-size: 12px;
            transition: transform 0.2s ease;
        `;
        
        const title = document.createElement('span');
        title.style.cssText = `
            color: #ffffff;
            font-size: 16px;
            font-weight: bold;
        `;
        title.textContent = mission.title;
        
        titleSection.appendChild(expandIcon);
        titleSection.appendChild(title);
        
        // Mission progress indicator
        const progress = document.createElement('div');
        progress.style.cssText = `
            color: #ffff44;
            font-size: 14px;
        `;
        progress.textContent = this.getMissionProgress(mission);
        
        header.appendChild(titleSection);
        header.appendChild(progress);
        
        // Toggle expand/collapse on click
        header.addEventListener('click', () => {
            mission.expanded = !mission.expanded;
            expandIcon.textContent = mission.expanded ? '▼' : '▲';
            const details = header.nextElementSibling;
            details.style.display = mission.expanded ? 'block' : 'none';
        });
        
        return header;
    }
    
    /**
     * Create mission details section
     */
    createMissionDetails(mission) {
        const details = document.createElement('div');
        details.className = 'mission-details';
        details.style.cssText = `
            display: ${mission.expanded ? 'block' : 'none'};
            padding-left: 20px;
        `;
        
        // Mission info
        const info = document.createElement('div');
        info.style.cssText = `
            margin-bottom: 10px;
            font-size: 14px;
            color: #cccccc;
        `;
        info.innerHTML = `
            Client: ${mission.client}<br>
            ${mission.location ? `Location: ${mission.location}<br>` : ''}
            ${mission.timeRemaining ? `Time Remaining: ${mission.timeRemaining}` : ''}
        `;
        details.appendChild(info);
        
        // Objectives
        const objectivesTitle = document.createElement('div');
        objectivesTitle.style.cssText = `
            color: #00ff41;
            font-size: 15px;
            font-weight: bold;
            margin-bottom: 8px;
        `;
        objectivesTitle.textContent = 'OBJECTIVES:';
        details.appendChild(objectivesTitle);
        
        // Objective list
        const objectiveList = document.createElement('div');
        objectiveList.style.cssText = `
            margin-left: 10px;
        `;
        
        mission.objectives.forEach(objective => {
            const objElement = this.createObjectiveElement(objective);
            objectiveList.appendChild(objElement);
        });
        
        details.appendChild(objectiveList);
        
        return details;
    }
    
    /**
     * Create individual objective element
     */
    createObjectiveElement(objective) {
        // Normalize objective data from backend format
        const normalizedObjective = this.normalizeObjective(objective);
        
        const objElement = document.createElement('div');
        objElement.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
            font-size: 14px;
        `;
        
        // Icon and description
        const description = document.createElement('div');
        description.style.cssText = `
            display: flex;
            align-items: center;
            gap: 6px;
            flex: 1;
        `;
        
        const icon = this.getObjectiveIcon(normalizedObjective.status);
        const iconSpan = document.createElement('span');
        iconSpan.textContent = icon.symbol;
        iconSpan.style.color = icon.color;
        
        const descText = document.createElement('span');
        descText.textContent = normalizedObjective.description;
        descText.style.color = normalizedObjective.isOptional ? '#00aaff' : '#ffffff';
        
        description.appendChild(iconSpan);
        description.appendChild(descText);
        
        // Status
        const status = document.createElement('div');
        status.style.cssText = `
            color: ${icon.color};
            font-size: 13px;
            text-transform: uppercase;
        `;
        status.textContent = this.getObjectiveStatus(normalizedObjective);
        
        objElement.appendChild(description);
        objElement.appendChild(status);
        
        return objElement;
    }
    
    /**
     * Get objective icon and color based on status
     */
    getObjectiveIcon(status) {
        const icons = {
            COMPLETED: { symbol: '✓', color: '#00ff41' },
            ACTIVE: { symbol: '●', color: '#ffff44' },
            PENDING: { symbol: '○', color: '#888888' },
            FAILED: { symbol: '✗', color: '#ff4444' },
            OPTIONAL: { symbol: '◇', color: '#00aaff' },
            LOCKED: { symbol: '🔒', color: '#666666' }
        };
        
        return icons[status] || icons.PENDING;
    }
    
    /**
     * Convert backend objective data to frontend format
     */
    normalizeObjective(objective) {
        // Convert backend format to frontend format with robust coercion
        const achieved = (objective.is_achieved === true)
            || (objective.status === 'COMPLETED')
            || (typeof objective.progress === 'number' && objective.progress >= 1);
        const status = achieved ? 'COMPLETED' : (objective.status || 'PENDING');
        
        // Silence noisy logging in production. If needed, add gated debug here.
        
        return {
            ...objective,
            status: status,
            isOptional: objective.is_optional || false
        };
    }
    
    /**
     * Get objective status text
     */
    getObjectiveStatus(objective) {
        if (objective.status === 'COMPLETED') return '[COMPLETE]';
        if (objective.status === 'ACTIVE' && objective.progress) return `[${objective.progress}]`;
        if (objective.status === 'FAILED') return '[FAILED]';
        if (objective.isOptional) return '[BONUS]';
        return '[PENDING]';
    }
    
    /**
     * Get mission progress summary
     */
    getMissionProgress(mission) {
        const normalizedObjectives = mission.objectives.map(obj => this.normalizeObjective(obj));
        const completed = normalizedObjectives.filter(obj => obj.status === 'COMPLETED').length;
        const total = normalizedObjectives.filter(obj => !obj.isOptional).length;
        return `${completed}/${total}`;
    }
    
    /**
     * Update individual mission panel
     */
    updateMissionPanel(mission) {
        const panel = this.missionPanels.get(mission.id);
        if (!panel) return;
        
        // Update time remaining if applicable
        if (mission.timeRemaining) {
            // Simulate countdown (in real implementation, this would come from mission manager)
            const parts = mission.timeRemaining.split(':');
            let minutes = parseInt(parts[0]);
            let seconds = parseInt(parts[1]);
            
            seconds--;
            if (seconds < 0) {
                seconds = 59;
                minutes--;
            }
            
            if (minutes >= 0) {
                mission.timeRemaining = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
        }
        
        // Re-render the panel with updated data
        const newPanel = this.createMissionPanel(mission, Array.from(this.missionPanels.keys()).indexOf(mission.id));
        panel.replaceWith(newPanel);
        this.missionPanels.set(mission.id, newPanel);
    }
    
    /**
     * Show error message
     */
    showErrorMessage(message) {
        this.contentArea.innerHTML = `
            <div style="
                text-align: center;
                color: #ff4444;
                font-size: 14px;
                padding: 20px;
            ">
                Error: ${message}
            </div>
        `;
    }
    
    /**
     * Process mission data from API for UI display
     */
    processMissionForUI(mission) {
        return {
            id: mission.id,
            title: mission.title,
            client: mission.client || mission.issuer || 'Unknown Client',
            location: mission.location,
            timeRemaining: this.calculateTimeRemaining(mission),
            expanded: false, // UI state
            objectives: mission.objectives?.map(obj => ({
                id: obj.id,
                description: obj.description,
                status: obj.state?.toUpperCase() || 'PENDING',
                progress: obj.progress || null,
                isOptional: obj.optional || false
            })) || []
        };
    }
    
    /**
     * Calculate time remaining for mission
     */
    calculateTimeRemaining(mission) {
        if (!mission.time_limit) return null;
        
        const now = new Date();
        const deadline = new Date(mission.time_limit);
        const remaining = deadline - now;
        
        if (remaining <= 0) return '00:00';
        
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    /**
     * Create completion data for mission completion UI
     */
    createCompletionData(mission) {
        const completedObjectives = mission.objectives?.filter(obj => obj.is_achieved === true).length || 0;
        const totalObjectives = mission.objectives?.filter(obj => !obj.optional).length || 1;
        const bonusObjectives = mission.objectives?.filter(obj => obj.optional && obj.is_achieved === true).length || 0;
        const totalBonusObjectives = mission.objectives?.filter(obj => obj.optional).length || 0;
        
        return {
            completionTime: this.calculateCompletionTime(mission),
            timeLimit: mission.time_limit || null,
            bonusObjectives: {
                completed: bonusObjectives,
                total: totalBonusObjectives
            },
            rewards: {
                credits: mission.rewards?.credits || 1000,
                cards: mission.rewards?.cards || [],
                factionStanding: mission.rewards?.faction_standing || {}
            },
            statistics: {
                objectivesCompleted: `${completedObjectives}/${totalObjectives}`,
                completionRate: `${Math.round((completedObjectives / totalObjectives) * 100)}%`,
                bonusCompleted: `${bonusObjectives}/${totalBonusObjectives}`
            }
        };
    }
    
    /**
     * Calculate mission completion time
     */
    calculateCompletionTime(mission) {
        if (!mission.accepted_at) return 'Unknown';
        
        const startTime = new Date(mission.accepted_at);
        const endTime = new Date();
        const duration = endTime - startTime;
        
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((duration % (1000 * 60)) / 1000);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    /**
     * Update player data in mission API
     */
    updatePlayerData(playerData) {
        if (this.missionAPI) {
            this.missionAPI.updatePlayerData(playerData);
        }
    }
    
    /**
     * Set player location in mission API
     */
    setPlayerLocation(location) {
        if (this.missionAPI) {
            this.missionAPI.setPlayerLocation(location);
        }
    }
    
    /**
     * Get mock missions for testing
     */
    getMockMissions() {
        return [
            {
                id: 'mission_001',
                title: 'ELIMINATE RAIDER SQUADRON',
                client: 'Terra Defense Force',
                location: 'Sol Inner',
                timeRemaining: '15:42',
                expanded: true,
                objectives: [
                    {
                        description: 'Locate raider squadron',
                        status: 'COMPLETED',
                        isOptional: false
                    },
                    {
                        description: 'Eliminate 5 raider ships',
                        status: 'ACTIVE',
                        progress: '3/5',
                        isOptional: false
                    },
                    {
                        description: 'Return to Terra Station',
                        status: 'PENDING',
                        isOptional: false
                    }
                ]
            },
            {
                id: 'mission_002',
                title: 'CARGO DELIVERY RUN',
                client: 'Free Traders Union',
                location: 'Ceres → Europa',
                expanded: false,
                objectives: [
                    {
                        description: 'Pick up cargo from Ceres',
                        status: 'COMPLETED',
                        isOptional: false
                    },
                    {
                        description: 'Deliver to Europa Station',
                        status: 'ACTIVE',
                        isOptional: false
                    },
                    {
                        description: 'Avoid pirate ambush',
                        status: 'PENDING',
                        isOptional: true
                    }
                ]
            }
        ];
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Listen to mission API events
        this.missionAPI.addEventListener('missionAccepted', (data) => {
            console.log('🎯 MissionStatusHUD: Mission accepted', data.mission);
            this.refreshMissions();
        });
        
        this.missionAPI.addEventListener('missionCompleted', (data) => {
            console.log('🎯 MissionStatusHUD: Mission completed', data.mission);
            this.refreshMissions();
            
            // Show mission completion UI
            if (this.starfieldManager && this.starfieldManager.showMissionComplete) {
                this.starfieldManager.showMissionComplete(data.mission.id, this.createCompletionData(data.mission));
            }
        });
        
        this.missionAPI.addEventListener('objectiveCompleted', (data) => {
            console.log('🎯 MissionStatusHUD: Objective completed', data);
            // Use direct update if we have mission data, otherwise refresh from API
            if (data.mission && Array.isArray([data.mission])) {
                this.updateMissionsData([data.mission]);
            } else {
                this.refreshMissions();
            }
        });
        
        console.log('🎯 MissionStatusHUD: Event listeners ready');
    }
    
    /**
     * Get visibility status
     */
    get visible() {
        return this.isVisible;
    }
    
    /**
     * Hide the HUD
     */
    hide() {
        if (this.isVisible) {
            this.toggle();
        }
    }
    
    /**
     * Show the HUD
     */
    show() {
        if (!this.isVisible) {
            this.toggle();
        }
    }
}
