#!/usr/bin/env python3
"""Setup script for comprehensive Playwright testing infrastructure."""

import subprocess
import sys
import os
from pathlib import Path


def run_command(cmd, description):
    """Run a command and handle errors."""
    print(f"🔧 {description}...")
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True)
        print(f"✅ {description} completed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed: {e}")
        if e.stdout:
            print(f"STDOUT: {e.stdout}")
        if e.stderr:
            print(f"STDERR: {e.stderr}")
        return False


def check_python_version():
    """Check if Python version is adequate."""
    version = sys.version_info
    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print(f"❌ Python 3.8+ required, found {version.major}.{version.minor}")
        return False
    print(f"✅ Python {version.major}.{version.minor}.{version.micro} is adequate")
    return True


def install_python_dependencies():
    """Install Python dependencies."""
    return run_command(
        f"{sys.executable} -m pip install -r requirements.txt",
        "Installing Python dependencies"
    )


def install_playwright():
    """Install Playwright and browsers."""
    success = run_command(
        f"{sys.executable} -m playwright install chromium",
        "Installing Playwright browsers"
    )
    if success:
        return run_command(
            f"{sys.executable} -m playwright install-deps",
            "Installing Playwright system dependencies"
        )
    return False


def create_test_directories():
    """Create necessary test directories."""
    directories = [
        "test-results",
        "screenshots", 
        "videos",
        "coverage_html_report"
    ]
    
    for directory in directories:
        path = Path(directory)
        if not path.exists():
            path.mkdir(parents=True, exist_ok=True)
            print(f"✅ Created directory: {directory}")
        else:
            print(f"📁 Directory already exists: {directory}")
    
    return True


def validate_test_files():
    """Validate that test files exist and are readable."""
    test_files = [
        "tests/playwright/enhanced_conftest.py",
        "tests/playwright/test_ship_logic.py", 
        "tests/playwright/test_ship_systems.py",
        "tests/playwright/pytest.ini"
    ]
    
    missing_files = []
    for test_file in test_files:
        if not Path(test_file).exists():
            missing_files.append(test_file)
    
    if missing_files:
        print(f"❌ Missing test files: {missing_files}")
        return False
    
    print("✅ All essential test files are present")
    return True


def run_sample_tests():
    """Run a sample of tests to verify setup."""
    print("🧪 Running sample tests to verify setup...")
    
    # Run unit tests (no browser required)
    unit_test_success = run_command(
        f"{sys.executable} -m pytest tests/playwright/test_ship_logic.py::TestShipLogic::test_ship_logic_initialization -v",
        "Running sample unit test"
    )
    
    if not unit_test_success:
        return False
    
    # Run a simple integration test
    integration_test_success = run_command(
        f"{sys.executable} -m pytest tests/playwright/test_ship_systems.py::TestShipSystems::test_ship_initialization -v --tb=short",
        "Running sample integration test"
    )
    
    return integration_test_success


def display_usage_guide():
    """Display usage guide for the testing system."""
    print("\n" + "="*60)
    print("🎉 COMPREHENSIVE TESTING SETUP COMPLETE!")
    print("="*60)
    
    print("\n📚 QUICK START GUIDE:")
    print("\n1. Run Unit Tests (Pure Logic - No Browser):")
    print("   npm run test:unit")
    print("   # OR: python -m pytest tests/playwright/test_*_logic.py -v")
    
    print("\n2. Run Integration Tests (Component Testing):")
    print("   npm run test:integration")
    print("   # OR: python -m pytest tests/playwright/test_*_systems.py -v")
    
    print("\n3. Run Specific System Tests:")
    print("   npm run test:ship-systems")
    print("   npm run test:ai-behavior")
    print("   npm run test:mission-system")
    
    print("\n4. Run All Tests:")
    print("   npm run test:all")
    
    print("\n5. Run Tests with Coverage:")
    print("   npm run test:coverage")
    
    print("\n🔧 DEBUGGING:")
    print("   # Run with visible browser:")
    print("   python -m pytest tests/playwright/test_ship_systems.py --headed -s")
    
    print("   # Run specific test:")
    print("   python -m pytest tests/playwright/test_ship_logic.py::TestShipLogic::test_energy_consumption_calculation -v")
    
    print("\n📊 TEST CATEGORIES:")
    print("   • Unit Tests: Pure logic, no browser required")
    print("   • Integration Tests: Component testing with headless browser")
    print("   • E2E Tests: Full game environment testing")
    
    print("\n🎯 NEXT STEPS:")
    print("   1. Review docs/playwright_unit_testing_plan.md for complete guide")
    print("   2. Add tests for your specific game systems")
    print("   3. Set up CI/CD pipeline with .github/workflows/comprehensive-testing.yml")
    print("   4. Run tests regularly during development")
    
    print("\n🚀 HAPPY TESTING!")
    print("="*60)


def main():
    """Main setup function."""
    print("🎭 PlanetZ Comprehensive Testing Setup")
    print("="*50)
    
    # Change to project root
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)
    print(f"📁 Working directory: {os.getcwd()}")
    
    # Check prerequisites
    if not check_python_version():
        return 1
    
    # Setup steps
    steps = [
        ("Create test directories", create_test_directories),
        ("Validate test files", validate_test_files),
        ("Install Python dependencies", install_python_dependencies),
        ("Install Playwright", install_playwright),
        ("Run sample tests", run_sample_tests)
    ]
    
    failed_steps = []
    for step_name, step_function in steps:
        if not step_function():
            failed_steps.append(step_name)
    
    if failed_steps:
        print(f"\n❌ Setup failed at: {', '.join(failed_steps)}")
        print("Please resolve the issues above and run the setup again.")
        return 1
    
    # Display usage guide
    display_usage_guide()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
