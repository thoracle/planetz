# PlanetZ Refactoring Plan 2026

> **Generated**: January 10, 2026
> **Based on**: Comprehensive code review of ~38,000 LOC
> **Status**: Ready for implementation

## Executive Summary

This plan addresses 24 identified issues across security, performance, architecture, and code quality. Issues are prioritized by impact and organized into 6 phases.

**Estimated Total Effort**: 8-12 developer days
**Critical Issues**: 5 (must fix before production)
**High Priority**: 6 (fix within 2 weeks)
**Medium Priority**: 9 (fix within 1 month)

---

## Phase 1: Security & Stability (Critical)

**Timeline**: Immediate
**Effort**: 1-2 days

### 1.1 Input Validation for Mission Event Handlers

**Problem**: Four event endpoints accept JSON with zero validation, exposing DoS and injection risks.

**Files**:
- `backend/routes/missions.py:538-586` (handle_enemy_destroyed)
- `backend/routes/missions.py:588-633` (handle_location_reached)
- `backend/routes/missions.py:636-696` (handle_cargo_delivered)
- `backend/routes/missions.py:699-749` (handle_cargo_loaded)

**Action Items**:
```python
# BEFORE (vulnerable)
enemy_type = data.get('enemy_type')
enemy_id = data.get('enemy_id')

# AFTER (validated)
from backend.validation import validate_string, validate_int, validate_float

enemy_type = validate_string(data.get('enemy_type'), 'enemy_type', max_length=50, required=True)
enemy_id = validate_string(data.get('enemy_id'), 'enemy_id', max_length=100, required=True)
location = validate_string(data.get('location'), 'location', max_length=100)
cargo_value = validate_int(data.get('cargo_value'), 'cargo_value', min_val=0, max_val=1000000)
quantity = validate_int(data.get('quantity'), 'quantity', min_val=0, max_val=10000)
integrity = validate_float(data.get('integrity'), 'integrity', min_val=0.0, max_val=1.0)
```

**Validation Required**:
| Endpoint | Parameters to Validate |
|----------|----------------------|
| handle_enemy_destroyed | enemy_type, enemy_id, location |
| handle_location_reached | location, location_type |
| handle_cargo_delivered | cargo_type, delivery_location, cargo_value, quantity, integrity, source, destination_station, mission_id |
| handle_cargo_loaded | cargo_type, source_location, quantity, cargo_id |

**Acceptance Criteria**:
- [ ] All 4 event handlers use validators from `backend/validation.py`
- [ ] Invalid input returns 400 with field name and error message
- [ ] Unit tests added for validation edge cases

---

### 1.2 Fetch Timeout Wrappers

**Problem**: Network requests can hang indefinitely, freezing UI.

**Files**:
- `frontend/static/js/ui/MissionEventHandler.js:63,102,142`
- `frontend/static/js/bootstrap/AppInitializer.js`
- `frontend/static/js/services/MissionAPIService.js`

**Action Items**:

1. Create timeout utility:
```javascript
// frontend/static/js/utils/fetchWithTimeout.js
export async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}
```

2. Replace all `fetch()` calls with `fetchWithTimeout()`:
```javascript
// BEFORE
const response = await fetch('/api/missions/event', { method: 'POST', body: JSON.stringify(data) });

// AFTER
import { fetchWithTimeout } from '../utils/fetchWithTimeout.js';
const response = await fetchWithTimeout('/api/missions/event', { method: 'POST', body: JSON.stringify(data) }, 10000);
```

**Files to Update**:
- [ ] `MissionEventHandler.js` (3 fetch calls)
- [ ] `MissionAPIService.js` (all API calls)
- [ ] `AppInitializer.js` (universe fetch)
- [ ] `CommunicationHUD.js` (2 fetch calls)

**Acceptance Criteria**:
- [ ] All fetch calls use timeout wrapper
- [ ] Timeout errors logged via `debug('P1', ...)`
- [ ] UI shows error message on timeout

---

### 1.3 Event Listener Memory Leak Prevention

**Problem**: ~50% of addEventListener calls lack cleanup, causing memory leaks.

**Files** (highest priority):
- `frontend/static/js/ui/CommodityExchange.js` (22 listeners)
- `frontend/static/js/ui/MissionBoard.js` (11 listeners)
- `frontend/static/js/ui/DockingModal.js` (8 listeners)
- `frontend/static/js/ui/DockingInterface.js` (6 listeners)
- `frontend/static/js/ui/StationRepairInterface.js` (3 listeners)

