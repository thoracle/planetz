/**
 * Example Test Script: StarfieldManager Ready Check
 * Demonstrates proper way to access StarfieldManager without timing issues
 */

console.log('🧪 Starting StarfieldManager ready test...');

// Method 1: Wait for StarfieldManager to be ready
console.log('📋 Method 1: Using waitForStarfieldManager()');
window.waitForStarfieldManager((starfieldManager) => {
    console.log('✅ StarfieldManager is ready!');
    console.log('- Type:', typeof starfieldManager);
    console.log('- Scene:', !!starfieldManager.scene);
    console.log('- Camera:', !!starfieldManager.camera);
    console.log('- ViewManager:', !!starfieldManager.viewManager);
    
    // Test basic functionality
    console.log('- Current view:', starfieldManager.view);
    console.log('- Is docked:', starfieldManager.isDocked);
    console.log('- Current speed:', starfieldManager.currentSpeed);
    
    console.log('🎯 StarfieldManager test completed successfully!');
});

// Method 2: Synchronous check (useful for conditional logic)
setTimeout(() => {
    console.log('\n📋 Method 2: Using isStarfieldManagerReady()');
    if (window.isStarfieldManagerReady()) {
        console.log('✅ Synchronous check: StarfieldManager is ready');
        
        const sm = window.safeStarfieldManager();
        if (sm) {
            console.log('✅ Safe access: Got StarfieldManager instance');
        }
    } else {
        console.log('⏳ Synchronous check: StarfieldManager not ready yet');
    }
}, 3000); // Check after 3 seconds

// Method 3: Direct access with error handling (old way, for comparison)
setTimeout(() => {
    console.log('\n📋 Method 3: Direct access (old way - can fail)');
    if (window.starfieldManager) {
        console.log('✅ Direct access: StarfieldManager found');
    } else {
        console.log('❌ Direct access: StarfieldManager not found');
    }
}, 100); // Check very early - likely to fail

console.log('📋 All test methods scheduled...'); 