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

def get_current_universe_seed():
    """Get the current universe seed used for procedural generation."""
    global initial_seed
    return initial_seed

def get_universe_seed_from_env():
    """Get universe seed from environment or default to current seed."""
    import os
    env_seed = os.getenv('UNIVERSE_SEED', '20299999')
    try:
        return int(env_seed)
    except ValueError:
        return hash(env_seed) & 0xFFFFFFFF

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
FACTION_TYPES = ['friendly', 'neutral', 'enemy', 'unknown']
GOVERNMENT_TYPES = ['Tyranny', 'Democracy', 'Theocracy', 'Monarchy', 'Anarchy']
ECONOMY_TYPES = ['Agricultural', 'Industrial', 'Technological', 'Commercial', 'Mining', 'Research', 'Tourism']
TECHNOLOGY_LEVELS = [
    'Primitive',
    'Post-Atomic',
    'Starfaring',
    'Interstellar',
    'Intergalactic'
]

# Description templates for different celestial body types
PLANET_DESCRIPTIONS = {
    'Class-M': [
        "A lush, Earth-like world with vast oceans and diverse ecosystems.",
        "Temperate planet with breathable atmosphere and abundant water resources.",
        "Garden world featuring continental landmasses and polar ice caps.",
        "Verdant planet with extensive forests and fertile agricultural regions."
    ],
    'Class-L': [
        "Harsh world with marginal habitability and extreme weather patterns.",
        "Challenging environment with thin atmosphere and limited water sources.",
        "Rugged planet requiring environmental suits for extended surface operations.",
        "Borderline habitable world with frequent atmospheric disturbances."
    ],
    'Class-H': [
        "Arid desert world with scorching temperatures and minimal precipitation.",
        "Barren landscape dominated by sand dunes and rocky outcroppings.",
        "Hot, dry planet with rare oases and underground water reserves.",
        "Sun-baked world where survival depends on finding shelter from the heat."
    ],
    'Class-D': [
        "Toxic wasteland with corrosive atmosphere and volcanic activity.",
        "Hellish world shrouded in poisonous gases and acid rain.",
        "Demon-class planet where the very air is lethal to most life forms.",
        "Nightmare landscape of sulfur pools and toxic volcanic emissions."
    ],
    'Class-J': [
        "Massive gas giant with swirling atmospheric bands and powerful storms.",
        "Colossal world of hydrogen and helium with no solid surface.",
        "Giant planet featuring spectacular aurora displays and ring systems.",
        "Enormous gas world with crushing atmospheric pressure and violent winds."
    ],
    'Class-K': [
        "Barren rocky world with no atmosphere and cratered surface.",
        "Lifeless planet scarred by asteroid impacts and solar radiation.",
        "Desolate world suitable only for mining operations and research stations.",
        "Airless rock with extreme temperature variations between day and night."
    ],
    'Class-N': [
        "Ringed planet with spectacular ice and rock formations in orbit.",
        "Beautiful world adorned with complex ring systems and multiple moons.",
        "Gas giant featuring prominent rings visible from great distances.",
        "Majestic planet whose rings create stunning celestial displays."
    ],
    'Class-Y': [
        "Extremely hostile world with lethal radiation and toxic storms.",
        "Demon-class planet where even advanced technology struggles to survive.",
        "Apocalyptic landscape of molten rock and radioactive wastelands.",
        "Ultimate death world where only the most desperate would dare to land."
    ]
}

MOON_DESCRIPTIONS = {
    'rocky': [
        "Solid rocky satellite with mineral-rich surface deposits.",
        "Cratered moon featuring valuable ore veins and mining potential.",
        "Dense rocky body with exposed metallic formations.",
        "Asteroid-like moon with significant geological activity."
    ],
    'ice': [
        "Frozen world covered in thick layers of water ice.",
        "Crystalline moon with subsurface oceans beneath the ice shell.",
        "Glacial satellite featuring ice geysers and frozen valleys.",
        "Pristine ice world with potential for water extraction operations."
    ],
    'desert': [
        "Arid moon with sand-covered plains and rocky mesas.",
        "Dry satellite featuring ancient riverbeds and mineral deposits.",
        "Dusty world with extreme temperature variations and sandstorms.",
        "Barren moon where water is scarce but other resources may be abundant."
    ]
}

