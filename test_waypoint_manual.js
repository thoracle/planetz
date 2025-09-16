/**
 * 🎯 WAYPOINT TARGETING - MANUAL TESTING SCRIPT
 * 
 * Interactive manual testing functions for hands-on verification
 * Use these functions to manually test specific aspects
 */

console.log('🎮 Waypoint Targeting Manual Testing Script');

// ========== MANUAL TEST FUNCTIONS ==========

/**
 * Create a single test waypoint for manual testing
 */
window.createSingleTestWaypoint = function() {
    console.log('🎯 Creating single test waypoint...');
    
    if (!window.waypointManager) {
        console.error('❌ WaypointManager not available');
        return null;
    }
    
    const waypointId = window.waypointManager.createWaypoint({
        name: 'Manual Test Waypoint',
        position: [-25, 0, 35],
        triggerRadius: 20.0,
        type: 'navigation',
        actions: [{
            type: 'show_message',
            parameters: {
                title: 'Manual Test Success',
                message: 'Manual waypoint targeting test successful!',
                audioFileId: 'discovery_chime'
            }
        }]
    });
    
    console.log(`✅ Created manual test waypoint: ${waypointId}`);
    
    // Auto-target it after a delay
    setTimeout(() => {
        if (window.targetComputerManager) {
            window.targetComputerManager.refreshWaypoints();
            window.targetComputerManager.setTargetById(waypointId);
            console.log('🎯 Auto-targeted manual test waypoint');
        }
    }, 1000);
    
    return waypointId;
};

/**
 * Test TAB cycling manually with step-by-step feedback
 */
window.testTabCyclingManual = function() {
    console.log('🔄 Manual TAB cycling test...');
    
    if (!window.targetComputerManager) {
        console.error('❌ TargetComputerManager not available');
        return;
    }
    
    const tcm = window.targetComputerManager;
    
    // Enable target computer
    if (tcm.enableTargetComputer && !tcm.targetComputerEnabled) {
        tcm.enableTargetComputer();
        console.log('✅ Target computer enabled');
    }
    
    console.log('🎮 Instructions:');
    console.log('  1. Press TAB key to cycle through targets');
    console.log('  2. Watch console for cycling feedback');
    console.log('  3. Look for waypoint targets with 📍 icon');
    console.log('  4. Verify HUD changes to magenta when waypoint is targeted');
    
    // Add cycling feedback
    let cycleCount = 0;
    const originalCycleTarget = tcm.cycleTarget;
    
    tcm.cycleTarget = function(forward = true) {
        cycleCount++;
        const beforeTarget = this.currentTarget?.name || 'none';
        
        // Call original method
        originalCycleTarget.call(this, forward);
        
        const afterTarget = this.currentTarget?.name || 'none';
        const isWaypoint = this.currentTarget?.isWaypoint || false;
        const waypointIcon = isWaypoint ? '📍' : '';
        
        console.log(`🔄 Cycle ${cycleCount}: ${beforeTarget} → ${waypointIcon}${afterTarget} ${isWaypoint ? '(WAYPOINT)' : ''}`);
        
        if (isWaypoint) {
            console.log('🎯 WAYPOINT TARGETED! Check HUD for magenta colors and 📍 icon');
        }
    };
    
    console.log('✅ TAB cycling feedback enabled - press TAB to test');
    
    // Restore original after 30 seconds
    setTimeout(() => {
        tcm.cycleTarget = originalCycleTarget;
        console.log('🔄 TAB cycling feedback disabled');
    }, 30000);
};

/**
 * Test HUD colors manually
 */
window.testHUDColorsManual = function() {
    console.log('🎨 Manual HUD colors test...');
    
    const tcm = window.targetComputerManager;
    
    if (!tcm) {
        console.error('❌ TargetComputerManager not available');
        return;
    }
    
    // Find and target a waypoint
    const waypointTargets = tcm.targetObjects?.filter(t => t.isWaypoint) || [];
    
    if (waypointTargets.length === 0) {
        console.log('⚠️ No waypoints available - creating one...');
        const waypointId = window.createSingleTestWaypoint();
        
        setTimeout(() => {
            window.testHUDColorsManual();
        }, 2000);
        return;
    }
    
    // Target the first waypoint
    tcm.setTargetById(waypointTargets[0].id);
    
    setTimeout(() => {
        console.log('🎨 HUD Color Analysis:');
        
        // Check outer frame
        if (tcm.targetHUD) {
            const hudStyle = window.getComputedStyle(tcm.targetHUD);
            console.log(`  Outer Border: ${hudStyle.borderColor}`);
            console.log(`  Background: ${hudStyle.backgroundColor}`);
            console.log(`  Box Shadow: ${hudStyle.boxShadow}`);
            
            // Check inner elements
            const innerElements = tcm.targetHUD.querySelectorAll('*');
            console.log(`  Inner Elements: ${innerElements.length} found`);
            
            let coloredElements = 0;
            innerElements.forEach((element, index) => {
                const style = window.getComputedStyle(element);
                if (style.borderColor.includes('255, 0, 255') || style.borderColor.includes('#ff00ff')) {
                    coloredElements++;
                    console.log(`    Element ${index}: ✅ Has waypoint color`);
                }
            });
            
            console.log(`  Colored Inner Elements: ${coloredElements}/${innerElements.length}`);
        }
        
        // Check target name
        if (tcm.targetNameDisplay) {
            console.log(`  Target Name: ${tcm.targetNameDisplay.innerHTML}`);
            console.log(`  Has 📍 Icon: ${tcm.targetNameDisplay.innerHTML.includes('📍') ? '✅' : '❌'}`);
        }
        
        // Check target info
        if (tcm.targetInfoDisplay) {
            console.log(`  Target Info: ${tcm.targetInfoDisplay.innerHTML}`);
            console.log(`  Has "Mission Waypoint": ${tcm.targetInfoDisplay.innerHTML.includes('Mission Waypoint') ? '✅' : '❌'}`);
        }
        
    }, 1000);
};

