import { debug } from '../debug.js';

/**
 * Mission Board UI Component
 * Displays available missions and handles mission acceptance
 * Integrates with existing docking interface
 */

import { MissionAPIService } from '../services/MissionAPIService.js';
import { playerCredits } from '../utils/PlayerCredits.js';

export class MissionBoard {
    constructor(starfieldManager) {
        this.starfieldManager = starfieldManager;
        this.isVisible = false;
        this.currentLocation = 'terra_prime';
        this.currentLocationKey = 'terra_prime';
        this.availableMissions = [];
        this.acceptedMissions = [];
        this.selectedMission = null;
        this.activeTab = 'available'; // new
        
        // Initialize Mission API Service
        this.missionAPI = new MissionAPIService();
        
        // Mission filtering
        this.filters = {
            mission_type: 'all',
            faction: 'all',
            difficulty: 'all'
        };
        
        // Player data for mission generation - ensure all primitive values
        this.playerData = {
            level: 1,
            faction_standings: {
                terran_republic_alliance: 65,
                traders_guild: 45,
                scientists_consortium: 25,
                explorers_guild: 70,
                mercenary_fleet: -35
            },
            credits: playerCredits.getCredits(),
            ship_type: 'starter_ship'
        };
        
        this.createMissionBoardUI();
        this.loadAvailableMissions();
        // also load active missions for the new tab
        if (typeof this.loadActiveMissions === 'function') {
            this.loadActiveMissions();
        }
    }

    // Helper: determine if objective is completed (matches M-key HUD logic)
    isObjectiveCompleted(obj) {
        const achievedFlag = obj && (obj.is_achieved === true);
        const completedStatus = obj && (obj.status === 'COMPLETED');
        const fullProgress = obj && (typeof obj.progress === 'number' && obj.progress >= 1);
        return Boolean(achievedFlag || completedStatus || fullProgress);
    }
    
    createMissionBoardUI() {
        // Create main mission board container
        this.container = document.createElement('div');
        this.container.className = 'mission-board';
        this.container.style.cssText = `
            position: fixed;
            top: 10%;
            left: 10%;
            right: 10%;
            bottom: 10%;
            background: rgba(0, 0, 0, 0.95);
            border: 2px solid #00ff41;
            color: #00ff41;
            font-family: 'VT323', monospace;
            padding: 20px;
            display: none;
            z-index: 2000;
            flex-direction: column;
            overflow: hidden;
        `;
        
        // Create header
        this.createHeader();
        
        // Create main content area
        this.createContentArea();
        
        // Create footer with action buttons
        this.createFooter();
        
        // Add to document
        document.body.appendChild(this.container);
        
        // Add event listeners
        this.bindEvents();
        
        // Add styles
        this.addStyles();
    }
    
    createHeader() {
        this.header = document.createElement('div');
        this.header.className = 'mission-board-header';
        this.header.style.cssText = `
            border-bottom: 2px solid #00ff41;
            padding-bottom: 15px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            z-index: 1;
        `;
        
        // Title
        const title = document.createElement('h2');
        title.textContent = 'MISSION BOARD';
        title.style.cssText = `
            margin: 0;
            font-size: 28px;
            color: #00ff41;
            font-family: 'VT323', monospace;
        `;
        
        // Location info
        const locationInfo = document.createElement('div');
        locationInfo.className = 'location-info';
        locationInfo.style.cssText = `
            text-align: right;
            font-size: 16px;
        `;
        locationInfo.innerHTML = `
            <div>Location: <span class="location-name">${typeof this.currentLocation === 'string' ? this.currentLocation : 'unknown'}</span></div>
            <div>Available Missions: <span class="mission-count">0</span></div>
        `;
        
        this.header.appendChild(title);
        this.header.appendChild(locationInfo);
        this.container.appendChild(this.header);
        
        // Tabs under header to avoid overlapping the separator text
        const tabs = document.createElement('div');
        tabs.className = 'mission-board-tabs';
        tabs.style.cssText = `
            display: flex;
            gap: 10px;
            margin: -10px 0 15px 0;
            border-bottom: 1px solid #00ff41;
            padding-bottom: 8px;
        `;
        
        this.availableTabBtn = document.createElement('button');
        this.availableTabBtn.textContent = 'Available';
        this.availableTabBtn.className = 'mission-board-btn';
        this.availableTabBtn.style.cssText += 'padding: 8px 12px;';
        this.availableTabBtn.addEventListener('click', () => { this.playCommandSound(); this.switchTab('available'); });
        
        this.activeTabBtn = document.createElement('button');
        this.activeTabBtn.textContent = 'Active';
        this.activeTabBtn.className = 'mission-board-btn';
        this.activeTabBtn.style.cssText += 'padding: 8px 12px;';
        this.activeTabBtn.addEventListener('click', () => { this.playCommandSound(); this.switchTab('active'); });
        
        tabs.appendChild(this.availableTabBtn);
        tabs.appendChild(this.activeTabBtn);
        this.container.appendChild(tabs);
    }
    
