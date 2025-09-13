// Test script to verify tooltip fix
// Run this in browser console after opening Star Charts

(function() {
    console.log('🧪 TESTING TOOLTIP FIX...');

    const ui = window.navigationSystemManager?.starChartsUI;
    if (!ui) {
        console.error('❌ Star Charts UI not found - make sure Star Charts are open (press C)');
        return;
    }

    console.log('✅ Found Star Charts UI');

    // Test 1: Check that objects have complete data without clicking
    const renderObjects = ui.getDiscoveredObjectsForRender();
    console.log(`📊 Found ${renderObjects.length} objects from getDiscoveredObjectsForRender()`);

    if (renderObjects.length > 0) {
        const testObject = renderObjects[0];
        console.log('🎯 Testing first object:', {
            id: testObject.id,
            name: testObject.name,
            type: testObject.type,
            hasName: !!testObject.name
        });

        // Test 2: Simulate tooltip detection (this is what handleMouseMove does)
        const svgRect = ui.svg.getBoundingClientRect();
        const centerX = svgRect.width / 2;
        const centerY = svgRect.height / 2;

        console.log(`🎯 Testing tooltip detection at screen center: (${centerX}, ${centerY})`);

        const hoveredObject = ui.getObjectAtScreenPosition(centerX, centerY, 50); // Large tolerance for testing

        if (hoveredObject) {
            console.log('✅ Object found at center:', {
                id: hoveredObject.id,
                name: hoveredObject.name,
                type: hoveredObject.type,
                _isShip: hoveredObject._isShip,
                _isUndiscovered: hoveredObject._isUndiscovered
            });

            // Test 3: Test tooltip text generation
            let tooltipText;
            if (hoveredObject._isShip) {
                tooltipText = 'You are here';
            } else if (hoveredObject._isUndiscovered) {
                tooltipText = 'Unknown';
            } else {
                tooltipText = hoveredObject.name;
            }

            console.log('🎯 Tooltip would show:', tooltipText);

            if (tooltipText && tooltipText !== 'Unknown') {
                console.log('✅ SUCCESS: Tooltip has meaningful data without clicking first!');
            } else {
                console.log('⚠️  WARNING: Tooltip shows generic data');
            }
        } else {
            console.log('❌ No object found at center position');
        }
    } else {
        console.log('❌ No objects found to test');
    }

    console.log('🧪 Tooltip fix test complete');
})();
