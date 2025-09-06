# Star Charts ↔ Target Computer Integration Sequence Diagram

## Overview
This diagram shows the exact click-to-target flow: when a user clicks a celestial object in Star Charts, that object becomes the current target in the Target Computer HUD.

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
    UI->>UI: Resolve objectId/name from data-* attrs
    UI->>SCM: getObjectData(objectId) / findObjectByName(name)
    UI->>UI: selectObject(object)
    UI->>UI: showObjectDetails(object)
    UI->>UI: centerOn(object)
    UI->>UI: zoomInIfAllowed()
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
        else Fallback by name
            SCM->>TCM: setTargetByName(object.name)
            alt Success
                SCM->>SCM: triggerTargetSelectionCallbacks(normalizedId)
            else Last resort
                SCM->>TCM: setTargetById(normalizedId)
                SCM->>SCM: triggerTargetSelectionCallbacks(normalizedId)
            end
        end
    else Not available
        SCM->>SCM: Warn integration not available
    end

    TCM->>TCM: updateTargetDisplay()

    rect rgb(240, 248, 255)
        Note over INTEG: Registered as selection callback
        SCM-->>INTEG: onTargetSelection(normalizedId)
        INTEG->>INTEG: getEnhancedTargetData(id)
        INTEG->>TCM: setTargetWithEnhancedData(id, data)
        TCM->>TCM: setTargetById(id)
        TCM->>TCM: updateTargetDisplay()
        INTEG->>TCM: applyEnhancedDataToTarget(id, data) [async]
    end

    UI->>User: Target appears in Target CPU HUD
```

## 🎯 Key Process Flow

### 1. User Interaction
- User clicks an object in Star Charts UI
- `StarChartsUI.handleMapClick()` resolves the element → objectId/name
- `StarChartsUI.selectObject()` centers/zooms, then calls `StarChartsManager.selectObjectById()`

### 2. Target Acquisition
- `StarChartsManager.normalizeObjectId()` normalizes IDs (e.g., `a0_` → `A0_`)
- Ensures `TargetComputerManager.targetComputerEnabled` is true
- Calls `TargetComputerManager.setTargetById()`
- Falls back to `setTargetByName()` if needed
- On success, calls `StarChartsManager.triggerTargetSelectionCallbacks()`

### 3. Integration Callback
- `StarChartsTargetComputerIntegration` is registered via `addTargetSelectionCallback`
- On selection: `handleTargetSelection()` → `setTargetWithEnhancedData()`
- Reinforces target via `setTargetById()` and forces `updateTargetDisplay()`
- Applies enhanced target data asynchronously

### 4. HUD Update
- `TargetComputerManager.updateTargetDisplay()` refreshes the Target CPU HUD

## 🔄 Key Integration Points

- **Star Charts ↔ Target Computer**: Real-time sync via callbacks
- **Frontend ↔ Backend**: Async state updates via GameStateManager
- **Discovery ↔ Missions**: Automatic mission unlocking
- **Memory ↔ Storage**: Persistent state management

## 📋 Components Involved

- **StarChartsUI**: User interface for Star Charts system
- **StarChartsManager**: Core discovery and management logic
- **DiscoveryState**: Local storage persistence layer
- **StarChartsIntegration**: Bridge between Star Charts and Target Computer
- **TargetComputerManager**: Target acquisition and management
- **GameStateManager**: Backend state persistence
- **MissionIntegration**: Mission discovery and state management

## 🚀 Integration Benefits

- **Seamless Discovery**: Objects discovered in Star Charts automatically become available targets
- **Real-time Sync**: No delay between discovery and target availability
- **Persistent State**: All discoveries saved and restored between sessions
- **Mission Integration**: Discoveries can unlock new missions automatically
- **Unified Experience**: Single workflow from discovery to targeting

---

*This diagram was generated as part of Phase 5: Star Charts and Target Computer Integration implementation.*
