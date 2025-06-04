// Test script to debug launch issue and verify ship switching fix
setTimeout(() => {
    console.log('\n=== LAUNCH DEBUG TEST ===');
    
    // Get managers
    const vm = window.viewManager;
    const sm = window.starfieldManager;
    
    if (!vm || !sm) {
        console.error('❌ Required managers not found');
        return;
    }
    
    // Get ship instance
    const ship = vm.getShip();
    if (!ship) {
        console.error('❌ No ship instance found');
        return;
    }
    
    console.log('✅ Ship found:', ship.shipType);
    
    // Check all systems
    console.log('\n📋 ALL SHIP SYSTEMS:');
    console.log('- Total systems in map:', ship.systems.size);
    ship.systems.forEach((system, name) => {
        console.log(`  • ${name}: ${system.constructor.name} (health: ${(system.healthPercentage * 100).toFixed(1)}%, operational: ${system.isOperational()})`);
    });
    
    // Specifically check for impulse engines
    console.log('\n🚀 IMPULSE ENGINES CHECK:');
    const impulseEngines = ship.getSystem('impulse_engines');
    console.log('- getSystem("impulse_engines") result:', impulseEngines);
    
    if (impulseEngines) {
        console.log('✅ Impulse engines found and operational:', impulseEngines.isOperational());
    } else {
        console.log('❌ Impulse engines not found via getSystem()');
        console.log('- Similar system names:');
        ship.systems.forEach((system, name) => {
            if (name.includes('engine') || name.includes('impulse')) {
                console.log(`  - ${name}`);
            }
        });
    }
    
    // Test launch validation
    console.log('\n🧪 LAUNCH VALIDATION TEST:');
    const dockingManager = ship.dockingSystemManager;
    if (dockingManager) {
        const canLaunch = dockingManager.validateLaunch();
        console.log('- Can launch:', canLaunch.canLaunch);
        console.log('- Reasons:', canLaunch.reasons);
        console.log('- Warnings:', canLaunch.warnings);
        console.log('- Energy cost:', canLaunch.energyCost);
    }
    
    // Check docking status
    console.log('\n🚢 DOCKING STATUS:');
    console.log('- Is docked:', sm.isDocked);
    console.log('- Docked to:', sm.dockedLocation || 'None');
    
    // Test the ship switching fix
    console.log('\n🔄 TESTING SHIP SWITCH FIX:');
    
    // Test function to check ship switching
    window.testShipSwitch = async (newShipType) => {
        console.log(`\n=== TESTING SHIP SWITCH TO ${newShipType.toUpperCase()} ===`);
        
        // Save current state
        const originalShipType = ship.shipType;
        const originalSystemCount = ship.systems.size;
        
        console.log(`📊 BEFORE SWITCH:`);
        console.log(`- Ship type: ${originalShipType}`);
        console.log(`- System count: ${originalSystemCount}`);
        console.log(`- Has impulse engines: ${!!ship.getSystem('impulse_engines')}`);
        
        try {
            // Switch ship
            console.log(`🔄 Switching to ${newShipType}...`);
            await vm.switchShip(newShipType);
            
            // Check new state
            const newShip = vm.getShip();
            console.log(`\n📊 AFTER SWITCH:`);
            console.log(`- Ship type: ${newShip.shipType}`);
            console.log(`- System count: ${newShip.systems.size}`);
            console.log(`- Has impulse engines: ${!!newShip.getSystem('impulse_engines')}`);
            
            // Check if impulse engines are operational
            const newImpulseEngines = newShip.getSystem('impulse_engines');
            if (newImpulseEngines) {
                console.log('✅ SUCCESS: Impulse engines found and operational:', newImpulseEngines.isOperational());
                
                // Test launch validation after switch
                const newDockingManager = newShip.dockingSystemManager;
                if (newDockingManager) {
                    const canLaunch = newDockingManager.validateLaunch();
                    console.log('✅ Launch validation after switch:', canLaunch.canLaunch);
                    if (!canLaunch.canLaunch) {
                        console.log('❌ Launch still failing:', canLaunch.reasons);
                    }
                }
            } else {
                console.error('❌ FAILED: Impulse engines still not found after ship switch');
                
                // List all available systems
                console.log('Available systems after switch:');
                newShip.systems.forEach((system, name) => {
                    console.log(`  • ${name}: ${system.constructor.name}`);
                });
            }
            
        } catch (error) {
            console.error('❌ Error during ship switch test:', error);
        }
    };
    
    console.log('🧪 Test function created: window.testShipSwitch(shipType)');
    console.log('📝 Try: testShipSwitch("light_fighter") or testShipSwitch("scout")');
    
}, 3000); // Wait 3 seconds for everything to load 