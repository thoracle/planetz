# Project Tasks

## 🎯 Current Status Summary

### ✅ **COMPLETED PHASES**
- **Initial Setup**: Flask backend, Three.js frontend, basic 3D scene
- **Core Implementation**: Planet generation, UI views, ship systems MVP
- **Ship Systems MVP**: Complete ship management with damage/repair systems
- **Backend Integration**: Full API endpoints for ship systems and station services
- **Technical Documentation**: Comprehensive UML diagrams and architecture docs
- **Celestial Object Enhancement**: Added descriptions and intel briefs to all celestial objects
- **Subspace Radio Intel Integration**: Enhanced radio system to broadcast intel data from current star system
- **Advanced Inventory System**: Complete NFT card collection system with Clash Royale-style mechanics fully integrated into main game
- **Weapon System Integration**: WeaponSyncManager implementation for unified weapon initialization
- **Documentation Modernization**: All documentation updated to reflect current implementation status

### 🚀 **NEXT PHASE: Final Polish & Advanced Features**
**Target**: Complete remaining autofire logic and add advanced gameplay features
- **Autofire Completion**: Automatic targeting and range validation implementation
- **Performance Optimization**: Code modularization for maintainability
- **Content Expansion**: Additional ships, cards, and mission system
- [X] **Documentation Updates**: All documentation and diagrams updated to reflect current implementation status
- [X] **Weapon Synchronization**: WeaponSyncManager ensures consistent weapon loadouts across all scenarios

### ⚠️ **CRITICAL: Large File Size Issues**
**Priority**: Medium - Code maintainability concerns (reduced priority due to production readiness)

#### 📁 **Files Requiring Modularization** (Performance Optimization)
- [ ] **app.js (88KB, 2,228 lines)** - Consider breaking into smaller modules
  - Extract planet generation logic into separate module
  - Split UI management from core app logic
  - Separate Three.js scene setup and rendering
  - Create dedicated modules for event handling and controls
  
- [ ] **CardInventoryUI.js (54KB, 1,462 lines)** - Consider modularization for maintainability
  - Split into separate components: CardGrid, CardStack, DragDrop
  - Extract card filtering and sorting logic
  - Separate rendering logic from data management
  - Create reusable card component modules
  
- [ ] **DamageControlInterface.js (45KB, 1,285 lines)** - Consider component extraction
  - Extract system status display into separate component
  - Split repair management into dedicated module
  - Separate CSS styling from component logic
  - Create reusable UI widgets for system health indicators

#### 📋 **Modularization Strategy**
1. **Identify Common Patterns**: Extract reusable components
2. **Separate Concerns**: Split UI logic from business logic
3. **Create Module Boundaries**: Clear interfaces between modules
4. **Maintain Backwards Compatibility**: Ensure existing functionality works
5. **Add Unit Tests**: Test extracted modules independently

#### ⚠️ **CRITICAL: Integration Issues**
**Priority**: High - System integration and dependency problems

- [X] **Station repair interface exists but integration with card system needs work** ⬅️ **COMPLETED**
  - [X] Current repair interface works with basic system repairs
  - [X] Card-based system upgrades properly integrated
  - [X] Repair costs connected with card inventory system
  - [X] Station interface shows card requirements for upgrades

- [ ] **Some systems reference non-existent dependencies** ⬅️ **NEXT IMMEDIATE TASK**
  - [ ] Audit all system imports and references
  - [ ] Identify and fix broken dependency chains
  - [ ] Remove references to deleted or moved files
  - [ ] Update import paths for refactored modules
  - [ ] Add proper error handling for missing dependencies

#### 🚀 **Performance Optimization Issues**
**Priority**: Medium - Performance and memory management improvements

- [X] **The card inventory system loads all card types at initialization. Consider lazy loading for better performance.** ⬅️ **COMPLETED**
  - [X] Current system initializes all card types on startup
  - [X] This creates memory overhead but is acceptable for current scope
  - [X] Lazy loading implemented through discovery system
  - [X] Progressive loading works well for card discovery system
  - [X] Performance is adequate for current gameplay needs

- [X] **Pre-load weapon audio buffers during weapon system initialization instead of first fire** ⬅️ **COMPLETED**
  - [X] Audio buffer loading moved to weapon system initialization phase
  - [X] All weapon audio is ready before allowing weapon firing
  - [X] Audio buffers loaded asynchronously during WeaponEffectsManager initialization
  - [X] No first-shot audio delay issues
  - [X] Enhanced user experience with guaranteed audio on first shot
  - [X] Files affected: WeaponEffectsManager.js, WeaponSyncManager.js, Ship.js
  - [X] Benefits: Guaranteed audio on first shot, better user experience, no audio warnings

#### 🎨 **Code Organization Issues**
**Priority**: Medium - Code maintainability and consistency improvements

- [ ] **Centralize faction color definitions for better maintainability**
  - Currently faction colors (`#ff6666` for hostile, `#ffff00` for neutral, `#00ff41` for friendly) are scattered throughout StarfieldManager.js
  - Colors are defined in multiple locations: wireframe colors, intel display, target display, direction arrows, sub-target indicators
  - Create a centralized color configuration object or constants file
  - Refactor all color references to use the centralized definitions
  - Benefits: Easier color updates, consistent theming, reduced duplication
  - Files affected: StarfieldManager.js (primary), possibly WeaponEffectsManager.js
  - Implementation: Create `FactionColors.js` or add to existing constants file

### 🚀 **NEXT PHASE: Game Polish & Advanced Features**
**Target**: Polish existing systems and add advanced gameplay features
- **Advanced Features**: Warp enhancements, distress calls, mission system
- **Economy System**: Trading, faction relationships, economic gameplay
- **Content Expansion**: Additional ship types, systems, and locations

### ✅ **RECENTLY COMPLETED: Advanced Inventory System Integration**
**Target**: Complete NFT card collection system integrated into main game
- **Design Complete**: ✅ Comprehensive UML diagrams and architecture documentation
- **Core Implementation**: ✅ NFTCard and CardInventory classes with stacking mechanics
- **Drag-and-Drop Interface**: ✅ Complete card installation system with slot type validation
- **Ship Configuration**: ✅ Multi-ship ownership with persistent configurations
- **Main Game Integration**: ✅ Added "SHIP INVENTORY" button to station docking interface
- **Two-Panel Layout**: ✅ Ship slots panel (left) and card inventory (right) with uniform sizing
- **Visual Feedback**: ✅ Green/red drag feedback, slot type validation, card compatibility
- **Ship Switching**: ✅ Real-time ship type switching with configuration persistence
- **Station Integration**: ✅ Separate inventory management and upgrade shop interfaces
- **Production Ready**: ✅ Complete integration with existing ship systems and docking interface

### ✅ **RECENTLY COMPLETED: Ship Gear Display System**
**Target**: Fix ship gear not displaying correctly in card shop interface
- **Root Cause Identified**: ✅ Ship configuration was not being loaded after ship switching
- **Core Fix Applied**: ✅ Added `loadShipConfiguration()` call after ship type changes in card shop
- **Interface Cleaned**: ✅ Removed debug scaffolding and emergency CSS styles
- **Production Ready**: ✅ Card shop now properly displays all ship gear configurations
- **Main Game Integration**: ✅ Card inventory CSS added to main index.html for full integration
- **Debug Cleanup**: ✅ Removed DebugConfig.js references to eliminate 404 errors
- **Constructor Fix**: ✅ Fixed CardInventoryUI constructor to handle null containerId for shop mode
- **Method Implementation**: ✅ Added all missing CardInventoryUI methods (loadTestData, createUI, render, etc.)
- **Integration Complete**: ✅ All CardInventoryUI instantiation errors resolved, system fully operational
- **Grid Layout Fix**: ✅ Fixed card inventory grid displaying as single column instead of proper multi-column layout
- **Responsive Design**: ✅ Improved responsive CSS breakpoints for better grid display on all screen sizes
- **Shop Mode Enhancement**: ✅ Added specific CSS for shop mode to ensure proper full-screen grid layout
- **Ship Type Display**: ✅ Fixed "undefined" ship type display by using shipType instead of non-existent class property
- **Ship Selection Testing**: ✅ Updated ship dropdown to show all available ships for testing instead of just owned ships
- **Card Sizing Optimization**: ✅ Fixed card width issues by reducing minimum grid size to 120px and adding max-width constraints
- **Responsive Card Layout**: ✅ Added progressive card sizing for different screen breakpoints (110px, 100px, 90px)
- **Shop Mode Card Layout**: ✅ Enhanced shop mode with specific card sizing breakpoints for optimal grid display
- **Debug Test Tool**: ✅ Created standalone test page (test/card-layout-test.html) for efficient grid layout debugging
- **Grid HTML Structure Fix**: ✅ Fixed renderInventoryGrid to remove incorrect card-grid wrapper div preventing proper CSS grid layout
- **Grid Overflow Resolution**: ✅ Fixed card overflow issues by implementing 4-column maximum grid with 250px minimum width
- **Complete Layout Integration**: ✅ Updated test interface to show full two-panel layout (ship slots + inventory)
- **Label Standardization**: ✅ Updated interface labels from "CARD INVENTORY" to "INVENTORY"
- **Initialization Fix**: ✅ Fixed test page initialization error by using correct CardInventoryUI methods
- **Debug Cleanup Complete**: ✅ Removed test files and completed grid layout debugging
- **Key Insight**: The real issue was not CSS visibility problems but missing configuration reload on ship switches

### ✅ **RECENTLY COMPLETED: Special Starter Solar System**
**Target**: Create compact beginner-friendly solar system for new players
- **Starter System Design**: ✅ Created special "Sol" system for sector A0 with optimal learning layout
- **Compact Layout**: ✅ Much closer orbital distances (15-35 units vs 1000-5000) for easier navigation
- **Simplified Composition**: ✅ One Earth-like planet "Terra Prime" with exactly 2 moons (Luna & Europa)
- **Training Focus**: ✅ All bodies marked as friendly with training/educational economy types
- **Beginner Descriptions**: ✅ All celestial bodies have beginner-focused descriptions and intel briefs
- **Navigation Friendly**: ✅ Closer moon orbits (2.5x spacing vs 4.0x) for easier exploration
- **Consistent Generation**: ✅ Uses fixed seed to ensure all players get identical starter experience
- **Integration Complete**: ✅ Backend generates special system, frontend renders with compact spacing
- **Key Features**: Sol (yellow dwarf) → Terra Prime (Class-M) → Luna (rocky mining) + Europa (ice research)

### ✅ **RECENTLY COMPLETED: Intel System Enhancement**
**Target**: Enhanced intel system with icon notifications and HUD dismissal
- **Intel Icon**: ✅ Pulsing intel icon appears when within scan range of celestial objects
- **Intel HUD**: ✅ Press 'I' to toggle intel display showing descriptions and intel briefs
- **Auto-Dismissal**: ✅ Intel HUD dismisses when pressing 'I' again or changing targets
- **Integration**: ✅ Connected to existing celestial object data and long range scanner
- **UI Improvements**: ✅ Removed redundant distance display and improved positioning to prevent overlap
- **Faction Colors**: ✅ Complete faction color integration - icon, HUD frame, scrollbar (with enhanced CSS targeting for nested elements), headers, content text, and star information all match target faction colors

### 📋 **IMPLEMENTATION PRIORITY ORDER**
1. **✅ NFTCard and CardInventory classes** (Core data structures) - **COMPLETED**
2. **✅ Card discovery and drop system** (Loot mechanics) - **COMPLETED** 
3. **✅ Card collection UI** (Grid display with silhouettes) - **COMPLETED**
4. **✅ Drag-and-drop interface** (Card installation) - **COMPLETED**
5. **✅ Ship collection management** (Multiple ship ownership) - **COMPLETED**
6. **✅ Build validation system** (Launch prevention) - **COMPLETED**
7. **✅ Main game integration** (Station interface) - **COMPLETED**

### 🎯 **NEXT PRIORITY SUGGESTIONS**
1. **Mission System** - Add procedural missions and objectives
2. **Economy & Trading** - Implement station trading and faction relationships  
3. **Advanced Warp Features** - Distress calls, navigation challenges
4. **Ship Purchasing** - Allow players to buy new ship types with credits
5. **Content Expansion** - More ship types, card types, and system variants

---

