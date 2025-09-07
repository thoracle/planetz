import { debug } from '../debug.js';

/**
 * Ship Integration Test
 * Tests the integration between Ship class and ViewManager
 */

export function testShipIntegration(viewManager) {
debug('UTILITY', '=== Testing Ship Integration ===');
    
    // Test 1: ViewManager has Ship instance
debug('UTILITY', 'Test 1: ViewManager Ship Instance');
    const ship = viewManager.getShip();
debug('UTILITY', 'Ship exists:', !!ship);
debug('UTILITY', 'Ship type:', ship?.shipType);
debug('UTILITY', 'Ship status:', ship?.getStatus());
    
    // Test 2: Energy system compatibility
debug('UTILITY', '\nTest 2: Energy System Compatibility');
    const initialEnergy = viewManager.getShipEnergy();
debug('UTILITY', 'Initial energy via ViewManager:', initialEnergy);
debug('UTILITY', 'Initial energy via Ship:', ship?.currentEnergy);
debug('UTILITY', 'Energy values match:', initialEnergy === ship?.currentEnergy);
    
    // Test 3: Energy consumption
debug('UTILITY', '\nTest 3: Energy Consumption');
    const consumed = ship?.consumeEnergy(100);
debug('UTILITY', 'Energy consumption successful:', consumed);
debug('UTILITY', 'Energy after consumption:', viewManager.getShipEnergy());
    
    // Test 4: Energy update via ViewManager
debug('UTILITY', '\nTest 4: Energy Update via ViewManager');
    const oldEnergy = viewManager.getShipEnergy();
    viewManager.updateShipEnergy(50);
    const newEnergy = viewManager.getShipEnergy();
debug('UTILITY', 'Energy updated:', oldEnergy, '->', newEnergy);
    
    // Test 5: Ship systems
debug('UTILITY', '\nTest 5: Ship Systems');
debug('UTILITY', 'System count:', ship?.systems.size);
debug('AI', 'Available power:', ship?.availablePower);
debug('AI', 'Available slots:', ship?.availableSlots);
    
    // Test 6: Ship configuration
debug('UTILITY', '\nTest 6: Ship Configuration');
debug('UTILITY', 'Max energy:', ship?.maxEnergy);
debug('UTILITY', 'Energy recharge rate:', ship?.energyRechargeRate);
debug('UTILITY', 'Power grid:', ship?.totalPower);
    
debug('UTILITY', '=== Ship Integration Test Complete ===');
    return true;
}

// Add a debug function to test ship systems
export function debugShipSystems(viewManager) {
debug('INSPECTION', '=== Ship Systems Debug ===');
    const ship = viewManager.getShip();
    const status = ship.getStatus();
    
    console.table({
        'Ship Type': status.shipType,
        'Hull': `${status.hull.current}/${status.hull.max} (${status.hull.percentage.toFixed(1)}%)`,
        'Energy': `${status.energy.current}/${status.energy.max} (${status.energy.percentage.toFixed(1)}%)`,
        'Power': `${status.power.used}/${status.power.total} (${status.power.available} available)`,
        'Slots': `${status.slots.used}/${status.slots.total} (${status.slots.available} available)`,
        'Systems': status.systemCount
    });
    
debug('UTILITY', 'Stats:', status.stats);
}

// Auto-run basic test if this file is loaded directly
if (typeof window !== 'undefined' && window.viewManager) {
    setTimeout(() => {
        testShipIntegration(window.viewManager);
    }, 1000);
} 