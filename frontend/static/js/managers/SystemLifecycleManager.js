/**
 * SystemLifecycleManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles ship system lifecycle operations during docking, undocking, and launch.
 *
 * Features:
 * - Shuts down all ship systems when docking to conserve energy
 * - Restores ship systems when undocking
 * - Initializes ship systems for launch with proper state synchronization
 * - Manages weapon system initialization and HUD integration
 * - Updates weapon selection UI to reflect current loadout
 */

import { debug } from '../debug.js';

export class SystemLifecycleManager {
    /**
     * Create a SystemLifecycleManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
    }

    /**
     * Power down all ship systems when docking to conserve energy
     */
    shutdownAllSystems() {
        debug('UTILITY', '🛑 Shutting down all ship systems for docking');

        const ship = this.sfm.viewManager?.getShip();
        if (!ship) {
            debug('P1', 'No ship available for system shutdown');
            return;
        }

        // Simply power down all systems without saving state
        for (const [systemName, system] of ship.systems) {
            try {
                if (systemName === 'shields' && system.isShieldsUp) {
                    system.deactivateShields();
                    debug('COMBAT', `  🛡️ Shields deactivated`);
                } else if (systemName === 'long_range_scanner' && system.isScanning) {
                    system.stopScan();
                    debug('UTILITY', `  📡 Scanner stopped`);
                } else if (systemName === 'target_computer' && system.isTargeting) {
                    system.deactivate();
                    debug('TARGETING', `  🎯 Targeting computer deactivated`);
                } else if (systemName === 'subspace_radio') {
                    if (system.isRadioActive) {
                        system.deactivateRadio();
                    }
                    if (system.isChartActive) {
                        system.deactivateChart();
                    }
                    debug('UTILITY', `  📻 Subspace radio deactivated`);
                } else if (systemName === 'impulse_engines') {
                    system.setImpulseSpeed(0);
                    system.setMovingForward(false);
                    debug('UTILITY', `  🚀 Impulse engines stopped`);
                } else if (system.isActive) {
                    system.deactivate();
                    debug('UTILITY', `  ⚡ ${systemName} deactivated`);
                }
            } catch (error) {
                debug('P1', `Failed to shutdown system ${systemName}: ${error}`);
            }
        }

        debug('UTILITY', '🛑 All ship systems shutdown complete');
    }

    /**
     * Restore all ship systems to their pre-docking state when undocking
     */
    async restoreAllSystems() {
        debug('UTILITY', 'Restoring all ship systems after undocking');

        // Use this.sfm.ship instead of getting from viewManager since it's already set in constructor
        if (!this.sfm.ship) {
            debug('P1', 'No ship available for system restoration');
            return;
        }

        // Check if ship has equipment property
        if (!this.sfm.ship.equipment) {
            debug('P1', 'Ship does not have equipment property - skipping system restoration');
            return;
        }

        // Restore power management
        if (this.sfm.ship.equipment.powerManagement) {
            this.sfm.powerManagementEnabled = true;
            debug('UTILITY', '⚡ Power management restored and enabled');
        }

        // Restore navigation computer
        if (this.sfm.ship.equipment.navigationComputer) {
            this.sfm.navigationComputerEnabled = true;
        }

        // Target computer should remain INACTIVE after launch - user must manually enable it
        if (this.sfm.ship.equipment.targetComputer) {
            this.sfm.targetComputerEnabled = false;  // Start inactive
            debug('TARGETING', 'Target computer available but inactive - manual activation required');
            this.sfm.updateTargetDisplay();
        }

        // Restore defensive systems
        if (this.sfm.ship.equipment.defensiveSystems) {
            this.sfm.defensiveSystemsEnabled = true;
            debug('UTILITY', 'Defensive systems restored and enabled');
        }

        // Restore ship status display
        if (this.sfm.ship.equipment.shipStatusDisplay) {
            this.sfm.shipStatusDisplayEnabled = true;
            debug('UI', '📊 Ship status display restored and enabled');
        }
    }

