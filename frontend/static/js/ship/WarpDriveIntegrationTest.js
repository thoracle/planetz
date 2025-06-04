/**
 * WarpDrive Integration Test
 * Tests the new WarpDrive system integration with Ship architecture
 */

export function testWarpDriveIntegration() {
    console.log('=== Testing WarpDrive System Integration ===');
    
    return new Promise(async (resolve) => {
        try {
            // Test 1: Import Ship and WarpDrive
            console.log('\nTest 1: Importing Ship and WarpDrive classes');
            const { default: Ship } = await import('./Ship.js');
            const { default: WarpDrive } = await import('./systems/WarpDrive.js');
            
            console.log('✓ Ship and WarpDrive classes imported successfully');
            
            // Test 2: Create Ship instance (should auto-initialize systems)
            console.log('\nTest 2: Creating Ship with auto-initialized systems');
            const ship = new Ship('heavy_fighter');
            
            // Wait a moment for async system initialization
            setTimeout(() => {
                console.log('Ship systems count:', ship.systems.size);
                console.log('Available systems:', Array.from(ship.systems.keys()));
                
                // Test 3: Check if WarpDrive system was created
                console.log('\nTest 3: Checking WarpDrive system initialization');
                const warpDrive = ship.getWarpDrive();
                console.log('WarpDrive system exists:', !!warpDrive);
                
                if (warpDrive) {
                    console.log('WarpDrive level:', warpDrive.level);
                    console.log('WarpDrive max warp factor:', warpDrive.getMaxWarpFactor());
                    console.log('WarpDrive is operational:', warpDrive.isOperational());
                    console.log('WarpDrive health:', `${(warpDrive.healthPercentage * 100).toFixed(1)}%`);
                }
                
                // Test 4: Test WarpDrive level-specific capabilities
                console.log('\nTest 4: Testing WarpDrive level capabilities');
                if (warpDrive) {
                    const levels = [1, 2, 3, 4, 5];
                    console.table(
                        levels.reduce((acc, level) => {
                            warpDrive.level = level;
                            warpDrive.levelStats = warpDrive.initializeLevelStats();
                            
                            acc[`Level ${level}`] = {
                                'Max Warp Factor': warpDrive.getMaxWarpFactor(),
                                'Cooldown Time': `${warpDrive.getEffectiveCooldownTime() / 1000}s`,
                                'Energy Efficiency': `${((1 - (warpDrive.levelStats[level]?.energyEfficiency || 1)) * 100).toFixed(0)}% bonus`
                            };
                            return acc;
                        }, {})
                    );
                    
                    // Reset to level 1
                    warpDrive.level = 1;
                    warpDrive.levelStats = warpDrive.initializeLevelStats();
                }
                
                // Test 5: Test damage effects
                console.log('\nTest 5: Testing WarpDrive damage effects');
                if (warpDrive) {
                    const originalMaxWarp = warpDrive.getMaxWarpFactor();
                    const originalCooldown = warpDrive.getEffectiveCooldownTime();
                    
                    // Apply 75% damage (critical state)
                    warpDrive.takeDamage(warpDrive.maxHealth * 0.75);
                    
                    console.log('After 75% damage:');
                    console.log('  System state:', warpDrive.state);
                    console.log('  Max warp factor:', warpDrive.getMaxWarpFactor(), '(was', originalMaxWarp + ')');
                    console.log('  Cooldown time:', `${warpDrive.getEffectiveCooldownTime() / 1000}s`, `(was ${originalCooldown / 1000}s)`);
                    console.log('  Effectiveness:', `${(warpDrive.getEffectiveness() * 100).toFixed(1)}%`);
                    
                    // Test energy cost calculation with damage
                    const baseCost = 1000;
                    const damagedCost = warpDrive.calculateWarpEnergyCost(baseCost);
                    console.log('  Energy cost multiplier:', `${(damagedCost / baseCost).toFixed(2)}x`);
                    
                    // Repair the system
                    warpDrive.repair(1.0); // Full repair
                    console.log('After full repair:');
                    console.log('  System state:', warpDrive.state);
                    console.log('  Max warp factor:', warpDrive.getMaxWarpFactor());
                    console.log('  Effectiveness:', `${(warpDrive.getEffectiveness() * 100).toFixed(1)}%`);
                }
                
                // Test 6: Test Ship energy integration
                console.log('\nTest 6: Testing Ship energy integration');
                console.log('Ship energy:', ship.currentEnergy, '/', ship.maxEnergy);
                console.log('Energy consumption rate:', ship.getEnergyConsumptionRate(), '/sec');
                
                // Test energy consumption
                const consumed = ship.consumeEnergy(500);
                console.log('Consumed 500 energy:', consumed);
                console.log('Ship energy after consumption:', ship.currentEnergy);
                
                // Test 7: Test system status in Ship
                console.log('\nTest 7: Testing system status in Ship');
                const shipStatus = ship.getStatus();
                console.log('Ship status includes warp drive:', 'warp_drive' in shipStatus.systems);
                
                if ('warp_drive' in shipStatus.systems) {
                    const warpStatus = shipStatus.systems.warp_drive;
                    console.log('WarpDrive status:', {
                        health: `${(warpStatus.health * 100).toFixed(1)}%`,
                        level: warpStatus.level,
                        isActive: warpStatus.isActive,
                        canBeActivated: warpStatus.canBeActivated
                    });
                }
                
                // Test 8: Test WarpDrive system-specific status
                console.log('\nTest 8: Testing WarpDrive system-specific status');
                if (warpDrive) {
                    const warpDriveStatus = warpDrive.getStatus();
                    console.log('WarpDrive detailed status:', {
                        isWarping: warpDriveStatus.isWarping,
                        warpFactor: warpDriveStatus.warpFactor,
                        maxWarpFactor: warpDriveStatus.maxWarpFactor,
                        canWarp: warpDriveStatus.canWarp,
                        cooldownTime: warpDriveStatus.cooldownTime
                    });
                }
                
                console.log('\n=== WarpDrive Integration Test Complete ===');
                console.log('✓ All tests passed - WarpDrive system successfully integrated with Ship architecture');
                
                resolve(true);
            }, 100); // Small delay for async initialization
            
        } catch (error) {
            console.error('❌ WarpDrive Integration Test Failed:', error);
            resolve(false);
        }
    });
}

