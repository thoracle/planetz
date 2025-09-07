/**
 * CombatBehavior.js
 * 
 * Advanced combat AI behaviors for enemy ships including weapon targeting,
 * combat maneuvers, and tactical decision making.
 * 
 * Based on docs/enemy_ai_spec.md combat behavior specifications
 */

import * as THREE from 'three';

export class CombatBehavior {
    constructor(ai) {
        this.ai = ai;
        this.ship = ai.ship;
        
        // Combat state
        this.combatState = 'idle'; // idle, engaging, evading, pursuing, withdrawing
        this.lastCombatStateChange = Date.now();
        this.combatStartTime = null;
        this.lastShotTime = 0;
        
        // Targeting system
        this.currentTarget = null;
        this.targetLockTime = 0;
        this.targetPrediction = new THREE.Vector3();
        this.aimOffset = new THREE.Vector3();
        this.lastTargetPosition = new THREE.Vector3();
        this.targetVelocity = new THREE.Vector3();
        
        // Combat parameters from ship config
        this.weaponRange = ai.engageRange || 1.5; // km
        this.optimalRange = this.weaponRange * 0.7; // Preferred fighting distance
        this.safeDistance = this.weaponRange * 1.2; // Distance to maintain when withdrawing
        this.firingAccuracy = 0.8; // Base firing accuracy (0-1)
        this.reactionTime = 0.2; // Seconds to react to threats
        
        // Combat maneuver parameters
        this.maneuverState = 'none'; // none, circle_strafe, spiral_in, spiral_out, evasive_jink
        this.maneuverStartTime = 0;
        this.maneuverDuration = 0;
        this.maneuverDirection = 1; // 1 or -1 for left/right
        
        // Ship-specific combat behavior
        this.combatProfile = this.getCombatProfileForShipType();
        
        // Weapon systems simulation
        this.weaponSystems = {
            primaryWeapon: {
                type: 'energy',
                damage: this.estimateWeaponDamage(),
                fireRate: 2.0, // Shots per second
                energyCost: 10,
                range: this.weaponRange,
                accuracy: this.firingAccuracy,
                lastFired: 0,
                ammo: Infinity // Energy weapons
            }
        };
        
        // Combat statistics
        this.combatStats = {
            shotsFirered: 0,
            shotsHit: 0,
            damageDealt: 0,
            damageTaken: 0,
            engagementsWon: 0,
            engagementsLost: 0,
            averageEngagementTime: 0
        };
        
        console.log(`⚔️ CombatBehavior initialized for ${this.ship.shipType} with profile: ${this.combatProfile.name}`);
    }
    
