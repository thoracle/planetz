// Test 3D Target Outline Feature
window.test3DOutline = function() {
    console.log('🎯 === 3D TARGET OUTLINE TEST ===');
    
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    
    if (!starfieldManager || !ship) {
        console.error('❌ Game components not ready');
        return;
    }
    
    console.log('\n📊 OUTLINE SYSTEM STATUS:');
    console.log(`   • Outline enabled: ${starfieldManager.outlineEnabled}`);
    console.log(`   • Current outline: ${starfieldManager.targetOutline ? 'exists' : 'none'}`);
    console.log(`   • Target computer enabled: ${starfieldManager.targetComputerEnabled}`);
    console.log(`   • Current target: ${starfieldManager.getCurrentTargetData()?.name || 'none'}`);
    
    // Test outline toggle
    console.log('\n🔄 Testing outline toggle...');
    const originalState = starfieldManager.outlineEnabled;
    starfieldManager.toggleTargetOutline();
    console.log(`   • Outline toggled to: ${starfieldManager.outlineEnabled}`);
    
    // Restore original state
    setTimeout(() => {
        if (starfieldManager.outlineEnabled !== originalState) {
            starfieldManager.toggleTargetOutline();
            console.log(`   • Outline restored to: ${starfieldManager.outlineEnabled}`);
        }
    }, 1000);
    
    // Test with target cycling
    if (starfieldManager.targetComputerEnabled && starfieldManager.targetObjects?.length > 0) {
        console.log('\n🎯 Testing outline with target cycling...');
        
        // Cycle through a few targets to see outlines
        let cycleCount = 0;
        const maxCycles = Math.min(3, starfieldManager.targetObjects.length);
        
        const cycleInterval = setInterval(() => {
            if (cycleCount >= maxCycles) {
                clearInterval(cycleInterval);
                console.log('✅ Target cycling test complete');
                return;
            }
            
            starfieldManager.cycleTarget();
            const currentTarget = starfieldManager.getCurrentTargetData();
            const outlineColor = starfieldManager.getOutlineColorForTarget(currentTarget);
            
            console.log(`   • Cycle ${cycleCount + 1}: ${currentTarget?.name || 'unknown'} (${outlineColor})`);
            console.log(`     - Type: ${currentTarget?.type || 'unknown'}`);
            console.log(`     - Is ship: ${currentTarget?.isShip || false}`);
            console.log(`     - Diplomacy: ${currentTarget?.diplomacy || 'unknown'}`);
            console.log(`     - Outline exists: ${starfieldManager.targetOutline ? 'yes' : 'no'}`);
            
            cycleCount++;
        }, 2000);
        
    } else {
        console.log('\n⚠️ Target computer not enabled or no targets available');
        console.log('   Enable target computer (T key) and ensure targets exist to test outlines');
    }
    
    console.log('\n📝 OUTLINE FEATURE NOTES:');
    console.log('   • Outlines appear around the currently targeted object in 3D space');
    console.log('   • Colors: Red for enemy ships, Green for friendlies, Yellow for neutrals');
    console.log('   • Outlines pulse gently and follow the target object');
    console.log('   • Toggle outlines on/off with starfieldManager.toggleTargetOutline()');
    console.log('   • Outlines automatically clear when target computer is disabled');
};

// Auto-run test if target computer is already enabled
setTimeout(() => {
    const starfieldManager = window.viewManager?.starfieldManager;
    if (starfieldManager?.targetComputerEnabled) {
        console.log('🎯 Target computer detected - running 3D outline test...');
        window.test3DOutline();
    } else {
        console.log('🎯 3D Outline test ready. Enable target computer (T key) and run: test3DOutline()');
    }
}, 1000); 