import * as THREE from 'three';
import { AIStateMachine } from './AIStateMachine.js';
import { ThreatAssessment } from './ThreatAssessment.js';
import { FlockingBehavior } from './FlockingBehavior.js';
import { CombatBehavior } from './CombatBehavior.js';
import { WeaponTargeting } from './WeaponTargeting.js';

/**
 * EnemyAI - Base AI class for all enemy ships
 * Handles state management, threat assessment, and basic behaviors
 * 
 * Based on docs/enemy_ai_spec.md and docs/enemy_ai_implementation_plan.md
 */
export class EnemyAI {
    constructor(ship, aiConfig) {
        this.ship = ship;
        this.aiConfig = aiConfig;
        
        // Core AI components
        this.stateMachine = new AIStateMachine(this);
        this.threatAssessment = new ThreatAssessment(this);
        this.combatBehavior = new CombatBehavior(this);
        this.weaponTargeting = new WeaponTargeting(this);
        
        // AI state tracking
        this.currentTarget = null;
        this.lastKnownTargetPosition = null;
        this.combatStartTime = null;
        this.lastDistressCall = null;
        this.lastStateChange = Date.now();
        
        // Behavior parameters from config
        this.sensorRange = aiConfig.sensorRange || 2;  // 2km default (game units)
        this.fleeHealthThreshold = aiConfig.combatThresholds?.fleeHealth || 0.2;
        this.engageRange = aiConfig.combatThresholds?.engageRange || 1.5;  // 1.5km default (game units)
        this.evadeHealthThreshold = aiConfig.combatThresholds?.evadeHealth || 0.5;
        
        // Flocking behavior weights
        this.behaviorWeights = {
            separation: aiConfig.behaviorWeights?.separation || 0.5,
            alignment: aiConfig.behaviorWeights?.alignment || 0.3,
            cohesion: aiConfig.behaviorWeights?.cohesion || 0.3,
            pursuit: aiConfig.behaviorWeights?.pursuit || 0.7,
            evasion: aiConfig.behaviorWeights?.evasion || 0.8,
            orbiting: aiConfig.behaviorWeights?.orbiting || 0.4
        };
        
        // Movement state
        this.velocity = new THREE.Vector3();
        this.acceleration = new THREE.Vector3();
        this.maxSpeed = aiConfig.maxSpeed || 5;
        this.maxForce = aiConfig.maxForce || 0.1;
        
        // Flocking behavior
        this.flockingBehavior = new FlockingBehavior({
            separationWeight: aiConfig.flocking?.separationWeight || 0.8,
            alignmentWeight: aiConfig.flocking?.alignmentWeight || 0.6,
            cohesionWeight: aiConfig.flocking?.cohesionWeight || 0.4,
            formationWeight: aiConfig.flocking?.formationWeight || 0.7,
            avoidanceWeight: aiConfig.flocking?.avoidanceWeight || 1.0,
            separationRadius: aiConfig.flocking?.separationRadius || 0.5,
            alignmentRadius: aiConfig.flocking?.alignmentRadius || 2.0,
            cohesionRadius: aiConfig.flocking?.cohesionRadius || 3.0,
            maxForce: this.maxForce,
            maxSpeed: this.maxSpeed
        });
        this.flockId = null; // Set by FlockingManager when assigned to a flock
        
        // Sensor data
        this.nearbyShips = [];
        this.detectedThreats = [];
        this.detectedTargets = [];
        
        // Communication state
        this.lastCommunicationCheck = 0;
        this.communicationRange = aiConfig.communicationRange || 10;  // 10km default (game units)
        this.distressCallCooldown = 5000; // 5 seconds between distress calls
        
        // Debug state
        this.debugMode = false;
        
        console.log(`🤖 EnemyAI initialized for ${ship.shipType} with config:`, aiConfig);
    }
    
    /**
     * Main AI update loop - called every frame
     * @param {number} deltaTime - Time since last update in seconds
     * @param {Object} gameWorld - Reference to game world objects
     */
    update(deltaTime, gameWorld) {
        try {
            // Update sensor data
            this.updateSensors(gameWorld);
            
            // Update threat assessment
            this.threatAssessment.update(deltaTime, gameWorld);
            
            // Update combat behavior
            this.combatBehavior.update(deltaTime, this.threatAssessment);
            
            // Update weapon targeting
            const primaryThreat = this.threatAssessment.getPrimaryThreat();
            this.weaponTargeting.update(deltaTime, primaryThreat?.ship || null);
            
            // Update state machine
            this.stateMachine.update(deltaTime, gameWorld);
            
            // Execute weapon firing
            this.handleWeaponFiring();
            
            // Apply movement forces
            this.updateMovement(deltaTime);
            
            // Handle communication
            this.updateCommunication(deltaTime, gameWorld);
            
            // Debug logging
            if (this.debugMode && Date.now() % 1000 < 50) { // Log once per second
                this.logDebugInfo();
            }
            
        } catch (error) {
            console.error(`🤖 EnemyAI update error for ${this.ship.shipType}:`, error);
        }
    }
    
