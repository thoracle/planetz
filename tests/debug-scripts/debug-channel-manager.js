#!/usr/bin/env node

/**
 * Debug Channel Manager Helper
 *
 * Provides easy console commands for managing debug channels
 */

console.log('🔧 Debug Channel Manager Helper Loaded');
console.log('');
console.log('📋 Quick Commands for Browser Console:');
console.log('');
console.log('// 🎯 P1 is now disabled by default - enable specific debugging');
console.log('debugEnable("TARGETING")  // Target acquisition and management');
console.log('debugEnable("STAR_CHARTS") // Star Charts navigation and UI');
console.log('debugEnable("INSPECTION") // Detailed wireframe operations');
console.log('');
console.log('// 🎯 Enable specific debugging');
console.log('debugEnable("TARGETING")  // Target acquisition and management');
console.log('debugEnable("STAR_CHARTS") // Star Charts navigation and UI');
console.log('debugEnable("MISSIONS")   // Mission system operations');
console.log('debugEnable("MONEY")      // Credits and money transactions');
console.log('');
console.log('// 🔍 Check current status');
console.log('debugStates()             // Show all channel states');
console.log('debugList()               // List all channels with descriptions');
console.log('');
console.log('// 🔄 Reset to defaults');
console.log('debugReset()              // Reset all channels to default states');
console.log('');
console.log('// 🎯 Target Switching Bug Investigation');
console.log('debugEnable("TARGETING")  // Main channel for target switching');
console.log('debugEnable("INSPECTION") // Detailed wireframe operations');
console.log('debugDisable("P1")        // Reduce noise from other systems');
console.log('');
console.log('💡 Tip: Channel states are saved in localStorage and persist between sessions');

// Make helper functions available globally if in browser
if (typeof window !== 'undefined') {
    window.disableNoisyChannels = () => {
        if (window.debugDisable) {
            window.debugDisable('P1');
            window.debugDisable('AI');
            window.debugDisable('UTILITY');
            console.log('✅ Disabled noisy channels: P1, AI, UTILITY');
            console.log('💡 Run debugStates() to verify');
        } else {
            console.log('❌ Debug system not available');
        }
    };

    window.enableTargetDebug = () => {
        if (window.debugEnable && window.debugDisable) {
            window.debugEnable('TARGETING');
            window.debugEnable('STAR_CHARTS');
            window.debugEnable('INSPECTION');
            window.debugDisable('P1');
            console.log('✅ Enabled: TARGETING, STAR_CHARTS, INSPECTION');
            console.log('❌ Disabled: P1');
            console.log('🎯 Ready for target switching bug investigation');
        } else {
            console.log('❌ Debug system not available');
        }
    };

    console.log('');
    console.log('🎯 Quick Helper Functions Available:');
    console.log('  disableNoisyChannels()  // Disable P1, AI, UTILITY');
    console.log('  enableTargetDebug()     // Enable target switching debugging');
}
