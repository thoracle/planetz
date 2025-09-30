# Game Object Data Architecture Refactor Plan

**Date**: September 30, 2025  
**Status**: PLANNING - Technical Debt Documentation  
**Priority**: MEDIUM - Not blocking, but important for maintainability  
**Author**: Engineering Team

---

## 🎯 **Problem Statement**

Game objects (planets, moons, stations, ships) have **multiple sources of truth** for core properties like `faction`, `diplomacy`, `type`, `position`, etc.

This leads to:
- ❌ **Data inconsistencies** (different values depending on code path)
- ❌ **Fallback chains** (check source 1, then 2, then 3, then 4...)
- ❌ **Race conditions** (data A loads before data B, stale values)
- ❌ **Hard to debug** (which source has the "real" value?)
- ❌ **Hard to maintain** (update in 5 places to change one thing)

---

## 📊 **Current Architecture Issues**

### **Issue #1: Faction/Diplomacy Data Scattered Across Multiple Sources**

**Current flow** (`TargetComputerManager.js:getTargetDiplomacy()`):

```javascript
// Step 1: Check targetData.diplomacy (from target list)
if (targetData.diplomacy && targetData.diplomacy !== 'unknown') {
    return targetData.diplomacy;
}

// Step 2: Check targetData.faction (from target list)
if (targetData.faction && targetData.faction !== 'Unknown') {
    return this.getFactionDiplomacy(targetData.faction);
}

// Step 3: Check targetData.ship.diplomacy (from ship instance)
if (targetData.ship?.diplomacy) {
    return targetData.ship.diplomacy;
}

// Step 4: Check getCelestialBodyInfo() (from SolarSystemManager)
const info = this.solarSystemManager?.getCelestialBodyInfo(...);
if (info?.diplomacy) {
    return info.diplomacy;
}

// Step 4.5: Check getCelestialBodyInfo().faction (FALLBACK!)
if (info?.faction) {
    return this.getFactionDiplomacy(info.faction);
}

// Step 5: Type-based defaults
if (targetData.type === 'station') {
    return 'neutral';
}
```

**5+ different sources for the same data!**

### **Issue #2: Position Data Scattered**

Same object's position can be:
- `body.position` (Three.js Vector3)
- `targetData.position` (Array [x, y, z])
- `targetData.cartesianPosition` (Array [x, y, z])
- `obj.position` (Array)
- `getCelestialBodyInfo(obj).position` (computed)

### **Issue #3: Discovery Status Scattered**

- `targetData.discovered` (Boolean in target list)
- `StarChartsManager.isDiscovered(id)` (Set lookup)
- `this.isObjectDiscovered(targetData)` (wrapper function)
- `targetData._isUndiscovered` (flag)

### **Issue #4: Type Information Scattered**

- `targetData.type` (string from Star Charts)
- `info.type` (string from SolarSystemManager)
- `targetData.isShip` (Boolean flag)
- `targetData.isSpaceStation` (Boolean flag)
- `targetData.isWaypoint` (Boolean flag)
- Type inference from name patterns

---

## ✅ **Proposed Solution: Unified GameObject Class**

### **Design Goals**

1. **Single Source of Truth**: One canonical data model per object
2. **Immutable Core**: Core properties (ID, type, name) never change
3. **Reactive Updates**: Derived properties (distance, discovered) update automatically
4. **Type Safety**: Clear interfaces for each object type
5. **Performance**: Efficient lookups, minimal redundancy

### **Architecture Proposal**

#### **Singleton GameObject Factory**

All game objects MUST be created through the factory to ensure:
- ✅ Consistent ID generation
- ✅ Proper attribute initialization
- ✅ Registration in global registry
- ✅ Validation of required fields
- ✅ No duplicate IDs

