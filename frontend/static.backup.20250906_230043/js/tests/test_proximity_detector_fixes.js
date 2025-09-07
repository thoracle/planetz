// Test script for proximity detector fixes
console.log('🔧 PROXIMITY DETECTOR FIXES TEST');

function testProximityDetectorFixes() {
    console.log('=== TESTING PROXIMITY DETECTOR IMPROVEMENTS ===');
    
    const starfield = window.starfieldManager;
    if (!starfield) {
        console.error('❌ StarfieldManager not available');
        return;
    }
    
    const detector = starfield.proximityDetector3D;
    if (!detector) {
        console.error('❌ ProximityDetector3D not available');
        return;
    }
    
    // Test 1: Configuration updates
    console.log('📋 Testing configuration updates:');
    console.log(`  Grid size: ${detector.config.gridSize}x${detector.config.gridSize} (should be 12x12)`);
    console.log(`  Grid spacing: ${detector.config.gridSpacing}m (should be 1000m)`);
    console.log(`  Screen size: ${detector.config.screenWidth * 100}% x ${detector.config.screenHeight * 100}% (should be 35% x 35%)`);
    console.log(`  Position: ${detector.config.position} (should be bottom-left)`);
    console.log(`  Camera distance: ${detector.config.cameraDistance} (should be 6)`);
    console.log(`  FOV: ${detector.config.fov}° (should be 60°)`);
    
    // Test 2: Check if detector is available
    const ship = starfield.viewManager?.getShip();
    if (!ship) {
        console.error('❌ Ship not available');
        return;
    }
    
    const hasCards = ship.hasSystemCardsSync?.('radar');
    console.log(`📇 Has radar cards: ${hasCards ? '✅' : '❌'}`);
    
    if (!hasCards) {
        console.error('❌ No radar cards - cannot test detector');
        return;
    }
    
    // Test 3: Toggle detector and check positioning
    console.log('🔄 Testing detector toggle and positioning...');
    
    if (!detector.isVisible) {
        console.log('📡 Turning ON proximity detector...');
        starfield.toggleProximityDetector();
    }
    
    // Wait a moment for the UI to update
    setTimeout(() => {
        const container = detector.detectorContainer;
        if (container) {
            const style = window.getComputedStyle(container);
            console.log('📦 Container positioning:');
            console.log(`  Display: ${style.display} (should be block)`);
            console.log(`  Position: ${style.position} (should be fixed)`);
            console.log(`  Bottom: ${style.bottom} (should be 20px)`);
            console.log(`  Left: ${style.left} (should be 20px)`);
            console.log(`  Transform: ${style.transform} (should be none)`);
            console.log(`  Width: ${style.width}`);
            console.log(`  Height: ${style.height}`);
            
            // Check if title is removed
            const title = container.querySelector('.proximity-detector-title');
            console.log(`📄 Title removed: ${!title ? '✅' : '❌'}`);
        }
        
        // Test 4: Force update and check object detection
        console.log('🎯 Testing object detection with new scaling...');
        detector.forceUpdate?.();
        
        setTimeout(() => {
            console.log(`📊 Scene objects: ${detector.scene?.children?.length || 0}`);
            console.log(`🎯 Tracked objects: ${detector.trackedObjects?.size || 0}`);
            console.log(`📍 Object blips: ${detector.objectBlips?.size || 0}`);
            console.log(`📏 Altitude lines: ${detector.altitudeLines?.size || 0}`);
            
            // List scene objects to see if blips are properly positioned
            if (detector.scene) {
                console.log('📋 Scene objects (should include blips within view):');
                detector.scene.children.forEach((child, index) => {
                    const pos = child.position;
                    const inView = Math.abs(pos.x) <= 1 && Math.abs(pos.z) <= 1;
                    console.log(`  ${index}: ${child.type} at (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}) ${inView ? '✅ IN VIEW' : '❌ OUT OF VIEW'}`);
                });
            }
            
            console.log('✅ Proximity detector fixes test completed!');
            console.log('💡 Check bottom-left corner of screen for larger 3D proximity detector');
            
        }, 500);
        
    }, 100);
    
    return detector;
}

// Make globally available
window.testProximityDetectorFixes = testProximityDetectorFixes;

console.log('💡 Use testProximityDetectorFixes() to verify all improvements');