// Debug script to run in browser console to diagnose tooltip issue
// Copy and paste this into the browser console when Star Charts is open

console.log('🔧 Starting tooltip debug session...');

// Check if Star Charts is available
if (window.navigationSystemManager && window.navigationSystemManager.starChartsUI) {
    const starChartsUI = window.navigationSystemManager.starChartsUI;
    const starChartsManager = window.navigationSystemManager.starChartsManager;
    
    console.log('✅ Star Charts UI found');
    console.log('✅ Star Charts Manager found');
    
    // Check object database
    console.log('📊 Object Database Status:', {
        hasDatabase: !!starChartsManager.objectDatabase,
        isInitialized: !!starChartsManager.isInitialized,
        currentSector: starChartsManager.currentSector
    });
    
    // Check available objects
    const allObjects = starChartsUI.getDiscoveredObjectsForRender();
    console.log('🌟 Available Objects:', {
        count: allObjects.length,
        objects: allObjects.map(obj => ({
            id: obj.id,
            name: obj.name,
            type: obj.type,
            _isUndiscovered: obj._isUndiscovered,
            hasPosition: !!(obj.x !== undefined || obj.position)
        }))
    });
    
    // Test getObjectData for each object
    console.log('🔍 Testing getObjectData for each object:');
    allObjects.forEach((obj, index) => {
        if (obj.id) {
            const completeData = starChartsManager.getObjectData(obj.id);
            console.log(`  ${index + 1}. ${obj.id}:`, {
                originalName: obj.name,
                completeDataName: completeData?.name,
                completeDataExists: !!completeData,
                completeData: completeData
            });
        }
    });
    
    // Test hover detection manually
    console.log('🖱️ Testing hover detection...');
    
    // Override showTooltip temporarily to log more details
    const originalShowTooltip = starChartsUI.showTooltip;
    starChartsUI.showTooltip = function(screenX, screenY, object) {
        console.log('🎯 MANUAL TEST - showTooltip called with:', {
            screenX, screenY,
            object: {
                id: object.id,
                name: object.name,
                type: object.type,
                _isShip: object._isShip,
                _isUndiscovered: object._isUndiscovered,
                allKeys: Object.keys(object)
            }
        });
        
        // Call original method
        return originalShowTooltip.call(this, screenX, screenY, object);
    };
    
    console.log('✅ Debug setup complete. Now hover over objects to see detailed logs.');
    console.log('💡 To restore original showTooltip: starChartsUI.showTooltip = originalShowTooltip');
    
    // Store reference for restoration
    window.originalShowTooltip = originalShowTooltip;
    
} else {
    console.log('❌ Star Charts not found. Make sure to:');
    console.log('  1. Open the game');
    console.log('  2. Press "C" to open Star Charts');
    console.log('  3. Wait for initialization');
    console.log('  4. Run this script again');
}

// Helper function to restore original behavior
window.restoreTooltipDebug = function() {
    if (window.navigationSystemManager && window.navigationSystemManager.starChartsUI && window.originalShowTooltip) {
        window.navigationSystemManager.starChartsUI.showTooltip = window.originalShowTooltip;
        console.log('✅ Original showTooltip restored');
    }
};
