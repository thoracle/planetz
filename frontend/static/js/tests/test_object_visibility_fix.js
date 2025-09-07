import { debug } from '../debug.js';

// Test script specifically for object visibility fix
debug('UTILITY', 'OBJECT VISIBILITY FIX TEST');

function testObjectVisibilityFix() {
debug('UTILITY', '=== TESTING OBJECT VISIBILITY FIXES ===');
    
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
    
    // Ensure detector is visible
    if (!detector.isVisible) {
debug('UTILITY', 'Enabling proximity detector...');
        starfield.toggleProximityDetector();
    }
    
    // Test the new scaling logic
debug('UTILITY', 'Testing new object positioning logic...');
    
    // Get trackable objects
    const objects = detector.getAllTrackableObjects();
debug('UTILITY', `Found ${objects.length} trackable objects`);
    
    // Test player position detection
    const viewManager = starfield.viewManager;
    const ship = viewManager?.getShip();
    
    let playerPosition;
    if (ship?.mesh) {
        playerPosition = ship.mesh.position;
debug('UTILITY', '✅ Using ship mesh position');
    } else if (viewManager?.ship?.mesh) {
        playerPosition = viewManager.ship.mesh.position;
debug('UTILITY', '✅ Using viewManager ship mesh position');
    } else {
        playerPosition = starfield.camera.position;
debug('UTILITY', 'Using camera position fallback');
    }
    
debug('UTILITY', `📍 Player position: (${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)})`);
    
    // Test new scaling calculations
    const visualGridHalfExtent = (detector.config.gridSize / 2) * detector.config.gridSpacing;
    const radarSceneScaleFactor = 1 / visualGridHalfExtent;
    
debug('UTILITY', `📏 Visual grid half extent: ${visualGridHalfExtent}m`);
debug('UTILITY', `📏 Radar scene scale factor: ${radarSceneScaleFactor.toFixed(6)}`);
    
    // Test positioning for each object
    objects.forEach((obj, index) => {
        if (!obj.mesh) return;
        
        const relativePos = obj.mesh.position.clone().sub(playerPosition);
        const distance = relativePos.length();
        
        // New scaling logic
        const gridX = relativePos.x * radarSceneScaleFactor;
        const gridZ = relativePos.z * radarSceneScaleFactor;
        const altitude = relativePos.y / 1000;
        
        // Check if object should be in view
        const inGridRange = Math.abs(gridX) <= 1 && Math.abs(gridZ) <= 1;
        const inDetectionRange = distance <= detector.config.detectionRange;
        
debug('UTILITY', `🎯 ${obj.name}:`);
debug('UTILITY', `   World pos: (${obj.mesh.position.x.toFixed(1)}, ${obj.mesh.position.y.toFixed(1)}, ${obj.mesh.position.z.toFixed(1)})`);
debug('UTILITY', `   Relative: (${relativePos.x.toFixed(1)}, ${relativePos.y.toFixed(1)}, ${relativePos.z.toFixed(1)})`);
debug('UTILITY', `   Distance: ${distance.toFixed(1)}m`);
debug('UTILITY', `   Grid pos: (${gridX.toFixed(3)}, ${gridZ.toFixed(3)})`);
debug('UTILITY', `   Altitude: ${altitude.toFixed(3)}km`);
debug('UTILITY', `   In grid range: ${inGridRange ? '✅' : '❌'}`);
debug('UTILITY', `   In detection range: ${inDetectionRange ? '✅' : '❌'}`);
debug('UTILITY', `   Should be visible: ${inGridRange && inDetectionRange ? '✅' : '❌'}`);
        console.log('');
    });
    
    // Force update to apply new logic
debug('UTILITY', '🔄 Forcing detector update with new scaling...');
    detector.forceUpdate?.();
    
    // Check scene objects after update
    setTimeout(() => {
debug('UTILITY', '📊 Scene analysis after update:');
debug('UTILITY', `   Total scene objects: ${detector.scene?.children?.length || 0}`);
debug('UTILITY', `   Object blips: ${detector.objectBlips?.size || 0}`);
debug('UTILITY', `   Altitude lines: ${detector.altitudeLines?.size || 0}`);
        
        if (detector.scene) {
debug('UTILITY', '📋 Scene objects positions:');
            detector.scene.children.forEach((child, index) => {
                const pos = child.position;
                const inView = Math.abs(pos.x) <= 1.5 && Math.abs(pos.z) <= 1.5 && Math.abs(pos.y) <= 2;
debug('UTILITY', `   ${index}: ${child.type} at (${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)}) ${inView ? '✅' : '❌'}`);
            });
        }
        
debug('UTILITY', '✅ Object visibility test completed!');
debug('UTILITY', '💡 Objects should now be visible in the 3D proximity detector (bottom-left corner)');
        
    }, 1000);
    
    return {
        detector,
        objects,
        playerPosition,
        visualGridHalfExtent,
        radarSceneScaleFactor
    };
}

// Make globally available
window.testObjectVisibilityFix = testObjectVisibilityFix;

debug('UTILITY', '💡 Use testObjectVisibilityFix() to verify object positioning fixes');