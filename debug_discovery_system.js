// Debug script to check discovery system
// Run this in browser console when Star Charts is open

console.log('🔧 Starting DISCOVERY SYSTEM debug...');

if (window.navigationSystemManager?.starChartsUI && window.navigationSystemManager?.starChartsManager) {
    const starChartsUI = window.navigationSystemManager.starChartsUI;
    const starChartsManager = window.navigationSystemManager.starChartsManager;
    
    console.log('✅ Star Charts components found');
    
    // Test 1: Check test mode
    console.log('\n🧪 TESTING TEST MODE:');
    const isTestMode = starChartsUI.isTestModeEnabled();
    console.log('isTestModeEnabled():', isTestMode);
    
    // Test 2: Check discovered objects
    console.log('\n📋 TESTING DISCOVERED OBJECTS:');
    const discoveredIds = starChartsManager.getDiscoveredObjects();
    console.log('getDiscoveredObjects():', discoveredIds);
    console.log('discoveredIds type:', typeof discoveredIds);
    console.log('discoveredIds is array:', Array.isArray(discoveredIds));
    if (Array.isArray(discoveredIds)) {
        console.log('discoveredIds length:', discoveredIds.length);
        console.log('First 10 discovered IDs:', discoveredIds.slice(0, 10));
    }
    
    // Test 3: Check specific objects that are showing as "Unknown"
    console.log('\n🔍 TESTING SPECIFIC OBJECTS:');
    const problemObjects = [
        'A0_l4_trading_post',
        'A0_venus_cloud_city', 
        'A0_europa_research_station',
        'A0_lunar_mining_consortium',
        'A0_ceres_outpost',
        'A0_navigation_beacon_4'
    ];
    
    const workingObjects = [
        'A0_star',
        'A0_terra_prime',
        'A0_callisto_defense_platform',
        'A0_helios_solar_array'
    ];
    
    // Test discovery function
    const norm = (id) => (typeof id === 'string' ? id.replace(/^a0_/i, 'A0_') : id);
    const isDiscovered = (id) => {
        if (isTestMode) return true;
        if (!Array.isArray(discoveredIds)) return false;
        const nid = norm(id);
        return discoveredIds.some(did => norm(did) === nid);
    };
    
    console.log('\n❌ PROBLEM OBJECTS (showing "Unknown"):');
    problemObjects.forEach(id => {
        const discovered = isDiscovered(id);
        const normalizedId = norm(id);
        const inDiscoveredList = Array.isArray(discoveredIds) ? discoveredIds.some(did => norm(did) === normalizedId) : false;
        console.log(`  ${id}:`);
        console.log(`    discovered: ${discovered}`);
        console.log(`    normalized: ${normalizedId}`);
        console.log(`    in discovered list: ${inDiscoveredList}`);
        console.log(`    _isUndiscovered would be: ${!discovered && !isTestMode}`);
    });
    
    console.log('\n✅ WORKING OBJECTS (showing names):');
    workingObjects.forEach(id => {
        const discovered = isDiscovered(id);
        const normalizedId = norm(id);
        const inDiscoveredList = Array.isArray(discoveredIds) ? discoveredIds.some(did => norm(did) === normalizedId) : false;
        console.log(`  ${id}:`);
        console.log(`    discovered: ${discovered}`);
        console.log(`    normalized: ${normalizedId}`);
        console.log(`    in discovered list: ${inDiscoveredList}`);
        console.log(`    _isUndiscovered would be: ${!discovered && !isTestMode}`);
    });
    
    // Test 4: Check if we can find the problem objects in the discovered list with different variations
    console.log('\n🔍 SEARCHING FOR PROBLEM OBJECTS IN DISCOVERED LIST:');
    if (Array.isArray(discoveredIds)) {
        problemObjects.forEach(problemId => {
            console.log(`\nSearching for ${problemId}:`);
            const matches = discoveredIds.filter(did => {
                const normalizedDid = norm(did);
                const normalizedProblem = norm(problemId);
                return normalizedDid.toLowerCase().includes(normalizedProblem.toLowerCase()) || 
                       normalizedProblem.toLowerCase().includes(normalizedDid.toLowerCase());
            });
            console.log(`  Potential matches:`, matches);
        });
    }
    
} else {
    console.log('❌ Star Charts not found');
}

console.log('\n🏁 Discovery system debug complete!');
