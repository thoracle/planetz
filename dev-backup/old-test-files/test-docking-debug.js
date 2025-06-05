// Test script to debug docking modal functionality
console.log('🔧 Docking Modal Debug Test Started');

// Function to run diagnostics
function testDockingModal() {
    console.log('🧪 Running docking modal diagnostics...');
    
    // Check if StarfieldManager exists
    if (typeof window.starfieldManager === 'undefined') {
        console.error('❌ StarfieldManager not found on window object');
        return;
    }
    
    const sm = window.starfieldManager;
    console.log('✅ StarfieldManager found:', sm);
    
    // Check if DockingModal exists
    if (!sm.dockingModal) {
        console.error('❌ DockingModal not found on StarfieldManager');
        return;
    }
    
    const dm = sm.dockingModal;
    console.log('✅ DockingModal found:', dm);
    
    // Test solar system manager
    if (!sm.solarSystemManager) {
        console.error('❌ SolarSystemManager not found');
        return;
    }
    
    console.log('✅ SolarSystemManager found:', sm.solarSystemManager);
    
    // Test celestial bodies
    const celestialBodies = sm.solarSystemManager.getCelestialBodies();
    console.log('🌍 Celestial bodies:', celestialBodies);
    console.log('🌍 Number of celestial bodies:', celestialBodies ? celestialBodies.size : 0);
    
    if (celestialBodies && celestialBodies.size > 0) {
        console.log('📊 Available celestial bodies:');
        celestialBodies.forEach((body, id) => {
            console.log(`  - ${id}: ${body.name || 'unnamed'} at position:`, body.position);
        });
    }
    
    // Test player position
    const playerPos = sm.camera ? sm.camera.position : null;
    console.log('🚀 Player position:', playerPos);
    
    // Test current speed
    console.log('⚡ Current speed:', sm.currentSpeed);
    
    // Test distance calculation if we have bodies
    if (celestialBodies && celestialBodies.size > 0 && playerPos) {
        console.log('📏 Testing distance calculations:');
        celestialBodies.forEach((body, id) => {
            if (id.startsWith('planet_') || id.startsWith('moon_')) {
                const distance = sm.calculateDistance(playerPos, body.position);
                const bodyType = id.startsWith('planet_') ? 'planet' : 'moon';
                const dockingRange = bodyType === 'planet' ? 4.0 : 1.5;
                const withinRange = distance <= dockingRange;
                
                console.log(`  📍 ${bodyType} "${body.name || id}": ${distance.toFixed(3)}km ${withinRange ? '✅ IN RANGE' : '❌ out of range'} (range: ${dockingRange}km)`);
            }
        });
    }
    
    // Test if modal is visible
    console.log('👁️ Modal visible:', dm.isVisible);
    
    // Test cooldown status
    console.log('⏰ Cancelled targets:', dm.cancelledTargets);
    
    // Force a docking check
    console.log('🔍 Forcing docking check...');
    dm.checkDockingConditions();
    
    // Test if interval is running
    console.log('⏱️ Check interval active:', dm.checkInterval !== null);
    
    // Manual search for nearby dockable objects
    console.log('🔎 Manual search for nearby dockables...');
    const nearby = dm.findNearbyDockableObjects();
    console.log('🎯 Found nearby dockable objects:', nearby);
}

// Function to manually trigger modal show (for testing)
function forceShowDockingModal() {
    console.log('🚨 Force showing docking modal...');
    
    if (typeof window.starfieldManager === 'undefined' || !window.starfieldManager.dockingModal) {
        console.error('❌ DockingModal not available');
        return;
    }
    
    const dm = window.starfieldManager.dockingModal;
    
    // Create a fake target for testing
    const fakeTarget = {
        name: 'Test Planet',
        position: { x: 0, y: 0, z: 0 },
        type: 'planet'
    };
    
    const fakeTargetInfo = {
        type: 'Planet',
        diplomacy: 'Friendly',
        dockingRange: 4.0
    };
    
    const fakeDistance = 2.0;
    
    dm.show(fakeTarget, fakeTargetInfo, fakeDistance);
}

// Function to monitor docking checks in real-time
function startDockingMonitor() {
    console.log('🔬 Starting real-time docking monitor...');
    
    if (typeof window.starfieldManager === 'undefined' || !window.starfieldManager.dockingModal) {
        console.error('❌ DockingModal not available');
        return;
    }
    
    // Override the checkDockingConditions method to add extra logging
    const dm = window.starfieldManager.dockingModal;
    const originalCheck = dm.checkDockingConditions.bind(dm);
    
    let checkCount = 0;
    
    dm.checkDockingConditions = function() {
        checkCount++;
        if (checkCount % 50 === 0) { // Log every 5 seconds (50 * 100ms)
            console.log(`🔄 Docking check #${checkCount} - speed: ${this.starfieldManager.currentSpeed}, docked: ${this.starfieldManager.isDocked}, visible: ${this.isVisible}`);
        }
        
        return originalCheck();
    };
    
    console.log('✅ Docking monitor active - check count will be logged every 5 seconds');
}

