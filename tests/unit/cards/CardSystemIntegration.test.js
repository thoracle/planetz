/**
 * CardSystemIntegration.test.js - Comprehensive Unit Tests for Card System
 * Part of StarF*ckers Pre-Refactoring Test Foundation
 * Phase 1: Characterization Tests for Card Collection System
 */

import { jest } from '@jest/globals';

// Mock localStorage for card data persistence
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};
global.localStorage = mockLocalStorage;

// Mock the card data import
jest.unstable_mockModule('../../../frontend/static/js/card-data.js', () => ({
    cardDatabase: new Map([
        ['impulse_engines_1', {
            id: 'impulse_engines_1',
            name: 'Basic Impulse Engines',
            type: 'system',
            subtype: 'impulse_engines',
            level: 1,
            rarity: 'common',
            stats: { speed: 10, energyConsumption: 5 }
        }],
        ['laser_weapon_1', {
            id: 'laser_weapon_1',
            name: 'Basic Laser',
            type: 'weapon',
            subtype: 'laser',
            level: 1,
            rarity: 'common',
            stats: { damage: 15, energyCost: 8, cooldown: 1000 }
        }],
        ['shield_generator_2', {
            id: 'shield_generator_2',
            name: 'Advanced Shield Generator',
            type: 'system',
            subtype: 'shield_generator',
            level: 2,
            rarity: 'rare',
            stats: { shieldCapacity: 100, rechargeRate: 10 }
        }]
    ]),
    getCardById: jest.fn()
}));

const CardSystemIntegration = (await import('../../../frontend/static/js/ship/CardSystemIntegration.js')).default;
const { cardDatabase, getCardById } = await import('../../../frontend/static/js/card-data.js');

