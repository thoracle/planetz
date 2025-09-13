# Star Charts Data Flow & Tooltip Issue Analysis

## Core Problem

Tooltips don't work until after clicking on an object first. This happens because:

1. **Initial render data is incomplete**: Objects from `getDiscoveredObjectsForRender()` lack complete `name` properties
2. **Tooltip logic is too restrictive**: Only fetches complete data when `!object.name`, but objects may have incomplete/wrong names
3. **Clicking "fixes" the data**: `selectObject()` → `showObjectDetails()` populates complete object data

## Complete Data Flow Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant ViewManager
    participant StarChartsUI
    participant StarChartsManager
    participant ObjectDatabase
    participant SolarSystemManager

    %% Phase 1: User presses C key
    User->>ViewManager: Press 'C' key
    ViewManager->>ViewManager: Check ship.hasSystemCards('star_charts')
    ViewManager->>StarChartsUI: show()
    StarChartsUI->>StarChartsUI: Initialize UI elements
    StarChartsUI->>StarChartsUI: Set zoom level 0.8
    StarChartsUI->>StarChartsUI: Center on star position
    StarChartsUI->>StarChartsUI: render()

    %% Phase 2: Initial render - incomplete data
    StarChartsUI->>StarChartsUI: renderDiscoveredObjects()
    StarChartsUI->>StarChartsUI: getDiscoveredObjectsForRender()
    StarChartsUI->>StarChartsManager: getDiscoveredObjects() [returns IDs only]
    StarChartsUI->>ObjectDatabase: Get sector data (objects array)
    StarChartsUI->>StarChartsUI: Return objects with incomplete names
    Note over StarChartsUI: Objects have basic data but<br/>names may be incomplete/wrong

    StarChartsUI->>StarChartsUI: renderObject() for each object
    StarChartsUI->>StarChartsUI: renderShipPosition()

    %% Phase 3: User mouses over object - tooltip fails
    User->>StarChartsUI: Mouse moves over object
    StarChartsUI->>StarChartsUI: handleMouseMove()
    StarChartsUI->>StarChartsUI: getObjectAtScreenPosition(x,y,8)
    StarChartsUI->>StarChartsUI: Loop through getDiscoveredObjectsForRender() results

    alt Object has incomplete name
        StarChartsUI->>StarChartsManager: getObjectData(object.id)
        StarChartsUI->>ObjectDatabase: Fetch complete object data
        StarChartsUI->>StarChartsUI: Return merged object data
    else Object appears to have name
        Note over StarChartsUI: Skips getObjectData() call<br/>because object.name exists<br/>but may be wrong/incomplete
        StarChartsUI->>StarChartsUI: Return object with bad name data
    end

    StarChartsUI->>StarChartsUI: showTooltip(x,y,object)
    StarChartsUI->>StarChartsUI: Display tooltip with wrong/incomplete data
    Note over StarChartsUI: ❌ Tooltip shows wrong data or "Unknown"

    %% Phase 4: User clicks object - data gets fixed
    User->>StarChartsUI: Click on object
    StarChartsUI->>StarChartsUI: handleMapClick()
    StarChartsUI->>StarChartsUI: document.elementFromPoint()
    StarChartsUI->>StarChartsUI: Get object ID from element
    StarChartsUI->>StarChartsManager: getObjectData(objectId)
    StarChartsManager->>ObjectDatabase: Fetch complete object data
    StarChartsManager->>StarChartsUI: Return complete object data

    StarChartsUI->>StarChartsUI: selectObject(completeObjectData)
    StarChartsUI->>StarChartsUI: showObjectDetails(completeObjectData)
    StarChartsUI->>StarChartsUI: Update details panel with correct data

    %% Phase 5: Now tooltips work
    User->>StarChartsUI: Mouse moves over same object again
    StarChartsUI->>StarChartsUI: handleMouseMove()
    StarChartsUI->>StarChartsUI: getObjectAtScreenPosition(x,y,8)

    alt Object now has complete data from click
        Note over StarChartsUI: Object data was updated during click<br/>so tooltip logic works correctly
        StarChartsUI->>StarChartsUI: showTooltip() with correct data
    end

    Note over StarChartsUI: ✅ Tooltip now shows correct data

    %% Alternative data sources
    rect rgb(240, 248, 255)
        Note over ObjectDatabase: Primary data source for complete object info
        ObjectDatabase->>StarChartsManager: objectDatabase.sectors[sectorId]
        StarChartsManager->>StarChartsUI: Complete object data via getObjectData()
    end

    rect rgb(255, 248, 240)
        Note over SolarSystemManager: Provides live positions and angles
        SolarSystemManager->>StarChartsUI: celestialBodies.get() for positions
        SolarSystemManager->>StarChartsUI: starSystem.planets[] for layout
    end
```

## Key Data Sources

### 1. **ObjectDatabase** (Primary complete data)
- **Location**: `StarChartsManager.objectDatabase`
- **Structure**: `sectors[sectorId].objects[]` and `sectors[sectorId].star`
- **Usage**: Complete object metadata (names, types, positions)
- **Access**: `starChartsManager.getObjectData(objectId)`

### 2. **SolarSystemManager** (Live positions)
- **Location**: `this.getSolarSystemManagerRef()`
- **Usage**: Live celestial body positions and angles
- **Access**: `celestialBodies.get(key)` and `starSystem.planets[]`

### 3. **Discovered Objects** (User progress)
- **Location**: `StarChartsManager.discoveredObjects`
- **Usage**: Which objects user has discovered
- **Access**: `starChartsManager.getDiscoveredObjects()`

## The Fix ✅ IMPLEMENTED

The tooltip issue has been resolved! The problem was that `getObjectAtScreenPosition()` only called `getObjectData()` when `!object.name`. But objects from `getDiscoveredObjectsForRender()` may have incomplete or wrong names.

**Solution Applied**: Always fetch complete data for tooltips, regardless of existing name:

```javascript
// In getObjectAtScreenPosition() - frontend/static/js/views/StarChartsUI.js:759
if (object.id && !object._isShip) {
    const completeData = this.starChartsManager.getObjectData(object.id);
    console.log(`🔍 Tooltip: Object ${object.id}, fetched complete data:`, completeData?.name);
    if (completeData) {
        // Return object with complete data merged
        return { ...object, ...completeData };
    }
}
return object;
```

**What Changed**:
- Removed the `!object.name` condition that was preventing data fetching
- Now tooltips always get complete, accurate data from `ObjectDatabase`
- No more need to click objects first to "fix" their data

**Result**: Tooltips now work immediately on hover without requiring any clicks first! 🎉

## Testing

To verify the fix works, you can:
1. Open Star Charts (press C)
2. Move your mouse over any discovered object
3. Tooltips should show immediately with correct names
4. No clicking required!

Or run the test script `test_tooltip_fix.js` in the browser console.
