#!/usr/bin/env python3
"""
Generate Star Charts database from procedural universe generation.
Run this script to create/update the static database for the Star Charts system.

Usage:
    python3 scripts/generate_star_charts_db.py

This script:
1. Uses the same UNIVERSE_SEED as the game for consistency
2. Generates universe data using verse.py functions
3. Creates static JSON database with object IDs, positions, and metadata
4. Handles A0 infrastructure integration from JSON file
5. Outputs database to data/star_charts/objects.json
"""

import os
import json
import sys
from datetime import datetime
from pathlib import Path

# Add backend to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))
sys.path.insert(0, str(project_root / 'backend'))

try:
    from backend.verse import generate_universe, sector_to_seed
    print("✅ Successfully imported verse.py functions")
except ImportError as e:
    print(f"❌ Failed to import verse.py: {e}")
    print("Make sure you're running this from the project root directory")
    sys.exit(1)

def main():
    """Generate Star Charts database from procedural universe generation"""
    
    # Use same seed as game
    universe_seed = os.getenv('UNIVERSE_SEED', '20299999')
    print(f"🌌 Generating Star Charts database with seed: {universe_seed}")
    
    try:
        # Generate universe (90 sectors: A0-J8)
        print("🔄 Generating procedural universe...")
        universe = generate_universe(90, universe_seed)
        print(f"✅ Generated {len(universe)} sectors")
        
        # Create database structure
        star_charts_db = {
            "metadata": {
                "universe_seed": universe_seed,
                "generation_timestamp": datetime.now().isoformat(),
                "generator_version": "1.0",
                "total_sectors": len(universe),
                "description": "Star Charts static database generated from verse.py"
            },
            "sectors": {}
        }
        
        # Process each sector
        print("🔄 Processing sectors...")
        for i, star_system in enumerate(universe):
            sector = star_system['sector']
            star_charts_db["sectors"][sector] = extract_sector_data(star_system)
            
            if i % 10 == 0:  # Progress indicator
                print(f"   Processed {i+1}/{len(universe)} sectors...")
        
        # Load A0 infrastructure data
        print("🔄 Loading A0 infrastructure data...")
        infrastructure_data = load_starter_infrastructure()
        if infrastructure_data and 'A0' in star_charts_db["sectors"]:
            star_charts_db["sectors"]["A0"]["infrastructure"] = {
                "stations": infrastructure_data.get("stations", []),
                "beacons": infrastructure_data.get("beacons", [])
            }
            print(f"✅ Added {len(infrastructure_data.get('stations', []))} stations and {len(infrastructure_data.get('beacons', []))} beacons to A0")
        
        # Ensure output directory exists
        output_dir = project_root / "data" / "star_charts"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Save database
        output_path = output_dir / "objects.json"
        with open(output_path, 'w') as f:
            json.dump(star_charts_db, f, indent=2)
        
        print(f"✅ Star Charts database generated: {output_path}")
        print(f"📊 Database statistics:")
        print(f"   - Total sectors: {len(star_charts_db['sectors'])}")
        print(f"   - Universe seed: {universe_seed}")
        print(f"   - Generation time: {star_charts_db['metadata']['generation_timestamp']}")
        
        # Validate A0 sector
        if 'A0' in star_charts_db["sectors"]:
            a0_data = star_charts_db["sectors"]["A0"]
            total_objects = len(a0_data.get("objects", []))
            total_stations = len(a0_data.get("infrastructure", {}).get("stations", []))
            total_beacons = len(a0_data.get("infrastructure", {}).get("beacons", []))
            print(f"   - A0 sector: {total_objects} celestial objects, {total_stations} stations, {total_beacons} beacons")
        
        return True
        
    except Exception as e:
        print(f"❌ Error generating database: {e}")
        import traceback
        traceback.print_exc()
        return False

