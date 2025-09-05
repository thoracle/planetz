// Debug Star Charts Loading - Step by Step Troubleshooting
// Copy and paste this into the browser console

(function() {
    console.log('🔍 Debugging Star Charts Loading...\n');
    
    // Step 1: Check if we're on the right page
    console.log('📍 Current URL:', window.location.href);
    console.log('📍 Page title:', document.title);
    
    // Step 2: Check basic game objects
    console.log('\n🎮 Basic Game Objects:');
    console.log('window.viewManager:', typeof window.viewManager, window.viewManager ? '✅' : '❌');
    console.log('window.starfieldManager:', typeof window.starfieldManager, window.starfieldManager ? '✅' : '❌');
    console.log('window.solarSystemManager:', typeof window.solarSystemManager, window.solarSystemManager ? '✅' : '❌');
    console.log('window.navigationSystemManager:', typeof window.navigationSystemManager, window.navigationSystemManager ? '✅' : '❌');
    
    // Step 3: Check if game is still loading
    console.log('\n⏳ Loading Status:');
    console.log('window.starfieldManagerReady:', window.starfieldManagerReady ? '✅' : '❌');
    console.log('window.spatialManagerReady:', window.spatialManagerReady ? '✅' : '❌');
    console.log('window.collisionManagerReady:', window.collisionManagerReady ? '✅' : '❌');
    
    // Step 4: Check DOM readiness
    console.log('\n📄 DOM Status:');
    console.log('document.readyState:', document.readyState);
    console.log('DOMContentLoaded fired:', document.readyState !== 'loading' ? '✅' : '❌');
    
    // Step 5: Check for errors in console
    console.log('\n🚨 Check for JavaScript errors above this message');
    console.log('If you see any red error messages, that might be preventing initialization');
    
    // Step 6: Wait and retry function
    let retryCount = 0;
    const maxRetries = 10;
    
    function checkAgain() {
        retryCount++;
        console.log(`\n🔄 Retry ${retryCount}/${maxRetries}:`);
        
        if (window.viewManager) {
            console.log('🎉 ViewManager found! Game is loaded.');
            
            // Check NavigationSystemManager
            if (window.viewManager.navigationSystemManager) {
                console.log('✅ NavigationSystemManager found in ViewManager');
                window.navigationSystemManager = window.viewManager.navigationSystemManager;
                
                try {
                    const status = window.navigationSystemManager.getSystemStatus();
                    console.log('📊 System Status:', status);
                } catch (e) {
                    console.log('❌ Error getting system status:', e.message);
                }
            } else {
                console.log('❌ NavigationSystemManager not found in ViewManager');
                console.log('🔍 ViewManager properties:', Object.keys(window.viewManager));
            }
            
            return; // Stop retrying
        }
        
        if (retryCount < maxRetries) {
            console.log('⏳ ViewManager not ready yet, waiting 2 seconds...');
            setTimeout(checkAgain, 2000);
        } else {
            console.log('❌ ViewManager never loaded. Possible issues:');
            console.log('1. Game failed to initialize');
            console.log('2. JavaScript errors preventing loading');
            console.log('3. Wrong page or server not running');
            console.log('4. Browser compatibility issues');
            
            console.log('\n🔧 Troubleshooting steps:');
            console.log('1. Check if backend server is running: cd backend && python3 app.py');
            console.log('2. Refresh the page (F5 or Ctrl+R)');
            console.log('3. Check browser console for red error messages');
            console.log('4. Try opening http://127.0.0.1:5001 directly');
        }
    }
    
    // Start checking
    if (!window.viewManager) {
        console.log('\n⏳ ViewManager not found. Starting retry loop...');
        setTimeout(checkAgain, 2000);
    } else {
        checkAgain(); // Check immediately if ViewManager exists
    }
    
})();
