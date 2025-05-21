import random
import hashlib
from backend.PlanetTypes import PLANET_CLASSES
import os

# Greek letters and Roman numerals for Star Trek style naming
GREEK_LETTERS = [
    "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta", "Eta", "Theta",
    "Iota", "Kappa", "Lambda", "Mu", "Nu", "Xi", "Omicron", "Pi",
    "Rho", "Sigma", "Tau", "Upsilon", "Phi", "Chi", "Psi", "Omega"
]

ROMAN_NUMERALS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"]

# Star Trek inspired planet and star names
TREK_NAMES = [
    "Vulcan", "Andor", "Tellar", "Betazed", "Risa", "Bajor", "Cardassia",
    "Ferenginar", "Qo'noS", "Romulus", "Remus", "Trill", "Rigel",
    "Antares", "Cestus", "Ceti", "Deneb", "Izar", "Janus", "Miri",
    "Talos", "Vega", "Excalbia", "Gideon", "Eminiar", "Halkan"
]

STAR_REGIONS = [
    "Trianguli", "Draconis", "Eridani", "Ceti", "Ursae", "Orionis",
    "Centauri", "Andromedae", "Cassiopeiae", "Persei", "Lyrae"
]

# Lehmer random number generator
nLehmer = 0
initial_seed = None

def save_rng_state():
    """Save the current RNG state"""
    return nLehmer

def restore_rng_state(state):
    """Restore a previously saved RNG state"""
    global nLehmer
    nLehmer = state & 0xFFFFFFFF

def Lehmer32(seed=None):
    global nLehmer, initial_seed
    if seed is not None:
        nLehmer = seed & 0xFFFFFFFF  # Ensure 32-bit value
        initial_seed = seed
    nLehmer += 0xe120fc15
    tmp = (nLehmer & 0xFFFFFFFF) * 0x4a39b70d
    m1 = ((tmp >> 32) ^ tmp) & 0xFFFFFFFF
    tmp = (m1 * 0x12fad5c9) & 0xFFFFFFFF
    m2 = ((tmp >> 32) ^ tmp) & 0xFFFFFFFF
    return m2

def initialize_rng(seed=None):
    """Initialize the RNG with a seed, using environment seed as default."""
    global initial_seed, nLehmer
    
    if seed is None:
        env_seed = os.getenv('UNIVERSE_SEED')
        if env_seed:
            try:
                seed = int(env_seed)
            except ValueError:
                seed = hash(env_seed) & 0xFFFFFFFF
    
    if seed is not None:
        if isinstance(seed, str):
            seed = hash(seed) & 0xFFFFFFFF
        initial_seed = seed
        nLehmer = seed & 0xFFFFFFFF  # Set nLehmer directly instead of using Lehmer32
    elif initial_seed is not None:
        nLehmer = initial_seed & 0xFFFFFFFF  # Restore initial seed directly

def generate_name(syllables, length=3, seed=None):
    """Generate a Star Trek style name."""
    # Save the current RNG state
    original_state = save_rng_state()
    
    if seed is not None:
        Lehmer32(seed)
    else:
        # If no seed provided, use a random one based on current time
        Lehmer32(hash(str(random.random())) & 0xFFFFFFFF)
    
    # Different name generation patterns
    pattern = Lehmer32() % 4
    
    if pattern == 0:
        # Pattern: Greek Letter + Star Region + Roman Numeral
        # Example: "Gamma Trianguli VI"
        name = f"{GREEK_LETTERS[Lehmer32() % len(GREEK_LETTERS)]} {STAR_REGIONS[Lehmer32() % len(STAR_REGIONS)]} {ROMAN_NUMERALS[Lehmer32() % len(ROMAN_NUMERALS)]}"
    elif pattern == 1:
        # Pattern: Classic Trek Name
        # Example: "Vulcan", "Andor"
        name = TREK_NAMES[Lehmer32() % len(TREK_NAMES)]
    elif pattern == 2:
        # Pattern: Greek Letter + Roman Numeral
        # Example: "Delta IV"
        name = f"{GREEK_LETTERS[Lehmer32() % len(GREEK_LETTERS)]} {ROMAN_NUMERALS[Lehmer32() % len(ROMAN_NUMERALS)]}"
    else:
        # Pattern: Name + Roman Numeral
        # Example: "Cestus III"
        name = f"{TREK_NAMES[Lehmer32() % len(TREK_NAMES)]} {ROMAN_NUMERALS[Lehmer32() % len(ROMAN_NUMERALS)]}"
    
    # Restore the original RNG state
    restore_rng_state(original_state)
    
    return name

