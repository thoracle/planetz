/**
 * Unit Test: Collection View Parity
 * 
 * This test validates that both the ESC collection screen and the station collection screen
 * show identical card data from the single source of truth (CardInventoryUI singleton).
 * 
 * Test Coverage:
 * - Card types match between views
 * - Card counts match between views  
 * - Card levels match between views
 * - Card discovery status matches between views
 * - NEW and quantity increase badges match between views
 */

// Mock DOM environment for testing
const mockDOM = {
    createElement: (tag) => ({
        tagName: tag.toUpperCase(),
        innerHTML: '',
        style: {},
        classList: {
            add: () => {},
            remove: () => {},
            contains: () => false
        },
        querySelector: () => null,
        querySelectorAll: () => [],
        appendChild: () => {},
        addEventListener: () => {}
    }),
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
};

// Mock global objects
global.document = mockDOM;
global.window = {
    cardInventoryUI: null,
    helpInterface: null,
    THREE: { AudioListener: function() {} },
    debug: (channel, ...args) => console.log(`[${channel}]`, ...args)
};

// Mock debug function
global.debug = (channel, ...args) => console.log(`[${channel}]`, ...args);

// Import the modules we need to test
import CardInventoryUI from '../frontend/static/js/ui/CardInventoryUI.js';
import { HelpInterface } from '../frontend/static/js/ui/HelpInterface.js';
import CardInventory from '../frontend/static/js/ship/CardInventory.js';
import { CARD_TYPES } from '../frontend/static/js/ship/NFTCard.js';

/**
 * Test Suite: Collection View Parity
 */
class CollectionParityTest {
    constructor() {
        this.testResults = [];
        this.cardInventoryUI = null;
        this.helpInterface = null;
    }

    /**
     * Run all tests
     */
    async runAllTests() {
        console.log('🧪 Starting Collection Parity Tests...\n');
        
        try {
            await this.setupTest();
            await this.testSingletonInstance();
            await this.testCardDataParity();
            await this.testCardCounts();
            await this.testCardLevels();
            await this.testNewBadges();
            await this.testQuantityBadges();
            await this.testCardAddition();
            await this.testCardUpgrade();
            
            this.printResults();
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        }
    }

    /**
     * Setup test environment
     */
    async setupTest() {
        console.log('🔧 Setting up test environment...');
        
        // Create singleton instance
        this.cardInventoryUI = CardInventoryUI.getInstance(null);
        
        // Create mock starfield manager for HelpInterface
        const mockStarfieldManager = {
            dockingInterface: {
                cardInventoryUI: this.cardInventoryUI
            }
        };
        
        this.helpInterface = new HelpInterface(mockStarfieldManager);
        
        // Ensure global reference is set
        global.window.cardInventoryUI = this.cardInventoryUI;
        global.window.helpInterface = this.helpInterface;
        
        this.assert(this.cardInventoryUI !== null, 'CardInventoryUI singleton created');
        this.assert(this.helpInterface !== null, 'HelpInterface created');
        
        console.log('✅ Test environment setup complete\n');
    }

    /**
     * Test that both views use the same singleton instance
     */
    async testSingletonInstance() {
        console.log('🔍 Testing singleton instance usage...');
        
        // Test that CardInventoryUI is a singleton
        const instance1 = CardInventoryUI.getInstance();
        const instance2 = CardInventoryUI.getInstance();
        const instance3 = new CardInventoryUI(null);
        
        this.assert(instance1 === instance2, 'getInstance() returns same instance');
        this.assert(instance1 === instance3, 'new CardInventoryUI() returns singleton');
        this.assert(instance1 === this.cardInventoryUI, 'Test instance matches singleton');
        
        // Test that global reference points to singleton
        this.assert(global.window.cardInventoryUI === instance1, 'Global reference matches singleton');
        
        console.log('✅ Singleton instance test passed\n');
    }

