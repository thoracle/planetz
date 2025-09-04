# Target Reticle Coloring Sequence Diagram

```mermaid
sequenceDiagram
    participant TargetComputerManager
    participant Ship
    participant SolarSystemManager
    participant DOM

    TargetComputerManager->>TargetComputerManager: updateTargetDisplay()
    activate TargetComputerManager

    TargetComputerManager->>TargetComputerManager: Check currentTarget exists
    alt No current target
        TargetComputerManager->>DOM: Update targetInfoDisplay with "No Target Selected"
        TargetComputerManager->>TargetComputerManager: hideTargetReticle()
        TargetComputerManager->>DOM: Hide statusIconsContainer
    else Has current target
        TargetComputerManager->>TargetComputerManager: getCurrentTargetData()
        TargetComputerManager->>TargetComputerManager: Calculate target distance
        TargetComputerManager->>TargetComputerManager: Get target position

        TargetComputerManager->>Ship: getSystem('target_computer')
        Ship-->>TargetComputerManager: enhancedTargetInfo (if available)
        alt Enhanced target info available
            TargetComputerManager->>TargetComputerManager: Use comprehensive target info
            note right: From ship's TargetComputer system
        else No enhanced info
            alt Current target is enemy ship
                TargetComputerManager->>TargetComputerManager: Set info.type = 'enemy_ship'
                TargetComputerManager->>TargetComputerManager: isEnemyShip = true
            else Other target type
                TargetComputerManager->>SolarSystemManager: getCelestialBodyInfo(targetObject)
                SolarSystemManager-->>TargetComputerManager: bodyInfo
                TargetComputerManager->>TargetComputerManager: Use processed target data
            end
        end

        rect rgb(255, 255, 200)
            note right: DIPLOMACY COLOR DETERMINATION
            TargetComputerManager->>TargetComputerManager: Initialize diplomacyColor = '#D0D0D0' (gray)

            alt isEnemyShip = true
                TargetComputerManager->>TargetComputerManager: Set diplomacyColor = '#ff3333' (red)
                note right: Enemy ships always red
            else Target is star
                TargetComputerManager->>TargetComputerManager: Set diplomacyColor = '#ffff00' (yellow)
                note right: Stars are neutral yellow
            else Other celestial body
                TargetComputerManager->>TargetComputerManager: Check info.diplomacy field
                alt diplomacy field exists and valid
                    TargetComputerManager->>TargetComputerManager: Use existing diplomacy value
                else diplomacy is faction name
                    TargetComputerManager->>TargetComputerManager: getFactionDiplomacy(faction)
                    note right: Convert faction name to diplomacy status
                end

                alt diplomacy = 'enemy'
                    TargetComputerManager->>TargetComputerManager: diplomacyColor = '#ff3333' (red)
                else diplomacy = 'neutral'
                    TargetComputerManager->>TargetComputerManager: diplomacyColor = '#ffff00' (yellow)
                else diplomacy = 'friendly'
                    TargetComputerManager->>TargetComputerManager: diplomacyColor = '#00ff41' (green)
                else diplomacy = null/undefined
                    TargetComputerManager->>TargetComputerManager: Fallback to 'neutral' + yellow
                    TargetComputerManager->>TargetComputerManager: Log null diplomacy warning
                end
            end
        end

        TargetComputerManager->>DOM: targetHUD.style.borderColor = diplomacyColor
        TargetComputerManager->>DOM: wireframeContainer.style.borderColor = diplomacyColor

        TargetComputerManager->>TargetComputerManager: createTargetWireframe()
        activate TargetComputerManager

        TargetComputerManager->>TargetComputerManager: Get enhanced target info (same as above)
        TargetComputerManager->>TargetComputerManager: Determine wireframe color

        alt Enemy ship
            TargetComputerManager->>TargetComputerManager: wireframeColor = 0xff3333 (red)
        else Star
            TargetComputerManager->>TargetComputerManager: wireframeColor = 0xffff00 (yellow)
        else Other target
            TargetComputerManager->>TargetComputerManager: Convert diplomacy to wireframe color
            alt enemy: 0xff3333 (red)
            else neutral: 0xffff00 (yellow)
            else friendly: 0x00ff41 (green)
            end
        end

        TargetComputerManager->>TargetComputerManager: Create LineBasicMaterial(wireframeColor)
        TargetComputerManager->>TargetComputerManager: Generate geometry based on target type
        TargetComputerManager->>TargetComputerManager: Add wireframe to wireframeScene

        deactivate TargetComputerManager
    end

    deactivate TargetComputerManager
```
