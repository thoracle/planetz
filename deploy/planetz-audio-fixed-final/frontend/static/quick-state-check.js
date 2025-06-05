// Quick State Check Function - Paste this into console
window.checkState = function() {
    console.log('🔍 === CURRENT STATE CHECK ===');
    
    const starfieldManager = window.viewManager?.starfieldManager;
    if (!starfieldManager) {
        console.error('❌ StarfieldManager not found');
        return;
    }
    
    console.log('🎯 Target Computer:', starfieldManager.targetComputerEnabled ? '✅ ON' : '❌ OFF');
    console.log('🎯 3D Outlines:', starfieldManager.outlineEnabled ? '✅ ON' : '❌ OFF');
    console.log('🚫 Suppression Flag:', starfieldManager.outlineDisabledUntilManualCycle ? '🔒 ACTIVE (blocking outlines)' : '🔓 INACTIVE (allowing outlines)');
    console.log('🎯 Current Target:', starfieldManager.currentTarget ? `${starfieldManager.currentTarget.name} (${starfieldManager.currentTarget.type})` : '❌ None');
    console.log('👁️ Outline Object:', starfieldManager.targetOutlineObject ? '✅ EXISTS' : '❌ None');
    console.log('📊 Targets Available:', starfieldManager.targets ? starfieldManager.targets.length : 0);
    
    if (starfieldManager.targets && starfieldManager.targets.length > 0) {
        console.log('📋 Available Targets:');
        starfieldManager.targets.forEach((target, i) => {
            const status = target === starfieldManager.currentTarget ? '👈 CURRENT' : '';
            console.log(`  ${i + 1}. ${target.name} (${target.type}) ${status}`);
        });
    }
    
    return {
        targetComputer: starfieldManager.targetComputerEnabled,
        outlines: starfieldManager.outlineEnabled,
        suppressed: starfieldManager.outlineDisabledUntilManualCycle,
        currentTarget: starfieldManager.currentTarget?.name,
        outlineExists: !!starfieldManager.targetOutlineObject,
        targetCount: starfieldManager.targets?.length || 0
    };
};

// Auto-run once
console.log('✅ checkState() function loaded! Running initial check...');
checkState(); 