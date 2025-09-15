/**
 * ActionRegistry - Register all waypoint action classes
 * 
 * Centralizes registration of all waypoint action types with the ActionFactory.
 * This ensures all action classes are available for waypoint execution.
 */

import { ActionFactory, ActionType } from './WaypointAction.js';
import { debug } from '../debug.js';

// Import all action classes
import SpawnShipsAction from './actions/SpawnShipsAction.js';
import PlayCommAction from './actions/PlayCommAction.js';
import ShowMessageAction from './actions/ShowMessageAction.js';
import GiveRewardAction from './actions/GiveRewardAction.js';
import GiveItemAction from './actions/GiveItemAction.js';

/**
 * Register all waypoint action classes with the ActionFactory
 */
export function registerAllActions() {
    debug('WAYPOINTS', '📝 Registering waypoint action classes...');

    try {
        // Register each action type
        ActionFactory.register(ActionType.SPAWN_SHIPS, SpawnShipsAction);
        ActionFactory.register(ActionType.PLAY_COMM, PlayCommAction);
        ActionFactory.register(ActionType.SHOW_MESSAGE, ShowMessageAction);
        ActionFactory.register(ActionType.GIVE_REWARD, GiveRewardAction);
        ActionFactory.register(ActionType.GIVE_ITEM, GiveItemAction);

        // Register additional action types with basic implementations
        ActionFactory.register(ActionType.NEXT_WAYPOINT, createNextWaypointAction());
        ActionFactory.register(ActionType.MISSION_UPDATE, createMissionUpdateAction());
        ActionFactory.register(ActionType.CUSTOM_EVENT, createCustomEventAction());

        const registeredTypes = ActionFactory.getRegisteredTypes();
        debug('WAYPOINTS', `✅ Registered ${registeredTypes.length} action types: ${registeredTypes.join(', ')}`);

        return true;

    } catch (error) {
        console.error('Failed to register waypoint actions:', error);
        return false;
    }
}

/**
 * Create NextWaypointAction class
 * @returns {Class} - NextWaypointAction class
 */
function createNextWaypointAction() {
    return class NextWaypointAction extends (await import('./WaypointAction.js')).WaypointAction {
        async performAction(context) {
            debug('WAYPOINTS', '🔗 Activating next waypoint');
            
            const { missionId, chainId } = this.parameters;
            
            if (window.waypointManager) {
                window.waypointManager.activateNextWaypoint(missionId || chainId);
            }
            
            return {
                success: true,
                missionId: missionId,
                chainId: chainId
            };
        }

        getRequiredParameters() {
            return []; // missionId is optional
        }

        getParameterTypes() {
            return {
                missionId: 'string',
                chainId: 'string'
            };
        }
    };
}

/**
 * Create MissionUpdateAction class
 * @returns {Class} - MissionUpdateAction class
 */
function createMissionUpdateAction() {
    return class MissionUpdateAction extends (await import('./WaypointAction.js')).WaypointAction {
        async performAction(context) {
            debug('WAYPOINTS', '📋 Updating mission status');
            
            const { missionId, status, data } = this.parameters;
            
            if (window.missionEventHandler && missionId) {
                await window.missionEventHandler.updateMissionStatus(
                    missionId,
                    status || 'updated',
                    data || {}
                );
            }
            
            return {
                success: true,
                missionId: missionId,
                status: status
            };
        }

        getRequiredParameters() {
            return ['missionId'];
        }

        getParameterTypes() {
            return {
                missionId: 'string',
                status: 'string',
                data: 'object'
            };
        }
    };
}

/**
 * Create CustomEventAction class
 * @returns {Class} - CustomEventAction class
 */
function createCustomEventAction() {
    return class CustomEventAction extends (await import('./WaypointAction.js')).WaypointAction {
        async performAction(context) {
            debug('WAYPOINTS', '⚡ Dispatching custom event');
            
            const { eventType, eventData } = this.parameters;
            
            // Dispatch custom event
            const customEvent = new CustomEvent(`waypoint_${eventType}`, {
                detail: {
                    waypoint: context.waypoint,
                    eventData: eventData,
                    timestamp: new Date()
                }
            });
            
            document.dispatchEvent(customEvent);
            
            return {
                success: true,
                eventType: eventType,
                eventData: eventData
            };
        }

        getRequiredParameters() {
            return ['eventType'];
        }

        getParameterTypes() {
            return {
                eventType: 'string',
                eventData: 'object'
            };
        }
    };
}

/**
 * Get all available action types with descriptions
 * @returns {Array} - Action type information
 */