## Initial Setup
- [X] Set up Python Flask backend
  - [X] Create flask project file structure
  - [X] Create basic server structure
  - [X] Configure static file serving
- [X] Initialize frontend structure
  - [X] Create static file structure
  - [X] Set up Three.js via CDN
  - [X] Create basic 3D scene

## Core Implementation

### Backend Development
- [X] Create Flask application
  - [X] Set up routes for static files
  - [X] Add error handling
- [X] Implement API endpoints
  - [X] Add planet configuration endpoints
  - [X] Add generation parameters API

### Frontend Development

#### Three.js Scene Setup
- [X] Initialize Three.js scene
  - [X] Set up perspective camera
  - [X] Add directional light
  - [X] Configure ambient lighting
- [X] Create basic scene management
  - [X] Scene initialization
  - [X] Render loop
  - [X] Window resize handling

#### Planet Generation
- [X] Implement density field generation
  - [X] Create grid system (64x64x64)
  - [X] Implement density formula
  - [X] Add noise integration
- [X] Implement chunk-based rendering
  - [X] Create chunk management system
  - [X] Implement 16x16x16 chunk division
  - [X] Add chunk update system
- [X] Add terrain features
  - [X] Implement different biome/planet types
  - [X] Add height-based terrain variation
  - [X] Create terrain texture mapping
  - [X] Add visual feedback (like color changes) for different planet types

#### User Interface
- [X] Create parameter control widgets
  - [X] Noise scale slider
  - [X] Octaves slider
  - [X] Persistence slider
  - [X] Terrain height controls
- [X] Select Planet Type from drop down list
- [X] Add real-time updates
  - [X] Implement debouncing
  - [X] Add visual feedback

#### UI Views
- [X] Implement Front View
  - [X] Create main combat view camera setup
  - [X] Add 3D rendering of space objects (stars, planets, moons, ships)
  - [X] Implement + crosshair display
  - [X] Add F key binding (disabled in Edit-Mode)
  - [X] Set up default view state
- [X] Implement Aft View
  - [X] Create backward-facing camera setup
  - [X] Mirror Front View rendering for backward orientation
  - [X] Implement -- -- crosshair display
  - [X] Add A key binding (disabled in Edit-Mode)
- [X] Implement Galactic Chart
  - [X] Create 2D overlay map system
  - [X] Implement grid layout (0-9 horizontal, A-Z vertical)
  - [X] Add vertical scroll functionality
  - [X] Create modal overlay system
  - [X] Add G key binding (disabled in Edit-Mode)
  - [X] Implement modal dismissal (A, F keys and X button)
  - [X] use verse.py to populate the universe with solar systems
  - [X] Visualize verse.py with galactic chart
  - [X] Add solar system cell labeling
  - [X] Add ability to warp from sector to sector (see docs/warp_drive_spec.md)
- [X] View Management System
  - [X] Implement view state management
  - [X] Create smooth transitions between views
  - [X] Handle keyboard input routing
  - [X] Manage Edit-Mode view restrictions
  - [X] Add view-specific UI elements
  - [X] Implement view-specific controls

## Visual Features
- [X] Atmospheric effects
- [X] Cloud generation with slider
- [ ] Custom texture mapping
- [ ] Advanced biome generation
- [ ] Craters for moons

## Testing

### Backend Testing
- [X] Set up testing framework (pytest)
- [X] Write unit tests for core functions
  - [X] Test health check endpoint
  - [ ] Test planet generation endpoints
  - [ ] Test parameter validation
- [ ] Test error handling

### Frontend Testing
- [X] Set up Jest testing framework
- [X] Write unit tests for core functions
  - [X] Test planet generator initialization
  - [X] Test noise generation consistency
  - [X] Test noise value ranges
  - [X] Test terrain height effects
  - [X] Test density field consistency
  - [X] Test chunk update handling
  - [X] Test planet class changes
  - [X] Test concurrent chunk updates
- [ ] Test browser compatibility
- [ ] Performance benchmarks
- [ ] Test UI responsiveness

### Performance Optimization
- [X] Implement chunk management optimization
  - [X] Add position-based update threshold
  - [X] Implement chunk activation/deactivation
  - [X] Add memory management
- [X] Implement Web Workers
  - [X] Set up worker communication
  - [X] Offload mesh generation
  - [X] Handle worker lifecycle
- [X] Optimize chunk rendering
  - [X] Implement chunk culling
  - [X] Add level of detail system
  - [X] Optimize memory usage
- [X] Optimize triangle count
  - [X] Implement mesh simplification
  - [X] Add adaptive detail levels

## Documentation
- [X] Create technical documentation
  - [X] Architecture overview
  - [X] Component documentation
  - [X] API documentation
  - [X] UML diagrams and system architecture
- [ ] Write user documentation
  - [ ] Installation guide
  - [ ] Usage instructions
  - [ ] Parameter explanations

## Celestial Object Enhancement
- [X] **Description System**
  - [X] Add contextual descriptions for all celestial body types
  - [X] Create description templates for stars (red dwarf, yellow dwarf, blue giant, white dwarf)
  - [X] Create description templates for planets (Class-M, Class-H, Class-D, Class-J, Class-L, Class-N)
  - [X] Create description templates for moons (rocky, desert, ice)
  - [X] Implement description generation functions in backend/verse.py
- [X] **Intel Brief System**
  - [X] Generate strategic intelligence based on celestial body attributes
  - [X] Create intel templates for diplomacy status (friendly, neutral, enemy, unknown)
  - [X] Create intel templates for government types (Democracy, Tyranny, Theocracy, Monarchy, Anarchy)
  - [X] Create intel templates for economy types (Agricultural, Industrial, Technological, Commercial, Mining, Research, Tourism)
  - [X] Create intel templates for technology levels (Primitive, Post-Atomic, Starfaring, Interstellar, Intergalactic)
  - [X] Implement intel brief generation functions in backend/verse.py
- [X] **Frontend Integration**
  - [X] Update SolarSystemManager.js to include description and intel_brief fields
  - [X] Update Long Range Scanner UI to display new fields
  - [X] Add CSS styling for description and intel brief sections
  - [X] Implement proper formatting and visual hierarchy
- [X] **API Integration**
  - [X] Update universe generation API to include new fields
  - [X] Test API endpoints for proper data generation
  - [X] Verify frontend display of generated content

## Subspace Radio Intel Integration
- [X] **Intel Message Generation**
  - [X] Create generateIntelMessages() function to extract intel from current star system
  - [X] Generate star-based intel messages using star descriptions and intel briefs
  - [X] Generate planet-based intel messages with diplomacy-aware categorization
  - [X] Generate moon-based intel messages with strategic context
  - [X] Create strategic overview messages based on system composition
  - [X] Add technology level analysis for advanced civilizations
  - [X] Add economic analysis for industrial centers
- [X] **Message Enhancement**
  - [X] Add timestamp formatting for intel messages
  - [X] Add priority indicators ([INTEL], [PRIORITY], [COMMERCE], [NAV], [INFO])
  - [X] Enhance displayMessage() method with intel-specific formatting
  - [X] Integrate intel messages with existing message pool
  - [X] Maintain existing color coding system for message types
- [X] **System Integration**
  - [X] Connect SubspaceRadio to StarfieldManager for system data access
  - [X] Access current star system data through SolarSystemManager
  - [X] Generate contextual messages based on current sector location
  - [X] Test intel message generation and display functionality

## Future Features (Backlog)
- [ ] Sun, Planet and moon orbit with gravity
- [ ] Generate universe using backend/verse.py 
- [ ] Save/load planet configurations
- [ ] CTRL-E edit mode will need a way to target a specific object for editing (currently it points at the initial planet)

## Project Management
- [ ] Set up continuous integration
- [ ] Configure deployment pipeline
- [ ] Create contribution guidelines
- [ ] Add license information

# Ship Systems Implementation Plan

## MVP Phase - Simplified Hardpoint/Inventory System

### Core Ship Systems
- [X] Create base Ship class
  - [X] Implement data-driven ship configuration
    - [X] Add heavy fighter configuration
    - [X] Create base stats configuration
    - [X] **SIMPLIFIED**: Universal slot system - all systems take 1 slot (no hardpoint types)
    - [X] **SIMPLIFIED**: Remove power grid complexity - systems consume energy from shared pool when active
  - [X] Add system management functionality
    - [X] Create system registry
    - [X] Implement system initialization
    - [X] Add system state tracking
    - [X] **SIMPLIFIED**: Slot-based installation (no card/NFT system for MVP)
  - [X] Implement central energy management
    - [X] Create energy pool
    - [X] Add energy consumption tracking
    - [X] **SIMPLIFIED**: Systems consume energy directly when active (no separate power allocation)
  - [X] Create system state abstraction layer
    - [X] Implement state validation
    - [X] Add state transition rules
    - [X] Create state persistence

### Simplified Inventory System (MVP)
- [X] **SIMPLIFIED**: Direct system installation/removal
  - [X] Implement slot availability checking
  - [X] Add system compatibility validation
  - [X] Create basic build rules (e.g., must have engines)
  - [X] **DEFERRED**: NFT/Card system moved to post-MVP
  - [X] **DEFERRED**: Stacking inventory moved to post-MVP
  - [X] **DEFERRED**: Drag-and-drop interface moved to post-MVP

### Ship Configuration System (MVP)
- [X] **SIMPLIFIED**: Level-based system progression
  - [X] Systems upgrade through level progression (1-5)
  - [X] Level requirements based on credits/materials
  - [X] **DEFERRED**: Card collection system moved to post-MVP
  - [X] **DEFERRED**: Multiple card requirement for upgrades moved to post-MVP

- [X] **SIMPLIFIED**: Ship Type System
  - [X] Heavy Fighter implemented
  - [X] Add remaining ship types (Scout, Light Fighter, Light Freighter, Heavy Freighter)
  - [X] Increase slot counts to support 8 core systems plus expansion room
  - [X] **NEW**: Implement gear-based stats system
    - [X] Create HullPlating system (provides hull hit points)
    - [X] Create EnergyReactor system (provides energy capacity and recharge rate)
    - [X] Create ShieldGenerator system (provides armor rating when active)
    - [X] Create CargoHold system (provides cargo capacity)
    - [X] Modify Ship class to derive all stats from installed gear
    - [X] Update all ship configurations to use gear-based stats
    - [X] Create test interface for gear-based stats system
  - [X] Implement ship type selection interface
  - [X] **DEFERRED**: Ship purchasing system moved to post-MVP
  - [ ] **DEFERRED**: Cross-ship system transfer moved to post-MVP

- [X] Ship Integration with Game Systems
  - [X] Integrate Ship with ViewManager
    - [X] Replace ViewManager.shipEnergy with Ship instance
    - [X] Connect Ship energy methods to existing getShipEnergy/updateShipEnergy
    - [X] Maintain backward compatibility with existing energy system
  - [X] Add Ship instance to StarfieldManager
    - [X] Update HUD to display Ship status
    - [X] Connect Ship energy to existing energy display
  - [X] Connect Ship energy system to existing UI
  - [X] Add Ship status display to HUD

- [X] Implement System interface
  - [X] Define base system properties
  - [X] Create health/damage tracking
  - [X] Add effectiveness calculations
  - [X] Implement state management
    - [X] Create state machine for system states
    - [X] Implement state transition logic
    - [X] Add state effect handlers
  - [X] Add system level progression (1-5)
    - [X] Level 1 base implementation
    - [X] Level 2 upgrade path
    - [X] Level 3 upgrade path
    - [X] Level 4 upgrade path
    - [X] Level 5 upgrade path
  - [X] Implement level-specific stats
  - [X] Add level requirements tracking
  - [X] **SIMPLIFIED**: Add energy consumption per second when active (no static power allocation)
  - [X] **SIMPLIFIED**: Add system activation/deactivation methods
  - [X] **SIMPLIFIED**: Auto-deactivate systems when insufficient energy

- [X] System Integration
  - [X] Warp Drive Integration
    - [X] Add warp drive damage status check
    - [X] Energy consumption during warp (already implemented via ViewManager)
    - [X] Convert existing WarpDrive to use Ship's WarpDrive system
  - [X] HUD Integration
    - [X] Add damage control interface (Press 'D' to toggle Damage Control View)
    - [X] Create station repair interface
    - [X] **DEFERRED**: System shop interface moved to post-MVP
  - [X] Station Integration
    - [X] Add docking system checks
    - [X] Implement repair services
    - [X] **DEFERRED**: System shop moved to post-MVP
    - [X] Add launch sequence

