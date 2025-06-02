// Destruction Wireframe Fix Test
// Run this in the browser console to test wireframe and display issues after target destruction

(function() {
    console.log('=== Destruction Wireframe Fix Test ===');
    
    // Get the game components
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    const targetComputer = ship?.getSystem('target_computer');
    
    if (!starfieldManager || !ship || !targetComputer) {
        console.error('❌ Game not ready. Make sure you have a ship and targeting computer.');
        return;
    }
    
    // Ensure we have target dummy ships
    if (!starfieldManager.targetDummyShips || starfieldManager.targetDummyShips.length === 0) {
        console.log('🎯 Creating target dummy ships for testing...');
        starfieldManager.createTargetDummyShips(3);
        setTimeout(() => runDestructionWireframeTest(), 1000);
        return;
    }
    
    function captureTargetState(label) {
        const currentTarget = starfieldManager.getCurrentTargetData();
        const wireframe = starfieldManager.targetWireframe;
        
        const state = {
            label: label,
            timestamp: Date.now(),
            target: {
                name: currentTarget?.name || 'none',
                type: currentTarget?.type || 'undefined',
                faction: currentTarget?.faction || 'undefined',
                isShip: currentTarget?.isShip || false,
                diplomacy: currentTarget?.diplomacy || 'undefined'
            },
            wireframe: {
                exists: !!wireframe,
                color: wireframe ? `#${wireframe.material.color.getHex().toString(16).padStart(6, '0')}` : 'none',
                opacity: wireframe?.material.opacity || 'none'
            },
            targetComputer: {
                currentTarget: targetComputer.currentTarget?.shipName || 'none',
                subTargetsAvailable: targetComputer.availableSubTargets?.length || 0,
                currentSubTarget: targetComputer.currentSubTarget?.displayName || 'none'
            }
        };
        
        console.log(`📸 State Capture: ${label}`);
        console.log(`   • Target: ${state.target.name} (${state.target.faction})`);
        console.log(`   • Wireframe: ${state.wireframe.color}`);
        console.log(`   • Target Computer: ${state.targetComputer.currentTarget}`);
        
        return state;
    }
    
    function compareStates(before, after) {
        console.log(`\n🔍 Comparing: ${before.label} → ${after.label}`);
        
        // Compare target info
        if (before.target.name !== after.target.name) {
            console.log(`   • Target changed: "${before.target.name}" → "${after.target.name}"`);
        }
        if (before.target.faction !== after.target.faction) {
            console.log(`   • Faction changed: "${before.target.faction}" → "${after.target.faction}"`);
        }
        if (before.wireframe.color !== after.wireframe.color) {
            console.log(`   • Wireframe color changed: "${before.wireframe.color}" → "${after.wireframe.color}"`);
        }
        
        // Check for issues
        if (after.target.name.toLowerCase().includes('unknown')) {
            console.log('   ❌ Issue: Target showing as "Unknown"');
        }
        if (after.wireframe.color === '#ffffff') {
            console.log('   ❌ Issue: Wireframe is white (incomplete update)');
        }
        if (after.wireframe.color === '#808080') {
            console.log('   ❌ Issue: Wireframe is gray (uninitialized)');
        }
        if (after.target.faction === 'undefined') {
            console.log('   ❌ Issue: Faction is undefined');
        }
    }
    
    function runDestructionWireframeTest() {
        console.log('🎯 Testing destruction wireframe behavior...');
        
        // Ensure target computer is enabled
        if (!starfieldManager.targetComputerEnabled) {
            console.log('🎯 Enabling target computer...');
            starfieldManager.toggleTargetComputer();
        }
        
        // Cycle to an enemy ship target
        starfieldManager.updateTargetList();
        if (starfieldManager.targetObjects.length === 0) {
            console.error('❌ No targets available');
            return;
        }
        
        // Find an enemy ship target for destruction
        let foundEnemyShip = false;
        const originalTargetCount = starfieldManager.targetObjects.length;
        
        for (let i = 0; i < originalTargetCount; i++) {
            starfieldManager.cycleTarget();
            const currentTarget = starfieldManager.getCurrentTargetData();
            if (currentTarget?.isShip && currentTarget?.ship) {
                foundEnemyShip = true;
                console.log(`✅ Found enemy ship for destruction test: ${currentTarget.name}`);
                break;
            }
        }
        
        if (!foundEnemyShip) {
            console.error('❌ No enemy ships found for destruction test');
            return;
        }
        
        // Capture state before destruction
        const beforeDestruction = captureTargetState('Before Destruction');
        const targetToDestroy = starfieldManager.getCurrentTargetData();
        
        console.log('\n💥 Destroying current target...');
        
        // Destroy the current target
        if (targetToDestroy.ship) {
            targetToDestroy.ship.currentHull = 0; // Destroy the ship
            
            // Trigger destruction cleanup
            starfieldManager.removeDestroyedTarget(targetToDestroy.ship);
            
            // Capture state immediately after destruction
            setTimeout(() => {
                const afterDestruction = captureTargetState('Immediately After Destruction');
                compareStates(beforeDestruction, afterDestruction);
                
                // Wait for any delayed updates
                setTimeout(() => {
                    const afterDelay = captureTargetState('After 100ms Delay');
                    compareStates(afterDestruction, afterDelay);
                    
                    // Test manual Tab cycling to compare
                    console.log('\n🔄 Testing manual Tab cycling for comparison...');
                    const beforeManualCycle = captureTargetState('Before Manual Tab');
                    
                    starfieldManager.cycleTarget();
                    
                    setTimeout(() => {
                        const afterManualCycle = captureTargetState('After Manual Tab');
                        compareStates(beforeManualCycle, afterManualCycle);
                        
                        // Final summary
                        console.log('\n📋 Test Summary:');
                        console.log('   • Check if automatic cycling matches manual Tab cycling');
                        console.log('   • Look for "Unknown" targets or missing faction info');
                        console.log('   • Verify wireframe colors match target types');
                        console.log('   • Ensure target computer is properly linked');
                        
                    }, 100);
                }, 100);
            }, 100);
        } else {
            console.error('❌ Target has no ship object to destroy');
        }
    }
    
    // Helper function for manual testing
    window.testDestructionState = function() {
        console.log('\n🔄 Manual State Check:');
        captureTargetState('Manual Check');
        
        // Force update display
        starfieldManager.updateTargetDisplay();
        
        setTimeout(() => {
            captureTargetState('After Manual Update');
        }, 50);
    };
    
    runDestructionWireframeTest();
    
    console.log('\n💡 Use testDestructionState() to manually check current state');
    
})();

