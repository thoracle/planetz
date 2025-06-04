(function() {
    console.log('🎯 WEAPON HIGHLIGHTING FIX - Fixing updateWeaponSelectionUI method...');
    
    function fixWeaponHighlightingBug() {
        const starfieldManager = window.starfieldManager;
        
        if (!starfieldManager) {
            console.error('❌ StarfieldManager not found');
            return;
        }
        
        console.log('✅ Found StarfieldManager, patching updateWeaponSelectionUI method...');
        
        // Store the original method
        const originalUpdateWeaponSelectionUI = starfieldManager.updateWeaponSelectionUI;
        
        // Replace with fixed version
        starfieldManager.updateWeaponSelectionUI = async function() {
            console.log('    🎯 Updating weapon selection UI (FIXED VERSION)...');
            
            const ship = this.viewManager?.getShip();
            if (!ship) {
                console.warn('    ⚠️ No ship available for weapon UI update');
                return;
            }
            
            const weaponsSystem = ship.getSystem('weapons');
            if (!weaponsSystem) {
                console.warn('    ⚠️ No weapons system found');
                return;
            }
            
            // Force refresh weapon inventory
            if (typeof weaponsSystem.refreshInventory === 'function') {
                weaponsSystem.refreshInventory();
            }
            
            // Update weapon HUD display properly (FIXED)
            if (this.weaponHUD && ship.weaponSystem) {
                // Update the weapon slots display with current weapon system state
                this.weaponHUD.updateWeaponSlotsDisplay(ship.weaponSystem.weaponSlots, ship.weaponSystem.activeSlotIndex);
                
                // Ensure the highlighting is correct
                this.weaponHUD.updateActiveWeaponHighlight(ship.weaponSystem.activeSlotIndex);
                
                console.log('    ✅ Weapon HUD properly updated with highlighting');
            }
            
            console.log('    🎯 Weapon selection UI updated (FIXED)');
        };
        
        console.log('✅ updateWeaponSelectionUI method has been patched');
        
        // Test the weapon highlighting immediately
        testWeaponHighlighting();
    }
    
    function testWeaponHighlighting() {
        console.log('\n🔍 Testing weapon highlighting after fix...');
        
        const ship = window.ship || (window.starfieldManager && window.starfieldManager.viewManager ? window.starfieldManager.viewManager.getShip() : null);
        
        if (!ship || !ship.weaponSystem) {
            console.error('❌ Cannot test - ship or weapon system not found');
            return;
        }
        
        const weaponHUD = ship.weaponSystem.weaponHUD;
        if (!weaponHUD) {
            console.error('❌ WeaponHUD not connected to weapon system');
            return;
        }
        
        console.log('\n🔧 Testing weapon selection and highlighting...');
        const originalIndex = ship.weaponSystem.activeSlotIndex;
        
        // Try switching weapons and check highlighting
        ship.weaponSystem.selectNextWeapon();
        
        setTimeout(() => {
            const newIndex = ship.weaponSystem.activeSlotIndex;
            const slots = weaponHUD.weaponSlotsDisplay.children;
            
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
            
            console.log(`   • Original slot: ${originalIndex}`);
            console.log(`   • New active slot: ${newIndex}`);
            console.log(`   • Highlighted slot: ${highlightedSlot}`);
            
            if (highlightedSlot === newIndex) {
                console.log('   ✅ Weapon highlighting is working correctly!');
            } else {
                console.log('   ❌ Weapon highlighting is still broken');
                
                // Try manual fix
                console.log('   🔧 Attempting manual highlight fix...');
                weaponHUD.updateActiveWeaponHighlight(newIndex);
                
                setTimeout(() => {
                    let newHighlightedSlot = -1;
                    for (let i = 0; i < slots.length; i++) {
                        const slot = slots[i];
                        const borderColor = slot.style.borderColor;
                        const isHighlighted = borderColor === 'rgb(0, 255, 0)' || borderColor === '#00ff00';
                        
                        if (isHighlighted) {
                            newHighlightedSlot = i;
                            break;
                        }
                    }
                    
                    if (newHighlightedSlot === newIndex) {
                        console.log('   ✅ Manual highlight fix worked!');
                    } else {
                        console.log('   ❌ Manual highlight fix failed');
                    }
                }, 100);
            }
            
            // Reset to original
            ship.weaponSystem.activeSlotIndex = originalIndex;
            weaponHUD.updateActiveWeaponHighlight(originalIndex);
        }, 100);
    }
    
    // Wait for game to load, then apply fix
    function waitForGameAndFix() {
        if (window.starfieldManager && window.starfieldManager.viewManager) {
            fixWeaponHighlightingBug();
        } else {
            console.log('⏳ Waiting for game to load...');
            setTimeout(waitForGameAndFix, 1000);
        }
    }
    
    waitForGameAndFix();
    
    // Make the fix function globally available
    window.fixWeaponHighlighting = fixWeaponHighlightingBug;
    window.testWeaponHighlighting = testWeaponHighlighting;
    
    console.log('💡 Available functions:');
    console.log('   fixWeaponHighlighting() - Apply the fix to updateWeaponSelectionUI');
    console.log('   testWeaponHighlighting() - Test current highlighting state');
})(); 