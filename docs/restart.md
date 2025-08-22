# PROJECT CONTEXT: Planetz - 3D Space Combat Game

> **Auto-Generated Status**: Run `./scripts/update_status.sh` to refresh dynamic sections

You're joining the development of **Planetz**, a fully functional 3D web-based space simulation game inspired by Elite, Privateer, and Star Raiders. Built with Three.js (frontend) and Flask/Python (backend).

## 🔄 Keeping This File Current

**This file contains dynamic sections that auto-update from Git data:**

```bash
# Update current status before new chat sessions
./scripts/update_status.sh
```

**What gets updated automatically:**
- Current branch and repository status
- Recent commit history (last 5 commits)
- File counts and codebase statistics
- Last updated timestamp

**When to run the update:**
- Before starting new chat sessions
- After major feature completions or commits
- When switching branches
- Weekly maintenance updates

## 🎯 Core Game Vision

**Production-ready space shooter** featuring:
- **Simplified Three.js physics** - Recently refactored from Ammo.js for better maintainability
- Complete weapon systems (lasers, torpedoes, missiles) with raycasting collision
- Advanced targeting with sub-system precision and faction colors  
- Enemy AI system (8 ship types, state machines, flocking behaviors)
- Mission framework with cargo delivery, elimination, and escort missions
- Faction system (10 unique factions with diplomatic complexity)
- Space stations (13 types) and complete Sol system implementation
- 3D radar, docking, trading, and ship upgrade systems

## 📊 Current Project Status

<!-- DYNAMIC_STATUS_START -->
**Branch**: `noammo` | **Status**: In Development (7 uncommitted changes) | **Last Updated**: 2025-08-22

**Recent Work** (Last 5 commits):
- Implement unified docking system and comprehensive refactor specification
- feat(docking): implement simple launch system with AFT view and impulse activation
- Complete Ammo.js refactor and faction color fixes
- Fix hitscan raycast system for target dummy collision detection
- feat(weapons/hitscan): camera-aligned ray, single-render beams, broader ship resolution, tolerance tuning; docs+script updates

**Codebase Stats**: 
- JavaScript Files: 134 | Python Files: 1606 | Documentation: 69 files
- Total Lines: 30,000+ | Architecture: Fully modular ES6+ modules
<!-- DYNAMIC_STATUS_END -->

## 🏗️ Architecture Overview

```
planetz/
├── frontend/static/js/
│   ├── ship/systems/          # Weapons, targeting, shields, cargo
│   ├── ship/                  # Ship classes and AI
│   ├── views/                 # UI managers (StarfieldManager, etc.)
│   ├── ui/                    # HUD components and interfaces
│   └── app.js                 # Main entry point
├── backend/                   # Flask server with mission system
├── docs/                      # Comprehensive documentation
└── missions/                  # Mission templates and data
```

## 🚀 How to Run

```bash
# Backend (Terminal 1)
cd backend && python3 app.py
# Runs on http://127.0.0.1:5001

# Browser
open http://127.0.0.1:5001
```

## 🎮 Essential Controls & Features

### **Combat System**
- **Tab**: Cycle targets | **Q**: Create target dummies | **Space**: Fire weapons
- **Z**: Previous weapon | **X**: Next weapon | **C**: Toggle autofire | **< / ,**: Previous sub-target | **> / .**: Next sub-target
- **Beam weapons**: Instant hit with sub-system targeting (+30% damage)
- **Projectiles**: Physics-based flight with random subsystem damage

### **Navigation & UI**
- **R**: Subspace Radio | **N**: Communication HUD | **M**: Mission Status | **H**: Help screen
- **L**: Long Range Scanner | **G**: Galactic Chart | **F**: Fore View | **A**: Aft View | **D**: Damage Control
- **Docking**: Automatic when approaching stations

### **Speed Controls**
- **0-9**: Set impulse speed | **+ / =**: Increase speed | **- / _**: Decrease speed | **\**: Emergency stop

### **AI Debug Controls** (Mac: Cmd+Shift+[Key])
- **A**: Toggle AI debug | **S**: Show AI stats | **E**: Force engage | **F**: Force flee | **I**: Force idle
- **V**: V-Formation | **C**: Column formation | **L**: Line formation | **B**: Show flocking stats
- **T**: Combat stats | **W**: Weapon debug | **X**: Target player | **P**: Performance stats | **D**: Debug visualization



## 📋 Key Documentation

<!-- DYNAMIC_DOCS_START -->
**Core Systems**:
- [Mission System Guide](mission_system_user_guide.md) - Complete mission framework
- [Cut Scene System](cut_scene_system.md) - Cinematic sequence specification  
- [AI System Guide](ai_system_user_guide.md) - Enemy AI implementation
- [Faction Guide](faction_guide.md) - Universe lore and diplomacy
- [Communication System](communication_system_guide.md) - NPC interaction

