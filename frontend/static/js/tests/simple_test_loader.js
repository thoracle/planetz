import { debug } from '../debug.js';

// Simple Test Loader - Copy-paste this into browser console

debug('UTILITY', 'Loading Proximity Detector tests...');

// Load and run proximity detector tests
(async function() {
    // Load basic test
    const basicTest = new Promise((resolve, reject) => {
        const script1 = document.createElement('script');
        script1.src = 'static/js/tests/radar_test.js';
        script1.type = 'text/javascript';
        script1.onload = resolve;
        script1.onerror = reject;
        document.head.appendChild(script1);
    });
    
    // Load card integration test  
    const cardTest = new Promise((resolve, reject) => {
        const script2 = document.createElement('script');
        script2.src = 'static/js/tests/radar_card_test.js';
        script2.type = 'text/javascript';
        script2.onload = resolve;
        script2.onerror = reject;
        document.head.appendChild(script2);
    });
    
    try {
        // Wait for both tests to load
        await Promise.all([basicTest, cardTest]);
        
debug('UTILITY', '✅ Tests loaded successfully!');
debug('AI', '📋 Available functions:');
debug('UTILITY', '  • testProximityDetector()');
debug('UI', '  • testProximityDetectorCardIntegration()');
        console.log('');
debug('UTILITY', 'Running basic proximity detector test...');
        
        // Run basic test automatically
        setTimeout(() => {
            if (typeof testProximityDetector === 'function') {
                testProximityDetector();
            } else {
                console.error('❌ testProximityDetector function not found');
            }
        }, 100);
        
    } catch (error) {
        console.error('❌ Failed to load tests:', error);
debug('UTILITY', '💡 You can still test manually with:');
debug('UTILITY', '  window.starfieldManager.toggleProximityDetector();');
    }
})();

debug('UTILITY', '✅ Simple test loader script completed');