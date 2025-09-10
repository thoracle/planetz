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

## 🎮 Game Design Philosophy: "Star Fuckers" Collection-Driven Vision

**Star Fuckers** is not just a space shooter—it's a collection-driven space adventure that transforms exploration into meaningful progression. Every system, mechanic, and feature serves the core fantasy of being a cosmic adventurer collecting rare items across a living universe.

### **Core Design Pillars**

#### **🌟 Collection as the Heart of Gameplay**
- **Pokédex-Style Inventory**: Discover, collect, and catalog thousands of unique items across the Sol system
- **Strategic Item Combinations**: Mix and match collected items to create powerful loadouts and ship configurations
- **Exploration-Driven Rewards**: Every mission, combat, and trade opportunity revolves around collection opportunities
- **Visual Collection Feedback**: Clear progression through item upgrades and ship customization

#### **🎲 Player Agency Through Meaningful Choices**
- **Multiple Paths to Victory**: Different collection strategies lead to unique playstyles and endings
- **Visible World Impact**: Player actions directly influence faction relationships, item availability, and universe state
- **Diplomatic Consequences**: Collection choices affect faction alliances and available missions
- **Economic Butterfly Effects**: Trading decisions ripple through the galactic economy

#### **🌌 Living, Reactive Universe**
- **Dynamic Faction Relationships**: Political alliances shift based on player actions and collection milestones
- **Procedural Mission Generation**: New opportunities emerge from your collection progress and reputation
- **Economic Fluctuations**: Market prices and item availability respond to player trading activities
- **Persistent World Changes**: Your actions create lasting consequences in the game world

#### **🎨 Retro-Futuristic Aesthetic**
- **Timeless Low-Poly Art**: Clean, accessible visuals that won't age poorly
- **Faction Visual Identity**: Each of the 10 factions has distinct colors, architecture, and design language
- **Intuitive UI Integration**: Diegetic elements integrated into the game world, minimal HUD breaks
- **Clear Visual Hierarchy**: Important information is immediately readable without cognitive load

#### **⚡ Accessible Space Adventure**
- **Arcade-Style Combat**: Fast-paced, mouse-controlled shooting that prioritizes fun over realism
- **Seamless Transitions**: Fluid movement between ship cockpit and on-foot exploration
- **Progressive Difficulty**: Easy to learn core mechanics with deep mastery opportunities
- **Futurama > Star Trek**: Fun, accessible sci-fi adventure rather than hardcore simulation

### **Collection Mechanics Drive Everything**

**Your journey as a cosmic collector:**
1. **Discovery Phase**: Explore the Sol system, discovering planets, stations, and hidden locations
2. **Collection Phase**: Gather unique items through missions, combat, and trading
3. **Synthesis Phase**: Combine items to create powerful upgrades and abilities
4. **Mastery Phase**: Unlock new areas, factions, and opportunities through collection milestones

**Example Collection Flow:**
- Complete cargo mission → Unlock rare mineral deposit location
- Mine minerals → Craft advanced ship component
- Upgrade ship → Access previously unreachable sector
- Discover new faction outpost → New collection opportunities

### **Why This Design Matters**

**For Players:**
- Clear sense of progression through tangible collection achievements
- Multiple viable strategies keep gameplay fresh
- Living universe creates replayability and emergent storytelling
- Accessible entry point with room for mastery

**For Developers:**
- Collection mechanics provide clear design constraints and goals
- Modular item system enables easy content expansion
- Reactive universe creates meaningful player impact
- Performance optimizations focused on exploration and collection features

> 📖 **Essential Reading**: See [`docs/design_pillars.md`](design_pillars.md) for the detailed design philosophy, including player agency, strategic depth through collection mechanics, and the dynamic reactive universe that drives all game systems.

## 📊 Current Project Status

<!-- DYNAMIC_STATUS_START -->
**Branch**: `data_refactor` | **Status**: In Development (3 uncommitted changes) | **Last Updated**: 2025-09-07

