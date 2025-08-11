#!/usr/bin/env python3
"""
Mission System Test Script
Validates the complete mission system implementation
"""

import os
import sys
import json
import requests
import time
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_backend_initialization():
    """Test that the mission system backend initializes correctly"""
    print("🧪 Testing backend initialization...")
    
    try:
        from backend.mission_system import Mission, MissionState, MissionManager
        
        # Test Mission creation
        mission = Mission(
            mission_id="test_001",
            title="Test Mission",
            description="A test mission for validation",
            mission_type="elimination"
        )
        
        print(f"✅ Mission created: {mission.title}")
        print(f"   State: {mission.get_state()}")
        print(f"   Type: {mission.mission_type}")
        
        # Test state transitions
        success = mission.set_state(MissionState.MENTIONED)
        assert success, "Failed to set mission to Mentioned state"
        print(f"✅ State transition to Mentioned: {mission.get_state()}")
        
        success = mission.set_state(MissionState.ACCEPTED)
        assert success, "Failed to set mission to Accepted state"
        print(f"✅ State transition to Accepted: {mission.get_state()}")
        
        # Test MissionManager
        manager = MissionManager(data_directory="test_missions")
        print(f"✅ MissionManager initialized with {len(manager.missions)} missions")
        
        return True
        
    except Exception as e:
        print(f"❌ Backend test failed: {e}")
        return False

def test_mission_files():
    """Test that mission files are properly structured"""
    print("\n🧪 Testing mission files...")
    
    try:
        missions_dir = project_root / "missions" / "active"
        
        if not missions_dir.exists():
            print(f"❌ Missions directory not found: {missions_dir}")
            return False
        
        mission_files = list(missions_dir.glob("*.json"))
        print(f"📁 Found {len(mission_files)} mission files")
        
        for mission_file in mission_files:
            with open(mission_file, 'r') as f:
                mission_data = json.load(f)
            
            # Validate required fields
            required_fields = ['id', 'title', 'description', 'mission_type', 'state', 'objectives']
            for field in required_fields:
                assert field in mission_data, f"Missing required field '{field}' in {mission_file.name}"
            
            print(f"✅ Validated mission file: {mission_file.name}")
            print(f"   Title: {mission_data['title']}")
            print(f"   Type: {mission_data['mission_type']}")
            print(f"   Objectives: {len(mission_data['objectives'])}")
        
        return True
        
    except Exception as e:
        print(f"❌ Mission files test failed: {e}")
        return False

def test_templates():
    """Test that mission templates are properly structured"""
    print("\n🧪 Testing mission templates...")
    
    try:
        templates_dir = project_root / "missions" / "templates"
        
        if not templates_dir.exists():
            print(f"❌ Templates directory not found: {templates_dir}")
            return False
        
        template_files = list(templates_dir.glob("*_template.json"))
        print(f"📁 Found {len(template_files)} template files")
        
        for template_file in template_files:
            with open(template_file, 'r') as f:
                template_data = json.load(f)
            
            # Validate required template fields
            required_fields = ['template_id', 'title', 'description', 'mission_type', 'objectives']
            for field in required_fields:
                assert field in template_data, f"Missing required field '{field}' in {template_file.name}"
            
            print(f"✅ Validated template: {template_file.name}")
            print(f"   ID: {template_data['template_id']}")
            print(f"   Type: {template_data['mission_type']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Templates test failed: {e}")
        return False

