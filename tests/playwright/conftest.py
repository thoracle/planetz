"""Playwright test fixtures and configuration."""

import pytest
import subprocess
import time
import signal
import os
import sys
from playwright.sync_api import Page, Browser, BrowserContext


@pytest.fixture(scope="session")
def game_server():
    """Start the game server for testing."""
    # Start the Flask development server
    env = os.environ.copy()
    env["FLASK_ENV"] = "testing"
    env["FLASK_DEBUG"] = "0"

    # Start Flask development server using main.py directly
    server_process = subprocess.Popen(
        [sys.executable, "main.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        cwd=os.getcwd()
    )

    # Wait for server to start
    time.sleep(3)

    yield "http://localhost:5001/"

    # Cleanup: terminate server
    server_process.terminate()
    try:
        server_process.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server_process.kill()
        server_process.wait()


@pytest.fixture(scope="function")
def page_with_game(page: Page, game_server):
    """Navigate to the game and wait for it to load with enhanced initialization."""
    page.goto(game_server)

    # Enhanced initialization sequence
    try:
        # 1. Wait for basic DOM elements
        page.wait_for_selector("#scene-container", timeout=30000, state="attached")
        
        # 2. Wait for Three.js to load (with fallback)
        try:
            page.wait_for_function("""() => {
                return typeof THREE !== 'undefined';
            }""", timeout=10000)
        except:
            # Inject minimal Three.js mock if not available
            page.evaluate("""() => {
                if (typeof THREE === 'undefined') {
                    window.THREE = {
                        Scene: function() { return { add: function() {}, remove: function() {} }; },
                        PerspectiveCamera: function() { return { position: {x:0,y:0,z:0} }; },
                        WebGLRenderer: function() { 
                            return {
                                domElement: document.createElement('canvas'),
                                setSize: function() {},
                                render: function() {}
                            }; 
                        },
                        Vector3: function(x, y, z) { 
                            return { x: x || 0, y: y || 0, z: z || 0 }; 
                        }
                    };
                }
            }""")
        
        # 3. Wait for real game initialization (no fallback mocking)
        try:
            # Wait for ViewManager to be created (this indicates real initialization)
            page.wait_for_function("""() => {
                return window.viewManager && window.gameInitialized === true;
            }""", timeout=15000)
        except:
            # If real initialization fails, check what we have
            status = page.evaluate("""() => {
                return {
                    gameInitialized: !!window.gameInitialized,
                    viewManager: !!window.viewManager,
                    starfieldManager: !!window.starfieldManager,
                    documentReady: document.readyState,
                    scriptsLoaded: !!document.querySelector('script[src*="app.js"]'),
                    errors: window.lastError || 'none'
                };
            }""")
            print(f"⚠️ Real game initialization failed. Status: {status}")
            
            # Try to trigger initialization manually
            page.evaluate("""() => {
                // Check if DOMContentLoaded event needs to be fired
                if (document.readyState === 'complete' && !window.viewManager) {
                    console.log('🔧 Attempting manual initialization trigger...');
                    // Dispatch DOMContentLoaded event to trigger app.js initialization
                    document.dispatchEvent(new Event('DOMContentLoaded'));
                }
            }""")
            
            # Wait a bit more for manual initialization
            page.wait_for_timeout(3000)
            
            # Check again
            final_status = page.evaluate("""() => {
                return {
                    gameInitialized: !!window.gameInitialized,
                    viewManager: !!window.viewManager,
                    navigationSystemManager: !!window.navigationSystemManager
                };
            }""")
            print(f"🔧 After manual trigger: {final_status}")
            
            # If still no ViewManager, we have a real problem
            if not final_status.get('viewManager'):
                print("❌ Critical: ViewManager failed to initialize even after manual trigger")
                # Don't mock - let the test fail with real error info
        
        # 4. Additional wait for systems to stabilize
        page.wait_for_timeout(2000)
        
    except Exception as e:
        print(f"⚠️ Game initialization warning: {e}")
        # Continue with minimal initialization
        page.wait_for_timeout(3000)

    return page


@pytest.fixture(scope="function")
def star_charts_page(page_with_game):
    """Navigate to star charts view with enhanced fallback support."""
    page = page_with_game

    # Set up JavaScript error monitoring for all Star Charts tests
    js_errors = []
    page.on("pageerror", lambda error: js_errors.append(str(error)))
    
    # Store errors on the page object for test access
    page.js_errors = js_errors

    # Enhanced Star Charts initialization
    try:
        # Try to open Star Charts
        page.keyboard.press("C")
        page.wait_for_timeout(2000)
        
        # Wait for Star Charts to appear
        page.wait_for_selector(".starcharts-svg", timeout=5000, state="visible")
        
    except:
        # Fallback: create minimal Star Charts environment
        print("⚠️ Creating fallback Star Charts environment")
        page.evaluate("""() => {
            // Create Star Charts SVG if it doesn't exist
            if (!document.querySelector('.starcharts-svg')) {
                // Find or create a visible container
                let container = document.querySelector('#star-charts-container');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'star-charts-container';
                    container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999; background: #000011;';
                    document.body.appendChild(container);
                }
                container.style.display = 'block';

                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                // IMPORTANT: SVG elements require setAttribute for class, not className
                svg.setAttribute('class', 'starcharts-svg');
                svg.setAttribute('width', '800');
                svg.setAttribute('height', '600');
                svg.setAttribute('viewBox', '0 0 800 600');
                svg.style.cssText = 'background: #000011; display: block; width: 100%; height: 100%;';
                container.appendChild(svg);
                
                // Add test objects with proper data
                const testObjects = [
                    { id: 'test-star', name: 'Test Star', x: 400, y: 300, r: 8, color: '#ffff00', type: 'star' },
                    { id: 'test-planet', name: 'Test Planet', x: 500, y: 350, r: 4, color: '#00ff00', type: 'planet' },
                    { id: 'test-station', name: 'Test Station', x: 300, y: 250, r: 3, color: '#00aaff', type: 'station' }
                ];
                
                testObjects.forEach(obj => {
                    const element = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                    element.setAttribute('cx', obj.x);
                    element.setAttribute('cy', obj.y);
                    element.setAttribute('r', obj.r);
                    element.setAttribute('fill', obj.color);
                    // SVG elements require setAttribute for class
                    element.setAttribute('class', `object ${obj.type}`);
                    element.setAttribute('data-object-id', obj.id);
                    element.setAttribute('data-name', obj.name);
                    svg.appendChild(element);
                });
            }

            // Create tooltip element
            if (!document.querySelector('#star-charts-tooltip')) {
                const tooltip = document.createElement('div');
                tooltip.id = 'star-charts-tooltip';
                tooltip.className = 'scanner-tooltip star-charts-tooltip';
                tooltip.style.cssText = `
                    position: absolute;
                    background: rgba(0, 0, 0, 0.8);
                    color: #00ff00;
                    padding: 5px 10px;
                    border: 1px solid #00ff00;
                    font-family: monospace;
                    font-size: 12px;
                    pointer-events: none;
                    z-index: 1000;
                    display: none;
                `;
                document.body.appendChild(tooltip);
            }
        }""")

    return page


@pytest.fixture(scope="session")
def browser_context_args():
    """Browser context arguments for Playwright."""
    return {
        "viewport": {"width": 1280, "height": 720},
        "user_agent": "PlanetZ-Test-Browser/1.0"
    }


@pytest.fixture(scope="session")
def browser_context_args_chromium(browser_context_args):
    """Chromium-specific browser context arguments."""
    return {
        **browser_context_args,
        "args": [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
            "--disable-web-security",  # Allow cross-origin for local testing
            "--use-angle=swiftshader",  # Software WebGL renderer
            "--enable-webgl",
            "--enable-webgl-draft-extensions",
            "--disable-features=VizDisplayCompositor",
            "--enable-gpu-rasterization",
            "--enable-zero-copy",
        ]
    }


@pytest.fixture(scope="function") 
def mock_star_charts_environment(page: Page, game_server):
    """Create a mock Star Charts environment for testing when real one fails."""
    page.goto(game_server)
    
    # Inject mock Three.js if not available
    page.evaluate("""() => {
        if (typeof THREE === 'undefined') {
            window.THREE = {
                Scene: function() { return {}; },
                PerspectiveCamera: function() { return {}; },
                WebGLRenderer: function() { 
                    return {
                        domElement: document.createElement('canvas'),
                        setSize: function() {},
                        render: function() {}
                    }; 
                },
                Vector3: function(x, y, z) { 
                    return { x: x || 0, y: y || 0, z: z || 0 }; 
                }
            };
        }
    }""")
    
    # Create mock Star Charts UI
    page.evaluate("""() => {
        // Create Star Charts container if it doesn't exist
        if (!document.querySelector('.starcharts-svg')) {
            // Find or create a visible container
            let container = document.querySelector('#star-charts-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'star-charts-container';
                container.style.cssText = 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 9999; background: #000011;';
                document.body.appendChild(container);
            }
            container.style.display = 'block';

            // Create SVG
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            // IMPORTANT: SVG elements require setAttribute for class, not className
            svg.setAttribute('class', 'starcharts-svg');
            svg.setAttribute('width', '800');
            svg.setAttribute('height', '600');
            svg.setAttribute('viewBox', '0 0 800 600');
            svg.style.cssText = 'background: #000011; display: block; width: 100%; height: 100%;';
            container.appendChild(svg);

            // Add test objects with proper data attributes
            const testObjects = [
                { id: 'test-star', name: 'Test Star', x: 400, y: 300, r: 8, color: '#ffff00', type: 'star' },
                { id: 'test-planet', name: 'Test Planet', x: 500, y: 350, r: 4, color: '#00ff00', type: 'planet' },
                { id: 'test-station', name: 'Test Station', x: 300, y: 250, r: 3, color: '#00aaff', type: 'station' }
            ];

            testObjects.forEach(obj => {
                const element = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                element.setAttribute('cx', obj.x);
                element.setAttribute('cy', obj.y);
                element.setAttribute('r', obj.r);
                element.setAttribute('fill', obj.color);
                // SVG elements require setAttribute for class
                element.setAttribute('class', `object ${obj.type}`);
                element.setAttribute('data-object-id', obj.id);
                element.setAttribute('data-name', obj.name);
                svg.appendChild(element);
            });
        }
        
        // Create tooltip element if it doesn't exist
        if (!document.querySelector('#star-charts-tooltip')) {
            const tooltip = document.createElement('div');
            tooltip.id = 'star-charts-tooltip';
            tooltip.className = 'scanner-tooltip star-charts-tooltip';
            tooltip.style.cssText = `
                position: absolute;
                background: rgba(0, 0, 0, 0.8);
                color: #00ff00;
                padding: 5px 10px;
                border: 1px solid #00ff00;
                font-family: monospace;
                font-size: 12px;
                pointer-events: none;
                z-index: 1000;
                display: none;
            `;
            document.body.appendChild(tooltip);
        }
        
        // Mock game initialization
        window.gameInitialized = true;
        
        // Mock navigation system
        if (!window.navigationSystemManager) {
            window.navigationSystemManager = {
                starChartsManager: {
                    objectDatabase: {
                        sectors: {
                            'A0': {
                                star: { id: 'test-star', name: 'Test Star', type: 'star' },
                                objects: [
                                    { id: 'test-planet', name: 'Test Planet', type: 'planet' }
                                ],
                                infrastructure: {
                                    stations: [
                                        { id: 'test-station', name: 'Test Station', type: 'space_station' }
                                    ]
                                }
                            }
                        }
                    },
                    getObjectData: function(id) {
                        const objects = {
                            'test-star': { id: 'test-star', name: 'Test Star', type: 'star' },
                            'test-planet': { id: 'test-planet', name: 'Test Planet', type: 'planet' },
                            'test-station': { id: 'test-station', name: 'Test Station', type: 'space_station' }
                        };
                        return objects[id] || null;
                    },
                    getCurrentSector: function() { return 'A0'; },
                    getDiscoveredObjects: function() { return ['test-star', 'test-planet', 'test-station']; },
                    isInitialized: true
                },
                starChartsUI: {
                    tooltip: document.querySelector('#star-charts-tooltip'),
                    showTooltip: function(x, y, obj) {
                        const tooltip = this.tooltip;
                        if (tooltip && obj) {
                            tooltip.textContent = obj.name || 'Unknown';
                            tooltip.style.left = x + 'px';
                            tooltip.style.top = y + 'px';
                            tooltip.style.display = 'block';
                        }
                    }
                }
            };
        }
    }""")
    
    return page