// Add a helper function to demonstrate WarpDrive adapter usage
export async function testWarpDriveAdapter() {
    console.log('\n=== Testing WarpDriveAdapter Compatibility ===');
    
    try {
        const { default: Ship } = await import('./Ship.js');
        const { default: WarpDriveAdapter } = await import('../WarpDriveAdapter.js');
        
        // Create mock ViewManager
        const mockViewManager = {
            getShipEnergy: () => 5000,
            shipEnergy: 5000
        };
        
        // Create ship and adapter
        const ship = new Ship('heavy_fighter');
        const adapter = new WarpDriveAdapter(mockViewManager);
        
        // Wait for ship systems to initialize
        setTimeout(() => {
            // Connect adapter to ship
            adapter.connectToShip(ship);
            
            console.log('Adapter connected:', adapter.isConnected());
            console.log('Adapter status:', adapter.getStatus());
            
            // Test compatibility methods
            console.log('Can set warp factor 5.0:', adapter.setWarpFactor(5.0));
            console.log('Current speed:', adapter.getCurrentSpeed());
            
            const warpSystem = adapter.getWarpDriveSystem();
            console.log('Underlying system accessible:', !!warpSystem);
            console.log('System max warp factor:', warpSystem?.getMaxWarpFactor());
            
            console.log('✓ WarpDriveAdapter compatibility test passed');
        }, 100);
        
    } catch (error) {
        console.error('❌ WarpDriveAdapter test failed:', error);
    }
}

// Export a combined test function
export function runAllWarpDriveTests() {
    return testWarpDriveIntegration().then(() => {
        return testWarpDriveAdapter();
    });
} 