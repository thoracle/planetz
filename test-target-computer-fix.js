// Target Computer Method Fix Test
// Run this in the browser console to test that the removeDestroyedTarget method no longer has errors

(function() {
    console.log('=== Target Computer Method Fix Test ===');
    
    // Get the game components
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    const targetComputer = ship?.getSystem('target_computer');
    
    if (!starfieldManager || !ship || !targetComputer) {
        console.error('❌ Game not ready. Make sure you have a ship and targeting computer.');
        console.log('💡 1. Load the game at http://localhost:5001');
        console.log('💡 2. Press T to enable target computer');
        console.log('💡 3. Press Ctrl+Shift+D to create target dummies');
        console.log('💡 4. Run this test again');
        return;
    }
    
    // Function to test target computer method calls
    function testTargetComputerMethods() {
        console.log('🧪 Testing target computer methods...');
        
        // Check that the correct methods exist
        const hasSetTarget = typeof targetComputer.setTarget === 'function';
        const hasClearTarget = typeof targetComputer.clearTarget === 'function';
        const hasClearSubTarget = typeof targetComputer.clearSubTarget === 'function';
        
        console.log('📋 Target Computer Methods:');
        console.log(`   • setTarget(): ${hasSetTarget ? '✅ EXISTS' : '❌ MISSING'}`);
        console.log(`   • clearTarget(): ${hasClearTarget ? '✅ EXISTS' : '❌ MISSING'}`);
        console.log(`   • clearSubTarget(): ${hasClearSubTarget ? '✅ EXISTS' : '❌ MISSING'}`);
        
        if (!hasSetTarget || !hasClearTarget || !hasClearSubTarget) {
            console.error('❌ Target computer missing required methods!');
            return false;
        }
        
        // Test that the old incorrect method doesn't exist
        const hasOldMethod = typeof targetComputer.setCurrentTarget === 'function';
        console.log(`   • setCurrentTarget() (old): ${hasOldMethod ? '⚠️ STILL EXISTS' : '✅ CORRECTLY REMOVED'}`);
        
        return true;
    }
    
    // Function to test target destruction without errors
    function testDestructionWithoutErrors() {
        console.log('\\n🎯 Testing target destruction without method errors...');
        
        // Check if we have targets to destroy
        if (!starfieldManager.targetObjects || starfieldManager.targetObjects.length === 0) {
            console.error('❌ No targets available. Press Ctrl+Shift+D to create target dummies first.');
            return false;
        }
        
        // Check if we have a current target
        if (!starfieldManager.currentTarget) {
            console.log('📍 No current target. Press Tab to target a ship first.');
            return false;
        }
        
        const currentTargetData = starfieldManager.getCurrentTargetData();
        if (!currentTargetData?.isShip || !currentTargetData?.ship) {
            console.log('📍 Current target is not a ship. Press Tab to target a ship first.');
            return false;
        }
        
        console.log(`🎯 Current target: ${currentTargetData.name || 'Unknown ship'}`);
        console.log('🔥 Simulating target destruction...');
        
        // Capture any console errors
        const originalError = console.error;
        let errorCaught = false;
        let errorMessage = '';
        
        console.error = function(...args) {
            if (args[0] && args[0].includes && args[0].includes('setCurrentTarget')) {
                errorCaught = true;
                errorMessage = args.join(' ');
            }
            originalError.apply(console, args);
        };
        
        try {
            // Call removeDestroyedTarget to test the fix
            starfieldManager.removeDestroyedTarget(currentTargetData.ship);
            
            console.log('✅ removeDestroyedTarget completed without method errors!');
            
            if (errorCaught) {
                console.error(`❌ Method error still occurred: ${errorMessage}`);
                return false;
            } else {
                console.log('✅ No setCurrentTarget method errors detected!');
                return true;
            }
            
        } catch (error) {
            console.error(`❌ Unexpected error during destruction test: ${error.message}`);
            return false;
        } finally {
            // Restore original console.error
            console.error = originalError;
        }
    }
    
    // Main test function
    function runTargetComputerFixTest() {
        console.log('\\n=== Running Target Computer Fix Test ===');
        
        const methodsOk = testTargetComputerMethods();
        if (!methodsOk) {
            console.error('❌ Target computer methods test failed!');
            return;
        }
        
        const destructionOk = testDestructionWithoutErrors();
        if (!destructionOk) {
            console.error('❌ Target destruction test failed!');
            return;
        }
        
        console.log('\\n🎉 === ALL TESTS PASSED ===');
        console.log('✅ Target computer method fix is working correctly!');
        console.log('✅ No more "setCurrentTarget is not a function" errors!');
    }
    
    // Auto-run the test
    runTargetComputerFixTest();
    
})(); 