/**
 * WeaponBase - Base class for all weapon cards
 * Extracted from WeaponCard.js for better code organization.
 *
 * Based on docs/weapons_system_spec.md and docs/system_architecture.md
 * Implements common weapon functionality shared by all weapon types.
 */

import { debug } from '../../../debug.js';
import { PhysicsProjectile } from './PhysicsProjectile.js';
import { Projectile } from './Projectile.js';

export class WeaponCard {
    constructor(weaponData) {
        // Basic weapon properties
        this.weaponId = weaponData.weaponId || `weapon_${Date.now()}`;
        this.name = weaponData.name || 'Unknown Weapon';
        this.weaponType = weaponData.weaponType || 'scan-hit'; // 'scan-hit' or 'splash-damage'
        this.damage = weaponData.damage || 50;
        this.cooldownTime = weaponData.cooldownTime || 0.5; // seconds
        this.range = weaponData.range || 1000; // meters
        this.autofireEnabled = weaponData.autofireEnabled || false;
        this.accuracy = weaponData.accuracy || 0.95; // 0-1 scale
        this.energyCost = weaponData.energyCost || 10;
        this.targetLockRequired = weaponData.targetLockRequired || false;

        // Special properties (varies by weapon type)
        this.specialProperties = weaponData.specialProperties || {};

        // Blast radius for splash-damage weapons
        this.blastRadius = weaponData.blastRadius || 0;

        // Homing capability for missiles
        this.homingCapability = weaponData.homingCapability || false;

        debug('COMBAT', `WeaponCard created: ${this.name} (${this.weaponType})`);
    }

    /**
     * Fire the weapon (base implementation)
     * @param {Object} origin Origin position
     * @param {Object} target Target object (may be null)
     * @returns {Object} Fire result
     */
    fire(origin, target = null) {
        // Check cooldown
        const currentTime = Date.now();
        if (currentTime < this.nextFireTime) {
            debug('COMBAT', `${this.name} on cooldown for ${((this.nextFireTime - currentTime) / 1000).toFixed(1)}s`);
        }

        // Base implementation - should be overridden by specific weapon types
        debug('COMBAT', `Base WeaponCard.fire() called for ${this.name} - should be overridden`);

        return {
            success: false,
            reason: 'Base weapon class cannot fire',
            damage: 0
        };
    }

    /**
     * Calculate damage based on distance
     * @param {number} distance Distance to target
     * @returns {number} Calculated damage
     */
    calculateDamage(distance) {
        if (distance > this.range) {
            return 0; // Out of range
        }

        // Base damage calculation - can be overridden
        return this.damage;
    }

    /**
     * Check if target is valid for this weapon
     * @param {Object} target Target object
     * @param {number} distance Distance to target
     * @returns {boolean} True if target is valid
     */
    isValidTarget(target, distance) {
        if (!target) {
            return !this.targetLockRequired; // Weapons that don't require lock can fire without target
        }

        return distance <= this.range;
    }

    /**
     * Create projectile for splash-damage weapons
     * @param {Object} origin Origin position
     * @param {Object} target Target object
     * @returns {Object} Projectile instance
     */
    createProjectile(origin, target) {
        const projectileType = this.blastRadius > 0 ? 'splash-damage' : 'direct-hit';
        debug('UTILITY', `PROJECTILE: Creating ${projectileType} projectile for ${this.name} - TIMESTAMP: ${Date.now()}`);

        // Calculate direction based on camera or target
        let direction = { x: 0, y: 0, z: 1 }; // Default forward

        if (window.starfieldManager && window.starfieldManager.camera) {
            const camera = window.starfieldManager.camera;
            const cameraDirection = new window.THREE.Vector3(0, 0, -1);
            cameraDirection.applyQuaternion(camera.quaternion);

            // Velocity compensation
            let shipVelocity = { x: 0, y: 0, z: 0 };
            if (window.starfieldManager) {
                const currentSpeed = window.starfieldManager.currentSpeed || 0;
                const targetSpeed = window.starfieldManager.targetSpeed || 0;
                const effectiveSpeed = Math.max(currentSpeed, targetSpeed);

                if (effectiveSpeed > 0) {
                    let speedMultiplier = effectiveSpeed * 0.3;
                    if (effectiveSpeed <= 3) {
                        const reductionFactor = Math.pow(0.15, 4 - effectiveSpeed);
                        speedMultiplier *= reductionFactor;
                    }
                    const moveDirection = window.starfieldManager.view === 'AFT' ? -1 : 1;
                    const forwardVector = new window.THREE.Vector3(0, 0, -speedMultiplier * moveDirection);
                    forwardVector.applyQuaternion(camera.quaternion);
                    shipVelocity = { x: forwardVector.x, y: forwardVector.y, z: forwardVector.z };
                }
            }

            const velocityScale = 0.1;
            direction = {
                x: cameraDirection.x - (shipVelocity.x * velocityScale),
                y: cameraDirection.y - (shipVelocity.y * velocityScale),
                z: cameraDirection.z - (shipVelocity.z * velocityScale)
            };

            // Normalize direction
            const dirLength = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
            if (dirLength > 0) {
                direction.x /= dirLength;
                direction.y /= dirLength;
                direction.z /= dirLength;
            }
        }

        // Try SimpleProjectile first
        if (window.simpleProjectileManager && window.SimpleProjectile) {
            try {
                const simpleProjectile = new window.SimpleProjectile({
                    origin: origin,
                    direction: direction,
                    target: target,
                    damage: this.damage,
                    blastRadius: this.blastRadius,
                    flightRange: this.flightRange,
                    isHoming: this.homingCapability,
                    weaponName: this.name,
                    maxRange: this.range,
                    scene: window.starfieldManager?.scene
                });
                return simpleProjectile;
            } catch (error) {
                debug('P1', 'Failed to create simple projectile, falling back:', error);
            }
        }

        // Try physics-based projectile
        if (window.physicsManager && window.physicsManager.isReady()) {
            try {
                const physicsProjectile = new PhysicsProjectile({
                    origin: origin,
                    direction: direction,
                    target: target,
                    damage: this.damage,
                    blastRadius: this.blastRadius,
                    flightRange: this.flightRange,
                    isHoming: this.homingCapability,
                    turnRate: this.turnRate,
                    weaponName: this.name,
                    weaponData: this,
                    physicsManager: window.physicsManager,
                    scene: window.starfieldManager?.scene || window.scene
                });
                return physicsProjectile;
            } catch (error) {
                debug('P1', 'Failed to create physics projectile:', error);
            }
        }

        // Fallback to simple projectile
        debug('UTILITY', `Using fallback projectile for ${this.name}`);
        return new Projectile({
            origin: origin,
            target: target,
            damage: this.damage,
            blastRadius: this.blastRadius,
            flightRange: this.flightRange,
            isHoming: this.homingCapability,
            turnRate: this.turnRate,
            weaponName: this.name
        });
    }

    /**
     * Get weapon card data for UI display
     * @returns {Object} Card display data
     */
    getCardData() {
        return {
            weaponId: this.weaponId,
            name: this.name,
            weaponType: this.weaponType,
            damage: this.damage,
            cooldownTime: this.cooldownTime,
            range: this.range,
            autofireEnabled: this.autofireEnabled,
            accuracy: this.accuracy,
            energyCost: this.energyCost,
            blastRadius: this.blastRadius,
            homingCapability: this.homingCapability,
            targetLockRequired: this.targetLockRequired,
            specialProperties: this.specialProperties
        };
    }
}
