#!/usr/bin/env python3
"""
Phase 0.5 Compatibility Layer Test
==================================

This script tests the Phase 0.5 compatibility layer components to ensure
they work together correctly before proceeding to Phase 1.
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def test_universe_seed_accessors():
    """Test universe seed accessor functions."""
    print("🧪 Testing universe seed accessors...")

    try:
        from backend.verse import get_current_universe_seed, get_universe_seed_from_env

        seed1 = get_current_universe_seed()
        seed2 = get_universe_seed_from_env()

        print(f"   ✅ Current seed: {seed1}")
        print(f"   ✅ Environment seed: {seed2}")

        assert isinstance(seed1, (int, type(None))), "Current seed should be int or None"
        assert isinstance(seed2, int), "Environment seed should be int"

        return True
    except Exception as e:
        print(f"   ❌ Universe seed accessor test failed: {e}")
        return False

def test_data_adapter():
    """Test data structure adapter."""
    print("🧪 Testing data structure adapter...")

    try:
        from backend.data_adapter import DataStructureAdapter
        from backend.verse import generate_starter_system

        # Get some verse.py data
        verse_data = generate_starter_system()

        # Test conversion
        unified_data = DataStructureAdapter.verse_to_unified_format(verse_data)

        print(f"   ✅ Verse data converted to unified format")
        print(f"   ✅ Star: {unified_data['star']['name']}")
        print(f"   ✅ Planets: {len(unified_data['celestial_bodies'])}")

        # Test frontend conversion
        if unified_data['celestial_bodies']:
            planet = unified_data['celestial_bodies'][0]
            frontend_planet = DataStructureAdapter.unified_to_frontend_format(planet)
            print(f"   ✅ Planet converted to frontend format: {frontend_planet['planet_name']}")

        return True
    except Exception as e:
        print(f"   ❌ Data adapter test failed: {e}")
        return False

def test_verse_adapter():
    """Test verse adapter functionality."""
    print("🧪 Testing verse adapter...")

    try:
        from backend.verse_adapter import VerseAdapter
        from backend.verse import get_universe_seed_from_env

        seed = get_universe_seed_from_env()
        adapter = VerseAdapter(seed)

        # Test object lookup
        star_data = adapter.get_object_static_data('A0_star')
        if star_data:
            print(f"   ✅ Star data retrieved: {star_data['name']}")
        else:
            print("   ❌ Star data not found")
            return False

        planet_data = adapter.get_object_static_data('A0_terra_prime')
        if planet_data:
            print(f"   ✅ Planet data retrieved: {planet_data['name']}")
        else:
            print("   ❌ Planet data not found")
            return False

        # Test sector objects
        sector_objects = adapter.get_sector_objects('A0')
        print(f"   ✅ Sector A0 objects: {len(sector_objects)} found")
        print(f"   📋 Objects: {sector_objects}")

        return True
    except Exception as e:
        print(f"   ❌ Verse adapter test failed: {e}")
        return False

def test_star_charts_adapter():
    """Test Star Charts adapter functionality."""
    print("🧪 Testing Star Charts adapter...")

    try:
        from backend.star_charts_adapter import StarChartsAdapter

        adapter = StarChartsAdapter()

        # Test data loading
        if adapter.load_star_charts_data():
            print("   ✅ Star Charts data loaded successfully")

            # Test sector data
            a0_data = adapter.get_sector_data('A0')
            if a0_data:
                print("   ✅ A0 sector data retrieved")
                print(f"   📊 A0 star: {a0_data.get('star', {}).get('name', 'Unknown')}")
            else:
                print("   ❌ A0 sector data not found")
                return False

            # Test object lookup
            star_obj = adapter.get_object_by_id('A0_star')
            if star_obj:
                print(f"   ✅ Object lookup works: {star_obj.get('name', 'Unknown')}")
            else:
                print("   ❌ Object lookup failed")
                return False

            # Test stats
            stats = adapter.get_stats()
            print(f"   📈 Database stats: {stats['total_sectors']} sectors, {stats['total_objects']} objects")

            return True
        else:
            print("   ❌ Failed to load Star Charts data")
            return False

    except Exception as e:
        print(f"   ❌ Star Charts adapter test failed: {e}")
        return False

def test_integration():
    """Test integration between adapters."""
    print("🧪 Testing adapter integration...")

    try:
        from backend.verse_adapter import VerseAdapter
        from backend.star_charts_adapter import StarChartsAdapter
        from backend.verse import get_universe_seed_from_env

        seed = get_universe_seed_from_env()

        # Create adapters
        verse_adapter = VerseAdapter(seed)
        star_adapter = StarChartsAdapter()
        star_adapter.load_star_charts_data()

        # Test that both can access A0 data
        verse_objects = verse_adapter.get_sector_objects('A0')
        star_objects = star_adapter.get_all_sector_objects('A0')

        print(f"   📊 Verse adapter objects: {len(verse_objects)}")
        print(f"   📊 Star Charts objects: {len(star_objects)}")

        # Find common objects
        common_objects = set(verse_objects) & set(star_objects)
        print(f"   ✅ Common objects: {len(common_objects)}")

        return True
    except Exception as e:
        print(f"   ❌ Integration test failed: {e}")
        return False

def main():
    """Run all Phase 0.5 tests."""
    print("🚀 Phase 0.5 Compatibility Layer Test Suite")
    print("=" * 50)

    tests = [
        test_universe_seed_accessors,
        test_data_adapter,
        test_verse_adapter,
        test_star_charts_adapter,
        test_integration
    ]

    passed = 0
    total = len(tests)

    for test in tests:
        try:
            if test():
                passed += 1
            print()
        except Exception as e:
            print(f"   ❌ Test crashed: {e}")
            print()

    print("=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")

    if passed == total:
        print("🎉 All Phase 0.5 tests passed! Ready for Phase 1.")
        return 0
    else:
        print("⚠️  Some tests failed. Please review before proceeding.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
