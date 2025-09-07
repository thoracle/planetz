import { debug } from '../../debug.js';

/**
 * Shields System - Provides defensive protection for the ship
 * Based on docs/spaceships_spec.md and docs/tech_design.md
 * Energy consumption when active, damage absorption, recharge mechanics
 */

import System, { SYSTEM_STATES } from '../System.js';

export default class Shields extends System {
    constructor(level = 1, config = {}) {
        // Base configuration for shields
        const baseConfig = {
            slotCost: 1,
            energyConsumptionRate: 25, // Energy per second when shields are up
            systemType: 'shields',
            maxHealth: 120,
            ...config
        };
        
        super('Shields', level, baseConfig);
        
        // Shield mechanics
        this.maxShieldStrength = 500; // Will be modified by level
        this.currentShieldStrength = this.maxShieldStrength;
        this.shieldRechargeRate = 20; // Shields per second when recharging
        this.shieldRechargeDelay = 3000; // 3 seconds after taking damage before recharge starts
        
        // Shield state
        this.isShieldsUp = false; // Whether shields are activated
        this.lastDamageTime = 0; // When shields last took damage
        this.isRecharging = false; // Whether shields are currently recharging
        
        // Override default active state - shields are only active when up
        this.isActive = false;
        
        // Damage absorption efficiency (0.0 - 1.0)
        this.damageAbsorption = 0.8; // 80% of damage absorbed by shields
        
        // Visual effect state
        this.isScreenTinted = false;
        
        // Initialize level-specific values
        this.updateLevelStats();
        
debug('COMBAT', `Shields created (Level ${level}) - Max Strength: ${this.maxShieldStrength}`);
    }
    
    /**
     * Initialize level-specific stats for shields
     * @returns {Object} Level stats configuration
     */
    initializeLevelStats() {
        const baseConsumption = this.energyConsumptionRate;
        const baseStrength = 500;
        const baseRecharge = 20;
        
        return {
            1: { 
                effectiveness: 1.0,
                energyConsumptionRate: baseConsumption,
                maxShieldStrength: baseStrength,
                shieldRechargeRate: baseRecharge,
                damageAbsorption: 0.75 // 75% absorption
            },
            2: { 
                effectiveness: 1.2,
                energyConsumptionRate: baseConsumption * 0.95, // 5% more efficient
                maxShieldStrength: baseStrength * 1.3, // 30% stronger
                shieldRechargeRate: baseRecharge * 1.2, // 20% faster recharge
                damageAbsorption: 0.80 // 80% absorption
            },
            3: { 
                effectiveness: 1.4,
                energyConsumptionRate: baseConsumption * 0.90, // 10% more efficient
                maxShieldStrength: baseStrength * 1.6, // 60% stronger
                shieldRechargeRate: baseRecharge * 1.4, // 40% faster recharge
                damageAbsorption: 0.85 // 85% absorption
            },
            4: { 
                effectiveness: 1.6,
                energyConsumptionRate: baseConsumption * 0.85, // 15% more efficient
                maxShieldStrength: baseStrength * 2.0, // 100% stronger
                shieldRechargeRate: baseRecharge * 1.6, // 60% faster recharge
                damageAbsorption: 0.90 // 90% absorption
            },
            5: { 
                effectiveness: 1.8,
                energyConsumptionRate: baseConsumption * 0.80, // 20% more efficient
                maxShieldStrength: baseStrength * 2.5, // 150% stronger
                shieldRechargeRate: baseRecharge * 1.8, // 80% faster recharge
                damageAbsorption: 0.95 // 95% absorption
            }
        };
    }
    
    /**
     * Update shield stats based on current level
     */
    updateLevelStats() {
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        
        // Store old percentage
        const oldPercentage = this.currentShieldStrength / this.maxShieldStrength;
        
        // Update stats
        this.maxShieldStrength = levelStats.maxShieldStrength;
        this.shieldRechargeRate = levelStats.shieldRechargeRate;
        this.damageAbsorption = levelStats.damageAbsorption;
        
        // Maintain percentage of shields
        this.currentShieldStrength = this.maxShieldStrength * oldPercentage;
    }
    
