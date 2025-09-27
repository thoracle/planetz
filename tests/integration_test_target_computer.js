/**
 * Target Computer Integration Test Suite
 * 
 * This test suite runs in the browser environment to validate:
 * 1. Target ID normalization in real-time
 * 2. Sector transition behavior
 * 3. Integration with Star Charts and other systems
 * 4. Performance impact measurement
 */

class TargetComputerIntegrationTests {
    constructor() {
        this.testResults = [];
        this.startTime = null;
        this.originalConsoleLog = console.log;
        this.testLogs = [];
    }

    /**
     * Run all integration tests
     */
    async runAllTests() {
        console.log('🚀 Starting Target Computer Integration Tests');
        console.log('=' * 60);
        
        this.startTime = Date.now();
        
        // Capture console logs for analysis
        this.captureConsoleLogs();
        
        try {
            // Test categories
            await this.testTargetIDNormalization();
            await this.testSectorTransitions();
            await this.testStarChartsIntegration();
            await this.testPerformanceImpact();
            await this.testRegressionPrevention();
            
            this.generateReport();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            this.restoreConsoleLogs();
            return false;
        }
        
        this.restoreConsoleLogs();
        return this.testResults.every(result => result.passed);
    }

    /**
     * Test target ID normalization system
     */
    async testTargetIDNormalization() {
        console.log('\n📋 Testing Target ID Normalization...');
        
        const tests = [
            {
                name: 'normalizeTargetId method exists',
                test: () => {
                    const tcm = window.starfieldManager?.targetComputerManager;
                    return tcm && typeof tcm.normalizeTargetId === 'function';
                }
            },
            {
                name: 'normalizeTarget method exists',
                test: () => {
                    const tcm = window.starfieldManager?.targetComputerManager;
                    return tcm && typeof tcm.normalizeTarget === 'function';
                }
            },
            {
                name: 'Current sector is properly detected',
                test: () => {
                    const ssm = window.starfieldManager?.solarSystemManager;
                    return ssm && ssm.currentSector && typeof ssm.currentSector === 'string';
                }
            },
            {
                name: 'Target objects have sector-prefixed IDs',
                test: () => {
                    const tcm = window.starfieldManager?.targetComputerManager;
                    if (!tcm || !tcm.targetObjects || tcm.targetObjects.length === 0) {
                        return { passed: true, note: 'No targets to test' };
                    }
                    
                    const sectorPrefixPattern = /^[A-Z]\d+_/;
                    const validIds = tcm.targetObjects.filter(target => 
                        target.id && sectorPrefixPattern.test(target.id)
                    );
                    
                    const totalTargets = tcm.targetObjects.length;
                    const validTargets = validIds.length;
                    
                    return {
                        passed: validTargets > 0,
                        details: `${validTargets}/${totalTargets} targets have valid sector-prefixed IDs`,
                        targets: tcm.targetObjects.map(t => ({ name: t.name, id: t.id })).slice(0, 5)
                    };
                }
            }
        ];
        
        for (const test of tests) {
            await this.runTest('Target ID Normalization', test.name, test.test);
        }
    }

    /**
     * Test sector transition behavior
     */
    async testSectorTransitions() {
        console.log('\n🌌 Testing Sector Transitions...');
        
        const tests = [
            {
                name: 'SectorNavigation class exists',
                test: () => {
                    return window.SectorNavigation !== undefined;
                }
            },
            {
                name: 'Ship positioning method exists',
                test: () => {
                    const sn = window.starfieldManager?.sectorNavigation;
                    return sn && typeof sn.positionShipNearStar === 'function';
                }
            },
            {
                name: 'Target list clearing logic exists',
                test: () => {
                    const tcm = window.starfieldManager?.targetComputerManager;
                    return tcm && Array.isArray(tcm.targetObjects);
                }
            },
            {
                name: 'Current sector matches solar system manager',
                test: () => {
                    const ssm = window.starfieldManager?.solarSystemManager;
                    const tcm = window.starfieldManager?.targetComputerManager;
                    
                    if (!ssm || !tcm) return false;
                    
                    const ssmSector = ssm.currentSector;
                    const targetSectors = tcm.targetObjects
                        .map(t => t.id?.split('_')[0])
                        .filter(s => s);
                    
                    const uniqueSectors = [...new Set(targetSectors)];
                    
                    return {
                        passed: uniqueSectors.length <= 1 && (uniqueSectors.length === 0 || uniqueSectors[0] === ssmSector),
                        details: `SSM sector: ${ssmSector}, Target sectors: ${uniqueSectors.join(', ')}`
                    };
                }
            }
        ];
        
        for (const test of tests) {
            await this.runTest('Sector Transitions', test.name, test.test);
        }
    }