describe('CardSystemIntegration - Core Functionality', () => {
    let cardSystem;
    let mockShip;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        mockLocalStorage.getItem.mockReturnValue(null);

        // Create mock ship
        mockShip = global.testUtils.createMockShip({
            addSystem: jest.fn(),
            removeSystem: jest.fn(),
            getSystem: jest.fn(),
            calculateTotalStats: jest.fn()
        });

        // Create card system
        cardSystem = new CardSystemIntegration(mockShip);

        // Setup mock getCardById function
        getCardById.mockImplementation((id) => cardDatabase.get(id));
    });

    describe('Card System Initialization', () => {
        test('creates card system with correct properties', () => {
            expect(cardSystem.ship).toBe(mockShip);
            expect(cardSystem.cardInventory).toBeInstanceOf(Map);
            expect(cardSystem.installedCards).toBeInstanceOf(Map);
            expect(cardSystem.discoveredCards).toBeInstanceOf(Set);
            expect(cardSystem.credits).toBe(0);
        });

        test('initializes from saved data', async () => {
            const savedData = {
                cardInventory: [['laser_weapon_1', 3]],
                installedCards: [['weapon_slot_1', 'laser_weapon_1']],
                discoveredCards: ['laser_weapon_1', 'impulse_engines_1'],
                credits: 5000
            };
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedData));

            await cardSystem.initializeCardData();

            expect(cardSystem.cardInventory.get('laser_weapon_1')).toBe(3);
            expect(cardSystem.installedCards.get('weapon_slot_1')).toBe('laser_weapon_1');
            expect(cardSystem.discoveredCards.has('laser_weapon_1')).toBe(true);
            expect(cardSystem.credits).toBe(5000);
        });

        test('handles corrupted save data gracefully', async () => {
            mockLocalStorage.getItem.mockReturnValue('corrupted-json-data');

            await expect(cardSystem.initializeCardData()).resolves.toBeUndefined();
            expect(cardSystem.credits).toBe(0);
            expect(cardSystem.cardInventory.size).toBe(0);
        });

        test('creates starter inventory when no save data exists', async () => {
            mockLocalStorage.getItem.mockReturnValue(null);

            await cardSystem.initializeCardData();

            expect(cardSystem.credits).toBeGreaterThan(0);
            expect(cardSystem.cardInventory.size).toBeGreaterThan(0);
        });
    });

    describe('Card Collection Management', () => {
        beforeEach(async () => {
            await cardSystem.initializeCardData();
        });

        test('addCard increases card count', () => {
            cardSystem.addCard('laser_weapon_1', 2);

            expect(cardSystem.cardInventory.get('laser_weapon_1')).toBe(2);
            expect(cardSystem.discoveredCards.has('laser_weapon_1')).toBe(true);
        });

        test('addCard stacks existing cards', () => {
            cardSystem.addCard('laser_weapon_1', 2);
            cardSystem.addCard('laser_weapon_1', 3);

            expect(cardSystem.cardInventory.get('laser_weapon_1')).toBe(5);
        });

        test('removeCard decreases card count', () => {
            cardSystem.addCard('laser_weapon_1', 5);
            cardSystem.removeCard('laser_weapon_1', 2);

            expect(cardSystem.cardInventory.get('laser_weapon_1')).toBe(3);
        });

        test('removeCard removes entry when count reaches zero', () => {
            cardSystem.addCard('laser_weapon_1', 2);
            cardSystem.removeCard('laser_weapon_1', 2);

            expect(cardSystem.cardInventory.has('laser_weapon_1')).toBe(false);
        });

        test('removeCard does not go below zero', () => {
            cardSystem.addCard('laser_weapon_1', 2);
            cardSystem.removeCard('laser_weapon_1', 5);

            expect(cardSystem.cardInventory.has('laser_weapon_1')).toBe(false);
        });

        test('hasCard returns correct availability', () => {
            cardSystem.addCard('laser_weapon_1', 3);

            expect(cardSystem.hasCard('laser_weapon_1')).toBe(true);
            expect(cardSystem.hasCard('nonexistent_card')).toBe(false);
        });

        test('getCardCount returns correct count', () => {
            cardSystem.addCard('laser_weapon_1', 7);

            expect(cardSystem.getCardCount('laser_weapon_1')).toBe(7);
            expect(cardSystem.getCardCount('nonexistent_card')).toBe(0);
        });
    });

    describe('Card Installation System', () => {
        beforeEach(async () => {
            await cardSystem.initializeCardData();
            cardSystem.addCard('laser_weapon_1', 3);
            cardSystem.addCard('impulse_engines_1', 2);
        });

        test('installCard installs card to slot', () => {
            const result = cardSystem.installCard('weapon_slot_1', 'laser_weapon_1');

            expect(result).toBe(true);
            expect(cardSystem.installedCards.get('weapon_slot_1')).toBe('laser_weapon_1');
            expect(cardSystem.cardInventory.get('laser_weapon_1')).toBe(2); // Reduced by 1
        });

        test('installCard fails when card not available', () => {
            const result = cardSystem.installCard('weapon_slot_1', 'nonexistent_card');

            expect(result).toBe(false);
            expect(cardSystem.installedCards.has('weapon_slot_1')).toBe(false);
        });

        test('installCard replaces existing card', () => {
            cardSystem.installCard('weapon_slot_1', 'laser_weapon_1');
            cardSystem.addCard('shield_generator_2', 1);
            
            const result = cardSystem.installCard('weapon_slot_1', 'shield_generator_2');

            expect(result).toBe(true);
            expect(cardSystem.installedCards.get('weapon_slot_1')).toBe('shield_generator_2');
            expect(cardSystem.cardInventory.get('laser_weapon_1')).toBe(3); // Returned to inventory
        });

        test('uninstallCard removes card from slot', () => {
            cardSystem.installCard('weapon_slot_1', 'laser_weapon_1');
            
            const result = cardSystem.uninstallCard('weapon_slot_1');

            expect(result).toBe(true);
            expect(cardSystem.installedCards.has('weapon_slot_1')).toBe(false);
            expect(cardSystem.cardInventory.get('laser_weapon_1')).toBe(3); // Returned to inventory
        });

        test('uninstallCard handles empty slot', () => {
            const result = cardSystem.uninstallCard('empty_slot');

            expect(result).toBe(false);
        });

        test('getInstalledCard returns correct card', () => {
            cardSystem.installCard('weapon_slot_1', 'laser_weapon_1');

            const card = cardSystem.getInstalledCard('weapon_slot_1');
            
            expect(card).toBe('laser_weapon_1');
            expect(cardSystem.getInstalledCard('empty_slot')).toBeNull();
        });
    });

    describe('System Creation from Cards', () => {
        beforeEach(async () => {
            await cardSystem.initializeCardData();
            cardSystem.addCard('impulse_engines_1', 1);
            cardSystem.addCard('laser_weapon_1', 1);
        });

        test('createSystemsFromCards creates systems for installed cards', async () => {
            cardSystem.installCard('impulse_slot', 'impulse_engines_1');
            cardSystem.installCard('weapon_slot', 'laser_weapon_1');

            await cardSystem.createSystemsFromCards();

            expect(mockShip.addSystem).toHaveBeenCalledTimes(2);
            expect(mockShip.calculateTotalStats).toHaveBeenCalled();
        });

        test('recreateSystemsFromCards removes old systems first', async () => {
            cardSystem.installCard('impulse_slot', 'impulse_engines_1');
            
            await cardSystem.recreateSystemsFromCards();

            expect(mockShip.removeSystem).toHaveBeenCalled();
            expect(mockShip.addSystem).toHaveBeenCalled();
        });

        test('hasCardsForSystem checks card availability', () => {
            cardSystem.addCard('impulse_engines_1', 2);

            const hasCards = cardSystem.hasCardsForSystem('impulse_engines');

            expect(hasCards).toBe(true);
            expect(cardSystem.hasCardsForSystem('nonexistent_system')).toBe(false);
        });

        test('getInstalledCardsForSystem returns matching cards', () => {
            cardSystem.installCard('slot1', 'impulse_engines_1');
            cardSystem.installCard('slot2', 'laser_weapon_1');

            const impulseCards = cardSystem.getInstalledCardsForSystem('impulse_engines');
            const weaponCards = cardSystem.getInstalledCardsForSystem('weapon');

            expect(impulseCards.length).toBe(1);
            expect(weaponCards.length).toBe(1);
            expect(impulseCards[0].subtype).toBe('impulse_engines');
        });
    });

    describe('Card Discovery System', () => {
        test('discoverCard adds to discovered set', () => {
            cardSystem.discoverCard('shield_generator_2');

            expect(cardSystem.discoveredCards.has('shield_generator_2')).toBe(true);
        });

        test('isCardDiscovered checks discovery status', () => {
            cardSystem.discoverCard('shield_generator_2');

            expect(cardSystem.isCardDiscovered('shield_generator_2')).toBe(true);
            expect(cardSystem.isCardDiscovered('unknown_card')).toBe(false);
        });

        test('getDiscoveredCards returns array of discovered cards', () => {
            cardSystem.discoverCard('laser_weapon_1');
            cardSystem.discoverCard('impulse_engines_1');

            const discovered = cardSystem.getDiscoveredCards();

            expect(discovered).toContain('laser_weapon_1');
            expect(discovered).toContain('impulse_engines_1');
            expect(discovered.length).toBe(2);
        });

        test('getUndiscoveredCards returns cards not yet found', () => {
            cardSystem.discoverCard('laser_weapon_1');

            const undiscovered = cardSystem.getUndiscoveredCards();

            expect(undiscovered).not.toContain('laser_weapon_1');
            expect(undiscovered.length).toBeGreaterThan(0);
        });
    });

    describe('Credit System', () => {
        test('addCredits increases credit balance', () => {
            cardSystem.addCredits(1000);

            expect(cardSystem.credits).toBe(1000);
        });

        test('spendCredits decreases credit balance', () => {
            cardSystem.addCredits(1000);
            const result = cardSystem.spendCredits(300);

            expect(result).toBe(true);
            expect(cardSystem.credits).toBe(700);
        });

        test('spendCredits fails when insufficient credits', () => {
            cardSystem.addCredits(100);
            const result = cardSystem.spendCredits(200);

            expect(result).toBe(false);
            expect(cardSystem.credits).toBe(100);
        });

        test('hasCredits checks credit availability', () => {
            cardSystem.addCredits(500);

            expect(cardSystem.hasCredits(300)).toBe(true);
            expect(cardSystem.hasCredits(600)).toBe(false);
        });
    });

    describe('Card Upgrade System', () => {
        beforeEach(async () => {
            await cardSystem.initializeCardData();
            cardSystem.addCard('laser_weapon_1', 5);
            cardSystem.addCredits(10000);
        });

        test('upgradeCard increases card level', () => {
            const upgradeCost = cardSystem.getUpgradeCost('laser_weapon_1');
            const result = cardSystem.upgradeCard('laser_weapon_1');

            expect(result).toBe(true);
            expect(cardSystem.credits).toBe(10000 - upgradeCost);
        });

        test('upgradeCard fails when insufficient credits', () => {
            cardSystem.credits = 10; // Very low credits
            const result = cardSystem.upgradeCard('laser_weapon_1');

            expect(result).toBe(false);
        });

        test('upgradeCard fails when insufficient cards', () => {
            cardSystem.removeCard('laser_weapon_1', 5); // Remove all cards
            const result = cardSystem.upgradeCard('laser_weapon_1');

            expect(result).toBe(false);
        });

        test('getUpgradeCost calculates correct cost', () => {
            const cost = cardSystem.getUpgradeCost('laser_weapon_1');

            expect(cost).toBeGreaterThan(0);
            expect(typeof cost).toBe('number');
        });

        test('canUpgradeCard checks upgrade requirements', () => {
            expect(cardSystem.canUpgradeCard('laser_weapon_1')).toBe(true);
            
            cardSystem.credits = 10;
            expect(cardSystem.canUpgradeCard('laser_weapon_1')).toBe(false);
        });
    });

    describe('Data Persistence', () => {
        beforeEach(async () => {
            await cardSystem.initializeCardData();
        });

        test('saveCardData persists to localStorage', () => {
            cardSystem.addCard('laser_weapon_1', 3);
            cardSystem.addCredits(5000);
            cardSystem.discoverCard('impulse_engines_1');

            cardSystem.saveCardData();

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'starfuckers_card_data',
                expect.stringMatching(/laser_weapon_1/)
            );
        });

        test('loadCardData restores from localStorage', () => {
            const savedData = {
                cardInventory: [['laser_weapon_1', 5]],
                credits: 2500,
                discoveredCards: ['laser_weapon_1']
            };
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(savedData));

            cardSystem.loadCardData();

            expect(cardSystem.cardInventory.get('laser_weapon_1')).toBe(5);
            expect(cardSystem.credits).toBe(2500);
            expect(cardSystem.discoveredCards.has('laser_weapon_1')).toBe(true);
        });

        test('clearCardData resets all data', () => {
            cardSystem.addCard('laser_weapon_1', 3);
            cardSystem.addCredits(1000);

            cardSystem.clearCardData();

            expect(cardSystem.cardInventory.size).toBe(0);
            expect(cardSystem.credits).toBe(0);
            expect(cardSystem.discoveredCards.size).toBe(0);
        });
    });

    describe('Card Filtering and Queries', () => {
        beforeEach(async () => {
            await cardSystem.initializeCardData();
            cardSystem.addCard('laser_weapon_1', 2);
            cardSystem.addCard('impulse_engines_1', 1);
            cardSystem.addCard('shield_generator_2', 3);
        });

        test('getCardsByType returns cards of specific type', () => {
            const weaponCards = cardSystem.getCardsByType('weapon');
            const systemCards = cardSystem.getCardsByType('system');

            expect(weaponCards.length).toBeGreaterThan(0);
            expect(systemCards.length).toBeGreaterThan(0);
            expect(weaponCards.every(card => card.type === 'weapon')).toBe(true);
        });

        test('getCardsByRarity returns cards of specific rarity', () => {
            const commonCards = cardSystem.getCardsByRarity('common');
            const rareCards = cardSystem.getCardsByRarity('rare');

            expect(commonCards.length).toBeGreaterThan(0);
            expect(rareCards.length).toBeGreaterThan(0);
        });

        test('getAvailableCards returns cards in inventory', () => {
            const available = cardSystem.getAvailableCards();

            expect(available.length).toBe(3);
            expect(available.every(card => cardSystem.hasCard(card.id))).toBe(true);
        });

        test('getTotalCardValue calculates inventory value', () => {
            const totalValue = cardSystem.getTotalCardValue();

            expect(totalValue).toBeGreaterThan(0);
            expect(typeof totalValue).toBe('number');
        });
    });

    describe('Error Handling', () => {
        test('handles invalid card IDs gracefully', () => {
            expect(() => cardSystem.addCard('invalid_card', 1)).not.toThrow();
            expect(() => cardSystem.installCard('slot', 'invalid_card')).not.toThrow();
        });

        test('handles negative quantities gracefully', () => {
            cardSystem.addCard('laser_weapon_1', -5);
            expect(cardSystem.getCardCount('laser_weapon_1')).toBe(0);
        });

        test('handles localStorage errors gracefully', () => {
            mockLocalStorage.setItem.mockImplementation(() => {
                throw new Error('Storage quota exceeded');
            });

            expect(() => cardSystem.saveCardData()).not.toThrow();
        });

        test('handles corrupted card database gracefully', () => {
            cardDatabase.clear();

            expect(() => cardSystem.getCardsByType('weapon')).not.toThrow();
        });
    });

    describe('Performance Tests', () => {
        test('card operations are efficient with large inventory', () => {
            // Add many cards
            for (let i = 0; i < 100; i++) {
                cardSystem.addCard(`test_card_${i}`, 10);
            }

            const startTime = performance.now();
            cardSystem.getAvailableCards();
            cardSystem.getTotalCardValue();
            cardSystem.saveCardData();
            const endTime = performance.now();

            expect(endTime - startTime).toBeLessThan(50); // Should be fast
        });

        test('system creation scales well', async () => {
            // Install many cards
            for (let i = 0; i < 20; i++) {
                cardSystem.installCard(`slot_${i}`, 'laser_weapon_1');
            }

            const startTime = performance.now();
            await cardSystem.createSystemsFromCards();
            const endTime = performance.now();

            expect(endTime - startTime).toBeLessThan(100); // Should complete reasonably fast
        });
    });
}); 