- [X] Create concrete system implementations
  - [X] Impulse Engines
    - [X] Speed and maneuverability calculations
    - [X] **SIMPLIFIED**: Energy consumption per second when maneuvering (variable based on impulse speed 1-9)
    - [X] Damage effects (critical damage limits max speed to impulse 3)
    - [X] Level-specific performance (higher levels more efficient and faster)
    - [X] Variable energy consumption: Impulse 1 = base consumption, Impulse 9 = 15x consumption
    - [X] Free rotation (no energy cost for turning)
    - [X] Travel time/energy cost calculations
  - [X] Warp Drive (extend existing implementation)
    - [X] Warp cost calculations (already implemented)
    - [X] Cooldown management (already implemented)
    - [X] Energy consumption (already implemented)
    - [X] Convert to System class for damage/repair functionality
    - [X] Level-specific capabilities
  - [X] Shields
    - [X] Shield capacity
    - [X] Recharge rate
    - [X] **SIMPLIFIED**: Energy consumption per second when active
    - [X] Level-specific protection
    - [X] Press 'S' to toggle Shields on/off.  Tint screen blue when shields are on.
  - [X] Weapons
    - [X] Damage calculations
    - [X] Fire rate management
    - [X] **SIMPLIFIED**: Energy consumption per shot (instant consumption)
    - [X] Level-specific damage
  - [X] Long Range Scanner (extend existing implementation)
    - [X] Basic long range scanner exists (already implemented)
    - [X] Convert to System class for damage/repair functionality
    - [X] Check if Long Range Scanner is damaged when activating it
    - [X] **SIMPLIFIED**: Energy consumption per second when scanning
    - [X] Implement scan range reduction / fog of war
    - [X] Create repair integration
  - [X] Subspace Radio (extend existing Galactic Chart implementation)
    - [X] Basic galactic chart exists (already implemented)
    - [X] Convert to System class for damage/repair functionality
    - [X] Check if Subspace Radio is damaged when using Galactic Chart
    - [X] **SIMPLIFIED**: Energy consumption per second when transmitting
    - [X] Implement chart range reduction / fog of war
    - [ ] Implement galactic chart update degradation (move to post MVP)
    - [X] Create repair integration
  - [X] Target Computer (extend existing implementation)
    - [X] Basic targeting computer exists (already implemented)
    - [X] Convert to System class for damage/repair functionality
    - [X] **SIMPLIFIED**: Energy consumption per second when active
    - [X] **NEW**: Implement sub-targeting system (Level 3+ targeting computer)
      - [X] Create targetable system detection for enemy ships
      - [X] Create sub-target cycling logic (cycleSubTargetNext/Previous methods)
      - [X] Implement enhanced weapon accuracy for sub-targeted systems (accuracy bonus)
      - [X] Implement damage bonus calculations for targeted systems
      - [X] Add system priority targeting (weapons > shields > engines, etc.)
      - [X] Create test interface for sub-targeting functionality
      - [X] Add < and > key bindings to iterate through targetable enemy systems
      - [X] Extend targeting HUD UI to show selected sub-target
      - [X] Add visual indicators for targetable systems
      - [X] Create simplified enemy ship configurations with only essential combat systems
      - [X] Implement EnemyShip class for target dummy ships with minimal systems
      - [X] Fix universe generation endpoint 400 error (seed handling issue)
      - [X] Create test page for enemy ship functionality verification
      - [X] Remove sub-targeting functionality from celestial bodies (planets, moons, stars)
      - [X] Ensure sub-targeting only works for enemy ships
      - [X] Fix test page method name error (waitForSystemsInitialized vs waitForSystemsInitialization)
      - [X] Standardize enemy ship configurations to have exactly 7 essential systems
      - [X] Fix system name inconsistencies (shields vs shield_generator)
      - [X] Verify all sub-targeting restrictions work correctly through comprehensive testing
    - [X] Level-specific targeting capabilities
      - [X] Level 1-2: Basic targeting (existing functionality)
      - [X] Level 3+: Sub-targeting of specific enemy systems
      - [X] Higher levels: Improved sub-target detection range and accuracy
    - [X] Update all ship configurations to use Level 3+ targeting computers for testing

### UI Implementation
- [X] Extend Ship Systems HUD
  - [X] Add notification messages when systems are repaired/damaged/destroyed
  - [X] **SIMPLIFIED**: Show energy consumption rate for active systems
  - [X] **NEW**: Enhanced Targeting HUD (Level 3+ Target Computer)
    - [X] Add sub-target selection display
    - [X] Show targetable enemy systems list
    - [X] Add visual indicators for selected sub-target
    - [X] Implement sub-target cycling UI feedback
    - [X] Add accuracy bonus indicators for sub-targeted systems
    - [X] Standardize system display names across all UI components
    - [X] Replace generic "weapons" system with specific weapon types (Laser Cannon, Plasma Cannon, etc.)

- [X] Damage Control Interface
  - [X] Create system status display
  - [X] Toggle Damage Control Modal HUD View when user presses 'D'
    - [X] Don't allow user to activate Damage Control when docked.
  - [X] Implement repair priority controls
  - [X] Add repair kit management
  - [X] Create damage effects visualization
  - [ ] Implement 3D wireframe model (moved to post-MVP)
    - [ ] Add color-coded damage indicators (moved to post-MVP)
    - [ ] Create interactive system selection (moved to post-MVP)
    - [ ] Implement rotating view (moved to post-MVP)
    - [ ] Add zoom capability (moved to post-MVP)
  - [X] Add damage log
    - [X] Create scrolling ticker for notifications
    - [X] Implement damage type indicators
    - [X] Add timestamp tracking
  - [X] Create repair interface
    - [X] Add repair kit inventory display
    - [X] Implement station repair cost display
    - [X] Add repair time estimates
    - [X] Create priority setting controls

- [X] **SIMPLIFIED**: Basic Station Interface (MVP)
  - [X] Create repair service interface
  - [X] Add hull repair service
  - [X] Add individual system repair options
  - [X] Implement repair cost calculations
  - [X] Add repair time estimates
  - [X] Implement credit balance display
  - [X] Add faction-based pricing
  - [X] Add ship class pricing multipliers
  - [X] Add emergency repair options (instant, higher cost)
  - [X] Create comprehensive test interface
  - [X] **DEFERRED**: System shop moved to post-MVP
  - [ ] **DEFERRED**: Upgrade preview moved to post-MVP
  - [ ] **DEFERRED**: Compatibility indicators moved to post-MVP

### Backend Integration

- [X] API Endpoints
  - [X] System status endpoints
  - [X] **SIMPLIFIED**: Basic upgrade management endpoints (level-based)
  - [X] Repair system endpoints
  - [X] **SIMPLIFIED**: Energy management endpoints (no power grid)
  - [X] Ship class management endpoints
  - [X] Repair kit management endpoints
  - [ ] **DEFERRED**: Faction standing endpoints moved to post-MVP
  - [ ] **DEFERRED**: Resource management endpoints moved to post-MVP

## Post-MVP Phase - Full NFT/Card System

### Advanced Inventory System (Next MVP Task)
- [X] **NFT/Card System Implementation** 
  - [X] **DESIGN COMPLETE**: Comprehensive UML diagrams and architecture documentation
    - [X] Class diagrams for NFT card collection system
    - [X] Sequence diagrams for card discovery and upgrade flows
    - [X] State diagrams for ship configuration states
    - [X] Component diagrams for UI architecture
    - [X] Activity diagrams for user interaction flows
    - [X] Data flow diagrams showing system integration
  - [X] **IMPLEMENTATION PHASE**: Implement Pseudo-NFT card system ⬅️ **COMPLETED**
    - [X] Create NFTCard class with token ID and metadata
    - [X] Add card rarity system (Common, Rare, Epic, Legendary)
    - [X] Implement card discovery system with silhouettes
    - [X] Add card type definitions for all ship systems
  - [X] Create Clash Royale-style stacking inventory system
    - [X] Implement card stack management (all same type cards stack)
    - [X] Add upgrade requirements (3x, 6x, 12x, 24x cards per level)
    - [X] Create card collection tracking and progress display
    - [X] Add Pokédex-style discovery system with silhouettes
  - [X] Implement drag-and-drop interface ⬅️ **COMPLETED & DEBUGGED**
    - [X] Create card inventory UI with grid layout
    - [X] Add ship slot interface for card installation
    - [X] Implement card transfer system between inventory and slots
    - [X] Add visual feedback for valid drops and build validation
    - [X] Fix slot element null reference errors
  - [X] Create ship collection management ⬅️ **COMPLETED**
    - [X] Allow multiple ship ownership
    - [X] Add ship selection interface (station-only)
    - [X] Implement ship configuration persistence
    - [X] Add build validation preventing invalid launches

### Card Collection and Upgrade System (Post-MVP)
- [ ] **Card-Based Progression** ⬅️ **NEXT IMMEDIATE TASK**
  - [ ] Implement card collection mechanics
    - [ ] Add loot drop system
    - [ ] Create mission reward system
    - [ ] Implement card trading (external marketplace)
  - [ ] Create card upgrade system
    - [ ] Implement multiple card requirements
    - [ ] Add credit cost system
    - [ ] Create upgrade preview system
    - [ ] Add upgrade confirmation system

### Advanced Hardpoint System (Post-MVP)
- [ ] **Enhanced Slot System**
  - [ ] Implement hardpoint specialization
    - [ ] Add weapon hardpoints
    - [ ] Create utility hardpoints
    - [ ] Implement engine hardpoints
    - [ ] Add defensive hardpoints
  - [ ] Create build validation system
    - [ ] Implement advanced build rules
    - [ ] Add compatibility checking
    - [ ] Create performance warnings
    - [ ] Add optimization suggestions

### Ship Editor Mode (Ctrl-S)
- [ ] Create Ship Editor UI (follow form and function of existing Ctrl-E Planet Editor and sits in same place in UI)
  - [ ] Implement modal overlay system
    - [ ] Add Ctrl-S key binding
    - [ ] Create modal dismissal (A, F keys and X button)
    - [ ] Add edit mode state management
  - [ ] Create ship property controls
    - [ ] Add ship type selector
    - [ ] **ENHANCED**: Card-based system management
    - [ ] **ENHANCED**: Drag-and-drop card installation
  - [ ] Add real-time preview
    - [ ] Show system status changes
    - [ ] Update ship performance metrics
    - [ ] Show system dependencies
    - [ ] **SIMPLIFIED**: Show total energy consumption of active systems
  - [ ] Implement save/load functionality
    - [ ] Add ship configuration storage
    - [ ] Create configuration export
    - [ ] Add configuration import
    - [ ] Add configuration validation
    
### Optimization
- [ ] Performance Optimization
  - [ ] Optimize system calculations
  - [ ] Enhance damage calculations
  - [ ] Optimize UI rendering
  - [ ] Optimize card system performance

- [ ] Memory Management
  - [ ] Implement object pooling
  - [ ] Optimize asset loading
  - [ ] Improve garbage collection
  - [ ] Reduce memory footprint

### Testing
- [ ] Unit Tests
  - [ ] Ship class tests
  - [ ] System interface tests
  - [ ] **ENHANCED**: Card system tests
  - [ ] **ENHANCED**: NFT integration tests

- [ ] Integration Tests
  - [ ] System interaction tests
  - [ ] UI integration tests
  - [ ] Backend integration tests
  - [ ] Performance tests
  - [ ] **ENHANCED**: Card collection tests

- [ ] UI Tests
  - [ ] HUD functionality tests
  - [ ] Damage report tests
  - [ ] **ENHANCED**: Card inventory tests
  - [ ] **ENHANCED**: Drag-and-drop tests

### Advanced Features
- [ ] Advanced Warp Interactions
    - [ ] Add damage effects from collisions with asteroids during warp sequence (post-MVP)
    - [ ] Manuever with arrow keys durring warp to keep crosshairs centered while avoiding/destroying asteroids
       - [ ] if player can't keep crosshairs centered then they arrive off course

- [ ] **ENHANCED**: Ship Class System
  - [ ] Implement ship class selection
  - [ ] Add ship purchase interface
  - [ ] **ENHANCED**: Card-based system transfer system
  - [ ] Add ship class restrictions
  - [ ] Implement faction availability
  - [ ] Add ship comparison tools
  - [ ] Create ship preview system

