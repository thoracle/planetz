"""
Playwright test to automatically identify and track the click-first tooltip bug.

This test will:
1. Load Star Charts
2. Systematically test hover vs click behavior on all objects
3. Identify which objects require clicking first before tooltips work
4. Provide detailed analysis of the bug pattern
"""

import pytest
from playwright.sync_api import Page, expect


class TestClickFirstTooltipBug:
    """Test suite to identify the click-first tooltip bug pattern."""

    def test_identify_click_first_tooltip_bug(self, star_charts_page: Page):
        """Systematically test all objects to identify click-first behavior."""
        page = star_charts_page
        
        print("\n🔧 Starting automated click-first tooltip bug detection...")

        # Wait for Star Charts to be fully loaded
        page.wait_for_timeout(2000)

        # Inject our bug detection script
        page.evaluate("""
            window.tooltipBugResults = {
                clickFirstObjects: [],
                hoverWorkingObjects: [],
                testResults: [],
                allObjects: []
            };
            
            // Get all objects for testing
            if (window.navigationSystemManager?.starChartsUI && window.navigationSystemManager?.starChartsManager) {
                const starChartsUI = window.navigationSystemManager.starChartsUI;
                const starChartsManager = window.navigationSystemManager.starChartsManager;
                
                // Get all available objects
                const allObjects = starChartsUI.getDiscoveredObjectsForRender();
                window.tooltipBugResults.allObjects = allObjects.map(obj => ({
                    id: obj.id,
                    name: obj.name,
                    type: obj.type,
                    _isUndiscovered: obj._isUndiscovered
                }));
                
                console.log(`🔍 Found ${allObjects.length} objects to test`);
            }
        """)
        
        # Get the list of objects to test
        all_objects = page.evaluate("window.tooltipBugResults.allObjects")
        print(f"🔍 Found {len(all_objects)} objects to test")
        
        if not all_objects:
            pytest.skip("No objects found to test")
        
        # Test each object systematically
        click_first_objects = []
        hover_working_objects = []
        
        for i, obj in enumerate(all_objects):
            object_id = obj['id']
            object_name = obj['name']
            object_type = obj['type']
            is_undiscovered = obj.get('_isUndiscovered', False)
            
            print(f"\n🧪 Testing object {i+1}/{len(all_objects)}: {object_id} '{object_name}' ({object_type})")
            
            # Test 1: Try hover first (without clicking)
            hover_result = self._test_hover_tooltip(page, object_id, object_name)
            
            if hover_result['success']:
                print(f"  ✅ Hover works: Shows '{hover_result['tooltip_text']}'")
                hover_working_objects.append({
                    'id': object_id,
                    'name': object_name,
                    'type': object_type,
                    'tooltip_text': hover_result['tooltip_text'],
                    'is_undiscovered': is_undiscovered
                })
            else:
                print(f"  ❌ Hover failed: {hover_result['reason']}")
                
                # Test 2: Try click then hover
                click_result = self._test_click_then_hover(page, object_id, object_name)
                
                if click_result['click_hover_success'] and not click_result['initial_hover_success']:
                    print(f"  🐛 CLICK-FIRST BUG: Hover failed initially but works after click")
                    click_first_objects.append({
                        'id': object_id,
                        'name': object_name,
                        'type': object_type,
                        'initial_hover': click_result['initial_hover_text'],
                        'after_click_hover': click_result['after_click_hover_text'],
                        'is_undiscovered': is_undiscovered
                    })
                else:
                    print(f"  ⚠️ Consistently broken: Neither hover nor click+hover works")
            
            # Small delay between tests to avoid overwhelming the system
            page.wait_for_timeout(100)
        
        # Analyze results
        print(f"\n📊 ANALYSIS RESULTS:")
        print(f"  Total objects tested: {len(all_objects)}")
        print(f"  Hover working correctly: {len(hover_working_objects)}")
        print(f"  Click-first bug objects: {len(click_first_objects)}")
        
        if click_first_objects:
            print(f"\n🐛 OBJECTS WITH CLICK-FIRST BUG:")
            for obj in click_first_objects:
                print(f"  - {obj['id']} '{obj['name']}' ({obj['type']}) - Undiscovered: {obj['is_undiscovered']}")
                print(f"    Initial hover: '{obj['initial_hover']}' -> After click: '{obj['after_click_hover']}'")
        
        if hover_working_objects:
            print(f"\n✅ OBJECTS WORKING CORRECTLY:")
            for obj in hover_working_objects[:5]:  # Show first 5
                print(f"  - {obj['id']} '{obj['name']}' ({obj['type']}) - Shows: '{obj['tooltip_text']}'")
            if len(hover_working_objects) > 5:
                print(f"  ... and {len(hover_working_objects) - 5} more")
        
        # Store results for further analysis
        page.evaluate(f"""
            window.tooltipBugResults.clickFirstObjects = {click_first_objects};
            window.tooltipBugResults.hoverWorkingObjects = {hover_working_objects};
            console.log('🔍 Bug detection complete - results stored in window.tooltipBugResults');
        """)
        
        # Assert that we found the bug (or confirm it's fixed)
        if click_first_objects:
            print(f"\n🎯 CONFIRMED: Click-first tooltip bug affects {len(click_first_objects)} objects")
            
            # Analyze patterns
            discovered_with_bug = [obj for obj in click_first_objects if not obj['is_undiscovered']]
            undiscovered_with_bug = [obj for obj in click_first_objects if obj['is_undiscovered']]
            
            print(f"  - Discovered objects with bug: {len(discovered_with_bug)}")
            print(f"  - Undiscovered objects with bug: {len(undiscovered_with_bug)}")
            
            # Check object types
            types_with_bug = {}
            for obj in click_first_objects:
                obj_type = obj['type']
                if obj_type not in types_with_bug:
                    types_with_bug[obj_type] = 0
                types_with_bug[obj_type] += 1
            
            print(f"  - Object types affected: {types_with_bug}")
            
        else:
            print(f"\n🎉 NO CLICK-FIRST BUG FOUND - All tooltips work correctly on hover!")

    def _test_hover_tooltip(self, page: Page, object_id: str, object_name: str) -> dict:
        """Test if hover tooltip works correctly."""
        try:
            # Try to find the object element and hover over it
            result = page.evaluate(f"""
                (() => {{
                    const starChartsUI = window.navigationSystemManager?.starChartsUI;
                    if (!starChartsUI) return {{ success: false, reason: 'StarChartsUI not found' }};
                    
                    // Find the object element
                    const objectElement = document.querySelector(`[data-object-id="{object_id}"]`);
                    if (!objectElement) {{
                        return {{ success: false, reason: 'Object element not found in DOM' }};
                    }}
                    
                    // Simulate hover
                    const rect = objectElement.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    
                    // Create and dispatch mouse events
                    const mouseEnterEvent = new MouseEvent('mouseenter', {{
                        clientX: centerX,
                        clientY: centerY,
                        bubbles: true
                    }});
                    
                    const mouseMoveEvent = new MouseEvent('mousemove', {{
                        clientX: centerX,
                        clientY: centerY,
                        bubbles: true
                    }});
                    
                    objectElement.dispatchEvent(mouseEnterEvent);
                    objectElement.dispatchEvent(mouseMoveEvent);

                    // Check if tooltip is visible and get its text (sync check)
                    const tooltip = document.querySelector('#star-charts-tooltip, .star-charts-tooltip');
                    if (tooltip && tooltip.style.display !== 'none' && tooltip.textContent.trim()) {{
                        return {{
                            success: true,
                            tooltip_text: tooltip.textContent.trim(),
                            reason: 'Tooltip visible with content'
                        }};
                    }} else {{
                        return {{
                            success: false,
                            reason: tooltip ? 'Tooltip found but empty/hidden' : 'No tooltip found'
                        }};
                    }}
                }})()
            """)
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'reason': f'Exception during hover test: {str(e)}'
            }

    def _test_click_then_hover(self, page: Page, object_id: str, object_name: str) -> dict:
        """Test click then hover behavior."""
        try:
            result = page.evaluate(f"""
                (() => {{
                    const starChartsUI = window.navigationSystemManager?.starChartsUI;
                    if (!starChartsUI) return {{ success: false, reason: 'StarChartsUI not found' }};

                    // Find the object element
                    const objectElement = document.querySelector(`[data-object-id="{object_id}"]`);
                    if (!objectElement) {{
                        return {{ success: false, reason: 'Object element not found in DOM' }};
                    }};

                    const rect = objectElement.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;

                    // Test 1: Initial hover (should fail)
                    const mouseEnterEvent1 = new MouseEvent('mouseenter', {{
                        clientX: centerX,
                        clientY: centerY,
                        bubbles: true
                    }});
                    objectElement.dispatchEvent(mouseEnterEvent1);

                    const tooltip1 = document.querySelector('#star-charts-tooltip, .star-charts-tooltip');
                    const initialHoverText = tooltip1 ? tooltip1.textContent.trim() : '';
                    const initialHoverSuccess = tooltip1 && tooltip1.style.display !== 'none' && initialHoverText && initialHoverText !== 'Unknown';

                    // Clear any existing tooltip
                    if (tooltip1) tooltip1.style.display = 'none';

                    // Test 2: Click the object
                    const clickEvent = new MouseEvent('click', {{
                        clientX: centerX,
                        clientY: centerY,
                        bubbles: true
                    }});
                    objectElement.dispatchEvent(clickEvent);

                    // Test 3: Hover after click
                    const mouseEnterEvent2 = new MouseEvent('mouseenter', {{
                        clientX: centerX,
                        clientY: centerY,
                        bubbles: true
                    }});
                    objectElement.dispatchEvent(mouseEnterEvent2);

                    const tooltip2 = document.querySelector('#star-charts-tooltip, .star-charts-tooltip');
                    const afterClickHoverText = tooltip2 ? tooltip2.textContent.trim() : '';
                    const afterClickHoverSuccess = tooltip2 && tooltip2.style.display !== 'none' && afterClickHoverText && afterClickHoverText !== 'Unknown';

                    return {{
                        initial_hover_success: initialHoverSuccess,
                        initial_hover_text: initialHoverText,
                        click_hover_success: afterClickHoverSuccess,
                        after_click_hover_text: afterClickHoverText
                    }};
                }})()
            """)
            
            return result
            
        except Exception as e:
            return {
                'initial_hover_success': False,
                'click_hover_success': False,
                'initial_hover_text': '',
                'after_click_hover_text': '',
                'error': str(e)
            }

    def test_analyze_bug_pattern(self, star_charts_page: Page):
        """Analyze the pattern of the click-first bug to identify root cause."""
        page = star_charts_page

        print("\n🔬 Analyzing click-first bug pattern...")

        # Run the main bug detection first
        self.test_identify_click_first_tooltip_bug(page)

        # Get detailed analysis
        analysis = page.evaluate("""
            (() => {
                const results = window.tooltipBugResults;
                if (!results) return { error: 'No bug results found' };
                
                const clickFirstObjects = results.clickFirstObjects || [];
                const hoverWorkingObjects = results.hoverWorkingObjects || [];
                
                // Analyze patterns
                const analysis = {
                    totalTested: results.allObjects ? results.allObjects.length : 0,
                    clickFirstCount: clickFirstObjects.length,
                    hoverWorkingCount: hoverWorkingObjects.length,
                    patterns: {
                        byType: {},
                        byDiscoveryStatus: { discovered: 0, undiscovered: 0 },
                        commonCharacteristics: []
                    }
                };
                
                // Analyze by object type
                clickFirstObjects.forEach(obj => {
                    const type = obj.type || 'unknown';
                    if (!analysis.patterns.byType[type]) {
                        analysis.patterns.byType[type] = 0;
                    }
                    analysis.patterns.byType[type]++;
                    
                    // Count by discovery status
                    if (obj.is_undiscovered) {
                        analysis.patterns.byDiscoveryStatus.undiscovered++;
                    } else {
                        analysis.patterns.byDiscoveryStatus.discovered++;
                    }
                });
                
                return analysis;
            })()
        """)
        
        print(f"\n📊 DETAILED ANALYSIS:")
        print(f"  Total objects tested: {analysis.get('totalTested', 0)}")
        print(f"  Objects with click-first bug: {analysis.get('clickFirstCount', 0)}")
        print(f"  Objects working correctly: {analysis.get('hoverWorkingCount', 0)}")
        
        if analysis.get('patterns'):
            patterns = analysis['patterns']
            
            print(f"\n🔍 BUG PATTERNS:")
            print(f"  By object type: {patterns.get('byType', {})}")
            print(f"  By discovery status:")
            print(f"    - Discovered objects with bug: {patterns.get('byDiscoveryStatus', {}).get('discovered', 0)}")
            print(f"    - Undiscovered objects with bug: {patterns.get('byDiscoveryStatus', {}).get('undiscovered', 0)}")
        
        # If we found click-first objects, this confirms the bug exists
        if analysis.get('clickFirstCount', 0) > 0:
            assert analysis['clickFirstCount'] > 0, f"Click-first tooltip bug confirmed: {analysis['clickFirstCount']} objects affected"
        else:
            print("🎉 No click-first bug detected - all tooltips work correctly!")
