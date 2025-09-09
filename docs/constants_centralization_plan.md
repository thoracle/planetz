# Constants Centralization Implementation Plan

## Executive Summary

The Planetz codebase currently suffers from scattered magic numbers and constants throughout multiple systems, making maintenance difficult and creating inconsistencies. This document outlines a comprehensive plan to centralize all constants into a unified, type-safe system.

## Current State Analysis

### Identified Magic Number Categories

#### 1. **Distance & Range Constants**
- **Discovery System**: 25km, 100km, 150km discovery radii
- **Radar Systems**: 25km, 50km, 100km detection ranges  
- **Weapon Systems**: Various range values in meters/km
- **Proximity Detection**: 25000, 50000, 100000 meter ranges
- **Spatial Grid**: 50-unit grid cell sizes

#### 2. **Time & Performance Constants**
- **Discovery Intervals**: 5000ms (5 seconds)
- **Cooldowns**: 10000ms, 30000ms
- **Animation Durations**: 2000ms, 3000ms, 5000ms
- **Performance Budgets**: 16ms frame budget
- **Batch Limits**: 50, 100 objects per frame

#### 3. **Economic Constants**
- **Starting Credits**: 50000 credits (scattered across multiple files)
- **Ship Costs**: 25000, 50000 credits
- **Energy Values**: 1000 energy units

#### 4. **UI & Visual Constants**
- **Z-Index Values**: 1000, 10000
- **Canvas Sizes**: 1000x1000 pixels
- **Border Radius**: Various pixel values
- **Color Values**: RGB/RGBA strings

#### 5. **Spatial & Physics Constants**
- **Sector Sizes**: 100000 units
- **Star Counts**: 5000-500000 range
- **Health Values**: 50000 for stars
- **Grid Spacing**: 2000m, 4000m, 8000m

### Current Problems

1. **Inconsistency**: Same logical values defined differently across files
2. **Maintenance Burden**: Changes require hunting through entire codebase
3. **No Type Safety**: Magic numbers provide no context or validation
4. **Poor Documentation**: Constants lack clear purpose and relationships
5. **Testing Difficulty**: Hard to mock or override values for testing

## Proposed Architecture

### 1. **Hierarchical Constants Structure**

```
frontend/static/js/constants/
├── index.js                    # Main exports and validation
├── GameConstants.js            # Core game mechanics
├── SystemConstants.js          # Ship systems and equipment
├── UIConstants.js              # Interface and visual constants
├── PerformanceConstants.js     # Performance and optimization
├── EconomicConstants.js        # Credits, costs, rewards
└── PhysicsConstants.js         # Spatial, physics, and math
```

### 2. **Constant Categories Design**

#### **GameConstants.js**
```javascript
export const DISCOVERY = {
    RADIUS: {
        DEFAULT: 100,           // km - balanced discovery progression
        MINIMUM: 25,            // km - combat range minimum
        MAXIMUM: 200,           // km - long range exploration
        SOL_STAR: 20,          // km - always discovered first
        STATIONS: 60,           // km - infrastructure discovery
        PLANETS: 150,           // km - major exploration targets
    },
    INTERVALS: {
        CHECK_FREQUENCY: 5000,  // ms - discovery check interval
        BATCH_SIZE: 50,         // objects per frame
    },
    GRID: {
        CELL_SIZE: 50,          // km - spatial partitioning
        BUFFER_CELLS: 1,        // extra cells to check
    }
};

export const COORDINATE_SYSTEM = {
    UNITS: 'kilometers',        // 1 game unit = 1 km
    CONVERSION: {
        METERS_TO_KM: 0.001,
        KM_TO_METERS: 1000,
    }
};
```

#### **SystemConstants.js**
```javascript
export const RADAR = {
    RANGES: {
        BASIC: 25000,           // meters - 25km basic radar
        ADVANCED: 50000,        // meters - 50km advanced radar
        LONG_RANGE: 100000,     // meters - 100km long range
    },
    ZOOM_LEVELS: {
        COMBAT: { range: 25000, label: '25km', magnification: 1.0 },
        SECTOR: { range: 50000, label: '50km', magnification: 0.5 },
        LONG_RANGE: { range: 100000, label: '100km', magnification: 0.25 },
    }
};

export const WEAPONS = {
    DEFAULT_RANGE: 30000,       // meters
    RANGE_SCALING: {
        BASE_KM: 50,            // km - base range for scaling
        MAX_MULTIPLIER: 2.0,    // maximum range multiplier
    }
};
```

