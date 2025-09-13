// Debug script for Star Charts UI issues
// Run this in browser console to help debug the reported problems

console.log('🔧 STAR CHARTS DEBUG SCRIPT LOADED');
console.log('=====================================');

// Helper function to check if debug functions are available
function waitForDebugFunctions(callback, maxWait = 5000) {
    const startTime = Date.now();

    function check() {
        if (window.enableHitBoxDebug && window.hitBoxDebugStatus) {
            callback();
            return;
        }

        if (Date.now() - startTime > maxWait) {
            console.error('❌ Debug functions not found after', maxWait, 'ms. Make sure Star Charts are loaded.');
            console.log('💡 Try opening the Star Charts first (press C), then reload this debug script.');
            return;
        }

        setTimeout(check, 100);
    }

    check();
}

// Test function to verify the debug script is loaded and working
window.testDebugScript = function() {
    console.log('🧪 TESTING DEBUG SCRIPT...');
    console.log('✅ Debug script loaded successfully');
    console.log('✅ Available functions:', [
        'monitorShipPosition',
        'debugTooltips',
        'inspectSVGHitboxes',
        'checkEventListeners',
        'testZoomBehavior'
    ].filter(name => typeof window[name] === 'function'));

    console.log('⏳ Checking for game debug functions...');
    const gameFunctions = [
        'enableHitBoxDebug',
        'disableHitBoxDebug',
        'hitBoxDebugStatus',
        'toggleHitBoxDebug'
    ];

    const available = gameFunctions.filter(name => typeof window[name] === 'function');
    const unavailable = gameFunctions.filter(name => typeof window[name] !== 'function');

    if (available.length > 0) {
        console.log('✅ Game debug functions available:', available);
    }
    if (unavailable.length > 0) {
        console.log('⏳ Game debug functions not yet loaded:', unavailable);
        console.log('💡 These will be available once you open the Star Charts (press C)');
    }

    console.log('🎉 Debug script test complete!');
};

// 1. Enable hit box debugging to find the mysterious left panel hitbox (delayed)
waitForDebugFunctions(() => {
    console.log('🎯 Enabling hit box debug mode...');
    window.enableHitBoxDebug();
    window.hitBoxDebugStatus();
});

// 2. Function to monitor ship position changes
window.monitorShipPosition = function() {
    let lastPosition = null;
    let positionChanges = 0;

    const checkPosition = () => {
        const playerPos = window.starChartsManager?.getPlayerPosition();
        if (playerPos && JSON.stringify(playerPos) !== JSON.stringify(lastPosition)) {
            positionChanges++;
            console.log(`🚀 Ship position change #${positionChanges}:`, playerPos);
            lastPosition = [...playerPos];
        }
    };

    // Check every 100ms for 10 seconds
    const interval = setInterval(checkPosition, 100);
    setTimeout(() => {
        clearInterval(interval);
        console.log(`🚀 Ship position monitoring complete. Total changes: ${positionChanges}`);
    }, 10000);

    console.log('🚀 Started monitoring ship position for 10 seconds...');
};

// 3. Function to debug tooltip detection
window.debugTooltips = function() {
    const originalHandleMouseMove = window.starChartsUI?.handleMouseMove;
    if (!originalHandleMouseMove) {
        console.error('❌ Star Charts UI not found');
        return;
    }

    window.starChartsUI.handleMouseMove = function(event) {
        const rect = this.svg.getBoundingClientRect();
        const screenX = event.clientX - rect.left;
        const screenY = event.clientY - rect.top;

        console.log(`🖱️ Mouse at screen position: (${screenX}, ${screenY})`);

        const hoveredObject = this.getObjectAtScreenPosition(screenX, screenY, 8);
        if (hoveredObject) {
            console.log(`🎯 Object found:`, hoveredObject);
        } else {
            console.log(`❌ No object found at mouse position`);
        }

        // Call original function
        originalHandleMouseMove.call(this, event);
    };

    console.log('🖱️ Tooltip debugging enabled - move mouse over Star Charts to see detection details');
};

// 4. Function to inspect SVG elements for mysterious hitboxes
window.inspectSVGHitboxes = function() {
    // Try multiple selectors to find the Star Charts SVG
    let svg = document.querySelector('.starcharts-svg') ||
              document.querySelector('.scanner-map-container svg') ||
              document.querySelector('svg');

    if (!svg) {
        console.error('❌ Star Charts SVG not found');
        console.log('💡 Make sure Star Charts are open (press C)');
        return;
    }

    const allElements = svg.querySelectorAll('*');
    const hitboxElements = [];

    allElements.forEach(el => {
        const tag = el.tagName.toLowerCase();
        const className = el.className?.baseVal || el.className || '';

        // Look for elements that might be invisible hitboxes
        if (tag === 'rect' || tag === 'circle' || tag === 'polygon') {
            const fill = el.getAttribute('fill');
            const stroke = el.getAttribute('stroke');
            const opacity = el.getAttribute('opacity') || el.style.opacity;

            // Check if element is invisible or nearly invisible
            if (fill === 'transparent' || fill === 'none' || opacity === '0' ||
                (!fill && !stroke) || (fill === '#000000' && opacity === '0')) {

                const bbox = el.getBoundingClientRect();
                hitboxElements.push({
                    element: el,
                    tag,
                    className,
                    fill,
                    stroke,
                    opacity,
                    bbox: {
                        x: bbox.left,
                        y: bbox.top,
                        width: bbox.width,
                        height: bbox.height
                    }
                });
            }
        }
    });

    console.log(`🔍 Found ${hitboxElements.length} potential invisible hitbox elements:`);
    hitboxElements.forEach((item, index) => {
        console.log(`${index + 1}. ${item.tag}.${item.className} at (${item.bbox.x}, ${item.bbox.y}) ${item.bbox.width}x${item.bbox.height}`);
        console.log('   Element:', item.element);
    });

    return hitboxElements;
};

