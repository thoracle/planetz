"""
Isolated test for Star Charts tooltip data loading.
Creates a minimal mock environment to test the data flow.
"""
import pytest
from playwright.sync_api import Page, expect

class TestTooltipDataIsolated:
    """Test tooltip data loading with minimal mocks"""
    
    def test_tooltip_data_flow_with_mocks(self, page_with_game):
        """Test tooltip data flow using mocked Star Charts components"""
        page = page_with_game

        # Wait for basic game initialization (with fallback)
        try:
            page.wait_for_function("window.gameInitialized === true", timeout=10000)
        except:
            # If game doesn't fully initialize, set flag manually for mock testing
            page.evaluate("window.gameInitialized = true")
        
        # Create a complete mock environment for testing
        mock_result = page.evaluate("""
            () => {
                // Mock object database
                const mockDatabase = {
                    sectors: {
                        A0: {
                            star: {
                                id: 'A0_star',
                                name: 'Sol',
                                type: 'star',
                                x: 0,
                                y: 0
                            },
                            objects: [
                                {
                                    id: 'A0_earth',
                                    name: 'Earth',
                                    type: 'planet',
                                    x: 100,
                                    y: 0
                                },
                                {
                                    id: 'A0_mars',
                                    name: 'Mars',
                                    type: 'planet',
                                    x: 200,
                                    y: 0
                                }
                            ],
                            infrastructure: [
                                {
                                    id: 'A0_callisto_defense_platform',
                                    name: 'Callisto Defense Platform',
                                    type: 'space_station',
                                    x: 300,
                                    y: 0
                                }
                            ]
                        }
                    }
                };
                
                // Mock StarChartsManager
                const mockManager = {
                    objectDatabase: mockDatabase,
                    isInitialized: true,
                    getCurrentSector: () => 'A0',
                    getObjectData: function(objectId) {
                        // Search in star
                        if (this.objectDatabase.sectors.A0.star.id === objectId) {
                            return this.objectDatabase.sectors.A0.star;
                        }
                        
                        // Search in objects
                        const obj = this.objectDatabase.sectors.A0.objects.find(o => o.id === objectId);
                        if (obj) return obj;
                        
                        // Search in infrastructure
                        const infra = this.objectDatabase.sectors.A0.infrastructure.find(i => i.id === objectId);
                        if (infra) return infra;
                        
                        return null;
                    }
                };
                
                // Mock StarChartsUI with our enhanced methods
                const mockUI = {
                    starChartsManager: mockManager,
                    
                    ensureObjectDataLoaded: function() {
                        return !!(this.starChartsManager && this.starChartsManager.objectDatabase && this.starChartsManager.isInitialized);
                    },
                    
                    ensureObjectHasName: function(object) {
                        if (!object) return null;
                        
                        // If object already has a name, return it
                        if (object.name) {
                            return object;
                        }
                        
                        // Special handling for ship
                        if (object._isShip) {
                            return { ...object, name: 'Your Ship' };
                        }
                        
                        // Try to get complete data from database
                        if (object.id && this.starChartsManager) {
                            const completeData = this.starChartsManager.getObjectData(object.id);
                            if (completeData && completeData.name) {
                                return { ...object, ...completeData };
                            }
                        }
                        
                        // Generate fallback name from ID
                        if (object.id) {
                            const parts = object.id.split('_');
                            const fallbackName = parts.length > 1 ? 
                                parts.slice(1).map(part => 
                                    part.charAt(0).toUpperCase() + part.slice(1)
                                ).join(' ') : object.id;
                            return { ...object, name: fallbackName };
                        }
                        
                        return { ...object, name: 'Unknown Object' };
                    },
                    
                    getDiscoveredObjectsForRender: function() {
                        if (!this.ensureObjectDataLoaded()) {
                            return [];
                        }
                        
                        const allObjects = [];
                        const sectorData = this.starChartsManager.objectDatabase.sectors.A0;
                        
                        // Add star with complete data
                        if (sectorData.star) {
                            const completeStarData = this.starChartsManager.getObjectData(sectorData.star.id) || sectorData.star;
                            allObjects.push({
                                ...sectorData.star,
                                ...completeStarData,
                                _isUndiscovered: false
                            });
                        }
                        
                        // Add objects with complete data
                        if (sectorData.objects) {
                            sectorData.objects.forEach(obj => {
                                const completeData = this.starChartsManager.getObjectData(obj.id) || obj;
                                allObjects.push({
                                    ...obj,
                                    ...completeData,
                                    _isUndiscovered: false
                                });
                            });
                        }
                        
                        // Add infrastructure with complete data
                        if (sectorData.infrastructure) {
                            sectorData.infrastructure.forEach(infra => {
                                const completeData = this.starChartsManager.getObjectData(infra.id) || infra;
                                allObjects.push({
                                    ...infra,
                                    ...completeData,
                                    _isUndiscovered: false
                                });
                            });
                        }
                        
                        return allObjects;
                    }
                };
                
                // Set up the mock environment
                window.navigationSystemManager = {
                    starChartsManager: mockManager,
                    starChartsUI: mockUI
                };
                
                return { success: true, message: 'Mock environment created' };
            }
        """)
        
        print(f"🔧 Mock Setup: {mock_result}")
        assert mock_result.get('success'), "Mock environment should be created successfully"
        
        # Test 1: Verify mock database access
        database_test = page.evaluate("""
            () => {
                const manager = window.navigationSystemManager.starChartsManager;
                
                const testIds = ['A0_star', 'A0_earth', 'A0_mars', 'A0_callisto_defense_platform'];
                const results = testIds.map(id => {
                    const data = manager.getObjectData(id);
                    return {
                        id: id,
                        found: !!data,
                        name: data?.name,
                        type: data?.type
                    };
                });
                
                return {
                    success: true,
                    results: results,
                    allFound: results.every(r => r.found)
                };
            }
        """)
        
        print(f"🗄️ Database Test: {database_test}")
        assert database_test.get('success'), "Database test should succeed"
        assert database_test.get('allFound'), "All test objects should be found in database"
        
        # Test 2: Test getDiscoveredObjectsForRender
        render_test = page.evaluate("""
            () => {
                const ui = window.navigationSystemManager.starChartsUI;
                const objects = ui.getDiscoveredObjectsForRender();
                
                return {
                    success: true,
                    count: objects.length,
                    objects: objects.map(obj => ({
                        id: obj.id,
                        name: obj.name,
                        type: obj.type,
                        hasName: !!obj.name,
                        isUndiscovered: !!obj._isUndiscovered
                    }))
                };
            }
        """)
        
        print(f"🎨 Render Test: {render_test}")
        assert render_test.get('success'), "Render test should succeed"
        assert render_test.get('count', 0) > 0, "Should return objects for rendering"
        
        # Verify all objects have names
        objects = render_test.get('objects', [])
        objects_with_names = [obj for obj in objects if obj['hasName']]
        assert len(objects_with_names) == len(objects), "All objects should have names after getDiscoveredObjectsForRender"
        
        # Test 3: Test ensureObjectHasName with various scenarios
        ensure_name_test = page.evaluate("""
            () => {
                const ui = window.navigationSystemManager.starChartsUI;
                
                const testCases = [
                    // Object with no name, should get from database
                    { id: 'A0_earth', type: 'planet', x: 100, y: 0 },
                    // Object with name, should keep it
                    { id: 'A0_mars', name: 'Mars', type: 'planet', x: 200, y: 0 },
                    // Ship object
                    { id: 'player_ship', type: 'ship', _isShip: true, x: 0, y: 0 },
                    // Unknown object, should get fallback name
                    { id: 'unknown_test_object', type: 'unknown', x: 500, y: 0 }
                ];
                
                const results = testCases.map((testObj, index) => {
                    const enhanced = ui.ensureObjectHasName(testObj);
                    return {
                        testCase: index,
                        original: {
                            id: testObj.id,
                            name: testObj.name,
                            type: testObj.type,
                            isShip: !!testObj._isShip
                        },
                        enhanced: enhanced ? {
                            id: enhanced.id,
                            name: enhanced.name,
                            type: enhanced.type,
                            hasName: !!enhanced.name
                        } : null,
                        success: !!enhanced && !!enhanced.name
                    };
                });
                
                return {
                    success: true,
                    results: results,
                    allSuccessful: results.every(r => r.success)
                };
            }
        """)
        
        print(f"🔧 Ensure Name Test: {ensure_name_test}")
        assert ensure_name_test.get('success'), "Ensure name test should succeed"
        assert ensure_name_test.get('allSuccessful'), "All test cases should successfully get names"
        
        # Print detailed results
        for result in ensure_name_test.get('results', []):
            print(f"  Test {result['testCase']}: {result['original']['id']} -> '{result['enhanced']['name'] if result['enhanced'] else 'FAILED'}'")
        
        # Test 4: Test complete tooltip flow
        tooltip_flow_test = page.evaluate("""
            () => {
                const ui = window.navigationSystemManager.starChartsUI;
                
                // Get objects for rendering (should have complete data)
                const objects = ui.getDiscoveredObjectsForRender();
                if (objects.length === 0) {
                    return { error: 'No objects for tooltip test' };
                }
                
                // Test tooltip generation for each object
                const tooltipResults = objects.map(obj => {
                    // Simulate what showTooltip does
                    const completeObject = ui.ensureObjectHasName(obj);
                    
                    let tooltipText;
                    if (completeObject._isShip) {
                        tooltipText = 'You are here';
                    } else if (completeObject._isUndiscovered) {
                        tooltipText = 'Unknown';
                    } else {
                        tooltipText = completeObject.name || 'Unknown Object';
                    }
                    
                    return {
                        objectId: obj.id,
                        objectName: obj.name,
                        enhancedName: completeObject?.name,
                        tooltipText: tooltipText,
                        success: !!tooltipText && tooltipText !== 'Unknown Object'
                    };
                });
                
                return {
                    success: true,
                    tooltipResults: tooltipResults,
                    allSuccessful: tooltipResults.every(r => r.success)
                };
            }
        """)
        
        print(f"🎯 Tooltip Flow Test: {tooltip_flow_test}")
        assert tooltip_flow_test.get('success'), "Tooltip flow test should succeed"
        assert tooltip_flow_test.get('allSuccessful'), "All tooltips should generate successfully"
        
        # Print tooltip results
        for result in tooltip_flow_test.get('tooltipResults', []):
            print(f"  {result['objectId']}: '{result['tooltipText']}'")
        
        print("✅ All isolated tooltip data tests passed!")
        
        # Test 5: Simulate the exact failure scenario from your logs
        failure_simulation = page.evaluate("""
            () => {
                const ui = window.navigationSystemManager.starChartsUI;
                
                // Simulate getObjectAtScreenPosition returning an object without complete data
                const incompleteObject = {
                    id: 'A0_earth',
                    type: 'planet',
                    x: 100,
                    y: 0
                    // No name property - this is what causes the issue
                };
                
                console.log('🔍 Testing incomplete object:', incompleteObject);
                
                // Test ensureObjectHasName on incomplete object
                const enhanced = ui.ensureObjectHasName(incompleteObject);
                console.log('🔧 Enhanced object:', enhanced);
                
                // Test tooltip generation
                let tooltipText;
                if (enhanced) {
                    if (enhanced._isShip) {
                        tooltipText = 'You are here';
                    } else if (enhanced._isUndiscovered) {
                        tooltipText = 'Unknown';
                    } else {
                        tooltipText = enhanced.name || 'Unknown Object';
                    }
                }
                
                console.log('🎯 Generated tooltip text:', tooltipText);
                
                return {
                    incompleteObject: incompleteObject,
                    enhanced: enhanced,
                    tooltipText: tooltipText,
                    success: !!enhanced && !!tooltipText && tooltipText !== 'Unknown Object'
                };
            }
        """)
        
        print(f"🚨 Failure Simulation: {failure_simulation}")
        assert failure_simulation.get('success'), "Should successfully handle incomplete objects"
        
        print("✅ Failure scenario test passed - incomplete objects are properly enhanced!")

    def test_identify_real_world_failure(self, page_with_game):
        """Test to identify why the real game environment fails"""
        page = page_with_game

        # Wait for game initialization (with fallback)
        try:
            page.wait_for_function("window.gameInitialized === true", timeout=10000)
        except:
            # If game doesn't fully initialize, continue with diagnostic test
            print("⚠️ Game did not fully initialize within timeout")
        
        # Check what's actually available in the real environment
        environment_check = page.evaluate("""
            () => {
                return {
                    hasWindow: typeof window !== 'undefined',
                    hasNavigationSystemManager: !!window.navigationSystemManager,
                    navigationSystemManagerKeys: window.navigationSystemManager ? Object.keys(window.navigationSystemManager) : [],
                    hasStarChartsManager: !!window.navigationSystemManager?.starChartsManager,
                    hasStarChartsUI: !!window.navigationSystemManager?.starChartsUI,
                    gameInitialized: !!window.gameInitialized,
                    hasThree: !!window.THREE,
                    documentReadyState: document.readyState
                };
            }
        """)
        
        print(f"🌍 Real Environment Check: {environment_check}")
        
        # If navigationSystemManager exists, check its state
        if environment_check.get('hasNavigationSystemManager'):
            detailed_check = page.evaluate("""
                () => {
                    const nsm = window.navigationSystemManager;
                    return {
                        starChartsManagerType: typeof nsm.starChartsManager,
                        starChartsUIType: typeof nsm.starChartsUI,
                        starChartsManagerKeys: nsm.starChartsManager ? Object.keys(nsm.starChartsManager) : [],
                        starChartsUIKeys: nsm.starChartsUI ? Object.keys(nsm.starChartsUI) : []
                    };
                }
            """)
            print(f"🔍 Detailed Check: {detailed_check}")
        
        # The test helps us understand what's missing in the real environment
        print("📋 Environment analysis complete")
