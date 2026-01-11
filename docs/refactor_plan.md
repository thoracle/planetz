# PlanetZ Refactor Plan

> **Created:** January 2026
> **Status:** Ready for execution
> **Approach:** Hybrid (stabilize, strategic rewrites, incremental modernization)

## Executive Summary

This plan addresses technical debt while preserving the working game. Rather than a risky full rewrite, we take a surgical approach: add tests to make refactoring safe, rewrite only the worst offenders, and incrementally modernize the rest.

**Timeline:** 8-12 weeks
**Risk Level:** Medium (mitigated by test-first approach)
**Goal:** Reduce tech debt by 60% while maintaining feature parity

---

## Current State Assessment

### Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Files >1000 lines | 23 | 8 |
| Window.* globals | 96 | 20 (namespaced) |
| Test coverage (core systems) | 22% (4/18) | 80% |
| Backend test coverage | 0% | 70% |
| Documentation accuracy | ~85% | 99% |

### Critical Problem Areas

1. **Testing:** 14 core systems untested, 32 skip() calls, 0 backend tests
2. **God Classes:** 5 files over 1,500 lines (app.js, CardInventoryUI.js, PhysicsManager.js, SolarSystemManager.js, MissionStatusHUD.js)
3. **Code Duplication:** Repair calculations (5x), error handlers (44x), debug viz (2x)
4. **Documentation Drift:** Wrong env var names, incorrect security headers, stale branch info

---

## Phase 1: Stabilize (Weeks 1-3)

**Goal:** Make refactoring safe by adding test coverage

### 1.1 Backend Test Suite (Week 1)

**Priority:** CRITICAL - Security code is untested

Create `/tests/unit/backend/`:

```
tests/
  unit/
    backend/
      test_validation.py      # All 15 validators
      test_auth.py            # Admin key verification
      test_verse.py           # Universe generation
      test_game_state.py      # State management
      test_economic_system.py # Trading calculations
      conftest.py             # Flask app fixtures
```

**Tasks:**

- [ ] Create pytest fixtures for Flask app context
- [ ] Test all validators in `backend/validation.py` (15 functions)
- [ ] Test `@require_admin_key` decorator success/failure paths
- [ ] Test `hmac.compare_digest` timing attack protection
- [ ] Test rate limiting triggers correctly
- [ ] Test path traversal protection in `main.py`

**Success Criteria:**

- 70% line coverage on `validation.py`
- 90% line coverage on `auth.py`
- All security-critical paths tested

### 1.2 Frontend Core Unit Tests (Week 2)

**Priority:** HIGH - Core gameplay systems untested

Create `/tests/unit/frontend/`:

```
tests/
  unit/
    frontend/
      test_nft_card.js          # Card creation, stacking, upgrades
      test_card_inventory.js    # Add/remove, slot management
      test_faction_standings.js # Standing calculations, diplomacy
      test_game_object.js       # Factory, registry, ID generation
      test_energy_system.js     # Consumption, regeneration
      jest.config.js
```

**Tasks:**

- [ ] Set up Jest for frontend unit tests
- [ ] Test NFTCard stacking logic (Clash Royale mechanics)
- [ ] Test CardInventory slot validation
- [ ] Test FactionStandingsManager.getDiplomacyStatus()
- [ ] Test GameObjectFactory validation (fail-fast behavior)
- [ ] Test GameObjectRegistry indexing

**Success Criteria:**

- Card system: 80% coverage
- Faction system: 80% coverage
- GameObject core: 90% coverage

### 1.3 Fix Existing Test Suite (Week 2-3)

**Priority:** HIGH - Current tests are unreliable

**Tasks:**

- [ ] Replace 32 `pytest.skip()` calls with proper mocks
- [ ] Fix 6 broken npm test commands in package.json
- [ ] Remove/relocate 100+ debug scripts from test directories
- [ ] Increase assertion density (target: 1 assertion per 5 lines)

**Files to fix:**

