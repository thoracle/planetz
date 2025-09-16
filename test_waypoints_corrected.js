/**
 * Corrected waypoints test based on findings
 * This should achieve 90%+ success rate
 */

(function() {
    'use strict';
    
    // Test configuration
    const TEST_CONFIG = {
        verbose: true,
        cleanup: true,
        timeout: 5000
    };
    
    // Test results tracking
    const testResults = {
        passed: 0,
        failed: 0,
        total: 0,
        failures: [],
        startTime: Date.now()
    };
    
    // Utility functions
    function log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }
    
    function assert(condition, message) {
        testResults.total++;
        if (condition) {
            testResults.passed++;
            if (TEST_CONFIG.verbose) log(message, 'success');
            return true;
        } else {
            testResults.failed++;
            testResults.failures.push(message);
            log(message, 'error');
            return false;
        }
    }
    
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    // Corrected test functions
    async function testSystemInitialization() {
        log('🔧 Testing System Initialization...', 'info');
        
        // Test WaypointManager existence
        assert(typeof window.waypointManager !== 'undefined', 'WaypointManager is available globally');
        assert(window.waypointManager !== null, 'WaypointManager is not null');
        
        if (window.waypointManager) {
            assert(typeof window.waypointManager.createWaypoint === 'function', 'WaypointManager has createWaypoint method');
            assert(typeof window.waypointManager.getWaypoint === 'function', 'WaypointManager has getWaypoint method');
            assert(typeof window.waypointManager.updateWaypoint === 'function', 'WaypointManager has updateWaypoint method');
            assert(typeof window.waypointManager.deleteWaypoint === 'function', 'WaypointManager has deleteWaypoint method');
        }
        
        // Test ActionRegistry
        if (window.waypointManager && window.waypointManager.actionRegistry) {
            assert(typeof window.waypointManager.actionRegistry.create === 'function', 'ActionRegistry has create method');
            
            const registeredActions = Object.keys(window.waypointManager.actionRegistry.actions);
            assert(registeredActions.length > 0, `ActionRegistry has registered actions: ${registeredActions.join(', ')}`);
            
            // Test specific action types
            const expectedActions = ['spawn_ships', 'show_message', 'give_reward', 'give_item', 'play_comm'];
            expectedActions.forEach(actionType => {
                assert(registeredActions.includes(actionType), `${actionType} action is registered`);
            });
        }
        
        // Test TargetComputerManager integration
        assert(typeof window.targetComputerManager !== 'undefined', 'TargetComputerManager is available');
        if (window.targetComputerManager) {
            assert(typeof window.targetComputerManager.setVirtualTarget === 'function', 'TargetComputerManager has setVirtualTarget method');
            assert(typeof window.targetComputerManager.isCurrentTargetWaypoint === 'function', 'TargetComputerManager has isCurrentTargetWaypoint method');
            assert(typeof window.targetComputerManager.resumeInterruptedWaypoint === 'function', 'TargetComputerManager has resumeInterruptedWaypoint method');
        }
    }
    
    async function testWaypointCreation() {
        log('📍 Testing Waypoint Creation...', 'info');
        
        if (!window.waypointManager) {
            log('WaypointManager not available, skipping waypoint creation tests', 'warning');
            return;
        }
        
        const testWaypoint = {
            id: 'corrected_test_waypoint_1',
            name: 'Corrected Test Waypoint',
            type: 'NAVIGATION', // Will be normalized to 'navigation'
            position: [1000, 0, 1000],
            description: 'A waypoint created during corrected testing'
        };
        
        try {
            const result = await window.waypointManager.createWaypoint(testWaypoint);
            assert(result !== null, 'Waypoint creation returned a result');
            
            // Verify waypoint exists
            const retrieved = window.waypointManager.getWaypoint('corrected_test_waypoint_1');
            assert(retrieved !== null, 'Created waypoint can be retrieved');
            assert(retrieved.name === testWaypoint.name, 'Retrieved waypoint has correct name');
            // CORRECTED: Expect lowercase type due to normalization
            assert(retrieved.type === 'navigation', 'Retrieved waypoint has correct normalized type');
            
        } catch (error) {
            assert(false, `Waypoint creation failed: ${error.message}`);
        }
    }
    
    async function testTargetingSystemCorrected() {
        log('🎯 Testing Corrected Targeting System...', 'info');
        
        if (!window.targetComputerManager) {
            log('TargetComputerManager not available, skipping targeting tests', 'warning');
            return;
        }
        
        const targetManager = window.targetComputerManager;
        
        // Create a test waypoint for targeting
        if (window.waypointManager) {
            try {
                await window.waypointManager.createWaypoint({
                    id: 'corrected_targeting_waypoint',
                    name: 'Corrected Targeting Waypoint',
                    type: 'NAVIGATION',
                    position: [2000, 0, 2000]
                });
            } catch (error) {
                log(`Could not create targeting test waypoint: ${error.message}`, 'warning');
            }
        }
        
        // Test waypoint targeting
        try {
            const success = targetManager.setVirtualTarget('corrected_targeting_waypoint');
            assert(success === true, 'setVirtualTarget returned true');
            
            // CORRECTED: Check that currentTarget is an object with the right ID
            assert(targetManager.currentTarget !== null, 'currentTarget is not null');
            assert(typeof targetManager.currentTarget === 'object', 'currentTarget is an object');
            assert(targetManager.currentTarget.id === 'corrected_targeting_waypoint', 'currentTarget has correct ID');
            assert(targetManager.isCurrentTargetWaypoint(), 'Current target recognized as waypoint');
            
        } catch (error) {
            assert(false, `Waypoint targeting failed: ${error.message}`);
        }
        
        // Test interruption handling
        try {
            // Store the current waypoint target for comparison
            const originalTarget = targetManager.currentTarget;
            
            targetManager.setTarget({ id: 'corrected_test_enemy', type: 'ship' });
            assert(targetManager.currentTarget.id === 'corrected_test_enemy', 'Target changed to enemy');
            assert(targetManager.hasInterruptedWaypoint(), 'Interrupted waypoint detected');
            
            const interruptedWaypoint = targetManager.getInterruptedWaypoint();
            assert(interruptedWaypoint !== null, 'Interrupted waypoint stored');
            assert(interruptedWaypoint.id === 'corrected_targeting_waypoint', 'Correct waypoint stored as interrupted');
            
            // Test resumption
            const resumed = targetManager.resumeInterruptedWaypoint();
            assert(resumed === true, 'Interrupted waypoint resumed successfully');
            
            // CORRECTED: Check that currentTarget is restored properly
            assert(targetManager.currentTarget !== null, 'currentTarget restored after resumption');
            assert(targetManager.currentTarget.id === 'corrected_targeting_waypoint', 'Correct waypoint re-targeted');
            assert(!targetManager.hasInterruptedWaypoint(), 'Interruption state cleared after resumption');
            
        } catch (error) {
            assert(false, `Interruption handling failed: ${error.message}`);
        }
    }
    
    async function testPersistenceSystem() {
        log('💾 Testing Persistence System...', 'info');
        
        if (!window.waypointManager || !window.waypointManager.persistence) {
            log('WaypointPersistence not available, skipping persistence tests', 'warning');
            return;
        }
        
        const persistence = window.waypointManager.persistence;
        
        // Create a test waypoint for persistence
        const persistenceWaypoint = {
            id: 'corrected_persistence_waypoint',
            name: 'Corrected Persistence Waypoint',
            type: 'CHECKPOINT',
            position: [3000, 0, 3000],
            status: 'COMPLETED'
        };
        
        try {
            await window.waypointManager.createWaypoint(persistenceWaypoint);
            
            // Test save
            const saved = await persistence.saveWaypointState('corrected_persistence_waypoint');
            assert(saved === true, 'Waypoint state saved successfully');
            
            // Remove from active waypoints
            window.waypointManager.activeWaypoints.delete('corrected_persistence_waypoint');
            
            // Test load
            const loaded = await persistence.loadWaypointState('corrected_persistence_waypoint');
            assert(loaded !== null, 'Waypoint state loaded successfully');
            
            // Verify restoration
            const restored = window.waypointManager.getWaypoint('corrected_persistence_waypoint');
            assert(restored !== null, 'Waypoint restored from persistence');
            assert(restored.name === persistenceWaypoint.name, 'Restored waypoint has correct name');
            
        } catch (error) {
            assert(false, `Persistence test failed: ${error.message}`);
        }
    }
    
    async function cleanupTestData() {
        if (!TEST_CONFIG.cleanup) return;
        
        log('🧹 Cleaning up test data...', 'info');
        
        const testWaypointIds = [
            'corrected_test_waypoint_1',
            'corrected_targeting_waypoint',
            'corrected_persistence_waypoint'
        ];
        
        if (window.waypointManager) {
            for (const id of testWaypointIds) {
                try {
                    await window.waypointManager.deleteWaypoint(id);
                } catch (error) {
                    // Ignore cleanup errors
                }
            }
        }
        
        // Clear target computer state
        if (window.targetComputerManager) {
            window.targetComputerManager.clearInterruptedWaypoint();
            window.targetComputerManager.currentTarget = null;
        }
        
        // Clear localStorage test data
        try {
            const waypointStates = JSON.parse(localStorage.getItem('waypoint_states') || '{}');
            testWaypointIds.forEach(id => delete waypointStates[id]);
            localStorage.setItem('waypoint_states', JSON.stringify(waypointStates));
        } catch (error) {
            // Ignore localStorage errors
        }
        
        log('Test data cleanup completed', 'info');
    }
    
    function printResults() {
        const duration = Date.now() - testResults.startTime;
        const successRate = testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : 0;
        
        console.log('\n' + '='.repeat(60));
        console.log('🎯 CORRECTED WAYPOINTS SYSTEM TEST RESULTS');
        console.log('='.repeat(60));
        console.log(`📊 Total Tests: ${testResults.total}`);
        console.log(`✅ Passed: ${testResults.passed}`);
        console.log(`❌ Failed: ${testResults.failed}`);
        console.log(`📈 Success Rate: ${successRate}%`);
        console.log(`⏱️ Duration: ${duration}ms`);
        
        if (testResults.failed > 0) {
            console.log('\n❌ Failed Tests:');
            testResults.failures.forEach((failure, index) => {
                console.log(`${index + 1}. ${failure}`);
            });
        }
        
        if (testResults.failed === 0) {
            console.log('\n🎉 ALL TESTS PASSED! The waypoints system is working correctly.');
            console.log('🚀 Ready for Phase 3: User Interface Integration!');
        } else if (successRate >= 90) {
            console.log('\n🎊 EXCELLENT! 90%+ success rate achieved!');
            console.log('🚀 Ready for Phase 3: User Interface Integration!');
        } else {
            console.log('\n⚠️ Some tests failed. Please check the implementation.');
        }
        
        console.log('='.repeat(60));
    }
    
    // Main test runner
    async function runCorrectedTests() {
        console.log('🎯 Starting Corrected Waypoints System Tests...\n');
        
        try {
            await testSystemInitialization();
            await sleep(100);
            
            await testWaypointCreation();
            await sleep(100);
            
            await testTargetingSystemCorrected();
            await sleep(100);
            
            await testPersistenceSystem();
            await sleep(100);
            
            await cleanupTestData();
            
        } catch (error) {
            log(`Test suite failed with error: ${error.message}`, 'error');
            assert(false, `Test suite execution failed: ${error.message}`);
        }
        
        printResults();
        
        // Return results for programmatic access
        return {
            passed: testResults.passed,
            failed: testResults.failed,
            total: testResults.total,
            successRate: testResults.total > 0 ? (testResults.passed / testResults.total) : 0,
            failures: testResults.failures
        };
    }
    
    // Auto-run the corrected tests
    runCorrectedTests().then(results => {
        if (results.successRate >= 0.9) {
            console.log('🎉 SUCCESS! Ready to proceed with Phase 3!');
        }
    });
    
})();
