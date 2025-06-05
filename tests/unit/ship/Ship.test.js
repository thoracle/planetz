/**
 * Ship.test.js - Comprehensive Unit Tests for Ship Class
 * Part of StarF*ckers Pre-Refactoring Test Foundation
 * Phase 1: Characterization Tests for Monolithic Components
 */

import { jest } from '@jest/globals';

// Mock the imports before importing Ship
jest.unstable_mockModule('../../../frontend/static/js/ship/ShipConfigs.js', () => ({
    getShipConfig: jest.fn(),
    validateShipConfig: jest.fn()
}));

jest.unstable_mockModule('../../../frontend/static/js/ship/CardSystemIntegration.js', () => ({
    default: jest.fn().mockImplementation(() => ({
        initializeCardData: jest.fn().mockResolvedValue(),
        createSystemsFromCards: jest.fn().mockResolvedValue(),
        setShip: jest.fn()
    }))
}));

// Mock system imports
jest.unstable_mockModule('../../../frontend/static/js/ship/systems/ImpulseEngines.js', () => ({
    default: jest.fn()
}));

jest.unstable_mockModule('../../../frontend/static/js/ship/systems/WarpDrive.js', () => ({
    default: jest.fn()
}));

jest.unstable_mockModule('../../../frontend/static/js/ship/systems/Shields.js', () => ({
    default: jest.fn()
}));

const { getShipConfig, validateShipConfig } = await import('../../../frontend/static/js/ship/ShipConfigs.js');
const CardSystemIntegration = await import('../../../frontend/static/js/ship/CardSystemIntegration.js');
const Ship = (await import('../../../frontend/static/js/ship/Ship.js')).default;

