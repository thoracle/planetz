// Particle Trail Test Script
// Run this in browser console after loading the game to test particle trails

console.log('🎯 Particle Trail Test - Testing improved visibility');

// Wait for game to be fully loaded
if (typeof window.starfieldManager === 'undefined') {
    console.log('⏳ Waiting for game to load...');
    setTimeout(() => location.reload(), 2000);
} else {
    console.log('✅ Game loaded, starting particle trail test');
    
    // Test function to fire projectiles and check trails
    function testParticleTrails() {
        const ship = window.starfieldManager.viewManager.getShip();
        if (!ship || !ship.weaponSystem) {
            console.log('❌ Ship or weapon system not available');
            return;
        }
        
        console.log('🚀 Testing particle trails:');
        console.log('1. Firing Homing Missile (red trail, 150 m/s)');
        console.log('2. Firing Photon Torpedo (blue trail, 200 m/s)');
        console.log('3. Firing Proximity Mine (orange trail)');
        
        // Fire each weapon type with delay
        setTimeout(() => {
            console.log('🔴 Firing Homing Missile...');
            ship.weaponSystem.slots[1]?.fireWeapon();
        }, 500);
        
        setTimeout(() => {
            console.log('🔵 Firing Photon Torpedo...');
            ship.weaponSystem.slots[2]?.fireWeapon();
        }, 2000);
        
        setTimeout(() => {
            console.log('🟠 Firing Proximity Mine...');
            ship.weaponSystem.slots[3]?.fireWeapon();
        }, 4000);
        
        // Check particle trail status
        setTimeout(() => {
            const effectsManager = ship.weaponEffectsManager;
            if (effectsManager) {
                console.log('📊 Particle Trail Status:');
                console.log(`- Active trails: ${effectsManager.particleTrails.size}`);
                console.log(`- Particle systems: ${effectsManager.particleSystems.length}`);
                console.log(`- Fallback mode: ${effectsManager.fallbackMode}`);
                
                if (effectsManager.particleTrails.size > 0) {
                    console.log('✅ Particle trails are being created!');
                } else {
                    console.log('❌ No particle trails detected');
                }
            }
        }, 6000);
    }
    
    // Run test
    testParticleTrails();
    
    console.log('🎮 Controls:');
    console.log('- Space: Fire laser');
    console.log('- 1: Fire homing missile');
    console.log('- 2: Fire photon torpedo'); 
    console.log('- 3: Fire proximity mine');
    console.log('- TAB: Cycle targets');
    console.log('');
    console.log('👀 Look for particle trails behind projectiles!');
} 