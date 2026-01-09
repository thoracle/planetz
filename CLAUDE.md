# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**PlanetZ** (aka "Star F*ckers") is a 3D web-based spaceship simulation game featuring intergalactic exploration, trading, and combat. Built with Python/Flask backend and Three.js frontend, it combines classic space simulation elements with modern web technologies and an NFT-inspired card collection system for ship upgrades.

**Version**: 2.1.3-security-hardening
**Status**: Production-ready with persistence enabled
**Current Branch**: `main` (production)

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

#### Core Infrastructure (`frontend/static/js/core/`)

**GameObject Factory Pattern** - Single source of truth for all game objects:

- `GameObject.js` - Base class with immutable ID, computed diplomacy
  - Immutable: `id`, `type`, `name`, `sector`
  - Static: `faction`, `classification`
  - Mutable: `_position`, `_discovered`
  - Computed: `diplomacy` getter queries FactionStandingsManager dynamically

- `GameObjectFactory.js` - Singleton factory with validation
  - `createPlanet(data)`, `createStation(data)`, `createBeacon(data)`, `createShip(data)`
  - Throws on missing required fields (fail-fast pattern)

- `GameObjectRegistry.js` - Centralized registry with type/sector indexing
  - `getById(id)`, `getByType(type)`, `getBySector(sector)`
  - Per-sector storage with automatic cleanup on sector change

- `FactionStandingsManager.js` - Player faction standings singleton
  - `getStanding(faction)` → -100 to +100
  - `getDiplomacyStatus(faction)` → 'enemy' | 'neutral' | 'friendly'
  - `modifyStanding(faction, delta, reason)` → updates + notifies listeners

- `IDGenerator.js` - Consistent ID generation across all object types

#### Critical Architecture Notes

1. **ES6 Module System**: Frontend uses native ES6 imports/exports. All JavaScript files must use proper import/export syntax.

2. **Global Manager Access**:
   - `window.starfieldManager` - Primary game state
   - `window.spatialManager` - Object tracking
   - `window.collisionManager` - Collision detection

3. **Three.js Systems**: Game uses Three.js for 3D rendering, NOT Ammo.js physics. Collision detection is raycast-based via `SimpleCollisionManager.js`.

4. **GameObject Pattern**: All game objects (planets, moons, stations, beacons, ships) are created via `GameObjectFactory` and registered in `GameObjectRegistry`. Access diplomacy via `gameObject.diplomacy` getter which queries `FactionStandingsManager` dynamically.

5. **Equipment Synchronization**: After docking and equipment changes, `initializeShipSystems()` forces refresh of ship systems from card configuration. WeaponSyncManager ensures weapon HUD shows current loadout.

6. **Debug System**: Smart debug logging via `SmartDebugManager` with channel-based filtering. Debug channels configured in `frontend/static/js/debug-config.json`.

### Backend Architecture (Python/Flask)

**Entry Point**: `run.py` (development) or `main.py` (production)

#### Application Factory Pattern
`backend/__init__.py` defines `create_app(config_name)` factory:
- Registers blueprints for routes
- Configures static file serving from `frontend/static/`
- Initializes mission system

#### Route Blueprints (`backend/routes/`)
- `main.py` - Main HTML serving (with path traversal protection)
- `api.py` - Game API endpoints
- `universe.py` - Universe generation API
- `missions.py` - Mission system API

#### Security Infrastructure

**Authentication (`backend/auth.py`):**
Admin endpoints require authentication via `@require_admin_key` decorator:
- Protected endpoints: `/api/missions/admin/*`, `/api/debug-config`
- Auth via `X-Admin-Key` header or `admin_key` query parameter
- Set `ADMIN_API_KEY` environment variable (required even in DEBUG mode)
- Uses `hmac.compare_digest()` for timing-attack resistant comparison

**Rate Limiting (`backend/__init__.py`):**
Flask-Limiter protects all API endpoints:
- Global defaults: 200/day, 50/hour per IP
- Standard endpoints: 30 requests/minute
- Expensive endpoints (generation): 10 requests/minute
- Admin endpoints: 5 requests/minute

