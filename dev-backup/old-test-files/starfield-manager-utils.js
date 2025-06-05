/**
 * StarfieldManager Utilities
 * Helper functions for test scripts to safely access StarfieldManager
 */

// Wait for StarfieldManager to be available and ready
window.waitForStarfieldManager = function(callback, timeout = 10000) {
    const startTime = Date.now();
    
    function checkReady() {
        // Check if StarfieldManager is available and properly initialized
        if (window.starfieldManager && window.starfieldManagerReady) {
            console.log('✅ StarfieldManager is ready');
            callback(window.starfieldManager);
            return;
        }
        
        // Check timeout
        if (Date.now() - startTime > timeout) {
            console.error('❌ Timeout waiting for StarfieldManager to be ready');
            console.log('Available:', {
                starfieldManager: !!window.starfieldManager,
                starfieldManagerReady: !!window.starfieldManagerReady
            });
            return;
        }
        
        // Try again in 100ms
        setTimeout(checkReady, 100);
    }
    
    checkReady();
};

// Synchronous check if StarfieldManager is ready
window.isStarfieldManagerReady = function() {
    return !!(window.starfieldManager && window.starfieldManagerReady);
};

// Safe access to StarfieldManager with error handling
window.safeStarfieldManager = function() {
    if (!window.starfieldManager) {
        console.error('❌ StarfieldManager not found');
        return null;
    }
    if (!window.starfieldManagerReady) {
        console.warn('⚠️ StarfieldManager found but not ready yet');
        return null;
    }
    return window.starfieldManager;
};

console.log('🔧 StarfieldManager utilities loaded'); 