/**
 * Test wireframe creation manually
 */
window.testWireframeManual = function() {
    console.log('💎 Manual wireframe test...');
    
    const tcm = window.targetComputerManager;
    
    if (!tcm) {
        console.error('❌ TargetComputerManager not available');
        return;
    }
    
    // Ensure we have a waypoint targeted
    const waypointTargets = tcm.targetObjects?.filter(t => t.isWaypoint) || [];
    
    if (waypointTargets.length === 0) {
        console.log('⚠️ No waypoints available - creating one...');
        window.createSingleTestWaypoint();
        
        setTimeout(() => {
            window.testWireframeManual();
        }, 2000);
        return;
    }
    
    // Target waypoint and create wireframe
    tcm.setTargetById(waypointTargets[0].id);
    
    setTimeout(() => {
        if (tcm.createWaypointWireframe) {
            tcm.createWaypointWireframe();
        }
        
        console.log('💎 Wireframe Analysis:');
        
        if (tcm.targetWireframe) {
            console.log('  ✅ Wireframe created');
            console.log(`  Position: x=${tcm.targetWireframe.position.x.toFixed(2)}, y=${tcm.targetWireframe.position.y.toFixed(2)}, z=${tcm.targetWireframe.position.z.toFixed(2)}`);
            console.log(`  Scale: ${tcm.targetWireframe.scale.x.toFixed(2)}`);
            
            if (tcm.targetWireframe.material) {
                const color = tcm.targetWireframe.material.color;
                console.log(`  Color: r=${color.r}, g=${color.g}, b=${color.b} ${color.r === 1 && color.g === 0 && color.b === 1 ? '(✅ Magenta)' : '(❌ Not Magenta)'}`);
                console.log(`  Wireframe Mode: ${tcm.targetWireframe.material.wireframe ? '✅' : '❌'}`);
            }
            
            if (tcm.targetWireframe.userData) {
                console.log(`  Is Waypoint Wireframe: ${tcm.targetWireframe.userData.isWaypointWireframe ? '✅' : '❌'}`);
            }
            
        } else {
            console.log('  ❌ Wireframe not created');
        }
        
    }, 1000);
};

/**
 * Test reticle styling manually
 */
window.testReticleManual = function() {
    console.log('🎯 Manual reticle test...');
    
    const tcm = window.targetComputerManager;
    
    if (!tcm) {
        console.error('❌ TargetComputerManager not available');
        return;
    }
    
    // Ensure we have a waypoint targeted
    const waypointTargets = tcm.targetObjects?.filter(t => t.isWaypoint) || [];
    
    if (waypointTargets.length === 0) {
        console.log('⚠️ No waypoints available - creating one...');
        window.createSingleTestWaypoint();
        
        setTimeout(() => {
            window.testReticleManual();
        }, 2000);
        return;
    }
    
    // Target waypoint and create reticle
    tcm.setTargetById(waypointTargets[0].id);
    
    setTimeout(() => {
        if (tcm.createWaypointReticle) {
            tcm.createWaypointReticle();
        }
        
        console.log('🎯 Reticle Analysis:');
        
        if (tcm.targetReticle) {
            const reticleStyle = window.getComputedStyle(tcm.targetReticle);
            
            console.log('  ✅ Reticle exists');
            console.log(`  Border Color: ${reticleStyle.borderColor}`);
            console.log(`  Background: ${reticleStyle.backgroundColor}`);
            console.log(`  Box Shadow: ${reticleStyle.boxShadow}`);
            console.log(`  Has waypoint-reticle class: ${tcm.targetReticle.classList.contains('waypoint-reticle') ? '✅' : '❌'}`);
            
            // Check animation CSS
            const animationStyle = document.querySelector('#waypoint-reticle-style');
            console.log(`  Animation CSS loaded: ${animationStyle ? '✅' : '❌'}`);
            
        } else {
            console.log('  ❌ Reticle not available');
        }
        
    }, 1000);
};

/**
 * Debug targeting system state
 */
