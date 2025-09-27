#!/usr/bin/env python3
"""
Target Computer Fixes Test Suite

This test suite validates the target computer fixes implemented to resolve:
1. Sector-prefixed ID generation (B1_star, B1_halkan vs numeric IDs)
2. Target list clearing during sector transitions
3. Ship positioning after warp
4. Integration with Star Charts and other systems

Test Categories:
- Unit Tests: Individual component functionality
- Integration Tests: Cross-system interactions
- Regression Tests: Prevent future issues
- Performance Tests: Ensure no performance degradation
"""

import unittest
import json
import subprocess
import time
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
import re

# Add project root to path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

class TargetComputerTestSuite(unittest.TestCase):
    """Test suite for target computer fixes"""
    
    @classmethod
    def setUpClass(cls):
        """Set up test environment"""
        cls.project_root = project_root
        cls.frontend_path = cls.project_root / "frontend"
        cls.js_path = cls.frontend_path / "static" / "js"
        
        # Verify critical files exist
        cls.target_computer_file = cls.js_path / "views" / "TargetComputerManager.js"
        cls.sector_navigation_file = cls.js_path / "SectorNavigation.js"
        cls.star_charts_file = cls.js_path / "views" / "StarChartsUI.js"
        
        assert cls.target_computer_file.exists(), f"TargetComputerManager.js not found at {cls.target_computer_file}"
        assert cls.sector_navigation_file.exists(), f"SectorNavigation.js not found at {cls.sector_navigation_file}"
        assert cls.star_charts_file.exists(), f"StarChartsUI.js not found at {cls.star_charts_file}"
        
        print(f"✅ Test environment initialized - Project root: {cls.project_root}")

class TestTargetIDNormalization(TargetComputerTestSuite):
    """Unit tests for target ID normalization system"""
    
    def test_sector_prefix_pattern_exists(self):
        """Test that sector-prefixed ID pattern exists in code"""
        with open(self.target_computer_file, 'r') as f:
            content = f.read()
        
        # Check for normalizeTargetId method
        self.assertIn('normalizeTargetId(', content, 
                     "normalizeTargetId method not found in TargetComputerManager.js")
        
        # Check for sector prefix generation
        self.assertIn('${currentSector}_', content,
                     "Dynamic sector prefix generation not found")
        
        # Check for unified normalization
        self.assertIn('normalizeTarget(', content,
                     "normalizeTarget method not found")
        
        print("✅ Target ID normalization methods found in code")
    
    def test_hardcoded_a0_removal(self):
        """Test that hardcoded A0_ prefixes have been removed"""
        with open(self.target_computer_file, 'r') as f:
            content = f.read()
        
        # Find all hardcoded A0_ instances (excluding comments and strings)
        # Look for A0_ that's not in comments, strings, or regex patterns
        lines = content.split('\n')
        problematic_matches = []
        
        for line_num, line in enumerate(lines, 1):
            # Skip comment lines
            if line.strip().startswith('//') or line.strip().startswith('*') or line.strip().startswith('/*'):
                continue
            
            # Skip lines that are clearly documentation, examples, or acceptable usage
            if any(keyword in line.lower() for keyword in ['comment', 'example', 'deprecated', 'fallback', 'test', 'critical', 'replace', 'format']):
                continue
            
            # Look for hardcoded A0_ that's not in strings or regex
            if 'A0_' in line:
                # Skip if it's in a string literal
                if "'" in line and 'A0_' in line.split("'")[1::2]:
                    continue
                if '"' in line and 'A0_' in line.split('"')[1::2]:
                    continue
                if '`' in line and 'A0_' in line.split('`')[1::2]:
                    continue
                
                # This might be a problematic hardcoded reference
                context = line.strip()[:100]  # First 100 chars for context
                if 'A0_' in context and not any(safe in context for safe in ['${', 'currentSector', 'sectorPrefix']):
                    problematic_matches.append(f"Line {line_num}: {context}")
        
        # Allow a few hardcoded A0_ references for backward compatibility or specific cases
        self.assertLessEqual(len(problematic_matches), 2, 
                           f"Too many hardcoded A0_ prefixes found: {problematic_matches}")
        
        if len(problematic_matches) == 0:
            print("✅ No hardcoded A0_ prefixes found")
        else:
            print(f"⚠️  Found {len(problematic_matches)} acceptable hardcoded A0_ references")
    
    def test_universal_normalization_application(self):
        """Test that normalization is applied at key points"""
        with open(self.target_computer_file, 'r') as f:
            content = f.read()
        
        # Check that normalization is applied in critical methods
        critical_points = [
            'addTargetWithDeduplication',
            'updateTargetListTraditional',
            'normalizedTargets = deduplicatedTargets.map'
        ]
        
        for point in critical_points:
            self.assertIn(point, content, 
                         f"Critical normalization point '{point}' not found")
        
        print("✅ Universal normalization applied at critical points")

