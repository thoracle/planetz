// Test 3D Outline Destruction Cleanup Fix
window.testOutlineDestructionFix = function() {
    console.log('🧪 === 3D OUTLINE DESTRUCTION CLEANUP TEST ===');
    
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
    
    console.log('\\n📊 INITIAL OUTLINE STATUS:');
    console.log(`   • Outline enabled: ${starfieldManager.outlineEnabled}`);
    console.log(`   • Current outline: ${starfieldManager.targetOutline ? 'exists' : 'none'}`);
    console.log(`   • Outlined object: ${starfieldManager.targetOutlineObject ? 'tracked' : 'none'}`);
    console.log(`   • Current target: ${starfieldManager.getCurrentTargetData()?.name || 'none'}`);
    
    // Create test targets if none exist
    if (!starfieldManager.targetObjects || starfieldManager.targetObjects.length === 0) {
        console.log('🎯 Creating test targets...');
        starfieldManager.createTargetDummyShips(3);
        
        // Wait a moment for targets to be created
        setTimeout(() => {
            window.testOutlineDestructionFix();
        }, 1000);
        return;
    }
    
    console.log(`\\n🎯 Found ${starfieldManager.targetObjects.length} targets`);
    
    // Cycle to first target to ensure we have an outline
    if (starfieldManager.targetObjects.length > 0) {
        console.log('🔄 Cycling to first target...');
        starfieldManager.targetIndex = 0;
        starfieldManager.cycleTarget();
        
        setTimeout(() => {
            console.log('\\n📊 AFTER TARGETING:');
            console.log(`   • Current target: ${starfieldManager.getCurrentTargetData()?.name || 'none'}`);
            console.log(`   • Outline exists: ${starfieldManager.targetOutline ? 'YES' : 'NO'}`);
            console.log(`   • Outlined object tracked: ${starfieldManager.targetOutlineObject ? 'YES' : 'NO'}`);
            
            if (starfieldManager.targetOutline && starfieldManager.targetOutlineObject) {
                console.log('✅ 3D outline properly created and tracked');
                
                // Now destroy the target to test cleanup
                console.log('\\n💥 DESTROYING CURRENT TARGET...');
                const currentTarget = starfieldManager.getCurrentTargetData();
                if (currentTarget?.ship) {
                    // Set hull to 0 to trigger destruction
                    currentTarget.ship.currentHull = 0;
                    
                    // Trigger the destruction handling
                    starfieldManager.removeDestroyedTarget(currentTarget.ship);
                    
                    setTimeout(() => {
                        console.log('\\n📊 AFTER DESTRUCTION:');
                        console.log(`   • Outline exists: ${starfieldManager.targetOutline ? 'YES (BUG!)' : 'NO (GOOD)'}`);
                        console.log(`   • Outlined object tracked: ${starfieldManager.targetOutlineObject ? 'YES (BUG!)' : 'NO (GOOD)'}`);
                        console.log(`   • Current target: ${starfieldManager.getCurrentTargetData()?.name || 'none'}`);
                        
                        if (!starfieldManager.targetOutline && !starfieldManager.targetOutlineObject) {
                            console.log('✅ SUCCESS: 3D outline properly cleaned up after destruction!');
                        } else {
                            console.log('❌ FAILURE: 3D outline not properly cleaned up');
                        }
                        
                        console.log('\\n🧪 Test complete!');
                    }, 500);
                } else {
                    console.log('❌ No target ship to destroy');
                }
            } else {
                console.log('❌ Failed to create 3D outline for testing');
            }
        }, 500);
    }
};

console.log('🧪 Test loaded! Run testOutlineDestructionFix() to test 3D outline cleanup on destruction'); 