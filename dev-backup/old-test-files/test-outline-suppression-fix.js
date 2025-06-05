// Test Outline Suppression Fix
window.testOutlineSuppressionFix = function() {
    console.log('🧪 === OUTLINE SUPPRESSION FIX TEST ===');
    
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
    
    console.log('📊 Testing the new suppression system:');
    console.log('✅ After ship destruction, outlines should NOT appear automatically');
    console.log('✅ Flag outlineDisabledUntilManualCycle should prevent outline creation');
    console.log('✅ Manual target cycling (Tab key) should clear the flag and restore outlines');
    
    // Test the flag system
    console.log('\n🔧 Testing suppression flag:');
    console.log(`Current flag state: ${starfieldManager.outlineDisabledUntilManualCycle}`);
    
    // Manually set the flag to test behavior
    starfieldManager.outlineDisabledUntilManualCycle = true;
    console.log('🛑 Flag set to true - outlines should be suppressed');
    
    // Try to update outline (should be blocked)
    if (starfieldManager.currentTarget) {
        starfieldManager.updateTargetOutline(starfieldManager.currentTarget, 0);
        console.log(`📊 Outline exists after update attempt: ${!!starfieldManager.targetOutline}`);
        console.log('✅ If outline is false/null, suppression is working');
    }
    
    // Clear the flag to restore normal operation
    starfieldManager.outlineDisabledUntilManualCycle = false;
    console.log('🟢 Flag cleared - outlines should work normally again');
    
    console.log('\n💡 How to test:');
    console.log('1. Destroy a ship and watch that NO outline appears on next target');
    console.log('2. Press Tab to cycle targets manually');
    console.log('3. Outline should now appear normally');
    console.log('4. Flag should be cleared after manual cycling');
};

console.log('🧪 Outline suppression test loaded!');
console.log('💡 Run testOutlineSuppressionFix() to test the new flag system'); 