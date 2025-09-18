/**
 * Debug the targeting system issue
 */

console.log('🔍 Debugging Targeting System...\n');

// Create a test waypoint
const testWaypoint = {
    id: 'debug_waypoint',
    name: 'Debug Waypoint',
    type: 'NAVIGATION',
    position: [100, 0, 100]
};

window.waypointManager.createWaypoint(testWaypoint);

// Test targeting and inspect the result
console.log('Setting virtual target...');
const success = window.targetComputerManager.setVirtualTarget('debug_waypoint');
console.log('setVirtualTarget success:', success);

// Deep inspection of currentTarget
console.log('\nDeep currentTarget inspection:');
console.log('currentTarget:', window.targetComputerManager.currentTarget);
console.log('currentTarget type:', typeof window.targetComputerManager.currentTarget);
console.log('currentTarget === null:', window.targetComputerManager.currentTarget === null);
console.log('currentTarget === undefined:', window.targetComputerManager.currentTarget === undefined);

if (window.targetComputerManager.currentTarget) {
    console.log('currentTarget properties:');
    Object.keys(window.targetComputerManager.currentTarget).forEach(key => {
        console.log(`  ${key}:`, window.targetComputerManager.currentTarget[key]);
    });
}

// Test the condition that's failing
const currentTarget = window.targetComputerManager.currentTarget;
console.log('\nCondition tests:');
console.log('currentTarget exists:', !!currentTarget);
console.log('typeof currentTarget === "object":', typeof currentTarget === 'object');
console.log('currentTarget && typeof === "object":', currentTarget && typeof currentTarget === 'object');

// Test isCurrentTargetWaypoint conditions
console.log('\nisCurrentTargetWaypoint conditions:');
console.log('currentTarget exists:', !!currentTarget);
console.log('currentTarget.type:', currentTarget?.type);
console.log('currentTarget.type === "waypoint":', currentTarget?.type === 'waypoint');
console.log('currentTarget.isVirtual:', currentTarget?.isVirtual);
console.log('All conditions:', !!currentTarget && currentTarget.type === 'waypoint' && currentTarget.isVirtual);