    /**
     * Initialize all ship systems for launch - fresh setup regardless of previous state
     * This is the unified method that should be used for ALL ship initialization scenarios
     */
    async initializeShipSystems() {
        debug('UI', '🚀 LAUNCH: initializeShipSystems() called');
        debug('UTILITY', 'Initializing ship systems for launch');

        const ship = this.sfm.viewManager?.getShip();
        if (!ship) {
            debug('P1', 'No ship available for system initialization');
            return;
        }

        // CRITICAL: Force refresh ship systems from current card configuration
        // This ensures that any equipment changes made while docked are properly applied
        if (ship.cardSystemIntegration) {
            debug('UI', '🔄 Refreshing ship systems from current card configuration...');
            try {
                // Force reload cards from the current ship configuration
                await ship.cardSystemIntegration.loadCards();

                // Recreate all systems from the refreshed card data
                // Check if systems already exist to prevent duplicates
                const existingSystemCount = ship.systems ? ship.systems.size : 0;
                debug('SYSTEM_FLOW', `🔍 StarfieldManager check: existing systems = ${existingSystemCount}`);

                if (existingSystemCount === 0) {
                    debug('SYSTEM_FLOW', '🚀 StarfieldManager creating systems from cards');
                    await ship.cardSystemIntegration.createSystemsFromCards();
                } else {
                    debug('SYSTEM_FLOW', '⏭️ StarfieldManager skipping system creation - systems already exist');
                }

                // Re-initialize cargo holds from updated cards
                if (ship.cargoHoldManager) {
                    ship.cargoHoldManager.initializeFromCards();
                }

                debug('UI', '✅ Ship systems refreshed from cards - equipment changes applied');

                // Force refresh Operations HUD to reflect the updated ship systems
                // Use forceRefresh to reload systems regardless of visibility
                if (this.sfm.damageControlHUD) {
                    debug('UI', '🔄 About to force refresh Operations HUD...');
                    await this.sfm.damageControlHUD.forceRefresh();
                    debug('UI', '✅ Operations HUD force refresh completed');
                } else {
                    debug('UI', '❌ No damageControlHUD available for refresh');
                }
            } catch (error) {
                debug('P1', `❌ Failed to refresh ship systems from cards: ${error}`);
            }
        }

        // Initialize power management
        if (ship.equipment?.powerManagement) {
            this.sfm.powerManagementEnabled = true;
            debug('UTILITY', '  ⚡ Power management initialized and enabled');
        }

        // Initialize navigation computer
        if (ship.equipment?.navigationComputer) {
            this.sfm.navigationComputerEnabled = true;
        }

        // CRITICAL: Properly initialize targeting computer with complete state reset
        const targetComputerSystem = ship.getSystem('target_computer');
        const hasTargetComputerCards = ship.hasSystemCardsSync('target_computer');

        if (targetComputerSystem && hasTargetComputerCards) {
            // STEP 1: Clear any previous target state completely
            this.sfm.currentTarget = null;
            this.sfm.targetedObject = null;
            this.sfm.lastTargetedObjectId = null;

            // STEP 2: Clear targeting display and outlines
            this.sfm.clearTargetOutline();
            if (this.sfm.updateTargetingDisplay) {
                this.sfm.updateTargetingDisplay();
            }

            // STEP 3: Reset target cycling state
            this.sfm.targetIndex = -1;
            this.sfm.validTargets = [];
            this.sfm.lastTargetCycleTime = 0;

            // STEP 4: Synchronize StarfieldManager state with system state
            // The system starts inactive after launch (requires manual activation)
            this.sfm.targetComputerEnabled = targetComputerSystem.isActive;

            // STEP 5: If system was somehow left active, ensure it works properly
            if (targetComputerSystem.isActive) {
                // Refresh targeting computer functionality
                if (targetComputerSystem.refreshTargeting) {
                    targetComputerSystem.refreshTargeting();
                }
                debug('TARGETING', '  🎯 Targeting computer initialized (ACTIVE) - state synchronized, targets cleared');
            } else {
                debug('TARGETING', '  🎯 Targeting computer initialized (INACTIVE) - ready for activation');
            }

            debug('TARGETING', `  🎯 Target state cleared: currentTarget=${this.sfm.currentTarget}, targetIndex=${this.sfm.targetIndex}`);
        } else {
            this.sfm.targetComputerEnabled = false;
            // Still clear target state even without targeting computer
            this.sfm.currentTarget = null;
            this.sfm.targetedObject = null;
            this.sfm.clearTargetOutline();
            debug('TARGETING', '  🎯 No targeting computer available - target state cleared');
        }

        // Initialize shields
        const shieldSystem = ship.getSystem('shields');
        if (shieldSystem) {
            this.sfm.shieldsEnabled = shieldSystem.isActive;
            debug('COMBAT', `  🛡️ Shields initialized: ${this.sfm.shieldsEnabled ? 'enabled' : 'disabled'}`);
        }

        // Initialize scanning systems
        const scannerSystem = ship.getSystem('scanners');
        if (scannerSystem) {
            this.sfm.scannersEnabled = scannerSystem.isActive;
            debug('UTILITY', `  📡 Scanners initialized: ${this.sfm.scannersEnabled ? 'enabled' : 'disabled'}`);
        }

        // Initialize weapon systems using the unified approach
        await this.initializeWeaponSystems();

        // Initialize engine systems
        const engineSystem = ship.getSystem('impulse_engines');
        if (engineSystem) {
            this.sfm.enginesEnabled = engineSystem.isActive;
            debug('UTILITY', `  🚀 Engines initialized: ${this.sfm.enginesEnabled ? 'enabled' : 'disabled'}`);
        }

        // Initialize communication systems
        const radioSystem = ship.getSystem('subspace_radio');
        if (radioSystem) {
            this.sfm.radioEnabled = radioSystem.isActive;
            debug('UTILITY', `  📻 Radio initialized: ${this.sfm.radioEnabled ? 'enabled' : 'disabled'}`);
        }

        debug('UTILITY', '✅ Ship systems initialization complete - all states synchronized');
    }

