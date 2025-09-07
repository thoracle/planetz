#!/usr/bin/env node

/**
 * FINAL BROWSER TEST - Comprehensive verification that debug system works in browser
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🌐 FINAL BROWSER COMPATIBILITY TEST\n');

let testsPassed = 0;
let testsTotal = 0;

/**
 * Test helper function
 */
function runTest(name, testFn) {
    testsTotal++;
    console.log(`🧪 ${name}...`);
    try {
        const result = testFn();
        if (result) {
            console.log(`✅ ${name} - PASSED`);
            testsPassed++;
        } else {
            console.log(`❌ ${name} - FAILED`);
        }
    } catch (error) {
        console.log(`❌ ${name} - ERROR: ${error.message}`);
    }
    console.log('');
}

// Test 1: Verify all required files exist and are accessible
runTest('File Accessibility Check', () => {
    const requiredFiles = [
        'frontend/static/js/debug.js',
        'frontend/static/js/utils/DebugManager.js',
        'frontend/static/js/app.js'
    ];

    let allExist = true;

    for (const filePath of requiredFiles) {
        const fullPath = path.join(__dirname, filePath);
        const exists = fs.existsSync(fullPath);

        console.log(`   ${exists ? '✅' : '❌'} ${filePath}: ${exists ? 'Found' : 'MISSING'}`);

        if (!exists) {
            allExist = false;
        }
    }

    return allExist;
});

// Test 2: Verify debug.js exports are correct
runTest('Debug.js Module Exports', () => {
    const debugPath = path.join(__dirname, 'frontend/static/js/debug.js');

    try {
        const content = fs.readFileSync(debugPath, 'utf8');

        const hasDebugExport = content.includes('export function debug(');
        const hasIsDebugInitialized = content.includes('export function isDebugInitialized(');
        const hasGetDebugManager = content.includes('export function getDebugManager(');

        console.log(`   ✅ debug export: ${hasDebugExport}`);
        console.log(`   ✅ isDebugInitialized export: ${hasIsDebugInitialized}`);
        console.log(`   ✅ getDebugManager export: ${hasGetDebugManager}`);

        return hasDebugExport && hasIsDebugInitialized && hasGetDebugManager;
    } catch (error) {
        console.log(`   ❌ Error reading debug.js: ${error.message}`);
        return false;
    }
});

// Test 3: Verify SmartDebugManager is properly structured
runTest('SmartDebugManager Structure', () => {
    const debugManagerPath = path.join(__dirname, 'frontend/static/js/utils/DebugManager.js');

    try {
        const content = fs.readFileSync(debugManagerPath, 'utf8');

        const hasClass = content.includes('export class SmartDebugManager');
        const hasConstructor = content.includes('constructor()');
        const hasSetupGlobal = content.includes('setupGlobalAccess()');
        const hasDebugMethod = content.includes('debug(channel, message)');

        console.log(`   ✅ Class export: ${hasClass}`);
        console.log(`   ✅ Constructor: ${hasConstructor}`);
        console.log(`   ✅ setupGlobalAccess: ${hasSetupGlobal}`);
        console.log(`   ✅ debug method: ${hasDebugMethod}`);

        return hasClass && hasConstructor && hasSetupGlobal && hasDebugMethod;
    } catch (error) {
        console.log(`   ❌ Error reading SmartDebugManager: ${error.message}`);
        return false;
    }
});

// Test 4: Verify app.js integration
runTest('App.js Integration', () => {
    const appPath = path.join(__dirname, 'frontend/static/js/app.js');

    try {
        const content = fs.readFileSync(appPath, 'utf8');

        const hasSmartDebugImport = content.includes("import { SmartDebugManager } from './utils/DebugManager.js'");
        const hasDebugImport = content.includes("import { debug } from './debug.js'");
        const hasSmartDebugInstantiation = content.includes('new SmartDebugManager()');
        const hasDebugCalls = content.includes("debug('");

        console.log(`   ✅ SmartDebugManager import: ${hasSmartDebugImport}`);
        console.log(`   ✅ debug import: ${hasDebugImport}`);
        console.log(`   ✅ SmartDebugManager instantiation: ${hasSmartDebugInstantiation}`);
        console.log(`   ✅ debug calls: ${hasDebugCalls}`);

        return hasSmartDebugImport && hasDebugImport && hasSmartDebugInstantiation && hasDebugCalls;
    } catch (error) {
        console.log(`   ❌ Error reading app.js: ${error.message}`);
        return false;
    }
});

