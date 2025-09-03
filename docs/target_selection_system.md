# Target Selection System

## Overview

The Target Selection System in Planetz provides intelligent targeting capabilities with automatic target acquisition and bidirectional manual cycling. The system includes special protection for targets selected from the long-range scanner, while automatically switching between targets that go out of range during normal operation.

## System Architecture

```mermaid
stateDiagram-v2
    [*] --> TargetComputerOff : System Start
    
    TargetComputerOff --> TargetComputerEnabled : User Activates (T key)
    TargetComputerEnabled --> TargetComputerOff : User Deactivates (T key)
    
    TargetComputerEnabled --> ScanningForTargets : Auto Scan
    
    ScanningForTargets --> NoTargetsFound : No Objects in Range
    ScanningForTargets --> TargetsDetected : Objects Found
    
    NoTargetsFound --> NoTargetsMode : Display "No Targets"
    NoTargetsMode --> TargetsDetected : New Objects Enter Range
    NoTargetsMode --> TargetComputerOff : User Deactivates
    
    TargetsDetected --> NormalTargetAcquired : First Target Auto-Selected<br/>(isFromLongRangeScanner = false)
    TargetsDetected --> NormalTargetSelected : User Cycles Target (TAB/Shift+TAB)<br/>(isFromLongRangeScanner = false)
    TargetsDetected --> ScannerTargetSelected : Long-Range Scanner Selection<br/>(isFromLongRangeScanner = true)
    
    NormalTargetAcquired --> NormalTargetSelected : User Cycles (TAB/Shift+TAB)<br/>(isFromLongRangeScanner = false)
    NormalTargetAcquired --> AutoTargetSwitched : Target Out of Range (>150km)<br/>(Auto Switch Allowed)
    NormalTargetAcquired --> NoTargetsFound : All Targets Lost
    
    NormalTargetSelected --> NormalTargetSelected : User Cycles (TAB/Shift+TAB)<br/>(Forward/Backward)
    NormalTargetSelected --> AutoTargetSwitched : Target Out of Range (>150km)<br/>(Auto Switch Allowed)
    NormalTargetSelected --> NoTargetsFound : All Targets Lost
    
    ScannerTargetSelected --> NormalTargetSelected : User Cycles (TAB/Shift+TAB)<br/>(Switches to Normal Target)
    ScannerTargetSelected --> ScannerTargetProtected : Target Out of Range (>150km)<br/>(Scanner Protection Active)
    ScannerTargetSelected --> NoTargetsFound : All Targets Lost
    
    ScannerTargetProtected --> ScannerTargetSelected : Target Still Locked<br/>(Extended Range Maintained)
    ScannerTargetProtected --> NoTargetsFound : User Cycles to Available
    
    AutoTargetSwitched --> NormalTargetAcquired : New Auto Target
    AutoTargetSwitched --> NoTargetsFound : No Alternatives
```

## Sequence Diagram

The following sequence diagram shows the interactions between components during target selection operations:

```mermaid
sequenceDiagram
    participant User
    participant StarfieldManager as StarfieldManager
    participant TCM as TargetComputerManager
    participant LRS as LongRangeScanner
    participant TC as TargetComputer
    participant SM as SpatialManager
    participant UI as TargetHUD

    Note over User,UI: Target Computer Activation
    User->>StarfieldManager: Press 'T' key
    StarfieldManager->>TCM: activateTargetComputer()
    TCM->>TC: activate()
    TC->>UI: show("Target Computer Active")
    
    Note over User,UI: Automatic Target Acquisition
    TCM->>SM: spatialQuery(position, 150km)
    SM-->>TCM: nearbyEntities[]
    TCM->>TCM: updateTargetList()
    TCM->>TCM: filterByRange(150km)
    TCM->>TCM: cycleTarget() // Auto-select first
    TCM->>UI: updateTargetDisplay(target)
    TCM->>TCM: startRangeMonitoring()
    
    Note over User,UI: Manual Target Cycling
    User->>StarfieldManager: Press 'TAB' key
    StarfieldManager->>TCM: cycleTarget(forward=true)
    TCM->>TCM: targetIndex = (index + 1) % length
    TCM->>TCM: isFromLongRangeScanner = false
    TCM->>UI: updateTargetDisplay(newTarget)
    TCM->>StarfieldManager: syncTargetState()
    
    Note over User,UI: Long-Range Scanner Selection
    User->>LRS: Click target on scanner
    LRS->>LRS: createOutOfRangeTarget()
    LRS->>StarfieldManager: setTargetFromScanner(targetData)
    StarfieldManager->>TCM: setTargetFromScanner(targetData)
    TCM->>TCM: currentTarget = targetData
    TCM->>TCM: isFromLongRangeScanner = true
    TCM->>UI: updateTargetDisplay(scannerTarget)
    TCM->>TCM: startRangeMonitoring()
    
    Note over User,UI: Target Out of Range (Normal Target)
    TCM->>TCM: rangeMonitoringInterval()
    TCM->>TCM: calculateDistance(target)
    alt Target > 150km AND isFromLongRangeScanner = false
        TCM->>TCM: handleTargetOutOfRange()
        TCM->>TCM: clearCurrentTarget()
        TCM->>SM: spatialQuery(position, 150km)
        SM-->>TCM: alternativeTargets[]
        alt Alternatives found
            TCM->>TCM: cycleTarget() // Auto-switch
            TCM->>UI: updateTargetDisplay(newTarget)
        else No alternatives
            TCM->>UI: showNoTargetsDisplay()
        end
    end
    
    Note over User,UI: Target Out of Range (Scanner Target)
    alt Target > 150km AND isFromLongRangeScanner = true
        TCM->>TCM: handleTargetOutOfRange()
        Note over TCM: Scanner target protected - no auto-switch
        TCM->>UI: updateTargetDisplay(maintainLock=true)
    end
    
    Note over User,UI: Target Computer Deactivation
    User->>StarfieldManager: Press 'T' key
    StarfieldManager->>TCM: deactivateTargetComputer()
    TCM->>TCM: stopRangeMonitoring()
    TCM->>TCM: clearTargetComputer()
    TCM->>TC: deactivate()
    TC->>UI: hide()
```

