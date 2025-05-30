/**
 * WeaponSystem Core - Manages weapon slots, selection, autofire, and card integration
 * Based on docs/weapons_system_spec.md and docs/system_architecture.md
 * Implements card-based weapon slot management with [ ] key cycling and Enter firing
 */

import { WeaponSlot } from './WeaponSlot.js';
import { WeaponCard } from './WeaponCard.js';

export class WeaponSystemCore {
    constructor(ship, maxWeaponSlots = 4) {
        this.ship = ship;
        this.maxWeaponSlots = maxWeaponSlots;
        
        // Initialize weapon slots array
        this.weaponSlots = [];
        for (let i = 0; i < maxWeaponSlots; i++) {
            this.weaponSlots.push(new WeaponSlot(i));
        }
        
        // Active weapon management
        this.activeSlotIndex = 0;
        this.isAutofireOn = false;
        this.targetLockRequired = false;
        this.lockedTarget = null;
        
        // Weapon HUD reference
        this.weaponHUD = null;
        
        console.log(`WeaponSystem initialized with ${maxWeaponSlots} weapon slots`);
    }
    
    /**
     * Select previous equipped weapon ([ key binding)
     * @returns {boolean} True if weapon was changed
     */
    selectPreviousWeapon() {
        const currentIndex = this.activeSlotIndex;
        let newIndex = currentIndex;
        
        // Search for previous equipped slot (wrap around)
        for (let i = 1; i <= this.maxWeaponSlots; i++) {
            const checkIndex = (currentIndex - i + this.maxWeaponSlots) % this.maxWeaponSlots;
            if (!this.weaponSlots[checkIndex].isEmpty) {
                newIndex = checkIndex;
                break;
            }
        }
        
        if (newIndex !== currentIndex) {
            this.activeSlotIndex = newIndex;
            this.updateActiveWeaponHighlight();
            this.showWeaponSelectFeedback();
            return true;
        }
        
        // No weapons equipped - show message
        this.showMessage("No weapons equipped");
        return false;
    }
    
    /**
     * Select next equipped weapon (] key binding)
     * @returns {boolean} True if weapon was changed
     */
    selectNextWeapon() {
        const currentIndex = this.activeSlotIndex;
        let newIndex = currentIndex;
        
        // Search for next equipped slot (wrap around)
        for (let i = 1; i <= this.maxWeaponSlots; i++) {
            const checkIndex = (currentIndex + i) % this.maxWeaponSlots;
            if (!this.weaponSlots[checkIndex].isEmpty) {
                newIndex = checkIndex;
                break;
            }
        }
        
        if (newIndex !== currentIndex) {
            this.activeSlotIndex = newIndex;
            this.updateActiveWeaponHighlight();
            this.showWeaponSelectFeedback();
            return true;
        }
        
        // No weapons equipped - show message
        this.showMessage("No weapons equipped");
        return false;
    }
    
    /**
     * Fire the active weapon (Enter key binding)
     * @returns {boolean} True if weapon fired successfully
     */
    fireActiveWeapon() {
        const activeSlot = this.getActiveWeapon();
        
        if (!activeSlot) {
            this.showMessage("No weapons equipped");
            return false;
        }
        
        if (activeSlot.isEmpty) {
            this.showMessage("No weapon in active slot");
            return false;
        }
        
        if (activeSlot.isInCooldown()) {
            const timeRemaining = (activeSlot.cooldownTimer / 1000).toFixed(1);
            this.showCooldownMessage(activeSlot.equippedWeapon.name, timeRemaining);
            return false;
        }
        
        // Check target lock requirement for splash-damage weapons
        if (activeSlot.equippedWeapon.targetLockRequired) {
            if (!this.validateTargetLock()) {
                this.showTargetLockRequiredMessage();
                return false;
            }
        }
        
        return activeSlot.fire(this.ship, this.lockedTarget);
    }
    
