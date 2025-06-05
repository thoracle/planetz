// Debug Script Loader - Paste this into browser console
(function() {
    console.log('🔧 Loading debug scripts...');
    
    const scripts = [
        'test-outline-debugging.js',
        'test-outline-flag-persistence.js'
    ];
    
    let loaded = 0;
    
    scripts.forEach(script => {
        const scriptElement = document.createElement('script');
        scriptElement.src = script;
        scriptElement.onload = () => {
            loaded++;
            console.log(`✅ Loaded: ${script}`);
            if (loaded === scripts.length) {
                console.log('🎉 All debug scripts loaded!');
                console.log('Available functions:');
                console.log('• debugOutlineIssue() - Comprehensive test');
                console.log('• testOutlineFlagPersistence() - Flag behavior test');
            }
        };
        scriptElement.onerror = () => {
            console.error(`❌ Failed to load: ${script}`);
        };
        document.head.appendChild(scriptElement);
    });
})(); 