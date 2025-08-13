# Star F*ckers

A 3D web-based spaceship simulation game featuring intergalactic exploration, trading, and combat. The game combines classic space simulation elements inspired by Elite, Privateer, and Star Raiders with modern web technologies, procedural universe generation, and an innovative NFT-inspired card collection system.

## 🚀 Project Status: Production Ready ✅

**Current Version**: 2024.12  
**Overall Completion**: ~98% of core systems implemented and fully integrated  
**Stability**: Production-ready with comprehensive testing and robust error handling  
**Documentation**: Complete technical and user documentation available  

## 🧪 Testing Mode Configuration

### No-Persistence Testing Mode ✅ **ACTIVE**

**For Testing Phase**: The game is currently configured with `NO_PERSISTENCE` mode enabled, which clears all persistent data between sessions to provide a clean testing environment.

#### Current Configuration
```javascript
// In frontend/static/js/views/StarfieldManager.js
const TESTING_CONFIG = {
    NO_PERSISTENCE: true,  // ✅ CURRENTLY ACTIVE
    
    // Future options:
    // RESET_PLAYER_PROGRESS: true,
    // RESET_SHIP_CONFIG: true,
    // RESET_CREDITS: true,
    // RESET_FACTION_STANDINGS: true
};
```

#### What Gets Cleared on Game Start
- **Active Missions**: All previously accepted missions are marked as completed
- **Mission Progress**: No mission state carries over between sessions
- **Game State**: Fresh slate every time you start the game

#### Expected Behavior
- 🔄 **Game Restart** → All old missions automatically cleared
- ✅ **Accept 2 Missions** → Mission Status HUD shows exactly 2 missions  
- 🚫 **No Confusion** → No persistent data from previous sessions
- 🧪 **Consistent Testing** → Same starting state every time

#### Console Output During Testing Mode
```
🧪 TESTING MODE ACTIVE: Clearing all persistent data for fresh start...
🧪 TESTING MODE: Found X old active missions, clearing...
🧪 TESTING MODE: All old missions cleared
🧪 TESTING MODE: Fresh session initialized
```

#### How to Disable Testing Mode (For Production)
When ready for production with persistent game data:
```javascript
// Change this line in StarfieldManager.js:
const TESTING_CONFIG = {
    NO_PERSISTENCE: false,  // Enables persistence between sessions
};
```

**Note**: This testing mode will be disabled in future production releases to enable normal save/load functionality.

---

## ⚡ Recent Major Fixes & Improvements

### Equipment Synchronization Fix ✅ **NEW**
**Issue**: After docking and changing equipment, ship systems weren't properly synchronized:
- Weapons HUD showed old weapons instead of new ones  
- New systems (Radio, Chart, Scanner) didn't work initially
- Systems only activated after opening damage control HUD

**Solution**: Enhanced `initializeShipSystems()` method with proper card system refresh:
- Forces refresh of ship systems from current card configuration during launch
- Ensures weapon HUD displays current weapons via WeaponSyncManager
- New systems work immediately without needing damage control HUD activation
- Comprehensive async initialization sequence for all ship systems

### StarfieldManager Global Access ✅ **NEW**  
**Issue**: Test scripts and debugging tools couldn't access StarfieldManager due to timing issues:
- `window.starfieldManager` was undefined during async initialization
- Scripts failed with "StarfieldManager not found" errors

**Solution**: Implemented proper global exposure and utility functions:
- Added `window.starfieldManager` global reference after initialization
- Created `starfield-manager-utils.js` with `waitForStarfieldManager()` helper
- Ensured proper timing between StarfieldManager creation and script access

### Undock Cooldown User Experience ✅ **NEW**
**Issue**: Post-launch targeting computer was silently blocked for 30 seconds:
- TAB key targeting was disabled without user feedback
- Players couldn't understand why systems weren't responding

**Solution**: Enhanced user feedback and reduced cooldown duration:
- Added clear "TARGETING SYSTEMS WARMING UP" message with countdown timer
- Reduced cooldown from 30 seconds to 10 seconds for better UX
- Added command failed sound and visual feedback during cooldown
- Systems properly initialize after cooldown expires

