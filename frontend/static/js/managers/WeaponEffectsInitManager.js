/**
 * WeaponEffectsInitManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles WeaponEffectsManager initialization, retry logic, and ship connection.
 *
 * Features:
 * - Lazy initialization of WeaponEffectsManager
 * - Retry logic with configurable limits
 * - Ship connection management
 * - Fallback mode handling
 */

import { debug } from '../debug.js';
import { WeaponEffectsManager } from '../ship/systems/WeaponEffectsManager.js';

export class WeaponEffectsInitManager {
    /**
     * Create a WeaponEffectsInitManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
        this.weaponEffectsManager = null;
        this.weaponEffectsInitialized = false;
        this.weaponEffectsInitFailed = false;
        this.weaponEffectsRetryCount = 0;
        this.maxWeaponEffectsRetries = 10;
    }

    /**
     * Initialize WeaponEffectsManager for weapon visual and audio effects (lazy initialization)
     * @returns {boolean} True if initialization succeeded
     */
    initializeWeaponEffectsManager() {
        try {
            // Check if already failed or exceeded retry limit
            if (this.weaponEffectsInitFailed || this.weaponEffectsRetryCount >= this.maxWeaponEffectsRetries) {
                return false;
            }

            // Check if THREE.js is available
            if (!this.sfm.THREE) {
                debug('P1', `WeaponEffectsManager initialization attempt ${this.weaponEffectsRetryCount + 1}/${this.maxWeaponEffectsRetries}: THREE.js not available yet`);
                this.weaponEffectsRetryCount++;
                if (this.weaponEffectsRetryCount >= this.maxWeaponEffectsRetries) {
                    debug('P1', 'WeaponEffectsManager initialization failed: THREE.js not available after maximum retries');
                    this.weaponEffectsInitFailed = true;
                }
                return false;
            }

            // Check if already initialized
            if (this.weaponEffectsInitialized) {
                return true;
            }

            // Import WeaponEffectsManager if not already available
            if (typeof WeaponEffectsManager === 'undefined') {
                debug('P1', 'WeaponEffectsManager class not available, deferring initialization');
                this.weaponEffectsRetryCount++;
                return false;
            }

            // Get AudioContext from the existing audio listener
            const audioContext = this.sfm.listener && this.sfm.listener.context ? this.sfm.listener.context : null;

            // Create WeaponEffectsManager instance
            this.weaponEffectsManager = new WeaponEffectsManager(
                this.sfm.scene,
                this.sfm.camera,
                audioContext
            );

            // Also store reference on StarfieldManager for backwards compatibility
            this.sfm.weaponEffectsManager = this.weaponEffectsManager;

            // Connect WeaponEffectsManager to the ship
            if (this.sfm.ship) {
                this.sfm.ship.weaponEffectsManager = this.weaponEffectsManager;

                // Initialize ship position if not already set
                if (!this.sfm.ship.position) {
                    this.sfm.ship.position = new this.sfm.THREE.Vector3(0, 0, 0);
                }

                debug('UTILITY', 'WeaponEffectsManager connected to ship');
            } else {
                debug('P1', 'Ship not available, WeaponEffectsManager connection deferred');
            }

            this.weaponEffectsInitialized = true;
            this.weaponEffectsRetryCount = 0; // Reset retry count on success
            debug('UTILITY', 'WeaponEffectsManager initialized successfully');
            return true;

        } catch (error) {
            debug('P1', `WeaponEffectsManager initialization failed (attempt ${this.weaponEffectsRetryCount + 1}): ${error}`);
            this.weaponEffectsRetryCount++;

            if (this.weaponEffectsRetryCount >= this.maxWeaponEffectsRetries) {
                debug('P1', 'WeaponEffectsManager initialization permanently failed after maximum retries');
                this.weaponEffectsInitFailed = true;
            }

            return false;
        }
    }

    /**
     * Ensure WeaponEffectsManager is initialized (lazy initialization with retry limits)
     * @returns {Object|null} WeaponEffectsManager instance or null if failed
     */
    ensureWeaponEffectsManager() {
        // If permanently failed, don't retry
        if (this.weaponEffectsInitFailed) {
            return null;
        }

        // If not initialized and haven't exceeded retries, try to initialize
        if (!this.weaponEffectsInitialized && this.weaponEffectsRetryCount < this.maxWeaponEffectsRetries) {
            this.initializeWeaponEffectsManager();
        }

        return this.weaponEffectsManager;
    }

    /**
     * Ensure WeaponEffectsManager is connected to the ship
     * @returns {boolean} True if connection was made
     */
    ensureWeaponEffectsConnection() {
        // Only try to connect if we have both WeaponEffectsManager and ship
        if (this.weaponEffectsManager && !this.weaponEffectsManager.fallbackMode) {
            // Get current ship reference (it might have been set after WeaponEffectsManager initialization)
            if (!this.sfm.ship) {
                this.sfm.ship = this.sfm.viewManager?.getShip();
            }

            if (this.sfm.ship && !this.sfm.ship.weaponEffectsManager) {
                this.sfm.ship.weaponEffectsManager = this.weaponEffectsManager;

                // Initialize ship position if not already set
                if (!this.sfm.ship.position) {
                    this.sfm.ship.position = new this.sfm.THREE.Vector3(0, 0, 0);
                }

                debug('COMBAT', '🎆 WeaponEffectsManager connected to ship');
                return true;
            }
        }
        return false;
    }

    /**
     * Get the WeaponEffectsManager instance
     * @returns {Object|null} WeaponEffectsManager instance
     */
    getWeaponEffectsManager() {
        return this.weaponEffectsManager;
    }

    /**
     * Check if initialization has failed permanently
     * @returns {boolean} True if initialization failed
     */
    hasInitFailed() {
        return this.weaponEffectsInitFailed;
    }

    /**
     * Dispose of resources
     */
    dispose() {
        if (this.weaponEffectsManager && this.weaponEffectsManager.dispose) {
            this.weaponEffectsManager.dispose();
        }
        this.weaponEffectsManager = null;
        this.sfm = null;
    }
}
