import * as THREE from 'three';
import { EnemyAI } from './EnemyAI.js';
import { getAIConfig, applyDifficultyModifiers, applyFactionModifiers } from './AIConfigs.js';
import { FlockingManager } from './FlockingManager.js';
import { AIPerformanceManager } from './AIPerformanceManager.js';
import { AIDebugVisualizer } from './AIDebugVisualizer.js';
import { debug } from '../debug.js';

/**
 * EnemyAIManager - Central coordinator for all enemy AI systems
 * 
 * Manages AI lifecycle, updates, and integration with game systems
 * Based on docs/enemy_ai_implementation_plan.md architecture
 */
export class EnemyAIManager {
    constructor(scene, camera, starfieldManager) {
        this.scene = scene;
        this.camera = camera;
        this.starfieldManager = starfieldManager;
        
        // AI tracking
        this.aiShips = new Map();        // Map of ship -> AI instance
        this.activeAIs = new Set();      // Set of active AI instances
        this.updateQueue = [];           // AI update queue for performance
        
        // Game world reference
        this.gameWorld = {
            ships: [],
            playerShip: null,
            celestialBodies: [],
            projectiles: []
        };
        
        // Performance settings
        this.maxAIUpdatesPerFrame = 5;   // Limit AI updates per frame
        this.updateInterval = 16;        // ~60 FPS (16ms between updates)
        this.lastUpdateTime = 0;
        this.currentUpdateIndex = 0;
        
        // Global AI settings
        this.globalDifficulty = 50;      // Default difficulty (1-100)
        this.aiEnabled = true;
        this.debugMode = false;
        
        // Flocking system
        this.flockingManager = new FlockingManager();
        
        // Performance management
        this.performanceManager = new AIPerformanceManager();
        
        // Debug visualization
        this.debugVisualizer = new AIDebugVisualizer(scene, camera);
        
        // Integration state
        this.isInitialized = false;
        
debug('AI', 'EnemyAIManager initialized');
    }
    
    /**
     * Initialize the AI manager and integrate with game systems
     */
    async initialize() {
        try {
            // Set up game world references
            this.setupGameWorld();
            
            // Enable AI for existing enemy ships
            this.enableAIForExistingShips();
            
            this.isInitialized = true;
debug('AI', '✅ EnemyAIManager fully initialized');

        } catch (error) {
            debug('P1', `❌ Failed to initialize EnemyAIManager: ${error.message}`);
        }
    }
    
    /**
     * Set up game world references for AI
     */
    setupGameWorld() {
        // Get player ship reference
        if (this.starfieldManager.ship) {
            this.gameWorld.playerShip = this.starfieldManager.ship;
            this.gameWorld.playerShip.isPlayer = true;
        }
        
        // Collect all ships from various sources
        this.updateGameWorldShips();
        
debug('UTILITY', `🌍 Game world initialized with ${this.gameWorld.ships.length} ships`);
    }
    
    /**
     * Update game world ship references
     */
    updateGameWorldShips() {
        this.gameWorld.ships = [];
        
        // Add player ship
        if (this.gameWorld.playerShip) {
            this.gameWorld.ships.push(this.gameWorld.playerShip);
        }
        
        // Add target dummy ships
        if (this.starfieldManager.targetDummyShips) {
            for (const dummyShip of this.starfieldManager.targetDummyShips) {
                if (dummyShip && dummyShip.currentHull > 0) {
                    this.gameWorld.ships.push(dummyShip);
                }
            }
        }
        
        // Add any other enemy ships that might exist
        // (This can be expanded as more ship spawning systems are added)
    }
    
    /**
     * Enable AI for existing enemy ships
     */
    enableAIForExistingShips() {
        if (!this.starfieldManager.targetDummyShips) return;
        
        let aiCount = 0;
        for (const ship of this.starfieldManager.targetDummyShips) {
            if (ship && ship.currentHull > 0 && !ship.ai) {
                this.addAIToShip(ship);
                aiCount++;
            }
        }
        
debug('AI', `🤖 Enabled AI for ${aiCount} existing ships`);
    }
    
