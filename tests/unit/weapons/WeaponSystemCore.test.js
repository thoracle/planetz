/**
 * WeaponSystemCore.test.js - Comprehensive Unit Tests for Weapon System
 * Part of StarF*ckers Pre-Refactoring Test Foundation
 * Phase 1: Characterization Tests for Combat System
 */

import { jest } from '@jest/globals';

// Mock imports
jest.unstable_mockModule('../../../frontend/static/js/ship/systems/WeaponEffectsManager.js', () => ({
    WeaponEffectsManager: jest.fn().mockImplementation(() => ({
        initialize: jest.fn().mockResolvedValue(),
        playSound: jest.fn(),
        createMuzzleFlash: jest.fn(),
        createLaserBeam: jest.fn(),
        createExplosion: jest.fn(),
        update: jest.fn(),
        cleanup: jest.fn()
    }))
}));

jest.unstable_mockModule('../../../frontend/static/js/ship/ProjectileManager.js', () => ({
    default: jest.fn().mockImplementation(() => ({
        createProjectile: jest.fn(),
        update: jest.fn(),
        getActiveProjectiles: jest.fn().mockReturnValue([]),
        cleanup: jest.fn()
    }))
}));

const WeaponSystemCore = (await import('../../../frontend/static/js/ship/systems/WeaponSystemCore.js')).default;