**CORS (`backend/__init__.py`):**
Flask-Cors with secure defaults:
- Production: Same-origin only (no cross-origin requests)
- Development: Allows `localhost:5001` and `127.0.0.1:5001`
- Configurable via `CORS_ORIGINS` env var (comma-separated)
- Exposes rate limit headers for frontend access

#### Input Validation (`backend/validation.py`)
Centralized validation module protects all API endpoints:

**Type Validators:**
- `validate_string(value, field_name, max_length, pattern, required)`
- `validate_int(value, field_name, min_val, max_val, required)`
- `validate_float(value, field_name, min_val, max_val, required)`
- `validate_bool(value, field_name, required)`
- `validate_list(value, field_name, max_length, item_validator, required)`
- `validate_dict(value, field_name, required)`
- `validate_enum(value, field_name, allowed_values, required)`

**Domain-Specific Validators:**
- `validate_mission_id(id)` - Alphanumeric + underscores/dashes, max 100 chars
- `validate_system_name(name)` - Ship system names, max 50 chars
- `validate_ship_type(type)` - Valid ship type identifiers
- `validate_faction(faction)` - Valid faction names
- `validate_coordinates(x, y, z)` - Range: -10000 to +10000
- `validate_seed(seed)` - Range: 0 to 2^32-1
- `validate_damage_amount(amount)` - Range: 0 to 10.0
- `validate_repair_amount(amount)` - Range: 0 to 1.0
- `validate_credits(credits)` - Range: 0 to 10^9
- `validate_num_systems(num)` - Range: 1 to 500 (DoS protection)

**Usage:**
```python
from backend.validation import (
    ValidationError, handle_validation_errors,
    validate_int, validate_string, validate_enum
)

@api_bp.route('/api/example', methods=['POST'])
@handle_validation_errors
def example_endpoint():
    data = request.get_json()
    amount = validate_int(data.get('amount'), 'amount', min_val=0, max_val=100)
    # ValidationError automatically returns 400 with field name and message
```

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

#### Production Mode (Default)
Game persistence is **enabled by default**. Player progress, discoveries, and missions are saved between sessions.

#### Testing Mode (URL Parameter)
To disable persistence for testing, add `?testing=true` to the URL:

```
http://localhost:5001/?testing=true
```

**What testing mode does:**
- Skips loading saved discovery state (fresh start each session)
- Skips saving discovery state to localStorage
- Skips loading/saving mission progress
- Shows "TESTING MODE" HUD notification on startup

**Implementation:**
```javascript
// StarfieldManager.js exports isTestingMode() and TESTING_CONFIG
const isTestingMode = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get('testing') === 'true';
};
```

Other modules import from StarfieldManager: `import { isTestingMode, TESTING_CONFIG } from './StarfieldManager.js'`

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
- Core infrastructure: `frontend/static/js/core/` (GameObject, Factory, Registry, FactionStandings)
- Ship systems: `frontend/static/js/ship/systems/`
- UI components: `frontend/static/js/ui/`
- View managers: `frontend/static/js/views/`
- Extracted managers: `frontend/static/js/managers/`
- Constants: `frontend/static/js/constants/`
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
After god class extraction refactoring, major files are now much smaller:
- `StarfieldManager.js` (~1,022 lines) - Core game coordinator (was 7,989 lines, -87%)
- `TargetComputerManager.js` (~1,301 lines) - Targeting logic (was 6,635 lines, -80%)
- `CardInventoryUI.js` (~2,386 lines) - Card management UI (was 2,717 lines, -12%)
- `ViewManager.js` (~862 lines) - View management (was 1,880 lines, -54%)
- `StarChartsManager.js` (~1,324 lines) - Star charts logic (was 1,976 lines, -33%)
- `DamageControlHUD.js` (~1,017 lines) - Damage control UI (was 1,849 lines, -45%)

Functionality has been extracted into focused manager classes in `frontend/static/js/managers/`.

## Recent Major Fixes (2025-2026)

