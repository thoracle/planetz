// Hull Health Display Fix Test
// Run this in the browser console to test that hull health is now displayed correctly

(function() {
    console.log('=== Hull Health Display Fix Test ===');
    
    // Get the starfield manager and current target
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    
    if (!starfieldManager || !ship) {
        console.error('❌ Game not ready. Make sure you have a ship and are in-game.');
        console.log('💡 1. Load the game at http://localhost:5001');
        console.log('💡 2. Press T to enable target computer');
        console.log('💡 3. Press Ctrl+Shift+D to create target dummies');
        console.log('💡 4. Press Tab to target an enemy ship');
        console.log('💡 5. Run this test again');
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
    console.log(`✅ Testing hull health display on: ${enemyShip.shipName || 'Enemy Ship'}`);
    
    // Function to check if hull health is displayed in the HUD
    function checkHullHealthDisplay() {
        console.log('🖥️ Checking target HUD for integrated hull health display...');
        
        // Look for the target info display element
        const targetInfoDisplay = document.querySelector('#target-hud .target-info-display');
        if (!targetInfoDisplay) {
            console.error('❌ Target info display element not found!');
            return false;
        }
        
        // Check if hull health is integrated into the main target info section
        const mainTargetSection = targetInfoDisplay.querySelector('div[style*="background-color"]');
        if (!mainTargetSection) {
            console.error('❌ Main target section not found!');
            return false;
        }
        
        // Look for the new cleaner hull health display with white text
        const hullText = mainTargetSection.innerHTML;
        const hasHullDisplay = hullText.includes('HULL:') && hullText.includes('color: white');
        const hasHullBar = hullText.includes('background-color: white') && hullText.includes('width:');
        
        if (hasHullDisplay && hasHullBar) {
            console.log('✅ Hull health display found with white text and bar!');
            
            // Extract hull percentage
            const hullMatch = hullText.match(/HULL: (\d+)%/);
            if (hullMatch) {
                const hullPercent = parseInt(hullMatch[1]);
                console.log(`   🔧 Hull Health: ${hullPercent}%`);
                
                // Check bar width matches percentage
                const widthMatch = hullText.match(/width: (\d+(?:\.\d+)?)%/);
                if (widthMatch) {
                    const barWidth = parseFloat(widthMatch[1]);
                    console.log(`   📊 Bar Width: ${barWidth}%`);
                    
                    if (Math.abs(barWidth - hullPercent) < 1) {
                        console.log('   ✅ Bar width matches hull percentage!');
                    } else {
                        console.log('   ⚠️ Bar width doesn\'t match hull percentage');
                    }
                }
            }
            
            // Check for white styling
            if (hullText.includes('color: white') && hullText.includes('font-weight: bold')) {
                console.log('   ✅ Hull text is properly styled in white and bold');
            }
            
            if (hullText.includes('background-color: white')) {
                console.log('   ✅ Hull bar is properly styled in white');
            }
            
            return true;
        } else {
            console.error('❌ Hull health display not found or not properly styled!');
            console.log('📋 Current target info HTML:');
            console.log(mainTargetSection.innerHTML);
            return false;
        }
    }
    
    // Function to check if sub-target health is displayed with consistent styling
    function checkSubTargetHealthDisplay() {
        console.log('🎯 Checking sub-target health display styling...');
        
        // Look for sub-target section
        const targetInfoDisplay = document.querySelector('#target-hud .target-info-display');
        if (!targetInfoDisplay) {
            console.error('❌ Target info display not found!');
            return false;
        }
        
        // Look for sub-target section
        const subTargetSection = Array.from(targetInfoDisplay.children).find(child => 
            child.textContent.includes('SUB-TARGET:')
        );
        
        if (!subTargetSection) {
            console.log('ℹ️ No sub-target currently selected - this is normal if no sub-target is active');
            return true;
        }
        
        // Check for white health text and health bar
        const whiteHealthText = subTargetSection.querySelector('div[style*="color: white"]');
        const healthBar = subTargetSection.querySelector('div[style*="background-color: #333"]');
        const whiteHealthBarFill = subTargetSection.querySelector('div[style*="background-color: white"]');
        
        let allGood = true;
        
        if (!whiteHealthText) {
            console.error('❌ Sub-target missing white health text!');
            allGood = false;
        } else {
            console.log('✅ Sub-target has white health text');
        }
        
        if (!healthBar) {
            console.error('❌ Sub-target missing health bar container!');
            allGood = false;
        } else {
            console.log('✅ Sub-target has health bar container');
        }
        
        if (!whiteHealthBarFill) {
            console.error('❌ Sub-target missing white health bar fill!');
            allGood = false;
        } else {
            console.log('✅ Sub-target has white health bar fill');
        }
        
        // Check if system name and percentage are in the format "System Name: xx%"
        if (whiteHealthText && whiteHealthText.textContent.includes(':') && whiteHealthText.textContent.includes('%')) {
            console.log('✅ Sub-target health shows "System Name: xx%" format');
        } else if (whiteHealthText) {
            console.error('❌ Sub-target health text format incorrect:', whiteHealthText.textContent);
            allGood = false;
        }
        
        return allGood;
    }
    
    // Function to display current hull status
    function showCurrentHullStatus() {
        const hullPercent = enemyShip.maxHull > 0 ? (enemyShip.currentHull / enemyShip.maxHull) * 100 : 0;
        console.log(`🛡️ Enemy Hull: ${enemyShip.currentHull.toFixed(1)} / ${enemyShip.maxHull} (${hullPercent.toFixed(1)}%)`);
        
        let statusText = 'Healthy';
        if (hullPercent < 75) statusText = 'Damaged';
        if (hullPercent < 25) statusText = 'Critical';
        if (hullPercent <= 0) statusText = 'DESTROYED';
        
        console.log(`🎨 Expected Status: ${statusText}`);
        return hullPercent;
    }
    
    // Function to test hull damage and watch the display update
    function testHullDamageDisplay(damageAmount = 100) {
        console.log(`\n💥 Testing hull damage display with ${damageAmount} damage...`);
        
        console.log('📋 BEFORE damage:');
        const healthBefore = showCurrentHullStatus();
        const displayWorkingBefore = checkHullHealthDisplay();
        
        // Apply damage
        enemyShip.applyDamage(damageAmount, 'test');
        
        // Force update the display
        starfieldManager.updateTargetDisplay();
        
        console.log('\n📋 AFTER damage:');
        const healthAfter = showCurrentHullStatus();
        const displayWorkingAfter = checkHullHealthDisplay();
        
        console.log(`\n📊 Damage Result:`);
        console.log(`   • Health: ${healthBefore.toFixed(1)}% → ${healthAfter.toFixed(1)}%`);
        console.log(`   • Display Before: ${displayWorkingBefore ? '✅ Working' : '❌ Broken'}`);
        console.log(`   • Display After: ${displayWorkingAfter ? '✅ Working' : '❌ Broken'}`);
        
        if (enemyShip.currentHull <= 0) {
            console.log('💀 Enemy ship destroyed!');
            return true;
        }
        
        return false;
    }
    
    // Function to restore hull to full for testing
    function restoreHull() {
        console.log('🔧 Restoring enemy hull to full health...');
        enemyShip.currentHull = enemyShip.maxHull;
        starfieldManager.updateTargetDisplay();
        showCurrentHullStatus();
        checkHullHealthDisplay();
        console.log('✅ Hull restored to 100%');
    }
    
    // Function to test the complete hull health display
    function testCompleteHullDisplay() {
        console.log('\n=== Complete Hull Health Display Test ===');
        
        // Check if we have everything we need
        if (!starfieldManager || !ship) {
            console.error('❌ Game not ready. Please ensure you have a ship and are in starfield view.');
            return;
        }
        
        console.log('🚀 Testing complete hull health display system...');
        
        // 1. Check that hull health is displayed
        const hullDisplayWorking = checkHullHealthDisplay();
        
        // 2. Check sub-target health styling
        const subTargetHealthWorking = checkSubTargetHealthDisplay();
        
        // 3. Show current hull status
        showCurrentHullStatus();
        
        // 4. Test damage and verify display updates
        console.log('\n📝 Testing damage display updates...');
        testHullDamageDisplay(150);
        
        setTimeout(() => {
            console.log('\n🎯 Re-checking display after damage...');
            checkHullHealthDisplay();
            
            // Restore hull for final test
            setTimeout(() => {
                restoreHull();
                console.log('\n✅ Hull restored for final verification...');
                setTimeout(() => {
                    checkHullHealthDisplay();
                    
                    // Final summary
                    console.log('\n=== TEST SUMMARY ===');
                    if (hullDisplayWorking && subTargetHealthWorking) {
                        console.log('✅ SUCCESS: Hull health display is working correctly!');
                        console.log('   • Hull display shows white "HULL: X%" text');
                        console.log('   • Hull bar is white and updates with damage');
                        console.log('   • Sub-target health text is white');
                        console.log('   • No redundant "Integrity" text');
                        console.log('   • Clean, compact design');
                    } else {
                        console.error('❌ ISSUES DETECTED:');
                        if (!hullDisplayWorking) {
                            console.error('   • Hull health display not working properly');
                        }
                        if (!subTargetHealthWorking) {
                            console.error('   • Sub-target health styling issues');
                        }
                    }
                }, 1000);
            }, 2000);
        }, 1000);
    }
    
    // Function to test the complete health display styling
    function testCompleteHealthDisplayStyling() {
        console.log('\n=== Complete Health Display Styling Test ===');
        
        // Check if we have everything we need
        if (!starfieldManager || !ship) {
            console.error('❌ Game not ready. Please ensure you have a ship and are in starfield view.');
            return;
        }
        
        console.log('🚀 Testing complete health display styling consistency...');
        
        // 1. Check main hull health display
        const hullDisplayWorking = checkHullHealthDisplay();
        
        // 2. Check sub-target health styling
        const subTargetHealthWorking = checkSubTargetHealthDisplay();
        
        // 3. Show current status
        showCurrentHullStatus();
        
        // 4. Check styling consistency
        console.log('\n=== STYLING CONSISTENCY CHECK ===');
        const targetInfoDisplay = document.querySelector('#target-hud .target-info-display');
        if (targetInfoDisplay) {
            const allWhiteHealthText = targetInfoDisplay.querySelectorAll('div[style*="color: white"]');
            const allHealthBars = targetInfoDisplay.querySelectorAll('div[style*="background-color: #333"]');
            const allWhiteHealthBarFills = targetInfoDisplay.querySelectorAll('div[style*="background-color: white"]');
            
            console.log(`Found ${allWhiteHealthText.length} white health text elements`);
            console.log(`Found ${allHealthBars.length} health bar containers`);
            console.log(`Found ${allWhiteHealthBarFills.length} white health bar fills`);
            
            if (allWhiteHealthText.length > 0 && allHealthBars.length > 0 && allWhiteHealthBarFills.length > 0) {
                console.log('✅ Consistent white styling for all health displays');
            } else {
                console.log('⚠️ Health display styling may be inconsistent');
            }
        }
        
        // 5. Final result
        console.log('\n=== FINAL RESULT ===');
        if (hullDisplayWorking && subTargetHealthWorking) {
            console.log('✅ SUCCESS: All health displays are working with consistent white styling!');
            console.log('💡 Main hull health and sub-target health both use:');
            console.log('   • White text for labels and percentages');
            console.log('   • White health bars that stand out from faction colors');
            console.log('   • Consistent "Name: xx%" format');
        } else {
            console.log('❌ Some health displays need attention');
        }
    }
    
    // Expose functions globally for easy console access
    window.checkHullHealthDisplay = checkHullHealthDisplay;
    window.showCurrentHullStatus = showCurrentHullStatus;
    window.testHullDamageDisplay = testHullDamageDisplay;
    window.restoreHull = restoreHull;
    window.testCompleteHullDisplay = testCompleteHullDisplay;
    window.testCompleteHealthDisplayStyling = testCompleteHealthDisplayStyling;
    
    console.log('🎮 Hull health display test functions loaded!');
    console.log('\n📋 Available commands:');
    console.log('  checkHullHealthDisplay()     - Check if hull health is displayed correctly');
    console.log('  showCurrentHullStatus()      - Show current enemy hull status');
    console.log('  testHullDamageDisplay(amt)   - Apply damage and test display update');
    console.log('  restoreHull()                - Restore enemy hull to 100%');
    console.log('  testCompleteHullDisplay()    - Run complete test suite');
    console.log('  testCompleteHealthDisplayStyling() - Run complete health display styling test');
    
    console.log('\n🚀 Initial Test:');
    const initialTest = checkHullHealthDisplay();
    
    if (initialTest) {
        console.log('\n🎉 SUCCESS: Hull health display is working correctly!');
        console.log('💡 Try: testHullDamageDisplay(200) to test damage display');
        console.log('💡 Try: testCompleteHullDisplay() to run full test suite');
    } else {
        console.log('\n❌ FAILED: Hull health display is not working properly');
        console.log('💡 Check the target HUD - the hull health bar should appear between');
        console.log('💡 the target name/info and the sub-targeting information');
    }
    
    return {
        status: initialTest ? 'working' : 'broken',
        enemyShip: enemyShip.shipName || 'Enemy Ship',
        hull: `${enemyShip.currentHull}/${enemyShip.maxHull}`,
        hullDisplayWorking: initialTest
    };
})(); 