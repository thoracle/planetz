#!/usr/bin/env python3
"""
Target Computer Test Runner

This script runs both static analysis tests and provides instructions
for running integration tests in the browser.
"""

import sys
import os
from pathlib import Path

# Add the tests directory to the path
tests_dir = Path(__file__).parent / "tests"
sys.path.insert(0, str(tests_dir))

def main():
    print("🎯 Target Computer Fixes - Test Suite Runner")
    print("=" * 60)
    
    # Run static analysis tests
    print("📋 Running Static Analysis Tests...")
    try:
        from test_target_computer_fixes import run_test_suite
        static_success = run_test_suite()
    except ImportError as e:
        print(f"❌ Failed to import test suite: {e}")
        return False
    except Exception as e:
        print(f"❌ Static tests failed: {e}")
        return False
    
    # Instructions for integration tests
    print("\n" + "=" * 60)
    print("🌐 Integration Tests (Browser Environment)")
    print("=" * 60)
    print("""
To run integration tests in the browser:

1. Start the game server:
   cd frontend && python -m http.server 8000

2. Open browser and navigate to:
   http://localhost:8000?runTests=true

3. Or manually run tests in browser console:
   runTargetComputerTests()

4. Check the console for detailed test results

The integration tests will validate:
✅ Target ID normalization in real-time
✅ Sector transition behavior  
✅ Star Charts integration
✅ Performance impact
✅ Regression prevention
""")
    
    if static_success:
        print("🎉 Static analysis tests PASSED!")
        print("✅ Code structure and patterns are correct")
        print("🚀 Ready for integration testing")
        return True
    else:
        print("❌ Static analysis tests FAILED!")
        print("⚠️  Fix code issues before integration testing")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
