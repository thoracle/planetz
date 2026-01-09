"""Authentication utilities for admin endpoints."""
import os
import hmac
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

    Authentication is ALWAYS required, even in DEBUG mode.
    If no ADMIN_API_KEY is configured, admin endpoints return 503.
    """
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        # Get the expected admin key
        expected_key = os.getenv('ADMIN_API_KEY') or current_app.config.get('ADMIN_API_KEY')

        # Always require authentication - no bypass even in DEBUG mode
        if not expected_key:
            logger.error(
                f"Admin endpoint '{f.__name__}' blocked: ADMIN_API_KEY not configured. "
                "Set ADMIN_API_KEY environment variable to enable admin access."
            )
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
    """Constant-time string comparison to prevent timing attacks.

    Uses hmac.compare_digest which is designed to prevent timing attacks
    by comparing in constant time regardless of string length or content.
    """
    return hmac.compare_digest(a.encode('utf-8'), b.encode('utf-8'))
