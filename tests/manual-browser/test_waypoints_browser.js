/**
 * 🎯 Waypoints System Browser Test Suite
 * Run this script in the browser console when the game is loaded
 * to test the complete waypoints system functionality.
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
    
    // Test suite functions
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
            id: 'browser_test_waypoint_1',
            name: 'Browser Test Waypoint',
            type: 'NAVIGATION',
            position: [1000, 0, 1000],
            description: 'A waypoint created during browser testing',
            status: 'ACTIVE'
        };
        
        try {
            const result = await window.waypointManager.createWaypoint(testWaypoint);
            assert(result !== null, 'Waypoint creation returned a result');
            
            // Verify waypoint exists
            const retrieved = window.waypointManager.getWaypoint('browser_test_waypoint_1');
            assert(retrieved !== null, 'Created waypoint can be retrieved');
            assert(retrieved.name === testWaypoint.name, 'Retrieved waypoint has correct name');
            assert(retrieved.type === testWaypoint.type, 'Retrieved waypoint has correct type');
            
        } catch (error) {
            assert(false, `Waypoint creation failed: ${error.message}`);
        }
    }
    
    async function testActionSystem() {
        log('🎬 Testing Action System...', 'info');
        
        if (!window.waypointManager || !window.waypointManager.actionRegistry) {
            log('ActionRegistry not available, skipping action tests', 'warning');
            return;
        }
        
        const registry = window.waypointManager.actionRegistry;
        
        // Test SpawnShipsAction
        try {
            const spawnAction = registry.create('spawn_ships', {
                shipType: 'enemy_fighter',
                minCount: 2,
                maxCount: 4,
                formation: 'triangle',
                faction: 'hostile'
            });
            
            assert(spawnAction !== null, 'SpawnShipsAction created successfully');
            assert(typeof spawnAction.execute === 'function', 'SpawnShipsAction has execute method');
            
            // Test execution
            const spawnResult = await spawnAction.execute();
            assert(true, 'SpawnShipsAction executed without throwing errors');
            
        } catch (error) {
            assert(false, `SpawnShipsAction test failed: ${error.message}`);
        }
        
        // Test ShowMessageAction
        try {
            const messageAction = registry.create('show_message', {
                title: 'Browser Test Message',
                message: 'This message was created during browser testing',
                duration: 2000,
                audioFileId: 'test_audio',
                audioVolume: 0.5
            });
            
            assert(messageAction !== null, 'ShowMessageAction created successfully');
            
            const messageResult = await messageAction.execute();
            assert(true, 'ShowMessageAction executed without throwing errors');
            
        } catch (error) {
            assert(false, `ShowMessageAction test failed: ${error.message}`);
        }
        
        // Test GiveRewardAction
        try {
            const rewardAction = registry.create('give_reward', {
                rewardPackageId: 'browser_test_reward',
                bonusMultiplier: 1.5,
                message: 'Browser test reward awarded!'
            });
            
            assert(rewardAction !== null, 'GiveRewardAction created successfully');
            
            const rewardResult = await rewardAction.execute();
            assert(true, 'GiveRewardAction executed without throwing errors');
            
        } catch (error) {
            assert(false, `GiveRewardAction test failed: ${error.message}`);
        }
        
        // Test GiveItemAction
        try {
            const itemAction = registry.create('give_item', {
                itemId: 'test_item',
                quantity: 5,
                quality: 'rare',
                level: 10
            });
            
            assert(itemAction !== null, 'GiveItemAction created successfully');
            
            const itemResult = await itemAction.execute();
            assert(true, 'GiveItemAction executed without throwing errors');
            
        } catch (error) {
            assert(false, `GiveItemAction test failed: ${error.message}`);
        }
    }
    
    async function testTargetingSystem() {
        log('🎯 Testing Targeting System...', 'info');
        
        if (!window.targetComputerManager) {
            log('TargetComputerManager not available, skipping targeting tests', 'warning');
            return;
        }
        
        const targetManager = window.targetComputerManager;
        
        // Create a test waypoint for targeting
        if (window.waypointManager) {
            try {
                await window.waypointManager.createWaypoint({
                    id: 'browser_test_targeting_waypoint',
                    name: 'Targeting Test Waypoint',
                    type: 'NAVIGATION',
                    position: [2000, 0, 2000]
                });
            } catch (error) {
                log(`Could not create targeting test waypoint: ${error.message}`, 'warning');
            }
        }
        
        // Test waypoint targeting
        try {
            targetManager.setVirtualTarget('browser_test_targeting_waypoint');
            assert(targetManager.currentTarget === 'browser_test_targeting_waypoint', 'Waypoint targeted correctly');
            assert(targetManager.isCurrentTargetWaypoint(), 'Current target recognized as waypoint');
            
        } catch (error) {
            assert(false, `Waypoint targeting failed: ${error.message}`);
        }
        
        // Test interruption handling
        try {
            targetManager.setTarget('browser_test_enemy');
            assert(targetManager.currentTarget === 'browser_test_enemy', 'Target changed to enemy');
            assert(targetManager.hasInterruptedWaypoint(), 'Interrupted waypoint detected');
            assert(targetManager.getInterruptedWaypoint() === 'browser_test_targeting_waypoint', 'Correct waypoint stored as interrupted');
            
            // Test resumption
            const resumed = targetManager.resumeInterruptedWaypoint();
            assert(resumed === true, 'Interrupted waypoint resumed successfully');
            assert(targetManager.currentTarget === 'browser_test_targeting_waypoint', 'Waypoint re-targeted correctly');
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
            id: 'browser_test_persistence_waypoint',
            name: 'Persistence Test Waypoint',
            type: 'CHECKPOINT',
            position: [3000, 0, 3000],
            status: 'COMPLETED'
        };
        
        try {
            await window.waypointManager.createWaypoint(persistenceWaypoint);
            
            // Test save
            await persistence.saveWaypointState('browser_test_persistence_waypoint');
            assert(true, 'Waypoint state saved successfully');
            
            // Remove from active waypoints
            delete window.waypointManager.activeWaypoints['browser_test_persistence_waypoint'];
            
            // Test load
            await persistence.loadWaypointState('browser_test_persistence_waypoint');
            
            // Verify restoration
            const restored = window.waypointManager.getWaypoint('browser_test_persistence_waypoint');
            assert(restored !== null, 'Waypoint restored from persistence');
            assert(restored.name === persistenceWaypoint.name, 'Restored waypoint has correct name');
            assert(restored.status === persistenceWaypoint.status, 'Restored waypoint has correct status');
            
        } catch (error) {
            assert(false, `Persistence test failed: ${error.message}`);
        }
    }
    
    async function testComplexWorkflow() {
        log('🔗 Testing Complex Workflow...', 'info');
        
        if (!window.waypointManager) {
            log('WaypointManager not available, skipping workflow tests', 'warning');
            return;
        }
        
        // Create a complex waypoint with multiple actions
        const complexWaypoint = {
            id: 'browser_test_complex_waypoint',
            name: 'Complex Browser Test Waypoint',
            type: 'OBJECTIVE',
            position: [4000, 0, 4000],
            description: 'A complex waypoint for testing the complete workflow',
            triggers: [{
                type: 'proximity',
                parameters: { distance: 100 }
            }],
            actions: [
                {
                    type: 'show_message',
                    parameters: {
                        title: 'Complex Waypoint Reached',
                        message: 'You have reached the complex test waypoint!',
                        duration: 3000
                    }
                },
                {
                    type: 'spawn_ships',
                    parameters: {
                        shipType: 'ally_escort',
                        minCount: 1,
                        maxCount: 3,
                        formation: 'diamond'
                    }
                },
                {
                    type: 'give_reward',
                    parameters: {
                        rewardPackageId: 'complex_test_reward',
                        bonusMultiplier: 2.0,
                        message: 'Complex workflow reward!'
                    }
                }
            ]
        };
        
        try {
            // Create the complex waypoint
            await window.waypointManager.createWaypoint(complexWaypoint);
            assert(true, 'Complex waypoint created successfully');
            
            // Target the waypoint
            if (window.targetComputerManager) {
                window.targetComputerManager.setVirtualTarget('browser_test_complex_waypoint');
                assert(true, 'Complex waypoint targeted successfully');
            }
            
            // Execute all actions
            const waypoint = window.waypointManager.getWaypoint('browser_test_complex_waypoint');
            if (waypoint && waypoint.actions) {
                for (let i = 0; i < waypoint.actions.length; i++) {
                    const actionConfig = waypoint.actions[i];
                    const action = window.waypointManager.actionRegistry.create(actionConfig.type, actionConfig.parameters);
                    await action.execute();
                    assert(true, `Complex waypoint action ${i + 1}/${waypoint.actions.length} executed: ${actionConfig.type}`);
                }
            }
            
            // Save the complex waypoint state
            if (window.waypointManager.persistence) {
                await window.waypointManager.persistence.saveWaypointState('browser_test_complex_waypoint');
                assert(true, 'Complex waypoint state persisted successfully');
            }
            
        } catch (error) {
            assert(false, `Complex workflow test failed: ${error.message}`);
        }
    }
    
    async function cleanupTestData() {
        if (!TEST_CONFIG.cleanup) return;
        
        log('🧹 Cleaning up test data...', 'info');
        
        const testWaypointIds = [
            'browser_test_waypoint_1',
            'browser_test_targeting_waypoint',
            'browser_test_persistence_waypoint',
            'browser_test_complex_waypoint'
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
        console.log('🎯 WAYPOINTS SYSTEM TEST RESULTS');
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
        } else {
            console.log('\n⚠️ Some tests failed. Please check the implementation.');
        }
        
        console.log('='.repeat(60));
    }
    
    // Main test runner
    async function runAllTests() {
        console.log('🎯 Starting Waypoints System Browser Tests...\n');
        
        try {
            await testSystemInitialization();
            await sleep(100);
            
            await testWaypointCreation();
            await sleep(100);
            
            await testActionSystem();
            await sleep(100);
            
            await testTargetingSystem();
            await sleep(100);
            
            await testPersistenceSystem();
            await sleep(100);
            
            await testComplexWorkflow();
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
    
    // Auto-run if this script is executed directly
    if (typeof window !== 'undefined') {
        // Make the test runner available globally
        window.testWaypointsSystem = runAllTests;
        
        // Auto-run the tests
        runAllTests().then(results => {
            if (results.failed === 0) {
                console.log('🎉 Ready to proceed with Phase 3: User Interface Integration!');
            }
        });
    }
    
})();
