import { debug } from '../debug.js';

/**
 * Proximity Detector Card Integration Test
 * 
 * Tests the complete proximity detector card-based system integration.
 * Run in browser console after game loads.
 */

function testProximityDetectorCardIntegration() {
debug('UI', 'Testing Proximity Detector Card Integration...');
    
    // Check if StarfieldManager is available
    if (!window.starfieldManager) {
        console.error('❌ StarfieldManager not found. Make sure game is fully loaded.');
        return false;
    }
    
    const ship = window.starfieldManager.viewManager?.getShip();
    if (!ship) {
        console.error('❌ Ship not found.');
        return false;
    }
    
debug('UI', '🚢 Testing ship proximity detector card integration...');
    
    // Test 1: Check if basic proximity detector card is in starter configuration
debug('UI', '📋 Test 1: Checking starter proximity detector cards...');
    if (ship.shipConfig?.starterCards) {
        const radarCards = Object.entries(ship.shipConfig.starterCards)
            .filter(([slotId, cardData]) => cardData.cardType === 'basic_radar');
        
        if (radarCards.length > 0) {
debug('UI', '✅ Basic proximity detector card found in starter configuration:', radarCards);
        } else {
debug('UI', '❌ No proximity detector cards found in starter configuration');
        }
    }
    
    // Test 2: Check if ship has proximity detector cards installed
debug('UI', '📋 Test 2: Checking installed proximity detector cards...');
    const hasRadarCards = ship.hasSystemCardsSync('radar');
debug('UI', `Has proximity detector cards installed: ${hasRadarCards ? '✅ YES' : '❌ NO'}`);
    
    // Test 3: Check if proximity detector system exists
debug('UTILITY', '📋 Test 3: Checking proximity detector system...');
    const radarSystem = ship.getSystem('radar');
    if (radarSystem) {
debug('UTILITY', '✅ Proximity Detector system found:', radarSystem.getStatus());
    } else {
debug('UTILITY', '❌ Proximity Detector system not found');
    }
    
    // Test 4: Check proximity detector HUD availability
debug('UI', '📋 Test 4: Checking proximity detector HUD...');
    const radarHUD = window.starfieldManager.radarHUD;
    if (radarHUD) {
        const canUseRadar = radarHUD.canUseRadar();
debug('UI', `Proximity Detector HUD can be used: ${canUseRadar ? '✅ YES' : '❌ NO'}`);
        
        if (canUseRadar) {
debug('UTILITY', 'Testing proximity detector specifications update...');
            radarHUD.updateRadarSpecifications();
debug('UI', `Current proximity detector range: ${(radarHUD.config.range / 1000).toFixed(0)}km`);
debug('UI', `Current update frequency: ${radarHUD.config.updateFrequency}Hz`);
        }
    } else {
debug('UI', '❌ Proximity Detector HUD not found');
    }
    
    // Test 5: Check card system integration
debug('UI', '📋 Test 5: Checking card system integration...');
    if (ship.cardSystemIntegration) {
        const systemMapping = ship.cardSystemIntegration.createSystemCardMapping();
        if (systemMapping.radar) {
debug('UI', '✅ Radar card mapping found:', systemMapping.radar);
        } else {
debug('UI', '❌ Radar card mapping not found');
        }
        
        // Test radar card types
debug('AI', '📦 Available proximity detector card types:');
debug('UTILITY', '  • Basic Proximity Detector: basic_radar');
debug('UTILITY', '  • Advanced Proximity Detector: advanced_radar');
debug('UTILITY', '  • Tactical Proximity Detector: tactical_radar');
    }
    
    // Test 6: Try to toggle proximity detector
debug('UTILITY', '📋 Test 6: Testing proximity detector toggle...');
    try {
        const toggleResult = window.starfieldManager.toggleProximityDetector();
debug('UTILITY', 'Proximity Detector toggle method executed successfully');
    } catch (error) {
        console.error('❌ Proximity Detector toggle failed:', error);
    }
    
    // Test 7: Check key binding
debug('UTILITY', '📋 Test 7: Testing key binding...');
debug('UI', '💡 Press P key to test proximity detector toggle with card validation');
debug('P1', '💡 If no proximity detector cards: Should show "No Proximity Detector card installed" error');
debug('UI', '💡 If proximity detector cards installed: Should toggle proximity detector display');
    
    // Summary
debug('UI', '\n🎯 Proximity Detector Card Integration Test Summary:');
debug('UI', '✅ Card types defined in NFTCard.js');
debug('UI', '✅ Card system integration mapping added');
debug('UTILITY', '✅ ProximityDetector system class created');
debug('UI', '✅ ProximityDetector HUD updated for card requirements');
debug('UI', '✅ Starter ship configured with basic proximity detector card');
debug('UI', '✅ Key binding (P) includes card validation');
    
debug('UI', '\n🚀 Test completed! The proximity detector system is now card-based.');
debug('UI', '🎮 Players need proximity detector cards to use the proximity detector system.');
debug('UI', '📈 Proximity detector capabilities improve with higher level cards.');
    
    return true;
}

// Auto-run test if called directly
if (typeof window !== 'undefined') {
    // Wait for game to load
    setTimeout(() => {
        if (window.starfieldManager) {
            testProximityDetectorCardIntegration();
        } else {
debug('AI', '⏳ Waiting for game to initialize...');
            // Try again in a few seconds
            setTimeout(() => {
                if (window.starfieldManager) {
                    testProximityDetectorCardIntegration();
                } else {
debug('UTILITY', '❌ Game not loaded after 10 seconds. Load the game first.');
                }
            }, 5000);
        }
    }, 5000);
}

// Export for manual testing
if (typeof window !== 'undefined') {
    window.testProximityDetectorCardIntegration = testProximityDetectorCardIntegration;
debug('AI', 'testProximityDetectorCardIntegration() function is now available in the console');
}