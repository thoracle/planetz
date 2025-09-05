"""
Object ID Generator
==================

This module provides a hierarchical ID generation system for all universe objects,
ensuring consistent, collision-free identification across the entire game universe.

ID Format: {namespace}_{sector}_{type}_{identifier}
"""

import hashlib
import time
from typing import Optional, Dict, Any
try:
    from backend.verse import get_universe_seed_from_env
except ImportError:
    # Fallback for when running from different directory
    from verse import get_universe_seed_from_env


class ObjectIDGenerator:
    """
    Generates consistent, hierarchical IDs for all universe objects.

    Supports multiple namespaces:
    - proc: Procedural objects (deterministic)
    - runtime: Runtime-created objects (unique)
    - mission: Mission-related objects (temporary)
    """

    def __init__(self, universe_seed: Optional[int] = None):
        """
        Initialize the ID generator.

        Args:
            universe_seed (int, optional): Universe seed for deterministic generation
        """
        if universe_seed is None:
            universe_seed = get_universe_seed_from_env()

        self.universe_seed = universe_seed
        self.runtime_counters: Dict[str, int] = {}  # Per-sector, per-type counters
        self.mission_counters: Dict[str, int] = {}  # Mission-specific counters

    def generate_procedural_id(self, sector: str, object_type: str, name_or_seed: Any) -> str:
        """
        Generate deterministic ID for procedural objects.

        Uses current naming conventions to maintain compatibility:
        - Stars: {sector}_star
        - Planets: {sector}_{planet_name}
        - Moons: {sector}_{moon_name}
        - Stations: {sector}_{station_name}

        Args:
            sector (str): Sector identifier (e.g., 'A0')
            object_type (str): Object type ('star', 'planet', 'moon', 'station', etc.)
            name_or_seed (str or int): Object name or seed for unnamed objects

        Returns:
            str: Generated procedural ID
        """
        if isinstance(name_or_seed, str):
            # For named objects - use current naming conventions
            clean_name = self._sanitize_name(name_or_seed)

            if object_type == 'star':
                return f"{sector}_star"
            elif object_type in ['planet', 'moon']:
                return f"{sector}_{clean_name}"
            else:  # stations, beacons, etc.
                return f"{sector}_{clean_name}"
        else:
            # For unnamed objects, use deterministic hash
            deterministic_hash = self._generate_deterministic_hash(
                sector, object_type, name_or_seed, self.universe_seed
            )
            return f"{sector}_{object_type}_{deterministic_hash[:8]}"

    def generate_runtime_id(self, sector: str, object_type: str, creator: str = "system") -> str:
        """
        Generate unique ID for runtime-created objects.

        Format: runtime_{sector}_{type}_{creator}_{counter}_{timestamp}

        Args:
            sector (str): Sector identifier
            object_type (str): Object type
            creator (str): Creator identifier (player, ai, system, etc.)

        Returns:
            str: Generated runtime ID
        """
        key = f"{sector}_{object_type}_{creator}"

        if key not in self.runtime_counters:
            self.runtime_counters[key] = 0

        self.runtime_counters[key] += 1
        counter = self.runtime_counters[key]

        # Add timestamp component for absolute uniqueness
        timestamp = int(time.time() * 1000) % 100000  # Last 5 digits

        return f"runtime_{sector}_{object_type}_{creator}_{counter:03d}_{timestamp}"

    def generate_mission_id(self, sector: str, mission_type: str, mission_id: str) -> str:
        """
        Generate ID for mission-related objects.

        Format: mission_{sector}_{mission_type}_{mission_id}

        Args:
            sector (str): Sector identifier
            mission_type (str): Mission type (waypoint, target, beacon, etc.)
            mission_id (str): Mission identifier

        Returns:
            str: Generated mission ID
        """
        return f"mission_{sector}_{mission_type}_{mission_id}"

    def parse_id(self, object_id: str) -> Dict[str, str]:
        """
        Parse an object ID and return its components.

        Args:
            object_id (str): Object ID to parse

        Returns:
            dict: Parsed components (namespace, sector, type, identifier)
        """
        parts = object_id.split('_', 3)

        # Handle current naming convention (sector_objectname)
        if len(parts) >= 2 and len(parts[0]) == 2 and parts[0][0] == 'A' and parts[0][1].isdigit():
            # Current format: A0_terra_prime, A0_star, etc.
            sector = parts[0]
            name_part = '_'.join(parts[1:])  # Rejoin the rest in case of underscores

            # Determine object type from name
            if name_part == 'star':
                obj_type = 'star'
                identifier = 'Sol'
            elif name_part == 'terra_prime':
                obj_type = 'planet'
                identifier = 'Terra Prime'
            elif name_part == 'luna':
                obj_type = 'moon'
                identifier = 'Luna'
            elif name_part == 'europa':
                obj_type = 'moon'
                identifier = 'Europa'
            else:
                # For other objects, try to infer type from name patterns
                obj_type = 'unknown'
                identifier = name_part.replace('_', ' ').title()

            return {
                'namespace': 'proc',
                'sector': sector,
                'type': obj_type,
                'identifier': identifier
            }

        # Handle standard namespace format
        if len(parts) >= 3:
            if parts[0] in ['proc', 'runtime', 'mission']:
                return {
                    'namespace': parts[0],
                    'sector': parts[1],
                    'type': parts[2],
                    'identifier': parts[3] if len(parts) > 3 else ''
                }

        # Fallback for unrecognized formats
        return {
            'namespace': 'unknown',
            'sector': parts[0] if len(parts) > 0 else 'unknown',
            'type': 'unknown',
            'identifier': object_id
        }

    def is_procedural_id(self, object_id: str) -> bool:
        """Check if ID is a procedural (deterministic) ID."""
        parsed = self.parse_id(object_id)
        return parsed['namespace'] == 'proc'

    def is_runtime_id(self, object_id: str) -> bool:
        """Check if ID is a runtime (unique) ID."""
        parsed = self.parse_id(object_id)
        return parsed['namespace'] == 'runtime'

    def is_mission_id(self, object_id: str) -> bool:
        """Check if ID is a mission-related ID."""
        parsed = self.parse_id(object_id)
        return parsed['namespace'] == 'mission'

    def get_sector_from_id(self, object_id: str) -> str:
        """Extract sector from object ID."""
        parsed = self.parse_id(object_id)
        return parsed['sector']

    def get_type_from_id(self, object_id: str) -> str:
        """Extract object type from object ID."""
        parsed = self.parse_id(object_id)
        return parsed['type']

    def _sanitize_name(self, name: str) -> str:
        """
        Convert name to ID-safe format.

        Matches current conventions used in verse.py and Star Charts.

        Args:
            name (str): Original name

        Returns:
            str: Sanitized name for ID use
        """
        return name.lower().replace(' ', '_').replace("'", "")

    def _generate_deterministic_hash(self, sector: str, object_type: str, seed: Any, universe_seed: int) -> str:
        """
        Generate deterministic hash for unnamed procedural objects.

        Args:
            sector (str): Sector identifier
            object_type (str): Object type
            seed (Any): Seed value
            universe_seed (int): Universe seed

        Returns:
            str: Deterministic hash
        """
        combined = f"{universe_seed}_{sector}_{object_type}_{seed}"
        return hashlib.md5(combined.encode()).hexdigest()

    def reset_runtime_counters(self) -> None:
        """Reset runtime counters (useful for testing)."""
        self.runtime_counters.clear()

    def reset_mission_counters(self) -> None:
        """Reset mission counters (useful for testing)."""
        self.mission_counters.clear()

    def get_stats(self) -> Dict[str, Any]:
        """
        Get generator statistics.

        Returns:
            dict: Statistics about generated IDs
        """
        return {
            'universe_seed': self.universe_seed,
            'runtime_counters': dict(self.runtime_counters),
            'mission_counters': dict(self.mission_counters),
            'total_runtime_objects': sum(self.runtime_counters.values()),
            'total_mission_objects': sum(self.mission_counters.values())
        }
