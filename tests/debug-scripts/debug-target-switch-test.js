#!/usr/bin/env node

/**
 * Debug Target Switch Test Script
 *
 * This script provides console commands to help debug the target switching issue
 * where Star Charts target selection doesn't properly clear subsystem icons and
 * faction coloring from previous targets.
 */

console.log('🔧 Debug Target Switch Test Script Loaded');
console.log('📋 Use these console commands to test the issue:');
console.log('');
console.log('1. Enable P1 debug channel for critical tracking:');
console.log('   debugEnable("P1")');
console.log('');
console.log('2. Enable TARGETING and STAR_CHARTS for detailed tracking:');
console.log('   debugEnable("TARGETING")');
console.log('   debugEnable("STAR_CHARTS")');
console.log('');
console.log('3. Enable INSPECTION for wireframe details:');
console.log('   debugEnable("INSPECTION")');
console.log('');
console.log('4. Test the reproduction steps:');
console.log('   a) Press Q to spawn target dummies');
console.log('   b) Press Tab to target a dummy (should see red enemy coloring)');
console.log('   c) Press C to open Star Charts');
console.log('   d) Click on a different target (planet, station, etc.)');
console.log('   e) Check console for 🔴 P1 debug messages tracking the process');
console.log('');
console.log('5. Key debug messages to look for:');
console.log('   🔴 CRITICAL: Star Charts selectObjectById called');
console.log('   🔴 CRITICAL: Calling setTargetById');
console.log('   🔴 CRITICAL: Clearing existing wireframe');
console.log('   🔴 CRITICAL: Target diplomacy determined');
console.log('   🔴 CRITICAL: Subsystem indicators');
console.log('   🔴 CRITICAL: Wireframe creation completed');
console.log('');
console.log('6. If issue persists, check for:');
console.log('   - Wireframe not being cleared properly');
console.log('   - Diplomacy determination failing');
console.log('   - Subsystem indicators not being cleared');
console.log('   - Target data not being updated correctly');
console.log('');
console.log('7. Quick status check commands:');
console.log('   debugStates()  // Check which channels are enabled');
console.log('   debugList()    // List all available channels');

// Make the script available globally for console testing
if (typeof window !== 'undefined') {
    window.debugTargetSwitchTest = {
        help: () => {
            console.log('🔧 Debug Target Switch Test Help:');
            console.log('Run these commands in the browser console:');
            console.log('1. debugEnable("P1")');
            console.log('2. debugEnable("TARGETING")');
            console.log('3. debugEnable("STAR_CHARTS")');
            console.log('4. debugEnable("INSPECTION")');
            console.log('5. Follow reproduction steps above');
        },

        testChannels: () => {
            console.log('📊 Debug Channel Status:');
            const states = window.debugStates ? window.debugStates() : 'debugStates not available';
            console.log(states);
        },

        enableAll: () => {
            if (window.debugEnable) {
                window.debugEnable('P1');
                window.debugEnable('TARGETING');
                window.debugEnable('STAR_CHARTS');
                window.debugEnable('INSPECTION');
                console.log('✅ All debug channels enabled for target switching test');
            } else {
                console.log('❌ debugEnable not available');
            }
        }
    };
}
