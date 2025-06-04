(function() {
    console.log('🧪 WEAPON HUD DOCKING TEST - Testing weapon HUD visibility during dock/undock...');
    
    function testWeaponHUDDocking() {
        const starfieldManager = window.starfieldManager;
        
        if (!starfieldManager) {
            console.error('❌ StarfieldManager not found');
            return;
        }
        
        console.log('✅ Found StarfieldManager, checking weapon HUD...');
        
        // Check weapon HUD exists
        if (!starfieldManager.weaponHUD) {
            console.error('❌ Weapon HUD not found');
            return;
        }
        
        const weaponHUD = starfieldManager.weaponHUD;
        console.log('✅ Found WeaponHUD');
        
        // Check all HUD elements exist
        const elements = {
            weaponSlotsDisplay: weaponHUD.weaponSlotsDisplay,
            autofireIndicator: weaponHUD.autofireIndicator,
            targetLockIndicator: weaponHUD.targetLockIndicator,
            messageDisplay: weaponHUD.messageDisplay
        };
        
        for (const [name, element] of Object.entries(elements)) {
            if (element) {
                console.log(`✅ ${name} found (display: ${element.style.display || 'default'})`);
            } else {
                console.error(`❌ ${name} not found`);
                return;
            }
        }
        
        // Show current docking state
        console.log(`📊 Current docking state: ${starfieldManager.isDocked ? 'DOCKED' : 'UNDOCKED'}`);
        
        // Test visibility based on docking state
        if (starfieldManager.isDocked) {
            console.log('🚪 Ship is docked - weapon HUD should be hidden');
            const weaponSlotsVisible = elements.weaponSlotsDisplay.style.display !== 'none';
            console.log(`   • weaponSlotsDisplay visible: ${weaponSlotsVisible ? 'YES ❌ SHOULD BE HIDDEN' : 'NO ✅'}`);
            console.log(`   • autofireIndicator visible: ${elements.autofireIndicator.style.display !== 'none' ? 'YES ❌ SHOULD BE HIDDEN' : 'NO ✅'}`);
            console.log(`   • targetLockIndicator visible: ${elements.targetLockIndicator.style.display !== 'none' ? 'YES ❌ SHOULD BE HIDDEN' : 'NO ✅'}`);
            console.log(`   • messageDisplay visible: ${elements.messageDisplay.style.display !== 'none' ? 'YES ❌ SHOULD BE HIDDEN' : 'NO ✅'}`);
        } else {
            console.log('🚀 Ship is undocked - weapon HUD should be visible');
            const weaponSlotsVisible = elements.weaponSlotsDisplay.style.display === 'flex' || elements.weaponSlotsDisplay.style.display === '';
            console.log(`   • weaponSlotsDisplay visible: ${weaponSlotsVisible ? 'YES ✅' : 'NO ❌ SHOULD BE VISIBLE'}`);
            console.log(`   • autofireIndicator ready: ${elements.autofireIndicator.style.display === 'none' ? 'YES ✅' : 'ALWAYS ON ❌'}`);
            console.log(`   • targetLockIndicator ready: ${elements.targetLockIndicator.style.display === 'none' ? 'YES ✅' : 'ALWAYS ON ❌'}`);
            console.log(`   • messageDisplay ready: ${elements.messageDisplay.style.display === 'none' ? 'YES ✅' : 'ALWAYS ON ❌'}`);
        }
        
        console.log('✅ Weapon HUD docking test complete');
    }
    
    function testDockingTransition() {
        const starfieldManager = window.starfieldManager;
        
        if (!starfieldManager) {
            console.error('❌ StarfieldManager not found');
            return;
        }
        
        console.log('🔄 Testing docking transition...');
        
        // Get current target if available
        if (!starfieldManager.currentTarget) {
            console.log('⚠️ No current target - cannot test docking');
            return;
        }
        
        const currentDockingState = starfieldManager.isDocked;
        
        if (currentDockingState) {
            console.log('🚀 Currently docked - testing undocking...');
            starfieldManager.undock();
            
            setTimeout(() => {
                testWeaponHUDDocking();
            }, 1000);
        } else {
            console.log('🚪 Currently undocked - testing docking...');
            if (starfieldManager.canDock(starfieldManager.currentTarget)) {
                starfieldManager.dock(starfieldManager.currentTarget);
                
                setTimeout(() => {
                    testWeaponHUDDocking();
                }, 1000);
            } else {
                console.log('⚠️ Cannot dock with current target');
            }
        }
    }
    
    function waitForGameAndTest() {
        const checkReady = () => {
            if (window.starfieldManager && window.starfieldManager.weaponHUD) {
                console.log('🎮 Game ready, running weapon HUD docking test...');
                testWeaponHUDDocking();
                
                // Add command to test docking transitions
                window.testWeaponHUDDocking = testWeaponHUDDocking;
                window.testDockingTransition = testDockingTransition;
                
                console.log('💡 Available commands:');
                console.log('   • testWeaponHUDDocking() - Check current weapon HUD state');
                console.log('   • testDockingTransition() - Test dock/undock transition');
            } else {
                setTimeout(checkReady, 1000);
            }
        };
        checkReady();
    }
    
    waitForGameAndTest();
})(); 