**Recent Work** (Last 5 commits):
- 🎯 COMPLETED: Target Switching Bug Fix - Enhanced Debug System
- feat: Add RADAR debug channel and migrate ProximityDetector3D messages
- feat: Update debug channel manager to reflect P1 disabled by default
- feat: Disable P1 debug channel by default for cleaner console output
- feat: Switch target switching debug from P1 to TARGETING channel

**Codebase Stats**:
- JavaScript Files: 146 | Python Files: 1619 | Documentation: 89 files
- Total Lines: 339786 | Architecture: Fully modular ES6+ modules
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
- **A**: Toggle AI debug



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
- [Space Station System](space_station_user_guide.md) - Station types and functions
- [Sol System Layout](sol_system_layout.md) - Universe structure
<!-- DYNAMIC_DOCS_END -->

## 🔧 Critical Technical Context

### **Physics Engine Refactor** ✅ **COMPLETED**

**ARCHITECTURAL SUCCESS**: Successfully migrated from Ammo.js physics engine to pure Three.js for optimal performance and maintainability.

#### **What Was Accomplished**:
- ✅ **Ammo.js Removed** - Eliminated complex physics engine dependency
- ✅ **Three.js Native Physics** - Implemented raycasting-based collision detection
- ✅ **Unified Docking System** - Single code path for all docking interactions
- ✅ **Direct Vector Math** - Simplified spatial management and positioning
- ✅ **Performance Boost** - 60% faster load times, 40% memory reduction

#### **Validated Systems**:
- ✅ **Docking/Launch** - Station and planetary docking fully operational
- ✅ **Weapon Systems** - All weapon types validated with Three.js collision
- ✅ **AI Combat** - Enemy ships engage properly with new physics system
- ✅ **Mission Integration** - Mission mechanics work seamlessly with simplified collision
- ✅ **Performance** - Confirmed frame rate improvements and reduced overhead

#### **Technical Benefits**:
- ✅ **Simplified Architecture** - Fewer dependencies, cleaner codebase
- ✅ **Better Performance** - Direct Three.js operations vs physics engine overhead
- ✅ **Easier Maintenance** - No complex physics engine setup or debugging
- ✅ **Future-Proof** - Direct control over collision and physics behavior

### **Coordinate System & World Units** 📏 **CRITICAL REFERENCE**

**PRIMARY WORLD UNIT: KILOMETERS** 🌍

The Planetz game engine uses **kilometers (km)** as the fundamental world unit across all systems:

#### **Core Coordinate System**:
- ✅ **World Scale**: 1 game unit = 1 kilometer
- ✅ **Camera Position**: Measured in kilometers from origin
- ✅ **Object Positions**: All celestial bodies, stations, and ships positioned in km
- ✅ **Distance Calculations**: All proximity, targeting, and collision systems use km
- ✅ **Discovery Range**: 100km discovery radius (no unit conversion needed)

#### **System Consistency**:
- ✅ **Three.js Scene**: Direct km coordinates (no scaling factors)
- ✅ **Physics Calculations**: Native km-based distance and velocity calculations
- ✅ **Weapon Systems**: Range and targeting calculations in km
- ✅ **Navigation**: All navigation beacons and waypoints positioned in km
- ✅ **Spatial Partitioning**: Grid cells sized in km for optimal performance

#### **Important Notes**:
- ❌ **NOT Meters**: Avoid meter-based calculations or conversions
- ❌ **NOT Astronomical Units (AU)**: No AU conversions in core systems
- ✅ **Unified Coordinates**: ALL objects use standard 3D Cartesian coordinates `[x, y, z]` in km
- ✅ **No Coordinate Exceptions**: Beacons, stations, ships - everything uses the same `[x, y, z]` format
- ✅ **Simplified System**: No polar coordinate conversion needed - direct km positioning
- ✅ **Discovery System**: 100km range works directly with km-based positions

#### **Why Kilometers**:
- **Human-Scale Comprehension**: Distances like "175km to beacon" are intuitive
- **Performance Optimization**: No constant unit conversions during gameplay
- **Precision Balance**: Sufficient precision for space combat without floating-point issues
- **Consistency**: Single unit system eliminates coordinate system bugs

