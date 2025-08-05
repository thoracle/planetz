# Unified Targeting Architecture

## Overview

The Planetz game now uses a unified targeting system that ensures perfect synchronization between crosshair display and weapon firing logic. This eliminates the previous issues where the crosshair would show a valid target but missiles would miss.

## Architecture

### Architecture Overview

```mermaid
graph LR
    subgraph "OLD: Fragmented Architecture"
        A1[WeaponCard.js<br/>Targeting Logic] --> D1[Duplicate<br/>Calculations]
        B1[ViewManager.js<br/>Crosshair Logic] --> D1
        C1[CrosshairTargeting.js<br/>Utility Functions] --> D1
        D1 --> E1[Inconsistent<br/>Results]
    end
    
    subgraph "NEW: Unified Architecture"
        A2[WeaponCard.js] --> B2[TargetingService.js]
        C2[ViewManager.js] --> B2
        D2[CrosshairTargeting.js] --> B2
        B2 --> E2[Single Source<br/>of Truth]
        B2 --> F2[Cached Results]
        B2 --> G2[Consistent<br/>Behavior]
    end
    
    E1 -.->|Refactored to| E2
    
    style A1 fill:#ffcdd2,stroke:#f44336
    style B1 fill:#ffcdd2,stroke:#f44336
    style C1 fill:#ffcdd2,stroke:#f44336
    style D1 fill:#ffcdd2,stroke:#f44336
    style E1 fill:#ffcdd2,stroke:#f44336
    
    style A2 fill:#c8e6c9,stroke:#4caf50
    style B2 fill:#e3f2fd,stroke:#2196f3
    style C2 fill:#c8e6c9,stroke:#4caf50
    style D2 fill:#c8e6c9,stroke:#4caf50
    style E2 fill:#e8f5e8,stroke:#4caf50
    style F2 fill:#e8f5e8,stroke:#4caf50
    style G2 fill:#e8f5e8,stroke:#4caf50
```

### Before: Fragmented Targeting
```
❌ OLD ARCHITECTURE:
├── CrosshairTargeting.js     # Tolerance calculation, raycasting
├── WeaponCard.js            # Duplicate targeting + fallback logic  
├── ViewManager.js           # Separate crosshair display logic
└── WeaponSystemCore.js      # Active weapon management

PROBLEMS:
- Duplicate calculations in multiple places
- Inconsistent targeting between crosshair and weapons
- Hard to maintain when targeting rules change
- Different fallback strategies in different systems
```

### After: Unified Targeting Service
```
✅ NEW ARCHITECTURE:
└── TargetingService.js       # Single source of truth
    ├── Crosshair Display     # ViewManager uses TargetingService
    ├── Weapon Firing         # WeaponCard uses TargetingService
    ├── Fallback Logic        # Unified fallback strategy
    └── Caching System        # Performance optimization

BENEFITS:
- Single source of truth for all targeting
- Perfect crosshair/weapon synchronization
- Consistent fallback behavior
- Performance optimized with caching
- Easy to maintain and debug
```

## System Architecture Diagram

```mermaid
graph TD
    A[WeaponCard] --> B[TargetingService]
    C[ViewManager] --> B
    D[CrosshairTargeting] --> B
    
    B --> E[Primary: Crosshair Targeting]
    B --> F[Fallback: Nearest Target]
    B --> G[Caching System]
    B --> H[Range Validation]
    
    E --> I[Tolerance Calculation]
    E --> J[Raycasting]
    E --> K[Distance Check]
    
    F --> L[Search Dummy Ships]
    F --> M[Find Nearest in Range]
    
    G --> N[50ms Cache Validity]
    G --> O[Position Change Detection]
    
    H --> P[In Range Check]
    H --> Q[Range State Calculation]
    
    B --> R[Unified Target Result]
    R --> S[Target Information]
    R --> T[Acquisition Method]
    R --> U[Range Validation]
    R --> V[Display States]
    
    style B fill:#4CAF50,stroke:#2E7D32,stroke-width:3px,color:#fff
    style R fill:#2196F3,stroke:#1565C0,stroke-width:2px,color:#fff
    style A fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
    style C fill:#FF9800,stroke:#E65100,stroke-width:2px,color:#fff
```

## Key Components

### 1. TargetingService (`/services/TargetingService.js`)

The core service that handles all targeting operations:

- **Primary Method**: `getCurrentTarget(options)` - Returns unified targeting result
- **Crosshair Targeting**: Uses existing CrosshairTargeting utility for precision
- **Fallback Targeting**: Finds nearest target when crosshair fails
- **Caching**: Avoids redundant calculations (50ms cache validity)
- **Debug Support**: Comprehensive logging and statistics

### 2. Unified Target Result Object

All targeting operations return a standardized result:

