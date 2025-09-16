/**
 * 🔧 Phase 3 Fixes Test
 * Quick test to verify the fixes for Phase 3 integration issues
 */

(function() {
    'use strict';
    
    console.log('🔧 Testing Phase 3 Fixes...\n');
    
    // Test 1: Star Charts convertToScreenCoordinates method
    console.log('1. Testing Star Charts coordinate conversion...');
    try {
        const starChartsUI = window.starChartsUI || (window.navigationSystemManager && window.navigationSystemManager.starChartsUI);
        if (starChartsUI && typeof starChartsUI.convertToScreenCoordinates === 'function') {
            console.log('✅ convertToScreenCoordinates method exists');
            
            // Test with sample coordinates
            const result = starChartsUI.convertToScreenCoordinates(1000, 1000);
            console.log('✅ convertToScreenCoordinates executed:', result);
        } else {
            console.log('❌ convertToScreenCoordinates method not found');
        }
    } catch (error) {
        console.log('❌ Star Charts coordinate test failed:', error.message);
    }
    
    // Test 2: TargetComputerManager setVirtualTarget with both string and object
    console.log('\n2. Testing TargetComputerManager setVirtualTarget fixes...');
    try {
        if (window.targetComputerManager && window.waypointManager) {
            // Create a test waypoint
            const testWaypoint = {
                id: 'fix_test_waypoint',
                name: 'Fix Test Waypoint',
                type: 'navigation',
                position: [500, 0, 500]
            };
            
            window.waypointManager.createWaypoint(testWaypoint);
            
            // Test with waypoint object
            const objectResult = window.targetComputerManager.setVirtualTarget(testWaypoint);
            console.log('✅ setVirtualTarget with object:', objectResult);
            
            // Test with waypoint ID string
            const stringResult = window.targetComputerManager.setVirtualTarget('fix_test_waypoint');
            console.log('✅ setVirtualTarget with string ID:', stringResult);
            
            // Check current target
            const currentTarget = window.targetComputerManager.currentTarget;
            console.log('✅ Current target set:', currentTarget ? currentTarget.id : 'null');
            
        } else {
            console.log('❌ Required managers not available');
        }
    } catch (error) {
        console.log('❌ TargetComputerManager test failed:', error.message);
    }
    
    // Test 3: WaypointKeyboardHandler method aliases
    console.log('\n3. Testing WaypointKeyboardHandler method aliases...');
    try {
        if (window.waypointKeyboardHandler) {
            const hasWaypointKey = typeof window.waypointKeyboardHandler.handleWaypointKey === 'function';
            const hasNextWaypointKey = typeof window.waypointKeyboardHandler.handleNextWaypointKey === 'function';
            
            console.log('✅ handleWaypointKey method exists:', hasWaypointKey);
            console.log('✅ handleNextWaypointKey method exists:', hasNextWaypointKey);
            
            if (hasWaypointKey && hasNextWaypointKey) {
                console.log('✅ All keyboard handler methods available');
            }
        } else {
            console.log('❌ WaypointKeyboardHandler not available');
        }
    } catch (error) {
        console.log('❌ Keyboard handler test failed:', error.message);
    }
    
    // Test 4: WaypointHUD integration
    console.log('\n4. Testing WaypointHUD integration...');
    try {
        if (window.waypointHUD && window.waypointManager) {
            // Test HUD with a waypoint
            const hudTestWaypoint = {
                id: 'hud_fix_test',
                name: 'HUD Fix Test',
                type: 'navigation',
                position: [800, 0, 800],
                status: 'active'
            };
            
            window.waypointManager.createWaypoint(hudTestWaypoint);
            window.waypointHUD.show(hudTestWaypoint);
            
            console.log('✅ WaypointHUD show executed');
            console.log('✅ WaypointHUD visible:', window.waypointHUD.visible);
            
            // Test targeting integration
            if (window.targetComputerManager) {
                window.targetComputerManager.setVirtualTarget(hudTestWaypoint);
                console.log('✅ Targeting integration test completed');
            }
            
            window.waypointHUD.hide();
            
        } else {
            console.log('❌ WaypointHUD or WaypointManager not available');
        }
    } catch (error) {
        console.log('❌ WaypointHUD integration test failed:', error.message);
    }
    
    console.log('\n🔧 Phase 3 Fixes Test Complete!');
    console.log('Now run the full Phase 3 test suite to verify improvements.');
    
})();