def get_random_star_name(seed=None):
    """Generate a unique star name."""
    if seed is None:
        seed = hash(str(random.random())) & 0xFFFFFFFF
    return generate_name(None, seed=seed)

def get_random_planet_name(seed=None):
    """Generate a unique planet name."""
    if seed is None:
        seed = hash(str(random.random())) & 0xFFFFFFFF
    return generate_name(None, seed=seed)

def get_random_moon_name(seed=None):
    """Generate a unique moon name."""
    # Moons typically use Greek letters or simple Roman numerals
    original_state = save_rng_state()
    
    if seed is not None:
        Lehmer32(seed)
    else:
        # If no seed provided, use a random one based on current time
        Lehmer32(hash(str(random.random())) & 0xFFFFFFFF)
    
    if Lehmer32() % 2 == 0:
        name = ROMAN_NUMERALS[Lehmer32() % len(ROMAN_NUMERALS)]
    else:
        name = GREEK_LETTERS[Lehmer32() % len(GREEK_LETTERS)]
    
    restore_rng_state(original_state)
    return name

# Add new constants for planet attributes
FACTION_TYPES = ['Friendly', 'Neutral', 'Enemy', 'Unknown']
GOVERNMENT_TYPES = ['Tyranny', 'Democracy', 'Theocracy', 'Monarchy', 'Anarchy']
ECONOMY_TYPES = ['Agricultural', 'Industrial', 'Technological', 'Commercial', 'Mining', 'Research', 'Tourism']
TECHNOLOGY_LEVELS = [
    'Primitive',
    'Post-Atomic',
    'Starfaring',
    'Interstellar',
    'Intergalactic'
]

def sector_to_seed(sector):
    """Convert a sector coordinate (e.g. 'A0') to a deterministic numeric seed"""
    if isinstance(sector, str) and len(sector) >= 2:
        row = ord(sector[0].upper()) - ord('A')  # Convert A-J to 0-9
        try:
            col = int(sector[1])  # Convert 0-8 to numeric
            return (row * 9 + col) & 0xFFFFFFFF
        except ValueError:
            return hash(sector) & 0xFFFFFFFF
    return hash(str(sector)) & 0xFFFFFFFF

# Generate a star system
def generate_star_system(random_seed=None):
    try:
        # Convert string sector coordinates to numeric seeds
        if isinstance(random_seed, str):
            random_seed = sector_to_seed(random_seed)
        elif not isinstance(random_seed, (int, type(None))):
            random_seed = hash(str(random_seed)) & 0xFFFFFFFF
    except Exception:
        # If any error occurs during seed conversion, use a default seed
        random_seed = None
    
    # Save the current RNG state
    original_state = save_rng_state()
    
    # Initialize RNG with seed, even if it's 0
    if random_seed is not None or random_seed == 0:
        Lehmer32(random_seed)
    
    star_system = {}

    # Generate star type and name using Lehmer32 instead of random.choice
    star_types = ['red dwarf', 'yellow dwarf', 'blue giant', 'white dwarf']
    star_system['star_type'] = star_types[Lehmer32() % len(star_types)]
    
    # Use the current RNG state for name generation to ensure uniqueness
    star_system['star_name'] = get_random_star_name(Lehmer32())
    star_system['star_size'] = 2.0  # Default star size for visualization
    star_system['planets'] = []

    # Generate planets with deterministic seeds
    # Limit planets to a reasonable number (max 8)
    num_planets = (Lehmer32() % 8) + 1  # At least 1 planet, at most 8
    for i in range(num_planets):
        # Create a unique but deterministic seed for each planet
        planet_seed = Lehmer32()
        planet = generate_planet(random_seed=planet_seed)
        star_system['planets'].append(planet)

    # Restore the original RNG state
    restore_rng_state(original_state)
    return star_system

