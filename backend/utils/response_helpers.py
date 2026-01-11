"""
Standard JSON response helpers for PlanetZ API.

Provides consistent response formatting across all endpoints.
"""

from flask import jsonify
from typing import Any, Optional


def success_response(
    data: Any = None,
    message: str = 'Success',
    status_code: int = 200
):
    """
    Create a standardized success response.

    Args:
        data: Response payload (optional)
        message: Success message
        status_code: HTTP status code (default 200)

    Returns:
        Tuple of (response, status_code)
    """
    response = {
        'status': 'success',
        'message': message
    }
    if data is not None:
        response['data'] = data

    return jsonify(response), status_code


def error_response(
    message: str = 'An error occurred',
    error_code: Optional[str] = None,
    status_code: int = 400,
    details: Optional[dict] = None
):
    """
    Create a standardized error response.

    Args:
        message: Error message
        error_code: Machine-readable error code (optional)
        status_code: HTTP status code (default 400)
        details: Additional error details (optional)

    Returns:
        Tuple of (response, status_code)
    """
    response = {
        'status': 'error',
        'message': message
    }
    if error_code:
        response['error_code'] = error_code
    if details:
        response['details'] = details

    return jsonify(response), status_code


def validation_error_response(field: str, message: str):
    """
    Create a validation error response.

    Args:
        field: Field that failed validation
        message: Validation error message

    Returns:
        Tuple of (response, 400)
    """
    return error_response(
        message=f"Validation error for '{field}': {message}",
        error_code='VALIDATION_ERROR',
        status_code=400,
        details={'field': field}
    )


def not_found_response(resource: str = 'Resource'):
    """
    Create a 404 not found response.

    Args:
        resource: Name of the resource that wasn't found

    Returns:
        Tuple of (response, 404)
    """
    return error_response(
        message=f'{resource} not found',
        error_code='NOT_FOUND',
        status_code=404
    )


def unauthorized_response(message: str = 'Unauthorized'):
    """
    Create a 401 unauthorized response.

    Args:
        message: Error message

    Returns:
        Tuple of (response, 401)
    """
    return error_response(
        message=message,
        error_code='UNAUTHORIZED',
        status_code=401
    )


def insufficient_credits_response(required: int, available: int):
    """
    Create an insufficient credits error response.

    Args:
        required: Credits required for the operation
        available: Credits the player has

    Returns:
        Tuple of (response, 400)
    """
    return error_response(
        message='Insufficient credits',
        error_code='INSUFFICIENT_CREDITS',
        status_code=400,
        details={
            'required': required,
            'available': available,
            'shortfall': required - available
        }
    )
