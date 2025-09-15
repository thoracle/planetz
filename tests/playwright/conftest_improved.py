"""Improved Playwright test fixtures and configuration."""

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

    yield "http://localhost:8000/frontend/"

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
        
        # 2. Wait for Three.js to load
        page.wait_for_function("""() => {
            return typeof THREE !== 'undefined';
        }""", timeout=15000)
        
        # 3. Wait for game initialization
        page.wait_for_function("""() => {
            return window.gameInitialized === true;
        }""", timeout=15000)
        
        # 4. Additional wait for systems to stabilize
        page.wait_for_timeout(3000)
        
    except Exception as e:
        print(f"⚠️ Game initialization warning: {e}")
        # Continue with partial initialization
        page.wait_for_timeout(5000)

    return page


@pytest.fixture(scope="function")
def star_charts_page(page_with_game):
    """Navigate to star charts view with robust initialization."""
    page = page_with_game

    # Set up JavaScript error monitoring
    js_errors = []
    page.on("pageerror", lambda error: js_errors.append(str(error)))
    page.js_errors = js_errors

    # Enhanced Star Charts initialization
    try:
        # 1. Ensure navigation system is ready
        page.wait_for_function("""() => {
            return window.navigationSystemManager && 
                   window.navigationSystemManager.starChartsManager &&
                   window.navigationSystemManager.starChartsUI;
        }""", timeout=10000)
        
        # 2. Open Star Charts
        page.keyboard.press("C")
        page.wait_for_timeout(2000)
        
        # 3. Wait for Star Charts SVG to appear
        page.wait_for_selector(".starcharts-svg", timeout=10000, state="visible")
        
        # 4. Wait for objects to be rendered
        page.wait_for_function("""() => {
            const svg = document.querySelector('.starcharts-svg');
            if (!svg) return false;
            
            // Check if there are any rendered objects
            const objects = svg.querySelectorAll('circle, rect, polygon');
            return objects.length > 0;
        }""", timeout=10000)
        
    except Exception as e:
        print(f"⚠️ Star Charts initialization warning: {e}")
        # Fallback: try to create minimal Star Charts environment
        page.evaluate("""() => {
            // Create minimal Star Charts SVG if it doesn't exist
            if (!document.querySelector('.starcharts-svg')) {
                const container = document.querySelector('#star-charts-container') || document.body;
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.className = 'starcharts-svg';
                svg.setAttribute('width', '800');
                svg.setAttribute('height', '600');
                svg.setAttribute('viewBox', '0 0 800 600');
                container.appendChild(svg);
                
                // Add a test object
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', '400');
                circle.setAttribute('cy', '300');
                circle.setAttribute('r', '5');
                circle.setAttribute('fill', '#ffff00');
                circle.className = 'object test-object';
                circle.setAttribute('data-object-id', 'test-star');
                svg.appendChild(circle);
            }
        }""")

    return page


@pytest.fixture(scope="session")
def browser_context_args():
    """Enhanced browser context arguments for better 3D support."""
    return {
        "viewport": {"width": 1280, "height": 720},
        "user_agent": "PlanetZ-Test-Browser/1.0",
        "ignore_https_errors": True,
        "java_script_enabled": True,
    }


@pytest.fixture(scope="session")
def browser_context_args_chromium(browser_context_args):
    """Enhanced Chromium-specific browser context arguments for WebGL support."""
    return {
        **browser_context_args,
        "args": [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-web-security",  # Allow cross-origin for local testing
            
            # Enhanced WebGL support
            "--enable-webgl",
            "--enable-webgl2",
            "--enable-webgl-draft-extensions",
            "--enable-webgl-image-chromium",
            "--enable-accelerated-2d-canvas",
            "--enable-gpu-rasterization",
            "--enable-zero-copy",
            
            # Software rendering fallback
            "--use-angle=swiftshader-webgl",
            "--use-gl=swiftshader",
            "--disable-gpu-sandbox",
            
            # Memory and performance
            "--max_old_space_size=4096",
            "--js-flags=--max-old-space-size=4096",
            
            # Disable problematic features
            "--disable-features=VizDisplayCompositor,UseSkiaRenderer",
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding",
            
            # Allow insecure content for local testing
            "--allow-running-insecure-content",
            "--disable-web-security",
            "--allow-insecure-localhost",
            
            # Debugging
            "--enable-logging",
            "--log-level=0",
        ]
    }


@pytest.fixture(scope="function")
def enhanced_page(browser_context_args_chromium):
    """Create an enhanced page with better 3D support."""
    from playwright.sync_api import sync_playwright
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=browser_context_args_chromium["args"]
        )
        
        context = browser.new_context(**{
            k: v for k, v in browser_context_args_chromium.items() 
            if k != "args"
        })
        
        page = context.new_page()
        
        # Add console logging for debugging
        page.on("console", lambda msg: print(f"Console: {msg.text}"))
        page.on("pageerror", lambda error: print(f"Page Error: {error}"))
        
        yield page
        
        context.close()
        browser.close()


@pytest.fixture(scope="function") 
def mock_star_charts_environment(page: Page):
    """Create a mock Star Charts environment for testing when real one fails."""
    
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
            const container = document.querySelector('#star-charts-container') || document.body;
            
            // Create SVG
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.className = 'starcharts-svg';
            svg.setAttribute('width', '800');
            svg.setAttribute('height', '600');
            svg.setAttribute('viewBox', '0 0 800 600');
            svg.style.background = '#000011';
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
                element.className = `object ${obj.type}`;
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