    /**
     * Initialize weapon systems and ensure proper HUD connection
     * Critical for ensuring weapons are properly registered with the HUD
     */
    async initializeWeaponSystems() {
        debug('COMBAT', '  🔫 Initializing weapon systems and HUD integration...');

        try {
            const ship = this.sfm.viewManager?.getShip();
            if (!ship) {
                debug('COMBAT', '    🔍 Ship initializing - weapon system setup deferred');
                return;
            }

            // CRITICAL: Reinitialize the weapon system using WeaponSyncManager
            // This ensures weapons are properly loaded from the current card configuration
            if (ship.weaponSyncManager) {
                debug('COMBAT', '    🔄 Reinitializing weapon system from current card configuration...');

                // Force a complete weapon system refresh
                ship.weaponSystem = await ship.weaponSyncManager.initializeWeapons();

                debug('COMBAT', '    ✅ Weapon system reinitialized with current equipment');
            } else if (ship.initializeWeaponSystem) {
                // Fallback: use ship's built-in weapon system initialization
                await ship.initializeWeaponSystem();
                debug('COMBAT', '    ✅ Weapon system initialized using fallback method');
            }

            // Ensure weapon effects manager is initialized
            this.sfm.ensureWeaponEffectsManager();

            // Connect weapon HUD to ship systems
            this.sfm.connectWeaponHUDToSystem();

            // Update weapon selection UI to reflect current ship loadout
            await this.updateWeaponSelectionUI();

            debug('COMBAT', '  🔫 Weapon systems initialization complete');
        } catch (error) {
            debug('P1', `  ❌ Failed to initialize weapon systems: ${error}`);
        }
    }

    /**
     * Update weapon selection UI to reflect current ship loadout
     * Ensures weapon HUD shows correct weapon counts and types
     */
    async updateWeaponSelectionUI() {
        debug('COMBAT', '    🎯 Updating weapon selection UI...');

        const ship = this.sfm.viewManager?.getShip();
        if (!ship) {
            return;
        }

        const weaponsSystem = ship.getSystem('weapons');
        if (!weaponsSystem) {
            return;
        }

        // Force refresh weapon inventory
        if (typeof weaponsSystem.refreshInventory === 'function') {
            weaponsSystem.refreshInventory();
        }

        // Update weapon HUD display properly
        if (this.sfm.weaponHUD && ship.weaponSystem) {
            // Update the weapon slots display with current weapon system state
            this.sfm.weaponHUD.updateWeaponSlotsDisplay(ship.weaponSystem.weaponSlots, ship.weaponSystem.activeSlotIndex);

            // Ensure the highlighting is correct
            this.sfm.weaponHUD.updateActiveWeaponHighlight(ship.weaponSystem.activeSlotIndex);
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.sfm = null;
    }
}
