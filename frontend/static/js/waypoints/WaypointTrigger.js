/**
 * WaypointTrigger - Trigger system for waypoints
 * 
 * Handles different types of waypoint triggers including proximity,
 * manual activation, conditional triggers, and timed triggers.
 */

import { debug } from '../debug.js';

// Trigger type enumeration
export const TriggerType = {
    PROXIMITY: 'proximity',       // Triggered by player proximity
    MANUAL: 'manual',            // Triggered by player action
    CONDITIONAL: 'conditional',   // Triggered by game state conditions
    TIMED: 'timed'               // Triggered by time elapsed
};

// Trigger status enumeration
export const TriggerStatus = {
    INACTIVE: 'inactive',         // Trigger not active
    ACTIVE: 'active',            // Trigger active and monitoring
    TRIGGERED: 'triggered',       // Trigger has fired
    EXPIRED: 'expired',          // Trigger has expired (for timed triggers)
    DISABLED: 'disabled'         // Trigger manually disabled
};

/**
 * Base class for waypoint triggers
 */
export class WaypointTrigger {
    constructor(waypointId, type, config = {}) {
        this.waypointId = waypointId;
        this.type = type;
        this.status = TriggerStatus.INACTIVE;
        this.config = config;
        
        // Common properties
        this.radius = config.radius || 10.0;
        this.conditions = config.conditions || [];
        this.active = config.active !== false; // Default to true
        
        // Timing properties
        this.createdAt = new Date();
        this.activatedAt = null;
        this.triggeredAt = null;
        this.expiresAt = null;
        
        // Performance tracking
        this.checkCount = 0;
        this.lastCheckTime = 0;
        
        debug('WAYPOINTS', `🎯 Created ${type} trigger for waypoint ${waypointId}`);
    }

    /**
     * Activate the trigger
     */
    activate() {
        if (this.status === TriggerStatus.INACTIVE) {
            this.status = TriggerStatus.ACTIVE;
            this.activatedAt = new Date();
            
            // Set expiration time for timed triggers
            if (this.type === TriggerType.TIMED && this.config.timeout) {
                this.expiresAt = new Date(Date.now() + this.config.timeout);
            }
            
            debug('WAYPOINTS', `🎯 Activated ${this.type} trigger for waypoint ${this.waypointId}`);
        }
    }

    /**
     * Deactivate the trigger
     */
    deactivate() {
        this.status = TriggerStatus.INACTIVE;
        this.activatedAt = null;
        this.expiresAt = null;
        
        debug('WAYPOINTS', `🎯 Deactivated ${this.type} trigger for waypoint ${this.waypointId}`);
    }

    /**
     * Check if trigger should fire
     * @param {Object} context - Check context (player position, game state, etc.)
     * @returns {boolean} - Whether trigger should fire
     */
    check(context) {
        const startTime = performance.now();
        this.checkCount++;
        
        try {
            // Don't check if not active
            if (this.status !== TriggerStatus.ACTIVE) {
                return false;
            }

            // Check if expired (for timed triggers)
            if (this.expiresAt && new Date() > this.expiresAt) {
                this.status = TriggerStatus.EXPIRED;
                debug('WAYPOINTS', `⏰ Trigger expired for waypoint ${this.waypointId}`);
                return false;
            }

            // Check conditions first
            if (!this.checkConditions(context)) {
                return false;
            }

            // Perform type-specific check
            const shouldTrigger = this.performCheck(context);
            
            if (shouldTrigger) {
                this.trigger();
            }
            
            return shouldTrigger;
            
        } finally {
            this.lastCheckTime = performance.now() - startTime;
        }
    }

    /**
     * Perform type-specific trigger check (to be implemented by subclasses)
     * @param {Object} context - Check context
     * @returns {boolean} - Whether trigger should fire
     */
    performCheck(context) {
        throw new Error(`performCheck must be implemented by ${this.constructor.name}`);
    }

    /**
     * Fire the trigger
     */
    trigger() {
        if (this.status === TriggerStatus.ACTIVE) {
            this.status = TriggerStatus.TRIGGERED;
            this.triggeredAt = new Date();
            
            debug('WAYPOINTS', `🎯 Trigger fired for waypoint ${this.waypointId}`);
            
            // Notify waypoint manager
            if (window.waypointManager) {
                window.waypointManager.triggerWaypoint(this.waypointId);
            }
        }
    }

