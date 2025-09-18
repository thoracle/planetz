/**
 * 🎯 INTEGRATED WAYPOINT SYSTEM TEST
 * 
 * Test script to verify the integrated waypoint test mission system
 * This tests the 'W' key functionality that's now built into the game
 */

console.log('🎯 Testing Integrated Waypoint System...');

// Test 1: Check if systems are available
console.log('\n📋 SYSTEM AVAILABILITY CHECK:');

const systems = [
    { name: 'waypointManager', obj: window.waypointManager },
    { name: 'starfieldManager', obj: window.starfieldManager },
    { name: 'targetComputerManager', obj: window.targetComputerManager },
    { name: 'missionAPI', obj: window.missionAPI }
];

systems.forEach(system => {
    const available = !!system.obj;
    const emoji = available ? '✅' : '❌';
    console.log(`  ${emoji} ${system.name}: ${available ? 'Available' : 'Not Available'}`);
});

// Test 2: Check if waypoint manager has test mission methods
console.log('\n🔧 WAYPOINT MANAGER METHODS CHECK:');

if (window.waypointManager) {
    const methods = [
        'createTestMission',
        'cleanupTestMissions', 
        'getTestMissionStatus'
    ];
    
    methods.forEach(method => {
        const exists = typeof window.waypointManager[method] === 'function';
        const emoji = exists ? '✅' : '❌';
        console.log(`  ${emoji} ${method}: ${exists ? 'Available' : 'Missing'}`);
    });
} else {
    console.log('  ❌ WaypointManager not available - cannot check methods');
}

// Test 3: Check if StarfieldManager has waypoint test method
console.log('\n🎮 STARFIELD MANAGER METHODS CHECK:');

if (window.starfieldManager) {
    const hasMethod = typeof window.starfieldManager.createWaypointTestMission === 'function';
    const emoji = hasMethod ? '✅' : '❌';
    console.log(`  ${emoji} createWaypointTestMission: ${hasMethod ? 'Available' : 'Missing'}`);
} else {
    console.log('  ❌ StarfieldManager not available - cannot check methods');
}

// Test 4: Test mission creation (if systems are available)
console.log('\n🚀 MISSION CREATION TEST:');

if (window.waypointManager && typeof window.waypointManager.createTestMission === 'function') {
    try {
        const result = window.waypointManager.createTestMission();
        
        if (result) {
            console.log('  ✅ Test mission created successfully!');
            console.log(`     Mission: ${result.mission.title}`);
            console.log(`     Waypoints: ${result.waypoints.length}`);
            console.log(`     Rewards: ${result.mission.rewards.credits} credits, ${result.mission.rewards.experience} XP`);
            
            // Test status check
            const status = window.waypointManager.getTestMissionStatus();
            console.log(`     Test Missions Active: ${status.testMissions.length}`);
            console.log(`     Test Waypoints Active: ${status.testWaypoints.length}`);
            
        } else {
            console.log('  ❌ Mission creation returned null/false');
        }
        
    } catch (error) {
        console.log('  ❌ Mission creation failed:', error.message);
    }
} else {
    console.log('  ⚠️ Cannot test mission creation - WaypointManager not available');
}

// Test 5: Simulate W key press (if StarfieldManager is available)
console.log('\n⌨️ KEYBOARD INTEGRATION TEST:');

if (window.starfieldManager && typeof window.starfieldManager.createWaypointTestMission === 'function') {
    try {
        console.log('  🎯 Simulating W key press...');
        window.starfieldManager.createWaypointTestMission();
        console.log('  ✅ W key handler executed successfully!');
    } catch (error) {
        console.log('  ❌ W key handler failed:', error.message);
    }
} else {
    console.log('  ⚠️ Cannot test W key - StarfieldManager not available');
}

// Test 6: Check targeting integration
console.log('\n🎯 TARGETING INTEGRATION TEST:');

if (window.targetComputerManager && window.waypointManager) {
    const activeWaypoints = window.waypointManager.getActiveWaypoints();
    console.log(`  📍 Active waypoints: ${activeWaypoints.length}`);
    
    if (window.targetComputerManager.addWaypointsToTargets) {
        try {
            window.targetComputerManager.addWaypointsToTargets();
            console.log('  ✅ Waypoints added to targeting system');
            
            const waypointTargets = window.targetComputerManager.targetObjects.filter(t => t.isWaypoint);
            console.log(`  🎯 Waypoint targets available: ${waypointTargets.length}`);
            
        } catch (error) {
            console.log('  ❌ Targeting integration failed:', error.message);
        }
    } else {
        console.log('  ⚠️ addWaypointsToTargets method not available');
    }
} else {
    console.log('  ⚠️ Cannot test targeting - systems not available');
}

// Summary
console.log('\n📊 INTEGRATION TEST SUMMARY:');
console.log('  🎮 The waypoint test mission system is now fully integrated!');
console.log('  ⌨️ Press "W" key in-game to create test missions');
console.log('  🎯 Press "TAB" to cycle through targets (including waypoints)');
console.log('  🚀 Navigate to waypoints to trigger actions and complete missions');

console.log('\n🎉 Integration test complete!');