    /**
     * Toggle shields on/off
     * @returns {boolean} True if shields are now up, false if down
     */
    toggleShields() {
        if (!this.isOperational()) {
            console.warn('Cannot toggle shields: system not operational');
            return false;
        }
        
        this.isShieldsUp = !this.isShieldsUp;
        
        if (this.isShieldsUp) {
            this.activateShields();
        } else {
            this.deactivateShields();
        }
        
        return this.isShieldsUp;
    }
    
    /**
     * Activate shields
     * @returns {boolean} True if shields were activated
     */
    activateShields() {
        if (!this.isOperational()) {
            console.warn('Cannot activate shields: system not operational');
            return false;
        }
        
        this.isShieldsUp = true;
        this.isActive = true; // Start consuming energy
        this.applyScreenTint();
debug('COMBAT', 'Shields up - defensive screens activated');
        
        // Show HUD message for shield activation using the same system as other major ship systems
        this.showHUDError(
            'SHIELDS ACTIVATED',
            `Defensive screens enabled - Energy consumption: ${this.getEnergyConsumptionRate()}/sec`
        );
        
        return true;
    }
    
    /**
     * Deactivate shields
     */
    deactivateShields() {
        this.isShieldsUp = false;
        this.isActive = false; // Stop consuming energy
        this.removeScreenTint();
debug('COMBAT', 'Shields down - defensive screens deactivated');
        
        // Show HUD message for shield deactivation using the same system as other major ship systems
        this.showHUDError(
            'SHIELDS DEACTIVATED',
            'Defensive screens disabled - No energy consumption'
        );
    }
    
    /**
     * Check if shields can be activated
     * @param {Ship} ship - The ship instance
     * @returns {boolean} - True if shields can be activated
     */
    canActivate(ship) {
        console.log(`🛡️ Shields.canActivate() called:`, {
            isOperational: this.isOperational(),
            hasShip: !!ship,
            shipEnergy: ship?.currentEnergy
        });
        
        if (!this.isOperational()) {
debug('COMBAT', `🛡️ Shields: Cannot activate - system not operational`);
            return false;
        }
        
        // Check if ship has required cards
        if (ship && ship.hasSystemCardsSync) {
            const cardCheck = ship.hasSystemCardsSync('shields');
debug('COMBAT', `🛡️ Shields: Card check result:`, cardCheck, typeof cardCheck);
            
            // Handle both boolean and object returns
            let cardCheckPassed = false;
            if (typeof cardCheck === 'boolean') {
                cardCheckPassed = cardCheck;
            } else if (cardCheck && typeof cardCheck === 'object') {
                cardCheckPassed = cardCheck.hasCards;
            } else {
                cardCheckPassed = false;
            }
            
            if (!cardCheckPassed) {
                const missingCards = (cardCheck && cardCheck.missingCards) ? cardCheck.missingCards : ['shields'];
debug('COMBAT', `🛡️ Shields: Cannot activate - missing cards:`, missingCards);
                return false;
            }
debug('COMBAT', `🛡️ Shields: Card check PASSED`);
        }
        
        // Check energy requirements
        const energyRequired = this.getEnergyConsumptionRate();
        if (ship && ship.currentEnergy < energyRequired) {
debug('COMBAT', `🛡️ Shields: Cannot activate - insufficient energy: ${ship.currentEnergy}/${energyRequired}`);
            return false;
        }
        
debug('COMBAT', `🛡️ Shields: Can activate - all checks passed`);
        return true;
    }
    
