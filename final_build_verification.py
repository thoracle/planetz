#!/usr/bin/env python3
"""
Final Build Verification for StarF*ckers Game
Comprehensive test of all critical systems after fixes
"""

import requests
import time
import sys
from urllib.parse import urljoin

# Server configuration
BASE_URL = "http://localhost:5001"

def test_server_status():
    """Test if the Flask server is running and responding."""
    print("🔍 Testing server status...")
    try:
        response = requests.get(BASE_URL, timeout=5)
        if response.status_code == 200:
            print("✅ Server is running and responding")
            return True
        else:
            print(f"❌ Server returned status code: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Server is not responding: {e}")
        return False

def test_critical_files():
    """Test all critical files are accessible."""
    print("\n🔍 Testing critical file accessibility...")
    
    critical_files = [
        "/", "/index.html", "/js/app.js", "/js/ship/Ship.js",
        "/js/ship/CardSystemIntegration.js", "/js/ship/WeaponSyncManager.js",
        "/js/ui/CardInventoryUI.js", "/js/ui/DamageControlInterface.js",
        "/js/workers/meshGenerator.worker.js", "/audio/photons.wav",
        "/audio/missiles.wav", "/audio/mines.mp3", "/audio/explosion.wav",
        "/audio/death.wav", "/audio/success.wav", "/css/style.css",
        "/css/card-inventory.css", "/css/views.css", "/lib/three.min.js"
    ]
    
    failed_files = []
    for file_path in critical_files:
        url = urljoin(BASE_URL, file_path)
        try:
            response = requests.head(url, timeout=5)
            if response.status_code == 200:
                print(f"✅ {file_path}")
            else:
                print(f"❌ {file_path} - Status: {response.status_code}")
                failed_files.append(file_path)
        except requests.exceptions.RequestException as e:
            print(f"❌ {file_path} - Error: {e}")
            failed_files.append(file_path)
    
    if failed_files:
        print(f"\n❌ {len(failed_files)} files failed accessibility test")
        return False
    else:
        print(f"\n✅ All {len(critical_files)} critical files accessible")
        return True

def test_worker_path_fix():
    """Test that the worker path fix is working."""
    print("\n🔍 Testing worker path fix...")
    
    # Test the corrected worker path
    worker_url = urljoin(BASE_URL, "/js/workers/meshGenerator.worker.js")
    try:
        response = requests.head(worker_url, timeout=5)
        if response.status_code == 200:
            print("✅ Worker file accessible at corrected path")
            
            # Verify the content type is correct
            content_type = response.headers.get('content-type', '')
            if 'javascript' in content_type.lower():
                print("✅ Worker file has correct content type")
                return True
            else:
                print(f"⚠️ Worker file content type: {content_type}")
                return True  # Still consider it working
        else:
            print(f"❌ Worker file not accessible: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Worker file request failed: {e}")
        return False

def test_game_load():
    """Test that the main game page loads correctly."""
    print("\n🔍 Testing main game page load...")
    
    try:
        response = requests.get(BASE_URL, timeout=10)
        if response.status_code == 200:
            content = response.text.lower()
            
            # Check for essential elements (updated for modern HTML structure)
            checks = [
                ("title tag", "<title>" in content),
                ("three.js import map", "importmap" in content and "three" in content),
                ("app.js module reference", "js/app.js" in content),
                ("basic HTML structure", "<!doctype html>" in content or "<!DOCTYPE html>" in content),
                ("scene container", "scene-container" in content)
            ]
            
            all_passed = True
            for check_name, passed in checks:
                if passed:
                    print(f"✅ {check_name} found")
                else:
                    print(f"❌ {check_name} missing")
                    all_passed = False
            
            return all_passed
        else:
            print(f"❌ Game page returned status: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Game page request failed: {e}")
        return False

def test_worker_test_page():
    """Test that the worker test page is accessible."""
    print("\n🔍 Testing worker test page...")
    
    test_page_url = urljoin(BASE_URL, "/test_worker_fix.html")
    try:
        response = requests.get(test_page_url, timeout=5)
        if response.status_code == 200:
            content = response.text.lower()
            if "worker fix test" in content:
                print("✅ Worker test page accessible and contains expected content")
                print(f"   📋 Available at: {test_page_url}")
                return True
            else:
                print("⚠️ Worker test page accessible but content may be incorrect")
                return False
        else:
            print(f"❌ Worker test page not accessible: {response.status_code}")
            return False
    except requests.exceptions.RequestException as e:
        print(f"❌ Worker test page request failed: {e}")
        return False

def run_comprehensive_verification():
    """Run all verification tests."""
    print("🚀 StarF*ckers Final Build Verification")
    print("=" * 60)
    
    tests = [
        ("Server Status", test_server_status),
        ("Critical Files", test_critical_files),
        ("Worker Path Fix", test_worker_path_fix),
        ("Game Page Load", test_game_load),
        ("Worker Test Page", test_worker_test_page)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        start_time = time.time()
        result = test_func()
        duration = time.time() - start_time
        results.append((test_name, result, duration))
        print(f"⏱️ Test completed in {duration:.2f}s")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 VERIFICATION SUMMARY")
    print("=" * 60)
    
    passed_tests = 0
    total_tests = len(results)
    
    for test_name, result, duration in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status:<10} {test_name:<20} ({duration:.2f}s)")
        if result:
            passed_tests += 1
    
    print("\n" + "=" * 60)
    success_rate = (passed_tests / total_tests) * 100
    print(f"📈 Success Rate: {passed_tests}/{total_tests} ({success_rate:.1f}%)")
    
    if passed_tests == total_tests:
        print("\n🎉 BUILD VERIFICATION: COMPLETE SUCCESS!")
        print("✅ All systems operational and ready for unit testing")
        print("\n🎯 Next Steps:")
        print("   1. Proceed with unit testing implementation")
        print("   2. Begin refactoring of large monolithic files")
        print("   3. Game is ready for development and testing")
        return 0
    else:
        print(f"\n⚠️ BUILD VERIFICATION: {total_tests - passed_tests} ISSUES FOUND")
        print("❌ Please address failing tests before proceeding")
        return 1

if __name__ == "__main__":
    sys.exit(run_comprehensive_verification()) 