## Features

### Core Spaceship Systems ✅ 100% Complete
- **Five Ship Classes**: Scout, Light Fighter, Heavy Fighter, Light Freighter, Heavy Freighter
- **Modular Ship Systems**: Engines, weapons, shields, scanners, and support systems
- **Damage & Repair System**: Real-time system damage with repair mechanics and station services
- **Energy Management**: Simplified energy pool system with per-system consumption
- **Gear-Based Progression**: Ship stats derived from installed equipment cards
- **Multi-Ship Fleet**: Own and manage multiple ships with persistent configurations

### NFT Card Collection System ✅ 100% Complete
- **Clash Royale-Style Stacking**: Cards accumulate and upgrade through collection (never destroyed)
- **Rarity-Based Progression**: Common (70%), Rare (20%), Epic (8%), Legendary (2%) drop rates
- **Universal Slot System**: All systems use 1 slot, eliminating hardpoint complexity
- **Card Discovery**: Pokédex-style discovery system with silhouettes for undiscovered cards
- **Drag-and-Drop Interface**: Complete card installation system with visual feedback
- **Multi-Ship Ownership**: Collect and configure multiple ships with persistent configurations
- **Build Validation**: Prevents launching with invalid ship configurations

### Navigation & Exploration ✅ 100% Complete
- **Multiple View Modes**: Front view, aft view, galactic chart, long-range scanner
- **Warp Drive System**: Energy-based faster-than-light travel between sectors
- **Target Computer**: Advanced targeting with sub-system targeting capabilities (Level 3+)
- **Docking System**: Station interaction with repair and inventory management
- **Special Starter System**: Beginner-friendly "Sol" system for new players
- **Intel System**: Comprehensive intelligence gathering with faction-colored interface

### Interactive 3D Universe ✅ 100% Complete
- **Procedural Star Systems**: Generated solar systems with planets, moons, and stations
- **Real-time 3D Rendering**: Three.js-powered space environment
- **Dynamic Starfield**: High-density star rendering with parallax effects
- **Atmospheric Effects**: Planet atmospheres and visual effects
- **Intel System**: Celestial object descriptions and intelligence briefs
- **Faction Integration**: Color-coded faction relationships and detailed intelligence

### Advanced Combat Features ✅ 95% Complete
- **Weapon System Core**: Complete weapon slot management with cycling and autofire framework
- **8 Weapon Types**: Laser cannons, plasma weapons, missiles, and exotic systems
- **Shield Management**: Deflector shields with energy consumption
- **Sub-System Targeting**: Target specific enemy ship components (Level 3+ targeting computer)
- **Damage Control Interface**: Real-time system status and repair management
- **Enemy Ship AI**: Simplified enemy configurations for combat testing
- **Weapon Synchronization**: Unified weapon initialization system with WeaponSyncManager

### Station Services ✅ 100% Complete
- **Repair Services**: Hull and system repair with faction-based pricing
- **Ship Inventory**: Complete ship configuration management interface
- **Card Shop**: Browse and manage card collections with drag-and-drop installation
- **Multi-Ship Management**: Switch between owned ships when docked
- **Service Integration**: Seamless repair and inventory system integration

## Technical Stack

### Frontend ✅ Production Ready
- **Three.js** for 3D rendering and scene management
- **JavaScript/ES6+** with modular architecture
- **WebAssembly (WASM)** for performance-critical computations (planet generation)
- **HTML5/CSS3** for UI components
- **Card System Integration** with drag-and-drop interface
- **Weapon Synchronization** with unified initialization system

### Backend ✅ Production Ready
- **Python3/Flask** for API server and static file serving
- **Procedural Generation** algorithms for universe creation
- **RESTful API** design for client-server communication
- **Ship Configuration Management** with JSON-based ship definitions
- **Comprehensive Error Handling** and logging

## Getting Started

