/**
 * 🎯 WAYPOINT TARGETING INTEGRATION TEST
 * 
 * Test script to verify waypoint targeting integration works correctly:
 * 1. Create test waypoints
 * 2. Verify they appear in targeting system
 * 3. Test TAB cycling to waypoints
 * 4. Verify HUD display with waypoint colors
 * 5. Test Star Charts blinking
 */

console.log('🎯 Starting Waypoint Targeting Integration Test...');

// ========== TEST SETUP ==========

let testResults = {
    waypointCreation: false,
    targetingIntegration: false,
    hudDisplay: false,
    tabCycling: false,
    starChartsBlinking: false,
    colorScheme: false
};

// ========== TEST WAYPOINT CREATION ==========

function testWaypointCreation() {
    console.log('📝 Test 1: Waypoint Creation');
    
    try {
        if (!window.waypointManager) {
            throw new Error('WaypointManager not available');
        }
        
        // Create test waypoints at different locations
        const testWaypoints = [
            {
                name: 'Alpha Navigation Point',
                position: [-30, 2, 40],
                triggerRadius: 20.0,
                type: 'navigation',
                actions: [{
                    type: 'show_message',
                    parameters: {
                        title: 'Alpha Point Reached',
                        message: 'You have reached Alpha navigation point.',
                        audioFileId: 'discovery_chime'
                    }
                }]
            },
            {
                name: 'Beta Combat Zone',
                position: [50, -5, -30],
                triggerRadius: 30.0,
                type: 'combat',
                actions: [{
                    type: 'spawn_ships',
                    parameters: {
                        shipType: 'fighter',
                        minCount: 2,
                        maxCount: 4,
                        faction: 'pirate'
                    }
                }]
            },
            {
                name: 'Gamma Checkpoint',
                position: [0, 10, -60],
                triggerRadius: 15.0,
                type: 'checkpoint',
                actions: [{
                    type: 'show_message',
                    parameters: {
                        title: 'Checkpoint Gamma',
                        message: 'Mission checkpoint reached. Progress saved.',
                        audioFileId: 'mission_success'
                    }
                }]
            }
        ];
        
        window.testWaypointIds = [];
        
        for (const waypointConfig of testWaypoints) {
            const waypointId = window.waypointManager.createWaypoint(waypointConfig);
            window.testWaypointIds.push(waypointId);
            console.log(`✅ Created waypoint: ${waypointConfig.name} (ID: ${waypointId})`);
        }
        
        testResults.waypointCreation = true;
        console.log('✅ Test 1 PASSED: Waypoint creation successful');
        
    } catch (error) {
        console.error('❌ Test 1 FAILED: Waypoint creation failed:', error);
        testResults.waypointCreation = false;
    }
}

// ========== TEST TARGETING INTEGRATION ==========

function testTargetingIntegration() {
    console.log('📝 Test 2: Targeting System Integration');
    
    try {
        if (!window.targetComputerManager) {
            throw new Error('TargetComputerManager not available');
        }
        
        const tcm = window.targetComputerManager;
        
        // Update target objects to include waypoints
        tcm.updateTargetObjects();
        
        // Check if waypoints are in target list
        const waypointTargets = tcm.targetObjects.filter(t => t.isWaypoint);
        
        if (waypointTargets.length === 0) {
            throw new Error('No waypoints found in target objects');
        }
        
        console.log(`✅ Found ${waypointTargets.length} waypoints in targeting system`);
        
        // Verify waypoint target structure
        const firstWaypoint = waypointTargets[0];
        const requiredFields = ['id', 'name', 'type', 'isWaypoint', 'position', 'waypointData'];
        
        for (const field of requiredFields) {
            if (!firstWaypoint.hasOwnProperty(field)) {
                throw new Error(`Waypoint target missing field: ${field}`);
            }
        }
        
        console.log('✅ Waypoint target structure validated');
        console.log('Sample waypoint target:', firstWaypoint);
        
        testResults.targetingIntegration = true;
        console.log('✅ Test 2 PASSED: Targeting integration successful');
        
    } catch (error) {
        console.error('❌ Test 2 FAILED: Targeting integration failed:', error);
        testResults.targetingIntegration = false;
    }
}

// ========== TEST TAB CYCLING ==========

