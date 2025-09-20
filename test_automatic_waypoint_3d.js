/**
 * Test Automatic Waypoint 3D Object Creation
 * 
 * This script tests if waypoint 3D objects are created automatically
 * when pressing 'W' to create waypoints.
 */

console.log('🎯 TESTING AUTOMATIC WAYPOINT 3D CREATION');

// Enable waypoint debugging first
if (window.debugEnable) {
    window.debugEnable('WAYPOINTS');
    console.log('✅ WAYPOINTS debug channel enabled');
}

// Function to test automatic creation
function testAutomaticWaypointCreation() {
    console.log('=== AUTOMATIC WAYPOINT CREATION TEST ===');
    
    // Clear any existing waypoints first
    if (window.waypointManager) {
        window.waypointManager.cleanupTestMissions();
        console.log('🧹 Cleared existing test waypoints');
    }
    
    // Wait a moment, then check initial state
    setTimeout(() => {
        console.log('Initial state:');
        console.log('  Active waypoints:', window.waypointManager?.activeWaypoints?.size || 0);
        console.log('  3D objects:', window.waypointManager?.waypointIndicator?.waypointMeshes?.size || 0);
        
        console.log('\n🎯 Now press the W key to create waypoints...');
        console.log('After pressing W, wait 2 seconds and run: checkWaypointCreation()');
        
        // Make function available globally
        window.checkWaypointCreation = checkWaypointCreation;
        
    }, 500);
}

// Function to check if waypoints were created automatically
function checkWaypointCreation() {
    console.log('=== CHECKING WAYPOINT CREATION RESULTS ===');
    
    const activeWaypoints = window.waypointManager?.activeWaypoints?.size || 0;
    const waypointObjects = window.waypointManager?.waypointIndicator?.waypointMeshes?.size || 0;
    
    console.log('After pressing W:');
    console.log('  Active waypoints:', activeWaypoints);
    console.log('  3D objects created:', waypointObjects);
    
    // Check scene
    const scene = window.starfieldManager?.scene;
    if (scene) {
        const sceneWaypoints = scene.children.filter(child => 
            child.userData?.isWaypointIndicator === true
        );
        console.log('  3D objects in scene:', sceneWaypoints.length);
        
        if (sceneWaypoints.length > 0) {
            console.log('✅ SUCCESS! Automatic waypoint 3D creation is working!');
            sceneWaypoints.forEach((obj, i) => {
                console.log(`  Waypoint ${i + 1}:`, {
                    position: obj.position,
                    distance: obj.position.length().toFixed(2) + ' units',
                    visible: obj.visible
                });
            });
        } else if (activeWaypoints > 0) {
            console.log('⚠️ PARTIAL: Waypoints created but no 3D objects in scene');
            console.log('This means the automatic 3D creation is not working yet');
        } else {
            console.log('❌ FAILED: No waypoints created at all');
        }
    }
    
    // Check if WaypointIndicator is initialized
    if (window.waypointManager?.waypointIndicator) {
        console.log('✅ WaypointIndicator is initialized');
    } else {
        console.log('❌ WaypointIndicator not initialized');
    }
}

// Function to force create 3D objects for existing waypoints
function forceCreate3DObjects() {
    console.log('=== FORCING 3D OBJECT CREATION ===');
    
    if (!window.waypointManager?.activeWaypoints) {
        console.log('❌ No waypoints to create 3D objects for');
        return;
    }
    
    const waypoints = Array.from(window.waypointManager.activeWaypoints.values());
    console.log(`Found ${waypoints.length} waypoints, creating 3D objects...`);
    
    waypoints.forEach(waypoint => {
        window.waypointManager.create3DWaypointObject(waypoint);
    });
    
    // Check results
    setTimeout(() => {
        const scene = window.starfieldManager?.scene;
        const sceneWaypoints = scene.children.filter(child => 
            child.userData?.isWaypointIndicator === true
        );
        console.log(`Result: ${sceneWaypoints.length} 3D objects created in scene`);
    }, 1000);
}

// Export functions
window.testAutomaticWaypointCreation = testAutomaticWaypointCreation;
window.checkWaypointCreation = checkWaypointCreation;
window.forceCreate3DObjects = forceCreate3DObjects;

// Run the test
testAutomaticWaypointCreation();
