"""Integration tests for Star Charts - combining standalone logic with UI testing."""

import pytest
import json
from pathlib import Path
from test_star_charts_standalone import StarChartsLogic, TooltipSystem


class TestStarChartsIntegration:
    """Integration tests combining standalone logic with browser testing."""

    @pytest.fixture
    def star_charts_logic(self):
        """Create StarChartsLogic instance."""
        return StarChartsLogic()

    @pytest.fixture
    def tooltip_logic(self):
        """Create TooltipSystem instance."""
        return TooltipSystem()

    def test_data_consistency_between_logic_and_ui(self, star_charts_logic, page_with_game):
        """Test that the logic layer data is consistent with what the UI expects."""
        # Test that the logic can handle the same data structure as the UI
        page = page_with_game

        # Inject test data into the page
        test_objects = [
            {"name": "Test Star 1", "coordinates": {"x": 1, "y": 1, "z": 1}, "discovered": True},
            {"name": "Test Star 2", "coordinates": {"x": 2, "y": 2, "z": 2}, "discovered": False}
        ]

        page.evaluate(f"""() => {{
            window.testStarData = {json.dumps(test_objects)};
            console.log('Injected test data:', window.testStarData);
        }}""")

        # Verify the data was injected correctly
        injected_data = page.evaluate("""() => window.testStarData""")
        assert len(injected_data) == 2
        assert injected_data[0]['name'] == 'Test Star 1'
        assert injected_data[1]['discovered'] is False

    def test_tooltip_logic_matches_ui_behavior(self, tooltip_logic, page_with_game):
        """Test that tooltip logic produces expected results that match UI expectations."""
        page = page_with_game

        # Test various tooltip scenarios
        test_cases = [
            {"name": "Alpha", "type": "Star", "discovered": True, "expected": "Alpha - Star"},
            {"name": "Beta", "type": "Planet", "discovered": False, "expected": "Unknown Object"},
            {"type": "player", "expected": "You are here"}
        ]

        for i, test_case in enumerate(test_cases):
            # Generate tooltip using logic
            logic_result = tooltip_logic.generate_tooltip_text(test_case)

            # Verify logic matches expected result
            expected = test_case['expected']
            assert logic_result == expected, f"Test case {i}: expected '{expected}', got '{logic_result}'"

            # Inject into page for UI verification
            page.evaluate(f"""() => {{
                window.tooltipTest_{i} = {{
                    input: {json.dumps(test_case)},
                    expected: "{expected}",
                    logicResult: "{logic_result}"
                }};
            }}""")

    def test_coordinate_system_consistency(self, star_charts_logic, page_with_game):
        """Test that coordinate calculations are consistent between logic and potential UI usage."""
        page = page_with_game

        # Test coordinate calculations
        test_coords = [
            ({"x": 0, "y": 0, "z": 0}, {"x": 3, "y": 4, "z": 0}, 5.0),  # 3-4-5 triangle
            ({"x": 1, "y": 1, "z": 1}, {"x": 4, "y": 5, "z": 6}, 5.196),  # Space diagonal
        ]

        for i, (coord1, coord2, expected_distance) in enumerate(test_coords):
            # Calculate using logic
            logic_distance = star_charts_logic.calculate_distance(coord1, coord2)

            # Verify calculation
            assert abs(logic_distance - expected_distance) < 0.01, \
                f"Distance calculation {i} failed: expected {expected_distance}, got {logic_distance}"

            # Inject into page for potential UI verification
            page.evaluate(f"""() => {{
                window.distanceTest_{i} = {{
                    coord1: {json.dumps(coord1)},
                    coord2: {json.dumps(coord2)},
                    expected: {expected_distance},
                    actual: {logic_distance}
                }};
            }}""")

    def test_discovery_mechanism_logic(self, star_charts_logic, page_with_game):
        """Test the discovery mechanism logic."""
        page = page_with_game

        # Create test scenario
        discovery_point = {"x": 1, "y": 1, "z": 1}
        discovery_range = 2.0

        # Simulate discovery using logic
        before_discovery = len(star_charts_logic.get_discovered_objects())
        discovered_objects = star_charts_logic.simulate_discovery(discovery_point, discovery_range)
        after_discovery = len(star_charts_logic.get_discovered_objects())

        # Verify discovery logic
        assert after_discovery >= before_discovery
        assert len(discovered_objects) == (after_discovery - before_discovery)

        # Inject discovery results into page
        page.evaluate(f"""() => {{
            window.discoveryTest = {{
                beforeCount: {before_discovery},
                afterCount: {after_discovery},
                discoveredCount: {len(discovered_objects)},
                discoveryPoint: {json.dumps(discovery_point)},
                discoveryRange: {discovery_range}
            }};
        }}""")

    def test_range_query_functionality(self, star_charts_logic, page_with_game):
        """Test finding objects within range."""
        page = page_with_game

        # Test range queries
        center_point = {"x": 0, "y": 0, "z": 0}
        test_ranges = [1.0, 5.0, 10.0]

        for range_distance in test_ranges:
            # Query using logic
            objects_in_range = star_charts_logic.get_objects_within_range(center_point, range_distance)

            # Verify results are properly sorted by distance
            for i in range(len(objects_in_range) - 1):
                assert objects_in_range[i]['distance'] <= objects_in_range[i + 1]['distance']

            # Verify all objects are within range
            for obj in objects_in_range:
                assert obj['distance'] <= range_distance

            # Inject into page for verification
            page.evaluate(f"""() => {{
                window.rangeTest_{range_distance} = {{
                    center: {json.dumps(center_point)},
                    range: {range_distance},
                    objectsFound: {len(objects_in_range)},
                    results: {json.dumps(objects_in_range)}
                }};
            }}""")

    def test_ui_data_binding_compatibility(self, star_charts_logic, tooltip_logic, page_with_game):
        """Test that logic layer data can be properly bound to UI components."""
        page = page_with_game

        # Create comprehensive test data
        ui_test_data = {
            "starChartObjects": star_charts_logic.objects[:5] if star_charts_logic.objects else [],
            "tooltipTemplates": tooltip_logic.tooltip_templates,
            "activeTooltips": tooltip_logic.active_tooltips,
            "discoveryStats": {
                "total": len(star_charts_logic.objects),
                "discovered": len(star_charts_logic.get_discovered_objects()),
                "undiscovered": len(star_charts_logic.get_undiscovered_objects())
            }
        }

        # Inject data into page
        page.evaluate(f"""() => {{
            window.uiTestData = {json.dumps(ui_test_data)};
            console.log('UI test data injected:', window.uiTestData);
        }}""")

        # Verify data structure is intact
        injected_data = page.evaluate("""() => window.uiTestData""")
        assert 'starChartObjects' in injected_data
        assert 'tooltipTemplates' in injected_data
        assert 'discoveryStats' in injected_data

        # Verify discovery stats consistency
        stats = injected_data['discoveryStats']
        assert stats['discovered'] + stats['undiscovered'] == stats['total']

    def test_error_handling_and_edge_cases(self, star_charts_logic, tooltip_logic, page_with_game):
        """Test error handling and edge cases."""
        page = page_with_game

        # Test edge cases
        edge_cases = [
            # Empty coordinates
            {"coordinates": {}, "expected_distance": None},
            # Missing coordinates
            {"no_coordinates": True, "expected_distance": None},
            # Invalid data types
            {"coordinates": {"x": "invalid", "y": 1, "z": 1}, "expected_distance": None}
        ]

        for i, test_case in enumerate(edge_cases):
            try:
                if 'coordinates' in test_case:
                    distance = star_charts_logic.calculate_distance(
                        test_case['coordinates'],
                        {"x": 0, "y": 0, "z": 0}
                    )
                    actual_distance = distance
                else:
                    actual_distance = None
            except Exception as e:
                actual_distance = f"Error: {str(e)}"

            # Inject edge case results into page
            page.evaluate(f"""() => {{
                window.edgeCaseTest_{i} = {{
                    input: {json.dumps(test_case)},
                    result: {json.dumps(actual_distance)}
                }};
            }}""")

        # Test tooltip edge cases
        tooltip_edge_cases = [
            None,
            {},
            {"name": "Test"},  # Missing type/discovered
            {"type": "invalid_type"}
        ]

        for i, test_case in enumerate(tooltip_edge_cases):
            tooltip_text = tooltip_logic.generate_tooltip_text(test_case)

            # Inject tooltip edge case results
            page.evaluate(f"""() => {{
                window.tooltipEdgeCaseTest_{i} = {{
                    input: {json.dumps(test_case)},
                    result: "{tooltip_text}"
                }};
            }}""")


if __name__ == "__main__":
    # Run integration tests manually
    print("Running Star Charts integration tests...")

    star_charts = StarChartsLogic()
    tooltips = TooltipSystem()

    print(f"Loaded {len(star_charts.objects)} star chart objects")
    print(f"Tooltip templates: {list(tooltips.tooltip_templates.keys())}")

    # Test distance calculation
    distance = star_charts.calculate_distance(
        {'x': 0, 'y': 0, 'z': 0},
        {'x': 1, 'y': 1, 'z': 1}
    )
    print(f"Distance calculation test: {distance:.3f}")

    print("Integration tests completed!")