## Core Components

### 1. Target Computer Manager (`TargetComputerManager.js`)
- **Primary Class**: Manages all targeting functionality
- **State Tracking**: Maintains target selection state and user preferences
- **Range Monitoring**: Continuously monitors target distances
- **Direction Indicators**: Shows off-screen target direction arrows

### 2. Target Selection States

#### Scanner Target Protection
- **`isFromLongRangeScanner`**: Boolean flag tracking targets from long-range scanner
- **`true`**: Target was selected from long-range scanner - Protected from auto-switching when out of range
- **`false`**: Target was acquired normally - Can be auto-switched when out of range

#### Range Filtering
- **Target Computer Level 3**: 150km detection range
- **Spatial Query**: Physics-based spatial queries with distance validation
- **Double Filtering**: Both spatial query and distance calculation ensure range compliance

## Use Cases

### 1. 🎯 **Initial Target Acquisition**

**Scenario**: Player activates target computer in area with objects
- **Trigger**: User presses `T` key to activate targeting
- **Behavior**: System automatically selects nearest target within 150km range
- **State**: `isFromLongRangeScanner = false`
- **Result**: Target can be automatically switched if it goes out of range

```javascript
// Example: Auto-acquisition on startup
this.cycleTarget(); // Auto-select nearest target
this.isFromLongRangeScanner = false;
```

### 2. 🔄 **Manual Target Cycling (Forward)**

**Scenario**: Player wants to select the next target in the list
- **Trigger**: User presses `TAB` key to cycle targets forward
- **Behavior**: Cycles through available targets in ascending order (within 150km range)
- **State**: `isFromLongRangeScanner = false`
- **Result**: Target can be automatically switched if it goes out of range

```javascript
// Example: Manual forward target selection
this.cycleTarget(true); // forward=true
this.isFromLongRangeScanner = false;
```

### 2b. 🔄 **Manual Target Cycling (Backward)**

**Scenario**: Player wants to select the previous target in the list
- **Trigger**: User presses `Shift+TAB` key to cycle targets backward
- **Behavior**: Cycles through available targets in descending order (within 150km range)
- **State**: `isFromLongRangeScanner = false`
- **Result**: Target can be automatically switched if it goes out of range

```javascript
// Example: Manual backward target selection
this.cycleTarget(false); // forward=false
this.isFromLongRangeScanner = false;
```

### 3. 📡 **Long-Range Scanner Target Protection**

**Scenario**: Target selected from long-range scanner goes out of normal range
- **Condition**: `isFromLongRangeScanner = true` AND target distance > 150km
- **Behavior**: Target lock is maintained, no automatic switching
- **Message**: "Current target out of range but was selected from long-range scanner - maintaining target lock"
- **Extended Range**: Scanner provides targeting data beyond normal target computer range

```javascript
if (this.isFromLongRangeScanner) {
    console.log(`🎯 Current target out of range but was selected from long-range scanner - maintaining target lock`);
    return; // Don't auto-switch scanner targets
}
```

### 4. 🔄 **Automatic Target Switching**

**Scenario**: Normal target goes out of range
- **Condition**: `isFromLongRangeScanner = false` AND target distance > 150km
- **Behavior**: Automatically switches to nearest available target within range
- **Message**: "Current target out of range - switching to nearest available target"
- **Seamless**: No user intervention required

```javascript
if (this.targetObjects.length > 0) {
    console.log(`🎯 Found ${this.targetObjects.length} alternative targets - selecting nearest`);
    this.cycleTarget(); // Auto-switch to nearest
}
```