    /**
     * Get combat profile based on ship type
     */
    getCombatProfileForShipType() {
        const shipType = this.ship?.shipType || 'unknown';
        
        const profiles = {
            scout: {
                name: 'Hit and Run',
                preferredRange: this.weaponRange * 1.1, // Stay at long range
                aggressiveness: 0.3,
                evasiveness: 0.9,
                persistence: 0.4,
                firingDiscipline: 0.7, // How long to hold fire for accuracy
                preferredManeuvers: ['circle_strafe', 'evasive_jink'],
                engageThreshold: 0.6, // Threat level needed to engage
                withdrawThreshold: 0.4 // Own health threshold to withdraw
            },
            light_fighter: {
                name: 'Aggressive Dogfighter',
                preferredRange: this.weaponRange * 0.8, // Close range
                aggressiveness: 0.8,
                evasiveness: 0.6,
                persistence: 0.7,
                firingDiscipline: 0.5,
                preferredManeuvers: ['circle_strafe', 'spiral_in'],
                engageThreshold: 0.4,
                withdrawThreshold: 0.25
            },
            heavy_fighter: {
                name: 'Tank Brawler',
                preferredRange: this.weaponRange * 0.6, // Very close range
                aggressiveness: 0.9,
                evasiveness: 0.3,
                persistence: 0.9,
                firingDiscipline: 0.3,
                preferredManeuvers: ['spiral_in', 'head_on'],
                engageThreshold: 0.3,
                withdrawThreshold: 0.15
            },
            carrier: {
                name: 'Defensive Coordinator',
                preferredRange: this.weaponRange * 1.5, // Long range
                aggressiveness: 0.2,
                evasiveness: 0.7,
                persistence: 0.3,
                firingDiscipline: 0.9,
                preferredManeuvers: ['withdraw', 'evasive_jink'],
                engageThreshold: 0.8,
                withdrawThreshold: 0.6
            },
            light_freighter: {
                name: 'Evasive Runner',
                preferredRange: this.weaponRange * 2.0, // Very long range
                aggressiveness: 0.1,
                evasiveness: 1.0,
                persistence: 0.1,
                firingDiscipline: 0.9,
                preferredManeuvers: ['evasive_jink', 'withdraw'],
                engageThreshold: 0.9,
                withdrawThreshold: 0.8
            },
            heavy_freighter: {
                name: 'Defensive Turret',
                preferredRange: this.weaponRange * 1.2, // Medium range
                aggressiveness: 0.3,
                evasiveness: 0.4,
                persistence: 0.6,
                firingDiscipline: 0.8,
                preferredManeuvers: ['defensive_circle', 'withdraw'],
                engageThreshold: 0.7,
                withdrawThreshold: 0.5
            }
        };
        
        return profiles[shipType] || profiles.light_fighter;
    }
    
    /**
     * Estimate weapon damage based on ship type
     */
    estimateWeaponDamage() {
        const shipType = this.ship?.shipType || 'unknown';
        const damageMap = {
            scout: 15,
            light_fighter: 25,
            heavy_fighter: 40,
            carrier: 30,
            light_freighter: 10,
            heavy_freighter: 20,
            unknown: 25
        };
        return damageMap[shipType] || 25;
    }
    
    /**
     * Update combat behavior
     * @param {number} deltaTime - Time since last update
     * @param {Object} threatAssessment - Current threat assessment
     */
    update(deltaTime, threatAssessment) {
        // Update target tracking
        this.updateTargetTracking(deltaTime);
        
        // Update combat state based on threats
        this.updateCombatState(threatAssessment);
        
        // Execute combat behavior based on current state
        this.executeCombatBehavior(deltaTime);
        
        // Update weapon systems
        this.updateWeaponSystems(deltaTime);
        
        // Update combat maneuvers
        this.updateCombatManeuvers(deltaTime);
    }
    
    /**
     * Update target tracking and prediction
     */
    updateTargetTracking(deltaTime) {
        if (!this.currentTarget || !this.currentTarget.position || !this.ship.position) {
            return;
        }
        
        // Update target velocity estimation
        const currentTargetPos = this.currentTarget.position.clone();
        const timeSinceLastUpdate = deltaTime;
        
        if (this.lastTargetPosition.length() > 0 && timeSinceLastUpdate > 0) {
            const displacement = currentTargetPos.clone().sub(this.lastTargetPosition);
            const estimatedVelocity = displacement.divideScalar(timeSinceLastUpdate);
            
            // Smooth velocity estimation
            this.targetVelocity.lerp(estimatedVelocity, 0.3);
        }
        
        this.lastTargetPosition.copy(currentTargetPos);
        
        // Predict target position based on velocity and weapon travel time
        const distanceToTarget = this.ship.position.distanceTo(currentTargetPos);
        const weaponSpeed = 2.0; // km/s (assumption for energy weapons)
        const timeToTarget = distanceToTarget / weaponSpeed;
        
        this.targetPrediction.copy(currentTargetPos);
        this.targetPrediction.add(this.targetVelocity.clone().multiplyScalar(timeToTarget));
        
        // Add random aim offset based on accuracy
        const inaccuracy = (1 - this.firingAccuracy) * 0.5; // 0.5km max offset at lowest accuracy
        this.aimOffset.set(
            (Math.random() - 0.5) * inaccuracy,
            (Math.random() - 0.5) * inaccuracy * 0.5, // Less vertical spread
            (Math.random() - 0.5) * inaccuracy
        );
        
        this.targetPrediction.add(this.aimOffset);
    }
    
