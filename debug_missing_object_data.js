// Debug script to identify which objects are missing data
// Run this in browser console when Star Charts is open

console.log('🔧 Starting MISSING OBJECT DATA debug...');

if (window.navigationSystemManager && window.navigationSystemManager.starChartsUI) {
    const starChartsUI = window.navigationSystemManager.starChartsUI;
    const starChartsManager = window.navigationSystemManager.starChartsManager;
    
    console.log('✅ Star Charts components found');
    
    // Test 1: Check all objects from getDiscoveredObjectsForRender
    console.log('\n📊 TESTING getDiscoveredObjectsForRender:');
    const allObjects = starChartsUI.getDiscoveredObjectsForRender();
    console.log(`Found ${allObjects.length} objects total`);
    
    const objectAnalysis = allObjects.map((obj, index) => {
        const hasId = !!obj.id;
        const hasName = !!obj.name;
        const hasType = !!obj.type;
        const isComplete = hasId && hasName && hasType;
        
        // Test database lookup
        let dbLookup = null;
        if (obj.id) {
            dbLookup = starChartsManager.getObjectData(obj.id);
        }
        
        return {
            index: index,
            id: obj.id || 'NO_ID',
            name: obj.name || 'NO_NAME',
            type: obj.type || 'NO_TYPE',
            hasId: hasId,
            hasName: hasName,
            hasType: hasType,
            isComplete: isComplete,
            dbLookupSuccess: !!dbLookup,
            dbLookupName: dbLookup?.name || 'NO_DB_NAME',
            _isUndiscovered: !!obj._isUndiscovered,
            _isShip: !!obj._isShip
        };
    });
    
    console.log('\n📋 OBJECT ANALYSIS:');
    objectAnalysis.forEach(analysis => {
        const status = analysis.isComplete ? '✅' : '❌';
        const dbStatus = analysis.dbLookupSuccess ? '✅' : '❌';
        console.log(`${status} ${analysis.index}: ${analysis.id} | Name: "${analysis.name}" | Type: ${analysis.type} | DB: ${dbStatus}`);
        
        if (!analysis.isComplete) {
            console.log(`    Missing: ${!analysis.hasId ? 'ID ' : ''}${!analysis.hasName ? 'NAME ' : ''}${!analysis.hasType ? 'TYPE ' : ''}`);
        }
        
        if (!analysis.dbLookupSuccess && analysis.hasId) {
            console.log(`    ⚠️ Database lookup failed for ID: ${analysis.id}`);
        }
    });
    
    // Test 2: Check database contents directly
    console.log('\n🗄️ TESTING DATABASE CONTENTS:');
    const currentSector = starChartsManager.getCurrentSector();
    const sectorData = starChartsManager.objectDatabase?.sectors?.[currentSector];
    
    if (sectorData) {
        console.log(`Current sector: ${currentSector}`);
        console.log('Sector data structure:', {
            hasStar: !!sectorData.star,
            starName: sectorData.star?.name,
            objectCount: sectorData.objects?.length || 0,
            hasInfrastructure: !!sectorData.infrastructure,
            stationCount: sectorData.infrastructure?.stations?.length || 0,
            beaconCount: sectorData.infrastructure?.beacons?.length || 0
        });
        
        // Check each category
        if (sectorData.star) {
            console.log('⭐ Star:', {
                id: sectorData.star.id,
                name: sectorData.star.name,
                type: sectorData.star.type
            });
        }
        
        if (sectorData.objects) {
            console.log('🪐 Celestial Objects:');
            sectorData.objects.forEach((obj, i) => {
                console.log(`  ${i + 1}. ${obj.id} - "${obj.name}" (${obj.type})`);
            });
        }
        
        if (sectorData.infrastructure?.stations) {
            console.log('🏭 Stations:');
            sectorData.infrastructure.stations.forEach((station, i) => {
                console.log(`  ${i + 1}. ${station.id} - "${station.name}" (${station.type})`);
            });
        }
        
        if (sectorData.infrastructure?.beacons) {
            console.log('📡 Beacons:');
            sectorData.infrastructure.beacons.forEach((beacon, i) => {
                console.log(`  ${i + 1}. ${beacon.id} - "${beacon.name}" (${beacon.type})`);
            });
        }
    } else {
        console.log('❌ No sector data found for:', currentSector);
    }
    
    // Test 3: Test getObjectData for specific IDs
    console.log('\n🧪 TESTING getObjectData METHOD:');
    const testIds = [
        'A0_star', 'A0_earth', 'A0_mars', 'A0_jupiter', 'A0_saturn',
        'A0_hermes_refinery', 'A0_callisto_defense_platform'
    ];
    
    testIds.forEach(id => {
        const data = starChartsManager.getObjectData(id);
        const status = data ? '✅' : '❌';
        console.log(`${status} getObjectData('${id}'):`, data ? {
            name: data.name,
            type: data.type,
            hasPosition: !!(data.x !== undefined || data.position)
        } : 'NOT_FOUND');
    });
    
    // Test 4: Check ensureObjectHasName on problematic objects
    console.log('\n🔧 TESTING ensureObjectHasName:');
    const incompleteObjects = objectAnalysis.filter(a => !a.isComplete);
    
    if (incompleteObjects.length > 0) {
        console.log(`Found ${incompleteObjects.length} incomplete objects. Testing ensureObjectHasName...`);
        
        incompleteObjects.slice(0, 5).forEach(analysis => {
            const originalObj = allObjects[analysis.index];
            console.log(`\nTesting object ${analysis.index} (${analysis.id}):`);
            console.log('  Original object:', originalObj);
            
            try {
                const enhanced = starChartsUI.ensureObjectHasName(originalObj);
                console.log('  Enhanced result:', enhanced);
                console.log('  Enhancement success:', !!enhanced?.name);
            } catch (e) {
                console.log('  Enhancement error:', e.message);
            }
        });
    } else {
        console.log('✅ All objects are complete!');
    }
    
    // Summary
    const completeCount = objectAnalysis.filter(a => a.isComplete).length;
    const incompleteCount = objectAnalysis.filter(a => !a.isComplete).length;
    const dbSuccessCount = objectAnalysis.filter(a => a.dbLookupSuccess).length;
    
    console.log('\n📊 SUMMARY:');
    console.log(`Total objects: ${allObjects.length}`);
    console.log(`Complete objects: ${completeCount} (${Math.round(completeCount/allObjects.length*100)}%)`);
    console.log(`Incomplete objects: ${incompleteCount} (${Math.round(incompleteCount/allObjects.length*100)}%)`);
    console.log(`Database lookup success: ${dbSuccessCount} (${Math.round(dbSuccessCount/allObjects.length*100)}%)`);
    
    if (incompleteCount > 0) {
        console.log('\n🎯 NEXT STEPS:');
        console.log('1. Check why some objects are missing names in the database');
        console.log('2. Verify that getObjectData is working for all object types');
        console.log('3. Ensure fallback name generation is working in ensureObjectHasName');
    }
    
} else {
    console.log('❌ Star Charts not found. Make sure to:');
    console.log('  1. Open the game');
    console.log('  2. Press "C" to open Star Charts');
    console.log('  3. Wait for initialization');
    console.log('  4. Run this script again');
}

console.log('\n🏁 Missing object data debug complete!');