### API Input Validation ✅ COMPLETED (2026-01)
- **Centralized Validation Module**: New `backend/validation.py` with reusable validators
- **Type Safety**: All API inputs validated for type, range, and format
- **DoS Protection**: `num_systems` capped at 500, coordinates capped at ±10000
- **Injection Prevention**: Pattern matching for mission IDs, system names (blocks `<script>` etc.)
- **Consistent Errors**: `@handle_validation_errors` decorator returns structured JSON errors
- **Protected Endpoints**: `api.py` (chunk-data, ship systems, station repair), `universe.py` (generate), `missions.py` (generate, cleanup)

### Security Hardening Phase 2 ✅ COMPLETED (2026-01)
- **Rate Limiting**: Flask-Limiter on all API endpoints (30/min standard, 10/min expensive, 5/min admin)
- **Admin Auth Fix**: Removed DEBUG mode bypass - authentication now always required
- **Timing Attack Fix**: Replaced custom `_secure_compare` with `hmac.compare_digest()`
- **CORS Configuration**: Flask-Cors with restrictive defaults, configurable via `CORS_ORIGINS` env var
- **Error Message Sanitization**: Replaced 27 instances of `str(e)` with generic "Internal server error"
- **JSON Parsing Safety**: Added try/except for `json.loads()` in missions endpoint
- **Print → Logger**: Replaced ~28 print statements with proper logger calls across 6 backend files
- **Key Files**: `backend/__init__.py`, `backend/auth.py`, `backend/routes/*.py`

### Security Hardening Phase 1 ✅ COMPLETED (2026-01)
- **Path Traversal Fix**: `/test/<path>` endpoint now validates filenames, whitelists extensions, checks resolved paths
- **Admin Authentication**: New `@require_admin_key` decorator protects admin endpoints
- **Production Mode Enabled**: `NO_PERSISTENCE=false` - game state, discoveries, missions now persist
- **Debug Flags Disabled**: `DEBUG_LOG_HITSCAN`, `DEBUG_PROJECTILES` set to false
- **Persistence Re-enabled**: `StarChartsManager.js` and `game_state.py` save/load functions restored
- **Key Files**: `backend/auth.py` (new), `backend/routes/main.py`, `backend/config.py`

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

### GameObject Factory Pattern Refactor ✅ COMPLETED (2026-01)
- **Single Source of Truth**: All game objects now created via `GameObjectFactory`
- **FactionStandingsManager**: Centralized faction standings (removed duplicate FACTION_RELATIONS from 3 files)
- **Computed Diplomacy**: `GameObject.diplomacy` getter queries standings dynamically
- **Discovery State**: `GameObject.discovered` is primary source (with cross-sector fallback)
- **Key Files**: `core/GameObject.js`, `core/GameObjectFactory.js`, `core/GameObjectRegistry.js`, `core/FactionStandingsManager.js`

## Known Issues & Technical Debt

### Browser Compatibility
- Requires WebGL support
- ES6 modules (no transpilation)
- Hardware acceleration recommended for Three.js rendering
- Test in Chrome/Firefox primarily

### Planned Architectural Refactoring (See docs/game_object_refactor_plan.md)

**Status**: GOD CLASS EXTRACTION COMPLETE - Remaining technical debt documented

The codebase has addressed major technical debt:

1. **God Classes** - ✅ RESOLVED - Major files extracted into focused managers:
   - `StarfieldManager.js`: 7,989 → 1,022 lines (-87%)
   - `TargetComputerManager.js`: 6,635 → 1,301 lines (-80%)
   - `CardInventoryUI.js`: 2,717 → 2,386 lines (-12%)
   - `ViewManager.js`: 1,880 → 862 lines (-54%)
   - `StarChartsManager.js`: 1,976 → 1,324 lines (-33%)
   - `DamageControlHUD.js`: 1,849 → 1,017 lines (-45%)

