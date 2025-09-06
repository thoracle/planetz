# Star Charts ↔ Target Computer Integration Sequence Diagram

## Overview
This diagram shows the exact click-to-target flow: when a user clicks a celestial object in Star Charts, that object becomes the current target in the Target Computer HUD using the centralized wireframe system.

## Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant UI as StarChartsUI
    participant SCM as StarChartsManager
    participant TCM as TargetComputerManager
    participant INTEG as StarChartsTargetComputerIntegration

    User->>UI: Click on object (SVG element)
    UI->>UI: handleMapClick(event)
    UI->>UI: Check isInteractiveElement (data-object-id, scanner-*, data-name)
    UI->>UI: Extract objectId from clicked element
    UI->>SCM: getObjectData(objectId) / findObjectByName(objectId)
    UI->>UI: selectObject(object)

    UI->>UI: showObjectDetails(object)
    UI->>UI: centerOn(object) - always center clicked object
    UI->>UI: zoomInIfAllowed() - increment zoom unless at max
    UI->>UI: render()
    UI->>SCM: selectObjectById(object.id)

    note over SCM: normalizeObjectId(objectId)
    SCM->>SCM: Normalize ID (e.g., a0_ → A0_)

    alt Target Computer available
        opt Ensure enabled
            SCM->>TCM: targetComputerEnabled = true (if false)
        end
        SCM->>TCM: setTargetById(normalizedId)
        alt Success
            SCM->>SCM: triggerTargetSelectionCallbacks(normalizedId)
        else Fail-fast (Dev)
            SCM->>SCM: throw Error("Target lookup failed") - crash for debugging
        end
    else Not available
        SCM->>SCM: Warn integration not available
    end

    rect rgb(240, 248, 255)
        Note over INTEG: Integration callback (pauseSync=true)
        SCM-->>INTEG: handleTargetSelection(normalizedId)
        INTEG->>TCM: setTargetWithEnhancedData(objectId, basicData)
        TCM->>TCM: setTargetById(objectId)
        TCM->>TCM: updateTargetDisplay()
        note right: Simplified - removed enhanced metadata processing
        Note over INTEG: Resume sync after 2s delay
    end

    INTEG->>INTEG: syncTargetData() - sync every 10s
    INTEG->>INTEG: hydrateMissingObjects()
    note right: Removed updateEnhancedTargets() - not critical

    UI->>User: Target appears in Target CPU HUD with correct wireframe
```

## 🎯 Key Process Flow

### 1. User Interaction
- User clicks an object in Star Charts UI
- `StarChartsUI.handleMapClick()` checks `isInteractiveElement` (data-object-id, scanner-*, data-name)
- Extracts `objectId` from clicked element
- Calls `StarChartsManager.getObjectData(objectId)` or `findObjectByName(objectId)`
- `StarChartsUI.selectObject()` centers object and zooms in (unless at max zoom)

### 2. Target Acquisition (Simplified)
- `StarChartsManager.selectObjectById()` normalizes ID (e.g., `a0_` → `A0_`)
- Ensures `TargetComputerManager.targetComputerEnabled` is true
- **Single attempt**: `TargetComputerManager.setTargetById(normalizedId)`
- **No fallbacks**: Throws error and crashes if target lookup fails (fail-fast for dev)
- On success: `triggerTargetSelectionCallbacks(normalizedId)`

### 3. Integration Callback (Streamlined)
- `StarChartsTargetComputerIntegration.handleTargetSelection()` receives callback
- Temporarily pauses sync (`pauseSync = true`) to prevent interference
- Calls `setTargetWithEnhancedData()` with basic data
- Forces `TargetComputerManager.updateTargetDisplay()`
- Resumes sync after 2s delay

### 4. Simplified Synchronization (Essential Only)
- `StarChartsTargetComputerIntegration` runs sync every **10 seconds**:
  - `syncTargetData()`: Ensures discovered objects are available as targets
  - `hydrateMissingObjects()`: Attaches Three.js objects for wireframe rendering
  - **Removed**: `updateEnhancedTargets()` (metadata enhancement not critical)

### 5. Target Persistence
- **No automatic clearing**: Targets persist until manually changed or sector warp
- **Range monitoring disabled**: Targets don't clear when objects go out of range
- **Discovery isolation**: New discoveries only show notifications, don't change current target

### 6. Wireframe Generation
- Uses centralized `WireframeTypes.js` system
- `getWireframeType(objectType)` provides single source of truth
- Stations get `torus` geometry, ships get `box` geometry
- Planets get `icosahedron`, moons get `octahedron`, beacons get `octahedron` (simple pyramid)

### 6. HUD Update
- `TargetComputerManager.updateTargetDisplay()` refreshes Target CPU HUD
- Wireframes render with correct geometry based on centralized mappings

## 🔄 Key Integration Points

- **Star Charts ↔ Target Computer**: Simplified sync via callbacks and 10s interval sync
- **Frontend ↔ Backend**: Async state updates via GameStateManager
- **Discovery ↔ Missions**: Automatic mission unlocking
- **Memory ↔ Storage**: Persistent state management
- **Wireframe System**: Centralized `WireframeTypes.js` for consistent geometry mapping
- **Essential Target Data**: Basic target data with Three.js object hydration
- **Object Hydration**: Three.js objects attached to metadata-only targets
- **Target Persistence**: No automatic clearing (manual changes only)

## 📋 Components Involved

- **StarChartsUI**: User interface for Star Charts system
- **StarChartsManager**: Core discovery and management logic
- **DiscoveryState**: Local storage persistence layer
- **StarChartsTargetComputerIntegration**: Enhanced bridge between Star Charts and Target Computer
- **TargetComputerManager**: Target acquisition and management with centralized wireframes
- **WireframeTypes.js**: Centralized wireframe type mappings
- **GameStateManager**: Backend state persistence
- **MissionIntegration**: Mission discovery and state management

## 🚀 Integration Benefits

- **Seamless Discovery**: Objects discovered in Star Charts automatically become available targets
- **Simplified Sync**: 10-second interval sync + callback-based updates (reduced complexity)
- **Persistent State**: All discoveries saved and restored between sessions
- **Mission Integration**: Discoveries can unlock new missions automatically
- **Unified Experience**: Single workflow from discovery to targeting
- **Centralized Wireframes**: Consistent geometry mapping across all systems
- **Essential Target Data**: Basic target data with reliable Three.js object hydration
- **Fail-Fast Approach**: Throws errors to crash and expose bugs during development
- **Persistent Targeting**: Targets remain until manually changed (no auto-clearing)

---

*This diagram reflects the current simplified implementation with centralized wireframe system and streamlined Star Charts ↔ Target Computer integration.*
