"""
Debug test to check the game initialization sequence.
"""
import pytest
from playwright.sync_api import Page, expect

class TestInitializationDebug:
    """Debug the game initialization sequence"""
    
    def test_initialization_sequence(self, page_with_game):
        """Check each step of the initialization sequence"""
        page = page_with_game
        
        # Wait for basic game initialization
        page.wait_for_function("window.gameInitialized === true", timeout=10000)
        
        # Check initialization sequence step by step
        init_check = page.evaluate("""
            () => {
                return {
                    step1_gameInitialized: !!window.gameInitialized,
                    step2_viewManager: !!window.viewManager,
                    step3_starfieldManager: !!window.starfieldManager,
                    step4_starfieldManagerReady: !!window.starfieldManagerReady,
                    step5_spatialManagerReady: !!window.spatialManagerReady,
                    step6_collisionManagerReady: !!window.collisionManagerReady,
                    step7_viewManagerHasStarfield: !!window.viewManager?.starfieldManager,
                    step8_viewManagerHasSolarSystem: !!window.viewManager?.solarSystemManager,
                    step9_navigationSystemManager: !!window.navigationSystemManager,
                    step10_viewManagerNavigation: !!window.viewManager?.navigationSystemManager,
                    
                    // Check if managers are ready according to ViewManager
                    managersReady: window.viewManager?.areManagersReady?.() || false,
                    
                    // Check ViewManager state
                    viewManagerState: window.viewManager ? {
                        hasStarfieldManager: !!window.viewManager.starfieldManager,
                        hasSolarSystemManager: !!window.viewManager.solarSystemManager,
                        hasNavigationSystemManager: !!window.viewManager.navigationSystemManager
                    } : null
                };
            }
        """)
        
        print(f"🔍 Initialization Check: {init_check}")
        
        # Analyze each step
        for key, value in init_check.items():
            status = "✅" if value else "❌"
            print(f"  {status} {key}: {value}")
        
        # If navigation system manager is missing, check why
        if not init_check.get('step9_navigationSystemManager'):
            debug_missing = page.evaluate("""
                () => {
                    const vm = window.viewManager;
                    if (!vm) return { error: 'No ViewManager' };
                    
                    return {
                        hasStarfieldManager: !!vm.starfieldManager,
                        hasSolarSystemManager: !!vm.solarSystemManager,
                        hasNavigationSystemManager: !!vm.navigationSystemManager,
                        areManagersReady: vm.areManagersReady ? vm.areManagersReady() : 'method missing',
                        
                        // Check if initializeNavigationSystemIfReady was called
                        canCallInit: typeof vm.initializeNavigationSystemIfReady === 'function',
                        
                        // Try to manually call the initialization
                        manualInitResult: (() => {
                            try {
                                if (vm.initializeNavigationSystemIfReady) {
                                    vm.initializeNavigationSystemIfReady();
                                    return {
                                        success: true,
                                        hasNavigationAfter: !!vm.navigationSystemManager,
                                        windowHasNavigationAfter: !!window.navigationSystemManager
                                    };
                                }
                                return { error: 'initializeNavigationSystemIfReady method not found' };
                            } catch (e) {
                                return { error: e.message };
                            }
                        })()
                    };
                }
            """)
            
            print(f"🔧 Debug Missing Navigation: {debug_missing}")
            
            # If manual initialization worked, check what we have now
            if debug_missing.get('manualInitResult', {}).get('success'):
                post_init_check = page.evaluate("""
                    () => {
                        return {
                            windowNavigationSystemManager: !!window.navigationSystemManager,
                            hasStarChartsManager: !!window.navigationSystemManager?.starChartsManager,
                            hasStarChartsUI: !!window.navigationSystemManager?.starChartsUI,
                            starChartsManagerMethods: window.navigationSystemManager?.starChartsManager ? 
                                Object.getOwnPropertyNames(window.navigationSystemManager.starChartsManager).filter(name => 
                                    typeof window.navigationSystemManager.starChartsManager[name] === 'function'
                                ).slice(0, 10) : []
                        };
                    }
                """)
                
                print(f"✅ Post Manual Init: {post_init_check}")
        
        # The test helps us understand where initialization is failing
        print("📋 Initialization analysis complete")

    def test_manual_star_charts_initialization(self, page_with_game):
        """Try to manually initialize Star Charts if it's missing"""
        page = page_with_game
        
        # Wait for basic game initialization
        page.wait_for_function("window.gameInitialized === true", timeout=10000)
        
        # Try manual initialization
        manual_init = page.evaluate("""
            () => {
                // Check current state
                const currentState = {
                    hasNavigationSystemManager: !!window.navigationSystemManager,
                    hasViewManager: !!window.viewManager,
                    viewManagerHasNavigation: !!window.viewManager?.navigationSystemManager
                };
                
                // If navigation system is missing, try to create it manually
                if (!window.navigationSystemManager && window.viewManager) {
                    try {
                        const vm = window.viewManager;
                        
                        // Check if we have the required managers
                        if (vm.starfieldManager && vm.solarSystemManager) {
                            // Try to manually call the initialization
                            vm.initializeNavigationSystemIfReady();
                            
                            return {
                                currentState: currentState,
                                manualInitAttempted: true,
                                success: !!window.navigationSystemManager,
                                postInitState: {
                                    hasNavigationSystemManager: !!window.navigationSystemManager,
                                    hasStarChartsManager: !!window.navigationSystemManager?.starChartsManager,
                                    hasStarChartsUI: !!window.navigationSystemManager?.starChartsUI
                                }
                            };
                        } else {
                            return {
                                currentState: currentState,
                                error: 'Missing required managers',
                                hasStarfieldManager: !!vm.starfieldManager,
                                hasSolarSystemManager: !!vm.solarSystemManager
                            };
                        }
                    } catch (e) {
                        return {
                            currentState: currentState,
                            error: e.message
                        };
                    }
                }
                
                return {
                    currentState: currentState,
                    alreadyInitialized: true
                };
            }
        """)
        
        print(f"🔧 Manual Init Result: {manual_init}")
        
        # If we successfully initialized, test Star Charts functionality
        if manual_init.get('success') or manual_init.get('alreadyInitialized'):
            # Test opening Star Charts
            star_charts_test = page.evaluate("""
                () => {
                    // Try to open Star Charts
                    const nsm = window.navigationSystemManager;
                    if (!nsm) return { error: 'No NavigationSystemManager' };
                    
                    try {
                        // Simulate pressing 'C' to open Star Charts
                        if (nsm.starChartsManager && nsm.starChartsUI) {
                            // Check if Star Charts can be opened
                            return {
                                success: true,
                                hasStarChartsManager: !!nsm.starChartsManager,
                                hasStarChartsUI: !!nsm.starChartsUI,
                                starChartsManagerType: typeof nsm.starChartsManager,
                                starChartsUIType: typeof nsm.starChartsUI,
                                
                                // Test database access
                                databaseTest: (() => {
                                    try {
                                        const hasDatabase = !!nsm.starChartsManager.objectDatabase;
                                        const isInitialized = !!nsm.starChartsManager.isInitialized;
                                        return { hasDatabase, isInitialized };
                                    } catch (e) {
                                        return { error: e.message };
                                    }
                                })()
                            };
                        } else {
                            return { error: 'Star Charts components not available' };
                        }
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            """)
            
            print(f"🌟 Star Charts Test: {star_charts_test}")
            
            if star_charts_test.get('success'):
                print("✅ Star Charts is available and functional!")
            else:
                print(f"❌ Star Charts test failed: {star_charts_test.get('error')}")
        
        print("📋 Manual initialization test complete")