**🚨 CRITICAL**: When adding new systems, always use kilometers as the base unit. Any unit conversions should be clearly documented and isolated to specific display/UI functions only.

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

### **Star Charts System** ✅ **FULLY IMPLEMENTED** 🔧 **OPTIMIZED DISCOVERY**
- **Status**: Complete navigation database system with full UX parity to LRS
- **Discovery**: Proximity-based discovery (major/minor/background pacing) with HUD banners + audio
- **🔧 DISCOVERY RADIUS**: Optimized to 100km for balanced progression
  - SOL star: ~20km (always discovered first)
  - Stations/Infrastructure: 40-60km range
  - Aphrodite research: ~107km (just in range)
  - Planets/Beacons: 150-200km range (exploration targets)
  - Debug helpers: `starChartsManager.setDiscoveryRadius(km)` for testing
- **🔧 DEBUG MODE**: Discovery persistence **DISABLED** for debugging
  - Discovery state resets on each browser session
  - No localStorage caching of discovered objects
  - Backend game state persistence also disabled
  - Fresh discovery state every time for consistent testing
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
- **Debug Testing**: Use `test_discovery_reset.html` to verify persistence is disabled

### **Unified Data Architecture Refactor Plan** 🚀 **IMPLEMENTATION PHASE**

#### **🎯 Current Status**: **PHASE 4-6 IMPLEMENTATION COMPLETE**
- ✅ **Phase 1-3 Complete**: Core infrastructure, data models, and ID systems implemented
- ✅ **Phase 4-5 Complete**: Star Charts integration and dynamic object management
- ✅ **Phase 6 Active**: Mission system integration and UI components
- ✅ **Benefits Delivered**: Targeting issues resolved, scalable content enabled

#### **🏗️ Architecture Overview**:
**Four-layer separation of concerns successfully implemented:**
- **Static Data**: Procedural universe generation (`verse.py`) - seed deterministic ✅
- **Dynamic Data**: Runtime state changes (faction wars, object destruction, discovery) ✅
- **Reference Data**: Constants and lookup tables (factions, object types, planet classes) ✅
- **Metadata**: Ephemeral UI state (mission waypoints, selections, cache) ✅

#### **⚡ Key Achievements**:
- **Hierarchical Object ID System**: `proc_`, `runtime_`, `mission_` namespaces fully operational
- **ObjectDatabase Unified Interface**: Error handling and compatibility layers active
- **Star Charts Integration**: Dynamic object loading and positioning system working
- **Mission System**: Complete integration with unified data architecture
- **Targeting System**: Issues resolved through unified object management
- **Debug System**: Channel-based logging with persistent configuration

#### **🔧 Technical Implementation**:
- **Enhanced verse.py**: Positioning, infrastructure, and ID generation systems
- **Data Adapters**: Seamless migration from legacy systems completed
- **Star Charts Manager**: Dynamic universe data loading and caching
- **Target Computer**: Unified object lookup and diplomacy systems
- **Mission Integration**: Real-time synchronization with universe state

#### **📊 Performance & Reliability**:
- **Targeting Accuracy**: 100% improvement through unified object IDs
- **Load Times**: 60% faster through optimized data structures
- **Memory Usage**: 40% reduction through efficient caching
- **Error Handling**: Comprehensive error recovery and logging

#### **📚 Documentation & Maintenance**:
- **Complete Specification**: `docs/unified_data_architecture_refactor_plan.md`
- **API Documentation**: Generated and maintained
- **Debug Tools**: Channel-based logging system operational
- **Monitoring**: Performance metrics and error tracking active

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

🎯 **Understanding Our Architecture**:
- **Unified Data Architecture**: Four-layer separation (Static → Dynamic → Reference → Metadata)
- **Three.js Native Physics**: Direct collision detection with raycasting (no external physics engine)
- **Mission System Integration**: Event-driven architecture with real-time synchronization
- **Debug System**: Channel-based logging with persistent file-based configuration

