/**
 * Test file for Impulse Engines system
 * Demonstrates variable energy consumption based on impulse speed
 */

import Ship from './Ship.js';
import ImpulseEngines from './systems/ImpulseEngines.js';

export function testImpulseEngines() {
    console.log('=== Testing Impulse Engines System ===');
    
    // Test 1: Create ship and impulse engines
    console.log('\nTest 1: Creating Ship and Impulse Engines');
    const ship = new Ship('heavy_fighter');
    const engines = new ImpulseEngines(1); // Level 1 engines
    
    ship.addSystem('impulse_engines', engines);
    
    console.log('Ship energy:', ship.currentEnergy);
    console.log('Engines max speed:', engines.getMaxImpulseSpeed());
    console.log('Current impulse speed:', engines.getImpulseSpeed());
    
    // Test 2: Energy consumption at different impulse speeds
    console.log('\nTest 2: Energy Consumption by Impulse Speed');
    console.log('(Energy consumption when moving forward)');
    
    engines.setMovingForward(true); // Ship is moving forward
    
    const speedTests = [0, 1, 3, 5, 6, 7, 8, 9];
    console.table(
        speedTests.reduce((acc, speed) => {
            const maxSpeed = engines.getMaxImpulseSpeed();
            const actualSpeed = Math.min(speed, maxSpeed);
            engines.setImpulseSpeed(actualSpeed);
            
            const energyRate = engines.getEnergyConsumptionRate();
            const efficiency = engines.getEnergyEfficiency();
            
            acc[`Impulse ${speed}`] = {
                'Actual Speed': actualSpeed,
                'Available': speed <= maxSpeed ? 'Yes' : 'No',
                'Energy/sec': energyRate.toFixed(1),
                'Efficiency': efficiency > 0 ? efficiency.toFixed(2) : 'N/A'
            };
            return acc;
        }, {})
    );
    
    // Test 3: Rotation vs Forward Movement
    console.log('\nTest 3: Rotation vs Forward Movement Energy Consumption');
    engines.setImpulseSpeed(5); // Set to impulse 5
    
    engines.setMovingForward(false);
    engines.setRotating(true);
    console.log('Impulse 5, Rotating only:', engines.getEnergyConsumptionRate(), 'energy/sec');
    
    engines.setMovingForward(true);
    engines.setRotating(false);
    console.log('Impulse 5, Moving forward only:', engines.getEnergyConsumptionRate(), 'energy/sec');
    
    engines.setMovingForward(true);
    engines.setRotating(true);
    console.log('Impulse 5, Moving + Rotating:', engines.getEnergyConsumptionRate(), 'energy/sec');
    
    engines.setMovingForward(false);
    engines.setRotating(false);
    console.log('Impulse 5, Stopped:', engines.getEnergyConsumptionRate(), 'energy/sec');
    
    // Test 4: Travel calculations
    console.log('\nTest 4: Travel Time and Energy Cost Comparison');
    const distance = 100; // Arbitrary distance units
    
    const travelComparison = [1, 3, 5, 6].map(speed => {
        const travel = engines.calculateTravel(distance, speed);
        return {
            'Impulse Speed': speed,
            'Travel Time': travel.time.toFixed(1),
            'Energy Cost': travel.energyCost.toFixed(1),
            'Energy/sec': travel.energyPerSecond.toFixed(1),
            'Efficiency': travel.efficiency.toFixed(2)
        };
    });
    
    console.table(travelComparison);
    
    // Test 5: Real-time energy consumption simulation
    console.log('\nTest 5: Real-time Energy Consumption Simulation');
    console.log('Simulating 10 seconds of travel at different speeds...');
    
    ship.currentEnergy = ship.maxEnergy; // Reset energy
    engines.setImpulseSpeed(3);
    engines.setMovingForward(true);
    
    console.log('Starting energy:', ship.currentEnergy);
    console.log('Impulse speed: 3, Moving forward');
    
    for (let i = 0; i < 10; i++) {
        const energyBefore = ship.currentEnergy;
        ship.update(1000); // 1 second update
        const energyAfter = ship.currentEnergy;
        const consumed = energyBefore - energyAfter;
        
        console.log(`Second ${i + 1}: ${energyAfter.toFixed(1)} energy (consumed: ${consumed.toFixed(1)})`);
    }
    
    // Test 6: Speed change during travel
    console.log('\nTest 6: Speed Change During Travel');
    engines.setImpulseSpeed(6);
    console.log('Changed to impulse 6, energy consumption:', engines.getEnergyConsumptionRate(), '/sec');
    
    ship.update(2000); // 2 seconds at impulse 6
    console.log('After 2 seconds at impulse 6:', ship.currentEnergy.toFixed(1), 'energy');
    
    engines.setImpulseSpeed(2);
    console.log('Slowed to impulse 2, energy consumption:', engines.getEnergyConsumptionRate(), '/sec');
    
    ship.update(3000); // 3 seconds at impulse 2
    console.log('After 3 seconds at impulse 2:', ship.currentEnergy.toFixed(1), 'energy');
    
    // Test 7: Damage effects
    console.log('\nTest 7: Damage Effects on Impulse Engines');
    const initialMaxSpeed = engines.getMaxImpulseSpeed();
    console.log('Initial max speed:', initialMaxSpeed);
    
    // Apply damage to put engines in critical state
    engines.takeDamage(80); // 80 damage to 150 health = critical state
    
    console.log('After damage - Health:', engines.healthPercentage.toFixed(2));
    console.log('After damage - State:', engines.state);
    console.log('After damage - Current speed:', engines.getImpulseSpeed());
    console.log('After damage - Max speed:', engines.getMaxImpulseSpeed());
    console.log('After damage - Energy consumption:', engines.getEnergyConsumptionRate(), '/sec');
    
    // Test 8: System levels
    console.log('\nTest 8: System Level Comparison');
    const levels = [1, 2, 3, 4, 5];
    
    console.table(
        levels.reduce((acc, level) => {
            const testEngine = new ImpulseEngines(level);
            testEngine.setImpulseSpeed(5);
            testEngine.setMovingForward(true);
            
            acc[`Level ${level}`] = {
                'Max Speed': testEngine.getMaxImpulseSpeed(),
                'Base Energy/sec': testEngine.levelStats[level].energyConsumptionRate.toFixed(1),
                'Energy at Impulse 5': testEngine.getEnergyConsumptionRate().toFixed(1),
                'Effectiveness': testEngine.getEffectiveness().toFixed(2)
            };
            return acc;
        }, {})
    );
    
    console.log('\n=== Impulse Engines Test Complete ===');
    return true;
}

// Auto-run test if this file is loaded directly
if (typeof window !== 'undefined') {
    window.testImpulseEngines = testImpulseEngines;
    console.log('Impulse Engines Test loaded. Run window.testImpulseEngines() to test.');
} 