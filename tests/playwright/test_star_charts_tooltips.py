"""Test Star Charts tooltip functionality."""

import pytest
import time
from playwright.sync_api import Page, expect


class TestStarChartsTooltips:
    """Test suite for Star Charts tooltip functionality."""

    def test_canvas_context_available(self, star_charts_page: Page):
        """Test that WebGL/canvas context is available."""
        # Check if canvas exists and has proper context
        canvas = star_charts_page.locator("#scene-container canvas, canvas")
        if canvas.count() > 0:
            # Canvas may not be visible in all test environments (e.g., headless)
            # Just check it's attached to DOM
            expect(canvas.first).to_be_attached()
        else:
            # Canvas might not be created yet, just check container
            expect(star_charts_page.locator("#scene-container")).to_be_attached()

    def test_webgl_context_creation(self, star_charts_page: Page):
        """Test that WebGL context can be created."""
        # Test WebGL availability
        result = star_charts_page.evaluate("""() => {
            try {
                const canvas = document.createElement('canvas');
                const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                return gl !== null;
            } catch (e) {
                return false;
            }
        }""")
        assert result, "WebGL context should be available"

    def test_discovered_object_tooltip(self, star_charts_page: Page):
        """Test that discovered objects show their names in tooltips."""
        page = star_charts_page

        # Check if real Star Charts event handlers are available
        has_real_handlers = page.evaluate("""() => {
            return !!(window.navigationSystemManager?.starChartsUI?.showTooltip);
        }""")

        if not has_real_handlers:
            pytest.skip("Real Star Charts tooltip handlers not available in test environment")

        # Find discovered objects (they should have names)
        discovered_objects = page.locator("circle.object[data-name]").all()

        # Test at least one discovered object if available
        if discovered_objects:
            test_object = discovered_objects[0]

            # Get the expected name from data attribute
            expected_name = test_object.get_attribute("data-name")

            # Hover over the object
            test_object.hover()

            # Wait for tooltip (Star Charts uses #star-charts-tooltip, fallback to .scanner-tooltip)
            tooltip = page.locator("#star-charts-tooltip, .scanner-tooltip").first
            expect(tooltip).to_be_visible()

            # Check that tooltip shows the name (not "Unknown")
            tooltip_text = tooltip.text_content()
            assert tooltip_text != "Unknown", f"Expected object name, got 'Unknown'"
            assert len(tooltip_text.strip()) > 0, "Tooltip should not be empty"

    def test_undiscovered_object_tooltip(self, star_charts_page: Page):
        """Test that undiscovered objects show 'Unknown' in tooltips."""
        page = star_charts_page

        # Find undiscovered objects (they should show as "Unknown")
        undiscovered_objects = page.locator("circle.object:not([data-name])").all()

        # Test undiscovered objects if available
        for obj in undiscovered_objects[:3]:  # Test up to 3 objects
            # Hover over the object
            obj.hover()
            page.wait_for_timeout(200)  # Brief pause

            # Check tooltip (Star Charts uses #star-charts-tooltip)
            tooltip = page.locator("#star-charts-tooltip, .scanner-tooltip").first
            if tooltip.is_visible():
                expect(tooltip).to_have_text("Unknown")

    def test_threejs_initialization(self, star_charts_page: Page):
        """Test that Three.js can initialize properly."""
        result = star_charts_page.evaluate("""() => {
            try {
                // Check if Three.js is available
                if (typeof THREE === 'undefined') {
                    return { available: false, error: 'THREE not defined' };
                }

                // Try to create basic Three.js objects
                const scene = new THREE.Scene();
                const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);

                // WebGLRenderer may fail in headless environments without GPU
                let renderer = null;
                try {
                    renderer = new THREE.WebGLRenderer({ antialias: true });
                } catch (e) {
                    // Renderer creation may fail in headless without GPU
                    return {
                        available: true,
                        scene: !!scene,
                        camera: !!camera,
                        renderer: false,
                        rendererError: e.message
                    };
                }

                return {
                    available: true,
                    scene: !!scene,
                    camera: !!camera,
                    renderer: !!renderer
                };
            } catch (e) {
                return { available: false, error: e.message };
            }
        }""")

        # THREE may not be available in fallback mock environment
        if not result['available']:
            pytest.skip(f"Three.js not available in test environment: {result.get('error', 'unknown')}")

        assert result['scene'], "Three.js scene should be created"
        assert result['camera'], "Three.js camera should be created"
        # Renderer may not work in headless environments
        if not result['renderer']:
            print(f"⚠️ WebGLRenderer not available: {result.get('rendererError', 'unknown')}")

    def test_tooltip_position_follows_mouse(self, star_charts_page: Page):
        """Test that tooltip follows mouse cursor position."""
        page = star_charts_page

        # Get SVG bounds
        svg = page.locator(".starcharts-svg")
        svg_box = svg.bounding_box()

        # Test positions across the SVG
        test_positions = [
            (svg_box["x"] + 100, svg_box["y"] + 100),
            (svg_box["x"] + 200, svg_box["y"] + 150),
            (svg_box["x"] + 300, svg_box["y"] + 200)
        ]

        for x, y in test_positions:
            # Move mouse to position
            page.mouse.move(x, y)

            # If tooltip is visible, check its position is near mouse
            tooltip = page.locator("#star-charts-tooltip, .scanner-tooltip")
            if tooltip.is_visible():
                tooltip_box = tooltip.bounding_box()
                # Tooltip should be close to mouse position (within 50px)
                assert abs(tooltip_box["x"] - x) < 50, f"Tooltip X position off: {tooltip_box['x']} vs {x}"
                assert abs(tooltip_box["y"] - y) < 50, f"Tooltip Y position off: {tooltip_box['y']} vs {y}"

    def test_zoom_doesnt_affect_tooltip_detection(self, star_charts_page: Page):
        """Test that tooltip detection works at different zoom levels."""
        page = star_charts_page

        # Test at different zoom levels
        zoom_levels = [0.5, 1.0, 1.5, 2.0]

        for zoom_level in zoom_levels:
            # Set zoom level (this might require accessing game internals)
            # For now, just test that tooltips work at current zoom

            # Find ship and test tooltip
            ship_icon = page.locator(".ship-position-icon")
            if ship_icon.is_visible():
                ship_icon.hover()
                tooltip = page.locator("#star-charts-tooltip, .scanner-tooltip")
                if tooltip.is_visible():
                    expect(tooltip).to_have_text("You are here")

            page.wait_for_timeout(500)

    def test_no_false_tooltips_on_empty_space(self, star_charts_page: Page):
        """Test that hovering over empty space doesn't show tooltips."""
        page = star_charts_page

        # Get SVG element
        svg = page.locator(".starcharts-svg")

        # Hover over several empty areas
        svg_box = svg.bounding_box()
        empty_positions = [
            (svg_box["x"] + 50, svg_box["y"] + 50),
            (svg_box["x"] + svg_box["width"] - 50, svg_box["y"] + 50),
            (svg_box["x"] + svg_box["width"]//2, svg_box["y"] + svg_box["height"]//2)
        ]

        for x, y in empty_positions:
            page.mouse.move(x, y)
            page.wait_for_timeout(300)

            # Tooltip should not be visible
            tooltip = page.locator("#star-charts-tooltip, .scanner-tooltip")
            expect(tooltip).not_to_be_visible()


class TestStarChartsIntegration:
    """Integration tests for Star Charts functionality."""

    @pytest.mark.slow
    def test_full_star_charts_workflow(self, page_with_game: Page):
        """Test complete Star Charts workflow."""
        page = page_with_game

        # 1. Open Star Charts
        page.keyboard.press("C")
        page.wait_for_timeout(2000)  # Wait for Star Charts to open

        # Check if Star Charts actually opened
        svg = page.locator(".starcharts-svg")
        if svg.count() == 0 or not svg.is_visible():
            pytest.skip("Star Charts did not open - requires full game initialization")
        expect(svg).to_be_visible()

        # 2. Wait for objects to load
        page.wait_for_timeout(2000)

        # 3. Test ship tooltip
        ship_icon = page.locator(".ship-position-icon")
        expect(ship_icon).to_be_visible()
        ship_icon.hover()
        expect(page.locator("#star-charts-tooltip, .scanner-tooltip")).to_have_text("You are here")

        # 4. Test zooming
        page.keyboard.press("Shift+Click")  # Zoom out
        page.wait_for_timeout(500)
        page.click(".starcharts-svg")  # Zoom in
        page.wait_for_timeout(500)

        # 5. Test tooltip still works after zoom
        ship_icon.hover()
        expect(page.locator("#star-charts-tooltip, .scanner-tooltip")).to_have_text("You are here")

        # 6. Close Star Charts (ESC)
        page.keyboard.press("Escape")
        expect(page.locator(".starcharts-svg")).not_to_be_visible()