    /**
     * Add AI to a ship
     * @param {Object} ship - Ship to add AI to
     * @param {Object} options - AI configuration options
     */
    addAIToShip(ship, options = {}) {
        if (ship.ai) {
            debug('AI', `Ship ${ship.shipType} already has AI`);
            return ship.ai;
        }
        
        try {
            // Get base AI configuration
            let aiConfig = getAIConfig(ship.shipType);
            
            // Apply difficulty modifiers
            if (options.difficulty !== undefined) {
                aiConfig = applyDifficultyModifiers(aiConfig, options.difficulty);
            } else {
                aiConfig = applyDifficultyModifiers(aiConfig, this.globalDifficulty);
            }
            
            // Apply faction modifiers
            if (options.faction) {
                aiConfig = applyFactionModifiers(aiConfig, options.faction);
            }
            
            // Create AI instance
            const ai = new EnemyAI(ship, aiConfig);
            ship.ai = ai;
            
            // Ensure ship has position
            if (!ship.position) {
                ship.position = new THREE.Vector3();
                debug('AI', `Ship ${ship.shipType} missing position, initialized to origin`);
            }
            
            // Add to tracking
            this.aiShips.set(ship, ai);
            this.activeAIs.add(ai);
            this.updateQueue.push(ai);
            
            // Enable debug if global debug is on
            if (this.debugMode) {
                ai.enableDebug();
            }
            
debug('AI', `🤖 AI added to ${ship.shipType} (difficulty: ${options.difficulty || this.globalDifficulty})`);
            return ai;

        } catch (error) {
            debug('P1', `Failed to add AI to ship ${ship.shipType}: ${error.message}`);
            return null;
        }
    }
    
    /**
     * Remove AI from a ship
     * @param {Object} ship - Ship to remove AI from
     */
    removeAIFromShip(ship) {
        const ai = this.aiShips.get(ship);
        if (!ai) return;
        
        // Cleanup AI
        ai.destroy();
        
        // Remove from tracking
        this.aiShips.delete(ship);
        this.activeAIs.delete(ai);
        
        // Remove from update queue
        const queueIndex = this.updateQueue.indexOf(ai);
        if (queueIndex !== -1) {
            this.updateQueue.splice(queueIndex, 1);
        }
        
        // Clear ship reference
        ship.ai = null;
        
debug('AI', `🤖 AI removed from ${ship.shipType}`);
    }
    
    /**
     * Main update loop - called every frame
     * @param {number} deltaTime - Time since last update in seconds
     */
    update(deltaTime) {
        if (!this.isInitialized || !this.aiEnabled) return;
        
        const now = Date.now();
        
        // Throttle updates for performance
        if (now - this.lastUpdateTime < this.updateInterval) {
            return;
        }
        
        this.lastUpdateTime = now;
        
        try {
            // Update game world state
            this.updateGameWorld();
            
            // Get player position for LOD calculations
            const playerPosition = this.getPlayerPosition();
            
            // Schedule AI updates with performance management
            const activeAIs = Array.from(this.activeAIs);
            this.performanceManager.scheduleAIUpdates(activeAIs, playerPosition);
            
            // Execute scheduled AI updates within performance budget
            const updatedCount = this.performanceManager.executeScheduledUpdates(deltaTime);
            
            // Update flocking system
            this.flockingManager.update(deltaTime);
            
            // Update debug visualization
            this.debugVisualizer.update(activeAIs, playerPosition);
            
            // Cleanup destroyed ships
            this.cleanupDestroyedShips();

            // Adaptive performance adjustment
            if (Date.now() % 5000 < 50) { // Every 5 seconds
                this.performanceManager.adaptivePerformanceAdjustment();
            }

        } catch (error) {
            debug('P1', `🤖 EnemyAIManager update error: ${error.message}`);
        }
    }
    
    /**
     * Get player position for LOD calculations
     */
    getPlayerPosition() {
        // Try to get player position from various sources
        if (this.starfieldManager?.shipMesh?.position) {
            return this.starfieldManager.shipMesh.position;
        }
        if (this.gameWorld.playerShip?.position) {
            return this.gameWorld.playerShip.position;
        }
        if (this.starfieldManager?.ship?.position) {
            return this.starfieldManager.ship.position;
        }
        return new THREE.Vector3(0, 0, 0); // Fallback to origin
    }
    
    /**
     * Update game world state for AI
     */
    updateGameWorld() {
        // Update ship positions from their meshes
        this.updateShipPositions();
        
        // Update game world ship list
        this.updateGameWorldShips();
        
        // Update celestial bodies (planets, etc.)
        this.updateCelestialBodies();
    }
    
