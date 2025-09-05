"""
Data Structure Compatibility Layer
==================================

This module provides adapters to bridge between the current verse.py format
and the unified ObjectDatabase format, enabling incremental migration.

Key Components:
- DataStructureAdapter: Main adapter class for format conversions
- Compatibility helpers for field mapping
- Error handling for missing or malformed data
"""

class DataStructureAdapter:
    """Bridge between current verse.py format and unified ObjectDatabase format"""

    @staticmethod
    def verse_to_unified_format(verse_system):
        """
        Convert current verse.py star system format to unified ObjectDatabase format

        Args:
            verse_system (dict): Current verse.py format with keys like:
                - star_type, star_name, star_size
                - planets: list of planet dicts
                - description, intel_brief

        Returns:
            dict: Unified format with keys like:
                - star: dict with id, name, type, etc.
                - celestial_bodies: list of planet/moon dicts
                - infrastructure: list of stations/beacons
        """
        if not verse_system:
            return None

        # Convert star data
        unified_system = {
            'sector': 'A0',  # For now, assume A0 since that's what we're working with
            'star': DataStructureAdapter._convert_star_data(verse_system),
            'celestial_bodies': [],
            'infrastructure': []
        }

        # Convert planets
        for planet_data in verse_system.get('planets', []):
            planet = DataStructureAdapter._convert_planet_data(planet_data)
            unified_system['celestial_bodies'].append(planet)

        return unified_system

    @staticmethod
    def star_charts_to_unified_format(star_charts_data):
        """
        Convert Star Charts JSON format to unified ObjectDatabase format

        Args:
            star_charts_data (dict): Star Charts format from data/star_charts/objects.json

        Returns:
            dict: Unified format
        """
        if not star_charts_data:
            return None

        # For now, return as-is since Star Charts already uses object IDs
        # This can be enhanced later if needed
        return star_charts_data

    @staticmethod
    def unified_to_frontend_format(unified_object):
        """
        Convert unified ObjectDatabase format back to current frontend expectations

        Args:
            unified_object (dict): Unified format object

        Returns:
            dict: Frontend-compatible format
        """
        if not unified_object:
            return None

        object_type = unified_object.get('type')

        if object_type == 'planet':
            return DataStructureAdapter._unified_planet_to_frontend(unified_object)
        elif object_type == 'moon':
            return DataStructureAdapter._unified_moon_to_frontend(unified_object)
        elif object_type == 'star':
            return DataStructureAdapter._unified_star_to_frontend(unified_object)
        else:
            # For stations, beacons, etc., return mostly as-is
            return unified_object

    @staticmethod
    def _convert_star_data(verse_star_data):
        """Convert verse.py star format to unified format"""
        return {
            'id': 'A0_star',  # Use current Star Charts convention
            'name': verse_star_data.get('star_name', 'Unknown'),
            'type': 'star',
            'subtype': verse_star_data.get('star_type', 'unknown'),
            'position': [0, 0, 0],  # Stars are at origin
            'size': verse_star_data.get('star_size', 2.0),
            'description': verse_star_data.get('description', ''),
            'intel_brief': verse_star_data.get('intel_brief', ''),
            'initial_faction': 'neutral',
            'initial_state': 'active'
        }

    @staticmethod
    def _convert_planet_data(verse_planet_data):
        """Convert verse.py planet format to unified format"""
        return {
            'id': f"A0_{verse_planet_data.get('planet_name', 'unknown').lower().replace(' ', '_')}",
            'name': verse_planet_data.get('planet_name', 'Unknown'),
            'type': 'planet',
            'subtype': verse_planet_data.get('planet_type', 'Class-M'),
            'parent_id': 'A0_star',
            'position': [0, 0, 0],  # Will be set by positioning system
            'size': verse_planet_data.get('planet_size', 1.0),
            'has_atmosphere': verse_planet_data.get('has_atmosphere', True),
            'has_clouds': verse_planet_data.get('has_clouds', True),
            'diplomacy': verse_planet_data.get('diplomacy', 'neutral'),
            'government': verse_planet_data.get('government', 'Unknown'),
            'economy': verse_planet_data.get('economy', 'Unknown'),
            'technology': verse_planet_data.get('technology', 'Unknown'),
            'description': verse_planet_data.get('description', ''),
            'intel_brief': verse_planet_data.get('intel_brief', ''),
            'params': verse_planet_data.get('params', {}),
            'moons': [DataStructureAdapter._convert_moon_data(moon) for moon in verse_planet_data.get('moons', [])],
            'initial_faction': verse_planet_data.get('diplomacy', 'neutral'),
            'initial_state': 'inhabited' if verse_planet_data.get('has_atmosphere') else 'barren'
        }

    @staticmethod
    def _convert_moon_data(verse_moon_data):
        """Convert verse.py moon format to unified format"""
        return {
            'id': f"A0_{verse_moon_data.get('moon_name', 'unknown').lower().replace(' ', '_')}",
            'name': verse_moon_data.get('moon_name', 'Unknown'),
            'type': 'moon',
            'subtype': verse_moon_data.get('moon_type', 'rocky'),
            'parent_id': None,  # Will be set to planet ID
            'position': [0, 0, 0],  # Will be set by positioning system
            'size': verse_moon_data.get('moon_size', 0.3),
            'diplomacy': verse_moon_data.get('diplomacy', 'neutral'),
            'government': verse_moon_data.get('government', 'Unknown'),
            'economy': verse_moon_data.get('economy', 'Unknown'),
            'technology': verse_moon_data.get('technology', 'Unknown'),
            'description': verse_moon_data.get('description', ''),
            'intel_brief': verse_moon_data.get('intel_brief', ''),
            'initial_faction': verse_moon_data.get('diplomacy', 'neutral'),
            'initial_state': 'barren'
        }

    @staticmethod
    def _unified_planet_to_frontend(unified_planet):
        """Convert unified planet format to current frontend expectations"""
        return {
            'planet_name': unified_planet.get('name', 'Unknown'),
            'planet_type': unified_planet.get('subtype', 'Class-M'),
            'planet_size': unified_planet.get('size', 1.0),
            'has_atmosphere': unified_planet.get('has_atmosphere', True),
            'has_clouds': unified_planet.get('has_clouds', True),
            'diplomacy': unified_planet.get('diplomacy', unified_planet.get('initial_faction', 'neutral')),
            'government': unified_planet.get('government', 'Unknown'),
            'economy': unified_planet.get('economy', 'Unknown'),
            'technology': unified_planet.get('technology', 'Unknown'),
            'description': unified_planet.get('description', ''),
            'intel_brief': unified_planet.get('intel_brief', ''),
            'params': unified_planet.get('params', {}),
            'moons': [DataStructureAdapter._unified_moon_to_frontend(moon) for moon in unified_planet.get('moons', [])]
        }

    @staticmethod
    def _unified_moon_to_frontend(unified_moon):
        """Convert unified moon format to current frontend expectations"""
        return {
            'moon_name': unified_moon.get('name', 'Unknown'),
            'moon_type': unified_moon.get('subtype', 'rocky'),
            'moon_size': unified_moon.get('size', 0.3),
            'diplomacy': unified_moon.get('diplomacy', unified_moon.get('initial_faction', 'neutral')),
            'government': unified_moon.get('government', 'Unknown'),
            'economy': unified_moon.get('economy', 'Unknown'),
            'technology': unified_moon.get('technology', 'Unknown'),
            'description': unified_moon.get('description', ''),
            'intel_brief': unified_moon.get('intel_brief', '')
        }

    @staticmethod
    def _unified_star_to_frontend(unified_star):
        """Convert unified star format to current frontend expectations"""
        return {
            'star_name': unified_star.get('name', 'Unknown'),
            'star_type': unified_star.get('subtype', 'yellow dwarf'),
            'star_size': unified_star.get('size', 2.0),
            'description': unified_star.get('description', ''),
            'intel_brief': unified_star.get('intel_brief', '')
        }
