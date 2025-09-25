import { debug } from '../debug.js';

/**
 * WeaponHUD - Heads-up display for weapons system
 * Based on docs/weapons_system_spec.md and docs/system_architecture.md
 * Provides visual feedback for weapon selection, cooldowns, and autofire status
 */

export class WeaponHUD {
    constructor(hudContainer) {
debug('COMBAT', '🔫 WeaponHUD constructor called with container:', !!hudContainer);
        this.hudContainer = hudContainer;
        this.weaponSlotsDisplay = null;
        this.cooldownBars = [];
        this.autofireIndicator = null;
        this.targetLockIndicator = null;
        this.unifiedDisplay = null; // Combined message and feedback display
        this.displayTimeout = null; // Track display timeout
        this.currentMessagePriority = 0; // Track message priority (higher = more important)
        this.lastWeaponConfiguration = null; // Track weapon configuration to avoid unnecessary rebuilds
        
debug('COMBAT', '🔫 WeaponHUD: About to create HUD elements...');
        this.createHUDElements();
        
debug('COMBAT', '🔫 WeaponHUD initialized successfully');
debug('COMBAT', `🔫 WeaponHUD elements: weaponSlotsDisplay=${!!this.weaponSlotsDisplay}, autofireIndicator=${!!this.autofireIndicator}`);
    }
    
