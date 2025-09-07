import { debug } from './debug.js';

// Particle Trail Test Script
// Run this in browser console after loading the game to test particle trails

debug('AI', '🎯 Particle Trail Test - Testing improved visibility');

// Wait for game to be fully loaded
if (typeof window.starfieldManager === 'undefined') {
debug('AI', '⏳ Waiting for game to load...');
    setTimeout(() => location.reload(), 2000);
} else {
debug('AI', '✅ Game loaded, starting particle trail test');
    
    // Test function to fire projectiles and check trails
    function testParticleTrails() {
        const ship = window.starfieldManager.viewManager.getShip();
        if (!ship || !ship.weaponSystem) {
debug('COMBAT', '❌ Ship or weapon system not available');
            return;
        }
        
debug('AI', '🚀 Testing particle trails:');
debug('AI', '1. Firing Homing Missile (red trail, 150 m/s)');
debug('AI', '2. Firing Photon Torpedo (blue trail, 200 m/s)');
debug('AI', '3. Firing Proximity Mine (orange trail)');
        
        // Fire each weapon type with delay
        setTimeout(() => {
debug('UTILITY', '🔴 Firing Homing Missile...');
            ship.weaponSystem.slots[1]?.fireWeapon();
        }, 500);
        
        setTimeout(() => {
debug('UTILITY', '🔵 Firing Photon Torpedo...');
            ship.weaponSystem.slots[2]?.fireWeapon();
        }, 2000);
        
        setTimeout(() => {
debug('UTILITY', '🟠 Firing Proximity Mine...');
            ship.weaponSystem.slots[3]?.fireWeapon();
        }, 4000);
        
        // Check particle trail status
        setTimeout(() => {
            const effectsManager = ship.weaponEffectsManager;
            if (effectsManager) {
debug('AI', '📊 Particle Trail Status:');
debug('AI', `- Active trails: ${effectsManager.particleTrails.size}`);
debug('UTILITY', `- Particle systems: ${effectsManager.particleSystems.length}`);
debug('UTILITY', `- Fallback mode: ${effectsManager.fallbackMode}`);
                
                if (effectsManager.particleTrails.size > 0) {
debug('AI', '✅ Particle trails are being created!');
                } else {
debug('AI', '❌ No particle trails detected');
                }
            }
        }, 6000);
    }
    
    // Run test
    testParticleTrails();
    
debug('UTILITY', '🎮 Controls:');
debug('COMBAT', '- Space: Fire laser');
debug('COMBAT', '- 1: Fire homing missile');
debug('COMBAT', '- 2: Fire photon torpedo');
debug('COMBAT', '- 3: Fire proximity mine');
debug('TARGETING', '- TAB: Cycle targets');
    console.log('');
debug('AI', '👀 Look for particle trails behind projectiles!');
} 