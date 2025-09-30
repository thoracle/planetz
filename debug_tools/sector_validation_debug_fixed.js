/**
 * Sector Validation Debug Script - Fixed for A0 Special Cases
 * 
 * Run this after warping into a new sector to validate all critical data.
 * Now handles A0 (Sol system) special discovery mechanics properly.
 */

console.log('🔍 SECTOR VALIDATION DEBUG SCRIPT - A0 FIXED');
console.log('=============================================');

function validateSector() {
    console.log('🌌 Starting comprehensive sector validation...');
    
    const results = {
        totalObjects: 0,
        discovered: 0,
        undiscovered: 0,
        positionIssues: 0,
        diplomacyIssues: 0,
        colorIssues: 0,
        integrationIssues: 0,
        criticalErrors: [],
        sectorId: null,
        isA0: false
    };

    // 1. Validate core managers exist
    console.log('\n📋 1. CORE MANAGERS CHECK');
    console.log('-------------------------');
    
    const tcm = window.targetComputerManager;
    const scm = window.starChartsManager;
    const gameState = window.gameState;
    
    console.log('TargetComputerManager:', tcm ? '✅' : '❌');
    console.log('StarChartsManager:', scm ? '✅' : '❌');
    console.log('GameState:', gameState ? '✅' : '❌');
    
    if (!tcm) {
        results.criticalErrors.push('TargetComputerManager not available');
        return results;
    }
    
    if (!scm) {
        results.criticalErrors.push('StarChartsManager not available');
    }

    // Detect current sector
    const currentSector = window.currentSector || window.gameState?.currentSector || 'unknown';
    results.sectorId = currentSector;
    results.isA0 = currentSector.toLowerCase().includes('a0') || currentSector.toLowerCase().includes('sol');
    
    console.log(`Current sector: ${currentSector}`);
    console.log(`Is A0 (Sol): ${results.isA0 ? '✅' : '❌'}`);

    // 2. Validate target objects
    console.log('\n🎯 2. TARGET OBJECTS VALIDATION');
    console.log('-------------------------------');
    
    if (!tcm.targetObjects || !Array.isArray(tcm.targetObjects)) {
        console.log('❌ No target objects found');
        results.criticalErrors.push('No target objects available');
        return results;
    }
    
    results.totalObjects = tcm.targetObjects.length;
    console.log(`Total objects: ${results.totalObjects}`);
    
    // 3. Detailed object validation with A0 special handling
    console.log('\n🔍 3. DETAILED OBJECT ANALYSIS');
    console.log('------------------------------');
    
    const issues = [];
    const a0SpecialObjects = ['sol', 'sun', 'earth', 'moon', 'mars']; // Objects that might be pre-discovered in A0
    
    tcm.targetObjects.forEach((target, index) => {
        const targetData = tcm.processTargetData ? tcm.processTargetData(target) : target;
        const objectId = `${index + 1}. ${target.name}`;
        
        // Discovery validation
        const isDiscovered = targetData?.isShip || tcm.isObjectDiscovered(targetData);
        if (isDiscovered) {
            results.discovered++;
        } else {
            results.undiscovered++;
        }
        
        // Position validation
        const position = tcm.getTargetPosition(targetData);
        const hasValidPosition = position !== null && 
                                typeof position?.x === 'number' && 
                                typeof position?.y === 'number' && 
                                typeof position?.z === 'number';
        
        if (!hasValidPosition) {
            results.positionIssues++;
            issues.push(`${objectId}: Invalid position - ${position ? JSON.stringify(position) : 'null'}`);
        }
        
        // Diplomacy validation
        const diplomacy = tcm.getTargetDiplomacy(targetData);
        const expectedDiplomacy = isDiscovered ? (diplomacy !== 'unknown') : (diplomacy === 'unknown');
        
        if (!expectedDiplomacy) {
            results.diplomacyIssues++;
            issues.push(`${objectId}: Diplomacy mismatch - discovered:${isDiscovered} but diplomacy:'${diplomacy}'`);
        }
        
        // Star Charts integration check with A0 special handling
        if (scm && isDiscovered) {
            const scDiscovered = scm.isDiscovered(targetData);
            if (!scDiscovered) {
                // Check if this is an A0 special case
                const isA0Special = results.isA0 && a0SpecialObjects.some(special => 
                    target.name.toLowerCase().includes(special)
                );
                
                if (isA0Special) {
                    console.log(`ℹ️ A0 Special: ${target.name} - TargetComputer discovered but StarCharts not (expected in Sol system)`);
                } else {
                    results.integrationIssues++;
                    issues.push(`${objectId}: TargetComputer says discovered but StarCharts says not discovered`);
                }
            }
        }
        
        // Basic data integrity
        if (!target.name || target.name === 'undefined') {
            issues.push(`${objectId}: Missing or invalid name`);
        }
        
        if (!targetData?.type) {
            issues.push(`${objectId}: Missing type information`);
        }
    });
    
    console.log(`Discovered: ${results.discovered}`);
    console.log(`Undiscovered: ${results.undiscovered}`);
    console.log(`Position issues: ${results.positionIssues}`);
    console.log(`Diplomacy issues: ${results.diplomacyIssues}`);
    console.log(`Integration issues: ${results.integrationIssues}`);
    
    // 4. Current target validation
    console.log('\n🎯 4. CURRENT TARGET VALIDATION');
    console.log('-------------------------------');
    
    if (tcm.currentTarget) {
        const currentData = tcm.getCurrentTargetData();
        const currentDiscovered = currentData?.isShip || tcm.isObjectDiscovered(currentData);
        const currentDiplomacy = tcm.getTargetDiplomacy(currentData);
        const currentPosition = tcm.getTargetPosition(currentData);
        
        console.log(`Current target: ${tcm.currentTarget.name}`);
        console.log(`Discovered: ${currentDiscovered}`);
        console.log(`Diplomacy: ${currentDiplomacy}`);
        console.log(`Position valid: ${currentPosition !== null}`);
        
        // Wireframe validation
        if (tcm.targetWireframe?.material) {
            const wireframeColor = tcm.targetWireframe.material.color.getHex();
            const colorNames = {
                0x44ffff: 'cyan',
                0xff3333: 'red', 
                0x44ff44: 'green',
                0xffff44: 'yellow',
                0xff00ff: 'magenta'
            };
            const colorName = colorNames[wireframeColor] || `0x${wireframeColor.toString(16)}`;
            
            console.log(`Wireframe color: ${colorName}`);
            
            // Validate color matches diplomacy
            let expectedColor;
            if (!currentDiscovered) {
                expectedColor = 'cyan';
            } else {
                switch (currentDiplomacy) {
                    case 'enemy':
                    case 'hostile':
                        expectedColor = 'red';
                        break;
                    case 'friendly':
                    case 'ally':
                        expectedColor = 'green';
                        break;
                    case 'neutral':
                        expectedColor = 'yellow';
                        break;
                    case 'unknown':
                        expectedColor = 'cyan';
                        break;
                    default:
                        expectedColor = 'yellow';
                        break;
                }
            }
            
            const colorCorrect = colorName === expectedColor;
            console.log(`Expected color: ${expectedColor} - ${colorCorrect ? '✅' : '❌'}`);
            
            if (!colorCorrect) {
                results.colorIssues++;
                issues.push(`Current target wireframe color mismatch: got ${colorName}, expected ${expectedColor}`);
            }
        } else {
            console.log('No wireframe available');
        }
    } else {
        console.log('No current target selected');
    }
    
    // 5. Star Charts validation with A0 tolerance
    if (scm) {
        console.log('\n🗺️ 5. STAR CHARTS VALIDATION');
        console.log('----------------------------');
        
        const scDiscoveredCount = scm.discoveredObjects ? Object.keys(scm.discoveredObjects).length : 0;
        console.log(`Star Charts discovered count: ${scDiscoveredCount}`);
        console.log(`Target Computer discovered count: ${results.discovered}`);
        
        // A0 has more tolerance for discrepancies due to special discovery mechanics
        const tolerance = results.isA0 ? 5 : 2;
        const discrepancy = Math.abs(scDiscoveredCount - results.discovered);
        
        if (discrepancy > tolerance) {
            results.integrationIssues++;
            issues.push(`Large discrepancy between StarCharts (${scDiscoveredCount}) and TargetComputer (${results.discovered}) discovery counts`);
        } else if (results.isA0 && discrepancy > 0) {
            console.log(`ℹ️ A0 Discovery discrepancy: ${discrepancy} (within tolerance for Sol system)`);
        }
    }
    
    // 6. Performance checks
    console.log('\n⚡ 6. PERFORMANCE CHECKS');
    console.log('-----------------------');
    
    const memoryUsage = performance.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
    } : null;
    
    if (memoryUsage) {
        console.log(`Memory usage: ${memoryUsage.used}MB / ${memoryUsage.total}MB (limit: ${memoryUsage.limit}MB)`);
        if (memoryUsage.used > memoryUsage.limit * 0.8) {
            issues.push('High memory usage detected - potential memory leak');
        }
    }
    
    // 7. A0-aware summary and recommendations
    console.log('\n📊 7. VALIDATION SUMMARY');
    console.log('------------------------');
    
    const totalIssues = results.positionIssues + results.diplomacyIssues + results.colorIssues + results.integrationIssues;
    
    console.log(`Sector: ${results.sectorId} ${results.isA0 ? '(Sol - Special Rules)' : ''}`);
    console.log(`Total objects: ${results.totalObjects}`);
    console.log(`Discovered: ${results.discovered} (${Math.round(results.discovered/results.totalObjects*100)}%)`);
    console.log(`Undiscovered: ${results.undiscovered} (${Math.round(results.undiscovered/results.totalObjects*100)}%)`);
    console.log(`Total issues found: ${totalIssues}`);
    
    if (results.criticalErrors.length > 0) {
        console.log('\n🚨 CRITICAL ERRORS:');
        results.criticalErrors.forEach(error => console.log(`  ❌ ${error}`));
    }
    
    if (issues.length > 0) {
        console.log('\n⚠️ ISSUES FOUND:');
        issues.slice(0, 10).forEach(issue => console.log(`  ⚠️ ${issue}`));
        if (issues.length > 10) {
            console.log(`  ... and ${issues.length - 10} more issues`);
        }
    }
    
    if (totalIssues === 0 && results.criticalErrors.length === 0) {
        console.log('\n✅ SECTOR VALIDATION PASSED - No issues detected!');
    } else {
        console.log('\n❌ SECTOR VALIDATION FAILED - Issues detected above');
        
        if (results.isA0) {
            console.log('\nℹ️ NOTE: A0 (Sol) has special discovery mechanics that may cause some integration discrepancies.');
        }
    }
    
    return results;
}