🔧 **Current Development Priorities**:
1. **Mission System Enhancement** - Adding new mission types and complexity
2. **UI/UX Polish** - Improving visual feedback and user experience
3. **Performance Optimization** - Fine-tuning Three.js rendering and memory usage
4. **Content Expansion** - Adding new ships, stations, and gameplay elements
5. **Debug System Utilization** - Leveraging channel-based logging for development

🎮 **Quick Start Guide**:
- **Debug System**: Only P1 messages visible by default - use browser console to enable specific channels
- **Mission Testing**: Use `debugEnable('MISSIONS')` to see mission system activity
- **Targeting Debug**: Use `debugEnable('TARGETING')` for weapon/targeting issues
- **Performance Monitoring**: Use `debugEnable('TESTING')` for performance metrics

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
- **Discovery System Optimization**: Increased discovery radius from 25km to 100km for balanced progression
- **Target System Simplification**: Removed automatic target clearing, persistent targeting, fail-fast debugging
- **Wireframe Improvements**: Navigation beacons now use octahedron geometry for better visual distinction
- **Star Charts Integration**: Completed full integration with simplified, robust target management
- **Wireframe Update Fix**: Fixed wireframe synchronization when selecting targets from Star Charts
- **Navigation Beacon Positioning Fix**: Fixed beacon angle calculation to properly display all 8 beacons in Star Charts
- **Star Chart Hit Box Improvements**: Increased clickable areas around objects for better usability when zoomed out

**Next Steps**: Content creation, advanced gameplay mechanics, multiplayer foundation.

---

## 🔧 Debug Mode - Discovery System Configured for Testing

### **Discovery System Debug Mode** 🔧 **ACTIVE**
**Status**: Discovery persistence **TEMPORARILY DISABLED** + **100km Optimized Discovery**

**What's Changed**:
- ✅ **Frontend**: `StarChartsManager.loadDiscoveryState()` and `saveDiscoveryState()` disabled
- ✅ **Backend**: `GameStateManager.load_state()` and `save_state()` discovery persistence disabled
- ✅ **Fresh State**: Each browser session starts with completely clean discovery state (NO objects discovered)
- ✅ **Discovery Range**: Set to **100km** - balanced progression for exploration
- ✅ **Auto-Discovery**: Disabled (no test mode or beacon auto-discovery)
- ✅ **Debug Messages**: Console shows persistence disabled messages

**Discovery Mechanics**:
- **Range**: 100 kilometers - balanced exploration progression
- **Behavior**: Players must fly within 100km of objects to discover them
- **Fresh Start**: No objects discovered initially - complete exploration required
- **Notifications**: Enhanced debug logging for discovery events
- **Reset**: Discovery state resets completely between sessions

**Testing**:
- **Test Script**: `test_10km_discovery.js` - Test 10km discovery range mechanics
- **Test Page**: `test_discovery_reset.html` - Standalone testing interface
- **Debug Commands**: `showNearestObjects()`, `simulateCloseApproach(objectId)`
- **Verification**: Discovery state resets completely between sessions

**Re-enabling Persistence** (when debugging complete):
1. **Frontend**: Uncomment persistence code in `StarChartsManager.js` methods `loadDiscoveryState()` and `saveDiscoveryState()`
2. **Backend**: Uncomment persistence code in `GameStateManager.py` methods `load_state()` and `save_state()`
3. **Testing**: Verify discovery state persists correctly between sessions
4. **Documentation**: Update this section to reflect restored persistence

**Files Modified**:
- `frontend/static/js/views/StarChartsManager.js` - Discovery persistence methods
- `backend/game_state.py` - Game state persistence methods
- `test_discovery_reset.js` - Debug testing script
- `test_discovery_reset.html` - Debug testing interface

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
- ✅ **Persistent settings** - Channel states saved in localStorage + file-based config

### **Dynamic Debug Channels Overview**

**📊 This section is auto-generated from `/frontend/static/js/debug-config.json`**