    /**
     * Update combat state based on threat assessment
     */
    updateCombatState(threatAssessment) {
        const previousState = this.combatState;
        const primaryThreat = threatAssessment.getPrimaryThreat();
        const threatLevel = threatAssessment.getCurrentThreatLevel();
        
        // Determine new combat state
        if (!primaryThreat || threatLevel < 0.1) {
            this.combatState = 'idle';
        } else if (this.shouldWithdraw(threatLevel)) {
            this.combatState = 'withdrawing';
        } else if (this.shouldEvade(threatLevel)) {
            this.combatState = 'evading';
        } else if (this.shouldPursue(primaryThreat)) {
            this.combatState = 'pursuing';
        } else if (this.shouldEngage(primaryThreat)) {
            this.combatState = 'engaging';
        }
        
        // Handle state changes
        if (this.combatState !== previousState) {
            this.onCombatStateChange(previousState, this.combatState);
        }
        
        // Update current target
        if (primaryThreat && this.combatState !== 'idle') {
            this.setTarget(primaryThreat.ship);
        } else if (this.combatState === 'idle') {
            this.clearTarget();
        }
    }
    
    /**
     * Handle combat state changes
     */
    onCombatStateChange(oldState, newState) {
        this.lastCombatStateChange = Date.now();
        
        if (newState === 'engaging' && oldState !== 'engaging') {
            this.combatStartTime = Date.now();
        } else if (oldState === 'engaging' && newState !== 'engaging') {
            this.recordEngagementEnd();
        }
        
        // Reset maneuvers on state change
        this.maneuverState = 'none';
        
        console.log(`⚔️ ${this.ship.shipType} combat state: ${oldState} → ${newState}`);
    }
    
    /**
     * Determine if ship should withdraw
     */
    shouldWithdraw(threatLevel) {
        const healthPercent = this.ship.currentHull / this.ship.maxHull;
        return healthPercent < this.combatProfile.withdrawThreshold || 
               threatLevel > 0.9;
    }
    
    /**
     * Determine if ship should evade
     */
    shouldEvade(threatLevel) {
        const healthPercent = this.ship.currentHull / this.ship.maxHull;
        return (threatLevel > 0.6 && healthPercent < 0.5) ||
               (this.isBeingTargeted() && this.combatProfile.evasiveness > 0.7);
    }
    
    /**
     * Determine if ship should pursue target
     */
    shouldPursue(primaryThreat) {
        if (!primaryThreat) return false;
        
        const distance = primaryThreat.distance;
        return distance > this.combatProfile.preferredRange * 1.5 &&
               this.combatProfile.aggressiveness > 0.5;
    }
    
    /**
     * Determine if ship should engage target
     */
    shouldEngage(primaryThreat) {
        if (!primaryThreat) return false;
        
        return primaryThreat.threatLevel > this.combatProfile.engageThreshold;
    }
    
    /**
     * Check if ship is being actively targeted
     */
    isBeingTargeted() {
        // This would check if enemy weapons are aimed at us
        // Simplified implementation
        return this.currentTarget && this.currentTarget.currentTarget === this.ship;
    }
    
    /**
     * Execute combat behavior based on current state
     */
    executeCombatBehavior(deltaTime) {
        switch (this.combatState) {
            case 'idle':
                this.executeIdleBehavior();
                break;
            case 'engaging':
                this.executeEngagementBehavior(deltaTime);
                break;
            case 'evading':
                this.executeEvasiveBehavior(deltaTime);
                break;
            case 'pursuing':
                this.executePursuitBehavior(deltaTime);
                break;
            case 'withdrawing':
                this.executeWithdrawalBehavior(deltaTime);
                break;
        }
    }
    
