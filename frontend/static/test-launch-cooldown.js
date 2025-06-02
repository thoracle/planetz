console.log('🧪 Testing launch cooldown functionality...');

// Wait for the game to load
setTimeout(() => {
    console.log('\n=== LAUNCH COOLDOWN TEST ===');
    
    // Check if required managers exist
    const sm = window.starfieldManager;
    const dm = window.dockingModal;
    
    if (!sm || !dm) {
        console.error('❌ Required managers not found');
        console.log('StarfieldManager:', !!sm);
        console.log('DockingModal:', !!dm);
        return;
    }
    
    console.log('✅ All managers found');
    
    // Test the launch cooldown system
    console.log('\n📋 LAUNCH COOLDOWN SYSTEM TEST:');
    console.log('- default cooldownDuration:', dm.cooldownDuration, 'ms =', dm.cooldownDuration/1000, 'seconds');
    console.log('- current cancelledTargets:', [...dm.cancelledTargets.entries()]);
    
    // Simulate a launch cooldown
    console.log('\n🧪 Testing launch cooldown functionality:');
    
    // Create a fake target to test with
    const testTarget = {
        name: 'Test Planet',
        position: { x: 0, y: 0, z: 0 },
        userData: { name: 'Test Planet' }
    };
    
    // Test the launch cooldown method
    console.log('🚀 Simulating launch from Test Planet...');
    dm.handleLaunchCooldown(testTarget);
    
    // Check cooldown status immediately
    setTimeout(() => {
        console.log('\n⏰ Checking cooldown status after 2 seconds:');
        const targetName = 'Test Planet';
        const cancelTimestamp = dm.cancelledTargets.get(targetName);
        const launchDuration = dm.cancelledTargets.get(targetName + '_launch_duration');
        
        if (cancelTimestamp) {
            const timeSinceCancelled = Date.now() - cancelTimestamp;
            const cooldownDuration = launchDuration || dm.cooldownDuration;
            const remainingCooldown = cooldownDuration - timeSinceCancelled;
            
            console.log(`📊 Cooldown analysis for "${targetName}":`);
            console.log(`  - Time since launch: ${Math.round(timeSinceCancelled/1000)}s`);
            console.log(`  - Cooldown duration: ${cooldownDuration/1000}s ${launchDuration ? '(launch)' : '(default)'}`);
            console.log(`  - Remaining cooldown: ${Math.round(remainingCooldown/1000)}s`);
            console.log(`  - Status: ${remainingCooldown > 0 ? '🚫 BLOCKED' : '✅ ALLOWED'}`);
        } else {
            console.log('❌ No cooldown found for test target');
        }
        
        // Test what happens when checking docking conditions during cooldown
        console.log('\n🔍 Testing docking condition check during cooldown...');
        
        // Create a fake nearby target that matches our test target
        const originalFindNearbyDockableObjects = dm.findNearbyDockableObjects;
        dm.findNearbyDockableObjects = () => {
            if (cancelTimestamp && (Date.now() - cancelTimestamp) < 10000) {
                // Simulate finding the test target nearby during cooldown
                return [{
                    name: 'Test Planet',
                    type: 'planet',
                    info: { name: 'Test Planet', type: 'planet', diplomacy: 'friendly', dockingRange: 4.0 },
                    distance: 2.0,
                    dockingRange: 4.0,
                    position: { x: 0, y: 0, z: 0 }
                }];
            }
            return [];
        };
        
        // Force a docking check
        dm.checkDockingConditions();
        
        // Restore original method
        dm.findNearbyDockableObjects = originalFindNearbyDockableObjects;
        
        // Clean up test data
        setTimeout(() => {
            dm.cancelledTargets.delete('Test Planet');
            dm.cancelledTargets.delete('Test Planet_launch_duration');
            console.log('🧹 Cleaned up test data');
        }, 3000);
        
    }, 2000);
    
    // Instructions for manual testing
    console.log('\n📋 MANUAL TEST INSTRUCTIONS:');
    console.log('1. Approach a planet at impulse speed 1');
    console.log('2. Wait for the docking modal to appear');
    console.log('3. Click DOCK to dock with the planet');
    console.log('4. Click LAUNCH in the docking interface');
    console.log('5. Try to approach the same planet again immediately');
    console.log('6. The docking modal should NOT appear for 10 seconds');
    console.log('7. After 10 seconds, the modal should be allowed to appear again');
    console.log('8. Moving away and coming back should also clear the cooldown');
    
    console.log('\n✅ Launch cooldown test setup complete');
    
}, 3000);

console.log('✅ Launch cooldown test script loaded'); 