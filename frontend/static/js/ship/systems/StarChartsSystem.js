import { debug } from '../../debug.js';

/**
 * Star Charts System - Provides advanced navigation and discovery tracking
 * Based on docs/star_charts_system_spec.md
 * Energy consumption when active, damage affects accuracy and range
 */

import System, { SYSTEM_STATES } from '../System.js';

export default class StarChartsSystem extends System {
    constructor(level = 1, config = {}) {
        // Initialize base chart properties BEFORE calling super()
        const baseDiscoveryRange = 50; // Base discovery range in km
        const baseEnergyConsumptionRate = 6; // Energy per second when active
        const baseAccuracy = 95; // Base accuracy of displayed information (percentage)
        
        // Base configuration for star charts
        const baseConfig = {
            slotCost: 1,
            energyConsumptionRate: baseEnergyConsumptionRate,
            repairCost: 200,
            upgradeBaseCost: 400,
            ...config
        };

        super('Star Charts', level, baseConfig);

        // Store base values for level calculations
        this.baseDiscoveryRange = baseDiscoveryRange;
        this.baseEnergyConsumptionRate = baseEnergyConsumptionRate;
        this.baseAccuracy = baseAccuracy;
        
        // Chart state
        this.isChartsActive = false;
        this.lastActivationTime = 0;
        this.activationCooldown = 1000; // 1 second cooldown between activations
        
        // Override default active state - charts are only active when HUD is open
        this.isActive = false;

        // Ship reference (set by ship when system is added)
        this.ship = null;

        // Re-initialize levelStats now that all properties are set
        this.levelStats = this.initializeLevelStats();
        
        // Debug logging to understand the NaN issue
debug('INSPECTION', `🗺️ DEBUG: StarCharts level=${this.level}`);
debug('INSPECTION', `🗺️ DEBUG: baseDiscoveryRange=${this.baseDiscoveryRange}`);
debug('INSPECTION', `🗺️ DEBUG: baseAccuracy=${this.baseAccuracy}`);
debug('INSPECTION', `🗺️ DEBUG: levelStats=`, this.levelStats);
debug('INSPECTION', `🗺️ DEBUG: levelStats[${this.level}]=`, this.levelStats[this.level]);
        
        // Log after everything is properly initialized
debug('UTILITY', `Star Charts System created (Level ${this.level}) - Discovery Range: ${this.getCurrentDiscoveryRange()}km, Accuracy: ${this.getCurrentAccuracy()}%`);
    }

    initializeLevelStats() {
        // Define level-specific stats for star charts
        // Use constants here since instance properties aren't available yet during super() call
        const baseDiscoveryRange = 50;
        const baseEnergyConsumptionRate = 6;
        const baseAccuracy = 95;
        
        return {
            1: {
                discoveryRange: Math.round(baseDiscoveryRange * 1.0),
                energyConsumptionRate: Math.round(baseEnergyConsumptionRate * 1.0),
                accuracy: Math.round(baseAccuracy * 0.8), // 76%
                description: 'Basic Star Charts - Limited discovery range and accuracy'
            },
            2: {
                discoveryRange: Math.round(baseDiscoveryRange * 1.5),
                energyConsumptionRate: Math.round(baseEnergyConsumptionRate * 0.9),
                accuracy: Math.round(baseAccuracy * 0.9), // 85%
                description: 'Enhanced Star Charts - Improved discovery capabilities'
            },
            3: {
                discoveryRange: Math.round(baseDiscoveryRange * 2.0),
                energyConsumptionRate: Math.round(baseEnergyConsumptionRate * 0.8),
                accuracy: Math.round(baseAccuracy * 1.0), // 95%
                description: 'Advanced Star Charts - High-precision navigation system'
            },
            4: {
                discoveryRange: Math.round(baseDiscoveryRange * 2.5),
                energyConsumptionRate: Math.round(baseEnergyConsumptionRate * 0.7),
                accuracy: Math.round(baseAccuracy * 1.05), // 99%
                description: 'Military-Grade Star Charts - Maximum discovery range and accuracy'
            },
            5: {
                discoveryRange: Math.round(baseDiscoveryRange * 3.0),
                energyConsumptionRate: Math.round(baseEnergyConsumptionRate * 0.6),
                accuracy: Math.round(baseAccuracy * 1.1), // 104% (capped at 100% in practice)
                description: 'Quantum Star Charts - Theoretical maximum performance'
            }
        };
    }

    // Get current discovery range based on level and damage
    getCurrentDiscoveryRange() {
        if (!this.levelStats || !this.levelStats[this.level]) {
            console.warn(`StarCharts: levelStats not initialized for level ${this.level}`);
            return this.baseDiscoveryRange || 50;
        }
        const baseRange = this.levelStats[this.level].discoveryRange || this.baseDiscoveryRange;
        const damageMultiplier = Math.max(0.1, 1 - (this.damageLevel * 0.2)); // 20% reduction per damage level
        return Math.round(baseRange * damageMultiplier);
    }

