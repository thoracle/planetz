/**
 * Test file for the simplified energy system
 * Verifies that systems consume energy from shared pool when active
 */

import Ship from './Ship.js';
import System from './System.js';

export function testSimplifiedEnergySystem() {
    console.log('=== Testing Simplified Energy System ===');
    
    // Test 1: Create ship with simplified energy system
    console.log('\nTest 1: Ship Creation');
    const ship = new Ship('heavy_fighter');
    console.log('Ship created with energy:', ship.currentEnergy, '/', ship.maxEnergy);
    console.log('Ship has no power grid - only energy pool');
    
    // Test 2: Create test systems with energy consumption
    console.log('\nTest 2: Creating Systems with Energy Consumption');
    const shields = new System('test_shields', 1, {
        slotCost: 2,
        energyConsumptionRate: 25, // 25 energy per second when active
        systemType: 'shields'
    });
    
    const scanner = new System('test_scanner', 1, {
        slotCost: 1,
        energyConsumptionRate: 5, // 5 energy per second when active
        systemType: 'scanner'
    });
    
    console.log('Shields energy consumption rate:', shields.energyConsumptionRate);
    console.log('Scanner energy consumption rate:', scanner.energyConsumptionRate);
    
    // Test 3: Add systems to ship (no power grid check)
    console.log('\nTest 3: Adding Systems (No Power Grid Checks)');
    const shieldsAdded = ship.addSystem('shields', shields);
    const scannerAdded = ship.addSystem('scanner', scanner);
    
    console.log('Shields added:', shieldsAdded);
    console.log('Scanner added:', scannerAdded);
    console.log('Used slots:', ship.usedSlots, '/', ship.totalSlots);
    
    // Test 4: Activate systems and check energy consumption
    console.log('\nTest 4: System Activation and Energy Consumption');
    console.log('Initial energy:', ship.currentEnergy);
    
    // Activate shields
    shields.activate(ship);
    console.log('Shields activated, consumption rate:', shields.getEnergyConsumptionRate());
    
    // Activate scanner
    scanner.activate(ship);
    console.log('Scanner activated, consumption rate:', scanner.getEnergyConsumptionRate());
    
    // Check total consumption
    const totalConsumption = ship.getEnergyConsumptionRate();
    console.log('Total energy consumption rate:', totalConsumption, 'per second');
    
    // Test 5: Simulate energy consumption over time
    console.log('\nTest 5: Energy Consumption Simulation');
    const initialEnergy = ship.currentEnergy;
    console.log('Starting energy:', initialEnergy);
    
    // Simulate 5 seconds of consumption (1000ms intervals)
    for (let i = 0; i < 5; i++) {
        ship.update(1000); // 1 second
        console.log(`After ${i + 1} second(s): ${ship.currentEnergy.toFixed(1)} energy`);
    }
    
    const energyConsumed = initialEnergy - ship.currentEnergy;
    const expectedConsumption = totalConsumption * 5; // 5 seconds
    console.log('Energy consumed:', energyConsumed.toFixed(1));
    console.log('Expected consumption:', expectedConsumption.toFixed(1));
    console.log('Consumption matches expected:', Math.abs(energyConsumed - expectedConsumption) < 1);
    
    // Test 6: Energy depletion and auto-deactivation
    console.log('\nTest 6: Energy Depletion and Auto-Deactivation');
    
    // Drain energy to near zero
    ship.currentEnergy = 50;
    console.log('Set energy to 50');
    console.log('Systems active before update:', shields.isActive, scanner.isActive);
    
    // Update with 1 second - should consume more energy than available
    ship.update(2000); // 2 seconds = 60 energy needed, but only 50 available
    
    console.log('Energy after update:', ship.currentEnergy.toFixed(1));
    console.log('Systems active after update:', shields.isActive, scanner.isActive);
    console.log('At least one system should have auto-deactivated due to insufficient energy');
    
    // Test 7: System status
    console.log('\nTest 7: System Status');
    const shieldStatus = shields.getStatus();
    const scannerStatus = scanner.getStatus();
    
    console.table({
        'Shields': {
            'Active': shieldStatus.isActive,
            'Energy Rate': shieldStatus.energyConsumption,
            'Health': shieldStatus.health.percentage.toFixed(1) + '%',
            'State': shieldStatus.state
        },
        'Scanner': {
            'Active': scannerStatus.isActive,
            'Energy Rate': scannerStatus.energyConsumption,
            'Health': scannerStatus.health.percentage.toFixed(1) + '%',
            'State': scannerStatus.state
        }
    });
    
    // Test 8: Manual deactivation
    console.log('\nTest 8: Manual Deactivation');
    if (shields.isActive) {
        shields.deactivate();
        console.log('Shields manually deactivated');
    }
    if (scanner.isActive) {
        scanner.deactivate();
        console.log('Scanner manually deactivated');
    }
    
    console.log('Total energy consumption after deactivation:', ship.getEnergyConsumptionRate());
    
    console.log('\n=== Simplified Energy System Test Complete ===');
    return true;
}

// Auto-run test if this file is loaded directly
if (typeof window !== 'undefined') {
    window.testSimplifiedEnergySystem = testSimplifiedEnergySystem;
    console.log('Simplified Energy Test loaded. Run window.testSimplifiedEnergySystem() to test.');
} 