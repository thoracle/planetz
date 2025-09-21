// Wireframe Debug Helper
// Run this in the browser console to debug wireframe issues

console.log('🔧 Wireframe Debug Helper loaded');

// Function to check current target wireframe info
window.debugCurrentTargetWireframe = function() {
    if (!window.viewManager?.navigationSystemManager?.targetComputerManager) {
        console.error('❌ Target Computer Manager not found');
        return;
    }

    const tcm = window.viewManager.navigationSystemManager.targetComputerManager;
    const currentTargetData = tcm.getCurrentTargetData();

    if (!currentTargetData) {
        console.log('❌ No current target');
        return;
    }

    const resolvedType = (currentTargetData.type || '').toLowerCase();
    const wireframeConfig = tcm.getWireframeConfig(resolvedType);

    console.log('🎯 CURRENT TARGET WIREFRAME INFO:', {
        targetName: currentTargetData.name,
        targetType: currentTargetData.type,
        resolvedType: resolvedType,
        wireframeGeometry: wireframeConfig.geometry,
        wireframeDescription: wireframeConfig.description,
        isFromStarCharts: currentTargetData.fromStarCharts,
        isManualSelection: tcm.isManualSelection,
        isFromLongRangeScanner: tcm.isFromLongRangeScanner,
        targetIndex: tcm.targetIndex
    });

    return {
        targetData: currentTargetData,
        wireframeConfig: wireframeConfig
    };
};

// Function to check all target objects
window.debugAllTargets = function() {
    if (!window.viewManager?.navigationSystemManager?.targetComputerManager) {
        console.error('❌ Target Computer Manager not found');
        return;
    }

    const tcm = window.viewManager.navigationSystemManager.targetComputerManager;

    console.log('🎯 ALL TARGETS IN TARGET COMPUTER:');
    tcm.targetObjects.forEach((target, index) => {
        const resolvedType = (target.type || '').toLowerCase();
        const wireframeConfig = tcm.getWireframeConfig(resolvedType);

        console.log(`${index}: ${target.name} (${target.type}) → ${wireframeConfig.geometry} (${wireframeConfig.description})`);
    });
};

// Function to compare Star Charts vs TAB targeting
window.debugTargetingComparison = function() {
    console.log('🔍 TARGETING COMPARISON DEBUG');
    console.log('1. Click on an object in Star Charts');
    console.log('2. Run: debugCurrentTargetWireframe()');
    console.log('3. Note the wireframe geometry');
    console.log('4. Press TAB to cycle to same target');
    console.log('5. Run: debugCurrentTargetWireframe() again');
    console.log('6. Compare the two results');
};

// Function to check Star Charts object data
window.debugStarChartsObject = function(objectId) {
    if (!window.viewManager?.navigationSystemManager?.starChartsManager) {
        console.error('❌ Star Charts Manager not found');
        return;
    }

    const scm = window.viewManager.navigationSystemManager.starChartsManager;
    const objectData = scm.getObjectData(objectId);

    if (!objectData) {
        console.log(`❌ Object ${objectId} not found in Star Charts`);
        return;
    }

    console.log('🌟 STAR CHARTS OBJECT DATA:', objectData);
    return objectData;
};

// Function to debug Star Charts beacon discovery
window.debugStarChartsBeacons = function() {
    if (!window.viewManager?.navigationSystemManager?.starChartsManager) {
        console.error('❌ Star Charts Manager not found');
        return;
    }

    const scm = window.viewManager.navigationSystemManager.starChartsManager;
    const sectorData = scm.objectDatabase?.sectors?.[scm.currentSector];

    if (!sectorData?.infrastructure?.beacons) {
        console.log('❌ No beacons found in current sector');
        return;
    }

    console.log('🌟 STAR CHARTS BEACON DISCOVERY DEBUG:');
    console.log(`Test mode enabled: ${scm.isTestDiscoverAllEnabled()}`);
    console.log(`Current sector: ${scm.currentSector}`);
    console.log(`Total beacons in sector: ${sectorData.infrastructure.beacons.length}`);

    const discoveredObjects = scm.getDiscoveredObjects();
    console.log(`Total discovered objects: ${discoveredObjects.length}`);

    sectorData.infrastructure.beacons.forEach((beacon, index) => {
        const isDiscovered = discoveredObjects.includes(beacon.id) ||
                            discoveredObjects.includes(beacon.id.replace(/^a0_/i, 'A0_'));
        console.log(`${index + 1}. ${beacon.name} (${beacon.id}): ${isDiscovered ? '✅ DISCOVERED' : '❌ NOT DISCOVERED'}`);
        console.log(`   Raw position: [${beacon.position}]`);
        const angleDeg = Math.atan2(beacon.position[1], beacon.position[0]) * 180 / Math.PI;
        console.log(`   Calculated angle: ${angleDeg}°`);
        const expectedX = 350 * Math.cos(angleDeg * Math.PI / 180);
        const expectedY = 350 * Math.sin(angleDeg * Math.PI / 180);
        console.log(`   Expected display position: (${expectedX.toFixed(1)}, ${expectedY.toFixed(1)})`);
    });
};

