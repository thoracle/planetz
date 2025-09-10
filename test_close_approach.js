/**
 * Test Close Approach to Objects
 * ===============================
 * 
 * This script helps test the 10km discovery range by moving the camera
 * very close to objects to trigger discovery.
 * 
 * Coordinate System: Game uses kilometers as primary unit (1 game unit = 1km)
 * Discovery range: 10km (no conversion needed)
 * 
 * Usage:
 * 1. Load expose_starchartsmanager.js first
 * 2. Load this script
 * 3. Run approachSOL() to move within discovery range of SOL
 */

console.log('🚀 Close Approach Test Script Loaded');

function approachSOL() {
    console.log('🎯 Moving camera close to SOL for discovery test...');
    
    // Check if we have access to the camera
    if (!window.viewManager || !window.viewManager.camera) {
        console.log('❌ Camera not available');
        return;
    }
    
    const camera = window.viewManager.camera;
    
    // SOL is at (0, 0, 0) in km
    // Move camera to within 10km of SOL
    // Game uses km as units, so move to (5, 0, 0) = 5km from SOL
    const closeDistance = 5; // 5km from SOL
    
    console.log(`📍 Current camera position: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}) km`);
    
    // Move camera close to SOL
    camera.position.set(closeDistance, 0, 0);
    
    console.log(`📍 New camera position: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}) km`);
    console.log(`📏 Distance from SOL: ${closeDistance}km`);
    console.log('⏳ Wait a few seconds for discovery system to check...');
    
    // Force a discovery check if we have access to StarChartsManager
    setTimeout(() => {
        if (window.starChartsManager) {
            console.log('🔍 Forcing discovery check...');
            window.starChartsManager.checkDiscovery();
            
            // Check if SOL was discovered
            setTimeout(() => {
                const discovered = window.starChartsManager.isDiscovered('A0_star');
                console.log(`🌟 SOL discovery status: ${discovered ? '✅ DISCOVERED!' : '❌ Not discovered yet'}`);
                
                if (discovered) {
                    console.log('🎉 Success! 10km discovery range is working!');
                } else {
                    console.log('🤔 Still not discovered. Let me check the exact distance...');
                    const playerPos = window.starChartsManager.getPlayerPosition();
                    const solPos = [0, 0, 0];
                    const distance = window.starChartsManager.calculateDistance(playerPos, solPos);
                    console.log(`📏 Calculated distance: ${distance.toFixed(1)}km`);
                    console.log(`🎯 Discovery radius: ${window.starChartsManager.getDiscoveryRadius()}km`);
                }
            }, 2000);
        }
    }, 3000);
}

function approachObject(objectId, objectPosition) {
    console.log(`🎯 Moving camera close to ${objectId}...`);
    
    if (!window.viewManager || !window.viewManager.camera) {
        console.log('❌ Camera not available');
        return;
    }
    
    const camera = window.viewManager.camera;
    const closeDistance = 5; // 5km
    
    // Move camera close to the object
    camera.position.set(
        objectPosition[0] + closeDistance,
        objectPosition[1],
        objectPosition[2]
    );
    
    console.log(`📍 Moved to: (${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)}) km`);
    console.log(`📏 Distance from ${objectId}: ${closeDistance}km`);
    console.log('⏳ Wait a few seconds for discovery...');
}

function testDiscoveryRange() {
    console.log('🧪 Testing discovery range conversion...');
    
    if (!window.starChartsManager) {
        console.log('❌ StarChartsManager not available. Run expose_starchartsmanager.js first.');
        return;
    }
    
    const scm = window.starChartsManager;
    const radiusKm = scm.getDiscoveryRadius();
    
    console.log(`🔍 Discovery radius: ${radiusKm}km`);
    
    // Check current distance to SOL
    const playerPos = scm.getPlayerPosition();
    const solPos = [0, 0, 0];
    const distanceKm = scm.calculateDistance(playerPos, solPos);
    
    console.log(`📍 Current distance to SOL: ${distanceKm.toFixed(1)}km`);
    
    if (distanceKm <= radiusKm) {
        console.log('✅ Within discovery range!');
    } else {
        console.log('❌ Outside discovery range');
        console.log(`💡 Need to be ${(distanceKm - radiusKm).toFixed(1)}km closer`);
    }
}

function resetCameraPosition() {
    console.log('🔄 Resetting camera to default position...');
    
    if (!window.viewManager || !window.viewManager.camera) {
        console.log('❌ Camera not available');
        return;
    }
    
    const camera = window.viewManager.camera;
    camera.position.set(0, 20, 3); // Back to original position
    
    console.log(`📍 Camera reset to: (${camera.position.x}, ${camera.position.y}, ${camera.position.z}) km`);
}

// Auto-display available commands
console.log('📋 Available commands:');
console.log('   approachSOL() - Move camera within 10km of SOL');
console.log('   testDiscoveryRange() - Check current distance vs discovery range');
console.log('   resetCameraPosition() - Move camera back to starting position');
console.log('   approachObject(id, [x,y,z]) - Move close to any object');
console.log('');
console.log('💡 Remember: Game uses kilometers as primary unit (1 game unit = 1km)');
console.log('💡 Discovery range: 10km (no conversion needed)');
