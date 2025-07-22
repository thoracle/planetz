# PROJECT CONTEXT: Planetz - 3D Space Combat Game

You're joining the development of **Planetz**, a fully functional 3D web-based space simulation game inspired by Elite, Privateer, and Star Raiders. The game is built with Three.js (frontend), Flask/Python (backend), and features complete ship management, combat, targeting, and exploration systems.

## 📁 Current Project State
- **Branch**: `optimization` (2 commits ahead of origin)
- **Tech Stack**: Three.js, ES6+ modules, Flask/Python backend, HTML5/CSS3, Ammo.js physics
- **Codebase**: 25,000+ lines, 150+ files, fully modular architecture
- **Recent Fixes**: Target removal precision, ship destruction detection, subsystem targeting, TAB cycling duplicates
- **Status**: Fully functional combat game with working physics-based weapons and target cycling

## 🏗️ Architecture Overview
```
planetz/
├── frontend/static/js/
│   ├── ship/systems/          # Ship systems (weapons, targeting, shields, etc.)
│   ├── ship/                  # Ship classes (Ship.js, EnemyShip.js)
│   ├── views/                 # UI managers (StarfieldManager, TargetComputerManager)
│   ├── ui/                    # HUD components (WeaponHUD, DamageControlHUD)
│   ├── PhysicsManager.js      # Ammo.js physics integration
│   └── app.js                 # Main entry point
├── backend/                   # Flask server (app.py, routes/)
└── docs/                      # Documentation and specs
```

## 🎮 Current Game Features (All Working)
- ✅ **Physics-based combat** - Ammo.js raycasting for lasers, hit detection
- ✅ **Ship systems** - 5 ship types with modular upgrade systems
- ✅ **Weapon systems** - 8 weapon types (laser, pulse, plasma, phaser arrays)
- ✅ **Target computer** - Sub-system targeting with wireframe outlines
- ✅ **Target cycling** - TAB key cycles through unique targets without duplicates
- ✅ **Damage system** - Hull damage, subsystem damage, destruction sounds
- ✅ **Target removal** - Destroyed ships properly removed from target lists
- ✅ **Audio system** - Success sounds for ship/subsystem destruction
- ✅ **Station docking** - Repair and upgrade interface
- ✅ **Card-based upgrades** - Equipment management system
- ✅ **Starfield navigation** - 40,000 star background with smooth movement

## 🔧 Key Files Recently Modified
- `frontend/static/js/views/TargetComputerManager.js` - Target list management and cycling logic
- `frontend/static/js/app.js` - Event listener management and initialization
- `frontend/static/js/ship/systems/WeaponSlot.js` - Weapon firing and destruction detection
- `frontend/static/js/ship/EnemyShip.js` - Damage application and hull management
- `frontend/static/js/views/StarfieldManager.js` - Target removal and cleanup
- `frontend/static/js/PhysicsManager.js` - Physics entity metadata management

## 🐛 Recent Bug Fixes (Completed)
1. **Target removal precision** - Fixed floating-point precision issue where ships with 0% hull weren't being removed
   - **Problem**: Ships showing 0% hull but remaining in target list
   - **Solution**: Changed destruction detection from `currentHull <= 0` to `currentHull <= 0.001` AND added defensive filtering in target list generation
   - **Files**: `WeaponSlot.js`, `EnemyShip.js`, `TargetComputerManager.js`
   - **Status**: ✅ COMPLETELY RESOLVED - Added hull filtering to all target list generation methods

2. **Physics hit detection** - Fixed raycast hits not finding ship objects
   - **Problem**: "Hit entity does not have a ship with applyDamage method"
   - **Solution**: Updated `PhysicsManager` to properly link ship objects to physics entities
   - **Files**: `PhysicsManager.js`

3. **Subsystem targeting** - Fixed focused damage application
   - **Problem**: Sub-targeted damage was spilling to hull and other systems
   - **Solution**: Updated `applyDamage` to handle `targetSystem` parameter correctly
   - **Files**: `EnemyShip.js`

4. **Success audio** - Restored success sounds for subsystem destruction
   - **Problem**: Missing audio feedback when destroying subsystems
   - **Solution**: Added sound playback logic to `applyDamage` method
   - **Files**: `EnemyShip.js`

5. **Duplicate TAB cycling** - Fixed TAB key showing same target twice before advancing
   - **Problem**: TAB key was processed multiple times due to duplicate event listeners AND duplicate target entries in target list
   - **Solution**: Removed duplicate TAB key event listeners in `app.js` AND fixed duplicate target population in `TargetComputerManager.js`
   - **Root Cause**: Both `updateTargetListWithPhysics()` and `addNonPhysicsTargets()` were adding the same dummy ships to the target list
   - **Files**: `app.js`, `TargetComputerManager.js`, `StarfieldManager.js`
   - **Status**: ✅ COMPLETELY RESOLVED - TAB now cycles correctly through unique targets without duplicates

## 🚀 How to Run the Game
1. **Backend**: `cd backend && python3 app.py` (runs on port 5001)
2. **Frontend**: `cd frontend && python -m http.server 8081` (serves on port 8081)
3. **Access**: Open `http://localhost:8081` in browser

### Quick Start Commands
```bash
# Terminal 1 - Backend
cd backend && python3 app.py

# Terminal 2 - Frontend  
cd frontend && python -m http.server 8081

# Browser
open http://localhost:8081
```

## 🎯 Current Gameplay
- Target dummy ships spawn automatically
- Use **Tab** to cycle targets, **R** for sub-targeting
- Weapons fire automatically when targeting (autofire)
- Ships explode with success sounds when destroyed
- Target computer automatically selects next target
- Hull and subsystem damage is fully functional

## 🔍 Development Status
The game is **fully functional** with working:
- Physics-based weapon systems
- Target acquisition and destruction with proper cycling
- Audio feedback systems
- Ship upgrade mechanics
- Smooth 3D navigation
- Robust target list management

### Latest Commit: `18b17d1`
- **Fix**: Duplicate TAB target cycling bug resolved
- **Added**: Enhanced debugging for target list management  
- **Improved**: Target list uniqueness and cycling reliability

## 🧪 Testing Status
### ✅ Verified Working
- TAB target cycling (no duplicates)
- Ship destruction and target removal
- Physics-based weapon hits
- Sub-system targeting and damage
- Audio feedback for destruction
- Target wireframe outlines

### 🔍 Areas to Monitor
- Performance with large numbers of targets
- Memory usage during extended play sessions
- Physics simulation stability over time

## 🛠️ Potential Next Steps
- Additional ship types or weapon varieties
- Enhanced enemy AI behaviors
- Trading and economy systems
- Mission/quest system
- Multiplayer networking
- Performance optimizations

## 💡 Technical Notes
- Uses Ammo.js for physics simulation (dynamically loaded)
- Three.js for 3D rendering and scene management
- Modular ES6 architecture with clean separation of concerns
- Flask backend serves configuration and game data
- All major systems are working and stable

**The game is production-ready! Focus on gameplay features, balance, or additional content rather than core system fixes.** 