#!/usr/bin/env python3
"""
Mission System Automated Testing Script
Tests the cargo delivery mission fixes and dual delivery system
"""

import json
import time
import requests
import sys
import subprocess
import signal
import os
from datetime import datetime

class MissionSystemTester:
    def __init__(self, base_url="http://localhost:5000"):
        self.base_url = base_url
        self.test_results = []
        self.server_process = None
        
    def log(self, message, level="INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def start_server(self):
        """Start the backend server"""
        try:
            self.log("Starting backend server...")
            # Change to backend directory
            backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
            self.server_process = subprocess.Popen(
                [sys.executable, 'app.py'],
                cwd=backend_dir,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
            
            # Wait for server to start
            time.sleep(5)
            
            # Test if server is responding
            try:
                response = requests.get(f"{self.base_url}/api/missions/available", timeout=5)
                if response.status_code == 200:
                    self.log("✅ Backend server started successfully")
                    return True
                else:
                    self.log(f"❌ Server responded with status {response.status_code}")
                    return False
            except requests.exceptions.RequestException as e:
                self.log(f"❌ Server not responding: {e}")
                return False
                
        except Exception as e:
            self.log(f"❌ Failed to start server: {e}")
            return False
    
    def stop_server(self):
        """Stop the backend server"""
        if self.server_process:
            self.log("Stopping backend server...")
            self.server_process.terminate()
            self.server_process.wait()
            
    def test_api_endpoint(self, endpoint, method="GET", data=None, expected_status=200):
        """Test a single API endpoint"""
        try:
            url = f"{self.base_url}{endpoint}"
            self.log(f"Testing {method} {endpoint}")
            
            if method == "GET":
                response = requests.get(url, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=data, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            success = response.status_code == expected_status
            result = {
                'endpoint': endpoint,
                'method': method,
                'status_code': response.status_code,
                'expected_status': expected_status,
                'success': success,
                'response_size': len(response.text),
                'has_json': False
            }
            
            try:
                json_data = response.json()
                result['has_json'] = True
                result['response_keys'] = list(json_data.keys()) if isinstance(json_data, dict) else None
                
                if success:
                    self.log(f"✅ {endpoint} - Status: {response.status_code}, JSON keys: {result.get('response_keys', 'N/A')}")
                else:
                    self.log(f"❌ {endpoint} - Expected: {expected_status}, Got: {response.status_code}")
                    
            except json.JSONDecodeError:
                result['response_preview'] = response.text[:100]
                if success:
                    self.log(f"✅ {endpoint} - Status: {response.status_code}, Text response")
                else:
                    self.log(f"❌ {endpoint} - Expected: {expected_status}, Got: {response.status_code}")
            
            self.test_results.append(result)
            return result
            
        except requests.exceptions.RequestException as e:
            self.log(f"❌ {endpoint} - Request failed: {e}")
            result = {
                'endpoint': endpoint,
                'method': method,
                'success': False,
                'error': str(e)
            }
            self.test_results.append(result)
            return result
    
    def test_mission_apis(self):
        """Test all mission-related API endpoints"""
        self.log("🎯 Testing Mission API Endpoints...")
        
        # Test basic endpoints
        endpoints = [
            ("/api/missions/available", "GET", None, 200),
            ("/api/missions/active", "GET", None, 200),
            ("/api/missions/stats", "GET", None, 200),
        ]
        
        for endpoint, method, data, expected_status in endpoints:
            self.test_api_endpoint(endpoint, method, data, expected_status)
    
    def test_cargo_loading_event(self):
        """Test cargo loading event handling"""
        self.log("🚛 Testing Cargo Loading Events...")
        
        cargo_loaded_data = {
            "cargo_type": "medical_supplies",
            "quantity": 50,
            "location": "terra_prime",
            "player_context": {
                "player_ship": "starter_ship",
                "timestamp": int(time.time() * 1000)
            }
        }
        
        result = self.test_api_endpoint(
            "/api/missions/events/cargo_loaded", 
            "POST", 
            cargo_loaded_data, 
            200
        )
        
        return result
    
    def test_cargo_delivery_events(self):
        """Test both auto-delivery and market-sale events"""
        self.log("🚛 Testing Cargo Delivery Events...")
        
        # Test auto-delivery event (docking)
        auto_delivery_data = {
            "cargo_type": "medical_supplies",
            "quantity": 50,
            "delivery_location": "europa_research_station",
            "location": "europa_research_station",
            "integrity": 0.95,
            "source": "docking",
            "player_context": {
                "player_ship": "starter_ship",
                "timestamp": int(time.time() * 1000)
            }
        }
        
        self.log("  Testing auto-delivery (docking)...")
        auto_result = self.test_api_endpoint(
            "/api/missions/events/cargo_delivered",
            "POST",
            auto_delivery_data,
            200
        )
        
        # Test market-sale event
        market_sale_data = {
            "cargo_type": "luxury_goods",
            "quantity": 25,
            "delivery_location": "ceres_outpost",
            "location": "ceres_outpost", 
            "integrity": 0.98,
            "source": "market",
            "player_context": {
                "player_ship": "starter_ship",
                "timestamp": int(time.time() * 1000)
            }
        }
        
        self.log("  Testing market-sale...")
        market_result = self.test_api_endpoint(
            "/api/missions/events/cargo_delivered",
            "POST", 
            market_sale_data,
            200
        )
        
        return auto_result, market_result
    
    def test_mission_lifecycle(self):
        """Test complete mission lifecycle"""
        self.log("🎯 Testing Mission Lifecycle...")
        
        # 1. Get available missions
        available = self.test_api_endpoint("/api/missions/available", "GET", None, 200)
        
        # 2. Test mission acceptance (if we have missions)
        if available.get('success') and available.get('response_keys'):
            self.log("  Testing mission acceptance...")
            # For testing purposes, we'll use a dummy mission ID
            accept_data = {
                "player_context": {
                    "player_ship": "starter_ship",
                    "location": "terra_prime",
                    "level": 1
                }
            }
            
            # This might fail if no missions exist, which is expected
            self.test_api_endpoint("/api/missions/dummy_mission_123/accept", "POST", accept_data, 404)
        
        # 3. Get active missions
        self.test_api_endpoint("/api/missions/active", "GET", None, 200)
    
    def test_mission_generation(self):
        """Test procedural mission generation"""
        self.log("🎲 Testing Mission Generation...")
        
        generation_data = {
            "template_id": "delivery",
            "location": "terra_prime",
            "player_data": {
                "level": 1,
                "faction_standings": {
                    "terran_republic_alliance": 0
                }
            }
        }
        
        self.test_api_endpoint(
            "/api/missions/generate",
            "POST",
            generation_data,
            200
        )
    
    def run_comprehensive_test(self):
        """Run all tests"""
        self.log("🚀 Starting Comprehensive Mission System Test")
        self.log("=" * 60)
        
        # Start server
        if not self.start_server():
            self.log("❌ Cannot start server - aborting tests")
            return False
        
        try:
            # Run test suites
            self.test_mission_apis()
            self.test_cargo_loading_event()
            self.test_cargo_delivery_events()
            self.test_mission_lifecycle()
            self.test_mission_generation()
            
            # Generate summary
            self.generate_test_summary()
            
        except Exception as e:
            self.log(f"❌ Test suite failed: {e}")
            return False
        finally:
            self.stop_server()
            
        return True
    
    def generate_test_summary(self):
        """Generate and display test summary"""
        self.log("=" * 60)
        self.log("📊 TEST SUMMARY")
        self.log("=" * 60)
        
        total_tests = len(self.test_results)
        successful_tests = len([r for r in self.test_results if r.get('success', False)])
        failed_tests = total_tests - successful_tests
        
        self.log(f"Total Tests: {total_tests}")
        self.log(f"✅ Successful: {successful_tests}")
        self.log(f"❌ Failed: {failed_tests}")
        self.log(f"Success Rate: {(successful_tests/total_tests*100):.1f}%" if total_tests > 0 else "N/A")
        
        if failed_tests > 0:
            self.log("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result.get('success', False):
                    endpoint = result.get('endpoint', 'Unknown')
                    error = result.get('error', f"Status: {result.get('status_code', 'Unknown')}")
                    self.log(f"  - {endpoint}: {error}")
        
        self.log("\n🎯 Mission System Test Results:")
        cargo_tests = [r for r in self.test_results if 'cargo' in r.get('endpoint', '')]
        if cargo_tests:
            cargo_success = len([r for r in cargo_tests if r.get('success', False)])
            self.log(f"  Cargo System: {cargo_success}/{len(cargo_tests)} tests passed")
        
        api_tests = [r for r in self.test_results if r.get('endpoint', '').startswith('/api/missions/') and 'cargo' not in r.get('endpoint', '')]
        if api_tests:
            api_success = len([r for r in api_tests if r.get('success', False)])
            self.log(f"  Mission APIs: {api_success}/{len(api_tests)} tests passed")


def main():
    """Main test execution"""
    print("🎯 PlanetZ Mission System Automated Testing")
    print("=" * 50)
    
    tester = MissionSystemTester()
    
    try:
        success = tester.run_comprehensive_test()
        if success:
            print("\n🎉 Test suite completed successfully!")
            return 0
        else:
            print("\n💥 Test suite failed!")
            return 1
    except KeyboardInterrupt:
        print("\n⏹️  Test suite interrupted by user")
        tester.stop_server()
        return 1
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        tester.stop_server()
        return 1


if __name__ == "__main__":
    sys.exit(main())
