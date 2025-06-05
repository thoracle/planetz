/**
 * Test Sub-System Destruction Success Sound (50% Duration)
 * 
 * This script specifically tests the new feature where sub-system destruction
 * plays only the first 50% of the success.wav audio file, making it shorter
 * and more subtle compared to full ship destruction.
 */

(function() {
    console.log('🎯 Testing Sub-System Success Sound (50% Duration)');
    console.log('==================================================');
    
    // Wait for game to load
    setTimeout(function() {
        try {
            const starfieldManager = window.starfieldManager;
            const ship = window.ship || (starfieldManager && starfieldManager.viewManager ? starfieldManager.viewManager.getShip() : null);
            
            if (!ship || !starfieldManager) {
                console.error('❌ Ship or StarfieldManager not found');
                return;
            }
            
            console.log('✅ Game components found');
            
            // Test manual playback comparison
            function testAudioComparison() {
                console.log('\n🔊 Audio Comparison Test');
                console.log('========================');
                
                const effectsManager = ship.weaponEffectsManager;
                if (!effectsManager || !effectsManager.playSuccessSound) {
                    console.error('❌ WeaponEffectsManager not found');
                    return;
                }
                
                console.log('🎵 Playing full success sound (ship destruction)...');
                effectsManager.playSuccessSound();
                
                setTimeout(() => {
                    console.log('🎵 Playing 50% success sound (sub-system destruction)...');
                    effectsManager.playSuccessSound(null, 0.6, 0.5); // 60% volume, 50% duration
                }, 3000);
                
                setTimeout(() => {
                    console.log('🎵 Playing 25% success sound (comparison)...');
                    effectsManager.playSuccessSound(null, 0.4, 0.25); // 40% volume, 25% duration
                }, 6000);
                
                console.log('✅ Audio comparison scheduled - listen for the differences!');
                console.log('📊 Expected differences:');
                console.log('   1. Full sound: 100% duration, 80% volume');
                console.log('   2. Sub-system: 50% duration, 60% volume');
                console.log('   3. Comparison: 25% duration, 40% volume');
            }
            
            // Test actual sub-system destruction
            function testSubSystemDestruction() {
                console.log('\n⚔️  Sub-System Destruction Test');
                console.log('===============================');
                
                // Create target for testing
                console.log('🎯 Creating target dummy...');
                starfieldManager.createTargetDummies(1);
                
                setTimeout(() => {
                    const targetObjects = starfieldManager.targetObjects || [];
                    if (targetObjects.length === 0) {
                        console.error('❌ No targets created');
                        return;
                    }
                    
                    const target = targetObjects[0];
                    console.log(`🎯 Target: ${target.ship ? target.ship.shipName || 'unnamed' : 'unknown'}`);
                    
                    // Set up sub-targeting
                    const targetComputer = ship.getSystem('target_computer');
                    if (!targetComputer) {
                        console.error('❌ No targeting computer found');
                        return;
                    }
                    
                    targetComputer.currentTarget = target;
                    targetComputer.enableSubTargeting();
                    
                    if (!targetComputer.availableSubTargets || targetComputer.availableSubTargets.length === 0) {
                        console.error('❌ No sub-targets available');
                        return;
                    }
                    
                    // Target the first system
                    const firstSubTarget = targetComputer.availableSubTargets[0];
                    targetComputer.setSubTarget(firstSubTarget.systemName);
                    
                    console.log(`🎯 Targeting: ${firstSubTarget.displayName}`);
                    console.log(`📊 Health: ${(firstSubTarget.system.healthPercentage * 100).toFixed(1)}%`);
                    
                    // Weaken system for easy destruction
                    firstSubTarget.system.healthPercentage = 0.01;
                    console.log('⚡ System weakened for testing');
                    
                    // Fire weapon
                    if (ship.weaponSlots && ship.weaponSlots.length > 0) {
                        const weapon = ship.weaponSlots[0];
                        if (weapon && !weapon.isEmpty) {
                            console.log('🔥 Firing weapon...');
                            weapon.fire(ship, target);
                            console.log('✅ Weapon fired - listen for 50% duration success sound!');
                        } else {
                            console.warn('⚠️ No weapon equipped');
                        }
                    } else {
                        console.warn('⚠️ No weapon slots');
                    }
                }, 1000);
            }
            
            // Run tests
            testAudioComparison();
            
            setTimeout(() => {
                testSubSystemDestruction();
            }, 10000); // Start sub-system test after audio comparison
            
        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    }, 2000);
})(); 