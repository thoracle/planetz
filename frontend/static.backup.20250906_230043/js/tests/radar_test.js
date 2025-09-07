/**
 * Proximity Detector HUD Test Script
 * 
 * Simple test to verify proximity detector functionality works correctly.
 * Run in browser console after game loads.
 */

function testProximityDetector() {
    console.log('🎯 Testing Proximity Detector HUD functionality...');
    
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
    console.log('📡 Testing proximity detector toggle...');
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
    console.log('🎯 Testing object tracking...');
    proximityDetector.updateTrackedObjects();
    console.log(`📊 Tracked objects: ${proximityDetector.trackedObjects.size}`);
    
    // Test configuration
    console.log('⚙️ Proximity Detector configuration:');
    console.log(`  • Range: ${proximityDetector.config.range / 1000}km`);
    console.log(`  • Grid size: ${proximityDetector.config.gridSize}x${proximityDetector.config.gridSize}`);
    console.log(`  • Update frequency: ${proximityDetector.config.updateFrequency}Hz`);
    console.log(`  • Vertical range: ${proximityDetector.config.verticalRange / 1000}km`);
    
    // Test faction color system
    console.log('🎨 Testing faction colors...');
    const testTargets = [
        { diplomacy: 'enemy', name: 'Test Enemy' },
        { diplomacy: 'friendly', name: 'Test Friendly' },
        { diplomacy: 'neutral', name: 'Test Neutral' },
        { type: 'planet', name: 'Test Planet' },
        { type: 'star', name: 'Test Star' }
    ];
    
    testTargets.forEach(target => {
        const color = proximityDetector.getFactionColorForRadar(target);
        console.log(`  • ${target.name}: ${color}`);
    });
    
    // Test key binding
    console.log('⌨️ Testing key binding...');
    console.log('  • Press P key to toggle proximity detector');
    console.log('  • Proximity detector should appear in bottom center of screen');
    
    console.log('✅ Proximity Detector HUD test completed successfully!');
    console.log('💡 Use "window.starfieldManager.radarHUD.toggle()" to manually toggle proximity detector');
    console.log('💡 Use "window.starfieldManager.radarHUD.forceUpdate()" to force proximity detector update');
    
    return true;
}

// Auto-run test if called directly
if (typeof window !== 'undefined') {
    // Wait for game to load
    setTimeout(() => {
        if (window.starfieldManager) {
            testProximityDetector();
        } else {
            console.log('⏳ Waiting for game to initialize...');
            // Try again in a few seconds
            setTimeout(() => {
                if (window.starfieldManager) {
                    testProximityDetector();
                } else {
                    console.log('❌ Game not loaded after 10 seconds. Load the game first.');
                }
            }, 5000);
        }
    }, 5000);
}

// Export for manual testing
if (typeof window !== 'undefined') {
    window.testProximityDetector = testProximityDetector;
    console.log('🎯 testProximityDetector() function is now available in the console');
}