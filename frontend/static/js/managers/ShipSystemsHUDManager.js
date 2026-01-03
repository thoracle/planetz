/**
 * ShipSystemsHUDManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles the ship systems HUD with integrated damage control display.
 *
 * Features:
 * - Creates and manages ship systems HUD
 * - Displays individual weapon systems
 * - Handles manual repair system with progress tracking
 * - Creates repair buttons with hover effects
 * - Formats system names for display
 */

import { debug } from '../debug.js';
import { getSystemDisplayName } from '../ship/System.js';

export class ShipSystemsHUDManager {
    /**
     * Create a ShipSystemsHUDManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;

        // HUD elements
        this.shipSystemsHUD = null;
        this.damageControlCloseButton = null;
        this.systemsList = null;
    }

    /**
     * Create ship systems HUD with integrated damage control
     */
    createShipSystemsHUD() {
        // Create ship systems status container
        this.shipSystemsHUD = document.createElement('div');
        this.shipSystemsHUD.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #00ff41;
            font-family: "Courier New", monospace;
            font-size: 16px;
            pointer-events: auto;
            z-index: 1000;
            border: 2px solid #00ff41;
            padding: 12px 16px;
            background: rgba(0, 0, 0, 0.85);
            width: 540px;
            max-height: 70vh;
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: #00ff41 #333;
        `;

        // Create the close button
        this.damageControlCloseButton = document.createElement('div');
        this.damageControlCloseButton.innerHTML = 'X';
        this.damageControlCloseButton.style.cssText = `
            position: absolute;
            top: 2px;
            right: 10px;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #00ff41;
            border: 1px solid #00ff41;
            cursor: pointer;
            transition: all 0.3s ease;
            background: rgba(0, 20, 0, 0.5);
            z-index: 1;
            pointer-events: auto;
        `;
        this.shipSystemsHUD.appendChild(this.damageControlCloseButton);

        // Add close button hover effect and click handler (with abort signal for cleanup)
        this.damageControlCloseButton.addEventListener('mouseenter', () => {
            this.damageControlCloseButton.style.background = '#00ff41';
            this.damageControlCloseButton.style.color = '#000';
        }, { signal: this.sfm._abortController.signal });

        this.damageControlCloseButton.addEventListener('mouseleave', () => {
            this.damageControlCloseButton.style.background = 'rgba(0, 20, 0, 0.5)';
            this.damageControlCloseButton.style.color = '#00ff41';
        }, { signal: this.sfm._abortController.signal });

        this.damageControlCloseButton.addEventListener('click', () => {
            this.sfm.toggleDamageControl();
        }, { signal: this.sfm._abortController.signal });

        // Add custom scrollbar styles for webkit browsers
        const style = document.createElement('style');
        style.textContent = `
            .damage-control-hud::-webkit-scrollbar {
                width: 8px;
            }
            .damage-control-hud::-webkit-scrollbar-track {
                background: #333;
                border-radius: 4px;
            }
            .damage-control-hud::-webkit-scrollbar-thumb {
                background: #00ff41;
                border-radius: 4px;
            }
            .damage-control-hud::-webkit-scrollbar-thumb:hover {
                background: #00cc33;
            }
        `;
        document.head.appendChild(style);
        this.shipSystemsHUD.className = 'damage-control-hud';

        // Create systems list container
        this.systemsList = document.createElement('div');
        this.systemsList.style.cssText = `
            display: flex;
            flex-direction: column;
            gap: 6px;
            pointer-events: none;
        `;

        this.shipSystemsHUD.appendChild(this.systemsList);
        document.body.appendChild(this.shipSystemsHUD);

        // Expose elements for backwards compatibility
        this.sfm.shipSystemsHUD = this.shipSystemsHUD;
        this.sfm.damageControlCloseButton = this.damageControlCloseButton;
        this.sfm.systemsList = this.systemsList;

        // Update the systems display
        this.updateShipSystemsDisplay();
    }

    /**
     * Update ship systems display
     */
    updateShipSystemsDisplay() {
        // Get ship status using card filtering (only show systems for installed cards)
        const shipStatus = this.sfm.ship.getCardFilteredStatus();

        // Clear existing display
        this.systemsList.innerHTML = '';

        // Use the new DamageControlHUD system instead of deprecated method
        // The damage control display is now handled by the DamageControlHUD component
    }

    /**
     * Legacy damage control display - DEPRECATED
     * This method is kept for compatibility but the new DamageControlHUD is preferred
     */
    updateDamageControlDisplay(shipStatus) {
        // This method is now deprecated in favor of the new DamageControlHUD
        // Keeping it for backward compatibility but it's no longer used
        debug('P1', 'updateDamageControlDisplay is deprecated - using new DamageControlHUD');
        return;
    }

    /**
     * Update manual repair system progress
     */
    updateManualRepairSystem() {
        if (!this.sfm.manualRepairSystem || !this.sfm.manualRepairSystem.isRepairing) {
            return;
        }

        const elapsed = Date.now() - this.sfm.manualRepairSystem.repairStartTime;
        const progress = Math.min(elapsed / this.sfm.manualRepairSystem.repairDuration, 1.0);

        // Update progress bar
        if (this.sfm.manualRepairSystem.cooldownElement) {
            this.sfm.manualRepairSystem.cooldownElement.progress.style.width = `${progress * 100}%`;
        }

        // Check if repair is complete
        if (progress >= 1.0) {
            this.completeManualRepair();
        }
    }

    /**
     * Start manual repair for a system
     * @param {string} systemName - Name of the system to repair
     */
    startManualRepair(systemName) {
        debug('UTILITY', `startManualRepair called for: ${systemName}`);

        if (this.sfm.manualRepairSystem.isRepairing) {
            debug('UTILITY', `Manual repair system already repairing: ${this.sfm.manualRepairSystem.repairTarget}`);
            return;
        }

        // Check if system exists and is damaged
        const system = this.sfm.ship.getSystem(systemName);
        if (!system) {
            debug('P1', `🚫 REPAIR: System not found: ${systemName}`);
            return;
        }

        debug('UTILITY', `System found: ${systemName}, health: ${system.currentHealth}/${system.maxHealth}, healthPercentage: ${system.healthPercentage}`);

        if (system.healthPercentage >= 100) {
            debug('UTILITY', `System ${systemName} is already fully repaired (${system.healthPercentage}%)`);
            return;
        }

        debug('UTILITY', `Starting repair for ${systemName} (${system.healthPercentage}% health)`);

        this.sfm.manualRepairSystem.isRepairing = true;
        this.sfm.manualRepairSystem.repairTarget = systemName;
        this.sfm.manualRepairSystem.repairStartTime = Date.now();

        // Update cooldown display
        if (this.sfm.manualRepairSystem.cooldownElement) {
            this.sfm.manualRepairSystem.cooldownElement.label.textContent = `Repairing ${systemName}...`;
            this.sfm.manualRepairSystem.cooldownElement.progress.style.backgroundColor = '#00aa00';
        }

        // Disable all repair buttons without recreating the entire display
        this.updateRepairButtonStates();
    }

    /**
     * Complete manual repair
     */
    completeManualRepair() {
        if (!this.sfm.manualRepairSystem.isRepairing) {
            return;
        }

        const systemName = this.sfm.manualRepairSystem.repairTarget;
        const system = this.sfm.ship.getSystem(systemName);

        if (system) {
            // Repair the system to full health
            system.currentHealth = system.maxHealth;
        }

        // Reset repair system state
        this.sfm.manualRepairSystem.isRepairing = false;
        this.sfm.manualRepairSystem.repairTarget = null;
        this.sfm.manualRepairSystem.repairStartTime = 0;

        // Update cooldown display
        if (this.sfm.manualRepairSystem.cooldownElement) {
            this.sfm.manualRepairSystem.cooldownElement.label.textContent = 'Manual Repair System';
            this.sfm.manualRepairSystem.cooldownElement.progress.style.backgroundColor = '#555';
            this.sfm.manualRepairSystem.cooldownElement.progress.style.width = '0%';
        }

        // Re-enable repair buttons for damaged systems without recreating entire display
        this.updateRepairButtonStates();

        // Only refresh display if damage control is visible to show updated health
        if (this.sfm.damageControlVisible) {
            this.sfm.shouldUpdateDamageControl = true; // Mark for update instead of immediate update
        }
    }

    /**
     * Update repair button states (enable/disable based on repair status)
     */
    updateRepairButtonStates() {
        const repairButtons = this.systemsList.querySelectorAll('.repair-button');
        const isRepairing = this.sfm.manualRepairSystem.isRepairing;

        repairButtons.forEach(button => {
            button.disabled = isRepairing;
            button.style.opacity = isRepairing ? '0.5' : '1';
            button.style.cursor = isRepairing ? 'not-allowed' : 'pointer';
        });
    }

    /**
     * Display individual weapons from the weapons system
     * @param {Object} weaponsSystemData - The weapons system data
     * @param {Object} autoRepair - Auto-repair system
     * @returns {number} Number of weapons displayed
     */
    displayIndividualWeapons(weaponsSystemData, autoRepair) {
        let weaponsShown = 0;

        if (!this.sfm.ship.weaponSystem || !this.sfm.ship.weaponSystem.weaponSlots) {
            return this.displayRegularSystem('weapons', weaponsSystemData, autoRepair);
        }

        // Display each equipped weapon individually
        for (const weaponSlot of this.sfm.ship.weaponSystem.weaponSlots) {
            if (!weaponSlot.isEmpty && weaponSlot.equippedWeapon) {
                const weapon = weaponSlot.equippedWeapon;

                const weaponDiv = document.createElement('div');
                weaponDiv.setAttribute('data-system', `weapon_slot_${weaponSlot.slotIndex}`);
                weaponDiv.style.cssText = `
                    margin-bottom: 8px;
                    padding: 8px;
                    border: 1px solid #444;
                    border-radius: 4px;
                    background-color: rgba(0, 0, 0, 0.3);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                `;

                // Left side - weapon info
                const weaponInfo = document.createElement('div');
                weaponInfo.style.cssText = `
                    flex: 1;
                `;

                // Weapon name and status
                const nameDiv = document.createElement('div');
                nameDiv.style.cssText = `
                    font-weight: bold;
                    margin-bottom: 4px;
                `;

                const displayName = weapon.name || `Slot ${weaponSlot.slotIndex + 1} Weapon`;
                // Convert decimal health (0.0-1.0) to percentage (0-100)
                const healthPercentage = Math.round(weaponsSystemData.health * 100);
                const isOperational = weaponsSystemData.canBeActivated && !weaponSlot.isInCooldown();
                const isDamaged = healthPercentage < 100;
                const statusColor = isDamaged ? '#ff6b6b' :
                                   isOperational ? '#00ff41' : '#ffaa00';

                nameDiv.innerHTML = `<span style="color: ${statusColor}">${displayName}</span>`;
                weaponInfo.appendChild(nameDiv);

                // Weapon details
                const detailsDiv = document.createElement('div');
                detailsDiv.style.cssText = `
                    font-size: 12px;
                    color: #aaa;
                    margin-bottom: 4px;
                `;

                let statusText = isOperational ? 'OPERATIONAL' : 'OFFLINE';
                if (isDamaged) statusText = 'DAMAGED';

                detailsDiv.innerHTML = `
                    Status: <span style="color: ${statusColor}">${statusText}</span><br>
                    Health: ${healthPercentage}%<br>
                    Type: ${weapon.weaponType || 'Unknown'}
                `;
                weaponInfo.appendChild(detailsDiv);

                // Auto-repair progress if weapons system is damaged
                if (isDamaged && autoRepair.repairQueue.some(repair => repair.systemName === 'weapons')) {
                    const repair = autoRepair.repairQueue.find(repair => repair.systemName === 'weapons');
                    const progressDiv = document.createElement('div');
                    progressDiv.style.cssText = `
                        font-size: 11px;
                        color: #00aa00;
                        margin-top: 4px;
                    `;
                    const progress = Math.round((repair.timeElapsed / repair.repairTime) * 100);
                    progressDiv.textContent = `Auto-repair: ${progress}% complete`;
                    weaponInfo.appendChild(progressDiv);
                }

                weaponDiv.appendChild(weaponInfo);

                // Right side - repair button for individual weapon
                const weaponSlotName = `weapon_slot_${weaponSlot.slotIndex}`;
                const repairButton = this.createRepairButton(weaponSlotName, isDamaged, healthPercentage);
                weaponDiv.appendChild(repairButton);

                this.systemsList.appendChild(weaponDiv);
                weaponsShown++;
            }
        }

        // If no weapons are equipped, show the unified weapons system
        if (weaponsShown === 0) {
            return this.displayRegularSystem('weapons', weaponsSystemData, autoRepair);
        }

        return weaponsShown;
    }

    /**
     * Display a regular (non-weapons) system
     * @param {string} systemName - Name of the system
     * @param {Object} systemData - System data
     * @param {Object} autoRepair - Auto-repair system
     * @returns {number} Number of systems displayed (always 1)
     */
    displayRegularSystem(systemName, systemData, autoRepair) {
        const systemDiv = document.createElement('div');
        systemDiv.setAttribute('data-system', systemName);
        systemDiv.style.cssText = `
            margin-bottom: 8px;
            padding: 8px;
            border: 1px solid #444;
            border-radius: 4px;
            background-color: rgba(0, 0, 0, 0.3);
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        // Left side - system info
        const systemInfo = document.createElement('div');
        systemInfo.style.cssText = `
            flex: 1;
        `;

        // System name and status
        const nameDiv = document.createElement('div');
        nameDiv.style.cssText = `
            font-weight: bold;
            margin-bottom: 4px;
        `;

        const displayName = this.formatSystemName(systemName);
        // Convert decimal health (0.0-1.0) to percentage (0-100)
        const healthPercentage = Math.round(systemData.health * 100);
        const isDamaged = healthPercentage < 100;
        const isOperational = systemData.canBeActivated;
        const statusColor = isDamaged ? '#ff6b6b' :
                           isOperational ? '#00ff41' : '#ffaa00';

        nameDiv.innerHTML = `<span style="color: ${statusColor}">${displayName}</span>`;
        systemInfo.appendChild(nameDiv);

        // System details - properly format health as percentage
        const detailsDiv = document.createElement('div');
        detailsDiv.style.cssText = `
            font-size: 12px;
            color: #aaa;
            margin-bottom: 4px;
        `;

        let statusText = isOperational ? 'OPERATIONAL' : 'OFFLINE';
        if (isDamaged) statusText = 'DAMAGED';

        detailsDiv.innerHTML = `
            Status: <span style="color: ${statusColor}">${statusText}</span><br>
            Health: ${healthPercentage}%<br>
            Energy: ${systemData.energyConsumption || 0}/sec
        `;
        systemInfo.appendChild(detailsDiv);

        // Auto-repair progress if system is damaged
        if (isDamaged && autoRepair.repairQueue.some(repair => repair.systemName === systemName)) {
            const repair = autoRepair.repairQueue.find(repair => repair.systemName === systemName);
            const progressDiv = document.createElement('div');
            progressDiv.style.cssText = `
                font-size: 11px;
                color: #00aa00;
                margin-top: 4px;
            `;
            const progress = Math.round((repair.timeElapsed / repair.repairTime) * 100);
            progressDiv.textContent = `Auto-repair: ${progress}% complete`;
            systemInfo.appendChild(progressDiv);
        }

        systemDiv.appendChild(systemInfo);

        // Right side - repair button
        const repairButton = this.createRepairButton(systemName, isDamaged, healthPercentage);
        systemDiv.appendChild(repairButton);

        this.systemsList.appendChild(systemDiv);
        return 1;
    }

