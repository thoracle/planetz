/**
 * FlockingBehavior.js
 * 
 * Implements advanced flocking behaviors for enemy AI ships including:
 * - Separation: Avoid crowding local flockmates
 * - Alignment: Steer towards average heading of neighbors  
 * - Cohesion: Steer towards average position of neighbors
 * - Formation Flying: Maintain structured group formations
 * - Obstacle Avoidance: Navigate around environmental hazards
 * 
 * Based on Craig Reynolds' classic boids algorithm with game-specific enhancements
 */

import * as THREE from 'three';

export class FlockingBehavior {
    constructor(config = {}) {
        // Flocking behavior weights (0.0 to 1.0)
        this.separationWeight = config.separationWeight || 0.8;
        this.alignmentWeight = config.alignmentWeight || 0.6;
        this.cohesionWeight = config.cohesionWeight || 0.4;
        this.formationWeight = config.formationWeight || 0.7;
        this.avoidanceWeight = config.avoidanceWeight || 1.0;
        
        // Detection ranges (in km - game units)
        this.separationRadius = config.separationRadius || 0.5;  // 500m personal space
        this.alignmentRadius = config.alignmentRadius || 2.0;    // 2km for heading sync
        this.cohesionRadius = config.cohesionRadius || 3.0;      // 3km for group cohesion
        this.avoidanceRadius = config.avoidanceRadius || 1.0;    // 1km obstacle detection
        
        // Force limits
        this.maxForce = config.maxForce || 0.3;      // Maximum steering force
        this.maxSpeed = config.maxSpeed || 0.8;      // Maximum movement speed
        
        // Formation parameters
        this.formationPosition = new THREE.Vector3(); // Desired position in formation
        this.formationHeading = new THREE.Vector3();  // Desired heading in formation
        this.hasFormationTarget = false;
        
        // Temporary vectors for calculations (reused to avoid garbage collection)
        this.tempVector1 = new THREE.Vector3();
        this.tempVector2 = new THREE.Vector3();
        this.tempVector3 = new THREE.Vector3();
    }
    
    /**
     * Calculate steering force based on flocking behaviors
     * @param {EnemyAI} ai - The AI instance requesting steering
     * @param {Array} neighbors - Nearby AI instances
     * @param {Array} obstacles - Environmental obstacles to avoid
     * @returns {THREE.Vector3} - Steering force vector
     */
    calculateSteeringForce(ai, neighbors = [], obstacles = []) {
        const steering = new THREE.Vector3();
        
        if (!ai.ship || !ai.ship.position) {
            return steering;
        }
        
        // Calculate individual behavior forces
        const separation = this.calculateSeparation(ai, neighbors);
        const alignment = this.calculateAlignment(ai, neighbors);
        const cohesion = this.calculateCohesion(ai, neighbors);
        const formation = this.calculateFormation(ai);
        const avoidance = this.calculateAvoidance(ai, obstacles);
        
        // Apply weights and combine forces
        separation.multiplyScalar(this.separationWeight);
        alignment.multiplyScalar(this.alignmentWeight);
        cohesion.multiplyScalar(this.cohesionWeight);
        formation.multiplyScalar(this.formationWeight);
        avoidance.multiplyScalar(this.avoidanceWeight);
        
        // Combine all forces
        steering.add(separation);
        steering.add(alignment);
        steering.add(cohesion);
        steering.add(formation);
        steering.add(avoidance);
        
        // Limit maximum steering force
        if (steering.length() > this.maxForce) {
            steering.normalize().multiplyScalar(this.maxForce);
        }
        
        return steering;
    }
    
    /**
     * Separation: Steer to avoid crowding local flockmates
     */
    calculateSeparation(ai, neighbors) {
        const force = this.tempVector1.set(0, 0, 0);
        const myPos = ai.ship.position;
        let count = 0;
        
        for (const neighbor of neighbors) {
            if (!neighbor.ship || !neighbor.ship.position || neighbor === ai) continue;
            
            const distance = myPos.distanceTo(neighbor.ship.position);
            if (distance > 0 && distance < this.separationRadius) {
                // Calculate steering away from neighbor
                const diff = this.tempVector2.subVectors(myPos, neighbor.ship.position);
                diff.normalize();
                diff.divideScalar(distance); // Weight by distance (closer = stronger force)
                force.add(diff);
                count++;
            }
        }
        
        if (count > 0) {
            force.divideScalar(count); // Average the force
            force.normalize().multiplyScalar(this.maxSpeed);
            force.sub(ai.velocity || new THREE.Vector3()); // Steering = Desired - Current
        }
        
        return force;
    }
    