STAR_DESCRIPTIONS = {
    'red dwarf': [
        "Small, cool star with a long lifespan and stable energy output.",
        "Dim red star providing gentle warmth to its planetary system.",
        "Ancient stellar body with billions of years of remaining fuel.",
        "Compact star with a habitable zone close to its surface."
    ],
    'yellow dwarf': [
        "Sun-like star providing optimal conditions for planetary development.",
        "Stable main-sequence star with balanced energy output.",
        "Golden star supporting diverse planetary ecosystems.",
        "Medium-sized star in the prime of its stellar evolution."
    ],
    'blue giant': [
        "Massive, hot star burning through its fuel at an accelerated rate.",
        "Brilliant blue star with intense radiation and short lifespan.",
        "Powerful stellar giant dominating its local stellar neighborhood.",
        "High-energy star creating spectacular nebular formations."
    ],
    'white dwarf': [
        "Dense stellar remnant slowly cooling over cosmic time.",
        "Compact star representing the final stage of stellar evolution.",
        "Small but incredibly dense stellar core with intense gravity.",
        "Ancient stellar remnant providing dim but steady illumination."
    ]
}

def generate_description(body_type, classification, attributes=None):
    """Generate a short description for a celestial body based on its type and attributes."""
    if body_type == 'star':
        descriptions = STAR_DESCRIPTIONS.get(classification, STAR_DESCRIPTIONS['yellow dwarf'])
    elif body_type == 'planet':
        descriptions = PLANET_DESCRIPTIONS.get(classification, PLANET_DESCRIPTIONS['Class-M'])
    elif body_type == 'moon':
        descriptions = MOON_DESCRIPTIONS.get(classification, MOON_DESCRIPTIONS['rocky'])
    else:
        return "Unknown celestial body with mysterious properties."
    
    # Use Lehmer32 to select a description deterministically
    return descriptions[Lehmer32() % len(descriptions)]

def generate_intel_brief(body_type, classification, attributes):
    """Generate an intel brief based on the body's attributes."""
    if body_type == 'star':
        return generate_star_intel(classification)
    elif body_type in ['planet', 'moon']:
        return generate_planetary_intel(body_type, classification, attributes)
    else:
        return "No intelligence data available for this celestial body."

def generate_star_intel(star_type):
    """Generate intel brief for stars."""
    intel_templates = {
        'red dwarf': [
            "Long-term stellar stability makes this system ideal for permanent settlements.",
            "Low radiation output allows for close-orbit mining operations.",
            "Extended stellar lifespan ensures reliable energy for millennia.",
            "Stable fusion processes create predictable solar weather patterns."
        ],
        'yellow dwarf': [
            "Optimal stellar conditions support diverse planetary biospheres.",
            "Balanced energy output creates stable climate zones throughout the system.",
            "Main-sequence stability indicates prime real estate for colonization.",
            "Solar activity within normal parameters for most technological operations."
        ],
        'blue giant': [
            "High radiation levels require enhanced shielding for all operations.",
            "Stellar instability may affect long-term settlement viability.",
            "Intense energy output accelerates stellar evolution timeline.",
            "Extreme solar weather poses risks to unprotected spacecraft."
        ],
        'white dwarf': [
            "Minimal stellar activity reduces interference with sensitive equipment.",
            "Extreme gravitational fields may affect navigation systems.",
            "Low energy output requires alternative power sources for operations.",
            "Stellar remnant status indicates ancient system with potential artifacts."
        ]
    }
    
    templates = intel_templates.get(star_type, intel_templates['yellow dwarf'])
    return templates[Lehmer32() % len(templates)]

def generate_planetary_intel(body_type, classification, attributes):
    """Generate intel brief for planets and moons."""
    diplomacy = attributes.get('diplomacy', 'unknown')
    government = attributes.get('government', 'Unknown')
    economy = attributes.get('economy', 'Unknown')
    technology = attributes.get('technology', 'Unknown')
    
    # Base intel on diplomacy status
    diplomacy_intel = {
        'friendly': [
            "Allied territory with favorable trade agreements and docking privileges.",
            "Friendly relations ensure safe passage and potential assistance.",
            "Cooperative government welcomes foreign visitors and traders.",
            "Established diplomatic ties provide security and commercial opportunities."
        ],
        'neutral': [
            "Independent territory with standard diplomatic protocols.",
            "Neutral stance requires careful navigation of local regulations.",
            "Non-aligned government maintains cautious but fair trade policies.",
            "Diplomatic neutrality offers opportunities for all factions."
        ],
        'enemy': [
            "Hostile territory - approach with extreme caution and defensive measures.",
            "Enemy forces may engage on sight - avoid unless absolutely necessary.",
            "Aggressive government poses significant threat to unauthorized vessels.",
            "Combat readiness essential when operating in this hostile region."
        ],
        'unknown': [
            "Uncharted territory with unknown political affiliations and intentions.",
            "First contact protocols recommended for initial diplomatic engagement.",
            "Unknown government structure requires careful assessment before approach.",
            "Proceed with caution until diplomatic status can be determined."
        ]
    }
    
    # Add technology-based intel
    tech_intel = {
        'Primitive': "Limited technological development restricts communication and trade options.",
        'Post-Atomic': "Emerging technology base offers potential for technological exchange.",
        'Starfaring': "Advanced spaceflight capabilities enable regular interstellar commerce.",
        'Interstellar': "Sophisticated technology provides extensive trade and diplomatic opportunities.",
        'Intergalactic': "Cutting-edge technology may offer access to advanced systems and knowledge."
    }
    
    # Add economy-based intel
    economy_intel = {
        'Agricultural': "Primary food production makes this world valuable for supply operations.",
        'Industrial': "Manufacturing capabilities offer repair services and equipment procurement.",
        'Technological': "Research facilities may provide advanced technology and upgrades.",
        'Commercial': "Major trade hub with extensive merchant networks and market opportunities.",
        'Mining': "Resource extraction operations provide raw materials and fuel supplies.",
        'Research': "Scientific installations offer data, analysis, and technological insights.",
        'Tourism': "Service-oriented economy provides excellent facilities for crew rest and recreation."
    }
    
    # Select primary intel based on diplomacy
    primary_intel = diplomacy_intel.get(diplomacy, diplomacy_intel['unknown'])
    selected_primary = primary_intel[Lehmer32() % len(primary_intel)]
    
    # Add secondary intel based on technology and economy
    tech_detail = tech_intel.get(technology, "Technology level assessment unavailable.")
    economy_detail = economy_intel.get(economy, "Economic analysis inconclusive.")
    
    # Combine into comprehensive brief
    return f"{selected_primary} {tech_detail} {economy_detail}"

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
            # Check for special starter system
            if random_seed == 'A0':
                return generate_starter_system()
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
    
    # Add description and intel brief for the star
    star_system['description'] = generate_description('star', star_system['star_type'])
    star_system['intel_brief'] = generate_star_intel(star_system['star_type'])
    
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