    createContentArea() {
        this.contentArea = document.createElement('div');
        this.contentArea.className = 'mission-content';
        this.contentArea.style.cssText = `
            flex: 1;
            display: flex;
            gap: 20px;
            overflow: hidden;
        `;
        
        // Available missions panel
        this.createMissionListPanel();
        // Active missions panel
        this.createActiveListPanel();
        
        // Details panel
        this.createMissionDetailsPanel();
        
        this.container.appendChild(this.contentArea);
    }
    
    createMissionListPanel() {
        this.listPanel = document.createElement('div');
        this.listPanel.className = 'mission-list-panel';
        this.listPanel.style.cssText = `
            flex: 1;
            display: flex;
            flex-direction: column;
            border: 1px solid #00ff41;
            padding: 15px;
            background: rgba(0, 0, 0, 0.3);
        `;
        
        // Filters
        this.createFilters();
        
        // Mission list
        this.missionList = document.createElement('div');
        this.missionList.className = 'mission-list';
        this.missionList.style.cssText = `
            flex: 1;
            overflow-y: auto;
            margin-top: 15px;
        `;
        
        this.listPanel.appendChild(this.missionList);
        this.contentArea.appendChild(this.listPanel);
    }
    
    createActiveListPanel() {
        this.activePanel = document.createElement('div');
        this.activePanel.className = 'active-list-panel';
        this.activePanel.style.cssText = `
            flex: 1;
            display: none;
            flex-direction: column;
            border: 1px solid #00ff41;
            padding: 15px;
            background: rgba(0, 0, 0, 0.3);
        `;
        
        const label = document.createElement('div');
        label.textContent = 'Active Missions';
        label.style.cssText = `
            font-size: 16px;
            color: #00ff41;
            border-bottom: 1px solid #00ff41;
            padding-bottom: 8px;
            margin-bottom: 12px;
        `;
        this.activePanel.appendChild(label);
        
        this.activeMissionList = document.createElement('div');
        this.activeMissionList.className = 'active-mission-list';
        this.activeMissionList.style.cssText = `
            flex: 1;
            overflow-y: auto;
        `;
        this.activePanel.appendChild(this.activeMissionList);
        this.contentArea.appendChild(this.activePanel);
    }
    
    createFilters() {
        const filtersContainer = document.createElement('div');
        filtersContainer.className = 'mission-filters';
        filtersContainer.style.cssText = `
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            padding-bottom: 15px;
            border-bottom: 1px solid #00ff41;
        `;
        
        // Mission type filter
        const typeFilter = this.createFilterSelect('Type', 'mission_type', [
            { value: 'all', label: 'All Types' },
            { value: 'elimination', label: 'Combat' },
            { value: 'exploration', label: 'Exploration' },
            { value: 'delivery', label: 'Trading' },
            { value: 'escort', label: 'Escort' }
        ]);
        
        // Faction filter
        const factionFilter = this.createFilterSelect('Faction', 'faction', [
            { value: 'all', label: 'All Factions' },
            { value: 'terran_republic_alliance', label: 'Terran Republic Alliance' },
            { value: 'traders_guild', label: 'Traders Guild' },
            { value: 'scientists_consortium', label: 'Scientists Consortium' }
        ]);
        
        filtersContainer.appendChild(typeFilter);
        filtersContainer.appendChild(factionFilter);
        
        this.listPanel.appendChild(filtersContainer);
    }
    
