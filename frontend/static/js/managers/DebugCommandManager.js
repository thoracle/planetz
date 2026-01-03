/**
 * DebugCommandManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles debug commands for testing damage, repair, and energy systems.
 *
 * Features:
 * - Damage random ship systems for testing
 * - Damage hull to test hull repair
 * - Drain energy to test energy systems
 * - Repair all systems and restore energy
 */

import { debug } from '../debug.js';

export class DebugCommandManager {
    /**
     * Create a DebugCommandManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
    }

    /**
     * Damage 2-4 random ship systems for testing
     */
    debugDamageRandomSystems() {
        const ship = this.sfm.viewManager?.getShip();
        if (!ship) {
            return;
        }

        const systemNames = Array.from(ship.systems.keys());

        // Damage 2-4 random systems
        const numToDamage = Math.floor(Math.random() * 3) + 2;
        const systemsToDamage = [];

        for (let i = 0; i < numToDamage && i < systemNames.length; i++) {
            const randomIndex = Math.floor(Math.random() * systemNames.length);
            const systemName = systemNames[randomIndex];
            if (!systemsToDamage.includes(systemName)) {
                systemsToDamage.push(systemName);
            }
        }

        // Apply damage to selected systems
        systemsToDamage.forEach(systemName => {
            const system = this.sfm.ship.getSystem(systemName);
            if (system && system.takeDamage) {
                const damageAmount = (0.3 + Math.random() * 0.5) * system.maxHealth; // 30-80% damage
                system.takeDamage(damageAmount);
            }
        });

        // Notify damage control HUD to update
        if (this.sfm.damageControlHUD) {
            this.sfm.damageControlHUD.markForUpdate();
        }

        this.sfm.updateShipSystemsDisplay();
    }

    /**
     * Damage hull to 30-70% for testing
     */
    debugDamageHull() {
        const ship = this.sfm.viewManager?.getShip();
        if (!ship) {
            return;
        }

        // Damage hull to 30-70%
        const damagePercent = Math.random() * 0.4 + 0.3; // 30-70%
        const newHull = Math.floor(ship.maxHull * (1 - damagePercent));
        ship.currentHull = Math.max(1, newHull); // Ensure at least 1 hull

        // Update the damage control display if it's currently visible
        if (this.sfm.damageControlVisible) {
            this.sfm.updateShipSystemsDisplay();
        }
    }

    /**
     * Drain 30-80% of ship energy for testing
     */
    debugDrainEnergy() {
        const ship = this.sfm.viewManager?.getShip();
        if (!ship) {
            return;
        }

        const drainAmount = 0.3 + Math.random() * 0.5; // 30-80% energy drain
        const originalEnergy = ship.currentEnergy;
        ship.currentEnergy = Math.max(0, ship.currentEnergy - (ship.maxEnergy * drainAmount));

        const actualDrain = originalEnergy - ship.currentEnergy;
        const drainPercentage = (actualDrain / ship.maxEnergy) * 100;

        // Update the damage control display if it's currently visible
        if (this.sfm.damageControlVisible) {
            this.sfm.updateShipSystemsDisplay();
        }
    }

    /**
     * Repair all systems, hull, and energy to full
     */
    debugRepairAllSystems() {
        const ship = this.sfm.viewManager?.getShip();
        if (!ship) {
            return;
        }

        // Repair hull to full
        ship.currentHull = ship.maxHull;

        // Repair all systems to full health
        const systemNames = Array.from(ship.systems.keys());
        let repairedCount = 0;

        for (const systemName of systemNames) {
            const system = ship.getSystem(systemName);
            if (system && system.repair) {
                system.repair(1.0); // Full repair
                repairedCount++;
            }
        }

        // Recharge energy
        ship.currentEnergy = ship.maxEnergy;

        // Update the damage control display if it's currently visible
        if (this.sfm.damageControlVisible) {
            this.sfm.updateShipSystemsDisplay();
        }
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.sfm = null;
    }
}