2. **Console.log Violations** - ✅ RESOLVED - All main code uses `debug()` system
   - Test files use console (intentional for test output)
   - DebugManager/ErrorReporter use console (they ARE the debug system)
   - Web workers use console (can't access debug system)

3. **Global State** - ✅ ANALYZED - Intentional service locator pattern, NOT pollution
   - Core service locators: `window.starfieldManager`, `window.targetComputerManager`, `window.spatialManager`, etc.
   - Debug utilities: `window.debug()`, `window.debugEnable()`, `window.errorReporter`, etc.
   - UI singletons: `window.communicationHUD`, `window.shipLog`, `window.cardRewardAnimator`
   - Ready flags: `window.starfieldManagerReady`, etc. for async initialization
   - Managed by `GlobalReferencesManager.js` with proper dispose() cleanup

4. **Memory Leaks** - ✅ ANALYZED - Comprehensive cleanup patterns already in place
   - AbortController pattern: `KeyboardInputManager.js` uses signal-based auto-cleanup
   - Handler tracking: `DCHSystemCardRenderer.js` tracked via parent's `_buttonHandlers` Map
   - DOM removal pattern: Modal elements removed from DOM auto-cleans listeners
   - All views/UI components have dispose() methods with removeEventListener

5. **Magic Numbers** - ✅ DOCUMENTED - Constants infrastructure exists, migration ongoing
   - Constants files in `frontend/static/js/constants/`:
     - `GameConstants.js` - Z_INDEX, UI_TIMING, PHYSICS, CAMERA, AUDIO, DISCOVERY
     - `ShipConstants.js` - SHIP_MOVEMENT, DOCKING, ENERGY consumption
     - `TargetingConstants.js` - WIREFRAME_COLORS, TARGETING_TIMING, TARGETING_RANGE
     - `WireframeTypes.js` - Object type to geometry mappings
   - **Usage**: Import constants instead of hardcoding values:
     ```javascript
     import { Z_INDEX, UI_TIMING } from '../constants/GameConstants.js';
     import { WIREFRAME_COLORS } from '../constants/TargetingConstants.js';
     ```
   - Legacy code still has ~1000 magic numbers; migrate when touching those files

6. **Timer Cleanup** - ✅ ANALYZED - Comprehensive cleanup infrastructure in place
   - `TimeoutManager.js` - Centralized wrapper with auto-cleanup on callback completion
   - `DisposalManager.js` - Cascading cleanup orchestration for all managers
   - `_pendingTimeouts` Set pattern - Used by 25+ files for tracking
   - Show/Hide pattern - UI components clear intervals when hidden
   - 103 explicit clearTimeout/clearInterval calls, 113 cleanup pattern usages
   - **Usage**: Use `this.sfm._setTimeout()` or implement `_pendingTimeouts` Set pattern

**GameObject Factory Pattern**: ✅ COMPLETE - Single source of truth for all game objects:
- `GameObject.js` - Base class with immutable ID, computed diplomacy
- `GameObjectFactory.js` - Singleton factory with validation (fail-fast)
- `GameObjectRegistry.js` - Centralized registry with type/sector indexing
- `FactionStandingsManager.js` - Player faction standings singleton (replaces duplicate FACTION_RELATIONS)
- `IDGenerator.js` - Consistent ID generation

Key integrations:
- `SolarSystemManager.js` - Creates planets/moons/stations via factory
- `EnemyShip.js` - Creates ships via factory with mesh linking
- `SCMDiscoveryProcessor.js` - Uses `GameObject.discovered` as primary source
- `TargetDiplomacyManager.js` - Uses `FactionStandingsManager.getDiplomacyStatus()`

**Philosophy**: Fail fast instead of defensive programming. When data is missing, throw clear errors pointing to the fix location rather than silently falling back to defaults that mask bugs.

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
3. **Single Source of Truth**: Use `GameObjectFactory` for object creation, `FactionStandingsManager` for faction standings, `GameObject.discovered` for discovery state
4. **Production Mode**: Game configured with `NO_PERSISTENCE = false` - progress persists between sessions
5. **Modular Systems**: Each ship system is independent, communicates via managers
6. **Card-Based Progression**: All ship capabilities derived from equipped cards
7. **Real-Time Synchronization**: Systems synchronize state changes immediately (e.g., WeaponSyncManager)
8. **Security First**: Admin endpoints protected via `@require_admin_key`, path traversal prevented
9. **Input Validation**: All API endpoints use `backend/validation.py` validators - never trust user input

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
- Branch: `main` (production)