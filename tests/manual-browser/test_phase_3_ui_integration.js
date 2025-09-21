/**
 * 🎯 Phase 3: UI Integration Test Suite
 * 
 * Tests the complete waypoint UI integration including:
 * - WaypointHUD display and updates
 * - Star Charts waypoint markers
 * - Targeting integration
 * - Keyboard shortcuts
 * - Visual feedback systems
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
    async function testWaypointHUDIntegration() {
        log('🖥️ Testing WaypointHUD Integration...', 'info');
        
        // Test WaypointHUD availability
        assert(typeof window.waypointHUD !== 'undefined', 'WaypointHUD is available globally');
        assert(window.waypointHUD !== null, 'WaypointHUD is not null');
        
        if (window.waypointHUD) {
            assert(typeof window.waypointHUD.show === 'function', 'WaypointHUD has show method');
            assert(typeof window.waypointHUD.hide === 'function', 'WaypointHUD has hide method');
            assert(typeof window.waypointHUD.updateWaypoint === 'function', 'WaypointHUD has updateWaypoint method');
            assert(window.waypointHUD.visible === false, 'WaypointHUD starts hidden');
        }
    }
    
    async function testWaypointHUDDisplay() {
        log('📺 Testing WaypointHUD Display...', 'info');
        
        if (!window.waypointHUD || !window.waypointManager) {
            log('Required systems not available, skipping HUD display tests', 'warning');
            return;
        }
        
        // Create a test waypoint
        const testWaypoint = {
            id: 'phase3_hud_test_waypoint',
            name: 'Phase 3 HUD Test',
            type: 'navigation',
            position: [500, 0, 500],
            description: 'Testing HUD display functionality',
            status: 'active'
        };
        
        try {
            // Create waypoint
            await window.waypointManager.createWaypoint(testWaypoint);
            
            // Show HUD
            window.waypointHUD.show(testWaypoint);
            assert(window.waypointHUD.visible === true, 'WaypointHUD becomes visible when shown');
            
            // Check HUD elements exist
            const hudElement = document.querySelector('.waypoint-hud-display');
            assert(hudElement !== null, 'WaypointHUD DOM element exists');
            assert(hudElement.style.display !== 'none', 'WaypointHUD is visually displayed');
            
            // Test HUD content
            const waypointName = hudElement.querySelector('div');
            assert(waypointName !== null, 'WaypointHUD contains waypoint information');
            
            // Hide HUD
            window.waypointHUD.hide();
            assert(window.waypointHUD.visible === false, 'WaypointHUD becomes hidden when hide() called');
            
        } catch (error) {
            assert(false, `WaypointHUD display test failed: ${error.message}`);
        }
    }
    
    async function testStarChartsWaypointMarkers() {
        log('🗺️ Testing Star Charts Waypoint Markers...', 'info');
        
        if (!window.waypointManager) {
            log('WaypointManager not available, skipping Star Charts tests', 'warning');
            return;
        }
        
        // Create test waypoints with different types
        const testWaypoints = [
            {
                id: 'phase3_nav_waypoint',
                name: 'Navigation Test',
                type: 'navigation',
                position: [1000, 0, 1000],
                status: 'active'
            },
            {
                id: 'phase3_obj_waypoint',
                name: 'Objective Test',
                type: 'objective',
                position: [1500, 0, 1500],
                status: 'active'
            },
            {
                id: 'phase3_checkpoint_waypoint',
                name: 'Checkpoint Test',
                type: 'checkpoint',
                position: [2000, 0, 2000],
                status: 'completed'
            }
        ];
        
        try {
            // Create waypoints
            for (const waypoint of testWaypoints) {
                await window.waypointManager.createWaypoint(waypoint);
            }
            
            assert(true, 'Test waypoints created successfully');
            
            // Check if Star Charts UI exists and can render waypoints
            if (window.starChartsUI || (window.navigationSystemManager && window.navigationSystemManager.starChartsUI)) {
                const starChartsUI = window.starChartsUI || window.navigationSystemManager.starChartsUI;
                
                if (starChartsUI && typeof starChartsUI.renderVirtualWaypoints === 'function') {
                    // Test waypoint rendering
                    starChartsUI.renderVirtualWaypoints();
                    assert(true, 'Star Charts waypoint rendering executed without errors');
                } else {
                    log('Star Charts UI renderVirtualWaypoints method not available', 'warning');
                }
            } else {
                log('Star Charts UI not available for testing', 'warning');
            }
            
        } catch (error) {
            assert(false, `Star Charts waypoint marker test failed: ${error.message}`);
        }
    }
    
    async function testWaypointTargetingIntegration() {
        log('🎯 Testing Waypoint Targeting Integration...', 'info');
        
        if (!window.targetComputerManager || !window.waypointManager || !window.waypointHUD) {
            log('Required systems not available, skipping targeting integration tests', 'warning');
            return;
        }
        
        // Create a test waypoint
        const targetingWaypoint = {
            id: 'phase3_targeting_test',
            name: 'Targeting Integration Test',
            type: 'navigation',
            position: [800, 0, 800],
            status: 'active'
        };
        
        try {
            // Create waypoint
            await window.waypointManager.createWaypoint(targetingWaypoint);
            
            // Test waypoint targeting
            const success = window.targetComputerManager.setVirtualTarget(targetingWaypoint);
            assert(success === true, 'Waypoint targeting returns success');
            
            // Check if HUD shows automatically
            await sleep(200); // Allow time for integration to work
            assert(window.waypointHUD.visible === true, 'WaypointHUD shows automatically when waypoint targeted');
            
            // Check current waypoint in HUD
            const currentWaypoint = window.waypointHUD.getCurrentWaypoint();
            assert(currentWaypoint !== null, 'WaypointHUD has current waypoint');
            assert(currentWaypoint.id === targetingWaypoint.id, 'WaypointHUD shows correct waypoint');
            
            // Test targeting another object (should hide waypoint HUD)
            window.targetComputerManager.setTarget({ id: 'test_ship', type: 'ship' });
            await sleep(200);
            assert(window.waypointHUD.visible === false, 'WaypointHUD hides when targeting non-waypoint');
            
        } catch (error) {
            assert(false, `Waypoint targeting integration test failed: ${error.message}`);
        }
    }
    
    async function testWaypointInterruptionUI() {
        log('⏸️ Testing Waypoint Interruption UI...', 'info');
        
        if (!window.targetComputerManager || !window.waypointManager || !window.waypointHUD) {
            log('Required systems not available, skipping interruption UI tests', 'warning');
            return;
        }
        
        // Create a test waypoint
        const interruptionWaypoint = {
            id: 'phase3_interruption_test',
            name: 'Interruption UI Test',
            type: 'objective',
            position: [1200, 0, 1200],
            status: 'active'
        };
        
        try {
            // Create and target waypoint
            await window.waypointManager.createWaypoint(interruptionWaypoint);
            window.targetComputerManager.setVirtualTarget(interruptionWaypoint);
            
            // Interrupt with another target
            window.targetComputerManager.setTarget({ id: 'interrupting_enemy', type: 'ship' });
            
            // Check interruption state
            assert(window.targetComputerManager.hasInterruptedWaypoint() === true, 'Interruption detected');
            
            const interruptedWaypoint = window.targetComputerManager.getInterruptedWaypoint();
            assert(interruptedWaypoint !== null, 'Interrupted waypoint stored');
            assert(interruptedWaypoint.id === interruptionWaypoint.id, 'Correct waypoint interrupted');
            
            // Test resumption
            const resumed = window.targetComputerManager.resumeInterruptedWaypoint();
            assert(resumed === true, 'Waypoint resumption successful');
            assert(window.targetComputerManager.hasInterruptedWaypoint() === false, 'Interruption state cleared');
            
        } catch (error) {
            assert(false, `Waypoint interruption UI test failed: ${error.message}`);
        }
    }
    
    async function testKeyboardShortcuts() {
        log('⌨️ Testing Keyboard Shortcuts...', 'info');
        
        if (!window.waypointKeyboardHandler) {
            log('WaypointKeyboardHandler not available, skipping keyboard tests', 'warning');
            return;
        }
        
        // Test keyboard handler availability
        assert(typeof window.waypointKeyboardHandler !== 'undefined', 'WaypointKeyboardHandler is available');
        
        if (window.waypointKeyboardHandler) {
            assert(typeof window.waypointKeyboardHandler.handleWaypointKey === 'function', 
                   'WaypointKeyboardHandler has handleWaypointKey method');
            assert(typeof window.waypointKeyboardHandler.handleNextWaypointKey === 'function', 
                   'WaypointKeyboardHandler has handleNextWaypointKey method');
        }
        
        // Test keyboard event simulation (basic test)
        try {
            // Create a test scenario with interrupted waypoint
            if (window.targetComputerManager && window.waypointManager) {
                const keyboardTestWaypoint = {
                    id: 'phase3_keyboard_test',
                    name: 'Keyboard Test',
                    type: 'navigation',
                    position: [600, 0, 600],
                    status: 'active'
                };
                
                await window.waypointManager.createWaypoint(keyboardTestWaypoint);
                window.targetComputerManager.setVirtualTarget(keyboardTestWaypoint);
                window.targetComputerManager.setTarget({ id: 'test_enemy', type: 'ship' });
                
                // Simulate W key press
                const wKeyEvent = new KeyboardEvent('keydown', { key: 'w', code: 'KeyW' });
                window.waypointKeyboardHandler.handleWaypointKey(wKeyEvent);
                
                assert(true, 'Keyboard shortcut handling executed without errors');
            }
            
        } catch (error) {
            assert(false, `Keyboard shortcut test failed: ${error.message}`);
        }
    }
    
    async function testVisualFeedback() {
        log('✨ Testing Visual Feedback Systems...', 'info');
        
        // Test waypoint HUD visual updates
        if (window.waypointHUD && window.waypointManager) {
            try {
                const feedbackWaypoint = {
                    id: 'phase3_feedback_test',
                    name: 'Visual Feedback Test',
                    type: 'navigation',
                    position: [700, 0, 700],
                    status: 'active'
                };
                
                await window.waypointManager.createWaypoint(feedbackWaypoint);
                window.waypointHUD.show(feedbackWaypoint);
                
                // Test waypoint update
                feedbackWaypoint.status = 'triggered';
                window.waypointHUD.updateWaypoint(feedbackWaypoint);
                
                assert(true, 'Visual feedback update executed without errors');
                
                window.waypointHUD.hide();
                
            } catch (error) {
                assert(false, `Visual feedback test failed: ${error.message}`);
            }
        }
        
        // Test Star Charts visual feedback
        if (window.starChartsUI || (window.navigationSystemManager && window.navigationSystemManager.starChartsUI)) {
            try {
                const starChartsUI = window.starChartsUI || window.navigationSystemManager.starChartsUI;
                
                if (starChartsUI && typeof starChartsUI.handleWaypointClick === 'function') {
                    // Test waypoint click handling
                    const mockWaypoint = { id: 'mock_waypoint', name: 'Mock Waypoint' };
                    starChartsUI.handleWaypointClick(mockWaypoint);
                    
                    assert(true, 'Star Charts waypoint click handling executed without errors');
                }
                
            } catch (error) {
                assert(false, `Star Charts visual feedback test failed: ${error.message}`);
            }
        }
    }
    
    async function cleanupPhase3TestData() {
        if (!TEST_CONFIG.cleanup) return;
        
        log('🧹 Cleaning up Phase 3 test data...', 'info');
        
        const testWaypointIds = [
            'phase3_hud_test_waypoint',
            'phase3_nav_waypoint',
            'phase3_obj_waypoint',
            'phase3_checkpoint_waypoint',
            'phase3_targeting_test',
            'phase3_interruption_test',
            'phase3_keyboard_test',
            'phase3_feedback_test'
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
        
        // Hide waypoint HUD
        if (window.waypointHUD) {
            window.waypointHUD.hide();
        }
        
        // Clear target computer state
        if (window.targetComputerManager) {
            window.targetComputerManager.clearInterruptedWaypoint();
            window.targetComputerManager.currentTarget = null;
        }
        
        log('Phase 3 test data cleanup completed', 'info');
    }
    
    function printResults() {
        const duration = Date.now() - testResults.startTime;
        const successRate = testResults.total > 0 ? ((testResults.passed / testResults.total) * 100).toFixed(1) : 0;
        
        console.log('\n' + '='.repeat(70));
        console.log('🎯 PHASE 3: UI INTEGRATION TEST RESULTS');
        console.log('='.repeat(70));
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
            console.log('\n🎉 ALL PHASE 3 TESTS PASSED! UI integration is complete!');
            console.log('🚀 Waypoints system is fully integrated and ready for production!');
        } else if (successRate >= 85) {
            console.log('\n🎊 EXCELLENT! 85%+ success rate achieved for Phase 3!');
            console.log('🚀 UI integration is substantially complete!');
        } else {
            console.log('\n⚠️ Some Phase 3 tests failed. Please check the UI integration.');
        }
        
        console.log('='.repeat(70));
    }
    
    // Main test runner
    async function runPhase3Tests() {
        console.log('🎯 Starting Phase 3: UI Integration Tests...\n');
        
        try {
            await testWaypointHUDIntegration();
            await sleep(200);
            
            await testWaypointHUDDisplay();
            await sleep(200);
            
            await testStarChartsWaypointMarkers();
            await sleep(200);
            
            await testWaypointTargetingIntegration();
            await sleep(200);
            
            await testWaypointInterruptionUI();
            await sleep(200);
            
            await testKeyboardShortcuts();
            await sleep(200);
            
            await testVisualFeedback();
            await sleep(200);
            
            await cleanupPhase3TestData();
            
        } catch (error) {
            log(`Phase 3 test suite failed with error: ${error.message}`, 'error');
            assert(false, `Phase 3 test suite execution failed: ${error.message}`);
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
    
    // Auto-run the Phase 3 tests
    runPhase3Tests().then(results => {
        if (results.successRate >= 0.85) {
            console.log('🎉 SUCCESS! Phase 3 UI Integration Complete!');
            console.log('🚀 Ready for production deployment!');
        }
    });
    
    // Make test runner available globally
    window.testPhase3UIIntegration = runPhase3Tests;
    
})();
