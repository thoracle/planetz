import { debug } from '../debug.js';

/**
 * Console Commands for Proximity Detector Testing
 * 
 * Copy and paste these commands into the browser console to test the proximity detector:
 */

// ===== QUICK LOAD TESTS =====
// Copy-paste this entire block into the browser console:

/*
// Load and run proximity detector tests
(async function() {
debug('UTILITY', 'Loading proximity detector tests...');
    
    // Load basic test
    const basicTest = new Promise((resolve) => {
        const script1 = document.createElement('script');
        script1.src = 'static/js/tests/radar_test.js';
        script1.type = 'text/javascript';
        script1.onload = resolve;
        document.head.appendChild(script1);
    });
    
    // Load card integration test
    const cardTest = new Promise((resolve) => {
        const script2 = document.createElement('script');
        script2.src = 'static/js/tests/radar_card_test.js';
        script2.type = 'text/javascript';
        script2.onload = resolve;
        document.head.appendChild(script2);
    });
    
    // Wait for both tests to load
    await Promise.all([basicTest, cardTest]);
    
debug('AI', '✅ Tests loaded! Available functions:');
debug('UTILITY', '  • testProximityDetector()');
debug('UI', '  • testProximityDetectorCardIntegration()');
    
    // Run basic test
debug('UTILITY', 'Running basic proximity detector test...');
    testProximityDetector();
})();
*/

// ===== INDIVIDUAL COMMANDS =====

// 1. Manual proximity detector toggle:
// window.starfieldManager.toggleProximityDetector();

// 2. Force proximity detector update:
// window.starfieldManager.radarHUD.forceUpdate();

// 3. Check if proximity detector can be used:
// window.starfieldManager.radarHUD.canUseRadar();

// 4. Check proximity detector configuration:
// console.log(window.starfieldManager.radarHUD.config);

// 5. Check ship proximity detector cards:
// const ship = window.starfieldManager.viewManager?.getShip();
// console.log('Has proximity detector cards:', ship?.hasSystemCardsSync('radar'));

// 6. Check proximity detector system:
// const ship = window.starfieldManager.viewManager?.getShip();
// const radarSystem = ship?.getSystem('radar');
// console.log('Proximity detector system:', radarSystem?.getStatus());

debug('UTILITY', '📋 Proximity Detector Console Commands loaded');
debug('UTILITY', '💡 See console_commands.js for copy-paste test commands');