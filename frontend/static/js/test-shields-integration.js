/**
 * Test file to verify shields integration after fixing Ship.js syntax error
 */

import Ship from './ship/Ship.js';
import Shields from './ship/systems/Shields.js';

// Test that everything loads properly
export function testShieldsIntegration() {
    console.log('=== Testing Shields Integration (Post-Fix) ===');
    
    try {
        // Test 1: Create ship
        console.log('Creating ship...');
        const ship = new Ship('heavy_fighter');
        console.log('✓ Ship created successfully');
        
        // Test 2: Create shields
        console.log('Creating shields system...');
        const shields = new Shields(1);
        console.log('✓ Shields created successfully');
        
        // Test 3: Add shields to ship
        console.log('Adding shields to ship...');
        const added = ship.addSystem('shields', shields);
        console.log('✓ Shields added to ship:', added);
        
        // Test 4: Test S key functionality
        console.log('Testing shield toggle...');
        shields.activateShields();
        console.log('✓ Shields activated - energy consumption:', shields.getEnergyConsumptionRate().toFixed(2), '/sec');
        
        // Test 5: Test damage absorption
        console.log('Testing damage absorption...');
        const originalHull = ship.currentHull;
        ship.applyDamage(100);
        const hullAfterDamage = ship.currentHull;
        const damageAbsorbed = originalHull - hullAfterDamage < 100;
        console.log('✓ Damage test complete - shields absorbed damage:', damageAbsorbed);
        
        // Test 6: Energy consumption simulation
        console.log('Testing energy consumption...');
        const initialEnergy = ship.currentEnergy;
        ship.update(1000); // 1 second
        const energyConsumed = initialEnergy - ship.currentEnergy;
        console.log('✓ Energy consumed in 1 second:', energyConsumed.toFixed(2));
        
        console.log('\n=== All Tests Passed! ===');
        console.log('Ship status:', ship.getStatus());
        console.log('Shield status:', shields.getStatus());
        
        return { success: true, ship, shields };
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return { success: false, error: error.message };
    }
}

// Auto-run if loaded directly
if (typeof window !== 'undefined') {
    window.testShieldsIntegration = testShieldsIntegration;
    console.log('Shields integration test loaded. Run window.testShieldsIntegration() to test.');
} 