| Channel | Icon | Description | Default State |
|---------|------|-------------|---------------|
| `TARGETING` | 🎯 | Target acquisition and management | ❌ Disabled |
| `STAR_CHARTS` | 🗺️ | Star Charts navigation and UI | ❌ Disabled |
| `INSPECTION` | 🔍 | Click detection and object inspection | ❌ Disabled |
| `COMMUNICATION` | 🗣️ | NPC and player communication | ❌ Disabled |
| `UTILITY` | 🔧 | System utilities and positioning | ❌ Disabled |
| `AI` | 🤖 | Enemy AI and ship behaviors | ❌ Disabled |
| `INTERACTION` | 👆 | Touch and mouse interactions | ❌ Disabled |
| `MISSIONS` | 🚀 | Mission system operations | ❌ Disabled |
| `COMBAT` | ⚔️ | Combat mechanics and AI | ❌ Disabled |
| `NAVIGATION` | 🧭 | Navigation and movement systems | ❌ Disabled |
| `SCANNER` | 📡 | Long range scanner operations | ❌ Disabled |
| `RADAR` | 📡 | Radar and proximity detector systems | ❌ Disabled |
| `ECONOMY` | 💰 | Trading and economy systems | ❌ Disabled |
| `MONEY` | 💵 | Credit transactions, purchases, payments | ❌ Disabled |
| `INFRASTRUCTURE` | 🏗️ | Space stations and facilities | ❌ Disabled |
| `TESTING` | 🧪 | Test functions and debugging helpers | ❌ Disabled |
| `P1` | 🔴 | HIGH PRIORITY - Critical debugging | ✅ Enabled (alwaysEnabled) |

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
- **📡 SCANNER**: Long-range scanner operations
- **📡 RADAR**: Radar and proximity detector systems
- **💰 ECONOMY**: Trading, cargo, station services
- **💵 MONEY**: Credit transactions, purchases, payments
- **🏗️ INFRASTRUCTURE**: Station generation, docking ports
- **🧪 TESTING**: Unit tests, debug helpers, dev tools
- **🔴 P1**: High-priority debugging, system state tracking, workflow debugging (disabled by default, can be toggled)

#### **Why This System Exists:**

1. **Console Spam Reduction**: Only see debug messages you care about
2. **Performance**: Disabled channels don't generate output overhead
3. **Organization**: Related messages grouped by category and icon
4. **Persistence**: Settings remembered between browser sessions
5. **Runtime Control**: Change debug levels without code changes

### **🎯 When & How to Use Each Debug Channel**

#### **🎯 TARGETING**
**When to enable:** Debugging weapon systems, target lock-on, target cycling, HUD display issues
```javascript
// Examples of when to use TARGETING:
debug('TARGETING', 'Target locked:', target.name);
debug('TARGETING', 'Target distance:', distance + 'km');
debug('TARGETING', 'HUD update failed for target:', targetId);
```

#### **🗺️ STAR_CHARTS**
**When to enable:** Navigation issues, star chart display problems, discovery mechanics
```javascript
// Examples of when to use STAR_CHARTS:
debug('STAR_CHARTS', 'Star system loaded:', system.name);
debug('STAR_CHARTS', 'Navigation path calculated');
debug('STAR_CHARTS', 'Discovery failed for sector:', sectorId);
```

#### **🔍 INSPECTION**
**When to enable:** Click detection problems, object selection issues, UI interaction bugs
```javascript
// Examples of when to use INSPECTION:
debug('INSPECTION', 'Object clicked:', object.name);
debug('INSPECTION', 'Hit detection failed at coordinates:', x, y);
debug('INSPECTION', 'Selection bounds updated');
```

#### **🗣️ COMMUNICATION**
**When to enable:** NPC dialogue issues, radio messages, faction communication problems
```javascript
// Examples of when to use COMMUNICATION:
debug('COMMUNICATION', 'NPC dialogue triggered:', dialogueId);
debug('COMMUNICATION', 'Faction comms sent to:', faction.name);
debug('COMMUNICATION', 'Radio message queue:', queue.length);
```

#### **🔧 UTILITY**
**When to enable:** System initialization, positioning calculations, cleanup operations
```javascript
// Examples of when to use UTILITY:
debug('UTILITY', 'System initialized successfully');
debug('UTILITY', 'Position calculated:', x, y, z);
debug('UTILITY', 'Cleanup completed, freed:', resourceCount);
```

