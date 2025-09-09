// Test script to debug discovery radius issues
// Run this in the browser console after the game loads

console.log('=== DISCOVERY RADIUS DEBUG TEST ===');

// Check if StarChartsManager is available
if (typeof window.starChartsManager !== 'undefined') {
    const scm = window.starChartsManager;
    
    console.log('✅ StarChartsManager found');
    console.log('🔍 getDiscoveryRadius():', scm.getDiscoveryRadius());
    console.log('🔍 getEffectiveDiscoveryRadius():', scm.getEffectiveDiscoveryRadius());
    console.log('🔍 debugDiscoveryRadius:', scm.debugDiscoveryRadius);
    
    // Test discovery with different radii
    console.log('\n=== TESTING DIFFERENT RADII ===');
    
    // Get player position
    const playerPos = scm.getPlayerPosition();
    console.log('📍 Player position:', playerPos);
    
    if (playerPos) {
        // Test with 25km
        const nearby25 = scm.getNearbyObjects(playerPos, 25);
        console.log('🔍 Objects within 25km:', nearby25.length);
        nearby25.forEach(obj => {
            const objPos = obj.cartesianPosition || obj.position || [0, 0, 0];
            const distance = scm.calculateDistance(objPos, playerPos);
            console.log(`  - ${obj.id}: ${distance.toFixed(1)}km`);
        });
        
        // Test with 100km
        const nearby100 = scm.getNearbyObjects(playerPos, 100);
        console.log('🔍 Objects within 100km:', nearby100.length);
        nearby100.forEach(obj => {
            const objPos = obj.cartesianPosition || obj.position || [0, 0, 0];
            const distance = scm.calculateDistance(objPos, playerPos);
            console.log(`  - ${obj.id}: ${distance.toFixed(1)}km`);
        });
        
        // Check what's discovered
        console.log('\n=== CURRENT DISCOVERY STATE ===');
        console.log('📊 Total discovered objects:', scm.discoveredObjects.size);
        for (const objId of scm.discoveredObjects) {
            console.log(`  ✅ ${objId}`);
        }
    }
    
} else {
    console.log('❌ StarChartsManager not found. Make sure the game is loaded.');
    console.log('💡 Try: window.starChartsManager or window.navigationSystemManager?.starChartsManager');
}