// Function to force beacon discovery
window.forceDiscoverBeacons = function() {
    if (!window.viewManager?.navigationSystemManager?.starChartsManager) {
        console.error('❌ Star Charts Manager not found');
        return;
    }

    const scm = window.viewManager.navigationSystemManager.starChartsManager;
    scm.autoDiscoverBeacons();
    console.log('🔧 Forced beacon discovery - refresh Star Charts to see changes');
};

// Function to check test mode status
window.checkTestMode = function() {
    const scm = window.viewManager?.navigationSystemManager?.starChartsManager;
    const scui = window.viewManager?.navigationSystemManager?.starChartsUI;

    console.log('🔧 TEST MODE STATUS:');
    console.log(`Manager test mode: ${scm?.isTestDiscoverAllEnabled()}`);
    console.log(`UI test mode: ${scui?.isTestModeEnabled()}`);
    console.log(`localStorage flag: ${localStorage.getItem('star_charts_test_discover_all')}`);
    console.log(`window.STAR_CHARTS_DISCOVER_ALL: ${window.STAR_CHARTS_DISCOVER_ALL}`);
};

// Function to debug what objects are being rendered in Star Charts
window.debugStarChartsRendering = function() {
    const scui = window.viewManager?.navigationSystemManager?.starChartsUI;
    if (!scui) {
        console.error('❌ Star Charts UI not found');
        return;
    }

    console.log('🎨 STAR CHARTS RENDERING DEBUG:');

    // Get the objects that should be rendered
    const sectorData = scui.starChartsManager?.objectDatabase?.sectors?.[scui.starChartsManager?.getCurrentSector()];
    if (!sectorData) {
        console.log('❌ No sector data found');
        return;
    }

    const beacons = sectorData.infrastructure?.beacons || [];
    console.log(`📡 Beacons in sector: ${beacons.length}`);

    // Count SVG elements
    const svg = scui.svg;
    if (!svg) {
        console.log('❌ No SVG element found');
        return;
    }

    const polygons = svg.querySelectorAll('polygon');
    const triangles = Array.from(polygons).filter(p => p.getAttribute('points')?.includes(','));

    console.log(`🔺 Triangle polygons in SVG: ${triangles.length}`);

    triangles.forEach((tri, index) => {
        const points = tri.getAttribute('points');
        const fill = tri.getAttribute('fill');
        console.log(`  Triangle ${index + 1}: fill=${fill}, points=${points}`);
    });

    // Check for beacon-specific elements
    const beaconElements = Array.from(svg.querySelectorAll('*')).filter(el =>
        el.tagName === 'polygon' &&
        el.getAttribute('fill') === '#ffff00'
    );

    console.log(`🎯 Yellow triangles (beacons): ${beaconElements.length}`);

    if (beaconElements.length === 0) {
        console.log('⚠️  No yellow triangles found - beacons may not be rendering!');
    }
};

console.log('🔧 Available debug functions:');
console.log('- debugCurrentTargetWireframe() - Check current target wireframe info');
console.log('- debugAllTargets() - List all targets with their wireframe types');
console.log('- debugTargetingComparison() - Instructions for comparing targeting methods');
console.log('- debugStarChartsObject(objectId) - Get Star Charts data for an object');
console.log('- debugStarChartsBeacons() - Debug beacon discovery status');
console.log('- forceDiscoverBeacons() - Force discover all beacons');
console.log('- checkTestMode() - Check test mode status');
console.log('- debugStarChartsRendering() - Debug what objects are actually rendered');