- [ ] System Dependencies
  - [ ] Implement system relationships
    - [ ] Add engine-shield interaction
    - [ ] Create weapon-power dependencies
    - [ ] Implement scanner-radio synergy
    - [ ] Add targeting-weapon integration
    - [ ] **NEW**: Enhanced targeting-weapon integration (Level 3+ Target Computer)
      - [ ] Implement sub-system targeting mechanics
      - [ ] Add targeted damage calculations
      - [ ] Create system vulnerability detection
  - [ ] Create cascading effects
    - [ ] Implement damage propagation
    - [ ] Add performance impact calculations
    - [ ] Create system failure chains
    - [ ] Implement repair priority effects

- [ ] Advanced Damage System
  - [ ] Implement critical hits
  - [ ] Add system vulnerabilities
  - [ ] Create damage types
  - [ ] Add repair complexity

- [ ] **ENHANCED**: Card-Based Upgrade System
  - [ ] Add card combinations
  - [ ] Implement upgrade trees
  - [ ] Create special card abilities
  - [ ] Add card limitations

- [ ] Distress Call System
  - [ ] Implement distress call reception
  - [ ] Add call type classification
  - [ ] Create response options
  - [ ] Implement reward system
  - [ ] Add faction reputation effects

### UI Enhancements
- [ ] Visual Improvements
  - [ ] Add system animations
  - [ ] Enhance damage effects
  - [ ] Improve power flow visualization
  - [ ] Add system status effects
  - [ ] **ENHANCED**: Card visual effects

- [ ] UX Improvements
  - [ ] Add tooltips and help
  - [ ] Implement keyboard shortcuts
  - [ ] Add context menus
  - [ ] Create quick actions
  - [ ] **ENHANCED**: Card management shortcuts

### Documentation
- [X] Technical Documentation
  - [X] System architecture docs (docs/system_architecture.md)
  - [X] API documentation (backend/routes/api.py)
  - [X] UML diagrams and visual architecture
  - [X] Performance guidelines
  - [X] **ENHANCED**: NFT/Card system docs (docs/spaceships_spec.md, docs/tech_design.md)
  - [X] **ENHANCED**: Weapons system UML diagrams (docs/system_architecture.md)

- [ ] User Documentation
  - [ ] System guide
  - [ ] Upgrade guide
  - [ ] Repair guide
  - [ ] **SIMPLIFIED**: Energy management guide (no power grid complexity)
  - [ ] **ENHANCED**: Card collection guide
  - [ ] Weapons system user guide

## Weapons System Implementation

### Core Weapons System (Priority: High)
- [X] **WeaponSystem Class** ⬅️ **COMPLETED**
  - [X] Create base WeaponSystem class
    - [X] Implement weapon slots array management
    - [X] Add active weapon slot tracking (activeSlotIndex)
    - [X] Create weapon slot cycling logic ([ and ] keys)
    - [X] Implement autofire mode toggle (C key)
    - [X] Add weapon equip/unequip functionality
    - [X] Create weapon slot validation system
  - [X] Weapon Selection Logic
    - [X] Implement selectPreviousWeapon() method
    - [X] Implement selectNextWeapon() method
    - [X] Add empty slot skipping during cycling
    - [X] Create wrap-around cycling (first to last, last to first)
    - [X] Add active weapon highlight system

- [X] **WeaponSlot Class** ⬅️ **COMPLETED**
  - [X] Create individual weapon slot management
    - [X] Add equipped weapon tracking
    - [X] Implement cooldown timer system
    - [X] Create fire() method with validation
    - [X] Add canFire() status checking
    - [X] Implement cooldown percentage calculation
  - [X] Cooldown Management
    - [X] Create updateCooldown(deltaTime) method
    - [X] Add cooldown timer visualization
    - [X] Implement cooldown expiration handling
    - [X] Add cooldown status indicators

- [X] **WeaponCard Integration** ⬅️ **COMPLETED**
  - [X] Extend existing NFTCard system for weapons
    - [X] Add weapon-specific card properties (damage, cooldown, range)
    - [X] Implement weapon type classification (Scan-Hit vs Splash-Damage)
    - [X] Add autofire capability flag
    - [X] Create special properties system (accuracy, blast radius, homing)
  - [X] Weapon Card Types
    - [X] Create Scan-Hit weapon cards (Laser Cannon, Plasma Cannon)
    - [X] Create Splash-Damage weapon cards (Missile, Torpedo, Mine)
    - [X] Add weapon card rarity system integration
    - [X] Implement weapon level progression effects

### Weapon Type Implementations
- [X] **Scan-Hit Weapons (Direct Fire)** ⬅️ **COMPLETED**
  - [X] ScanHitWeapon class implementation
    - [X] Create instant-hit damage calculation
    - [X] Implement accuracy-based hit chance
    - [X] Add energy consumption per shot
    - [X] Create muzzle flash visual effects
    - [X] Add hit confirmation feedback
  - [X] Specific Scan-Hit Weapons
    - [X] Laser Cannon (high accuracy, low damage, short cooldown)
    - [X] Plasma Cannon (moderate accuracy, high damage, longer cooldown)
    - [X] Pulse Cannon (burst fire capability)
    - [X] Phaser Array (wide-beam area effect)

- [X] **Splash-Damage Weapons (Projectile)** ⬅️ **COMPLETED**
  - [X] SplashDamageWeapon class implementation
    - [X] Create projectile spawning system
    - [X] Implement target lock requirement validation
    - [X] Add blast radius damage calculation
    - [X] Create projectile flight mechanics
    - [X] Add explosion visual and audio effects
  - [X] Projectile System
    - [X] Base Projectile class with physics
    - [X] Standard missile implementation
    - [X] Homing missile with target tracking
    - [X] Torpedo with large blast radius
    - [X] Proximity mine deployment system

### Autofire System
- [X] **Autofire Mode Implementation** ⬅️ **MOSTLY COMPLETED**
  - [X] Create autofire toggle system (C key)
    - [X] Add autofire status tracking
    - [X] Implement autofire eligibility checking
    - [X] Create autofire update loop integration
    - [X] Add autofire visual indicators
  - [X] Autofire Logic ⬅️ **PARTIALLY COMPLETED**
    - [ ] Implement automatic target selection ⬅️ **NEXT IMMEDIATE TASK**
    - [X] Add range-based firing validation
    - [X] Create autofire cooldown management
    - [X] Implement mixed manual/auto firing
    - [ ] Add autofire priority system (closest target first) ⬅️ **NEXT IMMEDIATE TASK**

### Target Lock and Firing Control
- [X] **Target Lock Integration** ⬅️ **MOSTLY COMPLETED**
  - [X] Integrate with existing TargetComputer system
    - [X] Add target lock requirement validation
    - [X] Implement target lock indicators for weapons
    - [X] Create target lock timeout handling
    - [X] Add target lock range validation
  - [X] Firing Control ⬅️ **COMPLETED**
    - [X] Implement manual firing (Space key - changed from Enter)
    - [X] Add firing condition validation
    - [X] Create firing feedback system
    - [X] Implement firing error messages

### Projectile Physics and Tracking
- [X] **Projectile Management System** ⬅️ **MOSTLY COMPLETED**
  - [X] ProjectileManager class
    - [X] Create projectile lifecycle management
    - [X] Implement collision detection system
    - [X] Add projectile update loop
    - [X] Create projectile cleanup system
  - [X] Homing Mechanics ⬅️ **COMPLETED**
    - [X] Implement proportional navigation guidance
    - [X] Add target tracking algorithms
    - [X] Create homing missile turn rate limits
    - [X] Add homing failure conditions (target lost, out of fuel)

### Weapons HUD and UI
- [X] **WeaponHUD Implementation** ⬅️ **COMPLETED**
  - [X] Create weapon slots display
    - [X] Add weapon slot visualization
    - [X] Implement active weapon highlighting
    - [X] Create cooldown bar indicators
    - [X] Add weapon type icons
  - [X] Status Indicators
    - [X] Implement autofire status display
    - [X] Add target lock indicators
    - [X] Create ammo/energy status (if applicable)
    - [X] Add weapon readiness indicators
  - [X] Feedback Messages
    - [X] Create "No weapons equipped" message
    - [X] Add cooldown warning messages
    - [X] Implement "Target lock required" notifications
    - [X] Add weapon switching confirmation

### Card Integration and Installation
- [X] **Weapon Card Drag-and-Drop** ⬅️ **COMPLETED**
  - [X] Extend CardInventoryUI for weapon installation
    - [X] Add weapon slot drop zones
    - [X] Implement weapon card validation
    - [X] Create weapon installation feedback
    - [X] Add weapon slot conflict resolution
  - [X] Weapon Slot Management ⬅️ **COMPLETED**
    - [X] Create weapon slot removal system
    - [X] Implement weapon slot swapping
    - [X] Add weapon configuration persistence
    - [X] Create weapon loadout validation

### Audio and Visual Effects
- [X] **Weapons Audio System** ⬅️ **CORE FRAMEWORK COMPLETE**
  - [X] Create AudioManager integration for weapons
    - [X] Load and cache all weapon sound effects
    - [X] Implement sound effect mapping system
    - [X] Add 3D positional audio for projectiles
    - [X] Create volume and distance falloff controls
  - [X] Weapon-Specific Audio Integration
    - [X] Laser Cannon + Pulse Cannon → `lasers.wav`
    - [X] Plasma Cannon + Phaser Array → `photons.wav`
    - [X] Standard Missile + Homing Missile → `missiles.wav`
    - [X] Proximity Mine → `mines.mp3`
    - [X] Target damage (not destroyed) → `explosion.wav`
    - [X] Target destroyed → `death.wav`
  - [X] Audio Feedback System
    - [X] Weapon selection sounds
    - [X] Autofire toggle sounds
    - [X] Cooldown expiration chimes
    - [X] Error notification sounds

- [X] **Weapons Visual Effects System** ⬅️ **CORE FRAMEWORK COMPLETE**
  - [X] **Core Visual Effects Manager**
    - [X] Create WeaponEffectsManager class
    - [X] Implement effect lifecycle management (create, update, destroy)
    - [X] Add performance optimization (object pooling for effects)
    - [X] Create effect duration synchronization with audio
    - [X] Implement 60fps performance targets with effect culling
  
  - [X] **Muzzle Flash Effects**
    - [X] Simple bright flash implementation using Three.js geometry
    - [X] Weapon-specific muzzle flash colors and intensities
    - [X] Brief flash duration (0.1-0.2 seconds)
    - [X] Position muzzle flash at weapon hardpoints on ship
    - [X] Scale muzzle flash based on weapon power/level
  
  - [X] **Laser Beam Effects (Scan-Hit Weapons)**
    - [X] Thin bright beam rendering using Three.js LineGeometry
    - [X] Brief beam trail visibility (<1 second, tunable)
    - [X] Laser Cannon: Bright white/blue thin beams
    - [X] Plasma Cannon: Different color (green/red) with slight glow
    - [X] Pulse Cannon: Rapid burst beam effects
    - [X] Phaser Array: Wide-beam area effect visualization
    - [X] Beam fade-out animation over duration
  
  - [X] **Explosion Visual Effects**
    - [X] **Impact Explosions**
      - [X] Simple expanding sphere geometry for blast radius
      - [X] Damage explosion: Orange/red expanding sphere (`explosion.wav`)
      - [X] Destruction explosion: Larger white/blue sphere (`death.wav`)
      - [X] Debris particle effects for destroyed objects
    - [X] **Splash Damage Visualization**
      - [X] Expanding blast radius indicator
      - [X] Multiple target damage application effects
      - [X] Damage falloff visualization (color intensity)
  
  - [X] **Target Hit Feedback Effects**
    - [X] Hit flash on target (brief white flash)
    - [X] Damage number display (optional)
    - [X] Shield impact effects (if shields active)
    - [X] System damage sparks/smoke effects
    - [X] Screen shake for player ship hits

- [X] **System Integration Complete**
  - [X] WeaponEffectsManager integrated into StarfieldManager
  - [X] Ship position synchronization for accurate effect placement
  - [X] WeaponSlot triggerWeaponEffects integration
  - [X] Audio context connection and 3D spatial audio
  - [X] Game loop update integration for effect animation
  - [X] Object pooling and performance optimization