```javascript
/**
 * GameObjectFactory - Singleton factory for creating all game objects
 * CRITICAL: This is the ONLY way to create game objects
 */
class GameObjectFactory {
    static instance = null;
    
    static getInstance() {
        if (!GameObjectFactory.instance) {
            GameObjectFactory.instance = new GameObjectFactory();
        }
        return GameObjectFactory.instance;
    }
    
    constructor() {
        if (GameObjectFactory.instance) {
            throw new Error('GameObjectFactory is a singleton. Use getInstance()');
        }
        this.registry = new GameObjectRegistry();
        this.idGenerator = new IDGenerator();
    }
    
    /**
     * Create a planet
     * REQUIRED FIELDS: name, sector, position, faction
     */
    createPlanet(data) {
        this._validateRequired(data, ['name', 'sector', 'position', 'faction']);
        
        const id = this.idGenerator.generatePlanetId(data.name, data.sector);
        
        // ASSERT: ID must be unique
        if (this.registry.getById(id)) {
            throw new Error(`Duplicate planet ID: ${id}. Fix data source.`);
        }
        
        const planet = new GameObject({
            id,
            type: 'planet',
            ...data
        });
        
        this.registry.register(planet);
        return planet;
    }
    
    /**
     * Create a station
     * REQUIRED FIELDS: name, sector, position, faction, stationType
     */
    createStation(data) {
        this._validateRequired(data, ['name', 'sector', 'position', 'faction', 'stationType']);
        
        const id = this.idGenerator.generateStationId(data.name, data.sector);
        
        // ASSERT: ID must be unique
        if (this.registry.getById(id)) {
            throw new Error(`Duplicate station ID: ${id}. Fix data source.`);
        }
        
        const station = new GameObject({
            id,
            type: data.stationType, // "Defense Platform", "Research Station", etc.
            ...data
        });
        
        this.registry.register(station);
        return station;
    }
    
    /**
     * Create a beacon
     * REQUIRED FIELDS: name, sector, position
     */
    createBeacon(data) {
        this._validateRequired(data, ['name', 'sector', 'position']);
        
        const id = this.idGenerator.generateBeaconId(data.name, data.sector);
        
        if (this.registry.getById(id)) {
            throw new Error(`Duplicate beacon ID: ${id}. Fix data source.`);
        }
        
        const beacon = new GameObject({
            id,
            type: 'navigation_beacon',
            faction: 'Neutral', // Beacons are always neutral
            ...data
        });
        
        this.registry.register(beacon);
        return beacon;
    }
    
    /**
     * Create a ship
     * REQUIRED FIELDS: name, faction, shipType, position
     */
    createShip(data) {
        this._validateRequired(data, ['name', 'faction', 'shipType', 'position']);
        
        const id = this.idGenerator.generateShipId(data.name);
        
        if (this.registry.getById(id)) {
            throw new Error(`Duplicate ship ID: ${id}. Fix ship spawning logic.`);
        }
        
        const ship = new GameObject({
            id,
            type: 'enemy_ship',
            sector: 'dynamic', // Ships can move between sectors
            ...data
        });
        
        this.registry.register(ship);
        return ship;
    }
    
    /**
     * Validate required fields - FAIL FAST
     */
    _validateRequired(data, requiredFields) {
        const missing = requiredFields.filter(field => !data[field]);
        
        if (missing.length > 0) {
            throw new Error(
                `Missing required fields: ${missing.join(', ')}. ` +
                `Object: ${JSON.stringify(data, null, 2)}. ` +
                `FIX DATA SOURCE - do not add fallbacks!`
            );
        }
    }
    
    /**
     * Get the global registry
     */
    getRegistry() {
        return this.registry;
    }
}

/**
 * IDGenerator - Consistent ID generation for all object types
 */
class IDGenerator {
    /**
     * Generate planet ID: "A0_terra_prime"
     */
    generatePlanetId(name, sector) {
        const normalized = this._normalizeName(name);
        return `${sector}_${normalized}`;
    }
    
    /**
     * Generate station ID: "A0_europa_research_station"
     */
    generateStationId(name, sector) {
        const normalized = this._normalizeName(name);
        return `${sector}_${normalized}`;
    }
    
    /**
     * Generate beacon ID: "A0_navigation_beacon_1"
     */
    generateBeaconId(name, sector) {
        const normalized = this._normalizeName(name);
        return `${sector}_${normalized}`;
    }
    
    /**
     * Generate ship ID: "ship_crimson_raider_001"
     */
    generateShipId(name) {
        const normalized = this._normalizeName(name);
        return `ship_${normalized}`;
    }
    
    /**
     * Normalize name to valid ID format
     */
    _normalizeName(name) {
        return name
            .toLowerCase()
            .replace(/\s+/g, '_')           // Spaces to underscores
            .replace(/[^a-z0-9_]/g, '')    // Remove special chars
            .replace(/^_+|_+$/g, '');      // Trim underscores
    }
}

/**
 * Base GameObject - Single source of truth for all game objects
 */
class GameObject {
    constructor(data) {
        // IMMUTABLE CORE PROPERTIES (set once, never change)
        this.id = data.id;                    // "A0_terra_prime"
        this.name = data.name;                // "Terra Prime"
        this.type = data.type;                // "planet" | "moon" | "station" | "ship" | etc.
        this.sector = data.sector;            // "A0"
        
        // STATIC PROPERTIES (from data files, rarely change)
        this.faction = data.faction;          // "Terran Republic Alliance" | "Neutral" | etc.
        this.classification = data.classification; // "Terrestrial Planet", "Gas Giant", etc.
        
        // MUTABLE PROPERTIES (can change during gameplay)
        this._position = data.position;       // Vector3 or [x, y, z]
        this._discovered = false;             // Discovery status
        
        // REFERENCES (to other systems)
        this._threeObject = null;             // Reference to Three.js mesh
        this._shipInstance = null;            // Reference to Ship instance (if ship)
        
        // COMPUTED PROPERTIES (calculated on demand)
        // Distance, diplomacy, etc. calculated from core properties
    }
    
    // COMPUTED: Diplomacy (derived from faction)
    get diplomacy() {
        // Single calculation, no fallbacks needed
        return GameObject.factionToDiplomacy(this.faction);
    }
    
    // COMPUTED: Position (always returns Vector3)
    get position() {
        if (this._threeObject) {
            return this._threeObject.position; // Live position from scene
        }
        return this._position; // Fallback to stored position
    }
    
    // COMPUTED: Discovered status
    get discovered() {
        return this._discovered;
    }
    
    set discovered(value) {
        if (this._discovered !== value) {
            this._discovered = value;
            this.emit('discovered', this); // Event for UI updates
        }
    }
    
    // COMPUTED: Distance to player
    getDistanceTo(playerPosition) {
        return this.position.distanceTo(playerPosition);
    }
    
    // TYPE CHECKING
    isType(type) {
        return this.type === type;
    }
    
    isPlanet() { return this.type === 'planet'; }
    isMoon() { return this.type === 'moon'; }
    isStation() { return this.type.toLowerCase().includes('station'); }
    isShip() { return this.type === 'ship' || this.type === 'enemy_ship'; }
    
    // STATIC UTILITIES
    static factionToDiplomacy(faction) {
        // Single source of truth for faction → diplomacy mapping
        const factionRelations = {
            'Terran Republic Alliance': 'friendly',
            'Zephyrian Collective': 'friendly',
            'Scientists Consortium': 'friendly',
            'Free Trader Consortium': 'neutral',
            'Nexus Corporate Syndicate': 'neutral',
            'Ethereal Wanderers': 'neutral',
            'Draconis Imperium': 'neutral',
            'Crimson Raider Clans': 'enemy',
            'Shadow Consortium': 'enemy',
            'Void Cult': 'enemy',
            'Neutral': 'neutral'
        };
        
        return factionRelations[faction] || 'neutral';
    }
}

/**
 * GameObject Registry - Manages all game objects
 */
class GameObjectRegistry {
    constructor() {
        this._objects = new Map(); // id → GameObject
        this._objectsByType = new Map(); // type → Set<GameObject>
        this._objectsBySector = new Map(); // sector → Set<GameObject>
    }
    
    // REGISTRATION
    register(gameObject) {
        this._objects.set(gameObject.id, gameObject);
        
        // Index by type
        if (!this._objectsByType.has(gameObject.type)) {
            this._objectsByType.set(gameObject.type, new Set());
        }
        this._objectsByType.get(gameObject.type).add(gameObject);
        
        // Index by sector
        if (!this._objectsBySector.has(gameObject.sector)) {
            this._objectsBySector.set(gameObject.sector, new Set());
        }
        this._objectsBySector.get(gameObject.sector).add(gameObject);
    }
    
    // LOOKUP
    getById(id) {
        return this._objects.get(id);
    }
    
    getByType(type) {
        return Array.from(this._objectsByType.get(type) || []);
    }
    
    getBySector(sector) {
        return Array.from(this._objectsBySector.get(sector) || []);
    }
    
    // QUERIES
    getNearby(position, radius, type = null) {
        const nearby = [];
        const objects = type ? this.getByType(type) : Array.from(this._objects.values());
        
        for (const obj of objects) {
            if (obj.getDistanceTo(position) <= radius) {
                nearby.push(obj);
            }
        }
        
        return nearby;
    }
    
    getDiscovered() {
        return Array.from(this._objects.values()).filter(obj => obj.discovered);
    }
}
```

