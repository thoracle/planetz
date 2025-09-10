/**
 * Test Discovery Radius Behavior
 * 
 * This script tests the discovery system with different radii to verify
 * that Terra Prime discovery works correctly.
 * 
 * Usage: Copy and paste into browser console while in game
 */

console.log('🧪 Testing Discovery Radius Behavior');

if (typeof window.starChartsManager === 'undefined') {
    console.error('❌ StarChartsManager not available');
} else {
    const scm = window.starChartsManager;
    
    // Test data
    const terraPrimePos = [149.6, 0, 0];
    const testPositions = [
        { name: 'Origin', pos: [0, 0, 0], expectedDistance: 149.6 },
        { name: 'Close to Terra', pos: [100, 0, 0], expectedDistance: 49.6 },
        { name: 'Very close to Terra', pos: [140, 0, 0], expectedDistance: 9.6 },
        { name: 'At Terra Prime', pos: [149.6, 0, 0], expectedDistance: 0 }
    ];
    
    console.log('🌍 Terra Prime position:', terraPrimePos);
    console.log('🔍 Current discovery radius:', scm.getEffectiveDiscoveryRadius(), 'km');
    
    // Reset discovery state for clean test
    console.log('\n🧹 Resetting discovery state...');
    scm.resetDiscoveryState();
    
    // Test from different positions
    testPositions.forEach(test => {
        console.log(`\n📍 Testing from ${test.name} [${test.pos.join(', ')}]:`);
        
        // Calculate distance
        const actualDistance = scm.calculateDistance(terraPrimePos, test.pos);
        console.log(`   📏 Distance to Terra Prime: ${actualDistance.toFixed(2)}km (expected: ${test.expectedDistance}km)`);
        
        // Check if within current discovery range
        const currentRadius = scm.getEffectiveDiscoveryRadius();
        const withinRange = actualDistance <= currentRadius;
        console.log(`   🎯 Within ${currentRadius}km range: ${withinRange ? 'YES' : 'NO'}`);
        
        // Simulate discovery check from this position
        const nearbyObjects = scm.getNearbyObjects(test.pos, currentRadius);
        const terraPrimeNearby = nearbyObjects.find(obj => obj.id === 'A0_terra_prime');
        console.log(`   🔍 Terra Prime in nearby objects: ${terraPrimeNearby ? 'YES' : 'NO'}`);
        
        if (terraPrimeNearby && !scm.isDiscovered('A0_terra_prime')) {
            console.log(`   ✅ Would discover Terra Prime from this position!`);
        }
    });
    
    // Test different radii
    console.log('\n🔬 Testing different discovery radii:');
    [50, 100, 150, 200].forEach(radius => {
        const withinRange = 149.6 <= radius;
        console.log(`   ${radius}km radius: Terra Prime ${withinRange ? 'DISCOVERABLE' : 'NOT discoverable'} (distance: 149.6km)`);
    });
    
    // Provide test commands
    console.log('\n🛠️ Test Commands:');
    console.log('   scm.resetDiscoveryState() - Reset discovery state');
    console.log('   scm.setDiscoveryRadius(150) - Set radius to 150km');
    console.log('   scm.getEffectiveDiscoveryRadius() - Check current radius');
    console.log('   scm.isDiscovered("A0_terra_prime") - Check if Terra Prime discovered');
    
    // Summary
    console.log('\n📋 SUMMARY:');
    console.log('   • Terra Prime is at 149.6km from origin');
    console.log('   • With 100km radius: NOT discoverable from origin');
    console.log('   • With 150km+ radius: Discoverable from origin');
    console.log('   • To discover with 100km radius: Fly to within 100km of Terra Prime');
    console.log('   • Once discovered, stays discovered (until browser refresh/reset)');
}
