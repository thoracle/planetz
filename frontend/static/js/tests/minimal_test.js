import { debug } from '../debug.js';

// Minimal Proximity Detector Test - Copy this entire block into console

debug('UTILITY', 'Starting minimal proximity detector test...');

// Quick proximity detector test without loading external files
function quickProximityDetectorTest() {
debug('UTILITY', 'Testing proximity detector...');
    
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
    
debug('UTILITY', '📋 Test Results:');
debug('UTILITY', `  ✓ Game loaded: ${window.starfieldManager ? 'YES' : 'NO'}`);
debug('UI', `  ✓ Proximity Detector HUD: ${proximityDetector ? 'YES' : 'NO'}`);
debug('AI', `  ✓ Ship available: ${ship ? 'YES' : 'NO'}`);
    
    if (ship) {
        const hasRadarCards = ship.hasSystemCardsSync && ship.hasSystemCardsSync('radar');
debug('UI', `  ✓ Has proximity detector cards: ${hasRadarCards ? 'YES' : 'NO'}`);
        
        const radarSystem = ship.getSystem && ship.getSystem('radar');
debug('UTILITY', `  ✓ Proximity detector system: ${radarSystem ? 'YES' : 'NO'}`);
        
        if (radarSystem) {
debug('UTILITY', `  ✓ System level: ${radarSystem.level}`);
debug('UTILITY', `  ✓ System range: ${(radarSystem.getRange() / 1000).toFixed(0)}km`);
        }
    }
    
debug('UTILITY', '🎮 Manual test commands:');
debug('UTILITY', '  • Press P key to toggle proximity detector');
debug('UTILITY', '  • Or run: window.starfieldManager.toggleProximityDetector()');
    
    return true;
}

// Run the test
quickProximityDetectorTest();

// Make function available globally
if (typeof window !== 'undefined') {
    window.quickProximityDetectorTest = quickProximityDetectorTest;
}