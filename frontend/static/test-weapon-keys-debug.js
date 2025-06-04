/**
 * Real-time Weapon Key Debug Script
 * Tests X and Z key weapon switching in real-time
 */

(function() {
    console.log('🔫 Real-time Weapon Key Debug Script Started');
    console.log('==============================================');
    console.log('Press X or Z to test weapon switching while this script runs...');
    
    // Monitor key events in real-time
    function addKeyListener() {
        document.addEventListener('keydown', function testWeaponKeys(event) {
            if (event.key === 'x' || event.key === 'X' || event.key === 'z' || event.key === 'Z') {
                console.log(`\n🎯 ${event.key.toUpperCase()} KEY PRESSED!`);
                
                // Check if we're docked (should prevent weapon switching)
                const starfieldManager = window.starfieldManager;
                if (starfieldManager && starfieldManager.isDocked) {
                    console.log('❌ Cannot switch weapons: Ship is docked');
                    return;
                }
                
                // Get ship and weapon system
                const ship = window.ship || (starfieldManager && starfieldManager.viewManager ? starfieldManager.viewManager.getShip() : null);
                
                if (!ship) {
                    console.log('❌ No ship found');
                    return;
                }
                
                if (!ship.weaponSystem) {
                    console.log('❌ No weapon system found on ship');
                    return;
                }
                
                console.log('✅ Ship and weapon system available');
                console.log(`Before: Active weapon slot ${ship.weaponSystem.activeSlotIndex}`);
                
                // Test the method directly to see if it's working
                if (event.key === 'x' || event.key === 'X') {
                    console.log('🔄 Calling selectNextWeapon()...');
                    const result = ship.weaponSystem.selectNextWeapon();
                    console.log(`Result: ${result}`);
                } else {
                    console.log('🔄 Calling selectPreviousWeapon()...');
                    const result = ship.weaponSystem.selectPreviousWeapon();
                    console.log(`Result: ${result}`);
                }
                
                setTimeout(() => {
                    console.log(`After: Active weapon slot ${ship.weaponSystem.activeSlotIndex}`);
                    
                    // Show available weapon slots
                    console.log('Available weapons:');
                    ship.weaponSystem.weaponSlots.forEach((slot, index) => {
                        const marker = index === ship.weaponSystem.activeSlotIndex ? '👉' : '  ';
                        console.log(`${marker} Slot ${index}: ${slot.weapon ? slot.weapon.name : 'Empty'}`);
                    });
                }, 50);
            }
        });
        
        console.log('✅ Key listener added. Try pressing X or Z now...');
    }
    
    // Wait for game to load
    if (window.starfieldManager && window.starfieldManager.viewManager) {
        addKeyListener();
    } else {
        console.log('⏳ Waiting for game to load...');
        setTimeout(() => {
            if (window.starfieldManager && window.starfieldManager.viewManager) {
                addKeyListener();
            } else {
                console.log('❌ Game not loaded after waiting');
            }
        }, 2000);
    }
    
    // Manual test functions for console debugging
    window.testWeaponX = function() {
        console.log('🔫 Manual X key test...');
        const ship = window.ship || (window.starfieldManager && window.starfieldManager.viewManager ? window.starfieldManager.viewManager.getShip() : null);
        if (ship && ship.weaponSystem) {
            console.log(`Before: Slot ${ship.weaponSystem.activeSlotIndex}`);
            const result = ship.weaponSystem.selectNextWeapon();
            console.log(`After: Slot ${ship.weaponSystem.activeSlotIndex}, Result: ${result}`);
        }
    };
    
    window.testWeaponZ = function() {
        console.log('🔫 Manual Z key test...');
        const ship = window.ship || (window.starfieldManager && window.starfieldManager.viewManager ? window.starfieldManager.viewManager.getShip() : null);
        if (ship && ship.weaponSystem) {
            console.log(`Before: Slot ${ship.weaponSystem.activeSlotIndex}`);
            const result = ship.weaponSystem.selectPreviousWeapon();
            console.log(`After: Slot ${ship.weaponSystem.activeSlotIndex}, Result: ${result}`);
        }
    };
    
    console.log('💡 Manual test functions available:');
    console.log('   testWeaponX() - Test next weapon');
    console.log('   testWeaponZ() - Test previous weapon');
    
})(); 