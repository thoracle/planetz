// Test Outline Flag Persistence Issue
window.testOutlineFlagPersistence = function() {
    console.log('🔍 === OUTLINE FLAG PERSISTENCE TEST ===');
    
    const starfieldManager = window.viewManager?.starfieldManager;
    if (!starfieldManager) {
        console.error('❌ StarfieldManager not found');
        return;
    }
    
    // Enable required systems
    if (!starfieldManager.targetComputerEnabled) {
        starfieldManager.toggleTargetComputer();
    }
    if (!starfieldManager.outlineEnabled) {
        starfieldManager.toggleTargetOutline();
    }
    
    console.log('🎯 Testing suppression flag persistence...');
    
    // Function to test flag behavior
    const testFlagBehavior = (description, flagValue, cycleType) => {
        console.log(`\n📋 ${description}`);
        starfieldManager.outlineDisabledUntilManualCycle = flagValue;
        console.log(`   • Flag set to: ${flagValue}`);
        console.log(`   • Current target: ${starfieldManager.getCurrentTargetData()?.name || 'none'}`);
        console.log(`   • Outline exists before: ${!!starfieldManager.targetOutline}`);
        
        if (cycleType === 'manual') {
            starfieldManager.cycleTarget(true);
        } else if (cycleType === 'automatic') {
            starfieldManager.cycleTarget(false);
        } else if (cycleType === 'tab_simulation') {
            starfieldManager.cycleTarget(); // Same as Tab key
        }
        
        setTimeout(() => {
            console.log(`   • Flag after cycle: ${starfieldManager.outlineDisabledUntilManualCycle}`);
            console.log(`   • Outline exists after: ${!!starfieldManager.targetOutline}`);
            console.log(`   • New target: ${starfieldManager.getCurrentTargetData()?.name || 'none'}`);
            
            if (cycleType === 'manual' || cycleType === 'tab_simulation') {
                if (starfieldManager.outlineDisabledUntilManualCycle === false) {
                    console.log(`   ✅ PASS: Flag correctly cleared for ${cycleType} cycle`);
                } else {
                    console.log(`   ❌ FAIL: Flag not cleared for ${cycleType} cycle`);
                }
            } else {
                if (starfieldManager.outlineDisabledUntilManualCycle === true) {
                    console.log(`   ✅ PASS: Flag correctly maintained for automatic cycle`);
                } else {
                    console.log(`   ❌ FAIL: Flag incorrectly cleared for automatic cycle`);
                }
            }
        }, 50);
    };
    
    // Create targets if needed
    if (!starfieldManager.targetObjects || starfieldManager.targetObjects.length < 2) {
        console.log('🎯 Creating targets for testing...');
        starfieldManager.createTargetDummyShips(3).then(() => {
            runTests();
        });
    } else {
        runTests();
    }
    
    function runTests() {
        setTimeout(() => {
            console.log(`\n📊 Starting tests with ${starfieldManager.targetObjects?.length || 0} targets`);
            
            // Test 1: Manual cycle should clear flag
            testFlagBehavior('TEST 1: Manual cycle with flag set', true, 'manual');
            
            setTimeout(() => {
                // Test 2: Automatic cycle should maintain flag
                testFlagBehavior('TEST 2: Automatic cycle with flag set', true, 'automatic');
                
                setTimeout(() => {
                    // Test 3: Tab key simulation should clear flag (this is the critical test)
                    testFlagBehavior('TEST 3: Tab key simulation with flag set', true, 'tab_simulation');
                    
                    setTimeout(() => {
                        // Test 4: Tab key multiple times
                        console.log('\n📋 TEST 4: Multiple Tab key presses');
                        starfieldManager.outlineDisabledUntilManualCycle = true;
                        console.log('   • Flag set to: true');
                        
                        for (let i = 1; i <= 3; i++) {
                            setTimeout(() => {
                                console.log(`   • Tab press ${i}:`);
                                const beforeFlag = starfieldManager.outlineDisabledUntilManualCycle;
                                const beforeOutline = !!starfieldManager.targetOutline;
                                
                                starfieldManager.cycleTarget(); // Tab key simulation
                                
                                setTimeout(() => {
                                    const afterFlag = starfieldManager.outlineDisabledUntilManualCycle;
                                    const afterOutline = !!starfieldManager.targetOutline;
                                    
                                    console.log(`     Flag: ${beforeFlag} → ${afterFlag}`);
                                    console.log(`     Outline: ${beforeOutline} → ${afterOutline}`);
                                    console.log(`     Target: ${starfieldManager.getCurrentTargetData()?.name || 'none'}`);
                                    
                                    if (i === 1) {
                                        if (afterFlag === false) {
                                            console.log(`     ✅ Flag cleared on first Tab press`);
                                        } else {
                                            console.log(`     ❌ Flag NOT cleared on first Tab press`);
                                        }
                                    }
                                    
                                    if (i === 3) {
                                        console.log('\n💡 === TEST COMPLETE ===');
                                        console.log('🔧 Manual testing helpers:');
                                        
                                        window.setFlag = (value) => {
                                            starfieldManager.outlineDisabledUntilManualCycle = value;
                                            console.log(`Flag set to: ${value}`);
                                        };
                                        
                                        window.checkFlag = () => {
                                            console.log(`Current flag: ${starfieldManager.outlineDisabledUntilManualCycle}`);
                                            console.log(`Current outline: ${!!starfieldManager.targetOutline}`);
                                            console.log(`Current target: ${starfieldManager.getCurrentTargetData()?.name || 'none'}`);
                                        };
                                        
                                        window.simulateTabKey = () => {
                                            console.log('🔑 Simulating Tab key...');
                                            const before = starfieldManager.outlineDisabledUntilManualCycle;
                                            starfieldManager.cycleTarget();
                                            const after = starfieldManager.outlineDisabledUntilManualCycle;
                                            console.log(`Flag changed: ${before} → ${after}`);
                                        };
                                        
                                        console.log('🛠️ Available functions:');
                                        console.log('• setFlag(true/false) - Set suppression flag');
                                        console.log('• checkFlag() - Check current state');
                                        console.log('• simulateTabKey() - Test Tab key behavior');
                                    }
                                }, 50);
                            }, i * 200);
                        }
                    }, 300);
                }, 300);
            }, 300);
        }, 100);
    }
};

// Auto-load notification
console.log('🧪 Outline flag persistence test loaded!');
console.log('Run: testOutlineFlagPersistence() to test flag behavior'); 