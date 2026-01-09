"""
Infrastructure Loader
====================

This module handles loading and processing of infrastructure data,
including stations, beacons, and other persistent structures.
"""

import json
import logging
import math
import os
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)

def load_starter_infrastructure_template() -> Dict[str, Any]:
    """
    Load A0 infrastructure template from existing JSON file.

    Returns:
        dict: Infrastructure data with stations and beacons
    """
    file_path = 'data/starter_system_infrastructure.json'

    if not os.path.exists(file_path):
        logger.warning(f"Infrastructure file not found: {file_path}")
        return {'stations': [], 'beacons': []}

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing infrastructure JSON: {e}")
        return {'stations': [], 'beacons': []}
    except (IOError, OSError) as e:
        logger.error(f"Error loading infrastructure file: {e}")
        return {'stations': [], 'beacons': []}


def convert_stations_to_verse_format(stations_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Convert station data from infrastructure JSON to verse.py compatible format.

    Args:
        stations_data (list): List of station data from infrastructure JSON

    Returns:
        list: Stations in verse.py compatible format
    """
    converted_stations = []

    for station in stations_data:
        # Convert 2D coordinates to 3D
        position_2d = station.get('position', [0, 0])
        if len(position_2d) == 2:
            # Convert polar coordinates (r, theta) to cartesian (x, z) with y=0
            r = position_2d[0]
            theta_deg = position_2d[1]
            theta_rad = math.radians(theta_deg)
            x = r * math.cos(theta_rad)
            z = r * math.sin(theta_rad)
            position_3d = [x, 0, z]
        else:
            position_3d = position_2d

        converted = {
            'id': station.get('id', ''),
            'name': station.get('name', 'Unknown Station'),
            'type': station.get('type', 'station'),
            'faction': station.get('faction', 'neutral'),
            'position': position_3d,
            'services': station.get('services', []),
            'size': station.get('size', 1.0),
            'description': station.get('description', ''),
            'intel_brief': station.get('intel_brief', ''),
            'color': station.get('color', '#ffffff')
        }
        converted_stations.append(converted)

    return converted_stations


def convert_beacons_to_verse_format(beacons_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Convert beacon data from infrastructure JSON to verse.py compatible format.

    Args:
        beacons_data (list): List of beacon data from infrastructure JSON

    Returns:
        list: Beacons in verse.py compatible format
    """
    converted_beacons = []

    for beacon in beacons_data:
        converted = {
            'id': beacon.get('id', ''),
            'name': beacon.get('name', 'Unknown Beacon'),
            'type': 'navigation_beacon',
            'position': beacon.get('position', [0, 0, 0]),
            'description': beacon.get('description', ''),
            'color': beacon.get('color', '#ffff44')
        }
        converted_beacons.append(converted)

    return converted_beacons


def merge_infrastructure_with_verse_system(verse_system: Dict[str, Any],
                                         infrastructure_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge infrastructure data with verse.py star system data.

    Args:
        verse_system (dict): Star system data from verse.py
        infrastructure_data (dict): Infrastructure data from JSON

    Returns:
        dict: Merged system data
    """
    merged = verse_system.copy()

    # Add infrastructure section if it doesn't exist
    if 'infrastructure' not in merged:
        merged['infrastructure'] = []

    # Convert and add stations
    stations = convert_stations_to_verse_format(infrastructure_data.get('stations', []))
    for station in stations:
        merged['infrastructure'].append(station)

    # Convert and add beacons
    beacons = convert_beacons_to_verse_format(infrastructure_data.get('beacons', []))
    for beacon in beacons:
        merged['infrastructure'].append(beacon)

    return merged


def get_infrastructure_stats(infrastructure_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Get statistics about infrastructure data.

    Args:
        infrastructure_data (dict): Infrastructure data

    Returns:
        dict: Statistics about the infrastructure
    """
    stations = infrastructure_data.get('stations', [])
    beacons = infrastructure_data.get('beacons', [])

    station_types = {}
    for station in stations:
        station_type = station.get('type', 'unknown')
        station_types[station_type] = station_types.get(station_type, 0) + 1

    faction_counts = {}
    for station in stations:
        faction = station.get('faction', 'unknown')
        faction_counts[faction] = faction_counts.get(faction, 0) + 1

    return {
        'total_stations': len(stations),
        'total_beacons': len(beacons),
        'station_types': station_types,
        'faction_counts': faction_counts,
        'total_infrastructure': len(stations) + len(beacons)
    }


def validate_infrastructure_data(infrastructure_data: Dict[str, Any]) -> List[str]:
    """
    Validate infrastructure data for required fields and consistency.

    Args:
        infrastructure_data (dict): Infrastructure data to validate

    Returns:
        list: List of validation errors (empty if valid)
    """
    errors = []

    # Check required top-level keys
    if 'stations' not in infrastructure_data:
        errors.append("Missing 'stations' key")
    if 'beacons' not in infrastructure_data:
        errors.append("Missing 'beacons' key")

    # Validate stations
    for i, station in enumerate(infrastructure_data.get('stations', [])):
        if 'id' not in station:
            errors.append(f"Station {i}: Missing 'id' field")
        if 'name' not in station:
            errors.append(f"Station {i}: Missing 'name' field")
        if 'position' not in station:
            errors.append(f"Station {i}: Missing 'position' field")

    # Validate beacons
    for i, beacon in enumerate(infrastructure_data.get('beacons', [])):
        if 'id' not in beacon:
            errors.append(f"Beacon {i}: Missing 'id' field")
        if 'name' not in beacon:
            errors.append(f"Beacon {i}: Missing 'name' field")
        if 'position' not in beacon:
            errors.append(f"Beacon {i}: Missing 'position' field")

    return errors


def load_and_validate_infrastructure() -> Optional[Dict[str, Any]]:
    """
    Load infrastructure data and validate it.

    Returns:
        dict or None: Validated infrastructure data, or None if invalid
    """
    infrastructure_data = load_starter_infrastructure_template()

    if not infrastructure_data:
        return None

    validation_errors = validate_infrastructure_data(infrastructure_data)

    if validation_errors:
        logger.error("Infrastructure validation errors:")
        for error in validation_errors:
            logger.error(f"  - {error}")
        return None

    # Log stats
    stats = get_infrastructure_stats(infrastructure_data)
    logger.info(f"Infrastructure loaded successfully: {stats['total_stations']} stations, "
                f"{stats['total_beacons']} beacons, {stats['total_infrastructure']} total objects")

    return infrastructure_data
