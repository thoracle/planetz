// Outline Debugging Script - Comprehensive Test
window.debugOutlineIssue = function() {
    console.log('🔍 === COMPREHENSIVE OUTLINE DEBUG ===');
    
    const starfieldManager = window.viewManager?.starfieldManager;
    if (!starfieldManager) {
        console.error('❌ StarfieldManager not found');
        return;
    }
    
    // Function to capture complete state
    const captureState = (label) => {
        const state = {
            label,
            targetComputerEnabled: starfieldManager.targetComputerEnabled,
            outlineEnabled: starfieldManager.outlineEnabled,
            outlineDisabledUntilManualCycle: starfieldManager.outlineDisabledUntilManualCycle,
            currentTargetExists: !!starfieldManager.currentTarget,
            outlineExists: !!starfieldManager.targetOutline,
            targetCount: starfieldManager.targetObjects?.length || 0,
            currentTargetName: starfieldManager.getCurrentTargetData()?.name || 'none'
        };
        
        console.log(`📊 STATE [${label}]:`);
        Object.entries(state).forEach(([key, value]) => {
            if (key !== 'label') {
                console.log(`   • ${key}: ${value}`);
            }
        });
        
        return state;
    };
    
    // Enable systems if needed
    if (!starfieldManager.targetComputerEnabled) {
        console.log('🎯 Enabling target computer...');
        starfieldManager.toggleTargetComputer();
    }
    
    if (!starfieldManager.outlineEnabled) {
        console.log('🎯 Enabling 3D outlines...');
        starfieldManager.toggleTargetOutline();
    }
    
    // Create test targets if needed
    if (!starfieldManager.targetObjects || starfieldManager.targetObjects.length === 0) {
        console.log('🎯 Creating target dummies...');
        starfieldManager.createTargetDummyShips(3).then(() => {
            console.log('✅ Target dummies created, continuing test...');
            continueDebugTest();
        });
    } else {
        continueDebugTest();
    }
    
    function continueDebugTest() {
        // Capture initial state
        const initialState = captureState('INITIAL');
        
        // Test 1: Manual cycling should work normally
        console.log('\n🧪 TEST 1: Manual cycling');
        starfieldManager.cycleTarget(true);
        setTimeout(() => {
            captureState('AFTER_MANUAL_CYCLE');
            
            // Test 2: Set suppression flag and test automatic cycling
            console.log('\n🧪 TEST 2: Suppression flag behavior');
            starfieldManager.outlineDisabledUntilManualCycle = true;
            captureState('FLAG_SET_TO_TRUE');
            
            // Try automatic cycle (should maintain flag)
            starfieldManager.cycleTarget(false);
            setTimeout(() => {
                captureState('AFTER_AUTOMATIC_CYCLE');
                
                // Try manual cycle (should clear flag)
                starfieldManager.cycleTarget(true);
                setTimeout(() => {
                    captureState('AFTER_MANUAL_CYCLE_WITH_FLAG');
                    
                    // Test 3: Tab key simulation
                    console.log('\n🧪 TEST 3: Tab key simulation');
                    // Reset flag for clean test
                    starfieldManager.outlineDisabledUntilManualCycle = true;
                    captureState('BEFORE_TAB_SIMULATION');
                    
                    // Simulate Tab key press by calling the exact same method as the key handler
                    console.log('🔑 Simulating Tab key press...');
                    starfieldManager.cycleTarget(); // This is what Tab key calls (no parameter = default true)
                    setTimeout(() => {
                        captureState('AFTER_TAB_SIMULATION');
                        
                        // Test 4: Edge case testing
                        console.log('\n🧪 TEST 4: Edge cases');
                        
                        // Test with no current target
                        const savedTarget = starfieldManager.currentTarget;
                        starfieldManager.currentTarget = null;
                        starfieldManager.outlineDisabledUntilManualCycle = true;
                        captureState('NO_TARGET_WITH_FLAG');
                        
                        starfieldManager.cycleTarget(true);
                        setTimeout(() => {
                            captureState('MANUAL_CYCLE_NO_INITIAL_TARGET');
                            
                            // Restore target
                            starfieldManager.currentTarget = savedTarget;
                            
                            console.log('\n💡 === DIAGNOSTIC COMPLETE ===');
                            console.log('🔧 Manual test steps:');
                            console.log('1. Run: starfieldManager.outlineDisabledUntilManualCycle = true');
                            console.log('2. Press Tab key');
                            console.log('3. Check if flag is false: starfieldManager.outlineDisabledUntilManualCycle');
                            console.log('4. Check if outline appears: !!starfieldManager.targetOutline');
                            
                            // Set up manual testing helpers
                            window.checkOutlineState = () => {
                                captureState('MANUAL_CHECK');
                            };
                            
                            window.testTabKey = () => {
                                console.log('🔑 Testing Tab key behavior...');
                                const before = starfieldManager.outlineDisabledUntilManualCycle;
                                starfieldManager.cycleTarget(); // Same as Tab key
                                const after = starfieldManager.outlineDisabledUntilManualCycle;
                                console.log(`Flag changed from ${before} to ${after}`);
                                console.log(`Outline exists: ${!!starfieldManager.targetOutline}`);
                            };
                            
                            console.log('\n🛠️ Helper functions available:');
                            console.log('• checkOutlineState() - Check current state');
                            console.log('• testTabKey() - Test Tab key behavior');
                            
                        }, 100);
                    }, 100);
                }, 100);
            }, 100);
        }, 100);
    }
};

// Auto-load notification
console.log('🧪 Outline debugging script loaded!');
console.log('Run: debugOutlineIssue() to start comprehensive testing'); 