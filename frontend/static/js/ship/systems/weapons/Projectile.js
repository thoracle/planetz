/**
 * Projectile - Simple physics-based projectile for splash-damage weapons
 * Extracted from WeaponCard.js for better code organization.
 *
 * This is the fallback projectile class used when physics engine is not available.
 */

import { debug } from '../../../debug.js';

export class Projectile {
    constructor(config) {
        this.position = { ...config.origin };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.target = config.target;
        this.damage = config.damage || 100;
        this.blastRadius = config.blastRadius !== undefined ? config.blastRadius : 50;
        this.flightRange = config.flightRange || 3000;
        this.isHoming = config.isHoming || false;
        this.turnRate = config.turnRate || 90; // degrees per second
        this.weaponName = config.weaponName || 'Projectile';

        this.hasDetonated = false;
        this.distanceTraveled = 0;
        this.launchTime = Date.now();

        // Calculate initial velocity toward target
        this.calculateInitialVelocity();
    }

    /**
     * Update projectile physics
     * @param {number} deltaTime Time elapsed in milliseconds
     */
    update(deltaTime) {
        if (this.hasDetonated) return;

        const deltaSeconds = deltaTime / 1000;

        // Update homing if enabled
        if (this.isHoming && this.target) {
            this.updateHoming(this.target, deltaSeconds);
        }

        // Update position
        this.position.x += this.velocity.x * deltaSeconds;
        this.position.y += this.velocity.y * deltaSeconds;
        this.position.z += this.velocity.z * deltaSeconds;

        // Update distance traveled
        const speed = Math.sqrt(
            this.velocity.x * this.velocity.x +
            this.velocity.y * this.velocity.y +
            this.velocity.z * this.velocity.z
        );
        this.distanceTraveled += speed * deltaSeconds;

        // Check for collision or range limit
        const flightRangeMeters = this.flightRange * 1000; // Convert km to meters
        if (this.checkCollision() || this.distanceTraveled >= flightRangeMeters) {
            this.detonate();
        }
    }

    /**
     * Update homing guidance
     * @param {Object} target Target object
     * @param {number} deltaTime Time in seconds
     */
    updateHoming(target, deltaTime) {
        if (!target.position) return;

        // Calculate direction to target
        const toTarget = {
            x: target.position.x - this.position.x,
            y: target.position.y - this.position.y,
            z: target.position.z - this.position.z
        };

        // Normalize target direction
        const targetDistance = Math.sqrt(toTarget.x * toTarget.x + toTarget.y * toTarget.y + toTarget.z * toTarget.z);
        if (targetDistance > 0) {
            toTarget.x /= targetDistance;
            toTarget.y /= targetDistance;
            toTarget.z /= targetDistance;
        }

        // Apply turn rate limitation
        const maxTurnRadians = (this.turnRate * Math.PI / 180) * deltaTime;

        // Simple proportional navigation
        this.velocity.x += toTarget.x * maxTurnRadians * 100;
        this.velocity.y += toTarget.y * maxTurnRadians * 100;
        this.velocity.z += toTarget.z * maxTurnRadians * 100;

        // Maintain constant speed
        const currentSpeed = Math.sqrt(
            this.velocity.x * this.velocity.x +
            this.velocity.y * this.velocity.y +
            this.velocity.z * this.velocity.z
        );

        if (currentSpeed > 0) {
            const normalizedSpeed = 1000; // m/s
            this.velocity.x = (this.velocity.x / currentSpeed) * normalizedSpeed;
            this.velocity.y = (this.velocity.y / currentSpeed) * normalizedSpeed;
            this.velocity.z = (this.velocity.z / currentSpeed) * normalizedSpeed;
        }
    }

    /**
     * Check for collision with targets or environment
     * @returns {boolean} True if collision detected
     */
    checkCollision() {
        if (this.target && this.target.position) {
            const distance = Math.sqrt(
                Math.pow(this.position.x - this.target.position.x, 2) +
                Math.pow(this.position.y - this.target.position.y, 2) +
                Math.pow(this.position.z - this.target.position.z, 2)
            );

            return distance < 10; // 10 meter proximity detonation
        }

        return false;
    }

    /**
     * Detonate projectile and apply splash damage
     */
    detonate() {
        if (this.hasDetonated) return;

        this.hasDetonated = true;

        // Apply splash damage to all targets within blast radius
        this.applySplashDamage();

        // Create visual explosion effect
        this.createExplosionEffect();
    }

    /**
     * Apply splash damage to targets within blast radius
     */
    applySplashDamage() {
        if (this.target && this.target.position) {
            const distance = this.calculateDamageAtDistance(
                Math.sqrt(
                    Math.pow(this.position.x - this.target.position.x, 2) +
                    Math.pow(this.position.y - this.target.position.y, 2) +
                    Math.pow(this.position.z - this.target.position.z, 2)
                )
            );

            if (distance > 0 && this.target.takeDamage) {
                this.target.takeDamage(distance);
                this.showDamageFeedback(this.target, distance);
            }
        }
    }

    /**
     * Calculate damage at specific distance from blast center
     * @param {number} distance Distance from blast center
     * @returns {number} Damage amount
     */
    calculateDamageAtDistance(distance) {
        if (distance > this.blastRadius) {
            return 0;
        }

        // Linear falloff
        const falloffFactor = 1 - (distance / this.blastRadius);
        return Math.round(this.damage * falloffFactor);
    }

    /**
     * Create explosion visual effect
     */
    createExplosionEffect() {
        debug('UTILITY', `Creating explosion effect at`, this.position);
    }

    /**
     * Show damage feedback on HUD
     * @param {Object} target Target that took damage
     * @param {number} damage Damage amount
     */
    showDamageFeedback(target, damage) {
        try {
            let weaponHUD = null;

            if (window.starfieldManager?.viewManager?.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.starfieldManager.viewManager.ship.weaponSystem.weaponHUD;
            } else if (window.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.ship.weaponSystem.weaponHUD;
            }

            if (weaponHUD) {
                const targetName = target.shipName || target.name || 'Target';
                weaponHUD.showDamageFeedback(this.weaponName, damage, targetName);
            }
        } catch (error) {
            debug('P1', 'Failed to show damage feedback:', error.message);
        }
    }

    /**
     * Calculate initial velocity toward target
     */
    calculateInitialVelocity() {
        if (!this.target || !this.target.position) {
            // Default forward velocity if no target
            this.velocity = { x: 0, y: 0, z: 1000 }; // 1000 m/s forward
            return;
        }

        // Calculate direction to target
        const direction = {
            x: this.target.position.x - this.position.x,
            y: this.target.position.y - this.position.y,
            z: this.target.position.z - this.position.z
        };

        // Normalize and apply speed
        const distance = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
        if (distance > 0) {
            const speed = 1000; // 1000 m/s
            this.velocity.x = (direction.x / distance) * speed;
            this.velocity.y = (direction.y / distance) * speed;
            this.velocity.z = (direction.z / distance) * speed;
        }
    }
}
