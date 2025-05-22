import * as THREE from 'three';
import WarpFeedback from './WarpFeedback.js';

class WarpDrive {
    constructor(viewManager) {
        // Core properties
        this.isActive = false;
        this.warpFactor = 1.0;
        this.maxWarpFactor = 9.9;
        this.viewManager = viewManager; // Store reference to ViewManager
        this.energyConsumptionRate = 0.1;
        this.cooldownTime = 0;
        this.maxCooldownTime = 60000; // 60 seconds
        this.warpSequenceTime = 5000; // 5 seconds
        this.lastUpdateTime = Date.now(); // Track last update time for debugging

        // Acceleration curve for smooth transitions
        this.accelerationCurve = new THREE.CubicBezierCurve3(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0.2, 0.8, 0),
            new THREE.Vector3(0.8, 1, 0),
            new THREE.Vector3(1, 1, 0)
        );

        // Event listeners
        this.onWarpStart = null;
        this.onWarpEnd = null;
        this.onEnergyUpdate = null;

        // Initialize feedback system
        this.feedback = new WarpFeedback();
        
        console.log('WarpDrive initialized:', {
            maxCooldownTime: this.maxCooldownTime,
            warpSequenceTime: this.warpSequenceTime,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Activate the warp drive
     * @returns {boolean} True if activation was successful
     */
    activate() {
        if (this.viewManager.getShipEnergy() <= 0) {
            this.feedback.showWarning(
                'Insufficient Energy',
                'The warp drive requires energy to activate.',
                () => this.feedback.hideAll()
            );
            return false;
        }
        if (this.cooldownTime > 0) {
            this.feedback.showWarning(
                'Warp Drive Cooling Down',
                `Please wait ${Math.ceil(this.cooldownTime / 1000)} seconds before activating warp drive again.`,
                () => this.feedback.hideAll()
            );
            return false;
        }
        if (this.isActive) {
            this.feedback.showWarning(
                'Warp Drive Active',
                'The warp drive is already active.',
                () => this.feedback.hideAll()
            );
            return false;
        }

        this.isActive = true;
        this.feedback.showAll();
        if (this.onWarpStart) {
            this.onWarpStart(this.warpFactor);
        }
        return true;
    }

    /**
     * Deactivate the warp drive
     */
    deactivate() {
        if (!this.isActive) return;

        console.log('[Debug] WarpDrive deactivating:', {
            wasActive: this.isActive,
            cooldownTime: this.cooldownTime,
            maxCooldownTime: this.maxCooldownTime
        });

        this.isActive = false;
        this.cooldownTime = this.maxCooldownTime;
        
        // Show feedback for cooldown
        console.log('[Debug] Showing cooldown feedback:', {
            cooldownTime: this.cooldownTime,
            maxCooldownTime: this.maxCooldownTime
        });

        // Ensure feedback is visible and showing cooldown
        this.feedback.showAll();
        this.feedback.updateProgress(100, `Cooldown (${Math.ceil(this.cooldownTime / 1000)}s)`);
        
        if (this.onWarpEnd) {
            this.onWarpEnd();
        }

        // Hide feedback after cooldown
        setTimeout(() => {
            console.log('[Debug] Cooldown timeout triggered');
            this.feedback.hideAll();
        }, this.maxCooldownTime);
    }

    /**
     * Set the warp factor
     * @param {number} factor - The desired warp factor (1.0 to maxWarpFactor)
     * @returns {boolean} True if the warp factor was set successfully
     */
    setWarpFactor(factor) {
        if (factor < 1.0 || factor > this.maxWarpFactor) {
            console.warn(`Invalid warp factor: ${factor}. Must be between 1.0 and ${this.maxWarpFactor}`);
            return false;
        }
        this.warpFactor = factor;
        return true;
    }

    /**
     * Update the warp drive state
     * @param {number} deltaTime - Time elapsed since last update in milliseconds
     */
    update(deltaTime) {
        const currentTime = Date.now();
        const timeSinceLastUpdate = currentTime - this.lastUpdateTime;
        this.lastUpdateTime = currentTime;

        if (this.isActive) {
            // Calculate energy consumption
            const energyConsumption = this.energyConsumptionRate * this.warpFactor * deltaTime;
            const currentEnergy = this.viewManager.getShipEnergy();
            const newEnergy = Math.max(0, currentEnergy - energyConsumption);
            this.viewManager.updateShipEnergy(newEnergy - currentEnergy);

            // Update feedback
            this.feedback.updateEnergyIndicator(newEnergy, 100);
            this.feedback.updateProgress(
                (this.warpFactor / this.maxWarpFactor) * 100,
                'Warp Speed'
            );

            // Notify energy update
            if (this.onEnergyUpdate) {
                this.onEnergyUpdate(newEnergy);
            }

            // Check for energy depletion
            if (newEnergy <= 0) {
                this.feedback.showWarning(
                    'Energy Depleted',
                    'The warp drive has been deactivated due to insufficient energy.',
                    () => this.feedback.hideAll()
                );
                this.deactivate();
            }
        } else if (this.cooldownTime > 0) {
            // Update cooldown timer using actual time elapsed
            const previousCooldownTime = this.cooldownTime;
            this.cooldownTime = Math.max(0, this.cooldownTime - timeSinceLastUpdate);
            
            // Calculate cooldown progress (100% to 0%)
            const cooldownProgress = (this.cooldownTime / this.maxCooldownTime) * 100;
            
            // Update feedback with remaining cooldown time
            this.feedback.updateProgress(
                cooldownProgress,
                `Cooldown (${Math.ceil(this.cooldownTime / 1000)}s)`
            );
            
            // Log if cooldown time reduction is unusually large
            const timeReduced = previousCooldownTime - this.cooldownTime;
            if (timeReduced > timeSinceLastUpdate * 1.5) {
                console.warn('Large cooldown time reduction:', {
                    timeReduced,
                    timeSinceLastUpdate,
                    previousCooldownTime,
                    newCooldownTime: this.cooldownTime
                });
            }
            
            // Hide feedback when cooldown is complete
            if (this.cooldownTime <= 0) {
                console.log('[Debug] Cooldown complete, hiding feedback');
                this.feedback.hideAll();
            }
        }
    }

    /**
     * Get the current status of the warp drive
     * @returns {Object} Status object containing current state
     */
    getStatus() {
        return {
            isActive: this.isActive,
            warpFactor: this.warpFactor,
            energyLevel: this.viewManager.getShipEnergy(),
            cooldownTime: this.cooldownTime
        };
    }

    /**
     * Calculate the current speed based on warp factor
     * @returns {number} Current speed in units per second
     */
    getCurrentSpeed() {
        return this.isActive ? this.warpFactor * 1000 : 0;
    }

    /**
     * Add energy to the warp drive
     * @param {number} amount - Amount of energy to add
     */
    addEnergy(amount) {
        const currentEnergy = this.viewManager.getShipEnergy();
        const newEnergy = Math.min(100, currentEnergy + amount);
        this.viewManager.updateShipEnergy(newEnergy - currentEnergy);
        this.feedback.updateEnergyIndicator(newEnergy, 100);
        if (this.onEnergyUpdate) {
            this.onEnergyUpdate(newEnergy);
        }
    }
}

export default WarpDrive; 