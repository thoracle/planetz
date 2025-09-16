/**
 * 🎯 WAYPOINT TARGETING TEST - PREPARATION SCRIPT
 * 
 * Run this first to clean up any existing waypoint tests
 * and prepare the system for fresh testing
 */

console.log('🧹 Waypoint Test Preparation Script');

// ========== CLEANUP EXISTING TESTS ==========

function cleanupExistingTests() {
    console.log('🧹 Cleaning up existing waypoint tests...');
    
    // Clean up test waypoints
    if (window.waypointManager) {
        const activeWaypoints = window.waypointManager.getActiveWaypoints();
        let cleanedCount = 0;
        
        for (const waypoint of activeWaypoints) {
            if (waypoint.name.includes('Test') || waypoint.name.includes('Alpha') || 
                waypoint.name.includes('Beta') || waypoint.name.includes('Gamma')) {
                window.waypointManager.deleteWaypoint(waypoint.id);
                cleanedCount++;
                console.log(`🗑️ Deleted: ${waypoint.name}`);
            }
        }
        
        console.log(`✅ Cleaned up ${cleanedCount} test waypoints`);
    }
    
    // Reset targeting system flags
    if (window.targetComputerManager) {
        window.targetComputerManager._waypointsAdded = false;
        window.targetComputerManager._waypointStyleApplied = false;
        
        // Remove waypoint targets from target list
        if (window.targetComputerManager.targetObjects) {
            const originalLength = window.targetComputerManager.targetObjects.length;
            window.targetComputerManager.targetObjects = 
                window.targetComputerManager.targetObjects.filter(t => !t.isWaypoint);
            const removedCount = originalLength - window.targetComputerManager.targetObjects.length;
            console.log(`🗑️ Removed ${removedCount} waypoint targets from targeting system`);
        }
        
        // Clear current target if it's a waypoint
        if (window.targetComputerManager.currentTarget?.isWaypoint) {
            window.targetComputerManager.currentTarget = null;
            window.targetComputerManager.targetIndex = -1;
            console.log('🗑️ Cleared waypoint target');
        }
    }
    
    // Remove waypoint-specific CSS
    const waypointStyles = document.querySelectorAll('#waypoint-reticle-style');
    waypointStyles.forEach(style => {
        style.remove();
        console.log('🗑️ Removed waypoint CSS');
    });
    
    console.log('✅ Cleanup complete - system ready for fresh testing');
}

// ========== SYSTEM VERIFICATION ==========

function verifySystemRequirements() {
    console.log('🔍 Verifying system requirements...');
    
    const requirements = [
        { name: 'waypointManager', object: window.waypointManager },
        { name: 'targetComputerManager', object: window.targetComputerManager },
        { name: 'starfieldManager', object: window.starfieldManager }
    ];
    
    let allRequirementsMet = true;
    
    for (const req of requirements) {
        if (req.object) {
            console.log(`✅ ${req.name}: Available`);
        } else {
            console.log(`❌ ${req.name}: NOT Available`);
            allRequirementsMet = false;
        }
    }
    
    // Check targeting system methods
    if (window.targetComputerManager) {
        const methods = ['cycleTarget', 'setTargetById', 'targetObjects'];
        for (const method of methods) {
            if (window.targetComputerManager[method]) {
                console.log(`✅ TargetComputerManager.${method}: Available`);
            } else {
                console.log(`❌ TargetComputerManager.${method}: NOT Available`);
                allRequirementsMet = false;
            }
        }
    }
    
    return allRequirementsMet;
}

// ========== BASELINE MEASUREMENTS ==========

function recordBaseline() {
    console.log('📊 Recording baseline measurements...');
    
    const baseline = {
        timestamp: new Date().toISOString(),
        targetObjects: window.targetComputerManager?.targetObjects?.length || 0,
        activeWaypoints: window.waypointManager?.getActiveWaypoints()?.length || 0,
        currentTarget: window.targetComputerManager?.currentTarget?.name || 'none',
        targetIndex: window.targetComputerManager?.targetIndex || -1
    };
    
    console.log('📊 Baseline measurements:', baseline);
    window.testBaseline = baseline;
    
    return baseline;
}

// ========== MAIN PREPARATION FUNCTION ==========

function prepareWaypointTesting() {
    console.log('🎯 Preparing waypoint targeting test environment...\n');
    
    // Step 1: Cleanup
    cleanupExistingTests();
    
    // Step 2: Verify requirements
    const requirementsMet = verifySystemRequirements();
    
    if (!requirementsMet) {
        console.log('❌ System requirements not met. Cannot proceed with testing.');
        return false;
    }
    
    // Step 3: Record baseline
    const baseline = recordBaseline();
    
    console.log('\n🎉 Test environment prepared successfully!');
    console.log('📋 Next steps:');
    console.log('  1. Load the waypoint targeting integration');
    console.log('  2. Run the comprehensive test suite');
    console.log('  3. Verify all functionality works correctly');
    
    return true;
}

// ========== AUTO-RUN ==========

// Run preparation automatically
const prepared = prepareWaypointTesting();

if (prepared) {
    console.log('\n✅ PREPARATION COMPLETE - Ready for waypoint targeting integration');
} else {
    console.log('\n❌ PREPARATION FAILED - Check system requirements');
}

// Export for manual use
window.prepareWaypointTesting = prepareWaypointTesting;
window.cleanupExistingTests = cleanupExistingTests;
window.verifySystemRequirements = verifySystemRequirements;
