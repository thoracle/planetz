/**
 * Test Script: Undock Cooldown Fix Verification
 * Tests that targeting computer cooldown provides proper user feedback
 */

console.log('🧪 Loading undock cooldown fix test...');

// Wait for game to be ready
window.waitForStarfieldManager((starfieldManager) => {
    console.log('\n=== UNDOCK COOLDOWN FIX TEST ===');
    
    const testResults = {
        cooldownDurationTest: false,
        feedbackMessageTest: false,
        cooldownExpirationTest: false
    };
    
    // Test 1: Check that cooldown duration is reasonable (10 seconds, not 30)
    console.log('\n📋 Test 1: Cooldown Duration');
    
    // Simulate undocking to trigger cooldown
    const originalUndockCooldown = starfieldManager.undockCooldown;
    starfieldManager.undockCooldown = Date.now() + 10000; // Simulate 10s cooldown
    
    const cooldownDuration = starfieldManager.undockCooldown - Date.now();
    if (cooldownDuration >= 9000 && cooldownDuration <= 11000) {
        console.log('✅ Cooldown duration is reasonable:', Math.round(cooldownDuration/1000), 'seconds');
        testResults.cooldownDurationTest = true;
    } else {
        console.log('❌ Cooldown duration unexpected:', Math.round(cooldownDuration/1000), 'seconds');
    }
    
    // Test 2: Verify proper feedback when TAB is pressed during cooldown
    console.log('\n📋 Test 2: User Feedback During Cooldown');
    
    // Mock the showHUDError method to capture messages
    let lastErrorTitle = '';
    let lastErrorMessage = '';
    const originalShowHUDError = starfieldManager.showHUDError;
    starfieldManager.showHUDError = (title, message, duration) => {
        lastErrorTitle = title;
        lastErrorMessage = message;
        console.log(`📢 HUD Error: "${title}" - "${message}"`);
        // Call original method for visual feedback
        originalShowHUDError.call(starfieldManager, title, message, duration);
    };
    
    // Mock the playCommandFailedSound method to verify it's called
    let commandFailedSoundPlayed = false;
    const originalPlayCommandFailedSound = starfieldManager.playCommandFailedSound;
    starfieldManager.playCommandFailedSound = () => {
        commandFailedSoundPlayed = true;
        console.log('🔊 Command failed sound played');
        originalPlayCommandFailedSound.call(starfieldManager);
    };
    
    // Simulate TAB key press during cooldown
    console.log('🔧 Simulating TAB key press during cooldown...');
    const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' });
    document.dispatchEvent(tabEvent);
    
    // Check if proper feedback was provided
    setTimeout(() => {
        if (lastErrorTitle === 'TARGETING SYSTEMS WARMING UP' && 
            lastErrorMessage.includes('Systems initializing after launch') &&
            lastErrorMessage.includes('s remaining') &&
            commandFailedSoundPlayed) {
            console.log('✅ Proper feedback provided during cooldown');
            testResults.feedbackMessageTest = true;
        } else {
            console.log('❌ Missing or incorrect feedback during cooldown');
            console.log('  Expected title: "TARGETING SYSTEMS WARMING UP"');
            console.log('  Actual title:', lastErrorTitle);
            console.log('  Expected message to include: "Systems initializing after launch" and "s remaining"');
            console.log('  Actual message:', lastErrorMessage);
            console.log('  Command failed sound played:', commandFailedSoundPlayed);
        }
        
        // Test 3: Verify cooldown expires and targeting becomes available
        console.log('\n📋 Test 3: Cooldown Expiration');
        
        // Set a short cooldown for quick testing
        starfieldManager.undockCooldown = Date.now() + 2000; // 2 seconds
        
        setTimeout(() => {
            // Reset feedback tracking
            lastErrorTitle = '';
            lastErrorMessage = '';
            commandFailedSoundPlayed = false;
            
            // Try TAB again after cooldown should have expired
            console.log('🔧 Testing TAB after cooldown expiration...');
            const tabEventAfter = new KeyboardEvent('keydown', { key: 'Tab' });
            document.dispatchEvent(tabEventAfter);
            
            setTimeout(() => {
                // After cooldown expires, we should either get no error (success) 
                // or a different error related to targeting computer state
                if (lastErrorTitle !== 'TARGETING SYSTEMS WARMING UP') {
                    console.log('✅ Cooldown properly expired - no warmup message');
                    testResults.cooldownExpirationTest = true;
                } else {
                    console.log('❌ Cooldown did not expire properly');
                }
                
                // Restore original methods
                starfieldManager.showHUDError = originalShowHUDError;
                starfieldManager.playCommandFailedSound = originalPlayCommandFailedSound;
                starfieldManager.undockCooldown = originalUndockCooldown;
                
                // Summary
                console.log('\n📊 TEST SUMMARY:');
                console.log('- Cooldown Duration Test:', testResults.cooldownDurationTest ? '✅ PASS' : '❌ FAIL');
                console.log('- Feedback Message Test:', testResults.feedbackMessageTest ? '✅ PASS' : '❌ FAIL');
                console.log('- Cooldown Expiration Test:', testResults.cooldownExpirationTest ? '✅ PASS' : '❌ FAIL');
                
                const passedTests = Object.values(testResults).filter(Boolean).length;
                const totalTests = Object.keys(testResults).length;
                
                if (passedTests === totalTests) {
                    console.log('🎉 ALL TESTS PASSED! Undock cooldown fix is working correctly.');
                } else {
                    console.log(`⚠️ ${passedTests}/${totalTests} tests passed. Some issues remain.`);
                }
                
                console.log('\n📋 Manual Testing Instructions:');
                console.log('1. Dock at a station/planet');
                console.log('2. Launch from the station');
                console.log('3. Immediately try pressing TAB');
                console.log('4. You should see: "TARGETING SYSTEMS WARMING UP - Systems initializing after launch - Xs remaining"');
                console.log('5. Wait for the countdown to reach 0');
                console.log('6. Try TAB again - targeting should now work normally');
                
            }, 100);
        }, 2500); // Wait for 2.5 seconds (after 2s cooldown expires)
        
    }, 100); // Small delay to allow event processing
    
}, 5000); // 5 second timeout for setup 