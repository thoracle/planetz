# Game Object Data Architecture Refactor Plan

**Date**: September 30, 2025  
**Status**: PLANNING - Technical Debt Documentation  
**Priority**: MEDIUM - Not blocking, but important for maintainability  
**Author**: Engineering Team  
**Last Code Review**: September 30, 2025 (Comprehensive Audit)

---

## 📋 **COMPREHENSIVE CODE AUDIT FINDINGS**

> **Audit Completed**: September 30, 2025  
> **Files Reviewed**: 100+ JavaScript files (~109K LOC)  
> **Methodology**: Automated grep/search + semantic analysis + manual review

### **CRITICAL ISSUES** 🚨 (Fix First)

#### **1. God Classes - Massive Files with Too Many Responsibilities**
**Priority**: CRITICAL  
**Impact**: Maintainability nightmare, hard to test, hard to debug

| File | Lines | Issues |
|------|-------|--------|
| `StarfieldManager.js` | **7,894** | Central orchestrator doing EVERYTHING - rendering, audio, physics, UI, weapons, docking, missions, AI |
| `TargetComputerManager.js` | **6,635** | Target management + HUD + wireframes + arrows + sub-targeting + discovery integration |
| `PhysicsManager.js` | **3,450** | Physics + collision + weapons + projectiles + damage |
| `CardInventoryUI.js` | **3,362** | Inventory + shop + upgrades + persistence + UI + audio |
| `StarChartsUI.js` | **3,257** | UI + data management + discovery + filtering + waypoints |

**Refactor Strategy**:
- Break `StarfieldManager` into:
  - `GameOrchestrator` (coordination only, ~500 LOC)
  - `RenderingManager` (visuals)
  - `AudioManager` (exists, needs integration)
  - `InputManager` (keyboard/mouse)
  - `MissionCoordinator` (missions only)
  - `CombatCoordinator` (weapons/AI)
  
- Break `TargetComputerManager` into:
  - `TargetingCore` (selection/cycling, ~1000 LOC)
  - `TargetHUD` (UI rendering)
  - `WireframeRenderer` (3D visuals)
  - `TargetListManager` (list management)

**Estimated Effort**: 4-6 weeks  
**Risk**: HIGH (touches everything)  
**Benefits**: +300% maintainability, easier testing, parallel development

---

#### **2. Console.log Violations - Debug System Not Used**
**Priority**: CRITICAL  
**Impact**: Inconsistent logging, can't disable in production, performance hit

**Findings**:
- **1,578 console.log/warn/error statements** across 116 files
- Should be using `debug(channel, message)` system
- Production builds have no way to disable logs
- No channel-based filtering

**Affected Files** (top 10):
- All major managers have violations
- Test files have violations (acceptable for tests)

**Refactor Strategy**:
1. Create automated migration script:
   ```bash
   # Replace all console.log with debug()
   find frontend/static/js -name "*.js" -not -path "*/tests/*" \
     -exec sed -i '' 's/console\.log(/debug('\''GENERAL'\'', /g' {} \;
   ```

2. Map console types to debug channels:
   - `console.log` → `debug('GENERAL', ...)`
   - `console.warn` → `debug('WARNING', ...)`
   - `console.error` → `debug('ERROR', ...)`

3. Add ESLint rule to prevent future violations:
   ```json
   {
     "no-console": ["error", { "allow": [] }]
   }
   ```

**Estimated Effort**: 2-3 days (mostly automated)  
**Risk**: LOW (safe find-replace)  
**Benefits**: Consistent logging, production performance, better debugging

---

#### **3. Global State Pollution - Window.* Overuse**
**Priority**: HIGH  
**Impact**: Hard to test, circular dependencies, memory leaks, namespace collisions