---

## 🚫 **Critical Philosophy Change: Fail Fast, Not Defensive**

### **Current Problem: Defensive Programming Masks Bugs**

**Bad Pattern (Current Code):**
```javascript
// Defensive: Hides the bug
const faction = targetData.faction || info?.faction || 'Unknown';
// → Bug silently masked, returns 'Unknown', UI shows wrong color

// Defensive: Multiple fallbacks
const position = obj.position || obj.cartesianPosition || [0, 0, 0];
// → Bug silently masked, object at wrong position

// Defensive: Default to success
if (!this.currentTarget) {
    return; // Silently fail
}
```

**Good Pattern (After Refactor):**
```javascript
// Assertive: Fail fast, surface the bug
const faction = gameObject.faction;
if (!faction) {
    throw new Error(
        `GameObject ${gameObject.id} missing faction. ` +
        `FIX DATA SOURCE in starter_system_infrastructure.json`
    );
}

// Assertive: No fallbacks
const position = gameObject.position;
if (!position) {
    throw new Error(
        `GameObject ${gameObject.id} missing position. ` +
        `FIX: Object creation in GameObjectFactory.createPlanet()`
    );
}

// Assertive: Assert preconditions
if (!this.currentTarget) {
    throw new Error(
        'updateTargetDisplay called with no target. ' +
        'FIX: Check calling code in cycleTarget()'
    );
}
```

