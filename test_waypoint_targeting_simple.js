/**
 * 🎯 SIMPLE WAYPOINT TARGETING TEST
 * 
 * Simple test script that works with the current waypoint system
 * Copy-paste this entire script into browser console
 */

console.log('🎯 Starting Simple Waypoint Targeting Test...');

// ========== SIMPLE TEST FUNCTIONS ==========

window.testWaypointTargetingSimple = function() {
    console.log('🎮 Simple Waypoint Targeting Test');
    
    // Step 1: Create a test waypoint
    if (!window.waypointManager) {
        console.error('❌ WaypointManager not available');
        return;
    }
    
    const waypointId = window.waypointManager.createWaypoint({
        name: 'Simple Test Waypoint',
        position: [-30, 0, 40],
        triggerRadius: 25.0,
        type: 'navigation',
        actions: [{
            type: 'show_message',
            parameters: {
                title: 'Simple Test',
                message: 'Simple waypoint targeting test successful!',
                audioFileId: 'discovery_chime'
            }
        }]
    });
    
    console.log(`✅ Test waypoint created: ${waypointId}`);
    
    // Step 2: Check if targeting system exists
    if (!window.targetComputerManager) {
        console.error('❌ TargetComputerManager not available');
        return;
    }
    
    console.log('✅ TargetComputerManager found');
    
    // Step 3: Try to add waypoint to targeting system
    const tcm = window.targetComputerManager;
    
    // Check what methods are available
    console.log('Available methods on TargetComputerManager:');
    const methods = Object.getOwnPropertyNames(tcm).filter(name => typeof tcm[name] === 'function');
    console.log(methods);
    
    // Try to get the waypoint
    const waypoint = window.waypointManager.getWaypoint(waypointId);
    console.log('Created waypoint object:', waypoint);
    
    // Step 4: Manual waypoint targeting test
    console.log('🎯 Testing manual waypoint targeting...');
    
    // Create a waypoint target object manually
    const waypointTarget = {
        id: waypoint.id,
        name: waypoint.name,
        type: 'waypoint',
        isWaypoint: true,
        position: {
            x: waypoint.position[0],
            y: waypoint.position[1], 
            z: waypoint.position[2]
        },
        waypointData: waypoint,
        faction: 'waypoint',
        diplomacy: 'waypoint',
        distance: 0
    };
    
    // Calculate distance if camera is available
    if (tcm.camera) {
        const dx = waypointTarget.position.x - tcm.camera.position.x;
        const dy = waypointTarget.position.y - tcm.camera.position.y;
        const dz = waypointTarget.position.z - tcm.camera.position.z;
        waypointTarget.distance = Math.sqrt(dx*dx + dy*dy + dz*dz);
        console.log(`📏 Distance to waypoint: ${waypointTarget.distance.toFixed(2)} units`);
    }
    
    console.log('Waypoint target object:', waypointTarget);
    
    // Step 5: Try to add to target objects
    if (tcm.targetObjects) {
        tcm.targetObjects.push(waypointTarget);
        console.log(`✅ Added waypoint to target objects (total: ${tcm.targetObjects.length})`);
        
        // Try to set as current target
        tcm.currentTarget = waypointTarget;
        tcm.targetIndex = tcm.targetObjects.length - 1;
        
        console.log(`🎯 Set waypoint as current target: ${tcm.currentTarget.name}`);
        
        // Apply waypoint colors if HUD exists
        if (tcm.targetHUD) {
            tcm.targetHUD.style.borderColor = '#ff00ff';
            tcm.targetHUD.style.color = '#ff00ff';
            tcm.targetHUD.style.backgroundColor = '#33003388';
            tcm.targetHUD.style.boxShadow = '0 0 15px #ff00ff88';
            console.log('✅ Applied waypoint colors to HUD');
        }
        
        // Update target name display
        if (tcm.targetNameDisplay) {
            tcm.targetNameDisplay.innerHTML = `<span style="color: #ff00ff">📍</span> ${waypointTarget.name}`;
            tcm.targetNameDisplay.style.color = '#ffffff';
            console.log('✅ Updated target name display');
        }
        
        // Update target info display
        if (tcm.targetInfoDisplay) {
            tcm.targetInfoDisplay.innerHTML = `
                <div style="color: #ff66ff">Type: NAVIGATION</div>
                <div style="color: #ffffff">Mission Waypoint</div>
            `;
            console.log('✅ Updated target info display');
        }
        
        // Update target reticle
        if (tcm.targetReticle) {
            tcm.targetReticle.style.borderColor = '#ff00ff';
            tcm.targetReticle.style.backgroundColor = '#ff00ff88';
            tcm.targetReticle.style.boxShadow = '0 0 20px #ff00ff';
            console.log('✅ Updated target reticle');
        }
        
    } else {
        console.warn('⚠️ targetObjects not available on TargetComputerManager');
    }
    
    return waypointId;
};

