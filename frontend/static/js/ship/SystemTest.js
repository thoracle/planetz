import System, { SYSTEM_STATES, DAMAGE_THRESHOLDS } from './System.js';
import { debug } from '../debug.js';

/**
 * Simple test for the System interface
 */
export function testSystemInterface() {
debug('UI', '=== Testing System Interface ===');
    
    // Create a test system
    const testSystem = new System('Test Engine', 1, {
        maxHealth: 100,
        powerCost: 50,
        slotCost: 2,
        systemType: 'engine'
    });
    
debug('UTILITY', 'Initial system status:', testSystem.getStatus());
    
    // Test damage application
debug('COMBAT', '\n--- Testing Damage ---');
    testSystem.takeDamage(30); // Should move to damaged state
debug('COMBAT', 'After 30 damage:', testSystem.getStatus());
    
    testSystem.takeDamage(30); // Should move to critical state
debug('COMBAT', 'After 60 total damage:', testSystem.getStatus());
    
    testSystem.takeDamage(30); // Should move to disabled state
debug('COMBAT', 'After 90 total damage:', testSystem.getStatus());
    
    // Test repair
debug('AI', '\n--- Testing Repair ---');
    testSystem.repair(0.5); // Repair 50% of max health
debug('AI', 'After 50% repair:', testSystem.getStatus());
    
    // Test upgrade
debug('UTILITY', '\n--- Testing Upgrade ---');
    testSystem.upgrade();
debug('UTILITY', 'After upgrade to level 2:', testSystem.getStatus());
    
    // Test level requirements
debug('UI', '\n--- Testing Level Requirements ---');
    const requirements = testSystem.getLevelRequirements(3);
debug('UI', 'Requirements for level 3:', requirements);
    
debug('UI', '=== System Interface Test Complete ===');
}

// Auto-run test if this file is loaded directly
if (typeof window !== 'undefined') {
    testSystemInterface();
} 