    /**
     * Alignment: Steer towards the average heading of neighbors
     */
    calculateAlignment(ai, neighbors) {
        const force = this.tempVector1.set(0, 0, 0);
        let count = 0;
        
        for (const neighbor of neighbors) {
            if (!neighbor.ship || !neighbor.velocity || neighbor === ai) continue;
            
            const distance = ai.ship.position.distanceTo(neighbor.ship.position);
            if (distance > 0 && distance < this.alignmentRadius) {
                force.add(neighbor.velocity);
                count++;
            }
        }
        
        if (count > 0) {
            force.divideScalar(count); // Average velocity
            force.normalize().multiplyScalar(this.maxSpeed);
            force.sub(ai.velocity || new THREE.Vector3()); // Steering = Desired - Current
        }
        
        return force;
    }
    
    /**
     * Cohesion: Steer to move toward the average position of neighbors
     */
    calculateCohesion(ai, neighbors) {
        const force = this.tempVector1.set(0, 0, 0);
        const centerOfMass = this.tempVector2.set(0, 0, 0);
        let count = 0;
        
        for (const neighbor of neighbors) {
            if (!neighbor.ship || !neighbor.ship.position || neighbor === ai) continue;
            
            const distance = ai.ship.position.distanceTo(neighbor.ship.position);
            if (distance > 0 && distance < this.cohesionRadius) {
                centerOfMass.add(neighbor.ship.position);
                count++;
            }
        }
        
        if (count > 0) {
            centerOfMass.divideScalar(count); // Average position
            force.subVectors(centerOfMass, ai.ship.position); // Vector toward center
            force.normalize().multiplyScalar(this.maxSpeed);
            force.sub(ai.velocity || new THREE.Vector3()); // Steering = Desired - Current
        }
        
        return force;
    }
    
    /**
     * Formation: Steer toward assigned formation position
     */
    calculateFormation(ai) {
        const force = this.tempVector1.set(0, 0, 0);
        
        if (this.hasFormationTarget && ai.ship && ai.ship.position) {
            // Steer toward formation position
            const desired = this.tempVector2.subVectors(this.formationPosition, ai.ship.position);
            const distance = desired.length();
            
            if (distance > 0.1) { // Only apply force if not already at position
                desired.normalize().multiplyScalar(this.maxSpeed);
                force.subVectors(desired, ai.velocity || new THREE.Vector3());
                
                // Reduce force as we get closer to formation position
                const dampingFactor = Math.min(distance / 2.0, 1.0);
                force.multiplyScalar(dampingFactor);
            }
        }
        
        return force;
    }
    
    /**
     * Avoidance: Steer away from obstacles and environmental hazards
     */
    calculateAvoidance(ai, obstacles) {
        const force = this.tempVector1.set(0, 0, 0);
        
        if (!ai.ship || !ai.ship.position) return force;
        
        for (const obstacle of obstacles) {
            if (!obstacle.position) continue;
            
            const distance = ai.ship.position.distanceTo(obstacle.position);
            if (distance < this.avoidanceRadius) {
                // Calculate avoidance force
                const avoid = this.tempVector2.subVectors(ai.ship.position, obstacle.position);
                avoid.normalize();
                
                // Scale force inversely with distance (closer = stronger)
                const strength = (this.avoidanceRadius - distance) / this.avoidanceRadius;
                avoid.multiplyScalar(strength * this.maxSpeed * 2); // Double weight for obstacles
                
                force.add(avoid);
            }
        }
        
        return force;
    }
    
    /**
     * Set formation target for this AI
     */
    setFormationTarget(position, heading = null) {
        this.formationPosition.copy(position);
        if (heading) {
            this.formationHeading.copy(heading);
        }
        this.hasFormationTarget = true;
    }
    
    /**
     * Clear formation target
     */
    clearFormationTarget() {
        this.hasFormationTarget = false;
    }
    
    /**
     * Update behavior weights dynamically
     */
    updateWeights(weights) {
        this.separationWeight = weights.separation || this.separationWeight;
        this.alignmentWeight = weights.alignment || this.alignmentWeight;
        this.cohesionWeight = weights.cohesion || this.cohesionWeight;
        this.formationWeight = weights.formation || this.formationWeight;
        this.avoidanceWeight = weights.avoidance || this.avoidanceWeight;
    }
    
    /**
     * Get debug information about current flocking state
     */
    getDebugInfo() {
        return {
            weights: {
                separation: this.separationWeight,
                alignment: this.alignmentWeight,
                cohesion: this.cohesionWeight,
                formation: this.formationWeight,
                avoidance: this.avoidanceWeight
            },
            radii: {
                separation: this.separationRadius,
                alignment: this.alignmentRadius,
                cohesion: this.cohesionRadius,
                avoidance: this.avoidanceRadius
            },
            formation: {
                hasTarget: this.hasFormationTarget,
                position: this.formationPosition.clone(),
                heading: this.formationHeading.clone()
            }
        };
    }
}
