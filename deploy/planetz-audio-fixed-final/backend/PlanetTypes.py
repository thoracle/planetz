import random

PLANET_CLASSES = {
    "Class-M": {
        "name": "Class-M (Earth-like)",
        "description": "Earth-like planets capable of supporting humanoid life",
        "params": {
            "noise_scale": 1.2,
            "octaves": 5,
            "persistence": 0.5,
            "lacunarity": 2.0,
            "terrain_height": 0.15,
            "seed": random.random() * 10000
        }
    },
    "Class-L": {
        "name": "Class-L (Marginal)",
        "description": "Marginally habitable with harsh conditions",
        "params": {
            "noise_scale": 2.0,
            "octaves": 6,
            "persistence": 0.6,
            "lacunarity": 2.2,
            "terrain_height": 0.25,
            "seed": random.random() * 10000
        }
    },
    "Class-H": {
        "name": "Class-H (Desert)",
        "description": "Hot, arid worlds with little surface water",
        "params": {
            "noise_scale": 3.0,
            "octaves": 4,
            "persistence": 0.4,
            "lacunarity": 2.5,
            "terrain_height": 0.2,
            "seed": random.random() * 10000
        }
    },
    "Class-D": {
        "name": "Class-D (Demon)",
        "description": "Toxic atmosphere, uninhabitable",
        "params": {
            "noise_scale": 4.0,
            "octaves": 7,
            "persistence": 0.7,
            "lacunarity": 2.8,
            "terrain_height": 0.4,
            "seed": random.random() * 10000
        }
    },
    "Class-J": {
        "name": "Class-J (Gas Giant)",
        "description": "Gas giants similar to Jupiter",
        "params": {
            "noise_scale": 0.8,
            "octaves": 3,
            "persistence": 0.3,
            "lacunarity": 1.8,
            "terrain_height": 0.08,
            "seed": random.random() * 10000
        }
    },
    "Class-K": {
        "name": "Class-K (Barren)",
        "description": "Barren, rocky worlds with limited water",
        "params": {
            "noise_scale": 2.5,
            "octaves": 4,
            "persistence": 0.45,
            "lacunarity": 2.3,
            "terrain_height": 0.3,
            "seed": random.random() * 10000
        }
    },
    "Class-N": {
        "name": "Class-N (Ringed)",
        "description": "Planets with rings similar to Saturn",
        "params": {
            "noise_scale": 1.0,
            "octaves": 4,
            "persistence": 0.4,
            "lacunarity": 2.0,
            "terrain_height": 0.12,
            "seed": random.random() * 10000
        }
    },
    "Class-Y": {
        "name": "Class-Y (Demon)",
        "description": "Extremely inhospitable with lethal conditions",
        "params": {
            "noise_scale": 4.5,
            "octaves": 8,
            "persistence": 0.8,
            "lacunarity": 3.0,
            "terrain_height": 0.5,
            "seed": random.random() * 10000
        }
    }
}