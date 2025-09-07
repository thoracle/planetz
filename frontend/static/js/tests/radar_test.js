import { debug } from '../debug.js';

/**
 * Proximity Detector HUD Test Script
 * 
 * Simple test to verify proximity detector functionality works correctly.
 * Run in browser console after game loads.
 */

function testProximityDetector() {
debug('UI', 'Testing Proximity Detector HUD functionality...');
    
    // Check if StarfieldManager is available
    if (!window.starfieldManager) {
        console.error('❌ StarfieldManager not found. Make sure game is fully loaded.');
        return false;
    }
    
    // Check if RadarHUD is initialized
    if (!window.starfieldManager.radarHUD) {
        console.error('❌ Proximity Detector HUD not initialized in StarfieldManager.');
        return false;
    }
    
    const proximityDetector = window.starfieldManager.radarHUD;
    
    // Test proximity detector toggle
debug('UTILITY', 'Testing proximity detector toggle...');
    const initialState = proximityDetector.isVisible;
    
    proximityDetector.toggle();
    if (proximityDetector.isVisible !== !initialState) {
        console.error('❌ Proximity detector toggle failed');
        return false;
    }
    
    proximityDetector.toggle(); // Toggle back
    if (proximityDetector.isVisible !== initialState) {
        console.error('❌ Proximity detector toggle back failed');
        return false;
    }
    
    // Test object tracking
debug('UTILITY', 'Testing object tracking...');
    proximityDetector.updateTrackedObjects();
debug('UTILITY', `📊 Tracked objects: ${proximityDetector.trackedObjects.size}`);
    
    // Test configuration
debug('UTILITY', 'Proximity Detector configuration:');
debug('UTILITY', `  • Range: ${proximityDetector.config.range / 1000}km`);
debug('UTILITY', `  • Grid size: ${proximityDetector.config.gridSize}x${proximityDetector.config.gridSize}`);
debug('UTILITY', `  • Update frequency: ${proximityDetector.config.updateFrequency}Hz`);
debug('UTILITY', `  • Vertical range: ${proximityDetector.config.verticalRange / 1000}km`);
    
    // Test faction color system
debug('UTILITY', '🎨 Testing faction colors...');
    const testTargets = [
        { diplomacy: 'enemy', name: 'Test Enemy' },
        { diplomacy: 'friendly', name: 'Test Friendly' },
        { diplomacy: 'neutral', name: 'Test Neutral' },
        { type: 'planet', name: 'Test Planet' },
        { type: 'star', name: 'Test Star' }
    ];
    
    testTargets.forEach(target => {
        const color = proximityDetector.getFactionColorForRadar(target);
debug('TARGETING', `  • ${target.name}: ${color}`);
    });
    
    // Test key binding
debug('UTILITY', 'Testing key binding...');
debug('UTILITY', '  • Press P key to toggle proximity detector');
debug('UTILITY', '  • Proximity detector should appear in bottom center of screen');
    
debug('UI', '✅ Proximity Detector HUD test completed successfully!');
debug('UI', '💡 Use "window.starfieldManager.radarHUD.toggle()" to manually toggle proximity detector');
debug('UI', '💡 Use "window.starfieldManager.radarHUD.forceUpdate()" to force proximity detector update');
    
    return true;
}

// Auto-run test if called directly
if (typeof window !== 'undefined') {
    // Wait for game to load
    setTimeout(() => {
        if (window.starfieldManager) {
            testProximityDetector();
        } else {
debug('AI', '⏳ Waiting for game to initialize...');
            // Try again in a few seconds
            setTimeout(() => {
                if (window.starfieldManager) {
                    testProximityDetector();
                } else {
debug('UTILITY', '❌ Game not loaded after 10 seconds. Load the game first.');
                }
            }, 5000);
        }
    }, 5000);
}

// Export for manual testing
if (typeof window !== 'undefined') {
    window.testProximityDetector = testProximityDetector;
debug('AI', 'testProximityDetector() function is now available in the console');
}