# Generate a planet
def generate_planet(random_seed=None):
    # Save the current RNG state
    original_state = save_rng_state()
    
    if random_seed is not None:
        try:
            if not isinstance(random_seed, (int, type(None))):
                random_seed = hash(str(random_seed)) & 0xFFFFFFFF
            Lehmer32(random_seed)
        except Exception:
            # If any error occurs during seed handling, continue with current state
            pass

    planet = {}

    # Generate planet type and name using Lehmer32
    planet_types = list(PLANET_CLASSES.keys())
    planet_type = planet_types[Lehmer32() % len(planet_types)]
    planet['planet_type'] = planet_type
    
    # Use the current RNG state for the name to ensure uniqueness
    planet['planet_name'] = get_random_planet_name(Lehmer32())
    planet['moons'] = []
    
    # Add the full planet class parameters
    planet_class = PLANET_CLASSES[planet_type]
    planet['params'] = {
        'noise_scale': planet_class['params']['noise_scale'],
        'octaves': planet_class['params']['octaves'],
        'persistence': planet_class['params']['persistence'],
        'lacunarity': planet_class['params']['lacunarity'],
        'terrain_height': planet_class['params']['terrain_height'],
        'seed': Lehmer32()  # Generate a new seed for this specific planet
    }
    
    # Add atmosphere and cloud properties based on planet type
    planet['has_atmosphere'] = planet_type not in ['Class-K']  # Only barren planets lack atmosphere
    planet['has_clouds'] = planet_type not in ['Class-K', 'Class-H']  # Desert and barren planets lack clouds
    planet['planet_size'] = 0.8 + (Lehmer32() % 5) * 0.4  # Random size between 0.8 and 2.8

    # Add new planet attributes
    planet['diplomacy'] = FACTION_TYPES[Lehmer32() % len(FACTION_TYPES)]
    planet['government'] = GOVERNMENT_TYPES[Lehmer32() % len(GOVERNMENT_TYPES)]
    planet['economy'] = ECONOMY_TYPES[Lehmer32() % len(ECONOMY_TYPES)]
    planet['technology'] = TECHNOLOGY_LEVELS[Lehmer32() % len(TECHNOLOGY_LEVELS)]

    # Generate moons with deterministic seeds
    # Limit moons based on planet type
    max_moons = 2 if planet_type in ['Class-K', 'Class-H'] else 4  # Fewer moons for barren/desert planets
    num_moons = Lehmer32() % (max_moons + 1)  # 0 to max_moons
    for i in range(num_moons):
        # Create a unique but deterministic seed for each moon
        moon_seed = Lehmer32()
        moon = generate_moon(random_seed=moon_seed)
        planet['moons'].append(moon)

    # Restore the original RNG state
    restore_rng_state(original_state)
    return planet

# Generate a moon
def generate_moon(random_seed=None):
    # Save the current RNG state
    original_state = save_rng_state()
    
    if random_seed is not None:
        Lehmer32(random_seed)

    moon = {}

    # Generate moon type and name using Lehmer32
    moon_types = ['rocky', 'ice', 'desert']
    moon['moon_type'] = moon_types[Lehmer32() % len(moon_types)]
    moon['moon_name'] = get_random_moon_name(Lehmer32())
    moon['moon_size'] = 0.2 + (Lehmer32() % 3) * 0.2  # Random size between 0.2 and 0.8

    # Add moon attributes
    moon['diplomacy'] = FACTION_TYPES[Lehmer32() % len(FACTION_TYPES)]
    moon['government'] = GOVERNMENT_TYPES[Lehmer32() % len(GOVERNMENT_TYPES)]
    moon['economy'] = ECONOMY_TYPES[Lehmer32() % len(ECONOMY_TYPES)]
    moon['technology'] = TECHNOLOGY_LEVELS[Lehmer32() % len(TECHNOLOGY_LEVELS)]

    # Restore the original RNG state
    restore_rng_state(original_state)
    return moon

# Generate the universe
def generate_universe(num_star_systems, seed=None):
    # Initialize RNG with the universe seed
    initialize_rng(seed)
    universe = []

    # Get a base seed for this universe
    universe_seed = Lehmer32()

    # Generate star systems using sector-based seeds
    for i in range(num_star_systems):
        # Calculate row and column from index
        row = i // 9  # A-J (0-9)
        col = i % 9   # 0-8
        
        # Create sector coordinate (e.g. 'A0', 'B1', etc.)
        sector = chr(ord('A') + row) + str(col)
        
        # Create a unique but deterministic seed for this sector
        # Combine the universe seed with the sector coordinate
        sector_seed = (universe_seed + sector_to_seed(sector)) & 0xFFFFFFFF
        
        # Generate the star system using the combined seed
        star_system = generate_star_system(random_seed=sector_seed)
        
        # Add sector information to the star system
        star_system['sector'] = sector
        
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