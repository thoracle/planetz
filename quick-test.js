// Quick Destruction Synchronization Test
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

console.log('✅ Test function defined! Run: testDestructionFix()'); 