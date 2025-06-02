// Debug Array Manipulation Test
window.debugArrayTest = function() {
    console.log('🔍 === ARRAY MANIPULATION DEBUG TEST ===');
    
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    
    if (!starfieldManager || !ship) {
        console.error('❌ Game components not ready');
        return;
    }
    
    // Show initial state
    console.log('\n📊 BEFORE DESTRUCTION:');
    console.log(`   • targetIndex: ${starfieldManager.targetIndex}`);
    console.log(`   • targetObjects.length: ${starfieldManager.targetObjects?.length || 0}`);
    
    if (starfieldManager.targetObjects) {
        starfieldManager.targetObjects.forEach((target, index) => {
            const current = index === starfieldManager.targetIndex ? ' ← CURRENT' : '';
            const shipName = target.ship?.shipName || 'N/A';
            const hull = target.ship ? `${target.ship.currentHull}/${target.ship.maxHull}` : 'N/A';
            console.log(`   ${index}. ${target.name} (${target.type}) - Ship: ${shipName} - Hull: ${hull}${current}`);
        });
    }
    
    const currentTargetData = starfieldManager.getCurrentTargetData();
    if (currentTargetData && currentTargetData.isShip) {
        const targetToDestroy = currentTargetData.ship;
        console.log(`\n💥 Will destroy: ${targetToDestroy.shipName}`);
        
        // Find the exact index of the target to destroy
        const targetIndex = starfieldManager.targetObjects.findIndex(
            target => target.ship === targetToDestroy || target.object === targetToDestroy.mesh
        );
        console.log(`🎯 Target to destroy is at index: ${targetIndex}`);
        
        // Destroy the target
        targetToDestroy.currentHull = 0;
        
        // Show array state just before calling removeDestroyedTarget
        console.log('\n📊 CALLING removeDestroyedTarget...');
        starfieldManager.removeDestroyedTarget(targetToDestroy);
        
        // Check array state immediately after
        setTimeout(() => {
            console.log('\n📊 AFTER DESTRUCTION:');
            console.log(`   • targetIndex: ${starfieldManager.targetIndex}`);
            console.log(`   • targetObjects.length: ${starfieldManager.targetObjects?.length || 0}`);
            
            if (starfieldManager.targetObjects) {
                starfieldManager.targetObjects.forEach((target, index) => {
                    const current = index === starfieldManager.targetIndex ? ' ← CURRENT' : '';
                    const shipName = target.ship?.shipName || 'N/A';
                    const hull = target.ship ? `${target.ship.currentHull}/${target.ship.maxHull}` : 'N/A';
                    const isDestroyed = target.ship && target.ship.currentHull <= 0 ? ' [DESTROYED!]' : '';
                    console.log(`   ${index}. ${target.name} (${target.type}) - Ship: ${shipName} - Hull: ${hull}${current}${isDestroyed}`);
                });
            }
            
            // Test getCurrentTargetData manually
            const currentData = starfieldManager.getCurrentTargetData();
            console.log(`\n🔍 getCurrentTargetData() result:`);
            if (currentData) {
                const shipName = currentData.ship?.shipName || 'N/A';
                const hull = currentData.ship ? `${currentData.ship.currentHull}/${currentData.ship.maxHull}` : 'N/A';
                const isDestroyed = currentData.ship && currentData.ship.currentHull <= 0 ? ' [DESTROYED!]' : '';
                console.log(`   • Name: ${currentData.name}`);
                console.log(`   • Type: ${currentData.type}`);
                console.log(`   • Ship: ${shipName}`);
                console.log(`   • Hull: ${hull}${isDestroyed}`);
                console.log(`   • Array index ${starfieldManager.targetIndex}: ${starfieldManager.targetObjects[starfieldManager.targetIndex]?.name || 'undefined'}`);
            } else {
                console.log('   • NULL');
            }
            
            console.log('\n🔍 === DEBUG COMPLETE ===');
            
        }, 300);
        
    } else {
        console.log('\n⚠️ Current target is not a ship. Please Tab to a ship target first.');
    }
};

console.log('✅ Debug function defined! Run: debugArrayTest()'); 