### **Benefits of Fail-Fast**

1. **Bugs Surface Immediately** in development
   - Instead of: "Why is this station showing wrong faction?" (hours of debugging)
   - You get: "Missing faction in starter_system_infrastructure.json line 182" (fix in 2 minutes)

2. **Clear Error Messages** point to the fix
   - Not: "Faction is undefined" (where? why?)
   - But: "GameObject A0_callisto_defense_platform missing faction. FIX DATA SOURCE"

3. **No Silent Failures** that corrupt game state
   - Instead of object at [0,0,0] breaking collision detection
   - Crash immediately with clear stack trace

4. **Easier Debugging**
   - Stack trace shows exact call path
   - Error message tells you what to fix
   - No hunting through 5 fallback layers

### **Migration Strategy for Fail-Fast**

**Phase 0: Add Assertions (Before GameObject Refactor)**

Add assertions to current code to surface bugs:

```javascript
// In TargetComputerManager.js
getTargetDiplomacy(targetData) {
    // ASSERT: targetData must exist
    if (!targetData) {
        throw new Error('getTargetDiplomacy called with null/undefined targetData');
    }
    
    // Try to get faction from multiple sources
    const faction = targetData.faction || 
                   this.solarSystemManager?.getCelestialBodyInfo(...)?.faction;
    
    // ASSERT: We must have a faction by now
    if (!faction || faction === 'Unknown') {
        console.error('Missing faction data:', {
            id: targetData.id,
            name: targetData.name,
            type: targetData.type,
            targetData
        });
        throw new Error(
            `No valid faction for ${targetData.name}. ` +
            `FIX: Add faction to data source or object creation`
        );
    }
    
    return this.getFactionDiplomacy(faction);
}
```

