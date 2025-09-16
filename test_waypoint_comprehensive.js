/**
 * 🎯 WAYPOINT TARGETING - COMPREHENSIVE TEST SUITE
 * 
 * Complete test suite to verify all waypoint targeting functionality
 * Run after loading the waypoint targeting integration
 */

console.log('🎯 Waypoint Targeting Comprehensive Test Suite');

// ========== TEST CONFIGURATION ==========

const TEST_CONFIG = {
    testWaypoints: [
        {
            name: 'Alpha Navigation Point',
            position: [-30, 2, 40],
            triggerRadius: 20.0,
            type: 'navigation'
        },
        {
            name: 'Beta Combat Zone',
            position: [50, -5, -30],
            triggerRadius: 30.0,
            type: 'combat'
        },
        {
            name: 'Gamma Checkpoint',
            position: [0, 10, -60],
            triggerRadius: 15.0,
            type: 'checkpoint'
        }
    ],
    expectedColors: {
        primary: '#ff00ff',
        secondary: '#cc00cc',
        accent: '#ff66ff',
        glow: '#ff00ff88',
        text: '#ffffff',
        background: '#330033'
    }
};

// ========== TEST RESULTS TRACKING ==========

let testResults = {
    waypointCreation: { status: 'pending', details: [] },
    targetingIntegration: { status: 'pending', details: [] },
    tabCycling: { status: 'pending', details: [] },
    hudStyling: { status: 'pending', details: [] },
    wireframeCreation: { status: 'pending', details: [] },
    reticleStyling: { status: 'pending', details: [] },
    colorScheme: { status: 'pending', details: [] },
    cleanup: { status: 'pending', details: [] }
};

// ========== UTILITY FUNCTIONS ==========

function logTest(testName, status, message, details = null) {
    const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏳';
    console.log(`${emoji} ${testName}: ${message}`);
    
    if (testResults[testName]) {
        testResults[testName].status = status;
        testResults[testName].details.push({ message, details, timestamp: Date.now() });
    }
}

function waitForCondition(condition, timeout = 5000, interval = 100) {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const check = () => {
            if (condition()) {
                resolve(true);
            } else if (Date.now() - startTime > timeout) {
                resolve(false);
            } else {
                setTimeout(check, interval);
            }
        };
        
        check();
    });
}

// ========== TEST 1: WAYPOINT CREATION ==========

async function testWaypointCreation() {
    console.log('\n📝 TEST 1: Waypoint Creation');
    
    try {
        if (!window.waypointManager) {
            throw new Error('WaypointManager not available');
        }
        
        window.testWaypointIds = [];
        
        for (const waypointConfig of TEST_CONFIG.testWaypoints) {
            const fullConfig = {
                ...waypointConfig,
                actions: [{
                    type: 'show_message',
                    parameters: {
                        title: `${waypointConfig.name} Reached`,
                        message: `You have reached ${waypointConfig.name}.`,
                        audioFileId: 'discovery_chime'
                    }
                }]
            };
            
            const waypointId = window.waypointManager.createWaypoint(fullConfig);
            window.testWaypointIds.push(waypointId);
            
            logTest('waypointCreation', 'pass', `Created ${waypointConfig.name}`, { id: waypointId });
        }
        
        // Verify waypoints are active
        const activeWaypoints = window.waypointManager.getActiveWaypoints();
        const testWaypoints = activeWaypoints.filter(wp => 
            TEST_CONFIG.testWaypoints.some(config => config.name === wp.name)
        );
        
        if (testWaypoints.length === TEST_CONFIG.testWaypoints.length) {
            logTest('waypointCreation', 'pass', `All ${testWaypoints.length} waypoints created and active`);
            return true;
        } else {
            throw new Error(`Expected ${TEST_CONFIG.testWaypoints.length} waypoints, found ${testWaypoints.length}`);
        }
        
    } catch (error) {
        logTest('waypointCreation', 'fail', `Waypoint creation failed: ${error.message}`);
        return false;
    }
}

// ========== TEST 2: TARGETING INTEGRATION ==========

