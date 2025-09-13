#!/usr/bin/env python3
"""Complete setup and test script for PlanetZ Playwright tests."""

import subprocess
import sys
import os
from pathlib import Path


def run_command(cmd, description, cwd=None):
    """Run a command and return success status."""
    print(f"🔧 {description}...")
    try:
        result = subprocess.run(cmd, shell=True, check=True,
                              capture_output=True, text=True, cwd=cwd)
        print(f"✅ {description} completed")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ {description} failed:")
        print(f"   Command: {cmd}")
        print(f"   Error: {e.stderr}")
        return False


def main():
    """Main setup and test function."""
    print("🚀 PlanetZ Playwright Setup & Test Runner")
    print("=" * 60)

    project_root = Path(__file__).parent.parent
    os.chdir(project_root)

    success = True

    # 1. Install Python dependencies
    if not run_command("pip install -r requirements.txt",
                      "Installing Python dependencies"):
        success = False

    # 2. Install Playwright browsers
    if not run_command("python -m playwright install chromium",
                      "Installing Playwright browsers"):
        success = False

    # 3. Install Node.js dependencies (for game)
    if not run_command("npm install", "Installing Node.js dependencies"):
        success = False

    # 4. Run a quick syntax check on Python files
    if not run_command("python -m py_compile scripts/run_playwright_tests.py",
                      "Checking Python syntax"):
        success = False

    # 5. Run a quick syntax check on JavaScript files
    if not run_command("node -c frontend/static/js/views/StarChartsUI.js",
                      "Checking JavaScript syntax"):
        success = False

    if success:
        print("\n🎉 Setup completed successfully!")
        print("\n📋 Next steps:")
        print("1. Start the game server: python main.py")
        print("2. Run tests: npm run test:e2e:tooltips")
        print("3. Or run tests with visible browser: npm run test:e2e:headed")
        print("\n📖 See tests/playwright/README.md for detailed usage")
        return 0
    else:
        print("\n❌ Setup failed! Please check the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
