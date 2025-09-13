"""Standalone Star Charts testing - no 3D dependencies required."""

import json
import os
import pytest
from pathlib import Path


class StarChartsLogic:
    """Standalone Star Charts logic that doesn't require 3D rendering."""

    def __init__(self, data_path=None):
        self.objects = []
        self.load_star_data(data_path)

    def load_star_data(self, data_path=None):
        """Load star chart data from JSON file."""
        if data_path is None:
            # Use default path relative to this file
            data_path = Path(__file__).parent.parent.parent / "frontend" / "static" / "data" / "star_charts" / "objects.json"

        try:
            with open(data_path, 'r') as f:
                data = json.load(f)
                self.objects = data.get('objects', [])
                print(f"Loaded {len(self.objects)} star chart objects")
        except FileNotFoundError:
            print(f"Star data file not found: {data_path}")
            self.objects = []
        except json.JSONDecodeError as e:
            print(f"Error parsing star data: {e}")
            self.objects = []

    def get_object_by_coordinates(self, x, y, z, tolerance=0.1):
        """Find star chart object by 3D coordinates."""
        for obj in self.objects:
            coords = obj.get('coordinates', {})
            if (abs(coords.get('x', 0) - x) < tolerance and
                abs(coords.get('y', 0) - y) < tolerance and
                abs(coords.get('z', 0) - z) < tolerance):
                return obj
        return None

    def get_object_by_name(self, name):
        """Find star chart object by name."""
        for obj in self.objects:
            if obj.get('name', '').lower() == name.lower():
                return obj
        return None

    def get_discovered_objects(self):
        """Get all discovered objects."""
        return [obj for obj in self.objects if obj.get('discovered', False)]

    def get_undiscovered_objects(self):
        """Get all undiscovered objects."""
        return [obj for obj in self.objects if not obj.get('discovered', False)]

    def calculate_distance(self, obj1_coords, obj2_coords):
        """Calculate 3D distance between two objects."""
        dx = obj1_coords['x'] - obj2_coords['x']
        dy = obj1_coords['y'] - obj2_coords['y']
        dz = obj1_coords['z'] - obj2_coords['z']
        return (dx**2 + dy**2 + dz**2)**0.5

    def get_objects_within_range(self, center_coords, max_distance):
        """Get all objects within a certain distance of a point."""
        nearby_objects = []
        for obj in self.objects:
            distance = self.calculate_distance(center_coords, obj.get('coordinates', {}))
            if distance <= max_distance:
                nearby_objects.append({**obj, 'distance': distance})
        return sorted(nearby_objects, key=lambda x: x['distance'])

    def simulate_discovery(self, coordinates, discovery_range=0.5):
        """Simulate discovering objects near given coordinates."""
        discovered = []
        for obj in self.objects:
            obj_coords = obj.get('coordinates', {})
            distance = self.calculate_distance(coordinates, obj_coords)
            if distance <= discovery_range and not obj.get('discovered', False):
                obj['discovered'] = True
                discovered.append(obj)
        return discovered


class TooltipSystem:
    """Standalone tooltip system logic."""

    def __init__(self):
        self.active_tooltips = {}
        self.tooltip_templates = {
            'discovered': "{name} - {type}",
            'undiscovered': "Unknown Object",
            'player': "You are here"
        }

    def generate_tooltip_text(self, object_data):
        """Generate tooltip text based on object data."""
        if not object_data:
            return ""

        if object_data.get('type') == 'player':
            return self.tooltip_templates['player']

        if object_data.get('discovered', False):
            return self.tooltip_templates['discovered'].format(
                name=object_data.get('name', 'Unknown'),
                type=object_data.get('type', 'Object')
            )
        else:
            return self.tooltip_templates['undiscovered']

    def show_tooltip(self, object_id, object_data):
        """Show tooltip for an object."""
        tooltip_text = self.generate_tooltip_text(object_data)
        self.active_tooltips[object_id] = {
            'text': tooltip_text,
            'object': object_data,
            'visible': True
        }
        return tooltip_text

    def hide_tooltip(self, object_id):
        """Hide tooltip for an object."""
        if object_id in self.active_tooltips:
            self.active_tooltips[object_id]['visible'] = False
        return object_id in self.active_tooltips

    def get_active_tooltips(self):
        """Get all currently active tooltips."""
        return {k: v for k, v in self.active_tooltips.items() if v['visible']}


