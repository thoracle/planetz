# Waypoint System Complete Flow - Sequence Diagram

This document provides a comprehensive Mermaid sequence diagram showing the complete flow from when a user presses the 'W' key to create a waypoint test mission through to mission completion.

## Overview

The waypoint system involves multiple components working together:
- **StarfieldManager**: Handles keyboard input and initiates waypoint test missions
- **WaypointManager**: Core waypoint management, creation, and lifecycle
- **TargetComputerManager**: Target cycling and selection integration
- **StarChartsUI**: Visual representation and interaction with waypoints
- **ActionRegistry**: Execution of waypoint actions (messages, audio, rewards)
- **MissionCompletionUI**: Mission completion celebration and rewards

## Complete Flow Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant StarfieldManager as StarfieldManager
    participant WaypointManager as WaypointManager
    participant TargetComputerManager as TargetComputerManager
    participant StarChartsUI as StarChartsUI
    participant ActionRegistry as ActionRegistry
    participant MissionAPI as MissionAPI
    participant MissionCompletionUI as MissionCompletionUI
    participant AudioManager as AudioManager
    participant HUD as HUD Systems

    %% Phase 1: Mission Creation (W Key Press)
    Note over User, HUD: Phase 1: Mission Creation & Setup
    
    User->>StarfieldManager: Press 'W' key
    StarfieldManager->>StarfieldManager: keydown event handler
    StarfieldManager->>StarfieldManager: createWaypointTestMission()
    
    StarfieldManager->>WaypointManager: Check if available
    WaypointManager-->>StarfieldManager: Available
    
    StarfieldManager->>WaypointManager: createTestMission()
    
    Note over WaypointManager: Select random mission template<br/>(Exploration, Combat, Discovery, Delivery)
    
    WaypointManager->>WaypointManager: Generate unique mission ID
    WaypointManager->>MissionAPI: Add mission to availableMissions
    MissionAPI-->>WaypointManager: Mission registered
    
    %% Create waypoints for the mission
    loop For each waypoint in template
        WaypointManager->>WaypointManager: createWaypoint(config)
        WaypointManager->>WaypointManager: validateWaypointConfig()
        WaypointManager->>WaypointManager: generateWaypointId()
        WaypointManager->>WaypointManager: activateWaypoint(waypointId)
        WaypointManager->>TargetComputerManager: registerWithTargetComputer()
    end
    
    %% Auto-accept mission for testing
    WaypointManager->>MissionAPI: Move to activeMissions
    WaypointManager->>TargetComputerManager: addWaypointsToTargets()
    
    WaypointManager->>StarfieldManager: Mission created successfully
    StarfieldManager->>HUD: Show success notification
    StarfieldManager->>AudioManager: Play success sound

    %% Phase 2: Target Selection & Navigation
    Note over User, HUD: Phase 2: Target Selection & Navigation
    
    User->>StarfieldManager: Press TAB key (cycle targets)
    StarfieldManager->>TargetComputerManager: cycleTarget()
    
    TargetComputerManager->>TargetComputerManager: Get available targets (including waypoints)
    TargetComputerManager->>TargetComputerManager: Select next target
    TargetComputerManager->>TargetComputerManager: setTarget()
    TargetComputerManager->>TargetComputerManager: createWaypointWireframe()
    TargetComputerManager->>TargetComputerManager: updateTargetDisplay()
    TargetComputerManager->>HUD: Update HUD with magenta waypoint colors
    
    %% Notify Star Charts of target change
    TargetComputerManager->>StarChartsUI: notifyStarChartsOfTargetChange()
    StarChartsUI->>StarChartsUI: render() - Update blinking target
    
    %% Alternative: User clicks waypoint in Star Charts
    alt User opens Star Charts
        User->>StarChartsUI: Press 'G' key (open Star Charts)
        StarChartsUI->>StarChartsUI: show() - Center on current target
        StarChartsUI->>StarChartsUI: render() - Display waypoints as magenta diamonds
        
        User->>StarChartsUI: Click waypoint
        StarChartsUI->>TargetComputerManager: setTargetById(waypointId)
        TargetComputerManager->>TargetComputerManager: Find waypoint in targets
        TargetComputerManager->>TargetComputerManager: setTarget()
        TargetComputerManager->>TargetComputerManager: createWaypointWireframe()
        TargetComputerManager->>HUD: Update HUD display
    end

    %% Phase 3: Navigation to Waypoint
    Note over User, HUD: Phase 3: Navigation to Waypoint
    
    User->>StarfieldManager: Navigate ship toward waypoint
    StarfieldManager->>StarfieldManager: updateShipPosition()
    
    %% Proximity checking loop (every 2 seconds)
    loop Proximity Check Loop
        WaypointManager->>WaypointManager: checkWaypointTriggers()
        WaypointManager->>StarfieldManager: getPlayerPosition()
        StarfieldManager-->>WaypointManager: [x, y, z] coordinates
        WaypointManager->>WaypointManager: calculateDistance(playerPos, waypointPos)
        
        alt Distance <= triggerRadius
            WaypointManager->>WaypointManager: triggerWaypoint(waypointId)
            break Proximity loop - waypoint triggered
        else Distance > triggerRadius
            Note over WaypointManager: Continue monitoring
        end
    end

    %% Phase 4: Waypoint Triggered & Action Execution
    Note over User, HUD: Phase 4: Waypoint Triggered & Action Execution
    
    WaypointManager->>WaypointManager: Set status to TRIGGERED
    WaypointManager->>WaypointManager: Record triggeredAt timestamp
    
    %% Execute all waypoint actions
    loop For each action in waypoint.actions
        WaypointManager->>WaypointManager: executeWaypointAction(action, waypoint)
        
        alt Action type: show_message
            WaypointManager->>ActionRegistry: create('show_message', parameters)
            ActionRegistry->>ActionRegistry: ShowMessageAction.execute()
            ActionRegistry->>HUD: Display message with title and text
            ActionRegistry->>AudioManager: Play audio file (if specified)
            ActionRegistry-->>WaypointManager: Action completed
            
        else Action type: play_comm
            WaypointManager->>ActionRegistry: create('play_comm', parameters)
            ActionRegistry->>ActionRegistry: PlayCommAction.execute()
            ActionRegistry->>AudioManager: Play communication audio
            ActionRegistry-->>WaypointManager: Audio playback started
            
        else Action type: spawn_ships
            WaypointManager->>ActionRegistry: create('spawn_ships', parameters)
            ActionRegistry->>ActionRegistry: SpawnShipsAction.execute()
            ActionRegistry->>StarfieldManager: Spawn enemy ships
            ActionRegistry-->>WaypointManager: Ships spawned
            
        else Action type: give_reward
            WaypointManager->>ActionRegistry: create('give_reward', parameters)
            ActionRegistry->>ActionRegistry: GiveRewardAction.execute()
            ActionRegistry->>MissionAPI: awardRewards(rewardData)
            MissionAPI->>HUD: Show reward notification
            ActionRegistry-->>WaypointManager: Rewards awarded
        end
    end

    %% Phase 5: Waypoint Completion
    Note over User, HUD: Phase 5: Waypoint Completion
    
    WaypointManager->>WaypointManager: Set status to COMPLETED
    WaypointManager->>WaypointManager: onWaypointCompleted(waypoint)
    
    %% Remove from target computer if currently targeted
    WaypointManager->>TargetComputerManager: Check if waypoint is current target
    alt Waypoint is current target
        WaypointManager->>TargetComputerManager: clearCurrentTarget()
        TargetComputerManager->>HUD: Clear target display
    end
    
    %% Notify mission system
    WaypointManager->>MissionAPI: handleWaypointCompleted(waypoint)
    MissionAPI->>MissionAPI: Check if all waypoints completed
    
    alt All waypoints completed
        MissionAPI->>MissionAPI: Set mission status to COMPLETED
        MissionAPI->>MissionCompletionUI: showMissionComplete(missionId, completionData)
        
        %% Mission completion celebration
        MissionCompletionUI->>MissionCompletionUI: Pause game
        MissionCompletionUI->>HUD: Show completion screen with rewards
        MissionCompletionUI->>AudioManager: Play mission complete sound
        MissionCompletionUI->>MissionCompletionUI: Animate reward cards
        
        %% Wait for user acknowledgment
        User->>MissionCompletionUI: Click "Continue" or press key
        MissionCompletionUI->>MissionCompletionUI: hideCompletionScreen()
        MissionCompletionUI->>StarfieldManager: resumeGame()
        
    else More waypoints remaining
        Note over MissionAPI: Mission continues with next waypoint
        WaypointManager->>WaypointManager: activateNextWaypoint(missionId)
    end

    %% Phase 6: Cleanup & Reset
    Note over User, HUD: Phase 6: Cleanup & Reset (Optional)
    
    opt User wants to clean up test missions
        User->>WaypointManager: cleanupTestMissions() (via console)
        WaypointManager->>MissionAPI: Remove test missions
        WaypointManager->>WaypointManager: Delete test waypoints
        WaypointManager->>TargetComputerManager: Refresh target list
        WaypointManager-->>User: Cleanup statistics
    end

    %% Performance Monitoring (Continuous)
    Note over WaypointManager, ActionRegistry: Performance Monitoring (Continuous)
    
    loop Performance Tracking
        WaypointManager->>WaypointManager: Track proximity check times
        ActionRegistry->>ActionRegistry: Track action execution times
        WaypointManager->>WaypointManager: Monitor memory usage
        
        alt Performance degradation detected
            WaypointManager->>HUD: Show performance warning
        end
    end
