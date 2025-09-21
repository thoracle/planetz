/**
 * Test script to manually complete the Beta waypoint and check target clearing
 */

async function testBetaWaypointCompletion() {
    console.log('🧪 TESTING BETA WAYPOINT COMPLETION');
    
    if (!window.waypointManager) {
        console.log('❌ WaypointManager not available');
        return;
    }
    
    if (!window.targetComputerManager) {
        console.log('❌ TargetComputerManager not available');
        return;
    }
    
    // Find Beta waypoint
    const activeWaypoints = Array.from(window.waypointManager.activeWaypoints.values());
    const betaWaypoint = activeWaypoints.find(wp => wp.name.includes('Beta'));
    
    if (!betaWaypoint) {
        console.log('❌ Beta waypoint not found');
        console.log('Available waypoints:', activeWaypoints.map(wp => wp.name));
        return;
    }
    
    console.log('✅ Found Beta waypoint:', {
        id: betaWaypoint.id,
        name: betaWaypoint.name,
        status: betaWaypoint.status,
        missionId: betaWaypoint.missionId,
        position: betaWaypoint.position,
        triggerRadius: betaWaypoint.triggerRadius
    });
    
    // Check current target before completion
    const currentTarget = window.targetComputerManager.currentTarget;
    console.log('🎯 Current target before completion:', currentTarget ? {
        id: currentTarget.id,
        name: currentTarget.name,
        type: currentTarget.type
    } : 'None');
    
    // Check if Beta is currently targeted
    const isBetaTargeted = currentTarget && currentTarget.id === betaWaypoint.id;
    console.log(`🎯 Is Beta waypoint currently targeted: ${isBetaTargeted ? '✅ YES' : '❌ NO'}`);
    
    // Manually trigger the waypoint completion
    console.log('🚀 Manually triggering Beta waypoint completion...');
    
    try {
        // Call triggerWaypoint directly
        await window.waypointManager.triggerWaypoint(betaWaypoint.id);
        console.log('✅ triggerWaypoint completed');
        
        // Check target after completion
        const newTarget = window.targetComputerManager.currentTarget;
        console.log('🎯 Current target after completion:', newTarget ? {
            id: newTarget.id,
            name: newTarget.name,
            type: newTarget.type
        } : 'None (CLEARED ✅)');
        
        // Check waypoint status after completion
        const updatedBetaWaypoint = window.waypointManager.activeWaypoints.get(betaWaypoint.id);
        console.log('📍 Beta waypoint status after completion:', updatedBetaWaypoint ? updatedBetaWaypoint.status : 'DELETED');
        
        // Check if there are any remaining waypoints for the mission
        const remainingWaypoints = activeWaypoints.filter(wp => 
            wp.missionId === betaWaypoint.missionId && 
            wp.status === 'pending'
        );
        console.log(`📋 Remaining pending waypoints for mission: ${remainingWaypoints.length}`);
        
        if (remainingWaypoints.length === 0) {
            console.log('🏁 Mission should be complete - target should be cleared');
        } else {
            console.log('🔄 Mission continues - next waypoint should be activated');
            remainingWaypoints.forEach(wp => {
                console.log(`  - ${wp.name}: ${wp.status}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error during waypoint completion:', error);
    }
}

// Export function for console use
window.testBetaWaypointCompletion = testBetaWaypointCompletion;

console.log('🔧 Test function loaded: testBetaWaypointCompletion()');
