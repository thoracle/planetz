/**
 * Test file for Shields system
 * Demonstrates energy consumption, damage absorption, recharge mechanics, and visual effects
 */

import Ship from './Ship.js';
import Shields from './systems/Shields.js';

export function testShields() {
    console.log('=== Testing Shields System ===');
    
    // Test 1: Create ship and shields
    console.log('\nTest 1: Creating Ship and Shields');
    const ship = new Ship('heavy_fighter');
    const shields = new Shields(1); // Level 1 shields
    
    ship.addSystem('shields', shields);
    
    console.log('Ship energy:', ship.currentEnergy);
    console.log('Shield strength:', shields.currentShieldStrength, '/', shields.maxShieldStrength);
    console.log('Shields up:', shields.isShieldsUp);
    console.log('Energy consumption (shields down):', shields.getEnergyConsumptionRate(), '/sec');
    
    // Test 2: Shield activation and energy consumption
    console.log('\nTest 2: Shield Activation and Energy Consumption');
    
    console.log('Activating shields...');
    shields.activateShields();
    
    console.log('Shields up:', shields.isShieldsUp);
    console.log('Energy consumption (shields up):', shields.getEnergyConsumptionRate(), '/sec');
    console.log('Visual effect applied:', shields.isScreenTinted);
    
    // Test 3: Energy consumption simulation
    console.log('\nTest 3: Energy Consumption Simulation');
    console.log('Running shields for 10 seconds...');
    
    const initialEnergy = ship.currentEnergy;
    console.log('Starting energy:', initialEnergy);
    
    for (let i = 0; i < 10; i++) {
        const energyBefore = ship.currentEnergy;
        ship.update(1000); // 1 second
        const energyAfter = ship.currentEnergy;
        const consumed = energyBefore - energyAfter;
        
        console.log(`Second ${i + 1}: ${energyAfter.toFixed(1)} energy (consumed: ${consumed.toFixed(1)})`);
    }
    
    const totalConsumed = initialEnergy - ship.currentEnergy;
    const expectedConsumption = shields.getEnergyConsumptionRate() * 10;
    console.log('Total consumed:', totalConsumed.toFixed(1));
    console.log('Expected consumption:', expectedConsumption.toFixed(1));
    
    // Test 4: Damage absorption
    console.log('\nTest 4: Damage Absorption');
    
    console.log('Shield strength before damage:', shields.currentShieldStrength.toFixed(1));
    console.log('Shield absorption rate:', (shields.damageAbsorption * 100).toFixed(1) + '%');
    
    const incomingDamage = 100;
    console.log('Incoming damage:', incomingDamage);
    
    const damageToHull = shields.absorbDamage(incomingDamage);
    console.log('Damage absorbed by shields:', (incomingDamage - damageToHull).toFixed(1));
    console.log('Damage to hull:', damageToHull.toFixed(1));
    console.log('Shield strength after damage:', shields.currentShieldStrength.toFixed(1));
    
    // Test 5: Shield recharge
    console.log('\nTest 5: Shield Recharge Mechanics');
    console.log('Waiting for shield recharge (3 second delay)...');
    
    // Simulate time passing for recharge delay
    for (let i = 0; i < 5; i++) {
        ship.update(1000); // 1 second
        console.log(`After ${i + 1} seconds: Shield strength ${shields.currentShieldStrength.toFixed(1)}, Recharging: ${shields.isRecharging}`);
    }
    
    // Test 6: Shield depletion and behavior
    console.log('\nTest 6: Shield Depletion');
    
    // Deal massive damage to deplete shields
    console.log('Dealing massive damage to deplete shields...');
    const massiveDamage = shields.currentShieldStrength + 100;
    const hullDamage = shields.absorbDamage(massiveDamage);
    
    console.log('Shield strength after massive damage:', shields.currentShieldStrength);
    console.log('Hull damage when shields depleted:', hullDamage.toFixed(1));
    
    // Test damage when shields are down
    const damageWhenDown = shields.absorbDamage(50);
    console.log('Damage absorption when shields depleted:', damageWhenDown, '(should be 50 - no absorption)');
    
    // Test 7: Shield toggle functionality
    console.log('\nTest 7: Shield Toggle (S key simulation)');
    
    // Restore some shield strength for testing
    shields.currentShieldStrength = shields.maxShieldStrength * 0.5;
    
    console.log('Current shield status:', shields.isShieldsUp);
    console.log('Toggling shields...');
    
    const newState1 = shields.toggleShields();
    console.log('After toggle 1 - Shields up:', newState1, 'Energy consumption:', shields.getEnergyConsumptionRate());
    
    const newState2 = shields.toggleShields();
    console.log('After toggle 2 - Shields up:', newState2, 'Energy consumption:', shields.getEnergyConsumptionRate());
    
    // Test 8: Level progression
    console.log('\nTest 8: Shield Level Progression');
    
    const levels = [1, 2, 3, 4, 5];
    console.table(
        levels.reduce((acc, level) => {
            const testShield = new Shields(level);
            testShield.activateShields();
            
            acc[`Level ${level}`] = {
                'Max Strength': testShield.maxShieldStrength,
                'Recharge Rate': testShield.shieldRechargeRate,
                'Energy/sec': testShield.getEnergyConsumptionRate().toFixed(1),
                'Absorption': (testShield.damageAbsorption * 100).toFixed(1) + '%',
                'Effectiveness': testShield.getEffectiveness().toFixed(2)
            };
            return acc;
        }, {})
    );
    
    // Test 9: Damage effects on system
    console.log('\nTest 9: System Damage Effects');
    
    // Reset shields for damage testing
    shields.activateShields();
    const initialShieldStrength = shields.currentShieldStrength;
    console.log('Initial shield system health:', shields.healthPercentage.toFixed(2));
    console.log('Initial max shield strength:', shields.maxShieldStrength);
    
    // Damage the shield system itself
    shields.takeDamage(60); // Damage to put in critical state
    
    console.log('After system damage:');
    console.log('- System health:', shields.healthPercentage.toFixed(2));
    console.log('- System state:', shields.state);
    console.log('- Energy consumption:', shields.getEnergyConsumptionRate().toFixed(1), '/sec');
    console.log('- Shield effectiveness:', shields.getEffectiveness().toFixed(2));
    
    // Test damage absorption with damaged system
    const testDamage = 100;
    const reducedAbsorption = shields.absorbDamage(testDamage);
    console.log('Damage absorption with damaged system:', (testDamage - reducedAbsorption).toFixed(1), 'absorbed');
    
    // Test 10: Complete system status
    console.log('\nTest 10: Complete Shield System Status');
    const status = shields.getStatus();
    
    console.table({
        'Status': {
            'System Health': status.health.percentage.toFixed(1) + '%',
            'System State': status.state,
            'Shields Up': status.isShieldsUp,
            'Shield Strength': `${status.currentShieldStrength.toFixed(1)}/${status.maxShieldStrength}`,
            'Shield %': (status.shieldPercentage * 100).toFixed(1) + '%',
            'Recharging': status.isRecharging,
            'Energy Rate': status.energyConsumption.toFixed(1) + '/sec',
            'Armor Bonus': (status.armorBonus * 100).toFixed(1) + '%'
        }
    });
    
    console.log('\n=== Shields Test Complete ===');
    console.log('Note: Visual effects (blue screen tint) should be visible when shields are up.');
    console.log('Try: shields.toggleShields() to see the visual effect toggle.');
    
    return true;
}

// Function to test shield visuals
export function testShieldVisuals() {
    console.log('=== Testing Shield Visual Effects ===');
    
    const ship = new Ship('heavy_fighter');
    const shields = new Shields(1);
    ship.addSystem('shields', shields);
    
    console.log('Shield visual test commands:');
    console.log('1. shields.activateShields() - Turn on blue tint');
    console.log('2. shields.deactivateShields() - Turn off blue tint');
    console.log('3. shields.flashShieldHit() - Flash red damage effect');
    console.log('4. shields.absorbDamage(100) - Damage with flash effect');
    
    // Make shields globally accessible for testing
    window.testShields = shields;
    
    return shields;
}

// Auto-run test if this file is loaded directly
if (typeof window !== 'undefined') {
    window.testShields = testShields;
    window.testShieldVisuals = testShieldVisuals;
    console.log('Shields Test loaded. Run window.testShields() to test.');
    console.log('Run window.testShieldVisuals() for visual effect testing.');
} 