import { debug } from '../debug.js';

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

debug('UTILITY', 'Loading Proximity Detector test functions...');

// Load basic proximity detector test
function loadProximityDetectorTest() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'static/js/tests/radar_test.js';
        script.type = 'text/javascript'; // Ensure it's loaded as regular JavaScript
        script.onload = () => {
debug('UTILITY', '✅ Basic proximity detector test loaded');
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
debug('UI', '✅ Proximity detector card integration test loaded');
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
        
debug('UTILITY', 'All proximity detector tests loaded successfully!');
debug('AI', '💡 Available test functions:');
debug('UTILITY', '  • testProximityDetector()');
debug('UI', '  • testProximityDetectorCardIntegration()');
        console.log('');
debug('UTILITY', '🎮 Example usage:');
debug('UTILITY', '  testProximityDetector();');
        
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