**Technical References**:
- [Card System](card_system_user_guide.md) - Ship upgrade mechanics
- [Space Station System](space_station_system_guide.md) - Station types and functions
- [Sol System Layout](sol_system_layout.md) - Universe structure
<!-- DYNAMIC_DOCS_END -->

## 🔧 Critical Technical Context

### **Physics Engine Refactor** ⬅️ **CURRENT BRANCH: `noammo`**

**MAJOR ARCHITECTURAL CHANGE**: The game has been refactored from Ammo.js physics engine back to pure Three.js for simplicity and maintainability.

#### **What Changed**:
- ✅ **Removed Ammo.js dependency** - No more complex physics engine loading
- ✅ **Three.js native collision** - Simplified collision detection using Three.js raycasting
- ✅ **Unified docking system** - Single code path for stations and planets/moons
- ✅ **Simplified spatial management** - Direct Three.js vector math and positioning
- ✅ **Performance improvements** - Eliminated physics engine overhead

#### **What Stayed the Same**:
- ✅ **All gameplay mechanics** - Combat, targeting, navigation work identically
- ✅ **Visual effects** - No changes to rendering or particle systems
- ✅ **UI and controls** - All keybindings and interfaces unchanged
- ✅ **Mission system** - Complete mission framework unaffected
- ✅ **AI behaviors** - Enemy AI and ship behaviors preserved

#### **Current Validation Status**:
- ✅ **Docking/Launch** - Station and planetary docking working
- 🔄 **Weapons testing** - Next priority for validation
- 🔄 **AI combat** - Needs testing with new collision system
- 🔄 **Mission integration** - Verify mission mechanics work with new physics

### **Mission System Architecture**
- **States**: UNKNOWN → MENTIONED → ACCEPTED → ACHIEVED → COMPLETED
- **Dual Delivery Types**: `auto_delivery` (on docking) vs `market_sale` (on selling)
- **Event-Driven**: Frontend triggers backend via `MissionEventService`
- **Files**: JSON-based storage in `missions/` directories

### **Combat & Collision System**
- **Three.js collision detection**: Native raycasting for hit detection
- **Missile targeting**: Velocity-compensated projectiles with Three.js physics
- **Hitscan weapons**: Direct raycasting for instant-hit weapons (lasers, pulse)
- **Spatial management**: Three.js Vector3 math for all positioning and movement

### **Faction Color System**
```javascript
// Universal color coding across all UI elements
enemy: '#ff3333'     // Red for hostile
neutral: '#ffff44'   // Yellow for neutral  
friendly: '#44ff44'  // Green for friendly
unknown: '#44ffff'   // Cyan for unknown
```

### **Key Architectural Decisions**
- **Three.js Physics**: Transitioned from Ammo.js to native Three.js for simplicity
- **Target Preservation**: Q-key dummy creation maintains current target via identifier matching
- **Unified Credits**: Single `PlayerCredits.js` manages economy across all systems
- **Modular Cards**: Ship systems installed via card-based upgrade system
- **Event-Driven UI**: Real-time updates via direct mission data passing (no stale API calls)

### **For New Developers - Current Focus**

🎯 **Understanding the Physics Refactor**:
- The `noammo` branch represents a major architectural simplification
- All Ammo.js physics code has been replaced with Three.js native collision detection
- Docking system has been unified between stations and celestial bodies
- Core gameplay mechanics remain unchanged, but underlying collision detection is simplified

🔧 **Current Testing Priorities**:
1. **Weapon systems** - Validate all weapon types work with Three.js collision
2. **AI combat** - Ensure enemy ships can engage properly with new physics
3. **Mission mechanics** - Verify mission objectives work with simplified collision
4. **Performance** - Confirm frame rate improvements from removing Ammo.js overhead

## 🎊 Current Development Status

**IN DEVELOPMENT** ✅ Core systems implemented; active tuning and validation:

- ✅ **Complete Mission System** with cargo delivery, unified economy, station positioning
- ✅ **Cut Scene System Specification** with visual storyboards and implementation guidance  
- ✅ **Advanced Combat** with faction colors and audio feedback (ongoing hitscan alignment improvements)
- ✅ **Enemy AI Framework** with 8 ship types, flocking, and combat behaviors
- ✅ **Faction Universe** with 10 factions, 50+ NPCs, diplomatic complexity
- ✅ **Navigation Systems** with 3D radar, long-range scanner, beacon network
- ✅ **Communication HUD** with animated wireframe avatars and NPC interaction

**Next Steps**: Content creation, advanced gameplay mechanics, multiplayer foundation.

---

## 📝 Maintenance Notes

**To update this file's dynamic content:**
```bash
./scripts/update_status.sh
```

**File Structure:**
- **Static sections**: Manually maintained core context (game vision, architecture, controls)
- **Dynamic sections**: Auto-generated from Git (marked with `<!-- DYNAMIC_*_START/END -->`)
- **Documentation links**: Auto-discovered from `docs/` directory

*This condensed restart.md focuses on essential context while linking to detailed documentation. Always run the update script before new chat sessions to ensure current status.*
