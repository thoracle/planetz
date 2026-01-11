"""
Input validation utilities for API endpoints.
Centralized validation to prevent injection, DoS, and invalid data.
"""

import re
import logging
from functools import wraps
from flask import request, jsonify
from typing import Any, Dict, List, Optional, Callable, Union

logger = logging.getLogger(__name__)

# Validation constants
MAX_STRING_LENGTH = 1000
MAX_ARRAY_LENGTH = 100
MAX_COORDINATE = 10000
MIN_COORDINATE = -10000
MAX_SEED = 2**32 - 1
MAX_NUM_SYSTEMS = 500
MAX_DAMAGE_AMOUNT = 10.0
MAX_REPAIR_AMOUNT = 1.0
MAX_ENERGY_AMOUNT = 100000
MAX_CREDITS = 10**9

# Valid patterns
MISSION_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{1,100}$')
SYSTEM_NAME_PATTERN = re.compile(r'^[a-zA-Z0-9_\s-]{1,50}$')
TEMPLATE_ID_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{1,50}$')
SHIP_TYPE_PATTERN = re.compile(r'^[a-zA-Z_]{1,30}$')
FACTION_PATTERN = re.compile(r'^[a-zA-Z_]{1,30}$')
PLANET_TYPE_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{1,30}$')
SECTOR_ID_PATTERN = re.compile(r'^[A-Z][0-9]{1,2}$')

# Valid enum values
VALID_ENERGY_ACTIONS = ['consume', 'regenerate', 'status']
VALID_REPAIR_TYPES = ['standard', 'emergency', 'field']
VALID_DAMAGE_TYPES = ['collision', 'weapon', 'environment', 'system_failure']


class ValidationError(Exception):
    """Custom exception for validation errors."""
    def __init__(self, message: str, field: str = None):
        self.message = message
        self.field = field
        super().__init__(message)


def validate_string(value: Any, field_name: str, max_length: int = MAX_STRING_LENGTH,
                   pattern: re.Pattern = None, required: bool = True) -> Optional[str]:
    """Validate a string value."""
    if value is None:
        if required:
            raise ValidationError(f"{field_name} is required", field_name)
        return None

    if not isinstance(value, str):
        raise ValidationError(f"{field_name} must be a string", field_name)

    value = value.strip()

    if required and not value:
        raise ValidationError(f"{field_name} cannot be empty", field_name)

    if len(value) > max_length:
        raise ValidationError(f"{field_name} exceeds maximum length of {max_length}", field_name)

    if pattern and not pattern.match(value):
        raise ValidationError(f"{field_name} contains invalid characters", field_name)

    return value


def validate_int(value: Any, field_name: str, min_val: int = None, max_val: int = None,
                required: bool = True) -> Optional[int]:
    """Validate an integer value."""
    if value is None:
        if required:
            raise ValidationError(f"{field_name} is required", field_name)
        return None

    try:
        int_val = int(value)
    except (ValueError, TypeError):
        raise ValidationError(f"{field_name} must be an integer", field_name)

    if min_val is not None and int_val < min_val:
        raise ValidationError(f"{field_name} must be at least {min_val}", field_name)

    if max_val is not None and int_val > max_val:
        raise ValidationError(f"{field_name} must be at most {max_val}", field_name)

    return int_val


def validate_float(value: Any, field_name: str, min_val: float = None, max_val: float = None,
                  required: bool = True) -> Optional[float]:
    """Validate a float value."""
    if value is None:
        if required:
            raise ValidationError(f"{field_name} is required", field_name)
        return None

    try:
        float_val = float(value)
    except (ValueError, TypeError):
        raise ValidationError(f"{field_name} must be a number", field_name)

    if min_val is not None and float_val < min_val:
        raise ValidationError(f"{field_name} must be at least {min_val}", field_name)

    if max_val is not None and float_val > max_val:
        raise ValidationError(f"{field_name} must be at most {max_val}", field_name)

    return float_val


def validate_bool(value: Any, field_name: str, required: bool = True) -> Optional[bool]:
    """Validate a boolean value."""
    if value is None:
        if required:
            raise ValidationError(f"{field_name} is required", field_name)
        return None

    if isinstance(value, bool):
        return value

    if isinstance(value, str):
        if value.lower() in ('true', '1', 'yes'):
            return True
        if value.lower() in ('false', '0', 'no'):
            return False

    raise ValidationError(f"{field_name} must be a boolean", field_name)


