// Reset discovery system for fresh testing
console.log('🔄 Resetting Star Charts Discovery System...');

if (window.navigationSystemManager?.starChartsManager) {
    const manager = window.navigationSystemManager.starChartsManager;
    
    // Clear all discovered objects
    manager.discoveredObjects.clear();
    console.log('✅ Cleared all discovered objects');
    
    // Reset any cached discovery state
    if (manager.discoveryCache) {
        manager.discoveryCache.clear();
        console.log('✅ Cleared discovery cache');
    }
    
    // Force UI refresh
    if (window.navigationSystemManager.starChartsUI) {
        window.navigationSystemManager.starChartsUI.refreshDisplay();
        console.log('✅ Refreshed Star Charts UI');
    }
    
    // Check new state
    console.log('New discovered count:', manager.discoveredObjects.size);
    console.log('Test mode:', manager.isTestDiscoverAllEnabled());
    
} else {
    console.log('❌ StarChartsManager not found');
}

console.log('🎯 Discovery system reset complete!');
console.log('Now fly around and watch for new discoveries...');