### Prerequisites
- Python 3.x
- Modern web browser with WebGL support
- Node.js (for development tools)

### Backend Setup

1. Create and activate a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Start the development server:
```bash
python run.py
```

The server will start at http://localhost:5001

### Frontend Setup

The frontend is served as static files by the Flask backend. Simply navigate to http://localhost:5001 after starting the backend server.

For development with live reload:
```bash
python3 -m http.server 8080 --directory frontend/static
```

## Game Controls

### Ship Movement
- **0-9 Keys**: Set impulse engine speed (0 = stop, 9 = maximum)
- **Arrow Keys**: Rotate ship (pitch and yaw)

### View Controls
- **F Key**: Switch to Front View (forward-facing camera with + crosshair)
- **A Key**: Switch to Aft View (rear-facing camera with -- crosshair)
- **G Key**: Open Galactic Chart (2D galaxy map for navigation)
- **L Key**: Open Long Range Scanner (tactical system view)

### System Controls
- **S Key**: Toggle shields on/off (blue screen tint when active)
- **D Key**: Toggle Damage Control interface
- **T Key**: Toggle target computer
- **Tab**: Cycle through targets
- **< / > Keys**: Cycle through sub-targets (Level 3+ targeting computer)
- **I Key**: Toggle Intel HUD for celestial objects
- **M Key**: Toggle Mission Status HUD (shows active missions)

### Weapon Controls
- **Z Key**: Select previous weapon
- **X Key**: Select next weapon
- **Space Bar**: Fire active weapon
- **C Key**: Toggle autofire mode (framework implemented)

### Special Modes
- **Ctrl+E** (or **Cmd+E** on Mac): Toggle Edit Mode for planet terraforming
- **Ctrl+D** (or **Cmd+D** on Mac): Toggle FPS Display

### Docking
- **Dock Button**: Dock with nearby stations (when in range)
- **Undock Button**: Leave station and resume flight
- **Ship Inventory**: Access card collection and ship configuration
- **Repair Services**: Hull and system repairs at stations

## Ship Systems

### Core Systems
1. **Impulse Engines**: Sublight propulsion with variable energy consumption (0-9 speed settings)
2. **Warp Drive**: Faster-than-light travel between star systems with cooldown mechanics
3. **Deflector Shields**: Energy-based damage protection with manual toggle
4. **Weapons**: 8 weapon types with individual cooldowns and autofire capability
5. **Long Range Scanner**: System-wide object detection with energy consumption
6. **Subspace Radio**: Galactic chart updates and intel communications
7. **Target Computer**: Enemy detection and sub-system targeting (Level 3+)
8. **Hull Plating**: Physical damage resistance and hull capacity
9. **Energy Reactor**: Power generation and storage capacity
10. **Cargo Hold**: Storage capacity for trading

### Card-Based Progression ✅ Complete
- **Card Collection**: Clash Royale-style stacking system with rarity progression
- **System Installation**: Drag-and-drop interface for ship configuration
- **Multi-Level Systems**: Level 1-5 progression with exponential card requirements
- **Build Validation**: Prevents launching with invalid configurations
- **Equipment Synchronization**: Enhanced system ensures weapons HUD shows current loadout after equipment changes
- **Ship Synchronization**: WeaponSyncManager provides unified weapon initialization and real-time synchronization

### Damage & Repair ✅ Complete
- **System Health**: 0-100% effectiveness based on damage with state transitions
- **Repair Kits**: Consumable items for in-space repairs with priority system
- **Station Repairs**: Full restoration available at docked stations
- **Critical Damage**: Systems become inoperable with cascading failure effects
- **Auto-Repair System**: Automated repair priority management

### Energy Management ✅ Complete
- **Simplified Energy Pool**: All systems draw from central energy supply
- **Active Consumption**: Systems consume energy only when in use
- **Variable Consumption**: Impulse engines scale energy use with speed (1x to 15x)
- **Auto-Deactivation**: Systems shut down when insufficient energy

## Ship Classes