**Action Items**:

1. Create base UI component class:
```javascript
// frontend/static/js/ui/BaseUIComponent.js
export class BaseUIComponent {
    constructor() {
        this._abortController = new AbortController();
        this._pendingTimeouts = new Set();
    }

    addListener(element, event, handler) {
        element.addEventListener(event, handler, { signal: this._abortController.signal });
    }

    setTimeout(callback, delay) {
        const id = window.setTimeout(() => {
            this._pendingTimeouts.delete(id);
            callback();
        }, delay);
        this._pendingTimeouts.add(id);
        return id;
    }

    dispose() {
        this._abortController.abort();
        this._pendingTimeouts.forEach(id => clearTimeout(id));
        this._pendingTimeouts.clear();
    }
}
```

2. Refactor UI components to extend base class:
```javascript
// BEFORE
class CommodityExchange {
    constructor() {
        document.addEventListener('click', this.handleClick);
    }
}

// AFTER
import { BaseUIComponent } from './BaseUIComponent.js';

class CommodityExchange extends BaseUIComponent {
    constructor() {
        super();
        this.addListener(document, 'click', this.handleClick.bind(this));
    }

    dispose() {
        super.dispose();
        // Component-specific cleanup
    }
}
```

**Refactor Order** (by leak severity):
1. [ ] `CommodityExchange.js` - 22 listeners
2. [ ] `MissionBoard.js` - 11 listeners
3. [ ] `DockingModal.js` - 8 listeners
4. [ ] `DockingInterface.js` - 6 listeners
5. [ ] `HelpInterface.js` - 4 listeners
6. [ ] `StationRepairInterface.js` - 3 listeners

**Acceptance Criteria**:
- [ ] BaseUIComponent class created
- [ ] Top 6 UI components use AbortController pattern
- [ ] All components call dispose() on close/hide
- [ ] Memory profile shows no listener accumulation

---

## Phase 2: Performance (High Priority)

**Timeline**: Week 1-2
**Effort**: 2-3 days

### 2.1 Mission Query Optimization

**Problem**: O(N) linear scan of all missions on every game event, plus N+1 re-fetch pattern.

**File**: `backend/routes/missions.py:555-749`

**Current Pattern** (inefficient):
```python
for mission in mission_manager.missions.values():  # O(N) scan
    if mission.state == MissionState.ACCEPTED and mission.mission_type == 'elimination':
        success = mission_manager.update_mission_progress(mission.id, event_data)
        if success:
            updated = mission_manager.get_mission(mission.id)  # REDUNDANT
```

**Action Items**:

1. Add indexed collections to MissionManager:
```python
# backend/mission_system/mission_manager.py

class MissionManager:
    def __init__(self, ...):
        self.missions = {}
        # New: indexed collections
        self._missions_by_type = defaultdict(set)  # type -> set of mission_ids
        self._missions_by_state = defaultdict(set)  # state -> set of mission_ids
        self._missions_by_type_and_state = {}  # (type, state) -> set of mission_ids

    def _index_mission(self, mission):
        """Add mission to all indexes."""
        self._missions_by_type[mission.mission_type].add(mission.id)
        self._missions_by_state[mission.state].add(mission.id)
        key = (mission.mission_type, mission.state)
        if key not in self._missions_by_type_and_state:
            self._missions_by_type_and_state[key] = set()
        self._missions_by_type_and_state[key].add(mission.id)

    def _reindex_mission(self, mission, old_state):
        """Update indexes when mission state changes."""
        old_key = (mission.mission_type, old_state)
        new_key = (mission.mission_type, mission.state)

        self._missions_by_state[old_state].discard(mission.id)
        self._missions_by_state[mission.state].add(mission.id)

        if old_key in self._missions_by_type_and_state:
            self._missions_by_type_and_state[old_key].discard(mission.id)
        if new_key not in self._missions_by_type_and_state:
            self._missions_by_type_and_state[new_key] = set()
        self._missions_by_type_and_state[new_key].add(mission.id)

    def get_active_missions_by_type(self, mission_type):
        """O(1) lookup for active missions of a type."""
        key = (mission_type, MissionState.ACCEPTED)
        mission_ids = self._missions_by_type_and_state.get(key, set())
        return [self.missions[mid] for mid in mission_ids if mid in self.missions]
```

