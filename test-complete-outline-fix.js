// Complete 3D Outline Fix Test
window.testCompleteOutlineFix = function() {
    console.log('🧪 === COMPLETE 3D OUTLINE FIX TEST ===');
    
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
    
    console.log('\n📊 INITIAL STATE CHECK:');
    console.log(`   • Target computer: ${starfieldManager.targetComputerEnabled}`);
    console.log(`   • Outline system: ${starfieldManager.outlineEnabled}`);
    console.log(`   • Throttling enabled: ${typeof starfieldManager.lastOutlineUpdate === 'number'}`);
    console.log(`   • Current target: ${starfieldManager.getCurrentTargetData()?.name || 'none'}`);
    console.log(`   • Current outline: ${starfieldManager.targetOutline ? 'exists' : 'none'}`);
    console.log(`   • Outline tracking: ${starfieldManager.targetOutlineObject ? 'active' : 'none'}`);
    
    // Create targets if needed
    if (!starfieldManager.targetObjects || starfieldManager.targetObjects.length === 0) {
        console.log('\n🎯 Creating test targets...');
        starfieldManager.createTargetDummyShips(3);
        
        setTimeout(() => {
            continueTest();
        }, 1000);
    } else {
        continueTest();
    }
    
    function continueTest() {
        console.log(`\n✅ Found ${starfieldManager.targetObjects?.length || 0} targets`);
        
        if (starfieldManager.targetObjects && starfieldManager.targetObjects.length > 0) {
            // Cycle to first target if not already targeted
            if (!starfieldManager.currentTarget) {
                console.log('🔄 Cycling to first target...');
                starfieldManager.cycleTarget();
            }
            
            setTimeout(() => {
                console.log('\n📊 AFTER TARGET SELECTION:');
                const currentTarget = starfieldManager.getCurrentTargetData();
                console.log(`   • Current target: ${currentTarget?.name || 'none'}`);
                console.log(`   • Target type: ${currentTarget?.type || 'unknown'}`);
                console.log(`   • Is ship: ${currentTarget?.isShip || false}`);
                console.log(`   • Outline exists: ${starfieldManager.targetOutline ? 'yes' : 'no'}`);
                console.log(`   • Outline tracking object: ${starfieldManager.targetOutlineObject ? 'yes' : 'no'}`);
                
                console.log('\n🧪 TEST SCENARIOS:');
                console.log('1. Try destroying the current target with weapons');
                console.log('   → Expected: Outline should disappear completely');
                console.log('   → Expected: No continuous recreation loop');
                console.log('   → Expected: Clean transition to next target');
                
                console.log('\n2. Try pressing Tab to cycle targets');
                console.log('   → Expected: Outline should move to new target');
                console.log('   → Expected: No "unknown type" outlines');
                
                console.log('\n3. Try pressing O to toggle outlines');
                console.log('   → Expected: Outline should appear/disappear cleanly');
                
                console.log('\n💡 DEBUGGING INFO:');
                console.log('   • Run `starfieldManager.clearTargetOutline()` to manually clear');
                console.log('   • Run `starfieldManager.toggleTargetOutline()` to toggle');
                console.log('   • Watch console for "🎯 Skipping outline creation" messages');
                console.log('   • Watch for throttling messages in main loop');
                
                // Add a periodic checker to monitor outline state
                let checkCount = 0;
                const checker = setInterval(() => {
                    checkCount++;
                    const hasOutline = starfieldManager.targetOutline ? true : false;
                    const targetName = starfieldManager.getCurrentTargetData()?.name || 'none';
                    const throttleTime = Date.now() - (starfieldManager.lastOutlineUpdate || 0);
                    
                    console.log(`📊 Status Check ${checkCount}: Target="${targetName}", Outline=${hasOutline}, Throttle=${throttleTime}ms ago`);
                    
                    if (checkCount >= 10) {
                        clearInterval(checker);
                        console.log('✅ Monitoring complete. Test is ready!');
                    }
                }, 2000);
                
            }, 500);
        } else {
            console.log('❌ No targets available for testing');
        }
    }
};

console.log('🧪 Complete outline fix test loaded!');
console.log('💡 Run testCompleteOutlineFix() to start comprehensive testing'); 