    /**
     * Execute idle behavior
     */
    executeIdleBehavior() {
        // Clear any combat maneuvers
        this.maneuverState = 'none';
        // Could add patrol behavior here
    }
    
    /**
     * Execute engagement behavior
     */
    executeEngagementBehavior(deltaTime) {
        if (!this.currentTarget) return;
        
        const distance = this.ship.position.distanceTo(this.currentTarget.position);
        
        // Choose appropriate maneuver based on distance and ship profile
        if (distance > this.combatProfile.preferredRange * 1.2) {
            this.initializeManeuver('spiral_in');
        } else if (distance < this.combatProfile.preferredRange * 0.8) {
            this.initializeManeuver('spiral_out');
        } else {
            this.initializeManeuver('circle_strafe');
        }
        
        // Fire weapons if in range and have clear shot
        this.attemptWeaponFire();
    }
    
    /**
     * Execute evasive behavior
     */
    executeEvasiveBehavior(deltaTime) {
        // Use high-evasion maneuvers
        if (this.maneuverState === 'none') {
            this.initializeManeuver('evasive_jink');
        }
        
        // Opportunistic firing while evading
        if (this.combatProfile.firingDiscipline < 0.5) {
            this.attemptWeaponFire();
        }
    }
    
    /**
     * Execute pursuit behavior
     */
    executePursuitBehavior(deltaTime) {
        if (!this.currentTarget) return;
        
        // Move directly toward target
        this.initializeManeuver('direct_pursuit');
        
        // Fire if in range
        const distance = this.ship.position.distanceTo(this.currentTarget.position);
        if (distance <= this.weaponRange) {
            this.attemptWeaponFire();
        }
    }
    
    /**
     * Execute withdrawal behavior
     */
    executeWithdrawalBehavior(deltaTime) {
        // Move away from threats while maintaining some combat capability
        this.initializeManeuver('withdraw');
        
        // Defensive firing
        if (this.currentTarget) {
            const distance = this.ship.position.distanceTo(this.currentTarget.position);
            if (distance <= this.weaponRange * 1.5) {
                this.attemptWeaponFire();
            }
        }
    }
    
    /**
     * Initialize a combat maneuver
     */
    initializeManeuver(maneuverType) {
        if (this.maneuverState === maneuverType) return; // Already doing this maneuver
        
        this.maneuverState = maneuverType;
        this.maneuverStartTime = Date.now();
        this.maneuverDirection = Math.random() < 0.5 ? -1 : 1; // Random direction
        
        // Set maneuver duration based on type
        const durations = {
            'circle_strafe': 3000,    // 3 seconds
            'spiral_in': 2000,       // 2 seconds
            'spiral_out': 2000,      // 2 seconds
            'evasive_jink': 1500,    // 1.5 seconds
            'direct_pursuit': 5000,  // 5 seconds
            'withdraw': 4000         // 4 seconds
        };
        
        this.maneuverDuration = durations[maneuverType] || 3000;
    }
    
    /**
     * Update combat maneuvers
     */
    updateCombatManeuvers(deltaTime) {
        if (this.maneuverState === 'none') return;
        
        const elapsed = Date.now() - this.maneuverStartTime;
        
        // Check if maneuver is complete
        if (elapsed > this.maneuverDuration) {
            this.maneuverState = 'none';
            return;
        }
        
        // Execute maneuver (this would integrate with ship movement system)
        this.executeManeuver(this.maneuverState, elapsed / this.maneuverDuration);
    }
    
