import { debug } from '../debug.js';

/**
 * MissionAPIService - Frontend interface to backend mission system
 * Handles all mission-related API calls and data management
 */

export class MissionAPIService {
    constructor() {
        this.baseURL = '/api/missions';
        this.activeMissions = new Map();
        this.availableMissions = new Map();
        this.playerLocation = null;
        this.playerData = null;
        
        // Event listeners for real-time updates
        this.eventListeners = {
            missionAccepted: [],
            missionCompleted: [],
            missionFailed: [],
            objectiveCompleted: [],
            missionUpdated: []
        };
        
debug('MISSIONS', 'MissionAPIService: Initialized');
    }
    
    /**
     * Set player location for mission filtering
     */
    setPlayerLocation(location) {
        this.playerLocation = location;
debug('MISSIONS', `🎯 MissionAPIService: Player location set to ${location}`);
    }
    
    /**
     * Update player data for mission generation
     */
    updatePlayerData(playerData) {
        this.playerData = { ...playerData };
    }
    
    /**
     * Get available missions at current location
     */
    async getAvailableMissions(location = null, factionStandings = null) {
        try {
            const params = new URLSearchParams();
            if (location || this.playerLocation) {
                params.append('location', location || this.playerLocation);
            }
            if (factionStandings) {
                params.append('faction_standings', JSON.stringify(factionStandings));
            }
            
            const response = await fetch(`${this.baseURL}?${params}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Update local cache
            this.availableMissions.clear();
            data.missions.forEach(mission => {
                this.availableMissions.set(mission.id, mission);
            });
            
debug('AI', `🎯 MissionAPIService: Loaded ${data.missions.length} available missions`);
            return data.missions;
            
        } catch (error) {
            console.error('🎯 MissionAPIService: Failed to get available missions:', error);
            return [];
        }
    }
    
    /**
     * Get active/accepted missions
     */
    async getActiveMissions() {
        debug('MISSIONS', 'MissionAPIService.getActiveMissions() called');
        debug('MISSIONS', 'Current activeMissions cache size:', this.activeMissions.size);
        debug('MISSIONS', 'Current activeMissions cache:', Array.from(this.activeMissions.entries()));
        
        try {
            const response = await fetch(`${this.baseURL}/active`);
            if (response.ok) {
                const data = await response.json();
                debug('MISSIONS', 'Backend response:', data);
                
                // Update local cache with backend missions (preserve test missions)
                // Only add backend missions, don't remove existing test missions
                data.missions.forEach(mission => {
                    this.activeMissions.set(mission.id, mission);
                });
                
                // Note: Test missions are preserved because they're already in the cache
                // and backend doesn't know about them, so they won't be overwritten
                
                debug('MISSIONS', 'After backend merge, cache size:', this.activeMissions.size);
debug('MISSIONS', `🎯 MissionAPIService: Loaded ${data.missions.length} backend missions`);
            } else {
                debug('MISSIONS', 'MissionAPIService: Backend unavailable, using local cache only');
            }
        } catch (error) {
            console.log('🎯 MissionAPIService: Backend unavailable, using local cache only');
            console.log('🎯 Backend error:', error.message);
        }
        
        // Always return combined local cache (includes test missions + backend missions)
        const allMissions = Array.from(this.activeMissions.values());
        debug('MISSIONS', `🎯 Final missions to return: ${allMissions.length}`);
debug('MISSIONS', `🎯 MissionAPIService: Returning ${allMissions.length} total active missions (including test missions)`);
        
        return allMissions;
    }
    
    /**
     * Clear all active missions (useful for new game sessions)
     */
    async clearActiveMissions() {
        try {
            const response = await fetch(`${this.baseURL}/active/clear`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Clear local cache
                this.activeMissions.clear();
debug('MISSIONS', `🎯 MissionAPIService: Cleared ${result.cleared_count} active missions`);
                
                // Trigger event
                this.triggerEvent('activeMissionsCleared', { 
                    clearedCount: result.cleared_count,
                    message: result.message
                });
            }
            
            return result;
            
        } catch (error) {
            console.error('🎯 MissionAPIService: Failed to clear active missions:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get mission details by ID
     */
    async getMissionDetails(missionId) {
        try {
            const response = await fetch(`${this.baseURL}/${missionId}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const mission = await response.json();
debug('AI', `🎯 MissionAPIService: Loaded mission details for ${missionId}`);
            return mission;
            
        } catch (error) {
            console.error(`🎯 MissionAPIService: Failed to get mission ${missionId}:`, error);
            return null;
        }
    }
    
    /**
     * Accept a mission
     */
    async acceptMission(missionId) {
        try {
            const response = await fetch(`${this.baseURL}/${missionId}/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    player_data: this.playerData
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Move mission from available to active
                const mission = this.availableMissions.get(missionId);
                if (mission) {
                    this.activeMissions.set(missionId, { ...mission, state: 'ACTIVE' });
                    this.availableMissions.delete(missionId);
                }
                
                // Trigger event
                this.triggerEvent('missionAccepted', { mission: result.mission });
debug('MISSIONS', `🎯 MissionAPIService: Mission ${missionId} accepted`);
            }
            
            return result;
            
        } catch (error) {
            console.error(`🎯 MissionAPIService: Failed to accept mission ${missionId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Complete an objective
     */
    async completeObjective(missionId, objectiveId) {
        try {
            const response = await fetch(`${this.baseURL}/${missionId}/objectives/${objectiveId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    player_data: this.playerData
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Update local mission cache
                const mission = this.activeMissions.get(missionId);
                if (mission && result.mission) {
                    this.activeMissions.set(missionId, result.mission);
                }
                
                // Trigger events
                this.triggerEvent('objectiveCompleted', { 
                    missionId, 
                    objectiveId, 
                    mission: result.mission 
                });
                
                // Check if mission is complete
                if (result.mission && (result.mission.state === 'COMPLETED' || result.mission.state === 'Achieved')) {
                    this.triggerEvent('missionCompleted', { mission: result.mission });
                }
                
debug('MISSIONS', `🎯 MissionAPIService: Objective ${objectiveId} completed for mission ${missionId}`);
            }
            
            return result;
            
        } catch (error) {
            console.error(`🎯 MissionAPIService: Failed to complete objective ${objectiveId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Abandon a mission
     */
    async abandonMission(missionId) {
        try {
            const response = await fetch(`${this.baseURL}/${missionId}/abandon`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                // Remove from active missions
                this.activeMissions.delete(missionId);
                
debug('MISSIONS', `🎯 MissionAPIService: Mission ${missionId} abandoned`);
            }
            
            return result;
            
        } catch (error) {
            console.error(`🎯 MissionAPIService: Failed to abandon mission ${missionId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Generate a procedural mission
     */
    async generateMission(templateId, location = null) {
        try {
            const response = await fetch(`${this.baseURL}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    template_id: templateId,
                    location: location || this.playerLocation,
                    player_data: this.playerData
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.mission) {
                // Add to available missions
                this.availableMissions.set(result.mission.id, result.mission);
debug('MISSIONS', `🎯 MissionAPIService: Generated mission ${result.mission.id} from template ${templateId}`);
            }
            
            return result;
            
        } catch (error) {
            console.error(`🎯 MissionAPIService: Failed to generate mission from template ${templateId}:`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Get available mission templates
     */
    async getMissionTemplates() {
        try {
            const response = await fetch(`${this.baseURL}/templates`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
debug('MISSIONS', `🎯 MissionAPIService: Loaded ${data.templates.length} mission templates`);
            return data.templates;
            
        } catch (error) {
            console.error('🎯 MissionAPIService: Failed to get mission templates:', error);
            return [];
        }
    }
    
    /**
     * Add event listener
     */
    addEventListener(eventType, callback) {
        if (this.eventListeners[eventType]) {
            this.eventListeners[eventType].push(callback);
        }
    }
    
    /**
     * Remove event listener
     */
    removeEventListener(eventType, callback) {
        if (this.eventListeners[eventType]) {
            const index = this.eventListeners[eventType].indexOf(callback);
            if (index > -1) {
                this.eventListeners[eventType].splice(index, 1);
            }
        }
    }
    
    /**
     * Trigger event
     */
    triggerEvent(eventType, data) {
        if (this.eventListeners[eventType]) {
            this.eventListeners[eventType].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`🎯 MissionAPIService: Error in event listener for ${eventType}:`, error);
                }
            });
        }
    }
    
    /**
     * Get cached active missions (for performance)
     */
    getCachedActiveMissions() {
        return Array.from(this.activeMissions.values());
    }
    
    /**
     * Get cached available missions (for performance)
     */
    getCachedAvailableMissions() {
        return Array.from(this.availableMissions.values());
    }
    
    /**
     * Force refresh all mission data
     */
    async refreshAllMissions() {
debug('MISSIONS', 'MissionAPIService: Refreshing all mission data...');
        
        try {
            await Promise.all([
                this.getActiveMissions(),
                this.getAvailableMissions()
            ]);
            
debug('MISSIONS', 'MissionAPIService: All mission data refreshed');
            return true;
        } catch (error) {
            console.error('🎯 MissionAPIService: Failed to refresh mission data:', error);
            return false;
        }
    }
    
    /**
     * Test connection to mission API
     */
    async testConnection() {
        try {
            const response = await fetch(`${this.baseURL}/templates`);
            const isConnected = response.ok;
            
debug('MISSIONS', `🎯 MissionAPIService: Connection test ${isConnected ? 'PASSED' : 'FAILED'}`);
            return isConnected;
            
        } catch (error) {
            console.error('🎯 MissionAPIService: Connection test failed:', error);
            return false;
        }
    }
}
