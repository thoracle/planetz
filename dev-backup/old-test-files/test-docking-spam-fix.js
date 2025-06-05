// Test script to verify docking modal spam fix
console.log('🧪 Testing docking modal spam fix...');

function testDockingSpamFix() {
    console.log('🔧 Starting docking spam fix test...');
    
    // Wait for game to load
    if (!window.starfieldManager?.dockingModal) {
        console.log('⏳ Waiting for game to load...');
        setTimeout(testDockingSpamFix, 1000);
        return;
    }
    
    const dockingModal = window.starfieldManager.dockingModal;
    
    // Monitor console message rate
    let messageCount = 0;
    let lastCount = 0;
    
    // Override console.log to count docking messages
    const originalLog = console.log;
    console.log = function(...args) {
        const message = args.join(' ');
        if (message.includes('🔍 checkDockingConditions') || message.includes('🔍 findNearbyDockableObjects')) {
            messageCount++;
        }
        return originalLog.apply(console, args);
    };
    
    // Test for 10 seconds and report message rate
    let testSeconds = 0;
    const testInterval = setInterval(() => {
        testSeconds++;
        const messagesThisSecond = messageCount - lastCount;
        lastCount = messageCount;
        
        console.log(`🕒 Second ${testSeconds}: ${messagesThisSecond} docking debug messages (total: ${messageCount})`);
        
        if (messagesThisSecond > 10) {
            console.warn(`⚠️ HIGH MESSAGE RATE: ${messagesThisSecond} messages in 1 second!`);
        } else if (messagesThisSecond > 0) {
            console.log(`✅ Reasonable message rate: ${messagesThisSecond} messages`);
        }
        
        if (testSeconds >= 10) {
            clearInterval(testInterval);
            
            // Restore original console.log
            console.log = originalLog;
            
            const avgPerSecond = messageCount / 10;
            console.log('📊 SPAM FIX TEST RESULTS:');
            console.log(`  - Total messages in 10 seconds: ${messageCount}`);
            console.log(`  - Average per second: ${avgPerSecond.toFixed(1)}`);
            
            if (avgPerSecond < 5) {
                console.log('✅ SUCCESS: Spam has been eliminated!');
            } else if (avgPerSecond < 20) {
                console.log('⚠️ IMPROVED: Spam reduced but could be better');
            } else {
                console.log('❌ FAILED: Still experiencing spam');
            }
            
            // Test docking modal state tracking
            testStateTracking();
        }
    }, 1000);
}

function testStateTracking() {
    console.log('🧪 Testing docking modal state tracking...');
    
    const dockingModal = window.starfieldManager.dockingModal;
    
    if (dockingModal.lastDebugState) {
        console.log('✅ Debug state tracking initialized:', dockingModal.lastDebugState);
        console.log('✅ Debug throttle interval:', dockingModal.debugThrottleMs, 'ms');
    } else {
        console.log('❌ Debug state tracking not found');
    }
    
    // Test approach to planet to see throttled logging
    console.log('📍 Current position:', window.starfieldManager.camera.position);
    console.log('🎯 Try approaching a planet to test throttled docking logs');
    console.log('   - Should only see logs when state changes or every 1-5 seconds');
    console.log('   - No more spam of identical messages');
}

// Start the test
testDockingSpamFix(); 