// 5. Function to check for event listeners on elements
window.checkEventListeners = function() {
    // Try multiple selectors to find the Star Charts SVG
    let svg = document.querySelector('.starcharts-svg') ||
              document.querySelector('.scanner-map-container svg') ||
              document.querySelector('svg');

    if (!svg) {
        console.error('❌ Star Charts SVG not found');
        console.log('💡 Make sure Star Charts are open (press C)');
        return;
    }

    // Check SVG for click listeners
    const svgListeners = getEventListeners(svg);
    console.log('🎧 SVG Event Listeners:', svgListeners);

    // Check all child elements for click listeners
    const allElements = svg.querySelectorAll('*');
    let elementsWithClick = 0;

    allElements.forEach(el => {
        const listeners = getEventListeners(el);
        if (listeners.click) {
            elementsWithClick++;
            const bbox = el.getBoundingClientRect();
            console.log(`🖱️ Click listener on ${el.tagName}.${el.className}:`, {
                element: el,
                position: { x: bbox.left, y: bbox.top, width: bbox.width, height: bbox.height },
                listeners: listeners.click
            });
        }
    });

    console.log(`📊 Total elements with click listeners: ${elementsWithClick}`);
};

// 6. Function to test zoom behavior
window.testZoomBehavior = function() {
    const ui = window.starChartsUI;
    if (!ui) {
        console.error('❌ Star Charts UI not found');
        return;
    }

    console.log('🔍 Testing zoom behavior...');
    console.log(`Current zoom level: ${ui.currentZoomLevel}`);
    console.log(`Max zoom level: ${ui.maxZoomLevel}`);

    // Test zoom in
    const originalZoom = ui.currentZoomLevel;
    ui.zoomIn();
    console.log(`After zoom in: ${ui.currentZoomLevel}`);

    // Test zoom out
    ui.zoomOut();
    console.log(`After zoom out: ${ui.currentZoomLevel}`);

    // Reset
    ui.currentZoomLevel = originalZoom;
    ui.render();
    console.log(`Reset to: ${ui.currentZoomLevel}`);
};

// 7. Function to debug object data for tooltips
window.debugObjectData = function() {
    console.log('🔍 DEBUGGING OBJECT DATA FOR TOOLTIPS...');

    // Star Charts UI is accessible through NavigationSystemManager
    const ui = window.navigationSystemManager?.starChartsUI;
    if (!ui) {
        console.error('❌ Star Charts UI not found - make sure Star Charts are open (press C)');
        console.log('💡 Available objects:', {
            navigationSystemManager: !!window.navigationSystemManager,
            starChartsManager: !!window.starChartsManager
        });
        return;
    }

    // Get objects from different sources
    const renderObjects = ui.getDiscoveredObjectsForRender();
    console.log(`📊 Found ${renderObjects.length} objects from getDiscoveredObjectsForRender()`);

    renderObjects.forEach((obj, index) => {
        console.log(`${index + 1}. ${obj.type}:`, {
            id: obj.id,
            name: obj.name,
            hasName: !!obj.name,
            _isUndiscovered: obj._isUndiscovered,
            _isShip: obj._isShip
        });

        // Test tooltip text generation
        let tooltipText;
        if (obj._isShip) {
            tooltipText = 'You are here';
        } else if (obj._isUndiscovered) {
            tooltipText = 'Unknown';
        } else {
            tooltipText = obj.name;
        }

        console.log(`   → Tooltip would show: "${tooltipText}"`);
    });

    // Test a few objects with getObjectData
    console.log('\n🔍 Comparing with getObjectData results:');
    renderObjects.slice(0, 3).forEach(obj => {
        if (obj.id) {
            const objectData = ui.starChartsManager.getObjectData(obj.id);
            console.log(`getObjectData(${obj.id}):`, {
                found: !!objectData,
                name: objectData?.name,
                hasName: !!objectData?.name
            });
        }
    });
};

