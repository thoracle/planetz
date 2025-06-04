// Weapon-Based Sub-targeting Test
// Run this in the browser console to test sub-targeting visibility based on weapon type

(function() {
    console.log('=== Weapon-Based Sub-targeting Test ===');
    
    // Get the game components
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    const targetComputer = ship?.getSystem('target_computer');
    const weaponSystem = ship?.weaponSystem;
    
    if (!starfieldManager || !ship || !targetComputer || !weaponSystem) {
        console.error('❌ Game not ready. Make sure you have a ship, targeting computer, and weapon system.');
        return;
    }
    
    // Ensure we have target dummy ships
    if (!starfieldManager.targetDummyShips || starfieldManager.targetDummyShips.length === 0) {
        console.log('🎯 Creating target dummy ships for testing...');
        starfieldManager.createTargetDummyShips(3);
        setTimeout(() => runWeaponSubTargetingTest(), 1000);
        return;
    }
    
    function runWeaponSubTargetingTest() {
        console.log('🎯 Testing weapon-based sub-targeting visibility...');
        
        // Ensure target computer is enabled
        if (!starfieldManager.targetComputerEnabled) {
            console.log('🎯 Enabling target computer...');
            starfieldManager.toggleTargetComputer();
        }
        
        // Target an enemy ship
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
        
        console.log('📊 Current weapon status:');
        const weaponStatus = weaponSystem.getStatus();
        console.log(`   • Active slot: ${weaponStatus.activeSlotIndex}`);
        console.log(`   • Equipped weapons: ${weaponStatus.equippedWeapons}`);
        
        const activeWeapon = weaponSystem.getActiveWeapon();
        if (!activeWeapon || activeWeapon.isEmpty) {
            console.error('❌ No active weapon equipped for testing');
            console.log('   • Please equip weapons to test slots');
            return;
        }
        
        console.log(`   • Active weapon: ${activeWeapon.equippedWeapon.name}`);
        console.log(`   • Weapon type: ${activeWeapon.equippedWeapon.weaponType}`);
        
        // Test current weapon type
        function testCurrentWeapon() {
            const weapon = weaponSystem.getActiveWeapon();
            if (!weapon || weapon.isEmpty) {
                console.log('❌ No weapon equipped in active slot');
                return;
            }
            
            const weaponType = weapon.equippedWeapon.weaponType;
            const weaponName = weapon.equippedWeapon.name;
            
            console.log(`\n🔫 Testing with ${weaponName} (${weaponType})`);
            
            // Force update the target display to see sub-targeting visibility
            starfieldManager.updateTargetDisplay();
            
            // Check if sub-targeting should be visible
            const shouldShow = (weaponType === 'scan-hit');
            console.log(`   • Sub-targeting should be ${shouldShow ? 'VISIBLE' : 'HIDDEN'}`);
            
            // Check HUD for sub-targeting elements
            const hudElement = document.getElementById('target-computer-hud');
            if (hudElement) {
                const targetInfo = hudElement.querySelector('.target-info-display');
                if (targetInfo) {
                    const hasSubTargetInfo = targetInfo.innerHTML.includes('TARGET SYSTEM');
                    console.log(`   • Sub-targeting in HUD: ${hasSubTargetInfo ? 'VISIBLE' : 'HIDDEN'}`);
                    
                    if (shouldShow === hasSubTargetInfo) {
                        console.log(`   ✅ Correct - sub-targeting visibility matches weapon type`);
                    } else {
                        console.log(`   ❌ Incorrect - sub-targeting visibility doesn't match weapon type`);
                    }
                } else {
                    console.log('   ❌ Target info display not found');
                }
            } else {
                console.log('   ❌ Target computer HUD not found');
            }
            
            // Test key bindings
            console.log('   • Testing sub-targeting key response...');
            if (weaponType === 'scan-hit') {
                console.log('     • < > keys should work (play success/fail sounds)');
            } else {
                console.log('     • < > keys should play fail sound and log message');
            }
        }
        
        // Test with current weapon
        testCurrentWeapon();
        
        // Test weapon cycling
        console.log('\n🔄 Testing weapon cycling effects:');
        console.log('   • Use Z/X keys to switch weapons and observe sub-targeting visibility');
        console.log('   • Scan-hit weapons (lasers, plasma): sub-targeting visible');
        console.log('   • Splash-damage weapons (missiles, torpedoes): sub-targeting hidden');
        
        // Helper function for manual testing
        window.testWeaponSubTargeting = function() {
            console.log('\n🔄 Manual Test Triggered:');
            testCurrentWeapon();
        };
        
        console.log('\n💡 Manual testing:');
        console.log('   • Use testWeaponSubTargeting() to check current weapon');
        console.log('   • Switch weapons with Z/X and observe HUD changes');
        console.log('   • Try < > keys with different weapon types');
        
        return 'Weapon-based sub-targeting test setup complete';
    }
    
    runWeaponSubTargetingTest();
})(); 