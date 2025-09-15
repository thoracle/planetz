// Debug script to track the "click first, then hover" tooltip bug
// Run this in browser console when Star Charts is open

console.log('🔧 Starting CLICK vs HOVER debug...');

if (window.navigationSystemManager?.starChartsUI && window.navigationSystemManager?.starChartsManager) {
    const starChartsUI = window.navigationSystemManager.starChartsUI;
    const starChartsManager = window.navigationSystemManager.starChartsManager;
    
    console.log('✅ Star Charts components found');
    
    // First, fix the broken discovery system from fixProblematicObjects()
    console.log('\n🔧 FIXING BROKEN DISCOVERY SYSTEM...');
    
    // Check current state
    const currentDiscovered = starChartsManager.getDiscoveredObjects();
    console.log('Current discoveredObjects type:', typeof currentDiscovered);
    console.log('Is Array:', Array.isArray(currentDiscovered));
    console.log('Has .has method:', typeof currentDiscovered.has);
    
    if (Array.isArray(currentDiscovered)) {
        console.log('❌ discoveredObjects is an Array - converting to Set...');
        starChartsManager.discoveredObjects = new Set(currentDiscovered);
        console.log('✅ Fixed: discoveredObjects is now a Set with', starChartsManager.discoveredObjects.size, 'items');
    } else {
        console.log('✅ discoveredObjects is already a Set');
    }
    
    // Test the problematic objects that require clicking first
    const problematicObjects = [
        'A0_helios_solar_array',
        'A0_vesta_mining_complex', 
        'A0_navigation_beacon_3',
        'A0_navigation_beacon_7',
        'A0_deimos_research_facility'
    ];
    
    console.log('\n🎯 TESTING CLICK vs HOVER BEHAVIOR:');
    
    // Track which objects exhibit the click-first behavior
    window.clickFirstObjects = new Set();
    window.hoverWorkingObjects = new Set();
    
    // Override showTooltip to track behavior
    const originalShowTooltip = starChartsUI.showTooltip;
    starChartsUI.showTooltip = function(object) {
        const objectId = object?.id;
        const objectName = object?.name;
        const tooltipText = this.getTooltipText(object);
        
        console.log(`🎯 TOOLTIP CALL: ${objectId} "${objectName}" -> "${tooltipText}"`);
        
        // Track if this is showing "Unknown" despite having a name
        if (objectName && objectName !== 'Unknown' && tooltipText === 'Unknown') {
            window.clickFirstObjects.add(objectId);
            console.log(`❌ CLICK-FIRST BUG: ${objectId} has name "${objectName}" but tooltip shows "Unknown"`);
        } else if (objectName && tooltipText === objectName) {
            window.hoverWorkingObjects.add(objectId);
            console.log(`✅ HOVER WORKING: ${objectId} shows correct tooltip "${tooltipText}"`);
        }
        
        return originalShowTooltip.call(this, object);
    };
    
    // Override selectObject to track clicks
    const originalSelectObject = starChartsUI.selectObject;
    starChartsUI.selectObject = function(object) {
        const objectId = object?.id;
        console.log(`🖱️ CLICK: ${objectId} "${object?.name}"`);
        
        // Check if this was a click-first object
        if (window.clickFirstObjects.has(objectId)) {
            console.log(`🔧 POTENTIAL FIX: ${objectId} was click-first, now clicked - should work on next hover`);
        }
        
        return originalSelectObject.call(this, object);
    };
    
    // Function to test specific objects
    window.testClickFirstBug = function(objectId) {
        console.log(`\n🧪 TESTING ${objectId}:`);
        
        // Get object data
        const objectData = starChartsManager.getObjectData(objectId);
        if (!objectData) {
            console.log(`❌ No object data found for ${objectId}`);
            return;
        }
        
        console.log(`📋 Object data:`, {
            id: objectData.id,
            name: objectData.name,
            type: objectData.type
        });
        
        // Check discovery status
        const isDiscovered = starChartsManager.isDiscovered(objectId);
        console.log(`🔍 Discovery status: ${isDiscovered}`);
        
        // Test tooltip generation
        const mockObject = {
            id: objectId,
            name: objectData.name,
            type: objectData.type,
            _isUndiscovered: !isDiscovered
        };
        
        const tooltipText = starChartsUI.getTooltipText(mockObject);
        console.log(`🏷️ Tooltip text: "${tooltipText}"`);
        
        // Check if this exhibits click-first behavior
        if (objectData.name && objectData.name !== 'Unknown' && tooltipText === 'Unknown') {
            console.log(`❌ CLICK-FIRST BUG CONFIRMED: Has name "${objectData.name}" but tooltip shows "Unknown"`);
            
            // Try to identify the cause
            console.log(`🔍 Debugging tooltip logic:`);
            console.log(`  - isDiscovered: ${isDiscovered}`);
            console.log(`  - _isUndiscovered: ${mockObject._isUndiscovered}`);
            console.log(`  - isTestModeEnabled: ${starChartsUI.isTestModeEnabled()}`);
            
        } else {
            console.log(`✅ WORKING CORRECTLY: Tooltip shows "${tooltipText}"`);
        }
    };
    
    // Test all problematic objects
    console.log('\n🧪 TESTING ALL PROBLEMATIC OBJECTS:');
    problematicObjects.forEach(objectId => {
        window.testClickFirstBug(objectId);
    });
    
    // Function to enable test mode (should fix all tooltips)
    window.enableTestMode = function() {
        console.log('\n🧪 ENABLING TEST MODE...');
        window.STAR_CHARTS_TEST_MODE = true;
        console.log('✅ Test mode enabled - all objects should now show names');
        console.log('🎯 Try hovering over problematic objects now!');
    };
    
    // Function to disable test mode
    window.disableTestMode = function() {
        console.log('\n🧪 DISABLING TEST MODE...');
        window.STAR_CHARTS_TEST_MODE = false;
        console.log('✅ Test mode disabled - back to normal discovery behavior');
    };
    
    console.log('\n💡 Available functions:');
    console.log('  - testClickFirstBug(objectId) - Test specific object');
    console.log('  - enableTestMode() - Show all object names');
    console.log('  - disableTestMode() - Back to normal discovery');
    console.log('  - window.clickFirstObjects - Set of objects with click-first bug');
    console.log('  - window.hoverWorkingObjects - Set of objects working correctly');
    
} else {
    console.log('❌ Star Charts not found');
}

console.log('\n🏁 Click vs hover debug complete!');