#### **PerformanceConstants.js**
```javascript
export const PERFORMANCE = {
    FRAME_BUDGET: 16,           // ms - 60fps target
    BATCH_LIMITS: {
        DISCOVERY: 50,          // objects per discovery batch
        RENDERING: 100,         // objects per render batch
        AI_UPDATES: 25,         // AI entities per frame
    },
    INTERVALS: {
        DISCOVERY_CHECK: 5000,  // ms
        PERFORMANCE_MONITOR: 1000, // ms
        CLEANUP_CYCLE: 30000,   // ms
    },
    THRESHOLDS: {
        WARNING_TIME: 16,       // ms - performance warning
        CRITICAL_TIME: 33,      // ms - critical performance
        MAX_HISTORY: 100,       // performance samples to keep
    }
};
```

#### **EconomicConstants.js**
```javascript
export const ECONOMY = {
    STARTING_CREDITS: 50000,
    SHIPS: {
        BASIC_FIGHTER: 25000,
        ADVANCED_FIGHTER: 50000,
        // ... other ship costs
    },
    ENERGY: {
        STARTING_AMOUNT: 1000,
        MAXIMUM_CAPACITY: 10000,
    },
    REWARDS: {
        MISSION_TIERS: {
            1: { cards: 6, credits: 5000 },
            2: { cards: 12, credits: 15000 },
            3: { cards: 18, credits: 25000 },
            4: { cards: 21, credits: 35000 },
            5: { cards: 24, credits: 50000 },
        }
    }
};
```

#### **UIConstants.js**
```javascript
export const UI = {
    Z_INDEX: {
        BACKGROUND: 1,
        GAME_UI: 1000,
        MODALS: 10000,
        TOOLTIPS: 20000,
        DEBUG: 99999,
    },
    CANVAS: {
        DEFAULT_SIZE: 1000,     // pixels - square canvas
        STAR_CHARTS: { width: 1000, height: 1000 },
    },
    ANIMATIONS: {
        FAST: 1000,             // ms - quick transitions
        NORMAL: 2000,           // ms - standard animations
        SLOW: 3000,             // ms - dramatic effects
        DISCOVERY_BANNER: 5000, // ms - discovery notification
    },
    COLORS: {
        SUCCESS: 'rgba(0, 255, 68, 0.9)',
        WARNING: 'rgba(255, 255, 68, 0.7)',
        ERROR: 'rgba(255, 68, 68, 0.9)',
        INFO: 'rgba(68, 68, 255, 0.9)',
    }
};
```

#### **PhysicsConstants.js**
```javascript
export const PHYSICS = {
    SECTOR_SIZE: 100000,        // units - sector dimensions
    HEALTH: {
        STAR_HEALTH: 50000,     // essentially indestructible
        STATION_HEALTH: 10000,
        SHIP_HEALTH: 1000,
    },
    SPATIAL: {
        GRID_SPACING: {
            CLOSE: 2000,        // meters - combat range
            MEDIUM: 4000,       // meters - sector view  
            FAR: 8000,          // meters - long range
        }
    }
};
```

### 3. **Implementation Strategy**

#### **Phase 1: Core Infrastructure (Week 1)**
1. Create constants directory structure
2. Implement base constant files with validation
3. Create migration utilities and documentation
4. Set up automated testing for constants

#### **Phase 2: Critical Systems (Week 2)**
1. **Discovery System**: Migrate StarChartsManager constants
2. **Radar Systems**: Centralize all radar-related values
3. **Performance**: Consolidate timing and batch limits
4. **Economic**: Unify credit and cost systems

#### **Phase 3: UI & Visual (Week 3)**
1. **Interface Constants**: Z-index, colors, animations
2. **Canvas & Rendering**: Size and visual parameters
3. **Proximity Detection**: Range and zoom configurations

#### **Phase 4: Physics & Spatial (Week 4)**
1. **Coordinate Systems**: Unify unit conversions
2. **Spatial Grid**: Consolidate grid parameters
3. **Health & Damage**: Standardize entity properties

#### **Phase 5: Validation & Testing (Week 5)**
1. Comprehensive testing of all migrated systems
2. Performance impact analysis
3. Documentation completion
4. Code review and cleanup

### 4. **Implementation Details**