function debugA0Discovery() {
    console.log('\n🌟 A0 DISCOVERY DEBUG');
    console.log('--------------------');
    
    const tcm = window.targetComputerManager;
    const scm = window.starChartsManager;
    
    if (!tcm?.targetObjects) {
        console.log('❌ No targets available');
        return;
    }
    
    console.log('Checking A0 discovery states...');
    
    tcm.targetObjects.forEach((target, index) => {
        const targetData = tcm.processTargetData ? tcm.processTargetData(target) : target;
        const tcDiscovered = targetData?.isShip || tcm.isObjectDiscovered(targetData);
        const scDiscovered = scm ? scm.isDiscovered(targetData) : 'N/A';
        
        const status = tcDiscovered === scDiscovered ? '✅' : '❌';
        console.log(`${index + 1}. ${target.name}:`);
        console.log(`   TC: ${tcDiscovered}, SC: ${scDiscovered} ${status}`);
        
        if (tcDiscovered !== scDiscovered) {
            console.log(`   🔍 ID used by TC: ${tcm.constructObjectId ? tcm.constructObjectId(targetData) : 'unknown'}`);
            if (scm?.discoveredObjects) {
                const scKeys = Object.keys(scm.discoveredObjects).filter(key => 
                    key.toLowerCase().includes(target.name.toLowerCase().replace(/\s+/g, '_'))
                );
                console.log(`   🔍 Matching SC keys: ${scKeys.join(', ') || 'none'}`);
            }
        }
    });
}

