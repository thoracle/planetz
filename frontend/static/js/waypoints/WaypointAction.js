/**
 * WaypointAction - Base class for waypoint actions
 * 
 * Defines the interface and common functionality for all waypoint actions.
 * Actions are executed when a waypoint is triggered by player proximity.
 */

import { debug } from '../debug.js';

// Action type enumeration
export const ActionType = {
    SPAWN_SHIPS: 'spawn_ships',
    PLAY_COMM: 'play_comm',
    SHOW_MESSAGE: 'show_message',
    NEXT_WAYPOINT: 'next_waypoint',
    GIVE_ITEM: 'give_item',
    GIVE_REWARD: 'give_reward',
    MISSION_UPDATE: 'mission_update',
    CUSTOM_EVENT: 'custom_event'
};

// Action priority levels
export const ActionPriority = {
    LOW: 1,
    NORMAL: 2,
    HIGH: 3,
    CRITICAL: 4
};

/**
 * Base class for all waypoint actions
 */
export class WaypointAction {
    constructor(type, parameters = {}) {
        this.type = type;
        this.parameters = parameters;
        this.priority = parameters.priority || ActionPriority.NORMAL;
        this.delay = parameters.delay || 0;
        this.repeatable = parameters.repeatable || false;
        this.conditions = parameters.conditions || [];
        this.executed = false;
        this.executionTime = null;
        this.executionResult = null;
    }

    /**
     * Execute the action
     * @param {Object} context - Execution context (waypoint, player, game state)
     * @returns {Promise<Object>} - Execution result
     */
    async execute(context) {
        const startTime = performance.now();
        
        try {
            // Check conditions before execution
            if (!this.checkConditions(context)) {
                debug('WAYPOINTS', `⚠️ Action conditions not met: ${this.type}`);
                return { success: false, reason: 'conditions_not_met' };
            }

            // Apply delay if specified
            if (this.delay > 0) {
                debug('WAYPOINTS', `⏳ Delaying action ${this.type} by ${this.delay}ms`);
                await this.sleep(this.delay);
            }

            // Execute the action
            debug('WAYPOINTS', `🎬 Executing action: ${this.type}`);
            const result = await this.performAction(context);

            // Mark as executed
            this.executed = true;
            this.executionTime = performance.now() - startTime;
            this.executionResult = result;

            debug('WAYPOINTS', `✅ Action completed: ${this.type} (${this.executionTime.toFixed(2)}ms)`);
            return { success: true, result, executionTime: this.executionTime };

        } catch (error) {
            this.executionTime = performance.now() - startTime;
            this.executionResult = { error: error.message };

            debug('P1', `❌ Action failed: ${this.type}: ${error.message}`);
            return { success: false, error: error.message, executionTime: this.executionTime };
        }
    }

    /**
     * Perform the actual action (to be implemented by subclasses)
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} - Action result
     */
    async performAction(context) {
        throw new Error(`performAction must be implemented by ${this.constructor.name}`);
    }

