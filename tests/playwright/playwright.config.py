"""Playwright configuration for PlanetZ automated testing."""

from playwright.sync_api import expect

def pytest_configure(config):
    """Configure pytest for Playwright."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )


# Playwright configuration
BROWSER_CONFIG = {
    "headless": True,  # Run headless for CI/CD
    "slow_mo": 100,   # Slow down actions for debugging
    "args": [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu"
    ]
}

# Test timeouts
TIMEOUTS = {
    "navigation": 30000,  # 30 seconds
    "action": 10000,      # 10 seconds
    "expect": 5000        # 5 seconds
}

# Base URLs
BASE_URL = "http://localhost:5001"