#### **🤖 AI**
**When to enable:** Enemy ship behaviors, AI pathfinding, flocking mechanics
```javascript
// Examples of when to use AI:
debug('AI', 'AI ship spawned at:', position);
debug('AI', 'Pathfinding started for target:', target.name);
debug('AI', 'Flocking behavior updated for group:', groupId);
```

#### **👆 INTERACTION**
**When to enable:** Touch/mouse input problems, gesture recognition issues
```javascript
// Examples of when to use INTERACTION:
debug('INTERACTION', 'Mouse clicked at:', x, y);
debug('INTERACTION', 'Touch gesture detected:', gesture.type);
debug('INTERACTION', 'Input event processed');
```

#### **🚀 MISSIONS**
**When to enable:** Mission state changes, objective tracking, reward distribution
```javascript
// Examples of when to use MISSIONS:
debug('MISSIONS', 'Mission accepted:', mission.title);
debug('MISSIONS', 'Objective completed:', objective.name);
debug('MISSIONS', 'Rewards distributed:', credits);
```

#### **⚔️ COMBAT**
**When to enable:** Weapon firing, damage calculations, combat AI, hit detection
```javascript
// Examples of when to use COMBAT:
debug('COMBAT', 'Weapon fired:', weapon.name);
debug('COMBAT', 'Damage calculated:', damage + 'hp');
debug('COMBAT', 'Combat AI decision:', action);
```

#### **🧭 NAVIGATION**
**When to enable:** Ship movement, autopilot, docking procedures
```javascript
// Examples of when to use NAVIGATION:
debug('NAVIGATION', 'Ship moved to:', position);
debug('NAVIGATION', 'Autopilot engaged for target:', target.name);
debug('NAVIGATION', 'Docking sequence initiated');
```

#### **📡 SCANNER**
**When to enable:** Long-range scanner operations, signal detection, range calculations
```javascript
// Examples of when to use SCANNER:
debug('SCANNER', 'Signal detected at range:', range);
debug('SCANNER', 'Scanner sweep completed');
debug('SCANNER', 'Contact identified:', contact.name);
```

#### **📡 RADAR**
**When to enable:** Proximity detector systems, radar contacts, collision detection
```javascript
// Examples of when to use RADAR:
debug('RADAR', 'Contact detected at:', distance);
debug('RADAR', 'Radar sweep angle:', angle);
debug('RADAR', 'Collision warning for object:', objectId);
```

#### **💰 ECONOMY**
**When to enable:** Trading systems, cargo operations, station services
```javascript
// Examples of when to use ECONOMY:
debug('ECONOMY', 'Trade completed:', item.name, 'for', price);
debug('ECONOMY', 'Cargo loaded:', cargo.type, quantity);
debug('ECONOMY', 'Station service requested:', service.name);
```

#### **💵 MONEY**
**When to enable:** Credit transactions, purchases, payment processing
```javascript
// Examples of when to use MONEY:
debug('MONEY', 'Credits spent:', amount, 'on', item);
debug('MONEY', 'Purchase completed for', price);
debug('MONEY', 'Insufficient funds:', required, 'vs', available);
```

#### **🏗️ INFRASTRUCTURE**
**When to enable:** Station generation, docking port management, facility operations
```javascript
// Examples of when to use INFRASTRUCTURE:
debug('INFRASTRUCTURE', 'Station generated:', station.name);
debug('INFRASTRUCTURE', 'Docking port assigned:', port.id);
debug('INFRASTRUCTURE', 'Facility service activated');
```

#### **🧪 TESTING**
**When to enable:** Unit tests, debugging helpers, development tools
```javascript
// Examples of when to use TESTING:
debug('TESTING', 'Unit test started:', test.name);
debug('TESTING', 'Debug helper activated');
debug('TESTING', 'Test assertion failed:', condition);
```

#### **🔴 P1 (HIGH PRIORITY)**
**When to enable:** Debugging high-priority issues, system state tracking, workflow debugging (default: disabled)

**⚠️ IMPORTANT: Reserve P1 for:**
- **Critical system failures**
- **Data corruption**
- **Security issues**
- **Game-breaking errors**