    /**
     * Create HUD visual elements
     */
    createHUDElements() {
debug('COMBAT', '🔫 createHUDElements: Creating weapon slots display...');
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
debug('COMBAT', `🔫 createHUDElements: Appending weaponSlotsDisplay to container: ${!!this.hudContainer}`);
        this.hudContainer.appendChild(this.weaponSlotsDisplay);
debug('COMBAT', '🔫 createHUDElements: weaponSlotsDisplay added to DOM');
        
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
        
        // Create unified message/feedback display
        this.unifiedDisplay = document.createElement('div');
        this.unifiedDisplay.className = 'weapon-unified-display';
        this.unifiedDisplay.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            color: #ffffff;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
            z-index: 1001;
            display: none;
            background: rgba(0, 0, 0, 0.85);
            padding: 8px 12px;
            border-radius: 4px;
            border: 2px solid #666;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.9);
            min-width: 100px;
            max-width: 300px;
            text-align: center;
            box-shadow: 0 0 15px rgba(0,0,0,0.6);
            word-wrap: break-word;
            pointer-events: none;
            transition: all 0.2s ease;
        `;
        this.hudContainer.appendChild(this.unifiedDisplay);
    }
    
    /**
     * Get weapon-specific colors that match projectile/effect colors
     * @param {string} weaponName Name of the weapon
     * @returns {Object} Color configuration with hex and title
     */
    getWeaponColors(weaponName) {
        // Convert weapon name to lowercase for matching
        const weaponKey = weaponName.toLowerCase().replace(/\s+/g, '_');
        
        const colorMap = {
            'laser_cannon': { hex: '#00FFFF', title: 'Laser Cannon' },      // Cyan
            'pulse_cannon': { hex: '#00FFFF', title: 'Pulse Cannon' },      // Cyan
            'plasma_cannon': { hex: '#00FF00', title: 'Plasma Cannon' },    // Green
            'phaser_array': { hex: '#FF0080', title: 'Phaser Array' },      // Pink
            'standard_missile': { hex: '#FFFF00', title: 'Standard Missile' }, // Yellow
            'homing_missile': { hex: '#FF8000', title: 'Homing Missile' },  // Orange
            'photon_torpedo': { hex: '#FF0000', title: 'Photon Torpedo' },  // Red
            'proximity_mine': { hex: '#8000FF', title: 'Proximity Mine' }   // Purple
        };
        
        return colorMap[weaponKey] || { hex: '#FFFFFF', title: 'Unknown Weapon' }; // Default white
    }
    
    /**
     * Update weapon slots display
     * @param {Array} weaponSlots Array of weapon slots
     * @param {number} activeSlotIndex Currently active slot index
     */
    updateWeaponSlotsDisplay(weaponSlots, activeSlotIndex) {
        // Check if we need to rebuild the entire display
        const needsRebuild = this.weaponSlotsDisplay.children.length !== weaponSlots.length ||
                            this.lastWeaponConfiguration !== this.getWeaponConfigurationHash(weaponSlots);
        
        if (needsRebuild) {
            // Only rebuild when weapon configuration actually changes
            debug('COMBAT', 'WeaponHUD: Rebuilding weapon slots display');
            
            // Clear existing display
            this.weaponSlotsDisplay.innerHTML = '';
            this.cooldownBars = [];
            
            weaponSlots.forEach((slot, index) => {
                const slotElement = this.createWeaponSlotElement(slot, index === activeSlotIndex);
                this.weaponSlotsDisplay.appendChild(slotElement);
            });
            
            // Store current configuration hash
            this.lastWeaponConfiguration = this.getWeaponConfigurationHash(weaponSlots);
        } else {
            // Just update the active weapon highlight without rebuilding
            this.updateActiveWeaponHighlight(activeSlotIndex);
        }
    }
    
    /**
     * Generate a hash of the current weapon configuration to detect changes
     * @param {Array} weaponSlots Array of weapon slots
     * @returns {string} Configuration hash
     */
    getWeaponConfigurationHash(weaponSlots) {
        return weaponSlots.map(slot => {
            if (slot.isEmpty) {
                return `empty_${slot.slotIndex}`;
            } else {
                return `${slot.slotIndex}_${slot.equippedWeapon.name}_${slot.equippedWeapon.level || 1}`;
            }
        }).join('|');
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
            cursor: ${slot.isEmpty ? 'default' : 'pointer'};
            transition: border-color 0.2s, background-color 0.2s;
        `;
        
        // Add click functionality for equipped weapons
        if (!slot.isEmpty) {
            debug('COMBAT', `WeaponHUD: Adding click listener to slot ${slot.slotIndex + 1}`);
            
            slotElement.addEventListener('click', (event) => {
                debug('COMBAT', `WeaponHUD: Click event fired for slot ${slot.slotIndex + 1}`);
                event.preventDefault();
                event.stopPropagation();
                this.onWeaponSlotClick(slot.slotIndex);
            });
            
            // Add hover effect for equipped weapons
            slotElement.addEventListener('mouseenter', () => {
                if (!isActive) {
                    slotElement.style.borderColor = '#00aa00';
                    slotElement.style.backgroundColor = 'rgba(0, 255, 0, 0.1)';
                }
            });
            
            slotElement.addEventListener('mouseleave', () => {
                if (!isActive) {
                    slotElement.style.borderColor = '#666666';
                    slotElement.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
                }
            });
        }
        
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
            // Weapon icon/name with full name on hover
            const weaponName = document.createElement('div');
            weaponName.className = 'weapon-name-display';
            weaponName.textContent = this.getWeaponAbbreviation(slot.equippedWeapon.name);
            weaponName.title = slot.equippedWeapon.name; // Tooltip with full name
            weaponName.style.cssText = `
                font-size: 10px;
                font-weight: bold;
                text-align: center;
                color: ${isActive ? '#00ff00' : '#ffffff'};
                pointer-events: none;
            `;
            slotElement.appendChild(weaponName);
            
            // Add weapon type indicator  
            const typeIndicator = document.createElement('div');
            typeIndicator.className = 'weapon-type-indicator';
            
            let indicatorColor, indicatorTitle;
            
            // Get weapon-specific color that matches projectile/effect colors
            const weaponColors = this.getWeaponColors(slot.equippedWeapon.name);
            indicatorColor = weaponColors.hex;
            indicatorTitle = weaponColors.title;
            
            typeIndicator.style.cssText = `
                position: absolute;
                bottom: 2px;
                right: 2px;
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background-color: ${indicatorColor};
                border: 1px solid rgba(255,255,255,0.3);
            `;
            typeIndicator.title = indicatorTitle;
            slotElement.appendChild(typeIndicator);
            
            // Add weapon range display for active weapon
            if (isActive) {
                const rangeDisplay = document.createElement('div');
                rangeDisplay.className = 'weapon-range-display';
                const rangeKm = (slot.equippedWeapon.range / 1000).toFixed(1); // Convert meters to km for display
                rangeDisplay.textContent = `${rangeKm}km`;
                rangeDisplay.style.cssText = `
                    position: absolute;
                    bottom: -16px;
                    left: 50%;
                    transform: translateX(-50%);
                    font-size: 12px;
                    color: #00ff00;
                    font-weight: bold;
                    text-align: center;
                    white-space: nowrap;
                    text-shadow: 0 0 2px #00ff00;
                    pointer-events: none;
                `;
                slotElement.appendChild(rangeDisplay);
            }
            
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
            'Photon Torpedo': 'TOR',
            'Heavy Torpedo': 'HVY',
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
            
            // Handle weapon range display
            const existingRangeDisplay = slot.querySelector('.weapon-range-display');
            if (isActive && weaponNameElement && weaponNameElement.textContent !== 'EMPTY') {
                // This is the active weapon and it's equipped - add/update range display
                if (!existingRangeDisplay) {
                    // Create new range display
                    const rangeDisplay = document.createElement('div');
                    rangeDisplay.className = 'weapon-range-display';
                    
                    // Get weapon data from the weapon system
                    const ship = this.getShip();
                    if (ship && ship.weaponSystem && ship.weaponSystem.weaponSlots[i] && !ship.weaponSystem.weaponSlots[i].isEmpty) {
                        const weapon = ship.weaponSystem.weaponSlots[i].equippedWeapon;
                        const rangeKm = (weapon.range / 1000).toFixed(1);
                        rangeDisplay.textContent = `${rangeKm}km`;
                    } else {
                        rangeDisplay.textContent = '0.0km';
                    }
                    
                    rangeDisplay.style.cssText = `
                        position: absolute;
                        bottom: -16px;
                        left: 50%;
                        transform: translateX(-50%);
                        font-size: 12px;
                        color: #00ff00;
                        font-weight: bold;
                        text-align: center;
                        white-space: nowrap;
                        text-shadow: 0 0 2px #00ff00;
                        pointer-events: none;
                    `;
                    slot.appendChild(rangeDisplay);
                }
            } else if (existingRangeDisplay) {
                // This is not the active weapon or it's empty - remove range display
                existingRangeDisplay.remove();
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
        const rangeKm = weaponRange; // Already in km
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
     * Show unified message with priority system
     * @param {string} text Message text
     * @param {number} duration Duration in milliseconds (default: 3000)
     * @param {number} priority Priority level (higher = more important, default: 1)
     * @param {string} color Text color (default: #ffffff)
     * @param {string} borderColor Border color (default: #666)
     * @param {string} backgroundColor Background color (default: rgba(0, 0, 0, 0.85))
     */
    showUnifiedMessage(text, duration = 3000, priority = 1, color = '#ffffff', borderColor = '#666', backgroundColor = 'rgba(0, 0, 0, 0.85)') {
        if (!this.unifiedDisplay) return;

        // Check if current message has higher priority
        if (this.currentMessagePriority > priority) {
debug('UI', `🎯 MESSAGE PRIORITY: Skipping lower priority message (${priority} vs ${this.currentMessagePriority})`);
            return;
        }

        // Clear existing timeout
        if (this.displayTimeout) {
            clearTimeout(this.displayTimeout);
            this.displayTimeout = null;
        }

        // Update current priority
        this.currentMessagePriority = priority;

        // Apply styling and content
        this.unifiedDisplay.textContent = text;
        this.unifiedDisplay.style.color = color;
        this.unifiedDisplay.style.borderColor = borderColor;
        this.unifiedDisplay.style.backgroundColor = backgroundColor;
        this.unifiedDisplay.style.display = 'block';
        this.unifiedDisplay.style.opacity = '1';

debug('UI', `🎯 UNIFIED DISPLAY: "${text}" (priority: ${priority}, duration: ${duration}ms)`);

        // Hide after duration and reset priority
        this.displayTimeout = setTimeout(() => {
            this.unifiedDisplay.style.opacity = '0';
            setTimeout(() => {
                this.unifiedDisplay.style.display = 'none';
                this.currentMessagePriority = 0; // Reset priority when hidden
            }, 200); // Fade out duration
        }, duration);
    }

    /**
     * Show general message (legacy compatibility)
     * @param {string} message Message to display
     * @param {number} duration Duration in milliseconds (default: 3000)
     */
    showMessage(message, duration = 3000) {
        this.showUnifiedMessage(message, duration, 1, '#00ff00', '#00aa00', 'rgba(0, 20, 0, 0.8)');
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
     * Show weapon feedback (hit/miss/splash)
     * @param {string} type - 'hit', 'miss', 'splash', or 'out-of-range'
     * @param {string} weaponName - Name of the weapon
     * @param {number} damage - Damage dealt (for hits)
     * @param {number} distance - Distance to target
     */
    showWeaponFeedback(type, weaponName, damage = 0, distance = 0) {
        let text = '';
        let color = '#ffffff';
        let borderColor = '#666';
        let priority = 2; // Default priority for weapon feedback
        let duration = 4000; // Default duration

        switch (type) {
            case 'hit':
                text = `HIT! ${damage} DMG`;
                color = '#00ff00';
                borderColor = '#00aa00';
                priority = 3; // High priority for hits
                break;
            case 'splash':
                text = `SPLASH! ${damage} DMG`;
                color = '#ff8800';
                borderColor = '#cc6600';
                priority = 3; // High priority for splash hits
                break;
            case 'miss':
                text = 'MISS';
                color = '#ff4444';
                borderColor = '#cc3333';
                priority = 2; // Medium priority for misses
                duration = 2000; // Shorter duration for misses
                break;
            case 'out-of-range':
                // Distance might be in meters or km depending on source
                let distanceKm;
                if (distance > 1000) {
                    // Likely in meters, convert to km
                    distanceKm = (distance / 1000).toFixed(1);
                } else {
                    // Likely already in km
                    distanceKm = distance.toFixed(1);
                }
                text = `OUT OF RANGE\n${distanceKm}km`;
                color = '#ffff00';
                borderColor = '#cccc00';
                priority = 2;
                break;
            case 'subsystem-destroyed':
                text = weaponName; // weaponName contains the full message
                color = '#ff0000';
                borderColor = '#aa0000';
                priority = 5; // Very high priority for system destruction
                duration = 6000;
                break;
            case 'subsystem-critical':
                text = weaponName; // weaponName contains the full message
                color = '#ff8800';
                borderColor = '#cc6600';
                priority = 4; // High priority for critical systems
                duration = 5000;
                break;
            case 'target-destroyed':
                text = weaponName; // weaponName contains the full message
                color = '#00ff88';
                borderColor = '#00aa66';
                priority = 6; // Highest priority for target destruction
                duration = 8000;
                break;
            case 'lucky-hit':
                text = weaponName; // weaponName contains the full message
                color = '#ffff44';
                borderColor = '#cccc22';
                priority = 4; // High priority for lucky hits
                duration = 5000;
                break;
            default:
                text = type.toUpperCase();
                priority = 1;
        }

        // Use unified display with appropriate priority
        this.showUnifiedMessage(text, duration, priority, color, borderColor);
    }

    /**
     * Show hit feedback
     * @param {string} weaponName - Name of the weapon
     * @param {number} damage - Damage dealt
     */
    showHitFeedback(weaponName, damage) {
        this.showWeaponFeedback('hit', weaponName, damage);
    }

    /**
     * Show splash damage feedback
     * @param {string} weaponName - Name of the weapon
     * @param {number} damage - Total splash damage dealt
     */
    showSplashFeedback(weaponName, damage) {
        this.showWeaponFeedback('splash', weaponName, damage);
    }

    /**
     * Show miss feedback
     * @param {string} weaponName - Name of the weapon
     */
    showMissFeedback(weaponName) {
        this.showWeaponFeedback('miss', weaponName);
    }

    /**
     * Show out of range feedback with distance
     * @param {string} weaponName - Name of the weapon
     * @param {number} distance - Distance to target
     * @param {number} maxRange - Maximum weapon range
     */
    showOutOfRangeFeedback(weaponName, distance, maxRange) {
        this.showWeaponFeedback('out-of-range', weaponName, 0, distance);
    }

    /**
     * Show damage feedback (called by weapon systems)
     * @param {string} weaponName - Name of the weapon
     * @param {number} damage - Damage dealt
     * @param {string} targetName - Name of the target
     */
    showDamageFeedback(weaponName, damage, targetName) {
        // Determine if this is splash damage by checking the actual weapon properties
        let isSplashWeapon = false;
        
        // Try to get the actual weapon data to check blast radius
        if (window.starfieldManager?.viewManager?.ship?.weaponSystem) {
            const weaponSystem = window.starfieldManager.viewManager.ship.weaponSystem;
            const activeWeapon = weaponSystem.getActiveWeapon();
            if (activeWeapon?.equippedWeapon && activeWeapon.equippedWeapon.name === weaponName) {
                isSplashWeapon = activeWeapon.equippedWeapon.blastRadius > 0;
debug('COMBAT', `🎯 FEEDBACK: ${weaponName} blastRadius: ${activeWeapon.equippedWeapon.blastRadius}, isSplash: ${isSplashWeapon}`);
            }
        }
        
        // Fallback to name checking only for true splash weapons (torpedoes with blast radius)
        if (!isSplashWeapon && weaponName.toLowerCase().includes('torpedo')) {
            isSplashWeapon = true; // Torpedoes are typically splash
        }
        
        // Use the unified feedback system
        if (isSplashWeapon) {
            this.showWeaponFeedback('splash', weaponName, damage);
        } else {
            this.showWeaponFeedback('hit', weaponName, damage);
        }
    }
    
    /**
     * Handle weapon slot click
     * @param {number} slotIndex - Index of the clicked weapon slot
     */
    onWeaponSlotClick(slotIndex) {
        debug('COMBAT', `Weapon slot ${slotIndex + 1} clicked`);
        
        // Get the ship and weapon system
        const ship = this.getShip();
        
        if (!ship) {
            debug('COMBAT', 'No ship available for slot click');
            this.showMessage('Ship not available', 2000);
            return;
        }
        
        if (!ship.weaponSystem) {
            debug('COMBAT', 'No weapon system available for slot click');
            this.showMessage('Weapon system not available', 2000);
            return;
        }
        
        debug('COMBAT', `Attempting to select weapon slot ${slotIndex + 1}`);
        
        // Attempt to select the weapon slot
        if (ship.weaponSystem.selectWeaponSlot(slotIndex)) {
            debug('COMBAT', `Successfully selected weapon slot ${slotIndex + 1} via click`);
            
            // Play command sound on successful weapon switch
            if (ship.starfieldManager && ship.starfieldManager.playCommandSound) {
                ship.starfieldManager.playCommandSound();
            } else if (window.starfieldManager && window.starfieldManager.playCommandSound) {
                window.starfieldManager.playCommandSound();
            }
        } else {
            debug('COMBAT', `Failed to select weapon slot ${slotIndex + 1}`);
            // The weapon system will show its own error message
        }
    }
    
    /**
     * Get the current ship instance
     * @returns {Object|null} Ship instance or null
     */
    getShip() {
        // Try method 1: StarfieldManager -> ViewManager -> getShip()
        if (window.starfieldManager && window.starfieldManager.viewManager) {
            const ship = window.starfieldManager.viewManager.getShip();
            if (ship && ship.weaponSystem) {
                return ship;
            }
        }
        
        // Try method 2: StarfieldManager -> ViewManager -> ship property
        if (window.starfieldManager && window.starfieldManager.viewManager && window.starfieldManager.viewManager.ship) {
            const ship = window.starfieldManager.viewManager.ship;
            if (ship && ship.weaponSystem) {
                return ship;
            }
        }
        
        // Try method 3: StarfieldManager -> ship property (direct access)
        if (window.starfieldManager && window.starfieldManager.ship) {
            const ship = window.starfieldManager.ship;
            if (ship && ship.weaponSystem) {
                return ship;
            }
        }
        
        // Try method 4: Global ship variable
        if (window.ship && window.ship.weaponSystem) {
            return window.ship;
        }
        
        return null;
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
        if (this.unifiedDisplay) {
            this.unifiedDisplay.remove();
        }
        
        // Clear timeouts
        if (this.displayTimeout) {
            clearTimeout(this.displayTimeout);
        }
        
        this.cooldownBars = [];
        
debug('COMBAT', 'WeaponHUD disposed');
    }
} 