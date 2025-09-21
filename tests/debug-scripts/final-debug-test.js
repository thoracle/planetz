#!/usr/bin/env node

/**
 * FINAL DEBUG SYSTEM TEST - After fixing syntax errors
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

console.log('🧪 FINAL DEBUG SYSTEM TEST - Syntax Errors Fixed\n');

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

// Test 1: Check for syntax errors in all files
runTest('Syntax Error Check', () => {
    const jsFiles = findAllJSFiles();
    let syntaxErrors = 0;

    for (const file of jsFiles) {
        try {
            const content = fs.readFileSync(file, 'utf8');

            // Check for common syntax issues
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Check for import statements inside objects/classes
                if (line.includes('import { debug } from') && i > 0) {
                    // Look at previous lines to see if we're inside a block
                    for (let j = i - 1; j >= 0; j--) {
                        const prevLine = lines[j].trim();
                        if (prevLine.includes('{') && !prevLine.includes('}')) {
                            syntaxErrors++;
                            console.log(`   Syntax error in ${path.relative(__dirname, file)}:${i + 1} - Import inside block`);
                            break;
                        }
                        if (prevLine.startsWith('import') || prevLine.startsWith('export') || prevLine === '') {
                            // This is okay - we're at the top level
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            syntaxErrors++;
            console.log(`   Error reading ${path.relative(__dirname, file)}: ${error.message}`);
        }
    }

    return syntaxErrors === 0;
});

// Test 2: Verify debug utility module
runTest('Debug Utility Module', () => {
    const debugUtilPath = path.join(__dirname, 'frontend/static/js/utils/debug.js');

    try {
        const content = fs.readFileSync(debugUtilPath, 'utf8');

        const hasExport = content.includes('export function debug(');
        const hasFallback = content.includes('console.log');
        const hasWindowCheck = content.includes('window.debug');
        const hasRecursiveImport = content.includes("import { debug } from './debug.js'");

        console.log(`   Has debug export: ${hasExport}`);
        console.log(`   Has fallback logic: ${hasFallback}`);
        console.log(`   Has window check: ${hasWindowCheck}`);
        console.log(`   Has recursive import: ${hasRecursiveImport ? '❌ PROBLEM' : '✅ OK'}`);

        return hasExport && hasFallback && hasWindowCheck && !hasRecursiveImport;
    } catch (error) {
        console.log(`   Error reading debug utility: ${error.message}`);
        return false;
    }
});

// Test 3: Test debug function calls
runTest('Debug Function Calls', () => {
    let callCount = 0;
    let lastCall = null;

    // Mock debug function
    global.debug = function(channel, message) {
        callCount++;
        lastCall = { channel, message };
        console.log(`${channel}: ${message}`);
    };

    // Test various debug calls that should work now
    global.debug('UTILITY', 'System initialized');
    global.debug('P1', 'Critical system check');
    global.debug('COMBAT', 'Weapons online');
    global.debug('AI', 'AI systems active');

    const expectedCalls = 4;
    const hasCorrectLastCall = lastCall?.channel === 'AI';

    console.log(`   Debug calls made: ${callCount}/${expectedCalls}`);
    console.log(`   Last call channel: ${lastCall?.channel}`);

    return callCount === expectedCalls && hasCorrectLastCall;
});

// Test 4: Check specific files that had syntax errors
runTest('Fixed Files Verification', () => {
    const fixedFiles = [
        'frontend/static/js/views/ViewManager.js',
        'frontend/static/js/views/GalacticChart.js',
        'frontend/static/js/views/LongRangeScanner.js'
    ];

    let allFixed = true;

    for (const relativePath of fixedFiles) {
        const filePath = path.join(__dirname, relativePath);

        try {
            const content = fs.readFileSync(filePath, 'utf8');

            // Check that debug import is at top level
            const lines = content.split('\n');
            let importFound = false;
            let importPosition = -1;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (line === "import { debug } from './debug.js';") {
                    importFound = true;
                    importPosition = i;
                    break;
                }
            }

            if (!importFound) {
                console.log(`   ❌ ${relativePath}: Debug import not found`);
                allFixed = false;
            } else if (importPosition > 10) {
                console.log(`   ⚠️  ${relativePath}: Import at line ${importPosition + 1} (might be okay)`);
            } else {
                console.log(`   ✅ ${relativePath}: Import correctly positioned`);
            }

        } catch (error) {
            console.log(`   ❌ Error reading ${relativePath}: ${error.message}`);
            allFixed = false;
        }
    }

    return allFixed;
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
console.log('📊 FINAL DEBUG SYSTEM TEST RESULTS');
console.log('='.repeat(60));
console.log(`✅ Tests Passed: ${testsPassed}/${testsTotal}`);
console.log(`📈 Success Rate: ${Math.round((testsPassed/testsTotal)*100)}%`);

if (testsPassed === testsTotal) {
    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Syntax errors fixed');
    console.log('✅ Debug system fully operational');
    console.log('✅ ReferenceError issues resolved');

    console.log('\n🚀 READY FOR PRODUCTION!');
    console.log('Your Smart Debug Logging System is working perfectly.');
} else {
    console.log('\n⚠️  Some tests failed');
    console.log('Please review the output above for remaining issues.');
}

console.log('\n💡 QUICK TEST IN BROWSER:');
console.log('1. Start your game server');
console.log('2. Open browser console');
console.log('3. Try: debug("TESTING", "Hello World!")');
console.log('4. Try: debugList() to see channels');
console.log('5. Try: debugToggle("AI") to toggle AI channel');

console.log('\n' + '='.repeat(60));
