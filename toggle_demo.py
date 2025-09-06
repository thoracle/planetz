#!/usr/bin/env python3
"""
Realistic Orbital Mechanics Toggle Demo
=======================================

This script demonstrates how to toggle between realistic and simplified
orbital mechanics in the unified data architecture.
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def demo_toggle():
    """Demonstrate the orbital mechanics toggle functionality."""
    print("🚀 Realistic Orbital Mechanics Toggle Demo")
    print("=" * 50)

    from backend.positioning_enhancement import PositioningEnhancement
    from backend.verse import generate_starter_system

    # Create positioning system with realistic orbits enabled
    positioning = PositioningEnhancement(universe_seed=20299999, use_realistic_orbits=True)

    print("1️⃣  Initial state:")
    print(f"   Realistic orbits: {positioning.is_realistic_orbits_enabled()}")
    print(f"   Mode: {positioning.get_positioning_mode()}")

    # Generate star system
    base_system = generate_starter_system()
    enhanced_system = positioning.enhance_star_system(base_system)

    print("\n2️⃣  Enhanced system with realistic orbits:")
    print(f"   Planet 0 position: {enhanced_system['planets'][0]['position']}")
    print(f"   Planet 0 orbit angle: {enhanced_system['planets'][0]['orbit']['angle']:.2f}°")
    print(f"   Planet 0 orbit period: {enhanced_system['planets'][0]['orbit']['period']:.1f} days")

    # Toggle to simplified mode
    print("\n3️⃣  Toggling to simplified mode...")
    new_state = positioning.toggle_realistic_orbits()
    print(f"   Realistic orbits: {positioning.is_realistic_orbits_enabled()}")
    print(f"   Mode: {positioning.get_positioning_mode()}")

    # Generate system with simplified positioning
    simplified_system = positioning.enhance_star_system(base_system)

    print("\n4️⃣  System with simplified positioning:")
    print(f"   Planet 0 position: {simplified_system['planets'][0]['position']}")
    print(f"   Planet 0 orbit angle: {simplified_system['planets'][0]['orbit']['angle']:.2f}°")
    print(f"   Planet 0 orbit period: {simplified_system['planets'][0]['orbit']['period']:.1f} days")

    # Demonstrate time-based updates
    print("\n5️⃣  Time-based updates:")

    # Realistic mode
    positioning.enable_realistic_orbits()
    time_elapsed = 50.0  # 50 Earth days
    updated_realistic = positioning.update_positions_over_time(enhanced_system, time_elapsed)
    print(f"   Realistic mode after {time_elapsed} days:")
    print(f"     Planet 0 new angle: {updated_realistic['planets'][0]['orbit']['angle']:.2f}°")

    # Simplified mode
    positioning.disable_realistic_orbits()
    updated_simplified = positioning.update_positions_over_time(simplified_system, time_elapsed)
    print(f"   Simplified mode after {time_elapsed} days:")
    print(f"     Planet 0 angle unchanged: {updated_simplified['planets'][0]['orbit']['angle']:.2f}°")

    print("\n✅ Toggle demo completed!")
    print("   You can switch between realistic and simplified orbital mechanics anytime!")

def usage_examples():
    """Show usage examples."""
    print("\n📚 Usage Examples:")
    print("=" * 30)
    print()
    print("# Enable realistic orbital mechanics")
    print("positioning = PositioningEnhancement(use_realistic_orbits=True)")
    print()
    print("# Switch to simplified mode")
    print("positioning.disable_realistic_orbits()")
    print()
    print("# Toggle between modes")
    print("new_state = positioning.toggle_realistic_orbits()")
    print()
    print("# Check current mode")
    print("mode = positioning.get_positioning_mode()  # Returns 'realistic' or 'simplified'")
    print("is_realistic = positioning.is_realistic_orbits_enabled()")

if __name__ == "__main__":
    demo_toggle()
    usage_examples()
