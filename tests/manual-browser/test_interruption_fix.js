/**
 * 🔧 Interruption Fix Test
 * Quick test to verify the waypoint interruption detection fix
 */

(function() {
    'use strict';
    
    console.log('🔧 Testing Waypoint Interruption Fix...\n');
    
    async function testInterruptionFix() {
        if (!window.targetComputerManager || !window.waypointManager) {
            console.log('❌ Required systems not available');
            return;
        }
        
        try {
            // Create a test waypoint
            const testWaypoint = {
                id: 'interruption_fix_test',
                name: 'Interruption Fix Test',
                type: 'navigation',
                position: [1000, 0, 1000],
                status: 'active'
            };
            
            console.log('1. Creating test waypoint...');
            await window.waypointManager.createWaypoint(testWaypoint);
            console.log('✅ Waypoint created');
            
            console.log('2. Targeting waypoint...');
            const targetResult = window.targetComputerManager.setVirtualTarget(testWaypoint);
            console.log('✅ Waypoint targeted:', targetResult);
            
            console.log('3. Current target:', window.targetComputerManager.currentTarget?.id);
            console.log('4. Is virtual target:', window.targetComputerManager.currentTarget?.isVirtual);
            
            console.log('5. Interrupting with enemy target...');
            window.targetComputerManager.setTarget({ id: 'test_enemy', type: 'ship' });
            
            console.log('6. Checking interruption state...');
            const hasInterrupted = window.targetComputerManager.hasInterruptedWaypoint();
            console.log('✅ Has interrupted waypoint:', hasInterrupted);
            
            if (hasInterrupted) {
                const interruptedWaypoint = window.targetComputerManager.getInterruptedWaypoint();
                console.log('✅ Interrupted waypoint:', interruptedWaypoint?.id);
                
                console.log('7. Testing resumption...');
                const resumed = window.targetComputerManager.resumeInterruptedWaypoint();
                console.log('✅ Resumption result:', resumed);
                
                const stillInterrupted = window.targetComputerManager.hasInterruptedWaypoint();
                console.log('✅ Interruption cleared:', !stillInterrupted);
            } else {
                console.log('❌ Interruption not detected - checking why...');
                console.log('   - interruptedWaypoint:', window.targetComputerManager.interruptedWaypoint);
                console.log('   - waypointInterruptionTime:', window.targetComputerManager.waypointInterruptionTime);
            }
            
            // Cleanup
            await window.waypointManager.deleteWaypoint('interruption_fix_test');
            console.log('✅ Cleanup completed');
            
        } catch (error) {
            console.log('❌ Test failed:', error.message);
        }
    }
    
    // Run the test
    testInterruptionFix().then(() => {
        console.log('\n🔧 Interruption Fix Test Complete!');
        console.log('Now run the full Phase 3 test to verify 90%+ success rate.');
    });
    
})();
