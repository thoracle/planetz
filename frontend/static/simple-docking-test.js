// Simple test to verify docking modal target name fix
console.log('🧪 Simple docking modal test loading...');

function testDockingModalFix() {
    console.log('\n=== DOCKING MODAL NAME FIX TEST ===');
    
    // Check if we have the required objects
    if (!window.starfieldManager) {
        console.log('❌ StarfieldManager not found - waiting...');
        return false;
    }
    
    const sm = window.starfieldManager;
    
    if (!sm.dockingModal) {
        console.log('❌ DockingModal not found');
        return false;
    }
    
    if (!sm.solarSystemManager) {
        console.log('❌ SolarSystemManager not found');
        return false;
    }
    
    console.log('✅ All required managers found');
    
    // Get celestial bodies
    const celestialBodies = sm.solarSystemManager.getCelestialBodies();
    console.log(`📍 Found ${celestialBodies.size} celestial bodies`);
    
    // Test name resolution for each body
    celestialBodies.forEach((body, bodyId) => {
        if (bodyId.startsWith('planet_') || bodyId.startsWith('moon_')) {
            const bodyInfo = sm.solarSystemManager.getCelestialBodyInfo(body);
            console.log(`🎯 ${bodyId}: name="${bodyInfo?.name}", type="${bodyInfo?.type}"`);
            
            // Check if THREE.js object has name vs SolarSystemManager info
            console.log(`   - THREE.js object name: "${body.name || 'undefined'}"`);
            console.log(`   - SolarSystemManager name: "${bodyInfo?.name || 'undefined'}"`);
        }
    });
    
    console.log('\n=== TEST COMPLETE ===');
    return true;
}

// Wait for game to load, then run test
function waitAndTest() {
    if (testDockingModalFix()) {
        console.log('✅ Test completed successfully');
    } else {
        console.log('⏳ Retrying in 2 seconds...');
        setTimeout(waitAndTest, 2000);
    }
}

// Start testing after a delay
setTimeout(waitAndTest, 3000);

// Make test available globally
window.testDockingModalFix = testDockingModalFix;

console.log('✅ Simple docking modal test script loaded'); 