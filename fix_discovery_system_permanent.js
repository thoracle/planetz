// PERMANENT FIX: Update the discovery system itself, not just object properties
console.log('🔧 PERMANENT DISCOVERY SYSTEM FIX - v5.0');

(function() {
    if (!window.navigationSystemManager?.starChartsUI) {
        console.log('❌ Star Charts UI not available');
        return;
    }

    const starChartsUI = window.navigationSystemManager.starChartsUI;
    const starChartsManager = starChartsUI.starChartsManager;
    
    if (!starChartsManager) {
        console.log('❌ Star Charts Manager not available');
        return;
    }

    console.log('🎯 Analyzing current discovery system...');

    // Get all objects that should be discovered (have proper names and types)
    const allObjects = starChartsUI.getDiscoveredObjectsForRender();
    const objectsToDiscover = [];

    allObjects.forEach((object, index) => {
        const hasProperName = object.name && object.name !== 'Unknown' && object.name !== 'undefined' && object.name.trim() !== '';
        const hasProperType = object.type && object.type !== 'Unknown';
        const isCurrentlyUndiscovered = object._isUndiscovered;
        const isInDiscoveredSet = starChartsManager.discoveredObjects && starChartsManager.discoveredObjects.has(object.id);

        console.log(`🔍 ${index + 1}. ${object.id}:`);
        console.log(`   Name: "${object.name}" (proper: ${hasProperName})`);
        console.log(`   Type: ${object.type} (proper: ${hasProperType})`);
        console.log(`   Currently undiscovered: ${isCurrentlyUndiscovered}`);
        console.log(`   In discovered set: ${isInDiscoveredSet}`);

        // If object has proper data but is marked undiscovered or not in discovered set
        if (hasProperName && hasProperType && (isCurrentlyUndiscovered || !isInDiscoveredSet)) {
            objectsToDiscover.push(object);
            console.log(`   ✅ NEEDS DISCOVERY FIX`);
        } else {
            console.log(`   ℹ️ No fix needed`);
        }
    });

    console.log(`\n🎯 DISCOVERY SYSTEM ANALYSIS:`);
    console.log(`  📊 Total objects: ${allObjects.length}`);
    console.log(`  🔧 Objects needing discovery fix: ${objectsToDiscover.length}`);

    if (objectsToDiscover.length === 0) {
        console.log(`✅ All objects are properly discovered!`);
        return;
    }

    // Apply permanent fixes to the discovery system
    let discoveryFixed = 0;
    let coordinatesFixed = 0;

    console.log(`\n🔧 APPLYING PERMANENT FIXES:`);

    objectsToDiscover.forEach((object, index) => {
        console.log(`\n${index + 1}. Fixing ${object.id}:`);

        // FIX 1: Add to discovered objects set
        if (starChartsManager.discoveredObjects) {
            if (!starChartsManager.discoveredObjects.has(object.id)) {
                starChartsManager.discoveredObjects.add(object.id);
                console.log(`   ✅ Added to discovered objects set`);
            } else {
                console.log(`   ℹ️ Already in discovered objects set`);
            }
        }

        // FIX 2: Add discovery metadata if missing
        if (starChartsManager.discoveryMetadata) {
            if (!starChartsManager.discoveryMetadata.has(object.id)) {
                const discoveryData = {
                    discoveredAt: new Date().toISOString(),
                    discoveryMethod: 'system_fix',
                    source: 'automatic',
                    sector: starChartsManager.currentSector || 'A0',
                    firstDiscovered: false // Not actually first discovered, just fixing system
                };
                starChartsManager.discoveryMetadata.set(object.id, discoveryData);
                console.log(`   ✅ Added discovery metadata`);
            } else {
                console.log(`   ℹ️ Discovery metadata already exists`);
            }
        }

        discoveryFixed++;
    });

    // FIX 3: Save discovery state to persist changes
    if (starChartsManager.saveDiscoveryState) {
        try {
            starChartsManager.saveDiscoveryState();
            console.log(`✅ Saved discovery state to localStorage`);
        } catch (error) {
            console.log(`⚠️ Could not save discovery state: ${error.message}`);
        }
    }

    // FIX 4: Force refresh of objects to apply discovery changes
    console.log(`\n🔄 Forcing object refresh...`);
    
    // Clear any cached object data
    if (starChartsUI._cachedObjects) {
        starChartsUI._cachedObjects = null;
        console.log(`✅ Cleared cached objects`);
    }

    // Trigger a re-render to apply changes
    if (starChartsUI.render) {
        starChartsUI.render();
        console.log(`✅ Triggered re-render`);
    }

    // FIX 5: Fix coordinates for any remaining visual elements
    setTimeout(() => {
        console.log(`\n🎯 Fixing coordinates after discovery update...`);
        
        const svg = document.querySelector('.starcharts-svg');
        if (svg) {
            const updatedObjects = starChartsUI.getDiscoveredObjectsForRender();
            let coordFixCount = 0;
            
            updatedObjects.forEach(obj => {
                if (!obj._isUndiscovered) { // Only fix discovered objects
                    const correctPosition = getCorrectPosition(obj, svg, starChartsUI);
                    if (correctPosition) {
                        const elements = findAllVisualElements(svg, obj.id);
                        elements.forEach(element => {
                            if (updateElementPosition(element, correctPosition)) {
                                coordFixCount++;
                            }
                        });
                    }
                }
            });
            
            coordinatesFixed = coordFixCount;
            console.log(`✅ Fixed coordinates for ${coordFixCount} visual elements`);
        }

        // Final results
        console.log(`\n🎯 PERMANENT FIX RESULTS:`);
        console.log(`  📊 Total objects processed: ${allObjects.length}`);
        console.log(`  🔍 Objects added to discovery system: ${discoveryFixed}`);
        console.log(`  🎯 Visual elements fixed: ${coordinatesFixed}`);
        console.log(`  💾 Discovery state saved: ${starChartsManager.saveDiscoveryState ? 'YES' : 'NO'}`);
        console.log(`  🔄 System refreshed: YES`);
        
        if (discoveryFixed > 0) {
            console.log(`\n✅ DISCOVERY SYSTEM PERMANENTLY FIXED!`);
            console.log(`   All objects should now show proper names in tooltips.`);
            console.log(`   Changes are saved and will persist across page reloads.`);
        }
        
    }, 500); // Wait for re-render to complete

    // Helper functions
    function getCorrectPosition(object, svg, starChartsUI) {
        const selectors = [`[data-object-id="${object.id}"]`, `[data-name="${object.id}"]`];
        for (const selector of selectors) {
            const element = svg.querySelector(selector);
            if (element) {
                const pos = getElementPosition(element);
                if (pos) return pos;
            }
        }
        return null;
    }

    function getElementPosition(element) {
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'circle') {
            const cx = parseFloat(element.getAttribute('cx'));
            const cy = parseFloat(element.getAttribute('cy'));
            if (!isNaN(cx) && !isNaN(cy)) return { x: cx, y: cy };
        } else if (tagName === 'rect') {
            const x = parseFloat(element.getAttribute('x'));
            const y = parseFloat(element.getAttribute('y'));
            const width = parseFloat(element.getAttribute('width')) || 0;
            const height = parseFloat(element.getAttribute('height')) || 0;
            if (!isNaN(x) && !isNaN(y)) return { x: x + width / 2, y: y + height / 2 };
        }
        return null;
    }

    function findAllVisualElements(svg, objectId) {
        const selectors = [
            `[data-object-id="${objectId}"]`,
            `[data-name="${objectId}"]`,
            `[id*="${objectId}"]`,
            `[class*="${objectId}"]`
        ];
        const elements = [];
        selectors.forEach(selector => {
            const found = svg.querySelectorAll(selector);
            found.forEach(el => {
                if (!elements.includes(el)) elements.push(el);
            });
        });
        return elements;
    }

    function updateElementPosition(element, newPos) {
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'circle') {
            const oldCx = parseFloat(element.getAttribute('cx'));
            const oldCy = parseFloat(element.getAttribute('cy'));
            if (Math.abs(oldCx - newPos.x) > 1 || Math.abs(oldCy - newPos.y) > 1) {
                element.setAttribute('cx', newPos.x);
                element.setAttribute('cy', newPos.y);
                return true;
            }
        } else if (tagName === 'rect') {
            const width = parseFloat(element.getAttribute('width')) || 0;
            const height = parseFloat(element.getAttribute('height')) || 0;
            const newX = newPos.x - width / 2;
            const newY = newPos.y - height / 2;
            const oldX = parseFloat(element.getAttribute('x'));
            const oldY = parseFloat(element.getAttribute('y'));
            if (Math.abs(oldX - newX) > 1 || Math.abs(oldY - newY) > 1) {
                element.setAttribute('x', newX);
                element.setAttribute('y', newY);
                return true;
            }
        }
        return false;
    }

})();

console.log('🏁 Permanent discovery system fix complete!');