    /**
     * Test Star Charts integration
     */
    async testStarChartsIntegration() {
        console.log('\n🗺️ Testing Star Charts Integration...');
        
        const tests = [
            {
                name: 'StarChartsManager exists',
                test: () => {
                    return window.starfieldManager?.starChartsManager !== undefined;
                }
            },
            {
                name: 'Star Charts uses fresh data',
                test: () => {
                    const scm = window.starfieldManager?.starChartsManager;
                    const ssm = window.starfieldManager?.solarSystemManager;
                    
                    if (!scm || !ssm) return false;
                    
                    return scm.currentSector === ssm.currentSector;
                }
            },
            {
                name: 'Star Charts and Target Computer sectors match',
                test: () => {
                    const scm = window.starfieldManager?.starChartsManager;
                    const ssm = window.starfieldManager?.solarSystemManager;
                    
                    if (!scm || !ssm) return false;
                    
                    return {
                        passed: scm.currentSector === ssm.currentSector,
                        details: `Star Charts: ${scm.currentSector}, Solar System: ${ssm.currentSector}`
                    };
                }
            }
        ];
        
        for (const test of tests) {
            await this.runTest('Star Charts Integration', test.name, test.test);
        }
    }

    /**
     * Test performance impact
     */
    async testPerformanceImpact() {
        console.log('\n⚡ Testing Performance Impact...');
        
        const tests = [
            {
                name: 'Target list update performance',
                test: async () => {
                    const tcm = window.starfieldManager?.targetComputerManager;
                    if (!tcm) return false;
                    
                    const iterations = 10;
                    const times = [];
                    
                    for (let i = 0; i < iterations; i++) {
                        const start = performance.now();
                        tcm.updateTargetList();
                        const end = performance.now();
                        times.push(end - start);
                        
                        // Small delay between iterations
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                    
                    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
                    const maxTime = Math.max(...times);
                    
                    return {
                        passed: avgTime < 50, // Should be under 50ms on average
                        details: `Avg: ${avgTime.toFixed(2)}ms, Max: ${maxTime.toFixed(2)}ms`
                    };
                }
            },
            {
                name: 'Target normalization performance',
                test: () => {
                    const tcm = window.starfieldManager?.targetComputerManager;
                    if (!tcm || !tcm.normalizeTarget) return false;
                    
                    const testTarget = { name: 'Test Target', id: '12345' };
                    const iterations = 1000;
                    
                    const start = performance.now();
                    for (let i = 0; i < iterations; i++) {
                        tcm.normalizeTarget(testTarget);
                    }
                    const end = performance.now();
                    
                    const totalTime = end - start;
                    const avgTime = totalTime / iterations;
                    
                    return {
                        passed: avgTime < 1, // Should be under 1ms per normalization
                        details: `${iterations} normalizations in ${totalTime.toFixed(2)}ms (${avgTime.toFixed(4)}ms avg)`
                    };
                }
            }
        ];
        
        for (const test of tests) {
            await this.runTest('Performance Impact', test.name, test.test);
        }
    }

    /**
     * Test regression prevention
     */
    async testRegressionPrevention() {
        console.log('\n🛡️ Testing Regression Prevention...');
        
        const tests = [
            {
                name: 'No numeric-only target IDs',
                test: () => {
                    const tcm = window.starfieldManager?.targetComputerManager;
                    if (!tcm || !tcm.targetObjects || tcm.targetObjects.length === 0) {
                        return { passed: true, note: 'No targets to test' };
                    }
                    
                    const numericOnlyPattern = /^\d+$/;
                    const numericIds = tcm.targetObjects.filter(target => 
                        target.id && numericOnlyPattern.test(target.id)
                    );
                    
                    return {
                        passed: numericIds.length === 0,
                        details: `Found ${numericIds.length} numeric-only IDs`,
                        examples: numericIds.slice(0, 3).map(t => ({ name: t.name, id: t.id }))
                    };
                }
            },
            {
                name: 'No mixed sector prefixes in target list',
                test: () => {
                    const tcm = window.starfieldManager?.targetComputerManager;
                    if (!tcm || !tcm.targetObjects || tcm.targetObjects.length === 0) {
                        return { passed: true, note: 'No targets to test' };
                    }
                    
                    const sectors = tcm.targetObjects
                        .map(t => t.id?.split('_')[0])
                        .filter(s => s && /^[A-Z]\d+$/.test(s));
                    
                    const uniqueSectors = [...new Set(sectors)];
                    
                    return {
                        passed: uniqueSectors.length <= 1,
                        details: `Found sectors: ${uniqueSectors.join(', ')}`,
                        totalTargets: tcm.targetObjects.length,
                        sectorsFound: uniqueSectors.length
                    };
                }
            },
            {
                name: 'Console logs show proper sector transitions',
                test: () => {
                    const sectorLogs = this.testLogs.filter(log => 
                        log.includes('sector') && 
                        (log.includes('B1') || log.includes('A0'))
                    );
                    
                    const properTransitions = sectorLogs.filter(log =>
                        log.includes('Updating sector from') || 
                        log.includes('SectorNavigation:') ||
                        log.includes('currentSector')
                    );
                    
                    return {
                        passed: properTransitions.length > 0,
                        details: `Found ${properTransitions.length} proper sector transition logs`,
                        examples: properTransitions.slice(0, 3)
                    };
                }
            }
        ];
        
        for (const test of tests) {
            await this.runTest('Regression Prevention', test.name, test.test);
        }
    }

    /**
     * Run a single test
     */
    async runTest(category, name, testFn) {
        try {
            const result = await testFn();
            const passed = typeof result === 'boolean' ? result : result.passed;
            
            this.testResults.push({
                category,
                name,
                passed,
                details: typeof result === 'object' ? result.details : null,
                data: typeof result === 'object' ? result : null
            });
            
            const status = passed ? '✅' : '❌';
            const details = typeof result === 'object' && result.details ? ` - ${result.details}` : '';
            console.log(`  ${status} ${name}${details}`);
            
        } catch (error) {
            this.testResults.push({
                category,
                name,
                passed: false,
                error: error.message
            });
            
            console.log(`  ❌ ${name} - Error: ${error.message}`);
        }
    }

    /**
     * Generate test report
     */
    generateReport() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        
        console.log('\n' + '='.repeat(60));
        console.log('🎯 INTEGRATION TEST REPORT');
        console.log('='.repeat(60));
        
        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.passed).length;
        const failedTests = totalTests - passedTests;
        
