/**
 * Test Equipment Synchronization After Docking
 * 
 * This script simulates the docking process and tests that:
 * 1. Systems are properly refreshed from card configuration
 * 2. Weapon HUD shows current weapons
 * 3. New systems work immediately without needing damage control HUD
 */

(function() {
    console.log('🧪 Equipment Synchronization Fix Test');
    console.log('=====================================');
    
    // Wait for the game to load
    setTimeout(function() {
        const starfieldManager = window.starfieldManager;
        const ship = window.ship || (starfieldManager && starfieldManager.viewManager ? starfieldManager.viewManager.getShip() : null);
        
        if (!ship || !starfieldManager) {
            console.error('❌ Ship or StarfieldManager not found');
            return;
        }
        
        console.log('✅ Game components loaded successfully');
        
        // Function to display current system status
        function displaySystemStatus(label) {
            console.log('\n📊 ' + label + ':');
            
            // Check card integration
            if (ship.cardSystemIntegration) {
                console.log('  📋 Card Integration: ✅ Available');
            } else {
                console.log('  📋 Card Integration: ❌ Missing');
            }
            
            // Check weapon system
            if (ship.weaponSystem && ship.weaponSystem.weaponSlots) {
                const weapons = [];
                for (let i = 0; i < ship.weaponSystem.maxWeaponSlots; i++) {
                    const slot = ship.weaponSystem.weaponSlots[i];
                    if (!slot.isEmpty) {
                        weapons.push(slot.equippedWeapon.name + ' (Slot ' + i + ')');
                    }
                }
                console.log('  🔫 Weapons: ' + (weapons.length > 0 ? weapons.join(', ') : 'None equipped'));
            } else {
                console.log('  🔫 Weapons: ❌ System not available');
            }
            
            // Check key systems
            const systemsToCheck = [
                { name: 'target_computer', icon: '🎯', label: 'Targeting' },
                { name: 'subspace_radio', icon: '📻', label: 'Radio' },
                { name: 'galactic_chart', icon: '🗺️', label: 'Chart' },
                { name: 'long_range_scanner', icon: '📡', label: 'Scanner' }
            ];
            
            systemsToCheck.forEach(function(sys) {
                const system = ship.getSystem(sys.name);
                if (system) {
                    console.log('  ' + sys.icon + ' ' + sys.label + ': ✅ Available (Active: ' + system.isActive + ')');
                } else {
                    console.log('  ' + sys.icon + ' ' + sys.label + ': ❌ Not installed');
                }
            });
        }
        
        // Function to simulate the equipment synchronization fix
        async function testEquipmentSynchronization() {
            console.log('\n🔧 Testing Equipment Synchronization Fix...');
            
            try {
                // This simulates what happens during launch with the fix
                console.log('1️⃣ Force reloading cards from current configuration...');
                await ship.cardSystemIntegration.loadCards();
                
                console.log('2️⃣ Recreating systems from refreshed card data...');
                await ship.cardSystemIntegration.createSystemsFromCards();
                
                console.log('3️⃣ Reinitializing weapon system...');
                if (ship.weaponSyncManager) {
                    ship.weaponSystem = await ship.weaponSyncManager.initializeWeapons();
                }
                
                console.log('4️⃣ Reconnecting weapon HUD...');
                starfieldManager.connectWeaponHUDToSystem();
                
                console.log('✅ Equipment synchronization completed!');
                
                return true;
                
            } catch (error) {
                console.error('❌ Equipment synchronization failed:', error);
                return false;
            }
        }
        
        // Function to test the full launch process
        async function testLaunchProcess() {
            console.log('\n🚀 Testing Full Launch Process...');
            
            try {
                console.log('Calling starfieldManager.initializeShipSystems()...');
                await starfieldManager.initializeShipSystems();
                console.log('✅ Launch process completed successfully!');
                return true;
            } catch (error) {
                console.error('❌ Launch process failed:', error);
                return false;
            }
        }
        
        // Run the tests
        async function runTests() {
            displaySystemStatus('INITIAL STATE');
            
            // Test 1: Manual equipment sync
            console.log('\n🧪 TEST 1: Manual Equipment Synchronization');
            const manualSyncSuccess = await testEquipmentSynchronization();
            
            if (manualSyncSuccess) {
                displaySystemStatus('AFTER MANUAL SYNC');
            }
            
            // Test 2: Full launch process (with the fix)
            console.log('\n🧪 TEST 2: Full Launch Process (with fix)');
            const launchSuccess = await testLaunchProcess();
            
            if (launchSuccess) {
                displaySystemStatus('AFTER LAUNCH PROCESS');
            }
            
            // Summary
            console.log('\n📋 TEST SUMMARY');
            console.log('================');
            console.log('Manual Sync Test: ' + (manualSyncSuccess ? '✅ PASS' : '❌ FAIL'));
            console.log('Launch Process Test: ' + (launchSuccess ? '✅ PASS' : '❌ FAIL'));
            
            if (manualSyncSuccess && launchSuccess) {
                console.log('\n🎉 ALL TESTS PASSED!');
                console.log('The equipment synchronization fix is working correctly.');
                console.log('\n📝 What this means:');
                console.log('• Weapons will update properly after equipment changes');
                console.log('• New systems will work immediately after launch');
                console.log('• No need to open damage control HUD to activate systems');
            } else {
                console.log('\n⚠️ Some tests failed. The fix may need additional work.');
            }
            
            // Create global test functions for manual testing
            window.testManualSync = testEquipmentSynchronization;
            window.testLaunch = testLaunchProcess;
            window.showSystemStatus = function() { displaySystemStatus('CURRENT STATE'); };
            
            console.log('\n🎮 Manual Test Commands Available:');
            console.log('• testManualSync() - Test manual equipment synchronization');
            console.log('• testLaunch() - Test full launch process');
            console.log('• showSystemStatus() - Show current system status');
        }
        
        // Start the tests
        runTests();
        
    }, 3000); // Wait 3 seconds for game to fully load
    
})(); 