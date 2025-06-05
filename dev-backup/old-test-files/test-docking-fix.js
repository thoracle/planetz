// Simple test script for docking modal fixes
console.log('🧪 Loading docking fix test script...');

function testDockingFix() {
    console.log('\n=== DOCKING MODAL FIX TEST ===');
    
    const sm = window.starfieldManager;
    if (!sm) {
        console.error('❌ StarfieldManager not found');
        return;
    }
    
    const dm = sm.dockingModal;
    if (!dm) {
        console.error('❌ DockingModal not found');
        return;
    }
    
    console.log('✅ Found StarfieldManager and DockingModal');
    
    // Check debug state tracking
    console.log('📊 Debug state tracking:', dm.lastDebugState);
    
    // Check throttling settings
    console.log('⏱️ Debug throttle (ms):', dm.debugThrottleMs);
    
    // Test manual docking check
    console.log('🔍 Running manual docking check...');
    dm.checkDockingConditions();
    
    // Check nearby objects manually
    console.log('🔍 Finding nearby dockable objects...');
    const nearby = dm.findNearbyDockableObjects();
    console.log('🎯 Nearby dockable objects:', nearby);
    
    if (nearby.length > 0) {
        const closest = nearby[0];
        console.log('🎯 Closest object:', closest);
        console.log('🎯 Distance:', closest.distance, 'km');
        console.log('🎯 Docking range:', closest.dockingRange, 'km');
        console.log('🎯 Type:', closest.type);
        console.log('🎯 Can dock:', closest.distance <= closest.dockingRange);
        
        // If it's a planet, check the range is 4km
        if (closest.type === 'planet' && closest.dockingRange !== 4.0) {
            console.error('🚨 PLANET RANGE BUG: Planet has docking range', closest.dockingRange, 'but should be 4.0km');
        } else if (closest.type === 'moon' && closest.dockingRange !== 1.5) {
            console.error('🚨 MOON RANGE BUG: Moon has docking range', closest.dockingRange, 'but should be 1.5km');
        } else {
            console.log('✅ Docking range is correct for', closest.type);
        }
    }
    
    // Check current speed for docking
    console.log('⚡ Current speed:', sm.currentSpeed);
    console.log('🚀 Max docking speed: 1');
    
    if (sm.currentSpeed > 1) {
        console.log('🐌 Speed too high for docking - should auto-reduce when modal appears');
    } else {
        console.log('✅ Speed is acceptable for docking');
    }
    
    // Test if modal is visible
    console.log('👁️ Modal visible:', dm.isVisible);
    console.log('🔄 Check interval active:', dm.checkInterval !== null);
    
    console.log('\n=== TEST COMPLETE ===');
}

// Auto-run after a delay
setTimeout(() => {
    if (window.starfieldManager) {
        testDockingFix();
    } else {
        console.log('⏳ Waiting for StarfieldManager to load...');
        const checkInterval = setInterval(() => {
            if (window.starfieldManager) {
                clearInterval(checkInterval);
                testDockingFix();
            }
        }, 1000);
    }
}, 2000);

// Make available globally
window.testDockingFix = testDockingFix;

console.log('✅ Docking fix test script loaded - use testDockingFix() to run manually'); 