This will immediately surface all the places where faction data is missing!

**Phase 1-6: GameObject Refactor** (as planned below)

During refactor, replace fallbacks with assertions in factory:

```javascript
// GameObjectFactory.createStation()
_validateRequired(data, ['name', 'sector', 'position', 'faction']);
// → Throws if faction missing, forces fix at data source
```

---

## 🔄 **Migration Plan**

### **Phase 0: Add Assertions to Current Code** (Week 0 - BEFORE refactor)

**Goal**: Surface hidden bugs before refactoring

1. ✅ Add assertions to `getTargetDiplomacy()` for missing faction
2. ✅ Add assertions to `getTargetPosition()` for missing position  
3. ✅ Add assertions to `getCurrentTargetData()` for null checks
4. ✅ Add assertions to object creation for required fields
5. ✅ Run game in dev mode, fix all assertion failures
6. ✅ Document all data source fixes needed

**Expected**: 10-20 assertion failures revealing bugs
**Benefit**: Clean data before refactor starts

### **Phase 1: Create GameObject Infrastructure** (Week 1)

1. ✅ Create `GameObject` base class
2. ✅ Create `GameObjectFactory` singleton with validation
3. ✅ Create `GameObjectRegistry` singleton
4. ✅ Create `IDGenerator` for consistent IDs
5. ✅ Add unit tests for all classes
6. ✅ Document GameObject API and factory usage

**No changes to existing code yet - just infrastructure**

### **Phase 2: Integrate Factory with SolarSystemManager** (Week 2)

1. ✅ Replace manual celestial body creation with `GameObjectFactory`
2. ✅ Load `starter_system_infrastructure.json` through factory
3. ✅ Factory validates all required fields (fail fast if missing)
4. ✅ GameObjects auto-registered in global registry
5. ✅ Add `GameObject` reference to Three.js mesh `userData`
6. ✅ Keep existing `getCelestialBodyInfo()` working (backward compatibility)

**Before:**
```javascript
// SolarSystemManager manually creates station
const station = createSpaceStation({
    name: data.name,
    position: data.position,
    // faction missing! Bug silently masked ❌
});
```

**After:**
```javascript
// Factory creates and validates
const factory = GameObjectFactory.getInstance();
const station = factory.createStation({
    name: data.name,
    sector: 'A0',
    position: data.position,
    faction: data.faction, // ← REQUIRED, throws if missing ✅
    stationType: data.type
});
// → Automatically registered, ID generated, validated
```

**Existing code still works, but new GameObject system available**

### **Phase 3: Migrate TargetComputerManager** (Week 3)

1. ✅ Change target list to store GameObject references instead of plain data
2. ✅ Replace `getTargetDiplomacy()` with `gameObject.diplomacy`
3. ✅ **Remove ALL fallback chains** - assert instead
4. ✅ Replace `getCurrentTargetData()` to return GameObject directly
5. ✅ Remove `processTargetData()` enrichment (no longer needed)

**Before:**
```javascript
// 5-step fallback chain - masks bugs
const diplomacy = this.getTargetDiplomacy(currentTargetData);
// → Checks 5 sources, silently falls back to 'neutral'
```

**After:**
```javascript
// Direct access - fails fast if wrong
const diplomacy = currentTarget.diplomacy;
// → Single source, throws if GameObject malformed

// Or with assertion:
if (!currentTarget) {
    throw new Error('updateTargetDisplay: no currentTarget');
}
const diplomacy = currentTarget.diplomacy;
```

