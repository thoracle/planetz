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
            this.weaponSlots.push(new WeaponSlot(i, ship, ship.starfieldManager, this));
        }
        
        // Active weapon management
        this.activeSlotIndex = 0;
        this.isAutofireOn = false;
        this.targetLockRequired = false;
        this.lockedTarget = null;
        
        // Weapon HUD reference
        this.weaponHUD = null;
        
        // WeaponSystem initialized (reduced logging for cleaner console)
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
            
            // Update crosshair display to reflect new active weapon range
            this.updateCrosshairForActiveWeapon();
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
            
            // Update crosshair display to reflect new active weapon range
            this.updateCrosshairForActiveWeapon();
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
     * Check if autofire is available for the current weapon
     * @returns {boolean} True if autofire is available
     */
    isAutofireAvailable() {
        const activeSlot = this.getActiveWeapon();
        if (!activeSlot || activeSlot.isEmpty) return false;
        
        const weapon = activeSlot.equippedWeapon;
        if (!weapon) return false;
        
        // UPDATED: Check weapon's autofireEnabled property first
        if (weapon.autofireEnabled === false) {
            return false;
        }
        
        // Check if weapon level is 3 or higher (legacy requirement maintained)
        const weaponLevel = weapon.level || 1;
        if (weaponLevel < 3) {
            return false;
        }
        
        return true;
    }
    
    /**
     * Toggle autofire mode
     * @returns {boolean} True if autofire toggle was successful, false if it failed
     */
    toggleAutofire() {
        // Check if autofire is available before toggling
        if (!this.isAutofireAvailable()) {
            const activeSlot = this.getActiveWeapon();
            if (activeSlot && !activeSlot.isEmpty) {
                const weapon = activeSlot.equippedWeapon;
                const weaponLevel = weapon.level || 1;
                
                // Determine specific reason for autofire unavailability
                let reason = '';
                if (weapon.autofireEnabled === false) {
                    reason = `${weapon.name} does not support autofire`;
                } else if (weaponLevel < 3) {
                    reason = `${weapon.name} is Level ${weaponLevel} (requires Level 3+)`;
                } else {
                    reason = `${weapon.name} autofire unavailable`;
                }
                
                console.log(`🎯 Autofire unavailable: ${reason}`);
                this.showMessage(`Autofire unavailable: ${reason}`, 4000);
            } else {
                console.log('🎯 Autofire unavailable: No weapon equipped');
                this.showMessage('Autofire unavailable: No weapon equipped', 3000);
            }
            return false; // Command failed
        }
        
        this.isAutofireOn = !this.isAutofireOn;
        
        const activeSlot = this.getActiveWeapon();
        const weapon = activeSlot?.equippedWeapon;
        const weaponName = weapon?.name || 'Unknown';
        const weaponLevel = weapon?.level || 1;
        
        // Enhanced autofire status message
        const status = this.isAutofireOn ? 'ON' : 'OFF';
        const weaponType = weapon?.homingCapability ? 'homing' : (weapon?.targetLockRequired ? 'guided' : 'direct-fire');
        
        console.log(`🎯 Autofire ${status} for ${weaponName} (Level ${weaponLevel}, ${weaponType})`);
        
        // Show user-friendly message
        if (this.isAutofireOn) {
            let autofireMessage = `Autofire enabled: ${weaponName}`;
            
            if (weapon?.targetLockRequired && weapon?.homingCapability) {
                autofireMessage += ' (requires target lock)';
            } else if (weapon?.targetLockRequired) {
                autofireMessage += ' (guided weapon)';
            } else {
                autofireMessage += ' (free-aim)';
            }
            
            this.showMessage(autofireMessage, 3000);
        } else {
            this.showMessage(`Autofire disabled: ${weaponName}`, 2000);
        }
        
        // Update UI
        if (this.weaponHUD) {
            this.weaponHUD.updateAutofireStatus(this.isAutofireOn);
        }
        
        return true; // Command succeeded
    }
    
    /**
     * Update autofire processing (called from game loop)
     * @param {number} deltaTime Time elapsed since last update in seconds
     */
    updateAutofire(deltaTime) {
        // Convert deltaTime from seconds to milliseconds for cooldown calculations
        const deltaTimeMs = deltaTime * 1000;
        
        // Always update weapon cooldowns regardless of autofire status
        this.weaponSlots.forEach(slot => {
            if (!slot.isEmpty) {
                slot.updateCooldown(deltaTimeMs);
            }
        });

        // Only process autofire logic if autofire is enabled AND available
        if (!this.isAutofireOn || !this.isAutofireAvailable()) {
            return;
        }
        
        // In autofire mode, only fire the currently active weapon
        const activeSlot = this.getActiveWeapon();
        if (!activeSlot || activeSlot.isEmpty) {
            return;
        }
        
        const weapon = activeSlot.equippedWeapon;
        
        // Check if current target is still valid (not destroyed)
        if (this.lockedTarget && this.lockedTarget.ship) {
            // Check if the target ship still exists in the game world
            const targetStillExists = this.ship.starfieldManager?.dummyShipMeshes?.some(mesh => 
                mesh.userData?.ship === this.lockedTarget.ship
            );
            
            if (!targetStillExists) {
                // Target has been destroyed, turn off autofire
                this.isAutofireOn = false;
                this.setLockedTarget(null);
                console.log('🎯 Autofire turned OFF - target no longer exists');
                
                // Update UI to reflect autofire is now off
                if (this.weaponHUD) {
                    this.weaponHUD.updateAutofireStatus(false);
                }
                
                // Show message to player
                this.showMessage('Autofire disabled - target destroyed', 3000);
                return;
            }
        }
        
        // If no target is locked, try to find the closest target automatically
        if (!this.lockedTarget) {
            const closestTarget = this.findClosestTarget();
            if (closestTarget) {
                this.setLockedTarget(closestTarget);
                console.log(`🎯 Auto-selected target: ${closestTarget.name || 'Unknown'} at ${this.calculateDistanceToTarget(closestTarget).toFixed(0)}m`);
            }
        }
        
        // ENHANCED: Fire the weapon based on weapon type with proper validation
        if (weapon.targetLockRequired && weapon.homingCapability) {
            // HOMING MISSILES: Require valid target lock and additional validation
            if (this.lockedTarget && this.validateHomingMissileTarget(weapon)) {
                const fired = activeSlot.fire(this.ship, this.lockedTarget);
                if (fired) {
                                                // Removed autofire spam
                }
            } else {
                // Homing missile can't fire - disable autofire and notify user
                this.isAutofireOn = false;
                if (this.weaponHUD) {
                    this.weaponHUD.updateAutofireStatus(false);
                }
                
                const reason = !this.lockedTarget ? 'no target lock' : 'target lost';
                console.log(`🎯 Autofire disabled for ${weapon.name}: ${reason}`);
                this.showMessage(`Autofire disabled: ${weapon.name} ${reason}`, 3000);
            }
        } else if (this.lockedTarget) {
            // ALL OTHER WEAPONS: Fire at locked target (lasers, torpedoes, non-homing missiles)
            const fired = activeSlot.fire(this.ship, this.lockedTarget);
            if (fired) {
                                        // Removed autofire spam
            }
        } else if (!weapon.targetLockRequired) {
            // FREE-AIM WEAPONS: Can fire without target (toward crosshairs)
            const fired = activeSlot.fire(this.ship, null);
            if (fired) {
                // Removed autofire spam
            }
        }
    }
    
    /**
     * Validate target for homing missiles during autofire
     * @param {Object} weapon Homing missile weapon
     * @returns {boolean} True if target is valid for homing missile
     */
    validateHomingMissileTarget(weapon) {
        if (!this.lockedTarget) {
            console.log(`🎯 Homing missile validation failed: No target locked`);
            return false;
        }
        
        // Check if target still exists in the game world
        if (this.lockedTarget.ship) {
            const targetStillExists = this.ship.starfieldManager?.dummyShipMeshes?.some(mesh => 
                mesh.userData?.ship === this.lockedTarget.ship
            );
            
            if (!targetStillExists) {
                console.log(`🎯 Homing missile validation failed: Target no longer exists`);
                return false;
            }
        }
        
        // Check if target is within range
        const distanceToTarget = this.calculateDistanceToTarget(this.lockedTarget);
        if (distanceToTarget > weapon.range) {
            console.log(`🎯 Homing missile validation failed: Target out of range (${(distanceToTarget/1000).toFixed(1)}km > ${(weapon.range/1000).toFixed(1)}km)`);
            return false;
        }
        
        // Check if target is alive (has hull > 0)
        if (this.lockedTarget.ship && this.lockedTarget.ship.currentHull <= 0) {
            console.log(`🎯 Homing missile validation failed: Target destroyed (hull: ${this.lockedTarget.ship.currentHull})`);
            return false;
        }
        
        // Additional homing-specific checks can be added here
        // e.g., line of sight, jamming resistance, etc.
        
        console.log(`✅ Homing missile target validation passed: ${this.lockedTarget.name || 'target'} at ${(distanceToTarget/1000).toFixed(1)}km`);
        return true;
    }
    
    /**
     * Find the closest hostile target within weapon range for autofire
     * @returns {Object|null} Closest enemy target or null if none found
     */
    findClosestTarget() {
        const activeSlot = this.getActiveWeapon();
        if (!activeSlot || activeSlot.isEmpty) return null;
        
        const weapon = activeSlot.equippedWeapon;
        const weaponRange = weapon.range;
        
        // Get camera position (player position)
        const camera = this.ship.starfieldManager?.camera;
        if (!camera) return null;
        
        // Get THREE.js reference using the same pattern as other files
        const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
        if (!THREE) return null;
        
        let closestTarget = null;
        let closestDistance = Infinity;
        
        // Search through all enemy ships
        if (this.ship.starfieldManager?.dummyShipMeshes) {
            this.ship.starfieldManager.dummyShipMeshes.forEach(mesh => {
                if (mesh.userData?.ship && mesh.position) {
                    const distance = camera.position.distanceTo(mesh.position);
                    
                    // Check if target is within weapon range and closer than current closest
                    if (distance <= weaponRange && distance < closestDistance) {
                        // Create target object in the format expected by the weapon system
                        const target = {
                            position: {
                                x: mesh.position.x,
                                y: mesh.position.y,
                                z: mesh.position.z
                            },
                            radius: 50, // Default ship radius in meters
                            ship: mesh.userData.ship,
                            mesh: mesh,
                            name: mesh.userData.ship.shipName || 'Enemy Ship'
                        };
                        
                        closestTarget = target;
                        closestDistance = distance;
                    }
                }
            });
        }
        
        return closestTarget;
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
        
        // Calculate distance to target
        const distance = this.calculateDistanceToTarget(this.lockedTarget);
        return distance <= activeWeapon.equippedWeapon.range;
    }
    
    /**
     * Calculate distance to target
     * @param {Object} target Target object with position
     * @returns {number} Distance in meters
     */
    calculateDistanceToTarget(target) {
        if (!target || !target.position) return Infinity;
        
        // Get camera position (player position)
        const camera = this.ship.starfieldManager?.camera;
        if (!camera) return Infinity;
        
        // Get THREE.js reference using the same pattern as other files
        const THREE = window.THREE || (typeof THREE !== 'undefined' ? THREE : null);
        if (!THREE) return Infinity;
        
        // Calculate actual distance between camera and target
        const targetPos = new THREE.Vector3(target.position.x, target.position.y, target.position.z);
        const distance = camera.position.distanceTo(targetPos);
        
        return distance; // Return distance in meters (same units as weapon range)
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
     * Update crosshair display to reflect active weapon range
     */
    updateCrosshairForActiveWeapon() {
        try {
            // Get the ViewManager through the ship reference
            const viewManager = this.ship?.starfieldManager?.viewManager;
            if (viewManager && typeof viewManager.updateCrosshairDisplay === 'function') {
                viewManager.updateCrosshairDisplay();
            }
        } catch (error) {
            console.log('Failed to update crosshair for active weapon:', error.message);
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
     * Show message on HUD (with fallback for when WeaponHUD is not connected)
     * @param {string} message Message to display
     * @param {number} duration Duration in milliseconds
     */
    showMessage(message, duration = 3000) {
        console.log(`🎯 ${message}`);
        
        if (this.weaponHUD) {
            // Use connected WeaponHUD - use unified message display
            this.weaponHUD.showUnifiedMessage(message, duration, 2); // Priority 2 for weapon messages
            console.log(`🎯 Message sent to connected WeaponHUD unified display`);
        } else {
            // Fallback: try to find WeaponHUD directly in DOM or via StarfieldManager
            console.warn(`🎯 WeaponHUD not connected, trying alternative paths`);
            
            // Try to get WeaponHUD via StarfieldManager
            const starfieldWeaponHUD = window.starfieldManager?.weaponHUD;
            if (starfieldWeaponHUD && starfieldWeaponHUD.showUnifiedMessage) {
                starfieldWeaponHUD.showUnifiedMessage(message, duration, 2);
                console.log(`🎯 Message sent via StarfieldManager WeaponHUD`);
            } else {
                // Last resort fallback
                this.showFallbackHUDMessage(message, duration);
            }
        }
    }
    
    /**
     * Fallback method to show HUD message directly via DOM
     * @param {string} message Message to display
     * @param {number} duration Duration in milliseconds
     */
    showFallbackHUDMessage(message, duration = 3000) {
        // Try to find the WeaponHUD message display element directly
        const messageDisplay = document.querySelector('.weapon-message-display');
        
        if (messageDisplay) {
            // Found the message display element
            messageDisplay.textContent = message;
            messageDisplay.style.display = 'block';
            messageDisplay.style.opacity = '1';
            
            console.log(`🎯 Fallback: Message displayed via DOM - "${message}"`);
            
            // Hide after duration
            setTimeout(() => {
                messageDisplay.style.display = 'none';
                messageDisplay.style.opacity = '0';
            }, duration);
        } else {
            // Last resort: show as a temporary overlay
            console.warn(`🎯 WeaponHUD message display not found, creating temporary overlay`);
            this.showTemporaryOverlay(message, duration);
        }
    }
    
    /**
     * Show temporary overlay message as last resort
     * @param {string} message Message to display
     * @param {number} duration Duration in milliseconds
     */
    showTemporaryOverlay(message, duration = 3000) {
        // Create temporary overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff41;
            padding: 10px 15px;
            border-radius: 5px;
            font-family: "Courier New", monospace;
            font-size: 14px;
            z-index: 10000;
            border: 1px solid #00ff41;
            box-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
        `;
        overlay.textContent = message;
        
        document.body.appendChild(overlay);
        console.log(`🎯 Temporary overlay created: "${message}"`);
        
        // Remove after duration
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, duration);
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