// Automated script to detect and analyze the click-first tooltip bug
// Run this in the browser console when Star Charts is open

console.log('🤖 Starting AUTOMATED click-first tooltip bug detection...');

if (window.navigationSystemManager?.starChartsUI && window.navigationSystemManager?.starChartsManager) {
    const starChartsUI = window.navigationSystemManager.starChartsUI;
    const starChartsManager = window.navigationSystemManager.starChartsManager;
    
    console.log('✅ Star Charts components found');
    
    // First, fix any broken discovery system from previous debug attempts
    const currentDiscovered = starChartsManager.getDiscoveredObjects();
    if (Array.isArray(currentDiscovered)) {
        console.log('🔧 Fixing broken discovery system (Array -> Set)...');
        starChartsManager.discoveredObjects = new Set(currentDiscovered);
        console.log('✅ Fixed: discoveredObjects is now a Set');
    }
    
    // Get all objects for systematic testing
    const allObjects = starChartsUI.getDiscoveredObjectsForRender();
    console.log(`🔍 Found ${allObjects.length} objects to test systematically`);
    
    // Results tracking
    const results = {
        totalTested: allObjects.length,
        clickFirstBugs: [],
        workingCorrectly: [],
        testDetails: []
    };
    
    // Test each object
    allObjects.forEach((obj, index) => {
        const objectId = obj.id;
        const objectName = obj.name;
        const objectType = obj.type;
        const isUndiscovered = obj._isUndiscovered;
        
        console.log(`🧪 Testing ${index + 1}/${allObjects.length}: ${objectId} "${objectName}" (${objectType})`);
        
        // Get tooltip text using the actual method
        let tooltipText;
        try {
            tooltipText = starChartsUI.getTooltipText(obj);
        } catch (e) {
            tooltipText = `ERROR: ${e.message}`;
        }
        
        const testResult = {
            id: objectId,
            name: objectName,
            type: objectType,
            isUndiscovered: isUndiscovered,
            tooltipText: tooltipText,
            hasValidName: objectName && objectName !== 'Unknown' && objectName.trim() !== '',
            showsUnknown: tooltipText === 'Unknown'
        };
        
        // Detect click-first bug pattern:
        // Object has a valid name but tooltip shows "Unknown"
        if (testResult.hasValidName && testResult.showsUnknown) {
            console.log(`🐛 CLICK-FIRST BUG DETECTED: ${objectId} has name "${objectName}" but tooltip shows "Unknown"`);
            results.clickFirstBugs.push(testResult);
        } else if (testResult.hasValidName && tooltipText === objectName) {
            console.log(`✅ WORKING CORRECTLY: ${objectId} shows correct tooltip "${tooltipText}"`);
            results.workingCorrectly.push(testResult);
        } else if (testResult.showsUnknown && !testResult.hasValidName) {
            console.log(`ℹ️ EXPECTED UNKNOWN: ${objectId} correctly shows "Unknown" (no valid name)`);
        } else {
            console.log(`⚠️ OTHER CASE: ${objectId} - Name: "${objectName}", Tooltip: "${tooltipText}"`);
        }
        
        results.testDetails.push(testResult);
    });
    
    // Analysis and reporting
    console.log('\n📊 AUTOMATED DETECTION RESULTS:');
    console.log(`  Total objects tested: ${results.totalTested}`);
    console.log(`  Objects with click-first bug: ${results.clickFirstBugs.length}`);
    console.log(`  Objects working correctly: ${results.workingCorrectly.length}`);
    
    if (results.clickFirstBugs.length > 0) {
        console.log('\n🐛 OBJECTS WITH CLICK-FIRST BUG:');
        results.clickFirstBugs.forEach(obj => {
            const discoveryStatus = obj.isUndiscovered ? 'undiscovered' : 'discovered';
            console.log(`  - ${obj.id} "${obj.name}" (${obj.type}) - ${discoveryStatus}`);
        });
        
        // Pattern analysis
        const discoveredBugs = results.clickFirstBugs.filter(obj => !obj.isUndiscovered);
        const undiscoveredBugs = results.clickFirstBugs.filter(obj => obj.isUndiscovered);
        
        console.log('\n🔍 BUG PATTERN ANALYSIS:');
        console.log(`  - Discovered objects with bug: ${discoveredBugs.length}`);
        console.log(`  - Undiscovered objects with bug: ${undiscoveredBugs.length}`);
        
        // Group by object type
        const typeGroups = {};
        results.clickFirstBugs.forEach(obj => {
            const type = obj.type;
            if (!typeGroups[type]) typeGroups[type] = [];
            typeGroups[type].push(obj.id);
        });
        
        console.log('  - By object type:');
        Object.keys(typeGroups).forEach(type => {
            console.log(`    ${type}: ${typeGroups[type].length} objects (${typeGroups[type].join(', ')})`);
        });
        
        console.log(`\n🎯 CONFIRMED: Click-first tooltip bug affects ${results.clickFirstBugs.length} objects`);
        
        // Test the click-fix behavior on first few problematic objects
        console.log('\n🧪 TESTING CLICK-FIX BEHAVIOR:');
        const testObjects = results.clickFirstBugs.slice(0, 3); // Test first 3
        
        testObjects.forEach(bugObj => {
            console.log(`\n🔧 Testing click-fix for: ${bugObj.id} "${bugObj.name}"`);
            
            // Find the actual object in the rendered list
            const actualObj = allObjects.find(obj => obj.id === bugObj.id);
            if (!actualObj) {
                console.log(`  ❌ Could not find object in rendered list`);
                return;
            }
            
            // Test tooltip before click
            const tooltipBefore = starChartsUI.getTooltipText(actualObj);
            console.log(`  Before click: "${tooltipBefore}"`);
            
            // Simulate clicking the object
            try {
                starChartsUI.selectObject(actualObj);
                console.log(`  ✅ Clicked object successfully`);
                
                // Test tooltip after click
                const tooltipAfter = starChartsUI.getTooltipText(actualObj);
                console.log(`  After click: "${tooltipAfter}"`);
                
                if (tooltipBefore === 'Unknown' && tooltipAfter !== 'Unknown') {
                    console.log(`  🎯 CLICK-FIX CONFIRMED: Tooltip fixed by clicking!`);
                } else if (tooltipBefore === tooltipAfter) {
                    console.log(`  ⚠️ No change after click`);
                } else {
                    console.log(`  ℹ️ Tooltip changed: "${tooltipBefore}" -> "${tooltipAfter}"`);
                }
            } catch (e) {
                console.log(`  ❌ Click simulation failed: ${e.message}`);
            }
        });
        
    } else {
        console.log('\n🎉 NO CLICK-FIRST BUG DETECTED!');
        console.log('All tooltips are working correctly on hover.');
    }
    
    if (results.workingCorrectly.length > 0) {
        console.log('\n✅ SAMPLE WORKING OBJECTS:');
        results.workingCorrectly.slice(0, 5).forEach(obj => {
            const discoveryStatus = obj.isUndiscovered ? 'undiscovered' : 'discovered';
            console.log(`  - ${obj.id} "${obj.name}" (${obj.type}) - ${discoveryStatus} - Shows: "${obj.tooltipText}"`);
        });
        if (results.workingCorrectly.length > 5) {
            console.log(`  ... and ${results.workingCorrectly.length - 5} more working correctly`);
        }
    }
    
    // Store results globally for further analysis
    window.clickFirstBugResults = results;
    console.log('\n💾 Results stored in window.clickFirstBugResults');
    
    // Provide helper functions
    window.testClickFix = function(objectId) {
        const obj = allObjects.find(o => o.id === objectId);
        if (!obj) {
            console.log(`❌ Object ${objectId} not found`);
            return;
        }
        
        console.log(`\n🧪 Manual click-fix test for: ${objectId} "${obj.name}"`);
        const before = starChartsUI.getTooltipText(obj);
        console.log(`Before: "${before}"`);
        
        starChartsUI.selectObject(obj);
        
        const after = starChartsUI.getTooltipText(obj);
        console.log(`After: "${after}"`);
        
        if (before !== after) {
            console.log(`🎯 CHANGE DETECTED: "${before}" -> "${after}"`);
        } else {
            console.log(`⚠️ No change`);
        }
    };
    
    console.log('\n💡 Available functions:');
    console.log('  - window.testClickFix(objectId) - Test click-fix on specific object');
    console.log('  - window.clickFirstBugResults - Full test results');
    
} else {
    console.log('❌ Star Charts components not found');
}

console.log('\n🏁 Automated click-first bug detection complete!');
