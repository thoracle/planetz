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

```javascript
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

## 🔄 **Migration Plan**

### **Phase 1: Create GameObject Infrastructure** (Week 1)

1. ✅ Create `GameObject` base class
2. ✅ Create `GameObjectRegistry` singleton
3. ✅ Add unit tests for GameObject
4. ✅ Document GameObject API

**No changes to existing code yet - just infrastructure**

### **Phase 2: Integrate with SolarSystemManager** (Week 2)

1. ✅ When `SolarSystemManager` creates celestial bodies, also create GameObjects
2. ✅ Register GameObjects in global registry
3. ✅ Add `GameObject` reference to Three.js mesh `userData`
4. ✅ Keep existing `getCelestialBodyInfo()` working (backward compatibility)

**Existing code still works, but new GameObject system available**

### **Phase 3: Migrate TargetComputerManager** (Week 3)

1. ✅ Change target list to use GameObjects instead of plain data
2. ✅ Simplify `getTargetDiplomacy()` to just call `gameObject.diplomacy`
3. ✅ Remove fallback chains
4. ✅ Update `getCurrentTargetData()` to return GameObject

**Before:**
```javascript
const diplomacy = this.getTargetDiplomacy(currentTargetData);
// → 5-step fallback chain
```

**After:**
```javascript
const diplomacy = currentTarget.diplomacy;
// → single getter, no fallbacks
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

### **Phase 6: Remove Legacy Code** (Week 7)

1. ✅ Remove `processTargetData()` (no longer needed)
2. ✅ Remove `getCurrentTargetData()` fallback chains
3. ✅ Remove `getCelestialBodyInfo()` (replaced by GameObject)
4. ✅ Clean up duplicate data structures

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

1. **`getTargetDiplomacy()` fallback chain** ← Current issue
   - Location: `TargetComputerManager.js:2097-2150`
   - Workaround: 5-step fallback to find faction
   - After refactor: `gameObject.diplomacy` (single line)

2. **`processTargetData()` enrichment**
   - Location: `TargetComputerManager.js:3775-3970`
   - Workaround: Merges data from multiple sources
   - After refactor: Not needed (GameObject has all data)

3. **`getCurrentTargetData()` search**
   - Location: `TargetComputerManager.js:3484-3607`
   - Workaround: Searches target list for matching object
   - After refactor: Direct GameObject reference

4. **Duplicate position storage**
   - Location: Multiple files
   - Workaround: `position`, `cartesianPosition`, `body.position`
   - After refactor: Single `gameObject.position`

5. **Discovery state scattered**
   - Location: StarChartsManager + TargetComputerManager
   - Workaround: Sync between multiple data structures
   - After refactor: Single `gameObject.discovered`

---

## 🎯 **Success Metrics**

After refactor is complete:

- ✅ **Zero fallback chains** for core properties (faction, diplomacy, type)
- ✅ **Single data structure** per object (GameObject)
- ✅ **50% reduction** in target-related code complexity
- ✅ **Zero discovery sync bugs** (single source)
- ✅ **Improved performance** (benchmark TBD)
- ✅ **100% test coverage** for GameObject class

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

> "There should be one source of truth for data like faction and it should always be available."
> — Senior Engineer, September 30, 2025

This refactor addresses a core architectural issue that has caused multiple bugs and workarounds. The fallback chains exist because we never had a proper GameObject abstraction - each system (SolarSystemManager, StarChartsManager, TargetComputerManager) maintained its own view of the same data.

The GameObject pattern is standard in game development for exactly this reason - it provides a clear, consistent way to represent entities in the game world.

**When you see a fallback chain, it's a code smell.** It means the data architecture is wrong, not that you need better fallbacks.

---

**Status**: PLANNED - Waiting for prioritization  
**Estimated Effort**: 6-7 weeks (phased migration)  
**Technical Debt Interest**: HIGH (causes bugs, slows development)