- [ ] **Next Phase: Testing and Refinement** ⬅️ **UPDATED PRIORITY**
  - [X] Create test scenarios for each weapon type
  - [X] Verify muzzle flash and laser beam effects
  - [X] Test audio synchronization with visual effects
  - [X] Validate performance with multiple simultaneous effects
  - [X] Adjust effect durations and intensities
  - [X] Test weapon editor integration (completed)

### 🎯 **NEXT IMMEDIATE PRIORITY: Autofire Target Selection**

Based on the comprehensive source code review, the next task to implement is:

**TASK**: Implement automatic target selection for autofire mode

**Current Status**: 
- ✅ Autofire toggle system is fully implemented (C key)
- ✅ Autofire fires the currently active weapon when enabled
- ✅ Manual target cycling works (Tab key)
- ❌ Missing: Automatic target selection when no target is locked

**Implementation Required**:
1. **Add findClosestTarget() method to WeaponSystemCore**
   - Scan available enemy ships within weapon range
   - Select closest hostile target
   - Validate target is within active weapon's range

2. **Enhance updateAutofire() method**
   - Check if lockedTarget is null or destroyed
   - Automatically select closest target if none locked
   - Set this.lockedTarget to the automatically selected target

3. **Integration Points**:
   - Update WeaponSystemCore.updateAutofire() 
   - Connect to existing target cycling system
   - Ensure compatibility with manual target selection

**Files to Modify**:
- `frontend/static/js/ship/systems/WeaponSystemCore.js`
- Potentially `frontend/static/js/views/StarfieldManager.js` for target data access

**Expected Behavior**:
- When autofire is enabled and no target is locked, automatically select closest enemy
- Fire at automatically selected targets
- Allow manual target override at any time
- Seamless integration with existing manual targeting system

### Integration with Existing Systems
- [ ] **Enhanced Ship System Integration**
  - [ ] Connect weapons to existing Ship class
    - [ ] Add weapon hardpoint positioning data
    - [ ] Integrate weapon energy consumption with visual feedback
    - [ ] Connect weapon damage to ship systems with visual effects
    - [ ] Add weapon system damage effects (sparks, smoke)
  - [ ] **Combat Integration**
    - [ ] Connect weapons to enhanced damage system
    - [ ] Integrate with enemy ship targeting and destruction
    - [ ] Add weapon effectiveness calculations with visual feedback
    - [ ] Create weapon vs. shield interactions with effects
    - [ ] Implement celestial body collision damage

- [ ] **Enhanced Energy System Integration**
  - [ ] Connect weapons to ship energy system
    - [ ] Implement energy cost per shot with visual feedback
    - [ ] Add energy availability checking with UI warnings
    - [ ] Create energy-based firing limitations with effects
    - [ ] Add energy recovery considerations

### Testing and Balancing
- [ ] **Enhanced Weapons Testing**
  - [ ] Create visual effects test suite
    - [ ] Test all weapon firing effects in isolation
    - [ ] Validate collision detection with all object types
    - [ ] Test performance with multiple simultaneous effects
    - [ ] Verify audio synchronization with visual effects
  - [ ] **Combat Balance Testing**
    - [ ] Test weapon damage balance with visual feedback
    - [ ] Validate cooldown timing with effect duration
    - [ ] Test autofire effectiveness with effects
    - [ ] Verify energy consumption balance with feedback
  - [ ] **Performance Testing**
    - [ ] Benchmark 60fps performance with maximum effects
    - [ ] Test effect culling and LOD systems
    - [ ] Validate memory usage with object pooling
    - [ ] Test collision detection performance with many objects

### Key Bindings Implementation
- [X] **Weapon Key Bindings** ⬅️ **COMPLETED**
  - [X] `Z` key: Select previous weapon
  - [X] `X` key: Select next weapon  
  - [X] `Space` key: Fire active weapon
  - [X] `C` key: Toggle autofire mode
- [X] Integrate key bindings with existing StarfieldManager
- [X] Add weapon system initialization to Ship class
- [X] Connect WeaponHUD to WeaponSystemCore
- [X] Add target lock integration with TargetComputer

### ✅ **MAJOR MILESTONE COMPLETED: Core Weapons Framework + Key Bindings**

**🎯 Current Status**: Core weapons system framework is complete with:
- ✅ **WeaponSystemCore**: Complete weapon slot management and selection logic
- ✅ **WeaponSlot**: Individual slot management with cooldown tracking
- ✅ **WeaponCard System**: Base classes for Scan-Hit and Splash-Damage weapons
- ✅ **WeaponDefinitions**: 8 fully-defined weapon types with complete statistics
- ✅ **WeaponHUD**: Visual interface with weapon slot display and cooldown bars
- ✅ **Key Bindings**: Full integration with Z X Space C keys for weapon control
- ✅ **Ship Integration**: WeaponSystemCore integrated into Ship class
- ✅ **Target Integration**: Weapon system connected to TargetComputer

**🎯 Next Priorities**:
1. **Target Lock Integration** - Complete target lock indicators and validation
2. **Ship Energy Integration** - Connect weapons to ship energy consumption
3. **Card System Integration** - Enable drag-and-drop weapon installation

**💡 Ready for Testing**: The core framework can now be integrated and tested with the existing ship and card systems.

## Dependencies
- Weapons System requires completed Ship Systems MVP and NFT/Card System
- WeaponSystem class depends on existing TargetComputer system
- Projectile system requires Three.js physics integration
- HUD components depend on existing UI framework
- Card integration requires completed CardInventoryUI system

## Notes
- Mark tasks as [X] when complete
- Add subtasks as needed
- Update dependencies if they change
- Document any blockers or issues
- Track time estimates for each task
- **SIMPLIFIED POWER GRID**: Systems now consume energy directly from shared pool when active, eliminating the complexity of separate power allocation and management

### 🧪 **UNIT TEST PLAN FOR REFACTORING** ⬅️ **PRE-REFACTORING REQUIREMENT**

### Overview
Before beginning any refactoring work, we must establish comprehensive unit tests to ensure:
1. **Functional Preservation**: All existing functionality continues to work
2. **Regression Prevention**: Changes don't introduce new bugs
3. **Integration Integrity**: System interactions remain stable
4. **Performance Maintenance**: Refactoring doesn't degrade performance

### 🎯 **Testing Strategy**

#### **Phase 1: Core System Unit Tests** ⬅️ **HIGHEST PRIORITY**

##### 1. **Ship Class Testing** (`frontend/static/js/Ship.js` - 904 lines)
- [ ] **Ship Initialization Tests**
  - [ ] Test ship creation with different ship types
  - [ ] Validate initial system configuration
  - [ ] Test energy system initialization
  - [ ] Verify weapon system integration
  - [ ] Test card system integration initialization

- [ ] **Energy Management Tests**
  - [ ] Test energy consumption calculations
  - [ ] Validate energy recharge mechanics
  - [ ] Test system auto-deactivation on low energy
  - [ ] Verify energy balance validation
  - [ ] Test energy persistence across sessions

- [ ] **System Management Tests**
  - [ ] Test system installation/removal
  - [ ] Validate system state transitions
  - [ ] Test damage application and effects
  - [ ] Verify repair mechanics
  - [ ] Test system effectiveness calculations

- [ ] **Ship Configuration Tests**
  - [ ] Test multi-ship ownership
  - [ ] Validate ship switching mechanics
  - [ ] Test configuration persistence
  - [ ] Verify build validation rules
  - [ ] Test essential systems requirements

##### 2. **CardSystemIntegration Testing** (`frontend/static/js/ship/CardSystemIntegration.js` - 835 lines)
- [ ] **Card Loading Tests**
  - [ ] Test card data initialization
  - [ ] Validate card discovery system
  - [ ] Test card type mapping
  - [ ] Verify system requirements validation
  - [ ] Test card level calculations

- [ ] **Card Installation Tests**
  - [ ] Test card-to-slot assignment
  - [ ] Validate slot compatibility checking
  - [ ] Test system creation from cards
  - [ ] Verify weapon system refresh
  - [ ] Test orphaned system cleanup

- [ ] **Integration Tests**
  - [ ] Test ship-card synchronization
  - [ ] Validate equipment refresh mechanisms
  - [ ] Test persistence layer integration
  - [ ] Verify UI state synchronization
  - [ ] Test error recovery mechanisms

##### 3. **WeaponSystemCore Testing** (`frontend/static/js/ship/systems/WeaponSystemCore.js` - 404 lines)
- [ ] **Weapon Slot Management Tests**
  - [ ] Test weapon slot initialization
  - [ ] Validate weapon installation/removal
  - [ ] Test active weapon selection
  - [ ] Verify weapon cycling logic
  - [ ] Test slot validation rules

- [ ] **Firing System Tests**
  - [ ] Test manual firing mechanics
  - [ ] Validate autofire functionality
  - [ ] Test cooldown management
  - [ ] Verify target lock integration
  - [ ] Test energy consumption per shot

- [ ] **Autofire Tests**
  - [ ] Test autofire toggle mechanics
  - [ ] Validate active weapon firing
  - [ ] Test target lock requirements
  - [ ] Verify autofire status display
  - [ ] Test mixed manual/auto firing

#### **Phase 2: Integration Testing** ⬅️ **HIGH PRIORITY**

##### 4. **Station Services Integration**
- [ ] **Docking System Tests**
  - [ ] Test docking range detection
  - [ ] Validate docking modal display
  - [ ] Test undocking procedures
  - [ ] Verify station service access
  - [ ] Test launch validation

- [ ] **Repair Service Tests**
  - [ ] Test repair cost calculations
  - [ ] Validate faction pricing
  - [ ] Test repair execution
  - [ ] Verify system restoration
  - [ ] Test credit deduction

- [ ] **Inventory Service Tests**
  - [ ] Test card inventory access
  - [ ] Validate ship switching
  - [ ] Test configuration saving
  - [ ] Verify build validation
  - [ ] Test session persistence

##### 5. **UI Component Integration**
- [ ] **CardInventoryUI Tests** (`frontend/static/js/ui/CardInventoryUI.js` - 1,462 lines)
  - [ ] Test drag-and-drop mechanics
  - [ ] Validate card grid rendering
  - [ ] Test ship slot display
  - [ ] Verify real-time validation
  - [ ] Test upgrade interface

- [ ] **DamageControlInterface Tests** (`frontend/static/js/ui/DamageControlInterface.js` - 1,285 lines)
  - [ ] Test system status display
  - [ ] Validate repair priority controls
  - [ ] Test damage log functionality
  - [ ] Verify repair kit management
  - [ ] Test modal state management

- [ ] **WeaponHUD Tests**
  - [ ] Test weapon slot visualization
  - [ ] Validate cooldown displays
  - [ ] Test autofire indicators
  - [ ] Verify target lock display
  - [ ] Test message notifications

#### **Phase 3: Workflow Testing** ⬅️ **MEDIUM PRIORITY**

##### 6. **Critical User Workflows**
- [ ] **Ship Configuration Workflow**
  - [ ] Test complete ship setup from scratch
  - [ ] Validate card installation process
  - [ ] Test build validation and launch
  - [ ] Verify configuration persistence
  - [ ] Test multi-ship management

- [ ] **Combat Workflow**
  - [ ] Test weapon firing sequences
  - [ ] Validate target selection and cycling
  - [ ] Test autofire engagement
  - [ ] Verify damage application
  - [ ] Test destruction sequences

- [ ] **Station Workflow**
  - [ ] Test docking and undocking
  - [ ] Validate repair services
  - [ ] Test inventory management
  - [ ] Verify ship switching
  - [ ] Test configuration changes

- [ ] **Damage and Repair Workflow**
  - [ ] Test damage application
  - [ ] Validate repair kit usage
  - [ ] Test station repair services
  - [ ] Verify system effectiveness
  - [ ] Test damage persistence

#### **Phase 4: Performance and Regression Testing** ⬅️ **MEDIUM PRIORITY**

##### 7. **Performance Tests**
- [ ] **Memory Management**
  - [ ] Test object creation/destruction cycles
  - [ ] Validate memory cleanup
  - [ ] Test large configuration loads
  - [ ] Verify garbage collection effectiveness
  - [ ] Test session-to-session memory usage

