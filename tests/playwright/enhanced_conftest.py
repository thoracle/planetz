"""Enhanced Playwright test fixtures for comprehensive game testing."""

import pytest
import subprocess
import time
import signal
import os
import sys
import json
from pathlib import Path
from playwright.sync_api import Page, Browser, BrowserContext


@pytest.fixture(scope="session")
def game_server_with_test_data():
    """Start the game server with controlled test data for consistent testing."""
    # Start the Flask development server with test configuration
    env = os.environ.copy()
    env["FLASK_ENV"] = "testing"
    env["FLASK_DEBUG"] = "0"
    env["PLANETZ_TEST_MODE"] = "1"  # Enable test mode
    env["PLANETZ_TEST_DATA"] = "1"  # Use test data sets

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
def isolated_ship_environment(page: Page, game_server_with_test_data):
    """Create isolated ship testing environment with minimal dependencies."""
    page.goto(game_server_with_test_data)
    
    # Wait for basic game initialization
    page.wait_for_selector("#scene-container", timeout=30000, state="attached")
    
    # Enable ship testing mode - this disables AI, missions, etc.
    page.evaluate("""() => {
        window.testMode = {
            shipTesting: true,
            disableAI: true,
            disableMissions: true,
            disablePhysics: false,
            enableDebugLogging: true
        };
    }""")
    
    # Wait for ship systems to initialize
    page.wait_for_function("() => window.gameInitialized === true", timeout=10000)
    
    return page


@pytest.fixture(scope="function")
def ai_testing_environment(page: Page, game_server_with_test_data):
    """Create controlled AI testing environment."""
    page.goto(game_server_with_test_data)
    
    # Wait for game initialization
    page.wait_for_selector("#scene-container", timeout=30000, state="attached")
    
    # Enable AI testing mode
    page.evaluate("""() => {
        window.testMode = {
            aiTesting: true,
            enableAI: true,
            disableMissions: true,
            controlledEnemies: true,
            predictableAI: true,
            enableDebugLogging: true
        };
    }""")
    
    page.wait_for_function("() => window.gameInitialized === true", timeout=10000)
    
    return page


@pytest.fixture(scope="function")
def mission_testing_environment(page: Page, game_server_with_test_data):
    """Create mission system testing environment."""
    page.goto(game_server_with_test_data)
    
    # Wait for game initialization
    page.wait_for_selector("#scene-container", timeout=30000, state="attached")
    
    # Enable mission testing mode
    page.evaluate("""() => {
        window.testMode = {
            missionTesting: true,
            enableMissions: true,
            disableAI: true,
            testMissionData: true,
            enableDebugLogging: true
        };
    }""")
    
    page.wait_for_function("() => window.gameInitialized === true", timeout=10000)
    
    return page


@pytest.fixture(scope="function")
def physics_testing_environment(page: Page, game_server_with_test_data):
    """Create physics and collision testing environment."""
    page.goto(game_server_with_test_data)
    
    # Wait for game initialization
    page.wait_for_selector("#scene-container", timeout=30000, state="attached")
    
    # Enable physics testing mode
    page.evaluate("""() => {
        window.testMode = {
            physicsTesting: true,
            enablePhysics: true,
            disableAI: true,
            disableMissions: true,
            enableCollisionDebug: true,
            enableDebugLogging: true
        };
    }""")
    
    page.wait_for_function("() => window.gameInitialized === true", timeout=10000)
    
    return page


@pytest.fixture(scope="function")
def ui_testing_environment(page: Page, game_server_with_test_data):
    """Create UI component testing environment."""
    page.goto(game_server_with_test_data)
    
    # Wait for game initialization
    page.wait_for_selector("#scene-container", timeout=30000, state="attached")
    
    # Enable UI testing mode
    page.evaluate("""() => {
        window.testMode = {
            uiTesting: true,
            disableAI: true,
            disableMissions: true,
            disablePhysics: true,
            enableUIDebug: true,
            enableDebugLogging: true
        };
    }""")
    
    page.wait_for_function("() => window.gameInitialized === true", timeout=10000)
    
    return page