### 5. 📡 **No Targets Monitoring**

**Scenario**: No targets in range, system monitors for new objects
- **Trigger**: All targets move out of range or are destroyed
- **Behavior**: Shows "No Targets in Range" display
- **Monitoring**: Checks every 2 seconds for new targets
- **Auto-Recovery**: Automatically acquires new targets when they appear

```javascript
// Monitoring interval for new targets
this.noTargetsInterval = setInterval(() => {
    this.updateTargetList();
    if (this.targetObjects.length > 0) {
        this.cycleTarget(false); // Auto-acquire
    }
}, 2000);
```

### 6. 🧭 **Direction Indicators**

**Scenario**: Target is off-screen or behind camera
- **Trigger**: Target screen position outside viewport bounds
- **Thresholds**: 
  - Show arrows: `|screenPos.x| > 0.95` OR `|screenPos.y| > 0.95` OR `screenPos.z > 1.0`
  - Hide arrows: `|screenPos.x| < 0.90` AND `|screenPos.y| < 0.90` AND `screenPos.z < 1.0`
- **Hysteresis**: Prevents flickering at screen edges
- **Visual**: Colored arrows at screen edges pointing toward target

### 7. 🎮 **User Controls**

| Key | Action | Result |
|-----|--------|--------|
| `T` | Toggle Target Computer | Activate/Deactivate entire system |
| `TAB` | Cycle Targets (Next) | Manual target selection forward (within 150km range) |
| `Shift+TAB` | Cycle Targets (Previous) | Manual target selection backward (within 150km range) |
| `N` | Toggle Effects | Toggle video tint and scan lines (comms HUD) |

### 8. 🔧 **System State Management**

#### Target Computer Activation
- **Clean State**: All flags reset to default values
- **Auto-Scan**: Immediately scans for available targets
- **Initial Selection**: Auto-selects nearest target if available

#### Target Computer Deactivation
- **State Reset**: All targeting data cleared
- **Flag Reset**: `isManuallySelectedTarget = false`
- **UI Cleanup**: All visual elements hidden

#### Target Destruction/Loss
- **Manual Targets**: Maintained until user cycles or all targets lost
- **Auto Targets**: Automatically switch to alternatives
- **Clean Transitions**: Proper state management during target changes

## Technical Implementation

### Key Methods

```javascript
// Core target selection
cycleTarget(forward = true)
- Cycles forward (next) or backward (previous) based on forward parameter
- Sets isFromLongRangeScanner = false for normal cycling
- Updates currentTarget and targetIndex
- Triggers UI updates and range monitoring

// Long-range scanner target selection
setTargetFromScanner(targetData)
- Sets target directly from long-range scanner data
- Sets isFromLongRangeScanner = true for protection
- Bypasses normal range limitations
- Maintains target lock beyond 150km range

// Range monitoring
handleTargetOutOfRange()
- Checks isFromLongRangeScanner flag
- Protects scanner targets from auto-switching
- Auto-switches normal targets when out of range

// Range filtering
updateTargetList()
- Physics-based spatial query with 150km range
- Double validation: spatial query + distance calculation
- Filters out all targets beyond target computer range

// State management
clearTargetComputer()
- Resets all target state variables
- Clears isFromLongRangeScanner flag
- Ensures clean system state
```

### State Persistence

The system maintains state across different scenarios:
- **Docking**: Target computer deactivated, state cleared
- **Undocking**: Target computer can be reactivated with fresh state
- **Sector Changes**: State reset for new environment
- **Combat**: Manual targets protected during engagement

## Benefits

### 1. **User Control**
- Players have full control over target selection
- Manual selections are respected and protected
- No frustrating automatic target switching during combat

### 2. **Intelligent Automation**
- System still provides helpful automatic target acquisition
- Seamless switching for auto-selected targets
- Reduces micromanagement for casual gameplay

### 3. **Clear Feedback**
- Console messages indicate system behavior
- Visual indicators show target status
- Direction arrows help locate off-screen targets

### 4. **Robust State Management**
- Proper flag management prevents edge cases
- Clean state transitions
- Predictable behavior across all scenarios

## Future Enhancements

### Potential Improvements
1. **Target Priority System**: Allow users to set target type preferences
2. **Target Memory**: Remember last manually selected target type
3. **Range Indicators**: Visual feedback for target range status
4. **Target Grouping**: Group targets by type or faction
5. **Hotkey Targeting**: Direct selection of specific target types

### Configuration Options
1. **Auto-Switch Toggle**: Allow users to disable auto-switching entirely
2. **Range Thresholds**: Customizable range limits for different target types
3. **Arrow Sensitivity**: Adjustable thresholds for direction indicators
4. **Audio Feedback**: Configurable audio cues for target events

This system provides a balanced approach between automation and user control, ensuring that players can rely on the system when needed while maintaining full control when desired.
