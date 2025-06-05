(function() {
    console.log('⚡ FREE DOCKING AND TARGET CYCLING TEST - Testing removal of energy requirements...');
    
    function testFreeDockingAndTargeting() {
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
        
        // Test 1: Drain energy to very low levels
        console.log('\n🔋 Test 1: Draining energy to test low power scenarios...');
        const originalEnergy = ship.currentEnergy;
        ship.currentEnergy = 5; // Very low energy
        
        console.log(`   • Original energy: ${originalEnergy.toFixed(1)} units`);
        console.log(`   • Current energy: ${ship.currentEnergy.toFixed(1)} units`);
        
        // Test 2: Target cycling with low energy
        console.log('\n🎯 Test 2: Testing target cycling with low energy...');
        
        // Enable target computer if not already enabled
        if (!starfieldManager.targetComputerEnabled) {
            console.log('   • Enabling target computer...');
            starfieldManager.toggleTargetComputer();
        }
        
        // Update target list
        starfieldManager.updateTargetList();
        const availableTargets = starfieldManager.targetObjects?.length || 0;
        console.log(`   • Available targets: ${availableTargets}`);
        
        if (availableTargets > 0) {
            const initialTarget = starfieldManager.currentTarget;
            console.log(`   • Initial target: ${initialTarget?.name || 'None'}`);
            
            // Try cycling targets with low energy
            try {
                starfieldManager.cycleTarget();
                const newTarget = starfieldManager.currentTarget;
                console.log(`   ✅ Target cycling successful! New target: ${newTarget?.name || 'None'}`);
                
                // Try another cycle
                starfieldManager.cycleTarget();
                const thirdTarget = starfieldManager.currentTarget;
                console.log(`   ✅ Second target cycle successful! Target: ${thirdTarget?.name || 'None'}`);
            } catch (error) {
                console.error(`   ❌ Target cycling failed: ${error.message}`);
            }
        } else {
            console.log('   ⚠️ No targets available for cycling test');
        }
        
        // Test 3: Docking with low energy
        console.log('\n🚀 Test 3: Testing docking capabilities with low energy...');
        
        // Find a dockable target
        let dockableTarget = null;
        if (starfieldManager.targetObjects) {
            for (const targetObj of starfieldManager.targetObjects) {
                const targetInfo = starfieldManager.solarSystemManager?.getCelestialBodyInfo(targetObj.object);
                if (targetInfo && (targetInfo.type === 'planet' || targetInfo.type === 'moon')) {
                    dockableTarget = targetObj.object;
                    break;
                }
            }
        }
        
        if (dockableTarget) {
            console.log(`   • Found dockable target: ${dockableTarget.name}`);
            
            // Check docking validation
            const dockingManager = starfieldManager.dockingSystemManager;
            if (dockingManager) {
                const dockingValidation = dockingManager.validateDocking(ship, dockableTarget, starfieldManager);
                console.log(`   • Docking validation - Can dock: ${dockingValidation.canDock}`);
                
                if (dockingValidation.reasons.length > 0) {
                    console.log(`   • Docking issues: ${dockingValidation.reasons.join(', ')}`);
                }
                
                if (dockingValidation.warnings.length > 0) {
                    console.log(`   • Docking warnings: ${dockingValidation.warnings.join(', ')}`);
                }
                
                // Test launch validation (for when docked)
                const launchValidation = dockingManager.validateLaunch(ship);
                console.log(`   • Launch validation - Can launch: ${launchValidation.canLaunch}`);
                console.log(`   • Launch energy cost: ${launchValidation.energyCost} units`);
                
                if (launchValidation.reasons.length > 0) {
                    console.log(`   • Launch issues: ${launchValidation.reasons.join(', ')}`);
                }
            }
        } else {
            console.log('   ⚠️ No dockable targets found for testing');
        }
        
        // Test 4: Target computer system status
        console.log('\n💻 Test 4: Checking target computer system status...');
        const targetComputer = ship.getSystem('target_computer');
        
        if (targetComputer) {
            const status = targetComputer.getStatus();
            console.log(`   • Target Computer Level: ${status.level}`);
            console.log(`   • Is Operational: ${status.isOperational}`);
            console.log(`   • Is Active: ${status.isActive}`);
            console.log(`   • Energy Consumption: ${status.energyConsumptionRate}/sec`);
            console.log(`   • Can Activate: ${targetComputer.canActivate(ship)}`);
            console.log(`   • Current Energy: ${ship.currentEnergy.toFixed(1)} units`);
            
            // Test activation with low energy
            if (!targetComputer.isActive) {
                console.log('   • Testing target computer activation with low energy...');
                const activationResult = targetComputer.activate(ship);
                console.log(`   • Activation ${activationResult ? 'successful' : 'failed'}`);
            }
        } else {
            console.log('   ❌ No target computer system found');
        }
        
        // Test 5: Energy reactor status
        console.log('\n🔋 Test 5: Checking energy reactor status...');
        const energyReactor = ship.getSystem('energy_reactor');
        
        if (energyReactor) {
            const reactorStatus = energyReactor.getStatus();
            console.log(`   • Energy Reactor Level: ${reactorStatus.level}`);
            console.log(`   • Is Operational: ${reactorStatus.isOperational}`);
            console.log(`   • Recharge Rate: ${reactorStatus.energyRechargeRate}/sec`);
            console.log(`   • Max Energy: ${reactorStatus.maxEnergy} units`);
        } else {
            console.log('   ❌ No energy reactor system found');
        }
        
        // Restore original energy
        console.log(`\\n🔄 Restoring original energy: ${originalEnergy.toFixed(1)} units`);
        ship.currentEnergy = originalEnergy;
        
        console.log('\\n✅ FREE DOCKING AND TARGET CYCLING TEST COMPLETE');
        console.log('   • Target cycling should work without energy requirements');
        console.log('   • Docking/undocking should work without energy requirements');
        console.log('   • Players can now access basic navigation even when low on power');
        
        return true;
    }
    
    // Auto-run the test
    if (typeof window !== 'undefined' && window.starfieldManager) {
        setTimeout(() => {
            testFreeDockingAndTargeting();
        }, 1000);
    } else {
        console.log('⏳ Waiting for StarfieldManager to load...');
        const checkInterval = setInterval(() => {
            if (typeof window !== 'undefined' && window.starfieldManager) {
                clearInterval(checkInterval);
                testFreeDockingAndTargeting();
            }
        }, 1000);
    }
    
    // Export for manual testing
    window.testFreeDockingAndTargeting = testFreeDockingAndTargeting;
    
})(); 