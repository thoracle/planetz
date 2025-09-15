// Enhanced debug script for tooltip data issue
// Run this in browser console when Star Charts is open and you're experiencing the tooltip issue

console.log('🔧 Starting ENHANCED tooltip data debug...');

if (window.navigationSystemManager && window.navigationSystemManager.starChartsUI) {
    const starChartsUI = window.navigationSystemManager.starChartsUI;
    const starChartsManager = window.navigationSystemManager.starChartsManager;
    
    console.log('✅ Star Charts components found');
    
    // Override showTooltip to capture the exact object being passed
    const originalShowTooltip = starChartsUI.showTooltip;
    
    starChartsUI.showTooltip = function(screenX, screenY, object) {
        console.log('🎯 DETAILED TOOLTIP DEBUG:');
        console.log('  screenX:', screenX);
        console.log('  screenY:', screenY);
        console.log('  object type:', typeof object);
        console.log('  object is null:', object === null);
        console.log('  object is undefined:', object === undefined);
        
        if (object) {
            console.log('  object keys:', Object.keys(object));
            console.log('  object.id:', object.id);
            console.log('  object.name:', object.name);
            console.log('  object.type:', object.type);
            console.log('  object._isShip:', object._isShip);
            console.log('  object._isUndiscovered:', object._isUndiscovered);
            console.log('  full object:', object);
            
            // Test ensureObjectHasName step by step
            console.log('🔧 Testing ensureObjectHasName step by step:');
            
            // Step 1: Check if object already has name
            console.log('  Step 1 - Object has name:', !!object.name, object.name);
            
            // Step 2: Check if it's a ship
            console.log('  Step 2 - Is ship:', !!object._isShip);
            
            // Step 3: Try database lookup
            if (object.id && this.starChartsManager) {
                const dbData = this.starChartsManager.getObjectData(object.id);
                console.log('  Step 3 - Database lookup for', object.id, ':', dbData);
                if (dbData) {
                    console.log('    Database data name:', dbData.name);
                    console.log('    Database data type:', dbData.type);
                }
            } else {
                console.log('  Step 3 - No ID or manager for database lookup');
            }
            
            // Step 4: Try fallback name generation
            if (object.id) {
                const parts = object.id.split('_');
                const fallbackName = parts.length > 1 ? 
                    parts.slice(1).map(part => 
                        part.charAt(0).toUpperCase() + part.slice(1)
                    ).join(' ') : object.id;
                console.log('  Step 4 - Fallback name:', fallbackName);
            }
            
            // Step 5: Call actual ensureObjectHasName
            try {
                const enhanced = this.ensureObjectHasName(object);
                console.log('  Step 5 - ensureObjectHasName result:', enhanced);
                if (enhanced) {
                    console.log('    Enhanced name:', enhanced.name);
                    console.log('    Enhanced type:', enhanced.type);
                } else {
                    console.log('    ❌ ensureObjectHasName returned null/undefined');
                }
            } catch (e) {
                console.log('  Step 5 - ensureObjectHasName error:', e.message);
            }
        } else {
            console.log('  ❌ Object is null/undefined - this is why tooltip is empty');
        }
        
        console.log('🎯 END DETAILED DEBUG');
        console.log('---');
        
        // Call original method
        return originalShowTooltip.call(this, screenX, screenY, object);
    };
    
    // Also override getObjectAtScreenPosition to see what it's returning
    const originalGetObjectAtScreenPosition = starChartsUI.getObjectAtScreenPosition;
    
    starChartsUI.getObjectAtScreenPosition = function(screenX, screenY, tolerance) {
        const result = originalGetObjectAtScreenPosition.call(this, screenX, screenY, tolerance);
        
        console.log('🎯 getObjectAtScreenPosition called:');
        console.log('  screenX:', screenX, 'screenY:', screenY, 'tolerance:', tolerance);
        console.log('  result type:', typeof result);
        console.log('  result is null:', result === null);
        console.log('  result is undefined:', result === undefined);
        
        if (result) {
            console.log('  result keys:', Object.keys(result));
            console.log('  result.id:', result.id);
            console.log('  result.name:', result.name);
            console.log('  result.type:', result.type);
            console.log('  full result:', result);
        }
        
        return result;
    };
    
    console.log('✅ Enhanced debugging enabled. Hover over objects to see detailed logs.');
    console.log('💡 To restore: starChartsUI.showTooltip = originalShowTooltip; starChartsUI.getObjectAtScreenPosition = originalGetObjectAtScreenPosition;');
    
    // Store for restoration
    window.originalShowTooltipEnhanced = originalShowTooltip;
    window.originalGetObjectAtScreenPositionEnhanced = originalGetObjectAtScreenPosition;
    
} else {
    console.log('❌ Star Charts not found. Make sure to:');
    console.log('  1. Open the game');
    console.log('  2. Press "C" to open Star Charts');
    console.log('  3. Wait for initialization');
    console.log('  4. Run this script again');
}

// Helper to restore
window.restoreTooltipEnhanced = function() {
    if (window.navigationSystemManager?.starChartsUI) {
        if (window.originalShowTooltipEnhanced) {
            window.navigationSystemManager.starChartsUI.showTooltip = window.originalShowTooltipEnhanced;
        }
        if (window.originalGetObjectAtScreenPositionEnhanced) {
            window.navigationSystemManager.starChartsUI.getObjectAtScreenPosition = window.originalGetObjectAtScreenPositionEnhanced;
        }
        console.log('✅ Enhanced debugging restored');
    }
};
