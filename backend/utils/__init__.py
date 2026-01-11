"""
Backend utility modules for PlanetZ.

Provides:
- Error handling decorators
- Repair cost calculator
- Standard JSON response helpers
"""

from .error_handlers import handle_api_error
from .repair_calculator import (
    calculate_system_repair_cost,
    calculate_hull_repair_cost,
    calculate_repair_time,
    calculate_full_repair_cost,
    is_critical_system
)
from .response_helpers import (
    success_response,
    error_response,
    validation_error_response,
    not_found_response,
    unauthorized_response,
    insufficient_credits_response
)

__all__ = [
    'handle_api_error',
    'calculate_system_repair_cost',
    'calculate_hull_repair_cost',
    'calculate_repair_time',
    'calculate_full_repair_cost',
    'is_critical_system',
    'success_response',
    'error_response',
    'validation_error_response',
    'not_found_response',
    'unauthorized_response',
    'insufficient_credits_response'
]
