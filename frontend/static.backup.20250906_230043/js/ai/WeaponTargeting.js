/**
 * WeaponTargeting.js
 * 
 * Advanced weapon targeting and fire control system for enemy AI.
 * Handles target prediction, ballistics calculation, and firing solutions.
 */

import * as THREE from 'three';

export class WeaponTargeting {
    constructor(ai) {
        this.ai = ai;
        this.ship = ai.ship;
        
        // Targeting parameters
        this.targetingAccuracy = 0.8; // Base accuracy (0-1)
        this.predictionTime = 2.0; // Seconds to predict ahead
        this.trackingSmooth = 0.3; // How smoothly to track targets
        this.maxTrackingRate = Math.PI / 2; // Max radians/second tracking
        
        // Current targeting state
        this.currentTarget = null;
        this.targetLockTime = 0;
        this.targetingSolution = null;
        this.lastFireTime = 0;
        
        // Target prediction and tracking
        this.targetPosition = new THREE.Vector3();
        this.targetVelocity = new THREE.Vector3();
        this.targetAcceleration = new THREE.Vector3();
        this.predictedPosition = new THREE.Vector3();
        this.aimPoint = new THREE.Vector3();
        
        // Tracking history for better prediction
        this.trackingHistory = [];
        this.maxHistoryLength = 10;
        
        // Weapon characteristics
        this.weaponConfig = this.getWeaponConfigForShipType();
        
        // Firing control
        this.fireControlState = 'searching'; // searching, tracking, locked, firing
        this.lockQuality = 0; // 0-1, how good our lock is
        this.fireCommand = false;
        
        // Ballistics calculation
        this.ballisticsCache = new Map(); // Cache ballistics solutions
        this.lastBallisticsUpdate = 0;
        
        console.log(`🎯 WeaponTargeting initialized for ${this.ship.shipType} with ${this.weaponConfig.type} weapons`);
    }
    
    /**
     * Get weapon configuration based on ship type
     */
    getWeaponConfigForShipType() {
        const shipType = this.ship?.shipType || 'unknown';
        
        const configs = {
            scout: {
                type: 'energy_pulse',
                projectileSpeed: 3.0, // km/s
                damage: 15,
                fireRate: 3.0, // shots/second
                energyCost: 8,
                range: 2.0, // km
                tracking: 0.9, // How well it tracks
                burstSize: 1,
                accuracy: 0.7
            },
            light_fighter: {
                type: 'energy_cannon',
                projectileSpeed: 2.5,
                damage: 25,
                fireRate: 2.5,
                energyCost: 12,
                range: 1.8,
                tracking: 0.8,
                burstSize: 2,
                accuracy: 0.8
            },
            heavy_fighter: {
                type: 'plasma_cannon',
                projectileSpeed: 2.0,
                damage: 40,
                fireRate: 1.5,
                energyCost: 20,
                range: 1.5,
                tracking: 0.6,
                burstSize: 3,
                accuracy: 0.9
            },
            carrier: {
                type: 'long_range_beam',
                projectileSpeed: 5.0, // Instant beam
                damage: 35,
                fireRate: 1.0,
                energyCost: 25,
                range: 3.0,
                tracking: 0.7,
                burstSize: 1,
                accuracy: 0.85
            },
            light_freighter: {
                type: 'defensive_turret',
                projectileSpeed: 2.0,
                damage: 12,
                fireRate: 2.0,
                energyCost: 10,
                range: 1.2,
                tracking: 0.9,
                burstSize: 1,
                accuracy: 0.6
            },
            heavy_freighter: {
                type: 'dual_turret',
                projectileSpeed: 2.2,
                damage: 22,
                fireRate: 1.8,
                energyCost: 15,
                range: 1.5,
                tracking: 0.8,
                burstSize: 2,
                accuracy: 0.7
            }
        };
        
        return configs[shipType] || configs.light_fighter;
    }
    
    /**
     * Update weapon targeting system
     * @param {number} deltaTime - Time since last update
     * @param {Object} target - Current target object
     */
    update(deltaTime, target) {
        // Update target if changed
        if (target !== this.currentTarget) {
            this.setTarget(target);
        }
        
        if (!this.currentTarget) {
            this.fireControlState = 'searching';
            this.lockQuality = 0;
            return null;
        }
        
        // Update target tracking
        this.updateTargetTracking(deltaTime);
        
        // Calculate firing solution
        this.calculateFiringSolution();
        
        // Update fire control state
        this.updateFireControlState(deltaTime);
        
        // Return firing solution if ready
        return this.shouldFire() ? this.targetingSolution : null;
    }
    
