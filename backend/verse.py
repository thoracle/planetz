import random
import hashlib
import PlanetTypes as _PlanetTypes

# List of predefined planet names
PLANET_NAMES = [
    "Alpha Centauri", "Proxima", "Betelgeuse", "Sirius", "Vega",
    "Arcturus", "Polaris", "Antares", "Rigel", "Canopus",
    "Aldebaran", "Fomalhaut", "Deneb", "Altair", "Spica",
    "Regulus", "Castor", "Pollux", "Capella", "Bellatrix",
    "Mintaka", "Alnilam", "Alnitak", "Saiph", "Meissa",
    "Nihal", "Menkalinan", "Alhena", "Alzirr", "Wasat"
]

# Lehmer random number generator
nLehmer = 0

def Lehmer32(seed=None):
    global nLehmer
    if seed is not None:
        nLehmer = seed
    nLehmer += 0xe120fc15
    tmp = (nLehmer & 0xFFFFFFFF) * 0x4a39b70d
    m1 = ((tmp >> 32) ^ tmp) & 0xFFFFFFFF
    tmp = (m1 * 0x12fad5c9) & 0xFFFFFFFF
    m2 = ((tmp >> 32) ^ tmp) & 0xFFFFFFFF
    return m2

def get_random_name(seed=None):
    """Get a random name from the predefined list."""
    if seed is not None:
        random.seed(seed)
    return random.choice(PLANET_NAMES)

# Generate a star system
def generate_star_system(random_seed=None):
    if random_seed is not None:
        random.seed(random_seed)

    star_system = {}

    # Generate star type, size, and other properties
    star_system['star_type'] = random.choice(['red dwarf', 'yellow dwarf', 'blue giant', 'white dwarf'])
    star_system['star_size'] = Lehmer32() % 10 + 1
    star_system['planets'] = []

    # Generate planets
    num_planets = Lehmer32() % 10
    for _ in range(num_planets):
        planet = generate_planet(random_seed=random_seed)
        star_system['planets'].append(planet)

    return star_system

# Generate a planet
def generate_planet(random_seed=None, name=None):
    if random_seed is not None:
        random.seed(random_seed)

    planet = {}

    # Generate planet type, size, moons, and other properties
    planet['planet_type'] = random.choice(list(_PlanetTypes.PLANET_CLASSES))
    planet['planet_size'] = Lehmer32() % 10 + 1
    planet['moons'] = []
    
    # Generate or use provided name
    if name is None:
        name = get_random_name(random_seed)
    planet['name'] = name

    # Generate moons
    num_moons = Lehmer32() % 6
    for _ in range(num_moons):
        moon = generate_moon(random_seed=random_seed)
        planet['moons'].append(moon)

    return planet

# Generate a moon
def generate_moon(random_seed=None):
    if random_seed is not None:
        random.seed(random_seed)

    moon = {}

    # Generate moon type, size, and other properties
    moon['moon_type'] = random.choice(['rocky', 'ice', 'desert'])
    moon['moon_size'] = Lehmer32() % 5 + 1
    moon['name'] = get_random_name(random_seed)  # Add name to moons too

    return moon

# Generate the universe
def generate_universe(num_star_systems, seed=None):
    if seed is not None:
        Lehmer32(seed)

    universe = []

    for _ in range(num_star_systems):
        star_system = generate_star_system(random_seed=Lehmer32())
        universe.append(star_system)

    return universe

# Function to calculate checksum for a given universe
def calculate_checksum(universe):
    # Serialize the universe data to a string
    universe_str = str(universe)

    # Calculate the checksum using SHA-256 hash function
    checksum = hashlib.sha256(universe_str.encode()).hexdigest()
    
    return checksum

# Example usage
if __name__ == "__main__":
    # Generate a random name for testing
    test_name = get_random_name()
    num_star_systems = len(test_name)

    # Generate a random seed based on the SHA-256 hash of the name
    hashed_name = hashlib.sha256(test_name.encode()).hexdigest()
    seed = int(hashed_name, 16) % (2**32)  # Convert hex hash to integer and limit to 32-bit range

    for k,v in _PlanetTypes.Class.items():
        print(k, v)
    print("\n")

    universe = generate_universe(num_star_systems, seed)
    for i, star_system in enumerate(universe):
        print(f"Star System {i+1}:")
        print(star_system)

    checksum1 = calculate_checksum(universe)
    print("\nRandom seed for %s: %s" %(test_name, seed))
    print("Checksum for %s: %s" %(test_name, checksum1))