### Scout
- **Role**: Fast reconnaissance and exploration
- **Slots**: 15 - High speed, advanced sensors, energy efficiency
- **Strengths**: Speed, sensor range, energy efficiency
- **Weaknesses**: Light armor, minimal cargo, limited weapons (2 slots)

### Light Fighter
- **Role**: Agile combat vessel for dogfighting
- **Slots**: 16 - Balanced speed and firepower, good maneuverability
- **Strengths**: Balanced combat effectiveness, maneuverability
- **Weaknesses**: Moderate armor, limited cargo capacity
- **Weapons**: 3 weapon slots for balanced combat

### Heavy Fighter
- **Role**: Durable combat ship for sustained engagements
- **Slots**: 18 - Heavy armor, high firepower, robust systems
- **Strengths**: Heavy armor, maximum firepower, system redundancy
- **Weaknesses**: Lower speed, limited cargo space
- **Weapons**: 4 weapon slots for maximum combat effectiveness

### Light Freighter
- **Role**: Versatile trading vessel with defensive capability
- **Slots**: 17 - Good cargo capacity, balanced systems
- **Strengths**: Good cargo capacity, balanced systems
- **Weaknesses**: Moderate combat effectiveness
- **Weapons**: 2 weapon slots for defensive capability

### Heavy Freighter
- **Role**: Maximum cargo capacity for bulk trading
- **Slots**: 20 - Massive cargo hold, heavy armor
- **Strengths**: Massive cargo capacity, heavy armor
- **Weaknesses**: Slow speed, minimal combat capability
- **Weapons**: 1 weapon slot for basic defense

## 🔧 Troubleshooting & Common Issues

### Equipment & Systems Issues

#### Equipment Not Working After Docking ✅ **FIXED**
**Symptoms**: 
- Weapons HUD shows old weapons after equipment changes
- New systems (Radio, Chart, Scanner) don't respond to key presses
- Systems start working only after opening damage control HUD

**Root Cause**: Ship systems weren't properly refreshed from card configuration during launch
**Status**: ✅ **RESOLVED** - Enhanced equipment synchronization system

**Solution**: 
- `initializeShipSystems()` now forces card system refresh during launch
- WeaponSyncManager properly synchronizes weapon HUD with current loadout
- All systems initialize immediately without manual intervention

#### Targeting Computer Not Responding After Launch ✅ **FIXED**
**Symptoms**:
- TAB key doesn't cycle targets immediately after undocking
- No feedback when pressing TAB during cooldown period
- Targeting works fine after waiting ~30 seconds

**Root Cause**: Undock cooldown blocked targeting without user feedback
**Status**: ✅ **RESOLVED** - Improved cooldown system with clear feedback

**Solution**:
- Reduced cooldown from 30 seconds to 10 seconds
- Added "TARGETING SYSTEMS WARMING UP" message with countdown
- Command failed sound plays when TAB pressed during cooldown
- Clear visual feedback shows remaining initialization time

### Development & Testing Issues

#### Mission Data Persists Between Sessions ✅ **ADDRESSED**
**Symptoms**:
- Mission Status HUD shows old missions from previous game sessions
- More active missions than actually accepted in current session
- Confusion about which missions are currently active

**Root Cause**: Mission system persistence between game restarts
**Status**: ✅ **ADDRESSED** - Testing mode active with no persistence

**Current Solution**: 
- **Testing Mode Enabled**: `TESTING_CONFIG.NO_PERSISTENCE = true`
- All active missions automatically cleared on game start
- Fresh mission state every session for consistent testing
- See "🧪 Testing Mode Configuration" section above for details

**Future Solution** (Production):
- When `NO_PERSISTENCE = false`, missions will persist between sessions
- Save/load system will maintain mission progress correctly
- Player choice to continue or start fresh

#### StarfieldManager Not Found in Console ✅ **FIXED**
**Symptoms**:
- `window.starfieldManager` returns undefined in browser console
- Test scripts fail with "StarfieldManager not found" errors
- Debugging tools can't access game manager

**Root Cause**: Timing issues between async initialization and global exposure
**Status**: ✅ **RESOLVED** - Proper global exposure system