    /**
     * Apply blue screen tint when shields are active
     */
    applyScreenTint() {
debug('COMBAT', 'Applying shield screen tint...');
        if (this.isScreenTinted) {
debug('UTILITY', 'Screen already tinted, skipping');
            return;
        }
        
        // Create or get existing shield overlay
        let shieldOverlay = document.getElementById('shield-overlay');
        
        if (!shieldOverlay) {
debug('COMBAT', 'Creating new shield overlay element');
            shieldOverlay = document.createElement('div');
            shieldOverlay.id = 'shield-overlay';
            shieldOverlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: radial-gradient(ellipse at center, 
                    rgba(0, 180, 255, 0.25) 0%, 
                    rgba(0, 150, 255, 0.18) 30%, 
                    rgba(0, 120, 255, 0.12) 60%, 
                    rgba(0, 80, 255, 0.06) 100%);
                pointer-events: none;
                z-index: 500;
                opacity: 0;
                transition: opacity 0.3s ease-in-out;
            `;
            document.body.appendChild(shieldOverlay);
debug('COMBAT', 'Shield overlay created and added to DOM');
        } else {
debug('COMBAT', 'Using existing shield overlay element');
        }
        
        // Fade in the overlay
        setTimeout(() => {
debug('COMBAT', 'Fading in shield overlay to opacity 1');
            shieldOverlay.style.opacity = '1';
        }, 10);
        
        this.isScreenTinted = true;
debug('COMBAT', 'Shield screen tint applied successfully');
    }
    
    /**
     * Remove blue screen tint when shields are deactivated
     */
    removeScreenTint() {
debug('COMBAT', 'Removing shield screen tint...');
        if (!this.isScreenTinted) {
debug('UTILITY', 'Screen not tinted, skipping');
            return;
        }
        
        const shieldOverlay = document.getElementById('shield-overlay');
        if (shieldOverlay) {
debug('COMBAT', 'Fading out shield overlay');
            shieldOverlay.style.opacity = '0';
            // Remove element after transition
            setTimeout(() => {
                if (shieldOverlay.parentNode) {
debug('COMBAT', 'Removing shield overlay from DOM');
                    shieldOverlay.parentNode.removeChild(shieldOverlay);
                }
            }, 300);
        } else {
debug('COMBAT', 'Shield overlay element not found');
        }
        
        this.isScreenTinted = false;
debug('COMBAT', 'Shield screen tint removed successfully');
    }
    
    /**
     * Get current energy consumption rate
     * Only consumes energy when shields are up and operational
     * @returns {number} Energy consumption rate per second
     */
    getEnergyConsumptionRate() {
        if (!this.isOperational() || !this.isShieldsUp) {
            return 0;
        }
        
        // Get base consumption for current level
        const levelStats = this.levelStats[this.level] || this.levelStats[1];
        const baseConsumption = levelStats.energyConsumptionRate || this.energyConsumptionRate;
        
        // Apply system effectiveness (damaged systems consume more energy)
        const effectiveness = this.getEffectiveness();
        const inefficiencyPenalty = 1 + (1 - effectiveness) * 0.3; // Up to 30% more consumption when damaged
        
        return baseConsumption * inefficiencyPenalty;
    }
    
    /**
     * Absorb incoming damage
     * @param {number} incomingDamage - Amount of damage to absorb
     * @returns {number} Damage that passes through to hull
     */
    absorbDamage(incomingDamage) {
        if (!this.isShieldsUp || !this.isOperational() || this.currentShieldStrength <= 0) {
            // Shields down or depleted - no protection
            return incomingDamage;
        }
        
        // Calculate damage absorption based on system effectiveness
        const effectiveness = this.getEffectiveness();
        const actualAbsorption = this.damageAbsorption * effectiveness;
        
        const damageToShields = incomingDamage * actualAbsorption;
        const damageToHull = incomingDamage * (1 - actualAbsorption);
        
        // Apply damage to shields
        this.currentShieldStrength = Math.max(0, this.currentShieldStrength - damageToShields);
        this.lastDamageTime = Date.now();
        this.isRecharging = false;
        
debug('COMBAT', `Shields absorbed ${damageToShields.toFixed(1)} damage. Shield strength: ${this.currentShieldStrength.toFixed(1)}/${this.maxShieldStrength}`);
        
        // Visual feedback for shield hit
        this.flashShieldHit();
        
        return damageToHull;
    }
    
    /**
     * Visual feedback when shields take damage
     */
    flashShieldHit() {
        const shieldOverlay = document.getElementById('shield-overlay');
        if (shieldOverlay && this.isShieldsUp) {
            // Brief flash effect
            const originalOpacity = shieldOverlay.style.opacity;
            shieldOverlay.style.background = 'radial-gradient(ellipse at center, rgba(255, 100, 100, 0.4) 0%, rgba(0, 180, 255, 0.2) 100%)';
            
            setTimeout(() => {
                shieldOverlay.style.background = 'radial-gradient(ellipse at center, rgba(0, 180, 255, 0.25) 0%, rgba(0, 150, 255, 0.18) 30%, rgba(0, 120, 255, 0.12) 60%, rgba(0, 80, 255, 0.06) 100%)';
            }, 150);
        }
    }
    
    /**
     * Get shield strength percentage
     * @returns {number} Shield strength as percentage (0-1)
     */
    getShieldStrengthPercentage() {
        return this.maxShieldStrength > 0 ? this.currentShieldStrength / this.maxShieldStrength : 0;
    }
    
    /**
     * Get armor bonus for ship stats calculation
     * @returns {number} Armor multiplier when shields are up
     */
    getArmorBonus() {
        if (!this.isOperational() || !this.isShieldsUp) {
            return 0;
        }
        
        // Armor bonus based on shield strength and effectiveness
        const effectiveness = this.getEffectiveness();
        const strengthFactor = this.getShieldStrengthPercentage();
        
        return effectiveness * strengthFactor * 0.5; // Up to 50% armor bonus
    }
    
    /**
     * Handle system state effects specific to shields
     * @param {string} newState The new system state
     */
    handleStateEffects(newState) {
        super.handleStateEffects(newState);
        
        switch (newState) {
            case SYSTEM_STATES.CRITICAL:
                // Critical shields can't maintain full power
                if (this.currentShieldStrength > this.maxShieldStrength * 0.3) {
                    this.currentShieldStrength = this.maxShieldStrength * 0.3;
debug('P1', 'Critical shield damage - maximum shield strength reduced');
                }
                break;
            case SYSTEM_STATES.DISABLED:
                // Disabled shields drop immediately
                this.currentShieldStrength = 0;
                this.deactivateShields();
debug('COMBAT', 'Shield generators disabled - shields down!');
                break;
        }
    }
    
    /**
     * Update shields (called each frame)
     * @param {number} deltaTime Time elapsed since last update in milliseconds
     * @param {Ship} ship Ship instance for energy consumption
     */
    update(deltaTime, ship) {
        // Call parent update for energy consumption
        super.update(deltaTime, ship);
        
        // Handle shield recharge
        if (this.isOperational() && this.currentShieldStrength < this.maxShieldStrength) {
            const timeSinceDamage = Date.now() - this.lastDamageTime;
            
            // Start recharging if enough time has passed since last damage
            if (timeSinceDamage >= this.shieldRechargeDelay) {
                if (!this.isRecharging) {
                    this.isRecharging = true;
debug('COMBAT', 'Shield recharge initiated');
                }
                
                // Recharge shields
                const effectiveness = this.getEffectiveness();
                const rechargeRate = this.shieldRechargeRate * effectiveness;
                const rechargeAmount = rechargeRate * (deltaTime / 1000);
                
                this.currentShieldStrength = Math.min(
                    this.maxShieldStrength,
                    this.currentShieldStrength + rechargeAmount
                );
                
                // Stop recharging when full
                if (this.currentShieldStrength >= this.maxShieldStrength) {
                    this.isRecharging = false;
                }
            }
        }
    }
    
    /**
     * Upgrade system to next level
     * @returns {boolean} True if upgrade successful
     */
    upgrade() {
        const result = super.upgrade();
        if (result) {
            this.updateLevelStats();
        }
        return result;
    }
    
    /**
     * Get system status with shield-specific information
     * @returns {Object} Extended status object
     */
    getStatus() {
        const baseStatus = super.getStatus();
        
        return {
            ...baseStatus,
            isShieldsUp: this.isShieldsUp,
            currentShieldStrength: this.currentShieldStrength,
            maxShieldStrength: this.maxShieldStrength,
            shieldPercentage: this.getShieldStrengthPercentage(),
            rechargeRate: this.shieldRechargeRate,
            damageAbsorption: this.damageAbsorption,
            isRecharging: this.isRecharging,
            armorBonus: this.getArmorBonus()
        };
    }
    
    /**
     * Clean up shield effects when system is destroyed
     */
    dispose() {
        this.removeScreenTint();
    }
} 