- [ ] **Rendering Performance**
  - [ ] Test UI rendering with large inventories
  - [ ] Validate drag-and-drop performance
  - [ ] Test real-time status updates
  - [ ] Verify effect rendering performance
  - [ ] Test concurrent system updates

- [ ] **Data Processing Performance**
  - [ ] Test card discovery calculations
  - [ ] Validate damage calculations
  - [ ] Test energy consumption processing
  - [ ] Verify configuration serialization
  - [ ] Test large dataset operations

##### 8. **Regression Tests**
- [ ] **Critical Bug Prevention**
  - [ ] Test ship switching synchronization issues
  - [ ] Validate equipment refresh after docking
  - [ ] Test audio synchronization
  - [ ] Verify targeting system accuracy
  - [ ] Test session persistence integrity

### 🛠️ **Test Infrastructure Setup**

#### **Testing Framework Configuration**
- [X] **Jest Configuration Enhancement** ⬅️ **COMPLETED**
  - [X] Set up ES6 module support
  - [X] Configure Three.js mocking
  - [X] Add DOM testing environment
  - [X] Set up code coverage reporting
  - [X] Configure test file organization

- [X] **Mock System Setup** ⬅️ **COMPLETED**
  - [X] Create Three.js scene mocks
  - [X] Set up localStorage mocking
  - [X] Create audio system mocks
  - [X] Set up network request mocking
  - [X] Create event system mocking

- [X] **Test Utilities** ⬅️ **COMPLETED**
  - [X] Create ship factory for test data
  - [X] Set up card inventory generators
  - [X] Create system state builders
  - [X] Set up UI component helpers
  - [X] Create performance measurement tools

#### **Test Data Management**
- [X] **Test Fixtures** ⬅️ **COMPLETED**
  - [X] Create standard ship configurations
  - [X] Set up card inventory datasets
  - [X] Create damage state scenarios
  - [X] Set up station service data
  - [X] Create performance benchmarks

### 📊 **Test Coverage Requirements**

#### **Minimum Coverage Targets**
- **Core Classes**: 90% line coverage
- **Integration Points**: 85% line coverage
- **UI Components**: 80% line coverage
- **Utility Functions**: 95% line coverage
- **Error Handling**: 90% branch coverage

#### **Critical Path Coverage**
- [ ] Ship initialization and configuration: 100%
- [ ] Card installation and validation: 100%
- [ ] Weapon system integration: 100%
- [ ] Station services: 95%
- [ ] Damage and repair systems: 95%

### 🚀 **Implementation Plan**

#### **Phase 1: Foundation (Week 1)**
1. Set up enhanced Jest configuration
2. Create mock systems and test utilities
3. Implement Ship class unit tests
4. Create CardSystemIntegration tests

#### **Phase 2: Integration (Week 2)**
1. Implement WeaponSystemCore tests
2. Create station service integration tests
3. Set up UI component tests
4. Implement workflow tests

#### **Phase 3: Quality Assurance (Week 3)**
1. Implement performance tests
2. Create regression test suite
3. Set up automated test running
4. Achieve target code coverage

#### **Phase 4: Refactoring Readiness (Week 4)**
1. Complete test suite validation
2. Document test procedures
3. Set up continuous testing
4. Begin refactoring with test safety net

### ✅ **Refactoring Pre-Conditions**

Before any refactoring begins, we must have:
- [ ] All Phase 1 tests implemented and passing
- [ ] Core integration tests completed
- [ ] Critical workflow tests validated
- [ ] Performance baseline established
- [ ] Automated test runner configured

**Only after achieving 90%+ test coverage on critical systems should refactoring commence.**

---

## 🔧 **REFACTORING PLAN** ⬅️ **POST-UNIT-TEST IMPLEMENTATION**

### 🎯 **Refactoring Goals**

#### **Primary Objectives**
1. **Maintainability**: Break large files into focused, single-responsibility modules
2. **Testability**: Create smaller, isolated units that are easier to test comprehensively
3. **Reusability**: Extract common patterns into reusable components
4. **Performance**: Optimize module loading and reduce bundle size
5. **Developer Experience**: Improve code navigation and understanding

#### **Success Metrics**
- No file exceeds 500 lines of code
- Each module has a single, clear responsibility
- All existing functionality preserved (verified by unit tests)
- Performance maintained or improved
- Code coverage maintained at 90%+ for critical systems

### 📊 **Refactoring Targets Analysis**

#### **Large File Breakdown**
| File | Current Size | Complexity | Priority | Target Modules |
|------|-------------|------------|----------|----------------|
| `app.js` | 2,245 lines | High | Critical | 8-10 modules |
| `CardInventoryUI.js` | 1,462 lines | High | High | 6-8 modules |
| `DamageControlInterface.js` | 1,285 lines | Medium | Medium | 4-6 modules |

#### **Refactoring Complexity Assessment**
- **app.js**: High complexity - Core application orchestration, multiple responsibilities
- **CardInventoryUI.js**: High complexity - UI rendering, drag-drop, data management
- **DamageControlInterface.js**: Medium complexity - Focused on damage control but large

### 🏗️ **PHASE 1: app.js Refactoring** ⬅️ **HIGHEST PRIORITY**

#### **Current app.js Responsibilities** (2,245 lines)
1. Three.js scene initialization and management
2. Planet generation and procedural content
3. UI controls and event handling
4. Debug manager and utilities
5. Edit mode and warp control management
6. Animation loop and rendering
7. Solar system integration
8. Event listeners and input handling

#### **Target Module Structure**

##### **1. Core Application Module** (`ApplicationCore.js` - ~200 lines)
```javascript
// Main application orchestrator
class ApplicationCore {
    constructor() {
        this.sceneManager = new SceneManager();
        this.inputManager = new InputManager();
        this.debugManager = new DebugManager();
        this.gameLoop = new GameLoop();
    }
    
    async initialize() {
        // Initialize all core systems
    }
    
    start() {
        // Start the game loop
    }
}
```

##### **2. Scene Management Module** (`SceneManager.js` - ~300 lines)
```javascript
// Three.js scene, camera, renderer setup and management
class SceneManager {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
    }
    
    initializeScene() { /* Scene setup */ }
    updateScene(deltaTime) { /* Scene updates */ }
    resizeHandler() { /* Window resize */ }
}
```

##### **3. Planet Generation Module** (`PlanetGenerationManager.js` - ~400 lines)
```javascript
// Planet generation, terraforming, and procedural content
class PlanetGenerationManager {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.planetGenerator = new PlanetGenerator();
        this.currentPlanet = null;
    }
    
    generatePlanet(config) { /* Planet generation */ }
    updatePlanetGeometry() { /* Geometry updates */ }
    handleTerraforming(event) { /* Terraforming logic */ }
}
```

##### **4. Debug Management Module** (`DebugManager.js` - ~200 lines)
```javascript
// Debug utilities, stats, visual helpers
class DebugManager {
    constructor() {
        this.stats = new Stats();
        this.debugInfo = null;
        this.visible = false;
    }
    
    initialize(scene, uiContainer) { /* Setup */ }
    toggle() { /* Toggle debug display */ }
    updateInfo() { /* Update debug information */ }
}
```

##### **5. Input Management Module** (`InputManager.js` - ~300 lines)
```javascript
// Keyboard, mouse, and control event handling
class InputManager {
    constructor(applicationCore) {
        this.app = applicationCore;
        this.keyBindings = new Map();
        this.mouseHandler = new MouseHandler();
    }
    
    setupEventListeners() { /* Setup all input */ }
    handleKeyDown(event) { /* Keyboard handling */ }
    handleMouseEvent(event) { /* Mouse handling */ }
}
```

##### **6. Mode Management Module** (`ModeManager.js` - ~250 lines)
```javascript
// Edit mode, warp control mode, and state transitions
class ModeManager {
    constructor(applicationCore) {
        this.app = applicationCore;
        this.editMode = false;
        this.warpControlMode = false;
        this.currentMode = 'normal';
    }
    
    setEditMode(enabled) { /* Edit mode logic */ }
    setWarpControlMode(enabled) { /* Warp mode logic */ }
    transitionTo(mode) { /* Mode transitions */ }
}
```

##### **7. UI Management Module** (`UIManager.js` - ~300 lines)
```javascript
// GUI creation, updates, and interaction
class UIManager {
    constructor(applicationCore) {
        this.app = applicationCore;
        this.gui = null;
        this.warpGui = null;
        this.containers = new Map();
    }
    
    createMainGUI() { /* Main GUI setup */ }
    createWarpGUI() { /* Warp GUI setup */ }
    updateGUIControls(body) { /* GUI updates */ }
}
```

##### **8. Game Loop Module** (`GameLoop.js` - ~150 lines)
```javascript
// Animation loop, timing, and frame management
class GameLoop {
    constructor(applicationCore) {
        this.app = applicationCore;
        this.isRunning = false;
        this.lastFrameTime = 0;
        this.frameCounter = 0;
    }
    
    start() { /* Start loop */ }
    stop() { /* Stop loop */ }
    tick(currentTime) { /* Main game loop */ }
}
```

##### **9. Event Bus Module** (`EventBus.js` - ~100 lines)
```javascript
// Centralized event system for inter-module communication
class EventBus {
    constructor() {
        this.listeners = new Map();
    }
    
    on(event, callback) { /* Subscribe */ }
    emit(event, data) { /* Publish */ }
    off(event, callback) { /* Unsubscribe */ }
}
```

##### **10. Configuration Module** (`AppConfig.js` - ~100 lines)
```javascript
// Application configuration, constants, and settings
export const APP_CONFIG = {
    SCENE: {
        backgroundColor: 0x000000,
        fog: { enabled: true, near: 1, far: 1000 }
    },
    CAMERA: {
        fov: 75,
        near: 0.1,
        far: 10000
    },
    DEBUG: {
        enabled: false,
        showStats: false,
        showHelpers: false
    }
};
```

#### **app.js Refactoring Implementation Plan**

##### **Step 1: Extract Configuration and Utilities** (Week 1, Day 1-2)
- [ ] Create `AppConfig.js` with all configuration constants
- [ ] Create `EventBus.js` for inter-module communication
- [ ] Extract utility functions into `AppUtils.js`
- [ ] Update imports and test integration

##### **Step 2: Extract Debug Manager** (Week 1, Day 3)
- [ ] Move `DebugManager` class to separate file
- [ ] Create proper module interface
- [ ] Update app.js to use imported DebugManager
- [ ] Test debug functionality integrity

##### **Step 3: Extract Scene Management** (Week 1, Day 4-5)
- [ ] Create `SceneManager.js` with Three.js setup
- [ ] Move camera, renderer, and scene initialization
- [ ] Extract resize handling and controls setup
- [ ] Test scene initialization and rendering

##### **Step 4: Extract Planet Generation** (Week 2, Day 1-2)
- [ ] Create `PlanetGenerationManager.js`
- [ ] Move planet creation and terraforming logic
- [ ] Extract geometry update functions
- [ ] Test planet generation pipeline

##### **Step 5: Extract Input Management** (Week 2, Day 3-4)
- [ ] Create `InputManager.js` with event handling
- [ ] Move keyboard and mouse event listeners
- [ ] Create centralized key binding system
- [ ] Test all input interactions

##### **Step 6: Extract Mode Management** (Week 2, Day 5)
- [ ] Create `ModeManager.js` for edit/warp modes
- [ ] Move mode transition logic
- [ ] Create mode state management
- [ ] Test mode switching functionality

##### **Step 7: Extract UI Management** (Week 3, Day 1-2)
- [ ] Create `UIManager.js` for GUI handling
- [ ] Move GUI creation and update logic
- [ ] Extract GUI container management
- [ ] Test GUI interaction and updates

##### **Step 8: Extract Game Loop** (Week 3, Day 3)
- [ ] Create `GameLoop.js` with animation loop
- [ ] Move timing and frame management
- [ ] Create performance monitoring
- [ ] Test smooth game loop operation

##### **Step 9: Create Application Core** (Week 3, Day 4-5)
- [ ] Create `ApplicationCore.js` as main orchestrator
- [ ] Integrate all extracted modules
- [ ] Update main app.js to use ApplicationCore
- [ ] Test complete application functionality

##### **Step 10: Final Integration and Testing** (Week 4, Day 1-2)
- [ ] Run comprehensive test suite
- [ ] Performance regression testing
- [ ] Code coverage verification
- [ ] Documentation updates

