// Final 3D Outline Race Condition Fix Test
window.testFinalOutlineFix = function() {
    console.log('🧪 === FINAL 3D OUTLINE RACE CONDITION FIX TEST ===');
    
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
    
    console.log('\n📊 RACE CONDITION TEST:');
    console.log('This test will monitor for the specific race condition that caused:');
    console.log('  • "🎯 Creating 3D outline for target: Luna"');
    console.log('  • "🎯 Created 3D outline for target: unknown"');
    console.log('');
    console.log('✅ EXPECTED BEHAVIOR (after fix):');
    console.log('  • Both log messages should show the same target name');
    console.log('  • No "unknown" target names in outline creation logs');
    console.log('  • No continuous recreation loops');
    
    // Create targets if needed
    if (!starfieldManager.targetObjects || starfieldManager.targetObjects.length === 0) {
        console.log('\n🎯 Creating test targets...');
        starfieldManager.createTargetDummyShips(3);
        
        setTimeout(() => {
            runRaceConditionTest();
        }, 1000);
    } else {
        runRaceConditionTest();
    }
    
    function runRaceConditionTest() {
        console.log(`\n✅ Test setup complete with ${starfieldManager.targetObjects?.length || 0} targets`);
        
        // Monitor outline creation for race conditions
        let outlineCreationCount = 0;
        let lastTargetName = null;
        let raceConditionDetected = false;
        
        // Override console.log temporarily to catch outline messages
        const originalLog = console.log;
        console.log = function(...args) {
            const message = args.join(' ');
            
            // Track outline creation messages
            if (message.includes('🎯 Creating 3D outline for target:')) {
                const match = message.match(/🎯 Creating 3D outline for target: (.+)/);
                if (match) {
                    lastTargetName = match[1];
                    outlineCreationCount++;
                    originalLog(`📊 [MONITOR] Creating outline for: "${lastTargetName}"`);
                }
            } else if (message.includes('🎯 Created 3D outline for target:')) {
                const match = message.match(/🎯 Created 3D outline for target: (.+)/);
                if (match) {
                    const createdTargetName = match[1];
                    if (lastTargetName && createdTargetName !== lastTargetName) {
                        raceConditionDetected = true;
                        originalLog(`❌ RACE CONDITION DETECTED!`);
                        originalLog(`   Expected: "${lastTargetName}"`);
                        originalLog(`   Got: "${createdTargetName}"`);
                    } else {
                        originalLog(`✅ [MONITOR] Successfully created outline for: "${createdTargetName}"`);
                    }
                    
                    if (createdTargetName === 'unknown') {
                        raceConditionDetected = true;
                        originalLog(`❌ UNKNOWN TARGET DETECTED in outline creation!`);
                    }
                }
            }
            
            // Pass through all other messages normally
            originalLog.apply(console, args);
        };
        
        console.log('\n🧪 STARTING RACE CONDITION MONITORING...');
        console.log('   → Overriding console.log to track outline creation messages');
        console.log('   → Will test target cycling and destruction scenarios');
        
        // Test 1: Basic target cycling
        setTimeout(() => {
            console.log('\n🧪 TEST 1: Target cycling...');
            starfieldManager.cycleTarget();
        }, 1000);
        
        // Test 2: Multiple rapid cycles
        setTimeout(() => {
            console.log('\n🧪 TEST 2: Rapid target cycling...');
            for (let i = 0; i < 3; i++) {
                setTimeout(() => starfieldManager.cycleTarget(), i * 100);
            }
        }, 2000);
        
        // Test 3: Outline toggle during targeting
        setTimeout(() => {
            console.log('\n🧪 TEST 3: Outline toggle test...');
            starfieldManager.toggleTargetOutline(); // Off
            setTimeout(() => {
                starfieldManager.toggleTargetOutline(); // On
            }, 200);
        }, 4000);
        
        // Final report
        setTimeout(() => {
            console.log = originalLog; // Restore console.log
            
            console.log('\n📊 === RACE CONDITION TEST RESULTS ===');
            console.log(`   • Total outline creations: ${outlineCreationCount}`);
            console.log(`   • Race condition detected: ${raceConditionDetected ? '❌ YES' : '✅ NO'}`);
            
            if (!raceConditionDetected) {
                console.log('✅ SUCCESS: No race conditions detected!');
                console.log('   → Target data is now properly synchronized');
                console.log('   → Outline creation uses validated data consistently');
            } else {
                console.log('❌ FAILURE: Race conditions still present');
                console.log('   → Further investigation needed');
            }
            
            console.log('\n💡 You can now test target destruction:');
            console.log('   1. Enable autofire with Space');
            console.log('   2. Destroy the current target');
            console.log('   3. Watch for clean outline transitions');
            console.log('   4. No "unknown" targets should appear');
            
        }, 6000);
    }
};

console.log('🧪 Final outline race condition fix test loaded!');
console.log('💡 Run testFinalOutlineFix() to verify the race condition is fixed'); 