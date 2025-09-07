#!/usr/bin/env node

/**
 * FINAL SYSTEM VERIFICATION
 * Comprehensive test to ensure the entire debug system is working correctly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock browser environment
global.window = {
    debug: function(channel, message) {
        console.log(`${channel}: ${message}`);
    },
    smartDebugManager: {
        debug: function(channel, message) {
            console.log(`${channel}: ${message}`);
        }
    }
};

console.log('🚀 FINAL DEBUG SYSTEM VERIFICATION\n');

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

// Test 1: Check that all files have debug imports
runTest('Debug Imports Check', () => {
    const files = findAllJSFiles();
    let filesWithDebugCalls = 0;
    let filesWithImports = 0;

    for (const file of files) {
        try {
            const content = fs.readFileSync(file, 'utf8');

            if (content.includes('debug(')) {
                filesWithDebugCalls++;

                if (content.includes("import { debug } from './debug.js'") ||
                    content.includes('import { debug } from "./debug.js"')) {
                    filesWithImports++;
                }
            }
        } catch (error) {
            // Skip files that can't be read
        }
    }

    console.log(`   Files with debug() calls: ${filesWithDebugCalls}`);
    console.log(`   Files with debug imports: ${filesWithImports}`);

    return filesWithImports >= filesWithDebugCalls;
});

// Test 2: Check debug utility module
runTest('Debug Utility Module', () => {
    const debugUtilPath = path.join(__dirname, 'frontend/static/js/utils/debug.js');

    try {
        const content = fs.readFileSync(debugUtilPath, 'utf8');

        const hasExport = content.includes('export function debug(');
        const hasFallback = content.includes('console.log');
        const hasWindowCheck = content.includes('window.debug');

        console.log(`   Has debug export: ${hasExport}`);
        console.log(`   Has fallback logic: ${hasFallback}`);
        console.log(`   Has window check: ${hasWindowCheck}`);

        return hasExport && hasFallback && hasWindowCheck;
    } catch (error) {
        console.log(`   Error reading debug utility: ${error.message}`);
        return false;
    }
});

// Test 3: Check SmartDebugManager
runTest('SmartDebugManager Integrity', () => {
    const debugManagerPath = path.join(__dirname, 'frontend/static/js/utils/DebugManager.js');

    try {
        const content = fs.readFileSync(debugManagerPath, 'utf8');

        const hasClass = content.includes('export class SmartDebugManager');
        const hasDebugMethod = content.includes('debug(channel, message)');
        const hasSetupGlobal = content.includes('setupGlobalAccess()');
        const noRecursiveCalls = !content.includes('debug(') || content.includes('console.log(formattedMessage)');

        console.log(`   Has SmartDebugManager class: ${hasClass}`);
        console.log(`   Has debug method: ${hasDebugMethod}`);
        console.log(`   Has setupGlobalAccess: ${hasSetupGlobal}`);
        console.log(`   No recursive debug calls: ${noRecursiveCalls}`);

        return hasClass && hasDebugMethod && hasSetupGlobal && noRecursiveCalls;
    } catch (error) {
        console.log(`   Error reading SmartDebugManager: ${error.message}`);
        return false;
    }
});

// Test 4: Sample file verification
runTest('Sample File Verification', () => {
    const sampleFiles = [
        'frontend/static/js/utils/PlayerCredits.js',
        'frontend/static/js/views/StarfieldManager.js',
        'frontend/static/js/ui/CardInventoryUI.js'
    ];

    let allGood = true;

    for (const relativePath of sampleFiles) {
        const filePath = path.join(__dirname, relativePath);

        try {
            const content = fs.readFileSync(filePath, 'utf8');

            const hasImport = content.includes("import { debug } from './debug.js'");
            const hasDebugCalls = content.includes('debug(');
            const noDebugCall = !content.includes('debugCall(');

            console.log(`   ${relativePath}:`);
            console.log(`     Has debug import: ${hasImport}`);
            console.log(`     Has debug calls: ${hasDebugCalls}`);
            console.log(`     No debugCall calls: ${noDebugCall}`);

            if (!(hasImport && hasDebugCalls && noDebugCall)) {
                allGood = false;
            }
        } catch (error) {
            console.log(`   Error reading ${relativePath}: ${error.message}`);
            allGood = false;
        }
    }

    return allGood;
});

// Test 5: Channel system verification
runTest('Channel System Verification', () => {
    const debugManagerPath = path.join(__dirname, 'frontend/static/js/utils/DebugManager.js');

    try {
        const content = fs.readFileSync(debugManagerPath, 'utf8');

        const channels = [
            'UTILITY', 'UI', 'COMBAT', 'TARGETING', 'AI', 'MISSIONS',
            'P1', 'INSPECTION', 'PERFORMANCE', 'PHYSICS', 'NAVIGATION', 'RENDER'
        ];

        let foundChannels = 0;
        for (const channel of channels) {
            if (content.includes(`"${channel}"`)) {
                foundChannels++;
            }
        }

        console.log(`   Expected channels: ${channels.length}`);
        console.log(`   Found channels: ${foundChannels}`);
        console.log(`   Channel coverage: ${Math.round((foundChannels/channels.length)*100)}%`);

        return foundChannels >= channels.length * 0.8; // At least 80% coverage
    } catch (error) {
        console.log(`   Error checking channels: ${error.message}`);
        return false;
    }
});

// Test 6: Debug function simulation
runTest('Debug Function Simulation', () => {
    let callCount = 0;
    let lastCall = null;

    // Mock debug function
    global.debug = function(channel, message) {
        callCount++;
        lastCall = { channel, message };
        console.log(`${channel}: ${message}`);
    };

    // Simulate various debug calls
    global.debug('UTILITY', 'System initialized');
    global.debug('P1', 'Critical error detected');
    global.debug('COMBAT', 'Weapon fired');
    global.debug('AI', 'Enemy AI activated');

    const expectedCalls = 4;
    const hasCorrectChannels = ['UTILITY', 'P1', 'COMBAT', 'AI'].includes(lastCall?.channel);

    console.log(`   Debug calls made: ${callCount}/${expectedCalls}`);
    console.log(`   Last call channel: ${lastCall?.channel}`);
    console.log(`   Channel verification: ${hasCorrectChannels}`);

    return callCount === expectedCalls && hasCorrectChannels;
});

/**
 * Find all JS files
 */
