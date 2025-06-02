// Comprehensive Docking Modal Debug Script
console.log('🔧 Starting comprehensive docking debug...');

function runDockingDebug() {
    console.log('\n=== COMPREHENSIVE DOCKING MODAL DEBUG ===');
    
    // 1. Check basic availability
    if (!window.starfieldManager) {
        console.error('❌ StarfieldManager not available on window');
        return;
    }
    
    const sm = window.starfieldManager;
    console.log('✅ StarfieldManager found');
    
    if (!sm.dockingModal) {
        console.error('❌ DockingModal not found');
        return;
    }
    
    const dm = sm.dockingModal;
    console.log('✅ DockingModal found');
    
    // 2. Check docking interval
    console.log('\n--- DOCKING CHECK INTERVAL ---');
    if (dm.dockingCheckInterval) {
        console.log('✅ Docking check interval is running');
    } else {
        console.error('❌ Docking check interval is NOT running');
        console.log('🔧 Starting docking check...');
        dm.startDockingCheck();
    }
    
    // 3. Check current state
    console.log('\n--- CURRENT STATE ---');
    console.log('🚢 Is docked:', sm.isDocked);
    console.log('👁️ Modal visible:', dm.isVisible);
    console.log('⚡ Current speed:', sm.currentSpeed);
    console.log('🎯 Current target:', sm.currentTarget?.name || 'None');
    console.log('📍 Player position:', sm.camera.position);
    
    // 4. Check solar system manager
    console.log('\n--- SOLAR SYSTEM MANAGER ---');
    if (!sm.solarSystemManager) {
        console.error('❌ SolarSystemManager not available');
        return;
    }
    
    console.log('✅ SolarSystemManager found');
    
    // 5. Check celestial bodies
    console.log('\n--- CELESTIAL BODIES ---');
    const bodies = sm.solarSystemManager.getCelestialBodies();
    if (!bodies) {
        console.error('❌ No celestial bodies returned');
        return;
    }
    
    console.log(`🌍 Found ${bodies.size} celestial bodies`);
    
    if (bodies.size === 0) {
        console.warn('⚠️ No celestial bodies in current system');
        return;
    }
    
    // 6. Check distances to planets/moons
    console.log('\n--- DISTANCE ANALYSIS ---');
    const playerPos = sm.camera.position;
    
    bodies.forEach((body, bodyId) => {
        // Only check planets and moons
        if (!bodyId.startsWith('planet_') && !bodyId.startsWith('moon_')) {
            return;
        }
        
        const bodyType = bodyId.startsWith('planet_') ? 'planet' : 'moon';
        const distance = sm.calculateDistance(playerPos, body.position);
        const dockingRange = bodyType === 'planet' ? 4.0 : 1.5;
        const withinRange = distance <= dockingRange;
        
        console.log(`${withinRange ? '🎯' : '📍'} ${bodyType} "${body.name || bodyId}": ${distance.toFixed(3)}km ${withinRange ? `(✅ within ${dockingRange}km range)` : `(❌ outside ${dockingRange}km range)`}`);
        
        if (withinRange) {
            // Check for any cooldown
            const targetName = body.name || bodyId;
            const cancelTimestamp = dm.cancelledTargets.get(targetName);
            if (cancelTimestamp) {
                const timeSinceCancelled = Date.now() - cancelTimestamp;
                const remainingCooldown = dm.cooldownDuration - timeSinceCancelled;
                
                if (remainingCooldown > 0) {
                    console.log(`    🚫 On cooldown: ${Math.round(remainingCooldown/1000)}s remaining`);
                } else {
                    console.log(`    ✅ Cooldown expired`);
                }
            } else {
                console.log(`    ✅ No cooldown`);
            }
            
            // Check diplomacy
            const bodyInfo = sm.solarSystemManager.getCelestialBodyInfo(body);
            if (bodyInfo?.diplomacy?.toLowerCase() === 'enemy') {
                console.log(`    🚫 Hostile target - cannot dock`);
            } else {
                console.log(`    ✅ Friendly target - can dock`);
            }
        }
    });
    
    // 7. Manually trigger findNearbyDockableObjects
    console.log('\n--- MANUAL NEARBY OBJECT SEARCH ---');
    const nearbyObjects = dm.findNearbyDockableObjects();
    console.log(`🔍 findNearbyDockableObjects returned ${nearbyObjects.length} objects`);
    
    nearbyObjects.forEach((obj, index) => {
        console.log(`  ${index + 1}. ${obj.type} "${obj.name || 'unnamed'}" at ${obj.distance.toFixed(3)}km`);
    });
    
    // 8. Force a docking condition check
    console.log('\n--- MANUAL DOCKING CHECK ---');
    console.log('🔄 Running checkDockingConditions()...');
    dm.checkDockingConditions();
    
    // 9. Check for any console errors or issues
    console.log('\n--- SUMMARY ---');
    if (nearbyObjects.length > 0 && !dm.isVisible && !sm.isDocked) {
        console.log('🤔 ISSUE DETECTED: Found nearby dockable objects but modal not showing');
        console.log('💡 Possible causes:');
        console.log('   - Speed too high (need to be at impulse 1 or lower)');
        console.log('   - Target on cooldown (cancelled recently)');
        console.log('   - Target is hostile');
        console.log('   - Modal already visible');
        
        // Try to force show modal for debugging
        if (nearbyObjects.length > 0) {
            console.log('\n🚨 FORCE TESTING: Trying to show modal manually...');
            const testTarget = nearbyObjects[0];
            const testInfo = sm.solarSystemManager.getCelestialBodyInfo(testTarget);
            dm.show(testTarget, testInfo, testTarget.distance);
        }
    } else if (nearbyObjects.length === 0) {
        console.log('✅ No nearby dockable objects - modal correctly not showing');
    } else if (dm.isVisible) {
        console.log('✅ Modal is showing - system working correctly');
    } else if (sm.isDocked) {
        console.log('✅ Already docked - modal correctly not showing');
    } else {
        console.log('✅ System appears to be working correctly');
    }
}

// Auto-run on load
runDockingDebug();

// Make available globally for manual testing
window.runDockingDebug = runDockingDebug;
console.log('\n💡 Type runDockingDebug() to run this test again'); 