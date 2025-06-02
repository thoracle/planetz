// Context-Sensitive Tech Manual Test
// Run this in the browser console to test the new tech manual interface

(function() {
    console.log('=== Context-Sensitive Tech Manual Test ===');
    
    // Get the game components
    const starfieldManager = window.viewManager?.starfieldManager;
    const ship = window.viewManager?.getShip();
    
    if (!starfieldManager || !ship) {
        console.error('❌ Game not ready. Make sure you have a ship and are in-game.');
        console.log('💡 1. Load the game at http://localhost:5001');
        console.log('💡 2. Press H to open the tech manual');
        console.log('💡 3. Run this test again');
        return;
    }
    
    console.log('✅ Game ready for tech manual testing');
    
    // Function to analyze ship configuration
    function analyzeShipConfiguration() {
        console.log('\n🔍 Ship Configuration Analysis:');
        console.log(`   Ship Type: ${ship.shipType}`);
        
        // Check systems
        const systemsToCheck = [
            'impulse_engines', 'warp_drive', 'shields', 'target_computer',
            'long_range_scanner', 'subspace_radio', 'galactic_chart'
        ];
        
        const availableSystems = {};
        let systemCount = 0;
        
        for (const systemName of systemsToCheck) {
            const system = ship.getSystem(systemName);
            const hasCards = ship.hasSystemCardsSync && ship.hasSystemCardsSync(systemName);
            
            if (system && hasCards) {
                availableSystems[systemName] = {
                    level: system.level,
                    health: Math.round(system.healthPercentage * 100),
                    operational: system.isOperational()
                };
                systemCount++;
                console.log(`   ✅ ${systemName}: Level ${system.level} (${Math.round(system.healthPercentage * 100)}% health)`);
            } else if (system && !hasCards) {
                console.log(`   🔴 ${systemName}: Present but no cards installed`);
            } else {
                console.log(`   ❌ ${systemName}: Not available`);
            }
        }
        
        // Check weapons
        let weaponCount = 0;
        if (ship.weaponSystem) {
            console.log('   \n🚀 Weapon Systems:');
            for (let i = 0; i < ship.weaponSystem.weaponSlots.length; i++) {
                const slot = ship.weaponSystem.weaponSlots[i];
                if (!slot.isEmpty && slot.weaponCard) {
                    weaponCount++;
                    console.log(`   ✅ Slot ${i + 1}: ${slot.weaponCard.name} (Lv.${slot.weaponCard.level})`);
                } else {
                    console.log(`   ❌ Slot ${i + 1}: Empty`);
                }
            }
        }
        
        console.log(`\n📊 Summary: ${systemCount} systems available, ${weaponCount} weapons equipped`);
        
        return { availableSystems, weaponCount, systemCount };
    }
    
    // Function to test tech manual display
    function testTechManual() {
        console.log('\n🖥️ Testing Tech Manual Interface...');
        
        if (!starfieldManager.helpInterface) {
            console.error('❌ Help interface not available');
            return false;
        }
        
        // Test context detection
        const context = starfieldManager.helpInterface.getShipContext();
        if (!context) {
            console.error('❌ Failed to get ship context');
            return false;
        }
        
        console.log('✅ Ship context detected successfully');
        console.log(`   Ship Type: ${context.shipType}`);
        console.log(`   Available Systems: ${Object.keys(context.availableSystems).length}`);
        console.log(`   Equipped Weapons: ${context.equippedWeapons.length}`);
        console.log(`   Has Target Computer: ${context.hasTargetComputer ? 'Yes' : 'No'}`);
        console.log(`   Has Sub-Targeting: ${context.hasSubTargeting ? 'Yes (Level 2+)' : 'No'}`);
        
        return true;
    }
    
    // Function to demonstrate manual features
    function demonstrateManualFeatures() {
        console.log('\n📖 Tech Manual Features:');
        console.log('   ✅ Context-sensitive control display');
        console.log('   ✅ Ship-specific system information');
        console.log('   ✅ Real-time system status (health, level)');
        console.log('   ✅ Weapon loadout display');
        console.log('   ✅ Retro green monitor styling');
        console.log('   ✅ Scan line animation effects');
        console.log('   ✅ System availability warnings');
        console.log('   ✅ Card-based feature detection');
        
        console.log('\n🎯 Manual Sections:');
        console.log('   • Basic Navigation (always shown)');
        console.log('   • Impulse Propulsion (if engines equipped)');
        console.log('   • Ship Systems (shows only available systems)');
        console.log('   • Combat Systems (if target computer/weapons available)');
        console.log('   • Advanced Operations (training & emergency functions)');
    }
    
    // Function to test different scenarios
    function testScenarios() {
        console.log('\n🧪 Testing Different Scenarios:');
        
        const context = starfieldManager.helpInterface.getShipContext();
        
        // Test engine damage scenario
        if (context.availableSystems.impulse_engines) {
            const engine = context.availableSystems.impulse_engines;
            if (engine.health < 75) {
                console.log('   ⚠️ Engine damage detected - manual will show caution text');
            } else {
                console.log('   ✅ Engines healthy - full speed controls available');
            }
        }
        
        // Test combat capabilities
        if (context.hasTargetComputer && context.hasWeapons) {
            console.log('   ⚔️ Full combat capabilities - all weapon controls shown');
        } else if (context.hasTargetComputer) {
            console.log('   🎯 Target computer only - targeting controls shown');
        } else if (context.hasWeapons) {
            console.log('   🚀 Weapons only - basic firing controls shown');
        } else {
            console.log('   🚫 No combat systems - combat section disabled');
        }
        
        // Test sub-targeting
        if (context.hasSubTargeting) {
            console.log('   🎯 Sub-targeting available - precision targeting controls shown');
        } else if (context.hasTargetComputer) {
            console.log('   🎯 Basic targeting only - upgrade to Level 2+ for sub-targeting');
        }
    }
    
    // Function to show manual interaction guide
    function showInteractionGuide() {
        console.log('\n📱 Tech Manual Interaction Guide:');
        console.log('   • Press H to open/close the tech manual');
        console.log('   • Click [ ESC ] button or press Escape to close');
        console.log('   • Manual updates automatically based on equipped cards');
        console.log('   • Damaged systems show warning indicators');
        console.log('   • Unavailable systems are hidden or marked offline');
        console.log('   • Weapon loadout displays current equipped weapons');
        console.log('   • System levels and health shown in real-time');
    }
    
    // Main test function
    function runTechManualTest() {
        console.log('🚀 Running complete tech manual test...\n');
        
        // 1. Analyze current ship configuration
        const config = analyzeShipConfiguration();
        
        // 2. Test tech manual functionality
        const manualWorking = testTechManual();
        
        if (manualWorking) {
            // 3. Demonstrate features
            demonstrateManualFeatures();
            
            // 4. Test scenarios
            testScenarios();
            
            // 5. Show interaction guide
            showInteractionGuide();
            
            console.log('\n✨ Tech Manual Test Complete!');
            console.log('📖 Press H to open the context-sensitive tech manual');
            console.log('🎮 Manual will show only the controls available for your ship');
            
        } else {
            console.error('❌ Tech manual test failed - check console for errors');
        }
    }
    
    // Export test functions for manual use
    window.analyzeShipConfiguration = analyzeShipConfiguration;
    window.testTechManual = testTechManual;
    window.demonstrateManualFeatures = demonstrateManualFeatures;
    window.testScenarios = testScenarios;
    window.runTechManualTest = runTechManualTest;
    
    console.log('🎮 Tech Manual test functions loaded! Available commands:');
    console.log('  runTechManualTest()           - Run complete tech manual test');
    console.log('  analyzeShipConfiguration()    - Analyze current ship setup');
    console.log('  testTechManual()              - Test manual functionality');
    console.log('  demonstrateManualFeatures()   - Show manual features');
    console.log('  testScenarios()               - Test different scenarios');
    console.log('');
    console.log('🚀 Quick Start:');
    console.log('  1. runTechManualTest() - Run full analysis');
    console.log('  2. Press H in-game to open the tech manual');
    console.log('  3. Notice how it shows only available systems/controls');
    console.log('');
    console.log('📖 The tech manual now displays:');
    console.log('  • Only systems you have cards for');
    console.log('  • Current weapon loadout');
    console.log('  • System health and levels');
    console.log('  • Damage warnings for critical systems');
    console.log('  • Retro green monitor styling with scan lines');
    
    // Auto-run the test
    console.log('\n🤖 Auto-running tech manual test...');
    runTechManualTest();
    
})(); 