    /**
     * Update ship positions from their 3D meshes
     */
    updateShipPositions() {
        // Update target dummy positions from their meshes
        if (this.starfieldManager.dummyShipMeshes) {
            for (let i = 0; i < this.starfieldManager.dummyShipMeshes.length; i++) {
                const mesh = this.starfieldManager.dummyShipMeshes[i];
                const ship = this.starfieldManager.targetDummyShips[i];
                
                if (mesh && ship && mesh.position) {
                    if (!ship.position) {
                        ship.position = new THREE.Vector3();
                    }
                    ship.position.copy(mesh.position);
                    // PHASE 5: Use linkMesh to connect mesh to GameObject
                    if (ship.linkMesh) {
                        ship.linkMesh(mesh);
                    } else {
                        ship.mesh = mesh; // Legacy fallback
                    }
                }
            }
        }
        
        // Update player ship position
        if (this.gameWorld.playerShip && this.camera) {
            if (!this.gameWorld.playerShip.position) {
                this.gameWorld.playerShip.position = new THREE.Vector3();
            }
            this.gameWorld.playerShip.position.copy(this.camera.position);
        }
    }
    
    /**
     * Update celestial body references
     */
    updateCelestialBodies() {
        // This can be expanded to include planets, moons, etc. for AI navigation
        this.gameWorld.celestialBodies = [];
    }
    
    /**
     * Update AI systems with performance optimization
     * @param {number} deltaTime - Time delta in seconds
     */
    updateAI(deltaTime) {
        if (this.updateQueue.length === 0) return;
        
        // Update a limited number of AIs per frame for performance
        const updatesThisFrame = Math.min(this.maxAIUpdatesPerFrame, this.updateQueue.length);
        
        for (let i = 0; i < updatesThisFrame; i++) {
            const aiIndex = (this.currentUpdateIndex + i) % this.updateQueue.length;
            const ai = this.updateQueue[aiIndex];
            
            if (ai && this.activeAIs.has(ai)) {
                try {
                    ai.update(deltaTime, this.gameWorld);
                } catch (error) {
                    debug('P1', `AI update error for ${ai.ship?.shipType}: ${error.message}`);
                }
            }
        }
        
        // Advance update index for next frame
        this.currentUpdateIndex = (this.currentUpdateIndex + updatesThisFrame) % this.updateQueue.length;
    }
    
    /**
     * Clean up AI for destroyed ships
     */
    cleanupDestroyedShips() {
        const shipsToCleanup = [];
        
        for (const [ship, ai] of this.aiShips) {
            if (!ship || ship.currentHull <= 0) {
                shipsToCleanup.push(ship);
            }
        }
        
        for (const ship of shipsToCleanup) {
            this.removeAIFromShip(ship);
        }
    }
    
    /**
     * Set global difficulty level for all AI
     * @param {number} difficulty - Difficulty level (1-100)
     */
    setGlobalDifficulty(difficulty) {
        this.globalDifficulty = Math.max(1, Math.min(100, difficulty));
debug('AI', `🤖 Global AI difficulty set to ${this.globalDifficulty}`);
        
        // Apply to existing AIs
        for (const [ship, ai] of this.aiShips) {
            const newConfig = applyDifficultyModifiers(getAIConfig(ship.shipType), this.globalDifficulty);
            ai.aiConfig = newConfig;
        }
    }
    