### **Phase 4: Migrate StarChartsManager** (Week 4)

1. ✅ Use GameObjectRegistry for object lookups
2. ✅ Discovery status updates GameObject directly
3. ✅ Remove duplicate object data storage
4. ✅ Use GameObject.discovered instead of separate Set

### **Phase 5: Migrate Remaining Systems** (Week 5-6)

1. ✅ Update ProximityDetector3D
2. ✅ Update StarChartsUI
3. ✅ Update NavigationBeacons
4. ✅ Update DockingManager

### **Phase 6: Remove Legacy Code & Fallbacks** (Week 7)

1. ✅ Remove `processTargetData()` (no longer needed)
2. ✅ Remove `getCurrentTargetData()` fallback chains
3. ✅ Remove `getCelestialBodyInfo()` (replaced by GameObject)
4. ✅ Remove ALL defensive fallbacks (|| 'Unknown', || [0,0,0], etc.)
5. ✅ Replace with assertions where appropriate
6. ✅ Clean up duplicate data structures
7. ✅ Verify all objects created through factory

**Checklist for removing each fallback:**
- [ ] Identify the fallback pattern
- [ ] Find root cause (why is data missing?)
- [ ] Fix at source (data file or factory)
- [ ] Replace fallback with assertion
- [ ] Test that assertion catches bugs in dev
- [ ] Remove fallback code

---

## 📈 **Benefits After Refactor**

### **Code Quality**
- ✅ **No more fallback chains** - Single source of truth
- ✅ **Type safety** - Clear GameObject interface
- ✅ **Easier debugging** - One place to check for data
- ✅ **Easier testing** - Mock one GameObject instead of 5 systems

### **Performance**
- ✅ **Less memory** - No duplicate data storage
- ✅ **Faster lookups** - Direct property access instead of chain
- ✅ **Better caching** - Computed properties cached automatically

### **Maintainability**
- ✅ **Add new properties once** - In GameObject class
- ✅ **Update logic once** - In GameObject getters
- ✅ **Clear ownership** - GameObject owns its data
- ✅ **Easier onboarding** - Single class to understand

---

## ⚠️ **Risks & Mitigation**

### **Risk 1: Breaking Changes**
**Mitigation**: 
- Phase migration over 6-7 weeks
- Keep backward compatibility during migration
- Extensive testing at each phase

### **Risk 2: Performance Regression**
**Mitigation**:
- Benchmark before/after each phase
- Optimize GameObject getters (caching, lazy evaluation)
- Profile in production scenarios

### **Risk 3: Incomplete Migration**
**Mitigation**:
- Clear migration checklist per system
- Dedicated refactor branch
- Code review at each phase
- Don't merge until Phase 6 complete

---

## 📝 **Current Workarounds to Remove**

These are all **technical debt** that the refactor will eliminate:

### **Defensive Fallbacks to Remove:**

1. **`getTargetDiplomacy()` fallback chain** ← Current issue
   - Location: `TargetComputerManager.js:2097-2150`
   - Workaround: 5-step fallback to find faction
   - **Why bad**: Masks missing faction in data source
   - After refactor: `gameObject.faction` throws if missing
   - Fix: Add faction to `starter_system_infrastructure.json`

2. **`processTargetData()` enrichment**
   - Location: `TargetComputerManager.js:3775-3970`
   - Workaround: Merges data from multiple sources
   - **Why bad**: Hides which source is authoritative
   - After refactor: GameObject has all data at creation
   - Fix: Factory validates required fields

3. **`getCurrentTargetData()` search**
   - Location: `TargetComputerManager.js:3484-3607`
   - Workaround: Searches target list for matching object
   - **Why bad**: O(n) search, falls back to direct object
   - After refactor: Direct GameObject reference
   - Fix: Store GameObject in currentTarget, not Three.js mesh

