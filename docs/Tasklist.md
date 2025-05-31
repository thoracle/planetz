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

### 🚀 **NEXT PHASE: Code Quality & Performance Improvements**
**Target**: Refactor large files and improve code maintainability
- **File Modularization**: Break down oversized components into manageable modules
- **Performance Optimization**: Asset bundling and code splitting
- **Code Quality**: Standardize terminology and improve error handling

### ⚠️ **CRITICAL: Large File Size Issues**
**Priority**: High - Code maintainability and performance concerns

#### 📁 **Files Requiring Modularization**
- [ ] **app.js (88KB, 2,228 lines)** - Consider breaking into smaller modules
  - Extract planet generation logic into separate module
  - Split UI management from core app logic
  - Separate Three.js scene setup and rendering
  - Create dedicated modules for event handling and controls
  
- [ ] **CardInventoryUI.js (54KB, 1,462 lines)** - Very large for a UI component
  - Split into separate components: CardGrid, CardStack, DragDrop
  - Extract card filtering and sorting logic
  - Separate rendering logic from data management
  - Create reusable card component modules
  
- [ ] **DamageControlInterface.js (45KB, 1,285 lines)** - Should be modularized
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

- [ ] **Station repair interface exists but integration with card system needs work**
  - Current repair interface works with basic system repairs
  - Card-based system upgrades not properly integrated
  - Need to connect repair costs with card inventory system
  - Station interface should show card requirements for upgrades

- [ ] **Some systems reference non-existent dependencies**
  - Audit all system imports and references
  - Identify and fix broken dependency chains
  - Remove references to deleted or moved files
  - Update import paths for refactored modules
  - Add proper error handling for missing dependencies

#### 🚀 **Performance Optimization Issues**
**Priority**: Medium - Performance and memory management improvements

- [X] **The card inventory system loads all card types at initialization. Consider lazy loading for better performance.**
  - ✅ Current system initializes all card types on startup
  - ✅ This creates memory overhead but is acceptable for current scope
  - ✅ Lazy loading implemented through discovery system
  - ✅ Progressive loading works well for card discovery system
  - ✅ Performance is adequate for current gameplay needs

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
    - [X] Implement autofire mode toggle (\ key)
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
- [ ] **Autofire Mode Implementation** ⬅️ **NEXT IMMEDIATE TASK**
  - [X] Create autofire toggle system (\ key)
    - [X] Add autofire status tracking
    - [X] Implement autofire eligibility checking
    - [X] Create autofire update loop integration
    - [X] Add autofire visual indicators
  - [ ] Autofire Logic
    - [ ] Implement automatic target selection
    - [ ] Add range-based firing validation
    - [ ] Create autofire cooldown management
    - [ ] Implement mixed manual/auto firing
    - [ ] Add autofire priority system (closest target first)

### Target Lock and Firing Control
- [ ] **Target Lock Integration**
  - [ ] Integrate with existing TargetComputer system
    - [ ] Add target lock requirement validation
    - [ ] Implement target lock indicators for weapons
    - [ ] Create target lock timeout handling
    - [ ] Add target lock range validation
  - [ ] Firing Control
    - [ ] Implement manual firing (Enter key)
    - [ ] Add firing condition validation
    - [ ] Create firing feedback system
    - [ ] Implement firing error messages

### Projectile Physics and Tracking
- [ ] **Projectile Management System**
  - [ ] ProjectileManager class
    - [ ] Create projectile lifecycle management
    - [ ] Implement collision detection system
    - [ ] Add projectile update loop
    - [ ] Create projectile cleanup system
  - [ ] Homing Mechanics
    - [ ] Implement proportional navigation guidance
    - [ ] Add target tracking algorithms
    - [ ] Create homing missile turn rate limits
    - [ ] Add homing failure conditions (target lost, out of fuel)
  - [ ] Collision and Damage
    - [ ] Create collision detection for projectiles
    - [ ] Implement splash damage calculation
    - [ ] Add damage falloff based on distance from blast center
    - [ ] Create multiple target damage application

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
- [ ] **Weapon Card Drag-and-Drop**
  - [ ] Extend CardInventoryUI for weapon installation
    - [ ] Add weapon slot drop zones
    - [ ] Implement weapon card validation
    - [ ] Create weapon installation feedback
    - [ ] Add weapon slot conflict resolution
  - [ ] Weapon Slot Management
    - [ ] Create weapon slot removal system
    - [ ] Implement weapon slot swapping
    - [ ] Add weapon configuration persistence
    - [ ] Create weapon loadout validation

### Audio and Visual Effects
- [ ] **Weapons Audio System**
  - [ ] Create weapon firing sound effects
    - [ ] Laser weapon sounds (pew-pew)
    - [ ] Plasma weapon sounds (deep hum)
    - [ ] Missile launch sounds (whoosh)
    - [ ] Explosion sounds for splash damage
  - [ ] UI Audio Feedback
    - [ ] Weapon selection sounds
    - [ ] Autofire toggle sounds
    - [ ] Cooldown expiration chimes
    - [ ] Error notification sounds

- [ ] **Weapons Visual Effects**
  - [ ] Create weapon firing effects
    - [ ] Muzzle flash for energy weapons
    - [ ] Projectile trails for missiles
    - [ ] Explosion effects for splash damage
    - [ ] Beam effects for continuous fire weapons
  - [ ] HUD Visual Effects
    - [ ] Weapon slot highlight animations
    - [ ] Cooldown progress animations
    - [ ] Target lock acquisition effects
    - [ ] Autofire status indicators

### Integration with Existing Systems
- [ ] **Ship System Integration**
  - [ ] Connect weapons to existing Ship class
    - [ ] Add weapon slots to ship configuration
    - [ ] Integrate weapon energy consumption
    - [ ] Connect weapon damage to ship systems
    - [ ] Add weapon system damage effects
  - [ ] Combat Integration
    - [ ] Connect weapons to combat damage system
    - [ ] Integrate with enemy ship targeting
    - [ ] Add weapon effectiveness calculations
    - [ ] Create weapon vs. shield interactions

- [ ] **Energy System Integration**
  - [ ] Connect weapons to ship energy system
    - [ ] Implement energy cost per shot
    - [ ] Add energy availability checking
    - [ ] Create energy-based firing limitations
    - [ ] Add energy recovery considerations

### Testing and Balancing
- [ ] **Weapons Testing**
  - [ ] Create weapon functionality test suite
    - [ ] Test weapon firing mechanics
    - [ ] Validate cooldown systems
    - [ ] Test autofire functionality
    - [ ] Verify target lock requirements
  - [ ] Combat Balance Testing
    - [ ] Test weapon damage balance
    - [ ] Validate cooldown timing
    - [ ] Test autofire effectiveness
    - [ ] Verify energy consumption balance

- [ ] **UI Testing**
  - [ ] Test weapon selection UI
    - [ ] Validate weapon cycling
    - [ ] Test active weapon highlighting
    - [ ] Verify cooldown displays
    - [ ] Test autofire indicators
  - [ ] Integration Testing
    - [ ] Test card installation system
    - [ ] Validate weapon configuration persistence
    - [ ] Test weapon slot management
    - [ ] Verify error handling

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

