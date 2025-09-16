/**
 * WaypointManager - Core waypoint management system
 * 
 * Handles creation, management, and lifecycle of mission waypoints.
 * Provides proximity detection, action execution, and persistence.
 */

import { debug } from '../debug.js';
import { ActionRegistry } from './ActionRegistry.js';
import { WaypointPersistence } from './WaypointPersistence.js';

// Waypoint status enumeration
export const WaypointStatus = {
    PENDING: 'pending',           // Created but not yet active
    ACTIVE: 'active',             // Currently active and targetable
    TARGETED: 'targeted',         // Currently targeted by player
    INTERRUPTED: 'interrupted',   // Was targeted but player switched to other target
    TRIGGERED: 'triggered',       // Player reached trigger radius
    COMPLETED: 'completed',       // Actions executed successfully
    CANCELLED: 'cancelled'        // Waypoint cancelled or mission aborted
};

// Waypoint type enumeration
export const WaypointType = {
    NAVIGATION: 'navigation',     // Basic navigation waypoint
    COMBAT: 'combat',            // Combat encounter waypoint
    INTERACTION: 'interaction',   // Interaction/dialogue waypoint
    CHECKPOINT: 'checkpoint',     // Mission checkpoint waypoint
    OBJECTIVE: 'objective'        // Mission objective waypoint
};

export class WaypointManager {
    constructor() {
        this.activeWaypoints = new Map();
        this.waypointChains = new Map();
        this.triggerCheckInterval = 2000; // 2 seconds
        this.lastTriggerCheck = 0;
        this.nextWaypointId = 1;
        this.interruptionMetrics = [];
        
        // Initialize ActionRegistry
        this.actionRegistry = new ActionRegistry();
        
        // Initialize WaypointPersistence
        this.persistence = new WaypointPersistence();
        
        // Performance monitoring
        this.performanceMetrics = {
            proximityCheckTimes: [],
            actionExecutionTimes: [],
            memoryUsage: []
        };

        debug('WAYPOINTS', '🎯 WaypointManager initialized with ActionRegistry');
        
        // Start proximity checking
        this.startProximityChecking();
    }

    /**
     * Create a new waypoint for mission guidance
     * @param {Object} config - Waypoint configuration
     * @returns {string} - Waypoint ID
     */
    createWaypoint(config) {
        const waypoint = {
            id: config.id || this.generateWaypointId(),
            name: config.name || `Mission Waypoint #${this.getNextWaypointNumber()}`,
            missionId: config.missionId,
            position: config.position || [0, 0, 0],
            triggerRadius: config.triggerRadius || 10.0,
            type: config.type || WaypointType.NAVIGATION,
            status: WaypointStatus.PENDING,
            actions: config.actions || [],
            metadata: config.metadata || {},
            createdAt: new Date(),
            triggeredAt: null,
            
            // Interruption tracking
            interruptedAt: null,
            resumedAt: null,
            interruptionDuration: 0
        };

        // Validate waypoint configuration
        if (!this.validateWaypointConfig(waypoint)) {
            throw new Error(`Invalid waypoint configuration: ${JSON.stringify(config)}`);
        }

        this.activeWaypoints.set(waypoint.id, waypoint);
        
        // Automatically activate the waypoint
        this.activateWaypoint(waypoint.id);
        
        debug('WAYPOINTS', `🎯 Created waypoint: ${waypoint.name} (${waypoint.id})`);
        
        return waypoint.id;
    }

    /**
     * Get waypoint by ID
     * @param {string} waypointId - Waypoint ID
     * @returns {Object|null} - Waypoint object or null
     */
    getWaypoint(waypointId) {
        return this.activeWaypoints.get(waypointId) || null;
    }

    /**
     * Update waypoint properties
     * @param {string} waypointId - Waypoint ID
     * @param {Object} updates - Properties to update
     * @returns {boolean} - Success status
     */
    updateWaypoint(waypointId, updates) {
        const waypoint = this.activeWaypoints.get(waypointId);
        if (!waypoint) {
            debug('WAYPOINTS', `⚠️ Cannot update waypoint: ${waypointId} not found`);
            return false;
        }

        // Apply updates
        Object.assign(waypoint, updates);
        
        debug('WAYPOINTS', `🎯 Updated waypoint: ${waypoint.name} (${waypointId})`);
        return true;
    }

