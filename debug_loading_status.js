/**
 * Debug Loading Status
 * ===================
 * 
 * This script helps diagnose why the game isn't loading properly.
 */

function checkLoadingStatus() {
    console.log('🔍 Checking game loading status...');
    
    // Check basic page elements
    console.log('\n📄 Page Elements:');
    const sceneContainer = document.getElementById('scene-container');
    console.log('   scene-container exists:', !!sceneContainer);
    if (sceneContainer) {
        console.log('   scene-container children:', sceneContainer.children.length);
    }
    
    // Check if scripts are loaded
    console.log('\n📜 Script Loading:');
    const scripts = document.querySelectorAll('script');
    console.log('   Total scripts:', scripts.length);
    
    // Check for Three.js
    console.log('   THREE available:', typeof window.THREE !== 'undefined');
    
    // Check for module scripts
    const moduleScripts = document.querySelectorAll('script[type="module"]');
    console.log('   Module scripts:', moduleScripts.length);
    
    // Check console for errors
    console.log('\n🚨 Check console above for any red error messages');
    
    // Check if we're on the right page
    console.log('\n🌐 Page Info:');
    console.log('   URL:', window.location.href);
    console.log('   Title:', document.title);
    
    // Check for common loading indicators
    console.log('\n⏳ Loading Indicators:');
    console.log('   spatialSystemsReady:', window.spatialSystemsReady);
    console.log('   collisionSystemsReady:', window.collisionSystemsReady);
    
    // List all window properties that might be game-related
    console.log('\n🔍 Potential Game Objects:');
    const gameRelated = Object.keys(window).filter(k => 
        k.toLowerCase().includes('app') || 
        k.toLowerCase().includes('game') || 
        k.toLowerCase().includes('three') ||
        k.toLowerCase().includes('scene') ||
        k.toLowerCase().includes('view') ||
        k.toLowerCase().includes('star')
    );
    console.log('   Found:', gameRelated);
    
    // Check if we can see the game visually
    console.log('\n👁️ Visual Check:');
    console.log('   Can you see a 3D space scene with stars/objects? (Check visually)');
    console.log('   Can you see any game UI elements? (Check visually)');
    
    console.log('\n💡 Next Steps:');
    console.log('   1. Look for RED error messages in console above');
    console.log('   2. Make sure you can see the game interface visually');
    console.log('   3. If no errors but no game, check if server is running properly');
    console.log('   4. Try refreshing the page (F5)');
}

function waitForGameLoad() {
    console.log('⏳ Waiting for game to load...');
    
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    
    const checkInterval = setInterval(() => {
        attempts++;
        
        if (window.app) {
            console.log('✅ Game loaded successfully!');
            console.log('🎮 window.app is now available');
            clearInterval(checkInterval);
            
            // Run the StarCharts availability check
            setTimeout(() => {
                if (typeof debugStarChartsAvailability === 'function') {
                    debugStarChartsAvailability();
                }
            }, 1000);
            
        } else if (attempts >= maxAttempts) {
            console.log('❌ Game failed to load within 30 seconds');
            console.log('🔍 Running diagnostic...');
            checkLoadingStatus();
            clearInterval(checkInterval);
        } else {
            console.log(`⏳ Still waiting... (${attempts}/${maxAttempts})`);
        }
    }, 1000);
}

// Auto-run
console.log('🔧 Loading Status Debug Script Loaded');
console.log('📋 Available commands:');
console.log('   checkLoadingStatus() - Check current loading status');
console.log('   waitForGameLoad() - Wait and monitor for game to load');
console.log('');
console.log('🚀 Running immediate status check...');
checkLoadingStatus();
console.log('');
console.log('🔄 Starting automatic load monitoring...');
waitForGameLoad();