def validate_list(value: Any, field_name: str, max_length: int = MAX_ARRAY_LENGTH,
                 item_validator: Callable = None, required: bool = True) -> Optional[List]:
    """Validate a list value."""
    if value is None:
        if required:
            raise ValidationError(f"{field_name} is required", field_name)
        return None

    if not isinstance(value, list):
        raise ValidationError(f"{field_name} must be a list", field_name)

    if len(value) > max_length:
        raise ValidationError(f"{field_name} exceeds maximum length of {max_length}", field_name)

    if item_validator:
        validated = []
        for i, item in enumerate(value):
            try:
                validated.append(item_validator(item, f"{field_name}[{i}]"))
            except ValidationError:
                raise
        return validated

    return value


def validate_dict(value: Any, field_name: str, required: bool = True) -> Optional[Dict]:
    """Validate a dictionary value."""
    if value is None:
        if required:
            raise ValidationError(f"{field_name} is required", field_name)
        return None

    if not isinstance(value, dict):
        raise ValidationError(f"{field_name} must be an object", field_name)

    return value


def validate_enum(value: Any, field_name: str, allowed_values: List[str],
                 required: bool = True) -> Optional[str]:
    """Validate that a value is one of allowed options."""
    if value is None:
        if required:
            raise ValidationError(f"{field_name} is required", field_name)
        return None

    if value not in allowed_values:
        raise ValidationError(
            f"{field_name} must be one of: {', '.join(allowed_values)}",
            field_name
        )

    return value


# Specific validators for game entities

def validate_mission_id(mission_id: str) -> str:
    """Validate a mission ID."""
    return validate_string(mission_id, 'mission_id', max_length=100, pattern=MISSION_ID_PATTERN)


def validate_system_name(system_name: str) -> str:
    """Validate a ship system name."""
    return validate_string(system_name, 'system_name', max_length=50, pattern=SYSTEM_NAME_PATTERN)


def validate_ship_type(ship_type: str) -> str:
    """Validate a ship type."""
    return validate_string(ship_type, 'ship_type', max_length=30, pattern=SHIP_TYPE_PATTERN)


def validate_faction(faction: str) -> str:
    """Validate a faction name."""
    return validate_string(faction, 'faction', max_length=30, pattern=FACTION_PATTERN)


def validate_coordinates(x: Any, y: Any, z: Any) -> tuple:
    """Validate 3D coordinates."""
    return (
        validate_int(x, 'x', min_val=MIN_COORDINATE, max_val=MAX_COORDINATE),
        validate_int(y, 'y', min_val=MIN_COORDINATE, max_val=MAX_COORDINATE),
        validate_int(z, 'z', min_val=MIN_COORDINATE, max_val=MAX_COORDINATE)
    )


def validate_seed(seed: Any, required: bool = False) -> Optional[int]:
    """Validate a random seed."""
    return validate_int(seed, 'seed', min_val=0, max_val=MAX_SEED, required=required)


def validate_damage_amount(amount: Any) -> float:
    """Validate a damage amount."""
    return validate_float(amount, 'damage', min_val=0, max_val=MAX_DAMAGE_AMOUNT)


def validate_repair_amount(amount: Any) -> float:
    """Validate a repair amount."""
    return validate_float(amount, 'repairAmount', min_val=0, max_val=MAX_REPAIR_AMOUNT)


def validate_energy_amount(amount: Any) -> float:
    """Validate an energy amount."""
    return validate_float(amount, 'amount', min_val=0, max_val=MAX_ENERGY_AMOUNT)


def validate_credits(credits: Any) -> int:
    """Validate a credits amount."""
    return validate_int(credits, 'credits', min_val=0, max_val=MAX_CREDITS)


def validate_num_systems(num: Any) -> int:
    """Validate number of systems for universe generation."""
    return validate_int(num, 'num_systems', min_val=1, max_val=MAX_NUM_SYSTEMS)