export function getActionTypeInfo() {
    return [
        {
            type: ActionType.SPAWN_SHIPS,
            name: 'Spawn Ships',
            description: 'Spawn enemy or friendly ships with formation patterns',
            category: 'Combat',
            parameters: ['shipType', 'minCount', 'maxCount', 'formation', 'faction']
        },
        {
            type: ActionType.PLAY_COMM,
            name: 'Play Communication',
            description: 'Play audio communication with optional subtitles',
            category: 'Audio',
            parameters: ['audioFile', 'subtitle', 'volume', 'speaker']
        },
        {
            type: ActionType.SHOW_MESSAGE,
            name: 'Show Message',
            description: 'Display text message to player with optional audio',
            category: 'UI',
            parameters: ['title', 'message', 'duration', 'audioFileId']
        },
        {
            type: ActionType.GIVE_REWARD,
            name: 'Give Reward',
            description: 'Award rewards using reward package system',
            category: 'Rewards',
            parameters: ['rewardPackageId', 'bonusMultiplier', 'message']
        },
        {
            type: ActionType.GIVE_ITEM,
            name: 'Give Item',
            description: 'Add items to player inventory',
            category: 'Items',
            parameters: ['itemId', 'quantity', 'quality', 'level']
        },
        {
            type: ActionType.NEXT_WAYPOINT,
            name: 'Next Waypoint',
            description: 'Activate next waypoint in mission chain',
            category: 'Navigation',
            parameters: ['missionId', 'chainId']
        },
        {
            type: ActionType.MISSION_UPDATE,
            name: 'Mission Update',
            description: 'Update mission status and data',
            category: 'Missions',
            parameters: ['missionId', 'status', 'data']
        },
        {
            type: ActionType.CUSTOM_EVENT,
            name: 'Custom Event',
            description: 'Dispatch custom game event',
            category: 'Events',
            parameters: ['eventType', 'eventData']
        }
    ];
}

/**
 * Validate action configuration
 * @param {Object} actionConfig - Action configuration
 * @returns {Object} - Validation result
 */
export function validateActionConfig(actionConfig) {
    const errors = [];
    
    if (!actionConfig.type) {
        errors.push('Action type is required');
    } else if (!Object.values(ActionType).includes(actionConfig.type)) {
        errors.push(`Unknown action type: ${actionConfig.type}`);
    }
    
    if (!actionConfig.parameters || typeof actionConfig.parameters !== 'object') {
        errors.push('Action parameters must be an object');
    }
    
    // Type-specific validation
    try {
        if (actionConfig.type && ActionFactory.registeredActions.has(actionConfig.type)) {
            const ActionClass = ActionFactory.registeredActions.get(actionConfig.type);
            const tempAction = new ActionClass(actionConfig.type, actionConfig.parameters);
            const validation = tempAction.validate();
            
            if (!validation.valid) {
                errors.push(...validation.errors);
            }
        }
    } catch (error) {
        errors.push(`Action validation failed: ${error.message}`);
    }
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

/**
 * Create action example configurations for testing
 * @returns {Object} - Example configurations by action type
 */
export function getActionExamples() {
    return {
        [ActionType.SPAWN_SHIPS]: {
            type: ActionType.SPAWN_SHIPS,
            parameters: {
                shipType: 'enemy_fighter',
                minCount: 2,
                maxCount: 4,
                formation: 'triangle',
                faction: 'pirates',
                behavior: 'aggressive'
            }
        },
        
        [ActionType.PLAY_COMM]: {
            type: ActionType.PLAY_COMM,
            parameters: {
                audioFile: 'mission_briefing_01.mp3',
                subtitle: 'Commander, you have a new mission assignment.',
                speaker: 'Command',
                volume: 0.8
            }
        },
        
        [ActionType.SHOW_MESSAGE]: {
            type: ActionType.SHOW_MESSAGE,
            parameters: {
                title: 'Mission Update',
                message: 'Proceed to the next waypoint to continue your mission.',
                duration: 5000,
                messageType: 'mission',
                audioFileId: 'notification_chime.mp3'
            }
        },
        
        [ActionType.GIVE_REWARD]: {
            type: ActionType.GIVE_REWARD,
            parameters: {
                rewardPackageId: 'mission_complete',
                bonusMultiplier: 1.2,
                message: 'Mission completed successfully!'
            }
        },
        
        [ActionType.GIVE_ITEM]: {
            type: ActionType.GIVE_ITEM,
            parameters: {
                itemId: 'star_chart_fragment',
                quantity: 1,
                quality: 'rare',
                level: 3
            }
        },
        
        [ActionType.NEXT_WAYPOINT]: {
            type: ActionType.NEXT_WAYPOINT,
            parameters: {
                missionId: 'tutorial_mission_01'
            }
        },
        
        [ActionType.MISSION_UPDATE]: {
            type: ActionType.MISSION_UPDATE,
            parameters: {
                missionId: 'tutorial_mission_01',
                status: 'objective_completed',
                data: { objectiveId: 'reach_waypoint_1' }
            }
        },
        
        [ActionType.CUSTOM_EVENT]: {
            type: ActionType.CUSTOM_EVENT,
            parameters: {
                eventType: 'discovery_made',
                eventData: { discoveryType: 'ancient_artifact', location: 'asteroid_field' }
            }
        }
    };
}

// Auto-register actions when module is loaded
registerAllActions();

export default {
    registerAllActions,
    getActionTypeInfo,
    validateActionConfig,
    getActionExamples
};