**Findings**:
- **53 files** set `window.*` variables
- Managers exposed globally instead of dependency injection
- Testing nightmare (can't mock globals easily)
- Circular dependency hell

**Examples**:
```javascript
// app.js
window.spatialManager = spatialManager;
window.collisionManager = collisionManager;
window.cardInventoryUI = this;
window.missionAPI = this.missionAPI;
window.missionEventHandler = this.missionEventHandler;
window.starfieldManager = starfieldManager;
```

**Refactor Strategy**:
1. Create `ServiceLocator` or use dependency injection:
   ```javascript
   class ServiceRegistry {
       static instance = new ServiceRegistry();
       services = new Map();
       
       register(name, service) {
           this.services.set(name, service);
       }
       
       get(name) {
           if (!this.services.has(name)) {
               throw new Error(`Service ${name} not registered`);
           }
           return this.services.get(name);
       }
   }
   ```

2. Pass dependencies through constructors (preferred):
   ```javascript
   // Before
   class MyManager {
       doSomething() {
           window.spatialManager.track(obj);
       }
   }
   
   // After
   class MyManager {
       constructor(spatialManager) {
           this.spatialManager = spatialManager;
       }
       
       doSomething() {
           this.spatialManager.track(obj);
       }
   }
   ```

**Estimated Effort**: 3-4 weeks  
**Risk**: MEDIUM (requires refactoring many constructors)  
**Benefits**: Testable code, no circular deps, clear dependencies

---

### **HIGH PRIORITY ISSUES** ⚠️ (Fix Soon)

#### **4. Memory Leaks - Event Listeners Without Cleanup**
**Priority**: HIGH  
**Impact**: Memory grows over time, especially with UI components

**Findings**:
- Event listeners added in constructors without corresponding cleanup
- No `removeEventListener` calls when components are destroyed
- Particularly bad in UI components that are created/destroyed frequently

**Examples**:
```javascript
// StarfieldManager.js:237
setTimeout(() => {
    this.initializeMissionSystem();
}, 2000); // Never cleared!

// app.js:289
document.addEventListener('DOMContentLoaded', async () => {
    // Listener never removed
});

// Multiple files: addEventListener without cleanup
document.addEventListener('keydown', handler);
// No corresponding removeEventListener
```

**Refactor Strategy**:
1. Add `cleanup()` or `destroy()` methods to all classes:
   ```javascript
   class MyComponent {
       constructor() {
           this.listeners = [];
           this.timers = [];
       }
       
       addEventListener(target, event, handler) {
           target.addEventListener(event, handler);
           this.listeners.push({ target, event, handler });
       }
       
       setTimeout(callback, delay) {
           const id = setTimeout(callback, delay);
           this.timers.push(id);
           return id;
       }
       
       cleanup() {
           // Remove all listeners
           this.listeners.forEach(({ target, event, handler }) => {
               target.removeEventListener(event, handler);
           });
           
           // Clear all timers
           this.timers.forEach(id => clearTimeout(id));
           
           this.listeners = [];
           this.timers = [];
       }
   }
   ```

2. Call `cleanup()` when components are destroyed

**Estimated Effort**: 2 weeks  
**Risk**: MEDIUM (easy to miss listeners)  
**Benefits**: No memory leaks, better performance long-term

---

#### **5. Magic Numbers Everywhere**
**Priority**: HIGH  
**Impact**: Hard to tune, inconsistent values, unclear intent

**Findings**:
- Hardcoded values scattered across:
  - Physics constants (speeds, forces)
  - AI behavior parameters
  - UI dimensions and timings
  - Weapon stats
  - Discovery radii

**Examples**:
```javascript
// ProximityDetector3D.js:41-51
fadeDist: 20000,  // What is this in real units?
updateFrequency: 20,
zoomLevels: [
    { range: 100000, gridSpacing: 8000 },
    { range: 75000, gridSpacing: 6000 },
    // Why these specific numbers?
]

// WeaponCard.js:1249-1275
adaptiveDelayMs = 1; // Why 1ms?
projectileSpeed = this.isHoming ? 800 : 750; // Why these speeds?

// SolarSystemManager.js:42-45
this.VISUAL_SCALE = 100.0; // Why 100?
this.MAX_DISTANCE_KM = 1.6e6; // Why 1.6M km?
```

**Refactor Strategy**:
1. Create configuration files:
   ```javascript
   // config/PhysicsConstants.js
   export const PHYSICS = {
       IMPULSE_MAX_SPEED: 9, // km/s
       WARP_MULTIPLIER: 10,
       COLLISION_MARGIN: 0.04,
       GRAVITY_CONSTANT: 6.67430e-11,
       // ... all constants documented
   };
   
   // config/GameplayConstants.js
   export const GAMEPLAY = {
       DISCOVERY_RADIUS_BASE: 5, // km
       TARGET_RANGE_MAX: 150, // km
       WEAPONS_RANGE_TYPICAL: 25, // km
       // ... with comments explaining WHY
   };
   ```

2. Replace magic numbers with named constants:
   ```javascript
   // Before
   if (distance < 20000) { ... }
   
   // After
   import { GAMEPLAY } from '../config/GameplayConstants.js';
   if (distance < GAMEPLAY.PROXIMITY_FADE_DISTANCE) { ... }
   ```

**Estimated Effort**: 2 weeks  
**Risk**: LOW (safe refactoring)  
**Benefits**: Easy to tune, self-documenting, consistent values

---

#### **6. Timer Cleanup Issues**
**Priority**: HIGH  
**Impact**: Memory leaks, orphaned intervals, performance degradation

**Findings**:
- **209 setTimeout/setInterval calls** across 68 files
- Many timers never cleared
- Intervals running even when components inactive
- No centralized timer management

**Examples**:
```javascript
// TargetComputerManager.js - multiple intervals never cleared
this.noTargetsInterval = null;
this.rangeMonitoringInterval = null;

// StarChartsManager.js:39
this.discoveryInterval = 1000; // Interval value, but is it cleaned up?
```

**Refactor Strategy**:
1. Use class-level timer tracking (see #4 above)
2. Create `TimerManager` utility:
   ```javascript
   class TimerManager {
       constructor() {
           this.timeouts = new Set();
           this.intervals = new Set();
       }
       
       setTimeout(callback, delay) {
           const id = setTimeout(() => {
               this.timeouts.delete(id);
               callback();
           }, delay);
           this.timeouts.add(id);
           return id;
       }
       
       setInterval(callback, delay) {
           const id = setInterval(callback, delay);
           this.intervals.add(id);
           return id;
       }
       
       cleanup() {
           this.timeouts.forEach(id => clearTimeout(id));
           this.intervals.forEach(id => clearInterval(id));
           this.timeouts.clear();
           this.intervals.clear();
       }
   }
   ```

**Estimated Effort**: 1-2 weeks  
**Risk**: LOW  
**Benefits**: No orphaned timers, predictable cleanup

---

### **MEDIUM PRIORITY ISSUES** 🔧 (Fix When Possible)

#### **7. Inconsistent Error Handling**
**Priority**: MEDIUM  
**Impact**: Silent failures, hard to debug

**Findings**:
- Try-catch blocks with empty catch or generic logging
- Async functions without error handling
- No centralized error reporting

**Examples**:
```javascript
// chunk.js:322-343
catch (error) {
    // Enhanced error handling with progressive backoff
    this.errorCount = (this.errorCount || 0) + 1;
    if (this.errorCount >= 3) {
        // console.error(...) // COMMENTED OUT!
        this.loadState = 'error';
    } else {
        // console.warn(...) // COMMENTED OUT!
    }
}
```

**Refactor Strategy**:
1. Use consistent error handling:
   ```javascript
   try {
       await operation();
   } catch (error) {
       debug('ERROR', `Operation failed: ${error.message}`);
       throw error; // Re-throw or handle explicitly
   }
   ```

2. Add global error boundary for React-like error handling

**Estimated Effort**: 1 week  
**Risk**: LOW  
**Benefits**: Better debugging, fewer silent failures

---

#### **8. State Management Scattered**
**Priority**: MEDIUM  
**Impact**: Hard to track state changes, race conditions

**Findings**:
- 74 files use state tracking (`this.state` patterns)
- No centralized state management
- State mutations scattered across methods
- Hard to debug state changes

**Refactor Strategy**:
1. Consider using a simple state manager:
   ```javascript
   class StateManager extends EventTarget {
       constructor(initialState) {
           super();
           this._state = initialState;
       }
       
       setState(updates) {
           const oldState = { ...this._state };
           this._state = { ...this._state, ...updates };
           this.dispatchEvent(new CustomEvent('stateChanged', {
               detail: { oldState, newState: this._state }
           }));
       }
       
       getState() {
           return { ...this._state };
       }
   }
   ```

**Estimated Effort**: 2-3 weeks (optional)  
**Risk**: MEDIUM  
**Benefits**: Predictable state updates, easier debugging

---

### **LOW PRIORITY ISSUES** 🔍 (Technical Debt)

#### **9. TODOs and Incomplete Features**
**Priority**: LOW  
**Impact**: Incomplete functionality

**Findings**: 23 TODO comments

**Examples**:
```javascript
// StarChartsManager.js:1429
// TODO: Integrate with ship spawning system

// StarChartsManager.js:1440
// TODO: Integrate with mission system

// StarfieldManager.js:2665
// TODO: Implement weapons fire

// AchievementSystem.js:258
// TODO: Implement title system
```

**Recommendation**: Review each TODO and either:
- Implement the feature
- Create a proper ticket for it
- Remove if no longer needed

**Estimated Effort**: Varies per TODO  
**Risk**: LOW  
**Benefits**: Cleaner codebase, clear feature status

---

#### **10. Duplicate Code Patterns**
**Priority**: LOW  
**Impact**: Harder to maintain, bug fixes needed in multiple places

**Findings**:
- Similar patterns repeated across files
- Copy-paste code with minor variations
- Utility functions not extracted

**Refactor Strategy**:
1. Extract common patterns to utilities
2. Create base classes for shared behavior
3. Use composition over inheritance

**Estimated Effort**: 2-3 weeks (ongoing)  
**Risk**: LOW  
**Benefits**: DRY code, easier maintenance

---

## 🎯 **RECOMMENDED REFACTORING PRIORITY**

### **Phase 0: Quick Wins** (Week 1-2)
1. ✅ **Automated console.log → debug() migration**
2. ✅ **Extract magic numbers to config files**
3. ✅ **Add ESLint rules to prevent future violations**

### **Phase 1: Memory & Performance** (Week 3-5)
1. ✅ **Add cleanup methods to all classes**
2. ✅ **Implement TimerManager**
3. ✅ **Fix event listener leaks**

### **Phase 2: Architecture** (Week 6-10)
1. ✅ **Replace window.* with dependency injection**
2. ✅ **Implement ServiceRegistry**
3. ✅ **Begin GameObject factory (original plan)**

### **Phase 3: God Class Refactoring** (Week 11-16)
1. ✅ **Break apart StarfieldManager**
2. ✅ **Break apart TargetComputerManager**
3. ✅ **Break apart other large classes**

### **Phase 4: Polish** (Week 17-20)
1. ✅ **Consistent error handling**
2. ✅ **State management improvements**
3. ✅ **Address remaining TODOs**

**Total Estimated Effort**: 20 weeks (5 months)  
**Can be done incrementally**: YES  
**Breaking changes**: MINIMAL (if done carefully)

---

## 🚀 **ORIGINAL PLAN BELOW**  
*(GameObject factory, FactionStandingsManager, etc.)*

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

### **Issue #5: Faction Standings Scattered**

Player's relationship with each faction (reputation/standing) stored in multiple places:

- `playerData.faction_standings` (in game state)
- Possibly cached in various UI components
- Maybe duplicated in backend responses
- No single source of truth for current standings

**Problems:**
- UI shows stale standings after reputation change
- Different systems query different sources
- No real-time updates when standings change
- Hard to track what affects reputation

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
    
    // COMPUTED: Diplomacy (derived from faction + player standings)
    get diplomacy() {
        // Query the FactionStandingsManager for current player relationship
        const standingsManager = FactionStandingsManager.getInstance();
        return standingsManager.getDiplomacyStatus(this.faction);
    }
    
    // STATIC UTILITIES (for base faction relations, not player-specific)
    static getBaseFactionRelation(faction) {
        // Base faction relations (before player actions)
        const baseFactionRelations = {
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
        
        return baseFactionRelations[faction] || 'neutral';
    }
}

/**
 * FactionStandingsManager - Singleton for player's faction relationships
 * SINGLE SOURCE OF TRUTH for current faction standings
 */
class FactionStandingsManager {
    static instance = null;
    
    static getInstance() {
        if (!FactionStandingsManager.instance) {
            FactionStandingsManager.instance = new FactionStandingsManager();
        }
        return FactionStandingsManager.instance;
    }
    
    constructor() {
        if (FactionStandingsManager.instance) {
            throw new Error('FactionStandingsManager is a singleton');
        }
        
        // Current player standings with each faction
        // Range: -100 (hostile) to +100 (allied)
        this.standings = {
            'Terran Republic Alliance': 50,      // Start friendly
            'Zephyrian Collective': 50,
            'Scientists Consortium': 50,
            'Free Trader Consortium': 0,         // Start neutral
            'Nexus Corporate Syndicate': 0,
            'Ethereal Wanderers': 0,
            'Draconis Imperium': 0,
            'Crimson Raider Clans': -50,        // Start hostile
            'Shadow Consortium': -50,
            'Void Cult': -50
        };
        
        // Event listeners for standing changes
        this.listeners = [];
    }
    
    /**
     * Get current standing with a faction
     * @returns {number} Standing value (-100 to +100)
     */
    getStanding(faction) {
        if (!this.standings.hasOwnProperty(faction)) {
            console.warn(`Unknown faction: ${faction}`);
            return 0; // Neutral for unknown factions
        }
        return this.standings[faction];
    }
    
    /**
     * Get diplomacy status based on current standing
     * @returns {string} 'enemy' | 'neutral' | 'friendly'
     */
    getDiplomacyStatus(faction) {
        const standing = this.getStanding(faction);
        
        if (standing <= -25) {
            return 'enemy';    // Hostile
        } else if (standing >= 25) {
            return 'friendly';  // Friendly
        } else {
            return 'neutral';   // Neutral
        }
    }
    
    /**
     * Modify standing with a faction
     * @param {string} faction - Faction name
     * @param {number} delta - Change amount (can be negative)
     * @param {string} reason - Why the standing changed (for logging/UI)
     */
    modifyStanding(faction, delta, reason = 'Unknown') {
        if (!this.standings.hasOwnProperty(faction)) {
            console.warn(`Cannot modify standing for unknown faction: ${faction}`);
            return;
        }
        
        const oldStanding = this.standings[faction];
        const oldDiplomacy = this.getDiplomacyStatus(faction);
        
        // Clamp to -100 to +100
        this.standings[faction] = Math.max(-100, Math.min(100, oldStanding + delta));
        
        const newStanding = this.standings[faction];
        const newDiplomacy = this.getDiplomacyStatus(faction);
        
        // Log the change
        debug('FACTION', `📊 Faction standing changed: ${faction} ${oldStanding} → ${newStanding} (${delta > 0 ? '+' : ''}${delta}) - ${reason}`);
        
        // Notify listeners
        this.notifyListeners({
            faction,
            oldStanding,
            newStanding,
            oldDiplomacy,
            newDiplomacy,
            delta,
            reason
        });
        
        // If diplomacy status changed (enemy ↔ neutral ↔ friendly)
        if (oldDiplomacy !== newDiplomacy) {
            debug('FACTION', `🎭 Diplomacy status changed: ${faction} ${oldDiplomacy} → ${newDiplomacy}`);
            
            // Trigger major event (achievements, UI updates, etc.)
            if (typeof eventBus !== 'undefined') {
                eventBus.emit('faction:diplomacy_changed', {
                    faction,
                    oldStatus: oldDiplomacy,
                    newStatus: newDiplomacy
                });
            }
        }
    }
    
    /**
     * Set standing directly (for save game loading)
     */
    setStanding(faction, value) {
        if (!this.standings.hasOwnProperty(faction)) {
            console.warn(`Cannot set standing for unknown faction: ${faction}`);
            return;
        }
        
        this.standings[faction] = Math.max(-100, Math.min(100, value));
    }
    
    /**
     * Get all current standings
     */
    getAllStandings() {
        return { ...this.standings };
    }
    
    /**
     * Load standings from save data
     */
    loadStandings(savedStandings) {
        if (!savedStandings) return;
        
        for (const [faction, standing] of Object.entries(savedStandings)) {
            this.setStanding(faction, standing);
        }
        
        debug('FACTION', '📊 Loaded faction standings from save');
    }
    
    /**
     * Register listener for standing changes
     */
    onStandingChanged(callback) {
        this.listeners.push(callback);
        
        // Return unsubscribe function
        return () => {
            const index = this.listeners.indexOf(callback);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }
    
    /**
     * Notify all listeners of standing change
     */
    notifyListeners(changeData) {
        this.listeners.forEach(callback => {
            try {
                callback(changeData);
            } catch (error) {
                console.error('Error in faction standing listener:', error);
            }
        });
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
6. ✅ Create `FactionStandingsManager` singleton
7. ✅ Initialize with base standings from player data
8. ✅ Keep existing `getCelestialBodyInfo()` working (backward compatibility)

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
3. ✅ Update `getFactionDiplomacy()` to query `FactionStandingsManager`
4. ✅ **Remove ALL fallback chains** - assert instead
5. ✅ Replace `getCurrentTargetData()` to return GameObject directly
6. ✅ Remove `processTargetData()` enrichment (no longer needed)

**Before:**
```javascript
// 5-step fallback chain - masks bugs
const diplomacy = this.getTargetDiplomacy(currentTargetData);
// → Checks 5 sources, silently falls back to 'neutral'

// Diplomacy calculated from static faction mapping
getFactionDiplomacy(faction) {
    const factionRelations = { 'TRA': 'friendly', ... };
    return factionRelations[faction] || 'neutral';
    // → Ignores player's actual standing with faction!
}
```

**After:**
```javascript
// Direct access - fails fast if wrong
const diplomacy = currentTarget.diplomacy;
// → Queries FactionStandingsManager for CURRENT player standing
// → gameObject.faction → standingsManager.getDiplomacyStatus(faction)
// → Returns 'enemy'/'neutral'/'friendly' based on current reputation

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

9. **Static faction diplomacy mapping**
   - Location: `TargetComputerManager.js:119-151` (`getFactionDiplomacy()`)
   - Workaround: Hard-coded faction → diplomacy mapping
   - **Why bad**: Ignores player's current standing with faction
   - After refactor: Query `FactionStandingsManager` for current standing
   - Fix: Dynamic diplomacy based on player reputation

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
- ✅ **Single source for faction standings** (FactionStandingsManager)
- ✅ **50% reduction** in target-related code complexity

### **Reliability:**
- ✅ **Zero discovery sync bugs** (single source of truth)
- ✅ **Zero faction standing sync bugs** (single source of truth)
- ✅ **Fail-fast assertions** catch bugs immediately in dev
- ✅ **Clear error messages** point to exact fix needed
- ✅ **No silent failures** (removed all defensive returns)
- ✅ **Real-time faction updates** (listeners notify all systems)

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

> "Also there should be single object that holds all of the current faction standings that we query to that info so that it is always up to date."
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

3. **Faction Standings Scattered**: No single source for player's current reputation
   - Hard-coded faction relations ignore player actions
   - No way to update diplomacy when reputation changes
   - UI shows stale faction status

### **The GameObject Pattern**

The GameObject + Factory + Manager pattern is **standard in game development** for exactly these reasons:

1. **Factory ensures data quality** at creation
2. **GameObject provides single source** of truth for object data
3. **Managers provide single source** for game state (faction standings, etc.)
4. **Assertions catch bugs** immediately in development
5. **Clear error messages** make fixing fast
6. **Real-time updates** through manager listeners

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
