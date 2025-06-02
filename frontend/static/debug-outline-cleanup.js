// Debug Outline Cleanup - Comprehensive Test
window.debugOutlineCleanup = function() {
    console.log('🔧 === OUTLINE CLEANUP DEBUG ===');
    
    const starfieldManager = window.viewManager?.starfieldManager;
    if (!starfieldManager) {
        console.error('❌ StarfieldManager not found');
        return;
    }
    
    console.log('📊 Current outline state:');
    console.log(`   • targetOutline: ${starfieldManager.targetOutline}`);
    console.log(`   • targetOutlineObject: ${starfieldManager.targetOutlineObject}`);
    console.log(`   • outlineEnabled: ${starfieldManager.outlineEnabled}`);
    console.log(`   • currentTarget: ${starfieldManager.currentTarget}`);
    console.log(`   • targets available: ${starfieldManager.targets?.length || 0}`);
    
    // Force clear any orphaned outline objects
    console.log('🧹 Force-clearing outline objects...');
    
    // Clear from scene if they exist
    if (starfieldManager.targetOutline) {
        console.log('🗑️ Found orphaned targetOutline - removing from scene');
        try {
            starfieldManager.scene.remove(starfieldManager.targetOutline);
            if (starfieldManager.targetOutline.geometry) {
                starfieldManager.targetOutline.geometry.dispose();
            }
            if (starfieldManager.targetOutline.material) {
                starfieldManager.targetOutline.material.dispose();
            }
        } catch (error) {
            console.warn('Error removing orphaned outline:', error);
        }
    }
    
    // Force null both properties
    starfieldManager.targetOutline = null;
    starfieldManager.targetOutlineObject = null;
    
    console.log('✅ Force cleanup complete');
    
    // Verify they're cleared
    console.log('🔍 Post-cleanup verification:');
    console.log(`   • targetOutline: ${starfieldManager.targetOutline}`);
    console.log(`   • targetOutlineObject: ${starfieldManager.targetOutlineObject}`);
    
    return {
        targetOutlineCleared: starfieldManager.targetOutline === null,
        targetOutlineObjectCleared: starfieldManager.targetOutlineObject === null,
        bothCleared: starfieldManager.targetOutline === null && starfieldManager.targetOutlineObject === null
    };
};

// Test outline recreation
window.testOutlineRecreation = function() {
    console.log('🧪 === OUTLINE RECREATION TEST ===');
    
    const starfieldManager = window.viewManager?.starfieldManager;
    if (!starfieldManager) {
        console.error('❌ StarfieldManager not found');
        return;
    }
    
    // First, force clear everything
    debugOutlineCleanup();
    
    console.log('🎯 Testing outline recreation with current target...');
    
    if (starfieldManager.currentTarget && starfieldManager.outlineEnabled) {
        console.log('🔄 Attempting to recreate outline for current target');
        starfieldManager.updateTargetOutline(starfieldManager.currentTarget, 0);
        
        console.log('📊 After recreation:');
        console.log(`   • targetOutline: ${!!starfieldManager.targetOutline}`);
        console.log(`   • targetOutlineObject: ${!!starfieldManager.targetOutlineObject}`);
    } else {
        console.log('⏭️ Skipping recreation - no current target or outlines disabled');
    }
    
    return checkState();
};

console.log('✅ Outline debugging functions loaded!');
console.log('📋 Available functions:');
console.log('• debugOutlineCleanup() - Force clear orphaned outline objects');
console.log('• testOutlineRecreation() - Test outline recreation process');
console.log('• checkState() - Check current targeting state'); 