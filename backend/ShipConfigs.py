"""
Ship configurations for backend API
Based on frontend/static/js/ship/ShipConfigs.js
Updated to ensure all ships have exactly 4 weapon slots
"""

SHIP_CONFIGS = {
    'starter_ship': {
        'name': 'Starter Ship',
        'description': 'Basic training vessel with essential systems',
        'baseSpeed': 30,
        'baseArmor': 20,
        'baseFirepower': 20,
        'baseCargoCapacity': 5,
        'baseHardpoints': 3,
        'maxEnergy': 1000,
        'energyRechargeRate': 20,
        'maxHull': 300,
        'systemSlots': 11,  # Updated to match frontend
        'slotConfig': {
            'engines': 1,
            'reactor': 1,
            'weapons': 4,  # Fixed: exactly 4 weapon slots for testing
            'utility': 5   # Updated to match frontend (was 3)
        },
        'defaultSystems': {
            'hull_plating': {'level': 1, 'slots': 1},
            'energy_reactor': {'level': 1, 'slots': 1},
            'impulse_engines': {'level': 1, 'slots': 1, 'energyConsumption': 8},
            'target_computer': {'level': 1, 'slots': 1, 'energyConsumption': 5},
            'long_range_scanner': {'level': 1, 'slots': 1, 'energyConsumption': 4},
            'star_charts': {'level': 1, 'slots': 1, 'energyConsumption': 6}
        },
        'starterCards': {
            'utility_1': {'cardType': 'target_computer', 'level': 3},
            'utility_2': {'cardType': 'hull_plating', 'level': 1},
            'utility_3': {'cardType': 'long_range_scanner', 'level': 1},
            'utility_4': {'cardType': 'star_charts', 'level': 1},
            'engine_1': {'cardType': 'impulse_engines', 'level': 1},
            'power_1': {'cardType': 'energy_reactor', 'level': 1},
            'weapon_1': {'cardType': 'laser_cannon', 'level': 1},
            'weapon_2': {'cardType': 'pulse_cannon', 'level': 1},
            'weapon_3': {'cardType': 'plasma_cannon', 'level': 1},
            'weapon_4': {'cardType': 'phaser_array', 'level': 1}
        }
    },
    'heavy_fighter': {
        'name': 'Heavy Fighter',
        'description': 'Durable combat ship for prolonged engagements',
        'baseSpeed': 50,
        'baseArmor': 80,
        'baseFirepower': 80,
        'baseCargoCapacity': 15,
        'baseHardpoints': 8,
        'maxEnergy': 5000,
        'energyRechargeRate': 50,
        'maxHull': 1000,
        'systemSlots': 18,
        'slotConfig': {
            'engines': 1,
            'reactor': 1,
            'shields': 1,
            'weapons': 4,  # Maximum weapons for heavy combat role
            'utility': 11  # Updated to match frontend (was 11)
        },
        'defaultSystems': {
            'hull_plating': {'level': 5, 'slots': 1},
            'energy_reactor': {'level': 5, 'slots': 1},
            'shield_generator': {'level': 6, 'slots': 1, 'energyConsumption': 30},
            'cargo_hold': {'level': 2, 'slots': 1},
            'impulse_engines': {'level': 4, 'slots': 1, 'energyConsumption': 20},
            'warp_drive': {'level': 1, 'slots': 1, 'energyConsumption': 0},
            'shields': {'level': 1, 'slots': 1, 'energyConsumption': 25},
            'laser_cannon': {'level': 7, 'slots': 1, 'energyConsumption': 0},
            'long_range_scanner': {'level': 1, 'slots': 1, 'energyConsumption': 5},
            'subspace_radio': {'level': 1, 'slots': 1, 'energyConsumption': 6},
            'galactic_chart': {'level': 1, 'slots': 1, 'energyConsumption': 8},
            'target_computer': {'level': 3, 'slots': 1, 'energyConsumption': 8},
            'missile_tubes': {'level': 1, 'slots': 1, 'energyConsumption': 0}
        }
    },
    'scout': {
        'name': 'Scout',
        'description': 'Fast reconnaissance ship with advanced sensors',
        'baseSpeed': 90,
        'baseArmor': 30,
        'baseFirepower': 40,
        'baseCargoCapacity': 8,
        'baseHardpoints': 4,
        'maxEnergy': 3500,
        'energyRechargeRate': 60,
        'maxHull': 500,
        'systemSlots': 18,  # Updated to match frontend (was 15)
        'slotConfig': {
            'engines': 1,
            'reactor': 1,
            'shields': 1,
            'weapons': 2,  # Fewer weapons - reconnaissance focused
            'utility': 14  # Updated to match frontend (was 10)
        },
        'defaultSystems': {
            'hull_plating': {'level': 3, 'slots': 1},
            'energy_reactor': {'level': 4, 'slots': 1},
            'shield_generator': {'level': 2, 'slots': 1, 'energyConsumption': 10},
            'cargo_hold': {'level': 1, 'slots': 1},
            'impulse_engines': {'level': 2, 'slots': 1, 'energyConsumption': 15},
            'warp_drive': {'level': 2, 'slots': 1, 'energyConsumption': 0},
            'shields': {'level': 1, 'slots': 1, 'energyConsumption': 15},
            'pulse_cannon': {'level': 1, 'slots': 1, 'energyConsumption': 0},
            'long_range_scanner': {'level': 3, 'slots': 1, 'energyConsumption': 3},
            'subspace_radio': {'level': 2, 'slots': 1, 'energyConsumption': 4},
            'galactic_chart': {'level': 2, 'slots': 1, 'energyConsumption': 6},
            'target_computer': {'level': 2, 'slots': 1, 'energyConsumption': 6}
        }
    },
    'light_fighter': {
        'name': 'Light Fighter',
        'description': 'Balanced combat vessel for dogfights and skirmishes',
        'baseSpeed': 70,
        'baseArmor': 50,
        'baseFirepower': 60,
        'baseCargoCapacity': 12,
        'baseHardpoints': 6,
        'maxEnergy': 4000,
        'energyRechargeRate': 55,
        'maxHull': 700,
        'systemSlots': 18,
        'slotConfig': {
            'engines': 1,
            'reactor': 1,
            'shields': 1,
            'weapons': 3,
            'utility': 13
        },
        'defaultSystems': {
            'hull_plating': {'level': 4, 'slots': 1},
            'energy_reactor': {'level': 4, 'slots': 1},
            'shield_generator': {'level': 3, 'slots': 1, 'energyConsumption': 15},
            'cargo_hold': {'level': 1, 'slots': 1},
            'impulse_engines': {'level': 1, 'slots': 1, 'energyConsumption': 18},
            'warp_drive': {'level': 1, 'slots': 1, 'energyConsumption': 0},
            'shields': {'level': 2, 'slots': 1, 'energyConsumption': 20},
            'plasma_cannon': {'level': 2, 'slots': 1, 'energyConsumption': 0},
            'long_range_scanner': {'level': 1, 'slots': 1, 'energyConsumption': 5},
            'subspace_radio': {'level': 1, 'slots': 1, 'energyConsumption': 6},
            'galactic_chart': {'level': 1, 'slots': 1, 'energyConsumption': 8},
            'target_computer': {'level': 3, 'slots': 1, 'energyConsumption': 7}
        }
    },
    'light_freighter': {
        'name': 'Light Freighter',
        'description': 'Versatile trading vessel with moderate combat capability',
        'baseSpeed': 40,
        'baseArmor': 60,
        'baseFirepower': 30,
        'baseCargoCapacity': 50,
        'baseHardpoints': 6,
        'maxEnergy': 6000,
        'energyRechargeRate': 45,
        'maxHull': 900,
        'systemSlots': 20,
        'slotConfig': {
            'engines': 1,
            'reactor': 1,
            'shields': 1,
            'weapons': 2,
            'utility': 16
        },
        'defaultSystems': {
            'hull_plating': {'level': 5, 'slots': 1},
            'energy_reactor': {'level': 6, 'slots': 1},
            'shield_generator': {'level': 4, 'slots': 1, 'energyConsumption': 20},
            'cargo_hold': {'level': 5, 'slots': 1},
            'impulse_engines': {'level': 1, 'slots': 1, 'energyConsumption': 25},
            'warp_drive': {'level': 1, 'slots': 1, 'energyConsumption': 0},
            'shields': {'level': 2, 'slots': 1, 'energyConsumption': 30},
            'pulse_cannon': {'level': 1, 'slots': 1, 'energyConsumption': 0},
            'long_range_scanner': {'level': 2, 'slots': 1, 'energyConsumption': 4},
            'subspace_radio': {'level': 2, 'slots': 1, 'energyConsumption': 5},
            'galactic_chart': {'level': 2, 'slots': 1, 'energyConsumption': 7},
            'target_computer': {'level': 3, 'slots': 1, 'energyConsumption': 8}
        }
    },
    'heavy_freighter': {
        'name': 'Heavy Freighter',
        'description': 'High-capacity trading vessel for bulk cargo',
        'baseSpeed': 25,
        'baseArmor': 70,
        'baseFirepower': 20,
        'baseCargoCapacity': 100,
        'baseHardpoints': 4,
        'maxEnergy': 8000,
        'energyRechargeRate': 40,
        'maxHull': 1200,
        'systemSlots': 25,
        'slotConfig': {
            'engines': 1,
            'reactor': 1,
            'shields': 1,
            'weapons': 1,
            'utility': 22
        },
        'defaultSystems': {
            'hull_plating': {'level': 6, 'slots': 1},
            'energy_reactor': {'level': 8, 'slots': 1},
            'shield_generator': {'level': 5, 'slots': 1, 'energyConsumption': 25},
            'cargo_hold': {'level': 10, 'slots': 1},
            'impulse_engines': {'level': 1, 'slots': 1, 'energyConsumption': 35},
            'warp_drive': {'level': 1, 'slots': 1, 'energyConsumption': 0},
            'shields': {'level': 3, 'slots': 1, 'energyConsumption': 40},
            'pulse_cannon': {'level': 1, 'slots': 1, 'energyConsumption': 0},
            'long_range_scanner': {'level': 2, 'slots': 1, 'energyConsumption': 6},
            'subspace_radio': {'level': 2, 'slots': 1, 'energyConsumption': 7},
            'galactic_chart': {'level': 2, 'slots': 1, 'energyConsumption': 9},
            'target_computer': {'level': 3, 'slots': 1, 'energyConsumption': 10}
        }
    }
}