@pytest.fixture(scope="function")
def debug_helper():
    """Helper for enabling and managing debug channels during tests."""
    class DebugHelper:
        def __init__(self):
            self.enabled_channels = []
        
        def enable_debug_channel(self, page: Page, channel: str):
            """Enable a specific debug channel for testing."""
            page.evaluate(f"debugEnable('{channel}')")
            self.enabled_channels.append(channel)
        
        def disable_debug_channel(self, page: Page, channel: str):
            """Disable a specific debug channel."""
            page.evaluate(f"debugDisable('{channel}')")
            if channel in self.enabled_channels:
                self.enabled_channels.remove(channel)
        
        def get_debug_messages(self, page: Page, channel: str):
            """Get debug messages for a specific channel."""
            return page.evaluate(f"""() => {{
                return window.debugMessages ? window.debugMessages['{channel}'] || [] : [];
            }}""")
        
        def clear_debug_messages(self, page: Page):
            """Clear all debug messages."""
            page.evaluate("() => { window.debugMessages = {}; }")
        
        def cleanup(self, page: Page):
            """Clean up debug channels after test."""
            for channel in self.enabled_channels:
                self.disable_debug_channel(page, channel)
            self.clear_debug_messages(page)
    
    return DebugHelper()


@pytest.fixture(scope="function")
def game_state_validator():
    """Validator for checking game state consistency during tests."""
    class GameStateValidator:
        def validate_ship_integrity(self, page: Page):
            """Ensure ship systems are in expected state."""
            ship_state = page.evaluate("""() => {
                if (!window.viewManager || !window.viewManager.getShip) {
                    return { error: 'ViewManager or ship not available' };
                }
                
                const ship = window.viewManager.getShip();
                if (!ship) {
                    return { error: 'Ship not initialized' };
                }
                
                return {
                    energy: ship.currentEnergy,
                    maxEnergy: ship.maxEnergy,
                    systemCount: ship.systems ? ship.systems.size : 0,
                    shipType: ship.shipType,
                    status: ship.getStatus ? ship.getStatus() : 'unknown'
                };
            }""")
            
            assert 'error' not in ship_state, f"Ship integrity check failed: {ship_state.get('error')}"
            assert ship_state['energy'] is not None, "Ship energy not initialized"
            assert ship_state['maxEnergy'] > 0, "Ship max energy invalid"
            return ship_state
        
        def validate_mission_consistency(self, page: Page):
            """Ensure mission state matches expectations."""
            mission_state = page.evaluate("""() => {
                if (!window.missionEventService) {
                    return { error: 'Mission system not available' };
                }
                
                return {
                    activeMissions: window.missionEventService.activeMissions || [],
                    completedMissions: window.missionEventService.completedMissions || [],
                    availableMissions: window.missionEventService.availableMissions || []
                };
            }""")
            
            assert 'error' not in mission_state, f"Mission consistency check failed: {mission_state.get('error')}"
            return mission_state
        
        def validate_economy_state(self, page: Page):
            """Ensure credit and cargo state is correct."""
            economy_state = page.evaluate("""() => {
                const credits = window.PlayerCredits ? window.PlayerCredits.getCredits() : null;
                const cargo = window.cargoManager ? window.cargoManager.getCurrentCargo() : null;
                
                return {
                    credits: credits,
                    cargo: cargo,
                    hasPlayerCredits: !!window.PlayerCredits,
                    hasCargoManager: !!window.cargoManager
                };
            }""")
            
            assert economy_state['hasPlayerCredits'], "PlayerCredits system not available"
            assert economy_state['credits'] is not None, "Credits not initialized"
            return economy_state
        
        def validate_ai_state(self, page: Page):
            """Ensure AI systems are in expected state."""
            ai_state = page.evaluate("""() => {
                return {
                    hasEnemyAIManager: !!window.enemyAIManager,
                    hasFlockingManager: !!window.flockingManager,
                    enemyCount: window.enemyAIManager ? window.enemyAIManager.getEnemyCount() : 0,
                    aiEnabled: window.testMode ? !window.testMode.disableAI : true
                };
            }""")
            
            return ai_state
    
    return GameStateValidator()