    /**
     * Check if action conditions are met
     * @param {Object} context - Execution context
     * @returns {boolean} - Whether conditions are met
     */
    checkConditions(context) {
        if (this.conditions.length === 0) {
            return true; // No conditions to check
        }

        for (const condition of this.conditions) {
            if (!this.evaluateCondition(condition, context)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Evaluate a single condition
     * @param {Object} condition - Condition to evaluate
     * @param {Object} context - Execution context
     * @returns {boolean} - Whether condition is met
     */
    evaluateCondition(condition, context) {
        const { type, operator, value, property } = condition;

        switch (type) {
            case 'hull_damage':
                const hullDamage = this.getPlayerHullDamage(context);
                return this.compareValues(hullDamage, operator, value);

            case 'mission_timer':
                const timeRemaining = this.getMissionTimeRemaining(context);
                return this.compareValues(timeRemaining, operator, value);

            case 'player_credits':
                const credits = this.getPlayerCredits(context);
                return this.compareValues(credits, operator, value);

            case 'faction_reputation':
                const reputation = this.getFactionReputation(context, property);
                return this.compareValues(reputation, operator, value);

            case 'has_item':
                return this.playerHasItem(context, property, value);

            case 'custom':
                return this.evaluateCustomCondition(condition, context);

            default:
                debug('P1', `Unknown condition type: ${type}`);
                return true; // Default to true for unknown conditions
        }
    }

    /**
     * Compare values using operator
     * @param {*} actual - Actual value
     * @param {string} operator - Comparison operator
     * @param {*} expected - Expected value
     * @returns {boolean} - Comparison result
     */
    compareValues(actual, operator, expected) {
        switch (operator) {
            case 'equals':
            case '==':
                return actual === expected;
            case 'not_equals':
            case '!=':
                return actual !== expected;
            case 'greater_than':
            case '>':
                return actual > expected;
            case 'greater_equal':
            case '>=':
                return actual >= expected;
            case 'less_than':
            case '<':
                return actual < expected;
            case 'less_equal':
            case '<=':
                return actual <= expected;
            default:
                debug('P1', `Unknown operator: ${operator}`);
                return true;
        }
    }

    /**
     * Validate action parameters
     * @returns {Object} - Validation result
     */
    validate() {
        const errors = [];

        // Check required parameters (to be implemented by subclasses)
        const requiredParams = this.getRequiredParameters();
        for (const param of requiredParams) {
            if (!(param in this.parameters)) {
                errors.push(`Missing required parameter: ${param}`);
            }
        }

        // Check parameter types (to be implemented by subclasses)
        const paramTypes = this.getParameterTypes();
        for (const [param, expectedType] of Object.entries(paramTypes)) {
            if (param in this.parameters) {
                const actualType = typeof this.parameters[param];
                if (actualType !== expectedType) {
                    errors.push(`Parameter ${param} should be ${expectedType}, got ${actualType}`);
                }
            }
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get required parameters (to be implemented by subclasses)
     * @returns {Array<string>} - Required parameter names
     */
    getRequiredParameters() {
        return [];
    }

    /**
     * Get parameter types (to be implemented by subclasses)
     * @returns {Object} - Parameter name to type mapping
     */
    getParameterTypes() {
        return {};
    }

    /**
     * Reset action for re-execution (if repeatable)
     */
    reset() {
        if (this.repeatable) {
            this.executed = false;
            this.executionTime = null;
            this.executionResult = null;
            debug('WAYPOINTS', `🔄 Reset action: ${this.type}`);
        }
    }

    /**
     * Get action summary for debugging
     * @returns {Object} - Action summary
     */
    getSummary() {
        return {
            type: this.type,
            priority: this.priority,
            delay: this.delay,
            repeatable: this.repeatable,
            executed: this.executed,
            executionTime: this.executionTime,
            hasConditions: this.conditions.length > 0,
            parameterCount: Object.keys(this.parameters).length
        };
    }

    // ========== UTILITY METHODS ==========

    /**
     * Sleep for specified milliseconds
     * @param {number} ms - Milliseconds to sleep
     * @returns {Promise} - Promise that resolves after delay
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get player hull damage percentage
     * @param {Object} context - Execution context
     * @returns {number} - Hull damage percentage (0-100)
     */
    getPlayerHullDamage(context) {
        if (window.starfieldManager && window.starfieldManager.playerShip) {
            const ship = window.starfieldManager.playerShip;
            const maxHull = ship.maxHull || 100;
            const currentHull = ship.currentHull || maxHull;
            return ((maxHull - currentHull) / maxHull) * 100;
        }
        return 0;
    }

    /**
     * Get mission time remaining
     * @param {Object} context - Execution context
     * @returns {number} - Time remaining in seconds
     */
    getMissionTimeRemaining(context) {
        // This would integrate with mission system
        // For now, return a placeholder value
        return 600; // 10 minutes
    }

    /**
     * Get player credits
     * @param {Object} context - Execution context
     * @returns {number} - Player credits
     */
    getPlayerCredits(context) {
        if (window.playerCredits) {
            return window.playerCredits.getCredits();
        }
        return 0;
    }

    /**
     * Get faction reputation
     * @param {Object} context - Execution context
     * @param {string} factionName - Faction name
     * @returns {number} - Reputation value
     */
    getFactionReputation(context, factionName) {
        // This would integrate with faction system
        // For now, return a placeholder value
        return 0;
    }

    /**
     * Check if player has item
     * @param {Object} context - Execution context
     * @param {string} itemId - Item ID
     * @param {number} quantity - Required quantity
     * @returns {boolean} - Whether player has item
     */
    playerHasItem(context, itemId, quantity = 1) {
        if (window.playerInventory) {
            return window.playerInventory.hasItem(itemId, quantity);
        }
        return false;
    }

    /**
     * Evaluate custom condition
     * @param {Object} condition - Custom condition
     * @param {Object} context - Execution context
     * @returns {boolean} - Condition result
     */
    evaluateCustomCondition(condition, context) {
        // This can be extended for game-specific conditions
        debug('WAYPOINTS', `⚠️ Custom condition not implemented: ${JSON.stringify(condition)}`);
        return true;
    }
}

/**
 * Action factory for creating action instances
 */
export class ActionFactory {
    static registeredActions = new Map();

    /**
     * Register an action class
     * @param {string} type - Action type
     * @param {Class} actionClass - Action class
     */
    static register(type, actionClass) {
        this.registeredActions.set(type, actionClass);
        debug('WAYPOINTS', `📝 Registered action type: ${type}`);
    }

    /**
     * Create action instance
     * @param {string} type - Action type
     * @param {Object} parameters - Action parameters
     * @returns {WaypointAction} - Action instance
     */
    static create(type, parameters) {
        const ActionClass = this.registeredActions.get(type);
        
        if (!ActionClass) {
            throw new Error(`Unknown action type: ${type}`);
        }

        const action = new ActionClass(type, parameters);
        
        // Validate action parameters
        const validation = action.validate();
        if (!validation.valid) {
            throw new Error(`Invalid action parameters: ${validation.errors.join(', ')}`);
        }

        return action;
    }

    /**
     * Get all registered action types
     * @returns {Array<string>} - Registered action types
     */
    static getRegisteredTypes() {
        return Array.from(this.registeredActions.keys());
    }
}

export default WaypointAction;