describe('WeaponSystemCore - Core Functionality', () => {
    let weaponSystem;
    let mockShip;
    let mockScene;
    let mockCamera;

    beforeEach(() => {
        // Create mock ship
        mockShip = global.testUtils.createMockShip({
            consumeEnergy: jest.fn().mockReturnValue(true),
            hasEnergy: jest.fn().mockReturnValue(true),
            position: new global.THREE.Vector3(0, 0, 0)
        });

        // Create mock Three.js objects
        mockScene = new global.THREE.Scene();
        mockCamera = new global.THREE.PerspectiveCamera();

        // Create weapon system
        weaponSystem = new WeaponSystemCore(mockShip, mockScene, mockCamera);
    });

    describe('Weapon System Initialization', () => {
        test('creates weapon system with correct properties', () => {
            expect(weaponSystem.ship).toBe(mockShip);
            expect(weaponSystem.scene).toBe(mockScene);
            expect(weaponSystem.camera).toBe(mockCamera);
            expect(weaponSystem.weaponSlots).toEqual([]);
            expect(weaponSystem.activeSlotIndex).toBe(0);
            expect(weaponSystem.lockedTarget).toBeNull();
            expect(weaponSystem.isAutofireOn).toBe(false);
        });

        test('initializes weapon effects manager', async () => {
            await weaponSystem.initialize();
            
            expect(weaponSystem.weaponEffectsManager).toBeDefined();
        });

        test('initializes projectile manager', async () => {
            await weaponSystem.initialize();
            
            expect(weaponSystem.projectileManager).toBeDefined();
        });
    });

    describe('Weapon Slot Management', () => {
        test('addWeapon adds weapon to empty slot', () => {
            const mockWeapon = {
                name: 'Test Laser',
                type: 'laser',
                damage: 10,
                energyCost: 5,
                cooldown: 1000,
                range: 2000,
                currentCooldown: 0
            };

            weaponSystem.addWeapon(mockWeapon);

            expect(weaponSystem.weaponSlots).toContain(mockWeapon);
            expect(weaponSystem.weaponSlots.length).toBe(1);
        });

        test('addWeapon does not exceed max weapon slots', () => {
            const maxSlots = weaponSystem.maxWeaponSlots;
            
            // Fill all slots
            for (let i = 0; i < maxSlots + 2; i++) {
                weaponSystem.addWeapon({
                    name: `Weapon ${i}`,
                    type: 'laser',
                    damage: 10,
                    energyCost: 5,
                    cooldown: 1000,
                    range: 2000,
                    currentCooldown: 0
                });
            }

            expect(weaponSystem.weaponSlots.length).toBe(maxSlots);
        });

        test('removeWeapon removes weapon from slot', () => {
            const weapon1 = { name: 'Weapon 1', type: 'laser' };
            const weapon2 = { name: 'Weapon 2', type: 'missile' };

            weaponSystem.addWeapon(weapon1);
            weaponSystem.addWeapon(weapon2);
            weaponSystem.removeWeapon(0);

            expect(weaponSystem.weaponSlots[0]).toBe(weapon2);
            expect(weaponSystem.weaponSlots.length).toBe(1);
        });

        test('cycleActiveWeapon changes active weapon slot', () => {
            weaponSystem.addWeapon({ name: 'Weapon 1', type: 'laser' });
            weaponSystem.addWeapon({ name: 'Weapon 2', type: 'missile' });

            expect(weaponSystem.activeSlotIndex).toBe(0);

            weaponSystem.cycleActiveWeapon();
            expect(weaponSystem.activeSlotIndex).toBe(1);

            weaponSystem.cycleActiveWeapon();
            expect(weaponSystem.activeSlotIndex).toBe(0); // Should wrap around
        });

        test('getActiveWeapon returns current active weapon', () => {
            const weapon1 = { name: 'Active Weapon', type: 'laser' };
            const weapon2 = { name: 'Inactive Weapon', type: 'missile' };

            weaponSystem.addWeapon(weapon1);
            weaponSystem.addWeapon(weapon2);

            expect(weaponSystem.getActiveWeapon()).toBe(weapon1);

            weaponSystem.cycleActiveWeapon();
            expect(weaponSystem.getActiveWeapon()).toBe(weapon2);
        });
    });

    describe('Weapon Firing', () => {
        let mockWeapon;

        beforeEach(() => {
            mockWeapon = {
                name: 'Test Laser',
                type: 'laser',
                damage: 25,
                energyCost: 10,
                cooldown: 1000,
                range: 2000,
                currentCooldown: 0,
                projectileType: 'energy'
            };
            weaponSystem.addWeapon(mockWeapon);
        });

        test('fireActiveWeapon fires when conditions are met', () => {
            const target = {
                position: new global.THREE.Vector3(100, 0, 0),
                health: 100,
                takeDamage: jest.fn()
            };

            const result = weaponSystem.fireActiveWeapon(target);

            expect(result).toBe(true);
            expect(mockShip.consumeEnergy).toHaveBeenCalledWith(10);
            expect(mockWeapon.currentCooldown).toBe(1000);
        });

        test('fireActiveWeapon fails when insufficient energy', () => {
            mockShip.hasEnergy.mockReturnValue(false);
            mockShip.consumeEnergy.mockReturnValue(false);

            const target = {
                position: new global.THREE.Vector3(100, 0, 0)
            };

            const result = weaponSystem.fireActiveWeapon(target);

            expect(result).toBe(false);
        });

        test('fireActiveWeapon fails when weapon on cooldown', () => {
            mockWeapon.currentCooldown = 500;

            const target = {
                position: new global.THREE.Vector3(100, 0, 0)
            };

            const result = weaponSystem.fireActiveWeapon(target);

            expect(result).toBe(false);
        });

        test('fireActiveWeapon fails when target out of range', () => {
            const target = {
                position: new global.THREE.Vector3(5000, 0, 0) // Beyond weapon range
            };

            const result = weaponSystem.fireActiveWeapon(target);

            expect(result).toBe(false);
        });

        test('fireActiveWeapon handles energy weapons', () => {
            mockWeapon.projectileType = 'energy';
            
            const target = {
                position: new global.THREE.Vector3(100, 0, 0),
                health: 100,
                takeDamage: jest.fn()
            };

            weaponSystem.fireActiveWeapon(target);

            expect(weaponSystem.weaponEffectsManager.createLaserBeam).toHaveBeenCalled();
        });

        test('fireActiveWeapon handles projectile weapons', () => {
            mockWeapon.projectileType = 'projectile';
            mockWeapon.type = 'missile';
            
            const target = {
                position: new global.THREE.Vector3(100, 0, 0),
                health: 100,
                takeDamage: jest.fn()
            };

            weaponSystem.fireActiveWeapon(target);

            expect(weaponSystem.projectileManager.createProjectile).toHaveBeenCalled();
        });
    });

    describe('Autofire System', () => {
        let mockWeapon;
        let mockTarget;

        beforeEach(() => {
            mockWeapon = {
                name: 'Auto Laser',
                type: 'laser',
                damage: 15,
                energyCost: 8,
                cooldown: 500,
                range: 1500,
                currentCooldown: 0,
                projectileType: 'energy'
            };
            weaponSystem.addWeapon(mockWeapon);

            mockTarget = {
                position: new global.THREE.Vector3(200, 0, 0),
                health: 100,
                takeDamage: jest.fn()
            };
        });

        test('toggleAutofire changes autofire state', () => {
            expect(weaponSystem.isAutofireOn).toBe(false);

            weaponSystem.toggleAutofire();
            expect(weaponSystem.isAutofireOn).toBe(true);

            weaponSystem.toggleAutofire();
            expect(weaponSystem.isAutofireOn).toBe(false);
        });

        test('update fires automatically when autofire is on', () => {
            weaponSystem.toggleAutofire();
            weaponSystem.setTarget(mockTarget);

            const fireActiveSpy = jest.spyOn(weaponSystem, 'fireActiveWeapon');

            weaponSystem.update(0.016); // One frame

            expect(fireActiveSpy).toHaveBeenCalledWith(mockTarget);
        });

        test('update does not fire when autofire is off', () => {
            weaponSystem.setTarget(mockTarget);

            const fireActiveSpy = jest.spyOn(weaponSystem, 'fireActiveWeapon');

            weaponSystem.update(0.016);

            expect(fireActiveSpy).not.toHaveBeenCalled();
        });

        test('update does not fire when no target', () => {
            weaponSystem.toggleAutofire();

            const fireActiveSpy = jest.spyOn(weaponSystem, 'fireActiveWeapon');

            weaponSystem.update(0.016);

            expect(fireActiveSpy).not.toHaveBeenCalled();
        });
    });

    describe('Targeting System', () => {
        test('setTarget sets locked target', () => {
            const target = {
                position: new global.THREE.Vector3(100, 0, 0),
                name: 'Enemy Ship'
            };

            weaponSystem.setTarget(target);

            expect(weaponSystem.lockedTarget).toBe(target);
        });

        test('clearTarget removes locked target', () => {
            const target = {
                position: new global.THREE.Vector3(100, 0, 0)
            };

            weaponSystem.setTarget(target);
            weaponSystem.clearTarget();

            expect(weaponSystem.lockedTarget).toBeNull();
        });

        test('hasTarget returns correct boolean', () => {
            expect(weaponSystem.hasTarget()).toBe(false);

            const target = {
                position: new global.THREE.Vector3(100, 0, 0)
            };
            weaponSystem.setTarget(target);

            expect(weaponSystem.hasTarget()).toBe(true);
        });

        test('isTargetInRange checks target distance', () => {
            const nearTarget = {
                position: new global.THREE.Vector3(100, 0, 0)
            };
            const farTarget = {
                position: new global.THREE.Vector3(5000, 0, 0)
            };

            const weapon = {
                range: 2000
            };
            weaponSystem.addWeapon(weapon);

            expect(weaponSystem.isTargetInRange(nearTarget)).toBe(true);
            expect(weaponSystem.isTargetInRange(farTarget)).toBe(false);
        });
    });

    describe('Cooldown Management', () => {
        test('update reduces weapon cooldowns', () => {
            const weapon = {
                name: 'Cooling Weapon',
                currentCooldown: 1000
            };
            weaponSystem.addWeapon(weapon);

            weaponSystem.update(0.5); // 500ms

            expect(weapon.currentCooldown).toBe(500);
        });

        test('cooldowns do not go below zero', () => {
            const weapon = {
                name: 'Cooling Weapon',
                currentCooldown: 200
            };
            weaponSystem.addWeapon(weapon);

            weaponSystem.update(0.5); // 500ms

            expect(weapon.currentCooldown).toBe(0);
        });

        test('isWeaponReady checks cooldown status', () => {
            const readyWeapon = {
                currentCooldown: 0
            };
            const coolingWeapon = {
                currentCooldown: 500
            };

            expect(weaponSystem.isWeaponReady(readyWeapon)).toBe(true);
            expect(weaponSystem.isWeaponReady(coolingWeapon)).toBe(false);
        });
    });

    describe('Weapon Status', () => {
        test('getWeaponStatus returns complete weapon information', () => {
            const weapon = {
                name: 'Status Weapon',
                type: 'laser',
                damage: 20,
                energyCost: 12,
                cooldown: 800,
                range: 1800,
                currentCooldown: 200
            };
            weaponSystem.addWeapon(weapon);

            const status = weaponSystem.getWeaponStatus();

            expect(status).toHaveProperty('weaponSlots');
            expect(status).toHaveProperty('activeSlotIndex', 0);
            expect(status).toHaveProperty('isAutofireOn', false);
            expect(status).toHaveProperty('hasTarget', false);
            expect(status.weaponSlots[0]).toMatchObject({
                name: 'Status Weapon',
                type: 'laser',
                damage: 20,
                energyCost: 12,
                cooldown: 800,
                range: 1800,
                currentCooldown: 200,
                isReady: false
            });
        });

        test('getAllWeapons returns all equipped weapons', () => {
            const weapon1 = { name: 'Weapon 1', type: 'laser' };
            const weapon2 = { name: 'Weapon 2', type: 'missile' };

            weaponSystem.addWeapon(weapon1);
            weaponSystem.addWeapon(weapon2);

            const allWeapons = weaponSystem.getAllWeapons();

            expect(allWeapons).toContain(weapon1);
            expect(allWeapons).toContain(weapon2);
            expect(allWeapons.length).toBe(2);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        test('handles firing with no weapons equipped', () => {
            const target = {
                position: new global.THREE.Vector3(100, 0, 0)
            };

            const result = weaponSystem.fireActiveWeapon(target);

            expect(result).toBe(false);
        });

        test('handles cycling with no weapons', () => {
            expect(() => weaponSystem.cycleActiveWeapon()).not.toThrow();
            expect(weaponSystem.activeSlotIndex).toBe(0);
        });

        test('handles invalid weapon slot index', () => {
            weaponSystem.activeSlotIndex = 99;

            expect(weaponSystem.getActiveWeapon()).toBeUndefined();
        });

        test('handles null target in firing', () => {
            const weapon = {
                name: 'Test Weapon',
                energyCost: 5,
                currentCooldown: 0
            };
            weaponSystem.addWeapon(weapon);

            const result = weaponSystem.fireActiveWeapon(null);

            expect(result).toBe(false);
        });

        test('handles weapon removal during autofire', () => {
            const weapon = {
                name: 'Auto Weapon',
                energyCost: 5,
                currentCooldown: 0
            };
            weaponSystem.addWeapon(weapon);
            weaponSystem.toggleAutofire();

            weaponSystem.removeWeapon(0);

            expect(() => weaponSystem.update(0.016)).not.toThrow();
        });
    });

    describe('Performance Tests', () => {
        test('weapon firing is efficient', () => {
            const weapon = {
                name: 'Performance Weapon',
                type: 'laser',
                damage: 10,
                energyCost: 5,
                cooldown: 100,
                range: 2000,
                currentCooldown: 0,
                projectileType: 'energy'
            };
            weaponSystem.addWeapon(weapon);

            const target = {
                position: new global.THREE.Vector3(100, 0, 0),
                takeDamage: jest.fn()
            };

            const startTime = performance.now();
            for (let i = 0; i < 100; i++) {
                weapon.currentCooldown = 0; // Reset for each test
                weaponSystem.fireActiveWeapon(target);
            }
            const endTime = performance.now();

            expect(endTime - startTime).toBeLessThan(50); // Should be very fast
        });

        test('update cycle with multiple weapons is efficient', () => {
            // Add multiple weapons with different cooldowns
            for (let i = 0; i < 4; i++) {
                weaponSystem.addWeapon({
                    name: `Weapon ${i}`,
                    currentCooldown: 1000 - (i * 100)
                });
            }

            const startTime = performance.now();
            weaponSystem.update(0.016); // 60 FPS frame time
            const endTime = performance.now();

            expect(endTime - startTime).toBeLessThan(5); // Should complete quickly
        });
    });
}); 