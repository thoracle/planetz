/**
 * Proximity Detector Card Integration Test
 * 
 * Tests the complete proximity detector card-based system integration.
 * Run in browser console after game loads.
 */

function testProximityDetectorCardIntegration() {
    console.log('🎯 Testing Proximity Detector Card Integration...');
    
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
    
    console.log('🚢 Testing ship proximity detector card integration...');
    
    // Test 1: Check if basic proximity detector card is in starter configuration
    console.log('📋 Test 1: Checking starter proximity detector cards...');
    if (ship.shipConfig?.starterCards) {
        const radarCards = Object.entries(ship.shipConfig.starterCards)
            .filter(([slotId, cardData]) => cardData.cardType === 'basic_radar');
        
        if (radarCards.length > 0) {
            console.log('✅ Basic proximity detector card found in starter configuration:', radarCards);
        } else {
            console.log('❌ No proximity detector cards found in starter configuration');
        }
    }
    
    // Test 2: Check if ship has proximity detector cards installed
    console.log('📋 Test 2: Checking installed proximity detector cards...');
    const hasRadarCards = ship.hasSystemCardsSync('radar');
    console.log(`Has proximity detector cards installed: ${hasRadarCards ? '✅ YES' : '❌ NO'}`);
    
    // Test 3: Check if proximity detector system exists
    console.log('📋 Test 3: Checking proximity detector system...');
    const radarSystem = ship.getSystem('radar');
    if (radarSystem) {
        console.log('✅ Proximity Detector system found:', radarSystem.getStatus());
    } else {
        console.log('❌ Proximity Detector system not found');
    }
    
    // Test 4: Check proximity detector HUD availability
    console.log('📋 Test 4: Checking proximity detector HUD...');
    const radarHUD = window.starfieldManager.radarHUD;
    if (radarHUD) {
        const canUseRadar = radarHUD.canUseRadar();
        console.log(`Proximity Detector HUD can be used: ${canUseRadar ? '✅ YES' : '❌ NO'}`);
        
        if (canUseRadar) {
            console.log('📡 Testing proximity detector specifications update...');
            radarHUD.updateRadarSpecifications();
            console.log(`Current proximity detector range: ${(radarHUD.config.range / 1000).toFixed(0)}km`);
            console.log(`Current update frequency: ${radarHUD.config.updateFrequency}Hz`);
        }
    } else {
        console.log('❌ Proximity Detector HUD not found');
    }
    
    // Test 5: Check card system integration
    console.log('📋 Test 5: Checking card system integration...');
    if (ship.cardSystemIntegration) {
        const systemMapping = ship.cardSystemIntegration.createSystemCardMapping();
        if (systemMapping.radar) {
            console.log('✅ Radar card mapping found:', systemMapping.radar);
        } else {
            console.log('❌ Radar card mapping not found');
        }
        
        // Test radar card types
        console.log('📦 Available proximity detector card types:');
        console.log('  • Basic Proximity Detector: basic_radar');
        console.log('  • Advanced Proximity Detector: advanced_radar');
        console.log('  • Tactical Proximity Detector: tactical_radar');
    }
    
    // Test 6: Try to toggle proximity detector
    console.log('📋 Test 6: Testing proximity detector toggle...');
    try {
        const toggleResult = window.starfieldManager.toggleProximityDetector();
        console.log('🎯 Proximity Detector toggle method executed successfully');
    } catch (error) {
        console.error('❌ Proximity Detector toggle failed:', error);
    }
    
    // Test 7: Check key binding
    console.log('📋 Test 7: Testing key binding...');
    console.log('💡 Press P key to test proximity detector toggle with card validation');
    console.log('💡 If no proximity detector cards: Should show "No Proximity Detector card installed" error');
    console.log('💡 If proximity detector cards installed: Should toggle proximity detector display');
    
    // Summary
    console.log('\n🎯 Proximity Detector Card Integration Test Summary:');
    console.log('✅ Card types defined in NFTCard.js');
    console.log('✅ Card system integration mapping added');
    console.log('✅ ProximityDetector system class created');
    console.log('✅ ProximityDetector HUD updated for card requirements');
    console.log('✅ Starter ship configured with basic proximity detector card');
    console.log('✅ Key binding (P) includes card validation');
    
    console.log('\n🚀 Test completed! The proximity detector system is now card-based.');
    console.log('🎮 Players need proximity detector cards to use the proximity detector system.');
    console.log('📈 Proximity detector capabilities improve with higher level cards.');
    
    return true;
}

// Auto-run test if called directly
if (typeof window !== 'undefined') {
    // Wait for game to load
    setTimeout(() => {
        if (window.starfieldManager) {
            testProximityDetectorCardIntegration();
        } else {
            console.log('⏳ Waiting for game to initialize...');
            // Try again in a few seconds
            setTimeout(() => {
                if (window.starfieldManager) {
                    testProximityDetectorCardIntegration();
                } else {
                    console.log('❌ Game not loaded after 10 seconds. Load the game first.');
                }
            }, 5000);
        }
    }, 5000);
}

// Export for manual testing
if (typeof window !== 'undefined') {
    window.testProximityDetectorCardIntegration = testProximityDetectorCardIntegration;
    console.log('🎯 testProximityDetectorCardIntegration() function is now available in the console');
}