4. **Duplicate position storage**
   - Location: Multiple files
   - Workaround: `position`, `cartesianPosition`, `body.position`
   - **Why bad**: Can desync, unclear which is canonical
   - After refactor: Single `gameObject.position` getter
   - Fix: GameObject.position returns live Three.js position

5. **Discovery state scattered**
   - Location: StarChartsManager + TargetComputerManager
   - Workaround: Sync between multiple data structures
   - **Why bad**: Can desync, causes duplicate discoveries
   - After refactor: Single `gameObject.discovered` property
   - Fix: GameObject owns its discovered state

6. **Faction='Unknown' placeholder**
   - Location: `TargetComputerManager.js:1894-1896`
   - Workaround: Set `faction: 'Unknown'` for undiscovered objects
   - **Why bad**: 'Unknown' is truthy, flows through code, causes today's bug
   - After refactor: GameObject always has real faction
   - Fix: Separate `discovered` property gates visibility

7. **Silent null returns**
   - Location: Throughout codebase
   - Workaround: `if (!obj) return;` or `if (!obj) return null;`
   - **Why bad**: Silently fails, caller doesn't know why
   - After refactor: Throw with descriptive error
   - Fix: `if (!obj) throw new Error('Expected obj, got null')`

8. **Default position [0,0,0]**
   - Location: Multiple position handling functions
   - Workaround: `position || [0, 0, 0]`
   - **Why bad**: Object at solar center breaks gameplay
   - After refactor: Factory requires position, throws if missing
   - Fix: Validate position in data files

### **Pattern to Follow for Each Removal:**

```javascript
// BEFORE (Defensive):
function getObjectFaction(obj) {
    return obj?.faction || obj?.info?.faction || 'Unknown'; // Masks bugs
}

// AFTER (Assertive):
function getObjectFaction(obj) {
    if (!obj) {
        throw new Error('getObjectFaction: obj is null/undefined');
    }
    if (!obj.faction) {
        throw new Error(
            `GameObject ${obj.id} missing faction. ` +
            `FIX: Add faction in GameObjectFactory.create${obj.type}()`
        );
    }
    return obj.faction;
}

// BEST (After GameObject Refactor):
function getObjectFaction(gameObject) {
    return gameObject.faction; // Guaranteed to exist or factory threw
}
```

---

## 🎯 **Success Metrics**

After refactor is complete:

### **Code Quality:**
- ✅ **Zero fallback chains** for core properties (faction, diplomacy, type, position)
- ✅ **Zero defensive `||` operators** that mask bugs
- ✅ **All objects created through factory** (grep for `new GameObject` returns 0 outside factory)
- ✅ **100% of objects have validated IDs** (factory generates all IDs)
- ✅ **Single data structure** per object (GameObject)
- ✅ **50% reduction** in target-related code complexity

### **Reliability:**
- ✅ **Zero discovery sync bugs** (single source of truth)
- ✅ **Fail-fast assertions** catch bugs immediately in dev
- ✅ **Clear error messages** point to exact fix needed
- ✅ **No silent failures** (removed all defensive returns)

### **Performance:**
- ✅ **Improved performance** (benchmark TBD)
- ✅ **O(1) object lookups** (registry by ID)
- ✅ **No redundant data copies**

### **Testing:**
- ✅ **100% test coverage** for GameObject class
- ✅ **100% test coverage** for GameObjectFactory
- ✅ **Integration tests** for all object types
- ✅ **Assertion tests** (verify failures happen correctly)

---

## 📌 **Action Items**

### **Immediate (This Sprint)**
- [x] Document the problem (this file)
- [ ] Get team buy-in for refactor
- [ ] Create refactor branch: `feature/game-object-refactor`
- [ ] Prioritize in backlog

### **Next Sprint**
- [ ] Implement GameObject class
- [ ] Add unit tests
- [ ] Phase 1 complete

### **Future Sprints**
- [ ] Phase 2-6 as scheduled
- [ ] Final migration
- [ ] Remove legacy code

---

