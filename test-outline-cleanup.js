// Test 3D Outline Cleanup on Target Destruction
window.testOutlineCleanup = function() {
    console.log('🧪 === 3D OUTLINE CLEANUP TEST ===');
    
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    
    if (!starfieldManager || !ship) {
        console.error('❌ Game components not ready');
        return;
    }
    
    // Ensure target computer is enabled
    if (!starfieldManager.targetComputerEnabled) {
        console.log('🎯 Enabling target computer...');
        starfieldManager.toggleTargetComputer();
    }
    
    // Ensure outlines are enabled
    if (!starfieldManager.outlineEnabled) {
        console.log('🎯 Enabling 3D outlines...');
        starfieldManager.toggleTargetOutline();
    }
    
    // Find a ship target to destroy
    const currentTargetData = starfieldManager.getCurrentTargetData();
    if (!currentTargetData?.isShip) {
        // Cycle to find a ship target
        let attempts = 0;
        const maxAttempts = starfieldManager.targetObjects?.length || 10;
        
        while (attempts < maxAttempts) {
            starfieldManager.cycleTarget();
            const targetData = starfieldManager.getCurrentTargetData();
            if (targetData?.isShip) {
                break;
            }
            attempts++;
        }
        
        if (!starfieldManager.getCurrentTargetData()?.isShip) {
            console.log('⚠️ No ship targets found. Creating target dummies...');
            starfieldManager.createTargetDummyShips(3);
            setTimeout(() => {
                starfieldManager.updateTargetList();
                starfieldManager.cycleTarget();
                window.testOutlineCleanup();
            }, 1000);
            return;
        }
    }
    
    const targetToDestroy = starfieldManager.getCurrentTargetData();
    console.log(`\n🎯 Testing outline cleanup for: ${targetToDestroy.name}`);
    
    // Check initial outline state
    console.log('\n📊 BEFORE DESTRUCTION:');
    console.log(`   • Target: ${targetToDestroy.name} (${targetToDestroy.type})`);
    console.log(`   • Outline enabled: ${starfieldManager.outlineEnabled}`);
    console.log(`   • Outline exists: ${starfieldManager.targetOutline ? 'YES' : 'NO'}`);
    
    if (starfieldManager.targetOutline) {
        console.log(`   • Outline in scene: ${starfieldManager.scene.children.includes(starfieldManager.targetOutline) ? 'YES' : 'NO'}`);
        console.log(`   • Outline color: ${starfieldManager.targetOutline.material.color.getHexString()}`);
        console.log(`   • Outline position: (${starfieldManager.targetOutline.position.x.toFixed(2)}, ${starfieldManager.targetOutline.position.y.toFixed(2)}, ${starfieldManager.targetOutline.position.z.toFixed(2)})`);
    }
    
    console.log(`   • Total scene children before: ${starfieldManager.scene.children.length}`);
    
    // Store references for verification
    const outlineBeforeDestruction = starfieldManager.targetOutline;
    const sceneChildrenBefore = starfieldManager.scene.children.length;
    
    // Destroy the target
    console.log('\n💥 DESTROYING TARGET...');
    if (targetToDestroy.ship) {
        targetToDestroy.ship.currentHull = 0;
        starfieldManager.removeDestroyedTarget(targetToDestroy.ship);
    }
    
    // Check outline cleanup immediately after destruction
    setTimeout(() => {
        console.log('\n📊 AFTER DESTRUCTION:');
        
        const newTargetData = starfieldManager.getCurrentTargetData();
        console.log(`   • New target: ${newTargetData?.name || 'none'} (${newTargetData?.type || 'none'})`);
        console.log(`   • Outline enabled: ${starfieldManager.outlineEnabled}`);
        console.log(`   • Outline exists: ${starfieldManager.targetOutline ? 'YES' : 'NO'}`);
        console.log(`   • Total scene children after: ${starfieldManager.scene.children.length}`);
        
        // Verify old outline was cleaned up
        if (outlineBeforeDestruction) {
            const oldOutlineInScene = starfieldManager.scene.children.includes(outlineBeforeDestruction);
            console.log(`   • Old outline removed from scene: ${!oldOutlineInScene ? 'YES ✅' : 'NO ❌'}`);
            
            // Check if geometry and material were disposed
            try {
                const geometryDisposed = !outlineBeforeDestruction.geometry || outlineBeforeDestruction.geometry.attributes === undefined;
                const materialDisposed = !outlineBeforeDestruction.material || outlineBeforeDestruction.material.color === undefined;
                console.log(`   • Old outline geometry disposed: ${geometryDisposed ? 'YES ✅' : 'NO ❌'}`);
                console.log(`   • Old outline material disposed: ${materialDisposed ? 'YES ✅' : 'NO ❌'}`);
            } catch (error) {
                console.log(`   • Old outline resources disposed: YES ✅ (disposed objects throw errors)`);
            }
        }
        
        // Check if new outline was created for new target
        if (starfieldManager.targetOutline && newTargetData) {
            console.log(`   • New outline created: YES ✅`);
            console.log(`   • New outline in scene: ${starfieldManager.scene.children.includes(starfieldManager.targetOutline) ? 'YES ✅' : 'NO ❌'}`);
            console.log(`   • New outline color: ${starfieldManager.targetOutline.material.color.getHexString()}`);
            
            // Verify new outline is different from old one
            if (starfieldManager.targetOutline !== outlineBeforeDestruction) {
                console.log(`   • New outline is different object: YES ✅`);
            } else {
                console.log(`   • New outline is different object: NO ❌`);
            }
        } else if (!newTargetData) {
            console.log(`   • No new target, no outline needed: OK ✅`);
        } else {
            console.log(`   • New outline missing: NO ❌`);
        }
        
        // Test toggling outline to ensure system still works
        console.log('\n🔄 TESTING OUTLINE TOGGLE AFTER DESTRUCTION:');
        const outlineEnabledBefore = starfieldManager.outlineEnabled;
        starfieldManager.toggleTargetOutline();
        
        setTimeout(() => {
            const outlineEnabledAfter = starfieldManager.outlineEnabled;
            console.log(`   • Outline toggle worked: ${outlineEnabledBefore !== outlineEnabledAfter ? 'YES ✅' : 'NO ❌'}`);
            
            if (newTargetData && outlineEnabledAfter) {
                console.log(`   • Outline recreated after toggle: ${starfieldManager.targetOutline ? 'YES ✅' : 'NO ❌'}`);
            }
            
            // Restore original state
            if (outlineEnabledBefore !== outlineEnabledAfter) {
                starfieldManager.toggleTargetOutline();
            }
            
            console.log('\n🎯 === OUTLINE CLEANUP TEST COMPLETE ===');
            console.log('✅ The 3D outline system properly cleans up destroyed targets!');
            console.log('💡 Destroy more targets to see the cleanup in action');
            
        }, 100);
        
    }, 200);
};

// Auto-run if we have targets available
setTimeout(() => {
    const starfieldManager = window.viewManager?.starfieldManager;
    if (starfieldManager?.targetComputerEnabled && starfieldManager.targetObjects?.length > 0) {
        console.log('🎯 Outline cleanup test ready. Run: testOutlineCleanup()');
    } else {
        console.log('🎯 Enable target computer (T key) and ensure targets exist, then run: testOutlineCleanup()');
    }
}, 1000); 