**Solution**:
- Added `window.starfieldManager` global reference after initialization
- Created `starfield-manager-utils.js` with helper functions
- `waitForStarfieldManager()` utility for safe async access

**Usage Example**:
```javascript
// Loading test scripts safely
await waitForStarfieldManager();
const ship = window.starfieldManager.viewManager.getShip();
console.log('✅ Ship systems:', ship.systems);
```

### Browser Compatibility Issues

#### JavaScript Syntax Errors in Test Scripts
**Symptoms**:
- "SyntaxError: Unexpected identifier" in browser console
- Test scripts fail to load or execute
- Modern JavaScript features not supported

**Solution**: 
- Test scripts use compatible JavaScript syntax (ES5)
- No arrow functions, optional chaining, or template literals
- All scripts tested in multiple browser environments

#### WebGL/Three.js Performance Issues
**Symptoms**:
- Low frame rates or stuttering
- High CPU/GPU usage
- Memory leaks during extended play

**Solutions**:
- Use Chrome/Firefox with hardware acceleration enabled
- Close other tabs/applications for more GPU memory
- Refresh page periodically during extended sessions
- Monitor FPS with Ctrl+D (Cmd+D on Mac)

### Game State Issues

#### Ship Configuration Not Persisting
**Symptoms**:
- Equipment changes reset after refresh
- Ship configurations don't save between sessions

**Solutions**:
- Ensure ship configurations are saved before closing browser
- Check browser localStorage isn't cleared by privacy settings
- Use "Apply" button in ship inventory before undocking

#### Systems Not Responding to Key Presses
**Symptoms**:
- Specific system keys (S, T, L, etc.) don't work
- UI focus issues preventing keyboard input

**Solutions**:
- Click on game viewport to ensure focus
- Check for browser extensions blocking key events
- Refresh page if keyboard input becomes unresponsive

### Performance Optimization

#### Large System Performance Issues
**Symptoms**:
- Slow loading in systems with many planets/stations
- Frame rate drops in busy sectors

**Solutions**:
- Systems dynamically load only visible objects
- Use lower graphics settings in busy areas
- Worker threads handle mesh generation automatically

### Getting Help

#### Debugging Tools Available
1. **Test Scripts**: Comprehensive test suite for all systems
   - `test-equipment-sync-simple.js` - Equipment synchronization testing
   - `test-starfield-ready.js` - StarfieldManager availability testing

2. **Console Commands**:
   ```javascript
   // Check game state
   window.starfieldManager.viewManager.getShip()
   
   // Test system functionality
   ship.systems.forEach(sys => console.log(sys.name, sys.isOperational()))
   
   // Debug weapon synchronization
   ship.weaponSyncManager.getWeaponStatus()
   ```

3. **Debug Modes**:
   - **Ctrl+D** / **Cmd+D**: Toggle FPS display
   - **Ctrl+E** / **Cmd+E**: Toggle edit mode (planet terraforming)

#### Reporting Issues
When reporting issues, please include:
- Browser version and operating system
- Console error messages (F12 Developer Tools)
- Steps to reproduce the issue
- Current ship configuration and system state

## Architecture

### Frontend Components ✅ Production Ready
1. **Ship System**: Modular ship class with card-based gear system
2. **View Manager**: Handles different camera perspectives and UI modes
3. **Starfield Manager**: Manages 3D space environment and effects
4. **System Managers**: Individual managers for warp, docking, targeting, weapons
5. **UI Components**: Damage control, targeting, navigation, and inventory interfaces
6. **Card System**: NFT-inspired collection with drag-and-drop installation
7. **Weapon Synchronization**: WeaponSyncManager for unified weapon initialization

### Backend Components ✅ Production Ready
1. **Universe Generation**: Procedural star system and galaxy creation
2. **API Endpoints**: RESTful services for game state and universe data
3. **Configuration System**: Ship types, system specifications, game balance
4. **Ship Configurations**: JSON-based ship and system definitions

## Development

