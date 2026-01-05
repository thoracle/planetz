/**
 * ScanHitWeapon - Direct-fire energy weapons (lasers, plasma cannons)
 * Extracted from WeaponCard.js for better code organization.
 *
 * These weapons use instant hit detection (hitscan) rather than projectiles.
 */

import { debug } from '../../../debug.js';
import { WeaponCard } from './WeaponBase.js';

export class ScanHitWeapon extends WeaponCard {
    constructor(weaponData) {
        super({
            ...weaponData,
            weaponType: 'scan-hit',
            targetLockRequired: false // Scan-hit weapons don't require target lock
        });

        // Scan-hit specific properties
        this.penetration = weaponData.penetration || false;
    }

    /**
     * Fire scan-hit weapon
     * @param {Object} origin Origin position
     * @param {Object} target Target object (optional)
     * @returns {Object} Fire result
     */
    fire(origin, target = null) {
        debug('UTILITY', `${this.name} firing (scan-hit)`);

        // For scan-hit weapons, we always return hit: true because they use
        // visual hit detection in the WeaponSlot.triggerWeaponEffects method
        // rather than probabilistic hit calculation here

        return {
            success: true,
            hit: true, // Always true for scan-hit weapons - actual hit detection happens in triggerWeaponEffects
            damage: this.damage, // Use full weapon damage - visual effects will handle actual targeting
            weaponType: this.name,
            distance: target ? this.calculateDistanceToTarget(origin, target) : 0
        };
    }

    /**
     * Calculate hit chance based on distance and accuracy
     * @param {Object} target Target object
     * @returns {number} Hit chance (0-1)
     */
    calculateHitChance(target) {
        if (!target) {
            return 0; // Can't hit without a target
        }

        const distance = this.calculateDistanceToTarget(null, target);

        // Accuracy degrades with distance
        const rangeFactor = Math.max(0, 1 - (distance / this.range));
        return this.accuracy * rangeFactor;
    }

    /**
     * Apply instant damage to target
     * @param {Object} target Target object
     * @param {number} damage Damage amount
     */
    applyInstantDamage(target, damage) {
        debug('TARGETING', `${this.name} deals ${damage} damage to target`);

        if (target.takeDamage) {
            target.takeDamage(damage);
            this.showDamageFeedback(target, damage);
        }
    }

    /**
     * Show damage feedback on weapon HUD
     * @param {Object} target Target that took damage
     * @param {number} damage Damage amount dealt
     */
    showDamageFeedback(target, damage) {
        try {
            let weaponHUD = null;

            if (window.starfieldManager?.viewManager?.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.starfieldManager.viewManager.ship.weaponSystem.weaponHUD;
            } else if (window.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.ship.weaponSystem.weaponHUD;
            }

            if (weaponHUD) {
                const targetName = target.shipName || target.name || 'Target';
                weaponHUD.showDamageFeedback(this.name, damage, targetName);
            }
        } catch (error) {
            debug('P1', 'Failed to show damage feedback:', error.message);
        }
    }

    /**
     * Calculate distance to target
     * @param {Object} origin Origin position
     * @param {Object} target Target object
     * @returns {number} Distance
     */
    calculateDistanceToTarget(origin, target) {
        if (!origin || !target) {
            return 0;
        }

        const targetPos = target.position || target;

        return Math.sqrt(
            Math.pow(origin.x - targetPos.x, 2) +
            Math.pow(origin.y - targetPos.y, 2) +
            Math.pow(origin.z - targetPos.z, 2)
        );
    }

    /**
     * Show miss feedback through HUD system
     */
    showMissFeedback() {
        try {
            debug('UTILITY', `MISS FEEDBACK: ${this.name} showing miss notification`);

            let weaponHUD = null;

            if (window.starfieldManager?.viewManager?.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.starfieldManager.viewManager.ship.weaponSystem.weaponHUD;
            } else if (window.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.ship.weaponSystem.weaponHUD;
            } else if (window.starfieldManager?.weaponHUD) {
                weaponHUD = window.starfieldManager.weaponHUD;
            }

            if (weaponHUD) {
                weaponHUD.showWeaponFeedback('miss', this.name);
                if (typeof weaponHUD.showUnifiedMessage === 'function') {
                    weaponHUD.showUnifiedMessage('MISS', 1500, 2, '#ff4444', '#cc3333', 'rgba(40, 0, 0, 0.9)');
                }
            }
        } catch (error) {
            debug('P1', 'Failed to show miss feedback:', error.message);
        }
    }

    /**
     * Show target destruction feedback through HUD system
     * @param {Object} targetShip The destroyed target ship
     */
    showTargetDestructionFeedback(targetShip) {
        try {
            const targetName = targetShip.shipName || 'ENEMY SHIP';
            const message = `${targetName.toUpperCase()} DESTROYED`;

            debug('TARGETING', `TARGET DESTRUCTION FEEDBACK: ${this.name} destroyed ${targetName}`);

            let weaponHUD = null;

            if (window.starfieldManager?.viewManager?.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.starfieldManager.viewManager.ship.weaponSystem.weaponHUD;
            } else if (window.ship?.weaponSystem?.weaponHUD) {
                weaponHUD = window.ship.weaponSystem.weaponHUD;
            } else if (window.starfieldManager?.weaponHUD) {
                weaponHUD = window.starfieldManager.weaponHUD;
            }

            if (weaponHUD) {
                weaponHUD.showWeaponFeedback('target-destroyed', message);
            }
        } catch (error) {
            debug('P1', 'Failed to show target destruction feedback:', error.message);
        }
    }
}