    createFilterSelect(label, filterKey, options) {
        const container = document.createElement('div');
        container.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 5px;
        `;
        
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        labelEl.style.cssText = `
            font-size: 14px;
            color: #00ff41;
        `;
        
        const select = document.createElement('select');
        select.style.cssText = `
            background: rgba(0, 0, 0, 0.8);
            border: 1px solid #00ff41;
            color: #00ff41;
            padding: 5px;
            font-family: 'VT323', monospace;
        `;
        
        options.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            select.appendChild(optionEl);
        });
        
        select.addEventListener('change', () => {
            this.filters[filterKey] = select.value;
            this.filterMissions();
        });
        
        container.appendChild(labelEl);
        container.appendChild(select);
        
        return container;
    }
    
    createMissionDetailsPanel() {
        this.detailsPanel = document.createElement('div');
        this.detailsPanel.className = 'mission-details-panel';
        this.detailsPanel.style.cssText = `
            flex: 1;
            border: 1px solid #00ff41;
            padding: 15px;
            background: rgba(0, 0, 0, 0.3);
            display: flex;
            flex-direction: column;
        `;
        
        // Details content
        this.detailsContent = document.createElement('div');
        this.detailsContent.className = 'mission-details-content';
        this.detailsContent.style.cssText = `
            flex: 1;
            overflow-y: auto;
        `;
        
        // Default message
        this.detailsContent.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #666;">
                <h3>Select a mission to view details</h3>
            </div>
        `;
        
        this.detailsPanel.appendChild(this.detailsContent);
        this.contentArea.appendChild(this.detailsPanel);
    }
    
    createFooter() {
        this.footer = document.createElement('div');
        this.footer.className = 'mission-board-footer';
        this.footer.style.cssText = `
            border-top: 2px solid #00ff41;
            padding-top: 15px;
            margin-top: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;
        
        // Status info
        const statusInfo = document.createElement('div');
        statusInfo.className = 'status-info';
        statusInfo.innerHTML = `
            <div>Credits: <span class="player-credits">${playerCredits.getFormattedCredits()}</span></div>
            <div>Active Missions: <span class="active-mission-count">0</span></div>
        `;
        
        // Register credits display for automatic updates
        const creditsSpan = statusInfo.querySelector('.player-credits');
        playerCredits.registerDisplay(creditsSpan);
        
        // Action buttons
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
            display: flex;
            gap: 10px;
        `;
        
        this.acceptButton = this.createButton('Accept Mission', () => this.acceptSelectedMission());
        this.acceptButton.disabled = true;
        
        this.generateButton = this.createButton('Generate Mission', () => this.generateNewMission());
        this.refreshButton = this.createButton('Refresh', () => this.loadAvailableMissions());
        this.closeButton = this.createButton('Return to Station Menu', () => this.hide());
        
        buttonContainer.appendChild(this.acceptButton);
        buttonContainer.appendChild(this.generateButton);
        buttonContainer.appendChild(this.refreshButton);
        buttonContainer.appendChild(this.closeButton);
        
        this.footer.appendChild(statusInfo);
        this.footer.appendChild(buttonContainer);
        this.container.appendChild(this.footer);
    }
    
    createButton(text, onClick) {
        const button = document.createElement('button');
        button.textContent = text;
        button.className = 'mission-board-btn';
        button.addEventListener('click', (e) => {
            this.playCommandSound();
            if (typeof onClick === 'function') onClick(e);
        });
        return button;
    }
    
    bindEvents() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            if (!this.isVisible) return;
            