// 8. Function to test tooltip detection manually
window.testTooltipDetection = function() {
    console.log('🧪 TESTING TOOLTIP DETECTION...');

    const ui = window.navigationSystemManager?.starChartsUI;
    if (!ui) {
        console.error('❌ Star Charts UI not found');
        return;
    }

    // Test with center of screen as a known position
    const svgRect = ui.svg.getBoundingClientRect();
    const centerX = svgRect.width / 2;
    const centerY = svgRect.height / 2;

    console.log('🎯 Testing tooltip detection at screen center:', { centerX, centerY });

    const testObject = ui.getObjectAtScreenPosition(centerX, centerY, 50); // Larger tolerance for testing
    console.log('🎯 Object found at center:', testObject ? {
        id: testObject.id,
        name: testObject.name,
        type: testObject.type
    } : 'none');

    if (testObject) {
        console.log('🎯 Testing tooltip display...');
        ui.showTooltip(centerX, centerY, testObject);
    } else {
        console.log('❌ No object found at center position');
    }
};

// 9. Function to monitor ship position changes in detail
window.monitorShipPositionDetail = function(duration = 10000) {
    console.log(`🚀 MONITORING SHIP POSITION CHANGES for ${duration/1000} seconds...`);

    const manager = window.starChartsManager;
    if (!manager) {
        console.error('❌ Star Charts Manager not found');
        return;
    }

    let lastPosition = null;
    let changeCount = 0;
    const positions = [];
    const startTime = Date.now();

    const checkPosition = () => {
        try {
            const pos = manager.getPlayerPosition();
            if (pos) {
                const posKey = JSON.stringify(pos);
                positions.push({ time: Date.now() - startTime, position: pos });

                if (lastPosition !== posKey) {
                    changeCount++;
                    const delta = lastPosition ? {
                        x: pos[0] - JSON.parse(lastPosition)[0],
                        y: pos[1] - JSON.parse(lastPosition)[1],
                        z: pos[2] - JSON.parse(lastPosition)[2]
                    } : null;

                    console.log(`🚀 Position change #${changeCount} at ${Date.now() - startTime}ms:`, pos, delta ? `Δ: ${delta.x.toFixed(2)}, ${delta.y.toFixed(2)}, ${delta.z.toFixed(2)}` : '');
                    lastPosition = posKey;
                }
            }
        } catch (error) {
            console.error('❌ Error getting ship position:', error);
        }
    };

    // Check position every 100ms
    const interval = setInterval(checkPosition, 100);

    // Stop monitoring after duration
    setTimeout(() => {
        clearInterval(interval);
        console.log(`🚀 Ship position monitoring complete:`);
        console.log(`   - Total position changes: ${changeCount}`);
        console.log(`   - Total samples: ${positions.length}`);
        console.log(`   - Average change frequency: ${(changeCount / (duration/1000)).toFixed(2)} changes/second`);

        if (positions.length > 0) {
            const first = positions[0].position;
            const last = positions[positions.length - 1].position;
            const totalDelta = {
                x: last[0] - first[0],
                y: last[1] - first[1],
                z: last[2] - first[2]
            };
            console.log(`   - Total movement: Δx=${totalDelta.x.toFixed(2)}, Δy=${totalDelta.y.toFixed(2)}, Δz=${totalDelta.z.toFixed(2)}`);
            console.log(`   - Distance traveled: ${Math.sqrt(totalDelta.x**2 + totalDelta.y**2 + totalDelta.z**2).toFixed(2)} units`);
        }
    }, duration);

    console.log('🚀 Started detailed ship position monitoring...');
};

// Available commands
console.log('\n🎮 AVAILABLE DEBUG COMMANDS:');
console.log('==========================');
console.log('• testDebugScript() - Test if debug script loaded correctly');
console.log('• monitorShipPosition() - Monitor ship position changes for 10 seconds');
console.log('• monitorShipPositionDetail() - Detailed ship position monitoring with deltas');
console.log('• debugTooltips() - Enable detailed tooltip detection logging');
console.log('• inspectSVGHitboxes() - Find invisible hitbox elements');
console.log('• checkEventListeners() - List all event listeners on SVG elements');
console.log('• testZoomBehavior() - Test zoom in/out functionality');
console.log('• debugObjectData() - Debug what data objects have for tooltips');
console.log('• testTooltipDetection() - Test tooltip detection at screen center');
console.log('• toggleHitBoxDebug() - Toggle hit box visibility');
console.log('• hitBoxDebugStatus() - Check hit box debug status');
console.log('• refreshStarCharts() - Force refresh Star Charts view');

console.log('\n🚀 QUICK START:');
console.log('==============');
console.log('1. enableHitBoxDebug() // Enable hit box debugging');
console.log('2. inspectSVGHitboxes() // Find the mysterious left panel hitbox');
console.log('3. monitorShipPositionDetail() // Monitor why ship position changes');
console.log('4. testTooltipDetection() // Test if tooltips work at all');

console.log('\n💡 IMPORTANT: Make sure Star Charts are loaded before running debug commands!');
console.log('   Press C to open the Star Charts in the game first, then run the debug commands.');
