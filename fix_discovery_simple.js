// Simple fix: Add objects with proper names to the discovery system
console.log('🔧 SIMPLE DISCOVERY FIX - Adding named objects to discovered set');

(function() {
    if (!window.navigationSystemManager?.starChartsUI) {
        console.log('❌ Star Charts UI not available');
        return;
    }

    const starChartsUI = window.navigationSystemManager.starChartsUI;
    const starChartsManager = starChartsUI.starChartsManager;
    
    if (!starChartsManager || !starChartsManager.discoveredObjects) {
        console.log('❌ Discovery system not available');
        return;
    }

    console.log(`🔍 Current discovered objects: ${starChartsManager.discoveredObjects.size}`);
    
    // Get all objects that should be discovered
    const allObjects = starChartsUI.getDiscoveredObjectsForRender();
    const objectsToDiscover = [];

    allObjects.forEach(object => {
        const hasProperName = object.name && object.name !== 'Unknown' && object.name !== 'undefined' && object.name.trim() !== '';
        const isUndiscovered = object._isUndiscovered === true;
        const isInDiscoveredSet = starChartsManager.discoveredObjects.has(object.id);

        if (hasProperName && (isUndiscovered || !isInDiscoveredSet)) {
            objectsToDiscover.push(object);
        }
    });

    console.log(`🎯 Objects needing discovery: ${objectsToDiscover.length}`);

    if (objectsToDiscover.length === 0) {
        console.log('✅ All objects are already properly discovered!');
        return;
    }

    // Add objects to discovered set
    let addedCount = 0;
    objectsToDiscover.forEach(object => {
        if (!starChartsManager.discoveredObjects.has(object.id)) {
            starChartsManager.discoveredObjects.add(object.id);
            addedCount++;
            console.log(`✅ Added ${object.id} ("${object.name}") to discovered objects`);
        }
    });

    console.log(`\n🎯 DISCOVERY FIX RESULTS:`);
    console.log(`  📊 Objects processed: ${allObjects.length}`);
    console.log(`  ➕ Objects added to discovery: ${addedCount}`);
    console.log(`  🔍 Total discovered objects now: ${starChartsManager.discoveredObjects.size}`);

    // Force a refresh to apply changes
    if (starChartsUI.render) {
        starChartsUI.render();
        console.log(`✅ Triggered re-render to apply changes`);
    }

    // Test the fix by checking tooltips
    setTimeout(() => {
        console.log(`\n🧪 TESTING FIX - Checking tooltips after discovery update:`);
        
        const updatedObjects = starChartsUI.getDiscoveredObjectsForRender();
        let stillUnknownCount = 0;
        
        updatedObjects.forEach(object => {
            const completeObject = starChartsUI.ensureObjectHasName(object);
            let tooltipText;
            if (completeObject._isShip) {
                tooltipText = 'You are here';
            } else if (completeObject._isUndiscovered) {
                tooltipText = 'Unknown';
            } else {
                tooltipText = completeObject.name || 'Unknown Object';
            }
            
            if (tooltipText === 'Unknown' && object.name && object.name !== 'Unknown') {
                stillUnknownCount++;
                console.log(`❌ ${object.id} still showing "Unknown" despite having name "${object.name}"`);
            }
        });
        
        if (stillUnknownCount === 0) {
            console.log(`✅ SUCCESS! All objects with names now show proper tooltips`);
        } else {
            console.log(`⚠️ ${stillUnknownCount} objects still showing "Unknown" - may need additional fixes`);
        }
        
    }, 500);

})();

console.log('🏁 Simple discovery fix complete!');
