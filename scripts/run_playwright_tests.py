#!/usr/bin/env python3
"""Automated Playwright test runner for PlanetZ Star Charts."""

import subprocess
import sys
import os
from pathlib import Path


def install_playwright_browsers():
    """Install Playwright browsers."""
    print("📥 Installing Playwright browsers...")
    try:
        subprocess.run([sys.executable, "-m", "playwright", "install", "chromium"],
                      check=True, capture_output=True)
        print("✅ Playwright browsers installed")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install Playwright browsers: {e}")
        return False
    return True


def install_python_dependencies():
    """Install Python dependencies."""
    print("📦 Installing Python dependencies...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"],
                      check=True, capture_output=True)
        print("✅ Python dependencies installed")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install Python dependencies: {e}")
        return False
    return True


def run_tests(test_pattern=None, headless=True, slow_mo=0):
    """Run the Playwright tests."""
    print("🧪 Running Playwright tests...")

    # Set environment variables
    env = os.environ.copy()
    env["PLAYWRIGHT_HEADLESS"] = "1" if headless else "0"
    env["PLAYWRIGHT_SLOW_MO"] = str(slow_mo)

    # Build pytest command
    cmd = [
        sys.executable, "-m", "pytest",
        "tests/playwright/",
        "-v",
        "--tb=short",
        "--capture=no",  # Show print statements
    ]

    if not headless:
        cmd.append("--headed")

    if test_pattern:
        cmd.extend(["-k", test_pattern])

    try:
        result = subprocess.run(cmd, env=env)
        return result.returncode == 0
    except KeyboardInterrupt:
        print("\n🛑 Tests interrupted by user")
        return False
    except Exception as e:
        print(f"❌ Test execution failed: {e}")
        return False


def run_star_charts_tests():
    """Run specifically the Star Charts tests."""
    print("🌌 Running Star Charts tooltip tests...")
    return run_tests("test_star_charts_tooltips", headless=True, slow_mo=100)


def run_hitbox_tests():
    """Run hitbox-related tests."""
    print("🎯 Running Star Charts hitbox tests...")
    return run_tests("test_star_charts_hitboxes", headless=True, slow_mo=100)


def run_full_test_suite():
    """Run the complete test suite."""
    print("🚀 Running full Playwright test suite...")

    success = True

    # Run tooltip tests
    if not run_star_charts_tests():
        success = False

    # Run hitbox tests
    if not run_hitbox_tests():
        success = False

    return success


def main():
    """Main entry point."""
    print("🎮 PlanetZ Playwright Test Runner")
    print("=" * 50)

    # Change to project root
    project_root = Path(__file__).parent.parent
    os.chdir(project_root)

    # Parse command line arguments
    import argparse
    parser = argparse.ArgumentParser(description="Run PlanetZ Playwright tests")
    parser.add_argument("--install", action="store_true",
                       help="Install dependencies and browsers")
    parser.add_argument("--tooltips", action="store_true",
                       help="Run only tooltip tests")
    parser.add_argument("--hitboxes", action="store_true",
                       help="Run only hitbox tests")
    parser.add_argument("--full", action="store_true",
                       help="Run full test suite")
    parser.add_argument("--pattern", help="Run tests matching pattern")
    parser.add_argument("--headed", action="store_true",
                       help="Run tests in headed mode (show browser)")
    parser.add_argument("--slow", type=int, default=100,
                       help="Slow motion delay in milliseconds")

    args = parser.parse_args()

    # Install dependencies if requested
    if args.install:
        if not install_python_dependencies():
            return 1
        if not install_playwright_browsers():
            return 1

    # Determine what to run
    if args.tooltips:
        success = run_star_charts_tests()
    elif args.hitboxes:
        success = run_hitbox_tests()
    elif args.full:
        success = run_full_test_suite()
    elif args.pattern:
        success = run_tests(args.pattern, not args.headed, args.slow)
    else:
        # Default: run tooltip tests
        success = run_star_charts_tests()

    if success:
        print("✅ All tests passed!")
        return 0
    else:
        print("❌ Some tests failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main())