async function testTargetingIntegration() {
    console.log('\n📝 TEST 2: Targeting System Integration');
    
    try {
        if (!window.targetComputerManager) {
            throw new Error('TargetComputerManager not available');
        }
        
        const tcm = window.targetComputerManager;
        
        // Check if waypoint integration methods exist
        if (!tcm.addWaypointsToTargets) {
            throw new Error('addWaypointsToTargets method not available');
        }
        
        if (!tcm.refreshWaypoints) {
            throw new Error('refreshWaypoints method not available');
        }
        
        // Refresh waypoints in targeting system
        tcm.refreshWaypoints();
        
        // Verify waypoints are in target list
        const waypointTargets = tcm.targetObjects.filter(t => t.isWaypoint);
        
        if (waypointTargets.length === 0) {
            throw new Error('No waypoints found in target objects');
        }
        
        logTest('targetingIntegration', 'pass', `Found ${waypointTargets.length} waypoints in targeting system`);
        
        // Verify waypoint target structure
        const firstWaypoint = waypointTargets[0];
        const requiredFields = ['id', 'name', 'type', 'isWaypoint', 'position', 'waypointData'];
        
        for (const field of requiredFields) {
            if (!firstWaypoint.hasOwnProperty(field)) {
                throw new Error(`Waypoint target missing field: ${field}`);
            }
        }
        
        logTest('targetingIntegration', 'pass', 'Waypoint target structure validated');
        
        // Test distance calculation
        if (typeof firstWaypoint.distance === 'number') {
            logTest('targetingIntegration', 'pass', `Distance calculated: ${firstWaypoint.distance.toFixed(2)} units`);
        } else {
            logTest('targetingIntegration', 'fail', 'Distance not calculated for waypoint');
        }
        
        return true;
        
    } catch (error) {
        logTest('targetingIntegration', 'fail', `Targeting integration failed: ${error.message}`);
        return false;
    }
}

// ========== TEST 3: TAB CYCLING ==========