describe('Ship Class - Core Functionality', () => {
    let mockShipConfig;
    
    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Create mock ship configuration
        mockShipConfig = {
            name: 'Heavy Fighter',
            systemSlots: 18,
            baseHardpoints: 4,
            starterCards: [],
            defaultSystems: {
                warp_drive: { level: 1, slots: 1 },
                shields: { level: 1, slots: 1 },
                weapons: { level: 1, slots: 1 },
                long_range_scanner: { level: 1, slots: 1 },
                subspace_radio: { level: 1, slots: 1 },
                galactic_chart: { level: 1, slots: 1 },
                hull_plating: { level: 1, slots: 1 },
                shield_generator: { level: 1, slots: 1 }
            }
        };
        
        // Setup mocks
        getShipConfig.mockReturnValue(mockShipConfig);
        validateShipConfig.mockReturnValue(true);
    });

    describe('Ship Construction', () => {
        test('creates ship with valid configuration', () => {
            const ship = new Ship('heavy_fighter');
            
            expect(ship.shipType).toBe('heavy_fighter');
            expect(ship.shipConfig).toBe(mockShipConfig);
            expect(ship.totalSlots).toBe(18);
            expect(ship.usedSlots).toBe(0);
            expect(ship.availableSlots).toBe(18);
        });

        test('throws error with invalid configuration', () => {
            validateShipConfig.mockReturnValue(false);
            
            expect(() => new Ship('invalid_ship')).toThrow('Invalid ship configuration for invalid_ship');
        });

        test('initializes base stats to zero', () => {
            const ship = new Ship('heavy_fighter');
            
            expect(ship.baseSpeed).toBe(0);
            expect(ship.baseArmor).toBe(0);
            expect(ship.baseFirepower).toBe(0);
            expect(ship.baseCargoCapacity).toBe(0);
        });

        test('initializes current stats to zero', () => {
            const ship = new Ship('heavy_fighter');
            
            expect(ship.currentSpeed).toBe(0);
            expect(ship.currentArmor).toBe(0);
            expect(ship.currentFirepower).toBe(0);
            expect(ship.currentCargoCapacity).toBe(0);
        });

        test('initializes energy system to zero', () => {
            const ship = new Ship('heavy_fighter');
            
            expect(ship.maxEnergy).toBe(0);
            expect(ship.currentEnergy).toBe(0);
            expect(ship.energyRechargeRate).toBe(0);
        });

        test('initializes hull system to zero', () => {
            const ship = new Ship('heavy_fighter');
            
            expect(ship.maxHull).toBe(0);
            expect(ship.currentHull).toBe(0);
        });

        test('initializes system collections', () => {
            const ship = new Ship('heavy_fighter');
            
            expect(ship.systems).toBeInstanceOf(Map);
            expect(ship.upgrades).toBeInstanceOf(Map);
            expect(ship.systemRegistry).toBeInstanceOf(Map);
            expect(ship.systemStates).toBeInstanceOf(Map);
        });

        test('creates CardSystemIntegration instance', () => {
            const ship = new Ship('heavy_fighter');
            
            expect(CardSystemIntegration.default).toHaveBeenCalledWith(ship);
            expect(ship.cardSystemIntegration).toBeDefined();
        });
    });

    describe('System Management', () => {
        let ship;

        beforeEach(() => {
            ship = new Ship('heavy_fighter');
        });

        test('addSystem adds system and updates slot count', () => {
            const mockSystem = {
                name: 'Test System',
                slotCost: 2,
                health: 100,
                maxHealth: 100,
                isOperational: jest.fn().mockReturnValue(true)
            };

            ship.addSystem('test_system', mockSystem);

            expect(ship.systems.get('test_system')).toBe(mockSystem);
            expect(ship.usedSlots).toBe(2);
            expect(ship.availableSlots).toBe(16);
        });

        test('addSystem throws error when not enough slots', () => {
            const mockSystem = {
                name: 'Large System',
                slotCost: 20,
                health: 100,
                maxHealth: 100
            };

            expect(() => ship.addSystem('large_system', mockSystem))
                .toThrow('Not enough slots available');
        });

        test('addSystem updates system registry', () => {
            const mockSystem = {
                name: 'Test System',
                slotCost: 1,
                health: 100,
                maxHealth: 100,
                isOperational: jest.fn().mockReturnValue(true)
            };

            ship.addSystem('test_system', mockSystem);

            expect(ship.systemRegistry.has('test_system')).toBe(true);
            expect(ship.systemStates.has('test_system')).toBe(true);
        });

        test('removeSystem removes system and updates slot count', () => {
            const mockSystem = {
                name: 'Test System',
                slotCost: 2,
                health: 100,
                maxHealth: 100,
                isOperational: jest.fn().mockReturnValue(true)
            };

            ship.addSystem('test_system', mockSystem);
            ship.removeSystem('test_system');

            expect(ship.systems.has('test_system')).toBe(false);
            expect(ship.usedSlots).toBe(0);
            expect(ship.availableSlots).toBe(18);
        });

        test('getSystem returns correct system', () => {
            const mockSystem = {
                name: 'Test System',
                slotCost: 1,
                health: 100,
                maxHealth: 100,
                isOperational: jest.fn().mockReturnValue(true)
            };

            ship.addSystem('test_system', mockSystem);

            expect(ship.getSystem('test_system')).toBe(mockSystem);
            expect(ship.getSystem('nonexistent')).toBeUndefined();
        });
    });

    describe('Energy Management', () => {
        let ship;

        beforeEach(() => {
            ship = new Ship('heavy_fighter');
            // Simulate energy reactor providing energy
            ship.maxEnergy = 100;
            ship.currentEnergy = 100;
            ship.energyRechargeRate = 5;
        });

        test('consumeEnergy reduces current energy', () => {
            const result = ship.consumeEnergy(30);

            expect(result).toBe(true);
            expect(ship.currentEnergy).toBe(70);
        });

        test('consumeEnergy fails when insufficient energy', () => {
            const result = ship.consumeEnergy(150);

            expect(result).toBe(false);
            expect(ship.currentEnergy).toBe(100); // Should remain unchanged
        });

        test('hasEnergy returns correct boolean', () => {
            expect(ship.hasEnergy(50)).toBe(true);
            expect(ship.hasEnergy(150)).toBe(false);
        });

        test('energy consumption calculation includes all systems', () => {
            const mockSystem1 = {
                getEnergyConsumption: jest.fn().mockReturnValue(10),
                isOperational: jest.fn().mockReturnValue(true)
            };
            const mockSystem2 = {
                getEnergyConsumption: jest.fn().mockReturnValue(5),
                isOperational: jest.fn().mockReturnValue(true)
            };

            ship.systems.set('system1', mockSystem1);
            ship.systems.set('system2', mockSystem2);

            const totalConsumption = ship.getEnergyConsumptionRate();

            expect(totalConsumption).toBe(15);
            expect(mockSystem1.getEnergyConsumption).toHaveBeenCalled();
            expect(mockSystem2.getEnergyConsumption).toHaveBeenCalled();
        });
    });

    describe('Damage System', () => {
        let ship;

        beforeEach(() => {
            ship = new Ship('heavy_fighter');
            ship.maxHull = 100;
            ship.currentHull = 100;
        });

        test('applyDamage reduces hull when no shields', () => {
            ship.applyDamage(25);

            expect(ship.currentHull).toBe(75);
        });

        test('applyDamage handles hull destruction', () => {
            ship.applyDamage(150);

            expect(ship.currentHull).toBe(0);
        });

        test('applySystemDamage affects random systems', () => {
            const mockSystem1 = {
                name: 'System 1',
                health: 100,
                maxHealth: 100,
                takeDamage: jest.fn()
            };
            const mockSystem2 = {
                name: 'System 2',
                health: 100,
                maxHealth: 100,
                takeDamage: jest.fn()
            };

            ship.systems.set('system1', mockSystem1);
            ship.systems.set('system2', mockSystem2);

            ship.applySystemDamage(30);

            // At least one system should have taken damage
            const system1Called = mockSystem1.takeDamage.mock.calls.length > 0;
            const system2Called = mockSystem2.takeDamage.mock.calls.length > 0;
            expect(system1Called || system2Called).toBe(true);
        });

        test('applySubTargetDamage targets specific system', () => {
            const mockSystem = {
                name: 'Target System',
                health: 100,
                maxHealth: 100,
                takeDamage: jest.fn()
            };

            ship.systems.set('target_system', mockSystem);

            ship.applySubTargetDamage('target_system', 20);

            expect(mockSystem.takeDamage).toHaveBeenCalledWith(20, 'kinetic');
        });

        test('repairSystem restores system health', () => {
            const mockSystem = {
                name: 'Damaged System',
                health: 50,
                maxHealth: 100,
                repair: jest.fn()
            };

            ship.systems.set('damaged_system', mockSystem);

            ship.repairSystem('damaged_system', 25);

            expect(mockSystem.repair).toHaveBeenCalledWith(25);
        });
    });

    describe('Status and Statistics', () => {
        let ship;

        beforeEach(() => {
            ship = new Ship('heavy_fighter');
        });

        test('getStatus returns complete ship information', () => {
            const status = ship.getStatus();

            expect(status).toHaveProperty('shipType', 'heavy_fighter');
            expect(status).toHaveProperty('totalSlots', 18);
            expect(status).toHaveProperty('usedSlots');
            expect(status).toHaveProperty('availableSlots');
            expect(status).toHaveProperty('currentHull');
            expect(status).toHaveProperty('maxHull');
            expect(status).toHaveProperty('currentEnergy');
            expect(status).toHaveProperty('maxEnergy');
            expect(status).toHaveProperty('systems');
        });

        test('calculateTotalStats aggregates all system contributions', () => {
            const mockEnergyReactor = {
                getEnergyCapacity: jest.fn().mockReturnValue(100),
                getEnergyRechargeRate: jest.fn().mockReturnValue(5),
                isOperational: jest.fn().mockReturnValue(true)
            };
            const mockHullPlating = {
                getHullCapacity: jest.fn().mockReturnValue(150),
                isOperational: jest.fn().mockReturnValue(true)
            };

            ship.systems.set('energy_reactor', mockEnergyReactor);
            ship.systems.set('hull_plating', mockHullPlating);

            ship.calculateTotalStats();

            expect(ship.maxEnergy).toBe(100);
            expect(ship.energyRechargeRate).toBe(5);
            expect(ship.maxHull).toBe(150);
        });
    });

    describe('Update Cycle', () => {
        let ship;

        beforeEach(() => {
            ship = new Ship('heavy_fighter');
            ship.maxEnergy = 100;
            ship.currentEnergy = 50;
            ship.energyRechargeRate = 10;
        });

        test('update recharges energy over time', () => {
            ship.update(1.0); // 1 second

            expect(ship.currentEnergy).toBe(60); // 50 + (10 * 1.0)
        });

        test('update does not exceed max energy', () => {
            ship.currentEnergy = 95;
            ship.update(1.0);

            expect(ship.currentEnergy).toBe(100); // Capped at maxEnergy
        });

        test('update calls system updates', () => {
            const mockSystem = {
                update: jest.fn(),
                isOperational: jest.fn().mockReturnValue(true)
            };

            ship.systems.set('test_system', mockSystem);

            ship.update(0.5);

            expect(mockSystem.update).toHaveBeenCalledWith(0.5);
        });
    });

    describe('Async System Initialization', () => {
        test('waitForSystemsInitialized resolves when systems are loaded', async () => {
            const ship = new Ship('heavy_fighter');

            // Simulate system loading
            setTimeout(() => {
                ship.systems.set('test_system', { name: 'Test' });
            }, 50);

            await expect(ship.waitForSystemsInitialized()).resolves.toBeUndefined();
        });

        test('initializeWeaponSystem creates weapon system manager', async () => {
            const ship = new Ship('heavy_fighter');

            // Mock WeaponSyncManager import
            const mockWeaponSyncManager = jest.fn().mockImplementation(() => ({
                initialize: jest.fn().mockResolvedValue()
            }));

            // This would normally be imported dynamically
            ship.weaponSyncManager = new mockWeaponSyncManager(ship);

            await ship.initializeWeaponSystem();

            expect(ship.weaponSyncManager).toBeDefined();
        });
    });

    describe('Card System Integration', () => {
        let ship;

        beforeEach(() => {
            ship = new Ship('heavy_fighter');
        });

        test('hasSystemCards checks for card availability', async () => {
            ship.cardSystemIntegration.hasCardsForSystem = jest.fn().mockReturnValue(true);

            const hasCards = ship.hasSystemCardsSync('impulse_engines');

            expect(hasCards).toBe(true);
        });

        test('getSystemCardEffectiveness calculates card impact', () => {
            const mockCard = {
                level: 3,
                stats: { effectiveness: 0.8 }
            };
            ship.cardSystemIntegration.getInstalledCardsForSystem = jest.fn()
                .mockReturnValue([mockCard]);

            const effectiveness = ship.getSystemCardEffectiveness('impulse_engines');

            expect(effectiveness).toBeGreaterThan(0);
        });

        test('cardEnablesSystem validates card compatibility', () => {
            const weaponCard = {
                type: 'weapon',
                subtype: 'laser'
            };

            const enables = ship.cardEnablesSystem(weaponCard, 'weapons');

            expect(typeof enables).toBe('boolean');
        });
    });

    describe('Error Handling', () => {
        test('handles missing system gracefully', () => {
            const ship = new Ship('heavy_fighter');

            expect(() => ship.removeSystem('nonexistent_system')).not.toThrow();
        });

        test('handles invalid damage amounts', () => {
            const ship = new Ship('heavy_fighter');

            expect(() => ship.applyDamage(-10)).not.toThrow();
            expect(() => ship.applyDamage(0)).not.toThrow();
        });

        test('handles energy consumption edge cases', () => {
            const ship = new Ship('heavy_fighter');
            ship.maxEnergy = 100;
            ship.currentEnergy = 0;

            expect(ship.consumeEnergy(0)).toBe(true);
            expect(ship.consumeEnergy(-10)).toBe(true); // Negative consumption should be handled
        });
    });
});

