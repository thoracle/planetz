// Simple Test Loader - Copy-paste this into browser console

console.log('🧪 Loading Proximity Detector tests...');

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
        
        console.log('✅ Tests loaded successfully!');
        console.log('📋 Available functions:');
        console.log('  • testProximityDetector()');
        console.log('  • testProximityDetectorCardIntegration()');
        console.log('');
        console.log('🎯 Running basic proximity detector test...');
        
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
        console.log('💡 You can still test manually with:');
        console.log('  window.starfieldManager.toggleProximityDetector();');
    }
})();

console.log('✅ Simple test loader script completed');