# Decorator for automatic validation error handling
def handle_validation_errors(f: Callable) -> Callable:
    """Decorator to catch validation errors and return proper HTTP responses."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except ValidationError as e:
            logger.warning(f"Validation error in {f.__name__}: {e.message}")
            return jsonify({
                'status': 'error',
                'message': e.message,
                'field': e.field
            }), 400
    return decorated_function


# Planet parameter validation
def validate_planet_parameters(params: Dict) -> Dict:
    """Validate planet generation parameters."""
    if not isinstance(params, dict):
        raise ValidationError("parameters must be an object", "parameters")

    validated = {}
    validated['noiseScale'] = validate_float(
        params.get('noiseScale'), 'noiseScale', min_val=0.001, max_val=100.0
    )
    validated['octaves'] = validate_int(
        params.get('octaves'), 'octaves', min_val=1, max_val=16
    )
    validated['persistence'] = validate_float(
        params.get('persistence'), 'persistence', min_val=0.0, max_val=1.0
    )
    validated['lacunarity'] = validate_float(
        params.get('lacunarity'), 'lacunarity', min_val=1.0, max_val=10.0
    )
    validated['terrainHeight'] = validate_float(
        params.get('terrainHeight'), 'terrainHeight', min_val=0.0, max_val=100.0
    )

    return validated


# Debug config validation
def validate_debug_config(config: Dict) -> Dict:
    """Validate debug configuration."""
    if not isinstance(config, dict):
        raise ValidationError("Configuration must be an object", "config")

    if 'channels' not in config:
        raise ValidationError("channels is required", "channels")

    if 'version' not in config:
        raise ValidationError("version is required", "version")

    channels = config.get('channels')
    if not isinstance(channels, dict):
        raise ValidationError("channels must be an object", "channels")

    # Validate each channel is a boolean
    for channel_name, enabled in channels.items():
        validate_string(channel_name, f"channel name '{channel_name}'", max_length=50)
        if not isinstance(enabled, bool):
            raise ValidationError(f"Channel '{channel_name}' must be a boolean", channel_name)

    return config


# Planet type validation
def validate_planet_type(planet_type: str, valid_types: List[str] = None) -> str:
    """Validate a planet type string.

    Args:
        planet_type: The planet type to validate
        valid_types: Optional list of valid planet types to check against

    Returns:
        The validated planet type string
    """
    validated = validate_string(planet_type, 'planetType', max_length=30, pattern=PLANET_TYPE_PATTERN)

    if valid_types and validated not in valid_types:
        raise ValidationError(
            f"Invalid planet type. Must be one of: {', '.join(valid_types)}",
            'planetType'
        )

    return validated


def validate_energy_action(action: str) -> str:
    """Validate an energy action."""
    return validate_enum(action, 'action', VALID_ENERGY_ACTIONS)


def validate_repair_type(repair_type: str) -> str:
    """Validate a repair type."""
    return validate_enum(repair_type, 'repairType', VALID_REPAIR_TYPES, required=False) or 'standard'


def validate_damage_type(damage_type: str) -> str:
    """Validate a damage type."""
    return validate_enum(damage_type, 'damageType', VALID_DAMAGE_TYPES, required=False) or 'collision'


def validate_sector_id(sector_id: str) -> str:
    """Validate a sector ID (e.g., 'A0', 'B5', 'Z99')."""
    return validate_string(sector_id, 'sectorId', max_length=3, pattern=SECTOR_ID_PATTERN)


def validate_hull_value(hull: Any) -> float:
    """Validate a hull health value (0.0 to 1.0)."""
    return validate_float(hull, 'hull', min_val=0.0, max_val=1.0)


def validate_ship_status_data(data: Dict) -> Dict:
    """Validate ship status data structure.

    Args:
        data: Dictionary containing ship status fields

    Returns:
        Validated ship status dictionary
    """
    if not isinstance(data, dict):
        raise ValidationError("Ship data must be an object", "data")

    validated = {}

    # Required fields
    validated['shipType'] = validate_ship_type(data.get('shipType'))
    validated['hull'] = validate_hull_value(data.get('hull'))
    validated['energy'] = validate_float(
        data.get('energy'), 'energy', min_val=0, max_val=MAX_ENERGY_AMOUNT
    )
    validated['systems'] = validate_dict(data.get('systems'), 'systems')

    # Optional fields
    if 'timestamp' in data:
        validated['timestamp'] = data.get('timestamp')  # Allow any format
    if 'location' in data:
        validated['location'] = validate_dict(data.get('location'), 'location', required=False)

    return validated


def validate_planet_config_data(data: Dict, valid_planet_types: List[str]) -> Dict:
    """Validate planet configuration data.

    Args:
        data: Dictionary containing planet config fields
        valid_planet_types: List of valid planet type names

    Returns:
        Validated planet config dictionary
    """
    if not isinstance(data, dict):
        raise ValidationError("Planet config must be an object", "data")

    validated = {}

    # Validate planet type
    validated['planetType'] = validate_planet_type(
        data.get('planetType'),
        valid_types=valid_planet_types
    )

    # Validate parameters
    params = data.get('parameters')
    if not params:
        raise ValidationError("parameters is required", "parameters")

    validated['parameters'] = validate_planet_parameters(params)

    return validated


def validate_json_body(allow_empty: bool = False) -> Dict:
    """Validate that the request has a valid JSON body.

    Args:
        allow_empty: If True, allow None/empty body

    Returns:
        The parsed JSON data

    Raises:
        ValidationError: If body is missing or invalid JSON
    """
    from flask import request
    import json

    try:
        data = request.get_json(force=True, silent=True)
    except json.JSONDecodeError:
        raise ValidationError("Invalid JSON in request body", "body")

    if data is None:
        if allow_empty:
            return {}
        raise ValidationError("Request body is required", "body")

    if not isinstance(data, dict):
        raise ValidationError("Request body must be a JSON object", "body")

    return data