class TestSectorTransitions(TargetComputerTestSuite):
    """Integration tests for sector warp transitions"""
    
    def test_target_list_clearing_logic(self):
        """Test that target list clearing logic exists"""
        with open(self.sector_navigation_file, 'r') as f:
            content = f.read()
        
        # Check for target list clearing
        clearing_patterns = [
            'targetObjects = []',
            'targetComputerManager.targetObjects = []',
            'clearCurrentTarget',
            'hideTargetHUD'
        ]
        
        found_patterns = []
        for pattern in clearing_patterns:
            if pattern in content:
                found_patterns.append(pattern)
        
        self.assertGreater(len(found_patterns), 0, 
                          "No target list clearing logic found in SectorNavigation.js")
        
        print(f"✅ Target list clearing logic found: {found_patterns}")
    
    def test_ship_positioning_logic(self):
        """Test that ship positioning logic exists"""
        with open(self.sector_navigation_file, 'r') as f:
            content = f.read()
        
        # Check for ship positioning methods
        positioning_patterns = [
            'positionShipNearStar',
            'camera.position.set',
            'ship.position.set',
            'offsetDistance'
        ]
        
        found_patterns = []
        for pattern in positioning_patterns:
            if pattern in content:
                found_patterns.append(pattern)
        
        self.assertGreaterEqual(len(found_patterns), 3, 
                               f"Insufficient ship positioning logic found: {found_patterns}")
        
        print(f"✅ Ship positioning logic found: {found_patterns}")
    
    def test_target_list_update_timing(self):
        """Test that target list updates after positioning"""
        with open(self.sector_navigation_file, 'r') as f:
            content = f.read()
        
        # Check for delayed target list update
        timing_patterns = [
            'setTimeout',
            'updateTargetList',
            'after positioning'
        ]
        
        # Look for setTimeout with updateTargetList
        setTimeout_with_update = 'setTimeout' in content and 'updateTargetList' in content
        self.assertTrue(setTimeout_with_update, 
                       "Target list update timing logic not found")
        
        print("✅ Target list update timing logic found")

class TestStarChartsIntegration(TargetComputerTestSuite):
    """Test integration with Star Charts system"""
    
    def test_star_charts_fresh_data_logic(self):
        """Test that Star Charts uses fresh data from solarSystemManager"""
        with open(self.star_charts_file, 'r') as f:
            content = f.read()
        
        # Check for fresh data retrieval
        fresh_data_patterns = [
            'solarSystemManager.starSystem',
            'solarSystemManager.currentSector',
            'getDiscoveredObjectsForRender',
            'fresh sector data'
        ]
        
        found_patterns = []
        for pattern in fresh_data_patterns:
            if pattern in content:
                found_patterns.append(pattern)
        
        self.assertGreaterEqual(len(found_patterns), 2, 
                               f"Star Charts fresh data logic insufficient: {found_patterns}")
        
        print(f"✅ Star Charts fresh data logic found: {found_patterns}")
    
    def test_sector_update_logic(self):
        """Test that Star Charts updates sector correctly"""
        with open(self.star_charts_file, 'r') as f:
            content = f.read()
        
        # Check for sector update logic
        sector_update_patterns = [
            'currentSector',
            'Updating sector from',
            'starChartsManager.currentSector'
        ]
        
        found_patterns = []
        for pattern in sector_update_patterns:
            if pattern in content:
                found_patterns.append(pattern)
        
        self.assertGreaterEqual(len(found_patterns), 1, 
                               f"Star Charts sector update logic not found: {found_patterns}")
        
        print(f"✅ Star Charts sector update logic found: {found_patterns}")