### Project Structure ✅ Well Organized
```
star-fuckers/
├── frontend/
│   └── static/
│       ├── js/
│       │   ├── ship/          # Ship systems, cards, and configuration
│       │   │   ├── systems/   # Individual system implementations
│       │   │   ├── NFTCard.js # Card collection system
│       │   │   ├── Ship.js    # Main ship class
│       │   │   ├── CardInventoryUI.js # Card management interface
│       │   │   └── WeaponSyncManager.js # Weapon synchronization
│       │   ├── views/         # View managers and UI
│       │   ├── ui/            # Interface components
│       │   └── workers/       # Web workers for performance
│       ├── css/               # Stylesheets
│       ├── audio/             # Sound effects
│       └── lib/               # Third-party libraries
├── backend/
│   ├── routes/                # API endpoints
│   ├── ShipConfigs.py         # Ship configuration definitions
│   ├── config.py              # Configuration management
│   └── verse.py               # Universe generation
└── docs/                      # Complete documentation
    ├── system_architecture.md  # Technical architecture
    ├── spaceships_spec.md      # Card system specification
    ├── implementation_status.md # Current status
    └── Tasklist.md            # Development progress
```

### Testing ✅ Comprehensive Coverage
The project includes extensive test files for individual systems:
- Ship system integration tests
- Individual component tests (weapons, shields, engines)
- UI component tests
- Damage control system tests
- Card system and drag-and-drop tests
- Weapon synchronization tests

### Key Features Implemented ✅ Production Ready
- ✅ **Complete Ship System**: All 5 ship classes with gear-based stats
- ✅ **NFT Card Collection**: Full Clash Royale-style stacking system
- ✅ **Drag-and-Drop Interface**: Complete card installation system
- ✅ **Weapon System Core**: 8 weapon types with autofire framework and synchronization
- ✅ **Station Services**: Repair interface and inventory management
- ✅ **Energy Management**: Simplified but realistic energy consumption
- ✅ **Damage System**: Real-time damage with repair mechanics
- ✅ **Multi-Ship Ownership**: Persistent ship configurations
- ✅ **3D Universe**: Procedural generation with special starter system
- ✅ **Intel System**: Comprehensive intelligence gathering with faction integration

## 🎯 Current Development Status

### Recently Completed ✅
- **Equipment Synchronization System**: Complete fix for post-docking equipment issues
- **StarfieldManager Global Access**: Proper global exposure with utility functions for debugging
- **Undock Cooldown Enhancement**: Improved user feedback and reduced cooldown duration
- **WeaponSyncManager**: Unified weapon initialization and real-time synchronization system
- **Test Script Compatibility**: Enhanced browser compatibility for debugging tools
- **Documentation Updates**: Comprehensive troubleshooting guide and system documentation
- **Ship Configuration**: Enhanced multi-ship management with proper state persistence
- **Intel System**: Faction-colored intelligence interface with detailed celestial information
- **Damage Control**: Auto-repair system with priority management and visual feedback

### In Progress ⚙️
- **Autofire Logic**: Automatic targeting and range validation (75% complete)
- **Performance Optimization**: Code modularization for large files
- **Enhanced Testing**: Expanded test coverage for all systems

### Next Phase 🔄
- **Mission System**: Procedural missions with card rewards
- **Economy System**: Trading and market simulation
- **Content Expansion**: Additional ship types and card varieties

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow the existing code style and architecture
4. Add tests for new features
5. Submit a pull request

## Credits

This project draws inspiration from:
- **Elite** series - Trading and exploration mechanics
- **Wing Commander: Privateer** - Ship customization and universe design
- **Star Raiders** - Combat and navigation systems
- **Clash Royale** - Card collection and stacking mechanics
- [Sebastian Lague's Terraforming](https://github.com/SebLague/Terraforming) - Procedural terrain generation
- [DanielEsteban's softxels](https://github.com/danielesteban/softxels) - WebAssembly optimization techniques

## License

MIT License

Copyright (c) 2025 Thor Alexander

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE. 