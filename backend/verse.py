import random
import hashlib
from backend.PlanetTypes import PLANET_CLASSES

# Syllable lists for name generation
STAR_SYLLABLES = [
    "cor", "usc", "ant", "yav", "in", "al", "der", "aan", "hos", "oth",
    "mus", "taf", "ar", "jak", "koo", "dag", "bah", "bes", "pin", "kam",
    "ino", "geo", "no", "sis", "fel", "uc", "lum", "nar", "sha", "da", "too", "ine"
]

PLANET_SYLLABLES = [
    "tat", "oo", "ine", "nab", "mus", "taf", "end", "or", "dag", "obah",
    "jak", "ku", "cor", "usc", "ant", "bes", "pin", "kam", "ino", "geo",
    "no", "sis", "fel", "uc", "oth", "lum", "nar", "sha", "da", "too",
    "al", "der", "aan", "hos", "yav", "in"
]

MOON_SYLLABLES = [
    "io", "phos", "sel", "ene", "ara", "the", "mir", "tis", "jan", "rix",
    "vos", "lor", "zen", "kas", "vek", "nor", "lek", "vos", "end", "or",
    "yav", "in", "nar", "sha", "da"
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

def generate_name(syllables, length=3, seed=None):
    """Generate a name by combining random syllables."""
    if seed is not None and seed != '':
        Lehmer32(int(seed))
    
    name = ""
    for _ in range(length):
        syllable = syllables[Lehmer32() % len(syllables)]
        name += syllable
    
    # Capitalize first letter
    return name[0].upper() + name[1:]

def get_random_star_name(seed=None):
    """Generate a unique star name using syllable combination."""
    return generate_name(STAR_SYLLABLES, length=3, seed=seed)

def get_random_planet_name(seed=None):
    """Generate a unique planet name using syllable combination."""
    return generate_name(PLANET_SYLLABLES, length=4, seed=seed)

def get_random_moon_name(seed=None):
    """Generate a unique moon name using syllable combination."""
    return generate_name(MOON_SYLLABLES, length=2, seed=seed)

# Generate a star system
def generate_star_system(random_seed=None):
    if random_seed is not None and random_seed != '':
        Lehmer32(int(random_seed))

    star_system = {}

    # Generate star type and name using Lehmer32 instead of random.choice
    star_types = ['red dwarf', 'yellow dwarf', 'blue giant', 'white dwarf']
    star_system['star_type'] = star_types[Lehmer32() % len(star_types)]
    star_system['star_name'] = get_random_star_name()
    star_system['star_size'] = 2.0  # Default star size for visualization
    star_system['planets'] = []

    # Generate planets
    num_planets = Lehmer32() % 10
    for _ in range(num_planets):
        planet = generate_planet()
        star_system['planets'].append(planet)

    return star_system

# Generate a planet
def generate_planet(random_seed=None):
    if random_seed is not None and random_seed != '':
        Lehmer32(int(random_seed))

    planet = {}

    # Generate planet type and name using Lehmer32
    planet_types = list(PLANET_CLASSES.keys())
    planet['planet_type'] = planet_types[Lehmer32() % len(planet_types)]
    planet['planet_name'] = get_random_planet_name()
    planet['moons'] = []
    
    # Add atmosphere and cloud properties based on planet type
    planet_class = PLANET_CLASSES[planet['planet_type']]
    planet['has_atmosphere'] = planet_class.get('has_atmosphere', True)  # Default to True for most planets
    planet['has_clouds'] = planet_class.get('has_clouds', True)  # Default to True for most planets
    planet['planet_size'] = 0.8 + (Lehmer32() % 5) * 0.4  # Random size between 0.8 and 2.8

    # Generate moons
    num_moons = Lehmer32() % 6
    for _ in range(num_moons):
        moon = generate_moon()
        planet['moons'].append(moon)

    return planet

# Generate a moon
def generate_moon(random_seed=None):
    if random_seed is not None and random_seed != '':
        Lehmer32(int(random_seed))

    moon = {}

    # Generate moon type and name using Lehmer32
    moon_types = ['rocky', 'ice', 'desert']
    moon['moon_type'] = moon_types[Lehmer32() % len(moon_types)]
    moon['moon_name'] = get_random_moon_name()
    moon['moon_size'] = 0.2 + (Lehmer32() % 3) * 0.2  # Random size between 0.2 and 0.8

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
    # Generate a random seed for testing
    seed = Lehmer32()
    num_star_systems = 3

    print("\nGenerating universe with seed:", seed)
    print("\nPlanet Classes:")
    for k,v in PLANET_CLASSES.items():
        print(f"{k}: {v['name']}")
    print("\n")

    universe = generate_universe(num_star_systems, seed)
    for i, star_system in enumerate(universe):
        print(f"\nStar System {i+1}:")
        print(f"Star: {star_system['star_name']} ({star_system['star_type']})")
        for j, planet in enumerate(star_system['planets']):
            print(f"  Planet {j+1}: {planet['planet_name']} ({planet['planet_type']})")
            for k, moon in enumerate(planet['moons']):
                print(f"    Moon {k+1}: {moon['moon_name']} ({moon['moon_type']})")

    checksum = calculate_checksum(universe)
    print("\nUniverse checksum:", checksum)