    /**
     * Toggle autofire mode (\ key binding)
     * @returns {boolean} New autofire state
     */
    toggleAutofire() {
        this.isAutofireOn = !this.isAutofireOn;
        this.updateAutofireStatus();
        return this.isAutofireOn;
    }
    
    /**
     * Update autofire processing (called from game loop)
     * @param {number} deltaTime Time elapsed since last update
     */
    updateAutofire(deltaTime) {
        if (!this.isAutofireOn) return;
        
        // Update all weapon cooldowns
        this.weaponSlots.forEach(slot => {
            if (!slot.isEmpty) {
                slot.updateCooldown(deltaTime);
            }
        });
        
        // Attempt to fire all autofire-enabled weapons
        for (const slot of this.weaponSlots) {
            if (slot.isEmpty || !slot.equippedWeapon.autofireEnabled) continue;
            
            if (slot.canFire()) {
                // Check target requirements for this weapon
                if (slot.equippedWeapon.targetLockRequired) {
                    if (!this.validateTargetLock()) continue;
                }
                
                // Fire the weapon
                slot.fire(this.ship, this.lockedTarget);
            }
        }
    }
    
    /**
     * Get the active weapon slot
     * @returns {WeaponSlot|null} Active weapon slot or null if none
     */
    getActiveWeapon() {
        if (this.activeSlotIndex >= 0 && this.activeSlotIndex < this.weaponSlots.length) {
            return this.weaponSlots[this.activeSlotIndex];
        }
        return null;
    }
    
