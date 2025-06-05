(function() {
    console.log('🎨 WEAPON HIGHLIGHT DEBUG - Testing HUD highlighting...');
    
    function testHighlightSystem() {
        const ship = window.ship || (window.starfieldManager && window.starfieldManager.viewManager ? window.starfieldManager.viewManager.getShip() : null);
        
        if (!ship) {
            console.error('❌ No ship found');
            return;
        }
        
        if (!ship.weaponSystem) {
            console.error('❌ No weapon system found');
            return;
        }
        
        console.log('\n🔍 WEAPON HUD CONNECTION TEST:');
        console.log(`   • WeaponSystemCore exists: Yes`);
        console.log(`   • weaponHUD reference: ${ship.weaponSystem.weaponHUD ? 'Connected' : 'Not connected'}`);
        console.log(`   • Active slot index: ${ship.weaponSystem.activeSlotIndex}`);
        
        if (!ship.weaponSystem.weaponHUD) {
            console.error('❌ WeaponHUD not connected to weapon system');
            console.log('   • Trying to re-establish connection...');
            
            // Try to find and connect HUD
            if (window.starfieldManager && window.starfieldManager.weaponHUD) {
                ship.weaponSystem.setWeaponHUD(window.starfieldManager.weaponHUD);
                console.log('   ✅ HUD connection re-established');
            }
        }
        
        // Test HUD element structure
        const weaponHUD = ship.weaponSystem.weaponHUD;
        if (weaponHUD) {
            console.log('\n🔍 HUD ELEMENT TEST:');
            console.log(`   • weaponSlotsDisplay exists: ${weaponHUD.weaponSlotsDisplay ? 'Yes' : 'No'}`);
            
            if (weaponHUD.weaponSlotsDisplay) {
                const slots = weaponHUD.weaponSlotsDisplay.children;
                console.log(`   • Number of HUD slots: ${slots.length}`);
                
                for (let i = 0; i < slots.length; i++) {
                    const slot = slots[i];
                    const borderColor = slot.style.borderColor;
                    const isHighlighted = borderColor === 'rgb(0, 255, 0)' || borderColor === '#00ff00';
                    
                    console.log(`   • Slot ${i}: border=${borderColor}, highlighted=${isHighlighted}`);
                }
            }
        }
        
        // Test highlight update function
        console.log('\n🔍 HIGHLIGHT UPDATE TEST:');
        const originalIndex = ship.weaponSystem.activeSlotIndex;
        
        console.log(`   • Original active slot: ${originalIndex}`);
        
        // Test updating highlight manually
        if (weaponHUD) {
            console.log('   • Calling updateActiveWeaponHighlight()...');
            weaponHUD.updateActiveWeaponHighlight(originalIndex);
            
            // Check if highlight was applied
            setTimeout(() => {
                const slots = weaponHUD.weaponSlotsDisplay.children;
                let highlightedCount = 0;
                let highlightedSlot = -1;
                
                for (let i = 0; i < slots.length; i++) {
                    const slot = slots[i];
                    const borderColor = slot.style.borderColor;
                    const isHighlighted = borderColor === 'rgb(0, 255, 0)' || borderColor === '#00ff00';
                    
                    if (isHighlighted) {
                        highlightedCount++;
                        highlightedSlot = i;
                    }
                }
                
                console.log(`   • Highlighted slots after update: ${highlightedCount}`);
                console.log(`   • Highlighted slot index: ${highlightedSlot}`);
                console.log(`   • Expected slot index: ${originalIndex}`);
                
                if (highlightedSlot === originalIndex) {
                    console.log('   ✅ Highlight is correct');
                } else {
                    console.log('   ❌ Highlight mismatch');
                }
            }, 100);
        }
    }
    
    function testWeaponSwitching() {
        const ship = window.ship || (window.starfieldManager && window.starfieldManager.viewManager ? window.starfieldManager.viewManager.getShip() : null);
        
        if (!ship || !ship.weaponSystem) {
            console.error('❌ No ship or weapon system found');
            return;
        }
        
        console.log('\n🔄 WEAPON SWITCHING TEST:');
        const originalIndex = ship.weaponSystem.activeSlotIndex;
        console.log(`   • Starting at slot: ${originalIndex}`);
        
        // Test switching to next weapon
        console.log('   • Switching to next weapon...');
        const success = ship.weaponSystem.selectNextWeapon();
        const newIndex = ship.weaponSystem.activeSlotIndex;
        
        console.log(`   • Switch result: ${success}`);
        console.log(`   • New active slot: ${newIndex}`);
        
        // Check HUD update
        setTimeout(() => {
            if (ship.weaponSystem.weaponHUD) {
                const slots = ship.weaponSystem.weaponHUD.weaponSlotsDisplay.children;
                let highlightedSlot = -1;
                
                for (let i = 0; i < slots.length; i++) {
                    const slot = slots[i];
                    const borderColor = slot.style.borderColor;
                    const isHighlighted = borderColor === 'rgb(0, 255, 0)' || borderColor === '#00ff00';
                    
                    if (isHighlighted) {
                        highlightedSlot = i;
                        break;
                    }
                }
                
                console.log(`   • HUD highlighted slot: ${highlightedSlot}`);
                console.log(`   • Expected slot: ${newIndex}`);
                
                if (highlightedSlot === newIndex) {
                    console.log('   ✅ HUD updated correctly after weapon switch');
                } else {
                    console.log('   ❌ HUD highlight not updated after weapon switch');
                }
            }
            
            // Switch back to original
            ship.weaponSystem.activeSlotIndex = originalIndex;
            if (ship.weaponSystem.weaponHUD) {
                ship.weaponSystem.updateActiveWeaponHighlight();
            }
        }, 100);
    }
    
    function forceHighlightUpdate(slotIndex) {
        const ship = window.ship || (window.starfieldManager && window.starfieldManager.viewManager ? window.starfieldManager.viewManager.getShip() : null);
        
        if (!ship || !ship.weaponSystem || !ship.weaponSystem.weaponHUD) {
            console.error('❌ Cannot update highlight - missing ship/weaponSystem/weaponHUD');
            return;
        }
        
        if (slotIndex !== undefined) {
            ship.weaponSystem.activeSlotIndex = slotIndex;
        }
        
        console.log(`🎨 Forcing highlight update for slot ${ship.weaponSystem.activeSlotIndex}...`);
        ship.weaponSystem.updateActiveWeaponHighlight();
        
        // Verify update
        setTimeout(() => {
            const slots = ship.weaponSystem.weaponHUD.weaponSlotsDisplay.children;
            let highlightedSlot = -1;
            
            for (let i = 0; i < slots.length; i++) {
                const slot = slots[i];
                const borderColor = slot.style.borderColor;
                const isHighlighted = borderColor === 'rgb(0, 255, 0)' || borderColor === '#00ff00';
                
                if (isHighlighted) {
                    highlightedSlot = i;
                    break;
                }
            }
            
            console.log(`   Result: highlighted slot ${highlightedSlot}, expected ${ship.weaponSystem.activeSlotIndex}`);
        }, 50);
    }
    
    // Make functions available globally
    window.testHighlightSystem = testHighlightSystem;
    window.testWeaponSwitching = testWeaponSwitching;
    window.forceHighlightUpdate = forceHighlightUpdate;
    
    // Test cycling through all weapons
    window.testAllWeaponHighlights = function() {
        const ship = window.ship || (window.starfieldManager && window.starfieldManager.viewManager ? window.starfieldManager.viewManager.getShip() : null);
        
        if (!ship || !ship.weaponSystem) {
            console.error('❌ No ship or weapon system found');
            return;
        }
        
        console.log('🔄 Testing highlights for all weapon slots...');
        const originalIndex = ship.weaponSystem.activeSlotIndex;
        
        ship.weaponSystem.weaponSlots.forEach((slot, index) => {
            if (!slot.isEmpty) {
                setTimeout(() => {
                    console.log(`   Setting active slot to ${index} (${slot.equippedWeapon.name})`);
                    forceHighlightUpdate(index);
                }, index * 1000);
            }
        });
        
        // Reset to original after testing
        setTimeout(() => {
            console.log(`   Resetting to original slot ${originalIndex}`);
            forceHighlightUpdate(originalIndex);
        }, (ship.weaponSystem.weaponSlots.length + 1) * 1000);
    };
    
    // Run initial test
    setTimeout(() => {
        if (window.starfieldManager && window.starfieldManager.viewManager) {
            testHighlightSystem();
        }
    }, 2000);
    
    console.log('💡 Highlight test functions available:');
    console.log('   testHighlightSystem() - Test HUD connection and highlighting');
    console.log('   testWeaponSwitching() - Test weapon switching with highlight update');
    console.log('   forceHighlightUpdate(slot) - Force highlight update for specific slot');
    console.log('   testAllWeaponHighlights() - Cycle through all weapon highlights');
})(); 