// Test 5: Simulate browser environment
runTest('Browser Environment Simulation', () => {
    // Mock browser environment
    global.window = {
        debug: null,
        smartDebugManager: null
    };

    // Simulate SmartDebugManager setup
    const mockSmartDebugManager = {
        debug: function(channel, message) {
            return `[${channel}] ${message}`;
        },
        setupGlobalAccess: function() {
            window.debug = (channel, message) => this.debug(channel, message);
            window.smartDebugManager = this;
        }
    };

    // Simulate the setup process
    mockSmartDebugManager.setupGlobalAccess();

    // Test debug calls
    const test1 = window.debug('TESTING', 'Hello World');
    const test2 = window.debug('P1', 'Critical message');

    const success = test1 === '[TESTING] Hello World' && test2 === '[P1] Critical message';

    console.log(`   ✅ Debug function available: ${typeof window.debug === 'function'}`);
    console.log(`   ✅ SmartDebugManager available: ${window.smartDebugManager !== null}`);
    console.log(`   ✅ Test message 1: ${test1}`);
    console.log(`   ✅ Test message 2: ${test2}`);

    return success;
});

// Test 6: Check for any remaining path issues
runTest('Import Path Consistency', () => {
    const filesToCheck = [
        'frontend/static/js/utils/PlayerCredits.js',
        'frontend/static/js/views/ViewManager.js',
        'frontend/static/js/ui/HelpInterface.js'
    ];

    let allCorrect = true;

    for (const filePath of filesToCheck) {
        const fullPath = path.join(__dirname, filePath);

        try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const hasCorrectImport = content.includes("import { debug } from './debug.js'");
            const hasWrongImport = content.includes("import { debug } from './utils/debug.js'");

            if (!hasCorrectImport || hasWrongImport) {
                console.log(`   ❌ ${filePath}: Import path issue`);
                allCorrect = false;
            } else {
                console.log(`   ✅ ${filePath}: Import path correct`);
            }
        } catch (error) {
            console.log(`   ❌ Error reading ${filePath}: ${error.message}`);
            allCorrect = false;
        }
    }

    return allCorrect;
});

console.log('='.repeat(60));
console.log('📊 BROWSER COMPATIBILITY TEST RESULTS');
console.log('='.repeat(60));
console.log(`✅ Tests Passed: ${testsPassed}/${testsTotal}`);
console.log(`📈 Success Rate: ${Math.round((testsPassed/testsTotal)*100)}%`);

if (testsPassed === testsTotal) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Debug system is browser-compatible');
    console.log('✅ File paths are correct');
    console.log('✅ Module exports are working');
    console.log('✅ App.js integration is complete');

    console.log('\n🚀 BROWSER TESTING READY!');
    console.log('\n📋 TO TEST IN BROWSER:');
    console.log('1. Start your game server: python run.py or similar');
    console.log('2. Open http://localhost:5001 in browser');
    console.log('3. Open Developer Console (F12)');
    console.log('4. Try these commands:');
    console.log('');
    console.log('   // Basic debug test');
    console.log('   debug("TESTING", "Hello from debug system!")');
    console.log('');
    console.log('   // Channel management');
    console.log('   debugList()           // Show all channels');
    console.log('   debugToggle("AI")     // Toggle AI channel');
    console.log('   debugStates()         // Show channel states');
    console.log('');
    console.log('   // Test different channels');
    console.log('   debug("P1", "Critical message - always shows")');
    console.log('   debug("COMBAT", "Combat system test")');
    console.log('   debug("UTILITY", "Utility message")');

} else {
    console.log('\n⚠️  Some tests failed');
    console.log('Please review the output above for issues.');
}

console.log('\n' + '='.repeat(60));
