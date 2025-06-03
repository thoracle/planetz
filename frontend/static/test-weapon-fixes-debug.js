(function() {
    console.log('🔧 WEAPON FIXES DEBUG - Testing all fixes...');
    
    function testWeaponFixes() {
        const ship = window.ship || (window.starfieldManager && window.starfieldManager.viewManager ? window.starfieldManager.viewManager.getShip() : null);
        
        if (!ship) {
            console.error('❌ No ship found');
            return;
        }
        
        if (!ship.weaponSystem) {
            console.error('❌ No weapon system found');
            return;
        }
        
        console.log('\n🔍 TESTING WEAPON FIXES:');
        
        // Test 1: WeaponHUD Connection
        console.log('\n1. WeaponHUD Connection Test:');
        const hudConnected = ship.weaponSystem.weaponHUD ? 'Yes' : 'No';
        console.log(`   • WeaponHUD connected: ${hudConnected}`);
        
        if (ship.weaponSystem.weaponHUD) {
            console.log(`   ✅ WeaponHUD properly connected`);
            
            // Test highlight update
            const originalIndex = ship.weaponSystem.activeSlotIndex;
            ship.weaponSystem.updateActiveWeaponHighlight();
            console.log(`   • HUD highlight updated for slot ${originalIndex}`);
        } else {
            console.log(`   ❌ WeaponHUD not connected`);
        }
        
        // Test 2: Autofire Behavior
        console.log('\n2. Autofire Test:');
        const originalAutofireState = ship.weaponSystem.isAutofireOn;
        console.log(`   • Current autofire state: ${originalAutofireState ? 'ON' : 'OFF'}`);
        console.log(`   • Active weapon slot: ${ship.weaponSystem.activeSlotIndex}`);
        
        // Check weapon autofire settings
        ship.weaponSystem.weaponSlots.forEach((slot, index) => {
            if (!slot.isEmpty) {
                const autofireEnabled = slot.equippedWeapon.autofireEnabled;
                console.log(`   • Slot ${index} (${slot.equippedWeapon.name}): autofireEnabled = ${autofireEnabled}`);
            }
        });
        
        if (!originalAutofireState) {
            console.log('   • Testing autofire toggle...');
            ship.weaponSystem.toggleAutofire();
            console.log(`   • Autofire toggled to: ${ship.weaponSystem.isAutofireOn ? 'ON' : 'OFF'}`);
            
            // Toggle back
            ship.weaponSystem.toggleAutofire();
            console.log(`   • Autofire restored to: ${ship.weaponSystem.isAutofireOn ? 'ON' : 'OFF'}`);
        }
        
        // Test 3: Weapon Selection
        console.log('\n3. Weapon Selection Test:');
        const originalActiveSlot = ship.weaponSystem.activeSlotIndex;
        
        console.log('   • Testing weapon cycling...');
        for (let i = 0; i < 4; i++) {
            const success = ship.weaponSystem.selectNextWeapon();
            const newSlot = ship.weaponSystem.activeSlotIndex;
            const weapon = ship.weaponSystem.getActiveWeapon();
            const weaponName = weapon && !weapon.isEmpty ? weapon.equippedWeapon.name : 'Empty';
            
            console.log(`     Step ${i+1}: Slot ${newSlot} (${weaponName}) - success: ${success}`);
        }
        
        // Restore original slot
        ship.weaponSystem.activeSlotIndex = originalActiveSlot;
        ship.weaponSystem.updateActiveWeaponHighlight();
        
        // Test 4: Damage Control Integration
        console.log('\n4. Damage Control Integration Test:');
        
        if (window.starfieldManager && window.starfieldManager.damageControlHUD) {
            console.log('   • Damage control HUD found');
            
            // Test if weapons show up in damage control
            const shipStatus = ship.getStatus();
            const hasWeaponSystems = Object.keys(shipStatus.systems).filter(name => 
                ['weapons', 'laser_cannon', 'pulse_cannon', 'plasma_cannon', 'phaser_array'].includes(name)
            );
            
            console.log(`   • Individual weapon systems in ship status: ${hasWeaponSystems.length}`);
            console.log(`   • Unified weapon system exists: ${ship.weaponSystem ? 'Yes' : 'No'}`);
            
            if (ship.weaponSystem) {
                const weaponStatus = ship.weaponSystem.getStatus();
                console.log(`   • Unified weapon system - ${weaponStatus.equippedWeapons}/${weaponStatus.maxWeaponSlots} weapons equipped`);
            }
        } else {
            console.log('   • No damage control HUD found');
        }
        
        // Test 5: Manual Fire Test
        console.log('\n5. Manual Fire Test:');
        const activeWeapon = ship.weaponSystem.getActiveWeapon();
        if (activeWeapon && !activeWeapon.isEmpty) {
            const canFire = activeWeapon.canFire();
            console.log(`   • Active weapon: ${activeWeapon.equippedWeapon.name}`);
            console.log(`   • Can fire: ${canFire}`);
            console.log(`   • In cooldown: ${activeWeapon.isInCooldown()}`);
            console.log(`   • Cooldown timer: ${activeWeapon.cooldownTimer}ms`);
        } else {
            console.log('   • No active weapon or slot is empty');
        }
        
        console.log('\n🔧 Weapon fixes test complete!');
    }
    
    // Manual test functions
    window.testWeaponFixes = testWeaponFixes;
    
    window.testAutofireOnly = function() {
        console.log('🔥 Testing autofire behavior...');
        const ship = window.ship || (window.starfieldManager && window.starfieldManager.viewManager ? window.starfieldManager.viewManager.getShip() : null);
        
        if (ship && ship.weaponSystem) {
            const wasOn = ship.weaponSystem.isAutofireOn;
            
            console.log(`Current autofire: ${wasOn ? 'ON' : 'OFF'}`);
            console.log(`Active slot: ${ship.weaponSystem.activeSlotIndex}`);
            
            // Toggle autofire on
            if (!wasOn) {
                ship.weaponSystem.toggleAutofire();
                console.log('Autofire turned ON');
                
                setTimeout(() => {
                    ship.weaponSystem.toggleAutofire();
                    console.log('Autofire turned OFF');
                }, 3000);
            }
        }
    };
    
    window.testWeaponCycling = function() {
        console.log('🔄 Testing weapon cycling...');
        const ship = window.ship || (window.starfieldManager && window.starfieldManager.viewManager ? window.starfieldManager.viewManager.getShip() : null);
        
        if (ship && ship.weaponSystem) {
            const originalSlot = ship.weaponSystem.activeSlotIndex;
            
            console.log(`Starting from slot ${originalSlot}`);
            
            for (let i = 0; i < 6; i++) {
                setTimeout(() => {
                    ship.weaponSystem.selectNextWeapon();
                    const currentSlot = ship.weaponSystem.activeSlotIndex;
                    const weapon = ship.weaponSystem.getActiveWeapon();
                    const weaponName = weapon && !weapon.isEmpty ? weapon.equippedWeapon.name : 'Empty';
                    console.log(`Step ${i+1}: Now on slot ${currentSlot} (${weaponName})`);
                }, i * 1000);
            }
        }
    };
    
    window.forceHUDConnection = function() {
        console.log('🔗 Forcing HUD connection...');
        const starfieldManager = window.starfieldManager;
        
        if (starfieldManager) {
            starfieldManager.connectWeaponHUDToSystem();
            console.log('HUD connection attempted');
            
            setTimeout(() => {
                testWeaponFixes();
            }, 1000);
        }
    };
    
    // Run test after delay
    setTimeout(() => {
        if (window.starfieldManager && window.starfieldManager.viewManager) {
            testWeaponFixes();
        }
    }, 2000);
    
    console.log('💡 Manual test functions available:');
    console.log('   testWeaponFixes() - Run all weapon fix tests');
    console.log('   testAutofireOnly() - Test autofire active-weapon-only behavior');
    console.log('   testWeaponCycling() - Test weapon selection cycling');
    console.log('   forceHUDConnection() - Force WeaponHUD connection');
})(); 