# Tab Targeting Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant StarfieldManager
    participant TargetComputerManager
    participant Ship
    participant AudioManager

    User->>StarfieldManager: Press TAB (or Shift+TAB)
    activate StarfieldManager

    StarfieldManager->>StarfieldManager: Check docking status
    alt Docked
        StarfieldManager->>AudioManager: playCommandFailedSound()
        StarfieldManager->>StarfieldManager: showHUDError("TARGET CYCLING UNAVAILABLE")
        note right: Blocks target cycling while docked
    else Undock cooldown active
        StarfieldManager->>StarfieldManager: Calculate remaining seconds
        StarfieldManager->>AudioManager: playCommandFailedSound()
        StarfieldManager->>StarfieldManager: showHUDError("TARGETING SYSTEMS WARMING UP")
        note right: Blocks during undock cooldown
    else Normal operation
        StarfieldManager->>Ship: getSystem('target_computer')
        Ship-->>StarfieldManager: targetComputer system

        StarfieldManager->>Ship: getSystem('energy_reactor')
        Ship-->>StarfieldManager: energyReactor system

        alt Target computer operational
            StarfieldManager->>TargetComputerManager: cycleTarget(forward)
            activate TargetComputerManager

            TargetComputerManager->>TargetComputerManager: Check docking/undock status
            TargetComputerManager->>TargetComputerManager: Check preventTargetChanges flag

            alt Valid to cycle
                TargetComputerManager->>TargetComputerManager: Hide target reticle temporarily
                TargetComputerManager->>TargetComputerManager: Calculate new target index
                TargetComputerManager->>TargetComputerManager: Update currentTarget reference

                TargetComputerManager->>TargetComputerManager: Handle scanner flag management
                note right: Clears isFromLongRangeScanner flag when cycling away from scanner target

                TargetComputerManager->>Ship: getSystem('target_computer')
                Ship-->>TargetComputerManager: targetComputer system
                TargetComputerManager->>Ship: setTarget(targetForSubTargeting)

                TargetComputerManager->>TargetComputerManager: Clear existing wireframe
                TargetComputerManager->>TargetComputerManager: createTargetWireframe()
                TargetComputerManager->>TargetComputerManager: updateTargetDisplay()
                TargetComputerManager->>TargetComputerManager: startRangeMonitoring()
                TargetComputerManager->>TargetComputerManager: updateDirectionArrow()

                TargetComputerManager->>StarfieldManager: Sync currentTarget and targetIndex
                StarfieldManager->>StarfieldManager: Update 3D outline if enabled

                StarfieldManager->>AudioManager: playCommandSound()
            end

            deactivate TargetComputerManager
        else Target computer not operational
            StarfieldManager->>AudioManager: playCommandFailedSound()
            StarfieldManager->>StarfieldManager: showHUDError("TARGET COMPUTER OFFLINE")
            note right: Provides specific feedback based on system status
        end
    end

    deactivate StarfieldManager
```