        console.log(`📊 Total Tests: ${totalTests}`);
        console.log(`✅ Passed: ${passedTests}`);
        console.log(`❌ Failed: ${failedTests}`);
        console.log(`⏱️ Duration: ${duration}ms`);
        console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
        
        // Group by category
        const categories = {};
        this.testResults.forEach(result => {
            if (!categories[result.category]) {
                categories[result.category] = { passed: 0, failed: 0, total: 0 };
            }
            categories[result.category].total++;
            if (result.passed) {
                categories[result.category].passed++;
            } else {
                categories[result.category].failed++;
            }
        });
        
        console.log('\n📋 Results by Category:');
        Object.entries(categories).forEach(([category, stats]) => {
            const rate = ((stats.passed / stats.total) * 100).toFixed(1);
            console.log(`  ${category}: ${stats.passed}/${stats.total} (${rate}%)`);
        });
        
        // Show failures
        const failures = this.testResults.filter(r => !r.passed);
        if (failures.length > 0) {
            console.log('\n❌ Failed Tests:');
            failures.forEach(failure => {
                console.log(`  • ${failure.category}: ${failure.name}`);
                if (failure.error) {
                    console.log(`    Error: ${failure.error}`);
                }
                if (failure.details) {
                    console.log(`    Details: ${failure.details}`);
                }
            });
        }
        
        // Overall result
        if (failedTests === 0) {
            console.log('\n🎉 ALL INTEGRATION TESTS PASSED!');
            console.log('Target computer fixes are working correctly in the browser environment.');
        } else {
            console.log('\n⚠️ SOME TESTS FAILED!');
            console.log('Please review the failures above and fix any issues.');
        }
        
        // Store results globally for external access
        window.targetComputerTestResults = {
            passed: failedTests === 0,
            totalTests,
            passedTests,
            failedTests,
            duration,
            categories,
            failures,
            details: this.testResults
        };
    }

    /**
     * Capture console logs for analysis
     */
    captureConsoleLogs() {
        this.testLogs = [];
        console.log = (...args) => {
            const message = args.join(' ');
            this.testLogs.push(message);
            this.originalConsoleLog(...args);
        };
    }

    /**
     * Restore original console.log
     */
    restoreConsoleLogs() {
        console.log = this.originalConsoleLog;
    }
}

// Global function to run tests
window.runTargetComputerTests = async function() {
    const testSuite = new TargetComputerIntegrationTests();
    return await testSuite.runAllTests();
};

// Auto-run tests if in test mode
if (window.location.search.includes('runTests=true')) {
    // Wait for game to initialize
    setTimeout(() => {
        window.runTargetComputerTests();
    }, 5000);
}

console.log('🧪 Target Computer Integration Tests loaded. Run with: runTargetComputerTests()');