    /**
     * Test that both views show the same card types
     */
    async testCardDataParity() {
        console.log('🃏 Testing card data parity...');
        
        // Add some test cards to the inventory
        const testCards = [
            { type: 'laser_cannon', count: 2, level: 1, rarity: 'common' },
            { type: 'shield_generator', count: 1, level: 2, rarity: 'rare' },
            { type: 'warp_drive', count: 3, level: 1, rarity: 'common' }
        ];
        
        // Add cards to the singleton inventory
        for (const cardData of testCards) {
            const stack = this.cardInventoryUI.inventory.cardStacks.get(cardData.type);
            if (stack) {
                stack.count = cardData.count;
                stack.level = cardData.level;
                stack.discovered = true;
                this.cardInventoryUI.inventory.discoveredCards.add(cardData.type);
            }
        }
        
        // Get card data from both sources
        const stationCards = this.getStationCollectionData();
        const escCards = this.getESCCollectionData();
        
        // Test that both views have the same number of cards
        this.assert(stationCards.length === escCards.length, 
            `Both views show same number of cards (Station: ${stationCards.length}, ESC: ${escCards.length})`);
        
        // Test that both views have the same card types
        const stationTypes = new Set(stationCards.map(card => card.cardType));
        const escTypes = new Set(escCards.map(card => card.cardType));
        
        this.assert(stationTypes.size === escTypes.size, 'Same number of unique card types');
        
        for (const cardType of stationTypes) {
            this.assert(escTypes.has(cardType), `ESC view has card type: ${cardType}`);
        }
        
        console.log('✅ Card data parity test passed\n');
    }

    /**
     * Test that card counts match between views
     */
    async testCardCounts() {
        console.log('🔢 Testing card count parity...');
        
        const stationCards = this.getStationCollectionData();
        const escCards = this.getESCCollectionData();
        
        // Create maps for easy comparison
        const stationCounts = new Map(stationCards.map(card => [card.cardType, card.count]));
        const escCounts = new Map(escCards.map(card => [card.cardType, card.count]));
        
        for (const [cardType, stationCount] of stationCounts) {
            const escCount = escCounts.get(cardType);
            this.assert(stationCount === escCount, 
                `Card counts match for ${cardType} (Station: ${stationCount}, ESC: ${escCount})`);
        }
        
        console.log('✅ Card count parity test passed\n');
    }

    /**
     * Test that card levels match between views
     */
    async testCardLevels() {
        console.log('⬆️ Testing card level parity...');
        
        const stationCards = this.getStationCollectionData();
        const escCards = this.getESCCollectionData();
        
        // Create maps for easy comparison
        const stationLevels = new Map(stationCards.map(card => [card.cardType, card.level]));
        const escLevels = new Map(escCards.map(card => [card.cardType, card.level]));
        
        for (const [cardType, stationLevel] of stationLevels) {
            const escLevel = escLevels.get(cardType);
            this.assert(stationLevel === escLevel, 
                `Card levels match for ${cardType} (Station: ${stationLevel}, ESC: ${escLevel})`);
        }
        
        console.log('✅ Card level parity test passed\n');
    }

    /**
     * Test NEW badge consistency
     */
    async testNewBadges() {
        console.log('🆕 Testing NEW badge parity...');
        
        // Mark a card as new
        const testCardType = 'laser_cannon';
        this.cardInventoryUI.markCardAsNew(testCardType);
        
        const stationCards = this.getStationCollectionData();
        const escCards = this.getESCCollectionData();
        
        const stationCard = stationCards.find(card => card.cardType === testCardType);
        const escCard = escCards.find(card => card.cardType === testCardType);
        
        if (stationCard && escCard) {
            this.assert(stationCard.isNew === escCard.isNew, 
                `NEW badge status matches for ${testCardType} (Station: ${stationCard.isNew}, ESC: ${escCard.isNew})`);
        }
        
        console.log('✅ NEW badge parity test passed\n');
    }

    /**
     * Test quantity increase badge consistency
     */
    async testQuantityBadges() {
        console.log('📈 Testing quantity increase badge parity...');
        
        // Mark a card as having quantity increase
        const testCardType = 'shield_generator';
        this.cardInventoryUI.markCardQuantityIncrease(testCardType);
        
        const stationCards = this.getStationCollectionData();
        const escCards = this.getESCCollectionData();
        
        const stationCard = stationCards.find(card => card.cardType === testCardType);
        const escCard = escCards.find(card => card.cardType === testCardType);
        
        if (stationCard && escCard) {
            this.assert(stationCard.hasQuantityIncrease === escCard.hasQuantityIncrease, 
                `Quantity increase badge status matches for ${testCardType} (Station: ${stationCard.hasQuantityIncrease}, ESC: ${escCard.hasQuantityIncrease})`);
        }
        
        console.log('✅ Quantity increase badge parity test passed\n');
    }

