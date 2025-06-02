// Target Cycling Fix Test
// Run this in the browser console to test target cycling after ship destruction

(function() {
    console.log('=== Target Cycling Fix Test ===');
    
    // Get the game components
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    const targetComputer = ship?.getSystem('target_computer');
    
    if (!starfieldManager || !ship || !targetComputer) {
        console.error('❌ Game not ready. Make sure you have a ship and targeting computer.');
        return;
    }
    
    // Create some target dummy ships if none exist
    if (!starfieldManager.targetDummyShips || starfieldManager.targetDummyShips.length === 0) {
        console.log('🎯 Creating target dummy ships for testing...');
        starfieldManager.createTargetDummyShips(3);
        // Wait a moment for ships to be created
        setTimeout(() => testTargetCycling(), 1000);
        return;
    }
    
    function testTargetCycling() {
        console.log('📊 Current game state:');
        console.log(`   • Target dummy ships: ${starfieldManager.targetDummyShips.length}`);
        console.log(`   • Target list length: ${starfieldManager.targetList ? starfieldManager.targetList.length : 'undefined'}`);
        
        // Update target list
        starfieldManager.updateTargetList();
        
        if (!starfieldManager.targetList || starfieldManager.targetList.length === 0) {
            console.error('❌ No targets available for testing');
            return;
        }
        
        console.log(`   • Updated target list: ${starfieldManager.targetList.length} targets`);
        
        // Show all available targets
        console.log('🎯 Available targets:');
        starfieldManager.targetList.forEach((target, index) => {
            console.log(`   ${index + 1}. ${target.name} (${target.faction})`);
        });
        
        // Cycle to first target
        starfieldManager.cycleTarget();
        const initialTarget = starfieldManager.getCurrentTargetData();
        
        if (!initialTarget) {
            console.error('❌ Failed to target first ship');
            return;
        }
        
        console.log(`✅ Initial target: ${initialTarget.name}`);
        console.log(`   • Ship: ${initialTarget.ship?.shipName || 'N/A'}`);
        console.log(`   • Hull: ${initialTarget.ship?.currentHull || 'N/A'}/${initialTarget.ship?.maxHull || 'N/A'}`);
        
        // Test 1: Manual cycling (should work)
        console.log('\n🔄 Test 1: Manual target cycling...');
        const targetsBeforeManual = starfieldManager.targetList.length;
        starfieldManager.cycleTarget();
        const afterManualTarget = starfieldManager.getCurrentTargetData();
        console.log(`   • New target: ${afterManualTarget?.name || 'none'}`);
        console.log(`   • Targets still available: ${starfieldManager.targetList.length}`);
        
        // Cycle back to first target for destruction test
        while (starfieldManager.getCurrentTargetData()?.name !== initialTarget.name) {
            starfieldManager.cycleTarget();
        }
        
        // Test 2: Destruction and automatic cycling
        console.log('\n💥 Test 2: Ship destruction and automatic cycling...');
        const currentTarget = starfieldManager.getCurrentTargetData();
        const currentTargetName = currentTarget.name;
        const targetsBeforeDestruction = starfieldManager.targetList.length;
        
        console.log(`   • About to destroy: ${currentTargetName}`);
        console.log(`   • Targets before destruction: ${targetsBeforeDestruction}`);
        
        // Destroy the current target's ship
        if (currentTarget.ship) {
            console.log('   • Applying fatal damage...');
            currentTarget.ship.currentHull = 0; // Set hull to 0
            
            // Simulate the weapon system calling removeDestroyedTarget
            starfieldManager.removeDestroyedTarget(currentTarget.ship);
            
            // Check results
            setTimeout(() => {
                const newTarget = starfieldManager.getCurrentTargetData();
                const targetsAfterDestruction = starfieldManager.targetList.length;
                
                console.log('\n📊 Results:');
                console.log(`   • Targets after destruction: ${targetsAfterDestruction}`);
                console.log(`   • New target: ${newTarget?.name || 'none'}`);
                console.log(`   • Target changed: ${newTarget?.name !== currentTargetName ? '✅ YES' : '❌ NO'}`);
                
                if (newTarget && newTarget.name !== currentTargetName) {
                    console.log('🎉 SUCCESS: Target cycling works after destruction!');
                } else if (!newTarget && targetsAfterDestruction === 0) {
                    console.log('✅ SUCCESS: No targets left, properly cleared!');
                } else {
                    console.log('❌ FAILURE: Target cycling did not work properly');
                    console.log('   Expected: Different target or no targets');
                    console.log(`   Actual: ${newTarget?.name || 'no target'}`);
                }
                
                // Test HUD state
                console.log('\n🖥️ HUD State Check:');
                const hudElement = document.getElementById('target-computer-hud');
                if (hudElement && hudElement.style.display !== 'none') {
                    const targetName = hudElement.querySelector('.target-name')?.textContent;
                    const targetFaction = hudElement.querySelector('.target-faction')?.textContent;
                    console.log(`   • HUD target name: "${targetName}"`);
                    console.log(`   • HUD target faction: "${targetFaction}"`);
                    
                    if (targetName === currentTargetName) {
                        console.log('❌ HUD still shows destroyed target');
                    } else {
                        console.log('✅ HUD updated correctly');
                    }
                    
                    // Check for "Unknown" targets which indicate incomplete updates
                    if (targetName && targetName.toLowerCase().includes('unknown')) {
                        console.log('⚠️ Warning: Target showing as "Unknown" - may indicate incomplete update');
                    }
                }
                
                // Test target data accuracy
                console.log('\n📊 Target Data Accuracy Check:');
                const newTargetData = starfieldManager.getCurrentTargetData();
                if (newTargetData) {
                    console.log(`   • New target name: ${newTargetData.name}`);
                    console.log(`   • New target type: ${newTargetData.type || 'undefined'}`);
                    console.log(`   • Is ship: ${newTargetData.isShip || false}`);
                    console.log(`   • Faction: ${newTargetData.faction || 'undefined'}`);
                    
                    // Check if target data seems complete
                    if (!newTargetData.name || newTargetData.name.toLowerCase().includes('unknown')) {
                        console.log('❌ Target data incomplete - name missing or unknown');
                    } else if (!newTargetData.faction) {
                        console.log('❌ Target data incomplete - faction missing');
                    } else {
                        console.log('✅ Target data appears complete');
                    }
                } else {
                    console.log('❌ No target data available');
                }
                
                // Test target computer and sub-targeting setup
                console.log('\n🎯 Target Computer State Check:');
                const targetComputer = ship?.getSystem('target_computer');
                
                if (targetComputer) {
                    const newTargetData = starfieldManager.getCurrentTargetData();
                    console.log(`   • Target Computer current target: ${targetComputer.currentTarget?.shipName || 'none'}`);
                    console.log(`   • New target data: ${newTargetData?.name || 'none'} (isShip: ${newTargetData?.isShip || false})`);
                    
                    if (newTargetData?.isShip && newTargetData?.ship) {
                        console.log(`   • Available sub-targets: ${targetComputer.availableSubTargets.length}`);
                        if (targetComputer.availableSubTargets.length > 0) {
                            console.log(`   • Current sub-target: ${targetComputer.currentSubTarget?.displayName || 'none'}`);
                            console.log('✅ Sub-targeting properly initialized');
                        } else {
                            console.log('❌ No sub-targets available (target computer not properly set up)');
                        }
                        
                        // Test target computer target matches current target
                        if (targetComputer.currentTarget === newTargetData.ship) {
                            console.log('✅ Target computer properly linked to new target');
                        } else {
                            console.log('❌ Target computer not linked to new target');
                        }
                    } else {
                        console.log('   • New target is not an enemy ship - sub-targeting not applicable');
                    }
                }
                
                // Test wireframe color (should be red for enemy ships, not white)
                console.log('\n🎨 Wireframe Color Check:');
                if (starfieldManager.targetWireframe) {
                    const wireframeMaterial = starfieldManager.targetWireframe.material;
                    const wireframeColor = wireframeMaterial.color.getHex();
                    const colorString = `#${wireframeColor.toString(16).padStart(6, '0')}`;
                    console.log(`   • Wireframe color: ${colorString}`);
                    
                    // Determine expected color based on target type
                    const targetData = starfieldManager.getCurrentTargetData();
                    let expectedColor = '(unknown)';
                    if (targetData?.isShip) {
                        expectedColor = '#ff3333 (enemy red)';
                    } else if (targetData?.faction === 'friendly') {
                        expectedColor = '#00ff41 (friendly green)';
                    } else if (targetData?.faction === 'neutral') {
                        expectedColor = '#ffff00 (neutral yellow)';
                    }
                    
                    console.log(`   • Expected color: ${expectedColor}`);
                    
                    // Check for common issues
                    if (wireframeColor === 0xffffff) {
                        console.log('⚠️ Warning: Wireframe is white - may indicate incomplete update');
                    } else if (wireframeColor === 0x808080) {
                        console.log('⚠️ Warning: Wireframe is gray - may indicate unknown/uninitialized target');
                    } else {
                        console.log('✅ Wireframe color appears correct');
                    }
                } else {
                    console.log('❌ No wireframe found');
                }
            }, 100);
        } else {
            console.log('❌ Current target has no ship object');
        }
    }
    
    testTargetCycling();
    
    // Helper function to reset test environment
    window.resetTargetTest = function() {
        console.log('🔄 Resetting target test environment...');
        starfieldManager.clearTargetDummyShips();
        starfieldManager.clearTargetComputer();
        starfieldManager.createTargetDummyShips(3);
        console.log('✅ Test environment reset');
    };
    
    console.log('\n💡 Use resetTargetTest() to reset the test environment');
    
})(); 