    /**
     * Update sensor data to detect nearby ships, threats, and targets
     * @param {Object} gameWorld - Game world reference
     */
    updateSensors(gameWorld) {
        this.nearbyShips = [];
        this.detectedThreats = [];
        this.detectedTargets = [];
        
        if (!gameWorld.ships || !this.ship.position) return;
        
        // Detect nearby ships within sensor range
        for (const ship of gameWorld.ships) {
            if (ship === this.ship) continue;
            
            const distance = this.ship.position.distanceTo(ship.position);
            if (distance <= this.sensorRange) {
                this.nearbyShips.push({
                    ship: ship,
                    distance: distance,
                    relativePosition: ship.position.clone().sub(this.ship.position)
                });
                
                // Classify as threat or target based on diplomacy
                if (ship.diplomacy === 'enemy' || ship.isPlayer) {
                    this.detectedThreats.push(ship);
                } else if (ship.diplomacy === 'neutral') {
                    this.detectedTargets.push(ship);
                }
            }
        }
        
        // Sort by distance (closest first)
        this.nearbyShips.sort((a, b) => a.distance - b.distance);
        this.detectedThreats.sort((a, b) => 
            this.ship.position.distanceTo(a.position) - this.ship.position.distanceTo(b.position)
        );
    }
    
    /**
     * Handle weapon firing based on targeting solution
     */
    handleWeaponFiring() {
        if (!this.weaponTargeting) return;
        
        // Check if we should fire
        const targetingSolution = this.weaponTargeting.getTargetingSolution();
        if (!targetingSolution || !this.weaponTargeting.shouldFire()) {
            return;
        }
        
        // Execute firing command
        const firingSolution = this.weaponTargeting.executeFireCommand();
        if (firingSolution) {
            // Integrate with weapon effects system (if available)
            this.createWeaponEffect(firingSolution);
            
            // Update combat statistics
            if (this.combatBehavior.recordShot) {
                this.combatBehavior.recordShot();
            }
        }
    }
    
    /**
     * Create weapon effect (placeholder for integration with effects system)
     */
    createWeaponEffect(firingSolution) {
        // This would integrate with the game's weapon effects system
        // For now, just log the firing event
        console.log(`💥 ${this.ship.shipType} fired at ${firingSolution.target.shipType || 'target'} (${(firingSolution.hitProbability * 100).toFixed(1)}% hit chance)`);
        
        // TODO: Create visual/audio effects
        // TODO: Apply damage to target if hit
        // TODO: Create projectile or beam effect
    }
    
    /**
     * Update movement based on current AI forces
     * @param {number} deltaTime - Time delta in seconds
     */
    updateMovement(deltaTime) {
        if (!this.ship.position) return;
        
        // Limit acceleration magnitude
        if (this.acceleration.length() > this.maxForce) {
            this.acceleration.normalize().multiplyScalar(this.maxForce);
        }
        
        // Update velocity
        this.velocity.add(this.acceleration.clone().multiplyScalar(deltaTime));
        
        // Limit velocity magnitude
        if (this.velocity.length() > this.maxSpeed) {
            this.velocity.normalize().multiplyScalar(this.maxSpeed);
        }
        
        // Update position
        const movement = this.velocity.clone().multiplyScalar(deltaTime);
        this.ship.position.add(movement);
        
        // Update ship's 3D mesh if it exists
        if (this.ship.mesh) {
            this.ship.mesh.position.copy(this.ship.position);
            
            // Orient ship towards movement direction
            if (this.velocity.length() > 0.1) {
                const lookDirection = this.velocity.clone().normalize();
                const lookAtPosition = this.ship.position.clone().add(lookDirection);
                this.ship.mesh.lookAt(lookAtPosition);
            }
        }
        
        // Reset acceleration for next frame
        this.acceleration.set(0, 0, 0);
    }
    
    /**
     * Handle inter-ship communication
     * @param {number} deltaTime - Time delta
     * @param {Object} gameWorld - Game world reference
     */
    updateCommunication(deltaTime, gameWorld) {
        const now = Date.now();
        
        // Check for distress calls from allies
        if (now - this.lastCommunicationCheck > 1000) { // Check every second
            this.checkForDistressCalls(gameWorld);
            this.lastCommunicationCheck = now;
        }
        
        // Send distress call if under attack and not in cooldown
        if (this.shouldSendDistressCall() && 
            (!this.lastDistressCall || now - this.lastDistressCall > this.distressCallCooldown)) {
            this.sendDistressCall(gameWorld);
            this.lastDistressCall = now;
        }
    }
    