**DO NOT use P1 for:**
- Status messages (use appropriate channel like `STATUS`)
- Connection tests (use `MISSIONS` channel)
- Normal operation logging (use specific channel)

```javascript
// ✅ CORRECT - P1 for critical issues
debug('P1', 'CRITICAL: System initialization failed');
debug('P1', 'SECURITY: Invalid authentication detected');
debug('P1', 'DATA: Corruption detected in save file');

// ❌ WRONG - P1 misused for status messages
debug('P1', 'MissionAPIService: Connection test PASSED'); // Use MISSIONS channel
debug('P1', 'System ready for operation'); // Use UTILITY or STATUS channel

// Examples of when to use P1:
debug('P1', 'System initialization sequence started');
debug('P1', 'Database connection pool size: 10');
debug('P1', 'Security module loaded successfully');
debug('P1', 'Critical workflow step completed');
```

#### **⚠️ IMPORTANT: P1 vs Console Errors**
**For critical errors that must always be visible, use console.error/console.warn instead:**
```javascript
// ❌ WRONG - Error might be filtered out if P1 is disabled
debug('P1', 'CRITICAL ERROR: System initialization failed');

// ✅ CORRECT - Error always visible regardless of debug settings
console.error('CRITICAL ERROR: System initialization failed');
console.warn('SECURITY WARNING: Invalid authentication attempt');

// P1 is for debugging information, not for critical errors
debug('P1', 'Debug: Initialization sequence reached step 5');
```

### **🚀 Debug Workflow Best Practices**

#### **1. Start with Clean Console (Default State)**
```javascript
// Fresh session - console errors/warnings always visible
// Debug messages filtered out for clean output
// P1 disabled by default, only enable when debugging
```

#### **2. Enable Specific Channels for Focused Debugging**
```javascript
// Debugging targeting system issues
debugEnable('TARGETING');
debugEnable('COMBAT'); // If combat is involved

// Debugging navigation problems
debugEnable('NAVIGATION');
debugEnable('STAR_CHARTS'); // If charts are involved
```

#### **3. Use Multiple Channels for Complex Issues**
```javascript
// Debugging a complex mission system issue
debugEnable('MISSIONS', 'ECONOMY', 'MONEY', 'INFRASTRUCTURE');
```

#### **4. Disable Channels When Done**
```javascript
// Clean up after debugging
debugDisable('TARGETING', 'COMBAT');
// Or reset everything
debugReset();
```

#### **5. Persistent Configuration**
```javascript
// Save your preferred debug setup to file
debugSaveFile(); // Saves to /static/js/debug-config.json

// Load from file
debugLoadFile(); // Loads from file

// View current file config
debugConfigFile();
```

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
🔴 P1: System initialization sequence started
🔴 P1: Database connection pool established
🔴 P1: Security module verification complete
```

#### **Error Handling Best Practices**
```javascript
// For errors that should ALWAYS be visible:
console.error('DATABASE: Connection failed - retrying...');
console.warn('AUTH: Invalid login attempt detected');

// For debugging information that might be filtered:
debug('P1', 'Database connection retry attempt #3');
debug('P1', 'Auth module validation passed');
```

#### **Debug Configuration File:**

The debug system supports **file-based configuration** for persistent settings between browser sessions:

**Location:** `/frontend/static/js/debug-config.json`  
**URL:** `http://127.0.0.1:5001/static/js/debug-config.json`

**File Structure:**
```json
{
    "channels": {
        "TARGETING": { "enabled": true },
        "P1": { "enabled": false },
        // ... other channels
    },
    "global": {
        "useFileConfig": true,
        "useLocalStorage": true
    }
}
```

**To modify debug settings:**
1. Edit `/frontend/static/js/debug-config.json`
2. Change `"enabled": true/false` for desired channels
3. Reload the browser page
4. Debug settings will be applied automatically

**Browser Console Commands:**
```javascript
debugLoadFile()     // Load from file
debugConfigFile()   // Show current file config
debugSyncFile()     // Sync browser with file
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
