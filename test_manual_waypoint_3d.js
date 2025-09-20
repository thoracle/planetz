/**
 * Manual Waypoint 3D Object Creation Test
 * 
 * This script tests if waypoint 3D objects can be created manually,
 * which helps identify if the issue is in the creation logic or calling logic.
 */

console.log('🔧 MANUAL WAYPOINT 3D OBJECT CREATION TEST');

// Test manual 3D object creation
function testManualWaypoint3DCreation() {
    console.log('=== MANUAL 3D OBJECT CREATION TEST ===');
    
    // Get the first waypoint
    const firstWaypoint = Array.from(window.waypointManager.activeWaypoints.values())[0];
    console.log('First waypoint:', firstWaypoint);
    
    if (!firstWaypoint) {
        console.error('❌ No waypoints found! Press W to create waypoints first.');
        return;
    }
    
    // Show waypoint details
    console.log('Waypoint details:', {
        id: firstWaypoint.id,
        name: firstWaypoint.name,
        position: firstWaypoint.position,
        status: firstWaypoint.status,
        triggerRadius: firstWaypoint.triggerRadius
    });
    
    // Check if WaypointIndicator exists
    if (!window.waypointManager.waypointIndicator) {
        console.error('❌ WaypointIndicator not initialized!');
        return;
    }
    
    console.log('✅ WaypointIndicator exists, attempting manual 3D object creation...');
    
    // Try to manually create 3D object
    try {
        window.waypointManager.create3DWaypointObject(firstWaypoint);
        console.log('✅ Manual create3DWaypointObject() called successfully');
    } catch (error) {
        console.error('❌ Error calling create3DWaypointObject():', error);
        return;
    }
    
    // Check if it worked after a short delay
    setTimeout(() => {
        console.log('=== RESULTS AFTER MANUAL CREATION ===');
        
        const indicator = window.waypointManager.waypointIndicator;
        console.log('waypointMeshes size:', indicator?.waypointMeshes?.size || 0);
        
        const scene = window.starfieldManager.scene;
        const waypointObjects = scene.children.filter(child => 
            child.userData?.isWaypointIndicator === true
        );
        console.log('Waypoint objects in scene:', waypointObjects.length);
        
        // If objects were created, show their details
        if (waypointObjects.length > 0) {
            console.log('✅ SUCCESS! Waypoint 3D objects created:');
            waypointObjects.forEach((obj, i) => {
                console.log(`  Waypoint ${i}:`, {
                    waypointId: obj.userData.waypointId,
                    position: obj.position,
                    visible: obj.visible,
                    children: obj.children.length
                });
            });
            
            // Test if we can see the first waypoint
            const firstObj = waypointObjects[0];
            if (firstObj) {
                console.log('🎯 First waypoint object details:');
                console.log('  Position:', firstObj.position);
                console.log('  Distance from origin:', firstObj.position.length().toFixed(2) + ' units');
                console.log('  Visible:', firstObj.visible);
                console.log('  In scene:', scene.children.includes(firstObj));
            }
        } else {
            console.error('❌ FAILED! No waypoint 3D objects were created');
            
            // Debug why it failed
            console.log('Debug info:');
            console.log('  WaypointIndicator scene:', !!indicator?.scene);
            console.log('  WaypointIndicator THREE:', !!indicator?.THREE);
            console.log('  Scene children count:', scene.children.length);
        }
    }, 500);
}

// Test all waypoints
function testAllWaypoints() {
    console.log('=== TESTING ALL WAYPOINTS ===');
    
    const waypoints = Array.from(window.waypointManager.activeWaypoints.values());
    console.log(`Found ${waypoints.length} waypoints`);
    
    waypoints.forEach((waypoint, index) => {
        console.log(`Creating 3D object for waypoint ${index + 1}:`, waypoint.name);
        window.waypointManager.create3DWaypointObject(waypoint);
    });
    
    // Check results
    setTimeout(() => {
        const scene = window.starfieldManager.scene;
        const waypointObjects = scene.children.filter(child => 
            child.userData?.isWaypointIndicator === true
        );
        console.log(`Result: ${waypointObjects.length} waypoint objects created in scene`);
    }, 1000);
}

// Export functions for manual use
window.testManualWaypoint3DCreation = testManualWaypoint3DCreation;
window.testAllWaypoints = testAllWaypoints;

// Run the test automatically
testManualWaypoint3DCreation();
