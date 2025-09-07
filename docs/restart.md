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
- **Navigation Beacon Positioning Fix**: Fixed beacon angle calculation to properly display all 8 beacons in Star Charts
- **Star Chart Hit Box Improvements**: Increased clickable areas around objects for better usability when zoomed out

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

**Status**: ✅ **RESOLVED** - Fixed beacon angle calculation in Star Charts display

**Root Cause**: The `getLiveAngleDegByName()` method was using `Math.atan2(pos.z, pos.x)` for all celestial bodies, but navigation beacons require `Math.atan2(pos.y, pos.x)` because they use `[x, y, z]` coordinates where `y` is the vertical coordinate, not `z`.

**Solution**: Updated `getLiveAngleDegByName()` method in StarChartsUI.js:
- Added beacon detection logic using `name.includes('Navigation Beacon')`
- For beacons: use `Math.atan2(pos.y, pos.x)` (correct coordinate)
- For other objects: use `Math.atan2(pos.z, pos.x)` (existing logic)
- Added debug logging to track coordinate selection

**Technical Details**:
- **File**: `frontend/static/js/views/StarChartsUI.js`
- **Method**: `getLiveAngleDegByName()` - added beacon-specific angle calculation
- **Coordinate Usage**:
  - **Beacons**: `[x, y, z]` → angle uses `(y, x)` for proper 2D positioning
  - **Other objects**: `[x, y, z]` → angle uses `(z, x)` for top-down display
- **Impact**: All 8 navigation beacons now display at correct positions around the beacon ring:
  - East: (175, 0), North: (0, 175), West: (-175, 0), South: (0, -175)
  - NE: (124, 124), NW: (-124, 124), SW: (-124, -124), SE: (124, -124)

**Before Fix**: Multiple beacons calculated to same angles (0° or 180°) causing overlaps
**After Fix**: Each beacon gets unique angle for proper ring distribution

---

### **Star Chart Hit Box Improvements** ✅ **COMPLETED**
**Issue**: Small objects on the star chart were difficult to click when zoomed way out, requiring pixel-perfect accuracy.

**Status**: ✅ **COMPLETED** - Added larger invisible hit boxes for improved clickability

**Root Cause**: Visual elements were small but clickable areas matched their visual size exactly, making it frustrating to click objects when zoomed out.

**Solution**: Implemented larger invisible hit boxes that are 2-3x larger than visual elements:
- Added `getObjectHitBoxRadius()` method to calculate larger hit box sizes
- Created invisible SVG elements positioned behind visual elements
- Hit boxes scale with zoom level for consistent clickability
- Added proper CSS styling with `starchart-hitbox` class

**Technical Details**:
- **Files Modified**:
  - `frontend/static/js/views/StarChartsUI.js` - Added hit box rendering logic
  - `frontend/static/css/views.css` - Added `.starchart-hitbox` styling
- **Hit Box Sizes** (2x visual size minimum):
  - **Stars**: 20px minimum radius (2x visual)
  - **Planets**: 12px minimum radius (2x visual)
  - **Moons**: 10px minimum radius (2x visual)
  - **Space Stations**: 8px minimum radius (2x visual)
  - **Navigation Beacons**: 6px minimum radius (2x visual)
- **Implementation Features**:
  - Invisible but clickable (transparent fill/stroke)
  - Proper layering (hit boxes behind visual elements)
  - Zoom-level scaling for consistent UX
  - Different shapes for different object types

**Impact**: Dramatically improves user experience when navigating star charts, especially when zoomed out. Users can now easily click on small objects without requiring pixel-perfect accuracy.

**Testing**: Verified that hit boxes work at all zoom levels and don't interfere with visual appearance.

---

## 🔧 Debug System - Essential for New Team Members

### **🚨 IMPORTANT: Use `debug()` instead of `console.log()`**

This project uses a **smart debug logging system** instead of `console.log()`. All debug output goes through the `debug(channel, message)` function which provides:

- ✅ **Channel-based filtering** - Toggle specific debug categories on/off
- ✅ **Icon-coded messages** - Visual categorization of log types
- ✅ **Performance optimization** - Disabled channels don't generate output
- ✅ **Runtime control** - Enable/disable channels via browser console
- ✅ **Persistent settings** - Channel states saved in localStorage

### **Available Debug Channels**

