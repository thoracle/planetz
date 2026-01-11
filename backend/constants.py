"""Centralized constants for the PlanetZ backend.

This module provides a single source of truth for configuration values
that are used across multiple modules.
"""

# =============================================================================
# Rate Limiting
# =============================================================================

# Standard API calls (most endpoints)
RATE_LIMIT_STANDARD = "30 per minute"

# CPU-intensive operations (generation, complex queries)
RATE_LIMIT_EXPENSIVE = "10 per minute"

# Admin-only endpoints (debugging, configuration)
RATE_LIMIT_ADMIN = "5 per minute"


# =============================================================================
# Chunk Generation
# =============================================================================

CHUNK_SIZE = 16  # Size of procedural generation chunks


# =============================================================================
# Performance Thresholds
# =============================================================================

# Mission system performance thresholds
MISSION_PERF_THRESHOLD_MS = 500  # Warning threshold for slow operations
MISSION_MAX_SAMPLES = 100  # Maximum performance samples to keep


# =============================================================================
# Storage Thresholds
# =============================================================================

# Mission count thresholds for storage backend selection
STORAGE_THRESHOLD_JSON = 50      # Use JSON storage below this count
STORAGE_THRESHOLD_SQLITE = 100   # Use SQLite between JSON and this count
# Above STORAGE_THRESHOLD_SQLITE, consider PostgreSQL


# =============================================================================
# Coordinate Limits
# =============================================================================

MAX_COORDINATE = 10000   # Maximum coordinate value (DoS protection)
MIN_COORDINATE = -10000  # Minimum coordinate value


# =============================================================================
# Validation Limits  
# =============================================================================

MAX_STRING_LENGTH = 1000     # Default max length for string inputs
MAX_MISSION_ID_LENGTH = 100  # Max length for mission IDs
MAX_SYSTEM_NAME_LENGTH = 50  # Max length for system names
MAX_NUM_SYSTEMS = 500        # Max systems per generation (DoS protection)