```

## Key Integration Points

### 1. **Keyboard Input Integration**
- **W Key**: Triggers `StarfieldManager.createWaypointTestMission()`
- **TAB Key**: Cycles through targets including waypoints via `TargetComputerManager.cycleTarget()`
- **G Key**: Opens Star Charts with waypoint visualization

### 2. **Target Computer Integration**
- Waypoints are registered as virtual targets with magenta color scheme
- Diamond-shaped wireframes distinguish waypoints from other targets
- Real-time synchronization between TAB cycling and Star Charts display

### 3. **Star Charts Integration**
- Waypoints displayed as magenta diamond icons
- Click-to-target functionality via `setTargetById()`
- Real-time blinking updates when targets change

### 4. **Action Execution System**
- **ActionRegistry**: Factory pattern for creating action instances
- **Async Execution**: All actions execute asynchronously with performance tracking
- **Error Handling**: Comprehensive error recovery and logging

### 5. **Mission System Integration**
- **Auto-Creation**: Test missions automatically created and accepted
- **Progress Tracking**: Waypoint completion triggers mission progress updates
- **Reward Distribution**: Integration with existing reward and credit systems

## Performance Considerations

### 1. **Proximity Checking**
- **Interval**: 2-second intervals to balance responsiveness and performance
- **Performance Tracking**: Execution time monitoring with warnings for slow operations
- **Early Exit**: Skip checks if player position unavailable

### 2. **Memory Management**
- **Cleanup**: Automatic cleanup of completed waypoints and test missions
- **Metrics Retention**: Limited retention of performance metrics (last 100 samples)
- **Target Cache**: Efficient target list management with periodic full scans

### 3. **UI Updates**
- **Throttled Updates**: HUD updates only when necessary
- **Animation Optimization**: CSS-based animations for smooth visual feedback
- **Event Batching**: Batch multiple UI updates for better performance

## Error Handling & Recovery

### 1. **Waypoint Creation Failures**
- **Validation**: Comprehensive configuration validation before creation
- **Rollback**: Automatic cleanup of partially created missions on failure
- **User Feedback**: Clear error messages and audio feedback

### 2. **Action Execution Failures**
- **Individual Recovery**: Failed actions don't prevent other actions from executing
- **Status Preservation**: Waypoint status reverts to ACTIVE on action failure
- **Logging**: Detailed error logging for debugging

### 3. **Integration Failures**
- **Graceful Degradation**: System continues functioning if optional components unavailable
- **Fallback Mechanisms**: Alternative execution paths for missing dependencies
- **System Health Checks**: Continuous monitoring of critical system availability

## Testing & Debugging

### 1. **Debug Channels**
- **WAYPOINTS**: Core waypoint system operations
- **TARGETING**: Target computer integration
- **STAR_CHARTS**: Star Charts UI updates
- **MISSIONS**: Mission system integration

### 2. **Test Mission Templates**
- **Exploration**: Navigation-focused missions with discovery elements
- **Combat**: Ship spawning and combat encounters
- **Discovery**: Multi-waypoint exploration sequences
- **Delivery**: Cargo and trading mission simulation

### 3. **Performance Monitoring**
- **Real-time Metrics**: Proximity check and action execution timing
- **Memory Tracking**: Waypoint and target cache memory usage
- **System Health**: Continuous monitoring of integration points

This sequence diagram represents the complete end-to-end flow of the waypoint system, from initial creation through mission completion, including all major integration points and error handling mechanisms.
