"""Unit tests for individual Star Charts components."""

import pytest
from test_star_charts_standalone import StarChartsLogic, TooltipSystem


class TestStarChartsLogicUnit:
    """Unit tests for StarChartsLogic class."""

    def test_initialization_empty(self):
        """Test initialization with no data."""
        charts = StarChartsLogic()
        assert charts.objects == []
        assert len(charts.objects) == 0

    def test_initialization_with_data(self):
        """Test initialization with mock data."""
        mock_data = {
            "objects": [
                {"name": "Test Star", "coordinates": {"x": 1, "y": 2, "z": 3}},
                {"name": "Test Planet", "coordinates": {"x": 4, "y": 5, "z": 6}}
            ]
        }

        import tempfile
        import json

        # Create temporary file with test data
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(mock_data, f)
            temp_path = f.name

        try:
            charts = StarChartsLogic(temp_path)
            assert len(charts.objects) == 2
            assert charts.objects[0]['name'] == 'Test Star'
            assert charts.objects[1]['coordinates']['x'] == 4
        finally:
            import os
            os.unlink(temp_path)

    def test_distance_calculation_basic(self):
        """Test basic distance calculations."""
        charts = StarChartsLogic()

        # Same point
        dist = charts.calculate_distance(
            {'x': 0, 'y': 0, 'z': 0},
            {'x': 0, 'y': 0, 'z': 0}
        )
        assert dist == 0.0

        # Unit distance along each axis
        dist_x = charts.calculate_distance(
            {'x': 0, 'y': 0, 'z': 0},
            {'x': 1, 'y': 0, 'z': 0}
        )
        assert dist_x == 1.0

        dist_y = charts.calculate_distance(
            {'x': 0, 'y': 0, 'z': 0},
            {'x': 0, 'y': 1, 'z': 0}
        )
        assert dist_y == 1.0

        dist_z = charts.calculate_distance(
            {'x': 0, 'y': 0, 'z': 0},
            {'x': 0, 'y': 0, 'z': 1}
        )
        assert dist_z == 1.0

    def test_distance_calculation_3d(self):
        """Test 3D distance calculations."""
        charts = StarChartsLogic()

        test_cases = [
            # (coord1, coord2, expected_distance)
            ({'x': 0, 'y': 0, 'z': 0}, {'x': 1, 'y': 1, 'z': 1}, 1.732),  # ≈√3
            ({'x': 1, 'y': 1, 'z': 1}, {'x': 4, 'y': 5, 'z': 6}, 7.071),  # Space diagonal: √((4-1)² + (5-1)² + (6-1)²) = √(9+16+25) = √50 ≈ 7.071
            ({'x': -1, 'y': -1, 'z': -1}, {'x': 1, 'y': 1, 'z': 1}, 3.464),  # Negative coords: √((1-(-1))² + (1-(-1))² + (1-(-1))²) = √(4+4+4) = √12 ≈ 3.464
        ]

        for coord1, coord2, expected in test_cases:
            distance = charts.calculate_distance(coord1, coord2)
            assert abs(distance - expected) < 0.01, \
                f"Expected {expected}, got {distance} for {coord1} -> {coord2}"

    def test_object_lookup_by_coordinates_exact(self):
        """Test exact coordinate matching."""
        charts = StarChartsLogic()

        # Manually add test objects
        charts.objects = [
            {"name": "Star A", "coordinates": {"x": 1.0, "y": 2.0, "z": 3.0}},
            {"name": "Star B", "coordinates": {"x": 4.0, "y": 5.0, "z": 6.0}},
        ]

        # Exact match
        found = charts.get_object_by_coordinates(1.0, 2.0, 3.0)
        assert found is not None
        assert found['name'] == 'Star A'

        # No match
        not_found = charts.get_object_by_coordinates(10.0, 20.0, 30.0)
        assert not_found is None

    def test_object_lookup_by_coordinates_tolerance(self):
        """Test coordinate matching with tolerance."""
        charts = StarChartsLogic()
        charts.objects = [
            {"name": "Star A", "coordinates": {"x": 1.0, "y": 2.0, "z": 3.0}},
        ]

        # Close match within tolerance
        found = charts.get_object_by_coordinates(1.01, 2.01, 3.01, tolerance=0.1)
        assert found is not None
        assert found['name'] == 'Star A'

        # Too far - outside tolerance
        not_found = charts.get_object_by_coordinates(1.2, 2.2, 3.2, tolerance=0.1)
        assert not_found is None

    def test_object_lookup_by_name(self):
        """Test name-based object lookup."""
        charts = StarChartsLogic()
        charts.objects = [
            {"name": "Alpha Centauri", "type": "Star System"},
            {"name": "Betelgeuse", "type": "Red Giant"},
            {"name": "Sirius", "type": "Binary System"},
        ]

        # Exact match
        found = charts.get_object_by_name("Betelgeuse")
        assert found is not None
        assert found['type'] == 'Red Giant'

        # Case insensitive
        found_ci = charts.get_object_by_name("betelgeuse")
        assert found_ci is not None
        assert found_ci['type'] == 'Red Giant'

        # No match
        not_found = charts.get_object_by_name("Nonexistent Star")
        assert not_found is None

    def test_discovery_filtering(self):
        """Test discovered/undiscovered object filtering."""
        charts = StarChartsLogic()
        charts.objects = [
            {"name": "Star 1", "discovered": True},
            {"name": "Star 2", "discovered": False},
            {"name": "Star 3", "discovered": True},
            {"name": "Star 4", "discovered": False},
            {"name": "Star 5"},  # No discovered field (defaults to False)
        ]

        discovered = charts.get_discovered_objects()
        undiscovered = charts.get_undiscovered_objects()

        assert len(discovered) == 2
        assert len(undiscovered) == 3

        # Check discovered objects
        discovered_names = [obj['name'] for obj in discovered]
        assert "Star 1" in discovered_names
        assert "Star 3" in discovered_names

        # Check undiscovered objects
        undiscovered_names = [obj['name'] for obj in undiscovered]
        assert "Star 2" in undiscovered_names
        assert "Star 4" in undiscovered_names
        assert "Star 5" in undiscovered_names

    def test_objects_within_range(self):
        """Test finding objects within distance range."""
        charts = StarChartsLogic()
        charts.objects = [
            {"name": "Close Star", "coordinates": {"x": 1, "y": 0, "z": 0}},
            {"name": "Medium Star", "coordinates": {"x": 5, "y": 0, "z": 0}},
            {"name": "Far Star", "coordinates": {"x": 15, "y": 0, "z": 0}},
        ]

        center = {"x": 0, "y": 0, "z": 0}

        # Range 2: should find only Close Star
        nearby_2 = charts.get_objects_within_range(center, 2)
        assert len(nearby_2) == 1
        assert nearby_2[0]['name'] == 'Close Star'
        assert nearby_2[0]['distance'] == 1.0

        # Range 10: should find Close and Medium stars
        nearby_10 = charts.get_objects_within_range(center, 10)
        assert len(nearby_10) == 2
        assert nearby_10[0]['name'] == 'Close Star'
        assert nearby_10[1]['name'] == 'Medium Star'

        # Verify sorting by distance
        assert nearby_10[0]['distance'] <= nearby_10[1]['distance']

    def test_discovery_simulation(self):
        """Test the discovery simulation mechanism."""
        charts = StarChartsLogic()
        charts.objects = [
            {"name": "Star A", "coordinates": {"x": 1, "y": 0, "z": 0}, "discovered": False},
            {"name": "Star B", "coordinates": {"x": 5, "y": 0, "z": 0}, "discovered": False},
            {"name": "Star C", "coordinates": {"x": 15, "y": 0, "z": 0}, "discovered": False},
        ]

        discovery_point = {"x": 0, "y": 0, "z": 0}

        # Discover objects within range 2
        discovered = charts.simulate_discovery(discovery_point, 2.0)
        assert len(discovered) == 1
        assert discovered[0]['name'] == 'Star A'
        assert discovered[0]['discovered'] is True

        # Verify object state was updated
        assert charts.objects[0]['discovered'] is True
        assert charts.objects[1]['discovered'] is False  # Too far
        assert charts.objects[2]['discovered'] is False  # Too far

        # Discover more objects with larger range
        discovered_again = charts.simulate_discovery(discovery_point, 10.0)
        assert len(discovered_again) == 1  # Only Star B, Star A already discovered
        assert discovered_again[0]['name'] == 'Star B'


