// Discovery Radius Debug Test Script
// Run this in the browser console to diagnose discovery radius issues

console.log('🔧 Discovery Radius Debug Test');
console.log('================================');

// Check if StarChartsManager is available
if (typeof window.starChartsManager !== 'undefined') {
    const scm = window.starChartsManager;
    
    console.log('✅ StarChartsManager found');
    
    // Test discovery radius methods
    console.log('\n📏 Discovery Radius Tests:');
    console.log(`getDiscoveryRadius(): ${scm.getDiscoveryRadius()}km`);
    console.log(`debugDiscoveryRadius: ${scm.debugDiscoveryRadius || 'not set'}`);
    console.log(`getEffectiveDiscoveryRadius(): ${scm.getEffectiveDiscoveryRadius()}km`);
    
    // Get player position
    const playerPos = scm.getPlayerPosition();
    if (playerPos) {
        console.log(`\n📍 Player Position: [${playerPos.join(', ')}]`);
        
        // Test different radii
        const radii = [25, 50, 75, 100, 150];
        console.log('\n🔍 Objects at different radii:');
        
        radii.forEach(radius => {
            const nearby = scm.getNearbyObjects(playerPos, radius);
            console.log(`\n${radius}km radius: ${nearby.length} objects`);
            
            nearby.forEach(obj => {
                const objPos = obj.cartesianPosition || obj.position || [0, 0, 0];
                const distance = scm.calculateDistance(objPos, playerPos);
                const discovered = scm.isDiscovered(obj.id) ? '✅ DISCOVERED' : '❌ undiscovered';
                console.log(`  - ${obj.id}: ${distance.toFixed(1)}km (${discovered})`);
            });
        });
        
        // Show current discovery state
        console.log(`\n📊 Discovery State:`);
        console.log(`Total discovered objects: ${scm.discoveredObjects.size}`);
        if (scm.discoveredObjects.size > 0) {
            console.log('Discovered objects:', Array.from(scm.discoveredObjects));
        }
        
    } else {
        console.log('❌ Could not get player position');
    }
    
    // Provide helper commands
    console.log('\n🛠️  Available Debug Commands:');
    console.log('starChartsManager.debugRadiusIssues() - Full radius diagnostic');
    console.log('starChartsManager.setDiscoveryRadius(newRadius) - Set custom radius');
    console.log('starChartsManager.resetDiscoveryState() - Reset all discoveries');
    console.log('starChartsManager.getEffectiveDiscoveryRadius() - Get current radius');
    
} else {
    console.log('❌ StarChartsManager not found');
    console.log('Make sure the game is loaded and try again');
    
    // Check for NavigationSystemManager
    if (typeof window.navigationSystemManager !== 'undefined') {
        console.log('ℹ️  NavigationSystemManager found, checking for StarChartsManager...');
        if (window.navigationSystemManager.starChartsManager) {
            console.log('✅ Found StarChartsManager via NavigationSystemManager');
            window.starChartsManager = window.navigationSystemManager.starChartsManager;
            console.log('🔧 Exposed as window.starChartsManager - run this script again');
        }
    }
}

console.log('\n================================');