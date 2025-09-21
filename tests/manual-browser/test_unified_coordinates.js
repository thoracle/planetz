/**
 * Test Unified 3D Coordinate System
 * 
 * This script tests that all objects (stations and beacons) now use 
 * the same standard 3D Cartesian coordinate system [x, y, z] in kilometers.
 * 
 * Coordinate System: Game uses kilometers as primary unit (1 game unit = 1km)
 * - All objects use [x, y, z] format
 * - No more polar coordinate conversion needed
 * - Stations converted from [radius_AU, angle_degrees] to [x, y, z] km
 * - Beacons already used [x, y, z] km
 */

function testUnifiedCoordinates() {
    console.log('🧪 Testing Unified 3D Coordinate System...');
    
    // Get StarChartsManager instance
    const scm = window.navigationSystemManager?.starChartsManager || window.starChartsManager;
    if (!scm) {
        console.log('❌ StarChartsManager not available');
        return;
    }
    
    console.log('✅ StarChartsManager found');
    
    // Test coordinate system consistency
    console.log('\n📊 Coordinate System Analysis:');
    
    if (scm.allObjects && scm.allObjects.length > 0) {
        console.log(`   Total objects: ${scm.allObjects.length}`);
        
        let stations = 0, beacons = 0, others = 0;
        let validCoords = 0, invalidCoords = 0;
        
        scm.allObjects.forEach(obj => {
            if (!obj || !obj.position) return;
            
            // Count object types
            if (obj.type === 'navigation_beacon') beacons++;
            else if (obj.type && obj.type.includes('station') || obj.type === 'Communications Array' || obj.type === 'Research Lab' || obj.type === 'Shipyard' || obj.type === 'Storage Depot' || obj.type === 'Factory' || obj.type === 'Repair Station' || obj.type === 'Mining Station' || obj.type === 'Refinery' || obj.type === 'Frontier Outpost' || obj.type === 'Defense Platform') stations++;
            else others++;
            
            // Check coordinate format
            if (Array.isArray(obj.position) && obj.position.length === 3) {
                validCoords++;
                console.log(`   ✅ ${obj.id}: [${obj.position.map(p => p.toFixed(1)).join(', ')}] km (${obj.type})`);
            } else {
                invalidCoords++;
                console.log(`   ❌ ${obj.id}: Invalid format ${JSON.stringify(obj.position)} (${obj.type})`);
            }
        });
        
        console.log(`\n📈 Summary:`);
        console.log(`   Stations: ${stations}`);
        console.log(`   Beacons: ${beacons}`);
        console.log(`   Others: ${others}`);
        console.log(`   Valid 3D coordinates: ${validCoords}`);
        console.log(`   Invalid coordinates: ${invalidCoords}`);
        
        if (invalidCoords === 0) {
            console.log('🎉 All objects use unified 3D coordinate system!');
        } else {
            console.log('⚠️ Some objects still have invalid coordinate formats');
        }
    } else {
        console.log('❌ No objects loaded');
    }
}

function testDiscoveryWithUnifiedCoords() {
    console.log('\n🔍 Testing Discovery with Unified Coordinates...');
    
    const scm = window.navigationSystemManager?.starChartsManager || window.starChartsManager;
    if (!scm) {
        console.log('❌ StarChartsManager not available');
        return;
    }
    
    // Get current player position
    const playerPos = scm.getPlayerPosition();
    console.log(`📍 Player position: [${playerPos.map(p => p.toFixed(1)).join(', ')}] km`);
    
    // Test discovery radius
    const discoveryRadius = scm.getDiscoveryRadius();
    console.log(`🔍 Discovery radius: ${discoveryRadius}km`);
    
    // Find nearby objects
    const nearbyObjects = scm.getNearbyObjects(playerPos, discoveryRadius);
    console.log(`📡 Objects within ${discoveryRadius}km: ${nearbyObjects.length}`);
    
    nearbyObjects.forEach((obj, index) => {
        const objPos = obj.cartesianPosition || obj.position || [0, 0, 0];
        const distance = scm.calculateDistance(objPos, playerPos);
        const discovered = scm.isDiscovered(obj.id);
        console.log(`   ${index + 1}. ${obj.id}: ${distance.toFixed(1)}km - ${discovered ? 'DISCOVERED' : 'NEW'}`);
    });
    
    // Test Terra Station specifically (should be at [149.6, 0, 0] km)
    console.log('\n🎯 Testing Terra Station Discovery:');
    const terraStation = scm.allObjects?.find(obj => obj.id === 'a0_terra_station');
    if (terraStation) {
        const terraPos = terraStation.cartesianPosition || terraStation.position || [0, 0, 0];
        const distanceToTerra = scm.calculateDistance(terraPos, playerPos);
        console.log(`   Terra Station position: [${terraPos.map(p => p.toFixed(1)).join(', ')}] km`);
        console.log(`   Distance to Terra Station: ${distanceToTerra.toFixed(1)}km`);
        console.log(`   Within discovery range: ${distanceToTerra <= discoveryRadius ? 'YES' : 'NO'}`);
        console.log(`   Already discovered: ${scm.isDiscovered('a0_terra_station') ? 'YES' : 'NO'}`);
    } else {
        console.log('   ❌ Terra Station not found');
    }
}

function approachTerraStation() {
    console.log('\n🎯 Moving camera close to Terra Station for discovery test...');
    
    // Terra Station should be at [149.6, 0, 0] km
    const terraPos = [149.6, 0, 0];
    const approachPos = [144.6, 0, 0]; // 5km away from Terra Station
    
    // Move camera
    if (window.viewManager && window.viewManager.camera) {
        window.viewManager.camera.position.set(approachPos[0], approachPos[1], approachPos[2]);
        console.log(`📍 Camera moved to: [${approachPos.join(', ')}] km`);
        console.log(`📏 Distance from Terra Station: 5.0km`);
        
        // Force discovery check
        const scm = window.navigationSystemManager?.starChartsManager || window.starChartsManager;
        if (scm && scm.checkDiscovery) {
            setTimeout(() => {
                scm.checkDiscovery();
                console.log('🔄 Discovery check triggered');
            }, 1000);
        }
        
        console.log('⏳ Wait a few seconds for discovery system to check...');
    } else {
        console.log('❌ Camera not available');
    }
}

function resetCameraPosition() {
    console.log('\n🔄 Resetting camera position...');
    
    if (window.viewManager && window.viewManager.camera) {
        window.viewManager.camera.position.set(0, 20, 3);
        console.log('📍 Camera reset to: [0, 20, 3] km');
    } else {
        console.log('❌ Camera not available');
    }
}

// Export functions to global scope
window.testUnifiedCoordinates = testUnifiedCoordinates;
window.testDiscoveryWithUnifiedCoords = testDiscoveryWithUnifiedCoords;
window.approachTerraStation = approachTerraStation;
window.resetCameraPosition = resetCameraPosition;

console.log('🔧 Unified Coordinate System Test Script Loaded');
console.log('📋 Available commands:');
console.log('   testUnifiedCoordinates() - Check coordinate system consistency');
console.log('   testDiscoveryWithUnifiedCoords() - Test discovery with new coordinates');
console.log('   approachTerraStation() - Move close to Terra Station for discovery');
console.log('   resetCameraPosition() - Reset camera to default position');
console.log('');
console.log('🚀 Running automatic tests...');
testUnifiedCoordinates();
testDiscoveryWithUnifiedCoords();
