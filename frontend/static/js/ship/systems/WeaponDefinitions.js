/**
 * WeaponDefinitions - Specific weapon card definitions
 * Based on docs/weapons_system_spec.md
 * Defines all available weapon cards with their properties
 */

import { ScanHitWeapon, SplashDamageWeapon } from './WeaponCard.js';

export class WeaponDefinitions {
    /**
     * Get all weapon definitions
     * @returns {Object} Map of weapon definitions
     */
    static getAllWeaponDefinitions() {
        return {
            // Scan-Hit Weapons (Direct Fire Energy Weapons)
            laser_cannon: {
                weaponId: 'laser_cannon',
                name: 'Laser Cannon',
                weaponType: 'scan-hit',
                damage: 60,
                cooldownTime: 2.0, // seconds
                range: 24000, // meters - increased 20% from 20000m (20km -> 24km)
                autofireEnabled: true, // UPDATED: All weapons support autofire
                accuracy: 0.95,
                energyCost: 10,
                targetLockRequired: false,
                specialProperties: {
                    beamColor: 'red',
                    chargeTime: 0.1
                }
            },
            
            plasma_cannon: {
                weaponId: 'plasma_cannon',
                name: 'Plasma Cannon',
                weaponType: 'scan-hit',
                damage: 85,
                cooldownTime: 2.5, // seconds
                range: 38400, // meters - increased 20% from 32000m (32km -> 38.4km)
                autofireEnabled: true, // UPDATED: All weapons support autofire
                accuracy: 0.80,
                energyCost: 20,
                targetLockRequired: false,
                specialProperties: {
                    penetration: true,
                    beamColor: 'blue',
                    chargeTime: 0.3
                }
            },
            
            pulse_cannon: {
                weaponId: 'pulse_cannon',
                name: 'Pulse Cannon',
                weaponType: 'scan-hit',
                damage: 75,
                cooldownTime: 3.0, // seconds - doubled from 1.5s (burst fire)
                range: 28800, // meters - increased 20% from 24000m (24km -> 28.8km)
                autofireEnabled: true, // UPDATED: All weapons support autofire
                accuracy: 0.90,
                energyCost: 15,
                targetLockRequired: false,
                specialProperties: {
                    burstFire: true,
                    burstCount: 3,
                    beamColor: 'yellow',
                    chargeTime: 0.05
                }
            },
            
            phaser_array: {
                weaponId: 'phaser_array',
                name: 'Phaser Array',
                weaponType: 'scan-hit',
                damage: 90,
                cooldownTime: 2.0, // seconds
                range: 36000, // meters - increased 20% from 30000m (30km -> 36km)
                autofireEnabled: true, // UPDATED: All weapons support autofire
                accuracy: 0.88,
                energyCost: 25,
                targetLockRequired: false,
                specialProperties: {
                    wideBeam: true,
                    areaEffect: 20, // meters
                    beamColor: 'orange',
                    chargeTime: 0.2
                }
            },
            
            // Splash-Damage Weapons (Projectile-Based)
            // No ammo required - work like laser weapons with cooldowns
            standard_missile: {
                weaponId: 'standard_missile',
                name: 'Standard Missile',
                weaponType: 'splash-damage',
                damage: 150,
                cooldownTime: 2.5, // seconds
                range: 12000, // meters - good medium range
                autofireEnabled: true, // UPDATED: All weapons support autofire
                accuracy: 1.0, // Missiles don't miss if fired properly
                energyCost: 8, // Moderate energy cost
                blastRadius: 0, // NO SPLASH DAMAGE - direct hit only
                homingCapability: false,
                targetLockRequired: false, // CORRECTED: Non-homing projectiles fire toward crosshairs, no target lock needed
                flightRange: 12000, // meters - good medium range
                turnRate: 0, // No turning
                specialProperties: {
                    explosionType: 'kinetic',
                    armorPiercing: true,
                    directHitOnly: true // Flag to indicate this is direct-hit projectile
                }
            },
            
            homing_missile: {
                weaponId: 'homing_missile',
                name: 'Homing Missile',
                weaponType: 'splash-damage',
                damage: 180,
                cooldownTime: 2.5, // seconds
                range: 8400, // meters - increased 20% from 7000m (7km -> 8.4km)
                autofireEnabled: true, // Homing missiles can autofire
                accuracy: 1.0,
                energyCost: 8,
                blastRadius: 45, // meters
                homingCapability: true,
                targetLockRequired: true,
                flightRange: 8400, // increased 20% from 7000m (7km -> 8.4km)
                turnRate: 120, // degrees per second - faster turning
                specialProperties: {
                    trackingArc: 60, // degrees
                    explosionType: 'kinetic',
                    armorPiercing: true
                }
            },
            
            photon_torpedo: {
                weaponId: 'photon_torpedo',
                name: 'Photon Torpedo',
                weaponType: 'splash-damage',
                damage: 320,
                cooldownTime: 4.0, // seconds
                range: 20000, // meters - increased from 6000m to match targeting system crosshair range (20km)
                autofireEnabled: true, // UPDATED: All weapons support autofire
                accuracy: 1.0,
                energyCost: 12,
                blastRadius: 20, // meters (reduced by 75% from original 80m)
                homingCapability: false,
                targetLockRequired: false, // CORRECTED: Torpedoes fire toward crosshairs, no target lock needed
                flightRange: 20000, // increased from 6000m to match targeting system crosshair range (20km)
                turnRate: 0, // No turning
                specialProperties: {
                    explosionType: 'photon',
                    armorPiercing: true,
                    shieldPiercing: true // Photon torpedoes pierce shields
                }
            },
            
            proximity_mine: {
                weaponId: 'proximity_mine',
                name: 'Proximity Mine',
                weaponType: 'splash-damage',
                damage: 150,
                cooldownTime: 3.5, // seconds
                range: 1200, // deployment range - increased 20% from 1000m (1km -> 1.2km)
                autofireEnabled: true, // UPDATED: All weapons support autofire
                accuracy: 1.0,
                energyCost: 3,
                blastRadius: 20, // meters (reduced by 75% from original 80m)
                homingCapability: false,
                targetLockRequired: false, // Mines don't need target lock
                flightRange: 0, // Deployed in place
                turnRate: 0,
                specialProperties: {
                    deploymentType: 'stationary',
                    triggerRange: 50, // meters
                    timer: 10000, // 10 seconds before auto-detonation
                    explosionType: 'plasma'
                }
            }
        };
    }
    
