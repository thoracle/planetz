# PROJECT CONTEXT: Planetz - 3D Space Combat Game

> **Auto-Generated Status**: Run `./scripts/update_status.sh` to refresh dynamic sections

You're joining the development of **Planetz**, a fully functional 3D web-based space simulation game inspired by Elite, Privateer, and Star Raiders. Built with Three.js (frontend) and Flask/Python (backend).

## 🔄 Keeping This File Current

**This file contains dynamic sections that auto-update from Git data:**

```bash
# Update current status before new chat sessions (recommended)
./scripts/update_status_enhanced.sh

# Alternative: Basic version without key binding extraction
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

> 📖 **Essential Reading**: See [`docs/design_pillars.md`](design_pillars.md) for the foundational design philosophy, including player agency, strategic depth through collection mechanics, and the dynamic reactive universe that drives all game systems.

## 📊 Current Project Status

<!-- DYNAMIC_STATUS_START -->
**Branch**: `data_refactor` | **Status**: In Development (15 uncommitted changes) | **Last Updated**: 2025-09-05

**Recent Work** (Last 5 commits):
- added master specs
- star chart fixes
- Added Realistic Orbital Mechanics Toggle
- Phase 2 Complete: Static Data Enhancement - Positioning & Infrastructure
- Phase 1 Complete: Foundation Setup for Unified Data Architecture

**Codebase Stats**: 
- JavaScript Files: 144 | Python Files: 1619 | Documentation: 88 files
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
- **Z**: Previous weapon | **X**: Next weapon
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

### **Cargo Delivery System** (Recently Fixed)
- **Automatic Completion**: Cargo missions complete automatically when docking at destination stations
- **Station Detection**: Robust detection via metadata + name pattern fallback (Station, Base, Outpost, etc.)
- **Name Conversion**: `"Europa Research Station"` → `"europa_research_station"` for backend matching
- **Unified Docking**: Integrated with `SimpleDockingManager.initiateUnifiedDocking()` method
- **Debug Logging**: Comprehensive console output for troubleshooting station detection and cargo events

### **Combat & Collision System**
- **Three.js collision detection**: Native raycasting for hit detection
- **Missile targeting**: Velocity-compensated projectiles with Three.js physics
- **Hitscan weapons**: Direct raycasting for instant-hit weapons (lasers, pulse)
- **Spatial management**: Three.js Vector3 math for all positioning and movement

### **Star Charts System** ✅ **FULLY IMPLEMENTED**
- **Status**: Complete navigation database system with full UX parity to LRS
- **Discovery**: Proximity-based discovery (major/minor/background pacing) with HUD banners + audio
- **Core Features**:
  - Planet rings normalized to LRS layout (100/250/400/…) with parent-centered moon orbits
  - Dedicated beacon ring at 350 with matching iconography and dashed orbit lines
  - 8-level zoom system (overview → maximum detail) with smooth pan/drag controls
  - Two-finger drag and mouse drag support for manual recentering
  - Precise tooltip hit detection that scales with zoom level
- **Visual Enhancements**:
  - Faction-based coloring for all objects (red=enemy, green=friendly, yellow=neutral)
  - Station collision detection prevents overlapping diamond icons
  - Moon faction inheritance from parent planets
  - Proper icon sizing (enlarged moons, smaller station diamonds)
  - Clean title styling without heavy visual effects
- **Test Mode**: Discover-all for comprehensive testing
  - Enable: `localStorage.setItem('star_charts_test_discover_all','true')` + reload
  - Shows all objects in sector for complete system validation

### **Unified Data Architecture Refactor Plan** 📋 **SPECIFICATION COMPLETE**
- **Status**: Comprehensive technical specification with multi-round review completed
- **Purpose**: Establish single source of truth for universe objects to eliminate data synchronization issues
- **Architecture**: Four-layer separation of concerns:
  - **Static Data**: Procedural universe generation (verse.py) - seed deterministic
  - **Dynamic Data**: Runtime state changes (faction wars, object destruction, discovery)
  - **Reference Data**: Constants and lookup tables (factions, object types, planet classes)
  - **Metadata**: Ephemeral UI state (mission waypoints, selections, cache)
- **Key Components**:
  - Hierarchical Object ID system (`proc_`, `runtime_`, `mission_` namespaces)
  - ObjectDatabase unified interface with error handling and compatibility layers
  - Data structure adapters for seamless migration from current systems
  - Enhanced verse.py with positioning, infrastructure, and ID generation
- **Implementation Strategy**: 6-phase incremental rollout with compatibility bridge
- **Documentation**: Complete specification in `docs/unified_data_architecture_refactor_plan.md`
- **Benefits**: Eliminates targeting issues, enables scalable content, provides editor-friendly data

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
- ✅ **Communication HUD** with video/wireframe modes, faction-based coloring, and NPC interaction
- ✅ **Simplified Target System** with persistent targeting and fail-fast error handling

**Recent Major Updates**:
- **Target System Simplification**: Removed automatic target clearing, persistent targeting, fail-fast debugging
- **Wireframe Improvements**: Navigation beacons now use octahedron geometry for better visual distinction
- **Star Charts Integration**: Completed full integration with simplified, robust target management
- **Wireframe Update Fix**: Fixed wireframe synchronization when selecting targets from Star Charts

**Next Steps**: Content creation, advanced gameplay mechanics, multiplayer foundation.

---

## ⚠️ Known Issues

### **Long Range Scanner (LRS) Target Selection** ✅ **FIXED**
**Issue**: After selecting a target from the Long Range Scanner for the first time, subsequent attempts to select different targets from the LRS may fail to properly update the target computer.

**Status**: ✅ **RESOLVED** - Implemented robust target selection synchronization
- **Solution**: Refactored target selection logic with `setScannerTargetRobustly()` method
- **Key Improvements**:
  - Forced fresh target list updates before each selection
  - Proper state preservation and restoration
  - Enhanced error handling and recovery
  - Consistent synchronization between all target management systems

**Technical Details**:
- **Root Cause**: Race conditions between target list rebuilding and stale index references
- **Fix**: New `setScannerTargetRobustly()` method that:
  - Always forces fresh target list updates
  - Handles out-of-range targets properly
  - Ensures proper synchronization between LRS, TargetComputerManager, and StarfieldManager
  - Includes error recovery and state restoration
  - Uses immediate + delayed UI updates for reliability

**Related Systems**:
- `LongRangeScanner.js` - Updated with robust target selection method
- `TargetComputerManager.js` - Existing `setTargetFromScanner()` method preserved
- `StarfieldManager.js` - Enhanced synchronization handling

### **Star Charts Wireframe Update Bug** ✅ **FIXED**
**Issue**: When selecting targets from Star Charts, the wireframe in the Target Computer HUD would not update - it would stay showing whatever wireframe was visible when the Star Charts were opened.

**Status**: ✅ **RESOLVED** - Fixed wireframe update synchronization between Star Charts and Target Computer

**Root Cause**: The `setTargetById()` method (used when clicking Star Charts targets) was missing the wireframe cleanup and recreation logic that `cycleTarget()` (TAB cycling) had.

**Solution**: Added proper wireframe update logic to `setTargetById()`:
- Clear existing wireframe before creating new one
- Call `createTargetWireframe()` to generate wireframe for new target
- Maintain same cleanup pattern as TAB cycling

**Technical Details**:
- **File**: `frontend/static/js/views/TargetComputerManager.js`
- **Method**: `setTargetById()` - added wireframe cleanup and recreation logic
- **Behavior**: Now matches TAB cycling behavior for consistent wireframe updates
- **Impact**: Star Charts selections now properly update wireframes (icosahedron for planets, star for stars, octahedron for moons/stations, etc.)

**Testing**: Verified that clicking different objects in Star Charts now shows correct wireframe types:
- Planets: Icosahedron (20-sided sphere)
- Stars: Star (radiating points)
- Moons: Octahedron (8-sided)
- Stations: Torus (ring shape)

### **Navigation Beacon Positioning Bug** ✅ **FIXED**
**Issue**: Only 2 of 8 navigation beacons were visible in Star Charts despite test mode being enabled and all beacons being discovered.

**Status**: ✅ **RESOLVED** - Fixed beacon coordinate mapping in Star Charts display

**Root Cause**: Navigation beacons use `[x, y, z]` coordinate format, but the display logic was incorrectly using `position[2]` (z) as the y-coordinate instead of `position[1]` (y).

**Solution**: Updated `getDisplayPosition()` method in StarChartsUI.js:
- Added special handling for navigation beacons
- Use `position[1]` as y-coordinate for beacons (not `position[2]`)
- Regular objects still use `position[2]` as y-coordinate

**Technical Details**:
- **File**: `frontend/static/js/views/StarChartsUI.js`
- **Method**: `getDisplayPosition()` - added beacon-specific coordinate mapping
- **Coordinate Format**:
  - **Beacons**: `[x, y, z]` → display `(x, y)`
  - **Other objects**: `[x, y, z]` → display `(x, z)`
- **Impact**: All 8 navigation beacons now display correctly around the beacon ring

**Before Fix**: 5 beacons stacked at (175, 0), 3 at (-175, 0)
**After Fix**: 8 beacons properly distributed in circle:
- East: (175, 0), North: (0, 175), West: (-175, 0), South: (0, -175)
- NE: (124, 124), NW: (-124, 124), SW: (-124, -124), SE: (124, -124)

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

---

### Star Charts ↔ Target Computer Integration ✅ **COMPLETED**

**✅ COMPLETED**: Full integration with simplified, robust target management

**Key Improvements**:
- **Unified Wireframes**: Navigation beacons now use octahedron (simple pyramid) geometry for better visual distinction
- **Simplified Targeting**: Removed automatic target clearing - targets persist until manually changed or sector warp
- **Fail-Fast Approach**: Target lookup failures crash immediately for debugging (dev mode)
- **Essential Sync**: Reduced sync frequency to 10s with only critical operations (target availability + wireframe hydration)
- **Discovery Isolation**: New discoveries only show notifications, don't automatically change current target

**Technical Changes**:
- **WireframeTypes.js**: Centralized geometry mapping with octahedron for navigation beacons
- **StarChartsManager.js**: Fail-fast target selection with error assertions
- **TargetComputerManager.js**: Removed range monitoring, persistent targeting
- **StarChartsTargetComputerIntegration.js**: Simplified sync operations, reduced frequency

**Benefits**:
- **Consistent Targeting**: Same wireframes whether selected via TAB or Star Charts
- **Predictable Behavior**: No unexpected target changes during gameplay
- **Better Debugging**: Immediate crashes expose target lookup issues
- **Improved Performance**: Less frequent sync operations
- **User Control**: Players maintain target selection until explicitly changed
