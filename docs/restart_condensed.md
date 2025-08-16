# PROJECT CONTEXT: Planetz - 3D Space Combat Game

> **Auto-Generated Status**: Run `./scripts/update_status.sh` to refresh dynamic sections

You're joining the development of **Planetz**, a fully functional 3D web-based space simulation game inspired by Elite, Privateer, and Star Raiders. Built with Three.js (frontend) and Flask/Python (backend).

## 🎯 Core Game Vision

**Production-ready space shooter** featuring:
- Complete weapon systems (lasers, torpedoes, missiles) with physics
- Advanced targeting with sub-system precision and faction colors  
- Enemy AI system (8 ship types, state machines, flocking behaviors)
- Mission framework with cargo delivery, elimination, and escort missions
- Faction system (10 unique factions with diplomatic complexity)
- Space stations (13 types) and complete Sol system implementation
- 3D radar, docking, trading, and ship upgrade systems

## 📊 Current Project Status

<!-- DYNAMIC_STATUS_START -->
**Branch**: `enemy-ai` | **Status**: In Development (3 uncommitted changes) | **Last Updated**: 2025-08-15

**Recent Work** (Last 5 commits):
- Clean up generated test missions from missions/active directory
- Complete Cut Scene System Specification & Mission System Enhancements
- 🐛 Fix critical cargo system bugs and progress bar styling
- ✨ Replace station menu wireframe with 3D system from target computer
- ✨ Enhance cargo progress bar with neon green styling

**Codebase Stats**: 
- JavaScript Files: 124 | Python Files: 1606 | Documentation: 65 files
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
- **Tab**: Cycle targets | **Q**: Create target dummies | **R**: Fire weapons
- **< / >**: Sub-targeting (beam weapons) | **A**: Toggle autofire
- **Beam weapons**: Instant hit with sub-system targeting (+30% damage)
- **Projectiles**: Physics-based flight with random subsystem damage

### **Navigation & UI**
- **N**: Communication HUD | **M**: Mission Status | **H**: Help screen
- **L**: Long Range Scanner | **G**: Galactic Chart
- **Docking**: Automatic when approaching stations

### **AI Debug Controls** (Mac: Cmd+Shift+[Key])
- **A**: Toggle AI debug | **S**: State display | **E/F**: Force engage/flee
- **V/C/L**: Formation patterns | **P**: Performance stats

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

### **Mission System Architecture**
- **States**: UNKNOWN → MENTIONED → ACCEPTED → ACHIEVED → COMPLETED
- **Dual Delivery Types**: `auto_delivery` (on docking) vs `market_sale` (on selling)
- **Event-Driven**: Frontend triggers backend via `MissionEventService`
- **Files**: JSON-based storage in `missions/` directories

### **Physics & Combat**
- **Complete Ammo.js**: 1.9MB build with native collision detection
- **Velocity Compensation**: Missiles account for ship movement during targeting
- **Collision System**: Distance-based delays prevent physics tunneling
- **Range**: 100% hit rate from 2m to 15km when properly aimed

### **Faction Color System**
```javascript
// Universal color coding across all UI elements
enemy: '#ff3333'     // Red for hostile
neutral: '#ffff44'   // Yellow for neutral  
friendly: '#44ff44'  // Green for friendly
unknown: '#44ffff'   // Cyan for unknown
```

### **Key Architectural Decisions**
- **Target Preservation**: Q-key dummy creation maintains current target via identifier matching
- **Unified Credits**: Single `PlayerCredits.js` manages economy across all systems
- **Modular Cards**: Ship systems installed via card-based upgrade system
- **Event-Driven UI**: Real-time updates via direct mission data passing (no stale API calls)

## 🎊 Current Development Status

**PRODUCTION-READY** ✅ All major systems implemented, debugged, and optimized:

- ✅ **Complete Mission System** with cargo delivery, unified economy, station positioning
- ✅ **Cut Scene System Specification** with visual storyboards and implementation guidance  
- ✅ **Advanced Combat** with 100% reliable physics, faction colors, audio feedback
- ✅ **Enemy AI Framework** with 8 ship types, flocking, and combat behaviors
- ✅ **Faction Universe** with 10 factions, 50+ NPCs, diplomatic complexity
- ✅ **Navigation Systems** with 3D radar, long-range scanner, beacon network
- ✅ **Communication HUD** with animated wireframe avatars and NPC interaction

**Next Steps**: Content creation, advanced gameplay mechanics, multiplayer foundation.

---
*This condensed restart.md focuses on essential context while linking to detailed documentation. Run `./scripts/update_status.sh` to refresh dynamic sections.*