    /**
     * Delete waypoint
     * @param {string} waypointId - Waypoint ID
     * @returns {boolean} - Success status
     */
    deleteWaypoint(waypointId) {
        const waypoint = this.activeWaypoints.get(waypointId);
        if (!waypoint) {
            return false;
        }

        // Remove from target computer if currently targeted
        if (window.targetComputerManager && 
            window.targetComputerManager.currentTarget?.id === waypointId) {
            window.targetComputerManager.clearCurrentTarget();
        }

        this.activeWaypoints.delete(waypointId);
        
        debug('WAYPOINTS', `🎯 Deleted waypoint: ${waypoint.name} (${waypointId})`);
        return true;
    }

    /**
     * Activate waypoint (make it available for targeting)
     * @param {string} waypointId - Waypoint ID
     */
    activateWaypoint(waypointId) {
        const waypoint = this.activeWaypoints.get(waypointId);
        if (!waypoint) return;

        waypoint.status = WaypointStatus.ACTIVE;
        
        // Register with Target Computer
        this.registerWithTargetComputer(waypoint);
        
        // Update HUD display
        this.updateHUDDisplay(waypoint);
        
        debug('WAYPOINTS', `🎯 Activated waypoint: ${waypoint.name}`);
    }

    /**
     * Start proximity checking loop
     */
    startProximityChecking() {
        const checkProximity = () => {
            this.checkWaypointTriggers();
            setTimeout(checkProximity, this.triggerCheckInterval);
        };
        
        // Start the loop
        setTimeout(checkProximity, this.triggerCheckInterval);
    }

    /**
     * Check for waypoint triggers based on player proximity
     */
    checkWaypointTriggers() {
        const startTime = performance.now();
        
        const now = Date.now();
        if (now - this.lastTriggerCheck < this.triggerCheckInterval) {
            return;
        }

        const playerPosition = this.getPlayerPosition();
        if (!playerPosition) {
            return; // No player position available
        }
        
        for (const [waypointId, waypoint] of this.activeWaypoints) {
            if (waypoint.status === WaypointStatus.ACTIVE || waypoint.status === WaypointStatus.TARGETED) {
                const distance = this.calculateDistance(playerPosition, waypoint.position);
                
                if (distance <= waypoint.triggerRadius) {
                    this.triggerWaypoint(waypointId);
                }
            }
        }

        this.lastTriggerCheck = now;
        
        // Track performance
        const executionTime = performance.now() - startTime;
        this.performanceMetrics.proximityCheckTimes.push(executionTime);
        
        // Keep only last 100 measurements
        if (this.performanceMetrics.proximityCheckTimes.length > 100) {
            this.performanceMetrics.proximityCheckTimes.shift();
        }
        
        // Warn if performance is degrading
        if (executionTime > 5) {
            debug('WAYPOINTS', `⚠️ Slow proximity check: ${executionTime.toFixed(2)}ms`);
        }
    }

    /**
     * Execute waypoint actions when triggered
     * @param {string} waypointId - Waypoint ID
     */
    async triggerWaypoint(waypointId) {
        const waypoint = this.activeWaypoints.get(waypointId);
        if (!waypoint || waypoint.status === WaypointStatus.TRIGGERED || waypoint.status === WaypointStatus.COMPLETED) {
            return;
        }

        const startTime = performance.now();

        waypoint.status = WaypointStatus.TRIGGERED;
        waypoint.triggeredAt = new Date();

        debug('WAYPOINTS', `🎯 Triggering waypoint: ${waypoint.name}`);

        try {
            // Execute all waypoint actions
            for (const action of waypoint.actions) {
                await this.executeWaypointAction(action, waypoint);
            }

            waypoint.status = WaypointStatus.COMPLETED;
            this.onWaypointCompleted(waypoint);
            
        } catch (error) {
            console.error(`Failed to execute waypoint actions for ${waypoint.name}:`, error);
            waypoint.status = WaypointStatus.ACTIVE; // Reset to active on error
        }

        // Track performance
        const executionTime = performance.now() - startTime;
        this.performanceMetrics.actionExecutionTimes.push(executionTime);
        
        if (this.performanceMetrics.actionExecutionTimes.length > 100) {
            this.performanceMetrics.actionExecutionTimes.shift();
        }
    }

