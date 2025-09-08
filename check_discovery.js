// Check the correct star charts manager access
console.log('🔍 Checking Star Charts Discovery System...');

// Check navigation system manager
if (window.navigationSystemManager) {
    console.log('✅ NavigationSystemManager found');
    
    // Check star charts manager
    if (window.navigationSystemManager.starChartsManager) {
        console.log('✅ StarChartsManager found');
        
        const manager = window.navigationSystemManager.starChartsManager;
        console.log('Discovered objects:', manager.discoveredObjects?.size || 0);
        console.log('Test mode enabled:', manager.isTestDiscoverAllEnabled());
        console.log('Current sector:', manager.currentSector);
        
        // Check if objects are being discovered
        if (manager.objectDatabase) {
            console.log('✅ Object database available');
            const sectors = Object.keys(manager.objectDatabase.sectors || {});
            console.log('Available sectors:', sectors);
        } else {
            console.log('❌ Object database not available');
        }
        
    } else {
        console.log('❌ StarChartsManager not found in NavigationSystemManager');
    }
    
} else {
    console.log('❌ NavigationSystemManager not found globally');
    console.log('Available global objects:', Object.keys(window).filter(key => key.includes('Manager')));
}

// Also check the old direct access (might not work)
if (window.starChartsManager) {
    console.log('⚠️ Old direct access still works (shouldn\'t happen)');
} else {
    console.log('ℹ️ Direct starChartsManager access not available (expected)');
}

console.log('\n💡 To test discovery:');
console.log('1. Fly around the solar system');
console.log('2. Watch for new objects appearing in star charts');
console.log('3. Use L key for Long Range Scanner');
