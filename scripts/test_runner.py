#!/usr/bin/env python3
"""Pure Python test runner - no npm required!"""

import subprocess
import sys
import argparse
from pathlib import Path


class PythonTestRunner:
    """Pure Python test runner that replaces npm scripts."""
    
    def __init__(self):
        self.project_root = Path(__file__).parent.parent
        
    def run_command(self, cmd, description="Running command"):
        """Run a command and return success status."""
        print(f"🧪 {description}...")
        try:
            result = subprocess.run(cmd, shell=True, check=True, cwd=self.project_root)
            print(f"✅ {description} completed successfully")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ {description} failed with exit code {e.returncode}")
            return False
    
    def test_unit(self):
        """Run unit tests (pure logic, no browser)."""
        return self.run_command(
            "python3 -m pytest tests/playwright/test_*_logic.py -v",
            "Unit tests (pure logic)"
        )
    
    def test_integration(self):
        """Run integration tests (component testing with browser)."""
        return self.run_command(
            "python3 -m pytest tests/playwright/test_*_systems.py tests/playwright/test_*_integration.py -v",
            "Integration tests (component testing)"
        )
    
    def test_ship_systems(self):
        """Run ship system tests."""
        return self.run_command(
            "python3 -m pytest tests/playwright/test_ship_logic.py tests/playwright/test_ship_systems.py -v",
            "Ship system tests"
        )
    
    def test_ai_behavior(self):
        """Run AI behavior tests."""
        return self.run_command(
            "python3 -m pytest tests/playwright/test_ai_logic.py tests/playwright/test_ai_behavior.py -v",
            "AI behavior tests"
        )
    
    def test_mission_system(self):
        """Run mission system tests."""
        return self.run_command(
            "python3 -m pytest tests/playwright/test_mission_logic.py tests/playwright/test_mission_integration.py -v",
            "Mission system tests"
        )
    
    def test_ui_components(self):
        """Run UI component tests."""
        return self.run_command(
            "python3 -m pytest tests/playwright/test_hud_components.py tests/playwright/test_navigation_ui.py -v",
            "UI component tests"
        )
    
    def test_physics(self):
        """Run physics tests."""
        return self.run_command(
            "python3 -m pytest tests/playwright/test_physics_logic.py tests/playwright/test_physics_integration.py -v",
            "Physics tests"
        )
    
    def test_economy(self):
        """Run economy tests."""
        return self.run_command(
            "python3 -m pytest tests/playwright/test_economy_logic.py tests/playwright/test_economy_integration.py -v",
            "Economy tests"
        )
    
    def test_e2e(self):
        """Run end-to-end tests."""
        return self.run_command(
            "python3 scripts/run_playwright_tests.py --full",
            "End-to-end tests"
        )
    
    def test_e2e_headed(self):
        """Run end-to-end tests with visible browser."""
        return self.run_command(
            "python3 scripts/run_playwright_tests.py --full --headed",
            "End-to-end tests (headed)"
        )
    
    def test_all(self):
        """Run all tests."""
        return self.run_command(
            "python3 -m pytest tests/playwright/ -v",
            "All tests"
        )
    
    def test_coverage(self):
        """Run tests with coverage report."""
        return self.run_command(
            "python3 -m pytest tests/playwright/ --cov=frontend/static/js --cov-report=html",
            "Tests with coverage"
        )
    
    def test_watch(self):
        """Run tests in watch mode."""
        return self.run_command(
            "python3 -m pytest tests/playwright/ -v --tb=short -x",
            "Tests in watch mode"
        )
    
    def install_dependencies(self):
        """Install test dependencies."""
        commands = [
            ("python3 -m pip install -r requirements.txt", "Installing Python dependencies"),
            ("python3 -m playwright install chromium", "Installing Playwright browsers"),
            ("python3 -m playwright install-deps", "Installing Playwright system dependencies")
        ]
        
        for cmd, desc in commands:
            if not self.run_command(cmd, desc):
                return False
        return True
    
    def clean(self):
        """Clean test artifacts."""
        return self.run_command(
            "rm -rf coverage/ .pytest_cache/ tests/playwright/__pycache__/ test-results/ screenshots/ videos/",
            "Cleaning test artifacts"
        )


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Pure Python test runner for PlanetZ")
    
    # Test type arguments
    parser.add_argument("--unit", action="store_true", help="Run unit tests")
    parser.add_argument("--integration", action="store_true", help="Run integration tests")
    parser.add_argument("--ship-systems", action="store_true", help="Run ship system tests")
    parser.add_argument("--ai-behavior", action="store_true", help="Run AI behavior tests")
    parser.add_argument("--mission-system", action="store_true", help="Run mission system tests")
    parser.add_argument("--ui-components", action="store_true", help="Run UI component tests")
    parser.add_argument("--physics", action="store_true", help="Run physics tests")
    parser.add_argument("--economy", action="store_true", help="Run economy tests")
    parser.add_argument("--e2e", action="store_true", help="Run end-to-end tests")
    parser.add_argument("--e2e-headed", action="store_true", help="Run E2E tests with visible browser")
    parser.add_argument("--all", action="store_true", help="Run all tests")
    parser.add_argument("--coverage", action="store_true", help="Run tests with coverage")
    parser.add_argument("--watch", action="store_true", help="Run tests in watch mode")
    
    # Utility arguments
    parser.add_argument("--install", action="store_true", help="Install dependencies")
    parser.add_argument("--clean", action="store_true", help="Clean test artifacts")
    parser.add_argument("--list", action="store_true", help="List available test commands")
    
    args = parser.parse_args()
    
    runner = PythonTestRunner()
    
    # Handle utility commands
    if args.install:
        return 0 if runner.install_dependencies() else 1
    
    if args.clean:
        return 0 if runner.clean() else 1
    
    if args.list:
        print("📋 Available test commands:")
        print("  --unit           Run unit tests (pure logic)")
        print("  --integration    Run integration tests (component testing)")
        print("  --ship-systems   Run ship system tests")
        print("  --ai-behavior    Run AI behavior tests")
        print("  --mission-system Run mission system tests")
        print("  --ui-components  Run UI component tests")
        print("  --physics        Run physics tests")
        print("  --economy        Run economy tests")
        print("  --e2e            Run end-to-end tests")
        print("  --e2e-headed     Run E2E tests with visible browser")
        print("  --all            Run all tests")
        print("  --coverage       Run tests with coverage")
        print("  --watch          Run tests in watch mode")
        print("\n🔧 Utility commands:")
        print("  --install        Install dependencies")
        print("  --clean          Clean test artifacts")
        print("  --list           Show this help")
        return 0
    
    # Handle test commands
    success = True
    
    if args.unit:
        success &= runner.test_unit()
    elif args.integration:
        success &= runner.test_integration()
    elif args.ship_systems:
        success &= runner.test_ship_systems()
    elif args.ai_behavior:
        success &= runner.test_ai_behavior()
    elif args.mission_system:
        success &= runner.test_mission_system()
    elif args.ui_components:
        success &= runner.test_ui_components()
    elif args.physics:
        success &= runner.test_physics()
    elif args.economy:
        success &= runner.test_economy()
    elif args.e2e:
        success &= runner.test_e2e()
    elif args.e2e_headed:
        success &= runner.test_e2e_headed()
    elif args.all:
        success &= runner.test_all()
    elif args.coverage:
        success &= runner.test_coverage()
    elif args.watch:
        success &= runner.test_watch()
    else:
        # Default: run unit tests
        print("No test type specified, running unit tests by default")
        print("Use --list to see all available options")
        success &= runner.test_unit()
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
