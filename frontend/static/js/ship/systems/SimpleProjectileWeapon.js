import { debug } from '../../debug.js';

/**
 * SimpleProjectileWeapon - Simplified projectile-based weapons using Three.js
 * 
 * Replaces complex PhysicsProjectile system with simple visual trajectory + instant hit detection
 */

import { WeaponCard } from './WeaponCard.js';
import { SimpleProjectile } from './services/SimpleProjectileService.js';

export class SimpleProjectileWeapon extends WeaponCard {
    constructor(weaponData) {
        super(weaponData);
        
        // Override weapon type for projectiles
        this.cardType = 'splash-damage'; // For visual effects
        this.isProjectileWeapon = true;
    }
    
    /**
     * Fire projectile weapon with simplified Three.js system
     */
    fire(origin, target = null, ship = null) {
        // Basic validation
        if (!this.canFire()) {
            return {
                success: false,
                reason: 'Weapon on cooldown',
                damage: 0
            };
        }
        
        // Energy check
        if (ship && ship.currentEnergy < this.energyCost) {
            if (window.starfieldManager?.weaponHUD) {
                window.starfieldManager.weaponHUD.showMessage(
                    'Insufficient Energy',
                    `${this.name} requires ${this.energyCost} energy`,
                    2000
                );
            }
            
            return {
                success: false,
                reason: 'Insufficient energy',
                damage: 0
            };
        }
        
        // Consume energy
        if (ship) {
            ship.consumeEnergy(this.energyCost);
        }
        
        // Calculate firing direction
        const direction = this.calculateFiringDirection(origin, target);
        if (!direction) {
            return {
                success: false,
                reason: 'Could not determine firing direction',
                damage: 0
            };
        }
        
        // Determine flight time based on weapon type
        const flightTime = this.calculateFlightTime();
        
        // Create simplified projectile
        const projectile = new SimpleProjectile({
            weaponName: this.name,
            damage: this.damage,
            blastRadius: this.blastRadius,
            isHoming: this.homingCapability,
            flightTime: flightTime,
            origin: origin,
            direction: direction,
            target: target,
            maxRange: this.range,
            scene: window.starfieldManager?.scene
        });
        
        // Add to projectile manager
        if (window.simpleProjectileManager) {
            window.simpleProjectileManager.addProjectile(projectile);
        }
        
        // Update cooldown
        this.lastFireTime = Date.now();
        
        // Show muzzle flash / launch effects
        this.triggerLaunchEffects(origin);
        
debug('COMBAT', `🚀 ${this.name}: Fired projectile with ${flightTime}s flight time`);
        
        return {
            success: true,
            projectile: projectile,
            weaponType: this.name,
            damage: this.damage,
            flightTime: flightTime
        };
    }
    
    /**
     * Calculate firing direction based on target or crosshair aim
     */
    calculateFiringDirection(origin, target) {
        const THREE = window.THREE;
        if (!THREE) return null;
        
        // If we have a target, aim at target
        if (target && target.position) {
            const targetPos = target.position.threeObject?.position || target.position;
            const direction = new THREE.Vector3()
                .subVectors(targetPos, new THREE.Vector3(origin.x, origin.y, origin.z))
                .normalize();
            return direction;
        }
        
        // Otherwise, use camera forward direction (crosshair aim)
        const camera = window.starfieldManager?.camera;
        if (camera) {
            const direction = new THREE.Vector3();
            camera.getWorldDirection(direction);
            return direction;
        }
        
        // Fallback: forward direction
        return new THREE.Vector3(0, 0, -1);
    }
    
    /**
     * Calculate flight time based on weapon characteristics
     */
    calculateFlightTime() {
        // Different weapons have different flight characteristics
        if (this.name.toLowerCase().includes('missile')) {
            return this.homingCapability ? 2.0 : 1.5; // Homing missiles take longer
        }
        
        if (this.name.toLowerCase().includes('torpedo')) {
            return 2.5; // Torpedoes are slower but powerful
        }
        
        // Default projectile time
        return 1.5;
    }
    
    /**
     * Trigger visual launch effects
     */
    triggerLaunchEffects(origin) {
        // Use existing weapon effects manager if available
        if (window.starfieldManager?.weaponEffectsManager) {
            try {
                // Create muzzle flash
                window.starfieldManager.weaponEffectsManager.createMuzzleFlash(origin, this.name);
                
                // Play launch sound
                if (window.starfieldManager.weaponEffectsManager.playWeaponSound) {
                    window.starfieldManager.weaponEffectsManager.playWeaponSound(this.name, 'fire');
                }
            } catch (e) {
debug('UTILITY', `⚠️ ${this.name}: Could not create launch effects:`, e);
            }
        }
    }
    
    /**
     * Check if weapon can fire (cooldown, energy, etc.)
     */
    canFire() {
        const now = Date.now();
        const cooldownTime = this.cooldownTime * 1000; // Convert to ms
        
        return (now - this.lastFireTime) >= cooldownTime;
    }
}

// Export for use in weapon system
export default SimpleProjectileWeapon;
