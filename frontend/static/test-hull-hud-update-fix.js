// Hull HUD Update Fix Test
// Run this in the browser console to test that hull health displays update properly after damage

(function() {
    console.log('=== Hull HUD Update Fix Test ===');
    
    // Get the starfield manager and current target
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    
    if (!starfieldManager || !ship) {
        console.error('❌ Game not ready. Make sure you have a ship and are in-game.');
        console.log('💡 Instructions:');
        console.log('   1. Load the game at http://localhost:5001');
        console.log('   2. Press T to enable target computer');
        console.log('   3. Press Ctrl+Shift+D to create target dummies');
        console.log('   4. Press Tab to target an enemy ship');
        console.log('   5. Run this test again');
        return;
    }
    
    // Get current target
    const currentTargetData = starfieldManager.getCurrentTargetData();
    
    if (!currentTargetData || !currentTargetData.ship) {
        console.error('❌ No enemy ship targeted. Need to target an enemy ship first.');
        console.log('💡 Available targets:', starfieldManager.targetObjects?.length || 0);
        
        if ((starfieldManager.targetObjects?.length || 0) === 0) {
            console.log('💡 Press Ctrl+Shift+D to create target dummy ships');
        } else {
            console.log('💡 Press Tab to cycle to an enemy ship target');
        }
        return;
    }
    
    const enemyShip = currentTargetData.ship;
    console.log(`✅ Testing hull HUD update on: ${enemyShip.shipName || 'Enemy Ship'}`);
    
    // Function to check if hull health is displayed in the HUD
    function checkHullHealthInHUD() {
        // Look for the target info display element
        const targetInfoDisplay = document.querySelector('#target-hud .target-info-display');
        if (!targetInfoDisplay) {
            console.error('❌ Target info display element not found!');
            return { found: false, percentage: null };
        }
        
        // Check if hull health is displayed
        const hullText = targetInfoDisplay.innerHTML;
        const hasHullDisplay = hullText.includes('HULL:') && hullText.includes('%');
        
        if (hasHullDisplay) {
            // Extract hull percentage
            const hullMatch = hullText.match(/HULL: (\d+)%/);
            if (hullMatch) {
                const hullPercent = parseInt(hullMatch[1]);
                console.log(`✅ HUD shows hull: ${hullPercent}%`);
                return { found: true, percentage: hullPercent };
            }
        }
        
        console.error('❌ Hull health not found in HUD');
        return { found: false, percentage: null };
    }
    
    // Function to get actual ship hull percentage
    function getActualHullPercentage() {
        const hullPercent = enemyShip.maxHull > 0 ? (enemyShip.currentHull / enemyShip.maxHull) * 100 : 0;
        return Math.round(hullPercent);
    }
    
    // Function to test damage and HUD update
    function testDamageAndHUDUpdate(damageAmount = 100) {
        console.log(`\n💥 Testing ${damageAmount} damage and HUD update...`);
        
        // Check before
        console.log('📋 BEFORE damage:');
        const actualBefore = getActualHullPercentage();
        const hudBefore = checkHullHealthInHUD();
        console.log(`   Actual hull: ${actualBefore}%`);
        console.log(`   HUD displays: ${hudBefore.found ? hudBefore.percentage + '%' : 'Not found'}`);
        
        // Apply damage
        console.log(`💥 Applying ${damageAmount} damage...`);
        enemyShip.applyDamage(damageAmount, 'test');
        
        // Force an update (manual trigger)
        starfieldManager.updateTargetDisplay();
        
        // Check after
        console.log('\n📋 AFTER damage:');
        const actualAfter = getActualHullPercentage();
        const hudAfter = checkHullHealthInHUD();
        console.log(`   Actual hull: ${actualAfter}%`);
        console.log(`   HUD displays: ${hudAfter.found ? hudAfter.percentage + '%' : 'Not found'}`);
        
        // Verify they match
        console.log('\n🔍 Verification:');
        const hullChanged = actualBefore !== actualAfter;
        const hudMatches = hudAfter.found && hudAfter.percentage === actualAfter;
        
        console.log(`   Hull took damage: ${hullChanged ? '✅ YES' : '❌ NO'} (${actualBefore}% → ${actualAfter}%)`);
        console.log(`   HUD shows correct value: ${hudMatches ? '✅ YES' : '❌ NO'}`);
        
        if (hullChanged && hudMatches) {
            console.log('🎉 SUCCESS: Damage applied and HUD updated correctly!');
            return true;
        } else {
            console.log('❌ FAILED: Either damage wasn\'t applied or HUD didn\'t update');
            return false;
        }
    }
    
    // Function to test weapon damage (simulating real weapon fire)
    function testWeaponDamageUpdate() {
        console.log('\n🎯 Testing weapon damage HUD update simulation...');
        
        // Get the ship's weapon system for realistic damage values
        const weaponSlots = ship.weaponSlots || [];
        let weaponDamage = 75; // Default Pulse Cannon damage
        
        if (weaponSlots.length > 0) {
            const firstWeapon = weaponSlots[0];
            if (!firstWeapon.isEmpty && firstWeapon.equippedWeapon) {
                weaponDamage = firstWeapon.equippedWeapon.damage;
                console.log(`Using weapon damage from ${firstWeapon.equippedWeapon.name}: ${weaponDamage}`);
            }
        }
        
        return testDamageAndHUDUpdate(weaponDamage);
    }
    
    // Function to test progressive damage
    function testProgressiveDamage() {
        console.log('\n🧪 Testing progressive damage with HUD updates...');
        
        let successCount = 0;
        let totalTests = 0;
        
        for (let i = 1; i <= 3; i++) {
            console.log(`\n=== Damage Test ${i}/3 ===`);
            const success = testDamageAndHUDUpdate(50 + i * 25); // 75, 100, 125 damage
            if (success) successCount++;
            totalTests++;
            
            if (enemyShip.currentHull <= 0) {
                console.log('💀 Enemy ship destroyed! Stopping progressive test.');
                break;
            }
        }
        
        console.log(`\n📊 Progressive Test Results: ${successCount}/${totalTests} tests passed`);
        return successCount === totalTests;
    }
    
    // Function to restore hull for testing
    function restoreHull() {
        console.log('🔧 Restoring enemy hull to full health for testing...');
        enemyShip.currentHull = enemyShip.maxHull;
        starfieldManager.updateTargetDisplay();
        console.log('✅ Hull restored to 100%');
    }
    
    // Expose functions globally for easy console access
    window.testDamageAndHUDUpdate = testDamageAndHUDUpdate;
    window.testWeaponDamageUpdate = testWeaponDamageUpdate;
    window.testProgressiveDamage = testProgressiveDamage;
    window.restoreHull = restoreHull;
    window.checkHullHealthInHUD = checkHullHealthInHUD;
    window.getActualHullPercentage = getActualHullPercentage;
    
    console.log('\n🎮 Hull HUD Update Fix Test Functions Loaded!');
    console.log('\n📋 Available commands:');
    console.log('  testDamageAndHUDUpdate(amt)  - Test damage application and HUD update');
    console.log('  testWeaponDamageUpdate()     - Test with realistic weapon damage');
    console.log('  testProgressiveDamage()      - Test multiple damage applications');
    console.log('  restoreHull()                - Restore enemy hull to 100%');
    console.log('  checkHullHealthInHUD()       - Check current HUD display');
    console.log('  getActualHullPercentage()    - Get actual enemy hull percentage');
    
    console.log('\n🚀 Initial Status Check:');
    const initialActual = getActualHullPercentage();
    const initialHUD = checkHullHealthInHUD();
    console.log(`Current hull: ${initialActual}%`);
    console.log(`HUD displays: ${initialHUD.found ? initialHUD.percentage + '%' : 'Not found'}`);
    
    if (initialHUD.found && initialHUD.percentage === initialActual) {
        console.log('✅ Initial HUD display is correct!');
        console.log('\n💡 Ready to test! Try:');
        console.log('   • testWeaponDamageUpdate() - Test realistic weapon damage');
        console.log('   • testProgressiveDamage() - Test multiple hits');
    } else {
        console.log('⚠️ Initial HUD display may have issues');
        console.log('💡 Try: testDamageAndHUDUpdate(100) to force an update');
    }
    
    return {
        status: 'loaded',
        enemyShip: enemyShip.shipName || 'Enemy Ship',
        currentHull: `${initialActual}%`,
        hudWorking: initialHUD.found && initialHUD.percentage === initialActual
    };
})(); 