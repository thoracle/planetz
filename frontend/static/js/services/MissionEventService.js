/**
 * Mission Event Service
 * Handles sending game events to the backend for mission progress tracking
 */

export class MissionEventService {
    constructor() {
        this.baseURL = '/api/missions/events';
        this.enabled = true;
        this.pendingNotifications = [];
        
        console.log('🎯 MissionEventService: Initialized');
    }
    
    /**
     * Enable or disable event tracking
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        console.log(`🎯 MissionEventService: ${enabled ? 'Enabled' : 'Disabled'}`);
    }
    
    /**
     * Send enemy destroyed event
     */
    async enemyDestroyed(enemyShip, playerContext = {}) {
        if (!this.enabled) return;
        
        try {
            const eventData = {
                enemy_type: enemyShip.shipType || enemyShip.enemyShipType || 'enemy_fighter',
                enemy_id: enemyShip.id || enemyShip.shipId || `enemy_${Date.now()}`,
                location: playerContext.location || 'unknown',
                player_context: {
                    player_ship: playerContext.playerShip || 'starter_ship',
                    location: playerContext.location || 'unknown',
                    timestamp: Date.now()
                }
            };
            
            console.log('🎯 MissionEventService: Sending enemy destroyed event:', eventData);
            
            const response = await fetch(`${this.baseURL}/enemy_destroyed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.updated_missions.length > 0) {
                console.log(`🎯 MissionEventService: ${result.updated_missions.length} missions updated from enemy destruction`);
                
                // Trigger mission update events
                for (const mission of result.updated_missions) {
                    this.triggerMissionUpdateEvent('enemy_destroyed', mission, eventData);
                }
            }
            
            return result;
            
        } catch (error) {
            console.error('🎯 MissionEventService: Failed to send enemy destroyed event:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Send location reached event
     */
    async locationReached(location, playerContext = {}) {
        if (!this.enabled) return;
        
        try {
            const eventData = {
                location: location,
                player_context: {
                    player_ship: playerContext.playerShip || 'starter_ship',
                    timestamp: Date.now()
                }
            };
            
            console.log('🎯 MissionEventService: Sending location reached event:', eventData);
            
            const response = await fetch(`${this.baseURL}/location_reached`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.updated_missions.length > 0) {
                console.log(`🎯 MissionEventService: ${result.updated_missions.length} missions updated from location reached`);
                
                // Trigger mission update events
                for (const mission of result.updated_missions) {
                    this.triggerMissionUpdateEvent('location_reached', mission, eventData);
                }
            }
            
            return result;
            
        } catch (error) {
            console.error('🎯 MissionEventService: Failed to send location reached event:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Send cargo loaded event
     */
    async cargoLoaded(commodityId, quantity, location, playerContext = {}) {
        if (!this.enabled) return;
        
        try {
            const eventData = {
                cargo_type: commodityId,
                quantity: quantity,
                location: location,
                player_context: {
                    player_ship: playerContext.playerShip || 'starter_ship',
                    timestamp: Date.now()
                }
            };
            
            console.log('🎯 MissionEventService: Sending cargo loaded event:', eventData);
            
            const response = await fetch(`${this.baseURL}/cargo_loaded`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success && result.updated_missions.length > 0) {
                console.log(`🎯 MissionEventService: ${result.updated_missions.length} missions updated from cargo loading`);
                
                const sm = window.starfieldManager;
                const isDocked = Boolean(sm && sm.isDocked);

                // Trigger mission update events
                for (const mission of result.updated_missions) {
                    this.triggerMissionUpdateEvent('cargo_loaded', mission, eventData);
                    
                    const fireMissionComplete = () => this.triggerMissionCompletionNotification(mission);
                    const fireObjective = (objective) => this.triggerObjectiveCompletionNotification(objective, mission);
                    
                    if (mission.state === 'COMPLETED') {
                        if (isDocked) this.queueNotification(fireMissionComplete); else fireMissionComplete();
                    }
                    
                    if (mission.objectives) {
                        for (const objective of mission.objectives) {
                            if (objective.is_achieved && !objective._notified) {
                                if (isDocked) this.queueNotification(() => fireObjective(objective)); else fireObjective(objective);
                                objective._notified = true; // Prevent duplicate notifications
                            }
                        }
                    }
                }
                
                // Always update HUD immediately
                if (window.starfieldManager?.missionStatusHUD) {
                    if (typeof window.starfieldManager.missionStatusHUD.updateMissionsData === 'function') {
                        window.starfieldManager.missionStatusHUD.updateMissionsData(result.updated_missions);
                    } else {
                        window.starfieldManager.missionStatusHUD.refreshMissions();
                    }
                }
            }
            
            return result;
            
        } catch (error) {
            console.error('🎯 MissionEventService: Failed to send cargo loaded event:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Send cargo delivered event
     */
    async cargoDelivered(cargoType, quantity, location, playerContext = {}) {
        if (!this.enabled) return;
        
        try {
            const eventData = {
                cargo_type: cargoType,
                quantity: quantity,
                delivery_location: location,  // Backend expects delivery_location
                location: location,           // Keep for backward compatibility  
                integrity: playerContext.integrity || 1.0,
                source: playerContext.source || 'unknown',  // Track delivery method
                player_context: {
                    player_ship: playerContext.playerShip || 'starter_ship',
                    timestamp: Date.now()
                }
            };
            
            console.log('🎯 MissionEventService: Sending cargo delivered event:', eventData);
            console.log(`🚛 DEBUG: Delivery location being sent: "${eventData.delivery_location}"`);
            
            const response = await fetch(`${this.baseURL}/cargo_delivered`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            console.log('🎯 MissionEventService: Cargo delivered response:', result);
            
            if (result.success && result.updated_missions.length > 0) {
                console.log(`🎯 MissionEventService: ${result.updated_missions.length} missions updated from cargo delivery`);
                
                // Trigger mission update events
                for (const mission of result.updated_missions) {
                    this.triggerMissionUpdateEvent('cargo_delivered', mission, eventData);
                    
                    // Check for mission completion and trigger notifications
                    if (mission.state === 'COMPLETED') {
                        this.triggerMissionCompletionNotification(mission);
                    }
                    
                    // Check for completed objectives and trigger notifications
                    if (mission.objectives) {
                        for (const objective of mission.objectives) {
                            if (objective.is_achieved && !objective._notified) {
                                this.triggerObjectiveCompletionNotification(objective, mission);
                                objective._notified = true; // Prevent duplicate notifications
                            }
                        }
                    }
                }
                
                // Refresh mission status HUD with updated data if available
                if (window.starfieldManager?.missionStatusHUD) {
                    // Pass the updated missions directly to avoid race condition with API call
                    if (typeof window.starfieldManager.missionStatusHUD.updateMissionsData === 'function') {
                        window.starfieldManager.missionStatusHUD.updateMissionsData(result.updated_missions);
                    } else {
                        window.starfieldManager.missionStatusHUD.refreshMissions();
                    }
                }
            } else {
                console.log('🎯 MissionEventService: No missions updated from cargo delivery');
                if (result.success) {
                    console.log('🎯 MissionEventService: Response was successful but no missions matched');
                }
            }
            
            return result;
            
        } catch (error) {
            console.error('🎯 MissionEventService: Failed to send cargo delivered event:', error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Trigger mission update event for other systems to listen to
     */
    triggerMissionUpdateEvent(eventType, mission, eventData) {
        const event = new CustomEvent('missionProgressUpdate', {
            detail: {
                eventType: eventType,
                mission: mission,
                eventData: eventData
            }
        });
        
        window.dispatchEvent(event);
        // Only log events that might need debugging - reduce spam
        if (eventType !== 'cargo_loaded' && eventType !== 'cargo_delivered') {
            console.log(`🎯 MissionEventService: Triggered missionProgressUpdate event for mission ${mission.id}`);
        }
    }
    
    /**
     * Trigger mission completion notification
     */
    triggerMissionCompletionNotification(mission) {
        console.log(`🎯 MissionEventService: Mission completed - ${mission.title || mission.id}`);
        
        // Try to use the notification handler if available
        if (window.missionNotificationHandler) {
            window.missionNotificationHandler.onMissionComplete(mission);
        }
        
        // Also trigger a custom event for other listeners
        const event = new CustomEvent('missionCompleted', {
            detail: { mission: mission }
        });
        window.dispatchEvent(event);
    }
    
    /**
     * Trigger objective completion notification
     */
    triggerObjectiveCompletionNotification(objective, mission) {
        // Reduced logging - only log significant objective completions
        if (objective.description.includes('deliver') || objective.description.includes('eliminate')) {
            console.log(`🎯 MissionEventService: Objective completed - ${objective.description}`);
        }
        
        // Try to use the notification handler if available
        if (window.missionNotificationHandler) {
            window.missionNotificationHandler.onObjectiveComplete(objective, mission);
        }
        
        // Also trigger a custom event for other listeners
        const event = new CustomEvent('objectiveCompleted', {
            detail: { 
                objective: objective,
                mission: mission 
            }
        });
        window.dispatchEvent(event);
    }

    queueNotification(fn) {
        this.pendingNotifications.push(fn);
        // Attach a one-time hook to run after launch
        const sm = window.starfieldManager;
        if (sm) {
            const runPending = () => {
                if (this.pendingNotifications.length === 0) return;
                const tasks = [...this.pendingNotifications];
                this.pendingNotifications = [];
                tasks.forEach((f) => { try { f(); } catch (_) {} });
                window.removeEventListener('shipLaunched', runPending);
            };
            window.removeEventListener('shipLaunched', runPending);
            window.addEventListener('shipLaunched', runPending, { once: true });
        }
    }
    
    /**
     * Test event sending (for debugging)
     */
    async testEnemyDestroyed() {
        console.log('🎯 MissionEventService: Testing enemy destroyed event...');
        
        const mockEnemy = {
            shipType: 'enemy_fighter',
            id: 'test_enemy_1'
        };
        
        const mockContext = {
            location: 'terra_prime',
            playerShip: 'starter_ship'
        };
        
        return await this.enemyDestroyed(mockEnemy, mockContext);
    }
}