```javascript
{
  // Target information
  hasTarget: boolean,
  target: Object,
  targetName: string,
  targetDistance: number,
  targetPosition: {x, y, z},
  targetShip: Object,
  targetMesh: Object,
  
  // Acquisition information
  acquisitionMethod: 'crosshair' | 'fallback' | 'none',
  acquisitionTime: timestamp,
  
  // Range validation
  inRange: boolean,
  rangeState: 'none' | 'inRange' | 'closeRange' | 'outRange',
  rangeRatio: number,
  weaponRange: number,
  
  // Display states
  crosshairState: string,  // For ViewManager
  canFire: boolean,        // For WeaponCard
  
  // Metadata
  reason: string
}
```

### 3. Class Relationships

```mermaid
classDiagram
    class TargetingService {
        -config: Object
        -cachedTargetResult: Object
        -lastTargetUpdate: number
        -lastWeaponRange: number
        -lastCameraPosition: Vector3
        
        +getCurrentTarget(options) Object
        +configure(newConfig) void
        +setDebugLogging(enabled) void
        +clearCache() void
        +getStats() Object
        -calculateTargeting(camera, weaponRange, enableFallback, requestedBy) Object
        -getCrosshairTarget(camera, weaponRange, requestedBy) Object
        -getFallbackTarget(camera, weaponRange, requestedBy) Object
        -createTargetResult(target, acquisitionMethod, weaponRange) Object
        -createEmptyTargetResult(reason) Object
        -isCacheValid(camera, weaponRange) boolean
        -updateCache(targetResult, camera, weaponRange) void
    }
    
    class WeaponCard {
        -name: string
        -range: number
        -damage: number
        +createProjectile(origin, target) Object
        +getCrosshairTarget(camera) Object
        +fire(origin, target) Object
    }
    
    class ViewManager {
        -ship: Ship
        -camera: Camera
        -crosshairElements: Array
        +updateCrosshairDisplay() void
        +applyCrosshairStyle(elements, state, faction) void
        -getFactionColor(ship) string
    }
    
    class CrosshairTargeting {
        +static calculateAimTolerance(targetDistance) number
        +static findCrosshairTargets(options) Object
        +static getCrosshairTarget(camera, weaponRange, weaponName) Object
        +static updateCrosshairState(camera, weaponRange) Object
        +static validateRange(targetDistance, weaponRange) Object
    }
    
    class TargetResult {
        +hasTarget: boolean
        +target: Object
        +targetName: string
        +targetDistance: number
        +targetPosition: Object
        +acquisitionMethod: string
        +inRange: boolean
        +rangeState: string
        +crosshairState: string
        +canFire: boolean
        +reason: string
    }
    
    WeaponCard --> TargetingService : uses
    ViewManager --> TargetingService : uses
    TargetingService --> CrosshairTargeting : delegates to
    TargetingService --> TargetResult : creates
    
    note for TargetingService "Singleton service providing unified targeting logic"
    note for TargetResult "Standardized result object for all targeting operations"
```

### 4. Integration Points

#### WeaponCard Integration
```javascript
// OLD: Duplicate targeting logic with fallback
const crosshairTarget = this.getCrosshairTarget(camera);
// ... 30+ lines of fallback logic ...

// NEW: Single unified call
const targetingResult = targetingService.getCurrentTarget({
  camera: camera,
  weaponRange: this.range,
  requestedBy: this.name,
  enableFallback: true
});
```

#### ViewManager Integration
```javascript
// OLD: Separate crosshair logic
const crosshairState = CrosshairTargeting.updateCrosshairState(camera, weaponRangeMeters);

// NEW: Unified targeting service
const targetingResult = targetingService.getCurrentTarget({
  camera: camera,
  weaponRange: weaponRangeMeters,
  requestedBy: 'crosshair_display',
  enableFallback: false // Crosshair only shows precise targets
});
```

## Targeting Process Flow

```mermaid
flowchart TD
    Start([Targeting Request]) --> CheckCache{Cache Valid?}
    
    CheckCache -->|Yes| ReturnCached[Return Cached Result]
    CheckCache -->|No| CrosshairTarget[Try Crosshair Targeting]
    
    CrosshairTarget --> CalcTolerance[Calculate Aim Tolerance<br/>Based on Distance]
    CalcTolerance --> Raycast[Perform Raycasting<br/>from Camera]
    Raycast --> CheckDistance{Target Within<br/>Tolerance?}
    
    CheckDistance -->|Yes| ValidateRange[Validate Target<br/>Within Weapon Range]
    CheckDistance -->|No| Fallback{Fallback<br/>Enabled?}
    
    ValidateRange --> InRange{In Range?}
    InRange -->|Yes| CreateSuccess[Create Success Result<br/>Method: crosshair]
    InRange -->|No| CreateOutRange[Create Out-of-Range Result<br/>State: outRange]
    
    Fallback -->|Yes| SearchNearest[Search for Nearest Target<br/>Within 1.5x Weapon Range]
    Fallback -->|No| CreateEmpty[Create Empty Result<br/>Reason: no_target_found]
    
    SearchNearest --> NearestFound{Nearest Target<br/>Found?}
    NearestFound -->|Yes| CreateFallback[Create Success Result<br/>Method: fallback]
    NearestFound -->|No| CreateEmpty
    
    CreateSuccess --> UpdateCache[Update Cache]
    CreateOutRange --> UpdateCache
    CreateFallback --> UpdateCache
    CreateEmpty --> UpdateCache
    ReturnCached --> End([Return Unified Result])
    UpdateCache --> End
    
    style Start fill:#4CAF50,stroke:#2E7D32,color:#fff
    style End fill:#4CAF50,stroke:#2E7D32,color:#fff
    style CreateSuccess fill:#2196F3,stroke:#1565C0,color:#fff
    style CreateFallback fill:#FF9800,stroke:#E65100,color:#fff
    style CreateEmpty fill:#F44336,stroke:#C62828,color:#fff
```