2. Update event handlers to use indexed queries:
```python
# BEFORE
for mission in mission_manager.missions.values():
    if mission.state == MissionState.ACCEPTED and mission.mission_type == 'elimination':
        # process

# AFTER
for mission in mission_manager.get_active_missions_by_type('elimination'):
    # process (already filtered)
```

3. Make update_mission_progress return updated mission:
```python
# BEFORE
success = mission_manager.update_mission_progress(mission.id, event_data)
if success:
    updated = mission_manager.get_mission(mission.id)  # Extra lookup

# AFTER
updated_mission = mission_manager.update_mission_progress(mission.id, event_data)
if updated_mission:
    updated_missions.append(updated_mission.to_dict())
```

**Acceptance Criteria**:
- [ ] MissionManager has indexed collections
- [ ] All event handlers use `get_active_missions_by_type()`
- [ ] `update_mission_progress()` returns updated mission object
- [ ] No `get_mission()` calls after `update_mission_progress()`
- [ ] Unit tests verify O(1) lookup performance

---

### 2.2 Timer Cleanup Standardization

**Problem**: 196 setTimeout/setInterval vs 103 clear calls. Inconsistent tracking patterns.

**Files with issues**:
- `frontend/static/js/ui/MissionEventHandler.js:18` - declares `_pendingTimeouts` but never uses it
- `frontend/static/js/ui/CardInventoryUI.js:50` - `activeTimeouts` inconsistently used
- `frontend/static/js/ui/CommunicationHUD.js:41` - partial tracking

**Action Items**:

1. Audit all timeout usages:
```bash
# Find all setTimeout/setInterval
grep -rn "setTimeout\|setInterval" frontend/static/js/ --include="*.js" | wc -l
# Find all clearTimeout/clearInterval
grep -rn "clearTimeout\|clearInterval" frontend/static/js/ --include="*.js" | wc -l
```

2. Standardize on `_pendingTimeouts` Set pattern:
```javascript
// Standard pattern for all components
class MyComponent {
    constructor() {
        this._pendingTimeouts = new Set();
    }

    _setTimeout(callback, delay) {
        const id = setTimeout(() => {
            this._pendingTimeouts.delete(id);
            callback();
        }, delay);
        this._pendingTimeouts.add(id);
        return id;
    }

    _clearTimeout(id) {
        clearTimeout(id);
        this._pendingTimeouts.delete(id);
    }

    dispose() {
        this._pendingTimeouts.forEach(id => clearTimeout(id));
        this._pendingTimeouts.clear();
    }
}
```