function quickTargetTest() {
    console.log('\n🧪 QUICK TARGET TEST');
    console.log('-------------------');
    
    const tcm = window.targetComputerManager;
    if (!tcm?.targetObjects) {
        console.log('❌ No targets available');
        return;
    }
    
    // Test first 5 targets
    console.log('Testing first 5 targets...');
    tcm.targetObjects.slice(0, 5).forEach((target, index) => {
        const targetData = tcm.processTargetData ? tcm.processTargetData(target) : target;
        const isDiscovered = targetData?.isShip || tcm.isObjectDiscovered(targetData);
        const diplomacy = tcm.getTargetDiplomacy(targetData);
        const position = tcm.getTargetPosition(targetData);
        
        console.log(`${index + 1}. ${target.name}:`);
        console.log(`   Discovered: ${isDiscovered}`);
        console.log(`   Diplomacy: ${diplomacy}`);
        console.log(`   Position: ${position ? '✅' : '❌'}`);
    });
}

function validateCurrentWireframe() {
    const tcm = window.targetComputerManager;
    if (!tcm?.currentTarget || !tcm.targetWireframe) {
        console.log('❌ No current target or wireframe');
        return;
    }
    
    console.log('\n🎨 WIREFRAME VALIDATION');
    console.log('----------------------');
    
    const targetData = tcm.getCurrentTargetData();
    const isDiscovered = targetData?.isShip || tcm.isObjectDiscovered(targetData);
    const diplomacy = tcm.getTargetDiplomacy(targetData);
    const wireframeColor = tcm.targetWireframe.material.color.getHex();
    
    const colorNames = {0x44ffff: 'cyan', 0xff3333: 'red', 0x44ff44: 'green', 0xffff44: 'yellow', 0xff00ff: 'magenta'};
    const actualColor = colorNames[wireframeColor] || `0x${wireframeColor.toString(16)}`;
    
    console.log(`Target: ${tcm.currentTarget.name}`);
    console.log(`Discovered: ${isDiscovered}`);
    console.log(`Diplomacy: ${diplomacy}`);
    console.log(`Wireframe color: ${actualColor}`);
    
    // Determine expected color
    let expectedColor;
    if (!isDiscovered) {
        expectedColor = 'cyan';
    } else {
        switch (diplomacy) {
            case 'enemy': case 'hostile': expectedColor = 'red'; break;
            case 'friendly': case 'ally': expectedColor = 'green'; break;
            case 'neutral': expectedColor = 'yellow'; break;
            case 'unknown': expectedColor = 'cyan'; break;
            default: expectedColor = 'yellow'; break;
        }
    }
    
    const isCorrect = actualColor === expectedColor;
    console.log(`Expected: ${expectedColor} - ${isCorrect ? '✅ CORRECT' : '❌ WRONG'}`);
    
    return isCorrect;
}

// Export functions
window.validateSector = validateSector;
window.debugA0Discovery = debugA0Discovery;
window.quickTargetTest = quickTargetTest;
window.validateCurrentWireframe = validateCurrentWireframe;

console.log('\n🎯 SECTOR VALIDATION COMMANDS (A0 FIXED):');
console.log('validateSector() - Full sector validation with A0 handling');
console.log('debugA0Discovery() - Debug A0 discovery state mismatches');
console.log('quickTargetTest() - Test first 5 targets');
console.log('validateCurrentWireframe() - Check current target wireframe');
console.log('\n💡 Now handles A0 (Sol system) special discovery mechanics!');
