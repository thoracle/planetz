// Sub-targeting Sound Test
// Run this in the browser console to test sub-targeting sound feedback

(function() {
    console.log('=== Sub-targeting Sound Test ===');
    
    // Get the game components
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    const targetComputer = ship?.getSystem('target_computer');
    
    if (!starfieldManager || !ship || !targetComputer) {
        console.error('❌ Game not ready. Make sure you have a ship and targeting computer.');
        console.log('💡 1. Load the game at http://localhost:5001');
        console.log('💡 2. Press T to enable target computer');
        console.log('💡 3. Press Ctrl+Shift+D to create target dummies');
        console.log('💡 4. Press Tab to target an enemy ship');
        console.log('💡 5. Run this test again');
        return;
    }
    
    // Ensure we have target dummy ships
    if (!starfieldManager.targetDummyShips || starfieldManager.targetDummyShips.length === 0) {
        console.log('🎯 Creating target dummy ships for testing...');
        starfieldManager.createTargetDummyShips(3);
        setTimeout(() => runSubTargetingTest(), 1000);
        return;
    }
    
    function runSubTargetingTest() {
        console.log('🎯 Testing sub-targeting sound feedback...');
        
        // Ensure target computer is enabled
        if (!starfieldManager.targetComputerEnabled) {
            console.log('🎯 Enabling target computer...');
            starfieldManager.toggleTargetComputer();
        }
        
        // Cycle to an enemy ship target
        starfieldManager.updateTargetList();
        if (starfieldManager.targetObjects.length === 0) {
            console.error('❌ No targets available');
            return;
        }
        
        // Find an enemy ship target
        let foundEnemyShip = false;
        for (let i = 0; i < starfieldManager.targetObjects.length; i++) {
            starfieldManager.cycleTarget();
            const currentTarget = starfieldManager.getCurrentTargetData();
            if (currentTarget?.isShip && currentTarget?.ship) {
                foundEnemyShip = true;
                console.log(`✅ Targeting enemy ship: ${currentTarget.name}`);
                break;
            }
        }
        
        if (!foundEnemyShip) {
            console.error('❌ No enemy ships found in target list');
            return;
        }
        
        // Check sub-targeting capabilities
        if (!targetComputer.hasSubTargeting()) {
            console.error('❌ Target computer does not have sub-targeting capability');
            return;
        }
        
        console.log('📊 Current sub-targeting state:');
        console.log(`   • Available sub-targets: ${targetComputer.availableSubTargets.length}`);
        console.log(`   • Current sub-target: ${targetComputer.currentSubTarget?.displayName || 'none'}`);
        
        if (targetComputer.availableSubTargets.length === 0) {
            console.error('❌ No sub-targets available on current enemy ship');
            return;
        }
        
        // Test the new functionality
        console.log('\n🔊 Testing new sub-targeting sound feedback:');
        
        if (targetComputer.availableSubTargets.length === 1) {
            console.log('✅ Perfect! Enemy ship has exactly 1 sub-target for testing');
            console.log('🔊 When you press < or > keys, you should hear COMMAND FAILED sound');
            console.log('   • This is because there\'s only one target, so cycling is pointless');
        } else if (targetComputer.availableSubTargets.length > 1) {
            console.log(`📝 Enemy ship has ${targetComputer.availableSubTargets.length} sub-targets`);
            console.log('🔊 When you press < or > keys:');
            console.log('   • First cycles should play SUCCESS sound (normal cycling)');
            console.log('   • When only 1 target left, should play FAILED sound');
            
            // Demonstrate the functionality
            console.log('\n🧪 Demonstrating sub-target reduction:');
            
            // Damage all but one system to test the "only one target left" scenario
            const enemyShip = starfieldManager.getCurrentTargetData().ship;
            let damagedCount = 0;
            
            for (const [systemName, system] of enemyShip.systems) {
                if (targetComputer.availableSubTargets.some(t => t.systemName === systemName)) {
                    if (damagedCount < targetComputer.availableSubTargets.length - 1) {
                        // Damage this system to remove it from targeting
                        system.takeDamage(system.maxHealth * 0.9); // 90% damage
                        damagedCount++;
                        console.log(`   💥 Damaged ${systemName} to remove from targeting`);
                    }
                }
            }
            
            // Update sub-targets to reflect damage
            targetComputer.updateSubTargets();
            
            console.log(`📊 After damage:`);
            console.log(`   • Available sub-targets: ${targetComputer.availableSubTargets.length}`);
            
            if (targetComputer.availableSubTargets.length === 1) {
                console.log('✅ Perfect! Now exactly 1 sub-target remains');
                console.log('🔊 Pressing < or > should now play COMMAND FAILED sound');
            }
        }
        
        // Test manual key simulation
        console.log('\n🎮 Manual Testing Instructions:');
        console.log('   • Press "<" or "," to cycle backward through sub-targets');
        console.log('   • Press ">" or "." to cycle forward through sub-targets');
        console.log('   • Listen for the sound differences:');
        console.log('     - 🔊 Success sound: Normal "beep" when cycling works');
        console.log('     - 🔊 Failed sound: "buzzer" when only 1 target available');
        
        // Helper functions for testing
        window.testSubTargetingSounds = function() {
            console.log('\n=== Manual Test Function ===');
            console.log(`Available sub-targets: ${targetComputer.availableSubTargets.length}`);
            if (targetComputer.availableSubTargets.length <= 1) {
                console.log('🔊 Expected: COMMAND FAILED sound when pressing < or >');
            } else {
                console.log('🔊 Expected: SUCCESS sound when pressing < or >');
            }
        };
        
        window.damageMoreSystems = function() {
            const enemyShip = starfieldManager.getCurrentTargetData().ship;
            let damaged = 0;
            for (const [systemName, system] of enemyShip.systems) {
                if (targetComputer.availableSubTargets.some(t => t.systemName === systemName) && damaged < 1) {
                    system.takeDamage(system.maxHealth * 0.9);
                    damaged++;
                    console.log(`💥 Damaged ${systemName}`);
                }
            }
            targetComputer.updateSubTargets();
            console.log(`📊 Sub-targets remaining: ${targetComputer.availableSubTargets.length}`);
        };
        
        window.restoreAllSystems = function() {
            const enemyShip = starfieldManager.getCurrentTargetData().ship;
            for (const [systemName, system] of enemyShip.systems) {
                system.currentHealth = system.maxHealth;
                console.log(`🔧 Restored ${systemName}`);
            }
            targetComputer.updateSubTargets();
            console.log(`📊 Sub-targets available: ${targetComputer.availableSubTargets.length}`);
        };
        
        // Final status
        console.log('\n📊 Final Status:');
        console.log(`   • Target: ${starfieldManager.getCurrentTargetData()?.name}`);
        console.log(`   • Sub-targets available: ${targetComputer.availableSubTargets.length}`);
        console.log(`   • Current sub-target: ${targetComputer.currentSubTarget?.displayName || 'none'}`);
        
        console.log('\n🎮 Available test functions:');
        console.log('   • testSubTargetingSounds() - Check current sound expectations');
        console.log('   • damageMoreSystems() - Reduce available sub-targets');
        console.log('   • restoreAllSystems() - Restore all systems to test multiple targets');
        
        return 'Sub-targeting sound test complete';
    }
    
    runSubTargetingTest();
})(); 