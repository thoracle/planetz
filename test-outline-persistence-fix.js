// Test 3D Outline Persistence Fix
window.testOutlinePersistenceFix = function() {
    console.log('🧪 === 3D OUTLINE PERSISTENCE FIX TEST ===');
    
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
    
    console.log('\n📊 INITIAL STATE:');
    console.log(`   • Target computer enabled: ${starfieldManager.targetComputerEnabled}`);
    console.log(`   • Outline enabled: ${starfieldManager.outlineEnabled}`);
    console.log(`   • Current target: ${starfieldManager.getCurrentTargetData()?.name || 'none'}`);
    console.log(`   • Current outline: ${starfieldManager.targetOutline ? 'exists' : 'none'}`);
    console.log(`   • Outline object: ${starfieldManager.targetOutlineObject ? 'tracked' : 'none'}`);
    
    // Test the outline throttling mechanism
    console.log('\n🔄 Testing outline throttling...');
    const lastUpdate = starfieldManager.lastOutlineUpdate;
    console.log(`   • Last outline update: ${lastUpdate}`);
    
    // Spawn targets if none exist
    if (!starfieldManager.targetObjects || starfieldManager.targetObjects.length === 0) {
        console.log('\n🎯 Spawning test targets...');
        starfieldManager.createTargetDummyShips(3);
        
        // Wait a bit for targets to be created
        setTimeout(() => {
            console.log(`   • Targets created: ${starfieldManager.targetObjects?.length || 0}`);
            if (starfieldManager.targetObjects && starfieldManager.targetObjects.length > 0) {
                console.log('   • Cycling to first target...');
                starfieldManager.cycleTarget();
                
                setTimeout(() => {
                    console.log('\n📊 AFTER TARGET CREATION:');
                    console.log(`   • Current target: ${starfieldManager.getCurrentTargetData()?.name || 'none'}`);
                    console.log(`   • Current outline: ${starfieldManager.targetOutline ? 'exists' : 'none'}`);
                    console.log(`   • Outline object: ${starfieldManager.targetOutlineObject ? 'tracked' : 'none'}`);
                    
                    console.log('\n✅ Test setup complete! Try destroying a target to see if outline persists.');
                    console.log('💡 You can destroy the current target with weapons or use ship.weaponSystem.debugDestroyTarget()');
                }, 1000);
            }
        }, 1000);
    } else {
        console.log(`\n✅ Found ${starfieldManager.targetObjects.length} existing targets`);
        console.log('💡 Try destroying a target to see if outline persists.');
        console.log('💡 You can destroy the current target with weapons or use ship.weaponSystem.debugDestroyTarget()');
    }
};

console.log('🧪 Test loaded! Run testOutlinePersistenceFix() to test the outline persistence fix.'); 