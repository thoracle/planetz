"""
Test click-first tooltip bug using the mock Star Charts environment.
This works with the fallback environment created by conftest.py.
"""

import pytest
from playwright.sync_api import Page


def test_click_first_bug_with_mock_environment(mock_star_charts_environment: Page):
    """Test the click-first tooltip bug using the mock environment."""
    page = mock_star_charts_environment
    
    print("\n🔧 Testing click-first bug with mock environment...")
    
    # Wait for mock environment to be ready
    page.wait_for_timeout(1000)
    
    # Test the mock environment
    results = page.evaluate("""
        (() => {
            console.log('🔍 Testing mock environment...');
            
            // Check if mock environment is available
            if (!window.navigationSystemManager?.starChartsUI || !window.navigationSystemManager?.starChartsManager) {
                return { error: 'Mock Star Charts components not found' };
            }
            
            const starChartsUI = window.navigationSystemManager.starChartsUI;
            const starChartsManager = window.navigationSystemManager.starChartsManager;
            
            console.log('✅ Mock components found');
            
            // Test with mock objects
            const mockObjects = [
                { id: 'test_star', name: 'Test Star', type: 'star', _isUndiscovered: false },
                { id: 'test_planet', name: 'Test Planet', type: 'planet', _isUndiscovered: false },
                { id: 'test_station', name: 'Test Station', type: 'space_station', _isUndiscovered: true },
                { id: 'test_beacon', name: 'Test Beacon', type: 'navigation_beacon', _isUndiscovered: true }
            ];
            
            const results = {
                totalObjects: mockObjects.length,
                testResults: [],
                clickFirstBugs: [],
                workingCorrectly: []
            };
            
            // Test each mock object
            mockObjects.forEach(obj => {
                console.log(`🧪 Testing mock object: ${obj.id} "${obj.name}"`);
                
                // Test tooltip generation
                let tooltipText;
                try {
                    tooltipText = starChartsUI.getTooltipText(obj);
                } catch (e) {
                    tooltipText = 'ERROR: ' + e.message;
                }
                
                const testResult = {
                    id: obj.id,
                    name: obj.name,
                    type: obj.type,
                    isUndiscovered: obj._isUndiscovered,
                    tooltipText: tooltipText,
                    hasName: !!obj.name && obj.name !== 'Unknown',
                    showsUnknown: tooltipText === 'Unknown'
                };
                
                console.log(`  Tooltip result: "${tooltipText}"`);
                
                // Check for click-first bug pattern
                if (testResult.hasName && testResult.showsUnknown) {
                    console.log(`🐛 POTENTIAL CLICK-FIRST BUG: ${obj.id} has name "${obj.name}" but tooltip shows "Unknown"`);
                    results.clickFirstBugs.push(testResult);
                } else if (testResult.hasName && tooltipText === obj.name) {
                    console.log(`✅ WORKING: ${obj.id} shows correct tooltip "${tooltipText}"`);
                    results.workingCorrectly.push(testResult);
                } else {
                    console.log(`ℹ️ OTHER: ${obj.id} - Expected: "${obj.name}", Got: "${tooltipText}"`);
                }
                
                results.testResults.push(testResult);
            });
            
            return results;
        })()
    """)
    
    if 'error' in results:
        pytest.skip(f"Mock environment error: {results['error']}")
    
    print(f"\n📊 MOCK ENVIRONMENT TEST RESULTS:")
    print(f"  Total mock objects tested: {results['totalObjects']}")
    print(f"  Potential click-first bugs: {len(results['clickFirstBugs'])}")
    print(f"  Working correctly: {len(results['workingCorrectly'])}")
    
    # Show detailed results
    for test_result in results['testResults']:
        discovery_status = "undiscovered" if test_result['isUndiscovered'] else "discovered"
        print(f"  - {test_result['id']} '{test_result['name']}' ({test_result['type']}) - {discovery_status}")
        print(f"    Expected: '{test_result['name']}', Got: '{test_result['tooltipText']}'")
    
    if results['clickFirstBugs']:
        print(f"\n🐛 MOCK OBJECTS WITH POTENTIAL CLICK-FIRST BUG:")
        for bug in results['clickFirstBugs']:
            print(f"  - {bug['id']}: Has name '{bug['name']}' but shows '{bug['tooltipText']}'")
    
    # Test the tooltip logic directly
    print(f"\n🔬 TESTING TOOLTIP LOGIC DIRECTLY:")
    
    tooltip_logic_test = page.evaluate("""
        (() => {
            const starChartsUI = window.navigationSystemManager?.starChartsUI;
            if (!starChartsUI) return { error: 'No StarChartsUI' };
            
            // Test the tooltip logic with different object states
            const testCases = [
                { id: 'discovered_star', name: 'Sol', type: 'star', _isUndiscovered: false },
                { id: 'undiscovered_station', name: 'Hidden Station', type: 'space_station', _isUndiscovered: true },
                { id: 'ship_object', name: 'Player Ship', type: 'ship', _isShip: true },
                { id: 'no_name_object', name: null, type: 'unknown', _isUndiscovered: false }
            ];
            
            const logicResults = [];
            
            testCases.forEach(testCase => {
                let tooltipText;
                try {
                    tooltipText = starChartsUI.getTooltipText(testCase);
                } catch (e) {
                    tooltipText = 'ERROR: ' + e.message;
                }
                
                logicResults.push({
                    testCase: testCase,
                    result: tooltipText,
                    expected: testCase._isShip ? 'You are here' : 
                             testCase._isUndiscovered ? 'Unknown' : 
                             testCase.name || 'Unknown'
                });
            });
            
            return logicResults;
        })()
    """)
    
    if 'error' not in tooltip_logic_test:
        for logic_result in tooltip_logic_test:
            test_case = logic_result['testCase']
            result = logic_result['result']
            expected = logic_result['expected']
            
            status = "✅" if result == expected else "❌"
            print(f"  {status} {test_case['id']}: Expected '{expected}', Got '{result}'")
    
    print(f"\n✅ Mock environment testing complete")