@pytest.fixture(scope="function")
def test_data_manager():
    """Manager for test data and game state setup."""
    class TestDataManager:
        def create_test_ship_configuration(self):
            """Create standardized ship config for testing."""
            return {
                "shipType": "heavy_fighter",
                "energy": 1000,
                "maxEnergy": 1000,
                "systems": {
                    "weapons": ["pulse_laser", "missile_launcher"],
                    "shields": "standard_shields",
                    "engines": "impulse_engines"
                }
            }
        
        def create_test_mission_data(self):
            """Create test missions with known outcomes."""
            return {
                "cargo_delivery": {
                    "id": "test_cargo_001",
                    "type": "cargo_delivery",
                    "origin": "mars_base",
                    "destination": "europa_research_station",
                    "cargo": "scientific_equipment",
                    "reward": 5000,
                    "deadline": 3600  # 1 hour
                },
                "elimination": {
                    "id": "test_elimination_001",
                    "type": "elimination",
                    "target": "pirate_squadron",
                    "location": "asteroid_belt",
                    "reward": 10000,
                    "difficulty": "medium"
                }
            }
        
        def create_test_ai_scenarios(self):
            """Create controlled AI testing scenarios."""
            return {
                "single_enemy": {
                    "enemyCount": 1,
                    "enemyType": "light_fighter",
                    "behavior": "aggressive",
                    "position": [100, 0, 0]
                },
                "enemy_squadron": {
                    "enemyCount": 3,
                    "enemyType": "medium_fighter",
                    "behavior": "formation",
                    "formation": "delta",
                    "position": [200, 0, 0]
                },
                "flocking_test": {
                    "enemyCount": 5,
                    "enemyType": "light_fighter",
                    "behavior": "flocking",
                    "flockRadius": 50,
                    "position": [150, 0, 0]
                }
            }
        
        def setup_test_scenario(self, page: Page, scenario_type: str, scenario_data: dict):
            """Set up a specific test scenario in the game."""
            return page.evaluate(f"""(scenarioType, scenarioData) => {{
                if (window.testDataManager) {{
                    return window.testDataManager.setupScenario(scenarioType, scenarioData);
                }}
                return false;
            }}""", scenario_type, scenario_data)
    
    return TestDataManager()


@pytest.fixture(scope="session")
def browser_context_args_enhanced():
    """Enhanced browser context arguments for comprehensive testing."""
    return {
        "viewport": {"width": 1920, "height": 1080},  # Larger viewport for better testing
        "user_agent": "PlanetZ-Test-Browser/2.0",
        "permissions": ["clipboard-read", "clipboard-write"],
        "args": [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--disable-gpu",
            "--disable-web-security",
            "--use-angle=swiftshader",
            "--enable-webgl",
            "--enable-webgl-draft-extensions",
            "--disable-features=VizDisplayCompositor",
            "--enable-gpu-rasterization",
            "--enable-zero-copy",
            "--enable-logging",
            "--log-level=0",  # Enable verbose logging for debugging
            "--disable-background-timer-throttling",  # Prevent test timing issues
            "--disable-backgrounding-occluded-windows",
            "--disable-renderer-backgrounding"
        ]
    }


@pytest.fixture(autouse=True)
def test_cleanup(page: Page):
    """Automatic cleanup after each test."""
    yield
    
    # Clean up any test state
    try:
        page.evaluate("""() => {
            // Reset test mode
            if (window.testMode) {
                window.testMode = {};
            }
            
            // Clear debug messages
            if (window.debugMessages) {
                window.debugMessages = {};
            }
            
            // Reset any test data
            if (window.testDataManager) {
                window.testDataManager.cleanup();
            }
        }""")
    except Exception:
        # Ignore cleanup errors if page is already closed
        pass
