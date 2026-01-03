/**
 * WeaponHUDManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles WeaponHUD creation, connection, and retry logic.
 *
 * Features:
 * - Creates and initializes WeaponHUD component
 * - Connects WeaponHUD to ship's WeaponSystemCore
 * - Manages retry mechanism for connection during initialization
 * - Provides weapon slot display updates
 */

import { debug } from '../debug.js';

export class WeaponHUDManager {
    /**
     * Create a WeaponHUDManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
        this.weaponHUD = null;
        this.weaponHUDConnected = false;
        this.weaponHUDRetryCount = 0;
        this.maxWeaponHUDRetries = 60; // 30 seconds at 500ms intervals
        this.weaponHUDRetryInterval = null;
    }

    /**
     * Create and initialize the WeaponHUD
     */
    createWeaponHUD() {
        // Import and initialize WeaponHUD
        debug('COMBAT', '🔫 WeaponHUDManager: Starting WeaponHUD creation...');
        import('../ui/WeaponHUD.js').then(({ WeaponHUD }) => {
            debug('COMBAT', '🔫 WeaponHUDManager: WeaponHUD module loaded, creating instance...');
            this.weaponHUD = new WeaponHUD(document.body);

            // Also store reference on StarfieldManager for backwards compatibility
            this.sfm.weaponHUD = this.weaponHUD;

            // Initialize weapon slots display
            this.weaponHUD.initializeWeaponSlots(4);
            debug('COMBAT', '🔫 WeaponHUDManager: WeaponHUD created and initialized');
            debug('COMBAT', `🔫 WeaponHUD elements created: weaponSlotsDisplay=${!!this.weaponHUD.weaponSlotsDisplay}`);

            // Connect to weapon system if available
            this.connectWeaponHUDToSystem();

            // Set up retry mechanism for connection
            this.setupWeaponHUDConnectionRetry();

        }).catch(error => {
            debug('P1', `❌ WeaponHUDManager: Failed to initialize WeaponHUD: ${error}`);
        });
    }

    /**
     * Set up retry mechanism for WeaponHUD connection
     */
    setupWeaponHUDConnectionRetry() {
        // Retry connection every 500ms for up to 30 seconds
        this.weaponHUDRetryCount = 0;

        this.weaponHUDRetryInterval = setInterval(() => {
            this.weaponHUDRetryCount++;

            // Try to connect
            this.connectWeaponHUDToSystem();

            // If connected or max retries reached, stop trying
            if (this.weaponHUDConnected || this.weaponHUDRetryCount >= this.maxWeaponHUDRetries) {
                clearInterval(this.weaponHUDRetryInterval);
                this.weaponHUDRetryInterval = null;

                if (this.weaponHUDConnected) {
                    debug('UTILITY', `WeaponHUD connected after ${this.weaponHUDRetryCount} attempts`);
                } else {
                    debug('UTILITY', `WeaponHUD connection will retry later (${this.maxWeaponHUDRetries} attempts completed)`);
                }
            }
        }, 500);
    }

    /**
     * Connect WeaponHUD to WeaponSystemCore
     */
    connectWeaponHUDToSystem() {
        const ship = this.sfm.viewManager?.getShip();

        debug('COMBAT', `🔫 connectWeaponHUDToSystem: ship=${!!ship}, weaponSystem=${!!ship?.weaponSystem}, weaponHUD=${!!this.weaponHUD}`);

        if (ship && ship.weaponSystem && this.weaponHUD) {
            // Set HUD reference in weapon system
            ship.weaponSystem.setWeaponHUD(this.weaponHUD);

            // Update weapon slots display
            this.weaponHUD.updateWeaponSlotsDisplay(ship.weaponSystem.weaponSlots, ship.weaponSystem.activeSlotIndex);

            this.weaponHUDConnected = true;
            // Also update StarfieldManager's flag for backwards compatibility
            this.sfm.weaponHUDConnected = true;

            debug('COMBAT', '🔫 WeaponHUD successfully connected to WeaponSystemCore');
            debug('COMBAT', `🔫 Weapon slots: ${ship.weaponSystem.weaponSlots?.length}, active: ${ship.weaponSystem.activeSlotIndex}`);
        } else {
            this.weaponHUDConnected = false;
            this.sfm.weaponHUDConnected = false;
            debug('COMBAT', `🔫 WeaponHUD connection failed: ship=${!!ship}, weaponSystem=${!!ship?.weaponSystem}, weaponHUD=${!!this.weaponHUD}`);
        }
    }

    /**
     * Get the WeaponHUD instance
     * @returns {Object|null} WeaponHUD instance
     */
    getWeaponHUD() {
        return this.weaponHUD;
    }

    /**
     * Check if WeaponHUD is connected
     * @returns {boolean} Connection status
     */
    isConnected() {
        return this.weaponHUDConnected;
    }

    /**
     * Update weapon system during game loop
     * Handles WeaponHUD connection retry, autofire, and display updates
     * @param {number} deltaTime - Time since last frame
     */
    updateWeaponSystem(deltaTime) {
        const ship = this.sfm.viewManager?.getShip();
        if (!ship || !ship.weaponSystem) return;

        // Ensure WeaponHUD is connected (retry if needed)
        if (this.weaponHUD && !this.weaponHUDConnected) {
            // Throttle connection attempts to reduce console spam
            const now = Date.now();
            if (!this.lastWeaponHUDConnectionAttempt || (now - this.lastWeaponHUDConnectionAttempt) > 5000) {
                debug('COMBAT', 'Attempting WeaponHUD connection during game loop...');
                this.connectWeaponHUDToSystem();
                this.lastWeaponHUDConnectionAttempt = now;
            }
        }

        ship.weaponSystem.updateAutofire(deltaTime);

        // Update weapon HUD if available
        if (this.weaponHUD && this.weaponHUDConnected) {
            // Update the weapon slots display with current weapon system state
            this.weaponHUD.updateWeaponSlotsDisplay(ship.weaponSystem.weaponSlots, ship.weaponSystem.activeSlotIndex);

            // CRITICAL: Update cooldown displays (was missing!)
            this.weaponHUD.updateCooldownDisplay(ship.weaponSystem.weaponSlots);

            // Ensure the highlighting is correct
            this.weaponHUD.updateActiveWeaponHighlight(ship.weaponSystem.activeSlotIndex);
        }

        // Update crosshair display to reflect active weapon range and target status
        if (this.sfm.viewManager && typeof this.sfm.viewManager.updateCrosshairDisplay === 'function') {
            this.sfm.viewManager.updateCrosshairDisplay();
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        if (this.weaponHUDRetryInterval) {
            clearInterval(this.weaponHUDRetryInterval);
            this.weaponHUDRetryInterval = null;
        }
        this.weaponHUD = null;
        this.sfm = null;
    }
}