    /**
     * Equip a weapon card to a specific slot
     * @param {number} slotIndex Slot index (0-based)
     * @param {WeaponCard} weaponCard Weapon card to equip
     * @returns {boolean} True if equipped successfully
     */
    equipWeapon(slotIndex, weaponCard) {
        if (slotIndex < 0 || slotIndex >= this.weaponSlots.length) {
            console.error(`Invalid weapon slot index: ${slotIndex}`);
            return false;
        }
        
        if (!(weaponCard instanceof WeaponCard)) {
            console.error('Invalid weapon card provided');
            return false;
        }
        
        const slot = this.weaponSlots[slotIndex];
        if (slot.equipWeapon(weaponCard)) {
            // If this is the first weapon equipped, make it active
            if (this.getEquippedWeaponCount() === 1) {
                this.activeSlotIndex = slotIndex;
                this.updateActiveWeaponHighlight();
            }
            
            this.updateWeaponDisplay();
            console.log(`Equipped ${weaponCard.name} to weapon slot ${slotIndex}`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Unequip weapon from a specific slot
     * @param {number} slotIndex Slot index (0-based)
     * @returns {boolean} True if unequipped successfully
     */
    unequipWeapon(slotIndex) {
        if (slotIndex < 0 || slotIndex >= this.weaponSlots.length) {
            console.error(`Invalid weapon slot index: ${slotIndex}`);
            return false;
        }
        
        const slot = this.weaponSlots[slotIndex];
        const weaponName = slot.equippedWeapon ? slot.equippedWeapon.name : 'Unknown';
        
        if (slot.unequipWeapon()) {
            // If active weapon was removed, find next equipped weapon
            if (this.activeSlotIndex === slotIndex) {
                this.findNextActiveWeapon();
            }
            
            this.updateWeaponDisplay();
            console.log(`Unequipped ${weaponName} from weapon slot ${slotIndex}`);
            return true;
        }
        
        return false;
    }
    
    /**
     * Validate current target lock
     * @returns {boolean} True if valid target lock exists
     */
    validateTargetLock() {
        if (!this.lockedTarget) return false;
        
        // Check if target is within range of active weapon
        const activeWeapon = this.getActiveWeapon();
        if (!activeWeapon || activeWeapon.isEmpty) return false;
        
        // Calculate distance to target (simplified for now)
        const distance = this.calculateDistanceToTarget(this.lockedTarget);
        return distance <= activeWeapon.equippedWeapon.range;
    }
    
    /**
     * Calculate distance to target
     * @param {Object} target Target object with position
     * @returns {number} Distance in appropriate units
     */
    calculateDistanceToTarget(target) {
        // This would integrate with the existing targeting system
        // For now, return a placeholder value
        return 500; // meters
    }
    
    /**
     * Get count of equipped weapons
     * @returns {number} Number of equipped weapons
     */
    getEquippedWeaponCount() {
        return this.weaponSlots.filter(slot => !slot.isEmpty).length;
    }
    
    /**
     * Find next active weapon after current active was removed
     */
    findNextActiveWeapon() {
        // Try to find the next equipped weapon
        for (let i = 0; i < this.weaponSlots.length; i++) {
            if (!this.weaponSlots[i].isEmpty) {
                this.activeSlotIndex = i;
                this.updateActiveWeaponHighlight();
                return;
            }
        }
        
        // No weapons equipped
        this.activeSlotIndex = 0;
        this.updateActiveWeaponHighlight();
    }
    
    /**
     * Update active weapon highlight in HUD
     */
    updateActiveWeaponHighlight() {
        if (this.weaponHUD) {
            this.weaponHUD.updateActiveWeaponHighlight(this.activeSlotIndex);
        }
    }
    
    /**
     * Update autofire status display
     */
    updateAutofireStatus() {
        if (this.weaponHUD) {
            this.weaponHUD.updateAutofireStatus(this.isAutofireOn);
        }
        
        // Console log for debugging (no duplicate message)
        const status = this.isAutofireOn ? "ON" : "OFF";
        console.log(`Weapon System: Autofire ${status}`);
    }
    
    /**
     * Update weapon display
     */
    updateWeaponDisplay() {
        if (this.weaponHUD) {
            this.weaponHUD.updateCooldownDisplay(this.weaponSlots);
        }
    }
    
    /**
     * Show weapon selection feedback
     */
    showWeaponSelectFeedback() {
        const activeWeapon = this.getActiveWeapon();
        if (activeWeapon && !activeWeapon.isEmpty) {
            if (this.weaponHUD) {
                this.weaponHUD.showWeaponSelectFeedback(activeWeapon.equippedWeapon.name);
            }
        }
    }
    
    /**
     * Show message in HUD
     * @param {string} message Message to display
     */
    showMessage(message) {
        if (this.weaponHUD) {
            this.weaponHUD.showMessage(message);
        }
        console.log(`Weapon System: ${message}`);
    }
    
    /**
     * Show cooldown message
     * @param {string} weaponName Name of weapon
     * @param {string} timeRemaining Time remaining in seconds
     */
    showCooldownMessage(weaponName, timeRemaining) {
        if (this.weaponHUD) {
            this.weaponHUD.showCooldownMessage(weaponName, timeRemaining);
        }
    }
    
    /**
     * Show target lock required message
     */
    showTargetLockRequiredMessage() {
        if (this.weaponHUD) {
            this.weaponHUD.showTargetLockRequiredMessage();
        }
    }
    
    /**
     * Set weapon HUD reference
     * @param {WeaponHUD} weaponHUD HUD component
     */
    setWeaponHUD(weaponHUD) {
        this.weaponHUD = weaponHUD;
    }
    
    /**
     * Set locked target
     * @param {Object} target Target object
     */
    setLockedTarget(target) {
        this.lockedTarget = target;
    }
    
    /**
     * Get weapon system status
     * @returns {Object} Status information
     */
    getStatus() {
        return {
            maxWeaponSlots: this.maxWeaponSlots,
            equippedWeapons: this.getEquippedWeaponCount(),
            activeSlotIndex: this.activeSlotIndex,
            isAutofireOn: this.isAutofireOn,
            hasLockedTarget: !!this.lockedTarget,
            weaponSlots: this.weaponSlots.map(slot => ({
                slotIndex: slot.slotIndex,
                isEmpty: slot.isEmpty,
                weaponName: slot.isEmpty ? null : slot.equippedWeapon.name,
                isInCooldown: slot.isInCooldown(),
                cooldownPercentage: slot.getCooldownPercentage()
            }))
        };
    }
} 