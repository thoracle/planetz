"""
Standardized error handling for API endpoints.

Provides decorators to reduce duplicated try-except blocks across routes.
"""

from functools import wraps
from flask import jsonify
import logging

logger = logging.getLogger(__name__)


def handle_api_error(endpoint_name):
    """
    Decorator to standardize error handling across API endpoints.

    Catches common exceptions and returns a consistent error response.
    Logs the error with the endpoint name for debugging.

    Args:
        endpoint_name: Name of the endpoint for logging

    Usage:
        @api_bp.route('/example')
        @handle_api_error('example')
        def example():
            # ... code that might raise exceptions
            return jsonify({'data': 'value'})
    """
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            try:
                return f(*args, **kwargs)
            except (TypeError, KeyError, AttributeError, ValueError) as e:
                logger.error(f"Error in {endpoint_name}: {str(e)}")
                return jsonify({'error': 'Internal server error'}), 500
            except IOError as e:
                logger.error(f"IO Error in {endpoint_name}: {str(e)}")
                return jsonify({'error': 'Internal server error'}), 500
            except RuntimeError as e:
                logger.error(f"Runtime Error in {endpoint_name}: {str(e)}")
                return jsonify({'error': 'Internal server error'}), 500
        return wrapped
    return decorator


def handle_validation_error(f):
    """
    Decorator for endpoints that use validation.py validators.

    Catches ValidationError and returns appropriate 400 response.
    Should be used with @handle_validation_errors from validation.py for
    full validation error handling.
    """
    @wraps(f)
    def wrapped(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            # Check if it's a validation error by message pattern
            error_msg = str(e)
            if 'must be' in error_msg or 'required' in error_msg or 'invalid' in error_msg.lower():
                return jsonify({'error': error_msg}), 400
            raise
    return wrapped
