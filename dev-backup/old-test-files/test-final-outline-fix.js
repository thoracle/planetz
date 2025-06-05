// Final Outline Fix Test - Comprehensive Destruction Test
window.testFinalOutlineFix = function() {
    console.log('🎯 === FINAL OUTLINE FIX TEST ===');
    
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
    
    console.log('🧪 Testing final outline fix...');
    console.log('');
    console.log('📋 TEST STEPS:');
    console.log('1. Create enemy ships');
    console.log('2. Target and destroy ships one by one');
    console.log('3. Verify outline is cleared after EACH destruction');
    console.log('4. Verify outline is COMPLETELY cleared when NO targets remain');
    console.log('');
    
    // Function to check state after destruction
    window.checkAfterDestruction = function() {
        const state = {
            targetOutline: !!starfieldManager.targetOutline,
            targetOutlineObject: !!starfieldManager.targetOutlineObject,
            currentTarget: !!starfieldManager.currentTarget,
            availableTargets: starfieldManager.targets?.length || 0,
            outlineEnabled: starfieldManager.outlineEnabled,
            suppressionFlag: starfieldManager.outlineDisabledUntilManualCycle
        };
        
        console.log('🔍 === POST-DESTRUCTION STATE ===');
        console.log(`🎯 Target Outline: ${state.targetOutline ? '❌ STILL EXISTS' : '✅ CLEARED'}`);
        console.log(`🎯 Target Outline Ref: ${state.targetOutlineObject ? '❌ STILL EXISTS' : '✅ CLEARED'}`);
        console.log(`🎯 Current Target: ${state.currentTarget ? '✅ EXISTS' : '❌ NONE'}`);
        console.log(`🎯 Available Targets: ${state.availableTargets}`);
        console.log(`🎯 Outline System: ${state.outlineEnabled ? '✅ ENABLED' : '❌ DISABLED'}`);
        console.log(`🚫 Suppression Flag: ${state.suppressionFlag ? '🔒 ACTIVE' : '🔓 INACTIVE'}`);
        
        if (state.availableTargets === 0) {
            if (state.targetOutline || state.targetOutlineObject) {
                console.error('🚨 BUG: Outline still exists when no targets available!');
                return false;
            } else {
                console.log('✅ SUCCESS: Outline properly cleared when no targets remain');
                return true;
            }
        } else {
            console.log(`ℹ️  ${state.availableTargets} targets remaining`);
            return true;
        }
    };
    
    // Create test ships
    starfieldManager.createTargetDummyShips(2).then(() => {
        console.log('🎯 Test ships created');
        console.log('');
        console.log('🎮 INSTRUCTIONS:');
        console.log('1. Press Tab to target first ship');
        console.log('2. Press F to enable autofire and destroy it');
        console.log('3. Run checkAfterDestruction() immediately after destruction');
        console.log('4. Press Tab to target second ship');  
        console.log('5. Press F to destroy it');
        console.log('6. Run checkAfterDestruction() to verify final cleanup');
        console.log('');
        console.log('🔍 Watch for: "Force-clearing outline - no targets remaining" message');
        
        setTimeout(() => {
            if (starfieldManager.targets?.length > 0) {
                console.log(`✅ Ready! ${starfieldManager.targets.length} targets available`);
            }
        }, 1000);
    });
};

// Auto-load if console is available
if (typeof console !== 'undefined') {
    console.log('✅ testFinalOutlineFix() loaded! Run to test final outline fix.');
} 