#!/usr/bin/env python3
"""
Quick API Test - Test backend without full server startup
"""

import sys
import os

# Add backend to path  
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    # Test imports
    from backend.mission_system.mission_manager import MissionManager
    from backend.routes.missions import missions_bp
    print("✅ All backend modules import successfully")
    
    # Test mission manager
    manager = MissionManager(data_directory="test_missions")
    stats = manager.get_stats()
    print(f"✅ Mission manager works: {stats}")
    
    # Test routes can be imported
    print(f"✅ Mission routes blueprint: {missions_bp.name}")
    
    print("\n🎉 Backend is ready for deployment!")
    
except Exception as e:
    print(f"❌ Backend test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
