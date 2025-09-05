"""
Positioning Enhancement System
=============================

This module enhances the existing verse.py system with 3D positioning data
for celestial bodies, maintaining backward compatibility while adding
modern positioning capabilities.

Key Features:
- Orbital mechanics calculations
- 3D positioning for all celestial bodies
- Integration with existing SolarSystemManager
- Non-breaking enhancements to current systems
"""

import math
from typing import Dict, List, Optional, Any, Tuple
from backend.verse import get_universe_seed_from_env


class PositioningEnhancement:
    """
    Enhances verse.py systems with 3D positioning data.

    This class adds orbital mechanics and positioning calculations
    to existing verse.py star systems without modifying the core
    generation logic.
    """

    def __init__(self, universe_seed: Optional[int] = None):
        """
        Initialize the positioning enhancement system.

        Args:
            universe_seed (int, optional): Universe seed for consistent positioning
        """
        if universe_seed is None:
            universe_seed = get_universe_seed_from_env()

        self.universe_seed = universe_seed

        # Orbital constants (scaled for game)
        self.AU_SCALE = 100.0  # 1 AU = 100 game units
        self.EARTH_ORBITAL_PERIOD = 365.25  # Earth days
        self.BASE_PLANET_DISTANCE = 50.0  # Base distance between planets

    def enhance_star_system(self, star_system: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enhance a star system with positioning data.

        Args:
            star_system (dict): Star system from verse.py

        Returns:
            dict: Enhanced star system with positioning data
        """
        enhanced = star_system.copy()

        # Add star positioning (always at origin)
        enhanced['star_position'] = [0.0, 0.0, 0.0]
        enhanced['star_orbit'] = {
            'parent': None,
            'radius': 0.0,
            'angle': 0.0,
            'period': 0.0
        }

        # Calculate planet positions
        if 'planets' in enhanced:
            enhanced['planets'] = self._position_planets(enhanced['planets'])

        return enhanced

    def _position_planets(self, planets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Calculate positions for all planets in the system.

        Args:
            planets (list): List of planet dictionaries

        Returns:
            list: Planets with positioning data added
        """
        positioned_planets = []

        for i, planet in enumerate(planets):
            # Calculate orbital parameters
            orbit_radius = self._calculate_orbital_radius(i)
            orbit_angle = self._calculate_orbital_angle(i, len(planets))
            orbital_period = self._calculate_orbital_period(orbit_radius)

            # Calculate 3D position
            position = self._calculate_orbital_position(orbit_radius, orbit_angle)

            # Add positioning data to planet
            enhanced_planet = planet.copy()
            enhanced_planet['position'] = position
            enhanced_planet['orbit'] = {
                'parent': 'star',
                'radius': orbit_radius,
                'angle': orbit_angle,
                'period': orbital_period
            }

            # Position moons relative to planet
            if 'moons' in enhanced_planet:
                enhanced_planet['moons'] = self._position_moons(
                    enhanced_planet['moons'],
                    position,
                    orbit_radius
                )

            positioned_planets.append(enhanced_planet)

        return positioned_planets

    def _position_moons(self, moons: List[Dict[str, Any]],
                       planet_position: List[float],
                       planet_orbit_radius: float) -> List[Dict[str, Any]]:
        """
        Calculate positions for moons relative to their planet.

        Args:
            moons (list): List of moon dictionaries
            planet_position (list): Planet's current position [x, y, z]
            planet_orbit_radius (float): Planet's orbital radius

        Returns:
            list: Moons with positioning data added
        """
        positioned_moons = []

        for i, moon in enumerate(moons):
            # Calculate moon orbital parameters (much smaller scale)
            moon_orbit_radius = self._calculate_moon_orbital_radius(i)
            moon_orbit_angle = self._calculate_moon_orbital_angle(i, len(moons))
            moon_orbital_period = self._calculate_moon_orbital_period(moon_orbit_radius)

            # Calculate moon position relative to planet
            relative_position = self._calculate_orbital_position(moon_orbit_radius, moon_orbit_angle)

            # Add planet position to get absolute position
            absolute_position = [
                planet_position[0] + relative_position[0],
                planet_position[1] + relative_position[1],
                planet_position[2] + relative_position[2]
            ]

            # Add positioning data to moon
            enhanced_moon = moon.copy()
            enhanced_moon['position'] = absolute_position
            enhanced_moon['orbit'] = {
                'parent': 'planet',  # Could be enhanced to use planet name
                'radius': moon_orbit_radius,
                'angle': moon_orbit_angle,
                'period': moon_orbital_period
            }

            positioned_moons.append(enhanced_moon)

        return positioned_moons

    def _calculate_orbital_radius(self, planet_index: int) -> float:
        """
        Calculate orbital radius for a planet based on its position.

        Args:
            planet_index (int): Index of the planet (0 = closest to star)

        Returns:
            float: Orbital radius in game units
        """
        # Inner planets are closer, outer planets farther
        # Use a geometric progression for realistic spacing
        base_distance = self.BASE_PLANET_DISTANCE
        ratio = 1.6  # Roughly the ratio between planet distances

        if planet_index == 0:
            return base_distance
        else:
            return base_distance * (ratio ** planet_index)

    def _calculate_orbital_angle(self, planet_index: int, total_planets: int) -> float:
        """
        Calculate initial orbital angle for even spacing.

        Args:
            planet_index (int): Index of the planet
            total_planets (int): Total number of planets

        Returns:
            float: Orbital angle in degrees
        """
        if total_planets <= 1:
            return 0.0

        # Space planets evenly around the star
        return (planet_index / total_planets) * 360.0

    def _calculate_orbital_period(self, orbit_radius: float) -> float:
        """
        Calculate orbital period using Kepler's third law approximation.

        Args:
            orbit_radius (float): Orbital radius

        Returns:
            float: Orbital period in Earth days
        """
        # Simplified Kepler's law: P² ∝ r³
        # Use Earth's orbit as reference
        earth_radius = self.BASE_PLANET_DISTANCE

        period_ratio = (orbit_radius / earth_radius) ** 1.5
        return self.EARTH_ORBITAL_PERIOD * period_ratio

    def _calculate_moon_orbital_radius(self, moon_index: int) -> float:
        """
        Calculate orbital radius for a moon.

        Args:
            moon_index (int): Index of the moon

        Returns:
            float: Orbital radius in game units (much smaller scale)
        """
        # Moons orbit much closer to planets
        base_moon_distance = 2.0  # Much smaller than planet distances
        return base_moon_distance * (moon_index + 1)

    def _calculate_moon_orbital_angle(self, moon_index: int, total_moons: int) -> float:
        """
        Calculate orbital angle for moon spacing.

        Args:
            moon_index (int): Index of the moon
            total_moons (int): Total number of moons

        Returns:
            float: Orbital angle in degrees
        """
        if total_moons <= 1:
            return 0.0

        return (moon_index / total_moons) * 360.0

    def _calculate_moon_orbital_period(self, orbit_radius: float) -> float:
        """
        Calculate orbital period for a moon.

        Args:
            orbit_radius (float): Orbital radius

        Returns:
            float: Orbital period in Earth days
        """
        # Moons orbit much faster than planets
        # Use a simplified relationship
        return orbit_radius * 2.0  # Rough approximation

    def _calculate_orbital_position(self, radius: float, angle: float) -> List[float]:
        """
        Calculate 3D position from orbital parameters.

        Args:
            radius (float): Orbital radius
            angle (float): Orbital angle in degrees

        Returns:
            list: [x, y, z] position
        """
        # Convert angle to radians
        angle_rad = math.radians(angle)

        # Calculate position (assuming circular orbits in XY plane)
        x = radius * math.cos(angle_rad)
        y = 0.0  # All orbits in XY plane for simplicity
        z = radius * math.sin(angle_rad)

        return [x, y, z]

    def update_positions_over_time(self, star_system: Dict[str, Any],
                                  time_elapsed: float) -> Dict[str, Any]:
        """
        Update positions of all celestial bodies based on elapsed time.

        Args:
            star_system (dict): Star system with positioning data
            time_elapsed (float): Time elapsed in Earth days

        Returns:
            dict: Updated star system with new positions
        """
        updated = star_system.copy()

        # Update planet positions
        if 'planets' in updated:
            updated_planets = []
            for planet in updated['planets']:
                updated_planet = self._update_planet_position(planet, time_elapsed)
                updated_planets.append(updated_planet)
            updated['planets'] = updated_planets

        return updated

    def _update_planet_position(self, planet: Dict[str, Any], time_elapsed: float) -> Dict[str, Any]:
        """
        Update a planet's position based on elapsed time.

        Args:
            planet (dict): Planet data with orbit information
            time_elapsed (float): Time elapsed in Earth days

        Returns:
            dict: Updated planet with new position
        """
        if 'orbit' not in planet:
            return planet

        orbit = planet['orbit']
        radius = orbit['radius']
        period = orbit['period']

        # Calculate new angle based on time
        angle_per_day = 360.0 / period
        current_angle = orbit['angle'] + (angle_per_day * time_elapsed)

        # Normalize angle to 0-360
        current_angle = current_angle % 360.0

        # Calculate new position
        new_position = self._calculate_orbital_position(radius, current_angle)

        # Update planet data
        updated_planet = planet.copy()
        updated_planet['position'] = new_position
        updated_planet['orbit']['angle'] = current_angle

        # Update moon positions relative to new planet position
        if 'moons' in updated_planet:
            updated_moons = []
            for moon in updated_planet['moons']:
                updated_moon = self._update_moon_position(moon, new_position, time_elapsed)
                updated_moons.append(updated_moon)
            updated_planet['moons'] = updated_moons

        return updated_planet

    def _update_moon_position(self, moon: Dict[str, Any],
                            planet_position: List[float],
                            time_elapsed: float) -> Dict[str, Any]:
        """
        Update a moon's position based on elapsed time.

        Args:
            moon (dict): Moon data with orbit information
            planet_position (list): Current planet position
            time_elapsed (float): Time elapsed in Earth days

        Returns:
            dict: Updated moon with new position
        """
        if 'orbit' not in moon:
            return moon

        orbit = moon['orbit']
        radius = orbit['radius']
        period = orbit['period']

        # Calculate new angle based on time
        angle_per_day = 360.0 / period
        current_angle = orbit['angle'] + (angle_per_day * time_elapsed)

        # Normalize angle to 0-360
        current_angle = current_angle % 360.0

        # Calculate new relative position
        relative_position = self._calculate_orbital_position(radius, current_angle)

        # Add planet position to get absolute position
        absolute_position = [
            planet_position[0] + relative_position[0],
            planet_position[1] + relative_position[1],
            planet_position[2] + relative_position[2]
        ]

        # Update moon data
        updated_moon = moon.copy()
        updated_moon['position'] = absolute_position
        updated_moon['orbit']['angle'] = current_angle

        return updated_moon