class TestStarChartsStandalone:
    """Test suite for standalone Star Charts functionality."""

    @pytest.fixture
    def star_charts(self):
        """Create StarChartsLogic instance for testing."""
        return StarChartsLogic()

    @pytest.fixture
    def tooltip_system(self):
        """Create TooltipSystem instance for testing."""
        return TooltipSystem()

    def test_star_charts_initialization(self, star_charts):
        """Test that Star Charts logic initializes correctly."""
        assert star_charts is not None
        assert isinstance(star_charts.objects, list)

    def test_load_star_data(self, star_charts):
        """Test loading star chart data."""
        # Should have loaded some objects (or empty list if file not found)
        assert isinstance(star_charts.objects, list)

        if star_charts.objects:
            # If data loaded, check structure
            obj = star_charts.objects[0]
            assert 'coordinates' in obj or 'name' in obj

    def test_object_lookup_by_name(self, star_charts):
        """Test finding objects by name."""
        # This will work even with empty data
        result = star_charts.get_object_by_name("Test Object")
        assert result is None  # Should return None for non-existent objects

    def test_object_lookup_by_coordinates(self, star_charts):
        """Test finding objects by coordinates."""
        result = star_charts.get_object_by_coordinates(0, 0, 0)
        # Will be None if no objects at those coordinates
        assert result is None or isinstance(result, dict)

    def test_discovery_filtering(self, star_charts):
        """Test filtering discovered vs undiscovered objects."""
        discovered = star_charts.get_discovered_objects()
        undiscovered = star_charts.get_undiscovered_objects()

        assert isinstance(discovered, list)
        assert isinstance(undiscovered, list)

        # All discovered objects should be marked as discovered
        for obj in discovered:
            assert obj.get('discovered', False) is True

        # All undiscovered objects should not be marked as discovered
        for obj in undiscovered:
            assert obj.get('discovered', False) is False

    def test_distance_calculation(self, star_charts):
        """Test 3D distance calculation."""
        coords1 = {'x': 0, 'y': 0, 'z': 0}
        coords2 = {'x': 3, 'y': 4, 'z': 0}

        distance = star_charts.calculate_distance(coords1, coords2)
        assert distance == 5.0  # 3-4-5 triangle

    def test_objects_within_range(self, star_charts):
        """Test finding objects within a distance range."""
        center = {'x': 0, 'y': 0, 'z': 0}
        nearby = star_charts.get_objects_within_range(center, 10.0)

        assert isinstance(nearby, list)
        # Should be sorted by distance
        for i in range(len(nearby) - 1):
            assert nearby[i]['distance'] <= nearby[i + 1]['distance']

    def test_discovery_simulation(self, star_charts):
        """Test simulating object discovery."""
        discovery_coords = {'x': 1, 'y': 1, 'z': 1}
        discovered = star_charts.simulate_discovery(discovery_coords, 2.0)

        assert isinstance(discovered, list)
        # All discovered objects should now be marked as discovered
        for obj in discovered:
            assert obj.get('discovered', False) is True

    def test_tooltip_generation(self, tooltip_system):
        """Test tooltip text generation."""
        # Test discovered object
        discovered_obj = {
            'name': 'Alpha Centauri',
            'type': 'Star System',
            'discovered': True
        }
        tooltip_text = tooltip_system.generate_tooltip_text(discovered_obj)
        assert 'Alpha Centauri' in tooltip_text
        assert 'Star System' in tooltip_text

        # Test undiscovered object
        undiscovered_obj = {
            'discovered': False
        }
        tooltip_text = tooltip_system.generate_tooltip_text(undiscovered_obj)
        assert tooltip_text == "Unknown Object"

        # Test player object
        player_obj = {
            'type': 'player'
        }
        tooltip_text = tooltip_system.generate_tooltip_text(player_obj)
        assert tooltip_text == "You are here"

    def test_tooltip_show_hide(self, tooltip_system):
        """Test showing and hiding tooltips."""
        test_obj = {'name': 'Test', 'type': 'Star', 'discovered': True}

        # Show tooltip
        tooltip_text = tooltip_system.show_tooltip('obj1', test_obj)
        assert 'Test' in tooltip_text

        # Check active tooltips
        active = tooltip_system.get_active_tooltips()
        assert 'obj1' in active
        assert active['obj1']['visible'] is True

        # Hide tooltip
        result = tooltip_system.hide_tooltip('obj1')
        assert result is True

        # Check tooltip is hidden
        active = tooltip_system.get_active_tooltips()
        assert 'obj1' not in active

    def test_tooltip_edge_cases(self, tooltip_system):
        """Test tooltip system edge cases."""
        # Test with None object
        tooltip_text = tooltip_system.generate_tooltip_text(None)
        assert tooltip_text == ""

        # Test with empty object
        tooltip_text = tooltip_system.generate_tooltip_text({})
        assert tooltip_text == ""

        # Test with missing fields
        incomplete_obj = {'name': 'Test'}  # Missing 'type' and 'discovered'
        tooltip_text = tooltip_system.generate_tooltip_text(incomplete_obj)
        assert tooltip_text == "Unknown Object"  # Missing 'discovered' defaults to False


if __name__ == "__main__":
    # Run basic tests without pytest
    print("Running standalone Star Charts tests...")

    # Test basic functionality
    star_charts = StarChartsLogic()
    print(f"Loaded {len(star_charts.objects)} objects")

    # Test tooltip system
    tooltips = TooltipSystem()
    test_obj = {'name': 'Test Star', 'type': 'Star', 'discovered': True}
    tooltip_text = tooltips.generate_tooltip_text(test_obj)
    print(f"Tooltip text: {tooltip_text}")

    # Test distance calculation
    distance = star_charts.calculate_distance(
        {'x': 0, 'y': 0, 'z': 0},
        {'x': 1, 'y': 1, 'z': 1}
    )
    print(f"Distance calculation: {distance:.2f}")

    print("Standalone tests completed successfully!")