    // Get current accuracy based on level and damage
    getCurrentAccuracy() {
        if (!this.levelStats || !this.levelStats[this.level]) {
            console.warn(`StarCharts: levelStats not initialized for level ${this.level}`);
            return this.baseAccuracy || 95;
        }
        const baseAccuracy = this.levelStats[this.level].accuracy || this.baseAccuracy;
        const damageMultiplier = Math.max(0.3, 1 - (this.damageLevel * 0.15)); // 15% reduction per damage level
        return Math.min(100, Math.round(baseAccuracy * damageMultiplier));
    }

    // Check if star charts can be activated
    canActivate() {
        const now = Date.now();
        const canActivateBase = super.canActivate();

        console.log(`🗺️ Star Charts canActivate called: isActive=${this.isActive}, lastActivationTime=${this.lastActivationTime}, cooldown=${this.activationCooldown}`);

        if (!canActivateBase) {
debug('UTILITY', 'Star Charts: Cannot activate - system not operational');
            return false;
        }

        // If system is already active, allow deactivation (no cooldown check needed)
        if (this.isActive) {
            console.log('🗺️ Star Charts: System is active, allowing toggle operation');
            return true;
        }

        // Check cooldown only when trying to activate (not deactivate)
        const cooldownPassed = (now - this.lastActivationTime) >= this.activationCooldown;
        console.log(`🗺️ Star Charts: Cooldown check - now=${now}, last=${this.lastActivationTime}, diff=${now - this.lastActivationTime}, required=${this.activationCooldown}, passed=${cooldownPassed}`);

        if (!cooldownPassed) {
debug('UTILITY', 'Star Charts: Cannot activate - cooldown active');
            return false;
        }

        return true;
    }

    // Activate star charts system
    activate() {
        console.log(`🗺️ Star Charts activate called: isActive=${this.isActive}`);
        if (!this.canActivate()) {
            console.log('🗺️ Star Charts activate: canActivate returned false');
            return false;
        }

        // Check if ship has star charts cards
        let hasStarChartsCards = false;
        try {
            const ship = this.getShip();
            if (!ship) {
                console.warn('Cannot activate Star Charts: No ship reference available');
                return false;
            }

            if (ship.hasSystemCards && typeof ship.hasSystemCards === 'function') {
                hasStarChartsCards = ship.hasSystemCards('star_charts');
debug('UI', `🗺️ StarCharts: Card check result:`, hasStarChartsCards);
            } else {
                if (ship.hasSystemCardsSync && typeof ship.hasSystemCardsSync === 'function') {
                    hasStarChartsCards = ship.hasSystemCardsSync('star_charts');
debug('UI', `🗺️ StarCharts: Card check (sync) result:`, hasStarChartsCards);
                }
            }
        } catch (error) {
            console.error('Error checking Star Charts cards:', error);
            return false;
        }

        if (!hasStarChartsCards) {
            console.warn('Cannot activate Star Charts: No star charts cards installed');
            return false;
        }

        this.isChartsActive = true;
        this.isActive = true;
        this.lastActivationTime = Date.now();

        console.log(`🗺️ Star Charts activated successfully: isActive=${this.isActive}, isChartsActive=${this.isChartsActive}, lastActivationTime=${this.lastActivationTime}`);
debug('UTILITY', `🗺️ Star Charts activated - Discovery Range: ${this.getCurrentDiscoveryRange()}km, Accuracy: ${this.getCurrentAccuracy()}%`);
        return true;
    }

    // Deactivate star charts system
    deactivate() {
        console.log(`🗺️ Star Charts deactivate called: isActive=${this.isActive}, isChartsActive=${this.isChartsActive}`);
        this.isChartsActive = false;
        this.isActive = false;
        console.log(`🗺️ Star Charts deactivated: isActive=${this.isActive}, isChartsActive=${this.isChartsActive}`);
debug('UTILITY', 'Star Charts deactivated');
    }

    // Get system status for UI display
    getSystemStatus() {
        const baseStatus = super.getSystemStatus();
        return {
            ...baseStatus,
            discoveryRange: this.getCurrentDiscoveryRange(),
            accuracy: this.getCurrentAccuracy(),
            isChartsActive: this.isChartsActive,
            cooldownRemaining: Math.max(0, this.activationCooldown - (Date.now() - this.lastActivationTime))
        };
    }

    // Helper method to get ship reference
    getShip() {
        // This will be set by the ship when the system is added
        return this.ship || null;
    }

    /**
     * Set ship reference for this system
     * @param {Ship} ship - The ship this system belongs to
     */
    setShip(ship) {
        this.ship = ship;
debug('UI', `Ship reference set on ${this.displayName}`);
    }

    // Update method called by ship systems
    update(deltaTime) {
        super.update(deltaTime);
        
        // Additional star charts specific updates can go here
        if (this.isChartsActive) {
            // Consume energy while active
            // Energy consumption is handled by the base System class
        }
    }
}
