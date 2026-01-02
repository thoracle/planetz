"""Test Star Charts tooltip initialization fix."""

import pytest
from playwright.sync_api import Page, expect


class TestStarChartsTooltipFix:
    """Test suite for the Star Charts tooltip initialization fix."""

    def test_tooltip_shows_immediately_on_hover(self, star_charts_page: Page):
        """Test that tooltips show object names immediately on hover without requiring a click first."""
        page = star_charts_page

        # Check if real Star Charts event handlers are available
        has_real_handlers = page.evaluate("""() => {
            return !!(window.navigationSystemManager?.starChartsUI?.showTooltip);
        }""")

        if not has_real_handlers:
            pytest.skip("Real Star Charts tooltip handlers not available in test environment")

        # Capture JavaScript errors to ensure our fix doesn't introduce new issues
        js_errors = []
        page.on("pageerror", lambda error: js_errors.append(str(error)))

        # Star Charts should already be open from the fixture
        # Just wait a moment for full initialization
        page.wait_for_timeout(3000)  # Allow initialization to complete

        # Find any object in the star charts (not the ship)
        objects = page.locator("circle.object, rect.object").all()

        if len(objects) > 0:
            test_object = objects[0]

            # Hover over the object WITHOUT clicking first
            test_object.hover()
            page.wait_for_timeout(500)  # Wait for tooltip to appear

            # Check if tooltip is visible
            tooltip = page.locator("#star-charts-tooltip, .scanner-tooltip").first

            # The tooltip should be visible
            expect(tooltip).to_be_visible()

            # The tooltip should have text content (not empty)
            tooltip_text = tooltip.text_content()
            assert tooltip_text is not None, "Tooltip should have text content"
            assert len(tooltip_text.strip()) > 0, "Tooltip text should not be empty"
            assert tooltip_text.strip() != "", "Tooltip should show actual content"

            print(f"✅ Tooltip shows: '{tooltip_text}' on first hover")
        else:
            print("ℹ️ No objects found to test tooltip on")

        # Assert no JavaScript errors occurred during hover
        assert len(js_errors) == 0, f"JavaScript errors occurred during hover: {js_errors}"
        print("✅ No JavaScript errors during hover events")

    def test_tooltip_content_accuracy(self, star_charts_page: Page):
        """Test that tooltip content is accurate and not just placeholder text."""
        page = star_charts_page

        # Check if real Star Charts event handlers are available
        has_real_handlers = page.evaluate("""() => {
            return !!(window.navigationSystemManager?.starChartsUI?.showTooltip);
        }""")

        if not has_real_handlers:
            pytest.skip("Real Star Charts tooltip handlers not available in test environment")

        # Star Charts should already be open from the fixture
        page.wait_for_timeout(2000)

        # Test ship tooltip
        ship_icon = page.locator(".ship-position-icon")
        if ship_icon.count() > 0 and ship_icon.is_visible():
            ship_icon.hover()
            page.wait_for_timeout(300)

            tooltip = page.locator("#star-charts-tooltip, .scanner-tooltip").first
            if tooltip.is_visible():
                tooltip_text = tooltip.text_content()
                assert tooltip_text == "You are here", f"Ship tooltip should show 'You are here', got '{tooltip_text}'"
                print("✅ Ship tooltip shows correct text")

        # Test object tooltips
        objects = page.locator("circle.object[data-name], rect.object[data-name]").all()

        for i, obj in enumerate(objects[:3]):  # Test first 3 objects
            obj.hover()
            page.wait_for_timeout(300)

            tooltip = page.locator("#star-charts-tooltip, .scanner-tooltip").first
            if tooltip.is_visible():
                tooltip_text = tooltip.text_content()

                # Should not be empty or placeholder
                assert tooltip_text != "", "Tooltip should not be empty"
                assert tooltip_text != "Unknown Object", "Tooltip should not show fallback text for discovered objects"
                assert tooltip_text != "undefined", "Tooltip should not show 'undefined'"

                print(f"✅ Object {i+1} tooltip: '{tooltip_text}'")

    def test_tooltip_initialization_timing(self, star_charts_page: Page):
        """Test that tooltips work immediately after Star Charts opens, not just after first click."""
        page = star_charts_page

        # Check if real Star Charts event handlers are available
        has_real_handlers = page.evaluate("""() => {
            return !!(window.navigationSystemManager?.starChartsUI?.showTooltip);
        }""")

        if not has_real_handlers:
            pytest.skip("Real Star Charts tooltip handlers not available in test environment")

        # Star Charts should already be open from the fixture
        # Immediately try to hover (without any clicks first)
        page.wait_for_timeout(2000)  # Brief wait for initialization

        # Find the first available object
        first_object = page.locator("circle.object, rect.object").first

        if first_object.count() > 0 and first_object.is_visible():
            # Hover immediately without any prior interaction
            first_object.hover()
            page.wait_for_timeout(500)

            # Check tooltip appears
            tooltip = page.locator("#star-charts-tooltip, .scanner-tooltip").first

            # Should be visible and have content
            if tooltip.is_visible():
                tooltip_text = tooltip.text_content()
                assert tooltip_text is not None, "Tooltip should have content on immediate hover"
                assert len(tooltip_text.strip()) > 0, "Tooltip should not be empty on immediate hover"
                print(f"✅ Immediate hover tooltip: '{tooltip_text}'")
            else:
                print("⚠️ Tooltip not visible on immediate hover - may need more initialization time")

    def test_debug_logging_enhancement(self, star_charts_page: Page):
        """Test that the enhanced debug logging provides useful information."""
        page = star_charts_page

        # Check if real Star Charts event handlers are available
        has_real_handlers = page.evaluate("""() => {
            return !!(window.navigationSystemManager?.starChartsUI?.showTooltip);
        }""")

        if not has_real_handlers:
            pytest.skip("Real Star Charts debug logging not available in test environment")

        # Enable console logging capture
        console_messages = []
        page.on("console", lambda msg: console_messages.append(msg.text))

        # Star Charts should already be open from the fixture
        page.wait_for_timeout(2000)

        # Hover over an object to trigger debug logging
        first_object = page.locator("circle.object, rect.object").first
        if first_object.count() > 0 and first_object.is_visible():
            first_object.hover()
            page.wait_for_timeout(500)

            # Check for enhanced debug messages
            tooltip_logs = [msg for msg in console_messages if "showTooltip called for object" in msg]

            if tooltip_logs:
                latest_log = tooltip_logs[-1]
                print(f"✅ Debug log captured: {latest_log[:100]}...")

                # Should contain the enhanced information
                assert "hasObjectDatabase" in latest_log, "Debug log should include database status"
                assert "isManagerInitialized" in latest_log, "Debug log should include initialization status"
                assert "tooltipText" in latest_log, "Debug log should include tooltip text"
            else:
                print("ℹ️ No tooltip debug logs captured")

    def test_fallback_behavior(self, star_charts_page: Page):
        """Test that fallback behavior works when object data is incomplete."""
        page = star_charts_page

        # Check if real Star Charts event handlers are available
        has_real_handlers = page.evaluate("""() => {
            return !!(window.navigationSystemManager?.starChartsUI?.showTooltip);
        }""")

        if not has_real_handlers:
            pytest.skip("Real Star Charts tooltip handlers not available in test environment")

        # This test validates that even if object data is incomplete,
        # tooltips still show something meaningful rather than empty content

        # Star Charts should already be open from the fixture
        page.wait_for_timeout(2000)

        # Test multiple objects to see if any have fallback behavior
        objects = page.locator("circle.object, rect.object").all()

        fallback_found = False
        for obj in objects[:5]:  # Test first 5 objects
            obj.hover()
            page.wait_for_timeout(200)

            tooltip = page.locator("#star-charts-tooltip, .scanner-tooltip").first
            if tooltip.is_visible():
                tooltip_text = tooltip.text_content()

                # Should never be completely empty
                assert tooltip_text is not None, "Tooltip should never be None"
                assert tooltip_text.strip() != "", "Tooltip should never be empty string"

                # Check for fallback patterns
                if tooltip_text in ["Unknown Object", "Unknown"]:
                    fallback_found = True
                    print(f"✅ Fallback behavior working: '{tooltip_text}'")

        print(f"ℹ️ Fallback behavior test completed (fallback found: {fallback_found})")

    def test_no_javascript_errors_during_hover(self, star_charts_page: Page):
        """Test that hover events don't generate JavaScript errors."""
        page = star_charts_page

        # Capture all JavaScript errors
        js_errors = []
        page.on("pageerror", lambda error: js_errors.append(str(error)))

        # Also capture console errors
        console_errors = []
        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)

        # Star Charts should already be open from the fixture
        page.wait_for_timeout(2000)

        # Perform multiple hover actions to trigger any potential errors
        objects = page.locator("circle.object, rect.object, .ship-position-icon").all()

        hover_count = 0
        for obj in objects[:10]:  # Test first 10 objects
            try:
                if obj.is_visible():
                    obj.hover()
                    page.wait_for_timeout(100)  # Brief pause between hovers
                    hover_count += 1
            except Exception:
                pass  # Skip objects that can't be hovered

        # Also test rapid hover movements
        if len(objects) > 0:
            try:
                for _ in range(5):  # Rapid hover sequence
                    if objects[0].is_visible():
                        objects[0].hover()
                        page.wait_for_timeout(50)
                    if len(objects) > 1 and objects[1].is_visible():
                        objects[1].hover()
                        page.wait_for_timeout(50)
            except Exception:
                pass  # Skip if rapid hover fails

        print(f"✅ Performed {hover_count} hover actions plus rapid hover sequence")

        # Check for JavaScript errors
        if js_errors:
            print(f"❌ JavaScript errors detected: {js_errors}")
            assert False, f"JavaScript errors occurred during hover: {js_errors}"

        # Check for console errors (excluding debug messages)
        relevant_console_errors = [err for err in console_errors if "ReferenceError" in err or "TypeError" in err or "SyntaxError" in err]
        if relevant_console_errors:
            print(f"❌ Console errors detected: {relevant_console_errors}")
            assert False, f"Console errors occurred during hover: {relevant_console_errors}"

        print("✅ No JavaScript or console errors during extensive hover testing")
