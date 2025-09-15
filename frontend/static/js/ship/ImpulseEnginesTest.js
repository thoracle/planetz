import { debug } from '../debug.js';

/**
 * Test file for Impulse Engines system
 * Demonstrates variable energy consumption based on impulse speed
 */

import Ship from './Ship.js';
import ImpulseEngines from './systems/ImpulseEngines.js';

export function testImpulseEngines() {
debug('UTILITY', '=== Testing Impulse Engines System ===');
    
    // Test 1: Create ship and impulse engines
debug('UTILITY', '\nTest 1: Creating Ship and Impulse Engines');
    const ship = new Ship('heavy_fighter');
    const engines = new ImpulseEngines(1); // Level 1 engines
    
    ship.addSystem('impulse_engines', engines);
    
debug('UTILITY', 'Ship energy:', ship.currentEnergy);
debug('UTILITY', 'Engines max speed:', engines.getMaxImpulseSpeed());
debug('UTILITY', 'Current impulse speed:', engines.getImpulseSpeed());
    
    // Test 2: Energy consumption at different impulse speeds
debug('UTILITY', '\nTest 2: Energy Consumption by Impulse Speed');
debug('UTILITY', '(Energy consumption when moving forward)');
    
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
debug('UTILITY', '\nTest 3: Rotation vs Forward Movement Energy Consumption');
    engines.setImpulseSpeed(5); // Set to impulse 5
    
    engines.setMovingForward(false);
    engines.setRotating(true);
debug('UTILITY', 'Impulse 5, Rotating only:', engines.getEnergyConsumptionRate(), 'energy/sec');
    
    engines.setMovingForward(true);
    engines.setRotating(false);
debug('UTILITY', 'Impulse 5, Moving forward only:', engines.getEnergyConsumptionRate(), 'energy/sec');
    
    engines.setMovingForward(true);
    engines.setRotating(true);
debug('UTILITY', 'Impulse 5, Moving + Rotating:', engines.getEnergyConsumptionRate(), 'energy/sec');
    
    engines.setMovingForward(false);
    engines.setRotating(false);
debug('UTILITY', 'Impulse 5, Stopped:', engines.getEnergyConsumptionRate(), 'energy/sec');
    
    // Test 4: Travel calculations
debug('UTILITY', '\nTest 4: Travel Time and Energy Cost Comparison');
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
debug('UTILITY', '\nTest 5: Real-time Energy Consumption Simulation');
debug('UTILITY', 'Simulating 10 seconds of travel at different speeds...');
    
    ship.currentEnergy = ship.maxEnergy; // Reset energy
    engines.setImpulseSpeed(3);
    engines.setMovingForward(true);
    
debug('UTILITY', 'Starting energy:', ship.currentEnergy);
debug('UTILITY', 'Impulse speed: 3, Moving forward');
    
    for (let i = 0; i < 10; i++) {
        const energyBefore = ship.currentEnergy;
        ship.update(1000); // 1 second update
        const energyAfter = ship.currentEnergy;
        const consumed = energyBefore - energyAfter;
        
debug('UTILITY', `Second ${i + 1}: ${energyAfter.toFixed(1)} energy (consumed: ${consumed.toFixed(1)})`);
    }
    
    // Test 6: Speed change during travel
debug('UTILITY', '\nTest 6: Speed Change During Travel');
    engines.setImpulseSpeed(6);
debug('UTILITY', 'Changed to impulse 6, energy consumption:', engines.getEnergyConsumptionRate(), '/sec');
    
    ship.update(2000); // 2 seconds at impulse 6
debug('UTILITY', 'After 2 seconds at impulse 6:', ship.currentEnergy.toFixed(1), 'energy');
    
    engines.setImpulseSpeed(2);
debug('UTILITY', 'Slowed to impulse 2, energy consumption:', engines.getEnergyConsumptionRate(), '/sec');
    
    ship.update(3000); // 3 seconds at impulse 2
debug('UTILITY', 'After 3 seconds at impulse 2:', ship.currentEnergy.toFixed(1), 'energy');
    
    // Test 7: Damage effects
debug('COMBAT', '\nTest 7: Damage Effects on Impulse Engines');
    const initialMaxSpeed = engines.getMaxImpulseSpeed();
debug('UTILITY', 'Initial max speed:', initialMaxSpeed);
    
    // Apply damage to put engines in critical state
    engines.takeDamage(80); // 80 damage to 150 health = critical state
    
debug('COMBAT', 'After damage - Health:', engines.healthPercentage.toFixed(2));
debug('COMBAT', 'After damage - Current speed:', engines.getImpulseSpeed());
debug('COMBAT', 'After damage - Max speed:', engines.getMaxImpulseSpeed());
debug('COMBAT', 'After damage - Energy consumption:', engines.getEnergyConsumptionRate(), '/sec');
    
    // Test 8: System levels
debug('UTILITY', '\nTest 8: System Level Comparison');
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
    
debug('UTILITY', '\n=== Impulse Engines Test Complete ===');
    return true;
}

// Auto-run test if this file is loaded directly
if (typeof window !== 'undefined') {
    window.testImpulseEngines = testImpulseEngines;
debug('UTILITY', 'Impulse Engines Test loaded. Run window.testImpulseEngines() to test.');
} 