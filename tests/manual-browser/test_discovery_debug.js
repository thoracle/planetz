// Discovery System Debug Helper
// Run in browser console to diagnose discovery issues

function testDiscoverySystem() {
    console.log('🔍 === DISCOVERY SYSTEM DEBUG TEST ===');
    
    // Get StarChartsManager instance
    const starChartsManager = window.starChartsManager || 
                             window.viewManager?.starChartsManager ||
                             window.app?.starChartsManager;
    
    if (!starChartsManager) {
        console.error('❌ StarChartsManager not found');
        return;
    }
    
    console.log('✅ StarChartsManager found');
    
    // Enable STAR_CHARTS debug channel
    if (window.debugEnable) {
        window.debugEnable('STAR_CHARTS');
        console.log('✅ STAR_CHARTS debug channel enabled');
    }
    
    // Get current state
    const radius = starChartsManager.getDiscoveryRadius();
    const playerPos = starChartsManager.getPlayerPosition();
    
    console.log(`🔍 Discovery radius: ${radius}km`);
    console.log(`📍 Player position: [${playerPos?.join(', ') || 'null'}]`);
    
    if (!playerPos) {
        console.error('❌ No player position available');
        return;
    }
    
    // Test nearby objects at current radius
    const nearby = starChartsManager.getNearbyObjects(playerPos, radius);
    console.log(`🔍 Objects within ${radius}km: ${nearby.length}`);
    
    if (nearby.length === 0) {
        console.log('ℹ️ No objects found within range. Try moving closer to a station.');
        
        // Show distances to all objects for reference
        console.log('📊 Distances to all objects:');
        if (starChartsManager.objectDatabase && starChartsManager.objectDatabase.sectors) {
            const sector = starChartsManager.objectDatabase.sectors[starChartsManager.currentSector];
            if (sector && sector.objects) {
                sector.objects.forEach(obj => {
                    const objPos = obj.cartesianPosition || obj.position || [0, 0, 0];
                    const distance = starChartsManager.calculateDistance(objPos, playerPos);
                    const discovered = starChartsManager.isDiscovered(obj.id) ? 'DISCOVERED' : 'undiscovered';
                    console.log(`  - ${obj.id}: ${distance.toFixed(1)}km (${discovered})`);
                });
            }
        }
    } else {
        // Analyze each nearby object
        nearby.forEach(obj => {
            const objPos = obj.cartesianPosition || obj.position || [0, 0, 0];
            const distance = starChartsManager.calculateDistance(objPos, playerPos);
            const discovered = starChartsManager.isDiscovered(obj.id);
            const withinRange = starChartsManager.isWithinRange(obj, playerPos, radius);
            
            console.log(`📋 ${obj.id || obj.name}:`);
            console.log(`   📍 Position: [${objPos.join(', ')}]`);
            console.log(`   📏 Distance: ${distance.toFixed(1)}km`);
            console.log(`   🎯 Within range: ${withinRange}`);
            console.log(`   ✅ Discovered: ${discovered}`);
            console.log(`   📝 Type: ${obj.type || 'unknown'}`);
            
            if (!discovered && withinRange) {
                console.log(`🚨 ISSUE: Object is within range but not discovered!`);
            }
        });
        
        // Force a discovery check
        console.log('🔄 Forcing discovery check...');
        starChartsManager.checkDiscoveryRadius();
    }
    
    console.log('🔍 === END DEBUG TEST ===');
}

// Auto-run and set up for console use
if (typeof window !== 'undefined') {
    window.testDiscoverySystem = testDiscoverySystem;
    
    // Run immediately if StarChartsManager is available
    setTimeout(() => {
        if (window.starChartsManager || window.viewManager?.starChartsManager) {
            testDiscoverySystem();
        }
    }, 1000);
}

// Export for console use
console.log('🔧 Discovery debug helper loaded. Use testDiscoverySystem() to run diagnostics.');