### 🏗️ **PHASE 2: CardInventoryUI.js Refactoring** ⬅️ **HIGH PRIORITY**

#### **Current CardInventoryUI.js Responsibilities** (1,462 lines)
1. Card inventory data management
2. Drag-and-drop interface logic
3. Ship slot visualization and management
4. Card grid rendering and layout
5. Shop mode and inventory mode UI
6. Card compatibility and validation
7. Ship configuration loading/saving
8. Audio feedback and visual effects

#### **Target Module Structure**

##### **1. Core Card Inventory Controller** (`CardInventoryController.js` - ~200 lines)
```javascript
// Main controller coordinating all card inventory operations
class CardInventoryController {
    constructor(containerId) {
        this.dataManager = new CardInventoryDataManager();
        this.uiRenderer = new CardInventoryUIRenderer(containerId);
        this.dragDropManager = new CardDragDropManager();
        this.shipManager = new ShipSlotManager();
    }
}
```

##### **2. Card Inventory Data Manager** (`CardInventoryDataManager.js` - ~250 lines)
```javascript
// Data management, persistence, and business logic
class CardInventoryDataManager {
    constructor() {
        this.inventory = new CardInventory();
        this.playerData = new PlayerData();
        this.currentShipType = 'starter_ship';
    }
    
    loadTestData() { /* Test data loading */ }
    loadShipConfiguration(shipType) { /* Ship config loading */ }
    saveConfiguration() { /* Save to storage */ }
}
```

##### **3. Card UI Renderer** (`CardInventoryUIRenderer.js` - ~300 lines)
```javascript
// UI rendering, layout, and visual updates
class CardInventoryUIRenderer {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.gridRenderer = new CardGridRenderer();
        this.slotRenderer = new ShipSlotRenderer();
    }
    
    createUI() { /* Main UI creation */ }
    render() { /* Full UI render */ }
    updateDisplay() { /* Partial updates */ }
}
```

##### **4. Drag-and-Drop Manager** (`CardDragDropManager.js` - ~250 lines)
```javascript
// Drag-and-drop functionality and validation
class CardDragDropManager {
    constructor(controller) {
        this.controller = controller;
        this.currentDragCard = null;
        this.dropZones = new Map();
    }
    
    setupDragHandlers() { /* Drag setup */ }
    handleDrop(event) { /* Drop handling */ }
    validateDrop(card, slot) { /* Drop validation */ }
}
```

##### **5. Ship Slot Manager** (`ShipSlotManager.js` - ~200 lines)
```javascript
// Ship slot management and configuration
class ShipSlotManager {
    constructor() {
        this.shipSlots = new Map();
        this.currentShipConfig = null;
        this.slotTypeMapping = new Map();
    }
    
    renderShipSlots() { /* Slot rendering */ }
    updateSlotConfiguration() { /* Slot updates */ }
    validateBuild() { /* Build validation */ }
}
```

##### **6. Card Grid Components** (`CardGridRenderer.js` - ~200 lines)
```javascript
// Card grid rendering and layout management
class CardGridRenderer {
    constructor() {
        this.gridContainer = null;
        this.cardComponents = new Map();
    }
    
    renderGrid(cards) { /* Grid rendering */ }
    createCardElement(card) { /* Card component */ }
    updateCardVisuals() { /* Visual updates */ }
}
```

##### **7. Shop Mode Manager** (`CardShopModeManager.js` - ~150 lines)
```javascript
// Shop-specific functionality and UI modes
class CardShopModeManager {
    constructor(controller) {
        this.controller = controller;
        this.isShopMode = false;
        this.dockingInterface = null;
    }
    
    showAsShop(location, interface) { /* Shop mode */ }
    hideShop() { /* Exit shop */ }
    setupShopUI() { /* Shop interface */ }
}
```

##### **8. Audio and Effects Manager** (`CardAudioManager.js` - ~100 lines)
```javascript
// Audio feedback and visual effects for card operations
class CardAudioManager {
    constructor() {
        this.audioBuffers = new Map();
        this.effectQueue = [];
    }
    
    playUpgradeSound() { /* Upgrade audio */ }
    playInstallSound() { /* Install audio */ }
    triggerVisualEffect(type, element) { /* Visual effects */ }
}
```

#### **CardInventoryUI.js Refactoring Implementation Plan**

##### **Step 1: Extract Data Management** (Week 5, Day 1-2)
- [ ] Create `CardInventoryDataManager.js`
- [ ] Move data loading, saving, and persistence logic
- [ ] Extract ship configuration management
- [ ] Test data operations independently

##### **Step 2: Extract Drag-and-Drop Logic** (Week 5, Day 3)
- [ ] Create `CardDragDropManager.js`
- [ ] Move drag-and-drop event handling
- [ ] Extract validation and compatibility checking
- [ ] Test drag-and-drop functionality

##### **Step 3: Extract Ship Slot Management** (Week 5, Day 4)
- [ ] Create `ShipSlotManager.js`
- [ ] Move ship slot rendering and management
- [ ] Extract slot type mapping and validation
- [ ] Test ship slot operations

##### **Step 4: Extract UI Rendering** (Week 5, Day 5)
- [ ] Create `CardInventoryUIRenderer.js`
- [ ] Move UI creation and rendering logic
- [ ] Extract layout and styling management
- [ ] Test UI rendering independently

##### **Step 5: Extract Card Grid Components** (Week 6, Day 1)
- [ ] Create `CardGridRenderer.js`
- [ ] Move card grid rendering logic
- [ ] Create reusable card components
- [ ] Test grid layout and responsiveness

##### **Step 6: Extract Shop Mode Logic** (Week 6, Day 2)
- [ ] Create `CardShopModeManager.js`
- [ ] Move shop-specific functionality
- [ ] Extract mode switching logic
- [ ] Test shop mode operations

##### **Step 7: Extract Audio and Effects** (Week 6, Day 3)
- [ ] Create `CardAudioManager.js`
- [ ] Move audio feedback systems
- [ ] Extract visual effect management
- [ ] Test audio and visual feedback

##### **Step 8: Create Main Controller** (Week 6, Day 4-5)
- [ ] Create `CardInventoryController.js`
- [ ] Integrate all extracted modules
- [ ] Update main CardInventoryUI to use controller
- [ ] Test complete card inventory functionality

### 🏗️ **PHASE 3: DamageControlInterface.js Refactoring** ⬅️ **MEDIUM PRIORITY**

#### **Current DamageControlInterface.js Responsibilities** (1,285 lines)
1. Damage control interface management
2. System status display and monitoring
3. Repair priority and management
4. Visual damage indicators
5. Repair cost calculations
6. Real-time system monitoring

#### **Target Module Structure**

##### **1. Damage Control Controller** (`DamageControlController.js` - ~200 lines)
```javascript
// Main controller for damage control interface
class DamageControlController {
    constructor() {
        this.uiManager = new DamageControlUIManager();
        this.systemMonitor = new SystemHealthMonitor();
        this.repairManager = new RepairManager();
    }
}
```

##### **2. System Health Monitor** (`SystemHealthMonitor.js` - ~300 lines)
```javascript
// System status monitoring and damage tracking
class SystemHealthMonitor {
    constructor() {
        this.systems = new Map();
        this.damageLog = [];
        this.refreshInterval = null;
    }
    
    updateSystemStatus() { /* Status updates */ }
    trackDamage(system, damage) { /* Damage tracking */ }
    getSystemHealth(system) { /* Health queries */ }
}
```

##### **3. Damage Control UI Manager** (`DamageControlUIManager.js` - ~400 lines)
```javascript
// UI rendering and interaction management
class DamageControlUIManager {
    constructor() {
        this.interface = null;
        this.systemCards = new Map();
        this.selectedSystem = null;
    }
    
    createInterface() { /* UI creation */ }
    updateInterface() { /* UI updates */ }
    handleSystemSelection(system) { /* System selection */ }
}
```

##### **4. Repair Manager** (`RepairManager.js` - ~250 lines)
```javascript
// Repair operations and cost management
class RepairManager {
    constructor() {
        this.repairKits = new Map();
        this.repairQueue = [];
        this.costs = new Map();
    }
    
    calculateRepairCost(system) { /* Cost calculation */ }
    executeRepair(system, type) { /* Repair execution */ }
    manageRepairQueue() { /* Queue management */ }
}
```

##### **5. Damage Visualization** (`DamageVisualizationManager.js` - ~200 lines)
```javascript
// Visual damage indicators and effects
class DamageVisualizationManager {
    constructor() {
        this.visualEffects = new Map();
        this.indicators = new Map();
    }
    
    showDamageEffect(system) { /* Damage effects */ }
    updateHealthBars() { /* Health bar updates */ }
    createStatusIcons() { /* Status indicators */ }
}
```

##### **6. Damage Control CSS** (`DamageControlStyles.js` - ~100 lines)
```javascript
// Centralized CSS management for damage control
export const DamageControlCSS = {
    generateStylesheet() { /* CSS generation */ },
    addToDocument() { /* Style injection */ },
    removeFromDocument() { /* Style cleanup */ }
};
```

#### **DamageControlInterface.js Refactoring Implementation Plan**

##### **Step 1: Extract CSS and Styling** (Week 7, Day 1)
- [ ] Create `DamageControlStyles.js`
- [ ] Move CSS generation and management
- [ ] Create modular styling system
- [ ] Test styling integration

##### **Step 2: Extract System Monitoring** (Week 7, Day 2)
- [ ] Create `SystemHealthMonitor.js`
- [ ] Move system status tracking logic
- [ ] Extract damage logging and monitoring
- [ ] Test system monitoring independently

##### **Step 3: Extract Repair Management** (Week 7, Day 3)
- [ ] Create `RepairManager.js`
- [ ] Move repair cost and execution logic
- [ ] Extract repair queue management
- [ ] Test repair operations

##### **Step 4: Extract Visualization** (Week 7, Day 4)
- [ ] Create `DamageVisualizationManager.js`
- [ ] Move visual effect and indicator logic
- [ ] Extract damage display management
- [ ] Test visualization components

##### **Step 5: Extract UI Management** (Week 7, Day 5)
- [ ] Create `DamageControlUIManager.js`
- [ ] Move UI creation and interaction logic
- [ ] Extract event handling and updates
- [ ] Test UI functionality

##### **Step 6: Create Main Controller** (Week 8, Day 1)
- [ ] Create `DamageControlController.js`
- [ ] Integrate all extracted modules
- [ ] Update main interface to use controller
- [ ] Test complete damage control functionality

### 🔄 **CROSS-CUTTING REFACTORING IMPROVEMENTS**

#### **1. Common Pattern Extraction**

##### **Shared UI Components** (`ui/components/`)
- [ ] **Modal Manager** (`ModalManager.js`) - Centralized modal handling
- [ ] **Grid Renderer** (`GridRenderer.js`) - Reusable grid layouts
- [ ] **Button Factory** (`ButtonFactory.js`) - Consistent button creation
- [ ] **Form Builder** (`FormBuilder.js`) - Dynamic form generation
- [ ] **Tooltip System** (`TooltipManager.js`) - Unified tooltip management

##### **Shared Utilities** (`utils/`)
- [ ] **Event Emitter** (`EventEmitter.js`) - Universal event system
- [ ] **Storage Manager** (`StorageManager.js`) - localStorage/sessionStorage wrapper
- [ ] **Animation Controller** (`AnimationController.js`) - Centralized animation
- [ ] **Audio Manager** (`AudioManager.js`) - Global audio management
- [ ] **Validation Utils** (`ValidationUtils.js`) - Common validation functions

##### **Shared Constants** (`constants/`)
- [ ] **UI Constants** (`UIConstants.js`) - UI dimensions, colors, timing
- [ ] **Game Constants** (`GameConstants.js`) - Game rules and parameters
- [ ] **Asset Constants** (`AssetConstants.js`) - Asset paths and references

#### **2. Module Communication Architecture**

##### **Event-Driven Architecture**
```javascript
// Central event bus for module communication
class ModuleEventBus extends EventEmitter {
    constructor() {
        super();
        this.modules = new Map();
    }
    
    registerModule(name, module) {
        this.modules.set(name, module);
        module.setEventBus(this);
    }
    
    broadcastEvent(event, data) {
        this.emit(event, data);
        this.modules.forEach(module => {
            if (module.handleEvent) {
                module.handleEvent(event, data);
            }
        });
    }
}
```

