import { debug } from '../debug.js';

/**
 * Mission Event Handler
 * Integrates mission system with game events
 * Handles mission progress updates based on game actions
 */

export class MissionEventHandler {
    constructor(starfieldManager) {
        this.starfieldManager = starfieldManager;
        this.activeMissions = new Map(); // mission_id -> mission data
        this.missionAPI = null; // Will be set when needed
        
        // Initialize event listeners
        this.bindGameEvents();
        
debug('MISSIONS', 'Mission Event Handler initialized');
    }
    
    bindGameEvents() {
        // Listen for enemy destruction events
        if (this.starfieldManager) {
            // Monkey patch the existing enemy destruction handling
            const originalCreateExplosionEffect = this.starfieldManager.createExplosionEffect;
            
            if (originalCreateExplosionEffect) {
                this.starfieldManager.createExplosionEffect = (position, scale, target, weapon) => {
                    // Call original function
                    const result = originalCreateExplosionEffect.call(this.starfieldManager, position, scale, target, weapon);
                    
                    // Handle mission events if target was destroyed
                    if (target && target.ship && target.ship.hull <= 0) {
                        this.handleEnemyDestroyed(target.ship);
                    }
                    
                    return result;
                };
            }
        }
    }
    
    async handleEnemyDestroyed(enemy) {
        try {
            const enemyData = {
                enemy_type: enemy.shipType || 'unknown',
                enemy_id: enemy.id || 'unknown',
                location: this.getCurrentLocation(),
                hull: enemy.hull,
                faction: enemy.faction || 'hostile'
            };
            
debug('MISSIONS', '💥 Enemy destroyed, checking missions:', enemyData);
            
            // Send to mission API
            const response = await fetch('/api/missions/events/enemy_destroyed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...enemyData,
                    player_context: this.getPlayerContext()
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.updated_missions && data.updated_missions.length > 0) {
debug('MISSIONS', `🎯 Updated ${data.updated_missions.length} missions from enemy destruction`);
                    
                    // Process mission updates
                    for (const mission of data.updated_missions) {
                        this.handleMissionUpdate(mission);
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Failed to handle enemy destroyed event:', error);
        }
    }
    
    async handleLocationReached(location, coordinates = {}) {
        try {
            const locationData = {
                location: location,
                coordinates: coordinates,
                timestamp: new Date().toISOString()
            };
            
debug('MISSIONS', '📍 Location reached, checking missions:', locationData);
            
            // Send to mission API
            const response = await fetch('/api/missions/events/location_reached', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...locationData,
                    player_context: this.getPlayerContext()
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.updated_missions && data.updated_missions.length > 0) {
debug('MISSIONS', `🎯 Updated ${data.updated_missions.length} missions from location reached`);
                    
                    // Process mission updates
                    for (const mission of data.updated_missions) {
                        this.handleMissionUpdate(mission);
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Failed to handle location reached event:', error);
        }
    }
    
    async handleCargoDelivered(cargoType, deliveryLocation, cargoValue = 0) {
        try {
            const cargoData = {
                cargo_type: cargoType,
                delivery_location: deliveryLocation,
                cargo_value: cargoValue,
                timestamp: new Date().toISOString()
            };
            
debug('MISSIONS', '📦 Cargo delivered, checking missions:', cargoData);
            
            // Send to mission API
            const response = await fetch('/api/missions/events/cargo_delivered', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ...cargoData,
                    player_context: this.getPlayerContext()
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.updated_missions && data.updated_missions.length > 0) {
debug('MISSIONS', `🎯 Updated ${data.updated_missions.length} missions from cargo delivery`);
                    
                    // Process mission updates
                    for (const mission of data.updated_missions) {
                        this.handleMissionUpdate(mission);
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ Failed to handle cargo delivered event:', error);
        }
    }
    
    handleMissionUpdate(mission) {
        // Update local mission cache
        this.activeMissions.set(mission.id, mission);
        
        // Show mission progress notifications
        this.showMissionNotification(mission);
        
        // Process any frontend hooks
        if (mission.hooks) {
            this.processResponseHooks(mission.hooks);
        }
    }
    
    showMissionNotification(mission) {
        let message = '';
        let notificationType = 'info';
        
        switch (mission.state) {
            case 'Achieved':
                message = `Mission objective completed: ${mission.title}`;
                notificationType = 'success';
                break;
                
            case 'Completed':
                message = `Mission completed: ${mission.title}`;
                notificationType = 'success';
                this.playMissionCompleteAudio();
                break;
                
            case 'Botched':
                message = `Mission failed: ${mission.title}`;
                notificationType = 'error';
                break;
                
            default:
                message = `Mission updated: ${mission.title}`;
        }
        
        this.showNotification(message, notificationType);
        
        // Update mission progress display if available
        this.updateMissionProgressDisplay(mission);
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `mission-notification ${type}`;
        
        const colors = {
            'info': '#00ff41',
            'success': '#44ff44', 
            'error': '#ff4444',
            'warning': '#ffff44'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid ${colors[type]};
            color: ${colors[type]};
            padding: 15px 20px;
            font-family: 'VT323', monospace;
            font-size: 16px;
            z-index: 4000;
            border-radius: 5px;
            box-shadow: 0 0 20px ${colors[type]}40;
            max-width: 400px;
            word-wrap: break-word;
        `;
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transition = 'opacity 0.5s';
                
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 500);
            }
        }, 4000);
    }
    
    playMissionCompleteAudio() {
        try {
            if (this.starfieldManager?.starfieldAudioManager) {
                // Play mission complete sound if available
                this.starfieldManager.starfieldAudioManager.play('explosion', 0.3); // Placeholder sound
            }
        } catch (error) {
            console.warn('⚠️ Could not play mission complete audio:', error);
        }
    }
    
    updateMissionProgressDisplay(mission) {
        // Update any active mission UI displays
        if (this.starfieldManager?.dockingInterface?.missionBoard) {
            const missionBoard = this.starfieldManager.dockingInterface.missionBoard;
            
            // Update accepted missions list
            const existingIndex = missionBoard.acceptedMissions.findIndex(m => m.id === mission.id);
            if (existingIndex >= 0) {
                missionBoard.acceptedMissions[existingIndex] = mission;
            }
        }
    }
    
    processResponseHooks(hooks) {
        hooks.forEach(hook => {
            switch (hook.type) {
                case 'spawn_enemies':
debug('MISSIONS', 'Mission: Spawning enemies', hook.data);
                    this.spawnMissionEnemies(hook.data);
                    break;
                    
                case 'play_audio':
debug('MISSIONS', '🔊 Mission: Playing audio', hook.data.sound);
                    this.playAudio(hook.data.sound, hook.data.volume);
                    break;
                    
                case 'show_notification':
                    this.showNotification(hook.data.message, hook.data.style || 'info');
                    break;
                    
                case 'award_rewards':
                    debug('MISSIONS', 'Mission: Awarding rewards', hook.data);
                    this.awardRewards(hook.data);
                    break;
                    
                default:
                    debug('MISSIONS', 'Unhandled mission hook:', hook.type, hook.data);
            }
        });
    }
    
    spawnMissionEnemies(data) {
        // Integrate with existing enemy spawning if available
        if (this.starfieldManager?.createTargetDummyShips) {
debug('TARGETING', 'Spawning mission enemies using target dummy system');
            
            // Use existing Q-key dummy spawning as a base
            // This would need to be enhanced to spawn specific enemy types
            this.starfieldManager.createTargetDummyShips();
        } else {
            console.warn('⚠️ Enemy spawning not available - mission enemies not spawned');
        }
    }
    
    playAudio(soundFile, volume = 0.7) {
        try {
            if (this.starfieldManager?.starfieldAudioManager) {
                // Map mission sounds to available game sounds
                const soundMap = {
                    'mission_accepted.wav': 'command',
                    'mission_complete.wav': 'explosion',
                    'mission_failed.wav': 'command_failed',
                    'objective_complete.wav': 'command'
                };
                
                const gameSound = soundMap[soundFile] || 'command';
                this.starfieldManager.starfieldAudioManager.play(gameSound, volume);
            }
        } catch (error) {
            console.warn('⚠️ Could not play mission audio:', error);
        }
    }
    
    awardRewards(rewardData) {
        // Process reward package
        if (rewardData.reward_package_id) {
debug('UI', `💰 Processing reward package ${rewardData.reward_package_id}`);
            
            // This would integrate with the game's reward system
            // For now, just show notification
            this.showNotification(`Rewards awarded! Check your credits and inventory.`, 'success');
        }
    }
    
    getCurrentLocation() {
        // Get current location from game state
        if (this.starfieldManager?.currentSystem) {
            return this.starfieldManager.currentSystem;
        }
        
        // Default fallback
        return 'terra_prime';
    }
    
    getPlayerContext() {
        // Build player context for mission API
        const context = {
            timestamp: new Date().toISOString(),
            location: this.getCurrentLocation()
        };
        
        if (this.starfieldManager?.ship) {
            context.ship = {
                type: this.starfieldManager.ship.shipType,
                hull: this.starfieldManager.ship.hull,
                energy: this.starfieldManager.ship.energy,
                position: this.starfieldManager.ship.position
            };
        }
        
        return context;
    }
    
    // Public API for manual mission events
    async updateMissionProgress(missionId, objectiveId = null, eventData = {}) {
        try {
            const response = await fetch(`/api/missions/${missionId}/progress`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    objective_id: objectiveId,
                    event_data: {
                        ...eventData,
                        player_context: this.getPlayerContext()
                    }
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.handleMissionUpdate(data.mission);
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Failed to update mission progress:', error);
            return false;
        }
    }
    
    async loadActiveMissions() {
        try {
            const response = await fetch(`/api/missions?location=${this.getCurrentLocation()}`);
            
            if (response.ok) {
                const data = await response.json();
                
                // Filter for accepted missions only
                const acceptedMissions = data.missions.filter(m => m.state === 'Accepted');
                
                // Update local cache
                this.activeMissions.clear();
                acceptedMissions.forEach(mission => {
                    this.activeMissions.set(mission.id, mission);
                });
                
debug('MISSIONS', `🎯 Loaded ${acceptedMissions.length} active missions`);
                return acceptedMissions;
            }
            
        } catch (error) {
            console.error('❌ Failed to load active missions:', error);
        }
        
        return [];
    }
    
    getActiveMissions() {
        return Array.from(this.activeMissions.values());
    }
    
    getMission(missionId) {
        return this.activeMissions.get(missionId);
    }
}
