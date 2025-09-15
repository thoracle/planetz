// Simple script to identify the click-first bug by comparing working vs broken objects
console.log('🔍 SIMPLE CLICK-FIRST BUG ANALYSIS');

if (window.navigationSystemManager?.starChartsUI && window.navigationSystemManager?.starChartsManager) {
    const starChartsUI = window.navigationSystemManager.starChartsUI;
    const starChartsManager = window.navigationSystemManager.starChartsManager;
    
    console.log('✅ Star Charts components found');
    
    // Get all objects
    const allObjects = starChartsUI.getDiscoveredObjectsForRender();
    console.log(`🔍 Found ${allObjects.length} objects to analyze`);
    
    // From your logs, these are the patterns we observed:
    const workingObjects = [
        'A0_star', 'A0_helios_solar_array', 'A0_terra_prime', 
        'A0_europa', 'A0_hermes_refinery', 'A0_aphrodite_atmospheric_research'
    ];
    
    const brokenObjects = [
        'A0_l4_trading_post', 'A0_callisto_defense_platform', 
        'A0_ceres_outpost', 'A0_vesta_mining_complex'
    ];
    
    console.log('\n🔍 ANALYZING WORKING vs BROKEN OBJECTS:');
    
    // Analyze working objects
    console.log('\n✅ WORKING OBJECTS (tooltips work immediately):');
    workingObjects.forEach(objId => {
        const obj = allObjects.find(o => o.id === objId);
        if (obj) {
            const completeData = starChartsManager.getObjectData(objId);
            console.log(`  ${objId}:`);
            console.log(`    - Object name: "${obj.name}"`);
            console.log(`    - Object type: "${obj.type}"`);
            console.log(`    - _isUndiscovered: ${obj._isUndiscovered}`);
            console.log(`    - Database lookup: ${completeData ? `"${completeData.name}"` : 'null'}`);
            console.log(`    - ensureObjectHasName result: "${starChartsUI.ensureObjectHasName(obj)?.name}"`);
        } else {
            console.log(`  ${objId}: NOT FOUND in current objects`);
        }
    });
    
    // Analyze broken objects
    console.log('\n🐛 BROKEN OBJECTS (need clicking first):');
    brokenObjects.forEach(objId => {
        const obj = allObjects.find(o => o.id === objId);
        if (obj) {
            const completeData = starChartsManager.getObjectData(objId);
            console.log(`  ${objId}:`);
            console.log(`    - Object name: "${obj.name}"`);
            console.log(`    - Object type: "${obj.type}"`);
            console.log(`    - _isUndiscovered: ${obj._isUndiscovered}`);
            console.log(`    - Database lookup: ${completeData ? `"${completeData.name}"` : 'null'}`);
            console.log(`    - ensureObjectHasName result: "${starChartsUI.ensureObjectHasName(obj)?.name}"`);
        } else {
            console.log(`  ${objId}: NOT FOUND in current objects`);
        }
    });
    
    // Look for patterns
    console.log('\n🔍 PATTERN ANALYSIS:');
    
    const workingAnalysis = workingObjects.map(objId => {
        const obj = allObjects.find(o => o.id === objId);
        return obj ? {
            id: objId,
            hasName: !!obj.name,
            isUndiscovered: !!obj._isUndiscovered,
            type: obj.type,
            dbLookupWorks: !!starChartsManager.getObjectData(objId)
        } : null;
    }).filter(Boolean);
    
    const brokenAnalysis = brokenObjects.map(objId => {
        const obj = allObjects.find(o => o.id === objId);
        return obj ? {
            id: objId,
            hasName: !!obj.name,
            isUndiscovered: !!obj._isUndiscovered,
            type: obj.type,
            dbLookupWorks: !!starChartsManager.getObjectData(objId)
        } : null;
    }).filter(Boolean);
    
    console.log('Working objects patterns:');
    console.log('  - Have names:', workingAnalysis.filter(o => o.hasName).length, '/', workingAnalysis.length);
    console.log('  - Are undiscovered:', workingAnalysis.filter(o => o.isUndiscovered).length, '/', workingAnalysis.length);
    console.log('  - DB lookup works:', workingAnalysis.filter(o => o.dbLookupWorks).length, '/', workingAnalysis.length);
    console.log('  - Types:', [...new Set(workingAnalysis.map(o => o.type))]);
    
    console.log('Broken objects patterns:');
    console.log('  - Have names:', brokenAnalysis.filter(o => o.hasName).length, '/', brokenAnalysis.length);
    console.log('  - Are undiscovered:', brokenAnalysis.filter(o => o.isUndiscovered).length, '/', brokenAnalysis.length);
    console.log('  - DB lookup works:', brokenAnalysis.filter(o => o.dbLookupWorks).length, '/', brokenAnalysis.length);
    console.log('  - Types:', [...new Set(brokenAnalysis.map(o => o.type))]);
    
    // Test the actual tooltip generation for a few objects
    console.log('\n🧪 TOOLTIP GENERATION TEST:');
    
    const testObjects = [...workingObjects.slice(0, 2), ...brokenObjects.slice(0, 2)];
    testObjects.forEach(objId => {
        const obj = allObjects.find(o => o.id === objId);
        if (obj) {
            const completeObject = starChartsUI.ensureObjectHasName(obj);
            let tooltipText;
            if (completeObject._isShip) {
                tooltipText = 'You are here';
            } else if (completeObject._isUndiscovered) {
                tooltipText = 'Unknown';
            } else {
                tooltipText = completeObject.name || 'Unknown Object';
            }
            
            const expectedWorking = workingObjects.includes(objId);
            const actuallyWorks = tooltipText !== 'Unknown' || completeObject._isUndiscovered;
            
            console.log(`  ${objId}: Expected ${expectedWorking ? 'WORKING' : 'BROKEN'}, Got "${tooltipText}" (${actuallyWorks ? 'WORKS' : 'BROKEN'})`);
        }
    });
    
    // Store results for manual inspection
    window.clickFirstAnalysis = {
        workingObjects: workingAnalysis,
        brokenObjects: brokenAnalysis,
        allObjects: allObjects
    };
    
    console.log('\n💾 Analysis stored in window.clickFirstAnalysis');
    
} else {
    console.log('❌ Star Charts components not found');
}

console.log('\n🏁 Simple click-first analysis complete!');