| Channel | Icon | Description | Default State |
|---------|------|-------------|---------------|
| `TARGETING` | 🎯 | Target acquisition and management | ✅ Enabled |
| `STAR_CHARTS` | 🗺️ | Star Charts navigation and UI | ✅ Enabled |
| `INSPECTION` | 🔍 | Click detection and object inspection | ❌ Disabled |
| `COMMUNICATION` | 🗣️ | NPC and player communication | ❌ Disabled |
| `UTILITY` | 🔧 | System utilities and positioning | ❌ Disabled |
| `AI` | 🤖 | Enemy AI and ship behaviors | ❌ Disabled |
| `INTERACTION` | 👆 | Touch and mouse interactions | ❌ Disabled |
| `MISSIONS` | 🚀 | Mission system operations | ✅ Enabled |
| `COMBAT` | ⚔️ | Combat mechanics and AI | ❌ Disabled |
| `NAVIGATION` | 🧭 | Navigation and movement systems | ❌ Disabled |
| `SCANNER` | 📡 | Long range scanner operations | ❌ Disabled |
| `ECONOMY` | 💰 | Trading and economy systems | ❌ Disabled |
| `MONEY` | 💵 | Credits and money transactions | ✅ Enabled |
| `INFRASTRUCTURE` | 🏗️ | Space stations and facilities | ❌ Disabled |
| `TESTING` | 🧪 | Test functions and debugging helpers | ❌ Disabled |
| `P1` | 🔴 | HIGH PRIORITY - Critical debugging | ❌ Disabled (default) |

### **How to Use Debug System**

#### **Basic Usage:**
```javascript
// ✅ DO THIS - Use debug() with appropriate channel
debug('TARGETING', 'Target acquired:', target.name);
debug('MONEY', 'PlayerCredits: Credits updated to', newBalance);
debug('P1', 'CRITICAL: System error detected!');

// ❌ DON'T DO THIS - Avoid console.log()
console.log('This will be ignored by debug system');

// ❌ DON'T DO THIS - Don't embed icons in message text
debug('MONEY', '💰 PlayerCredits: Credits updated:', newBalance);
```

#### **Browser Console Commands:**
```javascript
// View all available channels
debugList()

// Toggle specific channels
debugToggle('AI')      // Enable/disable AI debugging
debugToggle('COMBAT')  // Enable/disable combat debugging

// Check current states
debugStates()

// Enable/disable multiple channels
debugEnable('TARGETING', 'COMBAT')
debugDisable('INSPECTION')

// Reset to defaults
debugReset()

// View usage statistics
debugStats()
```

#### **Channel Selection Guidelines:**

- **🎯 TARGETING**: Weapon targeting, lock-on, target cycling
- **🗺️ STAR_CHARTS**: Star chart navigation, discovery, waypoints
- **🔍 INSPECTION**: Click detection, object selection, UI interactions
- **🗣️ COMMUNICATION**: NPC dialogue, radio messages, faction comms
- **🔧 UTILITY**: System initialization, positioning, cleanup
- **🤖 AI**: Enemy ship behaviors, flocking, pathfinding
- **👆 INTERACTION**: Mouse/touch events, keyboard input
- **🚀 MISSIONS**: Mission state changes, objectives, rewards
- **⚔️ COMBAT**: Weapon firing, damage calculation, AI combat
- **🧭 NAVIGATION**: Ship movement, docking, autopilot
- **📡 SCANNER**: Long-range scanner, radar systems
- **💰 ECONOMY**: Trading, cargo, station services
- **💵 MONEY**: Credit transactions, purchases, payments
- **🏗️ INFRASTRUCTURE**: Station generation, docking ports
- **🧪 TESTING**: Unit tests, debug helpers, dev tools
- **🔴 P1**: Critical errors, system failures, important events (disabled by default, can be toggled)

#### **Why This System Exists:**

1. **Console Spam Reduction**: Only see debug messages you care about
2. **Performance**: Disabled channels don't generate output overhead
3. **Organization**: Related messages grouped by category and icon
4. **Persistence**: Settings remembered between browser sessions
5. **Runtime Control**: Change debug levels without code changes

#### **Migration from console.log():**

When you see `console.log()` in existing code, replace it with `debug()` using the most appropriate channel:

```javascript
// OLD CODE - Avoid this
console.log('Player credits updated:', credits);
console.log('🎯 Target acquired:', target.name);

// NEW CODE - Use this (SmartDebugManager adds icons automatically)
debug('MONEY', 'PlayerCredits: Credits updated to', credits);
debug('TARGETING', 'Target acquired:', target.name);
```

**Output Format:**
```
💵 MONEY: PlayerCredits: Credits updated to 50000
🎯 TARGETING: Target acquired: Enemy Ship
🔴 P1: CRITICAL: System error detected!
```

### **For New Team Members:**

1. **Always use `debug()` instead of `console.log()`**
2. **Choose the most specific channel available**
3. **Use `P1` channel for critical errors/warnings**
4. **NEVER embed icons in debug message text - SmartDebugManager adds them automatically**
5. **Test your debug statements by toggling channels on/off**
6. **Use descriptive messages that include relevant data**

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
