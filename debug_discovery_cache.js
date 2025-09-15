// Debug script to check discovery status caching issue
// Run this in browser console when Star Charts is open

console.log('🔧 Starting DISCOVERY CACHE debug...');

if (window.navigationSystemManager?.starChartsUI && window.navigationSystemManager?.starChartsManager) {
    const starChartsUI = window.navigationSystemManager.starChartsUI;
    const starChartsManager = window.navigationSystemManager.starChartsManager;
    
    console.log('✅ Star Charts components found');
    
    // Test the problematic objects
    const problematicObjects = [
        'A0_helios_solar_array',
        'A0_vesta_mining_complex', 
        'A0_navigation_beacon_3',
        'A0_navigation_beacon_7',
        'A0_deimos_research_facility'
    ];
    
    const workingObjects = [
        'A0_star',
        'A0_ceres_outpost',
        'A0_europa',
        'A0_terra_prime',
        'A0_hermes_refinery'
    ];
    
    console.log('\n🔍 TESTING DISCOVERY STATUS:');
    
    // Get current discovered objects
    const discoveredIds = starChartsManager.getDiscoveredObjects();
    console.log('Current discovered objects:', discoveredIds);
    
    // Test discovery function from StarChartsUI
    const isTestMode = starChartsUI.isTestModeEnabled();
    const norm = (id) => (typeof id === 'string' ? id.replace(/^a0_/i, 'A0_') : id);
    const isDiscovered = (id) => {
        if (isTestMode) return true;
        if (!Array.isArray(discoveredIds)) return false;
        const nid = norm(id);
        return discoveredIds.some(did => norm(did) === nid);
    };
    
    console.log('\n❌ PROBLEMATIC OBJECTS (showing "Unknown"):');
    problematicObjects.forEach(id => {
        const discovered = isDiscovered(id);
        const objectData = starChartsManager.getObjectData(id);
        console.log(`  ${id}:`);
        console.log(`    discovered: ${discovered}`);
        console.log(`    has object data: ${!!objectData}`);
        console.log(`    object name: "${objectData?.name || 'NO_NAME'}"`);
        console.log(`    _isUndiscovered would be: ${!discovered && !isTestMode}`);
        
        // Check if it's in the discovered list with exact matching
        const exactMatch = discoveredIds.includes(id);
        const normalizedMatch = discoveredIds.some(did => norm(did) === norm(id));
        console.log(`    exact match in list: ${exactMatch}`);
        console.log(`    normalized match in list: ${normalizedMatch}`);
    });
    
    console.log('\n✅ WORKING OBJECTS (showing names):');
    workingObjects.forEach(id => {
        const discovered = isDiscovered(id);
        const objectData = starChartsManager.getObjectData(id);
        console.log(`  ${id}:`);
        console.log(`    discovered: ${discovered}`);
        console.log(`    has object data: ${!!objectData}`);
        console.log(`    object name: "${objectData?.name || 'NO_NAME'}"`);
        console.log(`    _isUndiscovered would be: ${!discovered && !isTestMode}`);
        
        // Check if it's in the discovered list with exact matching
        const exactMatch = discoveredIds.includes(id);
        const normalizedMatch = discoveredIds.some(did => norm(did) === norm(id));
        console.log(`    exact match in list: ${exactMatch}`);
        console.log(`    normalized match in list: ${normalizedMatch}`);
    });
    
    // Function to force refresh discovery status
    window.forceRefreshDiscovery = function() {
        console.log('\n🔄 FORCING DISCOVERY REFRESH...');
        
        // Try to refresh the discovered objects list
        if (typeof starChartsManager.refreshDiscoveredObjects === 'function') {
            starChartsManager.refreshDiscoveredObjects();
            console.log('✅ Called refreshDiscoveredObjects()');
        }
        
        // Try to clear any cached discovery data
        if (starChartsManager.discoveryCache) {
            starChartsManager.discoveryCache = null;
            console.log('✅ Cleared discoveryCache');
        }
        
        // Force re-render of objects
        if (typeof starChartsUI.refreshObjectsForRender === 'function') {
            starChartsUI.refreshObjectsForRender();
            console.log('✅ Called refreshObjectsForRender()');
        }
        
        console.log('🎯 Try hovering over problematic objects now!');
    };
    
    // Function to manually add problematic objects to discovered list
    window.fixProblematicObjects = function() {
        console.log('\n🔧 MANUALLY ADDING PROBLEMATIC OBJECTS TO DISCOVERED LIST...');
        
        const currentDiscovered = starChartsManager.getDiscoveredObjects();
        const newDiscovered = [...currentDiscovered];
        
        problematicObjects.forEach(id => {
            if (!newDiscovered.includes(id)) {
                newDiscovered.push(id);
                console.log(`✅ Added ${id} to discovered list`);
            } else {
                console.log(`⚠️ ${id} already in discovered list`);
            }
        });
        
        // Try to update the discovered objects list
        if (typeof starChartsManager.setDiscoveredObjects === 'function') {
            starChartsManager.setDiscoveredObjects(newDiscovered);
            console.log('✅ Updated discovered objects list');
        } else if (starChartsManager.discoveredObjects) {
            starChartsManager.discoveredObjects = newDiscovered;
            console.log('✅ Set discoveredObjects property');
        }
        
        console.log('🎯 Try hovering over problematic objects now!');
    };
    
    console.log('\n💡 Available functions:');
    console.log('  - forceRefreshDiscovery() - Try to refresh discovery cache');
    console.log('  - fixProblematicObjects() - Manually add objects to discovered list');
    
} else {
    console.log('❌ Star Charts not found');
}

console.log('\n🏁 Discovery cache debug complete!');