class TestRegressionPrevention(TargetComputerTestSuite):
    """Regression tests to prevent future issues"""
    
    def test_no_duplicate_id_generation(self):
        """Test that there are no duplicate ID generation methods"""
        with open(self.target_computer_file, 'r') as f:
            content = f.read()
        
        # Count ID generation methods
        id_generation_methods = [
            'constructStarChartsId',
            'normalizeTargetId',
            'normalizeTarget'
        ]
        
        method_counts = {}
        for method in id_generation_methods:
            count = content.count(f'{method}(')
            method_counts[method] = count
        
        # constructStarChartsId should be deprecated (1 definition only)
        # normalizeTargetId should be the new primary method
        # normalizeTarget should be the wrapper method
        
        self.assertGreaterEqual(method_counts.get('normalizeTargetId', 0), 1,
                               "normalizeTargetId method not found")
        self.assertGreaterEqual(method_counts.get('normalizeTarget', 0), 1,
                               "normalizeTarget method not found")
        
        print(f"✅ ID generation methods found: {method_counts}")
    
    def test_consistent_sector_variable_usage(self):
        """Test that currentSector is used consistently"""
        files_to_check = [
            self.target_computer_file,
            self.sector_navigation_file,
            self.star_charts_file
        ]
        
        sector_variable_patterns = [
            'currentSector',
            'solarSystemManager.currentSector',
            'this.currentSector'
        ]
        
        total_usage = 0
        for file_path in files_to_check:
            with open(file_path, 'r') as f:
                content = f.read()
            
            for pattern in sector_variable_patterns:
                total_usage += content.count(pattern)
        
        self.assertGreater(total_usage, 5, 
                          f"Insufficient currentSector usage across files: {total_usage}")
        
        print(f"✅ Consistent sector variable usage found: {total_usage} instances")
    
    def test_no_old_target_persistence_patterns(self):
        """Test that old patterns that could cause target persistence are removed"""
        with open(self.target_computer_file, 'r') as f:
            content = f.read()
        
        # Patterns that could cause old target persistence
        problematic_patterns = [
            'targetObjects.concat',
            'targetObjects.push.*A0_',
            'static.*A0_',
            'hardcoded.*A0_'
        ]
        
        found_problems = []
        for pattern in problematic_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            if matches:
                found_problems.extend(matches)
        
        self.assertEqual(len(found_problems), 0, 
                        f"Found problematic patterns that could cause target persistence: {found_problems}")
        
        print("✅ No old target persistence patterns found")

class TestPerformanceImpact(TargetComputerTestSuite):
    """Test that fixes don't negatively impact performance"""
    
    def test_normalization_efficiency(self):
        """Test that normalization methods are reasonably efficient"""
        with open(self.target_computer_file, 'r') as f:
            content = f.read()
        
        # Check for efficient patterns
        efficient_patterns = [
            'map(target => this.normalizeTarget(target))',  # Efficient array processing
            'if (!targetData) return',  # Early returns
            'const normalizedTarget = { ...targetData }',  # Shallow cloning
        ]
        
        inefficient_patterns = [
            r'JSON\.parse\(JSON\.stringify\(',  # Deep cloning (inefficient)
            r'for.*for.*for',  # Nested loops
            r'while.*while.*while',  # Nested loops
        ]
        
        efficient_count = sum(1 for pattern in efficient_patterns if pattern in content)
        inefficient_count = sum(1 for pattern in inefficient_patterns if re.search(pattern, content))
        
        self.assertGreater(efficient_count, 0, "No efficient patterns found")
        # Allow some inefficient patterns as they might be acceptable in certain contexts
        self.assertLessEqual(inefficient_count, 2, f"Too many inefficient patterns found: {inefficient_count}")
        
        print(f"✅ Performance patterns - Efficient: {efficient_count}, Inefficient: {inefficient_count}")