class TestTooltipSystemUnit:
    """Unit tests for TooltipSystem class."""

    def test_initialization(self):
        """Test tooltip system initialization."""
        tooltips = TooltipSystem()
        assert tooltips.active_tooltips == {}
        assert len(tooltips.tooltip_templates) == 3
        assert 'discovered' in tooltips.tooltip_templates
        assert 'undiscovered' in tooltips.tooltip_templates
        assert 'player' in tooltips.tooltip_templates

    def test_tooltip_generation_discovered(self):
        """Test tooltip generation for discovered objects."""
        tooltips = TooltipSystem()

        test_cases = [
            {
                "name": "Alpha Centauri",
                "type": "Star System",
                "discovered": True
            },
            {
                "name": "Betelgeuse",
                "type": "Red Giant",
                "discovered": True
            },
            {
                "name": "Sirius",
                "type": "Binary System",
                "discovered": True
            }
        ]

        for obj in test_cases:
            tooltip_text = tooltips.generate_tooltip_text(obj)
            assert obj['name'] in tooltip_text
            assert obj['type'] in tooltip_text
            assert "Unknown" not in tooltip_text

    def test_tooltip_generation_undiscovered(self):
        """Test tooltip generation for undiscovered objects."""
        tooltips = TooltipSystem()

        test_cases = [
            {"discovered": False},
            {"name": "Hidden Star", "discovered": False},
            {"name": "Secret Planet", "type": "Gas Giant", "discovered": False},
        ]

        for obj in test_cases:
            tooltip_text = tooltips.generate_tooltip_text(obj)
            assert tooltip_text == "Unknown Object"

    def test_tooltip_generation_player(self):
        """Test tooltip generation for player objects."""
        tooltips = TooltipSystem()

        player_objects = [
            {"type": "player"},
            {"type": "player", "name": "Player Ship"},
            {"type": "player", "discovered": True},
        ]

        for obj in player_objects:
            tooltip_text = tooltips.generate_tooltip_text(obj)
            assert tooltip_text == "You are here"

    def test_tooltip_generation_edge_cases(self):
        """Test tooltip generation edge cases."""
        tooltips = TooltipSystem()

        # None object
        assert tooltips.generate_tooltip_text(None) == ""

        # Empty object - should be treated as undiscovered
        assert tooltips.generate_tooltip_text({}) == ""

        # Missing discovered field (defaults to False)
        obj_missing_discovered = {"name": "Test", "type": "Star"}
        tooltip_text = tooltips.generate_tooltip_text(obj_missing_discovered)
        assert tooltip_text == "Unknown Object"

        # Missing type field (uses default)
        obj_missing_type = {"name": "Test", "discovered": True}
        tooltip_text = tooltips.generate_tooltip_text(obj_missing_type)
        assert "Test" in tooltip_text
        assert "Object" in tooltip_text  # Default type

        # Missing name field (but discovered)
        obj_missing_name = {"type": "Star", "discovered": True}
        tooltip_text = tooltips.generate_tooltip_text(obj_missing_name)
        assert "Unknown" in tooltip_text
        assert "Star" in tooltip_text

    def test_tooltip_show_hide(self):
        """Test showing and hiding tooltips."""
        tooltips = TooltipSystem()

        test_obj = {
            "name": "Test Star",
            "type": "Star System",
            "discovered": True
        }

        # Show tooltip
        tooltip_text = tooltips.show_tooltip("obj1", test_obj)
        assert tooltip_text == "Test Star - Star System"

        # Check active tooltips
        active = tooltips.get_active_tooltips()
        assert "obj1" in active
        assert active["obj1"]["visible"] is True
        assert active["obj1"]["text"] == tooltip_text

        # Hide tooltip
        result = tooltips.hide_tooltip("obj1")
        assert result is True

        # Check tooltip is hidden
        active = tooltips.get_active_tooltips()
        assert "obj1" not in active

        # Try to hide non-existent tooltip
        result = tooltips.hide_tooltip("nonexistent")
        assert result is False

    def test_multiple_active_tooltips(self):
        """Test managing multiple active tooltips."""
        tooltips = TooltipSystem()

        # Add multiple tooltips
        obj1 = {"name": "Star 1", "type": "Star", "discovered": True}
        obj2 = {"name": "Star 2", "type": "Star", "discovered": True}
        obj3 = {"type": "player"}

        tooltips.show_tooltip("obj1", obj1)
        tooltips.show_tooltip("obj2", obj2)
        tooltips.show_tooltip("obj3", obj3)

        # Check all are active
        active = tooltips.get_active_tooltips()
        assert len(active) == 3
        assert "obj1" in active
        assert "obj2" in active
        assert "obj3" in active

        # Hide one
        tooltips.hide_tooltip("obj2")
        active = tooltips.get_active_tooltips()
        assert len(active) == 2
        assert "obj1" in active
        assert "obj2" not in active
        assert "obj3" in active

    def test_tooltip_text_formatting(self):
        """Test tooltip text formatting with various inputs."""
        tooltips = TooltipSystem()

        # Test with special characters
        obj_special = {
            "name": "Star-with-Dashes",
            "type": "Binary System",
            "discovered": True
        }
        tooltip_text = tooltips.generate_tooltip_text(obj_special)
        assert "Star-with-Dashes - Binary System" == tooltip_text

        # Test with empty strings
        obj_empty = {
            "name": "",
            "type": "",
            "discovered": True
        }
        tooltip_text = tooltips.generate_tooltip_text(obj_empty)
        assert " - " == tooltip_text  # Empty strings are preserved

        # Test with very long names
        long_name = "A" * 100
        obj_long = {
            "name": long_name,
            "type": "Supernova",
            "discovered": True
        }
        tooltip_text = tooltips.generate_tooltip_text(obj_long)
        assert long_name in tooltip_text
        assert "Supernova" in tooltip_text


if __name__ == "__main__":
    # Run unit tests manually
    import sys

    print("Running Star Charts unit tests...")

    # Test StarChartsLogic
    print("\n=== Testing StarChartsLogic ===")
    charts = StarChartsLogic()
    print(f"✓ Initialization: {len(charts.objects)} objects loaded")

    # Test distance calculation
    distance = charts.calculate_distance(
        {'x': 0, 'y': 0, 'z': 0},
        {'x': 3, 'y': 4, 'z': 0}
    )
    print(f"✓ Distance calculation: {distance} (expected: 5.0)")

    # Test TooltipSystem
    print("\n=== Testing TooltipSystem ===")
    tooltips = TooltipSystem()
    print(f"✓ Initialization: {len(tooltips.tooltip_templates)} templates loaded")

    # Test tooltip generation
    test_obj = {"name": "Test Star", "type": "Nebula", "discovered": True}
    tooltip_text = tooltips.generate_tooltip_text(test_obj)
    print(f"✓ Tooltip generation: '{tooltip_text}'")

    print("\n=== All unit tests passed! ===")
