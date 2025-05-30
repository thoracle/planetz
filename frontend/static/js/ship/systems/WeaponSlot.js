/**
 * WeaponSlot - Manages individual weapon slot state and firing
 * Based on docs/weapons_system_spec.md and docs/system_architecture.md
 * Handles weapon installation, cooldown management, and firing logic
 */

import { WeaponCard } from './WeaponCard.js';

export class WeaponSlot {
    constructor(slotIndex) {
        this.slotIndex = slotIndex;
        this.equippedWeapon = null;
        this.cooldownTimer = 0; // milliseconds
        this.isEmpty = true;
        
        console.log(`WeaponSlot ${slotIndex} initialized`);
    }
    
    /**
     * Fire the equipped weapon
     * @param {Ship} ship Ship instance for energy consumption
     * @param {Object} target Target object (may be null for some weapons)
     * @returns {boolean} True if weapon fired successfully
     */
    fire(ship, target = null) {
        if (!this.canFire()) {
            console.warn(`Weapon slot ${this.slotIndex}: Cannot fire`);
            return false;
        }
        
        const weapon = this.equippedWeapon;
        
        // Check energy requirements
        if (weapon.energyCost > 0) {
            if (!ship.hasEnergy(weapon.energyCost)) {
                console.warn(`Weapon slot ${this.slotIndex}: Insufficient energy (need ${weapon.energyCost})`);
                return false;
            }
            
            // Consume energy
            ship.consumeEnergy(weapon.energyCost);
        }
        
        // Check target requirements for splash-damage weapons
        if (weapon.targetLockRequired && !target) {
            console.warn(`Weapon slot ${this.slotIndex}: Target lock required`);
            return false;
        }
        
        // Validate target range
        if (target && !weapon.isValidTarget(target, this.calculateDistanceToTarget(target))) {
            console.warn(`Weapon slot ${this.slotIndex}: Target out of range`);
            return false;
        }
        
        // Fire the weapon
        const fireResult = weapon.fire(ship.position, target);
        
        if (fireResult.success) {
            // Set cooldown timer
            this.setCooldownTimer(weapon.cooldownTime * 1000); // Convert to milliseconds
            
            console.log(`Weapon slot ${this.slotIndex}: ${weapon.name} fired - ${fireResult.damage} damage`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Check if weapon can fire
     * @returns {boolean} True if weapon can fire
     */
    canFire() {
        if (this.isEmpty || !this.equippedWeapon) {
            return false;
        }
        
        if (this.isInCooldown()) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Check if weapon is in cooldown
     * @returns {boolean} True if weapon is cooling down
     */
    isInCooldown() {
        return this.cooldownTimer > 0;
    }
    
    /**
     * Get cooldown percentage (0-100)
     * @returns {number} Cooldown percentage
     */
    getCooldownPercentage() {
        if (!this.equippedWeapon || this.cooldownTimer <= 0) {
            return 0;
        }
        
        const maxCooldown = this.equippedWeapon.cooldownTime * 1000;
        return Math.max(0, Math.min(100, (this.cooldownTimer / maxCooldown) * 100));
    }
    
    /**
     * Equip a weapon card to this slot
     * @param {WeaponCard} weaponCard Weapon card to equip
     * @returns {boolean} True if equipped successfully
     */
    equipWeapon(weaponCard) {
        if (!(weaponCard instanceof WeaponCard)) {
            console.error(`Weapon slot ${this.slotIndex}: Invalid weapon card`);
            return false;
        }
        
        // Remove existing weapon if any
        if (!this.isEmpty) {
            this.unequipWeapon();
        }
        
        this.equippedWeapon = weaponCard;
        this.isEmpty = false;
        this.cooldownTimer = 0; // Reset cooldown when equipping
        
        console.log(`Weapon slot ${this.slotIndex}: Equipped ${weaponCard.name}`);
        return true;
    }
    
    /**
     * Unequip weapon from this slot
     * @returns {boolean} True if unequipped successfully
     */
    unequipWeapon() {
        if (this.isEmpty) {
            return false;
        }
        
        const weaponName = this.equippedWeapon ? this.equippedWeapon.name : 'Unknown';
        
        this.equippedWeapon = null;
        this.isEmpty = true;
        this.cooldownTimer = 0;
        
        console.log(`Weapon slot ${this.slotIndex}: Unequipped ${weaponName}`);
        return true;
    }
    
    /**
     * Update cooldown timer
     * @param {number} deltaTime Time elapsed in milliseconds
     */
    updateCooldown(deltaTime) {
        if (this.cooldownTimer > 0) {
            this.cooldownTimer = Math.max(0, this.cooldownTimer - deltaTime);
        }
    }
    
    /**
     * Set cooldown timer
     * @param {number} cooldownTime Cooldown time in milliseconds
     */
    setCooldownTimer(cooldownTime) {
        this.cooldownTimer = Math.max(0, cooldownTime);
    }
    
    /**
     * Get remaining cooldown time in seconds
     * @returns {number} Remaining cooldown in seconds
     */
    getRemainingCooldownTime() {
        return this.cooldownTimer / 1000;
    }
    
    /**
     * Calculate distance to target (placeholder - integrate with existing targeting system)
     * @param {Object} target Target object
     * @returns {number} Distance to target
     */
    calculateDistanceToTarget(target) {
        // This would integrate with the existing targeting/distance calculation system
        // For now, return a placeholder value
        return 500; // meters
    }
    
    /**
     * Get weapon slot status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            slotIndex: this.slotIndex,
            isEmpty: this.isEmpty,
            weaponName: this.isEmpty ? null : this.equippedWeapon.name,
            weaponType: this.isEmpty ? null : this.equippedWeapon.weaponType,
            canFire: this.canFire(),
            isInCooldown: this.isInCooldown(),
            cooldownTimer: this.cooldownTimer,
            cooldownPercentage: this.getCooldownPercentage(),
            remainingCooldownTime: this.getRemainingCooldownTime()
        };
    }
} 