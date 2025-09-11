// Debug Actual Game State
// Run this in the browser console to check the real game state

function debugActualGameState() {
    console.log('🔍 === ACTUAL GAME STATE DEBUG ===');
    
    const starChartsManager = window.starChartsManager || 
                             window.viewManager?.starChartsManager ||
                             window.app?.starChartsManager;
    
    if (!starChartsManager) {
        console.error('❌ StarChartsManager not found');
        return;
    }
    
    console.log('✅ StarChartsManager found');
    
    // Check if all 15 stations are in the spatial grid
    console.log('\n📊 SPATIAL GRID ANALYSIS:');
    console.log(`Grid size: ${starChartsManager.gridSize}km per cell`);
    console.log(`Total grid cells: ${starChartsManager.spatialGrid?.size || 0}`);
    
    if (starChartsManager.spatialGrid) {
        let totalObjects = 0;
        let stationCount = 0;
        
        for (const [gridKey, objects] of starChartsManager.spatialGrid.entries()) {
            totalObjects += objects.length;
            const stations = objects.filter(obj => obj.type === 'station');
            stationCount += stations.length;
            
            if (objects.length > 0) {
                console.log(`Grid cell ${gridKey}: ${objects.length} objects (${stations.length} stations)`);
                objects.forEach(obj => {
                    const pos = obj.cartesianPosition || obj.position || [0,0,0];
                    console.log(`  - ${obj.id || obj.name} (${obj.type}): [${pos.map(p => p.toFixed(1)).join(', ')}]`);
                });
            }
        }
        
        console.log(`\n📊 SUMMARY:`);
        console.log(`Total objects in spatial grid: ${totalObjects}`);
        console.log(`Total stations in spatial grid: ${stationCount}`);
        console.log(`Expected stations: 15`);
        
        if (stationCount < 15) {
            console.log(`❌ MISSING STATIONS: ${15 - stationCount} stations not in spatial grid!`);
        }
    }
    
    // Check the universe data
    console.log('\n📊 UNIVERSE DATA ANALYSIS:');
    if (starChartsManager.universeData && starChartsManager.universeData.sectors) {
        const sectorA0 = starChartsManager.universeData.sectors.A0;
        if (sectorA0 && sectorA0.infrastructure) {
            console.log(`Universe data has ${sectorA0.infrastructure.length} infrastructure objects`);
            
            sectorA0.infrastructure.forEach((obj, index) => {
                const pos = obj.cartesianPosition || obj.position || [0,0,0];
                const gridKey = starChartsManager.getGridKey ? starChartsManager.getGridKey(pos) : 'unknown';
                console.log(`  ${index}: ${obj.id} (${obj.type}) at [${pos.map(p => p.toFixed(1)).join(', ')}] -> grid ${gridKey}`);
            });
        }
    }
    
    // Test current player position
    console.log('\n📍 CURRENT PLAYER POSITION TEST:');
    const playerPos = starChartsManager.getPlayerPosition();
    if (playerPos) {
        console.log(`Player at: [${playerPos.map(p => p.toFixed(2)).join(', ')}]`);
        console.log(`Player grid key: ${starChartsManager.getGridKey ? starChartsManager.getGridKey(playerPos) : 'unknown'}`);
        
        // Test discovery at current position
        const nearby = starChartsManager.getNearbyObjects(playerPos, 10);
        console.log(`Objects within 10km: ${nearby.length}`);
        
        nearby.forEach(obj => {
            const objPos = obj.cartesianPosition || obj.position || [0,0,0];
            const distance = starChartsManager.calculateDistance(objPos, playerPos);
            const discovered = starChartsManager.isDiscovered(obj.id) ? 'DISCOVERED' : 'undiscovered';
            console.log(`  - ${obj.id || obj.name}: ${distance.toFixed(2)}km (${discovered})`);
        });
        
        // Check for stations that should be nearby but aren't found
        if (starChartsManager.universeData?.sectors?.A0?.infrastructure) {
            const shouldBeNearby = starChartsManager.universeData.sectors.A0.infrastructure.filter(obj => {
                const objPos = obj.cartesianPosition || obj.position || [0,0,0];
                const distance = starChartsManager.calculateDistance(objPos, playerPos);
                return distance <= 10 && obj.type === 'station';
            });
            
            console.log(`\nStations that SHOULD be discoverable (within 10km): ${shouldBeNearby.length}`);
            shouldBeNearby.forEach(obj => {
                const objPos = obj.cartesianPosition || obj.position || [0,0,0];
                const distance = starChartsManager.calculateDistance(objPos, playerPos);
                const found = nearby.some(n => n.id === obj.id);
                console.log(`  ${obj.id}: ${distance.toFixed(2)}km - ${found ? 'FOUND' : 'MISSING FROM SPATIAL GRID'}`);
            });
        }
    }
    
    console.log('\n✅ Debug complete!');
}

// Auto-run if in browser
if (typeof window !== 'undefined') {
    debugActualGameState();
} else {
    console.log('Run this script in the browser console while the game is loaded.');
}
