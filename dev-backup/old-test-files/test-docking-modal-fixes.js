// Test script to verify docking modal functionality and check worker spam fix
console.log('🔧 Testing docking modal fixes...');

function testDockingModal() {
    // Check if basic systems are available
    if (!window.starfieldManager) {
        console.error('❌ StarfieldManager not found');
        return;
    }
    
    if (!window.starfieldManager.dockingModal) {
        console.error('❌ DockingModal not found');
        return;
    }
    
    const dm = window.starfieldManager.dockingModal;
    console.log('✅ DockingModal found and accessible');
    
    // Check if interval is running
    if (dm.dockingCheckInterval) {
        console.log('✅ Docking check interval is running');
    } else {
        console.log('⚠️ Docking check interval not running, starting it...');
        dm.startDockingCheck();
    }
    
    // Manual test for nearby object detection
    try {
        console.log('🔍 Testing findNearbyDockableObjects...');
        const nearbyObjects = dm.findNearbyDockableObjects();
        console.log('📍 Nearby dockable objects:', nearbyObjects.length);
        
        if (nearbyObjects.length > 0) {
            console.log('✅ Found dockable objects:', nearbyObjects);
            
            // Test showing modal for first object
            const testObj = nearbyObjects[0];
            console.log('🧪 Testing modal display for:', testObj.name);
            dm.show(testObj);
        } else {
            console.log('ℹ️ No dockable objects nearby - this is normal if not near planets');
        }
    } catch (error) {
        console.error('❌ Error testing docking functionality:', error);
    }
}

function monitorWorkerSpam() {
    console.log('🔍 Monitoring for worker spam...');
    
    let requestCount = 0;
    let lastRequestTime = 0;
    const originalFetch = window.fetch;
    
    // Monitor fetch requests to worker files
    window.fetch = function(...args) {
        const url = args[0];
        if (typeof url === 'string' && url.includes('meshGenerator.worker.js')) {
            const now = Date.now();
            requestCount++;
            
            if (now - lastRequestTime > 5000) {
                // Reset counter every 5 seconds
                if (requestCount > 1) {
                    console.warn(`⚠️ Detected ${requestCount} worker requests in last 5 seconds`);
                } else {
                    console.log(`✅ Normal worker request rate: ${requestCount}/5s`);
                }
                requestCount = 0;
                lastRequestTime = now;
            }
        }
        return originalFetch.apply(this, args);
    };
    
    console.log('✅ Worker monitoring active');
}

// Start monitoring
monitorWorkerSpam();

// Test the docking modal after a short delay
setTimeout(() => {
    testDockingModal();
}, 1000);

console.log('🏁 Docking modal test script loaded successfully!'); 