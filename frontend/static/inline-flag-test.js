// Inline Flag Test - Paste this directly into browser console
(function() {
    console.log('🔍 === INLINE FLAG TEST ===');
    
    const starfieldManager = window.viewManager?.starfieldManager;
    if (!starfieldManager) {
        console.error('❌ StarfieldManager not found');
        return;
    }
    
    // Enable systems
    if (!starfieldManager.targetComputerEnabled) {
        console.log('🎯 Enabling target computer...');
        starfieldManager.toggleTargetComputer();
    }
    if (!starfieldManager.outlineEnabled) {
        console.log('🎯 Enabling 3D outlines...');
        starfieldManager.toggleTargetOutline();
    }
    
    console.log('🧪 Testing flag behavior:');
    
    // Test 1: Set flag and test Tab key simulation
    console.log('\n📋 TEST: Tab key simulation with suppression flag');
    starfieldManager.outlineDisabledUntilManualCycle = true;
    console.log(`   • Flag set to: true`);
    console.log(`   • Current target: ${starfieldManager.getCurrentTargetData()?.name || 'none'}`);
    console.log(`   • Outline exists before: ${!!starfieldManager.targetOutline}`);
    
    // Simulate Tab key (this is exactly what the key handler calls)
    starfieldManager.cycleTarget(); // No parameter = default true = manual cycle
    
    setTimeout(() => {
        console.log(`   • Flag after Tab: ${starfieldManager.outlineDisabledUntilManualCycle}`);
        console.log(`   • Outline exists after: ${!!starfieldManager.targetOutline}`);
        console.log(`   • New target: ${starfieldManager.getCurrentTargetData()?.name || 'none'}`);
        
        if (starfieldManager.outlineDisabledUntilManualCycle === false) {
            console.log('   ✅ SUCCESS: Flag cleared by Tab key');
        } else {
            console.log('   ❌ PROBLEM: Flag NOT cleared by Tab key');
        }
        
        if (starfieldManager.targetOutline) {
            console.log('   ✅ SUCCESS: Outline created after Tab');
        } else {
            console.log('   ❌ PROBLEM: No outline after Tab key');
        }
        
        // Create helper functions
        window.quickFlagTest = () => {
            console.log('\n🔧 Quick Flag Test:');
            starfieldManager.outlineDisabledUntilManualCycle = true;
            console.log(`Before: flag=${starfieldManager.outlineDisabledUntilManualCycle}, outline=${!!starfieldManager.targetOutline}`);
            starfieldManager.cycleTarget(); // Tab key simulation
            setTimeout(() => {
                console.log(`After:  flag=${starfieldManager.outlineDisabledUntilManualCycle}, outline=${!!starfieldManager.targetOutline}`);
            }, 50);
        };
        
        window.checkState = () => {
            console.log(`Flag: ${starfieldManager.outlineDisabledUntilManualCycle}`);
            console.log(`Outline: ${!!starfieldManager.targetOutline}`);
            console.log(`Target: ${starfieldManager.getCurrentTargetData()?.name || 'none'}`);
            console.log(`Target count: ${starfieldManager.targetObjects?.length || 0}`);
        };
        
        console.log('\n🛠️ Helper functions created:');
        console.log('• quickFlagTest() - Test flag behavior');
        console.log('• checkState() - Check current state');
        
    }, 100);
})(); 