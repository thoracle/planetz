// Deep debugging script for tooltip issue
// Run this in browser console when Star Charts is open

console.log('🔧 Starting DEEP tooltip debug session...');

// Step 1: Check if our enhanced methods exist
if (window.navigationSystemManager && window.navigationSystemManager.starChartsUI) {
    const starChartsUI = window.navigationSystemManager.starChartsUI;
    const starChartsManager = window.navigationSystemManager.starChartsManager;
    
    console.log('✅ Star Charts components found');
    
    // Step 2: Check if our enhanced methods exist
    console.log('🔍 Method availability:', {
        ensureObjectHasName: typeof starChartsUI.ensureObjectHasName,
        getDiscoveredObjectsForRender: typeof starChartsUI.getDiscoveredObjectsForRender,
        showTooltip: typeof starChartsUI.showTooltip
    });
    
    // Step 3: Test getDiscoveredObjectsForRender directly
    console.log('🌟 Testing getDiscoveredObjectsForRender...');
    try {
        const allObjects = starChartsUI.getDiscoveredObjectsForRender();
        console.log('📊 Objects returned:', {
            count: allObjects.length,
            sample: allObjects.slice(0, 3).map(obj => ({
                id: obj.id,
                name: obj.name,
                type: obj.type,
                _isUndiscovered: obj._isUndiscovered,
                hasPosition: !!(obj.x !== undefined || obj.position),
                allKeys: Object.keys(obj)
            }))
        });
        
        // Step 4: Test ensureObjectHasName on each object
        console.log('🔧 Testing ensureObjectHasName on each object...');
        allObjects.slice(0, 5).forEach((obj, i) => {
            const enhanced = starChartsUI.ensureObjectHasName(obj);
            console.log(`  ${i + 1}. Original:`, {
                id: obj.id,
                name: obj.name,
                type: obj.type
            });
            console.log(`     Enhanced:`, {
                id: enhanced?.id,
                name: enhanced?.name,
                type: enhanced?.type,
                success: !!enhanced?.name
            });
        });
        
    } catch (e) {
        console.log('❌ Error testing getDiscoveredObjectsForRender:', e);
    }
    
    // Step 5: Test database access
    console.log('🗄️ Testing database access...');
    console.log('Database status:', {
        hasDatabase: !!starChartsManager.objectDatabase,
        isInitialized: !!starChartsManager.isInitialized,
        currentSector: starChartsManager.getCurrentSector?.()
    });
    
    if (starChartsManager.objectDatabase) {
        const sector = starChartsManager.getCurrentSector?.() || 'A0';
        const sectorData = starChartsManager.objectDatabase.sectors?.[sector];
        console.log(`Sector ${sector} data:`, {
            hasSectorData: !!sectorData,
            hasStar: !!sectorData?.star,
            starName: sectorData?.star?.name,
            objectCount: sectorData?.objects?.length || 0,
            hasInfrastructure: !!sectorData?.infrastructure
        });
        
        // Test getObjectData directly
        const testIds = ['A0_star', 'A0_earth', 'A0_mars'];
        testIds.forEach(id => {
            const data = starChartsManager.getObjectData(id);
            console.log(`getObjectData('${id}'):`, {
                hasData: !!data,
                name: data?.name,
                type: data?.type
            });
        });
    }
    
    // Step 6: Override showTooltip to see what's really being passed
    console.log('🎯 Overriding showTooltip for deep inspection...');
    const originalShowTooltip = starChartsUI.showTooltip;
    
    starChartsUI.showTooltip = function(screenX, screenY, object) {
        console.log('🔍 DEEP INSPECTION - showTooltip called with:', {
            screenX: screenX,
            screenY: screenY,
            objectType: typeof object,
            objectIsNull: object === null,
            objectIsUndefined: object === undefined,
            objectConstructor: object?.constructor?.name,
            objectKeys: object ? Object.keys(object) : 'N/A',
            objectId: object?.id,
            objectName: object?.name,
            objectType: object?.type,
            fullObject: object
        });
        
        if (object) {
            console.log('🧪 Testing ensureObjectHasName on this object...');
            const enhanced = this.ensureObjectHasName(object);
            console.log('Enhanced result:', {
                success: !!enhanced,
                name: enhanced?.name,
                type: enhanced?.type,
                id: enhanced?.id
            });
        }
        
        // Call original method
        return originalShowTooltip.call(this, screenX, screenY, object);
    };
    
    console.log('✅ Deep debugging setup complete. Now hover over objects to see detailed logs.');
    console.log('💡 To restore: starChartsUI.showTooltip = originalShowTooltip');
    
    // Store for restoration
    window.originalShowTooltipDeep = originalShowTooltip;
    
} else {
    console.log('❌ Star Charts not found. Make sure to:');
    console.log('  1. Open the game');
    console.log('  2. Press "C" to open Star Charts');
    console.log('  3. Wait for initialization');
    console.log('  4. Run this script again');
}

// Helper to restore
window.restoreTooltipDeep = function() {
    if (window.navigationSystemManager?.starChartsUI && window.originalShowTooltipDeep) {
        window.navigationSystemManager.starChartsUI.showTooltip = window.originalShowTooltipDeep;
        console.log('✅ Original showTooltip restored');
    }
};
