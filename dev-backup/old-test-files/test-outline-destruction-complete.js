// Complete Outline Destruction Test
window.testOutlineDestructionComplete = function() {
    console.log('🧪 === COMPLETE OUTLINE DESTRUCTION TEST ===');
    
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    
    if (!starfieldManager || !ship) {
        console.error('❌ Game components not ready');
        return;
    }
    
    // Ensure systems are enabled
    if (!starfieldManager.targetComputerEnabled) {
        console.log('🎯 Enabling target computer...');
        starfieldManager.toggleTargetComputer();
    }
    
    if (!starfieldManager.outlineEnabled) {
        console.log('🎯 Enabling 3D outlines...');
        starfieldManager.toggleTargetOutline();
    }
    
    console.log('\n📊 DESTRUCTION OUTLINE TEST:');
    console.log('This test verifies that:');
    console.log('  ✅ Outlines disappear completely when ships are destroyed');
    console.log('  ✅ Outlines do NOT automatically appear on the next target');
    console.log('  ✅ Outlines only reappear when user manually cycles targets');
    
    // Create targets if needed
    if (!starfieldManager.targetObjects || starfieldManager.targetObjects.length === 0) {
        console.log('\n🎯 Creating test targets...');
        starfieldManager.createTargetDummyShips(3);
        
        setTimeout(() => {
            continueDestructionTest();
        }, 1000);
    } else {
        continueDestructionTest();
    }
    
    function continueDestructionTest() {
        console.log(`\n✅ Setup complete with ${starfieldManager.targetObjects?.length || 0} targets`);
        
        // Make sure we're targeting a ship
        let shipFound = false;
        for (let i = 0; i < 10 && !shipFound; i++) {
            const targetData = starfieldManager.getCurrentTargetData();
            if (targetData?.isShip) {
                shipFound = true;
                console.log(`🎯 Found ship target: ${targetData.name}`);
            } else {
                console.log(`🔄 Cycling past non-ship target: ${targetData?.name || 'unknown'}`);
                starfieldManager.cycleTarget();
            }
        }
        
        if (!shipFound) {
            console.error('❌ No ship targets found for destruction test');
            return;
        }
        
        // Monitor outline state
        let testStage = 'initial';
        let outlineStateLog = [];
        
        function logOutlineState(stage) {
            const hasOutline = starfieldManager.targetOutline ? true : false;
            const targetName = starfieldManager.getCurrentTargetData()?.name || 'none';
            outlineStateLog.push({ stage, hasOutline, targetName });
            console.log(`📊 ${stage}: Outline=${hasOutline}, Target="${targetName}"`);
        }
        
        // Initial state
        logOutlineState('INITIAL');
        
        console.log('\n🧪 TEST INSTRUCTIONS:');
        console.log('1. ⚡ Press SPACE to enable autofire');
        console.log('2. 💥 Watch the current ship get destroyed');
        console.log('3. 👀 EXPECTED: Outline should DISAPPEAR completely');
        console.log('4. 👀 EXPECTED: NO outline should appear on next target automatically');
        console.log('5. ⌨️  Press TAB to manually cycle - outline should reappear');
        
        // Monitor for destruction
        const checkDestruction = setInterval(() => {
            const currentTargetData = starfieldManager.getCurrentTargetData();
            
            if (testStage === 'initial' && currentTargetData && !currentTargetData.isShip) {
                testStage = 'destroyed';
                logOutlineState('AFTER_DESTRUCTION');
                
                // Check if outline was properly cleared
                const hasOutlineAfterDestruction = starfieldManager.targetOutline ? true : false;
                
                if (!hasOutlineAfterDestruction) {
                    console.log('✅ SUCCESS: Outline properly cleared after destruction!');
                } else {
                    console.log('❌ FAILURE: Outline still visible after destruction!');
                }
                
                console.log('\n🎯 Testing manual target cycling...');
                console.log('Press TAB to cycle targets and see if outline reappears properly');
                
                // Set up listener for manual cycling
                let manualCycleCount = 0;
                const originalCycleTarget = starfieldManager.cycleTarget.bind(starfieldManager);
                starfieldManager.cycleTarget = function() {
                    manualCycleCount++;
                    originalCycleTarget();
                    
                    if (manualCycleCount === 1) {
                        setTimeout(() => {
                            logOutlineState('AFTER_MANUAL_CYCLE');
                            
                            const hasOutlineAfterCycle = starfieldManager.targetOutline ? true : false;
                            if (hasOutlineAfterCycle) {
                                console.log('✅ SUCCESS: Outline reappeared after manual cycling!');
                            } else {
                                console.log('❌ FAILURE: Outline did not reappear after manual cycling!');
                            }
                            
                            // Generate final report
                            setTimeout(() => {
                                console.log('\n📊 === FINAL TEST RESULTS ===');
                                outlineStateLog.forEach(entry => {
                                    console.log(`   ${entry.stage}: Outline=${entry.hasOutline}, Target="${entry.targetName}"`);
                                });
                                
                                const initialHad = outlineStateLog.find(e => e.stage === 'INITIAL')?.hasOutline;
                                const afterDestruction = outlineStateLog.find(e => e.stage === 'AFTER_DESTRUCTION')?.hasOutline;
                                const afterCycle = outlineStateLog.find(e => e.stage === 'AFTER_MANUAL_CYCLE')?.hasOutline;
                                
                                const testsPassed = [
                                    { name: 'Initial outline present', passed: initialHad },
                                    { name: 'Outline cleared after destruction', passed: !afterDestruction },
                                    { name: 'Outline restored after manual cycle', passed: afterCycle }
                                ];
                                
                                console.log('\n📈 TEST SUMMARY:');
                                testsPassed.forEach(test => {
                                    console.log(`   ${test.passed ? '✅' : '❌'} ${test.name}`);
                                });
                                
                                const allPassed = testsPassed.every(test => test.passed);
                                console.log(`\n🎯 OVERALL RESULT: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
                                
                                // Restore original function
                                starfieldManager.cycleTarget = originalCycleTarget;
                                clearInterval(checkDestruction);
                                
                            }, 500);
                        }, 100);
                    }
                };
                
                // Auto-clear after 30 seconds if no manual cycling
                setTimeout(() => {
                    if (manualCycleCount === 0) {
                        console.log('⚠️ Test timeout - press TAB to cycle targets manually');
                        starfieldManager.cycleTarget = originalCycleTarget;
                        clearInterval(checkDestruction);
                    }
                }, 30000);
            }
            
        }, 500);
        
        // Auto-timeout after 60 seconds
        setTimeout(() => {
            clearInterval(checkDestruction);
            console.log('⚠️ Test completed - destruction monitoring stopped');
        }, 60000);
    }
};

console.log('🧪 Complete outline destruction test loaded!');
console.log('💡 Run testOutlineDestructionComplete() to verify outline destruction behavior'); 