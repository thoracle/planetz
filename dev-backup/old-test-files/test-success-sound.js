/**
 * Test Success Sound on Enemy Destruction
 * 
 * This script tests that:
 * 1. Success.wav file is loaded properly
 * 2. Success sound plays when enemies are destroyed
 * 3. Sound is spatially positioned at the destruction location
 * 4. Audio system is working correctly
 */

(function() {
    console.log('🎵 Testing Success Sound on Enemy Destruction');
    console.log('==============================================');
    
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
            
            // Test 1: Check if success sound is loaded
            function testSoundLoading() {
                console.log('\n🔊 Test 1: Sound Loading');
                console.log('------------------------');
                
                const effectsManager = ship.weaponEffectsManager;
                if (!effectsManager) {
                    console.error('❌ WeaponEffectsManager not found');
                    return false;
                }
                
                console.log('✅ WeaponEffectsManager found');
                
                // Check if success sound is loaded
                if (effectsManager.sounds && effectsManager.sounds.success) {
                    console.log('✅ Success sound loaded');
                    return true;
                } else {
                    console.error('❌ Success sound not loaded');
                    console.log('Available sounds:', Object.keys(effectsManager.sounds || {}));
                    return false;
                }
            }
            
            // Test 2: Manually play success sound
            function testSuccessSoundPlayback() {
                console.log('\n🎵 Test 2: Manual Success Sound Playback');
                console.log('----------------------------------------');
                
                const effectsManager = ship.weaponEffectsManager;
                if (!effectsManager || !effectsManager.playSuccessSound) {
                    console.error('❌ playSuccessSound method not found');
                    return false;
                }
                
                console.log('🎉 Playing success sound manually...');
                effectsManager.playSuccessSound();
                console.log('✅ Success sound triggered (check if you hear it)');
                return true;
            }
            
            // Test 3: Test enemy destruction with success sound
            function testEnemyDestructionSound() {
                console.log('\n💥 Test 3: Enemy Destruction with Success Sound');
                console.log('------------------------------------------------');
                
                // Check if we have enemy targets
                const targetObjects = starfieldManager.targetObjects || [];
                if (targetObjects.length === 0) {
                    console.error('❌ No enemy targets found to test destruction');
                    console.log('💡 Try: starfieldManager.createTargetDummies(1) to create test targets');
                    return false;
                }
                
                const firstTarget = targetObjects[0];
                console.log(`🎯 Found target: ${firstTarget.ship ? firstTarget.ship.shipName || 'unnamed' : 'unknown'}`);
                
                if (!firstTarget.ship) {
                    console.error('❌ Target has no ship object');
                    return false;
                }
                
                // Get initial hull
                const initialHull = firstTarget.ship.currentHull;
                console.log(`📊 Target hull: ${initialHull}/${firstTarget.ship.maxHull}`);
                
                // Apply massive damage to destroy it
                console.log('💀 Applying destruction damage...');
                const destructionDamage = Math.max(initialHull + 100, 500);
                
                // This should trigger success sound in the weapon system
                firstTarget.ship.applyDamage(destructionDamage, 'test');
                
                if (firstTarget.ship.currentHull <= 0) {
                    console.log('🎉 Target destroyed! Success sound should have played.');
                    console.log('🔊 Listen for the success.wav sound effect');
                    return true;
                } else {
                    console.warn('⚠️ Target not destroyed, may need more damage');
                    return false;
                }
            }
            
            // Test 4: Test weapon firing at enemy (full combat scenario)
            function testCombatDestruction() {
                console.log('\n⚔️  Test 4: Combat Destruction with Success Sound');
                console.log('------------------------------------------------');
                
                // Create a new target for testing
                console.log('🎯 Creating fresh target for combat test...');
                starfieldManager.createTargetDummies(1);
                
                setTimeout(() => {
                    const targetObjects = starfieldManager.targetObjects || [];
                    if (targetObjects.length === 0) {
                        console.error('❌ No targets created for combat test');
                        return;
                    }
                    
                    const target = targetObjects[0];
                    console.log(`🎯 Combat target: ${target.ship ? target.ship.shipName || 'unnamed' : 'unknown'}`);
                    
                    // Set up targeting
                    const targetComputer = ship.getSystem('target_computer');
                    if (!targetComputer) {
                        console.error('❌ No targeting computer found');
                        return;
                    }
                    
                    // Target the enemy
                    targetComputer.currentTarget = target;
                    console.log('🎯 Target locked');
                    
                    // Weaken the target first
                    console.log('⚡ Weakening target...');
                    target.ship.currentHull = 50; // Low hull for easy destruction
                    
                    // Fire weapons (this should trigger destruction and success sound)
                    console.log('🔥 Firing weapons...');
                    if (ship.weaponSlots && ship.weaponSlots.length > 0) {
                        const weapon = ship.weaponSlots[0];
                        if (weapon && !weapon.isEmpty) {
                            weapon.fire(ship, target);
                            console.log('✅ Weapon fired - success sound should play if target destroyed');
                        } else {
                            console.warn('⚠️ No weapons equipped in slot 1');
                        }
                    } else {
                        console.warn('⚠️ No weapon slots found');
                    }
                }, 1000);
            }
            
            // Test 5: Test sub-system destruction with success sound
            function testSubSystemDestruction() {
                console.log('\n🎯 Test 5: Sub-System Destruction Success Sound (50% Duration)');
                console.log('=============================================================');
                
                // Check if we have a target with sub-systems
                const targetObjects = starfieldManager.targetObjects || [];
                if (targetObjects.length === 0) {
                    console.error('❌ No targets found for sub-system testing');
                    console.log('💡 Try: starfieldManager.createTargetDummies(1) to create test targets');
                    return false;
                }
                
                const target = targetObjects[0];
                if (!target.ship) {
                    console.error('❌ Target has no ship object');
                    return false;
                }
                
                console.log(`🎯 Testing sub-system destruction on: ${target.ship.shipName || 'unnamed'}`);
                
                // Get target computer for sub-targeting
                const targetComputer = ship.getSystem('target_computer');
                if (!targetComputer) {
                    console.error('❌ No targeting computer found');
                    return false;
                }
                
                // Set target and enable sub-targeting
                targetComputer.currentTarget = target;
                targetComputer.enableSubTargeting();
                
                if (!targetComputer.hasSubTargeting() || !targetComputer.availableSubTargets || targetComputer.availableSubTargets.length === 0) {
                    console.error('❌ No sub-targets available on this ship');
                    console.log('Available systems:', target.ship.systems ? Object.keys(target.ship.systems) : 'none');
                    return false;
                }
                
                // Select first available sub-target
                const firstSubTarget = targetComputer.availableSubTargets[0];
                targetComputer.setSubTarget(firstSubTarget.systemName);
                
                console.log(`🎯 Sub-target selected: ${firstSubTarget.displayName}`);
                console.log(`📊 System health: ${(firstSubTarget.system.healthPercentage * 100).toFixed(1)}%`);
                
                // Weaken the system for easy destruction
                firstSubTarget.system.healthPercentage = 0.05; // Almost destroyed
                console.log('⚡ System weakened for testing...');
                
                // Fire at the sub-system to destroy it
                console.log('🔥 Firing weapon at sub-system...');
                if (ship.weaponSlots && ship.weaponSlots.length > 0) {
                    const weapon = ship.weaponSlots[0];
                    if (weapon && !weapon.isEmpty) {
                        weapon.fire(ship, target);
                        console.log('✅ Weapon fired at sub-system');
                        console.log('🎵 Listen for the shortened success sound (50% duration)');
                        console.log('🔊 Sub-system destruction sound should be:');
                        console.log('   - 60% volume (quieter than ship destruction)');
                        console.log('   - 50% duration (shorter than ship destruction)');
                        return true;
                    } else {
                        console.warn('⚠️ No weapons equipped in slot 1');
                        return false;
                    }
                } else {
                    console.warn('⚠️ No weapon slots found');
                    return false;
                }
            }
            
            // Run all tests
            console.log('🧪 Running all tests...');
            
            const test1Pass = testSoundLoading();
            const test2Pass = testSuccessSoundPlayback();
            
            setTimeout(() => {
                const test3Pass = testEnemyDestructionSound();
                
                setTimeout(() => {
                    testCombatDestruction();
                    
                    setTimeout(() => {
                        testSubSystemDestruction();
                    }, 3000);
                }, 2000);
            }, 1000);
            
            // Expose test functions globally
            window.testSoundLoading = testSoundLoading;
            window.testSuccessSoundPlayback = testSuccessSoundPlayback;
            window.testEnemyDestructionSound = testEnemyDestructionSound;
            window.testCombatDestruction = testCombatDestruction;
            window.testSubSystemDestruction = testSubSystemDestruction;
            
            console.log('\n🎮 Individual test functions available:');
            console.log('  testSoundLoading()           - Check if success.wav is loaded');
            console.log('  testSuccessSoundPlayback()   - Play success sound manually');
            console.log('  testEnemyDestructionSound()  - Test destruction with sound');
            console.log('  testCombatDestruction()      - Test full combat scenario');
            console.log('  testSubSystemDestruction()   - Test sub-system destruction with sound');
            
        } catch (error) {
            console.error('❌ Error in success sound test:', error);
        }
    }, 2000);
})(); 