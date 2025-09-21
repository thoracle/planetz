/**
 * Quick test to verify the waypoints system fixes
 * Run this in the browser console after refreshing the page
 */

console.log('🔧 Testing Waypoints System Fixes...\n');

// Test 1: Check if systems are available
console.log('1. System Availability:');
console.log('   WaypointManager:', typeof window.waypointManager !== 'undefined' ? '✅' : '❌');
console.log('   TargetComputerManager:', typeof window.targetComputerManager !== 'undefined' ? '✅' : '❌');
console.log('   ActionRegistry:', window.waypointManager?.actionRegistry ? '✅' : '❌');

// Test 2: Check ActionRegistry actions
if (window.waypointManager?.actionRegistry) {
    const actions = Object.keys(window.waypointManager.actionRegistry.actions);
    console.log('\n2. Registered Actions:');
    console.log('   Count:', actions.length);
    console.log('   Actions:', actions.join(', '));
}

// Test 3: Test waypoint creation with uppercase type (should work now)
console.log('\n3. Testing Waypoint Creation with Uppercase Type:');
try {
    const testWaypoint = {
        id: 'fix_test_waypoint',
        name: 'Fix Test Waypoint',
        type: 'NAVIGATION', // Uppercase - should be normalized to lowercase
        position: [500, 0, 500],
        description: 'Testing the type normalization fix'
    };
    
    const result = window.waypointManager.createWaypoint(testWaypoint);
    console.log('   Creation result:', result ? '✅ Success' : '❌ Failed');
    
    if (result) {
        const retrieved = window.waypointManager.getWaypoint('fix_test_waypoint');
        console.log('   Retrieved type:', retrieved.type, '(should be lowercase)');
        console.log('   Type normalization:', retrieved.type === 'navigation' ? '✅' : '❌');
    }
} catch (error) {
    console.log('   Error:', error.message);
}

// Test 4: Test TargetComputerManager integration
console.log('\n4. Testing TargetComputerManager Integration:');
if (window.targetComputerManager) {
    console.log('   setVirtualTarget method:', typeof window.targetComputerManager.setVirtualTarget === 'function' ? '✅' : '❌');
    console.log('   isCurrentTargetWaypoint method:', typeof window.targetComputerManager.isCurrentTargetWaypoint === 'function' ? '✅' : '❌');
    console.log('   resumeInterruptedWaypoint method:', typeof window.targetComputerManager.resumeInterruptedWaypoint === 'function' ? '✅' : '❌');
} else {
    console.log('   TargetComputerManager not available ❌');
}

// Test 5: Test action creation
console.log('\n5. Testing Action Creation:');
if (window.waypointManager?.actionRegistry) {
    try {
        const testAction = window.waypointManager.actionRegistry.create('show_message', {
            title: 'Test Fix',
            message: 'Testing action creation after fixes',
            duration: 2000
        });
        console.log('   Action creation:', testAction ? '✅ Success' : '❌ Failed');
        console.log('   Action execute method:', typeof testAction?.execute === 'function' ? '✅' : '❌');
    } catch (error) {
        console.log('   Action creation error:', error.message);
    }
} else {
    console.log('   ActionRegistry not available ❌');
}

console.log('\n🎯 Fix verification complete!');
console.log('If all tests show ✅, refresh the browser and run the full test suite again.');