    /**
     * Execute individual waypoint action
     * @param {Object} action - Action configuration
     * @param {Object} waypoint - Waypoint object
     */
    async executeWaypointAction(action, waypoint) {
        debug('WAYPOINTS', `🎯 Executing action: ${action.type} for waypoint ${waypoint.name}`);

        switch (action.type) {
            case 'next_waypoint':
                this.activateNextWaypoint(waypoint.missionId);
                break;
                
            case 'spawn_ships':
                await this.executeSpawnShipsAction(action.parameters);
                break;
                
            case 'play_comm':
                await this.executePlayCommAction(action.parameters);
                break;
                
            case 'show_message':
                await this.executeShowMessageAction(action.parameters);
                break;
                
            case 'give_item':
                await this.executeGiveItemAction(action.parameters);
                break;
                
            case 'give_reward':
                await this.executeGiveRewardAction(action.parameters);
                break;
                
            case 'mission_update':
                await this.executeMissionUpdateAction(action.parameters);
                break;
                
            case 'custom_event':
                await this.executeCustomEventAction(action.parameters);
                break;
                
            default:
                console.warn(`Unknown waypoint action type: ${action.type}`);
        }
    }

    /**
     * Handle waypoint interruption notification
     * @param {string} waypointId - Waypoint ID
     */
    notifyWaypointInterrupted(waypointId) {
        const waypoint = this.activeWaypoints.get(waypointId);
        if (!waypoint) return;

        waypoint.status = WaypointStatus.INTERRUPTED;
        waypoint.interruptedAt = new Date();
        
        // Track interruption metrics
        this.trackInterruption(waypoint);
        
        debug('WAYPOINTS', `🎯 Waypoint interrupted: ${waypoint.name}`);
    }

    /**
     * Resume interrupted waypoint
     * @param {string} waypointId - Waypoint ID
     * @returns {boolean} - Success status
     */
    resumeWaypoint(waypointId) {
        const waypoint = this.activeWaypoints.get(waypointId);
        if (!waypoint || waypoint.status !== WaypointStatus.INTERRUPTED) {
            return false;
        }

        waypoint.status = WaypointStatus.TARGETED;
        waypoint.resumedAt = new Date();
        
        // Calculate interruption duration for metrics
        if (waypoint.interruptedAt) {
            waypoint.interruptionDuration = waypoint.resumedAt - waypoint.interruptedAt;
        }
        
        debug('WAYPOINTS', `🎯 Waypoint resumed: ${waypoint.name} (interrupted for ${waypoint.interruptionDuration}ms)`);
        
        return true;
    }

    /**
     * Get all active waypoints
     * @returns {Array} - Array of active waypoints
     */
    getActiveWaypoints() {
        return Array.from(this.activeWaypoints.values())
            .filter(waypoint => waypoint.status === WaypointStatus.ACTIVE || waypoint.status === WaypointStatus.TARGETED);
    }

    /**
     * Get next active waypoint for targeting
     * @returns {Object|null} - Next waypoint or null
     */
    getNextActiveWaypoint() {
        const activeWaypoints = this.getActiveWaypoints();
        return activeWaypoints.length > 0 ? activeWaypoints[0] : null;
    }

    /**
     * Get interrupted waypoint
     * @returns {Object|null} - Interrupted waypoint or null
     */
    getInterruptedWaypoint() {
        for (const [id, waypoint] of this.activeWaypoints) {
            if (waypoint.status === WaypointStatus.INTERRUPTED) {
                return waypoint;
            }
        }
        return null;
    }

    // ========== UTILITY METHODS ==========

    /**
     * Generate unique waypoint ID
     * @returns {string} - Unique waypoint ID
     */
    generateWaypointId() {
        return `waypoint_${Date.now()}_${this.nextWaypointId++}`;
    }

    /**
     * Get next waypoint number for naming
     * @returns {number} - Next waypoint number
     */
    getNextWaypointNumber() {
        return this.activeWaypoints.size + 1;
    }

    /**
     * Validate waypoint configuration
     * @param {Object} waypoint - Waypoint configuration
     * @returns {boolean} - Validation result
     */
    validateWaypointConfig(waypoint) {
        if (!waypoint.name || typeof waypoint.name !== 'string') {
            console.error('Waypoint name is required and must be a string');
            return false;
        }
        
        if (!Array.isArray(waypoint.position) || waypoint.position.length !== 3) {
            console.error('Waypoint position must be an array of 3 numbers [x, y, z]');
            return false;
        }
        
        if (typeof waypoint.triggerRadius !== 'number' || waypoint.triggerRadius <= 0) {
            console.error('Waypoint triggerRadius must be a positive number');
            return false;
        }
        
        // Normalize waypoint type to lowercase for validation
        const normalizedType = waypoint.type?.toLowerCase();
        if (!Object.values(WaypointType).includes(normalizedType)) {
            console.error(`Invalid waypoint type: ${waypoint.type}. Valid types: ${Object.values(WaypointType).join(', ')}`);
            return false;
        }
        
        // Update waypoint type to normalized lowercase value
        waypoint.type = normalizedType;
        
        return true;
    }

