// Test script to validate spatial grid discovery fix
// Run this in the browser console after loading the game

console.log('🧪 Testing Spatial Grid Discovery Fix...');

// Wait for the game to load
setTimeout(() => {
    if (!window.navigationSystemManager?.starChartsManager) {
        console.error('❌ Star Charts Manager not found');
        return;
    }

    const manager = window.navigationSystemManager.starChartsManager;

    console.log('✅ Star Charts Manager found');
    console.log('📊 Testing spatial grid state...');

    // Test 1: Check if spatial grid has objects
    if (typeof window.debugSpatialGrid === 'function') {
        console.log('🗺️ Spatial Grid Contents:');
        window.debugSpatialGrid();
    } else {
        console.log('❌ debugSpatialGrid function not available');
    }

    // Test 2: Check total discovered objects
    console.log(`📈 Current discovered objects: ${manager.discoveredObjects.size}`);

    // Test 3: Force a discovery check at the origin (where Sol is)
    console.log('🔍 Testing discovery check at origin (0,0,0)...');
    const testPosition = [0, 0, 0];
    const nearbyObjects = manager.getNearbyObjects(testPosition, 100); // 100km radius
    console.log(`📍 Found ${nearbyObjects.length} objects near origin`);

    // Test 4: Check discovery processing
    if (nearbyObjects.length > 0) {
        console.log('🎯 Processing discoveries...');
        manager.batchProcessDiscoveries(nearbyObjects, testPosition, 100);
        console.log(`✅ After discovery: ${manager.discoveredObjects.size} discovered objects`);
    }

    // Test 5: Test with player's actual position
    const playerPos = manager.getPlayerPosition();
    if (playerPos) {
        console.log(`🎮 Player position: [${playerPos.join(', ')}]`);
        const playerNearby = manager.getNearbyObjects(playerPos, 50); // 50km radius
        console.log(`📍 Found ${playerNearby.length} objects near player`);
    }

    console.log('🧪 Spatial grid test complete!');

}, 3000);
