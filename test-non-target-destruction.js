// Test Non-Target Ship Destruction Fix
window.testNonTargetDestruction = function() {
    console.log('🧪 === NON-TARGET DESTRUCTION TEST ===');
    
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    
    if (!starfieldManager || !ship) {
        console.error('❌ Game components not ready');
        return;
    }
    
    console.log('\n📊 INITIAL STATE:');
    console.log(`   • Current target: ${starfieldManager.getCurrentTargetData()?.name || 'none'}`);
    console.log(`   • Target index: ${starfieldManager.targetIndex}`);
    console.log(`   • Total targets: ${starfieldManager.targetObjects?.length || 0}`);
    
    // List all targets
    if (starfieldManager.targetObjects) {
        starfieldManager.targetObjects.forEach((target, index) => {
            const current = index === starfieldManager.targetIndex ? ' ← CURRENT' : '';
            const shipName = target.ship?.shipName || 'N/A';
            const hull = target.ship ? `${target.ship.currentHull}/${target.ship.maxHull}` : 'N/A';
            console.log(`   ${index}. ${target.name} (${target.type}) - Ship: ${shipName} - Hull: ${hull}${current}`);
        });
    }
    
    // Find a ship that's NOT the current target
    const currentTargetData = starfieldManager.getCurrentTargetData();
    let targetToDestroy = null;
    let targetToDestroyIndex = -1;
    
    if (starfieldManager.targetObjects) {
        for (let i = 0; i < starfieldManager.targetObjects.length; i++) {
            const target = starfieldManager.targetObjects[i];
            if (target.ship && target.ship !== currentTargetData?.ship) {
                targetToDestroy = target.ship;
                targetToDestroyIndex = i;
                break;
            }
        }
    }
    
    if (!targetToDestroy) {
        console.log('⚠️ No non-current target ships found to destroy');
        return;
    }
    
    console.log(`\n💥 DESTROYING NON-TARGET: ${targetToDestroy.shipName} at index ${targetToDestroyIndex}`);
    console.log(`   • Current target remains: ${currentTargetData?.name}`);
    
    // Destroy the non-target ship
    targetToDestroy.currentHull = 0;
    starfieldManager.removeDestroyedTarget(targetToDestroy);
    
    // Check results after a brief delay
    setTimeout(() => {
        console.log('\n📊 AFTER DESTRUCTION:');
        
        const newTargetData = starfieldManager.getCurrentTargetData();
        console.log(`   • Current target: ${newTargetData?.name || 'none'}`);
        console.log(`   • Target index: ${starfieldManager.targetIndex}`);
        console.log(`   • Total targets: ${starfieldManager.targetObjects?.length || 0}`);
        
        // Verify current target is valid
        if (newTargetData?.ship && newTargetData.ship.currentHull <= 0) {
            console.log('❌ FAILED: Current target is destroyed!');
        } else if (newTargetData) {
            console.log('✅ SUCCESS: Current target is valid');
            
            // Check wireframe color
            if (starfieldManager.targetWireframe && starfieldManager.targetWireframe.material) {
                const wireframeColor = starfieldManager.targetWireframe.material.color.getHex();
                const colorString = `#${wireframeColor.toString(16).padStart(6, '0')}`;
                console.log(`🎨 Wireframe color: ${colorString}`);
                
                // Check if color matches expected type
                const expectedColor = newTargetData.type === 'friendly' ? '#00ff00' : 
                                     newTargetData.type === 'hostile' ? '#ff0000' : '#ffff00';
                
                if (colorString === expectedColor) {
                    console.log('✅ Wireframe color is correct!');
                } else {
                    console.log(`❌ Wireframe color mismatch! Expected: ${expectedColor}, Got: ${colorString}`);
                }
            }
        } else {
            console.log('⚠️ No current target after destruction');
        }
        
        // List remaining targets
        if (starfieldManager.targetObjects) {
            console.log('\n📋 REMAINING TARGETS:');
            starfieldManager.targetObjects.forEach((target, index) => {
                const current = index === starfieldManager.targetIndex ? ' ← CURRENT' : '';
                const shipName = target.ship?.shipName || 'N/A';
                const hull = target.ship ? `${target.ship.currentHull}/${target.ship.maxHull}` : 'N/A';
                const isDestroyed = target.ship && target.ship.currentHull <= 0 ? ' [DESTROYED!]' : '';
                console.log(`   ${index}. ${target.name} (${target.type}) - Ship: ${shipName} - Hull: ${hull}${current}${isDestroyed}`);
            });
        }
        
        console.log('\n🧪 === TEST COMPLETE ===');
        
    }, 500);
};

console.log('✅ Test function defined! Run: testNonTargetDestruction()'); 