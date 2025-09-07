import { debug } from '../debug.js';

/**
 * 3D Proximity Detector Test
 * 
 * Test the new Elite (1984) inspired 3D perspective proximity detector.
 * Run in browser console after game loads.
 */

function test3DProximityDetector() {
debug('UTILITY', 'Testing 3D Perspective Proximity Detector...');
    
    // Check if game is loaded
    if (!window.starfieldManager) {
        console.error('❌ Game not loaded. Load the game first.');
        return false;
    }
    
    // Check if 3D proximity detector exists
    if (!window.starfieldManager.proximityDetector3D) {
        console.error('❌ 3D Proximity Detector not found.');
        return false;
    }
    
    const detector = window.starfieldManager.proximityDetector3D;
    const ship = window.starfieldManager.viewManager?.getShip();
    
debug('UTILITY', '📋 3D Proximity Detector Test Results:');
debug('UTILITY', `  ✓ Game loaded: ${window.starfieldManager ? 'YES' : 'NO'}`);
debug('UTILITY', `  ✓ 3D Proximity Detector: ${detector ? 'YES' : 'NO'}`);
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
    
    // Test 3D configuration
    if (detector) {
debug('UTILITY', '🎮 3D Configuration:');
debug('UTILITY', `  • Grid size: ${detector.config.gridSize}x${detector.config.gridSize}`);
debug('UTILITY', `  • Grid tilt: ${detector.config.gridTilt}°`);
debug('UTILITY', `  • Detection range: ${(detector.config.detectionRange / 1000).toFixed(0)}km`);
debug('UTILITY', `  • Altitude range: ±${(detector.config.altitudeRange / 1000).toFixed(0)}km`);
debug('UTILITY', `  • Update frequency: ${detector.config.updateFrequency}Hz`);
debug('UTILITY', `  • Screen size: ${(detector.config.screenWidth * 100).toFixed(0)}% x ${(detector.config.screenHeight * 100).toFixed(0)}%`);
        
        // Test 3D scene components
debug('UTILITY', '3D Scene Components:');
debug('UTILITY', `  • Scene: ${detector.scene ? 'YES' : 'NO'}`);
debug('UTILITY', `  • Camera: ${detector.camera ? 'YES' : 'NO'}`);
debug('RENDER', `  • Renderer: ${detector.renderer ? 'YES' : 'NO'}`);
debug('UTILITY', `  • Grid mesh: ${detector.gridMesh ? 'YES' : 'NO'}`);
debug('UTILITY', `  • Player indicator: ${detector.playerIndicator ? 'YES' : 'NO'}`);
        
        if (detector.camera) {
debug('UTILITY', `  • Camera FOV: ${detector.camera.fov}°`);
debug('UTILITY', `  • Camera position: (${detector.camera.position.x.toFixed(1)}, ${detector.camera.position.y.toFixed(1)}, ${detector.camera.position.z.toFixed(1)})`);
        }
        
        // Test visibility toggle
debug('UTILITY', '🔄 Testing visibility toggle...');
        const wasVisible = detector.isVisible;
        const toggleResult = detector.toggle();
        
        if (toggleResult) {
debug('UTILITY', `  ✓ Toggle successful: ${wasVisible ? 'Hidden' : 'Shown'}`);
            
            // Toggle back if we changed it
            if (detector.isVisible !== wasVisible) {
                setTimeout(() => {
                    detector.toggle();
debug('UTILITY', `  ✓ Restored original state: ${wasVisible ? 'Shown' : 'Hidden'}`);
                }, 1000);
            }
        } else {
debug('P1', `  ❌ Toggle failed - likely no proximity detector cards installed`);
        }
    }
    
debug('UTILITY', '🎮 Manual test commands:');
debug('UTILITY', '  • Press P key to toggle 3D proximity detector');
debug('UTILITY', '  • Or run: window.starfieldManager.toggleProximityDetector()');
debug('UTILITY', '  • Test with objects: Fly near planets/stations to see blips');
    
debug('UTILITY', '✅ 3D Proximity Detector test completed!');
debug('UTILITY', 'Features to verify:');
debug('UTILITY', '  • Tilted 3D perspective grid (35° angle)');
debug('UTILITY', '  • Grid rotates with ship orientation');
debug('UTILITY', '  • Vertical altitude lines for objects');
debug('UTILITY', '  • Color-coded blips (Red=Enemy, Green=Friendly, Yellow=Neutral)');
debug('UTILITY', '  • Elite (1984) retro holographic aesthetic');
debug('UTILITY', '  • Lower center screen position');
    
    return true;
}

// Export for manual testing
if (typeof window !== 'undefined') {
    window.test3DProximityDetector = test3DProximityDetector;
debug('AI', 'test3DProximityDetector() function is now available in the console');
}

// Auto-run test if called directly
if (typeof window !== 'undefined') {
    // Wait for game to load
    setTimeout(() => {
        if (window.starfieldManager) {
            test3DProximityDetector();
        } else {
debug('AI', '⏳ Waiting for game to initialize...');
            // Try again in a few seconds
            setTimeout(() => {
                if (window.starfieldManager) {
                    test3DProximityDetector();
                } else {
debug('UTILITY', '❌ Game not loaded after 10 seconds. Load the game first.');
                }
            }, 5000);
        }
    }, 2000);
}