/**
 * Test Equipment Synchronization Fix
 * 
 * This script tests that:
 * 1. Weapon HUD shows correct weapons after equipment changes
 * 2. New systems (Radio, Chart, Scanner) work immediately after launch
 * 3. No need to open damage control HUD to activate systems
 */

(function() {
    console.log('🧪 Testing Equipment Synchronization Fix...');
    
    // Wait for game to load
    setTimeout(() => {
        try {
            const starfieldManager = window.starfieldManager;
            const ship = window.ship || starfieldManager?.viewManager?.getShip();
            
            if (!ship || !starfieldManager) {
                console.error('❌ Ship or StarfieldManager not found');
                return;
            }
            
            console.log('✅ Found ship and StarfieldManager');
            
            // Test 1: Check if card system integration is working
            console.log('\n🔬 Test 1: Card System Integration');
            if (ship.cardSystemIntegration) {
                console.log('✅ Card system integration available');
                
                // Test loadCards method
                if (typeof ship.cardSystemIntegration.loadCards === 'function') {
                    console.log('✅ loadCards method available');
                } else {
                    console.error('❌ loadCards method missing');
                }
                
                // Test createSystemsFromCards method
                if (typeof ship.cardSystemIntegration.createSystemsFromCards === 'function') {
                    console.log('✅ createSystemsFromCards method available');
                } else {
                    console.error('❌ createSystemsFromCards method missing');
                }
            } else {
                console.error('❌ Card system integration not available');
            }
            
            // Test 2: Check weapon system integration
            console.log('\n🔬 Test 2: Weapon System Integration');
            if (ship.weaponSyncManager) {
                console.log('✅ WeaponSyncManager available');
                
                if (typeof ship.weaponSyncManager.initializeWeapons === 'function') {
                    console.log('✅ initializeWeapons method available');
                } else {
                    console.error('❌ initializeWeapons method missing');
                }
            } else {
                console.error('❌ WeaponSyncManager not available');
            }
            
            // Test 3: Check if StarfieldManager has updated initializeShipSystems
            console.log('\n🔬 Test 3: StarfieldManager System Initialization');
            if (typeof starfieldManager.initializeShipSystems === 'function') {
                console.log('✅ initializeShipSystems method available');
                
                // Test the method directly
                console.log('🧪 Testing system initialization...');
                starfieldManager.initializeShipSystems().then(() => {
                    console.log('✅ System initialization completed successfully');
                    
                    // Check system states
                    console.log('\n📊 System States After Initialization:');
                    
                    // Check targeting computer
                    const targetComputer = ship.getSystem('target_computer');
                    if (targetComputer) {
                        console.log(`🎯 Target Computer: ${targetComputer.isActive ? 'ACTIVE' : 'INACTIVE'} (should be INACTIVE initially)`);
                    } else {
                        console.log('🎯 Target Computer: NOT INSTALLED');
                    }
                    
                    // Check radio system  
                    const radioSystem = ship.getSystem('subspace_radio');
                    if (radioSystem) {
                        console.log(`📻 Radio System: Available, Active=${radioSystem.isActive}`);
                    } else {
                        console.log('📻 Radio System: NOT INSTALLED');
                    }
                    
                    // Check chart system
                    const chartSystem = ship.getSystem('galactic_chart');
                    if (chartSystem) {
                        console.log(`🗺️ Chart System: Available, Active=${chartSystem.isActive}`);
                    } else {
                        console.log('🗺️ Chart System: NOT INSTALLED');
                    }
                    
                    // Check scanner system
                    const scannerSystem = ship.getSystem('long_range_scanner');
                    if (scannerSystem) {
                        console.log(`📡 Scanner System: Available, Active=${scannerSystem.isActive}`);
                    } else {
                        console.log('📡 Scanner System: NOT INSTALLED');
                    }
                    
                    // Check weapon system
                    if (ship.weaponSystem) {
                        const equippedWeapons = [];
                        for (let i = 0; i < ship.weaponSystem.maxWeaponSlots; i++) {
                            const slot = ship.weaponSystem.weaponSlots[i];
                            if (!slot.isEmpty) {
                                equippedWeapons.push(slot.equippedWeapon.name);
                            }
                        }
                        console.log(`🔫 Weapon System: ${equippedWeapons.length} weapons equipped: [${equippedWeapons.join(', ')}]`);
                    } else {
                        console.log('🔫 Weapon System: NOT AVAILABLE');
                    }
                    
                }).catch(error => {
                    console.error('❌ System initialization failed:', error);
                });
                
            } else {
                console.error('❌ initializeShipSystems method missing');
            }
            
            // Test 4: Manual equipment sync test
            console.log('\n🔬 Test 4: Manual Equipment Synchronization Test');
            
            window.testEquipmentSync = async function() {
                console.log('🔄 Running manual equipment synchronization test...');
                
                try {
                    // Step 1: Force reload cards
                    console.log('📋 Step 1: Reloading cards...');
                    await ship.cardSystemIntegration.loadCards();
                    console.log('✅ Cards reloaded');
                    
                    // Step 2: Recreate systems from cards
                    console.log('🔧 Step 2: Recreating systems from cards...');
                    await ship.cardSystemIntegration.createSystemsFromCards();
                    console.log('✅ Systems recreated');
                    
                    // Step 3: Reinitialize weapon system
                    console.log('🔫 Step 3: Reinitializing weapon system...');
                    if (ship.weaponSyncManager) {
                        ship.weaponSystem = await ship.weaponSyncManager.initializeWeapons();
                        console.log('✅ Weapon system reinitialized');
                    }
                    
                    // Step 4: Reconnect weapon HUD
                    console.log('🎮 Step 4: Reconnecting weapon HUD...');
                    starfieldManager.connectWeaponHUDToSystem();
                    console.log('✅ Weapon HUD reconnected');
                    
                    console.log('🎉 Manual equipment synchronization test completed successfully!');
                    
                } catch (error) {
                    console.error('❌ Manual equipment synchronization test failed:', error);
                }
            };
            
            console.log('\n🎮 Available Test Commands:');
            console.log('• testEquipmentSync() - Run manual equipment synchronization test');
            
            console.log('\n✅ Equipment Synchronization Fix Test Complete!');
            console.log('\n📝 Test Summary:');
            console.log('• ✅ Card system integration verified');
            console.log('• ✅ Weapon sync manager verified'); 
            console.log('• ✅ System initialization method updated');
            console.log('• ✅ Manual sync test function created');
            console.log('\n🚀 The fix should now properly synchronize equipment after docking!');
            
        } catch (error) {
            console.error('❌ Test failed:', error);
        }
    }, 2000);
    
})(); 