    /**
     * Set targeting on a new target
     */
    setTarget(target) {
        if (this.currentTarget === target) return;
        
        this.currentTarget = target;
        this.targetLockTime = target ? Date.now() : 0;
        this.fireControlState = target ? 'tracking' : 'searching';
        this.lockQuality = 0;
        this.trackingHistory = [];
        
        if (target) {
            console.log(`🎯 ${this.ship.shipType} targeting ${target.shipType || 'unknown'}`);
        }
    }
    
    /**
     * Update target tracking and prediction
     */
    updateTargetTracking(deltaTime) {
        if (!this.currentTarget || !this.currentTarget.position) return;
        
        const now = Date.now();
        const currentPos = this.currentTarget.position.clone();
        
        // Add to tracking history
        this.trackingHistory.push({
            position: currentPos.clone(),
            timestamp: now,
            deltaTime: deltaTime
        });
        
        // Limit history length
        if (this.trackingHistory.length > this.maxHistoryLength) {
            this.trackingHistory.shift();
        }
        
        // Calculate velocity and acceleration from history
        if (this.trackingHistory.length >= 2) {
            this.calculateTargetMotion();
        }
        
        // Predict target position
        this.predictTargetPosition();
        
        // Calculate aim point with lead
        this.calculateAimPoint();
        
        // Update lock quality based on tracking
        this.updateLockQuality(deltaTime);
    }
    
    /**
     * Calculate target motion from tracking history
     */
    calculateTargetMotion() {
        const history = this.trackingHistory;
        if (history.length < 2) return;
        
        // Calculate velocity from recent positions
        const recent = history.slice(-3); // Last 3 samples
        if (recent.length >= 2) {
            const timeDiff = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 1000;
            if (timeDiff > 0) {
                const displacement = recent[recent.length - 1].position.clone()
                    .sub(recent[0].position);
                const newVelocity = displacement.divideScalar(timeDiff);
                
                // Smooth velocity changes
                this.targetVelocity.lerp(newVelocity, this.trackingSmooth);
            }
        }
        
        // Calculate acceleration from velocity changes
        if (history.length >= 4) {
            const older = history.slice(-6, -3);
            const newer = history.slice(-3);
            
            if (older.length >= 2 && newer.length >= 2) {
                const oldTimeDiff = (older[older.length - 1].timestamp - older[0].timestamp) / 1000;
                const newTimeDiff = (newer[newer.length - 1].timestamp - newer[0].timestamp) / 1000;
                
                if (oldTimeDiff > 0 && newTimeDiff > 0) {
                    const oldVel = older[older.length - 1].position.clone()
                        .sub(older[0].position).divideScalar(oldTimeDiff);
                    const newVel = newer[newer.length - 1].position.clone()
                        .sub(newer[0].position).divideScalar(newTimeDiff);
                    
                    const accel = newVel.sub(oldVel).divideScalar(newTimeDiff);
                    this.targetAcceleration.lerp(accel, this.trackingSmooth * 0.5);
                }
            }
        }
    }
    
    /**
     * Predict where target will be
     */
    predictTargetPosition() {
        if (!this.currentTarget) return;
        
        this.predictedPosition.copy(this.currentTarget.position);
        
        // Add velocity component
        const velocityOffset = this.targetVelocity.clone()
            .multiplyScalar(this.predictionTime);
        this.predictedPosition.add(velocityOffset);
        
        // Add acceleration component (1/2 * a * t^2)
        const accelOffset = this.targetAcceleration.clone()
            .multiplyScalar(0.5 * this.predictionTime * this.predictionTime);
        this.predictedPosition.add(accelOffset);
    }
    
