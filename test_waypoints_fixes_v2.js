/**
 * Test the specific fixes for waypoints system
 * Run this in browser console after refreshing
 */

console.log('🔧 Testing Waypoints System Fixes v2...\n');

// Test 1: Waypoint creation and retrieval with custom ID
console.log('1. Testing Waypoint Creation with Custom ID:');
try {
    const testWaypoint = {
        id: 'test_custom_id_waypoint',
        name: 'Custom ID Test Waypoint',
        type: 'NAVIGATION',
        position: [100, 0, 100],
        description: 'Testing custom ID preservation'
    };
    
    const result = window.waypointManager.createWaypoint(testWaypoint);
    console.log('   Creation result:', result ? '✅ Success' : '❌ Failed');
    
    const retrieved = window.waypointManager.getWaypoint('test_custom_id_waypoint');
    console.log('   Retrieved waypoint:', retrieved ? '✅ Found' : '❌ Not found');
    console.log('   ID preserved:', retrieved?.id === 'test_custom_id_waypoint' ? '✅' : '❌');
    console.log('   Name correct:', retrieved?.name === testWaypoint.name ? '✅' : '❌');
} catch (error) {
    console.log('   Error:', error.message);
}

// Test 2: WaypointPersistence availability
console.log('\n2. Testing WaypointPersistence:');
console.log('   Persistence available:', window.waypointManager?.persistence ? '✅' : '❌');
console.log('   Save method:', typeof window.waypointManager?.persistence?.saveWaypointState === 'function' ? '✅' : '❌');
console.log('   Load method:', typeof window.waypointManager?.persistence?.loadWaypointState === 'function' ? '✅' : '❌');

// Test 3: Action creation with proper parameters
console.log('\n3. Testing Action Creation with Parameters:');

// Test ShowMessageAction with required parameters
try {
    const messageAction = window.waypointManager.actionRegistry.create('show_message', {
        message: 'Test message with required parameter',
        title: 'Test Title',
        duration: 3000
    });
    console.log('   ShowMessageAction:', messageAction ? '✅ Created' : '❌ Failed');
    console.log('   Execute method:', typeof messageAction?.execute === 'function' ? '✅' : '❌');
} catch (error) {
    console.log('   ShowMessageAction error:', error.message);
}

// Test GiveRewardAction with required parameters
try {
    const rewardAction = window.waypointManager.actionRegistry.create('give_reward', {
        rewardPackageId: 'test_reward_package',
        bonusMultiplier: 1.5,
        message: 'Test reward message'
    });
    console.log('   GiveRewardAction:', rewardAction ? '✅ Created' : '❌ Failed');
} catch (error) {
    console.log('   GiveRewardAction error:', error.message);
}

// Test GiveItemAction with required parameters
try {
    const itemAction = window.waypointManager.actionRegistry.create('give_item', {
        itemId: 'test_item_id',
        quantity: 5,
        quality: 'rare'
    });
    console.log('   GiveItemAction:', itemAction ? '✅ Created' : '❌ Failed');
} catch (error) {
    console.log('   GiveItemAction error:', error.message);
}

// Test 4: Targeting system with proper waypoint
console.log('\n4. Testing Targeting System:');
if (window.targetComputerManager && window.waypointManager.getWaypoint('test_custom_id_waypoint')) {
    try {
        window.targetComputerManager.setVirtualTarget('test_custom_id_waypoint');
        console.log('   Waypoint targeted:', window.targetComputerManager.currentTarget === 'test_custom_id_waypoint' ? '✅' : '❌');
        console.log('   Recognized as waypoint:', window.targetComputerManager.isCurrentTargetWaypoint() ? '✅' : '❌');
        
        // Test interruption
        window.targetComputerManager.setTarget('test_enemy');
        console.log('   Interruption detected:', window.targetComputerManager.hasInterruptedWaypoint() ? '✅' : '❌');
        
        // Test resumption
        const resumed = window.targetComputerManager.resumeInterruptedWaypoint();
        console.log('   Resumption works:', resumed ? '✅' : '❌');
    } catch (error) {
        console.log('   Targeting error:', error.message);
    }
} else {
    console.log('   Skipping targeting test - missing dependencies');
}

console.log('\n🎯 Fix verification complete!');
console.log('If most tests show ✅, run the full test suite again for improved results.');
