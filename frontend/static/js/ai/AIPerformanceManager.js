import { debug } from '../debug.js';

/**
 * AIPerformanceManager.js
 * 
 * Performance optimization and monitoring for Enemy AI systems.
 * Manages AI update scheduling, LOD (Level of Detail) systems, and resource allocation.
 */

import * as THREE from 'three';

export class AIPerformanceManager {
    constructor() {
        // Performance settings
        this.maxAIUpdatesPerFrame = 8; // Limit AI updates per frame
        this.updateBudgetMs = 8; // Maximum milliseconds per frame for AI
        this.LODEnabled = true; // Level of Detail enabled
        
        // Update scheduling
        this.aiUpdateQueue = [];
        this.currentUpdateIndex = 0;
        this.frameStartTime = 0;
        
        // LOD distance thresholds (in km)
        this.LODDistances = {
            high: 10,    // Full AI within 10km
            medium: 25,  // Reduced AI within 25km
            low: 50,     // Minimal AI within 50km
            culled: 100  // No AI beyond 100km
        };
        
        // Update intervals by LOD level (milliseconds)
        this.LODUpdateIntervals = {
            high: 50,    // 20 FPS
            medium: 100, // 10 FPS
            low: 250,    // 4 FPS
            culled: 1000 // 1 FPS (basic state only)
        };
        
        // Performance monitoring
        this.performanceStats = {
            totalAIs: 0,
            activeAIs: 0,
            highLOD: 0,
            mediumLOD: 0,
            lowLOD: 0,
            culledAIs: 0,
            averageUpdateTime: 0,
            frameOverruns: 0,
            lastFrameTime: 0
        };
        
        // Update time tracking
        this.updateTimes = [];
        this.maxUpdateTimeHistory = 60; // Keep 60 frames of history
        
debug('AI', '⚡ AIPerformanceManager initialized');
    }
    
    /**
     * Schedule AI for updates with LOD consideration
     * @param {Array} aiInstances - All AI instances to manage
     * @param {THREE.Vector3} playerPosition - Player position for LOD calculation
     */
    scheduleAIUpdates(aiInstances, playerPosition) {
        this.frameStartTime = performance.now();
        this.aiUpdateQueue = [];
        
        // Clear LOD counters
        this.performanceStats.highLOD = 0;
        this.performanceStats.mediumLOD = 0;
        this.performanceStats.lowLOD = 0;
        this.performanceStats.culledAIs = 0;
        this.performanceStats.totalAIs = aiInstances.length;
        
        // Sort AIs by distance from player and assign LOD levels
        const aiWithDistances = aiInstances.map(ai => {
            if (!ai.ship || !ai.ship.position || !playerPosition) {
                return { ai, distance: Infinity, lodLevel: 'culled' };
            }
            
            const distance = playerPosition.distanceTo(ai.ship.position);
            const lodLevel = this.calculateLODLevel(distance);
            
            return { ai, distance, lodLevel };
        });
        
        // Sort by distance (closest first)
        aiWithDistances.sort((a, b) => a.distance - b.distance);
        
        // Add to update queue with LOD-based scheduling
        aiWithDistances.forEach(aiData => {
            this.scheduleAIForUpdate(aiData);
        });
        
        this.performanceStats.activeAIs = this.aiUpdateQueue.length;
    }
    
    /**
     * Calculate LOD level based on distance
     */
    calculateLODLevel(distance) {
        if (distance <= this.LODDistances.high) {
            return 'high';
        } else if (distance <= this.LODDistances.medium) {
            return 'medium';
        } else if (distance <= this.LODDistances.low) {
            return 'low';
        } else {
            return 'culled';
        }
    }
    
    /**
     * Schedule individual AI for update based on LOD
     */
    scheduleAIForUpdate(aiData) {
        const { ai, distance, lodLevel } = aiData;
        const now = Date.now();
        
        // Check if AI should be updated based on LOD interval
        const updateInterval = this.LODUpdateIntervals[lodLevel];
        const timeSinceLastUpdate = now - (ai.lastUpdateTime || 0);
        
        if (timeSinceLastUpdate < updateInterval && lodLevel !== 'high') {
            // Skip update for this frame
            this.performanceStats[lodLevel + 'LOD']++;
            return;
        }
        
        // Add to update queue with priority
        const priority = this.getLODPriority(lodLevel);
        this.aiUpdateQueue.push({
            ai,
            distance,
            lodLevel,
            priority,
            estimatedCost: this.estimateUpdateCost(ai, lodLevel)
        });
        
        this.performanceStats[lodLevel + 'LOD']++;
    }
    
    /**
     * Get priority value for LOD level (lower = higher priority)
     */
    getLODPriority(lodLevel) {
        const priorities = {
            high: 1,
            medium: 2,
            low: 3,
            culled: 4
        };
        return priorities[lodLevel] || 4;
    }
    
