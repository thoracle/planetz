/**
 * Test Weapon Switching Debug
 * 
 * This script debugs X and Z key weapon switching functionality
 * to identify what's preventing the weapon switching from working.
 */

(function() {
    console.log('🔫 Testing Weapon Switching Functionality');
    console.log('==========================================');
    
    // Wait for game to load
    setTimeout(function() {
        try {
            const starfieldManager = window.starfieldManager;
            const ship = window.ship || (starfieldManager && starfieldManager.viewManager ? starfieldManager.viewManager.getShip() : null);
            
            if (!ship || !starfieldManager) {
                console.error('❌ Game not loaded properly');
                console.log('starfieldManager:', !!starfieldManager);
                console.log('ship:', !!ship);
                return;
            }
            
            console.log('✅ Game components loaded');
            
            // Test weapon system existence
            function testWeaponSystem() {
                console.log('\n🔍 Testing Weapon System...');
                
                // Check weapon system
                if (!ship.weaponSystem) {
                    console.error('❌ No weapon system found on ship');
                    console.log('ship.weaponSystem:', ship.weaponSystem);
                    
                    // Try to find weapon system in different places
                    const systemsKeys = Object.keys(ship.systems || {});
                    console.log('Available ship systems:', systemsKeys);
                    
                    return false;
                }
                
                console.log('✅ Found weapon system');
                console.log('Weapon system type:', ship.weaponSystem.constructor.name);
                
                // Check if weapon system has weaponSlots
                if (!ship.weaponSystem.weaponSlots || ship.weaponSystem.weaponSlots.length === 0) {
                    console.error('❌ No weapon slots found in weapon system');
                    console.log('ship.weaponSystem.weaponSlots:', ship.weaponSystem.weaponSlots);
                    return false;
                }
                
                console.log(`✅ Found ${ship.weaponSystem.weaponSlots.length} weapon slots`);
                
                // Check current weapon state
                const currentWeaponIndex = ship.weaponSystem.activeSlotIndex || 0;
                console.log('📍 Current active weapon index:', currentWeaponIndex);
                
                // List all weapons
                ship.weaponSystem.weaponSlots.forEach((slot, index) => {
                    const isActive = index === currentWeaponIndex;
                    const marker = isActive ? '👉' : '  ';
                    const weaponName = slot.isEmpty ? 'Empty' : slot.equippedWeapon.name;
                    console.log(`${marker} Slot ${index}: ${weaponName}`);
                });
                
                return true;
            }
            
            // Test key event handling
            function testKeyHandling() {
                console.log('\n🔍 Testing Key Event Handling...');
                
                // Check if StarfieldManager has key event handlers
                if (!starfieldManager.bindKeyEvents) {
                    console.error('❌ StarfieldManager missing bindKeyEvents method');
                    return false;
                }
                
                console.log('✅ StarfieldManager has bindKeyEvents method');
                
                // Check if listeners are bound to document
                const hasKeyDownListeners = getEventListeners && getEventListeners(document).keydown;
                if (hasKeyDownListeners) {
                    console.log(`✅ Found ${hasKeyDownListeners.length} keydown listeners on document`);
                } else {
                    console.log('⚠️ Cannot inspect event listeners (getEventListeners not available)');
                }
                
                return true;
            }
            
            // Simulate key event
            function simulateKeyEvent(key) {
                console.log(`\n🎯 Simulating ${key} key press...`);
                
                if (!ship.weaponSystem) {
                    console.error('❌ No weapon system available for key simulation');
                    return;
                }
                
                const beforeIndex = ship.weaponSystem.activeSlotIndex || 0;
                console.log('Before:', beforeIndex);
                
                // Create and dispatch key event
                const event = new KeyboardEvent('keydown', {
                    key: key,
                    code: key === 'x' ? 'KeyX' : 'KeyZ',
                    keyCode: key === 'x' ? 88 : 90,
                    which: key === 'x' ? 88 : 90,
                    bubbles: true,
                    cancelable: true
                });
                
                document.dispatchEvent(event);
                
                // Check if weapon index changed
                setTimeout(() => {
                    const afterIndex = ship.weaponSystem.activeSlotIndex || 0;
                    console.log('After:', afterIndex);
                    
                    if (beforeIndex !== afterIndex) {
                        console.log(`✅ Weapon switched from ${beforeIndex} to ${afterIndex}`);
                    } else {
                        console.log(`❌ Weapon did not switch (still ${beforeIndex})`);
                    }
                }, 100);
            }
            
            // Test manual weapon switching
            function testManualSwitch() {
                console.log('\n🔍 Testing Manual Weapon Switching...');
                
                if (!ship.weaponSystem) {
                    console.error('❌ Ship missing weapon system');
                    return false;
                }
                
                if (!ship.weaponSystem.selectNextWeapon) {
                    console.error('❌ Weapon system missing selectNextWeapon method');
                    return false;
                }
                
                const beforeIndex = ship.weaponSystem.activeSlotIndex || 0;
                console.log('Before manual switch:', beforeIndex);
                
                // Try to switch to next weapon
                try {
                    const success = ship.weaponSystem.selectNextWeapon();
                    const afterIndex = ship.weaponSystem.activeSlotIndex || 0;
                    console.log('After manual switch:', afterIndex);
                    console.log('Switch success:', success);
                    
                    if (success && afterIndex !== beforeIndex) {
                        console.log('✅ Manual weapon switch works');
                        return true;
                    } else if (!success) {
                        console.log('⚠️ No other weapons available to switch to');
                        return true; // This is normal if only one weapon
                    } else {
                        console.log('❌ Manual weapon switch failed');
                        return false;
                    }
                } catch (error) {
                    console.error('❌ Error during manual switch:', error);
                    return false;
                }
            }
            
            // Check for potential interference
            function checkInterference() {
                console.log('\n🔍 Checking for Potential Interference...');
                
                // Check if game is paused
                if (starfieldManager.isPaused) {
                    console.warn('⚠️ Game is paused - this might prevent key handling');
                }
                
                // Check if any modal is open
                if (starfieldManager.isDocked) {
                    console.warn('⚠️ Ship is docked - weapon switching might be disabled');
                }
                
                // Check for active modals
                const activeModals = document.querySelectorAll('.modal:not([style*="display: none"])');
                if (activeModals.length > 0) {
                    console.warn(`⚠️ Found ${activeModals.length} active modal(s) - might interfere with key events`);
                }
                
                // Check current speed (might prevent some actions)
                const speed = starfieldManager.currentSpeed || 0;
                console.log(`📍 Current speed: ${speed}`);
                
                // Check if target computer is active
                if (starfieldManager.currentTarget) {
                    console.log('📍 Current target:', starfieldManager.currentTarget.name || 'unnamed');
                } else {
                    console.log('📍 No current target');
                }
            }
            
            // Run all tests
            console.log('\n🚀 Running All Tests...');
            console.log('======================');
            
            const results = {
                weaponSystem: testWeaponSystem(),
                keyHandling: testKeyHandling(),
                manualSwitch: testManualSwitch()
            };
            
            checkInterference();
            
            console.log('\n📋 Test Results Summary:');
            console.log('========================');
            Object.entries(results).forEach(([test, result]) => {
                const status = result ? '✅' : '❌';
                console.log(`${status} ${test}: ${result ? 'PASS' : 'FAIL'}`);
            });
            
            // Expose functions globally for manual testing
            window.testWeaponSwitching = testWeaponSystem;
            window.testKeyHandling = testKeyHandling;
            window.testManualSwitch = testManualSwitch;
            window.checkInterference = checkInterference;
            window.simulateX = () => simulateKeyEvent('x');
            window.simulateZ = () => simulateKeyEvent('z');
            
            console.log('\n🛠️ Manual Testing Functions Available:');
            console.log('• testWeaponSwitching() - Check weapon system state');
            console.log('• testKeyHandling() - Check key event setup');
            console.log('• testManualSwitch() - Test weapon switching manually');
            console.log('• checkInterference() - Check for potential issues');
            console.log('• simulateX() - Simulate X key press');
            console.log('• simulateZ() - Simulate Z key press');
            
            // Quick state check
            if (ship && ship.weaponSystem) {
                console.log('\n⚡ Quick State Check:');
                console.log('====================');
                console.log('Ship has weapon system:', !!ship.weaponSystem);
                console.log('Weapon slots count:', ship.weaponSystem.weaponSlots?.length || 0);
                console.log('Active slot index:', ship.weaponSystem.activeSlotIndex);
                console.log('Current weapon:', 
                    ship.weaponSystem.weaponSlots?.[ship.weaponSystem.activeSlotIndex]?.isEmpty 
                        ? 'None' 
                        : ship.weaponSystem.weaponSlots[ship.weaponSystem.activeSlotIndex]?.equippedWeapon?.name || 'Unknown'
                );
            }
            
        } catch (error) {
            console.error('❌ Test failed with error:', error);
        }
    }, 2000); // Wait 2 seconds for game to fully initialize
})(); 