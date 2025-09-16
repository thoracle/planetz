/**
 * ActionRegistry - Centralized registry for all waypoint action types
 * 
 * Provides a factory pattern for creating waypoint actions dynamically.
 * All action classes are registered here for easy access and creation.
 */

import { debug } from '../debug.js';

// Import all action classes
import SpawnShipsAction from './actions/SpawnShipsAction.js';
import PlayCommAction from './actions/PlayCommAction.js';
import ShowMessageAction from './actions/ShowMessageAction.js';
import GiveRewardAction from './actions/GiveRewardAction.js';
import GiveItemAction from './actions/GiveItemAction.js';

/**
 * Base WaypointAction class for all actions
 */
export class WaypointAction {
    constructor(parameters = {}) {
        this.parameters = parameters;
        this.executionTime = null;
        this.success = false;
        this.error = null;
    }

    /**
     * Execute the action with the given parameters
     * @returns {Promise<Object>} Execution result
     */
    async execute() {
        const startTime = Date.now();
        
        try {
            debug('WAYPOINTS', `🎬 Executing ${this.constructor.name}...`);
            
            const result = await this.performAction();
            
            this.executionTime = Date.now() - startTime;
            this.success = true;
            
            debug('WAYPOINTS', `✅ ${this.constructor.name} completed in ${this.executionTime}ms`);
            
            return {
                success: true,
                executionTime: this.executionTime,
                result: result
            };
            
        } catch (error) {
            this.executionTime = Date.now() - startTime;
            this.success = false;
            this.error = error;
            
            debug('WAYPOINTS', `❌ ${this.constructor.name} failed: ${error.message}`);
            
            return {
                success: false,
                executionTime: this.executionTime,
                error: error.message
            };
        }
    }

    /**
     * Perform the specific action logic
     * Override this method in subclasses
     * @returns {Promise<any>} Action result
     */
    async performAction() {
        throw new Error('performAction must be implemented by subclass');
    }
}

/**
 * Simple action classes for actions that don't need separate files
 */

class NextWaypointAction extends WaypointAction {
    constructor(type, parameters) {
        super(parameters);
        this.type = type;
    }
    
    async performAction() {
        debug('WAYPOINTS', '🔗 Activating next waypoint');
        
        const { nextWaypointId, chainId } = this.parameters;
        
        if (window.waypointManager && nextWaypointId) {
            try {
                await window.waypointManager.activateWaypoint(nextWaypointId);
                return { nextWaypointId, activated: true };
            } catch (error) {
                debug('WAYPOINTS', `Failed to activate next waypoint ${nextWaypointId}: ${error.message}`);
                throw error;
            }
        }
        
        return { activated: false, reason: 'No waypoint manager or next waypoint ID' };
    }
}

class MissionUpdateAction extends WaypointAction {
    constructor(type, parameters) {
        super(parameters);
        this.type = type;
    }
    
    async performAction() {
        debug('WAYPOINTS', '📋 Updating mission status');
        
        const { missionId, status, progress } = this.parameters;
        
        if (window.missionEventHandler && missionId) {
            try {
                const result = await window.missionEventHandler.updateMissionStatus({
                    mission_id: missionId,
                    status: status,
                    progress: progress
                });
                return result;
            } catch (error) {
                debug('WAYPOINTS', `Failed to update mission ${missionId}: ${error.message}`);
                throw error;
            }
        }
        
        return { updated: false, reason: 'No mission event handler or mission ID' };
    }
}

class CustomEventAction extends WaypointAction {
    constructor(type, parameters) {
        super(parameters);
        this.type = type;
    }
    
    async performAction() {
        debug('WAYPOINTS', '🎪 Dispatching custom event');
        
        const { eventType, eventData } = this.parameters;
        
        if (eventType) {
            const customEvent = new CustomEvent(eventType, {
                detail: eventData || {}
            });
            
            document.dispatchEvent(customEvent);
            
            return { eventType, dispatched: true };
        }
        
        return { dispatched: false, reason: 'No event type specified' };
    }
}

/**
 * ActionRegistry class - Factory for creating waypoint actions
 */
export class ActionRegistry {
    constructor() {
        this.actions = {};
        
        // Register all action types
        this.registerAllActions();
        
        debug('WAYPOINTS', `📝 ActionRegistry initialized with ${Object.keys(this.actions).length} action types`);
    }

    /**
     * Register all available action types
     */
    registerAllActions() {
        // Register imported action classes
        this.register('spawn_ships', SpawnShipsAction);
        this.register('play_comm', PlayCommAction);
        this.register('show_message', ShowMessageAction);
        this.register('give_reward', GiveRewardAction);
        this.register('give_item', GiveItemAction);
        
        // Register inline action classes
        this.register('next_waypoint', NextWaypointAction);
        this.register('mission_update', MissionUpdateAction);
        this.register('custom_event', CustomEventAction);
    }

    /**
     * Register an action class with a type name
     * @param {string} actionType - The action type identifier
     * @param {Class} actionClass - The action class constructor
     */
    register(actionType, actionClass) {
        if (typeof actionType !== 'string') {
            throw new Error('Action type must be a string');
        }
        
        if (typeof actionClass !== 'function') {
            throw new Error('Action class must be a constructor function');
        }
        
        this.actions[actionType] = actionClass;
        debug('WAYPOINTS', `✅ Registered action type: ${actionType}`);
    }

    /**
     * Create an action instance of the specified type
     * @param {string} actionType - The action type to create
     * @param {Object} parameters - Parameters for the action
     * @returns {WaypointAction} Action instance
     */
    create(actionType, parameters = {}) {
        const ActionClass = this.actions[actionType];
        
        if (!ActionClass) {
            const availableTypes = Object.keys(this.actions).join(', ');
            throw new Error(`Unknown action type: ${actionType}. Available types: ${availableTypes}`);
        }
        
        try {
            const action = new ActionClass(actionType, parameters);
            debug('WAYPOINTS', `🏭 Created ${actionType} action`);
            return action;
        } catch (error) {
            debug('WAYPOINTS', `❌ Failed to create ${actionType} action: ${error.message}`);
            throw new Error(`Failed to create ${actionType} action: ${error.message}`);
        }
    }

    /**
     * Get all registered action types
     * @returns {string[]} Array of action type names
     */
    getActionTypes() {
        return Object.keys(this.actions);
    }

    /**
     * Check if an action type is registered
     * @param {string} actionType - The action type to check
     * @returns {boolean} True if registered
     */
    hasActionType(actionType) {
        return actionType in this.actions;
    }
}

export default ActionRegistry;