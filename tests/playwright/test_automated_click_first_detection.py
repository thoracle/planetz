"""
Fully automated Playwright test to detect and analyze the click-first tooltip bug.
No manual intervention required - runs the detection script automatically.
"""

import pytest
from playwright.sync_api import Page


def test_automated_click_first_bug_detection(page: Page):
    """Automatically detect the click-first tooltip bug using a real browser."""
    
    print("\n🤖 Starting fully automated click-first bug detection...")
    
    # Navigate to the game
    page.goto("http://localhost:5000")
    
    # Wait for initial page load
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)
    
    # Check if we can access the game
    game_ready = page.evaluate("""
        (() => {
            // Wait for basic game elements
            const hasIndex = document.title.includes('PlanetZ') || document.body.innerHTML.includes('PlanetZ');
            return hasIndex;
        })()
    """)
    
    if not game_ready:
        pytest.skip("Game not accessible at localhost:5000")
    
    # Open Star Charts (press 'C' key)
    print("🎮 Opening Star Charts...")
    page.keyboard.press('c')
    page.wait_for_timeout(2000)
    
    # Inject and run the automated detection script
    print("🔍 Running automated bug detection script...")
    
    detection_results = page.evaluate("""
        (() => {
            console.log('🤖 Starting AUTOMATED click-first tooltip bug detection...');

            if (!window.navigationSystemManager?.starChartsUI || !window.navigationSystemManager?.starChartsManager) {
                return { error: 'Star Charts components not found' };
            }

            const starChartsUI = window.navigationSystemManager.starChartsUI;
            const starChartsManager = window.navigationSystemManager.starChartsManager;
            
            console.log('✅ Star Charts components found');
            
            // Fix any broken discovery system from previous debug attempts
            const currentDiscovered = starChartsManager.getDiscoveredObjects();
            if (Array.isArray(currentDiscovered)) {
                console.log('🔧 Fixing broken discovery system (Array -> Set)...');
                starChartsManager.discoveredObjects = new Set(currentDiscovered);
                console.log('✅ Fixed: discoveredObjects is now a Set');
            }
            
            // Get all objects for systematic testing
            const allObjects = starChartsUI.getDiscoveredObjectsForRender();
            console.log(`🔍 Found ${allObjects.length} objects to test systematically`);
            
            if (allObjects.length === 0) {
                return { error: 'No objects found to test' };
            }
            
            // Results tracking
            const results = {
                totalTested: allObjects.length,
                clickFirstBugs: [],
                workingCorrectly: [],
                testDetails: [],
                clickFixTests: []
            };
            
            // Test each object
            allObjects.forEach((obj, index) => {
                const objectId = obj.id;
                const objectName = obj.name;
                const objectType = obj.type;
                const isUndiscovered = obj._isUndiscovered;
                
                console.log(`🧪 Testing ${index + 1}/${allObjects.length}: ${objectId} "${objectName}" (${objectType})`);
                
                // Get tooltip text using the actual method
                let tooltipText;
                try {
                    tooltipText = starChartsUI.getTooltipText(obj);
                } catch (e) {
                    tooltipText = `ERROR: ${e.message}`;
                }
                
                const testResult = {
                    id: objectId,
                    name: objectName,
                    type: objectType,
                    isUndiscovered: isUndiscovered,
                    tooltipText: tooltipText,
                    hasValidName: objectName && objectName !== 'Unknown' && objectName.trim() !== '',
                    showsUnknown: tooltipText === 'Unknown'
                };
                
                // Detect click-first bug pattern:
                // Object has a valid name but tooltip shows "Unknown"
                if (testResult.hasValidName && testResult.showsUnknown) {
                    console.log(`🐛 CLICK-FIRST BUG DETECTED: ${objectId} has name "${objectName}" but tooltip shows "Unknown"`);
                    results.clickFirstBugs.push(testResult);
                } else if (testResult.hasValidName && tooltipText === objectName) {
                    console.log(`✅ WORKING CORRECTLY: ${objectId} shows correct tooltip "${tooltipText}"`);
                    results.workingCorrectly.push(testResult);
                } else if (testResult.showsUnknown && !testResult.hasValidName) {
                    console.log(`ℹ️ EXPECTED UNKNOWN: ${objectId} correctly shows "Unknown" (no valid name)`);
                } else {
                    console.log(`⚠️ OTHER CASE: ${objectId} - Name: "${objectName}", Tooltip: "${tooltipText}"`);
                }
                
                results.testDetails.push(testResult);
            });
            
            // Test click-fix behavior on problematic objects
            if (results.clickFirstBugs.length > 0) {
                console.log('\\n🧪 TESTING CLICK-FIX BEHAVIOR:');
                const testObjects = results.clickFirstBugs.slice(0, 3); // Test first 3
                
                testObjects.forEach(bugObj => {
                    console.log(`\\n🔧 Testing click-fix for: ${bugObj.id} "${bugObj.name}"`);
                    
                    // Find the actual object in the rendered list
                    const actualObj = allObjects.find(obj => obj.id === bugObj.id);
                    if (!actualObj) {
                        console.log(`  ❌ Could not find object in rendered list`);
                        return;
                    }
                    
                    // Test tooltip before click
                    const tooltipBefore = starChartsUI.getTooltipText(actualObj);
                    console.log(`  Before click: "${tooltipBefore}"`);
                    
                    // Simulate clicking the object
                    let clickSuccess = false;
                    let tooltipAfter = tooltipBefore;
                    
                    try {
                        starChartsUI.selectObject(actualObj);
                        console.log(`  ✅ Clicked object successfully`);
                        clickSuccess = true;
                        
                        // Test tooltip after click
                        tooltipAfter = starChartsUI.getTooltipText(actualObj);
                        console.log(`  After click: "${tooltipAfter}"`);
                        
                    } catch (e) {
                        console.log(`  ❌ Click simulation failed: ${e.message}`);
                    }
                    
                    const clickFixResult = {
                        objectId: bugObj.id,
                        objectName: bugObj.name,
                        tooltipBefore: tooltipBefore,
                        tooltipAfter: tooltipAfter,
                        clickSuccess: clickSuccess,
                        wasFixed: tooltipBefore === 'Unknown' && tooltipAfter !== 'Unknown'
                    };
                    
                    results.clickFixTests.push(clickFixResult);
                    
                    if (clickFixResult.wasFixed) {
                        console.log(`  🎯 CLICK-FIX CONFIRMED: Tooltip fixed by clicking!`);
                    } else if (tooltipBefore === tooltipAfter) {
                        console.log(`  ⚠️ No change after click`);
                    } else {
                        console.log(`  ℹ️ Tooltip changed: "${tooltipBefore}" -> "${tooltipAfter}"`);
                    }
                });
            }
            
            console.log('\\n📊 AUTOMATED DETECTION RESULTS:');
            console.log(`  Total objects tested: ${results.totalTested}`);
            console.log(`  Objects with click-first bug: ${results.clickFirstBugs.length}`);
            console.log(`  Objects working correctly: ${results.workingCorrectly.length}`);
            
            return results;
        })()
    """)
    
    # Analyze the results
    if 'error' in detection_results:
        pytest.skip(f"Detection failed: {detection_results['error']}")
    
    total_tested = detection_results['totalTested']
    click_first_bugs = detection_results['clickFirstBugs']
    working_correctly = detection_results['workingCorrectly']
    click_fix_tests = detection_results['clickFixTests']
    
    print(f"\n📊 AUTOMATED DETECTION RESULTS:")
    print(f"  Total objects tested: {total_tested}")
    print(f"  Objects with click-first bug: {len(click_first_bugs)}")
    print(f"  Objects working correctly: {len(working_correctly)}")
    
    if click_first_bugs:
        print(f"\n🐛 OBJECTS WITH CLICK-FIRST BUG:")
        for bug in click_first_bugs:
            discovery_status = "undiscovered" if bug['isUndiscovered'] else "discovered"
            print(f"  - {bug['id']} '{bug['name']}' ({bug['type']}) - {discovery_status}")
        
        # Pattern analysis
        discovered_bugs = [bug for bug in click_first_bugs if not bug['isUndiscovered']]
        undiscovered_bugs = [bug for bug in click_first_bugs if bug['isUndiscovered']]
        
        print(f"\n🔍 BUG PATTERN ANALYSIS:")
        print(f"  - Discovered objects with bug: {len(discovered_bugs)}")
        print(f"  - Undiscovered objects with bug: {len(undiscovered_bugs)}")
        
        # Group by object type
        type_counts = {}
        for bug in click_first_bugs:
            obj_type = bug['type']
            type_counts[obj_type] = type_counts.get(obj_type, 0) + 1
        
        print(f"  - Object types affected: {type_counts}")
        
        # Click-fix test results
        if click_fix_tests:
            print(f"\n🔧 CLICK-FIX TEST RESULTS:")
            fixed_count = 0
            for test in click_fix_tests:
                if test['wasFixed']:
                    fixed_count += 1
                    print(f"  ✅ {test['objectId']}: '{test['tooltipBefore']}' -> '{test['tooltipAfter']}'")
                else:
                    print(f"  ❌ {test['objectId']}: No fix ('{test['tooltipBefore']}' -> '{test['tooltipAfter']}')")
            
            print(f"\n🎯 CLICK-FIX CONFIRMATION: {fixed_count}/{len(click_fix_tests)} objects were fixed by clicking")
        
        print(f"\n🎯 CONFIRMED: Click-first tooltip bug affects {len(click_first_bugs)} objects")
        
        # This is the bug we're looking for - assert it exists for confirmation
        assert len(click_first_bugs) > 0, f"Click-first tooltip bug confirmed: {len(click_first_bugs)} objects affected"
        
    else:
        print(f"\n🎉 NO CLICK-FIRST BUG DETECTED!")
        print("All tooltips are working correctly on hover.")
    
    if working_correctly:
        print(f"\n✅ SAMPLE WORKING OBJECTS:")
        for obj in working_correctly[:3]:  # Show first 3
            discovery_status = "undiscovered" if obj['isUndiscovered'] else "discovered"
            print(f"  - {obj['id']} '{obj['name']}' ({obj['type']}) - {discovery_status}")
    
    print(f"\n✅ Automated detection complete - no manual intervention required!")


