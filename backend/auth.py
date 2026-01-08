"""Authentication utilities for admin endpoints."""
import os
import functools
import logging
from flask import request, jsonify, current_app

logger = logging.getLogger(__name__)


def require_admin_key(f):
    """Decorator that requires a valid admin API key for access.

    The admin key must be provided via:
    - X-Admin-Key header, OR
    - admin_key query parameter

    The expected key is read from:
    - ADMIN_API_KEY environment variable, OR
    - Flask app config ADMIN_API_KEY

    In development mode (DEBUG=True), if no key is configured,
    admin endpoints are accessible without authentication (with warning).
    """
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        # Get the expected admin key
        expected_key = os.getenv('ADMIN_API_KEY') or current_app.config.get('ADMIN_API_KEY')

        # In development with no key configured, allow access with warning
        if not expected_key:
            if current_app.debug:
                logger.warning(
                    f"Admin endpoint '{f.__name__}' accessed without auth "
                    "(no ADMIN_API_KEY configured, DEBUG mode)"
                )
                return f(*args, **kwargs)
            else:
                # In production, reject if no key is configured
                logger.error(f"Admin endpoint '{f.__name__}' blocked: ADMIN_API_KEY not configured")
                return jsonify({'error': 'Admin access not configured'}), 503

        # Get the provided key from header or query param
        provided_key = request.headers.get('X-Admin-Key') or request.args.get('admin_key')

        if not provided_key:
            logger.warning(f"Admin endpoint '{f.__name__}' accessed without credentials")
            return jsonify({'error': 'Admin authentication required'}), 401

        # Constant-time comparison to prevent timing attacks
        if not _secure_compare(provided_key, expected_key):
            logger.warning(f"Admin endpoint '{f.__name__}' accessed with invalid credentials")
            return jsonify({'error': 'Invalid admin credentials'}), 403

        logger.info(f"Admin endpoint '{f.__name__}' accessed with valid credentials")
        return f(*args, **kwargs)

    return decorated_function


def _secure_compare(a: str, b: str) -> bool:
    """Constant-time string comparison to prevent timing attacks."""
    if len(a) != len(b):
        return False
    result = 0
    for x, y in zip(a.encode(), b.encode()):
        result |= x ^ y
    return result == 0
