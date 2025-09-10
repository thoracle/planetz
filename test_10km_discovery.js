/**
 * 10km Discovery Range Test
 * =========================
 * 
 * This script tests the new 10km discovery range to ensure players
 * need to fly close to objects to discover them.
 * 
 * Usage:
 * 1. Load this script in browser console
 * 2. Run test10kmDiscovery() to check discovery mechanics
 * 3. Use simulateCloseApproach(objectId) to test discovery of specific objects
 */

function test10kmDiscovery() {
    console.log('🧪 Testing 10km Discovery Range...');
    
    // Check if StarChartsManager is available
    const scm = window.navigationSystemManager?.starChartsManager || window.starChartsManager;
    if (!scm) {
        console.log('❌ StarChartsManager not available');
        console.log('💡 Try running: expose_starchartsmanager.js first');
        return;
    }
    
    // Test discovery radius
    const discoveryRadius = scm.getDiscoveryRadius();
    const discoveryRangeKm = discoveryRadius * 149597870.7; // Convert AU to km
    
    console.log(`\n🔍 Discovery Settings:`);
    console.log(`   Range: ${discoveryRangeKm.toFixed(1)}km`);
    console.log(`   Range (AU): ${discoveryRadius.toExponential(3)}`);
    
    if (Math.abs(discoveryRangeKm - 10) < 0.1) {
        console.log('   ✅ Discovery range correctly set to ~10km');
    } else {
        console.log(`   ⚠️ Discovery range is ${discoveryRangeKm.toFixed(1)}km, expected 10km`);
    }
    
    // Test current discovery state
    console.log(`\n📊 Current Discovery State:`);
    console.log(`   Discovered objects: ${scm.discoveredObjects.size}`);
    
    if (scm.discoveredObjects.size === 0) {
        console.log('   ✅ Fresh start - no objects discovered (including SOL)');
    } else {
        console.log(`   Objects: ${Array.from(scm.discoveredObjects).join(', ')}`);
    }
    
    // Test player position and nearby objects
    const playerPos = scm.getPlayerPosition();
    if (playerPos) {
        console.log(`\n📍 Player Position: (${playerPos[0].toFixed(2)}, ${playerPos[1].toFixed(2)}, ${playerPos[2].toFixed(2)})`);
        
        // Get nearby objects
        const nearbyObjects = scm.getNearbyObjects(playerPos, discoveryRadius);
        console.log(`\n🔍 Objects within 10km:`);
        
        if (nearbyObjects.length === 0) {
            console.log('   ✅ No objects within 10km (expected - requires close approach)');
        } else {
            nearbyObjects.forEach(obj => {
                const distance = Math.sqrt(
                    Math.pow(obj.position[0] - playerPos[0], 2) +
                    Math.pow(obj.position[1] - playerPos[1], 2) +
                    Math.pow(obj.position[2] - playerPos[2], 2)
                );
                const distanceKm = distance * 149597870.7;
                console.log(`   📦 ${obj.id}: ${distanceKm.toFixed(1)}km away`);
            });
        }
    }
    
    console.log(`\n💡 To test discovery:`);
    console.log(`   1. Fly within 10km of any object (including SOL)`);
    console.log(`   2. Watch for discovery notification`);
    console.log(`   3. Check star charts for newly discovered object`);
    console.log(`   4. Note: SOL must also be discovered by flying close to it`);
}

function simulateCloseApproach(objectId) {
    console.log(`🚀 Simulating close approach to ${objectId}...`);
    
    const scm = window.navigationSystemManager?.starChartsManager || window.starChartsManager;
    if (!scm) {
        console.log('❌ StarChartsManager not available');
        console.log('💡 Try running: expose_starchartsmanager.js first');
        return;
    }
    
    // Force discovery for testing
    if (!scm.isDiscovered(objectId)) {
        scm.addDiscoveredObject(objectId, 'close_approach', 'test_simulation');
        console.log(`✅ Simulated discovery of ${objectId}`);
    } else {
        console.log(`ℹ️ ${objectId} already discovered`);
    }
}

function showNearestObjects() {
    console.log('🔍 Finding nearest objects to player...');
    
    const scm = window.navigationSystemManager?.starChartsManager || window.starChartsManager;
    if (!scm) {
        console.log('❌ StarChartsManager not available');
        console.log('💡 Try running: expose_starchartsmanager.js first');
        return;
    }
    const playerPos = scm.getPlayerPosition();
    
    if (!playerPos) {
        console.log('❌ Player position not available');
        return;
    }
    
    // Get all objects and calculate distances
    const allObjects = scm.getAllObjects();
    const objectDistances = allObjects.map(obj => {
        const distance = Math.sqrt(
            Math.pow(obj.position[0] - playerPos[0], 2) +
            Math.pow(obj.position[1] - playerPos[1], 2) +
            Math.pow(obj.position[2] - playerPos[2], 2)
        );
        const distanceKm = distance * 149597870.7;
        return {
            id: obj.id,
            distance: distance,
            distanceKm: distanceKm,
            discovered: scm.isDiscovered(obj.id)
        };
    }).sort((a, b) => a.distance - b.distance);
    
    console.log(`\n📏 Nearest objects to player:`);
    objectDistances.slice(0, 10).forEach((obj, index) => {
        const status = obj.discovered ? '✅' : '❓';
        const withinRange = obj.distanceKm <= 10 ? '🎯' : '🔭';
        console.log(`   ${index + 1}. ${status} ${withinRange} ${obj.id}: ${obj.distanceKm.toFixed(1)}km`);
    });
    
    const withinRange = objectDistances.filter(obj => obj.distanceKm <= 10);
    console.log(`\n🎯 Objects within 10km: ${withinRange.length}`);
}

// Auto-run basic test
console.log('🔧 10km Discovery Test Script Loaded');
console.log('📋 Available commands:');
console.log('   test10kmDiscovery() - Test discovery range settings');
console.log('   showNearestObjects() - Show nearest objects and distances');
console.log('   simulateCloseApproach(objectId) - Force discover an object for testing');