def extract_sector_data(star_system):
    """Extract object data for Star Charts database"""
    
    sector_data = {
        "star": {
            "id": f"{star_system['sector']}_star",
            "name": star_system['star_name'],
            "type": "star",
            "class": star_system.get('star_type', 'G-type main-sequence star'),
            "position": [0, 0, 0],  # Stars are always at system center
            "visualRadius": star_system.get('star_size', 2.0),
            "description": star_system.get('description', f"The central star of the {star_system['sector']} system")
        },
        "objects": []
    }
    
    # Add planets and moons
    for planet in star_system.get('planets', []):
        planet_data = extract_planet_data(planet, star_system['sector'])
        sector_data["objects"].append(planet_data)
        
        # Add moons
        for moon in planet.get('moons', []):
            moon_data = extract_moon_data(moon, planet, star_system['sector'])
            sector_data["objects"].append(moon_data)
    
    return sector_data

def extract_planet_data(planet, sector):
    """Extract planet data with consistent ID format"""
    
    planet_id = f"{sector}_{planet['planet_name'].lower().replace(' ', '_')}"
    
    # Calculate orbital position (simplified - actual position will be calculated at runtime)
    orbit_radius = planet.get('orbit_radius', 1.0)  # AU
    orbit_angle = planet.get('orbit_angle', 0)  # radians
    
    position = [
        orbit_radius * 149.6,  # Convert AU to game units (1 AU ≈ 149.6M km)
        0,  # Y is typically 0 for orbital plane
        0   # Z calculated from angle at runtime
    ]
    
    return {
        "id": planet_id,
        "name": planet['planet_name'],
        "type": "planet",
        "class": planet.get('planet_type', 'terrestrial'),
        "position": position,
        "visualRadius": planet.get('planet_size', 1.0),
        "orbit": {
            "parent": f"{sector}_star",
            "radius": orbit_radius * 149.6,  # Convert to game units
            "period": planet.get('orbit_period', 365.25),  # days
            "angle": orbit_angle
        },
        "description": planet.get('description', f"A {planet.get('planet_type', 'terrestrial')} world")
    }

def extract_moon_data(moon, planet, sector):
    """Extract moon data with consistent ID format"""
    
    moon_id = f"{sector}_{moon['moon_name'].lower().replace(' ', '_')}"
    planet_id = f"{sector}_{planet['planet_name'].lower().replace(' ', '_')}"
    
    # Calculate moon position relative to planet
    moon_orbit_radius = moon.get('orbit_radius', 0.01)  # AU from planet
    moon_orbit_angle = moon.get('orbit_angle', 0)  # radians
    
    # Moon position is relative to planet position
    planet_orbit_radius = planet.get('orbit_radius', 1.0)
    
    position = [
        (planet_orbit_radius + moon_orbit_radius) * 149.6,
        0,
        0
    ]
    
    return {
        "id": moon_id,
        "name": moon['moon_name'],
        "type": "moon",
        "class": moon.get('moon_type', 'rocky'),
        "position": position,
        "visualRadius": moon.get('moon_size', 0.3),
        "orbit": {
            "parent": planet_id,
            "radius": moon_orbit_radius * 149.6,
            "period": moon.get('orbit_period', 28),  # days
            "angle": moon_orbit_angle
        },
        "description": moon.get('description', f"A {moon.get('moon_type', 'rocky')} moon")
    }

def load_starter_infrastructure():
    """Load infrastructure data from JSON file"""
    
    infrastructure_path = project_root / "data" / "starter_system_infrastructure.json"
    
    try:
        with open(infrastructure_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"⚠️  Infrastructure file not found: {infrastructure_path}")
        return None
    except json.JSONDecodeError as e:
        print(f"⚠️  Error parsing infrastructure JSON: {e}")
        return None

if __name__ == "__main__":
    print("🚀 Star Charts Database Generator")
    print("=" * 50)
    
    success = main()
    
    if success:
        print("\n✅ Database generation completed successfully!")
        print("\nNext steps:")
        print("1. Review the generated database at data/star_charts/objects.json")
        print("2. Implement StarChartsManager.js to use this database")
        print("3. Test discovery mechanics with A0 sector data")
    else:
        print("\n❌ Database generation failed!")
        sys.exit(1)
