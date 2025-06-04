(function() {
    console.log('🔋 ENERGY RECHARGE SERVICE TEST - Testing paid energy recharge functionality...');
    
    function testEnergyRechargeService() {
        const starfieldManager = window.starfieldManager;
        
        if (!starfieldManager) {
            console.error('❌ StarfieldManager not found');
            return;
        }
        
        const ship = starfieldManager.viewManager?.getShip();
        if (!ship) {
            console.error('❌ Ship not found');
            return;
        }
        
        console.log('✅ Found StarfieldManager and Ship');
        
        // Check current energy status
        const currentEnergy = ship.currentEnergy || 0;
        const maxEnergy = ship.maxEnergy || 0;
        const energyPercentage = maxEnergy > 0 ? (currentEnergy / maxEnergy) * 100 : 0;
        
        console.log(`🔋 Current Energy Status:`);
        console.log(`   Current: ${currentEnergy.toFixed(0)} / ${maxEnergy.toFixed(0)} (${energyPercentage.toFixed(1)}%)`);
        
        // Test the station repair interface
        const repairInterface = starfieldManager.dockingInterface?.stationRepairInterface;
        if (!repairInterface) {
            console.error('❌ Station repair interface not found');
            return;
        }
        
        console.log('✅ Found Station Repair Interface');
        
        // Test energy calculation methods
        console.log('\n💰 Testing Energy Recharge Calculations:');
        
        const energyDeficit = maxEnergy - currentEnergy;
        if (energyDeficit > 0) {
            const partialRecharge = Math.floor(energyDeficit * 0.5);
            const fullRecharge = energyDeficit;
            
            const partialCost = repairInterface.calculateEnergyRechargeCost(partialRecharge);
            const fullCost = repairInterface.calculateEnergyRechargeCost(fullRecharge);
            const emergencyCost = Math.floor(fullCost * 2.0); // Emergency multiplier
            
            const partialTime = repairInterface.calculateEnergyRechargeTime(partialRecharge);
            const fullTime = repairInterface.calculateEnergyRechargeTime(fullRecharge);
            
            console.log(`   Partial Recharge (${partialRecharge} units): ${partialCost} credits, ${partialTime}s`);
            console.log(`   Full Recharge (${fullRecharge} units): ${fullCost} credits, ${fullTime}s`);
            console.log(`   Emergency Full Recharge: ${emergencyCost} credits, instant`);
        } else {
            console.log('   Energy is at full capacity - no recharge needed');
        }
        
        // Test manual energy reduction for demonstration
        console.log('\n🧪 Testing Energy Recharge Functionality:');
        
        if (energyDeficit <= 0) {
            console.log('   Reducing energy to 50% for testing...');
            ship.currentEnergy = maxEnergy * 0.5;
            console.log(`   Energy reduced to: ${ship.currentEnergy.toFixed(0)} / ${maxEnergy.toFixed(0)}`);
        }
        
        // Test the energy recharge functions
        window.testPartialRecharge = function() {
            const energyDeficit = ship.maxEnergy - ship.currentEnergy;
            const rechargeAmount = Math.floor(energyDeficit * 0.5);
            console.log(`🔋 Testing partial recharge of ${rechargeAmount} energy units...`);
            
            if (repairInterface.rechargeEnergy) {
                const originalCredits = repairInterface.playerCredits;
                const result = repairInterface.rechargeEnergy(rechargeAmount, false);
                const creditsUsed = originalCredits - repairInterface.playerCredits;
                
                if (result) {
                    console.log(`✅ Partial recharge successful! Used ${creditsUsed} credits`);
                    console.log(`   New energy: ${ship.currentEnergy.toFixed(0)} / ${ship.maxEnergy.toFixed(0)}`);
                } else {
                    console.log(`❌ Partial recharge failed`);
                }
            }
        };
        
        window.testFullRecharge = function() {
            console.log(`🔋 Testing full energy recharge...`);
            
            if (repairInterface.rechargeEnergy) {
                const originalCredits = repairInterface.playerCredits;
                const result = repairInterface.rechargeEnergy(null, false);
                const creditsUsed = originalCredits - repairInterface.playerCredits;
                
                if (result) {
                    console.log(`✅ Full recharge successful! Used ${creditsUsed} credits`);
                    console.log(`   New energy: ${ship.currentEnergy.toFixed(0)} / ${ship.maxEnergy.toFixed(0)}`);
                } else {
                    console.log(`❌ Full recharge failed`);
                }
            }
        };
        
        window.testEmergencyRecharge = function() {
            // Reduce energy first
            ship.currentEnergy = ship.maxEnergy * 0.3;
            console.log(`🔋 Testing emergency recharge (instant)...`);
            console.log(`   Energy reduced to: ${ship.currentEnergy.toFixed(0)} / ${ship.maxEnergy.toFixed(0)}`);
            
            if (repairInterface.rechargeEnergy) {
                const originalCredits = repairInterface.playerCredits;
                const result = repairInterface.rechargeEnergy(null, true);
                const creditsUsed = originalCredits - repairInterface.playerCredits;
                
                if (result) {
                    console.log(`✅ Emergency recharge successful! Used ${creditsUsed} credits`);
                    console.log(`   New energy: ${ship.currentEnergy.toFixed(0)} / ${ship.maxEnergy.toFixed(0)}`);
                } else {
                    console.log(`❌ Emergency recharge failed`);
                }
            }
        };
        
        window.testRepairInterface = function() {
            console.log(`🏥 Opening repair interface to test energy recharge panel...`);
            
            // Show the repair interface
            repairInterface.show(ship, 'Test Station');
            console.log(`✅ Repair interface opened - check for energy recharge panel`);
        };
        
        // Display current credits
        console.log(`\n💰 Current Credits: ${repairInterface.playerCredits.toLocaleString()}`);
        
        console.log('\n=== Available Test Functions ===');
        console.log('testPartialRecharge() - Test 50% energy recharge');
        console.log('testFullRecharge() - Test full energy recharge');
        console.log('testEmergencyRecharge() - Test instant emergency recharge');
        console.log('testRepairInterface() - Open repair interface to see energy panel');
        
        console.log('\n✅ Energy Recharge Service Test Complete!');
        console.log('🎯 Energy recharging is now a paid service with multiple options');
        
        // Auto-test if energy is low
        if (energyPercentage < 80) {
            console.log('\n🤖 Auto-opening repair interface since energy is below 80%...');
            setTimeout(() => {
                window.testRepairInterface();
            }, 1000);
        }
    }
    
    // Run the test
    testEnergyRechargeService();
    
})(); 