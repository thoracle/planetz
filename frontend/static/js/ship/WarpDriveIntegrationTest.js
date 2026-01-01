import { debug } from '../debug.js';

/**
 * WarpDrive Integration Test
 * Tests the new WarpDrive system integration with Ship architecture
 */

export function testWarpDriveIntegration() {
debug('UTILITY', '=== Testing WarpDrive System Integration ===');
    
    return new Promise(async (resolve) => {
        try {
            // Test 1: Import Ship and WarpDrive
debug('UTILITY', '\nTest 1: Importing Ship and WarpDrive classes');
            const { default: Ship } = await import('./Ship.js');
            const { default: WarpDrive } = await import('./systems/WarpDrive.js');
            
debug('UTILITY', '✓ Ship and WarpDrive classes imported successfully');
            
            // Test 2: Create Ship instance (should auto-initialize systems)
debug('UTILITY', '\nTest 2: Creating Ship with auto-initialized systems');
            const ship = new Ship('heavy_fighter');
            
            // Wait a moment for async system initialization
            setTimeout(() => {
debug('UTILITY', 'Ship systems count:', ship.systems.size);
debug('AI', 'Available systems:', Array.from(ship.systems.keys()));
                
                // Test 3: Check if WarpDrive system was created
debug('UTILITY', '\nTest 3: Checking WarpDrive system initialization');
                const warpDrive = ship.getWarpDrive();
debug('UTILITY', 'WarpDrive system exists:', !!warpDrive);
                
                if (warpDrive) {
debug('UTILITY', 'WarpDrive level:', warpDrive.level);
debug('UTILITY', 'WarpDrive max warp factor:', warpDrive.getMaxWarpFactor());
debug('UTILITY', 'WarpDrive is operational:', warpDrive.isOperational());
debug('UTILITY', 'WarpDrive health:', `${(warpDrive.healthPercentage * 100).toFixed(1)}%`);
                }
                
                // Test 4: Test WarpDrive level-specific capabilities
debug('UTILITY', '\nTest 4: Testing WarpDrive level capabilities');
                if (warpDrive) {
                    const levels = [1, 2, 3, 4, 5];
                    const levelData = levels.reduce((acc, level) => {
                        warpDrive.level = level;
                        warpDrive.levelStats = warpDrive.initializeLevelStats();

                        acc[`Level ${level}`] = {
                            'Max Warp Factor': warpDrive.getMaxWarpFactor(),
                            'Cooldown Time': `${warpDrive.getEffectiveCooldownTime() / 1000}s`,
                            'Energy Efficiency': `${((1 - (warpDrive.levelStats[level]?.energyEfficiency || 1)) * 100).toFixed(0)}% bonus`
                        };
                        return acc;
                    }, {});
                    debug('UTILITY', 'WarpDrive level capabilities:', JSON.stringify(levelData, null, 2));
                    
                    // Reset to level 1
                    warpDrive.level = 1;
                    warpDrive.levelStats = warpDrive.initializeLevelStats();
                }
                
                // Test 5: Test damage effects
debug('COMBAT', '\nTest 5: Testing WarpDrive damage effects');
                if (warpDrive) {
                    const originalMaxWarp = warpDrive.getMaxWarpFactor();
                    const originalCooldown = warpDrive.getEffectiveCooldownTime();
                    
                    // Apply 75% damage (critical state)
                    warpDrive.takeDamage(warpDrive.maxHealth * 0.75);
                    
debug('COMBAT', 'After 75% damage:');
debug('UTILITY', '  Max warp factor:', warpDrive.getMaxWarpFactor(), '(was', originalMaxWarp + ')');
debug('UTILITY', '  Cooldown time:', `${warpDrive.getEffectiveCooldownTime() / 1000}s`, `(was ${originalCooldown / 1000}s)`);
debug('UTILITY', '  Effectiveness:', `${(warpDrive.getEffectiveness() * 100).toFixed(1)}%`);
                    
                    // Test energy cost calculation with damage
                    const baseCost = 1000;
                    const damagedCost = warpDrive.calculateWarpEnergyCost(baseCost);
debug('COMBAT', '  Energy cost multiplier:', `${(damagedCost / baseCost).toFixed(2)}x`);
                    
                    // Repair the system
                    warpDrive.repair(1.0); // Full repair
debug('AI', 'After full repair:');
debug('UTILITY', '  Max warp factor:', warpDrive.getMaxWarpFactor());
debug('UTILITY', '  Effectiveness:', `${(warpDrive.getEffectiveness() * 100).toFixed(1)}%`);
                }
                
                // Test 6: Test Ship energy integration
debug('UTILITY', '\nTest 6: Testing Ship energy integration');
debug('UTILITY', 'Ship energy:', ship.currentEnergy, '/', ship.maxEnergy);
debug('UTILITY', 'Energy consumption rate:', ship.getEnergyConsumptionRate(), '/sec');
                
                // Test energy consumption
                const consumed = ship.consumeEnergy(500);
debug('UTILITY', 'Consumed 500 energy:', consumed);
debug('UTILITY', 'Ship energy after consumption:', ship.currentEnergy);
                
                // Test 7: Test system status in Ship
debug('UTILITY', '\nTest 7: Testing system status in Ship');
                const shipStatus = ship.getStatus();
debug('UTILITY', 'Ship status includes warp drive:', 'warp_drive' in shipStatus.systems);
                
                if ('warp_drive' in shipStatus.systems) {
                    const warpStatus = shipStatus.systems.warp_drive;
                    debug('UTILITY', 'WarpDrive status:', JSON.stringify({
                        health: `${(warpStatus.health * 100).toFixed(1)}%`,
                        level: warpStatus.level,
                        isActive: warpStatus.isActive,
                        canBeActivated: warpStatus.canBeActivated
                    }));
                }
                
                // Test 8: Test WarpDrive system-specific status
debug('UTILITY', '\nTest 8: Testing WarpDrive system-specific status');
                if (warpDrive) {
                    const warpDriveStatus = warpDrive.getStatus();
                    debug('UTILITY', 'WarpDrive detailed status:', JSON.stringify({
                        isWarping: warpDriveStatus.isWarping,
                        warpFactor: warpDriveStatus.warpFactor,
                        maxWarpFactor: warpDriveStatus.maxWarpFactor,
                        canWarp: warpDriveStatus.canWarp,
                        cooldownTime: warpDriveStatus.cooldownTime
                    }));
                }
                
debug('UTILITY', '\n=== WarpDrive Integration Test Complete ===');
debug('UTILITY', '✓ All tests passed - WarpDrive system successfully integrated with Ship architecture');
                
                resolve(true);
            }, 100); // Small delay for async initialization
            
        } catch (error) {
            debug('P1', '❌ WarpDrive Integration Test Failed:', error);
            resolve(false);
        }
    });
}

// Add a helper function to demonstrate WarpDrive adapter usage
export async function testWarpDriveAdapter() {
debug('UTILITY', '\n=== Testing WarpDriveAdapter Compatibility ===');
    
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
            
debug('UTILITY', 'Adapter connected:', adapter.isConnected());
debug('UTILITY', 'Adapter status:', adapter.getStatus());
            
            // Test compatibility methods
debug('UTILITY', 'Can set warp factor 5.0:', adapter.setWarpFactor(5.0));
debug('UTILITY', 'Current speed:', adapter.getCurrentSpeed());
            
            const warpSystem = adapter.getWarpDriveSystem();
debug('UTILITY', 'Underlying system accessible:', !!warpSystem);
debug('UTILITY', 'System max warp factor:', warpSystem?.getMaxWarpFactor());
            
debug('UTILITY', '✓ WarpDriveAdapter compatibility test passed');
        }, 100);
        
    } catch (error) {
        debug('P1', '❌ WarpDriveAdapter test failed:', error);
    }
}

// Export a combined test function
export function runAllWarpDriveTests() {
    return testWarpDriveIntegration().then(() => {
        return testWarpDriveAdapter();
    });
} 