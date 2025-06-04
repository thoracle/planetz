(function() {
    console.log('🎯 WEAPON HIGHLIGHT FIX TEST - Testing improved weapon highlighting...');
    
    function testHighlightingFix() {
        const ship = window.ship || (window.starfieldManager && window.starfieldManager.viewManager ? window.starfieldManager.viewManager.getShip() : null);
        
        if (!ship) {
            console.error('❌ No ship found');
            return;
        }
        
        if (!ship.weaponSystem) {
            console.error('❌ No weapon system found');
            return;
        }
        
        console.log('\n🔍 TESTING WEAPON HIGHLIGHTING FIX:');
        
        // Test 1: Check HUD connection
        console.log('\n1. HUD Connection Test:');
        const hudConnected = ship.weaponSystem.weaponHUD ? 'Yes' : 'No';
        console.log(`   • WeaponHUD connected: ${hudConnected}`);
        
        if (!ship.weaponSystem.weaponHUD) {
            console.error('❌ WeaponHUD not connected - cannot test highlighting');
            return;
        }
        
        const weaponHUD = ship.weaponSystem.weaponHUD;
        console.log(`   • weaponSlotsDisplay exists: ${weaponHUD.weaponSlotsDisplay ? 'Yes' : 'No'}`);
        
        if (!weaponHUD.weaponSlotsDisplay) {
            console.error('❌ weaponSlotsDisplay not found');
            return;
        }
        
        // Test 2: Check DOM structure with new classes
        console.log('\n2. DOM Structure Test:');
        const slots = weaponHUD.weaponSlotsDisplay.children;
        console.log(`   • Number of weapon slots: ${slots.length}`);
        
        for (let i = 0; i < slots.length; i++) {
            const slot = slots[i];
            const slotNumber = slot.querySelector('.weapon-slot-number');
            const weaponName = slot.querySelector('.weapon-name-display');
            const cooldownBar = slot.querySelector('.weapon-cooldown-bar');
            
            console.log(`   • Slot ${i}:`);
            console.log(`     - slot-number element: ${slotNumber ? 'Found' : 'Missing'}`);
            console.log(`     - weapon-name-display element: ${weaponName ? 'Found' : 'Missing'}`);
            console.log(`     - cooldown-bar element: ${cooldownBar ? 'Found' : 'Missing'}`);
            
            if (weaponName) {
                console.log(`     - weapon name: "${weaponName.textContent}"`);
                console.log(`     - current color: ${weaponName.style.color}`);
            }
        }
        
        // Test 3: Test highlighting for each slot
        console.log('\n3. Highlighting Test:');
        const originalIndex = ship.weaponSystem.activeSlotIndex;
        console.log(`   • Original active slot: ${originalIndex}`);
        
        // Test highlighting each equipped weapon
        const equippedSlots = [];
        ship.weaponSystem.weaponSlots.forEach((slot, index) => {
            if (!slot.isEmpty) {
                equippedSlots.push({ index, name: slot.equippedWeapon.name });
            }
        });
        
        console.log(`   • Equipped weapons in slots: ${equippedSlots.map(s => `${s.index}(${s.name})`).join(', ')}`);
        
        function testSlotHighlight(slotIndex, expectedName) {
            return new Promise((resolve) => {
                // Set active slot
                ship.weaponSystem.activeSlotIndex = slotIndex;
                ship.weaponSystem.updateActiveWeaponHighlight();
                
                setTimeout(() => {
                    const slots = weaponHUD.weaponSlotsDisplay.children;
                    let highlightedSlots = [];
                    let correctHighlight = false;
                    
                    for (let i = 0; i < slots.length; i++) {
                        const slot = slots[i];
                        const isHighlighted = slot.style.borderColor === 'rgb(0, 255, 0)' || slot.style.borderColor === '#00ff00';
                        
                        if (isHighlighted) {
                            highlightedSlots.push(i);
                            if (i === slotIndex) {
                                correctHighlight = true;
                            }
                        }
                        
                        // Check weapon name color
                        const weaponNameElement = slot.querySelector('.weapon-name-display');
                        if (weaponNameElement && weaponNameElement.textContent !== 'EMPTY') {
                            const isNameHighlighted = weaponNameElement.style.color === 'rgb(0, 255, 0)' || weaponNameElement.style.color === '#00ff00';
                            console.log(`     - Slot ${i} weapon name "${weaponNameElement.textContent}" color: ${weaponNameElement.style.color} (highlighted: ${isNameHighlighted})`);
                        }
                    }
                    
                    console.log(`     • Testing slot ${slotIndex} (${expectedName}):`);
                    console.log(`       - Highlighted slots: [${highlightedSlots.join(', ')}]`);
                    console.log(`       - Correct highlight: ${correctHighlight ? '✅' : '❌'}`);
                    console.log(`       - Total highlighted: ${highlightedSlots.length}`);
                    
                    resolve({
                        slotIndex,
                        expectedName,
                        highlightedSlots,
                        correctHighlight,
                        totalHighlighted: highlightedSlots.length
                    });
                }, 100);
            });
        }
        
        // Test each equipped slot sequentially
        async function runSequentialTests() {
            const results = [];
            
            for (const slot of equippedSlots) {
                const result = await testSlotHighlight(slot.index, slot.name);
                results.push(result);
            }
            
            // Summary
            console.log('\n4. Test Summary:');
            const passed = results.filter(r => r.correctHighlight && r.totalHighlighted === 1).length;
            const total = results.length;
            
            console.log(`   • Tests passed: ${passed}/${total}`);
            
            if (passed === total) {
                console.log('   ✅ All weapon highlighting tests PASSED!');
                console.log('   ✅ Fix successful - highlighting now works for all weapon slots');
            } else {
                console.log('   ❌ Some tests failed - highlighting issues remain');
                
                results.forEach(r => {
                    if (!r.correctHighlight || r.totalHighlighted !== 1) {
                        console.log(`     • FAILED: Slot ${r.slotIndex} (${r.expectedName}) - highlighted slots: [${r.highlightedSlots.join(', ')}]`);
                    }
                });
            }
            
            // Restore original active slot
            ship.weaponSystem.activeSlotIndex = originalIndex;
            ship.weaponSystem.updateActiveWeaponHighlight();
            console.log(`   • Restored original active slot: ${originalIndex}`);
        }
        
        runSequentialTests();
    }
    
    function testSelectorReliability() {
        console.log('\n🔍 SELECTOR RELIABILITY TEST:');
        
        const ship = window.ship || (window.starfieldManager && window.starfieldManager.viewManager ? window.starfieldManager.viewManager.getShip() : null);
        if (!ship || !ship.weaponSystem || !ship.weaponSystem.weaponHUD) {
            console.error('❌ Cannot test - missing ship/weaponSystem/weaponHUD');
            return;
        }
        
        const weaponHUD = ship.weaponSystem.weaponHUD;
        const slots = weaponHUD.weaponSlotsDisplay.children;
        
        console.log('   • Testing selector reliability with and without cooldown bars:');
        
        for (let i = 0; i < slots.length; i++) {
            const slot = slots[i];
            
            // Test old selector (should be unreliable)
            const oldSelector = slot.querySelector('div:not(:first-child)');
            const newSelector = slot.querySelector('.weapon-name-display');
            
            console.log(`   • Slot ${i}:`);
            console.log(`     - Old selector (div:not(:first-child)): ${oldSelector ? oldSelector.textContent : 'null'}`);
            console.log(`     - New selector (.weapon-name-display): ${newSelector ? newSelector.textContent : 'null'}`);
            
            const cooldownBar = slot.querySelector('.weapon-cooldown-bar');
            console.log(`     - Has cooldown bar: ${cooldownBar ? 'Yes' : 'No'}`);
            
            if (oldSelector && newSelector) {
                const sameElement = oldSelector === newSelector;
                console.log(`     - Selectors match same element: ${sameElement ? '✅' : '❌'}`);
                
                if (!sameElement) {
                    console.log(`       • Old selector found: ${oldSelector.className || 'no class'}`);
                    console.log(`       • New selector found: ${newSelector.className || 'no class'}`);
                }
            }
        }
    }
    
    // Make functions available globally
    window.testHighlightingFix = testHighlightingFix;
    window.testSelectorReliability = testSelectorReliability;
    
    // Auto-run test after a delay
    setTimeout(() => {
        if (window.starfieldManager && window.starfieldManager.viewManager) {
            testHighlightingFix();
            testSelectorReliability();
        }
    }, 2000);
    
    console.log('💡 Test functions available:');
    console.log('   testHighlightingFix() - Test the highlighting fix');
    console.log('   testSelectorReliability() - Test selector reliability');
})(); 