console.log('🧪 Testing launch cooldown debugging...');

// Wait for the game to load
setTimeout(() => {
    console.log('\n=== LAUNCH COOLDOWN DEBUG TEST ===');
    
    // Check if required managers exist
    const sm = window.starfieldManager;
    const dm = sm?.dockingModal;
    
    if (!sm || !dm) {
        console.error('❌ Required managers not found');
        console.log('StarfieldManager:', !!sm);
        console.log('DockingModal:', !!dm);
        return;
    }
    
    console.log('✅ All managers found');
    
    // Test the cooldown system
    console.log('\n📋 COOLDOWN SYSTEM DEBUG:');
    console.log('- cooldownDuration:', dm.cooldownDuration, 'ms =', dm.cooldownDuration/1000, 'seconds');
    console.log('- cancelledTargets map size:', dm.cancelledTargets.size);
    
    // List all current cooldowns
    if (dm.cancelledTargets.size > 0) {
        console.log('\n🔍 CURRENT COOLDOWNS:');
        dm.cancelledTargets.forEach((timestamp, key) => {
            const elapsed = Date.now() - timestamp;
            const remaining = dm.cooldownDuration - elapsed;
            console.log(`  - "${key}": ${Math.round(elapsed/1000)}s elapsed, ${Math.round(remaining/1000)}s remaining`);
        });
    } else {
        console.log('✅ No active cooldowns');
    }
    
    // Test if player is currently docked
    console.log('\n🚢 DOCKING STATUS:');
    console.log('- isDocked:', sm.isDocked);
    console.log('- dockedTo:', sm.dockedTo);
    console.log('- dockedTo name:', sm.dockedTo?.name);
    
    // Test target name resolution methods
    if (sm.dockedTo) {
        console.log('\n🔍 TARGET NAME RESOLUTION TEST:');
        const target = sm.dockedTo;
        console.log('- target.name:', target.name);
        console.log('- target.userData?.name:', target.userData?.name);
        
        const bodyInfo = sm.solarSystemManager?.getCelestialBodyInfo(target);
        console.log('- getCelestialBodyInfo(target):', bodyInfo);
        console.log('- bodyInfo?.name:', bodyInfo?.name);
        
        // Test the actual name resolution logic from handleLaunchCooldown
        const resolvedName = target.name || 
                            bodyInfo?.name ||
                            target.userData?.name ||
                            'unknown_launch_target';
        console.log('- RESOLVED NAME:', resolvedName);
    }
    
    // Test launch cooldown method directly
    console.log('\n🧪 TESTING LAUNCH COOLDOWN METHOD:');
    if (sm.dockedTo) {
        console.log('Calling handleLaunchCooldown with current dockedTo target...');
        dm.handleLaunchCooldown(sm.dockedTo);
        
        // Check if cooldown was added
        setTimeout(() => {
            console.log('\n📊 COOLDOWN CHECK AFTER METHOD CALL:');
            console.log('- cancelledTargets map size:', dm.cancelledTargets.size);
            dm.cancelledTargets.forEach((timestamp, key) => {
                const elapsed = Date.now() - timestamp;
                const remaining = dm.cooldownDuration - elapsed;
                console.log(`  - "${key}": ${Math.round(elapsed/1000)}s elapsed, ${Math.round(remaining/1000)}s remaining`);
            });
        }, 100);
    } else {
        console.log('⚠️ Player not docked, cannot test launch cooldown');
    }
    
    // Manual test functions
    window.testLaunchCooldown = () => {
        if (sm.dockedTo) {
            console.log('🧪 Manual test: calling handleLaunchCooldown');
            dm.handleLaunchCooldown(sm.dockedTo);
        } else {
            console.log('❌ Not docked to any target');
        }
    };
    
    window.showCooldowns = () => {
        console.log('\n🔍 CURRENT COOLDOWNS:');
        if (dm.cancelledTargets.size === 0) {
            console.log('✅ No active cooldowns');
            return;
        }
        dm.cancelledTargets.forEach((timestamp, key) => {
            const elapsed = Date.now() - timestamp;
            let remaining;
            let duration;
            
            // Check if this has a custom launch duration
            if (key.endsWith('_launch_duration')) {
                return; // Skip duration markers
            }
            
            const launchDuration = dm.cancelledTargets.get(key + '_launch_duration');
            duration = launchDuration || dm.cooldownDuration;
            remaining = duration - elapsed;
            
            const type = launchDuration ? 'LAUNCH' : 'CANCEL';
            console.log(`  - "${key}" (${type}): ${Math.round(elapsed/1000)}s elapsed, ${Math.round(remaining/1000)}s remaining`);
        });
    };
    
    window.clearCooldowns = () => {
        console.log('🗑️ Clearing all cooldowns');
        dm.cancelledTargets.clear();
    };
    
    console.log('\n🔧 DEBUG FUNCTIONS AVAILABLE:');
    console.log('- testLaunchCooldown() - manually trigger launch cooldown');
    console.log('- showCooldowns() - show all active cooldowns');
    console.log('- clearCooldowns() - clear all cooldowns');
    
}, 3000); 