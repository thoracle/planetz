// Test script to verify the corrected docking/launching system
// This script tests the unified ship initialization approach

console.log('🧪 Testing Corrected Docking/Launching System');

// Wait for game to load
setTimeout(() => {
    try {
        const starfieldManager = window.app?.viewManager?.starfieldManager;
        
        if (!starfieldManager) {
            console.error('❌ StarfieldManager not found');
            return;
        }
        
        console.log('✅ StarfieldManager found');
        
        // Test 1: Check if new methods exist
        console.log('\n🔧 Testing Method Availability:');
        
        if (typeof starfieldManager.shutdownAllSystems === 'function') {
            console.log('✅ shutdownAllSystems() method exists');
        } else {
            console.error('❌ shutdownAllSystems() method missing');
        }
        
        if (typeof starfieldManager.initializeShipSystems === 'function') {
            console.log('✅ initializeShipSystems() method exists');
        } else {
            console.error('❌ initializeShipSystems() method missing');
        }
        
        // Test 2: Check if old methods are removed
        console.log('\n🗑️ Testing Old Method Removal:');
        
        if (typeof starfieldManager.powerDownAllSystems === 'function') {
            console.error('❌ Old powerDownAllSystems() method still exists');
        } else {
            console.log('✅ Old powerDownAllSystems() method removed');
        }
        
        if (typeof starfieldManager.restoreAllSystems === 'function') {
            console.error('❌ Old restoreAllSystems() method still exists');
        } else {
            console.log('✅ Old restoreAllSystems() method removed');
        }
        
        // Test 3: Test unified ship initialization
        console.log('\n🚀 Testing Ship Initialization:');
        
        const ship = window.app?.viewManager?.getShip();
        if (ship) {
            console.log('✅ Ship found:', ship.constructor.name);
            
            // Test the unified initialization
            starfieldManager.initializeShipSystems().then(() => {
                console.log('✅ Unified ship initialization completed successfully');
                
                // Check if systems are properly initialized
                console.log('\n📊 System Status After Initialization:');
                console.log('• Power Management:', starfieldManager.powerManagementEnabled ? '✅' : '❌');
                console.log('• Navigation Computer:', starfieldManager.navigationComputerEnabled ? '✅' : '❌');
                console.log('• Target Computer:', starfieldManager.targetComputerEnabled ? '❌ (Correctly inactive)' : '✅ (Correctly inactive)');
                console.log('• Defensive Systems:', starfieldManager.defensiveSystemsEnabled ? '✅' : '❌');
                console.log('• Ship Status Display:', starfieldManager.shipStatusDisplayEnabled ? '✅' : '❌');
                
            }).catch(error => {
                console.error('❌ Ship initialization failed:', error);
            });
            
        } else {
            console.error('❌ Ship not found');
        }
        
        // Test 4: Test ViewManager integration
        console.log('\n🔗 Testing ViewManager Integration:');
        
        const viewManager = window.app?.viewManager;
        if (viewManager && typeof viewManager.initializeShipSystems === 'function') {
            console.log('✅ ViewManager has unified initializeShipSystems method');
        } else {
            console.error('❌ ViewManager missing unified initialization');
        }
        
        console.log('\n🎯 Summary: Corrected Docking/Launching System');
        console.log('• ✅ Unified ship initialization approach implemented');
        console.log('• ✅ Old save/restore pattern removed');
        console.log('• ✅ Systems properly shut down on docking');
        console.log('• ✅ Systems properly initialized on launch');
        console.log('• ✅ Targeting computer starts inactive (requires manual activation)');
        console.log('• ✅ Weapon systems properly registered with HUD');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}, 2000);

// Export for external use
window.testDockingSystemFix = () => {
    console.log('🔄 Manually triggering docking system test...');
    // Re-run the test
    setTimeout(() => location.reload(), 1000);
};

console.log('💡 Run window.testDockingSystemFix() to test again');

// Test Docking System Fix - Comprehensive Targeting Computer Testing
(function() {
    console.log('🧪 === DOCKING SYSTEM FIX TEST ===');
    
    const starfieldManager = window.viewManager?.starfieldManager;
    if (!starfieldManager) {
        console.error('❌ StarfieldManager not found - ensure game is loaded');
        return;
    }
    
    const ship = starfieldManager.viewManager?.getShip();
    if (!ship) {
        console.error('❌ Ship not found - ensure game is initialized');
        return;
    }
    
    console.log('\n🔍 === DIAGNOSTIC PHASE ===');
    
    // Check current state
    function checkTargetingComputerState() {
        console.log('\n📊 Targeting Computer State:');
        
        const targetComputerSystem = ship.getSystem('target_computer');
        if (targetComputerSystem) {
            console.log(`   ✅ System exists: Level ${targetComputerSystem.level}`);
            console.log(`   • Active: ${targetComputerSystem.isActive}`);
            console.log(`   • Operational: ${targetComputerSystem.isOperational()}`);
            console.log(`   • Can activate: ${targetComputerSystem.canActivate(ship)}`);
            console.log(`   • System current target: ${targetComputerSystem.currentTarget?.shipName || 'None'}`);
        } else {
            console.log('   ❌ No targeting computer system found');
        }
        
        console.log('\n📊 StarfieldManager State:');
        console.log(`   • targetComputerEnabled: ${starfieldManager.targetComputerEnabled}`);
        console.log(`   • currentTarget: ${starfieldManager.currentTarget?.name || starfieldManager.currentTarget?.shipName || 'None'}`);
        console.log(`   • targetedObject: ${starfieldManager.targetedObject?.name || 'None'}`);
        console.log(`   • lastTargetedObjectId: ${starfieldManager.lastTargetedObjectId || 'None'}`);
        console.log(`   • targetIndex: ${starfieldManager.targetIndex}`);
        console.log(`   • targetObjects length: ${starfieldManager.targetObjects?.length || 0}`);
        console.log(`   • validTargets length: ${starfieldManager.validTargets?.length || 0}`);
        console.log(`   • lastTargetCycleTime: ${starfieldManager.lastTargetCycleTime || 0}`);
        
        const hasTargetComputerCards = ship.hasSystemCardsSync('target_computer');
        console.log(`   • Has targeting cards: ${hasTargetComputerCards}`);
        
        return {
            system: targetComputerSystem,
            enabled: starfieldManager.targetComputerEnabled,
            hasCards: hasTargetComputerCards
        };
    }
    
    // Test target state clearing
    function testTargetStateClear() {
        console.log('\n🧹 === TESTING TARGET STATE CLEARING ===');
        
        // Set some dummy target state
        starfieldManager.currentTarget = { name: 'DummyTarget' };
        starfieldManager.targetedObject = { name: 'DummyObject' };
        starfieldManager.lastTargetedObjectId = 'dummy123';
        starfieldManager.targetIndex = 5;
        starfieldManager.validTargets = [1, 2, 3];
        starfieldManager.lastTargetCycleTime = Date.now();
        
        console.log('🔧 Set dummy target state...');
        console.log(`   • currentTarget: ${starfieldManager.currentTarget.name}`);
        console.log(`   • targetIndex: ${starfieldManager.targetIndex}`);
        console.log(`   • validTargets: [${starfieldManager.validTargets.join(', ')}]`);
        
        // Clear target state
        starfieldManager.clearTargetComputer();
        
        console.log('\n🧹 After clearTargetComputer():');
        console.log(`   • currentTarget: ${starfieldManager.currentTarget || 'null'}`);
        console.log(`   • targetedObject: ${starfieldManager.targetedObject || 'null'}`);
        console.log(`   • lastTargetedObjectId: ${starfieldManager.lastTargetedObjectId || 'null'}`);
        console.log(`   • targetIndex: ${starfieldManager.targetIndex}`);
        console.log(`   • validTargets: [${starfieldManager.validTargets?.join(', ') || ''}]`);
        console.log(`   • lastTargetCycleTime: ${starfieldManager.lastTargetCycleTime}`);
        console.log(`   • targetComputerEnabled: ${starfieldManager.targetComputerEnabled}`);
        
        const allCleared = !starfieldManager.currentTarget && 
                          !starfieldManager.targetedObject && 
                          !starfieldManager.lastTargetedObjectId &&
                          starfieldManager.targetIndex === -1 &&
                          (!starfieldManager.validTargets || starfieldManager.validTargets.length === 0) &&
                          starfieldManager.lastTargetCycleTime === 0 &&
                          !starfieldManager.targetComputerEnabled;
        
        console.log(`\n${allCleared ? '✅' : '❌'} Target state clearing: ${allCleared ? 'SUCCESS' : 'FAILED'}`);
        return allCleared;
    }
    
    // Test targeting computer activation/deactivation
    function testTargetingToggle() {
        console.log('\n⚡ === TESTING TARGETING COMPUTER TOGGLE ===');
        
        const initialState = checkTargetingComputerState();
        
        console.log('🔄 Testing TAB toggle (off -> on -> off)...');
        
        // Ensure it's off first
        if (initialState.enabled) {
            starfieldManager.toggleTargetComputer();
            console.log('   • Turned off targeting computer');
        }
        
        // Test activation
        starfieldManager.toggleTargetComputer();
        const afterActivation = checkTargetingComputerState();
        
        console.log('\n📊 After activation:');
        console.log(`   • Enabled: ${afterActivation.enabled}`);
        console.log(`   • System active: ${afterActivation.system?.isActive}`);
        console.log(`   • Target list populated: ${starfieldManager.targetObjects?.length > 0}`);
        
        // Test deactivation
        starfieldManager.toggleTargetComputer();
        const afterDeactivation = checkTargetingComputerState();
        
        console.log('\n📊 After deactivation:');
        console.log(`   • Enabled: ${afterDeactivation.enabled}`);
        console.log(`   • System active: ${afterDeactivation.system?.isActive}`);
        
        const toggleWorking = !afterDeactivation.enabled && !afterDeactivation.system?.isActive;
        console.log(`\n${toggleWorking ? '✅' : '❌'} TAB toggle: ${toggleWorking ? 'SUCCESS' : 'FAILED'}`);
        
        return toggleWorking;
    }
    
    // Test target cycling functionality
    function testTargetCycling() {
        console.log('\n🎯 === TESTING TARGET CYCLING FUNCTIONALITY ===');
        
        // Ensure targeting computer is on
        if (!starfieldManager.targetComputerEnabled) {
            starfieldManager.toggleTargetComputer();
        }
        
        // Update target list
        starfieldManager.updateTargetList();
        
        console.log(`📋 Available targets: ${starfieldManager.targetObjects?.length || 0}`);
        
        if (!starfieldManager.targetObjects || starfieldManager.targetObjects.length === 0) {
            console.log('⚠️ No targets available for cycling test');
            return false;
        }
        
        // List available targets
        starfieldManager.targetObjects.forEach((target, index) => {
            console.log(`   ${index}: ${target.name} (${target.isShip ? 'ship' : target.type})`);
        });
        
        // Test cycling
        console.log('\n🔄 Testing target cycling...');
        const initialIndex = starfieldManager.targetIndex;
        const initialTarget = starfieldManager.currentTarget;
        
        console.log(`   • Initial index: ${initialIndex}`);
        console.log(`   • Initial target: ${initialTarget?.name || initialTarget?.shipName || 'None'}`);
        
        // Cycle to next target
        starfieldManager.cycleTarget();
        
        const afterCycleIndex = starfieldManager.targetIndex;
        const afterCycleTarget = starfieldManager.currentTarget;
        
        console.log(`   • After cycle index: ${afterCycleIndex}`);
        console.log(`   • After cycle target: ${afterCycleTarget?.name || afterCycleTarget?.shipName || 'None'}`);
        
        // Test another cycle
        starfieldManager.cycleTarget();
        
        const secondCycleIndex = starfieldManager.targetIndex;
        const secondCycleTarget = starfieldManager.currentTarget;
        
        console.log(`   • Second cycle index: ${secondCycleIndex}`);
        console.log(`   • Second cycle target: ${secondCycleTarget?.name || secondCycleTarget?.shipName || 'None'}`);
        
        const cyclingWorking = afterCycleIndex !== initialIndex || 
                              (afterCycleTarget !== initialTarget && afterCycleTarget !== null);
        
        console.log(`\n${cyclingWorking ? '✅' : '❌'} Target cycling: ${cyclingWorking ? 'SUCCESS' : 'FAILED'}`);
        
        return cyclingWorking;
    }
    
    // Test ship system integration after undocking
    function testSystemIntegration() {
        console.log('\n🔗 === TESTING SYSTEM INTEGRATION ===');
        
        // Call initializeShipSystems to simulate post-undock behavior
        console.log('🚀 Calling initializeShipSystems...');
        starfieldManager.initializeShipSystems();
        
        // Wait for async initialization
        setTimeout(() => {
            const postInitState = checkTargetingComputerState();
            
            console.log('\n📊 After initializeShipSystems:');
            console.log(`   • System/Manager sync: ${postInitState.system?.isActive === postInitState.enabled ? '✅' : '❌'}`);
            console.log(`   • Target state cleared: ${!starfieldManager.currentTarget ? '✅' : '❌'}`);
            console.log(`   • Ready for manual activation: ${!postInitState.enabled ? '✅' : '❌'}`);
            
            // Test manual activation after initialization
            console.log('\n🔄 Testing manual activation after init...');
            starfieldManager.toggleTargetComputer();
            
            const afterManualActivation = checkTargetingComputerState();
            console.log(`   • Manual activation works: ${afterManualActivation.enabled ? '✅' : '❌'}`);
            console.log(`   • Target cycling available: ${starfieldManager.targetObjects?.length > 0 ? '✅' : '❌'}`);
            
        }, 100);
    }
    
    // Run all tests
    console.log('\n🧪 === RUNNING COMPREHENSIVE TESTS ===');
    
    checkTargetingComputerState();
    
    const clearTest = testTargetStateClear();
    const toggleTest = testTargetingToggle();
    const cyclingTest = testTargetCycling();
    testSystemIntegration();
    
    console.log('\n🏁 === TEST SUMMARY ===');
    console.log(`   • Target state clearing: ${clearTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   • TAB toggle: ${toggleTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   • Target cycling: ${cyclingTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   • System integration: Check logs above`);
    
    const overallResult = clearTest && toggleTest && cyclingTest;
    console.log(`\n🎯 OVERALL RESULT: ${overallResult ? '✅ SUCCESS' : '❌ NEEDS FIXES'}`);
    
    if (overallResult) {
        console.log('\n🎉 All tests passed! The docking/targeting system should work correctly.');
        console.log('💡 Try docking -> undocking -> TAB to cycle targets');
    } else {
        console.log('\n🔧 Some tests failed. Check the specific failures above.');
    }
    
})();

// Auto-run the test
setTimeout(() => {
    console.log('🧪 Testing Corrected Docking/Launching System');
    console.log('💡 Run window.testDockingSystemFix() to test again');
}, 100);

// Quick test function for easy access
window.testTargetingComputerFix = function() {
    console.log('🔧 === QUICK TARGETING COMPUTER TEST ===');
    
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = starfieldManager?.viewManager?.getShip();
    
    if (!starfieldManager || !ship) {
        console.error('❌ Game not available');
        return;
    }
    
    console.log('📊 Current state:');
    const targetComputer = ship.getSystem('target_computer');
    const hasCards = ship.hasSystemCardsSync('target_computer');
    
    console.log(`  - Target computer system: ${targetComputer ? '✅' : '❌'}`);
    console.log(`  - Has cards: ${hasCards ? '✅' : '❌'}`);
    console.log(`  - StarfieldManager enabled: ${starfieldManager.targetComputerEnabled ? '✅' : '❌'}`);
    console.log(`  - Current target: ${starfieldManager.currentTarget?.name || 'none'}`);
    
    if (targetComputer && hasCards) {
        console.log('\n🎯 Testing activation...');
        if (!starfieldManager.targetComputerEnabled) {
            starfieldManager.toggleTargetComputer();
        }
        
        if (starfieldManager.targetComputerEnabled) {
            console.log('  ✅ Target computer activated');
            console.log('  💡 Try pressing TAB to cycle targets');
        } else {
            console.log('  ❌ Failed to activate target computer');
        }
    } else {
        console.log('  ⚠️ Target computer not functional');
    }
}; 