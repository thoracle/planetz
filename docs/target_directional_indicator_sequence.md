# Target Directional Indicator Sequence Diagram

```mermaid
sequenceDiagram
    participant TargetComputerManager
    participant SolarSystemManager
    participant THREE.Camera
    participant DOM

    TargetComputerManager->>TargetComputerManager: updateDirectionArrow()
    activate TargetComputerManager

    TargetComputerManager->>TargetComputerManager: Check currentTarget and targetComputerEnabled
    alt No target or disabled
        TargetComputerManager->>TargetComputerManager: hideAllDirectionArrows()
    else Has target and enabled
        TargetComputerManager->>TargetComputerManager: getTargetPosition(currentTarget)

        alt Invalid target position
            TargetComputerManager->>TargetComputerManager: hideAllDirectionArrows()
        else Valid position
            TargetComputerManager->>THREE.Camera: Project target position to screen space
            THREE.Camera-->>TargetComputerManager: screenPosition (x, y, z)

            rect rgb(255, 200, 200)
                note right: OFF-SCREEN DETECTION
                TargetComputerManager->>TargetComputerManager: Check screen bounds
                note right: isOffScreen = |screenPos.x| > 0.95 OR |screenPos.y| > 0.95 OR screenPos.z > 1.0

                TargetComputerManager->>TargetComputerManager: Apply hysteresis for edge detection
                note right: Prevents flickering at screen edges by using 0.90 threshold with state memory
            end

            TargetComputerManager->>TargetComputerManager: Determine shouldShowArrow
            alt Target is off-screen OR hysteresis active
                rect rgb(200, 255, 200)
                    note right: DIRECTION CALCULATION
                    TargetComputerManager->>THREE.Camera: Get camera direction vectors
                    note right: cameraRight, cameraUp, cameraDirection

                    TargetComputerManager->>TargetComputerManager: Calculate relative position to camera
                    TargetComputerManager->>TargetComputerManager: Project position onto camera vectors
                    note right: rightComponent = relativePos.dot(cameraRight)
                    note right: upComponent = relativePos.dot(cameraUp)

                    alt |rightComponent| > |upComponent|
                        TargetComputerManager->>TargetComputerManager: primaryDirection = right > 0 ? 'right' : 'left'
                    else
                        TargetComputerManager->>TargetComputerManager: primaryDirection = up > 0 ? 'top' : 'bottom'
                    end
                end

                rect rgb(200, 200, 255)
                    note right: ARROW COLOR DETERMINATION
                    TargetComputerManager->>SolarSystemManager: getCelestialBodyInfo(currentTarget)
                    SolarSystemManager-->>TargetComputerManager: bodyInfo with diplomacy

                    TargetComputerManager->>TargetComputerManager: Initialize arrowColor = '#D0D0D0' (gray)
                    alt diplomacy = 'enemy'
                        TargetComputerManager->>TargetComputerManager: arrowColor = '#ff3333' (red)
                    else diplomacy = 'friendly'
                        TargetComputerManager->>TargetComputerManager: arrowColor = '#00ff41' (green)
                    else diplomacy = 'neutral'
                        TargetComputerManager->>TargetComputerManager: arrowColor = '#ffff00' (yellow)
                    end
                end

                rect rgb(255, 255, 200)
                    note right: ARROW POSITIONING
                    TargetComputerManager->>DOM: Get direction arrow element
                    TargetComputerManager->>DOM: Clear conflicting positioning properties

                    alt primaryDirection = 'top'
                        TargetComputerManager->>DOM: Set left=50%, top=20px, transform=translateX(-50%)
                        TargetComputerManager->>DOM: Set borderBottomColor = arrowColor
                    else primaryDirection = 'bottom'
                        TargetComputerManager->>DOM: Set left=50%, bottom=20px, transform=translateX(-50%)
                        TargetComputerManager->>DOM: Set borderTopColor = arrowColor
                    else primaryDirection = 'left'
                        TargetComputerManager->>DOM: Set left=20px, top=50%, transform=translateY(-50%)
                        TargetComputerManager->>DOM: Set borderRightColor = arrowColor
                    else primaryDirection = 'right'
                        TargetComputerManager->>DOM: Set right=20px, top=50%, transform=translateY(-50%)
                        TargetComputerManager->>DOM: Set borderLeftColor = arrowColor
                    end

                    TargetComputerManager->>DOM: Set arrow display = 'block'
                    TargetComputerManager->>DOM: Hide all other direction arrows
                end
            else Target is on-screen
                TargetComputerManager->>TargetComputerManager: hideAllDirectionArrows()
            end
        end
    end

    deactivate TargetComputerManager
```
