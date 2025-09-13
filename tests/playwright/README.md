# Playwright Test Suite for PlanetZ

This directory contains automated end-to-end tests for the PlanetZ game using Playwright.

## Overview

The test suite focuses on:
- **Star Charts UI functionality** - Testing the navigation and discovery system
- **Tooltip behavior** - Ensuring tooltips appear correctly on hover
- **Hitbox validation** - Checking that interactive elements have proper hit areas
- **Integration testing** - Full workflow validation

## Setup

### Prerequisites

- Python 3.11+
- Node.js (for the game frontend)
- Flask backend running

### Installation

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Playwright browsers
python -m playwright install chromium
```

### Quick Setup Script

```bash
# Run the automated setup
python scripts/run_playwright_tests.py --install
```

## Running Tests

### Basic Commands

```bash
# Run all tests
python scripts/run_playwright_tests.py --full

# Run only tooltip tests
python scripts/run_playwright_tests.py --tooltips

# Run only hitbox tests
python scripts/run_playwright_tests.py --hitboxes

# Run with visible browser (for debugging)
python scripts/run_playwright_tests.py --tooltips --headed

# Run specific test pattern
python scripts/run_playwright_tests.py --pattern "test_ship_tooltip"
```

### Direct Pytest Commands

```bash
# Run all Playwright tests
pytest tests/playwright/ -v

# Run with headed browser
pytest tests/playwright/ --headed

# Run specific test file
pytest tests/playwright/test_star_charts_tooltips.py -v

# Run with different browser
pytest tests/playwright/ --browser chromium
```

## Test Structure

### Test Files

- `test_star_charts_tooltips.py` - Core tooltip functionality tests
- `test_star_charts_hitboxes.py` - Hitbox and interaction tests
- `conftest.py` - Shared fixtures and configuration
- `playwright.config.py` - Playwright-specific configuration

### Key Fixtures

- `game_server` - Starts Flask development server
- `page_with_game` - Loads the game page and waits for initialization
- `star_charts_page` - Opens Star Charts view (presses 'C')

## Test Coverage

### Star Charts Tooltips

- ✅ Ship tooltip shows "You are here"
- ✅ Discovered objects show their names
- ✅ Undiscovered objects show "Unknown"
- ✅ Tooltips disappear when mouse leaves
- ✅ Tooltip position follows mouse cursor
- ✅ Zoom level doesn't affect tooltip detection

### Star Charts Hitboxes

- ✅ Hitbox debug mode enables correctly
- ✅ No mysterious invisible hitboxes in left panel
- ✅ Orbit circles don't interfere with clicks
- ✅ Ship icon has appropriate hitbox size
- ✅ Object hitboxes don't overlap incorrectly

### Integration Tests

- ✅ Full Star Charts workflow (open → interact → zoom → close)
- ✅ Game server starts and stops correctly
- ✅ Browser automation works end-to-end

## Debugging

### Running Tests in Headed Mode

```bash
# See the browser while tests run
python scripts/run_playwright_tests.py --tooltips --headed --slow 500
```

### Browser Developer Tools

When running in headed mode, you can:
1. Open browser dev tools
2. Inspect elements during test execution
3. Check console logs for JavaScript errors
4. Verify CSS and DOM state

### Test Debugging

```bash
# Run specific failing test with detailed output
pytest tests/playwright/test_star_charts_tooltips.py::TestStarChartsTooltips::test_ship_tooltip_appears -v -s
```

## CI/CD Integration

Tests automatically run on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

See `.github/workflows/playwright-tests.yml` for CI configuration.

## Troubleshooting

### Common Issues

1. **Server not starting**: Ensure Flask dependencies are installed
2. **Browser not found**: Run `python -m playwright install chromium`
3. **Tests timing out**: Increase timeout values in `conftest.py`
4. **Elements not found**: Game may not be fully loaded; check `page_with_game` fixture

### Game-Specific Issues

- **Star Charts not opening**: Ensure 'C' key handler is working
- **Tooltips not appearing**: Check that `getObjectAtScreenPosition` returns valid objects
- **Hitboxes not visible**: Debug functions may not be loaded

## Extending Tests

### Adding New Tests

1. Create new test methods in existing files
2. Or create new test files following the naming pattern
3. Use existing fixtures for common setup

### Custom Fixtures

Add new fixtures to `conftest.py` for reusable test setup.

### Page Object Pattern

Consider implementing page objects for complex UI interactions:

```python
class StarChartsPage:
    def __init__(self, page):
        self.page = page

    def open_star_charts(self):
        self.page.keyboard.press("C")
        self.page.wait_for_selector(".starcharts-svg")

    def hover_ship(self):
        self.page.locator(".ship-position-icon").hover()
```

## Performance

- Tests run in headless mode by default for speed
- Parallel execution can be enabled with `pytest-xdist`
- Browser contexts are reused where possible

## Browser Support

Currently configured for Chromium. Can be extended to:
- Firefox: `pytest --browser firefox`
- WebKit/Safari: `pytest --browser webkit`

## Contributing

1. Write descriptive test names
2. Include assertions with clear failure messages
3. Add docstrings to test classes and methods
4. Update this README when adding new functionality
