"""
VerseAdapter - Unified Interface to verse.py
===========================================

This module provides a unified interface to the existing verse.py functions,
bridging the gap between the current procedural generation system and the
new ObjectDatabase architecture.

Key Features:
- Caches sector data to avoid redundant generation
- Provides object lookup by ID
- Converts verse.py format to unified format when needed
- Maintains compatibility with existing systems
"""

import logging
import time

from backend.verse import (
    generate_star_system,
    generate_starter_system,
    get_current_universe_seed,
    get_universe_seed_from_env
)
from backend.data_adapter import DataStructureAdapter

logger = logging.getLogger(__name__)


class VerseAdapter:
    """
    Adapter class to provide unified interface to existing verse.py functions.

    This class acts as a bridge between the current verse.py procedural generation
    and the new ObjectDatabase system, providing caching and unified data access.
    """

    def __init__(self, universe_seed=None):
        """
        Initialize the VerseAdapter.

        Args:
            universe_seed (int, optional): Universe seed for procedural generation.
                                         If None, uses environment or current seed.
        """
        if universe_seed is None:
            universe_seed = get_universe_seed_from_env()

        self.universe_seed = universe_seed
        self._sector_cache = {}  # Cache for generated sector data
        self._cache_timestamps = {}  # Track when sectors were cached
        self._cache_timeout = 3600  # 1 hour cache timeout

    def get_object_static_data(self, object_id):
        """
        Get static data for an object by ID using current verse.py format.

        Args:
            object_id (str): Object ID in format "A0_star", "A0_terra_prime", etc.

        Returns:
            dict or None: Object data in verse.py format, or None if not found
        """
        try:
            # Parse object ID to get sector and name
            parts = object_id.split('_', 1)
            if len(parts) != 2:
                return None

            sector, name_part = parts

            # For now, only support A0 sector (Phase 1 scope)
            if sector != 'A0':
                return None

            # Load A0 data using current methods
            system = self._get_sector_data(sector)
            if not system:
                return None

            # Find object in current verse.py format
            if name_part == 'star':
                return self._format_star_data(system)
            elif name_part == 'terra_prime':
                return self._format_planet_data(system['planets'][0])
            elif name_part == 'luna':
                return self._format_moon_data(system['planets'][0]['moons'][0])
            elif name_part == 'europa':
                return self._format_moon_data(system['planets'][0]['moons'][1])

            return None

        except (TypeError, KeyError, ValueError, AttributeError) as e:
            logger.error(f"Error getting static data for {object_id}: {e}")
            return None

    def get_sector_objects(self, sector):
        """
        Get all object IDs in a sector.

        Args:
            sector (str): Sector identifier (e.g., 'A0')

        Returns:
            list: List of object IDs in the sector
        """
        sector_data = self._get_sector_data(sector)
        if not sector_data:
            return []

        object_ids = []

        # Add star
        object_ids.append(f"{sector}_star")

        # Add planets and moons
        for planet in sector_data.get('planets', []):
            planet_name = planet.get('planet_name', 'unknown')
            planet_id = f"{sector}_{planet_name.lower().replace(' ', '_')}"
            object_ids.append(planet_id)

            # Add moons
            for moon in planet.get('moons', []):
                moon_name = moon.get('moon_name', 'unknown')
                moon_id = f"{sector}_{moon_name.lower().replace(' ', '_')}"
                object_ids.append(moon_id)

        return object_ids

    def get_all_objects(self):
        """
        Get all object IDs in the universe (placeholder - Phase 1: A0 only).

        Returns:
            list: List of all object IDs
        """
        # Phase 1: Only A0 sector
        return self.get_sector_objects('A0')

    def _get_sector_data(self, sector):
        """
        Get sector data with caching.

        Args:
            sector (str): Sector identifier

        Returns:
            dict or None: Sector data in verse.py format
        """
        current_time = time.time()

        # Check cache
        if sector in self._sector_cache:
            cache_time = self._cache_timestamps.get(sector, 0)
            if current_time - cache_time < self._cache_timeout:
                return self._sector_cache[sector]

        # Generate fresh data
        try:
            if sector == 'A0':
                sector_data = generate_starter_system()
            else:
                # For other sectors, use procedural generation
                sector_data = generate_star_system(sector)

            if sector_data:
                self._sector_cache[sector] = sector_data
                self._cache_timestamps[sector] = current_time
                return sector_data

        except (TypeError, KeyError, ValueError, RuntimeError) as e:
            logger.error(f"Error generating sector {sector}: {e}")

        return None

    def _format_star_data(self, system):
        """Format star data in current verse.py style"""
        return {
            'id': 'A0_star',
            'name': system.get('star_name', 'Sol'),
            'type': 'star',
            'subtype': system.get('star_type', 'yellow dwarf'),
            'size': system.get('star_size', 2.0),
            'description': system.get('description', ''),
            'intel_brief': system.get('intel_brief', ''),
            'position': [0, 0, 0],
            'faction': 'neutral',
            'state': 'active'
        }

    def _format_planet_data(self, planet_data):
        """Format planet data in current verse.py style"""
        return {
            'id': f"A0_{planet_data.get('planet_name', 'unknown').lower().replace(' ', '_')}",
            'name': planet_data.get('planet_name', 'Unknown'),
            'type': 'planet',
            'subtype': planet_data.get('planet_type', 'Class-M'),
            'size': planet_data.get('planet_size', 1.0),
            'has_atmosphere': planet_data.get('has_atmosphere', True),
            'has_clouds': planet_data.get('has_clouds', True),
            'diplomacy': planet_data.get('diplomacy', 'neutral'),
            'government': planet_data.get('government', 'Unknown'),
            'economy': planet_data.get('economy', 'Unknown'),
            'technology': planet_data.get('technology', 'Unknown'),
            'description': planet_data.get('description', ''),
            'intel_brief': planet_data.get('intel_brief', ''),
            'params': planet_data.get('params', {}),
            'moons': planet_data.get('moons', []),
            'faction': planet_data.get('diplomacy', 'neutral'),
            'state': 'inhabited' if planet_data.get('has_atmosphere') else 'barren'
        }

    def _format_moon_data(self, moon_data):
        """Format moon data in current verse.py style"""
        return {
            'id': f"A0_{moon_data.get('moon_name', 'unknown').lower().replace(' ', '_')}",
            'name': moon_data.get('moon_name', 'Unknown'),
            'type': 'moon',
            'subtype': moon_data.get('moon_type', 'rocky'),
            'size': moon_data.get('moon_size', 0.3),
            'diplomacy': moon_data.get('diplomacy', 'neutral'),
            'government': moon_data.get('government', 'Unknown'),
            'economy': moon_data.get('economy', 'Unknown'),
            'technology': moon_data.get('technology', 'Unknown'),
            'description': moon_data.get('description', ''),
            'intel_brief': moon_data.get('intel_brief', ''),
            'faction': moon_data.get('diplomacy', 'neutral'),
            'state': 'barren'
        }

    def clear_cache(self):
        """Clear the sector cache (useful for testing or forced refresh)"""
        self._sector_cache.clear()
        self._cache_timestamps.clear()

    def get_cache_stats(self):
        """Get cache statistics for debugging"""
        return {
            'cached_sectors': list(self._sector_cache.keys()),
            'cache_size': len(self._sector_cache),
            'cache_timeout': self._cache_timeout
        }