## 🔗 **Related Issues**

These bugs were caused by the scattered data architecture:

1. **Station Wireframe Race Condition** (commit `2b39168`)
   - Root cause: Target list has `faction='Unknown'`, but `getCelestialBodyInfo()` has real faction
   - Would not exist with GameObject (single source)

2. **Proximity Discovery Broken** (commit `eb2bd31`)
   - Root cause: Position data from two different sources didn't match
   - Would not exist with GameObject (single position)

3. **Duplicate Discovery Messages** (commit `555c3ec`)
   - Root cause: Discovery state in multiple places
   - Would not exist with GameObject (single discovered flag)

---

## 📚 **References**

- **Current Fallback Pattern**: `TargetComputerManager.js:getTargetDiplomacy()`
- **Data Enrichment**: `TargetComputerManager.js:processTargetData()`
- **Position Handling**: `StarChartsManager.js:getScenePosition()`
- **Discovery State**: `StarChartsManager.js:discoveredObjects` Set

---

## 💭 **Notes for Future Developers**

### **Core Principles**

> "There should be one source of truth for data like faction and it should always be available."
> — Senior Engineer, September 30, 2025

> "Refactor code to use a singleton game object factory to create all objects like beacons, stations, planets, moons, ships, etc. and ensure they have proper ids and other attributes."
> — Senior Engineer, September 30, 2025

> "Refactor code to remove defensive programming fallbacks that mask bugs in favor of asserting on failure and failing fast so we can fix bugs."
> — Senior Engineer, September 30, 2025

### **Why This Matters**

This refactor addresses **two core architectural issues**:

1. **No Single Source of Truth**: Each system maintained its own view of the same data
   - SolarSystemManager has celestial body info
   - StarChartsManager has discovery state
   - TargetComputerManager has target data
   - All three can disagree!

2. **Defensive Programming Hides Bugs**: Fallbacks mask root causes
   - `faction || 'Unknown'` → Why is faction missing? Never know!
   - `position || [0,0,0]` → Object at sun center, breaks game
   - `if (!obj) return;` → Silent failure, caller doesn't know

### **The GameObject Pattern**

The GameObject + Factory pattern is **standard in game development** for exactly these reasons:

1. **Factory ensures data quality** at creation
2. **GameObject provides single source** of truth
3. **Assertions catch bugs** immediately in development
4. **Clear error messages** make fixing fast

### **Code Smells to Watch For**

❌ **Fallback chain**: `a || b || c || 'default'`  
✅ **Assertion**: `if (!a) throw new Error('Missing a')`

❌ **Silent return**: `if (!obj) return;`  
✅ **Fail fast**: `if (!obj) throw new Error('obj required')`

❌ **Multiple sources**: Check A, then B, then C  
✅ **Single source**: `gameObject.property`

❌ **Defensive default**: `position || [0, 0, 0]`  
✅ **Required field**: Factory validates or throws

### **When to Add Assertions**

Add assertions for:
- ✅ **Preconditions**: "This function requires X"
- ✅ **Required data**: "This object must have Y"
- ✅ **Invariants**: "This should never happen"

Don't add assertions for:
- ❌ **Expected errors**: User input validation (use proper error handling)
- ❌ **Runtime conditions**: Network failures, file not found (use try/catch)
- ❌ **Business logic**: "Player can't afford this" (use if/else)

### **Migration Philosophy**

**Don't just refactor code - fix the architecture that caused the bugs.**

When you see defensive code, ask:
1. Why is the data missing?
2. Where should it come from?
3. How can we guarantee it's there?
4. What should happen if it's not?

Then fix at the source, not with a fallback.

---

**Status**: PLANNED - Waiting for prioritization  
**Estimated Effort**: 7 weeks (including Phase 0 assertions)  
**Technical Debt Interest**: HIGH (causes bugs, slows development)  
**Risk**: MEDIUM (big refactor, but phased approach mitigates)  
**Reward**: HIGH (eliminates entire class of bugs)
