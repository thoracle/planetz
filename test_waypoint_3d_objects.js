/**
 * Test script for waypoint 3D objects
 * 
 * This script tests the new waypoint 3D object system to ensure waypoints
 * appear as visible objects in world space.
 */

console.log('🎯 Testing Waypoint 3D Objects System');

// Test function to create waypoint and verify 3D object creation
async function testWaypoint3DObjects() {
    console.log('\n=== WAYPOINT 3D OBJECTS TEST ===');
    
    // Check if required systems are available
    const requiredSystems = [
        { name: 'starfieldManager', object: window.starfieldManager },
        { name: 'waypointManager', object: window.waypointManager },
        { name: 'targetComputerManager', object: window.targetComputerManager }
    ];
    
    for (const system of requiredSystems) {
        if (!system.object) {
            console.error(`❌ ${system.name} not available`);
            return false;
        }
        console.log(`✅ ${system.name} available`);
    }
    
    // Check if scene and THREE are available
    const scene = window.starfieldManager.scene;
    const THREE = window.starfieldManager.THREE;
    
    if (!scene) {
        console.error('❌ Three.js scene not available');
        return false;
    }
    
    if (!THREE) {
        console.error('❌ THREE.js library not available');
        return false;
    }
    
    console.log('✅ Three.js scene and library available');
    
    // Create a test waypoint
    console.log('\n--- Creating Test Waypoint ---');
    
    const testWaypointConfig = {
        name: '3D Test Waypoint',
        position: [50, 0, 50], // 50km away from origin
        triggerRadius: 15.0,
        type: 'navigation',
        actions: [{
            type: 'show_message',
            parameters: {
                message: '3D waypoint test successful!',
                duration: 3000
            }
        }]
    };
    
    const waypointId = window.waypointManager.createWaypoint(testWaypointConfig);
    console.log(`✅ Created waypoint: ${waypointId}`);
    
    // Wait a moment for async initialization
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if waypoint indicator was initialized
    if (window.waypointManager.waypointIndicator) {
        console.log('✅ WaypointIndicator system initialized');
        
        // Check if 3D object was created
        const has3DObject = window.waypointManager.waypointIndicator.hasWaypointObject(waypointId);
        if (has3DObject) {
            console.log('✅ 3D waypoint object created successfully');
            
            // Get the 3D object details
            const waypointObject = window.waypointManager.waypointIndicator.getWaypointObject(waypointId);
            if (waypointObject) {
                console.log(`✅ 3D object details:`, {
                    position: waypointObject.position,
                    children: waypointObject.children.length,
                    userData: waypointObject.userData
                });
                
                // Check if it's in the scene
                const inScene = scene.children.includes(waypointObject);
                console.log(`${inScene ? '✅' : '❌'} 3D object ${inScene ? 'is' : 'is NOT'} in scene`);
                
                // Count total scene objects for reference
                console.log(`📊 Total scene objects: ${scene.children.length}`);
                
                return true;
            } else {
                console.error('❌ Could not retrieve 3D waypoint object');
                return false;
            }
        } else {
            console.error('❌ 3D waypoint object was not created');
            return false;
        }
    } else {
        console.error('❌ WaypointIndicator system not initialized');
        return false;
    }
}

// Test function to check waypoint visibility
function testWaypointVisibility() {
    console.log('\n--- Testing Waypoint Visibility ---');
    
    if (!window.waypointManager.waypointIndicator) {
        console.error('❌ WaypointIndicator not available');
        return false;
    }
    
    const allWaypoints = window.waypointManager.waypointIndicator.getAllWaypointObjects();
    console.log(`📊 Total 3D waypoint objects: ${allWaypoints.size}`);
    
    allWaypoints.forEach((mesh, waypointId) => {
        console.log(`🎯 Waypoint ${waypointId}:`, {
            position: mesh.position,
            visible: mesh.visible,
            scale: mesh.scale,
            rotation: mesh.rotation.y
        });
    });
    
    return allWaypoints.size > 0;
}

// Test function to clean up
function cleanupTest() {
    console.log('\n--- Cleaning Up Test ---');
    
    if (window.waypointManager) {
        // Clean up test waypoints
        const cleanedCount = window.waypointManager.cleanupTestMissions();
        console.log(`✅ Cleaned up ${cleanedCount} test missions and waypoints`);
        
        // Verify 3D objects were removed
        if (window.waypointManager.waypointIndicator) {
            const remainingObjects = window.waypointManager.waypointIndicator.getAllWaypointObjects().size;
            console.log(`📊 Remaining 3D waypoint objects: ${remainingObjects}`);
        }
    }
}

// Run the test
async function runTest() {
    try {
        const success = await testWaypoint3DObjects();
        
        if (success) {
            console.log('\n🎉 WAYPOINT 3D OBJECTS TEST PASSED');
            
            // Test visibility
            testWaypointVisibility();
            
            // Wait a bit to observe the waypoint
            console.log('\n⏳ Waiting 5 seconds to observe waypoint...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Clean up
            cleanupTest();
            
        } else {
            console.log('\n❌ WAYPOINT 3D OBJECTS TEST FAILED');
        }
        
    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

// Export functions for manual testing
window.testWaypoint3DObjects = testWaypoint3DObjects;
window.testWaypointVisibility = testWaypointVisibility;
window.cleanupWaypointTest = cleanupTest;

// Run test automatically
runTest();