def generate_starter_system():
    """Generate a special compact starter system for sector A0"""
    star_system = {}
    
    # Fixed starter system configuration for consistency
    star_system['star_type'] = 'yellow dwarf'
    star_system['star_name'] = 'Sol'
    star_system['star_size'] = 2.0
    
    # Custom descriptions for the starter system
    star_system['description'] = "A stable yellow dwarf star providing optimal conditions for new space explorers to learn navigation and basic starship operations."
    star_system['intel_brief'] = "Training zone designated for new starship captains. Minimal hostile activity expected. Ideal for learning basic ship systems and space navigation."
    
    # Create exactly one planet with a few moons for simplicity
    starter_planet = {
        'planet_name': 'Terra Prime',
        'planet_type': 'Class-M',
        'planet_size': 1.2,
        'has_atmosphere': True,
        'has_clouds': True,
        'diplomacy': 'friendly',
        'government': 'Democracy',
        'economy': 'Training',
        'technology': 'Starfaring',
        'description': "A beautiful Earth-like training world with diverse biomes and friendly inhabitants. Perfect for new explorers to practice planetary scanning and basic diplomacy.",
        'intel_brief': "Primary training facility for Starfleet Academy graduates. All services available. Excellent repair facilities and equipment suppliers for new captains.",
        'params': {
            'noise_scale': 0.02,
            'octaves': 4,
            'persistence': 0.5,
            'lacunarity': 2.0,
            'terrain_height': 0.3,
            'seed': 12345
        },
        'moons': []
    }
    
    # Add exactly 2 moons for practice navigation
    moon1 = {
        'moon_name': 'Luna',
        'moon_type': 'rocky',
        'moon_size': 0.3,
        'diplomacy': 'friendly',
        'government': 'Democracy', 
        'economy': 'Mining',
        'technology': 'Starfaring',
        'description': "A barren but mineral-rich moon serving as a training ground for mining operations and surface exploration.",
        'intel_brief': "Training mining facility. Safe environment for learning resource extraction and EVA procedures."
    }
    
    moon2 = {
        'moon_name': 'Europa',
        'moon_type': 'ice',
        'moon_size': 0.25,
        'diplomacy': 'neutral',
        'government': 'Independent',
        'economy': 'Research',
        'technology': 'Starfaring', 
        'description': "An ice-covered moon with subsurface oceans, used for training in extreme environment operations.",
        'intel_brief': "Independent research station specializing in exobiology and extreme environment training. Ice mining facilities available. Standard docking fees apply."
    }
    
    starter_planet['moons'] = [moon1, moon2]
    star_system['planets'] = [starter_planet]
    
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
    
    # Add description and intel brief
    planet['description'] = generate_description('planet', planet_type)
    planet['intel_brief'] = generate_planetary_intel('planet', planet_type, planet)

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
    
    # Add description and intel brief
    moon['description'] = generate_description('moon', moon['moon_type'])
    moon['intel_brief'] = generate_planetary_intel('moon', moon['moon_type'], moon)

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
        
        # Special case for starter system
        if sector == 'A0':
            star_system = generate_starter_system()
        else:
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