// Enhanced Destruction and Synchronization Test
(async function() {
    console.log('🧪 === ENHANCED DESTRUCTION SYNCHRONIZATION TEST ===');
    
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    
    if (!starfieldManager || !ship) {
        console.error('❌ Game components not ready');
        return;
    }
    
    // Create 3 test dummies using the correct async method
    console.log('🏗️ Creating 3 test target dummies...');
    
    try {
        await starfieldManager.createTargetDummyShips(3);
        console.log(`✅ Created 3 target dummy ships`);
        
        // Verify we have the expected ships
        const dummyShips = starfieldManager.dummyShipMeshes || [];
        console.log(`✅ Found ${dummyShips.length} dummy ship meshes`);
        
        dummyShips.forEach((mesh, index) => {
            const ship = mesh.userData?.ship;
            if (ship) {
                console.log(`✅ Target Dummy ${index + 1}: ${ship.shipName} - Hull: ${ship.currentHull}/${ship.maxHull}`);
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to create target dummies:', error);
        return;
    }
    
    // Update target list and set to first dummy
    starfieldManager.updateTargetList();
    starfieldManager.targetIndex = -1;
    starfieldManager.cycleTarget();
    
    console.log('\n🎯 Initial targeting setup...');
    
    // Wait a moment for everything to settle
    setTimeout(() => {
        // Verify initial state
        const initialTargetData = starfieldManager.getCurrentTargetData();
        const targetComputer = ship.getSystem('target_computer');
        
        console.log('\n📊 INITIAL STATE:');
        console.log(`   • HUD target: ${initialTargetData?.name || 'none'} (${initialTargetData?.type})`);
        console.log(`   • HUD currentTarget object: ${starfieldManager.currentTarget?.name || 'none'}`);
        console.log(`   • Weapon locked target: ${ship.weaponSystem?.lockedTarget?.name || 'none'}`);
        console.log(`   • Target computer target: ${targetComputer?.currentTarget?.shipName || 'none'}`);
        console.log(`   • Available targets: ${starfieldManager.targetObjects?.length || 0}`);
        
        if (initialTargetData && initialTargetData.isShip) {
            console.log('\n💥 Simulating destruction of current target...');
            
            // Get the ship we're about to destroy
            const targetToDestroy = initialTargetData.ship;
            console.log(`🎯 Destroying: ${targetToDestroy.shipName}`);
            
            // Show pre-destruction synchronization
            console.log('\n📊 PRE-DESTRUCTION SYNCHRONIZATION:');
            console.log(`   • HUD targets this ship: ${starfieldManager.currentTarget === initialTargetData.object}`);
            console.log(`   • Weapon targets this ship: ${ship.weaponSystem.lockedTarget === targetToDestroy.mesh}`);
            console.log(`   • Target computer targets this ship: ${targetComputer?.currentTarget === targetToDestroy}`);
            
            // Destroy the target (simulate hull reaching 0)
            targetToDestroy.currentHull = 0;
            
            // Call the destruction handling
            starfieldManager.removeDestroyedTarget(targetToDestroy);
            
            // Check immediately after destruction call
            setTimeout(() => {
                console.log('\n📊 IMMEDIATELY AFTER DESTRUCTION:');
                
                const newTargetData = starfieldManager.getCurrentTargetData();
                console.log(`   • New HUD target: ${newTargetData?.name || 'none'} (${newTargetData?.type})`);
                console.log(`   • HUD currentTarget object: ${starfieldManager.currentTarget?.name || 'none'}`);
                console.log(`   • Weapon locked target: ${ship.weaponSystem?.lockedTarget?.name || 'none'}`);
                console.log(`   • Target computer target: ${targetComputer?.currentTarget?.shipName || 'none'}`);
                console.log(`   • Available targets: ${starfieldManager.targetObjects?.length || 0}`);
                
                // Check if all systems are now synchronized
                let allSynced = true;
                let syncReport = '\n🔄 SYNCHRONIZATION STATUS:';
                
                if (newTargetData) {
                    // Check HUD vs Weapon synchronization
                    const hudTargetObject = starfieldManager.currentTarget;
                    const weaponTargetObject = ship.weaponSystem?.lockedTarget;
                    
                    if (hudTargetObject === weaponTargetObject) {
                        syncReport += '\n   ✅ HUD and Weapon systems synchronized';
                    } else {
                        syncReport += '\n   ❌ HUD and Weapon systems NOT synchronized';
                        syncReport += `\n      • HUD: ${hudTargetObject?.name || 'none'}`;
                        syncReport += `\n      • Weapon: ${weaponTargetObject?.name || 'none'}`;
                        allSynced = false;
                    }
                    
                    // Check HUD vs Target Computer synchronization
                    if (newTargetData.isShip && newTargetData.ship) {
                        if (targetComputer?.currentTarget === newTargetData.ship) {
                            syncReport += '\n   ✅ HUD and Target Computer synchronized';
                        } else {
                            syncReport += '\n   ❌ HUD and Target Computer NOT synchronized';
                            syncReport += `\n      • HUD ship: ${newTargetData.ship?.shipName || 'none'}`;
                            syncReport += `\n      • Target Computer: ${targetComputer?.currentTarget?.shipName || 'none'}`;
                            allSynced = false;
                        }
                    } else {
                        // For celestial objects, target computer should be clear
                        if (!targetComputer?.currentTarget) {
                            syncReport += '\n   ✅ Target Computer correctly cleared for celestial object';
                        } else {
                            syncReport += '\n   ❌ Target Computer should be clear for celestial object';
                            allSynced = false;
                        }
                    }
                    
                    // Check wireframe color
                    if (starfieldManager.targetWireframe && starfieldManager.targetWireframe.material) {
                        const wireframeColor = starfieldManager.targetWireframe.material.color.getHex();
                        const colorString = `#${wireframeColor.toString(16).padStart(6, '0')}`;
                        syncReport += `\n   🎨 Wireframe color: ${colorString}`;
                        
                        // Check if color matches faction
                        if (newTargetData.faction === 'player') {
                            const isGreen = wireframeColor === 0x00ff00;
                            syncReport += isGreen ? ' ✅ (correct green for friendly)' : ' ❌ (should be green for friendly)';
                            if (!isGreen) allSynced = false;
                        } else if (newTargetData.faction === 'enemy') {
                            const isRed = wireframeColor === 0xff0000;
                            syncReport += isRed ? ' ✅ (correct red for enemy)' : ' ❌ (should be red for enemy)';
                            if (!isRed) allSynced = false;
                        }
                    }
                    
                } else {
                    syncReport += '\n   ❌ No target data available';
                    allSynced = false;
                }
                
                console.log(syncReport);
                
                // Final verdict
                if (allSynced) {
                    console.log('\n🎉 ✅ ALL SYSTEMS PROPERLY SYNCHRONIZED AFTER DESTRUCTION!');
                } else {
                    console.log('\n⚠️ ❌ Synchronization issues detected - manual Tab cycling may be needed');
                }
                
                // Test manual cycling for comparison
                console.log('\n🔄 Testing manual Tab cycling for comparison...');
                starfieldManager.cycleTarget();
                
                setTimeout(() => {
                    const manualTargetData = starfieldManager.getCurrentTargetData();
                    console.log(`\n📊 AFTER MANUAL TAB CYCLING:`);
                    console.log(`   • Target: ${manualTargetData?.name || 'none'} (${manualTargetData?.type})`);
                    console.log(`   • HUD currentTarget: ${starfieldManager.currentTarget?.name || 'none'}`);
                    console.log(`   • Weapon target: ${ship.weaponSystem?.lockedTarget?.name || 'none'}`);
                    console.log(`   • Target computer: ${targetComputer?.currentTarget?.shipName || 'none'}`);
                    
                    if (starfieldManager.targetWireframe && starfieldManager.targetWireframe.material) {
                        const wireframeColor = starfieldManager.targetWireframe.material.color.getHex();
                        const colorString = `#${wireframeColor.toString(16).padStart(6, '0')}`;
                        console.log(`   • Wireframe color: ${colorString}`);
                    }
                    
                    console.log('\n🧪 === TEST COMPLETE ===');
                }, 100);
                
            }, 150); // Wait for async operations to complete
            
        } else {
            console.log('❌ Initial target is not a ship - cycle to a ship target first');
            console.log('🔄 Cycling through targets to find a ship...');
            
            // Try cycling through a few targets to find a ship
            let attempts = 0;
            const maxAttempts = 10;
            
            const findShipTarget = () => {
                if (attempts >= maxAttempts) {
                    console.log('❌ No ship targets found after multiple attempts');
                    return;
                }
                
                starfieldManager.cycleTarget();
                attempts++;
                
                const currentData = starfieldManager.getCurrentTargetData();
                if (currentData && currentData.isShip) {
                    console.log(`✅ Found ship target: ${currentData.name}`);
                    // Restart the test with the ship target
                    setTimeout(() => {
                        console.log('\n🔄 Restarting test with ship target...');
                        // Trigger the destruction test again
                        // (This would ideally restart the whole test, but for simplicity just log)
                        console.log('💡 Please run the test again - now targeting a ship');
                    }, 100);
                } else {
                    setTimeout(findShipTarget, 100);
                }
            };
            
            findShipTarget();
        }
        
    }, 100);
    
})();

// Quick Synchronization Test (uses existing targets)
window.testDestructionFix = function() {
    console.log('🧪 === QUICK DESTRUCTION SYNCHRONIZATION TEST ===');
    
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    
    if (!starfieldManager || !ship) {
        console.error('❌ Game components not ready');
        return;
    }
    
    // Check current target
    const currentTargetData = starfieldManager.getCurrentTargetData();
    const targetComputer = ship.getSystem('target_computer');
    
    console.log('\n📊 CURRENT STATE:');
    console.log(`   • HUD target: ${currentTargetData?.name || 'none'} (${currentTargetData?.type})`);
    console.log(`   • HUD currentTarget object: ${starfieldManager.currentTarget?.name || 'none'}`);
    console.log(`   • Weapon locked target: ${ship.weaponSystem?.lockedTarget?.name || 'none'}`);
    console.log(`   • Target computer target: ${targetComputer?.currentTarget?.shipName || 'none'}`);
    console.log(`   • Available targets: ${starfieldManager.targetObjects?.length || 0}`);
    
    if (starfieldManager.targetWireframe && starfieldManager.targetWireframe.material) {
        const wireframeColor = starfieldManager.targetWireframe.material.color.getHex();
        const colorString = `#${wireframeColor.toString(16).padStart(6, '0')}`;
        console.log(`   • Wireframe color: ${colorString}`);
    }
    
    if (currentTargetData && currentTargetData.isShip) {
        console.log('\n💥 Testing destruction of current ship target...');
        
        const targetToDestroy = currentTargetData.ship;
        console.log(`🎯 Will destroy: ${targetToDestroy.shipName}`);
        
        // Show pre-destruction synchronization
        console.log('\n📊 PRE-DESTRUCTION SYNCHRONIZATION:');
        console.log(`   • HUD targets this ship: ${starfieldManager.currentTarget === currentTargetData.object}`);
        console.log(`   • Weapon targets this ship: ${ship.weaponSystem.lockedTarget === targetToDestroy.mesh}`);
        console.log(`   • Target computer targets this ship: ${targetComputer?.currentTarget === targetToDestroy}`);
        
        // Destroy the target
        targetToDestroy.currentHull = 0;
        starfieldManager.removeDestroyedTarget(targetToDestroy);
        
        // Check results after a delay
        setTimeout(() => {
            console.log('\n📊 AFTER DESTRUCTION:');
            
            const newTargetData = starfieldManager.getCurrentTargetData();
            console.log(`   • New HUD target: ${newTargetData?.name || 'none'} (${newTargetData?.type})`);
            console.log(`   • HUD currentTarget object: ${starfieldManager.currentTarget?.name || 'none'}`);
            console.log(`   • Weapon locked target: ${ship.weaponSystem?.lockedTarget?.name || 'none'}`);
            console.log(`   • Target computer target: ${targetComputer?.currentTarget?.shipName || 'none'}`);
            
            if (starfieldManager.targetWireframe && starfieldManager.targetWireframe.material) {
                const wireframeColor = starfieldManager.targetWireframe.material.color.getHex();
                const colorString = `#${wireframeColor.toString(16).padStart(6, '0')}`;
                console.log(`   • Wireframe color: ${colorString}`);
            }
            
            // Synchronization check
            const hudTargetObject = starfieldManager.currentTarget;
            const weaponTargetObject = ship.weaponSystem?.lockedTarget;
            
            if (hudTargetObject === weaponTargetObject) {
                console.log('\n✅ HUD and Weapon systems are synchronized!');
            } else {
                console.log('\n❌ HUD and Weapon systems are NOT synchronized!');
                console.log(`   • HUD targets: ${hudTargetObject?.name || 'none'}`);
                console.log(`   • Weapon targets: ${weaponTargetObject?.name || 'none'}`);
            }
            
            if (newTargetData) {
                if (newTargetData.isShip && newTargetData.ship) {
                    if (targetComputer?.currentTarget === newTargetData.ship) {
                        console.log('✅ Target Computer synchronized with HUD!');
                    } else {
                        console.log('❌ Target Computer NOT synchronized with HUD!');
                    }
                } else {
                    if (!targetComputer?.currentTarget) {
                        console.log('✅ Target Computer correctly cleared for celestial object!');
                    } else {
                        console.log('❌ Target Computer should be clear for celestial object!');
                    }
                }
            }
            
            console.log('\n🧪 === QUICK TEST COMPLETE ===');
            console.log('💡 Try Tab cycling manually to compare behavior');
            
        }, 200);
        
    } else {
        console.log('\n⚠️ Current target is not a ship. Please Tab to a ship target first.');
        console.log('💡 Available target types:');
        
        if (starfieldManager.targetObjects) {
            starfieldManager.targetObjects.forEach((target, index) => {
                const current = index === starfieldManager.targetIndex ? ' ← CURRENT' : '';
                console.log(`   ${index}. ${target.name} (${target.isShip ? 'ship' : 'celestial'})${current}`);
            });
        }
    }
}; 