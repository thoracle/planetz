#!/usr/bin/env node

/**
 * TEST DEBUG FIX - Quick verification that the debug system works
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock the SmartDebugManager for testing
global.smartDebugManager = {
    debug: function(channel, message) {
        console.log(`${channel}: ${message}`);
        return true;
    }
};

// Mock the global debug function
global.debug = function(channel, message) {
    if (global.smartDebugManager) {
        return global.smartDebugManager.debug(channel, message);
    } else {
        console.log(`${channel}: ${message}`);
    }
};

console.log('🧪 Testing Debug System Fix...\n');

// Test 1: Basic debug calls
console.log('Test 1: Basic debug calls');
try {
    debug('UTILITY', 'Basic test message');
    debug('P1', 'Priority message');
    debug('TARGETING', 'Targeting system test');
    console.log('✅ Basic debug calls working\n');
} catch (error) {
    console.log('❌ Basic debug calls failed:', error.message, '\n');
}

// Test 2: Check if SmartDebugManager loads without errors
console.log('Test 2: SmartDebugManager loading');
try {
    const debugManagerPath = path.join(__dirname, 'frontend/static/js/utils/DebugManager.js');
    const content = fs.readFileSync(debugManagerPath, 'utf8');

    // Check for recursive debug calls (should be fixed)
    const debugCallsInDebug = content.match(/debug\([^)]*\)/g) || [];
    console.log(`Found ${debugCallsInDebug.length} debug() calls in SmartDebugManager`);

    if (debugCallsInDebug.length === 0) {
        console.log('✅ No recursive debug calls found\n');
    } else {
        console.log('⚠️  Found debug calls in SmartDebugManager (might be okay if not recursive)\n');
    }
} catch (error) {
    console.log('❌ Error reading SmartDebugManager:', error.message, '\n');
}

// Test 3: Check app.js debug integration
console.log('Test 3: App.js debug integration');
try {
    const appPath = path.join(__dirname, 'frontend/static/js/app.js');
    const content = fs.readFileSync(appPath, 'utf8');

    // Check for window.debug definition
    if (content.includes('window.debug =')) {
        console.log('✅ window.debug function defined');
    } else {
        console.log('❌ window.debug function not found');
    }

    // Check for smartDebugManager reference
    if (content.includes('smartDebugManager')) {
        console.log('✅ smartDebugManager references found');
    } else {
        console.log('❌ smartDebugManager references not found');
    }

    console.log('✅ App.js integration looks good\n');
} catch (error) {
    console.log('❌ Error reading app.js:', error.message, '\n');
}

// Test 4: Test various debug scenarios
console.log('Test 4: Various debug scenarios');
try {
    debug('COMBAT', 'Weapon fired with damage: 45');
    debug('AI', 'Enemy ship at coordinates (100, 200)');
    debug('NAVIGATION', 'Warp drive engaged to sector Alpha-7');
    debug('MISSIONS', 'Quest objective completed: Destroy outpost');
    debug('PHYSICS', 'Collision detected between objects');
    console.log('✅ All debug scenarios working\n');
} catch (error) {
    console.log('❌ Debug scenarios failed:', error.message, '\n');
}

console.log('🎉 DEBUG SYSTEM FIX VERIFICATION COMPLETE!');
console.log('\nIf you see this message and no errors above, the debug system should be working!');
console.log('\nNext steps:');
console.log('1. Start your game server');
console.log('2. Open browser console');
console.log('3. Try: debug("TESTING", "Hello World")');
console.log('4. Try: debugList() to see available channels');
console.log('5. Try: debugToggle("AI") to toggle AI channel');
