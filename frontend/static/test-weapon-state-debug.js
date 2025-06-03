(function() {
    console.log('🔫 WEAPON STATE DEBUG - Checking current weapon slot states...');
    
    function checkWeaponStates() {
        const ship = window.ship || (window.starfieldManager && window.starfieldManager.viewManager ? window.starfieldManager.viewManager.getShip() : null);
        
        if (!ship) {
            console.error('❌ No ship found');
            return;
        }
        
        if (!ship.weaponSystem) {
            console.error('❌ No weapon system found');
            return;
        }
        
        console.log('\n🔍 WEAPON SYSTEM STATE:');
        console.log(`   • Active slot index: ${ship.weaponSystem.activeSlotIndex}`);
        console.log(`   • Max weapon slots: ${ship.weaponSystem.maxWeaponSlots}`);
        console.log(`   • Weapon HUD connected: ${ship.weaponSystem.weaponHUD ? 'Yes' : 'No'}`);
        
        console.log('\n🔍 WEAPON SLOT DETAILS:');
        ship.weaponSystem.weaponSlots.forEach((slot, index) => {
            const activeMarker = index === ship.weaponSystem.activeSlotIndex ? '👉' : '  ';
            console.log(`${activeMarker} Slot ${index}:`);
            console.log(`     • isEmpty: ${slot.isEmpty}`);
            console.log(`     • equippedWeapon: ${slot.equippedWeapon ? slot.equippedWeapon.name : 'null'}`);
            console.log(`     • weapon (legacy): ${slot.weapon ? slot.weapon.name : 'null'}`);
            console.log(`     • cooldownTimer: ${slot.cooldownTimer}`);
            console.log(`     • canFire(): ${slot.canFire()}`);
            console.log(`     • isInCooldown(): ${slot.isInCooldown()}`);
        });
        
        console.log('\n🔍 WEAPON SELECTION TEST:');
        console.log('Testing selectNextWeapon() cycles...');
        
        const originalIndex = ship.weaponSystem.activeSlotIndex;
        const visitedSlots = [];
        let currentIndex = originalIndex;
        
        for (let i = 0; i < 10; i++) { // Max 10 iterations to prevent infinite loops
            visitedSlots.push(currentIndex);
            
            const success = ship.weaponSystem.selectNextWeapon();
            const newIndex = ship.weaponSystem.activeSlotIndex;
            
            console.log(`   Step ${i+1}: ${currentIndex} → ${newIndex} (success: ${success})`);
            
            if (newIndex === originalIndex && i > 0) {
                console.log('   ✅ Full cycle completed');
                break;
            }
            
            if (!success) {
                console.log('   ⚠️ selectNextWeapon() returned false');
                break;
            }
            
            currentIndex = newIndex;
        }
        
        console.log(`   Visited slots: [${visitedSlots.join(', ')}]`);
        
        // Reset to original position
        ship.weaponSystem.activeSlotIndex = originalIndex;
        
        console.log('\n🔍 HUD STATE CHECK:');
        if (ship.weaponSystem.weaponHUD) {
            const hudElement = ship.weaponSystem.weaponHUD.weaponSlotsDisplay;
            if (hudElement && hudElement.children) {
                console.log(`   • HUD slots count: ${hudElement.children.length}`);
                
                for (let i = 0; i < hudElement.children.length; i++) {
                    const slotElement = hudElement.children[i];
                    const borderColor = slotElement.style.borderColor;
                    const isHighlighted = borderColor === 'rgb(0, 255, 0)' || borderColor === '#00ff00';
                    
                    console.log(`   • HUD Slot ${i}: highlighted=${isHighlighted}, border=${borderColor}`);
                }
            } else {
                console.log('   • HUD element not found or has no children');
            }
        } else {
            console.log('   • No WeaponHUD reference in weapon system');
        }
    }
    
    // Manual functions for console testing
    window.checkWeaponStates = checkWeaponStates;
    window.testWeaponCycle = function() {
        console.log('🔄 Manual weapon cycle test...');
        checkWeaponStates();
    };
    
    window.forceHUDUpdate = function() {
        console.log('🎨 Forcing HUD update...');
        const ship = window.ship || (window.starfieldManager && window.starfieldManager.viewManager ? window.starfieldManager.viewManager.getShip() : null);
        if (ship && ship.weaponSystem) {
            ship.weaponSystem.updateActiveWeaponHighlight();
            console.log('✅ HUD highlight update called');
        }
    };
    
    // Run check after delay
    setTimeout(() => {
        if (window.starfieldManager && window.starfieldManager.viewManager) {
            checkWeaponStates();
        }
    }, 2000);
    
    console.log('💡 Manual test functions available:');
    console.log('   checkWeaponStates() - Check current weapon states');
    console.log('   testWeaponCycle() - Test weapon cycling');
    console.log('   forceHUDUpdate() - Force HUD highlight update');
})(); 