    /**
     * Get current player position
     * @returns {Array|null} - Player position [x, y, z] or null
     */
    getPlayerPosition() {
        // Get player position from StarfieldManager
        if (window.starfieldManager && window.starfieldManager.camera) {
            const pos = window.starfieldManager.camera.position;
            return [pos.x, pos.y, pos.z];
        }
        return null;
    }

    /**
     * Calculate distance between two 3D points
     * @param {Array} pos1 - First position [x, y, z]
     * @param {Array} pos2 - Second position [x, y, z]
     * @returns {number} - Distance in kilometers
     */
    calculateDistance(pos1, pos2) {
        const dx = pos1[0] - pos2[0];
        const dy = pos1[1] - pos2[1];
        const dz = pos1[2] - pos2[2];
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Register waypoint with Target Computer
     * @param {Object} waypoint - Waypoint object
     */
    registerWithTargetComputer(waypoint) {
        if (window.targetComputerManager) {
            // Create virtual target object for Target Computer
            const virtualTarget = {
                id: waypoint.id,
                name: waypoint.name,
                type: 'waypoint',
                position: waypoint.position,
                isVirtual: true,
                missionId: waypoint.missionId,
                userData: {
                    waypointType: waypoint.type,
                    triggerRadius: waypoint.triggerRadius
                }
            };
            
            // Add to target computer's available targets
            // This will be implemented when we enhance TargetComputerManager
            debug('WAYPOINTS', `🎯 Registered waypoint with Target Computer: ${waypoint.name}`);
        }
    }

    /**
     * Update HUD display for waypoint
     * @param {Object} waypoint - Waypoint object
     */
    updateHUDDisplay(waypoint) {
        // This will be implemented in Phase 3 (UI Integration)
        debug('WAYPOINTS', `🎯 Updated HUD display for waypoint: ${waypoint.name}`);
    }

    /**
     * Handle waypoint completion
     * @param {Object} waypoint - Completed waypoint
     */
    onWaypointCompleted(waypoint) {
        debug('WAYPOINTS', `🎯 Waypoint completed: ${waypoint.name}`);
        
        // Remove from Target Computer if currently targeted
        if (window.targetComputerManager && 
            window.targetComputerManager.currentTarget?.id === waypoint.id) {
            window.targetComputerManager.clearCurrentTarget();
        }
        
        // Notify mission system if applicable
        if (waypoint.missionId && window.missionEventHandler) {
            window.missionEventHandler.handleWaypointCompleted(waypoint);
        }
    }

    /**
     * Track interruption for analytics
     * @param {Object} waypoint - Interrupted waypoint
     */
    trackInterruption(waypoint) {
        this.interruptionMetrics.push({
            waypointId: waypoint.id,
            missionId: waypoint.missionId,
            interruptedAt: waypoint.interruptedAt,
            waypointType: waypoint.type
        });
        
        // Keep only last 1000 interruptions
        if (this.interruptionMetrics.length > 1000) {
            this.interruptionMetrics.shift();
        }
    }

    /**
     * Get performance metrics
     * @returns {Object} - Performance metrics
     */
    getPerformanceMetrics() {
        const proximityTimes = this.performanceMetrics.proximityCheckTimes;
        const actionTimes = this.performanceMetrics.actionExecutionTimes;
        
        return {
            proximityCheck: {
                average: proximityTimes.length > 0 ? 
                    proximityTimes.reduce((a, b) => a + b, 0) / proximityTimes.length : 0,
                max: proximityTimes.length > 0 ? Math.max(...proximityTimes) : 0,
                samples: proximityTimes.length
            },
            actionExecution: {
                average: actionTimes.length > 0 ? 
                    actionTimes.reduce((a, b) => a + b, 0) / actionTimes.length : 0,
                max: actionTimes.length > 0 ? Math.max(...actionTimes) : 0,
                samples: actionTimes.length
            },
            activeWaypoints: this.activeWaypoints.size,
            totalInterruptions: this.interruptionMetrics.length
        };
    }

    // ========== ACTION EXECUTION METHODS ==========

    async executeSpawnShipsAction(parameters) {
        debug('WAYPOINTS', '🚢 Executing spawn ships action');
        
        try {
            const { ActionFactory } = await import('./WaypointAction.js');
            const action = ActionFactory.create('spawn_ships', parameters);
            const result = await action.execute({ waypoint: this.currentWaypoint });
            
            debug('WAYPOINTS', `🚢 Spawn ships completed: ${result.result?.spawnedCount || 0} ships`);
            return result;
            
        } catch (error) {
            console.error('Failed to execute spawn ships action:', error);
            throw error;
        }
    }

    async executePlayCommAction(parameters) {
        debug('WAYPOINTS', '📻 Executing play comm action');
        
        try {
            const { ActionFactory } = await import('./WaypointAction.js');
            const action = ActionFactory.create('play_comm', parameters);
            const result = await action.execute({ waypoint: this.currentWaypoint });
            
            debug('WAYPOINTS', `📻 Play comm completed: ${parameters.audioFile}`);
            return result;
            
        } catch (error) {
            console.error('Failed to execute play comm action:', error);
            throw error;
        }
    }

    async executeShowMessageAction(parameters) {
        debug('WAYPOINTS', '💬 Executing show message action');
        
        try {
            const { ActionFactory } = await import('./WaypointAction.js');
            const action = ActionFactory.create('show_message', parameters);
            const result = await action.execute({ waypoint: this.currentWaypoint });
            
            debug('WAYPOINTS', `💬 Show message completed: ${parameters.title || 'Message'}`);
            return result;
            
        } catch (error) {
            console.error('Failed to execute show message action:', error);
            throw error;
        }
    }

    async executeGiveItemAction(parameters) {
        debug('WAYPOINTS', '🎁 Executing give item action');
        
        try {
            const { ActionFactory } = await import('./WaypointAction.js');
            const action = ActionFactory.create('give_item', parameters);
            const result = await action.execute({ waypoint: this.currentWaypoint });
            
            debug('WAYPOINTS', `🎁 Give item completed: ${parameters.itemId} x${parameters.quantity || 1}`);
            return result;
            
        } catch (error) {
            console.error('Failed to execute give item action:', error);
            throw error;
        }
    }

    async executeGiveRewardAction(parameters) {
        debug('WAYPOINTS', '💰 Executing give reward action');
        
        try {
            const { ActionFactory } = await import('./WaypointAction.js');
            const action = ActionFactory.create('give_reward', parameters);
            const result = await action.execute({ waypoint: this.currentWaypoint });
            
            debug('WAYPOINTS', `💰 Give reward completed: ${parameters.rewardPackageId}`);
            return result;
            
        } catch (error) {
            console.error('Failed to execute give reward action:', error);
            throw error;
        }
    }

    async executeMissionUpdateAction(parameters) {
        debug('WAYPOINTS', '📋 Executing mission update action');
        
        try {
            // Mission update logic
            if (window.missionEventHandler && parameters.missionId) {
                await window.missionEventHandler.updateMissionStatus(
                    parameters.missionId,
                    parameters.status || 'updated',
                    parameters.data || {}
                );
            }
            
            debug('WAYPOINTS', `📋 Mission update completed: ${parameters.missionId}`);
            return { success: true, missionId: parameters.missionId };
            
        } catch (error) {
            console.error('Failed to execute mission update action:', error);
            throw error;
        }
    }

    async executeCustomEventAction(parameters) {
        debug('WAYPOINTS', '⚡ Executing custom event action');
        
        try {
            const { eventType, eventData } = parameters;
            
            // Dispatch custom event
            const customEvent = new CustomEvent(`waypoint_${eventType}`, {
                detail: {
                    waypoint: this.currentWaypoint,
                    eventData: eventData,
                    timestamp: new Date()
                }
            });
            
            document.dispatchEvent(customEvent);
            
            debug('WAYPOINTS', `⚡ Custom event dispatched: waypoint_${eventType}`);
            return { success: true, eventType: eventType };
            
        } catch (error) {
            console.error('Failed to execute custom event action:', error);
            throw error;
        }
    }

    /**
     * Activate next waypoint in chain (stub for Phase 4)
     * @param {string} missionId - Mission ID
     */
    activateNextWaypoint(missionId) {
        debug('WAYPOINTS', `🔗 Activate next waypoint for mission ${missionId} - TODO: Implement in Phase 4`);
    }
}

// Global waypoint manager instance
let waypointManagerInstance = null;

/**
 * Get or create global waypoint manager instance
 * @returns {WaypointManager} - Waypoint manager instance
 */
export function getWaypointManager() {
    if (!waypointManagerInstance) {
        waypointManagerInstance = new WaypointManager();
        
        // Make available globally for debugging
        window.waypointManager = waypointManagerInstance;
    }
    return waypointManagerInstance;
}

// Initialize waypoint manager when module is loaded
export default getWaypointManager();