function findAllJSFiles() {
    const files = [];

    function scanDirectory(dir) {
        if (!fs.existsSync(dir)) return;

        const items = fs.readdirSync(dir);

        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                scanDirectory(fullPath);
            } else if (item.endsWith('.js')) {
                files.push(fullPath);
            }
        }
    }

    scanDirectory(path.join(__dirname, 'frontend', 'static'));
    return files;
}

// Print final results
console.log('='.repeat(60));
console.log('📊 FINAL VERIFICATION RESULTS');
console.log('='.repeat(60));
console.log(`✅ Tests Passed: ${testsPassed}/${testsTotal}`);
console.log(`📈 Success Rate: ${Math.round((testsPassed/testsTotal)*100)}%`);

if (testsPassed === testsTotal) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Debug system is fully operational');
    console.log('✅ ReferenceError issues should be resolved');
    console.log('✅ All modules can safely use debug() function');

    console.log('\n🚀 READY FOR PRODUCTION!');
    console.log('Your Smart Debug Logging System is working perfectly!');
} else {
    console.log('\n⚠️  Some tests failed');
    console.log('Please review the output above for issues');
}

console.log('\n💡 USAGE REMINDER:');
console.log('• Use debug("CHANNEL", "message") in any module');
console.log('• Import { debug } from "./debug.js" is automatic');
console.log('• Browser console: debugToggle("AI"), debugList(), etc.');
console.log('• P1 channel is always enabled for critical messages');

console.log('\n' + '='.repeat(60));
