// Game Loading Diagnostic Script
// Copy and paste this into the browser console to diagnose loading issues

(function() {
    console.log('🔍 GAME LOADING DIAGNOSTIC');
    console.log('==========================\n');
    
    // 1. Basic Environment Check
    console.log('📍 Environment Check:');
    console.log('URL:', window.location.href);
    console.log('Title:', document.title);
    console.log('Document ready:', document.readyState);
    console.log('User agent:', navigator.userAgent);
    
    // 2. Check if we're on the right page
    console.log('\n🌐 Page Content Check:');
    console.log('Body innerHTML length:', document.body.innerHTML.length);
    console.log('Has canvas element:', !!document.querySelector('canvas'));
    console.log('Script tags count:', document.scripts.length);
    
    // List all script sources
    console.log('\n📜 Loaded Scripts:');
    Array.from(document.scripts).forEach((script, i) => {
        if (script.src) {
            console.log(`${i + 1}. ${script.src}`);
        } else {
            console.log(`${i + 1}. <inline script> (${script.innerHTML.length} chars)`);
        }
    });
    
    // 3. Check for JavaScript errors
    console.log('\n🚨 Error Detection:');
    console.log('Check above this message for any red error messages');
    
    // 4. Check critical dependencies
    console.log('\n📦 Dependency Check:');
    console.log('THREE.js loaded:', typeof THREE !== 'undefined');
    console.log('ViewManager class available:', typeof ViewManager !== 'undefined');
    console.log('StarfieldManager class available:', typeof StarfieldManager !== 'undefined');
    console.log('SolarSystemManager class available:', typeof SolarSystemManager !== 'undefined');
    
    // 5. Check if DOMContentLoaded fired
    console.log('\n⚡ Event Check:');
    console.log('DOMContentLoaded should have fired (document ready is complete)');
    
    // 6. Check backend connectivity
    console.log('\n🔗 Backend Connectivity:');
    fetch('/api/status')
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
        })
        .then(data => {
            console.log('✅ Backend responding:', data);
        })
        .catch(error => {
            console.log('❌ Backend error:', error.message);
            console.log('💡 Make sure backend is running: cd backend && python3 app.py');
        });
    
    // 7. Check for app.js loading
    console.log('\n🎮 Game Initialization Check:');
    
    // Look for app.js specifically
    const appScript = Array.from(document.scripts).find(script => 
        script.src && script.src.includes('app.js')
    );
    
    if (appScript) {
        console.log('✅ app.js script tag found:', appScript.src);
        
        // Check if it loaded successfully
        fetch(appScript.src)
            .then(response => {
                if (response.ok) {
                    console.log('✅ app.js file accessible');
                } else {
                    console.log('❌ app.js file not accessible:', response.status);
                }
            })
            .catch(error => {
                console.log('❌ app.js fetch error:', error.message);
            });
    } else {
        console.log('❌ app.js script tag not found');
        console.log('💡 This might be why the game is not loading');
    }
    
    // 8. Check for module loading errors
    console.log('\n📦 Module System Check:');
    console.log('ES6 modules supported:', 'import' in document.createElement('script'));
    
    // 9. Manual initialization attempt
    console.log('\n🔧 Manual Initialization Check:');
    
    // Try to manually trigger DOMContentLoaded if it somehow didn't fire
    setTimeout(() => {
        console.log('\n⏰ 5-second delayed check:');
        console.log('ViewManager after delay:', !!window.viewManager);
        console.log('StarfieldManager after delay:', !!window.starfieldManager);
        
        if (!window.viewManager) {
            console.log('\n🚨 DIAGNOSIS: Game failed to initialize');
            console.log('\n🔧 Possible causes:');
            console.log('1. JavaScript error preventing initialization');
            console.log('2. Missing or corrupted app.js file');
            console.log('3. Module loading failure');
            console.log('4. Backend not serving static files correctly');
            console.log('5. Browser compatibility issue');
            
            console.log('\n💡 Recommended fixes:');
            console.log('1. Check browser console for red error messages');
            console.log('2. Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)');
            console.log('3. Restart backend server: cd backend && python3 app.py');
            console.log('4. Try different browser (Chrome, Firefox, Safari)');
            console.log('5. Check if static files are being served correctly');
            
            // Try to access static files directly
            console.log('\n🔍 Testing static file access:');
            const testUrls = [
                '/static/js/app.js',
                '/static/js/views/ViewManager.js',
                '/static/js/views/StarfieldManager.js'
            ];
            
            testUrls.forEach(url => {
                fetch(url)
                    .then(response => {
                        console.log(`${response.ok ? '✅' : '❌'} ${url}: ${response.status}`);
                    })
                    .catch(error => {
                        console.log(`❌ ${url}: ${error.message}`);
                    });
            });
        } else {
            console.log('🎉 Game loaded successfully after delay!');
        }
    }, 5000);
    
    console.log('\n⏳ Running extended diagnostic... results in 5 seconds');
    
})();
