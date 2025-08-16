#!/usr/bin/env python3
"""
Mission Logic Unit Testing Script
Tests the mission system logic directly without requiring a running server
"""

import sys
import os
import json
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

try:
    from backend.mission_system.mission_manager import MissionManager
    from backend.mission_system.mission import Mission, MissionState, Objective
    print("✅ Successfully imported mission system modules")
except ImportError as e:
    print(f"❌ Failed to import mission system: {e}")
    sys.exit(1)

class MissionLogicTester:
    def __init__(self):
        self.test_results = []
        self.test_data_dir = "test_missions"
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def setup_test_environment(self):
        """Set up test environment with temporary mission directory"""
        try:
            os.makedirs(self.test_data_dir, exist_ok=True)
            os.makedirs(os.path.join(self.test_data_dir, 'active'), exist_ok=True)
            os.makedirs(os.path.join(self.test_data_dir, 'templates'), exist_ok=True)
            os.makedirs(os.path.join(self.test_data_dir, 'completed'), exist_ok=True)
            os.makedirs(os.path.join(self.test_data_dir, 'archived'), exist_ok=True)
            
            self.log("✅ Test environment set up")
            return True
        except Exception as e:
            self.log(f"❌ Failed to set up test environment: {e}")
            return False
    
    def create_test_delivery_mission(self, delivery_type="auto_delivery"):
        """Create a test delivery mission"""
        mission_id = f"test_delivery_{delivery_type}_{int(datetime.now().timestamp())}"
        
        mission = Mission(
            mission_id=mission_id,
            title=f"Test {delivery_type.replace('_', ' ').title()} Mission",
            description=f"Test delivery mission with {delivery_type} completion",
            mission_type="delivery",
            location="terra_prime",
            faction="terran_republic_alliance",
            reward_package_id=1
        )
        
        # Add objectives
        mission.add_objective(Objective("1", "Load 50 units of medical_supplies", False, True))
        mission.add_objective(Objective("2", "Deliver cargo to europa_research_station", False, True))
        
        # Set custom fields
        mission.custom_fields = {
            "cargo_type": "medical_supplies",
            "cargo_amount": 50,
            "destination": "europa_research_station",
            "pickup_location": "terra_prime",
            "delivery_type": delivery_type,
            "min_integrity": 90
        }
        
        mission.set_state(MissionState.ACCEPTED)
        return mission
    
    def test_mission_creation(self):
        """Test mission creation and basic functionality"""
        self.log("🎯 Testing Mission Creation...")
        
        try:
            # Test auto-delivery mission
            auto_mission = self.create_test_delivery_mission("auto_delivery")
            assert auto_mission.state == MissionState.ACCEPTED
            assert len(auto_mission.objectives) == 2
            assert auto_mission.custom_fields["delivery_type"] == "auto_delivery"
            
            # Test market-sale mission  
            market_mission = self.create_test_delivery_mission("market_sale")
            assert market_mission.custom_fields["delivery_type"] == "market_sale"
            
            self.log("✅ Mission creation test passed")
            return True
            
        except Exception as e:
            self.log(f"❌ Mission creation test failed: {e}")
            return False
    
    def test_mission_manager_initialization(self):
        """Test mission manager initialization"""
        self.log("🎯 Testing Mission Manager Initialization...")
        
        try:
            manager = MissionManager(data_directory=self.test_data_dir)
            assert manager is not None
            assert len(manager.missions) >= 0  # Could be 0 if no existing missions
            
            self.log(f"✅ Mission manager initialized with {len(manager.missions)} missions")
            return manager
            
        except Exception as e:
            self.log(f"❌ Mission manager initialization failed: {e}")
            return None
    
    def test_cargo_loading_logic(self, manager):
        """Test cargo loading objective completion"""
        self.log("🚛 Testing Cargo Loading Logic...")
        
        try:
            # Create and save test mission
            mission = self.create_test_delivery_mission("auto_delivery")
            manager.save_mission(mission)
            
            # Test cargo loading event
            event_data = {
                'type': 'cargo_loaded',
                'cargo_type': 'medical_supplies',
                'quantity': 50,
                'location': 'terra_prime'
            }
            
            # Process the event
            success = manager.update_mission_progress(mission.id, event_data=event_data)
            
            if success:
                # Check if loading objective was completed
                updated_mission = manager.get_mission(mission.id)
                loading_objective = updated_mission.objectives[0]  # First objective is loading
                
                assert loading_objective.is_achieved, "Loading objective should be achieved"
                assert loading_objective.progress == 1.0, "Loading objective progress should be 1.0"
                
                self.log("✅ Cargo loading logic test passed")
                return True
            else:
                self.log("❌ Cargo loading event processing failed")
                return False
                
        except Exception as e:
            self.log(f"❌ Cargo loading logic test failed: {e}")
            return False
    
    def test_auto_delivery_logic(self, manager):
        """Test auto-delivery completion logic"""
        self.log("🚛 Testing Auto-Delivery Logic...")
        
        try:
            # Create auto-delivery mission with loading objective already completed
            mission = self.create_test_delivery_mission("auto_delivery")
            mission.objectives[0].achieve()  # Mark loading as complete
            manager.save_mission(mission)
            
            # Test auto-delivery event (docking)
            event_data = {
                'type': 'cargo_delivered',
                'cargo_type': 'medical_supplies',
                'quantity': 50,
                'delivery_location': 'europa_research_station',
                'location': 'europa_research_station',
                'integrity': 0.95,
                'source': 'docking'
            }
            
            success = manager.update_mission_progress(mission.id, event_data=event_data)
            
            if success:
                updated_mission = manager.get_mission(mission.id)
                delivery_objective = updated_mission.objectives[1]  # Second objective is delivery
                
                assert delivery_objective.is_achieved, "Delivery objective should be achieved"
                assert updated_mission.state in [MissionState.ACHIEVED, MissionState.COMPLETED], "Mission should be achieved/completed"
                
                self.log("✅ Auto-delivery logic test passed")
                return True
            else:
                self.log("❌ Auto-delivery event processing failed")
                return False
                
        except Exception as e:
            self.log(f"❌ Auto-delivery logic test failed: {e}")
            return False
    
    def test_market_sale_logic(self, manager):
        """Test market-sale completion logic"""
        self.log("🚛 Testing Market-Sale Logic...")
        
        try:
            # Create market-sale mission with loading objective already completed
            mission = self.create_test_delivery_mission("market_sale")
            mission.objectives[0].achieve()  # Mark loading as complete
            manager.save_mission(mission)
            
            # Test market-sale event
            event_data = {
                'type': 'cargo_delivered',
                'cargo_type': 'medical_supplies',
                'quantity': 50,
                'delivery_location': 'europa_research_station',
                'location': 'europa_research_station',
                'integrity': 0.98,
                'source': 'market'
            }
            
            success = manager.update_mission_progress(mission.id, event_data=event_data)
            
            if success:
                updated_mission = manager.get_mission(mission.id)
                delivery_objective = updated_mission.objectives[1]
                
                assert delivery_objective.is_achieved, "Delivery objective should be achieved"
                assert updated_mission.state in [MissionState.ACHIEVED, MissionState.COMPLETED], "Mission should be achieved/completed"
                
                self.log("✅ Market-sale logic test passed")
                return True
            else:
                self.log("❌ Market-sale event processing failed")
                return False
                
        except Exception as e:
            self.log(f"❌ Market-sale logic test failed: {e}")
            return False
    
    def test_delivery_type_filtering(self, manager):
        """Test that delivery events only trigger for correct delivery types"""
        self.log("🔍 Testing Delivery Type Filtering...")
        
        try:
            # Create auto-delivery mission
            auto_mission = self.create_test_delivery_mission("auto_delivery")
            auto_mission.objectives[0].achieve()
            manager.save_mission(auto_mission)
            
            # Try to complete with market event (should not work)
            market_event = {
                'type': 'cargo_delivered',
                'cargo_type': 'medical_supplies',
                'quantity': 50,
                'delivery_location': 'europa_research_station',
                'source': 'market'
            }
            
            success = manager.update_mission_progress(auto_mission.id, event_data=market_event)
            
            # This should not complete the mission
            updated_mission = manager.get_mission(auto_mission.id)
            delivery_objective = updated_mission.objectives[1]
            
            assert not delivery_objective.is_achieved, "Auto-delivery mission should not complete with market event"
            
            self.log("✅ Delivery type filtering test passed")
            return True
            
        except Exception as e:
            self.log(f"❌ Delivery type filtering test failed: {e}")
            return False
    
    def test_mission_progress_tracking(self, manager):
        """Test mission progress and objective tracking"""
        self.log("📊 Testing Mission Progress Tracking...")
        
        try:
            # Create mission and test progress
            mission = self.create_test_delivery_mission("auto_delivery")
            manager.save_mission(mission)
            
            # Check initial progress
            progress = mission.get_progress()
            assert progress['achieved_objectives'] == 0
            assert progress['completion_percentage'] == 0.0
            
            # Complete first objective
            mission.objectives[0].achieve()
            progress = mission.get_progress()
            assert progress['achieved_objectives'] == 1
            assert progress['completion_percentage'] == 50.0  # 1 of 2 required objectives
            
            # Complete second objective
            mission.objectives[1].achieve()
            progress = mission.get_progress()
            assert progress['achieved_objectives'] == 2
            assert progress['completion_percentage'] == 100.0
            
            self.log("✅ Mission progress tracking test passed")
            return True
            
        except Exception as e:
            self.log(f"❌ Mission progress tracking test failed: {e}")
            return False
    
    def run_all_tests(self):
        """Run all unit tests"""
        self.log("🚀 Starting Mission Logic Unit Tests")
        self.log("=" * 50)
        
        # Setup
        if not self.setup_test_environment():
            return False
        
        tests_passed = 0
        total_tests = 0
        
        # Test 1: Mission creation
        total_tests += 1
        if self.test_mission_creation():
            tests_passed += 1
        
        # Test 2: Mission manager initialization
        total_tests += 1
        manager = self.test_mission_manager_initialization()
        if manager:
            tests_passed += 1
            
            # Test 3: Cargo loading logic
            total_tests += 1
            if self.test_cargo_loading_logic(manager):
                tests_passed += 1
            
            # Test 4: Auto-delivery logic
            total_tests += 1
            if self.test_auto_delivery_logic(manager):
                tests_passed += 1
            
            # Test 5: Market-sale logic
            total_tests += 1
            if self.test_market_sale_logic(manager):
                tests_passed += 1
            
            # Test 6: Delivery type filtering
            total_tests += 1
            if self.test_delivery_type_filtering(manager):
                tests_passed += 1
            
            # Test 7: Progress tracking
            total_tests += 1
            if self.test_mission_progress_tracking(manager):
                tests_passed += 1
        
        # Generate summary
        self.log("=" * 50)
        self.log("📊 TEST SUMMARY")
        self.log("=" * 50)
        self.log(f"Total Tests: {total_tests}")
        self.log(f"✅ Passed: {tests_passed}")
        self.log(f"❌ Failed: {total_tests - tests_passed}")
        self.log(f"Success Rate: {(tests_passed/total_tests*100):.1f}%")
        
        if tests_passed == total_tests:
            self.log("🎉 All tests passed!")
            return True
        else:
            self.log("💥 Some tests failed!")
            return False


def main():
    """Main test execution"""
    print("🎯 PlanetZ Mission Logic Unit Testing")
    print("=" * 40)
    
    tester = MissionLogicTester()
    
    try:
        success = tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⏹️  Tests interrupted by user")
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