    /**
     * Estimate update cost for AI based on LOD level
     */
    estimateUpdateCost(ai, lodLevel) {
        // Base cost in milliseconds
        const baseCosts = {
            high: 2.0,   // Full AI update
            medium: 1.0, // Reduced AI update
            low: 0.5,    // Minimal AI update
            culled: 0.1  // State-only update
        };
        
        let cost = baseCosts[lodLevel] || 0.1;
        
        // Adjust based on AI complexity
        if (ai.combatBehavior && ai.combatBehavior.combatState !== 'idle') {
            cost *= 1.5; // Combat AI is more expensive
        }
        
        if (ai.flockId) {
            cost *= 1.2; // Flocking AI has additional overhead
        }
        
        return cost;
    }
    
    /**
     * Execute scheduled AI updates within performance budget
     * @param {number} deltaTime - Frame delta time
     * @returns {number} Number of AIs updated
     */
    executeScheduledUpdates(deltaTime) {
        let updatedCount = 0;
        let totalCost = 0;
        const frameStartTime = performance.now();
        
        // Sort queue by priority
        this.aiUpdateQueue.sort((a, b) => a.priority - b.priority);
        
        // Process updates within budget
        for (let i = 0; i < this.aiUpdateQueue.length && updatedCount < this.maxAIUpdatesPerFrame; i++) {
            const aiData = this.aiUpdateQueue[i];
            
            // Check if we have budget remaining
            if (totalCost + aiData.estimatedCost > this.updateBudgetMs) {
                break;
            }
            
            // Update AI with LOD-appropriate level of detail
            const updateStartTime = performance.now();
            this.updateAIWithLOD(aiData.ai, aiData.lodLevel, deltaTime);
            const updateTime = performance.now() - updateStartTime;
            
            totalCost += updateTime;
            updatedCount++;
            aiData.ai.lastUpdateTime = Date.now();
            
            // Track update times for performance monitoring
            this.updateTimes.push(updateTime);
            if (this.updateTimes.length > this.maxUpdateTimeHistory) {
                this.updateTimes.shift();
            }
        }
        
        // Update performance stats
        const frameTime = performance.now() - frameStartTime;
        this.performanceStats.lastFrameTime = frameTime;
        
        if (frameTime > this.updateBudgetMs) {
            this.performanceStats.frameOverruns++;
        }
        
        this.updateAverageUpdateTime();
        
        return updatedCount;
    }
    
    /**
     * Update AI with level-of-detail optimizations
     */
    updateAIWithLOD(ai, lodLevel, deltaTime) {
        if (!ai || !ai.ship) return;
        
        try {
            switch (lodLevel) {
                case 'high':
                    // Full AI update
                    this.updateAIFull(ai, deltaTime);
                    break;
                    
                case 'medium':
                    // Reduced frequency update
                    this.updateAIReduced(ai, deltaTime);
                    break;
                    
                case 'low':
                    // Minimal update
                    this.updateAIMinimal(ai, deltaTime);
                    break;
                    
                case 'culled':
                    // State-only update
                    this.updateAIStateOnly(ai, deltaTime);
                    break;
            }
        } catch (error) {
            debug('P1', `AI LOD update error for ${ai.ship.shipType}: ${error.message}`);
        }
    }
    
    /**
     * Full AI update (high LOD)
     */
    updateAIFull(ai, deltaTime) {
        // Standard full AI update
        if (ai.update) {
            ai.update(deltaTime, ai.gameWorld || {});
        }
    }
    
    /**
     * Reduced AI update (medium LOD)
     */
    updateAIReduced(ai, deltaTime) {
        // Skip some expensive operations
        
        // Update core systems
        if (ai.threatAssessment) {
            ai.threatAssessment.update(deltaTime, ai.gameWorld || {});
        }
        
        if (ai.stateMachine) {
            ai.stateMachine.update(deltaTime, ai.gameWorld || {});
        }
        
        // Reduced frequency combat updates
        if (ai.combatBehavior && Date.now() % 200 < 50) { // Every 200ms
            ai.combatBehavior.update(deltaTime, ai.threatAssessment);
        }
        
        // Basic movement
        if (ai.updateMovement) {
            ai.updateMovement(deltaTime);
        }
    }
    
    /**
     * Minimal AI update (low LOD)
     */
    updateAIMinimal(ai, deltaTime) {
        // Only essential updates
        
        // Basic state machine
        if (ai.stateMachine && Date.now() % 500 < 50) { // Every 500ms
            ai.stateMachine.update(deltaTime, ai.gameWorld || {});
        }
        
        // Simplified movement
        if (ai.velocity && ai.ship.position) {
            const movement = ai.velocity.clone().multiplyScalar(deltaTime);
            ai.ship.position.add(movement);
            
            if (ai.ship.mesh) {
                ai.ship.mesh.position.copy(ai.ship.position);
            }
        }
    }
    
    /**
     * State-only update (culled LOD)
     */
    updateAIStateOnly(ai, deltaTime) {
        // Only maintain basic state - no complex processing
        
        // Ensure ship position is maintained if it has velocity
        if (ai.velocity && ai.velocity.length() > 0.1 && ai.ship.position) {
            const movement = ai.velocity.clone().multiplyScalar(deltaTime * 0.5); // Slower for distant ships
            ai.ship.position.add(movement);
            
            if (ai.ship.mesh) {
                ai.ship.mesh.position.copy(ai.ship.position);
            }
        }
    }
    
