#!/usr/bin/env python3
"""
Build Status Checker for StarF*ckers Game
Verifies all critical files are accessible via the Flask server
"""

import requests
import sys
from urllib.parse import urljoin

# Server configuration
BASE_URL = "http://localhost:5001"

# Critical files to check
CRITICAL_FILES = [
    # Main application files
    "/",
    "/index.html",
    
    # Core JavaScript modules
    "/js/app.js",
    "/js/ship/Ship.js",
    "/js/ship/CardSystemIntegration.js",
    "/js/ship/WeaponSyncManager.js",
    "/js/ui/CardInventoryUI.js",
    "/js/ui/DamageControlInterface.js",
    
    # Worker files
    "/js/workers/meshGenerator.worker.js",
    
    # Audio files
    "/audio/photons.wav",
    "/audio/missiles.wav",
    "/audio/mines.mp3",
    "/audio/explosion.wav",
    "/audio/death.wav",
    "/audio/success.wav",
    
    # CSS files
    "/css/style.css",
    "/css/card-inventory.css",
    "/css/views.css",
    
    # Libraries
    "/lib/three.min.js",
]

def check_file(path):
    """Check if a file is accessible via HTTP."""
    url = urljoin(BASE_URL, path)
    try:
        response = requests.head(url, timeout=5)
        return response.status_code == 200, response.status_code, url
    except requests.exceptions.RequestException as e:
        return False, str(e), url

def main():
    """Run the build status check."""
    print("🔍 StarF*ckers Build Status Check")
    print("=" * 50)
    
    failed_files = []
    total_files = len(CRITICAL_FILES)
    passed_files = 0
    
    for file_path in CRITICAL_FILES:
        is_ok, status, url = check_file(file_path)
        
        if is_ok:
            print(f"✅ {file_path}")
            passed_files += 1
        else:
            print(f"❌ {file_path} - Status: {status}")
            failed_files.append((file_path, status))
    
    print("\n" + "=" * 50)
    print(f"📊 Results: {passed_files}/{total_files} files accessible")
    
    if failed_files:
        print(f"\n❌ Failed Files ({len(failed_files)}):")
        for path, status in failed_files:
            print(f"   - {path}: {status}")
        print("\n🚨 Build status: FAILED")
        return 1
    else:
        print("\n🚀 Build status: ALL SYSTEMS GO!")
        print("✅ Ready for unit testing implementation")
        return 0

if __name__ == "__main__":
    sys.exit(main()) 