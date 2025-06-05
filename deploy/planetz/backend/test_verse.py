import unittest
from verse import generate_universe, generate_star_system, generate_planet, generate_moon
from verse import Lehmer32, initialize_rng, save_rng_state, restore_rng_state, sector_to_seed

class TestVerseGeneration(unittest.TestCase):
    def setUp(self):
        # Reset RNG before each test
        initialize_rng(12345)  # Use a fixed seed for reproducibility

    def test_deterministic_generation(self):
        """Test that universe generation is deterministic with the same seed"""
        # Generate two universes with the same seed
        universe1 = generate_universe(9, seed=42)
        universe2 = generate_universe(9, seed=42)

        # They should be identical
        self.assertEqual(len(universe1), len(universe2))
        for sys1, sys2 in zip(universe1, universe2):
            self.assertEqual(sys1['star_name'], sys2['star_name'])
            self.assertEqual(sys1['star_type'], sys2['star_type'])
            self.assertEqual(len(sys1['planets']), len(sys2['planets']))

    def test_unique_planet_names(self):
        """Test that all planets in a universe have unique names"""
        universe = generate_universe(9, seed=42)
        planet_names = set()

        for system in universe:
            for planet in system['planets']:
                self.assertNotIn(planet['planet_name'], planet_names, 
                               f"Duplicate planet name found: {planet['planet_name']}")
                planet_names.add(planet['planet_name'])

    def test_sector_consistency(self):
        """Test that the same sector always generates the same content"""
        # Generate two separate universes
        universe1 = generate_universe(81, seed=42)  # 9x9 grid
        universe2 = generate_universe(81, seed=42)

        # Check sector A0 (index 0)
        sector_a0_1 = universe1[0]
        sector_a0_2 = universe2[0]

        self.assertEqual(sector_a0_1['star_name'], sector_a0_2['star_name'])
        self.assertEqual(sector_a0_1['star_type'], sector_a0_2['star_type'])
        
        # Check all planets in the sector
        self.assertEqual(len(sector_a0_1['planets']), len(sector_a0_2['planets']))
        for p1, p2 in zip(sector_a0_1['planets'], sector_a0_2['planets']):
            self.assertEqual(p1['planet_name'], p2['planet_name'])
            self.assertEqual(p1['planet_type'], p2['planet_type'])

    def test_different_seeds_different_results(self):
        """Test that different seeds produce different universes"""
        universe1 = generate_universe(9, seed=42)
        universe2 = generate_universe(9, seed=43)

        # At least some systems should be different
        differences_found = False
        for sys1, sys2 in zip(universe1, universe2):
            if sys1['star_name'] != sys2['star_name']:
                differences_found = True
                break
        
        self.assertTrue(differences_found, "Different seeds should produce different universes")

    def test_moon_generation(self):
        """Test that moon generation is consistent and unique"""
        # Generate a planet with moons using a fixed seed
        planet = generate_planet(random_seed=42)
        
        # Store moon names to check for uniqueness
        moon_names = set()
        for moon in planet['moons']:
            self.assertNotIn(moon['moon_name'], moon_names, 
                           f"Duplicate moon name found: {moon['moon_name']}")
            moon_names.add(moon['moon_name'])

        # Generate the same planet again
        planet2 = generate_planet(random_seed=42)
        
        # Check that moons are identical
        self.assertEqual(len(planet['moons']), len(planet2['moons']))
        for m1, m2 in zip(planet['moons'], planet2['moons']):
            self.assertEqual(m1['moon_name'], m2['moon_name'])
            self.assertEqual(m1['moon_type'], m2['moon_type'])

    def test_rng_state_preservation(self):
        """Test that RNG state is properly preserved after generation"""
        # Initialize RNG with a known seed
        initialize_rng(42)
        
        # Generate a star system
        system1 = generate_star_system()
        
        # Save the state after generation
        state = save_rng_state()
        
        # Generate another star system with a different seed
        _ = generate_star_system(random_seed=99)
        
        # Restore the state
        restore_rng_state(state)
        
        # Generate another star system with the same initial conditions
        system2 = generate_star_system()
        
        # Both systems should be identical
        self.assertEqual(system1['star_name'], system2['star_name'],
                       "Star names differ after state restoration")
        self.assertEqual(system1['star_type'], system2['star_type'],
                       "Star types differ after state restoration")
        self.assertEqual(len(system1['planets']), len(system2['planets']),
                       "Number of planets differs after state restoration")
        
        for p1, p2 in zip(system1['planets'], system2['planets']):
            self.assertEqual(p1['planet_name'], p2['planet_name'],
                           "Planet names differ after state restoration")
            self.assertEqual(p1['planet_type'], p2['planet_type'],
                           "Planet types differ after state restoration")

    def test_sector_coordinate_handling(self):
        """Test that sector coordinates are handled correctly"""
        # Initialize RNG with a known seed
        initialize_rng(42)
        
        # Save initial state
        initial_state = save_rng_state()
        
        # Generate a star system using sector coordinate
        sector = "A0"
        universe_seed = Lehmer32()  # Get universe seed
        sector_seed = (universe_seed + sector_to_seed(sector)) & 0xFFFFFFFF
        system1 = generate_star_system(random_seed=sector_seed)
        
        # Restore initial state
        restore_rng_state(initial_state)
        
        # Generate the same system using numeric index
        universe_seed = Lehmer32()  # Get the same universe seed
        sector_seed = (universe_seed + sector_to_seed(sector)) & 0xFFFFFFFF
        system2 = generate_star_system(random_seed=sector_seed)
        
        # Both systems should be identical
        self.assertEqual(system1['star_name'], system2['star_name'],
                       "Star names differ between string and numeric seeds")
        self.assertEqual(system1['star_type'], system2['star_type'],
                       "Star types differ between string and numeric seeds")
        self.assertEqual(len(system1['planets']), len(system2['planets']),
                       "Number of planets differs between string and numeric seeds")
        
        # Test invalid sector coordinates
        system3 = generate_star_system(random_seed="invalid")  # Should not raise error
        self.assertIsNotNone(system3)
        self.assertIn('star_name', system3)
        
        # Restore initial state again
        restore_rng_state(initial_state)
        
        # Generate the universe and check sector A0
        universe = generate_universe(9, seed=42)  # Use same seed as initial_state
        system4 = universe[0]  # A0 is at index 0
        
        # Compare with direct generation
        self.assertEqual(system1['star_name'], system4['star_name'],
                       "Star names differ between direct and universe generation")
        self.assertEqual(system1['star_type'], system4['star_type'],
                       "Star types differ between direct and universe generation")

    def test_celestial_body_limits(self):
        """Test that star systems don't generate an excessive number of celestial bodies"""
        # Initialize RNG with a known seed
        initialize_rng(42)
        
        # Generate a universe
        universe = generate_universe(9, seed=42)
        
        for system in universe:
            # Count total celestial bodies (star + planets + moons)
            total_bodies = 1  # Start with 1 for the star
            for planet in system['planets']:
                total_bodies += 1  # Add the planet
                total_bodies += len(planet['moons'])  # Add its moons
            
            # Check that the total is within reasonable limits
            # Frontend expects to handle around 30-40 bodies max
            self.assertLess(total_bodies, 40,
                          f"Too many celestial bodies in system {system['star_name']}: {total_bodies}")
            
            # Check that individual planet's moon count is reasonable
            for planet in system['planets']:
                self.assertLess(len(planet['moons']), 6,
                              f"Too many moons on planet {planet['planet_name']}: {len(planet['moons'])}")

    def test_star_system_generation_errors(self):
        """Test that star system generation handles errors gracefully"""
        # Test with invalid seed types
        system1 = generate_star_system(random_seed=None)
        self.assertIsNotNone(system1)
        self.assertIn('star_name', system1)
        
        system2 = generate_star_system(random_seed={"invalid": "seed"})
        self.assertIsNotNone(system2)
        self.assertIn('star_name', system2)
        
        # Test with extreme sector values
        system3 = generate_star_system(random_seed="Z9")  # Out of range sector
        self.assertIsNotNone(system3)
        self.assertIn('star_name', system3)
        
        # Test that planets and moons are always properly initialized
        system4 = generate_star_system(random_seed=42)
        self.assertIsNotNone(system4.get('planets'))
        for planet in system4['planets']:
            self.assertIsNotNone(planet.get('moons'))
            self.assertIsInstance(planet['moons'], list)

if __name__ == '__main__':
    unittest.main() 