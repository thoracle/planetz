/**
 * Simple waypoint 3D debug script
 */

console.log('🔍 WAYPOINT 3D DEBUG - Simple Check');

// Enable waypoint debugging
if (window.debugEnable) {
    window.debugEnable('WAYPOINTS');
    console.log('✅ WAYPOINTS debug channel enabled');
}

// Check basic systems
console.log('=== SYSTEM CHECK ===');
console.log('waypointManager:', !!window.waypointManager);
console.log('starfieldManager:', !!window.starfieldManager);
console.log('scene:', !!window.starfieldManager?.scene);
console.log('THREE:', !!window.starfieldManager?.THREE);

// Check waypoint indicator
console.log('=== WAYPOINT INDICATOR CHECK ===');
console.log('waypointIndicator exists:', !!window.waypointManager?.waypointIndicator);

if (window.waypointManager?.waypointIndicator) {
    const indicator = window.waypointManager.waypointIndicator;
    console.log('waypointMeshes size:', indicator.waypointMeshes?.size || 0);
    console.log('animationFrameId:', indicator.animationFrameId);
    
    // List all waypoint objects
    if (indicator.waypointMeshes) {
        console.log('Waypoint objects:');
        indicator.waypointMeshes.forEach((mesh, id) => {
            console.log(`  ${id}:`, {
                position: mesh.position,
                visible: mesh.visible,
                children: mesh.children.length
            });
        });
    }
} else {
    console.log('❌ WaypointIndicator not initialized');
}

// Check active waypoints
console.log('=== ACTIVE WAYPOINTS CHECK ===');
if (window.waypointManager?.activeWaypoints) {
    console.log('Active waypoints count:', window.waypointManager.activeWaypoints.size);
    window.waypointManager.activeWaypoints.forEach((waypoint, id) => {
        console.log(`Waypoint ${id}:`, {
            name: waypoint.name,
            position: waypoint.position,
            status: waypoint.status
        });
    });
} else {
    console.log('❌ No active waypoints');
}

// Check scene objects
console.log('=== SCENE CHECK ===');
if (window.starfieldManager?.scene) {
    const scene = window.starfieldManager.scene;
    console.log('Total scene objects:', scene.children.length);
    
    // Look for waypoint objects in scene
    const waypointObjects = scene.children.filter(child => 
        child.userData?.isWaypointIndicator === true
    );
    console.log('Waypoint objects in scene:', waypointObjects.length);
    
    waypointObjects.forEach((obj, index) => {
        console.log(`Scene waypoint ${index}:`, {
            waypointId: obj.userData.waypointId,
            position: obj.position,
            visible: obj.visible
        });
    });
}

// Manual waypoint indicator initialization test
console.log('=== MANUAL INITIALIZATION TEST ===');
if (window.waypointManager && !window.waypointManager.waypointIndicator) {
    console.log('Attempting manual WaypointIndicator initialization...');
    window.waypointManager.initializeWaypointIndicator();
    
    // Wait a moment and check again
    setTimeout(() => {
        console.log('After manual init - waypointIndicator exists:', !!window.waypointManager?.waypointIndicator);
    }, 1000);
}
