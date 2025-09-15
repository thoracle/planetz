// Comprehensive fix for both tooltip "Unknown" issue and coordinate misalignment
console.log('🔧 COMPREHENSIVE TOOLTIP & COORDINATE FIX - v4.0');

(function() {
    const svg = document.querySelector('.starcharts-svg');
    if (!svg) {
        console.log('❌ No SVG found');
        return;
    }

    if (!window.navigationSystemManager?.starChartsUI) {
        console.log('❌ Star Charts UI not available');
        return;
    }

    const starChartsUI = window.navigationSystemManager.starChartsUI;
    const allObjects = starChartsUI.getDiscoveredObjectsForRender();
    
    console.log(`🎯 Processing ${allObjects.length} objects for tooltip and coordinate fixes...`);

    let tooltipFixed = 0;
    let coordinatesFixed = 0;
    let totalElements = 0;

    allObjects.forEach((object, index) => {
        console.log(`\n🔍 ${index + 1}. Processing ${object.id}:`);
        console.log(`   Name: "${object.name}"`);
        console.log(`   Type: ${object.type}`);
        console.log(`   _isUndiscovered: ${object._isUndiscovered}`);
        console.log(`   hasName: ${object.hasName}`);

        // FIX 1: TOOLTIP DISCOVERY STATUS
        let tooltipFixApplied = false;
        
        // If object has a proper name and type, it should NOT be undiscovered
        if (object.name && object.name !== 'Unknown' && object.name !== 'undefined' && 
            object.type && object.type !== 'Unknown' && object._isUndiscovered) {
            
            console.log(`   🔧 FIXING: Object has name "${object.name}" but marked as undiscovered`);
            object._isUndiscovered = false;
            tooltipFixApplied = true;
            tooltipFixed++;
        }

        // Also check if object is in discovered objects list but marked as undiscovered
        if (object._isUndiscovered && starChartsUI.discoveredObjects && starChartsUI.discoveredObjects.has(object.id)) {
            console.log(`   🔧 FIXING: Object in discovered list but marked as undiscovered`);
            object._isUndiscovered = false;
            tooltipFixApplied = true;
            tooltipFixed++;
        }

        // FIX 2: COORDINATE ALIGNMENT
        const correctPosition = getCorrectPosition(object, svg, starChartsUI);
        
        if (!correctPosition) {
            console.log(`   ⚠️ No correct position found for coordinate fix`);
        } else {
            // Find ALL visual elements for this object
            const allSelectors = [
                `[data-object-id="${object.id}"]`,
                `[data-name="${object.id}"]`,
                `[id*="${object.id}"]`,
                `[class*="${object.id}"]`,
                `[data-id="${object.id}"]`
            ];

            let elementsFound = [];
            
            // Collect all matching elements
            allSelectors.forEach(selector => {
                const elements = svg.querySelectorAll(selector);
                elements.forEach(el => {
                    if (!elementsFound.includes(el)) {
                        elementsFound.push(el);
                    }
                });
            });

            // Also find nearby debug circles (they might not have object IDs)
            const debugCircles = findNearbyDebugCircles(svg, correctPosition, 100);
            debugCircles.forEach(circle => {
                if (!elementsFound.includes(circle)) {
                    elementsFound.push(circle);
                }
            });

            if (elementsFound.length > 0) {
                // Update ALL elements to the correct position
                let fixedCount = 0;
                elementsFound.forEach(element => {
                    const wasFixed = updateElementPosition(element, correctPosition);
                    if (wasFixed) {
                        fixedCount++;
                    }
                });

                coordinatesFixed += fixedCount;
                totalElements += elementsFound.length;
                
                console.log(`   ✅ Coordinates: Fixed ${fixedCount}/${elementsFound.length} elements at (${correctPosition.x.toFixed(1)}, ${correctPosition.y.toFixed(1)})`);
            } else {
                console.log(`   ❌ No visual elements found for coordinate fix`);
            }
        }

        if (tooltipFixApplied) {
            console.log(`   ✅ Tooltip: Fixed discovery status`);
        } else {
            console.log(`   ℹ️ Tooltip: No fix needed`);
        }
    });

    console.log(`\n🎯 COMPREHENSIVE FIX RESULTS:`);
    console.log(`  📊 Total objects processed: ${allObjects.length}`);
    console.log(`  🏷️ Tooltip fixes applied: ${tooltipFixed}`);
    console.log(`  🎯 Coordinate elements fixed: ${coordinatesFixed}/${totalElements}`);
    console.log(`  📈 Overall success rate: ${(((tooltipFixed + coordinatesFixed) / (allObjects.length + totalElements)) * 100).toFixed(1)}%`);

    // Force a tooltip refresh by clearing any cached tooltip state
    if (starChartsUI.tooltip) {
        starChartsUI.tooltip.style.display = 'none';
        console.log(`✅ Cleared tooltip cache`);
    }

    // Helper Functions
    function getCorrectPosition(object, svg, starChartsUI) {
        // Try to find an existing visual element with correct coordinates
        const selectors = [
            `[data-object-id="${object.id}"]`,
            `[data-name="${object.id}"]`
        ];

        for (const selector of selectors) {
            const element = svg.querySelector(selector);
            if (element) {
                const pos = getElementPosition(element);
                if (pos) {
                    return pos;
                }
            }
        }

        // Fallback: calculate from world coordinates
        const pos = starChartsUI.getDisplayPosition(object);
        if (!pos) return null;

        const rect = svg.getBoundingClientRect();
        const svgWidth = rect.width;
        const svgHeight = rect.height;
        const worldSize = starChartsUI.getWorldSize();

        const screenX = ((pos.x - starChartsUI.currentCenter.x) / worldSize + 0.5) * svgWidth;
        const screenY = ((pos.y - starChartsUI.currentCenter.y) / worldSize + 0.5) * svgHeight;

        return { x: screenX, y: screenY };
    }

    function getElementPosition(element) {
        const tagName = element.tagName.toLowerCase();
        
        if (tagName === 'circle') {
            const cx = parseFloat(element.getAttribute('cx'));
            const cy = parseFloat(element.getAttribute('cy'));
            if (!isNaN(cx) && !isNaN(cy)) {
                return { x: cx, y: cy };
            }
        } else if (tagName === 'rect') {
            const x = parseFloat(element.getAttribute('x'));
            const y = parseFloat(element.getAttribute('y'));
            const width = parseFloat(element.getAttribute('width')) || 0;
            const height = parseFloat(element.getAttribute('height')) || 0;
            if (!isNaN(x) && !isNaN(y)) {
                return { x: x + width / 2, y: y + height / 2 };
            }
        }
        
        return null;
    }

    function findNearbyDebugCircles(svg, targetPos, tolerance) {
        const debugCircles = svg.querySelectorAll('circle.hitbox-debug');
        const nearby = [];
        
        debugCircles.forEach(circle => {
            const cx = parseFloat(circle.getAttribute('cx'));
            const cy = parseFloat(circle.getAttribute('cy'));
            
            if (!isNaN(cx) && !isNaN(cy)) {
                const distance = Math.sqrt((cx - targetPos.x) ** 2 + (cy - targetPos.y) ** 2);
                if (distance <= tolerance) {
                    nearby.push(circle);
                }
            }
        });
        
        return nearby;
    }

    function updateElementPosition(element, newPos) {
        const tagName = element.tagName.toLowerCase();
        let updated = false;
        
        if (tagName === 'circle') {
            const oldCx = parseFloat(element.getAttribute('cx'));
            const oldCy = parseFloat(element.getAttribute('cy'));
            
            if (Math.abs(oldCx - newPos.x) > 1 || Math.abs(oldCy - newPos.y) > 1) {
                element.setAttribute('cx', newPos.x);
                element.setAttribute('cy', newPos.y);
                updated = true;
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
                updated = true;
            }
        } else if (tagName === 'text') {
            const oldX = parseFloat(element.getAttribute('x'));
            const oldY = parseFloat(element.getAttribute('y'));
            
            if (Math.abs(oldX - newPos.x) > 1 || Math.abs(oldY - newPos.y) > 1) {
                element.setAttribute('x', newPos.x);
                element.setAttribute('y', newPos.y);
                updated = true;
            }
        }
        
        return updated;
    }

})();

console.log('🏁 Comprehensive tooltip and coordinate fix complete!');