    /**
     * Check trigger conditions
     * @param {Object} context - Check context
     * @returns {boolean} - Whether conditions are met
     */
    checkConditions(context) {
        if (this.conditions.length === 0) {
            return true;
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
     * @param {Object} context - Check context
     * @returns {boolean} - Whether condition is met
     */
    evaluateCondition(condition, context) {
        // This uses the same condition evaluation logic as WaypointAction
        // In a real implementation, this could be shared via a utility class
        
        const { type, operator, value, property } = condition;

        switch (type) {
            case 'player_speed':
                const speed = this.getPlayerSpeed(context);
                return this.compareValues(speed, operator, value);

            case 'time_of_day':
                const timeOfDay = this.getGameTimeOfDay(context);
                return this.compareValues(timeOfDay, operator, value);

            case 'mission_state':
                const missionState = this.getMissionState(context, property);
                return this.compareValues(missionState, operator, value);

            case 'enemy_count':
                const enemyCount = this.getNearbyEnemyCount(context);
                return this.compareValues(enemyCount, operator, value);

            default:
                debug('WAYPOINTS', `⚠️ Unknown trigger condition type: ${type}`);
                return true;
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
                return true;
        }
    }

    /**
     * Reset trigger for reuse
     */
    reset() {
        this.status = TriggerStatus.INACTIVE;
        this.activatedAt = null;
        this.triggeredAt = null;
        this.expiresAt = null;
        this.checkCount = 0;
        
        debug('WAYPOINTS', `🔄 Reset trigger for waypoint ${this.waypointId}`);
    }

    /**
     * Get trigger statistics
     * @returns {Object} - Trigger statistics
     */
    getStatistics() {
        const now = new Date();
        const activeTime = this.activatedAt ? now - this.activatedAt : 0;
        
        return {
            type: this.type,
            status: this.status,
            waypointId: this.waypointId,
            checkCount: this.checkCount,
            activeTime: activeTime,
            lastCheckTime: this.lastCheckTime,
            averageCheckTime: this.checkCount > 0 ? this.lastCheckTime / this.checkCount : 0,
            hasExpiration: this.expiresAt !== null,
            timeUntilExpiration: this.expiresAt ? Math.max(0, this.expiresAt - now) : null
        };
    }

    // ========== UTILITY METHODS ==========

    /**
     * Calculate distance between two 3D points
     * @param {Array} pos1 - First position [x, y, z]
     * @param {Array} pos2 - Second position [x, y, z]
     * @returns {number} - Distance
     */
    calculateDistance(pos1, pos2) {
        const dx = pos1[0] - pos2[0];
        const dy = pos1[1] - pos2[1];
        const dz = pos1[2] - pos2[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Get player speed
     * @param {Object} context - Check context
     * @returns {number} - Player speed
     */
    getPlayerSpeed(context) {
        if (window.starfieldManager && window.starfieldManager.playerShip) {
            return window.starfieldManager.playerShip.currentSpeed || 0;
        }
        return 0;
    }

    /**
     * Get game time of day
     * @param {Object} context - Check context
     * @returns {number} - Time of day (0-24)
     */
    getGameTimeOfDay(context) {
        // This would integrate with game time system
        return new Date().getHours();
    }

    /**
     * Get mission state
     * @param {Object} context - Check context
     * @param {string} missionId - Mission ID
     * @returns {string} - Mission state
     */
    getMissionState(context, missionId) {
        // This would integrate with mission system
        return 'active';
    }

    /**
     * Get nearby enemy count
     * @param {Object} context - Check context
     * @returns {number} - Enemy count
     */
    getNearbyEnemyCount(context) {
        // This would integrate with enemy tracking system
        return 0;
    }
}

/**
 * Proximity trigger - fires when player enters radius
 */
export class ProximityTrigger extends WaypointTrigger {
    constructor(waypointId, config) {
        super(waypointId, TriggerType.PROXIMITY, config);
        this.waypointPosition = config.waypointPosition || [0, 0, 0];
    }

    performCheck(context) {
        const playerPosition = context.playerPosition;
        if (!playerPosition) {
            return false;
        }

        const distance = this.calculateDistance(playerPosition, this.waypointPosition);
        return distance <= this.radius;
    }
}

/**
 * Manual trigger - fires when manually activated
 */
export class ManualTrigger extends WaypointTrigger {
    constructor(waypointId, config) {
        super(waypointId, TriggerType.MANUAL, config);
        this.manuallyTriggered = false;
    }

    performCheck(context) {
        return this.manuallyTriggered;
    }

    /**
     * Manually trigger this trigger
     */
    manualTrigger() {
        this.manuallyTriggered = true;
        debug('WAYPOINTS', `👆 Manual trigger activated for waypoint ${this.waypointId}`);
    }

    reset() {
        super.reset();
        this.manuallyTriggered = false;
    }
}

/**
 * Conditional trigger - fires when conditions are met
 */
export class ConditionalTrigger extends WaypointTrigger {
    constructor(waypointId, config) {
        super(waypointId, TriggerType.CONDITIONAL, config);
        this.requiredConditions = config.requiredConditions || [];
    }

    performCheck(context) {
        // All required conditions must be met
        for (const condition of this.requiredConditions) {
            if (!this.evaluateCondition(condition, context)) {
                return false;
            }
        }
        return this.requiredConditions.length > 0;
    }
}

/**
 * Timed trigger - fires after specified time
 */
export class TimedTrigger extends WaypointTrigger {
    constructor(waypointId, config) {
        super(waypointId, TriggerType.TIMED, config);
        this.delay = config.delay || 0;
        this.triggerTime = null;
    }

    activate() {
        super.activate();
        if (this.delay > 0) {
            this.triggerTime = new Date(Date.now() + this.delay);
        } else {
            this.triggerTime = new Date();
        }
    }

    performCheck(context) {
        if (!this.triggerTime) {
            return false;
        }
        
        return new Date() >= this.triggerTime;
    }

    reset() {
        super.reset();
        this.triggerTime = null;
    }
}

/**
 * Trigger factory for creating trigger instances
 */
export class TriggerFactory {
    /**
     * Create trigger instance
     * @param {string} waypointId - Waypoint ID
     * @param {string} type - Trigger type
     * @param {Object} config - Trigger configuration
     * @returns {WaypointTrigger} - Trigger instance
     */
    static create(waypointId, type, config) {
        switch (type) {
            case TriggerType.PROXIMITY:
                return new ProximityTrigger(waypointId, config);
            
            case TriggerType.MANUAL:
                return new ManualTrigger(waypointId, config);
            
            case TriggerType.CONDITIONAL:
                return new ConditionalTrigger(waypointId, config);
            
            case TriggerType.TIMED:
                return new TimedTrigger(waypointId, config);
            
            default:
                throw new Error(`Unknown trigger type: ${type}`);
        }
    }

    /**
     * Get all available trigger types
     * @returns {Array<string>} - Available trigger types
     */
    static getAvailableTypes() {
        return Object.values(TriggerType);
    }
}

export default WaypointTrigger;
