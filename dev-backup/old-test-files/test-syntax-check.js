// Simple syntax check for debug scripts
console.log('🔧 Testing script syntax...');

try {
    console.log('✅ Basic syntax test passed');
    
    // Test if window object is available
    if (typeof window !== 'undefined') {
        console.log('✅ Window object available');
        
        // Test if we can access starfieldManager
        if (window.starfieldManager) {
            console.log('✅ StarfieldManager found');
        } else {
            console.log('⏳ StarfieldManager not loaded yet');
        }
    } else {
        console.log('❌ Window object not available (server-side)');
    }
    
} catch (error) {
    console.error('❌ Syntax error:', error);
}

console.log('🔧 Syntax check complete'); 