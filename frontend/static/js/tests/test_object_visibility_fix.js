// Test script specifically for object visibility fix
console.log('👁️ OBJECT VISIBILITY FIX TEST');

function testObjectVisibilityFix() {
    console.log('=== TESTING OBJECT VISIBILITY FIXES ===');
    
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
        console.log('📡 Enabling proximity detector...');
        starfield.toggleProximityDetector();
    }
    
    // Test the new scaling logic
    console.log('🔍 Testing new object positioning logic...');
    
    // Get trackable objects
    const objects = detector.getAllTrackableObjects();
    console.log(`Found ${objects.length} trackable objects`);
    
    // Test player position detection
    const viewManager = starfield.viewManager;
    const ship = viewManager?.getShip();
    
    let playerPosition;
    if (ship?.mesh) {
        playerPosition = ship.mesh.position;
        console.log('✅ Using ship mesh position');
    } else if (viewManager?.ship?.mesh) {
        playerPosition = viewManager.ship.mesh.position;
        console.log('✅ Using viewManager ship mesh position');
    } else {
        playerPosition = starfield.camera.position;
        console.log('⚠️ Using camera position fallback');
    }
    
    console.log(`📍 Player position: (${playerPosition.x.toFixed(1)}, ${playerPosition.y.toFixed(1)}, ${playerPosition.z.toFixed(1)})`);
    
    // Test new scaling calculations
    const visualGridHalfExtent = (detector.config.gridSize / 2) * detector.config.gridSpacing;
    const radarSceneScaleFactor = 1 / visualGridHalfExtent;
    
    console.log(`📏 Visual grid half extent: ${visualGridHalfExtent}m`);
    console.log(`📏 Radar scene scale factor: ${radarSceneScaleFactor.toFixed(6)}`);
    
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
        
        console.log(`🎯 ${obj.name}:`);
        console.log(`   World pos: (${obj.mesh.position.x.toFixed(1)}, ${obj.mesh.position.y.toFixed(1)}, ${obj.mesh.position.z.toFixed(1)})`);
        console.log(`   Relative: (${relativePos.x.toFixed(1)}, ${relativePos.y.toFixed(1)}, ${relativePos.z.toFixed(1)})`);
        console.log(`   Distance: ${distance.toFixed(1)}m`);
        console.log(`   Grid pos: (${gridX.toFixed(3)}, ${gridZ.toFixed(3)})`);
        console.log(`   Altitude: ${altitude.toFixed(3)}km`);
        console.log(`   In grid range: ${inGridRange ? '✅' : '❌'}`);
        console.log(`   In detection range: ${inDetectionRange ? '✅' : '❌'}`);
        console.log(`   Should be visible: ${inGridRange && inDetectionRange ? '✅' : '❌'}`);
        console.log('');
    });
    
    // Force update to apply new logic
    console.log('🔄 Forcing detector update with new scaling...');
    detector.forceUpdate?.();
    
    // Check scene objects after update
    setTimeout(() => {
        console.log('📊 Scene analysis after update:');
        console.log(`   Total scene objects: ${detector.scene?.children?.length || 0}`);
        console.log(`   Object blips: ${detector.objectBlips?.size || 0}`);
        console.log(`   Altitude lines: ${detector.altitudeLines?.size || 0}`);
        
        if (detector.scene) {
            console.log('📋 Scene objects positions:');
            detector.scene.children.forEach((child, index) => {
                const pos = child.position;
                const inView = Math.abs(pos.x) <= 1.5 && Math.abs(pos.z) <= 1.5 && Math.abs(pos.y) <= 2;
                console.log(`   ${index}: ${child.type} at (${pos.x.toFixed(3)}, ${pos.y.toFixed(3)}, ${pos.z.toFixed(3)}) ${inView ? '✅' : '❌'}`);
            });
        }
        
        console.log('✅ Object visibility test completed!');
        console.log('💡 Objects should now be visible in the 3D proximity detector (bottom-left corner)');
        
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

console.log('💡 Use testObjectVisibilityFix() to verify object positioning fixes');