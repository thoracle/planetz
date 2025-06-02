// Hull Health Display Test
// Run this in the browser console to test hull health display and damage

(function() {
    console.log('=== Hull Health Display Test ===');
    
    // Get the starfield manager and current target
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    
    if (!starfieldManager || !ship) {
        console.error('❌ Game not ready. Make sure you have a ship and are in-game.');
        return;
    }
    
    // Get current target
    const currentTargetData = starfieldManager.getCurrentTargetData();
    
    if (!currentTargetData || !currentTargetData.ship) {
        console.error('❌ No enemy ship targeted. Target an enemy ship first (Tab key).');
        console.log('💡 Available targets:', starfieldManager.targetObjects?.length || 0);
        return;
    }
    
    const enemyShip = currentTargetData.ship;
    console.log(`✅ Testing hull health display on: ${enemyShip.shipName || 'Enemy Ship'}`);
    
    // Display current hull status
    function showHullStatus() {
        const hullPercent = enemyShip.maxHull > 0 ? (enemyShip.currentHull / enemyShip.maxHull) * 100 : 0;
        console.log(`🛡️ Hull: ${enemyShip.currentHull.toFixed(1)} / ${enemyShip.maxHull} (${hullPercent.toFixed(1)}%)`);
        
        // Hull health bar is now always white in the HUD
        let statusText = 'Healthy';
        if (hullPercent < 75) statusText = 'Damaged';
        if (hullPercent < 25) statusText = 'Critical';
        if (hullPercent <= 0) statusText = 'DESTROYED';
        
        console.log(`🎨 Hull Status: ${statusText} (displayed in white)`);
        
        return hullPercent;
    }
    
    // Test hull damage
    function damageHull(damageAmount = 100) {
        console.log(`💥 Applying ${damageAmount} hull damage...`);
        
        const hullBefore = enemyShip.currentHull;
        enemyShip.applyDamage(damageAmount, 'test');
        const hullAfter = enemyShip.currentHull;
        
        console.log(`Hull damage: ${hullBefore.toFixed(1)} → ${hullAfter.toFixed(1)} (-${(hullBefore - hullAfter).toFixed(1)})`);
        
        // Check if ship was destroyed
        if (enemyShip.currentHull <= 0) {
            console.log('💀 ENEMY SHIP DESTROYED!');
            return true;
        }
        
        return false;
    }
    
    // Test progressive damage
    function testProgressiveDamage() {
        console.log('🧪 Testing progressive hull damage...');
        showHullStatus();
        
        let damageRound = 1;
        const maxRounds = 10;
        
        while (enemyShip.currentHull > 0 && damageRound <= maxRounds) {
            console.log(`--- Damage Round ${damageRound} ---`);
            
            const destroyed = damageHull(150); // 150 damage per round
            
            if (destroyed) {
                console.log('🎉 Hull destruction test completed successfully!');
                break;
            }
            
            showHullStatus();
            damageRound++;
            
            if (damageRound > maxRounds) {
                console.log('⚠️ Max damage rounds reached, ship still alive');
            }
        }
    }
    
    // Restore hull to full for testing
    function restoreHull() {
        console.log('🔧 Restoring hull to full health...');
        enemyShip.currentHull = enemyShip.maxHull;
        showHullStatus();
        console.log('✅ Hull restored to 100%');
    }
    
    // Test the targeting computer display update
    function testHUDUpdate() {
        console.log('🖥️ Testing HUD update...');
        
        // Force update the target display to refresh hull health
        starfieldManager.updateTargetDisplay();
        
        console.log('✅ Target display updated - check HUD for hull health bar');
        console.log('💡 The hull health should appear above the sub-targeting information');
        console.log('💡 Health bar color should match hull percentage:');
        console.log('   • Green: 75-100% hull');
        console.log('   • Orange: 25-74% hull');
        console.log('   • Red: 0-24% hull');
    }
    
    // Create enemy status summary
    function showEnemyStatus() {
        console.log('📊 Enemy Ship Status:');
        console.log(`Ship Type: ${enemyShip.shipType}`);
        console.log(`Ship Name: ${enemyShip.shipName}`);
        console.log(`Diplomacy: ${enemyShip.diplomacy}`);
        console.log(`Systems: ${enemyShip.systems.size} installed`);
        
        showHullStatus();
        
        if (enemyShip.systems.size > 0) {
            console.log('🔧 Available Systems:');
            for (const [systemName, system] of enemyShip.systems) {
                const health = (system.healthPercentage * 100).toFixed(1);
                console.log(`  • ${systemName}: ${health}% health`);
            }
        }
    }
    
    // Test destruction handling
    function testDestructionHandling() {
        console.log('💥 Testing destruction handling...');
        
        // Damage ship to near destruction
        const nearDestroyDamage = enemyShip.currentHull - 10;
        if (nearDestroyDamage > 0) {
            console.log(`⚠️ Reducing hull to near-destruction (${nearDestroyDamage} damage)...`);
            enemyShip.applyDamage(nearDestroyDamage, 'test');
            showHullStatus();
        }
        
        console.log('💀 Applying final destruction damage...');
        enemyShip.applyDamage(50, 'test'); // Ensure destruction
        
        if (enemyShip.currentHull <= 0) {
            console.log('🎉 Ship destroyed! HUD should show:');
            console.log('   • "DESTROYED" in red glowing text');
            console.log('   • Empty health bar (0%)');
            console.log('   • "Target will be removed from sensors shortly"');
            console.log('   • Target will auto-remove after 3 seconds');
        }
        
        // Force HUD update to show destruction
        testHUDUpdate();
    }
    
    // Test different destruction handling options
    function testDestructionOptions() {
        console.log('🧪 Testing destruction handling options...');
        
        if (enemyShip.currentHull > 0) {
            console.log('⚠️ Ship not destroyed yet. Run testDestructionHandling() first.');
            return;
        }
        
        console.log('Available destruction handling options:');
        console.log('A) Default: Show "DESTROYED" for 3 seconds, then auto-cycle to next target');
        console.log('B) Message: Show popup message + auto-clear');
        console.log('C) Immediate: Instantly remove and cycle to next target');
        console.log('D) Debris: Convert to scannable debris object');
        
        // You can test these by calling the starfieldManager methods directly
        console.log('');
        console.log('To test options manually:');
        console.log('starfieldManager.handleTargetDestructionWithMessage(enemyShip, 2000)');
        console.log('starfieldManager.handleTargetDestructionImmediate(enemyShip)');
        console.log('starfieldManager.handleTargetDestructionAsDebris(enemyShip)');
    }
    
    // Test target cleanup and refresh
    function testTargetCleanup() {
        console.log('🔄 Testing target cleanup and refresh...');
        
        const targetCount = starfieldManager.targetObjects?.length || 0;
        console.log(`📊 Current targets available: ${targetCount}`);
        
        if (targetCount === 0) {
            console.log('⚠️ No targets available for cleanup testing');
            return;
        }
        
        // Force a target refresh to test wireframe/color updates
        console.log('🎯 Testing target refresh (should fix wireframe/color issues)...');
        starfieldManager.refreshCurrentTarget();
        
        console.log('✅ Target refresh complete. Check HUD for:');
        console.log('   • Correct wireframe shape and color');
        console.log('   • Proper faction coloring on HUD borders');
        console.log('   • Updated hull health display');
        console.log('   • Correct target system information');
    }
    
    // Test the complete destruction cycle with cleanup verification
    function testCompleteDestructionCycle() {
        console.log('🔥 Testing complete destruction cycle with cleanup verification...');
        
        if (enemyShip.currentHull <= 0) {
            console.log('⚠️ Ship already destroyed. Run restoreHull() first.');
            return;
        }
        
        const initialTargetCount = starfieldManager.targetObjects?.length || 0;
        console.log(`📊 Initial target count: ${initialTargetCount}`);
        
        // Show initial state
        console.log('📋 Before destruction:');
        showEnemyStatus();
        
        // Destroy the ship
        console.log('💥 Destroying target...');
        testDestructionHandling();
        
        // Wait a moment for destruction to process, then check cleanup
        setTimeout(() => {
            const finalTargetCount = starfieldManager.targetObjects?.length || 0;
            console.log(`📊 Final target count: ${finalTargetCount}`);
            
            if (finalTargetCount < initialTargetCount) {
                console.log('✅ Target successfully removed from list');
            } else {
                console.log('⚠️ Target may still be in list (could be converted to debris)');
            }
            
            // Test that new target (if any) is properly set up
            testTargetCleanup();
            
        }, 4000); // Wait for destruction cleanup to complete
    }
    
    // Expose functions globally for easy console access
    window.showHullStatus = showHullStatus;
    window.damageHull = damageHull;
    window.testProgressiveDamage = testProgressiveDamage;
    window.testDestructionHandling = testDestructionHandling;
    window.testDestructionOptions = testDestructionOptions;
    window.testTargetCleanup = testTargetCleanup;
    window.testCompleteDestructionCycle = testCompleteDestructionCycle;
    window.restoreHull = restoreHull;
    window.testHUDUpdate = testHUDUpdate;
    window.showEnemyStatus = showEnemyStatus;
    
    console.log('🎮 Hull health test functions loaded! Available commands:');
    console.log('  showHullStatus()              - Display current hull health');
    console.log('  damageHull(amount)            - Apply damage to enemy hull (default: 100)');
    console.log('  testProgressiveDamage()       - Apply damage until ship is destroyed');
    console.log('  testDestructionHandling()     - Test ship destruction and HUD handling');
    console.log('  testCompleteDestructionCycle() - Test full destruction with cleanup verification');
    console.log('  testTargetCleanup()           - Test target refresh (fixes wireframe/color issues)');
    console.log('  testDestructionOptions()      - Show destruction handling options');
    console.log('  restoreHull()                 - Restore hull to 100%');
    console.log('  testHUDUpdate()               - Force update the HUD display');
    console.log('  showEnemyStatus()             - Show complete enemy ship status');
    console.log('');
    console.log('🚀 Initial Status:');
    showEnemyStatus();
    testHUDUpdate();
    
    console.log('');
    console.log('💡 Try these test sequences:');
    console.log('  1. damageHull(200) - Apply damage and watch WHITE health bar');
    console.log('  2. testCompleteDestructionCycle() - Test full destruction with verification');
    console.log('  3. testTargetCleanup() - Fix wireframe/color issues manually');
    console.log('  4. restoreHull() - Reset to full health');
    console.log('');
    console.log('🎨 Note: Hull health bar is now WHITE instead of color-coded');
    console.log('📋 Hull Status Levels: Healthy > Damaged > Critical > DESTROYED');
    console.log('🔧 If wireframe/colors look wrong after destruction, run: testTargetCleanup()');
    
    return {
        status: 'loaded',
        enemyShip: enemyShip.shipName || 'Enemy Ship',
        hull: `${enemyShip.currentHull}/${enemyShip.maxHull}`
    };
})(); 