#### **Constants Validation System**
```javascript
// constants/index.js
import { validateConstants } from './validation.js';

// Validate all constants on import
const allConstants = {
    DISCOVERY,
    RADAR,
    PERFORMANCE,
    ECONOMY,
    UI,
    PHYSICS
};

// Runtime validation
if (process.env.NODE_ENV !== 'production') {
    validateConstants(allConstants);
}

export * from './GameConstants.js';
export * from './SystemConstants.js';
export * from './UIConstants.js';
export * from './PerformanceConstants.js';
export * from './EconomicConstants.js';
export * from './PhysicsConstants.js';
```

#### **Migration Utilities**
```javascript
// utils/ConstantsMigration.js
export class ConstantsMigration {
    static deprecatedWarning(oldValue, newConstant, context) {
        console.warn(`⚠️  DEPRECATED: ${context} using magic number ${oldValue}. Use ${newConstant} instead.`);
    }
    
    static validateMigration(oldSystem, newSystem) {
        // Compare old vs new values to ensure no breaking changes
    }
}
```

#### **Type Safety & Documentation**
```javascript
/**
 * Discovery system constants
 * @namespace DISCOVERY
 * @property {Object} RADIUS - Discovery radius configurations in kilometers
 * @property {number} RADIUS.DEFAULT - Standard discovery radius (100km)
 * @property {number} RADIUS.SOL_STAR - SOL star discovery distance (20km)
 */
export const DISCOVERY = {
    RADIUS: {
        DEFAULT: 100,
        SOL_STAR: 20,
        // ... with JSDoc for each constant
    }
};
```

### 5. **Migration Process**

#### **Step-by-Step Migration**
1. **Identify**: Scan file for magic numbers
2. **Categorize**: Determine which constant category
3. **Replace**: Update code to use centralized constant
4. **Test**: Verify functionality unchanged
5. **Document**: Update comments and documentation

#### **Example Migration**
```javascript
// BEFORE (StarChartsManager.js)
this.gridSize = 50;                  // Magic number
this.discoveryInterval = 5000;       // Magic number
const discoveryRangeKm = 100;        // Magic number

// AFTER
import { DISCOVERY } from '../constants/GameConstants.js';

this.gridSize = DISCOVERY.GRID.CELL_SIZE;
this.discoveryInterval = DISCOVERY.INTERVALS.CHECK_FREQUENCY;
const discoveryRangeKm = DISCOVERY.RADIUS.DEFAULT;
```

### 6. **Benefits**

#### **Immediate Benefits**
- **Single Source of Truth**: All related constants in one place
- **Better Documentation**: Clear purpose and relationships
- **Easier Maintenance**: Change once, update everywhere
- **Type Safety**: Validation and error checking

#### **Long-term Benefits**
- **Easier Testing**: Mock and override constants for tests
- **Configuration**: Runtime configuration possibilities
- **Consistency**: Prevent drift between related systems
- **Onboarding**: New developers understand system relationships

### 7. **Risk Mitigation**

#### **Breaking Changes**
- Maintain backward compatibility during migration
- Gradual rollout with feature flags
- Comprehensive testing at each phase

#### **Performance Impact**
- Constants are compile-time values (no runtime cost)
- Tree-shaking eliminates unused constants
- Benchmark before/after performance

#### **Team Coordination**
- Clear migration schedule and responsibilities
- Code review requirements for constant changes
- Documentation updates with each phase

### 8. **Success Metrics**

#### **Quantitative Metrics**
- **Reduction in Magic Numbers**: Target 90% reduction
- **Code Duplication**: Eliminate duplicate constant definitions
- **Test Coverage**: 100% coverage of constants usage
- **Performance**: No degradation in game performance

#### **Qualitative Metrics**
- **Developer Experience**: Easier to find and modify constants
- **Code Maintainability**: Reduced time to implement changes
- **System Understanding**: Clearer relationships between systems

### 9. **Future Enhancements**

#### **Configuration System**
- Runtime configuration for different game modes
- Player-customizable constants (difficulty settings)
- A/B testing infrastructure for game balance

#### **Validation & Monitoring**
- Runtime validation of constant relationships
- Performance monitoring of constant-dependent systems
- Automated detection of new magic numbers in CI/CD

### 10. **Conclusion**

This centralization effort will significantly improve the maintainability, consistency, and developer experience of the Planetz codebase. The phased approach minimizes risk while delivering immediate benefits, and the proposed architecture provides a solid foundation for future enhancements.

The investment in proper constants management will pay dividends in reduced debugging time, easier feature development, and improved system reliability.

---

**Next Steps:**
1. Review and approve this implementation plan
2. Assign team members to each phase
3. Set up development branch for constants migration
4. Begin Phase 1 implementation
