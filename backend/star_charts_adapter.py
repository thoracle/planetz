"""
StarChartsAdapter - Integration with Existing Star Charts System
================================================================

This module provides an adapter for the existing star_charts/objects.json file,
allowing the new ObjectDatabase system to work seamlessly with the current
Star Charts discovery and navigation system.

Key Features:
- Loads and caches existing Star Charts database
- Provides unified interface for object lookup
- Maintains compatibility with current Star Charts format
- Enables incremental migration path
"""

import json
import os
from typing import Dict, List, Optional, Any


class StarChartsAdapter:
    """
    Adapter for existing star_charts/objects.json database.

    This class provides a clean interface to the existing Star Charts system
    while preparing for integration with the unified ObjectDatabase.
    """

    def __init__(self):
        """Initialize the StarChartsAdapter."""
        self.star_charts_data = None
        self._data_loaded = False
        self._file_path = 'data/star_charts/objects.json'

    def load_star_charts_data(self) -> bool:
        """
        Load existing Star Charts database from JSON file.

        Returns:
            bool: True if data loaded successfully, False otherwise
        """
        try:
            if not os.path.exists(self._file_path):
                print(f"Warning: Star Charts file not found: {self._file_path}")
                return False

            with open(self._file_path, 'r', encoding='utf-8') as f:
                self.star_charts_data = json.load(f)

            self._data_loaded = True
            print(f"✅ Loaded Star Charts database: {self.star_charts_data.get('metadata', {}).get('total_sectors', 'unknown')} sectors")
            return True

        except json.JSONDecodeError as e:
            print(f"❌ Error parsing Star Charts JSON: {e}")
            return False
        except Exception as e:
            print(f"❌ Error loading Star Charts data: {e}")
            return False

    def get_sector_data(self, sector: str) -> Optional[Dict[str, Any]]:
        """
        Get data for a specific sector.

        Args:
            sector (str): Sector identifier (e.g., 'A0')

        Returns:
            dict or None: Sector data if found, None otherwise
        """
        if not self._ensure_data_loaded():
            return None

        sectors = self.star_charts_data.get('sectors', {})
        return sectors.get(sector)

    def get_object_by_id(self, object_id: str) -> Optional[Dict[str, Any]]:
        """
        Get object data by ID from Star Charts database.

        Args:
            object_id (str): Object ID (e.g., 'A0_star', 'A0_terra_prime')

        Returns:
            dict or None: Object data if found, None otherwise
        """
        if not self._ensure_data_loaded():
            return None

        try:
            # Parse object ID (format: sector_name)
            parts = object_id.split('_', 1)
            if len(parts) != 2:
                return None

            sector, name_part = parts
            sector_data = self.get_sector_data(sector)

            if not sector_data:
                return None

            # Check star
            if name_part == 'star' and sector_data.get('star'):
                return sector_data['star']

            # Check objects array
            for obj in sector_data.get('objects', []):
                if obj.get('id') == object_id:
                    return obj

            return None

        except Exception as e:
            print(f"Error finding object {object_id}: {e}")
            return None

    def get_all_sector_objects(self, sector: str) -> List[str]:
        """
        Get all object IDs in a sector.

        Args:
            sector (str): Sector identifier

        Returns:
            list: List of object IDs in the sector
        """
        sector_data = self.get_sector_data(sector)
        if not sector_data:
            return []

        object_ids = []

        # Add star
        if sector_data.get('star', {}).get('id'):
            object_ids.append(sector_data['star']['id'])

        # Add objects from objects array
        for obj in sector_data.get('objects', []):
            if obj.get('id'):
                object_ids.append(obj['id'])

        return object_ids

    def get_all_sectors(self) -> List[str]:
        """
        Get list of all available sectors.

        Returns:
            list: List of sector identifiers
        """
        if not self._ensure_data_loaded():
            return []

        sectors = self.star_charts_data.get('sectors', {})
        return list(sectors.keys())

    def get_metadata(self) -> Optional[Dict[str, Any]]:
        """
        Get metadata from the Star Charts database.

        Returns:
            dict or None: Metadata if available
        """
        if not self._ensure_data_loaded():
            return None

        return self.star_charts_data.get('metadata')

    def search_objects(self, query: str, sector: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Search for objects by name or type.

        Args:
            query (str): Search query (case-insensitive)
            sector (str, optional): Limit search to specific sector

        Returns:
            list: List of matching objects
        """
        if not self._ensure_data_loaded():
            return []

        results = []
        query_lower = query.lower()

        sectors_to_search = [sector] if sector else self.get_all_sectors()

        for sector_id in sectors_to_search:
            sector_data = self.get_sector_data(sector_id)
            if not sector_data:
                continue

            # Search star
            star = sector_data.get('star')
            if star and (query_lower in star.get('name', '').lower() or
                        query_lower in star.get('type', '').lower()):
                results.append(star)

            # Search objects
            for obj in sector_data.get('objects', []):
                if (query_lower in obj.get('name', '').lower() or
                    query_lower in obj.get('type', '').lower() or
                    query_lower in obj.get('class', '').lower()):
                    results.append(obj)

        return results

    def get_objects_by_type(self, object_type: str, sector: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all objects of a specific type.

        Args:
            object_type (str): Object type to filter by
            sector (str, optional): Limit to specific sector

        Returns:
            list: List of objects of the specified type
        """
        if not self._ensure_data_loaded():
            return []

        results = []
        sectors_to_search = [sector] if sector else self.get_all_sectors()

        for sector_id in sectors_to_search:
            sector_data = self.get_sector_data(sector_id)
            if not sector_data:
                continue

            # Check star
            star = sector_data.get('star')
            if star and star.get('type') == object_type:
                results.append(star)

            # Check objects
            for obj in sector_data.get('objects', []):
                if obj.get('type') == object_type:
                    results.append(obj)

        return results

    def _ensure_data_loaded(self) -> bool:
        """
        Ensure Star Charts data is loaded.

        Returns:
            bool: True if data is loaded, False otherwise
        """
        if not self._data_loaded:
            return self.load_star_charts_data()
        return True

    def reload_data(self) -> bool:
        """
        Force reload of Star Charts data.

        Returns:
            bool: True if reload successful, False otherwise
        """
        self._data_loaded = False
        return self.load_star_charts_data()

    def get_stats(self) -> Dict[str, Any]:
        """
        Get statistics about the Star Charts database.

        Returns:
            dict: Database statistics
        """
        if not self._ensure_data_loaded():
            return {'error': 'Data not loaded'}

        metadata = self.get_metadata()
        sectors = self.get_all_sectors()

        total_objects = 0
        for sector in sectors:
            total_objects += len(self.get_all_sector_objects(sector))

        return {
            'total_sectors': len(sectors),
            'total_objects': total_objects,
            'sectors': sectors,
            'metadata': metadata,
            'data_loaded': self._data_loaded
        }