    /**
     * Execute specific maneuver
     * @param {string} maneuverType - Type of maneuver
     * @param {number} progress - Progress through maneuver (0-1)
     */
    executeManeuver(maneuverType, progress) {
        // This would integrate with the ship's movement system
        // For now, we'll just calculate desired movement vectors
        
        if (!this.currentTarget || !this.ship.position) return;
        
        const toTarget = this.currentTarget.position.clone().sub(this.ship.position);
        const distance = toTarget.length();
        toTarget.normalize();
        
        let desiredMovement = new THREE.Vector3();
        
        switch (maneuverType) {
            case 'circle_strafe':
                // Circle around target
                const perpendicular = new THREE.Vector3(-toTarget.z, 0, toTarget.x);
                desiredMovement = perpendicular.multiplyScalar(this.maneuverDirection);
                break;
                
            case 'spiral_in':
                // Spiral toward target
                const spiralIn = toTarget.clone().multiplyScalar(0.7);
                const spiralSide = new THREE.Vector3(-toTarget.z, 0, toTarget.x).multiplyScalar(0.3 * this.maneuverDirection);
                desiredMovement = spiralIn.add(spiralSide);
                break;
                
            case 'spiral_out':
                // Spiral away from target
                const spiralOut = toTarget.clone().multiplyScalar(-0.7);
                const spiralOutSide = new THREE.Vector3(-toTarget.z, 0, toTarget.x).multiplyScalar(0.3 * this.maneuverDirection);
                desiredMovement = spiralOut.add(spiralOutSide);
                break;
                
            case 'evasive_jink':
                // Random jinking motion
                const jinkX = Math.sin(progress * Math.PI * 4) * this.maneuverDirection;
                const jinkZ = Math.cos(progress * Math.PI * 3) * this.maneuverDirection;
                desiredMovement = new THREE.Vector3(jinkX, 0, jinkZ);
                break;
                
            case 'direct_pursuit':
                // Direct movement toward target
                desiredMovement = toTarget;
                break;
                
            case 'withdraw':
                // Move away from target
                desiredMovement = toTarget.clone().multiplyScalar(-1);
                break;
        }
        
        // Store desired movement for use by movement system
        this.ai.desiredMovement = desiredMovement.normalize();
    }
    
    /**
     * Attempt to fire weapons
     */
    attemptWeaponFire() {
        if (!this.currentTarget || !this.canFire()) return;
        
        const weapon = this.weaponSystems.primaryWeapon;
        const now = Date.now();
        const timeSinceLastShot = now - weapon.lastFired;
        const fireInterval = 1000 / weapon.fireRate; // ms between shots
        
        if (timeSinceLastShot < fireInterval) return;
        
        // Check if target is in range
        const distance = this.ship.position.distanceTo(this.currentTarget.position);
        if (distance > weapon.range) return;
        
        // Check firing solution
        if (!this.hasValidFiringSolution()) return;
        
        // Fire weapon
        this.fireWeapon(weapon);
        weapon.lastFired = now;
        this.lastShotTime = now;
        
        this.combatStats.shotsFirered++;
        
        // Simulate hit/miss
        const hitChance = this.calculateHitChance(distance);
        if (Math.random() < hitChance) {
            this.recordHit(weapon.damage);
        }
    }
    
    /**
     * Check if ship can fire weapons
     */
    canFire() {
        // Check energy, ammo, weapon status, etc.
        return this.ship.currentEnergy > this.weaponSystems.primaryWeapon.energyCost;
    }
    
    /**
     * Check if we have a valid firing solution
     */
    hasValidFiringSolution() {
        if (!this.currentTarget) return false;
        
        // Basic line of sight check (simplified)
        // In full implementation, would check for obstacles
        
        // Check if target is moving too erratically
        const targetSpeed = this.targetVelocity.length();
        const maxTrackingSpeed = 5.0; // km/s max trackable speed
        
        return targetSpeed < maxTrackingSpeed;
    }
    
