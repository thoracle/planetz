/**
 * SOL Discovery Test
 * ==================
 * 
 * This script specifically tests that SOL (the central star) must be
 * discovered by flying within 10km of it, just like any other object.
 * 
 * Usage:
 * 1. Load this script in browser console
 * 2. Run testSOLDiscovery() to check if SOL is discoverable
 * 3. Use flyToSOL() to simulate approaching SOL for discovery
 */

function testSOLDiscovery() {
    console.log('🌟 Testing SOL Discovery...');
    
    // Check if StarChartsManager is available
    const scm = window.navigationSystemManager?.starChartsManager || window.starChartsManager;
    if (!scm) {
        console.log('❌ StarChartsManager not available');
        console.log('💡 Try running: expose_starchartsmanager.js first');
        return;
    }
    
    // Check if SOL is currently discovered
    const solDiscovered = scm.isDiscovered('SOL');
    console.log(`\n📊 SOL Discovery Status:`);
    console.log(`   SOL discovered: ${solDiscovered ? '✅ Yes' : '❌ No'}`);
    console.log(`   Total discovered: ${scm.discoveredObjects.size}`);
    
    if (!solDiscovered) {
        console.log('   ✅ Correct - SOL must be discovered by flying close to it');
    } else {
        console.log('   ⚠️ SOL is already discovered - may need to refresh session');
    }
    
    // Find SOL's position
    const allObjects = scm.getAllObjects();
    const solObject = allObjects.find(obj => obj.id === 'SOL');
    
    if (solObject) {
        console.log(`\n📍 SOL Position: (${solObject.position[0].toFixed(2)}, ${solObject.position[1].toFixed(2)}, ${solObject.position[2].toFixed(2)})`);
        
        // Calculate distance to SOL
        const playerPos = scm.getPlayerPosition();
        if (playerPos) {
            const distance = Math.sqrt(
                Math.pow(solObject.position[0] - playerPos[0], 2) +
                Math.pow(solObject.position[1] - playerPos[1], 2) +
                Math.pow(solObject.position[2] - playerPos[2], 2)
            );
            const distanceKm = distance * 149597870.7;
            
            console.log(`📏 Distance to SOL: ${distanceKm.toFixed(1)}km`);
            
            if (distanceKm <= 10) {
                console.log('   🎯 Within discovery range - SOL should be discoverable!');
            } else {
                console.log('   🔭 Outside discovery range - need to fly closer to SOL');
            }
        }
    } else {
        console.log('❌ SOL object not found in system');
    }
    
    console.log(`\n💡 To discover SOL:`);
    console.log(`   1. Navigate to within 10km of SOL (coordinates shown above)`);
    console.log(`   2. Watch for discovery notification`);
    console.log(`   3. Check star charts to confirm SOL is discovered`);
    console.log(`   4. Use flyToSOL() to simulate close approach`);
}

function flyToSOL() {
    console.log('🚀 Simulating flight to SOL...');
    
    const scm = window.navigationSystemManager?.starChartsManager || window.starChartsManager;
    if (!scm) {
        console.log('❌ StarChartsManager not available');
        console.log('💡 Try running: expose_starchartsmanager.js first');
        return;
    }
    
    // Check if SOL is already discovered
    if (scm.isDiscovered('SOL')) {
        console.log('ℹ️ SOL is already discovered');
        return;
    }
    
    // Force discovery of SOL for testing
    console.log('🎯 Simulating close approach to SOL (within 10km)...');
    scm.addDiscoveredObject('SOL', 'close_approach', 'test_simulation');
    
    console.log('✅ SOL discovery simulated');
    console.log(`📊 Total discovered objects: ${scm.discoveredObjects.size}`);
}

function checkDiscoveryRadius() {
    console.log('🔍 Checking discovery radius settings...');
    
    const scm = window.navigationSystemManager?.starChartsManager || window.starChartsManager;
    if (!scm) {
        console.log('❌ StarChartsManager not available');
        console.log('💡 Try running: expose_starchartsmanager.js first');
        return;
    }
    const radius = scm.getDiscoveryRadius();
    const radiusKm = radius * 149597870.7;
    
    console.log(`📏 Discovery radius: ${radiusKm.toFixed(1)}km (${radius.toExponential(3)} AU)`);
    
    if (Math.abs(radiusKm - 10) < 0.1) {
        console.log('✅ Discovery radius correctly set to 10km');
    } else {
        console.log(`⚠️ Discovery radius is ${radiusKm.toFixed(1)}km, expected 10km`);
    }
}

// Auto-run basic test
console.log('🌟 SOL Discovery Test Script Loaded');
console.log('📋 Available commands:');
console.log('   testSOLDiscovery() - Check SOL discovery status and distance');
console.log('   flyToSOL() - Simulate close approach to SOL');
console.log('   checkDiscoveryRadius() - Verify 10km discovery range');