    /**
     * Update average update time for performance monitoring
     */
    updateAverageUpdateTime() {
        if (this.updateTimes.length === 0) {
            this.performanceStats.averageUpdateTime = 0;
            return;
        }
        
        const totalTime = this.updateTimes.reduce((sum, time) => sum + time, 0);
        this.performanceStats.averageUpdateTime = totalTime / this.updateTimes.length;
    }
    
    /**
     * Adjust performance settings based on current performance
     */
    adaptivePerformanceAdjustment() {
        const avgFrameTime = this.performanceStats.averageUpdateTime;
        const targetFrameTime = this.updateBudgetMs * 0.8; // 80% of budget
        
        // If we're consistently over budget, reduce quality
        if (avgFrameTime > targetFrameTime && this.performanceStats.frameOverruns > 10) {
            this.degradePerformance();
        }
        // If we have headroom, increase quality
        else if (avgFrameTime < targetFrameTime * 0.5 && this.performanceStats.frameOverruns === 0) {
            this.improvePerformance();
        }
    }
    
    /**
     * Reduce performance settings to maintain framerate
     */
    degradePerformance() {
        // Reduce max AI updates per frame
        if (this.maxAIUpdatesPerFrame > 3) {
            this.maxAIUpdatesPerFrame = Math.max(3, this.maxAIUpdatesPerFrame - 1);
debug('AI', `⚡ Reduced max AI updates to ${this.maxAIUpdatesPerFrame}`);
        }
        
        // Increase LOD distances (reduce quality sooner)
        this.LODDistances.high *= 0.9;
        this.LODDistances.medium *= 0.9;
        this.LODDistances.low *= 0.9;
        
        // Increase update intervals (reduce frequency)
        Object.keys(this.LODUpdateIntervals).forEach(level => {
            this.LODUpdateIntervals[level] *= 1.1;
        });
        
        // Reset overrun counter
        this.performanceStats.frameOverruns = 0;
    }
    
    /**
     * Improve performance settings when we have headroom
     */
    improvePerformance() {
        // Increase max AI updates per frame
        if (this.maxAIUpdatesPerFrame < 12) {
            this.maxAIUpdatesPerFrame = Math.min(12, this.maxAIUpdatesPerFrame + 1);
debug('AI', `⚡ Increased max AI updates to ${this.maxAIUpdatesPerFrame}`);
        }
        
        // Decrease LOD distances (improve quality range)
        this.LODDistances.high = Math.min(10, this.LODDistances.high * 1.05);
        this.LODDistances.medium = Math.min(25, this.LODDistances.medium * 1.05);
        this.LODDistances.low = Math.min(50, this.LODDistances.low * 1.05);
        
        // Decrease update intervals (increase frequency)
        Object.keys(this.LODUpdateIntervals).forEach(level => {
            this.LODUpdateIntervals[level] = Math.max(
                this.LODUpdateIntervals[level] * 0.95,
                level === 'high' ? 50 : level === 'medium' ? 100 : level === 'low' ? 250 : 1000
            );
        });
    }
    
    /**
     * Get performance statistics
     */
    getPerformanceStats() {
        return {
            ...this.performanceStats,
            lodDistances: { ...this.LODDistances },
            updateIntervals: { ...this.LODUpdateIntervals },
            maxUpdatesPerFrame: this.maxAIUpdatesPerFrame,
            updateBudget: this.updateBudgetMs,
            lodEnabled: this.LODEnabled
        };
    }
    
    /**
     * Set LOD enabled/disabled
     */
    setLODEnabled(enabled) {
        this.LODEnabled = enabled;
debug('UTILITY', `⚡ LOD system ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Configure performance settings
     */
    configurePerformance(settings) {
        if (settings.maxAIUpdatesPerFrame !== undefined) {
            this.maxAIUpdatesPerFrame = settings.maxAIUpdatesPerFrame;
        }
        if (settings.updateBudgetMs !== undefined) {
            this.updateBudgetMs = settings.updateBudgetMs;
        }
        if (settings.lodDistances !== undefined) {
            Object.assign(this.LODDistances, settings.lodDistances);
        }
        if (settings.updateIntervals !== undefined) {
            Object.assign(this.LODUpdateIntervals, settings.updateIntervals);
        }
        
    }
    
    /**
     * Reset performance statistics
     */
    resetStats() {
        this.performanceStats.frameOverruns = 0;
        this.updateTimes = [];
        debug('PERFORMANCE', 'Performance statistics reset');
    }

    /**
     * Cleanup and destroy the performance manager
     */
    destroy() {
        // Clear update queue
        this.aiUpdateQueue = [];
        this.currentUpdateIndex = 0;

        // Clear performance tracking data
        this.updateTimes = [];

        // Reset stats
        this.performanceStats = {
            totalAIs: 0,
            activeAIs: 0,
            highLOD: 0,
            mediumLOD: 0,
            lowLOD: 0,
            culledAIs: 0,
            averageUpdateTime: 0,
            frameOverruns: 0,
            lastFrameTime: 0
        };

        debug('AI', 'AIPerformanceManager destroyed');
    }
}
