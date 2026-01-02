import * as THREE from 'three';
import { debug } from '../debug.js';

/**
 * AIStateMachine - Finite state machine for enemy AI behavior
 * 
 * States: idle, engage, evade, flee, buzz
 * Based on docs/enemy_ai_spec.md state definitions
 */
export class AIStateMachine {
    constructor(ai) {
        this.ai = ai;
        this.ship = ai.ship;
        this.currentState = 'idle';
        this.previousState = null;
        this.stateStartTime = Date.now();
        this.stateData = {}; // State-specific data storage
        
        // State transition rules
        this.transitions = {
            idle: {
                engage: () => this.hasValidTarget() && this.inEngagementRange(),
                buzz: () => this.hasNeutralTarget() && this.ship.shipType === 'scout'
            },
            engage: {
                evade: () => this.ai.shouldEvade() && this.underHeavyFire(),
                flee: () => this.ai.shouldFlee(),
                idle: () => !this.hasValidTarget() || this.threatEliminated()
            },
            evade: {
                engage: () => !this.underHeavyFire() && this.hasValidTarget(),
                flee: () => this.ai.shouldFlee(),
                idle: () => !this.hasValidTarget()
            },
            flee: {
                idle: () => this.atSafeDistance() && this.ai.getHealthPercentage() > 0.4,
                // Carriers can warp out when heavily damaged
                warp: () => this.ship.shipType === 'carrier' && this.ai.getHealthPercentage() < 0.3
            },
            buzz: {
                idle: () => this.inspectionComplete(),
                engage: () => this.attackedDuringBuzz()
            }
        };
        
        // State behavior implementations
        this.stateBehaviors = {
            idle: this.idleBehavior.bind(this),
            engage: this.engageBehavior.bind(this),
            evade: this.evadeBehavior.bind(this),
            flee: this.fleeBehavior.bind(this),
            buzz: this.buzzBehavior.bind(this)
        };
        
debug('AI', `🎯 AIStateMachine initialized for ${this.ship.shipType}`);
    }
    
    /**
     * Update state machine
     * @param {number} deltaTime - Time since last update
     * @param {Object} gameWorld - Game world reference
     */
    update(deltaTime, gameWorld) {
        // Check for state transitions
        this.checkTransitions();
        
        // Execute current state behavior
        if (this.stateBehaviors[this.currentState]) {
            this.stateBehaviors[this.currentState](deltaTime, gameWorld);
        }
    }
    
    /**
     * Check and execute valid state transitions
     */
    checkTransitions() {
        const currentTransitions = this.transitions[this.currentState];
        if (!currentTransitions) return;
        
        for (const [newState, condition] of Object.entries(currentTransitions)) {
            if (condition()) {
                this.setState(newState);
                break; // Only one transition per update
            }
        }
    }
    
    /**
     * Change to a new state
     * @param {string} newState - State to transition to
     */
    setState(newState) {
        if (newState === this.currentState) return;
        
        const oldState = this.currentState;
        this.previousState = oldState;
        this.currentState = newState;
        this.stateStartTime = Date.now();
        this.stateData = {}; // Reset state data
        
        // Call state exit/enter handlers
        this.onStateExit(oldState);
        this.onStateEnter(newState);
        
debug('UTILITY', `🎯 ${this.ship.shipType} state: ${oldState} → ${newState}`);
    }
    
    /**
     * Handle entering a new state
     * @param {string} state - State being entered
     */
    onStateEnter(state) {
        switch (state) {
            case 'engage':
                this.ai.combatStartTime = Date.now();
                break;
            case 'flee':
                // Calculate flee direction away from threats
                this.calculateFleeDirection();
                break;
            case 'buzz':
                // Set up buzzing orbit parameters
                this.setupBuzzingOrbit();
                break;
        }
    }
    