            switch (event.key) {
                case 'Escape':
                    event.preventDefault();
                    this.hide();
                    break;
                case 'Enter':
                    if (this.selectedMission && !this.acceptButton.disabled) {
                        event.preventDefault();
                        this.acceptSelectedMission();
                    }
                    break;
            }
        });
    }
    
    async loadAvailableMissions() {
        try {
            // Update mission API with player data
            this.missionAPI.updatePlayerData(this.playerData);
            this.missionAPI.setPlayerLocation(this.currentLocationKey);
            
            // Get available missions from API service
            const missions = await this.missionAPI.getAvailableMissions(
                this.currentLocationKey,
                this.playerData.faction_standings
            );
            
            this.availableMissions = missions || [];
            
debug('AI', `🎯 Loaded ${this.availableMissions.length} available missions`);
            this.updateMissionList();
            this.updateMissionCount();
            
            // If no missions available, try to generate some
            if (this.availableMissions.length === 0) {
debug('AI', 'No missions available, attempting to generate some...');
                await this.generateStationMissions();
            }
            
        } catch (error) {
            console.error('❌ Failed to load missions:', error);
            this.showError('Failed to load missions from server');
        }
    }
    
    updateMissionList() {
        this.missionList.innerHTML = '';
        
        const filteredMissions = this.getFilteredMissions();
        
        if (filteredMissions.length === 0) {
            this.missionList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666;">
                    No missions available matching current filters
                </div>
            `;
            return;
        }
        
        filteredMissions.forEach(mission => {
            const missionItem = this.createMissionItem(mission);
            this.missionList.appendChild(missionItem);
        });
    }
    
    createMissionItem(mission) {
        const item = document.createElement('div');
        item.className = 'mission-item';
        item.style.cssText = `
            padding: 15px;
            margin-bottom: 10px;
            border: 1px solid #00ff41;
            background: rgba(0, 255, 65, 0.1);
            cursor: pointer;
            transition: background-color 0.2s;
        `;
        
        // Mission type color coding
        const typeColors = {
            'elimination': '#ff4444',
            'exploration': '#44ff44',
            'delivery': '#4444ff',
            'escort': '#ffff44'
        };
        
        const typeColor = typeColors[mission.mission_type] || '#00ff41';
        
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 5px 0; color: ${typeColor};">${mission.title}</h4>
                    <div style="display: flex; gap: 15px; font-size: 12px;">
                        <span>Type: ${mission.mission_type}</span>
                        <span>Faction: ${mission.faction}</span>
                        <span>Location: ${mission.location}</span>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="color: #00ff41; font-weight: bold;">Reward Package ${mission.reward_package_id}</div>
                    <div style="font-size: 12px;">${mission.objectives.length} objectives</div>
                </div>
            </div>
        `;
        
        item.addEventListener('click', () => {
            this.selectMission(mission);
        });
        
        item.addEventListener('mouseenter', () => {
            item.style.backgroundColor = 'rgba(0, 255, 65, 0.2)';
        });
        
        item.addEventListener('mouseleave', () => {
            if (this.selectedMission?.id !== mission.id) {
                item.style.backgroundColor = 'rgba(0, 255, 65, 0.1)';
            }
        });
        
        return item;
    }
    
    selectMission(mission) {
        // Remove previous selection
        const prevSelected = this.missionList.querySelector('.mission-item.selected');
        if (prevSelected) {
            prevSelected.classList.remove('selected');
            prevSelected.style.backgroundColor = 'rgba(0, 255, 65, 0.1)';
        }
        
        // Select new mission
        this.selectedMission = mission;
        const currentItem = [...this.missionList.children].find(item => 
            item.querySelector('h4').textContent === mission.title
        );
        
        if (currentItem) {
            currentItem.classList.add('selected');
            currentItem.style.backgroundColor = 'rgba(0, 255, 65, 0.3)';
        }
        
        // Update details panel
        this.displayMissionDetails(mission);
        
        // Enable accept button
        this.acceptButton.disabled = false;
        
debug('MISSIONS', `🎯 Selected mission: ${mission.title}`);
    }
    
    displayMissionDetails(mission) {
        // Build objectives list with checkmarks like M-key HUD
        let objectivesHTML = '';
        if (Array.isArray(mission.objectives) && mission.objectives.length > 0) {
            const rows = mission.objectives.map((obj) => {
                const done = this.isObjectiveCompleted(obj);
                const mark = done ? '✔' : '○';
                const markColor = done ? '#00ff41' : '#666';
                return `
                    <div style="padding: 8px; margin-bottom: 5px; background: rgba(0, 0, 0, 0.3); border-left: 3px solid ${obj.is_optional ? '#ffff44' : '#00ff41'}; display:flex; gap:8px; align-items:flex-start;">
                        <span style="color:${markColor}; min-width:16px;">${mark}</span>
                        <div style="flex:1;">
                            <div style="font-weight: bold;">${obj.description}</div>
                            <div style="font-size: 12px; color: #ccc;">
                                ${obj.is_optional ? 'Optional' : 'Required'} ${obj.is_ordered ? '• Ordered' : ''}
                            </div>
                        </div>
                    </div>`;
            });
            objectivesHTML = rows.join('');
        }

        this.detailsContent.innerHTML = `
            <div class="mission-details">
                <h3 style="color: #00ff41; margin-top: 0;">${mission.title}</h3>
                
                <div style="margin-bottom: 20px;">
                    <h4>Description</h4>
                    <div style="color: #ccc; line-height: 1.5; font-size: 14px; background: rgba(0,0,0,0.35); border: 1px solid #00ff41; padding: 10px; border-radius: 4px;">
                        ${mission.description}
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div>
                        <h4>Mission Info</h4>
                        <div style="color: #ccc;">
                            <div>Type: ${mission.mission_type}</div>
                            <div>Faction: ${mission.faction}</div>
                            <div>Location: ${mission.location}</div>
                            <div>State: ${mission.state}</div>
                        </div>
                    </div>
                    <div>
                        <h4>Rewards</h4>
                        <div style="color: #ccc;">
                            <div>Package: ${mission.reward_package_id}</div>
                            <div>Bonus: ${mission.custom_fields?.completion_bonus || 'Standard'}</div>
                            <div>Reputation: +${mission.custom_fields?.reputation_gain || 10}</div>
                        </div>
                    </div>
                </div>
                
                <div style="margin-bottom: 20px;">
                    <h4>Objectives</h4>
                    <div class="objectives-list">
                        ${objectivesHTML}
                    </div>
                </div>
                
                ${mission.custom_fields ? `
                    <div>
                        <h4>Mission Details</h4>
                        <div style="color: #ccc; font-size: 12px;">
                            ${Object.entries(mission.custom_fields)
                                .filter(([key]) => !key.startsWith('_'))
                                .map(([key, value]) => `
                                    <div><strong>${key.replace(/_/g, ' ')}:</strong> ${Array.isArray(value) ? value.join(', ') : value}</div>
                                `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    async acceptSelectedMission() {
        if (!this.selectedMission) return;
        
        try {
            this.acceptButton.disabled = true;
            this.acceptButton.textContent = 'Accepting...';
            
            // Use MissionAPIService to accept mission
            const result = await this.missionAPI.acceptMission(this.selectedMission.id);
            
            if (result.success) {
debug('MISSIONS', `✅ Mission accepted: ${this.selectedMission.title}`);
                
                // Update UI
                this.acceptedMissions.push(result.mission);
                this.showSuccess(`Mission accepted: ${this.selectedMission.title}`);
                
                // Reload available missions
                this.loadAvailableMissions();
                this.loadActiveMissions(); // Reload active missions
                
                // Clear selection
                this.selectedMission = null;
                this.detailsContent.innerHTML = `
                    <div style="text-align: center; padding: 50px; color: #666;">
                        <h3>Select a mission to view details</h3>
                    </div>
                `;
                
            } else {
                throw new Error(result.error || 'Failed to accept mission');
            }
            
        } catch (error) {
            console.error('❌ Failed to accept mission:', error);
            this.showError(`Failed to accept mission: ${error.message}`);
        } finally {
            this.acceptButton.disabled = false;
            this.acceptButton.textContent = 'Accept Mission';
        }
    }
    
    async generateNewMission() {
        try {
            this.generateButton.disabled = true;
            this.generateButton.textContent = 'Generating...';
            
            // Get station-appropriate templates
            const stationTemplates = this.getStationTemplates(this.currentLocationKey);
            const randomTemplate = stationTemplates[Math.floor(Math.random() * stationTemplates.length)];
            
            // Create a completely clean copy of player data with explicit type conversion
            const cleanPlayerData = {
                level: Number(this.playerData.level) || 1,
                credits: Number(this.playerData.credits) || 50000,
                ship_type: String(this.playerData.ship_type) || 'starter_ship',
                faction_standings: {
                    terran_republic_alliance: Number(this.playerData.faction_standings?.terran_republic_alliance) || 65,
                    traders_guild: Number(this.playerData.faction_standings?.traders_guild) || 45,
                    scientists_consortium: Number(this.playerData.faction_standings?.scientists_consortium) || 25,
                    explorers_guild: Number(this.playerData.faction_standings?.explorers_guild) || 70,
                    mercenary_fleet: Number(this.playerData.faction_standings?.mercenary_fleet) || -35
                }
            };
            
            // Debug log to help identify any remaining issues
debug('MISSIONS', '🎲 Generating mission with clean player data:', cleanPlayerData);

            // Create a clean copy of location data to avoid circular references
            const cleanLocation = this.currentLocation ? {
                name: String(this.currentLocation.userData?.name || this.currentLocation.name || ''),
                type: String(this.currentLocation.type || ''),
                faction: String(this.currentLocation.faction || ''),
                sector: String(this.currentLocation.sector || '')
            } : {
                name: 'terra_prime',
                type: 'station',
                faction: 'terran_republic_alliance',
                sector: 'A0'
            };

            // Test JSON serialization to catch any remaining circular references
            const requestPayload = {
                template_id: randomTemplate,
                player_data: cleanPlayerData,
                location: cleanLocation
            };

            let jsonPayload;
            try {
                jsonPayload = JSON.stringify(requestPayload);
            } catch (jsonError) {
                console.error('❌ JSON serialization error:', jsonError);
                console.error('Problematic payload:', requestPayload);
                throw new Error(`JSON serialization failed: ${jsonError.message}`);
            }

            // Use MissionAPIService to generate mission
            const result = await this.missionAPI.generateMission(randomTemplate, this.currentLocationKey);
            
            if (result.success) {
debug('MISSIONS', `🎲 Generated mission: ${result.mission.title}`);
                this.showSuccess(`Generated new mission: ${result.mission.title}`);
                this.loadAvailableMissions();
                this.loadActiveMissions(); // Reload active missions
            } else {
                throw new Error(result.error || 'Failed to generate mission');
            }
            
        } catch (error) {
            console.error('❌ Failed to generate mission:', error);
            this.showError(`Failed to generate mission: ${error.message}`);
        } finally {
            this.generateButton.disabled = false;
            this.generateButton.textContent = 'Generate Mission';
        }
    }
    
    processResponseHooks(hooks) {
        hooks.forEach(hook => {
            switch (hook.type) {
                case 'spawn_enemies':
debug('MISSIONS', 'Spawning enemies for mission:', hook.data);
                    this.starfieldManager?.spawnMissionEnemies?.(hook.data);
                    break;
                    
                case 'play_audio':
debug('UI', '🔊 Playing audio:', hook.data.sound);
                    this.starfieldManager?.playAudio?.(hook.data.sound, hook.data.volume);
                    break;
                    
                case 'show_notification':
                    this.showSuccess(hook.data.message);
                    break;
                    
                default:
debug('UI', 'Unhandled hook type:', hook.type, hook.data);
            }
        });
    }
    
    getFilteredMissions() {
        return this.availableMissions.filter(mission => {
            if (this.filters.mission_type !== 'all' && mission.mission_type !== this.filters.mission_type) {
                return false;
            }
            
            if (this.filters.faction !== 'all' && mission.faction !== this.filters.faction) {
                return false;
            }
            
            return true;
        });
    }
    
    filterMissions() {
        this.updateMissionList();
        this.selectedMission = null;
        this.acceptButton.disabled = true;
        this.detailsContent.innerHTML = `
            <div style="text-align: center; padding: 50px; color: #666;">
                <h3>Select a mission to view details</h3>
            </div>
        `;
    }
    
    updateMissionCount() {
        const countElement = this.header.querySelector('.mission-count');
        if (countElement) {
            countElement.textContent = this.availableMissions.length;
        }
        
        const activeCountElement = this.footer.querySelector('.active-mission-count');
        if (activeCountElement) {
            activeCountElement.textContent = this.acceptedMissions.length;
        }
    }
    
    showSuccess(message) {
        this.showMessage(message, '#00ff41');
    }
    
    showError(message) {
        this.showMessage(message, '#ff4444');
    }
    
    showMessage(message, color = '#00ff41') {
        // Create temporary message overlay
        const messageEl = document.createElement('div');
        messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid ${color};
            color: ${color};
            padding: 15px 20px;
            font-family: 'VT323', monospace;
            font-size: 16px;
            z-index: 3000;
            border-radius: 5px;
            box-shadow: 0 0 20px ${color}40;
        `;
        messageEl.textContent = message;
        
        document.body.appendChild(messageEl);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.parentNode.removeChild(messageEl);
            }
        }, 3000);
    }
    
    setLocation(location) {
        // Accept either a location object (docked body) or a string key
        this.currentLocation = location;
        if (typeof location === 'object' && location) {
            const name = (location.userData?.name || location.name || 'terra_prime');
            this.currentLocationKey = String(name).toLowerCase().replace(/\s+/g, '_');
            const el = this.header.querySelector('.location-name');
            if (el) el.textContent = name;
        } else {
            const key = String(location || 'terra_prime');
            this.currentLocationKey = key.toLowerCase().replace(/\s+/g, '_');
            const el = this.header.querySelector('.location-name');
            if (el) el.textContent = key;
        }
        this.loadAvailableMissions();
    }
    
    updatePlayerData(playerData) {
        // Create clean copy of only primitive values to avoid circular references
        const cleanData = {
            level: Number(playerData.level) || this.playerData.level || 1,
            credits: playerCredits.getCredits(), // Always use unified credits
            ship_type: String(playerData.ship_type) || this.playerData.ship_type || 'starter_ship',
            faction_standings: {
                terran_republic_alliance: Number(playerData.faction_standings?.terran_republic_alliance) || this.playerData.faction_standings?.terran_republic_alliance || 65,
                traders_guild: Number(playerData.faction_standings?.traders_guild) || this.playerData.faction_standings?.traders_guild || 45,
                scientists_consortium: Number(playerData.faction_standings?.scientists_consortium) || this.playerData.faction_standings?.scientists_consortium || 25,
                explorers_guild: Number(playerData.faction_standings?.explorers_guild) || this.playerData.faction_standings?.explorers_guild || 70,
                mercenary_fleet: Number(playerData.faction_standings?.mercenary_fleet) || this.playerData.faction_standings?.mercenary_fleet || -35
            }
        };
        
        this.playerData = cleanData;
        
        // Credits display is automatically updated by PlayerCredits system
    }
    
    show() {
        this.isVisible = true;
        this.container.style.display = 'flex';
        this.loadAvailableMissions();
        if (typeof this.loadActiveMissions === 'function') {
            this.loadActiveMissions();
        }
debug('MISSIONS', 'Mission Board opened');
    }
    
    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';
        this.selectedMission = null;
        this.acceptButton.disabled = true;
        
        // Return to station menu if available
        if (this.dockingInterface) {
debug('UI', 'Returning to station menu...');
            this.dockingInterface.returnToStationMenu();
        }
        
debug('MISSIONS', 'Mission Board closed');
    }
    
    addStyles() {
        if (document.getElementById('mission-board-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'mission-board-styles';
        style.textContent = `
            .mission-board-btn {
                background: rgba(0, 0, 0, 0.5);
                border: 1px solid #00ff41;
                color: #00ff41;
                padding: 12px 16px;
                font-family: 'VT323', monospace;
                font-size: 16px;
                cursor: pointer;
                transition: all 0.3s ease;
                border-radius: 4px;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            
            .mission-board-btn:hover:not(:disabled) {
                background: rgba(0, 255, 65, 0.2);
                border-color: #44ff44;
                transform: scale(1.05);
            }
            
            .mission-board-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
                transform: none;
            }
            
            .mission-item.selected {
                background: rgba(0, 255, 65, 0.3) !important;
                box-shadow: 0 0 10px rgba(0, 255, 65, 0.5);
            }
            
            .mission-details h4 {
                color: #00ff41;
                margin: 15px 0 5px 0;
                text-transform: uppercase;
                border-bottom: 1px solid #00ff41;
                padding-bottom: 5px;
            }
            
            .objectives-list {
                max-height: 200px;
                overflow-y: auto;
            }
            
            /* Scrollbar styling */
            .mission-list::-webkit-scrollbar,
            .mission-details-content::-webkit-scrollbar,
            .objectives-list::-webkit-scrollbar {
                width: 8px;
            }
            
            .mission-list::-webkit-scrollbar-track,
            .mission-details-content::-webkit-scrollbar-track,
            .objectives-list::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.3);
            }
            
            .mission-list::-webkit-scrollbar-thumb,
            .mission-details-content::-webkit-scrollbar-thumb,
            .objectives-list::-webkit-scrollbar-thumb {
                background: rgba(0, 255, 65, 0.5);
                border-radius: 4px;
            }
            
            .mission-list::-webkit-scrollbar-thumb:hover,
            .mission-details-content::-webkit-scrollbar-thumb:hover,
            .objectives-list::-webkit-scrollbar-thumb:hover {
                background: rgba(0, 255, 65, 0.8);
            }
            .mission-board-tabs .mission-board-btn { border: 1px solid #00ff41; }
            .mission-board-tabs .mission-board-btn.active { background: rgba(0, 255, 65, 0.2); border-color: #44ff44; }
        `;
        
        document.head.appendChild(style);
    }
    
    /**
     * Get station-appropriate mission templates
     */
    getStationTemplates(stationKey) {
        const stationTemplateMap = {
            'terra_prime': ['elimination', 'escort'],
            'europa_research_station': ['exploration', 'delivery'],
            'ceres_outpost': ['delivery', 'escort'],
            'mars_base': ['elimination', 'escort'],
            'luna_port': ['delivery', 'escort'],
            'asteroid_mining_platform': ['elimination', 'escort']
        };
        
        return stationTemplateMap[stationKey] || ['elimination', 'delivery', 'escort'];
    }
    
    /**
     * Generate missions for current station
     */
    async generateStationMissions() {
        try {
debug('MISSIONS', `🎯 Generating missions for station: ${this.currentLocationKey}`);
            
            const templates = this.getStationTemplates(this.currentLocationKey);
            const numMissions = Math.min(3, templates.length); // Generate 1-3 missions
            
            for (let i = 0; i < numMissions; i++) {
                const template = templates[i % templates.length];
                await this.missionAPI.generateMission(template, this.currentLocationKey);
            }
            
            // Reload missions after generation
            await this.loadAvailableMissions();
            
        } catch (error) {
            console.error('❌ Failed to generate station missions:', error);
        }
    }
    
    createActiveMissionItem(mission) {
        const item = document.createElement('div');
        item.className = 'mission-item';
        item.style.cssText = `
            padding: 15px;
            margin-bottom: 10px;
            border: 1px solid #00ff41;
            background: rgba(0, 255, 65, 0.08);
            cursor: pointer;
            transition: background-color 0.2s;
        `;

        // Build objectives summary with checkmarks (up to 3)
        let objectivesSummaryHTML = '';
        if (Array.isArray(mission.objectives) && mission.objectives.length > 0) {
            const maxShow = 3;
            const parts = [];
            mission.objectives.slice(0, maxShow).forEach((o) => {
                const done = this.isObjectiveCompleted(o);
                const mark = done ? '✔' : '○';
                const markColor = done ? '#00ff41' : '#666';
                parts.push(`<div><span style="color:${markColor}; margin-right:6px;">${mark}</span>${o.description}</div>`);
            });
            if (mission.objectives.length > maxShow) {
                parts.push(`<div style="color:#888;">… (${mission.objectives.length - maxShow} more)</div>`);
            }
            objectivesSummaryHTML = `<div style="margin-top:8px; font-size:12px; color:#ccc;">${parts.join('')}</div>`;
        }

        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 5px 0; color: #00ff41;">${mission.title}</h4>
                    <div style="display: flex; gap: 15px; font-size: 12px;">
                        <span>State: ${mission.state}</span>
                        <span>Type: ${mission.mission_type}</span>
                        <span>Destination: ${mission.custom_fields?.destination || mission.location}</span>
                    </div>
                    ${objectivesSummaryHTML}
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 12px;">${mission.objectives?.length || 0} objectives</div>
                </div>
            </div>
        `;
        item.addEventListener('click', () => this.selectMission(mission));
        item.addEventListener('mouseenter', () => { item.style.backgroundColor = 'rgba(0, 255, 65, 0.18)'; });
        item.addEventListener('mouseleave', () => { item.style.backgroundColor = 'rgba(0, 255, 65, 0.08)'; });
        return item;
    }
    
    updateActiveMissionList() {
        if (!this.activeMissionList) return;
        this.activeMissionList.innerHTML = '';
        const missions = this.acceptedMissions || [];
        if (missions.length === 0) {
            this.activeMissionList.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666;">No active missions</div>
            `;
            return;
        }
        missions.forEach(m => this.activeMissionList.appendChild(this.createActiveMissionItem(m)));
    }
    
    async loadActiveMissions() {
        try {
            const missions = await this.missionAPI.getActiveMissions();
            this.acceptedMissions = Array.isArray(missions) ? missions : [];
            this.updateActiveMissionList();
            this.updateMissionCount();
        } catch (e) {
            console.error('❌ Failed to load active missions:', e);
        }
    }
    
    switchTab(tab) {
        if (tab === this.activeTab) return;
        this.activeTab = tab;
        if (this.activeTab === 'available') {
            if (this.listPanel) this.listPanel.style.display = 'flex';
            if (this.activePanel) this.activePanel.style.display = 'none';
        } else {
            if (this.listPanel) this.listPanel.style.display = 'none';
            if (this.activePanel) this.activePanel.style.display = 'flex';
            this.loadActiveMissions?.();
        }
        if (this.availableTabBtn) this.availableTabBtn.classList.toggle('active', this.activeTab === 'available');
        if (this.activeTabBtn) this.activeTabBtn.classList.toggle('active', this.activeTab === 'active');
    }

    // Play UI command click sound
    playCommandSound() {
        const audioManager = this.starfieldManager?.audioManager || window.starfieldAudioManager;
        if (audioManager && typeof audioManager.playSound === 'function') {
            audioManager.playSound('command', 0.5);
            return;
        }
        try {
            const audio = new Audio('static/audio/command.wav');
            audio.volume = 0.5;
            audio.play().catch(() => {});
        } catch (_) {}
    }
}
