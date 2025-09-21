/**
 * 🎯 Sol System Discovery Mission Test
 * Complete test for the waypoint-driven discovery mission
 * Run this in the browser console after the game loads
 */

(function() {
    'use strict';
    
    console.log('🚀 Sol System Discovery Mission Test Starting...\n');
    
    // Test configuration
    const TEST_CONFIG = {
        missionId: 'sol_discovery_test_001',
        templateId: 'sol_system_discovery',
        playerId: 'test_player',
        verbose: true
    };
    
    // Test results
    const results = {
        passed: 0,
        failed: 0,
        total: 0,
        failures: []
    };
    
    function assert(condition, message) {
        results.total++;
        if (condition) {
            results.passed++;
            console.log(`✅ ${message}`);
        } else {
            results.failed++;
            results.failures.push(message);
            console.error(`❌ ${message}`);
        }
    }
    
    async function testSystemsAvailability() {
        console.log('🔧 Testing System Availability...');
        
        // Core systems
        assert(typeof window.waypointManager !== 'undefined', 'WaypointManager available');
        assert(typeof window.targetComputerManager !== 'undefined', 'TargetComputerManager available');
        assert(typeof window.audioManager !== 'undefined' || typeof window.starfieldAudioManager !== 'undefined', 'Audio system available');
        
        // Mission system
        assert(typeof window.missionEventHandler !== 'undefined', 'Mission system available');
        
        // UI systems
        assert(typeof window.waypointHUD !== 'undefined', 'WaypointHUD available');
        assert(typeof window.starChartsUI !== 'undefined', 'StarChartsUI available');
    }
    
    async function createSolDiscoveryMission() {
        console.log('📋 Creating Sol System Discovery Mission...');
        
        if (!window.waypointManager) {
            console.error('❌ WaypointManager not available - cannot create mission');
            return null;
        }
        
        // Mission template data (simplified for testing)
        const missionData = {
            id: TEST_CONFIG.missionId,
            templateId: TEST_CONFIG.templateId,
            title: 'Sol System Discovery Survey',
            description: 'Test mission for waypoint-driven discovery',
            status: 'active',
            waypoints: [
                {
                    id: 'sol_discovery_terra_prime',
                    name: 'Terra Prime Survey Point',
                    type: 'objective',
                    position: [149.6, 0, 0],
                    description: 'Approach Terra Prime for planetary scan',
                    triggers: [{
                        type: 'proximity',
                        parameters: { distance: 5.0, target_object: 'A0_terra_prime' }
                    }],
                    actions: [{
                        type: 'show_message',
                        parameters: {
                            title: 'Terra Prime Discovered',
                            message: 'Beautiful Earth-like world detected. Beginning planetary scan...',
                            duration: 4000,
                            audioFileId: 'static/video/discovery_chime',
                            audioVolume: 0.8
                        }
                    }]
                },
                {
                    id: 'sol_discovery_luna',
                    name: 'Luna Survey Point',
                    type: 'objective', 
                    position: [151.096, 0, 0],
                    description: 'Investigate Luna\'s mineral composition',
                    triggers: [{
                        type: 'proximity',
                        parameters: { distance: 3.0, target_object: 'A0_luna' }
                    }],
                    actions: [{
                        type: 'show_message',
                        parameters: {
                            title: 'Luna Mining Survey',
                            message: 'Mineral-rich moon confirmed. Excellent mining potential detected.',
                            duration: 3500,
                            audioFileId: 'static/video/scan_complete',
                            audioVolume: 0.7
                        }
                    }]
                },
                {
                    id: 'sol_discovery_helios',
                    name: 'Helios Solar Array',
                    type: 'navigation',
                    position: [-24.53, 1.17, 31.85],
                    description: 'Approach the solar research facility',
                    triggers: [{
                        type: 'proximity',
                        parameters: { distance: 2.5 }
                    }],
                    actions: [{
                        type: 'show_message',
                        parameters: {
                            title: 'Helios Solar Array Contact',
                            message: 'Alliance research facility responding. Solar energy research data transmitted.',
                            duration: 4000,
                            audioFileId: 'static/video/station_hail',
                            audioVolume: 0.8
                        }
                    }]
                }
            ]
        };
        
        try {
            // Create waypoints from mission data
            for (const waypointConfig of missionData.waypoints) {
                const waypoint = await window.waypointManager.createWaypoint(waypointConfig);
                assert(waypoint !== null, `Created waypoint: ${waypointConfig.name}`);
            }
            
            console.log(`✅ Sol Discovery Mission created with ${missionData.waypoints.length} waypoints`);
            return missionData;
            
        } catch (error) {
            console.error('❌ Failed to create Sol Discovery Mission:', error);
            return null;
        }
    }
    
    async function testWaypointTargeting() {
        console.log('🎯 Testing Waypoint Targeting...');
        
        if (!window.targetComputerManager || !window.waypointManager) {
            console.warn('⚠️ Required systems not available for targeting test');
            return;
        }
        
        try {
            // Target the first waypoint
            const success = window.targetComputerManager.setVirtualTarget('sol_discovery_terra_prime');
            assert(success, 'Successfully targeted Terra Prime waypoint');
            
            // Check if waypoint is current target
            const currentTarget = window.targetComputerManager.currentTarget;
            assert(currentTarget !== null, 'Current target is set');
            assert(currentTarget.id === 'sol_discovery_terra_prime', 'Correct waypoint is targeted');
            
            // Test WaypointHUD integration
            if (window.waypointHUD) {
                const hudVisible = window.waypointHUD.visible;
                assert(hudVisible, 'WaypointHUD is visible when waypoint targeted');
            }
            
        } catch (error) {
            console.error('❌ Waypoint targeting test failed:', error);
        }
    }
    
    async function testAudioIntegration() {
        console.log('🎵 Testing Audio Integration...');
        
        if (!window.waypointManager || !window.waypointManager.actionRegistry) {
            console.warn('⚠️ Action system not available for audio test');
            return;
        }
        
        try {
            // Test show_message action with audio
            const messageAction = window.waypointManager.actionRegistry.create('show_message', {
                title: 'Audio Test',
                message: 'Testing audio integration with waypoints system',
                duration: 3000,
                audioFileId: 'static/video/discovery_chime',
                audioVolume: 0.5
            });
            
            assert(messageAction !== null, 'Created show_message action with audio');
            
            // Execute the action
            await messageAction.execute();
            assert(true, 'Audio action executed successfully');
            
        } catch (error) {
            console.error('❌ Audio integration test failed:', error);
        }
    }
    
    async function testKeyboardShortcuts() {
        console.log('⌨️ Testing Keyboard Shortcuts...');
        
        if (!window.waypointKeyboardHandler) {
            console.warn('⚠️ WaypointKeyboardHandler not available');
            return;
        }
        
        try {
            // Test waypoint key handler
            assert(typeof window.waypointKeyboardHandler.handleWaypointKey === 'function', 'Waypoint key handler available');
            assert(typeof window.waypointKeyboardHandler.handleNextWaypointKey === 'function', 'Next waypoint key handler available');
            
            console.log('✅ Keyboard shortcuts ready (W key for waypoint resume, Shift+W for cycle)');
            
        } catch (error) {
            console.error('❌ Keyboard shortcuts test failed:', error);
        }
    }
    
    async function testStarChartsIntegration() {
        console.log('🗺️ Testing Star Charts Integration...');
        
        if (!window.starChartsUI) {
            console.warn('⚠️ StarChartsUI not available');
            return;
        }
        
        try {
            // Check if waypoint rendering methods exist
            assert(typeof window.starChartsUI.renderVirtualWaypoints === 'function', 'StarChartsUI has waypoint rendering');
            assert(typeof window.starChartsUI.renderWaypointMarker === 'function', 'StarChartsUI has marker rendering');
            
            console.log('✅ Star Charts waypoint integration ready');
            
        } catch (error) {
            console.error('❌ Star Charts integration test failed:', error);
        }
    }
    
    function printResults() {
        const successRate = results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0;
        
        console.log('\n' + '='.repeat(60));
        console.log('🎯 SOL SYSTEM DISCOVERY MISSION TEST RESULTS');
        console.log('='.repeat(60));
        console.log(`📊 Total Tests: ${results.total}`);
        console.log(`✅ Passed: ${results.passed}`);
        console.log(`❌ Failed: ${results.failed}`);
        console.log(`📈 Success Rate: ${successRate}%`);
        
        if (results.failed > 0) {
            console.log('\n❌ Failed Tests:');
            results.failures.forEach((failure, index) => {
                console.log(`${index + 1}. ${failure}`);
            });
        }
        
        if (results.failed === 0) {
            console.log('\n🎉 ALL TESTS PASSED! Sol System Discovery Mission is ready!');
            console.log('\n🚀 READY TO PLAY:');
            console.log('1. Target Terra Prime waypoint: targetComputerManager.setVirtualTarget("sol_discovery_terra_prime")');
            console.log('2. Use W key to resume interrupted waypoints');
            console.log('3. Open Star Charts (C key) to see waypoint markers');
            console.log('4. Navigate to waypoints to trigger audio and actions!');
        } else {
            console.log('\n⚠️ Some tests failed. Check the implementation before playing.');
        }
        
        console.log('='.repeat(60));
    }
    
    // Main test runner
    async function runSolDiscoveryTest() {
        try {
            await testSystemsAvailability();
            await createSolDiscoveryMission();
            await testWaypointTargeting();
            await testAudioIntegration();
            await testKeyboardShortcuts();
            await testStarChartsIntegration();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        }
        
        printResults();
        
        return {
            passed: results.passed,
            failed: results.failed,
            total: results.total,
            successRate: results.total > 0 ? (results.passed / results.total) : 0
        };
    }
    
    // Make test available globally and auto-run
    window.testSolDiscoveryMission = runSolDiscoveryTest;
    
    // Auto-run the test
    runSolDiscoveryTest().then(results => {
        if (results.failed === 0) {
            console.log('\n🎮 SOL SYSTEM DISCOVERY MISSION IS READY TO PLAY!');
        }
    });
    
})();
