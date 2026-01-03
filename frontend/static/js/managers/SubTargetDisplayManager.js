/**
 * SubTargetDisplayManager
 *
 * Extracted from StarfieldManager to reduce god class size.
 * Handles sub-targeting UI display and availability checks.
 *
 * Features:
 * - Determines sub-target availability based on target computer level
 * - Checks weapon compatibility for sub-targeting
 * - Generates HTML for sub-target display panel
 * - Shows health bars, accuracy and damage bonuses
 * - Handles faction-based color coding
 */

import { debug } from '../debug.js';

export class SubTargetDisplayManager {
    /**
     * Create a SubTargetDisplayManager
     * @param {Object} starfieldManager - Reference to parent StarfieldManager
     */
    constructor(starfieldManager) {
        this.sfm = starfieldManager;
    }

    /**
     * Get sub-targeting availability and generate display HTML
     * @param {Object} ship Current ship
     * @param {Object} targetComputer Target computer system
     * @param {boolean} isEnemyShip Whether target is an enemy ship
     * @param {Object} currentTargetData Current target data
     * @returns {Object} HTML and availability information
     */
    getSubTargetAvailability(ship, targetComputer, isEnemyShip, currentTargetData) {
        let html = '';

        // Check basic requirements
        if (!targetComputer) {
            return {
                html: '',
                available: false,
                reason: 'No Target Computer'
            };
        }

        // Determine target type and faction color using same logic as main target display
        let diplomacyColor = '#44ffff'; // Default teal for unknown
        let isCelestialBody = false;
        let isSpaceStation = false;

        if (isEnemyShip) {
            diplomacyColor = '#ff3333'; // Enemy ships are darker neon red
        } else {
            // Get celestial body info for non-ship targets
            const info = this.sfm.solarSystemManager.getCelestialBodyInfo(this.sfm.currentTarget);
            if (info) {
                isCelestialBody = true; // Mark as celestial body

                // Check if it's a space station
                isSpaceStation = info.type === 'station' ||
                                 (currentTargetData && currentTargetData.isSpaceStation) ||
                                 (this.sfm.currentTarget && this.sfm.currentTarget.userData && this.sfm.currentTarget.userData.isSpaceStation);

                if (info.type === 'star') {
                    diplomacyColor = '#ffff00'; // Stars are neutral yellow
                } else {
                    // Convert faction to diplomacy if needed
                    let diplomacy = info?.diplomacy?.toLowerCase();
                    if (!diplomacy && info?.faction) {
                        diplomacy = this.sfm.getFactionDiplomacy(info.faction).toLowerCase();
                    }

                    if (diplomacy === 'enemy') {
                        diplomacyColor = '#ff3333'; // Enemy red
                    } else if (diplomacy === 'neutral') {
                        diplomacyColor = '#ffff00'; // Neutral yellow
                    } else if (diplomacy === 'friendly') {
                        diplomacyColor = '#00ff41'; // Friendly green
                    }
                }
            }
        }

        const currentWeapon = ship?.weaponSystem?.getActiveWeapon();
        const weaponCard = currentWeapon?.equippedWeapon;
        let weaponType = weaponCard?.weaponType;
        const weaponName = weaponCard?.name || 'No Weapon';
        const tcLevel = targetComputer.level;

        // Fallback: If weaponType is not set, look it up from weapon definitions
        if (!weaponType && weaponCard?.weaponId) {
            // Common scan-hit weapons
            const scanHitWeapons = ['laser_cannon', 'plasma_cannon', 'pulse_cannon', 'phaser_array', 'disruptor_cannon', 'particle_beam'];
            const splashDamageWeapons = ['standard_missile', 'homing_missile', 'photon_torpedo', 'proximity_mine'];

            if (scanHitWeapons.includes(weaponCard.weaponId)) {
                weaponType = 'scan-hit';
            } else if (splashDamageWeapons.includes(weaponCard.weaponId)) {
                weaponType = 'splash-damage';
            }
        }

        // Determine availability and reason
        let available = true;
        let reason = '';
        let statusColor = diplomacyColor; // Use faction color for available

        if (!targetComputer.hasSubTargeting()) {
            available = false;
            reason = `Target Computer Level ${tcLevel} (requires Level 3+)`;
            statusColor = '#ff3333';
        } else if (isCelestialBody && !isSpaceStation) {
            available = false;
            reason = 'Celestial bodies don\'t have subsystems';
            statusColor = '#ff3333';
        } else if (!isEnemyShip && !isSpaceStation) {
            available = false;
            reason = 'Target must be a ship or station with subsystems';
            statusColor = '#ff3333';
        } else if (!currentWeapon || currentWeapon.isEmpty) {
            available = false;
            reason = 'No weapon selected';
            statusColor = '#ff3333';
        } else if (weaponType !== 'scan-hit') {
            available = false;
            if (weaponType === 'splash-damage') {
                reason = 'Projectile weapons don\'t support sub-targeting';
            } else {
                reason = 'Weapon type not compatible';
            }
            statusColor = '#ff3333';
        }

        // Build the HTML display
        if (available && targetComputer.hasSubTargeting() && isEnemyShip && currentTargetData.ship && !isCelestialBody) {
            // Set the enemy ship as the current target for the targeting computer
            targetComputer.currentTarget = currentTargetData.ship;
            // Only update sub-targets if we're not preventing target changes
            if (!this.sfm.targetComputerManager?.preventTargetChanges) {
                targetComputer.updateSubTargets();
            }

            if (targetComputer.currentSubTarget) {
                // Show active sub-targeting with current target
                const subTarget = targetComputer.currentSubTarget;
                // Handle both decimal (0-1) and percentage (0-100) health formats
                let healthPercent;
                if (subTarget.health <= 1) {
                    // Decimal format (0-1), multiply by 100
                    healthPercent = Math.round(subTarget.health * 100);
                } else {
                    // Already percentage format (0-100), use as-is
                    healthPercent = Math.round(subTarget.health);
                }
                // Ensure it's within valid range
                healthPercent = Math.max(0, Math.min(100, healthPercent));

                // Get accuracy and damage bonuses
                const accuracyBonus = Math.round(targetComputer.getSubTargetAccuracyBonus() * 100);
                const damageBonus = Math.round(targetComputer.getSubTargetDamageBonus() * 100);

                // Create health bar display matching main hull health style
                const healthBarSection = `
                    <div style="margin-top: 8px; padding: 4px 0;">
                        <div style="color: white; font-weight: bold; font-size: 11px; margin-bottom: 2px;">${subTarget.displayName}: ${healthPercent}%</div>
                        <div style="background-color: #333; border: 1px solid #666; height: 8px; border-radius: 2px; overflow: hidden;">
                            <div style="background-color: white; height: 100%; width: ${healthPercent}%; transition: width 0.3s ease;"></div>
                        </div>
                    </div>`;

                // Determine text and background colors based on target faction
                let textColor, backgroundColor;
                if (isEnemyShip) {
                    // White text on faction color background for hostile enemies
                    textColor = 'white';
                    backgroundColor = diplomacyColor;
                } else {
                    // Black text on faction color background for non-hostile targets
                    textColor = 'black';
                    backgroundColor = diplomacyColor;
                }

                html = `
                    <div style="
                        background-color: ${backgroundColor};
                        color: ${textColor};
                        padding: 6px;
                        border-radius: 4px;
                        margin-top: 4px;
                        font-weight: bold;
                    ">
                        <div style="font-size: 12px; margin-bottom: 2px;">SYSTEM:</div>
                        ${healthBarSection}
                        <div style="font-size: 10px; opacity: 0.8; margin-top: 6px;">
                            <span>Acc:</span> <span>+${accuracyBonus}%</span> •
                            <span>Dmg:</span> <span>+${damageBonus}%</span>
                        </div>
                        <div style="font-size: 9px; opacity: 0.8; margin-top: 2px; color: ${statusColor};">
                            ✓ &lt; &gt; to cycle sub-targets
                        </div>
                    </div>
                `;
            } else {
                // Show available sub-targets count
                const availableTargets = targetComputer.availableSubTargets.length;
                if (availableTargets > 0) {
                    // Use same faction-based color logic for available targets display
                    const textColor = isEnemyShip ? 'white' : 'black';

                    html = `
                        <div style="
                            background-color: ${diplomacyColor};
                            color: ${textColor};
                            padding: 6px;
                            border-radius: 4px;
                            margin-top: 4px;
                            font-weight: bold;
                        ">
                            <div style="font-size: 12px; margin-bottom: 2px;">SYSTEM:</div>
                            <div style="font-size: 11px; opacity: 0.8;">
                                ${availableTargets} targetable systems detected
                            </div>
                            <div style="font-size: 9px; opacity: 0.8; margin-top: 2px; color: ${statusColor};">
                                ✓ &lt; &gt; to cycle sub-targets
                            </div>
                        </div>
                    `;
                }
            }
        } else {
            // Show unavailable status with reason using faction colors
            const textColor = isEnemyShip ? 'white' : 'black';

            html = `
                <div style="
                    background-color: ${diplomacyColor};
                    color: ${textColor};
                    padding: 6px;
                    border-radius: 4px;
                    margin-top: 4px;
                    font-weight: bold;
                    border: 1px solid ${diplomacyColor};
                ">
                    <div style="font-size: 12px; margin-bottom: 2px;">SUB-TARGETING:</div>
                    <div style="font-size: 10px; opacity: 0.8;">
                        ${available ? 'Available' : 'Unavailable'}
                    </div>
                    ${reason ? `<div style="font-size: 9px; opacity: 0.7; margin-top: 2px;">
                        ${reason}
                    </div>` : ''}
                    ${available ? `<div style="font-size: 9px; opacity: 0.6; margin-top: 2px;">
                        ✓ &lt; &gt; sub-targeting
                    </div>` : ''}
                </div>
            `;
        }

        return {
            html,
            available,
            reason
        };
    }

    /**
     * Dispose of resources
     */
    dispose() {
        this.sfm = null;
    }
}