    /**
     * Create a repair button for a system
     * @param {string} systemName - Name of the system (or weapon_slot_X for individual weapons)
     * @param {boolean} isDamaged - Whether the system is damaged
     * @param {number} health - System health percentage
     * @returns {HTMLElement} Repair button element
     */
    createRepairButton(systemName, isDamaged, health) {
        const repairButton = document.createElement('button');
        repairButton.className = 'repair-button';
        repairButton.setAttribute('data-system-name', systemName); // Add this for event delegation
        repairButton.style.cssText = `
            padding: 6px 12px;
            border: 1px solid #555;
            border-radius: 3px;
            background-color: ${isDamaged ? '#2a4a2a' : '#4a4a4a'};
            color: ${isDamaged ? '#00ff41' : '#bbb'};
            font-size: 11px;
            cursor: ${isDamaged ? 'pointer' : 'default'};
            opacity: ${isDamaged ? '1' : '1'};
            transition: all 0.2s ease;
            min-width: 50px;
        `;

        repairButton.textContent = isDamaged ? 'REPAIR' : 'OK';
        repairButton.disabled = !isDamaged || this.sfm.manualRepairSystem?.isRepairing;

        // Only add hover effects for damaged, enabled buttons
        if (isDamaged && !repairButton.disabled) {
            repairButton.addEventListener('mouseenter', () => {
                repairButton.style.backgroundColor = '#3a5a3a';
                repairButton.style.borderColor = '#00ff41';
            });

            repairButton.addEventListener('mouseleave', () => {
                repairButton.style.backgroundColor = '#2a4a2a';
                repairButton.style.borderColor = '#555';
            });
        }

        // Update button state if repair system is active
        if (this.sfm.manualRepairSystem?.isRepairing) {
            repairButton.disabled = true;
            repairButton.style.opacity = '0.6';
            repairButton.style.cursor = 'not-allowed';
            repairButton.style.backgroundColor = '#333';
            repairButton.style.color = '#888';
        }

        return repairButton;
    }

    /**
     * Format system name for display
     * @param {string} systemName - Raw system name
     * @returns {string} Formatted display name
     */
    formatSystemName(systemName) {
        // Special handling for weapons - get the actual weapon type
        if (systemName === 'weapons' && this.sfm.ship) {
            const weaponsSystem = this.sfm.ship.getSystem('weapons');
            if (weaponsSystem && weaponsSystem.levelStats && weaponsSystem.level) {
                const levelStats = weaponsSystem.levelStats[weaponsSystem.level];
                if (levelStats && levelStats.weaponType) {
                    return levelStats.weaponType.toUpperCase();
                }
            }
        }

        // Use the standardized display name function
        return getSystemDisplayName(systemName).toUpperCase();
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        if (this.shipSystemsHUD && this.shipSystemsHUD.parentNode) {
            this.shipSystemsHUD.parentNode.removeChild(this.shipSystemsHUD);
        }
        this.shipSystemsHUD = null;
        this.damageControlCloseButton = null;
        this.systemsList = null;
    }
}