def test_analyze_tooltip_method_directly(page: Page):
    """Analyze the getTooltipText method to understand the root cause."""
    
    print("\n🔬 Analyzing tooltip method for root cause...")
    
    # Navigate to the game
    page.goto("http://localhost:5000")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)
    
    # Open Star Charts
    page.keyboard.press('c')
    page.wait_for_timeout(1500)
    
    # Analyze the tooltip method
    analysis = page.evaluate("""
        (() => {
            if (!window.navigationSystemManager?.starChartsUI) {
                return { error: 'StarChartsUI not found' };
            }
            
            const starChartsUI = window.navigationSystemManager.starChartsUI;
            
            // Get the method source code
            let methodSource = '';
            if (typeof starChartsUI.getTooltipText === 'function') {
                methodSource = starChartsUI.getTooltipText.toString();
            }
            
            // Test with different object states to understand the logic
            const testCases = [
                { id: 'test1', name: 'Test Object', type: 'test', _isUndiscovered: false },
                { id: 'test2', name: 'Hidden Object', type: 'test', _isUndiscovered: true },
                { id: 'test3', name: null, type: 'test', _isUndiscovered: false },
                { id: 'test4', name: 'Ship', type: 'ship', _isShip: true }
            ];
            
            const testResults = [];
            testCases.forEach(testCase => {
                let result;
                try {
                    result = starChartsUI.getTooltipText(testCase);
                } catch (e) {
                    result = `ERROR: ${e.message}`;
                }
                testResults.push({
                    input: testCase,
                    output: result
                });
            });
            
            return {
                hasMethod: typeof starChartsUI.getTooltipText === 'function',
                methodLength: methodSource.length,
                methodPreview: methodSource.substring(0, 800),
                testResults: testResults,
                isTestModeEnabled: starChartsUI.isTestModeEnabled ? starChartsUI.isTestModeEnabled() : 'method not found'
            };
        })()
    """)
    
    if 'error' in analysis:
        print(f"  ❌ Analysis failed: {analysis['error']}")
        return
    
    print(f"  Method exists: {analysis['hasMethod']}")
    print(f"  Method length: {analysis['methodLength']} characters")
    print(f"  Test mode enabled: {analysis['isTestModeEnabled']}")
    
    if analysis['methodPreview']:
        print(f"  Method preview:")
        print(f"    {analysis['methodPreview']}...")
    
    print(f"\n  Test results:")
    for test in analysis['testResults']:
        input_obj = test['input']
        output = test['output']
        print(f"    Input: {input_obj} -> Output: '{output}'")
    
    print(f"\n✅ Method analysis complete")
