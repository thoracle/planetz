# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PlanetZ** (aka "Star F*ckers") is a 3D web-based spaceship simulation game featuring intergalactic exploration, trading, and combat. Built with Python/Flask backend and Three.js frontend, it combines classic space simulation elements with modern web technologies and an NFT-inspired card collection system for ship upgrades.

**Version**: 2.1.0-atomic-discovery
**Status**: Production-ready (~98% complete)
**Current Branch**: `achievements` (active development)

### Core Systems (Fully Implemented)
- **3D Space Combat** - Weapons, targeting, shields with raycasting collision detection
- **Discovery System** - Object discovery with synchronized wireframe colors and faction standings
- **Mission Framework** - Cargo delivery, elimination, escort missions with unified economy
- **Faction System** - 10 unique factions with diplomatic complexity
- **Collection System** - NFT-style card collection driving gameplay progression
- **Achievement System** - Multi-tier progression with trophy notifications
- **Help Screen 2.0** - ESC-triggered modal with tabbed interface (Help, Ship's Log, Achievements, Collection, About)

## Development Commands

### Backend Server
```bash
# Start development server (recommended)
python run.py
# Server runs at http://localhost:5001

# Alternative entry points
python main.py                    # Development mode
python -m backend.app             # Module mode
```

### Testing

#### Playwright E2E Tests (Primary)
```bash
# Full test suite
npm run test:e2e
python scripts/run_playwright_tests.py --full

# Specific test suites
npm run test:e2e:tooltips        # Star Charts tooltip tests
npm run test:e2e:hitboxes        # Hitbox validation
npm run test:e2e:headed          # Run with visible browser

# Install Playwright browsers
npm run test:e2e:install
```

#### Pytest Unit/Integration Tests
```bash
# All tests
npm run test:all
python -m pytest tests/playwright/ -v

# Specific subsystems
npm run test:ship-systems        # Ship logic and systems
npm run test:ai-behavior         # AI and combat behavior
npm run test:mission-system      # Mission system
npm run test:ui-components       # HUD components
npm run test:physics             # Physics integration
npm run test:economy             # Economy system

# Unit tests only
npm run test:unit                # Logic-only tests

# Integration tests only
npm run test:integration         # System integration tests

# Coverage report
npm run test:coverage            # Generates HTML coverage report

# Watch mode (for TDD)
npm run test:watch               # Runs tests on file changes
```

#### Running Single Test File
```bash
# Pytest pattern
python -m pytest tests/playwright/test_star_charts_tooltips.py -v

# With markers
python -m pytest tests/playwright/ -m "not slow" -v
python -m pytest tests/playwright/ -m integration -v
```

### Development Tools
```bash
# Clean build artifacts
npm run clean

# Lint JavaScript (basic validation)
npm run lint
```

### Python Virtual Environment
```bash
# Setup (first time)
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
.venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt
```

## Architecture Overview

### Frontend Architecture (Three.js + ES6 Modules)

**Entry Point**: `frontend/static/js/app.js`

#### Core Manager Pattern
The application uses a centralized manager pattern where `app.js` orchestrates:

1. **ViewManager** (`frontend/static/js/views/ViewManager.js`)
   - Manages camera perspectives (front, aft, charts, scanner)
   - Controls ship input and view switching
   - Integrates with all major systems

2. **StarfieldManager** (`frontend/static/js/views/StarfieldManager.js`)
   - Core game state coordinator (~346KB, largest file)
   - Manages 3D space environment and starfield rendering
   - Handles high-density star rendering with parallax effects
   - Global reference: `window.starfieldManager`

3. **SolarSystemManager** (`frontend/static/js/SolarSystemManager.js`)
   - Procedural star system generation
   - Manages planets, moons, stations as celestial bodies
   - Handles sector navigation and warp mechanics

4. **TargetComputerManager** (`frontend/static/js/views/TargetComputerManager.js`)
   - Advanced targeting with sub-system targeting (Level 3+)
   - TAB key cycling, threat assessment
   - Integration with StarChartsTargetComputerIntegration.js

5. **WeaponEffectsManager** (`frontend/static/js/ship/systems/WeaponEffectsManager.js`)
   - Weapon visual effects and projectile systems
   - Integrates with WeaponSyncManager for real-time weapon state

#### Key Subsystems

**Ship System** (`frontend/static/js/ship/`)
- `Ship.js` - Main ship class with card-based gear system
- `NFTCard.js` - Card collection system (Clash Royale-style stacking)
- `CardInventory.js` - Card management and progression
- `CardSystemIntegration.js` - Ship configuration from cards
- `WeaponSyncManager.js` - Unified weapon initialization and synchronization
- `systems/` - Individual system implementations (engines, shields, weapons, etc.)

**Navigation & Views** (`frontend/static/js/views/`)
- `GalacticChart.js` - 2D galaxy map (G key)
- `LongRangeScanner.js` - Tactical system view (L key)
- `StarChartsManager.js` - Visual star charts system
- `StarChartsUI.js` - Interactive UI layer for star charts

**UI Components** (`frontend/static/js/ui/`)
- `CardInventoryUI.js` - Drag-and-drop card installation (~139KB)
- `DamageControlHUD.js` - System status and repair (D key)
- `DockingModal.js` - Station interaction interface
- `WeaponHUD.js` - Weapon display and cycling (Z/X keys)
- `MissionStatusHUD.js` - Active mission tracking (M key)
- `HelpInterface.js` - In-game help system

**AI System** (`frontend/static/js/ai/`)
- `EnemyAI.js`, `EnemyAIManager.js` - Enemy ship behavior
- `CombatBehavior.js` - Combat tactics
- `FlockingBehavior.js`, `FlockingManager.js` - Formation flying
- `ThreatAssessment.js`, `WeaponTargeting.js` - Tactical AI

#### Critical Architecture Notes

1. **ES6 Module System**: Frontend uses native ES6 imports/exports. All JavaScript files must use proper import/export syntax.

2. **Global Manager Access**:
   - `window.starfieldManager` - Primary game state
   - `window.spatialManager` - Object tracking
   - `window.collisionManager` - Collision detection

3. **Three.js Systems**: Game uses Three.js for 3D rendering, NOT Ammo.js physics. Collision detection is raycast-based via `SimpleCollisionManager.js`.

4. **Equipment Synchronization**: After docking and equipment changes, `initializeShipSystems()` forces refresh of ship systems from card configuration. WeaponSyncManager ensures weapon HUD shows current loadout.

5. **Debug System**: Smart debug logging via `SmartDebugManager` with channel-based filtering. Debug channels configured in `frontend/static/js/debug-config.json`.

### Backend Architecture (Python/Flask)

**Entry Point**: `run.py` (development) or `main.py` (production)

#### Application Factory Pattern
`backend/__init__.py` defines `create_app(config_name)` factory:
- Registers blueprints for routes
- Configures static file serving from `frontend/static/`
- Initializes mission system

#### Route Blueprints (`backend/routes/`)
- `main.py` - Main HTML serving
- `api.py` - Game API endpoints
- `universe.py` - Universe generation API
- `missions.py` - Mission system API

#### Core Backend Modules
- `verse.py` - Procedural universe generation
- `game_state.py` - Game state management
- `economic_system.py` - Trading and economy
- `diplomacy_manager.py` - Faction relationships
- `mission_system/` - Mission generation and tracking
  - `mission_manager.py` - Mission lifecycle
  - `storage_manager.py` - Mission persistence
  - `triggers.py` - Event-based mission triggers
  - `cascade_handler.py` - Mission event cascading

#### Ship Configurations
`backend/ShipConfigs.py` and `frontend/static/js/ship/ShipConfigs.js` define:
- 5 ship classes (Scout, Light Fighter, Heavy Fighter, Light Freighter, Heavy Freighter)
- System specifications (weapons, engines, shields, etc.)
- Card rarity and progression (Common 70%, Rare 20%, Epic 8%, Legendary 2%)

### Testing Architecture

**Test Location**: `tests/playwright/`

- Playwright for E2E testing (primary)
- Pytest for unit/integration tests
- Test configuration: `pytest.ini`
- Test markers: `slow`, `integration`, `playwright`
- MCP Playwright server integration (see `.cursorrules`)

### Key Game Mechanics

#### Card Collection System
- Clash Royale-style stacking: cards never destroyed, accumulate to upgrade
- Universal slot system: all systems use 1 slot
- Rarity-based progression with exponential card requirements
- Drag-and-drop installation via CardInventoryUI
- Build validation prevents invalid ship configurations

#### Ship Systems (10 types)
1. Impulse Engines - Speed 0-9 (keys 0-9)
2. Warp Drive - FTL travel between systems
3. Deflector Shields - Toggle with S key
4. Weapons - 8 weapon types, Space to fire, Z/X to cycle
5. Long Range Scanner - System-wide detection (L key)
6. Subspace Radio - Chart updates (R key)
7. Target Computer - Enemy targeting (T key, TAB to cycle)
8. Hull Plating - Physical armor
9. Energy Reactor - Power generation
10. Cargo Hold - Trade goods storage

#### Energy Management
- Simplified energy pool: all systems draw from central supply
- Active consumption only (no idle drain)
- Variable consumption: impulse engines scale 1x-15x with speed
- Auto-deactivation when energy depleted

#### Damage & Repair
- System health 0-100% with state transitions
- Repair kits for in-space repairs
- Station services for full restoration
- Auto-repair priority management

#### Testing Mode Configuration
**IMPORTANT**: Game has testing mode in `StarfieldManager.js`:
```javascript
const TESTING_CONFIG = {
    NO_PERSISTENCE: true  // Currently ACTIVE - clears data between sessions
}
```
Change to `false` for production to enable save/load functionality.

### Undock Cooldown System
Post-launch targeting has 10-second warmup with:
- "TARGETING SYSTEMS WARMING UP" message with countdown
- Command failed sound during cooldown
- Clear visual feedback for blocked actions

## Important Patterns & Conventions

### 🚨 CRITICAL: Debug System (NOT console.log)

**YOU MUST USE `debug()` INSTEAD OF `console.log()`**

This project uses a channel-based debug logging system for organized, filterable output.

```javascript
import { debug } from './debug.js';

// ✅ CORRECT - Use debug() with appropriate channel
debug('TARGETING', 'Target acquired:', target.name);
debug('MISSIONS', 'Mission completed:', mission.title);
debug('P1', 'CRITICAL: System initialization failed');

// ❌ WRONG - Don't use console.log()
console.log('Target acquired:', target.name);  // DON'T DO THIS!
```

**Debug Channels** (see `frontend/static/js/debug_config.json`):
- **P1** - Critical system messages (always visible)
- **TARGETING** - Weapon/targeting system
- **MISSIONS** - Mission system activity
- **COMBAT** - Weapon firing, damage, AI
- **STAR_CHARTS** - Navigation, discovery
- **ACHIEVEMENTS** - Achievement tracking
- **MONEY** - Credits, transactions
- **UTILITY** - General system operations
- **FACTION** - Faction standings, diplomacy

**Enable/Disable Channels** (browser console):
```javascript
debugEnable('TARGETING');           // Enable single channel
debugEnable('MISSIONS', 'COMBAT');  // Enable multiple channels
debugDisable('TARGETING');          // Disable channel
debugStatus();                      // Show current channel status
```

### 🚫 Critical Do's and Don'ts

**✅ DO THIS:**
- Use `debug()` instead of `console.log()`
- Follow modular ES6+ patterns (import/export, class-based architecture)
- Test with debug channels - enable specific logging for your area
- Check existing patterns before creating new ones
- Use absolute paths for file operations

**❌ DON'T DO THIS:**
- **Don't use `console.log()`** - Use `debug(channel, message)` instead
- **Don't create new files unnecessarily** - Prefer editing existing files
- **Don't ignore the debug system** - It's essential for development
- **Don't bypass the event system** - Use existing event patterns
- **Don't break the modular architecture** - Maintain clean separation of concerns
- **Don't use defensive programming** - Fail fast to find bugs quickly, don't hide them behind fallbacks

### Frontend Code Style
1. **Manager Initialization**: Managers created in `app.js`, stored as module-level variables, and exposed globally via `window.*` when needed
2. **Async Initialization**: Use `waitForStarfieldManager()` utility for safe async access to game managers
3. **Event Handling**: Keyboard input handled centrally in ViewManager, delegated to active systems
4. **System Communication**: Systems communicate via manager references, not direct coupling
5. **ES6 Modules**: All code uses native ES6 imports/exports, no transpilation

### Backend Code Style
1. **Blueprint Registration**: All routes use Flask blueprints with URL prefixes
2. **API Design**: RESTful endpoints return JSON, errors use standard HTTP codes
3. **Logging**: Use Flask app logger, configured in `create_app()`

### File Organization Rules
- Ship systems: `frontend/static/js/ship/systems/`
- UI components: `frontend/static/js/ui/`
- View managers: `frontend/static/js/views/`
- Backend routes: `backend/routes/`
- Backend core: `backend/*.py`
- Documentation: `docs/`
- Tests: `tests/playwright/`

## Common Development Tasks

### Adding a New Ship System
1. Create system class in `frontend/static/js/ship/systems/MySystem.js`
2. Extend from `System` base class
3. Add to `ShipConfigs.js` (both frontend and backend)
4. Update `CardSystemIntegration.js` to handle new system type
5. Add UI integration if needed in appropriate HUD component
6. Test with `npm run test:ship-systems`

### Debugging Targeting/Discovery Issues
1. Enable relevant debug channels in `debug-config.json`
2. Check console for debug output (channels: TARGETING, DISCOVERY, STAR_CHARTS)
3. Use `window.starfieldManager` to inspect game state
4. Use Playwright tests: `npm run test:e2e:tooltips` or `npm run test:e2e:hitboxes`

### Testing Workflow
1. Start dev server: `python run.py`
2. For E2E tests: `npm run test:e2e`
3. For TDD: `npm run test:watch` (auto-runs on file changes)
4. For specific subsystem: Use appropriate `npm run test:*` command
5. Check coverage: `npm run test:coverage` (generates `coverage/` dir)

### Working with Large Files
Several files exceed 50KB due to feature complexity:
- `StarfieldManager.js` (~346KB) - Core game coordinator
- `TargetComputerManager.js` (~302KB) - Targeting logic
- `StarChartsUI.js` (~142KB) - Star charts interface
- `CardInventoryUI.js` (~139KB) - Card management UI

When modifying these files, make surgical changes to specific sections rather than rewriting large blocks.

## Recent Major Fixes (2025)

### Discovery & Targeting System Overhaul ✅ COMPLETED
**All critical issues resolved** - comprehensive fix for discovery/targeting bugs:
- **Infinite Recursion Loop**: Fixed stack overflow in discovery color update system
- **Cross-Sector Contamination**: A0 targets no longer appear in B1 target computer
- **Discovery Color Bug**: Discovered objects now show correct faction colors (yellow for neutral)
- **Duplicate Ship's Log**: Fixed duplicate discovery notifications
- **Console Log Spam**: Reduced repetitive debug output by 90%
- **Variable Scoping Errors**: Fixed `orbitRadius`, `angle`, `moonOrbitRadius` ReferenceErrors

**Key Files Modified**: `TargetComputerManager.js`, `StarChartsTargetComputerIntegration.js`, `StarChartsManager.js`, `SolarSystemManager.js`

### Console Cleanup & Debug Management ✅ COMPLETED
- Moved verbose logs to debug channels (TARGETING, STAR_CHARTS)
- Removed spammy version banners and debug test messages
- Added `debug-config.json` for persistent channel management

### Achievement Display Bug ✅ FIXED
- Issue: Achievements showing checkmarks for incomplete progress
- Root Cause: Corrupted localStorage data
- Solution: Added data validation and display-time safety checks

### Help Screen 2.0 Implementation ✅ COMPLETED
- ESC-triggered modal help screen with 4 tabs
- Game pause/resume, tab navigation, context-sensitive content

### Single Source of Truth - Card Inventory ✅ COMPLETED
- Unified inventory object between ESC view and station view
- Removed 100+ lines of sync code
- Perfect data parity

### Directional Arrows for Unknown Targets ✅ FIXED
- Issue: Arrows not showing for undiscovered/unknown targets when off-screen
- Solution: Increased arrow z-index to 25000, fixed flexbox centering

## Known Issues & Technical Debt

### Testing Mode Configuration
Testing mode currently clears missions between sessions (`NO_PERSISTENCE = true`). For production, set to `false` in `StarfieldManager.js`.

### Browser Compatibility
- Requires WebGL support
- ES6 modules (no transpilation)
- Hardware acceleration recommended for Three.js rendering
- Test in Chrome/Firefox primarily

### Planned Architectural Refactoring (See docs/game_object_refactor_plan.md)

**Status**: PLANNING - Technical debt documentation complete

The codebase has identified technical debt in several areas:

1. **God Classes** - Large files doing too much (`StarfieldManager.js` 7,894 LOC, `TargetComputerManager.js` 6,635 LOC)
2. **Console.log Violations** - 1,578 statements should use `debug()` system (automated migration planned)
3. **Global State Pollution** - 53 files use `window.*` variables (need dependency injection)
4. **Memory Leaks** - Event listeners without cleanup (need cleanup methods)
5. **Magic Numbers** - Hardcoded values need constants files
6. **Timer Cleanup Issues** - 209 setTimeout/setInterval calls need centralized management

**GameObject Factory Pattern**: Planned refactor to create single source of truth for game objects (planets, stations, ships) with:
- Unified GameObject class with factory pattern
- FactionStandingsManager for dynamic player-faction relationships
- Fail-fast assertions instead of defensive programming
- Elimination of fallback chains that mask bugs

**Philosophy**: Fail fast instead of defensive programming. When data is missing, throw clear errors pointing to the fix location rather than silently falling back to defaults that mask bugs.

**Note**: Current code is production-ready. Refactoring is for long-term maintainability, not immediate necessity.

## Debug Helpers & Browser Console Commands

The project includes helpful debug commands available in the browser console:

### Achievement System
```javascript
checkAchievements()        // Show achievement status
fixAchievements()          // Fix corrupted data
testAchievement(count)     // Test with discovery count
```

### Mission System
```javascript
debugEnable('MISSIONS')    // Enable mission logging
showMissionStatus()        // Show current missions
```

### General Debugging
```javascript
debugStatus()              // Show all debug channel states
debugEnable('CHANNEL')     // Enable specific channel
debugDisable('CHANNEL')    // Disable specific channel
```

### Game State Inspection
```javascript
window.starfieldManager    // Primary game state manager
window.spatialManager      // Object tracking
window.collisionManager    // Collision detection
ship.systems               // Ship systems array
```

## MCP Playwright Integration

The project uses MCP Playwright server for automated testing. See `.cursorrules` for details:
- Use MCP tools for Star Charts testing
- `setup_test_environment` before running tests
- Real-time test results via MCP server output

## Documentation

Comprehensive docs in `docs/` directory:
- `restart.md` - **AI team member onboarding** (MUST READ for new AI assistants)
- `game_object_refactor_plan.md` - **Architectural refactoring plan** (technical debt documentation)
- `system_architecture.md` - UML diagrams and architecture
- `spaceships_spec.md` - Card system specification
- `implementation_status.md` - Current status
- `faction_guide.md` - Faction system
- `ai_system_user_guide.md` - AI behavior
- Various bug analysis and fix documentation (*.md in root)

**Important**: If you're a new AI assistant working on this codebase, read `docs/restart.md` for critical context on recent fixes, debug system usage, and development priorities.

## Development Philosophy

1. **Fail Fast**: Don't use defensive programming - throw clear errors instead of masking bugs with fallbacks
2. **Debug System**: ALWAYS use `debug(channel, message)` instead of `console.log()`
3. **Testing Mode**: Game currently configured with `NO_PERSISTENCE = true` for clean testing. Disable for production.
4. **Modular Systems**: Each ship system is independent, communicates via managers
5. **Card-Based Progression**: All ship capabilities derived from equipped cards
6. **Real-Time Synchronization**: Systems synchronize state changes immediately (e.g., WeaponSyncManager)
7. **Production Ready**: Core systems complete and tested, focus on polish and content expansion

## Quick Reference

### Essential Game Controls
- **ESC** - Help Screen 2.0 (modal interface with tabs)
- **TAB** - Cycle targets
- **Z, X** - Cycle sub-system targets
- **< , >** - Cycle weapon selection
- **SPACE** - Fire weapons
- **0-9 Keys** - Ship impulse engine speed
- **Arrow Keys** - Ship movement
- **S** - Toggle shields
- **D** - Damage control HUD
- **T** - Toggle target computer
- **G** - Galactic chart
- **L** - Long range scanner
- **M** - Mission status HUD

### Code Statistics
- JavaScript Files: ~7,700 LOC
- Python Files: ~3,300 LOC
- Architecture: Fully modular ES6+ with Three.js native physics
- Branch: `achievements` (active development)