    /**
     * Calculate hit chance based on various factors
     */
    calculateHitChance(distance) {
        let hitChance = this.firingAccuracy;
        
        // Distance factor
        const optimalRange = this.weaponRange * 0.5;
        if (distance > optimalRange) {
            const rangeFactor = 1 - ((distance - optimalRange) / (this.weaponRange - optimalRange));
            hitChance *= rangeFactor;
        }
        
        // Target velocity factor
        const targetSpeed = this.targetVelocity.length();
        const speedFactor = Math.max(0.2, 1 - (targetSpeed / 10)); // Harder to hit fast targets
        hitChance *= speedFactor;
        
        // Ship evasion factor (if target is evading)
        if (this.currentTarget.combatState === 'evading') {
            hitChance *= 0.6;
        }
        
        // Firing discipline factor
        const disciplineFactor = this.combatProfile.firingDiscipline;
        hitChance *= (0.5 + disciplineFactor * 0.5);
        
        return Math.max(0.05, Math.min(0.95, hitChance)); // Clamp between 5% and 95%
    }
    
    /**
     * Fire weapon (integrate with weapon effects system)
     */
    fireWeapon(weapon) {
        // This would integrate with the game's weapon effects system
        console.log(`💥 ${this.ship.shipType} firing ${weapon.type} at ${this.currentTarget.shipType || 'target'}`);
        
        // Consume energy
        this.ship.currentEnergy -= weapon.energyCost;
    }
    
    /**
     * Record a successful hit
     */
    recordHit(damage) {
        this.combatStats.shotsHit++;
        this.combatStats.damageDealt += damage;
        
        // Apply damage to target (simplified)
        if (this.currentTarget.currentHull) {
            this.currentTarget.currentHull -= damage;
        }
    }
    
    /**
     * Record end of engagement
     */
    recordEngagementEnd() {
        if (!this.combatStartTime) return;
        
        const engagementTime = Date.now() - this.combatStartTime;
        this.combatStats.averageEngagementTime = 
            (this.combatStats.averageEngagementTime + engagementTime) / 2;
        
        // Determine if engagement was won or lost
        // This is simplified - in reality would depend on multiple factors
        if (this.currentTarget && this.currentTarget.currentHull <= 0) {
            this.combatStats.engagementsWon++;
        } else if (this.ship.currentHull < this.ship.maxHull * 0.5) {
            this.combatStats.engagementsLost++;
        }
        
        this.combatStartTime = null;
    }
    
    /**
     * Update weapon systems
     */
    updateWeaponSystems(deltaTime) {
        // Weapon cooling, energy regeneration, etc.
        for (const weapon of Object.values(this.weaponSystems)) {
            // Update weapon state
            if (weapon.overheated) {
                weapon.heatLevel -= deltaTime * weapon.coolingRate;
                if (weapon.heatLevel <= 0) {
                    weapon.overheated = false;
                    weapon.heatLevel = 0;
                }
            }
        }
    }
    
    /**
     * Set combat target
     */
    setTarget(target) {
        if (this.currentTarget !== target) {
            this.currentTarget = target;
            this.targetLockTime = Date.now();
            this.lastTargetPosition.set(0, 0, 0);
            this.targetVelocity.set(0, 0, 0);
        }
    }
    
    /**
     * Clear combat target
     */
    clearTarget() {
        this.currentTarget = null;
        this.targetLockTime = 0;
    }
    
    /**
     * Get current combat state
     */
    getCombatState() {
        return this.combatState;
    }
    
    /**
     * Get current target
     */
    getCurrentTarget() {
        return this.currentTarget;
    }
    
    /**
     * Get combat statistics
     */
    getCombatStats() {
        const accuracy = this.combatStats.shotsFirered > 0 ? 
            this.combatStats.shotsHit / this.combatStats.shotsFirered : 0;
            
        return {
            ...this.combatStats,
            accuracy: accuracy,
            combatEfficiency: this.combatStats.damageDealt / Math.max(1, this.combatStats.damageTaken)
        };
    }
    
    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            combatState: this.combatState,
            maneuverState: this.maneuverState,
            currentTarget: this.currentTarget?.shipType || 'none',
            weaponRange: this.weaponRange,
            combatProfile: this.combatProfile.name,
            stats: this.getCombatStats()
        };
    }
    
    /**
     * Cleanup when destroyed
     */
    destroy() {
        this.currentTarget = null;
        this.ai = null;
        this.ship = null;
    }
}