def test_tooltip_text_method_analysis(mock_star_charts_environment: Page):
    """Analyze the getTooltipText method to understand the click-first bug."""
    page = mock_star_charts_environment
    
    print("\n🔬 Analyzing getTooltipText method...")
    
    page.wait_for_timeout(500)
    
    # Analyze the tooltip method
    analysis = page.evaluate("""
        (() => {
            const starChartsUI = window.navigationSystemManager?.starChartsUI;
            if (!starChartsUI) return { error: 'No StarChartsUI' };
            
            // Check if the method exists and get its source
            const hasMethod = typeof starChartsUI.getTooltipText === 'function';
            
            let methodSource = '';
            if (hasMethod) {
                try {
                    methodSource = starChartsUI.getTooltipText.toString();
                } catch (e) {
                    methodSource = 'Could not get method source: ' + e.message;
                }
            }
            
            // Test with a simple object to see the logic flow
            const testObject = { id: 'test', name: 'Test Object', type: 'test', _isUndiscovered: false };
            let testResult = '';
            
            if (hasMethod) {
                try {
                    testResult = starChartsUI.getTooltipText(testObject);
                } catch (e) {
                    testResult = 'ERROR: ' + e.message;
                }
            }
            
            return {
                hasMethod: hasMethod,
                methodExists: hasMethod,
                testResult: testResult,
                methodLength: methodSource.length,
                methodPreview: methodSource.substring(0, 500) + (methodSource.length > 500 ? '...' : '')
            };
        })()
    """)
    
    if 'error' in analysis:
        print(f"  ❌ Analysis error: {analysis['error']}")
        return
    
    print(f"  Method exists: {analysis['hasMethod']}")
    print(f"  Test result: '{analysis['testResult']}'")
    print(f"  Method length: {analysis['methodLength']} characters")
    
    if analysis['methodPreview']:
        print(f"  Method preview:")
        print(f"    {analysis['methodPreview']}")
    
    # Test the isTestModeEnabled method
    test_mode_check = page.evaluate("""
        (() => {
            const starChartsUI = window.navigationSystemManager?.starChartsUI;
            if (!starChartsUI) return { error: 'No StarChartsUI' };
            
            const hasTestModeMethod = typeof starChartsUI.isTestModeEnabled === 'function';
            let testModeResult = false;
            
            if (hasTestModeMethod) {
                try {
                    testModeResult = starChartsUI.isTestModeEnabled();
                } catch (e) {
                    testModeResult = 'ERROR: ' + e.message;
                }
            }
            
            return {
                hasTestModeMethod: hasTestModeMethod,
                testModeEnabled: testModeResult,
                globalTestMode: window.STAR_CHARTS_TEST_MODE
            };
        })()
    """)
    
    print(f"\n🧪 Test Mode Analysis:")
    print(f"  Has isTestModeEnabled method: {test_mode_check.get('hasTestModeMethod', False)}")
    print(f"  Test mode enabled: {test_mode_check.get('testModeEnabled', 'unknown')}")
    print(f"  Global test mode flag: {test_mode_check.get('globalTestMode', 'undefined')}")
    
    print(f"\n✅ Method analysis complete")