window.debugTargetingState = function() {
    console.log('🔍 Targeting System Debug Info:');
    
    if (window.targetComputerManager) {
        const tcm = window.targetComputerManager;
        
        console.log('📊 Target Computer Manager:');
        console.log(`  Enabled: ${tcm.targetComputerEnabled}`);
        console.log(`  Current Target: ${tcm.currentTarget?.name || 'none'}`);
        console.log(`  Target Index: ${tcm.targetIndex}`);
        console.log(`  Total Targets: ${tcm.targetObjects?.length || 0}`);
        
        if (tcm.targetObjects) {
            const waypoints = tcm.targetObjects.filter(t => t.isWaypoint);
            const regular = tcm.targetObjects.filter(t => !t.isWaypoint);
            
            console.log(`  Waypoint Targets: ${waypoints.length}`);
            console.log(`  Regular Targets: ${regular.length}`);
            
            if (waypoints.length > 0) {
                console.log('📍 Waypoint Targets:');
                waypoints.forEach((wp, index) => {
                    console.log(`    ${index + 1}. ${wp.name} (${wp.id}) - Distance: ${wp.distance?.toFixed(2) || 'N/A'}`);
                });
            }
        }
        
        console.log('🎨 Integration Status:');
        console.log(`  addWaypointsToTargets: ${typeof tcm.addWaypointsToTargets === 'function' ? '✅' : '❌'}`);
        console.log(`  refreshWaypoints: ${typeof tcm.refreshWaypoints === 'function' ? '✅' : '❌'}`);
        console.log(`  setWaypointHUDColors: ${typeof tcm.setWaypointHUDColors === 'function' ? '✅' : '❌'}`);
        console.log(`  createWaypointWireframe: ${typeof tcm.createWaypointWireframe === 'function' ? '✅' : '❌'}`);
        console.log(`  createWaypointReticle: ${typeof tcm.createWaypointReticle === 'function' ? '✅' : '❌'}`);
        
        console.log('🏷️ Integration Flags:');
        console.log(`  _waypointsAdded: ${tcm._waypointsAdded || false}`);
        console.log(`  _waypointStyleApplied: ${tcm._waypointStyleApplied || false}`);
    }
    
    if (window.waypointManager) {
        const activeWaypoints = window.waypointManager.getActiveWaypoints();
        console.log(`📍 Waypoint Manager: ${activeWaypoints.length} active waypoints`);
        
        activeWaypoints.forEach((wp, index) => {
            console.log(`    ${index + 1}. ${wp.name} (${wp.id}) - Status: ${wp.status}`);
        });
    }
    
    if (window.WAYPOINT_COLORS) {
        console.log('🎨 Waypoint Colors:');
        Object.entries(window.WAYPOINT_COLORS).forEach(([key, value]) => {
            console.log(`    ${key}: ${value}`);
        });
    }
};

/**
 * Quick integration check
 */
window.quickIntegrationCheck = function() {
    console.log('⚡ Quick Integration Check:');
    
    const checks = [
        { name: 'WaypointManager', check: () => !!window.waypointManager },
        { name: 'TargetComputerManager', check: () => !!window.targetComputerManager },
        { name: 'WAYPOINT_COLORS', check: () => !!window.WAYPOINT_COLORS },
        { name: 'addWaypointsToTargets', check: () => typeof window.targetComputerManager?.addWaypointsToTargets === 'function' },
        { name: 'refreshWaypoints', check: () => typeof window.targetComputerManager?.refreshWaypoints === 'function' },
        { name: 'setWaypointHUDColors', check: () => typeof window.targetComputerManager?.setWaypointHUDColors === 'function' },
        { name: 'createWaypointWireframe', check: () => typeof window.targetComputerManager?.createWaypointWireframe === 'function' },
        { name: 'createWaypointReticle', check: () => typeof window.targetComputerManager?.createWaypointReticle === 'function' }
    ];
    
    let passedChecks = 0;
    
    checks.forEach(check => {
        const result = check.check();
        const emoji = result ? '✅' : '❌';
        console.log(`  ${emoji} ${check.name}`);
        if (result) passedChecks++;
    });
    
    console.log(`📊 Integration Status: ${passedChecks}/${checks.length} components available`);
    
    if (passedChecks === checks.length) {
        console.log('🎉 All integration components available!');
    } else {
        console.log('⚠️ Some integration components missing - load waypoint integration first');
    }
    
    return passedChecks === checks.length;
};

// ========== AUTO-SETUP ==========

console.log('🎮 Manual Testing Functions Loaded:');
console.log('  createSingleTestWaypoint() - Create one test waypoint');
console.log('  testTabCyclingManual() - Test TAB cycling with feedback');
console.log('  testHUDColorsManual() - Test HUD color changes');
console.log('  testWireframeManual() - Test wireframe creation');
console.log('  testReticleManual() - Test reticle styling');
console.log('  debugTargetingState() - Show detailed system state');
console.log('  quickIntegrationCheck() - Quick integration status check');

// Auto-run integration check
setTimeout(() => {
    quickIntegrationCheck();
}, 1000);
