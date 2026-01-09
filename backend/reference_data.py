"""
Reference Data Manager
=====================

This module provides a centralized manager for all reference data used
throughout the game universe, including factions, object types, planet
classes, and diplomacy states.
"""

import json
import os
import logging
from typing import Dict, List, Optional, Any
from pathlib import Path

logger = logging.getLogger(__name__)


class ReferenceDataManager:
    """
    Centralized manager for reference data.

    Loads and provides access to all static reference data used by the game,
    including factions, object types, planet classes, and diplomacy states.
    """

    def __init__(self):
        """Initialize the reference data manager."""
        self._data_dir = Path(__file__).parent.parent / 'data' / 'reference'

        # Core data stores
        self.factions: Dict[str, Any] = {}
        self.object_types: Dict[str, Any] = {}
        self.planet_classes: Dict[str, Any] = {}
        self.diplomacy_states: Dict[str, Any] = {}

        # Metadata
        self.metadata: Dict[str, Any] = {}

        # Load all reference data
        self._load_all_data()

    def _load_all_data(self) -> None:
        """Load all reference data files."""
        try:
            self.factions = self._load_json_file('factions.json')
            self.object_types = self._load_json_file('object_types.json')
            self.planet_classes = self._load_json_file('planet_classes.json')
            self.diplomacy_states = self._load_json_file('diplomacy_states.json')

            # Extract metadata
            self.metadata = {
                'factions_count': len(self.factions.get('factions', {})),
                'object_types_count': len(self.object_types.get('objectTypes', {})),
                'planet_classes_count': len(self.planet_classes.get('planetClasses', {})),
                'diplomacy_states_count': len(self.diplomacy_states.get('diplomacyStates', {})),
                'last_updated': self._get_latest_update_time()
            }

        except Exception as e:
            logger.error(f"Error loading reference data: {e}")
            # Continue with empty data structures

    def _load_json_file(self, filename: str) -> Dict[str, Any]:
        """
        Load a JSON file from the reference data directory.

        Args:
            filename (str): Name of the JSON file to load

        Returns:
            dict: Loaded JSON data, or empty dict if file not found/error
        """
        file_path = self._data_dir / filename

        if not file_path.exists():
            logger.warning(f"Reference data file not found: {file_path}")
            return {}

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Error parsing {filename}: {e}")
            return {}
        except Exception as e:
            logger.error(f"Error loading {filename}: {e}")
            return {}

    def _get_latest_update_time(self) -> Optional[str]:
        """Get the latest update time from all reference files."""
        latest_time = None

        for filename in ['factions.json', 'object_types.json', 'planet_classes.json', 'diplomacy_states.json']:
            file_path = self._data_dir / filename
            if file_path.exists():
                try:
                    mtime = os.path.getmtime(file_path)
                    if latest_time is None or mtime > latest_time:
                        latest_time = mtime
                except Exception:
                    continue

        if latest_time:
            import time
            return time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(latest_time))

        return None

    # Faction methods
    def get_faction_info(self, faction_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific faction.

        Args:
            faction_id (str): Faction identifier

        Returns:
            dict or None: Faction information if found
        """
        factions = self.factions.get('factions', {})
        return factions.get(faction_id)

    def get_all_factions(self) -> List[str]:
        """
        Get list of all faction IDs.

        Returns:
            list: List of faction identifiers
        """
        factions = self.factions.get('factions', {})
        return list(factions.keys())

    def get_faction_color(self, faction_id: str) -> str:
        """
        Get the color associated with a faction.

        Args:
            faction_id (str): Faction identifier

        Returns:
            str: Hex color code, or default if not found
        """
        faction = self.get_faction_info(faction_id)
        return faction.get('color', '#ffffff') if faction else '#ffffff'

    # Object type methods
    def get_object_type_info(self, object_type: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific object type.

        Args:
            object_type (str): Object type identifier

        Returns:
            dict or None: Object type information if found
        """
        object_types = self.object_types.get('objectTypes', {})
        return object_types.get(object_type)

    def get_all_object_types(self) -> List[str]:
        """
        Get list of all object type IDs.

        Returns:
            list: List of object type identifiers
        """
        object_types = self.object_types.get('objectTypes', {})
        return list(object_types.keys())

    def get_object_types_by_category(self, category: str) -> List[str]:
        """
        Get object types belonging to a specific category.

        Args:
            category (str): Category name

        Returns:
            list: List of object types in the category
        """
        categories = self.object_types.get('categories', {})
        return categories.get(category, [])

    # Planet class methods
    def get_planet_class_info(self, planet_class: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific planet class.

        Args:
            planet_class (str): Planet class identifier (e.g., 'Class-M')

        Returns:
            dict or None: Planet class information if found
        """
        planet_classes = self.planet_classes.get('planetClasses', {})
        return planet_classes.get(planet_class)

    def get_all_planet_classes(self) -> List[str]:
        """
        Get list of all planet class IDs.

        Returns:
            list: List of planet class identifiers
        """
        planet_classes = self.planet_classes.get('planetClasses', {})
        return list(planet_classes.keys())

    def get_planet_class_params(self, planet_class: str) -> Optional[Dict[str, Any]]:
        """
        Get terrain generation parameters for a planet class.

        Args:
            planet_class (str): Planet class identifier

        Returns:
            dict or None: Terrain parameters if found
        """
        planet_info = self.get_planet_class_info(planet_class)
        return planet_info.get('params') if planet_info else None

    # Diplomacy methods
    def get_diplomacy_state_info(self, state: str) -> Optional[Dict[str, Any]]:
        """
        Get information about a specific diplomacy state.

        Args:
            state (str): Diplomacy state identifier

        Returns:
            dict or None: Diplomacy state information if found
        """
        diplomacy_states = self.diplomacy_states.get('diplomacyStates', {})
        return diplomacy_states.get(state)

    def get_all_diplomacy_states(self) -> List[str]:
        """
        Get list of all diplomacy state IDs.

        Returns:
            list: List of diplomacy state identifiers
        """
        diplomacy_states = self.diplomacy_states.get('diplomacyStates', {})
        return list(diplomacy_states.keys())

    def get_diplomacy_transitions(self, from_state: str) -> Optional[Dict[str, Any]]:
        """
        Get possible transitions from a diplomacy state.

        Args:
            from_state (str): Current diplomacy state

        Returns:
            dict or None: Transition information if found
        """
        transitions = self.diplomacy_states.get('transitions', {})
        return transitions.get(from_state)

    def can_transition_diplomacy(self, from_state: str, to_state: str) -> bool:
        """
        Check if a diplomacy transition is allowed.

        Args:
            from_state (str): Current diplomacy state
            to_state (str): Target diplomacy state

        Returns:
            bool: True if transition is allowed
        """
        transitions = self.get_diplomacy_transitions(from_state)
        if not transitions:
            return False

        can_transition_to = transitions.get('canTransitionTo', [])
        return to_state in can_transition_to

    # Utility methods
    def reload_data(self) -> None:
        """Reload all reference data from files."""
        self._load_all_data()

    def get_stats(self) -> Dict[str, Any]:
        """
        Get statistics about loaded reference data.

        Returns:
            dict: Reference data statistics
        """
        return {
            'metadata': self.metadata,
            'files_loaded': {
                'factions': bool(self.factions),
                'object_types': bool(self.object_types),
                'planet_classes': bool(self.planet_classes),
                'diplomacy_states': bool(self.diplomacy_states)
            },
            'data_counts': {
                'factions': len(self.factions.get('factions', {})),
                'object_types': len(self.object_types.get('objectTypes', {})),
                'planet_classes': len(self.planet_classes.get('planetClasses', {})),
                'diplomacy_states': len(self.diplomacy_states.get('diplomacyStates', {}))
            }
        }

    def validate_data_integrity(self) -> List[str]:
        """
        Validate the integrity of loaded reference data.

        Returns:
            list: List of validation errors (empty if all valid)
        """
        errors = []

        # Check that required data is loaded
        if not self.factions:
            errors.append("Factions data not loaded")
        if not self.object_types:
            errors.append("Object types data not loaded")
        if not self.planet_classes:
            errors.append("Planet classes data not loaded")
        if not self.diplomacy_states:
            errors.append("Diplomacy states data not loaded")

        # Check for required faction references
        if self.factions and 'factions' in self.factions:
            factions = self.factions['factions']
            required_factions = ['friendly', 'neutral', 'enemy', 'unknown']
            for faction in required_factions:
                if faction not in factions:
                    errors.append(f"Required faction '{faction}' not found")

        # Check for required planet classes
        if self.planet_classes and 'planetClasses' in self.planet_classes:
            planet_classes = self.planet_classes['planetClasses']
            required_classes = ['Class-M', 'Class-L', 'Class-H', 'Class-D', 'Class-J', 'Class-K', 'Class-N', 'Class-Y']
            for planet_class in required_classes:
                if planet_class not in planet_classes:
                    errors.append(f"Required planet class '{planet_class}' not found")

        return errors
