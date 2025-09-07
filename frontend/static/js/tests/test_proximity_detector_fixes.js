import { debug } from '../debug.js';

// Test script for proximity detector fixes
debug('UTILITY', 'PROXIMITY DETECTOR FIXES TEST');

function testProximityDetectorFixes() {
debug('UTILITY', '=== TESTING PROXIMITY DETECTOR IMPROVEMENTS ===');
    
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
debug('UTILITY', '📋 Testing configuration updates:');
debug('UTILITY', `  Grid size: ${detector.config.gridSize}x${detector.config.gridSize} (should be 12x12)`);
debug('UTILITY', `  Grid spacing: ${detector.config.gridSpacing}m (should be 1000m)`);
debug('UTILITY', `  Screen size: ${detector.config.screenWidth * 100}% x ${detector.config.screenHeight * 100}% (should be 35% x 35%)`);
debug('UTILITY', `  Position: ${detector.config.position} (should be bottom-left)`);
debug('UTILITY', `  Camera distance: ${detector.config.cameraDistance} (should be 6)`);
debug('UTILITY', `  FOV: ${detector.config.fov}° (should be 60°)`);
    
    // Test 2: Check if detector is available
    const ship = starfield.viewManager?.getShip();
    if (!ship) {
        console.error('❌ Ship not available');
        return;
    }
    
    const hasCards = ship.hasSystemCardsSync?.('radar');
debug('UI', `📇 Has radar cards: ${hasCards ? '✅' : '❌'}`);
    
    if (!hasCards) {
        console.error('❌ No radar cards - cannot test detector');
        return;
    }
    
    // Test 3: Toggle detector and check positioning
debug('UTILITY', '🔄 Testing detector toggle and positioning...');
    
    if (!detector.isVisible) {
debug('UTILITY', 'Turning ON proximity detector...');
        starfield.toggleProximityDetector();
    }
    
    // Wait a moment for the UI to update
    setTimeout(() => {
        const container = detector.detectorContainer;
        if (container) {
            const style = window.getComputedStyle(container);
debug('AI', '📦 Container positioning:');
debug('UI', `  Display: ${style.display} (should be block)`);
debug('UTILITY', `  Position: ${style.position} (should be fixed)`);
debug('UTILITY', `  Bottom: ${style.bottom} (should be 20px)`);
debug('UTILITY', `  Left: ${style.left} (should be 20px)`);
debug('UTILITY', `  Transform: ${style.transform} (should be none)`);
debug('UTILITY', `  Width: ${style.width}`);
debug('UTILITY', `  Height: ${style.height}`);
            
            // Check if title is removed
            const title = container.querySelector('.proximity-detector-title');
debug('UTILITY', `📄 Title removed: ${!title ? '✅' : '❌'}`);
        }
        
        // Test 4: Force update and check object detection
debug('UTILITY', 'Testing object detection with new scaling...');
        detector.forceUpdate?.();
        
        setTimeout(() => {
debug('UTILITY', `📊 Scene objects: ${detector.scene?.children?.length || 0}`);
debug('UTILITY', `🎯 Tracked objects: ${detector.trackedObjects?.size || 0}`);
debug('UTILITY', `📍 Object blips: ${detector.objectBlips?.size || 0}`);
debug('UTILITY', `📏 Altitude lines: ${detector.altitudeLines?.size || 0}`);
            
            // List scene objects to see if blips are properly positioned
            if (detector.scene) {
debug('UTILITY', '📋 Scene objects (should include blips within view):');
                detector.scene.children.forEach((child, index) => {
                    const pos = child.position;
                    const inView = Math.abs(pos.x) <= 1 && Math.abs(pos.z) <= 1;
debug('UTILITY', `  ${index}: ${child.type} at (${pos.x.toFixed(2)}, ${pos.y.toFixed(2)}, ${pos.z.toFixed(2)}) ${inView ? '✅ IN VIEW' : '❌ OUT OF VIEW'}`);
                });
            }
            
debug('UTILITY', '✅ Proximity detector fixes test completed!');
debug('UTILITY', '💡 Check bottom-left corner of screen for larger 3D proximity detector');
            
        }, 500);
        
    }, 100);
    
    return detector;
}

// Make globally available
window.testProximityDetectorFixes = testProximityDetectorFixes;

debug('UTILITY', '💡 Use testProximityDetectorFixes() to verify all improvements');