    /**
     * Calculate aim point with ballistics lead
     */
    calculateAimPoint() {
        if (!this.currentTarget || !this.ship.position) return;
        
        // Get distance to predicted position
        const distanceToTarget = this.ship.position.distanceTo(this.predictedPosition);
        
        // Calculate time for projectile to reach target
        const projectileTime = distanceToTarget / this.weaponConfig.projectileSpeed;
        
        // Calculate where target will be when projectile arrives
        this.aimPoint.copy(this.currentTarget.position);
        
        // Add velocity lead
        const velocityLead = this.targetVelocity.clone()
            .multiplyScalar(projectileTime);
        this.aimPoint.add(velocityLead);
        
        // Add acceleration lead
        const accelLead = this.targetAcceleration.clone()
            .multiplyScalar(0.5 * projectileTime * projectileTime);
        this.aimPoint.add(accelLead);
        
        // Add random dispersion based on accuracy
        const dispersion = (1 - this.targetingAccuracy) * 0.3; // Max 0.3km dispersion
        const randomOffset = new THREE.Vector3(
            (Math.random() - 0.5) * dispersion,
            (Math.random() - 0.5) * dispersion * 0.5,
            (Math.random() - 0.5) * dispersion
        );
        this.aimPoint.add(randomOffset);
    }
    
    /**
     * Update lock quality based on various factors
     */
    updateLockQuality(deltaTime) {
        if (!this.currentTarget) {
            this.lockQuality = 0;
            return;
        }
        
        const distance = this.ship.position.distanceTo(this.currentTarget.position);
        const lockTime = (Date.now() - this.targetLockTime) / 1000; // seconds
        
        // Base lock quality factors
        let quality = 0;
        
        // Distance factor (closer = better lock)
        const distanceFactor = Math.max(0, 1 - (distance / this.weaponConfig.range));
        quality += distanceFactor * 0.4;
        
        // Time on target factor (longer lock = better)
        const timeFactor = Math.min(1, lockTime / 2.0); // 2 seconds for full time bonus
        quality += timeFactor * 0.3;
        
        // Velocity stability factor (slower targets = easier to track)
        const targetSpeed = this.targetVelocity.length();
        const velocityFactor = Math.max(0, 1 - (targetSpeed / 10)); // 10 km/s max trackable
        quality += velocityFactor * 0.2;
        
        // Tracking capability factor
        quality += this.weaponConfig.tracking * 0.1;
        
        // Smooth lock quality changes
        const targetQuality = Math.min(1, quality);
        const changeRate = deltaTime * 2; // 2 second lock time
        
        if (targetQuality > this.lockQuality) {
            this.lockQuality = Math.min(targetQuality, this.lockQuality + changeRate);
        } else {
            this.lockQuality = Math.max(targetQuality, this.lockQuality - changeRate * 2);
        }
    }
    
    /**
     * Calculate complete firing solution
     */
    calculateFiringSolution() {
        if (!this.currentTarget || !this.ship.position) {
            this.targetingSolution = null;
            return;
        }
        
        const distance = this.ship.position.distanceTo(this.currentTarget.position);
        const aimDistance = this.ship.position.distanceTo(this.aimPoint);
        
        // Check if target is in range
        if (distance > this.weaponConfig.range) {
            this.targetingSolution = null;
            return;
        }
        
        // Calculate firing vector
        const firingVector = this.aimPoint.clone().sub(this.ship.position).normalize();
        
        // Calculate time to target
        const timeToTarget = aimDistance / this.weaponConfig.projectileSpeed;
        
        // Calculate hit probability
        const hitProbability = this.calculateHitProbability(distance);
        
        this.targetingSolution = {
            target: this.currentTarget,
            aimPoint: this.aimPoint.clone(),
            firingVector: firingVector,
            distance: distance,
            timeToTarget: timeToTarget,
            hitProbability: hitProbability,
            lockQuality: this.lockQuality,
            weapon: this.weaponConfig,
            timestamp: Date.now()
        };
    }
    
    /**
     * Calculate hit probability based on various factors
     */
    calculateHitProbability(distance) {
        let probability = this.weaponConfig.accuracy * this.lockQuality;
        
        // Distance factor
        const optimalRange = this.weaponConfig.range * 0.6;
        if (distance > optimalRange) {
            const rangeFactor = 1 - ((distance - optimalRange) / (this.weaponConfig.range - optimalRange));
            probability *= rangeFactor;
        }
        
        // Target velocity factor
        const targetSpeed = this.targetVelocity.length();
        const speedFactor = Math.max(0.2, 1 - (targetSpeed / 15)); // Harder to hit fast targets
        probability *= speedFactor;
        
        // Target size factor (larger ships easier to hit)
        const targetSize = this.estimateTargetSize();
        const sizeFactor = Math.min(2.0, targetSize / 50); // Normalize to 50m baseline
        probability *= sizeFactor;
        
        // Evasion factor
        if (this.currentTarget.combatState === 'evading') {
            probability *= 0.6;
        }
        
        return Math.max(0.05, Math.min(0.95, probability));
    }
    
