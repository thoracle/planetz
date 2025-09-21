/**
 * Star Charts Integration Test Script
 * 
 * Run this in the browser console to verify Star Charts integration
 * 
 * Usage:
 * 1. Open the game in browser
 * 2. Open Developer Tools (F12)
 * 3. Copy and paste this entire script into the console
 * 4. Press Enter to run
 */

console.log('🧪 Starting Star Charts Integration Test...');

// Test 1: Check ViewManager availability
function testViewManager() {
    console.log('\n🔍 Test 1: ViewManager Availability');
    
    if (typeof window.viewManager === 'undefined') {
        console.error('❌ ViewManager not found');
        return false;
    }
    
    console.log('✅ ViewManager found');
    
    // Check if managers are ready
    if (typeof window.viewManager.areManagersReady === 'function') {
        const ready = window.viewManager.areManagersReady();
        if (ready) {
            console.log('✅ ViewManager managers are ready');
        } else {
            console.warn('⚠️ ViewManager managers not ready yet');
        }
    }
    
    return true;
}

// Test 2: Check NavigationSystemManager integration
function testNavigationSystemManager() {
    console.log('\n🔍 Test 2: NavigationSystemManager Integration');
    
    if (typeof window.navigationSystemManager === 'undefined') {
        console.error('❌ NavigationSystemManager not found globally');
        
        // Check if it's in ViewManager
        if (window.viewManager && window.viewManager.navigationSystemManager) {
            console.log('✅ NavigationSystemManager found in ViewManager');
            window.navigationSystemManager = window.viewManager.navigationSystemManager;
            console.log('✅ Exposed NavigationSystemManager globally');
        } else {
            console.error('❌ NavigationSystemManager not found in ViewManager either');
            return false;
        }
    } else {
        console.log('✅ NavigationSystemManager found globally');
    }
    
    // Test system status
    try {
        const status = window.navigationSystemManager.getSystemStatus();
        console.log('📊 System Status:', status);
        
        if (status.starChartsAvailable) {
            console.log('✅ Star Charts system available');
        } else {
            console.warn('⚠️ Star Charts system not available');
        }
        
        if (status.longRangeScannerAvailable) {
            console.log('✅ Long Range Scanner available');
        } else {
            console.error('❌ Long Range Scanner not available');
        }
        
    } catch (error) {
        console.error('❌ Error getting system status:', error);
        return false;
    }
    
    return true;
}

// Test 3: Check Star Charts Manager
function testStarChartsManager() {
    console.log('\n🔍 Test 3: Star Charts Manager');
    
    if (!window.navigationSystemManager) {
        console.error('❌ NavigationSystemManager not available');
        return false;
    }
    
    const starChartsManager = window.navigationSystemManager.starChartsManager;
    if (!starChartsManager) {
        console.error('❌ StarChartsManager not found');
        return false;
    }
    
    console.log('✅ StarChartsManager found');
    
    // Test if enabled
    if (starChartsManager.isEnabled()) {
        console.log('✅ StarChartsManager is enabled');
    } else {
        console.warn('⚠️ StarChartsManager is disabled');
    }
    
    // Test performance metrics
    try {
        const metrics = starChartsManager.getPerformanceMetrics();
        console.log('📊 Performance Metrics:', metrics);
        
        if (metrics.averageDiscoveryCheckTime < 5) {
            console.log('✅ Discovery check performance good (<5ms)');
        } else {
            console.warn('⚠️ Discovery check performance slow (>5ms)');
        }
        
    } catch (error) {
        console.error('❌ Error getting performance metrics:', error);
    }
    
    return true;
}

// Test 4: Check Star Charts UI
function testStarChartsUI() {
    console.log('\n🔍 Test 4: Star Charts UI');
    
    if (!window.navigationSystemManager) {
        console.error('❌ NavigationSystemManager not available');
        return false;
    }
    
    const starChartsUI = window.navigationSystemManager.starChartsUI;
    if (!starChartsUI) {
        console.error('❌ StarChartsUI not found');
        return false;
    }
    
    console.log('✅ StarChartsUI found');
    
    // Test if visible
    if (starChartsUI.isVisible()) {
        console.log('ℹ️ StarChartsUI is currently visible');
    } else {
        console.log('ℹ️ StarChartsUI is currently hidden');
    }
    
    return true;
}

// Test 5: Check key bindings
function testKeyBindings() {
    console.log('\n🔍 Test 5: Key Bindings');
    
    console.log('🔑 Testing C key for Star Charts...');
    console.log('💡 Press C key to test Star Charts opening');
    
    console.log('🔑 Testing L key for Long Range Scanner...');
    console.log('💡 Press L key to test LRS opening');
    
    // Add event listener to test key presses
    const keyListener = (event) => {
        const key = event.key.toLowerCase();
        if (key === 'c') {
            console.log('🔑 C key detected - Star Charts should open/close');
        } else if (key === 'l') {
            console.log('🔑 L key detected - Long Range Scanner should open/close');
        }
    };
    
    document.addEventListener('keydown', keyListener);
    
    // Remove listener after 10 seconds
    setTimeout(() => {
        document.removeEventListener('keydown', keyListener);
        console.log('🔑 Key binding test completed');
    }, 10000);
    
    return true;
}

