console.log('🧪 Testing launch cooldown fix for nearby objects...');

// Wait for the game to load
setTimeout(() => {
    console.log('\n=== LAUNCH COOLDOWN FIX TEST ===');
    
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
    
    // Test the enhanced launch cooldown system
    console.log('\n📋 ENHANCED LAUNCH COOLDOWN TEST:');
    console.log('- cooldownDuration:', dm.cooldownDuration, 'ms =', dm.cooldownDuration/1000, 'seconds');
    console.log('- cancelledTargets map size:', dm.cancelledTargets.size);
    
    // Test finding nearby dockable objects
    console.log('\n🔍 TESTING NEARBY OBJECT DETECTION:');
    const nearbyObjects = dm.findNearbyDockableObjects();
    console.log('- Found', nearbyObjects.length, 'nearby dockable objects');
    
    nearbyObjects.forEach((obj, index) => {
        const targetInfo = sm.solarSystemManager?.getCelestialBodyInfo(obj);
        const distance = sm.calculateDistance(sm.camera.position, obj.position);
        console.log(`  ${index + 1}. ${targetInfo?.name || 'Unknown'} (${targetInfo?.type || 'unknown'}) - ${distance.toFixed(2)}km`);
    });
    
    // Simulate launch cooldown and test if it affects all nearby objects
    console.log('\n🚀 TESTING LAUNCH COOLDOWN APPLICATION:');
    
    if (nearbyObjects.length > 0) {
        const testTarget = nearbyObjects[0];
        console.log('Testing with target:', sm.solarSystemManager?.getCelestialBodyInfo(testTarget)?.name || 'Unknown');
        
        // Record initial cooldown state
        const initialCooldowns = new Map(dm.cancelledTargets);
        console.log('Initial cooldowns:', initialCooldowns.size);
        
        // Apply launch cooldown
        dm.handleLaunchCooldown(testTarget);
        
        // Check resulting cooldowns
        console.log('Cooldowns after launch:', dm.cancelledTargets.size);
        console.log('New cooldown entries:');
        dm.cancelledTargets.forEach((timestamp, key) => {
            if (!initialCooldowns.has(key)) {
                const isLaunchDuration = key.endsWith('_launch_duration');
                const targetName = isLaunchDuration ? key.replace('_launch_duration', '') : key;
                console.log(`  - ${targetName} ${isLaunchDuration ? '(duration marker)' : '(cooldown)'}`);
            }
        });
        
        // Test that checkDockingConditions respects the cooldowns
        console.log('\n✅ Testing that docking is now blocked for all nearby targets:');
        nearbyObjects.forEach(obj => {
            const targetInfo = sm.solarSystemManager?.getCelestialBodyInfo(obj);
            const targetName = targetInfo?.name || obj.name || obj.userData?.name || 'unknown_target';
            const cooldownTimestamp = dm.cancelledTargets.get(targetName);
            
            if (cooldownTimestamp) {
                const timeLeft = (dm.cooldownDuration - (Date.now() - cooldownTimestamp)) / 1000;
                console.log(`  ✅ ${targetName}: BLOCKED (${timeLeft.toFixed(1)}s remaining)`);
            } else {
                console.log(`  ⚠️ ${targetName}: NOT BLOCKED (unexpected)`);
            }
        });
        
    } else {
        console.log('❌ No nearby objects found to test with');
        console.log('💡 Try moving closer to a planet/moon system');
    }
    
    console.log('\n🎯 EXPECTED BEHAVIOR:');
    console.log('- When you launch from a planet, Luna (moon) should also get a cooldown');
    console.log('- Docking modal should NOT appear for any nearby targets for 30 seconds');
    console.log('- After 30 seconds, all targets should be available for docking again');
    
}, 3000); 