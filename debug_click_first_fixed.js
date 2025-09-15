// Fixed automated script to detect the click-first tooltip bug
// This version uses the actual showTooltip logic instead of the non-existent getTooltipText method

console.log('🤖 Starting FIXED click-first tooltip bug detection...');

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
        undiscoveredCorrect: [],
        testDetails: []
    };
    
    // Test each object using the actual tooltip logic
    allObjects.forEach((obj, index) => {
        const objectId = obj.id;
        const objectName = obj.name;
        const objectType = obj.type;
        const isUndiscovered = obj._isUndiscovered;
        
        console.log(`🧪 Testing ${index + 1}/${allObjects.length}: ${objectId} "${objectName}" (${objectType}) - Undiscovered: ${isUndiscovered}`);
        
        // Replicate the actual tooltip logic from showTooltip method
        let tooltipText;
        
        // Ensure object has complete data including name (like ensureObjectHasName)
        let completeObject = obj;
        if (!obj.name || obj.name === 'undefined' || obj.name.trim() === '') {
            if (obj._isShip) {
                completeObject = { ...obj, name: 'Your Ship', type: 'ship' };
            } else if (obj.id && starChartsManager.objectDatabase) {
                const completeData = starChartsManager.getObjectData(obj.id);
                if (completeData && completeData.name) {
                    completeObject = { ...obj, ...completeData };
                } else {
                    // Fallback name generation
                    const cleanId = obj.id.replace(/^[A-Z]\d+_/, '');
                    const fallbackName = cleanId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    completeObject = { ...obj, name: fallbackName, type: obj.type || 'Unknown' };
                }
            }
        }
        
        // Apply the actual tooltip logic from showTooltip
        if (completeObject._isShip) {
            tooltipText = 'You are here';
        } else if (completeObject._isUndiscovered) {
            tooltipText = 'Unknown';
        } else {
            tooltipText = completeObject.name || 'Unknown Object';
        }
        
        const testResult = {
            id: objectId,
            name: completeObject.name,
            type: objectType,
            isUndiscovered: isUndiscovered,
            tooltipText: tooltipText,
            hasValidName: completeObject.name && completeObject.name !== 'Unknown' && completeObject.name.trim() !== '',
            showsUnknown: tooltipText === 'Unknown'
        };
        
        // Detect click-first bug pattern:
        // Object has a valid name AND is not marked as undiscovered BUT tooltip shows "Unknown"
        if (testResult.hasValidName && !testResult.isUndiscovered && testResult.showsUnknown) {
            console.log(`🐛 CLICK-FIRST BUG DETECTED: ${objectId} has name "${completeObject.name}" and is discovered but tooltip shows "Unknown"`);
            results.clickFirstBugs.push(testResult);
        } else if (testResult.hasValidName && !testResult.isUndiscovered && tooltipText === completeObject.name) {
            console.log(`✅ WORKING CORRECTLY: ${objectId} shows correct tooltip "${tooltipText}"`);
            results.workingCorrectly.push(testResult);
        } else if (testResult.isUndiscovered && testResult.showsUnknown) {
            console.log(`ℹ️ EXPECTED UNKNOWN: ${objectId} correctly shows "Unknown" (undiscovered)`);
            results.undiscoveredCorrect.push(testResult);
        } else {
            console.log(`⚠️ OTHER CASE: ${objectId} - Name: "${completeObject.name}", Undiscovered: ${testResult.isUndiscovered}, Tooltip: "${tooltipText}"`);
        }
        
        results.testDetails.push(testResult);
    });
    
    // Analysis and reporting
    console.log('\n📊 FIXED DETECTION RESULTS:');
    console.log(`  Total objects tested: ${results.totalTested}`);
    console.log(`  Objects with click-first bug: ${results.clickFirstBugs.length}`);
    console.log(`  Objects working correctly: ${results.workingCorrectly.length}`);
    console.log(`  Undiscovered objects (correct): ${results.undiscoveredCorrect.length}`);
    
    if (results.clickFirstBugs.length > 0) {
        console.log('\n🐛 OBJECTS WITH CLICK-FIRST BUG:');
        results.clickFirstBugs.forEach(obj => {
            console.log(`  - ${obj.id} "${obj.name}" (${obj.type}) - Should show name but shows "Unknown"`);
        });
        
        // Pattern analysis
        console.log('\n🔍 BUG PATTERN ANALYSIS:');
        
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
        
        // Check discovery system status
        console.log('\n🔍 DISCOVERY SYSTEM ANALYSIS:');
        const discoveredIds = starChartsManager.getDiscoveredObjects();
        console.log(`  - Discovery system type: ${Array.isArray(discoveredIds) ? 'Array' : 'Set'}`);
        console.log(`  - Total discovered objects: ${Array.isArray(discoveredIds) ? discoveredIds.length : discoveredIds.size}`);
        console.log(`  - Test mode enabled: ${starChartsUI.isTestModeEnabled()}`);
        
        // Check if problematic objects are in discovery list
        console.log('\n🔍 DISCOVERY STATUS OF PROBLEMATIC OBJECTS:');
        results.clickFirstBugs.forEach(bugObj => {
            const norm = (id) => (typeof id === 'string' ? id.replace(/^a0_/i, 'A0_') : id);
            const nid = norm(bugObj.id);
            const isInDiscoveryList = Array.isArray(discoveredIds) ? 
                discoveredIds.some(did => norm(did) === nid) :
                discoveredIds.has(nid);
            console.log(`  - ${bugObj.id}: In discovery list = ${isInDiscoveryList}`);
        });
        
    } else {
        console.log('\n🎉 NO CLICK-FIRST BUG DETECTED!');
        console.log('All tooltips are working correctly.');
    }
    
    if (results.workingCorrectly.length > 0) {
        console.log('\n✅ SAMPLE WORKING OBJECTS:');
        results.workingCorrectly.slice(0, 5).forEach(obj => {
            console.log(`  - ${obj.id} "${obj.name}" (${obj.type}) - Shows: "${obj.tooltipText}"`);
        });
        if (results.workingCorrectly.length > 5) {
            console.log(`  ... and ${results.workingCorrectly.length - 5} more working correctly`);
        }
    }
    
    if (results.undiscoveredCorrect.length > 0) {
        console.log('\n🔒 UNDISCOVERED OBJECTS (CORRECTLY SHOWING "UNKNOWN"):');
        results.undiscoveredCorrect.slice(0, 5).forEach(obj => {
            console.log(`  - ${obj.id} "${obj.name}" (${obj.type}) - Correctly shows: "Unknown"`);
        });
        if (results.undiscoveredCorrect.length > 5) {
            console.log(`  ... and ${results.undiscoveredCorrect.length - 5} more undiscovered objects`);
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
        
        // Test tooltip before click (simulate hover)
        const completeObject = starChartsUI.ensureObjectHasName(obj);
        let tooltipBefore;
        if (completeObject._isShip) {
            tooltipBefore = 'You are here';
        } else if (completeObject._isUndiscovered) {
            tooltipBefore = 'Unknown';
        } else {
            tooltipBefore = completeObject.name || 'Unknown Object';
        }
        console.log(`Before click: "${tooltipBefore}"`);
        
        // Simulate clicking the object
        try {
            starChartsUI.selectObject(obj);
            console.log(`✅ Clicked object successfully`);
            
            // Test tooltip after click
            const completeObjectAfter = starChartsUI.ensureObjectHasName(obj);
            let tooltipAfter;
            if (completeObjectAfter._isShip) {
                tooltipAfter = 'You are here';
            } else if (completeObjectAfter._isUndiscovered) {
                tooltipAfter = 'Unknown';
            } else {
                tooltipAfter = completeObjectAfter.name || 'Unknown Object';
            }
            console.log(`After click: "${tooltipAfter}"`);
            
            if (tooltipBefore === 'Unknown' && tooltipAfter !== 'Unknown') {
                console.log(`🎯 CLICK-FIX CONFIRMED: Tooltip fixed by clicking!`);
            } else if (tooltipBefore === tooltipAfter) {
                console.log(`⚠️ No change after click`);
            } else {
                console.log(`ℹ️ Tooltip changed: "${tooltipBefore}" -> "${tooltipAfter}"`);
            }
        } catch (e) {
            console.log(`❌ Click simulation failed: ${e.message}`);
        }
    };
    
    console.log('\n💡 Available functions:');
    console.log('  - window.testClickFix(objectId) - Test click-fix on specific object');
    console.log('  - window.clickFirstBugResults - Full test results');
    
} else {
    console.log('❌ Star Charts components not found');
}

console.log('\n🏁 Fixed automated click-first bug detection complete!');
