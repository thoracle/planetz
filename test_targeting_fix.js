/**
 * Test and fix targeting system
 */

console.log('🔧 Testing Targeting Fix...\n');

// Create a test waypoint
const testWaypoint = {
    id: 'targeting_fix_waypoint',
    name: 'Targeting Fix Waypoint',
    type: 'NAVIGATION',
    position: [100, 0, 100]
};

window.waypointManager.createWaypoint(testWaypoint);

// Get the waypoint data
const waypointData = window.waypointManager.getWaypoint('targeting_fix_waypoint');
console.log('Waypoint data:', waypointData);

// Test method 1: setVirtualTarget with string ID
console.log('\n1. Testing setVirtualTarget(waypointId):');
try {
    const success1 = window.targetComputerManager.setVirtualTarget('targeting_fix_waypoint');
    console.log('   Success:', success1);
    console.log('   currentTarget after:', window.targetComputerManager.currentTarget);
    console.log('   currentTarget is null:', window.targetComputerManager.currentTarget === null);
} catch (error) {
    console.log('   Error:', error.message);
}

// Clear current target
window.targetComputerManager.currentTarget = null;

// Test method 2: setVirtualTarget with waypoint object
console.log('\n2. Testing setVirtualTarget(waypointData):');
try {
    const success2 = window.targetComputerManager.setVirtualTarget(waypointData);
    console.log('   Success:', success2);
    console.log('   currentTarget after:', window.targetComputerManager.currentTarget);
    console.log('   currentTarget is null:', window.targetComputerManager.currentTarget === null);
} catch (error) {
    console.log('   Error:', error.message);
}

// Manual fix: Set currentTarget directly
console.log('\n3. Manual fix - setting currentTarget directly:');
const virtualTarget = {
    id: 'targeting_fix_waypoint',
    name: waypointData.name,
    type: 'waypoint',
    position: waypointData.position,
    isVirtual: true,
    userData: {
        waypointType: waypointData.type,
        triggerRadius: waypointData.triggerRadius
    }
};

window.targetComputerManager.currentTarget = virtualTarget;
console.log('   currentTarget set manually:', window.targetComputerManager.currentTarget);
console.log('   isCurrentTargetWaypoint:', window.targetComputerManager.isCurrentTargetWaypoint());

// Test interruption and resumption
console.log('\n4. Testing interruption/resumption:');
window.targetComputerManager.setTarget({ id: 'test_enemy', type: 'ship' });
console.log('   Interruption detected:', window.targetComputerManager.hasInterruptedWaypoint());

const resumed = window.targetComputerManager.resumeInterruptedWaypoint();
console.log('   Resumption works:', resumed);
console.log('   currentTarget after resumption:', window.targetComputerManager.currentTarget);