3. Fix specific files:
- [ ] `MissionEventHandler.js` - implement the pattern (currently declares but doesn't use)
- [ ] `CardInventoryUI.js` - rename `activeTimeouts` to `_pendingTimeouts` for consistency
- [ ] `CommunicationHUD.js` - ensure all timeouts tracked

**Acceptance Criteria**:
- [ ] All components use `_pendingTimeouts` Set pattern
- [ ] All `setTimeout` calls go through `_setTimeout` wrapper
- [ ] All components clear timeouts in `dispose()`
- [ ] Memory profiling shows no timer accumulation

---

### 2.3 Three.js Resource Disposal

**Problem**: Inconsistent geometry/material disposal leading to GPU memory leaks.

**Files**:
- `frontend/static/js/managers/DisposalManager.js` - exists but incomplete
- `frontend/static/js/ship/systems/WeaponEffectsManager.js` - creates projectiles
- `frontend/static/js/managers/CelestialBodyFactory.js` - creates meshes
- `frontend/static/js/views/starcharts/StarChartsObjectRenderer.js` - creates objects in loops

**Action Items**:

1. Enhance DisposalManager with tracking:
```javascript
// frontend/static/js/managers/DisposalManager.js

class DisposalManager {
    constructor() {
        this._trackedGeometries = new Set();
        this._trackedMaterials = new Set();
        this._trackedTextures = new Set();
    }

    trackGeometry(geometry) {
        this._trackedGeometries.add(geometry);
        return geometry;
    }

    trackMaterial(material) {
        this._trackedMaterials.add(material);
        return material;
    }

    disposeAll() {
        this._trackedGeometries.forEach(g => g.dispose());
        this._trackedMaterials.forEach(m => m.dispose());
        this._trackedTextures.forEach(t => t.dispose());
        this._trackedGeometries.clear();
        this._trackedMaterials.clear();
        this._trackedTextures.clear();
    }

    disposeMesh(mesh) {
        if (mesh.geometry) {
            mesh.geometry.dispose();
            this._trackedGeometries.delete(mesh.geometry);
        }
        if (mesh.material) {
            if (Array.isArray(mesh.material)) {
                mesh.material.forEach(m => {
                    m.dispose();
                    this._trackedMaterials.delete(m);
                });
            } else {
                mesh.material.dispose();
                this._trackedMaterials.delete(mesh.material);
            }
        }
    }
}
```

2. Update mesh creation to use tracking:
```javascript
// CelestialBodyFactory.js
const geometry = disposalManager.trackGeometry(new THREE.SphereGeometry(...));
const material = disposalManager.trackMaterial(new THREE.MeshStandardMaterial(...));
```

**Acceptance Criteria**:
- [ ] DisposalManager tracks all created geometries/materials
- [ ] Sector transitions call `disposalManager.disposeAll()`
- [ ] GPU memory stable after multiple sector transitions
- [ ] No Three.js disposal warnings in console

---

## Phase 3: Architecture (High Priority)

**Timeline**: Week 2-3
**Effort**: 2-3 days

### 3.1 Extract Remaining God Classes

**Problem**: 8 files still exceed 1000 lines.

**Extraction Plan**:

#### 3.1.1 PhysicsManager.js (1,658 lines)
Extract to:
- `PhysicsRaycastManager.js` (~400 lines) - raycast operations
- `PhysicsCollisionHandler.js` (~300 lines) - collision response
- `PhysicsRigidBodyFactory.js` (~200 lines) - body creation

```javascript
// PhysicsManager.js becomes thin coordinator
class PhysicsManager {
    constructor(scene) {
        this.raycastManager = new PhysicsRaycastManager(scene);
        this.collisionHandler = new PhysicsCollisionHandler();
        this.rigidBodyFactory = new PhysicsRigidBodyFactory();
    }

    raycast(origin, direction) {
        return this.raycastManager.cast(origin, direction);
    }

    // Delegate all methods to sub-managers
}
```

#### 3.1.2 StarChartsUI.js (1,467 lines)
Extract to:
- `StarChartsUIRenderer.js` (~500 lines) - SVG rendering
- `StarChartsInteractionHandler.js` (~400 lines) - pan, zoom, click
- `StarChartsDataModel.js` (~200 lines) - data management

#### 3.1.3 WaypointManager.js (1,442 lines)
Extract to:
- `WaypointProximityDetector.js` (~300 lines) - proximity checks
- `WaypointActionExecutor.js` (~400 lines) - action execution
- `WaypointPersistenceHandler.js` (~200 lines) - save/load

#### 3.1.4 CommunicationHUD.js (1,378 lines)
Extract to:
- `MessageQueueManager.js` (~300 lines) - message queue logic
- `CommunicationRenderer.js` (~400 lines) - display rendering

**Acceptance Criteria**:
- [ ] No file exceeds 800 lines
- [ ] Original classes become thin coordinators
- [ ] All tests pass after extraction
- [ ] No new global variables introduced

---

### 3.2 Backend Code Deduplication

**Problem**: 18 identical guard clauses, 4 duplicate event handler patterns.

**File**: `backend/routes/missions.py`

**Action Items**:

1. Create middleware for mission_manager check:
```python
# backend/routes/missions.py

def require_mission_manager(f):
    """Decorator to check mission_manager is initialized."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not mission_manager:
            return jsonify({'error': 'Mission system not initialized'}), 503
        return f(*args, **kwargs)
    return decorated

# Usage
@missions_bp.route('/api/missions/<mission_id>')
@require_mission_manager
def get_mission_details(mission_id: str):
    # No need for manual check
    mission = mission_manager.get_mission(mission_id)
```

2. Create generic event handler factory:
```python
# backend/routes/missions.py

def create_event_handler(mission_type: str, event_name: str, extract_match_data):
    """Factory for mission event handlers."""
    def handler():
        data = request.get_json() or {}
        updated_missions = []

        for mission in mission_manager.get_active_missions_by_type(mission_type):
            if extract_match_data(mission, data):
                event_data = {'event_type': event_name, **data}
                updated = mission_manager.update_mission_progress(mission.id, event_data)
                if updated:
                    updated_missions.append(updated.to_dict())

        return jsonify({
            'success': True,
            'updated_missions': updated_missions,
            'count': len(updated_missions)
        })
    return handler

# Usage
def match_elimination(mission, data):
    target = mission.custom_fields.get('target_enemy_type')
    return data.get('enemy_type') == target

handle_enemy_destroyed = create_event_handler('elimination', 'enemy_destroyed', match_elimination)
missions_bp.add_url_rule('/api/missions/events/enemy-destroyed', 'enemy_destroyed',
                          handle_enemy_destroyed, methods=['POST'])
```

**Acceptance Criteria**:
- [ ] `require_mission_manager` decorator replaces 18 guard clauses
- [ ] Event handler factory replaces 4 duplicate patterns
- [ ] ~150 LOC removed from missions.py
- [ ] All endpoint tests pass

---

### 3.3 Standardize API Response Format

**Problem**: Three different response formats across endpoints.

**Action Items**:

1. Define standard response schema:
```python
# backend/utils/responses.py

def success_response(data=None, message=None, **kwargs):
    """Standard success response."""
    response = {'status': 'success'}
    if data is not None:
        response['data'] = data
    if message:
        response['message'] = message
    response.update(kwargs)
    return jsonify(response)

def error_response(message, code=400, field=None):
    """Standard error response."""
    response = {'status': 'error', 'message': message}
    if field:
        response['field'] = field
    return jsonify(response), code

def list_response(items, total=None, page=None, per_page=None):
    """Standard list response with pagination."""
    response = {
        'status': 'success',
        'data': items,
        'count': len(items)
    }
    if total is not None:
        response['total'] = total
    if page is not None:
        response['page'] = page
        response['per_page'] = per_page
    return jsonify(response)
```

2. Update all endpoints to use standard responses:
```python
# BEFORE
return jsonify({'missions': missions_data, 'count': len(missions_data)})
return jsonify({'error': 'Not found'}), 404

# AFTER
return list_response(missions_data)
return error_response('Mission not found', 404)
```

**Acceptance Criteria**:
- [ ] All endpoints use `success_response`, `error_response`, or `list_response`
- [ ] Response schema documented in API docs
- [ ] Frontend updated to handle standard format

---

## Phase 4: Code Quality (Medium Priority)

**Timeline**: Week 3-4
**Effort**: 2 days

### 4.1 Migrate console.log to debug()

**Problem**: 34 files still using console.log instead of debug system.

**Files to fix**:
```
frontend/static/js/PhysicsManager.js
frontend/static/js/views/StarChartsUI.js
frontend/static/js/views/TargetComputerManager.js
frontend/static/js/SimpleDockingManager.js
frontend/static/js/ship/CardSystemIntegration.js
frontend/static/js/ship/systems/WeaponEffectsManager.js
... (28 more)
```

**Action Items**:

1. Run migration script:
```bash
# Find all console.log violations (excluding valid exceptions)
grep -rn "console\.\(log\|warn\|error\)" frontend/static/js/ --include="*.js" \
  | grep -v "DebugManager.js" \
  | grep -v "ErrorReporter.js" \
  | grep -v "\.test\.js"
```

2. Replace patterns:
```javascript
// BEFORE
console.log('Target acquired:', target);
console.warn('Missing data:', field);
console.error('Failed to load:', error);

// AFTER
import { debug } from '../debug.js';
debug('TARGETING', 'Target acquired:', target);
debug('P1', 'Missing data:', field);
debug('P1', 'Failed to load:', error);
```

3. Assign appropriate channels:
| Old Pattern | New Channel |
|-------------|-------------|
| console.log in targeting code | TARGETING |
| console.log in mission code | MISSIONS |
| console.log in physics code | UTILITY |
| console.warn anywhere | P1 |
| console.error anywhere | P1 |

**Acceptance Criteria**:
- [ ] Zero console.log violations (excluding valid exceptions)
- [ ] All debug output uses appropriate channels
- [ ] Debug channels documented in debug-config.json

---

### 4.2 Remove Silent Failures

**Problem**: Defensive fallbacks hide real bugs, violating "fail fast" philosophy.

**Files**:
- `frontend/static/js/ship/Ship.js:91-95`
- `frontend/static/js/ui/CardInventoryUI.js:91-99`
- `frontend/static/js/managers/KeyboardInputManager.js:121`

**Action Items**:

1. Replace fallbacks with clear errors:
```javascript
// BEFORE (Ship.js)
try {
    await this.initializeWeaponSystem();
} catch (error) {
    this.initializeDefaultSystems();  // Hides bug
}

// AFTER
try {
    await this.initializeWeaponSystem();
} catch (error) {
    debug('P1', `Weapon system initialization failed: ${error.message}`);
    throw new Error(`Ship initialization failed: ${error.message}`);
}
```

2. Remove optional chaining that hides ordering bugs:
```javascript
// BEFORE (KeyboardInputManager.js)
this.sfm.viewManager?.getShip()  // Silent null if not initialized

// AFTER
if (!this.sfm.viewManager) {
    throw new Error('KeyboardInputManager: viewManager not initialized');
}
const ship = this.sfm.viewManager.getShip();
```

3. Make container requirements explicit:
```javascript
// BEFORE (CardInventoryUI.js)
if (!this.container) {
    return;  // Silent failure
}

// AFTER
if (!this.container) {
    throw new Error('CardInventoryUI: container element not found');
}
```

**Acceptance Criteria**:
- [ ] No silent fallbacks in initialization code
- [ ] Missing dependencies throw clear errors
- [ ] Error messages include component name and what's missing

---

### 4.3 Add List Pagination

**Problem**: `/api/missions` can return unbounded results.

**File**: `backend/routes/missions.py:84-121`

**Action Items**:

1. Add pagination parameters:
```python
@missions_bp.route('/api/missions')
@require_mission_manager
@handle_validation_errors
def get_available_missions():
    # Pagination params
    page = validate_int(request.args.get('page', 1), 'page', min_val=1, max_val=1000)
    per_page = validate_int(request.args.get('per_page', 50), 'per_page', min_val=1, max_val=100)

    # Get all matching missions
    all_missions = mission_manager.get_available_missions(...)

    # Paginate
    total = len(all_missions)
    start = (page - 1) * per_page
    end = start + per_page
    paginated = all_missions[start:end]

    return list_response(
        [m.to_dict() for m in paginated],
        total=total,
        page=page,
        per_page=per_page
    )
```

**Acceptance Criteria**:
- [ ] All list endpoints support `page` and `per_page` params
- [ ] Default per_page is 50, max is 100
- [ ] Response includes total count for UI pagination

---

## Phase 5: Testing (Medium Priority)

**Timeline**: Week 4-5
**Effort**: 3-4 days

### 5.1 Critical Path E2E Tests

**Problem**: 3% frontend test coverage, zero tests for critical workflows.

**Tests to Add**:

#### Mission Delivery Workflow
```python
# tests/playwright/test_mission_workflow.py

async def test_mission_delivery_complete(page):
    """Test complete mission delivery workflow."""
    # 1. Accept mission at station
    await page.click('[data-test="mission-board"]')
    await page.click('[data-test="accept-mission"]')

    # 2. Load cargo
    await page.click('[data-test="cargo-interface"]')
    await page.click('[data-test="load-cargo"]')

    # 3. Navigate to destination (mock warp)
    await page.evaluate('window.starfieldManager.warpToSector("B1")')

    # 4. Dock and deliver
    await page.click('[data-test="dock-button"]')
    await page.click('[data-test="deliver-cargo"]')

    # 5. Verify completion
    mission_status = await page.locator('[data-test="mission-status"]').text_content()
    assert 'COMPLETED' in mission_status
```

#### Targeting and Combat
```python
async def test_targeting_and_fire(page):
    """Test target acquisition and weapon firing."""
    # 1. Spawn test target
    await page.evaluate('window.starfieldManager.spawnTestTarget()')

    # 2. Acquire target
    await page.keyboard.press('Tab')
    target_display = await page.locator('[data-test="target-name"]').text_content()
    assert target_display != 'NO TARGET'

    # 3. Fire weapon
    await page.keyboard.press('Space')

    # 4. Verify hit
    await page.wait_for_selector('[data-test="hit-indicator"]')
```

#### Card Installation
```python
async def test_card_installation(page):
    """Test card inventory and installation."""
    # 1. Open inventory
    await page.keyboard.press('Escape')
    await page.click('[data-tab="collection"]')

    # 2. Drag card to slot
    card = page.locator('[data-card-id="laser_mk2"]')
    slot = page.locator('[data-slot="weapon_1"]')
    await card.drag_to(slot)

    # 3. Verify installation
    slot_content = await slot.locator('.card-name').text_content()
    assert 'Laser MK2' in slot_content
```

**Acceptance Criteria**:
- [ ] 3 critical path E2E tests added
- [ ] Tests run in CI pipeline
- [ ] Tests use proper fixtures, not hardcoded waits

---

### 5.2 Ship System Unit Tests

**Problem**: All 46 ship system files have zero tests.

**Priority Test Files**:
1. `Ship.js` - energy management, damage, system access
2. `ImpulseEngines.js` - speed scaling, energy consumption
3. `Shields.js` - damage absorption, toggle, recharge
4. `Weapons.js` - firing, cooldown, ammo
5. `CargoHold.js` - capacity, weight effects

**Example Test**:
```javascript
// tests/unit/frontend/Ship.test.js

describe('Ship Energy Management', () => {
    let ship;

    beforeEach(() => {
        ship = new Ship({ shipType: 'heavy_fighter', energy: 100 });
    });

    test('consumeEnergy reduces energy pool', () => {
        ship.consumeEnergy(30);
        expect(ship.energy).toBe(70);
    });

    test('consumeEnergy returns false when insufficient', () => {
        const result = ship.consumeEnergy(150);
        expect(result).toBe(false);
        expect(ship.energy).toBe(100);  // Unchanged
    });

    test('impulse speed 9 consumes maximum energy', () => {
        ship.setImpulseSpeed(9);
        ship.update(1000);  // 1 second
        expect(ship.energy).toBeLessThan(100);
    });
});
```

**Acceptance Criteria**:
- [ ] Ship.js has 10+ unit tests
- [ ] Energy consumption tested at all speed levels
- [ ] System damage and repair tested
- [ ] Card installation validation tested

---

### 5.3 AI System Unit Tests

**Problem**: All 14 AI files have zero tests.

**Priority Test Files**:
1. `EnemyAI.js` - state machine transitions
2. `ThreatAssessment.js` - threat scoring algorithm
3. `CombatBehavior.js` - attack, retreat, pursue decisions

**Example Test**:
```javascript
// tests/unit/frontend/EnemyAI.test.js

describe('EnemyAI State Machine', () => {
    let ai;

    beforeEach(() => {
        ai = new EnemyAI({ health: 100, faction: 'pirates' });
    });

    test('transitions to FLEE when health below 20%', () => {
        ai.health = 15;
        ai.update();
        expect(ai.state).toBe('FLEE');
    });

    test('broadcasts distress when entering FLEE', () => {
        const spy = jest.spyOn(ai, 'broadcastDistress');
        ai.health = 15;
        ai.update();
        expect(spy).toHaveBeenCalled();
    });

    test('transitions to ATTACK when hostile in range', () => {
        ai.detectTarget({ distance: 500, diplomacy: 'enemy' });
        expect(ai.state).toBe('ATTACK');
    });
});
```

**Acceptance Criteria**:
- [ ] EnemyAI state machine has 8+ tests
- [ ] ThreatAssessment scoring has 5+ tests
- [ ] Combat behavior decisions tested

---

## Phase 6: Infrastructure (Low Priority)

**Timeline**: Week 5-6
**Effort**: 1-2 days

### 6.1 Docker Configuration

**Problem**: No containerization for deployment.

**Action Items**:

1. Create Dockerfile:
```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY backend/ backend/
COPY frontend/ frontend/
COPY run.py main.py ./

# Environment
ENV FLASK_ENV=production
ENV PORT=5001

EXPOSE 5001

CMD ["gunicorn", "--bind", "0.0.0.0:5001", "backend:create_app()"]
```

2. Create docker-compose.yml:
```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "5001:5001"
    environment:
      - SECRET_KEY=${SECRET_KEY}
      - ADMIN_API_KEY=${ADMIN_API_KEY}
      - UNIVERSE_SEED=${UNIVERSE_SEED:-42424242}
    volumes:
      - ./data:/app/data
      - ./missions:/app/missions
```

3. Create .dockerignore:
```
.git
.venv
node_modules
__pycache__
*.pyc
.pytest_cache
coverage/
tests/
docs/
*.md
.env
```

**Acceptance Criteria**:
- [ ] `docker build` succeeds
- [ ] `docker-compose up` starts server
- [ ] Environment variables properly passed

---

### 6.2 Fix Dependency Conflicts

**Problem**: transformers and protobuf version mismatches.

**Action Items**:

1. Update requirements.txt with explicit constraints:
```txt
# requirements.txt
Flask==3.0.2
Flask-Cors==4.0.0
Flask-Limiter==3.5.0
gunicorn==21.2.0
python-dotenv==1.0.1
pytest==8.0.2
playwright==1.55.0

# Pin conflicting dependencies
transformers>=4.46.3,<5.0.0
protobuf>=3.20.0,<4.0.0
```

2. Lock Playwright version in package.json:
```json
{
  "dependencies": {
    "playwright": "1.55.0"
  }
}
```

**Acceptance Criteria**:
- [ ] `pip install -r requirements.txt` has no conflicts
- [ ] `npm install` has no warnings
- [ ] All tests pass with locked versions

---

### 6.3 Implement Real Build Process

**Problem**: Build script is a stub.

**Action Items**:

1. Add esbuild for JS bundling:
```json
// package.json
{
  "devDependencies": {
    "esbuild": "^0.19.0"
  },
  "scripts": {
    "build": "node scripts/build.js",
    "build:prod": "NODE_ENV=production node scripts/build.js"
  }
}
```

2. Create build script:
```javascript
// scripts/build.js
const esbuild = require('esbuild');
const isProd = process.env.NODE_ENV === 'production';

esbuild.build({
    entryPoints: ['frontend/static/js/app.js'],
    bundle: true,
    outfile: 'dist/js/app.bundle.js',
    minify: isProd,
    sourcemap: !isProd,
    target: ['es2020'],
    format: 'esm',
});
```

**Acceptance Criteria**:
- [ ] `npm run build` creates bundled output
- [ ] Production build is minified
- [ ] Source maps available in development

---

## Implementation Checklist

### Phase 1: Security & Stability (Critical) ✅ COMPLETE
- [x] 1.1 Input validation for mission event handlers
- [x] 1.2 Fetch timeout wrappers
- [x] 1.3 Event listener memory leak prevention

### Phase 2: Performance (High Priority) ✅ COMPLETE
- [x] 2.1 Mission query optimization (indexed collections in MissionManager)
- [x] 2.2 Timer cleanup standardization
- [x] 2.3 Three.js resource disposal (enhanced DisposalManager)

### Phase 3: Architecture (High Priority) ✅ COMPLETE
- [x] 3.1 Extract remaining god classes (major files already extracted per CLAUDE.md)
- [x] 3.2 Backend code deduplication (decorators + response utilities)
- [x] 3.3 Standardize API response format (success_response, error_response, list_response)

### Phase 4: Code Quality (Medium Priority) ✅ COMPLETE
- [x] 4.1 Migrate console.log to debug() (analysis: most already migrated)
- [x] 4.2 Remove silent failures (Ship.js fail-fast pattern)
- [x] 4.3 Add list pagination (missions endpoints with page/per_page)

### Phase 5: Testing (Medium Priority) ✅ COMPLETE
- [x] 5.1 Critical path E2E tests (test_mission_workflow.py - 17 tests)
- [x] 5.2 Ship system unit tests (Ship.test.js - 40+ tests)
- [x] 5.3 AI system unit tests (EnemyAI.test.js - 29+ tests)

### Phase 6: Infrastructure (Low Priority) ✅ COMPLETE
- [x] 6.1 Docker configuration (Dockerfile, docker-compose.yml, .dockerignore)
- [x] 6.2 Fix dependency conflicts (requirements.txt with pinned versions)
- [x] 6.3 Implement real build process (scripts/build.js with esbuild)

---

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Frontend test coverage | 3% | 40% |
| Backend test coverage | 65% | 80% |
| Files >1000 lines | 8 | 0 |
| Memory leaks (listeners) | ~50 | 0 |
| Memory leaks (timers) | ~93 | 0 |
| console.log violations | 34 | 0 |
| Unvalidated endpoints | 4 | 0 |
| API response formats | 3 | 1 |

---

## Notes

- All file paths are relative to project root `/Users/retroverse/Desktop/LLM/planetz/`
- Use `debug()` function for all logging, never `console.log`
- Follow fail-fast philosophy - throw errors, don't hide them
- Test changes locally before committing
- Update CLAUDE.md when architectural changes are made