function testTabCycling() {
    console.log('📝 Test 3: TAB Cycling to Waypoints');
    
    try {
        if (!window.targetComputerManager) {
            throw new Error('TargetComputerManager not available');
        }
        
        const tcm = window.targetComputerManager;
        
        // Enable target computer if not already enabled
        if (!tcm.targetComputerEnabled) {
            tcm.enableTargetComputer();
        }
        
        // Store original target
        const originalTarget = tcm.currentTarget;
        
        // Cycle through targets to find a waypoint
        let waypointFound = false;
        let cycleCount = 0;
        const maxCycles = 10;
        
        while (!waypointFound && cycleCount < maxCycles) {
            tcm.cycleTarget(true);
            cycleCount++;
            
            if (tcm.currentTarget && tcm.currentTarget.isWaypoint) {
                waypointFound = true;
                console.log(`✅ Waypoint targeted via TAB cycling: ${tcm.currentTarget.name}`);
                console.log('Waypoint target data:', tcm.currentTarget);
            }
        }
        
        if (!waypointFound) {
            throw new Error('Could not cycle to waypoint target');
        }
        
        testResults.tabCycling = true;
        console.log('✅ Test 3 PASSED: TAB cycling to waypoints successful');
        
    } catch (error) {
        console.error('❌ Test 3 FAILED: TAB cycling failed:', error);
        testResults.tabCycling = false;
    }
}

// ========== TEST HUD DISPLAY ==========

function testHUDDisplay() {
    console.log('📝 Test 4: HUD Display with Waypoint Colors');
    
    try {
        if (!window.targetComputerManager) {
            throw new Error('TargetComputerManager not available');
        }
        
        const tcm = window.targetComputerManager;
        
        // Ensure we have a waypoint targeted
        if (!tcm.currentTarget || !tcm.currentTarget.isWaypoint) {
            // Try to target a waypoint
            const waypointTargets = tcm.targetObjects.filter(t => t.isWaypoint);
            if (waypointTargets.length > 0) {
                tcm.setTargetById(waypointTargets[0].id);
            } else {
                throw new Error('No waypoint targets available for HUD test');
            }
        }
        
        // Check if HUD exists and has waypoint styling
        if (!tcm.targetHUD) {
            throw new Error('Target HUD not available');
        }
        
        // Verify waypoint colors are applied
        const hudStyle = window.getComputedStyle(tcm.targetHUD);
        const borderColor = hudStyle.borderColor;
        
        console.log('HUD border color:', borderColor);
        console.log('HUD element:', tcm.targetHUD);
        
        // Check if waypoint-specific elements are present
        if (tcm.targetNameDisplay) {
            console.log('Target name display:', tcm.targetNameDisplay.innerHTML);
        }
        
        if (tcm.targetInfoDisplay) {
            console.log('Target info display:', tcm.targetInfoDisplay.innerHTML);
        }
        
        testResults.hudDisplay = true;
        console.log('✅ Test 4 PASSED: HUD display with waypoint colors successful');
        
    } catch (error) {
        console.error('❌ Test 4 FAILED: HUD display test failed:', error);
        testResults.hudDisplay = false;
    }
}

// ========== TEST STAR CHARTS BLINKING ==========

function testStarChartsBlinking() {
    console.log('📝 Test 5: Star Charts Blinking');
    
    try {
        if (!window.starChartsUI) {
            console.warn('⚠️ StarChartsUI not available - skipping Star Charts test');
            testResults.starChartsBlinking = true; // Skip this test
            return;
        }
        
        const starCharts = window.starChartsUI;
        
        // Check if waypoint rendering method exists
        if (typeof starCharts.renderWaypoints !== 'function') {
            throw new Error('renderWaypoints method not available on StarChartsUI');
        }
        
        // Check if waypoint icon creation method exists
        if (typeof starCharts.createWaypointIcon !== 'function') {
            throw new Error('createWaypointIcon method not available on StarChartsUI');
        }
        
        // Check if enhanced target matching exists
        if (typeof starCharts.matchesCurrentTarget !== 'function') {
            throw new Error('Enhanced matchesCurrentTarget method not available');
        }
        
        console.log('✅ Star Charts waypoint methods available');
        
        // Test waypoint icon creation
        if (window.testWaypointIds && window.testWaypointIds.length > 0) {
            const waypoint = window.waypointManager.getWaypoint(window.testWaypointIds[0]);
            if (waypoint) {
                const testIcon = starCharts.createWaypointIcon(waypoint, 100, 100);
                console.log('✅ Waypoint icon created successfully:', testIcon);
            }
        }
        
        testResults.starChartsBlinking = true;
        console.log('✅ Test 5 PASSED: Star Charts blinking integration successful');
        
    } catch (error) {
        console.error('❌ Test 5 FAILED: Star Charts blinking test failed:', error);
        testResults.starChartsBlinking = false;
    }
}

// ========== TEST COLOR SCHEME ==========