// Test 6: Check database loading
function testDatabaseLoading() {
    console.log('\n🔍 Test 6: Database Loading');
    
    if (!window.navigationSystemManager || !window.navigationSystemManager.starChartsManager) {
        console.error('❌ StarChartsManager not available');
        return false;
    }
    
    const starChartsManager = window.navigationSystemManager.starChartsManager;
    
    if (starChartsManager.objectDatabase) {
        console.log('✅ Object database loaded');
        
        const metadata = starChartsManager.objectDatabase.metadata;
        if (metadata) {
            console.log('📊 Database metadata:', metadata);
        }
        
        const sectors = starChartsManager.objectDatabase.sectors;
        if (sectors) {
            const sectorCount = Object.keys(sectors).length;
            console.log(`📊 Loaded ${sectorCount} sectors`);
            
            // Check A0 sector specifically
            if (sectors.A0) {
                console.log('✅ A0 sector data available');
                const a0 = sectors.A0;
                
                if (a0.star) {
                    console.log('✅ A0 star data available');
                }
                
                if (a0.objects && a0.objects.length > 0) {
                    console.log(`✅ A0 has ${a0.objects.length} celestial objects`);
                }
                
                if (a0.infrastructure) {
                    const stations = a0.infrastructure.stations || [];
                    const beacons = a0.infrastructure.beacons || [];
                    console.log(`✅ A0 infrastructure: ${stations.length} stations, ${beacons.length} beacons`);
                }
            } else {
                console.warn('⚠️ A0 sector data not found');
            }
        }
    } else {
        console.error('❌ Object database not loaded');
        return false;
    }
    
    return true;
}

// Test 7: Check discovery system
function testDiscoverySystem() {
    console.log('\n🔍 Test 7: Discovery System');
    
    if (!window.navigationSystemManager || !window.navigationSystemManager.starChartsManager) {
        console.error('❌ StarChartsManager not available');
        return false;
    }
    
    const starChartsManager = window.navigationSystemManager.starChartsManager;
    
    // Check discovered objects
    const discoveredObjects = starChartsManager.getDiscoveredObjects();
    console.log(`📊 Discovered objects: ${discoveredObjects.length}`);
    
    if (discoveredObjects.length > 0) {
        console.log('✅ Discovery system has discovered objects');
        console.log('📋 Discovered objects:', discoveredObjects);
    } else {
        console.log('ℹ️ No objects discovered yet (normal for new game)');
    }
    
    // Check current sector
    const currentSector = starChartsManager.getCurrentSector();
    console.log(`📍 Current sector: ${currentSector}`);
    
    return true;
}

// Run all tests
async function runAllIntegrationTests() {
    console.log('🚀 Running Star Charts Integration Tests...\n');
    
    const tests = [
        { name: 'ViewManager', fn: testViewManager },
        { name: 'NavigationSystemManager', fn: testNavigationSystemManager },
        { name: 'StarChartsManager', fn: testStarChartsManager },
        { name: 'StarChartsUI', fn: testStarChartsUI },
        { name: 'Key Bindings', fn: testKeyBindings },
        { name: 'Database Loading', fn: testDatabaseLoading },
        { name: 'Discovery System', fn: testDiscoverySystem }
    ];
    
    let passed = 0;
    let failed = 0;
    
    for (const test of tests) {
        try {
            const result = test.fn();
            if (result) {
                passed++;
            } else {
                failed++;
            }
        } catch (error) {
            console.error(`❌ Test ${test.name} threw error:`, error);
            failed++;
        }
    }
    
    console.log('\n📊 Integration Test Results:');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📊 Total: ${passed + failed}`);
    
    if (failed === 0) {
        console.log('\n🎉 All integration tests passed! Star Charts is properly integrated.');
    } else {
        console.log('\n⚠️ Some integration tests failed. Check the errors above.');
    }
    
    // Enable test mode for full testing
    console.log('\n💡 To enable test mode (auto-discover all objects):');
    console.log('localStorage.setItem("star_charts_test_discover_all", "true");');
    console.log('Then reload the page.');
}

// Auto-run tests
runAllIntegrationTests();

// Expose test functions globally for manual testing
window.starChartsIntegrationTests = {
    runAll: runAllIntegrationTests,
    testViewManager,
    testNavigationSystemManager,
    testStarChartsManager,
    testStarChartsUI,
    testKeyBindings,
    testDatabaseLoading,
    testDiscoverySystem
};

console.log('\n💡 Integration tests complete. You can run individual tests with:');
console.log('window.starChartsIntegrationTests.testViewManager()');
console.log('window.starChartsIntegrationTests.testStarChartsManager()');
console.log('etc.');