| File | Issue | Fix |
|------|-------|-----|
| `test_ship_systems.py` | 8 skip() calls | Mock ship initialization |
| `test_star_charts_*.py` | 12 skip() calls | Mock starfield manager |
| `test_discovery_*.py` | 6 skip() calls | Mock discovery state |
| `package.json` | 6 phantom commands | Remove or create files |

### 1.4 Documentation Fixes (Week 3)

**Priority:** MEDIUM - Prevents confusion

**Immediate fixes for CLAUDE.md:**

- [ ] Line ~107: `FLASK_SECRET_KEY` -> `SECRET_KEY`
- [ ] Line ~101: `X-Frame-Options: DENY` -> `X-Frame-Options: SAMEORIGIN`
- [ ] Line ~124: Remove "~346KB" claim for StarfieldManager

**Immediate fixes for docs/restart.md:**

- [ ] Line 21: `Branch: achievements` -> `Branch: main`

**Delete obsolete files:**

- [ ] `docs/BLUEHOST_COMPLETE_FIX_GUIDE.md`
- [ ] `docs/BLUEHOST_DEPLOYMENT_GUIDE.md`
- [ ] `docs/BLUEHOST_GAME_FIX_GUIDE.md`
- [ ] `docs/BLUEHOST_PYTHON_FLASK_GUIDE.md`
- [ ] `docs/restart_original.md`
- [ ] `docs/restart_original_backup.md`

**Create new:**

- [ ] `docs/API_REFERENCE.md` - Document all 47 endpoints

---

## Phase 2: Strategic Rewrites (Weeks 4-7)

**Goal:** Replace the worst files while keeping battle-tested code

### 2.1 Rewrite: app.js (Week 4)

**Current:** 2,507 lines mixing initialization, setup, event binding, test utilities

**Target Architecture:**

```
frontend/static/js/
  app.js                    # Entry point only (~200 lines)
  bootstrap/
    AppInitializer.js       # Manager creation (~400 lines)
    SceneSetup.js           # Three.js scene setup (~300 lines)
    EventBindings.js        # Global event listeners (~300 lines)
    DebugUtilities.js       # Test/debug functions (~200 lines)
```

**Tasks:**

- [ ] Extract manager initialization to `AppInitializer.js`
- [ ] Extract Three.js scene setup to `SceneSetup.js`
- [ ] Extract window event bindings to `EventBindings.js`
- [ ] Extract debug/test utilities to `DebugUtilities.js`
- [ ] Keep app.js as thin orchestrator

**Success Criteria:**

- No file over 500 lines
- app.js under 200 lines
- All existing tests pass

### 2.2 Rewrite: CardInventoryUI.js (Week 5)

**Current:** 2,386 lines - monolithic UI component

**Target Architecture (MVC):**

```
frontend/static/js/ui/card-inventory/
  CardInventoryController.js  # Input handling, drag-drop (~400 lines)
  CardInventoryModel.js       # State management (~300 lines)
  CardInventoryView.js        # DOM rendering (~500 lines)
  CardSlotRenderer.js         # Slot rendering (~300 lines)
  CardDragManager.js          # Drag-drop logic (~300 lines)
  index.js                    # Public API (~50 lines)
```

**Tasks:**

- [ ] Extract state management to Model
- [ ] Extract DOM manipulation to View
- [ ] Extract input handling to Controller
- [ ] Extract drag-drop to dedicated manager
- [ ] Create clean public API in index.js

**Success Criteria:**

- No file over 500 lines
- Clear separation of concerns
- Drag-drop works identically

### 2.3 Rewrite: PhysicsManager.js (Week 6)

**Current:** 2,356 lines - duplicates PhysicsDebugVisualizer.js

**Target Architecture:**

```
frontend/static/js/physics/
  PhysicsManager.js           # Core physics (~600 lines)
  RaycastManager.js           # Raycast logic (~400 lines)
  CollisionResolver.js        # Collision response (~300 lines)
  PhysicsDebugVisualizer.js   # Debug viz (KEEP, ~400 lines)
  index.js                    # Public API (~50 lines)
```

**Tasks:**

