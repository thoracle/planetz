"""
Debug JavaScript errors that might be preventing game initialization.
"""
import pytest
from playwright.sync_api import Page, expect

class TestJSErrorsDebug:
    """Debug JavaScript errors in game initialization"""
    
    def test_capture_js_errors_during_init(self, page: Page, game_server):
        """Capture all JavaScript errors during game initialization"""
        
        # Collect JavaScript errors
        js_errors = []
        console_logs = []
        
        def handle_console(msg):
            console_logs.append(f"[{msg.type}] {msg.text}")
            if msg.type in ['error', 'warning']:
                print(f"🚨 Console {msg.type}: {msg.text}")
        
        def handle_page_error(error):
            js_errors.append(str(error))
            print(f"💥 JavaScript Error: {error}")
        
        page.on("console", handle_console)
        page.on("pageerror", handle_page_error)
        
        # Navigate to the game
        print("🌐 Navigating to game...")
        page.goto(game_server)
        
        # Wait for DOM to be ready
        page.wait_for_selector("#scene-container", timeout=30000, state="attached")
        print("✅ Scene container found")
        
        # Check what scripts are loaded
        scripts_info = page.evaluate("""() => {
            const scripts = Array.from(document.querySelectorAll('script[src]'));
            return scripts.map(script => ({
                src: script.src,
                loaded: script.readyState || 'unknown'
            }));
        }""")
        
        print(f"📜 Scripts loaded: {len(scripts_info)}")
        for script in scripts_info:
            print(f"  - {script['src']} ({script['loaded']})")
        
        # Wait longer and monitor what happens
        print("⏳ Waiting for initialization (monitoring errors)...")
        
        try:
            # Try to wait for ViewManager with detailed monitoring
            page.wait_for_function("""() => {
                // Log what we have so far
                if (!window.initDebugLogged) {
                    console.log('🔍 Init Debug - Current state:', {
                        gameInitialized: !!window.gameInitialized,
                        viewManager: !!window.viewManager,
                        starfieldManager: !!window.starfieldManager,
                        THREE: !!window.THREE,
                        documentReady: document.readyState
                    });
                    window.initDebugLogged = true;
                }
                
                return window.viewManager && window.gameInitialized === true;
            }""", timeout=20000)
            print("✅ ViewManager initialized successfully!")
            
        except Exception as e:
            print(f"❌ ViewManager initialization timeout: {e}")
            
            # Get detailed state after timeout
            final_state = page.evaluate("""() => {
                return {
                    gameInitialized: !!window.gameInitialized,
                    viewManager: !!window.viewManager,
                    starfieldManager: !!window.starfieldManager,
                    THREE: !!window.THREE,
                    documentReady: document.readyState,
                    windowKeys: Object.keys(window).filter(key => 
                        key.includes('Manager') || key.includes('manager') || 
                        key.includes('game') || key.includes('init')
                    ),
                    errors: window.onerror ? 'Error handler exists' : 'No error handler',
                    
                    // Check if DOMContentLoaded listeners exist
                    domListeners: (() => {
                        try {
                            return document._events ? Object.keys(document._events) : 'No _events property';
                        } catch (e) {
                            return 'Cannot access _events';
                        }
                    })()
                };
            }""")
            
            print(f"🔍 Final state after timeout: {final_state}")
        
        # Print summary of errors and logs
        print(f"\n📊 Summary:")
        print(f"  JavaScript Errors: {len(js_errors)}")
        print(f"  Console Messages: {len(console_logs)}")
        
        if js_errors:
            print("\n💥 JavaScript Errors:")
            for i, error in enumerate(js_errors, 1):
                print(f"  {i}. {error}")
        
        if console_logs:
            print(f"\n📝 Recent Console Messages (last 10):")
            for log in console_logs[-10:]:
                print(f"  {log}")
        
        # Check if we can manually trigger the initialization
        print("\n🔧 Attempting manual initialization analysis...")
        manual_analysis = page.evaluate("""() => {
            // Check if the DOMContentLoaded event listener was added
            const hasViewManagerClass = typeof ViewManager !== 'undefined';
            const hasStarfieldManagerClass = typeof StarfieldManager !== 'undefined';
            const hasSolarSystemManagerClass = typeof SolarSystemManager !== 'undefined';
            
            // Try to see if we can access the classes
            let classesAvailable = {};
            try {
                classesAvailable.ViewManager = typeof ViewManager;
            } catch (e) {
                classesAvailable.ViewManager = 'error: ' + e.message;
            }
            
            try {
                classesAvailable.StarfieldManager = typeof StarfieldManager;
            } catch (e) {
                classesAvailable.StarfieldManager = 'error: ' + e.message;
            }
            
            try {
                classesAvailable.SolarSystemManager = typeof SolarSystemManager;
            } catch (e) {
                classesAvailable.SolarSystemManager = 'error: ' + e.message;
            }
            
            return {
                classesAvailable: classesAvailable,
                documentReadyState: document.readyState,
                sceneContainer: !!document.getElementById('scene-container'),
                
                // Check if we can manually create ViewManager
                canCreateViewManager: (() => {
                    try {
                        if (typeof ViewManager !== 'undefined' && typeof THREE !== 'undefined') {
                            return 'Classes available';
                        } else {
                            return 'Missing classes: ' + 
                                (typeof ViewManager === 'undefined' ? 'ViewManager ' : '') +
                                (typeof THREE === 'undefined' ? 'THREE ' : '');
                        }
                    } catch (e) {
                        return 'Error: ' + e.message;
                    }
                })()
            };
        }""")
        
        print(f"🔧 Manual Analysis: {manual_analysis}")
        
        # The test helps us understand what's preventing initialization
        assert len(js_errors) >= 0, "Test completed - check output for initialization issues"

    def test_manual_game_initialization(self, page: Page, game_server):
        """Try to manually initialize the game step by step"""
        
        # Collect errors
        js_errors = []
        page.on("pageerror", lambda error: js_errors.append(str(error)))
        
        # Navigate and wait for basic loading
        page.goto(game_server)
        page.wait_for_selector("#scene-container", timeout=30000, state="attached")
        
        # Try manual initialization
        manual_init_result = page.evaluate("""() => {
            console.log('🔧 Starting manual initialization...');
            
            try {
                // Check prerequisites
                const prerequisites = {
                    THREE: typeof THREE !== 'undefined',
                    ViewManager: typeof ViewManager !== 'undefined',
                    StarfieldManager: typeof StarfieldManager !== 'undefined',
                    SolarSystemManager: typeof SolarSystemManager !== 'undefined',
                    sceneContainer: !!document.getElementById('scene-container')
                };
                
                console.log('Prerequisites:', prerequisites);
                
                if (!prerequisites.THREE || !prerequisites.ViewManager) {
                    return { error: 'Missing required classes', prerequisites };
                }
                
                // Try to manually create the scene and managers
                const scene = new THREE.Scene();
                const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
                
                // Create a minimal renderer
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                if (!context) {
                    return { error: 'WebGL not available' };
                }
                
                const renderer = new THREE.WebGLRenderer({ canvas: canvas });
                const controls = { enabled: false }; // Mock controls
                
                // Try to create ViewManager
                const viewManager = new ViewManager(scene, camera, controls);
                window.viewManager = viewManager;
                
                // Try to create StarfieldManager
                if (typeof StarfieldManager !== 'undefined') {
                    const starfieldManager = new StarfieldManager(scene, camera, viewManager, THREE);
                    viewManager.setStarfieldManager(starfieldManager);
                    window.starfieldManager = starfieldManager;
                }
                
                // Try to create SolarSystemManager
                if (typeof SolarSystemManager !== 'undefined') {
                    const solarSystemManager = new SolarSystemManager(scene, camera);
                    viewManager.setSolarSystemManager(solarSystemManager);
                    window.solarSystemManager = solarSystemManager;
                }
                
                // Set game as initialized
                window.gameInitialized = true;
                
                console.log('✅ Manual initialization completed');
                
                return {
                    success: true,
                    hasViewManager: !!window.viewManager,
                    hasStarfieldManager: !!window.starfieldManager,
                    hasSolarSystemManager: !!window.solarSystemManager,
                    hasNavigationSystemManager: !!window.navigationSystemManager
                };
                
            } catch (error) {
                console.error('❌ Manual initialization failed:', error);
                return { error: error.message, stack: error.stack };
            }
        }""")
        
        print(f"🔧 Manual Initialization Result: {manual_init_result}")
        
        if manual_init_result.get('success'):
            # Test if Star Charts works now
            star_charts_test = page.evaluate("""() => {
                try {
                    const nsm = window.navigationSystemManager;
                    return {
                        hasNavigationSystemManager: !!nsm,
                        hasStarChartsManager: !!nsm?.starChartsManager,
                        hasStarChartsUI: !!nsm?.starChartsUI,
                        canAccessStarCharts: !!nsm?.starChartsManager?.objectDatabase
                    };
                } catch (e) {
                    return { error: e.message };
                }
            }""")
            
            print(f"🌟 Star Charts Test After Manual Init: {star_charts_test}")
        
        print(f"💥 JavaScript Errors During Manual Init: {len(js_errors)}")
        for error in js_errors:
            print(f"  - {error}")
        
        # The test helps us understand manual initialization
        assert True, "Manual initialization test completed"
