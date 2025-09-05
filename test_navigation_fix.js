// Quick test to verify the navigation system fix
// Copy and paste this into the browser console after refreshing

(function() {
    console.log('🔧 Testing Navigation System Fix');
    console.log('================================\n');
    
    // Wait for game to load
    let attempts = 0;
    const maxAttempts = 10;
    
    function checkGameStatus() {
        attempts++;
        console.log(`📍 Check ${attempts}/${maxAttempts}:`);
        
        const hasViewManager = !!window.viewManager;
        const hasStarfieldManager = !!window.starfieldManager;
        const hasNavigationSystem = !!window.viewManager?.navigationSystemManager;
        
        console.log('- ViewManager:', hasViewManager ? '✅' : '❌');
        console.log('- StarfieldManager:', hasStarfieldManager ? '✅' : '❌');
        console.log('- NavigationSystemManager:', hasNavigationSystem ? '✅' : '❌');
        
        if (hasViewManager && hasStarfieldManager) {
            console.log('\n🎉 SUCCESS: Game loaded successfully!');
            console.log('\n🧭 Navigation System Status:');
            console.log('- NavigationSystemManager initialized:', hasNavigationSystem);
            
            if (hasNavigationSystem) {
                console.log('- LRS available:', !!window.viewManager.navigationSystemManager.longRangeScanner);
                console.log('- Star Charts available:', !!window.viewManager.navigationSystemManager.starChartsUI);
                console.log('\n✅ All systems operational - UX parity implementation ready for testing!');
            } else {
                console.log('⏳ NavigationSystemManager still initializing...');
            }
            
            return true; // Success
        } else if (attempts >= maxAttempts) {
            console.log('\n❌ TIMEOUT: Game failed to load after', maxAttempts, 'attempts');
            console.log('💡 Try hard refresh (Cmd+Shift+R) and run again');
            return true; // Stop trying
        } else {
            console.log('⏳ Still loading... checking again in 2 seconds\n');
            setTimeout(checkGameStatus, 2000);
            return false; // Continue checking
        }
    }
    
    // Start checking
    checkGameStatus();
})();