    /**
     * Handle exiting a state
     * @param {string} state - State being exited
     */
    onStateExit(state) {
        switch (state) {
            case 'engage':
                this.ai.combatStartTime = null;
                break;
            case 'buzz':
                this.stateData.buzzTarget = null;
                break;
        }
    }
    
    // ===================
    // STATE BEHAVIORS
    // ===================
    
    /**
     * Idle state behavior - patrol and scan for targets
     */
    idleBehavior(deltaTime, gameWorld) {
        // Basic patrol behavior - slow movement in random direction
        if (!this.stateData.patrolDirection || Math.random() < 0.01) { // Change direction occasionally
            this.stateData.patrolDirection = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 0.5, // Less vertical movement
                (Math.random() - 0.5) * 2
            ).normalize();
        }
        
        // Apply gentle patrol force
        const patrolForce = this.stateData.patrolDirection.clone().multiplyScalar(0.02);
        this.ai.applyForce(patrolForce);
    }
    
    /**
     * Engage state behavior - attack current target
     */
    engageBehavior(deltaTime, gameWorld) {
        if (!this.ai.currentTarget) return;
        
        const target = this.ai.currentTarget;
        const toTarget = target.position.clone().sub(this.ship.position);
        const distance = toTarget.length();
        
        // Different engagement behaviors based on ship type
        switch (this.ship.shipType) {
            case 'scout':
                this.scoutEngagement(toTarget, distance);
                break;
            case 'light_fighter':
            case 'heavy_fighter':
                this.fighterEngagement(toTarget, distance);
                break;
            case 'carrier':
                this.carrierEngagement(toTarget, distance);
                break;
            default:
                this.defaultEngagement(toTarget, distance);
        }
    }
    
    /**
     * Evade state behavior - avoid threats while maintaining some offensive capability
     */
    evadeBehavior(deltaTime, gameWorld) {
        // Calculate evasion vector away from threats
        let evasionVector = new THREE.Vector3();
        
        for (const threat of this.ai.detectedThreats) {
            const toThreat = threat.position.clone().sub(this.ship.position);
            const distance = toThreat.length();
            if (distance > 0) {
                // Add inverse vector weighted by proximity
                const weight = 1.0 / (distance * distance);
                evasionVector.add(toThreat.normalize().multiplyScalar(-weight));
            }
        }
        
        if (evasionVector.length() > 0) {
            evasionVector.normalize();
            const evasionForce = evasionVector.multiplyScalar(0.08);
            this.ai.applyForce(evasionForce);
        }
        
        // Still engage if target is available but with reduced aggression
        if (this.ai.currentTarget) {
            const toTarget = this.ai.currentTarget.position.clone().sub(this.ship.position);
            const distance = toTarget.length();
            
            if (distance < this.ai.engageRange * 1.5) { // Slightly extended range for evasive engagement
                const pursuitForce = toTarget.normalize().multiplyScalar(0.03); // Reduced force
                this.ai.applyForce(pursuitForce);
            }
        }
    }
    
    /**
     * Flee state behavior - escape from combat
     */
    fleeBehavior(deltaTime, gameWorld) {
        if (!this.stateData.fleeDirection) {
            this.calculateFleeDirection();
        }
        
        // Apply strong flee force
        const fleeForce = this.stateData.fleeDirection.clone().multiplyScalar(0.1);
        this.ai.applyForce(fleeForce);
        
        // Clear target while fleeing
        this.ai.clearTarget();
    }
    
    /**
     * Buzz state behavior - orbit neutral target for inspection
     */
    buzzBehavior(deltaTime, gameWorld) {
        if (!this.stateData.buzzTarget) {
            // Find a neutral target to buzz
            for (const target of this.ai.detectedTargets) {
                if (target.diplomacy === 'neutral') {
                    this.stateData.buzzTarget = target;
                    this.setupBuzzingOrbit();
                    break;
                }
            }
            return;
        }
        
        const target = this.stateData.buzzTarget;
        const toTarget = target.position.clone().sub(this.ship.position);
        const distance = toTarget.length();
        
        // Orbit parameters
        const orbitRadius = this.stateData.orbitRadius || 500; // 500m orbit
        const orbitSpeed = this.stateData.orbitSpeed || 1.0;
        
        if (distance > orbitRadius * 1.2) {
            // Approach target
            const approachForce = toTarget.normalize().multiplyScalar(0.05);
            this.ai.applyForce(approachForce);
        } else if (distance < orbitRadius * 0.8) {
            // Move away from target
            const retreatForce = toTarget.normalize().multiplyScalar(-0.05);
            this.ai.applyForce(retreatForce);
        } else {
            // Orbit around target
            const orbitDirection = new THREE.Vector3(-toTarget.z, 0, toTarget.x).normalize();
            const orbitForce = orbitDirection.multiplyScalar(orbitSpeed * 0.03);
            this.ai.applyForce(orbitForce);
        }
        
        // Check if inspection is complete (after some time)
        const buzzDuration = Date.now() - this.stateStartTime;
        if (buzzDuration > (this.stateData.inspectionTime || 10000)) { // 10 seconds default
            this.stateData.inspectionComplete = true;
        }
    }
    
    // ===================
    // SHIP-SPECIFIC ENGAGEMENT BEHAVIORS
    // ===================
    
    /**
     * Scout engagement - hit and run tactics
     */
    scoutEngagement(toTarget, distance) {
        if (distance > this.ai.engageRange) {
            // Approach but be ready to flee
            const approachForce = toTarget.normalize().multiplyScalar(0.04);
            this.ai.applyForce(approachForce);
        } else {
            // Hit and run - attack briefly then evade
            if (!this.stateData.attackPhase) {
                this.stateData.attackPhase = 'approach';
                this.stateData.attackStartTime = Date.now();
            }
            
            const attackDuration = Date.now() - this.stateData.attackStartTime;
            
            if (this.stateData.attackPhase === 'approach' && attackDuration > 2000) {
                this.stateData.attackPhase = 'retreat';
                this.stateData.retreatDirection = toTarget.clone().normalize().multiplyScalar(-1);
            } else if (this.stateData.attackPhase === 'retreat' && attackDuration > 4000) {
                this.stateData.attackPhase = 'approach';
                this.stateData.attackStartTime = Date.now();
            }
            
            if (this.stateData.attackPhase === 'retreat') {
                const retreatForce = this.stateData.retreatDirection.multiplyScalar(0.06);
                this.ai.applyForce(retreatForce);
            } else {
                const attackForce = toTarget.normalize().multiplyScalar(0.03);
                this.ai.applyForce(attackForce);
            }
        }
    }
    
    /**
     * Fighter engagement - direct combat
     */
    fighterEngagement(toTarget, distance) {
        const optimalRange = this.ai.engageRange * 0.7; // Stay at 70% of max range
        
        if (distance > optimalRange * 1.2) {
            // Close distance
            const pursuitForce = toTarget.normalize().multiplyScalar(0.06);
            this.ai.applyForce(pursuitForce);
        } else if (distance < optimalRange * 0.8) {
            // Maintain distance
            const retreatForce = toTarget.normalize().multiplyScalar(-0.03);
            this.ai.applyForce(retreatForce);
        } else {
            // Circle strafe
            const strafeDirection = new THREE.Vector3(-toTarget.z, 0, toTarget.x).normalize();
            const strafeForce = strafeDirection.multiplyScalar(0.04);
            this.ai.applyForce(strafeForce);
        }
    }
    
    /**
     * Carrier engagement - deploy fighters and maintain distance
     */
    carrierEngagement(toTarget, distance) {
        const safeRange = this.ai.engageRange * 1.5; // Carriers stay further back
        
        if (distance < safeRange) {
            // Retreat to safe distance
            const retreatForce = toTarget.normalize().multiplyScalar(-0.04);
            this.ai.applyForce(retreatForce);
        }
        
        // FUTURE: Add fighter deployment for carrier-class ships
    }
    
    /**
     * Default engagement behavior
     */
    defaultEngagement(toTarget, distance) {
        if (distance > this.ai.engageRange * 0.8) {
            const pursuitForce = toTarget.normalize().multiplyScalar(0.05);
            this.ai.applyForce(pursuitForce);
        }
    }
    
    // ===================
    // TRANSITION CONDITIONS
    // ===================
    
    hasValidTarget() {
        return this.ai.currentTarget && 
               this.ai.currentTarget.position && 
               this.ai.currentTarget.currentHull > 0;
    }
    
    inEngagementRange() {
        if (!this.ai.currentTarget) return false;
        const distance = this.ship.position.distanceTo(this.ai.currentTarget.position);
        return distance <= this.ai.sensorRange;
    }
    
    hasNeutralTarget() {
        return this.ai.detectedTargets.some(target => target.diplomacy === 'neutral');
    }
    
    underHeavyFire() {
        // Simple check - if health is dropping rapidly or below evade threshold
        return this.ai.getHealthPercentage() < this.ai.evadeHealthThreshold ||
               this.ai.detectedThreats.length > 1;
    }
    
    threatEliminated() {
        return !this.ai.currentTarget || 
               this.ai.currentTarget.currentHull <= 0 ||
               this.ship.position.distanceTo(this.ai.currentTarget.position) > this.ai.sensorRange * 1.5;
    }
    
    atSafeDistance() {
        if (this.ai.detectedThreats.length === 0) return true;
        
        const minSafeDistance = this.ai.sensorRange * 1.5;
        return this.ai.detectedThreats.every(threat => 
            this.ship.position.distanceTo(threat.position) > minSafeDistance
        );
    }
    
    inspectionComplete() {
        return this.stateData.inspectionComplete === true;
    }
    
    attackedDuringBuzz() {
        // Check if ship has taken damage recently while buzzing
        return this.ai.getHealthPercentage() < 0.9;
    }
    
    // ===================
    // HELPER METHODS
    // ===================
    
    /**
     * Calculate optimal flee direction away from all threats
     */
    calculateFleeDirection() {
        let fleeVector = new THREE.Vector3();
        
        // Average direction away from all threats
        for (const threat of this.ai.detectedThreats) {
            const toThreat = threat.position.clone().sub(this.ship.position);
            if (toThreat.length() > 0) {
                fleeVector.add(toThreat.normalize().multiplyScalar(-1));
            }
        }
        
        if (fleeVector.length() === 0) {
            // No specific threats, flee in random direction
            fleeVector = new THREE.Vector3(
                Math.random() - 0.5,
                (Math.random() - 0.5) * 0.3, // Less vertical
                Math.random() - 0.5
            );
        }
        
        this.stateData.fleeDirection = fleeVector.normalize();
    }
    
    /**
     * Set up buzzing orbit parameters
     */
    setupBuzzingOrbit() {
        this.stateData.orbitRadius = 300 + Math.random() * 400; // 300-700m orbit
        this.stateData.orbitSpeed = 0.8 + Math.random() * 0.4; // Vary orbit speed
        this.stateData.inspectionTime = 8000 + Math.random() * 4000; // 8-12 seconds
        this.stateData.inspectionComplete = false;
    }
    
    /**
     * Get current state
     * @returns {string} Current state name
     */
    getCurrentState() {
        return this.currentState;
    }
    
    /**
     * Get time in current state
     * @returns {number} Milliseconds in current state
     */
    getTimeInState() {
        return Date.now() - this.stateStartTime;
    }
    
    /**
     * Cleanup when destroyed
     */
    destroy() {
        this.ai = null;
        this.ship = null;
        this.stateData = {};
    }
}

export default AIStateMachine;