    /**
     * Enable or disable AI system
     * @param {boolean} enabled - Whether AI should be enabled
     */
    setAIEnabled(enabled) {
        this.aiEnabled = enabled;
debug('AI', `🤖 AI system ${enabled ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Enable or disable debug mode for all AI
     * @param {boolean} debug - Whether debug mode should be enabled
     */
    setDebugMode(debug) {
        this.debugMode = debug;
        
        for (const ai of this.activeAIs) {
            if (debug) {
                ai.enableDebug();
            } else {
                ai.disableDebug();
            }
        }
        
        // Set debug mode for flocking manager
        this.flockingManager.setDebugMode(debug);
        
        // Set debug visualization
        this.debugVisualizer.setEnabled(debug);
        
debug('AI', `🤖 AI debug mode ${debug ? 'enabled' : 'disabled'}`);
    }
    
    /**
     * Get AI statistics for debugging
     * @returns {Object} AI statistics
     */
    getAIStats() {
        const stats = {
            totalAIs: this.activeAIs.size,
            activeShips: this.gameWorld.ships.length,
            updateQueueLength: this.updateQueue.length,
            difficulty: this.globalDifficulty,
            enabled: this.aiEnabled,
            debugMode: this.debugMode
        };
        
        // Count AIs by state
        stats.stateBreakdown = {};
        stats.combatBreakdown = {};
        stats.healthDistribution = { healthy: 0, damaged: 0, critical: 0 };
        
        for (const ai of this.activeAIs) {
            const state = ai.stateMachine?.currentState || 'unknown';
            stats.stateBreakdown[state] = (stats.stateBreakdown[state] || 0) + 1;
            
            const combatState = ai.combatBehavior?.getCombatState() || 'idle';
            stats.combatBreakdown[combatState] = (stats.combatBreakdown[combatState] || 0) + 1;
            
            const health = ai.getHealthPercentage();
            if (health > 0.7) stats.healthDistribution.healthy++;
            else if (health > 0.3) stats.healthDistribution.damaged++;
            else stats.healthDistribution.critical++;
        }
        
        // Add performance stats
        stats.performance = this.performanceManager.getPerformanceStats();
        
        // Add flocking stats
        stats.flocking = this.flockingManager.getDebugStats();
        
        // Add debug visualization stats
        stats.visualization = this.debugVisualizer.getDebugStats();
        
        return stats;
    }
    
    /**
     * Get all active AI instances
     * @returns {Array} Array of AI instances
     */
    getActiveAIs() {
        return Array.from(this.activeAIs);
    }
    
    /**
     * Get AI for a specific ship
     * @param {Object} ship - Ship to get AI for
     * @returns {Object|null} AI instance or null
     */
    getAIForShip(ship) {
        return this.aiShips.get(ship) || null;
    }
    
    /**
     * Force all AIs to a specific state (for testing)
     * @param {string} state - State to force
     */
    forceAllAIState(state) {
        for (const ai of this.activeAIs) {
            ai.setState(state);
        }
debug('AI', `🤖 Forced all AIs to state: ${state}`);
    }
    
    /**
     * Create a flock from existing AI ships
     * @param {Array} ships - Ships to include in flock
     * @param {Object} config - Flocking configuration
     * @returns {string} Flock ID
     */
    createFlockFromShips(ships, config = {}) {
        const aiShips = ships.filter(ship => ship.ai).map(ship => ({ ai: ship.ai, ship: ship }));
        if (aiShips.length < 2) {
            debug('AI', '⚠️ Need at least 2 AI ships to create a flock');
            return null;
        }
        
        return this.flockingManager.createFlock(aiShips, config);
    }
    
    /**
     * Assign formation to existing ships
     * @param {Array} ships - Ships to form up
     * @param {string} formationType - Type of formation
     * @param {Object} config - Formation configuration
     */
    createFormation(ships, formationType, config = {}) {
        const flockId = this.createFlockFromShips(ships, config);
        if (flockId) {
            this.flockingManager.assignFormation(flockId, formationType, config);
debug('AI', `🎯 Created ${formationType} formation with ${ships.length} ships`);
        }
    }
    
    /**
     * Get flocking debug statistics
     */
    getFlockingStats() {
        return this.flockingManager.getDebugStats();
    }
    
    /**
     * Cleanup when destroyed
     */
    destroy() {
        // Cleanup all AIs
        for (const ai of this.activeAIs) {
            ai.destroy();
        }

        // Cleanup sub-managers
        if (this.flockingManager) {
            this.flockingManager.destroy();
            this.flockingManager = null;
        }

        if (this.performanceManager) {
            if (typeof this.performanceManager.destroy === 'function') {
                this.performanceManager.destroy();
            }
            this.performanceManager = null;
        }

        if (this.debugVisualizer) {
            if (typeof this.debugVisualizer.destroy === 'function') {
                this.debugVisualizer.destroy();
            }
            this.debugVisualizer = null;
        }

        // Clear collections
        this.aiShips.clear();
        this.activeAIs.clear();
        this.updateQueue = [];
        this.gameWorld.ships = [];

        // Clear references
        this.scene = null;
        this.camera = null;
        this.starfieldManager = null;

        this.isInitialized = false;
debug('AI', 'EnemyAIManager destroyed');
    }
}

export default EnemyAIManager;