    /**
     * Estimate target size for hit probability
     */
    estimateTargetSize() {
        const shipType = this.currentTarget.shipType || 'unknown';
        const sizeMap = {
            scout: 25,
            light_fighter: 35,
            heavy_fighter: 50,
            carrier: 150,
            light_freighter: 60,
            heavy_freighter: 100,
            unknown: 40
        };
        return sizeMap[shipType] || 40;
    }
    
    /**
     * Update fire control state
     */
    updateFireControlState(deltaTime) {
        if (!this.currentTarget) {
            this.fireControlState = 'searching';
            return;
        }
        
        const lockTime = (Date.now() - this.targetLockTime) / 1000;
        
        switch (this.fireControlState) {
            case 'searching':
                if (this.currentTarget) {
                    this.fireControlState = 'tracking';
                }
                break;
                
            case 'tracking':
                if (this.lockQuality > 0.5 && lockTime > 0.5) {
                    this.fireControlState = 'locked';
                }
                break;
                
            case 'locked':
                if (this.lockQuality < 0.3) {
                    this.fireControlState = 'tracking';
                } else if (this.shouldFire()) {
                    this.fireControlState = 'firing';
                }
                break;
                
            case 'firing':
                // Return to locked after firing
                this.fireControlState = 'locked';
                break;
        }
    }
    
    /**
     * Determine if we should fire
     */
    shouldFire() {
        if (!this.targetingSolution || this.fireControlState !== 'locked') {
            return false;
        }
        
        // Check minimum lock quality
        if (this.lockQuality < 0.6) {
            return false;
        }
        
        // Check minimum hit probability
        if (this.targetingSolution.hitProbability < 0.3) {
            return false;
        }
        
        // Check fire rate limiting
        const now = Date.now();
        const timeSinceLastFire = now - this.lastFireTime;
        const fireInterval = 1000 / this.weaponConfig.fireRate;
        
        if (timeSinceLastFire < fireInterval) {
            return false;
        }
        
        // Check energy requirements
        if (this.ship.currentEnergy < this.weaponConfig.energyCost) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Execute firing command
     */
    executeFireCommand() {
        if (!this.shouldFire()) return false;
        
        this.lastFireTime = Date.now();
        
        // Consume energy
        this.ship.currentEnergy -= this.weaponConfig.energyCost;
        
        // Record firing
        console.log(`💥 ${this.ship.shipType} firing at ${this.currentTarget.shipType || 'target'} (${(this.targetingSolution.hitProbability * 100).toFixed(1)}% hit chance)`);
        
        // Return firing solution for weapon effects
        return this.targetingSolution;
    }
    
    /**
     * Get current target
     */
    getCurrentTarget() {
        return this.currentTarget;
    }
    
    /**
     * Get current aim point
     */
    getAimPoint() {
        return this.aimPoint.clone();
    }
    
    /**
     * Get lock quality
     */
    getLockQuality() {
        return this.lockQuality;
    }
    
    /**
     * Get fire control state
     */
    getFireControlState() {
        return this.fireControlState;
    }
    
    /**
     * Get targeting solution
     */
    getTargetingSolution() {
        return this.targetingSolution;
    }
    
    /**
     * Check if target is in weapon range
     */
    isTargetInRange(target = null) {
        const checkTarget = target || this.currentTarget;
        if (!checkTarget || !this.ship.position) return false;
        
        const distance = this.ship.position.distanceTo(checkTarget.position);
        return distance <= this.weaponConfig.range;
    }
    
    /**
     * Get weapon configuration
     */
    getWeaponConfig() {
        return { ...this.weaponConfig };
    }
    
    /**
     * Get debug information
     */
    getDebugInfo() {
        return {
            fireControlState: this.fireControlState,
            lockQuality: this.lockQuality.toFixed(3),
            currentTarget: this.currentTarget?.shipType || 'none',
            targetVelocity: this.targetVelocity.length().toFixed(2),
            hitProbability: this.targetingSolution?.hitProbability.toFixed(3) || 0,
            weaponType: this.weaponConfig.type,
            inRange: this.isTargetInRange(),
            canFire: this.shouldFire()
        };
    }
    
    /**
     * Cleanup when destroyed
     */
    destroy() {
        this.currentTarget = null;
        this.targetingSolution = null;
        this.trackingHistory = [];
        this.ballisticsCache.clear();
        this.ai = null;
        this.ship = null;
    }
}
