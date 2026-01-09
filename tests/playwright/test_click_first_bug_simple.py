"""
Simple Playwright test to identify the click-first tooltip bug.
Uses the existing test infrastructure without async complications.
"""

import pytest
from playwright.sync_api import Page, expect


def test_click_first_tooltip_bug_detection(star_charts_page: Page):
    """Detect and analyze the click-first tooltip bug pattern."""
    page = star_charts_page

    print("\n🔧 Starting click-first tooltip bug detection...")

    # Wait for Star Charts to be ready
    page.wait_for_timeout(2000)

    # Check if real Star Charts is available (not fallback mock)
    has_real_star_charts = page.evaluate("""() => {
        return !!(window.navigationSystemManager?.starChartsUI?.getDiscoveredObjectsForRender &&
                  window.navigationSystemManager?.starChartsUI?.getTooltipText);
    }""")

    if not has_real_star_charts:
        pytest.skip("Real Star Charts not available - this diagnostic test requires full game initialization")

    # Inject bug detection script and get results
    results = page.evaluate("""
        (() => {
            console.log('🔍 Starting bug detection...');
            
            if (!window.navigationSystemManager?.starChartsUI || !window.navigationSystemManager?.starChartsManager) {
                return { error: 'Star Charts components not found' };
            }
            
            const starChartsUI = window.navigationSystemManager.starChartsUI;
            const starChartsManager = window.navigationSystemManager.starChartsManager;
            
            // Get all objects for testing
            const allObjects = starChartsUI.getDiscoveredObjectsForRender();
            console.log(`🔍 Found ${allObjects.length} objects to test`);
            
            const results = {
                totalObjects: allObjects.length,
                clickFirstObjects: [],
                hoverWorkingObjects: [],
                testDetails: []
            };
            
            // Test each object
            allObjects.forEach((obj, index) => {
                const objectId = obj.id;
                const objectName = obj.name;
                const objectType = obj.type;
                const isUndiscovered = obj._isUndiscovered;
                
                console.log(`🧪 Testing ${index + 1}/${allObjects.length}: ${objectId} "${objectName}"`);
                
                // Test tooltip generation directly
                const tooltipText = starChartsUI.getTooltipText(obj);
                
                const testResult = {
                    id: objectId,
                    name: objectName,
                    type: objectType,
                    isUndiscovered: isUndiscovered,
                    tooltipText: tooltipText,
                    hasName: !!objectName && objectName !== 'Unknown',
                    showsUnknown: tooltipText === 'Unknown'
                };
                
                // Check for click-first bug pattern:
                // Object has a name but tooltip shows "Unknown"
                if (testResult.hasName && testResult.showsUnknown) {
                    console.log(`🐛 CLICK-FIRST BUG: ${objectId} has name "${objectName}" but tooltip shows "Unknown"`);
                    results.clickFirstObjects.push(testResult);
                } else if (testResult.hasName && tooltipText === objectName) {
                    console.log(`✅ WORKING: ${objectId} shows correct tooltip "${tooltipText}"`);
                    results.hoverWorkingObjects.push(testResult);
                } else {
                    console.log(`ℹ️ OTHER: ${objectId} - Name: "${objectName}", Tooltip: "${tooltipText}"`);
                }
                
                results.testDetails.push(testResult);
            });
            
            console.log(`📊 Results: ${results.clickFirstObjects.length} click-first bugs, ${results.hoverWorkingObjects.length} working correctly`);
            
            return results;
        })()
    """)
    
    # Analyze results
    if 'error' in results:
        pytest.skip(f"Test environment error: {results['error']}")
    
    total_objects = results['totalObjects']
    click_first_count = len(results['clickFirstObjects'])
    hover_working_count = len(results['hoverWorkingObjects'])
    
    print(f"\n📊 DETECTION RESULTS:")
    print(f"  Total objects tested: {total_objects}")
    print(f"  Objects with click-first bug: {click_first_count}")
    print(f"  Objects working correctly: {hover_working_count}")
    
    if click_first_count > 0:
        print(f"\n🐛 OBJECTS WITH CLICK-FIRST BUG:")
        for obj in results['clickFirstObjects']:
            discovery_status = "undiscovered" if obj['isUndiscovered'] else "discovered"
            print(f"  - {obj['id']} '{obj['name']}' ({obj['type']}) - {discovery_status}")
            print(f"    Has name: {obj['hasName']}, Tooltip shows: '{obj['tooltipText']}'")
        
        # Analyze patterns
        discovered_bugs = [obj for obj in results['clickFirstObjects'] if not obj['isUndiscovered']]
        undiscovered_bugs = [obj for obj in results['clickFirstObjects'] if obj['isUndiscovered']]
        
        print(f"\n🔍 BUG PATTERN ANALYSIS:")
        print(f"  - Discovered objects with bug: {len(discovered_bugs)}")
        print(f"  - Undiscovered objects with bug: {len(undiscovered_bugs)}")
        
        # Group by object type
        type_counts = {}
        for obj in results['clickFirstObjects']:
            obj_type = obj['type']
            type_counts[obj_type] = type_counts.get(obj_type, 0) + 1
        
        print(f"  - Object types affected: {type_counts}")
        
        # This confirms the bug exists
        print(f"\n🎯 CONFIRMED: Click-first tooltip bug affects {click_first_count} objects")
        
    else:
        print(f"\n🎉 NO CLICK-FIRST BUG DETECTED - All tooltips work correctly!")
    
    if hover_working_count > 0:
        print(f"\n✅ SAMPLE WORKING OBJECTS:")
        for obj in results['hoverWorkingObjects'][:3]:  # Show first 3
            discovery_status = "undiscovered" if obj['isUndiscovered'] else "discovered"
            print(f"  - {obj['id']} '{obj['name']}' ({obj['type']}) - {discovery_status} - Shows: '{obj['tooltipText']}'")
    
    # Store results in page for manual inspection if needed
    page.evaluate(f"window.clickFirstBugResults = {results}")
    
    # The test passes regardless - we're just detecting and reporting the bug
    print(f"\n✅ Bug detection complete. Results stored in window.clickFirstBugResults")


