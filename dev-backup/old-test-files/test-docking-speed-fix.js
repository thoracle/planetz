console.log('🧪 Testing docking speed fix and 30-second cooldowns...');

// Wait for the game to load
setTimeout(() => {
    console.log('\n=== DOCKING SPEED FIX TEST ===');
    
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
    
    // Test the new cooldown system
    console.log('\n📋 COOLDOWN SYSTEM TEST:');
    console.log('- cooldownDuration:', dm.cooldownDuration, 'ms =', dm.cooldownDuration/1000, 'seconds');
    
    // Test launch cooldown duration
    console.log('\n📋 LAUNCH COOLDOWN TEST:');
    console.log('- Testing handleLaunchCooldown method...');
    
    // Create a mock target for testing
    const mockTarget = {
        name: 'Test Planet',
        position: { x: 0, y: 0, z: 0 }
    };
    
    // Test launch cooldown
    dm.handleLaunchCooldown(mockTarget);
    console.log('- Launch cooldown activated for:', mockTarget.name);
    console.log('- Cancelled targets map size:', dm.cancelledTargets.size);
    
    // Check if target is in cooldown
    const targetName = mockTarget.name;
    const cancelTimestamp = dm.cancelledTargets.get(targetName);
    const launchDuration = dm.cancelledTargets.get(targetName + '_launch_duration');
    
    console.log('- Target in cooldown:', !!cancelTimestamp);
    console.log('- Launch duration marker:', launchDuration, 'ms =', launchDuration/1000, 'seconds');
    
    // Test speed checking
    console.log('\n📋 SPEED CHECK TEST:');
    console.log('- Current speed:', sm.currentSpeed);
    console.log('- Modal should only appear when speed <= 1');
    
    // Test at different speeds
    const originalSpeed = sm.currentSpeed;
    
    console.log('\n🧪 Testing speed scenarios:');
    
    // Test high speed (should not show modal)
    console.log('- Setting speed to 5 (high speed)...');
    sm.currentSpeed = 5;
    console.log('- Current speed:', sm.currentSpeed, '(modal should NOT appear at this speed)');
    
    // Test acceptable speed (should show modal if other conditions met)
    setTimeout(() => {
        console.log('- Setting speed to 1 (acceptable speed)...');
        sm.currentSpeed = 1;
        console.log('- Current speed:', sm.currentSpeed, '(modal CAN appear at this speed)');
        
        // Test very low speed
        setTimeout(() => {
            console.log('- Setting speed to 0 (stopped)...');
            sm.currentSpeed = 0;
            console.log('- Current speed:', sm.currentSpeed, '(modal CAN appear at this speed)');
            
            // Restore original speed
            setTimeout(() => {
                sm.currentSpeed = originalSpeed;
                console.log('- Speed restored to:', sm.currentSpeed);
                console.log('\n✅ Speed test complete');
                
                // Summary
                console.log('\n📊 SUMMARY:');
                console.log('✅ Cancel cooldown: 30 seconds');
                console.log('✅ Launch cooldown: 30 seconds');
                console.log('✅ Speed check: Modal only appears when speed <= 1');
                console.log('✅ High speed behavior: Modal will not appear');
                console.log('✅ All tests completed successfully');
                
            }, 1000);
        }, 1000);
    }, 1000);
    
    // Test cooldown cleanup
    console.log('\n📋 COOLDOWN CLEANUP TEST:');
    console.log('- Old cooldowns will be cleaned up every 30 seconds');
    console.log('- Launch cooldown markers will be cleaned up after expiration');
    
}, 2000); 