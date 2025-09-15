// Debug what's actually happening in test mode
console.log('🧪 DEBUGGING TEST MODE ISSUE');

(function() {
    if (!window.navigationSystemManager?.starChartsUI) {
        console.log('❌ Star Charts UI not available');
        return;
    }

    const starChartsUI = window.navigationSystemManager.starChartsUI;
    
    // Check test mode status
    const isTestMode = starChartsUI.isTestModeEnabled();
    console.log(`🧪 Test Mode Enabled: ${isTestMode}`);
    
    if (isTestMode) {
        console.log('✅ Test mode is active - all objects should be discovered');
    } else {
        console.log('❌ Test mode is NOT active - objects need to be in discovered set');
    }
    
    // Check test mode detection methods
    console.log('\n🔍 Test Mode Detection Methods:');
    
    // Method 1: window.STAR_CHARTS_DISCOVER_ALL
    const windowFlag = window.STAR_CHARTS_DISCOVER_ALL;
    console.log(`  window.STAR_CHARTS_DISCOVER_ALL: ${windowFlag}`);
    
    // Method 2: localStorage flag
    let localStorageFlag = null;
    try {
        localStorageFlag = localStorage.getItem('star_charts_test_discover_all');
        console.log(`  localStorage flag: "${localStorageFlag}"`);
    } catch (e) {
        console.log(`  localStorage access failed: ${e.message}`);
    }
    
    // Get all objects and check their discovery status
    const allObjects = starChartsUI.getDiscoveredObjectsForRender();
    console.log(`\n📊 Objects Analysis (${allObjects.length} total):`);
    
    let undiscoveredCount = 0;
    let showingUnknownCount = 0;
    
    allObjects.forEach((object, index) => {
        const isUndiscovered = object._isUndiscovered;
        if (isUndiscovered) undiscoveredCount++;
        
        // Test what tooltip would show
        const completeObject = starChartsUI.ensureObjectHasName(object);
        let tooltipText;
        if (completeObject._isShip) {
            tooltipText = 'You are here';
        } else if (completeObject._isUndiscovered) {
            tooltipText = 'Unknown';
        } else {
            tooltipText = completeObject.name || 'Unknown Object';
        }
        
        if (tooltipText === 'Unknown') showingUnknownCount++;
        
        if (index < 5 || isUndiscovered || tooltipText === 'Unknown') {
            console.log(`  ${index + 1}. ${object.id}:`);
            console.log(`     Name: "${object.name}"`);
            console.log(`     _isUndiscovered: ${isUndiscovered}`);
            console.log(`     Tooltip would show: "${tooltipText}"`);
            console.log(`     Complete object _isUndiscovered: ${completeObject._isUndiscovered}`);
        }
    });
    
    console.log(`\n📈 Summary:`);
    console.log(`  Objects marked _isUndiscovered: ${undiscoveredCount}`);
    console.log(`  Objects showing "Unknown" tooltip: ${showingUnknownCount}`);
    
    if (isTestMode && (undiscoveredCount > 0 || showingUnknownCount > 0)) {
        console.log(`\n🚨 PROBLEM IDENTIFIED:`);
        console.log(`  Test mode is active but objects are still undiscovered/showing Unknown`);
        console.log(`  This suggests the test mode logic isn't working properly`);
        
        // Check if the issue is in ensureObjectHasName
        console.log(`\n🔍 Testing ensureObjectHasName method:`);
        const testObject = allObjects.find(obj => obj._isUndiscovered);
        if (testObject) {
            console.log(`  Original object:`, {
                id: testObject.id,
                name: testObject.name,
                _isUndiscovered: testObject._isUndiscovered
            });
            
            const enhanced = starChartsUI.ensureObjectHasName(testObject);
            console.log(`  After ensureObjectHasName:`, {
                id: enhanced.id,
                name: enhanced.name,
                _isUndiscovered: enhanced._isUndiscovered
            });
            
            if (enhanced._isUndiscovered !== testObject._isUndiscovered) {
                console.log(`  🚨 ensureObjectHasName is CHANGING _isUndiscovered flag!`);
            }
        }
    } else if (isTestMode) {
        console.log(`\n✅ Test mode is working correctly - all objects discovered`);
    } else {
        console.log(`\n ℹ️ Not in test mode - undiscovered objects are expected`);
    }
    
})();

console.log('🏁 Test mode debug complete!');