    /**
     * Create weapon card instance from definition
     * @param {string} weaponId Weapon definition ID
     * @returns {WeaponCard} Weapon card instance
     */
    static createWeaponCard(weaponId) {
        const definitions = WeaponDefinitions.getAllWeaponDefinitions();
        const weaponDef = definitions[weaponId];
        
        if (!weaponDef) {
            console.error(`Unknown weapon ID: ${weaponId}`);
            return null;
        }
        
        // Create appropriate weapon type
        if (weaponDef.weaponType === 'scan-hit') {
            return new ScanHitWeapon(weaponDef);
        } else if (weaponDef.weaponType === 'splash-damage') {
            return new SplashDamageWeapon(weaponDef);
        }
        
        console.error(`Unknown weapon type: ${weaponDef.weaponType}`);
        return null;
    }
    
    /**
     * Get weapon definitions by type
     * @param {string} weaponType 'scan-hit' or 'splash-damage'
     * @returns {Object} Filtered weapon definitions
     */
    static getWeaponsByType(weaponType) {
        const allWeapons = WeaponDefinitions.getAllWeaponDefinitions();
        const filtered = {};
        
        for (const [id, weapon] of Object.entries(allWeapons)) {
            if (weapon.weaponType === weaponType) {
                filtered[id] = weapon;
            }
        }
        
        return filtered;
    }
    
    /**
     * Get scan-hit weapon definitions
     * @returns {Object} Scan-hit weapon definitions
     */
    static getScanHitWeapons() {
        return WeaponDefinitions.getWeaponsByType('scan-hit');
    }
    
    /**
     * Get splash-damage weapon definitions
     * @returns {Object} Splash-damage weapon definitions
     */
    static getSplashDamageWeapons() {
        return WeaponDefinitions.getWeaponsByType('splash-damage');
    }
    
    /**
     * Get weapons that support autofire
     * @returns {Object} Autofire-enabled weapon definitions
     */
    static getAutofireWeapons() {
        const allWeapons = WeaponDefinitions.getAllWeaponDefinitions();
        const autofireWeapons = {};
        
        for (const [id, weapon] of Object.entries(allWeapons)) {
            if (weapon.autofireEnabled) {
                autofireWeapons[id] = weapon;
            }
        }
        
        return autofireWeapons;
    }
    
    /**
     * Get weapon definition by ID
     * @param {string} weaponId Weapon ID
     * @returns {Object|null} Weapon definition or null if not found
     */
    static getWeaponDefinition(weaponId) {
        const definitions = WeaponDefinitions.getAllWeaponDefinitions();
        return definitions[weaponId] || null;
    }
    
    /**
     * Get all weapon IDs
     * @returns {Array} Array of weapon IDs
     */
    static getAllWeaponIds() {
        return Object.keys(WeaponDefinitions.getAllWeaponDefinitions());
    }
    
    /**
     * Get weapon display data for UI
     * @param {string} weaponId Weapon ID
     * @returns {Object} Display data for UI
     */
    static getWeaponDisplayData(weaponId) {
        const weapon = WeaponDefinitions.getWeaponDefinition(weaponId);
        if (!weapon) return null;
        
        return {
            id: weapon.weaponId,
            name: weapon.name,
            type: weapon.weaponType,
            damage: weapon.damage,
            cooldown: weapon.cooldownTime,
            range: weapon.range,
            autofire: weapon.autofireEnabled,
            energy: weapon.energyCost,
            blastRadius: weapon.blastRadius || 0,
            homing: weapon.homingCapability || false,
            targetLock: weapon.targetLockRequired,
            description: WeaponDefinitions.generateWeaponDescription(weapon)
        };
    }
    
    /**
     * Generate weapon description for UI
     * @param {Object} weapon Weapon definition
     * @returns {string} Weapon description
     */
    static generateWeaponDescription(weapon) {
        let desc = `${weapon.damage} damage, ${weapon.cooldownTime}s cooldown, ${weapon.range}m range`;
        
        if (weapon.weaponType === 'scan-hit') {
            desc += `, ${Math.round(weapon.accuracy * 100)}% accuracy`;
        }
        
        if (weapon.weaponType === 'splash-damage') {
            desc += `, ${weapon.blastRadius}m blast radius`;
            if (weapon.homingCapability) {
                desc += ', homing';
            }
        }
        
        if (weapon.autofireEnabled) {
            desc += ', autofire';
        }
        
        if (weapon.targetLockRequired) {
            desc += ', requires target lock';
        }
        
        return desc;
    }
} 