window.testWaypointCycling = function() {
    console.log('🔄 Testing waypoint cycling...');
    
    if (!window.targetComputerManager) {
        console.error('❌ TargetComputerManager not available');
        return;
    }
    
    const tcm = window.targetComputerManager;
    
    // Enable target computer if method exists
    if (tcm.enableTargetComputer) {
        tcm.enableTargetComputer();
        console.log('✅ Target computer enabled');
    }
    
    // Check current targets
    console.log(`Current target objects: ${tcm.targetObjects?.length || 0}`);
    console.log(`Current target: ${tcm.currentTarget?.name || 'none'}`);
    
    // Try cycling
    if (tcm.cycleTarget) {
        console.log('🔄 Cycling targets...');
        tcm.cycleTarget(true);
        console.log(`New target: ${tcm.currentTarget?.name || 'none'}`);
        
        if (tcm.currentTarget && tcm.currentTarget.isWaypoint) {
            console.log('🎯 Successfully cycled to waypoint!');
        }
    } else {
        console.warn('⚠️ cycleTarget method not available');
    }
};

window.debugTargetingSystem = function() {
    console.log('🔍 Debugging targeting system...');
    
    if (window.targetComputerManager) {
        const tcm = window.targetComputerManager;
        
        console.log('TargetComputerManager properties:');
        console.log('- targetComputerEnabled:', tcm.targetComputerEnabled);
        console.log('- currentTarget:', tcm.currentTarget);
        console.log('- targetIndex:', tcm.targetIndex);
        console.log('- targetObjects length:', tcm.targetObjects?.length);
        console.log('- targetHUD exists:', !!tcm.targetHUD);
        console.log('- targetNameDisplay exists:', !!tcm.targetNameDisplay);
        console.log('- targetInfoDisplay exists:', !!tcm.targetInfoDisplay);
        console.log('- targetReticle exists:', !!tcm.targetReticle);
        
        if (tcm.targetObjects && tcm.targetObjects.length > 0) {
            console.log('Target objects:');
            tcm.targetObjects.forEach((target, index) => {
                console.log(`  ${index}: ${target.name} (${target.type}) - ${target.isWaypoint ? 'WAYPOINT' : 'REGULAR'}`);
            });
        }
    }
    
    if (window.waypointManager) {
        const activeWaypoints = window.waypointManager.getActiveWaypoints();
        console.log(`Active waypoints: ${activeWaypoints.length}`);
        activeWaypoints.forEach(wp => {
            console.log(`  - ${wp.name} (${wp.id}) - Status: ${wp.status}`);
        });
    }
};

window.cleanupWaypointTest = function() {
    console.log('🧹 Cleaning up waypoint test...');
    
    if (window.waypointManager) {
        const activeWaypoints = window.waypointManager.getActiveWaypoints();
        
        for (const waypoint of activeWaypoints) {
            if (waypoint.name.includes('Test')) {
                window.waypointManager.deleteWaypoint(waypoint.id);
                console.log(`🗑️ Deleted test waypoint: ${waypoint.name}`);
            }
        }
    }
    
    if (window.targetComputerManager) {
        const tcm = window.targetComputerManager;
        
        // Remove waypoint targets
        if (tcm.targetObjects) {
            const originalLength = tcm.targetObjects.length;
            tcm.targetObjects = tcm.targetObjects.filter(t => !t.isWaypoint);
            console.log(`🗑️ Removed ${originalLength - tcm.targetObjects.length} waypoint targets`);
        }
        
        // Clear current target if it's a waypoint
        if (tcm.currentTarget && tcm.currentTarget.isWaypoint) {
            tcm.currentTarget = null;
            tcm.targetIndex = -1;
            console.log('🗑️ Cleared waypoint target');
        }
    }
};

// ========== AUTO-RUN TEST ==========

setTimeout(() => {
    console.log('🚀 Auto-running simple waypoint targeting test...');
    
    // Debug first
    debugTargetingSystem();
    
    // Run the test
    const waypointId = testWaypointTargetingSimple();
    
    if (waypointId) {
        setTimeout(() => {
            testWaypointCycling();
        }, 1000);
    }
}, 1000);

console.log('🎯 Simple Waypoint Targeting Test Script Loaded');
console.log('🎮 Available functions:');
console.log('  testWaypointTargetingSimple() - Create and target a waypoint');
console.log('  testWaypointCycling() - Test cycling through targets');
console.log('  debugTargetingSystem() - Debug targeting system state');
console.log('  cleanupWaypointTest() - Clean up test waypoints');
