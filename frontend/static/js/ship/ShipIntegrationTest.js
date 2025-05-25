/**
 * Ship Integration Test
 * Tests the integration between Ship class and ViewManager
 */

export function testShipIntegration(viewManager) {
    console.log('=== Testing Ship Integration ===');
    
    // Test 1: ViewManager has Ship instance
    console.log('Test 1: ViewManager Ship Instance');
    const ship = viewManager.getShip();
    console.log('Ship exists:', !!ship);
    console.log('Ship type:', ship?.shipType);
    console.log('Ship status:', ship?.getStatus());
    
    // Test 2: Energy system compatibility
    console.log('\nTest 2: Energy System Compatibility');
    const initialEnergy = viewManager.getShipEnergy();
    console.log('Initial energy via ViewManager:', initialEnergy);
    console.log('Initial energy via Ship:', ship?.currentEnergy);
    console.log('Energy values match:', initialEnergy === ship?.currentEnergy);
    
    // Test 3: Energy consumption
    console.log('\nTest 3: Energy Consumption');
    const consumed = ship?.consumeEnergy(100);
    console.log('Energy consumption successful:', consumed);
    console.log('Energy after consumption:', viewManager.getShipEnergy());
    
    // Test 4: Energy update via ViewManager
    console.log('\nTest 4: Energy Update via ViewManager');
    const oldEnergy = viewManager.getShipEnergy();
    viewManager.updateShipEnergy(50);
    const newEnergy = viewManager.getShipEnergy();
    console.log('Energy updated:', oldEnergy, '->', newEnergy);
    
    // Test 5: Ship systems
    console.log('\nTest 5: Ship Systems');
    console.log('System count:', ship?.systems.size);
    console.log('Available power:', ship?.availablePower);
    console.log('Available slots:', ship?.availableSlots);
    
    // Test 6: Ship configuration
    console.log('\nTest 6: Ship Configuration');
    console.log('Max energy:', ship?.maxEnergy);
    console.log('Energy recharge rate:', ship?.energyRechargeRate);
    console.log('Power grid:', ship?.totalPower);
    
    console.log('=== Ship Integration Test Complete ===');
    return true;
}

// Add a debug function to test ship systems
export function debugShipSystems(viewManager) {
    console.log('=== Ship Systems Debug ===');
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
    
    console.log('Stats:', status.stats);
}

// Auto-run basic test if this file is loaded directly
if (typeof window !== 'undefined' && window.viewManager) {
    setTimeout(() => {
        testShipIntegration(window.viewManager);
    }, 1000);
} 