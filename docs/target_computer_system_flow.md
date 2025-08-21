# Target Computer System Flow - Complete UML Sequence Diagram

This diagram maps out the entire target computer system from user input to display, showing where faction information is getting lost.

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant SF as StarfieldManager
    participant TCM as TargetComputerManager
    participant SSM as SolarSystemManager
    participant SM as SpatialManager
    participant TC as TargetComputer (Ship System)
    participant HUD as Target HUD Display

    Note over U,HUD: INITIALIZATION PHASE
    U->>SF: Game loads
    SF->>SSM: Initialize solar system
    SSM->>SM: addObject(station, {name, faction, type})
    Note over SM: Stores metadata: {name: "Hermes Refinery", faction: "Free Trader Consortium", type: "station"}
    SSM->>TCM: addNonPhysicsTargets(targetData)
    Note over TCM: targetData = {name: "Hermes Refinery", object: stationMesh, faction: "Free Trader Consortium"}
    TCM->>TCM: targetObjects.push(targetData)

    Note over U,HUD: TARGET CYCLING PHASE
    U->>SF: Press TAB key
    SF->>SF: Check target computer operational
    SF->>TCM: cycleTarget(isManualCycle=true)
    TCM->>TCM: targetIndex = (targetIndex + 1) % targetObjects.length
    TCM->>TCM: currentTarget = targetObjects[targetIndex]
    TCM->>TCM: console.log("Target set: " + targetData.name)
    
    Note over TCM: CRITICAL ISSUE: targetData has correct name and faction
    
    TCM->>TC: setTarget(targetForSubTargeting)
    Note over TCM,TC: PROBLEM: targetForSubTargeting = targetData.object (Three.js mesh)
    Note over TCM,TC: The mesh object doesn't have name or faction - only the targetData does!
    
    TC->>TC: name = target.name || target.shipName || 'Unknown'
    Note over TC: target.name is undefined because target is just the mesh
    TC->>SM: getMetadata(target)
    SM-->>TC: metadata (should have faction info)
    TC->>TC: faction = metadata?.faction || 'Unknown'
    TC->>TC: console.log("Target set: " + name + " (" + faction + ")")
    Note over TC: Logs "Target set: Unknown (Free Trader Consortium)"
    
    TC->>HUD: Update display with target info
    HUD->>HUD: Show "Unknown (Free Trader Consortium)"

    Note over U,HUD: ROOT CAUSE ANALYSIS
    Note over TCM: TargetComputerManager has complete data in targetData
    Note over TCM: But passes only targetData.object (mesh) to ship's TargetComputer
    Note over TC: Ship's TargetComputer only gets the mesh, not the metadata
    Note over SM: SpatialManager should have metadata, but lookup may be failing
```

## Root Cause Analysis

The issue is in **TargetComputerManager.js** line 1452-1453:

```javascript
const targetForSubTargeting = isEnemyShip ? targetData.ship : (targetData?.object || targetData);
targetComputer.setTarget(targetForSubTargeting);
```

### The Problem:
1. **TargetComputerManager** has complete target information in `targetData` including name and faction
2. But it passes only `targetData.object` (the Three.js mesh) to the ship's **TargetComputer**
3. The mesh object doesn't have the name or faction information
4. The ship's **TargetComputer** tries to get the name from `target.name` but it's undefined
5. Even though **SpatialManager** should have the metadata, the lookup isn't working correctly

### The Fix:
Instead of passing just the mesh object, we need to ensure the target object passed to the ship's TargetComputer has the necessary properties (name, faction) either:
1. By copying them to the mesh object, or
2. By passing a wrapper object that includes both the mesh and metadata, or  
3. By fixing the SpatialManager metadata lookup

## Data Flow Issues:

1. **SolarSystemManager** → **SpatialManager**: ✅ Correct (stores complete metadata)
2. **SolarSystemManager** → **TargetComputerManager**: ✅ Correct (has complete targetData)
3. **TargetComputerManager** → **Ship TargetComputer**: ❌ **BROKEN** (passes only mesh object)
4. **Ship TargetComputer** → **SpatialManager**: ❌ **FAILING** (metadata lookup not working)
5. **Ship TargetComputer** → **HUD Display**: ❌ **BROKEN** (shows "Unknown" name)

The faction information is actually preserved and shows correctly because the SpatialManager lookup for faction works, but the name lookup fails because the mesh object doesn't have a `name` property.
