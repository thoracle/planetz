import { debug } from '../debug.js';

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
        
        // Use global Mission API Service (shared with waypoint system)
        this.missionAPI = window.missionAPI || new MissionAPIService();
        
        // UI components
        this.hudContainer = null;
        this.missionPanels = new Map();
        this.lastUpdateTime = 0;
        
        // Track expanded state of missions to preserve user preferences
        this.expandedStates = new Map(); // mission_id -> boolean
        
        // Track missions showing completion to prevent refresh interference
        this.missionsShowingCompletion = new Set(); // mission_id set
        
        // Add unique instance ID for debugging
        this.instanceId = Math.random().toString(36).substr(2, 9);
        console.log('🏗️ MissionStatusHUD instance created with ID:', this.instanceId);
        
        // Update frequency (2Hz = every 500ms)
        this.updateFrequency = 500;
        
        this.initialize();
    }
    
    initialize() {
        this.createHUDContainer();
        this.setupEventListeners();
debug('UI', 'MissionStatusHUD: Initialized');
        
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
debug('AI', 'MissionStatusHUD: Container created');
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
debug('UI', 'MissionStatusHUD: Shown');
            
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
debug('UI', 'MissionStatusHUD: Hidden');
            
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
        
debug('UI', `🎯 MissionStatusHUD: ${this.isVisible ? 'Enabled' : 'Disabled'}`);
        
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
        
debug('UI', 'MissionStatusHUD: Started periodic updates');
    }
    
    /**
     * Stop periodic updates
     */
    stopUpdates() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