def test_api_endpoints():
    """Test API endpoints (requires Flask server running)"""
    print("\n🧪 Testing API endpoints...")
    
    base_url = "http://127.0.0.1:5001"
    
    try:
        # Test health check first
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code != 200:
            print(f"❌ Server not running or unhealthy. Status: {response.status_code}")
            return False
        
        print("✅ Server is running")
        
        # Test get available missions
        response = requests.get(f"{base_url}/api/missions?location=terra_prime", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ GET /api/missions successful")
            print(f"   Found {data.get('count', 0)} available missions")
            
            if data.get('missions'):
                # Test mission details
                first_mission = data['missions'][0]
                mission_id = first_mission['id']
                
                response = requests.get(f"{base_url}/api/missions/{mission_id}", timeout=10)
                if response.status_code == 200:
                    mission_details = response.json()
                    print(f"✅ GET /api/missions/{mission_id} successful")
                    print(f"   Mission: {mission_details['mission']['title']}")
                else:
                    print(f"❌ Failed to get mission details: {response.status_code}")
                    return False
        else:
            print(f"❌ Failed to get available missions: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
        # Test mission templates endpoint
        response = requests.get(f"{base_url}/api/missions/templates", timeout=10)
        if response.status_code == 200:
            templates = response.json()
            print(f"✅ GET /api/missions/templates successful")
            print(f"   Found {templates.get('count', 0)} templates")
        else:
            print(f"❌ Failed to get templates: {response.status_code}")
        
        # Test mission stats
        response = requests.get(f"{base_url}/api/missions/stats", timeout=10)
        if response.status_code == 200:
            stats = response.json()
            print(f"✅ GET /api/missions/stats successful")
            print(f"   Total missions: {stats.get('mission_stats', {}).get('total_missions', 0)}")
        else:
            print(f"❌ Failed to get stats: {response.status_code}")
        
        return True
        
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to server. Make sure Flask server is running:")
        print("   cd backend && python3 app.py")
        return False
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False

def test_mission_acceptance():
    """Test mission acceptance workflow"""
    print("\n🧪 Testing mission acceptance workflow...")
    
    base_url = "http://127.0.0.1:5001"
    
    try:
        # Get available missions
        response = requests.get(f"{base_url}/api/missions?location=terra_prime", timeout=10)
        
        if response.status_code != 200:
            print("❌ Cannot get available missions for acceptance test")
            return False
        
        data = response.json()
        if not data.get('missions'):
            print("❌ No missions available for acceptance test")
            return False
        
        # Find a mission in "Mentioned" state
        mission_to_accept = None
        for mission in data['missions']:
            if mission['state'] == 'Mentioned':
                mission_to_accept = mission
                break
        
        if not mission_to_accept:
            print("❌ No missions in 'Mentioned' state available for acceptance")
            return False
        
        mission_id = mission_to_accept['id']
        print(f"🎯 Attempting to accept mission: {mission_to_accept['title']}")
        
        # Accept the mission
        response = requests.post(
            f"{base_url}/api/missions/{mission_id}/accept",
            json={
                'player_id': 'test_player',
                'location': 'terra_prime'
            },
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"✅ Mission accepted successfully")
                print(f"   New state: {result['mission']['state']}")
                
                # Check for response hooks
                if result.get('hooks'):
                    print(f"   Response hooks: {len(result['hooks'])}")
                    for hook in result['hooks']:
                        print(f"     - {hook['type']}")
                
                return True
            else:
                print(f"❌ Mission acceptance failed: {result.get('error')}")
                return False
        else:
            print(f"❌ Mission acceptance request failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
    except Exception as e:
        print(f"❌ Mission acceptance test failed: {e}")
        return False

def test_mission_generation():
    """Test procedural mission generation"""
    print("\n🧪 Testing mission generation...")
    
    base_url = "http://127.0.0.1:5001"
    
    try:
        # Generate a mission from template
        response = requests.post(
            f"{base_url}/api/missions/generate",
            json={
                'template_id': 'elimination',
                'player_data': {
                    'level': 5,
                    'faction_standings': {'federation': 10}
                },
                'location': 'test_sector'
            },
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                mission = result['mission']
                print(f"✅ Mission generated successfully")
                print(f"   Title: {mission['title']}")
                print(f"   Type: {mission['mission_type']}")
                print(f"   State: {mission['state']}")
                return True
            else:
                print(f"❌ Mission generation failed: {result.get('error')}")
                return False
        else:
            print(f"❌ Mission generation request failed: {response.status_code}")
            print(f"   Response: {response.text}")
            return False
        
    except Exception as e:
        print(f"❌ Mission generation test failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🚀 Mission System Validation Test Suite")
    print("=" * 50)
    
    tests = [
        ("Backend Initialization", test_backend_initialization),
        ("Mission Files", test_mission_files),
        ("Mission Templates", test_templates),
        ("API Endpoints", test_api_endpoints),
        ("Mission Acceptance", test_mission_acceptance),
        ("Mission Generation", test_mission_generation)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            success = test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"❌ Test '{test_name}' crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print(f"\n{'='*50}")
    print("🎯 TEST SUMMARY")
    print(f"{'='*50}")
    
    passed = 0
    failed = 0
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        
        if success:
            passed += 1
        else:
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("\n🎉 All tests passed! Mission system is ready for use.")
        return 0
    else:
        print(f"\n⚠️  {failed} tests failed. Please check the implementation.")
        return 1

if __name__ == "__main__":
    exit(main())