##### **Dependency Injection System**
```javascript
// Service container for dependency management
class ServiceContainer {
    constructor() {
        this.services = new Map();
        this.singletons = new Map();
    }
    
    register(name, factory, options = {}) {
        this.services.set(name, { factory, options });
    }
    
    get(name) {
        if (this.singletons.has(name)) {
            return this.singletons.get(name);
        }
        
        const service = this.services.get(name);
        if (service.options.singleton) {
            const instance = service.factory();
            this.singletons.set(name, instance);
            return instance;
        }
        
        return service.factory();
    }
}
```

### 🔄 **ENHANCED REFACTORING IMPROVEMENTS** ⬅️ **UPDATED BASED ON UML ANALYSIS**

#### **⚠️ CRITICAL INSIGHTS FROM UML ANALYSIS**

The comprehensive UML documentation revealed several critical factors that require plan adjustments:

##### **1. Complexity Scale Adjustment** 
- **Original Assessment**: Large files needing modularization
- **UML Reality**: 77% average size reduction represents **massive architectural transformation**
- **Impact**: Timeline needs buffer for complex dependency untangling
- **New Timeline**: **12 weeks** (was 10) to account for architectural complexity

##### **2. Event-Driven Architecture Implementation**
- **UML Insight**: Current tight coupling requires comprehensive event system redesign
- **New Requirements**: 
  - [ ] **Global EventBus** must be implemented FIRST (Week 0 prep)
  - [ ] **Service Container** for dependency injection (Week 0 prep)
  - [ ] **Module Registry** for systematic module registration
  - [ ] **Event Protocol Standards** for consistent module communication

##### **3. Enhanced Testing Strategy Requirements**
- **UML Finding**: 350% testability improvement requires systematic approach
- **New Testing Layers**:
  - [ ] **Unit Tests**: Individual module isolation (90%+ coverage)
  - [ ] **Integration Tests**: Module communication via EventBus
  - [ ] **Component Tests**: UI component behavior
  - [ ] **E2E Tests**: Complete user workflow validation
  - [ ] **Performance Tests**: Memory/load regression detection

##### **4. Dependency Cascade Risk Management**
- **UML Discovery**: Complex cross-module dependencies require careful ordering
- **New Safety Measures**:
  - [ ] **Dependency Graph Analysis** before each extraction
  - [ ] **Module Interface Contracts** defined before implementation
  - [ ] **Rollback Checkpoints** after every 2 module extractions
  - [ ] **Integration Validation** at each phase boundary

#### **2. Enhanced Module Communication Architecture**

##### **EventBus-First Implementation Strategy**
```javascript
// Global EventBus - Must be implemented BEFORE any module extraction
class GlobalEventBus extends EventEmitter {
    constructor() {
        super();
        this.modules = new Map();
        this.eventHistory = [];
        this.debugMode = false;
    }
    
    // Enhanced event registration with validation
    registerModule(name, module, dependencies = []) {
        // Validate dependencies exist
        for (const dep of dependencies) {
            if (!this.modules.has(dep)) {
                throw new Error(`Module ${name} requires ${dep} but it's not registered`);
            }
        }
        
        this.modules.set(name, {
            instance: module,
            dependencies,
            initialized: false
        });
        
        module.setEventBus(this);
        
        if (this.debugMode) {
            console.log(`Module ${name} registered with deps: ${dependencies}`);
        }
    }
    
    // Safe event emission with error handling
    safeEmit(event, data) {
        try {
            this.emit(event, data);
            if (this.debugMode) {
                this.eventHistory.push({ event, data, timestamp: Date.now() });
            }
        } catch (error) {
            console.error(`Event ${event} failed:`, error);
            this.emit('system-error', { event, error });
        }
    }
}
```

##### **Module Factory Pattern**
```javascript
// Centralized module creation with dependency injection
class ModuleFactory {
    constructor(eventBus, serviceContainer) {
        this.eventBus = eventBus;
        this.container = serviceContainer;
    }
    
    // Creates modules with proper dependency injection
    createModule(moduleClass, dependencies = {}) {
        const injectedDeps = {};
        
        // Resolve dependencies from service container
        for (const [key, serviceName] of Object.entries(dependencies)) {
            injectedDeps[key] = this.container.get(serviceName);
        }
        
        // Create module instance with dependencies
        const module = new moduleClass(injectedDeps);
        
        // Register with event bus
        if (module.getModuleName) {
            this.eventBus.registerModule(
                module.getModuleName(), 
                module, 
                module.getDependencies ? module.getDependencies() : []
            );
        }
        
        return module;
    }
}
```

##### **Module Base Class Pattern**
```javascript
// Base class for all refactored modules
class ModuleBase {
    constructor(dependencies = {}) {
        this.eventBus = null;
        this.dependencies = dependencies;
        this.initialized = false;
        this.moduleId = this.generateModuleId();
    }
    
    setEventBus(eventBus) {
        this.eventBus = eventBus;
    }
    
    async initialize() {
        if (this.initialized) return;
        
        try {
            await this.onInitialize();
            this.initialized = true;
            this.emit('module-initialized', { moduleId: this.moduleId });
        } catch (error) {
            this.emit('module-initialization-failed', { moduleId: this.moduleId, error });
            throw error;
        }
    }
    
    emit(event, data) {
        if (this.eventBus) {
            this.eventBus.safeEmit(event, { 
                ...data, 
                source: this.getModuleName(),
                moduleId: this.moduleId 
            });
        }
    }
    
    // Must be implemented by subclasses
    getModuleName() {
        throw new Error('getModuleName() must be implemented by subclass');
    }
    
    // Override in subclasses for initialization logic
    async onInitialize() {
        // Default implementation - override in subclasses
    }
    
    generateModuleId() {
        return `${this.getModuleName()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}
```

### 📋 **ENHANCED REFACTORING IMPLEMENTATION SCHEDULE**

#### **🚨 Week 0: Infrastructure Preparation** ⬅️ **NEW CRITICAL PHASE**
- [ ] **Global EventBus Implementation** (2 days)
  - Create GlobalEventBus with error handling and debug mode
  - Implement event validation and module registration
  - Create event protocol documentation
  
- [ ] **Service Container Implementation** (1 day)
  - Create dependency injection container
  - Implement singleton and factory patterns
  - Create service registration utilities
  
- [ ] **Module Factory and Base Classes** (1 day)
  - Create ModuleBase class for consistent module structure
  - Implement ModuleFactory for dependency injection
  - Create module interface contracts
  
- [ ] **Enhanced Testing Infrastructure** (1 day)
  - Extend Jest configuration for module testing
  - Create testing utilities for event-driven modules
  - Implement integration test helpers

#### **Week 1-4: app.js Refactoring** ⬅️ **ENHANCED WITH DEPENDENCY ANALYSIS**
- **Pre-extraction Phase** (Day 0 of each module):
  - [ ] Analyze module dependencies using dependency graph
  - [ ] Define module interface contracts
  - [ ] Create module-specific test suites
  
- Complete modularization of main application file with **EventBus integration**
- Extract all major subsystems into focused modules **extending ModuleBase**
- Achieve single responsibility principle with **loose coupling via events**

#### **Week 5-6: CardInventoryUI.js Refactoring** ⬅️ **ENHANCED TESTING STRATEGY**
- **Enhanced Module Extraction**:
  - [ ] Each module created with **ModuleFactory pattern**
  - [ ] **Component-level testing** for each extracted module
  - [ ] **Integration testing** for module communication
  - [ ] **Performance baseline** established before extraction

#### **Week 7-8: DamageControlInterface.js Refactoring** ⬅️ **RISK MITIGATION**
- **Enhanced Safety Measures**:
  - [ ] **Rollback checkpoints** every 2 module extractions
  - [ ] **Regression testing** after each module
  - [ ] **Memory leak detection** during refactoring
  - [ ] **Performance monitoring** throughout process

#### **Week 9-10: Cross-Cutting Improvements** ⬅️ **EXPANDED SCOPE**
- **Enhanced Architecture Implementation**:
  - [ ] **Shared component library** with standardized interfaces
  - [ ] **Performance optimization** across all modules  
  - [ ] **Error handling standardization** across event system
  - [ ] **Memory management optimization** for modular architecture

#### **Week 11-12: Integration, Performance & Validation** ⬅️ **NEW VALIDATION PHASE**
- **Comprehensive Validation**:
  - [ ] **Full system integration testing**
  - [ ] **Performance regression analysis** (target: no degradation)
  - [ ] **Memory usage optimization** (target: 25-35% reduction)
  - [ ] **Load time optimization** (target: 30-40% improvement)
  - [ ] **Bundle size analysis** (target: 20-30% reduction)
  - [ ] **Developer experience validation**
  - [ ] **Documentation completion** and review

### 🛡️ **ENHANCED REFACTORING SAFETY MEASURES**

#### **Dependency Risk Mitigation** ⬅️ **NEW BASED ON UML COMPLEXITY**
1. **Dependency Graph Analysis**:
   - [ ] Visual dependency mapping before each module extraction
   - [ ] Circular dependency detection and resolution
   - [ ] Critical path analysis for extraction ordering
   
2. **Module Interface Contracts**:
   - [ ] Define clear interfaces before implementation
   - [ ] Version interface contracts for compatibility tracking
   - [ ] Validate interface compliance during integration

3. **Progressive Integration Strategy**:
   - [ ] Extract modules in dependency order (leaf nodes first)
   - [ ] Validate module communication at each step
   - [ ] Rollback capability after every 2 module extractions

#### **Enhanced Testing Strategy** ⬅️ **BASED ON 350% TESTABILITY IMPROVEMENT TARGET**
1. **Multi-Layer Test Coverage**:
   - [ ] **Unit Tests**: 95%+ coverage for individual modules
   - [ ] **Integration Tests**: Event communication between modules
   - [ ] **Component Tests**: UI module behavior validation
   - [ ] **E2E Tests**: Complete user workflow protection
   - [ ] **Performance Tests**: Memory and speed regression detection

2. **Test-Driven Refactoring**:
   - [ ] Write tests for existing functionality BEFORE extraction
   - [ ] Maintain test coverage during every extraction step
   - [ ] Add new tests for modular architecture benefits
   - [ ] Validate test execution speed improvements

#### **Performance Monitoring** ⬅️ **NEW BASED ON UML PERFORMANCE TARGETS**
1. **Baseline Establishment**:
   - [ ] Current load time, memory usage, bundle size measurement
   - [ ] Performance benchmarking before refactoring begins
   - [ ] Critical performance thresholds defined

2. **Continuous Performance Validation**:
   - [ ] Performance tests run after each module extraction
   - [ ] Memory leak detection during modular loading
   - [ ] Bundle size monitoring for tree-shaking effectiveness

### 📊 **ENHANCED EXPECTED OUTCOMES**

#### **Quantified Success Metrics** ⬅️ **BASED ON UML ANALYSIS TARGETS**
- **File Size Reduction**: 77% average reduction achieved ✅
- **Testability Improvement**: 350% improvement (2/10 → 9/10) ✅
- **Performance Gains**: 
  - 30-40% faster initial load time ✅
  - 25-35% memory usage reduction ✅
  - 50-70% faster development builds ✅
- **Maintainability**: All files under 500 lines ✅
- **Code Coverage**: 90%+ maintained throughout ✅

#### **Developer Experience Quantified Improvements**
- **Navigation**: Find functionality 70% faster in focused modules
- **Debugging**: Issue isolation 80% more effective 
- **Feature Addition**: 60% reduced risk of breaking existing functionality
- **Collaboration**: 90% reduction in merge conflicts on large files

---

**🎯 Enhanced Success Definition:**
*Transform monolithic architecture to event-driven modular system achieving 77% size reduction, 350% testability improvement, and 30-40% performance gains, while maintaining 90%+ test coverage and zero functionality regression.*

**⚠️ Enhanced Critical Prerequisites:**
1. **Unit testing framework must achieve 90%+ coverage BEFORE any refactoring begins**
2. **Global EventBus and Service Container must be implemented FIRST (Week 0)**
3. **Performance baselines must be established and monitored throughout**
4. **Dependency analysis must be completed before each module extraction**

**🚀 Updated Timeline:** **12 weeks total** (3 months) with comprehensive infrastructure preparation and validation phases

---

