/**
 * 3D Proximity Detector Test
 * 
 * Test the new Elite (1984) inspired 3D perspective proximity detector.
 * Run in browser console after game loads.
 */

function test3DProximityDetector() {
    console.log('🎯 Testing 3D Perspective Proximity Detector...');
    
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
    
    console.log('📋 3D Proximity Detector Test Results:');
    console.log(`  ✓ Game loaded: ${window.starfieldManager ? 'YES' : 'NO'}`);
    console.log(`  ✓ 3D Proximity Detector: ${detector ? 'YES' : 'NO'}`);
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
    
    // Test 3D configuration
    if (detector) {
        console.log('🎮 3D Configuration:');
        console.log(`  • Grid size: ${detector.config.gridSize}x${detector.config.gridSize}`);
        console.log(`  • Grid tilt: ${detector.config.gridTilt}°`);
        console.log(`  • Detection range: ${(detector.config.detectionRange / 1000).toFixed(0)}km`);
        console.log(`  • Altitude range: ±${(detector.config.altitudeRange / 1000).toFixed(0)}km`);
        console.log(`  • Update frequency: ${detector.config.updateFrequency}Hz`);
        console.log(`  • Screen size: ${(detector.config.screenWidth * 100).toFixed(0)}% x ${(detector.config.screenHeight * 100).toFixed(0)}%`);
        
        // Test 3D scene components
        console.log('🎯 3D Scene Components:');
        console.log(`  • Scene: ${detector.scene ? 'YES' : 'NO'}`);
        console.log(`  • Camera: ${detector.camera ? 'YES' : 'NO'}`);
        console.log(`  • Renderer: ${detector.renderer ? 'YES' : 'NO'}`);
        console.log(`  • Grid mesh: ${detector.gridMesh ? 'YES' : 'NO'}`);
        console.log(`  • Player indicator: ${detector.playerIndicator ? 'YES' : 'NO'}`);
        
        if (detector.camera) {
            console.log(`  • Camera FOV: ${detector.camera.fov}°`);
            console.log(`  • Camera position: (${detector.camera.position.x.toFixed(1)}, ${detector.camera.position.y.toFixed(1)}, ${detector.camera.position.z.toFixed(1)})`);
        }
        
        // Test visibility toggle
        console.log('🔄 Testing visibility toggle...');
        const wasVisible = detector.isVisible;
        const toggleResult = detector.toggle();
        
        if (toggleResult) {
            console.log(`  ✓ Toggle successful: ${wasVisible ? 'Hidden' : 'Shown'}`);
            
            // Toggle back if we changed it
            if (detector.isVisible !== wasVisible) {
                setTimeout(() => {
                    detector.toggle();
                    console.log(`  ✓ Restored original state: ${wasVisible ? 'Shown' : 'Hidden'}`);
                }, 1000);
            }
        } else {
            console.log(`  ❌ Toggle failed - likely no proximity detector cards installed`);
        }
    }
    
    console.log('🎮 Manual test commands:');
    console.log('  • Press P key to toggle 3D proximity detector');
    console.log('  • Or run: window.starfieldManager.toggleProximityDetector()');
    console.log('  • Test with objects: Fly near planets/stations to see blips');
    
    console.log('✅ 3D Proximity Detector test completed!');
    console.log('🎯 Features to verify:');
    console.log('  • Tilted 3D perspective grid (35° angle)');
    console.log('  • Grid rotates with ship orientation');
    console.log('  • Vertical altitude lines for objects');
    console.log('  • Color-coded blips (Red=Enemy, Green=Friendly, Yellow=Neutral)');
    console.log('  • Elite (1984) retro holographic aesthetic');
    console.log('  • Lower center screen position');
    
    return true;
}

// Export for manual testing
if (typeof window !== 'undefined') {
    window.test3DProximityDetector = test3DProximityDetector;
    console.log('🎯 test3DProximityDetector() function is now available in the console');
}

// Auto-run test if called directly
if (typeof window !== 'undefined') {
    // Wait for game to load
    setTimeout(() => {
        if (window.starfieldManager) {
            test3DProximityDetector();
        } else {
            console.log('⏳ Waiting for game to initialize...');
            // Try again in a few seconds
            setTimeout(() => {
                if (window.starfieldManager) {
                    test3DProximityDetector();
                } else {
                    console.log('❌ Game not loaded after 10 seconds. Load the game first.');
                }
            }, 5000);
        }
    }, 2000);
}