/**
 * WeaponHUD - Heads-up display for weapons system
 * Based on docs/weapons_system_spec.md and docs/system_architecture.md
 * Provides visual feedback for weapon selection, cooldowns, and autofire status
 */

export class WeaponHUD {
    constructor(hudContainer) {
        this.hudContainer = hudContainer;
        this.weaponSlotsDisplay = null;
        this.cooldownBars = [];
        this.autofireIndicator = null;
        this.targetLockIndicator = null;
        this.messageDisplay = null;
        this.messageTimeout = null; // Track message display timeout
        
        this.createHUDElements();
        
        console.log('WeaponHUD initialized');
    }
    
    /**
     * Create HUD visual elements
     */
    createHUDElements() {
        // Create weapon slots display container
        this.weaponSlotsDisplay = document.createElement('div');
        this.weaponSlotsDisplay.className = 'weapon-slots-display';
        this.weaponSlotsDisplay.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 1000;
        `;
        this.hudContainer.appendChild(this.weaponSlotsDisplay);
        
        // Create autofire indicator
        this.autofireIndicator = document.createElement('div');
        this.autofireIndicator.className = 'autofire-indicator';
        this.autofireIndicator.style.cssText = `
            position: fixed;
            bottom: 140px;
            right: 20px;
            color: #00ff00;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
            z-index: 1000;
            display: none;
        `;
        this.autofireIndicator.textContent = 'AUTOFIRE: OFF';
        this.hudContainer.appendChild(this.autofireIndicator);
        
        // Create target lock indicator
        this.targetLockIndicator = document.createElement('div');
        this.targetLockIndicator.className = 'target-lock-indicator';
        this.targetLockIndicator.style.cssText = `
            position: fixed;
            bottom: 160px;
            right: 20px;
            color: #ffff00;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
            z-index: 1000;
            display: none;
        `;
        this.targetLockIndicator.textContent = 'TARGET LOCK';
        this.hudContainer.appendChild(this.targetLockIndicator);
        
        // Create message display
        this.messageDisplay = document.createElement('div');
        this.messageDisplay.className = 'weapon-message-display';
        this.messageDisplay.style.cssText = `
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            color: #00ff00 !important;
            font-family: 'Courier New', monospace !important;
            font-size: 12px !important;
            font-weight: normal !important;
            z-index: 1000 !important;
            display: none !important;
            opacity: 1 !important;
            background: rgba(0, 20, 0, 0.8) !important;
            padding: 5px 10px !important;
            border-radius: 3px !important;
            border: 1px solid #00aa00 !important;
            text-shadow: 0 0 5px #00ff00 !important;
            max-width: 250px !important;
            word-wrap: break-word !important;
            text-align: left !important;
            pointer-events: none !important;
        `;
        this.hudContainer.appendChild(this.messageDisplay);
    }
    
    /**
     * Update weapon slots display
     * @param {Array} weaponSlots Array of weapon slots
     * @param {number} activeSlotIndex Currently active slot index
     */
    updateWeaponSlotsDisplay(weaponSlots, activeSlotIndex) {
        // Clear existing display
        this.weaponSlotsDisplay.innerHTML = '';
        this.cooldownBars = [];
        
        weaponSlots.forEach((slot, index) => {
            const slotElement = this.createWeaponSlotElement(slot, index === activeSlotIndex);
            this.weaponSlotsDisplay.appendChild(slotElement);
        });
    }
    
    /**
     * Create individual weapon slot element
     * @param {WeaponSlot} slot Weapon slot
     * @param {boolean} isActive Whether this is the active slot
     * @returns {HTMLElement} Slot element
     */
    createWeaponSlotElement(slot, isActive) {
        const slotElement = document.createElement('div');
        slotElement.className = 'weapon-slot';
        slotElement.style.cssText = `
            width: 60px;
            height: 60px;
            border: 2px solid ${isActive ? '#00ff00' : '#666666'};
            background: rgba(0, 0, 0, 0.8);
            border-radius: 5px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            font-family: 'Courier New', monospace;
            font-size: 10px;
            color: #ffffff;
        `;
        
        // Slot number
        const slotNumber = document.createElement('div');
        slotNumber.className = 'weapon-slot-number';
        slotNumber.textContent = (slot.slotIndex + 1).toString();
        slotNumber.style.cssText = `
            position: absolute;
            top: 2px;
            left: 2px;
            font-size: 8px;
            color: #888888;
        `;
        slotElement.appendChild(slotNumber);
        
        if (slot.isEmpty) {
            // Empty slot
            const emptyText = document.createElement('div');
            emptyText.className = 'weapon-name-display';
            emptyText.textContent = 'EMPTY';
            emptyText.style.cssText = `
                font-size: 8px;
                color: #666666;
                text-align: center;
            `;
            slotElement.appendChild(emptyText);
        } else {
            // Weapon icon/name
            const weaponName = document.createElement('div');
            weaponName.className = 'weapon-name-display';
            weaponName.textContent = this.getWeaponAbbreviation(slot.equippedWeapon.name);
            weaponName.style.cssText = `
                font-size: 10px;
                font-weight: bold;
                text-align: center;
                color: ${isActive ? '#00ff00' : '#ffffff'};
            `;
            slotElement.appendChild(weaponName);
            
            // Cooldown bar
            if (slot.isInCooldown()) {
                const cooldownBar = this.createCooldownBar(slot);
                slotElement.appendChild(cooldownBar);
                this.cooldownBars.push({
                    element: cooldownBar,
                    slot: slot
                });
            }
        }
        
        return slotElement;
    }
    
    /**
     * Create cooldown bar for weapon slot
     * @param {WeaponSlot} slot Weapon slot
     * @returns {HTMLElement} Cooldown bar element
     */
    createCooldownBar(slot) {
        const cooldownContainer = document.createElement('div');
        cooldownContainer.className = 'weapon-cooldown-bar';
        cooldownContainer.style.cssText = `
            position: absolute;
            bottom: 2px;
            left: 2px;
            right: 2px;
            height: 4px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 2px;
        `;
        
        const cooldownFill = document.createElement('div');
        cooldownFill.className = 'weapon-cooldown-fill';
        const percentage = slot.getCooldownPercentage();
        cooldownFill.style.cssText = `
            height: 100%;
            background: #ff6600;
            border-radius: 2px;
            width: ${percentage}%;
            transition: width 0.1s ease;
        `;
        
        cooldownContainer.appendChild(cooldownFill);
        return cooldownContainer;
    }
    
    /**
     * Get weapon name abbreviation for display
     * @param {string} weaponName Full weapon name
     * @returns {string} Abbreviated name
     */
    getWeaponAbbreviation(weaponName) {
        const abbreviations = {
            'Laser Cannon': 'LAS',
            'Plasma Cannon': 'PLA',
            'Pulse Cannon': 'PUL',
            'Phaser Array': 'PHA',
            'Standard Missile': 'MIS',
            'Homing Missile': 'HOM',
            'Heavy Torpedo': 'TOR',
            'Proximity Mine': 'MIN',
            'Cluster Missile': 'CLU',
            'Guided Torpedo': 'GUI'
        };
        
        return abbreviations[weaponName] || weaponName.substring(0, 3).toUpperCase();
    }
    
    /**
     * Update active weapon highlight
     * @param {number} activeSlotIndex Active slot index
     */
    updateActiveWeaponHighlight(activeSlotIndex) {
        const slots = this.weaponSlotsDisplay.children;
        
        for (let i = 0; i < slots.length; i++) {
            const slot = slots[i];
            const isActive = i === activeSlotIndex;
            
            // Update border color
            slot.style.borderColor = isActive ? '#00ff00' : '#666666';
            
            // Update weapon name color using reliable class selector
            const weaponNameElement = slot.querySelector('.weapon-name-display');
            if (weaponNameElement && weaponNameElement.textContent !== 'EMPTY') {
                weaponNameElement.style.color = isActive ? '#00ff00' : '#ffffff';
            }
        }
    }
    
    /**
     * Update cooldown displays
     * @param {Array} weaponSlots Array of weapon slots
     */
    updateCooldownDisplay(weaponSlots) {
        // Update existing cooldown bars
        this.cooldownBars.forEach(({ element, slot }) => {
            const cooldownFill = element.querySelector('.weapon-cooldown-fill');
            if (cooldownFill) {
                const percentage = slot.getCooldownPercentage();
                cooldownFill.style.width = `${percentage}%`;
                
                // Remove cooldown bar if cooldown is complete
                if (percentage === 0) {
                    element.remove();
                }
            }
        });
        
        // Remove completed cooldown bars from tracking
        this.cooldownBars = this.cooldownBars.filter(({ slot }) => slot.isInCooldown());
        
        // Add new cooldown bars for weapons that just started cooling down
        weaponSlots.forEach((slot, index) => {
            if (slot.isInCooldown() && !this.cooldownBars.find(bar => bar.slot === slot)) {
                const slotElement = this.weaponSlotsDisplay.children[index];
                if (slotElement && !slot.isEmpty) {
                    const cooldownBar = this.createCooldownBar(slot);
                    slotElement.appendChild(cooldownBar);
                    this.cooldownBars.push({
                        element: cooldownBar,
                        slot: slot
                    });
                }
            }
        });
    }
    
    /**
     * Update autofire status display
     * @param {boolean} isAutofireOn Autofire status
     */
    updateAutofireStatus(isAutofireOn) {
        // Use the regular message display with longer duration for autofire
        const status = isAutofireOn ? 'ON' : 'OFF';
        this.showMessage(`Autofire: ${status}`, 6000); // 6 seconds instead of 3
    }
    
    /**
     * Update target lock status display
     * @param {boolean} hasLock Target lock status
     */
    updateTargetLockStatus(hasLock) {
        this.targetLockIndicator.style.display = hasLock ? 'block' : 'none';
    }
    
    /**
     * Show weapon selection feedback
     * @param {string} weaponName Name of selected weapon
     */
    showWeaponSelectFeedback(weaponName) {
        this.showMessage(`${weaponName} selected`);
    }
    
    /**
     * Show cooldown message
     * @param {string} weaponName Name of weapon
     * @param {string} timeRemaining Time remaining in seconds
     */
    showCooldownMessage(weaponName, timeRemaining) {
        this.showMessage(`${weaponName} cooling down: ${timeRemaining}s`);
    }
    
    /**
     * Show target lock required message
     */
    showTargetLockRequiredMessage() {
        this.showMessage('Target lock required');
    }
    
    /**
     * Show out of range feedback
     * @param {string} weaponName Name of weapon
     * @param {number} targetDistance Distance to target
     * @param {number} weaponRange Maximum weapon range
     */
    showOutOfRangeFeedback(weaponName, targetDistance, weaponRange) {
        const distanceKm = (targetDistance / 1000).toFixed(1);
        const rangeKm = (weaponRange / 1000).toFixed(1);
        this.showMessage(`${weaponName}: Out of range (${distanceKm}km > ${rangeKm}km)`, 4000);
    }
    
    /**
     * Show damage dealt feedback
     * @param {string} weaponName Name of weapon that dealt damage
     * @param {number} damageAmount Amount of damage dealt
     * @param {string} targetName Name of target hit
     */
    showDamageFeedback(weaponName, damageAmount, targetName) {
        this.showMessage(`${weaponName}: ${damageAmount} damage to ${targetName}`, 3000);
    }
    
    /**
     * Show insufficient energy feedback
     * @param {string} weaponName Name of weapon
     * @param {number} required Required energy
     * @param {number} available Available energy
     */
    showInsufficientEnergyFeedback(weaponName, required, available) {
        this.showMessage(`${weaponName}: Insufficient energy (${required}/${available})`, 3000);
    }
    
    /**
     * Show weapon malfunction feedback
     * @param {string} weaponName Name of weapon
     * @param {string} reason Reason for malfunction
     */
    showWeaponMalfunctionFeedback(weaponName, reason) {
        this.showMessage(`${weaponName}: ${reason}`, 4000);
    }
    
    /**
     * Show general message
     * @param {string} message Message to display
     * @param {number} duration Duration in milliseconds (default: 3000)
     */
    showMessage(message, duration = 3000) {
        console.log(`🎯 WeaponHUD.showMessage called with: "${message}" (duration: ${duration}ms)`);
        console.log(`🎯 messageDisplay element:`, this.messageDisplay);
        console.log(`🎯 messageDisplay current style:`, this.messageDisplay.style.cssText);
        
        this.messageDisplay.textContent = message;
        this.messageDisplay.style.display = 'block';
        this.messageDisplay.style.opacity = '1'; // Ensure message is visible
        
        console.log(`🎯 messageDisplay after setting display=block:`, this.messageDisplay.style.cssText);
        console.log(`🎯 messageDisplay visible in DOM:`, this.messageDisplay.offsetHeight > 0);
        
        // Clear any existing timeout
        if (this.messageTimeout) {
            clearTimeout(this.messageTimeout);
        }
        
        // Hide after specified duration
        this.messageTimeout = setTimeout(() => {
            this.messageDisplay.style.display = 'none';
            this.messageDisplay.style.opacity = '0';
            this.messageTimeout = null;
            console.log(`🎯 WeaponHUD message hidden after ${duration}ms`);
        }, duration);
    }
    
    /**
     * Initialize weapon slots display
     * @param {number} maxSlots Maximum number of weapon slots
     */
    initializeWeaponSlots(maxSlots) {
        const emptySlots = [];
        for (let i = 0; i < maxSlots; i++) {
            emptySlots.push({
                slotIndex: i,
                isEmpty: true,
                isInCooldown: () => false,
                getCooldownPercentage: () => 0
            });
        }
        
        this.updateWeaponSlotsDisplay(emptySlots, 0);
    }
    
    /**
     * Clean up HUD elements
     */
    dispose() {
        if (this.weaponSlotsDisplay) {
            this.weaponSlotsDisplay.remove();
        }
        if (this.autofireIndicator) {
            this.autofireIndicator.remove();
        }
        if (this.targetLockIndicator) {
            this.targetLockIndicator.remove();
        }
        if (this.messageDisplay) {
            this.messageDisplay.remove();
        }
        
        this.cooldownBars = [];
        
        console.log('WeaponHUD disposed');
    }
} 