def test_simulate_click_fix(star_charts_page: Page):
    """Test if clicking on problematic objects fixes their tooltips."""
    page = star_charts_page

    print("\n🔧 Testing click-fix behavior...")

    # Check if real Star Charts is available (not fallback mock)
    has_real_star_charts = page.evaluate("""() => {
        return !!(window.navigationSystemManager?.starChartsUI?.getDiscoveredObjectsForRender &&
                  window.navigationSystemManager?.starChartsUI?.getTooltipText);
    }""")

    if not has_real_star_charts:
        pytest.skip("Real Star Charts not available - this diagnostic test requires full game initialization")

    # First run the detection to get problematic objects
    page.wait_for_timeout(1000)

    # Get objects with click-first bug
    problematic_objects = page.evaluate("""
        (() => {
            if (!window.navigationSystemManager?.starChartsUI) {
                return [];
            }
            
            const starChartsUI = window.navigationSystemManager.starChartsUI;
            const allObjects = starChartsUI.getDiscoveredObjectsForRender();
            
            // Find objects that have names but show "Unknown" tooltips
            const problematic = [];
            allObjects.forEach(obj => {
                const tooltipText = starChartsUI.getTooltipText(obj);
                if (obj.name && obj.name !== 'Unknown' && tooltipText === 'Unknown') {
                    problematic.push({
                        id: obj.id,
                        name: obj.name,
                        type: obj.type
                    });
                }
            });
            
            return problematic.slice(0, 3); // Test first 3 problematic objects
        })()
    """)
    
    if not problematic_objects:
        print("  No problematic objects found to test click-fix behavior")
        return
    
    print(f"  Found {len(problematic_objects)} problematic objects to test")
    
    for obj in problematic_objects:
        object_id = obj['id']
        object_name = obj['name']
        
        print(f"\n🧪 Testing click-fix for: {object_id} '{object_name}'")
        
        # Test the click-fix behavior
        click_fix_result = page.evaluate(f"""
            (() => {{
                const starChartsUI = window.navigationSystemManager?.starChartsUI;
                if (!starChartsUI) return {{ error: 'StarChartsUI not found' }};
                
                // Get the object
                const allObjects = starChartsUI.getDiscoveredObjectsForRender();
                const targetObj = allObjects.find(obj => obj.id === '{object_id}');
                if (!targetObj) return {{ error: 'Object not found' }};
                
                // Test 1: Get tooltip before click
                const tooltipBefore = starChartsUI.getTooltipText(targetObj);
                
                // Test 2: Simulate clicking the object (call selectObject)
                try {{
                    starChartsUI.selectObject(targetObj);
                }} catch (e) {{
                    console.log('Click simulation error:', e);
                }}
                
                // Test 3: Get tooltip after click
                const tooltipAfter = starChartsUI.getTooltipText(targetObj);
                
                return {{
                    objectId: '{object_id}',
                    objectName: '{object_name}',
                    tooltipBefore: tooltipBefore,
                    tooltipAfter: tooltipAfter,
                    clickFixed: tooltipBefore === 'Unknown' && tooltipAfter !== 'Unknown'
                }};
            }})()
        """)
        
        if 'error' in click_fix_result:
            print(f"    ❌ Error: {click_fix_result['error']}")
            continue
        
        tooltip_before = click_fix_result['tooltipBefore']
        tooltip_after = click_fix_result['tooltipAfter']
        click_fixed = click_fix_result['clickFixed']
        
        print(f"    Before click: '{tooltip_before}'")
        print(f"    After click:  '{tooltip_after}'")
        
        if click_fixed:
            print(f"    🎯 CONFIRMED: Click fixed the tooltip!")
        elif tooltip_before == tooltip_after:
            print(f"    ⚠️ No change after click")
        else:
            print(f"    ℹ️ Tooltip changed but not in expected way")
    
    print(f"\n✅ Click-fix testing complete")
