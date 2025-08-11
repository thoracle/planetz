# Mission System User Guide 🎯

**Complete Guide for Game Designers and Content Creators**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Mission Structure](#mission-structure)
4. [Creating Missions](#creating-missions)
5. [Mission Templates](#mission-templates)
6. [Testing Missions](#testing-missions)
7. [Mission Types](#mission-types)
8. [Advanced Features](#advanced-features)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## 🎮 Overview

The PlanetZ mission system provides a comprehensive framework for creating engaging quests and contracts that integrate seamlessly with the space combat gameplay. The system supports:

- **Multiple Mission Types**: Combat, exploration, trading, escort missions
- **Dynamic Generation**: Template-based procedural mission creation
- **State Management**: Progressive mission states with failure handling
- **Event Integration**: Automatic progress tracking based on game events
- **Cascade Effects**: Mission failures can affect other missions and world state
- **Flexible Objectives**: Support for ordered, optional, and conditional objectives

### Key Concepts

- **Mission**: A complete quest with objectives, rewards, and story
- **Template**: A reusable pattern for generating similar missions
- **Objective**: Individual tasks within a mission (required or optional)
- **State**: Current mission progress (Unknown → Mentioned → Accepted → Achieved → Completed)
- **Cascade Effects**: How mission failures impact other missions and world state

---

## 🚀 Getting Started

### Prerequisites

1. **Game Running**: Ensure the PlanetZ game is running with the Flask backend
2. **Mission Directory**: Navigate to `missions/` in your project folder
3. **Text Editor**: Use any JSON-compatible text editor (VS Code recommended)

### Quick Start

1. **Start the Backend Server**:
   ```bash
   cd backend
   python3 app.py
   ```

2. **Access Mission Board In-Game**:
   - Dock at Terra Prime (press 'O' near the planet)
   - Click "MISSION BOARD" button
   - Browse available missions

3. **View Example Missions**:
   - Look in `missions/active/` for example missions
   - Check `missions/templates/` for mission templates

---

## 📊 Mission Structure

### File Organization

```
missions/
├── active/           # Current available missions
├── templates/        # Reusable mission templates
├── completed/        # Finished missions (auto-moved)
└── archived/         # Old missions (auto-archived)
```

### Mission File Format

Every mission is a JSON file with this structure:

```json
{
  "id": "unique_mission_identifier",
  "title": "Mission Display Name",
  "description": "Detailed mission description for players",
  "mission_type": "elimination|exploration|delivery|escort",
  "location": "where_mission_is_available",
  "faction": "mission_giver_faction",
  "reward_package_id": 1,
  "state": "Unknown|Mentioned|Accepted|Achieved|Completed",
  "is_botched": false,
  "objectives": [
    {
      "id": "1",
      "description": "What player needs to do",
      "is_achieved": false,
      "is_optional": false,
      "is_ordered": true,
      "achieved_at": null
    }
  ],
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z",
  "custom_fields": {
    "mission_specific_data": "value"
  },
  "triggers": {
    "event_name": "action_to_take"
  }
}
```

### Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| `id` | Unique identifier | `"federation_patrol_001"` |
| `title` | Display name | `"Sector 7 Patrol"` |
| `description` | Player-facing description | `"Eliminate pirate fighters..."` |
| `mission_type` | Type of mission | `"elimination"` |
| `state` | Current state | `"Mentioned"` |
| `objectives` | List of mission objectives | `[{...}]` |

### Optional Fields

| Field | Description | Default |
|-------|-------------|---------|
| `location` | Where mission is available | `"unknown"` |
| `faction` | Mission giver faction | `"neutral"` |
| `reward_package_id` | Reward tier | `1` |
| `is_botched` | Is mission failed | `false` |
| `custom_fields` | Mission-specific data | `{}` |
| `triggers` | Event handlers | `{}` |

---

## ✍️ Creating Missions

### Step 1: Choose Mission Type

Select the appropriate mission type:

- **`elimination`**: Combat missions (destroy enemies)
- **`exploration`**: Discovery missions (reach locations, scan objects)
- **`delivery`**: Trading missions (transport cargo)
- **`escort`**: Protection missions (guard convoys)

### Step 2: Create Mission File

Create a new JSON file in `missions/active/`:

```json
{
  "id": "my_custom_mission_001",
  "title": "Asteroid Mining Defense",
  "description": "Protect mining operations from pirate raids in the asteroid belt",
  "mission_type": "elimination",
  "location": "asteroid_belt",
  "faction": "miners_guild",
  "reward_package_id": 3,
  "state": "Mentioned",
  "is_botched": false,
  "objectives": [
    {
      "id": "1",
      "description": "Eliminate 5 pirate fighters in the asteroid belt",
      "is_achieved": false,
      "is_optional": false,
      "is_ordered": false,
      "achieved_at": null
    },
    {
      "id": "2", 
      "description": "Protect the mining platform from damage",
      "is_achieved": false,
      "is_optional": true,
      "is_ordered": false,
      "achieved_at": null
    }
  ],
  "created_at": "2024-01-15T12:00:00Z",
  "updated_at": "2024-01-15T12:00:00Z",
  "custom_fields": {
    "target_enemy_type": "pirate_fighter",
    "enemy_count": 5,
    "completion_bonus": 1500,
    "time_limit": 1800,
    "difficulty": "medium"
  },
  "triggers": {
    "on_accept": "spawn_pirates_near_mining_platform",
    "on_complete": "mining_platform_saved"
  }
}
```

### Step 3: Test Your Mission

1. **Restart the Backend** (to load new mission):
   ```bash
   # Stop server (Ctrl+C), then restart
   python3 app.py
   ```

2. **Check Mission in Game**:
   - Open Mission Board
   - Look for your mission in the list
   - Accept and test objectives

---

## 📋 Mission Templates

Templates allow you to create multiple similar missions efficiently.

### Using Existing Templates

Templates are in `missions/templates/`. To generate a mission from a template:

1. **Via API** (for testing):
   ```bash
   curl -X POST http://localhost:5001/api/missions/generate \
     -H "Content-Type: application/json" \
     -d '{
       "template_id": "elimination",
       "player_data": {"level": 5},
       "location": "asteroid_field"
     }'
   ```

2. **Via Mission Board**:
   - Click "Generate Mission" button
   - System randomly selects template

### Creating Custom Templates

Create `missions/templates/my_template.json`:

```json
{
  "template_id": "my_template",
  "title": "Template Mission Title",
  "description": "Template description with {placeholder}",
  "mission_type": "elimination",
  "faction": "federation",
  "reward_package_id": 2,
  "objectives": [
    {
      "id": "1",
      "description": "Eliminate {enemy_count} {target_enemy_type} ships",
      "is_optional": false,
      "is_ordered": false
    }
  ],
  "custom_fields": {
    "target_enemy_type": "enemy_fighter",
    "enemy_count": 3,
    "completion_bonus": 500
  },
  "location_variants": {
    "asteroid_field": {
      "title": "Asteroid Belt Cleanup",
      "custom_fields": {
        "completion_bonus": 750
      }
    }
  },
  "level_scaling": {
    "enemy_types_by_level": {
      "1-5": ["enemy_fighter"],
      "6-10": ["enemy_interceptor"]
    }
  },
  "random_elements": {
    "enemy_count": [2, 3, 4, 5],
    "completion_bonus": [400, 500, 600]
  }
}
```

### Template Features

- **Placeholders**: Use `{variable}` for dynamic content
- **Location Variants**: Different content per location
- **Level Scaling**: Adjust difficulty based on player level
- **Random Elements**: Add variety to generated missions

---

## 🧪 Testing Missions

### Manual Testing

1. **Create Test Mission** in `missions/active/`
2. **Restart Backend** to load changes
3. **In-Game Testing**:
   - Dock at station
   - Open Mission Board
   - Accept your mission
   - Complete objectives
   - Verify state changes

### Using Test Script

Run the comprehensive test suite:

```bash
python3 test_mission_system.py
```

This validates:
- ✅ Mission file structure
- ✅ Template syntax
- ✅ API endpoints
- ✅ Mission acceptance workflow
- ✅ Procedural generation

### Debug Mission States

Check mission states via API:

```bash
# Get mission details
curl http://localhost:5001/api/missions/your_mission_id

# Get all available missions
curl http://localhost:5001/api/missions?location=terra_prime

# Get system statistics
curl http://localhost:5001/api/missions/stats
```

---

## 🎯 Mission Types

### 1. Elimination Missions

**Purpose**: Combat-focused missions requiring enemy destruction

**Example**:
```json
{
  "mission_type": "elimination",
  "custom_fields": {
    "target_enemy_type": "pirate_fighter",
    "enemy_count": 3,
    "enemy_spawn": ["enemy_fighter", "enemy_fighter", "enemy_fighter"]
  }
}
```

**Triggers**: Automatically progress when enemies are destroyed

### 2. Exploration Missions  

**Purpose**: Discovery and reconnaissance missions

**Example**:
```json
{
  "mission_type": "exploration", 
  "custom_fields": {
    "target_location": "nebula_sector_7",
    "scan_count": 3,
    "required_ship_equipment": ["long_range_scanner"]
  }
}
```

**Triggers**: Progress when locations are reached or scanned

### 3. Delivery Missions

**Purpose**: Cargo transport and trading

**Example**:
```json
{
  "mission_type": "delivery",
  "custom_fields": {
    "cargo_type": "medical_supplies",
    "pickup_location": "terra_prime", 
    "delivery_location": "mining_colony_beta",
    "cargo_value": 5000,
    "time_limit": 7200
  }
}
```

**Triggers**: Progress when cargo is picked up and delivered

### 4. Escort Missions

**Purpose**: Protection and convoy missions

**Example**:
```json
{
  "mission_type": "escort",
  "custom_fields": {
    "convoy_ships": [
      {"type": "merchant_freighter", "name": "Stellar Trader"}
    ],
    "route_waypoints": [
      {"x": 100, "y": 50, "z": 200, "name": "Waypoint Alpha"}
    ]
  }
}
```

**Triggers**: Progress based on convoy safety and route completion

---

## ⚙️ Advanced Features

### Objective Types

#### Ordered Objectives
Objectives that must be completed in sequence:

```json
{
  "objectives": [
    {
      "id": "1",
      "description": "Travel to coordinates X-47",
      "is_ordered": true,
      "is_optional": false
    },
    {
      "id": "2", 
      "description": "Scan the derelict ship",
      "is_ordered": true,
      "is_optional": false
    }
  ]
}
```

#### Optional Objectives
Bonus objectives that provide extra rewards:

```json
{
  "id": "3",
  "description": "Retrieve the ship's black box",
  "is_optional": true,
  "is_ordered": false
}
```

### Custom Fields

Use custom fields for mission-specific data:

```json
{
  "custom_fields": {
    "time_limit": 3600,
    "stealth_required": true,
    "minimum_ship_class": "frigate",
    "reputation_requirement": 50,
    "special_equipment": ["cloaking_device"],
    "environmental_hazards": ["radiation", "asteroids"]
  }
}
```

### Cascade Effects

Define what happens when missions are botched:

```json
{
  "cascade_effects": [
    {
      "trigger": "mission_botched",
      "effects": [
        {
          "type": "modify_faction_standing",
          "faction": "federation",
          "change": -25
        },
        {
          "type": "unlock_alternative",
          "mission_id": "redemption_mission_001"
        }
      ]
    }
  ]
}
```

### Trigger System

Define event handlers for mission events:

```json
{
  "triggers": {
    "on_accept": "spawn_mission_enemies",
    "on_objective_complete": "update_world_state", 
    "on_complete": "award_special_rewards",
    "on_botch": "trigger_consequences"
  }
}
```

---

## 📏 Best Practices

### Mission Design

1. **Clear Objectives**: Make objectives specific and measurable
2. **Balanced Difficulty**: Match difficulty to player level and equipment
3. **Meaningful Rewards**: Ensure rewards justify the effort required
4. **Story Integration**: Connect missions to the game's narrative

### Technical Guidelines

1. **Unique IDs**: Always use unique mission IDs (faction_type_number format)
2. **Timestamp Format**: Use ISO format for dates: `"2024-01-15T10:00:00Z"`
3. **JSON Validation**: Validate JSON syntax before testing
4. **Incremental Testing**: Test missions individually before batch deployment

### Content Guidelines

1. **Faction Consistency**: Match mission tone to faction personality
2. **Location Relevance**: Ensure missions fit their locations
3. **Objective Clarity**: Write clear, actionable objective descriptions
4. **Failure Handling**: Design meaningful consequences for mission failure

### Example Mission Naming Convention

```
faction_type_sequence
├── federation_patrol_001
├── federation_patrol_002  
├── pirates_elimination_001
├── traders_delivery_001
└── scientists_exploration_001
```

---

## 🔍 Troubleshooting

### Common Issues

#### Mission Not Appearing in Board

**Problem**: Mission file created but not visible in-game

**Solutions**:
1. Check JSON syntax with validator
2. Restart Flask backend server
3. Verify file is in `missions/active/` directory
4. Check mission state is "Mentioned" or "Unknown"

#### Mission Can't Be Accepted

**Problem**: Accept button disabled or greyed out

**Solutions**:
1. Verify mission state is "Mentioned"
2. Check faction standing requirements
3. Ensure player meets any custom requirements
4. Check for conflicting active missions

#### Objectives Not Progressing

**Problem**: Mission accepted but objectives don't complete

**Solutions**:
1. Verify mission type matches objective requirements
2. Check custom_fields for correct enemy/location names
3. Test manual progress via API:
   ```bash
   curl -X POST http://localhost:5001/api/missions/MISSION_ID/progress \
     -H "Content-Type: application/json" \
     -d '{"objective_id": "1"}'
   ```

#### Template Generation Fails

**Problem**: Procedural mission generation produces errors

**Solutions**:
1. Validate template JSON syntax
2. Check all required template fields are present
3. Verify template_id matches filename
4. Test template with simple player_data

### Debug Tools

#### Mission System Stats
```bash
curl http://localhost:5001/api/missions/stats
```

#### Individual Mission Details
```bash
curl http://localhost:5001/api/missions/MISSION_ID
```

#### Backend Logs
Monitor Flask console output for detailed error messages

### Validation Checklist

Before deploying missions, verify:

- [ ] JSON syntax is valid
- [ ] All required fields are present
- [ ] Mission ID is unique
- [ ] Objectives have clear descriptions
- [ ] Custom fields match mission type requirements
- [ ] Faction and location names are consistent
- [ ] Reward package ID is valid (1-10)
- [ ] Timestamps use correct ISO format

---

## 📚 Additional Resources

### API Documentation

Complete API reference available at:
- GET `/api/missions` - List available missions
- POST `/api/missions/{id}/accept` - Accept specific mission
- POST `/api/missions/generate` - Generate from template

### Example Files

Study these examples in the repository:
- `missions/active/federation_patrol_001.json` - Combat mission
- `missions/active/trader_delivery_001.json` - Trading mission  
- `missions/active/exploration_survey_001.json` - Exploration mission
- `missions/templates/elimination_template.json` - Combat template

### Testing Tools

- `test_mission_system.py` - Comprehensive validation suite
- Mission Board UI - In-game testing interface
- Flask API endpoints - Direct mission manipulation

---

## 🎊 Getting Help

### Community Resources

1. **Documentation**: Check `docs/mission_spec.md` for detailed specifications
2. **Examples**: Study existing missions in `missions/active/`
3. **Templates**: Use and modify templates in `missions/templates/`

### Technical Support

1. **Backend Issues**: Check Flask console logs
2. **Frontend Issues**: Check browser developer console
3. **API Testing**: Use curl or Postman for direct API calls

### Quick Reference Card

```
Mission States: Unknown → Mentioned → Accepted → Achieved → Completed
Mission Types: elimination, exploration, delivery, escort
File Location: missions/active/your_mission.json
Test Command: python3 test_mission_system.py
API Base URL: http://localhost:5001/api/missions
```

---

**Happy Mission Creating! 🚀**

The mission system is designed to be flexible and powerful while remaining easy to use. Start with simple missions and gradually explore advanced features as you become more comfortable with the system.

For questions or issues, refer to the troubleshooting section or examine the existing mission examples for guidance.
