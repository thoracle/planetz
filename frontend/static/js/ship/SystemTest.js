import System, { SYSTEM_STATES, DAMAGE_THRESHOLDS } from './System.js';

/**
 * Simple test for the System interface
 */
export function testSystemInterface() {
    console.log('=== Testing System Interface ===');
    
    // Create a test system
    const testSystem = new System('Test Engine', 1, {
        maxHealth: 100,
        powerCost: 50,
        slotCost: 2,
        systemType: 'engine'
    });
    
    console.log('Initial system status:', testSystem.getStatus());
    
    // Test damage application
    console.log('\n--- Testing Damage ---');
    testSystem.takeDamage(30); // Should move to damaged state
    console.log('After 30 damage:', testSystem.getStatus());
    
    testSystem.takeDamage(30); // Should move to critical state
    console.log('After 60 total damage:', testSystem.getStatus());
    
    testSystem.takeDamage(30); // Should move to disabled state
    console.log('After 90 total damage:', testSystem.getStatus());
    
    // Test repair
    console.log('\n--- Testing Repair ---');
    testSystem.repair(0.5); // Repair 50% of max health
    console.log('After 50% repair:', testSystem.getStatus());
    
    // Test upgrade
    console.log('\n--- Testing Upgrade ---');
    testSystem.upgrade();
    console.log('After upgrade to level 2:', testSystem.getStatus());
    
    // Test level requirements
    console.log('\n--- Testing Level Requirements ---');
    const requirements = testSystem.getLevelRequirements(3);
    console.log('Requirements for level 3:', requirements);
    
    console.log('=== System Interface Test Complete ===');
}

// Auto-run test if this file is loaded directly
if (typeof window !== 'undefined') {
    testSystemInterface();
} 