    /**
     * Check if this ship should send a distress call
     * @returns {boolean}
     */
    shouldSendDistressCall() {
        return this.stateMachine.currentState === 'engage' || 
               this.stateMachine.currentState === 'evade' ||
               (this.ship.currentHull / this.ship.maxHull) < this.evadeHealthThreshold;
    }
    
    /**
     * Send distress call to nearby allies
     * @param {Object} gameWorld - Game world reference
     */
    sendDistressCall(gameWorld) {
        if (!gameWorld.ships) return;
        
        const distressMessage = {
            type: 'distress',
            sender: this.ship,
            position: this.ship.position.clone(),
            threat: this.currentTarget,
            threatLevel: this.threatAssessment.getCurrentThreatLevel(),
            timestamp: Date.now()
        };
        
        // Send to nearby allied ships
        for (const ship of gameWorld.ships) {
            if (ship === this.ship || !ship.ai || ship.diplomacy !== this.ship.diplomacy) continue;
            
            const distance = this.ship.position.distanceTo(ship.position);
            if (distance <= this.communicationRange) {
                ship.ai.receiveDistressCall(distressMessage);
            }
        }
        
        console.log(`📡 ${this.ship.shipType} sent distress call (threat level: ${distressMessage.threatLevel})`);
    }
    
    /**
     * Receive and process distress call from another ship
     * @param {Object} message - Distress call message
     */
    receiveDistressCall(message) {
        // Only respond if not already in combat and can help
        if (this.stateMachine.currentState === 'idle' || this.stateMachine.currentState === 'patrol') {
            const distance = this.ship.position.distanceTo(message.position);
            
            // Decide whether to respond based on distance and threat level
            if (distance <= this.communicationRange && message.threatLevel > 0.5) {
                this.respondToDistressCall(message);
            }
        }
    }
    
    /**
     * Respond to a distress call
     * @param {Object} message - Distress call message
     */
    respondToDistressCall(message) {
        console.log(`📡 ${this.ship.shipType} responding to distress call from ${message.sender.shipType}`);
        
        // Set emergency target
        if (message.threat) {
            this.currentTarget = message.threat;
            this.lastKnownTargetPosition = message.threat.position?.clone() || message.position;
        }
        
        // Change state to engage
        this.stateMachine.setState('engage');
    }
    
    /**
     * Check for incoming distress calls
     * @param {Object} gameWorld - Game world reference
     */
    checkForDistressCalls(gameWorld) {
        // This method would be called when communication system is more fully implemented
        // For now, distress calls are handled directly in sendDistressCall
    }
    
    /**
     * Apply a steering force to the ship's acceleration
     * @param {THREE.Vector3} force - Steering force to apply
     * @param {number} weight - Weight multiplier for the force
     */
    applyForce(force, weight = 1.0) {
        this.acceleration.add(force.multiplyScalar(weight));
    }
    
    /**
     * Get the current target for this AI
     * @returns {Object|null} Current target ship or null
     */
    getCurrentTarget() {
        return this.currentTarget;
    }
    
    /**
     * Set a new target for this AI
     * @param {Object} target - Target ship to engage
     */
    setTarget(target) {
        this.currentTarget = target;
        if (target && target.position) {
            this.lastKnownTargetPosition = target.position.clone();
        }
    }
    
    /**
     * Clear the current target
     */
    clearTarget() {
        this.currentTarget = null;
        this.lastKnownTargetPosition = null;
    }
    
    /**
     * Get current AI state
     * @returns {string} Current state name
     */
    getState() {
        return this.stateMachine.currentState;
    }
    
    /**
     * Force a state change
     * @param {string} newState - New state to transition to
     */
    setState(newState) {
        this.stateMachine.setState(newState);
    }
    
    /**
     * Get health percentage
     * @returns {number} Health as percentage (0.0 to 1.0)
     */
    getHealthPercentage() {
        if (!this.ship.maxHull || this.ship.maxHull === 0) return 1.0;
        return Math.max(0, this.ship.currentHull / this.ship.maxHull);
    }
    
    /**
     * Check if ship should flee based on health and situation
     * @returns {boolean}
     */
    shouldFlee() {
        return this.getHealthPercentage() < this.fleeHealthThreshold;
    }
    
    /**
     * Check if ship should evade based on health and threat
     * @returns {boolean}
     */
    shouldEvade() {
        return this.getHealthPercentage() < this.evadeHealthThreshold && 
               this.detectedThreats.length > 0;
    }
    
    /**
     * Enable debug mode for this AI
     */
    enableDebug() {
        this.debugMode = true;
        console.log(`🐛 Debug mode enabled for ${this.ship.shipType}`);
    }
    
