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
    
    /**
     * Handle waypoint completion - check if mission should be completed
     * @param {Object} waypoint - Completed waypoint
     */
    async handleWaypointCompleted(waypoint) {
        debug('MISSIONS', `🎯 MissionEventHandler: Waypoint completed: ${waypoint.name} (mission: ${waypoint.missionId})`);
        console.log('🎯 MISSION COMPLETION: handleWaypointCompleted called for waypoint:', waypoint.name, 'mission:', waypoint.missionId);
        
        if (!waypoint.missionId) {
            debug('MISSIONS', '⚠️ Waypoint has no mission ID, skipping mission completion check');
            return;
        }
        
        // Check if this was the last waypoint in the mission
        const waypointManager = window.waypointManager;
        if (!waypointManager) {
            debug('MISSIONS', '❌ WaypointManager not available for mission completion check');
            return;
        }
        
        // Find all waypoints for this mission
        const missionWaypoints = Array.from(waypointManager.activeWaypoints.values())
            .filter(wp => wp.missionId === waypoint.missionId);
        
        // Check if all waypoints are completed
        const pendingWaypoints = missionWaypoints.filter(wp => wp.status === 'pending');
        const completedWaypoints = missionWaypoints.filter(wp => wp.status === 'completed');
        
        debug('MISSIONS', `🎯 Mission ${waypoint.missionId} status: ${completedWaypoints.length} completed, ${pendingWaypoints.length} pending`);
        
        // Wait a bit longer to ensure waypoint manager has processed next waypoint activation
        setTimeout(async () => {
            // Re-check waypoint status after delay
            const updatedMissionWaypoints = Array.from(waypointManager.activeWaypoints.values())
                .filter(wp => wp.missionId === waypoint.missionId);
            const updatedPendingWaypoints = updatedMissionWaypoints.filter(wp => wp.status === 'pending');
            const updatedCompletedWaypoints = updatedMissionWaypoints.filter(wp => wp.status === 'completed');
            
            debug('MISSIONS', `🎯 Mission ${waypoint.missionId} DELAYED status check: ${updatedCompletedWaypoints.length} completed, ${updatedPendingWaypoints.length} pending`);
            console.log('🎯 MISSION COMPLETION: Delayed status check for mission:', waypoint.missionId);
            console.log('🎯 MISSION COMPLETION: Total waypoints:', updatedMissionWaypoints.length);
            console.log('🎯 MISSION COMPLETION: Completed waypoints:', updatedCompletedWaypoints.length);
            console.log('🎯 MISSION COMPLETION: Pending waypoints:', updatedPendingWaypoints.length);
            
            // Only complete mission if ALL waypoints are completed AND no pending ones remain
            if (updatedPendingWaypoints.length === 0 && updatedCompletedWaypoints.length > 0 && 
                updatedCompletedWaypoints.length === updatedMissionWaypoints.length) {
                
                debug('MISSIONS', `🏁 Mission ${waypoint.missionId} FULLY completed - removing from active missions`);
                console.log('🏁 MISSION COMPLETION: Mission FULLY completed!', waypoint.missionId);
                
                // Get mission data to check for completion screen suppression
                const missionData = await this.getMissionData(waypoint.missionId);
                
                // Award mission completion rewards
                await this.awardMissionCompletionRewards(waypoint.missionId, missionData);
                
                // Clear waypoint targets when mission completes
                const tcm = window.targetComputerManager;
                if (tcm && tcm.currentTarget) {
                    const currentTarget = tcm.currentTarget;
                    if (currentTarget && (
                        currentTarget.name?.includes('Waypoint') ||
                        currentTarget.isVirtual ||
                        updatedMissionWaypoints.some(wp => wp.name === currentTarget.name)
                    )) {
                        debug('MISSIONS', `🎯 Clearing waypoint target after mission completion: ${currentTarget.name}`);
                        tcm.clearCurrentTarget();
                    }
                }
                
                // Mark mission as completed but don't delete yet - let user dismiss it
                if (window.missionAPI && window.missionAPI.activeMissions) {
                    const mission = window.missionAPI.activeMissions.get(waypoint.missionId);
                    if (mission) {
                        mission.status = 'completed';
                        mission.completedAt = Date.now();
                        debug('MISSIONS', `✅ Marked mission as completed: ${waypoint.missionId}`);
                    }
                }
                
                // Mark in local cache as completed too
                const localMission = this.activeMissions.get(waypoint.missionId);
                if (localMission) {
                    localMission.status = 'completed';
                    localMission.completedAt = Date.now();
                    debug('MISSIONS', `✅ Marked local mission as completed: ${waypoint.missionId}`);
                }
                
                // Don't refresh HUD yet - let the completion screen show first
                debug('MISSIONS', '🎉 Mission completion ready - will show rewards in HUD');
                
                debug('MISSIONS', `✅ Mission ${waypoint.missionId} completion handled successfully`);
            } else {
                debug('MISSIONS', `🔄 Mission ${waypoint.missionId} still in progress - ${updatedPendingWaypoints.length} waypoints remaining`);
            }
        }, 200); // Increased delay to 200ms
        
    }

    /**
     * Get mission data from waypoint manager or mission API
     * @param {string} missionId - Mission ID
     * @returns {Object|null} - Mission data
     */
    async getMissionData(missionId) {
        try {
            // Try to get from waypoint manager first (for test missions)
            if (window.waypointManager && window.waypointManager.getTestMissionData) {
                const testMissionData = window.waypointManager.getTestMissionData(missionId);
                if (testMissionData) return testMissionData;
            }
            
            // Try to get from mission API
            if (window.missionAPI && window.missionAPI.activeMissions) {
                const missionData = window.missionAPI.activeMissions.get(missionId);
                if (missionData) return missionData;
            }
            
            return null;
        } catch (error) {
            debug('MISSIONS', `⚠️ Failed to get mission data for ${missionId}:`, error);
            return null;
        }
    }

    /**
     * Award mission completion rewards
     * @param {string} missionId - Mission ID
     * @param {Object} missionData - Mission data (optional)
     */
    async awardMissionCompletionRewards(missionId, missionData = null) {
        debug('MISSIONS', `🎁 Awarding mission completion rewards for: ${missionId}`);
        console.log('🎁 MISSION COMPLETION: awardMissionCompletionRewards called for:', missionId);

        try {
            // Check if this is the exploration test mission
            if (missionId.includes('waypoint_test_exploration')) {
                // Award exploration mission rewards (Reward Package 2)
                const rewards = {
                    rewardPackageId: 2,
                    credits: 250, // Mid-range for exploration (100-300)
                    factionBonuses: {
                        terran_republic_alliance: 3 // Mid-range (2-5)
                    },
                    cards: {
                        count: 2, // Mid-range (1-3)
                        minTier: 2,
                        maxTier: 4,
                        preferredTypes: ['scanner', 'long_range_sensor'],
                        names: [
                            'Deep Space Scanner Mk-II',
                            'Long Range Sensor Array'
                        ],
                        types: ['scanner', 'long_range_sensor']
                    }
                };

                // Show mission completion in HUD instead of separate screen
                const displayMissionData = missionData || {
                    title: 'Deep Space Survey Mission',
                    description: 'Conduct exploration survey of designated sectors. Investigate anomalous readings and report discoveries.',
                    faction: 'terran_republic_alliance'
                };

                // Check if completion screen should be suppressed
                if (missionData?.suppressCompletionScreen) {
                    debug('MISSIONS', '🎉 Mission completion display suppressed by flag');
                } else {
                    // Show completion in mission HUD
                    if (window.starfieldManager?.missionStatusHUD) {
                        window.starfieldManager.missionStatusHUD.showMissionCompletion(
                            missionId,
                            displayMissionData,
                            rewards
                        );
                        debug('MISSIONS', '🎉 Mission completion shown in HUD');
                    } else {
                        debug('MISSIONS', '⚠️ Mission HUD not available for completion display');
                    }
                }

                // Log rewards for debugging
                debug('MISSIONS', `🎁 Mission rewards awarded:`, rewards);
                
                return { success: true, rewards };
            } else {
                debug('MISSIONS', `⚠️ No specific rewards defined for mission: ${missionId}`);
                
                // Generic mission completion notification
                if (window.starfieldManager && window.starfieldManager.showHUDEphemeral) {
                    window.starfieldManager.showHUDEphemeral(
                        'MISSION COMPLETE',
                        'Mission objectives completed successfully!',
                        5000
                    );
                }
                
                return { success: true, rewards: null };
            }
        } catch (error) {
            console.error('Failed to award mission completion rewards:', error);
            return { success: false, error: error.message };
        }
    }
}