debug('UI', 'MissionStatusHUD: Stopped periodic updates');
    }
    
    /**
     * Refresh missions from mission API
     */
    async refreshMissions() {
        console.log('🎯 MissionStatusHUD.refreshMissions() called on instance:', this.instanceId);
        console.log('🎯 REFRESH CHECK: this object:', this);
        console.log('🎯 REFRESH CHECK: missionsShowingCompletion exists:', !!this.missionsShowingCompletion);
        console.log('🎯 REFRESH CHECK: missionsShowingCompletion type:', typeof this.missionsShowingCompletion);
        console.log('🎯 REFRESH CHECK: missionsShowingCompletion size:', this.missionsShowingCompletion?.size);
        console.log('🎯 REFRESH CHECK: missionsShowingCompletion contents:', Array.from(this.missionsShowingCompletion || []));
        
        // Skip refresh if any missions are showing completion rewards
        if (this.missionsShowingCompletion && this.missionsShowingCompletion.size > 0) {
            console.log('⏸️ REFRESH BLOCKED: Missions showing completion:', Array.from(this.missionsShowingCompletion));
            console.log('⏸️ REFRESH BLOCKED: Skipping refresh to preserve rewards sections');
            return;
        }
        
        console.log('🎯 REFRESH PROCEEDING: No missions showing completion, continuing with refresh');
        
        try {
            // Get active missions from API
            console.log('🎯 Calling missionAPI.getActiveMissions()...');
            const apiMissions = await this.missionAPI.getActiveMissions();
            console.log('🎯 Got active missions from API:', apiMissions.length, apiMissions);
            
            // Preserve completed missions that are showing completion screens
            // Look for missions that have rewards sections (indicating completion)
            const completedMissionsShowingRewards = this.activeMissions.filter(mission => {
                const panel = this.missionPanels.get(mission.id);
                const hasRewardsSection = panel && panel.querySelector('.mission-rewards-section');
                const isMarkedCompleted = mission.status === 'completed';
                const hasFlaggedRewardsSection = mission.hasRewardsSection === true;
                
                // Preserve if marked as completed OR has rewards section OR flagged as having rewards
                return (isMarkedCompleted || hasRewardsSection || hasFlaggedRewardsSection) && this.missionPanels.has(mission.id);
            });
            
            console.log('🎯 Preserving completed missions showing rewards:', completedMissionsShowingRewards.length);
            
            // Debug: log details about preserved missions
            console.log('🔍 PRESERVATION: Checking all active missions for preservation:');
            this.activeMissions.forEach(mission => {
                const panel = this.missionPanels.get(mission.id);
                const hasRewardsSection = panel && panel.querySelector('.mission-rewards-section');
                const isMarkedCompleted = mission.status === 'completed';
                const hasFlaggedRewardsSection = mission.hasRewardsSection === true;
                const shouldPreserve = (isMarkedCompleted || hasRewardsSection || hasFlaggedRewardsSection) && this.missionPanels.has(mission.id);
                console.log(`🔍 PRESERVATION: Mission ${mission.id}: status=${mission.status}, hasRewardsSection=${!!hasRewardsSection}, flagged=${hasFlaggedRewardsSection}, shouldPreserve=${shouldPreserve}`);
            });
            
            completedMissionsShowingRewards.forEach(mission => {
                const panel = this.missionPanels.get(mission.id);
                const hasRewardsSection = panel && panel.querySelector('.mission-rewards-section');
                console.log(`🎯 PRESERVATION: Preserving mission ${mission.id}: status=${mission.status}, hasRewardsSection=${!!hasRewardsSection}`);
            });
            
            // Process API missions for UI display
            const processedApiMissions = apiMissions.map(mission => this.processMissionForUI(mission));
            
            // Combine API missions with completed missions showing rewards
            this.activeMissions = [...processedApiMissions, ...completedMissionsShowingRewards];
            
            console.log('🎯 Final missions to display:', this.activeMissions.length);
            
            this.renderMissions();
            console.log('✅ MissionStatusHUD: Refreshed and rendered missions');
debug('UI', `🎯 MissionStatusHUD: Refreshed ${this.activeMissions.length} active missions (${processedApiMissions.length} active + ${completedMissionsShowingRewards.length} completed)`);
        } catch (error) {
            console.error('🎯 MissionStatusHUD: Error refreshing missions:', error);
            this.showErrorMessage('Failed to load missions');
            
            // Fallback to mock data for testing
debug('UI', 'MissionStatusHUD: Using mock data as fallback');
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
debug('UI', `🎯 MissionStatusHUD: Updated with ${this.activeMissions.length} missions directly`);
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
        console.log('🔄 RENDER: renderMissions() called');
        console.log('🔄 RENDER: Current missionsShowingCompletion:', Array.from(this.missionsShowingCompletion));
        
        // Preserve existing panels that have rewards sections (completed missions)
        const panelsToPreserve = new Map();
        this.missionPanels.forEach((panel, missionId) => {
            const hasRewardsSection = panel.querySelector('.mission-rewards-section');
            if (hasRewardsSection) {
                panelsToPreserve.set(missionId, panel);
                console.log('🔄 RENDER: Preserving panel with rewards section:', missionId);
                debug('UI', `🎯 Preserving panel with rewards section: ${missionId}`);
            }
        });
        
        console.log('🔄 RENDER: Panels to preserve:', panelsToPreserve.size);
        
        // Clear content but preserve panels with rewards
        console.log('🔄 RENDER: Clearing contentArea.innerHTML');
        this.contentArea.innerHTML = '';
        console.log('🔄 RENDER: Clearing missionPanels Map');
        this.missionPanels.clear();
        
        if (this.activeMissions.length === 0) {
            console.log('🔄 RENDER: No active missions, showing no missions message');
            this.showNoMissionsMessage();
            return;
        }
        
        console.log('🔄 RENDER: Processing', this.activeMissions.length, 'active missions');
        this.activeMissions.forEach((mission, index) => {
            let panel;
            
            // Use preserved panel if it exists, otherwise create new one
            if (panelsToPreserve.has(mission.id)) {
                panel = panelsToPreserve.get(mission.id);
                console.log('🔄 RENDER: Reusing preserved panel for mission:', mission.id);
                debug('UI', `🎯 Reusing preserved panel for mission: ${mission.id}`);
                
                // Verify the preserved panel still has rewards section
                const stillHasRewards = panel.querySelector('.mission-rewards-section');
                console.log('🔄 RENDER: Preserved panel still has rewards section:', !!stillHasRewards);
            } else {
                console.log('🔄 RENDER: Creating new panel for mission:', mission.id);
                panel = this.createMissionPanel(mission, index);
            }
            
            console.log('🔄 RENDER: Appending panel to contentArea for mission:', mission.id);
            this.contentArea.appendChild(panel);
            this.missionPanels.set(mission.id, panel);
        });
        
        console.log('🔄 RENDER: renderMissions() completed');
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
            
            // Save the expanded state to preserve user preference
            this.expandedStates.set(mission.id, mission.expanded);
            
            expandIcon.textContent = mission.expanded ? '▼' : '▲';
            const details = header.nextElementSibling;
            details.style.display = mission.expanded ? 'block' : 'none';
            
            debug('UI', `🎯 Mission ${mission.id} ${mission.expanded ? 'expanded' : 'collapsed'} by user`);
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
     * Show mission completion rewards in the mission panel
     * @param {string} missionId - Mission ID
     * @param {Object} missionData - Mission data
     * @param {Object} rewards - Rewards earned
     */
    showMissionCompletion(missionId, missionData, rewards) {
        console.log('🎉 MISSION COMPLETION: showMissionCompletion called for:', missionId);
        console.log('🎉 MISSION COMPLETION: Mission data:', missionData);
        console.log('🎉 MISSION COMPLETION: Rewards:', rewards);
        
        const panel = this.missionPanels.get(missionId);
        if (!panel) {
            debug('UI', `⚠️ Mission panel not found for completion: ${missionId}`);
            console.log('❌ MISSION COMPLETION: Panel not found for mission:', missionId);
            console.log('❌ MISSION COMPLETION: Available panels:', Array.from(this.missionPanels.keys()));
            return;
        }

        debug('UI', `🎉 Showing mission completion in HUD: ${missionId}`);
        console.log('✅ MISSION COMPLETION: Panel found, proceeding with rewards display');

        // FIRST: Block refreshes and mark the mission as completed
        // This must happen BEFORE any DOM manipulation to prevent race conditions
        console.log('🔒 MISSION COMPLETION: About to add mission to completion tracking on instance:', this.instanceId);
        console.log('🔒 MISSION COMPLETION: this object:', this);
        console.log('🔒 MISSION COMPLETION: missionsShowingCompletion type:', typeof this.missionsShowingCompletion);
        console.log('🔒 MISSION COMPLETION: Current missionsShowingCompletion before add:', Array.from(this.missionsShowingCompletion));
        this.missionsShowingCompletion.add(missionId);
        console.log('🔒 MISSION COMPLETION: Added mission to completion tracking, blocking refreshes');
        console.log('🔒 MISSION COMPLETION: Current missionsShowingCompletion after add:', Array.from(this.missionsShowingCompletion));
        console.log('🔒 MISSION COMPLETION: Set size:', this.missionsShowingCompletion.size);
        
        const mission = this.activeMissions.find(m => m.id === missionId);
        if (mission) {
            mission.status = 'completed';
            mission.completedAt = Date.now();
            mission.rewards = rewards;
            mission.completionData = missionData;
            mission.hasRewardsSection = true; // Flag for preservation
            console.log('🔧 MISSION COMPLETION: Pre-marked mission as completed in activeMissions array');
            debug('UI', `✅ Marked mission as completed in HUD: ${missionId}`);
        } else {
            console.log('❌ MISSION COMPLETION: Mission not found in activeMissions array!');
            console.log('❌ MISSION COMPLETION: Available missions:', this.activeMissions.map(m => m.id));
        }

        // Find the mission details section (where objectives are)
        const detailsSection = panel.querySelector('.mission-details');
        console.log('🔍 MISSION COMPLETION: Looking for .mission-details section');
        console.log('🔍 MISSION COMPLETION: Details section found:', !!detailsSection);
        if (!detailsSection) {
            debug('UI', `⚠️ Mission details section not found in panel: ${missionId}`);
            console.log('❌ MISSION COMPLETION: .mission-details section not found in panel');
            console.log('❌ MISSION COMPLETION: Panel HTML:', panel.innerHTML);
            return;
        }

        // Check if rewards section already exists (avoid duplicates)
        const existingRewardsSection = detailsSection.querySelector('.mission-rewards-section');
        console.log('🔍 MISSION COMPLETION: Checking for existing rewards section:', !!existingRewardsSection);
        if (existingRewardsSection) {
            debug('UI', `⚠️ Rewards section already exists for mission: ${missionId}`);
            console.log('⚠️ MISSION COMPLETION: Rewards section already exists, skipping');
            return;
        }

        // Create rewards section
        console.log('🔧 MISSION COMPLETION: Creating rewards section');
        const rewardsSection = this.createRewardsSection(rewards, missionId);
        console.log('🔧 MISSION COMPLETION: Rewards section created:', !!rewardsSection);
        
        // Add rewards section to the details (after objectives)
        console.log('🔧 MISSION COMPLETION: Appending rewards section to details');
        detailsSection.appendChild(rewardsSection);
        console.log('✅ MISSION COMPLETION: Rewards section appended successfully');
        
        // Verify the rewards section is actually in the DOM
        const verifyRewardsSection = detailsSection.querySelector('.mission-rewards-section');
        console.log('🔍 VERIFICATION: Rewards section still in DOM after append:', !!verifyRewardsSection);
        if (verifyRewardsSection) {
            console.log('🔍 VERIFICATION: Rewards section HTML:', verifyRewardsSection.outerHTML.substring(0, 200) + '...');
        }
        
        // Update panel styling for completion
        console.log('🎨 MISSION COMPLETION: Updating panel styling for completion');
        panel.style.background = 'rgba(0, 60, 0, 0.4)';
        panel.style.border = '2px solid #00ff41';
        panel.style.boxShadow = '0 0 10px rgba(0, 255, 65, 0.3)';
        console.log('🎨 MISSION COMPLETION: Panel styling updated');
        
        // Final verification
        const finalVerifyRewardsSection = detailsSection.querySelector('.mission-rewards-section');
        console.log('🔍 FINAL VERIFICATION: Rewards section still in DOM after styling:', !!finalVerifyRewardsSection);
        
        debug('UI', `✅ Added rewards section to mission panel: ${missionId}`);
        console.log('🏁 MISSION COMPLETION: showMissionCompletion method completed successfully');
    }

    /**
     * Create rewards section to append under objectives
     * @param {Object} rewards - Rewards earned
     * @param {string} missionId - Mission ID
     * @returns {HTMLElement} - Rewards section element
     */
    createRewardsSection(rewards, missionId) {
        console.log('🔧 REWARDS: createRewardsSection called with rewards:', rewards);
        
        const rewardsSection = document.createElement('div');
        rewardsSection.className = 'mission-rewards-section';
        rewardsSection.style.cssText = `
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #00ff41;
        `;

        // Check if there are any rewards to display
        const hasCredits = rewards.credits && rewards.credits > 0;
        const hasFactionRep = rewards.factionBonuses && Object.keys(rewards.factionBonuses).length > 0;
        const hasCards = rewards.cards && rewards.cards.count > 0;
        const hasRewards = hasCredits || hasFactionRep || hasCards;
        
        console.log('🔧 REWARDS: Reward checks - Credits:', hasCredits, 'Faction:', hasFactionRep, 'Cards:', hasCards, 'HasAny:', hasRewards);

        if (hasRewards) {
            // Rewards header
            const rewardsHeader = document.createElement('div');
            rewardsHeader.style.cssText = `
                color: #00ff41;
                font-size: 14px;
                font-weight: bold;
                margin-bottom: 10px;
                text-shadow: 0 0 5px #00ff41;
            `;
            rewardsHeader.textContent = 'REWARDS:';
            rewardsSection.appendChild(rewardsHeader);

            // Rewards list
            const rewardsList = document.createElement('div');
            rewardsList.className = 'rewards-list';
            rewardsList.style.cssText = `
                display: flex;
                flex-direction: column;
                gap: 5px;
                margin-bottom: 15px;
            `;

            // Add individual rewards
            if (hasCredits) {
                rewardsList.appendChild(this.createRewardItem('💰', `${rewards.credits.toLocaleString()} Credits`));
            }

            if (hasFactionRep) {
                Object.entries(rewards.factionBonuses).forEach(([faction, amount]) => {
                    const factionName = this.getFactionDisplayName(faction);
                    rewardsList.appendChild(this.createRewardItem('🎖️', `+${amount} ${factionName} Rep`));
                });
            }

            if (hasCards) {
                // Show individual card names if available, otherwise show count
                if (rewards.cards.names && rewards.cards.names.length > 0) {
                    rewards.cards.names.forEach(cardName => {
                        rewardsList.appendChild(this.createRewardItem('🃏', cardName));
                    });
                } else if (rewards.cards.types && rewards.cards.types.length > 0) {
                    // Fallback: show card types if names not available
                    rewards.cards.types.forEach(cardType => {
                        const formattedType = this.formatCardTypeName(cardType);
                        rewardsList.appendChild(this.createRewardItem('🃏', formattedType));
                    });
                } else {
                    // Final fallback: show count
                    const cardText = `${rewards.cards.count} NFT Card${rewards.cards.count > 1 ? 's' : ''}`;
                    rewardsList.appendChild(this.createRewardItem('🃏', cardText));
                }
            }

            rewardsSection.appendChild(rewardsList);
        }

        // OK button (always shown for completed missions)
        const okButton = document.createElement('button');
        okButton.className = 'mission-ok-button';
        okButton.textContent = 'OK';
        okButton.style.cssText = `
            background: linear-gradient(135deg, #00ff41, #00cc33);
            border: none;
            color: #000000;
            padding: 8px 20px;
            font-family: 'VT323', monospace;
            font-size: 14px;
            font-weight: bold;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            width: 100%;
            margin-top: 10px;
        `;

        // Add hover effect
        okButton.addEventListener('mouseenter', () => {
            okButton.style.background = 'linear-gradient(135deg, #00cc33, #009922)';
            okButton.style.color = '#ffffff';
            okButton.style.boxShadow = '0 0 15px rgba(0, 255, 65, 0.6)';
        });

        okButton.addEventListener('mouseleave', () => {
            okButton.style.background = 'linear-gradient(135deg, #00ff41, #00cc33)';
            okButton.style.color = '#000000';
            okButton.style.boxShadow = 'none';
        });

        // Add click handler
        okButton.addEventListener('click', () => {
            this.removeMission(missionId);
        });

        rewardsSection.appendChild(okButton);

        return rewardsSection;
    }

    /**
     * Create individual reward item element
     * @param {string} icon - Reward icon
     * @param {string} text - Reward text
     * @returns {HTMLElement} - Reward item element
     */
    createRewardItem(icon, text) {
        const item = document.createElement('div');
        item.style.cssText = `
            display: flex;
            align-items: center;
            gap: 8px;
            color: #ffffff;
            font-size: 12px;
        `;

        const iconSpan = document.createElement('span');
        iconSpan.style.fontSize = '14px';
        iconSpan.textContent = icon;

        const textSpan = document.createElement('span');
        textSpan.textContent = text;

        item.appendChild(iconSpan);
        item.appendChild(textSpan);

        return item;
    }



    /**
     * Remove mission from HUD (called by OK button)
     * @param {string} missionId - Mission ID to remove
     */
    removeMission(missionId) {
        debug('UI', `🗑️ Removing completed mission from HUD: ${missionId}`);
        
        // Remove from completion tracking to allow refreshes again
        this.missionsShowingCompletion.delete(missionId);
        console.log('🔓 MISSION REMOVAL: Removed mission from completion tracking, allowing refreshes');
        
        const panel = this.missionPanels.get(missionId);
        if (panel) {
            // Fade out animation
            panel.style.transition = 'all 0.3s ease';
            panel.style.opacity = '0';
            panel.style.transform = 'translateX(100%)';
            
            // Remove after animation
            setTimeout(() => {
                if (panel.parentNode) {
                    panel.parentNode.removeChild(panel);
                }
                this.missionPanels.delete(missionId);
                
                // Clean up expanded state tracking
                this.expandedStates.delete(missionId);
                
                // Remove from active missions list
                this.activeMissions = this.activeMissions.filter(m => m.id !== missionId);
                
                // Now actually delete the mission from caches (user has dismissed it)
                this.deleteMissionFromCaches(missionId);
                
                // Show no missions message if empty
                if (this.activeMissions.length === 0) {
                    this.showNoMissionsMessage();
                }
                
                // Allow refreshes to resume now that mission is fully removed
                console.log('🔄 MISSION REMOVAL: Mission fully removed, refreshes can resume');
            }, 300);
        }
    }

    /**
     * Delete mission from all caches (called after user dismisses completion)
     * @param {string} missionId - Mission ID to delete
     */
    deleteMissionFromCaches(missionId) {
        debug('UI', `🗑️ Deleting mission from caches: ${missionId}`);
        
        // Remove from MissionAPI cache
        if (window.missionAPI && window.missionAPI.activeMissions) {
            const removed = window.missionAPI.activeMissions.delete(missionId);
            debug('UI', `🗑️ Removed from MissionAPI cache: ${removed ? 'SUCCESS' : 'NOT FOUND'}`);
        }
        
        // Remove from MissionEventHandler cache
        if (window.missionEventHandler && window.missionEventHandler.activeMissions) {
            const localRemoved = window.missionEventHandler.activeMissions.delete(missionId);
            debug('UI', `🗑️ Removed from local cache: ${localRemoved ? 'SUCCESS' : 'NOT FOUND'}`);
        }
        
        debug('UI', `✅ Mission ${missionId} fully deleted from all caches`);
    }

    /**
     * Get display name for faction
     * @param {string} factionId - Faction identifier
     * @returns {string} - Display name
     */
    getFactionDisplayName(factionId) {
        const factionNames = {
            'terran_republic_alliance': 'TRA',
            'explorers_guild': 'Explorers Guild',
            'traders_guild': 'Traders Guild',
            'friendly': 'Allied Forces',
            'neutral': 'Independent',
            'enemy': 'Hostile Forces'
        };
        
        return factionNames[factionId] || factionId || 'Unknown';
    }

    /**
     * Format card type name for display
     * @param {string} cardType - Card type identifier
     * @returns {string} - Formatted display name
     */
    formatCardTypeName(cardType) {
        const cardTypeNames = {
            'scanner': 'Scanner Module Card',
            'long_range_sensor': 'Long Range Sensor Card',
            'shield_generator': 'Shield Generator Card',
            'weapon_system': 'Weapon System Card',
            'engine_upgrade': 'Engine Upgrade Card',
            'cargo_expansion': 'Cargo Expansion Card',
            'navigation_computer': 'Navigation Computer Card',
            'communication_array': 'Communication Array Card'
        };
        
        return cardTypeNames[cardType] || this.capitalizeWords(cardType.replace(/_/g, ' ')) + ' Card';
    }

    /**
     * Capitalize words in a string
     * @param {string} str - String to capitalize
     * @returns {string} - Capitalized string
     */
    capitalizeWords(str) {
        return str.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
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
        // Preserve expanded state if it exists, otherwise default to false
        const wasExpanded = this.expandedStates.get(mission.id) || false;
        
        // Check if we already have this mission in our local array with completion status
        const existingMission = this.activeMissions.find(m => m.id === mission.id);
        const preservedStatus = existingMission?.status;
        const preservedRewardsFlag = existingMission?.hasRewardsSection;
        
        const clientName = mission.client || mission.issuer || 'Unknown Client';
        
        const processedMission = {
            id: mission.id,
            title: mission.title,
            client: clientName,
            location: mission.location,
            timeRemaining: this.calculateTimeRemaining(mission),
            expanded: wasExpanded, // Preserve user's expand/collapse preference
            status: preservedStatus || mission.status, // Preserve completion status
            hasRewardsSection: preservedRewardsFlag, // Preserve rewards flag
            objectives: mission.objectives?.map(obj => ({
                id: obj.id,
                description: obj.description,
                status: obj.state?.toUpperCase() || 'PENDING',
                progress: obj.progress || null,
                isOptional: obj.optional || false
            })) || []
        };
        
        // Copy other preserved fields if they exist
        if (existingMission) {
            if (existingMission.completedAt) processedMission.completedAt = existingMission.completedAt;
            if (existingMission.rewards) processedMission.rewards = existingMission.rewards;
            if (existingMission.completionData) processedMission.completionData = existingMission.completionData;
        }
        
        return processedMission;
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
debug('UI', 'MissionStatusHUD: Mission accepted', data.mission);
            this.refreshMissions();
        });
        
        this.missionAPI.addEventListener('missionCompleted', (data) => {
debug('UI', 'MissionStatusHUD: Mission completed', data.mission);
            this.refreshMissions();
            
            // Play mission completion audio
            this.playMissionCompletionAudio();
            
            // Show mission completion UI
            if (this.starfieldManager && this.starfieldManager.showMissionComplete) {
                this.starfieldManager.showMissionComplete(data.mission.id, this.createCompletionData(data.mission));
            }
        });
        
        this.missionAPI.addEventListener('objectiveCompleted', (data) => {
debug('UI', 'MissionStatusHUD: Objective completed', data);
            
            // Play objective completion audio
            this.playObjectiveCompletionAudio();
            
            // Use direct update if we have mission data, otherwise refresh from API
            if (data.mission && Array.isArray([data.mission])) {
                this.updateMissionsData([data.mission]);
            } else {
                this.refreshMissions();
            }
        });
        
debug('UI', 'MissionStatusHUD: Event listeners ready');
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

    /**
     * Play audio when an objective is completed
     */
    playObjectiveCompletionAudio() {
        try {
            // Use TargetComputerManager's audio system if available
            if (window.targetComputerManager && window.targetComputerManager.playAudio) {
                window.targetComputerManager.playAudio('frontend/static/audio/blurb.mp3');
                debug('MISSIONS', '🔊 Played objective completion audio: blurb.mp3');
            } else {
                // Fallback: HTML5 Audio
                const audio = new Audio('static/audio/blurb.mp3');
                audio.volume = 0.7;
                audio.play().catch(() => {
                    debug('MISSIONS', '⚠️ Could not play objective completion audio');
                });
                debug('MISSIONS', '🔊 Played objective completion audio (fallback): blurb.mp3');
            }
        } catch (error) {
            debug('MISSIONS', `⚠️ Error playing objective completion audio: ${error.message}`);
        }
    }

    /**
     * Play audio when a mission is completed
     */
    playMissionCompletionAudio() {
        try {
            // Use TargetComputerManager's audio system if available
            if (window.targetComputerManager && window.targetComputerManager.playAudio) {
                window.targetComputerManager.playAudio('frontend/static/audio/success.wav');
                debug('MISSIONS', '🔊 Played mission completion audio: success.wav');
            } else {
                // Fallback: HTML5 Audio
                const audio = new Audio('static/audio/success.wav');
                audio.volume = 0.8;
                audio.play().catch(() => {
                    debug('MISSIONS', '⚠️ Could not play mission completion audio');
                });
                debug('MISSIONS', '🔊 Played mission completion audio (fallback): success.wav');
            }
        } catch (error) {
            debug('MISSIONS', `⚠️ Error playing mission completion audio: ${error.message}`);
        }
    }
}