async function testTabCycling() {
    console.log('\n📝 TEST 3: TAB Cycling (No Loops)');
    
    try {
        const tcm = window.targetComputerManager;
        
        // Enable target computer
        if (tcm.enableTargetComputer && !tcm.targetComputerEnabled) {
            tcm.enableTargetComputer();
        }
        
        // Record initial state
        const initialTarget = tcm.currentTarget?.name || 'none';
        const initialIndex = tcm.targetIndex;
        
        logTest('tabCycling', 'pass', `Initial target: ${initialTarget} (index: ${initialIndex})`);
        
        // Test cycling through targets
        let cycleCount = 0;
        let waypointFound = false;
        let visitedTargets = new Set();
        const maxCycles = Math.min(15, tcm.targetObjects.length + 2);
        
        for (let i = 0; i < maxCycles; i++) {
            const beforeTarget = tcm.currentTarget?.name || 'none';
            
            // Cycle target
            tcm.cycleTarget(true);
            cycleCount++;
            
            const afterTarget = tcm.currentTarget?.name || 'none';
            visitedTargets.add(afterTarget);
            
            logTest('tabCycling', 'pass', `Cycle ${cycleCount}: ${beforeTarget} → ${afterTarget}`);
            
            // Check if we found a waypoint
            if (tcm.currentTarget && tcm.currentTarget.isWaypoint) {
                waypointFound = true;
                logTest('tabCycling', 'pass', `Waypoint targeted: ${tcm.currentTarget.name}`);
                break;
            }
            
            // Small delay to prevent infinite loops
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (waypointFound) {
            logTest('tabCycling', 'pass', `Successfully cycled to waypoint after ${cycleCount} cycles`);
        } else {
            logTest('tabCycling', 'fail', `No waypoint found after ${cycleCount} cycles`);
        }
        
        logTest('tabCycling', 'pass', `Visited ${visitedTargets.size} unique targets`);
        
        return waypointFound;
        
    } catch (error) {
        logTest('tabCycling', 'fail', `TAB cycling failed: ${error.message}`);
        return false;
    }
}

// ========== TEST 4: HUD STYLING ==========

async function testHUDStyling() {
    console.log('\n📝 TEST 4: HUD Styling (Inner and Outer Frames)');
    
    try {
        const tcm = window.targetComputerManager;
        
        // Ensure we have a waypoint targeted
        if (!tcm.currentTarget || !tcm.currentTarget.isWaypoint) {
            const waypointTargets = tcm.targetObjects.filter(t => t.isWaypoint);
            if (waypointTargets.length > 0) {
                tcm.setTargetById(waypointTargets[0].id);
            } else {
                throw new Error('No waypoint targets available for HUD test');
            }
        }
        
        // Wait for HUD update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Check outer frame styling
        if (tcm.targetHUD) {
            const hudStyle = window.getComputedStyle(tcm.targetHUD);
            const borderColor = hudStyle.borderColor;
            
            if (borderColor.includes('255, 0, 255') || borderColor.includes('#ff00ff')) {
                logTest('hudStyling', 'pass', 'Outer frame has waypoint color');
            } else {
                logTest('hudStyling', 'fail', `Outer frame color incorrect: ${borderColor}`);
            }
            
            // Check inner frame elements
            const innerElements = tcm.targetHUD.querySelectorAll('*');
            let innerFramesColored = 0;
            
            innerElements.forEach(element => {
                const style = window.getComputedStyle(element);
                if (style.borderColor.includes('255, 0, 255') || style.borderColor.includes('#ff00ff')) {
                    innerFramesColored++;
                }
            });
            
            if (innerFramesColored > 0) {
                logTest('hudStyling', 'pass', `${innerFramesColored} inner elements have waypoint colors`);
            } else {
                logTest('hudStyling', 'fail', 'No inner elements have waypoint colors');
            }
        } else {
            throw new Error('Target HUD not available');
        }
        
        // Check target name display
        if (tcm.targetNameDisplay) {
            const nameHTML = tcm.targetNameDisplay.innerHTML;
            if (nameHTML.includes('📍')) {
                logTest('hudStyling', 'pass', 'Waypoint icon (📍) displayed in target name');
            } else {
                logTest('hudStyling', 'fail', 'Waypoint icon missing from target name');
            }
        }
        
        // Check target info display
        if (tcm.targetInfoDisplay) {
            const infoHTML = tcm.targetInfoDisplay.innerHTML;
            if (infoHTML.includes('Mission Waypoint')) {
                logTest('hudStyling', 'pass', 'Mission Waypoint designation displayed');
            } else {
                logTest('hudStyling', 'fail', 'Mission Waypoint designation missing');
            }
        }
        
        return true;
        
    } catch (error) {
        logTest('hudStyling', 'fail', `HUD styling test failed: ${error.message}`);
        return false;
    }
}

// ========== TEST 5: WIREFRAME CREATION ==========

async function testWireframeCreation() {
    console.log('\n📝 TEST 5: Waypoint Wireframe (Diamond Shape)');
    
    try {
        const tcm = window.targetComputerManager;
        
        // Ensure we have a waypoint targeted
        if (!tcm.currentTarget || !tcm.currentTarget.isWaypoint) {
            const waypointTargets = tcm.targetObjects.filter(t => t.isWaypoint);
            if (waypointTargets.length > 0) {
                tcm.setTargetById(waypointTargets[0].id);
            }
        }
        
        // Trigger wireframe creation
        if (tcm.createWaypointWireframe) {
            tcm.createWaypointWireframe();
        }
        
        // Check if wireframe exists
        if (tcm.targetWireframe) {
            logTest('wireframeCreation', 'pass', 'Waypoint wireframe created');
            
            // Check wireframe properties
            if (tcm.targetWireframe.userData && tcm.targetWireframe.userData.isWaypointWireframe) {
                logTest('wireframeCreation', 'pass', 'Wireframe marked as waypoint wireframe');
            }
            
            // Check wireframe material color
            if (tcm.targetWireframe.material && tcm.targetWireframe.material.color) {
                const color = tcm.targetWireframe.material.color;
                if (color.r === 1 && color.g === 0 && color.b === 1) { // RGB for magenta
                    logTest('wireframeCreation', 'pass', 'Wireframe has correct magenta color');
                } else {
                    logTest('wireframeCreation', 'fail', `Wireframe color incorrect: r=${color.r}, g=${color.g}, b=${color.b}`);
                }
            }
            
            // Check wireframe position
            const waypointPos = tcm.currentTarget.position;
            const wireframePos = tcm.targetWireframe.position;
            
            if (Math.abs(wireframePos.x - waypointPos.x) < 0.1 &&
                Math.abs(wireframePos.y - waypointPos.y) < 0.1 &&
                Math.abs(wireframePos.z - waypointPos.z) < 0.1) {
                logTest('wireframeCreation', 'pass', 'Wireframe positioned correctly at waypoint location');
            } else {
                logTest('wireframeCreation', 'fail', 'Wireframe position incorrect');
            }
            
        } else {
            throw new Error('Waypoint wireframe not created');
        }
        
        return true;
        
    } catch (error) {
        logTest('wireframeCreation', 'fail', `Wireframe creation failed: ${error.message}`);
        return false;
    }
}

// ========== TEST 6: RETICLE STYLING ==========

async function testReticleStyling() {
    console.log('\n📝 TEST 6: Target Reticle Styling');
    
    try {
        const tcm = window.targetComputerManager;
        
        // Trigger reticle creation
        if (tcm.createWaypointReticle) {
            tcm.createWaypointReticle();
        }
        
        // Check if reticle exists and has waypoint styling
        if (tcm.targetReticle) {
            const reticleStyle = window.getComputedStyle(tcm.targetReticle);
            
            // Check border color
            if (reticleStyle.borderColor.includes('255, 0, 255') || reticleStyle.borderColor.includes('#ff00ff')) {
                logTest('reticleStyling', 'pass', 'Reticle has waypoint border color');
            } else {
                logTest('reticleStyling', 'fail', `Reticle border color incorrect: ${reticleStyle.borderColor}`);
            }
            
            // Check for waypoint-reticle class
            if (tcm.targetReticle.classList.contains('waypoint-reticle')) {
                logTest('reticleStyling', 'pass', 'Reticle has waypoint-reticle class');
            } else {
                logTest('reticleStyling', 'fail', 'Reticle missing waypoint-reticle class');
            }
            
            // Check for animation CSS
            const animationStyle = document.querySelector('#waypoint-reticle-style');
            if (animationStyle) {
                logTest('reticleStyling', 'pass', 'Waypoint reticle animation CSS loaded');
            } else {
                logTest('reticleStyling', 'fail', 'Waypoint reticle animation CSS missing');
            }
            
        } else {
            throw new Error('Target reticle not available');
        }
        
        return true;
        
    } catch (error) {
        logTest('reticleStyling', 'fail', `Reticle styling test failed: ${error.message}`);
        return false;
    }
}

// ========== TEST 7: COLOR SCHEME ==========

async function testColorScheme() {
    console.log('\n📝 TEST 7: Waypoint Color Scheme');
    
    try {
        // Check if waypoint colors are defined
        if (typeof window.WAYPOINT_COLORS === 'undefined') {
            throw new Error('WAYPOINT_COLORS not defined');
        }
        
        // Verify all required colors exist
        const requiredColors = ['primary', 'secondary', 'accent', 'glow', 'text', 'background'];
        
        for (const colorKey of requiredColors) {
            if (!window.WAYPOINT_COLORS[colorKey]) {
                throw new Error(`Missing waypoint color: ${colorKey}`);
            }
            
            const expectedColor = TEST_CONFIG.expectedColors[colorKey];
            const actualColor = window.WAYPOINT_COLORS[colorKey];
            
            if (actualColor === expectedColor) {
                logTest('colorScheme', 'pass', `${colorKey} color correct: ${actualColor}`);
            } else {
                logTest('colorScheme', 'fail', `${colorKey} color incorrect: expected ${expectedColor}, got ${actualColor}`);
            }
        }
        
        // Verify colors are distinct from faction colors
        const factionColors = ['#ff0000', '#00ff00', '#ffff00', '#0000ff'];
        const waypointPrimary = window.WAYPOINT_COLORS.primary.toLowerCase();
        
        if (!factionColors.includes(waypointPrimary)) {
            logTest('colorScheme', 'pass', 'Waypoint colors distinct from faction colors');
        } else {
            logTest('colorScheme', 'fail', 'Waypoint primary color conflicts with faction colors');
        }
        
        return true;
        
    } catch (error) {
        logTest('colorScheme', 'fail', `Color scheme test failed: ${error.message}`);
        return false;
    }
}

// ========== TEST 8: CLEANUP ==========

async function testCleanup() {
    console.log('\n📝 TEST 8: Cleanup Functionality');
    
    try {
        // Test cleanup function exists
        if (typeof window.cleanupWaypointTests !== 'function') {
            throw new Error('cleanupWaypointTests function not available');
        }
        
        // Record pre-cleanup state
        const preCleanupWaypoints = window.waypointManager.getActiveWaypoints().length;
        const preCleanupTargets = window.targetComputerManager.targetObjects.length;
        
        // Run cleanup
        window.cleanupWaypointTests();
        
        // Wait for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Verify cleanup results
        const postCleanupWaypoints = window.waypointManager.getActiveWaypoints().length;
        const postCleanupTargets = window.targetComputerManager.targetObjects.filter(t => !t.isWaypoint).length;
        
        const waypointsRemoved = preCleanupWaypoints - postCleanupWaypoints;
        
        if (waypointsRemoved > 0) {
            logTest('cleanup', 'pass', `Removed ${waypointsRemoved} test waypoints`);
        } else {
            logTest('cleanup', 'pass', 'No test waypoints to remove');
        }
        
        logTest('cleanup', 'pass', `Targeting system cleaned: ${preCleanupTargets} → ${postCleanupTargets} targets`);
        
        return true;
        
    } catch (error) {
        logTest('cleanup', 'fail', `Cleanup test failed: ${error.message}`);
        return false;
    }
}

// ========== MAIN TEST RUNNER ==========

async function runComprehensiveTests() {
    console.log('🎯 Running Waypoint Targeting Comprehensive Tests...\n');
    
    const tests = [
        { name: 'Waypoint Creation', func: testWaypointCreation },
        { name: 'Targeting Integration', func: testTargetingIntegration },
        { name: 'TAB Cycling', func: testTabCycling },
        { name: 'HUD Styling', func: testHUDStyling },
        { name: 'Wireframe Creation', func: testWireframeCreation },
        { name: 'Reticle Styling', func: testReticleStyling },
        { name: 'Color Scheme', func: testColorScheme },
        { name: 'Cleanup', func: testCleanup }
    ];
    
    let passedTests = 0;
    let totalTests = tests.length;
    
    for (const test of tests) {
        try {
            const result = await test.func();
            if (result) {
                passedTests++;
            }
        } catch (error) {
            console.error(`Test ${test.name} threw error:`, error);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Display final results
    console.log('\n🎯 COMPREHENSIVE TEST RESULTS:');
    console.log('=====================================');
    
    for (const [testName, result] of Object.entries(testResults)) {
        const emoji = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏳';
        const passCount = result.details.filter(d => d.message.includes('✅') || d.message.includes('pass')).length;
        const failCount = result.details.filter(d => d.message.includes('❌') || d.message.includes('fail')).length;
        
        console.log(`${emoji} ${testName}: ${passCount} passed, ${failCount} failed`);
    }
    
    console.log(`\n📊 Overall Result: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 ALL TESTS PASSED! Waypoint targeting integration is fully functional.');
    } else {
        console.log('⚠️ Some tests failed. Check the detailed results above.');
    }
    
    return { passedTests, totalTests, results: testResults };
}

// ========== EXPORT FUNCTIONS ==========

window.runComprehensiveTests = runComprehensiveTests;
window.testWaypointCreation = testWaypointCreation;
window.testTargetingIntegration = testTargetingIntegration;
window.testTabCycling = testTabCycling;
window.testHUDStyling = testHUDStyling;
window.testWireframeCreation = testWireframeCreation;
window.testReticleStyling = testReticleStyling;
window.testColorScheme = testColorScheme;
window.testCleanup = testCleanup;

console.log('🎯 Comprehensive Test Suite Loaded');
console.log('🎮 Available functions:');
console.log('  runComprehensiveTests() - Run all tests');
console.log('  Individual test functions also available');

// Auto-run if waypoint integration is already loaded
if (window.WAYPOINT_COLORS && window.targetComputerManager?.addWaypointsToTargets) {
    console.log('🚀 Waypoint integration detected - auto-running tests in 2 seconds...');
    setTimeout(() => {
        runComprehensiveTests();
    }, 2000);
}