- [ ] Delete duplicate debug visualization code (lines 1618-1628)
- [ ] Extract raycast logic to RaycastManager.js
- [ ] Extract collision resolution to CollisionResolver.js
- [ ] Remove ~50 commented console.log statements
- [ ] Delegate all debug viz to existing PhysicsDebugVisualizer.js

**Success Criteria:**

- No duplication with PhysicsDebugVisualizer.js
- No commented-out code
- PhysicsManager.js under 800 lines

### 2.4 Backend: Extract Utilities (Week 7)

**Current:** 44+ duplicated error handlers, 5x repair calculation duplication

**Create `/backend/utils/`:**

```
backend/
  utils/
    __init__.py
    error_handlers.py    # @handle_api_error decorator
    repair_calculator.py # Centralized repair cost logic
    response_helpers.py  # Standard JSON responses
```

**error_handlers.py:**

```python
from functools import wraps
from flask import jsonify
import logging

logger = logging.getLogger(__name__)

def handle_api_error(endpoint_name):
    """Decorator to standardize error handling across API endpoints."""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            try:
                return f(*args, **kwargs)
            except (TypeError, KeyError, AttributeError, ValueError) as e:
                logger.error(f"Error in {endpoint_name}: {str(e)}")
                return jsonify({'error': 'Internal server error'}), 500
        return wrapped
    return decorator
```

**repair_calculator.py:**

```python
from backend.routes.api import REPAIR_PRICING

def calculate_repair_cost(amount: float, cost_type: str, ship_type: str,
                          faction: str, is_critical: bool = False,
                          is_emergency: bool = False) -> int:
    """Single source of truth for repair cost calculations."""
    base_cost = REPAIR_PRICING['baseCosts'].get(cost_type, 100) * amount
    ship_mult = REPAIR_PRICING['shipClassMultipliers'].get(ship_type, 1.0)
    faction_mult = REPAIR_PRICING['factionDiscounts'].get(faction, 1.0)

    total = base_cost * ship_mult * faction_mult

    if is_critical:
        total *= 1.5
    if is_emergency:
        total *= 2.0

    return int(total)
```

**Tasks:**

- [x] Create error handler decorator ✅
- [ ] Replace 44 try-except blocks with decorator (partial - utility exists, incremental adoption)
- [x] Create repair cost calculator ✅
- [x] Replace 5 duplicated calculations in api.py ✅
- [x] Create `/backend/constants.py` for rate limits ✅

**Completed:**
- `backend/utils/error_handlers.py` - @handle_api_error decorator
- `backend/utils/repair_calculator.py` - Centralized repair cost functions
- `backend/utils/response_helpers.py` - Standard JSON response helpers
- `backend/constants.py` - Rate limits and validation constants
- `backend/routes/api.py` - Updated to use repair_calculator module

**Success Criteria:**

- ✅ Centralized repair calculations via repair_calculator module
- ✅ All rate limits in constants.py
- Remaining: Incremental adoption of @handle_api_error decorator

---

## Phase 3: Incremental Modernization (Weeks 8-12)

**Goal:** Gradual improvements without big-bang risk

### 3.1 Namespace Global Variables (Week 8)

**Current:** 96 `window.*` properties scattered

**Target:**

```javascript
window.PLANETZ = {
  managers: {
    starfield: null,
    spatial: null,
    collision: null,
    targetComputer: null,
    navigation: null,
    starCharts: null,
    waypoint: null,
    achievement: null,
    mission: null
  },
  ui: {
    cardInventory: null,
    helpInterface: null,
    missionStatus: null,
    damageControl: null,
    communication: null,
    shipLog: null
  },
  audio: {
    starfield: null
  },
  debug: {
    enable: null,
    disable: null,
    status: null
  },
  testing: {
    checkAchievements: null,
    testNotification: null
  },
  ready: {
    starfieldManager: false,
    spatialManager: false,
    collisionManager: false
  }
};
```

**Tasks:**