    /**
     * Disable debug mode for this AI
     */
    disableDebug() {
        this.debugMode = false;
    }
    
    /**
     * Log debug information about AI state
     */
    logDebugInfo() {
        const healthPct = (this.getHealthPercentage() * 100).toFixed(1);
        const state = this.stateMachine.currentState;
        const targetInfo = this.currentTarget ? 
            `${this.currentTarget.shipType || 'unknown'} at ${this.ship.position.distanceTo(this.currentTarget.position).toFixed(1)}m` : 
            'none';
        
        console.log(`🤖 ${this.ship.shipType} AI Debug:
            State: ${state}
            Health: ${healthPct}%
            Target: ${targetInfo}
            Threats: ${this.detectedThreats.length}
            Nearby: ${this.nearbyShips.length}
            Velocity: ${this.velocity.length().toFixed(2)}m/s`);
    }
    
    /**
     * Get current combat state information
     */
    getCombatState() {
        return {
            state: this.stateMachine.currentState,
            combatState: this.combatBehavior?.getCombatState() || 'idle',
            threatLevel: this.threatAssessment?.getCurrentThreatLevel() || 0,
            currentTarget: this.currentTarget?.shipType || 'none',
            lockQuality: this.weaponTargeting?.getLockQuality() || 0,
            canFire: this.weaponTargeting?.shouldFire() || false,
            health: this.ship.currentHull / this.ship.maxHull
        };
    }
    
    /**
     * Get comprehensive debug information
     */
    getDebugInfo() {
        return {
            shipType: this.ship.shipType,
            aiState: this.stateMachine.currentState,
            combatInfo: this.combatBehavior?.getDebugInfo() || {},
            threatInfo: this.threatAssessment?.getDebugInfo() || {},
            targetingInfo: this.weaponTargeting?.getDebugInfo() || {},
            flockingInfo: this.flockingBehavior?.getDebugInfo() || {},
            position: this.ship.position?.clone() || new THREE.Vector3(),
            velocity: this.velocity.clone(),
            energy: this.ship.currentEnergy || 0,
            health: (this.ship.currentHull / this.ship.maxHull * 100).toFixed(1) + '%'
        };
    }
    
    /**
     * Force AI to a specific state (for debugging)
     */
    setState(state) {
        if (this.stateMachine.transitions[this.stateMachine.currentState] && 
            this.stateMachine.transitions[this.stateMachine.currentState][state]) {
            this.stateMachine.currentState = state;
            this.stateMachine.stateStartTime = Date.now();
            console.log(`🤖 ${this.ship.shipType} forced to state: ${state}`);
        } else {
            console.warn(`⚠️ Invalid state transition: ${this.stateMachine.currentState} → ${state}`);
        }
    }
    
    /**
     * Set target for AI (overrides threat assessment)
     */
    setTarget(target) {
        this.currentTarget = target;
        if (this.weaponTargeting) {
            this.weaponTargeting.setTarget(target);
        }
        if (this.combatBehavior) {
            this.combatBehavior.setTarget(target);
        }
    }
    
    /**
     * Clear current target
     */
    clearTarget() {
        this.currentTarget = null;
        if (this.weaponTargeting) {
            this.weaponTargeting.setTarget(null);
        }
        if (this.combatBehavior) {
            this.combatBehavior.clearTarget();
        }
    }
    
    /**
     * Get ship health percentage
     */
    getHealthPercentage() {
        return this.ship.currentHull / this.ship.maxHull;
    }
    
    /**
     * Check if ship should flee based on health and threat level
     */
    shouldFlee() {
        const healthPercent = this.getHealthPercentage();
        const threatLevel = this.threatAssessment?.getCurrentThreatLevel() || 0;
        
        return healthPercent < this.fleeHealthThreshold || 
               (threatLevel > 0.8 && healthPercent < 0.5);
    }
    
    /**
     * Check if ship should evade
     */
    shouldEvade() {
        const healthPercent = this.getHealthPercentage();
        const threatLevel = this.threatAssessment?.getCurrentThreatLevel() || 0;
        
        return healthPercent < this.evadeHealthThreshold && threatLevel > 0.4;
    }
    
    /**
     * Cleanup when AI is destroyed
     */
    destroy() {
        this.stateMachine.destroy();
        this.threatAssessment.destroy();
        
        if (this.combatBehavior) {
            this.combatBehavior.destroy();
        }
        if (this.weaponTargeting) {
            this.weaponTargeting.destroy();
        }
        if (this.flockingBehavior) {
            this.flockingBehavior.clearFormationTarget();
        }
        
        this.currentTarget = null;
        this.nearbyShips = [];
        this.detectedThreats = [];
        this.detectedTargets = [];
        
        console.log(`🤖 EnemyAI destroyed for ${this.ship.shipType}`);
    }
}

export default EnemyAI;
