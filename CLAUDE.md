# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PlanetZ** (aka "Star F*ckers") is a 3D web-based spaceship simulation game featuring intergalactic exploration, trading, and combat. Built with Python/Flask backend and Three.js frontend, it combines classic space simulation elements with modern web technologies and an NFT-inspired card collection system for ship upgrades.

**Version**: 2.1.0-atomic-discovery
**Status**: Production-ready (~98% complete)

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

### Frontend Code Style
1. **Manager Initialization**: Managers created in `app.js`, stored as module-level variables, and exposed globally via `window.*` when needed
2. **Async Initialization**: Use `waitForStarfieldManager()` utility for safe async access to game managers
3. **Event Handling**: Keyboard input handled centrally in ViewManager, delegated to active systems
4. **System Communication**: Systems communicate via manager references, not direct coupling

### Backend Code Style
1. **Blueprint Registration**: All routes use Flask blueprints with URL prefixes
2. **API Design**: RESTful endpoints return JSON, errors use standard HTTP codes
3. **Logging**: Use Flask app logger, configured in `create_app()`

### Debug System Usage
```javascript
import { debug } from './debug.js';

// Log to specific channel (see debug-config.json for channels)
debug('SHIP', 'Ship position:', ship.position);
debug('TARGETING', 'Target acquired:', target.id);

// Channels: SHIP, WEAPONS, AI, TARGETING, DISCOVERY, etc.
```

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

## Known Issues & Quirks

### Equipment Synchronization (RESOLVED)
Fixed: `initializeShipSystems()` now properly refreshes card system during launch. WeaponSyncManager ensures weapon HUD matches current loadout immediately after equipment changes.

### Targeting Computer Cooldown (RESOLVED)
Fixed: Reduced cooldown from 30s to 10s with clear "TARGETING SYSTEMS WARMING UP" feedback and countdown timer.

### Mission Persistence
Testing mode currently clears missions between sessions (`NO_PERSISTENCE = true`). For production, set to `false` in `StarfieldManager.js`.

### Browser Compatibility
- Requires WebGL support
- ES6 modules (no transpilation)
- Hardware acceleration recommended for Three.js rendering
- Test in Chrome/Firefox primarily

## MCP Playwright Integration

The project uses MCP Playwright server for automated testing. See `.cursorrules` for details:
- Use MCP tools for Star Charts testing
- `setup_test_environment` before running tests
- Real-time test results via MCP server output

## Documentation

Comprehensive docs in `docs/` directory:
- `system_architecture.md` - UML diagrams and architecture
- `spaceships_spec.md` - Card system specification
- `implementation_status.md` - Current status
- `faction_guide.md` - Faction system
- `ai_system_user_guide.md` - AI behavior
- Various bug analysis and fix documentation (*.md in root)

## Development Philosophy

1. **Testing Mode**: Game currently configured with `NO_PERSISTENCE = true` for clean testing. Disable for production.
2. **Modular Systems**: Each ship system is independent, communicates via managers
3. **Card-Based Progression**: All ship capabilities derived from equipped cards
4. **Real-Time Synchronization**: Systems synchronize state changes immediately (e.g., WeaponSyncManager)
5. **Production Ready**: Core systems complete and tested, focus on polish and content expansion