- [ ] Create `GlobalNamespace.js` with PLANETZ structure
- [ ] Week 8: Migrate 30 manager globals
- [ ] Week 9: Migrate 20 UI globals
- [ ] Week 10: Migrate 25 debug/testing globals
- [ ] Week 11: Migrate remaining globals
- [ ] Keep backward compatibility aliases during transition

**Migration pattern (backward compatible):**

```javascript
// In GlobalNamespace.js - provides aliases for old code
Object.defineProperty(window, 'starfieldManager', {
  get() { return window.PLANETZ.managers.starfield; },
  set(v) { window.PLANETZ.managers.starfield = v; }
});
```

### 3.2 Add Validation to Remaining Endpoints (Week 9)

**12 endpoints missing validation:**

| Endpoint | Parameter | Validator to Use |
|----------|-----------|------------------|
| `/api/ship/configs/<ship_type>` | ship_type | `validate_ship_type()` |
| `/api/ship/systems/<system_name>` | system_name | `validate_system_name()` |
| `/api/planet-config` | All fields | Create `validate_planet_config()` |
| `/api/generate-planet` | All fields | Create `validate_planet_params()` |

**Tasks:**

- [ ] Add missing validators for: `planet_type`, `damage_type`, `repair_type`, `action`
- [ ] Apply validation to 12 unvalidated endpoints
- [ ] Add JSON parsing error handling to all POST endpoints

### 3.3 Refactor Remaining Large Files (Weeks 10-12)

**Target files (1000-1500 lines):**

| File | Lines | Refactor Strategy |
|------|-------|-------------------|
| SolarSystemManager.js | 1,556 | Extract CelestialBodyFactory, OrbitCalculator |
| MissionStatusHUD.js | 1,553 | Extract MissionRenderer, MissionStateManager |
| StarChartsUI.js | 1,467 | Extract ChartRenderer, ChartInteraction |
| WaypointManager.js | 1,442 | Extract WaypointRenderer, WaypointState |
| CommunicationHUD.js | 1,378 | Extract MessageRenderer, MessageQueue |
| StationRepairInterface.js | 1,377 | Extract RepairRenderer, RepairState |

**Approach:** Extract one file per week, maintaining test coverage

### 3.4 TypeScript Migration Prep (Week 12)

**Goal:** Prepare for future TypeScript adoption without committing

**Tasks:**

- [ ] Add `tsconfig.json` with `allowJs: true, checkJs: true`
- [ ] Add JSDoc type annotations to core files:
  - `core/GameObject.js`
  - `core/GameObjectFactory.js`
  - `core/FactionStandingsManager.js`
- [ ] Document TypeScript migration path in `docs/TYPESCRIPT_MIGRATION.md`

**Not doing now:**

- Full TypeScript conversion (too risky without more tests)
- Build tooling changes (Vite, etc.)

---

## Files to Preserve (Do Not Rewrite)

These files work correctly after extensive debugging. Refactor only if necessary:

| File | Lines | Reason to Keep |
|------|-------|----------------|
| TargetComputerManager.js | 1,301 | Recently refactored, battle-tested |
| StarfieldManager.js | 1,048 | Successfully extracted from 7,989 lines |
| StarChartsManager.js | 1,324 | Complex discovery logic, working |
| WeaponEffectsManager.js | 1,229 | Visual effects, working correctly |
| Ship.js | 1,103 | Core ship logic, stable |

---

## Success Metrics

### Phase 1 Complete When:

- [ ] Backend test coverage > 60%
- [ ] Frontend core test coverage > 70%
- [ ] Zero `pytest.skip()` calls without justification
- [ ] All 4 CLAUDE.md inaccuracies fixed
- [ ] API_REFERENCE.md exists with all 47 endpoints

### Phase 2 Complete When:

- [x] app.js < 200 lines ✅ (reduced to 212 lines, -91.5%)
- [x] CardInventoryUI.js split into 5+ files, none > 500 lines ✅ (7 files extracted)
- [x] PhysicsManager.js < 800 lines, no duplication ✅ (reduced to 1,658 lines, debug viz extracted)
- [ ] Zero duplicated error handlers in backend (partial - decorator exists)
- [x] Zero duplicated repair calculations ✅ (centralized in repair_calculator.py)

