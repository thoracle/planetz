(function() {
    console.log('🔧 FIX VERIFICATION TEST - Testing all recently fixed systems...');
    
    function testAllFixes() {
        const ship = window.ship || (window.starfieldManager && window.starfieldManager.viewManager ? window.starfieldManager.viewManager.getShip() : null);
        const starfieldManager = window.starfieldManager;
        
        if (!ship) {
            console.error('❌ No ship found');
            return;
        }
        
        if (!starfieldManager) {
            console.error('❌ No StarfieldManager found');
            return;
        }
        
        console.log('\\n✅ VERIFYING ALL FIXES:');
        
        // Test 1: Weapon Highlighting Fix
        console.log('\\n1. WEAPON HIGHLIGHTING TEST:');
        if (!ship.weaponSystem) {
            console.error('  ❌ No weapon system found');
        } else {
            const weaponHUD = ship.weaponSystem.weaponHUD;
            if (!weaponHUD) {
                console.error('  ❌ No weapon HUD found');
            } else {
                console.log('  ✅ Weapon HUD connected');
                
                // Test weapon slot elements for proper class structure
                const weaponSlots = Array.from(document.querySelectorAll('.weapon-slot'));
                console.log(`  📊 Found ${weaponSlots.length} weapon slots`);
                
                weaponSlots.forEach((slot, index) => {
                    const slotNumber = slot.querySelector('.weapon-slot-number');
                    const weaponName = slot.querySelector('.weapon-name-display');
                    const cooldownBar = slot.querySelector('.weapon-cooldown-bar');
                    
                    console.log(`    Slot ${index}: ${slotNumber ? '✅' : '❌'} Number, ${weaponName ? '✅' : '❌'} Name, ${cooldownBar ? '✅' : '❌'} Cooldown`);
                });
                
                // Test highlighting method
                if (typeof weaponHUD.updateActiveWeaponHighlight === 'function') {
                    console.log('  ✅ updateActiveWeaponHighlight method exists');
                    try {
                        weaponHUD.updateActiveWeaponHighlight(0);
                        console.log('  ✅ Weapon highlighting method executed successfully');
                    } catch (error) {
                        console.error('  ❌ Error in weapon highlighting:', error.message);
                    }
                } else {
                    console.error('  ❌ updateActiveWeaponHighlight method missing');
                }
            }
        }
        
        // Test 2: Target Computer Functionality
        console.log('\\n2. TARGET COMPUTER TEST:');
        
        // Test sortTargetsByDistance
        if (typeof starfieldManager.sortTargetsByDistance === 'function') {
            console.log('  ✅ sortTargetsByDistance method exists');
            try {
                starfieldManager.targetObjects = [
                    { position: [100, 100, 100] },
                    { position: [50, 50, 50] }
                ];
                starfieldManager.sortTargetsByDistance();
                console.log('  ✅ sortTargetsByDistance executed successfully');
            } catch (error) {
                console.error('  ❌ Error in sortTargetsByDistance:', error.message);
            }
        } else {
            console.error('  ❌ sortTargetsByDistance method missing');
        }
        
        // Test formatDistance
        if (typeof starfieldManager.formatDistance === 'function') {
            console.log('  ✅ formatDistance method exists');
            try {
                const testDistance = starfieldManager.formatDistance(1500);
                console.log(`  ✅ formatDistance test: 1500km = ${testDistance}`);
            } catch (error) {
                console.error('  ❌ Error in formatDistance:', error.message);
            }
        } else {
            console.error('  ❌ formatDistance method missing');
        }
        
        // Test updateTargetDisplay
        if (typeof starfieldManager.updateTargetDisplay === 'function') {
            console.log('  ✅ updateTargetDisplay method exists');
        } else {
            console.error('  ❌ updateTargetDisplay method missing');
        }
        
        // Test getCurrentTargetData
        if (typeof starfieldManager.getCurrentTargetData === 'function') {
            console.log('  ✅ getCurrentTargetData method exists');
        } else {
            console.error('  ❌ getCurrentTargetData method missing');
        }
        
        // Test 3: HUD Error Display
        console.log('\\n3. HUD ERROR DISPLAY TEST:');
        if (typeof starfieldManager.showHUDError === 'function') {
            console.log('  ✅ showHUDError method exists');
            try {
                starfieldManager.showHUDError('TEST MESSAGE', 'Fix verification test successful', 2000);
                console.log('  ✅ HUD error display test executed successfully');
            } catch (error) {
                console.error('  ❌ Error in showHUDError:', error.message);
            }
        } else {
            console.error('  ❌ showHUDError method missing');
        }
        
        // Test 4: Audio System
        console.log('\\n4. AUDIO SYSTEM TEST:');
        if (typeof starfieldManager.playCommandSound === 'function') {
            console.log('  ✅ playCommandSound method exists');
        } else {
            console.error('  ❌ playCommandSound method missing');
        }
        
        if (typeof starfieldManager.playCommandFailedSound === 'function') {
            console.log('  ✅ playCommandFailedSound method exists');
        } else {
            console.error('  ❌ playCommandFailedSound method missing');
        }
        
        // Test 5: Calculate Distance
        console.log('\\n5. DISTANCE CALCULATION TEST:');
        if (typeof starfieldManager.calculateDistance === 'function') {
            console.log('  ✅ calculateDistance method exists');
            try {
                const point1 = { x: 0, y: 0, z: 0 };
                const point2 = { x: 100, y: 0, z: 0 };
                const distance = starfieldManager.calculateDistance(point1, point2);
                console.log(`  ✅ calculateDistance test: 100 units = ${distance}km`);
            } catch (error) {
                console.error('  ❌ Error in calculateDistance:', error.message);
            }
        } else {
            console.error('  ❌ calculateDistance method missing');
        }
        
        console.log('\\n🎯 FIX VERIFICATION COMPLETE');
        console.log('\\nTo test weapon highlighting:');
        console.log('  - Press X/Z to switch weapons');
        console.log('  - Check if highlighting moves to correct weapon slot');
        console.log('\\nTo test target computer:');
        console.log('  - Press T to toggle target computer');
        console.log('  - Press TAB to cycle targets');
        console.log('  - Check for target display and distance formatting');
        console.log('\\nTo test HUD errors:');
        console.log('  - Try invalid actions to trigger error messages');
    }
    
    testAllFixes();
})(); 