## Sequence Diagram

```mermaid
sequenceDiagram
    participant WC as WeaponCard
    participant VM as ViewManager
    participant TS as TargetingService
    participant CT as CrosshairTargeting
    participant Cache as Cache System
    
    Note over WC,VM: User fires weapon / Crosshair updates
    
    WC->>+TS: getCurrentTarget({camera, weaponRange, requestedBy: "Standard Missile"})
    VM->>+TS: getCurrentTarget({camera, weaponRange, requestedBy: "crosshair_display"})
    
    TS->>Cache: Check cache validity
    Cache-->>TS: Cache valid/invalid
    
    alt Cache Valid
        TS-->>WC: Return cached result
        TS-->>VM: Return cached result
    else Cache Invalid
        TS->>+CT: getCrosshairTarget(camera, weaponRange)
        CT->>CT: Calculate tolerance
        CT->>CT: Perform raycasting
        CT->>CT: Validate distance
        CT-->>-TS: Target found/null
        
        alt Crosshair Target Found
            TS->>TS: Create target result
        else No Crosshair Target
            TS->>TS: Try fallback targeting
            TS->>TS: Find nearest target in range
        end
        
        TS->>TS: Validate range and create unified result
        TS->>Cache: Update cache
        TS-->>-WC: Unified targeting result
        TS-->>-VM: Unified targeting result
    end
    
    WC->>WC: Use target for missile trajectory
    VM->>VM: Update crosshair display
```

## Configuration

The TargetingService can be configured:

```javascript
targetingService.configure({
  fallbackEnabled: true,
  fallbackRangeMultiplier: 1.5,  // Search within 1.5x weapon range
  enableCaching: true,
  cacheValidityMs: 50,
  enableDebugLogging: false
});
```

## Performance Optimizations

### 1. Intelligent Caching
- Results cached for 50ms to avoid redundant calculations
- Cache invalidated when camera moves >10m or weapon range changes
- Separate cache tracking for position and weapon range

### 2. Selective Fallback
- Crosshair display: `enableFallback: false` (only precise targets)
- Weapon firing: `enableFallback: true` (includes nearby targets)

### 3. Request Identification
- Each targeting request tagged with `requestedBy` for debugging
- Performance timing logged for optimization

## Debugging

### Global Access
```javascript
// Available in browser console
window.targetingService.getStats()
window.targetingService.setDebugLogging(true)
window.targetingService.clearCache()
```

### Debug Logging
When enabled, shows detailed targeting information:
```
🎯 TARGETING SUCCESS [Standard Missile]: Target Dummy 2 via fallback (12.3km, inRange) [1.2ms]
🎯 TARGETING FAILED [crosshair_display]: no_target_found [0.8ms]
```

## Migration Impact

### Files Modified
- ✅ `WeaponCard.js` - Now uses TargetingService
- ✅ `ViewManager.js` - Now uses TargetingService  
- ✅ `CrosshairTargeting.js` - Enhanced tolerance calculations
- ✅ Added `TargetingService.js` - New unified service

### Backwards Compatibility
- All existing APIs maintained for compatibility
- CrosshairTargeting utility still available for legacy code
- No breaking changes to weapon definitions or ship systems

## Expected Results

With unified targeting, you should see:

1. **✅ Perfect Synchronization**: Crosshair display exactly matches weapon hit probability
2. **✅ Consistent Behavior**: All weapons use identical targeting logic
3. **✅ Better Performance**: Cached targeting reduces redundant calculations
4. **✅ Easier Debugging**: Single place to debug all targeting issues
5. **✅ Maintainable Code**: Changes to targeting logic only need to be made in one place

## Future Enhancements

The unified architecture enables easy addition of:
- Predictive targeting for moving targets
- Advanced weapon-specific targeting modes
- AI-assisted targeting suggestions
- Multi-target weapon systems
- Dynamic targeting based on ship systems status

## Testing

Test the unified targeting by:
1. Firing missiles - should hit when crosshair shows valid target
2. Checking console logs - should show unified targeting messages
3. Weapon switching - crosshair should immediately reflect new weapon range
4. Target movement - should maintain consistent targeting across all systems