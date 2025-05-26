# Project Tasks

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
- [ ] Implement Galactic Chart
  - [X] Create 2D overlay map system
  - [X] Implement grid layout (0-9 horizontal, A-Z vertical)
  - [X] Add vertical scroll functionality
  - [X] Create modal overlay system
  - [X] Add G key binding (disabled in Edit-Mode)
  - [X] Implement modal dismissal (A, F keys and X button)
  - [X] use verse.py to populate the universe with solar systems
  - [X] Visualize verse.py with galactic chart
  - [X] Add solar system cell labeling
  - [ ] Add ability to warp from sector to sector (see docs/warp_drive_spec.md)
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
- [ ] Optimize chunk rendering
  - [X] Implement chunk culling
  - [X] Add level of detail system
  - [X] Optimize memory usage
- [X] Optimize triangle count
  - [X] Implement mesh simplification
  - [X] Add adaptive detail levels

## Documentation
- [ ] Create technical documentation
  - [ ] Architecture overview
  - [ ] Component documentation
  - [ ] API documentation
- [ ] Write user documentation
  - [ ] Installation guide
  - [ ] Usage instructions
  - [ ] Parameter explanations

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
  - [ ] **DEFERRED**: Ship purchasing system moved to post-MVP
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
    - [ ] Create station repair interface
    - [ ] **DEFERRED**: System shop interface moved to post-MVP (no card system)
  - [ ] Station Integration
    - [X] Add docking system checks
    - [ ] Implement repair services
    - [ ] **DEFERRED**: System shop moved to post-MVP
    - [ ] Add launch sequence

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
    - [X] Level-specific targeting capabilities
      - [X] Level 1-2: Basic targeting (existing functionality)
      - [X] Level 3+: Sub-targeting of specific enemy systems
      - [X] Higher levels: Improved sub-target detection range and accuracy
    - [X] Update all ship configurations to use Level 3+ targeting computers for testing

### UI Implementation
- [X] Extend Ship Systems HUD
  - [X] Add notification messages when systems are repaired/damaged/destroyed
  - [X] **SIMPLIFIED**: Show energy consumption rate for active systems
  - [ ] **NEW**: Enhanced Targeting HUD (Level 3+ Target Computer)
    - [ ] Add sub-target selection display
    - [ ] Show targetable enemy systems list
    - [ ] Add visual indicators for selected sub-target
    - [ ] Implement sub-target cycling UI feedback
    - [ ] Add accuracy bonus indicators for sub-targeted systems

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

- [ ] **SIMPLIFIED**: Basic Station Interface (MVP)
  - [ ] Create repair service interface
  - [ ] **DEFERRED**: System shop moved to post-MVP (no card system)
  - [ ] Add hull repair service
  - [ ] **DEFERRED**: Upgrade preview moved to post-MVP
  - [ ] Add service menu navigation
  - [ ] Implement credit balance display
  - [ ] **DEFERRED**: Compatibility indicators moved to post-MVP

### Backend Integration

- [ ] API Endpoints
  - [ ] System status endpoints
  - [ ] **SIMPLIFIED**: Basic upgrade management endpoints (level-based)
  - [ ] Repair system endpoints
  - [ ] **SIMPLIFIED**: Energy management endpoints (no power grid)
  - [ ] Ship class management endpoints
  - [ ] Repair kit management endpoints
  - [ ] **DEFERRED**: Faction standing endpoints moved to post-MVP
  - [ ] **DEFERRED**: Resource management endpoints moved to post-MVP

## Post-MVP Phase - Full NFT/Card System

### Advanced Inventory System (Post-MVP)
- [ ] **NFT/Card System Implementation**
  - [ ] Implement NFT item card system
    - [ ] Create card definition structure
    - [ ] Add passive/active ability system
    - [ ] Implement XP/faction prerequisites
    - [ ] Add card rarity system
  - [ ] Create stacking inventory system
    - [ ] Implement card stack management
    - [ ] Add Pokédex-style discovery system
    - [ ] Create mystery card reveals
    - [ ] Add card collection tracking
  - [ ] Implement drag-and-drop interface
    - [ ] Create card inventory UI
    - [ ] Add ship slot interface
    - [ ] Implement card transfer system
    - [ ] Add visual feedback for valid drops

### Card Collection and Upgrade System (Post-MVP)
- [ ] **Card-Based Progression**
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
- [ ] Technical Documentation
  - [ ] System architecture docs
  - [ ] API documentation
  - [ ] Database schema docs
  - [ ] Performance guidelines
  - [ ] **ENHANCED**: NFT/Card system docs

- [ ] User Documentation
  - [ ] System guide
  - [ ] Upgrade guide
  - [ ] Repair guide
  - [ ] **SIMPLIFIED**: Energy management guide (no power grid complexity)
  - [ ] **ENHANCED**: Card collection guide

## Dependencies
- MVP Phase must be completed before starting Post-MVP
- UI Implementation can begin after Core Ship Systems
- Backend Integration can be done in parallel with UI
- **NFT/Card System requires MVP completion and crypto wallet integration**
- **Advanced Hardpoint System builds on basic slot system**

## Notes
- Mark tasks as [X] when complete
- Add subtasks as needed
- Update dependencies if they change
- Document any blockers or issues
- Track time estimates for each task
- **SIMPLIFIED POWER GRID**: Systems now consume energy directly from shared pool when active, eliminating the complexity of separate power allocation and management