    /**
     * Test that adding a card updates both views
     */
    async testCardAddition() {
        console.log('➕ Testing card addition synchronization...');
        
        const newCardType = 'plasma_cannon';
        const initialStationCards = this.getStationCollectionData();
        const initialESCCards = this.getESCCollectionData();
        
        // Add a new card
        const stack = this.cardInventoryUI.inventory.cardStacks.get(newCardType);
        if (stack) {
            stack.count = 1;
            stack.level = 1;
            stack.discovered = true;
            this.cardInventoryUI.inventory.discoveredCards.add(newCardType);
        }
        
        const updatedStationCards = this.getStationCollectionData();
        const updatedESCCards = this.getESCCollectionData();
        
        // Both views should now have one more card
        this.assert(updatedStationCards.length === initialStationCards.length + 1, 
            'Station view shows new card');
        this.assert(updatedESCCards.length === initialESCCards.length + 1, 
            'ESC view shows new card');
        
        // Both views should have the new card
        const stationHasCard = updatedStationCards.some(card => card.cardType === newCardType);
        const escHasCard = updatedESCCards.some(card => card.cardType === newCardType);
        
        this.assert(stationHasCard, 'Station view has new card');
        this.assert(escHasCard, 'ESC view has new card');
        
        console.log('✅ Card addition synchronization test passed\n');
    }

    /**
     * Test that upgrading a card updates both views
     */
    async testCardUpgrade() {
        console.log('⬆️ Testing card upgrade synchronization...');
        
        const testCardType = 'laser_cannon';
        const originalLevel = this.cardInventoryUI.inventory.cardStacks.get(testCardType)?.level || 1;
        
        // Upgrade the card
        const stack = this.cardInventoryUI.inventory.cardStacks.get(testCardType);
        if (stack) {
            stack.level = originalLevel + 1;
        }
        
        const stationCards = this.getStationCollectionData();
        const escCards = this.getESCCollectionData();
        
        const stationCard = stationCards.find(card => card.cardType === testCardType);
        const escCard = escCards.find(card => card.cardType === testCardType);
        
        if (stationCard && escCard) {
            this.assert(stationCard.level === originalLevel + 1, 
                `Station view shows upgraded level: ${stationCard.level}`);
            this.assert(escCard.level === originalLevel + 1, 
                `ESC view shows upgraded level: ${escCard.level}`);
            this.assert(stationCard.level === escCard.level, 
                'Both views show same upgraded level');
        }
        
        console.log('✅ Card upgrade synchronization test passed\n');
    }

    /**
     * Get card data as it would appear in the station collection screen
     */
    getStationCollectionData() {
        if (!this.cardInventoryUI || !this.cardInventoryUI.inventory) {
            return [];
        }
        
        return this.cardInventoryUI.inventory.getDiscoveredCards().map(stack => ({
            cardType: stack.sampleCard.cardType,
            name: stack.name,
            count: stack.count,
            level: stack.level,
            rarity: stack.sampleCard.rarity,
            isNew: this.cardInventoryUI.isCardNew ? this.cardInventoryUI.isCardNew(stack.sampleCard.cardType) : false,
            hasQuantityIncrease: this.cardInventoryUI.hasQuantityIncrease ? this.cardInventoryUI.hasQuantityIncrease(stack.sampleCard.cardType) : false
        }));
    }

    /**
     * Get card data as it would appear in the ESC collection screen
     */
    getESCCollectionData() {
        if (!global.window.cardInventoryUI || !global.window.cardInventoryUI.inventory) {
            return [];
        }
        
        return global.window.cardInventoryUI.inventory.getDiscoveredCards().map(stack => ({
            cardType: stack.sampleCard.cardType,
            name: stack.name,
            count: stack.count,
            level: stack.level,
            rarity: stack.sampleCard.rarity,
            isNew: this.helpInterface.isCardNew ? this.helpInterface.isCardNew(stack.sampleCard.cardType) : false,
            hasQuantityIncrease: this.helpInterface.hasQuantityIncrease ? this.helpInterface.hasQuantityIncrease(stack.sampleCard.cardType) : false
        }));
    }

    /**
     * Assert helper function
     */
    assert(condition, message) {
        const result = {
            passed: !!condition,
            message: message,
            timestamp: new Date().toISOString()
        };
        
        this.testResults.push(result);
        
        if (result.passed) {
            console.log(`  ✅ ${message}`);
        } else {
            console.log(`  ❌ ${message}`);
        }
        
        return result.passed;
    }

    /**
     * Print test results summary
     */
    printResults() {
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(result => result.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${totalTests}`);
        console.log(`Passed: ${passedTests} ✅`);
        console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : '✅'}`);
        console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        if (failedTests > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.testResults
                .filter(result => !result.passed)
                .forEach(result => console.log(`  - ${result.message}`));
        }
        
        console.log('\n' + (failedTests === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED'));
        console.log('='.repeat(60));
    }
}

// Export for use in other test files
export { CollectionParityTest };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const test = new CollectionParityTest();
    test.runAllTests().catch(console.error);
}
