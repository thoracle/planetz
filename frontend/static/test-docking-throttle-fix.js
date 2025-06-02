console.log('🧪 Testing docking modal throttle fix...');

// Wait for the game to load
setTimeout(() => {
    console.log('\n=== DOCKING MODAL THROTTLE FIX TEST ===');
    
    // Check if DockingModal exists
    const dockingModalExists = window.dockingModal !== undefined;
    console.log('✅ DockingModal exists:', dockingModalExists);
    
    if (dockingModalExists) {
        const modal = window.dockingModal;
        
        // Check throttling properties
        console.log('🔧 Throttle settings:');
        console.log('  - debugThrottleMs:', modal.debugThrottleMs);
        console.log('  - scanThrottleMs:', modal.scanThrottleMs);
        console.log('  - lastScanLogTime:', modal.lastScanLogTime);
        
        // Monitor console for 30 seconds
        console.log('📊 Monitoring console output for 30 seconds...');
        console.log('📊 You should see:');
        console.log('  - State change logs only when you move');
        console.log('  - Full scan logs only every 10 seconds');
        console.log('  - No continuous spam at 60fps');
        
        // Count console messages for analysis
        let messageCount = 0;
        const originalLog = console.log;
        console.log = function(...args) {
            if (args[0] && args[0].includes && args[0].includes('findNearbyDockableObjects')) {
                messageCount++;
            }
            originalLog.apply(console, args);
        };
        
        // Report results after 30 seconds
        setTimeout(() => {
            console.log = originalLog; // Restore original
            console.log('\n📈 THROTTLE TEST RESULTS:');
            console.log(`  - findNearbyDockableObjects messages in 30s: ${messageCount}`);
            console.log(`  - Expected maximum: ~9 messages (3 per 10-second scan)`);
            console.log(`  - Previous broken behavior: ~1800 messages (60fps spam)`);
            
            if (messageCount < 50) {
                console.log('✅ THROTTLING WORKING - Console spam eliminated!');
            } else {
                console.log('❌ THROTTLING FAILED - Still seeing spam');
            }
            
            console.log('\n=== TEST COMPLETE ===');
        }, 30000);
        
    } else {
        console.log('❌ DockingModal not found - check if game loaded properly');
    }
    
}, 3000); 