/**
 * Test Loader for Proximity Detector
 * 
 * Run this in the browser console to load test functions:
 * 
 * // Load the test loader
 * const script = document.createElement('script');
 * script.src = 'static/js/tests/loadTests.js';
 * document.head.appendChild(script);
 * 
 * // Then run tests
 * testProximityDetector();
 * testProximityDetectorCardIntegration();
 */

console.log('🧪 Loading Proximity Detector test functions...');

// Load basic proximity detector test
function loadProximityDetectorTest() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'static/js/tests/radar_test.js';
        script.type = 'text/javascript'; // Ensure it's loaded as regular JavaScript
        script.onload = () => {
            console.log('✅ Basic proximity detector test loaded');
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Load card integration test
function loadProximityDetectorCardTest() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'static/js/tests/radar_card_test.js';
        script.type = 'text/javascript'; // Ensure it's loaded as regular JavaScript
        script.onload = () => {
            console.log('✅ Proximity detector card integration test loaded');
            resolve();
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// Load all tests
async function loadAllProximityDetectorTests() {
    try {
        await Promise.all([
            loadProximityDetectorTest(),
            loadProximityDetectorCardTest()
        ]);
        
        console.log('🎯 All proximity detector tests loaded successfully!');
        console.log('💡 Available test functions:');
        console.log('  • testProximityDetector()');
        console.log('  • testProximityDetectorCardIntegration()');
        console.log('');
        console.log('🎮 Example usage:');
        console.log('  testProximityDetector();');
        
        return true;
    } catch (error) {
        console.error('❌ Failed to load proximity detector tests:', error);
        return false;
    }
}

// Auto-load tests
loadAllProximityDetectorTests();

// Export loader function
if (typeof window !== 'undefined') {
    window.loadAllProximityDetectorTests = loadAllProximityDetectorTests;
}