# Repair pricing configuration
REPAIR_PRICING = {
    'baseCosts': {
        'hull': 50,           # Credits per % hull damage
        'system': 100,        # Base cost per system
        'critical': 1.5,      # Multiplier for critical systems
        'emergency': 2.0      # Multiplier for emergency repairs
    },
    'shipClassMultipliers': {
        'scout': 0.8,
        'light_fighter': 1.0,
        'heavy_fighter': 1.2,
        'light_freighter': 1.5,
        'heavy_freighter': 2.0
    },
    'factionDiscounts': {
        'friendly': 0.8,
        'neutral': 1.0,
        'hostile': 1.5
    },
    'repairTimes': {
        'hull': 2,            # Seconds per % hull damage
        'system': 30,         # Base seconds per system
        'emergency': 0.5      # Multiplier for instant repair
    }
}

# Critical systems that cost more to repair
CRITICAL_SYSTEMS = ['hull_plating', 'energy_reactor', 'impulse_engines', 'life_support']

def get_ship_config(ship_type):
    """Get ship configuration by type."""
    return SHIP_CONFIGS.get(ship_type)

def get_available_ship_types():
    """Get list of available ship types."""
    return list(SHIP_CONFIGS.keys())

def validate_ship_config(config):
    """Validate ship configuration."""
    if not config:
        return False
    
    required_fields = ['name', 'description', 'maxEnergy', 'maxHull', 'systemSlots', 'defaultSystems']
    return all(field in config for field in required_fields) 