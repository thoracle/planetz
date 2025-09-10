// Test script to verify all objects now have 3D coordinates
// Run this in the browser console after loading the game

console.log('🧪 Testing 3D Coordinate Conversion...');

setTimeout(() => {
    if (!window.navigationSystemManager?.starChartsManager) {
        console.error('❌ Star Charts Manager not found');
        return;
    }

    const manager = window.navigationSystemManager.starChartsManager;

    console.log('✅ Star Charts Manager found');

    // Test coordinate types
    console.log('📊 Checking coordinate formats...');

    // Check if database is loaded
    if (!manager.objectDatabase?.sectors?.A0) {
        console.error('❌ A0 sector data not loaded');
        return;
    }

    const a0Sector = manager.objectDatabase.sectors.A0;
    const allObjects = [
        a0Sector.star,
        ...a0Sector.objects,
        ...(a0Sector.infrastructure?.stations || []),
        ...(a0Sector.infrastructure?.beacons || [])
    ];

    let celestial3D = 0, celestial2D = 0;
    let stations3D = 0, stations2D = 0;
    let beacons3D = 0, beacons2D = 0;

    allObjects.forEach(obj => {
        if (!obj || !obj.position) return;

        const is3D = obj.position.length === 3;
        const is2D = obj.position.length === 2;

        if (obj.type === 'star' || obj.type === 'planet' || obj.type === 'moon') {
            if (is3D) celestial3D++;
            if (is2D) celestial2D++;
        } else if (obj.type === 'navigation_beacon') {
            if (is3D) beacons3D++;
            if (is2D) beacons2D++;
        } else {
            // Stations and other infrastructure
            if (is3D) stations3D++;
            if (is2D) stations2D++;
        }
    });

    console.log('📊 Coordinate Analysis:');
    console.log(`   Celestial objects: ${celestial3D} 3D, ${celestial2D} 2D`);
    console.log(`   Stations: ${stations3D} 3D, ${stations2D} 2D`);
    console.log(`   Beacons: ${beacons3D} 3D, ${beacons2D} 2D`);

    const total3D = celestial3D + stations3D + beacons3D;
    const total2D = celestial2D + stations2D + beacons2D;

    if (total2D === 0) {
        console.log('✅ SUCCESS: All objects have 3D coordinates!');
    } else {
        console.log(`❌ ISSUE: ${total2D} objects still have 2D coordinates`);
    }

    console.log(`📈 Total objects: ${allObjects.length} (${total3D} 3D, ${total2D} 2D)`);

    // Test spatial grid with new coordinates
    console.log('🔍 Testing spatial grid with new coordinates...');

    if (typeof window.debugSpatialGrid === 'function') {
        console.log('🗺️ Spatial Grid Contents:');
        window.debugSpatialGrid();
    }

    console.log('🧪 3D coordinate test complete!');

}, 3000);
