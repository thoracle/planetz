// Minimal Proximity Detector Test - Copy this entire block into console

console.log('🎯 Starting minimal proximity detector test...');

// Quick proximity detector test without loading external files
function quickProximityDetectorTest() {
    console.log('🧪 Testing proximity detector...');
    
    // Check if game is loaded
    if (!window.starfieldManager) {
        console.error('❌ Game not loaded. Load the game first.');
        return;
    }
    
    // Check if proximity detector HUD exists
    if (!window.starfieldManager.radarHUD) {
        console.error('❌ Proximity Detector HUD not found.');
        return;
    }
    
    const proximityDetector = window.starfieldManager.radarHUD;
    const ship = window.starfieldManager.viewManager?.getShip();
    
    console.log('📋 Test Results:');
    console.log(`  ✓ Game loaded: ${window.starfieldManager ? 'YES' : 'NO'}`);
    console.log(`  ✓ Proximity Detector HUD: ${proximityDetector ? 'YES' : 'NO'}`);
    console.log(`  ✓ Ship available: ${ship ? 'YES' : 'NO'}`);
    
    if (ship) {
        const hasRadarCards = ship.hasSystemCardsSync && ship.hasSystemCardsSync('radar');
        console.log(`  ✓ Has proximity detector cards: ${hasRadarCards ? 'YES' : 'NO'}`);
        
        const radarSystem = ship.getSystem && ship.getSystem('radar');
        console.log(`  ✓ Proximity detector system: ${radarSystem ? 'YES' : 'NO'}`);
        
        if (radarSystem) {
            console.log(`  ✓ System level: ${radarSystem.level}`);
            console.log(`  ✓ System range: ${(radarSystem.getRange() / 1000).toFixed(0)}km`);
        }
    }
    
    console.log('🎮 Manual test commands:');
    console.log('  • Press P key to toggle proximity detector');
    console.log('  • Or run: window.starfieldManager.toggleProximityDetector()');
    
    return true;
}

// Run the test
quickProximityDetectorTest();

// Make function available globally
if (typeof window !== 'undefined') {
    window.quickProximityDetectorTest = quickProximityDetectorTest;
}