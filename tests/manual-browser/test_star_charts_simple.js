// Simple Star Charts UX Parity Test
// Copy and paste this into the browser console

(function() {
    console.log('🗺️ STAR CHARTS UX PARITY TEST');
    console.log('==============================\n');
    
    // Check system availability
    console.log('📍 System Status Check:');
    const hasViewManager = !!window.viewManager;
    const hasNavSystem = !!window.viewManager?.navigationSystemManager;
    const hasLRS = !!window.viewManager?.navigationSystemManager?.longRangeScanner;
    const hasStarCharts = !!window.viewManager?.navigationSystemManager?.starChartsUI;
    
    console.log('- ViewManager:', hasViewManager ? '✅' : '❌');
    console.log('- NavigationSystemManager:', hasNavSystem ? '✅' : '❌');
    console.log('- Long Range Scanner:', hasLRS ? '✅' : '❌');
    console.log('- Star Charts UI:', hasStarCharts ? '✅' : '❌');
    
    if (!hasViewManager || !hasNavSystem || !hasLRS || !hasStarCharts) {
        console.log('\n❌ Systems not ready. Wait for game to fully load.');
        return;
    }
    
    console.log('\n✅ All systems ready for testing!');
    
    // Get references
    const lrs = window.viewManager.navigationSystemManager.longRangeScanner;
    const starCharts = window.viewManager.navigationSystemManager.starChartsUI;
    
    console.log('\n🧪 System Properties Check:');
    console.log('- LRS zoom levels:', lrs.zoomLevels || 'Not found');
    console.log('- Star Charts zoom level:', starCharts.currentZoomLevel || 'Not found');
    console.log('- Star Charts center:', starCharts.currentCenter || 'Not found');
    
    // Test objects availability
    console.log('\n🌍 Test Objects Check:');
    if (window.solarSystemManager && window.solarSystemManager.celestialBodies.length > 0) {
        const testObject = window.solarSystemManager.celestialBodies[0];
        console.log(`- Test object: ${testObject.name} at (${testObject.x}, ${testObject.y})`);
        console.log('✅ Objects available for testing');
    } else {
        console.log('⚠️ No celestial bodies found');
    }
    
    console.log('\n📋 MANUAL TESTING INSTRUCTIONS:');
    console.log('================================');
    console.log('');
    console.log('🔄 CORE PARITY TEST:');
    console.log('1. Press L → Opens Long Range Scanner');
    console.log('2. Click any planet 3 times → Watch zoom: 1x→2x→3x');
    console.log('3. Note how object centers in view');
    console.log('4. Press L → Closes LRS');
    console.log('5. Press C → Opens Star Charts');
    console.log('6. Click same planet 3 times → Should behave IDENTICALLY');
    console.log('');
    console.log('✅ SUCCESS: Both systems zoom and center the same way');
    console.log('❌ FAILURE: Different zoom progression or centering');
    console.log('');
    console.log('🎯 KEYBOARD SHORTCUTS TO TEST:');
    console.log('- L: Toggle Long Range Scanner');
    console.log('- C: Toggle Star Charts');
    console.log('- G: Galactic Chart');
    console.log('- B: Beacon ring view (0.4x zoom)');
    console.log('- Double-click: Same as B key');
    console.log('');
    console.log('🔍 WHAT TO COMPARE:');
    console.log('- Zoom progression (should be identical)');
    console.log('- Object centering (should position same way)');
    console.log('- Visual feedback (highlighting, selection)');
    console.log('- Keyboard response (same shortcuts work)');
    console.log('');
    console.log('🚨 REPORT ANY DIFFERENCES YOU FIND!');
    console.log('');
    console.log('💡 TIP: Open browser console (F12) to see zoom level logs');
    console.log('    Look for messages like "zoom=2" to track progression');
    
})();