// Expose functions to global scope for console access
window.testDockingModal = testDockingModal;
window.forceShowDockingModal = forceShowDockingModal;
window.startDockingMonitor = startDockingMonitor;

// Auto-run diagnostics when script loads
setTimeout(() => {
    testDockingModal();
    startDockingMonitor();
}, 2000); // Wait 2 seconds for everything to initialize

console.log('🔧 Docking debug script loaded. Use these functions in console:');
console.log('  - testDockingModal() - Run full diagnostics');
console.log('  - forceShowDockingModal() - Test modal display');
console.log('  - startDockingMonitor() - Monitor docking checks in real-time');

console.log('🧪 Loading docking debug test...');

// Wait for the game to load
setTimeout(() => {
    console.log('\n=== DOCKING DEBUG TEST ===');
    
    // Check if required managers exist
    const sm = window.starfieldManager;
    const dm = window.dockingModal;
    const dsm = sm?.dockingSystemManager;
    const ssm = sm?.solarSystemManager;
    
    if (!sm || !dm || !dsm || !ssm) {
        console.error('❌ Required managers not found');
        console.log('StarfieldManager:', !!sm);
        console.log('DockingModal:', !!dm);
        console.log('DockingSystemManager:', !!dsm);
        console.log('SolarSystemManager:', !!ssm);
        return;
    }
    
    console.log('✅ All managers found');
    
    // Test target information retrieval
    console.log('\n=== TARGET INFORMATION TEST ===');
    
    const bodies = ssm.getCelestialBodies();
    if (!bodies || bodies.size === 0) {
        console.error('❌ No celestial bodies found');
        return;
    }
    
    console.log(`📍 Found ${bodies.size} celestial bodies`);
    
    for (const body of bodies) {
        const info = ssm.getCelestialBodyInfo(body);
        const distance = sm.calculateDistance(sm.camera.position, body.position);
        
        console.log(`\n🎯 ${body.name || 'Unknown'}:`);
        console.log(`  - THREE.js name: "${body.name}"`);
        console.log(`  - Info available: ${!!info}`);
        if (info) {
            console.log(`  - Info name: "${info.name}"`);
            console.log(`  - Info type: "${info.type}"`);
            console.log(`  - Info diplomacy: "${info.diplomacy}"`);
        }
        console.log(`  - Distance: ${distance.toFixed(3)}km`);
        console.log(`  - Position:`, body.position);
        
        // Test validation
        console.log(`\n🔍 Testing validation for ${info?.name || 'Unknown'}:`);
        
        // Test DockingSystemManager validation
        const dsmValidation = dsm.validateDocking(null, body, sm);
        console.log(`  - DSM canDock: ${dsmValidation.canDock}`);
        console.log(`  - DSM reasons:`, dsmValidation.reasons);
        
        // Test StarfieldManager validation  
        const smValidation = sm.canDockWithLogging(body);
        console.log(`  - SM canDock: ${smValidation}`);
        
        // Test range calculation
        const expectedRange = info?.type === 'planet' ? 4.0 : 1.5;
        console.log(`  - Expected range: ${expectedRange}km`);
        console.log(`  - In range: ${distance <= expectedRange}`);
    }
    
    console.log('\n=== TARGET RESOLUTION TEST ===');
    
    // Test how DockingModal resolves targets
    if (dm.currentTarget) {
        console.log('📍 DockingModal.currentTarget exists');
        const target = dm.currentTarget;
        const info = ssm.getCelestialBodyInfo(target);
        
        console.log('Target object:', target);
        console.log('Target info:', info);
        console.log('Target name from THREE.js:', target.name);
        console.log('Target name from info:', info?.name);
    } else {
        console.log('📍 No DockingModal.currentTarget');
    }
    
    if (sm.currentTarget) {
        console.log('📍 StarfieldManager.currentTarget exists');
        const target = sm.currentTarget;
        const info = ssm.getCelestialBodyInfo(target);
        
        console.log('Target object:', target);
        console.log('Target info:', info);
        console.log('Target name from THREE.js:', target.name);
        console.log('Target name from info:', info?.name);
    } else {
        console.log('📍 No StarfieldManager.currentTarget');
    }
    
    console.log('\n=== TEST COMPLETE ===');
    
}, 3000);

console.log('✅ Docking debug test script loaded - waiting 3 seconds for game initialization...'); 