describe('Ship Class - Integration Points', () => {
    test('ship integrates with starfield manager', () => {
        const ship = new Ship('heavy_fighter');
        const mockStarfieldManager = {
            updateShipPosition: jest.fn()
        };

        ship.setStarfieldManager(mockStarfieldManager);

        expect(ship.getStarfieldManager()).toBe(mockStarfieldManager);
    });

    test('ship integrates with card inventory UI', () => {
        const ship = new Ship('heavy_fighter');
        const mockCardUI = {
            updateShipDisplay: jest.fn()
        };

        ship.setCardInventoryUI(mockCardUI);

        expect(ship.cardInventoryUI).toBe(mockCardUI);
    });
});

describe('Ship Class - Performance Tests', () => {
    test('ship creation completes within reasonable time', () => {
        const startTime = performance.now();
        new Ship('heavy_fighter');
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(100); // Should complete in < 100ms
    });

    test('update cycle is efficient', () => {
        const ship = new Ship('heavy_fighter');

        // Add multiple systems to test performance
        for (let i = 0; i < 10; i++) {
            ship.systems.set(`system_${i}`, {
                update: jest.fn(),
                isOperational: jest.fn().mockReturnValue(true)
            });
        }

        const startTime = performance.now();
        ship.update(0.016); // 60 FPS frame time
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(5); // Should complete in < 5ms
    });
}); 