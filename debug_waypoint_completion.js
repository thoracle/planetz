/**
 * Debug script to test waypoint completion and target clearing
 */

function debugProximityDetection() {
    console.log('🔍 DEBUGGING PROXIMITY DETECTION');
    
    if (!window.waypointManager) {
        console.log('❌ WaypointManager not available');
        return;
    }
    
    // Check proximity checking status
    console.log('📡 Proximity checking interval:', window.waypointManager.triggerCheckInterval);
    console.log('📡 Last trigger check:', window.waypointManager.lastTriggerCheck);
    
    // Get player position
    const playerPosition = window.waypointManager.getPlayerPosition();
    console.log('🚀 Player position:', playerPosition);
    
    if (!playerPosition) {
        console.log('❌ No player position available - this will prevent proximity detection!');
        return;
    }
    
    // Check all waypoints and their distances
    const activeWaypoints = Array.from(window.waypointManager.activeWaypoints.values());
    console.log(`📍 Checking distances for ${activeWaypoints.length} waypoints:`);
    
    activeWaypoints.forEach((waypoint, i) => {
        const distance = window.waypointManager.calculateDistance(playerPosition, waypoint.position);
        const withinTrigger = distance <= waypoint.triggerRadius;
        
        console.log(`  ${i + 1}. ${waypoint.name}:`);
        console.log(`     Status: ${waypoint.status}`);
        console.log(`     Position: [${waypoint.position.join(', ')}]`);
        console.log(`     Distance: ${distance.toFixed(2)} units`);
        console.log(`     Trigger radius: ${waypoint.triggerRadius}`);
        console.log(`     Within trigger: ${withinTrigger ? '✅ YES' : '❌ NO'}`);
        
        if (withinTrigger && (waypoint.status === 'active' || waypoint.status === 'targeted')) {
            console.log(`     🎯 Should trigger waypoint: ${waypoint.name}`);
        }
    });
    
    // Manual trigger check
    console.log('🧪 Running manual proximity check...');
    window.waypointManager.checkWaypointTriggers();
    console.log('✅ Manual proximity check completed');
}

function debugWaypointCompletion() {
    console.log('🔍 DEBUGGING WAYPOINT COMPLETION AND TARGET CLEARING');
    
    // Check if waypoint manager exists
    if (!window.waypointManager) {
        console.log('❌ WaypointManager not available');
        return;
    }
    
    // Check if target computer manager exists
    if (!window.targetComputerManager) {
        console.log('❌ TargetComputerManager not available');
        return;
    }
    
    console.log('✅ Both managers available');
    
    // Get current waypoints
    const activeWaypoints = Array.from(window.waypointManager.activeWaypoints.values());
    console.log(`📍 Active waypoints: ${activeWaypoints.length}`);
    
    activeWaypoints.forEach((wp, i) => {
        console.log(`  ${i + 1}. ${wp.name}: status=${wp.status}, id=${wp.id}`);
    });
    
    // Check current target
    const currentTarget = window.targetComputerManager.currentTarget;
    console.log(`🎯 Current target:`, currentTarget ? {
        id: currentTarget.id,
        name: currentTarget.name,
        type: currentTarget.type
    } : 'None');
    
    // Find Beta waypoint
    const betaWaypoint = activeWaypoints.find(wp => wp.name.includes('Beta'));
    if (betaWaypoint) {
        console.log(`🔍 Found Beta waypoint:`, {
            id: betaWaypoint.id,
            name: betaWaypoint.name,
            status: betaWaypoint.status,
            missionId: betaWaypoint.missionId
        });
        
        // Test manual completion
        console.log('🧪 Testing manual waypoint completion...');
        
        // Simulate waypoint completion
        window.waypointManager.onWaypointCompleted(betaWaypoint).then(() => {
            console.log('✅ Manual completion test finished');
            
            // Check if target was cleared
            const newTarget = window.targetComputerManager.currentTarget;
            console.log(`🎯 Target after completion:`, newTarget ? {
                id: newTarget.id,
                name: newTarget.name,
                type: newTarget.type
            } : 'None (CLEARED ✅)');
            
        }).catch(error => {
            console.error('❌ Manual completion test failed:', error);
        });
        
    } else {
        console.log('❌ Beta waypoint not found');
    }
}

function debugTargetClearing() {
    console.log('🔍 DEBUGGING TARGET CLEARING LOGIC');
    
    if (!window.targetComputerManager) {
        console.log('❌ TargetComputerManager not available');
        return;
    }
    
    const currentTarget = window.targetComputerManager.currentTarget;
    console.log(`🎯 Current target before clearing:`, currentTarget ? {
        id: currentTarget.id,
        name: currentTarget.name,
        type: currentTarget.type
    } : 'None');
    
    // Test manual target clearing
    console.log('🧪 Testing manual target clearing...');
    window.targetComputerManager.clearCurrentTarget();
    
    const newTarget = window.targetComputerManager.currentTarget;
    console.log(`🎯 Target after manual clearing:`, newTarget ? {
        id: newTarget.id,
        name: newTarget.name,
        type: newTarget.type
    } : 'None (CLEARED ✅)');
}

function checkActivateNextWaypoint() {
    console.log('🔍 CHECKING ACTIVATE NEXT WAYPOINT LOGIC');
    
    if (!window.waypointManager) {
        console.log('❌ WaypointManager not available');
        return;
    }
    
    // Get active waypoints
    const activeWaypoints = Array.from(window.waypointManager.activeWaypoints.values());
    console.log(`📍 Total waypoints: ${activeWaypoints.length}`);
    
    // Group by mission
    const missionGroups = {};
    activeWaypoints.forEach(wp => {
        if (!missionGroups[wp.missionId]) {
            missionGroups[wp.missionId] = [];
        }
        missionGroups[wp.missionId].push(wp);
    });
    
    console.log('📋 Waypoints by mission:');
    Object.entries(missionGroups).forEach(([missionId, waypoints]) => {
        console.log(`  Mission ${missionId}:`);
        waypoints.forEach(wp => {
            console.log(`    - ${wp.name}: ${wp.status}`);
        });
        
        // Check if there are pending waypoints
        const pendingWaypoints = waypoints.filter(wp => wp.status === 'pending');
        console.log(`    Pending waypoints: ${pendingWaypoints.length}`);
        
        if (pendingWaypoints.length === 0) {
            console.log(`    🏁 Mission ${missionId} should be complete (no pending waypoints)`);
        }
    });
}

// Export functions for console use
window.debugProximityDetection = debugProximityDetection;
window.debugWaypointCompletion = debugWaypointCompletion;
window.debugTargetClearing = debugTargetClearing;
window.checkActivateNextWaypoint = checkActivateNextWaypoint;

console.log('🔧 Debug functions loaded:');
console.log('  - debugProximityDetection()');
console.log('  - debugWaypointCompletion()');
console.log('  - debugTargetClearing()');
console.log('  - checkActivateNextWaypoint()');
