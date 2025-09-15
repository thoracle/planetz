// Simple debug to see what's happening in showTooltip
// Run this in browser console when Star Charts is open

console.log('🔧 Starting SIMPLE showTooltip debug...');

if (window.navigationSystemManager?.starChartsUI) {
    const starChartsUI = window.navigationSystemManager.starChartsUI;
    
    // Override showTooltip with detailed logging
    const originalShowTooltip = starChartsUI.showTooltip;
    
    starChartsUI.showTooltip = function(screenX, screenY, object) {
        console.log('🎯 SIMPLE DEBUG - showTooltip called:');
        console.log('  object:', object);
        console.log('  object type:', typeof object);
        console.log('  object null:', object === null);
        console.log('  object undefined:', object === undefined);
        
        if (object) {
            console.log('  object.id:', object.id);
            console.log('  object.name:', object.name);
            console.log('  object.type:', object.type);
            
            // Test ensureObjectHasName
            console.log('  Testing ensureObjectHasName...');
            const enhanced = this.ensureObjectHasName(object);
            console.log('  ensureObjectHasName result:', enhanced);
            console.log('  enhanced is null:', enhanced === null);
            console.log('  enhanced is undefined:', enhanced === undefined);
            
            if (enhanced) {
                console.log('  enhanced.name:', enhanced.name);
                console.log('  enhanced.type:', enhanced.type);
            } else {
                console.log('  ❌ ensureObjectHasName returned null/undefined!');
            }
        }
        
        console.log('---');
        
        // Call original method
        return originalShowTooltip.call(this, screenX, screenY, object);
    };
    
    console.log('✅ Simple debug enabled. Hover over objects to see what showTooltip receives.');
    
    // Store for restoration
    window.originalShowTooltipSimple = originalShowTooltip;
    
} else {
    console.log('❌ Star Charts not found');
}

// Helper to restore
window.restoreTooltipSimple = function() {
    if (window.navigationSystemManager?.starChartsUI && window.originalShowTooltipSimple) {
        window.navigationSystemManager.starChartsUI.showTooltip = window.originalShowTooltipSimple;
        console.log('✅ Simple debug restored');
    }
};
