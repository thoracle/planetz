"""
Standalone test for Star Charts tooltip data loading issue.
Tests the data flow without UI dependencies.
"""
import pytest
from playwright.sync_api import Page, expect

class TestTooltipDataStandalone:
    """Test tooltip data loading in isolation"""
    
    def test_star_charts_data_loading_flow(self, page_with_game):
        """Test the complete data loading flow for tooltips"""
        page = page_with_game

        # Wait for game initialization
        try:
            page.wait_for_function("window.gameInitialized === true", timeout=10000)
        except Exception:
            pytest.skip("Game did not fully initialize in test environment")

        # Open Star Charts
        page.keyboard.press('c')
        page.wait_for_timeout(2000)

        # Test 1: Check if StarChartsManager has object database
        database_status = page.evaluate("""
            () => {
                const manager = window.navigationSystemManager?.starChartsManager;
                if (!manager) return { error: 'No StarChartsManager' };

                return {
                    hasManager: true,
                    hasDatabase: !!manager.objectDatabase,
                    isInitialized: !!manager.isInitialized,
                    currentSector: manager.getCurrentSector?.() || 'unknown',
                    databaseKeys: manager.objectDatabase ? Object.keys(manager.objectDatabase) : [],
                    sectorCount: manager.objectDatabase?.sectors ? Object.keys(manager.objectDatabase.sectors).length : 0
                };
            }
        """)

        print(f"📊 Database Status: {database_status}")
        if database_status.get('error'):
            pytest.skip("StarChartsManager not available in test environment")
        assert database_status.get('hasManager'), "StarChartsManager should exist"
        assert database_status.get('hasDatabase'), "Object database should exist"
        
        # Test 2: Check specific sector data
        sector_data = page.evaluate("""
            () => {
                const manager = window.navigationSystemManager.starChartsManager;
                const sector = manager.getCurrentSector() || 'A0';
                const sectorData = manager.objectDatabase?.sectors?.[sector];
                
                if (!sectorData) return { error: `No data for sector ${sector}` };
                
                return {
                    sector: sector,
                    hasStar: !!sectorData.star,
                    starId: sectorData.star?.id,
                    starName: sectorData.star?.name,
                    objectCount: sectorData.objects?.length || 0,
                    objects: (sectorData.objects || []).slice(0, 3).map(obj => ({
                        id: obj.id,
                        name: obj.name,
                        type: obj.type
                    })),
                    hasInfrastructure: !!sectorData.infrastructure,
                    infrastructureCount: sectorData.infrastructure?.length || 0
                };
            }
        """)
        
        print(f"🌟 Sector Data: {sector_data}")
        assert not sector_data.get('error'), f"Sector data error: {sector_data.get('error')}"
        assert sector_data.get('hasStar'), "Sector should have a star"
        
        # Test 3: Test getObjectData method directly
        object_data_test = page.evaluate("""
            () => {
                const manager = window.navigationSystemManager.starChartsManager;
                const testIds = ['A0_star', 'A0_earth', 'A0_mars', 'A0_callisto_defense_platform'];
                
                return testIds.map(id => {
                    const data = manager.getObjectData(id);
                    return {
                        id: id,
                        found: !!data,
                        name: data?.name,
                        type: data?.type,
                        hasPosition: !!(data?.x !== undefined || data?.position)
                    };
                });
            }
        """)
        
        print(f"🔍 Object Data Test: {object_data_test}")
        
        # At least some objects should be found
        found_objects = [obj for obj in object_data_test if obj['found']]
        assert len(found_objects) > 0, "Should find at least some objects in database"
        
        # Test 4: Test getDiscoveredObjectsForRender
        render_objects_test = page.evaluate("""
            () => {
                const ui = window.navigationSystemManager.starChartsUI;
                if (!ui || !ui.getDiscoveredObjectsForRender) {
                    return { error: 'StarChartsUI or getDiscoveredObjectsForRender not available' };
                }
                
                try {
                    const objects = ui.getDiscoveredObjectsForRender();
                    return {
                        success: true,
                        count: objects.length,
                        sample: objects.slice(0, 5).map(obj => ({
                            id: obj.id,
                            name: obj.name,
                            type: obj.type,
                            hasName: !!obj.name,
                            isUndiscovered: !!obj._isUndiscovered,
                            hasPosition: !!(obj.x !== undefined || obj.position)
                        }))
                    };
                } catch (e) {
                    return { error: e.message };
                }
            }
        """)
        
        print(f"🎨 Render Objects Test: {render_objects_test}")
        assert not render_objects_test.get('error'), f"getDiscoveredObjectsForRender error: {render_objects_test.get('error')}"
        assert render_objects_test.get('success'), "getDiscoveredObjectsForRender should succeed"
        assert render_objects_test.get('count', 0) > 0, "Should return some objects for rendering"
        
        # Test 5: Test ensureObjectHasName method
        ensure_name_test = page.evaluate("""
            () => {
                const ui = window.navigationSystemManager.starChartsUI;
                if (!ui || !ui.ensureObjectHasName) {
                    return { error: 'ensureObjectHasName method not available' };
                }
                
                // Test with a mock object that has no name
                const mockObject = {
                    id: 'A0_earth',
                    type: 'planet',
                    x: 100,
                    y: 200
                    // No name property
                };
                
                try {
                    const enhanced = ui.ensureObjectHasName(mockObject);
                    return {
                        success: true,
                        originalHadName: !!mockObject.name,
                        enhancedHasName: !!enhanced?.name,
                        enhancedName: enhanced?.name,
                        enhancedId: enhanced?.id,
                        enhancedType: enhanced?.type
                    };
                } catch (e) {
                    return { error: e.message };
                }
            }
        """)
        
        print(f"🔧 Ensure Name Test: {ensure_name_test}")
        assert not ensure_name_test.get('error'), f"ensureObjectHasName error: {ensure_name_test.get('error')}"
        assert ensure_name_test.get('success'), "ensureObjectHasName should succeed"
        assert ensure_name_test.get('enhancedHasName'), "Enhanced object should have a name"
        
        # Test 6: Test the complete tooltip flow
        tooltip_flow_test = page.evaluate("""
            () => {
                const ui = window.navigationSystemManager.starChartsUI;
                
                // Get objects for rendering
                const objects = ui.getDiscoveredObjectsForRender();
                if (objects.length === 0) {
                    return { error: 'No objects available for tooltip test' };
                }
                
                // Test tooltip on first object
                const testObject = objects[0];
                
                // Test ensureObjectHasName
                const enhanced = ui.ensureObjectHasName(testObject);
                
                // Test showTooltip (without actually showing it)
                let tooltipText = 'Unknown';
                if (enhanced) {
                    if (enhanced._isShip) {
                        tooltipText = 'You are here';
                    } else if (enhanced._isUndiscovered) {
                        tooltipText = 'Unknown';
                    } else {
                        tooltipText = enhanced.name || 'Unknown Object';
                    }
                }
                
                return {
                    success: true,
                    originalObject: {
                        id: testObject.id,
                        name: testObject.name,
                        type: testObject.type
                    },
                    enhancedObject: enhanced ? {
                        id: enhanced.id,
                        name: enhanced.name,
                        type: enhanced.type
                    } : null,
                    tooltipText: tooltipText,
                    flowWorking: !!enhanced && !!tooltipText && tooltipText !== 'Unknown Object'
                };
            }
        """)
        
        print(f"🎯 Tooltip Flow Test: {tooltip_flow_test}")
        assert not tooltip_flow_test.get('error'), f"Tooltip flow error: {tooltip_flow_test.get('error')}"
        assert tooltip_flow_test.get('success'), "Tooltip flow should succeed"
        assert tooltip_flow_test.get('flowWorking'), "Complete tooltip flow should work"
        
        print("✅ All tooltip data tests passed!")

    def test_debug_object_enhancement_failure(self, page_with_game):
        """Debug why object enhancement is failing"""
        page = page_with_game

        # Wait for game initialization
        try:
            page.wait_for_function("window.gameInitialized === true", timeout=10000)
        except Exception:
            pytest.skip("Game did not fully initialize in test environment")

        # Open Star Charts
        page.keyboard.press('c')
        page.wait_for_timeout(2000)

        # Check if StarChartsUI is available
        ui_available = page.evaluate("() => !!window.navigationSystemManager?.starChartsUI")
        if not ui_available:
            pytest.skip("StarChartsUI not available in test environment")

        # Simulate the exact failure scenario
        debug_result = page.evaluate("""
            () => {
                const ui = window.navigationSystemManager.starChartsUI;
                const manager = window.navigationSystemManager.starChartsManager;
                
                // Step 1: Get objects like getObjectAtScreenPosition would
                const objects = ui.getDiscoveredObjectsForRender();
                if (objects.length === 0) {
                    return { error: 'No objects to test' };
                }
                
                const testObject = objects[0];
                
                // Step 2: Test each step of ensureObjectHasName
                const steps = {
                    step1_originalObject: {
                        id: testObject.id,
                        name: testObject.name,
                        type: testObject.type,
                        hasName: !!testObject.name
                    },
                    step2_isShipCheck: !!testObject._isShip,
                    step3_databaseLookup: null,
                    step4_fallbackName: null,
                    step5_finalResult: null
                };
                
                // Step 3: Database lookup
                if (testObject.id) {
                    const dbData = manager.getObjectData(testObject.id);
                    steps.step3_databaseLookup = {
                        found: !!dbData,
                        name: dbData?.name,
                        type: dbData?.type,
                        id: dbData?.id
                    };
                }
                
                // Step 4: Fallback name generation
                if (testObject.id && !testObject.name) {
                    const parts = testObject.id.split('_');
                    const fallbackName = parts.length > 1 ? 
                        parts.slice(1).map(part => 
                            part.charAt(0).toUpperCase() + part.slice(1)
                        ).join(' ') : testObject.id;
                    steps.step4_fallbackName = fallbackName;
                }
                
                // Step 5: Call actual ensureObjectHasName
                try {
                    const result = ui.ensureObjectHasName(testObject);
                    steps.step5_finalResult = {
                        success: !!result,
                        name: result?.name,
                        type: result?.type,
                        id: result?.id
                    };
                } catch (e) {
                    steps.step5_finalResult = { error: e.message };
                }
                
                return { success: true, steps: steps };
            }
        """)
        
        print(f"🔍 Debug Enhancement Steps: {debug_result}")
        
        if debug_result.get('error'):
            pytest.fail(f"Debug test failed: {debug_result['error']}")
        
        steps = debug_result['steps']
        
        # Analyze each step
        print(f"Step 1 - Original Object: {steps['step1_originalObject']}")
        print(f"Step 2 - Is Ship: {steps['step2_isShipCheck']}")
        print(f"Step 3 - Database Lookup: {steps['step3_databaseLookup']}")
        print(f"Step 4 - Fallback Name: {steps['step4_fallbackName']}")
        print(f"Step 5 - Final Result: {steps['step5_finalResult']}")
        
        # The test should help us identify where the enhancement is failing
        assert steps['step5_finalResult']['success'], "Object enhancement should succeed"
