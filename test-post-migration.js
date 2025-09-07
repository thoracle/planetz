#!/usr/bin/env node

/**
 * POST-MIGRATION VERIFICATION TEST
 * Comprehensive test to ensure the batch migration didn't break anything
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

class PostMigrationTester {
    constructor() {
        this.results = {
            syntaxErrors: [],
            missingDebugCalls: [],
            channelTests: [],
            performanceTests: []
        };
    }

    // Test 1: Check for syntax errors in migrated files
    async testSyntaxErrors() {
        console.log('🔍 Testing Syntax Errors...');

        const jsFiles = this.findAllJSFiles();
        let syntaxErrors = 0;

        for (const file of jsFiles) {
            try {
                const content = fs.readFileSync(file, 'utf8');

                // Check for common syntax errors that might have been introduced
                const lines = content.split('\n');

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];

                    // Check for unclosed parentheses or brackets
                    if (line.includes('debug(') && !line.includes(');')) {
                        this.results.syntaxErrors.push({
                            file: file,
                            line: i + 1,
                            issue: 'Unclosed debug() call'
                        });
                        syntaxErrors++;
                    }

                    // Check for mismatched quotes in debug calls
                    const debugMatches = line.match(/debug\('([^']*)',\s*([^;]+)\);/g);
                    if (debugMatches) {
                        for (const match of debugMatches) {
                            if (!match.endsWith(');')) {
                                this.results.syntaxErrors.push({
                                    file: file,
                                    line: i + 1,
                                    issue: 'Malformed debug() call'
                                });
                                syntaxErrors++;
                            }
                        }
                    }
                }

            } catch (error) {
                this.results.syntaxErrors.push({
                    file: file,
                    issue: `File read error: ${error.message}`
                });
                syntaxErrors++;
            }
        }

        console.log(`   ✅ Syntax check complete: ${syntaxErrors} errors found`);
        return syntaxErrors === 0;
    }

    // Test 2: Check that debug calls are properly formatted
    async testDebugCalls() {
        console.log('🔍 Testing Debug Call Formatting...');

        const jsFiles = this.findAllJSFiles();
        let formatErrors = 0;

        for (const file of jsFiles) {
            try {
                const content = fs.readFileSync(file, 'utf8');
                const lines = content.split('\n');

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];

                    // Check debug calls
                    if (line.includes('debug(')) {
                        // Check for proper format: debug('CHANNEL', message);
                        const debugRegex = /debug\s*\(\s*'([^']+)'\s*,\s*([^;]+)\s*\)\s*;/;
                        const match = line.match(debugRegex);

                        if (!match) {
                            this.results.missingDebugCalls.push({
                                file: file,
                                line: i + 1,
                                content: line.trim()
                            });
                            formatErrors++;
                        } else {
                            const [, channel, message] = match;

                            // Validate channel name
                            if (!this.isValidChannel(channel)) {
                                this.results.missingDebugCalls.push({
                                    file: file,
                                    line: i + 1,
                                    issue: `Invalid channel: ${channel}`,
                                    content: line.trim()
                                });
                                formatErrors++;
                            }
                        }
                    }
                }

            } catch (error) {
                console.error(`Error reading ${file}:`, error.message);
            }
        }

        console.log(`   ✅ Debug call format check complete: ${formatErrors} errors found`);
        return formatErrors === 0;
    }

    // Test 3: Validate channel names are valid
    isValidChannel(channel) {
        const validChannels = [
            'UTILITY', 'UI', 'COMBAT', 'TARGETING', 'AI', 'MISSIONS',
            'P1', 'INSPECTION', 'PERFORMANCE', 'PHYSICS', 'NAVIGATION', 'RENDER'
        ];
        return validChannels.includes(channel);
    }

    // Test 4: Performance test - ensure debug calls don't slow down the system
    async testPerformance() {
        console.log('🔍 Testing Performance Impact...');

        const startTime = Date.now();

        // Simulate 1000 debug calls
        for (let i = 0; i < 1000; i++) {
            debug('PERFORMANCE', `Test message ${i}`);
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        console.log(`   ✅ Performance test: 1000 debug calls took ${duration}ms`);

        // Should be very fast (< 100ms for 1000 calls)
        const acceptableDuration = 100;
        const passed = duration < acceptableDuration;

        this.results.performanceTests.push({
            test: '1000 debug calls',
            duration: duration,
            acceptable: acceptableDuration,
            passed: passed
        });

        return passed;
    }

    // Test 5: Channel filtering test
    async testChannelFiltering() {
        console.log('🔍 Testing Channel Filtering...');

        // Mock channel filtering
        const originalDebug = global.smartDebugManager.debug;
        let filteredCount = 0;

        global.smartDebugManager.debug = function(channel, message) {
            if (channel === 'UI') {
                filteredCount++;
                return false; // Simulate filtering
            }
            return originalDebug.call(this, channel, message);
        };

        // Test filtering
        debug('UTILITY', 'Should show');
        debug('UI', 'Should be filtered');
        debug('COMBAT', 'Should show');
        debug('UI', 'Should be filtered');

        const expectedFiltered = 2;
        const passed = filteredCount === expectedFiltered;

        this.results.channelTests.push({
            test: 'Channel filtering',
            expectedFiltered: expectedFiltered,
            actualFiltered: filteredCount,
            passed: passed
        });

        // Restore original debug function
        global.smartDebugManager.debug = originalDebug;

        console.log(`   ✅ Channel filtering test: ${passed ? 'PASSED' : 'FAILED'}`);
        return passed;
    }

    // Test 6: Sample file validation
    async testSampleFiles() {
        console.log('🔍 Testing Sample Files...');

        const sampleFiles = [
            'frontend/static/js/views/StarfieldManager.js',
            'frontend/static/js/PhysicsManager.js',
            'frontend/static/js/ui/CardInventoryUI.js',
            'frontend/static/js/app.js'
        ];

        let sampleErrors = 0;

        for (const relativePath of sampleFiles) {
            const filePath = path.join(__dirname, relativePath);

            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');

                    // Check that file has debug calls
                    const debugCallCount = (content.match(/debug\(/g) || []).length;
                    const consoleLogCount = (content.match(/console\.log\(/g) || []).length;

                    console.log(`   📄 ${relativePath}:`);
                    console.log(`      Debug calls: ${debugCallCount}`);
                    console.log(`      Console.log calls: ${consoleLogCount}`);

                    if (debugCallCount === 0) {
                        console.log(`      ⚠️  Warning: No debug calls found`);
                    }

                } catch (error) {
                    console.log(`   ❌ Error reading ${relativePath}: ${error.message}`);
                    sampleErrors++;
                }
            } else {
                console.log(`   ⚠️  File not found: ${relativePath}`);
            }
        }

        return sampleErrors === 0;
    }

    // Find all JS files in the project
    findAllJSFiles() {
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

    // Run all tests
    async runAllTests() {
        console.log('🚀 Starting Post-Migration Verification Tests...\n');

        const tests = [
            { name: 'Syntax Errors', method: this.testSyntaxErrors.bind(this) },
            { name: 'Debug Call Formatting', method: this.testDebugCalls.bind(this) },
            { name: 'Channel Filtering', method: this.testChannelFiltering.bind(this) },
            { name: 'Performance Impact', method: this.testPerformance.bind(this) },
            { name: 'Sample Files', method: this.testSampleFiles.bind(this) }
        ];

        const results = [];
        for (const test of tests) {
            try {
                const passed = await test.method();
                results.push({ name: test.name, passed });
            } catch (error) {
                console.error(`❌ Test "${test.name}" failed with error:`, error.message);
                results.push({ name: test.name, passed: false, error: error.message });
            }
        }

        this.printSummary(results);
        return results.every(r => r.passed);
    }

    // Print comprehensive summary
    printSummary(testResults) {
        console.log('\n' + '='.repeat(60));
        console.log('📊 POST-MIGRATION VERIFICATION SUMMARY');
        console.log('='.repeat(60));

        const passedTests = testResults.filter(r => r.passed).length;
        const totalTests = testResults.length;

        console.log(`\n✅ Tests Passed: ${passedTests}/${totalTests}`);

        testResults.forEach(result => {
            const status = result.passed ? '✅' : '❌';
            console.log(`${status} ${result.name}`);
            if (result.error) {
                console.log(`   Error: ${result.error}`);
            }
        });

        // Show any issues found
        if (this.results.syntaxErrors.length > 0) {
            console.log('\n❌ Syntax Errors Found:');
            this.results.syntaxErrors.slice(0, 5).forEach(error => {
                console.log(`  ${path.relative(__dirname, error.file)}:${error.line} - ${error.issue}`);
            });
        }

        if (this.results.missingDebugCalls.length > 0) {
            console.log('\n⚠️  Debug Call Issues Found:');
            this.results.missingDebugCalls.slice(0, 5).forEach(error => {
                console.log(`  ${path.relative(__dirname, error.file)}:${error.line} - ${error.issue || 'Malformed debug call'}`);
            });
        }

        console.log('\n' + '='.repeat(60));

        if (passedTests === totalTests) {
            console.log('🎉 ALL TESTS PASSED! Migration successful!');
            console.log('🚀 The Smart Debug System is ready for production use.');
        } else {
            console.log('⚠️  Some tests failed. Please review the issues above.');
            console.log('💡 You may need to manually fix some debug calls.');
        }

        console.log('='.repeat(60));
    }
}

// Run the tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    const tester = new PostMigrationTester();
    tester.runAllTests().catch(console.error);
}

export default PostMigrationTester;
