"""
Infrastructure Positioning System
================================

This module handles positioning of space infrastructure (stations, beacons)
within star systems, integrating with the existing infrastructure data.

Key Features:
- Orbital positioning for space stations
- Navigation beacon placement
- Infrastructure clustering around planets
- Collision avoidance with celestial bodies
"""

import math
import random
from typing import Dict, List, Optional, Any, Tuple
from backend.infrastructure_loader import load_starter_infrastructure_template


class InfrastructurePositioning:
    """
    Positions infrastructure objects within star systems.

    This class handles the placement of space stations, navigation beacons,
    and other infrastructure objects in realistic orbital positions.
    """

    def __init__(self, universe_seed: Optional[int] = None):
        """
        Initialize the infrastructure positioning system.

        Args:
            universe_seed (int, optional): Seed for consistent positioning
        """
        self.universe_seed = universe_seed or 20299999
        self.random = random.Random(self.universe_seed)

        # Positioning constants
        self.STATION_ORBIT_HEIGHT = 5.0  # Distance above planet surface
        self.BEACON_SPACING = 200.0  # Distance between navigation beacons
        self.MIN_STATION_DISTANCE = 10.0  # Minimum distance between stations

    def position_infrastructure(self, star_system: Dict[str, Any],
                              infrastructure_data: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Add positioned infrastructure to a star system.

        Args:
            star_system (dict): Star system with celestial bodies
            infrastructure_data (dict, optional): Infrastructure data to position

        Returns:
            dict: Star system with positioned infrastructure
        """
        enhanced = star_system.copy()

        # Load infrastructure data if not provided
        if infrastructure_data is None:
            infrastructure_data = load_starter_infrastructure_template()

        if not infrastructure_data:
            return enhanced

        # Position stations
        if 'stations' in infrastructure_data:
            positioned_stations = self._position_stations(
                infrastructure_data['stations'],
                star_system
            )
            enhanced['infrastructure'] = enhanced.get('infrastructure', [])
            enhanced['infrastructure'].extend(positioned_stations)

        # Position beacons
        if 'beacons' in infrastructure_data:
            positioned_beacons = self._position_beacons(
                infrastructure_data['beacons'],
                star_system
            )
            enhanced['infrastructure'] = enhanced.get('infrastructure', [])
            enhanced['infrastructure'].extend(positioned_beacons)

        return enhanced

    def _position_stations(self, stations: List[Dict[str, Any]],
                          star_system: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Position space stations in orbital locations.

        Args:
            stations (list): List of station data
            star_system (dict): Star system data

        Returns:
            list: Stations with positioning data
        """
        positioned_stations = []
        planets = star_system.get('planets', [])

        for station in stations:
            positioned_station = station.copy()

            # Determine positioning strategy based on station type
            if self._is_orbital_station(station):
                position = self._calculate_orbital_station_position(station, planets)
            elif self._is_lagrange_station(station):
                position = self._calculate_lagrange_position(station, planets)
            else:
                # Default to high orbit
                position = self._calculate_high_orbit_position(station, planets)

            positioned_station['position'] = position
            positioned_station['orbit'] = self._calculate_station_orbit(position, planets)

            positioned_stations.append(positioned_station)

        return positioned_stations

    def _position_beacons(self, beacons: List[Dict[str, Any]],
                         star_system: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Position navigation beacons in strategic locations.

        Args:
            beacons (list): List of beacon data
            star_system (dict): Star system data

        Returns:
            list: Beacons with positioning data
        """
        positioned_beacons = []

        # Create a grid pattern for beacon placement
        beacon_positions = self._calculate_beacon_grid_positions(star_system)

        for i, beacon in enumerate(beacons):
            positioned_beacon = beacon.copy()

            if i < len(beacon_positions):
                position = beacon_positions[i]
            else:
                # Fallback positioning for additional beacons
                position = self._calculate_fallback_beacon_position(i, star_system)

            positioned_beacon['position'] = position
            positioned_beacon['orbit'] = {
                'parent': 'star',
                'radius': math.sqrt(position[0]**2 + position[2]**2),
                'angle': math.degrees(math.atan2(position[2], position[0])),
                'period': 0.0  # Static beacons don't orbit
            }

            positioned_beacons.append(positioned_beacon)

        return positioned_beacons

    def _calculate_orbital_station_position(self, station: Dict[str, Any],
                                          planets: List[Dict[str, Any]]) -> List[float]:
        """
        Calculate position for an orbital space station.

        Args:
            station (dict): Station data
            planets (list): Available planets

        Returns:
            list: [x, y, z] position
        """
        if not planets:
            # No planets available, place in high orbit around star
            return [200.0, 0.0, 0.0]

        # Choose a planet to orbit (prefer habitable ones)
        target_planet = self._choose_station_planet(station, planets)
        planet_pos = target_planet.get('position', [100.0, 0.0, 0.0])

        # Calculate orbital position
        planet_distance = math.sqrt(planet_pos[0]**2 + planet_pos[2]**2)
        orbit_height = self.STATION_ORBIT_HEIGHT
        orbit_radius = planet_distance + orbit_height

        # Add some random variation to avoid clustering
        angle_variation = self.random.uniform(-30, 30)
        base_angle = math.degrees(math.atan2(planet_pos[2], planet_pos[0]))
        orbit_angle = base_angle + angle_variation

        # Convert to position
        angle_rad = math.radians(orbit_angle)
        x = orbit_radius * math.cos(angle_rad)
        y = self.random.uniform(-5, 5)  # Slight vertical variation
        z = orbit_radius * math.sin(angle_rad)

        return [x, y, z]

    def _calculate_lagrange_position(self, station: Dict[str, Any],
                                   planets: List[Dict[str, Any]]) -> List[float]:
        """
        Calculate position for a Lagrange point station.

        Args:
            station (dict): Station data
            planets (list): Available planets

        Returns:
            list: [x, y, z] position
        """
        if not planets:
            return [150.0, 0.0, 0.0]

        # Use the first planet for Lagrange calculation
        planet = planets[0]
        planet_pos = planet.get('position', [100.0, 0.0, 0.0])
        planet_distance = math.sqrt(planet_pos[0]**2 + planet_pos[2]**2)

        # L4 and L5 points are 60 degrees ahead/behind the planet
        l4_angle = math.degrees(math.atan2(planet_pos[2], planet_pos[0])) + 60

        angle_rad = math.radians(l4_angle)
        x = planet_distance * math.cos(angle_rad)
        y = 0.0
        z = planet_distance * math.sin(angle_rad)

        return [x, y, z]

    def _calculate_high_orbit_position(self, station: Dict[str, Any],
                                     planets: List[Dict[str, Any]]) -> List[float]:
        """
        Calculate position for a high-orbit station.

        Args:
            station (dict): Station data
            planets (list): Available planets

        Returns:
            list: [x, y, z] position
        """
        # Place in high orbit, avoiding planet positions
        base_distance = 300.0
        angle = self.random.uniform(0, 360)

        angle_rad = math.radians(angle)
        x = base_distance * math.cos(angle_rad)
        y = self.random.uniform(-20, 20)
        z = base_distance * math.sin(angle_rad)

        return [x, y, z]

    def _calculate_beacon_grid_positions(self, star_system: Dict[str, Any]) -> List[List[float]]:
        """
        Calculate a grid pattern for beacon placement.

        Args:
            star_system (dict): Star system data

        Returns:
            list: List of [x, y, z] positions for beacons
        """
        positions = []
        grid_size = 3  # 3x3 grid
        spacing = self.BEACON_SPACING

        for i in range(grid_size):
            for j in range(grid_size):
                x = (i - grid_size//2) * spacing
                y = 0.0
                z = (j - grid_size//2) * spacing

                # Avoid placing beacons too close to the star
                distance_from_star = math.sqrt(x**2 + z**2)
                if distance_from_star > 50.0:  # Minimum distance from star
                    positions.append([x, y, z])

        return positions

    def _calculate_fallback_beacon_position(self, index: int,
                                          star_system: Dict[str, Any]) -> List[float]:
        """
        Calculate fallback position for additional beacons.

        Args:
            index (int): Beacon index
            star_system (dict): Star system data

        Returns:
            list: [x, y, z] position
        """
        # Spiral pattern for additional beacons
        angle = index * 137.5  # Golden angle approximation
        radius = 100.0 + (index * 50.0)

        angle_rad = math.radians(angle)
        x = radius * math.cos(angle_rad)
        y = self.random.uniform(-10, 10)
        z = radius * math.sin(angle_rad)

        return [x, y, z]

    def _calculate_station_orbit(self, position: List[float],
                               planets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Calculate orbital parameters for a station.

        Args:
            position (list): Station position
            planets (list): Available planets

        Returns:
            dict: Orbital parameters
        """
        distance_from_star = math.sqrt(position[0]**2 + position[2]**2)
        angle = math.degrees(math.atan2(position[2], position[0]))

        return {
            'parent': 'star',
            'radius': distance_from_star,
            'angle': angle,
            'period': 0.0  # Most stations are in fixed positions
        }

    def _choose_station_planet(self, station: Dict[str, Any],
                             planets: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Choose the most appropriate planet for station placement.

        Args:
            station (dict): Station data
            planets (list): Available planets

        Returns:
            dict: Chosen planet
        """
        if not planets:
            return {'position': [100.0, 0.0, 0.0]}

        # Prefer habitable planets for stations
        habitable_planets = [
            p for p in planets
            if p.get('diplomacy') == 'friendly' or p.get('planet_type') == 'Class-M'
        ]

        if habitable_planets:
            return self.random.choice(habitable_planets)

        # Fallback to any planet
        return self.random.choice(planets)

    def _is_orbital_station(self, station: Dict[str, Any]) -> bool:
        """Check if station should be in orbital position."""
        station_type = station.get('type', '').lower()
        return 'orbital' in station_type or 'station' in station_type

    def _is_lagrange_station(self, station: Dict[str, Any]) -> bool:
        """Check if station should be at Lagrange point."""
        station_name = station.get('name', '').lower()
        return 'l4' in station_name or 'l5' in station_name or 'lagrange' in station_name
