# PROJECT CONTEXT: Planetz - 3D Space Simulation Game Physics Implementation

You're joining the development of **Planetz**, a fully functional 3D web-based space simulation game inspired by Elite, Privateer, and Star Raiders. The game is built with Three.js (frontend), Flask/Python (backend), and features complete ship management, combat, trading, and exploration systems.

## 📁 Current Project State
- **Branch**: `optimization` (10 commits ahead of origin)
- **Tech Stack**: Three.js, ES6+ modules, Flask/Python backend, HTML5/CSS3
- **Codebase**: 25,000+ lines, 150+ files, fully modular architecture
- **Recent Fixes**: Audio system overhaul, directional arrow timing improvements
- **Status**: Production-ready game seeking physics engine integration

## 🏗️ Architecture Overview
```
planetz/
├── frontend/static/js/
│   ├── ship/systems/          # Ship systems (weapons, targeting, etc.)
│   ├── views/                 # UI managers (StarfieldManager, TargetComputerManager)
│   ├── ui/                    # HUD components
│   └── app.js                 # Main entry point
├── backend/                   # Flask server
└── docs/physics_spec.md       # PHYSICS IMPLEMENTATION SPEC
```

## 🎯 Current Mission: Implement Physics Engine
You need to implement **Ammo.js physics integration** based on `docs/physics_spec.md`. The spec calls for:

1. **Spatial tracking** - Physics-based entity queries with octrees
2. **Real ship collisions** - Momentum-based damage and bouncing  
3. **Physics weapons** - Raycast lasers + projectile missiles with splash damage
4. **Zero-gravity space environment** - btDiscreteDynamicsWorld with no gravity

## ✅ Current Todo List (Ready to Execute)
1. **ammo-js-setup** - Initialize physics engine (START HERE)
2. **physics-world-integration** - Create btDiscreteDynamicsWorld  
3. **entity-rigid-bodies** - Add physics bodies to ships/stations/planets
4. **threejs-physics-sync** - Sync visual and physics objects
5. **spatial-tracking-system** - Octree + btGhostObject queries
6. **ship-collision-detection** - Real collision callbacks
7. **collision-response-system** - Damage/bouncing mechanics
8. **laser-raycast-weapons** - Physics-accurate laser firing
9. **missile-projectile-system** - Flying missile physics
10. **splash-damage-mechanics** - Area-effect explosions

## 🔧 Key Files to Know
- `frontend/static/js/views/StarfieldManager.js` - Main game manager (5,268 lines)
- `frontend/static/js/ship/Ship.js` - Ship system core (904 lines)
- `frontend/static/js/ship/systems/WeaponSystemCore.js` - Current weapons (404 lines)
- `docs/physics_spec.md` - Complete implementation specification

## 🎮 Current Game Features (Working)
- ✅ 5 ship types with modular systems
- ✅ 8 weapon types (energy + projectile)  
- ✅ Target computer with wireframes
- ✅ Station docking and repair
- ✅ Card-based upgrade system
- ✅ Audio system (recently fixed)
- ✅ Directional arrows (recently improved)

## 🚀 Your Starting Point
1. **Read** `docs/physics_spec.md` thoroughly
2. **Start with** "ammo-js-setup" todo item
3. **Add Ammo.js** to the project via CDN or npm
4. **Initialize** physics world with zero gravity
5. **Test** basic physics setup before moving to entity integration

## 💡 Implementation Notes
- Game runs at 60 FPS - physics should match
- All entities are already in Three.js - need physics bodies
- Current weapon system uses basic hit detection - replace with physics
- Flask serves static JSON - can add physics configs
- Memory management is critical with Ammo.js

## 🎯 Success Criteria
When done, Planetz should have:
- Ships that physically collide and bounce
- Lasers that use real raycasting  
- Missiles that fly with physics trajectories
- Explosions with area-of-effect damage
- Smart spatial queries for advanced gameplay

**Ready to implement realistic space physics! Start with the Ammo.js setup and work through the todo list systematically.** 