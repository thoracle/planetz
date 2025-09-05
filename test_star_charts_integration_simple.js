// Star Charts Integration Test - Simple Version
// Copy and paste this entire script into the browser console

(function() {
    console.log('🧪 Starting Star Charts Integration Test...');
    
    let passed = 0;
    let failed = 0;
    
    function test(name, condition, message) {
        if (condition) {
            console.log(`✅ ${name}: ${message || 'PASS'}`);
            passed++;
        } else {
            console.log(`❌ ${name}: ${message || 'FAIL'}`);
            failed++;
        }
    }
    
    // Test 1: ViewManager
    console.log('\n🔍 Test 1: ViewManager');
    test('ViewManager exists', typeof window.viewManager !== 'undefined', 'ViewManager found');
    
    if (window.viewManager) {
        test('Managers ready', window.viewManager.areManagersReady && window.viewManager.areManagersReady(), 'All managers initialized');
        test('StarfieldManager', !!window.viewManager.starfieldManager, 'StarfieldManager available');
        test('SolarSystemManager', !!window.viewManager.solarSystemManager, 'SolarSystemManager available');
    }
    
    // Test 2: NavigationSystemManager
    console.log('\n🔍 Test 2: NavigationSystemManager');
    
    let navManager = window.navigationSystemManager;
    if (!navManager && window.viewManager) {
        navManager = window.viewManager.navigationSystemManager;
        if (navManager) {
            window.navigationSystemManager = navManager;
            console.log('📌 Exposed NavigationSystemManager globally');
        }
    }
    
    test('NavigationSystemManager exists', !!navManager, 'NavigationSystemManager found');
    
    if (navManager) {
        try {
            const status = navManager.getSystemStatus();
            test('System status', !!status, 'Can get system status');
            test('Star Charts available', status.starChartsAvailable, 'Star Charts system ready');
            test('LRS available', status.longRangeScannerAvailable, 'Long Range Scanner ready');
            console.log('📊 Active system:', status.activeSystem);
        } catch (e) {
            test('System status error', false, e.message);
        }
    }
    
    // Test 3: Star Charts Manager
    console.log('\n🔍 Test 3: Star Charts Manager');
    
    const starChartsManager = navManager?.starChartsManager;
    test('StarChartsManager exists', !!starChartsManager, 'StarChartsManager found');
    
    if (starChartsManager) {
        test('StarCharts enabled', starChartsManager.isEnabled(), 'StarChartsManager is enabled');
        
        try {
            const metrics = starChartsManager.getPerformanceMetrics();
            test('Performance metrics', !!metrics, 'Can get performance metrics');
            test('Discovery performance', metrics.averageDiscoveryCheckTime < 10, `Avg discovery time: ${metrics.averageDiscoveryCheckTime.toFixed(2)}ms`);
        } catch (e) {
            test('Performance metrics error', false, e.message);
        }
        
        test('Object database', !!starChartsManager.objectDatabase, 'Object database loaded');
        
        if (starChartsManager.objectDatabase) {
            const sectors = starChartsManager.objectDatabase.sectors;
            test('Sectors loaded', !!sectors && Object.keys(sectors).length > 0, `${Object.keys(sectors || {}).length} sectors`);
            test('A0 sector', !!sectors?.A0, 'A0 sector data available');
        }
    }
    
    // Test 4: Star Charts UI
    console.log('\n🔍 Test 4: Star Charts UI');
    
    const starChartsUI = navManager?.starChartsUI;
    test('StarChartsUI exists', !!starChartsUI, 'StarChartsUI found');
    
    if (starChartsUI) {
        test('UI visibility check', typeof starChartsUI.isVisible === 'function', 'Can check visibility');
        console.log('ℹ️ StarChartsUI currently visible:', starChartsUI.isVisible());
    }
    
    // Test 5: Key Bindings Test
    console.log('\n🔍 Test 5: Key Bindings');
    console.log('💡 Press C key to test Star Charts');
    console.log('💡 Press L key to test Long Range Scanner');
    
    // Test 6: Discovery System
    console.log('\n🔍 Test 6: Discovery System');
    
    if (starChartsManager) {
        const discovered = starChartsManager.getDiscoveredObjects();
        test('Discovery system', Array.isArray(discovered), `${discovered?.length || 0} objects discovered`);
        
        const currentSector = starChartsManager.getCurrentSector();
        test('Current sector', !!currentSector, `Current sector: ${currentSector}`);
    }
    
    // Results
    console.log('\n📊 Integration Test Results:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${passed + failed}`);
    
    if (failed === 0) {
        console.log('\n🎉 All integration tests passed! Star Charts is properly integrated.');
        console.log('\n💡 To enable test mode (auto-discover all objects):');
        console.log('localStorage.setItem("star_charts_test_discover_all", "true");');
        console.log('Then reload the page.');
    } else {
        console.log('\n⚠️ Some integration tests failed. Check the errors above.');
        
        if (!window.viewManager) {
            console.log('💡 Make sure the game is fully loaded before running tests.');
        }
        
        if (!navManager) {
            console.log('💡 NavigationSystemManager may not be initialized yet. Try running the test again in a few seconds.');
        }
    }
    
    // Enable test mode helper
    window.enableStarChartsTestMode = function() {
        localStorage.setItem('star_charts_test_discover_all', 'true');
        console.log('✅ Test mode enabled. Reload the page to auto-discover all objects.');
    };
    
    console.log('\n💡 Run enableStarChartsTestMode() to enable test mode, then reload.');
    
})();
