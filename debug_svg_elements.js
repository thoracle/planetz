// Debug actual SVG elements to understand their structure and attributes
console.log('🔍 ANALYZING ACTUAL SVG ELEMENTS');

(function() {
    const svg = document.querySelector('.starcharts-svg');
    if (!svg) {
        console.log('❌ No SVG found');
        return;
    }
    
    console.log('✅ SVG found, analyzing all child elements...');
    
    // Get all SVG child elements
    const allElements = svg.querySelectorAll('*');
    console.log(`📊 Total SVG elements: ${allElements.length}`);
    
    // Analyze element types and attributes
    const elementAnalysis = {};
    const attributeAnalysis = {};
    
    allElements.forEach((element, index) => {
        const tagName = element.tagName;
        
        // Count element types
        if (!elementAnalysis[tagName]) {
            elementAnalysis[tagName] = 0;
        }
        elementAnalysis[tagName]++;
        
        // Analyze attributes
        const attributes = element.getAttributeNames();
        attributes.forEach(attr => {
            if (!attributeAnalysis[attr]) {
                attributeAnalysis[attr] = 0;
            }
            attributeAnalysis[attr]++;
        });
        
        // Log first few elements of each type for inspection
        if (elementAnalysis[tagName] <= 3) {
            console.log(`${index + 1}. <${tagName}> attributes:`, 
                attributes.map(attr => `${attr}="${element.getAttribute(attr)}"`).join(', '));
        }
    });
    
    console.log('\n📊 ELEMENT TYPE SUMMARY:');
    Object.keys(elementAnalysis).forEach(type => {
        console.log(`  ${type}: ${elementAnalysis[type]} elements`);
    });
    
    console.log('\n📊 ATTRIBUTE USAGE:');
    Object.keys(attributeAnalysis).forEach(attr => {
        console.log(`  ${attr}: used ${attributeAnalysis[attr]} times`);
    });
    
    // Look for potential object identifiers
    console.log('\n🔍 SEARCHING FOR OBJECT IDENTIFIERS:');
    
    const potentialIdentifiers = [];
    allElements.forEach(element => {
        const attrs = element.getAttributeNames();
        attrs.forEach(attr => {
            const value = element.getAttribute(attr);
            if (value && (value.includes('A0_') || value.includes('star') || value.includes('station'))) {
                potentialIdentifiers.push({
                    element: element.tagName,
                    attribute: attr,
                    value: value,
                    position: element.tagName === 'circle' ? 
                        `(${element.getAttribute('cx')}, ${element.getAttribute('cy')})` :
                        element.tagName === 'rect' ?
                        `(${element.getAttribute('x')}, ${element.getAttribute('y')})` :
                        'unknown'
                });
            }
        });
    });
    
    console.log(`Found ${potentialIdentifiers.length} potential object identifiers:`);
    potentialIdentifiers.forEach((item, index) => {
        console.log(`  ${index + 1}. <${item.element}> ${item.attribute}="${item.value}" at ${item.position}`);
    });
    
    // Test our current selectors against actual objects
    console.log('\n🧪 TESTING CURRENT SELECTORS:');
    
    if (window.navigationSystemManager?.starChartsUI) {
        const starChartsUI = window.navigationSystemManager.starChartsUI;
        const allObjects = starChartsUI.getDiscoveredObjectsForRender();
        
        console.log(`Testing selectors for ${allObjects.length} objects:`);
        
        let foundCount = 0;
        let notFoundCount = 0;
        
        allObjects.slice(0, 10).forEach((object, index) => { // Test first 10 objects
            const selectors = [
                `[data-object-id="${object.id}"]`,
                `[data-name="${object.id}"]`,
                `[id*="${object.id}"]`,
                `[class*="${object.id}"]`,
                `[data-id="${object.id}"]`
            ];
            
            let found = false;
            let foundWith = '';
            
            for (const selector of selectors) {
                const element = svg.querySelector(selector);
                if (element) {
                    found = true;
                    foundWith = selector;
                    foundCount++;
                    break;
                }
            }
            
            if (!found) {
                notFoundCount++;
            }
            
            console.log(`  ${index + 1}. ${object.id}: ${found ? `✅ Found with ${foundWith}` : '❌ Not found'}`);
        });
        
        console.log(`\n📊 SELECTOR TEST RESULTS:`);
        console.log(`  ✅ Found: ${foundCount}`);
        console.log(`  ❌ Not found: ${notFoundCount}`);
        
        if (notFoundCount > 0) {
            console.log('\n🔍 ALTERNATIVE SEARCH STRATEGIES:');
            
            // Try to find elements by proximity to calculated positions
            allObjects.slice(0, 5).forEach((object, index) => {
                console.log(`\n🎯 Analyzing ${object.id}:`);
                
                // Get calculated position
                const originalWorldToScreen = function(obj) {
                    const pos = starChartsUI.getDisplayPosition(obj);
                    if (!pos) return null;
                    
                    const rect = svg.getBoundingClientRect();
                    const svgWidth = rect.width;
                    const svgHeight = rect.height;
                    const worldSize = starChartsUI.getWorldSize();
                    
                    const screenX = ((pos.x - starChartsUI.currentCenter.x) / worldSize + 0.5) * svgWidth;
                    const screenY = ((pos.y - starChartsUI.currentCenter.y) / worldSize + 0.5) * svgHeight;
                    
                    return { x: screenX, y: screenY };
                };
                
                const calcPos = originalWorldToScreen(object);
                console.log(`  Calculated position: ${calcPos ? `(${calcPos.x.toFixed(1)}, ${calcPos.y.toFixed(1)})` : 'null'}`);
                
                if (calcPos) {
                    // Find nearby elements
                    const tolerance = 50; // 50 pixel search radius
                    const nearbyElements = [];
                    
                    ['circle', 'rect', 'g'].forEach(tagName => {
                        const elements = svg.querySelectorAll(tagName);
                        elements.forEach(el => {
                            let elX, elY;
                            
                            if (tagName === 'circle') {
                                elX = parseFloat(el.getAttribute('cx'));
                                elY = parseFloat(el.getAttribute('cy'));
                            } else if (tagName === 'rect') {
                                elX = parseFloat(el.getAttribute('x')) + parseFloat(el.getAttribute('width')) / 2;
                                elY = parseFloat(el.getAttribute('y')) + parseFloat(el.getAttribute('height')) / 2;
                            } else if (tagName === 'g') {
                                // Skip groups for now
                                return;
                            }
                            
                            if (!isNaN(elX) && !isNaN(elY)) {
                                const distance = Math.sqrt((elX - calcPos.x) ** 2 + (elY - calcPos.y) ** 2);
                                if (distance <= tolerance) {
                                    nearbyElements.push({
                                        element: el,
                                        tagName: tagName,
                                        position: `(${elX.toFixed(1)}, ${elY.toFixed(1)})`,
                                        distance: distance.toFixed(1),
                                        attributes: el.getAttributeNames().map(attr => `${attr}="${el.getAttribute(attr)}"`).join(', ')
                                    });
                                }
                            }
                        });
                    });
                    
                    console.log(`  Found ${nearbyElements.length} nearby elements:`);
                    nearbyElements.forEach((item, i) => {
                        console.log(`    ${i + 1}. <${item.tagName}> at ${item.position} (${item.distance}px away)`);
                        console.log(`       ${item.attributes}`);
                    });
                }
            });
        }
    }
    
})();

console.log('\n🏁 SVG element analysis complete!');