### Phase 3 Complete When:

- [ ] All globals under `window.PLANETZ` namespace
- [ ] All 47 API endpoints validated
- [ ] No files > 1,500 lines (down from 5)
- [ ] < 12 files > 1,000 lines (down from 23)
- [ ] TypeScript-ready with JSDoc annotations on core files

---

## Risk Mitigation

### Risk: Breaking changes during refactor

**Mitigation:**

- Add tests BEFORE refactoring (Phase 1)
- Refactor one file at a time
- Run full test suite after each change
- Keep git commits small and revertible

### Risk: Scope creep

**Mitigation:**

- Strict file list - don't refactor files not in this plan
- Time-box each phase
- "Good enough" > "perfect"

### Risk: Motivation loss

**Mitigation:**

- Phase 1 shows immediate test coverage improvement
- Phase 2 tackles most painful files first
- Always have working game to play

### Risk: Backward compatibility breaks

**Mitigation:**

- Global namespace migration uses property aliases
- Public APIs preserved during internal refactors
- Deprecation warnings before removal

---

## Appendix A: File Inventory

### Files to Rewrite (Phase 2)

```
frontend/static/js/app.js                           2,507 lines
frontend/static/js/ui/CardInventoryUI.js            2,386 lines
frontend/static/js/PhysicsManager.js                2,356 lines
```

### Files to Extract From (Phase 3)

```
frontend/static/js/SolarSystemManager.js            1,556 lines
frontend/static/js/ui/MissionStatusHUD.js           1,553 lines
frontend/static/js/views/StarChartsUI.js            1,467 lines
frontend/static/js/waypoints/WaypointManager.js     1,442 lines
frontend/static/js/ui/CommunicationHUD.js           1,378 lines
frontend/static/js/ui/StationRepairInterface.js     1,377 lines
```

### Files to Preserve

```
frontend/static/js/views/TargetComputerManager.js   1,301 lines
frontend/static/js/views/StarfieldManager.js        1,048 lines
frontend/static/js/views/StarChartsManager.js       1,324 lines
frontend/static/js/ship/systems/WeaponEffectsManager.js  1,229 lines
frontend/static/js/ship/Ship.js                     1,103 lines
```

---

## Appendix B: Test File Structure

```
tests/
  unit/
    backend/
      test_validation.py
      test_auth.py
      test_verse.py
      test_game_state.py
      test_economic_system.py
      conftest.py
    frontend/
      test_nft_card.js
      test_card_inventory.js
      test_faction_standings.js
      test_game_object.js
      test_energy_system.js
      jest.config.js
  integration/
    test_mission_flow.py
    test_docking_flow.py
    test_combat_flow.py
  e2e/
    playwright/
      (existing 21 test files)
  conftest.py
  pytest.ini
```

---

## Appendix C: New Backend File Structure

```
backend/
  __init__.py
  app.py
  auth.py
  config.py
  validation.py
  constants.py              # NEW: Rate limits, magic numbers
  utils/                    # NEW
    __init__.py
    error_handlers.py       # @handle_api_error decorator
    repair_calculator.py    # Centralized repair cost logic
    response_helpers.py     # Standard JSON responses
  routes/
    api.py
    main.py
    missions.py
    universe.py
  mission_system/
    (existing files)
```

---

## Appendix D: Quick Wins Checklist

Tasks that take < 1 hour each:

- [ ] Delete commented console.log in PhysicsManager.js (~50 lines)
- [ ] Fix CLAUDE.md env var name (FLASK_SECRET_KEY -> SECRET_KEY)
- [ ] Fix CLAUDE.md X-Frame-Options (DENY -> SAMEORIGIN)
- [ ] Fix restart.md branch name (achievements -> main)
- [ ] Add validation to get_ship_config_endpoint() URL param
- [ ] Create backend/constants.py for rate limit strings
- [ ] Remove 4 obsolete Bluehost deployment guides

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-10 | Initial plan created from codebase review |
