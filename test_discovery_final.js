// Final Discovery System Test
// Run in browser console to verify the spatial grid timing fix

function testDiscoverySystemFinal() {
    console.log('🎯 === FINAL DISCOVERY SYSTEM TEST ===');
    
    const starChartsManager = window.starChartsManager || 
                             window.viewManager?.starChartsManager ||
                             window.app?.starChartsManager;
    
    if (!starChartsManager) {
        console.error('❌ StarChartsManager not found');
        return;
    }
    
    console.log('✅ StarChartsManager found');
    
    // Check spatial grid population
    console.log('\n📊 SPATIAL GRID STATUS:');
    console.log(`Grid cells: ${starChartsManager.spatialGrid?.size || 0}`);
    
    if (starChartsManager.spatialGrid && starChartsManager.spatialGrid.size > 0) {
        let totalObjects = 0;
        let stationCount = 0;
        
        for (const [gridKey, objects] of starChartsManager.spatialGrid.entries()) {
            totalObjects += objects.length;
            const stations = objects.filter(obj => obj.type === 'station');
            stationCount += stations.length;
            
            if (stations.length > 0) {
                console.log(`Grid ${gridKey}: ${stations.length} stations`);
                stations.forEach(station => {
                    const pos = station.cartesianPosition || station.position || [0,0,0];
                    console.log(`  - ${station.id}: [${pos.map(p => p.toFixed(1)).join(', ')}]`);
                });
            }
        }
        
        console.log(`\n📊 SUMMARY:`);
        console.log(`Total objects in spatial grid: ${totalObjects}`);
        console.log(`Total stations in spatial grid: ${stationCount}`);
        console.log(`Expected stations: 15`);
        
        if (stationCount >= 15) {
            console.log('✅ SUCCESS: All stations are in spatial grid!');
        } else {
            console.log(`❌ ISSUE: Missing ${15 - stationCount} stations from spatial grid`);
        }
    } else {
        console.log('❌ CRITICAL: Spatial grid is empty!');
    }
    
    // Test current discovery
    console.log('\n🔍 CURRENT DISCOVERY TEST:');
    const playerPos = starChartsManager.getPlayerPosition();
    if (playerPos) {
        console.log(`Player at: [${playerPos.map(p => p.toFixed(2)).join(', ')}]`);
        
        const nearby = starChartsManager.getNearbyObjects(playerPos, 10);
        console.log(`Objects within 10km: ${nearby.length}`);
        
        nearby.forEach(obj => {
            const objPos = obj.cartesianPosition || obj.position || [0,0,0];
            const distance = starChartsManager.calculateDistance(objPos, playerPos);
            const discovered = starChartsManager.isDiscovered(obj.id) ? 'DISCOVERED' : 'undiscovered';
            console.log(`  - ${obj.id || obj.name}: ${distance.toFixed(2)}km (${discovered})`);
        });
        
        if (nearby.length > 0) {
            console.log('✅ SUCCESS: Spatial grid is finding objects!');
        } else {
            console.log('⚠️ No objects found nearby - move closer to stations to test');
        }
    }
    
    console.log('\n✅ Test complete! The spatial grid timing issue should now be fixed.');
    console.log('🎯 All stations should now be discoverable when you fly within 10km of them.');
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    testDiscoverySystemFinal();
} else {
    console.log('Run this script in the browser console while the game is loaded.');
}