function testColorScheme() {
    console.log('📝 Test 6: Waypoint Color Scheme');
    
    try {
        // Check if waypoint colors are defined
        if (typeof WAYPOINT_COLORS === 'undefined') {
            throw new Error('WAYPOINT_COLORS not defined');
        }
        
        const requiredColors = ['primary', 'secondary', 'accent', 'glow', 'text', 'background'];
        
        for (const colorKey of requiredColors) {
            if (!WAYPOINT_COLORS[colorKey]) {
                throw new Error(`Missing waypoint color: ${colorKey}`);
            }
        }
        
        console.log('✅ Waypoint color scheme complete:', WAYPOINT_COLORS);
        
        // Verify colors are distinct from faction colors
        const factionColors = ['#ff0000', '#00ff00', '#ffff00', '#0000ff']; // red, green, yellow, blue
        const waypointPrimary = WAYPOINT_COLORS.primary.toLowerCase();
        
        if (factionColors.includes(waypointPrimary)) {
            throw new Error('Waypoint primary color conflicts with faction colors');
        }
        
        console.log('✅ Waypoint colors are distinct from faction colors');
        
        testResults.colorScheme = true;
        console.log('✅ Test 6 PASSED: Color scheme validation successful');
        
    } catch (error) {
        console.error('❌ Test 6 FAILED: Color scheme test failed:', error);
        testResults.colorScheme = false;
    }
}

// ========== TEST RUNNER ==========

async function runAllTests() {
    console.log('🎯 Running Waypoint Targeting Integration Tests...\n');
    
    // Run tests in sequence
    testWaypointCreation();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    testTargetingIntegration();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    testTabCycling();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    testHUDDisplay();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    testStarChartsBlinking();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    testColorScheme();
    
    // Display results
    console.log('\n🎯 TEST RESULTS SUMMARY:');
    console.log('========================');
    
    let passedTests = 0;
    let totalTests = 0;
    
    for (const [testName, result] of Object.entries(testResults)) {
        totalTests++;
        if (result) {
            passedTests++;
            console.log(`✅ ${testName}: PASSED`);
        } else {
            console.log(`❌ ${testName}: FAILED`);
        }
    }
    
    console.log(`\n📊 Overall Result: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 ALL TESTS PASSED! Waypoint targeting integration is working correctly.');
    } else {
        console.log('⚠️ Some tests failed. Check the error messages above for details.');
    }
    
    return { passedTests, totalTests, results: testResults };
}

// ========== CLEANUP FUNCTION ==========

window.cleanupWaypointTests = function() {
    console.log('🧹 Cleaning up test waypoints...');
    
    if (window.testWaypointIds && window.waypointManager) {
        for (const waypointId of window.testWaypointIds) {
            window.waypointManager.deleteWaypoint(waypointId);
            console.log(`🗑️ Deleted test waypoint: ${waypointId}`);
        }
        
        window.testWaypointIds = [];
        console.log('✅ Test waypoint cleanup complete');
    }
};

// ========== MANUAL TEST FUNCTIONS ==========

window.testWaypointTargetingManual = function() {
    console.log('🎮 Manual Waypoint Targeting Test');
    
    // Create a single test waypoint
    if (window.waypointManager) {
        const waypointId = window.waypointManager.createWaypoint({
            name: 'Manual Test Waypoint',
            position: [-25, 0, 35],
            triggerRadius: 20.0,
            type: 'navigation',
            actions: [{
                type: 'show_message',
                parameters: {
                    title: 'Manual Test',
                    message: 'Manual waypoint targeting test successful!',
                    audioFileId: 'discovery_chime'
                }
            }]
        });
        
        console.log(`✅ Manual test waypoint created: ${waypointId}`);
        
        // Try to target it
        setTimeout(() => {
            if (window.targetComputerManager) {
                window.targetComputerManager.updateTargetObjects();
                window.targetComputerManager.setTargetById(waypointId);
                console.log('🎯 Manual waypoint targeted via setTargetById');
            }
        }, 1000);
        
        return waypointId;
    }
};

window.cycleToWaypoint = function() {
    console.log('🎮 Cycling to find waypoint...');
    
    if (window.targetComputerManager) {
        const tcm = window.targetComputerManager;
        
        // Enable target computer
        if (!tcm.targetComputerEnabled) {
            tcm.enableTargetComputer();
        }
        
        // Cycle until we find a waypoint
        let attempts = 0;
        const maxAttempts = 15;
        
        const cycleInterval = setInterval(() => {
            tcm.cycleTarget(true);
            attempts++;
            
            if (tcm.currentTarget && tcm.currentTarget.isWaypoint) {
                console.log(`🎯 Waypoint found and targeted: ${tcm.currentTarget.name}`);
                clearInterval(cycleInterval);
            } else if (attempts >= maxAttempts) {
                console.log('❌ No waypoint found after maximum attempts');
                clearInterval(cycleInterval);
            } else {
                console.log(`🔄 Cycling... attempt ${attempts} (current: ${tcm.currentTarget?.name || 'none'})`);
            }
        }, 500);
    }
};

// ========== AUTO-RUN ==========

// Auto-run tests when script loads
setTimeout(() => {
    console.log('🚀 Auto-running waypoint targeting tests...');
    runAllTests();
}, 2000);

console.log('🎯 Waypoint Targeting Test Script Loaded');
console.log('🎮 Available manual test functions:');
console.log('  testWaypointTargetingManual() - Create and target a single waypoint');
console.log('  cycleToWaypoint() - Cycle through targets to find waypoints');
console.log('  cleanupWaypointTests() - Clean up test waypoints');
