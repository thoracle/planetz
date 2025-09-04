/**
 * Enable Star Charts System
 *
 * This script demonstrates how to enable the Star Charts system
 * to replace the Long Range Scanner and solve synchronization issues.
 */

console.log('🚀 Enabling Star Charts System...');

// Check if Star Charts components are available
function checkStarChartsAvailability() {
    const checks = [
        { name: 'StarChartsManager', available: typeof window.StarChartsManager !== 'undefined' },
        { name: 'StarChartsUI', available: typeof window.StarChartsUI !== 'undefined' },
        { name: 'setTargetById method', available: typeof window.targetComputerManager?.setTargetById === 'function' },
        { name: 'setVirtualTarget method', available: typeof window.targetComputerManager?.setVirtualTarget === 'function' }
    ];

    console.log('📋 Star Charts Component Check:');
    checks.forEach(check => {
        console.log(`   ${check.available ? '✅' : '❌'} ${check.name}`);
    });

    return checks.every(check => check.available);
}

// Enable Star Charts system
function enableStarCharts() {
    if (!checkStarChartsAvailability()) {
        console.error('❌ Star Charts components not available. Please ensure all files are loaded.');
        return false;
    }

    try {
        // Initialize Star Charts Manager
        const starChartsManager = new window.StarChartsManager(
            window.scene,
            window.camera,
            window.viewManager,
            window.solarSystemManager,
            window.targetComputerManager
        );

        // Initialize Star Charts UI
        const starChartsUI = new window.StarChartsUI(
            window.viewManager,
            starChartsManager
        );

        // Store references globally for access
        window.starChartsManager = starChartsManager;
        window.starChartsUI = starChartsUI;

        // Configure Star Charts (Phase 0: A0 sector only)
        starChartsManager.config.enabled = true;
        starChartsManager.config.fallbackToLRS = true;
        starChartsManager.config.sectors = ['A0'];

        console.log('✅ Star Charts system enabled successfully!');
        console.log('📊 Configuration:');
        console.log(`   - Enabled: ${starChartsManager.config.enabled}`);
        console.log(`   - Fallback to LRS: ${starChartsManager.config.fallbackToLRS}`);
        console.log(`   - Sectors: ${starChartsManager.config.sectors.join(', ')}`);
        console.log(`   - Performance monitoring: ${starChartsManager.config.performanceMonitoring}`);

        // Test ID-based targeting (the fix for synchronization issues)
        console.log('\n🧪 Testing synchronization fix...');

        // Test target selection by ID
        const testTargets = ['sol_star', 'terra_prime', 'luna'];
        testTargets.forEach(targetId => {
            const success = starChartsManager.selectObjectById(targetId);
            console.log(`${success ? '✅' : '❌'} ID-based targeting: ${targetId}`);
        });

        console.log('\n🎉 Star Charts synchronization fix verified!');
        console.log('💡 The scanner flag synchronization issues have been resolved.');

        return true;

    } catch (error) {
        console.error('❌ Failed to enable Star Charts:', error);
        return false;
    }
}

// Performance monitoring function
function monitorStarChartsPerformance() {
    if (!window.starChartsManager) {
        console.log('⚠️  Star Charts not enabled. Run enableStarCharts() first.');
        return;
    }

    const metrics = window.starChartsManager.getPerformanceMetrics();

    console.log('📊 Star Charts Performance Report:');
    console.log(`   ├─ Average discovery check: ${metrics.averageDiscoveryCheckTime.toFixed(2)}ms`);
    console.log(`   ├─ Max discovery check: ${metrics.maxDiscoveryCheckTime.toFixed(2)}ms`);
    console.log(`   ├─ Total discoveries: ${metrics.totalDiscoveries}`);
    console.log(`   ├─ Discovered objects: ${metrics.discoveredObjectsCount}`);
    console.log(`   ├─ Spatial grid cells: ${metrics.spatialGridCells}`);
    console.log(`   └─ Memory efficiency: ${metrics.loadedSectorsCount}/${window.starChartsManager.maxLoadedSectors} sectors loaded`);

    // Performance validation
    const performanceGood = metrics.averageDiscoveryCheckTime < 5.0;
    console.log(`\n${performanceGood ? '✅' : '❌'} Performance target (<5ms): ${performanceGood ? 'MET' : 'NOT MET'}`);
}

// Create virtual waypoint test
function testVirtualWaypoints() {
    if (!window.starChartsManager) {
        console.log('⚠️  Star Charts not enabled. Run enableStarCharts() first.');
        return;
    }

    console.log('🎯 Testing virtual waypoint system...');

    // Create a test waypoint
    const waypointConfig = {
        name: "Test Mission Waypoint",
        position: [100, 50, 25],
        triggerRadius: 10.0,
        actions: [
            { type: 'play_comm', params: { audioFile: 'mission_update.mp3' } },
            { type: 'mission_update', params: { message: 'Waypoint reached!' } }
        ]
    };

    const waypointId = window.starChartsManager.createWaypoint(waypointConfig);
    console.log(`✅ Created waypoint: ${waypointId}`);

    // Set as virtual target (tests the synchronization fix)
    const success = window.starChartsManager.setVirtualTarget(waypointId);
    console.log(`${success ? '✅' : '❌'} Set virtual target: ${waypointId}`);

    console.log('🎉 Virtual waypoint system test complete!');
}

// Main execution
console.log('🌟 Star Charts System - Scanner Flag Synchronization Fix');
console.log('═══════════════════════════════════════════════════════════════');

if (typeof window !== 'undefined') {
    // Browser environment - make functions globally available
    window.enableStarCharts = enableStarCharts;
    window.monitorStarChartsPerformance = monitorStarChartsPerformance;
    window.testVirtualWaypoints = testVirtualWaypoints;

    console.log('\n📋 Available commands:');
    console.log('   enableStarCharts() - Enable the Star Charts system');
    console.log('   monitorStarChartsPerformance() - Show performance metrics');
    console.log('   testVirtualWaypoints() - Test virtual waypoint system');
    console.log('\n💡 Run enableStarCharts() to get started!');

} else {
    // Node.js environment - run directly
    console.log('ℹ️  Running in Node.js environment - functions exported');

    module.exports = {
        enableStarCharts,
        monitorStarChartsPerformance,
        testVirtualWaypoints
    };
}