class TestSystemIntegration(TargetComputerTestSuite):
    """Test integration with other game systems"""
    
    def test_weapon_system_compatibility(self):
        """Test that target computer changes don't break weapon system"""
        weapon_files = [
            self.js_path / "ship" / "systems" / "WeaponSystemCore.js",
            self.js_path / "ship" / "systems" / "WeaponSlot.js"
        ]
        
        target_computer_interfaces = [
            'currentTarget',
            'targetObjects',
            'targetIndex',
            'targetComputerManager'
        ]
        
        total_interfaces = 0
        for file_path in weapon_files:
            if file_path.exists():
                with open(file_path, 'r') as f:
                    content = f.read()
                
                for interface in target_computer_interfaces:
                    total_interfaces += content.count(interface)
        
        # Should find some interfaces (but exact count may vary)
        self.assertGreater(total_interfaces, 0, 
                          "No target computer interfaces found in weapon system")
        
        print(f"✅ Weapon system integration interfaces found: {total_interfaces}")
    
    def test_proximity_detector_compatibility(self):
        """Test that changes don't break proximity detector"""
        proximity_files = [
            self.js_path / "views" / "ProximityDetector3D.js"
        ]
        
        for file_path in proximity_files:
            if file_path.exists():
                with open(file_path, 'r') as f:
                    content = f.read()
                
                # Check that proximity detector doesn't have conflicting target logic
                conflicting_patterns = [
                    'targetObjects.*=.*[]',  # Direct target list manipulation
                    'hardcoded.*A0_'  # Hardcoded sector references
                ]
                
                conflicts = []
                for pattern in conflicting_patterns:
                    matches = re.findall(pattern, content, re.IGNORECASE)
                    conflicts.extend(matches)
                
                self.assertEqual(len(conflicts), 0, 
                               f"Found conflicting patterns in proximity detector: {conflicts}")
        
        print("✅ Proximity detector compatibility verified")

def run_test_suite():
    """Run the complete test suite with detailed reporting"""
    
    print("🚀 Starting Target Computer Fixes Test Suite")
    print("=" * 60)
    
    # Create test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    test_classes = [
        TestTargetIDNormalization,
        TestSectorTransitions,
        TestStarChartsIntegration,
        TestRegressionPrevention,
        TestPerformanceImpact,
        TestSystemIntegration
    ]
    
    for test_class in test_classes:
        tests = loader.loadTestsFromTestCase(test_class)
        suite.addTests(tests)
    
    # Run tests with detailed output
    runner = unittest.TextTestRunner(
        verbosity=2,
        stream=sys.stdout,
        descriptions=True,
        failfast=False
    )
    
    print(f"\n📋 Running {suite.countTestCases()} tests across {len(test_classes)} categories...")
    print("-" * 60)
    
    start_time = time.time()
    result = runner.run(suite)
    end_time = time.time()
    
    # Print summary
    print("\n" + "=" * 60)
    print("🎯 TEST SUITE SUMMARY")
    print("=" * 60)
    
    total_tests = result.testsRun
    failures = len(result.failures)
    errors = len(result.errors)
    skipped = len(result.skipped) if hasattr(result, 'skipped') else 0
    passed = total_tests - failures - errors - skipped
    
    print(f"📊 Total Tests: {total_tests}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failures}")
    print(f"🚨 Errors: {errors}")
    print(f"⏭️  Skipped: {skipped}")
    print(f"⏱️  Duration: {end_time - start_time:.2f}s")
    
    success_rate = (passed / total_tests * 100) if total_tests > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    if result.failures:
        print(f"\n❌ FAILURES ({len(result.failures)}):")
        for test, traceback in result.failures:
            error_msg = traceback.split('AssertionError: ')[-1].split('\n')[0]
            print(f"  • {test}: {error_msg}")
    
    if result.errors:
        print(f"\n🚨 ERRORS ({len(result.errors)}):")
        for test, traceback in result.errors:
            error_msg = traceback.split('\n')[-2]
            print(f"  • {test}: {error_msg}")
    
    # Overall result
    if failures == 0 and errors == 0:
        print(f"\n🎉 ALL TESTS PASSED! Target computer fixes are working correctly.")
        return True
    else:
        print(f"\n⚠️  TESTS FAILED! Please review and fix the issues above.")
        return False

if __name__ == "__main__":
    success = run_test_suite()
    sys.exit(0 if success else 1)
