/**
 * Mission Event Service
 * Handles sending game events to the backend for mission progress tracking
 */

export class MissionEventService {
    constructor() {
        this.baseURL = '/api/missions/events';
        this.enabled = true;
        
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
                
                // Trigger mission update events
                for (const mission of result.updated_missions) {
                    this.triggerMissionUpdateEvent('cargo_loaded', mission, eventData);
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
                location: location,
                integrity: playerContext.integrity || 1.0,
                player_context: {
                    player_ship: playerContext.playerShip || 'starter_ship',
                    timestamp: Date.now()
                }
            };
            
            console.log('🎯 MissionEventService: Sending cargo delivered event:', eventData);
            
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
            
            if (result.success && result.updated_missions.length > 0) {
                console.log(`🎯 MissionEventService: ${result.updated_missions.length} missions updated from cargo delivery`);
                
                // Trigger mission update events
                for (const mission of result.updated_missions) {
                    this.triggerMissionUpdateEvent('cargo_delivered', mission, eventData);
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
        console.log(`🎯 MissionEventService: Triggered missionProgressUpdate event for mission ${mission.id}`);
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
