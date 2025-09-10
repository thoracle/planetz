/**
 * Debug script to diagnose Terra Prime discovery issue
 * 
 * Usage: Copy and paste this into browser console while in game
 */

console.log('🔧 Discovery Debug Script - Terra Prime Issue');

// Check if StarChartsManager is available
if (typeof window.starChartsManager === 'undefined') {
    console.error('❌ StarChartsManager not available. Make sure you\'re in the game and it\'s loaded.');
} else {
    const scm = window.starChartsManager;
    
    console.log('✅ StarChartsManager found');
    
    // 1. Check current discovery radius
    const currentRadius = scm.getEffectiveDiscoveryRadius();
    console.log(`🔍 Current discovery radius: ${currentRadius}km`);
    
    // 2. Check player position
    const playerPos = scm.getPlayerPosition();
    console.log(`📍 Player position: [${playerPos?.join(', ') || 'null'}]`);
    
    // 3. Check Terra Prime position and distance
    if (scm.objectDatabase?.sectors?.A0?.objects) {
        const terraPrime = scm.objectDatabase.sectors.A0.objects.find(obj => obj.id === 'A0_terra_prime');
        if (terraPrime) {
            console.log(`🌍 Terra Prime position: [${terraPrime.position.join(', ')}]`);
            
            if (playerPos) {
                const distance = scm.calculateDistance(terraPrime.position, playerPos);
                console.log(`📏 Distance to Terra Prime: ${distance.toFixed(2)}km`);
                console.log(`🎯 Within discovery range: ${distance <= currentRadius ? 'YES' : 'NO'}`);
            }
        } else {
            console.error('❌ Terra Prime not found in object database');
        }
    }
    
    // 4. Check if Terra Prime is discovered
    const isDiscovered = scm.isDiscovered('A0_terra_prime');
    console.log(`🔍 Terra Prime discovered: ${isDiscovered}`);
    
    // 5. Check spatial grid for Terra Prime's cell
    if (playerPos) {
        const terraPrimePos = [149.6, 0, 0];
        const gridKey = scm.getGridKey(terraPrimePos);
        const cellObjects = scm.spatialGrid.get(gridKey);
        console.log(`📦 Terra Prime grid cell (${gridKey}): ${cellObjects ? cellObjects.length : 0} objects`);
        
        if (cellObjects) {
            const terraPrimeInCell = cellObjects.find(obj => obj.id === 'A0_terra_prime');
            console.log(`🌍 Terra Prime in spatial grid: ${terraPrimeInCell ? 'YES' : 'NO'}`);
        }
    }
    
    // 6. Force a discovery check
    console.log('🔄 Forcing discovery check...');
    scm.checkDiscoveryRadius();
    
    // 7. Utility functions for testing
    window.debugDiscovery = {
        // Clear discovered objects to reset discovery state
        clearDiscovered: () => {
            scm.discoveredObjects.clear();
            scm.discoveryMetadata.clear();
            console.log('🧹 Cleared all discovered objects');
        },
        
        // Force discover Terra Prime
        forceDiscoverTerra: () => {
            scm.addDiscoveredObject('A0_terra_prime');
            console.log('✅ Force discovered Terra Prime');
        },
        
        // Get nearby objects at current position
        getNearby: (radius = currentRadius) => {
            const playerPos = scm.getPlayerPosition();
            if (playerPos) {
                const nearby = scm.getNearbyObjects(playerPos, radius);
                console.log(`🔍 Found ${nearby.length} objects within ${radius}km:`);
                nearby.forEach(obj => {
                    const dist = scm.calculateDistance(obj.position || obj.cartesianPosition, playerPos);
                    console.log(`  - ${obj.id}: ${dist.toFixed(2)}km`);
                });
                return nearby;
            }
        },
        
        // Test different radii
        testRadii: () => {
            const playerPos = scm.getPlayerPosition();
            if (playerPos) {
                [50, 100, 150, 200].forEach(radius => {
                    const nearby = scm.getNearbyObjects(playerPos, radius);
                    console.log(`📊 ${radius}km radius: ${nearby.length} objects`);
                });
            }
        }
    };
    
    console.log('🛠️ Debug utilities added to window.debugDiscovery');
    console.log('   - debugDiscovery.clearDiscovered() - Reset discovery state');
    console.log('   - debugDiscovery.forceDiscoverTerra() - Force discover Terra Prime');
    console.log('   - debugDiscovery.getNearby(radius) - Get nearby objects');
    console.log('   - debugDiscovery.testRadii() - Test different discovery radii');
}
